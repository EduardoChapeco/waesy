-- Vínculos canônicos entre cotação, sessão de busca e CRM.
-- Não remove colunas legadas; apenas registra a origem e a composição real.

ALTER TABLE public.travel_quotes
  ADD COLUMN IF NOT EXISTS quote_session_id UUID REFERENCES public.travel_quote_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads_crm(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS room_occupancies JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'workspace',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_travel_quotes_quote_session_id ON public.travel_quotes(quote_session_id);
CREATE INDEX IF NOT EXISTS idx_travel_quotes_lead_id ON public.travel_quotes(lead_id);
