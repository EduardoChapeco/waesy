import fs from 'fs';
import path from 'path';

console.log('======================================================================');
console.log('AUDITORIA DE REALIDADE DO SISTEMA VS TODOS OS PLANOS (02/10/2026)');
console.log('======================================================================\n');

// 1. Contagens Reais de Arquivos
const routes = fs.readdirSync('src/routes');
const services = fs.readdirSync('src/services');
const lib = fs.readdirSync('src/lib');
const components = fs.readdirSync('src/components');
const migrations = fs.readdirSync('supabase/migrations');

console.log('1. ESTRUTURA ATUAL DE DIRETÓRIOS E FONTES:');
console.log(`- src/routes: ${routes.length} arquivos (monólitos e sub-rotas planas)`);
console.log(`- src/services: ${services.length} arquivos BFF`);
console.log(`- src/lib: ${lib.length} arquivos utilitários e módulos`);
console.log(`- src/components: ${components.length} diretórios de componentes`);
console.log(`- supabase/migrations: ${migrations.length} migrações SQL`);

// 2. Primitivas Canônicas (Plano 5 Bloco D)
const canonicalDir = 'src/components/ui/canonical';
const canonicalUI = fs.existsSync(canonicalDir) ? fs.readdirSync(canonicalDir) : [];
console.log(`\n2. DESIGN SYSTEM CANÔNICO (src/components/ui/canonical): ${canonicalUI.length} arquivos`);
console.log(`   Arquivos: ${canonicalUI.join(', ')}`);

// 3. Showcase do Design System
const dsDir = 'src/components/design-system';
const dsShowcase = fs.existsSync(dsDir) ? fs.readdirSync(dsDir) : [];
console.log(`\n3. SHOWCASE DO DESIGN SYSTEM (src/components/design-system): ${dsShowcase.length} arquivos`);
console.log(`   Arquivos: ${dsShowcase.join(', ')}`);

// 4. Plano 3: Motor de Nichos e Conteúdo
const nicheDir = 'src/lib/ad-engine/niche-packages';
const nichePackages = fs.existsSync(nicheDir) ? fs.readdirSync(nicheDir) : [];
const contentBlocksDir = 'src/lib/ad-engine/content-blocks';
const contentBlocks = fs.existsSync(contentBlocksDir) ? fs.readdirSync(contentBlocksDir) : [];
console.log(`\n4. MOTOR DE NICHOS E CONTEÚDO (Plano 3):`);
console.log(`   Pacotes de Nicho: ${nichePackages.length} (${nichePackages.join(', ')})`);
console.log(`   Blocos de Conteúdo: ${contentBlocks.length} (${contentBlocks.join(', ')})`);

// 5. Plano 5: Arquitetura, Camadas e Detector de Código Morto
const layerContractExists = fs.existsSync('src/lib/architecture/layer-contract.ts');
const verticalManifestExists = fs.existsSync('src/lib/architecture/vertical-manifest.ts');
const deadCodeDetectorExists = fs.existsSync('scripts/dead-code-detector.mjs');
console.log(`\n5. ARQUITETURA E GOVERNANÇA (Plano 5):`);
console.log(`   layer-contract.ts: ${layerContractExists}`);
console.log(`   vertical-manifest.ts: ${verticalManifestExists}`);
console.log(`   dead-code-detector.mjs: ${deadCodeDetectorExists}`);

// 6. Bloco E: Telemetria Real vs Buffer 5s
const errorCapturePath = 'src/lib/error-capture.ts';
let hasBuffer5s = false;
let errorCaptureContent = '';
if (fs.existsSync(errorCapturePath)) {
  errorCaptureContent = fs.readFileSync(errorCapturePath, 'utf8');
  hasBuffer5s = errorCaptureContent.includes('5000') || errorCaptureContent.includes('5 * 1000') || errorCaptureContent.includes('buffer');
}
console.log(`\n6. TELEMETRIA E CAPTURA DE ERRO (Bloco E):`);
console.log(`   src/lib/error-capture.ts existe: ${fs.existsSync(errorCapturePath)}`);
console.log(`   Possui buffer de 5 segundos legado: ${hasBuffer5s}`);

// 7. Monólitos de Rota (> 500 linhas)
const monoliths = [];
routes.forEach((r) => {
  const p = path.join('src/routes', r);
  if (fs.statSync(p).isFile()) {
    const lines = fs.readFileSync(p, 'utf8').split('\n').length;
    if (lines > 500) {
      monoliths.push({ route: r, lines });
    }
  }
});
monoliths.sort((a, b) => b.lines - a.lines);
console.log(`\n7. MONÓLITOS DE ROTA (> 500 linhas): ${monoliths.length} rotas`);
monoliths.slice(0, 10).forEach((m, idx) => {
  console.log(`   ${idx + 1}. ${m.route} (${m.lines} linhas)`);
});

// 8. Diretórios Paralelos
const dirs = ['auditoria', 'ia', 'melhoria', 'reparo', 'legacy_quarantine', 'scratch'];
console.log(`\n8. STATUS DE DIRETÓRIOS PARALELOS:`);
dirs.forEach((d) => {
  if (fs.existsSync(d)) {
    const count = fs.readdirSync(d).length;
    console.log(`   - ${d}/: ${count} itens`);
  } else {
    console.log(`   - ${d}/: NÃO EXISTE (removido/limpo)`);
  }
});

// 9. Design Lint Baseline
if (fs.existsSync('design-lint.baseline.json')) {
  const baseline = JSON.parse(fs.readFileSync('design-lint.baseline.json', 'utf8'));
  console.log(`\n9. DESIGN LINT BASELINE:`);
  console.log(`   Total Violations: ${baseline.totalViolations}`);
  console.log(`   P0: ${baseline.bySeverity.P0} | P1: ${baseline.bySeverity.P1} | P2: ${baseline.bySeverity.P2}`);
}

console.log('\n======================================================================');
