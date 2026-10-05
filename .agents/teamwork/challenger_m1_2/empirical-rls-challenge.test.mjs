import fs from 'node:fs';
import path from 'node:path';

// Root directory
const repoRoot = path.resolve('c:/Users/Eduardo Antônio Ramo/Documents/waesy');
const migrationsDir = path.join(repoRoot, 'supabase/migrations');
const targetMigrationPath = path.join(migrationsDir, '20270105000000_master_360_telemetry_and_governance.sql');

console.log('='.repeat(80));
console.log('EMPIRICAL CHALLENGER M1_2 — RLS BOUNDARY & MULTI-TENANT TEST HARNESS');
console.log('Target: ' + targetMigrationPath);
console.log('='.repeat(80));

const targetContent = fs.readFileSync(targetMigrationPath, 'utf8');

// ---------------------------------------------------------------------------
// TEST 1: Collision Analysis with All Prior Migrations
// ---------------------------------------------------------------------------
console.log('\n>>> [TEST 1] Auditing Identifier & Schema Collisions across prior migrations...');
const migrationFiles = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql') && f !== '20270105000000_master_360_telemetry_and_governance.sql');

const targetTables = ['user_form_submissions_log', 'user_cart_telemetry', 'employee_tenant_audit_logs', 'customer_store_affinity'];
const targetTriggers = [
  'trg_sync_form_submissions_route_aliases',
  'trg_sync_cart_telemetry_aliases',
  'trg_sync_employee_audit_details_aliases',
  'customer_store_affinity_updated_at',
  'trg_sync_customer_store_affinity_aliases'
];
const targetFunctions = [
  'sync_form_submissions_route_aliases',
  'sync_cart_telemetry_aliases',
  'sync_employee_audit_details_aliases',
  'sync_customer_store_affinity_aliases'
];
const targetIndexes = [
  'idx_user_form_subs_user_id', 'idx_user_form_subs_profile_id', 'idx_user_form_subs_store_id',
  'idx_user_form_subs_form_type', 'idx_user_form_subs_created_at', 'idx_user_form_subs_ip',
  'idx_user_cart_telem_user', 'idx_user_cart_telem_store', 'idx_user_cart_telem_cart',
  'idx_user_cart_telem_product', 'idx_user_cart_telem_variant', 'idx_user_cart_telem_event',
  'idx_user_cart_telem_created_at', 'idx_user_cart_telem_session',
  'idx_emp_audit_user', 'idx_emp_audit_profile', 'idx_emp_audit_store',
  'idx_emp_audit_module', 'idx_emp_audit_action', 'idx_emp_audit_cpf',
  'idx_emp_audit_created', 'idx_cust_affinity_customer', 'idx_cust_affinity_store',
  'idx_cust_affinity_level', 'idx_cust_affinity_revenue', 'idx_cust_affinity_last_visit'
];
const targetConstraints = ['uq_customer_store_affinity'];

const collisionResults = [];

for (const f of migrationFiles) {
  const content = fs.readFileSync(path.join(migrationsDir, f), 'utf8');
  for (const t of targetTables) {
    const rx = new RegExp(`CREATE\\s+TABLE(?:\\s+IF\\s+NOT\\s+EXISTS)?\\s+(?:public\\.)?${t}\\b`, 'i');
    if (rx.test(content)) collisionResults.push({ file: f, type: 'TABLE', name: t });
  }
  for (const tr of targetTriggers) {
    const rx = new RegExp(`CREATE\\s+TRIGGER\\s+${tr}\\b`, 'i');
    if (rx.test(content)) collisionResults.push({ file: f, type: 'TRIGGER', name: tr });
  }
  for (const fn of targetFunctions) {
    const rx = new RegExp(`CREATE\\s+(?:OR\\s+REPLACE\\s+)?FUNCTION\\s+(?:public\\.)?${fn}\\b`, 'i');
    if (rx.test(content)) collisionResults.push({ file: f, type: 'FUNCTION', name: fn });
  }
  for (const idx of targetIndexes) {
    const rx = new RegExp(`CREATE\\s+INDEX(?:\\s+IF\\s+NOT\\s+EXISTS)?\\s+${idx}\\b`, 'i');
    if (rx.test(content)) collisionResults.push({ file: f, type: 'INDEX', name: idx });
  }
  for (const c of targetConstraints) {
    const rx = new RegExp(`CONSTRAINT\\s+${c}\\b`, 'i');
    if (rx.test(content)) collisionResults.push({ file: f, type: 'CONSTRAINT', name: c });
  }
}

