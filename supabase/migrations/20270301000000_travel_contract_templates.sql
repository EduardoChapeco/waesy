-- Migration: 20270301000000_travel_contract_templates.sql
-- Finalidade: Declaração canônica da tabela travel_contract_templates consumida por travel-contract.functions.ts
-- Conformidade: AGENTS.md (B.1 a B.41), Zero-Trust RLS, Multi-tenant por store_id

CREATE TABLE IF NOT EXISTS public.travel_contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  clauses jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices de consulta multi-tenant
CREATE INDEX IF NOT EXISTS idx_travel_contract_templates_store_id
  ON public.travel_contract_templates(store_id);

CREATE INDEX IF NOT EXISTS idx_travel_contract_templates_default
  ON public.travel_contract_templates(store_id, is_default)
  WHERE is_default = true;

-- Blindagem RLS Zero-Trust
ALTER TABLE public.travel_contract_templates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "travel_contract_templates_staff_read" ON public.travel_contract_templates
    FOR SELECT USING (
      auth.role() = 'authenticated'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "travel_contract_templates_staff_write" ON public.travel_contract_templates
    FOR ALL USING (
      auth.role() = 'authenticated'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
