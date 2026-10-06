import pg from 'pg';
import fs from 'fs';
import path from 'path';

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL or SUPABASE_DB_URL must be provided through the environment; no database credential is accepted in source code.');
}

const pool = new pg.Pool({ connectionString });

async function run() {
  console.log('--- Step 0: Ensuring Compatibility Synonyms & Columns ---');
  await pool.query(`
    DO $$
    BEGIN
      -- Add user_id alias column to workspace_members if not present
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workspace_members' AND column_name = 'user_id'
      ) THEN
        ALTER TABLE public.workspace_members ADD COLUMN user_id UUID GENERATED ALWAYS AS (profile_id) STORED;
      END IF;
    END $$;

    CREATE OR REPLACE VIEW public.store_members AS
      SELECT id, profile_id, profile_id AS user_id, store_id, role, created_at, updated_at
      FROM public.workspace_members;

    CREATE OR REPLACE VIEW public.store_memberships AS
      SELECT id, profile_id, profile_id AS user_id, store_id, role, created_at, updated_at
      FROM public.workspace_members;
  `);
  console.log('✓ Step 0 complete.');

  const migrationsToApply = [
    'supabase/migrations/20260909150000_classifieds_niches_and_company_mvp.sql',
    'supabase/migrations/20260909160000_deal_reviews_and_reputation.sql',
    'supabase/migrations/20260909170000_push_subscriptions_and_lead_notifications.sql',
    'supabase/migrations/20260909180000_company_delivery_and_portal_waitlist.sql',
    'supabase/migrations/20260922000000_press_consortium_and_sponsor_display_network.sql',
    'supabase/migrations/20260923000000_feed_algorithm_indexes.sql',
    'supabase/migrations/20260930020000_booking_services_enterprise_parity.sql',
    'supabase/migrations/20260930030000_crm_leads_commercial_enterprise_parity.sql',
    'supabase/migrations/20261001000000_store_workflows_automation_engine.sql',
    'supabase/migrations/20261002000000_events_external_ticket_and_creator_analytics.sql',
    'supabase/migrations/20261002_quick.sql',
    'supabase/migrations/20261010000000_creator_showcase_cms_and_brand_events.sql',
    'supabase/migrations/20261011000000_security_hardening_rls_and_attack_telemetry.sql',
    'supabase/migrations/20261012000000_concursos_identidades_checkout.sql',
    'supabase/migrations/20261013000000_security_audit_rls_hardening.sql',
    'supabase/migrations/20261013000000_store_page_sections_and_system_audit.sql',
    'supabase/migrations/20261014000000_rls_security_hardening_confidential_tables.sql',
    'supabase/migrations/20261015000000_fix_exchanges_schema_and_rpc.sql',
    'supabase/migrations/20261016000000_marketplace_hub_fiscal_and_feeds.sql',
    'supabase/migrations/20261017000000_inbound_webhooks_affiliate_payouts_and_comments.sql',
    'supabase/migrations/20261018000000_table_synonyms_and_compatibility_views.sql',
  ];

  for (const relPath of migrationsToApply) {
    if (!fs.existsSync(relPath)) {
      console.log(`Skipping (not found): ${relPath}`);
      continue;
    }
    let sql = fs.readFileSync(relPath, 'utf8');
    // Strip UTF-8 BOM if present
    if (sql.charCodeAt(0) === 0xFEFF) {
      sql = sql.slice(1);
    }
    const base = path.basename(relPath);
    console.log(`Applying: ${base}...`);
    try {
      await pool.query(sql);
      console.log(`  ✓ Successfully applied ${base}`);
    } catch (err) {
      console.error(`  ! Failed on ${base}: ${err.message}`);
      throw err;
    }
  }

  await pool.end();
  console.log('--- Production Database Migrations Synchronization Complete! ---');
}

run().catch(err => {
  console.error('Fatal runner error:', err);
  process.exit(1);
});
