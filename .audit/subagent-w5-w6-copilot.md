# Auditoria técnica independente — W5/W6 Copilot, gateway, SSE, retry e artifacts

**Data:** 2026-10-10  
**Repositório:** `/home/ubuntu/waesy`  
**HEAD observado:** `98c0d2c2f8c01793a327a12f814c17d9de5e2afb` (`main`)  
**Escopo:** somente W5/W6 — Copilot, gateway, SSE, retry/idempotência, persistência de execução, artifacts, quota e telemetria.  
**Regra aplicada:** somente leitura. Não alterei código, testes, migrations ou configuração; não apliquei migration, não acessei produção, não fiz deploy/merge/commit/push.

## 1. Veredito

**Status: `partial`.** Há mitigação estática real no HEAD (o drawer usa `executeCopilotDrawerMessage`, há `clientMessageId`, o guest agora possui `enforceRateLimit`, e há rota SSE), além de testes unitários direcionados passando. Entretanto, W5/W6 permanecem **abertas** e não podem ser promovidas a concluídas: o SSE não tem consumidor Copilot nem parser, cancelamento não chega ao provider, o pipeline síncrono transforma falha do gateway em sucesso heurístico, uma falha de carregamento de sessão/thread autenticada pode entrar no caminho guest, quota/cobrança e writes de artifact/mensagem não são demonstrados como uma operação idempotente, e não há prova independente de Postgres/RLS, provider, browser/reload, CI no mesmo SHA ou deploy.

Os documentos oficiais confirmam a mesma interpretação: o inventário consolidado mantém W5 em remediação e W6 aberta (`FULL-REMEDIATION-INVENTORY-20261007.md:39-60`), a readiness classifica W5 como aberta e W6 como aberta (`20261007-WAVE-READINESS-W0-W7.md:59-60`), e os inventários W5/W6 exigem gates de provider, RLS/JWT A/B, concorrência, fault injection, browser/reload e CI (`full-remediation-inventory/05-w5-copilot.md:100-150`; `06-w6-chat.md:77-119`). O masterplan ainda identifica os blockers de falso sucesso, steps presos, SSE órfão, guest e artifact parcial (`WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md:1130-1202`).

## 2. Achados verificáveis no código atual

### W5/W6-01 — SSE órfão e dois contratos de execução (confirmado estaticamente)

`src/routes/api.ai.stream.ts:40-193` cria frames `status/delta/structured/done/error`; `src/lib/ai/sse.ts:1-18` apenas codifica eventos e headers. A busca no código de produção encontrou apenas a própria rota, `routeTree.gen.ts` e a implementação do gateway: não há `EventSource`, `fetch('/api/ai/stream')`, parser, acumulador de deltas ou consumidor UI. O fullscreen chama `sendAiConversationMessage` (`src/routes/_store.copilot.tsx:188-241`) e o drawer chama `executeCopilotDrawerMessage` (`src/components/chat/waesy-copilot-drawer.tsx:91-108`). O shell recebe `isStreaming`, mas a rota passa somente `isSending` (`_store.copilot.tsx:418-435`). Portanto a existência de endpoint não prova streaming visual.

**Impacto:** UX não incremental, contrato duplicado, persistência/erro/cancelamento divergentes. Escolher um boundary canônico antes de adicionar outro caminho.

### W5/W6-02 — Abort/cancelamento não é propagado ao reader/provider (confirmado estaticamente)

A rota testa `request.signal.aborted` antes de enfileirar eventos, mas `ReadableStream.cancel()` é no-op (`api.ai.stream.ts:71-87,185-187`). `executeAiCoreGatewayStream` não recebe `AbortSignal` (`ai-core-gateway.functions.ts:1017`) e os `fetch`/`reader.read()` do streaming (`:1048-1068`) não recebem signal nem `reader.cancel()`. O cancelamento da UI (`_store.copilot.tsx:278-283`) só incrementa `activeRunRef`, altera estado local e libera o composer; não aborta a função server-side, provider ou harvester.

**Impacto:** custo, sockets e ferramentas podem continuar depois do abandono; não há estado terminal `CANCELLED` persistido.

### W5/W6-03 — Falso sucesso quando gateway falha ou retorna JSON inválido (confirmado por fluxo estático)

O pipeline captura toda exceção do gateway e apenas registra warning (`src/services/ai-conversations.functions.ts:768-794`). Em seguida usa `gatewayResponse?.intent || detectIntent(promptLower)` (`:796`) e, no ramo geral, usa saudação padrão quando não há mensagem (`:1558-1579`); no final transiciona para `VALIDATING/COMPLETED` (`:1620-1627`). Assim um prompt geral sem intenção heurística, com gateway indisponível ou JSON sem `message`, pode ser devolvido como `COMPLETED/DELIVERED`, confundindo indisponibilidade com resposta válida. O teste de fronteira cobre erro do gateway junto com mineração, mas não o caso geral (`copilot-pipeline-boundaries.test.ts:88-119`).

