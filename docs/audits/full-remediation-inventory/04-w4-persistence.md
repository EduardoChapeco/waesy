# W4 — Persistência, FSM, transações e idempotência

**Auditoria:** inventário independente da frente W4 do masterplan holístico 2026-10-06
**Data da leitura:** 2026-10-07
**Repositório:** `EduardoChapeco/waesy`
**Branch auditada:** `audit/full-remediation-20261007`
**HEAD:** `fc8f9fc3` (`audit: make voucher document apply atomic`)
**Base declarada na spec:** `origin/main`/`919c8688`
**Escopo:** somente leitura. Nenhum arquivo de código, migration, teste ou commit foi alterado por esta auditoria.

## 1. Veredito executivo

**W4 permanece aberta.** Há remediações relevantes no histórico local — principalmente `70cd4fef` (retry de chat), `cd3709f6` (persistência de execuções Copilot) e `fc8f9fc3` (RPC de aplicação atômica de voucher) —, mas a evidência disponível não fecha a cadeia exigida pelo masterplan: baseline reproduzida, teste negativo, transação real/Postgres, replay concorrente, RLS/tenant, reload e integração final.

O código atual contém prova positiva de alguns contratos locais, mas não prova funcionamento transacional real. O único commit atual diretamente orientado a atomicidade (`fc8f9fc3`) adiciona RPC e teste estrutural/serviço, porém não houve aplicação de migrations neste ambiente, execução contra Postgres efêmero, fault injection entre writes, nem confirmação de linha persistida após reload. Portanto ele deve ser classificado como **correção presente no código/histórico; integração não verificada**, não como finding fechado.

A especificação ativa é explícita: cada escrita que produza estado terminal deve validar ator/tenant, verificar erro e ser atômica/idempotente ou possuir compensação (`SPEC-20261007-FULL-REMEDIATION-EXECUTION.md:12-19`). O masterplan exige quatro microfases: FSM única, escritas atômicas, idempotência/replay e recuperação de estados parciais (`WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md:129-138`).

## 2. Estado Git e risco de mistura

- `git status --short --branch` mostra apenas artefatos documentais não rastreados da execução (`docs/audits/LEDGER-20261007-FULL-REMEDIATION.md`, `docs/audits/full-remediation-inventory/`, spec); não há diff de código local observado antes deste relatório.
- `origin/main` aponta para `919c8688`; o HEAD está 2 commits à frente na linha local (`fe0417ae`, `fc8f9fc3`).
- Existem branches locais/remotas com ownership potencialmente sobreposto: `origin/audit/recursive-p0-remediation` (`c1f9615b`), `origin/chore/recover-waesy-task-2026-10-06` (`8e1b2c49`), `origin/feat/waesy-canonical-travel-evolution` (`05ee9845`) e outras. A spec proíbe cherry-pick/merge automático (`SPEC-20261007-FULL-REMEDIATION-EXECUTION.md:33-39`).
- O masterplan registra 13 alterações de código preservadas em outro worktree de recuperação (`WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md:28-49`). Elas não foram assumidas como estado desta branch. Antes de qualquer mutação, reconciliar path, SHA e ownership; especialmente migrations de idempotência/atomicidade.
- O masterplan é documental e declara que não é prova de correção, deploy ou produção (`...MASTERPLAN...:3-15`). Findings históricos abaixo não são automaticamente defeitos atuais: são revalidados como **confirmados no código atual**, **corrigidos no código mas não integrados**, **históricos**, **hipóteses** ou **não verificados**.

## 3. Matriz de evidência por microfase

