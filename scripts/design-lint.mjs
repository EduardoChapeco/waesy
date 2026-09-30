import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const CONFIG_PATH = path.resolve('.designlintrc.json');
if (!fs.existsSync(CONFIG_PATH)) {
  console.error('ERRO FATAL: Arquivo de configuração .designlintrc.json não encontrado.');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

// Validar Allowlist: toda exceção exige data e motivo escrito com no mínimo 10 caracteres
if (Array.isArray(config.allowlist)) {
  for (const item of config.allowlist) {
    if (!item.date || !/^\d{4}-\d{2}-\d{2}$/.test(item.date)) {
      console.error(`ERRO: Exceção na allowlist rejeitada por ausência de data ISO válida (YYYY-MM-DD): ${JSON.stringify(item)}`);
      process.exit(1);
    }
    if (!item.reason || typeof item.reason !== 'string' || item.reason.trim().length < 10) {
      console.error(`ERRO: Exceção na allowlist rejeitada por motivo ausente ou insuficiente (mínimo 10 caracteres): ${JSON.stringify(item)}`);
      process.exit(1);
    }
  }
}

const isChangedOnly = process.argv.includes('--changed');

function getFilesToScan() {
  if (isChangedOnly) {
    try {
      const output = execSync('git status --porcelain', { encoding: 'utf8' });
      const changedFiles = output
        .split('\n')
        .map(line => line.slice(3).trim())
        .filter(f => f && (f.endsWith('.tsx') || f.endsWith('.ts') || f.endsWith('.jsx') || f.endsWith('.js') || f.endsWith('.css')))
        .filter(f => f.startsWith('src/'))
        .map(f => path.resolve(f))
        .filter(f => fs.existsSync(f));
      return changedFiles;
    } catch {
      console.warn('Aviso: git status falhou. Recorrendo à varredura completa.');
    }
  }

  function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of list) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        if (!['node_modules', 'dist', '.git', 'legacy_quarantine'].includes(item.name)) {
          results = results.concat(walk(full));
        }
      } else if (['.tsx', '.ts', '.jsx', '.js', '.css'].some(ext => item.name.endsWith(ext))) {
        results.push(full);
      }
    }
    return results;
  }

  return walk(path.resolve('src'));
}

const files = getFilesToScan();
console.log(`\n======================================================================`);
console.log(`WAESY DESIGN LINT — Auditoria Determinística de Diretrizes Visuais`);
console.log(`Arquivos sob inspeção: ${files.length} | Modo: ${isChangedOnly ? '--changed' : 'completo'}`);
console.log(`======================================================================\n`);

const violations = [];

function isAllowed(id, relFile) {
  if (!config.allowlist) return false;
  return config.allowlist.some(a => a.id === id && relFile.replace(/\\/g, '/').includes(a.file.replace(/\\/g, '/')));
}

// Regex determinísticas
const hexRegex = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;
const rgbRegex = /\b(?:rgb|hsl)a?\([^)]+\)/g;
const arbitraryClassRegex = /\b[a-zA-Z0-9_-]+-\[[^\]]+\]/g;
const importantRegex = /!important|!\s*[a-zA-Z-]+/g;
const inlineStyleRegex = /style\s*=\s*\{\{\s*[^}]*(?:color|background|padding|margin|width|height)[^}]*\}\}/gi;
const smallTargetRegex = /\b(?:h|size)-(1|2|3|4|5|6|7|8|9|10|3\.5|2\.5|1\.5|0\.5)\b/g;
const literalWhiteBlackRegex = /\b(?:text|bg)-(?:white|black)\b/g;
const animAbove300msRegex = /\bduration-(?:[4-9]\d{2}|\d{4,})\b/g;
const genericTransitionRegex = /\btransition-all\b/g;
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

