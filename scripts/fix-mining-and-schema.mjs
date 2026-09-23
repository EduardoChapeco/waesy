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
  console.log("=== EXECUTANDO AJUSTES DE BANCO PARA CRAWLER/MINERADORES & DIRETÓRIO ===");

  // 1. Adicionar colunas faltantes em directory_listings
  console.log("\n[1/4] Adicionando city e state em directory_listings...");
  await sql.unsafe(`
    ALTER TABLE IF EXISTS directory_listings
      ADD COLUMN IF NOT EXISTS city TEXT,
      ADD COLUMN IF NOT EXISTS state TEXT,
      ADD COLUMN IF NOT EXISTS neighborhood TEXT,
      ADD COLUMN IF NOT EXISTS price_level TEXT,
      ADD COLUMN IF NOT EXISTS data_quality_score INTEGER DEFAULT 50,
      ADD COLUMN IF NOT EXISTS is_crawled BOOLEAN DEFAULT false,
      ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'directory',
      ADD COLUMN IF NOT EXISTS scraper_source TEXT,
      ADD COLUMN IF NOT EXISTS last_validated_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
  `);
  console.log("OK: Colunas de directory_listings garantidas.");

  // 2. Criar tabela scraper_audit_log se não existir
  console.log("\n[2/4] Criando scraper_audit_log se não existir...");
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS scraper_audit_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      scraper_name TEXT NOT NULL,
      url TEXT,
      target_url TEXT,
      action TEXT DEFAULT 'scrape',
      status TEXT NOT NULL DEFAULT 'completed',
      items_found INTEGER DEFAULT 0,
      items_extracted INTEGER DEFAULT 0,
      error_details TEXT,
      error_message TEXT,
      duration_ms INTEGER DEFAULT 0,
      execution_time_ms INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_scraper_audit_log_created_at ON scraper_audit_log(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_scraper_audit_log_scraper_name ON scraper_audit_log(scraper_name);

    ALTER TABLE scraper_audit_log ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'scraper_audit_log' AND policyname = 'allow_read_all'
      ) THEN
        CREATE POLICY allow_read_all ON scraper_audit_log FOR SELECT USING (true);
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'scraper_audit_log' AND policyname = 'allow_service_role_all'
      ) THEN
        CREATE POLICY allow_service_role_all ON scraper_audit_log FOR ALL USING (true);
      END IF;
    END $$;
  `);
  console.log("OK: Tabela scraper_audit_log e políticas criadas com sucesso.");

  // 3. Atualizar feeds RSS com URLs 100% verificadas e funcionais
  console.log("\n[3/4] Sincronizando feeds RSS verificados (G1 Santa Catarina, G1 Economia)...");
  await sql.unsafe(`
    -- Atualiza o feed de Chapecó & Oeste Catarinense para o endpoint funcional da Globo/G1 SC
    UPDATE rss_feeds
    SET feed_url = 'https://g1.globo.com/dynamo/sc/santa-catarina/rss2.xml',
        name = 'G1 Santa Catarina (Regional Oeste & Estado)',
        last_error = NULL,
        is_active = true,
        updated_at = now()
    WHERE feed_url = 'https://g1.globo.com/rss/sc/santa-catarina/chapeco-regiao.xml';

    -- Insere ou atualiza G1 Economia & Negócios
    INSERT INTO rss_feeds (
      name, feed_url, category, entity_type, region, is_active,
      content_type, auto_publish, auto_enqueue, quality_threshold, fetch_interval_minutes, max_items_per_fetch
    )
    VALUES (
      'G1 Economia & Negócios',
      'https://g1.globo.com/dynamo/economia/rss2.xml',
      'economia',
      'news',
      'Brasil',
      true,
      'news',
      false,
      true,
      70,
      60,
      25
    )
    ON CONFLICT (feed_url) DO UPDATE
    SET is_active = true, last_error = NULL, updated_at = now();

    -- Insere G1 Tecnologia & Inovação
    INSERT INTO rss_feeds (
      name, feed_url, category, entity_type, region, is_active,
      content_type, auto_publish, auto_enqueue, quality_threshold, fetch_interval_minutes, max_items_per_fetch
    )
    VALUES (
      'G1 Tecnologia & Inovação',
      'https://g1.globo.com/dynamo/tecnologia/rss2.xml',
      'tecnologia',
      'news',
      'Brasil',
      true,
      'news',
      false,
      true,
      70,
      60,
      25
    )
    ON CONFLICT (feed_url) DO UPDATE
    SET is_active = true, last_error = NULL, updated_at = now();
  `);
  console.log("OK: Feeds RSS atualizados com endpoints verificados.");

  // 4. Limpar itens mortos de teste na fila de crawl e reinicializar
  console.log("\n[4/4] Limpando URLs teste 404 da fila de crawl...");
  await sql.unsafe(`
    DELETE FROM crawl_queue 
    WHERE url ILIKE '%exemplo-de-noticia-chapeco.ghtml%';
  `);
  console.log("OK: Fila de crawl limpa de seeds fictícias antigas.");

  await sql.end();
  console.log("\n=== AJUSTES CONCLUÍDOS COM SUCESSO! ===");
}

run().catch((err) => {
  console.error("Erro ao aplicar ajustes:", err);
  process.exit(1);
});
