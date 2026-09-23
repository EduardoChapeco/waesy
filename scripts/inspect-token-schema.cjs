const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres.jfuebqmltksyznovhlwa:EEaR6399!@#2026@aws-0-sa-east-1.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');

    const tables = ['store_token_wallets', 'token_ledger_transactions', 'user_token_wallets', 'user_token_transactions', 'security_audit_events'];

    for (const table of tables) {
      console.log(`\n=================== TABLE: ${table} ===================`);
      const res = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      console.table(res.rows);
    }

    console.log('\n=================== FUNCTIONS ===================');
    const funcRes = await client.query(`
      SELECT routine_name, routine_type
      FROM information_schema.routines
      WHERE routine_schema = 'public' AND (routine_name ILIKE '%token%' OR routine_name ILIKE '%ledger%')
    `);
    console.table(funcRes.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
