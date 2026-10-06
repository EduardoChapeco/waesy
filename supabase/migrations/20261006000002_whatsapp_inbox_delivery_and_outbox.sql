-- Migration: 20261006000002_whatsapp_inbox_delivery_and_outbox.sql
-- WhatsApp oficial: inbox durável, replay idempotente, recibos e rastreabilidade.
-- Nenhuma operação de cliente deve escrever diretamente nessas tabelas.

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS external_message_id TEXT,
  ADD COLUMN IF NOT EXISTS channel TEXT,
  ADD COLUMN IF NOT EXISTS delivery_status TEXT NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_code TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

UPDATE public.chat_messages
SET sent_at = COALESCE(sent_at, created_at)
WHERE sent_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_messages_whatsapp_external_id
  ON public.chat_messages (thread_id, external_message_id)
  WHERE channel = 'whatsapp' AND external_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_whatsapp_status
  ON public.chat_messages (channel, delivery_status, created_at DESC)
  WHERE channel = 'whatsapp';

CREATE TABLE IF NOT EXISTS public.whatsapp_webhook_inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'whatsapp_cloud_api',
  phone_number_id TEXT NOT NULL,
  event_key TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('message', 'status', 'unknown')),
  external_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'processed', 'failed', 'ignored')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, event_key)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_inbox_pending
  ON public.whatsapp_webhook_inbox (status, received_at)
  WHERE status IN ('received', 'failed');

CREATE INDEX IF NOT EXISTS idx_whatsapp_inbox_external
  ON public.whatsapp_webhook_inbox (store_id, external_message_id)
  WHERE external_message_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.whatsapp_delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  phone_number_id TEXT NOT NULL,
  external_message_id TEXT NOT NULL,
  delivery_status TEXT NOT NULL CHECK (delivery_status IN ('accepted', 'sent', 'delivered', 'read', 'failed')),
  recipient_phone TEXT,
  conversation_id TEXT,
  error_code TEXT,
  error_message TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, external_message_id, delivery_status)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_delivery_events_message
  ON public.whatsapp_delivery_events (store_id, external_message_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS public.whatsapp_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES public.chat_threads(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'whatsapp_cloud_api',
  idempotency_key TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'accepted', 'sent', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  external_message_id TEXT,
  last_error_code TEXT,
  last_error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_pending
  ON public.whatsapp_outbox (status, next_attempt_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_thread
  ON public.whatsapp_outbox (store_id, thread_id, created_at DESC);

ALTER TABLE public.whatsapp_webhook_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_webhook_inbox FORCE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_delivery_events FORCE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_outbox FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS whatsapp_webhook_inbox_deny_client ON public.whatsapp_webhook_inbox;
CREATE POLICY whatsapp_webhook_inbox_deny_client ON public.whatsapp_webhook_inbox
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS whatsapp_delivery_events_deny_client ON public.whatsapp_delivery_events;
CREATE POLICY whatsapp_delivery_events_deny_client ON public.whatsapp_delivery_events
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS whatsapp_outbox_deny_client ON public.whatsapp_outbox;
CREATE POLICY whatsapp_outbox_deny_client ON public.whatsapp_outbox
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

COMMENT ON TABLE public.whatsapp_webhook_inbox IS
  'Inbox durável e idempotente de eventos Meta; acesso somente server-side/service role.';
COMMENT ON TABLE public.whatsapp_delivery_events IS
  'Histórico append-only de recibos accepted/sent/delivered/read/failed da Meta.';
COMMENT ON TABLE public.whatsapp_outbox IS
  'Fila durável de mensagens outbound; o worker deve reivindicar por status/next_attempt_at.';
