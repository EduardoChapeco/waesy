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
  const tables = await sql.unsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  console.log("=== TODAS AS TABELAS DO BANCO (PUBLIC) ===");
  console.log(tables.map(t => t.table_name).join("\n"));
  console.log(`Total: ${tables.length} tabelas.`);
  await sql.end();
}

run();
