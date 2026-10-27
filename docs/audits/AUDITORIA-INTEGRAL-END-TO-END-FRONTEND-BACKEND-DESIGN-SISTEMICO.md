# AUDITORIA INTEGRAL END-TO-END: FRONTEND, BACKEND E DESIGN SYSTEM BIDIRECIONAL

## 1. Censo Geral do Repositório Waesy
- **Rotas Totais:** 435 rotas ativas registradas no TanStack Router.
  - Vitrines Públicas (`_store.*`): 155 rotas.
  - Workspace Operacional (`workspace.*`): 188 rotas.
  - Admin Master Governança (`admin-master.*`): 39 rotas.
  - Conta Cidadão / Civil (`_store.conta.*`): 43 rotas.
  - Carteira Viajante (`viajante.*`): 3 rotas.
  - Workers e Webhooks (`api.*`): 25 rotas.
- **Componentes de Interface:** 813 componentes divididos em 62 módulos de UI.
- **Tabelas do Banco de Dados:** 735 tabelas declaradas em 538 migrations Postgres versionadas.
- **Contratos BFF:** 583 tabelas referenciadas por Server Functions com 0 ausências (`check-bff-table-contracts.mjs`).
- **Débito Visual Congelado:** 9.626 violações (1.061 P0, 6.617 P1, 901 P2, 1.047 P3).

## 2. Diagnóstico de Bidirecionalidade (Mobile First vs. Desktop Native)
1. **Viewport Compact (< 600px):**
   - 1.686 alvos de toque com dimensão menor que 44px (`h-7`, `h-8`, `h-9` sem piso `min-h-11`).
   - Necessidade de padronização de safe-area defensiva (`pt-safe-modal`, `pb-safe`) e `z-30` em barras sticky para evitar colisão com modais `z-50`.
2. **Viewport Expanded (>= 840px):**
   - Grids Bento widescreen com empacotamento denso automático (`grid-flow-dense`).
   - Sidebars persistentes com recolhimento ergonômico.

## 3. Top 20 Arquivos com Maior Densidade de Débito Visual
1. `src/components/profile/biolink-themes-selector.tsx` (74 violações)
2. `src/routes/_store.destaques.$slug.tsx` (67 violações)
3. `src/routes/_store.conta.classificados.novo.tsx` (64 violações)
4. `src/routes/admin-master.ads-network.tsx` (62 violações)
5. `src/components/studio/motion/motion-viewport.tsx` (62 violações)
6. `src/components/mining/mining-dashboard.tsx` (61 violações)
7. `src/components/profile/ProfileInPageEditor.tsx` (61 violações)
8. `src/components/tourism/studio/studio-sidebar-editor.tsx` (61 violações)
9. `src/routes/workspace.pdv.index.tsx` (59 violações)
10. `src/routes/workspace.pedidos.gestor.tsx` (58 violações)
11. `src/components/ui/sidebar.tsx` (58 violações)
12. `src/components/onboarding/fast-company-onboarding.tsx` (53 violações)
13. `src/routes/_store.explorar.tsx` (52 violações)
14. `src/components/commerce/flyers/flyer-interactive-viewer-modal.tsx` (52 violações)
15. `src/components/stories/advanced-story-viewer.tsx` (52 violações)
16. `src/components/profile/experience-media-carousel.tsx` (50 violações)
17. `src/components/shell/admin-contextual-bar.tsx` (50 violações)
18. `src/components/tourism/proposals/templates/TemplateLandscape.tsx` (50 violações)
19. `src/components/classifieds/convenience-showcase-view.tsx` (49 violações)
20. `src/routes/workspace.turismo.hoteis.tsx` (48 violações)

## 4. Análise de Concorrências de Pastas e Módulos
- `src/components/eventos` (19 arquivos de retaguarda Workspace) vs. `src/components/events` (4 arquivos de vitrine pública).
  - *Ação:* Consolidar sob `src/components/events/` com separação `workspace/` e `public/`.
- `src/components/crm` (3 arquivos) vs. `src/components/workspace/crm` (2 arquivos).
  - *Ação:* Unificar integralmente sob `src/components/workspace/crm/`.

## 5. Cronograma de Refatoração em 5 Ondas
- **Onda 1:** Eliminação de alvos de toque < 44px (DL-14) e foco teclado (DL-15) nos Top 20 arquivos.
- **Onda 2:** Erradicação de colchetes arbitrários (DL-02) e cores literais fora de token (DL-01, DL-18).
- **Onda 3:** Ajuste da grade modular estrita de 4px (DL-03) e transições pontuais (DL-27).
- **Onda 4:** Consolidação física e lógica de módulos concorrentes (`eventos` e `crm`).
- **Onda 5:** Redução progressiva da baseline de CI (`node scripts/design-lint.mjs --ratchet`).
