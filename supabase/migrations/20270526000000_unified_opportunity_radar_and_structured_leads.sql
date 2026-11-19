-- ============================================================================
-- MIGRATION: Unified Opportunity Radar, Child Simulation & Structured Leads
-- Spec: SPEC-20261116-OPPORTUNITY-RADAR-AND-STRUCTURED-LEADS-E2E
-- Invariante: 100% ADITIVA, ZERO-LOSS, ZERO DEPRECACAO, IDEMPOTENTE
-- ============================================================================

-- 1. Estruturar leads_crm sem alterar/apagar nenhuma coluna ou registro legado
ALTER TABLE public.leads_crm
  ADD COLUMN IF NOT EXISTS destination_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS period_tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS target_months TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS flexibility_days INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS date_flexibility_mode TEXT NOT NULL DEFAULT 'unspecified',
  ADD COLUMN IF NOT EXISTS room_occupancies JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS children_ages INTEGER[] NOT NULL DEFAULT '{}'::integer[],
  ADD COLUMN IF NOT EXISTS raw_intent_markdown TEXT,
  ADD COLUMN IF NOT EXISTS intent_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_matched_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_leads_crm_destination_tags_gin
  ON public.leads_crm USING GIN (destination_tags);

CREATE INDEX IF NOT EXISTS idx_leads_crm_target_months_gin
  ON public.leads_crm USING GIN (target_months);

CREATE INDEX IF NOT EXISTS idx_leads_crm_store_last_matched
  ON public.leads_crm (store_id, last_matched_at DESC NULLS LAST);

