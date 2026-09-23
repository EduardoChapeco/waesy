import postgres from "postgres";

const sql = postgres({
  host: "aws-0-sa-east-1.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  username: "postgres.jfuebqmltksyznovhlwa",
  password: "EEaR6399!@#2026",
  ssl: { rejectUnauthorized: false },
  connect_timeout: 15,
});

async function run() {
  console.log("=== AUDITORIA DE INTEGRIDADE DOS MÓDULOS DE NICHO (PRODUÇÃO) ===");

  const nicheTables = {
    turismo: ["travel_packages", "travel_proposals", "travel_quotes", "bus_fleet", "tour_groups"],
    pdv_delivery: ["orders", "order_items", "pos_cash_registers", "delivery_drivers", "products"],
    classificados_imoveis: ["classified_ads", "classified_categories", "properties", "directory_listings"],
    jus_juridico: ["legal_cases", "legal_deadlines", "legal_hearings", "mined_lawsuits"]
  };

  for (const [niche, tables] of Object.entries(nicheTables)) {
    console.log(`\n── Nicho: ${niche.toUpperCase()} ──`);
    for (const t of tables) {
      try {
        const count = await sql.unsafe(`SELECT count(*) as total FROM ${t}`);
        const sampleCols = await sql.unsafe(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = '${t}' 
          LIMIT 5
        `);
        console.log(`✓ [${t}]: ${count[0].total} registros | Amostra colunas: ${sampleCols.map(c => c.column_name).join(", ")}`);
      } catch (err) {
        console.log(`✗ [${t}]: ERRO/INEXISTENTE: ${err.message}`);
      }
    }
  }

  await sql.end();
  console.log("\n=== FIM DA AUDITORIA DE NICHOS ===");
}

run().catch((err) => {
  console.error("Erro na auditoria:", err);
  process.exit(1);
});
