# Reauditoria 2026-10-06-04 — Chat, Copilot e atendimento

**Projeto:** `/home/ubuntu/waesy-audit`  
**Escopo exclusivo:** threads, tickets, realtime, anexos, SSE, FSM, histórico, ownership e resposta presa/vazia.  
**Data da auditoria:** 2026-10-06  
**Alterações de código:** nenhuma. Foi criado apenas este relatório.

## 1. Resumo executivo

A implementação tem bons pontos de contenção no pipeline do Copilot — há uma FSM explícita, `Error Boundary`, fallback textual e testes de framing SSE —, mas o domínio ainda não pode ser considerado seguro ou consistente em produção. O principal risco é que quase todas as Server Functions usam `getServerClient()`, que é um cliente Supabase `service_role` e, portanto, ignora RLS; em vários caminhos a autorização é apenas “há uma sessão”, sem verificar se a pessoa participa da thread, pertence à loja correta ou tem o papel necessário.

Também há divergências de contrato entre código e migrations: o código envia/lê `chat_messages.attachments`, mas o catálogo de migrations revisado não cria essa coluna; há três famílias de tickets usadas simultaneamente (`store_support_tickets`, `operator_support_tickets` e `support_tickets`); e a exclusão de thread AI consulta `chat_threads.created_by`, coluna que não foi encontrada nas migrations revisadas. Esses pontos podem causar, respectivamente, falha de envio/recuperação de mensagens com anexos, histórico fragmentado e ação de exclusão sempre falhando.

A execução dinâmica da suíte focal foi informativa: **50 testes passaram e 1 falhou**, em `src/services/copilot-pipeline-boundaries.test.ts`; a expectativa de `NEEDS_CLARIFICATION` recebeu `FAILED_RETRYABLE`. A suíte de SSE e tickets passou, mas cobre principalmente schemas/aliases e framing, não integração com banco, ownership, RLS, duplicidade, cancelamento ou respostas vazias.

## 2. Método e limites

- Leitura estática do código em `src/services`, rotas, componentes de chat e migrations Supabase relevantes.
- Leitura dos testes diretamente ligados a Copilot/FSM/SSE/tickets/chat shell.
- Execução sem alteração de código:
  - `node_modules/.bin/vitest run ...` com 6 arquivos focais: **5 arquivos passaram; 1 falhou; 50/51 testes passaram**.
  - `sse.test.ts` + `support-tickets.functions.test.ts`: **2 arquivos, 8/8 testes passaram**.
- Não foi realizada consulta a um banco Supabase de produção nem teste com contas/tenants reais. Portanto, os impactos de dados abaixo são riscos derivados do caminho de execução; não afirmo que já exista exploração ou registro corrompido.

## 3. Achados

### CHAT-01 — P0/Crítico: autorização de thread AI e ações destrutivas não é aplicada no BFF

**Fato observado.** `getServerClient()` cria um cliente com `SUPABASE_SERVICE_ROLE_KEY` e o comentário do próprio módulo declara que ele “bypass[es] RLS” (`src/lib/supabase.ts:140-154`). No serviço AI:

- `sendAiConversationMessage` exige somente `identity.id` (`src/services/ai-conversations.functions.ts:1687-1705`), lê qualquer `chat_threads.id` recebido e grava a mensagem do usuário nessa thread (`:1708-1725`); não compara `customer_id`, `recipient_profile_id`, `store_id`, membro da loja ou papel.
- `getAiConversationThread` exige somente sessão (`:1617-1625`) e busca thread, mensagens e artefatos por UUID (`:1627-1650`).
- `toggleAiThreadPinned` exige somente sessão e faz `UPDATE ... WHERE id = data.threadId`, sem ownership (`:1887-1906`).
- `saveAiChatArtifact` aceita `threadId` e `storeId` fornecidos pelo cliente e grava com `created_by = identity.id`, mas sem verificar que a thread pertence ao usuário ou à loja (`:1850-1879`).
- `mutateCustomerChatThreadAction` normaliza `dm_` e, depois de somente verificar sessão, executa delete de mensagens/thread, clear de histórico ou archive pelo ID (`src/services/chat.functions.ts:916-948`). As ações `pin`, `mute`, `mark_read` etc. retornam sucesso sem efetuar persistência (`:951-953`).

