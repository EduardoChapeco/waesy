# Reauditoria de contratos — BFFs, services, actions e funções

**ID:** `reaudit-2026-10-06-01-contracts`  
**Data da leitura:** 2026-10-06  
**Projeto:** `/home/ubuntu/waesy-audit`  
**Escopo:** exclusivamente contratos entre UI e backend, BFFs/server functions, services, actions, funções, handlers sem consumidores, retornos incompatíveis, validações de entrada/autorização e rotas quebradas. Foram lidos código-fonte, consumidores UI, testes relevantes e migrations de checkout, storage, classificados, WhatsApp, pagamentos e AI jobs. **Nenhum código-fonte foi alterado.**

## Sumário executivo

Há contratos funcionais importantes, mas também superfícies de alto risco que não estão fechadas no BFF:

1. `uploadStoreMedia` não exige autenticação explícita, aceita `bucket` arbitrário e pode criar bucket público; o fluxo usa o cliente server-side e não pode depender de RLS como único controle.
2. `uploadMediaUniversal` promete URL durável na UI, mas retorna URL assinada por 900 segundos para `classifieds`, `classified-media` e `legal-documents`; além disso, ignora o parâmetro `folder`.
3. O webhook POST de WhatsApp valida o handshake GET, mas não valida assinatura do corpo POST, não aplica schema/limites e não deduplica `message_id`.
4. `removeFromCart` e `updateCartItemOptions` carregam/alteram `cart_items` somente por `itemId`; diferentemente de `updateCartItemQty`, não confirmam que o item pertence ao carrinho da identidade atual.
5. O checkout Marketplace aceita no BFF apenas `pix`/`credit_card`, enquanto a UI oferece `cash_on_delivery`; e o frete enviado pelo cliente é aceito pela RPC sem uma cotação/quote vinculada ao servidor.
6. O checkout principal aplica `orderBump` e taxa de porta depois da RPC transacional, com valores vindos do cliente, alterando `orders` sem revalidar produto/preço/estoque e sem atualizar o `payments.amount_cents` criado pela RPC.
7. O BFF público de classificados faz `select("*")` e deixa campos de contato em `safeBase`, embora exista um BFF separado cujo contrato é proteger o contato WhatsApp por login.
8. Seis server functions de `admin-catalog.functions.ts` não têm import/call de produção no repositório, apenas a própria definição; são handlers órfãos do ponto de vista estático, com a ressalva de que um consumidor externo/dinâmico não é comprovado nem descartado.

## Evidência de execução e limites

- A suíte disponível em `/tmp/waesy-vitest.log` terminou com **205 arquivos de teste aprovados e 1.400 testes aprovados**. Isso demonstra cobertura unitária/regressiva existente, não prova integração com Supabase real, assinatura de webhooks, RLS ou gateway de pagamento.
- O typecheck completo foi tentado, mas os processos registrados em `/tmp/waesy-tsc.out`/`/tmp/waesy-tsc-direct.log` terminaram por **out-of-memory do Node**, não por uma conclusão limpa de “sem erros”. Portanto, este relatório não usa typecheck como evidência de correção.
- Os achados abaixo separam **Fato observado** de **Hipótese/impacto a confirmar**. Nenhuma inferência de dados de produção foi feita.

## Achados detalhados

### F-01 — `uploadStoreMedia` sem guard de autenticação e com bucket controlado pelo chamador

**Severidade:** Crítica  
**Categoria:** validação/autorização ausente; rota BFF de storage; isolamento de tenant  
**Dependências:** `src/services/storage.functions.ts`; `src/lib/supabase.ts`; políticas/configuração dos buckets Supabase; consumidores de `uploadStoreMedia` em workspace, criação de negócio e catálogo.

**Fato observado**

