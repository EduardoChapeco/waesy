-- =============================================================================
-- MIGRATION: 20270614000000_proposal_web_pages_sticky_card_ai_and_gateway.sql
-- OBJETIVO:
--   1. Estender public.proposal_web_pages com suporte a:
--      - Card comercial sticky que acompanha o scroll no desktop.
--      - Chat automático com IA na proposta web (drawer estilo Instagram/Workspace).
--      - Ativação de botões rápidos de WhatsApp e telefone direto.
--      - Conexão e habilitação de gateway online / link de pagamento por pacote.
--      - Disclaimer legal de simulação de cotação e tarifas flutuantes.
--      - Carrossel de pacotes turísticos relacionados e banner promocional de rodapé.
--   2. Manter 100% idempotente (ADD COLUMN IF NOT EXISTS) e RLS estrito.
-- =============================================================================

ALTER TABLE public.proposal_web_pages
  ADD COLUMN IF NOT EXISTS sticky_card_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_advisor_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_advisor_prompt TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_button_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT,
  ADD COLUMN IF NOT EXISTS allow_online_gateway_payment BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_gateway_url TEXT,
  ADD COLUMN IF NOT EXISTS show_simulation_disclaimer BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS simulation_disclaimer_text TEXT,
  ADD COLUMN IF NOT EXISTS show_related_packages BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS related_packages_title TEXT,
  ADD COLUMN IF NOT EXISTS promo_banner_url TEXT,
  ADD COLUMN IF NOT EXISTS promo_banner_link TEXT;

COMMENT ON COLUMN public.proposal_web_pages.sticky_card_enabled IS
  'Define se o card comercial acompanha a rolagem da pagina web no desktop (estilo classificados de turismo).';
COMMENT ON COLUMN public.proposal_web_pages.ai_advisor_enabled IS
  'Habilita o drawer inteligente de IA para o cliente tirar duvidas do roteiro na proposta web.';
COMMENT ON COLUMN public.proposal_web_pages.allow_online_gateway_payment IS
  'Permite que o cliente realize pagamento online via gateway integrado ou link de pagamento da agencia.';
COMMENT ON COLUMN public.proposal_web_pages.show_simulation_disclaimer IS
  'Exibe aviso juridico de simulacao orcamentaria e tarifas aereas/hoteleiras sujeitas a confirmacao.';
COMMENT ON COLUMN public.proposal_web_pages.show_related_packages IS
  'Exibe carrossel de outros pacotes e destinos recomendados da agencia ao final da proposta web.';
