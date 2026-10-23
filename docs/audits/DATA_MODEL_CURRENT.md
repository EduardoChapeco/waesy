# DATA_MODEL_CURRENT — Database & Type Contracts Inventory

## 1. Existing Database Tables (Supabase Postgres)
- `public.classifieds`: Stores public and unlisted travel packages (`category = 'travel'`, `attributes` JSONB containing `niche: 'viagem'`, `destination_city`, `departure_date`, `return_date`, `duration_text`, `meal_plan`, `adults_count`, `children_count`, `children_max_age`, `transport_type`, `flight_details`, `lodgings`, `bio_bullets`, `itinerary_days`, `story_highlights`, and payment flags).
- `public.global_hotels` & `public.hotel_aliases` (`20261008090000_global_hotels_deduplication.sql`): Canonical hotel registry with `pg_trgm` indexes on `normalized_name` and `normalized_alias`.
- `public.hotels_bank` & `public.destinations` (`20260903090000_hotels_bank_and_destinations.sql`): Agency/Master enriched hotel media, room categories, policies, structure, and destination guides.
- `public.travel_document_ingestions` (`20261006120000_canonical_travel_document_pipeline.sql`): Stores SHA-256 deduplicated OCR ingestions, `extraction` JSONB, `normalized_payload`, and `review_status`.
- `public.travel_quote_sessions`, `public.travel_offer_snapshots`, `public.travel_price_observations` (`20270214000001_travel_quote_sessions_and_price_history.sql`): Stores quote sessions, immutable offer snapshots (`expires_at`), and append-only price observations (`route_fingerprint`, `price_cents`, `advance_days`).
- `public.travel_price_history` (`src/services/travel-ai-extractor.functions.ts`): Package price history snapshots.

## 2. Canonical Domain Extensions (`src/lib/travel/excelencia-offer-engine.ts`)
To unify Classifieds, Proposals, and Story Studio without breaking existing database tables:
- `TravelOffer` serializes cleanly into `classifieds.attributes.excelencia_offer` and maps bi-directionally to `classifieds` columns + `ExtractedTravelAdDTO`.
- `StoryDocument` and `GlassMaterial` serialize into `classifieds.attributes.story_document` so any saved offer preserves its exact 9:16 scene graph, text-fit parameters, and frosted/liquid glass settings.
- `PriceObservation` normalizes every extracted or published offer into the global price-memory contract (`originIata`, `destination`, `hotelId`, `roomType`, `mealPlan`, `partySignature`, `priceBasis`, `totalPrice`, `installmentCount`, `installmentAmount`).
