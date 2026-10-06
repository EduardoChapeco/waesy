# Auditoria E2E — Copilot, SSE e ReAct/FSM

**Projeto:** Waesy  
**Escopo exato:** `Copilot`, `SSE` e `ReAct/FSM`; rastreio UI → BFF → banco/estado → resposta.  
**Arquivos-base auditados:**

- `src/routes/api.ai.stream.ts`
- `src/services/ai-conversations.functions.ts`
- `src/services/autonomous-copilot-orchestrator.ts`
- `src/types/copilot-fsm.ts`
- `src/services/copilot-execution-persistence.ts`

**Arquivos de suporte consultados para fechar o rastreio:** rota/UI Copilot, `AIChatShell`, `StructuredMessageView`, `AIActivityTrail`, SSE helper/teste, gateway de IA, tollbooth, Supabase client, migrations/policies e testes do domínio.

## 1. Veredito executivo

| Área/promessa | Classificação | Evidência resumida |
|---|---|---|
| Copilot autenticado, thread persistida e resposta estruturada | **Parcial** | `sendAiConversationMessage` grava mensagem, chama o pipeline e grava resposta/memória, mas não autoriza a thread no próprio handler, não é transacional e não tem idempotência. |
| Copilot convidado/guest | **Parcial com gap crítico** | `executeGuestCopilotMessage` permite execução sem identidade, sem rate-limit/tollbooth e sem persistência; pode consumir providers e consultar catálogo via service role. |
| UI dedicada `/copilot` | **Parcial** | Usa o BFF síncrono; não usa SSE. Blocos estruturados são renderizados sem `onActionClick`, portanto vários botões não têm handler. |
| Drawer global Copilot | **Parcial** | Chama `executeAiCopilotPipeline` diretamente, sem thread/BFF/persistência/streaming; diverge do fluxo oficial. |
| Endpoint SSE | **Parcial/isolado** | Autenticação, rate-limit, framing e deltas existem, mas não há consumidor UI, persistência, cobrança, FSM canônica, cancelamento efetivo ou timeout propagado. |
| ReAct real no pipeline de chat | **Ausente/Parcial** | O pipeline faz uma decisão JSON e executa no máximo uma MCP tool ou um ramo determinístico. O loop ReAct genérico existe, mas só é usado pelo adaptador de scraping, não pelo `executeAiCopilotPipeline`. |
| FSM de 13 fases | **Parcial** | Tipos, matriz e testes existem; o runtime não percorre `PLANNED`/`WAITING_APPROVAL`, persiste `PLANNING` (fase inválida) e não reexecuta retries/cancelamento. |
| Persistência retomável de execução | **Parcial** | Há tabelas, upsert e realtime, mas o `resume` apenas lê/conta e marca `running`; não retoma o trabalho e não verifica autorização. |

**Conclusão:** há um esqueleto funcional de chat síncrono, busca/DB real em alguns ramos, gateway com fallback e telemetria. A promessa de um Copilot E2E ReAct com SSE, FSM retomável, ações seguras e isolamento consistente **não é real no caminho usado pela UI**. Os maiores riscos são autorização manual incompleta usando service role, guest sem cobrança/limite, cache sem tenant, botões sem handler, custo/telemetria divergentes e execução que não pode ser retomada.

## 2. Rastreamento E2E observado

### 2.1 Rota dedicada `/copilot` — caminho que o usuário realmente usa

1. `src/routes/_store.copilot.tsx:38-70` carrega sessão e threads; se autenticado, cria a primeira thread via `createAiConversationThread`; se não, instala a thread sentinela `00000000-...0001` em memória.
2. `src/routes/_store.copilot.tsx:134-144` busca a thread persistida apenas para UUID real.
3. `src/routes/_store.copilot.tsx:146-235` envia texto por `sendAiConversationMessage` para usuário autenticado, ou por `executeGuestCopilotMessage` para guest. Não há `fetch('/api/ai/stream')`, `EventSource`, parser SSE ou estado de stream.
4. `src/services/ai-conversations.functions.ts:1692-1848` (BFF autenticado) insere mensagem do usuário, chama `executeAiCopilotPipeline` com timeout de 45 s, insere artefato/mensagem de IA e atualiza `working_memory`.
5. A resposta volta como objeto completo (`aiMessage`, `activitySteps`, `structuredPayload`, `artifact`, `fsmState`) depois de toda a execução; não há delta.
6. `src/components/chat/ai-chat-shell.tsx:498-505` renderiza `StructuredMessageView` sem `onActionClick`. Logo, os callbacks opcionais internos são `undefined` e cliques em ações estruturadas não produzem efeito.
7. A rota não fornece `onRetryMessage`, `onCancelActiveRun`, `onTogglePinThread` ou `onToggleArchiveThread` ao shell (`_store.copilot.tsx:294-305`), embora o shell ofereça esses contratos (`ai-chat-shell.tsx:80-115`).

