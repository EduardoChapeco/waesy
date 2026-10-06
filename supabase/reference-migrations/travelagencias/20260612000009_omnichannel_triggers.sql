-- Migration: 20260612000009_omnichannel_triggers.sql
-- Descrição: Gatilhos legados para Edge Functions via pg_net.
--
-- IMPORTANTE: esta migration é histórica/de referência. Não contém tokens.
-- Se for aplicada, exige configurações server-side:
--   app.supabase_functions_url (ex.: https://<project>.supabase.co)
--   app.service_role_key (somente no banco/secret manager)
-- O desenho canônico do Waesy deve preferir inbox/outbox durável a HTTP em trigger.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.trigger_whatsapp_sender()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_base_url text := current_setting('app.supabase_functions_url', true);
  v_service_key text := current_setting('app.service_role_key', true);
BEGIN
  IF NEW.direction = 'outbound' AND NEW.status = 'pending'
     AND NULLIF(v_base_url, '') IS NOT NULL
     AND NULLIF(v_service_key, '') IS NOT NULL THEN
    PERFORM net.http_post(
      url := rtrim(v_base_url, '/') || '/functions/v1/whatsapp-sender',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'omnichannel_messages',
        'schema', 'public',
        'record', row_to_json(NEW)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS whatsapp_sender_trigger ON public.omnichannel_messages;
CREATE TRIGGER whatsapp_sender_trigger
  AFTER INSERT ON public.omnichannel_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_whatsapp_sender();

CREATE OR REPLACE FUNCTION public.trigger_ai_message_processor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_base_url text := current_setting('app.supabase_functions_url', true);
  v_service_key text := current_setting('app.service_role_key', true);
BEGIN
  IF NEW.direction = 'inbound'
     AND NULLIF(v_base_url, '') IS NOT NULL
     AND NULLIF(v_service_key, '') IS NOT NULL THEN
    PERFORM net.http_post(
      url := rtrim(v_base_url, '/') || '/functions/v1/ai-message-processor',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'type', 'INSERT',
        'table', 'omnichannel_messages',
        'schema', 'public',
        'record', row_to_json(NEW)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ai_message_processor_trigger ON public.omnichannel_messages;
CREATE TRIGGER ai_message_processor_trigger
  AFTER INSERT ON public.omnichannel_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_ai_message_processor();

CREATE OR REPLACE FUNCTION public.trigger_meta_capi_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_base_url text := current_setting('app.supabase_functions_url', true);
  v_service_key text := current_setting('app.service_role_key', true);
BEGIN
  IF NEW.status = 'converted'
     AND OLD.status IS DISTINCT FROM 'converted'
     AND NULLIF(v_base_url, '') IS NOT NULL
     AND NULLIF(v_service_key, '') IS NOT NULL THEN
    PERFORM net.http_post(
      url := rtrim(v_base_url, '/') || '/functions/v1/meta-capi-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'type', 'UPDATE',
        'table', 'proposals',
        'schema', 'public',
        'record', row_to_json(NEW),
        'old_record', row_to_json(OLD)
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS meta_capi_sync_trigger ON public.proposals;
CREATE TRIGGER meta_capi_sync_trigger
  AFTER UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_meta_capi_sync();
