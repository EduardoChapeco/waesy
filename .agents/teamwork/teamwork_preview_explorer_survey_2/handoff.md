# Relatório Forense de Engenharia — Explorer 2: BFF Contracts, Server Functions, Zod Schemas & Regras Transacionais

## 1. Observation

### 1.1 Mapeamento e Arquitetura de Contratos BFF (`src/services/*.functions.ts`)
- **Total de módulos catalogados:** 162 arquivos `*.functions.ts` em `src/services/`.
- **Mecanismo de ponte cliente/servidor:** Definidos via TanStack Start `createServerFn()`. Módulos `*.functions.ts` importam utilitários de servidor através da ponte de isolamento `src/lib/server-access.ts` (que utiliza importação dinâmica `await import(...)` para evitar que arestas do compilador `@tanstack/react-start/server` vazem para o grafo de bundling do cliente).
- **Clientes Supabase em uso:**
  - `getSSRClient()` (`src/lib/supabase-ssr.server.ts:22-61`): Usa chave `VITE_SUPABASE_ANON_KEY` e gerencia cookies de sessão via `@supabase/ssr` e `@tanstack/start-server-core`.
  - `getServerClient()` (`src/lib/supabase.ts:140-161`): Usa `SUPABASE_SERVICE_ROLE_KEY`, que **ignora completamente o Row Level Security (RLS)** do PostgreSQL.
  - `getAnonServerClient()` (`src/lib/supabase.ts:173-189`): Usa `VITE_SUPABASE_ANON_KEY` para consultas públicas no servidor sem bypass de RLS.

---

### 1.2 Auditoria de Autorização SSR & Bypass de RLS (`getServerIdentity`, `requireAdmin`, `assertStoreAccess`)

#### A. Bypass Crítico de Tenant em Mutações com `getServerClient()`
Diversas server functions usam `getServerClient()` (que bypassa RLS) e efetuam operações de `update` ou `delete` filtrando **apenas pelo ID do registro** (`.eq("id", data.id)`), sem validar se o registro pertence ao `store_id` do usuário autenticado:
1. **`src/services/admin-catalog.functions.ts:2411-2425` (`deleteStoreComplementGroup`)**:
   ```typescript
   export const deleteStoreComplementGroup = createServerFn({ method: "POST" })
     .validator(z.object({ id: z.string().uuid() }))
     .handler(async ({ data }) => {
       const identity = await getServerIdentity();
       if (!identity?.store_id) throw new Error("Não autenticado");
       const db = getServerClient();
       const { error } = await db
         .from("store_complement_groups")
         .delete()
         .eq("id", data.id); // VULNERABILIDADE: não filtra por store_id!
   ```
2. **`src/services/admin-catalog.functions.ts:2391-2397` (`saveStoreComplementGroup`)**:
   ```typescript
   if (data.id) {
     const { data: updated, error } = await db
       .from("store_complement_groups")
       .update(payload)
       .eq("id", data.id) // VULNERABILIDADE: não valida se data.id pertence a identity.store_id
   ```
3. **`src/services/service-orders.functions.ts:109-140` (`updateServiceOrderStatus`)**:
   ```typescript
   export const updateServiceOrderStatus = createServerFn({ method: "POST" })
     .validator(z.object({ order_id: z.string().uuid(), status: z.enum([...]) }))
     .handler(async ({ data }) => {
       const identity = await getServerIdentity();
       assertStoreAccess(identity); // Valida apenas que identity possui alguma loja ativa
       const supabase = getServerClient();
       const { data: os, error } = await supabase
         .from("service_orders")
         .update({ status: data.status, ... })
         .eq("id", data.order_id) // VULNERABILIDADE: atualiza OS de qualquer loja do banco
   ```
4. **`src/services/events.functions.ts:995-1420` (`deleteEventTask`, `deleteEventBudget`, `deleteEventSector`, `deleteEventPartner`, `deleteEventLineup`, `deleteEventDocument`)**:
   ```typescript
   export const deleteEventTask = createServerFn({ method: "POST" })
     .validator(z.object({ taskId: z.string().uuid() }))
     .handler(async ({ data }) => {
       const supabase = getServerClient();
       const identity = await getServerIdentity();
       assertStoreAccess(identity, ["owner", "admin", "manager"]);
       const { error } = await supabase.from("eventos_tarefas").delete().eq("id", data.taskId);
       // VULNERABILIDADE: apaga tarefas de eventos de outras lojas
   ```

