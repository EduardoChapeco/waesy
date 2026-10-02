import fs from 'fs';
import path from 'path';

const root = process.cwd();

// Regex para capturar imports
const IMPORT_REGEX = /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"]([^'"]+)['"]/g;

function getImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const imports = [];
  let match;
  while ((match = IMPORT_REGEX.exec(content)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function scanFiles(dir, predicate) {
  if (!fs.existsSync(dir)) return [];
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(scanFiles(fullPath, predicate));
    } else if (predicate(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

// 1. Analisar src/routes
const routeFiles = scanFiles(path.join(root, 'src', 'routes'), f => f.endsWith('.tsx') || f.endsWith('.ts'));

// 2. Analisar src/services
const serviceFiles = scanFiles(path.join(root, 'src', 'services'), f => f.endsWith('.ts') || f.endsWith('.tsx'));

// 3. Analisar src/lib
const libFiles = scanFiles(path.join(root, 'src', 'lib'), f => f.endsWith('.ts') || f.endsWith('.tsx'));

// Verificar violações em rotas (ex: importando supabase direto em vez de services)
const routeDirectSupabaseViolations = [];
for (const file of routeFiles) {
  const imports = getImports(file);
  const relativeFile = path.relative(root, file).replace(/\\/g, '/');
  for (const imp of imports) {
    if (imp.includes('supabase') && !imp.includes('services/')) {
      // Ignorar rotas de callback de autenticação se houver necessidade pontual de token hash
      routeDirectSupabaseViolations.push({
        file: relativeFile,
        importPath: imp
      });
    }
  }
}

// Verificar violações em services (services importando React ou componentes de UI)
const serviceUIViolations = [];
const uiPackages = ['react', 'react-dom', '@radix-ui', '@phosphor-icons', 'lucide-react', 'framer-motion'];
for (const file of serviceFiles) {
  // Ignorar arquivos de teste de services
  if (file.includes('.test.') || file.includes('.spec.')) continue;
  const imports = getImports(file);
  const relativeFile = path.relative(root, file).replace(/\\/g, '/');
  for (const imp of imports) {
    const isUiPkg = uiPackages.some(pkg => imp === pkg || imp.startsWith(pkg + '/'));
    const isUiComponent = imp.includes('/components/') || imp.startsWith('../components/');
    if (isUiPkg || isUiComponent) {
      serviceUIViolations.push({
        file: relativeFile,
        importPath: imp
      });
    }
  }
}

// Mapeamento de donos de rota
const routeOwners = {
  store: [],
  workspace: [],
  admin: [],
  auth: [],
  legal: [],
  institucional: [],
  outros: []
};

for (const file of routeFiles) {
  const rel = path.relative(path.join(root, 'src', 'routes'), file).replace(/\\/g, '/');
  if (rel.startsWith('_store') || rel.includes('loja') || rel.includes('vitrine') || rel.includes('carrinho') || rel.includes('checkout')) {
    routeOwners.store.push(rel);
  } else if (rel.startsWith('workspace') || rel.startsWith('_workspace')) {
    routeOwners.workspace.push(rel);
  } else if (rel.startsWith('admin') || rel.startsWith('_admin')) {
    routeOwners.admin.push(rel);
  } else if (rel.includes('login') || rel.includes('auth') || rel.includes('cadastro') || rel.includes('recuperar')) {
    routeOwners.auth.push(rel);
  } else if (rel.includes('termos') || rel.includes('privacidade') || rel.includes('sobre')) {
    routeOwners.legal.push(rel);
  } else {
    routeOwners.outros.push(rel);
  }
}

// Mapeamento de donos de services
const serviceOwners = {
  commerce: [],
  finance: [],
  logistics: [],
  tourism: [],
  classifieds: [],
  security_auth: [],
  catalog_ad: [],
  ai_agent: [],
  shared_platform: []
};

for (const file of serviceFiles) {
  const name = path.basename(file);
  if (name.includes('order') || name.includes('cart') || name.includes('checkout') || name.includes('store') || name.includes('pos')) {
    serviceOwners.commerce.push(name);
  } else if (name.includes('finance') || name.includes('billing') || name.includes('ledger') || name.includes('tax') || name.includes('payment') || name.includes('nfe')) {
    serviceOwners.finance.push(name);
  } else if (name.includes('delivery') || name.includes('shipping') || name.includes('courier') || name.includes('wms') || name.includes('fleet')) {
    serviceOwners.logistics.push(name);
  } else if (name.includes('travel') || name.includes('tourism') || name.includes('flight') || name.includes('booking') || name.includes('hotel')) {
    serviceOwners.tourism.push(name);
  } else if (name.includes('classified') || name.includes('lead') || name.includes('crm') || name.includes('talent')) {
    serviceOwners.classifieds.push(name);
  } else if (name.includes('auth') || name.includes('rbac') || name.includes('security') || name.includes('token') || name.includes('tenant')) {
    serviceOwners.security_auth.push(name);
  } else if (name.includes('ad-') || name.includes('listing') || name.includes('product') || name.includes('catalog') || name.includes('template')) {
    serviceOwners.catalog_ad.push(name);
  } else if (name.includes('ai-') || name.includes('agent') || name.includes('mcp') || name.includes('radar') || name.includes('sin-')) {
    serviceOwners.ai_agent.push(name);
  } else {
    serviceOwners.shared_platform.push(name);
  }
}

const auditResult = {
  totalRoutes: routeFiles.length,
  totalServices: serviceFiles.length,
  totalLib: libFiles.length,
  routeDirectSupabaseViolations: {
    count: routeDirectSupabaseViolations.length,
    items: routeDirectSupabaseViolations.slice(0, 15)
  },
  serviceUIViolations: {
    count: serviceUIViolations.length,
    items: serviceUIViolations.slice(0, 15)
  },
  routeOwnerBreakdown: {
    store: routeOwners.store.length,
    workspace: routeOwners.workspace.length,
    admin: routeOwners.admin.length,
    auth: routeOwners.auth.length,
    legal: routeOwners.legal.length,
    outros: routeOwners.outros.length
  },
  serviceOwnerBreakdown: {
    commerce: serviceOwners.commerce.length,
    finance: serviceOwners.finance.length,
    logistics: serviceOwners.logistics.length,
    tourism: serviceOwners.tourism.length,
    classifieds: serviceOwners.classifieds.length,
    security_auth: serviceOwners.security_auth.length,
    catalog_ad: serviceOwners.catalog_ad.length,
    ai_agent: serviceOwners.ai_agent.length,
    shared_platform: serviceOwners.shared_platform.length
  }
};

console.log(JSON.stringify(auditResult, null, 2));
