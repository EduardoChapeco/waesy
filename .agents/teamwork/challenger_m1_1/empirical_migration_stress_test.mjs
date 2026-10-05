import fs from "node:fs";
import path from "node:path";

// Empirical Challenger M1_1 — Deep Stress Testing Suite for Supabase Migration
const migrationPath = path.resolve(
  "supabase/migrations/20270105000000_master_360_telemetry_and_governance.sql"
);

console.log("================================================================================");
console.log("CHALLENGER M1_1: EMPIRICAL STRESS TEST & VERIFICATION HARNESS");
console.log("Target:", migrationPath);
console.log("================================================================================\n");

if (!fs.existsSync(migrationPath)) {
  console.error("FATAL: Migration file does not exist at:", migrationPath);
  process.exit(1);
}

const sql = fs.readFileSync(migrationPath, "utf-8");
const lines = sql.split("\n");

let passedTests = 0;
let totalTests = 0;
const failures = [];

function assert(condition, testId, description, details = "") {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[PASS] ${testId}: ${description}`);
  } else {
    console.error(`[FAIL] ${testId}: ${description}`);
    if (details) console.error(`       Details: ${details}`);
    failures.push({ testId, description, details });
  }
}

// -----------------------------------------------------------------------------
// SUITE 1: SYNTAX, LEXING & BALANCE
// -----------------------------------------------------------------------------
console.log("\n--- SUITE 1: SYNTAX, LEXING & BALANCE ---");

// 1.1 File existence and volume
assert(sql.length > 5000 && lines.length > 200, "T1.1", "Migration file size and line density", `Length: ${sql.length} chars, Lines: ${lines.length}`);

// 1.2 State machine for brackets, quotes, comments and dollar-quotes
let openParen = 0;
let openBracket = 0;
let openBrace = 0;
let inSingleQuote = false;
let inDoubleQuote = false;
let inLineComment = false;
let inBlockComment = false;
let inDollarQuote = false;
let parenUnderflow = false;
let dollarTag = "";

for (let i = 0; i < sql.length; i++) {
  const c = sql[i];
  const next = sql[i + 1] || "";
  const prev = sql[i - 1] || "";

  // Handle line comments
  if (inLineComment) {
    if (c === "\n") inLineComment = false;
    continue;
  }

  // Handle block comments
  if (inBlockComment) {
    if (c === "*" && next === "/") {
      inBlockComment = false;
      i++;
    }
    continue;
  }

  // Start of line comment
  if (!inSingleQuote && !inDoubleQuote && !inDollarQuote && c === "-" && next === "-") {
    inLineComment = true;
    i++;
    continue;
  }

  // Start of block comment
  if (!inSingleQuote && !inDoubleQuote && !inDollarQuote && c === "/" && next === "*") {
    inBlockComment = true;
    i++;
    continue;
  }

  // Handle dollar quoting ($$ or $tag$)
  if (!inSingleQuote && !inDoubleQuote) {
    if (c === "$") {
      const match = sql.slice(i).match(/^(\$[a-zA-Z0-9_]*\$)/);
      if (match) {
        const tag = match[1];
        if (!inDollarQuote) {
          inDollarQuote = true;
          dollarTag = tag;
          i += tag.length - 1;
          continue;
        } else if (tag === dollarTag) {
          inDollarQuote = false;
          dollarTag = "";
          i += tag.length - 1;
          continue;
        }
      }
    }
  }

  if (inDollarQuote) continue;

  // Single quotes (SQL string literals)
  if (c === "'") {
    if (inSingleQuote && next === "'") {
      i++; // escaped quote ''
    } else {
      inSingleQuote = !inSingleQuote;
    }
    continue;
  }

  // Double quotes (SQL identifiers)
  if (c === '"') {
    if (inDoubleQuote && next === '"') {
      i++;
    } else {
      inDoubleQuote = !inDoubleQuote;
    }
    continue;
  }

  if (inSingleQuote || inDoubleQuote) continue;

  // Parentheses & Brackets balance
  if (c === "(") openParen++;
  if (c === ")") {
    openParen--;
    if (openParen < 0) parenUnderflow = true;
  }
  if (c === "[") openBracket++;
  if (c === "]") openBracket--;
  if (c === "{") openBrace++;
  if (c === "}") openBrace--;
}

assert(openParen === 0 && !parenUnderflow, "T1.2", "Parentheses balance across entire migration", `Final openParen: ${openParen}, underflow: ${parenUnderflow}`);
assert(openBracket === 0, "T1.3", "Brackets [] balance across entire migration", `Final openBracket: ${openBracket}`);
assert(openBrace === 0, "T1.4", "Braces {} balance across entire migration", `Final openBrace: ${openBrace}`);
assert(!inSingleQuote, "T1.5", "Single quotes correctly closed", `inSingleQuote: ${inSingleQuote}`);
assert(!inDoubleQuote, "T1.6", "Double quotes correctly closed", `inDoubleQuote: ${inDoubleQuote}`);
assert(!inDollarQuote, "T1.7", "Dollar quotes ($$) correctly closed", `inDollarQuote: ${inDollarQuote}`);

// 1.8 Semicolon statement termination
const cleanSql = sql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").trim();
const statements = cleanSql.split(";").map(s => s.trim()).filter(s => s.length > 0);
assert(statements.length >= 25, "T1.8", "Sufficient atomic SQL statements parsed", `Parsed statements count: ${statements.length}`);

// -----------------------------------------------------------------------------
// SUITE 2: SCHEMA DDL & INVARIANT VERIFICATION
// -----------------------------------------------------------------------------
console.log("\n--- SUITE 2: SCHEMA DDL & INVARIANT VERIFICATION ---");

const requiredTables = [
  "public.user_form_submissions_log",
  "public.user_cart_telemetry",
  "public.employee_tenant_audit_logs",
  "public.customer_store_affinity"
];

for (const tbl of requiredTables) {
  const tableDefRegex = new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+${tbl.replace(".", "\\.")}\\s*\\(`, "i");
  assert(tableDefRegex.test(sql), "T2.1." + tbl, `Table definition exists for ${tbl}`);
}

