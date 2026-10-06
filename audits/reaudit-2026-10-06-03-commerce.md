# Reauditoria Commerce — Marketplace, Carrinho, Checkout e Pagamentos

**Data da auditoria:** 2026-10-06  
**Domínio:** Marketplace, checkout, pedidos, itens, pagamentos, gateway, webhooks, estoque, ledger, recorrência e conciliação  
**Escopo:** `/home/ubuntu/waesy-audit`  
**Estado observado:** working tree atual, incluindo migrations e arquivos não commitados já presentes no workspace. Nenhum código foi alterado nesta auditoria.

## 1. Resumo executivo

O projeto tem duas trilhas de checkout em paralelo:

1. **Checkout padrão da vitrine**, baseado em `carts` e na RPC `process_checkout_transaction_v2`, com revalidação de preço/estoque no banco, mas com mutações financeiras pós-RPC.
2. **Checkout B2C do Marketplace**, baseado em `create_marketplace_checkout_atomic`, que cria pedido e pagamento e chama Mercado Pago, mas ainda tem lacunas críticas de variante, estoque, frete, reversão e conciliação.

A maior exposição é a combinação de **isolamento incompleto do carrinho por loja**, **perda da variante escolhida**, **baixa de estoque sem ledger/rollback** e **confiança em frete enviado pelo navegador**. Em pagamentos, a trilha Marketplace tem um gateway real configurado em código, porém o caminho padrão ainda contém uma função que não chama provedor externo e a UI pode declarar sucesso mesmo quando a iniciação de pagamento falha. Webhooks possuem boa intenção de assinatura/idempotência, mas há um erro específico no cálculo HMAC de Mercado Livre, ausência de vínculo criptográfico entre `store_id` e a credencial do conector e um retry que retorna `duplicate` em vez de reprocessar evento `failed`.

**Classificação geral:** Crítico — não recomendar considerar o domínio Commerce pronto para dinheiro real sem tratar F-01 a F-07.

## 2. Evidência e método

Foram lidos:

- BFFs: `src/services/cart.functions.ts`, `checkout.functions.ts`, `marketplace-checkout.functions.ts`, `marketplace-webhooks.functions.ts`, `payment.functions.ts`, `payment-gateway.server.ts`, `orders.functions.ts`, `stock.functions.ts`, `immutable-ledger.functions.ts`, `billing-ledger.functions.ts`, `classifieds.functions.ts` e `channel-reports.functions.ts`.
- Rotas: `src/routes/_store.checkout.tsx`, `src/routes/_store.marketplace.checkout.tsx`, `api.webhooks.payments.ts`, `api.webhooks.marketplaces.ts` e `api.webhooks.pix.ts`.
- Migrations base e comerciais: `0002_catalog.sql`, `0003_orders.sql`, `0025_checkout_rpc.sql`, `0028_payment_transactions.sql`, `20260812160000_cart_atomic_v6_options_pricing.sql`, `20260828030000_checkout_idempotent_v4.sql`, `20260828020000_shipment_webhook_inbox.sql`, `20260907183000_classifieds_recurring_subscriptions_and_plans.sql`, `20260929170000_v141_billing_invoices_and_ledger.sql`, `20261115040000_update_process_checkout_v2_order_number_and_rates.sql`, `20261115000000_systemic_order_number_and_telemetry.sql` e `20270110000000_marketplace_checkout_gateway_atomic.sql`.
- Testes de Commerce: `marketplace-checkout.functions.test.ts`, `marketplace-webhooks-and-payouts.test.ts`, `cart-lifecycle-end-to-end.test.ts` e `hybrid-checkout-and-omni-cart.test.ts`.

Comando executado:

```text
npx vitest run src/services/marketplace-checkout.functions.test.ts src/services/marketplace-webhooks-and-payouts.test.ts src/services/cart-lifecycle-end-to-end.test.ts src/services/hybrid-checkout-and-omni-cart.test.ts --reporter=dot
```

