// Independent Adversarial Verification Suite for Milestone M1
import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const filesToCheck = [
  'src/components/workspace/mini-sparkline.tsx',
  'src/components/workspace/kpi-metric-card.tsx',
  'src/components/workspace/view-modes/universal-view-manager.tsx',
  'src/components/workspace/view-modes/view-mode-switcher.tsx',
  'src/components/workspace/view-modes/use-workspace-view-mode.ts',
  'src/components/workspace/view-modes/index.ts',
  'src/components/workspace/workspace-canonical-toolbar.tsx',
  'supabase/migrations/20270220030000_workspace_user_view_preferences.sql',
  'src/services/workspace-view-preferences.functions.ts',
  'src/services/__tests__/workspace-view-preferences.test.ts',
];

const results = [];

function check(name, condition, details = '') {
  results.push({ name, passed: Boolean(condition), details });
  console.log(`[${condition ? 'PASS' : 'FAIL'}] ${name}${details ? ` (${details})` : ''}`);
}

console.log('=== REVIEWER M1_2 ADVERSARIAL INTEGRITY & COMPLIANCE AUDIT ===\n');

// 1. Check all files exist
for (const relPath of filesToCheck) {
  const fullPath = path.join(projectRoot, relPath);
  check(`File exists: ${relPath}`, fs.existsSync(fullPath));
}

// 2. Check for Integrity Violations & Cheating (hardcoded mocks / fake logic)
const sparklineContent = fs.readFileSync(path.join(projectRoot, 'src/components/workspace/mini-sparkline.tsx'), 'utf8');
check('MiniSparkline computes dynamic Bezier curves', sparklineContent.includes('pathD += ` C ${midX},${p0.y} ${midX},${p1.y} ${p1.x},${p1.y}`'));
check('MiniSparkline uses dynamic gradient with useId', sparklineContent.includes('React.useId()') && sparklineContent.includes('gradientId'));
check('MiniSparkline prevents division by zero when min === max', sparklineContent.includes('max === min ? 1 : max - min'));
check('MiniSparkline uses tokens, not hardcoded hex', !sparklineContent.includes('#') || sparklineContent.match(/#[0-9a-fA-F]{3,6}/) === null);

// 3. KPI Metric Card
const kpiContent = fs.readFileSync(path.join(projectRoot, 'src/components/workspace/kpi-metric-card.tsx'), 'utf8');
check('KpiMetricCard has isomorphic 1:1 skeleton loading state', kpiContent.includes('if (isLoading)') && kpiContent.includes('aria-busy="true"'));
check('KpiMetricCard tooltip button has 44px touch target (DL-14)', kpiContent.includes('size-11 min-h-11 min-w-11'));
check('KpiMetricCard has focus-visible ring (DL-15)', kpiContent.includes('focus-visible:ring-2'));
check('KpiMetricCard uses font-mono tabular-nums for metric values', kpiContent.includes('font-mono tabular-nums'));

// 4. UniversalViewManager
const uvmContent = fs.readFileSync(path.join(projectRoot, 'src/components/workspace/view-modes/universal-view-manager.tsx'), 'utf8');
check('UniversalViewManager handles 4-state matrix (error, loading, empty, content)', 
  uvmContent.includes('if (isError)') && 
  uvmContent.includes('if (isLoading)') && 
  uvmContent.includes('if (!data || data.length === 0)') &&
  uvmContent.includes('renderTable')
);
check('UniversalViewManager has motion-reduce support', uvmContent.includes('motion-reduce:transition-none'));

// 5. ViewModeSwitcher
const vmsContent = fs.readFileSync(path.join(projectRoot, 'src/components/workspace/view-modes/view-mode-switcher.tsx'), 'utf8');
check('ViewModeSwitcher role="radiogroup" and buttons role="radio"', vmsContent.includes('role="radiogroup"') && vmsContent.includes('role="radio"'));
check('ViewModeSwitcher mobile touch targets >= 44x44px', vmsContent.includes('min-h-11 min-w-11'));
check('ViewModeSwitcher keyboard shortcut guard ignores inputs & modifiers', 
  vmsContent.includes('target.tagName === "INPUT"') &&
  vmsContent.includes('event.ctrlKey || event.metaKey || event.altKey || event.shiftKey')
);

// 6. Migration SQL
const sqlContent = fs.readFileSync(path.join(projectRoot, 'supabase/migrations/20270220030000_workspace_user_view_preferences.sql'), 'utf8');
check('Migration defines table workspace_user_view_preferences', sqlContent.includes('CREATE TABLE IF NOT EXISTS public.workspace_user_view_preferences'));
check('Migration enforces unique constraint on (store_id, user_id, module)', sqlContent.includes('CONSTRAINT uq_workspace_user_view_pref UNIQUE (store_id, user_id, module)'));
check('Migration enables RLS', sqlContent.includes('ENABLE ROW LEVEL SECURITY'));
check('Migration revokes public/anon access (Deny-by-Default)', sqlContent.includes('REVOKE ALL ON public.workspace_user_view_preferences FROM anon'));
check('Migration has multi-tenant checks via store_members or workspace_members', 
  sqlContent.includes('public.store_members') && 
  sqlContent.includes('public.workspace_members')
);

// 7. BFF Functions
const bffContent = fs.readFileSync(path.join(projectRoot, 'src/services/workspace-view-preferences.functions.ts'), 'utf8');
check('BFF validates store_id as UUID in Zod schema', bffContent.includes('z.string().uuid'));
check('BFF destructs 100% of parameters (Invariante B.25)', 
  bffContent.includes('{ data: { store_id, module } }') &&
  bffContent.includes('{ data: { store_id, module, view_mode, column_settings, sort_field, sort_direction, filters } }')
);
check('BFF enforces store access via assertStoreAccess', bffContent.includes('assertStoreAccess(identity, STAFF_ROLES)'));
check('BFF upsert uses onConflict store_id,user_id,module', bffContent.includes('onConflict: "store_id,user_id,module"'));

const totalPassed = results.filter(r => r.passed).length;
console.log(`\n======================================================`);
console.log(`AUDIT RESULTS: ${totalPassed} / ${results.length} checks PASSED`);
console.log(`======================================================\n`);

if (totalPassed !== results.length) {
  process.exit(1);
} else {
  process.exit(0);
}
