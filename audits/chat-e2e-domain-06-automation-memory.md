# Auditoria E2E — Domínio 06: Projetos, histórico, memória e retomada

**Projeto:** Waesy  
**Escopo auditado:** criação e seleção de Projetos/threads, histórico de mensagens, memória de trabalho, trilha/persistência de execução, retomada, autenticação/RLS, idempotência, erros/retries, streaming, custo de IA e dados sintéticos.  
**Data:** 2026-10-06  
**Resultado:** **PARCIAL, com gaps críticos de autorização, retomada e contratos de UI.**

## 1. Limites da evidência

A auditoria foi feita por leitura estática dos arquivos indicados e de seus consumidores/migrações diretamente conectados. Não foi inventado comportamento de infraestrutura que não está no repositório. Os testes executados foram:

```text
npx vitest run \
  src/services/ai-memory-curation.test.ts \
  src/components/chat/ai-chat-shell.test.ts \
  src/services/rls-cross-tenant-isolation.test.ts

25 testes passaram (3 arquivos).
```

Esses testes são majoritariamente unitários/puramente determinísticos; não comprovam uma requisição real UI → BFF → Supabase com duas contas, nem uma retomada real.

## 2. Rastreamento E2E observado

### 2.1 UI → BFF

1. A rota `/copilot` carrega sessão e threads em paralelo e, para usuário autenticado sem threads, cria uma thread inicial (`src/routes/_store.copilot.tsx:38-70`). Para usuário anônimo, cria somente um ID/local state (`DEFAULT_GUEST_THREAD_ID`) e uma thread em memória (`:25`, `:92-114`); não há persistência de histórico guest.
2. O estado local mantém `threads`, `activeThreadId` e `messages` (`_store.copilot.tsx:92-144`). Ao trocar uma thread UUID, chama `getAiConversationThread`; só substitui as mensagens quando a resposta tem pelo menos uma (`:134-144`).
3. O envio autenticado chama `sendAiConversationMessage` com `threadId`, texto, anexos e localização (`_store.copilot.tsx:146-205`). O envio guest chama `executeGuestCopilotMessage` e apenas acrescenta a resposta ao estado local (`:207-229`).
4. Criar Projeto chama `createAiConversationThread` com `type: "project"`, título, metadata e `workingMemory` vazios (`_store.copilot.tsx:238-269`). Excluir chama `deleteAiConversationThread` (`:275-289`).
5. `AIChatShell` tipa `project` como tipo de thread (`src/components/chat/ai-chat-shell.tsx:42-57`), filtra a aba Projetos incluindo também `ai_assistant` (`:145-165`) e exibe “Projeto com memória de trabalho” (`:367-379`).
6. A trilha de execução assina realtime em `copilot_execution_steps` apenas quando recebe `executionId` (`src/components/chat/ai-activity-trail.tsx:64-92`). O cancelamento só aparece quando `isStreaming && onCancel` (`:189-201`).

### 2.2 BFF → banco/estado → resposta

- **Threads:** `listAiConversationThreads` consulta `chat_threads` e mapeia `working_memory`, metadata e status (`src/services/ai-conversations.functions.ts:1532-1574`). `createAiConversationThread` insere `customer_id`, store, `thread_type`, assunto e memória (`:1580-1611`).
- **Histórico:** `getAiConversationThread` consulta thread, mensagens e artefatos; monta `executionId`, `activitySteps`, artifact, blocos estruturados e FSM a partir de `chat_messages.payload` (`:1617-1685`).
- **Envio:** `sendAiConversationMessage` autentica, lê `working_memory`, insere mensagem do usuário, executa pipeline, insere artefato (se houver), insere resposta com payload e atualiza `chat_threads.working_memory` (`:1692-1849`). A resposta devolve `aiMessage` e `updatedWorkingMemory` (`:1832-1848`).
- **Execução autônoma:** para pedidos de mineração/planilha/etc., o pipeline chama `executeAutonomousCopilotTask`, que cria `copilot_executions`, persiste passos e finaliza execução (`src/services/autonomous-copilot-orchestrator.ts:388-407`, `:955-978`). Para conversa comum, os passos ficam somente no payload da mensagem.
- **Memória soberana:** `recordMemory`/`queryMemory`/`deleteUserMemory` e curadoria existem em BFF separado (`src/services/ai-memory-curation.functions.ts:99-411`), mas não são chamados pelo pipeline de conversa. A memória usada pelo Projeto é o JSON `chat_threads.working_memory`, não `ai_memory_layers`.

