# WAESY — Relatório consolidado de prontidão W0–W7

**Data do artefacto:** 2026-10-07  
**Escopo:** snapshot inicial read-only de W0–W7, com atualizações locais W2 nas secções 8 e seguintes.  
**Regra de interpretação:** nenhuma onda ou microfase é declarada fechada sem evidência independente no nível correspondente. Código, testes locais, mocks, typecheck, build, merge, CI, integração, browser e deploy permanecem níveis distintos.

## 1. Snapshot conhecido da branch

- **Branch local:** `audit/full-remediation-continuation-20261007`.
- **HEAD local e `origin/main` observados:** `919c86881db1ce83de3feae7fcf7df5aadb58b7d`.
- **Worktree no snapshot inicial:** sujo. Foram observados **9 paths modificados + 21 não rastreados = 30 paths**, incluindo código, testes, uma migration e relatórios/specs W2. Esses diffs foram preservados; o pacote staged atual contém 35 paths após W2.7.2 e atualizações de evidência.
- **Worktrees:** `git worktree list` mostrou somente `/home/ubuntu/work/waesy-continuation`; não foi apresentada a worktree histórica `/home/ubuntu/waesy-audit` que o masterplan manda preservar.
- **PR desta branch:** não existe PR identificado para a branch de continuidade; a branch remota específica respondeu 404 na observação recebida. Portanto, não há candidato publicado desta branch que possa carregar os resultados locais.
- **GitHub observado em snapshots diferentes:** `main` aparece protegido e exige `5 Quality Gates` e `Cloudflare Pages`, mas `rulesets` respondeu `[]` e o número de aprovações obrigatórias observado foi zero. PRs #5/#6/#7 foram observados abertos com Quality Gates SUCCESS e Cloudflare Pages FAILURE; PR #19 foi observado OPEN/CLEAN com ambos os checks SUCCESS. Nenhum desses estados, isoladamente, fecha a branch local nem prova deploy/smoke público.
- **Cloudflare/deploy:** há snapshots contraditórios e temporais. O ledger histórico registou Cloudflare em execução/por validar; relatórios e `gh pr checks` registaram falhas nos PRs antigos; o SHA `919c8688` teve checks gerais SUCCESS em observações posteriores, mas não foi fornecido objeto de deployment nem smoke público. Correção de binding/configuração não é prova de deployment, conforme `docs/audits/CLOUDFLARE_PAGES_RELEASE.md:41-48,67-96`.
- **Histórico W0:** o commit `75b7177f` é documental (13 paths em AGENTS/docs/skills, nenhum `src/` ou `supabase/`), mas o ledger desse commit registava W0.1–W0.3 como “Em execução”; a mensagem do commit alegava CI/Cloudflare pass sem reconciliar GitHub protection FAIL/404 e Cloudflare “validar”. O ledger atual `docs/audits/20261007-holistic-execution-ledger.md:3-29` não contém fecho W0.

### Veredito global

**W0–W7 permanecem abertas, parciais ou bloqueadas.** Não há evidência suficiente para promover qualquer onda a integração completa, browser, produção ou “pronta para release”. Os principais bloqueadores são: ausência de reconciliação W0/ledger 109/109; Cloudflare/branch protection temporalmente contraditórios; ausência de replay de migrations completas/Supabase/JWT/RLS/Storage/provider reais; ausência de browser E2E; e falta de um candidato com CI/deploy/smoke no mesmo SHA. A evidência de PostgreSQL local com stubs para W2.7.2 e o estado posterior da branch estão limitados às adendas posteriores.

## 2. Matriz consolidada — uma linha por onda

