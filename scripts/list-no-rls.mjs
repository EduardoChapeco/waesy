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
  const noRls = await sql`
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public' 
      AND rowsecurity = false
    ORDER BY tablename;
  `;
  console.log('Tables without RLS count:', noRls.length);
  for (const r of noRls) console.log('NO RLS:', r.tablename);
  await sql.end();
}
run();
