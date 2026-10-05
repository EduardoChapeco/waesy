import assert from 'node:assert';
import { lintSource } from '../../../scripts/design-lint.mjs';

const config = {
  rules: {
    'DL-01': { severity: 'P1', enabled: true },
    'DL-02': { severity: 'P1', enabled: true },
    'DL-03': { severity: 'P1', enabled: true },
    'DL-04': { severity: 'P0', enabled: true },
    'DL-05': { severity: 'P1', enabled: true },
    'DL-14': { severity: 'P1', enabled: true },
    'DL-15': { severity: 'P0', enabled: true },
    'DL-18': { severity: 'P1', enabled: true },
    'DL-23': { severity: 'P2', enabled: true },
    'DL-26': { severity: 'P2', enabled: true },
    'DL-27': { severity: 'P3', enabled: true },
    'DL-28': { severity: 'P1', enabled: true },
  },
  allowlist: []
};

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    failed++;
  }
}

console.log("=== ADVERSARIAL INTEGRITY SUITE FOR DESIGN-LINT ===");

// 1. DL-04 tests
check("DL-04 catches literal !important in css", () => {
  const code = `.btn { display: block !important; }`;
  const v = lintSource(code, 'src/test.css', config);
  assert.ok(v.some(x => x.id === 'DL-04'), "Must catch !important in css");
});

check("DL-04 catches literal !important in tsx", () => {
  const code = `<div style={{ display: 'block !important' }}>X</div>`;
  const v = lintSource(code, 'src/routes/test.tsx', config);
  assert.ok(v.some(x => x.id === 'DL-04'), "Must catch !important in tsx");
});

check("DL-04 catches Tailwind !p-4 in className", () => {
  const code = `<div className="!p-4 bg-card">X</div>`;
  const v = lintSource(code, 'src/routes/test.tsx', config);
  assert.ok(v.some(x => x.id === 'DL-04'), "Must catch !p-4 in className");
});

check("DL-04 catches Tailwind !hidden in className", () => {
  const code = `<div className="!hidden">X</div>`;
  const v = lintSource(code, 'src/routes/test.tsx', config);
  assert.ok(v.some(x => x.id === 'DL-04'), "Must catch !hidden in className");
});

check("DL-04 catches Tailwind !text-red-500 in cn()", () => {
  const code = `const c = cn("!text-red-500", "p-2");`;
  const v = lintSource(code, 'src/routes/test.tsx', config);
  assert.ok(v.some(x => x.id === 'DL-04'), "Must catch !text-red-500 in cn()");
});

check("DL-04 DOES NOT flag boolean !listing", () => {
  const code = `if (!listing) return null;`;
  const v = lintSource(code, 'src/routes/test.tsx', config);
  assert.ok(!v.some(x => x.id === 'DL-04'), "Must not flag boolean !listing");
});

check("DL-04 DOES NOT flag boolean !isLoading inside ternary with string", () => {
  const code = `const status = !isLoading ? "Ready" : "Loading";`;
  const v = lintSource(code, 'src/routes/test.tsx', config);
  assert.ok(!v.some(x => x.id === 'DL-04'), "Must not flag boolean !isLoading in ternary");
});

// 2. DL-15 tests
check("DL-15 catches single-line <button onClick={...}> without focus-visible", () => {
  const code = `<button onClick={() => doSomething()} className="p-2">Click</button>`;
  const v = lintSource(code, 'src/routes/test.tsx', config);
  assert.ok(v.some(x => x.id === 'DL-15'), "Must catch single-line button without focus-visible");
});

check("DL-15 catches multi-line <button ...> without focus-visible", () => {
  const code = `<button
    type="button"
    className="p-2 bg-primary"
    onClick={() => doSomething()}
  >
    Click
  </button>`;
  const v = lintSource(code, 'src/routes/test.tsx', config);
  assert.ok(v.some(x => x.id === 'DL-15'), "Must catch multi-line button without focus-visible");
});

check("DL-15 DOES NOT flag multi-line <button ...> with focus-visible on line 4", () => {
  const code = `<button
    type="button"
    onClick={() => doSomething()}
    className="p-2 focus-visible:ring-2 focus-visible:outline-none"
  >
    Click
  </button>`;
  const v = lintSource(code, 'src/routes/test.tsx', config);
  assert.ok(!v.some(x => x.id === 'DL-15'), "Must pass multi-line button with focus-visible");
});

check("DL-15 catches <div> with onClick without focus-visible", () => {
  const code = `<div onClick={() => doSomething()} className="p-2">Clickable div</div>`;
  const v = lintSource(code, 'src/routes/test.tsx', config);
  assert.ok(v.some(x => x.id === 'DL-15'), "Must catch div with onClick without focus-visible");
});

check("DL-15 allows <Button onClick={...}> from Design System", () => {
  const code = `<Button onClick={() => doSomething()} className="p-2">DS Button</Button>`;
  const v = lintSource(code, 'src/routes/test.tsx', config);
  assert.ok(!v.some(x => x.id === 'DL-15'), "Must allow DS Button");
});

// 3. DL-01, DL-02, DL-14, DL-18, DL-23
check("DL-01 catches hex color #123456 in className", () => {
  const code = `<div className="text-[#123456]">Hex</div>`;
  const v = lintSource(code, 'src/routes/test.tsx', config);
  assert.ok(v.some(x => x.id === 'DL-01'), "Must catch hex in className");
});

check("DL-02 catches arbitrary brackets w-[327px]", () => {
  const code = `<div className="w-[327px]">Arbitrary</div>`;
  const v = lintSource(code, 'src/routes/test.tsx', config);
  assert.ok(v.some(x => x.id === 'DL-02'), "Must catch w-[327px]");
});

check("DL-14 catches touch target size h-8 in interactive element", () => {
  const code = `<button className="h-8 w-8 focus-visible:ring-2">Small</button>`;
  const v = lintSource(code, 'src/routes/test.tsx', config);
  assert.ok(v.some(x => x.id === 'DL-14'), "Must catch h-8 on button");
});

check("DL-18 catches literal text-white", () => {
  const code = `<span className="text-white">White</span>`;
  const v = lintSource(code, 'src/routes/test.tsx', config);
  assert.ok(v.some(x => x.id === 'DL-18'), "Must catch text-white");
});

check("DL-23 catches literal emoji in JSX", () => {
  const code = `<div>Rocket 🚀</div>`;
  const v = lintSource(code, 'src/routes/test.tsx', config);
  assert.ok(v.some(x => x.id === 'DL-23'), "Must catch emoji");
});

console.log(`\nAdversarial Results: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
