-- ============================================================================
-- MIGRATION: 20270213000000_corporate_travel_os_consolidation.sql
-- DESCRIÇÃO: Consolidação e Expansão End-to-End do Turismo & Viagens Corporativas Waesy
-- NORMAS: AGENTS.md (B.1 a B.41), DESIGN.md, SPEC-TURISMO-CORPORATIVO-TRAVELOS-CONSOLIDATION
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. HABILITAÇÃO DA AGÊNCIA CORPORATIVA PELO ADMIN MASTER (GATE DE SEGURANÇA)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agency_corporate_travel_capability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended', 'revoked')),
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  commercial_notes TEXT,
  allowed_capabilities JSONB NOT NULL DEFAULT '["flight", "hotel", "car", "bus", "transfer", "insurance", "package"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_corporate_travel_capability_store 
  ON public.agency_corporate_travel_capability(store_id, status);

ALTER TABLE public.agency_corporate_travel_capability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agency_corporate_travel_capability_read_all" ON public.agency_corporate_travel_capability;
CREATE POLICY "agency_corporate_travel_capability_read_all"
  ON public.agency_corporate_travel_capability
  FOR SELECT
  TO authenticated, anon
  USING (true);

DROP POLICY IF EXISTS "agency_corporate_travel_capability_staff_write" ON public.agency_corporate_travel_capability;
CREATE POLICY "agency_corporate_travel_capability_staff_write"
  ON public.agency_corporate_travel_capability
  FOR ALL
  TO authenticated
  USING (public.is_store_staff(store_id))
  WITH CHECK (public.is_store_staff(store_id));

-- ----------------------------------------------------------------------------
-- 2. VÍNCULO EMPRESA ↔ AGÊNCIA (CORPORATE TRAVEL ACCOUNT)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.corporate_travel_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended', 'cancelled')),
  primary_account_manager_id UUID REFERENCES public.profiles(id),
  support_phone TEXT,
  support_whatsapp TEXT,
  support_email TEXT,
  contract_id UUID,
  policy_id UUID,
  billing_profile_id UUID,
  autonomy_matrix JSONB NOT NULL DEFAULT '{"air_domestic": "SELF_BOOK", "air_international": "BOOK_REQUIRES_AGENCY", "hotel": "SELF_BOOK", "car": "SELF_BOOK", "bus": "SELF_BOOK", "group": "BOOK_REQUIRES_AGENCY"}'::jsonb,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, agency_id)
);

CREATE INDEX IF NOT EXISTS idx_corporate_travel_accounts_company ON public.corporate_travel_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_corporate_travel_accounts_agency ON public.corporate_travel_accounts(agency_id);

ALTER TABLE public.corporate_travel_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "corporate_travel_accounts_parties_access" ON public.corporate_travel_accounts;
CREATE POLICY "corporate_travel_accounts_parties_access"
  ON public.corporate_travel_accounts
  FOR ALL
  TO authenticated
  USING (
    public.is_store_staff(company_id) OR public.is_store_staff(agency_id)
  )
  WITH CHECK (
    public.is_store_staff(company_id) OR public.is_store_staff(agency_id)
  );

