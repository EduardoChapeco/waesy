# Inventário de Remediação — W6 Chat, SSE, Streaming, Retry e Artifacts

**Data da auditoria:** 2026-10-07  
**Repositório:** `EduardoChapeco/waesy`  
**Branch/HEAD auditado:** `audit/full-remediation-20261007` / `fc8f9fc3`  
**Base declarada na spec:** `origin/main` / `919c8688`  
**Escopo:** chat/Copilot, endpoint SSE, streaming, timeout/cancelamento, retry/idempotência, persistência e renderização de artifacts.  
**Regra aplicada:** auditoria somente leitura de código, testes, migrations, histórico e documentação; nenhum arquivo de código foi editado, staged, commitado, pushed ou deployado.

## 1. Veredito executivo

A frente permanece **aberta e não pronta para fechamento**. Há avanço histórico no branch atual: `70cd4fef` introduziu hardening de retries e `8e50750b` endureceu o fluxo Copilot; o relatório W5 registra como confirmado no código atual a remoção do import direto do pipeline pelo drawer e a presença de `clientMessageId`/mecanismos defensivos. Isso não prova a jornada end-to-end. O estado atual ainda contém dois contratos de execução (drawer/fullscreen síncronos e endpoint SSE), sem consumidor SSE localizado, e não há prova no SHA atual de provider real, abort propagado, persistência atômica de mensagem+artifact, custo/quota idempotentes, RLS/tenant real, browser/reload ou deploy.

A frente corresponde aos findings históricos `CHAT-F01`…`CHAT-F15` do bloco `chat-stream` do masterplan (linhas 1251–1509). Eles devem permanecer classificados individualmente; presença de código, migration, mock, commit ou typecheck não os transforma em corrigidos/verificados.

## 2. Preflight e reconciliação Git

- `git status --short --branch` mostrou branch limpa quanto a código, mas com artefatos documentais não rastreados: `docs/audits/LEDGER-20261007-FULL-REMEDIATION.md`, `docs/audits/full-remediation-inventory/` e a spec ativa. Esses paths são documentação da execução, não evidência de comportamento.
- Histórico relevante no HEAD: `70cd4fef fix(chat): make Copilot retries idempotent`, `8e50750b fix(chat): harden Copilot end-to-end flow`, `67a056a3 docs(audit): close W5 evidence`, `3d441445 chore(types): generate Supabase database contract`; HEAD atual também contém commits de travel/voucher posteriores. A comparação foi histórica; nenhum commit paralelo foi incorporado automaticamente.
- Branches remotas relevantes incluem `origin/main` (`919c8688`), `origin/audit/recursive-p0-remediation` (`c1f9615b`), `origin/chore/recover-waesy-task-2026-10-06` (`8e1b2c49`) e branches de produto. Não há autorização para cherry-pick/merge. A existência de mudanças locais históricas descritas no masterplan (13 paths no worktree de recuperação) não é prova de que estejam no HEAD deste worktree.
- A spec `SPEC-20261007-FULL-REMEDIATION-EXECUTION.md` exige baseline, paths permitidos, reprodução, teste negativo e critério mensurável antes de mutação; exige separar teste mockado, typecheck/build, Postgres/RLS, browser, CI e produção. Nenhuma evidência de integração/provider/browser/produção foi encontrada nesta auditoria.

## 3. Mapa real do fluxo atual

### Entradas e boundary

- `src/components/chat/waesy-copilot-drawer.tsx`: o avanço W5 removeu o import/chamada direta de `executeAiCopilotPipeline` observado na baseline histórica. O drawer usa funções de servidor/imports de contrato atuais, mas é necessário confirmar bundle produzido e rede real para provar que nenhum módulo server-only ou chave é empacotado.
- `src/routes/_store.copilot.tsx`: rota fullscreen mantém handlers de envio, retry, cancelamento, criação/exclusão e pin/archive; linhas 370–386 passam esses callbacks a `AIChatShell`. O contrato de callbacks existe, mas a cobertura de rota/browser não foi executada.
- `src/routes/api.ai.stream.ts:40–193`: endpoint SSE valida payload, exige identidade/rate limit nas linhas iniciais, cria `ReadableStream`, chama `executeAiCoreGatewayStream`, emite `status`, `delta`, `done` e `error`. O `cancel()` nas linhas 185–187 é apenas comentário (“gateway mantém seus timeouts”); não encaminha AbortSignal nem cancela reader/provider.
- `src/lib/ai/sse.ts:1–18`: só define tipos, framing `event/data` e headers. Não há parser de cliente, acumulador de frames, reconexão, last-event-id ou state machine neste arquivo.
- Busca textual no código atual não localizou UI Copilot consumindo `/api/ai/stream`; portanto o SSE canônico permanece órfão para a jornada visual, salvo prova posterior por browser/network.

