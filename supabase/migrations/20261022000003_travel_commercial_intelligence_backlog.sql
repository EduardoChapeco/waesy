-- ==============================================================================
-- MIGRAÇÃO: SISTEMA DE INTELIGÊNCIA COMERCIAL E MEMÓRIA DE OPORTUNIDADES (TURISMO)
-- Tabelas: travel_commercial_contacts, travel_interests, travel_opportunity_matches
-- Data: 2026-10-21
-- Idempotente, não-destrutiva, com isolamento multi-tenant RLS estrito.
-- ==============================================================================

-- 1. TABELA: travel_commercial_contacts (Identidade Pré-CRM Leve)
CREATE TABLE IF NOT EXISTS public.travel_commercial_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  instagram_handle TEXT,
  city TEXT,
  preferred_channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (preferred_channel IN ('whatsapp', 'phone', 'instagram', 'email')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'nurturing', 'unresponsive', 'promoted_to_crm', 'opted_out')),
  notes TEXT,
  linked_crm_lead_id UUID REFERENCES public.leads_crm(id) ON DELETE SET NULL,
  linked_customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para busca rápida e deduplicação de contato por loja e telefone
CREATE INDEX IF NOT EXISTS idx_travel_comm_contacts_store_phone
  ON public.travel_commercial_contacts(store_id, phone);

CREATE INDEX IF NOT EXISTS idx_travel_comm_contacts_store_status
  ON public.travel_commercial_contacts(store_id, status);

-- 2. TABELA: travel_interests (Memória Comercial e Intenção de Viagem Anual)
CREATE TABLE IF NOT EXISTS public.travel_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.travel_commercial_contacts(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  destinations TEXT[] NOT NULL DEFAULT '{}',
  destination_categories TEXT[] DEFAULT '{}',
  preferred_origins TEXT[] DEFAULT '{}',
  dates JSONB NOT NULL DEFAULT '{}'::jsonb,
  party JSONB NOT NULL DEFAULT '{}'::jsonb,
  budget JSONB NOT NULL DEFAULT '{}'::jsonb,
  inclusions_wanted TEXT[] DEFAULT '{}',
  hotel_preferences JSONB DEFAULT '{}'::jsonb,
  urgency TEXT NOT NULL DEFAULT 'moderate' CHECK (urgency IN ('immediate', 'moderate', 'exploring', 'future_trip')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched', 'nurturing', 'dormant', 'converted', 'cancelled')),
  source_inquiry_text TEXT,
  source_quote_id UUID REFERENCES public.travel_quotes(id) ON DELETE SET NULL,
  captured_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '180 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices GIN e B-Tree para alta performance em queries de matching
CREATE INDEX IF NOT EXISTS idx_travel_interests_destinations
  ON public.travel_interests USING GIN (destinations);

CREATE INDEX IF NOT EXISTS idx_travel_interests_inclusions
  ON public.travel_interests USING GIN (inclusions_wanted);

CREATE INDEX IF NOT EXISTS idx_travel_interests_store_status
  ON public.travel_interests(store_id, status);

CREATE INDEX IF NOT EXISTS idx_travel_interests_contact
  ON public.travel_interests(contact_id);

CREATE INDEX IF NOT EXISTS idx_travel_interests_expires_at
  ON public.travel_interests(expires_at);

-- 3. TABELA: travel_opportunity_matches (Matches Determinísticos Oferta x Interesse)
CREATE TABLE IF NOT EXISTS public.travel_opportunity_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  interest_id UUID NOT NULL REFERENCES public.travel_interests(id) ON DELETE CASCADE,
  offer_id UUID NOT NULL REFERENCES public.classifieds(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.travel_commercial_contacts(id) ON DELETE CASCADE,
  match_score NUMERIC NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  is_high_priority BOOLEAN NOT NULL DEFAULT false,
  dimensions JSONB NOT NULL DEFAULT '[]'::jsonb,
  approach_draft TEXT NOT NULL,
  offer_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'approached', 'engaged', 'promoted_to_crm', 'dismissed')),
  interaction_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  matched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_opportunity_match_interest_offer UNIQUE (interest_id, offer_id)
);

CREATE INDEX IF NOT EXISTS idx_opportunity_matches_store_score
  ON public.travel_opportunity_matches(store_id, match_score DESC);

CREATE INDEX IF NOT EXISTS idx_opportunity_matches_store_status
  ON public.travel_opportunity_matches(store_id, status);

CREATE INDEX IF NOT EXISTS idx_opportunity_matches_offer
  ON public.travel_opportunity_matches(offer_id);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) — ZERO TRUST MULTI-TENANT ISOLATION
-- ==============================================================================
ALTER TABLE public.travel_commercial_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_opportunity_matches ENABLE ROW LEVEL SECURITY;

-- Políticas para travel_commercial_contacts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'travel_commercial_contacts' AND policyname = 'travel_commercial_contacts_staff_all'
  ) THEN
    CREATE POLICY travel_commercial_contacts_staff_all ON public.travel_commercial_contacts
      FOR ALL
      USING (
        store_id IN (
          SELECT store_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'seller', 'support')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'travel_interests' AND policyname = 'travel_interests_staff_all'
  ) THEN
    CREATE POLICY travel_interests_staff_all ON public.travel_interests
      FOR ALL
      USING (
        store_id IN (
          SELECT store_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'seller', 'support')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'travel_opportunity_matches' AND policyname = 'travel_opportunity_matches_staff_all'
  ) THEN
    CREATE POLICY travel_opportunity_matches_staff_all ON public.travel_opportunity_matches
      FOR ALL
      USING (
        store_id IN (
          SELECT store_id FROM public.profiles WHERE id = auth.uid() AND role IN ('owner', 'admin', 'manager', 'seller', 'support')
        )
      );
  END IF;
END $$;
