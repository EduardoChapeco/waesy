import postgres from "postgres";

const sql = postgres({
  host: "aws-0-sa-east-1.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  username: "postgres.jfuebqmltksyznovhlwa",
  password: process.env.SUPABASE_DB_PASSWORD || (() => { throw new Error("SUPABASE_DB_PASSWORD is required"); })(),
  ssl: "require",
  max: 1,
});

async function main() {
  console.log("=== 1. CLASSIFIEDS MEDIA & PAYMENT COLUMNS ===");
  const cols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'classifieds'
    ORDER BY ordinal_position
  `;
  console.log("All classifieds columns:", cols.map(c => `${c.column_name} (${c.data_type})`));

  console.log("\n=== 2. PAYMENT / GATEWAY TABLES ===");
  const payTables = await sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND (table_name LIKE '%payment%' OR table_name LIKE '%gateway%' OR table_name LIKE '%pix%' OR table_name LIKE '%payout%' OR table_name LIKE '%billing%' OR table_name LIKE '%checkout%')
  `;
  console.log("Payment tables:", payTables.map(t => t.table_name));

  for (const pt of payTables) {
    const ptCols = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = ${pt.table_name}
    `;
    console.log(`Table ${pt.table_name}:`, ptCols.map(c => `${c.column_name} (${c.data_type})`));
  }

  console.log("\n=== 3. STORES PAYMENT COLUMNS ===");
  const storeCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'stores' 
    AND (column_name LIKE '%pay%' OR column_name LIKE '%gateway%' OR column_name LIKE '%pix%' OR column_name LIKE '%wallet%' OR column_name LIKE '%bank%' OR column_name LIKE '%asaas%' OR column_name LIKE '%stripe%' OR column_name LIKE '%mercado%')
  `;
  console.log("Store payment cols:", storeCols.map(c => `${c.column_name} (${c.data_type})`));

  console.log("\n=== 4. PROFILES PAYMENT COLUMNS ===");
  const profileCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND (column_name LIKE '%pay%' OR column_name LIKE '%gateway%' OR column_name LIKE '%pix%' OR column_name LIKE '%wallet%' OR column_name LIKE '%bank%')
  `;
  console.log("Profile payment cols:", profileCols.map(c => `${c.column_name} (${c.data_type})`));

  await sql.end();
}

main().catch(console.error);
