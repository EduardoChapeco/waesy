# Relatório Forense de Engenharia — Explorer M2_2: Closed Allowlists & Eliminação de Vazamento de Dados Fiscais

## 1. Observation

### 1.1 `src/services/unified-listing.functions.ts:60-145` — Vazamento Fiscal & Regressão de Atributos
- **Arquivo:** `src/services/unified-listing.functions.ts`
- **Linhas 61-64:**
  ```typescript
  export function mapDatabaseRowToUnifiedListing(
    row: any,
    origin: "classified" | "workspace",
    isPublic = true
  ): UnifiedListing {
    const isClassified = origin === "classified";
    const attrs = isPublic ? sanitizePublicProductAttributes(row.attributes) : (row.attributes || {});
    const nicheId = row.niche_id || row.niche || attrs.niche || (isClassified ? "varejo" : "varejo");
  ```
- **Linhas 91-93 e 125:**
  ```typescript
  cost_cents: isPublic ? null : (row.cost_cents ? Number(row.cost_cents) : null),
  margin_percent: isPublic ? null : (row.margin_percent ? Number(row.margin_percent) : null),
  markup_percent: isPublic ? null : (row.markup_percent ? Number(row.markup_percent) : null),
  ...
  fiscal_profile: isPublic ? null : (row.fiscal_profile || attrs.fiscal_profile),
  ```
- **Achado Forense A (Vazamento em JSON via `null`):** O operador ternário `isPublic ? null : ...` atribui `null`. Na serialização JSON de APIs públicas (via TanStack Start `createServerFn` ou `JSON.stringify`), chaves com valor `null` permanecem presentes no payload trafegado (`"cost_cents": null, "margin_percent": null, "fiscal_profile": null`). A especificação exige purga total (omissão das chaves via `undefined`).
- **Achado Forense B (Regressão Crítica no Vitest):** A execução do comando `node ./node_modules/vitest/vitest.mjs run src/services/unified-listing.test.ts` acusou 2 falhas determinísticas:
  ```
  FAIL  src/services/unified-listing.test.ts > converte registro de classificados com campos unificados e dono único
  AssertionError: expected [] to have a length of 3 but got +0
    - Expected: 3
    + Received: 0
    Line 66: expect(listing.inclusions).toHaveLength(3);

  FAIL  src/services/unified-listing.test.ts > serializa payload limpo para WebMCP compatível com agentes de IA
  AssertionError: expected '0%' to be '5%'
    - Expected: "5%"
    + Received: "0%"
    Line 252: expect(webMcp.payment_terms.pix_discount).toBe("5%");
  ```
- **Causa Raiz da Regressão:** `row.attributes` estava sendo sanitizado em `attrs` logo na linha 64. Como `PUBLIC_SPEC_ALLOWLIST` preserva apenas atributos técnicos escalares, campos canônicos estruturados armazenados no JSONB do banco — como `inclusions` (array), `pix_discount_percent`, `max_installments`, `departure_options`, `cancellation_policy` — eram descartados antes de serem lidos pelas linhas 98, 108 e 124.

---

### 1.2 `src/services/catalog.functions.ts:123` e `850` — Exposição de Atributos Não Filtrados em Cards e Variantes
- **Arquivo:** `src/services/catalog.functions.ts`
- **Linhas 121-124 (`explodeProductToCards`):**
  ```typescript
  variantId,
  variantName,
  attributes: row.attributes ?? {},
  ```
- **Linhas 848-851 (`getProductDetailCommerce` / variantes):**
  ```typescript
  effectivePriceCents: v.price_override_cents ?? data.price_cents,
  availableQty,
  attributes: v.attributes || {},
  ```
- **Achado:** Ao gerar cards de vitrine pública em `listPublishedProducts` ou carregar o detalhe comercial, `row.attributes` e `v.attributes` são repassados sem sanitização. Se a loja possuir campos internos, anotações de fornecedor, dados fiscais ou custo gravados em `attributes`, eles são expostos no payload público da vitrine.

---

