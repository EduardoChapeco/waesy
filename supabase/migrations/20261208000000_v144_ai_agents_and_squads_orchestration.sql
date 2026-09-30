-- ============================================================
-- Migration: v144 - AI Autonomous Agents & Squads with Structured Handoff
-- Orquestração em Grafo, Governança de Escopo e FinOps (Prompt 04)
-- ============================================================

-- 1. Tabela Declarativa de Agentes Especialistas
CREATE TABLE IF NOT EXISTS public.ai_agent_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role_label TEXT NOT NULL,
  goal TEXT NOT NULL,
  data_scope TEXT[] NOT NULL DEFAULT ARRAY['general:read']::TEXT[],
  allowed_skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  allowed_tools TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  system_instruction TEXT NOT NULL,
  acceptance_criteria TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  stop_conditions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  tone_of_voice TEXT NOT NULL DEFAULT 'profissional_executivo',
  budget_limit_usd NUMERIC(10,6) NOT NULL DEFAULT 0.010000,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabela de Definições de Squads
CREATE TABLE IF NOT EXISTS public.ai_squad_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  goal TEXT NOT NULL,
  arbitration_policy TEXT NOT NULL DEFAULT 'supervisor_veto', -- 'supervisor_veto', 'consensus', 'fallback_human'
  max_execution_steps INT NOT NULL DEFAULT 6,
  max_cost_budget_usd NUMERIC(10,6) NOT NULL DEFAULT 0.050000,
  max_timeout_seconds INT NOT NULL DEFAULT 120,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Membros do Squad com Grafo de Ordem e Gatilhos
CREATE TABLE IF NOT EXISTS public.ai_squad_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES public.ai_squad_definitions(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.ai_agent_definitions(id) ON DELETE CASCADE,
  step_order INT NOT NULL DEFAULT 1,
  input_trigger_condition TEXT NOT NULL DEFAULT 'always',
  handoff_rule_description TEXT NOT NULL,
  required_output_schema JSONB DEFAULT '{}'::jsonb,
  is_entry_point BOOLEAN NOT NULL DEFAULT false,
  is_terminal_point BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_squad_agent_step UNIQUE (squad_id, step_order)
);

