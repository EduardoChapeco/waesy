-- Preserve the page actually inspected separately from a verified ticket URL.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS source_url TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS events_store_source_url_unique
  ON public.events (store_id, source_url);
