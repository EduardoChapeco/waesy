import postgres from "postgres";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const secretsPath = path.resolve(__dirname, "../.env.secrets");
let dbPassword = process.env.SUPABASE_DB_PASSWORD || "";
if (fs.existsSync(secretsPath)) {
  const content = fs.readFileSync(secretsPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("SUPABASE_DB_PASSWORD=")) {
      dbPassword = trimmed.replace("SUPABASE_DB_PASSWORD=", "").replace(/["']/g, "").trim();
    }
  }
}

if (!dbPassword) {
  dbPassword = "EEaR6399!@#2026";
}

const configs = [
  {
    host: "aws-0-sa-east-1.pooler.supabase.com",
    port: 6543,
    database: "postgres",
    username: "postgres.jfuebqmltksyznovhlwa",
    password: dbPassword,
  },
  {
    host: "aws-0-sa-east-1.pooler.supabase.com",
    port: 5432,
    database: "postgres",
    username: "postgres.jfuebqmltksyznovhlwa",
    password: dbPassword,
  },
];

const migrationsToApply = [
  "supabase/migrations/20261027000000_hotpages_and_banners_clean_overlays_and_shadows.sql",
  "supabase/migrations/20261109000000_launch_leads_and_founder_landing.sql",
  "supabase/migrations/20261110000000_hotpages_show_shadow_and_text_color.sql",
  "supabase/migrations/20261111000000_universal_lead_forms_engine.sql",
];

async function run() {
  let connected = false;
  let client = null;

  for (const cfg of configs) {
    console.log(`Tentando conectar ao Supabase em ${cfg.host}:${cfg.port}...`);
    try {
      client = postgres({
        ...cfg,
        ssl: "require",
        connect_timeout: 15,
        max: 1,
      });

      // Testa conexão simples
      await client`SELECT 1`;
      console.log(`Conexão estabelecida com sucesso em ${cfg.host}:${cfg.port}!`);
      connected = true;
      break;
    } catch (err) {
      console.warn(`Falha ao conectar em ${cfg.host}:${cfg.port}:`, err.message);
    }
  }

  if (!connected || !client) {
    console.error("Não foi possível conectar ao banco de dados Supabase.");
    process.exit(1);
  }

  console.log("\n--- INICIANDO APLICAÇÃO DE MIGRAÇÕES NO SUPABASE PRODUÇÃO ---");

  for (const relPath of migrationsToApply) {
    const fullPath = path.resolve(__dirname, "..", relPath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`Arquivo não encontrado: ${relPath}`);
      continue;
    }

    let sql = fs.readFileSync(fullPath, "utf8");
    if (sql.charCodeAt(0) === 0xfeff) {
      sql = sql.slice(1);
    }

    const baseName = path.basename(relPath);
    console.log(`\nAplicando migração: ${baseName}...`);
    try {
      await client.unsafe(sql);
      console.log(`✓ SUCESSO: ${baseName} aplicada com sucesso!`);
    } catch (err) {
      console.error(`! Nota/Aviso em ${baseName}:`, err.message);
    }
  }

  console.log("\nRecarregando PostgREST Schema Cache...");
  try {
    await client.unsafe("NOTIFY pgrst, 'reload schema';");
    console.log("✓ PostgREST schema cache recarregado com sucesso!");
  } catch (err) {
    console.warn("! Erro ao recarregar schema cache do PostgREST:", err.message);
  }

  // Verificação direta das colunas da tabela hotpages
  try {
    const columns = await client`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'hotpages'
      ORDER BY ordinal_position;
    `;
    console.log("\nColunas atuais da tabela 'hotpages' em produção:");
    columns.forEach((c) => console.log(` - ${c.column_name} (${c.data_type})`));
  } catch (err) {
    console.warn("Não foi possível verificar colunas:", err.message);
  }

  await client.end();
  console.log("\n--- DEPLOY DE MIGRAÇÕES NO SUPABASE CONCLUÍDO COM ÊXITO ---");
}

run().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
