# SPEC-PROPOSAL-WEB-AND-STUDIO-E2E — Bidirectional Proposal Web, Studio & PDF Ecosystem

## 1. Scope & Governance
- **Normative References:** `AGENTS.md` (B.4, B.7, B.8, B.25, B.31, B.33, B.42–B.51), `docs/design/DESIGN.md`, `docs/design/DESIGN-LINT.md`, `docs/audits/WAESY_EVIDENCE_LEDGER_PROPOSALS_2026-11-17.md`.
- **Authorized File Tree:**
  - **Virgin Files:**
    - `supabase/migrations/20270604000000_proposal_web_pages_full_controls_and_media.sql`
    - `src/lib/tourism/flight-route-geometry.ts`
    - `src/lib/tourism/proposal-payment-calc.ts`
    - `src/components/tourism/shared/FlightRouteMap.tsx`
    - `src/components/tourism/shared/FlightRouteSvgMap.tsx`
    - `src/components/tourism/shared/ProposalCommercialPanel.tsx`
    - New/extended unit test suites in `src/lib/tourism/` & `src/services/`
  - **Surgical Edits (`edit_file` only):**
    - `src/lib/tourism/proposal-normalization.ts`
    - `src/lib/tourism/proposal-theme-palettes.ts`
    - `src/lib/pdf-export.ts`
    - `src/services/travel-proposal.functions.ts`
    - `src/services/travel-advisor-enrichment.server.ts`
    - `src/components/ui/image-cropper-dialog.tsx`
    - `src/components/ui/media-gallery-field.tsx`
    - `src/components/tourism/studio/proposal-web-page-builder.tsx`
    - `src/components/tourism/studio/studio-sidebar-editor.tsx`
    - `src/components/tourism/studio/proposal-web-showcase.tsx`
    - `src/components/tourism/studio/travel-proposal-checkout-modal.tsx`
    - `src/components/tourism/studio/proposal-canvas-renderer.tsx`
    - `src/components/classifieds/travel-flight-itinerary-card.tsx`
    - `src/components/tourism/proposals/templates/blocks/UI.tsx`
    - `src/components/tourism/proposals/templates/Template*.tsx` (7 templates)
    - `src/routes/workspace.turismo.propostas.$id.tsx`
    - `src/routes/_store.proposta.$token.tsx`

---

## 2. EARS Normative Requirements

### [EARS-01] Extended Schema, Validation & Public/PIN Projection (`proposal_web_pages`)
1. **THE SYSTEM SHALL** extend `public.proposal_web_pages` via idempotent migration `20270604000000_proposal_web_pages_full_controls_and_media.sql` with `countdown_config`, `availability_config`, `payment_display_config`, `trust_badges_config` (`jsonb`), and `show_flight_route_map` (`boolean`), preserving `FORCE ROW LEVEL SECURITY` and `is_store_staff(store_id)` policies.
2. **WHEN** `upsertProposalWebPage` or `createTravelProposal` persists a web page configuration, **THE SYSTEM SHALL** validate all Zod optional/nullable fields (`B.25`) including `theme_preset` (`editorial`, `modern`, `dark`, `boutique`), `accent_color` (WCAG contrast-checked hex or null), `hero_layout` (`split`, `gallery`, `gallery_mosaic_3`, `gallery_bento_4`, `immersive`, `minimal`), extended `hero_media[]` crop/video metadata, extended `blocks[]` (`flight_route_map`, `faq`, `urgency_banner`, `cta`, `gallery`, `video`, `custom_text`), and commercial controls.
3. **WHEN** a client unlocks a PIN-protected proposal via `verifyTravelProposalAccessPin` or loads `getPublicTravelProposalByToken`, **THE SYSTEM SHALL** join `proposal_web_pages(*)` and project sanitized public fields (`publicWebPage`, `publicFlights` with `connection_airports` and `legs`) with zero staff/internal PII or credential leakage.

### [EARS-02] Interactive Flight Route Map & Automatic Layovers (Web + PDF/PNG)
1. **WHERE** flights contain origin, destination, explicit `legs`, or `connection_airports` (including via IATA autocomplete backed by `searchGlobalAirports` in `StudioSidebarEditor`), **THE SYSTEM SHALL** resolve airport coordinates via `getAirportsByIatasFn` (`public.airports_global`) merged with curated fallback coordinates in `flight-route-geometry.ts`.
2. **WHEN** rendering `TravelFlightItineraryCard` or `ProposalWebShowcase` (with `show_flight_route_map !== false`), **THE SYSTEM SHALL** render an interactive `maplibre-gl` map (`getCanonicalMapStyle(..., "osm_standard")`, `preserveDrawingBuffer: true`) with geodesic curved arcs (`Ida` vs `Volta` legend), distinct origin/layover/destination markers, layover hover/click info, legal disclaimer, and deterministic `<svg>` fallback if map initialization fails or in offline environments.
3. **WHEN** rendering `ProposalCanvasRenderer` and PDF templates with flights, **THE SYSTEM SHALL** render the CORS-free vector `<FlightRouteSvgMap />` with great-circle arcs, airport codes, and connection indicators so PNG/PDF exports never fail due to third-party raster CORS tainting.

