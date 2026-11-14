# SPEC-20261113-OMNI-EDITOR-CMS-WIX-PARITY

**Status:** Approved for Implementation  
**Date:** 2026-11-13  
**Owner:** Waesy Platform Architecture  
**Scope:** Omni Editor (`OmniEditor`), Viewport Preview Containment (`BuilderViewportFrame`, `LiveTemplatePreviewModal`), Global Header/Footer & Navigation (`SiteHeaderBlock`, `SiteFooterBlock`, `WixMenuManagerDrawer`, `workspace.cms.navegacao`), Real 4-Layer Custom CMS Collections (`cms_collections`, `cms_collection_fields`, `cms_collection_items`, `cms-collections.functions.ts`, `WixCmsCollectionManagerModal`, `BuilderCmsPanel`), Multi-page Sync & Public Renderer Integrity (`OmniPageRenderer`, `_store.paginas.$slug.tsx`, `workspace.builder.$documentId.editor.tsx`).

---

## 1. Problem Statement & Root Causes Identified

1. **Canvas Frame Escape & Viewport Breakage (`OmniEditor.tsx`, `LiveTemplatePreviewModal.tsx`, `HeroMinimalSplit.tsx`, `IFoodHeader.tsx`):**
   - `<main>` in `OmniEditor.tsx` lacks `min-w-0 overflow-hidden` containment and scale-to-fit viewport framing; desktop logical layouts (`1280px`) squish into the ~620px gap between sidebars while Tailwind media queries (`md:`, `lg:`) react to the outer browser window rather than the simulated viewport (`desktop`, `tablet`, `mobile`, `native_app`).
   - Preview frames lack a CSS `transform` containing block, allowing `position: fixed` overlays (gallery lightbox, floating bars) and sticky headers inside blocks to escape to the outer browser window instead of scrolling inside the viewport frame.
   - `IFoodHeader` uses `md:hidden`, making `vitrine_ifood_header` invisible inside Mobile / Native App preview when opened from a desktop browser.
2. **Crushed Layers Controls & Missing Section Authoring Ergonomics (`OmniEditor.tsx`, `types.ts`):**
   - `w-80` Layers drawer places five `size-11` (`44px`) action buttons on the same row as the section label, leaving ~50px for the block name.
   - No drag-and-drop section reordering or inline "Insert Above / Below" flow on the canvas/layers panel.
   - `OmniPageDocumentSchema.theme` strips `headingFont`, `bodyFont`, and `surfaceStyle` during Zod parsing, and `appNavConfig` / `buttonStyler` live only in component `useState` without being saved to Supabase or applied in `OmniPageRenderer`.
3. **Missing Global Headers, Footers & Navigation Connectivity (`registry.ts`, `BuilderWixStudioPanels.tsx`, `workspace.cms.navegacao.tsx`, `_store.tsx`):**
   - `SITE_BUILDER_BLOCKS` has news-only headers/footers (`news_promethee_header`, `news_promethee_footer`) and mobile header (`vitrine_ifood_header`), with no universal configurable `site_header` or `site_footer` block synchronized with `navigation_menus` (`header_nav`, `footer_menu`, `main-menu`).
   - `WixMenuManagerDrawer` lacks `footer_menu`, and `workspace.cms.navegacao.tsx` is hardcoded to edit only `main-menu` with static non-interactive `GripVertical` icons and disabled handle editing even on canonical synthetic IDs.
   - `PublicFooter` (`src/components/commerce/public-footer.tsx`) is unused dead code, and `_store.tsx` fetches `menus` without forwarding them cleanly.
4. **Hardcoded Fake CMS Tables & Counts (`BuilderWixStudioPanels.tsx`, `builder-cms-panel.tsx`):**
   - `WixCmsCollectionManagerModal` renders hardcoded in-memory arrays (`rows` and `fields` `useState`) with zero Supabase tables (`cms_collections` does not exist in `supabase/migrations/`).
   - `BuilderCmsPanel` hardcodes `reviews: 12` and omits real store counts (`classifieds`, `events`, `jobs`, `posts`, `customCollections`).