for (const file of files) {
  const relFile = path.relative(process.cwd(), file);
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  const isCss = file.endsWith('.css');

  // DL-01: Cores literais fora de token
  if (!isCss && config.rules['DL-01']?.enabled && !isAllowed('DL-01', relFile)) {
    let m;
    while ((m = hexRegex.exec(content)) !== null) {
      violations.push({ id: 'DL-01', file: relFile, severity: config.rules['DL-01'].severity, match: m[0] });
    }
    while ((m = rgbRegex.exec(content)) !== null) {
      violations.push({ id: 'DL-01', file: relFile, severity: config.rules['DL-01'].severity, match: m[0] });
    }
  }

  // DL-02: Classes arbitrárias entre colchetes
  if (config.rules['DL-02']?.enabled && !isAllowed('DL-02', relFile)) {
    let m;
    while ((m = arbitraryClassRegex.exec(content)) !== null) {
      violations.push({ id: 'DL-02', file: relFile, severity: config.rules['DL-02'].severity, match: m[0] });
    }
  }

  // DL-04: Uso de !important
  if (config.rules['DL-04']?.enabled && !isAllowed('DL-04', relFile)) {
    let m;
    while ((m = importantRegex.exec(content)) !== null) {
      violations.push({ id: 'DL-04', file: relFile, severity: config.rules['DL-04'].severity, match: m[0] });
    }
  }

  // DL-05: Inline style com cor ou espaçamento
  if (!isCss && config.rules['DL-05']?.enabled && !isAllowed('DL-05', relFile)) {
    let m;
    while ((m = inlineStyleRegex.exec(content)) !== null) {
      violations.push({ id: 'DL-05', file: relFile, severity: config.rules['DL-05'].severity, match: m[0] });
    }
  }

  // DL-14: Alvo de toque < 44px em elementos interativos
  if (config.rules['DL-14']?.enabled && !isAllowed('DL-14', relFile)) {
    if (content.includes('onClick') || content.includes('<button') || content.includes('<Button')) {
      let m;
      while ((m = smallTargetRegex.exec(content)) !== null) {
        violations.push({ id: 'DL-14', file: relFile, severity: config.rules['DL-14'].severity, match: m[0] });
      }
    }
  }

  // DL-15: Interativo sem focus-visible
  if (config.rules['DL-15']?.enabled && !isAllowed('DL-15', relFile)) {
    if ((content.includes('onClick') || content.includes('<button')) && !content.includes('focus-visible:')) {
      violations.push({ id: 'DL-15', file: relFile, severity: config.rules['DL-15'].severity, match: 'onClick sem focus-visible' });
    }
  }

  // DL-18: Texto branco ou preto literal
  if (config.rules['DL-18']?.enabled && !isAllowed('DL-18', relFile)) {
    let m;
    while ((m = literalWhiteBlackRegex.exec(content)) !== null) {
      violations.push({ id: 'DL-18', file: relFile, severity: config.rules['DL-18'].severity, match: m[0] });
    }
  }

  // DL-23: Emojis na interface
  if (config.rules['DL-23']?.enabled && !isAllowed('DL-23', relFile)) {
    let m;
    while ((m = emojiRegex.exec(content)) !== null) {
      violations.push({ id: 'DL-23', file: relFile, severity: config.rules['DL-23'].severity, match: m[0] });
    }
  }

  // DL-26: Animação acima de 300ms
  if (config.rules['DL-26']?.enabled && !isAllowed('DL-26', relFile)) {
    let m;
    while ((m = animAbove300msRegex.exec(content)) !== null) {
      violations.push({ id: 'DL-26', file: relFile, severity: config.rules['DL-26'].severity, match: m[0] });
    }
  }

  // DL-27: Transição genérica transition-all
  if (config.rules['DL-27']?.enabled && !isAllowed('DL-27', relFile)) {
    let m;
    while ((m = genericTransitionRegex.exec(content)) !== null) {
      violations.push({ id: 'DL-27', file: relFile, severity: config.rules['DL-27'].severity, match: m[0] });
    }
  }
}

// Totalizadores por severidade
const counts = { P0: 0, P1: 0, P2: 0, P3: 0 };
for (const v of violations) {
  if (counts[v.severity] !== undefined) {
    counts[v.severity]++;
  }
}

// Relatório terminal
console.log(`RESUMO DETERMINÍSTICO DE ACHADOS:`);
console.log(`----------------------------------------------------------------------`);
console.log(`Severidade P0 (Bloqueia Entrega): ${counts.P0}`);
console.log(`Severidade P1 (Bloqueia Merge):   ${counts.P1}`);
console.log(`Severidade P2 (Fila de Correção): ${counts.P2}`);
console.log(`Severidade P3 (Polimento):        ${counts.P3}`);
console.log(`Total Geral de Violações:         ${violations.length}`);
console.log(`----------------------------------------------------------------------\n`);

const reportData = {
  timestamp: new Date().toISOString(),
  inspectedFiles: files.length,
  counts,
  totalViolations: violations.length,
  passed: counts.P0 === 0 && counts.P1 === 0,
  violationsSample: violations.slice(0, 100)
};

fs.writeFileSync(path.resolve('design-lint.report.json'), JSON.stringify(reportData, null, 2));
console.log(`Relatório salvo em: design-lint.report.json\n`);

if (counts.P0 > 0 || counts.P1 > 0) {
  console.error(`FALHA DE DESIGN GATE: Detectadas ${counts.P0} violações P0 e ${counts.P1} violações P1.`);
  console.error(`Entrega/Merge bloqueados até remediação total dos defeitos impeditivos.`);
  process.exit(1);
} else {
  console.log(`SUCESSO: Zero violações P0 e zero violações P1. Design lint aprovado com louvor!`);
  process.exit(0);
}
