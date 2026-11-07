-- ==============================================================================
-- Waesy CRM & Tourism — Migration 20270321000000:
-- Travel Proposals Customer Link, Lead Activity Integrity and Forensic Audit RLS
-- ==============================================================================

-- 1. Garante que public.travel_proposals possui customer_id e lead_id com FKs
ALTER TABLE public.travel_proposals
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers_crm(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lead_id UUID REFERENCES public.leads_crm(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_travel_proposals_customer_id
  ON public.travel_proposals(customer_id) WHERE customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_travel_proposals_lead_id
  ON public.travel_proposals(lead_id) WHERE lead_id IS NOT NULL;

-- 2. Garante que a inserção de auditoria forense por links públicos de consentimento é permitida
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'forensic_audit_events' AND policyname = 'Anyone can insert forensic audit events'
  ) THEN
    CREATE POLICY "Anyone can insert forensic audit events"
      ON public.forensic_audit_events
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;
