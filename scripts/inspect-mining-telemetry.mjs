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
  console.log("=== AUDITORIA FORENSE DE MINERADORES & CRAWLERS (PRODUÇÃO) ===");

  // 1. Verificar contagem de tabelas de mineração
  const tables = [
    "crawl_queue",
    "crawler_audit_logs",
    "mined_articles",
    "indexed_businesses",
    "rss_feeds",
    "mining_schedules",
    "pncp_mined_contracts",
    "mined_products"
  ];

  for (const table of tables) {
    try {
      const res = await sql.unsafe(`SELECT COUNT(*) as total FROM ${table}`);
      console.log(`[Tabela] ${table}: ${res[0].total} registros`);
    } catch (err) {
      console.log(`[Tabela] ${table}: NÃO EXISTE ou erro: ${err.message}`);
    }
  }

  // 2. Status da fila de Crawl
  try {
    const queueStatus = await sql.unsafe(`
      SELECT status, COUNT(*) as count 
      FROM crawl_queue 
      GROUP BY status
    `);
    console.log("\n[Crawl Queue — Status]:", queueStatus);
  } catch (err) {
    console.log("\n[Crawl Queue — Status Erro]:", err.message);
  }

  // 3. Últimos 10 Logs de Auditoria / Erros de Scraper
  try {
    const logs = await sql.unsafe(`
      SELECT id, action, target_url, status, error_message, duration_ms, created_at 
      FROM crawler_audit_logs 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    console.log("\n[Crawler Audit Logs — Últimos 10]:", logs);
  } catch (err) {
    console.log("\n[Crawler Audit Logs — Erro]:", err.message);
  }

  // 4. Feeds RSS cadastrados
  try {
    const feeds = await sql.unsafe(`
      SELECT id, name, feed_url, category, is_active, last_fetched_at, items_fetched_count 
      FROM rss_feeds 
      LIMIT 10
    `);
    console.log("\n[RSS Feeds — Amostra]:", feeds);
  } catch (err) {
    console.log("\n[RSS Feeds — Erro]:", err.message);
  }

  // 5. Empresas mineradas / Ghost Tenants
  try {
    const businesses = await sql.unsafe(`
      SELECT id, name, cnpj, city, state, is_claimed, phone, created_at 
      FROM indexed_businesses 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log("\n[Indexed Businesses — Amostra]:", businesses);
  } catch (err) {
    console.log("\n[Indexed Businesses — Erro]:", err.message);
  }

  await sql.end();
  console.log("\n=== FIM DA AUDITORIA DE MINERAÇÃO ===");
}

run().catch((err) => {
  console.error("Falha na auditoria de mineração:", err);
  process.exit(1);
});