**Correção segura:** preservar `gatewayError`, validar schema mínimo (`message`/payload) e retornar `FAILED_RETRYABLE` quando não houver fallback determinístico específico; adicionar regressão para gateway rejeitado e JSON vazio.

### W5/W6-04 — Falha autenticada de list/create pode degradar silenciosamente para guest (bug verificável)

No loader de `_store.copilot.tsx`, falha de listagem/criação deixa `initialLoadError=true` e `initialThreads=[]` (`:43-80`). O estado inicial então usa `DEFAULT_GUEST_THREAD_ID` quando não há threads (`:103-132`). No envio, a guarda só rejeita um ID não-UUID (`:166-171`); o UUID default passa, e a condição autenticada exclui explicitamente esse ID (`:188-235`), caindo em `executeGuestCopilotMessage`. Portanto usuário autenticado cuja criação/lookup falhou pode chamar provider sem persistência da thread, em vez de receber erro/retry de sessão.

**Impacto:** perda de histórico e possível bypass de controles/custo; é uma reprodução estática do fluxo atual, não apenas hipótese histórica.

### W5-05 — Guest tem rate limit, mas não quota/tollbooth nem identidade/telemetria de execução (parcial, risco confirmado)

O handler guest chama `enforceRateLimit("guest", "ai_generation")` (`ai-conversations.functions.ts:2230-2246`), bloqueia termos de mineração avançada, mas executa `executeAiCopilotPipeline` sem `storeId`, identidade ou `requireTokensOrTollbooth`. O débito do pipeline só é acionado condicionalmente quando `context.storeId` existe (`:768-781`). O caminho guest não grava `chat_threads/chat_messages`. Além disso, `guest` é um identificador compartilhado em memória (`rate-limiter.ts:230-234`) e a política é 10/min (`:71-76`), não quota por IP/device nem limite financeiro por visitante. Solicitações gerais/Places ainda podem alcançar provider e, quando não há listing, harvester externo (`ai-conversations.functions.ts:1045-1062`).

**Nível:** rate limit local confirmado; quota/custo/abuso em ambiente distribuído e provider real não verificados.

### W5-06 — Artifact e resposta não são atômicos (confirmado estaticamente)

`sendAiConversationMessage` insere `chat_artifacts` primeiro (`ai-conversations.functions.ts:1970-2002`) e `chat_messages` depois (`:2004-2039`). Se o insert da mensagem falhar, a função marca a mensagem do usuário como failed e lança, mas não remove/compensa o artifact já criado. A resposta e o artifact podem sobreviver em estados divergentes. No builder autônomo, o insert de `experience_documents` é capturado como falha não-bloqueante (`autonomous-copilot-orchestrator.ts:654-681`), e o artifact é montado mesmo sem `documentId` (`:687-698`). O código evita anunciar o artifact quando o insert do `chat_artifacts` falha, mas não fecha atomicidade/reconciliação.

**Impacto:** artifact órfão ou preview fantasma após falha/reload. Gate oficial exige transaction/RPC ou saga idempotente, fault injection e reload.

### W5-07 — Idempotência de débito não está vinculada à `clientMessageId` (risco verificável no desenho)

A migration atual cria índice único `(thread_id, client_message_id)` somente quando o campo existe (`supabase/migrations/20270112000001_chat_message_idempotency.sql:1-8`), e o BFF faz lookup defensivo (`ai-conversations.functions.ts:1862-1907`). Porém o tollbooth recebe `idempotencyKey: copilot_${context.threadId}_${startTime}` (`:769-778`). Um retry após provider bem-sucedido e falha posterior de artifact/mensagem usa novo `startTime`, logo não reutiliza a mesma chave de cobrança. O tollbooth possui RPC/estorno para falha dentro de `executeAction` (`src/lib/token-tollbooth.server.ts:78-170`), mas as escritas posteriores de artifact, resposta e memória ficam fora desse escopo. Não houve concorrência real ou ledger de custo para confirmar comportamento.

### W5-08 — Steps persistidos ficam stale após mutação local (confirmado estaticamente)

`createPersistedActivitySteps` persiste snapshot somente no `push` (`copilot-execution-persistence.ts:79-95`). O orquestrador adiciona passo `running` e depois apenas muta o mesmo objeto para `completed`/`failed` (`autonomous-copilot-orchestrator.ts:514-539` e ramos análogos). Não existe upsert/update final do step depois da mutação. `AIActivityTrail` prefere `persistedSteps` quando recebeu qualquer row (`ai-activity-trail.tsx:64-95`), então um row `running` pode manter spinner mesmo que a resposta in-memory esteja concluída. O teste de persistência verifica pushes já completed e ordem (`copilot-execution-persistence.test.ts:54-62`), não mutação posterior.

### W5-09 — Isolamento e migrations são somente evidência de contrato, não prova de banco