## 3. Matriz de promessas

| Promessa | Classificação | Evidência e conclusão |
|---|---|---|
| Criar um Projeto persistente | **Parcial** | Há thread persistente com `thread_type = project`, metadata e `working_memory` (`ai-conversations.functions.ts:1580-1611`; migration `20261215000000...sql:6-24`). Não há entidade/tabela de projeto, membros, fases, dono de projeto, status de projeto, tarefas, arquivos ou fluxo de colaboração; “Projeto” é apenas uma variante de `chat_threads`. |
| Listar Projetos e conversas | **Parcial** | Lista threads do usuário/recipient, ordenadas por pin/update (`:1532-1574`). Não há paginação, `last_message_snippet`/`last_message_at` no retorno apesar de DTO/UI suportarem esses campos (`:89-104`, `ai-chat-shell.tsx:981-997`); aba Projetos mistura `ai_assistant` com `project` (`ai-chat-shell.tsx:145-153`). |
| Histórico recuperável | **Parcial** | Mensagens/artefatos são gravados e recuperados (`:1617-1685`, `:1795-1848`). Guest não persiste. O histórico carregado não reidrata execuções em andamento/pausadas; `executionId` só vem do payload da mensagem. Não há paginação, cursor ou limite de histórico. |
| Memória de trabalho do Projeto | **Parcial** | `working_memory` entra no pipeline e volta ao banco (`:1702-1707`, `:1735-1745`, `:1823-1848`); UI mostra o JSON (`ai-chat-shell.tsx:642-663`). É memória sem schema, TTL, versão, concorrência ou edição; não usa as camadas soberanas de `ai_memory_layers`. Atualizações concorrentes podem sobrescrever chaves de outra execução. |
| Memória soberana, sensível e com consentimento | **Parcial/isolada** | `recordMemory` valida consentimento para sensível e dono/sessão (`ai-memory-curation.functions.ts:115-181`), e a migration impõe constraint de dono (`20261217000000...sql:9-34`). Porém o pipeline de Projeto não chama essas funções; portanto a promessa não é verdadeira para a memória efetivamente usada pelo Projeto. |
| Curadoria aprovada e voz de marca | **Parcial/isolada** | Curadoria filtra `approved` (`ai-memory-curation.functions.ts:372-411`) e voz é lida/salva (`:417-515`), mas não há chamada desses handlers no fluxo de chat/projeto. Defaults de voz contêm exemplos/termos hardcoded (`:445-456`). |
| Trilha de atividade persistente e recarregável | **Parcial** | Passos autônomos são persistidos em `copilot_execution_steps` (`copilot-execution-persistence.ts:49-53`, orchestrator `:407-420`), e UI assina realtime (`ai-activity-trail.tsx:64-92`). Conversas comuns guardam passos só dentro do payload da mensagem. A persistência é best-effort e erros são apenas `console.warn` (`copilot-execution-persistence.ts:68-69`). Mutação posterior de um passo não dispara persistência; no fluxo MCP o passo é inserido como `running` e depois mutado para `completed/failed` (`ai-conversations.functions.ts:867-875`, `:894-919`) sem novo `persistCopilotExecutionStep`, podendo permanecer `running` no banco. |
| Retomar uma execução interrompida | **Ausente na experiência e parcial no helper** | Existe `resumeCopilotExecution(executionId)` que lê execução/passos e incrementa contador (`copilot-execution-persistence.ts:76-84`), mas não há rota/server function consumidora, botão, reexecução do plano, restauração de contexto ou continuação de ferramenta. `rg` encontrou apenas o helper. A UI não expõe “Retomar”. |
| Autenticação | **Parcial** | BFFs exigem `getServerIdentity` em list/create/get/send/delete (`ai-conversations.functions.ts:1535-1541`, `:1583-1588`, `:1621-1625`, `:1695-1700`, `:1933-1938`). Contudo `sendAiConversationMessage` apenas verifica que a thread existe (`:1702-1711`) e não verifica que o usuário é cliente/recipient/membro da loja antes de ler, inserir mensagens e atualizar memória. |
| RLS efetiva | **Ausente como barreira no BFF** | `getServerClient` usa `SUPABASE_SERVICE_ROLE_KEY` e explicitamente “bypasses RLS” (`src/lib/supabase.ts:125-160`). As políticas SQL existem, mas não protegem os handlers que usam esse cliente. A migration de execuções ainda permite SELECT para qualquer autenticado quando `store_id IS NULL` (`20270101010000...sql:52-65`). |
| Idempotência | **Parcial** | Execuções têm `UNIQUE(task_id)` e passos têm unicidades/upsert (`20270101010000...sql:4-45`; `copilot-execution-persistence.ts:35-52`). O envio de mensagem não tem request/idempotency key nem unique de mensagem; retry cria nova mensagem, nova resposta e pode cobrar de novo. A chave de cobrança usa `copilot_${threadId}_${startTime}` (`ai-conversations.functions.ts:731-742`), portanto cada retry tem nova chave. |
| Erros e retries | **Parcial** | Há boundary FSM e respostas `FAILED_RETRYABLE` (`ai-conversations.functions.ts:1504-1524`) e timeout de 45s (`:512-520`). Não há retry automático/backoff; o botão de retry é condicional a `onRetryMessage` (`ai-chat-shell.tsx:531-535`), mas a rota não fornece essa prop (`_store.copilot.tsx:294-305`). A mensagem do usuário já foi persistida antes da falha (`ai-conversations.functions.ts:1713-1729`), sem reconciliação. |
| Streaming | **Ausente** | O BFF aguarda o pipeline inteiro e retorna uma Promise final (`ai-conversations.functions.ts:1692-1849`). `isStreaming` é apenas prop visual (`ai-chat-shell.tsx:93-111`) e não é passado pela rota; realtime é de passos, não de tokens/mensagem. |
| Custo de IA observável | **Parcial** | O tollbooth cobra uma estimativa baseada no tamanho do prompt/sistema, com `maxTokens: 1024` (`ai-conversations.functions.ts:714-743`). Há idempotência e estorno na infraestrutura (`src/lib/token-tollbooth.server.ts:78-170`), mas o pipeline não devolve recibo, uso real ou custo; `tokens_used/cost_usd` da persistência são opcionais (`copilot-execution-persistence.ts:25-30`) e muitos passos usam números estáticos. Falha do estorno é engolida com log (`token-tollbooth.server.ts:164-169`). Guest sem `storeId` não passa pelo tollbooth (`ai-conversations.functions.ts:731-743`, `:1976-1989`). |
| Dados reais, não sintéticos | **Parcial** | Busca interna e algumas consultas usam Supabase. Entretanto o resolver legado, ainda coberto pelos testes, fabrica proposta de R$ 8.500,00, `ORC-001` e dados fixos (`ai-conversations.functions.ts:128-225`; `ai-chat-shell.test.ts:7-24`). O pipeline ativo usa fallback `total_cents = 450000` e milestones fixos quando não há argumento (`:1322-1385`). Há defaults de voz (`ai-memory-curation.functions.ts:445-456`) e drawer usa telefone `49999999999`/Chapecó hardcoded (`waesy-copilot-drawer.tsx:140-160`). Esses valores não devem ser apresentados como dados do Projeto/tenant. |

