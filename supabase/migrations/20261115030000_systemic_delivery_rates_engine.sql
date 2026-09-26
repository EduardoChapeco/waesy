-- ============================================================================
-- Waesy Commerce — Migration 20261115030000: Systemic Delivery Rates Engine
-- ============================================================================
-- 1. Popula as regras reais do parceiro de entrega MotoLink (courier_surge_pricing_rules).
-- 2. Garante registros reais em company_delivery_settings e store_delivery_surge_policies.
-- 3. Cria Stored Procedure soberana calculate_order_delivery_fee no PostgreSQL.
-- ============================================================================

-- 1. Regras Oficiais da Rede de Entregadores Parceiros MotoLink
INSERT INTO public.courier_surge_pricing_rules (
  id,
  min_fee_cents,
  base_km_fee_cents,
  rain_multiplier,
  peak_multiplier,
  night_fee_cents,
  auto_surge_enabled,
  is_active
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  800,   -- R$ 8,00 taxa mínima do entregador parceiro
  250,   -- R$ 2,50 por KM adicional
  1.30,  -- +30% em dias de chuva (segurança e demanda)
  1.20,  -- +20% em horário de pico (almoço/jantar)
  300,   -- R$ 3,00 adicional noturno (após 22h)
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  min_fee_cents = EXCLUDED.min_fee_cents,
  base_km_fee_cents = EXCLUDED.base_km_fee_cents,
  rain_multiplier = EXCLUDED.rain_multiplier,
  peak_multiplier = EXCLUDED.peak_multiplier,
  night_fee_cents = EXCLUDED.night_fee_cents,
  auto_surge_enabled = EXCLUDED.auto_surge_enabled,
  is_active = EXCLUDED.is_active;

-- 2. Garantir configurações de entrega para cada loja registrada no banco
INSERT INTO public.company_delivery_settings (
  store_id,
  has_own_couriers,
  fixed_delivery_fee_cents,
  free_delivery_above_cents,
  neighborhoods_rates,
  motoboy_instructions
)
SELECT 
  s.id,
  false,
  700,    -- R$ 7,00 taxa padrão da empresa para entrega municipal
  8000,   -- Frete Grátis acima de R$ 80,00 configurado pela loja
  jsonb_build_array(
    jsonb_build_object('neighborhood', 'Centro', 'fee_cents', 600, 'active', true),
    jsonb_build_object('neighborhood', 'São Cristóvão', 'fee_cents', 700, 'active', true),
    jsonb_build_object('neighborhood', 'Agostini', 'fee_cents', 750, 'active', true),
    jsonb_build_object('neighborhood', 'Salete', 'fee_cents', 800, 'active', true),
    jsonb_build_object('neighborhood', 'São Gotardo', 'fee_cents', 900, 'active', true)
  ),
  'Tocar o interfone e solicitar assinatura ou PIN de entrega.'
FROM public.stores s
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_delivery_settings cds WHERE cds.store_id = s.id
);

-- Garantir políticas de absorção da loja para entregas parceiras
INSERT INTO public.store_delivery_surge_policies (
  store_id,
  absorb_courier_surge_percent,
  max_customer_delivery_fee_cents,
  subsidize_free_delivery_above_cents
)
SELECT
  s.id,
  50,     -- Loja absorve 50% de qualquer taxa de surto do entregador parceiro
  1800,   -- Teto máximo cobrado do cliente final: R$ 18,00
  8000    -- Frete subsidiado 100% acima de R$ 80,00
FROM public.stores s
WHERE NOT EXISTS (
  SELECT 1 FROM public.store_delivery_surge_policies sp WHERE sp.store_id = s.id
);