Resultado: **4 arquivos e 24 testes passaram**. Esses testes são predominantemente de schema, cálculo, mapeamento DTO e contratos isolados; não comprovam execução contra PostgreSQL, gateway, webhook assinado, concorrência ou conciliação.

## 3. Achados detalhados

### F-01 — Carrinho ativo não é isolado por loja na RPC principal

**Severidade:** Crítica  
**Tipo:** Fato confirmado; impacto de mistura cross-store é hipótese operacional dependente de o mesmo cliente comprar em mais de uma loja.

**Fato:** `add_to_cart_atomic_v6` procura o carrinho ativo por `customer_id` ou `session_token`, mas não filtra por `p_store_id` (`20260812160000_cart_atomic_v6_options_pricing.sql:24-33`). Se já existe carrinho, reutiliza-o e só a criação inicial grava `p_store_id` (`:35-41`). O BFF envia a loja pretendida para a RPC (`src/services/cart.functions.ts:573-584`). O checkout posterior deriva `v_store_id` do carrinho (`20261115040000_update_process_checkout_v2_order_number_and_rates.sql:58-69`) e, no loop de itens, faz join de variante/produto sem uma condição explícita de que o produto pertença a `v_store_id` (`:72-103`).

**Hipótese/risco:** um usuário com carrinho ativo da loja A adicionando produto da loja B pode colocar a variante de B no carrinho de A; o pedido e o pagamento serão atribuídos à loja A, enquanto o item/estoque pode ser de B. Isso compromete tenant, comissão, estoque, receita e atendimento.

**Dependências:** definição de carrinho multi-loja, identidade guest/customer, `add_to_cart_atomic_v6`, `process_checkout_transaction_v2` e RLS bypassado pelo cliente server-side.

**Correção concreta:** alterar a busca e a chave lógica do carrinho para `(store_id, customer_id)` ou `(store_id, session_token)`; rejeitar cart existente com `store_id <> p_store_id`; impor no checkout `p.store_id = v_store_id` para cada variante; adicionar constraint/índice de unicidade de carrinho ativo por loja e testes concorrentes multi-loja.

### F-02 — Checkout Marketplace descarta a variante escolhida e vende a primeira variante ativa

**Severidade:** Crítica  
**Tipo:** Fato confirmado.

**Fato:** o schema do Marketplace recebe somente `productId`, `title`, `priceCents`, `quantity` e opções; não recebe `variantId` (`src/services/marketplace-checkout.functions.ts:56-62`). A página envia exatamente esse payload (`src/routes/_store.marketplace.checkout.tsx:198-203`). A RPC escolhe `product_variants` por `product_id`, filtra `status = 'active'`, ordena por `created_at` e usa `limit 1` (`20270110000000_marketplace_checkout_gateway_atomic.sql:69-84`). O SKU dessa variante é o que vai para o snapshot e `order_items` (`:90-117`), e é a mesma variante cujo estoque é decrementado (`:94-97`).

**Impacto:** produtos com tamanho, cor, voltagem, lote ou qualquer matriz de variantes podem gerar pedido do SKU errado e baixar o estoque errado. `selectedOptions` é apenas copiado para o snapshot; não resolve a variante nem é validado contra grupos/opções do produto.

**Dependências:** contrato da vitrine, `product_variants`, `order_items`, estoque e catálogos com matriz.

**Correção concreta:** incluir `variantId` no item; validar no banco que a variante pertence ao `productId`, à loja, está ativa e tem opções permitidas; usar essa variante no lock, snapshot, `order_items`, baixa, reserva e sincronização de canais; rejeitar ausência de variante quando o produto possui mais de uma.

### F-03 — Frete do Marketplace é um valor controlado pelo navegador

**Severidade:** Alta  
**Tipo:** Fato confirmado; fraude de frete é hipótese de exploração, não evidência de execução em produção.