5. **Editor Dataset Gaps & Public Draft Leak (`workspace.builder.$documentId.editor.tsx`, `_store.paginas.$slug.tsx`):**
   - Editor route loader loads only `products`, `categories`, `collections` freshly, omitting live `classifieds`, `posts`, `flyers`, `events`, `jobs`, `stores`, `banners`, `hotpages`, `navigationMenus`, and `cmsCollections`.
   - `_store.paginas.$slug.tsx` falls back to `document?.settings?.omni_page_draft`, leaking unpublished draft content to anonymous public visitors, and omits `collections` on `OmniPageRenderer`.

---

## 2. EARS Requirements

### REQ-01 — Contained Responsive Viewport Frame with Internal Scroll
- **WHERE** the user opens the desktop/tablet/mobile/native_app preview in `OmniEditor` or `LiveTemplatePreviewModal`, **THE SYSTEM SHALL** mount the rendered page inside a `BuilderViewportFrame` component featuring an isolated horizontal clip boundary (`overflow-x-hidden`), internal vertical scrollport (`overflow-y-auto`), logical device width (`desktop: 1280px`, `tablet: 768px`, `mobile: 390px`, `native_app: 390px`), `transform` scale-to-fit zoom calculation (`Auto Fit`, `50%`, `75%`, `100%`), and a CSS `transform` containing block so all `position: fixed` and `position: sticky` block elements stay strictly inside the preview frame.
- **WHEN** `BuilderViewportProvider` forces `"mobile"` viewport in editor preview, **THE SYSTEM SHALL** instruct responsive Vitrine/Omni blocks (`IFoodHeader`, `VitrineStoresFeedListBlock`, `HeroMinimalSplit`, `HeroInteractiveCarousel`, `TestimonialsSocialProof`, `BentoAsymmetricGrid`, `MediaGalleryMosaic`, `SiteHeaderBlock`, `SiteFooterBlock`) to respect `useEffectiveViewport().isMobile` instead of leaking desktop multi-column or `md:hidden` rules from the host browser window.

### REQ-02 — Complete Section & Theme Authoring, Drag-and-Drop & Persistence
- **WHEN** the user views the Layers panel (`dockedPanel === "layers"`) in `OmniEditor`, **THE SYSTEM SHALL** render each block item with readable full-width title/category metadata on top and a dedicated 44px-compliant action row below (`Ocultar/Exibir`, `Subir`, `Descer`, `Duplicar`, `Inserir Abaixo`, `Excluir`), plus native HTML5 Drag-and-Drop (`draggable`, `onDragStart`, `onDragOver`, `onDrop`) across both Layers items and Canvas blocks.
- **WHEN** the user edits Global Theme (`headingFont`, `bodyFont`, `surfaceStyle`, palette colors, `borderRadius`), Branded App Nav (`appNavConfig`), or Global Button Styler (`buttonStyler`), **THE SYSTEM SHALL** validate and persist all properties inside `OmniPageDocumentSchema` (`theme` + `settings.appNavConfig` + `settings.buttonStyler`) on Save and Publish, and render them symmetrically in both `OmniEditor` and `OmniPageRenderer`.

### REQ-03 — Global Headers, Footers & Unified Navigation Menus
- **THE SYSTEM SHALL** register canonical `site_header` and `site_footer` blocks in `SITE_BUILDER_BLOCKS` (`registry.ts`) and `CANONICAL_BUILDER_BLOCK_IDS` (`types/omni-builder.ts`) supporting logo, store name, tagline, configurable CTA/search/contact, 4 header scroll behaviors (`scrolls_with_site`, `freezes`, `disappears`, `fades_out`), multi-column footer links, and dynamic menu binding to `navigation_menus` handles (`header_nav`, `footer_menu`, `main-menu`).
- **WHEN** editing navigation in `WixMenuManagerDrawer` or `/workspace/cms/navegacao`, **THE SYSTEM SHALL** expose menu selection (`header_nav`, `footer_menu`, `bottom_nav`, `explore_menu`, `main-menu`), item ordering controls (`Subir`, `Descer`, `Remover`), icon/media bucket upload, and real Postgres persistence via `upsertNavigationMenu`.
- **THE SYSTEM SHALL** expose quick actions in `OmniEditor` to insert or synchronize Global Header & Footer across pages cleanly.

