# SPEC-20261116-LANDING-EXPLORER-AUTH-SPLIT — Preservação da Home Anterior (`/explorer`), Eliminação de Shell em Páginas Públicas/Landing, Unificação Waesy Pro e Autenticação Split / Mobile Nativo Passo a Passo

- **Status:** APROVADA PARA EXECUÇÃO
- **Data:** `2026-11-16`
- **Escopo:** Rotas públicas, landing pages, hub explorer e ecossistema completo de autenticação.

## 1. Requisitos em Sintaxe EARS

1. **UBIQUITOUS — Preservação Integral da Vitrine Anterior em `/explorer` e `/home`:**
   - The system SHALL extract the shared city community vitrine experience (`HomeMobileNativeApp`, `HomeDesktopWebApp`, `OmniPageRenderer`, loader data and unified discovery items) into reusable canonical modules ([src/lib/community-home-loader.ts](src/lib/community-home-loader.ts) and [src/components/home/CommunityMarketplaceExperience.tsx](src/components/home/CommunityMarketplaceExperience.tsx)) without duplicating logic or losing any sections, rails, banners, hotpages or city filters.
   - WHEN a visitor accesses `/explorer` (`_store.explorer.tsx`) or `/home` (`home.tsx`), the system SHALL render or permanently redirect to the complete community marketplace experience formerly hosted at `waesy.com.br/` within the standard discovery shell.
2. **STATE-DRIVEN — Raiz `waesy.com.br/` & Eliminação de Duplicação Waesy Pro:**
   - WHILE `root_experience_mode = "landing_vendas"` and `?vitrine=1` is absent, `waesy.com.br/` SHALL render `WaesySalesLanding` + `WaesySalesTabs` (with tabs `Waesy Pro`, `Subsistemas Verticais`, `Módulos e Planos`, `Waesy Marketplace` + explicit shortcuts to `/explorer` and Hub Waesy) cleanly connected to `/portal-completo` and `/painel` with zero redundant landing shells.
   - WHILE `root_experience_mode = "marketplace_local"` or `?vitrine=1` is active, `/` SHALL render `CommunityMarketplaceExperience` directly.
3. **EVENT-DRIVEN — Supressão Completa do App Shell em Landing Pages e Páginas Públicas Institucionais:**
   - WHEN the user visits `/` (in `landing_vendas` mode), `/portal-completo`, `/cadastroantecipado`, `/sobre`, `/about`, `/contato`, `/contact`, `/faq`, `/developers`, `/docs`, `/privacidade`, `/privacy`, `/termos`, or `/politicas/*`, [AppShell](src/components/shell/app-shell.tsx) SHALL suppress `TopBar` (marketplace search/cart), `ContextSidebar`, `MobileNav`, `ActiveContextBanner` and `WaesyCopilotDrawer`, rendering instead a clean editorial wrapper (`PublicLandingHeader` for marketing/institutional pages that do not already render their own header, and standalone zero-chrome for `/entrar`, `/cadastro`, `/painel`, `/recuperar-senha`, `/redefinir-senha`, `/cadastroantecipado`).
4. **UBIQUITOUS — Autenticação Split Canônica (Login Esquerda / Imagem Direita) & Mobile Nativo Passo a Passo Anti-Jank:**
   - WHEN any authentication route (`/entrar`, `/cadastro`, `/painel`, `/recuperar-senha`, `/redefinir-senha`) renders on Desktop (`>= 1024px`), [AuthSplitExperienceShell](src/components/auth/auth-split-shell.tsx) SHALL render the authentication form cleanly on the **LEFT** column and the brand image configured in Admin Master (`login_split_image_url` / `login_bg_desktop_url`, or an honest modular architectural visual when no photo is configured) on the **RIGHT** column (`lg:grid-cols-2`), keeping 100% WCAG AA contrast and `Design System 4.0` compliance.
   - WHEN any authentication route renders on Mobile (`< 1024px`), [AuthSplitExperienceShell](src/components/auth/auth-split-shell.tsx) SHALL render a native, full-viewport (`min-h-dvh pt-safe pb-safe`), single-header step-by-step experience with a fixed slim linear step progress bar, anti-zoom inputs (`text-base` / `h-12 min-h-12`), zero floating background blur card, and thumb-reachable CTAs (`h-12 min-h-12`) to prevent layout jump (jank).
   - WHEN viewing `/admin-master/marca`, the live preview for Login (`loginBreakpoint === "desktop" | "tablet" | "mobile"`) SHALL accurately reflect the split Left-Form / Right-Image layout on Desktop and native step-by-step flow on Mobile.

## 2. Contrato de Arquivos Autorizados

- **Novos Arquivos:**
  - `src/lib/community-home-loader.ts` (tipos, loader de dados e construtor de itens unificados <= 220 linhas)
  - `src/components/home/CommunityMarketplaceExperience.tsx` (<= 220 linhas)
  - `src/routes/_store.explorer.tsx` (<= 100 linhas)
  - `src/components/shell/public-landing-header.tsx` (<= 140 linhas)
  - `src/components/auth/auth-split-shell.tsx` (<= 210 linhas)
  - `src/components/auth/auth-step-progress.tsx` (<= 80 linhas)
  - `src/routes/__tests__/landing-explorer-auth-split.test.tsx`
- **Arquivos Editados Cirurgicamente:**
  - `src/lib/navigation-registry.ts`, `src/lib/vertical-subsystems.ts`, `src/server.ts`, `src/components/shell/app-shell.tsx`, `src/components/shell/context-sidebar.tsx`, `src/components/shell/mobile-nav.tsx`, `src/components/shell/global-menu-hub.tsx`
  - `src/components/landing/waesy-sales-landing.tsx`, `src/components/landing/waesy-sales-tabs.tsx`
  - `src/routes/_store.tsx`, `src/routes/_store.index.tsx`, `src/routes/home.tsx`, `src/routes/_store.portal-completo.tsx`
  - `src/routes/_store.entrar.tsx`, `src/routes/_store.cadastro.tsx`, `src/routes/painel.tsx`, `src/routes/_store.recuperar-senha.tsx`, `src/routes/_store.redefinir-senha.tsx`, `src/routes/admin-master.marca.tsx`
  - `tests/e2e/routes/route-inventory.test.ts`

## 3. Critérios de Aceite e Evidência

1. Zero regressão nos testes existentes (`m1-tokens-and-shell-contract.test.tsx`, `m3-auth-contract.test.tsx`, `painel-auth-flow.test.ts`, `store-route-loaders.test.ts`, `security-vertical-governance.test.ts`, `route-inventory.test.ts`).
2. `npm.cmd run lint:design` com `P0: 0` e `P1: 0`, `npm.cmd run typecheck` Exit Code 0, `npm.cmd run build` + `check:route-budget` (`_worker.js <= 25.00 MiB`) Exit Code 0.
3. Novos componentes `<= 250` linhas e nova rota `_store.explorer.tsx <= 300` linhas.
