# Inventário de Remediação — W5 Copilot, IA, prompts, quota, gateway e telemetria

**Data da auditoria:** 2026-10-07  
**Repositório:** `EduardoChapeco/waesy`  
**Branch auditada:** `audit/full-remediation-20261007`  
**HEAD:** `fc8f9fc3` (`audit: make voucher document apply atomic`)  
**Base declarada pela spec:** R6 `fc8f9fc3`; `origin/main` `919c8688`  
**Escopo:** W5 do masterplan e superfícies diretamente necessárias para Copilot/chat: IA, prompts, quota, gateway, SSE, persistência de execução e telemetria.  
**Regra:** auditoria somente leitura; nenhum arquivo de código, migration ou teste foi editado, commitado ou aplicado.

## 1. Veredito executivo

**W5 não está fechada.** Há progresso local verificável em relação ao snapshot histórico: o drawer agora usa `executeCopilotDrawerMessage` como server function; o retry passou a carregar `clientMessageId` estável em parte do fluxo; `sendAiConversationMessage` contém lookup/reuso defensivo para mensagens repetidas; e existe uma rota SSE com rejeição de resposta vazia e metadados de provider/model. Isso é **confirmado no código atual**, mas não é prova de provider real, RLS real, browser, cancelamento upstream ou persistência transacional.

Persistem riscos de alto impacto: o `/copilot` continua usando o caminho síncrono e não há consumidor SSE; timeout/cancelamento não propagam `AbortSignal` ao provider; guest e fallback de erro precisam de prova de isolamento e não persistência; writes de mensagem, artifact, execução, memória, quota/custo e telemetria continuam distribuídos; a quota existente faz débito best-effort em múltiplos writes; o gateway/pool/prompt governance aparece no schema, mas não há evidência de um único caminho canônico, reserva atômica de quota/custo, fallback auditado ou integração com o fluxo W5; e telemetria tem políticas/linhas cujo escopo depende de `user_id`/`store_id` e ainda carece de teste com dois tenants.

**Classificação global:** remediação em andamento; nenhum finding pode ser marcado como `corrigido e verificado` sem reprodução baseline, teste negativo, integração real e, para o caminho de usuário, browser/reload. A tentativa histórica de executar testes relatada no masterplan falhou antes do Vitest por `ERR_PNPM_IGNORED_BUILDS`; isso é evidência histórica, não resultado deste SHA.

## 2. Estado Git e risco de mistura

- Worktree atual contém artefatos não rastreados/documentais: `docs/audits/LEDGER-20261007-FULL-REMEDIATION.md`, `docs/audits/full-remediation-inventory/` e a spec ativa. Não há diff de código reportado por `git status` nesta branch.
- Commits W5 relevantes no histórico local: `8e50750b` (hardening Copilot E2E: drawer, route, BFF, shell, access test), `70cd4fef` (retry/idempotência), `3d441445` (tipos Supabase), `67a056a3` (fechamento documental W5). O HEAD atual `fc8f9fc3` é de outra frente P0 de viagem e não prova W5.
- Branches remotas paralelas (`origin/audit/recursive-p0-remediation`, `origin/chore/recover-waesy-task-2026-10-06`, `origin/feat/waesy-canonical-travel-evolution`, etc.) não foram incorporadas. Não fazer cherry-pick/merge sem comparação de paths, ownership e base; o masterplan registra worktrees/alterações locais históricas e risco de misturar código de recuperação.
- `docs/specs/SPEC-W5-COPILOT-CHAT-E2E.md` é evidência de intenção e de progresso documental. Ela própria registra que browser E2E, provider real, POST guest real, SSE/cancelamento live e Supabase/RLS de dois usuários permanecem abertos. Não promover essa spec a prova de integração.

## 3. Mapa canônico observado