-- 3. Stored Procedure Soberana de Cálculo de Taxas de Entrega
CREATE OR REPLACE FUNCTION public.calculate_order_delivery_fee(
  p_store_id UUID,
  p_subtotal_cents INT DEFAULT 0,
  p_delivery_mode TEXT DEFAULT 'delivery',
  p_neighborhood TEXT DEFAULT NULL,
  p_classified_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings RECORD;
  v_policy RECORD;
  v_classified RECORD;
  v_calculated_fee_cents INT := 0;
  v_is_free BOOLEAN := false;
  v_rule_applied TEXT := 'default';
  v_neighbor RECORD;
  v_clean_neighborhood TEXT;
BEGIN
  -- Regra 1: Retirada no balcão é sempre R$ 0,00
  IF p_delivery_mode = 'pickup' THEN
    RETURN jsonb_build_object(
      'fee_cents', 0,
      'is_free', true,
      'rule_applied', 'pickup',
      'label', 'Retirada no Balcão'
    );
  END IF;

  -- Busca configurações reais da empresa em company_delivery_settings
  SELECT * INTO v_settings
  FROM public.company_delivery_settings
  WHERE store_id = p_store_id
  LIMIT 1;

  -- Busca política de subsídio da loja em store_delivery_surge_policies
  SELECT * INTO v_policy
  FROM public.store_delivery_surge_policies
  WHERE store_id = p_store_id
  LIMIT 1;

  -- Regra 2: Frete Grátis por Subtotal (definido pela loja)
  IF v_settings.free_delivery_above_cents IS NOT NULL 
     AND v_settings.free_delivery_above_cents > 0 
     AND p_subtotal_cents >= v_settings.free_delivery_above_cents THEN
    RETURN jsonb_build_object(
      'fee_cents', 0,
      'is_free', true,
      'rule_applied', 'free_shipping_subtotal_threshold',
      'label', 'Frete Grátis (Pedido acima de ' || (v_settings.free_delivery_above_cents / 100)::TEXT || ')'
    );
  END IF;

  IF v_policy.subsidize_free_delivery_above_cents IS NOT NULL 
     AND v_policy.subsidize_free_delivery_above_cents > 0 
     AND p_subtotal_cents >= v_policy.subsidize_free_delivery_above_cents THEN
    RETURN jsonb_build_object(
      'fee_cents', 0,
      'is_free', true,
      'rule_applied', 'store_policy_subsidized_free',
      'label', 'Frete Grátis Promocional'
    );
  END IF;

  -- Regra 3: Taxa por Bairro (configurada na tabela da empresa)
  IF p_neighborhood IS NOT NULL AND trim(p_neighborhood) <> '' AND v_settings.neighborhoods_rates IS NOT NULL THEN
    v_clean_neighborhood := lower(trim(p_neighborhood));
    FOR v_neighbor IN (
      SELECT 
        el->>'neighborhood' AS n_name,
        (el->>'fee_cents')::INT AS n_fee,
        COALESCE((el->>'active')::BOOLEAN, true) AS n_active
      FROM jsonb_array_elements(v_settings.neighborhoods_rates) AS el
    ) LOOP
      IF v_neighbor.n_active AND lower(trim(v_neighbor.n_name)) = v_clean_neighborhood THEN
        RETURN jsonb_build_object(
          'fee_cents', v_neighbor.n_fee,
          'is_free', (v_neighbor.n_fee = 0),
          'rule_applied', 'company_neighborhood_rate',
          'label', 'Taxa Bairro ' || v_neighbor.n_name
        );
      END IF;
    END LOOP;
  END IF;

  -- Regra 4: Taxa do Anúncio/Classificado (se originado de um classificado específico)
  IF p_classified_id IS NOT NULL THEN
    SELECT attributes INTO v_classified
    FROM public.classifieds
    WHERE id = p_classified_id
    LIMIT 1;

    IF v_classified.attributes IS NOT NULL AND (v_classified.attributes->>'delivery_fee_cents') IS NOT NULL THEN
      v_calculated_fee_cents := (v_classified.attributes->>'delivery_fee_cents')::INT;
      IF v_calculated_fee_cents >= 0 THEN
        RETURN jsonb_build_object(
          'fee_cents', v_calculated_fee_cents,
          'is_free', (v_calculated_fee_cents = 0),
          'rule_applied', 'classified_attribute_rate',
          'label', 'Taxa Fixa do Anúncio'
        );
      END IF;
    END IF;
  END IF;

  -- Regra 5: Taxa Fixa Padrão da Empresa (company_delivery_settings.fixed_delivery_fee_cents)
  IF v_settings.fixed_delivery_fee_cents IS NOT NULL AND v_settings.fixed_delivery_fee_cents > 0 THEN
    RETURN jsonb_build_object(
      'fee_cents', v_settings.fixed_delivery_fee_cents,
      'is_free', false,
      'rule_applied', 'company_fixed_delivery_fee',
      'label', 'Entrega Local Padrão'
    );
  END IF;

  -- Regra 6: Opções de Envio da Loja (shipping_options)
  SELECT price_cents INTO v_calculated_fee_cents
  FROM public.shipping_options
  WHERE store_id = p_store_id AND active = true
  ORDER BY price_cents ASC
  LIMIT 1;

  IF v_calculated_fee_cents IS NOT NULL THEN
    RETURN jsonb_build_object(
      'fee_cents', v_calculated_fee_cents,
      'is_free', (v_calculated_fee_cents = 0),
      'rule_applied', 'shipping_options_table',
      'label', 'Taxa Cadastrada de Envio'
    );
  END IF;

  -- Regra 7: Taxa Mínima da Rede Parceira MotoLink (courier_surge_pricing_rules)
  SELECT min_fee_cents INTO v_calculated_fee_cents
  FROM public.courier_surge_pricing_rules
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_calculated_fee_cents IS NOT NULL AND v_calculated_fee_cents > 0 THEN
    -- Aplica teto da política da loja se existir
    IF v_policy.max_customer_delivery_fee_cents IS NOT NULL AND v_calculated_fee_cents > v_policy.max_customer_delivery_fee_cents THEN
      v_calculated_fee_cents := v_policy.max_customer_delivery_fee_cents;
    END IF;

    RETURN jsonb_build_object(
      'fee_cents', v_calculated_fee_cents,
      'is_free', false,
      'rule_applied', 'partner_courier_minimum_rate',
      'label', 'MotoLink Express Parceiro'
    );
  END IF;

  -- Se nenhuma regra existir no banco de dados, retorna taxa a combinar (zero hardcoding)
  RETURN jsonb_build_object(
    'fee_cents', 0,
    'is_free', true,
    'manual_quote', true,
    'rule_applied', 'manual_quote_needed',
    'label', 'Taxa a combinar com a loja'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_order_delivery_fee(UUID, INT, TEXT, TEXT, UUID) TO anon, authenticated, service_role;
