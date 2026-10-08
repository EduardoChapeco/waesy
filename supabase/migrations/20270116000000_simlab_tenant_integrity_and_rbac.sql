-- SimLab tenant hardening: service functions authorize writes; direct authenticated
-- PostgREST access is read-only and role-scoped. Service-role BFF calls still require
-- application-level authorization because service_role bypasses RLS.

DROP POLICY IF EXISTS simlab_workspace_personas_members
  ON public.simlab_workspace_persona_profiles;
DROP POLICY IF EXISTS simlab_workspace_personas_read
  ON public.simlab_workspace_persona_profiles;
DROP POLICY IF EXISTS simlab_workspace_personas_insert
  ON public.simlab_workspace_persona_profiles;
DROP POLICY IF EXISTS simlab_workspace_personas_update
  ON public.simlab_workspace_persona_profiles;
DROP POLICY IF EXISTS simlab_workspace_personas_delete
  ON public.simlab_workspace_persona_profiles;

CREATE POLICY simlab_workspace_personas_read
  ON public.simlab_workspace_persona_profiles
  FOR SELECT TO authenticated
  USING (public.has_workspace_role(store_id, ARRAY['owner','admin','manager','content']));

CREATE POLICY simlab_workspace_personas_insert
  ON public.simlab_workspace_persona_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_workspace_role(store_id, ARRAY['owner','admin','manager'])
    AND created_by = auth.uid()
  );

CREATE POLICY simlab_workspace_personas_update
  ON public.simlab_workspace_persona_profiles
  FOR UPDATE TO authenticated
  USING (public.has_workspace_role(store_id, ARRAY['owner','admin','manager']))
  WITH CHECK (public.has_workspace_role(store_id, ARRAY['owner','admin','manager']));

CREATE POLICY simlab_workspace_personas_delete
  ON public.simlab_workspace_persona_profiles
  FOR DELETE TO authenticated
  USING (public.has_workspace_role(store_id, ARRAY['owner','admin','manager']));

REVOKE INSERT, UPDATE, DELETE
  ON public.simlab_workspace_persona_profiles FROM authenticated;
GRANT SELECT ON public.simlab_workspace_persona_profiles TO authenticated;

DROP POLICY IF EXISTS simlab_observed_campaign_arms_store_members
  ON public.simlab_observed_campaign_arms;
DROP POLICY IF EXISTS simlab_observed_campaign_arms_read
  ON public.simlab_observed_campaign_arms;
DROP POLICY IF EXISTS simlab_observed_campaign_arms_insert
  ON public.simlab_observed_campaign_arms;
DROP POLICY IF EXISTS simlab_observed_campaign_arms_update
  ON public.simlab_observed_campaign_arms;
DROP POLICY IF EXISTS simlab_observed_campaign_arms_delete
  ON public.simlab_observed_campaign_arms;

CREATE POLICY simlab_observed_campaign_arms_read
  ON public.simlab_observed_campaign_arms
  FOR SELECT TO authenticated
  USING (public.has_workspace_role(store_id, ARRAY['owner','admin','manager','content']));

-- Direct API writes are disabled below. This policy documents the maximum allowed
-- direct insert if table grants are intentionally expanded in a future migration.
CREATE POLICY simlab_observed_campaign_arms_insert
  ON public.simlab_observed_campaign_arms
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_workspace_role(store_id, ARRAY['owner','admin','manager','content'])
    AND created_by = auth.uid()
    AND source_type = 'user_reported'
  );

CREATE POLICY simlab_observed_campaign_arms_update
  ON public.simlab_observed_campaign_arms
  FOR UPDATE TO authenticated
  USING (public.has_workspace_role(store_id, ARRAY['owner','admin','manager','content']))
  WITH CHECK (
    public.has_workspace_role(store_id, ARRAY['owner','admin','manager','content'])
    AND created_by = auth.uid()
    AND source_type = 'user_reported'
  );

CREATE POLICY simlab_observed_campaign_arms_delete
  ON public.simlab_observed_campaign_arms
  FOR DELETE TO authenticated
  USING (public.has_workspace_role(store_id, ARRAY['owner','admin','manager']));

REVOKE INSERT, UPDATE, DELETE
  ON public.simlab_observed_campaign_arms FROM authenticated;
GRANT SELECT ON public.simlab_observed_campaign_arms TO authenticated;

-- Enforce the same tenant on the experiment and its observed aggregate at the DB boundary.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.simlab_observed_campaign_arms arm
    JOIN public.simlab_market_experiments experiment ON experiment.id = arm.experiment_id
    WHERE arm.store_id <> experiment.store_id
  ) THEN
    RAISE EXCEPTION 'Cannot add SimLab tenant FK: observed arms reference experiments from another store';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.simlab_market_experiments'::regclass
      AND conname = 'simlab_market_experiments_id_store_unique'
  ) THEN
    ALTER TABLE public.simlab_market_experiments
      ADD CONSTRAINT simlab_market_experiments_id_store_unique UNIQUE (id, store_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.simlab_observed_campaign_arms'::regclass
      AND conname = 'simlab_observed_arms_experiment_store_fk'
  ) THEN
    ALTER TABLE public.simlab_observed_campaign_arms
      ADD CONSTRAINT simlab_observed_arms_experiment_store_fk
      FOREIGN KEY (experiment_id, store_id)
      REFERENCES public.simlab_market_experiments (id, store_id)
      ON DELETE CASCADE;
  END IF;
END $$;