## 4. Gaps críticos

1. **Cross-tenant no BFF:** o cliente service-role bypassa RLS (`src/lib/supabase.ts:151-154`) e o envio não verifica ownership/membership da thread antes de ler e alterar dados (`ai-conversations.functions.ts:1702-1711`, `:1823-1830`). Um usuário autenticado que conheça um UUID pode tentar operar uma thread de outro tenant.
2. **Retomada prometida, mas não entregue:** não há endpoint/ação de UI para `resumeCopilotExecution`; o helper somente lê e marca `running`, sem reexecutar plano ou continuar do passo correto (`copilot-execution-persistence.ts:76-84`).
3. **RLS de execução ampla:** `store_id IS NULL` concede SELECT a qualquer autenticado (`20270101010000...sql:57-65`), e não existem políticas INSERT/UPDATE/DELETE equivalentes para o ciclo completo.
4. **Ações sem handler:** `AIChatShell` recebe `onRetryMessage`, `onCancelActiveRun`, pin/archive como props opcionais (`ai-chat-shell.tsx:80-111`), mas a rota só fornece create/delete (`_store.copilot.tsx:294-305`). Retry aparece sem efeito; cancel fica oculto; não há UI de pin/archive. `ThreadListItem` apenas aceita `onTogglePin/onToggleArchive`, mas não os renderiza/chama (`ai-chat-shell.tsx:946-1033`).
5. **Persistência não atômica:** mensagem do usuário, artefato, resposta e memória são operações independentes (`ai-conversations.functions.ts:1713-1849`). Erro de artefato e erro de update de memória são ignorados; falha posterior pode deixar histórico sem resposta ou memória divergente.
6. **Retomada e histórico não têm lock/versionamento:** update de `working_memory` é `eq(id)` sem compare-and-swap/version (`:1823-1830`), e `resume_count/status` também são update simples (`copilot-execution-persistence.ts:82`).
7. **Passos persistidos podem ficar incorretos:** proxy persiste somente no `push`; alterações posteriores no objeto não são observadas (`copilot-execution-persistence.ts:60-73`).

