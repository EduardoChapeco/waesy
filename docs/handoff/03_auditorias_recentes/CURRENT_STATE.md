# CURRENT_STATE — Excelência Tour Offer Intake, Package Engine, Story Builder & Glass Rendering

## 1. Executive Summary
The Waesy repository already contains foundational building blocks for Travel / Tourism classifieds (`niche.id === "viagem"`), Operator OCR (`travel-ai-extractor.functions.ts`, `travel-operator-ocr.functions.ts`, `travel-canonical-pipeline.functions.ts`), Central Hotel & Destination Catalogs (`global_hotels`, `hotel_aliases`, `hotels_bank`, `destinations`, `GLOBAL_HOTELS_RESORTS_CATALOG`), Promotional Story Templates (`TravelPromoFlyerModal`, `TravelPromoArtboard`, `TravelTemplateEditorial`), Public Travel Showcase (`EditorialShowcaseView` / `_store.proposta.$token.tsx`), and Price History (`travel_price_observations`, `travel_price_history`).

However, these capabilities currently operate as loosely coupled modules rather than a unified **Excelência Tour Intelligent Offer Intake -> Canonical TravelOffer -> StoryDocument (9:16) + Liquid Glass Engine -> WhatsApp Copy + 24h Rapid Offer Lifecycle** pipeline.

---

## 2. Inventory of Existing Modules

| Capability | Existing Files | Current Status |
|---|---|---|
| **Multimodal Intake (Print / PDF / Text)** | `src/components/tourism/promotional-flyer/travel-ai-importer-banner.tsx`, `src/services/travel-ai-extractor.functions.ts`, `src/services/travel-operator-ocr.functions.ts`, `src/services/travel-canonical-pipeline.functions.ts` | Supports image/PDF base64 and raw text via `executeUnifiedAiCall`. Lacks field-level provenance (`ExtractedField<T>`), room occupancy reconciliation, and campaign-aware payment extraction. |
| **Hotel & Destination Catalog** | `supabase/migrations/20261008090000_global_hotels_deduplication.sql`, `src/services/travel-catalog.functions.ts`, `src/lib/data/hotels-resorts-catalog.ts` | Database tables `global_hotels`, `hotel_aliases`, `hotels_bank`, and `destinations` exist, plus `GLOBAL_HOTELS_RESORTS_CATALOG`. Matching in `parseTravelMediaAI` currently uses single `.ilike()` without alias/trigram candidate ranking (`Occidental Punta Cana` vs `Occidental P. Cana` vs `Barceló Occidental Punta Cana`). |
| **Package Creator & CMS** | `src/routes/_store.conta.classificados.novo.tsx` (lines 4785–5948) | Rich form for `niche.id === "viagem"` with adults/children counts, transport modes (`airplane`, `bus`, `combo`, `cruise`, `car`, `hotel_only`), lodgings, bio bullets, story highlights, and day-by-day itinerary. |
| **Public Package / Offer Showcase** | `src/components/classifieds/editorial-showcase-view.tsx`, `src/routes/_store.proposta.$token.tsx` | Renders public package showcase and proposal token view. Lacks automatic 24h rapid-offer expiration banner (`"Oferta expirada — consulte valor atualizado"`) that preserves lead conversion without a hard 404. |
| **Story / Promotional Flyer Builder** | `src/components/tourism/promotional-flyer/travel-promo-flyer-modal.tsx`, `src/components/tourism/promotional-flyer/travel-promo-artboard.tsx`, `src/components/social-templates/TravelTemplateEditorial.tsx` | Fixed React template props (`TravelPromoData`). Lacks a scene-graph `StoryDocument`, deterministic 2–4 inclusion selector with reason telemetry, dynamic title text-fit with duplicated shadow layer, structured AI edit operations, and Figma-grade Frosted/Liquid Glass controls. |
| **WhatsApp Copy Generator** | `src/components/tourism/studio/proposal-share-whatsapp-modal.tsx` | Static string interpolation for proposals. Does not implement the Excelência Tour rapid-offer WhatsApp format (omitting flight times by default, strict `"HOJE"` rule in `America/Sao_Paulo`, and automatic public offer link injection). |
| **Price History & Memory** | `supabase/migrations/20270214000001_travel_quote_sessions_and_price_history.sql`, `src/services/travel-ai-extractor.functions.ts` | `travel_price_observations` and `travel_price_history` tables exist. Needs canonical `PriceObservation` normalization across occupancy, price basis, and payment campaigns. |
