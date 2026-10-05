import fs from "node:fs";
import path from "node:path";

const migrationPath = path.resolve(
  "supabase/migrations/20270105000000_master_360_telemetry_and_governance.sql"
);

console.log("=== ADVERSARIAL POSTGRES & RLS AUDIT ===");
console.log("Auditing file:", migrationPath);

if (!fs.existsSync(migrationPath)) {
  console.error("CRITICAL: File does not exist!");
  process.exit(1);
}

const sql = fs.readFileSync(migrationPath, "utf-8");

const issues = [];
const successes = [];

function assert(condition, message, critical = true) {
  if (condition) {
    successes.push(message);
  } else {
    issues.push({ message, critical });
  }
}

// 1. Table definitions
const tables = [
  "public.user_form_submissions_log",
  "public.user_cart_telemetry",
  "public.employee_tenant_audit_logs",
  "public.customer_store_affinity"
];

for (const t of tables) {
  assert(sql.includes(`CREATE TABLE IF NOT EXISTS ${t}`), `Table ${t} declared with CREATE TABLE IF NOT EXISTS`);
}

// 2. RLS Enabled on all 4 tables
for (const t of tables) {
  assert(sql.includes(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY;`), `RLS enabled on ${t}`);
}

// 3. Foreign Keys and their supporting indexes
const fkChecks = [
  // user_form_submissions_log
  { table: "user_form_submissions_log", col: "user_id", index: "idx_user_form_subs_user_id" },
  { table: "user_form_submissions_log", col: "profile_id", index: "idx_user_form_subs_profile_id" },
  { table: "user_form_submissions_log", col: "store_id", index: "idx_user_form_subs_store_id" },
  // user_cart_telemetry
  { table: "user_cart_telemetry", col: "user_id", index: "idx_user_cart_telem_user" },
  { table: "user_cart_telemetry", col: "store_id", index: "idx_user_cart_telem_store" },
  { table: "user_cart_telemetry", col: "cart_id", index: "idx_user_cart_telem_cart" },
  { table: "user_cart_telemetry", col: "product_id", index: "idx_user_cart_telem_product" },
  { table: "user_cart_telemetry", col: "variant_id", index: "idx_user_cart_telem_variant" },
  // employee_tenant_audit_logs
  { table: "employee_tenant_audit_logs", col: "user_id", index: "idx_emp_audit_user" },
  { table: "employee_tenant_audit_logs", col: "profile_id", index: "idx_emp_audit_profile" },
  { table: "employee_tenant_audit_logs", col: "store_id", index: "idx_emp_audit_store" },
  { table: "employee_tenant_audit_logs", col: "operator_cpf", index: "idx_emp_audit_cpf" },
  // customer_store_affinity
  { table: "customer_store_affinity", col: "customer_id", index: "idx_cust_affinity_customer" },
  { table: "customer_store_affinity", col: "store_id", index: "idx_cust_affinity_store" }
];

for (const fk of fkChecks) {
  assert(sql.includes(fk.index), `Index ${fk.index} exists for column ${fk.col} in ${fk.table}`);
}

// 4. Wrap (SELECT auth.uid()) for performance
const lines = sql.split("\n");
let nakedAuthUid = 0;
let wrappedAuthUid = 0;

lines.forEach((line, idx) => {
  const trimmed = line.trim();
  if (trimmed.startsWith("--")) return;
  if (trimmed.includes("auth.uid()")) {
    if (trimmed.includes("(SELECT auth.uid())")) {
      wrappedAuthUid++;
    } else {
      nakedAuthUid++;
      issues.push({ message: `Unwrapped auth.uid() at line ${idx + 1}: ${trimmed}`, critical: true });
    }
  }
});

assert(nakedAuthUid === 0, `Zero unwrapped auth.uid() calls found (found ${wrappedAuthUid} properly wrapped calls)`);

// 5. Function security: search_path = public and SECURITY DEFINER
const functionNames = [
  "public.sync_form_submissions_route_aliases()",
  "public.sync_cart_telemetry_aliases()",
  "public.sync_employee_audit_details_aliases()",
  "public.sync_customer_store_affinity_aliases()"
];

functionNames.forEach(fn => {
  assert(sql.includes(fn), `Function ${fn} created`);
});

// Check that functions have SET search_path = public
const searchPathMatches = (sql.match(/SET search_path = public/g) || []).length;
assert(searchPathMatches >= 4, `All 4 PL/pgSQL trigger functions specify SET search_path = public (found ${searchPathMatches})`);

const secDefinerMatches = (sql.match(/SECURITY DEFINER/g) || []).length;
assert(secDefinerMatches >= 4, `All 4 PL/pgSQL trigger functions specify SECURITY DEFINER (found ${secDefinerMatches})`);

// 6. Immutability checks: No unprivileged UPDATE or DELETE policies
const forbiddenPolicies = [
  { table: "user_form_submissions_log", action: "UPDATE", forRoles: ["authenticated", "anon", "public"] },
  { table: "user_form_submissions_log", action: "DELETE", forRoles: ["authenticated", "anon", "public"] },
  { table: "user_cart_telemetry", action: "UPDATE", forRoles: ["authenticated", "anon", "public"] },
  { table: "user_cart_telemetry", action: "DELETE", forRoles: ["authenticated", "anon", "public"] },
  { table: "employee_tenant_audit_logs", action: "UPDATE", forRoles: ["authenticated", "anon", "public"] },
  { table: "employee_tenant_audit_logs", action: "DELETE", forRoles: ["authenticated", "anon", "public"] }
];

// Extract policies
const policyRegex = /CREATE POLICY\s+"([^"]+)"\s+ON\s+([^\s]+)\s+FOR\s+([^\s]+)\s+TO\s+([^\n\r]+?)(?:\s+USING|\s+WITH CHECK)/gi;
let match;
const foundPolicies = [];
while ((match = policyRegex.exec(sql)) !== null) {
  foundPolicies.push({
    name: match[1],
    table: match[2],
    action: match[3].toUpperCase(),
    roles: match[4].trim()
  });
}

console.log(`\nDiscovered ${foundPolicies.length} RLS policies:`);
foundPolicies.forEach(p => {
  console.log(` - [${p.table}] "${p.name}" FOR ${p.action} TO ${p.roles}`);
  if (p.name.includes("platform_admins")) {
    assert(p.action === "ALL", `Platform admin policy "${p.name}" has ALL permissions`);
  } else {
    // Non-platform admin policies
    if (p.table !== "public.customer_store_affinity") {
      assert(p.action !== "UPDATE" && p.action !== "DELETE" && p.action !== "ALL", 
        `Non-admin policy "${p.name}" on audit table ${p.table} does not allow UPDATE/DELETE/ALL (action: ${p.action})`);
    }
  }
});

// 7. Verify Employee audit insertion requires BOTH user_id match and store membership
const employeeInsertPolicy = foundPolicies.find(p => p.name === "employees_insert_own_tenant_actions");
assert(!!employeeInsertPolicy, "employees_insert_own_tenant_actions policy exists");
if (employeeInsertPolicy) {
  assert(employeeInsertPolicy.action === "INSERT", "employees_insert_own_tenant_actions is strictly FOR INSERT");
  assert(sql.includes("user_id = (SELECT auth.uid())") && sql.includes("store_id = ANY (public.auth_user_store_ids())"),
    "Employee log insertion enforces tenant isolation and caller identity");
}

// 8. Verify UNIQUE constraint on customer_store_affinity
assert(sql.includes("CONSTRAINT uq_customer_store_affinity UNIQUE (customer_id, store_id)"),
  "customer_store_affinity has UNIQUE (customer_id, store_id) constraint");

// 9. Check non-negative constraints
const checkConstraints = [
  "unit_price_cents >= 0",
  "total_cart_cents >= 0",
  "items_count >= 0",
  "total_visits >= 0",
  "total_revenue_cents >= 0"
];
for (const cc of checkConstraints) {
  assert(sql.includes(cc), `Check constraint ${cc} is enforced`);
}

console.log("\n=== AUDIT RESULTS ===");
console.log(`Successful checks: ${successes.length}`);
console.log(`Issues / Warnings: ${issues.length}`);

if (issues.length > 0) {
  console.error("FAILURES DETECTED:");
  issues.forEach(i => console.error(` [${i.critical ? "CRITICAL" : "WARN"}] ${i.message}`));
  process.exit(1);
} else {
  console.log("ALL AUDIT CHECKS PASSED WITH ZERO ISSUES!");
}
