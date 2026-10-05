# Relatório Forense de Engenharia — Explorer M2_3: Dedução Automática de BOM & Idempotência em Ordens de Serviço

## 1. Observation

### 1.1 Inconsistência Crítica no `movement_type` em `stock_movements` (Violação de Constraint PostgreSQL)
A consulta ao banco de dados Supabase (`jfuebqmltksyznovhlwa`) via MCP `execute_sql` revelou a seguinte restrição ativa na tabela `public.stock_movements`:
- **Constraint Name**: `stock_movements_movement_type_check`
- **Definição Verbatim**:
  ```sql
  CHECK ((movement_type = ANY (ARRAY['purchase'::text, 'sale'::text, 'reserve'::text, 'release'::text, 'return'::text, 'exchange_in'::text, 'exchange_out'::text, 'adjustment'::text, 'transfer'::text, 'damage'::text])))
  ```
- **Código em `src/services/pdv.functions.ts:442`**:
  ```typescript
  await supabase.from("stock_movements").insert({
    store_id: identity.store_id,
    variant_id: firstVariant.id,
    location_id: activeLocationId,
    movement_type: "loss", // VIOLAÇÃO: 'loss' NÃO existe no CHECK constraint!
    qty: -consumedQty,
    reference_type: "bom_consumption",
    ...
  });
  ```
- **Código em `src/services/service-orders.functions.ts:160`**:
  ```typescript
  await supabase.from("stock_movements").insert({
    store_id: identity.store_id,
    variant_id: part.variant_id,
    movement_type: "loss", // VIOLAÇÃO: 'loss' NÃO existe no CHECK constraint!
    qty: -part.quantity,
    previous_stock: prevStock, // VIOLAÇÃO: Coluna inexistente em stock_movements!
    new_stock: newStock,       // VIOLAÇÃO: Coluna inexistente em stock_movements!
    reference_type: "service_order",
    ...
  });
  ```
- **Resultado do Banco**: Qualquer tentativa de inserir `movement_type = 'loss'` gera erro de banco de dados (`violates check constraint "stock_movements_movement_type_check"`).
- **Colunas Reais de `stock_movements`** (verificadas via `information_schema.columns`):
  `id`, `variant_id`, `store_id`, `movement_type`, `qty`, `reference_type`, `reference_id`, `note`, `actor_id`, `created_at`, `channel_source`, `external_order_id`, `channel_origin`, `location_id`.
  As colunas `previous_stock` e `new_stock` declaradas em `service-orders.functions.ts:162-163` **NÃO existem na tabela**.

---

### 1.2 Fragilidade de Busca por Substring em `src/services/pdv.functions.ts:407-456`
No arquivo `src/services/pdv.functions.ts` (linhas 416-430):
```typescript
const bomList = (parentProduct?.attributes as any)?.bill_of_materials;
if (Array.isArray(bomList) && bomList.length > 0) {
  for (const bomItem of bomList) {
    const consumedQty = (Number(bomItem.quantity) || 1) * soldQty;
    const { data: ingProduct } = await supabase
      .from("products")
      .select("id, product_variants(id, stock_on_hand)")
      .eq("store_id", identity.store_id)
      .ilike("title", `%${bomItem.name}%`) // DEFEITO: busca frágil por substring
      .limit(1)
      .maybeSingle();

    const firstVariant = (ingProduct?.product_variants as any[])?.[0];
    if (firstVariant?.id) { ... }
```
- A busca ignora qualquer identificador canônico (`variant_id`, `variantId`, `sku` ou `product_id`) que possa existir no item da ficha técnica.
- Usa `.ilike("title", `%${bomItem.name}%`)` com `.limit(1)` sem cláusula `order by`. Se o insumo for "Pão", qualquer produto cujo título contenha "pão" ("Pão Francês", "Pão de Queijo", "Farinha de Pão") pode ser selecionado de forma não-determinística.
- Se o título do produto for renomeado ou possuir acentuação/espaçamento diferente, a busca retorna `null` e a dedução de estoque é ignorada silenciosamente.
- Não atualiza o estoque multi-armazém `product_location_inventories`, criando divergência de inventário entre o saldo global (`stock_on_hand`) e o saldo por localização (`stock_qty`).

---

### 1.3 Quebra de Idempotência e Falha Silenciosa em `src/services/service-orders.functions.ts:143-179`
Em `src/services/service-orders.functions.ts`:
1. **Quebra da Trava de Idempotência**:
   ```typescript
   if (data.status === "delivered" && os?.parts_used && Array.isArray(os.parts_used)) {
     const { data: existingDeductions } = await supabase
       .from("stock_movements")
       .select("id")
       .eq("store_id", identity.store_id)
       .eq("reference_type", "service_order")
       .eq("reference_id", data.order_id)
       .limit(1);

     if (!existingDeductions || existingDeductions.length === 0) {
       for (const part of os.parts_used as any[]) {
         try {
           ...
           await supabase.from("stock_movements").insert({ ... }); // FALHA: colunas inexistentes e movement_type 'loss'
           await supabase.from("product_variants").update({ stock_on_hand: newStock }).eq("id", part.variant_id);
         } catch (stockErr) {
           console.warn(`[service-orders] Erro ao consumir estoque de ${part.name}:`, stockErr);
         }
       }
     }
   }
   ```
   Como o `insert` em `stock_movements` falha devido a `movement_type: "loss"` e às colunas inexistentes `previous_stock`/`new_stock`, **nenhum registro é gravado em `stock_movements`**.
   Na chamada seguinte de atualização da OS, a query `existingDeductions` retorna 0 linhas novamente, reexecutando o loop.
2. **Falta de Checagem de Transição de Estado**:
   O código não verifica o status anterior da OS antes da mutação. Se um usuário atualizar qualquer campo (ex: `technical_diagnosis`) em uma OS cujo status já era `"delivered"`, a rotina tenta reexecutar a baixa de estoque.
3. **Status de Conclusão Omitido**:
   O schema Zod só aceita `["draft", "waiting_approval", "in_repair", "ready_for_pickup", "delivered", "cancelled"]`. Ordens de serviço concluídas via status canônico `"completed"` não existem no enum e não disparam dedução de peças.

---

### 1.4 Estado Atual do Checkout Online vs Ficha Técnica (BOM)
- No PostgreSQL, a função transacional `process_checkout_transaction_v2` (`supabase/migrations/20261115040000_update_process_checkout_v2_order_number_and_rates.sql:204-240`) itera sobre `v_items_snapshot` e deduz apenas a variante comprada:
  ```sql
  UPDATE public.product_variants
  SET stock_on_hand = stock_on_hand - (v_item.item_json->>'qty')::INTEGER
  WHERE id = (v_item.item_json->>'variant_id')::UUID;
  ```
- No BFF `src/services/checkout.functions.ts` (linhas 424-511): após o retorno do pedido criado com sucesso (`result.orderId`), são executadas atualizações de notas, metadados multi-nicho e despacho MotoLink, porém **NÃO existe rotina de resolução de insumos/embalagens (BOM)**.
- Produtos gastronômicos ou compostos vendidos via vitrine online não consomem os insumos de sua ficha técnica.

---

## 2. Logic Chain

1. **Premissa Contábil e de Integridade de Banco**: No PostgreSQL, as restrições `CHECK` são invariantes estritas. Qualquer comando `INSERT` com valor fora do domínio da constraint gera exceção e aborta a operação.
2. **Constatação de Falha Imediata**: `stock_movements.movement_type` aceita unicamente `'purchase'`, `'sale'`, `'reserve'`, `'release'`, `'return'`, `'exchange_in'`, `'exchange_out'`, `'adjustment'`, `'transfer'`, `'damage'`. O valor `"loss"` utilizado tanto no PDV quanto nas Ordens de Serviço é rejeitado pelo PostgreSQL. O valor canônico para saídas decorrentes de venda ou aplicação em OS é `"sale"` (ou `"adjustment"`), mantendo a semântica de documento em `reference_type: "bom_consumption"` ou `reference_type: "service_order"`.
3. **Constatação de Colunas Fantasma**: `stock_movements` não possui `previous_stock` e `new_stock`. A presença dessas chaves no payload do Supabase JS faz com que o PostgREST rejeite o insert com erro de schema cache.
4. **Premissa de Idempotência em OS**: A baixa de estoque só pode ocorrer exatamente uma vez durante o ciclo de vida de uma OS. A proteção deve ser em duas camadas:
   - Camada 1: Transição de estado (o status anterior não pode ser concluído/entregue).
   - Camada 2: Registro no ledger imutável (consulta prévia em `stock_movements` por `reference_type: "service_order"` e `reference_id: order_id`).
