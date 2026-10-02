# SPEC-F12 — Workspace: Catálogo de Produtos Real (CRUD Completo de Produtos, Mídia, Variantes e Estoque)

## 1. Identificação e Metadados
- **ID:** SPEC-F12-WORKSPACE-CATALOG-CRUD
- **Fase:** F12 (Plano de Estabilização E2E — Pilar 4: Workspace Pro)
- **Status:** Aprovada
- **Data:** 2026-10-02
- **Autor:** BigTech Engineering & Architecture Board (Antigravity Agent)
- **SSOT Relacionados:** `AGENTS.md`, `DESIGN.md`, `DESIGN-LINT.md`, `PROXIMOS_PLANOS_EXECUCAO.md`, `SPEC-F04-UPGRADE-BRIDGE.md`.

---

## 2. Contexto e Escopo Delimitado
O catálogo de produtos no Workspace Pro é a espinha dorsal operacional para que lojistas e empresas credenciadas gerenciem seu sortimento ofertado no Marketplace e no PDV local.
Esta especificação estabelece os contratos transacionais definitivos para o ciclo de vida completo de produtos:
1. **Listagem Paginada (`listWorkspaceProductsFn`):** Keyset pagination ordenada por `created_at DESC`, filtros granulares por status (`draft`, `published`, `archived`), categoria e termo de busca textual.
2. **Criação Atômica (`createWorkspaceProductFn`):** Inserção transacional com validação via Zod, associação obrigatória ao `store_id` do operador autenticado (`assertStoreAccess`), mídia associada com ordenação e variantes com controle de estoque.
3. **Atualização Parcial/Total (`updateWorkspaceProductFn`):** Edição com garantia estrita de tenant (o produto deve pertencer à loja do operador), atualização de preços em centavos inteiros e recálculo de status.
4. **Arquivamento Seguro (`archiveWorkspaceProductFn`):** Soft delete (transição de status para `archived`), preservando integridade referencial com pedidos passados em `orders` e `order_items`.

---

## 3. Requisitos Funcionais em Sintaxe EARS

### 3.1 Requisitos Ubíquos (Ubiquitous Requirements)
- **EARS-U01:** O sistema SHALL calcular todos os preços e custos monetários estritamente em centavos inteiros (`price_cents`, `compare_at_cents`, `cost_cents`), proibindo arredondamentos de ponto flutuante no cliente.
- **EARS-U02:** O sistema SHALL rejeitar qualquer operação de criação, leitura, atualização ou arquivamento caso o operador não possua autorização formal comprovada via `assertStoreAccess(identity, storeId)`.
- **EARS-U03:** O sistema SHALL consumir estritamente dados reais das tabelas `products`, `product_variants`, `product_media` e `categories` no Supabase (M01: Zero Mocks).

### 3.2 Requisitos Orientados a Eventos (Event-driven Requirements)
- **EARS-E01:** QUANDO o operador submeter um produto com variantes, O sistema SHALL persistir cada variante vinculada ao `product_id` recém-criado com SKU normalizado e estoque inicial.
- **EARS-E02:** QUANDO o operador arquivar um produto através de `archiveWorkspaceProductFn`, O sistema SHALL atualizar `status = 'archived'` e invalidar o cache edge do catálogo da respectiva loja.
- **EARS-E03:** QUANDO uma busca textual for solicitada em `listWorkspaceProductsFn`, O sistema SHALL aplicar filtro `ilike` sobre o título e o SKU do produto.

### 3.3 Requisitos de Estado (State-driven Requirements)
- **EARS-S01:** ENQUANTO o produto estiver com `status = 'draft'`, ELE NÃO SHALL ser visível nas vitrines públicas do Marketplace (`/marketplace`), permanecendo restrito ao painel Pro do Workspace.
- **EARS-S02:** ENQUANTO uma variante possuir `stock_on_hand <= 0` e `allow_backorder = false`, O sistema SHALL computar `is_out_of_stock = true` no sumário da variante.

### 3.4 Tratamento de Comportamentos Indesejados (Unwanted Behaviors)
- **EARS-W01:** SE um operador tentar editar ou arquivar um produto que pertence a outro `store_id`, ENTÃO O sistema SHALL lançar exceção de autorização ("Produto não encontrado ou acesso não autorizado à loja").
- **EARS-W02:** SE o valor de `price_cents` for inferior a 0, ENTÃO O sistema SHALL rejeitar a carga na camada de validação Zod antes de qualquer query ao banco.

---

## 4. Contratos de Dados (DTOs e Schemas Zod)

```typescript
export const createWorkspaceProductInputSchema = z.object({
  storeId: z.string().uuid().optional(),
  title: z.string().min(2, "Título deve ter pelo menos 2 caracteres").max(200),
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hifens"),
  description: z.string().max(5000).optional().nullable(),
  priceCents: z.number().int().min(0, "Preço deve ser positivo"),
  compareAtCents: z.number().int().min(0).optional().nullable(),
  costCents: z.number().int().min(0).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  mediaUrls: z.array(z.string().url()).default([]),
  variants: z.array(
    z.object({
      sku: z.string().min(1).max(100),
      attributes: z.record(z.any()).default({}),
      priceOverrideCents: z.number().int().min(0).optional().nullable(),
      stockOnHand: z.number().int().min(0).default(0),
      allowBackorder: z.boolean().default(false),
    })
  ).default([]),
});

export const updateWorkspaceProductInputSchema = z.object({
  productId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  title: z.string().min(2).max(200).optional(),
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(5000).optional().nullable(),
  priceCents: z.number().int().min(0).optional(),
  compareAtCents: z.number().int().min(0).optional().nullable(),
  costCents: z.number().int().min(0).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  mediaUrls: z.array(z.string().url()).optional(),
});

export const listWorkspaceProductsInputSchema = z.object({
  storeId: z.string().uuid().optional(),
  status: z.enum(["all", "draft", "published", "archived"]).default("all"),
  searchQuery: z.string().max(100).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional().nullable(),
});
```

---

## 5. Definition of Done & Critérios de Aceite
- [ ] Implementação de `src/services/workspace-catalog.functions.ts` com validação Zod e `assertStoreAccess`.
- [ ] Re-exportação canônica e unificada em `src/services/catalog.functions.ts`.
- [ ] Suíte de testes unitários com 100% de aprovação em `src/services/workspace-catalog.functions.test.ts`.
- [ ] 0 violações de design lint na catraca determinística (`node scripts/design-lint.mjs --ratchet`).
- [ ] 0 erros de compilação TypeScript (`npm run typecheck` Exit Code 0).
- [ ] Registro canônico em `docs/design/DECISIONS.md` (`DEC-138`).
