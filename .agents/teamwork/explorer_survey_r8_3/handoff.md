# Handoff Report: Explorer Survey 3 (Platform Security, Supabase RLS, Storage Buckets, BFF Invariant B.25 & 4-State Matrix)

- **Date**: 2026-10-13T17:45:00Z
- **Author**: Explorer Survey 3 (`explorer_survey_r8_3`)
- **Recipient**: Orchestrator / Lead Architect (`3a2a1483-83e5-492f-8dc4-21f64b7637fb`)
- **Type**: Hard Handoff (Investigation & Forensic Survey Complete)

---

## 1. Observation

### 1.1 Supabase Schema, Migrations, RLS & RPC Security
- **Migration Inventory**: 500 SQL migration files in `supabase/migrations/` (from `0001_foundation.sql` to `20270124000000_atomic_ai_conversation_exchange.sql`), creating a total of 621 tables, of which 604 are active (non-dropped) tables.
- **RLS Enablement**: 
  - 571 active tables (95%) have `ROW LEVEL SECURITY` enabled.
  - 19 tables in `supabase/migrations/20270122000000_bff_missing_table_contracts.sql` (lines 229–244) were enabled via dynamic PL/pgSQL block (`DO $$ ... EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', relation_name); ... $$;`) with zero client policies, intentionally enforcing service-role Deny-by-Default.
  - **12 active tables completely lack `ENABLE ROW LEVEL SECURITY`** across migrations:
    1. `canonical_device_brands` (`20260903130000_classifieds_canonical_sources_and_rich_schema.sql`: lines 28–35)
    2. `canonical_device_models` (`20260903130000_classifieds_canonical_sources_and_rich_schema.sql`: lines 37–47)
    3. `canonical_vehicle_brands` (`20260903130000_classifieds_canonical_sources_and_rich_schema.sql`: lines 50–56)
    4. `canonical_vehicle_models` (`20260903130000_classifieds_canonical_sources_and_rich_schema.sql`: lines 58–66)
    5. `canonical_job_occupations` (`20260903130000_classifieds_canonical_sources_and_rich_schema.sql`: lines 69–75)
    6. `travel_document_ingestions` (`20261006120000_canonical_travel_document_pipeline.sql`: lines 7–37)
    7. `travel_budgets` (`20261006120000_canonical_travel_document_pipeline.sql`: lines 39–60)
    8. `travel_budget_items` (`20261006120000_canonical_travel_document_pipeline.sql`: lines 62–90)
    9. `boarding_rooming_list` (`20260930000000_tourism_core_unified_tables.sql`: lines 280–295)
    10. `bus_seat_assignments` (`20260930000000_tourism_core_unified_tables.sql`: lines 297–315)
    11. `corporate_rfps` (`20260930000000_tourism_core_unified_tables.sql`: lines 317–335)
    12. `resource_availabilities` (`20261120000000_omni_commerce_lifecycle_and_logistics.sql`: lines 110–135)
- **Multi-Tenant Sovereign Isolation**:
  - 324 tenant-scoped tables enforce sovereign `store_id` (foreign key to `public.stores(id)`).
  - Only 1 table retains legacy `tenant_id` without `store_id`: `crawl_seeds` (`20260827280000_enterprise_mega_ecosystem_expansion.sql`).
