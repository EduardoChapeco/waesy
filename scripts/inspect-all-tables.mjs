import pg from 'pg';

const client = new pg.Client({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.jfuebqmltksyznovhlwa',
  password: 'EEaR6399!@#2026',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    console.log('✅ Connected to live PostgreSQL database pooler');

    // 1. List all public tables
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`\n--- ALL PUBLIC TABLES (${tables.length}) ---`);
    console.log(JSON.stringify(tables, null, 2));

    // 2. Row count and column details for key modules
    const keyTables = [
      'stores', 'profiles', 'products', 'orders', 'order_items',
      'classified_ads', 'classified_categories', 'directory_listings',
      'travel_proposals', 'travel_quotes', 'travel_packages',
      'gov_tenders', 'mined_lawsuits', 'affiliate_links', 'token_wallets',
      'token_ledger_entries', 'leads', 'pos_orders'
    ];

    console.log('\n--- KEY TABLE ROW COUNTS & EXISTENCE ---');
    for (const t of keyTables) {
      if (tables.includes(t)) {
        try {
          const countRes = await client.query(`SELECT count(*)::int as cnt FROM public."${t}";`);
          console.log(`  ✓ ${t}: ${countRes.rows[0].cnt} rows`);
        } catch (e) {
          console.log(`  ⚠️ ${t}: query failed (${e.message})`);
        }
      } else {
        console.log(`  ✗ ${t}: NOT FOUND in public schema`);
      }
    }

    // 3. Inspect Foreign Keys
    const fksRes = await client.query(`
      SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public'
      ORDER BY tc.table_name, kcu.column_name;
    `);
    console.log(`\n--- FOREIGN KEY RELATIONSHIPS COUNT: ${fksRes.rows.length} ---`);
    
    // Group FKs by table
    const fksByTable = {};
    for (const r of fksRes.rows) {
      if (!fksByTable[r.table_name]) fksByTable[r.table_name] = [];
      fksByTable[r.table_name].push(`${r.column_name} -> ${r.foreign_table_name}.${r.foreign_column_name}`);
    }
    console.log('Sample Foreign Key groupings:', Object.entries(fksByTable).slice(0, 10));

  } catch (err) {
    console.error('Error querying schema:', err);
  } finally {
    await client.end();
  }
}

main();