### Gateway, retry e artifacts

- `src/services/ai-core-gateway.functions.ts:262–263` possui `AbortController` e timeout no caminho síncrono; `:1013–1071` implementa streaming por provider e fallback. Isso prova intenção de timeout/fallback no gateway, não que o abort da request HTTP/SSE o alcance.
- O streaming monta URL Gemini com `key=${activeKey.rawKey}` em `:1036`; OpenAI-compatible usa headers. É necessário prova negativa de logs, cache, traces, erro e URL para concluir ausência de segredo.
- `src/services/autonomous-copilot-orchestrator.ts:329–350` implementa `withExponentialRetry`; nos ramos de artifact, `:641–668` insere `experience_documents` e captura falha como não bloqueante. O artifact é depois montado em `:674–684`, inclusive com `documentId` opcional. Isso permite resposta “completa” mesmo quando a persistência falha e exige reconciliação explícita.
- `src/services/ai-conversations.functions.ts:1776–2000` faz lookup da thread, procura `clientMessageId`, insere mensagem, executa pipeline e insere resposta; há defesa contra duplicata (`:1803–1820`, `:1861–1864`), mas a prova de concorrência, transação/RPC, contagem de débito e recuperação após falha entre writes não está presente.
- `src/services/ai-conversations.functions.ts:2009–2050` expõe `saveAiChatArtifact` e confirma erro/registro retornado no caminho explícito; ainda precisa provar que a loja usada é a da thread, que o chamador não pode deslocar o tenant e que a mensagem entregue/artifact são atômicos.
- `src/services/copilot-execution-persistence.ts` e migrations de chat/artifacts dão contratos de persistência, porém migration/DTO/código não provam aplicação no banco representativo, RLS por JWT, reload nem sobrevivência a falha parcial.

## 4. Findings classificados

