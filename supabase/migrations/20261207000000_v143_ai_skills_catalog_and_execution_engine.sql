-- ============================================================
-- Migration: v143 - Declarative AI Skills Catalog & Router
-- Mapeamento de Skills como Dados e Execuções Auditáveis (Prompt 03)
-- ============================================================

-- 1. Tabela Principal de Catálogo de Skills
CREATE TABLE IF NOT EXISTS public.ai_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  trigger_explicit TEXT NOT NULL,
  when_not_to_use TEXT,
  category TEXT NOT NULL, -- 'conteudo', 'design', 'marketing', 'dados', 'financeiro', 'juridico', 'atendimento', 'nichos'
  niche TEXT, -- 'geral', 'turismo', 'imobiliario', 'automotivo', 'restaurante', 'moda'
  scope TEXT NOT NULL DEFAULT 'workspace', -- 'global', 'workspace', 'user'
  icon TEXT NOT NULL DEFAULT 'Sparkles',
  estimated_cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000500,
  is_system BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_skills_category_niche ON public.ai_skills(category, niche, is_active);

-- 2. Tabela de Versões da Skill
CREATE TABLE IF NOT EXISTS public.ai_skill_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES public.ai_skills(id) ON DELETE CASCADE,
  version TEXT NOT NULL DEFAULT '1.0.0',
  content JSONB NOT NULL, -- { input_schema, output_schema, numbered_procedure, hard_rules, anti_patterns, definition_of_done, quality_rubric }
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changelog TEXT,
  quality_score NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  status TEXT NOT NULL DEFAULT 'published', -- 'draft', 'published', 'deprecated'
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ai_skill_version UNIQUE (skill_id, version)
);

