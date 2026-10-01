import fs from 'fs';
import path from 'path';

const ROUTES_DIR = path.resolve('src/routes');
const ROUTE_TREE_PATH = path.resolve('src/routeTree.gen.ts');
const LIB_ROUTES_PATH = path.resolve('src/lib/routes.ts');
const WORKSPACE_NAV_PATH = path.resolve('src/lib/workspace-navigation.ts');
const NAV_REGISTRY_PATH = path.resolve('src/lib/navigation-registry.ts');

const OUTPUT_JSON = path.resolve('ia/32-rotas.json');
const OUTPUT_MD = path.resolve('ia/32-rotas.md');

function fileToRoutePath(fileName) {
  let name = fileName.replace(/\.(tsx|ts|jsx|js)$/, '');
  if (name === '__root') return null;
  let parts = name.split('.');
  if (parts[0].startsWith('_')) {
    parts.shift(); // remove pathless layout prefix (e.g. _store)
  }
  if (parts.length === 0) return '/';
  if (parts.length === 1 && parts[0] === 'index') return '/';
  if (parts[parts.length - 1] === 'index') parts.pop();
  let url = '/' + parts.map(p => {
    if (p.startsWith('[') && p.endsWith(']')) {
      return p.slice(1, -1);
    }
    return p;
  }).join('/');
  return url.replace(/\/+/g, '/');
}

function determineShell(filePath, routePath) {
  const norm = filePath.replace(/\\/g, '/');
  if (norm.includes('workspace')) return 'Workspace (Lojista / Operação)';
  if (norm.includes('admin-master') || norm.includes('admin.')) return 'Admin Master (Governança)';
  if (norm.includes('creator')) return 'Creator Studio (Criadores)';
  if (norm.includes('civil')) return 'Civil / Cidadão';
  if (norm.includes('api.')) return 'API / Integrações (BFF & MCP)';
  if (norm.includes('sitemap') || norm.includes('robots')) return 'SEO / Sitemaps';
  if (norm.includes('auth')) return 'Autenticação';
  return 'Vitrine Pública & Loja (_store)';
}

function determinePermission(routePath, content) {
  if (routePath.startsWith('/admin-master')) return 'ADMIN_MASTER (Superadmin)';
  if (routePath.startsWith('/workspace/financeiro') || routePath.startsWith('/workspace/caixas')) return 'FINANCE / OWNER';
  if (routePath.startsWith('/workspace/configuracoes') || routePath.startsWith('/workspace/equipe')) return 'OWNER (Proprietário)';
  if (routePath.startsWith('/workspace')) return 'STAFF / MANAGER / OWNER';
  if (routePath.startsWith('/conta') || routePath.startsWith('/perfil')) return 'CUSTOMER (Autenticado)';
  if (routePath.startsWith('/api')) return 'API_KEY / SESSION';
  return 'PUBLIC (Visitante)';
}

// 1. Ler todos os arquivos em src/routes
const routeFiles = fs.readdirSync(ROUTES_DIR)
  .filter(f => !fs.statSync(path.join(ROUTES_DIR, f)).isDirectory())
  .filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

const fileRoutes = [];
for (const file of routeFiles) {
  const fullPath = path.join(ROUTES_DIR, file);
  const routePath = fileToRoutePath(file);
  if (!routePath) continue; // __root
  const content = fs.readFileSync(fullPath, 'utf8');
  fileRoutes.push({
    file,
    routePath,
    shell: determineShell(file, routePath),
    permission: determinePermission(routePath, content),
    hasParams: routePath.includes('$'),
    isLayout: file.startsWith('_') && !file.includes('.'),
    contentLength: content.length,
    hasLoading: content.includes('Skeleton') || content.includes('isLoading'),
    hasError: content.includes('isError') || content.includes('ErrorBoundary'),
    hasEmpty: content.includes('EmptyState') || content.includes('length === 0')
  });
}

// 2. Ler rotas registradas em src/lib/routes.ts
let registeredPaths = new Set();
if (fs.existsSync(LIB_ROUTES_PATH)) {
  const libContent = fs.readFileSync(LIB_ROUTES_PATH, 'utf8');
  const pathRegex = /path:\s*["']([^"']+)["']/g;
  let m;
  while ((m = pathRegex.exec(libContent)) !== null) {
    registeredPaths.add(m[1]);
  }
}

// 3. Ler rotas no routeTree.gen.ts
let treePaths = new Set();
if (fs.existsSync(ROUTE_TREE_PATH)) {
  const treeContent = fs.readFileSync(ROUTE_TREE_PATH, 'utf8');
  const treeRegex = /path:\s*["']([^"']+)["']/g;
  let m;
  while ((m = treeRegex.exec(treeContent)) !== null) {
    treePaths.add(m[1]);
  }
}

