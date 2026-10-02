import fs from 'node:fs';
import path from 'node:path';

const routesTs = fs.readFileSync('src/lib/routes.ts', 'utf8');

// Extrair caminhos registrados no WORKSPACE_ROUTES e ALL_ROUTES
const matches = [...routesTs.matchAll(/path:\s*["'](\/workspace[^"']*)["']/g)].map(m => m[1]);
const registeredSet = new Set(matches);

// Arquivos em src/routes
const routeFiles = fs.readdirSync('src/routes').filter(f => f.startsWith('workspace') && f.endsWith('.tsx'));

const diskRoutes = [];
for (const file of routeFiles) {
  if (file === 'workspace.tsx') continue;
  let p = '/' + file.slice(0, -4).split('.').join('/');
  if (p.endsWith('/index')) {
    p = p.slice(0, -6);
  }
  // Convert TanStack $param to :param for matching
  const pParam = p.replace(/\$([a-zA-Z0-9_]+)/g, ':$1');
  diskRoutes.push({ file, path: p, pathParam: pParam });
}

console.log('--- AUDITORIA DE ROTAS E MENU (R53) ---');
console.log('Total de rotas de workspace registradas em routes.ts:', registeredSet.size);
console.log('Total de arquivos de rota de workspace em disco:', diskRoutes.length);

const unlistedOnDisk = diskRoutes.filter(
  d => !registeredSet.has(d.path) && !registeredSet.has(d.pathParam)
);

console.log('Rotas no disco sem registro em routes.ts:', unlistedOnDisk.length);
if (unlistedOnDisk.length > 0) {
  for (const item of unlistedOnDisk) {
    console.log(`[ALERTA R53] Rota direta no disco sem registro no menu/rotas: ${item.file} -> ${item.path}`);
  }
} else {
  console.log('[OK R53] 100% das rotas de workspace no disco estão mapeadas.');
}

// Verificar se há rotas no menu com restrição de papel (roles)
const roleRestrictedMatches = [...routesTs.matchAll(/path:\s*["'](\/workspace[^"']*)["'][\s\S]*?roles:\s*(\[[^\]]+\])/g)];
console.log('Rotas com restrição de papéis catalogadas:', roleRestrictedMatches.length);
