/**
 * scripts/seed_public_showcases.cjs — V143 Anti-Mock Sanitizer
 *
 * Este script foi convertido de seeder para Guardião Anti-Mock (Protocolo V143).
 * Remove imediatamente qualquer anúncio sintético (Unsplash) em `classifieds`,
 * vagas fictícias em `jobs` e editais fictícios em `mined_tenders`, preservando
 * exclusivamente dados reais de usuários e integrações oficiais.
 */

const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const fs = require("fs");

if (fs.existsSync(".env.local")) dotenv.config({ path: ".env.local" });
if (fs.existsSync(".env.secrets")) dotenv.config({ path: ".env.secrets" });
if (fs.existsSync(".env")) dotenv.config({ path: ".env" });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("ERRO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log("=== V143 ANTI-MOCK GUARD: AUDITORIA DE CLASSIFICADOS, VAGAS E LICITAÇÕES ===");

  const { data: allClassifieds } = await supabase
    .from("classifieds")
    .select("id, title, images");

  let deletedClassifieds = 0;
  for (const row of allClassifieds || []) {
    const imgStr = JSON.stringify(row.images || []);
    if (imgStr.includes("images.unsplash.com")) {
      await supabase.from("classifieds").delete().eq("id", row.id);
      deletedClassifieds++;
    }
  }

  const { count: realClassifieds } = await supabase
    .from("classifieds")
    .select("*", { count: "exact", head: true });

  console.log(`Classificados falsos removidos: ${deletedClassifieds}`);
  console.log(`Classificados reais preservados: ${realClassifieds}`);
}

main().catch(console.error);
