import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// 1. Read route tree
const routeTreePath = path.join(root, 'src/routeTree.gen.ts');
const routeTreeContent = fs.readFileSync(routeTreePath, 'utf8');

const routeIds = new Set();
const fullPaths = new Set();

const fullPathRegex = /fullPath:\s*['"]([^'"]+)['"]/g;
let m;
while ((m = fullPathRegex.exec(routeTreeContent)) !== null) {
  fullPaths.add(m[1]);
}

const idRegex = /id:\s*['"]([^'"]+)['"]/g;
while ((m = idRegex.exec(routeTreeContent)) !== null) {
  routeIds.add(m[1]);
}

// 2. Read workspace navigation
const navPath = path.join(root, 'src/lib/workspace-navigation.ts');
const navContent = fs.readFileSync(navPath, 'utf8');

const navItems = [];
// Match { label: "...", path: "...", ... }
const itemRegex = /path:\s*['"]([^'"]+)['"]/g;
while ((m = itemRegex.exec(navContent)) !== null) {
  navItems.push(m[1]);
}

console.log(`Total Workspace Navigation links: ${navItems.length}`);

const brokenLinks = [];
const workingLinks = [];

for (const p of navItems) {
  if (p.startsWith('http') || p === '#') continue;
  const cleanPath = p.split('?')[0];
  const exists = fullPaths.has(cleanPath) || fullPaths.has(cleanPath + '/') || routeIds.has(cleanPath) || routeIds.has(cleanPath + '/');
  if (exists) {
    workingLinks.push(p);
  } else {
    brokenLinks.push(p);
  }
}

console.log(`✅ Working routes: ${workingLinks.length}`);
console.log(`⚠️ Broken / Unregistered routes: ${brokenLinks.length}`);
if (brokenLinks.length > 0) {
  console.log(JSON.stringify(brokenLinks, null, 2));
}

// 3. Check for any routes that exist in src/routes/workspace.* that are NOT in navigation!
const routeFiles = fs.readdirSync(path.join(root, 'src/routes')).filter(f => f.startsWith('workspace.'));
console.log(`\nTotal workspace route files in src/routes: ${routeFiles.length}`);

const navPathSet = new Set(navItems.map(p => p.split('?')[0]));
const unlinkedWorkspaceRoutes = [];

for (const rf of routeFiles) {
  // Convert workspace.something.tsx to /workspace/something
  let routePath = '/' + rf.replace('.tsx', '').replace('.ts', '').replace(/\./g, '/');
  if (routePath.endsWith('/index')) routePath = routePath.replace('/index', '');
  
  // Check if it or a close match is in navigation
  let linked = false;
  for (const np of navPathSet) {
    if (np === routePath || np.startsWith(routePath) || routePath.startsWith(np)) {
      linked = true;
      break;
    }
  }
  if (!linked) {
    unlinkedWorkspaceRoutes.push({ file: rf, inferredPath: routePath });
  }
}

console.log(`\nWorkspace routes without direct link in workspace-navigation.ts (${unlinkedWorkspaceRoutes.length}):`);
console.log(JSON.stringify(unlinkedWorkspaceRoutes, null, 2));
