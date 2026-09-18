-- 20261106000000_central_knowledge_professions_services_holidays_demographics.sql
-- Bancos Centralizados de Profissões (CBO/Salários), Serviços sob Demanda, Feriados/Marketing e Demografia IBGE

-- ── 1. BANCO DE PROFISSÕES & MÉDIAS SALARIAIS (CBO / MTE) ──
CREATE TABLE IF NOT EXISTS public.professions_catalog (
  id TEXT PRIMARY KEY,
  cbo_code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  required_education TEXT NOT NULL,
  technical_body TEXT,
  standard_workload_hours_weekly INTEGER NOT NULL DEFAULT 44,
  hiring_regimes TEXT[] NOT NULL DEFAULT ARRAY['CLT']::TEXT[],
  average_salary_junior_cents INTEGER NOT NULL,
  average_salary_mid_cents INTEGER NOT NULL,
  average_salary_senior_cents INTEGER NOT NULL,
  average_salary_lead_cents INTEGER NOT NULL,
  hourly_rate_benchmark_cents INTEGER NOT NULL,
  essential_skills TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  behavioral_competencies TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  market_demand_level TEXT NOT NULL DEFAULT 'alta',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_professions_catalog_cbo ON public.professions_catalog(cbo_code);
CREATE INDEX IF NOT EXISTS idx_professions_catalog_category ON public.professions_catalog(category);
CREATE INDEX IF NOT EXISTS idx_professions_catalog_title ON public.professions_catalog USING gin(to_tsvector('portuguese', title));

ALTER TABLE public.professions_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "professions_catalog_public_read" ON public.professions_catalog;
CREATE POLICY "professions_catalog_public_read" ON public.professions_catalog
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "professions_catalog_admin_write" ON public.professions_catalog;
CREATE POLICY "professions_catalog_admin_write" ON public.professions_catalog
  FOR ALL USING (
    auth.jwt()->>'role' = 'service_role' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

-- ── 2. BANCO DE SERVIÇOS SOB DEMANDA & FREELANCERS (GETNINJAS / WORKANA / 99FREELAS) ──
CREATE TABLE IF NOT EXISTS public.on_demand_services_catalog (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT NOT NULL,
  description TEXT NOT NULL,
  pricing_unit TEXT NOT NULL DEFAULT 'projeto',
  estimated_min_price_cents INTEGER NOT NULL DEFAULT 0,
  estimated_avg_price_cents INTEGER NOT NULL DEFAULT 0,
  estimated_max_price_cents INTEGER NOT NULL DEFAULT 0,
  estimated_delivery_days INTEGER NOT NULL DEFAULT 1,
  popular_tools_or_materials TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  suggested_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_on_demand_services_category ON public.on_demand_services_catalog(category);
CREATE INDEX IF NOT EXISTS idx_on_demand_services_name ON public.on_demand_services_catalog USING gin(to_tsvector('portuguese', name));

ALTER TABLE public.on_demand_services_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "on_demand_services_public_read" ON public.on_demand_services_catalog;
CREATE POLICY "on_demand_services_public_read" ON public.on_demand_services_catalog
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "on_demand_services_admin_write" ON public.on_demand_services_catalog;
CREATE POLICY "on_demand_services_admin_write" ON public.on_demand_services_catalog
  FOR ALL USING (
    auth.jwt()->>'role' = 'service_role' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

-- ── 3. BANCO DE FERIADOS & CALENDÁRIO EDITORIAL DE MARKETING ──
CREATE TABLE IF NOT EXISTS public.holidays_calendar (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date_rule TEXT NOT NULL,
  type TEXT NOT NULL,
  is_official_holiday BOOLEAN NOT NULL DEFAULT true,
  commercial_impact TEXT NOT NULL DEFAULT 'medio',
  surge_multiplier_suggested NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  target_retail_sectors TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  description TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'nacional',
  state_code TEXT,
  city_name TEXT,
  campaign_lead_days INTEGER DEFAULT 7,
  marketing_theme TEXT,
  suggested_promotional_actions TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_holidays_calendar_scope ON public.holidays_calendar(scope);
CREATE INDEX IF NOT EXISTS idx_holidays_calendar_state_city ON public.holidays_calendar(state_code, city_name);

ALTER TABLE public.holidays_calendar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "holidays_calendar_public_read" ON public.holidays_calendar;
CREATE POLICY "holidays_calendar_public_read" ON public.holidays_calendar
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "holidays_calendar_admin_write" ON public.holidays_calendar;
CREATE POLICY "holidays_calendar_admin_write" ON public.holidays_calendar
  FOR ALL USING (
    auth.jwt()->>'role' = 'service_role' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

-- ── 4. BANCO DE PERFIS DEMOGRÁFICOS IBGE & MACRORREGIÕES ──
CREATE TABLE IF NOT EXISTS public.demographic_profiles_ibge (
  id TEXT PRIMARY KEY,
  region TEXT NOT NULL,
  economic_class TEXT NOT NULL,
  population_estimate BIGINT NOT NULL DEFAULT 0,
  percentage_of_brazil NUMERIC(5,2) NOT NULL DEFAULT 0.0,
  median_monthly_income_cents INTEGER NOT NULL DEFAULT 0,
  discretionary_budget_percentage INTEGER NOT NULL DEFAULT 10,
  primary_payment_methods TEXT[] NOT NULL DEFAULT ARRAY['pix']::TEXT[],
  top_interests TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_demographic_profiles_region ON public.demographic_profiles_ibge(region);
CREATE INDEX IF NOT EXISTS idx_demographic_profiles_class ON public.demographic_profiles_ibge(economic_class);

ALTER TABLE public.demographic_profiles_ibge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demographic_profiles_public_read" ON public.demographic_profiles_ibge;
CREATE POLICY "demographic_profiles_public_read" ON public.demographic_profiles_ibge
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "demographic_profiles_admin_write" ON public.demographic_profiles_ibge;
CREATE POLICY "demographic_profiles_admin_write" ON public.demographic_profiles_ibge
  FOR ALL USING (
    auth.jwt()->>'role' = 'service_role' OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );
