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
  const profiles = await sql`
    SELECT * 
    FROM profiles 
    WHERE username = 'eduardo';
  `;
  console.log('--- PROFILES ---');
  console.log(JSON.stringify(profiles[0], null, 2));

  const creators = await sql`
    SELECT *
    FROM creator_profiles
    WHERE user_id = ${profiles[0]?.id};
  `;
  console.log('--- CREATOR PROFILES ---');
  console.log(JSON.stringify(creators, null, 2));

  await sql.end();
}
run();
