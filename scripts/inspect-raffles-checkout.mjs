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
  const rafflesCols = await sql`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'raffles'`;
  console.log('raffles columns:', rafflesCols.map(c => c.column_name));
  
  const ticketsCols = await sql`SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'raffle_tickets'`;
  console.log('raffle_tickets columns:', ticketsCols.map(c => c.column_name));

  const storesCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'stores'`;
  console.log('stores columns:', storesCols.map(c => c.column_name));

  const creatorCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'creator_profiles'`;
  console.log('creator_profiles columns:', creatorCols.map(c => c.column_name));

  const ordersCols = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'orders'`;
  console.log('orders columns:', ordersCols.map(c => c.column_name));

  await sql.end();
}
run();