### 1.3 `src/services/product.functions.ts:152` — Exposição de Atributos em Variantes de Produto
- **Arquivo:** `src/services/product.functions.ts`
- **Linhas 144-153 (`_getProductBySlug`):**
  ```typescript
  const variants: VariantDTO[] = ((product.product_variants as RawVariant[] | null) ?? [])
    .filter((v) => v.status === "active")
    .map((v) => ({
      id: v.id,
      sku: v.sku,
      displayName: v.display_name ?? null,
      effectivePriceCents: v.price_override_cents ?? (product.price_cents as number),
      availableQty: v.stock_on_hand,
      attributes: v.attributes ?? {}, // VAZAMENTO: variantes sem allowlist
  ```
- **Contraste na Linha 324:**
  ```typescript
  attributes: sanitizePublicProductAttributes((product as any).attributes), // BLINDADO
  ```
- **Achado:** O produto pai passa por `sanitizePublicProductAttributes`, mas as variantes filhas retornam `v.attributes ?? {}` sem passar pela allowlist.

---

### 1.4 `src/services/classifieds.functions.ts` — Auditoria dos Endpoints Públicos de Classificados
- **Arquivo:** `src/services/classifieds.functions.ts`
- **Endpoints Auditados:**
  1. `getAdsByStoreId` (linhas 159-169): Executa `.from("classifieds").select("*")` e retorna a linha bruta com todos os atributos JSONB para qualquer visitante.
  2. `getPublicClassifiedById` (linhas 235-239, 437-444): Executa `.from("classifieds").select("*")`. Embora mascare dados geográficos sensíveis de LGPD (`location_lat = null`), retorna `classifiedData.attributes` íntegro quando `!canManage` (visitantes públicos e anônimos).
  3. `getPublicClassifieds` (linhas 38-43, 84-118): Seleciona `attributes` na query e devolve o item no feed sem filtragem de allowlist.
- **Achado de Alto Risco:** Na gravação de classificados (`upsertClassified`, linhas 845-866), `attributes` recebe `ai_instructions` (instruções e regras de negócio dadas ao agente SDR IA), `ai_agent_enabled`, `setup_fee_cents`, `trial_days` e `...(rest.attributes || {})`. Sem filtragem na saída pública, um visitante anônimo pode ler os prompts de IA e notas internas do anunciante.

---

### 1.5 `master-catalog.functions.ts:18, 83` e `central-knowledge.functions.ts:1050` — Consulta de Classificação Fiscal
- **Arquivos:**
  - `src/services/master-catalog.functions.ts` (`searchMasterCatalogProducts`, `lookupNcmTributes`)
  - `src/services/central-knowledge.functions.ts` (`searchNcm`)
  - `src/services/central-knowledge.test.ts` (testes automatizados validados)
- **Achado:**
  - `ck_ncm` e `lookupNcmTributes`: Consultam tabelas públicas e oficiais de NCM da Receita Federal e alíquotas da Reforma Tributária (IBS/CBS). **Não contêm dados de lojistas, não contêm custos e não contêm margens**.
  - `searchMasterCatalogProducts`: Consulta o catálogo global padronizado (`global_master_catalog` / EAN-13) usado pelo modal de lojista `src/components/admin/catalog/master-catalog-search-dialog.tsx` para cadastro rápido. Não contém estoques de lojas individuais nem segredos de negócio.

---

## 2. Logic Chain

