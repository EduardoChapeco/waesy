import fs from "node:fs";
import path from "node:path";

const migrationPath = path.resolve(
  "supabase/migrations/20270105000000_master_360_telemetry_and_governance.sql"
);

console.log("Verifying migration file:", migrationPath);

if (!fs.existsSync(migrationPath)) {
  console.error("FAIL: Migration file does not exist!");
  process.exit(1);
}

const content = fs.readFileSync(migrationPath, "utf-8");
console.log(`File size: ${content.length} bytes, lines: ${content.split("\n").length}`);

// 1. Check all 4 tables exist
const expectedTables = [
  "public.user_form_submissions_log",
  "public.user_cart_telemetry",
  "employee_tenant_audit_logs",
  "public.customer_store_affinity",
];

for (const table of expectedTables) {
  if (!content.includes(table)) {
    console.error(`FAIL: Missing table ${table}`);
    process.exit(1);
  }
}
console.log("PASS: All 4 tables present.");

// 2. Check UNIQUE constraint on customer_store_affinity
if (!content.includes("CONSTRAINT uq_customer_store_affinity UNIQUE (customer_id, store_id)")) {
  console.error("FAIL: Missing UNIQUE constraint on customer_store_affinity (customer_id, store_id)");
  process.exit(1);
}
console.log("PASS: UNIQUE constraint uq_customer_store_affinity present.");

// 3. Check operator_cpf in employee_tenant_audit_logs
if (!content.includes("operator_cpf")) {
  console.error("FAIL: Missing operator_cpf in employee_tenant_audit_logs");
  process.exit(1);
}
console.log("PASS: operator_cpf present.");

// 4. Check RLS enabled on all 4 tables
const rlsTables = [
  "ALTER TABLE public.user_form_submissions_log ENABLE ROW LEVEL SECURITY;",
  "ALTER TABLE public.user_cart_telemetry ENABLE ROW LEVEL SECURITY;",
  "ALTER TABLE public.employee_tenant_audit_logs ENABLE ROW LEVEL SECURITY;",
  "ALTER TABLE public.customer_store_affinity ENABLE ROW LEVEL SECURITY;",
];

for (const rls of rlsTables) {
  if (!content.includes(rls)) {
    console.error(`FAIL: Missing RLS statement: ${rls}`);
    process.exit(1);
  }
}
console.log("PASS: RLS enabled on all 4 tables.");

// 5. Check session lookups wrap auth.uid() in (SELECT auth.uid())
// No naked "auth.uid()" without "(SELECT auth.uid())"
const nakedUidMatches = [...content.matchAll(/[^(\w]auth\.uid\(\)/g)];
const validSubqueryCount = (content.match(/\(SELECT auth\.uid\(\)\)/g) || []).length;
console.log(`Found ${validSubqueryCount} instances of (SELECT auth.uid())`);

if (validSubqueryCount < 4) {
  console.error("FAIL: Expected at least 4 instances of (SELECT auth.uid())");
  process.exit(1);
}

// Let's verify no unwrapped auth.uid()
const lines = content.split("\n");
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes("auth.uid()") && !line.includes("(SELECT auth.uid())") && !line.trim().startsWith("--")) {
    console.error(`FAIL: Line ${i + 1} has unwrapped auth.uid(): ${line}`);
    process.exit(1);
  }
}
console.log("PASS: All auth.uid() calls are properly wrapped in (SELECT auth.uid()).");

// 6. Check helper functions are used
if (!content.includes("public.is_platform_admin()")) {
  console.error("FAIL: Missing public.is_platform_admin()");
  process.exit(1);
}
if (!content.includes("public.auth_user_store_ids()")) {
  console.error("FAIL: Missing public.auth_user_store_ids()");
  process.exit(1);
}
console.log("PASS: public.is_platform_admin() and public.auth_user_store_ids() are used.");

// 7. Check trigger on customer_store_affinity
if (!content.includes("public.set_updated_at()")) {
  console.error("FAIL: Missing set_updated_at() trigger");
  process.exit(1);
}
console.log("PASS: updated_at trigger is present.");

// 8. Check balanced parentheses
let openParen = 0;
let inString = false;
let inComment = false;
let inDollarQuote = false;

for (let i = 0; i < content.length; i++) {
  const c = content[i];
  const next = content[i + 1];

  if (!inString && !inDollarQuote && c === "-" && next === "-") {
    // line comment
    while (i < content.length && content[i] !== "\n") i++;
    continue;
  }

  if (c === "'" && !inDollarQuote) {
    if (inString && next === "'") {
      i++; // escaped quote
    } else {
      inString = !inString;
    }
    continue;
  }

  if (c === "$" && next === "$" && !inString) {
    inDollarQuote = !inDollarQuote;
    i++;
    continue;
  }

  if (!inString && !inDollarQuote) {
    if (c === "(") openParen++;
    if (c === ")") openParen--;
    if (openParen < 0) {
      console.error(`FAIL: Unmatched closing parenthesis at char ${i}`);
      process.exit(1);
    }
  }
}

if (openParen !== 0) {
  console.error(`FAIL: Unbalanced parentheses! Difference: ${openParen}`);
  process.exit(1);
}
console.log("PASS: Parentheses are completely balanced.");

console.log("\nALL VERIFICATIONS PASSED SUCCESSFULLY!");
