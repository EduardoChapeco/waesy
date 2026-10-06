-- Onda 6: ingestão idempotente de webhooks não oficiais e confirmações de entrega.
-- IDs de mensagem de providers não são identidade global; pertencem à conversa/loja.

DROP INDEX IF EXISTS public.uq_chat_messages_external_message;
CREATE UNIQUE INDEX IF NOT EXISTS uq_chat_messages_thread_external_message
  ON public.chat_messages(thread_id, external_message_id)
  WHERE external_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_external_instance_lookup
  ON public.chat_messages(external_message_id, thread_id)
  WHERE external_message_id IS NOT NULL;

COMMENT ON INDEX public.uq_chat_messages_thread_external_message IS
  'Idempotência inbound limitada à conversa; evita colisão de IDs externos entre providers, lojas e instâncias.';
