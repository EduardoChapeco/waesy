import pg from 'pg';
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || (() => { throw new Error("DATABASE_URL or SUPABASE_DB_URL is required"); })() });

async function run() {
  const tables = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
  );
  const matched = tables.rows
    .map(r => r.table_name)
    .filter(t => /raffle|concurs|sorteio|giveaway|contest|prêmio|premio/i.test(t));
  console.log('Matched contest tables:', matched);

  for (const t of matched) {
    const cols = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1",
      [t]
    );
    console.log(`\nTable ${t}:`, cols.rows.map(c => `${c.column_name} (${c.data_type})`).join(', '));
  }

  await pool.end();
}

run();