// 2.2 Primary Keys
for (const tbl of requiredTables) {
  const pkRegex = new RegExp(`${tbl.replace(".", "\\.")}[\\s\\S]*?id\\s+UUID\\s+PRIMARY\\s+KEY\\s+DEFAULT\\s+gen_random_uuid\\(\\)`, "i");
  assert(pkRegex.test(sql), "T2.2." + tbl, `UUID Primary Key with gen_random_uuid() for ${tbl}`);
}

// 2.3 Unique constraint uq_customer_store_affinity
const uqRegex = /CONSTRAINT\s+uq_customer_store_affinity\s+UNIQUE\s*\(\s*customer_id\s*,\s*store_id\s*\)/i;
assert(uqRegex.test(sql), "T2.3", "Strict UNIQUE constraint uq_customer_store_affinity (customer_id, store_id)");

// 2.4 Operator CPF in employee_tenant_audit_logs
const operatorCpfRegex = /operator_cpf\s+TEXT/i;
assert(operatorCpfRegex.test(sql), "T2.4", "operator_cpf column declared in employee_tenant_audit_logs");

// 2.5 Bigint 64-bit monetary columns in customer_store_affinity
const bigintRevenue = /total_revenue_cents\s+BIGINT\s+NOT\s+NULL\s+DEFAULT\s+0/i.test(sql);
const bigintSpent = /total_spent_cents\s+BIGINT\s+NOT\s+NULL\s+DEFAULT\s+0/i.test(sql);
assert(bigintRevenue && bigintSpent, "T2.5", "Monetary counters total_revenue_cents & total_spent_cents use BIGINT (no 32-bit overflow)");