| Onda | Microfases e estado atual | Gaps que impedem fecho | Próxima ação dependente | Prioridade |
|---|---|---|---|---|
| **W0 — Baseline e separação de diffs** | **W0.1 parcial/bloqueada:** snapshot histórico existe, mas não foi reconciliado com o SHA/branch atual. **W0.2 parcial:** separação documental prova somente o commit `75b7177f`; os 13 paths históricos não foram reconciliados com os 29 paths atuais. **W0.3 aberta:** há 109 IDs inventariados, mas não ledger 109/109 com owner, baseline, dependências, risco e artefacto por finding. | Não houve replay dos 109 findings em `919c8688`; worktree histórica/ownership dos 13 paths não está disponível; não há status inicial de cada worktree; snapshot histórico e remoto atual divergem; não há revisão adversarial nem artefactos por finding. | Congelar uma worktree documental limpa separada da worktree W2 suja; capturar SHA/base, status, worktrees, remotos, PRs, checks, rulesets e datas; arquivar os 13 paths sem staging/reset/cherry-pick; criar ledger imutável com uma linha por ID e marcar sem replay como bloqueado. | **Alta / P0 de sequência** |
| **W1 — Governança de merge e gate de release** | **W1.1 parcial/bloqueada:** proteção de `main` observada, mas `rulesets=[]`, 0 aprovações obrigatórias e sem teste negativo. **W1.2 parcial:** workflow versionado tem cinco gates locais; Cloudflare não fecha. **W1.3 causa histórica documentada, fecho não provado:** binding/projeto/lockfile foram analisados, mas checks apontam para `wider` e falham em snapshots. **W1.4 bloqueada:** houve merges históricos com check cancelled/failing e PRs candidatos ainda abertos. | Não há ambos os checks SUCCESS no mesmo SHA candidato limpo; não há logs/API atuais de `usewaesy`; não há prova de ruleset nem bloqueio para failed/cancelled/pending/skipped; nenhum deploy/smoke público confirmado. | Não fazer merge de #5/#6/#7; preparar candidato limpo; validar `npm ci`, typecheck, testes, build `dist`, Cloudflare Pages no projeto correto e ambos os checks no mesmo SHA; ativar/confirmar protection/ruleset e teste negativo controlado; só então smoke autorizado. | **P0 — release bloqueado** |
| **W2 — Autorização, identidade e isolamento multi-tenant** | **W2.1 parcial:** SSR auth/membership/role existem, mas auto-heal por email/settings grava owner e contexto ativo depende de cookie/subdomínio. **W2.2 incompleta:** service-role sem predicado de tenant em catálogo, Studio e operações; assentos/check-in têm lacunas. **W2.3 parcial:** migrations W2 melhoram RLS, mas há policies legacy `USING(true)`. **W2.4 parcial:** grants/RPCs documentados, não verificados no DB. **W2.5 aberta:** rate limit existe, quota/cobrança ocorre depois do provider em alguns caminhos. | Sem matriz endpoint×user×role×tenant; sem Postgres/Supabase, JWT A/B, `pg_policies`, `pg_proc`, grants ou `SET ROLE`; sem provider/quota/saldo; sem browser; artefactos W2 estão não publicados e worktree suja. | Preservar diffs; executar preflight W2.1; depois teste real A/B com JWT e migrations W2/legacy; verificar service-role, RLS, RPC/SECURITY DEFINER e grants; só então implementar/provar preauthorization antes de `getNextActiveKey`/provider/jobs, repetir browser, CI e deploy. | **P0/P1 — auth/RLS/quota** |
| **W3 — Schema, migrations e contratos de banco** | **W3.1 bloqueada:** não há banco vazio aplicado; checker é lexical. **W3.2 bloqueada:** três colisões de IDs e `exit=1`; 472 SQL no HEAD/473 no worktree. **W3.3 parcial:** `types.ts` estruturado, mas sem geração/replay independente ou gate CI. **W3.4 aberta:** consumidor usa `user_daily_token_quotas`, ausente em migrations e tipos; scanner BFF não existe no checkout/CI. **W3.5 parcial:** cursor/limit+1 apenas in-memory. | Não se sabe se as 472 migrations aplicam from-zero; colisões, idempotência, drift, `user_daily_token_quotas`, BFF↔migration, RLS/grants e paginação real não foram testados. `check:schema`/`check:types-ssot` não substituem Postgres. | Provisionar Postgres efémero autorizado; aplicar tudo em ordem e capturar catálogo, policies, grants, functions e triggers; decidir colisões somente após snapshot; reconciliar tabela/DTO/tipos; adicionar geração/verificação de tipos e scanner BFF ao CI; terminar com contract tests e fixtures multi-página reais. | **P0 — DB bloqueia a sequência; P1 para gates** |
| **W4 — Persistência, FSM e consistência transacional** | **W4.1 parcial:** FSM aceita `COMPLETED` prematuro e persistência usa `PLANNING` versus `PLANNED`. **W4.2 não fechada:** writes do Copilot e Builder legado são sequenciais, sem transação/compensação demonstrada. **W4.3 parcial:** constraint/lookup de idempotência existe, mas `clientMessageId` é opcional, cobrança usa `startTime` e redelivery pode duplicar flow/outbox. **W4.4 parcial/aberta:** worker tem retry/DLQ, mas timeout não aborta provider, recovery não reconcilia e circuit-open consome attempts. | Migrations/RPCs não foram aplicadas/verificadas; não houve POST concorrente, fault injection entre writes, provider/cobrança, webhook redelivery ou browser; fecho histórico em `f6833abd` admite que POST live não foi executado e não consta no ledger atual. | Em DB descartável, canonizar FSM e transition-events; atomicidade/compensação; tornar `clientMessageId` obrigatório e chave de custo determinística; decisão única de inbox/flow/outbox; fault-injection, concorrência, recovery, abort e retry; depois browser autenticado e ledger W4 atual. | **P0/P1 — consistência e custo** |
| **W5 — Copilot e chat ponta a ponta** | **W5.1 parcial:** drawer/BFF usam caminhos atuais, mas `resolveAiPipelineSteps` legado continua exportado/usado. **W5.2 aberta:** falha/JSON vazio do gateway pode virar saudação e `COMPLETED`. **W5.3 positivo limitado:** guards de thread/loja existem; RLS não provado. **W5.4 aberta:** TableBlock trata rows/dataRows, mas export CSV perde rows objeto. **W5.5 aberta:** só `open_place` é executado; demais ações têm toast de sucesso sem validar retorno e WhatsApp usa email. **W5.6 aberta:** SSE não tem caller UI e cancelamento não aborta provider; steps são mutados depois do push. | Sem provider real, persistência de `FAILED_RETRYABLE`, RLS/JWT, browser, cancelamento/AbortSignal, ações reais, CSV byte-a-byte ou ledger W5. CI verde histórico não prova E2E. | Primeiro corrigir W5.2 com regressão para gateway rejeitado/JSON sem `message`; propagar erro e persistir estado falho. Depois escolher contrato SSE/síncrono, implementar ações com resultado verificável, CAS/idempotência e abort; validar Supabase/provider/browser, reload/retry/cancel e CI/deploy. | **P1 — falso sucesso e E2E** |
| **W6 solicitado — Builders/Studio/publicação; classificação oficial W8** | **Escopo não reconciliado:** masterplan chama W6 de Gateway IA/pools/proteção de chaves e Builders/Studio de W8.1–W8.5. No escopo fornecido, rota/BFF Omni e migration RPC existem localmente; W8.1–W8.5 não estão fechadas. Há TDZ em `hydrateBindings`, deep-link `/perfil-da-loja` divergente de `/paginas/$slug`, auto-seed/fallback em GET público, home paralela, BFF Studio sem owner/store nos CRUDs e fixtures demo locais. | Não houve aplicação da migration, RLS/concorrência/rollback, create→save→reload→publish→rollback, browser, Storage ou smoke. Os testes são textuais/em memória; o relatório histórico “FULLY_VALIDATED” é incompatível com o ledger de recuperação e não prova execução atual. Além disso, o W6 oficial Gateway não foi coberto pelo resultado fornecido. | Registrar formalmente W6↔W8; em candidato limpo corrigir TDZ, fallback/auto-seed, deep-link e owner/store; adicionar testes executáveis; aplicar DB/RLS com dois tenants; Playwright de editor/publicação/rollback; exigir E2E no CI e deployment/smoke no mesmo SHA. | **P0 — escopo, segurança e publicação** |
| **W7 solicitado — Imagem/mídia; classificação oficial W9** | **Escopo não reconciliado:** masterplan chama W7 de tabelas/catalogo e imagem/mídia de W9. No escopo fornecido, Storage e jobs têm contratos locais, mas W9.1–W9.4 não fecham. `classified-media` privado é tratado como público; signed URLs de 1h são persistidas como canónicas; fallback quebra namespace; UI aceita 50 MB e BFF limita 20 MB; profile upload não valida MIME/hash/dimensões; migration `ai_async_jobs` antecede a criação; jobs não têm caller real; `quotaTokens` vem do cliente/default 0. | Sem migrations from-zero, Storage/RLS/JWT, provider sandbox, jobs/worker, quota/cobrança, URL pós-expiração, reload/download, browser ou deployment. Os 10 testes focados são inspeção textual; typecheck excedeu 120s sem exit observado. A W7 oficial tabelas/catalogo não foi auditada no material fornecido. | Registrar W7↔W9; corrigir/rever Storage, paths, URLs, limites, validação e ordem de migrations; testar from-zero, matriz RLS/Storage, provider sucesso/falha/retry/cancel, persistência por ID/path não efémero, Playwright de reload/download; somente depois CI/deploy/smoke. | **P0 — privacidade/integração; P1 — jobs/quota** |

