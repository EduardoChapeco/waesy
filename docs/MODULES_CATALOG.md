# Catálogo Canônico de Módulos, Arquitetura E2E e Protocolo WebMCP / OpenAPI 3.1 — Waesy Platform

> **Documento Oficial de Engenharia & Governança de BigTech (Fase 1 / Fase 2)**  
> Consolida os 21 módulos operacionais, públicos e de IA da plataforma Waesy, seus fluxos ponta a ponta, schemas relacionais do Supabase, contratos BFF Server Functions, webhooks, ferramentas WebMCP e políticas de rate-limiting contra abusos.

---

## 🏛️ 1. Matriz Geral de Módulos & Governança Master

Todos os módulos abaixo estão registrados na tabela `platform_modules_config` do Supabase e possuem controle dinâmico de ativação/desativação instantânea em tempo real no painel do **Admin Master** (`/admin-master/modulos`).

| # | Chave do Módulo (`module_key`) | Nome Oficial | Categoria | Rota Canônica UI | Tabelas Supabase Vitais | BFF Server Functions |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | `fiscal_nfe` | Emissão Fiscal NF-e & NFC-e | `store_operation` | `/workspace/fiscal/nfe` | `store_nfe_configs`, `store_nfe_invoices` | `fiscal-nfe.functions.ts` |
| **02** | `wms_expedicao` | WMS Expedição, Separação & Picking | `store_operation` | `/workspace/pedidos/expedicao` | `wms_picking_batches`, `wms_picking_items`, `orders` | `wms.functions.ts` |
| **03** | `marketplaces_hub` | Hub Omnicanal de Marketplaces | `store_operation` | `/workspace/integracoes/marketplaces` | `marketplace_external_orders`, `marketplace_webhook_events`, `marketplace_sync_logs` | `marketplace-hub.functions.ts`, `marketplace-webhooks.functions.ts` |
| **04** | `pdv_pos` | Frente de Caixa Rápido & PDV Térmico | `store_operation` | `/workspace/pdv` | `cash_registers`, `cash_register_entries`, `orders` | `cash.functions.ts` |
| **05** | `kds_gastronomy` | KDS Cozinha & Monitor de Praças | `store_operation` | `/workspace/pedidos/gestor` | `orders`, `order_items`, `stores` | `cash.functions.ts`, `orders.functions.ts` |
| **06** | `juridico_contratos` | JUS Gestão de Contratos & Assinaturas | `store_operation` | `/workspace/contratos` | `contracts`, `contract_signatures`, `contract_templates` | `contracts.functions.ts` |
| **07** | `logistica_pudo` | Rede PUDO & Pontos de Retirada | `store_operation` | `/workspace/logistica/pudo` | `pudo_points`, `pudo_packages`, `couriers` | `pudo.functions.ts`, `company-delivery.functions.ts` |
| **08** | `marketing_studio` | Social Studio & Criador de Peças | `store_operation` | `/workspace/marketing/studio` | `studio_projects`, `products`, `product_media` | `studio.functions.ts`, `products.functions.ts` |
| **09** | `crm_turismo` | Pipeline de Cotações & CRM de Viagens | `store_operation` | `/workspace/turismo/cotacoes` | `travel_quotes`, `travel_destinations`, `crm_leads` | `tourism.functions.ts`, `travel-proposal.functions.ts` |
| **10** | `suporte_helpdesk` | Central de Chamados & Suporte Técnico | `store_operation` | `/workspace/suporte` | `support_tickets`, `support_messages` | `support-tickets.functions.ts` |
| **11** | `classificados` | Classificados & Imóveis | `public_discovery` | `/classificados` | `classifieds`, `classified_plans`, `classified_metrics` | `classifieds.functions.ts` |
| **12** | `noticias` | Notícias & Editorial | `public_discovery` | `/noticias` | `news_articles`, `news_sponsors`, `news_portals` | `news.functions.ts` |
| **13** | `ofertas` | Ofertas & Descontos | `public_discovery` | `/ofertas` | `flash_offers`, `products`, `stores` | `surface-cms.functions.ts` |
| **14** | `mercado` | Mercado Central | `public_discovery` | `/mercado` | `products`, `product_variants`, `stores` | `search.functions.ts`, `catalog.functions.ts` |
| **15** | `diretorio` | Guia da Cidade & Lojas | `public_discovery` | `/diretorio` | `stores`, `store_followers`, `reviews` | `search.functions.ts` |
| **16** | `convite` | Embaixadores & Convites | `public_discovery` | `/convite` | `invites`, `invite_scores`, `user_wallets` | `invite.functions.ts` |
| **17** | `afiliados` | Influenciadores & Afiliados | `public_discovery` | `/afiliados` | `affiliates`, `affiliate_tokens`, `affiliate_payouts` | `affiliates.functions.ts` |
| **18** | `turismo` | Turismo & Passeios | `public_discovery` | `/turismo` | `travel_packages`, `travel_destinations`, `travel_vouchers` | `tourism.functions.ts` |
| **19** | `simlab_econometrics` | SimLab Econometria Preditiva Censo 2022 | `ai_intelligence` | `/workspace/simulacao` | `simlab_experiments`, `simlab_synthetic_agents` | `simlab.functions.ts` |
| **20** | `squad_content` | Squad Multi-Agente (Aria, Bruno, Carla, Diego) | `ai_intelligence` | `/workspace/squads` | `squad_campaigns`, `squad_posts` | `squad-content.functions.ts` |
| **21** | `webmcp_engine` | Gateway WebMCP para IAs Externas | `ai_intelligence` | `/api/webmcp.json` | `api_orchestrator_pools`, `marketplace_sync_logs` | `mcp-server.functions.ts` |

