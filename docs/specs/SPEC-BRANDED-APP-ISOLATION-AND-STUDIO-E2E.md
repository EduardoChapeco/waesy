# SPEC — Ecossistema Branded App, Isolamento Multi-Tenant, Studio Unificado & Motor GDS/Tracking E2E

- **ID:** `SPEC-BRANDED-APP-ISOLATION-AND-STUDIO-E2E`
- **Data:** `2026-11-17`
- **Baseline HEAD:** `c0e1d351e1ac5feaeb77d0f88cc19df83f14267c` (`release/prod-20261113-fullpage-chat-copilot`)
- **Escopo Normativo:** `AGENTS.md` (B.1–B.51), `docs/design/DESIGN.md`, `docs/design/DESIGN-LINT.md` (`DL-01` a `DL-33`), `skills/waesy-integrity-auditor/SKILL.md`.

---

## 1. Requisitos Formais em Sintaxe EARS (Waves 1 a 7)

### Wave 1 — Isolamento Absoluto Multi-Tenant, Domínio Próprio Edge/SSR & Eliminação de Escapes Global

- **[EARS-BA-01] Roteamento Transparente por Domínio Personalizado (`custom_domain`):**
  - When a request arrives at the Nitro/Cloudflare SSR entrypoint (`src/server.ts`) or root/manifest routes with a `Host` header not matching `*.waesy.com.br`, `waesy.com.br`, `*.usewaesy.com`, SaaS brand domains, or `localhost` without `?slug`, the system shall look up an active tenant store (`stores.custom_domain` or `store_pwa_configs.custom_domain` or normalized DNS host) on a public-safe server helper and rewrite/resolve the request internally into that tenant's Branded App bundle, keeping `scope: "/"` and `start_url: "/?source=pwa"` in `/api/pwa/manifest.json` and without exposing Waesy Marketplace branding or cross-tenant navigation.
- **[EARS-BA-02] Isolamento Estrito de Rotas Dentro do App Oficial (`/app/:slug` e domínio próprio):**
  - While the user navigates inside `<BrandedAppShell />` (both in `/app/:slug` and custom domain mode), when clicking any product, tourism package, classified item, event, order, proposal, contract, or portal login control, the system shall keep 100% of navigation inside the tenant App shell via contextual sheets/drawers, scoped internal subviews, or tenant-preserved parameters (`?app=1&store=<slug>&returnApp=...`), and shall never redirect or `<Link>` out to Waesy Marketplace routes (`/loja/*`, `/turismo/*`, `/classificados/*`, `/evento/*`, `/produto/*`, `/conta/*`, `/entrar`) without scoped tenant containment.
- **[EARS-BA-03] Manifest & Isolamento Visual White-Label:**
  - When `getPublicBrandedAppBySlugFn` or `getPublicBrandedAppByHostFn` loads a tenant app with `is_app_enabled = false`, the system shall display a clean tenant-scoped maintenance state and shall only surface a link to `/loja/$slug` if `waesy_marketplace_enabled` AND `publish_to_marketplace` are explicitly true.

### Wave 2 — Unificação Canônica do Studio (`/workspace/configuracoes/pwa`), DeviceStage Iframe (`postMessage`) & Omni-Builder

- **[EARS-BA-04] Fonte Única de Verdade no Workspace PWA:**
  - When a store manager opens `/workspace/configuracoes/pwa`, the route shall render a single unified Studio workspace (eliminating duplicate React state and competing legacy forms from `pwa.functions.ts` vs `branded-app.functions.ts`), preserving 100% of existing capabilities: model/channel selector, tabs & sections editor, Brand Kit bilateral sync, proportional SVG/PNG app icon cutter (`192`, `512`, `maskable`), splash animation configurator, custom domain DNS wizard (`HostingDomainConnectContent` + `connectStoreCustomDomain` status), full install telemetry dashboard (platform breakdown + timeline), QR code / shareable app kit, and legal terms.
- **[EARS-BA-05] Palco Real via Iframe + `postMessage` & Modo Omni Hybrid:**
  - While editing in the unified Studio (`BrandedAppStudioShell`), the live preview stage shall render via a dedicated lightweight preview route (`/app/preview/$slug` or `/app/$slug?preview=1`) inside an isolated `<iframe>` (at authentic mobile `390x844` and desktop `1280px` dimensions) synchronized instantaneously in memory via typed `postMessage` protocol (`WAESY_APP_PREVIEW_STATE`), with zero dependency on host CSS media queries.
  - When managing tabs and sections, the manager shall be able to add standard niche blocks, Omni-Builder registry blocks (`omni_block` using `OmniPageRenderer` / `getSiteBlockByIdStrict`), or published Omni pages (`omni_document` from `experience_documents`), configure `city_filter` per section, and reorder/toggle visibility live.
  - At runtime in `<AppSectionsRenderer />`, if `section.city_filter` is defined and the active visitor city does not match, the system shall omit that section cleanly.

