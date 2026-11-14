# Waesy Evidence Ledger — Refatoração Global E2E (/goal 2026-11-14)

- **Branch:** `release/prod-20261113-fullpage-chat-copilot`
- **SHA Inicial Verificado:** `a2b90ae9`
- **Supabase Remoto:** `jfuebqmltksyznovhlwa` (612 migrations locais, 833 tabelas declaradas, 675 BFF-referenced, 0 não declaradas em `check:bff`)
- **Cloudflare Pages:** `usewaesy` (`0717ebf5` live)
- **Worktree Paralelo Protegido (NÃO MODIFICAR / NÃO REVERTER):**
  - `src/components/chat/artifacts/ArtifactBuilderEditor.tsx`
  - `src/components/chat/artifacts/ArtifactInteractiveMap.tsx`
  - `src/components/chat/chat-artifact-card.tsx`
  - `src/components/chat/copilot-message-renderer.tsx`
  - `src/components/chat/waesy-copilot-drawer.tsx`
  - `src/services/ai-conversations.functions.ts`
  - `src/services/crm.functions.ts`
  - `src/lib/copilot-action-dispatcher.ts`
  - `src/lib/tourism/proposal-editorial-mapper.*`
  - Arquivos C.22 já presentes no working tree em 08:27 (`DESIGN.md`, `styles.css`, `card.tsx`, `__root.tsx`, `cms.functions.ts`, etc.) — preservar e complementar sem sobrescrever.

---

## Microfase M1 — Tokens V4.1, Tipografia Inter, Primitivos & Shell/Header Silencioso

### Preflight & Escopo Declarado
- `docs/design/tokens.json` (`squircleCard` schema fix: chave `""` -> `"$value"`)
- `src/styles.css` (tornar `.waesy-proposal-editor-pane` responsiva `width: 100%` no mobile e `460px` apenas `>= 840px`)
- `src/components/ui/input.tsx` (corrigir `bg-input` -> `bg-background` para contrastar com `border-input` e manter paridade com `Textarea` e `tokens.json`)
- `src/components/forms/schema-form-renderer.tsx` (corrigir `bg-input` em `<select>` -> `bg-background`)
- `src/components/design-system/ds4-showcase.tsx` (eliminar handlers vazios `onClick={() => {}}` detectados pelo scan)
- `src/components/shell/top-bar.tsx` (trocar `font-black` -> `font-semibold`, remover badge ornamental `BETA` e `BetaExplanationModal` do header global)
- `src/components/shell/utility-cluster.tsx` (remover import morto `ThemeToggle`, trocar `font-black` -> `font-semibold`)
- `src/components/shell/SuperAppModuleDrawer.tsx` & `src/design-system/vitrine/vitrine-lateral-sheet.tsx` (desativar alternador visual supérfluo `showViewModeToggle` por padrão no drawer móvel e tratar erro de `listDrawerModules` sem esconder falha silenciosa)
- `src/routes/admin-master.portal-completo.tsx` (remover badge `BETA MANAGEMENT`)
- Testes de regressão M1 (`tokens.json` DTCG validado via `check:tokens` + vitest de contrato para `Input`, `TopBar`, `UtilityCluster` e `styles.css`)

### Registro de Provas M1
- Baseline pré-edit verificada em 2026-11-14T08:25-03:00: `token-sync.mjs --check` passou em 167 tokens (mas omitiu 5 chaves inválidas `""` em `component.squircleCard`); `contrast-audit.mjs` aprovado; `native-mobile-header.adversarial.test.tsx` (17/17) e `location-master-pill.test.ts` (3/3) verdes; `design-lint.test.mjs` (51/51) e `audit-interactive-buttons.test.mjs` (19/19) verdes.
- Verificado pós-edit M0+M1: `token-sync.mjs --check` (173 tokens, Exit 0), `contrast-audit.mjs` (Exit 0), `npm.cmd run lint:design:test` (51/51, Exit 0), `m1-tokens-and-shell-contract.test.tsx` + suítes de tipografia/tema (27/27 verdes).

---

## Microfase M2 — Desbloqueio das 9 Rotas-Pai sem `<Outlet />` (13 Rotas-Filhas)