**Fato:** a página calcula o total localmente e envia `shippingCents` junto com `shippingOptionId` (`src/routes/_store.marketplace.checkout.tsx:124-128`, `:195-197`). O BFF repassa `data.shippingCents` diretamente à RPC (`src/services/marketplace-checkout.functions.ts:169-180`). A RPC só rejeita frete negativo (`20270110000000_marketplace_checkout_gateway_atomic.sql:49-55`) e soma o valor recebido ao subtotal (`:100-107`); não religa `shippingOptionId` a uma cotação, loja, CEP, peso ou preço vigente. `calculateMarketplaceShippingFn` gera opções, mas a criação do pedido não revalida a opção (`src/services/marketplace-checkout.functions.ts:101-156`).

**Hipótese/risco:** um cliente pode alterar `shippingCents` para zero ou para um valor inferior ao da opção mostrada, pagando menos que o frete devido.

**Dependências:** cotação de frete, endereço, regra de frete grátis e RPC atômica.

**Correção concreta:** a RPC deve receber apenas um `quoteId`/token assinado e recomputar ou buscar a cotação no servidor; validar loja, CEP, método, validade, subtotal, peso e frete grátis; ignorar `shippingCents` do cliente. `shippingOptionId` deve ser uma referência persistida/assinada, não um texto livre.

### F-04 — Baixa de estoque do Marketplace não gera movimento, não usa reserva e não reverte em falha de gateway

**Severidade:** Crítica  
**Tipo:** Fato confirmado.

**Fato:** a RPC Marketplace verifica `stock_on_hand - stock_reserved` (`20270110000000_marketplace_checkout_gateway_atomic.sql:79-87`), mas altera apenas `stock_on_hand` (`:94-97`). Não insere `stock_movements`, não cria `stock_reservations` e não decrementa `stock_reserved`. O schema canônico define disponibilidade como `on_hand - reserved` e descreve `stock_movements` como ledger append-only (`0002_catalog.sql:7-12`, `:167-174`, `:250-289`). Em erro do gateway, o BFF chama `mark_payment_failed_atomic` (`src/services/marketplace-checkout.functions.ts:198-214`); essa RPC atualiza somente pagamento e pedido (`20270110000000_marketplace_checkout_gateway_atomic.sql:147-160`), sem devolução de estoque, movimento de release ou reabertura de carrinho.

**Impacto:** saldo físico e saldo reservado divergem; o pedido não tem trilha de estoque equivalente ao checkout padrão; indisponibilidade/recusa do gateway pode consumir estoque permanentemente. A ausência de movimento também impede auditoria e reconciliação de estoque por pedido.

**Dependências:** `product_variants`, `stock_movements`, `stock_reservations`, cancelamento/reembolso e gateway.

**Correção concreta:** modelar explicitamente `reserve -> payment_pending -> sale` e `release`/`return` em RPCs idempotentes; inserir movimento com `reference_type='order'` e `reference_id`; usar locks de variante; em falha do gateway, executar compensação atômica de estoque e reserva; não fazer baixa definitiva antes da confirmação, salvo política de reserva com TTL.

### F-05 — Checkout padrão possui uma iniciação de pagamento sem chamada de gateway e a UI confirma mesmo com erro

**Severidade:** Crítica  
**Tipo:** Fato confirmado.

**Fato:** `initiatePaymentTransaction` verifica credenciais, mas declara que a chamada Pagar.me/Stripe seria feita futuramente e, para método não manual, gera apenas `pending_ext_${crypto.randomUUID()}` e atualiza o registro interno (`src/services/payment.functions.ts:96-129`, especialmente `:112-117`). A página chama essa função após o checkout (`src/routes/_store.checkout.tsx:888-901`), captura qualquer erro, exibe apenas um aviso e continua para toast de pedido confirmado/navegação (`:902-920`).

**Impacto:** pode haver pedido criado sem cobrança externa, com referência que não existe no gateway, enquanto o consumidor vê confirmação. Também há risco de pedido ficar `awaiting_payment` sem uma intenção externa real.

**Dependências:** caminho padrão versus Marketplace, `integration_credentials`, pagamento assinado por webhook e UX de confirmação.

**Correção concreta:** escolher um único adaptador de gateway real por provedor e executar a chamada antes de declarar sucesso; persistir provider/ref/idempotency de forma atômica; se a iniciação falhar, exibir estado de falha e não navegar como pedido confirmado; confirmação final somente por webhook assinado ou método manual aprovado.

