# SPEC-20261115-BIDIRECTIONAL-TOOLBARS-AND-ADAPTIVE-LAYOUT-E2E

Status: APPROVED FOR IMPLEMENTATION
Date: 2026-11-15
Owner: Engineering / Design Ops Waesy

## 1. Contexto e Evidencias de Origem
Auditoria visual e estrutural acionada a partir de tres evidencias de producao e plataforma:
1. Sobreposicao e colisao horizontal na barra `WorkspaceCanonicalToolbar` (`workspace.turismo.index.tsx` e rotas irmas), onde campo de busca, dropdowns de filtro (`Todas Temperaturas`, `Todos os Responsaveis`), resumo metrico e multiplos CTAs colidem entre si em viewports medios/duplas-sidebars.
2. Estrangulamento critico do seletor de empresa na sub-sidebar do Workspace (`workspace-shell.tsx` + `workspace-account-switcher.tsx`), comprimido por `NotificationBell` e botao de busca no mesmo topo de `w-56` (`224px`), truncando nomes completos para a primeira letra (`"E..."`).
3. Truncamento no trilho esquerdo e quebra irregular de filtros no Copilot Fullpage (`ai-chat-shell.tsx`: labels do rail de `w-16` truncando `"Builders"`, `"Tarefas"`, `"Agenda"`, `"Metrica"` e faixa `"Todas | Chats | Projetos | Arquivo"` quebrando em duas linhas).
4. Paridade bidirecional incompleta nas vitrines e editores (`_store.*.tsx` utilizando `useWindowSizeClass()` em vez de `useEffectiveViewport()`, e `admin-master.tsx` / barras de ferramentas sem container query ou rolagem horizontal interna `.waesy-tab-strip`).

## 2. Requisitos Normativos (EARS Syntax)

### R1. Integridade Proporcional e Rolagem Interna em Toolbars (`WorkspaceCanonicalToolbar` e Irmas)
- **REQ-1.1 (Tier 1 Tab Strip):** WHEN tabs de visualizacao estiverem presentes em `WorkspaceCanonicalToolbar`, `THE SYSTEM SHALL` renderizar o container `[role="tablist"]` com `flex-1 min-w-0 waesy-tab-strip` (sem `shrink-0`) para ativar rolagem horizontal interna antes de comprimir utilitarios a direita.
- **REQ-1.2 (Tier 2 Proportional Wrap & Scroll Rail):** WHEN o container `.waesy-toolbar-container` tiver largura util inferior a `720px` ou multiplos filtros/acoes coexistirem com busca em `WorkspaceCanonicalToolbar`, `THE SYSTEM SHALL` organizar a Tier 2 por container queries (`@container waesy-toolbar`) e `.waesy-tab-strip` delimitado por `min-w-0 flex-1`, proibindo qualquer sobreposicao entre input de busca, `filters`, `filterSlot`, metricas e grupo de acoes.
- **REQ-1.3 (Visibilidade de `filterSlot` em Compact/Medium):** WHILE a viewport estiver abaixo de `840px` (`< expanded`), IF `filterSlot` for fornecido a `WorkspaceCanonicalToolbar`, `THE SYSTEM SHALL` manter o `filterSlot` acessivel em uma faixa horizontal rolavel `.waesy-tab-strip w-full min-w-0` abaixo da linha principal de busca/CTA em vez de oculta-lo com `hidden`.
- **REQ-1.4 (Coexistencia de `tabs` e `viewModes` + `title`):** WHEN uma rota passar simultaneamente `tabs` e `viewModes` (ex: `workspace.tarefas.tsx`, `workspace.clientes.index.tsx`), `THE SYSTEM SHALL` preservar as `tabs` no lado esquerdo e promover `viewModes` para o switcher segmentado a direita da Tier 1 sem descarte silencioso. IF `title` for passado explicitamente sem heading externo redundante, `THE SYSTEM SHALL` renderizar titulo conciso opcional de forma nao conflituosa.

