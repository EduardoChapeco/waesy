import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const routesDir = path.join(projectRoot, "src", "routes");
const componentsDir = path.join(projectRoot, "src", "components");
const servicesDir = path.join(projectRoot, "src", "services");

function getFilesRecursively(dir, filterExt = [".ts", ".tsx"]) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath, filterExt));
    } else if (filterExt.some((ext) => file.endsWith(ext))) {
      results.push(filePath);
    }
  }
  return results;
}

const routeFiles = getFilesRecursively(routesDir);
const componentFiles = getFilesRecursively(componentsDir);
const allAppFiles = [...routeFiles, ...componentFiles];

console.log(`Auditing ${routeFiles.length} routes and ${componentFiles.length} components (${allAppFiles.length} total files)...`);

// 1. Mapeamento de imports legados em services/ (arquivos sem .functions.ts)
const legacyServiceFiles = fs.readdirSync(servicesDir)
  .filter(f => f.endsWith('.ts') && !f.endsWith('.functions.ts') && !f.endsWith('.test.ts'));

console.log("\nLegacy Service Files found in src/services/:", legacyServiceFiles);

const legacyImportsReport = [];

allAppFiles.forEach((file) => {
  const relPath = path.relative(projectRoot, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, "utf8");

  legacyServiceFiles.forEach((leg) => {
    const baseName = leg.replace(/\.ts$/, '');
    const regex = new RegExp(`from\\s+["']@/services/${baseName}["']`, 'g');
    if (regex.test(content)) {
      legacyImportsReport.push({ file: relPath, imported: baseName });
    }
  });
});

console.log(`\n--- 1. LEGACY SERVICE IMPORTS (${legacyImportsReport.length} occurrences) ---`);
legacyImportsReport.forEach((item) => {
  console.log(`  [${item.file}] imports from '@/services/${item.imported}'`);
});

// 2. Procura por toasts falsos ou simulações sem backend (ex: toast(...) mas sem await ou fetch ou functions)
const suspiciousToastActions = [];

allAppFiles.forEach((file) => {
  const relPath = path.relative(projectRoot, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, "utf8");

  // Procura por handlers inline do tipo: onClick={() => toast.success("...")} apenas quando o texto promete ação futura/falsa.
  const inlineToastMatches = [...content.matchAll(/onClick=\{(?:\(\)\s*=>\s*toast\.(?:success|info)\(["']([^"']*?(?:em breve|não implementad|funcionalidade futura|pedido simulado|sem backend|ao ativar|após a publicação|modo de prévia)[^"']*?)["']\))\}/gi)];
  inlineToastMatches.forEach(m => {
    suspiciousToastActions.push({ file: relPath, pattern: m[0], type: 'inline-fake-toast' });
  });

  // Procura por promessas falsas explícitas sem confundir o domínio real SimLab/simulação ou mockups gerados.
  const emBreveMatches = [...content.matchAll(/toast\.(?:info|error|success)\(["']([^"']*?(?:em breve|não implementad|funcionalidade futura|pedido simulado|sem backend|ao ativar|após a publicação|modo de prévia)[^"']*?)["']\)/gi)];
  emBreveMatches.forEach(m => {
    suspiciousToastActions.push({ file: relPath, text: m[1], type: 'em-breve-toast' });
  });
});

console.log(`\n--- 2. SUSPICIOUS / FAKE / "EM BREVE" TOASTS (${suspiciousToastActions.length} occurrences) ---`);
suspiciousToastActions.forEach((item) => {
  console.log(`  [${item.file}] (${item.type}) -> ${item.pattern || item.text}`);
});

// 3. Procura por botões com onClick vazio ou no-op
const emptyHandlerButtons = [];
allAppFiles.forEach((file) => {
  const relPath = path.relative(projectRoot, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, "utf8");

  const emptyMatches = [...content.matchAll(/<Button[^>]*?onClick=\{\(\)\s*=>\s*\{\s*\}\}[^>]*?>/g)];
  emptyMatches.forEach(m => {
    emptyHandlerButtons.push({ file: relPath, button: m[0] });
  });
});

console.log(`\n--- 3. EMPTY ONCLICK HANDLERS (${emptyHandlerButtons.length} occurrences) ---`);
emptyHandlerButtons.forEach((item) => {
  console.log(`  [${item.file}] -> ${item.button}`);
});

// 4. Procura por botões órfãos (Button sem onClick, sem asChild, sem type="submit", sem form, sem disabled)
const orphanButtons = [];
routeFiles.forEach((file) => {
  const relPath = path.relative(projectRoot, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, "utf8");

  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    // Procura por <Button que fecha na mesma linha sem onClick, sem asChild, sem type=
    if (line.includes('<Button') && !line.includes('onClick') && !line.includes('asChild') && !line.includes('type="submit"') && !line.includes('type=\'submit\'') && !line.includes('form=') && !line.includes('disabled') && !line.includes('variant="ghost"') && line.includes('</Button>')) {
      // Ignora se for apenas renderização de ícone ou decorator
      orphanButtons.push({ file: relPath, line: idx + 1, snippet: line.trim() });
    }
  });
});

console.log(`\n--- 4. POTENTIAL ORPHAN BUTTONS IN ROUTES (${orphanButtons.length} occurrences) ---`);
orphanButtons.slice(0, 20).forEach((item) => {
  console.log(`  [${item.file}:${item.line}] -> ${item.snippet}`);
});

// 5. Silent Catch Blocks em chamadas assíncronas (engolindo erros sem notificar nem logar)
const silentCatches = [];
routeFiles.forEach((file) => {
  const relPath = path.relative(projectRoot, file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, "utf8");

  // Procura por .catch(() => {}) em mutações ou actions
  const matches = [...content.matchAll(/(\w+(?:Mutation|Update|Save|Delete|Create|Send|Action)\s*\([^)]*\)\s*\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\))/g)];
  matches.forEach(m => {
    silentCatches.push({ file: relPath, snippet: m[1] });
  });
});

console.log(`\n--- 5. SILENT CATCH MUTATIONS (${silentCatches.length} occurrences) ---`);
silentCatches.forEach((item) => {
  console.log(`  [${item.file}] -> ${item.snippet}`);
});
