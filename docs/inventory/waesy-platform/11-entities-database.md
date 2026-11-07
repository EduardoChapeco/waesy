# 11 — Inventário de Banco de Dados e Entidades (775 Tabelas)

## 1. Governança de Schemas e Migrações
A base do Waesy é estruturada em **576 migrações SQL**versionadas em `supabase/migrations/`. Um total de **775 tabelas distintas** compõem o modelo de dados relacional.

## 2. Entidades Centrais do Domínio
- **Núcleo Multi-Tenant:** `organizations`, `stores`, `profiles`, `store_memberships`, `audit_log`.
- **Catálogo & Varejo:** `products`, `product_variants`, `product_media`, `categories`, `stock_movements`, `collections`.
- **Vendas & Pedidos:** `orders`, `order_items`, `carts`, `cart_items`, `payments`, `shipping_options`, `exchanges`.
- **CMS & Builder:** `omni_documents`, `omni_document_versions`, `marketplace_surfaces`, `marketplace_sections`, `hotpages`, `navigation_menus`.
- **Turismo:** `travel_departures`, `travel_proposals`, `travel_vouchers`, `travel_contracts`, `tourism_incidents`.
- **CRM & WhatsApp:** `whatsapp_channels`, `whatsapp_messages`, `customers_crm`, `deals`, `lead_forms`.
- **Financeiro:** `financial_ledgers`, `cash_registers`, `installments`, `commissions`, `invoices`.

A lista detalhada de tabelas e status de RLS está em:
👉 [`entities.csv`](./entities.csv)
