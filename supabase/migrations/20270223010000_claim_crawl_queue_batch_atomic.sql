-- ============================================================================
-- Migration: 20270125000002_claim_crawl_queue_batch_atomic.sql
-- Descrição: Claim atômico de tarefas da fila de crawling usando FOR UPDATE SKIP LOCKED
-- Base: Padrão Crawlee / NuQ / PostgreSQL High-Concurrency Queue
-- ============================================================================

-- Adiciona colunas de suporte para worker claim e lease temporário
ALTER TABLE public.crawl_queue
  ADD COLUMN IF NOT EXISTS worker_id TEXT,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_crawl_queue_claimable 
  ON public.crawl_queue (status, priority DESC, created_at ASC)
  WHERE status IN ('pending', 'processing');

-- Função para Claim Atômico com proteção contra concorrência e race condition
CREATE OR REPLACE FUNCTION public.claim_crawl_queue_batch(
  p_worker_id TEXT,
  p_batch_size INT DEFAULT 5,
  p_lease_seconds INT DEFAULT 300
)
RETURNS SETOF public.crawl_queue
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH selected AS (
    SELECT id
    FROM public.crawl_queue
    WHERE status = 'pending'
       OR (status = 'processing' AND lease_expires_at IS NOT NULL AND lease_expires_at < now())
    ORDER BY priority DESC, created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.crawl_queue q
  SET 
    status = 'processing',
    worker_id = p_worker_id,
    processed_at = now(),
    lease_expires_at = now() + (p_lease_seconds || ' seconds')::interval,
    retry_count = COALESCE(q.retry_count, 0) + 1,
    updated_at = now()
  FROM selected s
  WHERE q.id = s.id
  RETURNING q.*;
END;
$$;

COMMENT ON FUNCTION public.claim_crawl_queue_batch IS 'Reserva atômica de tarefas da crawl_queue evitando colisão entre múltiplos workers simultâneos (Crawlee/NuQ pattern).';
