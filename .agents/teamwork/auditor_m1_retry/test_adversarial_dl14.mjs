import assert from 'node:assert';
import { parseJsxTags, lintSource } from '../../../scripts/design-lint.mjs';

console.log('Testing parseJsxTags and DL-14 on adversarial cases...');

const testConfig = {
  rules: {
    'DL-14': { severity: 'P1', enabled: true },
    'DL-15': { severity: 'P0', enabled: true }
  }
};

// Case 1: Multiline <button> with h-8 on line 2
const code1 = `<button\n  type="button"\n  className="h-8 px-2"\n>\nClick\n</button>`;
const tags1 = parseJsxTags(code1);
assert.strictEqual(tags1.length, 1, 'Should find 1 tag');
assert.strictEqual(tags1[0].tagName, 'button');
const v1 = lintSource(code1, 'src/routes/test.tsx', testConfig);
const dl14_1 = v1.filter(v => v.id === 'DL-14');
assert.strictEqual(dl14_1.length, 1, 'Should flag DL-14 for multiline button with h-8');
assert.strictEqual(dl14_1[0].line, 3, 'Violation line should be 3');
console.log('Case 1 PASS: Multiline button flagged at correct line.');

// Case 2: Multiline <Button> with h-9
const code2 = `<Button\n  variant="outline"\n  className="rounded-lg text-xs font-bold h-9 px-4"\n>\nSubmit\n</Button>`;
const v2 = lintSource(code2, 'src/routes/test.tsx', testConfig);
const dl14_2 = v2.filter(v => v.id === 'DL-14');
assert.strictEqual(dl14_2.length, 1, 'Should flag DL-14 for multiline Button with h-9');
assert.strictEqual(dl14_2[0].line, 3, 'Violation line should be 3');
console.log('Case 2 PASS: Multiline Button flagged at correct line.');

// Case 3: Multiline <Link> with onClick and size-8
const code3 = `<Link\n  to="/home"\n  onClick={() => {}}\n  className="size-8"\n>\nHome\n</Link>`;
const v3 = lintSource(code3, 'src/routes/test.tsx', testConfig);
const dl14_3 = v3.filter(v => v.id === 'DL-14');
assert.strictEqual(dl14_3.length, 1, 'Should flag DL-14 for multiline Link with size-8');
console.log('Case 3 PASS: Multiline Link flagged.');

// Case 4: Multiline with h-11 (compliant)
const code4 = `<Button\n  size="sm"\n  className="rounded-lg font-bold text-xs h-11 px-4"\n>\nClick\n</Button>`;
const v4 = lintSource(code4, 'src/routes/test.tsx', testConfig);
const dl14_4 = v4.filter(v => v.id === 'DL-14');
assert.strictEqual(dl14_4.length, 0, 'Should NOT flag DL-14 when h-11 is used');
console.log('Case 4 PASS: Compliant h-11 passes cleanly.');

// Case 5: Attributes with > inside quotes
const code5 = `<Button\n  title="Click > here"\n  className="h-10"\n>\nClick\n</Button>`;
const tags5 = parseJsxTags(code5);
assert.strictEqual(tags5.length, 1, 'Should parse entire tag despite > in string attribute');
const v5 = lintSource(code5, 'src/routes/test.tsx', testConfig);
const dl14_5 = v5.filter(v => v.id === 'DL-14');
assert.strictEqual(dl14_5.length, 1, 'Should flag DL-14 despite > in string attribute');
console.log('Case 5 PASS: Quotes with > handled correctly.');

// Case 6: Attributes with > inside braces
const code6 = `<Button\n  onClick={() => 2 > 1}\n  className="h-8"\n>\nClick\n</Button>`;
const tags6 = parseJsxTags(code6);
assert.strictEqual(tags6.length, 1, 'Should parse entire tag despite > in brace expression');
const v6 = lintSource(code6, 'src/routes/test.tsx', testConfig);
const dl14_6 = v6.filter(v => v.id === 'DL-14');
assert.strictEqual(dl14_6.length, 1, 'Should flag DL-14 despite > in expression');
console.log('Case 6 PASS: Brace expressions with > handled correctly.');

// Case 7: Tag inside block comment
const code7 = `/*\n<Button className="h-8">Click</Button>\n*/\n<div />`;
const v7 = lintSource(code7, 'src/routes/test.tsx', testConfig);
const dl14_7 = v7.filter(v => v.id === 'DL-14');
assert.strictEqual(dl14_7.length, 0, 'Commented-out tag should NOT produce violations');
console.log('Case 7 PASS: Block comments skipped.');

console.log('\nALL 7 ADVERSARIAL CASES PASSED EMPIRICALLY!');
