import assert from 'node:assert';
import { lintSource, evaluateRatchet, parseInlineExemptions, getModule } from './design-lint.mjs';

console.log(`\n======================================================================`);
console.log(`SUÍTE DE TESTES NORMATIVOS — DESIGN LINT V2 (DL-01 a DL-30)`);
console.log(`======================================================================\n`);

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failedTests++;
  }
}

// Configuração canônica de teste com todas as regras ativas
const testConfig = {
  rules: {
    'DL-01': { severity: 'P1', enabled: true },
    'DL-02': { severity: 'P1', enabled: true },
    'DL-03': { severity: 'P1', enabled: true },
    'DL-04': { severity: 'P0', enabled: true },
    'DL-05': { severity: 'P1', enabled: true },
    'DL-06': { severity: 'P2', enabled: true },
    'DL-07': { severity: 'P2', enabled: true },
    'DL-08': { severity: 'P2', enabled: true },
    'DL-09': { severity: 'P2', enabled: true },
    'DL-11': { severity: 'P1', enabled: true },
    'DL-12': { severity: 'P1', enabled: true },
    'DL-13': { severity: 'P1', enabled: true },
    'DL-14': { severity: 'P1', enabled: true },
    'DL-15': { severity: 'P0', enabled: true },
    'DL-18': { severity: 'P1', enabled: true },
    'DL-19': { severity: 'P2', enabled: true },
    'DL-21': { severity: 'P2', enabled: true },
    'DL-23': { severity: 'P2', enabled: true },
    'DL-24': { severity: 'P2', enabled: true },
    'DL-25': { severity: 'P1', enabled: true },
    'DL-26': { severity: 'P2', enabled: true },
    'DL-27': { severity: 'P3', enabled: true },
    'DL-28': { severity: 'P1', enabled: true },
    'DL-29': { severity: 'P2', enabled: true },
    'DL-30': { severity: 'P2', enabled: true }
  },
  allowlist: [
    {
      id: 'DL-01',
      file: 'src/styles.css',
      reason: 'Tokens base CSS autorizados',
      date: '2026-09-29',
      expiry: '2029-12-31'
    }
  ]
};

// 1. DL-01: Cores Literais (#hex e rgb/hsl)
runTest('DL-01: Detecta hex literal e rgb()', () => {
  const code = `<div className="text-[#333333]"> <span style={{ color: '#ff0000' }}>Erro</span> </div>`;
  const violations = lintSource(code, 'src/components/ui/card.tsx', testConfig);
  const dl01 = violations.filter(v => v.id === 'DL-01');
  assert.ok(dl01.length >= 2, 'Deve flagrar pelo menos 2 cores literais');
  assert.strictEqual(dl01[0].severity, 'P1');
});

runTest('DL-01: Permite cores por token semântico', () => {
  const code = `<div className="text-foreground bg-background border-border">Texto</div>`;
  const violations = lintSource(code, 'src/components/ui/card.tsx', testConfig);
  const dl01 = violations.filter(v => v.id === 'DL-01');
  assert.strictEqual(dl01.length, 0, 'Tokens semânticos não devem flagrar DL-01');
});

// 2. DL-02: Classes Arbitrárias com Colchetes
runTest('DL-02: Detecta utilitários com colchetes arbitrários', () => {
  const code = `<div className="w-[327px] mt-[13px] text-[15px]">Painel</div>`;
  const violations = lintSource(code, 'src/routes/store/view.tsx', testConfig);
  const dl02 = violations.filter(v => v.id === 'DL-02');
  assert.strictEqual(dl02.length, 3, 'Deve flagrar as 3 classes arbitrárias');
  assert.strictEqual(dl02[0].severity, 'P1');
});

runTest('DL-02: Permite classes utilitárias canônicas', () => {
  const code = `<div className="w-80 mt-4 text-sm">Painel</div>`;
  const violations = lintSource(code, 'src/routes/store/view.tsx', testConfig);
  const dl02 = violations.filter(v => v.id === 'DL-02');
  assert.strictEqual(dl02.length, 0);
});

runTest('DL-02: distingue variantes de estado de valores arbitrarios', () => {
  const code = '<button className="data-[state=open]:bg-muted aria-[expanded=true]:text-foreground data-[state=closed]:w-[327px]">Abrir</button>';
  const violations = lintSource(code, 'src/components/ui/example.tsx', testConfig).filter(v => v.id === 'DL-02');
  assert.strictEqual(violations.length, 1);
  assert.strictEqual(violations[0].match, 'w-[327px]');
});

