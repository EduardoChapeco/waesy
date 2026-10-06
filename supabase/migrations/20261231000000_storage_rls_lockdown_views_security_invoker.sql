-- ==============================================================================
-- Migration: 20261231000000_storage_rls_lockdown_views_security_invoker.sql
-- Description:
--   1. Hardening das 6 views SECURITY DEFINER com (security_invoker = true).
--   2. Criação do bucket 'covers' e alinhamento de 'classified-media'.
--   3. Revogação de 'Universal Media *' e políticas legadas em storage.objects.
--   4. Implementação de RLS estrito: leitura pública em buckets de mídia,
--      escrita autenticada e isolamento absoluto de buckets privados.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- FASE 1: HARDENING DAS 6 VIEWS COM (security_invoker = true)
-- ------------------------------------------------------------------------------
ALTER VIEW public.store_memberships SET (security_invoker = true);
ALTER VIEW public.store_members SET (security_invoker = true);
ALTER VIEW public.classified_ads SET (security_invoker = true);
ALTER VIEW public.companies SET (security_invoker = true);
ALTER VIEW public.store_reviews SET (security_invoker = true);
ALTER VIEW public.store_integrations SET (security_invoker = true);

-- ------------------------------------------------------------------------------
-- FASE 2: CRIAÇÃO E ALINHAMENTO DE BUCKETS DE STORAGE
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'covers',
  'covers',
  true,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']::text[];

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'classified-media',
  'classified-media',
  true,
  12582912, -- 12 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 12582912,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']::text[];

-- Garantir flags de privacidade e limites em buckets sigilosos
UPDATE storage.buckets
SET public = false, file_size_limit = 10485760
WHERE id = 'legal-documents';

UPDATE storage.buckets
SET public = false, file_size_limit = 5242880
WHERE id = 'receipts';

UPDATE storage.buckets
SET public = false, file_size_limit = 10485760
WHERE id = 'identity-vault';

-- ------------------------------------------------------------------------------
-- FASE 3: EXPURGO DAS POLÍTICAS "Universal Media *" E POLÍTICAS DEFEITUOSAS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Universal Media Select Policy" ON storage.objects;
DROP POLICY IF EXISTS "Universal Media Insert Policy" ON storage.objects;
DROP POLICY IF EXISTS "Universal Media Update Policy" ON storage.objects;
DROP POLICY IF EXISTS "Universal Media Delete Policy" ON storage.objects;

-- Revogar políticas redundantes ou com vazamento (OR auth.uid() IS NOT NULL)
DROP POLICY IF EXISTS "Public can view product media" ON storage.objects;
DROP POLICY IF EXISTS "Leitura pública de mídia de produtos" ON storage.objects;
DROP POLICY IF EXISTS "cms_media_public_read" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can read own identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload identity documents" ON storage.objects;
DROP POLICY IF EXISTS "Admins can read all receipts" ON storage.objects;
DROP POLICY IF EXISTS "Customers can read own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Customers can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "media_public_read" ON storage.objects;
DROP POLICY IF EXISTS "media_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "media_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "media_authenticated_delete" ON storage.objects;
DROP POLICY IF EXISTS "legal_documents_select" ON storage.objects;
DROP POLICY IF EXISTS "legal_documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "legal_documents_delete" ON storage.objects;
DROP POLICY IF EXISTS "receipts_select" ON storage.objects;
DROP POLICY IF EXISTS "receipts_insert" ON storage.objects;
DROP POLICY IF EXISTS "identity_vault_select" ON storage.objects;
DROP POLICY IF EXISTS "identity_vault_insert" ON storage.objects;

-- ------------------------------------------------------------------------------
-- FASE 4: POLÍTICAS DE STORAGE RLS CANÔNICAS (PÚBLICAS & AUTENTICADAS)
-- ------------------------------------------------------------------------------

-- 4.1 LEITURA PÚBLICA (Apenas buckets estáticos abertos)
CREATE POLICY "media_public_read"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id IN (
    'avatars',
    'covers',
    'banners',
    'brand-assets',
    'classifieds',
    'classified-media',
    'cms-media',
    'destination-media',
    'post-media',
    'product-media',
    'public_media',
    'store-assets'
  )
);

-- 4.2 UPLOAD DE MÍDIA PÚBLICA (Exclusivo para usuários autenticados)
CREATE POLICY "media_authenticated_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN (
    'avatars',
    'covers',
    'banners',
    'brand-assets',
    'classifieds',
    'classified-media',
    'cms-media',
    'destination-media',
    'post-media',
    'product-media',
    'public_media',
    'store-assets'
  )
);

