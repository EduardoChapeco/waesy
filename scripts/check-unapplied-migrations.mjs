import postgres from "postgres";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const secretsPath = path.resolve(__dirname, "../.env.secrets");
let password = process.env.SUPABASE_DB_PASSWORD || (() => { throw new Error("SUPABASE_DB_PASSWORD is required"); })();
if (fs.existsSync(secretsPath)) {
  const content = fs.readFileSync(secretsPath, "utf8");
  const match = content.match(/SUPABASE_DB_PASSWORD=(.*)/);
  if (match) password = match[1].replace(/["']/g, "").trim();
}

async function check() {
  const sql = postgres({
    host: "aws-0-sa-east-1.pooler.supabase.com",
    port: 6543,
    database: "postgres",
    username: "postgres.jfuebqmltksyznovhlwa",
    password,
    ssl: { rejectUnauthorized: false }
  });

  const rows = await sql`SELECT version FROM supabase_migrations.schema_migrations`;
  const applied = new Set(rows.map(r => r.version));
  const files = fs.readdirSync(path.resolve(__dirname, "../supabase/migrations"))
    .filter(f => f.endsWith(".sql"))
    .sort();

  const unapplied = files.filter(f => {
    const v = f.match(/^(\d+)/);
    return !applied.has(v ? v[1] : f);
  });

  console.log("Applied count:", applied.size);
  console.log("Unapplied count:", unapplied.length);
  console.log("Unapplied list:\n", unapplied.join("\n"));

  // Check columns of synthetic_population_archetypes
  const archCols = await sql`
    SELECT column_name, is_nullable, column_default 
    FROM information_schema.columns 
    WHERE table_name = 'synthetic_population_archetypes'
    ORDER BY ordinal_position;
  `;
  console.log("Archetypes cols:", archCols);

  await sql.end();
}

check().catch(console.error);