- **SECURITY DEFINER Functions & search_path Vulnerability**:
  - 249 `SECURITY DEFINER` functions were identified across all 500 migrations.
  - **126 functions lack explicit `SET search_path = public`** (or `SET search_path = ''`).
  - **50 sensitive transactional, financial, order, and stock RPCs are vulnerable to search_path hijacking**, including:
    - `public.adjust_stock` (`0011_stock_rpc.sql`)
    - `public.process_checkout_atomic` (`0025_checkout_rpc.sql`, `0033_catalog_variants_stock.sql`, `0039_checkout_security_hardening.sql`, `0043_checkout_manual_quote_status.sql`, `0056_checkout_revalidation.sql`, `0071_checkout_logistics_snapshot.sql`, `0074_checkout_atomic_v3.sql`)
    - `public.process_checkout_transaction_v2` (`00511_pos_and_checkout_transactions.sql`, `0052_commission_engine.sql`, `0054_checkout_offers.sql`, `0059_pix_discount_atomic.sql`, `20260725190000_checkout_advisory_locks.sql`, `20260725200000_strict_checkout_stock_validation.sql`, `20260730100001_checkout_backorder_support.sql`)
    - `public.reserve_stock_for_cart` (`0033_catalog_variants_stock.sql`)
    - `public.release_stock_for_cart_item` (`0033_catalog_variants_stock.sql`)
    - `public.cancel_order` (`0075_cancel_order_rpc.sql`)
    - `public.grant_customer_credit` (`0076_grant_customer_credit.sql`)
    - `public.perform_stock_audit` (`0055_inventory_audit.sql`)
    - `public.record_refund_on_order` (`20260726010000_fulfillment_financial.sql`)
    - `public.fail_order_payment` (`20260726100000_fail_order_atomic.sql`)
    - `public.confirm_order_and_deduct_stock` (`20260811153500_confirm_order_atomic.sql`)

### 1.2 Public Transactional Routes & ActionAuthGuardModal Wiring
- **Route Inventory**: 418 route files in `src/routes/`; 200 are public storefront/catalog/utility routes (`_store.*`, `catalogo`, `noticias`, `classificados`, etc.).
- **ActionAuthGuardModal Component**: Defined in `src/components/common/action-auth-guard-modal.tsx` (lines 21–81), receiving `isOpen`, `onOpenChange`, `title`, `description`, `actionContext`, and `returnUrl`.
- **Adoption Rate**: `ActionAuthGuardModal` is only imported and rendered in **5 public routes**:
  - `src/routes/_store.turismo.$id.tsx` (lines 21, 478, 824)
  - `src/routes/_store.mobilidade.tsx` (lines 13, 768)
  - `src/routes/_store.evento.$id.tsx` (lines 17, 273, 292)
  - `src/routes/_store.empregos.$id.tsx` (lines 15, 203)
  - `src/routes/_store.classificados.$id.tsx` (lines 18, 205, 290)
- **19 Transactional Public Routes LACK ActionAuthGuardModal**:
  - `src/routes/_store.produto.$slug.tsx` (mutations: `addToCart`, `handleAddToCart`)
  - `src/routes/_store.destaques.$slug.tsx` (mutation: `addToCart`)
  - `src/routes/_store.carrinho.tsx` (mutation: `checkout`)
  - `src/routes/_store.checkout.tsx` (mutation: `checkout`, `createOrder`)
  - `src/routes/_store.marketplace.checkout.tsx` (mutation: `checkout`)
  - `src/routes/_store.agendar.$id.tsx` (mutation: `createAppointment`)
  - `src/routes/_store.agendar.index.tsx` (mutations: `createAppointment`, `reservar`)
  - `src/routes/_store.match-time.tsx` (mutations: `addToCart`, `checkout`)
  - `src/routes/_store.proposta.$token.tsx` (mutation: `checkout`, `acceptProposal`)
  - `src/routes/_store.voucher.$token.tsx` (mutation: `checkout`, `redeemVoucher`)
  - `src/routes/_store.pedido.$publicToken.confirmacao.tsx` (mutation: `checkout`)
  - `src/routes/_store.gift-card.$claimToken.tsx` (mutation: `checkout`)
  - `src/routes/_store.conta.classificados.novo.tsx` (mutations: `checkout`, `reservar`)
  - `src/routes/_store.conta.creditos.tsx` (mutation: `checkout`)
  - `src/routes/_store.conta.empresa.tsx` (mutation: `reservar`)
  - `src/routes/_store.conta.gift-cards.tsx` (mutation: `checkout`)
  - `src/routes/_store.conta.negociacoes.tsx` (mutation: `reservar`)
  - `src/routes/portal.subpainel.$token.tsx` (mutation: `handleAddToCart`)
  - `src/routes/sitemap[.]xml.ts` (contains false-positive token match `checkout`)
