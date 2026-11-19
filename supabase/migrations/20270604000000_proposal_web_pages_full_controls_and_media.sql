-- =============================================================================
-- MIGRATION: 20270604000000_proposal_web_pages_full_controls_and_media.sql
-- OBJETIVO:
--   1. Estender public.proposal_web_pages com configuracoes estruturadas de
--      contagem regressiva real, vagas disponiveis, exibicao comercial/parcelas,
--      selos de confianca opt-in e exibicao do mapa aereo interativo.
--   2. Manter 100% idempotente (ADD COLUMN IF NOT EXISTS) preservando RLS estrito
--      (FORCE ROW LEVEL SECURITY + is_store_staff(store_id)).
-- =============================================================================

ALTER TABLE public.proposal_web_pages
  ADD COLUMN IF NOT EXISTS countdown_config JSONB NOT NULL DEFAULT '{"enabled":false,"mode":"proposal_valid_until"}'::jsonb,
  ADD COLUMN IF NOT EXISTS availability_config JSONB NOT NULL DEFAULT '{"enabled":false,"spots_remaining":null}'::jsonb,
  ADD COLUMN IF NOT EXISTS payment_display_config JSONB NOT NULL DEFAULT '{"show_pix":true,"show_card":true,"show_boleto":false,"show_financing":false,"show_installment_simulator":true}'::jsonb,
  ADD COLUMN IF NOT EXISTS trust_badges_config JSONB NOT NULL DEFAULT '{"agency_verified":true,"support_24h":false,"secure_payment":false,"free_rebooking":false,"cadastur_badge":false}'::jsonb,
  ADD COLUMN IF NOT EXISTS show_flight_route_map BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.proposal_web_pages.countdown_config IS
  'Configuracao de cronometro regressivo real (vinculado a valid_until ou prazo customizado).';
COMMENT ON COLUMN public.proposal_web_pages.availability_config IS
  'Configuracao opcional de vagas restantes informadas explicitamente pela agencia.';
COMMENT ON COLUMN public.proposal_web_pages.payment_display_config IS
  'Preferencias de exibicao de formas de pagamento (PIX, cartao, boleto, financiamento, simulador).';
COMMENT ON COLUMN public.proposal_web_pages.trust_badges_config IS
  'Selos de garantia marcados explicitamente pela agencia na proposta web.';
COMMENT ON COLUMN public.proposal_web_pages.show_flight_route_map IS
  'Exibe mapa geodetico interativo de rotas aereas e conexoes na proposta web e PDF.';
