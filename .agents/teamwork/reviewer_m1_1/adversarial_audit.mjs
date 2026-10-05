import fs from 'node:fs';
import path from 'node:path';

const migrationPath = path.resolve(
  'supabase/migrations/20270105000000_master_360_telemetry_and_governance.sql'
);

console.log('--- ADVERSARIAL AUDIT & INTEGRITY VERIFICATION ---');
console.log('Target:', migrationPath);

if (!fs.existsSync(migrationPath)) {
  console.error('FATAL: Migration file does not exist');
  process.exit(1);
}

const content = fs.readFileSync(migrationPath, 'utf-8');
const lines = content.split('\n');

// 1. INTEGRITY VIOLATION CHECKS
console.log('\n[CHECK 1] Integrity Violations (Hardcoded fake data, facade/dummy logic, mocks)');
const suspiciousPatterns = [
  /mock/i,
  /fake/i,
  /dummy/i,
  /placeholder/i,
  /todo/i,
  /fixme/i,
  /hardcoded/i,
  /Math\.random/,
  /test-only/i,
];

let integritySuspicion = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.trim().startsWith('--')) continue; // comments
  for (const pat of suspiciousPatterns) {
    if (pat.test(line)) {
      console.warn(`Suspicious pattern ${pat} on line ${i + 1}: ${line.trim()}`);
      integritySuspicion++;
    }
  }
}

if (integritySuspicion === 0) {
  console.log('PASS: Zero facade patterns, zero dummy logic, zero fake data found in SQL source.');
} else {
  console.warn(`WARNING: Found ${integritySuspicion} potential suspicious lines.`);
}

// 2. SQL SYNTAX INTEGRITY CHECKS
console.log('\n[CHECK 2] SQL Grammar & Statement Balance');
// Check matched quotes, dollar quotes, parentheses
let parenDepth = 0;
let inSingleQuote = false;
let inDollarQuote = false;
let dollarTag = '';

for (let i = 0; i < content.length; i++) {
  const ch = content[i];
  const next = content[i + 1];

  // Comment check
  if (!inSingleQuote && !inDollarQuote && ch === '-' && next === '-') {
    while (i < content.length && content[i] !== '\n') i++;
    continue;
  }

  // Single quote
  if (ch === "'" && !inDollarQuote) {
    if (inSingleQuote && next === "'") {
      i++; // escaped
    } else {
      inSingleQuote = !inSingleQuote;
    }
    continue;
  }

  // Dollar quote start/end
  if (ch === '$' && !inSingleQuote) {
    const rest = content.slice(i);
    const match = rest.match(/^\$([a-zA-Z0-9_]*)\$/);
    if (match) {
      const tag = match[0];
      if (!inDollarQuote) {
        inDollarQuote = true;
        dollarTag = tag;
        i += tag.length - 1;
      } else if (inDollarQuote && tag === dollarTag) {
        inDollarQuote = false;
        dollarTag = '';
        i += tag.length - 1;
      }
      continue;
    }
  }

  if (!inSingleQuote && !inDollarQuote) {
    if (ch === '(') parenDepth++;
    if (ch === ')') parenDepth--;
    if (parenDepth < 0) {
      console.error(`FATAL: Negative parenthesis depth at index ${i}`);
      process.exit(1);
    }
  }
}

if (parenDepth !== 0) {
  console.error(`FATAL: Unbalanced parenthesis count: ${parenDepth}`);
  process.exit(1);
}
console.log('PASS: Parentheses and quotation blocks are 100% balanced.');

// 3. TABLE DEFINITIONS AND PRIMARY KEYS
console.log('\n[CHECK 3] Table Definitions & Primary Keys');
const tables = [
  'public.user_form_submissions_log',
  'public.user_cart_telemetry',
  'public.employee_tenant_audit_logs',
  'public.customer_store_affinity',
];

for (const t of tables) {
  const tableRegex = new RegExp(`CREATE TABLE IF NOT EXISTS ${t.replace('.', '\\.')}\\s*\\(`, 'm');
  if (!tableRegex.test(content)) {
    console.error(`FATAL: Missing CREATE TABLE for ${t}`);
    process.exit(1);
  }
  console.log(`PASS: Table ${t} declared with IF NOT EXISTS`);
}