### Escopo Alterado
- `src/routes/admin-master.seguranca.certificados.tsx` (`TransactionCertificatesRouteSwitch` -> `<Outlet />` com `useChildMatches()`, desbloqueia `.$id.tsx`)
- `src/routes/workspace.catalogo.colecoes.tsx` (convertida para layout puro `<Outlet />`, desbloqueando `.index.tsx`, `.novo.tsx`, `.$id.tsx` sem query duplicada)
- `src/routes/workspace.eventos.$id.tsx` (`EventoIdRouteSwitch` -> `<Outlet />`, desbloqueia `.checkin.tsx`, `.subpaineis.tsx`)
- `src/routes/workspace.marketing.anuncios.tsx` (`AnunciosRouteSwitch` -> `<Outlet />`, desbloqueia `.novo.tsx`)
- `src/routes/workspace.relatorios.tsx` (`RelatoriosRouteSwitch` -> `<Outlet />`, desbloqueia `.gastronomia.tsx`, `.metas.tsx`)
- `src/routes/workspace.turismo.grupos.$id.tsx` (`GrupoTourIdRouteSwitch` -> `<Outlet />`, desbloqueia `.embarque.tsx`)
- `src/routes/_store.conta.lojas.tsx` (`ContaLojasRouteSwitch` -> `<Outlet />`, desbloqueia `.nova.tsx`, e corrige crash `TypeError` em `stores.length` quando `stores === null` com `<ErrorState />` + retry real)
- `src/routes/_store.criar-negocio.tsx` (`CriarNegocioRouteSwitch` -> `<Outlet />`, desbloqueia `.avancado.tsx`)
- `src/routes/_store.loja.$slug.tsx` (`StoreSlugRouteSwitch` -> `<Outlet />`, desbloqueia `.senha.tsx` antes de guards/redirects do perfil)
- `src/routes/__tests__/m2-parent-outlet-unblock.test.tsx` & `src/routes/__tests__/m2-outlet-routing-contract.test.ts`

### Registro de Provas M2 (2026-11-14T10:12-03:00)
- Scan estrutural completo em `src/routeTree.gen.ts` (`_addFileChildren`): `Parents missing <Outlet>: 0 []` (Exit 0).
- Vitest M2: `npx.cmd vitest run src/routes/__tests__/m2-outlet-routing-contract.test.ts src/routes/__tests__/m2-parent-outlet-unblock.test.tsx` -> **2 files passed (2), 15 tests passed (15)** em 14.18s (`m2-outlet-routing-contract.test.ts` 3/3 + `m2-parent-outlet-unblock.test.tsx` 12/12 cobrindo as 9 rotas pai, invariante de `routeTree.gen.ts`, `<ErrorState>` em `_store.conta.lojas` com `stores === null` e empty state real).
- Design Lint: `node scripts/design-lint.mjs --changed` confirmou **0 violações** em todos os 9 arquivos alterados na M2 em `docs/design/LINT_DASHBOARD.md`.

---

## Backlog Sequenciado (M3 -> M7)
- **M3 (CONCLUÍDO & VERIFICADO):** Autenticação, remoção de `MASTER_EMAILS` hardcoded e flags mutáveis de `user_metadata` no cliente (`_store.entrar.tsx`, `workspace.tsx`, `admin-master.tsx`) e no handler `signInWithPassword` (`auth.functions.ts` delegando a `isBootstrapPlatformAdminEmail` em `identity.server.ts`), OAuth `waesy.pages.dev` -> origem canônica (`resolveCanonicalOAuthOrigin` em `return-path.ts` + `WAESY_CANONICAL_ORIGIN = "https://waesy.com.br"`), PWA `beforeinstallprompt` + `appinstalled` real em `_store.entrar.tsx`, alerta acessível `role="alert"` para `search.error` do callback OAuth, normalização anti-open-redirect (`normalizeInternalReturnPath`), touch targets `>= 44px` e tipografia/geometria C.22 (`font-semibold`, `rounded-xl`/`rounded-2xl`, grade `4px`, zero `font-black`).
  - **Evidência M3:**
    - Vitest: `npx.cmd vitest run src/routes/__tests__/m3-auth-contract.test.tsx src/routes/__tests__/painel-auth-flow.test.ts src/lib/__tests__/auth-cookie-sanitizer.test.ts` -> **3 files passed (3), 24 tests passed (24)** em 13.07s (`painel-auth-flow.test.ts` 8/8, `auth-cookie-sanitizer.test.ts` 11/11, `m3-auth-contract.test.tsx` 5/5 incluindo bloqueio de escalação via `user_metadata`, bloqueio de open-redirect `//evil.com`, rejeição de `waesy.pages.dev`, renderização SSR de `search.error` e ocultação de PWA sem `beforeinstallprompt`).
    - Design Lint: `node scripts/design-lint.mjs --changed` -> **0 violações** em `routes/store` (`_store.entrar.tsx`), `lib`, e zero regressão em `admin-master.tsx`.