| Camada | Estado observado | Evidência | Nível |
|---|---|---|---|
| Drawer global | Importa e chama `executeCopilotDrawerMessage`, não `executeAiCopilotPipeline` diretamente | `src/components/chat/waesy-copilot-drawer.tsx:14,95`; `src/services/ai-conversations.functions.ts:2179` | Confirmado no código atual |
| Fullscreen `/copilot` | Envia por `sendAiConversationMessage`; guest usa `executeGuestCopilotMessage` | `src/routes/_store.copilot.tsx:14,188,233`; `src/services/ai-conversations.functions.ts:1776,2159` | Confirmado no código atual |
| SSE | Rota e encoder existem; shell não foi encontrado consumindo `/api/ai/stream` | `src/routes/api.ai.stream.ts:40-193`; `src/lib/ai/sse.ts:1-18`; busca por consumer | Confirmado no código atual |
| Pipeline/provider | `executeAiCopilotPipeline` continua export async interno chamado por server functions; gateway e tools são caminhos distintos a reconciliar | `src/services/ai-conversations.functions.ts:594`; `src/services/ai-core-gateway.functions.ts` | Parcial; integração real não verificada |
| Thread auth | Helper BFF verifica campos de thread, mas precisa ser comparado com role/assignment e RLS efetivamente aplicado | `src/services/ai-conversations.functions.ts:88-99`; `supabase/migrations/20261006000006_wave2_conversation_isolation.sql:41-70` | Código confirmado; RLS/runtime não verificado |
| Idempotência | Schema possui unique `(thread_id, client_message_id)`; BFF tem lookup e tratamento de conflito no SHA atual | `supabase/migrations/20270112000000_chat_message_idempotency.sql:1-7`; `src/services/ai-conversations.functions.ts:1803-1870` | Código confirmado; replay/provider/cobrança não verificado |
| Quota | `checkCivilTokenQuota` lê disponibilidade; `consumeCivilTokens` atualiza carteira, quota e audit log em writes separados | `src/services/token-quota.functions.ts:100-128,133-237` | Confirmado no código; atomicidade/concorrência não verificada |
| Prompt governance | Migrations criam prompts/versionamento, variáveis/provider recomendado e policies | `supabase/migrations/20261219000000_ai_master_prompts_governance.sql:1-113` | Schema confirmado; uso pelo pipeline não verificado |
| Gateway/pools | Migrations registram pools/preferências e telemetry; código de roteamento/fallback precisa de prova end-to-end | `supabase/migrations/20260826040000_api_orchestrator_pools_and_master_prompts.sql:1-113`; `supabase/migrations/20261206000000_v142_ai_core_gateway_pools_and_telemetry.sql:1-140`; `src/services/ai-core-gateway.functions.ts` | Contrato/schema confirmado; runtime/provider não verificado |
| Telemetria | Há tabelas de execution steps, logs e `audit_logs`; políticas usam identidade/store; não há teste real multi-tenant/reload | `supabase/migrations/20270101000000_copilot_activity_steps_telemetry.sql:1-81`; `20270101010000...:1-81`; `src/services/telemetry.functions.ts` | Parcial |

## 4. Findings W5

Severidades abaixo preservam a classificação histórica do masterplan; não foram recalibradas silenciosamente.

### W5-F01 — Boundary do drawer
**Estado:** **histórico corrigido no código atual; não verificado em build/browser.** O finding histórico `CHAT-F01` apontava import direto de `executeAiCopilotPipeline` em `waesy-copilot-drawer.tsx:14-17,95-103`. No SHA atual a chamada é `executeCopilotDrawerMessage` (`waesy-copilot-drawer.tsx:14,95`; server function `ai-conversations.functions.ts:2179`). Ainda falta gate que inspecione bundle e rede, prove ausência de `SUPABASE_SERVICE_ROLE_KEY` e confirme que o server boundary não é empacotado. Não declarar corrigido em produção.

### W5-F02 — Autorização por objeto/tenant/role
**Estado:** **risco confirmado no desenho de código; runtime/RLS não verificado.** `assertAiThreadAccess` (`src/services/ai-conversations.functions.ts:88-99`) deve ser reconciliado linha a linha com a policy de `20261006000006_wave2_conversation_isolation.sql:41-70`; o masterplan registra que membership de loja pode ser aceito sem papel/atribuição explícitos. Todas as operações críticas precisam carregar `assigned_to_profile_id`, distinguir participante, agente atribuído, supervisor e admin, e usar os mesmos predicados no BFF e no banco. O `service_role` em `src/lib/supabase.ts:140-154` bypassa RLS; portanto teste unitário do helper não prova isolamento. Gate: A/B, cross-store, seller/support não atribuído, leitura/envio/pin/delete/artifact, JWT/RLS real.

### W5-F03 — Retry, dedupe, provider e cobrança
**Estado:** **parcialmente corrigido no código; não verificado.** O schema atual usa `20270112000000_chat_message_idempotency.sql:1-7`; o BFF faz lookup por `client_message_id` e trata conflito em `ai-conversations.functions.ts:1803-1870`. Isso supera a evidência histórica de novo UUID a cada retry, mas não prova que dois POSTs concorrentes gerem uma única execução, resposta, chamada ao gateway, quota/debito e telemetria. Gate: perder resposta HTTP após cada write, replay simultâneo, mesmo key, falha de constraint, leitura pós-retry; contar inserts/provider/custo e reler após reload.