## 3. Evidência consolidada por onda

### W0 — Baseline, diffs e ledger

- O masterplan define exatamente W0.1–W0.3 e exige ledger imutável (`docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md:84-92`). A contagem read-only reproduziu **109 IDs únicos em 15 unidades** (`:297-317,338-340`), mas isso é inventário narrativo, não ledger de 109 linhas.
- O ledger histórico capturou data, branch, HEAD/base, PRs, worktrees, versões e gates, porém W0.1–W0.3 estavam “Em execução” (`git show 75b7177f:docs/audits/20261007-holistic-execution-ledger.md`, linhas 3–20). A mensagem do commit alegava CI/Cloudflare pass, enquanto o ledger registava GitHub protection FAIL/404 e Cloudflare “deployment em execução/validar” (linhas 25–31); o masterplan preserva esses checks históricos falhos/cancelados (`:17-26`).
- O masterplan lista 13 paths históricos a preservar (`:22-49`), enquanto a execução atual observou outro worktree, 29 paths sujos e nenhum artefacto que reconcilie os conjuntos. `git show --stat/name-status 75b7177f` prova apenas que o commit documental alterou 13 paths AGENTS/docs/skills, sem `src/`/`supabase/`.
- O nível local histórico (`npm ci`, typecheck, testes e build no SHA `90e40782`) não foi reexecutado em `919c8688`. Conforme `AGENTS.md:147-151` e `skills/waesy-integrity-auditor/SKILL.md:53-64`, mock/typecheck/build/merge/deploy não podem ser promovidos entre níveis.

**Estado:** parcial/bloqueada.  
**Lacunas críticas:** replay 109/109; ownership/status dos 13 paths; reconciliação de snapshots; proteção/ruleset atual detalhada; revisão adversarial; prova de DB/browser/provider/deploy.

### W1 — Governança e release

- A proteção de `main` foi observada via API com `strict: true`, `5 Quality Gates`, `Cloudflare Pages`, revisão obrigatória presente, `enforce_admins=true` e force-push desabilitado; contudo `rulesets` retornou `[]` e aprovações obrigatórias eram zero. Isso é governança parcial, não prova do bloqueio negativo.
- `.github/workflows/ci.yml:3-18,30-56` implementa o job `5 Quality Gates`; `package.json:6-38` confirma scripts. Isso prova configuração versionada, não provider nem integração.
- `docs/audits/CLOUDFLARE_PAGES_RELEASE.md:7-22,50-95` documenta binding duplicado, projeto `wider`/origem errada, ausência de build command e lockfile drift; `wrangler.toml:1-10` remove `[vars]`, mas checks atuais dos PRs históricos continuam a apontar para Cloudflare FAILURE.
- `gh pr checks 1–6` observou cancelled/failing nos PRs antigos; #5/#6 ficaram OPEN com Quality Gates SUCCESS e Cloudflare FAILURE. A produção não foi confirmada (`docs/audits/PRODUCTION_READINESS_2026-10-06.md:9-14,45-65`).

**Estado:** fora da sequência publicada da branch e aberta.  
**Lacunas críticas:** mesmo SHA com os dois checks verdes; logs atuais do projeto correto; ruleset/proteção negativa; merge seguro; deployment e smoke público.

### W2 — Autorização, RLS e quota

- `src/lib/identity.server.ts:61-179,181-320,328-356` e `src/lib/auth-guards.server.ts:14-32,96-121` demonstram autenticação SSR, memberships, roles e guards, mas também auto-heal por email/settings e contexto ativo por cookie/subdomínio. A matriz completa endpoint×user×role×tenant exigida por W2.1 não existe.
- Service-role sem escopo explícito foi confirmado em `src/services/admin-catalog.functions.ts:20-30,619-655,784-825`, `src/services/studio.functions.ts:96-115,147-193` e `src/services/tourism-operations.functions.ts:101-112,118-204`. O check-in procura QR global, ignora resultado do update e pode retornar sucesso; a migration de assentos permite leitura pública (`20260827280000...sql:525-548`).
- A migration W2 melhora policies/financial transactions (`20261006150000_wave2_rls_financial_transactions.sql:5-173,257-332`) e Copilot (`20261006164458_harden_copilot_execution_read_access.sql:8-27`), mas a árvore ainda tem policies permissivas legacy (`20260930000000...sql:404-428`, `20260827280000...sql:538-548`). A varredura observada contou 95 ficheiros com `USING(true)` e 47 com `WITH CHECK(true)`; somente DB aplicado pode decidir a policy efetiva.
- `20261007130000_rpc_grants_and_explicit_profile_provisioning.sql:5-17,68-124` é correção de código/grants reportada, não consulta independente a `pg_proc`/privilégios. `record_travel_sale_payment` é SECURITY DEFINER, mas não demonstra validação actor/membership/tenant dentro da RPC. `20261007000001_ai_media_jobs_quota_lifecycle.sql:64-146` cobra na finalização, depois do provider.
- `docs/audits/20261007-W2-CONTINUITY-REVALIDATION.md:21-27,44-59` limita os resultados a gates locais/reportados, sem DB, JWT real, provider, browser ou deploy; PR #7 foi observado com CI SUCCESS e Cloudflare FAILURE.