#### B. Falha de IDOR por Omissão de `targetStoreId` em `assertStoreAccess`
Em `src/lib/identity-core.ts:79-126`, a função `assertStoreAccess` possui a assinatura:
```typescript
export function assertStoreAccess(
  identity: ServerIdentity,
  allowedRoles: readonly string[] | string[] = STAFF_ROLES,
  targetStoreId?: string | null,
)
```
Se `targetStoreId` for omitido, ela valida apenas se o usuário tem cargo na loja em sua sessão (`identity.store_id`).
No entanto, em `src/services/billing.functions.ts:26-60` (`createInvoice`) e `src/services/billing.functions.ts:6-24` (`getStoreInvoices`):
```typescript
export const createInvoice = createServerFn({ method: "POST" })
  .validator(z.object({ storeId: z.string().uuid(), ... }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]); // OMITIU data.storeId!
    const supabase = getServerClient();
    ...
    await supabase.from("platform_invoices").insert({ store_id: data.storeId, ... });
```
Um lojista dono da Loja A pode passar `storeId` da Loja B e criar faturas em nome de outra loja.

#### C. Endpoints Públicos Críticos Sem Autenticação
1. **`src/services/store.functions.ts:529-539` (`executeHardRefresh`)**:
   ```typescript
   export const executeHardRefresh = createServerFn({ method: "POST" })
     .validator(z.object({ confirmText: z.string() }))
     .handler(async ({ data: { confirmText } }) => {
       const db = getServerClient();
       const { data, error } = await db.rpc("execute_hard_refresh", { p_confirm_text: confirmText });
   ```
   Não há validação de sessão, `getServerIdentity()` ou checagem de papel antes de invocar a RPC.
2. **`src/services/billing-ledger.functions.ts:23-60` (`recordOrderMicroFee`)**:
   Server function `POST` pública acessível externamente que insere registros financeiros em `billing_line_items` e `billing_invoices` usando `getServerClient()`, sem qualquer checagem de autorização.
3. **`src/services/billing-ledger.functions.ts:108-142` (`recordSubscriptionMonthlyFee`)**:
   Server function `POST` pública sem autenticação que fatura mensalidades em `billing_line_items`.

---

### 1.3 Higienização Perimetral de Entradas e Esquemas Zod
- **Varredura de `.strict()`:** Busca exata por `.strict()` em `src/services/` e `src/lib/` retornou **0 ocorrências**.
- **Contaminação de campos dinâmicos:** Diversos esquemas aceitam payloads arbitrários através de `z.record(z.any())` ou `z.record(z.unknown())`:
  - `src/services/classifieds.functions.ts:754`: `attributes: z.record(z.any()).optional().default({})`
  - `src/services/admin-catalog.functions.ts:478, 494`: `attributes: z.record(z.unknown()).default({})`
  - `src/services/workspace-catalog.functions.ts:38`: `attributes: z.record(z.any()).default({})`
  - `src/services/checkout.functions.ts:178`: `checkoutConfig: z.record(z.any())`
- **Impacto:** Como o Zod não fecha os objetos com `.strict()`, propriedades adicionais não mapeadas ou atributos sensíveis injetados no cliente são gravados diretamente nos campos JSONB do banco de dados.

---

### 1.4 Closed Allowlists & Vazamento de Dados Fiscais (NCM, CEST, Custo, Margem)

#### A. Vazamento Púbico Direto em `src/services/unified-listing.functions.ts`
As funções públicas `getUnifiedListingById` (linhas 331-360) e `searchUnifiedListings` (linhas 250-326) utilizam `mapDatabaseRowToUnifiedListing` (linhas 36-125):
```typescript
export function mapDatabaseRowToUnifiedListing(row: any, origin: "classified" | "workspace"): UnifiedListing {
  ...
  return {
    ...
    cost_cents: row.cost_cents ? Number(row.cost_cents) : null,         // VAZAMENTO P0
    margin_percent: row.margin_percent ? Number(row.margin_percent) : null, // VAZAMENTO P0
    markup_percent: row.markup_percent ? Number(row.markup_percent) : null, // VAZAMENTO P0
    fiscal_profile: row.fiscal_profile || attrs.fiscal_profile,             // VAZAMENTO P0
    attributes: attrs,                                                     // VAZAMENTO P0
  };
}
```
Qualquer visitante anônimo que consuma a API pública de anúncios unificados recebe o custo em centavos, a margem de lucro, o markup e o perfil fiscal do lojista.

#### B. Vazamento em Catálogo Público (`src/services/catalog.functions.ts`)
Em `listPublishedProducts` (linhas 123 e 215-221):
- A query seleciona `attributes` da tabela `products`.
- Ao mapear os cards com `explodeProductToCards`:
  ```typescript
  attributes: row.attributes ?? {} // VAZAMENTO: Sem filtro pela allowlist
  ```
