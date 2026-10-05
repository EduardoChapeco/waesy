import fs from "fs";
import dotenv from "dotenv";

if (fs.existsSync(".env.local")) dotenv.config({ path: ".env.local" });
if (fs.existsSync(".env.secrets")) dotenv.config({ path: ".env.secrets" });
if (fs.existsSync(".env")) dotenv.config({ path: ".env" });

if (!process.env.VITE_SUPABASE_URL && process.env.SUPABASE_URL) {
  process.env.VITE_SUPABASE_URL = process.env.SUPABASE_URL;
}
if (!process.env.VITE_SUPABASE_ANON_KEY && process.env.SUPABASE_ANON_KEY) {
  process.env.VITE_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
}

import { executeCrawlQueueBatchDirect } from "../src/services/mining/crawler-batch-engine";

async function run() {
  console.log("Executando lote de teste com 5 itens da crawl_queue...");
  const t0 = Date.now();
  const res = await executeCrawlQueueBatchDirect({ batchSize: 5, limit: 5 });
  console.log("Lote concluído em", Date.now() - t0, "ms");
  console.log("Resumo:", {
    totalProcessed: res.totalProcessed,
    successful: res.successful,
    failed: res.failed,
  });
  console.log("Itens processados:");
  res.items.forEach((item, idx) => {
    console.log(`  [${idx + 1}] ${item.status.toUpperCase()} | ${item.entityType} | ${item.url.slice(0, 70)}... ${item.error ? `(Erro: ${item.error})` : ""}`);
  });
}

run().catch(console.error);
