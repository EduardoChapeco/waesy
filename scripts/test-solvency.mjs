import postgres from 'postgres';

const sql = postgres({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  username: 'postgres.jfuebqmltksyznovhlwa',
  password: process.env.SUPABASE_DB_PASSWORD || (() => { throw new Error("SUPABASE_DB_PASSWORD is required"); })(),
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    const res = await sql`SELECT public.reconcile_platform_token_solvency() AS result;`;
    console.log('RECONCILIATION RESULT:', JSON.stringify(res[0]?.result, null, 2));
  } catch (err) {
    console.error('Error running solvency:', err.message);
  } finally {
    await sql.end();
  }
}

main();