**Estado:** W2 oficial parcial/aberta; nomenclaturas históricas W2.2/W2.3.1/W2.6/W2.7 não substituem W2.1–W2.5 (`docs/audits/20261007-W2-CONTINUITY-REVALIDATION.md:21-27`).

### W3 — Schema, migrations e contratos

- Não há Supabase/Docker/psql/conexão observada; `scripts/check-schema-consolidation.mjs:7-51` é apenas regex/contagem. Sua execução terminou `exit=1` por três colisões: `20270106000000` (campaign vs security hardening), `20270107000000` (CMS vs OCR) e `20270109000000` (E2E booking vs tourism RLS). HEAD tinha 472 migrations; o worktree, 473 por causa de migration W2 não rastreada.
- `src/integrations/supabase/types.ts:9-16,40181,42497,43795,45042,45275,45285` é estruturado, mas não há geração/replay reproduzível. O CI (`.github/workflows/ci.yml:33-46`) não roda `supabase gen types`, compara snapshot ou impede drift (`docs/audits/W3_SCHEMA_DRIFT.md:11-17`, `docs/specs/SPEC-W3-SUPABASE-TYPES.md:7-18`).
- `src/services/token-quota.functions.ts:153-211` lê/escreve `user_daily_token_quotas`; a busca nas migrations não encontrou o DDL e a tabela está ausente de `types.ts`, enquanto `user_token_wallets` existe. É quebra de contrato local, não prova de schema remoto.
- O scanner BFF não existe no checkout atual e não está em `package.json:34-38` nem no CI; o baseline histórico tinha contagens incompatíveis (`docs/audits/BFF_TABLE_CONTRACT_BASELINE_2026-10-06.md:7-10,48-50`).
- `src/lib/pagination/keyset-pagination.ts:9-29,156-168` e testes `:39-114` cobrem apenas cursor/limit+1/hasMore em memória, sem banco, total/count, concorrência ou última página real.

**Estado:** W3.1/W3.2 bloqueadas; W3.3–W3.5 parciais. O check Cloudflare/Quality Gates SUCCESS observado no SHA não cobre Postgres/migrations.

### W4 — FSM, persistência e idempotência

- `src/types/copilot-fsm.ts:144-170` permite `UNDERSTANDING→COMPLETED` e `RUNNING→COMPLETED`; isso falha a exigência de rejeitar `completed` prematuro. `src/services/copilot-execution-persistence.ts:36-95` grava `PLANNING` enquanto a FSM usa `PLANNED`, separa writes sem RPC/transação e apenas regista falhas no console; recovery relê/incrementa `resume_count` e força running sem reconciliação.
- O finding de falha parcial do envio permanece: `docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md:2427-2442` descreve inserts sequenciais de user message, artifact, AI reply e updates, deixando `sending` órfão se um passo falhar. Não há teste do handler completo.
- `supabase/migrations/20270112000000_chat_message_idempotency.sql` cria constraint/index, mas `src/services/ai-conversations.functions.ts:54-63` deixa `clientMessageId` opcional; `:799-814` deriva a chave por `startTime`, permitindo retry com nova chave. Redelivery WhatsApp continua não provado como uma única execução (`masterplan:656-671`).
- `src/services/ai-conversations.functions.ts:583-591` usa `Promise.race` sem `AbortController`; `src/routes/api.ai.stream.ts:183-187` deixa `cancel()` sem abortar gateway. `src/services/whatsapp-outbox.worker.ts:108-146` tem retry/DLQ, mas claim incrementa attempts antes da chamada e circuito aberto pode consumir tentativas.
- `src/services/builder.functions.ts:2625-2718` mantém publisher legado com writes separados. O caminho Omni RPC (`src/services/omni-builder.functions.ts:174-184`) não pode ser assumido como canónico sem prova de aplicação e uso.
- O fecho histórico em `git show f6833abdf842:docs/audits/20261007-holistic-execution-ledger.md:80-84` é explicitamente limitado: não executou os dois POSTs live nem provou concorrência/cobrança única.

**Estado:** W4.1/W4.3/W4.4 parciais; W4.2 não fechada. Sem DB/provider/browser.

### W5 — Copilot/chat

- Gateway rejeitado ou JSON sem `message` pode cair na saudação/finalização em `src/services/ai-conversations.functions.ts:749-827,1533-1597`; os testes `src/services/copilot-pipeline-boundaries.test.ts:3-23,88-119` não cobrem esse caso.
- Drawer e `/copilot` usam caminhos atuais (`src/components/chat/waesy-copilot-drawer.tsx:14-17,93-137`; `src/routes/_store.copilot.tsx:164-281`), mas o resolver legado continua exportado/usado (`ai-conversations.functions.ts:182-188`).
- `canAccessAiThread`/`getAiConversationThread` têm guards (`ai-conversations.functions.ts:82-113,1703-1769`) e teste limitado (`ai-conversations-access.test.ts:4-23`), sem RLS/service-role/browser.
- `structured-message-view.tsx:368-407` normaliza rows/dataRows; `ai-chat-shell.tsx:739-750` só exporta rows se `rows[0]` for array, omitindo rows objeto. `structured-chat.test.ts:133-150` não cobre a cadeia real.
- `_store.copilot.tsx:337-344` só executa `open_place`; o drawer mostra sucesso sem validar retorno (`waesy-copilot-drawer.tsx:118-137`); o BFF aceita `z.record(z.any())` e usa `identity.email` em `contact_whatsapp` (`ai-conversations.functions.ts:2203-2240`).
- SSE existe em `src/routes/api.ai.stream.ts:40-189`, mas não há caller UI; cancelamento local apenas invalida resposta (`_store.copilot.tsx:276-281`) e não há AbortController. `copilot-execution-persistence.ts:52-95` agenda upsert no push, enquanto o orquestrador muta steps depois (`autonomous-copilot-orchestrator.ts:503-525,550-562,687-710,734-764`).
- Não existe ledger W5 dedicado nesta branch; o SPEC admite provider real, browser E2E, SSE/cancelamento live e Supabase/RLS abertos (`docs/specs/SPEC-W5-COPILOT-CHAT-E2E.md:11-21`).

