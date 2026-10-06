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

runTest('detecta handler vazio inline mesmo com comentario', () => {
  assert.ok(issueTypes('<Button onClick={() => { /* nada */ }}>Salvar</Button>').includes('FAKE_OR_STUB_ACTION'));
});

runTest('detecta handler nomeado vazio no escopo local', () => {
  assert.ok(issueTypes('function Screen() { const save = () => {}; return <Button onClick={save}>Salvar</Button>; }').includes('FAKE_OR_STUB_ACTION'));
});

runTest('detecta useCallback que retorna undefined', () => {
  assert.ok(issueTypes('function Screen() { const save = useCallback(() => undefined, []); return <Button onClick={save}>Salvar</Button>; }').includes('FAKE_OR_STUB_ACTION'));
});

runTest('detecta sucesso falso de handler nomeado', () => {
  assert.ok(issueTypes('function Screen() { function save() { toast.success("Salvo!"); } return <Button onClick={save}><span>Salvar</span></Button>; }').includes('FAKE_OR_STUB_ACTION'));
});

runTest('permite toast depois de mutacao real', () => {
  assert.deepStrictEqual(issueTypes('function Screen() { const save = async () => { await mutation.mutateAsync(); toast.success("Salvo!"); }; return <Button onClick={save}>Salvar</Button>; }'), []);
});

runTest('nao mistura handlers de funcoes irmas', () => {
  const result = analyzeSource('function A() { const save = () => {}; return <Button onClick={save}>Salvar</Button>; } function B() { const save = () => mutate(); return <Button onClick={save}>Salvar</Button>; }');
  assert.equal(result.issues.filter((issue) => issue.type === 'FAKE_OR_STUB_ACTION').length, 1);
});

runTest('detecta destino vazio, placeholder ou javascript', () => {
  for (const destination of ['', '#', 'javascript:void(0)']) assert.ok(issueTypes(`<a href="${destination}">Abrir</a>`).includes('INVALID_LINK_DESTINATION'));
});

runTest('permite ancora real e destino dinamico', () => {
  assert.deepStrictEqual(issueTypes('<a href="#conteudo">Ir ao conteúdo</a>'), []);
  assert.deepStrictEqual(issueTypes('<Link to={destination}>Abrir</Link>'), []);
});

runTest('inclui controles role button na auditoria', () => {
  assert.ok(issueTypes('<div role="button">Abrir</div>').includes('DEAD_BUTTON_NO_ACTION'));
});

runTest('asChild false nao mascara botao morto', () => {
  assert.ok(issueTypes('<Button asChild={false}>Abrir</Button>').includes('DEAD_BUTTON_NO_ACTION'));
});

runTest('nao confunde icone Link com Link de navegacao', () => {
  const result = analyzeSource('import { Link } from "lucide-react"; export const Icon = () => <Link />;');
  assert.equal(result.controls.length, 0);
  assert.deepStrictEqual(result.issues, []);
});

console.log(`\nAudit interactive buttons tests: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  process.exitCode = 1;
}
