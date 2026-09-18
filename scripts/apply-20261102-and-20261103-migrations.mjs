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

const sqlPath1 = path.resolve(__dirname, "../supabase/migrations/20261102000000_central_knowledge_vehicles_services_and_cities.sql");
const sqlContent1 = fs.readFileSync(sqlPath1, "utf8");

const sqlPath2 = path.resolve(__dirname, "../supabase/migrations/20261103000000_financial_institutions_and_countries.sql");
const sqlContent2 = fs.readFileSync(sqlPath2, "utf8");

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
      
      console.log("Query OK! Aplicando migration 20261102000000 (Veículos, Serviços e Cidades)...");
      await sql.unsafe(sqlContent1);
      console.log("Migration 20261102000000 aplicada com sucesso!");

      console.log("Aplicando migration 20261103000000 (Instituições Financeiras e Países)...");
      await sql.unsafe(sqlContent2);
      console.log("Migration 20261103000000 aplicada com sucesso!");

      await sql.end();
      success = true;
      break;
    } catch (err) {
      console.error(`Falha ao conectar/aplicar em ${cfg.port}:`, err.message);
    }
  }

  if (!success) {
    console.error("Não foi possível aplicar as migrations em nenhuma porta.");
    process.exit(1);
  }
}

run();
