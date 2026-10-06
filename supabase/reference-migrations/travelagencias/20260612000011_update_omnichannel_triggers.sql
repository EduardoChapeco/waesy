-- Migration: 20260612000011_update_omnichannel_triggers.sql
-- Descrição: atualização histórica dos triggers omnichannel.
--
-- Esta referência não contém project_ref ou service_role JWT. A aplicação exige
-- app.supabase_functions_url e app.service_role_key configurados no servidor.
-- Para produção, migrar o fluxo para inbox/outbox e worker durável.

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
