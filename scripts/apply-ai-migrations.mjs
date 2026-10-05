import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const sql = postgres({
  host: process.env.SUPABASE_DB_HOST || "aws-0-sa-east-1.pooler.supabase.com",
  port: Number(process.env.SUPABASE_DB_PORT) || 6543,
  database: process.env.SUPABASE_DB_NAME || "postgres",
  user: process.env.SUPABASE_DB_USER || "postgres.jfuebqmltksyznovhlwa",
  password: process.env.SUPABASE_DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD || (() => { throw new Error("SUPABASE_DB_PASSWORD is required"); })(),
  ssl: "require",
  max: 1,
  idle_timeout: 20,
  connect_timeout: 15,
});

const migrations = [
  'supabase/migrations/20261206000000_v142_ai_core_gateway_pools_and_telemetry.sql',
  'supabase/migrations/20261207000000_v143_ai_skills_catalog_and_execution_engine.sql',
  'supabase/migrations/20261208000000_v144_ai_agents_and_squads_orchestration.sql'
];

async function main() {
  console.log('=== APLICANDO MIGRAÇÕES DIRETAMENTE AO POSTGRES SUPABASE ===\n');

  try {
    const versionRes = await sql`SELECT version();`;
    console.log('Conectado com sucesso ao Supabase PostgreSQL:', versionRes[0].version.slice(0, 40));

    for (const mPath of migrations) {
      console.log(`\nExecutando migration: ${path.basename(mPath)}...`);
      const fileContent = fs.readFileSync(mPath, 'utf8');
      await sql.unsafe(fileContent);
      console.log(`   ✓ Aplicada com sucesso: ${path.basename(mPath)}`);
    }

    console.log('\n--- VERIFICANDO TABELAS NO SCHEMA PUBLIC ---');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'ai_telemetry_logs', 'ai_response_cache', 'ai_task_routing_rules', 'ai_async_jobs',
        'ai_skills', 'ai_skill_versions', 'ai_skill_tools', 'user_skill_settings', 'workspace_skill_settings', 'ai_skill_runs',
        'ai_agent_definitions', 'ai_squad_definitions', 'ai_squad_members', 'ai_squad_runs', 'ai_squad_handoffs'
      )
      ORDER BY table_name;
    `;
    console.log(`Total de tabelas verificadas: ${tables.length}`);
    for (const t of tables) {
      console.log(`   ✓ Tabela confirmada: ${t.table_name}`);
    }

    const keyPoolsCols = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'api_key_pools' 
      AND column_name IN ('circuit_state', 'status', 'consecutive_failures', 'circuit_broken_until');
    `;
    console.log('\nColunas de Circuit Breaker na api_key_pools:', keyPoolsCols.map(c => c.column_name));

  } catch (err) {
    console.error('Erro na conexão/execução do Postgres:', err);
  } finally {
    await sql.end();
  }
}

main();