**Estado:** W5 aberta; nenhum resultado local é integração ou browser.

### W6 solicitado / W8 oficial — Builders, Studio e publicação

- O masterplan define W6 como Gateway IA (`docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md:153-164`) e Builders/Studio como W8 (`:177-187`). O resultado fornecido deve ser rotulado W6 solicitado/W8 oficial, não como fecho do W6 Gateway.
- Há contrato local Omni em `src/routes/workspace.builder.$documentId.editor.tsx:12-44,69-104` e `src/services/omni-builder.functions.ts:17-59,62-201`: admin, store/session, `version_id` e `version_status` são exigidos. A migration `supabase/migrations/20261007000000_builder_versioned_omni_snapshots.sql:11-137` propõe SECURITY DEFINER, FOR UPDATE, idempotência e grants service_role, sem prova de aplicação.
- Defeitos confirmados: TDZ de `needsMarketingBanners` (`src/services/builder.functions.ts:100-161`); deep-link da top bar para `/perfil-da-loja` em vez de `/paginas/$slug` (`src/components/admin/builder/builder-top-bar.tsx:43-55`); fallback/auto-seed em GET público (`builder.functions.ts:2240-2381`) contrário à spec W8.3; home pública paralela que não usa o renderer Omni (`src/routes/_store.index.tsx:117-180`); BFF Studio sem predicado owner/store em get/update/delete (`src/services/studio.functions.ts:53-193`); fixtures demo na UI (`src/routes/workspace.estudio.index.tsx:72-145`).
- `omni-builder.functions.test.ts:5-67`, `builder.functions.test.ts:71-96` e `studio-contract.test.ts:13-77` são testes textuais/em memória. `docs/recovery/builder-execution-ledger.md:9-27` mantém publicação/rollback pendentes, apesar de relatório histórico `builder-audit/22-final-validation-report.md:10-16` declarar “FULLY_VALIDATED”.

**Estado:** escopo não reconciliado e onda de Builders/Studio/publicação bloqueada. W6 Gateway continua uma lacuna de cobertura.

### W7 solicitado / W9 oficial — Imagem, mídia e arquivos

- O masterplan define W7 como tabelas/catalogo e W9 como imagem/mídia (`docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md:165-198`). Portanto, o resultado recebido cobre W9, não a W7 oficial; a W7 de tabelas/catalogo é lacuna de cobertura.
- `src/services/storage.functions.ts:162-177` cria `publicUrl` para buckets fora de cinco exceções, incluindo `classified-media`, enquanto `supabase/migrations/20261007120000_storage_tenant_boundary_hardening.sql:4-70` torna esse bucket privado. `uploadMediaUniversal` retorna signed URL de 1h (`storage.functions.ts:427-443`), que `media-uploader.tsx:226-242`, `upload-classified-media.ts:45-102` e `image-upload.tsx:161-185` tratam/persistem como URL canónica; o skill Storage proíbe isso (`.agents/skills/storage-audit/SKILL.md:29-35`).
- Path BFF usa namespace tenant (`storage.functions.ts:411-420`), mas MediaUploader/fallback usa `${folder}/${cleanName}` e `getPublicUrl` (`media-uploader.tsx:212-260`), divergindo da policy tenant-safe. UI aceita vídeo até 50 MB (`:202-207`) e BFF rejeita inline acima de 20 MB (`storage.functions.ts:47-61`). `uploadProfileMediaDirect` (`:501-575`) não valida MIME/bytes/hash/dimensões, usa extensão do nome e retorna sucesso sem conferir updates.
- `20261007000001_ai_media_jobs_quota_lifecycle.sql:1-4` altera `ai_async_jobs` antes da criação observada em `20261206000000_v142_ai_core_gateway_pools_and_telemetry.sql:107-123`; from-zero não foi executado. `ai-media-jobs.functions.ts:17-82` existe, mas não há callers de claim/finalize fora do módulo. `createAiMediaJob` aceita `quotaTokens` do cliente/default 0 (`:17-37`) e só cobra no finalize (`20261007000001...sql:125-135`).
- Os testes focados (`storage.functions.test.ts:5-43`, `ai-media-jobs.functions.test.ts:5-45`) passaram 10/10, mas validam substrings. `npm run typecheck` excedeu 120s sem exit observado; não é PASS. Não houve Storage/provider/RLS/browser/deploy.

**Estado:** W9 parcial/não fechável; W7 oficial não coberta pelo pacote fornecido.

## 4. Ordenação da próxima ação respeitando dependências

