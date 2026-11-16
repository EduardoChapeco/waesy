# SPEC-20261115-VERTICAL-MODULES-DELIVERY-WMS

- **Data:** 2026-11-15
- **Status:** Aprovada para Execucao
- **Modulo:** Navegacao Vertical, Integracoes de Delivery (Brasil), Despacho, Separacao e Etiquetas
- **Escopo Delimitado:**
  - `supabase/migrations/20270515000000_food_delivery_platforms_and_orders_sync.sql`
  - `src/lib/workspace-navigation.ts`
  - `src/components/workspace/workspace-all-tools-dialog.tsx`
  - `src/routes/workspace.pedidos.index.tsx`
  - `src/routes/workspace.pedidos.expedicao.tsx`
  - `src/routes/workspace.pedidos.gestor.tsx`
  - `src/routes/workspace.logistica.pudo.tsx`
  - `src/routes/workspace.integracoes.marketplaces.tsx`
  - `src/routes/workspace.configuracoes.integracoes.tsx`
  - `src/routes/api.webhooks.marketplaces.ts`
  - `src/services/marketplace-webhooks.functions.ts`
  - `src/services/marketplace-hub.functions.ts`
  - `src/services/shipping.functions.ts`
  - `src/services/wms.functions.ts`
  - `src/services/channel-reports.functions.ts`
  - `src/services/order.functions.ts`
  - `src/components/commerce/channel-badge.tsx`
  - `src/components/workspace/marketplace-hub-panels.tsx`
  - `src/lib/__tests__/workspace-navigation-pillars.test.ts`
  - `src/services/__tests__/food-delivery-and-dispatch.test.ts`

## 1. Requisitos em Sintaxe EARS

### R1 — Isolamento de Modulos por Vertical e Eliminacao de Jargao Tecnico
- **R1.1 (Ubicuo):** O sistema deve substituir rotulos tecnicos ou compostos confusos (`Conferencia WMS`, `Ondas de Separacao (Lotes Ativos)`, `picking simultaneo`, `Bipagem de Produtos`, `Pontos PUDO`, `CT-e`, `Modulo WMS Completo`) por termos diretos em portugues (`Separacao e Envio`, `Lotes de Separacao`, `Conferencia por Codigo`, `Pontos de Coleta`, `Faturas de Frete`, `Central de Separacao`).
- **R1.2 (Orientado a Estado):** Enquanto uma empresa operar na vertical `gastronomy` ou `pharmacy`, o menu lateral e o dialogo de ferramentas devem exibir apenas modulos coerentes com entrega local (`Despacho Local`, `Entregadores`, `Tempo de Preparo`, `Taxas e Raios`), omitindo rotas exclusivas de encomenda/frete interestadual (`Pontos de Coleta`, `Faturas de Frete`, `Trocas e Devolucoes`, `Tabelas de Frete`, `Cotacoes de Frete`, `Separacao e Envio`), preservando integralmente os 11 pilares master exigidos.
- **R1.3 (Orientado a Estado):** Enquanto uma empresa operar em verticais nao-varejistas (`legal`, `jobs`, `education`, `news`, `services`, `real_estate`, `events`, `rental`, `automotive`, `vehicles`), `resolveWorkspaceNavigation` deve fornecer grupos logisticos/operacionais aderentes ao respectivo setor (prazos, vistorias, frota, operacao de eventos, materiais) sem vazar rotas de transporte de encomendas (`Pontos PUDO`, `CT-e`, `Trocas`), mantendo modo Master (`isMasterMode: true`) sem rotas orfas.