### F-06 — Mutação pós-checkout altera total e itens depois de criar a intenção de pagamento

**Severidade:** Alta  
**Tipo:** Fato confirmado.

**Fato:** `process_checkout_transaction_v2` cria o pedido, baixa estoque e cria `payments` com o total calculado no RPC (`20261115040000_update_process_checkout_v2_order_number_and_rates.sql:185-256`). Depois, o BFF pode inserir um `orderBump` vindo do cliente e somar `offerPriceCents` ao pedido (`src/services/checkout.functions.ts:484-499`), e pode somar `doorDeliveryFeeCents` ao `orders.total_cents`/`shipping_cents` (`:470-479`). Essas mutações não atualizam o valor do pagamento existente, não passam por validação de preço no banco e o order bump não gera baixa/reserva de estoque nessa etapa.

**Impacto:** `orders.total_cents` pode divergir de `payments.amount_cents`; item adicional pode ser pago sem estoque ou preço soberano; gateway e recibo podem ficar com valores diferentes do pedido.

**Dependências:** order bump, entrega à porta, payment intent e `order_items`.

**Correção concreta:** incorporar bump, taxa de porta e todas as sobretaxas no mesmo RPC antes do snapshot e da criação do pagamento; resolver produto/variante/preço/estoque no banco; usar o total final como única fonte para gateway; remover inserts/updates financeiros pós-RPC ou transformá-los em RPCs transacionais idempotentes.

### F-07 — Inbox de marketplace aceita evento sem ID e o retry de falha não reprocessa

**Severidade:** Alta  
**Tipo:** Fato confirmado.

**Fato:** `eventId` é opcional no schema (`src/services/marketplace-webhooks.functions.ts:12-32`). A deduplicação só consulta a inbox quando `data.eventId` existe (`:360-375`), e o insert grava `event_id` nulo quando ausente (`:378-389`). A migration só cria unicidade parcial quando `event_id IS NOT NULL` (`20261017000000_inbound_webhooks_affiliate_payouts_and_comments.sql:21-24`). Portanto, replays sem ID não são deduplicados. Além disso, `retryFailedWebhooks` chama `handleInboundWebhook` reutilizando `event.event_id` (`:481-490`); para evento já existente com esse ID, o handler retorna `duplicate` antes de reprocessar (`:360-375`), logo o evento `failed` não é recuperado.

**Impacto:** duplicação de pedido/estoque/caixa em payloads sem event ID e fila de falha que aparenta retry, mas não recupera o evento.

**Dependências:** contratos de cada plataforma, `marketplace_webhook_events`, jobs/retry e sincronização de pedido.

**Correção concreta:** exigir ID remoto por provedor ou gerar hash determinístico de plataforma+recurso+tipo+payload; fazer insert-on-conflict retornar o registro existente e permitir processamento controlado de `failed`; adicionar `attempt_count`, `next_attempt_at`, lock de processamento e transação de estado; testar replay e concorrência.

### F-08 — Validação HMAC do Mercado Livre está inconsistente e o `store_id` do webhook não está vinculado à credencial

**Severidade:** Alta  
**Tipo:** Fato confirmado; rejeição de eventos válidos é hipótese baseada no contrato do provedor e deve ser confirmada com fixture oficial.

**Fato:** `api.webhooks.marketplaces.ts` comenta que suporta Mercado Livre, mas monta o manifesto como `id:${rawText};request-timestamp:${ts};` e não usa `x-request-id` (`:18-46`). O endpoint de pagamentos, no mesmo projeto, usa `data.id`, `x-request-id` e `ts` (`src/routes/api.webhooks.payments.ts:6-23`), evidenciando dois contratos diferentes para o mesmo provedor. Além disso, a rota aceita `store_id` da query string (`api.webhooks.marketplaces.ts:79-82`), usa um único `MARKETPLACE_WEBHOOK_SECRET` (`:82-93`) e entrega esse storeId ao sincronizador, que opera via `getServerClient` service role; esse cliente explicitamente bypassa RLS (`src/lib/supabase.ts:140-160`).

