# SPEC-MARKETPLACE-E2E-REMEDIATION — Correcao Integral E2E e Conformidade de APIs do Hub de Marketplaces

## 1. Veredito Forense da Baseline
Auditoria tecnica transversal realizada em banco/migrations, BFF (`src/services/marketplace-*.functions.ts`, `order.functions.ts`, `shipping.functions.ts`, `stock.functions.ts`, `admin-catalog.functions.ts`, `ifood-reconciliation.functions.ts`, `master.functions.ts`), rotas HTTP (`api.auth.marketplace.callback.ts`, `api.webhooks.marketplaces.ts`, `api.feed.meta[.]csv.ts`, `api.feed.xml.ts`) e interfaces (`workspace.integracoes.marketplaces.tsx`, `workspace.pedidos.expedicao.tsx`, `admin-master.integracoes.tsx`, `product-pricing-tab.tsx`).

**Conclusao:** A integracao com marketplaces encontra-se **incompleta**, apresenta **falhas P0 de fluxo real**, **stubs falso-positivos**, **violacoes de contrato de schema/RLS** e **lacunas de gestao operacional dentro do sistema**.

### Achados Criticos Consolidados
1. **Schema e RLS com quebra em runtime:**
   - `marketplace_connectors_platform_check` restringe plataformas a 9 nomes e rejeita `bling`, `tiny`, `loggi`, `jadlog`, `google_business`, `99food` presentes na UI e no Zod.
   - `marketplace_sync_logs` rejeita insercoes com `sync_type` (`stock_broadcast`, `catalog_import`, `profile`, `questions`) e `direction` (`inbound`, `outbound`), alem de haver chamada inserindo colunas inexistentes (`items_count`, `message`).
   - `channel_listings` nao possui coluna `metadata` (coluna real: `attributes`), causando erro na consulta de sincronismo ML.
   - Politicas RLS antigas de `marketplace_webhook_events` (`store_memberships`) e `marketplace_connectors` (`user_id` em vez de `profile_id` / `is_store_staff`) quebram ou bloqueiam consultas autenticadas no cliente.
   - Funcao `answerMercadoLivreQuestion` consulta tabela inexistente `channel_vault_credentials`.
2. **OAuth 2.0 e Criptografia de Credenciais (P0):**
   - `getMarketplaceOAuthUrl` aponta `redirect_uri` para rota inexistente (`/api/webhooks/marketplace?oauth_callback=1`) em vez de `/api/auth/marketplace/callback`.
   - `api.auth.marketplace.callback.ts` nao decodifica `state` base64url, suporta apenas Mercado Livre, ignora chaves de App por loja ou Admin Master (`waesy-matriz`) e grava tokens em texto puro em `credentials` sem cifra AES-256-GCM.
   - Ausencia de renovacao automatica de token (`refresh_token`) por expiracao/401 para Mercado Livre, Bling v3 (Basic Auth), Shopee v2 (HMAC-SHA256 `/api/v2/auth/access_token/get`), Amazon SP-API LWA, Magalu ID e Correios CWS (`/token/v1/autentica/cartaopostagem`).
   - Edicao de conector no Workspace envia `"••••••••"` filtrado e apaga credenciais ou falha na validacao; UI do Admin Master (`/admin-master/integracoes`) nao expoe os inputs de App ID/Secret de ML, iFood e Shopee ja suportados em `master.functions.ts`.
3. **Conformidade com APIs Oficiais:**
   - **Mercado Livre:** Verificacao `x-signature` exige manifesto `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`; notificacoes sao finas (`resource`) exigindo fetch ativo em `GET /orders/{id}`, `GET /shipments/{id}` e `GET /questions/{id}`; variacoes exigem `PUT /items/{item_id}/variations/{variation_id}`; anuncios novos exigem `POST /items`.
   - **iFood Merchant API v1.0:** Notificacoes devem ser persistidas antes de `POST /order/v1.0/events/acknowledgment`; webhook fino exige `GET /order/v1.0/orders/{id}`; ciclo de vida exige `confirm`, `startPreparation`, `readyToPickup`, `dispatch` e `requestCancellation`; assinatura usa `x-ifood-signature` HMAC-SHA256.
   - **Shopee Open Platform v2:** Requer assinatura HMAC-SHA256 por path + timestamp (janela de 5 min), webhook `Authorization` validando `${callbackUrl}|${rawBody}`, `v2.order.get_order_detail`, `v2.product.update_stock`, `v2.product.update_price` e `v2.logistics.ship_order`.
   - **Bling API v3:** Base URL canonica `https://api.bling.com.br/Api/v3/` (atualmente ha chamadas quebradas em `/v3/`) e assinatura `X-Bling-Signature-256` (`sha256=<hmac>`).
   - **Amazon SP-API / Magalu / Correios CWS:** Ausencia de refresh LWA/OAuth e chamadas de pedidos/estoque/catalogo reais.
   - **Falso-positivos:** `dispatchMarketplaceChannelSync` e `verifyMarketplaceConnectorConnectivity` retornam `completed`/`success: true` sem enviar HTTP ou quando a resposta falha (`!res.ok`).
4. **Seguranca Multi-Tenant e Feeds:**
   - `syncOrderToMaster` desconta estoque em `product_variants` apenas por `sku` sem filtrar `store_id`.
   - `api.feed.meta[.]csv.ts` permite vazamento cross-tenant quando `?store=` e omitido (nao usa `resolveTenantStoreId()` nem bloqueia com 400).
   - `api.webhooks.marketplaces.ts` nao resolve `store_id` pelo `external_account_id` do conector quando o parametro de query e omitido e valida HMAC de forma superficial.
