-- 20270310000000_customer_payment_vault_and_whatsapp_outbox.sql
-- Invariante: Coerência de Contratos de Tabelas BFF (AGENTS.md B.25 e B.31)
-- Declaração canônica das tabelas de cofre efêmero, tokenização de pagamentos e fila outbox WhatsApp.

-- 1. Sessões efêmeras de coleta segura de cartão (15 minutos / Uso único)
CREATE TABLE IF NOT EXISTS public.ephemeral_vault_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL DEFAULT 'travel_booking',
  metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ephemeral_vault_token_hash ON public.ephemeral_vault_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_ephemeral_vault_expires_at ON public.ephemeral_vault_sessions(expires_at) WHERE status = 'pending';

-- 2. Cofre seguro de cartões tokenizados (PCI-DSS / Zero Client-Side Leak)
CREATE TABLE IF NOT EXISTS public.customer_payment_vault (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_token TEXT NOT NULL UNIQUE,
  brand TEXT NOT NULL,
  last4 TEXT NOT NULL,
  holder_name TEXT NOT NULL,
  exp_month INTEGER NOT NULL,
  exp_year INTEGER NOT NULL,
  encrypted_payload_ref TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_payment_vault_token ON public.customer_payment_vault(vault_token);
CREATE INDEX IF NOT EXISTS idx_customer_payment_vault_status ON public.customer_payment_vault(status);

-- 3. Fila de envio WhatsApp Outbox
CREATE TABLE IF NOT EXISTS public.whatsapp_outbox_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone TEXT NOT NULL,
  message_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'queued',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_status ON public.whatsapp_outbox_queue(status) WHERE status = 'queued';

-- 4. RLS e Segurança Zero-Trust
ALTER TABLE public.ephemeral_vault_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_payment_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_outbox_queue ENABLE ROW LEVEL SECURITY;

-- Deny público por padrão
CREATE POLICY "ephemeral_vault_sessions_deny_public" ON public.ephemeral_vault_sessions
  FOR ALL TO public USING (false);

CREATE POLICY "customer_payment_vault_deny_public" ON public.customer_payment_vault
  FOR ALL TO public USING (false);

CREATE POLICY "whatsapp_outbox_queue_deny_public" ON public.whatsapp_outbox_queue
  FOR ALL TO public USING (false);

-- Políticas para Service Role (BFF Server Functions)
CREATE POLICY "ephemeral_vault_sessions_service_role" ON public.ephemeral_vault_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "customer_payment_vault_service_role" ON public.customer_payment_vault
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "whatsapp_outbox_queue_service_role" ON public.whatsapp_outbox_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);
