import { lintSource } from '../../../scripts/design-lint.mjs';

const cases = [
  { name: 'Plain !bg-red-500', code: '<div className="!bg-red-500" />' },
  { name: 'hover:!bg-red-500', code: '<div className="hover:!bg-red-500" />' },
  { name: 'sm:!p-4', code: '<div className="sm:!p-4" />' },
  { name: 'md:!hidden', code: '<div className="md:!hidden" />' },
  { name: '!important in style', code: '<div style={{ color: "red !important" }} />' },
  { name: 'Boolean negation !isLoading', code: 'if (!isLoading) { return null; }' },
  { name: 'Boolean negation in ternary', code: 'const x = !active ? 1 : 2;' },
  { name: 'DL-15: multi-line button with focus-visible', code: '<button\n  type="button"\n  className="focus-visible:ring-2"\n  onClick={() => {}}\n>' },
  { name: 'DL-15: multi-line button without focus-visible', code: '<button\n  type="button"\n  onClick={() => {}}\n>' },
  { name: 'DL-15: button without onClick and without focus-visible', code: '<button type="button">Click</button>' },
  { name: 'DL-15: div with onClick without focus-visible', code: '<div onClick={() => {}}>Click</div>' },
  { name: 'DL-15: div with onClick and focus-visible', code: '<div className="focus-visible:ring-2" onClick={() => {}}>Click</div>' },
  { name: 'DL-15: Button DS component without explicit focus-visible', code: '<Button onClick={() => {}}>Click</Button>' },
  { name: 'DL-15: custom component MyButton without focus-visible', code: '<MyButton onClick={() => {}}>Click</MyButton>' },
  { name: 'DL-15: custom component Clickable without focus-visible', code: '<Clickable onClick={() => {}}>Click</Clickable>' },
  { name: 'DL-15: button with comparison < and > earlier in file', code: 'const valid = a < b && c > d;\n<button type="button" onClick={() => {}}>Click</button>' },
  { name: 'DL-15: button with arrow fn in prop', code: '<button onClick={() => doSomething()} className="p-2">Click</button>' },
];

for (const c of cases) {
  const violations = lintSource(c.code, 'src/test.tsx');
  console.log(`=== ${c.name} ===`);
  console.log(`Violations: ${violations.length}`);
  for (const v of violations) {
    console.log(`  [${v.id}] line ${v.line}: ${v.message} (${v.match})`);
  }
}
