import postgres from "postgres";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationsDir = path.resolve(__dirname, "../supabase/migrations");
let password = process.env.SUPABASE_DB_PASSWORD || "";
if (!password) {
  const secretsPath = path.resolve(__dirname, "../.env.secrets");
  if (fs.existsSync(secretsPath)) {
    const lines = fs.readFileSync(secretsPath, "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("SUPABASE_DB_PASSWORD=")) {
        password = trimmed.replace("SUPABASE_DB_PASSWORD=", "").replace(/["']/g, "").trim();
        break;
      }
    }
  }
}

const configs = [
  {
    host: "aws-0-sa-east-1.pooler.supabase.com",
    port: 6543,
    database: "postgres",
    username: "postgres.jfuebqmltksyznovhlwa",
    password,
  },
  {
    host: "aws-0-sa-east-1.pooler.supabase.com",
    port: 5432,
    database: "postgres",
    username: "postgres.jfuebqmltksyznovhlwa",
    password,
  }
];

async function main() {
  console.log("=== INICIANDO AUDITORIA E DEPLOY DE MIGRATIONS NO SUPABASE ===");

  let sql = null;
  for (const cfg of configs) {
    try {
      console.log(`Conectando em ${cfg.host}:${cfg.port}...`);
      const client = postgres({
        ...cfg,
        ssl: { rejectUnauthorized: false },
        connect_timeout: 10,
        max: 1,
      });
      // Test query
      await client`SELECT 1`;
      sql = client;
      console.log(`Conexão estabelecida com sucesso via porta ${cfg.port}!`);
      break;
    } catch (err) {
      console.warn(`Falha na porta ${cfg.port}: ${err.message}`);
    }
  }

  if (!sql) {
    console.error("ERRO CRÍTICO: Não foi possível conectar ao banco de dados Supabase.");
    process.exit(1);
  }

  // Create schema_migrations tracking table if supabase_migrations does not exist
  await sql.unsafe(`
    CREATE SCHEMA IF NOT EXISTS supabase_migrations;
    CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
      version text PRIMARY KEY,
      statements text[],
      name text
    );
  `);

  const appliedRows = await sql`SELECT version FROM supabase_migrations.schema_migrations`;
  const appliedSet = new Set(appliedRows.map(r => r.version));
  console.log(`Total de migrations registradas no banco: ${appliedSet.size}`);

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith(".sql"))
    .sort();

  console.log(`Total de arquivos de migration locais: ${files.length}`);

  let appliedCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    const versionMatch = file.match(/^(\d+)/);
    const version = versionMatch ? versionMatch[1] : file;

    if (appliedSet.has(version)) {
      skippedCount++;
      continue;
    }

    console.log(`\n--> Aplicando migration pendente: ${file}...`);
    const filePath = path.join(migrationsDir, file);
    let sqlContent = fs.readFileSync(filePath, "utf8");
    if (sqlContent.charCodeAt(0) === 0xfeff) {
      sqlContent = sqlContent.slice(1);
    }

    try {
      await sql.unsafe(sqlContent);
      await sql`
        INSERT INTO supabase_migrations.schema_migrations (version, name)
        VALUES (${version}, ${file})
        ON CONFLICT (version) DO NOTHING
      `;
      console.log(`✓ Migration ${file} aplicada com SUCESSO!`);
      appliedCount++;
    } catch (err) {
      console.error(`✗ Erro ao aplicar migration ${file}:`, err.message);
      // Se a tabela/coluna já existe ou erro não-fatal, registrar se seguro
      if (err.message.includes("already exists")) {
        console.warn(`[WARN] Objeto já existia, registrando como aplicada: ${version}`);
        await sql`
          INSERT INTO supabase_migrations.schema_migrations (version, name)
          VALUES (${version}, ${file})
          ON CONFLICT (version) DO NOTHING
        `;
      } else {
        console.error("Interrompendo esteira de migrations devido a erro fatal.");
        await sql.end();
        process.exit(1);
      }
    }
  }

  console.log(`\n=================================================`);
  console.log(`DEPLOY DE MIGRATIONS CONCLUÍDO!`);
  console.log(`Aplicadas agora: ${appliedCount}`);
  console.log(`Previamente aplicadas: ${skippedCount}`);
  console.log(`=================================================`);

  // Auditar tabelas essenciais
  const tables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name
  `;
  console.log(`Total de tabelas públicas no Supabase: ${tables.length}`);

  await sql.end();
}

main().catch(err => {
  console.error("Erro fatal no processo de deploy Supabase:", err);
  process.exit(1);
});
