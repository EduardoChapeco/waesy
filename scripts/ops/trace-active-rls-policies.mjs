import fs from "fs";
import path from "path";

const dir = "supabase/migrations";
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

const policies = new Map();

for (const file of files) {
  const content = fs.readFileSync(path.join(dir, file), "utf8");

  // drop policy
  const dropMatches = content.matchAll(/DROP\s+POLICY\s+(?:IF\s+EXISTS\s+)?["']?([^"'\s]+)["']?\s+ON\s+public\.([a-zA-Z0-9_]+)/gi);
  for (const m of dropMatches) {
    const pName = m[1].toLowerCase();
    const table = m[2].toLowerCase();
    policies.delete(table + "::" + pName);
  }

  // create policy
  const createMatches = content.matchAll(/CREATE\s+POLICY\s+["']?([^"'\s]+)["']?\s+ON\s+public\.([a-zA-Z0-9_]+)([\s\S]+?);/gi);
  for (const m of createMatches) {
    const pName = m[1].toLowerCase();
    const table = m[2].toLowerCase();
    const body = m[3];
    policies.set(table + "::" + pName, { table, pName, file, body });
  }
}

const keywords = ['crm', 'lead', 'customer', 'route', 'visit', 'order', 'finance', 'contract', 'proposal', 'price_table', 'rotary', 'match', 'member', 'wallet', 'transaction'];

const matched = [];
for (const [key, p] of policies.entries()) {
  const isKw = keywords.some(k => p.table.includes(k));
  if (!isKw) continue;
  const isServiceRole = /TO\s+service_role\b/i.test(p.body);
  const hasUsingTrue = /USING\s*\(\s*true\s*\)/i.test(p.body);
  const hasCheckTrue = /WITH\s+CHECK\s*\(\s*true\s*\)/i.test(p.body);
  if (!isServiceRole && (hasUsingTrue || hasCheckTrue)) {
    matched.push(p);
  }
}

console.log("\n======================================================");
console.log(`CRITICAL: Sensitive tables with non-service-role permissive policies: ${matched.length}`);
console.log("======================================================\n");
for (const m of matched) {
  console.log(`[${m.file}] ${m.table} -> ${m.pName}`);
  console.log(`  snippet: ${m.body.trim().replace(/\s+/g, ' ').slice(0, 200)}`);
  console.log('------------------------------------------------------');
}
