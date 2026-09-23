const { Client } = require('pg');

async function run() {
  const client = new Client({
    host: 'aws-0-sa-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.jfuebqmltksyznovhlwa',
    password: 'EEaR6399!@#2026',
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  const cols = await client.query(`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'token_ledger_transactions'
    ORDER BY ordinal_position
  `);
  console.log('--- COLUMNS ---');
  console.table(cols.rows);

  const constrs = await client.query(`
    SELECT conname, pg_get_constraintdef(oid)
    FROM pg_constraint
    WHERE conrelid = 'public.token_ledger_transactions'::regclass
  `);
  console.log('--- CONSTRAINTS ---');
  console.table(constrs.rows);

  const walletCols = await client.query(`
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'store_token_wallets'
    ORDER BY ordinal_position
  `);
  console.log('--- WALLET COLUMNS ---');
  console.table(walletCols.rows);

  await client.end();
}

run().catch(console.error);
