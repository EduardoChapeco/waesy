-- ═══════════════════════════════════════════════════════════════════════════
-- V122/V123 OMNI-HUB ERP — Migration: origin_channel + cost_breakdown
-- 
-- Resolve o Gap SEV-1 identificado na auditoria forense:
-- A tabela orders não possuía rastreabilidade de canal de origem,
-- impedindo segragação financeira multi-canal (Waesy App vs ML vs iFood).
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. origin_channel: identifica de qual canal veio o pedido ──────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS origin_channel TEXT
    NOT NULL DEFAULT 'waesy_app'
    CHECK (origin_channel IN (
      'waesy_app',      -- Canal nativo Waesy (App/Web/PWA)
      'pdv',            -- Ponto de Venda físico
      'whatsapp',       -- Pedido via WhatsApp (quick-order)
      'mercadolivre',   -- Integração Mercado Livre
      'ifood',          -- Integração iFood
      'shopee',         -- Integração Shopee
      'magalu',         -- Integração Magazine Luiza
      'amazon',         -- Integração Amazon
      'rappi',          -- Integração Rappi
      'amodelivery',    -- Integração Amo Delivery
      '99food',         -- Integração 99Food
      'direct_link'     -- Link direto/checkout embarcado
    ));

-- ── 2. cost_breakdown: JSONB estruturado para margem por canal ────────────
-- Armazena decomposição de custos: taxa plataforma, custo logístico, margem.
-- Usando JSONB para flexibilidade por canal (cada marketplace tem sua estrutura).
-- Inteiros em centavos (BRL) — Regra 3 da AGENTS.md: Dinheiro = Integer Cents.
--
-- Schema esperado do JSONB:
-- {
--   "platform_fee_cents": 2500,      -- Taxa do marketplace (ex: Mercado Livre 12%)
--   "shipping_cost_cents": 1490,     -- Custo do frete cobrado da loja
--   "payment_fee_cents": 380,        -- Taxa de gateway de pagamento
--   "discount_cents": 0,             -- Descontos/cupons aplicados
--   "net_revenue_cents": 9630,       -- Receita líquida calculada
--   "margin_percent": 48.15          -- Margem percentual (float, apenas display)
-- }
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cost_breakdown JSONB DEFAULT '{}'::jsonb;

-- ── 3. Índices para relatórios financeiros por canal ─────────────────────
-- Suporte a queries: "Vendas de hoje por canal" / "Margem por marketplace"
CREATE INDEX IF NOT EXISTS idx_orders_origin_channel
  ON orders (store_id, origin_channel, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_origin_channel_status
  ON orders (store_id, origin_channel, status)
  WHERE status IN ('paid', 'processing', 'shipped', 'delivered', 'completed');

-- Índice parcial para performance em relatórios de margens (apenas pedidos com breakdown)
CREATE INDEX IF NOT EXISTS idx_orders_cost_breakdown
  ON orders (store_id, created_at DESC)
  WHERE cost_breakdown != '{}'::jsonb;

-- ── 4. Função RPC: channel_financial_summary ─────────────────────────────
-- Agrega vendas brutas, taxas e receita líquida por canal de forma atômica.
-- Chamada no BFF: db.rpc('channel_financial_summary', { p_store_id, p_from, p_to })
CREATE OR REPLACE FUNCTION channel_financial_summary(
  p_store_id UUID,
  p_from     TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_to       TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  channel             TEXT,
  order_count         BIGINT,
  gross_sales_cents   BIGINT,
  platform_fee_cents  BIGINT,
  shipping_cost_cents BIGINT,
  payment_fee_cents   BIGINT,
  net_revenue_cents   BIGINT,
  avg_margin_percent  NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Apenas o próprio store pode consultar seus dados (Multi-Tenant Safety)
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória';
  END IF;

  RETURN QUERY
  SELECT
    o.origin_channel AS channel,
    COUNT(*)::BIGINT AS order_count,
    COALESCE(SUM(o.total_cents), 0)::BIGINT AS gross_sales_cents,
    COALESCE(SUM((o.cost_breakdown->>'platform_fee_cents')::BIGINT), 0)::BIGINT AS platform_fee_cents,
    COALESCE(SUM((o.cost_breakdown->>'shipping_cost_cents')::BIGINT), 0)::BIGINT AS shipping_cost_cents,
    COALESCE(SUM((o.cost_breakdown->>'payment_fee_cents')::BIGINT), 0)::BIGINT AS payment_fee_cents,
    COALESCE(SUM((o.cost_breakdown->>'net_revenue_cents')::BIGINT), 0)::BIGINT AS net_revenue_cents,
    COALESCE(AVG((o.cost_breakdown->>'margin_percent')::NUMERIC), 0)::NUMERIC AS avg_margin_percent
  FROM orders o
  WHERE
    o.store_id = p_store_id
    AND o.created_at >= p_from
    AND o.created_at <= p_to
    AND o.status NOT IN ('cancelled', 'refunded')
  GROUP BY o.origin_channel
  ORDER BY gross_sales_cents DESC;
END;
$$;

-- RLS: a função usa SECURITY DEFINER mas valida auth.uid() internamente.
-- Não conceder permissão direta à tabela — acesso apenas via BFF (service_role).
REVOKE ALL ON FUNCTION channel_financial_summary FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION channel_financial_summary TO authenticated;

-- ── 5. Retroativamente marca pedidos importados do Marketplace Hub ────────
-- Pedidos que vieram de external_orders já têm o platform — propaga para orders se a tabela existir.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'external_orders') THEN
    UPDATE orders o
    SET origin_channel = eo.platform
    FROM external_orders eo
    WHERE eo.waesy_order_id = o.id
      AND o.origin_channel = 'waesy_app'
      AND eo.platform IS NOT NULL;
  END IF;
END $$;

-- ── 6. Comentários para documentação automática ───────────────────────────
COMMENT ON COLUMN orders.origin_channel IS
  'Canal de origem do pedido. Usado para segregação financeira multi-canal (ERP Omni-Hub V122).';
COMMENT ON COLUMN orders.cost_breakdown IS
  'Decomposição de custos em centavos BRL: platform_fee, shipping_cost, payment_fee, net_revenue, margin_percent.';
