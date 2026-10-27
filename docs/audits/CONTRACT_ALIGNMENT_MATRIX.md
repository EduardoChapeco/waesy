# CONTRACT_ALIGNMENT_MATRIX.md — Matriz de Alinhamento de Contratos (Frontend ↔ BFF ↔ DB ↔ Public Renderer)

**Data:** 2026-10-21
**Status:** Auditado & Alinhado

---

## 1. Matriz de Alinhamento Ponta a Ponta (`classifieds`)

| Campo / Atributo | UI Editor (`_store.conta.classificados.novo.tsx`) | BFF Input (`upsertClassifiedInput`) | DB Column / JSONB (`public.classifieds`) | BFF Public Serializer (`sanitizePublicClassifiedAttributes`) | Public Renderer (`UniversalClassifiedShowcase` / `resolveClassifiedDetailedSpecs`) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Nicho Ativo** | `niche.id` | `attributes.niche`, `category` | `category` + `attributes->'niche'` | Permitido (`niche`, `category`) | `attrs.niche` / `classified.category` | Alinhado |
| **Template Selecionado** | `templateStyle` (`ClassifiedTemplateStyle`) | `attributes.template_style` | `attributes->'template_style'` | Permitido (`template_style`, `template_id`) | `attrs.template_style` | Alinhado |
| **Modo de Exibição** | `displayMode` (`showcase` \| `feed_card`) | `attributes.display_mode` | `attributes->'display_mode'` | Permitido (`display_mode`) | `attrs.display_mode` | Alinhado |
| **Turismo / Viagem** | `travelDestinationCity`, `travelDuration`, `travelMealPlan`, `travelFlightDetails`, `travelLodgings`, `travelItineraryDays` | `attributes.{destination_city, duration_text, meal_plan, flight_details, lodgings, itinerary_days, story_highlights, bio_bullets, departure_options}` (Restrito a `niche.id === "viagem"`) | `attributes` JSONB | Permitido em `CLASSIFIED_PUBLIC_ALLOWLIST_EXTRA` | `EditorialShowcaseView` / `ClassifiedDetailDesktop` / `ClassifiedDetailMobile` | Corrigido (Antes bloqueado para visitantes e vazado em outros nichos) |
| **Veículos** | `vehicleBrand`, `vehicleModel`, `vehicleVersion`, `vehicleYearFab`, `vehicleYearModel`, `vehicleKm`, `vehicleFuel`, `vehicleTransmission`, `vehicleColor`, `vehicleFeatures` | `attributes.{brand, model, version, year_fab, year_model, mileage_km, fuel_type, transmission, color, features, provenance}` | `attributes` JSONB | Permitido (`year_fab`, `year_model`, `mileage_km`, `fuel_type`, `transmission`, `features`, `provenance`) | `resolveClassifiedDetailedSpecs` (`isVehicle`) + Template `automotivo` | Corrigido (Antes `year_fab`, `year_model`, `mileage_km` removidos pelo serializer público) |
| **Imóveis & Hospedagem** | `reDealType`, `rePropertyType`, `reAreaSqm`, `reBedrooms`, `reSuites`, `reBathrooms`, `reParking`, `reCondoCents`, `reIptuCents`, `reFurnished`, `reAmenities` | Colunas top-level + `attributes.{deal_type, property_type, area_sqm, bedrooms, suites, bathrooms, parking_spots, condo_cents, iptu_cents, furnished, amenities, max_guests, cleaning_fee_cents, checkin_time, checkout_time, house_rules}` | Colunas top-level (somente para `real_estate`) + `attributes` JSONB | Permitido em `CLASSIFIED_PUBLIC_ALLOWLIST_EXTRA` | `resolveClassifiedDetailedSpecs` (`isRealEstate` / `isHospitality`) + Templates `imobiliario` / `resort_hotel` | Corrigido (Zero poluição de `deal_type="venda"` ou `max_guests=1` em outros nichos) |
| **Serviços & Assinaturas** | `serviceModality`, `serviceArea`, `serviceDuration`, `serviceBookingEnabled`, `serviceAvailableDays`, `serviceHoursStart`, `serviceHoursEnd`, `serviceSubNiche`, `serviceSpecialty`, `serviceProfessionalCouncil` | Colunas top-level + `attributes.{modality, service_area, estimated_duration, service_duration_minutes, booking_enabled, available_weekdays, working_hours_start, working_hours_end, available_slots, service_subniche, specialty, professional_council}` | Colunas top-level + `attributes` JSONB | Permitido em `CLASSIFIED_PUBLIC_ALLOWLIST_EXTRA` | `resolveClassifiedDetailedSpecs` (`isServices` / `isSubscription`) + Template `servicos_agenda` | Corrigido |
| **Mercado, Gastronomia & Farmácia** | `groceryDepartment`, `groceryUnitType`, `groceryTemperature`, `groceryFreshPricing`, `groceryRipenessConfig`, `progressiveDiscountTiers`, `orderBumpOffer`, `foodSubNiche`, `pharmacyActiveIngredient`, `pharmacyAnvisaRegistry` | `attributes.{grocery_department, unit_type, temperature, grocery_fresh_pricing, grocery_ripeness_config, progressive_discount_tiers, order_bump_offer, food_subniche, food_prep_time_minutes, food_delivery_modes, active_ingredient, manufacturer, anvisa_registry, retention_prescription}` | `attributes` JSONB | Permitido em `CLASSIFIED_PUBLIC_ALLOWLIST_EXTRA` | `ConvenienceShowcaseView` + `resolveClassifiedDetailedSpecs` | Corrigido |
| **Vagas, Negócios, Agro, Desapego, Equipamento, Digital** | Atributos específicos de cada nicho | `attributes` estritamente escopados por `niche.id` | `attributes` JSONB | Permitido em `CLASSIFIED_PUBLIC_ALLOWLIST_EXTRA` (exceto `restricted_documents` e `company_cnpj` privados) | `resolveClassifiedDetailedSpecs` | Corrigido |

---

## 2. Matriz de Alinhamento do Motor Unificado (`UnifiedListing` / `unified-listing.functions.ts`)

| Propriedade | `UnifiedListing` (`src/types/unified-ad-engine.ts`) | `createListingInputSchema` (`listing-schemas.ts`) | `mapDatabaseRowToUnifiedListing` (`unified-listing.functions.ts`) | `CanonicalListingView` | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `niche` / `niche_id` | `niche?: string`, `niche_id: NicheTaxonomyId` | `niche_id` | Normalizado via `normalizeNicheKey` | Lido via `normalizeNicheKey(listing.niche \|\| listing.niche_id)` | Alinhado |
| `template` / `template_id` | `template?: string` | `template_id?: string` | Mapeado de `rawAttrs.template_id \|\| rawAttrs.template_style \|\| row.template` | Lido via `listing.template \|\| listing.attributes?.template_id` | Corrigido |
| `custom_attributes` / `attributes` | `custom_attributes?: Record<string, any>`, `attributes: Record<string, any>` | `attributes` | Preservado e sanitizado com `PUBLIC_SPEC_ALLOWLIST` expandida | Exibido sem truncamento (`break-words`) | Corrigido |
