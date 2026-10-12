-- Canonical JSON contract consumed by studio.functions.ts and the Brand Kit editor.
ALTER TABLE public.brand_kits
  ADD COLUMN IF NOT EXISTS colors JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS fonts JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS logos JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS voice JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_provider TEXT,
  ADD COLUMN IF NOT EXISTS ai_model TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS analysis_status TEXT NOT NULL DEFAULT 'legacy_unverified',
  ADD COLUMN IF NOT EXISTS edited_by_human BOOLEAN NOT NULL DEFAULT FALSE;

-- Legacy scalar defaults were generic styling choices, not verified brand evidence.
ALTER TABLE public.brand_kits
  ALTER COLUMN primary_color DROP DEFAULT,
  ALTER COLUMN secondary_color DROP DEFAULT,
  ALTER COLUMN accent_color DROP DEFAULT,
  ALTER COLUMN typography DROP DEFAULT;

-- Keep legacy rows intact and explicitly mark their provenance as unknown.
UPDATE public.brand_kits
SET analysis_status = 'legacy_unverified'
WHERE analysis_status IS NULL OR analysis_status = '';

-- The BFF performs a store-scoped upsert; never delete duplicate records implicitly.
-- If historical duplicates exist, halt the migration so they can be reviewed and merged deliberately.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.brand_kits
    GROUP BY store_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'brand_kits has duplicate store_id rows; review/merge them before applying unique store constraint';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_brand_kits_store_id ON public.brand_kits(store_id);