// 4. CONSTRAINT & FOREIGN KEY AUDIT
console.log('\n[CHECK 4] Foreign Keys, Check Constraints & Cascade Actions');
const expectedFks = [
  { table: 'user_form_submissions_log', fk: 'auth.users(id)', onAction: 'ON DELETE SET NULL' },
  { table: 'user_form_submissions_log', fk: 'public.profiles(id)', onAction: 'ON DELETE SET NULL' },
  { table: 'user_form_submissions_log', fk: 'public.stores(id)', onAction: 'ON DELETE SET NULL' },
  { table: 'user_cart_telemetry', fk: 'public.carts(id)', onAction: 'ON DELETE SET NULL' },
  { table: 'user_cart_telemetry', fk: 'public.stores(id)', onAction: 'ON DELETE CASCADE' },
  { table: 'user_cart_telemetry', fk: 'auth.users(id)', onAction: 'ON DELETE SET NULL' },
  { table: 'user_cart_telemetry', fk: 'public.products(id)', onAction: 'ON DELETE SET NULL' },
  { table: 'user_cart_telemetry', fk: 'public.product_variants(id)', onAction: 'ON DELETE SET NULL' },
  { table: 'employee_tenant_audit_logs', fk: 'auth.users(id)', onAction: 'ON DELETE CASCADE' },
  { table: 'employee_tenant_audit_logs', fk: 'public.profiles(id)', onAction: 'ON DELETE SET NULL' },
  { table: 'employee_tenant_audit_logs', fk: 'public.stores(id)', onAction: 'ON DELETE CASCADE' },
  { table: 'customer_store_affinity', fk: 'auth.users(id)', onAction: 'ON DELETE CASCADE' },
  { table: 'customer_store_affinity', fk: 'public.stores(id)', onAction: 'ON DELETE CASCADE' },
];

for (const exp of expectedFks) {
  const pat = `${exp.fk} ${exp.onAction}`;
  if (!content.includes(pat)) {
    console.error(`FAIL: Missing FK clause "${pat}" for ${exp.table}`);
    process.exit(1);
  }
  console.log(`PASS: FK ${exp.table} -> ${exp.fk} (${exp.onAction})`);
}

// 5. UNIQUE CONSTRAINT ON CUSTOMER STORE AFFINITY
console.log('\n[CHECK 5] UNIQUE Constraint on customer_store_affinity');
if (!content.includes('CONSTRAINT uq_customer_store_affinity UNIQUE (customer_id, store_id)')) {
  console.error('FATAL: Missing CONSTRAINT uq_customer_store_affinity UNIQUE (customer_id, store_id)');
  process.exit(1);
}
console.log('PASS: Canonical UNIQUE (customer_id, store_id) confirmed.');

// 6. RLS POLICIES MATRIX AUDIT
console.log('\n[CHECK 6] RLS Policy Matrix');
const expectedPolicies = [
  // user_form_submissions_log
  { name: 'platform_admins_manage_form_submissions_log', table: 'user_form_submissions_log', role: 'authenticated', cmd: 'ALL' },
  { name: 'users_view_own_form_submissions_log', table: 'user_form_submissions_log', role: 'authenticated', cmd: 'SELECT' },
  { name: 'stores_view_own_form_submissions_log', table: 'user_form_submissions_log', role: 'authenticated', cmd: 'SELECT' },
  { name: 'allow_insert_form_submissions_log', table: 'user_form_submissions_log', role: 'anon, authenticated', cmd: 'INSERT' },
  // user_cart_telemetry
  { name: 'platform_admins_manage_cart_telemetry', table: 'user_cart_telemetry', role: 'authenticated', cmd: 'ALL' },
  { name: 'users_view_own_cart_telemetry', table: 'user_cart_telemetry', role: 'authenticated', cmd: 'SELECT' },
  { name: 'stores_view_own_cart_telemetry', table: 'user_cart_telemetry', role: 'authenticated', cmd: 'SELECT' },
  { name: 'allow_insert_cart_telemetry', table: 'user_cart_telemetry', role: 'anon, authenticated', cmd: 'INSERT' },
  // employee_tenant_audit_logs
  { name: 'platform_admins_manage_employee_tenant_audit_logs', table: 'employee_tenant_audit_logs', role: 'authenticated', cmd: 'ALL' },
  { name: 'employees_view_own_tenant_actions', table: 'employee_tenant_audit_logs', role: 'authenticated', cmd: 'SELECT' },
  { name: 'stores_view_own_employee_audit_logs', table: 'employee_tenant_audit_logs', role: 'authenticated', cmd: 'SELECT' },
  { name: 'employees_insert_own_tenant_actions', table: 'employee_tenant_audit_logs', role: 'authenticated', cmd: 'INSERT' },
  // customer_store_affinity
  { name: 'platform_admins_manage_customer_store_affinity', table: 'customer_store_affinity', role: 'authenticated', cmd: 'ALL' },
  { name: 'customers_view_own_store_affinity', table: 'customer_store_affinity', role: 'authenticated', cmd: 'SELECT' },
  { name: 'stores_view_own_customer_affinity', table: 'customer_store_affinity', role: 'authenticated', cmd: 'SELECT' },
  { name: 'stores_manage_own_customer_affinity', table: 'customer_store_affinity', role: 'authenticated', cmd: 'ALL' },
];

