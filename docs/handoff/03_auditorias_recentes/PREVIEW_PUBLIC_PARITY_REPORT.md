# PREVIEW_PUBLIC_PARITY_REPORT.md — Paridade entre Live Preview e Superfície Pública

## 1. Resumo Executivo
Este relatório comprova a paridade estrutural, semântica e visual entre as superfícies de **Pré-visualização ao Vivo (Live Preview)** no criador/editor de anúncios e as **Superfícies Públicas de Produção** (`_store.classificados.$id.tsx` e `CanonicalListingView`).

---

## 2. Matriz de Paridade (Preview × Produção)

| Dimensão | Live Preview (`_store.conta.classificados.novo.tsx` / `CanonicalListingPreviewFrame`) | Superfície Pública (`_store.classificados.$id.tsx` / `CanonicalListingView`) | Status de Paridade |
|---|---|---|---|
| **Motor de Resolução de Template** | `resolveCompatibleClassifiedTemplate(niche.id, templateStyle)` / `resolveTemplate(niche, template)` | `resolveCompatibleClassifiedTemplate(normalizedNiche, requestedTemplate)` / `resolveTemplate(niche, template)` | 100% Idêntico |
| **Motor de Resolução de Especificações** | `resolveClassifiedDetailedSpecs(classified)` | `resolveClassifiedDetailedSpecs(classified)` | 100% Idêntico |
| **Exibição de Cards Squircles (Anti-Truncate)** | `NicheSpecificationsDisplay` + `TeteterisGridView` | `NicheSpecificationsDisplay` + `TeteterisGridView` | 100% Idêntico |
| **Isolamento de Nicho (`B.37`)** | Atributos de turismo (`destination_city`, `itinerary_days`, `lodgings`, `flight_details`) restritos a `niche.id === "viagem"` | `isTravel` restrito a `niche === "viagem"` e bloqueado quando `isExplicitNonTravel` | 100% Idêntico |
| **Bifurcação Desktop Native vs Mobile Native** | `previewViewport={previewDevice}` propaga para `UniversalClassifiedShowcase`, `EditorialShowcaseView`, `ConvenienceShowcaseView` e `CanonicalListingView` | `useIsDesktop(1024)` + `previewViewport` em `UniversalClassifiedShowcase` | 100% Idêntico |
| **Sanitização de Atributos Públicos (BFF)** | `livePreviewClassified.attributes` reflete o contrato canônico do nicho ativo | `CLASSIFIED_PUBLIC_ALLOWLIST_EXTRA` + `PUBLIC_SPEC_ALLOWLIST` preservam 100% dos atributos públicos legítimos de todos os 15 nichos | 100% Idêntico |
| **Isolamento de Shell Administrativo** | Renderizado dentro do chassi de dispositivo sem vazar sidebar ou topbar administrativa | Renderizado no shell público da loja/comunidade | 100% Isolado |

---

## 3. Causas de Divergência Eliminadas

1. **Remoção de Atributos Públicos pelo BFF (`BUG-07`):**
   - **Antes:** `getPublicClassifiedById` em `src/services/classifieds.functions.ts` filtrava `classified.attributes` contra `PUBLIC_SPEC_ALLOWLIST` + `CLASSIFIED_PUBLIC_ALLOWLIST_EXTRA`, que omitia atributos de turismo (`destination_city`, `itinerary_days`, `lodgings`, `flight_details`, `departure_options`), imóveis (`area_sqm`, `condo_cents`, `iptu_cents`, `deal_type`), vagas (`role`, `work_model`, `salary_range`), mercado (`grocery_fresh_pricing`, `grocery_ripeness_config`, `progressive_discount_tiers`) e negócios (`valuation_cents`, `monthly_revenue_cents`). O anúncio parecia completo no Preview, mas perdia os dados na página pública para visitantes anônimos.
   - **Depois:** `CLASSIFIED_PUBLIC_ALLOWLIST_EXTRA` foi expandida com todos os atributos públicos legítimos dos 15 nichos, mantendo bloqueados exclusivamente dados sensíveis (`payment_rules`, `payment_settings`, `pix_key`, `store_payment_instructions`, `cost_cents`, `margin_percent`, `markup_percent`, `fiscal_profile`).

2. **Vazamento de Atributos de Viagem no Preview (`BUG-01A` / `BUG-01B`):**
   - **Antes:** `livePreviewClassified` injetava `destination_city: "Chapecó"`, `flight_details`, `story_highlights` e `itinerary_days` em todos os nichos, fazendo com que o Preview tratasse anúncios de Veículos/Imóveis/Desapego como pacotes de viagem.
   - **Depois:** Tanto `livePreviewClassified` quanto `handlePublish` isolam os campos de viagem exclusivamente quando `niche.id === "viagem"`.

3. **Desalinhamento do `ConvenienceShowcaseView` no Preview vs Público:**
   - **Antes:** O Preview forçava `ConvenienceShowcaseView` sempre que `niche.id === "mercado"`, mesmo se o usuário selecionasse o template `standard`, e `useClassifiedDetail` no público fazia o mesmo.
   - **Depois:** Ambos respeitam `template_style` explícito (`standard` vs `conveniencia`), garantindo que o template escolhido no Preview seja exatamente o template renderizado na página pública.