### W5-F04 — Estado honesto de falha e retry
**Estado:** **hipótese/risco confirmado estaticamente; não verificado no browser atual.** O histórico encontrou usuário marcado `delivered` quando execução era `FAILED_RETRYABLE` (`_store.copilot.tsx:181-205`; shell `:515-543`). O código atual tem `stableClientMessageId` em `:271` e propagação de status precisa ser executada sob provider timeout/429/error. Gate: falha retryable deve marcar o item de origem como falho, exibir retry acionável, preservar a mesma key e não duplicar provider/custo; sucesso só após persistência confirmada.

### W5-F05 — SSE órfão / dois pipelines
**Estado:** **confirmado no código atual.** `api.ai.stream.ts:40-193` produz frames, `sse.ts:1-18` só codifica/headers, mas a rota fullscreen usa `sendAiConversationMessage` e o drawer usa server function síncrona. Não foi localizado parser/EventSource/fetch do endpoint no shell. A existência de `done` com `provider/model` e erro `EMPTY_AI_RESPONSE` é contrato, não consumo real. Escolher uma única arquitetura: integrar ambos os shells a SSE com estado incremental e persistência final, ou retirar/anular o endpoint. Gate de múltiplos frames, delta/structured/done/error, reload e dedupe.

### W5-F06 — Timeout/cancelamento não chega ao provider
**Estado:** **confirmado estaticamente; não verificado em provider real.** `withCopilotTimeout` (histórico `ai-conversations.functions.ts:540-547`) usa corrida de promises; `handleCancelActiveRun` em `_store.copilot.tsx:252-257` altera UI/ref. Na rota SSE, `request.signal` impede novos eventos, mas o comentário em `api.ai.stream.ts:185-187` admite que o gateway mantém timeouts; `ai-core-gateway.functions.ts:958-985` precisa receber `signal` no fetch/reader. Gate com provider bloqueado, AbortController, reader.cancel, timer cleanup e nenhuma tool/mutação após cancelamento; persistir `CANCELLED` de forma idempotente.

### W5-F07 — Fallback guest mascarando falha de persistência
**Estado:** **risco confirmado no fluxo; cenário real não verificado.** O histórico identifica o loader de `_store.copilot.tsx:40-69,94-105` convertendo falha de sessão/listagem/criação em `DEFAULT_GUEST_THREAD_ID`, enquanto `:168-235` pode chamar `executeGuestCopilotMessage`. Para identidade autenticada, falha de DB/RLS não pode parecer “nova conversa guest”. Gate: derrubar list/create, mostrar erro/retry, zero chamada guest e zero provider pago; guest explícito deve ser distinguido e ter rate-limit/tollbooth.

### W5-F08 — Artifact fantasma/estado terminal prematuro
**Estado:** **risco confirmado estaticamente; correção transacional não verificada.** A persistência de artifact e mensagem ocorre em writes separados (`ai-conversations.functions.ts:1805-1857` e `:1940-1975`); a resposta não pode anunciar artifact entregue se a linha falhar. Mesmo com defensive wrapper atual, é necessário testar `artifactError`, resposta AI, memória e reload. Gate: fault injection em artifact/DB/RLS; resposta deve ser retryable sem payload fantasma ou usar RPC/saga idempotente com `message_id` vinculado.

### W5-F09 — Loja do artifact versus loja da thread
**Estado:** **não verificado; manter aberto.** O histórico reporta `saveAiChatArtifact` usando loja ativa da identidade, não necessariamente `thread.store_id` (`ai-conversations.functions.ts` em torno de `:2019-2025` e sequência posterior). A leitura atual confirma que a função carrega a thread e chama `assertAiThreadAccess`, mas é necessário reconciliar cada `store_id` escrito com a thread e owner, inclusive thread sem loja. Gate: loja A/loja B, artifact de thread A usando sessão com contexto B, reload e RLS.

### W5-F10 — Guest sem quota/rate-limit/identidade
**Estado:** **hipótese de risco alta; não verificado.** `executeGuestCopilotMessage` existe (`ai-conversations.functions.ts:2159-2176`) e o caminho guest é selecionável na rota. Não há prova nesta auditoria de rate limit, custo máximo, provider allowlist, quota por IP/device ou telemetria anti-abuso. Gate: rajada anônima, IP/tenant distintos, provider failure, custo e logs; assegurar que guest nunca usa service-role para mutação privilegiada nem bypassa quota de provider.

