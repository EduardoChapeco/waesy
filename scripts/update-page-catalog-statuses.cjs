const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, '..', 'docs', 'PAGE_CATALOG.md');
let content = fs.readFileSync(catalogPath, 'utf8');

const replacements = [
  {
    target: "**Rota:** `/_store/buscar` (`_store.buscar.tsx`) | **Status:** `⚠️ LEGADO`",
    replacement: "**Rota:** `/_store/buscar` (`_store.buscar.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "**Rota:** `/_store/conta/perfil` (`_store.conta.perfil.tsx`) | **Status:** `⚠️ LEGADO`",
    replacement: "**Rota:** `/_store/conta/perfil` (`_store.conta.perfil.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "**Rota:** `/_store/conta/` (aba atividade) | **Status:** `🔵 PARCIAL`",
    replacement: "**Rota:** `/_store/conta/notificacoes` (`_store.conta.notificacoes.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "**Rota:** `/_store/conta/conversas/$id` (`_store.conta.conversas.$id.tsx`) | **Status:** `🔵 PARCIAL`",
    replacement: "**Rota:** `/_store/conta/conversas/$id` (`_store.conta.conversas.$id.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "**Rota:** `/_store/diretorio` (`_store.diretorio.tsx`) | **Status:** `⚠️ LEGADO`",
    replacement: "**Rota:** `/_store/diretorio` (`_store.diretorio.index.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "**Rota:** `/_store/evento/$id` (`_store.evento.$id.tsx`) | **Status:** `🔵 PARCIAL`",
    replacement: "**Rota:** `/_store/evento/$id` (`_store.evento.$id.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "**Rota:** `/_store/conta/classificados` (`_store.conta.classificados.index.tsx`) | **Status:** `🔵 PARCIAL`",
    replacement: "**Rota:** `/_store/conta/classificados` (`_store.conta.classificados.index.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "**Rota:** `/_store/mercado` (`_store.mercado.tsx`) | **Status:** `⚠️ LEGADO`",
    replacement: "**Rota:** `/_store/mercado` (`_store.mercado.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "**Rota:** `/_store/perfil-da-loja` (`_store.perfil-da-loja.tsx`) | **Status:** `⚠️ LEGADO`",
    replacement: "**Rota:** `/_store/vendedora/$slug` (`_store.vendedora.$slug.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "**Rota:** `/_store/agendar` (`_store.agendar.index.tsx`) | **Status:** `🔵 PARCIAL`",
    replacement: "**Rota:** `/_store/agendar` (`_store.agendar.index.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "**Rota:** `/_store/agendar` (`_store.agendar.tsx`) | **Status:** `🔵 PARCIAL`",
    replacement: "**Rota:** `/_store/agendar` (`_store.agendar.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "**Rota:** `/_store/conta` (`_store.conta.index.tsx`) | **Status:** `⚠️ LEGADO`",
    replacement: "**Rota:** `/_store/conta` (`_store.conta.index.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "**Rota:** `/workspace` | **Status:** `⚠️ LEGADO`",
    replacement: "**Rota:** `/workspace` (`workspace.index.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "**Rota:** `/workspace/pdv/comandas` (`workspace.pdv.comandas.tsx`) | **Status:** `🔵 PARCIAL`",
    replacement: "**Rota:** `/workspace/pdv/comandas` (`workspace.pdv.comandas.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "**Rota:** GAP (edição inline na lista) | **Status:** `🔵 PARCIAL`",
    replacement: "**Rota:** `/workspace/servicos` (`workspace.servicos.index.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "**Rota:** GAP — `/workspace/crm` | **Status:** `🔴 GAP`",
    replacement: "**Rota:** `/workspace/comercial` (`workspace.comercial.tsx`) e `/workspace/crm` | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "## W-028 · CRM / Pipeline (GAP)",
    replacement: "## W-028 · CRM / Pipeline & Leads Kanban"
  },
  {
    target: "**Rota:** GAP — `/workspace/orcamentos` | **Status:** `🔴 GAP`",
    replacement: "**Rota:** `/workspace/orcamentos` (`workspace.orcamentos.index.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "## W-029 · Orçamentos — Lista (GAP)",
    replacement: "## W-029 · Orçamentos — Lista"
  },
  {
    target: "**Rota:** GAP — `/workspace/orcamentos/$id` | **Status:** `🔴 GAP`",
    replacement: "**Rota:** `/workspace/orcamentos/$id` (`workspace.orcamentos.$id.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "## W-030 · Detalhe do Orçamento (GAP)",
    replacement: "## W-030 · Detalhe do Orçamento"
  },
  {
    target: "**Rota:** GAP — `/workspace/financeiro/afiliados` | **Status:** `🔴 GAP`",
    replacement: "**Rota:** `/workspace/financeiro/afiliados` (`workspace.financeiro.afiliados.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "## W-037 · Comissões de Parceiros/Afiliados (GAP)",
    replacement: "## W-037 · Comissões de Parceiros/Afiliados"
  },
  {
    target: "**Rota:** `/workspace/configuracoes/loja` | **Status:** `🔵 PARCIAL`",
    replacement: "**Rota:** `/workspace/configuracoes` (`workspace.configuracoes.index.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "**Rota:** GAP — `/workspace/configuracoes/equipe` | **Status:** `🔴 GAP`",
    replacement: "**Rota:** `/workspace/configuracoes/equipe` (`workspace.configuracoes.equipe.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "## W-052 · Equipe e Permissões (GAP)",
    replacement: "## W-052 · Equipe e Permissões"
  },
  {
    target: "**Rota:** GAP — `/workspace/configuracoes/nicho` | **Status:** `🔴 GAP`",
    replacement: "**Rota:** `/workspace/onboarding` (`workspace.onboarding.index.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "## W-053 · Configurações de Nicho/Onboarding (GAP)",
    replacement: "## W-053 · Configurações de Nicho/Onboarding"
  },
  {
    target: "**Rota:** GAP — `/workspace/configuracoes/parceiros` | **Status:** `🔴 GAP`",
    replacement: "**Rota:** `/workspace/configuracoes/parceiros` (`workspace.configuracoes.parceiros.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "## W-054 · Configuração de Parceiros/Afiliados (GAP)",
    replacement: "## W-054 · Configuração de Parceiros/Afiliados"
  },
  {
    target: "**Rota:** GAP — `/admin-master/usuarios` | **Status:** `🔴 GAP`",
    replacement: "**Rota:** `/admin-master/usuarios` (`admin-master.usuarios.tsx`) | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "## A-004 · Usuários e Acessos (GAP)",
    replacement: "## A-004 · Usuários e Acessos"
  },
  {
    target: "**Rota:** GAP — `/admin-master/moderacao` | **Status:** `🔴 GAP`",
    replacement: "**Rota:** `/workspace/moderacao` (`workspace.moderacao.index.tsx`) e `/admin-master/denuncias` | **Status:** `✅ IMPLEMENTADO`"
  },
  {
    target: "## A-005 · Moderação de Conteúdo (GAP)",
    replacement: "## A-005 · Moderação de Conteúdo"
  }
];

let applied = 0;
for (const r of replacements) {
  if (content.includes(r.target)) {
    content = content.replace(r.target, r.replacement);
    applied++;
  } else {
    console.warn('Target not found:', r.target);
  }
}

fs.writeFileSync(catalogPath, content, 'utf8');
console.log(`Successfully updated ${applied}/${replacements.length} entries in docs/PAGE_CATALOG.md`);
