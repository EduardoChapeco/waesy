const fs = require('fs');
const path = require('path');

// 1. Load 00-inventario.json
const inventarioPath = path.resolve('auditoria/00-inventario.json');
const inventario = JSON.parse(fs.readFileSync(inventarioPath, 'utf8'));
const inventarioRoutes = new Set(inventario.rotas.map(r => r.arquivo));

// 2. Scan current src/routes
const routesDir = path.resolve('src/routes');
const currentFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

const newRoutes = [];
const existingRoutes = [];

currentFiles.forEach(f => {
  const relPath = `src/routes/${f}`;
  if (!inventarioRoutes.has(relPath)) {
    newRoutes.push(relPath);
  } else {
    existingRoutes.push(relPath);
  }
});

console.log('Total files in src/routes:', currentFiles.length);
console.log('Routes in 00-inventario.json:', inventario.rotas.length);
console.log('Routes existing in both:', existingRoutes.length);
console.log('New routes added since inventario:', newRoutes.length);

// 3. Categorize by Platform Area / Module
const moduleCatalog = {
  workspace: {},
  _store: {},
  'admin-master': {},
  api: {},
  root_and_public: {}
};

currentFiles.forEach(f => {
  const parts = f.replace(/\.tsx?$|\.ts$/, '').split('.');
  const top = parts[0];
  const sub = parts.length > 1 ? parts[1] : '(root)';
  
  if (top === 'workspace') {
    moduleCatalog.workspace[sub] = (moduleCatalog.workspace[sub] || 0) + 1;
  } else if (top === '_store') {
    moduleCatalog._store[sub] = (moduleCatalog._store[sub] || 0) + 1;
  } else if (top === 'admin-master') {
    moduleCatalog['admin-master'][sub] = (moduleCatalog['admin-master'][sub] || 0) + 1;
  } else if (top === 'api') {
    moduleCatalog.api[sub] = (moduleCatalog.api[sub] || 0) + 1;
  } else {
    moduleCatalog.root_and_public[top] = (moduleCatalog.root_and_public[top] || 0) + 1;
  }
});

const report = {
  totalCurrentRoutes: currentFiles.length,
  snapshotRoutes: inventario.rotas.length,
  newRoutesCount: newRoutes.length,
  newRoutesList: newRoutes,
  moduleCatalog
};

fs.writeFileSync(
  path.resolve('.agents/teamwork/explorer_survey_1/inventory_diff.json'),
  JSON.stringify(report, null, 2),
  'utf8'
);

console.log('Workspace submodules count:', Object.keys(moduleCatalog.workspace).length);
console.log('_store submodules count:', Object.keys(moduleCatalog._store).length);
console.log('admin-master submodules count:', Object.keys(moduleCatalog['admin-master']).length);