5. **Premissa de Determinismo em BOM**: A correspondência de insumos deve seguir ordem hierárquica determinística:
   `variant_id` (UUID) > `sku` (código único) > `product_id` (variante padrão) > busca por título exato > fallback aproximado. Isso garante paridade para produtos gastronômicos, industriais ou artesanais.
6. **Premissa de Cobertura Omnichannel**: A baixa de BOM não pode ficar restrita ao PDV presencial; pedidos da vitrine online devem executar o mesmo algoritmo de consumo proporcional de insumos.

---

## 3. Caveats

- **Ambiente Read-Only**: Nenhuma alteração foi gravada em arquivos de código-fonte (`pdv.functions.ts`, `service-orders.functions.ts`, `checkout.functions.ts`), em estrita conformidade com o mandato de exploração.
- **Proibição de Typecheck e Build**: Nenhuma compilação (`npm run typecheck` ou `npm run build`) foi executada.
- **Banco de Dados Intacto**: Nenhuma migração DDL ou DML foi aplicada no Supabase remoto durante a inspeção; as consultas foram estritamente informativas via `information_schema` e `pg_constraint`.
- **Compatibilidade Retroativa de Dados**: Fichas técnicas antigas cadastradas apenas com `name` textual continuam funcionando através do fallback ordenado, sem quebrar cadastros legados.

---

## 4. Conclusion & Proposed Diffs

Abaixo estão os diffs cirúrgicos prontos para aplicação pela fase de implementação.

### 4.1 Proposta de Diff: `src/services/pdv.functions.ts`
Alvo: `src/services/pdv.functions.ts:407-456`.
Objetivo: Substituir `ilike` frágil por resolução canônica (`variant_id` -> `sku` -> `product_id` -> nome), corrigir `movement_type` de `"loss"` para `"sale"` (compatível com a constraint do banco), sincronizar estoque local `product_location_inventories` e blindar o tenant.

