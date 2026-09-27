const fs = require('fs');
const path = require('path');

// Cross-reference: what routes import vs what services export
const routeDir = 'src/routes';
const serviceDir = 'src/services';

// Build export map for all service files
const exportMap = {};
const svcFiles = fs.readdirSync(serviceDir).filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
for (const f of svcFiles) {
  const content = fs.readFileSync(path.join(serviceDir, f), 'utf8');
  const exports = [...content.matchAll(/export (?:const|async function|function) (\w+)/g)].map(m => m[1]);
  exportMap[f.replace('.ts','').replace('.tsx','')] = exports;
}

// Check all routes for broken imports
const routeFiles = fs.readdirSync(routeDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
const brokenImports = [];

for (const file of routeFiles) {
  const content = fs.readFileSync(path.join(routeDir, file), 'utf8');
  // Find all @/services imports
  const importMatches = [...content.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']@\/services\/([^"']+)["']/g)];
  for (const m of importMatches) {
    const importedNames = m[1].split(',').map(s => s.trim().split(' as ')[0].trim()).filter(Boolean);
    const svcModule = m[2].replace('.functions','').replace('.ts','');
    const svcFile = m[2].replace('.ts','').replace('.tsx','');
    
    // Find the actual service file
    const svcKey = Object.keys(exportMap).find(k => k.includes(svcModule) || k === svcFile);
    if (!svcKey) {
      brokenImports.push({ route: file, missingModule: m[2], imports: importedNames });
      continue;
    }
    
    const available = exportMap[svcKey] || [];
    const missing = importedNames.filter(n => !available.includes(n) && n !== 'type' && !n.startsWith('type '));
    if (missing.length > 0) {
      brokenImports.push({ route: file, module: m[2], missingFunctions: missing });
    }
  }
}

console.log('=== BROKEN IMPORTS (missing service functions) ===');
console.log(JSON.stringify(brokenImports, null, 2));
console.log('Total broken import sets:', brokenImports.length);