---

## 🔄 2. Detalhamento dos Fluxos Operacionais E2E

### Fluxo 1: Venda Omnicanal, Baixa de Estoque e Emissão Fiscal
```
[Venda PDV / Checkout / Meli / iFood]
         │
         ├──> Transação ACID no Postgres (.rpc process_checkout_transaction_v2)
         │       ├── Gravação em public.orders & public.order_items
         │       ├── Baixa atômica em product_variants.stock_on_hand
         │       └── Registro no Kardex em public.stock_movements (tipo: 'sale')
         │
         ├──> Sincronização Reversa Multicanal (Background Task)
         │       └── _syncStockToMarketplacesInternal()
         │              ├── Mercado Livre Stock API
         │              ├── Shopee Inventory API
         │              └── Amazon Seller Central API
         │
         └──> Disparo Fiscal SEFAZ (emitOrderNFeAutomated)
                 ├── Montagem do Payload XML da NF-e / NFC-e
                 ├── Assinatura Digital e Transmissão via Provedor (Focus NFe, Nuvem Fiscal, etc.)
                 └── Gravação da Chave de Acesso e URL da DANFE em store_nfe_invoices
```

### Fluxo 2: WMS Expedição & Separação por Ondas (Picking)
```
[Pedidos com status 'paid' / 'processing']
         │
         ├──> Agrupamento em Onda de Separação (createPickingBatch)
         │       ├── Geração do Lote WMS em public.wms_picking_batches
         │       └── Itens individuais vinculados em public.wms_picking_items
         │
         ├──> Bipagem Ótica do Operador
         │       ├── Leitura de Código de Barras EAN-13 / SKU
         │       └── Verificação em tempo real de conformidade do item
         │
         └──> Expedição & Romaneio
                 ├── Atualização do Pedido para status 'shipped'
                 └── Notificação de Rastreamento ao Cliente (WhatsApp / Push / E-mail)
```

---

## 🤖 3. Especificação do Protocolo WebMCP para IAs Externas

A Waesy expõe um servidor **Model Context Protocol (WebMCP)** em conformidade com a especificação canônica da Anthropic e OpenAPI 3.1.

### Endpoints Oficiais
- **Manifesto de Ferramentas:** `GET /api/webmcp.json`
- **Execução de Ferramentas:** `POST /api/mcp/v1/tools/call`
- **Documentação OpenAPI 3.1:** `GET /api/openapi.json`

### Barreiras de Proteção Anti-Abuso (AI-Guards & Rate Limiting)
Para evitar ataques de negação de serviço, loops infinitos de agentes e consumo excessivo de recursos:
1. **Tier Público (`public`):**
   - Limite estrito de **30 requisições por minuto por IP** (`webmcp_tool_call_public`).
   - Lockout automático de 5 minutos em caso de violação persistente.
2. **Tier Corporativo de Loja (`store_staff`):**
   - Limite de **120 requisições por minuto por loja** (`webmcp_tool_call_staff`).
   - Isolamento multi-tenant inviolável: o agente DEVE fornecer identidade com sessão ou API Key válida associada ao `storeId` alvo.
3. **Simulações Pesadas (`ai_intelligence`):**
   - Limite de **10 lotes simultâneos a cada 5 minutos** (`webmcp_batch_dispatch`).

### Catálogo de Ferramentas WebMCP Habilitadas
1. `search_catalog_products`: Busca semântica e por código de barras em produtos publicados.
2. `get_store_directory_info`: Consulta reputação, canais e dados cadastrais de lojas locais.
3. `check_delivery_coverage`: Verificação de CEP e cálculo de prazos de entrega.
4. `query_master_catalog`: Consulta ao banco mestre global de produtos e EANs.
5. `update_product_stock`: Atualização transacional de saldo físico em estoque de uma loja autorizada.
6. `wms_list_pending_orders`: Consulta de fila de pedidos aguardando separação e expedição.
7. `fiscal_get_invoice_status`: Leitura de notas fiscais emitidas, status SEFAZ e PDFs de DANFE.
8. `marketplaces_get_sync_health`: Diagnóstico de integridade dos canais externos (Meli, iFood, etc.).
9. `pos_get_cash_status`: Leitura do saldo em dinheiro e estado de abertura do caixa físico.
10. `simlab_run_survey`: Execução de pesquisas sintéticas preditivas com base no Censo IBGE 2022.
11. `generate_marketing_post`: Orquestração do Squad editorial (Aria, Bruno, Carla, Diego) para criação de peças.
12. `analyze_competitor_dna`: Monitoramento competitivo e mapeamento de Brand DNA de concorrentes.

---

## 🔒 4. Diretrizes de Segurança & LGPD
- **Zero-Trust Multi-Tenant:** `store_id` e `organization_id` são sempre derivados do JWT assinado pelo servidor (`getServerIdentity`), nunca aceitos como autoridade a partir do cliente.
- **Dinheiro em Centavos:** Todos os campos monetários no Postgres utilizam `integer` representando centavos de Real (`price_cents`, `total_cents`, `opening_amount_cents`).
- **Idempotência de Webhooks:** Todo evento externo possui `event_id` único registrado em `marketplace_webhook_events` com tabela de idempotência para rejeição de replays.