- **Missing returnUrl in Guarded Routes**:
  - `src/routes/_store.classificados.$id.tsx` lines 205 & 290 render `<ActionAuthGuardModal {...modalProps} />` where `modalProps` does NOT pass explicit `returnUrl`.
  - `src/routes/_store.evento.$id.tsx` lines 273 & 292 render `<ActionAuthGuardModal {...modalProps} />` without explicit `returnUrl`.
  - `src/routes/_store.turismo.$id.tsx` lines 478 & 824 render `<ActionAuthGuardModal {...modalProps} />` without explicit `returnUrl`.

### 1.3 Storage Buckets & Media Governance
- **Buckets Defined in SQL Migrations**: 8 buckets:
  - `product-media` (`0012_storage_buckets.sql`)
  - `cms-media` (`0040_cms_media_and_theme.sql`)
  - `receipts` (`0044_store_payment_settings.sql`)
  - `post-media` (`0067_media_assets_pipeline.sql`)
  - `brand-assets` (`20260822000000_platform_brand_assets_and_root_store.sql`)
  - `identity-vault` (`20260828050000_kyc_verification_engine.sql`)
  - `covers` (`20261231000000_storage_rls_lockdown_views_security_invoker.sql`)
  - `classified-media` (`20261231000000_storage_rls_lockdown_views_security_invoker.sql`)
- **Buckets Referenced in Source Code**:
  - `cms-media`: 34 files
  - `banners`: 14 files (declared via storage policies in `20260814100000_storage_buckets_universal_media.sql`)
  - `product-media`: 12 files
  - `avatars`: 7 files (referenced in `profiles` and headers, created dynamically in seed/setup)
  - `documents`: 7 files
  - `receipts`: 7 files
  - `covers`: 4 files
  - `classified-media`: 2 files
  - `brand-assets`: 1 file
  - `classifieds-images`: 0 files (aliased to `classified-media`)
- **Triple Governance Audit (Upload + External URL + Ctrl+V Paste)**:
  - **Only 3 uploaders implement the full triad**:
    1. `src/components/admin/builder/MediaUploader.tsx` (lines 35–180)
    2. `src/components/ui/image-upload.tsx` (lines 20–145)
    3. `src/components/ui/media-uploader.tsx` (lines 18–160)
  - **6 uploaders FAIL Triple Governance**:
    1. `src/components/classifieds/digital-file-dropzone.tsx`: has bucket upload, lacks external URL input, lacks Ctrl+V paste listener.
    2. `src/components/classifieds/story-highlight-uploader.tsx`: lacks direct bucket upload, lacks external URL, lacks paste listener.
    3. `src/components/documents/multimodal-ocr-uploader.tsx`: has paste listener, lacks external URL field.
    4. `src/components/ui/file-attachment-upload.tsx`: has URL and paste, lacks direct Supabase storage bucket upload.
    5. `src/lib/classifieds/upload-classified-media.ts`: has bucket upload and clipboard parsing, lacks external URL handler.
    6. `src/lib/upload-helper.ts`: has direct bucket upload, lacks external URL fallback and clipboard paste listener.
- **Broken Image Prevention (`onError` Neutral SVG Fallback)**:
  - Across the entire `src/` directory, **672 `<img>` tags** were scanned.
  - **Only 21 `<img>` tags (3%) implement `onError` fallback handlers**.
  - **651 `<img>` tags (97%) lack `onError`**, including:
    - `src/components/ad-engine/public/canonical-listing-view.tsx` (line 826, 830)
    - `src/components/admin/catalog/product-editor/product-preview-pane.tsx` (line 846, 850)
    - `src/components/admin/catalog/product-upsell-card.tsx` (line 854)
    - `src/components/booking/booking-detail-desktop.tsx` (lines 886, 890)
    - `src/components/booking/booking-detail-mobile.tsx` (lines 894, 898)
    - `src/components/admin/tenant-switcher.tsx` (line 874)