| ID | Estado atual e evidência | Nível de evidência / risco |
|---|---|---|
| `CHAT-F01` | **Histórico parcialmente mitigado no código:** o relatório W5 confirma remoção do import direto no drawer. A baseline/masterplan registrava `waesy-copilot-drawer.tsx:14–17,95–103` chamando export plain com `service_role` por `getServerClient`. O caminho atual ainda requer inspeção de bundle/network e prova de boundary no browser. | Confirmado histórico; mitigação estática atual. Bundle, browser e segredo em produção **não verificados**. P0 de boundary/tenant se regressar. |
| `CHAT-F02` | O masterplan documenta autorização por thread baseada em membro/loja, sem fechamento completo de papel/atribuição. O código atual em `ai-conversations.functions.ts:1613–1631` monta cláusulas por `customer_id`, `recipient_profile_id`, `assigned_to_profile_id` e papéis administrativos; isso é intenção, não prova contra usuário A/B, cross-store e role intermediário com RLS real. | Defeito histórico; autorização real **não verificada**. Risco de leitura cruzada. |
| `CHAT-F03` | `clientMessageId` é procurado antes de executar (`ai-conversations.functions.ts:1803–1820`) e há tratamento de conflito `23505` (`:1861–1864`). Ainda faltam teste concorrente real, mesma chave em retry após resposta perdida, unicidade efetiva aplicada e reconciliação de quota/provider. | Defesa no código confirmada; idempotência end-to-end **não verificada**. |
| `CHAT-F04` | O shell possui `onRetryMessage`/estado de falha e o serviço mapeia fases failed para `status: failed` em `:1973–1996`; não foi provado que todo erro retryable chega à UI como retryable, nem que retry conserva chave e não cobra novamente. | Código/testes unitários existem; contrato UI/provider/contabilidade **não verificado**. |
| `CHAT-F05` | `api.ai.stream.ts:40–193` e `lib/ai/sse.ts:1–18` existem, mas não há consumidor identificado nas superfícies Copilot. Falta parser client-side e integração shell→SSE. | Confirmado estaticamente (SSE sem consumidor encontrado); browser/network **não verificado**. |
| `CHAT-F06` | Endpoint `ReadableStream.cancel()` é no-op (`api.ai.stream.ts:185–187`). Gateway tem timeout/AbortController interno (`ai-core-gateway.functions.ts:262–263`), mas não recebe o signal da Request no streaming. Ferramentas/orquestrador podem continuar após abandono. | Gap confirmado no caminho SSE; abort real/provider e liberação de recursos **não verificados**. P0 operacional/custo. |
| `CHAT-F07` | O masterplan registra fallback de usuário autenticado para thread guest e perda de persistência. A rota atual possui caminhos guest/autenticado distintos; não há teste browser/reload que prove que falha de criação/lookup nunca degrada silenciosamente para guest. | Histórico com risco ainda aberto; reprodução real **não verificada**. |
| `CHAT-F08` | No orquestrador, falha de insert de `experience_documents` é engolida (`autonomous-copilot-orchestrator.ts:643–668`) e artifact é montado sem `documentId` (`:674–684`). Em conversação, writes de mensagem/artifact estão separados. Pode haver resposta entregue com artifact não persistido. | Contradição/risco confirmado por código; atomicidade e renderer/reload **não verificadas**. |
| `CHAT-F09` | `saveAiChatArtifact` existe (`ai-conversations.functions.ts:2009–2050`) e o masterplan registra uso da loja ativa da identidade em vez da store da thread. A função precisa ser auditada linha a linha contra `thread.store_id`, owner e `data.storeId`; nenhum teste A/B/cross-store foi executado. | Hipótese de isolamento com evidência histórica; integração/RLS **não verificada**. |
| `CHAT-F10` | Há caminho guest em `_store.copilot.tsx` e o masterplan registra ausência de identidade/rate-limit/tollbooth, enquanto SSE exige controles (`api.ai.stream.ts:54–64`). Não foi obtida prova de que guest não alcança mineração/provider nem de rate limit efetivo sob repetição. | Risco de abuso/custo **não verificado em runtime**; tratar como aberto até teste negativo provider/quota. |
| `CHAT-F11` | `handleStructuredAction` em `_store.copilot.tsx:337–344` implementa `open_place`, mas para outros casos apenas informa que não há handler. O masterplan aponta divergência drawer/fullscreen; não houve browser test de cada action payload. | Divergência de handler confirmada estaticamente para fallback; UX completa **não verificada**. |
| `CHAT-F12` | O masterplan aponta race/thread switch e limpeza incompleta. A rota mantém `messages` e `activeThreadId` em estado local e `setMessages` ocorre em handlers; sem teste de troca rápida, thread vazia, reload e resposta tardia, a correção não pode ser fechada. | Hipótese reproduzível pendente; concorrência/browser **não verificados**. |
| `CHAT-F13` | O masterplan identifica campos sintéticos de Places (`open`/rating) apresentados como dados reais no orquestrador/DTO. Código de fallback/harvester deve ser revisado; nenhum provider real/fixture de origem foi reconciliado nesta sessão. | Proveniência suspeita/aberta; dado real vs sintético **não verificado**. |
| `CHAT-F14` | `copilot_activity_steps`/telemetria para execuções sem `store_id` é apontado com policy wildcard `store_id IS NULL`. Não houve dump/execução RLS nesta auditoria nem prova de consumidor UI; impacto de leitura é dependente de endpoint, mas a policy/risco histórico permanece aberto. | Policy histórica confirmada pelo masterplan; exploração A/B e impacto observável **não verificados**. |
| `CHAT-F15` | Estado atual de `_store.copilot.tsx:346–366` passa `onTogglePinThread` e `onToggleArchiveThread` ao shell (`:380–381`) e chama `toggleAiThreadPinned`; o masterplan/base dizia que não eram conectados. Isso é possível avanço após histórico, mas exige teste de persistência/reload e archive real; não declarar fechado por callback presente. | Código atual confirma wiring; persistência, UI e autorização **não verificadas**. |

## 5. Testes e gates observados

- `src/lib/ai/sse.test.ts:4–15` cobre apenas framing e headers; não cobre parser, fragmentação de chunks, múltiplos eventos, erro, done, cancel, timeout ou reconexão.
- Testes de FSM/persistência/chat existentes cobrem doubles e lógica isolada. O relatório W5 registra que a tentativa direcionada anterior não chegou a iniciar Vitest por `ERR_PNPM_IGNORED_BUILDS`; essa é evidência histórica, não resultado no SHA atual.
- Não foi encontrado teste que simultaneamente faça POST HTTP SSE → provider stub lento/429/5xx → abort/disconnect → persistência → retry/reload. Também não há prova de Supabase efêmero, JWT A/B, RLS, quota/custo ou browser Playwright para esta frente.
- Typecheck/build/CI/deploy não foram promovidos como evidência de comportamento. O masterplan declara checks históricos de PR/deploy inconclusivos; não há smoke público autorizado nesta auditoria.

## 6. Dependências e riscos de mistura

1. **W2/W3/W4 precedem fechamento:** identidade/tenant, RLS, tipos reais, FSM, transação e idempotência são dependências de W6. Não corrigir streaming isoladamente e marcar chat íntegro enquanto writes, quota ou autorização continuam divergentes.
2. **W5 é precedente direto:** escolher um runtime canônico (server function ou SSE) antes de implementar parser/UX. Integrar SSE ao drawer sem decidir contrato pode criar terceiro caminho.
3. **Branches paralelas:** não incorporar `origin/audit/recursive-p0-remediation`, `origin/chore/recover-waesy-task-2026-10-06` ou branches de produto sem diff por path, ownership e replay de baseline. Commits `70cd4fef`/`8e50750b` são histórico local e não substituem testes no HEAD.
4. **Segurança/custo:** service-role, guest provider, URLs com chave, retry e circuit breaker devem ser validados juntos; qualquer sucesso visual sem linha/ID/error/count e leitura posterior é falso positivo.
5. **Artifacts:** `experience_documents`, `chat_artifacts`, `chat_messages` e `copilot_executions` têm contratos e ownership distintos; não presumir que um artifact em JSON ou `previewUrl` seja sobrevivente/público após reload.

