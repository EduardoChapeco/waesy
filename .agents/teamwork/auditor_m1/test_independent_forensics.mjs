import fs from "node:fs";
import path from "node:path";

const targetPath = path.resolve("supabase/migrations/20270105000000_master_360_telemetry_and_governance.sql");

console.log("=== INDEPENDENT FORENSIC AUDIT SUITE (M1) ===");
console.log("Inspecting:", targetPath);

if (!fs.existsSync(targetPath)) {
  console.error("FAIL: Target migration does not exist!");
  process.exit(1);
}

const content = fs.readFileSync(targetPath, "utf-8");
const lines = content.split("\n");

console.log(`Target statistics: ${content.length} bytes, ${lines.length} lines`);

const testResults = [];

function assertCheck(name, condition, details = "") {
  if (condition) {
    testResults.push({ name, status: "PASS", details });
    console.log(`[PASS] ${name}`);
  } else {
    testResults.push({ name, status: "FAIL", details });
    console.error(`[FAIL] ${name}: ${details}`);
  }
}

// Check 1: File location compliance
assertCheck(
  "Location Compliance",
  targetPath.endsWith("supabase\\migrations\\20270105000000_master_360_telemetry_and_governance.sql") ||
  targetPath.endsWith("supabase/migrations/20270105000000_master_360_telemetry_and_governance.sql"),
  "File must be placed strictly in supabase/migrations/ with canonical timestamp 20270105000000"
);

// Check 2: Absence of hardcoded test results / fake inserts / mock data
const insertRegex = /INSERT\s+INTO/i;
const hasHardcodedInserts = insertRegex.test(content);
assertCheck(
  "No Hardcoded Inserts / Mock Data",
  !hasHardcodedInserts,
  hasHardcodedInserts ? "Found INSERT INTO statements in migration" : "Zero INSERT statements detected"
);

// Check 3: Absence of facade implementations (dummy tables or empty bodies)
const tables = [
  "user_form_submissions_log",
  "user_cart_telemetry",
  "employee_tenant_audit_logs",
  "customer_store_affinity"
];

for (const t of tables) {
  const tableDecl = new RegExp(`CREATE\\s+TABLE\\s+IF\\s+NOT\\s+EXISTS\\s+public\\.${t}\\s*\\(`, "i");
  assertCheck(
    `Table Declaration: ${t}`,
    tableDecl.test(content),
    `Must declare table public.${t}`
  );
}

// Check 4: Check constraint authenticity
assertCheck(
  "Form Types Check Constraint",
  content.includes("'proposal'") && content.includes("'quote'") && content.includes("'job_application'") && content.includes("'support_ticket'"),
  "Check constraint on form_type must include standard form categories"
);

assertCheck(
  "Cart Event Types Check Constraint",
  content.includes("'item_added'") && content.includes("'item_removed'") && content.includes("'cart_abandoned'") && content.includes("'checkout_started'"),
  "Check constraint on event_type must include cart event lifecycle"
);

assertCheck(
  "Affinity Levels Check Constraint",
  content.includes("'lead'") && content.includes("'visitor'") && content.includes("'buyer'") && content.includes("'fan'") && content.includes("'vip'"),
  "Check constraint on affinity_level must enforce lead, visitor, buyer, fan, vip"
);

// Check 5: Integrity constraints & Keys
assertCheck(
  "Operator CPF column and index",
  content.includes("operator_cpf") && content.includes("idx_emp_audit_cpf"),
  "employee_tenant_audit_logs must have operator_cpf column and dedicated index"
);

assertCheck(
  "Customer Store Affinity Unique Constraint",
  content.includes("CONSTRAINT uq_customer_store_affinity UNIQUE (customer_id, store_id)"),
  "customer_store_affinity must have UNIQUE (customer_id, store_id)"
);

// Check 6: Foreign key cascade & set null behaviors
assertCheck(
  "Referential Integrity: auth.users",
  content.includes("REFERENCES auth.users(id)"),
  "Must link to auth.users(id)"
);
assertCheck(
  "Referential Integrity: public.stores",
  content.includes("REFERENCES public.stores(id)"),
  "Must link to public.stores(id)"
);

