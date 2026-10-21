# STATE_OWNERSHIP_MAP.md — Mapa de Source of Truth e Ownership de Estado

**Data:** 2026-10-21
**Status:** Auditado & Consolidado

---

## 1. Matriz de Ownership Canônico por Estado

| Propriedade de Estado | Superfície | Owner Canônico (Single Source of Truth) | Persistência Server/DB | Regras de Sincronização & Hidratação |
| :--- | :--- | :--- | :--- | :--- |
| `niche` (`NicheConfig`) | `_store.conta.classificados.novo.tsx` | Estado local `niche` inicializado via `resolveInitialNiche(initialData, initialCategory)` | `classifieds.category` + `classifieds.attributes.niche` | Derivado na montagem a partir de `initialData` (edição) ou search param `?category=` (criação). |
| `templateStyle` (`ClassifiedTemplateStyle`) | `_store.conta.classificados.novo.tsx` | Estado local `templateStyle` inicializado via `resolveInitialTemplateStyle(initialData, niche)` | `classifieds.attributes.template_style` | Na hidratação de edição (`initialData`), preserva estritamente `initialData.attributes.template_style`. Em trocas manuais de nicho pelo usuário, valida compatibilidade via `resolveCompatibleTemplateForNiche(newNicheId, currentTemplateStyle)`. |
| `previewDevice` (`"mobile" \| "desktop"`) | `_store.conta.classificados.novo.tsx` | Estado efêmero do editor `previewDevice` | Efêmero (UI state) | Propagado diretamente via prop `previewViewport={previewDevice}` para `UniversalClassifiedShowcase`, `EditorialShowcaseView`, `ConvenienceShowcaseView` e `EventClassifiedShowcaseView`. |
| `listing.niche_id` & `listing.template` | `ListingFullEditor` / `UnifiedListingEditor` | Estado controlado `listing` no editor pai | `classifieds.attributes.template_id` / `products.metadata.template_id` | `onSelectNiche` chama `adaptListingStateOnSwitch` (`template-metamorphosis.ts`), preservando `custom_attributes` no cofre sem perda de dados e resolvendo o template compatível. |
| `viewport` (`"mobile" \| "tablet" \| "desktop"`) | `CanonicalListingPreviewFrame` | Estado efêmero `viewport` do frame | Efêmero (UI state) | Propagado via prop `previewViewport` para `CanonicalListingView` + escala geométrica no chassi isolado. |
| `document` (`OmniPageDocument`) | `OmniEditor.tsx` | Estado controlado `doc` + histórico Undo/Redo | `experience_documents` + `experience_versions` via RPC `persist_omni_document_snapshot` | Carregado pelo loader (`getOmniPageDocument`), editado em memória e persistido atomicamente via `saveOmniPageDocument` / `publishOmniPageDocument`. |

---

## 2. Anti-Padrões Eliminados

1. **Sobrescrita de `templateStyle` por `useEffect([niche.id])` durante hidratação:**
   - **Antes:** `useEffect` escutando `[niche.id]` rodava na montagem inicial e sobrescrevia `initialData.attributes.template_style` com o default do nicho.
   - **Depois:** Inicialização determinística no `useState` + resolução de compatibilidade acionada na transição de nicho (`prevNicheIdRef`), preservando `initialData.attributes.template_style` ao abrir um anúncio salvo.
2. **Poluição de `livePreviewClassified` com fallbacks de outros nichos:**
   - **Antes:** `useMemo` de `livePreviewClassified` injetava atributos de `viagem` (`destination_city: "Chapecó"`, `flight_details`) para todos os nichos.
   - **Depois:** `livePreviewClassified` constrói `attributes` com isolamento estrito por `niche.id`, espelhando 1:1 o payload enviado para `upsertClassified`.