1. **Preservar e congelar o estado atual (W0, sem mutação):** não fazer `reset`, `clean`, `add`, `stash`, cherry-pick, migration ou deploy. Arquivar status, HEAD/base, worktrees, remotos, PRs, checks, rulesets e datas numa worktree documental limpa. Preservar separadamente os 29 paths atuais e os 13 paths históricos.
2. **Completar o ledger W0 antes de promover qualquer finding:** mapear os 109 IDs para owner/issue, onda primária/secundária, baseline replayável, dependência, risco, artefacto/hash e estado. Ausência de replay deve ser “bloqueado”, nunca “corrigido”. Reconciliar a contradição `75b7177f` versus snapshots GitHub/Cloudflare atuais.
3. **Fechar o gate de release W1 num candidato limpo:** confirmar protection/ruleset, aprovações e teste negativo; obter logs do projeto Cloudflare correto; executar checks locais e Cloudflare no mesmo SHA; somente após ambos verdes, decidir merge e executar smoke público autorizado. Não usar PRs históricos como prova da branch local.
4. **Executar W2.1–W2.5 em ambiente autorizado:** Postgres/Supabase efémero com migrations completas, JWTs reais de usuários/stores A/B/admin, `pg_policies`/`pg_proc`/grants, service-role, RPC/SECURITY DEFINER, provider sandbox e quota/custo. W2 depende do preflight W0/W1 e bloqueia qualquer promoção de auth/RLS.
5. **Executar W3.1/W3.2 antes de alterar migrations:** aplicar from-zero sem pular; capturar catálogo/RLS/grants/functions/triggers; resolver as três colisões após snapshot. Só então reconciliar `user_daily_token_quotas`, tipos, BFF scanner e paginação real. Não incluir a migration W2 não rastreada nem `types.ts` sujo como prova.
6. **Executar W4 em DB descartável com fault injection:** canonizar FSM, atomicidade/compensação, idempotência, inbox/flow/outbox, abort/recovery/DLQ e cobrança única. W4 depende do schema/grants efetivos W2/W3; CI verde isolado não substitui a validação.
7. **Executar W5 contra provider e browser:** corrigir falso sucesso, escolher pipeline/SSE canónico, ligar ações com retorno verificável, corrigir CSV e cancelamento; testar falha, JSON vazio, retry, reload, cancel, RLS e custo. W5 depende de W4 para não duplicar writes/cobranças.
8. **Reconciliar W6 solicitado com W8 oficial:** decidir documentalmente se o escopo é Gateway IA (W6 oficial) ou Builders/Studio (W8). Para Builders, corrigir TDZ/rotas/auto-seed/owner-store e provar save/reload/publish/rollback no DB, browser e deployment. Não promover este resultado como W6 Gateway.
9. **Reconciliar W7 solicitado com W9 oficial:** decidir se o relatório deve ser W7 tabelas/catalogo ou W9 mídia. Para o escopo fornecido, corrigir Storage/URLs/namespace/limites, ordem de jobs, quota e callers; provar RLS/Storage/provider/browser/download. Não promover este resultado como W7 oficial.
10. **Somente ao final:** executar CI completo no SHA publicado, incluindo gates específicos de DB/browser quando adicionados; confirmar deployment object, URLs, secrets/bindings e smoke público no mesmo SHA; atualizar ledgers por onda com evidência positiva e negativa. Nenhuma fase deve fechar por herança de documento histórico.

## 5. Bloqueios transversais

### Integração, banco, provider e Storage

- Não foi executado Postgres/Supabase efémero, `db reset`, `db lint`, aplicação from-zero, consulta de `pg_policies`, `pg_proc`, grants, `storage.objects` ou `auth.uid()`.
- Não houve JWT real de dois tenants, RLS efetivo, service-role auditado, RPC live, provider IA/OCR/WhatsApp/Gov.br/OpenAI/Recraft, quota/saldo/cobrança, Storage real ou verificação de URL expirada.
- Migrations com colisões e ordem quebrada impedem tratar SQL versionado como schema aplicado. Policies escritas não provam isolamento.

### Browser/E2E

- Não foi observado Playwright/Cypress/Chromium nem harness autenticado. Não há prova de login, reload, nova sessão, deep links, 403/empty cross-tenant, Copilot/chat, SSE/delta/error/retry/cancel, Builder save/publish/rollback, Studio reopen, preview/download ou mídia expirada.
- Os testes citados são Vitest Node, mocks, in-memory ou inspeção textual. O masterplan registra explicitamente a ausência de browser/E2E (`WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md:2483-2511`).

### CI, merge e deploy

- `.github/workflows/ci.yml:33-46` executa typecheck, design lint, testes, build e dead-code; não executa Postgres/RLS, provider, Storage, browser E2E ou smoke público.
- Checks SUCCESS no SHA `919c8688` são condição necessária, não prova semântica de qualquer onda. PRs antigos têm Cloudflare FAILURE; PR #19 verde permanece OPEN/CLEAN; não existe PR desta branch.
- Não foi apresentado deployment object para o SHA atual, nem smoke público de `usewaesy.pages.dev`/`waesy.com.br`. Cloudflare exige check/deploy/smoke observados no SHA correto (`docs/audits/CLOUDFLARE_PAGES_RELEASE.md:41-48,67-96`).

## 6. Metodologia, limites e falhas de agentes

### Metodologia

- Consolidação exclusivamente dos resultados fornecidos; **não foi feita nova investigação**.
- Evidência foi classificada por nível: leitura de código/SQL, teste local, integração DB/provider/Storage, browser, CI, merge e deploy/produção. Um nível não promove outro.
- Foram preservadas as referências de paths e linhas recebidas, incluindo masterplan, ledgers, specs, workflows, serviços, migrations e testes.
- Relatórios/ledgers históricos foram tratados como históricos. Claims como “closed”, “FULLY_VALIDATED”, “CI pass” ou “Cloudflare success” não foram herdados sem replay no SHA exato e sem reconciliar a temporalidade.
- Nenhum código foi alterado, nenhuma migration foi aplicada e nenhum deploy/provider/browser foi executado para produzir este documento.

### Limitações explícitas