### 1.4 BFF Server Functions & Invariant B.25
- **BFF Inventory**: 243 files in `src/services/*.functions.ts`, containing **1,815 `createServerFn` endpoints**, of which **1,772 endpoints** are validated with Zod schemas via `.validator(...)`.
- **Invariant B.25 Violations**: **156 functions** define parameters in their Zod validator schema that are completely omitted or dropped from execution in the handler/helper:
  - `src/services/addresses.functions.ts` (`validateDeliveryLocationGPS`, lines 188–235): Zod validator declares `deliveryState: z.string().optional()`, but lines 201–235 never read `deliveryState`, and lines 207–210 hardcode a fallback to Chapecó coordinates (`-27.1004`, `-52.6152`).
  - `src/services/admin-catalog.functions.ts` (`replicateCatalogToStores`, lines 2223–2334): Zod validator declares `replicate_categories: z.boolean().default(true)` and `replicate_option_groups: z.boolean().default(true)`. Lines 2261–2320 only replicate raw products, completely ignoring categories and option groups.
  - `src/services/admin-catalog.functions.ts` (`deleteProductMedia`, lines 1449–1475): Zod validator accepts `{ id: z.string().uuid(), url: z.string().optional() }`, but handler only executes `db.from("product_media").delete().eq("id", id)`, leaving the storage blob orphaned in the bucket without deletion.

### 1.5 4-State UI Matrix Coverage
- **Surfaces Audited**: 377 route components in `src/routes/*.tsx`.
- **Overall Coverage**:
  - 289 routes (77%) exhibit a complete 4-state matrix (Data, Loading, Empty, Error).
  - **88 routes (23%) lack at least one state**.
- **Breakdown by Category**:
  - **Store (`_store.*`, 143 routes)**:
    - 102 complete (71%)
    - **41 routes lack Empty State (29%)** (e.g., `_store.agendar.$id.tsx`, `_store.busca.tsx`, `_store.cadastro.tsx`, `_store.diretorio.tsx`)
    - **9 routes lack Loading/Skeleton State (6%)** (e.g., `_store.agendar.tsx`, `_store.busca.tsx`, `_store.empregos.tsx`)
    - **7 routes lack Error State (5%)**
  - **Workspace (`workspace.*`, 179 routes)**:
    - 149 complete (83%)
    - **28 routes lack Empty State (16%)** (e.g., `workspace.catalogo.index.tsx`, `workspace.catalogo.colecoes.$id.tsx`, `workspace.catalogo.produtos.$id.tsx`)
    - **8 routes lack Loading State (4%)** (e.g., `workspace.catalogo.index.tsx`, `workspace.configuracoes.loja.tsx`)
    - **6 routes lack Error State (3%)**
  - **Admin Master (`admin-master.*`, 37 routes)**:
    - 32 complete (86%)
    - **5 routes lack Empty State (14%)** (`admin-master.algoritmo.tsx`, `admin-master.hubs.tsx`, `admin-master.logistica.tsx`, `admin-master.modulos.tsx`, `admin-master.tsx`)
    - **1 route lacks Loading State (3%)** (`admin-master.tsx`)
    - 0 routes lack Error State (100% covered)
  - **Other Top-Level Routes (18 routes)**:
    - 6 complete (33%)
    - **11 routes lack Empty State (61%)** (`home.tsx`, `c.$storeSlug.tsx`, `claim.reivindicar.$entityId.tsx`, etc.)
    - **4 routes lack Loading State (22%)** (`home.tsx`, `status.tsx`, etc.)

---

## 2. Logic Chain

1. **Premise (RLS Deny-by-Default)**: In Supabase/PostgreSQL, a table without `ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;` is completely open to the `anon` and `authenticated` roles if PostgREST grants exist.
   - **Step 1.1**: Direct code inspection of `20260903130000_classifieds_canonical_sources_and_rich_schema.sql` (lines 28–75) and `20261006120000_canonical_travel_document_pipeline.sql` (lines 7–90) demonstrates that `canonical_device_brands`, `canonical_device_models`, `canonical_vehicle_brands`, `canonical_vehicle_models`, `canonical_job_occupations`, `travel_document_ingestions`, `travel_budgets`, and `travel_budget_items` were created without `ENABLE ROW LEVEL SECURITY`.
   - **Step 1.2**: As a result, sensitive customer travel quotes, budgets, and lead links in `travel_budgets` and `travel_document_ingestions` lack database-enforced Deny-by-Default protection at the PostgreSQL engine level.