- Em `src/services/storage.functions.ts:217-225`, `uploadStoreMedia` valida `fileName`, `fileType` e `base64Data`, mas declara `bucket: z.string().default("cms-media")`; não há enum/allowlist nesse handler.
- Em `src/services/storage.functions.ts:230-233`, `getServerIdentity().catch(() => ({ id: null, store_id: null }))` transforma erro/identidade ausente em identidade anônima e continua usando `enforceRateLimit(..., "guest")`; não existe `throw`/`requireAuth`/`assertStoreAccess`.
- Em `src/services/storage.functions.ts:245-258`, o valor de `bucket` é usado diretamente em `storage.from(bucket)` e, em caso de bucket ausente, o próprio handler chama `createBucket(bucket, { public: true, ... })`.
- Em `src/services/storage.functions.ts:270-275`, o retorno é uma URL pública obtida do bucket informado.

**Hipótese/impacto**

Se a função for exposta como server function acessível a visitante, uma chamada sem sessão pode gravar em qualquer bucket existente permitido pelo backend de storage ou disparar criação de bucket público com nome arbitrário. Mesmo que o ambiente rejeite algumas operações, a função não demonstra o contrato de autorização que os consumidores de workspace precisam. O impacto potencial é escrita não autorizada, exposição pública de conteúdo e mistura de tenants.

**Correção concreta**

- Rejeitar identidade ausente antes de qualquer operação (`requireUser`/`requireAuthenticatedIdentity`).
- Resolver o `storeId` no servidor e exigir `assertOwnerAccess`/membership antes de aceitar mídia de loja.
- Trocar `bucket: z.string()` por enum explícito, separado por caso de uso; não criar buckets a partir de input do usuário. Auto-healing, se mantido, deve ser migração/infra administrativa, não caminho de request.
- Aplicar limite de tamanho e MIME por bucket, não somente um limite genérico; manter buckets privados por padrão.
- Adicionar teste de contrato que invoque a função sem sessão, com store de outro tenant e com bucket desconhecido, esperando rejeição.

---

### F-02 — URL e caminho de storage incompatíveis com o contrato da UI

**Severidade:** Alta  
**Categoria:** retorno incompatível; URL temporária persistida como permanente; parâmetro ignorado  
**Dependências:** `src/services/storage.functions.ts`; `src/lib/classifieds/upload-classified-media.ts`; formulário `src/routes/_store.conta.classificados.novo.tsx`; migrations/configuração dos buckets `classifieds`, `classified-media` e `legal-documents`.

**Fato observado**

- O helper da UI declara em `src/lib/classifieds/upload-classified-media.ts:5-9` que retorna URL pública definitiva/permanente e, em `:46-53`, chama `uploadMediaUniversal` com `bucket: "classifieds"` e `folder: \`classifieds/${folder}\``.
- `uploadMediaUniversal`, em `src/services/storage.functions.ts:400-410`, recebe `folder`, mas em `:419-421` constrói `uniqueName` apenas como `${tenantFolder}/${cleanName}`; o valor de `folder` não participa do caminho.
- Em `src/services/storage.functions.ts:437-447`, `classifieds`, `classified-media` e `legal-documents` são classificados como privados e a função retorna `createSignedUrl(uniqueName, 900)`, isto é, URL com validade de 900 segundos, no campo `url`.
- O helper de documento, em `src/lib/classifieds/upload-classified-media.ts:84-102`, devolve esse `url` como se fosse uma URL de documento estável; o formulário de classificados recebe o objeto em `:6959-6961` e o adiciona ao estado `businessRestrictedDocuments`.

**Hipótese/impacto**

A imagem de anúncio salva com a URL retornada pode parar de carregar após 15 minutos, pois `getPublicClassifiedById` retorna `images` sem renovar essas URLs. Um documento restrito salvo como URL, em vez de path, pode ficar inacessível após expiração. O parâmetro `folder` também não produz a organização de caminho prometida pelos consumidores (`highlights`, `itinerary`, `documents`), dificultando manutenção e políticas de acesso. A quebra ocorrerá se o valor retornado for persistido e reutilizado diretamente, algo indicado pelos consumidores, mas a confirmação do write final deve ser feita em integração.

**Correção concreta**