// 3. DL-03: Espaçamento Fora da Grade de 4px
runTest('DL-03: Detecta espaçamento em half-steps (0.5, 1.5, 2.5, 3.5)', () => {
  const code = `<div className="p-0.5 m-1.5 gap-2.5 space-x-3.5">Grade Quebrada</div>`;
  const violations = lintSource(code, 'src/routes/workspace/page.tsx', testConfig);
  const dl03 = violations.filter(v => v.id === 'DL-03');
  assert.strictEqual(dl03.length, 4, 'Deve flagrar 4 espaçamentos fora da grade de 4px');
  assert.strictEqual(dl03[0].severity, 'P1');
});

runTest('DL-03: Permite espaçamentos múltiplos de 4px (p-1, p-2, p-3, p-4)', () => {
  const code = `<div className="p-1 m-2 gap-4 space-x-6">Grade Canônica</div>`;
  const violations = lintSource(code, 'src/routes/workspace/page.tsx', testConfig);
  const dl03 = violations.filter(v => v.id === 'DL-03');
  assert.strictEqual(dl03.length, 0);
});

// 4. DL-04: !important e modificadores de força bruta
runTest('DL-04: Detecta !important e prefixos de exclamação no Tailwind', () => {
  const code = `<div className="!flex !text-red-500">Alerta</div>\n/* CSS: display: block !important; */`;
  const violations = lintSource(code, 'src/routes/admin/audit.tsx', testConfig);
  const dl04 = violations.filter(v => v.id === 'DL-04');
  assert.ok(dl04.length >= 2, 'Deve flagrar modificadores de força bruta');
  assert.strictEqual(dl04[0].severity, 'P0');
});

// 5. DL-05: Inline style com propriedades visuais
runTest('DL-05: Detecta style={{ padding: 10, color: "blue" }}', () => {
  const code = `<div style={{ padding: 10, color: 'blue' }}>Bloco</div>`;
  const violations = lintSource(code, 'src/components/tourism/trip.tsx', testConfig);
  const dl05 = violations.filter(v => v.id === 'DL-05');
  assert.strictEqual(dl05.length, 1);
  assert.strictEqual(dl05[0].severity, 'P1');
});

// 6. DL-06: Z-index arbitrário ou acima de 50
runTest('DL-06: Detecta z-60 e z-[9999]', () => {
  const code = `<div className="z-60">Fundo</div>\n<div className="z-[9999]">Topo</div>`;
  const violations = lintSource(code, 'src/components/ui/modal.tsx', testConfig);
  const dl06 = violations.filter(v => v.id === 'DL-06');
  assert.strictEqual(dl06.length, 2);
  assert.strictEqual(dl06[0].severity, 'P2');
});

runTest('DL-06: Permite z-index na escala (0, 10, 20, 30, 40, 50)', () => {
  const code = `<div className="z-10">Fundo</div>\n<div className="z-50">Topo</div>`;
  const violations = lintSource(code, 'src/components/ui/modal.tsx', testConfig);
  const dl06 = violations.filter(v => v.id === 'DL-06');
  assert.strictEqual(dl06.length, 0);
});

// 7. DL-07: Sombra em superfície de aplicação
runTest('DL-07: Detecta sombra decorativa em cards normais', () => {
  const code = `<div className="card shadow-lg bg-card">Cartão Normal</div>`;
  const violations = lintSource(code, 'src/routes/store/catalog.tsx', testConfig);
  const dl07 = violations.filter(v => v.id === 'DL-07');
  assert.strictEqual(dl07.length, 1);
  assert.strictEqual(dl07[0].severity, 'P2');
});

runTest('DL-07: Permite sombra em popover/dialog/modal', () => {
  const code = `<div role="dialog" className="modal shadow-lg">Modal Permitido</div>`;
  const violations = lintSource(code, 'src/components/ui/dialog.tsx', testConfig);
  const dl07 = violations.filter(v => v.id === 'DL-07');
  assert.strictEqual(dl07.length, 0);
});

