import postgres from "postgres";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carrega .env.secrets se existir
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

const sqlPath = path.resolve(__dirname, "../supabase/migrations/20261010000000_creator_showcase_cms_and_brand_events.sql");
const sqlContent = fs.readFileSync(sqlPath, "utf8");

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

async function run() {
  let success = false;
  for (const cfg of configs) {
    console.log(`Tentando conectar em ${cfg.host}:${cfg.port}...`);
    try {
      const sql = postgres({
        ...cfg,
        ssl: { rejectUnauthorized: false },
        connect_timeout: 15,
      });

      console.log("Conectado! Testando query...");
      await sql`SELECT 1`;
      console.log("Query OK! Aplicando migration 20261010000000...");
      await sql.unsafe(sqlContent);
      console.log("Migration 20261010000000 aplicada com sucesso!");
      await sql.end();
      success = true;
      break;
    } catch (err) {
      console.warn(`Falha na porta ${cfg.port}:`, err.message);
    }
  }

  if (!success) {
    console.error("Não foi possível aplicar a migration em nenhuma das portas.");
    process.exit(1);
  }
}

run();
