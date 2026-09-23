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
  const cols = await sql.unsafe("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'mining_schedules' ORDER BY ordinal_position");
  console.log("mining_schedules columns:", cols.map(c => `${c.column_name} (${c.data_type})`).join(", "));
  const rows = await sql.unsafe("SELECT * FROM mining_schedules LIMIT 5");
  console.log("sample rows:", rows);
  await sql.end();
}

run();