// 8. DL-08: Gradiente decorativo em superfície utilitária
runTest('DL-08: Detecta gradiente decorativo bg-gradient-to-r', () => {
  const code = `<button className="bg-gradient-to-r from-blue-500 to-purple-600">Ação</button>`;
  const violations = lintSource(code, 'src/components/ui/button.tsx', testConfig);
  const dl08 = violations.filter(v => v.id === 'DL-08');
  assert.strictEqual(dl08.length, 1);
  assert.strictEqual(dl08[0].severity, 'P2');
});

// 9. DL-09: Raios não-canônicos
runTest('DL-09: Detecta rounded-xl, rounded-2xl e rounded-[14px]', () => {
  const code = `<div className="rounded-xl">1</div><div className="rounded-2xl">2</div><div className="rounded-[14px]">3</div>`;
  const violations = lintSource(code, 'src/components/app/badge.tsx', testConfig);
  const dl09 = violations.filter(v => v.id === 'DL-09');
  assert.strictEqual(dl09.length, 3);
  assert.strictEqual(dl09[0].severity, 'P2');
});

runTest('DL-09: Permite raios canônicos: none, sm, md, lg, full', () => {
  const code = `<div className="rounded-none rounded-sm rounded-md rounded-lg rounded-full">OK</div>`;
  const violations = lintSource(code, 'src/components/app/badge.tsx', testConfig);
  const dl09 = violations.filter(v => v.id === 'DL-09');
  assert.strictEqual(dl09.length, 0);
});

// 10. DL-11: Superfície de dados sem loading skeleton
runTest('DL-11: Detecta useQuery sem loading ou Skeleton', () => {
  const code = `export function ProductsView() {\n  const { data } = useQuery({ queryKey: ['prods'] });\n  return <div>{data?.name}</div>;\n}`;
  const violations = lintSource(code, 'src/routes/store/products.tsx', testConfig);
  const dl11 = violations.filter(v => v.id === 'DL-11');
  assert.strictEqual(dl11.length, 1);
  assert.strictEqual(dl11[0].severity, 'P1');
});

runTest('DL-11: Permite useQuery com isLoading / Skeleton', () => {
  const code = `export function ProductsView() {\n  const { data, isLoading } = useQuery({ queryKey: ['prods'] });\n  if (isLoading) return <Skeleton className="h-20" />;\n  return <div>{data?.name}</div>;\n}`;
  const violations = lintSource(code, 'src/routes/store/products.tsx', testConfig);
  const dl11 = violations.filter(v => v.id === 'DL-11');
  assert.strictEqual(dl11.length, 0);
});

// 11. DL-12: Superfície de dados sem empty state
runTest('DL-12: Detecta .map() em dados de useQuery sem EmptyState', () => {
  const code = `export function List() {\n  const { data } = useQuery({ queryKey: ['items'] });\n  return <div>{data?.items.map(i => <div key={i.id}>{i.name}</div>)}</div>;\n}`;
  const violations = lintSource(code, 'src/routes/store/items.tsx', testConfig);
  const dl12 = violations.filter(v => v.id === 'DL-12');
  assert.strictEqual(dl12.length, 1);
  assert.strictEqual(dl12[0].severity, 'P1');
});

runTest('DL-12: Permite listagem com verificação de length === 0 ou EmptyState', () => {
  const code = `export function List() {\n  const { data } = useQuery({ queryKey: ['items'] });\n  if (data?.length === 0) return <EmptyState />;\n  return <div>{data?.map(i => <div key={i.id}>{i.name}</div>)}</div>;\n}`;
  const violations = lintSource(code, 'src/routes/store/items.tsx', testConfig);
  const dl12 = violations.filter(v => v.id === 'DL-12');
  assert.strictEqual(dl12.length, 0);
});

// 12. DL-13: Superfície de dados sem tratamento de erro
runTest('DL-13: Detecta useQuery sem isError / error handling', () => {
  const code = `export function View() {\n  const { data, isLoading } = useQuery({ queryKey: ['q'] });\n  if (isLoading) return <Skeleton />;\n  return <div>{data}</div>;\n}`;
  const violations = lintSource(code, 'src/routes/store/view.tsx', testConfig);
  const dl13 = violations.filter(v => v.id === 'DL-13');
  assert.strictEqual(dl13.length, 1);
  assert.strictEqual(dl13[0].severity, 'P1');
});