- O snapshot da branch é conhecido apenas no estado fornecido: `919c8688`, worktree suja e sem PR. Não se deve inferir que os 29 paths sejam os mesmos 13 paths históricos.
- Não há reconciliação independente dos PRs/checks/rulesets após os snapshots recebidos; estados GitHub/Cloudflare podem ter mudado e devem ser recapturados no W0.
- W6 e W7 têm discrepância de nomenclatura: o resultado fornecido para W6 é Builders/Studio (W8 oficial) e o de W7 é imagem/mídia (W9 oficial). W6 Gateway e W7 tabelas/catalogo permanecem lacunas de cobertura neste pacote.
- Testes focados verdes são evidência local limitada. O typecheck que excedeu 120s sem código de saída não é PASS.

### Falhas de agentes como lacunas

O campo recebido foi `Falhas: []`; portanto, **não foi fornecido nenhum registo de falha de agente**. Isso não deve ser interpretado como “agentes sem falhas” nem como validação positiva. A ausência de logs de falha, handoffs, tentativas, outputs brutos, ambientes e motivos de bloqueio é uma lacuna de auditoria: deve ser registada no ledger W0 como “não informado/desconhecido”, com owner e artefacto a obter. Em particular, não há base para inferir que uma tarefa não executada por agente tenha sido executada por outro, nem para atribuir a um agente um check verde que não corresponda ao SHA e ao escopo auditado.

## 7. Fontes principais recebidas

- `AGENTS.md:71-80,82-87,147-151`.
- `skills/waesy-integrity-auditor/SKILL.md:16-24,34-40,49-64,66-79`.
- `skills/waesy-integrity-auditor/references/waesy-evidence-ledger-template.md:5-15,22-26,28-43,45-65`.
- `docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md:17-26,84-115,117-151,153-198,297-317,332-340,903-973,1053-1220,1518-1554,1924-1940,2427-2511`.
- `docs/audits/20261007-holistic-execution-ledger.md:3-29` e o ledger histórico em `git show 75b7177f`/`f6833abd` nas linhas indicadas acima.
- `docs/audits/20261007-W2-CONTINUITY-REVALIDATION.md:5-7,15-27,44-59`.
- `docs/audits/W3_SCHEMA_DRIFT.md:3-17`, `docs/specs/SPEC-W3-SUPABASE-TYPES.md:7-18`.
- `docs/specs/SPEC-W4-PERSISTENCE-IDEMPOTENCY.md:3-26`, `docs/specs/SPEC-W5-COPILOT-CHAT-E2E.md:3-21`, `docs/specs/SPEC-20261007-BUILDER-VERSIONED-OMNI-PERSISTENCE.md:4-28`.
- `docs/audits/CLOUDFLARE_PAGES_RELEASE.md:7-48,67-96`, `docs/audits/PRODUCTION_READINESS_2026-10-06.md:9-14,45-65`.
- Paths de código/migration/teste citados nas secções W2–W7; todos devem ser revalidados no SHA candidato antes de qualquer promoção.

**Conclusão:** o próximo artefacto obrigatório é um ledger W0 imutável e reconciliado, não um merge, migration ou deploy. Até que as dependências acima sejam executadas e anexadas com evidência por nível, W0–W7 devem permanecer abertas/bloqueadas.


## 8. Adenda de continuação — W2.7.2 e estado do pacote local

**Corte:** 2026-10-07, 21:45 UTC−03:00. Esta secção atualiza as observações temporais das secções anteriores; não promove a branch a produção.

### Evidência W2.7.2

- A migration `20270115000000_contract_seal_atomic_authorization.sql` foi aplicada **apenas** em `waesy_w272_test`, uma base PostgreSQL local descartável com stubs mínimos do schema. `postgres_transaction_tests=PASS`: selagem com dois signatários persistidos em `pending`; rejeição independente de criador errado e store errado; rejeição de snapshot obsoleto de `signature_fields`; contrato `completed` e versão não corrente rejeitados; falha injetada no segundo `INSERT` reverteu selo, estado e primeiro envelope.
- A RPC usa locks na ordem versão→contrato, revalida criador/tenant/estado/conteúdo/cláusulas/campos sob lock e grava versão, estado e envelopes na mesma transação. O BFF usa `requireStaff()`, predicados de criador/store, valida retorno e constrói links apenas de envelopes retornados. A migration continua **não aplicada** a Supabase/produção; a base não executou o conjunto completo das migrations, JWT ou RLS reais.
- `npx vitest run src/services/*security.test.ts`: **10 ficheiros, 64 testes aprovados**. `npm run typecheck`: **exit 0**. `npm run build`: **exit 0**, worker Cloudflare gerado e verificação de fuga cliente/servidor passou; avisos de bundler sobre exports de rotas e `sideEffects` permanecem registados.
- `npm run lint:design`: exit 0 em modo `--ratchet`, débito reduzido em **537**. O relatório atualiza `design-lint.report.json` e `docs/design/LINT_DASHBOARD.md`, mas ainda reporta **13.755 violações**, incluindo **1.524 P0** e **9.585 P1**; o ratchet verde não satisfaz o DoD de zero P0/P1 em `AGENTS.md` e não autoriza merge/produção.
- Encontrados dois writers alternativos a envelopes: `generateContractFromOrder` (`src/services/contracts.functions.ts:1461`) e `generateContractFromDeal` (`:1632`) fazem inserts diretos em sequências de writes separadas, sem passar por `seal_and_issue_contract`. Estão registados como W2.7.2-F05/P1 e **não foram alterados** nesta microfase; requerem spec própria de autorização e atomicidade.

### Estado global do plano e pendências

O masterplan versionado declara **18 ondas, W0–W17** (não há cartão W18 no ficheiro), com 81 microfases. O relatório continua a cobrir a prontidão W0–W7; para W8–W17, a existência de código ou relatórios históricos não foi tratada como fecho de auditoria nesta execução.