### R2 — Unificacao Real dos Canais Brasileiros de Delivery no Gestor de Pedidos
- **R2.1 (Orientado a Evento):** Quando um webhook ou sincronizacao for recebido de `ifood`, `99food`, `tridelivery`, `amodelivery`, `amoofertas`, `rappi` ou `aiqfome`, o backend deve validar assinatura/credenciais reais da loja, registrar o evento em `marketplace_webhook_events`, persistir em `marketplace_external_orders` e sincronizar o pedido para `public.orders` utilizando valores validos nas constraints PostgreSQL (`origin_type = 'ecommerce'`, `shipping_method = 'delivery' | 'provider'`).
- **R2.2 (Ubicuo):** As constraints SQL `chk_orders_channel_origin`, `orders_origin_channel_check` e `marketplace_connectors_platform_check` devem suportar nativamente `ifood`, `99food`, `tridelivery`, `amodelivery`, `amoofertas`, `rappi` e `aiqfome`.
- **R2.3 (Estado):** No Hub de Integracoes (`workspace.integracoes.marketplaces.tsx`), Configuracoes de Integracao (`workspace.configuracoes.integracoes.tsx`) e Gestor de Pedidos (`KDSPage` em `/workspace/pedidos` e `/workspace/pedidos/gestor`), lojas de alimentacao devem visualizar prioritariamente os canais de delivery brasileiros com configuracao real de credenciais e URL de webhook HMAC multi-tenant, sem dados simulados.

### R3 — Rastreabilidade e Gestao de Pedidos de Teste Externos (`#TEST-731612`)
- **R3.1 (Invariante):** O pedido `#TEST-731612` (`Eduardo Teste`, `platform = 'mercadolivre'`, `marketplace_fee_cents = 2398`, `imported_at = '2026-09-14 09:05:33.115+00'`) deve ser tratado como registro persistido em `marketplace_external_orders`, nunca mascarado como pedido nativo de delivery.
- **R3.2 (Orientado a Evento):** Quando um usuario autorizado acionar a remocao/arquivamento de um pedido externo de teste (`deleteExternalMarketplaceOrder`), a server function deve verificar o `store_id` da sessao ativa e remover com seguranca o registro em `marketplace_external_orders` (quando `order_id IS NULL` ou origem de teste).

### R4 — Fluxo Ponta a Ponta Real de Separacao, Romaneio, Etiqueta e Despacho
- **R4.1 (Orientado a Evento):** Ao solicitar `getOrderShippingLabelData` para um registro em `marketplace_external_orders`, o sistema deve mapear corretamente as colunas reais do banco (`buyer_name`, `buyer_document`, `buyer_phone`, `shipping_address`, `tracking_number`, `imported_at`) e calcular peso usando `(item.qty || item.quantity || 1)`.
- **R4.2 (Orientado a Evento):** Ao acionar `updateOrderShippingDispatch` em um pedido externo ainda nao espelhado em `orders` (`order_id IS NULL`), o sistema deve atualizar diretamente `marketplace_external_orders` (`tracking_number`, `external_status = 'shipped'`, `shipping_carrier`) ou vincular ao espelho correspondente em vez de falhar com erro.
- **R4.3 (Orientado a Evento):** Ao acionar `createPickingBatch` (`Nova Onda`) ou `generateShippingManifest` (`Gerar Romaneio`), o sistema deve criar lotes reais quando houver pedidos elegiveis (incluindo backfill seguro de `order_items` via `items_snapshot` quando ausente ou sincronizacao explicita de pedidos externos selecionados), e exibir um documento real imprimivel de Romaneio na interface sem descartar os dados em toast.

### R5 — Conformidade Arquitetural e Design Gates
- **R5.1:** Zero hardcoded hex/rgb, zero `!important`, zero classes Tailwind com colchetes arbitratios, altura minima de `h-11` para acoes interativas mobile/cabecalho, zero Containeritis e build/lint/vitest 100% aprovados.

## 2. Entradas, Saidas e Evidencias Exigidas
- **Entradas:** Vertical da loja (`storeSemantics.nicheId`), payloads de webhook/hub, IDs de pedidos (`orders` / `marketplace_external_orders`), lote/romaneio selecionado.
- **Saidas:** Navegacao lateral coerente com a vertical, pedidos externos sincronizados em `orders` / `KDSPage`, etiqueta/despacho funcional para `orders` e `marketplace_external_orders`, documento real de romaneio, migracao SQL aplicada no projeto Supabase `jfuebqmltksyznovhlwa`.
- **Evidencias:** Testes unitarios e de contrato em Vitest, auditoria `lint:design --ratchet`, `audit:buttons`, `eslint --quiet .`, `npm run build`, `check:route-budget`, e verificacao HTTP em producao (`waesy.com.br`).
