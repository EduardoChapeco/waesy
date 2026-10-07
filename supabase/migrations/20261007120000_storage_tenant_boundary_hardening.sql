-- Storage tenant-boundary hardening
-- Não cria buckets nem dados de exemplo. Corrige apenas exposição e autorização.

UPDATE storage.buckets
SET public = false
WHERE id = 'classified-media';

DROP POLICY IF EXISTS "media_public_read" ON storage.objects;
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
    'cms-media',
    'destination-media',
    'post-media',
    'product-media',
    'public_media',
    'store-assets'
  )
);

DROP POLICY IF EXISTS "media_authenticated_insert" ON storage.objects;
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
  AND (
    owner = (SELECT auth.uid())
    OR (storage.foldername(name))[1] = (SELECT (auth.uid())::text)
    OR (storage.foldername(name))[2] = (SELECT (auth.uid())::text)
    OR EXISTS (
      SELECT 1
      FROM public.workspace_members wm
      WHERE (
        wm.store_id::text = (storage.foldername(name))[1]
        OR wm.store_id::text = (storage.foldername(name))[2]
      )
      AND wm.profile_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.role IN ('owner', 'admin', 'platform_admin', 'manager')
    )
  )
);

-- Nenhum cliente pode listar ou alterar objetos privados por uma policy genérica.
-- Buckets receipts, legal-documents e identity-vault continuam cobertos pelas policies específicas.