- Separar contrato de mídia pública de contrato de documento privado. Para imagens públicas, gravar em bucket público dedicado e retornar URL estável; para documentos privados, persistir somente `bucket + path` e gerar signed URL no download, nunca persistir a URL de 900 s como URL permanente.
- Se `classifieds` precisar ser privado, o BFF público deve gerar URLs assinadas sob demanda para as imagens; não retornar a URL temporária do upload como se fosse definitiva.
- Usar `folder` após sanitização/normalização e impedir `..`, barras absolutas e escapes de tenant; idealmente o folder de segurança deve ser decidido pelo servidor conforme entidade/tenant, não livre no cliente.
- Criar teste de contrato que verifica a duração/semântica da URL, o caminho final e a leitura depois de expiração simulada.

---

### F-03 — Webhook WhatsApp POST sem assinatura, schema, limites ou idempotência

**Severidade:** Alta  
**Categoria:** rota webhook quebrável/spoofável; validação ausente; deduplicação  
**Dependências:** `src/routes/api.webhooks.whatsapp.ts`; credenciais `integration_credentials`; tabelas `whatsapp_leads`, `chat_threads` e `chat_messages`; padrão de assinatura da Meta/WhatsApp.

**Fato observado**

- O GET faz handshake com token em `src/routes/api.webhooks.whatsapp.ts:12-64`, porém o POST inicia em `:70-76` com `request.json()`; não há leitura do corpo bruto nem chamada a `verifyWebhookSignature`/validação `X-Hub-Signature-256`.
- O POST aceita qualquer objeto que tenha `entry[0].changes[0].value`; se `value` não existir, retorna `200 ignored` em `:77-81`.
- O `phone_number_id` é usado para selecionar uma loja ativa em `:84-103`; depois cada mensagem é processada em `:105-212` e pode criar/atualizar lead, thread e mensagem com dados do corpo.
- Os `catch` de lead e chat em `:142-144` e `:209-211` apenas registram warning e o endpoint retorna sucesso em `:215-225`. Não há unique check por `msg.id` antes de inserir `chat_messages`; o id aparece somente dentro do JSON `payload` em `:200-204`.

**Hipótese/impacto**

Um terceiro que conheça um `phone_number_id` ativo pode forjar POSTs e inserir notas, leads, threads e mensagens atribuídas a uma loja. Retransmissões legítimas da Meta podem duplicar mensagens. Retornar 200 mesmo quando a persistência falha pode fazer o provedor parar de reenviar e deixar o CRM divergente.

**Correção concreta**

- Ler `rawBody`, validar HMAC/assinatura da Meta antes de parsear e resolver o segredo por integração/tenant; rejeitar ausência ou mismatch com `401/403`.
- Aplicar schema Zod com limites de profundidade, tamanho de texto, quantidade de mensagens e tipos suportados; não aceitar `entry`/`changes` arbitrários.
- Persistir `provider_message_id`/evento em tabela com índice único por provider + message id, ou usar RPC idempotente, antes de mutar lead/thread.
- Retornar erro transitório quando a persistência falhar, mantendo processamento parcial auditável; separar eventos de status de mensagens.
- Adicionar teste HTTP com corpo válido/assinatura inválida, replay do mesmo `msg.id` e falha de banco.

---

### F-04 — Mutação de carrinho por `itemId` sem escopo de ownership

**Severidade:** Alta  
**Categoria:** autorização BOLA/IDOR; contrato de mutação  
**Dependências:** `src/services/cart.functions.ts`; `src/lib/cart-context.tsx`; RLS de `carts`/`cart_items` nas migrations `20260829220000_security_hardening_rls_phase1.sql` e `20261002000002_s21_performatic_rls.sql`; implementação de `getServerClient`.

**Fato observado**

