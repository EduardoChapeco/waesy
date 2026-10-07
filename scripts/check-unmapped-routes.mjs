import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'src');

const routesDir = path.join(SRC, 'routes');
const routeFiles = fs.readdirSync(routesDir).filter(f => f.startsWith('workspace.') && f.endsWith('.tsx'));
const navRegistryContent = fs.readFileSync(path.join(SRC, 'lib', 'navigation-registry.ts'), 'utf8');
const workspaceNavigationContent = fs.readFileSync(path.join(SRC, 'lib', 'workspace-navigation.ts'), 'utf8');
const workspaceAllToolsContent = fs.readFileSync(path.join(SRC, 'components', 'workspace', 'workspace-all-tools-dialog.tsx'), 'utf8');
const workspaceShellContent = fs.readFileSync(path.join(SRC, 'components', 'workspace', 'workspace-shell.tsx'), 'utf8');
const workspaceFlyoutContent = fs.readFileSync(path.join(SRC, 'components', 'workspace', 'workspace-sidebar-flyout.tsx'), 'utf8');

const unmappedWorkspaceRoutes = [];
const mappedWorkspaceRoutes = [];

for (const r of routeFiles) {
  let routeUrl = '/' + r.replace(/\.tsx$/, '').replace(/\./g, '/').replace(/\/index$/, '');
  
  // ignore param routes and create/edit child routes and layout root
  if (r.includes('$') || r.endsWith('.novo.tsx') || r.endsWith('.editar.tsx') || r === 'workspace.tsx') {
    continue;
  }
  
  const inRegistry = navRegistryContent.includes(`"${routeUrl}"`) || navRegistryContent.includes(`'${routeUrl}'`);
  const inWorkspaceNavigation = workspaceNavigationContent.includes(`"${routeUrl}"`) || workspaceNavigationContent.includes(`'${routeUrl}'`);
  const inAllTools = workspaceAllToolsContent.includes(`"${routeUrl}"`) || workspaceAllToolsContent.includes(`'${routeUrl}'`);
  const inShell = workspaceShellContent.includes(`"${routeUrl}"`) || workspaceShellContent.includes(`'${routeUrl}'`);
  const inFlyout = workspaceFlyoutContent.includes(`"${routeUrl}"`) || workspaceFlyoutContent.includes(`'${routeUrl}'`);
  
  if (inRegistry || inWorkspaceNavigation || inAllTools || inShell || inFlyout) {
    mappedWorkspaceRoutes.push({ file: r, url: routeUrl });
  } else {
    unmappedWorkspaceRoutes.push({ file: r, url: routeUrl });
  }
}

console.log(`Total Workspace Feature Routes: ${routeFiles.length}`);
console.log(`Mapped in Navigation/Tools/Sidebar: ${mappedWorkspaceRoutes.length}`);
console.log(`UNMAPPED in Navigation/Tools/Sidebar: ${unmappedWorkspaceRoutes.length}`);

console.log('\nUnmapped Routes list:');
unmappedWorkspaceRoutes.forEach(r => console.log(`  ${r.file} -> ${r.url}`));