// 4. Coletar links reais em todo o src/
const allSrcFiles = [];
function walkSrc(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (!['node_modules', 'dist', '.git'].includes(item.name)) walkSrc(full);
    } else if (item.name.endsWith('.tsx') || item.name.endsWith('.ts')) {
      if (item.name !== 'routeTree.gen.ts' && !item.name.includes('.test.')) {
        allSrcFiles.push(full);
      }
    }
  }
}
walkSrc(path.resolve('src'));

const linkReferences = new Map(); // path -> count
const toRegex = /\b(?:to|href)\s*[:=]\s*["']([^"'`{}]+)["']|\bpath\s*:\s*["']([^"'`{}]+)["']/g;
const navRegex = /\b(?:navigate|redirect)\s*\(\s*(?:\{\s*to:\s*)?["']([^"'`{}]+)["']/g;

for (const f of allSrcFiles) {
  const content = fs.readFileSync(f, 'utf8');
  let m;
  toRegex.lastIndex = 0;
  while ((m = toRegex.exec(content)) !== null) {
    const rawLink = m[1] || m[2];
    if (rawLink) {
      const link = rawLink.trim();
      if (link.startsWith('/') && !link.startsWith('//')) {
        linkReferences.set(link, (linkReferences.get(link) || 0) + 1);
      }
    }
  }
  navRegex.lastIndex = 0;
  while ((m = navRegex.exec(content)) !== null) {
    const link = m[1].trim();
    if (link.startsWith('/') && !link.startsWith('//')) {
      linkReferences.set(link, (linkReferences.get(link) || 0) + 1);
    }
  }
}

// 5. Mapear inconsistências (B2)
const fileRoutePathSet = new Set(fileRoutes.map(r => r.routePath));

// Rotas com arquivo mas não registradas no catálogo formal (lib/routes.ts)
const fileWithoutRegistry = fileRoutes.filter(r => !registeredPaths.has(r.routePath) && !registeredPaths.has(r.routePath.replace(/\$/g, ':')));

// Rotas registradas sem arquivo correspondente
const registeredWithoutFile = [];
for (const p of registeredPaths) {
  const tanstackP = p.replace(/:([A-Za-z0-9_]+)/g, '$$$1');
  if (!fileRoutePathSet.has(tanstackP) && !fileRoutePathSet.has(p)) {
    // Verificar se existe rota aproximada
    registeredWithoutFile.push(p);
  }
}

// Links apontando para rotas inexistentes (potenciais 404)
const brokenLinks = [];
for (const [link, count] of linkReferences.entries()) {
  // Normalizar link estático
  const cleanLink = link.split('?')[0].replace(/\/+$/, '') || '/';
  // Checar match direto ou match com parâmetros
  const exists = fileRoutes.some(r => {
    if (r.routePath === cleanLink) return true;
    if (r.hasParams) {
      const regexPattern = '^' + r.routePath.replace(/\$([a-zA-Z0-9_]+)/g, '[^/]+') + '$';
      return new RegExp(regexPattern).test(cleanLink);
    }
    return false;
  });
  if (
    !exists &&
    !cleanLink.startsWith('/api') &&
    !cleanLink.startsWith('/auth') &&
    !cleanLink.startsWith('/sitemap') &&
    !cleanLink.includes('#') &&
    !cleanLink.match(/\.(ico|png|jpg|jpeg|svg|webp|gif)$/) &&
    cleanLink !== '/_store'
  ) {
    brokenLinks.push({ link: cleanLink, referencesCount: count });
  }
}

// Rotas órfãs (arquivos em src/routes sem nenhuma referência em links no código)
const orphanRoutes = fileRoutes.filter(r => {
  const exactCount = linkReferences.get(r.routePath) || 0;
  if (exactCount > 0) return false;
  // Verificar se alguma referência bate com rota dinâmica
  for (const link of linkReferences.keys()) {
    if (r.hasParams) {
      const regexPattern = '^' + r.routePath.replace(/\$([a-zA-Z0-9_]+)/g, '[^/]+') + '$';
      if (new RegExp(regexPattern).test(link)) return false;
    }
  }
  return true;
});

// 6. Agrupamento por Shell
const shellCounts = {};
for (const r of fileRoutes) {
  shellCounts[r.shell] = (shellCounts[r.shell] || 0) + 1;
}

// 7. Gerar JSON de auditoria
const auditData = {
  timestamp: new Date().toISOString(),
  metrics: {
    totalFiles: fileRoutes.length,
    registeredInLib: registeredPaths.size,
    treeGenerated: treePaths.size,
    totalLinksAudited: linkReferences.size,
    fileWithoutRegistryCount: fileWithoutRegistry.length,
    registeredWithoutFileCount: registeredWithoutFile.length,
    brokenLinksCount: brokenLinks.length,
    orphanRoutesCount: orphanRoutes.length
  },
  shellDistribution: shellCounts,
  brokenLinks: brokenLinks.slice(0, 30),
  orphanSample: orphanRoutes.slice(0, 30).map(r => ({ file: r.file, path: r.routePath, shell: r.shell })),
  unregisteredSample: fileWithoutRegistry.slice(0, 30).map(r => ({ file: r.file, path: r.routePath, shell: r.shell }))
};

fs.writeFileSync(OUTPUT_JSON, JSON.stringify(auditData, null, 2), 'utf8');

// 8. Gerar Markdown Dossier
let md = `# ia/32-rotas.md — Dossiê Forense de Rotas, Registries e Links Reais (Prompt 32)\n\n`;
md += `> Gerado em: \`${auditData.timestamp}\` | Cobertura Total: ${fileRoutes.length} rotas físicas em \`src/routes/\`\n\n`;

md += `## 1. Mapeamento de Verdade entre Fontes (B1)\n\n`;
md += `| Fonte Auditada | Quantidade Mapeada | Status de Cobertura |\n`;
md += `| :--- | :--- | :--- | :--- |\n`;
md += `| **Arquivos Físicos em \`src/routes/\`** | **${fileRoutes.length}** | Fonte Canônica de Execução |\n`;
md += `| **Rotas Geradas em \`src/routeTree.gen.ts\`** | **${treePaths.size}** | Sincronizado pelo TanStack Router |\n`;
md += `| **Rotas no Catálogo Formal (\`src/lib/routes.ts\`)** | **${registeredPaths.size}** | Catálogo Tipado de Domínio |\n`;
md += `| **Links e Navegações Reais em Código** | **${linkReferences.size}** | Referências Internas Mapeadas |\n\n`;

md += `## 2. Distribuição das Rotas por Shell de Navegação (B4)\n\n`;
md += `| Shell de Aplicação | Quantidade de Rotas | Proporção | Nível de Acesso |\n`;
md += `| :--- | :--- | :--- | :--- |\n`;
for (const [shell, count] of Object.entries(shellCounts).sort((a, b) => b[1] - a[1])) {
  const pct = ((count / fileRoutes.length) * 100).toFixed(1);
  md += `| **${shell}** | ${count} | ${pct}% | RBAC Governança Dedicado |\n`;
}
md += `\n`;

md += `## 3. Diagnóstico de Inconsistências (B2)\n\n`;
md += `| Categoria de Inconsistência | Detectadas | Risco | Ação Corretiva |\n`;
md += `| :--- | :--- | :--- | :--- |\n`;
md += `| **Links Quebrados (Potencial 404)** | ${brokenLinks.length} | Médio/Alto | Redirecionamento canônico ou criação de shim |\n`;
md += `| **Rotas Órfãs (Sem links internos)** | ${orphanRoutes.length} | Baixo | Adicionar aos menus laterais ou submenus |\n`;
md += `| **Rotas Não Registradas no Catálogo** | ${fileWithoutRegistry.length} | Baixo | Ingestão no catálogo unificado de rotas |\n`;
md += `| **Entradas no Catálogo sem Arquivo** | ${registeredWithoutFile.length} | Médio | Depreciação ou criação da página de destino |\n\n`;

if (brokenLinks.length > 0) {
  md += `### 3.1 Amostra de Links Quebrados Detectados no Código\n\n`;
  md += `| Link no Código | Ocorrências | Diagnóstico |\n`;
  md += `| :--- | :--- | :--- |\n`;
  brokenLinks.slice(0, 15).forEach(b => {
    md += `| \`${b.link}\` | ${b.referencesCount}x | Destino sem rota física direta |\n`;
  });
  md += `\n`;
}

md += `### 3.2 Amostra de Rotas Órfãs (Rotas Físicas sem Links Declarados)\n\n`;
md += `| Arquivo | Rota URL | Shell |\n`;
md += `| :--- | :--- | :--- |\n`;
orphanRoutes.slice(0, 15).forEach(o => {
  md += `| \`${o.file}\` | \`${o.routePath}\` | ${o.shell} |\n`;
});
md += `\n`;

fs.writeFileSync(OUTPUT_MD, md, 'utf8');

console.log('Auditoria de rotas B1-B4 concluída com sucesso!');
console.log(`Relatórios gerados em: ${OUTPUT_JSON} e ${OUTPUT_MD}`);
