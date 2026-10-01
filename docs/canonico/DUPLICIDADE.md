# DUPLICIDADE.md — Matriz Canônica de Campos com Dono Único (R15–R18)

Este documento estabelece o **Dono Único** para cada capacidade e campo transversal do ecossistema Waesy.
É estritamente proibido criar tabelas paralelas, colunas duplicadas ou validações bifurcadas para dados que já possuem autoridade declarada.

---

## 1. Campos Transversais e Donos Únicos

| Capacidade / Campo | Onde Estava Duplicado | Dono Único Canônico | Contrato / Tipo | Justificativa Arquitetural |
| :--- | :--- | :--- | :--- | :--- |
| **Preço Base** | `products.price_cents`, `classifieds.price`, `deals.proposed_price_cents` | `unified_listings_view.price_cents` / `pricing-engine` | `INTEGER` (centavos) | Evita divergências entre classificados e loja; Zero-Float Drift. |
| **Preço Promocional** | `products.sale_price_cents`, `promotions.discount_value` | `pricing-engine.calculateBasePriceQuote` | `INTEGER` (centavos) | Centralização da regra de promoção e validade temporal no BFF. |
| **Estoque e Disponibilidade** | `products.stock`, `product_variants.stock`, `classifieds.quantity` | `public.stock_movements` (Ledger Imutável) | `qty INTEGER`, append-only | Proibida atualização direta de estoque sem movimento auditável. |
| **Reserva Temporária** | `carts.reserved_until`, `orders.status` | `stock_movements (movement_type = 'reserve')` | UUID de pedido / carrinho | Impede overbooking e corrida concorrente (E3, E8). |
| **Classificação Fiscal (NCM)** | `products.ncm`, `global_master_catalog.ncm` | `products.ncm` validado via `global_ncm_tributes` | `VARCHAR(8)` | Exigido apenas para empresas com regime NF-e (A01, A14). |
| **Mídia e Fotos** | `products.images`, `classifieds.images`, `product_media` | `public.product_media` (com `role` e aspect ratio) | URL com CDN e ordem | Elimina arrays soltos de strings sem papel semântico definido. |
| **Variações e Grades** | `classifieds.attributes`, `product_variants` | `public.product_variants` | Grade canônica com SKU | Preserva herança polimórfica de atributos por nicho (A02). |
| **Documentos Contratuais** | `travel_contracts`, `jus_contracts`, `contracts` | `public.contracts` / `contract_templates` | Minuta com hash e envelope | Centralização da cadeia de evidência de assinatura eletrônica. |

---

## 2. Regras de Não-Proliferação de Schema
1. **Regra de Escrita Única**: Toda alteração de inventário passa obrigatoriamente por `recordStockMovement`.
2. **Regra de Preço Blindado**: Nenhum preço final é calculado no cliente; todo valor exibido deriva de `calculateBasePriceQuote` ou `calculateRentalQuote`.
3. **Regra de Isolamento**: Nenhum atributo interno (`supplier_cost`, `margin`, `net_cost`) trafega para a vitrine pública.
