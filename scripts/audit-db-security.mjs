import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const secretsPath = path.resolve(__dirname, '../.env.secrets');
let dbPassword = process.env.SUPABASE_DB_PASSWORD || '';
if (fs.existsSync(secretsPath)) {
  const content = fs.readFileSync(secretsPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('SUPABASE_DB_PASSWORD=')) {
      dbPassword = trimmed.replace('SUPABASE_DB_PASSWORD=', '').replace(/["']/g, '').trim();
    }
  }
}
if (!dbPassword) dbPassword = process.env.SUPABASE_DB_PASSWORD || (() => { throw new Error("SUPABASE_DB_PASSWORD is required"); })();

const sql = postgres({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  username: 'postgres.jfuebqmltksyznovhlwa',
  password: dbPassword,
  ssl: { rejectUnauthorized: false },
  connect_timeout: 15,
});

async function run() {
  try {
    console.log('--- 1. AUDIT: TABLES WITHOUT RLS IN PUBLIC ---');
    const noRls = await sql`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND rowsecurity = false
      ORDER BY tablename;
    `;
    console.log(`Found ${noRls.length} tables WITHOUT RLS in schema public:`);
    for (const r of noRls) {
      console.log(`  - ${r.tablename}`);
    }

    console.log('\n--- 2. AUDIT: POLICIES WITH WRITE ACCESS FOR ANON OR PUBLIC ---');
    const anonWrite = await sql`
      SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public'
        AND (
          'anon' = ANY(roles) 
          OR 'public' = ANY(roles)
        )
        AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
      ORDER BY tablename, policyname;
    `;
    console.log(`Found ${anonWrite.length} write policies allowing anon/public:`);
    for (const p of anonWrite) {
      console.log(`  - Table: [${p.tablename}] | Policy: "${p.policyname}" | Cmd: ${p.cmd} | Roles: [${p.roles.join(', ')}]`);
      if (p.with_check) console.log(`      WITH CHECK: ${p.with_check}`);
      if (p.qual) console.log(`      QUAL: ${p.qual}`);
    }

    console.log('\n--- 3. AUDIT: SENSITIVE TABLES (wallets, ledger, certificates, security logs) ---');
    const sensitive = await sql`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename IN (
          'user_token_wallets', 'store_token_wallets', 'token_ledger_transactions',
          'security_audit_events', 'security_telemetry_events', 'transaction_certificates',
          'orders', 'payment_transactions', 'profiles', 'receivables_ledger'
        );
    `;
    console.log('Sensitive tables status:');
    for (const s of sensitive) {
      console.log(`  - ${s.tablename}: rowsecurity = ${s.rowsecurity}`);
    }

    console.log('\n--- 4. AUDIT: TOTAL TABLES IN PUBLIC ---');
    const total = await sql`SELECT count(*)::int as count FROM pg_tables WHERE schemaname = 'public';`;
    console.log(`Total public tables: ${total[0].count}`);

  } catch (err) {
    console.error('Audit error:', err);
  } finally {
    await sql.end();
  }
}

run();
