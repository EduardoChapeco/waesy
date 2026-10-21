-- ==============================================================================
-- MIGRATION: 20270222000000_canonical_address_platform_and_snapshots.sql
-- MÓDULO MEUS ENDEREÇOS: HARDENING, CONDOMÍNIOS, PROCEDURES ATÔMICAS E SNAPSHOTS
-- ==============================================================================

-- 1. Hardening da tabela user_addresses
ALTER TABLE public.user_addresses
  ADD COLUMN IF NOT EXISTS address_type TEXT DEFAULT 'residential', -- 'residential', 'commercial', 'rural', 'other'
  ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'home', -- 'home', 'building', 'briefcase', 'heart', 'map_pin'
  ADD COLUMN IF NOT EXISTS instructions TEXT,
  ADD COLUMN IF NOT EXISTS formatted_address TEXT,
  ADD COLUMN IF NOT EXISTS provider_place_id TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Índice parcial para garantir unicidade lógica do endereço padrão por usuário (EARS-04)
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_addresses_single_default
  ON public.user_addresses(user_id)
  WHERE (is_default = true AND deleted_at IS NULL);

-- Índice para busca rápida de endereços ativos
CREATE INDEX IF NOT EXISTS idx_user_addresses_active_user
  ON public.user_addresses(user_id, is_default, created_at DESC)
  WHERE deleted_at IS NULL;

-- 3. Procedure atômica para salvar/atualizar endereço e garantir default único
CREATE OR REPLACE FUNCTION public.save_user_address_atomic(
  p_id UUID,
  p_user_id UUID,
  p_label TEXT,
  p_recipient_name TEXT,
  p_recipient_phone TEXT,
  p_zipcode TEXT,
  p_street TEXT,
  p_number TEXT,
  p_complement TEXT,
  p_reference_point TEXT,
  p_neighborhood TEXT,
  p_city TEXT,
  p_state TEXT,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_is_default BOOLEAN,
  p_is_apartment BOOLEAN,
  p_block_tower TEXT,
  p_intercom_code TEXT,
  p_address_type TEXT,
  p_icon TEXT,
  p_instructions TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_address_id UUID;
  v_is_first BOOLEAN;
  v_set_default BOOLEAN := p_is_default;
  v_result JSONB;
BEGIN
  -- Verificar se é o primeiro endereço ativo do usuário; se for, força is_default = true
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_addresses
    WHERE user_id = p_user_id AND deleted_at IS NULL AND (p_id IS NULL OR id <> p_id)
  ) INTO v_is_first;

  IF v_is_first THEN
    v_set_default := true;
  END IF;

  -- Se for marcado como default, desmarcar todos os outros do mesmo usuário
  IF v_set_default THEN
    UPDATE public.user_addresses
    SET is_default = false, updated_at = now()
    WHERE user_id = p_user_id AND deleted_at IS NULL;
  END IF;

  IF p_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.user_addresses WHERE id = p_id AND user_id = p_user_id) THEN
    -- Update
    UPDATE public.user_addresses
    SET
      label = COALESCE(p_label, label),
      recipient_name = p_recipient_name,
      recipient_phone = p_recipient_phone,
      zipcode = regexp_replace(p_zipcode, '\D', '', 'g'),
      street = p_street,
      number = p_number,
      complement = p_complement,
      reference_point = p_reference_point,
      neighborhood = p_neighborhood,
      city = p_city,
      state = upper(p_state),
      latitude = p_latitude,
      longitude = p_longitude,
      is_default = v_set_default,
      is_apartment = COALESCE(p_is_apartment, false),
      block_tower = p_block_tower,
      intercom_code = p_intercom_code,
      address_type = COALESCE(p_address_type, 'residential'),
      icon = COALESCE(p_icon, 'home'),
      instructions = p_instructions,
      formatted_address = concat_ws(', ', p_street || ' ' || p_number, p_neighborhood, p_city || ' - ' || upper(p_state)),
      updated_at = now()
    WHERE id = p_id AND user_id = p_user_id
    RETURNING id INTO v_address_id;
  ELSE
    -- Insert
    INSERT INTO public.user_addresses (
      user_id,
      label,
      recipient_name,
      recipient_phone,
      zipcode,
      street,
      number,
      complement,
      reference_point,
      neighborhood,
      city,
      state,
      latitude,
      longitude,
      is_default,
      is_apartment,
      block_tower,
      intercom_code,
      address_type,
      icon,
      instructions,
      formatted_address,
      created_at,
      updated_at
    ) VALUES (
      p_user_id,
      COALESCE(p_label, 'Principal'),
      p_recipient_name,
      p_recipient_phone,
      regexp_replace(p_zipcode, '\D', '', 'g'),
      p_street,
      p_number,
      p_complement,
      p_reference_point,
      p_neighborhood,
      p_city,
      upper(p_state),
      p_latitude,
      p_longitude,
      v_set_default,
      COALESCE(p_is_apartment, false),
      p_block_tower,
      p_intercom_code,
      COALESCE(p_address_type, 'residential'),
      COALESCE(p_icon, 'home'),
      p_instructions,
      concat_ws(', ', p_street || ' ' || p_number, p_neighborhood, p_city || ' - ' || upper(p_state)),
      now(),
      now()
    )
    RETURNING id INTO v_address_id;
  END IF;

  SELECT to_jsonb(a.*) INTO v_result
  FROM public.user_addresses a
  WHERE a.id = v_address_id;

  RETURN jsonb_build_object('success', true, 'address', v_result);
END;
$$;

-- 4. Procedure para exclusão segura com eleição atômica de novo default
CREATE OR REPLACE FUNCTION public.delete_user_address_atomic(
  p_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_was_default BOOLEAN;
  v_next_id UUID;
BEGIN
  SELECT is_default INTO v_was_default
  FROM public.user_addresses
  WHERE id = p_id AND user_id = p_user_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Endereço não encontrado.');
  END IF;

  -- Soft delete para preservar integridade
  UPDATE public.user_addresses
  SET deleted_at = now(), is_default = false, updated_at = now()
  WHERE id = p_id AND user_id = p_user_id;

  -- Se era o default, elege o mais recente remanescente
  IF v_was_default THEN
    SELECT id INTO v_next_id
    FROM public.user_addresses
    WHERE user_id = p_user_id AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_next_id IS NOT NULL THEN
      UPDATE public.user_addresses
      SET is_default = true, updated_at = now()
      WHERE id = v_next_id;
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true, 'new_default_id', v_next_id);
END;
$$;