```diff
--- a/src/services/pdv.functions.ts
+++ b/src/services/pdv.functions.ts
@@ -407,48 +407,112 @@
           // ── Consumo Automático de Ficha Técnica / BOM (Insumos e Embalagens) ──
           if (variant.product_id) {
             try {
               const { data: parentProduct } = await supabase
                 .from("products")
                 .select("attributes")
                 .eq("id", variant.product_id)
+                .eq("store_id", identity.store_id)
                 .maybeSingle();
 
               const bomList = (parentProduct?.attributes as any)?.bill_of_materials;
               if (Array.isArray(bomList) && bomList.length > 0) {
                 for (const bomItem of bomList) {
-                  const consumedQty = (Number(bomItem.quantity) || 1) * soldQty;
-                  const { data: ingProduct } = await supabase
-                    .from("products")
-                    .select("id, product_variants(id, stock_on_hand)")
-                    .eq("store_id", identity.store_id)
-                    .ilike("title", `%${bomItem.name}%`)
-                    .limit(1)
-                    .maybeSingle();
-
-                  const firstVariant = (ingProduct?.product_variants as any[])?.[0];
-                  if (firstVariant?.id) {
-                    const prevIngStock = firstVariant.stock_on_hand || 0;
+                  const itemQty = Number(bomItem.quantity) || 1;
+                  const consumedQty = itemQty * soldQty;
+                  if (consumedQty <= 0) continue;
+
+                  let targetVariantId: string | null = null;
+                  let prevIngStock = 0;
+
+                  // 1. Resolução Canônica Prioridade 1: variant_id / variantId UUID
+                  const rawVariantId = bomItem.variant_id || bomItem.variantId;
+                  if (rawVariantId && typeof rawVariantId === "string") {
+                    const { data: matchedVar } = await supabase
+                      .from("product_variants")
+                      .select("id, stock_on_hand")
+                      .eq("id", rawVariantId)
+                      .eq("store_id", identity.store_id)
+                      .maybeSingle();
+                    if (matchedVar) {
+                      targetVariantId = matchedVar.id;
+                      prevIngStock = matchedVar.stock_on_hand || 0;
+                    }
+                  }
+
+                  // 2. Resolução Canônica Prioridade 2: SKU
+                  if (!targetVariantId && bomItem.sku && typeof bomItem.sku === "string") {
+                    const { data: matchedVar } = await supabase
+                      .from("product_variants")
+                      .select("id, stock_on_hand")
+                      .eq("sku", bomItem.sku.trim())
+                      .eq("store_id", identity.store_id)
+                      .maybeSingle();
+                    if (matchedVar) {
+                      targetVariantId = matchedVar.id;
+                      prevIngStock = matchedVar.stock_on_hand || 0;
+                    }
+                  }
+
+                  // 3. Resolução Canônica Prioridade 3: product_id
+                  const rawProdId = bomItem.product_id || bomItem.productId;
+                  if (!targetVariantId && rawProdId && typeof rawProdId === "string") {
+                    const { data: matchedVar } = await supabase
+                      .from("product_variants")
+                      .select("id, stock_on_hand")
+                      .eq("product_id", rawProdId)
+                      .eq("store_id", identity.store_id)
+                      .limit(1)
+                      .maybeSingle();
+                    if (matchedVar) {
+                      targetVariantId = matchedVar.id;
+                      prevIngStock = matchedVar.stock_on_hand || 0;
+                    }
+                  }
+
+                  // 4. Fallback resiliente por título exato e aproximação sanitizada
+                  if (!targetVariantId && bomItem.name && typeof bomItem.name === "string" && bomItem.name.trim()) {
+                    const trimmedName = bomItem.name.trim();
+                    let { data: ingProduct } = await supabase
+                      .from("products")
+                      .select("id, product_variants(id, stock_on_hand)")
+                      .eq("store_id", identity.store_id)
+                      .eq("title", trimmedName)
+                      .limit(1)
+                      .maybeSingle();
+
+                    if (!ingProduct) {
+                      const { data: fuzzyProduct } = await supabase
+                        .from("products")
+                        .select("id, product_variants(id, stock_on_hand)")
+                        .eq("store_id", identity.store_id)
+                        .ilike("title", `%${trimmedName}%`)
+                        .limit(1)
+                        .maybeSingle();
+                      ingProduct = fuzzyProduct;
+                    }
+
+                    const firstVar = (ingProduct?.product_variants as any[])?.[0];
+                    if (firstVar?.id) {
+                      targetVariantId = firstVar.id;
+                      prevIngStock = firstVar.stock_on_hand || 0;
+                    }
+                  }
+
+                  if (targetVariantId) {
                     const newIngStock = Math.max(0, prevIngStock - consumedQty);
 
                     await supabase
                       .from("product_variants")
                       .update({ stock_on_hand: newIngStock, updated_at: new Date().toISOString() })
-                      .eq("id", firstVariant.id);
+                      .eq("id", targetVariantId)
+                      .eq("store_id", identity.store_id);
+
+                    if (activeLocationId) {
+                      const { data: locInv } = await supabase
+                        .from("product_location_inventories")
+                        .select("stock_qty")
+                        .eq("location_id", activeLocationId)
+                        .eq("variant_id", targetVariantId)
+                        .maybeSingle();
+
+                      if (locInv) {
+                        await supabase
+                          .from("product_location_inventories")
+                          .update({
+                            stock_qty: Math.max(0, locInv.stock_qty - consumedQty),
+                            updated_at: new Date().toISOString(),
+                          })
+                          .eq("location_id", activeLocationId)
+                          .eq("variant_id", targetVariantId);
+                      }
+                    }
 
                     await supabase.from("stock_movements").insert({
                       store_id: identity.store_id,
-                      variant_id: firstVariant.id,
+                      variant_id: targetVariantId,
                       location_id: activeLocationId,
-                      movement_type: "loss",
+                      movement_type: "sale",
                       qty: -consumedQty,
                       reference_type: "bom_consumption",
                       reference_id: data.orderId,
                       channel_origin: "pdv",
-                      note: `Consumo de insumo (${bomItem.name} - ${bomItem.quantity}${bomItem.unit || ""}) no Pedido #${data.orderId.slice(0, 8)}`,
+                      channel_source: "pos_counter",
+                      note: `Consumo de insumo BOM (${bomItem.name || targetVariantId} - ${bomItem.quantity || 1}${bomItem.unit || ""}) no Pedido #${data.orderId.slice(0, 8)}`,
                       created_at: new Date().toISOString(),
                     });
                   }
                 }
               }
