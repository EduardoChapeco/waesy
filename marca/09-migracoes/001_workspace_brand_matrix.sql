-- 001_workspace_brand_matrix.sql
-- Migração Aditiva e Idempotente para Governança do Módulo de Marca

-- 1. Garante colunas de branding e settings na tabela stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;

-- 2. Índice para consultas rápidas de tenant por organização e slug
CREATE INDEX IF NOT EXISTS idx_stores_org_slug ON public.stores(organization_id, slug);

-- 3. Garante restrição de unicidade em workspace_members para impedir duplicidade de vínculo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workspace_members_profile_store_unique'
  ) THEN
    ALTER TABLE public.workspace_members
      ADD CONSTRAINT workspace_members_profile_store_unique UNIQUE (profile_id, store_id);
  END IF;
EXCEPTION
  WHEN duplicate_table THEN NULL;
END $$;

-- 4. Índice para busca rápida de lojas de um usuário
CREATE INDEX IF NOT EXISTS idx_workspace_members_profile ON public.workspace_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_store ON public.workspace_members(store_id);

-- 5. Garante tabela directory_listings para diretório comercial público
CREATE TABLE IF NOT EXISTS public.directory_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'servicos',
  business_name text NOT NULL,
  address text,
  city text NOT NULL DEFAULT 'Chapecó',
  state text NOT NULL DEFAULT 'SC',
  cnpj text,
  data_quality_score integer DEFAULT 50,
  is_crawled boolean DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_directory_listings_city ON public.directory_listings(city, category);
