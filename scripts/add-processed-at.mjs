import postgres from "postgres";

const sql = postgres({
  host: "aws-0-sa-east-1.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  username: "postgres.jfuebqmltksyznovhlwa",
  password: "EEaR6399!@#2026",
  ssl: { rejectUnauthorized: false },
  connect_timeout: 15,
});

async function run() {
  await sql.unsafe(`
    ALTER TABLE crawl_queue 
      ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
  `);
  console.log("OK: processed_at adicionado a crawl_queue com sucesso.");
  await sql.end();
}

run();
