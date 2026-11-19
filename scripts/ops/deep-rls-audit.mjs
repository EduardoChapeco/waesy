import fs from "fs";
import path from "path";

const dir = "supabase/migrations";
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql"));

const issues = [];
const allTables = new Set();
const rlsEnabledTables = new Set();

for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), "utf8");

  // Track CREATE TABLE
  const tableMatches = content.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?public\.([a-zA-Z0-9_]+)/gi);
  for (const tm of tableMatches) {
    allTables.add(tm[1].toLowerCase());
  }

  // Track ENABLE ROW LEVEL SECURITY
  const rlsMatches = content.matchAll(/ALTER\s+TABLE\s+public\.([a-zA-Z0-9_]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi);
  for (const rm of rlsMatches) {
    rlsEnabledTables.add(rm[1].toLowerCase());
  }

  // Track policies with USING (true) or WITH CHECK (true)
  const policyRegex = /CREATE\s+POLICY\s+["']?([^"'\s]+)["']?\s+ON\s+public\.([a-zA-Z0-9_]+)[\s\S]+?(?:USING\s*\(\s*true\s*\)|WITH\s+CHECK\s*\(\s*true\s*\))/gi;
  let m;
  while ((m = policyRegex.exec(content)) !== null) {
    const policyName = m[1];
    const table = m[2];
    issues.push({ file: f, table, policyName, raw: m[0] });
  }
}

console.log(`Total tables declared: ${allTables.size}`);
console.log(`Total tables with RLS enabled: ${rlsEnabledTables.size}`);

const tablesWithoutRLS = [...allTables].filter((t) => !rlsEnabledTables.has(t));
console.log(`Tables without RLS explicitly enabled in migrations: ${tablesWithoutRLS.length}`);

// Filter sensitive issues
const sensitiveWords = [
  "crm", "lead", "customer", "price", "route", "visit", "order", "finance",
  "contract", "team", "member", "brain", "story", "proposal", "payment",
  "debt", "secret", "store_setting", "commission", "payout", "staff"
];

const sensitivePermissivePolicies = issues.filter((i) =>
  sensitiveWords.some((w) => i.table.toLowerCase().includes(w))
);

console.log(`Sensitive permissive policies (USING/CHECK true): ${sensitivePermissivePolicies.length}`);
for (const p of sensitivePermissivePolicies) {
  console.log(`[${p.file}] ${p.table} -> ${p.policyName}`);
}
