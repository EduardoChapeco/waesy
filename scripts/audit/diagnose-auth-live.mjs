import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

// Carregar variáveis de .env.secrets
const secretsPath = path.resolve(".env.secrets");
let url = process.env.VITE_SUPABASE_URL || "https://jfuebqmltksyznovhlwa.supabase.co";
let anonKey = process.env.VITE_SUPABASE_ANON_KEY || "";
let serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (fs.existsSync(secretsPath)) {
  const lines = fs.readFileSync(secretsPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const k = match[1].trim();
      let v = match[2].trim().replace(/^['"]|['"]$/g, "");
      if (k === "VITE_SUPABASE_URL" || k === "SUPABASE_URL") url = v;
      if (k === "VITE_SUPABASE_ANON_KEY" || k === "SUPABASE_ANON_KEY") anonKey = v;
      if (k === "SUPABASE_SERVICE_ROLE_KEY") serviceKey = v;
    }
  }
}

console.log("Supabase URL:", url);
console.log("Anon Key present:", Boolean(anonKey), anonKey.slice(0, 15) + "...");
console.log("Service Key present:", Boolean(serviceKey), serviceKey.slice(0, 15) + "...");

const admin = createClient(url, serviceKey);
const client = createClient(url, anonKey);

async function run() {
  console.log("\n--- TESTE 1: Conexão e Latência do Banco ---");
  const t0 = Date.now();
  const { data: stores, error: sErr } = await admin.from("stores").select("id, name, slug").limit(3);
  const latencyDb = Date.now() - t0;
  console.log(`Stores query: ${latencyDb}ms | Error:`, sErr?.message || "none", "| Rows:", stores?.length);

  console.log("\n--- TESTE 2: Listar Usuários e Perfis ---");
  const { data: profiles, error: pErr } = await admin
    .from("profiles")
    .select("id, full_name, username, role")
    .limit(5);
  console.log("Perfis encontrados:", profiles?.length, pErr?.message || "");
  console.log("Amostra perfis:", profiles);

  const { data: authUsers, error: uErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 5 });
  console.log("Auth users encontrados:", authUsers?.users?.length, uErr?.message || "");
  console.log("Amostra auth users:", authUsers?.users?.map(u => ({ id: u.id, email: u.email, confirmed: u.email_confirmed_at })));

  console.log("\n--- TESTE 3: Auditoria da View store_memberships e workspace_members ---");
  const { data: wm, error: wmErr } = await admin.from("workspace_members").select("store_id, role, profile_id").limit(5);
  console.log("workspace_members:", wm?.length, wmErr?.message || "");
}

run().catch(console.error);
