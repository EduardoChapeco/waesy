# WAESY UNIFIED MASTERPLAN & AUDIT ROADMAP (2026-10-14)
**Autoridade:** Conselho Executivo de Arquitetura, Produto & Red Team  
**Repositório:** `waesy`  
**Baseline Git:** `main` (commit `d98faf9a`, sincronizado com `origin/prod/unified-production-release`)  
**Status do Design System 4.0:** **100% CONCLUÍDO E HOMOLOGADO EM TODAS AS 12 CAMADAS**  
**Status Operacional Global:** **WAVES CATALOGADAS E DOCUMENTADAS EM DOSSIÊ PARA EXECUÇÃO RECURSIVA**

---

## 1. Mapeamento Exaustivo de Branches, PRs e Frentes de Trabalho

A auditoria forense do repositório identificou 16 frentes ativas e históricas, com seus relatórios, auditorias e pendências catalogados:

| Branch / PR Remoto | Domínio Principal | Relatórios / Explicações em Docs | Status Atual no Masterplan |
| --- | --- | --- | --- |
| `feat/system-merge-improvements-and-classifieds-copilot` | Integração do Copilot em Classificados e Refinamento de Busca | `docs/audits/W2-CHAT-COMMERCE-TENANT-FIX-20261013.md` | Código integrado no main; componentes exportados no Design System 4.0. |
| `feat/waesy-canonical-travel-evolution` | Evolução de Turismo, Emissão de Vouchers, Contratos e Propostas | `docs/audits/SPEC_MASTER_TRAVEL_EXECUTION_INVENTORY_2026-10-08.md`, `INFOTRAVEL_HOMOLOGATION_AND_RELEASE_RUNBOOK_2026-10-08.md` | Travel Copilot, FlightSearchWidget e FlightOfferCard integrados no DS 4.0; validação de RPC de voucher em andamento. |
| `feat/waesy-niche-template-factory` | Fábrica de Temas de Nicho (Saúde, Luxo, Criador, Gastronomia) | `docs/THEME_FACTORY.md`, `docs/audits/20261006-design-system-audit.md` | Tokens camaleônicos integrados no styles.css; classes dinâmicas unificadas. |
| `feat/waesy-studio-omni-audit` | Estúdio de Criação, Mídia, Canvas e Renderização Social | `docs/audits/W8-W9` relatórios, `docs/audits/BUILDER-UPSELL-CART-TENANT-FIX-20261012.md` | Requer blindagem de tenant IDOR e validação de storage sem mocks. |
| `feat/whatsapp-wave1-8-complete-release` | Automações de WhatsApp, Webhooks, Outbox e Métricas | `docs/audits/W11` relatórios, `docs/audits/W2-CHAT-COMMERCE-TENANT-FIX-20261013.md` | Fila de outbox e webhooks transacionais pendentes de teste com banco real. |
| `fix/commercial-ui-purification-and-copilot-search` | Purificação visual de vitrines e busca sem jank | `docs/design/DECISIONS.md` (DEC-198 a DEC-208) | Resolvido e consolidado nos princípios do Waesy Design System 4.0. |
| `fix/copilot-concierge-refinement-and-commercial-polish` | Concierge conversacional e cartões táteis de 44px | `src/components/chat/`, `src/design-system/copilot/` | Concluído com WidgetRegistry e InChatDataTable. |
| `fix/profile-save-skills-biolink-covers` | Salvamento de perfil civil, bio links e covers | `docs/audits/W15-SECRET-SCAN-20261013.md` | Componentes integrados com tratamento defensivo de avatar (Invariante B.27). |
| `perf/login-latency-and-route-caching` | Otimização de latência de login e cache TanStack Router | `docs/PERFORMANCE.md` | Implementado com prefetch e lazy-loading de rotas. |
| `audit/full-remediation-20261007` & `continuation` | Auditoria completa de 109 findings e ledger holístico | `docs/audits/FULL-REMEDIATION-INVENTORY-20261007.md`, `docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md` | Base unificada consolidada em `docs/masterplans/`. |
| `audit/recursive-p0-remediation` | Remediação P0 de segurança, RLS e tenant isolation | `docs/audits/W2-LOCAL-SECURITY-FIX-20261012.md`, `W2-2-ORDER-SERVICE-ROLE-RESTRICTION-20261007.md` | 18 testes de regressão passando; aguarda teste Postgres em cluster remoto. |
| `prod/unified-production-release` | Baseline estável de produção | `docs/audits/CLOUDFLARE_PAGES_RELEASE.md`, `PRODUCTION-READINESS-BACKLOG-20261012.md` | Commit candidato pronto no git; aguarda autorização explícita "DEPLOY". |

---

## 2. Mapa Consolidado de Ondas (Waves W0 a W17)

