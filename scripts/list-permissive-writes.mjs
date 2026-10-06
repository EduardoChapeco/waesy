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
  const permissive = await sql`
    SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      AND (
        qual = 'true' 
        OR with_check = 'true'
      )
    ORDER BY tablename, policyname;
  `;
  console.log('Permissive write policies (qual=true or with_check=true):', permissive.length);
  for (const p of permissive) {
    console.log(`Table: [${p.tablename}] | Policy: "${p.policyname}" | Cmd: ${p.cmd} | Roles: [${p.roles.join(', ')}]`);
    if (p.qual) console.log(`   QUAL: ${p.qual}`);
    if (p.with_check) console.log(`   WITH CHECK: ${p.with_check}`);
  }
  await sql.end();
}
run();