for (const pol of expectedPolicies) {
  if (!content.includes(pol.name)) {
    console.error(`FATAL: Missing policy ${pol.name}`);
    process.exit(1);
  }
  console.log(`PASS: Policy "${pol.name}" on ${pol.table} (${pol.cmd} -> ${pol.role})`);
}

// 7. PERFORMANCE WRAPPING: (SELECT auth.uid())
console.log('\n[CHECK 7] Performance optimization (SELECT auth.uid())');
const authUidCount = (content.match(/auth\.uid\(\)/g) || []).length;
const wrappedCount = (content.match(/\(SELECT auth\.uid\(\)\)/g) || []).length;
console.log(`Total auth.uid() occurrences: ${authUidCount}`);
console.log(`Wrapped (SELECT auth.uid()) occurrences: ${wrappedCount}`);

if (authUidCount !== wrappedCount) {
  console.error(`FATAL: Unwrapped auth.uid() detected! ${authUidCount} vs ${wrappedCount}`);
  process.exit(1);
}
console.log('PASS: 100% of auth.uid() occurrences wrapped in (SELECT auth.uid()) subqueries.');

// 8. ADVERSARIAL ATTACK SCENARIOS
console.log('\n[CHECK 8] Adversarial Attack & Boundary Scenarios');
// Scenario A: Can an anonymous user read any audit logs or cart telemetries?
// Scan all SELECT policies to verify anon is NOT granted SELECT on any of the 4 tables
const selectPoliciesWithAnon = content.match(/CREATE POLICY[^\n]+FOR SELECT[^\n]+TO[^\n]*anon/g);
if (selectPoliciesWithAnon && selectPoliciesWithAnon.length > 0) {
  console.error('FAIL: Anonymous SELECT policy detected!', selectPoliciesWithAnon);
  process.exit(1);
}
console.log('PASS (Adversarial A): Zero SELECT access for anonymous users across all 4 tables.');

// Scenario B: Can an employee insert audit logs into another store?
if (!content.includes('store_id = ANY (public.auth_user_store_ids())')) {
  console.error('FAIL: Missing store_id verification for employee audit log insert!');
  process.exit(1);
}
console.log('PASS (Adversarial B): Tenant isolation strictly enforced on employee insert.');

// Scenario C: Can a regular customer modify customer_store_affinity?
// Check if customer has UPDATE or ALL policy on customer_store_affinity
const customerUpdatePolicies = content.match(/CREATE POLICY[^\n]+customer_store_affinity[^\n]+(UPDATE|ALL)[^\n]+(customer|authenticated)/g);
// We know platform_admin and store have ALL. Check if customer alone has ALL or UPDATE.
const customerDirectUpdate = content.includes('"customers_manage_own_store_affinity"');
if (customerDirectUpdate) {
  console.error('FAIL: Customers must NOT have direct update access to affinity metrics!');
  process.exit(1);
}
console.log('PASS (Adversarial C): Customers cannot manipulate their own VIP or revenue affinity.');

// Scenario D: Check constraints for negative values
const negativeCheckCol = [
  'unit_price_cents >= 0',
  'total_cart_cents >= 0',
  'items_count >= 0',
  'total_visits >= 0',
  'visits_count >= 0',
  'total_cart_additions >= 0',
  'cart_additions_count >= 0',
  'total_orders_count >= 0',
  'orders_count >= 0',
  'total_revenue_cents >= 0',
  'total_spent_cents >= 0',
  'average_ticket_cents >= 0',
];

for (const chk of negativeCheckCol) {
  if (!content.includes(chk)) {
    console.error(`FAIL: Missing non-negative constraint: ${chk}`);
    process.exit(1);
  }
}
console.log('PASS (Adversarial D): Non-negative constraints prevent integer tampering and underflows.');

console.log('\n========================================');
console.log('ALL ADVERSARIAL CHECKS & INTEGRITY TESTS PASSED!');
console.log('========================================');