1. **Premissa de Sigilo Fiscal Absoluto (R2 / AC-65):** Dados fiscais (`ncm`, `cest`, `fiscal_profile`, `cfop`) e parâmetros comerciais confidenciais (`cost_cents`, `margin_percent`, `markup_percent`) nunca podem trafegar para o cliente em rotas públicas.
2. **Propriedades Opcionais em TypeScript vs Serialização JSON:** Em TypeScript, `UnifiedListing` declara `cost_cents?: number | null`. Ao atribuir `null`, a chave `"cost_cents": null` é serializada no JSON. Ao atribuir `undefined`, o TanStack Start / `JSON.stringify` omite a chave por completo do payload. Logo, a purga exige o uso de `undefined`.
3. **Desacoplamento de `rawAttrs` e `attrs`:** Em `mapDatabaseRowToUnifiedListing`, `row.attributes` armazena campos tipados da entidade (`inclusions`, `pix_discount_percent`, `cancellation_policy`) e atributos dinâmicos. Sanitizar `row.attributes` antes de extrair os campos tipados destruiu os valores que alimentavam `payment_config` e `inclusions`, quebrando os testes unitários. A solução robusta é preservar `rawAttrs` para preencher as propriedades de primeiro nível de `UnifiedListing` e aplicar `sanitizePublicProductAttributes(rawAttrs)` estritamente na propriedade `listing.attributes`.
4. **Paridade em Variantes de Catálogo e Produto:** Se o produto pai sanitiza `attributes` via `sanitizePublicProductAttributes`, a variante não pode expor `v.attributes` bruto, sob pena de contornar a barreira perimetral bastando consultar o detalhe da variante.
5. **Proteção Anti-Vazamento em Classificados:** Anúncios de classificados possuem campos dinâmicos ricos em `attributes` (veículos, imóveis, serviços). Uma allowlist pública baseada no resolvedor canônico `src/lib/classifieds/canonical-specs-resolver.ts` permite que os 15 nichos exibam seus dados técnicos legítimos enquanto descarta terminantemente `ai_instructions`, notas internas e campos fiscais.

---

## 3. Caveats

- **Ambiente Read-Only:** Nenhuma alteração foi gravada em arquivos de código-fonte (`src/`), em estrito cumprimento às restrições do Explorer.
- **Proibição Absoluta de Build:** Em conformidade estrita com o mandato, `npm run typecheck` e `npm run build` **não foram executados sob nenhuma circunstância**.
- **Testes Unitários:** A validação foi efetuada através de `node ./node_modules/vitest/vitest.mjs run <arquivo.test.ts>`, preservando o ambiente e garantindo velocidade e isolamento.

---

## 4. Conclusion & Diffs Detalhados para Implementação

### 4.1 Diff Proposto: `src/services/unified-listing.functions.ts`
Desacopla `rawAttrs` de `attrs`, purga campos fiscais com `undefined` e resolve as 2 quebras de teste do Vitest:

