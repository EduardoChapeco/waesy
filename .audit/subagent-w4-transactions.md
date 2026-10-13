# Auditoria independente — W4: persistência, FSM, transações e idempotência

**Data da auditoria:** 2026-10-10  
**Repositório:** `/home/ubuntu/waesy`  
**SHA observado:** `98c0d2c2f8c01793a327a12f814c17d9de5e2afb` (`main`, `origin/main`)  
**Escopo:** somente W4 — persistência, FSM, transações, retries/replay, idempotência e recuperação de estados parciais.  
**Regra:** esta auditoria é somente leitura. Não foram alterados arquivos de código, migrations ou testes; não houve commit, push, merge, deploy, acesso a produção ou aplicação de migration remota.

## 1. Veredito

**W4 = `partial` (aberta; não pronta para promoção).**

Há contratos locais úteis e algumas correções importantes no código, especialmente:

- a FSM de 13 fases e seus testes unitários;
- o índice de deduplicação de mensagens `(thread_id, client_message_id)`;
- a RPC `apply_operator_voucher_atomic`, que concentra o apply documental de voucher em uma função transacional com lock e chave de operação;
- a RPC `persist_omni_document_snapshot`, que bloqueia o documento e agrupa save/publish do caminho Omni;
- o retry do cliente do Copilot, que tenta preservar a chave original.

Esses pontos constituem **prova local de código/contrato**, não prova de banco. Foram encontrados bugs verificáveis no código atual que ainda permitem divergência de FSM, escrita parcial, publicação duplicada e operações de turismo sem dedupe/atomicidade. Os testes W4 focados passam, mas são majoritariamente doubles em memória ou asserções textuais de migration/código; nenhum executa Postgres, RLS/JWT, concorrência, fault injection, perda de resposta, provider ou browser.

**Nenhuma microfase W4 foi declarada concluída.** O veredito oficial continua coerente com `docs/audits/20261007-WAVE-READINESS-W0-W7.md:77-86`, `docs/audits/FULL-REMEDIATION-INVENTORY-20261007.md:58` e o masterplan `docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md:129-138`.

## 2. Proveniência e nível de evidência

- O worktree está sujo, com **35 paths** modificados/não rastreados por outras frentes. Os paths W4 principais examinados não apareceram como modificados no `git status` filtrado, mas o estado não é um candidato limpo independente; não foi feito reset, staging ou restauração.
- Os documentos oficiais são snapshots históricos de branches/SHA diferentes. O relatório W4 anterior menciona `fc8f9fc3`, enquanto o checkout observado agora está em `98c0d2c`. Findings históricos foram rechecados apenas quando havia path atual equivalente.
- O readiness report chama a migration de idempotência de `20270112000000_chat_message_idempotency.sql`, mas o checkout atual contém `supabase/migrations/20270112000001_chat_message_idempotency.sql`. Essa divergência de nome/ownership precisa ser reconciliada antes do replay.
- Não há `psql`, `postgres`, `supabase` CLI ou `docker` disponíveis no sandbox. Nenhuma migration foi aplicada e não foi possível abrir um Postgres descartável.
- Não houve browser/Playwright, provider real ou sandbox autorizado, CI, staging, deploy ou smoke público.

### Classificação de evidência

| Nível | Resultado desta auditoria |
|---|---|
| **Código local** | Encontradas violações e riscos concretos nos paths abaixo; RPCs e contratos positivos estão presentes. |
| **Testes locais** | `npx vitest run` nos 7 arquivos W4 selecionados: **7 arquivos, 55 testes, todos PASS**. Isso é somente evidência local. |
| **Banco/Postgres/RLS** | **Não provado**: sem runner, migrations from-zero, catálogo, constraints efetivas, `SECURITY DEFINER`, grants, JWT/roles ou read-after-write. |
| **Concorrência/fault injection** | **Não provado**: não houve POST concorrente, erro entre writes, rollback observado, resposta HTTP perdida ou reprocessamento real. |
| **Browser/reload** | **Não provado**. |
| **Provider/cobrança** | **Não provado**; nenhum provider foi invocado ou instrumentado. |
| **CI/deploy/produção** | **Não executado/observado nesta auditoria**. |

