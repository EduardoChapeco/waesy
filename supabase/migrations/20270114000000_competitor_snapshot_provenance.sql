-- Proveniência explícita para snapshots do Market Radar.
-- Linhas antigas permanecem marcadas como não verificadas; nenhum conteúdo é inventado.
ALTER TABLE public.competitor_snapshots
  ALTER COLUMN screenshot_url DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS analysis_status TEXT NOT NULL DEFAULT 'legacy_unverified',
  ADD COLUMN IF NOT EXISTS source_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_provider TEXT,
  ADD COLUMN IF NOT EXISTS ai_model TEXT;

ALTER TABLE public.competitor_snapshots
  DROP CONSTRAINT IF EXISTS competitor_snapshots_analysis_status_check;

ALTER TABLE public.competitor_snapshots
  ADD CONSTRAINT competitor_snapshots_analysis_status_check
  CHECK (analysis_status IN ('legacy_unverified', 'ai_generated_draft', 'human_reviewed'));

COMMENT ON COLUMN public.competitor_snapshots.analysis_status IS
  'Proveniência do snapshot; legacy_unverified não significa verificado por pessoa.';
COMMENT ON COLUMN public.competitor_snapshots.source_evidence IS
  'Fonte pública capturada e limites da evidência utilizada na análise.';
COMMENT ON COLUMN public.competitor_snapshots.ai_provider IS
  'Provedor informado pelo gateway para esta análise, quando disponível.';
COMMENT ON COLUMN public.competitor_snapshots.ai_model IS
  'Modelo informado pelo gateway para esta análise, quando disponível.';