-- 4.3 ATUALIZAÇÃO DE MÍDIA PÚBLICA (Apenas proprietário, membros do workspace ou admin)
CREATE POLICY "media_authenticated_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id IN (
    'avatars',
    'covers',
    'banners',
    'brand-assets',
    'classifieds',
    'classified-media',
    'cms-media',
    'destination-media',
    'post-media',
    'product-media',
    'public_media',
    'store-assets'
  )
  AND (
    owner = (SELECT auth.uid())
    OR owner_id = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[1] = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[2] = (SELECT (auth.uid())::text)
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE (
        wm.store_id::text = (storage.foldername(name))[1]
        OR wm.store_id::text = (storage.foldername(name))[2]
      )
      AND wm.profile_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('owner', 'admin', 'platform_admin', 'manager')
    )
  )
)
WITH CHECK (
  bucket_id IN (
    'avatars',
    'covers',
    'banners',
    'brand-assets',
    'classifieds',
    'classified-media',
    'cms-media',
    'destination-media',
    'post-media',
    'product-media',
    'public_media',
    'store-assets'
  )
);

-- 4.4 EXCLUSÃO DE MÍDIA PÚBLICA (Apenas proprietário, membros do workspace ou admin)
CREATE POLICY "media_authenticated_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id IN (
    'avatars',
    'covers',
    'banners',
    'brand-assets',
    'classifieds',
    'classified-media',
    'cms-media',
    'destination-media',
    'post-media',
    'product-media',
    'public_media',
    'store-assets'
  )
  AND (
    owner = (SELECT auth.uid())
    OR owner_id = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[1] = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[2] = (SELECT (auth.uid())::text)
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE (
        wm.store_id::text = (storage.foldername(name))[1]
        OR wm.store_id::text = (storage.foldername(name))[2]
      )
      AND wm.profile_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('owner', 'admin', 'platform_admin', 'manager')
    )
  )
);

-- ------------------------------------------------------------------------------
-- FASE 5: BLINDAGEM DE BUCKETS PRIVADOS E SIGILOSOS
-- ------------------------------------------------------------------------------

-- 5.1 LEGAL-DOCUMENTS: Leitura restrita ao titular, loja vinculada ou admin
CREATE POLICY "legal_documents_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'legal-documents'
  AND (
    owner = (SELECT auth.uid())
    OR owner_id = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[1] = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[2] = (SELECT (auth.uid())::text)
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE (
        wm.store_id::text = (storage.foldername(name))[1]
        OR wm.store_id::text = (storage.foldername(name))[2]
      )
      AND wm.profile_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('owner', 'admin', 'platform_admin', 'manager')
    )
  )
);

-- 5.2 LEGAL-DOCUMENTS: Upload restrito ao titular ou workspace member
CREATE POLICY "legal_documents_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'legal-documents'
  AND (
    owner = (SELECT auth.uid())
    OR (storage.foldername(name))[1] = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[2] = (SELECT (auth.uid())::text)
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE (
        wm.store_id::text = (storage.foldername(name))[1]
        OR wm.store_id::text = (storage.foldername(name))[2]
      )
      AND wm.profile_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('owner', 'admin', 'platform_admin', 'manager')
    )
  )
);

-- 5.3 LEGAL-DOCUMENTS: Exclusão restrita à administração da plataforma (audit trail)
CREATE POLICY "legal_documents_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'legal-documents'
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = (SELECT auth.uid())
    AND p.role IN ('platform_admin', 'owner')
  )
);

-- 5.4 RECEIPTS: Leitura por comprador/titular, loja emissora ou admin/financeiro
CREATE POLICY "receipts_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts'
  AND (
    owner = (SELECT auth.uid())
    OR owner_id = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[1] = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[2] = (SELECT (auth.uid())::text)
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE (
        wm.store_id::text = (storage.foldername(name))[1]
        OR wm.store_id::text = (storage.foldername(name))[2]
      )
      AND wm.profile_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('platform_admin', 'admin', 'manager', 'finance', 'owner')
    )
  )
);

-- 5.5 RECEIPTS: Upload por usuário autenticado em seu namespace
CREATE POLICY "receipts_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND (
    owner = (SELECT auth.uid())
    OR (storage.foldername(name))[1] = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[2] = (SELECT (auth.uid())::text)
    OR EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE (
        wm.store_id::text = (storage.foldername(name))[1]
        OR wm.store_id::text = (storage.foldername(name))[2]
      )
      AND wm.profile_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('platform_admin', 'admin', 'manager', 'finance', 'owner')
    )
  )
);

-- 5.6 IDENTITY-VAULT: Leitura exclusivamente pelo titular ou auditor master
CREATE POLICY "identity_vault_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'identity-vault'
  AND (
    owner = (SELECT auth.uid())
    OR owner_id = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[1] = (SELECT (auth.uid())::text)
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
      AND p.role IN ('platform_admin', 'admin')
    )
  )
);

-- 5.7 IDENTITY-VAULT: Upload exclusivo para a pasta do próprio usuário autenticado
CREATE POLICY "identity_vault_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'identity-vault'
  AND (
    (storage.foldername(name))[1] = (SELECT (auth.uid())::text)
    OR owner = (SELECT auth.uid())
  )
);

COMMIT;
