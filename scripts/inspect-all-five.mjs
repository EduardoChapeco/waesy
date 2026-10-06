import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || (() => { throw new Error("DATABASE_URL or SUPABASE_DB_URL is required"); })() });

async function checkTable(table) {
  const q = await pool.query(
    "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = $1 ORDER BY ordinal_position",
    [table]
  );
  console.log(`\n=== TABLE: ${table} (${q.rows.length} columns) ===`);
  console.log(q.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));
}

async function listRelatedTables(prefix) {
  const q = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name ILIKE $1",
    [`%${prefix}%`]
  );
  return q.rows.map(r => r.table_name);
}

async function run() {
  await checkTable('exchanges');
  await checkTable('orders');

  console.log('\n--- Financial Tables ---');
  const finTables = await listRelatedTables('receiv');
  console.log('Receivables tables:', finTables);
  for (const t of finTables) await checkTable(t);

  const walletTables = await listRelatedTables('wallet');
  console.log('Wallet tables:', walletTables);
  for (const t of walletTables) await checkTable(t);

  console.log('\n--- Concursos / Sorteios Tables ---');
  const concTables = await listRelatedTables('concurso');
  console.log('Concurso tables:', concTables);
  for (const t of concTables) await checkTable(t);

  console.log('\n--- Cart Tables ---');
  const cartTables = await listRelatedTables('cart');
  console.log('Cart tables:', cartTables);
  for (const t of cartTables) await checkTable(t);

  console.log('\n--- Directory Tables ---');
  const dirTables = await listRelatedTables('director');
  console.log('Directory tables:', dirTables);
  for (const t of dirTables) await checkTable(t);

  await pool.end();
}

run().catch(console.error);
