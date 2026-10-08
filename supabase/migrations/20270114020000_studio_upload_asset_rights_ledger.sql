-- Studio image provenance: additive migration; do not rewrite historical migrations.
BEGIN;

ALTER TABLE public.media_assets
  ADD COLUMN IF NOT EXISTS studio_usage_slot text,
  ADD COLUMN IF NOT EXISTS rights_attested_at timestamptz,
  -- Keep the attester UUID as an audit snapshot; no FK that can erase it or block account deletion.
  ADD COLUMN IF NOT EXISTS rights_attested_by uuid,
  ADD COLUMN IF NOT EXISTS rights_attestation_version text;

CREATE INDEX IF NOT EXISTS idx_media_assets_studio_ledger
  ON public.media_assets (store_id, bucket_name, file_path)
  WHERE studio_usage_slot IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.media_assets'::regclass
      AND conname = 'media_assets_studio_attestation_complete_check'
  ) THEN
    ALTER TABLE public.media_assets
      ADD CONSTRAINT media_assets_studio_attestation_complete_check
      CHECK (
        (studio_usage_slot IS NULL AND rights_attested_at IS NULL AND rights_attested_by IS NULL AND rights_attestation_version IS NULL)
        OR
        (studio_usage_slot IS NOT NULL
         AND studio_usage_slot ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$'
         AND rights_attested_at IS NOT NULL
         AND rights_attested_by IS NOT NULL
         AND rights_attestation_version IS NOT NULL
         AND rights_attestation_version = 'studio-upload-rights-v1')
      ) NOT VALID;
  END IF;
END $$;

-- Historical policies used `SELECT id FROM stores LIMIT 1`, which is not tenant isolation.
-- Replace them with membership checks tied to the current authenticated profile.
DROP POLICY IF EXISTS "Stores can view their own media" ON public.media_assets;
CREATE POLICY "Stores can view their own media" ON public.media_assets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.store_id = media_assets.store_id
        AND p.role IN ('owner', 'admin', 'manager', 'content')
    )
  );

DROP POLICY IF EXISTS "Admin can insert media" ON public.media_assets;
DROP POLICY IF EXISTS "media_assets_insert_server_only" ON public.media_assets;
-- BFF uses the server-only service_role (which bypasses RLS). Browser users must not forge ledger rows.
CREATE POLICY "media_assets_insert_server_only" ON public.media_assets
  FOR INSERT TO anon, authenticated WITH CHECK (false);

DROP POLICY IF EXISTS "Admin can delete media" ON public.media_assets;
CREATE POLICY "Admin can delete media" ON public.media_assets
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.store_id = media_assets.store_id
        AND p.role IN ('owner', 'admin', 'manager', 'content')
    )
  );

COMMIT;
