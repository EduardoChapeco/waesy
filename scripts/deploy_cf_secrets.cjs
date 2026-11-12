const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env.secrets");
const rootEnvPath = path.resolve(__dirname, "../.env");
const vars = {};

function loadEnvFile(filePath) {
  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, "utf8");
    raw.split("\n").forEach((l) => {
      const m = l.trim().match(/^([^=]+)=(.*)$/);
      if (m && !m[1].startsWith("#")) {
        vars[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "");
      }
    });
  }
}

loadEnvFile(rootEnvPath);
loadEnvFile(envPath);

const projectName = process.argv[2] || process.env.CF_PAGES_PROJECT || "usewaesy";

console.log("==================================================");
console.log(` Sincronizando Secrets com Cloudflare Pages (${projectName})`);
console.log("==================================================");

const secretsToPush = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "VITE_SITE_URL",
  "JWT_SECRET",
  "VAULT_MASTER_KEY",
  "EVOLUTION_API_URL",
  "EVOLUTION_API_KEY",
];

// Assegura que SUPABASE_URL e SUPABASE_ANON_KEY existam no payload
vars["SUPABASE_URL"] = vars["VITE_SUPABASE_URL"] || "https://jfuebqmltksyznovhlwa.supabase.co";
vars["SUPABASE_ANON_KEY"] = vars["VITE_SUPABASE_ANON_KEY"];
vars["VITE_SITE_URL"] = vars["VITE_SITE_URL"] || "https://usewaesy.pages.dev";
vars["EVOLUTION_API_URL"] = vars["EVOLUTION_API_URL"] || "https://feb-genre-kathy-indicator.trycloudflare.com";
vars["EVOLUTION_API_KEY"] = vars["EVOLUTION_API_KEY"] || "WaesyApiKey_Master_2026_WhatsApp";

if (!vars["JWT_SECRET"]) {
  const secretsJsonPath = path.resolve(__dirname, "../.secrets.json");
  if (fs.existsSync(secretsJsonPath)) {
    try {
      const secJson = JSON.parse(fs.readFileSync(secretsJsonPath, "utf8"));
      vars["JWT_SECRET"] = secJson.JWT_SECRET || vars["JWT_SECRET"];
    } catch (e) {}
  }
}

for (const key of secretsToPush) {
  const val = vars[key];
  if (val) {
    console.log(`\n-> Injetando secret: ${key}...`);
    try {
      execSync(`npx wrangler pages secret put ${key} --project-name ${projectName}`, {
        input: `${val}\n`,
        stdio: ["pipe", "inherit", "inherit"],
        shell: true,
      });
      console.log(`   ✓ Secret ${key} atualizada com sucesso!`);
    } catch (e) {
      console.warn(`   ! Aviso ao atualizar secret ${key}:`, e.message);
    }
  }
}

console.log("\n==================================================");
console.log(" Sincronização de Secrets Concluída!");
console.log("==================================================");
