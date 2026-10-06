import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

const sql = postgres({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  username: 'postgres.jfuebqmltksyznovhlwa',
  password: process.env.SUPABASE_DB_PASSWORD || (() => { throw new Error("SUPABASE_DB_PASSWORD is required"); })(),
  ssl: { rejectUnauthorized: false },
  connect_timeout: 20,
});

async function main() {
  console.log('--- Applying Migration 20261014000000_rls_security_hardening_confidential_tables.sql ---');
  const migrationSql = fs.readFileSync(
    path.join(process.cwd(), 'supabase/migrations/20261014000000_rls_security_hardening_confidential_tables.sql'),
    'utf-8'
  );

  try {
    await sql.unsafe(migrationSql);
    console.log('Migration applied successfully!');

    // Verify policies
    const pols = await sql`
      SELECT tablename, policyname, cmd, qual, with_check 
      FROM pg_policies 
      WHERE schemaname = 'public' 
        AND tablename IN ('company_documents', 'studio_projects', 'contract_templates', 'store_floor_plans')
      ORDER BY tablename, policyname;
    `;
    console.log('Verified Policies:\n', JSON.stringify(pols, null, 2));
  } catch (err) {
    console.error('Failed to apply migration:', err);
  } finally {
    await sql.end();
  }
}

main();
