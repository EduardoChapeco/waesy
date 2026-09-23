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
  const res = await sql.unsafe(`
    SELECT t.relname, c.conname, c.contype, pg_get_constraintdef(c.oid) as def
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname IN ('rss_feed_items', 'crawl_queue')
  `);
  console.log("Constraints:\n", res);

  const idx = await sql.unsafe(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE tablename IN ('rss_feed_items', 'crawl_queue')
  `);
  console.log("Indexes:\n", idx);

  await sql.end();
}

run();
