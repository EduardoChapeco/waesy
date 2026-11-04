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

const projectRef = secrets.PROJECT_REF || 'jfuebqmltksyznovhlwa';
console.log(`Projeto Alvo: ${projectRef}`);

// 2. Linkar projeto (se necessário)
try {
  console.log('\n[Passo 1/4] Verificando link do projeto remoto...');
  const linkCmd = `cmd /c npx supabase link --project-ref ${projectRef} --password "${env.SUPABASE_DB_PASSWORD}" --yes`;
  const linkOut = execSync(linkCmd, { env, encoding: 'utf8', stdio: 'pipe' });
  console.log(linkOut);
} catch (err) {
  console.log('Projeto já vinculado ou nota sobre link:', err.stdout || err.message);
}

// 3. Executar db push completo
try {
  console.log('\n[Passo 2/4] Executando db push (migrations completas)...');
  const pushCmd = `cmd /c npx supabase db push --project-ref ${projectRef} -p "${env.SUPABASE_DB_PASSWORD}" --include-all --yes`;
  const pushOut = execSync(pushCmd, { env, encoding: 'utf8', stdio: 'pipe' });
  console.log(pushOut);
} catch (err) {
  console.error('Erro no db push:', err.stderr || err.stdout || err.message);
  process.exit(1);
}

// 4. Executar deploy de Edge Functions
try {
  console.log('\n[Passo 3/4] Executando deploy de Edge Functions (--use-api)...');
  const funcCmd = `cmd /c npx supabase functions deploy --use-api --yes`;
  const funcOut = execSync(funcCmd, { env, encoding: 'utf8', stdio: 'pipe' });
  console.log(funcOut);
} catch (err) {
  console.error('Erro no deploy de funções:', err.stderr || err.stdout || err.message);
  process.exit(1);
}

// 5. Teste de conexão e verificação no banco de dados de produção
console.log('\n[Passo 4/4] Verificando integridade no banco de dados de produção...');
const sql = postgres({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  username: `postgres.${projectRef}`,
  password: env.SUPABASE_DB_PASSWORD,
  ssl: 'require',
  connect_timeout: 15,
  max: 1,
});

try {
  const [version] = await sql`SELECT version()`;
  const [tableCount] = await sql`SELECT count(*)::int as count FROM information_schema.tables WHERE table_schema = 'public'`;
  const [migrationCount] = await sql`SELECT count(*)::int as count FROM supabase_migrations.schema_migrations`;
  console.log(`✓ Conexão validada: ${version.version.slice(0, 30)}...`);
  console.log(`✓ Tabelas públicas ativas: ${tableCount.count}`);
  console.log(`✓ Migrações registradas: ${migrationCount.count}`);
  await sql.end();
} catch (dbErr) {
  console.error('Falha na verificação de banco:', dbErr.message);
  await sql.end();
  process.exit(1);
}

console.log('\n=== DEPLOY DO SUPABASE CONCLUÍDO COM SUCESSO TOTAL ===');
