-- ============================================================================
-- MIGRATION DE REPARO: Remove registros corrompidos de supabase_migrations
-- e permite que as migrations sejam reaplicadas pelo push subsequente
-- ============================================================================
-- NOTA: Esta migration DEVE ser aplicada ANTES das migrations corrompidas.
-- Execute via: npx supabase db push (será a primeira a ser aplicada)
-- ============================================================================

DO $$
DECLARE
  v_versions TEXT[] := ARRAY[
    '20260926000000',
    '20260927000000',
    '20261018000000',
    '20261019000000',
    '20261025000000',
    '20261027000000',
    '20261107000000',
    '20261110000000',
    '20261112000000',
    '20261113000000',
    '20261114000000',
    '20261114000001',
    '20261115000000',
    '20261116000000',
    '20261117000000',
    '20261118000000'
  ];
  v_version TEXT;
BEGIN
  FOREACH v_version IN ARRAY v_versions
  LOOP
    DELETE FROM supabase_migrations.schema_migrations
    WHERE version = v_version;
    
    IF FOUND THEN
      RAISE NOTICE 'Removed corrupted migration record: %', v_version;
    END IF;
  END LOOP;
END $$;
