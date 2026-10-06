-- Onda 8: correções de segurança, minimização de payloads e base de testes.

ALTER TABLE public.chat_conversation_keys
  ADD COLUMN IF NOT EXISTS retired_at TIMESTAMPTZ;

COMMENT ON COLUMN public.chat_conversation_keys.retired_at IS
  'Marca a DEK que não deve ser usada para novas mensagens; mantém leitura controlada para migração/retention.';

CREATE INDEX IF NOT EXISTS idx_chat_conversation_keys_active
  ON public.chat_conversation_keys(store_id, thread_id, key_version DESC)
  WHERE retired_at IS NULL;

-- Os eventos de inbox e auditoria são server-only. O conteúdo da mensagem deve
-- permanecer apenas no campo chat_messages.message, cifrado por thread.
COMMENT ON COLUMN public.whatsapp_webhook_inbox.payload IS
  'Metadados sanitizados do evento; não armazenar texto, caption, mídia ou token em claro.';
COMMENT ON COLUMN public.whatsapp_delivery_events.payload IS
  'Metadados sanitizados do recibo; não armazenar conteúdo da conversa ou segredos.';

CREATE TABLE IF NOT EXISTS public.whatsapp_wave8_test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_key TEXT NOT NULL UNIQUE,
  test_type TEXT NOT NULL CHECK (test_type IN ('load', 'failure_injection', 'e2e', 'security_audit')),
  status TEXT NOT NULL CHECK (status IN ('started', 'passed', 'failed', 'cancelled')),
  worker_count INTEGER,
  request_count INTEGER,
  accepted_count INTEGER,
  failed_count INTEGER,
  p95_latency_ms INTEGER,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

ALTER TABLE public.whatsapp_wave8_test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_wave8_test_runs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS whatsapp_wave8_tests_deny_client ON public.whatsapp_wave8_test_runs;
CREATE POLICY whatsapp_wave8_tests_deny_client ON public.whatsapp_wave8_test_runs
  FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

COMMENT ON TABLE public.whatsapp_wave8_test_runs IS
  'Registro server-only de testes controlados; não contém conteúdo de mensagens nem credenciais.';
