import postgres from 'postgres';
const sql = postgres({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  username: 'postgres.jfuebqmltksyznovhlwa',
  password: 'EEaR6399!@#2026',
  ssl: { rejectUnauthorized: false },
});
async function check() {
  const rpc = await sql.unsafe("SELECT routine_name FROM information_schema.routines WHERE routine_name = 'process_mined_article'");
  console.log('process_mined_article routine:', rpc);
  if (rpc.length > 0) {
    const src = await sql.unsafe("SELECT prosrc FROM pg_proc WHERE proname = 'process_mined_article'");
    console.log('source:\n', src[0]?.prosrc);
  }
  await sql.end();
}
check();
