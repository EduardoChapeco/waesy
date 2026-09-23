import postgres from 'postgres';
const sql = postgres({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  username: 'postgres.jfuebqmltksyznovhlwa',
  password: 'EEaR6399!@#2026',
  ssl: { rejectUnauthorized: false },
});
async function run() {
  const exists = await sql.unsafe("SELECT to_regclass('public.lawsuit_movements') as tbl");
  console.log('lawsuit_movements:', exists[0].tbl);
  if (exists[0].tbl) {
    const cols = await sql.unsafe("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'lawsuit_movements'");
    console.log('cols:', cols.map(c => c.column_name));
  }
  await sql.end();
}
run();
