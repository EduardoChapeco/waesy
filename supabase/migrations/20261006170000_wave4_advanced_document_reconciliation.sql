-- ============================================================================
-- Onda 4: reconciliação documental avançada e projeção auditável
-- Mantém extrações originais imutáveis; decisões vivem em projeções append-only.
-- ============================================================================

ALTER TABLE public.travel_document_conflicts
  ADD COLUMN IF NOT EXISTS reconciliation_run_id UUID,
  ADD COLUMN IF NOT EXISTS suggested_source_kind TEXT,
  ADD COLUMN IF NOT EXISTS precedence_rule TEXT,
  ADD COLUMN IF NOT EXISTS suggestion_reason TEXT,
  ADD COLUMN IF NOT EXISTS resolver_version TEXT NOT NULL DEFAULT 'travel-conflicts-v2';

CREATE TABLE IF NOT EXISTS public.travel_document_reconciliation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.tourism_trips(id) ON DELETE SET NULL,
  operation_key TEXT NOT NULL,
  source_ingestion_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'analyzed' CHECK (status IN ('analyzed', 'partially_resolved', 'resolved', 'blocked')),
  conflict_count INTEGER NOT NULL DEFAULT 0 CHECK (conflict_count >= 0),
  unresolved_critical_count INTEGER NOT NULL DEFAULT 0 CHECK (unresolved_critical_count >= 0),
  resolver_version TEXT NOT NULL DEFAULT 'travel-conflicts-v2',
  canonical_projection JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, operation_key)
);

CREATE TABLE IF NOT EXISTS public.travel_document_reconciliation_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  reconciliation_run_id UUID NOT NULL REFERENCES public.travel_document_reconciliation_runs(id) ON DELETE CASCADE,
  conflict_id UUID NOT NULL REFERENCES public.travel_document_conflicts(id) ON DELETE CASCADE,
  field_path TEXT NOT NULL,
  resolution_type TEXT NOT NULL CHECK (resolution_type IN ('source', 'custom', 'dismiss')),
  source_ingestion_id UUID REFERENCES public.travel_document_ingestions(id) ON DELETE SET NULL,
  resolved_value JSONB,
  resolution_id UUID REFERENCES public.travel_document_conflict_resolutions(id) ON DELETE SET NULL,
  created_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (reconciliation_run_id, field_path)
);

CREATE INDEX IF NOT EXISTS idx_travel_document_conflicts_reconciliation
  ON public.travel_document_conflicts(store_id, reconciliation_run_id, status, severity);
