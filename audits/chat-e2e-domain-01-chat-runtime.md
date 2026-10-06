# Auditoria E2E — Chat Runtime (domínio exato)

- **ID:** `chat-e2e-domain-01-chat-runtime`
- **Escopo:** Runtime do chat unificado, limitado aos quatro arquivos fornecidos.
- **Arquivos auditados:**
  - `src/services/chat.functions.ts`
  - `src/components/chat/ai-chat-shell.tsx`
  - `src/components/chat/chat-composer.tsx`
  - `src/services/ai-conversations.functions.ts`
- **Método:** rastreamento estático UI → contrato de callback/server function → banco/estado → DTO/resposta. Não foi inferido comportamento de rotas, adaptadores, políticas SQL/RLS ou componentes que não estão nos quatro arquivos.
- **Classificação:** **real** = evidenciado e completo no recorte; **parcial** = há caminho implementado, mas existe lacuna de contrato, segurança, durabilidade ou semântica; **ausente** = a promessa não tem implementação observável no recorte.

## 1. Sumário executivo

O recorte contém uma base funcional de chat: há autenticação explícita em vários handlers, consultas Supabase, gravação de mensagens, memória de trabalho, artefatos e um pipeline de Copilot com firewall de prompt, timeout, FSM e cobrança por tokens em alguns caminhos. Isso não constitui, porém, um runtime E2E robusto.

Os bloqueadores principais são:

1. **Envio AI sem autorização de pertencimento à thread:** `sendAiConversationMessage` autentica o usuário, mas não verifica `customer_id`, `recipient_profile_id`, `store_id` ou papel antes de ler a thread, gravar mensagem e executar IA (linhas 1692–1711).
2. **Persistência não transacional e falhas não duráveis:** mensagem do usuário é gravada antes do pipeline; artefato, resposta AI e memória são operações independentes. Erros de atualização de memória são ignorados. A resposta AI é gravada com `status: "delivered"` mesmo quando o pipeline está em `FAILED_RETRYABLE`/`FAILED_FINAL` (linhas 1732–1848).
3. **Sem streaming e sem retry de backend:** o BFF aguarda o pipeline inteiro e só depois grava/retorna a resposta. Há timeout e fallback, mas não há retry de provider, endpoint de cancelamento ou idempotência da operação de mensagem.
4. **Idempotência ausente para mensagens/threads:** o `idempotencyKey` do tollbooth usa `startTime`, portanto muda a cada nova execução; não existe `clientMessageId`, chave única ou upsert para envio. Criação de thread usa `select` seguido de `insert`, sujeita a corrida.
5. **RLS não é verificável:** nenhum dos arquivos contém políticas SQL ou a implementação de `getServerClient`/`getServerIdentity`. Existem checagens de aplicação, mas não há evidência suficiente para afirmar que RLS está ativo, correto ou aplicado pelo cliente usado.
6. **Ações com retorno enganoso:** `mutateCustomerChatThreadAction` aceita `pin`, `unpin`, `mute`, `unmute`, `mark_unread` e `mark_read`, mas retorna `ok: true` sem executar nada (linhas 900–955); além disso, não valida que a thread pertence ao usuário/loja antes de apagar ou arquivar.
7. **Várias promessas são sintéticas:** mobilidade usa rota/distância padrão e fórmulas locais; viagem, triagem jurídica, publicidade e proposta têm defaults fixos; Places força `is_open: true` e rating default; catálogo inventa grupos/modificadores; a mensagem afirma dados reais em fluxo financeiro sem filtro de período.
8. **UI possui contratos sem efeito:** o shell não passa `onAttachFile`, então o botão de anexo não aparece; áudio apenas inicia um timer local; `replyToId` é enviado pelo composer, mas descartado no BFF; pin/archive são props aceitas e repassadas, porém sem controles que as invoquem; retry é opcional e pode ser um no-op.

## 2. Rastreio E2E observado

### 2.1 Shell AI → callback de envio → BFF AI → banco → resposta

**UI (evidência):**

