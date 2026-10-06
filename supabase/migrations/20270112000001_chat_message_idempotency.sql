-- Idempotência de envio no chat: o cliente mantém o mesmo UUID durante retries.
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS client_message_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_thread_client_message_uidx
  ON public.chat_messages (thread_id, client_message_id)
  WHERE client_message_id IS NOT NULL;