**Risco.** Usuário autenticado poderia ler histórico/artefatos de outra thread, inserir prompt/mensagem em conversa alheia, limpar ou excluir histórico e alterar estado de uma thread de outro tenant. Como o cliente é `service_role`, as policies de `chat_threads`, `chat_messages` e `chat_artifacts` não são uma segunda barreira. A exploração não foi executada contra banco real.

**Dependências.** `getServerClient`, `getServerIdentity`, RLS de Supabase, tabelas `chat_threads`, `chat_messages`, `chat_artifacts`, participantes P2P e membros de workspace.

**Correção concreta.** Criar um helper único `assertChatThreadAccess(threadId, identity, action)` e usá-lo em toda leitura/mutação: participante (`customer_id`/`recipient_profile_id`) ou membro ativo da mesma loja; supervisor somente para ações administrativas; P2P nunca deve depender de `store_id`. Para operações destrutivas, exigir papel apropriado, filtrar o `UPDATE/DELETE` pelo escopo autorizado e verificar `count/affected row`; para cliente, preferir cliente com sessão/RLS em vez de service role. Adicionar testes negativos para UUID de outra thread/loja em leitura, envio, pin, clear, archive, delete e artefato.

### CHAT-02 — P0/Crítico: `attachments` usado pelo código não aparece no schema de `chat_messages`

**Fato observado.** Os schemas de staff e cliente aceitam URLs de anexos (`src/services/chat.functions.ts:21-39`), e `sendChatMessage`/`sendCustomerChatMessage` enviam `attachments` no insert (`:272-283`, `:488-499`). As leituras também selecionam essa coluna (`:106`, `:236-238`, `:438-440`). Entretanto:

- A criação legada de `chat_messages` em `supabase/migrations/0016_chat_team.sql:42-50` possui `message`, `sender_id`, `is_staff_reply`, `created_at`, sem `attachments`.
- A extensão omnichannel em `supabase/migrations/20260827290000_omnichannel_chat_first_ecosystem.sql:21-26` adiciona `message_type`, `payload`, `is_encrypted` e `sender_profile_id`, mas não `attachments`.
- A busca em todas as migrations revisadas não encontrou `ALTER TABLE ... chat_messages ADD ... attachments` nem uma tabela normalizada equivalente para anexos.

**Risco.** Se o schema efetivo seguir essas migrations, qualquer `select` que inclua a coluna pode falhar e os inserts que enviam a chave podem falhar; o fluxo de anexo pode ficar preso, perder a resposta ou cair em tratamento genérico. A existência/ausência efetiva da coluna no banco vivo não foi verificada.

**Dependências.** Migrations `0016_chat_team.sql`, `20260827290000_omnichannel_chat_first_ecosystem.sql`, PostgREST/Supabase e componentes que exibem `attachments`.

**Correção concreta.** Escolher contrato único: adicionar `attachments JSONB NOT NULL DEFAULT '[]'::jsonb` com migration idempotente e validação de conteúdo, ou criar `chat_message_attachments(message_id, storage_object_id, mime, size, checksum, ...)` e alterar os serviços para usar a relação. Validar que cada URL/objeto pertence ao tenant/thread; não aceitar URL pública arbitrária sem comprovação de storage. Criar teste de integração insert/select de mensagem com múltiplos anexos e remoção de anexo órfão.

### CHAT-03 — P1/Alto: três famílias de tickets dividem o domínio de atendimento e o histórico

**Fato observado.** O código usa três tabelas diferentes:

- `src/services/chat.functions.ts:438-440`, `:812-846` e `:862-890` usa `store_support_tickets` ligado a `chat_threads`.
- `src/services/support-tickets.functions.ts:72-225`, `:228-264` e `:270-362` usa `operator_support_tickets`/`operator_support_messages`.
- O mesmo serviço usa `support_tickets`/`ticket_messages` em `:421-466`, `:468-528`, `:530-576` e `:578-655`.

As migrations confirmam modelos incompatíveis: RMA/SAC em `supabase/migrations/20260827290000_omnichannel_chat_first_ecosystem.sql:32-48`, helpdesk do operador em `20260902260000_operator_support_tickets.sql:5-28` e suporte bilateral em `20260731122156_enterprise_rma_and_audit.sql:86-112`.

**Risco.** Um chamado criado por uma função pode não aparecer na fila/rota que consulta outra tabela; respostas e status podem ficar em históricos paralelos; `attachment_urls` (array) e `attachment_url` (singular), `under_review`/`pending` e campos de ownership não são intercambiáveis. Isso favorece atendimento duplicado, ticket “sumido” e SLA incorreto. Não foi afirmado que já há registros divergentes no banco.