### REQ-04 — Real 4-Layer CMS Collections & Media Gallery Integration
- **THE SYSTEM SHALL** define tables `public.cms_collections`, `public.cms_collection_fields`, and `public.cms_collection_items` via idempotent migration `supabase/migrations/20270402000000_cms_collections_unified_schema.sql` with multi-tenant RLS (`store_id`, `is_platform_admin()`, public read strictly for `is_public = true` collections and `status = 'published'` items).
- **THE SYSTEM SHALL** implement typed BFF endpoints in `src/services/cms-collections.functions.ts` (create/list/update/delete collections, fields, and items + public collection dataset resolution), adhering to `AGENTS.md B.25`.
- **WHERE** the user opens `WixCmsCollectionManagerModal` or `BuilderCmsPanel` in `OmniEditor`, **THE SYSTEM SHALL** display real Postgres records and real store collection counts (replacing all dummy `rows`, dummy `fields`, and hardcoded `count: 12`), allow creating new custom collections/columns/rows synced to Supabase, allow binding `cms_collection` in `UniversalBlockInspector` and `CmsCollectionGridBlock`, and allow editing active section spreadsheet rows seamlessly.

### REQ-05 — Multi-Page Consistency, Full Data Hydration & Public Draft Protection
- **WHEN** loading `/workspace/builder/$documentId/editor`, **THE SYSTEM SHALL** load complete storefront datasets (`products`, `categories`, `collections`, `classifieds`, `posts`, `flyers`, `events`, `jobs`, `stores`, `banners`, `hotpages`, `storeData`, `navigationMenus`, `cmsCollections`, `reviewsCount`) and sibling pages (`listExperienceDocuments`), enabling page switching without losing context and persisting `WixVisualSitemapModal` SEO/GEO/permission/noindex metadata via `updateExperienceDocumentSettings`.
- **WHERE** an anonymous visitor accesses `/paginas/$slug` (`src/routes/_store.paginas.$slug.tsx`), **THE SYSTEM SHALL NOT** fall back to `document.settings.omni_page_draft`; only `omni_page_published` or published `omni_page` snapshots shall be rendered publicly, hydrated with full `collections`, `cmsCollections`, and `navigationMenus` (and rendering `PublicFooter` fallback only if footer items exist and no `site_footer` / `news_promethee_footer` block is already present).

---

## 3. Verification Criteria & Gates
1. Vitest regression suite covering:
   - `BuilderViewportFrame` fixed/sticky containment & zoom scaling classes + mobile `useEffectiveViewport()` parity;
   - `OmniPageDocumentSchema` preservation of `headingFont`, `bodyFont`, `surfaceStyle`, `site_header`, `site_footer`, `cms_collection_grid`, and `settings.appNavConfig` / `buttonStyler`;
   - `cms-collections.functions.ts` Zod schemas, multi-tenant CRUD paths, and zero dummy data in `WixCmsCollectionManagerModal` / `BuilderCmsPanel`;
   - `_store.paginas.$slug.tsx` public draft leak guard (regression check ensuring `omni_page_draft` is never rendered publicly);
   - Navigation multi-menu handles (`header_nav`, `footer_menu`, `bottom_nav`, `explore_menu`, `main-menu`) and reordering in `workspace.cms.navegacao.tsx` & `WixMenuManagerDrawer`.
2. Clean gates: `npm.cmd run typecheck`, `npx.cmd vitest run ...`, `node scripts/design-lint.mjs --ratchet`, `npm.cmd run audit:buttons`, `npm.cmd run check:bff`, `npm.cmd run check:cycles`, `npm.cmd run check:tokens`, `npx.cmd eslint --quiet ...`, and `npm.cmd run build`.
3. Note on Supabase SQL migration: Migration file created cleanly in `supabase/migrations/`; per `AGENTS.md B.31`, do NOT apply remote database push unless explicitly authorized.
