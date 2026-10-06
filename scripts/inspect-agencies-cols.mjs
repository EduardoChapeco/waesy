import postgres from 'postgres';

const sql = postgres({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  username: 'postgres.jfuebqmltksyznovhlwa',
  password: process.env.SUPABASE_DB_PASSWORD || (() => { throw new Error("SUPABASE_DB_PASSWORD is required"); })(),
  ssl: { rejectUnauthorized: false },
  connect_timeout: 15,
});

async function run() {
  for (const t of ['agencies', 'bus_layouts']) {
    const cols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = ${t}
      ORDER BY ordinal_position;
    `;
    console.log(`Table ${t} columns:`, cols.map(c => c.column_name).join(', '));
  }
  await sql.end();
}
run();