- `removeFromCart`, em `src/services/cart.functions.ts:710-732`, recebe apenas `{ itemId }`, consulta `cart_items` por `.eq("id", itemId)` em `:718-722` e apaga por `.delete().eq("id", itemId)` em `:729-730`. O comentário em `:715-716` reconhece que a verificação de pertencimento não é feita.
- `updateCartItemQty`, em `:771-789`, serve de contraste: resolve o carrinho da identidade e filtra `.eq("cart_id", cart.id)`.
- `updateCartItemOptions`, em `:855-867`, também consulta apenas `.eq("id", itemId)`; e atualiza apenas `.eq("id", itemId)` em `:941-944`, sem verificar `item.cart_id` contra a identidade.
- A UI chama essas mutações somente com `itemId`/`variantId` em `src/lib/cart-context.tsx:72-129`.
- As migrations habilitam `FORCE ROW LEVEL SECURITY`, mas as funções usam o cliente server-side; não há no handler uma prova de que RLS seja a autorização efetiva do request.

**Hipótese/impacto**

Se `getServerClient` operar com privilégio de servidor/service role, um usuário autenticado que obtenha/adivinhe um UUID pode remover ou editar item de outro carrinho. UUID não é controle de autorização. Em `updateCartItemOptions`, ainda é possível selecionar IDs de opções sem validação explícita da relação opção-produto/variante, alterando snapshot de preço com dados de catálogo não relacionados.

**Correção concreta**

- Criar um helper único `resolveOwnedCartItem(identity, itemId)` que junte `cart_items` a `carts` e exija `customer_id = identity.customer_id` ou `session_token` da sessão; usar esse helper em remove, qty e options.
- Fazer update/delete com predicado de ownership no mesmo comando e checar `count`/erro.
- Validar que `variantId` pertence ao produto do item e que cada `option_values`/`product_modifiers` pertence ao grupo permitido daquela variante/produto.
- Manter testes adversariais com item de outro usuário, não somente mocks que devolvem um item autorizado.

---

### F-05 — Checkout Marketplace aceita frete controlado pelo cliente sem quote vinculada

**Severidade:** Alta  
**Categoria:** retorno/entrada incompatível; integridade financeira  
**Dependências:** `src/routes/_store.marketplace.checkout.tsx`; `src/services/marketplace-checkout.functions.ts`; migration `supabase/migrations/20270110000000_marketplace_checkout_gateway_atomic.sql`.

**Fato observado**

- O BFF valida `shippingCents` apenas como inteiro `>= 0` em `src/services/marketplace-checkout.functions.ts:64-75`.
- `calculateMarketplaceShippingFn`, em `:101-156`, calcula opções, mas não cria token/quote assinado nem exige que a criação do pedido reutilize uma opção calculada pelo servidor.
- `createMarketplaceOrderFn`, em `:162-180`, envia `data.shippingCents` diretamente como `p_shipping_cents`; `shippingOptionId` é reduzido a `pickup` ou `delivery` em `:174-175`.
- A RPC `create_marketplace_checkout_atomic`, na migration citada, soma diretamente `p_shipping_cents` ao total em linhas 100-107; não há consulta de tarifa por CEP/opção nessa RPC.
- A UI em `src/routes/_store.marketplace.checkout.tsx:145-165` recalcula opções, mas em `:178-205` envia ao BFF o valor local `shippingCents`.

**Hipótese/impacto**

Um chamador direto pode enviar `shippingCents: 0` para entrega ou um valor diferente da tabela retornada; a RPC criará pedido com total divergente do frete real. O preço dos produtos é soberanamente recalculado pela RPC, mas o frete não tem a mesma proteção.

**Correção concreta**

- Não aceitar `shippingCents` como autoridade. O servidor deve resolver `storeId`, CEP normalizado, modalidade e peso/itens reais, calcular a tarifa ou validar uma `shipping_quote_id` assinada e ainda não expirada.
- Persistir hash/versão da cotação e revalidar na RPC atômica; rejeitar `shippingOptionId` desconhecido e opções incompatíveis com retirada/entrega.
- A resposta de cálculo deve devolver um token de cotação, não somente números copiáveis da UI.
- Testar tentativa de frete zero, frete negativo, método inventado e replay de quote expirada.

---

### F-06 — UI oferece `cash_on_delivery`, mas o BFF rejeita o valor

**Severidade:** Alta  
**Categoria:** contrato UI↔BFF incompatível; rota de checkout quebrada  
**Dependências:** `src/routes/_store.marketplace.checkout.tsx`; `src/services/marketplace-checkout.functions.ts`.

