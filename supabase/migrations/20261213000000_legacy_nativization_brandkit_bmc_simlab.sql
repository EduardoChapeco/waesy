-- ==============================================================================
-- 20261213000000_legacy_nativization_brandkit_bmc_simlab.sql
-- Nativização Canônica dos Módulos Legados: Brand Kit Completo,
-- Business Model Canvas (BMC 9 Blocos) e Populações Sintéticas Calibradas (SimLab)
-- ==============================================================================

-- 1. Extensão da Tabela brand_dna_profiles (Brand Kit Visual & Proveniência de IA)
ALTER TABLE public.brand_dna_profiles 
  ADD COLUMN IF NOT EXISTS typography JSONB NOT NULL DEFAULT '{"heading": "Inter", "body": "Inter", "mono": "JetBrains Mono"}'::jsonb,
  ADD COLUMN IF NOT EXISTS logos JSONB NOT NULL DEFAULT '{"main_url": null, "dark_url": null, "icon_url": null, "light_url": null}'::jsonb,
  ADD COLUMN IF NOT EXISTS visual_style JSONB NOT NULL DEFAULT '{"border_radius": "medium", "shadow": "none", "icon_set": "lucide"}'::jsonb,
  ADD COLUMN IF NOT EXISTS generated_by_job_id TEXT,
  ADD COLUMN IF NOT EXISTS ai_model TEXT,
  ADD COLUMN IF NOT EXISTS confidence NUMERIC(3, 2) DEFAULT 0.95,
  ADD COLUMN IF NOT EXISTS edited_by_human BOOLEAN NOT NULL DEFAULT false;

-- 2. Tabela Canônica: Business Model Canvas (BMC de 9 Blocos)
CREATE TABLE IF NOT EXISTS public.store_business_model_canvas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  key_partners JSONB NOT NULL DEFAULT '[]'::jsonb,
  key_activities JSONB NOT NULL DEFAULT '[]'::jsonb,
  key_resources JSONB NOT NULL DEFAULT '[]'::jsonb,
  value_propositions JSONB NOT NULL DEFAULT '[]'::jsonb,
  customer_relationships JSONB NOT NULL DEFAULT '[]'::jsonb,
  channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  customer_segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  cost_structure JSONB NOT NULL DEFAULT '[]'::jsonb,
  revenue_streams JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_by_job_id TEXT,
  ai_model TEXT,
  confidence NUMERIC(3, 2) DEFAULT 0.95,
  edited_by_human BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT uq_store_bmc UNIQUE (store_id)
);

CREATE INDEX IF NOT EXISTS idx_store_bmc_store_id ON public.store_business_model_canvas(store_id);

