import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

console.log('=== DEPLOY COMPLETO DO SUPABASE PARA PRODUÇÃO ===');

// 1. Carregar segredos
const secretsPath = path.join(process.cwd(), '.env.secrets');
const secrets = {};
if (fs.existsSync(secretsPath)) {
  const lines = fs.readFileSync(secretsPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      let v = match[2].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      secrets[match[1].trim()] = v;
    }
  }
}

const env = {
  ...process.env,
  ...secrets,
  SUPABASE_ACCESS_TOKEN: secrets.SUPABASE_ACCESS_TOKEN || process.env.SUPABASE_ACCESS_TOKEN,
  SUPABASE_DB_PASSWORD: secrets.SUPABASE_DB_PASSWORD || process.env.SUPABASE_DB_PASSWORD,
};

const projectRef = secrets.SUPABASE_PROJECT_REF || secrets.PROJECT_REF || 'jfuebqmltksyznovhlwa';
const accessToken = env.SUPABASE_ACCESS_TOKEN;
console.log(`Projeto Alvo: ${projectRef}`);

const apiHeaders = {
  Authorization: `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
};

async function runMgmtQuery(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: apiHeaders,
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${typeof json === 'string' ? json : JSON.stringify(json)}`);
  }
  return json;
}

// 2. Deploy de Edge Functions (--use-api)
try {
  console.log('\n[Passo 1/4] Executando deploy de Edge Functions (--use-api)...');
  const funcCmd = `cmd /c npx supabase functions deploy --project-ref ${projectRef} --use-api --yes`;
  const funcOut = execSync(funcCmd, { env, encoding: 'utf8', stdio: 'pipe' });
  console.log(funcOut);
} catch (err) {
  console.error('Erro no deploy de funções:', err.stdout || '', err.stderr || err.message);
  process.exit(1);
}

// 3. Verificação de utilização de disco e status do cluster
console.log('\n[Passo 2/4] Verificando utilização de disco (/data) e saúde do cluster...');
const rUtil = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/disk/util`, {
  headers: apiHeaders,
});
if (rUtil.ok) {
  const utilData = await rUtil.json();
  const availMb = ((utilData?.metrics?.fs_avail_bytes || 0) / (1024 * 1024)).toFixed(2);
  const usedMb = ((utilData?.metrics?.fs_used_bytes || 0) / (1024 * 1024)).toFixed(2);
  const sizeMb = ((utilData?.metrics?.fs_size_bytes || 0) / (1024 * 1024)).toFixed(2);
  console.log(`Disco /data: ${usedMb} MB usados de ${sizeMb} MB (${availMb} MB livres para postgres)`);
  if (Number(availMb) < 16) {
    console.error(
      `\n[BLOQUEIO DE INFRAESTRUTURA SUPABASE] O volume /data possui apenas ${availMb} MB livres (< 16 MB exigidos para alocação de segmento WAL pg_wal/xlogtemp).`,
    );
    console.error(
      `Ação necessária no painel Supabase (https://supabase.com/dashboard/project/${projectRef}/settings/compute-and-disk): expandir o disco de 2 GB para 4+ GB (ou desativar Spend Cap em https://supabase.com/dashboard/org/iakxlpfvglyiljqiivbb/billing).`,
    );
    process.exit(1);
  }
}

// 4. Higienização preventiva de tabelas de log/telemetria e aplicação de migrations via Management API
try {
  console.log('\n[Passo 3/4] Higienizando tabelas transientes e aplicando migrações SQL...');
  await runMgmtQuery(`
    DO $$
    BEGIN
      IF to_regclass('cron.job_run_details') IS NOT NULL THEN
        EXECUTE 'DELETE FROM cron.job_run_details WHERE start_time < now() - interval ''3 days''';
      END IF;
      IF to_regclass('net._http_response') IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE net._http_response';
      END IF;
      IF to_regclass('public.system_error_logs') IS NOT NULL THEN
        EXECUTE 'DELETE FROM public.system_error_logs WHERE created_at < now() - interval ''7 days''';
      END IF;
    END $$;
  `);

  const appliedRows = await runMgmtQuery(
    `SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;`,
  );
  const appliedVersions = new Set(appliedRows.map((r) => String(r.version)));
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  const localFiles = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
  const pendingFiles = localFiles.filter((f) => !appliedVersions.has(f.split('_')[0]));

  console.log(`Migrações locais: ${localFiles.length} | Aplicadas: ${appliedRows.length} | Pendentes: ${pendingFiles.length}`);

  for (const file of pendingFiles) {
    const ver = file.split('_')[0];
    const name = file.replace(/^\d+_/, '').replace(/\.sql$/, '').replace(/'/g, "''");
    let content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
    console.log(`-> Aplicando ${file}...`);
    await runMgmtQuery(content);
    await runMgmtQuery(
      `INSERT INTO supabase_migrations.schema_migrations (version, name, statements) VALUES ('${ver}', '${name}', ARRAY[]::text[]) ON CONFLICT (version) DO NOTHING;`,
    );
    console.log(`✓ ${file} aplicada.`);
  }

  await runMgmtQuery(`NOTIFY pgrst, 'reload schema';`);
  console.log('✓ Schema cache do PostgREST recarregado.');
} catch (err) {
  console.error('Erro na sincronização SQL:', err.message);
  process.exit(1);
}

// 5. Verificação final
console.log('\n[Passo 4/4] Verificando integridade no banco de dados de produção...');
try {
  const [stats] = await runMgmtQuery(`
    SELECT
      version() AS pg_version,
      (SELECT count(*)::int FROM information_schema.tables WHERE table_schema = 'public') AS table_count,
      (SELECT count(*)::int FROM supabase_migrations.schema_migrations) AS migration_count;
  `);
  console.log(`✓ Conexão validada: ${String(stats.pg_version).slice(0, 40)}...`);
  console.log(`✓ Tabelas públicas ativas: ${stats.table_count}`);
  console.log(`✓ Migrações registradas: ${stats.migration_count}`);
} catch (dbErr) {
  console.error('Falha na verificação de banco:', dbErr.message);
  process.exit(1);
}

console.log('\n=== DEPLOY DO SUPABASE CONCLUÍDO COM SUCESSO TOTAL ===');