**Fato observado**

- O estado da UI declara `paymentMethod` como `"pix" | "credit_card" | "cash_on_delivery"` em `src/routes/_store.marketplace.checkout.tsx:117-119`.
- A opção “Na Entrega” pode ser selecionada em `:650-667`, com `onChange={() => setPaymentMethod("cash_on_delivery")}` em `:660-662`.
- O schema do BFF em `src/services/marketplace-checkout.functions.ts:64-75` define `paymentMethod: z.enum(["pix", "credit_card"])` em `:70`; `createServerFn` executa esse validator antes do handler.

**Impacto confirmado por contrato**

Ao selecionar “Na Entrega” e finalizar, o payload contém um valor que o validator não aceita. A função não chega à RPC; a UI cai no tratamento genérico de erro em `:211-214`. Não há caminho backend para `cash_on_delivery` neste BFF.

**Correção concreta**

Escolher uma única fonte de verdade: remover a opção da UI até existir suporte, ou adicionar `cash_on_delivery` ao enum, ao enum PostgreSQL/RPC, ao fluxo de pagamento/estado de pedido e ao contrato de webhook. Cobrir cada opção renderizada com teste que executa a mesma validação do server function.

---

### F-07 — `orderBump` e taxa de porta são aplicados depois da transação, com valores do cliente

**Severidade:** Alta  
**Categoria:** validação financeira ausente; atomicidade quebrada; retorno de checkout inconsistente  
**Dependências:** `src/routes/_store.checkout.tsx`; `src/services/checkout.functions.ts`; `supabase/migrations/20261115040000_update_process_checkout_v2_order_number_and_rates.sql`; schema de `orders`, `order_items` e `payments`.

**Fato observado**

- A UI calcula/adiciona `doorDeliveryFeeCents` e `orderBumpExtraCents` em `src/routes/_store.checkout.tsx:685-705` e envia os valores em `:864-879`.
- `CheckoutSchema`, em `src/services/checkout.functions.ts:208-272`, valida apenas que `orderBump` tem UUIDs, título e `offerPriceCents >= 0`, e que `doorDeliveryFeeCents` é inteiro; não busca regra/preço vigente nem impõe teto/relacionamento.
- A chamada da RPC em `src/services/checkout.functions.ts:400-413` não passa `orderBump` nem taxa de porta para `process_checkout_transaction_v2`.
- Depois que a RPC cria pedido/pagamento, o handler faz update de `orders` em `:448-505`; a taxa de porta é adicionada em `:470-480` e o order bump é inserido em `order_items` em `:484-499`. Falhas são engolidas pelo `catch` não bloqueante em `:533-535`.
- A migration `20261115040000_update_process_checkout_v2_order_number_and_rates.sql:242-251` mostra que `payments.amount_cents` é inserido com `v_total_cents` antes desse pós-processamento; o pós-processamento mostrado no handler não atualiza o amount do pagamento.

**Hipótese/impacto**

Um cliente direto pode enviar preço/título de order bump não ofertado ou uma taxa de porta arbitrária. O pedido pode exibir total diferente do valor do pagamento, incluir item sem reserva/baixa de estoque e responder sucesso mesmo que o update posterior falhe. A UI inicia pagamento em `src/routes/_store.checkout.tsx:888-900` usando `checkoutTotalCents`, enquanto a RPC já criou o payment com total anterior.

**Correção concreta**

- Mover bump, taxa e todos os componentes financeiros para uma RPC transacional única, ou calcular tudo no servidor a partir de IDs de regra/produto e da configuração da loja.
- Aceitar do cliente somente IDs/intenções; buscar preço, elegibilidade, estoque e taxa no servidor, aplicar locks e gravar `orders`, `order_items` e `payments.amount_cents` atomicamente.
- Se qualquer pós-processamento permanecer não bloqueante, ele não pode alterar total financeiro; deve ser telemetria/metadado idempotente.
- Fazer o pagamento usar o total retornado pelo servidor, nunca um total local calculado pela UI.

