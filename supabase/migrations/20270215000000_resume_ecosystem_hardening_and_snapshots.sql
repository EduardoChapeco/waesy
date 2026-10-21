-- 20270215000000_resume_ecosystem_hardening_and_snapshots.sql
-- Waesy Resume & Career Ecosystem Hardening:
-- 1. Snapshot imutável de currículo em candidaturas (job_applications.resume_snapshot)
-- 2. Tabela canônica de múltiplos currículos estruturados (resumes) com versionamento e RLS
-- 3. Transparência de integração LinkedIn e matching explicável

-- 1. Expansão de job_applications para snapshot imutável
ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS resume_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS matched_skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS missing_skills TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS match_score_percentage INT;

CREATE INDEX IF NOT EXISTS idx_job_apps_candidate ON public.job_applications(candidate_profile_id);
CREATE INDEX IF NOT EXISTS idx_job_apps_status ON public.job_applications(status);

-- 2. Tabela de Múltiplos Currículos Estruturados (resumes)
CREATE TABLE IF NOT EXISTS public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Currículo Principal',
  slug TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_public BOOLEAN NOT NULL DEFAULT false,
  template_id TEXT NOT NULL DEFAULT 'minimal',
  accent_color TEXT NOT NULL DEFAULT '#0f172a',
  font_family TEXT NOT NULL DEFAULT 'sans',
  spacing_density TEXT NOT NULL DEFAULT 'normal',
  show_photo BOOLEAN NOT NULL DEFAULT true,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT resumes_slug_profile_unique UNIQUE(profile_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_resumes_profile_id ON public.resumes(profile_id);
CREATE INDEX IF NOT EXISTS idx_resumes_is_default ON public.resumes(profile_id, is_default);

-- 3. RLS para resumes (Deny-by-default)
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resumes_owner_select" ON public.resumes;
CREATE POLICY "resumes_owner_select"
  ON public.resumes FOR SELECT
  USING (
    profile_id = auth.uid()
    OR is_public = true
  );

DROP POLICY IF EXISTS "resumes_owner_insert" ON public.resumes;
CREATE POLICY "resumes_owner_insert"
  ON public.resumes FOR INSERT
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "resumes_owner_update" ON public.resumes;
CREATE POLICY "resumes_owner_update"
  ON public.resumes FOR UPDATE
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

DROP POLICY IF EXISTS "resumes_owner_delete" ON public.resumes;
CREATE POLICY "resumes_owner_delete"
  ON public.resumes FOR DELETE
  USING (profile_id = auth.uid());