**Dependências.** Rotas `workspace.atendimento`, componentes de RMA, `support-tickets.functions.ts`, `chat.functions.ts`, migrations de RMA/helpdesk/bilateral e relatórios SLA.

**Correção concreta.** Declarar uma tabela canônica de ticket e uma tabela canônica de mensagens, com `thread_id`, `store_id`, `customer_id`, `assignee_id`, status/priority/SLA e anexos. Migrar dados antigos com mapa de status, backfill de `thread_id`, constraints/FKs e idempotência. Até a migração terminar, criar uma camada adaptadora explícita de leitura/escrita, com feature flag e métricas de divergência; não manter três escrituras implícitas.

### CHAT-04 — P1/Alto: endpoints de tickets aceitam escopo de loja/ID sem a checagem correspondente

**Fato observado.** `listSupportTickets` autentica e chama `assertStoreAccess(identity)`, mas usa o `store_id` do payload diretamente (`src/services/support-tickets.functions.ts:72-96`), sem comparar com `identity.store_id` nem exigir `platform_admin`. `getSupportTicketDetails` busca por `ticket_id` e retorna o ticket/mensagens (`:99-128`) sem filtro por loja ou por cliente; a proteção fica dependente do helper, embora o cliente usado seja service role. `getCustomer360Context` também recebe `storeId` e faz consultas por esse valor (`src/services/chat.functions.ts:365-392`) após somente `assertStoreAccess(identity)` (`:368-370`).

**Risco.** Dependendo da definição do helper e do papel, um usuário de loja pode consultar tickets, mensagens, pedidos e contexto 360 de outro tenant fornecendo UUIDs conhecidos. Mesmo quando o helper bloquear parte dos casos, a defesa é inconsistente e o service role impede que RLS corrija o erro. Não foi feito teste inter-tenant com dados reais.

**Dependências.** `identity-core`, `assertStoreAccess`, `getServerClient`, tabelas de tickets/pedidos/profiles.

**Correção concreta.** Derivar o tenant da identidade para rotas de staff; aceitar `store_id` somente para `platform_admin` e validar explicitamente. Em detalhe, primeiro carregar o ticket com `eq(store_id, identity.store_id)`/ownership e só depois carregar mensagens. Para customer 360, remover `storeId` do input ou exigir igualdade estrita ao tenant ativo. Adicionar testes de matriz de papéis e tenants.

### CHAT-05 — P1/Alto: exclusão de thread AI consulta coluna `created_by` ausente das migrations

**Fato observado.** `deleteAiConversationThread` faz `.select("id, created_by, store_id")` (`src/services/ai-conversations.functions.ts:1917-1931`) e compara `thread.created_by` com o usuário (`:1933-1939`). A criação de thread AI grava `customer_id`, mas não `created_by` (`:1590-1602`). Nas migrations revisadas, `chat_threads` é criado sem `created_by` (`0016_chat_team.sql:8-20`), e não foi encontrada migration que adicione essa coluna; as ocorrências de `created_by` encontradas são de `chat_artifacts`/outras tabelas.

**Risco.** O PostgREST pode devolver erro de coluna inexistente; o serviço ignora o erro da consulta e trata `thread` como nula, retornando “Thread não encontrada”, tornando a exclusão indisponível. Se uma coluna for adicionada manualmente com semântica diferente, o check ainda pode divergir de `customer_id`/participantes. O comportamento não foi confirmado contra banco vivo.

**Dependências.** Schema/migrations de `chat_threads`, função de exclusão e política de ownership.

**Correção concreta.** Escolher uma fonte de verdade: adicionar `created_by UUID REFERENCES profiles(id)` e preencher/backfill em todas as criações, ou trocar o check para `customer_id`/participante e escopo de loja. Nunca ignorar o erro da query de autorização. Testar criar, listar, abrir e excluir thread após aplicar migrations em banco limpo.

### CHAT-06 — P1/Alto: webhook WhatsApp não verifica assinatura do POST nem deduplica mensagem

**Fato observado.** O GET valida `hub.verify_token` global ou por credencial (`src/routes/api.webhooks.whatsapp.ts:12-60`), mas o POST começa lendo JSON (`:70-75`) e resolve a loja apenas por `value.metadata.phone_number_id` comparado com `token_payload` (`:88-103`). Não há validação de `X-Hub-Signature-256`, HMAC/app secret ou outro segredo no POST. Cada mensagem é inserida em `chat_messages` com `payload.message_id` (`:194-207`), mas não há consulta por esse ID, unique constraint, inbox/outbox ou transação; a thread também é localizada por `store_id/context_type/entity_id` (`:150-156`) sem unique index demonstrado.

