-- ============================================================================
-- Migration: 20261013000000_store_page_sections_and_system_audit.sql
-- Objetivo: Suporte a seções modulares customizáveis estilo Wix App Editor
--           para o perfil de empresas no Diretório (_store.diretorio.$slug.tsx),
--           tabela de auditoria e telemetria de erros reais (system_audit_logs),
--           e campos de plano e módulos em stores (plan_tier, enabled_modules).
-- ============================================================================

-- 1. Tabela de Seções Customizáveis para Páginas de Empresas no Diretório
CREATE TABLE IF NOT EXISTS public.store_page_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  section_type text NOT NULL CHECK (
    section_type IN (
      'banner_carousel',
      'highlight_cards',
      'featured_services',
      'custom_text_block',
      'infinite_feed',
      'contact_hours',
      'coupons_grid'
    )
  ),
  section_order integer NOT NULL DEFAULT 0,
  title text,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_store_page_sections_store_order 
  ON public.store_page_sections (store_id, section_order);

ALTER TABLE public.store_page_sections ENABLE ROW LEVEL SECURITY;

-- Leitura pública para seções ativas
DROP POLICY IF EXISTS "store_page_sections_public_read" ON public.store_page_sections;
CREATE POLICY "store_page_sections_public_read" ON public.store_page_sections
  FOR SELECT
  USING (is_active = true);

-- Lojistas gerenciam suas próprias seções
DROP POLICY IF EXISTS "store_page_sections_store_manage" ON public.store_page_sections;
CREATE POLICY "store_page_sections_store_manage" ON public.store_page_sections
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = store_page_sections.store_id
        AND wm.profile_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.store_id = store_page_sections.store_id
        AND wm.profile_id = auth.uid()
        AND wm.role IN ('owner', 'admin', 'manager')
    )
  );

-- 2. Tabela de Logs de Auditoria e Erros Reais (System Telemetry & Zero Blackbox)
CREATE TABLE IF NOT EXISTS public.system_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  severity text NOT NULL DEFAULT 'ERROR' CHECK (severity IN ('INFO', 'WARN', 'ERROR', 'CRITICAL', 'SEV-1', 'SEV-2')),
  subsystem text NOT NULL DEFAULT 'app',
  route text,
  message text NOT NULL,
  error_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_audit_logs_created 
  ON public.system_audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_audit_logs_subsystem 
  ON public.system_audit_logs (subsystem, created_at DESC);

ALTER TABLE public.system_audit_logs ENABLE ROW LEVEL SECURITY;

-- Permitir inserção de logs com segurança
DROP POLICY IF EXISTS "system_audit_logs_insert" ON public.system_audit_logs;
CREATE POLICY "system_audit_logs_insert" ON public.system_audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Leitura restrita a administradores master
DROP POLICY IF EXISTS "system_audit_logs_admin_read" ON public.system_audit_logs;
CREATE POLICY "system_audit_logs_admin_read" ON public.system_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'master')
    )
  );

-- 3. Expansão de stores para plano e módulos
ALTER TABLE public.stores 
  ADD COLUMN IF NOT EXISTS plan_tier text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS enabled_modules jsonb DEFAULT '{"catalog": true, "reviews": true, "posts": true, "coupons": true}'::jsonb;