// Check 7: Row Level Security (RLS) configuration
for (const t of tables) {
  const rlsRegex = new RegExp(`ALTER\\s+TABLE\\s+public\\.${t}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`, "i");
  assertCheck(
    `RLS Enabled: ${t}`,
    rlsRegex.test(content),
    `Must execute ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY`
  );
}

// Check 8: Security Best Practices (No naked auth.uid())
let nakedUids = 0;
lines.forEach((line, idx) => {
  const trimmed = line.trim();
  if (trimmed.startsWith("--")) return;
  if (line.includes("auth.uid()") && !line.includes("(SELECT auth.uid())")) {
    nakedUids++;
    console.error(`Line ${idx + 1} has naked auth.uid(): ${line}`);
  }
});

assertCheck(
  "Scalable Subquery auth.uid() wrapping",
  nakedUids === 0,
  nakedUids === 0 ? "All auth.uid() wrapped in (SELECT auth.uid())" : `${nakedUids} naked auth.uid() calls found`
);

// Check 9: Admin & Store RLS Helper Policies
assertCheck(
  "Platform Admin Helper Policy",
  content.includes("public.is_platform_admin()"),
  "RLS policies must invoke public.is_platform_admin()"
);

assertCheck(
  "Store Multi-Tenant Isolation Helper",
  content.includes("public.auth_user_store_ids()"),
  "RLS policies must enforce store_id = ANY (public.auth_user_store_ids())"
);

// Check 10: Idempotency & Drop guards
assertCheck(
  "Idempotency: Triggers dropped before recreation",
  content.includes("DROP TRIGGER IF EXISTS trg_sync_form_submissions_route_aliases") &&
  content.includes("DROP TRIGGER IF EXISTS trg_sync_cart_telemetry_aliases") &&
  content.includes("DROP TRIGGER IF EXISTS trg_sync_employee_audit_details_aliases") &&
  content.includes("DROP TRIGGER IF EXISTS trg_sync_customer_store_affinity_aliases") &&
  content.includes("DROP TRIGGER IF EXISTS customer_store_affinity_updated_at"),
  "All triggers must have DROP TRIGGER IF EXISTS guards"
);

assertCheck(
  "Idempotency: Policies dropped before recreation",
  content.includes("DROP POLICY IF EXISTS \"platform_admins_manage_form_submissions_log\"") &&
  content.includes("DROP POLICY IF EXISTS \"platform_admins_manage_cart_telemetry\"") &&
  content.includes("DROP POLICY IF EXISTS \"platform_admins_manage_employee_tenant_audit_logs\"") &&
  content.includes("DROP POLICY IF EXISTS \"platform_admins_manage_customer_store_affinity\"",
  "All policies must have DROP POLICY IF EXISTS guards"
));

// Check 11: Syntax Delimiters & Balanced Parentheses
let openParen = 0;
let inString = false;
let inDollarQuote = false;

for (let i = 0; i < content.length; i++) {
  const c = content[i];
  const next = content[i + 1];

  if (!inString && !inDollarQuote && c === "-" && next === "-") {
    while (i < content.length && content[i] !== "\n") i++;
    continue;
  }

  if (c === "'" && !inDollarQuote) {
    if (inString && next === "'") {
      i++;
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
      assertCheck("Parentheses syntax", false, `Unmatched closing parenthesis at char ${i}`);
      break;
    }
  }
}

assertCheck(
  "Parentheses & Quotes Balance",
  openParen === 0 && !inString && !inDollarQuote,
  `openParen=${openParen}, inString=${inString}, inDollarQuote=${inDollarQuote}`
);

// Summary
const total = testResults.length;
const passed = testResults.filter(r => r.status === "PASS").length;
const failed = testResults.filter(r => r.status === "FAIL").length;

console.log(`\n=== AUDIT RESULTS: ${passed}/${total} PASSED, ${failed} FAILED ===`);

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