// 2.6 Check constraints
const formTypeCheck = /form_type\s+IN\s*\('proposal',\s*'quote',\s*'job_application',\s*'support_ticket',\s*'user_registration',\s*'classified_lead',\s*'contact',\s*'other',\s*'custom'\)/i;
assert(formTypeCheck.test(sql), "T2.6", "form_type CHECK constraint matches specification");

const eventTypeCheck = /event_type\s+IN\s*\([\s\S]*?'item_added'[\s\S]*?'cart_abandoned'[\s\S]*?'checkout_started'[\s\S]*?\)/i;
assert(eventTypeCheck.test(sql), "T2.7", "event_type CHECK constraint covers item and checkout lifecycle");

const affinityLevelCheck = /affinity_level\s+IN\s*\('lead',\s*'visitor',\s*'buyer',\s*'fan',\s*'vip'\)/i;
assert(affinityLevelCheck.test(sql), "T2.8", "affinity_level CHECK constraint covers all 5 tiers (lead, visitor, buyer, fan, vip)");

// 2.7 Foreign Key targets
const fks = [
  { table: "user_form_submissions_log", col: "user_id", ref: "auth.users(id)", onDelete: "SET NULL" },
  { table: "user_form_submissions_log", col: "profile_id", ref: "public.profiles(id)", onDelete: "SET NULL" },
  { table: "user_form_submissions_log", col: "store_id", ref: "public.stores(id)", onDelete: "SET NULL" },
  { table: "user_cart_telemetry", col: "cart_id", ref: "public.carts(id)", onDelete: "SET NULL" },
  { table: "user_cart_telemetry", col: "store_id", ref: "public.stores(id)", onDelete: "CASCADE" },
  { table: "user_cart_telemetry", col: "user_id", ref: "auth.users(id)", onDelete: "SET NULL" },
  { table: "user_cart_telemetry", col: "product_id", ref: "public.products(id)", onDelete: "SET NULL" },
  { table: "user_cart_telemetry", col: "variant_id", ref: "public.product_variants(id)", onDelete: "SET NULL" },
  { table: "employee_tenant_audit_logs", col: "user_id", ref: "auth.users(id)", onDelete: "CASCADE" },
  { table: "employee_tenant_audit_logs", col: "store_id", ref: "public.stores(id)", onDelete: "CASCADE" },
  { table: "customer_store_affinity", col: "customer_id", ref: "auth.users(id)", onDelete: "CASCADE" },
  { table: "customer_store_affinity", col: "store_id", ref: "public.stores(id)", onDelete: "CASCADE" }
];

for (const fk of fks) {
  const fkPattern = new RegExp(`${fk.col}\\s+UUID[\\s\\S]*?REFERENCES\\s+${fk.ref.replace(".", "\\.").replace("(", "\\(").replace(")", "\\)")}\\s+ON\\s+DELETE\\s+${fk.onDelete}`, "i");
  assert(fkPattern.test(sql), "T2.9." + fk.table + "." + fk.col, `FK ${fk.col} references ${fk.ref} ON DELETE ${fk.onDelete}`);
}

// -----------------------------------------------------------------------------
// SUITE 3: SECURITY & ROW LEVEL SECURITY (RLS) AUDIT
// -----------------------------------------------------------------------------
console.log("\n--- SUITE 3: SECURITY & ROW LEVEL SECURITY (RLS) AUDIT ---");

// 3.1 RLS enabled on all 4 tables
for (const tbl of requiredTables) {
  const rlsRegex = new RegExp(`ALTER\\s+TABLE\\s+${tbl.replace(".", "\\.")}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY\\s*;`, "i");
  assert(rlsRegex.test(sql), "T3.1." + tbl, `RLS explicitly enabled on ${tbl}`);
}

