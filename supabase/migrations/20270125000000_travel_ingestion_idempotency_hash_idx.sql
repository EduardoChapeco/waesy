-- Migration: 20270125000000_travel_ingestion_idempotency_hash_idx.sql
-- Descrição: Índice composto para garantia de busca idempotente por hash de conteúdo e tenant em travel_document_ingestions (PERSIST-F10)

CREATE INDEX IF NOT EXISTS idx_travel_document_ingestions_store_hash
  ON public.travel_document_ingestions (store_id, content_sha256)
  WHERE content_sha256 IS NOT NULL;