**Resultado:** a rota dedicada é síncrona e parte dos contratos visuais de ação/retry/cancelamento são declarados, mas não conectados.

### 2.2 Drawer global — caminho divergente

`src/components/chat/waesy-copilot-drawer.tsx:95-118` importa e chama `executeAiCopilotPipeline` diretamente, com `workingMemory={}` e apenas coordenadas/user id. Não cria/seleciona thread, não insere mensagens, não usa `sendAiConversationMessage`, não usa SSE e não persiste a memória. Exibe a resposta somente no estado React local.

O drawer possui handlers (`waesy-copilot-drawer.tsx:126-277`) para alguns tipos de ação, mas não para todos os tipos declarados. O fallback só navega quando existe `payload.url` (`:272-276`); o buscador interno produz `payload.href` (`src/services/copilot-internal-search.ts:99-104,123-127,145-150,169-174`). Portanto, os cards de navegação de plataforma ficam sem efeito nesse caminho.

### 2.3 SSE — endpoint separado, sem integração UI

`src/routes/api.ai.stream.ts:40-189`:

- valida payload Zod e exige `getServerIdentity().id` (`:11-38,54-64`);
- aplica `enforceRateLimit(identity.id, 'ai_generation')` (`:58`);
- busca cards antes de criar o `ReadableStream` (`:66-68`);
- emite `status planning/running`, deltas e `done`/`error` (`:70-181`);
- chama `executeAiCoreGatewayStream` (`:121-139`), mas não chama tollbooth nem persiste thread, mensagem, execução ou telemetria.

Busca no código encontrou apenas a própria rota/`routeTree.gen.ts` e testes do encoder; **não foi encontrado consumidor de `/api/ai/stream`, `EventSource` ou `fetch` para essa rota** (`src` inteiro). O produto visível, portanto, não entrega a promessa SSE.

## 3. Promessas classificadas

### 3.1 Reais

- **Validação básica do corpo SSE:** schema Zod, enum de tarefas, prompt obrigatório e limites de constraints (`api.ai.stream.ts:11-38`).
- **Autenticação do endpoint SSE:** identidade é exigida antes de criar stream (`api.ai.stream.ts:54-64`).
- **Framing SSE:** `event: ...`, `data: JSON` e `\n\n`; headers de `text/event-stream`, no-cache e `X-Accel-Buffering: no` (`src/lib/ai/sse.ts:1-18`).
- **Busca interna com proveniência de cards:** busca tabelas persistidas e devolve `source_table/source_id/action` (`src/services/copilot-internal-search.ts:178-234`), embora o uso tenha problemas de escopo e ação na UI.
- **Caminho persistente básico autenticado:** thread/mensagem/artefato/memória são gravados no BFF (`ai-conversations.functions.ts:1713-1848`), sujeito aos gaps abaixo.
- **Gateway síncrono com cascata de providers, timeout por provider, custo calculado e telemetry/cache assíncronos:** `ai-core-gateway.functions.ts:238-252,650-730`. Isso não se estende ao stream.
- **Retry exponencial de alguns harvesters:** três tentativas com jitter em lead/lodging (`autonomous-copilot-orchestrator.ts:329-355,512-522,697-707`).
- **FSM declarada e matriz testada:** 13 fases, transições e terminalidade (`copilot-fsm.ts:10-24,147-205`); testes unitários específicos passam.
- **Tabelas de execução/steps e realtime:** schema, índices e publicação existem (`supabase/migrations/20270101010000_copilot_react_execution_persistence.sql:4-75`).

### 3.2 Parciais