**Hipótese/risco:** a fórmula de Mercado Livre pode rejeitar callbacks legítimos; se o segredo global for conhecido ou compartilhado entre lojas, um evento autenticado pode ser roteado para outro tenant pelo `store_id` informado na URL.

**Correção concreta:** implementar um verificador por provedor baseado no contrato oficial e fixtures reais; obter a loja pela credencial/conector e pelo identificador do vendedor, nunca aceitar `store_id` não autenticado como autoridade; usar segredo por loja/conector, validar `resourceId`/conta e aplicar allow-list de eventos.

### F-09 — Webhook confirmado não lança ledger, caixa ou settlement; DRE pode contar a mesma venda duas vezes

**Severidade:** Crítica  
**Tipo:** Fato confirmado; duplicidade no DRE é condicional à presença do mesmo evento em `marketplace_external_orders` e `orders`, caminho que o código efetivamente cria.

**Fato:** `process_marketplace_payment_webhook_atomic` altera `payments` e `orders` e retorna, sem inserir `financial_immutable_ledger`, `cash_register_entries`, settlement/payout ou registro de conciliação (`20270110000000_marketplace_checkout_gateway_atomic.sql:162-193`). O ledger é chamado em `confirmPayment` manual e o erro é engolido (`src/services/payment.functions.ts:307-326`). Para marketplace externo, `syncOrderToMaster` cria/atualiza `orders` e também mantém `marketplace_external_orders` (`src/services/marketplace-webhooks.functions.ts:101-190`, `:283-291`). O relatório de canais consulta as duas tabelas separadamente (`src/services/channel-reports.functions.ts:87-118`) e soma ambas (`:123-178`), sem exclusão por `order_id` já vinculado.

**Impacto:** pagamento pode estar `paid` sem partida financeira imutável, caixa ou repasse conciliável; o DRE pode duplicar contagem de receita, taxa e pedido quando a venda externa também foi materializada em `orders`.

**Correção concreta:** criar uma única rotina idempotente de `payment_confirmed` que atualize pagamento/pedido, gere ledger, caixa e settlement com `provider_ref + event_id` como chave; registrar taxas e payout bruto/líquido com vínculo à origem; fazer DRE escolher uma fonte canônica ou deduplicar por `external_order_id/order_id`; criar relatório de divergências entre gateway, orders, external orders, caixa e ledger.

### F-10 — Endpoint de status permite qualquer transição de pedido sem conferir pagamento ou efeitos

**Severidade:** Alta  
**Tipo:** Fato confirmado.

**Fato:** `updateOrderStatusFn` aceita qualquer valor do enum e faz update direto por `id` e `store_id` (`src/services/orders.functions.ts:239-281`). Não consulta `ALLOWED_TRANSITIONS`, não exige pagamento para `paid`, não chama RPC de estoque/caixa/ledger e não verifica que a mudança é compatível com `payments.status`. O tipo declara uma máquina de estados e transições permitidas (`src/types/orders.ts:12-49`), mas isso é apenas contrato TypeScript; não é aplicado no banco/BFF.

**Impacto:** staff autorizado pode marcar pedido como `paid`, `delivered`, `refunded` ou outro estado sem pagamento/settlement ou sem side effects correspondentes, deixando pedido, pagamento, estoque e ledger divergentes.

**Correção concreta:** remover update direto e usar RPC de transição com lock; validar estado anterior, papel, tenant e pagamento; disparar side effects idempotentes; impedir `paid/refunded` manual fora de fluxo autorizado e registrar actor/evento.

### F-11 — Assinaturas classificadas são criadas como ativas sem cobrança e pagamento recorrente é confirmação manual do vendedor

**Severidade:** Alta  
**Tipo:** Fato confirmado.