## 3. Findings verificáveis no código atual

### W4-F01 — A matriz da FSM permite `COMPLETED` prematuro

**Severidade sugerida:** P1/P0 de integridade.  
**Status:** confirmado no código; runtime persistido não exercitado.

`src/types/copilot-fsm.ts:147-170` permite:

- `UNDERSTANDING -> COMPLETED` (`:149-157`);
- `RUNNING -> COMPLETED` (`:162-170`).

O masterplan/readiness exige que o estado terminal `completed` sem efeitos obrigatórios seja rejeitado. A única rota canônica segura deveria passar por validação/efeitos observáveis (por exemplo, `VALIDATING -> COMPLETED`), ou por um guard explícito de efeitos. Além disso, `CopilotStateMachine.recordFailure` em `:361-370` tem fallback que altera `currentPhase` diretamente quando a transição não é permitida; esse escape pode contornar a matriz, inclusive se for chamado depois de um estado terminal.

Os testes `src/services/copilot-fsm-and-resilience.test.ts:79-105` cobrem apenas a rota positiva e `:107-113` testa saltos a partir de terminais, mas não testam `UNDERSTANDING/RUNNING -> COMPLETED` como negativo nem `recordFailure` após terminal. Portanto os 14 testes do arquivo não detectam o bug apontado pelo readiness report.

**Correção local de baixo risco:** restringir a matriz e adicionar testes negativos para todo `COMPLETED` sem efeito/validação persistida; remover o fallback que contorna `assertValidCopilotTransition` ou convertê-lo em erro explícito. Antes de consolidar a semântica de `NEEDS_CLARIFICATION`, obter decisão do produto documentada.

### W4-F02 — Status e fase persistida podem divergir; `resume` não persiste a fase

**Severidade sugerida:** P1.  
**Status:** confirmado no código; integração/reload não provados.

Em `src/services/copilot-execution-persistence.ts`:

- `startCopilotExecution` usa `upsert(..., { onConflict: "id" })` e grava `status: "running"`, `current_phase: "RECEIVED"`, `started_at: now` (`:36-51`). Uma chamada repetida para o mesmo `executionId` pode resetar uma execução existente, inclusive depois de uma fase terminal; não há CAS/guard de criação contra reset.
- `completeCopilotExecution` mapeia qualquer status não listado (`queued`, `running` e **`paused`**) para `current_phase: "RUNNING"` (`:67-76`). Assim, `status='paused'` fica incompatível com `current_phase='RUNNING'`.
- `resumeCopilotExecution` lê execução e steps pelo cliente SSR, mas atualiza somente `{ resume_count, status: "running" }` (`:98-105`); não atualiza `current_phase` para `RUNNING`, não registra transição e não usa uma condição `WHERE status IN ('paused','failed_retryable')`. Também não rejeita explicitamente um registro terminal que chegue ao caminho.
- `supabase/migrations/20270101010000_copilot_react_execution_persistence.sql:11-12` restringe `status`, mas deixa `current_phase TEXT` livre e não cria constraint/status↔fase nem tabela de eventos de transição. Os steps têm `fsm_phase`, mas isso não é um histórico persistido de transições.

O teste `src/services/copilot-execution-persistence.test.ts:77-81` só espera `{resume_count: 3, status: "running"}`; não exige `current_phase: "RUNNING"`, CAS, evento ou reload. O teste de conclusão em `:54-62` até verifica uma escrita intermediária `RUNNING`, mas não prova a linha final persistida nem a consistência status/fase.

**Correção local de baixo risco:** centralizar uma tabela/funcão `status -> phase`, tornar `resume` uma atualização CAS de `status + current_phase` e bloquear terminais; preservar a fase/status original em `start` quando o ID já existe. Persistir um evento de transição (ou um ledger equivalente) na mesma unidade transacional. Adicionar teste que simula `paused/NEEDS_CLARIFICATION`, resume, falha de update e leitura posterior.