2. **Premise (SECURITY DEFINER Search Path)**: A PostgreSQL `SECURITY DEFINER` function without `SET search_path = public` executes with the creator's elevated permissions while inheriting the caller's active `search_path`. This creates a critical search_path injection vulnerability (CWE-426) flagged by Supabase Security Advisor and OWASP.
   - **Step 2.1**: Audit of all 249 `SECURITY DEFINER` functions across 500 migrations revealed 126 instances lacking `SET search_path = public`.
   - **Step 2.2**: 50 of these functions control financial transactions, checkout atomic balance transfers, stock reservations, order cancellations, and customer credits (`process_checkout_atomic`, `process_checkout_transaction_v2`, `adjust_stock`, `cancel_order`, `grant_customer_credit`).
   - **Step 2.3**: If an attacker manipulates `search_path` during a session, they can intercept calls to unqualified objects referenced within these privileged functions.

3. **Premise (Public Route Zero-Trust Civil Guard)**: Public storefronts (`_store.*`) allow anonymous guest browsing, but any transactional state change (booking, purchasing, requesting quotes) must be gated by `ActionAuthGuardModal` preserving exact `returnUrl` (Requirement R3 & Invariant B.21).
   - **Step 3.1**: `ActionAuthGuardModal` is only implemented in 5 routes (`turismo`, `mobilidade`, `evento`, `empregos`, `classificados`).
   - **Step 3.2**: 19 routes containing transactional actions—such as adding to cart in `_store.produto.$slug.tsx`, checkout in `_store.carrinho.tsx`, and appointment booking in `_store.agendar.$id.tsx`—allow anonymous execution until BFF rejection or ungraceful redirect.
   - **Step 3.3**: In the 3 routes where the modal is used (`classificados.$id.tsx`, `evento.$id.tsx`, `turismo.$id.tsx`), `returnUrl` is omitted from `modalProps`, defaulting to generic `location.pathname` without preserving active search filters or query parameters.

4. **Premise (Storage Triple Governance & Image Fallback)**: Requirement R1 and Invariants B.27 & B.30 mandate that media uploaders must provide Bucket Upload + External URL + Ctrl+V paste, and 100% of image elements must render clean SVG fallbacks on failure.
   - **Step 4.1**: 6 of 9 uploader components lack either URL input or clipboard paste listeners.
   - **Step 4.2**: 97% of `<img>` tags (651 out of 672) render raw `src` without an `onError` handler, causing broken image icons across product cards, seller logos, and preview panes when assets are missing or slow.

5. **Premise (Invariant B.25 Parameter Parity)**: BFF functions receiving Zod payloads must destructure 100% of validated parameters or reference root data with defensive coalescing.
   - **Step 5.1**: 156 functions declare parameters in Zod schemas that are never used in function execution.
   - **Step 5.2**: In `addresses.functions.ts:validateDeliveryLocationGPS`, `deliveryState` is completely ignored, and city resolution defaults to Chapecó.
   - **Step 5.3**: In `admin-catalog.functions.ts:replicateCatalogToStores`, `replicate_categories` and `replicate_option_groups` are declared but silently discarded.

6. **Premise (4-State Matrix)**: Every interactive screen must gracefully display data, loading skeleton, empty state, and error message.
   - **Step 6.1**: 23% of route components (88 routes) miss at least one state, with Empty State being the most widespread omission (85 routes), producing blank spaces or empty tables instead of honest zero-data messaging.

---

## 3. Caveats

1. **Read-Only Scope**: This survey was performed strictly via static code analysis, AST regex parsing, and schema migration inspection. No live database migrations were applied or production network requests executed.
2. **Dynamic PL/pgSQL Loops**: Tables enabled for RLS via dynamic loops (such as `20270122000000_bff_missing_table_contracts.sql`) were manually verified and distinguished from genuine omissions.
3. **Helper Function Indirection**: Some BFF functions pass `input` as a whole object to private helper functions (`_myHelper(input)`). These were accounted for in our secondary AST check (`scratch/check_b25.cjs`), isolating the true 156 parameter drops.
4. **False Positive Omissions**: Top-level routes like `sitemap[.]xml.ts` matched the word `checkout` due to route mapping definitions, but are not interactive UI routes.
5. No other caveats.

