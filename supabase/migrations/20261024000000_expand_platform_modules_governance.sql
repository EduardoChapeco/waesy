-- 1. Adiciona coluna category para segmentar governança por domínio
ALTER TABLE platform_modules_config 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'store_operation';

-- 2. Atualiza os módulos existentes para a categoria public_discovery
UPDATE platform_modules_config 
SET category = 'public_discovery'
WHERE module_key IN ('classificados', 'noticias', 'ofertas', 'mercado', 'diretorio', 'convite', 'afiliados', 'turismo');

-- 3. Insere os módulos operacionais modernos de Workspace e IA
INSERT INTO platform_modules_config (module_key, name, description, enabled, is_public, badge, order_index, category, updated_at)
VALUES
  -- OPERAÇÃO DE LOJA (WORKSPACE)
  ('fiscal_nfe', 'Emissão Fiscal NF-e & NFC-e', 'Gestão de notas fiscais eletrônicas, integração SEFAZ, XMLs de lote e DANFE.', true, false, 'Fiscal', 100, 'store_operation', now()),
  ('wms_expedicao', 'WMS Expedição & Separação por Ondas', 'Módulo de conferência, bipagem ótica, geração de lotes de picking e romaneios de entrega.', true, false, 'Logística', 110, 'store_operation', now()),
  ('marketplaces_hub', 'Hub Omnicanal de Marketplaces', 'Sincronização bidirecional de estoque, preços e pedidos com Mercado Livre, iFood, Shopee e Amazon.', true, false, 'Omnichannel', 120, 'store_operation', now()),
  ('pdv_pos', 'Frente de Caixa Rápido & PDV Térmico', 'Operação de balcão com leitor ótico, split bill atômico e impressão térmica ESC/POS 80mm.', true, false, 'Varejo', 130, 'store_operation', now()),
  ('kds_gastronomy', 'KDS Gestor de Cozinha & Praças', 'Display de pedidos em tempo real para restaurantes com contagem de tempo de preparo e alertas sonoros.', true, false, 'Gastronomia', 140, 'store_operation', now()),
  ('juridico_contratos', 'JUS Gestão de Contratos & Assinaturas', 'Geração de minutas jurídicas, assinaturas digitais ICP-Brasil com hash SHA-256 e validade jurídica.', true, false, 'Jurídico', 150, 'store_operation', now()),
  ('logistica_pudo', 'Rede PUDO & Pontos de Retirada', 'Gestão de balcões parceiros para recebimento e entrega de encomendas com custódia tokenizada.', true, false, 'Entregas', 160, 'store_operation', now()),
  ('marketing_studio', 'Social Studio & Criador de Peças', 'Gerador de artes de vitrine com integração ao catálogo real e exportação vetorial em alta definição.', true, false, 'Marketing', 170, 'store_operation', now()),
  ('crm_turismo', 'Pipeline de Cotações & CRM de Viagens', 'Funil comercial de viagens, lâminas de orçamentos e captação de leads para agências de turismo.', true, false, 'Turismo', 180, 'store_operation', now()),
  ('suporte_helpdesk', 'Central de Chamados & Suporte Técnico', 'Gestão de tickets com SLA, anexos probatórios e histórico de atendimento para lojistas e clientes.', true, false, 'Suporte', 190, 'store_operation', now()),

  -- INTELIGÊNCIA & PROTOCOLOS DE IA
  ('simlab_econometrics', 'SimLab Econometria Preditiva', 'Simulador sintético de aceitação de produto e elasticidade de preço baseado no Censo IBGE 2022.', true, false, 'IA Preditiva', 200, 'ai_intelligence', now()),
  ('squad_content', 'Squad de Criação Editorial Multi-Agente', 'Orquestração autônoma de agentes (Aria, Bruno, Carla, Diego) para geração de narrativas e campanhas.', true, false, 'IA Criativa', 210, 'ai_intelligence', now()),
  ('webmcp_engine', 'Gateway WebMCP para Agentes Externos', 'Interface padronizada MCP para agentes de IA interagirem com segurança e limites contra abusos.', true, false, 'Protocolo MCP', 220, 'ai_intelligence', now())

ON CONFLICT (module_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  badge = EXCLUDED.badge,
  category = EXCLUDED.category,
  order_index = EXCLUDED.order_index,
  updated_at = now();
