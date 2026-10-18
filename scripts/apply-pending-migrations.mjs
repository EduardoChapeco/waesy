#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres.jfuebqmltksyznovhlwa:EEaR6399!%40%232026@aws-0-sa-east-1.pooler.supabase.com:6543/postgres";

console.log("Connecting to Supabase Postgres...");
const sql = postgres(connectionString, {
  ssl: "require",
  max: 1,
  idle_timeout: 20,
  connect_timeout: 30,
});

async function run() {
  try {
    // 1. Ensure schema_migrations exists
    await sql`CREATE SCHEMA IF NOT EXISTS supabase_migrations;`;
    await sql`
      CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
        version TEXT PRIMARY KEY,
        name TEXT,
        statements TEXT[],
        applied_at TIMESTAMPTZ DEFAULT now()
      );
    `;

    // 2. Query applied versions
    const appliedRows = await sql`
      SELECT version FROM supabase_migrations.schema_migrations;
    `;
    const appliedVersions = new Set(appliedRows.map((r) => r.version));
    console.log(`Found ${appliedVersions.size} already applied migration versions in remote DB.`);

    // 3. Scan local migrations directory
    const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    const pendingFiles = files.filter((f) => {
      const match = f.match(/^(\d+)_/);
      if (!match) return false;
      const version = match[1];
      return !appliedVersions.has(version);
    });

    console.log(`Pending migrations to apply: ${pendingFiles.length}`);

    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i];
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      const version = match ? match[1] : file;
      const name = match ? match[2] : file;

      console.log(`[${i + 1}/${pendingFiles.length}] Applying ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, "utf-8");

      if (!content.trim()) {
        console.log(`  -> Skipping empty file: ${file}`);
        continue;
      }

      // Execute SQL content
      await sql.unsafe(content);

      // Record migration in schema_migrations
      await sql`
        INSERT INTO supabase_migrations.schema_migrations (version, name)
        VALUES (${version}, ${name})
        ON CONFLICT (version) DO NOTHING;
      `;
      console.log(`  -> SUCCESS: ${file}`);
    }

    console.log("ALL PENDING MIGRATIONS APPLIED SUCCESSFULLY!");
  } catch (err) {
    console.error("MIGRATION ERROR:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

run();