- Não há sanitização de `attributes`, vazando campos fiscais ou notas internas para a listagem da vitrine.

#### C. Vazamento em Detalhe de Produto (`src/services/product.functions.ts`)
- `product.functions.ts:21-29` define `PUBLIC_SPEC_ALLOWLIST` e a função `sanitizePublicProductAttributes` (linhas 31-40).
- Em `_getProductBySlug`:
  - No nível do produto pai (linha 324): `attributes: sanitizePublicProductAttributes((product as any).attributes)` (Blindado).
  - No nível das variantes (linha 152): `attributes: v.attributes ?? {}` (**Vazamento:** os atributos da variante não passam pela allowlist).

#### D. Vazamento em Classificados (`src/services/classifieds.functions.ts`)
- Em `getPublicClassifiedById` (linhas 235-239): `supabase.from("classifieds").select("*")` retorna a linha bruta com todos os atributos JSONB.
- Em `getAdsByStoreId` (linhas 159-165): `supabase.from("classifieds").select("*")` retorna todas as colunas sem Closed Allowlist.

#### E. Endpoints Abertos de Classificação Fiscal
- `src/services/master-catalog.functions.ts:18, 83`: `searchMasterCatalogProducts` e `lookupNcmTributes` são funções `createServerFn({ method: "GET" })` desprotegidas que expõem auto-complete de NCM, CEST, IBS e CBS para a web sem autenticação.
- `src/services/central-knowledge.functions.ts:1050`: `searchNcm` expõe busca aberta na tabela `ck_ncm` para clientes não autenticados.

---

### 1.5 Pipeline do Quick AI Onboarding
- **Orquestração Geral:** Definida em `src/services/magic-onboarding.functions.ts` e executada em `src/services/onboarding-pipeline.server.ts`.
- **Captura Web (Etapa 1):**
  - **Firecrawl:** `onboarding-pipeline.server.ts:276-308` invoca `https://api.firecrawl.dev/v1/scrape` via API key do cofre (`getNextActiveKey("firecrawl")`).
  - **Steel.dev:** `onboarding-pipeline.server.ts:366-410` invoca `https://api.steel.dev/v1/screenshot` com chave do cofre para gerar screenshot e buffer base64 da página.
  - **Fallback:** `onboarding-pipeline.server.ts:311-350` executa `fetch` nativo com remoção de scripts, styles e SVGs.
- **Concílio de IAs em 5 Squads:**
  - `runDesignSquad` (linha 499)
  - `runCopySquad` (linha 570)
  - `runPrSquad` (linha 625)
  - `runBusinessStrategistSquad` (linha 670)
  - `runMarketAnalystSquad` (linha 780)
  - Juiz e Consolidação Final: `runConsolidationAndJudge` (linha 835).
- **Provedor e Modelo LLM:**
  - Invocado via `executeUnifiedAiCall` (`src/services/api-orchestrator.functions.ts:562`).
  - Para o Google Gemini, o modelo padrão configurado na linha 773 é `gemini-2.5-flash`.
- **Persistência dos Resultados:**
  - `persistOnboardingResults` (`onboarding-pipeline.server.ts:975-1150`) persiste dados em:
    1. `stores` (linha 981)
    2. `brand_kits` (linha 997)
    3. `brand_dna_profiles` (linha 1027)
    4. `briefings` (linha 1059)
    5. `store_business_model_canvas` (linha 1085)
    6. `products` (linha 1130)
    7. `store_squads` (linha 1171)
    8. `ai_async_jobs` (linha 250)
  - **Achado de Atomicidade:** A persistência é realizada por meio de queries sequenciais independentes no Supabase, sem bloco de transação SQL (`BEGIN ... COMMIT`) ou RPC atômico. Falha em etapa intermediária causa inconsistência de estado parcial.

---

### 1.6 Dedução Automática de Ficha Técnica / BOM (Bill of Materials) & Ordens de Serviço

#### A. Vendas Balcão no PDV (`src/services/pdv.functions.ts:407-456`)
- Ao liquidar pedido no PDV, o sistema busca `bill_of_materials` no JSONB `products.attributes`:
  ```typescript
  const bomList = (parentProduct?.attributes as any)?.bill_of_materials;
  if (Array.isArray(bomList) && bomList.length > 0) {
    for (const bomItem of bomList) {
      const consumedQty = (Number(bomItem.quantity) || 1) * soldQty;
      const { data: ingProduct } = await supabase
        .from("products")
        .select("id, product_variants(id, stock_on_hand)")
        .eq("store_id", identity.store_id)
        .ilike("title", `%${bomItem.name}%`) // DEFEITO: matching frágil por string
        .limit(1)
        .maybeSingle();
  ```
