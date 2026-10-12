-- Stop assigning platform locality, event dates, free/zero prices or age ratings
-- when the source did not provide those facts. Historical values are preserved and
-- explicitly marked unverified rather than destructively rewritten.

ALTER TABLE public.events
  ALTER COLUMN event_date DROP NOT NULL,
  ALTER COLUMN price_min_cents DROP DEFAULT,
  ALTER COLUMN price_min_cents DROP NOT NULL,
  ALTER COLUMN price_max_cents DROP DEFAULT,
  ALTER COLUMN price_max_cents DROP NOT NULL,
  ALTER COLUMN age_rating DROP DEFAULT,
  ALTER COLUMN age_rating DROP NOT NULL;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS field_provenance JSONB NOT NULL
  DEFAULT '{"record_kind":"legacy_or_unverified","status":"unknown"}'::jsonb;

ALTER TABLE public.mined_raw_extractions
  ALTER COLUMN city DROP DEFAULT,
  ALTER COLUMN state DROP DEFAULT,
  ALTER COLUMN region DROP DEFAULT;

ALTER TABLE public.news_articles
  ALTER COLUMN city DROP DEFAULT,
  ALTER COLUMN state DROP DEFAULT;

COMMENT ON COLUMN public.events.field_provenance IS
  'Per-field source status for externally extracted event data; legacy/default rows are unverified until reviewed.';
COMMENT ON COLUMN public.events.event_date IS
  'Nullable when the source page does not provide a verifiable event start date.';
COMMENT ON COLUMN public.events.price_min_cents IS
  'NULL means no price was observed; zero is reserved for an explicitly free offer.';
COMMENT ON COLUMN public.events.price_max_cents IS
  'NULL means no price ceiling was observed in the source.';
