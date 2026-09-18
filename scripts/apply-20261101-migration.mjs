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

const sqlPath = path.resolve(__dirname, "../supabase/migrations/20261101000000_central_knowledge_and_master_catalog_expansion.sql");
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
      console.log("Query OK! Aplicando migration 20261101000000...");
      await sql.unsafe(sqlContent);
      console.log("Migration 20261101000000 aplicada com sucesso!");
      await sql.end();
      success = true;
      break;
    } catch (err) {
      console.error(`Falha ao aplicar via ${cfg.host}:${cfg.port}:`, err.message);
    }
  }

  if (!success) {
    console.error("Não foi possível conectar em nenhum pooler.");
    process.exit(1);
  }
}

run();
