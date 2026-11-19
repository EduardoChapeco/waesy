# Evidence Ledger — Proposal Web & Studio E2E Audit (2026-11-17)

## 1. Preflight Baseline
- **Branch:** `release/prod-20261113-fullpage-chat-copilot`
- **HEAD SHA:** `c0e1d351e1ac5feaeb77d0f88cc19df83f14267c`
- **Worktree State:** Preexisting dirty files (`.audit/`, `legacy_quarantine/`, `dead-code.report.json`, `design-lint.report.json`, `docs/design/DECISIONS.md`) preserved untouched.
- **Verification Constraint (`ask_question` A1/A2):**
  - Authorized at completion: Vitest suites, `node scripts/design-lint.mjs --ratchet`, `npm run typecheck`, `npm run build`.
  - Excluded per user choice: remote `supabase db push` and Browser E2E (Level 1 remote apply & Level 6 Browser E2E will be reported as not executed).

## 2. Bidirectional Architecture Map (`Studio <-> BFF <-> DB <-> Web & PDF <-> Checkout <-> CRM/Trip`)

| Layer | Inbound / Editing Path | Outbound / Consumption Path | Status at Baseline |
| --- | --- | --- | --- |
| **DB (`supabase/migrations/20270523000000`)** | `proposal_web_pages` w/ `FORCE ROW LEVEL SECURITY` + `is_store_staff(store_id)` | Read via `travel_proposals` join (`getTravelProposalById`, `getPublicTravelProposalByToken`) | Gap: missing `countdown_config`, `availability_config`, `payment_display_config`, `trust_badges_config`, `show_flight_route_map` |
| **Normalization (`src/lib/tourism/proposal-normalization.ts`)** | `normalizeAspectPreset`, `normalizeEntityMediaList`, `normalizeTransfersList`, `buildDefaultWebPageConfig` | Consumed by `StudioSidebarEditor`, `ProposalWebPageBuilder`, `ProposalCanvasRenderer`, `ProposalWebShowcase`, `travel-proposal.functions.ts` | Gap: `"auto"`/`"free"` forced to `"4 / 3"`; missing `gallery_mosaic_3`/`gallery_bento_4`, crop coords, `flight_route_map`/`faq`/`urgency_banner`, chronological transfer sorting |
| **Flight Map & Airports (`src/lib/tourism/flight-connections.ts`, `airport-intelligence.ts`, `tourism-airports.functions.ts`)** | `airports_global` (`getAirportsByIatasFn`, `searchGlobalAirports`), manual leg & connection IATA entry | `TravelFlightItineraryCard`, `ProposalWebShowcase`, PDF Templates | Gap: `FlightSegmentDTO` & `publicFlights` omit `connection_airports`/`legs`; no MapLibre geodesic arc map with layovers; no SVG route map in PDF templates |
| **BFF (`src/services/travel-proposal.functions.ts`, `travel-advisor-enrichment.server.ts`)** | `UpsertProposalWebPageSchema`, `upsertProposalWebPage`, `createTravelProposal`, `approveTravelProposal` | `getTravelProposalById`, `getPublicTravelProposalByToken`, `verifyTravelProposalAccessPin`, `askProposalSalesAdvisorAI` | Gap: PIN unlock query (`L2409`) omits `proposal_web_pages(*)`; public DTO strips/omits extended web configs & `connection_airports`; `buildFullProposalAdvisorContext` ignores `web_page` blocks |
| **Studio UI (`StudioSidebarEditor`, `ProposalWebPageBuilder`, `MediaGalleryField`, `ImageCropperDialog`, `workspace.turismo.propostas.$id.tsx`)** | Visual design, Hero/Gallery media upload + crop, flight & transfer editors, Web Page Builder | Saves to `travel_proposals` & `proposal_web_pages`; live switches between `Lâmina PDF` (`StudioFrame`) & `Página Web` (`ProposalWebShowcase`); exports PDF/PNG | Gap: Forbidden `Sparkles` icon (`B.50`); mobile `<44px` flight buttons; cropper not layout-slot aware; no timer/spots/payment/trust controls; no connection IATA autocomplete |
| **Public Web & Acceptance (`ProposalWebShowcase`, `_store.proposta.$token.tsx`, `TravelProposalCheckoutModal`)** | Receives public token DTO, selected option, payment preference & simulated installments | Renders Web Showcase, Commercial Investment Block, Interactive Flight Route Map, IA Advisor Sheet, Acceptance Modal (`approveTravelProposal`) | Gap: Ignores `hero_layout` variants (`split`/`gallery`/`gallery_mosaic_3`/`gallery_bento_4`/`immersive`/`minimal`), ignores `accent_color` contrast, static commercial box (no countdown/seats/simulator/trust badges), caption clipped inside `aspectRatio` box |
| **PDF Templates (`ProposalCanvasRenderer`, `blocks/UI.tsx`, 7 `Template*.tsx`, `src/lib/pdf-export.ts`)** | Reads `normalizeProposalForCanvas(proposal)` | Renders A4 / Landscape / Vertical / Bento flyers + exports multi-page PDF / HD PNG | Gap: `TemplateBentoGrid` uses `Sparkles` (`B.50`); `truncate` clips key labels (`B.44`); no CORS-free geodesic flight route SVG map; no numbered `01`/`02` chronological transfer sequence; continuous A4 PDF export lacks block-aware slicing |

