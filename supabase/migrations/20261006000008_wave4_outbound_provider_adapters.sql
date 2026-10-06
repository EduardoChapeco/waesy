-- Onda 4: adapters outbound reais por instância, sem alterar a chave de idempotência.

ALTER TABLE public.whatsapp_outbox
  ADD COLUMN IF NOT EXISTS channel_instance_id UUID REFERENCES public.whatsapp_channel_instances(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_instance_claim
  ON public.whatsapp_outbox (store_id, channel_instance_id, status, next_attempt_at);

-- A associação provider/instância é validada no BFF e no worker. Linhas legadas sem instância
-- são resolvidas somente quando existe exatamente uma instância ativa compatível.
COMMENT ON COLUMN public.whatsapp_outbox.channel_instance_id IS
  'Instância outbound determinística; null somente em itens legados, resolvidos com fallback seguro de instância única.';