- **Copilot com dados reais:** alguns ramos consultam Supabase ou harvesters (`directory_listings`, `products`, `store_orders`, jobs/events/news e harvesters); outros caem em defaults sintéticos (seção 6).
- **RLS/isolamento:** migrations habilitam RLS e policies de leitura, mas todos os BFFs usam `getServerClient()` com service role (`src/lib/supabase.ts:126-160`), e os handlers não reproduzem sempre a autorização necessária.
- **Idempotência:** tollbooth possui RPC e aceita chave, porém a chave do chat é `copilot_${threadId}_${startTime}` (`ai-conversations.functions.ts:731-743`), não uma chave estável de mensagem; o insert de chat não tem deduplicação.
- **Retry:** o estado `FAILED_RETRYABLE` existe e há cascata/backoff; não há loop que reexecute a execução, nem handler UI conectado. `recordFailure` apenas muda a FSM (`copilot-fsm.ts:340-374`).
- **Persistência de atividade:** steps são disparados em fire-and-forget (`copilot-execution-persistence.ts:60-73`) e falhas são engolidas; o retorno pode ocorrer antes dos upserts.
- **Retomada:** `resumeCopilotExecution` lê steps e incrementa contador, mas não reconstitui plano/estado nem reinicia worker (`copilot-execution-persistence.ts:76-83`).
- **Streaming do provider:** o gateway stream lê deltas e faz fallback de provider (`ai-core-gateway.functions.ts:926-985`), mas sem custo/telemetria/timeout/cancelamento e sem integração à UI.

### 3.3 Ausentes ou quebradas

- **SSE E2E na UI:** nenhum consumidor encontrado.
- **ReAct no Copilot de chat:** não há ciclo plan → act → observe → replan no `executeAiCopilotPipeline`; há uma chamada de gateway e uma dispatch (`ai-conversations.functions.ts:678-856`), depois um ramo MCP único (`:858-962`).
- **Aprovação humana de alto impacto:** `WAITING_APPROVAL` está apenas no tipo/matriz/teste; não há transição no pipeline para aprovação real (`copilot-fsm.ts:160-161` versus `ai-conversations.functions.ts:781-856`).
- **Cancelamento:** o shell/trail têm prop e botão (`ai-activity-trail.tsx:189-201`), mas a rota não passa handler e a rota SSE `cancel()` apenas comenta que o AbortSignal impede novos eventos; não aborta gateway (`api.ai.stream.ts:185-187`).
- **Retry UI funcional:** shell oferece callback, mas `/copilot` não o passa; não há chamada de reenvio com idempotência.
- **Contrato de ações estruturadas na rota principal:** `StructuredMessageView` é montado sem callback (`ai-chat-shell.tsx:498-505`).
- **Ação `action_button`:** o tipo é declarado (`structured-message-view.tsx:50-76`), porém não há `case` correspondente no switch de renderização (`:1564-1751`).
- **Versionamento real de artefato:** `saveAiChatArtifact` só insere a versão recebida (`ai-conversations.functions.ts:1855-1886`); não valida predecessor/monotonicidade nem evita duplicatas.

## 4. Achados críticos detalhados

### P0 — autorização e isolamento

1. **Envio para thread sem autorização no handler.** Após autenticar, `sendAiConversationMessage` faz `select` por `threadId` (`ai-conversations.functions.ts:1702-1711`) e insere mensagem/atualiza memória por esse id (`:1713-1724,1823-1830`) sem verificar `customer_id`, `recipient_profile_id`, membership de `store_id` ou papel. Como o client é service role, RLS não protege essa lacuna. Um usuário autenticado que conheça um UUID pode escrever na thread de outro tenant.
2. **Salvar artefato sem verificar thread/loja.** `saveAiChatArtifact` aceita `threadId` e `storeId` do cliente e grava após apenas checar login (`ai-conversations.functions.ts:1855-1885`). Não chama `getAiConversationThread`, `assertStoreAccess` nem valida que `storeId` coincide com a thread.
3. **Criação de thread aceita `storeId` arbitrário.** `createAiConversationThread` grava `data.storeId || identity.store_id` sem `assertStoreAccess` (`ai-conversations.functions.ts:1580-1610`).
4. **Policies de execução permitem leitura global quando `store_id IS NULL`.** `copilot_executions_select_own` permite `user_id = auth.uid() OR store_id IS NULL ...` e steps herdam a mesma exceção (`20270101010000...sql:52-65`). A policy de telemetria também permite `store_id IS NULL` para qualquer autenticado (`20270101000000...sql:28-42`). Execuções guest/sem store deixam de ser “own”.
5. **`resumeCopilotExecution` não autentica nem autoriza.** A função exportada busca qualquer execution/steps e altera seu status (`copilot-execution-persistence.ts:76-83`); não há endpoint/callsite que imponha uma checagem substituta.
6. **Pin/delete usam igualdade de `identity.store_id`, não membership/papel efetivo.** (`ai-conversations.functions.ts:1902-1913,1940-1956`). O caminho correto deveria centralizar `assertStoreAccess`/policy, não confiar somente no store ativo.

