import postgres from 'postgres';
import fs from 'fs';

const sql = postgres({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  username: 'postgres.jfuebqmltksyznovhlwa',
  password: 'EEaR6399!@#2026',
  ssl: { rejectUnauthorized: false },
  connect_timeout: 15,
});

async function run() {
  const content = fs.readFileSync('supabase/migrations/20261116000000_support_tickets_rls_and_bilateral.sql', 'utf8');
  console.log('Aplicando migration 20261116000000...');
  await sql.unsafe(content);
  console.log('Migration aplicada com sucesso!');
  await sql.end();
}

run().catch(err => {
  console.error('Erro na migration:', err);
  process.exit(1);
});
