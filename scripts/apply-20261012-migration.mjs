import postgres from "postgres";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sql = postgres({
  host: "aws-0-sa-east-1.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  username: "postgres.jfuebqmltksyznovhlwa",
  password: process.env.SUPABASE_DB_PASSWORD || (() => { throw new Error("SUPABASE_DB_PASSWORD is required"); })(),
  ssl: { rejectUnauthorized: false },
  connect_timeout: 15,
});

async function run() {
  const migrationPath = path.resolve(
    __dirname,
    "../supabase/migrations/20261012000000_concursos_identidades_checkout.sql"
  );
  const content = fs.readFileSync(migrationPath, "utf-8");

  console.log("Aplicando migration 20261012000000_concursos_identidades_checkout.sql...");
  await sql.unsafe(content);
  console.log("Migration aplicada com sucesso!");
  await sql.end();
}

run().catch((err) => {
  console.error("Erro ao aplicar migration:", err);
  process.exit(1);
});