### W4-F03 — Envio do chat ainda aceita mensagem sem chave e não rejeita payload divergente

**Severidade sugerida:** P1.  
**Status:** confirmado no código; dedupe real/concurrency não provados.

`sendAiMessageSchema` declara `clientMessageId` opcional em `src/services/ai-conversations.functions.ts:55-64`. Em `sendAiConversationMessage`:

- a busca de duplicata só ocorre se `data.clientMessageId` existe (`:1867-1907`);
- a inserção usa `client_message_id: data.clientMessageId || null` (`:1910-1923`);
- a constraint `supabase/migrations/20270112000001_chat_message_idempotency.sql:5-7` é parcial (`WHERE client_message_id IS NOT NULL`).

Logo, um caller autenticado que omita a chave pode criar várias mensagens, execuções e custos lógicos. O requisito W4 deve exigir a chave no BFF autenticado; o fluxo guest continua separado conforme `SPEC-W4-PERSISTENCE-IDEMPOTENCY.md:16-19`.

Além disso, quando já existe mensagem com a mesma chave, o BFF não compara `message`, attachments ou `replyToId` com o registro original. Depois de `:1900-1905`, o pipeline recebe o novo `data.message` em `:1937-1948`. Assim, a mesma chave pode ser reutilizada com payload diferente e executar/reabrir uma operação sem rejeitar conflito de idempotência.

O caminho positivo do cliente em `src/routes/_store.copilot.tsx:166-200` envia um UUID estável e `:269-275` tenta preservá-lo no retry; isso é um ponto positivo local, mas não protege callers que chamam o BFF diretamente nem payload divergente.

**Correção local de baixo risco:** tornar `clientMessageId` obrigatório no schema autenticado; armazenar um fingerprint canônico do payload; rejeitar chave já existente com payload diferente; em conflito `23505`, reler a mensagem/AI persistida e retornar replay ou erro recuperável com código explícito. Não gerar chave nova no retry.

### W4-F04 — Chat escreve user message, artifact, AI reply e memória em sequência, com estado parcial possível

**Severidade sugerida:** P1/P0 em integridade de histórico.  
**Status:** confirmado no código; rollback/compensação não provados.

`sendAiConversationMessage` realiza writes separados:

1. user message `sending`: `src/services/ai-conversations.functions.ts:1910-1932`;
2. artifact antes da resposta AI: `:1970-2002`;
3. AI message: `:2004-2039`;
4. status da user message: `:2041-2046`;
5. working memory da thread: `:2048-2055`.

Não existe RPC/transaction envolvendo a unidade. O artifact é inserido sem `message_id` (`:1973-1987`), embora a tabela permita associação; se o insert da AI message falhar, o artifact pode ficar órfão. Se o insert do artifact retornar erro depois de um commit incerto/rede perdida, não há dedupe/compensação do artifact. Os updates finais de user status e thread não têm `error` verificado nem `throwOnError`, então podem falhar silenciosamente enquanto a função retorna uma resposta.

O readiness report já exigia exatamente esse gate (`docs/audits/20261007-WAVE-READINESS-W0-W7.md:80`), e o teste atual não chama o handler contra banco nem injeta falha entre os writes. O comportamento de fallback de artifact em `:1991-1997` evita declarar artifact em memória quando o erro é retornado, mas não torna o conjunto atômico.

**Correção local de baixo risco:** escolher uma RPC transacional para user message + AI result + artifact + status/memória, com chave idempotente; ou implementar saga explícita com estados e compensação. Criar a AI message antes de inserir artifact quando a associação for obrigatória, passar `message_id`, verificar todo retorno e só retornar `delivered/completed` após read-after-write. Falha de artifact obrigatório deve deixar a operação `FAILED_RETRYABLE`, sem artifact órfão.

### W4-F05 — Timeout do Copilot não aborta o provider

**Severidade sugerida:** P1.  
**Status:** confirmado no código; provider/custo não provados.