### P0 — guest, custo e execução fora do perímetro

1. `executeGuestCopilotMessage` não chama `getServerIdentity`, `enforceRateLimit` ou tollbooth (`ai-conversations.functions.ts:1969-1989`). O pipeline passa `storeId` indefinido; o único trecho de cobrança (`:732-743`) só roda quando há `context.storeId`. Guest pode disparar providers sem débito, sem limite específico e sem atribuição de tenant.
2. O endpoint SSE autentica/rate-limita, mas nunca usa `requireTokensOrTollbooth` (`api.ai.stream.ts:54-68,121-139`). O stream é uma via de custo de IA fora do ledger.
3. O drawer chama a função de pipeline diretamente e também não passa `storeId` (`waesy-copilot-drawer.tsx:95-105`). Além de não persistir, esse caminho não usa o BFF/tollbooth.

### P1 — cache e dados entre tenants

`hashQueryTask` inclui apenas domínio, query, cidade e estado (`autonomous-copilot-orchestrator.ts:320-325`). O cache lê/escreve `scraper_audit_log` por esse hash (`:447-463,937-949`) e não inclui `storeId`, `userId` ou autorização. O payload inclui artefato; no builder, o artefato pode conter `experience_document_id` de uma loja (`:643-683`). Uma mesma solicitação em outra loja pode recuperar resultado/ID da primeira. O client é service role, portanto RLS não limita o cache.

Além disso, no cache hit o orquestrador retorna em `:481-492` sem chamar `completeCopilotExecution`; a linha criada por `startCopilotExecution` pode permanecer `status='running'` e sem finalização.

### P1 — FSM/persistência incompatíveis

- `startCopilotExecution` grava `current_phase: "PLANNING"` (`copilot-execution-persistence.ts:33-46`), mas `PLANNING` não existe nas 13 fases (`copilot-fsm.ts:10-24`).
- Steps do orquestrador autônomo não recebem `fsmPhase` (`autonomous-copilot-orchestrator.ts:409-420,503-510`); `persistCopilotExecutionStep` atualiza `current_phase` para `null` quando o campo falta (`copilot-execution-persistence.ts:49-53`). `completeCopilotExecution` atualiza status/state, mas não fixa a fase final (`:55-58`).
- A tabela possui `plan`, `observation` e `tool_call` (`20270101010000...sql:13-20,28-45`), porém `toPersistedStep` só mapeia dados de apresentação/custo e não preenche `observation`/`tool_call` (`copilot-execution-persistence.ts:15-30`). O estado ReAct não é persistido.
- `recordFailure` tem fallback que força estado mesmo quando a transição é proibida (`copilot-fsm.ts:361-371`), enfraquecendo a garantia de grafo; uma falha após fase terminal poderia registrar transição inválida em histórico.

### P1 — ReAct prometido versus código real

O loop genérico `runReactLoop` existe em `src/services/ai-react-loop.ts:17-68`, com `planNext`, `act`, `observe`, limite de iterações e pausa humana. Contudo, a busca de callsites mostra uso apenas em `src/services/mining/react-mining-adapter.ts:17-44`; esse adaptador não é importado pelo `autonomous-copilot-orchestrator.ts`, que chama diretamente `harvestAndPersistPlaces`, `harvestAndPersistDataJudProcess` e outros workers (`autonomous-copilot-orchestrator.ts:12-25,512-522,593-620`). O pipeline de chat, por sua vez, faz uma decisão JSON do gateway e no máximo uma MCP tool (`ai-conversations.functions.ts:688-730,858-962`). Portanto, a etiqueta “ReAct” é parcial no produto auditado.

### P1 — streaming sem controle operacional