-- 3. Tabela de Ferramentas Permitidas por Skill
CREATE TABLE IF NOT EXISTS public.ai_skill_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES public.ai_skills(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  tool_description TEXT NOT NULL,
  tool_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  permissions_required TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabela de Ativação e Configuração de Skills por Usuário
CREATE TABLE IF NOT EXISTS public.user_skill_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.ai_skills(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  priority INT NOT NULL DEFAULT 1,
  custom_tone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_skill UNIQUE (user_id, skill_id)
);

-- 5. Tabela de Ativação de Skills por Workspace (Loja)
CREATE TABLE IF NOT EXISTS public.workspace_skill_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  skill_id UUID NOT NULL REFERENCES public.ai_skills(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  custom_instructions TEXT,
  budget_limit_cents INT NOT NULL DEFAULT 5000,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_workspace_skill UNIQUE (store_id, skill_id)
);

-- 6. Tabela de Registro de Execuções de Skills (Skill Runs)
CREATE TABLE IF NOT EXISTS public.ai_skill_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID NOT NULL REFERENCES public.ai_skills(id) ON DELETE CASCADE,
  version_id UUID REFERENCES public.ai_skill_versions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  trigger_context TEXT NOT NULL,
  selection_reason TEXT,
  inputs JSONB NOT NULL,
  outputs JSONB,
  tokens_used INT NOT NULL DEFAULT 0,
  cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0.000000,
  latency_ms INT NOT NULL DEFAULT 0,
  user_rating INT, -- 1 a 5 estrelas
  accepted BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_skill_runs_store_skill ON public.ai_skill_runs(store_id, skill_id, created_at DESC);

-- 7. Seed Inicial de Skills Canônicas do Catálogo
INSERT INTO public.ai_skills (slug, name, description, trigger_explicit, when_not_to_use, category, niche, icon, estimated_cost_usd)
VALUES
  ('commercial_proposal', 'Proposta Comercial Estruturada', 'Redige propostas formais de vendas com escopo e valores', 'Quando o usuário pedir para gerar, criar ou montar proposta de orçamento, proposta comercial ou precificação para cliente', 'Não use para geração genérica de posts em redes sociais', 'marketing', 'geral', 'FileText', 0.0008),
  ('receipt_organizer', 'Organizador de Comprovantes & Recibos', 'Extrai e estrutura valores, datas e beneficiários de comprovantes fiscais', 'Quando houver upload ou texto de recibo, nota fiscal, comprovante pix ou fatura para lançar no caixa', 'Não use para criar faturas do zero', 'financeiro', 'geral', 'Receipt', 0.0006),
  ('lead_qualifier_sdr', 'Qualificador de Leads SDR', 'Analisa dados de contato e conversa para pontuar a intenção de compra do cliente', 'Quando uma mensagem de lead entrar no chat ou formulário e for necessário identificar perfil de compra', 'Não use para emitir contratos', 'atendimento', 'geral', 'UserCheck', 0.0004),
  ('contract_reviewer', 'Revisor de Contratos e Riscos', 'Identifica cláusulas de multa abusiva, foro e rescisão em contratos', 'Quando o usuário submeter um contrato em texto ou PDF para análise de riscos legais', 'Não use para redigir peças processuais judiciais', 'juridico', 'geral', 'ShieldAlert', 0.0012),
  ('tourism_itinerary_builder', 'Construtor de Roteiros de Turismo', 'Elabora itinerários diários otimizados com hotéis, voos e passeios', 'Quando o usuário pedir roteiro de viagem, pacote turístico ou opções de destinos', 'Não use para compra direta de bilhete aéreo sem confirmação humana', 'nichos', 'turismo', 'Compass', 0.0009),
  ('real_estate_appraiser', 'Descritivo Imobiliário & Vistoria', 'Cria fichas atraentes para imóveis destacando metragem e atributos', 'Quando for cadastrar ou aprimorar anúncio de casa, apartamento ou lote no catálogo', 'Não use para calcular financiamento bancário complexo', 'nichos', 'imobiliario', 'Home', 0.0005),
  ('ad_copywriter', 'Copywriter de Anúncios Multicanal', 'Escreve copies com gatilhos de persuasão para Meta, Google e WhatsApp', 'Quando o lojista solicitar copies para campanha de tráfego pago ou promoção', 'Não use para contratos ou termos jurídicos', 'marketing', 'geral', 'Megaphone', 0.0005),
  ('support_auto_responder', 'Auto-Atendimento de Suporte', 'Responde dúvidas frequentes de clientes sobre pedidos e prazos', 'Quando o cliente perguntar sobre rastreamento, status de pedido ou trocas', 'Não use se o cliente solicitar cancelamento com estorno imediato (transborde)', 'atendimento', 'geral', 'Bot', 0.0003),
  ('accessibility_checker', 'Auditor de Acessibilidade & UI', 'Verifica contrastes e padrões de conformidade WCAG AA', 'Quando o desenvolvedor ou designer auditar páginas de vitrine ou componentes', 'Não use para escrever código de backend de banco', 'design', 'geral', 'Eye', 0.0006),
  ('inventory_forecaster', 'Previsão e Giro de Estoque', 'Calcula ritmo de vendas e alerta sobre necessidade de reposição', 'Quando o lojista abrir relatórios de estoque e pedir análise de reposição', 'Não use para calcular folha de pagamento de funcionários', 'dados', 'geral', 'TrendingUp', 0.0007)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  trigger_explicit = EXCLUDED.trigger_explicit,
  when_not_to_use = EXCLUDED.when_not_to_use,
  updated_at = now();

-- 8. Habilitar RLS
ALTER TABLE public.ai_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_skill_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_skill_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skill_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_skill_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_skill_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer usuário autenticado visualiza skills ativas"
  ON public.ai_skills FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Usuário gerencia suas próprias configurações de skill"
  ON public.user_skill_settings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Lojista gerencia skills do seu workspace"
  ON public.workspace_skill_settings FOR ALL TO authenticated
  USING (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Usuário visualiza suas próprias execuções de skill"
  ON public.ai_skill_runs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));