A migration `20261006000006_wave2_conversation_isolation.sql:41-92` define policies por customer/member/assigned e o SQL de execution persistence define RLS/grants (`20270101010000_copilot_react_execution_persistence.sql:52-69`), com correção posterior de steps (`20261007130100_copilot_execution_steps_rls_fix.sql:11-27`). Isso é **prova de SQL presente**, não prova de aplicação, grants efetivos, JWT A/B ou cross-tenant. Também há um worktree sujo com migrations/documentos de outras frentes; não trate o estado local como schema aplicado.

## 3. Evidências executadas e limites

- **Testes locais:** executei `npx vitest run` nos seis arquivos direcionados (SSE, gateway, access, persistence, pipeline boundaries e FSM/resilience): **6 arquivos e 37 testes passaram**. São testes unitários/mocks; o teste SSE cobre apenas framing/headers (`sse.test.ts:4-15`), e o gateway mocka `fetch`/Supabase (`ai-core-gateway.test.ts:28-84`). Isso não prova HTTP SSE, provider, quota, RLS, concorrência ou browser.
- **Typecheck local:** `npm run typecheck` foi executado com janela de 300s e retornou ao shell sem diagnóstico observável. Isso é somente compilação local; não substitui CI, browser, provider ou deploy.
- **Código/busca estática:** nenhuma referência de consumidor UI ao endpoint SSE/parser foi encontrada fora da própria rota/route tree/teste; os pontos e contratos acima foram confirmados no HEAD.
- **Banco/migrations:** migrations foram apenas lidas. **Não** houve Postgres/Supabase efêmero, replay from-zero, segunda aplicação, inspeção de `pg_policies`, grants, RPCs, RLS ou dados A/B.
- **Browser/reload:** não executado; não há evidência Playwright para drawer/fullscreen/SSE/retry/reload.
- **Provider:** não executado em provider real/staging. Há mock de `fetch`; não há prova de 429/5xx real, custo, fallback ou cancelamento upstream.
- **CI/deploy/produção:** não executados nem autorizados. Nenhuma wave foi declarada concluída.
- **Worktree:** `git status` já estava sujo por alterações/documentos/migrations de outras frentes e artefatos `.audit`; não atribuo esses diffs a W5/W6 nem os modifiquei.

## 4. Correções locais de baixo risco recomendadas ao agente principal

1. **Bloquear fallback autenticado→guest:** se houver `effectiveUserId` e thread default/ausente, retornar erro explícito de carregamento/criação e manter retry; somente sessão realmente anônima pode chamar `executeGuestCopilotMessage`.
2. **Fechar falso sucesso do gateway:** introduzir estado local `gatewayFailure`, validar JSON com schema mínimo e retornar `FAILED_RETRYABLE` para erro/saída vazia sem fallback determinístico; adicionar os dois testes de regressão descritos no masterplan.
3. **Fixar chave de cobrança:** exigir/propagar `clientMessageId` no BFF e derivar chave estável de `threadId + clientMessageId + operação`; confirmar RPC idempotente e compensação após falha de writes antes de considerar custo fechado.
4. **Persistir transições de steps:** adicionar operação explícita de upsert/finalize por `execution_id + step_id` após cada mutação `running→completed/failed/cancelled`, aguardando os writes antes do estado terminal; cobrir teste de snapshot running seguido de completed.
5. **Eliminar artifact órfão:** preferir RPC transacional; como mitigação de baixo risco, compensar/remover artifact recém-criado quando insert de `chat_messages` falhar e não incluir artifact no DTO sem ID/linha confirmada. Reconciliar `experience_documents` antes de devolver preview.
6. **Propagar abort antes de ligar SSE:** adicionar `signal?: AbortSignal` ao gateway de streaming, passá-lo da `Request`, cancelar reader e limpar timers. Em paralelo, escolher explicitamente server function síncrona **ou** SSE; não manter um terceiro contrato.
7. **Guest tollbooth:** manter o rate limit atual como camada anti-abuso, mas adicionar identidade/limite por IP/device e negar provider/harvester não autenticado até existir quota/custo auditável. Testar request negativo sem provider/write.
8. **Isolamento assigned:** revisar `canAccessAiThread` para exigir escopo de tenant/membership também no ramo `assigned_to_profile_id`; depois provar com JWT A/B no banco, não apenas helper unitário.

Nenhuma dessas correções deve ser considerada fechada sem os gates independentes: Postgres/RLS real, provider stub com abort/429/5xx, concorrência e fault injection, Playwright/reload, CI no mesmo SHA e, separadamente, deploy/smoke autorizado.

## 5. Conclusão

W5/W6 têm **progresso parcial verificável localmente**, mas os blockers de boundary/SSE/abort, falso sucesso, fallback guest, atomicidade/idempotência e ausência de provas externas impedem o fechamento. O status recomendado permanece **`partial` / remediação em andamento**; não há base para declarar qualquer wave concluída, nem para inferir provider real, RLS real, browser, CI, deploy ou produção.
