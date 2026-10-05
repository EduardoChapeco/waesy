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
  const t1 = await sql`SELECT table_name FROM information_schema.tables WHERE table_name = 'company_delivery_settings'`;
  const t2 = await sql`SELECT table_name FROM information_schema.tables WHERE table_name = 'classified_delivery_dispatches'`;
  const t3 = await sql`SELECT table_name FROM information_schema.tables WHERE table_name = 'portal_pro_waitlist'`;
  console.log('company_delivery_settings exists:', t1.length > 0);
  console.log('classified_delivery_dispatches exists:', t2.length > 0);
  console.log('portal_pro_waitlist exists:', t3.length > 0);
  await sql.end();
}
run();