---

### F-08 — BFF público de classificados expõe contato que o BFF protegido deveria esconder

**Severidade:** Alta  
**Categoria:** retorno incompatível; exposição de PII; bypass de contrato de proteção  
**Dependências:** `src/services/classifieds.functions.ts`; `src/services/whatsapp-leads.functions.ts`; `src/components/classifieds/catalog/classified-item-card.tsx`; demais componentes de detalhe/listagem.

**Fato observado**

- `getPublicClassifiedById`, em `src/services/classifieds.functions.ts:285-320`, faz `.select("*")` em `classifieds`.
- Na sanitização anônima em `:561-599`, o destructuring remove `profiles`, `store` e `payment_settings`, mas espalha `...safeBase`; não remove `contact_whatsapp`, `whatsapp`, `contact_phone` ou equivalentes que vieram da tabela.
- A UI lê `item.contact_whatsapp || item.whatsapp || item.profiles?.phone` em `src/components/classifieds/catalog/classified-item-card.tsx:26-37`.
- O contrato de proteção separado em `src/services/whatsapp-leads.functions.ts:142-185` retorna, para visitante sem login, `authorized: false`, `targetUrl: null` e telefone apenas mascarado; somente usuário identificado recebe URL em `:187-241`.

**Hipótese/impacto**

Mesmo que a UI use `trackAndOpenWhatsApp`, o número bruto está disponível no payload de uma função pública e pode ser extraído sem passar pelo gate de login. Isso contradiz o contrato “contato protegido” e expõe PII/spam. A intenção de mostrar botão sem revelar número não é garantida pelo BFF atual.

**Correção concreta**

- Trocar `select("*")` por allowlist pública explícita e remover telefone/contato bruto de todo retorno anônimo.
- Retornar somente `hasContact: boolean`/`contactMasked` e deixar o BFF protegido resolver o número após autenticação e registrar lead.
- Sanitizar também campos de telefone em `profiles`, `store`, `attributes` e qualquer alias legado (`whatsapp`, `contact_phone`, `pix_key`/instruções quando não forem públicos).
- Adicionar teste de resposta anônima que procura todos os aliases de contato, não apenas `payment_settings`.

---

### F-09 — Server functions sem consumidor de produção identificável

**Severidade:** Média  
**Categoria:** handler órfão; contrato não exercitado  
**Dependências:** `src/services/admin-catalog.functions.ts`; qualquer consumidor externo/dinâmico não presente no repositório.

**Fato observado**

Busca textual no conjunto `src/**/*.{ts,tsx}` encontrou somente a definição/log da própria função (sem import ou chamada de produção) para:

| Handler | Local aproximado | Observação do contrato |
|---|---:|---|
| `upsertProductVariant` | `src/services/admin-catalog.functions.ts:1174-1210` | POST com schema de variante e `requireAdmin` |
| `getOnboardingProgress` | `:1411-1431` | GET com retorno `{status,data}`/`unconfigured` |
| `toggleProductCollection` | `:1550-1574` | POST com `productId`, coleção por id/slug e `add` |
| `getAdminDestaques` | `:1782-1822` | GET com retorno discriminado `ok/empty/error/unconfigured` |
| `listProductOptionGroups` | `:1853-1882` | GET com `product_id` |
| `batchSaveOptionGroups` | `:1888-1960` | POST para substituir matriz de grupos/valores |

A verificação foi feita com `rg` por cada símbolo; referências de helpers internos (`_upsert...`, etc.) não são consumidores do server function exportado.

**Hipótese/impacto**

No código presente, esses contratos não são exercitados pela UI/rotas e podem estar mortos, deixando schema e permissões sem regressão funcional. Não é possível afirmar que nenhum consumidor externo, endpoint gerado por framework ou import dinâmico fora de `src` exista; o achado é estático e deve ser confirmado no mapa de deploy/telemetria antes de remoção.

**Correção concreta**