- `AIChatShellProps.onSendMessage` exige `(text, attachments?, replyToId?)` e retorna `Promise<void> | void` (`ai-chat-shell.tsx:80–95`).
- O shell repassa esse callback ao `ChatComposer` (`ai-chat-shell.tsx:580–586`). O shell não chama nenhuma server function diretamente; a ligação concreta entre o callback do pai e `sendAiConversationMessage` não está nos arquivos auditados.
- O composer valida texto não vazio e bloqueia envio durante `isSending`/`disabled`, limpa o textarea e chama `onSendMessage(currentText, [], currentReplyId)` (`chat-composer.tsx:74–89`). Portanto, no recorte, anexos sempre são `[]` e a citação é apenas um ID encaminhado.

**BFF/estado (caminho correspondente):**

- `sendAiMessageSchema` valida `threadId`, texto 1–2000, `replyToId`, URLs de anexos e localização (`ai-conversations.functions.ts:53–61`).
- `sendAiConversationMessage` exige identidade (`ai-conversations.functions.ts:1692–1700`), lê `chat_threads` por UUID (`1702–1711`), grava a mensagem do usuário (`1713–1730`), executa `executeAiCopilotPipeline` com timeout (`1732–1766`), tenta gravar artefato (`1768–1793`), grava resposta AI com trilha/artefato/blocos/FSM (`1795–1821`), atualiza `working_memory` e `updated_at` (`1823–1830`) e retorna IDs, payloads e memória (`1832–1848`).
- O retorno contém estrutura próxima de `ChatMessageItem`, mas não contém `senderName`, `isStaffOrAI`, `threadId` ou `replyTo`; o adaptador que preencheria esses campos não está no recorte.

**Leitura/volta para UI:**

- `getAiConversationThread` exige identidade e faz autorização própria para `customer_id`, `store_id` ou papéis privilegiados (`ai-conversations.functions.ts:1617–1641`); depois mapeia mensagens persistidas para `activitySteps`, `toolCalls`, `artifact`, `structuredPayload`, `fsmPhase` e `fsmState` (`1643–1685`).
- `listAiConversationThreads` retorna `type`, `title`, `is_pinned`, `working_memory` e timestamps em snake_case, mas `ChatThreadItem` espera `type`, `title`, `isPinned`, `workingMemory`, `lastMessageSnippet` e `lastMessageAt` (`ai-conversations.functions.ts:1532–1574`; `ai-chat-shell.tsx:44–57`). Não há adapter nesses arquivos. A lista também não consulta/retorna preview da última mensagem.

**Conclusão:** o caminho é **parcial**. Há BFF e persistência, mas não há ligação UI→server function demonstrada, autorização de envio insuficiente, sem transação/idempotência/streaming, e contratos de DTO precisam de adapter.

### 2.2 Chat de cliente/loja (funções legadas)

- Leitura de thread de cliente: sessão via `getSSRClient().auth.getUser()`, consulta por UUID e verificação `thread.customer_id === user.id` (`chat.functions.ts:403–428`); mensagens e tickets são retornados em DTO próprio (`438–458`).
- Envio de cliente: verifica sessão e pertencimento, insere mensagem e atualiza status/timestamps (`chat.functions.ts:468–518`). O erro da atualização de `chat_threads` é ignorado.
- Envio staff: exige identidade e `assertStoreAccess`, vincula thread ao `identity.store_id`, insere resposta, atualiza timestamps e tenta dispatch para WhatsApp/Mercado Livre (`chat.functions.ts:255–327`). O dispatch externo é best effort: erro é apenas logado (`298–320`), sem outbox, status de entrega ou retry.
- O shell AI não referencia essas funções. Não se pode afirmar, a partir dos arquivos fornecidos, que o callback de `AIChatShell` usa esse caminho legado.

### 2.3 Criação de conversa cliente/loja/P2P

`startCustomerChatThread` busca ou cria uma thread e grava a mensagem inicial (`chat.functions.ts:677–799`). P2P exige usuário autenticado; conversa com loja pode ser guest (`customer_id: null`). O padrão check-then-insert (`710–778`) não é atômico, permitindo duplicação concorrente. A inserção da mensagem inicial (`784–792`) não verifica erro e não atualiza `last_message_*`.

