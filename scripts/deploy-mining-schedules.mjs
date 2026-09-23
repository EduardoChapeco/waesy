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
  console.log("=== CRIANDO E ATIVANDO TABELAS DE AGENDAMENTO DE MINERAÇÃO ===");

  // 1. Criar mining_schedules
  console.log("\n[1/3] Criando tabela mining_schedules...");
  await sql.unsafe(`
    CREATE TABLE IF NOT EXISTS mining_schedules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_type TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      schedule_cron TEXT NOT NULL DEFAULT '0 * * * *',
      is_active BOOLEAN NOT NULL DEFAULT true,
      last_run_at TIMESTAMPTZ,
      next_run_at TIMESTAMPTZ,
      last_status TEXT DEFAULT 'idle',
      last_error TEXT,
      total_runs INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    ALTER TABLE mining_schedules ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'mining_schedules' AND policyname = 'allow_read_all'
      ) THEN
        CREATE POLICY allow_read_all ON mining_schedules FOR SELECT USING (true);
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'mining_schedules' AND policyname = 'allow_service_role_all'
      ) THEN
        CREATE POLICY allow_service_role_all ON mining_schedules FOR ALL USING (true);
      END IF;
    END $$;
  `);
  console.log("OK: mining_schedules criada.");

  // 2. Inserir jobs padrão em mining_schedules
  console.log("\n[2/3] Inserindo jobs canônicos em mining_schedules...");
  await sql.unsafe(`
    INSERT INTO mining_schedules (job_type, name, description, schedule_cron, is_active)
    VALUES
      ('rss-fetcher', 'Coletor de Feeds RSS', 'Sincroniza feeds RSS cadastrados a cada hora', '0 * * * *', true),
      ('continuous-crawler', 'Motor de Extração Profunda', 'Consome itens pendentes da fila de crawling', '*/15 * * * *', true),
      ('market-data', 'Indicadores de Mercado & BCB', 'Atualiza indicadores financeiros diários', '0 6 * * *', true),
      ('cnpj-enrichment', 'Enriquecimento de Empresas (CNPJ)', 'Consulta dados públicos cadastrais de empresas', '0 2 * * *', true)
    ON CONFLICT (job_type) DO UPDATE
    SET is_active = true, updated_at = now();
  `);
  console.log("OK: Jobs inseridos.");

  // 3. Garantir colunas adicionais em scraper_audit_log
  console.log("\n[3/3] Garantindo colunas de compatibilidade em scraper_audit_log...");
  await sql.unsafe(`
    ALTER TABLE IF EXISTS scraper_audit_log
      ADD COLUMN IF NOT EXISTS items_processed INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS items_inserted INTEGER DEFAULT 0;
  `);
  console.log("OK: Colunas de scraper_audit_log garantidas.");

  await sql.end();
  console.log("\n=== PIPELINE DE MINERAÇÃO EXPANDIDO COM SUCESSO! ===");
}

run().catch((err) => {
  console.error("Erro:", err);
  process.exit(1);
});
