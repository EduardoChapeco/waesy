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
  const scoresCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'invite_scores'`;
  console.log('invite_scores columns:', scoresCols.map(c => c.column_name));

  const rafflesCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'raffles'`;
  console.log('raffles columns:', rafflesCols.map(c => c.column_name));

  const creatorCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'creator_profiles'`;
  console.log('creator_profiles columns:', creatorCols.map(c => c.column_name));

  await sql.end();
}
run();
