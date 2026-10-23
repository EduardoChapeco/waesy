-- ==============================================================================
-- MIGRATION: 20270223000000_advanced_address_platform_mercadolivre_parity.sql
-- MÓDULO CANÔNICO DE ENDEREÇOS: PARIDADE MERCADO LIVRE, SEM NÚMERO E INDICAÇÕES
-- ==============================================================================

-- 1. Expansão da tabela user_addresses com has_no_number
ALTER TABLE public.user_addresses
  ADD COLUMN IF NOT EXISTS has_no_number BOOLEAN DEFAULT false;

-- 2. Atualização da procedure atômica save_user_address_atomic
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
  p_instructions TEXT,
  p_has_no_number BOOLEAN DEFAULT false
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
  v_effective_number TEXT := COALESCE(p_number, '');
  v_result JSONB;
BEGIN
  IF p_has_no_number OR trim(v_effective_number) = '' THEN
    IF p_has_no_number THEN
      v_effective_number := 'S/N';
    END IF;
  END IF;

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
      number = v_effective_number,
      has_no_number = COALESCE(p_has_no_number, false),
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
      formatted_address = concat_ws(', ', p_street || ' ' || v_effective_number, p_neighborhood, p_city || ' - ' || upper(p_state)),
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
      has_no_number,
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
      v_effective_number,
      COALESCE(p_has_no_number, false),
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
      concat_ws(', ', p_street || ' ' || v_effective_number, p_neighborhood, p_city || ' - ' || upper(p_state)),
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

-- 3. Procedure atômica rápida para definir endereço predefinido
CREATE OR REPLACE FUNCTION public.set_default_user_address_atomic(
  p_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_addresses
    WHERE id = p_id AND user_id = p_user_id AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Endereço não encontrado.');
  END IF;

  UPDATE public.user_addresses
  SET is_default = false, updated_at = now()
  WHERE user_id = p_user_id AND deleted_at IS NULL;

  UPDATE public.user_addresses
  SET is_default = true, updated_at = now()
  WHERE id = p_id AND user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'default_id', p_id);
END;
$$;

-- 4. Procedure atômica para edição rápida de indicações e condomínio
CREATE OR REPLACE FUNCTION public.update_address_instructions_atomic(
  p_id UUID,
  p_user_id UUID,
  p_instructions TEXT,
  p_reference_point TEXT,
  p_intercom_code TEXT,
  p_block_tower TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.user_addresses
    WHERE id = p_id AND user_id = p_user_id AND deleted_at IS NULL
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Endereço não encontrado.');
  END IF;

  UPDATE public.user_addresses
  SET
    instructions = p_instructions,
    reference_point = p_reference_point,
    intercom_code = p_intercom_code,
    block_tower = p_block_tower,
    updated_at = now()
  WHERE id = p_id AND user_id = p_user_id;

  SELECT to_jsonb(a.*) INTO v_result
  FROM public.user_addresses a
  WHERE a.id = p_id;

  RETURN jsonb_build_object('success', true, 'address', v_result);
END;
$$;