runTest('DL-13: Permite useQuery com isError e diagnóstico', () => {
  const code = `export function View() {\n  const { data, isLoading, isError } = useQuery({ queryKey: ['q'] });\n  if (isLoading) return <Skeleton />;\n  if (isError) return <div>Erro ao carregar dados</div>;\n  return <div>{data}</div>;\n}`;
  const violations = lintSource(code, 'src/routes/store/view.tsx', testConfig);
  const dl13 = violations.filter(v => v.id === 'DL-13');
  assert.strictEqual(dl13.length, 0);
});

// 13. DL-14: Alvo interativo < 44px
runTest('DL-14: Detecta botão interativo com h-8 ou size-9 (< 44px)', () => {
  const code = `<button onClick={() => {}} className="h-8 w-8">OK</button>`;
  const violations = lintSource(code, 'src/routes/civil/action.tsx', testConfig);
  const dl14 = violations.filter(v => v.id === 'DL-14');
  assert.strictEqual(dl14.length, 1);
  assert.strictEqual(dl14[0].severity, 'P1');
});

// 14. DL-15: Interativo sem focus-visible
runTest('DL-15: Detecta <button onClick> sem focus-visible', () => {
  const code = `<button onClick={() => doSomething()} className="p-2 bg-primary">Ação</button>`;
  const violations = lintSource(code, 'src/routes/civil/action.tsx', testConfig);
  const dl15 = violations.filter(v => v.id === 'DL-15');
  assert.strictEqual(dl15.length, 1);
  assert.strictEqual(dl15[0].severity, 'P0');
});

runTest('DL-15: Permite elemento com anel focus-visible:ring-2', () => {
  const code = `<button onClick={() => doSomething()} className="p-2 focus-visible:ring-2 focus-visible:outline-none">Ação</button>`;
  const violations = lintSource(code, 'src/routes/civil/action.tsx', testConfig);
  const dl15 = violations.filter(v => v.id === 'DL-15');
  assert.strictEqual(dl15.length, 0);
});

// 15. DL-18: Hardcoded white/black literal
runTest('DL-18: Detecta text-white e bg-black', () => {
  const code = `<div className="text-white bg-black">Contraste Hardcoded</div>`;
  const violations = lintSource(code, 'src/components/ui/card.tsx', testConfig);
  const dl18 = violations.filter(v => v.id === 'DL-18');
  assert.strictEqual(dl18.length, 2);
  assert.strictEqual(dl18[0].severity, 'P1');
});

// 16. DL-19: Título composto (> 6 palavras)
runTest('DL-19: Detecta título de cabeçalho com mais de 6 palavras', () => {
  const code = `<h1>Painel Administrativo Geral De Gestão De Pedidos Locais</h1>`;
  const violations = lintSource(code, 'src/routes/admin/orders.tsx', testConfig);
  const dl19 = violations.filter(v => v.id === 'DL-19');
  assert.strictEqual(dl19.length, 1);
  assert.strictEqual(dl19[0].severity, 'P2');
});

runTest('DL-19: Permite título conciso (<= 6 palavras)', () => {
  const code = `<h1>Gestão de Pedidos</h1>`;
  const violations = lintSource(code, 'src/routes/admin/orders.tsx', testConfig);
  const dl19 = violations.filter(v => v.id === 'DL-19');
  assert.strictEqual(dl19.length, 0);
});

// 17. DL-21: Texto que explica a própria tela
runTest('DL-21: Detecta texto prolixo que explica a própria tela', () => {
  const code = `<p>Esta tela permite gerenciar os usuários cadastrados na plataforma.</p>`;
  const violations = lintSource(code, 'src/routes/admin/users.tsx', testConfig);
  const dl21 = violations.filter(v => v.id === 'DL-21');
  assert.strictEqual(dl21.length, 1);
  assert.strictEqual(dl21[0].severity, 'P2');
});

// 18. DL-23: Emojis na interface
runTest('DL-23: Detecta emojis literais no JSX', () => {
  const code = `<div>Parabéns pelo pedido! 🚀 🎉</div>`;
  const violations = lintSource(code, 'src/routes/store/success.tsx', testConfig);
  const dl23 = violations.filter(v => v.id === 'DL-23');
  assert.strictEqual(dl23.length, 2);
  assert.strictEqual(dl23[0].severity, 'P2');
});