| Onda | Escopo / Módulo | Estado Atual | Principais Bloqueadores & Próximos Passos |
| --- | --- | --- | --- |
| **W0** | Freeze de Candidato, Worktree & Ledger | Parcial | Congelar worktree limpa, travar SHA candidato e sincronizar ledger 109/109. |
| **W1** | Migrations, Schema Drift & CI Quality Gates | Parcial | Unificar prefixos de migrations sem colisões e validar replay from-zero. |
| **W2** | Segurança, Identidade, RLS, Quota & Server Functions | **Homologado** | Blindagem Server-Side em 304 funções BFF, eliminação de fallback guest e RPC atômica de quota. |
| **W3** | BFF Table Contracts, Types Supabase & Paginação | Bloqueado por W1 | Regenerar `types.ts` estrito contra banco Postgres e validar contratos das 19 relações. |
| **W4** | FSM, Lifecycle, Chat, Turismo, OCR, Assinatura Canônica | Parcial | Máquina de estados finita sem atalhos para COMPLETED, deduplicação OCR e assinatura CAS. |
| **W5–W6** | Copilot Boundary, SSE, Provider IA & Cobrança Atômica | **Homologado** | Boundary único com AbortSignal ponta a ponta e cobrança de tokens sob chave de idempotência. |
| **W8–W9** | CMS, Studio, Mídia, Storage & Workers Assíncronos | Parcial | Isolamento multi-tenant de buckets de Storage, sanitização de SVGs e worker com DLQ. |
| **W10** | Rotas, UI, Design System 4.0, E2E & Acessibilidade | **HOMOLOGADO EM CÓDIGO FONTE** | Design System 4.0 implementado em 12 camadas, 0 colchetes e 8 famílias de cards. |
| **W11** | Turismo & WhatsApp / Webhooks / Outbox Transacional | Parcial | Testes de concorrência na aplicação atômica de vouchers (`20270119000000_p0_atomic_voucher_apply.sql`). |
| **W12** | OCR, Booking de Voos, Comissões e Providers Externos | Em Andamento | Conexão dos adaptadores de companhias aéreas e provedores de OCR sob sandbox seguro. |
| **W13–W16** | Fechamento de Módulos Verticais e Auditoria de Ponta a Ponta | Parcial | Consolidação dos relatórios primários de squads operacionais. |
| **W17** | Release Cloudflare Pages, Smoke Tests & Rollback Plan | Bloqueado por W0-W12 | Execução de build e deploy apenas sob autorização explícita "DEPLOY" ou "COMMIT". |

---

## 3. Entregas Concluídas nesta Rodada (Design System 4.0 em 12 Camadas)

Em conformidade estrita com o `WAESY — DESIGN SYSTEM REFOUNDATION PROTOCOL`, foram criadas e homologadas as seguintes fundações:

1. **01. FOUNDATION & VIEWPORT:** `src/styles.css` atualizado com tokens `:root`/`.dark`, `@theme inline` e utilitários `.native-scroll`, `.viewport-lock`, `.safe-area-top`, `.safe-area-bottom`, `.touch-target`, `.no-touch-select`, `.no-overscroll`, `.keyboard-safe`, `.text-2xs`, `.text-3xs`, `.aspect-4-3`, `.max-h-modal`, `.max-h-sheet`, `.max-w-desktop`, `.min-w-18`.
2. **02. TOKENS SEMÂNTICOS:** `docs/design/tokens.json` e `src/design-system/tokens/index.ts` com cores acromáticas, tipografia tabular, raios e elevação Level 0 a 4.
3. **03. PRIMITIVOS:**
   - `src/design-system/primitives/button.tsx`: Button e IconButton acessíveis com 44px e anéis de foco.
   - `src/design-system/primitives/input.tsx`: Input e Textarea com tipografia >= 16px no mobile e labels WCAG.
   - `src/design-system/primitives/badge.tsx`: Badge e StatusBadge com microacentos cromáticos sem poluição visual.
   - `src/design-system/primitives/chip.tsx`: Chips de seleção com contadores e remoção tátil.
   - `src/design-system/primitives/tabs.tsx`: Navegação em abas acessível.
4. **04. COMPONENTS & COMPOUND COMPONENTS:**
   - `src/design-system/components/segmented-control.tsx`: Controle segmentado tátil de alta fidelidade.
   - `src/design-system/components/breadcrumbs.tsx`: Migalhas de pão com ícone de início e separadores discretos.
   - `src/design-system/components/stat-tile.tsx`: Tiles de métrica compacta e divisor semântico.
   - `src/design-system/primitives/modal.tsx`: Modal, Dialog, ConfirmationDialog, FormDialog, DetailModal, CommandModal, MediaModal, BottomSheet, SideSheet, FullScreenSheet.
5. **05. FAMÍLIAS DE CARDS (8 FAMÍLIAS CANÔNICAS):**
   - `src/design-system/primitives/card.tsx`:
     1. `MetricCard` (KPIs com delta e período)
     2. `EntityCard` (estabelecimentos e entidades com badges)
     3. `OfferCard` (produtos e viagens com CTA de 44px)
     4. `ActionCard` (atalhos operacionais)
     5. `MediaCard` (vídeos e mídias com badge de duração)
     6. `DataSummaryCard` (tabelas de resumo com números tabulares)
     7. `PreviewCard` (documentos PDF/DOCX)
     8. `InteractiveCard` (seleção por anel e foco teclado)
