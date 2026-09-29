const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const fs = require("fs");

if (fs.existsSync(".env.local")) dotenv.config({ path: ".env.local" });
if (fs.existsSync(".env.secrets")) dotenv.config({ path: ".env.secrets" });
if (fs.existsSync(".env")) dotenv.config({ path: ".env" });

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.log("NO_CREDS");
  process.exit(0);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function check() {
  const tables = [
    "crawler_sources",
    "crawl_queue",
    "rss_feeds",
    "rss_feed_items",
    "news_articles",
    "jobs",
    "mined_articles",
    "mined_products",
    "api_key_pools"
  ];
  console.log("=== CONTAGEM REAL NO BANCO DE DADOS ===");
  for (const t of tables) {
    try {
      const { count, error } = await sb.from(t).select("*", { count: "exact", head: true });
      if (error) {
        console.log(`${t}: ERRO (${error.message})`);
      } else {
        console.log(`${t}: ${count}`);
      }
    } catch (e) {
      console.log(`${t}: EXCEÇÃO (${e.message})`);
    }
  }

  // Exemplos de crawler_sources cadastrados
  try {
    const { data: sources, error } = await sb.from("crawler_sources").select("id, name, type, priority, status").limit(5);
    if (!error && sources) {
      console.log("\nExemplos de crawler_sources no BD:", sources);
    }
  } catch {}

  // Exemplos de crawl_queue
  try {
    const { data: queue, error } = await sb.from("crawl_queue").select("id, url, status, priority, discovered_via").limit(5);
    if (!error && queue) {
      console.log("\nExemplos de crawl_queue no BD:", queue);
    }
  } catch {}
}

check().then(() => process.exit(0));