5. **Desconexoes E2E & Gestao Dentro do Sistema:**
   - `_adjustStock` chama `dispatchMarketplaceChannelSync` sem `productId` e `newStockQty`.
   - `_updateOrderStatus`, `updateOrderShipment` e `updateOrderShippingDispatch` nao propagam mudancas de status, rastreio ou cancelamento para os marketplaces de origem; `updateOrderShippingDispatch` usa colunas inexistentes em `shipments` (`carrier`, `tracking_number`, `shipping_method`).
   - `workspace.pedidos.expedicao.tsx` passa `ord.id` (ID externo) para `ShippingLabelModal` em vez de `ord.order_id`.
   - `retryFailedWebhooks` passa `eventId` para `handleInboundWebhook` e cai em `"duplicate"` sem reprocessar.
   - Interface `/workspace/integracoes/marketplaces` nao expoe abas operacionais para Pedidos Externos + Despacho, Publicacao/Importacao de Catalogo, Precificacao por Canal, Perguntas ML/Chat iFood e Depositos (`inventory_locations`), alem de o botao do cabecalho abrir o modal de vinculo com `product = null`.

## 2. Requisitos Normativos (EARS)
- **REQ-01 (OAuth e Cofre):** When a store initiates OAuth 2.0 for `mercadolivre`, `bling`, `shopee`, `magalu`, or `ifood`, the system shall generate an authenticated redirect URI targeting `/api/auth/marketplace/callback` with encoded `state`, exchange authorization codes using store or platform master (`waesy-matriz`) credentials, fetch seller metadata, and persist AES-256-GCM encrypted `access_token`, `refresh_token`, and `token_expires_at` in `marketplace_connectors`.
- **REQ-02 (Auto-Refresh de Tokens):** While an OAuth connector token is near expiration (`token_expires_at <= now + 120s`) or an upstream API returns `HTTP 401`, the system shall automatically refresh the token using the platform-specific OAuth flow and persist rotated single-use tokens (`bling`, `shopee`) atomically before retrying the request.
- **REQ-03 (Conformidade Webhook & Pull-Back):** When `POST /api/webhooks/marketplaces` receives an event, the system shall validate platform HMAC signatures (`x-signature` manifesto para ML, `Authorization` `url|body` para Shopee, `X-Bling-Signature-256` para Bling, `x-ifood-signature` para iFood), resolve `store_id` cleanly (via query or `external_account_id`), record idempotently in `marketplace_webhook_events`, fetch full entity details via API when receiving thin payloads, persist `marketplace_external_orders`/`orders`/`marketplace_questions`, and only then dispatch iFood acknowledgments.
- **REQ-04 (Honestidade Operacional — Zero Falso-Positivo):** Where a marketplace connector lacks credentials or an upstream HTTP API rejects/fails, the system shall return and log status `unconfigured` or `failed`/`error` with HTTP error context, never returning `completed` or `success: true`.
- **REQ-05 (Isolamento Multi-Tenant):** While reconciling order SKUs or exporting Meta CSV / Google XML feeds, the system shall filter variants by `store_id` (`products!inner(store_id)`) and fail closed with HTTP 400 when feed tenant resolution fails, excluding restricted visibility items (`vip_only`, `store_only`, `hidden`).
- **REQ-06 (Gestao Completa Dentro do Sistema):** The Workspace shall provide in-system management inside `/workspace/integracoes/marketplaces`, `/workspace/pedidos/expedicao`, `/workspace/catalogo/produtos/$id`, `/workspace/atendimento`, and `/admin-master/integracoes` for: Platform Master OAuth Apps, Channel Connectors without secret-wiping, Product Publish/Import & Channel Pricing, Multi-Warehouse (`inventory_locations`), External Order Sync & Two-Way Lifecycle/Tracking Push, ML Q&A Inbox & iFood Chat Reconciliation, and Failed Webhook Retry/Reprocess.

## 3. Escopo de Arquivos
- Migration: `supabase/migrations/20270408000000_marketplace_hub_complete_e2e_hardening.sql`
- Cliente & Assinaturas Oficiais: `src/lib/marketplace-api-client.ts`
- Rotas HTTP: `src/routes/api.auth.marketplace.callback.ts`, `src/routes/api.webhooks.marketplaces.ts`, `src/routes/api.feed.meta[.]csv.ts`, `src/routes/api.feed.xml.ts`
- BFF Services: `src/services/marketplace-hub.functions.ts`, `src/services/marketplace-webhooks.functions.ts`, `src/services/order.functions.ts`, `src/services/shipping.functions.ts`, `src/services/stock.functions.ts`, `src/services/admin-catalog.functions.ts`, `src/services/ifood-reconciliation.functions.ts`
- Interfaces: `src/routes/workspace.integracoes.marketplaces.tsx`, `src/components/workspace/marketplace-hub-panels.tsx`, `src/routes/admin-master.integracoes.tsx`, `src/routes/workspace.pedidos.expedicao.tsx`, `src/components/commerce/shipping-label-modal.tsx`, `src/components/admin/catalog/product-editor/product-pricing-tab.tsx`, `src/routes/workspace.atendimento.index.tsx`
- Testes e Log: `src/services/marketplace-e2e-compliance.test.ts`, testes de contrato existentes e `docs/design/DECISIONS.md`

## 4. Criterios de Aceite (DoD)
- [ ] `node .\node_modules\vitest\vitest.mjs run` para toda a suite de marketplaces com 0 falhas.
- [ ] `npm.cmd run typecheck` com Exit Code 0.
- [ ] `npm.cmd run lint:design` aprovado sem novas violacoes P0/P1 na catraca.
- [ ] `npm.cmd run check:bff` e `npm.cmd run check:schema` aprovados.
- [ ] `npm.cmd run build` com Exit Code 0.
- [ ] Registro de decisao arquitetural atualizado em `docs/design/DECISIONS.md`.
