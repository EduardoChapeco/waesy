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
  const cols = await sql`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'system_error_logs'
    ORDER BY ordinal_position;
  `;
  console.log('system_error_logs columns:', cols);

  const count = await sql`SELECT count(*) FROM system_error_logs`;
  console.log('system_error_logs count:', count[0].count);

  const sample = await sql`SELECT * FROM system_error_logs ORDER BY created_at DESC LIMIT 5`;
  console.log('Sample rows:', sample);

  await sql.end();
}
run();
