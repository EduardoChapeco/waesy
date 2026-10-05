import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const secretsPath = path.resolve(".env.secrets");
let url = "https://jfuebqmltksyznovhlwa.supabase.co";
let anonKey = "";
let serviceKey = "";

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

const admin = createClient(url, serviceKey);
const anon = createClient(url, anonKey);

async function test() {
  console.log("--- TESTANDO RESOLUÇÃO DE IDENTIFICADOR ---");
  const identifier = "meuwider@gmail.com";
  
  // Teste 1: Buscar auth user
  const { data: listData } = await admin.auth.admin.listUsers();
  const foundUser = listData.users.find(u => u.email === identifier);
  console.log("Auth user encontrado:", foundUser?.id, foundUser?.email);

  // Teste 2: Buscar profile
  if (foundUser) {
    const { data: prof, error: pErr } = await admin
      .from("profiles")
      .select("*")
      .eq("id", foundUser.id)
      .maybeSingle();
    console.log("Profile encontrado:", prof?.id, prof?.full_name, prof?.role, pErr?.message || "");

    // Teste 3: workspace_members
    const { data: wm } = await admin.from("workspace_members").select("*").eq("profile_id", foundUser.id);
    console.log("workspace_members para este user:", wm);
  }

  // Teste 4: Verificar se a tabela session_audit_logs ou device_registry existe
  console.log("\n--- TESTANDO TABELAS DE AUDITORIA ---");
  const { data: audit, error: aErr } = await admin.from("session_audit_logs").select("id").limit(1);
  console.log("session_audit_logs:", aErr?.message || "OK");

  const { data: sa, error: saErr } = await admin.from("device_registry").select("id").limit(1);
  console.log("device_registry:", saErr?.message || "OK");

  // Teste 5: Verificar rate limiting ou bloqueios
  const { data: rl, error: rlErr } = await admin.from("login_attempts").select("id").limit(1);
  console.log("login_attempts table:", rlErr?.message || "OK");
}

test().catch(console.error);