| Microfase | Evidência atual | Classificação | Gap/gate |
|---|---|---|---|
| W4.1 FSM | `copilot-execution-persistence.ts` mantém conversão status→fase; testes exercitam máquina em memória e histórico de transições. O finding PR6-F04 documenta `paused` caindo em `RUNNING` e resume alterando status sem fase. | **Confirmado no contrato/código e parcialmente coberto por teste; correção não confirmada.** | Persistir `paused/NEEDS_CLARIFICATION` e `resume→RUNNING` em banco real, com evento de transição e rejeição de saltos/`completed` prematuro. |
| W4.2 atomicidade | `fc8f9fc3` adiciona `20270119000000_p0_atomic_voucher_apply.sql`; a RPC usa lock/loops/upserts e encapsula aplicação de voucher. Histórico PERSIST-F01/F08 identificou writes parciais em turismo e CHAT-F08 identificou artifact separado. | **Correção presente no código para o fluxo voucher; integração não verificada. Outros fluxos continuam abertos até prova em código atual.** | Migrations desde zero, fault injection entre cada write, rollback observado e leitura posterior. |
| W4.3 idempotência/replay | Migration `20270112000000_chat_message_idempotency.sql` cria chave/índice para `thread_id, client_message_id`; commit `70cd4fef` tenta preservar chave no retry. O teste atual verifica apenas payloads/mocks e uma execução visível. | **Infraestrutura/contrato confirmado; saga completa mensagem→IA→resposta→cobrança e concorrência não verificadas.** | Dois POSTs simultâneos e retry após perda de HTTP devem produzir uma mensagem, uma resposta e uma cobrança; provider real/mock instrumentado deve ser chamado uma vez. |
| W4.4 estados parciais | Há status de execução Copilot e funções de resume; migrations de jobs/outbox existem em vários domínios. Não há evidência reunida de DLQ/reconciliação uniforme para todos os fluxos W4. | **Não verificado; hipótese operacional de risco.** | Fault injection, abort/cancelamento, backoff, DLQ e replay observável por entidade, com relatório de reconciliação. |

## 4. Findings e rastreabilidade

### W4-F01 — FSM persistida divergente em clarification/resume

**Estado:** **confirmado historicamente; provável risco atual; correção não verificada**.

O masterplan cita `src/services/autonomous-copilot-orchestrator.ts:427-445`, `src/services/copilot-execution-persistence.ts:67-76,98-105` e `src/types/copilot-fsm.ts`. A evidência histórica é específica: `paused` era mapeado para `current_phase='RUNNING'`; `resumeCopilotExecution` atualizava `status='running'` sem atualizar `current_phase`. A reprodução prevista é “sem activeCity” e resume de `FAILED_RETRYABLE` (`...MASTERPLAN...:1053-1067`).

O teste atual `src/services/copilot-execution-persistence.test.ts:63-80` prova apenas que identidade/RLS impedem resume indevido e que uma linha visível recebe `status: running`/incremento de contador no double. Ele **não** afirma `current_phase=RUNNING`, não verifica `paused→NEEDS_CLARIFICATION`, não verifica histórico persistido nem faz reload em Postgres. `src/services/copilot-fsm-and-resilience.test.ts:150-157` prova snapshot de FSM em memória, não persistência.

**Risco:** estado terminal/pausado inconsistente pode permitir retomada indevida, UI incorreta, cobrança repetida ou execução sem requisito de clarificação. **Não afirmar correção** sem teste de transição negativo e leitura da linha persistida.

### W4-F02 — Retry de mensagem ainda precisa ser provado como saga idempotente

**Estado:** **correção parcial no código/histórico; integração não verificada**.

O finding CHAT-F03 documenta o defeito anterior em `src/routes/_store.copilot.tsx:149-164,247-250`, `src/services/ai-conversations.functions.ts:1749-1767,759-770` e `supabase/migrations/20270112000001_chat_message_idempotency.sql:1-7` (a nomenclatura histórica difere da migration presente `20270112000000_chat_message_idempotency.sql`; reconciliar antes de aplicar). O commit `70cd4fef` alterou `src/components/chat/ai-chat-shell.tsx`, `_store.copilot.tsx` e `ai-conversations.functions.ts`, explicitamente com a intenção de tornar retry idempotente.

A existência de índice/constraint e de uma chave estável é evidência de contrato, não prova de dedupe da operação inteira. O teste observado em `src/services/copilot-execution-persistence.test.ts:76-80` usa double e verifica somente update de status; não instrumenta gateway, cobrança, resposta já persistida, conflito de constraint, concorrência ou leitura pós-retry. **Não verificado:** o caminho em que o primeiro POST persiste a mensagem/IA, perde a resposta HTTP e o cliente repete o mesmo evento.

**Gate:** executar dois POSTs concorrentes com o mesmo `thread_id/client_message_id`, simular timeout após commit e repetir; conferir contagens de `chat_messages`, execução, resposta e ledger de custo, além de retry com payload divergente (deve rejeitar conflito, não duplicar).

### W4-F03 — Falha de artifact/resposta pode produzir sucesso falso

**Estado:** **confirmado historicamente; estado atual não revalidado integralmente**.

CHAT-F08 aponta `src/services/ai-conversations.functions.ts:1805-1857`, `src/components/chat/ai-chat-shell.tsx:487-501` e migration `20261215000000_ai_chat_shell_artifacts_and_projects.sql:27-40`: insert de artifact era separado, erro ignorado e resposta marcada `delivered`. O relatório exige não confundir payload em memória com registro após reload.

