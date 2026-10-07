-- Waesy — Blindagem de RPCs SECURITY DEFINER e provisionamento explícito de identidade
-- Não cria tenants, organizações, lojas ou memberships durante signup.
BEGIN;

-- 1. Remover o caminho implícito de criação de perfil/tenant no auth.users.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Remover overload UUID do magic link. O BFF usa a assinatura TEXT e valida o UUID.
DROP FUNCTION IF EXISTS public.get_public_lead_by_token(uuid);

-- 3. Magic link sem nome de agência inventado quando a loja não existe.
CREATE OR REPLACE FUNCTION public.get_public_lead_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lead public.leads_crm%ROWTYPE;
  v_store public.stores%ROWTYPE;
  v_token_uuid uuid;
BEGIN
  IF _token IS NULL OR _token !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;

  v_token_uuid := _token::uuid;
  SELECT * INTO v_lead
  FROM public.leads_crm
  WHERE magic_token = v_token_uuid OR id = v_token_uuid
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_store FROM public.stores WHERE id = v_lead.store_id;

  RETURN jsonb_build_object(
    'id', v_lead.id,
    'full_name', v_lead.full_name,
    'destination', v_lead.destination,
    'email', v_lead.email,
    'phone', v_lead.phone,
    'travel_start', v_lead.travel_start,
    'travel_end', v_lead.travel_end,
    'pax_count', v_lead.pax_count,
    'pax_adults', v_lead.pax_adults,
    'pax_children', v_lead.pax_children,
    'pax_infants', v_lead.pax_infants,
    'pax_list', v_lead.pax_list,
    'interest_type', v_lead.interest_type,
    'interest_period', v_lead.interest_period,
    'notes', v_lead.notes,
    'lgpd_accepted', v_lead.lgpd_accepted,
    'lgpd_accepted_at', v_lead.lgpd_accepted_at,
    'pcd', v_lead.pcd,
    'reduced_mobility', v_lead.reduced_mobility,
    'autism', v_lead.autism,
    'health_notes', v_lead.health_notes,
    'store_name', v_store.name,
    'store_logo', v_store.logo_url
  );
END;
$$;

-- 4. Nenhuma função SECURITY DEFINER pública fica chamável por anon/authenticated.
-- Os BFFs do Waesy usam service_role no servidor; funções internas continuam podendo
-- chamar umas às outras sem EXECUTE público. Esta regra também cobre overloads futuros
-- já existentes no momento da aplicação da migration.
DO $$
DECLARE
  fn RECORD;
  identity_args TEXT;
BEGIN
  FOR fn IN
    SELECT p.oid, n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    identity_args := fn.identity_args;
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated',
      fn.nspname, fn.proname, identity_args
    );
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO service_role',
      fn.nspname, fn.proname, identity_args
    );
  END LOOP;
END;
$$;

-- 5. Assertivas de segurança da própria migration.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth' AND c.relname = 'users'
      AND t.tgname = 'on_auth_user_created' AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'on_auth_user_created ainda está ativo';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'
  ) THEN
    RAISE EXCEPTION 'handle_new_user ainda existe';
  END IF;

  IF has_function_privilege('anon', 'public.get_public_lead_by_token(text)'::regprocedure, 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.get_public_lead_by_token(text)'::regprocedure, 'EXECUTE') THEN
    RAISE EXCEPTION 'magic link ainda possui EXECUTE público';
  END IF;
END;
$$;

COMMIT;