- Decidir por handler: conectar a uma UI/rota real e adicionar teste de contrato, ou remover/exportar somente helper interno.
- Se API pública/externa for intencional, documentar endpoint, consumidor, autenticação e versionamento em catálogo de rotas.
- Instrumentar chamadas para comprovar uso antes de descontinuar e verificar generated route manifest/build output.

---

### F-10 — Chave de idempotência do checkout principal não vincula o payload completo

**Severidade:** Média  
**Categoria:** contrato de retry; retorno potencialmente inesperado  
**Dependências:** `src/services/checkout.functions.ts`; `supabase/migrations/20261115040000_update_process_checkout_v2_order_number_and_rates.sql`; tabela `payments`.

**Fato observado**

- `processCheckout`, em `src/services/checkout.functions.ts:314-315`, cria `idempotencyKey` somente com `cartId`, `paymentMethod`, `paymentMethodId` e `giftCardCode`.
- O mesmo handler recebe nome, e-mail, documento, telefone, endereço, notas, custom fields e metadados adicionais, mas esses campos não entram na chave.
- A migration `20261115040000_update_process_checkout_v2_order_number_and_rates.sql:41-55` faz replay procurando `payments.idempotency_key` e devolve o pedido anterior, sem comparar hash do payload.

**Hipótese/impacto**

Se o mesmo carrinho/forma de pagamento for reenviado com dados de comprador/endereço diferentes, o contrato de replay pode retornar o pedido anterior, em vez de rejeitar “mesma chave, payload diferente” ou iniciar tentativa nova. O comportamento pode ser desejado para retries idênticos, mas não está amarrado a uma impressão do payload.

**Correção concreta**

Usar chave criada por tentativa de checkout no cliente/servidor e persistir hash canônico do payload relevante. No replay, retornar o pedido somente quando o hash coincidir; caso contrário, rejeitar conflito de idempotência. Vincular a chave ao carrinho/identidade e definir explicitamente política para pagamento falho/expirado.

## Rotas/retornos verificados sem achado adicional

- `src/routes/_store.classificados.$id.tsx:24-71` normaliza o retorno do BFF para `classified/status/isOwner/canManage/viewerContext/similarAds`, e trata `not_found`, `invalid_id` e `error`; o shape principal é compatível com `getPublicClassifiedById`.
- `src/components/classifieds/detail/use-classified-detail.ts:131-147` chama `getClassifiedBookedDates` esperando array de `{startDate,endDate}`; não foi identificado neste recorte um retorno incompatível comprovado.
- `src/routes/api.webhooks.payments.ts:26-67` usa assinatura antes da RPC de pagamento; diferentemente do webhook WhatsApp, há validação de assinatura Mercado Pago/HMAC genérica e validação mínima do payload. A revisão não comprova que todos os provedores tenham o mesmo formato, portanto isso permanece como dependência de integração, não como achado fechado.
- O fluxo geral AI possui pipeline específico de onboarding que cria/atualiza `ai_async_jobs` (`src/services/magic-onboarding.functions.ts` e `src/services/onboarding-pipeline.server.ts`); não foi classificado como “job sem consumidor” sem evidência de que o modo de uso analisado seja o mesmo do gateway genérico.

## Priorização de remediação

1. **Bloquear imediatamente:** F-01, F-03, F-04 e F-08 (autorização, webhook e PII).
2. **Corrigir antes de cobrar/pagar em produção:** F-02, F-05, F-06, F-07 e F-10.
3. **Higienizar contratos e cobertura:** F-09 e testes de integração reais contra Supabase/RPC/storage.

## Dependências de validação pós-correção

- Testes HTTP com raw body e assinatura realista de WhatsApp/Meta.
- Testes de autorização com duas identidades, dois tenants e UUID de item de outro carrinho.
- Teste de expiração de URL e leitura por path para mídia pública/documento privado.
- Teste de quote de frete assinada, replay e alteração de `shippingCents`.
- Teste end-to-end do checkout verificando igualdade entre `orders.total_cents`, `payments.amount_cents`, itens/estoque e valor enviado ao gateway.
- Build/typecheck em ambiente com heap suficiente; a execução nesta auditoria terminou em OOM e não deve ser interpretada como aprovação.