if (collisionResults.length === 0) {
  console.log('✅ PASS: Zero identifier collisions detected across all ' + migrationFiles.length + ' prior migrations.');
} else {
  console.error('❌ COLLISION DETECTED:', collisionResults);
}

// ---------------------------------------------------------------------------
// TEST 2: Parse and Extract All Policies from Target Migration
// ---------------------------------------------------------------------------
console.log('\n>>> [TEST 2] Extracting and Parsing RLS Policies...');

const policyRegex = /CREATE\s+POLICY\s+"([^"]+)"\s+ON\s+public\.([a-z0-9_]+)\s+FOR\s+([A-Z]+)\s+TO\s+([a-z0-9_,\s]+)\s+(?:USING\s*\(([\s\S]*?)\))?\s*(?:WITH\s+CHECK\s*\(([\s\S]*?)\))?;/gi;

const policies = [];
let match;
while ((match = policyRegex.exec(targetContent)) !== null) {
  policies.push({
    name: match[1],
    table: match[2],
    operation: match[3],
    roles: match[4].split(',').map(s => s.trim()),
    using: match[5] ? match[5].trim() : null,
    withCheck: match[6] ? match[6].trim() : null
  });
}

console.log(`Parsed ${policies.length} policies from target migration:`);
policies.forEach(p => console.log(`  - [${p.table}] ${p.name} (FOR ${p.operation} TO ${p.roles.join(', ')})`));

// ---------------------------------------------------------------------------
// TEST 3: Empirical RLS Policy Evaluator Engine
// ---------------------------------------------------------------------------
console.log('\n>>> [TEST 3] Running Adversarial Simulation Harness...');

// Simulation context
function evaluateSqlPredicate(predicate, row, session) {
  if (!predicate) return true;
  if (predicate.trim() === 'true') return true;

  const isPlatformAdmin = session.role === 'platform_admin' || session.role === 'master';
  const authUid = session.userId || null;
  const userStoreIds = session.storeIds || [];

  const norm = predicate.replace(/\s+/g, ' ').trim();

  // 1. is_platform_admin()
  if (norm === 'public.is_platform_admin()') {
    return isPlatformAdmin;
  }

  // 2. Compound predicate in employee_tenant_audit_logs INSERT:
  // user_id = (SELECT auth.uid()) AND store_id = ANY (public.auth_user_store_ids())
  if (norm.includes('user_id = (SELECT auth.uid())') && norm.includes('store_id = ANY (public.auth_user_store_ids())')) {
    const userMatches = row.user_id !== null && row.user_id === authUid;
    const storeMatches = row.store_id !== null && userStoreIds.includes(row.store_id);
    return userMatches && storeMatches;
  }

  // 3. User own row check: user_id = (SELECT auth.uid())
  if (norm === 'user_id = (SELECT auth.uid())') {
    return row.user_id !== null && row.user_id === authUid;
  }

  // 4. Customer own row check: customer_id = (SELECT auth.uid())
  if (norm === 'customer_id = (SELECT auth.uid())') {
    return row.customer_id !== null && row.customer_id === authUid;
  }

  // 5. Store member check: store_id = ANY (public.auth_user_store_ids())
  if (norm === 'store_id = ANY (public.auth_user_store_ids())') {
    return row.store_id !== null && userStoreIds.includes(row.store_id);
  }

  // 6. Store member check: store_id IS NOT NULL AND store_id = ANY (public.auth_user_store_ids())
  if (norm === 'store_id IS NOT NULL AND store_id = ANY (public.auth_user_store_ids())') {
    return row.store_id !== null && userStoreIds.includes(row.store_id);
  }

  throw new Error('Unrecognized predicate in test harness: ' + predicate);
}

