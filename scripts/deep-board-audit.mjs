import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');

function getAllFiles(dir, filter = (f) => true) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist'].includes(file)) {
        results = results.concat(getAllFiles(full, filter));
      }
    } else if (filter(full)) {
      results.push(full);
    }
  }
  return results;
}

const allTsx = getAllFiles(SRC, (f) => f.endsWith('.tsx') || f.endsWith('.ts'));

console.log(`Inspecting ${allTsx.length} files in src/ for board audit...`);

// 1. Audit Conversational Explanatory Texts
const conversationalPatterns = [
  /Aqui você pode/i,
  /Esta tela serve/i,
  /Esta página permite/i,
  /Neste módulo/i,
  /Preencha os campos abaixo/i,
  /Clique no botão abaixo/i,
  /Bem-vindo ao painel/i,
  /Bem-vindo à área/i,
  /Utilize esta seção para/i,
  /Gerencie aqui suas/i
];

const conversationalHits = [];
for (const file of allTsx) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    for (const pat of conversationalPatterns) {
      if (pat.test(line)) {
        conversationalHits.push({
          file: path.relative(ROOT, file).replace(/\\/g, '/'),
          line: idx + 1,
          snippet: line.trim()
        });
        break;
      }
    }
  });
}

// 2. Audit Composite Titles (> 6 words) in PageHeader, <h1, <h2, title="..."
const compositeTitles = [];
const titleRegex = /(?:title=["']([^"']+)["']|<h[12][^>]*>([^<]+)<\/h[12]>)/g;
for (const file of allTsx) {
  const content = fs.readFileSync(file, 'utf8');
  let match;
  while ((match = titleRegex.exec(content)) !== null) {
    const text = (match[1] || match[2] || '').trim();
    const words = text.split(/\s+/).filter(w => w.length > 0 && !w.startsWith('{') && !w.includes('?') && !w.includes(':'));
    if (words.length > 6 && !text.includes('$') && !text.includes('{') && !text.includes('placeholder')) {
      // Find line number
      const lineNum = content.slice(0, match.index).split('\n').length;
      compositeTitles.push({
        file: path.relative(ROOT, file).replace(/\\/g, '/'),
        line: lineNum,
        words: words.length,
        text: text
      });
    }
  }
}

// 3. Audit Neon / Amber / Blinking Cards
const neonPatterns = [
  /bg-amber-500\/10/g,
  /border-amber-500/g,
  /bg-yellow-500/g,
  /animate-pulse.*(?:bg-amber|bg-yellow|border-yellow|border-amber)/g
];
const neonHits = [];
for (const file of allTsx) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    for (const pat of neonPatterns) {
      if (pat.test(line)) {
        neonHits.push({
          file: path.relative(ROOT, file).replace(/\\/g, '/'),
          line: idx + 1,
          snippet: line.trim()
        });
        break;
      }
    }
  });
}

// 4. Audit Navigation & Sidebar Route Coverage
// Map routes in src/routes/workspace.*
const routesDir = path.join(SRC, 'routes');
const routeFiles = fs.readdirSync(routesDir).filter(f => f.startsWith('workspace.') && f.endsWith('.tsx'));
const navRegistryContent = fs.readFileSync(path.join(SRC, 'lib', 'navigation-registry.ts'), 'utf8');
const workspaceAllToolsContent = fs.readFileSync(path.join(SRC, 'components', 'workspace', 'workspace-all-tools-dialog.tsx'), 'utf8');

const unmappedWorkspaceRoutes = [];
for (const r of routeFiles) {
  // convert filename to route url
  // e.g. workspace.turismo.destinos.tsx -> /workspace/turismo/destinos
  // e.g. workspace.catalogo.produtos.$id.tsx -> /workspace/catalogo/produtos/$id
  const routeUrl = '/' + r.replace(/\.tsx$/, '').replace(/\./g, '/').replace(/\$([a-zA-Z0-9_]+)/g, ':$1');
  const baseRouteUrl = routeUrl.replace(/\/(:[a-zA-Z0-9_]+|\$id|\$slug).*$/, '');
  
  const inRegistry = navRegistryContent.includes(baseRouteUrl);
  const inAllTools = workspaceAllToolsContent.includes(baseRouteUrl);
  
  if (!inRegistry && !inAllTools && !r.includes('$') && !r.includes('novo') && !r.includes('editar')) {
    unmappedWorkspaceRoutes.push({
      file: r,
      url: baseRouteUrl
    });
  }
}

console.log('\n--- AUDIT RESULTS SUMMARY ---');
console.log(`Conversational Explanatory Texts: ${conversationalHits.length}`);
console.log(`Composite Titles (> 6 words): ${compositeTitles.length}`);
console.log(`Neon/Amber Card Usages: ${neonHits.length}`);
console.log(`Unmapped Primary Workspace Routes: ${unmappedWorkspaceRoutes.length}`);

fs.writeFileSync('scripts/audit-board-summary.json', JSON.stringify({
  conversationalHits: conversationalHits.slice(0, 50),
  compositeTitles: compositeTitles.slice(0, 50),
  neonHits: neonHits.slice(0, 50),
  unmappedWorkspaceRoutes
}, null, 2));

console.log('\nSample Conversational Hits:');
conversationalHits.slice(0, 10).forEach(h => console.log(`  ${h.file}:${h.line} -> "${h.snippet}"`));

console.log('\nSample Composite Titles (>6 words):');
compositeTitles.slice(0, 10).forEach(h => console.log(`  ${h.file}:${h.line} (${h.words} words) -> "${h.text}"`));

console.log('\nUnmapped Primary Workspace Routes:');
unmappedWorkspaceRoutes.forEach(r => console.log(`  ${r.file} -> ${r.url}`));
