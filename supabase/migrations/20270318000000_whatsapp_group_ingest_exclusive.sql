-- ============================================================================
-- Ingestão de contatos de grupos WhatsApp -> travel_commercial_contacts
-- Exclusiva por store_id (feature grant), idempotente e sem duplicidade.
-- NÃO destrutiva: duplicatas existentes são marcadas (duplicate_of), não apagadas.
-- ============================================================================

BEGIN;

-- 1. Normalização de telefone (Brasil + internacional), chave canônica -------
CREATE OR REPLACE FUNCTION public.normalize_phone_e164(p_raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  d text;
BEGIN
  IF p_raw IS NULL THEN RETURN NULL; END IF;
  d := regexp_replace(p_raw, '\D', '', 'g');
  d := regexp_replace(d, '^0+', '');
  IF d = '' THEN RETURN NULL; END IF;

  -- Nacional sem DDI: DD + 8/9 dígitos
  IF length(d) = 10 AND left(d, 2) ~ '^[1-9][1-9]$' THEN
    IF substr(d, 3, 1) ~ '[6-9]' THEN
      d := substr(d, 1, 2) || '9' || substr(d, 3);   -- 9º dígito
    END IF;
    RETURN '55' || d;
  END IF;
  -- 11 dígitos: só é celular BR se o 3º dígito for 9 (senão pode ser DDI estrangeiro, ex.: 1415...)
  IF length(d) = 11 AND left(d, 2) ~ '^[1-9][1-9]$' AND substr(d, 3, 1) = '9' THEN
    RETURN '55' || d;
  END IF;

  -- Brasil com DDI
  IF left(d, 2) = '55' AND length(d) IN (12, 13) THEN
    IF length(d) = 12 AND substr(d, 5, 1) ~ '[6-9]' THEN
      d := substr(d, 1, 4) || '9' || substr(d, 5);
    END IF;
    RETURN d;
  END IF;

  -- Internacional plausível (E.164 permite até 15 dígitos)
  IF length(d) BETWEEN 11 AND 15 AND left(d, 2) <> '55' THEN
    RETURN d;
  END IF;

  RETURN NULL;
END;
$$;

-- 2. Colunas novas em travel_commercial_contacts ------------------------------
ALTER TABLE public.travel_commercial_contacts
  ADD COLUMN IF NOT EXISTS phone_e164 text,
  ADD COLUMN IF NOT EXISTS duplicate_of uuid REFERENCES public.travel_commercial_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS consent_basis text;

-- Backfill
UPDATE public.travel_commercial_contacts
SET phone_e164 = public.normalize_phone_e164(phone)
WHERE phone_e164 IS NULL;

-- Marca duplicatas (mantém a mais antiga como canônica). Nada é apagado.
WITH ranked AS (
  SELECT id,
         first_value(id) OVER (PARTITION BY store_id, phone_e164 ORDER BY created_at, id) AS keep_id
  FROM public.travel_commercial_contacts
  WHERE phone_e164 IS NOT NULL
)
UPDATE public.travel_commercial_contacts c
SET duplicate_of = r.keep_id
FROM ranked r
WHERE c.id = r.id AND r.id <> r.keep_id AND c.duplicate_of IS NULL;

-- Unicidade: um contato canônico por (loja, telefone)
CREATE UNIQUE INDEX IF NOT EXISTS uq_travel_comm_contacts_store_phone_e164
  ON public.travel_commercial_contacts (store_id, phone_e164)
  WHERE phone_e164 IS NOT NULL AND duplicate_of IS NULL;

-- Mantém phone_e164 coerente para QUALQUER caminho de escrita (legado incluso)
CREATE OR REPLACE FUNCTION public.trg_travel_comm_contacts_set_e164()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.phone IS DISTINCT FROM OLD.phone THEN
    NEW.phone_e164 := public.normalize_phone_e164(NEW.phone);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS travel_comm_contacts_set_e164 ON public.travel_commercial_contacts;
CREATE TRIGGER travel_comm_contacts_set_e164
  BEFORE INSERT OR UPDATE ON public.travel_commercial_contacts
  FOR EACH ROW EXECUTE FUNCTION public.trg_travel_comm_contacts_set_e164();

-- 3. Feature grants (exclusividade por loja) ---------------------------------
CREATE TABLE IF NOT EXISTS public.workspace_feature_grants (
  store_id    uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  enabled     boolean NOT NULL DEFAULT true,
  granted_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (store_id, feature_key)
);

-- 4. Tokens de ingestão (somente hash SHA-256) -------------------------------
CREATE TABLE IF NOT EXISTS public.ingest_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id     uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  label        text,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz,
  revoked_at   timestamptz,
  last_used_at timestamptz
);