## 3. Matriz de promessas

| Promessa/contrato | Classificação | Evidência e julgamento |
|---|---|---|
| Compor e enviar texto no shell | **Real no componente; parcial E2E** | Validação, Enter sem Shift, botão e callback existem (`chat-composer.tsx:74–95`, `219–234`), mas a ligação concreta do callback ao BFF não está nos arquivos. |
| Persistir mensagem do usuário e resposta AI | **Parcial** | Inserts e atualização de memória existem (`ai-conversations.functions.ts:1713–1848`), mas não há transação; falha no pipeline deixa a mensagem do usuário; falha posterior pode deixar artefato órfão. |
| Conversa cliente autenticada | **Real nas funções customer-facing** | `getCustomerChatThread`/`sendCustomerChatMessage` verificam sessão e igualdade com `thread.customer_id` (`chat.functions.ts:407–428`, `472–485`). Ainda faltam idempotência e tratamento completo de erros. |
| Atendimento staff isolado por loja/setor | **Parcial** | `assertStoreAccess`, filtro de loja e filtro de setor existem (`chat.functions.ts:84–126`, `225–230`, `263–270`). Métricas são constantes e dispatch externo não é durável. |
| Isolamento por RLS | **Ausente como evidência no recorte** | Não há políticas SQL nem implementação dos clientes. Só é possível auditar as checagens de aplicação; RLS não pode ser certificado. |
| Responder a uma mensagem (reply) | **Ausente E2E** | UI coleta `replyToId` (`chat-composer.tsx:79–88`) e schema aceita (`ai-conversations.functions.ts:53–57`), mas o handler não o grava nem mapeia de volta (`1714–1724`, `1667–1683`). |
| Anexar arquivos | **Parcial no BFF; ausente na UI auditada** | Schemas e inserts aceitam URLs (`chat.functions.ts:21–39`, `ai-conversations.functions.ts:53–58`), porém shell não passa `onAttachFile` (`ai-chat-shell.tsx:581–586`), e composer usa sempre `[]` (`chat-composer.tsx:88`). |
| Ditado/áudio | **Ausente** | `isRecording` apenas alterna estado e contador; não há `MediaRecorder`, Speech API, upload, transcrição ou envio (`chat-composer.tsx:58–72`, `98–104`, `168–216`). |
| Streaming de resposta | **Ausente** | `isStreaming` só afeta scroll/trilha visual (`ai-chat-shell.tsx:126–131`, `473–481`). O BFF aguarda `executeAiCopilotPipeline` antes de inserir e retornar (`ai-conversations.functions.ts:1732–1746`); não há canal/eventos/chunks. |
| Retry de provider/ferramenta | **Parcial** | Há timeout, fallback determinístico e estados retryable (`ai-conversations.functions.ts:512–520`, `754–756`, `923–939`, `1504–1524`), mas não há retry automático nem backoff. |
| Retry pelo usuário | **Parcial/contrato incompleto** | Shell aceita `onRetryMessage?` e renderiza botão condicional (`ai-chat-shell.tsx:531–535`); não existe endpoint/reenvio no recorte. Se prop não for fornecida, o clique não faz nada. |
| Cancelar execução | **Ausente no BFF** | Shell encaminha `onCancelActiveRun` para a trilha (`ai-chat-shell.tsx:473–481`), mas nenhuma server function ou cancel token existe nos quatro arquivos. |
| Idempotência de envio | **Ausente** | Nenhum `clientMessageId`, chave única ou upsert para mensagens. Tollbooth usa `copilot_${threadId}_${startTime}` (`ai-conversations.functions.ts:730–743`), mudando a cada tentativa. |
| Idempotência de criação de thread | **Parcial** | Há tentativa de localizar thread existente, mas check-then-insert sem constraint/upsert (`chat.functions.ts:710–778`). |
| Cobrança de IA | **Parcial** | Store com contexto usa `requireTokensOrTollbooth`, estimativa e chave (`ai-conversations.functions.ts:731–743`); guest sem `storeId` bypassa esse caminho (`1976–1989`), e `tokensUsed` da trilha são números fixos, não consumo real. |
| Dados de Places/catálogo/financeiro | **Parcial** | Places e products consultam Supabase (`ai-conversations.functions.ts:980–1008`, `1253–1267`); `is_open`, rating default, modificadores e dados financeiros sem período não são garantidamente reais (`991–1005`, `1284–1304`, `1401–1458`). |
| Viagem, mobilidade, jurídico, anúncio e proposta | **Parcial** | Existem branches e payloads, mas defaults sintéticos (`ai-conversations.functions.ts:1046–1093`, `1110–1150`, `1170–1195`, `1214–1236`, `1337–1384`). |
| Memória de trabalho | **Parcial** | Pipeline deriva `updatedMemory` e tenta persistir (`ai-conversations.functions.ts:1823–1830`); UI só exibe (`ai-chat-shell.tsx:642–663`), erros de update são ignorados e concorrência pode perder atualizações. |
| Artefatos versionados | **Parcial** | Artefato é gerado e insertado (`ai-conversations.functions.ts:1768–1793`), mas `message_id` não é ligado, `persistedArtifactId` não é usado depois e erro do insert é ignorado; versionamento aceita versão fornecida pelo cliente (`1855–1886`). |
| Exportar PDF/CSV | **Parcial, local** | PDF é `window.print()` e CSV é Data URI no navegador (`ai-chat-shell.tsx:734–752`, `754–846`, `890–899`); não há geração/armazenamento de PDF server-side. |
| RMA/SAC seguro | **Parcial** | Criação exige identidade, mas não valida thread/store do input (`chat.functions.ts:804–848`); atualização staff escopa ticket por store, porém ignora erro ao inserir o evento (`854–894`). |
| Mutations de conversa | **Ausente para várias ações** | Delete/clear/archive executam operações sem ownership e ignoram erros; pin/mute/read etc. retornam `ok: true` sem operação (`chat.functions.ts:916–955`). |