| Prioridade | Pendência que bloqueia o fecho |
|---|---|
| **P0 — W0** | Criar o ledger formal 109/109 com owner, baseline, dependências, risco e artefacto; reconciliar os 13 paths históricos, snapshots e worktrees. |
| **P0 — W1/W17** | Obter checks obrigatórios (Quality Gates e Cloudflare Pages) verdes no mesmo SHA candidato, validar ruleset/proteção com teste negativo, revisão, deploy do SHA correto e smoke/rollback. O build local não é prova de deploy. |
| **P0 — W2/W3** | Completar matriz endpoint×identidade×role×tenant; rever policies `USING(true)`, grants e service-role; resolver GOV-ID-01 com decisão de produto sobre CPF previamente associado; aplicar migrations completas desde zero e testar JWT A/B/RLS/tipos. |
| **P1 — W2.7.2-F05** | Criar correção transacional própria para os writers de contrato a partir de encomenda e negócio, com testes de falha entre writes. |
| **P0/P1 — W4–W16** | Executar as microfases do masterplan para FSM/idempotência, Copilot/chat/Gateway, tabelas/catálogo, Builders/Studio, imagem/Storage, rotas, WhatsApp, turismo, design, testes, observabilidade e jornadas E2E; não foram fechadas por esta branch. |
| **P0 — W17** | Manter release bloqueada até dependências, CI, Cloudflare, aprovação e smoke público estarem comprovados. Nenhum merge ou deploy foi feito nesta execução. |

**Limites do pacote:** os testes PostgreSQL foram executados a partir de scripts temporários em `/tmp`, não são ainda um harness versionado; não houve browser E2E, Supabase/RLS real, CI da branch, deployment, smoke público, merge ou aplicação de migration remota. A decisão de GOV-ID-01 continua pendente e não foi presumida.


### Gates locais finais antes da publicação da branch

- `npm test`: **243 ficheiros, 1.581 testes aprovados**.
- `npm run typecheck`: **exit 0**; `npm run build`: **exit 0**, worker Cloudflare e client-leak check concluídos, com avisos de bundler não fatais.
- A varredura simples de padrões de segredos nos paths alterados não encontrou correspondências. O `git diff --check` dos diffs rastreados passou, mas após staging completo `git diff --cached --check` identificou espaços finais em linhas Markdown de vários specs/ledgers; o achado fica documentado e não foi normalizado nesta operação de publicação.
- `npm run lint:design`: ratchet **PASS**, mas o débito permanece em 13.755 (1.524 P0 e 9.585 P1); não satisfaz o critério de produção de zero P0/P1.
- A suite PostgreSQL é um fixture mínimo temporário em `/tmp`, não harness versionado. A revisão adversarial e os checks GitHub/Cloudflare do SHA publicado ainda são gates de PR; nenhum merge/deploy foi autorizado.


## 9. Adenda de revisão adversarial independente — blockers W2.7.2

A revisão read-only confirmou **nenhum P0 adicional** no caminho canónico `sealAndIssueContract`, mas concluiu que a W2.7.2 não deve ser apresentada como fecho end-to-end nem como pronta para merge. Findings confirmados ou condicionais:

| ID | Severidade/certeza | Finding e evidência | Fecho exigido |
|---|---|---|---|
| W2.7.2-F05 | P1 confirmado | `generateContractFromOrder` e `generateContractFromDeal` escrevem contrato/versão/envelope em chamadas separadas fora da RPC; falhas posteriores podem deixar estado parcial. O token Order é bearer e a semântica de actor/creator precisa de decisão; Deal verifica buyer/seller mas não grava `store_id`. | Corrigir atomicidade, erros, owner/tenant, envelope e hash em microfase própria; testar fault-injection. |
| W2.7.2-F06 | P1 confirmado | A RPC valida apenas formato de 64 hex e persiste o argumento, sem recomputar hash sobre o snapshot bloqueado. Order/Deal hasheiam só Markdown; selagem canónica inclui também JSON de clauses/fields. Verificação pública valida formato/estado, não re-hasheia bytes. | Definir serialização canónica e recalcular/verificar no boundary confiável; alinhar todos os writers e leitores. |
| W2.7.2-F07 | P1 condicional | Policies legadas `FOR ALL` de `contracts`, `contract_versions`, `signature_envelopes` existem no schema; a nova migration restringe EXECUTE da RPC, mas não revoga DML de tabelas. Trigger atual não bloqueia todos os inserts/updates durante `signing`. Grants efetivos e exploração via PostgREST não foram verificados. | Inspecionar `pg_policies`/grants/RLS com roles reais; revogar DML ou fechar via guardas e provar com `SET ROLE`. |
| W2.7.2-F08 | P1 confirmado estaticamente | `settleContractAndIssueDischarge` exige identidade, mas atualiza por `contractId`, sem filtro de creator/store/papel ou precondição de estado. Grants/RLS reais são desconhecidos. | Autorizar por tenant/role e status, com transação/teste negativo A/B. |
| W2.7.2-F09 | P2 confirmado | `updateContractDraft` atualiza metadados por `id+creator_id` sem verificar store/status, mesmo se a versão não selada já estiver bloqueada; resposta perdida pós-commit também não tem reconciliação idempotente específica. | Tornar metadados coerentes/imutáveis após selagem e definir recuperação idempotente de timeout. |
| W2.7.2-F04 | P1 de especificação | A RPC compara o `signature_fields` base carregado, mas pode gravar `finalFields` diferente quando explicitamente enviado; o fluxo pode ser intencional, porém a semântica e validação do schema final não estão definidas/testadas. | Decidir se a edição final é autorizada e adicionar validação e teste de divergência esperada/final. |

A integração executada prova rollback e autorização da **RPC específica** num schema fixture local; não cobre esses caminhos alternativos, grants/RLS, hash adulterado, concorrência entre chamadas PostgREST ou o replay completo de migrations. A PR será aberta em estado draft por instrução do utilizador, com esses itens visíveis como blockers; nenhum merge ou deploy será feito.


**Limite de revisão do pacote:** a revisão focada read-only de W2.7.2 concluiu e produziu os findings F05–F09. Uma segunda tentativa de leitura integral dos 35 paths staged terminou antes de gerar conclusões; não há sign-off abrangente do diff. A descrição da PR deve preservar esta ressalva e requer revisão humana/CI antes de qualquer merge.
