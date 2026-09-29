import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');
const ROUTES_DIR = path.join(SRC_DIR, 'routes');
const COMPONENTS_DIR = path.join(SRC_DIR, 'components');
const SERVICES_DIR = path.join(SRC_DIR, 'services');
const LIB_DIR = path.join(SRC_DIR, 'lib');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

function getAllFiles(dir, exts = ['.tsx', '.ts', '.jsx', '.js']) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of list) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      if (!['node_modules', 'dist', '.git', 'legacy_quarantine'].includes(item.name)) {
        files = files.concat(getAllFiles(full, exts));
      }
    } else if (exts.some(ext => item.name.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

const allSrcFiles = getAllFiles(SRC_DIR);
console.log(`Carregando ${allSrcFiles.length} arquivos em memória...`);

const fileCache = new Map();
for (const file of allSrcFiles) {
  const content = fs.readFileSync(file, 'utf8');
  fileCache.set(file, {
    rel: path.relative(ROOT_DIR, file).replace(/\\/g, '/'),
    content,
    lines: content.split('\n').length
  });
}

let commitHash = 'UNKNOWN';
try {
  commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
} catch {}

// 1. Rotas
const routeFiles = allSrcFiles.filter(f => f.startsWith(ROUTES_DIR));
const rotas = [];
const paginas = [];

for (const file of routeFiles) {
  const data = fileCache.get(file);
  const rel = data.rel;
  const content = data.content;

  // Extracao de caminho de rota TanStack
  let routePath = '/' + path.relative(ROUTES_DIR, file)
    .replace(/\\/g, '/')
    .replace(/\.tsx?$/, '')
    .replace(/\/index$/, '')
    .replace(/^\/?__root$/, '/');
  
  if (routePath === '/index') routePath = '/';

  const isProtected = /useAuth|requireAuth|isLoggedIn|useUser|useSession|role|session|authGuard/i.test(content);
  const isReachable = !rel.includes('legacy') && !rel.includes('unused') && !rel.includes('temp');

  rotas.push({
    caminho: routePath,
    arquivo: rel,
    componente: path.basename(file, path.extname(file)),
    protegida: isProtected,
    alcancavel_de: routePath === '/' ? ['entry'] : ['navigation', 'link']
  });

  const imports = (content.match(/import\s+.*?from\s+['"][^'"]+['"]/g) || []).length;
  const usaEstado = /useState|useReducer|useAtom|useStore/g.test(content);
  const usaDados = /useQuery|useMutation|supabase|services\//g.test(content);

  paginas.push({
    arquivo: rel,
    linhas: data.lines,
    imports,
    usa_estado: usaEstado,
    usa_dados: usaDados
  });
}

// 2. Componentes e quem usa
const componentFiles = allSrcFiles.filter(f => f.startsWith(COMPONENTS_DIR));
const componentes = [];

for (const file of componentFiles) {
  const data = fileCache.get(file);
  const rel = data.rel;
  const baseName = path.basename(file, path.extname(file));

  // Achar quem importa
  const usedBy = [];
  for (const [otherFile, otherData] of fileCache.entries()) {
    if (otherFile === file) continue;
    if (otherData.content.includes(baseName) || otherData.content.includes(rel)) {
      usedBy.push(otherData.rel);
    }
  }

  const isOutsideRouter = usedBy.length === 0;

  componentes.push({
    arquivo: rel,
    exporta: baseName,
    usado_por: usedBy.slice(0, 10),
    usos_total: usedBy.length,
    fora_do_roteador: isOutsideRouter
  });
}

// 3. Hooks
const hookFiles = allSrcFiles.filter(f => path.basename(f).startsWith('use-') || path.basename(f).startsWith('use'));
const hooks = [];

for (const file of hookFiles) {
  const data = fileCache.get(file);
  const rel = data.rel;
  const baseName = path.basename(file, path.extname(file));

  const usedBy = [];
  for (const [otherFile, otherData] of fileCache.entries()) {
    if (otherFile === file) continue;
    if (otherData.content.includes(baseName)) {
      usedBy.push(otherData.rel);
    }
  }

  hooks.push({
    arquivo: rel,
    retorna: baseName,
    usado_por: usedBy.slice(0, 10),
    usos_total: usedBy.length
  });
}

// 4. Estado Global
const estado_global = [];
for (const [file, data] of fileCache.entries()) {
  if (data.content.includes('createContext') || data.content.includes('zustand') || data.content.includes('create(')) {
    const isStorage = /localStorage|sessionStorage/g.test(data.content);
    const isServer = /useQuery|queryClient/g.test(data.content);
    estado_global.push({
      arquivo: data.rel,
      tipo: data.content.includes('createContext') ? 'React.Context' : 'Store/State',
      persistencia: isStorage ? 'storage' : (isServer ? 'servidor' : 'memoria')
    });
  }
}

// 5. Consultas e Gravações
const consultas = [];
const gravacoes = [];
const tableSet = new Set();
const tableReadMap = new Map();
const tableWriteMap = new Map();

const tableQueryRegex = /from\(['"]([a-zA-Z0-9_-]+)['"]\)\.(select|insert|update|delete|upsert)/g;
for (const [file, data] of fileCache.entries()) {
  let m;
  while ((m = tableQueryRegex.exec(data.content)) !== null) {
    const tbl = m[1];
    const op = m[2];
    tableSet.add(tbl);

    if (op === 'select') {
      if (!tableReadMap.has(tbl)) tableReadMap.set(tbl, []);
      tableReadMap.get(tbl).push(data.rel);
      consultas.push({
        arquivo: data.rel,
        alvo: tbl,
        operacao: op
      });
    } else {
      if (!tableWriteMap.has(tbl)) tableWriteMap.set(tbl, []);
      tableWriteMap.get(tbl).push(data.rel);
      const hasValidation = /zod|safeParse|parse|validate/i.test(data.content);
      const hasFeedback = /toast|alert|sonner|message/i.test(data.content);
      gravacoes.push({
        arquivo: data.rel,
        alvo: tbl,
        operacao: op,
        tem_validacao: hasValidation,
        tem_feedback: hasFeedback
      });
    }
  }
}

// 6. Tabelas auditadas
const tabelas = [];
for (const tbl of tableSet) {
  const reads = tableReadMap.get(tbl) || [];
  const writes = tableWriteMap.get(tbl) || [];
  tabelas.push({
    nome: tbl,
    lidas_por: Array.from(new Set(reads)).slice(0, 5),
    escritas_por: Array.from(new Set(writes)).slice(0, 5),
    sem_uso: reads.length === 0 && writes.length === 0,
    apenas_leitura: reads.length > 0 && writes.length === 0,
    apenas_escrita: reads.length === 0 && writes.length > 0
  });
}

// 7. Ações de UI e handlers vazios
const acoes_ui = [];
for (const [file, data] of fileCache.entries()) {
  if (data.rel.startsWith('src/routes') || data.rel.startsWith('src/components')) {
    const emptyHandlerRegex = /onClick\s*=\s*\{\s*(\(\)\s*=>\s*\{\s*\}|\(\)\s*=>\s*undefined|undefined)\s*\}/g;
    let m;
    while ((m = emptyHandlerRegex.exec(data.content)) !== null) {
      acoes_ui.push({
        arquivo: data.rel,
        elemento: 'button/clickable',
        rotulo: 'UNKNOWN',
        handler: m[1],
        efeito_real: 'nenhum',
        handler_vazio: true
      });
    }
  }
}

// 8. Funções Backend em src/services/
const serviceFiles = allSrcFiles.filter(f => f.startsWith(SERVICES_DIR));
const funcoes_backend = [];

for (const file of serviceFiles) {
  const data = fileCache.get(file);
  const fnMatches = data.content.match(/export\s+(?:async\s+)?function\s+([a-zA-Z0-9_]+)/g) || [];
  for (const m of fnMatches) {
    const fnName = m.replace(/export\s+(?:async\s+)?function\s+/, '').trim();
    let calledBy = [];
    for (const [otherFile, otherData] of fileCache.entries()) {
      if (otherFile === file) continue;
      if (otherData.content.includes(fnName)) {
        calledBy.push(otherData.rel);
      }
    }
    funcoes_backend.push({
      arquivo: data.rel,
      nome: fnName,
      chamada_por: calledBy.slice(0, 5),
      chamada_ausente: calledBy.length === 0
    });
  }
}

// 9. Integrações Externas
const integracoes = [
  { servico: 'Supabase', onde: 'src/lib/supabase.ts', credencial_presente: true, fallback: false },
  { servico: 'MapLibre GL', onde: 'src/components/map/', credencial_presente: true, fallback: false },
  { servico: 'Cloudflare Pages / Workers', onde: 'wrangler.toml', credencial_presente: true, fallback: false }
];

// 10. Assets
const assets = [];
if (fs.existsSync(PUBLIC_DIR)) {
  const publicFiles = fs.readdirSync(PUBLIC_DIR);
  for (const pf of publicFiles) {
    const stat = fs.statSync(path.join(PUBLIC_DIR, pf));
    if (stat.isFile()) {
      assets.push({ nome: pf, tamanho_kb: Math.round(stat.size / 1024) });
    }
  }
}

// 11. Textos de Promessa ("em breve", etc.)
const textos_promessa = [];
const promessaRegex = /\b(em breve|brevemente|coming soon|em desenvolvimento|aguarde)\b/gi;
for (const [file, data] of fileCache.entries()) {
  let m;
  while ((m = promessaRegex.exec(data.content)) !== null) {
    textos_promessa.push({
      arquivo: data.rel,
      trecho: m[0],
      indice: m.index
    });
  }
}

const inventario = {
  gerado_em: new Date().toISOString(),
  commit: commitHash,
  estatisticas: {
    total_rotas: rotas.length,
    total_paginas: paginas.length,
    total_componentes: componentes.length,
    componentes_fora_roteador: componentes.filter(c => c.fora_do_roteador).length,
    total_hooks: hooks.length,
    total_estados_globais: estado_global.length,
    total_consultas: consultas.length,
    total_gravacoes: gravacoes.length,
    total_tabelas: tabelas.length,
    tabelas_apenas_leitura: tabelas.filter(t => t.apenas_leitura).length,
    tabelas_apenas_escrita: tabelas.filter(t => t.apenas_escrita).length,
    total_funcoes_backend: funcoes_backend.length,
    funcoes_backend_orfas: funcoes_backend.filter(f => f.chamada_ausente).length,
    handlers_vazios: acoes_ui.length,
    textos_promessa_total: textos_promessa.length
  },
  rotas,
  paginas,
  componentes,
  hooks,
  estado_global,
  consultas: consultas.slice(0, 200),
  gravacoes: gravacoes.slice(0, 200),
  acoes_ui,
  tabelas,
  funcoes_backend,
  integracoes,
  assets,
  textos_promessa
};

if (!fs.existsSync(path.join(ROOT_DIR, 'melhoria'))) {
  fs.mkdirSync(path.join(ROOT_DIR, 'melhoria'), { recursive: true });
}

fs.writeFileSync(path.join(ROOT_DIR, 'melhoria/00-superficie.json'), JSON.stringify(inventario, null, 2));
console.log('00-superficie.json gerado com sucesso em melhoria/00-superficie.json!');
console.log(JSON.stringify(inventario.estatisticas, null, 2));
