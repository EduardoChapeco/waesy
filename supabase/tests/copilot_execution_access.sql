BEGIN;

DO $$
DECLARE
  owner_id uuid;
  outsider_id uuid := gen_random_uuid();
  fixture_id uuid := gen_random_uuid();
  visible_count integer;
BEGIN
  SELECT id INTO owner_id FROM auth.users LIMIT 1;
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'An existing auth user is required for the transactional RLS fixture';
  END IF;
  INSERT INTO public.copilot_executions (id, task_id, user_id, store_id, domain)
  VALUES (fixture_id, fixture_id, owner_id, NULL, 'rls-regression-fixture');
  INSERT INTO public.copilot_execution_steps (execution_id, sequence_no, step_id, step_type, label, status)
  VALUES (fixture_id, 0, 'fixture', 'tool', 'RLS regression fixture', 'completed');

  PERFORM set_config('request.jwt.claims', json_build_object('sub', owner_id, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', owner_id::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO visible_count FROM public.copilot_executions WHERE id = fixture_id;
  IF visible_count <> 1 THEN RAISE EXCEPTION 'Owner cannot read own execution'; END IF;
  SELECT count(*) INTO visible_count FROM public.copilot_execution_steps WHERE execution_id = fixture_id;
  IF visible_count <> 1 THEN RAISE EXCEPTION 'Owner cannot read own steps'; END IF;
  RESET ROLE;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', outsider_id, 'role', 'authenticated')::text, true);
  PERFORM set_config('request.jwt.claim.sub', outsider_id::text, true);
  SET LOCAL ROLE authenticated;
  SELECT count(*) INTO visible_count FROM public.copilot_executions WHERE id = fixture_id;
  IF visible_count <> 0 THEN RAISE EXCEPTION 'Cross-user execution leak'; END IF;
  SELECT count(*) INTO visible_count FROM public.copilot_execution_steps WHERE execution_id = fixture_id;
  IF visible_count <> 0 THEN RAISE EXCEPTION 'Cross-user step leak'; END IF;
  RESET ROLE;

  IF has_table_privilege('anon', 'public.copilot_executions', 'SELECT')
     OR has_table_privilege('anon', 'public.copilot_execution_steps', 'SELECT')
     OR has_table_privilege('authenticated', 'public.copilot_executions', 'INSERT, UPDATE, DELETE')
     OR has_table_privilege('authenticated', 'public.copilot_execution_steps', 'INSERT, UPDATE, DELETE') THEN
    RAISE EXCEPTION 'Unexpected client write or anonymous read privilege';
  END IF;
END $$;

ROLLBACK;
