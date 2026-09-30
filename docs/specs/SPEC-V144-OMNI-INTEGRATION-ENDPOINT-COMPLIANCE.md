# SPEC-V144 — The Omni-Integration Audit, Endpoint Compliance & Deep Synchronization

## 1. Escopo e Contexto
A auditoria minuciosa do subsistema de integrações (`src/services/marketplace-hub.functions.ts`, `src/services/marketplace-webhooks.functions.ts`, `src/routes/api.webhooks.*`, `src/services/integrations.functions.ts`) revelou o diagnóstico de "Integração Superficial":
1. **Mercado Livre**: Temos importação de catálogo (`importMercadoLivreItem`), mas o webhook não processava o tópico `questions` (perguntas de clientes pré-venda) e as respostas de staff não disparavam o endpoint oficial `POST /answers`. Além disso, a atualização de estoque (`PUT /items/{id}`) não possuía fila resiliente com exponential backoff para tratamento de HTTP 429 (Rate Limiting).
2. **iFood (OpenDelivery v1.0)**: O receptor de webhooks processava apenas confirmação/despacho, mas não expunha o endpoint de sincronização reversa de catálogo e pausamento de itens esgotados (`PATCH /merchants/{merchantId}/items/{itemId}/status`).
3. **Bling ERP v3**: O sistema limitava-se a validar o token (`GET /situacoes/modulos`), sem receptor de webhooks para o evento `pedidos.emitir_nfe` / `notas_fiscais.autorizada` e sem anexação automática do Danfe PDF/Chave à compra na tabela mestra `public.orders`.
4. **WhatsApp Cloud API**: Mensagens recebidas eram gravadas apenas em `whatsapp_leads`, desconectadas da central unificada de atendimento (`public.chat_threads` e `public.chat_messages`). O lojista não conseguia responder via `/workspace/atendimento` com envio de volta ao cliente pelo WhatsApp.
5. **Resiliência e Rate Limiting**: Falhas transitórias (429 Too Many Requests, 502/503/504 Bad Gateway) não possuíam política formal de repetição com backoff exponencial e jitter, correndo risco de colapso de sincronização e inconsistência de estoque.

---

## 2. Relatório de Compliance de APIs (The API Reality Check)

| Canal / Plataforma | O que Tínhamos Codificado | O que a Documentação Oficial Exige (Nível A Enterprise) | Diagnóstico de Gaps | Severidade |
| :--- | :--- | :--- | :--- | :--- |
| **Mercado Livre** (`api.mercadolibre.com`) | Ingestão de pedidos via webhook `orders_v2` e importação pontual de catálogo (`GET /items/{id}`). | 1. Webhook HMAC SHA-256 (`x-signature`).<br>2. Recepção do tópico `questions` no Webhook.<br>3. Disparo de resposta ao cliente (`POST /answers`).<br>4. Atualização imediata de estoque (`PUT /items/{id}`) com retry 429.<br>5. Refresh Token rotativo OAuth 2.0. | Faltava integração do tópico `questions` com o Chat do Atendimento (`chat_threads`), envio de respostas via API e backoff exponencial em atualizações de estoque. | **P0 (Crítico)** |
| **iFood** (`merchant-api.ifood.com.br`) | Webhook de pedidos `PLACED`, `CONFIRMED`, `DISPATCHED` e gravação em `marketplace_external_orders`. | 1. Validação de assinatura HMAC `x-ifood-signature`.<br>2. Endpoint de Acknowledge (`POST /order/v1.0/events/acknowledgment`).<br>3. Pausar/Retomar item esgotado (`PATCH /catalog/v1.0/merchants/{id}/items/{id}/status`).<br>4. Polling de contingência em caso de queda de webhook. | Falta de desligamento imediato de prato no iFood ao zerar estoque no Waesy, e falta de ack explícito de eventos OpenDelivery. | **P0 (Crítico)** |
| **Bling ERP v3** (`api.bling.com.br/v3`) | Validação estática de credencial (`GET /situacoes/modulos`). | 1. Ingestão de Webhooks Bling v3 (`situacao.alterada`, `nfe.emitida`).<br>2. Atualização atômica do Danfe PDF (`link_danfe`) e chave da NF-e no pedido em `public.orders`.<br>3. Sincronização de estoque bidirecional (`GET /estoques/saldos`). | Falsa completude: o Bling estava configurado apenas para teste de token, sem nenhum webhook receptor para notas fiscais autorizadas. | **P1 (Bloqueante)** |
| **WhatsApp Cloud API** (`graph.facebook.com/v19.0`) | Handshake de webhook e gravação em tabela isolada `whatsapp_leads`. | 1. Ingestão no Chat Centralizado (`chat_threads` e `chat_messages`).<br>2. Identificação do cliente por telefone/nome.<br>3. Resposta bidirecional: Staff responde no Waesy e API dispara `POST /{phone_number_id}/messages`. | Desacoplamento entre WhatsApp e Central de Atendimento (`/workspace/atendimento`). | **P1 (Bloqueante)** |
| **Resiliência e Anti-Crash** | Retentativa síncrona simples em timeout. | 1. Algoritmo de Exponential Backoff com Jitter (Full Jitter / Equal Jitter).<br>2. Circuit Breaker para 429 Too Many Requests e 5xx.<br>3. Mensagens defensivas de frontend sem quebra de tela. | Falta de motor unificado de retry com backoff exponencial em chamadas de saída. | **P1 (Bloqueante)** |

