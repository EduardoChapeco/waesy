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

async function main() {
  try {
    const archetypes = await sql`SELECT count(*) FROM synthetic_population_archetypes`;
    console.log('synthetic_population_archetypes count:', archetypes[0].count);
    const sessions = await sql`SELECT count(*) FROM simlab_focus_group_sessions`;
    console.log('simlab_focus_group_sessions count:', sessions[0].count);
    const messages = await sql`SELECT count(*) FROM simlab_focus_group_messages`;
    console.log('simlab_focus_group_messages count:', messages[0].count);
  } catch (err) {
    console.error('Check error:', err);
  } finally {
    await sql.end();
  }
}

main();
