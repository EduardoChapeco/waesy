const { Client } = require('pg');

async function testTollbooth() {
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

  console.log('=== TEST 1: Charge Tollbooth 50 tokens for AI Curation ===');
  const res1 = await client.query(`
    SELECT public.charge_token_tollbooth(
      $1::uuid,
      50,
      'burn_ai_curate',
      'Curadoria de Notícia com IA (SEO e Fact-Checking)',
      'test_idemp_001',
      'internal_media',
      5,
      '{"article_id": "art_123"}'::jsonb
    )
  `, [testStoreId]);
  console.log('Charge 1 result:', res1.rows[0].charge_token_tollbooth);

  console.log('\n=== TEST 2: Idempotent Replay of Charge 1 ===');
  const res2 = await client.query(`
    SELECT public.charge_token_tollbooth(
      $1::uuid,
      50,
      'burn_ai_curate',
      'Curadoria de Notícia com IA (SEO e Fact-Checking)',
      'test_idemp_001',
      'internal_media',
      5,
      '{"article_id": "art_123"}'::jsonb
    )
  `, [testStoreId]);
  console.log('Replay result:', res2.rows[0].charge_token_tollbooth);

  console.log('\n=== TEST 3: Solvency Check after Charge ===');
  const solv = await client.query('SELECT public.verify_and_reconcile_store_wallet($1::uuid)', [testStoreId]);
  console.log('Store Solvency:', solv.rows[0].verify_and_reconcile_store_wallet);

  console.log('\n=== TEST 4: Attempt Insufficient Tokens (999,999) ===');
  const res3 = await client.query(`
    SELECT public.charge_token_tollbooth(
      $1::uuid,
      999999,
      'burn_batch_crawl',
      'Extração Massiva',
      'test_idemp_002',
      'internal_media',
      10,
      '{}'::jsonb
    )
  `, [testStoreId]);
  console.log('Insufficient tokens result:', res3.rows[0].charge_token_tollbooth);

  console.log('\n=== TEST 5: Strict Credit of Tokens via Admin Grant ===');
  const creditRes = await client.query(`
    SELECT public.credit_store_tokens_strict(
      $1::uuid,
      50,
      'master_admin_grant',
      'ADMIN_RECONCILIATION_TEST',
      'Compensação de Teste',
      'test_credit_idemp_001',
      false,
      '{"test": true}'::jsonb
    )
  `, [testStoreId]);
  console.log('Credit result:', creditRes.rows[0].credit_store_tokens_strict);

  const finalSolv = await client.query('SELECT public.verify_and_reconcile_store_wallet($1::uuid)', [testStoreId]);
  console.log('Final Solvency after credit:', finalSolv.rows[0].verify_and_reconcile_store_wallet);

  await client.end();
}

testTollbooth().catch(console.error);