- **M4 (CONCLUÍDO & VERIFICADO):** Onboarding (`workspace.onboarding.index.tsx`, `magic-onboarding-card.tsx`, `fast-company-onboarding.tsx`, `_store.criar-negocio.tsx`, `_store.criar-negocio.avancado.tsx`, validados contra `onboarding.functions.ts` e `company-mvp.functions.ts`). Elimina estado falso de `0% concluído` substituindo catch silencioso do loader por `loadError` + `<ErrorState onRetry>`, diferencia etapas `technical_error` de `Pendente` no checklist, remove `font-black`/`font-extrabold`, `border-black/10` e badges/jargões AI-smell (`1-Clique`, `Cortex 360 + IBGE`), padroniza squircles (`rounded-xl`/`rounded-2xl`) e alvos táteis `>= 44px` (`min-h-11`), mantendo rollback atômico `organizations` -> `stores` -> `workspace_members`.
  - **Evidência M4:**
    - Vitest: `npx.cmd vitest run src/routes/__tests__/m4-onboarding-contract.test.tsx` -> **1 file passed (1), 4 tests passed (4)** em 4.38s (erro DB -> `<ErrorState>`, all-`technical_error` -> `loadError`, parcial `technical_error` -> badge `Erro`, e checagem estrutural C.22/rollback).
- **M5 (CONCLUÍDO & VERIFICADO):** Configurações de Loja (`workspace.configuracoes.index.tsx` + `src/services/store.functions.ts`). Elimina silenciamento em `loader` (`.catch(() => null)`/`.catch(() => [])`) com propagação de `loadError` + `<ErrorState onRetry>`, extrai `WorkspaceConfiguracoesContent` protegendo Rules of Hooks e impedindo formulário vazio em erro DB, remove `.catch(() => null)` de `savePolicies` e `saveWorkingHours` em `handleSaveAll`, remove `<ThemeSelector />` legado e aplica `C.22` (`rounded-xl`/`rounded-2xl`, `font-semibold`, `h-11 min-h-11`, `flex-wrap` no cabeçalho). Em `store.functions.ts`, protege `_saveStoreSettings` abortando se `stores.select("settings")` falhar (evitando wipe de JSONB), alinha `enabled_modules` à trava `canMutateNicheAndModules` e propaga erros SQL em `getWorkingHours`.
  - **Evidência M5:**
    - Vitest: `npx.cmd vitest run src/routes/__tests__/m5-settings-contract.test.tsx src/services/__tests__/m5-store-settings-bff.test.ts` -> **2 files passed (2), 5 tests passed (5)** em 7.07s (`m5-settings-contract.test.tsx` 3/3 + `m5-store-settings-bff.test.ts` 2/2 validando guarda pré-update contra wipe de JSONB e bloqueio de mutação de `enabled_modules` por proprietário).
- **M6 (CONCLUÍDO & VERIFICADO):** Catálogo (`workspace.catalogo.colecoes.index.tsx`, `workspace.catalogo.colecoes.novo.tsx`, `workspace.catalogo.colecoes.$id.tsx`, `workspace.catalogo.produtos.index.tsx`, `workspace.catalogo.produtos.novo.tsx`, `workspace.catalogo.produtos.$id.tsx`, `admin-catalog.functions.ts`) & Checkout (`_store.checkout.tsx`, `checkout.functions.ts`):
  - **Provas Automatizadas:** `npx vitest run src/routes/__tests__/m6-catalog-checkout-contract.test.tsx src/services/__tests__/m6-checkout-catalog-bff.test.ts` -> **2 files passed (2), 7 tests passed (7)** em `9.34s`.
- **M7 (CONCLUÍDO & VERIFICADO):** CMS (`admin-master.home-editor.tsx`, `workspace.cms.paginas.index.tsx`, `workspace.cms.avaliacoes.tsx`, `workspace.cms.bio.tsx`, `workspace.cms.calendario.tsx`, `workspace.cms.navegacao.tsx`, `workspace.cms.stories.tsx`):
  - **Provas Automatizadas:** `npx vitest run src/routes/__tests__/m7-cms-contract.test.tsx` -> **1 file passed (1), 4 tests passed (4)** em `7.22s`.
- **M8 (CONCLUÍDO & VERIFICADO):** Ecossistema Omnichannel / CRM / Tags / E-mail / Suporte & Viagens (`workspace.atendimento.index.tsx`, `workspace.atendimento.chat.tsx`, `workspace.crm.tsx`, `workspace.tarefas.tsx`, `workspace.suporte.tsx`, `workspace.turismo.viagens.index.tsx`, `workspace.configuracoes.integracoes.tsx`, `customer-360-sidebar.tsx`, `CustomerSuccessOnboardingSheet.tsx`):
  - **Provas Automatizadas:** `npx vitest run src/routes/__tests__/m8-omnichannel-crm-email-support-contract.test.tsx` -> **1 file passed (1), 5 tests passed (5)** em `200ms`.
  - **Gates Globais:** `check:tokens` (173 tokens, 0 ausentes), `contrast-audit.mjs` (`DL-16/17` 100% aprovado), `lint:design:test` (57/57 pass), `design-lint.mjs --ratchet` (`P0: 0`, `-650` violações), `check:bff` (681 tabelas, 0 órfãs), `check:schema` (616 migrations, 825 tabelas, OK).