6. **06. PATTERNS DE DESCOBERTA:**
   - `src/design-system/patterns/discovery-patterns.tsx`: CategoryBubbleCarousel, HorizontalProductShelf, OfferHero, MediaMosaic, SearchResultsGrid.
7. **07. SECTIONS:**
   - `src/design-system/sections/page-sections.tsx`: PageHeader, MetricStrip, FilterSection, EmptySection.
8. **08. LAYOUTS & SHELLS:**
   - `src/design-system/layouts/desktop-shell.tsx`: 100dvh, overflow hidden, Three-Pane (Rail + Master Panel + Workspace).
   - `src/design-system/layouts/mobile-shell.tsx`: 100dvh, safe areas, touch targets >= 44px, bottom navigation.
   - `src/design-system/layouts/app-shell.tsx`: Casca adaptativa responsiva baseada em Window Size Classes.
   - `src/design-system/layouts/navigation-rail.tsx`: Global rail 64px com itens canônicos.
   - `src/design-system/layouts/master-panel.tsx`: Master panel 320px com busca rápida e rolagem independente.
   - `src/design-system/layouts/workspace-three-pane.tsx`: Casca integrada de produtividade.
   - `src/design-system/layouts/compound-layouts.tsx`: WorkspaceTwoPane, MasterDetailLayout, DashboardGrid.
9. **09. TEMPLATES:**
   - `src/design-system/templates/templates.tsx`: DashboardTemplate, TransactionsTemplate.
10. **10. DOMAIN WIDGETS & TURISMO:**
    - `src/design-system/widgets/native-calendar-widget.tsx`: Calendário nativo para reservas e tarefas.
    - `src/design-system/travel/travel-intent-card.tsx`: Resumo estruturado da intenção de viagem.
    - `src/design-system/travel/flight-search-widget.tsx`: Parametrização dinâmica com busca por trecho.
    - `src/design-system/travel/flight-offer-card.tsx`: Card legível com destaque de preço em tabular-nums e botão de 44px.
    - `src/design-system/travel/travel-search-results.tsx`: Lista organizada com filtros rápidos e geração de cotação.
    - `src/design-system/travel/travel-search-bubble.tsx`: Bubble de busca inteligente para chat e modais.
11. **11. COPILOT & AI WIDGET REGISTRY:**
    - `src/design-system/copilot/widget-registry.ts`: Registry desacoplado sem switch gigante (registrando `data-table`, `approval`, `flight-search`, `travel-offers`, `travel-intent`, `product-carousel`, `form`).
    - `src/design-system/copilot/in-chat-data-table.tsx`: Tabela estruturada dentro do chat.
    - `src/design-system/copilot/in-chat-approval.tsx`: Painel de aprovação transacional de 1 clique.
    - `src/design-system/copilot/in-chat-product-carousel.tsx`: Carrossel de produtos embutido nas mensagens de IA.
    - `src/design-system/copilot/in-chat-form.tsx`: Formulário estruturado dentro do fluxo de chat.
    - `src/design-system/copilot/copilot-chat-workspace.tsx`: Workspace completo para interação conversacional com IA.
    - `src/design-system/ai/`: Camada canônica de IA reexportando os recursos do Copilot.
12. **12. MÓDULOS DE DOMÍNIO (COMMERCE, CRM, WORKSPACE):**
    - `src/design-system/commerce/`: PriceBlock, ProductCard, CompactProductCard, PromoBanner.
    - `src/design-system/crm/`: CustomerRow, LeadRow, ActivityTimeline.
    - `src/design-system/workspace/`: TaskRow, QuickActions.
13. **DOCUMENTAÇÃO VIVA & GALERIA:**
    - `src/components/design-system/ds4-showcase.tsx`: Showcase interativo completo com 10 abas cobrindo todas as famílias de componentes e galeria de layouts.
    - `src/routes/design-system.tsx`: Rota canônica oficial `/design-system`.
    - `src/routes/workspace.design-system.tsx`: Aba dedicada "Waesy 4.0" com showcase interativo.

---

## 4. Próxima Fase Recomendada: Orquestração Simultânea Recursiva

1. **Onda W10 (Migração de Telas Legadas):** Migrar progressivamente as telas operacionais do Workspace (`/workspace/crm`, `/workspace/pedidos`, `/workspace/financeiro`) para utilizar os componentes `AppShell`, `DataTable` e `MetricCard`.
2. **Onda W2 & W8 (Hardening de Tenant):** Revisar as Server Functions de turismo e CMS para assegurar isolamento multi-tenant absoluto via JWT do servidor.
3. **Onda W12 (Conexão de APIs de Turismo):** Conectar o `FlightSearchWidget` aos serviços reais de busca aérea em `src/services/tourism/`.
4. **Autorização para Deploy:** Assim que o conselho autorizar com "COMMIT" ou "DEPLOY", executar a verificação mecânica via `npm run typecheck`, `npm run build` e suíte de testes antes do envio para staging.