A leitura atual desta auditoria encontrou commits de hardening de Copilot, mas não executou fault injection nem confirmou o contrato final dessas linhas contra o SHA `fc8f9fc3`. Logo, o finding permanece **aberto/não verificado**, não “corrigido” por presença de testes estáticos. **Gate:** falha de insert/constraint/RLS deve resultar em erro/retryable ou em resposta sem artifact; sucesso só após select autorizado do artifact e da mensagem.

### W4-F04 — Turismo: reserva/check-in e espelho de assento

**Estado:** **confirmado no snapshot histórico; correção atual não verificada e potencialmente afetada por branches paralelas**.

PERSIST-F01–F06 detalham, respectivamente: espelho `trip_seat_reservations` ignorando erro após update de experiência (`src/services/tourism.functions.ts:268-389`); reserva com service-role sem auth/tenant (`src/services/tourism-operations.functions.ts:118-151`); leitura pública de PII (`:101-112`); TOCTOU sem unique/lock (`:123-151`); check-in por QR global sem autorização de evento (`:158-196`); e sucesso emitido sem verificar update/affected rows (`:187-204`) (`...MASTERPLAN...:2200-2300`).

Nesta branch não há commit identificado como remediação desses seis paths. Não foi aplicado banco nem exercitado concorrência. Classificação: **confirmado como histórico; não verificado no SHA atual**. **Gate:** RPC/transaction real, constraint parcial ou lock, RLS por tenant, ausência de PII anônima, `error`/row count verificados e read-after-write.

### W4-F05 — Aplicação de voucher documental: atomicidade e idempotência

**Estado:** **correção presente no código/migration; integração e rollout não verificados**.

`fc8f9fc3` alterou `src/services/travel-canonical-pipeline.functions.ts`, `src/services/travel-lifecycle.functions.ts`, adicionou `src/services/travel-voucher-atomic-apply.test.ts` e migration `supabase/migrations/20270119000000_p0_atomic_voucher_apply.sql`. A migration contém uma RPC que valida o trip/tenant, bloqueia a linha (`FOR UPDATE`), atualiza trip, passageiros, itens e voucher, e usa procura/upsert para replay. Isso responde diretamente a PERSIST-F07/F08, que anteriormente apontavam lookup de trip apenas por id e erros de child writes ignorados (`...MASTERPLAN...:2302-2330`).

O teste `src/services/travel-voucher-atomic-apply.test.ts` e o ledger de P0 são evidência de intenção/contrato no repositório, não evidência de execução da RPC em Postgres. Ainda faltam: migration aplicada desde zero, erro injetado no meio da transação, cross-tenant real, duas chamadas concorrentes, replay com mesmo `ingestion_id`, e confirmação de `extraction_status='applied'` somente após todos os efeitos.

**Risco de mistura:** esse commit é da frente `audit/p0-public-acceptance-conversion-20261007` e não deve ser cherry-picked em outra linha sem comparar migrations e ownership. A migration é futura em relação ao snapshot do masterplan; tratar como mudança local desta branch, não como prova de produção.

### W4-F06 — Idempotência de ingestão OCR por `content_sha256`

**Estado:** **hipótese/risco confirmado apenas pelo relatório histórico; não verificado no código final**.

PERSIST-F10 registra que `content_sha256` era calculado sem dedupe efetivo em `src/services/travel-canonical-pipeline.functions.ts` e migration do pipeline (`...MASTERPLAN...:2337-2354`). A RPC nova de voucher usa a ingestão/trip como contexto, mas a auditoria não encontrou evidência executada de unique constraint/lookup que impeça duas ingestões do mesmo conteúdo antes do apply. **Não declarar resolvido** sem examinar o schema aplicado e testar upload/replay concorrente.

### W4-F07 — Builders e publicações: persistência parcial

**Estado:** **hipótese operacional, não verificado**.

W4 inclui Builders (`...MASTERPLAN...:129-138`), mas não há nesta auditoria prova de uma FSM canônica de draft→saved→published→archived nem de atomicidade create/save/reload/publish. Testes de builder observados em `src/services/builder.functions.test.ts` verificam presença de funções/templates e contratos estáticos; isso não prova linha persistida, publicação, URL pública ou rollback. **Gate:** create→save→reload→edit→publish com erro entre writes, retry idempotente e distinção inequívoca de draft/publicado.

## 5. Dependências e riscos transversais

