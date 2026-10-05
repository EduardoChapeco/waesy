import assert from 'node:assert';
import { analyzeSource } from './audit-interactive-buttons.mjs';

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (error) {
    console.error(`[FAIL] ${name}`);
    console.error(error.message);
    failed++;
  }
}

function issueTypes(source) {
  return analyzeSource(source, 'src/routes/test.tsx').issues.map((issue) => issue.type);
}

runTest('detecta botão morto sem ação', () => {
  const issues = issueTypes('<Button>Salvar</Button>');
  assert.ok(issues.includes('DEAD_BUTTON_NO_ACTION'));
});

runTest('permite submit válido', () => {
  const issues = issueTypes('<Button type="submit">Salvar</Button>');
  assert.deepStrictEqual(issues, []);
});

runTest('permite Button asChild com Link', () => {
  const issues = issueTypes('<Button asChild><Link to="/workspace">Abrir</Link></Button>');
  assert.deepStrictEqual(issues, []);
});

runTest('detecta Link envolvendo Button sem asChild', () => {
  const issues = issueTypes('<Link to="/x"><Button>Abrir</Button></Link>');
  assert.ok(issues.includes('INVALID_LINK_BUTTON_NESTING'));
});

runTest('detecta toast falso de preview transacional', () => {
  const issues = issueTypes('<Button onClick={() => toast.info("Modo de prévia: após a publicação este botão funcionará.")}>Comprar</Button>');
  assert.ok(issues.includes('FAKE_OR_STUB_ACTION'));
});

runTest('permite preview-only declarado e desabilitado com motivo', () => {
  const issues = issueTypes('<Button disabled data-action-intent="preview-only" data-action-reason="Preview sem transação">Comprar</Button>');
  assert.deepStrictEqual(issues, []);
});

runTest('permite tab por role', () => {
  const issues = issueTypes('<button role="tab">Pedidos</button>');
  assert.deepStrictEqual(issues, []);
});

runTest('permite mutação com evidência estática', () => {
  const issues = issueTypes('<Button onClick={() => saveMutation.mutate({ id })}>Salvar</Button>');
  assert.deepStrictEqual(issues, []);
});

console.log(`\nAudit interactive buttons tests: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exitCode = 1;
}
