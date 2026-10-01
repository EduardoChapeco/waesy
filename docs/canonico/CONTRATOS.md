# CONTRATOS.md — Paridade de Contratos Ponta a Ponta (Banco → Interface)

Este documento comprova o alinhamento das 7 camadas de engenharia do Waesy, garantindo que não existam campos órfãos, descompassos de tipos ou divergências de validação.

---

## 1. A Cadeia Canônica de 7 Camadas

```
[1. Coluna Postgres] → [2. Tipo TypeScript] → [3. Schema Zod] → [4. Server Function BFF] → [5. Renderizador UI] → [6. Tool WebMCP] → [7. Auditoria / Evento]
```

---

## 2. Matriz de Paridade dos Domínios Centrais

| Domínio | 1. Tabela / Coluna | 2. Tipo TypeScript | 3. Validação Zod | 4. Serviço BFF | 5. Interface / UI | 6. Ferramenta WebMCP |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Estoque / Movimento** | `public.stock_movements` (`variant_id`, `qty`, `movement_type`) | `RecordStockMovementInput` | `recordStockMovementSchema` | `recordStockMovement` | `DenseDataGrid` / Histórico | `inspect_stock_ledger` |
| **Cotação de Preço** | `products` (`price_cents`, `sale_price_cents`) | `CalculatedPriceQuote` | `basePriceInputSchema` | `calculateBasePriceQuote` | `CanonicalListingPreviewFrame` | `calculate_canonical_offer_price` |
| **Pacote de Nicho** | `public.platform_domain_taxonomies` | `NichePackage` | `nichePackageSchema` | `getNichePackage` | `CanonicalListingEditor` | `get_niche_package_spec` |
| **Conteúdo do Anúncio** | `unified_listings_view.attributes` | `CanonicalAdContent` | `b1IdentitySchema`, etc. | `stripInternalContent` | `CanonicalListingView` | `search_unified_listings` |
| **Negociação / Lead** | `public.deals` (`total_price_cents`, `deal_type`) | `UnifiedListingTransaction` | `createTransactionSchema` | `createUnifiedListingTransaction` | `DealTimeline` / CRM | `transact_unified_listing` |

---

## 3. Garantia de Integridade
- Toda alteração em coluna do banco de dados gera sincronização compulsória do schema Zod correspondente.
- Proibido uso de `any` ou bypass de tipo nos contratos de comunicação inter-camadas.
