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
  const cols = await sql.unsafe("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'api_key_pools' ORDER BY ordinal_position");
  console.log("api_key_pools columns:", cols.map(c => `${c.column_name} (${c.data_type})`).join(", "));
  const sample = await sql.unsafe("SELECT * FROM api_key_pools LIMIT 2");
  console.log("sample rows:", sample);
  await sql.end();
}

run();