1. **W2/W3 precedem W4:** identidade/tenant/RLS e schema/constraints precisam estar fechados antes de declarar atomicidade. Service-role sem assert explícito invalida uma “transação segura”.
2. **Tipo gerado não é persistência:** `src/integrations/supabase/types.ts` possui campos `idempotency_key`, mas tipos compiláveis não garantem constraint, índice único ou RPC instalada.
3. **RPC não é rollout:** migration versionada precisa ser aplicada em ambiente efêmero desde zero e em banco representativo; este ambiente não fez isso.
4. **Mocks têm baixa discriminação:** os doubles dos testes de persistência podem aceitar qualquer update sem modelar erro Supabase, affected rows, concorrência ou RLS. Não elevar teste mockado a integração.
5. **Estados terminais devem ser derivados de efeitos:** `completed/applied/delivered` só depois de todos os writes obrigatórios e read-after-write; erro parcial deve permanecer retryable/reconciliável.
6. **Custo/provider:** chat idempotente deve deduplicar também chamada ao gateway e ledger de custo, não apenas a user message.
7. **Branches remotas:** PRs/commits paralelos podem conter migrations com IDs e contratos sobrepostos. Comparar `git diff --name-status`, migration order, funções RPC e testes antes de qualquer merge/cherry-pick.

## 6. Microfases atômicas e gates propostos

### W4.1 — Fechar contrato FSM Copilot

**Paths permitidos inicialmente:** `src/types/copilot-fsm.ts`, `src/services/copilot-execution-persistence.ts`, `src/services/autonomous-copilot-orchestrator.ts`, testes específicos e documentação W4. Não tocar UI/branches paralelas.

- Definir tabela única status↔fase, terminais, transições e efeitos laterais.
- Reproduzir baseline de clarification e resume; adicionar testes negativos para salto inválido e `completed` sem efeitos.
- Gate: Postgres/test double que verifica payload completo, evento de transição, `paused/NEEDS_CLARIFICATION`, `resume/status+phase=RUNNING`, reload e ownership.
- Bloqueio se a semântica de `paused`/clarification não for aprovada pelo produto.

### W4.2 — Atomicidade de voucher e reserva

**Paths:** RPC/migrations correspondentes e BFFs chamadores; um domínio por microfase.

- Aplicar migrations em Postgres efêmero desde zero; validar função/constraints/RLS.
- Fault injection em cada write; confirmar rollback e ausência de `applied/success` falso.
- Gate: positivo, erro de banco, cross-tenant, trip inexistente, retry idêntico e concorrência; read-after-write de trip, filhos, voucher e ingestion.

### W4.3 — Saga de mensagem Copilot idempotente

**Paths:** `src/routes/_store.copilot.tsx`, `src/services/ai-conversations.functions.ts`, migration de chat e testes.

- Fixar `client_message_id` no estado/retry; decidir contrato de payload divergente com mesma chave.
- Dedupe antes da chamada ao provider; persistir resultado/estado/custo em unidade idempotente ou outbox.
- Gate: POST duplicado/concurrente, perda de resposta HTTP, provider 5xx/timeout, cancelamento e replay; exatamente uma mensagem/resposta/cobrança lógica.

### W4.4 — Artifact e builders sem sucesso fantasma

- Para artifact, provar insert + resposta + associação message_id e erro explícito quando artifact obrigatório falhar.
- Para builder, provar create/save/reload/publish e publicação idempotente.
- Gate: reload real, falha entre writes, tenant alternativo e nenhum UUID/DTO em memória apresentado como persistido.

### W4.5 — Recuperação e reconciliação

- Inventariar jobs/outbox/AI async e escolher contrato uniforme de retry/backoff, cancel, timeout e DLQ.
- Gate: falha real observável, replay seguro, métricas de tentativas, dead-letter e reconciliação de registros órfãos; sem `success` fictício.

## 7. Evidência necessária para fechamento W4

W4 só deve ser marcada como concluída quando o ledger anexar, no SHA candidato: (1) baseline reproduzida e teste que falha sem proteção; (2) diff/path review; (3) testes unitários/contratuais; (4) typecheck/build/lint aplicáveis; (5) migrations desde zero e Postgres/RLS por tenant; (6) concorrência/retry/fault injection; (7) browser/reload quando há UI; (8) CI do SHA e, separadamente, deploy/smoke quando autorizado. Commit, migration presente, teste mockado, HTTP 200 ou PR aberto não substituem esses níveis.

**Conclusão:** nenhum finding W4 foi promovido a “verificado em integração/produção” nesta auditoria. O voucher atômico é o avanço mais concreto, porém permanece “código/migration presentes; integração não verificada”. FSM, chat retry/custo, artifacts, reservas/check-in, OCR dedupe e builders exigem as microfases e gates acima.
