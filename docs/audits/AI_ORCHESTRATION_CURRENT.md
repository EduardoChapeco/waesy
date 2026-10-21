# AI_ORCHESTRATION_CURRENT — AI Gateway & Extraction Pipeline

## 1. Current AI Gateway (`src/services/api-orchestrator.functions.ts`)
All AI calls in the repository route through `executeUnifiedAiCall`, which manages:
- Multi-provider failover (`gemini`, `groq`, `openrouter`).
- Structured JSON extraction (`responseFormat: "json_object"`, `expectJson: true`).
- Multimodal vision inputs (`images: [{ mimeType, base64 }]`, `fileBase64`, `fileMime`).
- Per-tenant rate limiting (`enforceRateLimit`) and staff access control (`requireStaff`).

## 2. Existing Travel AI Endpoints
1. `parseTravelMediaAI` (`src/services/travel-ai-extractor.functions.ts`):
   - Extracts `ExtractedTravelAdDTO` from screenshots, flyers, PDFs, or pasted text.
   - Matches destination and hotel against `destinations` and `hotels_bank`.
2. `processOperatorQuoteOcr` (`src/services/travel-operator-ocr.functions.ts`):
   - Extracts B2B operator quotes (Orinter, CVC, Trend, Visual, Azul Viagens) including flights, hotels, net/gross prices, and installments.
3. `ingestTravelDocument` (`src/services/travel-canonical-pipeline.functions.ts`):
   - Computes SHA-256 content hash, records `travel_document_ingestions`, and flags results for human review.

## 3. Consolidation Enhancements
- **Evidence-First Extraction**: Wrap extracted fields in `ExtractedField<T>` with `confidence`, `evidenceText`, and `sourceType` (`ocr | vision | text | catalog | campaign_rule | user | calculated`).
- **Deterministic Post-Processing**: Never trust LLM arithmetic blindly; run `validateTravelOfferCommercials()` to verify `installmentCount * installmentAmount` vs `totalPrice`, occupancy consistency, date ordering, and meal-plan evidence.
- **Structured Story AI Edit Operations**: Natural-language commands in the Story Studio (e.g., *"Aumentar só o título"*, *"Trocar de 15x para 12x sem mudar o total"*, *"Diminuir a caixa de valor"*) compile into deterministic `StoryEditOperation[]` (`set`, `move`, `resize`, `toggleVisible`, `applyGlassPreset`) rather than regenerating raster images.
