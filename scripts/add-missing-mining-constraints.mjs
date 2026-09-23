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
  console.log("=== APLICANDO CONSTRAINTS FALTANTES PARA MINERAÇÃO & CRAWL ===");

  // 1. Unique constraint em rss_feed_items (rss_feed_id, item_guid)
  console.log("\n[1/2] Criando UNIQUE INDEX em rss_feed_items (rss_feed_id, item_guid)...");
  await sql.unsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_rss_feed_items_feed_guid 
    ON rss_feed_items (rss_feed_id, item_guid);
  `);
  console.log("OK: Unique index idx_rss_feed_items_feed_guid criado.");

  // 2. Unique constraint em crawl_queue (url)
  console.log("\n[2/2] Criando UNIQUE INDEX em crawl_queue (url)...");
  await sql.unsafe(`
    -- Limpa duplicatas existentes antes de criar o índice único se houver
    DELETE FROM crawl_queue a USING crawl_queue b
    WHERE a.id < b.id AND a.url = b.url;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_crawl_queue_url 
    ON crawl_queue (url);
  `);
  console.log("OK: Unique index idx_crawl_queue_url criado.");

  await sql.end();
  console.log("\n=== CONSTRAINTS APLICADAS COM SUCESSO! ===");
}

run().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
