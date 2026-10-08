-- Contrato persistido para ações de alto impacto originadas pelo Copilot.
-- Nenhuma ação externa deve ser executada antes de uma aprovação explícita.

CREATE TABLE IF NOT EXISTS public.copilot_action_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES public.copilot_executions(id) ON DELETE SET NULL,
  thread_id UUID REFERENCES public.chat_threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('request_travel_quote', 'submit_legal_demand', 'publish_ad')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired', 'failed')),
  idempotency_key TEXT NOT NULL,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours'),
  UNIQUE(user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_copilot_action_approvals_owner_status
  ON public.copilot_action_approvals(user_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_action_approvals_thread
  ON public.copilot_action_approvals(thread_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_copilot_action_approvals_expiration
  ON public.copilot_action_approvals(status, expires_at)
  WHERE status = 'pending';

ALTER TABLE public.copilot_action_approvals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.copilot_action_approvals FROM anon, authenticated;
GRANT SELECT ON public.copilot_action_approvals TO authenticated;
GRANT ALL ON public.copilot_action_approvals TO service_role;

DROP POLICY IF EXISTS copilot_action_approvals_select_own ON public.copilot_action_approvals;
CREATE POLICY copilot_action_approvals_select_own
  ON public.copilot_action_approvals
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR store_id = ANY(public.auth_user_store_ids())
    OR public.is_platform_admin()
  );

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.copilot_action_approvals;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

COMMENT ON TABLE public.copilot_action_approvals IS
  'Solicitações de aprovação humana para ações de alto impacto do Waesy Copilot.';
COMMENT ON COLUMN public.copilot_action_approvals.payload IS
  'Payload validado e sanitizado; nunca contém segredos ou credenciais.';