## 4. Evidências detalhadas por controle

### 4.1 Autenticação e autorização

**Pontos reais:**

- Workspace staff chama `getServerIdentity`, exige `store_id` e executa `assertStoreAccess(identity, STAFF_ROLES, identity.store_id)` antes da consulta (`chat.functions.ts:84–110`).
- Mensagens staff e leitura staff vinculam explicitamente a thread ao `identity.store_id` (`chat.functions.ts:225–230`, `263–270`).
- Leitura/envio customer comparam o dono da thread ao usuário autenticado (`chat.functions.ts:425–428`, `477–485`).
- Leitura AI possui uma checagem manual de `customer_id`, `store_id` ou papel (`ai-conversations.functions.ts:1638–1641`).

**Lacunas críticas:**

- `sendAiConversationMessage` apenas verifica que existe uma identidade (`ai-conversations.functions.ts:1695–1700`) e depois carrega qualquer thread conhecida por UUID (`1702–1711`). Não existe a mesma checagem de `getAiConversationThread`. Um usuário autenticado pode, em princípio, usar UUID de thread alheia para gravar mensagem, executar ferramentas no contexto de `thread.store_id`, atualizar memória e gerar resposta.
- `saveAiChatArtifact` valida somente login; aceita `threadId`, `messageId` e `storeId` arbitrários, sem buscar a thread ou verificar pertencimento (`ai-conversations.functions.ts:1855–1885`).
- `createAiConversationThread` aceita `data.storeId` arbitrário e não chama `assertStoreAccess` nem comprova que o usuário pertence à loja (`1580–1610`).
- `mutateCustomerChatThreadAction` autentica, mas não consulta a thread para ownership antes de apagar/limpar/arquivar (`chat.functions.ts:916–949`).
- `createSupportRmaTicket` usa `data.store_id` e `data.threadId` sem provar que a thread é da loja/cliente autenticado (`chat.functions.ts:804–846`).
- `getCustomer360Context` recebe `storeId` do caller, chama `assertStoreAccess(identity)` sem parâmetro de store e usa esse input diretamente nas consultas (`chat.functions.ts:365–393`). A segurança final depende de helpers/RLS não presentes; o handler não faz binding explícito ao `identity.store_id`.
- `getAiConversationThread` não considera `recipient_profile_id` na autorização. Um participante P2P pode aparecer na listagem (`listAiConversationThreads` usa `customer_id OR recipient_profile_id`, linhas 1542–1549), mas falhar ao abrir a thread (`1638–1641`).

