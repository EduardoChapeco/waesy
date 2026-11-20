import fs from 'fs';
import path from 'path';

const ROUTES_DIR = path.resolve('src/routes');

function fileToRoutePath(fileName) {
  let name = fileName.replace(/\.(tsx|ts|jsx|js)$/, '');
  if (name === '__root') return null;
  let parts = name.split('.');
  if (parts[0].startsWith('_')) {
    parts.shift();
  }
  if (parts.length === 0) return '/';
  if (parts.length === 1 && parts[0] === 'index') return '/';
  if (parts[parts.length - 1] === 'index') parts.pop();
  let url = '/' + parts.map(p => {
    if (p.startsWith('[') && p.endsWith(']')) {
      return p.slice(1, -1);
    }
    if (p.startsWith('$')) {
      return ':' + p.slice(1);
    }
    return p;
  }).join('/');
  return url.replace(/\/+/g, '/');
}

function extractPageTitle(file, routePath, content) {
  const titleMatch = content.match(/title:\s*["'`]([^"'`\n]{3,90})["'`]/);
  if (titleMatch) return titleMatch[1].replace(/\|/g, "-").trim();
  const fnMatch = content.match(/function\s+([A-Z][A-Za-z0-9_]{3,60})\s*\(/);
  if (fnMatch) return fnMatch[1].replace(/Page$|View$|Route$/, "") || routePath;
  if (file.startsWith("api.")) return `API Endpoint ${routePath}`;
  return routePath;
}

function classifyDomain(file, content) {
  const isPureRedirect =
    content.length < 1000 &&
    /throw\s+redirect\(/.test(content) &&
    !/<div|<section|<main/.test(content);
  if (
    isPureRedirect ||
    file.includes("simlab") ||
    file.includes("design-system") ||
    file === "_store.stories.tsx"
  ) {
    return "8. Rotas Experimentais, Legadas, Duplicadas e Redirects";
  }
  if (file.startsWith("admin-master") || file.startsWith("admin.")) {
    return "7. Admin Master (admin-master.*)";
  }
  if (
    file.includes("turismo") ||
    file.includes("proposta") ||
    file.includes("viajante") ||
    file.includes("viagem") ||
    file.includes("voos") ||
    file.includes("cruzeiros") ||
    file.includes("aeroporto") ||
    file.includes("voucher")
  ) {
    return "2. Turismo, Propostas, Excursões & Vouchers";
  }
  if (
    file.includes("mobilidade") ||
    file.includes("entregador") ||
    file.includes("entrega") ||
    file.includes("frete") ||
    file.includes("waesy-go")
  ) {
    return "5. Mobilidade, Waesy Go & Entregadores";
  }
  if (
    file.includes("classificado") ||
    file.includes("imoveis") ||
    file.includes("veiculo") ||
    file.includes("emprego") ||
    file.includes("diretorio") ||
    file.includes("vagas") ||
    file.includes("curriculo")
  ) {
    return "3. Classificados, Imóveis, Veículos, Empregos & Diretório";
  }
  if (
    file.includes("noticias") ||
    file.includes("waesynews") ||
    file.includes("comunidade") ||
    file.includes("feed") ||
    file.includes("concurso") ||
    file.includes("membro") ||
    file.includes("stories") ||
    file.includes("social") ||
    file.includes("creator") ||
    file.includes("criador")
  ) {
    return "4. Social, Stories, Comunidade, Concursos & Waesy News";
  }
  if (file.startsWith("workspace.") || file.startsWith("workspace_") || file.startsWith("api.")) {
    return "6. Workspace CRM, Catálogo, PDV, Financeiro, Contratos, Marketing, Atendimento & APIs";
  }
  return "1. Vitrine Pública & E-commerce (_store.*)";
}

function evaluateRecommendation(file, content) {
  const isPureRedirect =
    content.length < 1000 &&
    /throw\s+redirect\(/.test(content) &&
    !/<div|<section|<main/.test(content);

  if (file === "_store.stories.tsx" || file === "workspace.design-system.tsx") {
    return {
      status: "Candidata a Exclusão",
      reason: "Rota desativada/legada (apenas redirect estático).",
    };
  }
  if (file.includes("simlab")) {
    return {
      status: "Candidata a Exclusão",
      reason: "Laboratório experimental SimLab opcional para lançamento comercial enxuto.",
    };
  }
  if (isPureRedirect) {
    return {
      status: "Fundir",
      reason: "Alias de redirecionamento legado; pode ser consolidado em _redirects ou removido após migração de links.",
    };
  }
  if (
    file === "workspace.produtos.novo.tsx" &&
    fs.existsSync(path.join(ROUTES_DIR, "workspace.catalogo.produtos.novo.tsx"))
  ) {
    return {
      status: "Fundir",
      reason: "Duplicação com workspace.catalogo.produtos.novo.tsx.",
    };
  }
  return {
    status: "Manter",
    reason: "Rota ativa e canônica do ecossistema Waesy.",
  };
}

const files = fs.readdirSync(ROUTES_DIR)
  .filter(f => !fs.statSync(path.join(ROUTES_DIR, f)).isDirectory())
  .filter(f => (f.endsWith('.tsx') || f.endsWith('.ts')) && !f.includes('.test.') && !f.includes('.spec.'))
  .sort((a, b) => a.localeCompare(b));

const categorized = {};

for (const file of files) {
  const routePath = fileToRoutePath(file);
  if (!routePath) continue;
  const fullPath = path.join(ROUTES_DIR, file);
  const content = fs.readFileSync(fullPath, 'utf8');
  const domain = classifyDomain(file, content);
  const evalResult = evaluateRecommendation(file, content);
  const title = extractPageTitle(file, routePath, content);

  if (!categorized[domain]) categorized[domain] = [];
  categorized[domain].push({
    file: `src/routes/${file}`,
    routePath,
    title,
    url: `https://waesy.com.br${routePath.replace(/:([a-zA-Z0-9_]+)/g, 'exemplo-$1')}`,
    status: evalResult.status,
    reason: evalResult.reason,
    bytes: content.length,
  });
}