-- 2. Estruturar travel_interests para compatibilizacao total com leads e quartos
ALTER TABLE public.travel_interests
  ADD COLUMN IF NOT EXISTS destination_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS period_tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS flexibility_days INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS room_occupancies JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS raw_intent_markdown TEXT,
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads_crm(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_travel_interests_lead_id
  ON public.travel_interests (store_id, lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_travel_interests_destination_tags_gin
  ON public.travel_interests USING GIN (destination_tags);

-- 3. Metadados de ocupacao, aereo/transfer e gateway em travel_proposals
ALTER TABLE public.travel_proposals
  ADD COLUMN IF NOT EXISTS origin_iata TEXT,
  ADD COLUMN IF NOT EXISTS destination_iata TEXT,
  ADD COLUMN IF NOT EXISTS rooms_count INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS children_ages INTEGER[] NOT NULL DEFAULT '{}'::integer[],
  ADD COLUMN IF NOT EXISTS airfare_per_adult_cents BIGINT,
  ADD COLUMN IF NOT EXISTS transfer_per_adult_cents BIGINT;

-- 4. Unificar travel_opportunities para armazenar matches de Propostas, Capturas, Cotacoes e Pacotes
ALTER TABLE public.travel_opportunities
  ADD COLUMN IF NOT EXISTS source_proposal_id UUID REFERENCES public.travel_proposals(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS source_quote_id UUID,
  ADD COLUMN IF NOT EXISTS source_classified_id UUID,
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'quote_capture',
  ADD COLUMN IF NOT EXISTS target_lead_id UUID REFERENCES public.leads_crm(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS target_interest_id UUID REFERENCES public.travel_interests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS offer_title TEXT,
  ADD COLUMN IF NOT EXISTS destination_city TEXT,
  ADD COLUMN IF NOT EXISTS departure_date DATE,
  ADD COLUMN IF NOT EXISTS adults_count INTEGER,
  ADD COLUMN IF NOT EXISTS children_count INTEGER,
  ADD COLUMN IF NOT EXISTS requires_child_requote BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS simulated_total_cents BIGINT,
  ADD COLUMN IF NOT EXISTS child_simulation JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS historical_check JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS already_proposed_recently BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS warnings TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS match_tier TEXT NOT NULL DEFAULT 'strong_match',
  ADD COLUMN IF NOT EXISTS match_version TEXT NOT NULL DEFAULT 'unified_v2';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'travel_opportunities'
       AND column_name = 'capture_id'
       AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.travel_opportunities ALTER COLUMN capture_id DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'travel_opportunities'
       AND column_name = 'demand_id'
       AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.travel_opportunities ALTER COLUMN demand_id DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'travel_opportunities'
       AND column_name = 'client_budget_cents'
       AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE public.travel_opportunities ALTER COLUMN client_budget_cents DROP NOT NULL;
    ALTER TABLE public.travel_opportunities ALTER COLUMN client_budget_cents SET DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.table_constraints
     WHERE table_schema = 'public'
       AND table_name = 'travel_opportunities'
       AND constraint_name = 'fk_travel_opportunities_source_quote'
  ) THEN
    ALTER TABLE public.travel_opportunities
      ADD CONSTRAINT fk_travel_opportunities_source_quote
      FOREIGN KEY (source_quote_id) REFERENCES public.travel_quotes(id) ON DELETE CASCADE;
  END IF;
END
$$;

ALTER TABLE public.travel_opportunities
  DROP CONSTRAINT IF EXISTS chk_travel_opportunities_target;

ALTER TABLE public.travel_opportunities
  ADD CONSTRAINT chk_travel_opportunities_target
  CHECK (demand_id IS NOT NULL OR lead_id IS NOT NULL OR target_lead_id IS NOT NULL OR target_interest_id IS NOT NULL);

-- Remover indices parciais antigos (singular e plural) e criar indices unicos completos (NULLS DISTINCT no Postgres)
-- para compatibilidade nativa com ON CONFLICT (...) gerado pelo PostgREST (.upsert)
DROP INDEX IF EXISTS public.uq_travel_opportunity_demand_capture;
DROP INDEX IF EXISTS public.uq_travel_opportunities_demand_capture;
CREATE UNIQUE INDEX IF NOT EXISTS uq_travel_opportunities_demand_capture
  ON public.travel_opportunities (demand_id, capture_id);

DROP INDEX IF EXISTS public.uq_travel_opportunity_lead_capture;
DROP INDEX IF EXISTS public.uq_travel_opportunities_lead_capture;
CREATE UNIQUE INDEX IF NOT EXISTS uq_travel_opportunities_lead_capture
  ON public.travel_opportunities (lead_id, capture_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_travel_opportunities_proposal_lead
  ON public.travel_opportunities (store_id, source_proposal_id, target_lead_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_travel_opportunities_proposal_interest
  ON public.travel_opportunities (store_id, source_proposal_id, target_interest_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_travel_opportunities_quote_lead
  ON public.travel_opportunities (store_id, source_quote_id, target_lead_id);

CREATE INDEX IF NOT EXISTS idx_travel_opportunities_target_lead
  ON public.travel_opportunities (store_id, target_lead_id, match_score DESC)
  WHERE target_lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_travel_opportunities_source_proposal
  ON public.travel_opportunities (store_id, source_proposal_id)
  WHERE source_proposal_id IS NOT NULL;

-- 5. Enriquecer travel_opportunity_matches para compatibilidade bidirecional e simulacao infantil
ALTER TABLE public.travel_opportunity_matches
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads_crm(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS requires_child_requote BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS simulated_total_cents BIGINT,
  ADD COLUMN IF NOT EXISTS child_simulation JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS historical_check JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS already_proposed_recently BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS warnings TEXT[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS match_tier TEXT NOT NULL DEFAULT 'strong_match',
  ADD COLUMN IF NOT EXISTS match_version TEXT NOT NULL DEFAULT 'unified_v2';

CREATE INDEX IF NOT EXISTS idx_travel_opp_matches_lead_id
  ON public.travel_opportunity_matches (store_id, lead_id)
  WHERE lead_id IS NOT NULL;

-- 6. Backfill 100% nao destrutivo e idempotente dos registros existentes em producao
DO $$
DECLARE
  has_pax_adults BOOLEAN;
  has_pax_children BOOLEAN;
  pax_ages_type TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads_crm' AND column_name = 'pax_adults'
  ) INTO has_pax_adults;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads_crm' AND column_name = 'pax_children'
  ) INTO has_pax_children;

  SELECT data_type
    INTO pax_ages_type
    FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = 'leads_crm' AND column_name = 'pax_ages'
   LIMIT 1;

  -- Backfill de destination_tags preservando destination intacta
  UPDATE public.leads_crm
     SET destination_tags = jsonb_build_array(
       jsonb_build_object(
         'label', trim(destination),
         'normalized', lower(trim(destination)),
         'source', 'free_text'
       )
     )
   WHERE destination IS NOT NULL
     AND length(trim(destination)) > 0
     AND destination_tags = '[]'::jsonb;

  -- Backfill de children_ages respeitando tipo real de pax_ages em producao (ARRAY, jsonb ou text)
  IF pax_ages_type = 'ARRAY' THEN
    UPDATE public.leads_crm l
       SET children_ages = COALESCE(
         (
           SELECT array_agg(elem::integer)
             FROM unnest(l.pax_ages::text[]) AS elem
            WHERE elem ~ '^\d{1,2}$' AND elem::integer BETWEEN 0 AND 17
         ),
         '{}'::integer[]
       )
     WHERE l.pax_ages IS NOT NULL
       AND COALESCE(array_length(l.children_ages, 1), 0) = 0;
  ELSIF pax_ages_type IS NOT NULL THEN
    UPDATE public.leads_crm l
       SET children_ages = COALESCE(
         (
           SELECT array_agg(m[1]::integer)
             FROM regexp_matches(COALESCE(l.pax_ages::text, ''), '\d{1,2}', 'g') AS m
            WHERE m[1]::integer BETWEEN 0 AND 17
         ),
         '{}'::integer[]
       )
     WHERE l.pax_ages IS NOT NULL
       AND length(trim(l.pax_ages::text)) > 0
       AND COALESCE(array_length(l.children_ages, 1), 0) = 0;
  END IF;

  -- Backfill de room_occupancies a partir dos contadores existentes
  IF has_pax_adults AND has_pax_children THEN
    UPDATE public.leads_crm
       SET room_occupancies = jsonb_build_array(
         jsonb_build_object(
           'roomNumber', 1,
           'roomLabel', 'Quarto 1',
           'adultsCount', GREATEST(1, COALESCE(pax_adults, 2)),
           'childrenCount', GREATEST(0, COALESCE(pax_children, COALESCE(array_length(children_ages, 1), 0))),
           'childrenAges', to_jsonb(COALESCE(children_ages, '{}'::integer[]))
         )
       )
     WHERE room_occupancies = '[]'::jsonb
       AND (pax_adults IS NOT NULL OR pax_children IS NOT NULL OR COALESCE(array_length(children_ages, 1), 0) > 0);
  END IF;

  -- Backfill de travel_interests.destination_tags a partir do array destinations TEXT[]
  UPDATE public.travel_interests ti
     SET destination_tags = COALESCE(
       (
         SELECT jsonb_agg(
           jsonb_build_object(
             'label', d,
             'normalized', lower(trim(d)),
             'source', 'free_text'
           )
         )
           FROM unnest(ti.destinations) AS d
          WHERE length(trim(d)) > 0
       ),
       '[]'::jsonb
     )
   WHERE ti.destination_tags = '[]'::jsonb
     AND COALESCE(array_length(ti.destinations, 1), 0) > 0;

  -- Sincronizar target_lead_id em travel_opportunities legadas preservando 100% dos matches
  UPDATE public.travel_opportunities
     SET target_lead_id = lead_id
   WHERE target_lead_id IS NULL
     AND lead_id IS NOT NULL;
END
$$;