-- 4. Tabela de Execução de Squads (Squad Runs)
CREATE TABLE IF NOT EXISTS public.ai_squad_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_id UUID NOT NULL REFERENCES public.ai_squad_definitions(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'halted_by_supervisor'
  initial_payload JSONB NOT NULL,
  final_result JSONB,
  steps_completed INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  total_cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0.000000,
  duration_ms INT NOT NULL DEFAULT 0,
  supervisor_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

-- 5. Tabela de Handoffs entre Agentes (Audit Trail Forense)
CREATE TABLE IF NOT EXISTS public.ai_squad_handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  squad_run_id UUID NOT NULL REFERENCES public.ai_squad_runs(id) ON DELETE CASCADE,
  from_agent_id UUID REFERENCES public.ai_agent_definitions(id) ON DELETE SET NULL,
  to_agent_id UUID REFERENCES public.ai_agent_definitions(id) ON DELETE SET NULL,
  step_index INT NOT NULL,
  objective TEXT NOT NULL,
  context_passed JSONB NOT NULL,
  work_completed JSONB NOT NULL,
  work_remaining TEXT,
  restrictions JSONB,
  output_payload JSONB,
  cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0.000000,
  latency_ms INT NOT NULL DEFAULT 0,
  acceptance_verified BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Seed dos Agentes Canônicos
INSERT INTO public.ai_agent_definitions (slug, name, role_label, goal, system_instruction, acceptance_criteria, stop_conditions)
VALUES
  ('sdr_agent', 'SDR Qualificador de Leads', 'SDR & Triagem', 'Qualificar leads pelo framework BANT e identificar prontidão de compra', 'Você é o SDR inicial da empresa. Extraia dados de contato, necessidades e classifique o cliente com nota.', ARRAY['Score BANT calculado entre 1 e 100', 'Identificação clara da dor do lead'], ARRAY['Cliente solicitando estorno judicial', 'Ofensas ou linguagem ilícita']),
  ('commercial_closer', 'Executivo de Vendas & Propostas', 'Closer de Vendas', 'Montar proposta comercial completa e negociar condições de fechamento', 'Você é o consultor de vendas sênior. Com base na qualificação do SDR, elabore proposta executiva atraente.', ARRAY['Escopo de entregáveis delimitado', 'Tabela de investimentos detalhada'], ARRAY['Margem de desconto solicitada acima de 30%']),
  ('content_strategist', 'Estrategista de Pauta & Briefing', 'Content Planner', 'Planejar pautas, personas e ganchos de alta conversão', 'Você é o estrategista de conteúdo. Defina a proposta editorial, público-alvo e estrutura da narrativa.', ARRAY['Público-alvo definido', 'Gancho emocional estabelecido'], ARRAY['Falta de tema ou nicho indicado']),
  ('brand_copywriter', 'Copywriter Publicitário', 'Copywriter', 'Redigir textos persuasivos multicanal seguindo a voz da marca', 'Você é o copywriter publicitário. Escreva copies engajantes para redes sociais e anúncios.', ARRAY['Mínimo de 2 opções de títulos', 'Chamada para ação clara'], ARRAY['Alegações médicas ou promessas enganosas']),
  ('quality_compliance_auditor', 'Auditor de Qualidade e Compliance', 'Auditor de Qualidade', 'Validar ortografia, integridade de marca e ausência de alucinações', 'Você é o auditor implacável. Inspecione o material contra o briefing original e aprove ou rejeite.', ARRAY['Texto sem erros gramaticais', 'Conformidade com a LGPD e termos de marca'], ARRAY['Mais de 2 alucinações de dados factuais']),
  ('document_ocr_extractor', 'Extrator de Comprovantes & Notas', 'Extrator OCR', 'Digitalizar e estruturar comprovantes fiscais com precisão contábil', 'Você é o analista fiscal de entrada. Extraia datas, valores, CNPJ e linhas digitáveis.', ARRAY['Valor numérico extraído com centavos', 'Data de liquidação válida'], ARRAY['Comprovante totalmente ilegível ou rasurado']),
  ('bank_reconciliator', 'Conciliador Financeiro', 'Conciliador', 'Cruzar documentos com lançamentos de caixa e apontar sobras ou faltas', 'Você é o auditor financeiro de conciliação. Valide se os valores batem com pedidos e extratos.', ARRAY['Diferença entre comprovante e sistema documentada', 'Classificação contábil definida'], ARRAY['Divergência injustificada superior a R$ 1.000'])
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  role_label = EXCLUDED.role_label,
  goal = EXCLUDED.goal,
  system_instruction = EXCLUDED.system_instruction,
  updated_at = now();

-- 7. Seed dos Squads Canônicos
INSERT INTO public.ai_squad_definitions (slug, name, description, goal, max_execution_steps, max_cost_budget_usd)
VALUES
  ('sales_squad', 'Squad de Vendas & SDR', 'Prospecção, qualificação BANT e emissão de proposta comercial de alta conversão', 'Transformar leads em propostas prontas para fechamento', 3, 0.015000),
  ('publishing_squad', 'Squad de Publicação & Conteúdo', 'Briefing de pauta, redação publicitária e auditoria rigorosa de qualidade', 'Produzir material pronto para publicação com zero defeitos', 3, 0.015000),
  ('finance_squad', 'Squad Financeiro & Conciliação', 'Extração de comprovantes, conferência de extratos e conciliação de caixa', 'Garantir fidedignidade dos lançamentos contábeis', 2, 0.012000)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  goal = EXCLUDED.goal,
  updated_at = now();

-- 8. Habilitar RLS
ALTER TABLE public.ai_agent_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_squad_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_squad_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_squad_handoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários autenticados visualizam definições de agentes e squads"
  ON public.ai_agent_definitions FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Usuários autenticados visualizam definições de squads"
  ON public.ai_squad_definitions FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Usuários autenticados visualizam membros de squads"
  ON public.ai_squad_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuários autenticados gerenciam suas execuções de squad"
  ON public.ai_squad_runs FOR ALL TO authenticated
  USING (user_id = auth.uid() OR store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()))
  WITH CHECK (user_id = auth.uid() OR store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Usuários autenticados visualizam handoffs de suas execuções"
  ON public.ai_squad_handoffs FOR SELECT TO authenticated
  USING (squad_run_id IN (SELECT id FROM public.ai_squad_runs WHERE user_id = auth.uid() OR store_id IN (SELECT store_id FROM public.profiles WHERE id = auth.uid())));