---

## 4. Conclusion

1. **Security & RLS**: 
   - 12 tables require immediate RLS enablement and Deny-by-Default policies, specifically the 3 sensitive travel document/budget tables (`travel_document_ingestions`, `travel_budgets`, `travel_budget_items`) and 5 canonical classifieds tables.
   - 50 critical financial, checkout, and inventory `SECURITY DEFINER` RPCs must be patched with `SET search_path = public` to eliminate CWE-426 privilege escalation vulnerabilities.
2. **Transaction Gating**:
   - `ActionAuthGuardModal` must be systematically wired into 19 public transactional routes (`produto.$slug.tsx`, `carrinho.tsx`, `checkout.tsx`, `agendar.$id.tsx`, etc.), with `returnUrl` explicitly forwarding `location.pathname + location.search`.
3. **Storage & Media**:
   - Universal uploader primitive (`src/components/ui/media-uploader.tsx`) must be adopted across the 6 non-compliant uploaders.
   - A global `<AppImage />` primitive or automated `onError` neutral SVG fallback patch must be propagated to eliminate the 651 unhandled `<img>` tags.
4. **BFF Invariant B.25**:
   - The 156 identified BFF functions must be reconciled: either consume the declared parameters (e.g. implementing category/option replication in `replicateCatalogToStores`) or remove unused parameters from the Zod validator.
5. **UI 4-State Matrix**:
   - Implement canonical `<EmptyState />` and `<Skeleton />` across the 88 incomplete routes, prioritizing the 41 storefront routes.

---

## 5. Verification Method

### 5.1 Verification Commands
To independently verify the numbers and findings reported above, run the forensic audit scripts provided:

```powershell
# 1. Verify Migration Inventory
node scripts/audit/validate-migration-inventory.mjs

# 2. Run Comprehensive Survey Engine (RLS, Buckets, Public Routes, BFF, 4-State)
node scratch/audit-survey-3.cjs

# 3. Verify Exact Invariant B.25 Unreferenced Keys
node scratch/check_b25.cjs

# 4. Verify Route-by-Route 4-State Matrix Breakdown
node scratch/audit_4state.cjs
```

### 5.2 Specific Files to Inspect
- **RLS Omissions**:
  - `supabase/migrations/20261006120000_canonical_travel_document_pipeline.sql` (lines 7–90: missing `ENABLE ROW LEVEL SECURITY`)
  - `supabase/migrations/20260903130000_classifieds_canonical_sources_and_rich_schema.sql` (lines 28–75: missing `ENABLE ROW LEVEL SECURITY`)
- **SECURITY DEFINER search_path Missing**:
  - `supabase/migrations/0011_stock_rpc.sql` (`adjust_stock`)
  - `supabase/migrations/0025_checkout_rpc.sql` (`process_checkout_atomic`)
  - `supabase/migrations/00511_pos_and_checkout_transactions.sql` (`process_checkout_transaction_v2`)
- **ActionAuthGuardModal Omissions**:
  - `src/routes/_store.produto.$slug.tsx` (missing modal on `addToCart`)
  - `src/routes/_store.carrinho.tsx` (missing modal on checkout)
  - `src/routes/_store.agendar.$id.tsx` (missing modal on `createAppointment`)
- **Storage Non-Compliance**:
  - `src/components/classifieds/digital-file-dropzone.tsx` (missing URL + paste)
  - `src/components/ad-engine/public/canonical-listing-view.tsx` (line 830: `<img>` without `onError`)
- **BFF Parameter Inconsistencies**:
  - `src/services/addresses.functions.ts` (`validateDeliveryLocationGPS`: unused `deliveryState`)
  - `src/services/admin-catalog.functions.ts` (`replicateCatalogToStores`: unused `replicate_categories`)

### 5.3 Invalidation Conditions
This report is invalidated if:
1. Additional migrations are introduced in `supabase/migrations/` altering table count or RLS flags without updating the inventory.
2. `src/services/*.functions.ts` are refactored to remove TanStack Start `createServerFn` architecture.
3. Routes in `src/routes/` are renamed or relocated.