```

---

### 4.2 Proposta de Diff: `src/services/service-orders.functions.ts`
Alvo: `src/services/service-orders.functions.ts:113-183`.
Objetivo:
1. Incluir status `"completed"` no enum de validação do Zod.
2. Ler estado atual da OS (`currentOs`) antes da mutação para detectar se o status anterior já era entregue/concluído (`wasAlreadyConcluded`).
3. Adicionar checagem prévia no ledger `stock_movements` com `reference_type: "service_order"` e `reference_id: data.order_id` para blindar contra repetição.
4. Corrigir `movement_type` de `"loss"` para `"sale"` e expurgar as colunas inexistentes `previous_stock` e `new_stock`.
5. Proteger mutações com `store_id: identity.store_id`.

```diff
--- a/src/services/service-orders.functions.ts
+++ b/src/services/service-orders.functions.ts
@@ -113,6 +113,7 @@
         "waiting_approval",
         "in_repair",
         "ready_for_pickup",
         "delivered",
+        "completed",
         "cancelled",
       ]),
       technical_diagnosis: z.string().optional(),
@@ -126,56 +127,78 @@
     assertStoreAccess(identity);
 
     const supabase = getServerClient();
 
+    // 1. Obter estado atual da OS para validar posse e verificar se já foi entregue/concluída
+    const { data: currentOs, error: fetchErr } = await supabase
+      .from("service_orders")
+      .select("id, status, parts_used, store_id")
+      .eq("id", data.order_id)
+      .eq("store_id", identity.store_id)
+      .maybeSingle();
+
+    if (fetchErr || !currentOs) {
+      throw new Error("Ordem de serviço não encontrada ou acesso não autorizado.");
+    }
+
+    const isConclusionStatus = data.status === "delivered" || data.status === "completed";
+    const wasAlreadyConcluded = currentOs.status === "delivered" || currentOs.status === "completed";
+
+    // 2. Atualizar status e diagnóstico técnico
     const { data: os, error } = await supabase
       .from("service_orders")
       .update({
         status: data.status,
         ...(data.technical_diagnosis ? { technical_diagnosis: data.technical_diagnosis } : {}),
         updated_at: new Date().toISOString(),
       })
       .eq("id", data.order_id)
       .eq("store_id", identity.store_id)
       .select()
       .single();
 
     if (error) throw new Error(`Falha ao atualizar status da OS: ${error.message}`);
 