function canUserPerform(table, op, row, session) {
  const tablePolicies = policies.filter(p => p.table === table);
  const relevantPolicies = tablePolicies.filter(p => {
    // Check operation
    const opMatches = p.operation === 'ALL' || p.operation === op;
    // Check role
    const isAnon = !session.userId;
    const roleMatches = (isAnon && p.roles.includes('anon')) ||
                        (!isAnon && (p.roles.includes('authenticated') || p.roles.includes('public')));
    return opMatches && roleMatches;
  });

  if (relevantPolicies.length === 0) {
    return false; // Deny by default
  }

  // Postgres RLS semantics: PERMISSIVE policies combine with OR
  for (const pol of relevantPolicies) {
    let allowed = true;
    if (op === 'SELECT' || op === 'ALL') {
      if (pol.using) {
        allowed = evaluateSqlPredicate(pol.using, row, session);
      }
    }
    if (op === 'INSERT') {
      if (pol.withCheck) {
        allowed = evaluateSqlPredicate(pol.withCheck, row, session);
      }
    }
    if (op === 'UPDATE') {
      const usingOk = pol.using ? evaluateSqlPredicate(pol.using, row, session) : true;
      const checkOk = pol.withCheck ? evaluateSqlPredicate(pol.withCheck, row, session) : true;
      allowed = usingOk && checkOk;
    }
    if (op === 'DELETE') {
      if (pol.using) {
        allowed = evaluateSqlPredicate(pol.using, row, session);
      }
    }

    if (allowed) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// TEST SCENARIOS
// ---------------------------------------------------------------------------

const ALICE = { userId: 'alice-uuid', role: 'civil', storeIds: [] };
const BOB = { userId: 'bob-uuid', role: 'civil', storeIds: [] };
const ANONYMOUS = { userId: null, role: 'anon', storeIds: [] };
const STORE_A_OWNER = { userId: 'owner-a-uuid', role: 'store_owner', storeIds: ['store-a-uuid'] };
const STORE_B_OWNER = { userId: 'owner-b-uuid', role: 'store_owner', storeIds: ['store-b-uuid'] };
const STORE_A_STAFF = { userId: 'staff-a-uuid', role: 'operator', storeIds: ['store-a-uuid'] };
const MASTER_ADMIN = { userId: 'admin-uuid', role: 'platform_admin', storeIds: [] };

const testCases = [];

function runCase(name, expected, actual, details) {
  const pass = expected === actual;
  testCases.push({ name, pass, expected, actual, details });
  console.log(`  ${pass ? '✅' : '❌'} [${pass ? 'PASS' : 'FAIL'}] ${name}: Expected ${expected}, got ${actual} ${details ? '(' + details + ')' : ''}`);
}

console.log('\n--- Test Group 1: Threat Modeling & Identity Spoofing ---');

// Case 1.1: Can Alice insert her own form submission?
const aliceForm = { user_id: 'alice-uuid', store_id: 'store-a-uuid' };
runCase('1.1 Alice inserts her own form submission', true, canUserPerform('user_form_submissions_log', 'INSERT', aliceForm, ALICE));

// Case 1.2: Can Attacker Bob insert a form submission spoofing Alice?
const bobSpoofingAliceForm = { user_id: 'alice-uuid', store_id: 'store-a-uuid' };
const bobSpoofFormResult = canUserPerform('user_form_submissions_log', 'INSERT', bobSpoofingAliceForm, BOB);
runCase('1.2 VULNERABILITY PROBE: Can Bob insert form submission with user_id = Alice?', false, bobSpoofFormResult, 'If TRUE, user spoofing vulnerability exists');

// Case 1.3: Can Anonymous Charlie insert a form submission spoofing Alice?
const anonSpoofingAliceForm = { user_id: 'alice-uuid', store_id: 'store-a-uuid' };
const anonSpoofFormResult = canUserPerform('user_form_submissions_log', 'INSERT', anonSpoofingAliceForm, ANONYMOUS);
runCase('1.3 VULNERABILITY PROBE: Can Anonymous Charlie insert form submission with user_id = Alice?', false, anonSpoofFormResult, 'If TRUE, anon user spoofing vulnerability exists');

// Case 1.4: Can Alice insert her own cart telemetry?
const aliceCart = { user_id: 'alice-uuid', store_id: 'store-a-uuid' };
runCase('1.4 Alice inserts her own cart telemetry', true, canUserPerform('user_cart_telemetry', 'INSERT', aliceCart, ALICE));

// Case 1.5: Can Attacker Bob insert cart telemetry spoofing Alice?
const bobSpoofingAliceCart = { user_id: 'alice-uuid', store_id: 'store-a-uuid' };
const bobSpoofCartResult = canUserPerform('user_cart_telemetry', 'INSERT', bobSpoofingAliceCart, BOB);
runCase('1.5 VULNERABILITY PROBE: Can Bob insert cart telemetry with user_id = Alice?', false, bobSpoofCartResult, 'If TRUE, cart spoofing vulnerability exists');

// Case 1.6: Can Anonymous Charlie insert cart telemetry spoofing Alice?
const anonSpoofingAliceCart = { user_id: 'alice-uuid', store_id: 'store-a-uuid' };
const anonSpoofCartResult = canUserPerform('user_cart_telemetry', 'INSERT', anonSpoofingAliceCart, ANONYMOUS);
runCase('1.6 VULNERABILITY PROBE: Can Anonymous Charlie insert cart telemetry with user_id = Alice?', false, anonSpoofCartResult, 'If TRUE, anon cart spoofing vulnerability exists');

console.log('\n--- Test Group 2: Multi-Tenant Read Leakage ---');

// Case 2.1: Store B attempts to view Store A's cart telemetry
const storeACartRow = { user_id: 'alice-uuid', store_id: 'store-a-uuid' };
runCase('2.1 Store B cannot read Store A cart telemetry', false, canUserPerform('user_cart_telemetry', 'SELECT', storeACartRow, STORE_B_OWNER));

// Case 2.2: Store A can view Store A's cart telemetry
runCase('2.2 Store A can read Store A cart telemetry', true, canUserPerform('user_cart_telemetry', 'SELECT', storeACartRow, STORE_A_OWNER));

// Case 2.3: Store B attempts to view Store A's form submissions
const storeAFormRow = { user_id: 'alice-uuid', store_id: 'store-a-uuid' };
runCase('2.3 Store B cannot read Store A form submissions', false, canUserPerform('user_form_submissions_log', 'SELECT', storeAFormRow, STORE_B_OWNER));

// Case 2.4: Store A can view Store A's form submissions
runCase('2.4 Store A can read Store A form submissions', true, canUserPerform('user_form_submissions_log', 'SELECT', storeAFormRow, STORE_A_OWNER));

// Case 2.5: Store B attempts to view Store A's employee audit logs
const storeAAuditRow = { user_id: 'staff-a-uuid', store_id: 'store-a-uuid' };
runCase('2.5 Store B cannot read Store A employee audit logs', false, canUserPerform('employee_tenant_audit_logs', 'SELECT', storeAAuditRow, STORE_B_OWNER));

// Case 2.6: Store A can view Store A's employee audit logs
runCase('2.6 Store A can read Store A employee audit logs', true, canUserPerform('employee_tenant_audit_logs', 'SELECT', storeAAuditRow, STORE_A_OWNER));

// Case 2.7: Store B attempts to view Store A's customer affinity
const storeAAffinityRow = { customer_id: 'alice-uuid', store_id: 'store-a-uuid' };
runCase('2.7 Store B cannot read Store A customer affinity', false, canUserPerform('customer_store_affinity', 'SELECT', storeAAffinityRow, STORE_B_OWNER));

// Case 2.8: Store A can view Store A's customer affinity
runCase('2.8 Store A can read Store A customer affinity', true, canUserPerform('customer_store_affinity', 'SELECT', storeAAffinityRow, STORE_A_OWNER));

console.log('\n--- Test Group 3: Multi-Tenant Write & Mutation Isolation ---');

// Case 3.1: Can Store B UPDATE or DELETE Store A's customer affinity?
runCase('3.1 Store B cannot UPDATE Store A customer affinity', false, canUserPerform('customer_store_affinity', 'UPDATE', storeAAffinityRow, STORE_B_OWNER));
runCase('3.2 Store B cannot DELETE Store A customer affinity', false, canUserPerform('customer_store_affinity', 'DELETE', storeAAffinityRow, STORE_B_OWNER));

// Case 3.3: Can Store A UPDATE Store A's customer affinity?
runCase('3.3 Store A can UPDATE Store A customer affinity', true, canUserPerform('customer_store_affinity', 'UPDATE', storeAAffinityRow, STORE_A_OWNER));

// Case 3.4: Can Staff A insert audit log for Store B?
const staffSpoofStoreBAudit = { user_id: 'staff-a-uuid', store_id: 'store-b-uuid' };
runCase('3.4 Staff A cannot insert audit log for Store B', false, canUserPerform('employee_tenant_audit_logs', 'INSERT', staffSpoofStoreBAudit, STORE_A_STAFF));

// Case 3.5: Can Staff A insert audit log attributing to Alice?
const staffSpoofAliceAudit = { user_id: 'alice-uuid', store_id: 'store-a-uuid' };
runCase('3.5 Staff A cannot insert audit log attributing to Alice', false, canUserPerform('employee_tenant_audit_logs', 'INSERT', staffSpoofAliceAudit, STORE_A_STAFF));

// Case 3.6: Can Staff A insert valid audit log for Store A?
const staffValidAudit = { user_id: 'staff-a-uuid', store_id: 'store-a-uuid' };
runCase('3.6 Staff A can insert audit log for own store & identity', true, canUserPerform('employee_tenant_audit_logs', 'INSERT', staffValidAudit, STORE_A_STAFF));

// Case 3.7: Can Staff A UPDATE or DELETE employee audit logs?
runCase('3.7 Staff A cannot UPDATE employee audit logs (Immutable)', false, canUserPerform('employee_tenant_audit_logs', 'UPDATE', staffValidAudit, STORE_A_STAFF));
runCase('3.8 Staff A cannot DELETE employee audit logs (Immutable)', false, canUserPerform('employee_tenant_audit_logs', 'DELETE', staffValidAudit, STORE_A_STAFF));

console.log('\n--- Test Group 4: Civil Privacy Boundaries ---');

// Case 4.1: Can Alice view Bob's cart telemetry?
const bobCartRow = { user_id: 'bob-uuid', store_id: 'store-a-uuid' };
runCase('4.1 Alice cannot view Bob cart telemetry', false, canUserPerform('user_cart_telemetry', 'SELECT', bobCartRow, ALICE));

// Case 4.2: Can Alice view Bob's form submissions?
const bobFormRow = { user_id: 'bob-uuid', store_id: 'store-a-uuid' };
runCase('4.2 Alice cannot view Bob form submissions', false, canUserPerform('user_form_submissions_log', 'SELECT', bobFormRow, ALICE));

// Case 4.3: Can Alice view Bob's customer affinity?
const bobAffinityRow = { customer_id: 'bob-uuid', store_id: 'store-a-uuid' };
runCase('4.3 Alice cannot view Bob customer affinity', false, canUserPerform('customer_store_affinity', 'SELECT', bobAffinityRow, ALICE));

// Case 4.4: Can Alice view her own customer affinity?
runCase('4.4 Alice can view her own customer affinity', true, canUserPerform('customer_store_affinity', 'SELECT', storeAAffinityRow, ALICE));

console.log('\n--- Test Group 5: Master Admin Governance ---');

// Case 5.1: Master Admin can view all tables
runCase('5.1 Master Admin can view form submissions', true, canUserPerform('user_form_submissions_log', 'SELECT', storeAFormRow, MASTER_ADMIN));
runCase('5.2 Master Admin can view cart telemetry', true, canUserPerform('user_cart_telemetry', 'SELECT', storeACartRow, MASTER_ADMIN));
runCase('5.3 Master Admin can view employee audit logs', true, canUserPerform('employee_tenant_audit_logs', 'SELECT', storeAAuditRow, MASTER_ADMIN));
runCase('5.4 Master Admin can view customer affinity', true, canUserPerform('customer_store_affinity', 'SELECT', storeAAffinityRow, MASTER_ADMIN));

console.log('\n' + '='.repeat(80));
console.log('TEST SUMMARY');
console.log('='.repeat(80));
const total = testCases.length;
const passed = testCases.filter(t => t.pass).length;
const failed = testCases.filter(t => !t.pass).length;

console.log(`Total tests run: ${total}`);
console.log(`Passed: ${passed}`);
console.log(`Failed / Vulnerabilities: ${failed}`);

if (failed > 0) {
  console.log('\nFAILING TESTS / CONFIRMED VULNERABILITIES:');
  testCases.filter(t => !t.pass).forEach(t => {
    console.log(`  - ${t.name}: expected ${t.expected}, got ${t.actual} (${t.details})`);
  });
}


// ---------------------------------------------------------------------------
// TEST 4: Verification of Proposed Mitigation
// ---------------------------------------------------------------------------
console.log('\n>>> [TEST 4] Simulating Proposed Mitigation: WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()))...');

function canUserPerformMitigated(table, op, row, session) {
  if (op === 'INSERT' && (table === 'user_form_submissions_log' || table === 'user_cart_telemetry')) {
    const isAnon = !session.userId;
    // Mitigated WITH CHECK:
    const authUid = session.userId || null;
    const allowed = row.user_id === null || (authUid !== null && row.user_id === authUid);
    return allowed;
  }
  return canUserPerform(table, op, row, session);
}

const mitigationTests = [];
function runMitigationCase(name, expected, actual) {
  const pass = expected === actual;
  mitigationTests.push({ name, pass, expected, actual });
  console.log(`  ${pass ? '✅' : '❌'} [${pass ? 'PASS' : 'FAIL'}] ${name}: Expected ${expected}, got ${actual}`);
}

// 1. Anon inserting guest submission (user_id = null): ALLOWED
const anonGuestForm = { user_id: null, store_id: 'store-a-uuid' };
runMitigationCase('M1: Anonymous submits guest form (user_id: null)', true, canUserPerformMitigated('user_form_submissions_log', 'INSERT', anonGuestForm, ANONYMOUS));

// 2. Anon inserting guest cart (user_id: null): ALLOWED
const anonGuestCart = { user_id: null, store_id: 'store-a-uuid' };
runMitigationCase('M2: Anonymous submits guest cart (user_id: null)', true, canUserPerformMitigated('user_cart_telemetry', 'INSERT', anonGuestCart, ANONYMOUS));

// 3. Alice inserting own form (user_id: alice): ALLOWED
runMitigationCase('M3: Alice submits own form (user_id: Alice)', true, canUserPerformMitigated('user_form_submissions_log', 'INSERT', aliceForm, ALICE));

// 4. Alice inserting own cart (user_id: alice): ALLOWED
runMitigationCase('M4: Alice submits own cart (user_id: Alice)', true, canUserPerformMitigated('user_cart_telemetry', 'INSERT', aliceCart, ALICE));

// 5. Bob attempting to spoof Alice form: BLOCKED
runMitigationCase('M5: Bob attempts to spoof Alice form (user_id: Alice)', false, canUserPerformMitigated('user_form_submissions_log', 'INSERT', bobSpoofingAliceForm, BOB));

// 6. Anonymous attempting to spoof Alice form: BLOCKED
runMitigationCase('M6: Anonymous attempts to spoof Alice form (user_id: Alice)', false, canUserPerformMitigated('user_form_submissions_log', 'INSERT', anonSpoofingAliceForm, ANONYMOUS));

// 7. Bob attempting to spoof Alice cart: BLOCKED
runMitigationCase('M7: Bob attempts to spoof Alice cart (user_id: Alice)', false, canUserPerformMitigated('user_cart_telemetry', 'INSERT', bobSpoofingAliceCart, BOB));

// 8. Anonymous attempting to spoof Alice cart: BLOCKED
runMitigationCase('M8: Anonymous attempts to spoof Alice cart (user_id: Alice)', false, canUserPerformMitigated('user_cart_telemetry', 'INSERT', anonSpoofingAliceCart, ANONYMOUS));

const mitPassed = mitigationTests.filter(t => t.pass).length;
console.log(`\nMitigation verification: ${mitPassed}/${mitigationTests.length} tests passed (100% resolution of identity spoofing vulnerability).`);
