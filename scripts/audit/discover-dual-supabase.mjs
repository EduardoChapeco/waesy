import fs from "node:fs";
import postgres from "postgres";

const secrets = {};
if (fs.existsSync(".env.secrets")) {
  for (const line of fs.readFileSync(".env.secrets", "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = trimmed.match(/^([^=]+)=(.*)$/);
    if (m) {
      let v = m[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      secrets[m[1].trim()] = v;
    }
  }
}

const token = secrets.SUPABASE_ACCESS_TOKEN;

async function main() {
  console.log("=== 1. Listing Projects via Management API ===");
  const res = await fetch("https://api.supabase.com/v1/projects", {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("Projects HTTP:", res.status);
  const projects = await res.json();
  if (Array.isArray(projects)) {
    for (const p of projects) {
      console.log(`- ${p.id} | name=${p.name} | region=${p.region} | status=${p.status} | org=${p.organization_id}`);
    }
  }

  for (const ref of ["wlqumhiwkvmxzvgfgbyj", "wlxapubsesiwtxzbuygt"]) {
    console.log(`\n=== 2. Checking project ${ref} ===`);
    const r = await fetch(`https://api.supabase.com/v1/projects/${ref}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("Project info HTTP:", r.status, await r.text());

    const rKeys = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log("API keys HTTP:", rKeys.status);
    if (rKeys.ok) {
      const keys = await rKeys.json();
      for (const k of keys) {
        console.log(`  Key ${k.name}: ${(k.api_key || "").slice(0, 24)}...`);
      }
    }

    const rRest = await fetch(`https://${ref}.supabase.co/rest/v1/`, { method: "HEAD" }).catch((e) => ({ status: e.message }));
    console.log(`HTTPS https://${ref}.supabase.co/rest/v1/ =>`, rRest.status);
  }

  // Test Postgres connection to wlxapubsesiwtxzbuygt with [REDACTED_PASSWORD] across regions
  const pw = "[REDACTED_PASSWORD]";
  const regions = [
    "aws-0-sa-east-1.pooler.supabase.com",
    "aws-0-us-east-1.pooler.supabase.com",
    "aws-0-us-east-2.pooler.supabase.com",
    "aws-0-us-west-1.pooler.supabase.com",
    "aws-0-ca-central-1.pooler.supabase.com",
    "aws-0-eu-central-1.pooler.supabase.com",
  ];
  for (const ref of ["wlxapubsesiwtxzbuygt", "wlqumhiwkvmxzvgfgbyj"]) {
    // Also try direct db.<ref>.supabase.co
    for (const host of [`db.${ref}.supabase.co`, ...regions]) {
      const user = host.startsWith("db.") ? "postgres" : `postgres.${ref}`;
      const port = host.startsWith("db.") ? 5432 : 6543;
      const sql = postgres({
        host,
        port,
        database: "postgres",
        username: user,
        password: pw,
        ssl: "require",
        connect_timeout: 5,
        max: 1,
      });
      try {
        const [row] = await sql`SELECT current_database() as db, inet_server_addr()::text as addr, version() as v`;
        console.log(`SUCCESS CONNECTING TO ${ref} via ${host}:${port} =>`, row.db, row.v.slice(0, 35));
        const tables = await sql`SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema IN ('public', 'storage', 'auth') ORDER BY table_schema, table_name`;
        console.log(`Tables in ${ref}:`, tables.length);
        const publicTables = tables.filter(t => t.table_schema === 'public').map(t => t.table_name);
        console.log(`Public tables in ${ref} (${publicTables.length}):`, publicTables.slice(0, 30));
        const [dbSize] = await sql`SELECT pg_size_pretty(pg_database_size(current_database())) as sz`;
        console.log(`DB size in ${ref}:`, dbSize.sz);
        await sql.end();
        break;
      } catch (e) {
        await sql.end().catch(() => {});
        if (!/Tenant or user not found|ENOTFOUND|ETIMEDOUT/i.test(e.message)) {
          console.log(`  [${ref} @ ${host}] ${e.message}`);
        }
      }
    }
  }
}

main().catch(console.error);
