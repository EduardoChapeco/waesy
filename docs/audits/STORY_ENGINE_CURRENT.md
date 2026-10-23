# STORY_ENGINE_CURRENT — Promotional Flyer & Story Architecture

## 1. Existing Implementation
- **Entry Points**:
  - `src/components/tourism/promotional-flyer/travel-promo-flyer-modal.tsx`: Split-screen modal opened from `EditorialShowcaseView` or travel classifieds.
  - `src/components/tourism/promotional-flyer/travel-promo-artboard.tsx`: Renders 1080×1920 (`9:16`), 1080×1350 (`4:5`), or 1080×1080 (`1:1`) DOM artboards scaled via `ResizeObserver` and exported via `html2canvas` with CORS-safe Data URI conversion (`convertToCorsSafeDataUri`).
  - `src/components/social-templates/TravelTemplateEditorial.tsx` & `src/components/social-templates/turismo/*`: Fixed React templates.

## 2. Limitations Identified in Current Story Engine
1. **Static Prop Binding vs Scene Graph**: Templates accept flat props (`title`, `highlights`, `priceCents`, `maxInstallments`) with fixed font sizes (`text-7xl`) that can clip or wrap awkwardly on long destination titles (`RECIFE + PORTO DE GALINHAS`) without dynamic text-fitting or duplicated shadow layers.
2. **Naive Inclusion Slicing**: Currently slices the first 3–4 items or injects `"Traslados ao aeroporto"` even when not confirmed in source evidence.
3. **Basic CSS Blur vs Figma Frosted/Liquid Glass**: Uses standard `bg-black/55 backdrop-blur-xl border-white/25` without controllable frost, SVG refraction/displacement (`feDisplacementMap`), chromatic dispersion (`feColorMatrix`), procedural grain/noise (`feTurbulence`), light angle/intensity, or inner specular highlights.
4. **No Natural-Language AI Node Editing**: Lacks an AI command bar capable of mutating individual nodes (`title`, `price-glass-card`, `inclusions-group`, `payment-terms`) via structured JSON operations.

## 3. Target Consolidated Story Engine
- Introduce `StoryDocument` (1080×1920 scene graph) + `LiquidGlassSurface` + `ExcelenciaOfferStudioSheet` while keeping `TravelPromoFlyerModal` 100% backward-compatible and upgraded with the new Excelência Tour "ARTE SALVA" preset, Liquid Glass controls, AI Command Bar, and WhatsApp Publisher.
