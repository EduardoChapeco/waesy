/**
 * scripts/test-sync-tenders.cjs — V143 Anti-Mock Tender Verification
 *
 * Sem credenciais hardcoded e sem editais sintéticos.
 */
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const fs = require("fs");

if (fs.existsSync(".env.local")) dotenv.config({ path: ".env.local" });
if (fs.existsSync(".env")) dotenv.config({ path: ".env" });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ERRO: Variáveis SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function run() {
  const { count } = await supabase.from("mined_tenders").select("*", { count: "exact", head: true });
  console.log("Total de editais reais em mined_tenders:", count || 0);
}

run().catch(console.error);
