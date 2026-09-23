import postgres from 'postgres';

const sql = postgres({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  username: 'postgres.jfuebqmltksyznovhlwa',
  password: 'EEaR6399!@#2026',
  ssl: { rejectUnauthorized: false },
  connect_timeout: 15,
});

async function run() {
  const cols = await sql`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'workspace_members'`;
  console.log('WM COLS:', cols.map(c => c.column_name));
  await sql.end();
}
run();