## 7. Microfases atômicas propostas e gates

### W6.0 — Preflight e replay da baseline
**Paths:** somente ledger/este relatório e comandos Git.  
**Gate:** registrar SHA/base/status, diffs dos commits `70cd4fef`, `8e50750b`, `67a056a3`, branches remotas, 15 findings, reproduções e owners. Nenhum cherry-pick automático.

### W6.1 — Escolher e fechar boundary canônico
**Paths:** drawer, `_store.copilot.tsx`, route/API, server functions e testes de contrato.  
**Gate:** uma única chamada canônica; bundle não contém server-role; drawer/fullscreen compartilham auth, thread/client key, estados e erro. Teste negativo: request sem identidade/tenant não inicia provider/quota/write.

### W6.2 — Autorização por objeto e guest tollbooth
**Paths:** BFF/access helpers, schemas, guest handler, migrations/policies e testes RLS.  
**Gate:** matriz owner/participant/assigned/supervisor/admin/cross-store/anon; JWT A não lê thread/artifact/steps de B; guest rate-limit/quota explícitos; zero provider/write em negativo.

### W6.3 — Contrato provider/stream/parser
**Paths:** `api.ai.stream.ts`, `src/lib/ai/sse.ts`, gateway/adapters e testes.  
**Gate:** frames `status/delta/structured/done/error` parseiam com chunks fragmentados; conteúdo vazio e provider errado falham honestamente; segredo ausente de URL/log/erro; provider/model/prompt_version correlacionados.

### W6.4 — Abort, timeout, retry e circuit breaker
**Paths:** route, gateway, ferramentas/orquestrador, shell e testes de fault injection.  
**Gate:** `Request.signal` chega ao reader/provider; disconnect libera recursos; timeout efetivo; 429/5xx têm retry seletivo limitado; erro não retryable não repete; teste prova que retry remove/recupera operação sem duplicar provider/custo.

### W6.5 — Idempotência, quota e persistência atômica
**Paths:** conversation BFF, persistence, schema/RPC/migration se necessária, quota e tests.  
**Gate:** dois POST concorrentes com mesma `clientMessageId` geram uma execução/resposta/débito; falha entre writes é recuperável; `chat_messages`, `chat_artifacts` e execução têm status honesto; error/count/ID e leitura posterior confirmados.

### W6.6 — Artifact provenance e UX/reload
**Paths:** artifact DTO/renderers, shell/route, save/load functions e testes browser.  
**Gate:** artifact só aparece como persistido com ID/linha confirmada; store é derivada da thread; create→save→reload mantém ownership e preview; falha de save aparece como erro/retry, nunca artifact fantasma; pin/archive e thread switch persistem.

### W6.7 — Observabilidade e isolamento de telemetry
**Paths:** activity-step persistence/policies, telemetry functions e testes RLS.  
**Gate:** owner/tenant/thread/client key/provider/model/quota/cost/status/latency/cancel são correlacionados; outsider não lê steps sem store; logs não carregam prompt/secret; cancel/retry/replay são auditáveis.

### W6.8 — Integração final independente
**Paths:** sem novo comportamento fora dos gates anteriores.  
**Gate:** Postgres/Supabase efêmero desde zero, RLS JWT A/B, provider stub com abort/429/5xx, Playwright drawer+fullscreen+SSE+retry+reload, typecheck/build/design lint e CI no mesmo SHA. Produção/deploy permanecem **não verificados** sem autorização e smoke confirmado.

## 8. Conclusão e status

**Status recomendado:** `open / remediation in progress`; nenhum dos 15 findings deve ser marcado globalmente como corrigido. `CHAT-F01` e `CHAT-F15` têm sinais de mitigação/wiring no código atual, mas ainda carecem do nível de prova aplicável. `CHAT-F03` tem defesa de `clientMessageId`, porém sem concorrência/provider/quota. `CHAT-F05` e `CHAT-F06` são os blockers técnicos mais claros da frente SSE. `CHAT-F08` é o risco mais direto de artifact fantasma/persistência parcial. Segurança, guest e telemetry (`F02`, `F09`, `F10`, `F14`) dependem de integração/RLS real.

Nenhuma conclusão de produção, deploy, provider real, RLS real ou browser deve ser inferida deste inventário.