## 5. O que está implementado de fato

- Thread de chat/projeto persistente em `chat_threads`, com `project`/`ai_assistant` aceitos na constraint SQL (`20261215000000...sql:6-24`).
- Histórico de mensagens e artefatos com payload estruturado e versionamento inicial (`ai-conversations.functions.ts:1617-1685`, `:1768-1817`).
- Memória de trabalho JSON carregada no pipeline e devolvida à UI (`:1735-1745`, `:1823-1848`).
- FSM, boundary de erro e timeout de 45 segundos (`:512-520`, `:1485-1524`).
- Persistência de execução autônoma e passos, índices de execução retomável e publicação realtime (`20270101010000...sql:4-75`).
- Funções isoladas de memória soberana/consentimento/curadoria/voz e testes unitários das regras puras (`ai-memory-curation.functions.ts:99-515`; `ai-memory-curation.test.ts:9-209`).
- Tollbooth com cobrança ACID, chave de idempotência e tentativa de estorno (`token-tollbooth.server.ts:78-170`).

## 6. Recomendações de código prioritárias

### P0 — autorização e isolamento

- Criar helper único `assertThreadAccess(identity, threadId, mode)` e chamá-lo antes de qualquer SELECT/INSERT/UPDATE/DELETE em threads, mensagens, artefatos, `working_memory` e execuções. Validar explicitamente `customer_id`, `recipient_profile_id`, membership/role da `store_id` e admin de plataforma.
- Preferir cliente Supabase com JWT do usuário para operações de domínio, ou manter service-role somente após autorização explícita centralizada. Não considerar RLS existente como proteção enquanto `getServerClient` bypassa RLS.
- Corrigir políticas de `copilot_executions`/steps para não usar `store_id IS NULL` como acesso global; vincular execução à thread e autor, e adicionar políticas de escrita coerentes.

### P0 — retomada real

- Implementar `resumeCopilotExecution` como server function autenticada e autorizada, com `SELECT ... FOR UPDATE`/RPC transacional, idempotency key, validação de estados e limite de tentativas.
- Persistir `plan`, `state`, ferramenta/observação/erro e checkpoint após cada passo; reidratar o contexto e continuar do primeiro passo não concluído, em vez de apenas marcar `running`.
- Adicionar ação “Retomar/Tentar novamente” na mensagem/execução e passar handlers reais a `AIChatShell`; publicar atualização de estado por realtime.