### R2. Desestrangulamento de Sidebars e Rails (`workspace-shell.tsx`, `workspace-account-switcher.tsx`, `ai-chat-shell.tsx`)
- **REQ-2.1 (Header da Sub-Sidebar Workspace):** WHEN a sub-sidebar secundaria estiver expandida em `workspace-shell.tsx`, `THE SYSTEM SHALL` conceder largura integral ao `WorkspaceAccountSwitcher` no topo da sub-sidebar e posicionar `<NotificationBell />` e o gatilho de busca global no cluster utilitario superior do `<header>` (protegido por `waesy-tab-strip min-w-0 justify-end`), garantindo legibilidade completa do nome e cidade da empresa.
- **REQ-2.2 (Copilot Fullpage Rail & Filtros):** WHEN o `AiChatShell` renderizar o rail esquerdo em desktop (`md:`), `THE SYSTEM SHALL` utilizar largura minima suficiente (`w-20`) com espacamento proporcional para exibir `"Builders"`, `"Tarefas"`, `"Agenda"` e `"Metricas"` sem truncamento prematuro, e aplicar `.waesy-tab-strip min-w-0` nas faixas de filtro (`Todas | Chats | Projetos | Arquivo`) e cabecalhos contextuais.

### R3. Primitivos Compartilhados de Toolbar, Shells e Abas
- **REQ-3.1 (Primitivos Compartilhados):** `THE SYSTEM SHALL` assegurar `min-w-0`, `flex-wrap` e/ou `.waesy-tab-strip` em `Toolbar` (`src/components/layout/toolbar.tsx`), `TableToolbar` (`src/design-system/data/table-toolbar.tsx`), `CanonicalShell`/`CanonicalSection`/`CanonicalToolbar`/`CanonicalSplit` (`src/components/ui/canonical/page-layout.tsx`), `BuilderTopBar` (`src/components/admin/builder/builder-top-bar.tsx`), `StudioToolbar` (`src/components/tourism/studio/StudioToolbar.tsx`), `ModuleActionHeader` (`src/components/workspace/module-action-header.tsx`), `DiscoveryControlBar` (`src/components/commerce/discovery-control-bar.tsx`) e `<main>` de `admin-master.tsx` (`main-container-query min-w-0`).
- **REQ-3.2 (Abas e Faixas Inline em Rotas e Modais):** `THE SYSTEM SHALL` dotar todas as `<TabsList>` multi-abas e barras de filtros inline em `admin-master.*`, `workspace.*`, `_store.*`, editores de perfil, cozinha e contratos com `waesy-tab-strip max-w-full min-w-0` e toque minimo `h-11 min-h-11` no mobile.

### R4. Design Bidirecional (CMS / Preview / Vitrine / Workspace)
- **REQ-4.1 (Viewport Hook Efetivo):** `THE SYSTEM SHALL` substituir chamadas a `useWindowSizeClass()` por `useEffectiveViewport()` em todas as rotas de vitrine (`_store.*.tsx`) consumidoras de preview embutido ou vivo, garantindo que alternancias Mobile/Tablet/Desktop em `BuilderViewportProvider` reflitam fielmente a bifurcacao real das vitrines.

### R5. Invariantes de Lint, Seguranca e Qualidade
- Zero violacoes novas `DL-01`..`DL-33` (incluindo proibicao de classes com colchetes `-[...]`, `!important`, `overflow-x-*` nu sem classe semantica `.waesy-tab-strip`, e grade/espacamento fora de 4px).
- `npm.cmd run lint:design`, `node scripts/design-lint.mjs --ratchet`, `npm.cmd run audit:buttons`, `npm.cmd test`, `npm.cmd run typecheck` e `npm.cmd run build` com Exit Code 0 apos edicao final.

## 3. Arquivos Autorizados pelo Escopo
- `src/styles.css`
- `src/components/workspace/workspace-canonical-toolbar.tsx`
- `src/components/workspace/workspace-shell.tsx`
- `src/components/workspace/workspace-account-switcher.tsx`
- `src/components/chat/ai-chat-shell.tsx`
- `src/components/layout/toolbar.tsx`
- `src/design-system/data/table-toolbar.tsx`
- `src/components/ui/canonical/page-layout.tsx`
- `src/components/admin/builder/builder-top-bar.tsx`
- `src/components/tourism/studio/StudioToolbar.tsx`
- `src/components/workspace/module-action-header.tsx`
- `src/components/commerce/discovery-control-bar.tsx`
- `src/routes/admin-master.tsx` e rotas `admin-master.*` com tabs/toolbars sem scroll
- Rotas `workspace.*` e componentes de perfil/cozinha/contrato/studio com `<TabsList>` ou toolbars inline sem scroll/wrap
- Rotas `_store.*.tsx` migrando `useWindowSizeClass` para `useEffectiveViewport`
- Testes automatizados de regressao (`src/components/workspace/workspace-canonical-toolbar.test.tsx`) e `docs/design/DECISIONS.md`