-- 5. Lotes (idempotência + auditoria) ----------------------------------------
CREATE TABLE IF NOT EXISTS public.ingest_batches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  token_id        uuid REFERENCES public.ingest_tokens(id) ON DELETE SET NULL,
  idempotency_key text NOT NULL,
  total_items     integer NOT NULL DEFAULT 0,
  result          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_ingest_batch_key UNIQUE (store_id, idempotency_key)
);

-- 6. Proveniência: de quais grupos cada contato veio -------------------------
CREATE TABLE IF NOT EXISTS public.contact_group_memberships (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id      uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  contact_id    uuid NOT NULL REFERENCES public.travel_commercial_contacts(id) ON DELETE CASCADE,
  group_key     text NOT NULL,
  group_name    text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_contact_group UNIQUE (contact_id, group_key)
);
CREATE INDEX IF NOT EXISTS idx_cgm_store ON public.contact_group_memberships(store_id);

-- RLS ligada SEM políticas: acesso apenas via service_role (endpoint/RPC)
ALTER TABLE public.workspace_feature_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingest_tokens            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingest_batches           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_group_memberships ENABLE ROW LEVEL SECURITY;

-- 7. Telefones de clientes da loja (papel 'customer') ------------------------
CREATE OR REPLACE VIEW public.v_customer_phones AS
SELECT wm.store_id,
       wm.profile_id AS customer_id,
       public.normalize_phone_e164(p.phone) AS phone_e164
FROM public.workspace_members wm
JOIN public.profiles p ON p.id = wm.profile_id
WHERE wm.role = 'customer' AND p.phone IS NOT NULL;
REVOKE ALL ON public.v_customer_phones FROM anon, authenticated;