### Wave 3 — Cotador & Motor GDS Multi-Modal (InfoTravel + Wooba Nível CVC/Decolar)

- **[EARS-BA-06] Autocomplete Global IATA/Cidades & Construtor Dinâmico de Quartos/Idades:**
  - When the user interacts with `<TourismDynamicSearchPanel />` inside a `tourism_cvc` app or tourism storefront, origin and destination inputs shall bind to real airport/city search (`searchGlobalAirports` via `AirportCombobox`), support round-trip, multi-trecho (`segments`), cabin class, autonomous multi-room occupancy (`rooms: Array<{ adults: number; childrenAges: number[] }>` up to 8 rooms with explicit age selector 0–17 per child), and modal selector (`pacotes`, `aereos`, `hospedagens`, `onibus`, `aluguel`, `passeios`, `seguro`).
- **[EARS-BA-07] Consulta Paralela Real InfoTravel + Wooba & Persistência de Oportunidade CRM:**
  - When the user submits a public multi-modal quote search (`publicTourismAutoServiceSearchFn` extended for Wooba flights, Wooba bus routes, Wooba cars, and InfoTravel packages/hotels/cars/insurances alongside the agency's Supabase catalog), the server function shall validate all fields with Zod (`B.25`), query active tenant credentials without synthetic/mock prices (falling back strictly to honest agency catalog items or explicit unavailable notice), and allow the user to select an offer or request a tailored proposal — creating/updating a scoped `leads_crm` + `travel_quote_sessions` / `quotes` record with full attribution (`UTM` + `IP` + geo).

### Wave 4 — Login Contextual no App, Portal do Cliente 9 Abas, Chat Isolado, Avaliações & Vagas

- **[EARS-BA-08] Autenticação Nativa Escopada no Próprio App (`/app/:slug` & Custom Domain):**
  - When an unauthenticated visitor clicks `Minha Área` or performs a transactional action inside a Branded App, the system shall provide an in-app contextual authentication flow (`AppContextualAuthCard`: E-mail & Senha via `supabase.auth.signInWithPassword`, Magic Link / OTP por e-mail via `signInWithOtp`, Cadastro de Cliente no App via `signUp` + criação/vínculo automático de cliente no tenant, OU Código do Cliente + fator de confirmação via `unlockClientStorePortalByCodeFn`), never redirecting to global `/entrar`.
- **[EARS-BA-09] Portal do Cliente 9 Dimensões 100% Escopado na Loja:**
  - When authenticated (via Supabase user session OR scoped `store_app_client_tokens` magic token), `<AppClientPortalTab />` and `getClientStorePortalSummaryFn` shall strictly filter by `storeId` and display real records across: (1) Pedidos & Aluguéis (inline status & receipt), (2) Minha Viagem / Roteiros & Vouchers (`viajante` / itinerary viewer inside drawer), (3) Propostas & Orçamentos (inline preview/acceptance drawer without leaving App), (4) Agendamentos, (5) Ingressos + QR Code, (6) Contratos & Assinatura (inline signature viewer/drawer or preserved return URL), (7) Carnês & Financeiro (PIX copy/paste + comprovante upload), (8) Chat Direto Isolado com a Empresa (thread escopada `store_id` + cliente autenticado/magic token com mensagens em tempo real), e (9) Chamados de Suporte (`support_tickets` / `operator_support_tickets` abertura + histórico dentro do App).
- **[EARS-BA-10] Avaliações Verificadas & Candidatura a Vagas Dentro do App:**
  - When an authenticated customer has at least one completed order, trip, appointment, or ticket at `storeId`, they shall be able to submit a verified review (`submitBrandedAppStoreReviewFn` -> `reviews` with `verified_purchase = true` and moderated/approved handling) directly inside the App.
  - When `bundle.jobs` lists open positions on the `Empresa` tab, visitors shall be able to inspect full job requirements and apply (`applyToBrandedAppJobFn`) without navigating away to `_store.empregos`.

### Wave 5 — Service Worker Incremental Sem Perda de Dados & Kit de Instalação Real

- **[EARS-BA-11] Service Worker (`public/sw.js`) Resiliente com Cache Partitioning & Preservação de Dados:**
  - Preserve existing contract checks (`CACHE_NAME = "waesy-v6-app-realtime"`, `PURGE_APP_CACHE`, `self.skipWaiting()`, `self.clients.claim()`), while partitioning runtime caches per tenant app namespace (`waesy-app-runtime-${slug}`) and ensuring that incremental updates (`PURGE_APP_CACHE` with `slug` or version bump) ONLY evict stale HTTP response caches and NEVER wipe `IndexedDB`, `localStorage`, `sessionStorage`, Supabase auth cookies, cart state, or draft forms; notify active tabs smoothly without forced disruptive reload loops.
- **[EARS-BA-12] Telemetria Real & Honesta de Instalações:**
  - In `<AppInstallDrawer />`, shareable QR modal, and Unified Studio Telemetry tab, real install counters (`pwa_telemetry` with IP/platform breakdown + timeline + QR code SVG for `/app/:slug` or custom domain) shall be displayed accurately without synthetic numbers when counts are zero (`B.8`, `B.33`), and `PWA` install/prompt events shall respect Android `beforeinstallprompt`, iOS Safari instructions, and Desktop WebApp installability (`start_url`, icons `192`, `512`, `maskable`).

### Wave 6 — Meta Pixel/CAPI, UTM/IP/GPS Consensual, Multi-Pixel Routing & CRM/IA Attribution

- **[EARS-BA-13] Telemetria End-to-End no Branded App & Domínios Próprios:**
  - When `<BrandedAppShell />` mounts in live mode (`!isPreview`), it shall mount `<StoreAnalyticsInjector storeId={store.id} storeSettings={store.settings} pageContext="..." />` AND fire structured behavioral events (`useTelemetry`) plus transactional Meta CAPI + Browser Pixel deduplicated events (`ViewContent`, `AddToCart`, `InitiateCheckout`, `Lead`, `Contact`, `Purchase`, `QualifiedLead`, `SubmitApplication`) routed via `selectMatchedPixelsForContext` (`marketing_source_pixels` + `store_pixel_configs`).
- **[EARS-BA-14] Captura Real de IP, GeoIP, Consensual GPS & Vínculo no CRM / IA SDR:**
  - Whenever a lead, quote, booking, form submission, chat thread creation, or `recordStorefrontAttributionVisit` occurs from the Branded App (or storefront), the server handler shall resolve real client IP (`getRealClientIP`), network GeoIP (`resolveGeoLocation`), and any user-consented browser GPS coordinates (`waesy_client_geo` cookie/payload), persist them cleanly on `ad_attribution_touchpoints` / `leads_crm` / `chat_threads.attribution` (without overwriting human names or leaking synthetic emails/tokens in UI notes), and expose clean source/campaign/city summary to the CRM Dossier & AI SDR (`ProductAiSdrChat` / `omnichannel-ai-copilot`).

### Wave 7 — Design System Audit, Verificação em 8 Níveis & Handoff Canônico

- **[EARS-BA-15] Zero Violações Visuais, Acessibilidade WCAG 2.2 AA & 8 Níveis de Verificação:**
  - Eliminate any `Sparkles` icons (`DESIGN.md` C.21 #3), arbitrary classes `[...]` (`DL-02`), literal hex outside `TOKEN_HEX`/`styles.css` (`DL-01`), `!important` (`DL-04`), containeritis (`DL-31`), touch targets `< 44px` on mobile (`DL-14`), and `text-2xs` on primary actions in touched files.
  - Validate every finding with baseline failing reproduction tests -> fix -> passing unit/integration tests, negative/cross-tenant isolation proofs, `check-client-server-leak`, `design-lint --ratchet`, `contrast-audit`, `tsc --noEmit`, `vite build`, live local SSR server + HTTP/browser verification (honestly logging exact runtime tool availability), and final ledger + `docs/design/DECISIONS.md` closure.

---

## 2. Mapa de Arquivos Autorizados (Escopo Cirúrgico)

- **Banco de Dados (Nova Migração):**
  - `supabase/migrations/20270606000000_branded_app_omni_chat_reviews_and_domains.sql`
- **Core SSR / Host Routing / Utils / SW / Manifest:**
  - `src/server.ts`, `src/lib/branded-app-links.ts`, `src/lib/custom-domain-routing.server.ts` (novo), `src/routes/api.pwa.manifest[.]json.ts`, `src/routes/app.$slug.tsx`, `src/routes/app.preview.$slug.tsx` (novo), `src/routes/_store.index.tsx`, `public/sw.js`
- **Services BFF:**
  - `src/services/branded-app.functions.ts`, `src/services/branded-app-studio.functions.ts` (novo se necessário para coesão modular), `src/services/branded-app-portal-actions.functions.ts` (novo: chat isolado cliente<->loja, chamados no portal, avaliação verificada no app, candidatura a vaga no app, signup contextual), `src/services/infotravel.ts`, `src/services/pixels.functions.ts`, `src/services/tourism.functions.ts`, `src/services/omnichannel-attribution.server.ts`
- **UI Studio, Branded App, Tourism & Analytics:**
  - `src/routes/workspace.configuracoes.pwa.tsx`, `src/components/branded-app/*`, `src/components/pwa/*`, `src/components/tourism/tourism-dynamic-search-panel.tsx`, `src/components/analytics/StoreAnalyticsInjector.tsx`
- **Testes & Governança:**
  - `src/services/branded-app.test.ts`, novos arquivos de teste em `src/services/` e `src/components/branded-app/`, `docs/audits/LEDGER_BRANDED_APP_STUDIO_E2E_2026-11-17.md`, `docs/design/DECISIONS.md`
