// Uso: PGURL=postgresql://... node scripts/ops/pg-run.mjs "<sql>"  (ou --file arquivo.sql)
import fs from "node:fs";
import pg from "pg";

const url = process.env.PGURL;
if (!url) throw new Error("PGURL ausente");
const arg = process.argv[2];
const sql = arg === "--file" ? fs.readFileSync(process.argv[3], "utf8") : arg;
const c = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 15000 });
await c.connect();
try {
  const res = await c.query(sql);
  const list = Array.isArray(res) ? res : [res];
  for (const r of list) if (r.rows?.length) console.table(r.rows);
  else console.log(r.command, r.rowCount ?? "");
} finally {
  await c.end();
}