// 19. DL-24: Barra fixa sem reserva de espaço
runTest('DL-24: Detecta fixed bottom-0 sem pb- de reserva de espaço', () => {
  const code = `export function MobileBar() {\n  return <div className="fixed bottom-0 left-0 right-0">Ação</div>;\n}`;
  const violations = lintSource(code, 'src/routes/store/cart.tsx', testConfig);
  const dl24 = violations.filter(v => v.id === 'DL-24');
  assert.strictEqual(dl24.length, 1);
  assert.strictEqual(dl24[0].severity, 'P2');
});

runTest('DL-24: Permite fixed bottom-0 com reserva pb-20', () => {
  const code = `export function MobileBar() {\n  return <div className="pb-24"><div className="fixed bottom-0 left-0 right-0">Ação</div></div>;\n}`;
  const violations = lintSource(code, 'src/routes/store/cart.tsx', testConfig);
  const dl24 = violations.filter(v => v.id === 'DL-24');
  assert.strictEqual(dl24.length, 0);
});

// 20. DL-25: Mais de uma ação primária por superfície
runTest('DL-25: Detecta múltiplos variant="default" na mesma tela', () => {
  const code = `export function Form() {\n  return (\n    <div>\n      <Button variant="default">Salvar</Button>\n      <Button variant="default">Publicar</Button>\n    </div>\n  );\n}`;
  const violations = lintSource(code, 'src/routes/creator/post.tsx', testConfig);
  const dl25 = violations.filter(v => v.id === 'DL-25');
  assert.strictEqual(dl25.length, 1, 'Deve flagrar a segunda ação primária');
  assert.strictEqual(dl25[0].severity, 'P1');
});

// 21. DL-26: Animação > 300ms
runTest('DL-26: Detecta duration-500 e duration-1000', () => {
  const code = `<div className="duration-500 duration-1000">Lento</div>`;
  const violations = lintSource(code, 'src/components/ui/anim.tsx', testConfig);
  const dl26 = violations.filter(v => v.id === 'DL-26');
  assert.strictEqual(dl26.length, 2);
  assert.strictEqual(dl26[0].severity, 'P2');
});

// 22. DL-27: Transição genérica transition-all
runTest('DL-27: Detecta transition-all', () => {
  const code = `<div className="transition-all hover:opacity-80">Genérico</div>`;
  const violations = lintSource(code, 'src/components/ui/card.tsx', testConfig);
  const dl27 = violations.filter(v => v.id === 'DL-27');
  assert.strictEqual(dl27.length, 1);
  assert.strictEqual(dl27[0].severity, 'P3');
});

// 23. DL-28: Ausência de respeito a movimento reduzido
runTest('DL-28: Detecta animate-spin sem motion-reduce', () => {
  const code = `export function Spinner() { return <div className="animate-spin">Carregando</div>; }`;
  const violations = lintSource(code, 'src/components/ui/spinner.tsx', testConfig);
  const dl28 = violations.filter(v => v.id === 'DL-28');
  assert.strictEqual(dl28.length, 1);
  assert.strictEqual(dl28[0].severity, 'P1');
});

runTest('DL-28: Permite animação com motion-reduce:transition-none', () => {
  const code = `export function Spinner() { return <div className="animate-spin motion-reduce:transition-none">Carregando</div>; }`;
  const violations = lintSource(code, 'src/components/ui/spinner.tsx', testConfig);
  const dl28 = violations.filter(v => v.id === 'DL-28');
  assert.strictEqual(dl28.length, 0);
});

// 24. DL-29: Grid fixo sem guarda de janela
runTest('DL-29: Detecta grid-cols-3 sem prefixo responsivo sm:/md:/lg:', () => {
  const code = `<div className="grid grid-cols-3 gap-4">Quebra no mobile</div>`;
  const violations = lintSource(code, 'src/routes/store/grid.tsx', testConfig);
  const dl29 = violations.filter(v => v.id === 'DL-29');
  assert.strictEqual(dl29.length, 1);
  assert.strictEqual(dl29[0].severity, 'P2');
});

runTest('DL-29: Permite grid responsivo guardado por breakpoints', () => {
  const code = `<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">Responsivo</div>`;
  const violations = lintSource(code, 'src/routes/store/grid.tsx', testConfig);
  const dl29 = violations.filter(v => v.id === 'DL-29');
  assert.strictEqual(dl29.length, 0);
});