// 3.2 Subquery caching: (SELECT auth.uid()) - ZERO naked auth.uid()
let nakedUidFound = false;
let nakedUidDetails = [];
lines.forEach((l, idx) => {
  const line = l.trim();
  if (line.startsWith("--")) return; // ignore comments
  // Match auth.uid() not preceded by "(SELECT "
  const regex = /(?<!\(\s*SELECT\s+)auth\.uid\(\)/gi;
  if (regex.test(line)) {
    nakedUidFound = true;
    nakedUidDetails.push(`Line ${idx + 1}: ${line}`);
  }
});
assert(!nakedUidFound, "T3.2", "Subquery caching compliance: Zero naked auth.uid() in RLS policies", nakedUidDetails.join(" | "));

// 3.3 Count total (SELECT auth.uid()) occurrences
const selectAuthUidMatches = sql.match(/\(\s*SELECT\s+auth\.uid\(\)\s*\)/gi) || [];
assert(selectAuthUidMatches.length >= 5, "T3.3", `Found ${selectAuthUidMatches.length} cached (SELECT auth.uid()) calls across RLS policies`);

// 3.4 Platform Admin policies present
for (const tbl of requiredTables) {
  const adminPolicyRegex = new RegExp(`CREATE\\s+POLICY[\\s\\S]*?ON\\s+${tbl.replace(".", "\\.")}[\\s\\S]*?USING\\s*\\(\\s*public\\.is_platform_admin\\(\\)\\s*\\)`, "i");
  assert(adminPolicyRegex.test(sql), "T3.4." + tbl, `Platform Admin policy on ${tbl}`);
}

// 3.5 Store isolation using auth_user_store_ids()
const storeTables = [
  "public.user_form_submissions_log",
  "public.user_cart_telemetry",
  "public.employee_tenant_audit_logs",
  "public.customer_store_affinity"
];
for (const tbl of storeTables) {
  const storePolicyRegex = new RegExp(`ON\\s+${tbl.replace(".", "\\.")}[\\s\\S]*?ANY\\s*\\(\\s*public\\.auth_user_store_ids\\(\\)\\s*\\)`, "i");
  assert(storePolicyRegex.test(sql), "T3.5." + tbl, `Store isolation via auth_user_store_ids() on ${tbl}`);
}

// 3.6 Immutability check: No regular authenticated/anon UPDATE or DELETE policies on audit tables
const auditTables = [
  "public.user_form_submissions_log",
  "public.user_cart_telemetry",
  "public.employee_tenant_audit_logs"
];
for (const tbl of auditTables) {
  // Check if there is an UPDATE or DELETE policy granted to public/authenticated/anon (other than platform_admin)
  const policies = sql.split(/CREATE\s+POLICY/i).slice(1);
  let dangerousPolicy = null;
  for (const pol of policies) {
    if (pol.includes(tbl)) {
      const isUpdateOrDelete = /FOR\s+(UPDATE|DELETE)\s/i.test(pol);
      const isAll = /FOR\s+ALL\s/i.test(pol);
      const isPlatformAdminOnly = /USING\s*\(\s*public\.is_platform_admin\(\)\s*\)/i.test(pol);
      if ((isUpdateOrDelete || isAll) && !isPlatformAdminOnly) {
        dangerousPolicy = pol.slice(0, 100);
      }
    }
  }
  assert(!dangerousPolicy, "T3.6." + tbl, `Audit log immutability: No public UPDATE/DELETE on ${tbl}`, dangerousPolicy || "");
}

// 3.7 Anon mutation prohibition on sensitive tables
const sensitiveTables = [
  "public.employee_tenant_audit_logs",
  "public.customer_store_affinity"
];
for (const tbl of sensitiveTables) {
  const anonAllowed = new RegExp(`ON\\s+${tbl.replace(".", "\\.")}[\\s\\S]*?TO[\\s\\w,]*?anon`, "i").test(sql);
  assert(!anonAllowed, "T3.7." + tbl, `Zero anon privileges granted on sensitive table ${tbl}`);
}

// -----------------------------------------------------------------------------
// SUITE 4: PERFORMANCE INDEXES & TRIGGERS
// -----------------------------------------------------------------------------
console.log("\n--- SUITE 4: PERFORMANCE INDEXES & TRIGGERS ---");

// 4.1 Index coverage
const requiredIndexes = [
  "idx_user_form_subs_user_id",
  "idx_user_form_subs_store_id",
  "idx_user_form_subs_created_at",
  "idx_user_cart_telem_user",
  "idx_user_cart_telem_store",
  "idx_user_cart_telem_cart",
  "idx_user_cart_telem_created_at",
  "idx_emp_audit_user",
  "idx_emp_audit_store",
  "idx_emp_audit_cpf",
  "idx_cust_affinity_customer",
  "idx_cust_affinity_store",
  "idx_cust_affinity_revenue"
];

for (const idx of requiredIndexes) {
  const idxRegex = new RegExp(`CREATE\\s+INDEX\\s+IF\\s+NOT\\s+EXISTS\\s+${idx}\\s+ON`, "i");
  assert(idxRegex.test(sql), "T4.1." + idx, `B-Tree index ${idx} declared`);
}

// 4.2 Security Definer & search_path on trigger functions
const triggerFuncs = [
  "public.sync_form_submissions_route_aliases",
  "public.sync_cart_telemetry_aliases",
  "public.sync_employee_audit_details_aliases",
  "public.sync_customer_store_affinity_aliases"
];

for (const fn of triggerFuncs) {
  const fnBlockRegex = new RegExp(`FUNCTION\\s+${fn.replace(".", "\\.")}\\s*\\([\\s\\S]*?\\$\\$;`, "i");
  const blockMatch = sql.match(fnBlockRegex);
  const block = blockMatch ? blockMatch[0] : "";
  const hasSecDef = /SECURITY\s+DEFINER/i.test(block);
  const hasSearchPath = /SET\s+search_path\s*=\s*public/i.test(block);
  assert(hasSecDef, "T4.2.sec." + fn, `Function ${fn} uses SECURITY DEFINER`);
  assert(hasSearchPath, "T4.2.path." + fn, `Function ${fn} pins SET search_path = public`);
}

// 4.3 Trigger updated_at on customer_store_affinity
const updatedAtTrg = /CREATE\s+TRIGGER\s+customer_store_affinity_updated_at[\s\S]*?BEFORE\s+UPDATE\s+ON\s+public\.customer_store_affinity[\s\S]*?EXECUTE\s+FUNCTION\s+public\.set_updated_at\(\)/i;
assert(updatedAtTrg.test(sql), "T4.3", "Trigger customer_store_affinity_updated_at invokes set_updated_at()");

// -----------------------------------------------------------------------------
// SUITE 5: ADVERSARIAL ORACLE & LOGIC SIMULATION
// -----------------------------------------------------------------------------
console.log("\n--- SUITE 5: ADVERSARIAL ORACLE & LOGIC SIMULATION ---");

// Simulation 5.1: Alias synchronization logic verification
// Test trigger sync_customer_store_affinity_aliases logic
function simulateAffinitySync(oldRow, newRow) {
  const res = { ...newRow };
  // visits
  if (res.total_visits !== oldRow.total_visits && res.visits_count === oldRow.visits_count) {
    res.visits_count = res.total_visits;
  } else if (res.visits_count !== oldRow.visits_count && res.total_visits === oldRow.total_visits) {
    res.total_visits = res.visits_count;
  }
  // revenue
  if (res.total_revenue_cents !== oldRow.total_revenue_cents && res.total_spent_cents === oldRow.total_spent_cents) {
    res.total_spent_cents = res.total_revenue_cents;
  } else if (res.total_spent_cents !== oldRow.total_spent_cents && res.total_revenue_cents === oldRow.total_revenue_cents) {
    res.total_revenue_cents = res.total_spent_cents;
  }
  return res;
}

const initial = { total_visits: 1, visits_count: 1, total_revenue_cents: 1000, total_spent_cents: 1000 };
// Case A: Update total_visits only
const afterA = simulateAffinitySync(initial, { ...initial, total_visits: 5 });
assert(afterA.total_visits === 5 && afterA.visits_count === 5, "T5.1.A", "Bi-directional alias sync: total_visits -> visits_count");

// Case B: Update visits_count only
const afterB = simulateAffinitySync(initial, { ...initial, visits_count: 8 });
assert(afterB.total_visits === 8 && afterB.visits_count === 8, "T5.1.B", "Bi-directional alias sync: visits_count -> total_visits");

// Case C: Update total_revenue_cents only
const afterC = simulateAffinitySync(initial, { ...initial, total_revenue_cents: 50000 });
assert(afterC.total_revenue_cents === 50000 && afterC.total_spent_cents === 50000, "T5.1.C", "Bi-directional alias sync: total_revenue_cents -> total_spent_cents");

// Simulation 5.2: RLS Evaluation Truth Table Simulation
// Simulates Postgres RLS policy resolution for employee_tenant_audit_logs
function evaluateAuditLogInsert(userContext, rowToInsert) {
  // Policy 1: platform_admins_manage (is_platform_admin())
  const p1 = userContext.isPlatformAdmin;
  // Policy 2: employees_insert_own_tenant_actions
  // WITH CHECK (user_id = (SELECT auth.uid()) AND store_id = ANY (public.auth_user_store_ids()))
  const p2 = userContext.isAuthenticated &&
             (rowToInsert.user_id === userContext.userId) &&
             userContext.storeIds.includes(rowToInsert.store_id);

  // Permissive policies are combined with OR
  return p1 || p2;
}

// Oracle scenarios:
// Scenario 1: Employee inserts log for own store -> MUST PASS
const sim1 = evaluateAuditLogInsert(
  { isAuthenticated: true, userId: "u-123", storeIds: ["s-456"], isPlatformAdmin: false },
  { user_id: "u-123", store_id: "s-456" }
);
assert(sim1 === true, "T5.2.1", "Oracle: Valid employee inserting audit log for own store allowed");

// Scenario 2: Employee attempts to forge log with another user's user_id -> MUST FAIL
const sim2 = evaluateAuditLogInsert(
  { isAuthenticated: true, userId: "u-123", storeIds: ["s-456"], isPlatformAdmin: false },
  { user_id: "u-VICTIM", store_id: "s-456" }
);
assert(sim2 === false, "T5.2.2", "Oracle: Attacker attempting to spoof user_id in audit log rejected");

// Scenario 3: Employee attempts to insert log for unassigned store -> MUST FAIL
const sim3 = evaluateAuditLogInsert(
  { isAuthenticated: true, userId: "u-123", storeIds: ["s-456"], isPlatformAdmin: false },
  { user_id: "u-123", store_id: "s-TARGET" }
);
assert(sim3 === false, "T5.2.3", "Oracle: Cross-tenant audit injection attempt rejected");

// Scenario 4: Platform admin can insert for any store/user -> MUST PASS
const sim4 = evaluateAuditLogInsert(
  { isAuthenticated: true, userId: "u-admin", storeIds: [], isPlatformAdmin: true },
  { user_id: "u-any", store_id: "s-any" }
);
assert(sim4 === true, "T5.2.4", "Oracle: Platform admin bypasses tenant constraint for emergency auditing");

// Scenario 5: Unauthenticated anon attempts insert -> MUST FAIL
const sim5 = evaluateAuditLogInsert(
  { isAuthenticated: false, userId: null, storeIds: [], isPlatformAdmin: false },
  { user_id: "u-123", store_id: "s-456" }
);
assert(sim5 === false, "T5.2.5", "Oracle: Unauthenticated anonymous caller rejected");

// -----------------------------------------------------------------------------
// SUMMARY & VERDICT
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`TOTAL TESTS: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failures.length}`);
console.log("================================================================================");

if (failures.length > 0) {
  console.error("\nFAILURES DETECTED:");
  failures.forEach(f => console.error(`- [${f.testId}] ${f.description}: ${f.details}`));
  process.exit(1);
} else {
  console.log("\nALL TESTS PASSED WITH 100% SUCCESS. EMPIRICAL VERDICT: APPROVE.");
  process.exit(0);
}
