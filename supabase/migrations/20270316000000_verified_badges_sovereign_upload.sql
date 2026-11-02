-- Migration: 20270301000000_verified_badges_sovereign_upload.sql
-- Invariante da Verificação Soberana & Upload de Selos pelo Admin Master
-- Proibição de verificação arbitrária ou selos automáticos. Apenas o Admin Master pode verificar e fazer upload de selos.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified_badge_url TEXT;
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS verified_badge_url TEXT;

-- Tabela para gerenciar os selos oficiais do ecossistema configurados pelo Admin
CREATE TABLE IF NOT EXISTS public.platform_verification_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  badge_url TEXT NOT NULL,
  badge_type TEXT NOT NULL DEFAULT 'official' CHECK (badge_type IN ('official', 'store', 'creator', 'partner')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_verification_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_active_badges"
  ON public.platform_verification_badges FOR SELECT
  USING (is_active = true);

CREATE POLICY "admin_all_badges"
  ON public.platform_verification_badges FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role IN ('platform_admin', 'owner', 'admin')
    )
  );