-- ----------------------------------------------------------------------------
-- 3. MEMBROS CORPORATIVOS & RBAC
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.corporate_travel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.corporate_travel_accounts(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'TRAVELER' CHECK (role IN (
    'TRAVEL_ADMIN', 'TRAVEL_MANAGER', 'TRAVEL_BOOKER', 'TRAVELER', 'APPROVER', 'FINANCE', 'AUDITOR', 'VIEWER', 'EXTERNAL_TRAVELER'
  )),
  permissions JSONB NOT NULL DEFAULT '{"can_search": true, "can_quote": true, "can_request": true}'::jsonb,
  department TEXT,
  cost_center TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_corporate_travel_members_account ON public.corporate_travel_members(account_id);
CREATE INDEX IF NOT EXISTS idx_corporate_travel_members_profile ON public.corporate_travel_members(profile_id);

ALTER TABLE public.corporate_travel_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "corporate_travel_members_access" ON public.corporate_travel_members;
CREATE POLICY "corporate_travel_members_access"
  ON public.corporate_travel_members
  FOR ALL
  TO authenticated
  USING (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.corporate_travel_accounts a
      WHERE a.id = account_id AND (public.is_store_staff(a.company_id) OR public.is_store_staff(a.agency_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.corporate_travel_accounts a
      WHERE a.id = account_id AND (public.is_store_staff(a.company_id) OR public.is_store_staff(a.agency_id))
    )
  );

-- ----------------------------------------------------------------------------
-- 4. CADASTRO DE VIAJANTES (TRAVELER PROFILES) & COFRE DE DOCUMENTOS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.traveler_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  social_name TEXT,
  document_type TEXT NOT NULL DEFAULT 'cpf',
  document_number TEXT NOT NULL,
  passport_number TEXT,
  passport_expiry DATE,
  passport_issuing_country TEXT DEFAULT 'BRA',
  nationality TEXT DEFAULT 'Brasileira',
  birth_date DATE,
  phone TEXT,
  email TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  seat_preference TEXT DEFAULT 'window' CHECK (seat_preference IN ('window', 'aisle', 'any')),
  meal_preference TEXT DEFAULT 'standard',
  special_needs TEXT,
  loyalty_programs JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_traveler_profiles_company ON public.traveler_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_traveler_profiles_profile ON public.traveler_profiles(profile_id);

ALTER TABLE public.traveler_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "traveler_profiles_access" ON public.traveler_profiles;
CREATE POLICY "traveler_profiles_access"
  ON public.traveler_profiles
  FOR ALL
  TO authenticated
  USING (
    profile_id = auth.uid() OR public.is_store_staff(company_id)
  )
  WITH CHECK (
    profile_id = auth.uid() OR public.is_store_staff(company_id)
  );

CREATE TABLE IF NOT EXISTS public.traveler_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traveler_id UUID NOT NULL REFERENCES public.traveler_profiles(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('passport', 'rg', 'cnh', 'visa', 'authorization', 'corporate_letter', 'vaccine', 'other')),
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  doc_number TEXT,
  issuing_country TEXT,
  issued_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'expiring_soon', 'expired', 'review_needed')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_traveler_documents_traveler ON public.traveler_documents(traveler_id);

ALTER TABLE public.traveler_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "traveler_documents_access" ON public.traveler_documents;
CREATE POLICY "traveler_documents_access"
  ON public.traveler_documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.traveler_profiles tp
      WHERE tp.id = traveler_id AND (tp.profile_id = auth.uid() OR public.is_store_staff(tp.company_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.traveler_profiles tp
      WHERE tp.id = traveler_id AND (tp.profile_id = auth.uid() OR public.is_store_staff(tp.company_id))
    )
  );

-- ----------------------------------------------------------------------------
-- 5. PROJETOS DE VIAGEM (TRAVEL PROJECTS), TASKS E TIMELINE VIVA
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.travel_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  purpose TEXT,
  owner_id UUID REFERENCES public.profiles(id),
  manager_id UUID REFERENCES public.profiles(id),
  start_date DATE,
  end_date DATE,
  budget_cents BIGINT NOT NULL DEFAULT 0,
  committed_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  cost_center TEXT,
  department TEXT,
  project_code TEXT,
  visibility TEXT NOT NULL DEFAULT 'public_company' CHECK (visibility IN ('public_company', 'restricted')),
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_projects_company ON public.travel_projects(company_id);
CREATE INDEX IF NOT EXISTS idx_travel_projects_agency ON public.travel_projects(agency_id);

ALTER TABLE public.travel_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_projects_parties_access" ON public.travel_projects;
CREATE POLICY "travel_projects_parties_access"
  ON public.travel_projects
  FOR ALL
  TO authenticated
  USING (
    public.is_store_staff(company_id) OR public.is_store_staff(agency_id)
  )
  WITH CHECK (
    public.is_store_staff(company_id) OR public.is_store_staff(agency_id)
  );

-- Extensões em tourism_trips e trip_passengers sem duplicar entidades
ALTER TABLE public.tourism_trips
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.travel_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS booker_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_corporate BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tourism_trips_project ON public.tourism_trips(project_id);
CREATE INDEX IF NOT EXISTS idx_tourism_trips_company ON public.tourism_trips(company_id);

ALTER TABLE public.trip_passengers
  ADD COLUMN IF NOT EXISTS traveler_profile_id UUID REFERENCES public.traveler_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_trip_passengers_traveler_profile ON public.trip_passengers(traveler_profile_id);

CREATE TABLE IF NOT EXISTS public.travel_project_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.travel_projects(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.tourism_trips(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assignee_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_project_tasks_project ON public.travel_project_tasks(project_id);

ALTER TABLE public.travel_project_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_project_tasks_access" ON public.travel_project_tasks;
CREATE POLICY "travel_project_tasks_access"
  ON public.travel_project_tasks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.travel_projects tp
      WHERE tp.id = project_id AND (public.is_store_staff(tp.company_id) OR public.is_store_staff(tp.agency_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.travel_projects tp
      WHERE tp.id = project_id AND (public.is_store_staff(tp.company_id) OR public.is_store_staff(tp.agency_id))
    )
  );

CREATE TABLE IF NOT EXISTS public.travel_project_timeline_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.travel_projects(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.tourism_trips(id) ON DELETE SET NULL,
  time_start TIMESTAMPTZ NOT NULL,
  time_end TIMESTAMPTZ,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('flight', 'hotel', 'car', 'meeting', 'meal', 'task', 'note', 'transfer', 'activity')),
  place_name TEXT,
  place_address TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  external_place_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  traveler_ids UUID[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_project_timeline_items_project ON public.travel_project_timeline_items(project_id, time_start);

ALTER TABLE public.travel_project_timeline_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_project_timeline_items_access" ON public.travel_project_timeline_items;
CREATE POLICY "travel_project_timeline_items_access"
  ON public.travel_project_timeline_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.travel_projects tp
      WHERE tp.id = project_id AND (public.is_store_staff(tp.company_id) OR public.is_store_staff(tp.agency_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.travel_projects tp
      WHERE tp.id = project_id AND (public.is_store_staff(tp.company_id) OR public.is_store_staff(tp.agency_id))
    )
  );

-- ----------------------------------------------------------------------------
-- 6. MOTOR DE POLÍTICAS DE VIAGEM E FLUXO DE APROVAÇÕES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.travel_policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL DEFAULT 'Política Padrão de Viagens',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
  rules_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_travel_policy_versions_company ON public.travel_policy_versions(company_id, status);

ALTER TABLE public.travel_policy_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_policy_versions_access" ON public.travel_policy_versions;
CREATE POLICY "travel_policy_versions_access"
  ON public.travel_policy_versions
  FOR ALL
  TO authenticated
  USING (public.is_store_staff(company_id))
  WITH CHECK (public.is_store_staff(company_id));

CREATE TABLE IF NOT EXISTS public.travel_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.tourism_trips(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.travel_projects(id) ON DELETE SET NULL,
  requester_id UUID NOT NULL REFERENCES public.profiles(id),
  booker_id UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'auto_approved')),
  total_amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  lowest_logical_fare_cents BIGINT,
  selected_fare_cents BIGINT,
  policy_violation_reasons TEXT[] NOT NULL DEFAULT '{}',
  justification TEXT,
  fare_expires_at TIMESTAMPTZ NOT NULL,
  approver_profile_id UUID REFERENCES public.profiles(id),
  delegated_from_profile_id UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_approval_requests_company ON public.travel_approval_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_travel_approval_requests_trip ON public.travel_approval_requests(trip_id);

ALTER TABLE public.travel_approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_approval_requests_access" ON public.travel_approval_requests;
CREATE POLICY "travel_approval_requests_access"
  ON public.travel_approval_requests
  FOR ALL
  TO authenticated
  USING (
    requester_id = auth.uid() OR
    booker_id = auth.uid() OR
    approver_profile_id = auth.uid() OR
    public.is_store_staff(company_id) OR
    public.is_store_staff(agency_id)
  )
  WITH CHECK (
    requester_id = auth.uid() OR
    booker_id = auth.uid() OR
    approver_profile_id = auth.uid() OR
    public.is_store_staff(company_id) OR
    public.is_store_staff(agency_id)
  );

-- ----------------------------------------------------------------------------
-- 7. LIVRO-RAZÃO DE CRÉDITOS DE BILHETES AÉREOS (NÃO É $WZ, NÃO É CASHBACK)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.air_ticket_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traveler_id UUID NOT NULL REFERENCES public.traveler_profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  airline TEXT NOT NULL,
  original_pnr TEXT NOT NULL,
  original_ticket_number TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  original_amount_cents BIGINT NOT NULL,
  remaining_amount_cents BIGINT NOT NULL,
  valid_from DATE NOT NULL,
  expires_at DATE NOT NULL,
  transferable BOOLEAN NOT NULL DEFAULT false,
  owner_rule TEXT NOT NULL DEFAULT 'strictly_passenger',
  fare_rule_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'partially_used', 'fully_used', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_air_ticket_credits_traveler ON public.air_ticket_credits(traveler_id, status);
CREATE INDEX IF NOT EXISTS idx_air_ticket_credits_company ON public.air_ticket_credits(company_id);
CREATE INDEX IF NOT EXISTS idx_air_ticket_credits_agency ON public.air_ticket_credits(agency_id);

ALTER TABLE public.air_ticket_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "air_ticket_credits_access" ON public.air_ticket_credits;
CREATE POLICY "air_ticket_credits_access"
  ON public.air_ticket_credits
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.traveler_profiles tp
      WHERE tp.id = traveler_id AND (tp.profile_id = auth.uid() OR public.is_store_staff(agency_id) OR (company_id IS NOT NULL AND public.is_store_staff(company_id)))
    )
  )
  WITH CHECK (
    public.is_store_staff(agency_id) OR (company_id IS NOT NULL AND public.is_store_staff(company_id))
  );

-- ----------------------------------------------------------------------------
-- 8. FATURAMENTO CORPORATIVO, LIMITES DE CRÉDITO E CONCILIAÇÃO
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.corporate_credit_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  credit_limit_cents BIGINT NOT NULL DEFAULT 0,
  available_limit_cents BIGINT NOT NULL DEFAULT 0,
  reserved_limit_cents BIGINT NOT NULL DEFAULT 0,
  payment_terms_days INTEGER NOT NULL DEFAULT 30 CHECK (payment_terms_days IN (15, 30, 45, 60, 90)),
  billing_cycle TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('weekly', 'biweekly', 'monthly')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'under_review')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, agency_id)
);