```diff
--- a/src/services/unified-listing.functions.ts
+++ b/src/services/unified-listing.functions.ts
@@ -61,9 +61,10 @@ export function mapDatabaseRowToUnifiedListing(
   isPublic = true
 ): UnifiedListing {
   const isClassified = origin === "classified";
-  const attrs = isPublic ? sanitizePublicProductAttributes(row.attributes) : (row.attributes || {});
-  const nicheId = row.niche_id || row.niche || attrs.niche || (isClassified ? "varejo" : "varejo");
+  const rawAttrs = (row.attributes && typeof row.attributes === "object") ? row.attributes : {};
+  const attrs = isPublic ? sanitizePublicProductAttributes(rawAttrs) : rawAttrs;
+  const nicheId = row.niche_id || row.niche || rawAttrs.niche || (isClassified ? "varejo" : "varejo");
 
   const baseListing: UnifiedListing = {
     id: row.id,
-    item_type: row.item_type || attrs.item_type || (nicheId === "turismo" ? "package" : "product"),
+    item_type: row.item_type || rawAttrs.item_type || (nicheId === "turismo" ? "package" : "product"),
     niche_id: nicheId,
     category_id: row.category_id || row.category || "geral",
@@ -90,9 +91,9 @@ export function mapDatabaseRowToUnifiedListing(
     compare_at_cents: row.compare_at_cents ? Number(row.compare_at_cents) : null,
-    cost_cents: isPublic ? null : (row.cost_cents ? Number(row.cost_cents) : null),
-    margin_percent: isPublic ? null : (row.margin_percent ? Number(row.margin_percent) : null),
-    markup_percent: isPublic ? null : (row.markup_percent ? Number(row.markup_percent) : null),
+    cost_cents: isPublic ? undefined : (row.cost_cents ? Number(row.cost_cents) : null),
+    margin_percent: isPublic ? undefined : (row.margin_percent ? Number(row.margin_percent) : null),
+    markup_percent: isPublic ? undefined : (row.markup_percent ? Number(row.markup_percent) : null),
     selling_unit: row.selling_unit || "un",
     
     payment_config: {
-      accepts_pix: row.accepts_pix ?? attrs.accepts_pix ?? true,
-      pix_discount_percent: Number(row.pix_discount_percent ?? attrs.pix_discount_percent ?? 0),
-      accepts_card: row.accepts_card ?? attrs.accepts_card ?? true,
-      max_installments: Number(row.max_installments ?? attrs.max_installments ?? 12),
-      fee_free_installments: Number(row.fee_free_installments ?? attrs.fee_free_installments ?? 6),
-      accepts_cash: row.accepts_cash ?? attrs.accepts_cash ?? false,
-      accepts_trade: row.accepts_trade ?? attrs.accepts_trade ?? false,
-      deposit_percent: attrs.deposit_percent ? Number(attrs.deposit_percent) : undefined,
-      balance_due_days: attrs.balance_due_days ? Number(attrs.balance_due_days) : undefined,
+      accepts_pix: row.accepts_pix ?? rawAttrs.accepts_pix ?? true,
+      pix_discount_percent: Number(row.pix_discount_percent ?? rawAttrs.pix_discount_percent ?? 0),
+      accepts_card: row.accepts_card ?? rawAttrs.accepts_card ?? true,
+      max_installments: Number(row.max_installments ?? rawAttrs.max_installments ?? 12),
+      fee_free_installments: Number(row.fee_free_installments ?? rawAttrs.fee_free_installments ?? 6),
+      accepts_cash: row.accepts_cash ?? rawAttrs.accepts_cash ?? false,
+      accepts_trade: row.accepts_trade ?? rawAttrs.accepts_trade ?? false,
+      deposit_percent: rawAttrs.deposit_percent ? Number(rawAttrs.deposit_percent) : undefined,
+      balance_due_days: rawAttrs.balance_due_days ? Number(rawAttrs.balance_due_days) : undefined,
     },
     
-    inclusions: Array.isArray(row.inclusions) ? row.inclusions : Array.isArray(attrs.inclusions) ? attrs.inclusions : [],
-    exclusions: Array.isArray(row.exclusions) ? row.exclusions : Array.isArray(attrs.exclusions) ? attrs.exclusions : [],
-    cancellation_policy: row.cancellation_policy || attrs.cancellation_policy,
-    terms_and_conditions: row.terms_and_conditions || attrs.terms_and_conditions,
+    inclusions: Array.isArray(row.inclusions) ? row.inclusions : Array.isArray(rawAttrs.inclusions) ? rawAttrs.inclusions : [],
+    exclusions: Array.isArray(row.exclusions) ? row.exclusions : Array.isArray(rawAttrs.exclusions) ? rawAttrs.exclusions : [],
+    cancellation_policy: row.cancellation_policy || rawAttrs.cancellation_policy,
+    terms_and_conditions: row.terms_and_conditions || rawAttrs.terms_and_conditions,
     
     cover_url: row.cover_url || (Array.isArray(row.images) ? row.images[0] : null),
     media_urls: Array.isArray(row.media_urls) ? row.media_urls : Array.isArray(row.images) ? row.images : [],
-    video_url: row.video_url || attrs.video_url || null,
+    video_url: row.video_url || rawAttrs.video_url || null,
     
-    location: row.location || attrs.location || (row.location_name ? { city: row.location_name, state: "SC" } : undefined),
-    shipping_mode: row.shipping_mode || attrs.shipping_mode || "both",
-    free_shipping_local: row.free_shipping_local ?? attrs.free_shipping_local ?? false,
+    location: row.location || rawAttrs.location || (row.location_name ? { city: row.location_name, state: "SC" } : undefined),
+    shipping_mode: row.shipping_mode || rawAttrs.shipping_mode || "both",
+    free_shipping_local: row.free_shipping_local ?? rawAttrs.free_shipping_local ?? false,
     stock_quantity: row.stock !== undefined ? Number(row.stock) : Number(row.stock_quantity ?? 1),
-    capacity_limit: attrs.capacity_limit ? Number(attrs.capacity_limit) : undefined,
-    is_unlimited_stock: Boolean(row.is_unlimited_stock ?? attrs.is_unlimited_stock ?? false),
+    capacity_limit: rawAttrs.capacity_limit ? Number(rawAttrs.capacity_limit) : undefined,
+    is_unlimited_stock: Boolean(row.is_unlimited_stock ?? rawAttrs.is_unlimited_stock ?? false),
     
-    departure_options: Array.isArray(attrs.departure_options) ? attrs.departure_options : [],
-    fiscal_profile: isPublic ? null : (row.fiscal_profile || attrs.fiscal_profile),
+    departure_options: Array.isArray(rawAttrs.departure_options) ? rawAttrs.departure_options : [],
+    fiscal_profile: isPublic ? undefined : (row.fiscal_profile || rawAttrs.fiscal_profile || undefined),
     
     status: (row.status === "active" ? "published" : row.status || "draft") as ListingStatus,
-    moderation_status: (attrs.moderation_status || "approved") as ModerationStatus,
-    moderation_history: Array.isArray(attrs.moderation_history) ? attrs.moderation_history : [],
-    is_featured: Boolean(row.is_featured ?? attrs.is_featured ?? false),
+    moderation_status: (rawAttrs.moderation_status || "approved") as ModerationStatus,
+    moderation_history: Array.isArray(rawAttrs.moderation_history) ? rawAttrs.moderation_history : [],
+    is_featured: Boolean(row.is_featured ?? rawAttrs.is_featured ?? false),
```

