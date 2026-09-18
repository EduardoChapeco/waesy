-- ==============================================================================
-- 20260916120000_contracts_visual_positioning_and_multichannel.sql
-- Waesy Platform — Contratos Inteligentes, Posicionamento Visual & Despacho Multi-Canal
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.folders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  store_id UUID NOT NULL,
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1. Extensão da tabela public.contracts
ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dispatch_settings JSONB NOT NULL DEFAULT '{
    "signing_order": "parallel",
    "send_reminders": true,
    "reminder_days": 3,
    "auth_mark_position": "footer",
    "auth_mark_size": "standard",
    "force_signature_appearance": false,
    "delivery_channels": ["email", "whatsapp"]
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS observers JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.contract_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_whatsapp_native BOOLEAN NOT NULL DEFAULT false;

-- 2. Extensão da tabela public.contract_versions
ALTER TABLE public.contract_versions
  ADD COLUMN IF NOT EXISTS signature_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS source_file_url TEXT,
  ADD COLUMN IF NOT EXISTS page_count INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS manifest_hash_sha256 TEXT;

-- 3. Extensão da tabela public.signature_envelopes
ALTER TABLE public.signature_envelopes
  ADD COLUMN IF NOT EXISTS signer_phone TEXT,
  ADD COLUMN IF NOT EXISTS signer_cpf TEXT,
  ADD COLUMN IF NOT EXISTS dispatch_channel TEXT NOT NULL DEFAULT 'email'
    CHECK (dispatch_channel IN ('email', 'whatsapp', 'sms', 'direct_link')),
  ADD COLUMN IF NOT EXISTS signing_order_index INT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS color_code TEXT NOT NULL DEFAULT '#2563eb',
  ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS require_facial_biometrics BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS require_cpf_confirmation BOOLEAN NOT NULL DEFAULT false;

-- 4. Extensão da tabela public.signature_evidence
ALTER TABLE public.signature_evidence
  ADD COLUMN IF NOT EXISTS screen_resolution TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT,
  ADD COLUMN IF NOT EXISTS geo_latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS geo_longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS geo_city TEXT,
  ADD COLUMN IF NOT EXISTS geo_state TEXT,
  ADD COLUMN IF NOT EXISTS ntp_timestamp TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  ADD COLUMN IF NOT EXISTS facial_biometrics_hash TEXT;

-- Índices adicionais para performance em telemetria e busca por token/cpf
CREATE INDEX IF NOT EXISTS idx_signature_envelopes_signer_cpf
  ON public.signature_envelopes(signer_cpf) WHERE signer_cpf IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_folder_id
  ON public.contracts(folder_id) WHERE folder_id IS NOT NULL;