**Fato:** `subscribeToClassifiedPlan` insere diretamente `status: 'active'`, `setup_fee_paid_cents`, `last_payment_date` e `next_billing_date` sem chamar gateway nem criar `orders`, `payments`, webhook ou ledger (`src/services/classifieds.functions.ts:1537-1610`). `recordSubscriptionPayment` aceita apenas `subscriptionId`, consulta o vendedor e avança `last_payment_date`/`next_billing_date` diretamente (`:1734-1779`). A migration cria a tabela e o calendário, mas não cria mecanismo de cobrança (`20260907183000_classifieds_recurring_subscriptions_and_plans.sql:21-38`).

**Impacto:** uma assinatura pode aparecer ativa e com pagamento inicial registrado sem evidência de liquidação; renovações podem ser marcadas como pagas sem valor, provider reference, tentativa, falha, retry ou conciliação.

**Correção concreta:** separar `subscription` de `payment_attempt`; criar mandato/token de gateway sem guardar PAN; gerar cobrança por outbox/scheduler, persistir cada tentativa e webhook idempotente; só ativar após confirmação; mover para `past_due` após falha; registrar ledger e repasse ao vendedor.

### F-12 — Registro de microtaxa não exige identidade e não é seguro contra corrida de duplicação

**Severidade:** Alta  
**Tipo:** Fato confirmado.

**Fato:** `recordOrderMicroFee` recebe `storeId`, `orderId` e `amountCents`, valida somente que o pedido pertence à loja e não chama `getServerIdentity`/`assertStoreAccess` (`src/services/billing-ledger.functions.ts:16-38`). Usa `getServerClient`, que opera com service role. A idempotência é um `SELECT` seguido de `INSERT` (`:40-50`, `:101-118`), sem constraint única mostrada em `20260929170000_v141_billing_invoices_and_ledger.sql:22-37` para `(store_id, origin_event_id, fee_type)`.

**Impacto:** o endpoint pode ser invocado sem autorização de loja para criar cobrança se exposto como server function; duas requisições concorrentes podem criar duas linhas para o mesmo pedido. O total da invoice é então alterado por linha duplicada.

**Correção concreta:** exigir identidade e papel/tenant antes de qualquer leitura/escrita; preferir RPC `INSERT ... ON CONFLICT`; adicionar unique index em `(store_id, origin_event_id, fee_type)`; restringir valor/tipo de taxa a regra server-side e auditar actor.

### F-13 — Carrinho padrão contém mutações de item sem verificação de dono

**Severidade:** Alta  
**Tipo:** Fato confirmado; exploração depende de o UUID de um item ser obtido.

**Fato:** `removeFromCart` busca `cart_items` apenas por `id` e apaga por `id`, explicitamente sem verificar ownership (`src/services/cart.functions.ts:710-733`, especialmente `:715-730`). `updateCartItemOptions` busca e atualiza o item somente por `itemId`, embora obtenha a identidade e não a use para restringir o carrinho (`:855-867`, `:940-945`). Como `getServerClient` bypassa RLS, a proteção da aplicação é necessária.

**Hipótese/risco:** qualquer caller que obtenha/descubra um UUID de item pode apagar ou alterar carrinho de outro cliente, inclusive variante, quantidade e preço snapshot recalculado.

**Correção concreta:** resolver o carrinho ativo da identidade e fazer `DELETE/UPDATE ... WHERE item.id = ? AND cart.customer_id = auth user` ou sessão guest correspondente; rejeitar `variantId` de outro tenant; cobrir IDOR com teste autenticado/guest.

### F-14 — Rota de checkout Marketplace é inicializada com item de demonstração hardcoded

**Severidade:** Alta se a rota estiver pública em produção; Média se for uma tela ainda deliberadamente demonstrativa.  
**Tipo:** Fato confirmado; impacto é condicional.

**Fato:** a página cria seu estado inicial com IDs fixos, título de demonstração e preço fixo (`src/routes/_store.marketplace.checkout.tsx:57-81`). No trecho lido não há loader de carrinho real; o submit envia esse estado diretamente ao BFF (`:168-205`).

**Hipótese/risco:** em uma rota publicada como checkout real, o fluxo pode tentar vender produto inexistente/demonstrativo ou permitir que o cliente altere título/preço exibidos sem que o servidor use esses valores. A RPC protege preço, mas não corrige a origem de item/variante.