const domainKeys = Object.keys(categorized).sort();
let totalAll = 0, totalKeep = 0, totalExclude = 0, totalMerge = 0;

let summaryRows = "";
for (const dom of domainKeys) {
  const list = categorized[dom];
  const keep = list.filter(r => r.status === 'Manter').length;
  const exclude = list.filter(r => r.status === 'Candidata a Exclusão').length;
  const merge = list.filter(r => r.status === 'Fundir').length;
  totalAll += list.length;
  totalKeep += keep;
  totalExclude += exclude;
  totalMerge += merge;
  summaryRows += `| **${dom}** | ${list.length} | ${keep} | ${exclude} | ${merge} |\n`;
}

let md = `# ROUTE_AND_PAGE_PRUNING_INVENTORY.md — Inventário Canônico de Rotas e Páginas para Triagem (EARS-ROT-01)

> **Data de Emissão:** 2026-11-19  
> **Total de Rotas Ativas Mapeadas (excluindo __root e arquivos .test.ts):** ${totalAll}  
> **Diretrizes:** AGENTS.md (B.1 a B.36), EARS-ROT-01, EARS-RES-03  

---

## 1. Resumo Executivo por Módulo

| Módulo | Total de Rotas | Manter | Candidata a Exclusão | Fundir |
| :--- | :---: | :---: | :---: | :---: |
${summaryRows}| **TOTAL GERAL** | **${totalAll}** | **${totalKeep}** | **${totalExclude}** | **${totalMerge}** |

---

`;

let globalIndex = 1;
for (const dom of domainKeys) {
  const list = categorized[dom];
  md += `## ${dom} (${list.length} Rotas)\n\n`;
  md += `| # | Módulo | Título / Função da Página | Link de Produção (https://waesy.com.br/...) | Arquivo da Rota (src/routes/...) | Recomendação (Manter / Candidata a Exclusão / Fundir) |\n`;
  md += `| :-: | :--- | :--- | :--- | :--- | :--- |\n`;

  list.forEach((item) => {
    md += `| ${globalIndex++} | ${dom} | ${item.title} | [${item.url}](${item.url}) | \`${item.file}\` | **${item.status}** — ${item.reason} |\n`;
  });
  md += `\n---\n\n`;
}

fs.mkdirSync('docs/audits', { recursive: true });
fs.writeFileSync('docs/audits/ROUTE_AND_PAGE_PRUNING_INVENTORY.md', md, 'utf8');
console.log(`Inventário atualizado em docs/audits/ROUTE_AND_PAGE_PRUNING_INVENTORY.md (${totalAll} rotas: ${totalKeep} Manter, ${totalExclude} Candidatas, ${totalMerge} Fundir).`);