---

### 4.2 Diff Proposto: `src/services/catalog.functions.ts`
Importa e aplica `sanitizePublicProductAttributes` em cards e variantes:

```diff
--- a/src/services/catalog.functions.ts
+++ b/src/services/catalog.functions.ts
@@ -37,6 +37,7 @@ import type {
 // ---------------------------------------------------------------------------
 
 import { resolveTenantStoreId } from "@/lib/tenant.server";
+import { sanitizePublicProductAttributes } from "./unified-listing.functions";
 
 /**
  * Helper to map Supabase joined row into ProductCardDTO(s).
@@ -120,7 +121,7 @@ function explodeProductToCards(row: any): ProductCardDTO[] {
   publishedAt: row.published_at ?? null,
   variantId,
   variantName,
-  attributes: row.attributes ?? {},
+  attributes: sanitizePublicProductAttributes(row.attributes),
   };
  };
@@ -847,7 +848,7 @@ export const getProductDetailCommerce = createServerFn({ method: "GET" })
   id: v.id,
   sku: v.sku,
   effectivePriceCents: v.price_override_cents ?? data.price_cents,
   availableQty,
-  attributes: v.attributes || {},
+  attributes: sanitizePublicProductAttributes(v.attributes),
   media: variantMedia.length > 0 ? variantMedia : media,
```

---

### 4.3 Diff Proposto: `src/services/product.functions.ts`
Aplica `sanitizePublicProductAttributes` nas variantes filhas:

```diff
--- a/src/services/product.functions.ts
+++ b/src/services/product.functions.ts
@@ -149,7 +149,7 @@ async function _getProductBySlug(slug: string): Promise<ProductDetailDTO> {
   displayName: v.display_name ?? null,
   effectivePriceCents: v.price_override_cents ?? (product.price_cents as number),
   availableQty: v.stock_on_hand,
-  attributes: v.attributes ?? {},
+  attributes: sanitizePublicProductAttributes(v.attributes),
   ean: v.ean ?? null,
   weightKg: v.weight_kg ?? (product.weight_kg as number | null) ?? null,
```

---

### 4.4 Diff Proposto: `src/services/classifieds.functions.ts`
Sanitiza attributes e purga campos confidenciais e `ai_instructions` nos 3 endpoints públicos:

```diff
--- a/src/services/classifieds.functions.ts
+++ b/src/services/classifieds.functions.ts
@@ -14,6 +14,24 @@
 // PUBLIC (no auth required) — 100% Real no Supabase | Zero Mocks
 // ---------------------------------------------------------------------------
+import { sanitizePublicProductAttributes } from "./unified-listing.functions";
+
+const CLASSIFIED_PUBLIC_ALLOWLIST_EXTRA = new Set([
+  "feed_media", "feed_images", "display_mode", "template_style",
+  "single_owner", "unico_dono", "delivery_mode", "delivery_type",
+  "is_digital", "is_free_donation", "is_business_sale", "business_type",
+  "accepts_card", "accepts_trade", "accepts_pix", "pix_discount_percent",
+  "installments_available", "max_installments", "working_hours_start",
+  "working_hours_end", "available_weekdays", "cancellation_policy",
+  "inquiry_config", "travel", "amenities", "features", "provenance",
+]);
+
+function sanitizePublicClassifiedAttributes(raw: Record<string, any> | null | undefined): Record<string, any> {
+  if (!raw || typeof raw !== "object") return {};
+  const base = sanitizePublicProductAttributes(raw);
+  for (const [key, value] of Object.entries(raw)) {
+    const lower = key.toLowerCase();
+    if (CLASSIFIED_PUBLIC_ALLOWLIST_EXTRA.has(lower) && (typeof value !== "object" || Array.isArray(value)) && value !== null && value !== undefined) {
+      base[key] = value;
+    }
+  }
+  return base;
+}
 
 export const getPublicClassifieds = createServerFn({ method: "GET" })
@@ -85,6 +103,11 @@ export const getPublicClassifieds = createServerFn({ method: "GET" })
       const normalizedItem = {
         ...item,
+        cost_cents: undefined,
+        margin_percent: undefined,
+        markup_percent: undefined,
+        fiscal_profile: undefined,
+        attributes: sanitizePublicClassifiedAttributes(item.attributes),
         is_sponsored: isValidSponsored,
         is_boosted: isValidSponsored,
         sponsored_until: rawUntil || null,
@@ -165,7 +188,14 @@ export const getAdsByStoreId = createServerFn({ method: "GET" })
 
       if (!error && ads) {
-        return ads;
+        return ads.map((ad: any) => ({
+          ...ad,
+          cost_cents: undefined,
+          margin_percent: undefined,
+          markup_percent: undefined,
+          fiscal_profile: undefined,
+          attributes: sanitizePublicClassifiedAttributes(ad.attributes),
+        }));
       }
     } catch (err) {
@@ -435,9 +465,18 @@ export const getPublicClassifiedById = createServerFn({ method: "GET" })
       const computedStatus: "active" | "sold" | "paused" | "reserved" | "archived" =
         classifiedData.status === "completed" ? "sold" : (classifiedData.status || "active");
 
+      const publicClassified = canManage ? classifiedData : {
+        ...classifiedData,
+        cost_cents: undefined,
+        margin_percent: undefined,
+        markup_percent: undefined,
+        fiscal_profile: undefined,
+        attributes: sanitizePublicClassifiedAttributes(classifiedData.attributes),
+      };
+
       return {
-        classified: classifiedData,
+        classified: publicClassified,
         status: computedStatus,
         isOwner,
         canManage,
```

---

## 5. Verification Method

### 5.1 Testes Unitários de Regressão e Validação
Executar Vitest via Node.js para atestar conformidade:
```powershell
node ./node_modules/vitest/vitest.mjs run src/services/unified-listing.test.ts
node ./node_modules/vitest/vitest.mjs run src/lib/classifieds/canonical-specs-resolver.test.ts
node ./node_modules/vitest/vitest.mjs run src/services/central-knowledge.test.ts
```

### 5.2 Critérios de Invalidação
- Se qualquer teste em `unified-listing.test.ts` falhar por `inclusions` ou `pix_discount_percent`, a separação entre `rawAttrs` e `attrs` foi violada.
- Se a resposta de `getUnifiedListingById` contiver a chave `cost_cents` no JSON (mesmo como `null`), a purga foi violada.
- Se `getPublicClassifiedById` retornar `ai_instructions` no objeto `attributes` para um visitante anônimo (`canManage === false`), o filtro de classificados foi violado.