---

## 3. Requisitos em Sintaxe EARS

- **REQ-01 (Ubiquitous)**: O subsistema de integrações DEVE validar a assinatura criptográfica (HMAC SHA-256) de todo webhook de entrada, verificar janela temporal de replay (`timestamp <= 300s`) e registrar o evento de forma idempotente em `marketplace_webhook_events`.
- **REQ-02 (Event-Driven)**: QUANDO o estoque ou preço de qualquer produto/variante for alterado no Waesy (seja por venda PDV, pedido balcão, checkout online ou ajuste manual), o sistema DEVE despachar a atualização para todos os canais conectados (Mercado Livre, iFood, WhatsApp Catalog) utilizando motor de fila com Exponential Backoff e Jitter.
- **REQ-03 (Event-Driven)**: QUANDO uma pergunta do Mercado Livre (`topic = 'questions'`) ou mensagem do WhatsApp Cloud API for recebida via webhook, o sistema DEVE criar ou atualizar a thread correspondente em `public.chat_threads` e `public.chat_messages`, associando ao canal externo (`channel_origin`).
- **REQ-04 (Event-Driven)**: QUANDO um atendente responder a uma mensagem em `/workspace/atendimento` pertencente a uma thread externa, o sistema DEVE despachar a resposta via API oficial do canal (Mercado Livre `POST /answers` ou Meta `POST /{phone_number_id}/messages`).
- **REQ-05 (Event-Driven)**: QUANDO o Bling ERP v3 ou provedor fiscal emitir uma Nota Fiscal autorizada, o webhook DEVE localizar o pedido em `public.orders`, vincular a chave de acesso `nfe_key` e URL do Danfe PDF (`danfe_pdf_url`), e registrar a fatura em `public.store_nfe_invoices` e `public.billing_invoices`.
- **REQ-06 (Unwanted Behavior)**: SE uma API externa responder com erro de taxa excedida (HTTP 429 Too Many Requests) ou erro de servidor (HTTP 500/502/503), ENTÃO o despachador DEVE aplicar repetição com Backoff Exponencial (`delay = base * 2^attempt + jitter`) e, caso esgote as tentativas, registrar falha descritiva em `marketplace_sync_logs` sem interromper a interface do usuário.

---

## 4. Invariantes e Critérios de Aceite
1. **HMAC & Replay**: Webhook com assinatura HMAC divergente retorna HTTP 401; requisições repetidas retornam `{ status: "duplicate" }` sem dupla execução de efeitos colaterais.
2. **Sincronização de Estoque**: Alteração de estoque no Waesy gera registro de saída `marketplace_sync_logs` com status `dispatched` ou `completed` e parâmetros de payload correspondentes.
3. **Chat Unificado**: Mensagem recebida via WhatsApp ou ML aparece instantaneamente em `listChatThreads` e mensagem enviada por staff dispara chamada HTTP para o provedor.
4. **Bling NFe**: Webhook do Bling atualiza `orders.notes`, `orders.cost_breakdown` e tabela fiscal associada.
5. **Zero Mocks**: Todos os conectores exigem credenciais reais e respeitam o Truth Engine (V143).