- **Problemas identificados:**
  1. **Vinculação por substring:** A busca do insumo é feita por `ilike("title", `%${bomItem.name}%`)` em vez de um identificador canônico `variant_id`. Se o título do produto diferir do nome no BOM, a dedução falha ou consome o produto errado.
  2. **Classificação do movimento:** O movimento é registrado com `movement_type: "loss"` em vez de `"bom_consumption"` ou `"production"`.
  3. **Condição de corrida:** Dedução via `prevIngStock - consumedQty` sem bloqueio pessimista ou decremento atômico no banco.

#### B. Ordens de Serviço (`src/services/service-orders.functions.ts:143-179`)
- Ao mudar status para `"delivered"`, o sistema itera sobre `parts_used`:
  ```typescript
  if (data.status === "delivered" && os?.parts_used && Array.isArray(os.parts_used)) {
    for (const part of os.parts_used as any[]) {
      if (part.variant_id && part.quantity > 0) {
        ...
        await supabase.from("stock_movements").insert({
          store_id: identity.store_id,
          variant_id: part.variant_id,
          movement_type: "loss",
          qty: -part.quantity,
          reference_type: "service_order",
          reference_id: data.order_id,
          ...
        });
        await supabase.from("product_variants").update({ stock_on_hand: newStock }).eq("id", part.variant_id);
  ```
- **Problemas identificados:**
  1. **Ausência de idempotência:** Se a OS for atualizada repetidamente para o status `"delivered"`, o estoque é deduzido múltiplas vezes.
  2. **Status "completed" ignorado:** Apenas o status `"delivered"` dispara baixa; a conclusão padrão `"completed"` não efetua baixa.

#### C. Checkout Online vs BOM
- Na RPC `process_checkout_transaction_v2` (`supabase/migrations/20261115040000_update_process_checkout_v2_order_number_and_rates.sql:204-240`), o checkout deduz apenas a variante comprada. **Não há rotina SQL para decomposição e baixa de BOM** para produtos compostos vendidos pela vitrine online.

---

### 1.7 Validação de Estoque em Tempo Real no Carrinho/Checkout & Aritmética de Centavos
- **Aritmética de Centavos:**
  - `src/services/cart.functions.ts`: Subtotais, modificadores, snapshot e totais operam integralmente em inteiros de centavos (`totalCents`, `lineTotalCents`, `priceModifierCents`, `dynamicDiscountCents`).
  - Arredondamentos de cupons percentuais usam `Math.floor(totalCents * (coupon.discount_value / 100))`.
  - RPC PostgreSQL `process_checkout_transaction_v2`: Todos os campos monetários são declarados como `INTEGER` (`v_subtotal_cents`, `v_discount_cents`, `v_shipping_cents`, `v_total_cents`), eliminando 100% de erros de ponto flutuante IEEE 754.
- **Validação de Estoque:**
  - `cart.functions.ts:288-290`: Compara `availableStock < item.qty` e sinaliza `isOutOfStock: true`.
  - `process_checkout_transaction_v2:104-107`: Validação rígida com bloqueio pessimista do carrinho:
    ```sql
    IF v_item.qty > v_item.stock_on_hand AND NOT COALESCE(v_item.allow_backorder, false) THEN
      RAISE EXCEPTION 'O item (SKU: %) está esgotado ou tem quantidade insuficiente.', v_item.sku;
    END IF;
    ```
  - Lock transacional via `pg_advisory_xact_lock(hashtext(p_idempotency_key))` garante proteção contra submissões simultâneas concorrentes.

---

## 2. Logic Chain