// 25. DL-30: Overflow horizontal em superfície de app
runTest('DL-30: Detecta overflow-x-auto fora de container de tabela/carrossel', () => {
  const code = `<div className="overflow-x-auto p-4">Conteúdo Estourado</div>`;
  const violations = lintSource(code, 'src/routes/workspace/box.tsx', testConfig);
  const dl30 = violations.filter(v => v.id === 'DL-30');
  assert.strictEqual(dl30.length, 1);
  assert.strictEqual(dl30[0].severity, 'P2');
});

// 26. Exceções inline com validação estrita (razão e validade)
runTest('Exceção inline válida: suprime violação', () => {
  const code = `// design-lint-ignore DL-01 reason:"Cor corporativa autorizada pela especificação de branding" expiry:"2029-12-31"\n<span style={{ color: '#123456' }}>Logo</span>`;
  const violations = lintSource(code, 'src/components/brand/logo.tsx', testConfig);
  const dl01 = violations.filter(v => v.id === 'DL-01');
  assert.strictEqual(dl01.length, 0, 'Exceção válida deve suprimir violação DL-01');
});

runTest('Exceção inline rejeitada: motivo < 10 caracteres', () => {
  const code = `// design-lint-ignore DL-01 reason:"curto" expiry:"2029-12-31"\n<span style={{ color: '#123456' }}>Logo</span>`;
  const violations = lintSource(code, 'src/components/brand/logo.tsx', testConfig);
  const exemptionViolation = violations.find(v => v.rule === 'DL-EXEMPTION');
  assert.ok(exemptionViolation, 'Deve gerar violação DL-EXEMPTION P0 por motivo curto');
});

runTest('Exceção inline rejeitada: data expirada', () => {
  const code = `// design-lint-ignore DL-01 reason:"Cor corporativa autorizada pela especificação" expiry:"2020-01-01"\n<span style={{ color: '#123456' }}>Logo</span>`;
  const violations = lintSource(code, 'src/components/brand/logo.tsx', testConfig);
  const exemptionViolation = violations.find(v => v.rule === 'DL-EXEMPTION');
  assert.ok(exemptionViolation, 'Deve gerar violação DL-EXEMPTION P0 por data expirada');
});

// 27. Validação da Catraca (Ratchet)
runTest('Catraca: Aprova quando total for menor ou igual à baseline', () => {
  const baseline = {
    totalViolations: 100,
    bySeverity: { P0: 2, P1: 10, P2: 50, P3: 38 },
    byRule: { 'DL-01': 10, 'DL-02': 20 },
    byModule: { 'routes/store': { total: 50 } }
  };
  const current = {
    totalViolations: 95,
    bySeverity: { P0: 2, P1: 8, P2: 48, P3: 37 },
    byRule: { 'DL-01': 8, 'DL-02': 20 },
    byModule: { 'routes/store': { total: 48 } }
  };
  const result = evaluateRatchet(current, baseline);
  assert.strictEqual(result.passed, true);
  assert.strictEqual(result.reduced, true);
  assert.strictEqual(result.reductionAmount, 5);
});

runTest('Catraca: Rejeita quando houver aumento de violações (regressão)', () => {
  const baseline = {
    totalViolations: 100,
    bySeverity: { P0: 2, P1: 10, P2: 50, P3: 38 },
    byRule: { 'DL-01': 10, 'DL-02': 20 },
    byModule: { 'routes/store': { total: 50 } }
  };
  const current = {
    totalViolations: 101, // Aumentou 1
    bySeverity: { P0: 3, P1: 10, P2: 50, P3: 38 }, // P0 aumentou
    byRule: { 'DL-01': 11, 'DL-02': 20 },
    byModule: { 'routes/store': { total: 51 } }
  };
  const result = evaluateRatchet(current, baseline);
  assert.strictEqual(result.passed, false);
  assert.ok(result.regressions.length >= 3, 'Deve listar regressões em total, severidade, regra e módulo');
});

console.log(`\n----------------------------------------------------------------------`);
console.log(`RESULTADO DA SUÍTE DE TESTES: ${passedTests} aprovados, ${failedTests} falhas.`);
console.log(`----------------------------------------------------------------------\n`);

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
