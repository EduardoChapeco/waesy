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

import { bulkIngestToCrawlQueue } from "../src/lib/mining/sitemap-crawler.engine";

async function run() {
  const testUrls = [
    { url: "https://chapecoonline.com.br/empresa/teste-1", sourceSitemap: "test" },
    { url: "https://chapecoonline.com.br/noticia/teste-2", sourceSitemap: "test" },
    { url: "https://chapecoonline.com.br/vaga/teste-3", sourceSitemap: "test" },
  ];

  console.log("Testando bulkIngestToCrawlQueue...");
  const res = await bulkIngestToCrawlQueue(testUrls, { defaultEntityType: "news" });
  console.log("Resultado da Ingestão:", res);
}

run().catch(console.error);
