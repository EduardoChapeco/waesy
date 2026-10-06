import postgres from 'postgres';

const sql = postgres({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  username: 'postgres.jfuebqmltksyznovhlwa',
  password: process.env.SUPABASE_DB_PASSWORD || (() => { throw new Error("SUPABASE_DB_PASSWORD is required"); })(),
  ssl: { rejectUnauthorized: false },
  connect_timeout: 15,
});

async function run() {
  const policies = await sql`
    SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE tablename = 'notifications';
  `;
  console.log('notifications policies:', policies);
  await sql.end();
}
run();
