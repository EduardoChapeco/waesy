import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || (() => { throw new Error("DATABASE_URL or SUPABASE_DB_URL is required"); })() });

async function run() {
  const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders' ORDER BY ordinal_position");
  console.log('orders cols:', cols.rows.map(r => r.column_name).join(', '));
  
  const fks = await pool.query(`
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name 
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name 
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'orders'
  `);
  console.log('orders fks:', fks.rows);

  const excols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'exchanges' ORDER BY ordinal_position");
  console.log('exchanges cols:', excols.rows.map(r => r.column_name).join(', '));

  const exfks = await pool.query(`
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name 
    FROM information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name 
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name 
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'exchanges'
  `);
  console.log('exchanges fks:', exfks.rows);

  await pool.end();
}
run();
