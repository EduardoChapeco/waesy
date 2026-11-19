import fs from 'fs';
import path from 'path';

function getFilesRecursively(dir, extensions = ['.ts', '.tsx']) {
  let files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (['node_modules', 'dist', '.git', '.cache', 'build'].includes(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(getFilesRecursively(fullPath, extensions));
      } else if (extensions.includes(path.extname(entry.name))) {
        files.push(fullPath.replace(/\\/g, '/'));
      }
    }
  } catch (e) {}
  return files;
}

const allSrc = getFilesRecursively('src');

// Top 20 largest files
const fileStats = allSrc.map(f => {
  const stat = fs.statSync(f);
  const content = fs.readFileSync(f, 'utf8');
  const lineCount = content.split('\n').length;
  return {
    path: f,
    sizeBytes: stat.size,
    lineCount
  };
});

fileStats.sort((a, b) => b.sizeBytes - a.sizeBytes);
const top20Largest = fileStats.slice(0, 20);

// Total counts
const components = allSrc.filter(f => f.startsWith('src/components/'));
const hooks = allSrc.filter(f => f.includes('/hooks/') || f.includes('use-'));
const routes = allSrc.filter(f => f.startsWith('src/routes/'));
const services = allSrc.filter(f => f.startsWith('src/services/'));

// Load checks raw & design-lint & tsc summary dynamically
let checksSummary = {};
let evaluatedCount = 0;
let conformingCount = 0;
let openChecks = [];
if (fs.existsSync('.audit/checks-raw.json')) {
  const raw = JSON.parse(fs.readFileSync('.audit/checks-raw.json', 'utf8'));
  for (const [k, v] of Object.entries(raw)) {
    checksSummary[k] = v.count;
    if (v.evaluated !== false) {
      evaluatedCount++;
      if (v.count === 0) conformingCount++;
    }
    if (v.count > 0) openChecks.push(`${k}(${v.count})`);
  }
}

let designLintTotal = 'N/A (report ausente)';
if (fs.existsSync('design-lint.report.json')) {
  const dl = JSON.parse(fs.readFileSync('design-lint.report.json', 'utf8'));
  designLintTotal = `${dl.totalViolations ?? 0} violações atuais`;
}

let tscSummary = 'Não executado neste ciclo';
if (fs.existsSync('.audit/tsc-baseline.txt')) {
  const tscText = fs.readFileSync('.audit/tsc-baseline.txt', 'utf8');
  const errCount = (tscText.match(/: error TS\d+:/g) || []).length;
  tscSummary = `${errCount} erro(s) registrados em .audit/tsc-baseline.txt`;
}

const baselineData = {
  timestamp: new Date().toISOString(),
  metrics: {
    totalSourceFiles: allSrc.length,
    componentsCount: components.length,
    hooksCount: hooks.length,
    routesCount: routes.length,
    servicesCount: services.length,
    totalLinesOfCode: fileStats.reduce((acc, curr) => acc + curr.lineCount, 0),
    totalSizeBytes: fileStats.reduce((acc, curr) => acc + curr.sizeBytes, 0)
  },
  top20LargestFiles: top20Largest,
  checksSummary
};

fs.writeFileSync('.audit/BASELINE.json', JSON.stringify(baselineData, null, 2));

// Generate dynamic markdown report (zero hardcoded numbers)
let md = `# BASELINE.md — Baseline Mensurável do Sistema

**Data da Medição:** ${baselineData.timestamp.slice(0, 10)}  
**Métrica Global:** ${baselineData.metrics.totalSourceFiles} arquivos em \`src/\` | ${baselineData.metrics.totalLinesOfCode.toLocaleString()} linhas de código | ${(baselineData.metrics.totalSizeBytes / (1024 * 1024)).toFixed(2)} MB

---

## 1. Contagem Estrutural
- **Rotas:** ${baselineData.metrics.routesCount}
- **Componentes:** ${baselineData.metrics.componentsCount}
- **Serviços / BFF:** ${baselineData.metrics.servicesCount}
- **Hooks:** ${baselineData.metrics.hooksCount}

---

## 2. Top 20 Maiores Arquivos (Alvos Prioritários de Refatoração / Modularização)
| Arquivo | Linhas | Tamanho (KB) |
|---|---|---|
`;

top20Largest.forEach(f => {
  md += `| \`${f.path}\` | ${f.lineCount} | ${(f.sizeBytes / 1024).toFixed(1)} KB |\n`;
});

md += `\n---

## 3. Resumo dos Checks C01-C43
- **Checks Avaliados / Conformes / Abertos:** ${evaluatedCount} avaliados (${conformingCount} conformes, ${openChecks.length} abertos)
- **Abertos:** ${openChecks.join(', ') || 'Nenhum'}
- **Compilação TypeScript:** ${tscSummary}
- **Design Lint Report:** ${designLintTotal}
`;

fs.writeFileSync('.audit/BASELINE.md', md);
console.log('Dynamic baseline generated successfully.');
