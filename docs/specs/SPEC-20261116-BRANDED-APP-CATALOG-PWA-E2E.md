# SPEC-20261116-BRANDED-APP-CATALOG-PWA-E2E

**Status:** Aprovada para Execução End-to-End  
**Data (ISO):** 2026-11-16  
**Módulos:** Branded App & Catálogo Padronizado (`/app/$slug`), Perfil Marketplace (`/loja/$slug`), Editor App/PWA (`/workspace/configuracoes/pwa`), Onboarding (`_store.criar-negocio`), Templates Turismo/Delivery/Eventos, Service Worker & Manifest SSOT, Supabase Realtime  
**Pré-requisitos Normativos:** `AGENTS.md` (B.1–B.51), `docs/design/DESIGN.md`, `docs/design/DESIGN-LINT.md`

---

## 1. Diagnóstico Forense Consolidado

| Superfície / Camada | Lacuna ou Conflito Identificado | Correção Estrutural Alvo |
| :--- | :--- | :--- |
| **App da Empresa vs. Perfil Marketplace** | `_store.loja.$slug.tsx` mistura Perfil Marketplace (`CanonicalStoreProfileView`), `omniPageDoc` (L1314) e `store_page_sections` (L1345) dentro da casca do Waesy (`AppShell`), enquanto `infinite_feed` retorna `null` (L1592). | Separar: `/loja/$slug` = Perfil Público no Marketplace Waesy (opcional via `waesy_marketplace_enabled`); `/app/$slug` = App Oficial Padronizado standalone (sem barras do Waesy); `/workspace/builder` = Omni Builder avançado opt-in. |
| **Templates Verticais (Turismo / Delivery / Eventos)** | `_store.turismo.index.tsx` acopla `TourismHeroBanner` e `CorporateVollConciergeView` à agência fixa; `CommercialShowcaseTemplate` e `EventsShowcaseMobileView` operam apenas em escala global; `OMNI_APP_BLUEPRINTS` não contém `tourism` e usa IDs fora de `registry.ts`. | Parametrizar os templates por `storeId` e `store` real para reutilização direta em `/app/$slug` (sem duplicar UI), mantendo as rotas globais `/turismo`, `/gastronomia` e `/eventos` intactas. Registrar aliases/blocos faltantes em `registry.ts`. |
| **Editor de Seções & Formulários** | `StoreVitrineSectionsEditor` só liga/desliga 8 tipos fixos com fallback `localStorage`; `LeadFormRenderer` existe só em `/f/$slug`. | Expandir `store_page_sections` com `layout_mode` (`carousel`, `grid`, `list`, `bento`, `infinite`), `source_type` (`category`, `collection`, `form`, `api_quoter`, `corporate_cta`, etc.), `source_id`, `tab_id` e `items_limit`. |
| **Portal do Cliente por Empresa** | `/c/$storeSlug` e `portal-*-widget.tsx` possuem mocks hardcoded (`ct-001`, `ord-101`, `bill-01`, `apt-001`) e login simulado via `setTimeout`. | Remover mocks e implementar `getClientStorePortalSummaryFn` filtrando estritamente por `store_id` e `auth.uid()` (pedidos, agendamentos, viagens/vouchers, ingressos, locações, contratos, carnês/financeiro). |
| **PWA Cache, Manifesto, Realtime, Logo & Splash** | `public/sw.js` usa `cachedResponse || fetchPromise` até para `/api/pwa/manifest.json`; `api.pwa.manifest.json` ignora `store_pwa_configs` e aplica `max-age=600`; nenhuma tabela de vitrine assina Supabase Realtime; `crop-image.ts` não gera ícones `maskable` com safe-zone para logos horizontais; `PwaSplashPreview` só existe no admin. | `sw.js` v6 Network-Only para `/api/*` e HTML, Cache-First somente para `/assets/*` com hash, `skipWaiting()` + invalidação automática; `/api/pwa/manifest.json` lendo `store_pwa_configs` com `no-store`; hook Realtime por `store_id`; gerador `192/512/maskable` com modo `contain`; `AppSplashScreen` + `AppInstallDrawer`. |