-- Ativação de RLS para o BMC
ALTER TABLE public.store_business_model_canvas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "store_staff_select_bmc" ON public.store_business_model_canvas
    FOR SELECT TO authenticated
    USING (public.is_store_staff(store_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "store_staff_insert_bmc" ON public.store_business_model_canvas
    FOR INSERT TO authenticated
    WITH CHECK (public.is_store_staff(store_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "store_staff_update_bmc" ON public.store_business_model_canvas
    FOR UPDATE TO authenticated
    USING (public.is_store_staff(store_id))
    WITH CHECK (public.is_store_staff(store_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Tabela Canônica: Arquétipos de Populações Sintéticas Calibradas (SimLab V2)
CREATE TABLE IF NOT EXISTS public.synthetic_population_archetypes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  gender TEXT NOT NULL,
  age INT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Brasil',
  state TEXT NOT NULL DEFAULT 'BR',
  abep_class TEXT NOT NULL DEFAULT 'C1',
  median_income_brl NUMERIC(10, 2) NOT NULL DEFAULT 3000.00,
  occupation TEXT NOT NULL DEFAULT 'Consumidor',
  psychography JSONB NOT NULL DEFAULT '{}'::jsonb,
  digital_behavior JSONB NOT NULL DEFAULT '{}'::jsonb,
  trigger_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  calibration JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.synthetic_population_archetypes
  ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT 'Brasil',
  ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT 'BR',
  ADD COLUMN IF NOT EXISTS abep_class TEXT NOT NULL DEFAULT 'C1',
  ADD COLUMN IF NOT EXISTS occupation TEXT NOT NULL DEFAULT 'Consumidor',
  ADD COLUMN IF NOT EXISTS psychography JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS digital_behavior JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS trigger_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS calibration JSONB NOT NULL DEFAULT '{}'::jsonb;

DO $$ BEGIN
  ALTER TABLE public.synthetic_population_archetypes ALTER COLUMN abep_social_class DROP NOT NULL;
  ALTER TABLE public.synthetic_population_archetypes ALTER COLUMN region DROP NOT NULL;
  ALTER TABLE public.synthetic_population_archetypes ALTER COLUMN education_level DROP NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_synthetic_pop_location ON public.synthetic_population_archetypes(state, city, abep_class);

-- Ativação de RLS para Personas Sintéticas (Catálogo Aberto para Usuários Autenticados)
ALTER TABLE public.synthetic_population_archetypes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "authenticated_select_synthetic_personas" ON public.synthetic_population_archetypes
    FOR SELECT TO authenticated
    USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4. Seed Canônico de Personas Brasileiras Calibradas (com Chapecó e Interior de SC/RS/PR)
INSERT INTO public.synthetic_population_archetypes (
  code, display_name, gender, age, city, state, abep_class, abep_social_class, region, education_level, median_income_brl, occupation,
  psychography, digital_behavior, trigger_scores, calibration
) VALUES
(
  'BR_F_52_INTERIOR_CONSERVADORA', 'Vera', 'female', 52, 'Chapecó', 'SC', 'C1', 'C1', 'Sul', 'Ensino Médio', 3200.00, 'Comerciante Local',
  '{"values": ["família", "tradição", "honestidade", "trabalho duro"], "fears": ["ser enganada", "endividamento", "produto sem garantia"], "aspirations": ["saúde da família", "estabilidade financeira"]}'::jsonb,
  '{"time_online": "2h/dia", "channels": ["whatsapp", "facebook", "youtube"], "formats": ["depoimentos reais", "fotos sem filtro", "áudio direto"], "payment": ["pix", "carnê", "boleto"]}'::jsonb,
  '{"urgency": 4, "social_proof": 10, "discount": 9, "hedonic": 3, "authority": 6, "friction": 5}'::jsonb,
  '{"cynicism": 9, "cognitive_need": 5, "financial_control": 8}'::jsonb
),
(
  'BR_F_30_MAE_CLASSE_MEDIA', 'Carla', 'female', 32, 'Porto Alegre', 'RS', 'B2', 'B2', 'Sul', 'Superior Completo', 5800.00, 'Analista Administrativa',
  '{"values": ["família", "segurança", "praticidade", "conforto"], "fears": ["má compra", "dívidas", "perda de emprego"], "aspirations": ["viagem em família", "escola melhor para os filhos"]}'::jsonb,
  '{"time_online": "3h/dia", "channels": ["instagram", "whatsapp", "pinterest"], "formats": ["reels", "carrosséis práticos", "avaliações de clientes"], "payment": ["cartão de crédito parcelado", "pix com desconto"]}'::jsonb,
  '{"urgency": 7, "social_proof": 9, "discount": 8, "hedonic": 5, "authority": 7, "friction": 7}'::jsonb,
  '{"cynicism": 6, "cognitive_need": 7, "financial_control": 6}'::jsonb
),
(
  'BR_M_42_GESTOR_ANALITICO', 'Rodrigo', 'male', 42, 'Curitiba', 'PR', 'A2', 'A2', 'Sul', 'Pós-Graduação', 14000.00, 'Gerente de Operações',
  '{"values": ["resultado", "eficiência", "dados comprovados", "estabilidade"], "fears": ["decisões erradas", "perda de tempo", "fornecedor amador"], "aspirations": ["diretoria executiva", "aposentadoria tranquila"]}'::jsonb,
  '{"time_online": "2h/dia", "channels": ["linkedin", "whatsapp", "portais de notícias"], "formats": ["relatórios", "comparativos técnicos", "estudos de caso"], "payment": ["cartão corporativo", "faturamento"]}'::jsonb,
  '{"urgency": 2, "social_proof": 5, "discount": 3, "hedonic": 3, "authority": 10, "friction": 8}'::jsonb,
  '{"cynicism": 10, "cognitive_need": 10, "financial_control": 9}'::jsonb
),
(
  'BR_M_26_EMPREENDEDOR_DIGITAL', 'Gabriel', 'male', 26, 'São Paulo', 'SP', 'B1', 'B1', 'Sudeste', 'Superior Incompleto', 7000.00, 'Criador & Empreendedor',
  '{"values": ["liberdade", "velocidade", "inovação", "crescimento rápido"], "fears": ["estagnação", "burocracia", "irrelevância"], "aspirations": ["escala de negócios", "independência geográfica"]}'::jsonb,
  '{"time_online": "5h/dia", "channels": ["instagram", "youtube", "twitter", "tiktok"], "formats": ["tutoriais", "threads", "demonstrações ao vivo"], "payment": ["cartão", "pix"]}'::jsonb,
  '{"urgency": 5, "social_proof": 6, "discount": 4, "hedonic": 6, "authority": 8, "friction": 9}'::jsonb,
  '{"cynicism": 8, "cognitive_need": 9, "financial_control": 7}'::jsonb
),
(
  'BR_M_38_PEQUENO_EMPRESARIO', 'Pedro', 'male', 38, 'São Miguel do Oeste', 'SC', 'B2', 'B2', 'Sul', 'Ensino Médio', 8000.00, 'Empresário do Varejo',
  '{"values": ["trabalho sério", "reputação na cidade", "resultado prático"], "fears": ["falência", "folha de pagamento atrasada", "crise regional"], "aspirations": ["abrir segunda filial", "paz financeira"]}'::jsonb,
  '{"time_online": "2h/dia", "channels": ["whatsapp", "instagram"], "formats": ["fotos de produto real", "vídeo no balcão", "depoimentos locais"], "payment": ["pix", "boleto faturado"]}'::jsonb,
  '{"urgency": 5, "social_proof": 8, "discount": 7, "hedonic": 3, "authority": 7, "friction": 8}'::jsonb,
  '{"cynicism": 8, "cognitive_need": 6, "financial_control": 8}'::jsonb
),
(
  'BR_F_21_GENZ_DIGITAL', 'Luana', 'female', 21, 'Florianópolis', 'SC', 'C1', 'C1', 'Sul', 'Superior Incompleto', 2200.00, 'Estudante Universitária',
  '{"values": ["autenticidade", "sustentabilidade", "experiências marcantes", "expressão pessoal"], "fears": ["marcas falsas ou apelativas", "falta de oportunidades"], "aspirations": ["intercâmbio", "trabalho remoto com propósito"]}'::jsonb,
  '{"time_online": "6h/dia", "channels": ["tiktok", "instagram", "threads"], "formats": ["vídeos curtos verticais", "conteúdo gerado por usuário (UGC)"], "payment": ["pix"]}'::jsonb,
  '{"urgency": 8, "social_proof": 9, "discount": 9, "hedonic": 8, "authority": 3, "friction": 9}'::jsonb,
  '{"cynicism": 7, "cognitive_need": 5, "financial_control": 4}'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  median_income_brl = EXCLUDED.median_income_brl,
  occupation = EXCLUDED.occupation,
  psychography = EXCLUDED.psychography,
  digital_behavior = EXCLUDED.digital_behavior,
  trigger_scores = EXCLUDED.trigger_scores,
  calibration = EXCLUDED.calibration;
