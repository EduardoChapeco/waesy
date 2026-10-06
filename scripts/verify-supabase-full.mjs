import postgres from "postgres";

const sql = postgres({
  host: "aws-0-sa-east-1.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  username: "postgres.jfuebqmltksyznovhlwa",
  password: process.env.SUPABASE_DB_PASSWORD || (() => { throw new Error("SUPABASE_DB_PASSWORD is required"); })(),
  ssl: "require",
  max: 1,
});

async function main() {
  const aiTables = [
    'ai_telemetry_logs',
    'ai_response_cache',
    'ai_task_routing_rules',
    'ai_async_jobs',
    'ai_skills',
    'ai_skill_versions',
    'ai_skill_tools',
    'user_skill_settings',
    'workspace_skill_settings',
    'ai_skill_runs',
    'ai_agent_definitions',
    'ai_squad_definitions',
    'ai_squad_members',
    'ai_squad_runs',
    'ai_squad_handoffs'
  ];

  console.log("=== SUPABASE AI TABLES AUDIT ===");
  for (const t of aiTables) {
    const res = await sql`SELECT count(*)::int as c FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ${t}`;
    const exists = res[0].c > 0;
    if (exists) {
      const rows = await sql.unsafe(`SELECT count(*)::int as count FROM public."${t}"`);
      console.log(`[OK] Table ${t}: EXISTS | rows: ${rows[0].count}`);
    } else {
      console.log(`[MISSING] Table ${t}`);
    }
  }

  console.log("\n=== API KEY POOLS CIRCUIT BREAKER AUDIT ===");
  const poolCols = await sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'api_key_pools' AND column_name IN ('circuit_state', 'consecutive_failures', 'circuit_broken_until', 'window_start', 'window_request_count', 'total_requests_served')`;
  console.log("Circuit breaker columns on api_key_pools:", poolCols.map(c => c.column_name));

  const pools = await sql`SELECT id, provider, label, status, circuit_state, consecutive_failures FROM public.api_key_pools`;
  console.log("Total pools configured:", pools.length);
  pools.forEach(p => console.log(`  - [${p.provider}] ${p.label}: circuit=${p.circuit_state}, status=${p.status}`));

  await sql.end();
}

main().catch(console.error);
