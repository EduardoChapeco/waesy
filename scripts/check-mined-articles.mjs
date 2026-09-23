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
  const cols = await sql.unsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'mined_articles' 
    ORDER BY ordinal_position
  `);
  console.log("Colunas de mined_articles:\n", cols.map(c => `${c.column_name} (${c.data_type})`).join("\n"));

  const queueCols = await sql.unsafe(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'crawl_queue' 
    ORDER BY ordinal_position
  `);
  console.log("\nColunas de crawl_queue:\n", queueCols.map(c => `${c.column_name} (${c.data_type})`).join("\n"));

  const count = await sql.unsafe(`SELECT count(*) as total FROM mined_articles`);
  console.log("\nTotal em mined_articles:", count[0].total);

  await sql.end();
}

run();
