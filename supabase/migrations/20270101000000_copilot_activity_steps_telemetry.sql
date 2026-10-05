-- Migration: copilot_activity_steps_telemetry
-- Criada em: 2027-01-01
-- DEC-019: Onda 3 — Telemetria Persistida do Orquestrador Autônomo
--
-- Propósito: Registra cada execução do executeAutonomousCopilotTask com
-- seu rastro de passos (AIActivityStep[]) para auditoria forense e otimização
-- de tokens. Nenhum dado PII é armazenado — apenas metadados de execução.

CREATE TABLE IF NOT EXISTS public.copilot_activity_steps (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id           uuid NOT NULL,
  domain            text NOT NULL,
  store_id          uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  steps_count       integer NOT NULL DEFAULT 0,
  duration_ms       integer NOT NULL DEFAULT 0,
  steps_payload     jsonb NOT NULL DEFAULT '[]',
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- Índice para consultas forenses por store e data
CREATE INDEX IF NOT EXISTS idx_copilot_steps_store_created
  ON public.copilot_activity_steps (store_id, created_at DESC);

-- Índice para rastrear execuções por task_id
CREATE INDEX IF NOT EXISTS idx_copilot_steps_task_id
  ON public.copilot_activity_steps (task_id);

-- RLS: Deny-by-default
ALTER TABLE public.copilot_activity_steps ENABLE ROW LEVEL SECURITY;

-- Leitura: plataforma admin, tarefas sem loja ou membros do tenant
CREATE POLICY "copilot_steps_select_own_store"
  ON public.copilot_activity_steps
  FOR SELECT
  USING (
    is_platform_admin()
    OR store_id IS NULL
    OR store_id = ANY (auth_user_store_ids())
  );

-- Inserção: apenas server-side (service role) — sem política de INSERT para anon/authenticated
-- O orquestrador usa getServerClient() (service role) para gravar.

-- Retenção: purga automática de logs com mais de 30 dias via pg_cron
-- (cron job registrado separadamente se pg_cron estiver habilitado)
COMMENT ON TABLE public.copilot_activity_steps IS
  'Telemetria forense de execuções do orquestrador autônomo. Retenção de 30 dias.';
