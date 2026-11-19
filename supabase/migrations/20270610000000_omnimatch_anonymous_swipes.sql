-- OmniMatch: Suporte a swipes anônimos por visitante/sessão em match_time_swipes
ALTER TABLE public.match_time_swipes
  ALTER COLUMN session_id DROP NOT NULL,
  ALTER COLUMN customer_id DROP NOT NULL,
  ALTER COLUMN product_id DROP NOT NULL;

ALTER TABLE public.match_time_swipes
  DROP CONSTRAINT IF EXISTS match_time_swipes_action_check;

ALTER TABLE public.match_time_swipes
  ADD CONSTRAINT match_time_swipes_action_check
  CHECK (action IN ('like', 'dislike', 'pass', 'superlike'));

CREATE INDEX IF NOT EXISTS idx_match_time_swipes_visitor_card
  ON public.match_time_swipes(store_id, visitor_session_id, match_card_id)
  WHERE visitor_session_id IS NOT NULL;
