import postgres from "postgres";

const sql = postgres({
  host: 'aws-0-sa-east-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  username: 'postgres.jfuebqmltksyznovhlwa',
  password: 'EEaR6399!@#2026',
  ssl: { rejectUnauthorized: false },
});

async function inspect() {
  try {
    console.log("=== 1. MINED_RAW_EXTRACTIONS COLUMNS ===");
    const cols = await sql`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'mined_raw_extractions'
      ORDER BY ordinal_position
    `;
    cols.forEach(c => console.log(` - ${c.column_name} (${c.udt_name})`));

    console.log("\n=== 2. ENUM MINING_CONTENT_TYPE ===");
    const enumValues = await sql`
      SELECT e.enumlabel
      FROM pg_type t 
      JOIN pg_enum e ON t.oid = e.enumtypid  
      WHERE t.typname = 'mining_content_type'
      ORDER BY e.enumsortorder
    `;
    console.log("Values:", enumValues.map(e => e.enumlabel).join(", "));

    console.log("\n=== 3. FOREIGN KEYS IN MINED_RAW_EXTRACTIONS ===");
    const fks = await sql`
      SELECT
        tc.constraint_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'mined_raw_extractions'
    `;
    fks.forEach(fk => console.log(` - ${fk.column_name} -> ${fk.foreign_table_name}(${fk.foreign_column_name})`));

    console.log("\n=== 4. CANONICAL TABLES STATUS ===");
    const tables = ["mined_lawsuits", "directory_listings", "events", "mined_products", "products", "jobs", "news_articles", "api_key_pools", "scraper_audit_log", "crawl_queue", "domain_cooldowns"];
    for (const tbl of tables) {
      const exists = await sql`
        SELECT count(*)::int AS count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = ${tbl}
      `;
      const rowCount = exists[0].count > 0 ? (await sql.unsafe(`SELECT count(*)::int AS count FROM ${tbl}`))[0].count : "N/A";
      console.log(` - ${tbl}: ${exists[0].count > 0 ? "EXISTS" : "NOT FOUND"} (Rows: ${rowCount})`);
    }

    const allMinedTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND (table_name LIKE '%mined%' OR table_name LIKE '%product%' OR table_name LIKE '%directory%')
    `;
    console.log("\nAll matching tables:", allMinedTables.map(t => t.table_name).join(", "));

  } catch (err) {
    console.error("Error during inspection:", err);
  } finally {
    await sql.end();
  }
}

inspect();
