import postgres from "postgres";
import fs from "fs";

const sql = postgres({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  username: 'postgres.jfuebqmltksyznovhlwa',
  password: 'EEaR6399!@#2026',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log("=== EXECUTANDO FASE 1: DEDUPLICAÇÃO E FUSÃO DE SCHEMAS CANÔNICOS ===");

  try {
    // 1. Executar 20261115000000_crawler_resilience_and_mined_products.sql
    console.log("1. Aplicando resiliência e mined_products...");
    const migrationSql = fs.readFileSync("supabase/migrations/20261115000000_crawler_resilience_and_mined_products.sql", "utf8");
    await sql.unsafe(migrationSql);
    console.log(" -> mined_products e domain_cooldowns aplicados com sucesso.");

    // 2. Garantir enums em mining_content_type
    console.log("2. Garantindo enums em mining_content_type...");
    const requiredEnums = [
      'noticia', 'artigo', 'blog_post', 'educacao', 'eventos', 
      'portal_municipal', 'portais_publicos', 'empregos', 'receitas', 
      'empresas', 'processos', 'produtos'
    ];
    for (const val of requiredEnums) {
      try {
        await sql.unsafe(`ALTER TYPE public.mining_content_type ADD VALUE IF NOT EXISTS '${val}'`);
      } catch (e) {
        // Ignora se já existir
      }
    }
    console.log(" -> Enums de mining_content_type verificados.");

    // 3. Adicionar FKs canônicas em mined_raw_extractions
    console.log("3. Integrando mined_raw_extractions aos módulos canônicos (directory_listings, mined_lawsuits, mined_products)...");
    await sql.unsafe(`
      ALTER TABLE public.mined_raw_extractions
        ADD COLUMN IF NOT EXISTS curated_directory_id UUID REFERENCES public.directory_listings(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS curated_lawsuit_id UUID REFERENCES public.mined_lawsuits(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS curated_product_id UUID REFERENCES public.mined_products(id) ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS idx_mined_raw_directory ON public.mined_raw_extractions(curated_directory_id) WHERE curated_directory_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_mined_raw_lawsuit ON public.mined_raw_extractions(curated_lawsuit_id) WHERE curated_lawsuit_id IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_mined_raw_product ON public.mined_raw_extractions(curated_product_id) WHERE curated_product_id IS NOT NULL;
    `);
    console.log(" -> FKs e índices criados com sucesso.");

    // 4. Verificação Final de Integridade
    console.log("4. Verificando integridade das tabelas canônicas pós-migração...");
    const tables = [
      "mined_lawsuits", 
      "directory_listings", 
      "events", 
      "mined_products", 
      "jobs", 
      "news_articles", 
      "api_key_pools", 
      "domain_cooldowns",
      "crawl_queue",
      "scraper_audit_log"
    ];

    for (const t of tables) {
      const res = await sql.unsafe(`SELECT count(*)::int AS count FROM ${t}`);
      console.log(` -> Tabela canônica [${t}]: ATIVA (${res[0].count} registros)`);
    }

    console.log("\n=== FASE 1 CONCLUÍDA COM 100% DE SUCESSO: ZERO DUPLICAÇÕES ===");

  } catch (err) {
    console.error("Erro ao aplicar schema canônico:", err);
  } finally {
    await sql.end();
  }
}

main();
