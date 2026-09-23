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
  console.log("=== ANÁLISE FORENSE DE ERROS NA FILA DE CRAWL & SCRAPING ===");

  // 1. Inspecionar crawl_queue em detalhe
  try {
    const queueItems = await sql.unsafe(`
      SELECT id, url, status, domain, priority, content_type, attempts, last_error, scheduled_for, created_at, updated_at
      FROM crawl_queue
      ORDER BY updated_at DESC
      LIMIT 10
    `);
    console.log("\n[Crawl Queue — Itens Recentes]:\n", JSON.stringify(queueItems, null, 2));
  } catch (err) {
    console.log("[Crawl Queue Erro]:", err.message);
  }

  // 2. Inspecionar scraper_configs
  try {
    const configs = await sql.unsafe(`
      SELECT *
      FROM scraper_configs
      LIMIT 10
    `);
    console.log("\n[Scraper Configs]:\n", JSON.stringify(configs, null, 2));
  } catch (err) {
    console.log("[Scraper Configs Erro]:", err.message);
  }

  // 3. Inspecionar api_key_pools
  try {
    const keys = await sql.unsafe(`
      SELECT id, service_name, key_alias, is_active, daily_quota, used_today, last_used_at, error_count
      FROM api_key_pools
    `);
    console.log("\n[API Key Pools]:\n", JSON.stringify(keys, null, 2));
  } catch (err) {
    console.log("[API Key Pools Erro]:", err.message);
  }

  // 4. Inspecionar rss_feeds
  try {
    const feeds = await sql.unsafe(`
      SELECT *
      FROM rss_feeds
      LIMIT 10
    `);
    console.log("\n[RSS Feeds]:\n", JSON.stringify(feeds, null, 2));
  } catch (err) {
    console.log("[RSS Feeds Erro]:", err.message);
  }

  // 5. Inspecionar scraper_audit_log
  try {
    const auditLogs = await sql.unsafe(`
      SELECT id, scraper_name, url, status, items_found, error_details, execution_time_ms, created_at
      FROM scraper_audit_log
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.log("\n[Scraper Audit Log — Últimos 10]:\n", JSON.stringify(auditLogs, null, 2));
  } catch (err) {
    console.log("[Scraper Audit Log Erro]:", err.message);
  }

  // 6. Inspecionar colunas de directory_listings
  try {
    const cols = await sql.unsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'directory_listings'
      ORDER BY ordinal_position
    `);
    console.log("\n[Colunas de directory_listings]:\n", cols.map(c => `${c.column_name} (${c.data_type})`).join(", "));
  } catch (err) {
    console.log("[directory_listings cols erro]:", err.message);
  }

  // 7. Inspecionar crawl_seeds
  try {
    const seeds = await sql.unsafe(`SELECT * FROM crawl_seeds LIMIT 5`);
    console.log("\n[Crawl Seeds]:\n", JSON.stringify(seeds, null, 2));
  } catch (err) {
    console.log("[Crawl Seeds erro]:", err.message);
  }

  // 8. Inspecionar mined_raw_extractions colunas
  try {
    const rawCols = await sql.unsafe(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'mined_raw_extractions'
      ORDER BY ordinal_position
    `);
    console.log("\n[Colunas de mined_raw_extractions]:\n", rawCols.map(c => `${c.column_name} (${c.data_type})`).join(", "));
  } catch (err) {
    console.log("[mined_raw_extractions cols erro]:", err.message);
  }

  // 6. Verificar todas as tabelas com "crawl", "mine", "scrap" no information_schema
  try {
    const tables = await sql.unsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND (table_name ILIKE '%crawl%' OR table_name ILIKE '%mine%' OR table_name ILIKE '%scrap%' OR table_name ILIKE '%rss%')
      ORDER BY table_name
    `);
    console.log("\n[Tabelas Relacionadas a Mineração no Banco]:\n", tables.map(t => t.table_name));
  } catch (err) {
    console.log("[Information Schema Erro]:", err.message);
  }

  await sql.end();
  console.log("\n=== FIM DA ANÁLISE FORENSE ===");
}

run().catch((err) => {
  console.error("Falha no script:", err);
  process.exit(1);
});
