-- Waesy — resolução canônica de conflitos entre documentos turísticos
-- Não destrutivo: mantém ingestões e extrações originais imutáveis.

CREATE TABLE IF NOT EXISTS public.travel_document_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.tourism_trips(id) ON DELETE SET NULL,
  operation_key TEXT,
  fingerprint TEXT NOT NULL,
  field_path TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN ('identity', 'operational', 'financial', 'legal', 'commercial', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'suggested', 'resolved', 'dismissed')),
  suggested_source_id UUID REFERENCES public.travel_document_ingestions(id) ON DELETE SET NULL,
  suggested_value JSONB,
  candidates JSONB NOT NULL DEFAULT '[]'::jsonb,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS public.travel_document_conflict_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id UUID NOT NULL REFERENCES public.travel_document_conflicts(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  resolution_type TEXT NOT NULL CHECK (resolution_type IN ('source', 'custom', 'dismiss')),
  source_ingestion_id UUID REFERENCES public.travel_document_ingestions(id) ON DELETE SET NULL,
  resolved_value JSONB,
  note TEXT,
  actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_travel_document_conflicts_queue
  ON public.travel_document_conflicts(store_id, status, severity, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_travel_document_conflicts_trip
  ON public.travel_document_conflicts(store_id, trip_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_travel_document_conflict_resolutions_conflict
  ON public.travel_document_conflict_resolutions(store_id, conflict_id, created_at DESC);

ALTER TABLE public.travel_document_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_document_conflict_resolutions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS travel_document_conflicts_staff_all ON public.travel_document_conflicts;
CREATE POLICY travel_document_conflicts_staff_all ON public.travel_document_conflicts
  FOR ALL TO authenticated USING (is_store_staff(store_id)) WITH CHECK (is_store_staff(store_id));

DROP POLICY IF EXISTS travel_document_conflict_resolutions_staff_all ON public.travel_document_conflict_resolutions;
CREATE POLICY travel_document_conflict_resolutions_staff_all ON public.travel_document_conflict_resolutions
  FOR ALL TO authenticated USING (is_store_staff(store_id)) WITH CHECK (is_store_staff(store_id));

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
BEGIN
  SELECT * INTO v_conflict
  FROM public.travel_document_conflicts
  WHERE id = p_conflict_id AND store_id = p_store_id
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conflito não encontrado nesta agência.'; END IF;
  IF p_resolution_type = 'source' THEN
    IF p_source_ingestion_id IS NULL THEN RAISE EXCEPTION 'Escolha uma fonte para resolver o conflito.'; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_conflict.candidates) candidate
      WHERE candidate->>'sourceId' = p_source_ingestion_id::TEXT
    ) THEN RAISE EXCEPTION 'A fonte escolhida não pertence às evidências do conflito.'; END IF;
    SELECT candidate->'value' INTO v_value
    FROM jsonb_array_elements(v_conflict.candidates) candidate
    WHERE candidate->>'sourceId' = p_source_ingestion_id::TEXT
    LIMIT 1;
  ELSIF p_resolution_type = 'custom' AND p_resolved_value IS NULL THEN
    RAISE EXCEPTION 'Informe o valor corrigido para uma resolução customizada.';
  END IF;

  INSERT INTO public.travel_document_conflict_resolutions (
    conflict_id, store_id, resolution_type, source_ingestion_id, resolved_value, note, actor_profile_id
  ) VALUES (
    v_conflict.id, v_conflict.store_id, p_resolution_type, p_source_ingestion_id, v_value, p_note, p_actor_profile_id
  ) RETURNING * INTO v_resolution;

  UPDATE public.travel_document_conflicts
  SET status = CASE WHEN p_resolution_type = 'dismiss' THEN 'dismissed' ELSE 'resolved' END,
      resolved_at = now(), resolved_by_profile_id = p_actor_profile_id, updated_at = now()
  WHERE id = v_conflict.id;

  RETURN jsonb_build_object(
    'success', true,
    'conflict_id', v_conflict.id,
    'resolution_id', v_resolution.id,
    'status', CASE WHEN p_resolution_type = 'dismiss' THEN 'dismissed' ELSE 'resolved' END,
    'resolved_value', v_value
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_travel_document_conflict_resolution(UUID, UUID, TEXT, UUID, JSONB, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_travel_document_conflict_resolution(UUID, UUID, TEXT, UUID, JSONB, TEXT, UUID) TO authenticated, service_role;
