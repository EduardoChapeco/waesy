import postgres from "postgres";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const secretsPath = path.resolve(__dirname, "../.env.secrets");
let password = "EEaR6399!@#2026";
if (fs.existsSync(secretsPath)) {
  const content = fs.readFileSync(secretsPath, "utf8");
  const match = content.match(/SUPABASE_DB_PASSWORD=(.*)/);
  if (match) password = match[1].replace(/["']/g, "").trim();
}

async function verify() {
  const sql = postgres({
    host: "aws-0-sa-east-1.pooler.supabase.com",
    port: 6543,
    database: "postgres",
    username: "postgres.jfuebqmltksyznovhlwa",
    password,
    ssl: { rejectUnauthorized: false }
  });

  await sql.unsafe("NOTIFY pgrst, 'reload schema';");
  console.log("PostgREST schema cache reloaded!");

  const squads = await sql`SELECT count(*) FROM squad_templates`;
  const agents = await sql`SELECT count(*) FROM agent_registry`;
  const archetypes = await sql`SELECT count(*) FROM synthetic_population_archetypes`;
  const bmc = await sql`SELECT count(*) FROM store_business_model_canvas`;

  console.log("Squad templates in prod:", squads[0].count);
  console.log("Agent registry in prod:", agents[0].count);
  console.log("Synthetic archetypes in prod:", archetypes[0].count);
  console.log("BMC rows in prod:", bmc[0].count);

  await sql.end();
}

verify().catch(console.error);
