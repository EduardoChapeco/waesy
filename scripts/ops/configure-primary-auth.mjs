#!/usr/bin/env node
/**
 * configure-primary-auth.mjs — Configura Auth (site_url, redirect URLs) no PRIMARY via Management API
 * e cria/promove o usuário admin inicial se ADMIN_EMAIL + ADMIN_PASSWORD forem passados por ambiente.
 * Nunca grava senhas em disco.
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = new Map();
for (const line of fs.readFileSync(".env.secrets", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
  if (m) env.set(m[1], m[2].trim().replace(/^["']|["']$/g, ""));
}

const ref = env.get("SUPABASE_PRIMARY_REF");
const token = env.get("SUPABASE_PRIMARY_ACCESS_TOKEN");
const url = env.get("SUPABASE_PRIMARY_URL");
const serviceKey = env.get("SUPABASE_PRIMARY_SERVICE_ROLE_KEY");
if (!ref || !token || !url || !serviceKey) throw new Error("Credenciais SUPABASE_PRIMARY_* ausentes em .env.secrets");

const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

// 1. Atualiza site_url e allow list de redirects
const patchRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: "PATCH",
  headers: H,
  body: JSON.stringify({
    site_url: "https://waesy.com.br",
    uri_allow_list: "https://waesy.com.br/**,https://www.waesy.com.br/**,https://usewaesy.pages.dev/**,http://localhost:3000/**,http://127.0.0.1:3000/**",
  }),
});
const patchBody = await patchRes.json().catch(() => ({}));
console.log("PATCH auth config:", patchRes.status, {
  site_url: patchBody.site_url,
  uri_allow_list: patchBody.uri_allow_list,
});

// 2. Cria/atualiza admin inicial se fornecido via env
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
if (adminEmail && adminPassword) {
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: listData, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (listErr) throw listErr;
  let user = listData.users.find((u) => u.email?.toLowerCase() === adminEmail.toLowerCase());
  if (!user) {
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { full_name: "Admin Master Waesy", role: "admin_master" },
    });
    if (createErr) throw createErr;
    user = created.user;
    console.log("Auth user created:", user.id, user.email);
  } else {
    const { data: updated, error: updErr } = await admin.auth.admin.updateUserById(user.id, {
      password: adminPassword,
      email_confirm: true,
    });
    if (updErr) throw updErr;
    user = updated.user;
    console.log("Auth user updated:", user.id, user.email);
  }

  // Promover na tabela profiles
  const { error: profErr } = await admin
    .from("profiles")
    .upsert(
      {
        id: user.id,
        full_name: "Admin Master Waesy",
        role: "admin_master",
        is_verified: true,
      },
      { onConflict: "id" },
    );
  if (profErr) console.warn("Profile upsert warning:", profErr.message);
  else console.log("Profile promoted to admin_master:", user.id);
}
