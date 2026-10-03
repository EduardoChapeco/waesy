-- SPEC-AUDIT-FORENSIC-SANEAMENTO-GERAL / REQ-EARS-09
-- Formulários de lead para anunciantes civis (pessoa física sem loja).

-- 1. Tenant opcional: civil não possui store_id
ALTER TABLE public.lead_forms ALTER COLUMN store_id DROP NOT NULL;
ALTER TABLE public.lead_form_submissions ALTER COLUMN store_id DROP NOT NULL;
ALTER TABLE public.lead_form_submissions ALTER COLUMN form_id DROP NOT NULL;

-- 2. Posse civil
ALTER TABLE public.lead_forms
  ADD COLUMN IF NOT EXISTS author_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS classified_id uuid REFERENCES public.classifieds(id) ON DELETE SET NULL;

ALTER TABLE public.lead_form_submissions
  ADD COLUMN IF NOT EXISTS author_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lead_forms_author ON public.lead_forms(author_profile_id);
CREATE INDEX IF NOT EXISTS idx_lead_forms_classified ON public.lead_forms(classified_id);
CREATE INDEX IF NOT EXISTS idx_lead_submissions_author ON public.lead_form_submissions(author_profile_id);

-- 3. Invariante: todo formulário pertence a uma loja OU a um autor civil
ALTER TABLE public.lead_forms DROP CONSTRAINT IF EXISTS lead_forms_owner_check;
ALTER TABLE public.lead_forms
  ADD CONSTRAINT lead_forms_owner_check CHECK (store_id IS NOT NULL OR author_profile_id IS NOT NULL);

-- 4. RLS: autor civil gerencia seus formulários e lê os leads recebidos
DROP POLICY IF EXISTS "Civil authors manage own lead_forms" ON public.lead_forms;
CREATE POLICY "Civil authors manage own lead_forms" ON public.lead_forms
  FOR ALL TO authenticated
  USING (store_id IS NULL AND author_profile_id = (SELECT auth.uid()))
  WITH CHECK (store_id IS NULL AND author_profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Civil authors read own lead submissions" ON public.lead_form_submissions;
CREATE POLICY "Civil authors read own lead submissions" ON public.lead_form_submissions
  FOR SELECT TO authenticated
  USING (author_profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Civil authors update own lead submissions" ON public.lead_form_submissions;
CREATE POLICY "Civil authors update own lead submissions" ON public.lead_form_submissions
  FOR UPDATE TO authenticated
  USING (author_profile_id = (SELECT auth.uid()))
  WITH CHECK (author_profile_id = (SELECT auth.uid()));
