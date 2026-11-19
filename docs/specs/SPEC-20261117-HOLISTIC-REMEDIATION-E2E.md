# SPEC-20261117-HOLISTIC-REMEDIATION-E2E — Remediação End-to-End (M0–M8)

**Data:** 2026-11-17  
**Branch / Baseline:** `release/prod-20261113-fullpage-chat-copilot` (`c0e1d351`)  
**Auditoria de Referência:** `docs/audits/WAESY_CONSOLIDATED_AUDIT_2026-11-17.md`

---

## Requisitos Normativos (Sintaxe EARS)

- **[REQ-M0-01] Integridade TypeScript & Script Dev:**  
  While executing `npm run dev` or `npm run typecheck`, the runtime shall allocate sufficient V8 heap (`--max-old-space-size=6144` in `dev`) and compile without baseline TypeScript errors, and `scripts/deploy-production-migrations.mjs` shall discover all SQL migrations dynamically from `supabase/migrations/` instead of stopping at a hardcoded pre-20270419 array.

- **[REQ-M1-01] Anti-SSRF no Image Proxy:**  
  When `fetchImageAsBase64` (`src/services/image-proxy.functions.ts`) receives an external image URL, the server shall require an authenticated `getServerIdentity()` session, validate protocol (`http`/`https`), block loopback/private/link-local hosts/IPv4/IPv6 CIDR targets, and enforce a safe size ceiling before fetching.

- **[REQ-M1-02] Isolamento Multi-Tenant & Autorização BFF:**  
  When `association.functions.ts`, `promotions.functions.ts`, or `pudo.functions.ts` (`listStorePudoPackages`) are invoked, the server shall authenticate via `getServerIdentity()`, enforce role membership via `assertStoreAccess(...)`, and filter database queries strictly by the authorized `store_id` (and membership role).

- **[REQ-M1-03] Autoridade Server-Side de Preços & Isolamento Anônimo:**  
  When `createQuickOrder`, `classifieds-events.functions.ts`, or `createDealProposal` processes checkout, ticket issuance, or direct booking, the server shall compute prices, fees, and discounts strictly from authoritative DB catalog records (products, classifieds, coupons, delivery RPC) and reject missing/archived items without hardcoded fallback UUIDs; anonymous loaders in `branded-app.functions.ts` and `customer-portal.functions.ts` shall never return private columns (`settings`, `pix_key`, `ai_knowledge_base`).

- **[REQ-M2-01] Hardening SQL / RLS / Buckets:**  
  When the new hardening migration executes, PostgreSQL shall:  
  1. Remove the hardcoded `'excelencia-tour%'` exemption from `check_store_vertical_quota` and restrict RPC execution strictly to authorized callers;  
  2. Revoke `PUBLIC` execute and verify tenant membership in `deduplicate_and_link_lead_to_customer`;  
  3. Enforce `wm.is_active = true` on `chat-media-private` and `recipes` storage/table policies and restrict `home-banners`/`home-categories` mutations to `public.is_platform_admin()`;  
  4. Provision missing buckets (`recipes`, `order-receipts`, `rma-proofs`) with strict owner/tenant RLS and synchronize `storage.functions.ts` (`ALLOWED_BFF_BUCKETS` and `getSignedUploadUrl`).

- **[REQ-M3-01] Erradicação de Stubs, Fake Modais & Silenciamento de Erros:**  
  When pixel conversions, studio AI refinements, complaints, community joins, voucher actions, or route loaders run, no handler shall return fake `setTimeout` success or synthetic console-only stubs (`dispatchPixelConversionEvent`, `sw-brand-generate`, `sw-briefing-generate`), and failures shall be logged once through canonical `logSystemError` (`schema_name`, `table_name`, `column_name`, `contract_name`, `page_url`) without swallowing DB failures silently in `admin-logs.functions.ts` or storefront critical loaders.

- **[REQ-M4-01] Pipeline Unificado de Mídia & Aspecto Zero-Drift:**  
  When any admin/workspace/customer form uploads images or documents, `crop-image.ts` shall preserve true `21:9` (`1920x823`) vs `28:9` (`1920x617`), duplicate `admin/builder/MediaUploader.tsx` (with `UnsplashAssetPicker`) shall be retired or delegate exclusively to the canonical bucket uploader without raw external Unsplash pickers, and raw media URL inputs (`customer-360-sidebar.tsx`, `UniversalDocumentStudio.tsx`, `admin-master.usuarios.tsx`, `workspace.clientes.$id.tsx`, `admin-master.faturas.tsx`) shall offer real Supabase bucket upload.

- **[REQ-M5-01] Integridade Carreira & InfoJobs:**  
  When editing career salary expectations or employer experience reviews, `professional-resume-editor.tsx` shall store exact centavos (no 100x corruption), `saveUserResume` (`resumes.functions.ts`) and `updateMemberResumeData` (`social.functions.ts`) shall synchronize `employer_reviews` with checked error logging, and `getEmployerProfileInsights` (`jobs.functions.ts`) + `getCompanyEmployerStats` (`social.functions.ts`) shall unify `employer_reviews` with application insights while omitting empty badges in `canonical-store-profile-view.tsx`.

- **[REQ-M6-01] Bilateralidade CMS & Desacoplamento Waesy Pro (`/app/:slug`):**  
  When rendering public marketplace surfaces (`surface-cms.functions.ts`), private SaaS stores (`waesy_marketplace_enabled = false` or `publish_to_marketplace = false`) shall be excluded, all registered CMS section types (`car_rentals`, `videos`, `classifieds_spotlight`, `single_store_spotlight`, `hotpage`, `category`, `top_sellers`) shall resolve real DB records without hardcoded fallback buttons, `getHotpageBySlug` shall enforce `isCampaignActive` + `city_filter`, `HomeMobileNativeApp` shall respect deactivated/empty CMS sections, `/app/:slug` checkout shall preserve app context instead of dropping users into marketplace `/checkout`, and legacy `/c/$storeSlug` collision shall redirect safely.

- **[REQ-M7-01] Navegação Limpa, Code-Splitting & Ergonomia DS4:**  
  When navigating workspace tools or mobile views, redirect-trap links in `workspace-navigation.ts` and `workspace-all-tools-dialog.tsx` shall point directly to canonical target routes, `src/lib/routes.ts` shall sync with active routes, route modules shall export clean defaults without code-splitting warnings, and dormant `ad-engine` / monolith duplication shall be cleanly scoped without breaking existing imports.
