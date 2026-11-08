-- 20270322050000_extension_access_governance.sql
-- Governança de Solicitações e Autorizações de Extensões de Navegador Waesy

CREATE TABLE IF NOT EXISTS public.extension_access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  extension_type TEXT NOT NULL, -- 'infotravel_extension' | 'whatsapp_extension' | 'infotravel_miner'
  requester_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  requester_name TEXT NOT NULL,
  requester_email TEXT,
  justification TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_ext_requests_store_id ON public.extension_access_requests(store_id);
CREATE INDEX IF NOT EXISTS idx_ext_requests_status ON public.extension_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_ext_requests_type ON public.extension_access_requests(extension_type);

-- RLS
ALTER TABLE public.extension_access_requests ENABLE ROW LEVEL SECURITY;

-- 1. Leitura: Usuários da loja podem ver suas próprias solicitações; administradores da plataforma vêem todas.
CREATE POLICY "Stores and Admins can view extension requests"
  ON public.extension_access_requests
  FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT store_id FROM public.store_memberships WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin_master' OR role = 'master' OR role = 'platform_admin')
    )
  );

-- 2. Inserção: Membros autenticados podem solicitar acesso para sua loja.
CREATE POLICY "Store members can create extension requests"
  ON public.extension_access_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    store_id IN (
      SELECT store_id FROM public.store_memberships WHERE user_id = auth.uid()
    )
  );

-- 3. Atualização: Apenas Administrador Master pode aprovar/rejeitar.
CREATE POLICY "Admins can update extension requests"
  ON public.extension_access_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (role = 'admin_master' OR role = 'master' OR role = 'platform_admin')
    )
  );