`withCopilotTimeout` em `src/services/ai-conversations.functions.ts:576-585` usa `Promise.race` com timer, mas não cria `AbortController` nem propaga `AbortSignal`. O timeout libera o request e o BFF grava/retenta como falha enquanto a promise do provider pode continuar executando. Em um retry, isso pode gerar duas chamadas externas e custo duplicado. O readiness report registra o mesmo gap em `:82`.

**Correção local de baixo risco:** aceitar `AbortSignal` em todas as chamadas de provider/harvester, abortar no timeout/cancelamento, persistir `FAILED_RETRYABLE`/`CANCELLED` de forma CAS e correlacionar a chamada externa à chave idempotente antes de permitir retry.

### W4-F06 — Reserva de turismo atualiza disponibilidade, ignora erro do espelho e só depois cria booking

**Severidade sugerida:** P0/P1.  
**Status:** confirmado no código/schema; banco concorrente não exercitado.

`src/services/tourism.functions.ts:268-341` lê `tourism_experiences`, verifica assentos em memória e atualiza `seats/available_seats` (`:313-324`). Em seguida tenta inserir `trip_seat_reservations` (`:326-337`) dentro de `try/catch`, mas o client Supabase retorna `{ data, error }` em vez de lançar; o retorno não é capturado. Mesmo se lançasse, o catch apenas registra warning e continua. Depois o booking é inserido separadamente em `tourism_inquiries` (`:344-381`).

Consequências verificáveis por leitura do código:

- falha do espelho pode deixar experiência e booking divergentes;
- falha do booking depois do update de assentos deixa assento reservado sem reserva confirmada;
- não há chave idempotente; cada retry gera novo `voucherCode` com CSPRNG (`:344-348`) e pode criar outra inquiry;
- `trip_seat_reservations` não possui unique parcial por `(experience_id, seat_number)` no schema `supabase/migrations/20260827280000_enterprise_mega_ecosystem_expansion.sql:367-380`.

O caminho `src/services/tourism-operations.functions.ts:123-151` também faz check-then-insert sem lock/constraint, permitindo TOCTOU sob duas reservas concorrentes. O mesmo arquivo, em `:166-205`, lê `is_checked_in` e depois atualiza sem CAS (`is_checked_in=false`) e ignora o erro/row count do update; duas validações concorrentes podem ambas retornar sucesso, ou o retorno pode ser positivo sem update persistido.

**Correção local de baixo risco:** criar RPC transacional por operação de reserva que bloqueie a experiência/seat row, valide capacidade, atualize o agregado e insira mirror + inquiry; adicionar chave idempotente estável e unique parcial para assento ativo; capturar e propagar todo `error`. Para check-in, usar `UPDATE ... WHERE id=? AND is_checked_in=false RETURNING ...` e retornar sucesso somente com uma linha afetada.

### W4-F07 — Ingestão OCR calcula hash, mas não deduplica

**Severidade sugerida:** P1.  
**Status:** confirmado no código/schema; concorrência não provada.

`src/services/travel-canonical-pipeline.functions.ts:40-67` calcula `contentSha256`, mas sempre faz `insert` de nova linha. A tabela `travel_document_ingestions` em `supabase/migrations/20261006120000_canonical_travel_document_pipeline.sql:7-37` declara `content_sha256 TEXT` sem unique constraint por tenant/hash e não há lookup/upsert antes do insert. Assim, reenvio/retry do mesmo conteúdo produz várias ingestões e pode alimentar aplicações duplicadas.

A RPC de voucher posterior possui chave de operação, mas isso não deduplica a fase de ingestão. O relatório oficial já classificava esse ponto como não verificado; no checkout atual a ausência de dedupe continua observável no código.

**Correção local de baixo risco:** adicionar unique `(store_id, content_sha256)` quando o hash for não nulo, ou tabela de ingestão por chave de comando; em conflito reler e retornar a ingestão existente. Testar dois inserts concorrentes e o replay após perda de resposta.

### W4-F08 — Publisher legado não é transacional nem idempotente; publisher Omni não deduplica publicação

**Severidade sugerida:** P1.  
**Status:** confirmado no código; o caminho Omni tem RPC positiva, mas rollout/uso canônico não provados.