ALTER TABLE public.corporate_credit_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "corporate_credit_profiles_access" ON public.corporate_credit_profiles;
CREATE POLICY "corporate_credit_profiles_access"
  ON public.corporate_credit_profiles
  FOR ALL
  TO authenticated
  USING (
    public.is_store_staff(company_id) OR public.is_store_staff(agency_id)
  )
  WITH CHECK (
    public.is_store_staff(company_id) OR public.is_store_staff(agency_id)
  );

CREATE TABLE IF NOT EXISTS public.corporate_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  due_date DATE NOT NULL,
  subtotal_cents BIGINT NOT NULL DEFAULT 0,
  fees_cents BIGINT NOT NULL DEFAULT 0,
  total_amount_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'paid', 'overdue', 'cancelled')),
  pdf_url TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (agency_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_corporate_invoices_company ON public.corporate_invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_corporate_invoices_agency ON public.corporate_invoices(agency_id);

ALTER TABLE public.corporate_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "corporate_invoices_access" ON public.corporate_invoices;
CREATE POLICY "corporate_invoices_access"
  ON public.corporate_invoices
  FOR ALL
  TO authenticated
  USING (
    public.is_store_staff(company_id) OR public.is_store_staff(agency_id)
  )
  WITH CHECK (
    public.is_store_staff(agency_id)
  );

CREATE TABLE IF NOT EXISTS public.corporate_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.corporate_invoices(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.tourism_trips(id) ON DELETE SET NULL,
  project_id UUID REFERENCES public.travel_projects(id) ON DELETE SET NULL,
  traveler_id UUID REFERENCES public.traveler_profiles(id) ON DELETE SET NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('flight', 'hotel', 'car', 'bus', 'fee', 'insurance', 'other')),
  description TEXT NOT NULL,
  locator_code TEXT,
  ticket_number TEXT,
  cost_center TEXT,
  department TEXT,
  amount_cents BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corporate_invoice_items_invoice ON public.corporate_invoice_items(invoice_id);

ALTER TABLE public.corporate_invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "corporate_invoice_items_access" ON public.corporate_invoice_items;
CREATE POLICY "corporate_invoice_items_access"
  ON public.corporate_invoice_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.corporate_invoices inv
      WHERE inv.id = invoice_id AND (public.is_store_staff(inv.company_id) OR public.is_store_staff(inv.agency_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.corporate_invoices inv
      WHERE inv.id = invoice_id AND public.is_store_staff(inv.agency_id)
    )
  );

CREATE TABLE IF NOT EXISTS public.travel_reconciliation_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider_code TEXT NOT NULL,
  booking_ref TEXT NOT NULL,
  discrepancy_type TEXT NOT NULL CHECK (discrepancy_type IN ('unmatched_charge', 'missing_invoice', 'amount_mismatch', 'refund_missing', 'double_charge')),
  provider_amount_cents BIGINT NOT NULL DEFAULT 0,
  waesy_amount_cents BIGINT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'waived')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_travel_reconciliation_cases_agency ON public.travel_reconciliation_cases(agency_id, status);

ALTER TABLE public.travel_reconciliation_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "travel_reconciliation_cases_access" ON public.travel_reconciliation_cases;
CREATE POLICY "travel_reconciliation_cases_access"
  ON public.travel_reconciliation_cases
  FOR ALL
  TO authenticated
  USING (
    public.is_store_staff(company_id) OR public.is_store_staff(agency_id)
  )
  WITH CHECK (
    public.is_store_staff(agency_id)
  );

COMMIT;