### [EARS-03] Media, Video & Layout-Matched Crop Fidelity
1. **WHEN** `aspectPreset` is `"auto"` or `"free"`, `aspectPresetToCssValue` **SHALL** return `undefined` (preserving natural proportions without forcing `4 / 3`), while returning exact CSS ratios for `"16:9"`, `"4:3"`, `"1:1"`, `"4:5"`, `"9:16"`, and `"21:9"`.
2. **WHEN** editing hero media in `ProposalWebPageBuilder`, **THE SYSTEM SHALL** derive per-slot target aspect presets from the active `hero_layout` (`immersive` -> `21:9`, `gallery_mosaic_3` slot 0 -> `16:9` / slots 1..2 -> `4:3`, `gallery_bento_4` -> `4:3` & `1:1`, `split`/`gallery` -> `16:9` / `4:3`) and pass slot hints to `MediaGalleryField` and `ImageCropperDialog`.
3. **THE SYSTEM SHALL** persist crop coordinates (`crop_x`, `crop_y`, `crop_width`, `crop_height`, `image_scale`, `video_poster_url`, `slot_role`) via `MediaGalleryField` & `ImageCropperDialog`, apply focal framing to both `<img>` and `<video>`, and render captions outside media aspect masks.

### [EARS-04] Commercial Investment Block, Interactive Installments, Trust & Urgency
1. **WHEN** `ProposalWebShowcase` renders investment & booking sections, **THE SYSTEM SHALL** use `<ProposalCommercialPanel />` in parity with classifieds:
   - Display live countdown ONLY when `countdown_config.enabled === true` and deadline is valid & in future (never fabricated).
   - Display spots badge ONLY when `availability_config.enabled === true` and `spots_remaining > 0`.
   - Render enabled payment method cards (PIX w/ discount, Credit Card w/ max installments & interest info, Boleto, Financing) and an interactive `1x..Nx` installment simulator derived purely from `proposal-payment-calc.ts`.
   - Render trust badges ONLY for agency-selected items in `trust_badges_config`.
2. **WHEN** the user activates checkout after selecting a payment method/installment count in `<ProposalCommercialPanel />`, **THE SYSTEM SHALL** pre-fill `TravelProposalCheckoutModal` with that preference and installment count.
3. **THE SYSTEM SHALL** render all 6 `hero_layout` variants (`split`, `gallery`, `gallery_mosaic_3`, `gallery_bento_4`, `immersive`, `minimal`), all 4 `theme_preset` palettes (`editorial`, `modern`, `dark`, `boutique`), and WCAG 2.2 AA contrast-safe `accent_color` styling without hardcoded inline clutter or containeritis.

### [EARS-05] Chronologically Ordered Transfers (`01`, `02`, `03`...)
1. **THE SYSTEM SHALL** normalize and stably sort transfers chronologically (`sort_order` -> `date` -> `pickup_time` -> stage rank `arrival < intercity < bus < round_trip < service < departure` -> original index) in `normalizeTransfersList`.
2. **THE SYSTEM SHALL** display chronological sequence badges (`01`, `02`, `03`...) consistently across `ProposalWebShowcase`, `StudioSidebarEditor`, and all 7 PDF templates.

### [EARS-06] Contextual AI Advisor, Acceptance Integrity & Multi-Page CORS-Safe Export
1. **WHEN** `buildFullProposalAdvisorContext` constructs prompt context for `askProposalSalesAdvisorAI`, **THE SYSTEM SHALL** include `web_page` blocks (`faq`, `urgency_banner`, `custom_text`), payment conditions, countdown deadline, seats remaining, and selected option details.
2. **WHEN** exporting PDFs in `exportElementAsPdf`, **THE SYSTEM SHALL** align continuous A4 page breaks cleanly with `.break-inside-avoid` block boundaries (preventing split text/cards) while preserving multi-page `.document-page`/`.a4-page` and high-DPI PNG fidelity without tainted canvas errors.

### [EARS-07] Consolidation & Design Compliance (`DL-01`–`DL-33`, `B.44`, `B.50`)
1. **THE SYSTEM SHALL NOT** use `Sparkles` anywhere in proposal Studio, Showcase, or PDF templates (`B.50`).
2. **THE SYSTEM SHALL NOT** truncate essential titles, destinations, client names, or package metrics (`B.44`), ensure `>= 44px` (`min-h-11`) mobile touch targets (`DL-14`), keep sticky bars `z-30` below modals `z-50` (`B.34`), avoid card-in-card containeritis (`DL-31`), and pass `node scripts/design-lint.mjs --ratchet`, `npm run typecheck`, and `npm run build` with Exit Code 0.

---

## 3. Acceptance Evidence Criteria
- Vitest regression suites pass reproducing baseline bugs and proving fixes across positive/negative boundaries.
- Static Design Lint (`node scripts/design-lint.mjs --ratchet`), TypeScript (`npm run typecheck`), and Production Build (`npm run build`) exit 0 after the final edit.
- Remote `supabase db push` and Browser E2E explicitly documented as omitted per user instruction (`A2`).