O publisher legado `src/services/builder.functions.ts:2625-2720` faz em sequência:

- arquivamento de versões publicadas (`:2654-2659`, sem verificar erro);
- delete de nodes (`:2661-2662`, sem verificar erro);
- insert de nodes (`:2701-2703`);
- update para `published` (`:2705-2713`).

Não há transaction/RPC nem chave de publicação. Falha depois do archive/delete deixa versão parcialmente publicada ou sem nodes. Retry pode repetir efeitos. O readiness report chamou esse caminho de writer alternativo (`:83`).

O caminho Omni em `src/services/omni-builder.functions.ts:19-61,150-245` chama `persist_omni_document_snapshot`; a migration `20261007000000_builder_versioned_omni_snapshots.sql:47-123` bloqueia o documento, agrupa archive/insert/update na função e faz dedupe de **save** quando o snapshot é igual (`:64-73`). Entretanto a RPC não recebe idempotency key e o dedupe não se aplica quando `p_publish=true`; duas publicações repetidas geram novas versões publicadas. O teste `src/services/omni-builder.functions.test.ts:28-90` é textual e não prova versão no banco/retry.

**Correção local de baixo risco:** selecionar uma única writer canônica; desabilitar/encaminhar o publisher legado para a RPC. Adicionar `publish_idempotency_key`/fingerprint ao contrato de publicação, dedupe explícito de replay e fault-injection; manter lock por documento e somente retornar `published` após read-after-write.

## 4. Pontos positivos presentes, mas não promovidos a “fechados”

### Voucher documental atômico

`supabase/migrations/20270119000000_p0_atomic_voucher_apply.sql:9-19,75-101,103-159,215-353` tem bons elementos locais:

- tabela `travel_voucher_apply_operations` com `UNIQUE(store_id, idempotency_key)`;
- `pg_advisory_xact_lock` por loja/chave;
- lock da ingestão e da viagem com `FOR UPDATE`;
- validação de tenant/ator antes dos writes;
- todos os child writes e atualização de `extraction_status='applied'` dentro da mesma função PL/pgSQL;
- resultado salvo para replay.

`src/services/travel-lifecycle.functions.ts:966-1015` chama a RPC e `src/services/travel-canonical-pipeline.functions.ts:255-263` fornece chave determinística `ocr-trip:${ingestionId}:${tripId}`. `src/services/travel-voucher-atomic-apply.test.ts` e `travel-w12-integrity.test.ts` passam localmente.

**Classificação correta:** correção/contrato presente no código e migration; **integração não verificada**. Faltam replay from-zero, cross-tenant real, duas chamadas concorrentes, falha injetada no segundo/terceiro child write, read-after-write e confirmação de `extraction_status`/filhos/voucher. Não assumir aplicação remota nem produção.

### Idempotency guard genérico

`src/lib/idempotency/idempotency-guard.ts` possui lock em memória e testes de repetição/concurrency. Não foi tratado como mecanismo W4 do chat porque não há caller de produção fora dos próprios testes (o `rg` encontrou uso real apenas em `travel-pipeline-e2e.test.ts`). Cache em memória não seria suficiente para múltiplos workers/restart; a autoridade precisa ser banco/outbox/RPC. Os 5 testes desse guard não constituem prova distribuída.

## 5. Testes executados

Comando executado sem modificar arquivos:

```text
npx vitest run \
  src/services/copilot-fsm-and-resilience.test.ts \
  src/services/copilot-fsm.test.ts \
  src/services/copilot-execution-persistence.test.ts \
  src/lib/idempotency/idempotency-guard.test.ts \
  src/services/travel-voucher-atomic-apply.test.ts \
  src/services/travel-w12-integrity.test.ts \
  src/services/omni-builder.functions.test.ts
```

Resultado: **7 test files passed, 55 tests passed**. Houve apenas warnings do gateway sem chaves e uma falha simulada do Overpass esperada pelo teste.

Limitações observadas nos próprios testes:

- `copilot-execution-persistence.test.ts` usa um client fake que registra payloads; não executa SQL/Postgres, constraints, RLS, affected rows ou rollback.
- `copilot-fsm-and-resilience.test.ts` exercita a FSM em memória; não persiste eventos nem faz reload.
- `travel-voucher-atomic-apply.test.ts`, `travel-w12-integrity.test.ts` e `omni-builder.functions.test.ts` verificam strings/presença de RPC, migration e chamadas; não executam a RPC.
- `idempotency-guard.test.ts` valida um `Map` no mesmo processo; não cobre workers, restart, banco ou provider.
- Não há, nesses arquivos, POST concorrente real, fault injection entre writes, provider-call counter, ledger de custo, resposta HTTP perdida, browser reload ou JWT A/B.

## 6. Blockers para fechar W4

1. **Banco:** ausência de Postgres/Supabase runner e de ambiente autorizado impede replay das migrations desde zero, segunda aplicação, catálogo, constraints, RLS/grants e RPC execution.
2. **Concorrência/falha:** sem execução real não há prova de rollback/compensação, `23505` concorrente, lock de assento, retry após timeout ou resposta perdida.
3. **Identidade/RLS:** W4 depende de W2/W3, mas não foram exercitados JWT/roles/tenants nos fluxos de execução, voucher, builder e turismo.
4. **Browser/reload:** não foi provado `send -> reload -> replay`, `create -> save -> reload -> publish`, nem recuperação visual de estado `sending/paused/failed`.
5. **Provider/custo:** sem provider stub instrumentado ou ledger, não é possível afirmar chamada única, abort efetivo ou cobrança única.
6. **CI/release:** nenhum check de CI/deploy/smoke foi executado neste subagent; não transferir o PASS local para CI/produção.
7. **Baseline:** worktree suja e divergência entre documentos históricos e SHA atual impedem chamar este estado de candidato de release congelado.

## 7. Safe fixes recomendados ao agente principal

1. **FSM:** remover atalhos para `COMPLETED`; tornar terminal imutável; centralizar status↔fase; corrigir `resume` para atualizar `status + current_phase` com CAS e evento; impedir `start` de resetar execução existente.
2. **Chat idempotente:** exigir `clientMessageId` para o BFF autenticado, rejeitar payload divergente para a mesma chave e reler após `23505`; manter guest fora desta microfase.
3. **Chat atomicidade:** criar RPC/saga idempotente para user message, AI response, artifact e memória; associar `artifact.message_id`; verificar todos os erros e não retornar `delivered` antes da persistência confirmada.
4. **Timeout/retry:** propagar `AbortSignal`, cancelar provider no timeout, persistir estado recuperável e amarrar retry a uma chave/ledger de custo.
5. **Turismo:** trocar seat check/update/mirror/inquiry por RPC transacional com lock e unique parcial; chave de comando determinística; erro de qualquer child write deve abortar ou compensar. Fazer check-in com CAS/`RETURNING`.
6. **OCR:** unique tenant+hash e replay de ingestão existente.
7. **Builder:** encaminhar writers legados para a RPC Omni; adicionar chave de publicação e dedupe no `p_publish=true`; testar falha em cada write e reload.
8. **Gates reais:** em Postgres descartável, aplicar toda a árvore duas vezes; exercitar JWT/RLS A/B, duas requisições concorrentes, erro injetado, resposta perdida, provider stub, reload/browser e, somente depois, rodar CI no mesmo SHA. Deploy/smoke deve ser evidência separada.

## 8. Conclusão

A frente W4 tem avanço local real, mas a combinação de **FSM permissiva**, **status/fase divergentes**, **chat sem chave obrigatória e sem transaction/saga**, **booking de turismo best-effort**, **OCR sem dedupe** e **writers alternativos de builder** impede a promoção. O voucher atômico é o melhor avanço e deve ser preservado, porém ainda é apenas código/migration presente até ser executado em Postgres com concorrência, rollback, RLS e read-after-write.

**Não declarar W4 concluída, nem inferir banco/provider/browser/CI/deploy a partir dos 55 testes locais.**