### 4.2 RLS e escopo de banco

Não há `CREATE POLICY`, chamadas de RPC de autorização, definição de `getServerClient`, nem prova de se o client usa sessão do usuário ou service role. Portanto:

- **Não é possível afirmar RLS real**.
- As condições `.eq("store_id", ...)`, `.eq("customer_id", ...)` são controles de aplicação no handler, não substituem política de banco.
- Onde o handler não filtra ownership (AI send, artifact save, mutations), a ausência de evidência de RLS é um bloqueador de segurança.
- A recomendação é testar cada tabela (`chat_threads`, `chat_messages`, `chat_artifacts`, `store_support_tickets`, `profiles`, `orders`, `store_orders`) com sessão de usuário A/B e service role isoladamente, e inspecionar as policies no banco.

### 4.3 Persistência, atomicidade e consistência

- Fluxo AI é uma sequência de inserts/updates sem transação (`ai-conversations.functions.ts:1713–1830`). Se o pipeline, insert de artefato ou insert da resposta falhar, ficam estados intermediários.
- O insert de artefato ignora `error`; `persistedArtifactId` é atribuído (`1770–1791`) mas não é usado para preencher `message_id` ou validar vínculo. A mensagem AI pode carregar um artefato com UUID efêmero sem linha correspondente em `chat_artifacts`.
- Atualização de `working_memory` ignora retorno de erro (`1823–1830`). A resposta pode dizer/retornar memória atualizada que não foi persistida.
- Mensagem AI é gravada com `status: "delivered"` (`1797–1815`) mesmo que `execution.fsmPhase` represente falha; o retorno imediato calcula `status` diferente (`1835–1843`). Após reload, `getAiConversationThread` usa `m.status` do banco e tende a mostrar `delivered` (`1667–1683`).
- Envio customer e staff também ignoram falha no update de `chat_threads` (`chat.functions.ts:505–513`, `289–296`); a mensagem pode existir sem índice/timestamp atualizado.
- Criação inicial de thread não verifica erro do insert de `chat_messages` (`chat.functions.ts:784–794`).
- `updateTicketStatus` atualiza ticket e depois grava evento em outra operação; a falha do evento é ignorada (`chat.functions.ts:877–890`).

### 4.4 Idempotência e concorrência

Não existe identificador de comando do cliente, dedupe de mensagem, constraint observável ou transação com chave idempotente.

- Reenvio de uma mensagem cria nova mensagem e nova execução; `replyToId` não ajuda porque é descartado.
- `requireTokensOrTollbooth` recebe `idempotencyKey: copilot_${threadId}_${startTime}` (`ai-conversations.functions.ts:731–741`). Como `startTime` é novo em cada chamada, retry manual cobra/execução como operação nova.
- `startCustomerChatThread` e P2P fazem leitura seguida de insert (`chat.functions.ts:710–778`); duas requisições concorrentes podem criar threads duplicadas.
- Atualização concorrente de `working_memory` usa “último write vence” (`ai-conversations.functions.ts:1823–1830`), sem versionamento/optimistic lock.

### 4.5 Erros, retries e observabilidade

**Real/positivo:**

- Há timeout de 45 segundos (`withCopilotTimeout`, `ai-conversations.functions.ts:512–520`).
- Gateway falho cai para dispatcher determinístico (`754–759`).
- Pipeline captura falhas, registra etapa `FAILED_RETRYABLE` e retorna texto de nova tentativa (`1504–1524`).
- MCP registra status e erro em `toolCalls`/activity steps (`858–961`).

**Lacunas:**