### W5-F11 — Ações estruturadas divergentes
**Estado:** **confirmado no código atual.** A rota fullscreen possui `handleStructuredAction` em `_store.copilot.tsx:337-344` que só navega `open_place` e para demais ações mostra “ainda não tem handler”; o drawer/shell têm callback `onAction`. Isso é UX honesta para ações não suportadas, mas W5.5 exige ações reais: schema, auth, BFF canônico, persistência/releitura e pending/error/success. Gate por action type; não aceitar toast como efeito.

### W5-F12 — Troca de thread e estado local
**Estado:** **não verificado no browser; risco histórico aberto.** A rota mantém `activeThreadId`, `messages` e troca de thread; ausência de `clear/load` correto pode exibir histórico anterior ou thread vazia errada. Testar A→B→A, thread sem mensagens, reload, erro de fetch e mudança rápida/concurrent request. Critério: cada render corresponde ao `activeThreadId`, sem race de resposta velha.

### W5-F13 — Proveniência de places/rating/status sintético
**Estado:** **não verificado; manter aberto.** O masterplan registra defaults sintéticos no DTO/renderer (`structured-message-view.tsx` e pipeline). Reconciliar `rows/dataRows`, `actions`, places, rating/open status e CSV com provider/DB real; valores ausentes devem permanecer `null/unknown`, nunca parecer confirmados. Gate: fixture não-string/multi-página, provider sem campo, reload e exportação exata.

### W5-F14 — Telemetria sem store/owner
**Estado:** **risco de isolamento confirmado no schema/policy; leitura cross-tenant não verificada.** `copilot_executions` tem `user_id`/`store_id` (`20270101010000...:5-21`) e `copilot_execution_steps` deriva da execução (`:24-45`); policies (`:60-68`) precisam ser exercitadas para execução sem `store_id`, guest e usuário de outro tenant. Logs de sistema/audit e `ai_telemetry_logs` também devem carregar owner/tenant correto; `logSystemError` (`src/services/telemetry.functions.ts:191-227`) aceita `route/message/error_payload` e registra `user_id`, mas não substitui autorização de leitura nem correlação de execução. Gate: owner, outsider, admin, guest; confirmar 403/empty conforme contrato, sem wildcard `store_id IS NULL`.

### W5-F15 — Pin/archive e contratos não conectados
**Estado:** **parcialmente corrigido no código atual; não verificado em persistência/browser.** No `/copilot`, callbacks `onTogglePinThread` e `onToggleArchiveThread` são passados (`_store.copilot.tsx:370-382`) e pin chama `toggleAiThreadPinned` (`:346-355`); archive apenas altera estado local (`:357-366`) sem chamada BFF visível. O histórico “sem consumidor” foi parcialmente superado para pin, não para archive. Gate: persistir pin/archive, filtros, autorização, reload e outro tenant; ou remover controles/estado que não têm mutação real.

## 5. IA, prompts, quota e gateway — gaps transversais

1. **Provider/model real:** o SSE expõe `result.metadata.provider/model` (`api.ai.stream.ts:167-171`), mas não há execução live nesta auditoria. Exigir provider allowlist, resposta não vazia/válida, timeout, retry e cancelamento observados em rede/log.
2. **Prompts:** migrations de `ai_master_prompts` e `ai_master_prompt_versions` definem versão, variáveis, provider recomendado e policies (`20261219000000...:4-113`), mas não foi provado que `executeAiCopilotPipeline` seleciona versão ativa por tenant, valida variáveis, registra prompt/version e evita prompt arbitrário do cliente. Isso é **não verificado**, não ausência de schema.
3. **Quota/custo:** `checkCivilTokenQuota` é leitura e `consumeCivilTokens` faz carteira, quota diária e `audit_logs` em sequência (`token-quota.functions.ts:133-228`), ignorando erros individuais na maior parte desses writes. Não há prova de reserva antes de selecionar chave/provider, atomicidade, idempotency key de consumo ou rollback/compensação. Relaciona-se a W2.5 e W4.
4. **Gateway/pools:** migrations de pools e telemetry existem, incluindo preferências/fallbacks (`20260826040000...`, `20261206000000...`), porém a auditoria não confirmou seleção de pool, rotação de chave, health/fallback, custo e telemetria correlacionados no mesmo request. O pool não deve ser tratado como gateway operacional só por existir no banco.
5. **Telemetria:** execution steps têm `sequence_no` unique e tokens/cost/error, mas não foi provado que todos os caminhos (guest, drawer, fullscreen, SSE, retry/cancel) escrevem steps e finalizam estado coerentemente. Exigir `trace_id/execution_id/client_message_id`, tenant/owner, provider/model, quota debit, latência, cancelamento e erro sem segredo.

## 6. Dependências, riscos e microfases atômicas propostas

