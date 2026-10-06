-- Onda 1: identidade canônica de canal, automações WhatsApp e campanhas consentidas.
-- Reutiliza store_workflows e whatsapp_outbox; não cria um segundo CRM nem um segundo runtime.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workflow_trigger_type') THEN
    ALTER TYPE public.workflow_trigger_type ADD VALUE IF NOT EXISTS 'whatsapp_inbound';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.whatsapp_contact_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  channel_instance_id UUID REFERENCES public.whatsapp_channel_instances(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_id UUID REFERENCES public.leads_crm(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel = 'whatsapp'),
  external_user_id TEXT,
  phone_e164 TEXT,
  phone_hash TEXT,
  display_name TEXT,
  profile_name TEXT,
  consent_status TEXT NOT NULL DEFAULT 'unknown' CHECK (consent_status IN ('unknown','opted_in','opted_out')),
  consent_source TEXT,
  consent_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (external_user_id IS NOT NULL OR phone_hash IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_identity_provider_external
  ON public.whatsapp_contact_identities(store_id, provider, external_user_id)
  WHERE external_user_id IS NOT NULL;
DROP INDEX IF EXISTS public.uq_whatsapp_identity_store_phone;
CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_identity_provider_phone
  ON public.whatsapp_contact_identities(store_id, provider, phone_hash)
  WHERE phone_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_identity_store_last_seen
  ON public.whatsapp_contact_identities(store_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_identity_lead ON public.whatsapp_contact_identities(store_id, lead_id) WHERE lead_id IS NOT NULL;

ALTER TABLE public.chat_threads ADD COLUMN IF NOT EXISTS channel_identity_id UUID REFERENCES public.whatsapp_contact_identities(id) ON DELETE SET NULL;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS channel_identity_id UUID REFERENCES public.whatsapp_contact_identities(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_chat_threads_channel_identity ON public.chat_threads(channel_identity_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_identity ON public.chat_messages(channel_identity_id, created_at DESC);

-- Extensão do runtime genérico existente para WhatsApp: nodes/edges continuam sendo a fonte do fluxo.
ALTER TABLE public.store_workflows ADD COLUMN IF NOT EXISTS channel TEXT;
ALTER TABLE public.store_workflows ADD COLUMN IF NOT EXISTS channel_instance_id UUID REFERENCES public.whatsapp_channel_instances(id) ON DELETE SET NULL;
ALTER TABLE public.store_workflows ADD COLUMN IF NOT EXISTS schema_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.store_workflows ADD COLUMN IF NOT EXISTS workflow_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.store_workflows ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE public.store_workflows ADD COLUMN IF NOT EXISTS entry_conditions JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_store_workflows_whatsapp ON public.store_workflows(store_id, channel, status, updated_at DESC) WHERE channel = 'whatsapp';

CREATE TABLE IF NOT EXISTS public.whatsapp_flow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.store_workflows(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES public.chat_threads(id) ON DELETE SET NULL,
  identity_id UUID REFERENCES public.whatsapp_contact_identities(id) ON DELETE SET NULL,
  trigger_event_id UUID REFERENCES public.whatsapp_provider_webhook_events(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','waiting','completed','failed','cancelled')),
  current_node_id TEXT,
  input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_code TEXT,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_flow_runs_store ON public.whatsapp_flow_runs(store_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_flow_runs_workflow ON public.whatsapp_flow_runs(workflow_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.whatsapp_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  channel_instance_id UUID REFERENCES public.whatsapp_channel_instances(id) ON DELETE SET NULL,
  workflow_id UUID REFERENCES public.store_workflows(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','running','paused','completed','cancelled','failed')),
  message_type TEXT NOT NULL DEFAULT 'template' CHECK (message_type IN ('template','text','flow')),
  template_name TEXT,
  template_language TEXT,
  template_parameters JSONB NOT NULL DEFAULT '[]'::jsonb,
  audience_filter JSONB NOT NULL DEFAULT '{}'::jsonb,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (message_type <> 'template' OR template_name IS NOT NULL),
  CHECK (status <> 'scheduled' OR scheduled_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaigns_store ON public.whatsapp_campaigns(store_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.whatsapp_campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.whatsapp_campaigns(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  identity_id UUID NOT NULL REFERENCES public.whatsapp_contact_identities(id) ON DELETE CASCADE,
  outbox_id UUID REFERENCES public.whatsapp_outbox(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'eligible' CHECK (status IN ('eligible','skipped_no_consent','queued','accepted','sent','delivered','read','failed','cancelled')),
  skip_reason TEXT,
  external_message_id TEXT,
  error_code TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, identity_id)
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaign_recipients_queue ON public.whatsapp_campaign_recipients(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_campaign_recipients_store ON public.whatsapp_campaign_recipients(store_id, updated_at DESC);

-- Server-only write model: conteúdo sensível e filas nunca são graváveis diretamente pelo cliente.
ALTER TABLE public.whatsapp_contact_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_contact_identities FORCE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_flow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_flow_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaigns FORCE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaign_recipients FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_identity_deny_client ON public.whatsapp_contact_identities;
CREATE POLICY whatsapp_identity_deny_client ON public.whatsapp_contact_identities FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS whatsapp_flow_runs_deny_client ON public.whatsapp_flow_runs;
CREATE POLICY whatsapp_flow_runs_deny_client ON public.whatsapp_flow_runs FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS whatsapp_campaigns_staff_select ON public.whatsapp_campaigns;
CREATE POLICY whatsapp_campaigns_staff_select ON public.whatsapp_campaigns FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = whatsapp_campaigns.store_id AND wm.profile_id = auth.uid())
);
DROP POLICY IF EXISTS whatsapp_campaigns_staff_write ON public.whatsapp_campaigns;
CREATE POLICY whatsapp_campaigns_staff_write ON public.whatsapp_campaigns FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = whatsapp_campaigns.store_id AND wm.profile_id = auth.uid() AND wm.role IN ('owner','admin','manager'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.store_id = whatsapp_campaigns.store_id AND wm.profile_id = auth.uid() AND wm.role IN ('owner','admin','manager'))
);
DROP POLICY IF EXISTS whatsapp_campaign_recipients_deny_client ON public.whatsapp_campaign_recipients;
CREATE POLICY whatsapp_campaign_recipients_deny_client ON public.whatsapp_campaign_recipients FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

COMMENT ON TABLE public.whatsapp_contact_identities IS 'Identidade canônica por loja/provider; vincula telefone/JID a cliente, lead, thread e consentimento.';
COMMENT ON TABLE public.whatsapp_campaign_recipients IS 'Destinatários materializados somente a partir de identidades com opt-in; cada item pode gerar uma entrada idempotente na outbox.';
