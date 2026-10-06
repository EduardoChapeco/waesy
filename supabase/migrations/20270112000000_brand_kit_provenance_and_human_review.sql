-- Brand Kit must distinguish extracted evidence, AI-generated draft content, and human edits.
ALTER TABLE public.brand_dna_profiles
  ADD COLUMN IF NOT EXISTS do_words TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS source_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_provider TEXT,
  ADD COLUMN IF NOT EXISTS analysis_status TEXT NOT NULL DEFAULT 'legacy_unverified';

-- Confidence emitted by prior generators was not calibrated against outcomes.
ALTER TABLE public.brand_dna_profiles
  ALTER COLUMN confidence DROP DEFAULT;

UPDATE public.brand_dna_profiles
SET confidence = NULL
WHERE confidence IS NOT NULL;

-- Preserve old rows as legacy/unverified; extraction and user edits set their own status.
UPDATE public.brand_dna_profiles
SET analysis_status = 'legacy_unverified'
WHERE analysis_status IS NULL OR analysis_status = '';

-- Stop future inserts from silently receiving generic archetypes, palettes, fonts or triggers.
ALTER TABLE public.brand_dna_profiles
  ALTER COLUMN archetype DROP DEFAULT,
  ALTER COLUMN archetype DROP NOT NULL,
  ALTER COLUMN tone_of_voice DROP DEFAULT,
  ALTER COLUMN tone_of_voice DROP NOT NULL,
  ALTER COLUMN color_palette DROP DEFAULT,
  ALTER COLUMN color_palette DROP NOT NULL,
  ALTER COLUMN seven_sins_triggers DROP DEFAULT,
  ALTER COLUMN seven_sins_triggers DROP NOT NULL,
  ALTER COLUMN typography DROP DEFAULT,
  ALTER COLUMN typography DROP NOT NULL,
  ALTER COLUMN visual_style DROP DEFAULT,
  ALTER COLUMN visual_style DROP NOT NULL;
