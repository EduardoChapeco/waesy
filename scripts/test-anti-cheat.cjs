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
  const testStoreId = '32233049-07c6-49bf-a053-989824fef385';

  console.log('Simulating attacker tampering wallet balance to 999999...');
  await client.query('UPDATE store_token_wallets SET balance = 999999 WHERE store_id = $1', [testStoreId]);

  console.log('Triggering tollbooth charge...');
  const res = await client.query(`
    SELECT public.charge_token_tollbooth(
      $1::uuid,
      10,
      'burn_ai_curate',
      'Tentativa de Gastar Saldo Hackeado',
      'tamper_test_01'
    )
  `, [testStoreId]);
  console.log('Tollbooth response:', res.rows[0].charge_token_tollbooth);

  const wallet = await client.query('SELECT is_locked, lock_reason, balance FROM store_token_wallets WHERE store_id = $1', [testStoreId]);
  console.log('Wallet state after tollbooth interceptor:', wallet.rows[0]);

  const secEvents = await client.query('SELECT severity, event_type, details FROM security_audit_events ORDER BY created_at DESC LIMIT 1');
  console.log('Security Audit Event logged:', secEvents.rows[0]);

  // Clean up and restore correct state for the test store
  console.log('Restoring correct balance...');
  await client.query('UPDATE store_token_wallets SET balance = 50000, is_locked = false, lock_reason = null WHERE store_id = $1', [testStoreId]);
  const restoredSolv = await client.query('SELECT public.verify_and_reconcile_store_wallet($1::uuid)', [testStoreId]);
  console.log('Restored Solvency:', restoredSolv.rows[0].verify_and_reconcile_store_wallet);

  await client.end();
}

run().catch(console.error);
