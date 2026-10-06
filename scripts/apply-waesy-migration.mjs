import pg from 'pg';
import fs from 'fs';

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || (() => { throw new Error("DATABASE_URL or SUPABASE_DB_URL is required"); })();
const pool = new pg.Pool({ connectionString });

async function run() {
  const sql = fs.readFileSync('supabase/migrations/20261016000000_waesy_universal_brand_settings_and_cleanup.sql', 'utf8');
  console.log('Aplicando migration 20261016000000_waesy_universal_brand_settings_and_cleanup.sql no Supabase...');
  await pool.query(sql);
  console.log('✅ Migration aplicada com sucesso!');

  const brandRes = await pool.query('SELECT * FROM public.platform_brand_settings LIMIT 1');
  console.log('Platform Brand Settings atual:', brandRes.rows[0]);

  const storeRes = await pool.query('SELECT id, name, slug, is_platform_root FROM public.stores WHERE is_platform_root = true');
  console.log('Root Store atual:', storeRes.rows[0]);

  const orgRes = await pool.query('SELECT id, name, slug FROM public.organizations WHERE slug = \'waesy-org\'');
  console.log('Root Org atual:', orgRes.rows[0]);

  await pool.end();
}

run().catch(err => {
  console.error('❌ Falha ao aplicar migration:', err);
  process.exit(1);
});
