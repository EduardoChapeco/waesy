import postgres from "postgres";
import fs from "fs";

const sql = postgres({
  host: "aws-0-sa-east-1.pooler.supabase.com",
  port: 6543,
  database: "postgres",
  username: "postgres.jfuebqmltksyznovhlwa",
  password: "EEaR6399!@#2026",
  ssl: "require",
  max: 1,
});

async function main() {
  const mig = fs.readFileSync("supabase/migrations/20261209000000_v145_classifieds_feed_media_and_payment_channels.sql", "utf8");
  console.log("Applying migration v145...");
  await sql.unsafe(mig);
  console.log("Migration v145 applied successfully!");

  const cols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'classifieds' AND column_name IN ('feed_media', 'payment_settings')
  `;
  console.log("New classifieds columns verified:", cols);

  const profileCols = await sql`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'pix_settings'
  `;
  console.log("New profiles column verified:", profileCols);

  await sql.end();
}

main().catch(console.error);
