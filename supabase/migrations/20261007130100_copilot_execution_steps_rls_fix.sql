-- Corrige o isolamento dos steps do Copilot.
-- A existência de execution_id, isoladamente, não autoriza leitura: o pai
-- precisa pertencer ao usuário, a um tenant membro ou a um platform admin.

DO $$
BEGIN
  IF to_regclass('public.copilot_execution_steps') IS NULL THEN
    RETURN;
  END IF;

  DROP POLICY IF EXISTS copilot_execution_steps_select_own ON public.copilot_execution_steps;
  CREATE POLICY copilot_execution_steps_select_own
    ON public.copilot_execution_steps
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1
        FROM public.copilot_executions e
        WHERE e.id = execution_id
          AND (
            e.user_id = (SELECT auth.uid())
            OR e.store_id = ANY(public.auth_user_store_ids())
            OR public.is_platform_admin()
          )
      )
    );
END $$;