**Risco.** Um POST forjado com um `phone_number_id` conhecido pode injetar lead/mensagem. Retries normais da Meta podem gerar mensagens duplicadas e/ou concorrência em threads; a resposta HTTP 200 não prova que cada inserção foi efetivada, pois erros são apenas logados (`:209-210`). Mídias recebidas viram texto literal `[Mídia/Outro]` (`:108-110`) e não são anexadas ao histórico.

**Dependências.** Meta WhatsApp Cloud API, `integration_credentials`, `chat_threads`, `chat_messages`, `whatsapp_leads`.

**Correção concreta.** Validar assinatura HMAC sobre o corpo bruto antes de `request.json()`, usando app secret por integração e rejeitando ausência/erro. Criar tabela inbox com `provider`, `provider_message_id`, `store_id`, payload bruto e unique constraint; processar em transação/outbox idempotente. Adicionar unique `(store_id, context_type, entity_id)` se essa for a identidade da thread. Mapear `image/document/audio` para objetos de storage e anexos com controle de acesso.

### CHAT-07 — P1/Alto: regressão dinâmica na regra de esclarecimento geográfico da FSM

**Fato observado.** A execução focal de `src/services/copilot-pipeline-boundaries.test.ts` falhou em `:104`: o teste espera `NEEDS_CLARIFICATION` para “minerar leads de padarias” sem cidade, mas a implementação retornou `FAILED_RETRYABLE`. O restante desse arquivo passou (6/7 testes). O código contém a intenção explícita de transitar para `NEEDS_CLARIFICATION` em `src/services/ai-conversations.functions.ts:767-778`, mas o resultado observado não satisfaz o contrato do teste.

**Risco.** Uma solicitação que deveria pedir cidade pode acionar caminho de ferramenta/fallback e terminar como erro transitório; isso produz resposta errada, atividade presa em falha e consumo desnecessário de tool/provider. Como não houve banco/ambiente de produção, a causa exata pode depender de resolução de cidade/configuração; isso é hipótese, não fato.

**Dependências.** `needsCityClarification`, `fragmentAndOptimizePrompt`, `resolveActiveCity`, mocks do gateway/orquestrador e estado do ambiente de teste.

**Correção concreta.** Tornar a decisão geográfica determinística e independente de env implícito: cidade explícita no prompt/contexto é a única fonte válida para esse caso; caso ausente, retornar `NEEDS_CLARIFICATION` antes de gateway/tool. Ajustar fixture/mock para deixar cidade ausente e adicionar teste de não acionamento do orquestrador, além do cenário com cidade válida.

### CHAT-08 — P1/Alto: caminho de Copilot pode persistir execução como `running` e não fechá-la

**Fato observado.** `executeAutonomousCopilotTask` cria `copilot_executions` como `running` e cria proxy de passos (`src/services/autonomous-copilot-orchestrator.ts:399-407`). Se `needsCityClarification(task)` for verdadeiro, retorna em `:422-434` com `fsmPhase: "NEEDS_CLARIFICATION"` sem chamar `completeCopilotExecution`. A finalização só ocorre no caminho inferior (`:948-958`). O schema da tabela permite `running`, `paused`, `failed_retryable` etc. (`supabase/migrations/20270101010000_copilot_react_execution_persistence.sql:4-22`).

**Risco.** Execuções que pedem esclarecimento podem aparecer indefinidamente como `running`/resumíveis; o histórico e o painel de atividade podem mostrar spinner ou execução presa, e filtros de retomada podem reprocessar tarefa que não está executando. É uma conclusão do fluxo estático; não foi consultado banco vivo.

**Dependências.** `copilot_executions`, `copilot_execution_steps`, `resumeCopilotExecution`, painel `ai-activity-trail` e `needsCityClarification`.

**Correção concreta.** Fechar explicitamente a execução no retorno antecipado com estado `paused` ou `completed`/`failed_final` sem erro, `last_error`/reason e `completed_at` conforme contrato. Fazer o mesmo em todo return precoce (cache hit, cancelamento, erro fatal). Criar teste que inspecione estado persistido para clarification, timeout, cancelamento e retry.

### CHAT-09 — P1/Alto: respostas vazias/whitespace podem ser marcadas como sucesso; SSE não garante delta final