- A busca de plataforma ocorre **antes** do `ReadableStream` (`api.ai.stream.ts:66-68`); se falhar, não há evento SSE de erro, pois a exceção ocorre antes do `Response` do stream.
- `cancel()` não cancela o reader/provider; apenas impede novos `enqueue` se `request.signal.aborted` (`api.ai.stream.ts:73-75,185-187`). O gateway stream não recebe `AbortSignal` e seu `fetch` não tem timeout (`ai-core-gateway.functions.ts:958-960`).
- Se um provider emitir deltas e falhar, o gateway tenta o próximo provider (`ai-core-gateway.functions.ts:937-985`) e o cliente pode receber conteúdo parcial do primeiro + conteúdo do segundo, sem reset/identificador de tentativa.
- `executeAiCoreGatewayStream` retorna `usage`/`costUsd` zerados na função `baseMeta` (`:928-932`) e não grava `ai_telemetry_logs` nem cache como o gateway síncrono (`:682-728`).
- Erro SSE envia `error` e fecha, sem `done`/fase final (`api.ai.stream.ts:140-180`). Isso precisa estar documentado no consumidor; não há consumidor para verificar.

### P1 — idempotência, transação e falhas

- `sendAiConversationMessage` sempre insere nova mensagem (`:1713-1729`) e chama IA novamente. `replyToId` é validado (`:53-60`) mas não é gravado no insert (`:1714-1724`). Reenvio/retry duplica mensagens e custo.
- A chave de tollbooth usa `startTime` (`:731-740`), logo dois retries do mesmo pedido geram chaves diferentes. Não existe `messageId`/idempotency key do cliente.
- Usuário e IA, artefato e memória são escritas em operações separadas (`:1713-1729,1768-1817,1823-1830`), sem transação/compensação. Falha após o insert do usuário deixa mensagem órfã; falha após artefato pode deixar artefato sem resposta.
- Timeout de 45 s (`ai-conversations.functions.ts:512-520,1735-1746`) rejeita a espera, mas não aborta as operações internas; provider/harvester pode continuar depois que o BFF já devolveu fallback.
- O timeout/error wrapper transforma indisponibilidade em mensagem `FAILED_RETRYABLE`, mas não cria uma reexecução automática. A UI não fornece retry funcional.

## 5. Dados reais, sintéticos e proveniência

### Real/persistido quando o ramo é alcançado

- Places: query de `directory_listings` (`ai-conversations.functions.ts:964-1010`), embora `is_open`/rating sejam completados sinteticamente.
- Catálogo: `products` com filtro de loja quando há `context.storeId` (`:1238-1321`).
- Financeiro: `store_orders` quando há store (`:1401-1414`).
- Mineração: places/DataJud/CNPJ e DB para jobs/events/news (`autonomous-copilot-orchestrator.ts:502-620,697-777,788-907`).
- Builder: documento determinístico e tentativa de persistência em `experience_documents` (`:621-686`).

### Sintético/default ou não comprovado pelo código

- **Mobilidade:** endereços e distância default (`ai-conversations.functions.ts:1046-1049`), cotações calculadas localmente (`:1050-1072`), sem provider de mobilidade/booking.
- **Turismo:** destino, dias, hotel, voos e orçamento default (`:1110-1147`); resposta apenas encaminha cotação, não consulta disponibilidade nem emite voucher.
- **Legal:** fatos/documentos padrão (`:1170-1187`); é intake, não análise jurídica/DataJud nesse ramo.
- **Publicidade:** headline/copy/CTA default (`:1214-1229`); não gera imagem nem grava publicação nesse pipeline.
- **Proposta:** valor padrão de `450000`, marcos e termos fixos (`:1337-1361`); não há cálculo/consulta comercial real.
- **Financeiro sem pedidos:** linhas zero são inventadas para preencher UI (`:1416-1423`), mas a mensagem afirma “dados reais” (`:1456-1457`).
- **Food modifiers:** grupos/opções e preços de adicionais são fabricados (`:1284-1303`), apenas o produto principal vem do banco.
- **Places:** `is_open: true` e rating default `4.8` quando ausentes (`:991-1008`); não são prova de abertura/rating atuais.
- **News:** a query do usuário não filtra artigos; busca os últimos 10 publicados (`autonomous-copilot-orchestrator.ts:862-907`).
- **Jobs/events:** filtram cidade/status/data, mas não usam `task.targetQuery` para relevância (`:734-811`).
- **Legado explícito:** `resolveAiPipelineSteps` é marcado deprecated, mas ainda exportado e contém proposta, landing, planilha, carrinho, rastreio e agendamento com IDs/valores/endereços fixos (`ai-conversations.functions.ts:128-441`). Não foi encontrado callsite atual; deve ser removido ou isolado para testes.

