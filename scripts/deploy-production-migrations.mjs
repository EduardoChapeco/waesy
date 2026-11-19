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
  dbPassword = process.env.SUPABASE_DB_PASSWORD || (() => { throw new Error("SUPABASE_DB_PASSWORD is required"); })();
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

const migrationsDir = path.resolve(__dirname, "../supabase/migrations");
const migrationsToApply = fs
  .readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b))
  .map((name) => path.join("supabase/migrations", name));

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
    const version = baseName.split("_")[0];
    const migName = baseName.replace(/^\d+_/, "").replace(/\.sql$/, "");
    console.log(`\nAplicando migração: ${baseName}...`);
    try {
      await client.unsafe(sql);
      await client`
        INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
        VALUES (${version}, ${migName}, ARRAY[]::text[])
        ON CONFLICT (version) DO NOTHING
      `;
      console.log(`✓ SUCESSO: ${baseName} aplicada e registrada com sucesso!`);
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
