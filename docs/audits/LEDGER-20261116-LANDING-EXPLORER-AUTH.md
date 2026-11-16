# Ledger de Evidencias — Onda Landing, /explorer, Supressao de AppShell & Auth Split Desktop/Mobile (2026-11-16)

## 1. Snapshot e Escopo

- **Data/hora (ISO, fuso):** `2026-11-16T01:52:10-03:00`
- **Repositorio:** `EduardoChapeco/waesy`
- **Branch/HEAD:** `release/prod-20261113-fullpage-chat-copilot` / `67125cb3` (worktree com ondas integradas: Copilot Manus Evolution, Seguranca/Governanca Master/Subsistemas e Landing/Explorer/Auth Split)
- **Specs:** `docs/specs/SPEC-20261116-LANDING-EXPLORER-AUTH-SPLIT.md` (`DEC-507`), `docs/specs/SPEC-20261115-ECOSYSTEM-SECURITY-MODULAR-VERTICALS.md` (`DEC-506`)

## 2. Achados Resolvidos Nesta Onda Final

- **Preservacao de Vitrine Comunitaria (`/explorer` & `/home`):** Extraidos `src/lib/community-home-loader.ts`, `src/lib/community-home-items.ts` e `src/components/home/CommunityMarketplaceExperience.tsx` compartilhados por `src/routes/_store.explorer.tsx` e `src/routes/_store.index.tsx` (`?vitrine=1`), redirecionando `src/routes/home.tsx` para `/explorer` e adicionando atalho `"explorer"` em `src/lib/vertical-subsystems.ts`, `ContextSidebar`, `MobileNav` e `GlobalMenuHub`.
- **Supressao do AppShell em Landings Publicas:** Criado `src/components/shell/public-landing-header.tsx` e predicado `isEditorialMarketingRoute()` em `src/lib/navigation-registry.ts`, suprimindo `TopBar`, `ContextSidebar`, `MobileNav`, `ActiveContextBanner` e `WaesyCopilotDrawer` em landings publicas/institucionais via `src/components/shell/app-shell.tsx`. Consolidada aba `Waesy Pro` para `/portal-completo`.
- **Auth Split Desktop + Mobile Nativo Passo a Passo:** Criados `src/components/auth/auth-split-shell.tsx` e `src/components/auth/auth-step-progress.tsx` e aplicados as rotas `/entrar`, `/cadastro`, `/painel`, `/recuperar-senha` e `/redefinir-senha` com formulario a esquerda + imagem a direita no desktop (`lg:`), fluxo passo a passo anti-jank no mobile (`< 1024px`) e preview sincronizado em `src/routes/admin-master.marca.tsx`.
- **Correcao SSR e Design Lint Final:** Refatorado `src/components/shell/waesy-hub-launcher.tsx` para estado React autonomo sem `useQuery()` (eliminando erro `No QueryClient set` em SSR estatico de `TopBar`) e saneadas as 5 ultimas ocorrencias de Design Lint (`DL-29` x3 em `auth-step-progress.tsx`, `DL-19` em `CommunityMarketplaceExperience.tsx`, `DL-12` em `_store.index.tsx`).

## 3. Evidencias Observadas Pos-Ultima Edicao de Codigo

| Gate / Suite | Escopo Executado | Resultado | Observacao |
|---|---|---|---|
| `npm.cmd run lint:design` | 2331 arquivos + contraste WCAG (`DL-16/17`) | **PASS** | `P0: 0`, `P1: 0`, `P2: 0`, `P3: 0`, `Total: 0` (`DL-16/17` aprovados) |
| `npm.cmd run build` | `vite build` + leak check + `wrap-worker` | **PASS** | Exit `0` |
| `npm.cmd run check:route-budget` | Chunks de rota e `_worker.js` | **PASS** | `_worker.js = 24.75 MB <= 25.00 MB` |
| `npm.cmd run typecheck` | `tsc --noEmit` completo | **PASS** | Exit `0` (`0` erros) |
| `check:schema` / `check:bff` / `check:migration-inventory` | 627 migrations, 826/840 tabelas, 682 refs | **PASS** | `0` tabelas nao declaradas; SHA256 `02d33af6...` |
| `check:tokens` / `check:types-ssot` / `check:cycles` / `check:naming` | 173 tokens, 2875 arquivos | **PASS** | `0` quebras/duplicacoes/ciclos/violacoes |
| `audit:buttons` / `audit:secrets` | 1374 arquivos UI (9610 controles) / 6615 tracked | **PASS** | `P0/P1/P2: 0` botoes; `SECRET_SCAN_PASS` |
| Vitest (`task-1385` + `task-1391`) | 23 arquivos de teste (Landing/Auth/Shell/Route/Governance/Copilot) | **PASS** | `23 passed` (`176 tests passed`, `0 failed`, `0 skipped`) |
| `npx.cmd eslint` (3 arquivos finais editados) | `auth-step-progress.tsx`, `CommunityMarketplaceExperience.tsx`, `_store.index.tsx` | **PASS** | `0` errors (`21` warnings preexistentes) |

## 4. Pendencias Operacionais Externas (Acao do Operador)

- Aplicacao remota das migrations locais `20270520000000_copilot_manus_realtime_and_crons.sql` e `20270521000000_governance_rls_user_plans_and_subsystems.sql` no projeto Supabase `jfuebqmltksyznovhlwa` (nao executada automaticamente conforme protocolo B.31).
- Publicacao de build no Cloudflare Pages e configuracao dos registros CNAME/Custom Domains (`pro`, `explorer`, `marketplace`, `classificados`, `noticias`, `go`, `talk`, `places`, `copilot`, `admin` em `.waesy.com.br`) no painel GoDaddy + Cloudflare conforme guia exibido em `/admin-master/subsistemas`.
