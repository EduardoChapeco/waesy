import postgres from 'postgres';
const sql = postgres({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  username: 'postgres.jfuebqmltksyznovhlwa',
  password: 'EEaR6399!@#2026',
  ssl: { rejectUnauthorized: false },
});
async function inspect() {
  const info = await sql.unsafe("SELECT udt_name, data_type FROM information_schema.columns WHERE table_name = 'mined_raw_extractions' AND column_name = 'content_type'");
  console.log('Column info:', info);
  if (info.length > 0) {
    const enums = await sql.unsafe("SELECT e.enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = '" + info[0].udt_name + "'");
    console.log('Enum values:', enums.map(e => e.enumlabel));
  }
  await sql.end();
}
inspect();