### P0 — consistência e idempotência

- Introduzir `request_id`/idempotency key no schema de envio, persistir a chave em `chat_messages`/tabela de runs e retornar a resposta existente em reenvio.
- Encapsular user message + run + artifact + AI message + working memory em RPC/transação/outbox. Não ignorar erros de artefato/memória; registrar estado de reconciliação.
- Usar `version`/CAS em `working_memory` e `resume_count`; evitar lost update em duas abas/retomadas simultâneas.
- Fazer `persistCopilotExecutionStep` no início e no fim de cada passo, ou usar uma API de atualização explícita; não depender de mutação de objeto em Proxy.

### P1 — contrato de UI

- Implementar e conectar retry (reenviar a mensagem original com idempotência), cancelamento (AbortSignal + estado `cancelled`) e pin/archive. Remover props mortas ou tornar o contrato obrigatório quando a ação for exibida.
- Adicionar paginação/cursor ao histórico e ao carregamento de threads; retornar `last_message_snippet` e `last_message_at`.
- Separar filtro `project` de `ai_assistant` e criar metadados/estado de projeto reais, caso a promessa de Projeto continue no produto.

### P1 — custo, streaming e dados

- Implementar streaming verdadeiro (SSE/WebSocket) para tokens e eventos de passo, com cancelamento no servidor; `isStreaming` deve refletir estado do BFF.
- Registrar tokens de entrada/saída, provider/model, custo calculado e recibo do tollbooth em execução/mensagem. Derivar `tokensSaved` de dados reais; corrigir retorno de `isCacheHit` no orchestrator, hoje forçado a `false` (`autonomous-copilot-orchestrator.ts:968-977`).
- Remover defaults financeiros/contatos que parecem dados reais ou marcá-los explicitamente como exemplo; falhar quando o dado necessário não existe em vez de inventar.

## 7. Lacunas de teste

- Teste E2E autenticado de dois usuários/duas lojas tentando listar, ler, enviar, atualizar memória, fixar, excluir e retomar a mesma thread.
- Teste contra Supabase real/ambiente de integração confirmando RLS, inclusive `store_id IS NULL` e `copilot_execution_steps`.
- Teste de envio duplicado com a mesma idempotency key: exatamente uma mensagem, uma resposta, um artefato e uma cobrança.
- Teste de concorrência de duas mensagens/abas alterando `working_memory` e de duas retomadas do mesmo executionId.
- Teste de falha em cada etapa da sequência (mensagem do usuário, IA, artefato, resposta, memória) verificando rollback/outbox/reconciliação.
- Teste de retry real da UI: botão deve existir, chamar handler e não duplicar cobrança/histórico.
- Teste de cancelamento real durante gateway/ferramenta e estado final `cancelled` no banco/realtime.
- Teste de streaming incremental e reconexão/replay dos eventos.
- Teste de que dados sintéticos (`850000`, `450000`, `ORC-001`, telefone fictício) nunca aparecem em respostas de tenant quando não há fonte persistida.
- Teste de expiração/consentimento/remoção LGPD das memórias e de que `queryMemory` não retorna sessões arbitrárias.
- Teste do caminho `recordMemory/queryMemory` integrado ao pipeline, pois os testes atuais cobrem somente helpers/mocks e não provam que a memória soberana seja usada.

## 8. Conclusão

O Waesy tem um **esqueleto funcional** de threads, histórico, memória JSON, artefatos, FSM e telemetria, e os testes unitários focados passam. Porém, no domínio auditado, “Projeto com memória e retomada” é uma promessa **parcial**: Projeto ainda é thread, memória soberana não está conectada ao chat, streaming/retry/cancelamento não chegam à rota, e retomada não é uma operação executável. A maior severidade é a combinação de `service_role` com autorização incompleta no envio e no acesso a dados, agravada por persistência não transacional e ausência de idempotência de mensagem/cobrança.