**Fato observado.** `sendAiMessageSchema` usa `.min(1)` sem `.trim()` (`src/services/ai-conversations.functions.ts:53-60`), portanto uma mensagem composta somente por espaços passa. O pipeline inicializa `responseMessage = gatewayResponse?.message || ""` (`:783-787`) e só faz fallback com `if (!responseMessage)` (`:1477-1480`); string whitespace é truthy. A resposta é gravada como `delivered` (`:1790-1810`) quando não está em fase de falha (`:1831-1839`). Na rota SSE, depois de `result.success`, envia `verifying` e `done` sem exigir que qualquer `delta` não vazio tenha sido emitido (`src/routes/api.ai.stream.ts:120-154`). Os testes de SSE (`src/lib/ai/sse.test.ts:4-15`) validam apenas framing/headers e não cobrem delta ausente, cancelamento, erro após headers ou conteúdo whitespace.

**Risco.** A UI pode mostrar bolha vazia/sem texto, ou encerrar stream “com sucesso” sem conteúdo; uma execução pode parecer presa porque só há evento `done` sem mensagem renderizável. Não há evidência de ocorrência em produção.

**Dependências.** Gateway AI, `api.ai.stream`, persistência de `chat_messages`, consumidores SSE e renderização de mensagens estruturadas.

**Correção concreta.** Normalizar `trim()` na validação e antes de persistir; definir invariável: sucesso exige texto não vazio ou payload estruturado não vazio, caso contrário emitir `error`/`FAILED_RETRYABLE` e persistir mensagem explicativa. No SSE, manter contador de deltas/bytes e emitir erro se finalizar sem conteúdo; tratar abort/cancel no `ReadableStream` e testar esses casos. Adicionar testes de whitespace, `success + no delta`, `success + structured only`, erro após headers e timeout.

### CHAT-10 — P1/Alto: criação de ticket/mensagem não é atômica e falhas secundárias são convertidas em sucesso

**Fato observado.** `createSupportTicket` insere `operator_support_tickets` e só depois insere a primeira mensagem (`src/services/support-tickets.functions.ts:146-181`); se a segunda operação falha, o ticket já existe. `createCustomerTicket` também insere ticket e, se a primeira mensagem falha, apenas registra warning e retorna o ticket (`:494-527`). `sendChatMessage` atualiza a thread depois do insert, mas ignora o erro desse update (`src/services/chat.functions.ts:289-296`); dispatch WhatsApp/Mercado Livre também só gera warning (`:298-321`).

**Risco.** Ticket sem histórico inicial, `updated_at/last_message` divergente, bolha local removida apesar de mensagem persistida ou mensagem marcada como enviada quando o canal externo falhou. Esse é um caminho concreto para histórico incompleto e “resposta presa”; não foi executado com banco falhando.

**Dependências.** Supabase service role/RPC, tickets, chat thread, integrações externas e optimistic UI em `workspace.atendimento.index.tsx:217-251`.

**Correção concreta.** Usar RPC transacional para ticket + primeira mensagem + atualização de thread, ou outbox com estados `pending/sent/failed` e retry idempotente. Nunca retornar sucesso sem confirmar as operações obrigatórias; se a mensagem local foi persistida e dispatch externo falhou, devolver status explícito `persisted_pending_external` e exibir retry. Verificar todos os erros de `update` e inserir testes de falha parcial.

### CHAT-11 — P2/Médio: canal global de Broadcast expõe metadados de typing/read receipt fora da thread/tenant

**Fato observado.** A tela do cliente abre `getRealtimeChannel("messenger-protocol-v115")` e recebe `is_typing` global (`src/routes/_store.conta.conversas.$id.tsx:107-115`); a tela de atendimento abre o mesmo canal com Presence/typing/read receipts (`src/routes/_store.conta.conversas.index.tsx:125-166`). Os payloads carregam `threadId`, `status` e `sender`, mas não há `storeId`, autorização por tenant ou uso de canal privado demonstrado. O helper remove canal no cleanup, mas não valida remetente/payload (`src/services/realtime-channel.ts:22-48`, `:54-68`).

**Risco.** Broadcast não é a mesma coisa que `postgres_changes` protegido por RLS; qualquer cliente autorizado ao canal pode observar indicadores de digitação/leitura de outras threads se conhecer/receber seus IDs. A UI filtra parte dos eventos por `threadId`, mas isso não impede recebimento nem garante isolamento. A extensão efetiva de Broadcast/Auth no projeto não foi testada ao vivo.