- Nenhum retry com backoff/circuit breaker é implementado para gateway, MCP, mining ou dispatch externo.
- O wrapper captura timeout/erro e ainda grava uma resposta AI “entregue”; o erro não fica representado corretamente no banco (`1732–1766`, `1797–1815`).
- A UI só oferece retry por callback opcional; o BFF não oferece uma operação semântica para reenviar a mensagem original com dedupe (`ai-chat-shell.tsx:531–535`).
- Várias funções degradam silenciosamente para arrays vazios e métricas plausíveis: `listChatThreads` retorna defaults (`chat.functions.ts:129–135`, `205–210`), `searchChatContacts` retorna listas vazias (`525–592`), `listAiConversationThreads` retorna `[]` em erro (`1532–1574`). Isso mistura “sem dados” com “falha de dependência”.
- Dispatch WhatsApp/Mercado Livre falha apenas em log (`chat.functions.ts:298–320`), enquanto a mensagem local permanece persistida.
- Não há correlation ID consistente entre mensagem, execução, cobrança e logs; `executionId` é opcional e pode não existir.

### 4.6 Streaming e cancelamento

Não há endpoint, callback, `ReadableStream`, SSE, WebSocket, evento incremental ou persistência de delta. `isStreaming` no shell somente altera a visualização da última trilha e o auto-scroll (`ai-chat-shell.tsx:126–131`, `473–481`). O caminho BFF aguarda toda a execução e só retorna após inserts (`ai-conversations.functions.ts:1732–1848`). O cancelamento é apenas uma prop (`onCancelActiveRun`) encaminhada a um componente filho; não existe operação server-side correspondente.

### 4.7 Custo de IA

- **Implementado parcialmente:** com `context.storeId`, o pipeline estima tokens pela soma de caracteres/4, chama `requireTokensOrTollbooth` e informa ação/categoria/metadata (`ai-conversations.functions.ts:730–743`).
- **Não é medição real:** as etapas usam valores fixos de `tokensUsed` (ex.: 120, 140, 260) mesmo após consultas e gateway (`964–977`, `1033–1044`, `1155–1168`, `1322–1335`). Não há leitura do uso efetivo do provider.
- **Breach de orçamento/tenant:** em guest (`executeGuestCopilotMessage`), `context.storeId` não é fornecido, logo o branch de tollbooth não executa (`ai-conversations.functions.ts:1976–1989`). Não há rate limit/anônimo, quota por IP ou limite de custo visível.
- **Retry cobra novamente:** a chave inclui `startTime` e não representa uma intenção estável (`731–740`).
- **Gateway:** request fixa `maxTokens: 1024` e JSON (`714–722`), mas não há teto de custo por mensagem, timeout específico de provider além do wrapper global, nem contabilização do output.

### 4.8 Dados reais versus sintéticos

**Consultas reais/persistidas:**

- `directory_listings` é consultada para Places (`ai-conversations.functions.ts:980–990`).
- `products` ativos são consultados para catálogo (`1253–1267`).
- Financeiro consulta até 50 linhas de `store_orders` por loja (`1401–1413`).
- Busca interna e MCP/autonomous copilot são dependências reais invocadas, mas seus contratos/implementações não estão no escopo.

**Dados sintéticos ou defaults apresentados como resultado:**