---

## 2. Requisitos em Sintaxe EARS

1. **EARS-BA-01 (Separação de Canais):** WHEN a visitor accesses `/app/$slug`, THE SYSTEM SHALL render the company's standardized standalone App shell free of Waesy Marketplace global chrome (`TopBar`, `ContextSidebar`, `MobileNav`), while `/loja/$slug` remains the optional Waesy Marketplace profile controlled by `stores.waesy_marketplace_enabled`.
2. **EARS-BA-02 (Ativação no Onboarding):** WHEN a company registers via `fastRegisterCompany` (`_store.criar-negocio.tsx`), THE SYSTEM SHALL capture App activation preferences, Marketplace visibility, and niche capabilities, and atomically provision `store_pwa_configs`, `navigation_tabs`, and default `store_page_sections`.
3. **EARS-BA-03 (Templates Padronizados por Nicho):** WHEN a store uses `tourism_cvc`, `delivery_ifood`, `events_sympla`, `services_agenda`, `ecommerce_retail`, or `standard_catalog`, THE SYSTEM SHALL render the canonical locked App layout fed exclusively by real records of `store_id`, including API live quotation (`publicTourismAutoServiceSearchFn`) and the Corporate Travel action button (`Corporativo / VOLL`) for Tourism.
4. **EARS-BA-04 (Seções, Abas, Formulários & Scroll Infinito):** WHEN the store manager edits App sections or navigation tabs in `/workspace/configuracoes/pwa`, THE SYSTEM SHALL persist `layout_mode` (`carousel` | `grid` | `list` | `bento` | `infinite`), `source_type` (`category` | `collection` | `form` | `api_quoter` | `corporate_cta` | ...), `source_id`, and `tab_id` in `store_page_sections` and `store_pwa_configs`, rendering inline `LeadFormRenderer` forms/surveys and real cursor-paginated infinite scroll catalogs.
5. **EARS-BA-05 (Área do Cliente Escopada por Empresa):** WHEN an authenticated customer opens the `Minha Área` tab inside `/app/$slug`, THE SYSTEM SHALL query and display exclusively their real orders, appointments, trips/vouchers, event tickets, rentals, contracts, and receivables/carnês belonging to that `store_id`, with zero mock data and zero cross-tenant leakage.
6. **EARS-BA-06 (PWA Sem Cache Preso & Realtime):** WHEN store settings, PWA branding, sections, banners, categories, or products are updated in the Workspace, THE SYSTEM SHALL increment `store_pwa_configs.cache_version`, serve `/api/pwa/manifest.json` with `Cache-Control: no-store, must-revalidate`, broadcast changes via Supabase Realtime (`postgres_changes`), and update active/installed PWAs automatically without clearing app storage.
7. **EARS-BA-07 (Recorte Proporcional de Logo, Splash & Badge/Drawer de Instalação):** WHEN a logo is uploaded in App/PWA setup, THE SYSTEM SHALL support `contain` padding and background fill to generate `logo_square_url`, `icon_192_url`, `icon_512_url`, and safe-zone `maskable_icon_512_url`, render `AppSplashScreen` on launch (respecting `prefers-reduced-motion`), and display a store-branded Install Badge and bottom Drawer with real telemetry (`recordPwaInstallation`).

---

## 3. Critérios de Aceite & Evidências Obrigatórias

- Migration `20270525000000_branded_app_catalog_and_pwa_sync.sql` registrada e aprovada em `npm run check:bff` e `npm run check:schema`.
- Zero tipos duplicados (`npm run check:types-ssot`), zero violações de nomenclatura (`npm run check:naming`), zero ciclos (`npm run check:cycles`), zero novas violações de design lint (`npm run lint:design`).
- `npm run typecheck`, `npm test` (incluindo suíte dedicada `branded-app.test.ts`) e `npm run build` concluídos com Exit Code `0`.
- Registro final em `docs/design/DECISIONS.md`.