**Correção concreta:** hidratar a página por carrinho autenticado/guest real; remover valores de demonstração do caminho de produção; carregar título/preço/variante exclusivamente do servidor; deixar fixtures somente em rota/teste explicitamente marcado.

## 4. Controles positivos observados

- O checkout padrão usa RPC e lock de carrinho; a migration `20261115040000...:38-69` tem advisory lock por idempotency key e lock pessimista do carrinho.
- O checkout padrão recalcula preço efetivo no banco a partir de variante/produto (`20261115040000...:71-130`), em vez de confiar no `priceCents` da UI.
- `create_marketplace_checkout_atomic` não usa o `priceCents` recebido para calcular subtotal; resolve `products.price_cents` no banco (`20270110000000...:69-93`). Isso é positivo, embora a variante ainda seja incorreta.
- A rota de pagamentos valida HMAC de Mercado Pago com timestamp, `x-request-id` e comparação timing-safe (`src/routes/api.webhooks.payments.ts:6-23`).
- Há índice único para idempotência de webhook por plataforma/evento (`20261017000000...:21-24`) e índice único para `payments.checkout_idempotency_key` (`20270110000000...:8-14`).
- O schema base proíbe PAN/CVV e define `stock_movements` como append-only (`0003_orders.sql:6-12`, `0002_catalog.sql:250-289`). O problema é que a trilha Marketplace não honra integralmente esses controles.

## 5. Plano de correção priorizado

### P0 — antes de qualquer dinheiro real

1. Corrigir isolamento de carrinho por loja e validar `product.store_id = cart.store_id` em todas as RPCs.
2. Passar e validar `variantId`; eliminar seleção da primeira variante.
3. Remover `shippingCents` confiável do cliente e usar quote/fee server-side.
4. Unificar reserva/baixa/release de estoque com ledger append-only e compensação no erro do gateway.
5. Desativar o caminho padrão de pagamento que gera `pending_ext_*` sem chamada externa; UI só confirma após intenção real e webhook.
6. Implementar conciliação idempotente de webhook -> payment -> order -> ledger -> caixa/settlement.
7. Corrigir HMAC por provedor e derivar loja pela credencial/conector, não por query string.

### P1 — imediatamente depois

8. Consertar inbox/retry: evento sem ID deve ter chave determinística; evento `failed` deve ser reprocessável sem ser classificado como duplicate.
9. Fazer order bump, taxa de porta e qualquer acréscimo parte da RPC atômica e do valor enviado ao gateway.
10. Aplicar máquina de estados real no servidor e impedir status financeiro direto.
11. Construir cobrança recorrente com payment attempts, webhook, retry, `past_due` e ledger.
12. Colocar autenticação/tenant e unique constraint no microfee; corrigir IDOR de mutações do carrinho.

### P2 — qualidade e observabilidade

13. Remover fixture hardcoded da rota de produção do Marketplace.
14. Criar testes de integração com PostgreSQL para concorrência, cross-store, variante, frete adulterado, falha de gateway, replay, retry, reconciliação e refund.
15. Criar invariantes/queries de monitoramento: `sum(order_items) = order.subtotal`, `payment.amount = order.total`, estoque ledger versus contador, um settlement por provider event, e ausência de dupla contagem entre `marketplace_external_orders` e `orders`.

## 6. Limitações e distinção entre fato e hipótese

- Não houve acesso a um banco Supabase conectado nem execução de webhook/gateway real; portanto, não foram afirmados saldos, pedidos ou perdas efetivamente ocorridos.
- As hipóteses de exploração descrevem consequências possíveis diretamente derivadas do fluxo de código, não incidentes observados.
- Os testes que passaram validam contratos isolados; não validam as RPCs contra um schema aplicado, privilégios service-role, transações concorrentes ou comportamento do provedor.
- O working tree continha alterações e novos arquivos de outros trabalhos no momento da leitura; o relatório descreve o estado observado, não presume que todos os arquivos estejam commitados ou implantados.