-    // Se a OS foi entregue, consome estoque dos insumos/peças associadas a variantes do catálogo
-    if (data.status === "delivered" && os?.parts_used && Array.isArray(os.parts_used)) {
+    // 3. Dedução de peças com idempotência estrita (apenas na transição para entregue/concluída)
+    if (isConclusionStatus && !wasAlreadyConcluded && os?.parts_used && Array.isArray(os.parts_used)) {
+      // Dupla checagem no ledger de estoque: verificar se já existem movimentações gravadas para esta OS
       const { data: existingDeductions } = await supabase
         .from("stock_movements")
         .select("id")
         .eq("store_id", identity.store_id)
         .eq("reference_type", "service_order")
         .eq("reference_id", data.order_id)
         .limit(1);
 
-      if (!existingDeductions || existingDeductions.length === 0) {
+      const alreadyDeducted = Boolean(existingDeductions && existingDeductions.length > 0);
+
+      if (!alreadyDeducted) {
         for (const part of os.parts_used as any[]) {
           if (part.variant_id && part.quantity > 0) {
             try {
               const { data: variant } = await supabase
                 .from("product_variants")
-                .select("stock_on_hand")
+                .select("id, stock_on_hand, store_id")
                 .eq("id", part.variant_id)
+                .eq("store_id", identity.store_id)
                 .maybeSingle();
 
+              if (!variant) continue;
+
               const prevStock = variant?.stock_on_hand ?? 0;
               const newStock = Math.max(0, prevStock - part.quantity);
 
+              // Gravação imutável no ledger: movement_type 'sale', campos estritos sem colunas inexistentes
               await supabase.from("stock_movements").insert({
                 store_id: identity.store_id,
-                variant_id: part.variant_id,
-                movement_type: "loss",
+                variant_id: variant.id,
+                movement_type: "sale",
                 qty: -part.quantity,
-                previous_stock: prevStock,
-                new_stock: newStock,
                 reference_type: "service_order",
                 reference_id: data.order_id,
-                note: `Consumo de insumo na OS #${data.order_id.slice(0, 8)} (${part.name})`,
+                channel_origin: "workspace_services",
+                channel_source: "service_order",
+                note: `Consumo de peça na OS #${data.order_id.slice(0, 8)} (${part.name || "Peça/Insumo"})`,
                 actor_id: identity.user_id,
+                created_at: new Date().toISOString(),
               });
 
               await supabase
                 .from("product_variants")
-                .update({ stock_on_hand: newStock })
-                .eq("id", part.variant_id);
+                .update({ stock_on_hand: newStock, updated_at: new Date().toISOString() })
+                .eq("id", variant.id)
+                .eq("store_id", identity.store_id);
             } catch (stockErr) {
               console.warn(`[service-orders] Erro ao consumir estoque de ${part.name}:`, stockErr);
             }
           }
         }
       }
     }
```

---

### 4.3 Arquitetura & Implementação de BOM no Checkout Online
Para estender a dedução de ficha técnica ao checkout online da vitrine, recomenda-se criar a função modular `consumeOrderBomItems` em `src/services/checkout.functions.ts` (ou utilitário compartilhado em `src/services/inventory-bom.server.ts`):

```typescript
/**
 * Dedução automática e idempotente de Ficha Técnica (BOM) para pedidos online
 */
export async function consumeOrderBomItems(
  supabase: any,
  orderId: string,
  storeId: string,
  channelOrigin = "vitrine_online"
) {
  try {
    const { data: items } = await supabase
      .from("order_items")
      .select("id, variant_id, qty, product_title")
      .eq("order_id", orderId);

    if (!items || items.length === 0) return;

    for (const item of items) {
      if (!item.variant_id) continue;
      const soldQty = Number(item.qty) || 1;

      const { data: variant } = await supabase
        .from("product_variants")
        .select("id, product_id")
        .eq("id", item.variant_id)
        .eq("store_id", storeId)
        .maybeSingle();

      if (!variant?.product_id) continue;

      const { data: parentProduct } = await supabase
        .from("products")
        .select("attributes")
        .eq("id", variant.product_id)
        .eq("store_id", storeId)
        .maybeSingle();

      const bomList = (parentProduct?.attributes as any)?.bill_of_materials;
      if (!Array.isArray(bomList) || bomList.length === 0) continue;

      for (const bomItem of bomList) {
        const itemQty = Number(bomItem.quantity) || 1;
        const consumedQty = itemQty * soldQty;
        if (consumedQty <= 0) continue;

        let targetVariantId: string | null = null;
        let prevIngStock = 0;

        // 1. variant_id canônico
        const rawVarId = bomItem.variant_id || bomItem.variantId;
        if (rawVarId && typeof rawVarId === "string") {
          const { data: matchedVar } = await supabase
            .from("product_variants")
            .select("id, stock_on_hand")
            .eq("id", rawVarId)
            .eq("store_id", storeId)
            .maybeSingle();
          if (matchedVar) {
            targetVariantId = matchedVar.id;
            prevIngStock = matchedVar.stock_on_hand || 0;
          }
        }

        // 2. SKU
        if (!targetVariantId && bomItem.sku && typeof bomItem.sku === "string") {
          const { data: matchedVar } = await supabase
            .from("product_variants")
            .select("id, stock_on_hand")
            .eq("sku", bomItem.sku.trim())
            .eq("store_id", storeId)
            .maybeSingle();
          if (matchedVar) {
            targetVariantId = matchedVar.id;
            prevIngStock = matchedVar.stock_on_hand || 0;
          }
        }

        // 3. Fallback por nome
        if (!targetVariantId && bomItem.name && typeof bomItem.name === "string") {
          const { data: fuzzyProduct } = await supabase
            .from("products")
            .select("product_variants(id, stock_on_hand)")
            .eq("store_id", storeId)
            .ilike("title", `%${bomItem.name.trim()}%`)
            .limit(1)
            .maybeSingle();
          const fVar = (fuzzyProduct?.product_variants as any[])?.[0];
          if (fVar?.id) {
            targetVariantId = fVar.id;
            prevIngStock = fVar.stock_on_hand || 0;
          }
        }

        if (!targetVariantId) continue;

        // Idempotência: verificar se este insumo já foi deduzido para este pedido
        const { data: existingMov } = await supabase
          .from("stock_movements")
          .select("id")
          .eq("store_id", storeId)
          .eq("variant_id", targetVariantId)
          .eq("reference_type", "bom_consumption")
          .eq("reference_id", orderId)
          .limit(1);

        if (existingMov && existingMov.length > 0) continue;

        const newIngStock = Math.max(0, prevIngStock - consumedQty);

        await supabase
          .from("product_variants")
          .update({ stock_on_hand: newIngStock, updated_at: new Date().toISOString() })
          .eq("id", targetVariantId)
          .eq("store_id", storeId);

        await supabase.from("stock_movements").insert({
          store_id: storeId,
          variant_id: targetVariantId,
          movement_type: "sale",
          qty: -consumedQty,
          reference_type: "bom_consumption",
          reference_id: orderId,
          channel_origin: channelOrigin,
          channel_source: "storefront",
          note: `Consumo BOM vitrine online (${bomItem.name || targetVariantId}) no Pedido #${orderId.slice(0, 8)}`,
          created_at: new Date().toISOString(),
        });
      }
    }
  } catch (bomErr) {
    console.warn("[checkout] Erro ao consumir BOM online:", bomErr);
  }
}
```

E em `src/services/checkout.functions.ts:510`, acoplada na conclusão atômica do checkout:
```typescript
if (result.orderId) {
  // Executar baixa de BOM para produtos compostos vendidos online
  const orderStoreId = resolvedStoreId;
  if (orderStoreId) {
    await consumeOrderBomItems(db, result.orderId, orderStoreId, "vitrine_online");
  }
}
```

---

## 5. Verification Method

### 5.1 Inspeção Estática de Arquivos
1. **Verificação de `movement_type` e Colunas em `service-orders.functions.ts`**:
   - Confirmar substituição de `movement_type: "loss"` por `movement_type: "sale"`.
   - Confirmar remoção de `previous_stock` e `new_stock`.
   - Confirmar inclusão de `completed` no enum Zod e checagem de `wasAlreadyConcluded`.
2. **Verificação de Resolução em `pdv.functions.ts`**:
   - Confirmar substituição de `.ilike("title", ...)` isolado pela cascata de resolução (`variant_id` -> `sku` -> `product_id` -> nome).
   - Confirmar sincronização em `product_location_inventories`.
   - Confirmar `movement_type: "sale"`.

### 5.2 Execução de Testes Unitários Focados (Vitest)
Executar os testes focados de ledger de estoque e catálogo:
```powershell
npx vitest run src/services/canonical-stock-ledger.test.ts
npx vitest run src/services/pdv-floor-plan.test.ts
```
*(Nota: Estrita observância à PROIBIÇÃO ABSOLUTA de executar `npm run typecheck` ou `npm run build`).*

### 5.3 Condições de Invalidação
- O achado de incompatibilidade do PostgreSQL será invalidado se uma migração futura alterar `stock_movements_movement_type_check` para permitir explicitamente `'loss'` ou `'bom_consumption'`. Até o presente momento, o schema do banco rejeita ativamente esses valores.