## 3. Baseline Findings Register
- **F-01 (P1 Schema/Contract):** `20270523000000`, `ProposalWebPageDTO`, `UpsertProposalWebPageSchema`, and `publicWebPage` lack extended `hero_layout` values (`gallery_mosaic_3`, `gallery_bento_4`), media crop coordinates, `countdown_config`, `availability_config`, `payment_display_config`, `trust_badges_config`, `show_flight_route_map`, and extended blocks (`flight_route_map`, `faq`, `urgency_banner`).
- **F-02 (P0 Security/Public Projection):** `verifyTravelProposalAccessPin` (`src/services/travel-proposal.functions.ts:2409`) does not join `proposal_web_pages(*)`, stripping web customization after PIN unlock.
- **F-03 (P1 Media Fidelity):** `aspectPresetToCssValue` in `src/lib/tourism/proposal-normalization.ts:164-167` coerces `"auto"` and `"free"` to `"4 / 3"`, causing image crop distortion; `MediaItemViewer` places captions inside the `aspectRatio` overflow container.
- **F-04 (P1 Flight Logistics):** `FlightSegmentDTO` and `publicFlights` drop `connection_airports` and `legs`; no interactive geodesic `maplibre-gl` map with layover markers/tooltips or offline CORS-free SVG map in PDF templates exists.
- **F-05 (P1 Commercial Parity):** `ProposalWebShowcase` lacks real deadline countdown, optional seats badge, PIX/Card/Boleto/Financing UI, live `1x..Nx` installment simulator pre-filling `TravelProposalCheckoutModal`, and opt-in trust badges.
- **F-06 (P1 Transfers Order):** `normalizeTransfersList` does not sort by `sort_order`, `date`, `pickup_time`, and stage weight; templates lack clean chronological `01`, `02`, `03` badges.
- **F-07 (P1 Advisor & Export):** `buildFullProposalAdvisorContext` ignores `web_page` commercial/FAQ/urgency blocks; continuous PDF export slices tall content without respecting `.break-inside-avoid` boundaries.
- **F-08 (P0/P1 Design Lint):** Forbidden `Sparkles` icon present in `proposal-web-page-builder.tsx:15,318`, `proposal-web-showcase.tsx:18,995`, `studio-sidebar-editor.tsx:36,1152,1702,2667,2695`, and `TemplateBentoGrid.tsx:31,436`; `truncate` used on titles/destinations/clients (`B.44`); sub-44px flight buttons in `studio-sidebar-editor.tsx` (`DL-14`).

## 4. Verification Ledger (Updated Upon Completion)
- **Level 2 (Vitest):** Pending final execution.
- **Level 3 (Design Lint Ratchet):** Pending final execution.
- **Level 4 (Typecheck):** Pending final execution.
- **Level 5 (Build):** Pending final execution.