CREATE INDEX IF NOT EXISTS idx_travel_document_reconciliation_runs_queue
  ON public.travel_document_reconciliation_runs(store_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_travel_document_reconciliation_values_run
  ON public.travel_document_reconciliation_values(store_id, reconciliation_run_id, field_path);

DROP POLICY IF EXISTS travel_document_conflicts_staff_all ON public.travel_document_conflicts;
CREATE POLICY travel_document_conflicts_staff_read ON public.travel_document_conflicts
  FOR SELECT TO authenticated USING (is_store_staff(store_id));
DROP POLICY IF EXISTS travel_document_conflict_resolutions_staff_all ON public.travel_document_conflict_resolutions;
CREATE POLICY travel_document_conflict_resolutions_staff_read ON public.travel_document_conflict_resolutions
  FOR SELECT TO authenticated USING (is_store_staff(store_id));
REVOKE INSERT, UPDATE, DELETE ON public.travel_document_conflicts FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.travel_document_conflict_resolutions FROM authenticated;

ALTER TABLE public.travel_document_reconciliation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_document_reconciliation_values ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS travel_document_reconciliation_runs_staff_all ON public.travel_document_reconciliation_runs;
CREATE POLICY travel_document_reconciliation_runs_staff_all ON public.travel_document_reconciliation_runs
  FOR ALL TO authenticated USING (is_store_staff(store_id)) WITH CHECK (is_store_staff(store_id));

DROP POLICY IF EXISTS travel_document_reconciliation_values_staff_all ON public.travel_document_reconciliation_values;
CREATE POLICY travel_document_reconciliation_values_staff_all ON public.travel_document_reconciliation_values
  FOR ALL TO authenticated USING (is_store_staff(store_id)) WITH CHECK (is_store_staff(store_id));

CREATE OR REPLACE FUNCTION public.refresh_travel_document_reconciliation_run(p_run_id UUID, p_store_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_run public.travel_document_reconciliation_runs%ROWTYPE;
  v_open_critical INTEGER;
  v_open_total INTEGER;
  v_status TEXT;
BEGIN
  SELECT * INTO v_run FROM public.travel_document_reconciliation_runs
  WHERE id = p_run_id AND store_id = p_store_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reconciliação não encontrada nesta agência.'; END IF;
  SELECT COUNT(*) FILTER (WHERE status IN ('open', 'suggested') AND severity = 'critical'),
         COUNT(*) FILTER (WHERE status IN ('open', 'suggested'))
    INTO v_open_critical, v_open_total
    FROM public.travel_document_conflicts
   WHERE reconciliation_run_id = p_run_id AND store_id = p_store_id;
  v_status := CASE WHEN v_open_critical > 0 THEN 'blocked' WHEN v_open_total > 0 THEN 'partially_resolved' ELSE 'resolved' END;
  UPDATE public.travel_document_reconciliation_runs
     SET status = v_status, conflict_count = (SELECT COUNT(*) FROM public.travel_document_conflicts WHERE reconciliation_run_id = p_run_id),
         unresolved_critical_count = v_open_critical, updated_at = now()
   WHERE id = p_run_id;
  RETURN jsonb_build_object('success', true, 'run_id', p_run_id, 'status', v_status, 'unresolved_critical_count', v_open_critical, 'unresolved_count', v_open_total);
END;
$$;

CREATE OR REPLACE FUNCTION public.record_travel_document_conflict_resolution(
  p_conflict_id UUID,
  p_store_id UUID,
  p_resolution_type TEXT,
  p_source_ingestion_id UUID DEFAULT NULL,
  p_resolved_value JSONB DEFAULT NULL,
  p_note TEXT DEFAULT NULL,
  p_actor_profile_id UUID DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_conflict public.travel_document_conflicts%ROWTYPE;
  v_resolution public.travel_document_conflict_resolutions%ROWTYPE;
  v_value JSONB := p_resolved_value;
  v_run_id UUID;
  v_status TEXT;
BEGIN
  SELECT * INTO v_conflict FROM public.travel_document_conflicts
   WHERE id = p_conflict_id AND store_id = p_store_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conflito não encontrado nesta agência.'; END IF;
  IF v_conflict.status IN ('resolved', 'dismissed') THEN
    SELECT * INTO v_resolution FROM public.travel_document_conflict_resolutions
     WHERE conflict_id = p_conflict_id ORDER BY created_at DESC LIMIT 1;
    RETURN jsonb_build_object('success', true, 'replayed', true, 'conflict_id', p_conflict_id, 'resolution_id', v_resolution.id, 'status', v_conflict.status, 'resolved_value', v_resolution.resolved_value);
  END IF;
  IF p_resolution_type NOT IN ('source', 'custom', 'dismiss') THEN RAISE EXCEPTION 'Tipo de resolução inválido.'; END IF;
  IF p_resolution_type = 'source' THEN
    IF p_source_ingestion_id IS NULL THEN RAISE EXCEPTION 'Escolha uma fonte para resolver o conflito.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(v_conflict.candidates) candidate WHERE candidate->>'sourceId' = p_source_ingestion_id::TEXT) THEN
      RAISE EXCEPTION 'A fonte escolhida não pertence às evidências do conflito.';
    END IF;
    SELECT candidate->'value' INTO v_value FROM jsonb_array_elements(v_conflict.candidates) candidate
     WHERE candidate->>'sourceId' = p_source_ingestion_id::TEXT LIMIT 1;
  ELSIF p_resolution_type = 'custom' AND p_resolved_value IS NULL THEN
    RAISE EXCEPTION 'Informe o valor corrigido para uma resolução customizada.';
  END IF;

  INSERT INTO public.travel_document_conflict_resolutions (conflict_id, store_id, resolution_type, source_ingestion_id, resolved_value, note, actor_profile_id)
  VALUES (v_conflict.id, v_conflict.store_id, p_resolution_type, p_source_ingestion_id, v_value, p_note, p_actor_profile_id)
  RETURNING * INTO v_resolution;

  UPDATE public.travel_document_conflicts
     SET status = CASE WHEN p_resolution_type = 'dismiss' THEN 'dismissed' ELSE 'resolved' END,
         resolved_at = now(), resolved_by_profile_id = p_actor_profile_id, updated_at = now(), resolver_version = 'travel-conflicts-v2'
   WHERE id = v_conflict.id;

  v_run_id := v_conflict.reconciliation_run_id;
  IF v_run_id IS NOT NULL THEN
    INSERT INTO public.travel_document_reconciliation_values
      (store_id, reconciliation_run_id, conflict_id, field_path, resolution_type, source_ingestion_id, resolved_value, resolution_id, created_by_profile_id)
    VALUES (v_conflict.store_id, v_run_id, v_conflict.id, v_conflict.field_path, p_resolution_type, p_source_ingestion_id, v_value, v_resolution.id, p_actor_profile_id)
    ON CONFLICT (reconciliation_run_id, field_path) DO UPDATE SET
      resolution_type = EXCLUDED.resolution_type, source_ingestion_id = EXCLUDED.source_ingestion_id,
      resolved_value = EXCLUDED.resolved_value, resolution_id = EXCLUDED.resolution_id,
      created_by_profile_id = EXCLUDED.created_by_profile_id, updated_at = now();
    SELECT (public.refresh_travel_document_reconciliation_run(v_run_id, p_store_id)->>'status') INTO v_status;
  END IF;

  RETURN jsonb_build_object('success', true, 'replayed', false, 'conflict_id', v_conflict.id, 'resolution_id', v_resolution.id,
    'status', CASE WHEN p_resolution_type = 'dismiss' THEN 'dismissed' ELSE 'resolved' END, 'resolved_value', v_value, 'run_status', v_status);
END;
$$;

-- Resolução passa exclusivamente pelo BFF server-side; evita chamada direta autenticada com actor/tenant arbitrários.
REVOKE ALL ON FUNCTION public.record_travel_document_conflict_resolution(UUID, UUID, TEXT, UUID, JSONB, TEXT, UUID) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.record_travel_document_conflict_resolution(UUID, UUID, TEXT, UUID, JSONB, TEXT, UUID) TO service_role;
REVOKE ALL ON FUNCTION public.refresh_travel_document_reconciliation_run(UUID, UUID) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_travel_document_reconciliation_run(UUID, UUID) TO service_role;