### W5.0 — Preflight/reconciliação
**Paths:** somente docs/ledger e comandos Git.  
**Gate:** registrar SHA/base/status, comparar `8e50750b`, `70cd4fef`, `3d441445`, `67a056a3` e branches remotas; congelar 15 findings; nenhum cherry-pick automático.

### W5.1 — Boundary e pipeline único
**Paths:** drawer, route, server functions, stream client/parser, testes de contrato/build.  
**Gate:** um único caminho escolhido (server function ou SSE); bundle sem server-role; drawer e fullscreen com mesma autenticação, estado e correlação. Falhar se houver import direto ou rota síncrona não autorizada.

### W5.2 — Autorização e guest tollbooth
**Paths:** helper de acesso/BFF, schemas, client SSR/RLS strategy, guest function, policies/testes.  
**Gate:** matrix owner/participant/assigned/supervisor/admin/cross-store/anon; requests negativos não iniciam provider, quota nem writes; guest explicitamente limitado e telemetrado.

### W5.3 — Prompt/provider contract
**Paths:** pipeline, gateway, prompt resolver/versioning, DTO/SSE tests.  
**Gate:** prompt ativo por tenant/version/variables, provider/model real, conteúdo não vazio, sem default sintético, `provider/model/prompt_version` correlacionados e sem segredo em logs.

### W5.4 — Quota, custo e idempotência atômicos
**Paths:** quota service, gateway call, consumption RPC/migration se necessária, chat BFF e testes de concorrência.  
**Gate:** quota/reserva antes do provider; mesma key em retry; dois POSTs concorrentes = uma execução, uma resposta e um débito; falha entre writes é recuperável; `error`, count e leitura posterior confirmados.

### W5.5 — Persistência de resposta/artifact/FSM
**Paths:** conversation BFF, execution persistence, artifact/message schema/RPC, FSM tests.  
**Gate:** sem `delivered/completed` prematuro; artifact obrigatório e mensagem ficam atômicos ou saga idempotente; reload confirma linhas; erro de DB/provider fica retryable/cancelled com causa preservada.

### W5.6 — SSE, cancelamento e UX de erro
**Paths:** `api.ai.stream.ts`, `sse.ts`, parser/shell/route, gateway/tools.  
**Gate:** frames status/delta/structured/done/error; AbortController chega ao provider/reader; timeout efetivo; disconnect libera recursos; retry visual mantém key e não duplica custo; mobile/desktop.

### W5.7 — Telemetria e observabilidade
**Paths:** telemetry functions, migrations/policies se estritamente necessárias, activity-step persistence e testes RLS.  
**Gate:** cada execução correlaciona owner/tenant/thread/client key/provider/model/prompt/quota/cost/status; outsider não lê steps/logs; erro não vaza prompt/secret; cancel/retry/replay ficam auditáveis.

### W5.8 — Integração final
**Paths:** nenhum novo comportamento sem todos os gates anteriores.  
**Gate:** Postgres/Supabase efêmero desde zero, RLS JWT A/B, provider stub real e depois staging autorizado, Playwright com reload, typecheck/build/lint/design, CI no mesmo SHA; produção permanece `não verificada` sem autorização e smoke público.

## 7. Matriz de evidência e limites

| Evidência | Conclusão permitida | Não permite concluir |
|---|---|---|
| Código/migration presente | contrato/intenção ou caminho estático existe | provider, RLS, persistência e browser funcionam |
| Teste unitário de helper/FSM/SSE | lógica isolada sob double | integração HTTP, quota, gateway, Postgres ou UI |
| Typecheck/build | compilação/empacotamento | clique, segredo ausente do bundle, provider ou deploy |
| Commit/documento W5 | histórico de mudança/intenção | correção no HEAD se o path mudou; produção |
| Supabase/RLS de teste | isolamento no ambiente testado | outro schema/produção sem mesma migration |
| Browser/reload | jornada visual e sobrevivência de estado naquele ambiente | provider/produção se não correlacionado |
| CI/deploy | gate do SHA/provedor | persistência funcional ou contrato de negócio por si só |

## 8. Conclusão

O único avanço W5 que pode ser chamado de **confirmado no código atual** é a remoção do import direto do pipeline pelo drawer e a presença de mecanismos defensivos de `clientMessageId`/SSE. A unidade ainda não prova a cadeia completa `ação → identidade/tenant → BFF → prompt/provider/gateway → quota/custo → persistência → telemetria → UI/reload`. Findings históricos devem permanecer abertos até os gates propostos; especialmente W5-F02, F03, F05, F06, F07, F08, F10 e F14 não podem ser fechados por presença de migration, mock, commit ou spec. Não houve deploy, aplicação de migration em produção ou verificação pública.
