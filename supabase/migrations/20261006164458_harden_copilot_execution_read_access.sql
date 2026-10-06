-- Correct existing installations; the creation migration carries the same rules.
DO $$
BEGIN
  IF to_regclass('public.copilot_executions') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.copilot_executions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.copilot_execution_steps ENABLE ROW LEVEL SECURITY;
  REVOKE ALL ON public.copilot_executions, public.copilot_execution_steps FROM anon, authenticated;
  GRANT SELECT ON public.copilot_executions, public.copilot_execution_steps TO authenticated;
  GRANT ALL ON public.copilot_executions, public.copilot_execution_steps TO service_role;

  DROP POLICY IF EXISTS copilot_executions_select_own ON public.copilot_executions;
  CREATE POLICY copilot_executions_select_own ON public.copilot_executions
    FOR SELECT TO authenticated USING (
      user_id = (SELECT auth.uid())
      OR store_id = ANY(public.auth_user_store_ids())
      OR public.is_platform_admin()
    );

  DROP POLICY IF EXISTS copilot_execution_steps_select_own ON public.copilot_execution_steps;
  CREATE POLICY copilot_execution_steps_select_own ON public.copilot_execution_steps
    FOR SELECT TO authenticated USING (
      EXISTS (SELECT 1 FROM public.copilot_executions e WHERE e.id = execution_id)
    );
END $$;