**Dependências.** Supabase Realtime Broadcast/Presence, canais estáticos, componentes de cliente e políticas de autenticação.

**Correção concreta.** Usar canal privado por tenant + thread (`store:{storeId}:thread:{threadId}`), habilitar autorização de Realtime, derivar IDs do servidor e validar schema/participante no recebimento. Não usar canal global para dados de atendimento; testar que dois tenants não recebem typing/read receipt um do outro.

### CHAT-12 — P2/Médio: caminho de convidado para conversa de loja contradiz a constraint do banco

**Fato observado.** `startCustomerChatThread` permite ausência de usuário na ramificação de loja e grava `customer_id: null` (`src/services/chat.functions.ts:741-792`), sem receber `guest_email` e com `guest_name` derivado de perfil nulo (`"Cliente"`). A migration inicial exige `customer_id IS NOT NULL OR guest_email IS NOT NULL` (`supabase/migrations/0016_chat_team.sql:8-20`). O ramo P2P, corretamente, exige login (`:710-712`).

**Risco.** Um cliente anônimo pode receber erro de constraint ao iniciar conversa, apesar de a função tentar suportar guest; a falha pode aparecer como chat que não abre ou resposta presa. Não foi feita chamada HTTP anônima contra banco vivo.

**Correção concreta.** Escolher política explícita: exigir login nessa função, ou criar/usar guest session e coletar/validar `guest_email` antes do insert; incluir `guest_session_id` com TTL se necessário. Testar fluxo anônimo, autenticado, reconexão e conversão de guest para usuário.

## 4. Evidências positivas e cobertura existente

- `src/types/copilot-fsm.ts:270-375` implementa transições, histórico, retry count e registro de falha.
- O pipeline tem contenção de exceção e fallback textual (`src/services/ai-conversations.functions.ts:1504-1524`); testes de MCP/error boundary passaram.
- A rota SSE valida payload e autenticação/rate limit antes de abrir stream (`src/routes/api.ai.stream.ts:43-64`) e define headers sem buffering (`src/lib/ai/sse.ts:12-19`).
- A tela de atendimento usa `filter: thread_id=eq...` no listener de `chat_messages` (`src/routes/workspace.atendimento.index.tsx:167-180`) e faz deduplicação por mensagem (`:196-199`).
- A tela do cliente também filtra a thread no `postgres_changes` (`src/routes/_store.conta.conversas.$id.tsx:70-78`) e recarrega histórico após `SUBSCRIBED` (`:97-105`).
- O teste de tickets valida mínimo de mensagem e rejeita `"a"` (`src/services/support-tickets.functions.test.ts:72-84`), mas isso não substitui `.trim()` nem teste de integração.

## 5. Plano de correção priorizado

1. **Bloquear P0:** centralizar autorização por thread/tenant antes de qualquer query service-role; adicionar testes inter-tenant e impedir delete/clear/pin/artifact sem ownership.
2. **Reconciliar schema:** aplicar migration de anexos e resolver `created_by`/ownership de `chat_threads` antes de novo deploy.
3. **Unificar tickets:** decidir tabela canônica, migrar dados e eliminar escrituras divergentes; manter adapter temporário observável.
4. **Fechar estados:** corrigir todos os returns antecipados do orquestrador, garantir `paused/failed/completed` e `completed_at`; criar testes de FSM persistida.
5. **Endurecer ingressos:** HMAC do WhatsApp, inbox idempotente, mídia/anexos e transações/outbox para tickets/chat/dispatch.
6. **Eliminar resposta vazia:** trim/invariante de conteúdo no pipeline e SSE, mais testes de stream sem delta e de cancelamento.
7. **Isolar realtime:** canais privados por tenant/thread, autorização e validação de payload.
8. **Reexecutar gates:** suíte focal, testes de integração contra banco limpo com todas as migrations, matriz de papéis/tenants e smoke E2E de atendimento.

## 6. Conclusão

O domínio tem uma base útil de FSM, telemetria e UX otimista, mas os contratos de armazenamento e ownership não estão reconciliados. Até a correção dos achados CHAT-01/02/03/05/06/08/09, a recomendação é **não declarar Chat/Copilot/atendimento como pronto para produção multi-tenant**: há risco simultâneo de exposição entre threads, falha de anexos, ticket/histórico fragmentado, execução persistida como `running` e resposta vazia marcada como entregue.
