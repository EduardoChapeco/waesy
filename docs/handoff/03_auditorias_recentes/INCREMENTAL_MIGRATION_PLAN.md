# INCREMENTAL_MIGRATION_PLAN — Excelência Tour Consolidation

## Guiding Principle
Preserve 100% of working routes, BFF contracts, and database schemas (`classifieds`, `global_hotels`, `hotels_bank`, `destinations`, `travel_price_observations`) while introducing the canonical **Excelência Tour Engine** as a composable domain and UI layer.

## Execution Phases

### Phase 1 — Canonical Domain & Commercial Engine (`src/lib/travel/excelencia-offer-engine.ts`)
1. Define `ExtractedField<T>`, `TravelParty`, `RoomOccupancy`, `PriceBasis`, `OfferPricing`, `PaymentCampaign`, `PaymentTermsSnapshot`, `TravelOffer`, and `ReviewFlag`.
2. Implement `parseRawQuoteToTravelOffer()` to extract structured offers from supplier text/OCR payloads (dates, IATA codes, flight times, hotel, meal plan, occupancy, installments `10x/12x/15x/16x`, total/per-person basis) with field-level evidence and confidence.
3. Implement `validateTravelOfferCommercials()` to catch arithmetic mismatches, date inversions, occupancy ambiguity, and unsupported meal plans.
4. Implement `resolveHotelCatalogMatch()` with canonical hotel/destination entities and supplier alias normalization (`Occidental Punta Cana`, `Occidental P. Cana`, `Barceló Occidental Punta Cana` -> `hotel-occidental-punta-cana`).
5. Implement `selectStoryInclusions()` (2 to 4 dynamic slots, priority 1–6, explicit reason codes, zero hallucination) and `fitStoryTitle()` (single-line vs balanced two-line fit, font size, tracking, and duplicated title shadow CSS variables).
6. Implement `StoryDocument` (1080×1920 9:16 scene graph) + `applyStoryAiCommand()` / `applyStoryEditOperations()` for natural-language and direct-manipulation edits.
7. Implement `generateWhatsAppOfferCopy()` (omitting flight times by default, enforcing the strict `"HOJE"` rule in `America/Sao_Paulo`, and embedding the public offer link).
8. Implement `evaluateOfferLifecycleState()` (24h rapid-offer expiration + archival) and `buildPriceObservation()` (append-only global price memory).

### Phase 2 — Figma Frosted / Liquid Glass Engine (`src/lib/travel/liquid-glass-engine.ts` & `src/components/travel/liquid-glass-surface.tsx`)
1. Define `GlassMaterial` contract with `fill`, `radius`, `border`, `backdrop`, `optics` (`lightAngleDeg`, `lightIntensity`, `refraction`, `depth`, `dispersion`, `frost`, `splay`), `noise`, `innerShadow`, `outerShadow`, `edgeHighlight`, and `reflection`.
2. Provide the 5 canonical presets: `saved_offer_glass` (~19–20% fill, balanced frost/refraction), `heavy_frost` (Preset A), `dark_glass` (Preset B), `clear_lens`, and `subtle_glass`.
3. Build `<LiquidGlassSurface />` rendering layered CSS `backdrop-filter` + inline SVG `<filter>` (`feTurbulence` noise, `feGaussianBlur` frost, `feDisplacementMap` refraction/splay, and R/G/B `feColorMatrix` + `feOffset` chromatic dispersion) with automatic `exportSafe` / `reduced-motion` fallback.

### Phase 3 — Bidirectional Studio & Surface Integration
1. Build `<ExcelenciaOfferStudioSheet />` (`src/components/tourism/promotional-flyer/excelencia-offer-studio-sheet.tsx`) with Desktop-Native 3-pane workspace (Intake/Inspector, 9:16 Interactive Artboard, Glass/Layer/WhatsApp Controls + AI Command Bar) and Mobile-Native bottom-sheet tabs.
2. Upgrade `TravelPromoFlyerModal` (`src/components/tourism/promotional-flyer/travel-promo-flyer-modal.tsx`) and `_store.conta.classificados.novo.tsx` / `EditorialShowcaseView` so users can open the unified Excelência Tour Offer & Story Studio and view the 24h rapid-offer validity/expired state on public pages.

### Phase 4 — Automated Verification & Design Lint Ratchet
1. Create `src/lib/travel/excelencia-offer-engine.test.ts` covering all Section 26 test scenarios.
2. Run Vitest and `node ./scripts/design-lint.mjs --ratchet` with 0 regressions.
