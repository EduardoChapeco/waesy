-- ==============================================================================
-- Waesy Tourism — Migration 20270411000000:
-- Visibility modes, hidden/archive flag, salted PIN hash, view telemetry & quote sync
-- ==============================================================================

ALTER TABLE public.travel_proposals
  ADD COLUMN IF NOT EXISTS visibility_mode TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS access_pin_hash TEXT,
  ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS converted_trip_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'travel_proposals_visibility_mode_check'
       AND conrelid = 'public.travel_proposals'::regclass
  ) THEN
    ALTER TABLE public.travel_proposals
      ADD CONSTRAINT travel_proposals_visibility_mode_check
      CHECK (visibility_mode IN ('public', 'link_only', 'password', 'private'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_travel_proposals_store_visibility_status
  ON public.travel_proposals (store_id, is_hidden, visibility_mode, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_travel_proposals_quote_id
  ON public.travel_proposals (store_id, quote_id)
  WHERE quote_id IS NOT NULL;

-- Backfill legacy [SENHA:...] prefixes from special_notes into access_pin_hash
DO $$
DECLARE
  rec RECORD;
  v_extracted_pin TEXT;
  v_clean_notes TEXT;
  v_pin_hash TEXT;
BEGIN
  FOR rec IN
    SELECT id, special_notes
      FROM public.travel_proposals
     WHERE special_notes ~* '\[SENHA:[^\]]+\]'
  LOOP
    v_extracted_pin := trim(substring(rec.special_notes FROM '(?i)\[SENHA:([^\]]+)\]'));
    v_clean_notes := nullif(trim(regexp_replace(rec.special_notes, '(?i)\[SENHA:[^\]]+\]\s*', '', 'g')), '');

    IF v_extracted_pin IS NOT NULL AND length(v_extracted_pin) > 0 THEN
      v_pin_hash := 'sha256:' || encode(pg_catalog.sha256(convert_to(rec.id::text || ':' || v_extracted_pin, 'UTF8')), 'hex');
      UPDATE public.travel_proposals
         SET access_pin_hash = COALESCE(access_pin_hash, v_pin_hash),
             visibility_mode = 'password',
             special_notes = v_clean_notes
       WHERE id = rec.id;
    ELSE
      UPDATE public.travel_proposals
         SET special_notes = v_clean_notes
       WHERE id = rec.id;
    END IF;
  END LOOP;
END
$$;

-- Atomic view telemetry RPC called by BFF on unlocked public proposal loads
CREATE OR REPLACE FUNCTION public.increment_travel_proposal_view(p_proposal_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  UPDATE public.travel_proposals
     SET views_count = COALESCE(views_count, 0) + 1,
         last_viewed_at = timezone('utc'::text, now())
   WHERE id = p_proposal_id
   RETURNING views_count INTO v_next;

  RETURN COALESCE(v_next, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.increment_travel_proposal_view(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_travel_proposal_view(UUID) TO service_role;
