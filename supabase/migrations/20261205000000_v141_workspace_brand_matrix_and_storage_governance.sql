-- ==============================================================================
-- MIGRATION: 20261205000000_v141_workspace_brand_matrix_and_storage_governance.sql
-- DESCRIPTION: Governança do Módulo de Marca, Vínculo de Workspaces, Buckets e RLS
-- ==============================================================================

-- 1. Garante colunas estruturais em public.stores
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;

-- 2. Índice composto para performance em consultas multi-tenant de lojas
CREATE INDEX IF NOT EXISTS idx_stores_org_slug ON public.stores(organization_id, slug);

-- 3. Restrição de unicidade em workspace_members para prevenir vínculos duplicados
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

-- 4. Índices relacionais de alta performance para workspace_members
CREATE INDEX IF NOT EXISTS idx_workspace_members_profile ON public.workspace_members(profile_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_store ON public.workspace_members(store_id);

-- 5. Garante tabela directory_listings e RLS completo
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

-- 6. Habilita e impõe Row Level Security Deny-by-Default em directory_listings
ALTER TABLE public.directory_listings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Public can view active directory listings" ON public.directory_listings;
  DROP POLICY IF EXISTS "Store owners can update directory listings" ON public.directory_listings;
  DROP POLICY IF EXISTS "Platform admins have full directory listings control" ON public.directory_listings;

  CREATE POLICY "Public can view active directory listings"
    ON public.directory_listings
    FOR SELECT
    USING (status = 'active');

  CREATE POLICY "Store owners can update directory listings"
    ON public.directory_listings
    FOR UPDATE
    TO authenticated
    USING (
      store_id IN (
        SELECT store_id FROM public.workspace_members
        WHERE profile_id = auth.uid() AND role IN ('owner', 'admin')
      )
    )
    WITH CHECK (
      store_id IN (
        SELECT store_id FROM public.workspace_members
        WHERE profile_id = auth.uid() AND role IN ('owner', 'admin')
      )
    );

  CREATE POLICY "Platform admins have full directory listings control"
    ON public.directory_listings
    FOR ALL
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('platform_admin', 'master', 'superadmin')
      )
    );
END $$;
