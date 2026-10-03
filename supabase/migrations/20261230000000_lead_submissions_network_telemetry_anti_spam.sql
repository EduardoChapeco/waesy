-- SPEC-AUDIT-FORENSIC-SANEAMENTO-GERAL / REQ-EARS-09-TELEMETRY
-- Armazenamento de IP Real, Geolocalização Cloudflare e Fingerprint de Dispositivo contra Spam em Leads

ALTER TABLE public.lead_form_submissions
  ADD COLUMN IF NOT EXISTS ip_address text,
  ADD COLUMN IF NOT EXISTS device_fingerprint text,
  ADD COLUMN IF NOT EXISTS geo_city text,
  ADD COLUMN IF NOT EXISTS geo_state text,
  ADD COLUMN IF NOT EXISTS geo_country text,
  ADD COLUMN IF NOT EXISTS threat_score integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cf_ray text,
  ADD COLUMN IF NOT EXISTS is_flagged_spam boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS telemetry jsonb DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_lead_submissions_ip ON public.lead_form_submissions(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_submissions_fingerprint ON public.lead_form_submissions(device_fingerprint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_submissions_spam ON public.lead_form_submissions(is_flagged_spam) WHERE is_flagged_spam = true;