## 6. Botões e ações sem handler / contratos quebrados

| Origem | Ação | Resultado observado |
|---|---|---|
| `/copilot` + `AIChatShell` | Qualquer `StructuredMessageView` action | **Sem handler:** shell não recebe callback; a view chama `handleAction?.(...)` com `undefined` (`ai-chat-shell.tsx:498-505`, `structured-message-view.tsx:1753-1769`). |
| Drawer | `navigate` do card interno | **Sem efeito:** payload do produtor é `href`, handler só procura `url` (`copilot-internal-search.ts:99-104` versus `waesy-copilot-drawer.tsx:272-276`). |
| Drawer/view | `confirm_proposal`, `book_date`, `execute_vertical_ai`, `submit_form`, `cast_vote`, `rsvp_event`, `apply_job`, `reconcile_entry` | **Sem handler explícito:** switch do drawer cobre somente `open_place`, `call_ride`, `open_checkout`, `request_travel_quote`, `submit_legal_demand`, `publish_ad`, `add_to_cart` (`waesy-copilot-drawer.tsx:126-277`). |
| Structured view | `action_button` | **Contrato declarado mas não renderizado:** tipo listado em `:50-76`; switch sem case (`:1564-1751`). |
| Shell | Retry/cancel | **Prop opcional não ligada:** callbacks declarados em `ai-chat-shell.tsx:80-115`, não passados pela rota (`_store.copilot.tsx:294-305`). |
| Copilot stream | `phase` SSE | **Contrato paralelo:** SSE usa `planning/running/verifying` (`lib/ai/sse.ts:1-6`), não os `CopilotFsmPhase` oficiais; não há evento de `NEEDS_CLARIFICATION`, `WAITING_APPROVAL`, `CANCELLED` ou `FAILED_RETRYABLE`. |
| Artifact | `itinerary`/`travel_itinerary` | **Tipo TS não aceito no DB:** `src/types/chat.ts:38-46` inclui ambos, mas check SQL só permite seis tipos (`20261215000000...sql:27-35`). |
| Reply | `replyToId` | **Validado e descartado:** schema aceita (`ai-conversations.functions.ts:53-60`), insert não grava (`:1714-1724`). |

## 7. Custo de IA e observabilidade

- **Síncrono autenticado com store:** estimativa de tokens é `(prompt+system)/4` (`ai-conversations.functions.ts:731`), cobrança prévia via tollbooth (`:732-743`) e refund se `executeAction` lançar (tollbooth `:140-170`). Porém o valor real/`costUsd` do gateway não é reconciliado com o estimado nem gravado nos `AIActivityStep`.
- **Sem store/guest/drawer:** não há tollbooth no pipeline (`:732-743`) e não há `enforceRateLimit` nos server functions guest/BFF.
- **SSE:** rate-limit existe, mas cobrança e telemetry de custo não; gateway stream expõe `costUsd: 0`, usage zero (`ai-core-gateway.functions.ts:928-932`).
- **Autonomous:** `tokensSaved` é heurístico (`rows.length * 150`, constantes `2500/3500/4000`, etc.; `autonomous-copilot-orchestrator.ts:548-550,580-582,620,686,733,777,811,861,907`), não custo medido. Harvester externo não passa tollbooth.
- **Telemetria:** steps detalhados são fire-and-forget e falhas silenciosas; a aggregate `copilot_activity_steps` é escrita ao fim (`autonomous-copilot-orchestrator.ts:955-965`), não é uma trilha streaming garantida.

## 8. Testes observados e lacunas

Execução realizada:

- `src/lib/ai/sse.test.ts`
- `src/services/copilot-fsm.test.ts`
- `src/services/copilot-pipeline-boundaries.test.ts`

**Resultado observado:** 3 arquivos, **25 testes passando**. Isso comprova framing/header SSE, matriz FSM, firewall de prompt, despacho MCP e boundaries de mineração com mocks.

Lacunas de teste que impedem declarar E2E verde:

1. Nenhum teste de rota HTTP SSE com autenticação, `request.signal`, erro antes do stream, provider fallback após delta, timeout, `done` versus `error` ou custo.
2. Nenhum teste UI que abra `/copilot`, consuma resposta real e clique cada ação estruturada.
3. Nenhum teste para confirmar que ações `href` navegam, que `confirm_proposal`/`rsvp_event`/`apply_job`/`reconcile_entry` têm side effect ou que retry/cancelamento funcionam.
4. Nenhum teste de autorização negativo para `sendAiConversationMessage`, `saveAiChatArtifact`, criação cross-store, pin/delete e `resumeCopilotExecution`.
5. Nenhum teste RLS/realtime para `store_id IS NULL` e vazamento entre usuários/tenants.
6. Nenhum teste de idempotência para retry de POST, duplicação de mensagem, dupla cobrança e cache compartilhado entre stores.
7. Nenhum teste que compare `current_phase` persistido com as 13 fases, nem teste de retomada após processo interrompido.
8. Nenhum teste de proveniência que falhe se o sistema marcar “real” uma cotação, rating, horário, orçamento, notícia fora do termo ou dado financeiro default.
9. Nenhum teste de schema que alinhe `ChatArtifactType` com o check SQL.

## 9. Mudanças recomendadas, em ordem

### P0 — bloquear abuso/vazamento

1. Criar uma única função server-side `assertThreadAccess(identity, threadId, action)` e usá-la em send, save artifact, pin, delete e resume; não confiar no `store_id` ativo. Preferir client SSR/RLS para leituras do usuário ou manter service role somente atrás de checagem completa.
2. Remover guest de providers/catálogo sensível ou impor identidade guest limitada, rate-limit, orçamento e cobrança/telemetria explícitos. Aplicar também limite ao BFF síncrono.
3. Corrigir policies de `copilot_executions`, `copilot_execution_steps` e `copilot_activity_steps`: `store_id IS NULL` não pode significar visível a todos; usar `user_id = auth.uid()` ou relação da thread, e testar Realtime.
4. Incluir `storeId`/tenant e versão de schema na chave de cache; validar ownership do artefato antes de reutilizar. Finalizar a execução também no cache hit.

### P1 — fazer o contrato ser verdadeiro

5. Escolher um único caminho de UI: a rota deve chamar uma server function/BFF que devolva `executionId`, ou o endpoint SSE deve ser o caminho oficial. Remover a chamada direta do drawer ao pipeline.
6. Implementar consumidor SSE com `AbortController`, parser, estados FSM, persistência final e cobrança; passar signal/timeout ao gateway; decidir política para fallback após delta (buffer até provider vencer ou emitir tentativa explícita).
7. Ligar `onActionClick`, `onRetryMessage` e `onCancelActiveRun` no `/copilot`; normalizar `href`/`url`; implementar ou remover todos os `action_type` não tratados. Adicionar `action_button` ao renderer ou retirar do contrato.
8. Integrar o `runReactLoop` ao orquestrador Copilot (plan/action/observation/replan), persistir `plan`, `observation`, `tool_call`, iteração e decisões, e exigir aprovação humana para operações de impacto.
9. Persistir somente fases canônicas (`RECEIVED`...`CANCELLED`), mapear `PLANNING` para `PLANNED` ou eliminar o campo, e fazer `complete` atualizar a fase final. Implementar resume real (replanejar a partir do último step) e cancelamento atômico.

### P2 — qualidade e custo

10. Usar idempotency key enviada pelo cliente ou derivada de `threadId + clientMessageId`; constraint/lookup antes de inserir mensagem e cobrar. Gravar `replyToId`, `message_id` do artefato e versão monotônica.
11. Separar helpers sintéticos de produção; qualquer fallback deve ser explicitamente rotulado como estimativa/demonstração, nunca “tempo real/dados reais”. Remover `resolveAiPipelineSteps` deprecated se não houver uso.
12. Validar JSON do gateway com Zod discriminado por intent/tool e validar tool args antes de DB/MCP. Persistir custo/usage real do gateway e distinguir tokens estimados de tokens efetivamente consumidos.
13. Tornar writes de mensagem/artefato/memória transacionais ou usar outbox/idempotent saga; aguardar persistência de steps antes de concluir execução.
14. Corrigir filtros de notícias/jobs/events por `targetQuery` e remover defaults `is_open=true`/rating `4.8` sem fonte.

## 10. Escopo e caveats

Esta auditoria não implementou correções nem alterou o código de produção. Os testes unitários direcionados passaram, mas não simulam Supabase/RLS/realtime, providers HTTP, browser UI ou ledger. Onde não foi localizado consumidor/handler, o resultado é **“não encontrado no código auditado”**, não uma afirmação de que possa existir fora do repositório.