-- 8. RPC atômica e idempotente ------------------------------------------------
CREATE OR REPLACE FUNCTION public.ingest_group_contacts(
  p_store_id uuid,
  p_token_id uuid,
  p_idempotency_key text,
  p_dry_run boolean,
  p_items jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted int;
  v_result jsonb;
  v_created int := 0; v_merged int := 0; v_customer int := 0;
  v_optout int := 0; v_invalid int := 0; v_dupe_in_batch int := 0;
  v_seen text[] := '{}';
  it jsonb; v_phone text; v_name text; v_gkey text; v_gname text;
  v_contact public.travel_commercial_contacts%ROWTYPE;
  v_id uuid; v_first boolean;
BEGIN
  -- Defesa em profundidade: o grant é revalidado dentro do banco com auto-cura para Excelência Tour SMO
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_feature_grants
    WHERE store_id = p_store_id AND feature_key = 'whatsapp_group_ingest' AND enabled
  ) THEN
    IF EXISTS (
      SELECT 1 FROM public.stores
      WHERE id = p_store_id
        AND (
          slug ILIKE 'excelencia-tour%'
          OR slug ILIKE 'excelencia%smo%'
          OR slug = 'excelencia-tour-sao-miguel-do-oeste'
          OR name ILIKE '%excelência tour%'
          OR name ILIKE '%excelencia tour%'
        )
    ) THEN
      INSERT INTO public.workspace_feature_grants (store_id, feature_key, enabled)
      VALUES (p_store_id, 'whatsapp_group_ingest', true)
      ON CONFLICT (store_id, feature_key) DO UPDATE SET enabled = true;
    ELSE
      RAISE EXCEPTION 'feature_not_granted' USING ERRCODE = '42501';
    END IF;
  END IF;

  IF jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) > 500 THEN
    RAISE EXCEPTION 'invalid_items';
  END IF;

  IF NOT p_dry_run THEN
    INSERT INTO public.ingest_batches (store_id, token_id, idempotency_key, total_items)
    VALUES (p_store_id, p_token_id, p_idempotency_key, jsonb_array_length(p_items))
    ON CONFLICT (store_id, idempotency_key) DO NOTHING;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;

    IF v_inserted = 0 THEN
      SELECT result INTO v_result FROM public.ingest_batches
      WHERE store_id = p_store_id AND idempotency_key = p_idempotency_key;
      RETURN COALESCE(v_result, '{}'::jsonb) || jsonb_build_object('replayed', true);
    END IF;
  END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_phone := public.normalize_phone_e164(it->>'phone');
    v_name  := NULLIF(btrim(COALESCE(it->>'name', '')), '');
    v_gkey  := NULLIF(btrim(COALESCE(it->>'group_key', '')), '');
    v_gname := NULLIF(btrim(COALESCE(it->>'group_name', '')), '');

    IF v_phone IS NULL THEN v_invalid := v_invalid + 1; CONTINUE; END IF;

    v_id := NULL;
    v_first := NOT (v_phone = ANY(v_seen));
    IF v_first THEN v_seen := v_seen || v_phone; ELSE v_dupe_in_batch := v_dupe_in_batch + 1; END IF;

    -- Já é cliente? Nunca vira oportunidade.
    IF EXISTS (SELECT 1 FROM public.v_customer_phones
               WHERE store_id = p_store_id AND phone_e164 = v_phone) THEN
      IF v_first THEN v_customer := v_customer + 1; END IF;
      CONTINUE;
    END IF;

    SELECT * INTO v_contact FROM public.travel_commercial_contacts
    WHERE store_id = p_store_id AND phone_e164 = v_phone AND duplicate_of IS NULL;

    IF FOUND THEN
      IF v_contact.status = 'opted_out' THEN
        v_optout := v_optout + 1; CONTINUE;
      END IF;
      v_id := v_contact.id;
      IF v_first THEN v_merged := v_merged + 1; END IF;
      IF NOT p_dry_run AND (v_contact.name IS NULL OR btrim(v_contact.name) = '') AND v_name IS NOT NULL THEN
        UPDATE public.travel_commercial_contacts SET name = v_name, updated_at = now() WHERE id = v_id;
      END IF;
    ELSE
      IF p_dry_run THEN
        IF v_first THEN v_created := v_created + 1; END IF;
        CONTINUE;
      END IF;
      INSERT INTO public.travel_commercial_contacts
        (store_id, name, phone, phone_e164, preferred_channel, status, source, consent_basis)
      VALUES
        (p_store_id, COALESCE(v_name, '+' || v_phone), v_phone, v_phone,
         'whatsapp', 'active', 'whatsapp_group', 'legitimo_interesse_grupo')
      ON CONFLICT (store_id, phone_e164) WHERE phone_e164 IS NOT NULL AND duplicate_of IS NULL
      DO NOTHING
      RETURNING id INTO v_id;

      IF v_id IS NULL THEN  -- corrida: outro processo inseriu no meio
        SELECT id INTO v_id FROM public.travel_commercial_contacts
        WHERE store_id = p_store_id AND phone_e164 = v_phone AND duplicate_of IS NULL;
        v_merged := v_merged + 1;
      ELSE
        v_created := v_created + 1;
      END IF;
    END IF;

    IF NOT p_dry_run AND v_id IS NOT NULL AND v_gkey IS NOT NULL THEN
      INSERT INTO public.contact_group_memberships (store_id, contact_id, group_key, group_name)
      VALUES (p_store_id, v_id, v_gkey, v_gname)
      ON CONFLICT (contact_id, group_key)
      DO UPDATE SET last_seen_at = now(), group_name = COALESCE(EXCLUDED.group_name, contact_group_memberships.group_name);
    END IF;
  END LOOP;

  v_result := jsonb_build_object(
    'created', v_created, 'merged', v_merged,
    'skipped_customer', v_customer, 'skipped_opted_out', v_optout,
    'invalid', v_invalid, 'duplicate_in_batch', v_dupe_in_batch,
    'dry_run', p_dry_run, 'replayed', false
  );

  IF NOT p_dry_run THEN
    UPDATE public.ingest_batches SET result = v_result
    WHERE store_id = p_store_id AND idempotency_key = p_idempotency_key;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.ingest_group_contacts(uuid, uuid, text, boolean, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ingest_group_contacts(uuid, uuid, text, boolean, jsonb) TO service_role;

-- 9. Concessão à Excelência Tour SMO (por slug ou nome, idempotente) --
INSERT INTO public.workspace_feature_grants (store_id, feature_key, enabled)
SELECT id, 'whatsapp_group_ingest', true
FROM public.stores
WHERE slug ILIKE 'excelencia-tour%'
   OR slug ILIKE 'excelencia%smo%'
   OR slug = 'excelencia-tour-sao-miguel-do-oeste'
   OR name ILIKE '%excelência tour%'
   OR name ILIKE '%excelencia tour%'
ON CONFLICT (store_id, feature_key) DO UPDATE SET enabled = true;

COMMIT;

-- RELATÓRIO (somente leitura) de duplicatas marcadas para revisão manual:
--   SELECT store_id, phone_e164, count(*) FROM travel_commercial_contacts
--   WHERE duplicate_of IS NOT NULL GROUP BY 1,2;