- Places força `is_open: true`, usa `
rating default e `is_open` sem cálculo de horário (`ai-conversations.functions.ts:991–1005`).
- Mobilidade cai para origem Centro, destino Efapi e 4,2 km, calculando tarifas por fórmula local; não há roteador, disponibilidade ou motorista (`1046–1093`).
- Viagem usa roteiro fixo de três dias, hotel 4 estrelas, voos incluídos e orçamento R$ 2.890,00 quando não há dados de ferramenta (`1110–1150`).
- Jurídico usa fatos genéricos e lista fixa de documentos, sem consulta a caso/documentos (`1170–1195`).
- Anúncio usa headline/copy/CTA fixos (`1214–1236`).
- Proposta usa valor default de R$ 4.500,00, milestones e termos fixos (`1337–1384`).
- Catálogo consulta produto real, mas inventa grupos/opções e preços de modificadores (`1274–1304`), sem consulta de estoque/variantes.
- Financeiro afirma “dados reais do período”, mas não há filtro de período, filtração de `payment_status` ou mais que 50 registros (`1404–1458`).

## 5. Contratos quebrados e ações sem handler

| Local | Problema verificável | Impacto |
|---|---|---|
| `chat-composer.tsx:20–29`, `ai-chat-shell.tsx:581–586` | `onAttachFile` é opcional e não é passado pelo shell. | O paperclip não renderiza; anexos não entram pela UI. |
| `chat-composer.tsx:58–72`, `98–104`, `168–216` | “Ditado” apenas alterna boolean e timer. | Nenhum áudio é capturado, transcrito ou enviado. |
| `chat-composer.tsx:79–89`; `ai-conversations.functions.ts:1714–1724` | `replyToId` é coletado/validado, mas não é persistido. | O reply desaparece após reload. |
| `ai-chat-shell.tsx:304–306`, `322–324`, `946–1031` | `onTogglePinThread`/`onToggleArchiveThread` são repassados, porém `ThreadListItem` só renderiza delete e ícone de pin. | Não há controles UI que chamem pin/archive. |
| `ai-chat-shell.tsx:531–535` | Retry depende de callback opcional. | Um estado failed sem prop de retry produz botão sem efeito. |
| `chat.functions.ts:900–955` | Enum aceita `pin`, `unpin`, `mute`, `unmute`, `mark_unread`, `mark_read`, mas o handler retorna `ok: true` sem executar essas ações. | API confirma operação inexistente; estado não muda. |
| `ai-conversations.functions.ts:1532–1574`; `ai-chat-shell.tsx:44–57` | DTO usa snake_case e não retorna preview; shell usa camelCase/preview. | Requer adapter não fornecido; lista pode perder flags e snippet. |
| `ai-conversations.functions.ts:1795–1843` | Falha AI é persistida como `delivered`. | Após recarregar, a UI perde o estado de falha/retry. |
| `ai-conversations.functions.ts:1771–1792` | Artefato não recebe `message_id` e erro do insert é ignorado. | Pode existir artefato órfão ou somente no payload da mensagem. |
| `chat.functions.ts:784–794` | Mensagem inicial não checa erro do insert. | Endpoint pode retornar `threadId` sem mensagem inicial. |

## 6. Recomendações prioritárias

### P0 — segurança e integridade

1. Criar uma autorização única de thread que verifique `customer_id`, `recipient_profile_id`, `store_id` e papel; usar em `sendAiConversationMessage`, leitura, artefatos, mutations, RMA e Customer 360. Não confiar em `storeId` vindo do cliente.
2. Confirmar/testar RLS para `chat_threads`, `chat_messages`, `chat_artifacts`, `store_support_tickets`, `profiles`, `orders` e `store_orders`. Os arquivos fornecidos não contêm policies nem a implementação de `getServerClient`.
3. Tornar mensagem do usuário, pipeline, artefato, resposta AI e memória uma operação transacional ou uma saga/outbox explícita. Persistir status failed durável; não gravar `delivered` quando `fsmPhase` é failed.
4. Adicionar `clientMessageId`/chave idempotente estável, constraint única e estado de comando. Não usar `startTime` como identidade de retry.
5. Validar ownership em `mutateCustomerChatThreadAction`; implementar cada ação do enum ou removê-la. Checar cada erro das operações destrutivas.

### P1 — contratos e resiliência

6. Persistir `reply_to_id`, mapear o campo na leitura, ligar artifact ao `message_id` correto e implementar upload/scan de anexos. Passar `onAttachFile` pelo shell.
7. Implementar retry/backoff para provider, MCP e dispatch externo, além de cancelamento server-side por execution ID. Diferenciar “sem resultado” de “erro de dependência”.
8. Definir DTO canônico ou adapter explícito para camelCase, `senderName`, `isStaffOrAI`, `replyTo`, preview, flags e artefatos.
9. Se streaming for promessa, expor SSE/WebSocket/streaming response e persistir finalização; caso contrário remover `isStreaming` e linguagem de tempo real. Implementar áudio real ou remover a affordance.

### P1 — veracidade e custo

10. Marcar toda saída default como `estimated`/`synthetic`. Places deve calcular horário; catálogo deve consultar estoque/modificadores persistidos; financeiro deve receber período e filtrar status; mobilidade/viagem/jurídico/anúncio/proposta devem consultar fonte real ou declarar rascunho.
11. Aplicar quota/rate limit também ao guest, medir tokens reais do provider, registrar input/output/charged tokens e impedir cobrança duplicada em retry. `tokensUsed` fixo de activity trail não é telemetria financeira.
12. Atualizar `last_message_text/last_message_at` no caminho AI e retornar preview na listagem, ou retirar a promessa de preview do shell.

## 7. Testes faltantes

- **Autorização/RLS:** usuário A lendo/enviando/apagando thread de B; P2P como `recipient_profile_id`; loja A usando `storeId` B; sessões guest; testes de policy por tabela.
- **Idempotência:** duas requisições simultâneas do mesmo `clientMessageId`, retry após timeout, criação concorrente de thread e cobrança não duplicada.
- **Atomicidade:** falhas no gateway, artifact insert, AI-message insert, memory update, thread timestamp e event insert; verificar ausência de órfãos e status failed durável.
- **Contratos:** round-trip de `replyToId`, attachments, `structuredPayload`, artifact, FSM, sender/DTO snake-vs-camel e snippet.
- **UX:** paperclip, microfone, reply, retry, delete, pin, archive, CSV, impressão e copiar; toda ação renderizada precisa ter efeito observável.
- **Resiliência/custo:** provider 500/timeout, MCP error, cancel, guest quota, mensagens grandes, múltiplas tentativas e tokens reais.
- **Dados:** `is_open` não pode ser sempre true; catálogo não pode alegar estoque sem consulta; financeiro deve honrar período/status; defaults devem ser sinalizados.

## 8. Veredito

**Status: `reprovado_parcial_com_falhas_criticas`.**

É real que existem server functions, autenticação em vários caminhos, gravações Supabase, pipeline AI, FSM, artefatos e cobrança em alguns fluxos. É parcial a experiência de texto/persistência porque a ligação UI→BFF não está no recorte e o caminho não é transacional/idempotente. É ausente, nos quatro arquivos, streaming observável, cancelamento server-side, áudio real, reply persistente, anexos pela UI, RLS comprovado e várias mutations declaradas.

Os P0 de autorização de envio AI, ownership de artefatos/mutations/RMA, RLS, status de falha e operações que retornam sucesso sem executar devem ser resolvidos antes de considerar o domínio Runtime confiável em produção multi-tenant.

> Este relatório não afirma funcionamento de rotas, adapters, helpers, policies ou serviços externos não fornecidos; “ausente” significa ausente nos quatro arquivos auditados.

## 9. Correções implementadas

Nenhuma. A tarefa solicitou auditoria e relatório; não foram alterados arquivos de produção.

## 10. Evidências rápidas por arquivo

- `src/components/chat/chat-composer.tsx:20–29, 74–104, 148–234` — callback, limpeza antecipada, attachments vazios e áudio local.
- `src/components/chat/ai-chat-shell.tsx:80–114, 473–586, 642–705, 946–1031` — props/callbacks, retry/cancel, composer sem anexo, memória somente leitura e ThreadListItem sem pin/archive.
- `src/services/chat.functions.ts:80–212, 217–328, 365–393, 403–520, 677–799, 804–955` — auth staff/customer, persistência, dispatch best effort, RMA e mutations incompletas.
- `src/services/ai-conversations.functions.ts:512–743, 761–961, 964–1504` — timeout, gateway/tollbooth, FSM, branches reais/defaults e ausência de stream.
- `src/services/ai-conversations.functions.ts:1532–1685` — list/read DTO e autorização P2P incompleta.
- `src/services/ai-conversations.functions.ts:1692–1849` — envio AI, falta de ownership, sequência não transacional e status de falha.
- `src/services/ai-conversations.functions.ts:1855–1990` — artifact save sem ownership/version lock, pin/delete e guest sem tollbooth.

**Arquivo absoluto:** `/home/ubuntu/waesy-audit/audits/chat-e2e-domain-01-chat-runtime.md`
