const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const client = new Client({
    host: 'aws-0-sa-east-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.jfuebqmltksyznovhlwa',
    password: 'EEaR6399!@#2026',
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to database. Applying migration...');

    const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '20261117000000_bank_grade_token_ledger_and_tollbooth.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await client.query(sql);
    console.log('Migration applied successfully!');

    // Test solvency check on the cluster
    const solvency = await client.query('SELECT public.reconcile_platform_token_solvency()');
    console.log('Solvency check result:', JSON.stringify(solvency.rows[0].reconcile_platform_token_solvency, null, 2));

    // Inspect wallets and ledger transactions
    const wallets = await client.query('SELECT * FROM store_token_wallets');
    console.log('Store Wallets count:', wallets.rows.length);
    console.table(wallets.rows.map(w => ({
      store_id: w.store_id,
      balance: w.balance,
      promotional: w.promotional_balance,
      purchased: w.purchased_balance,
      is_locked: w.is_locked,
      seal: w.last_integrity_hash?.slice(0, 16) + '...'
    })));

    const txs = await client.query('SELECT id, store_id, amount, balance_after, action_type, tamper_seal FROM token_ledger_transactions');
    console.log('Ledger Transactions count:', txs.rows.length);
    console.table(txs.rows.map(t => ({
      store_id: t.store_id,
      amount: t.amount,
      balance_after: t.balance_after,
      action: t.action_type,
      seal: t.tamper_seal?.slice(0, 16) + '...'
    })));

  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
