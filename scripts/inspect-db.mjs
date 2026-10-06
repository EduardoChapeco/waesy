import pg from 'pg';

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || (() => { throw new Error("DATABASE_URL or SUPABASE_DB_URL is required"); })();
const pool = new pg.Pool({ connectionString });

async function main() {
  const storeCols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'stores' AND table_schema = 'public'");
  console.log('STORE COLS:', storeCols.rows.map(r => r.column_name).join(', '));
  
  const stores = await pool.query('SELECT * FROM public.stores LIMIT 10');
  console.log('STORES COUNT:', stores.rows.length);
  console.log('STORES:', JSON.stringify(stores.rows, null, 2));

  const orgs = await pool.query('SELECT * FROM public.organizations LIMIT 10');
  console.log('ORGS COUNT:', orgs.rows.length);
  console.log('ORGS:', JSON.stringify(orgs.rows, null, 2));

  const profiles = await pool.query('SELECT id, full_name, role, username FROM public.profiles');
  console.log('PROFILES:', JSON.stringify(profiles.rows, null, 2));

  const authUsers = await pool.query('SELECT id, email, raw_user_meta_data FROM auth.users');
  console.log('AUTH USERS:', JSON.stringify(authUsers.rows, null, 2));

  await pool.end();
}

main().catch(err => {
  console.error('ERROR:', err);
  process.exit(1);
});