1. **Premissa de Isolamento Multi-Tenant:** No Supabase, o RLS só protege a aplicação se as consultas executarem no contexto do usuário autenticado (`anon key` + JWT). Quando uma server function executa `getServerClient()`, as políticas de RLS são desativadas no nível do PostgreSQL.
2. **Constatação de Bypass:** As mutações em `admin-catalog.functions.ts:2411`, `service-orders.functions.ts:137` e `events.functions.ts:1002` utilizam `getServerClient()` e filtram unicamente por `id`. Logo, qualquer usuário autenticado com chave de sessão válida pode manipular registros de outras lojas simplesmente conhecendo ou iterando UUIDs.
3. **Premissa de Sigilo Fiscal:** A especificação proíbe expressamente o tráfego de dados fiscais (NCM, CEST, custo, margem) em rotas ou DTOs públicos.
4. **Constatação de Vazamento:** `unified-listing.functions.ts:65-67, 99` mapeia explicitamente `cost_cents`, `margin_percent`, `markup_percent` e `fiscal_profile` no retorno das funções públicas `getUnifiedListingById` e `searchUnifiedListings`. Portanto, o sistema viola a premissa de sigilo fiscal na camada de anúncios unificados.
5. **Premissa de Integridade Transacional do Onboarding:** O processo de Onboarding Rápido salva registros em cascata em 7 tabelas. Se ocorrer uma falha na etapa de `briefings` ou `store_business_model_canvas`, as alterações em `stores`, `brand_kits` e `brand_dna_profiles` persistem sem reversão automática (falta de transação ACID).
6. **Premissa de Dedução Confiável de BOM:** A baixa de insumos deve ser determinística e referenciar a entidade física no estoque. A busca atual por string `ilike` em `pdv.functions.ts` quebra o determinismo contábil e pode debitar insumos incorretos.

---

## 3. Caveats
- Não foram executados testes E2E com navegador real nesta auditoria de leitura, tendo sido priorizada a análise estática semântica do código TypeScript e das migrações SQL.
- A base de dados remota não foi modificada nem teve schemas alterados, em estrita observância à regra de exploração read-only.
- Nenhuma compilação (`npm run typecheck` ou `npm run build`) foi disparada, conforme proibição expressa do mandato.

---

## 4. Conclusion
A auditoria forense dos contratos BFF identificou solidez no cálculo aritmético de centavos e nas travas pessimistas da RPC de checkout. Em contrapartida, identificou vulnerabilidades severas que requerem remediação prioritária:
1. **Falhas Críticas de Isolamento Tenant (P0):** Omissão de `store_id` em queries de exclusão/atualização usando `service_role` em `service_orders`, `admin-catalog` (complementos) e `events`.
2. **Vazamento de Dados Fiscais e Margens (P0):** Retorno de `cost_cents`, `margin_percent` e `fiscal_profile` em `unified-listing.functions.ts` e de `attributes` brutos em listagens de catálogo e classificados.
3. **Endpoints Públicos Sensíveis Sem Autenticação (P1):** `executeHardRefresh` em `store.functions.ts` e `recordOrderMicroFee` em `billing-ledger.functions.ts`.
4. **Fragilidade no Consumo de BOM (P1):** Associação de insumos por correspondência de texto `ilike` no PDV e falta de idempotência na baixa de peças de ordens de serviço.
5. **Falta de Fechamento com `.strict()` nos Schemas Zod (P2):** Uso extensivo de `z.record(z.any())` que permite a passagem de metadados não tipados.

---

## 5. Verification Method

### Inspeção Estática de Arquivos
1. **Verificação de Bypass RLS:**
   - Inspecionar `src/services/service-orders.functions.ts` nas linhas 130-140. Confirmar ausência de `.eq("store_id", identity.store_id)`.
   - Inspecionar `src/services/admin-catalog.functions.ts` na linha 2420. Confirmar ausência de `.eq("store_id", targetStoreId)`.
   - Inspecionar `src/services/billing.functions.ts` na linha 37. Confirmar chamada a `assertStoreAccess` sem passagem de `data.storeId`.
2. **Verificação de Vazamento de Custo e Margem:**
   - Inspecionar `src/services/unified-listing.functions.ts` nas linhas 65-67 e 343-360. Confirmar que `cost_cents` e `margin_percent` são atribuídos ao DTO público.
3. **Verificação de Consumo de BOM:**
   - Inspecionar `src/services/pdv.functions.ts` nas linhas 420-426. Confirmar query `.ilike("title", `%${bomItem.name}%`)`.
   - Inspecionar `src/services/service-orders.functions.ts` nas linhas 144-175. Confirmar ausência de verificação prévia de `stock_movements` para prevenir dupla baixa.

### Execução de Testes Unitários Focados
Executar testes unitários com Vitest apenas nos arquivos de especificação correspondentes:
```powershell
npx vitest run src/services/admin-catalog-contracts.test.ts
npx vitest run src/services/workspace-catalog.functions.test.ts
npx vitest run src/services/onboarding-e2e-verification.test.ts
```

### Execução do Linter Visual
```powershell
node scripts/design-lint.mjs
```
*(Nota: Manter rigorosa conformidade com a proibição absoluta de executar `npm run typecheck` ou `npm run build`).*
