-- Migration: 20261023000000_platform_growth_metrics_and_financial_targets.sql
-- Description: Tabelas para monitoramento executivo de Metas Estratégicas vs Dados Reais da Waesy Platform.
-- RLS Deny-by-Default com acesso restrito a Platform Admins.

CREATE TABLE IF NOT EXISTS public.platform_growth_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    stage_order INT NOT NULL DEFAULT 1,
    target_stores INT NOT NULL DEFAULT 0,
    target_clients INT NOT NULL DEFAULT 0,
    target_mrr_cents BIGINT NOT NULL DEFAULT 0,
    target_arr_cents BIGINT NOT NULL DEFAULT 0,
    target_gmv_monthly_cents BIGINT NOT NULL DEFAULT 0,
    target_expenses_monthly_cents BIGINT NOT NULL DEFAULT 0,
    target_investments_cents BIGINT NOT NULL DEFAULT 0,
    target_conversion_rate NUMERIC(5,2) NOT NULL DEFAULT 3.50,
    target_valuation_conservative_cents BIGINT NOT NULL DEFAULT 0,
    target_valuation_strategic_cents BIGINT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_financial_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entry_type TEXT NOT NULL CHECK (entry_type IN ('expense', 'investment', 'revenue_adjustment')),
    category TEXT NOT NULL,
    amount_cents BIGINT NOT NULL,
    description TEXT NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    receipt_url TEXT,
    recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_platform_growth_targets_order ON public.platform_growth_targets(stage_order ASC);
CREATE INDEX IF NOT EXISTS idx_platform_financial_records_date ON public.platform_financial_records(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_platform_financial_records_type ON public.platform_financial_records(entry_type);

-- RLS Deny-by-Default
ALTER TABLE public.platform_growth_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_financial_records ENABLE ROW LEVEL SECURITY;

-- Helper RLS check para Platform Admin
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'platform_growth_targets' 
        AND policyname = 'platform_admin_growth_targets_all'
    ) THEN
        CREATE POLICY platform_admin_growth_targets_all ON public.platform_growth_targets
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role = 'platform_admin'
                )
            );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'platform_financial_records' 
        AND policyname = 'platform_admin_financial_records_all'
    ) THEN
        CREATE POLICY platform_admin_financial_records_all ON public.platform_financial_records
            FOR ALL
            USING (
                EXISTS (
                    SELECT 1 FROM public.profiles
                    WHERE profiles.id = auth.uid()
                    AND profiles.role = 'platform_admin'
                )
            );
    END IF;
END $$;

-- SEED: Inserir as 3 metas estratégicas canônicas de crescimento
INSERT INTO public.platform_growth_targets (
    period_key,
    label,
    stage_order,
    target_stores,
    target_clients,
    target_mrr_cents,
    target_arr_cents,
    target_gmv_monthly_cents,
    target_expenses_monthly_cents,
    target_investments_cents,
    target_conversion_rate,
    target_valuation_conservative_cents,
    target_valuation_strategic_cents,
    notes
) VALUES 
(
    'fase_1_500_stores',
    'Fase 1: Ignição Extremo Oeste (500 Lojas / 10k Clientes)',
    1,
    500,
    10000,
    12550000, -- R$ 125.500,00 MRR
    150600000, -- R$ 1.506.000,00 ARR
    150000000, -- R$ 1.500.000,00 GMV
    5724000,   -- R$ 57.240,00 custos operacionais
    15000000,  -- R$ 150.000,00 investimento inicial
    3.80,
    650000000, -- R$ 6,5M Valuation
    900000000, -- R$ 9,0M Valuation
    'Foco no polo São Miguel do Oeste e canal corporativo com 1.000 clientes imediatos.'
),
(
    'fase_2_1000_stores',
    'Fase 2: Tração Eixo BR-282 (1.000 Lojas / 20k Clientes)',
    2,
    1000,
    20000,
    25200000, -- R$ 252.000,00 MRR
    302400000, -- R$ 3.024.000,00 ARR
    300000000, -- R$ 3.000.000,00 GMV
    11496000,  -- R$ 114.960,00 custos operacionais
    35000000,  -- R$ 350.000,00 reinvestimento
    4.20,
    1650000000, -- R$ 16,5M Valuation
    2100000000, -- R$ 21,0M Valuation
    'Expansão Maravilha, Pinhalzinho e Chapecó. Penetração Zucchetti/Pollen Parque.'
),
(
    'fase_3_5000_stores_100k_clients',
    'Fase 3: Hiperescala Macro-Regional (5.000 Lojas / 100k Clientes)',
    3,
    5000,
    100000,
    125000000, -- R$ 1.250.000,00 MRR
    1500000000, -- R$ 15.000.000,00 ARR
    1500000000, -- R$ 15.000.000,00 GMV
    54500000,   -- R$ 545.000,00 custos operacionais
    150000000,  -- R$ 1.500.000,00 captação/expansão
    4.50,
    8250000000, -- R$ 82,5M Valuation
    12000000000, -- R$ 120,0M Valuation
    'Consolidação de todo o Grande Oeste de SC, Sudoeste do PR e Noroeste do RS. Série B / Exit Estratégico.'
)
ON CONFLICT (period_key) DO UPDATE SET
    label = EXCLUDED.label,
    target_stores = EXCLUDED.target_stores,
    target_clients = EXCLUDED.target_clients,
    target_mrr_cents = EXCLUDED.target_mrr_cents,
    target_arr_cents = EXCLUDED.target_arr_cents,
    target_gmv_monthly_cents = EXCLUDED.target_gmv_monthly_cents,
    target_expenses_monthly_cents = EXCLUDED.target_expenses_monthly_cents,
    target_valuation_conservative_cents = EXCLUDED.target_valuation_conservative_cents,
    target_valuation_strategic_cents = EXCLUDED.target_valuation_strategic_cents,
    updated_at = now();
