# W12 — Integrações reais, browser, staging e prontidão de produção

**Data da auditoria:** 2026-10-07  
**Repositório:** `EduardoChapeco/waesy`  
**Branch auditada:** `audit/full-remediation-20261007`  
**HEAD:** `fc8f9fc3` (`audit: make voucher document apply atomic`)  
**Base declarada na spec:** `origin/main` em `919c8688`  
**Masterplan:** `docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md` (W12, linhas 223–233)  
**Spec ativa:** `docs/specs/SPEC-20261007-FULL-REMEDIATION-EXECUTION.md`  
**Escopo:** somente inventário/auditoria. Nenhum arquivo de código, migration, configuração ou commit foi alterado.

## 1. Veredito executivo

**W12 permanece aberto e não pode ser promovido a integração real, staging validado ou produção pronta.** Há implementação substancial e alguns endurecimentos recentes no caminho turístico, mas a evidência disponível é predominantemente de código e testes Vitest que leem arquivos ou usam doubles. Não existe nesta branch prova observada de: migrations aplicadas desde zero em Postgres/Supabase representativo; RLS exercitada por JWT/roles reais; provider OCR/operadora real; storage real; corrida concorrente de assentos; artefato produzido e reaberto no browser; staging acessível com sessão/dados; CI no SHA atual; deployment confirmado; ou smoke test público.

Os commits locais `fe0417ae` e `fc8f9fc3` adicionaram/hardenizaram aceite público, conversão e aplicação atômica de voucher. Isso é **histórico de mudança no código atual**, não prova de integração. A própria migration atômica declara explicitamente que não executa booking de provider, captura de pagamento, Pix ou reserva externa (`supabase/migrations/20270119000000_p0_atomic_voucher_apply.sql:1-7`).

**Classificação global:** código parcialmente implementado; testes locais focados aprovados; integração banco/provider/browser/staging/produção **não verificada**. O status correto é remediação em andamento, conforme a regra global da spec (`SPEC-20261007-FULL-REMEDIATION-EXECUTION.md:41-43`).

## 2. Estado Git e risco de mistura de branches

### Evidência confirmada

- `HEAD` local é `fc8f9fc3`, à frente de `origin/main` (`919c8688`) por mudanças de remediação turística/P0. O worktree já continha artefatos não rastreados de auditoria (`docs/audits/LEDGER-20261007-FULL-REMEDIATION.md`, `docs/audits/full-remediation-inventory/`, a spec), preservados; não houve `git add`, reset, cherry-pick ou alteração de código nesta auditoria.
- O branch também aparece apontado por `audit/p0-public-acceptance-conversion-20261007`, portanto esse ref não deve ser tratado como uma linha independente sem reconciliação.
- Branches remotas relacionadas divergem materialmente: `origin/docs/waesy-holistic-remediation-2026-10-06` em `a57eda21`, `origin/chore/recover-waesy-task-2026-10-06` em `8e1b2c49`, `origin/audit/recursive-p0-remediation` em `c1f9615b` e `origin/feat/waesy-canonical-travel-evolution` em `05ee9845`. O diff contra cada uma inclui centenas de paths e não foi incorporado automaticamente.
- O histórico de W12 inclui pelo menos `173e28ee` (pipeline canônico), `bf592dd8` (commission/OCR workbench), `8d819ff1` (sync de operador), `7e4d0fde` (reconciliação documental), `fe0417ae` e `fc8f9fc3`. “Existe commit” é evidência histórica de intenção/implementação, não de execução em ambiente real.

### Risco operacional

Não fazer merge/cherry-pick de branches de recuperação, P0, evolução turística ou documentação sem comparar path ownership, migrations e IDs. Em especial, a migration `20270119000000_p0_atomic_voucher_apply.sql` declara que não toca a migration paralela de catálogo de outra branch (`:1-5`); aplicar ambas por cópia seletiva pode mudar a ordem/estado do schema. Antes de qualquer promoção, congelar SHA, base, status, migration history do banco alvo e checks desse mesmo SHA.

## 3. Matriz W12 contra o masterplan

| Microfase | O que o código mostra | Nível de evidência atual | Gate faltante / decisão |
|---|---|---|---|
| **W12.1 Schemas e RLS vivos** | Handlers usam `requireStaff`, filtros `store_id` e RPCs; a migration cria tabela de idempotência, habilita RLS, revoga grants públicos e concede a função apenas a `service_role` (`20270119000000...sql:9-40,357-358`). | **Confirmado no código/SQL; não verificado no banco instalado.** | Aplicar todas as migrations em Postgres efêmero/ambiente representativo; comparar histórico do Supabase; testar anon/authenticated/staff/tenant alheio/admin/service role com JWT real. `SECURITY DEFINER` + `row_security = off` (`:35-40`) exige revisão adversarial do controle manual de tenant e grants efetivos. |
| **W12.2 OCR/reconciliação** | `ingestTravelDocument` cria ingestion com tenant, hash de conteúdo e estado `processing`, chama extrator, persiste payload canônico/revisável e grava `failed` em erro (`travel-canonical-pipeline.functions.ts:46-141`). Aplicação exige revisão, tenant e chave determinística (`:228-271`). | **Confirmado no código; teste local apenas estrutural. Provider/storage/provenance e UI→provider→storage→write não verificados.** | Fixture anonimizada no browser e banco real; provar upload/MIME/ownership/storage, provider real, provenance, revisão, aplicação, reload e histórico. Testar falha entre insert/extraction/update e retry. |
| **W12.3 Reserva/assento/comissão/ledger** | Há lock/idempotência e `FOR UPDATE` na aplicação de voucher (`20270119000000...sql:86-101,151-159`); o caminho evita conflito crítico (`:141-149`) e escreve passageiros/itens. Existem serviços de booking e comissão, mas os testes observados de booking/split são cálculo/schema local, e `commission.functions.ts` faz updates/inserts separados. | **Parcial no código; concorrência de assentos, FSM transacional de reserva e reconciliação ledger não verificados.** | Dois workers simultâneos contra Postgres real; constraint única/lock de assento; rollback/fault injection; reconciliar cada write e ledger após reload. Não promover `travel_voucher_apply_atomic` como reserva externa: a própria migration exclui provider booking e pagamento. |
| **W12.4 Builders/documentos** | Há templates/componentes de proposta/voucher e `exportStaticHtml` em `src/services/builder-exporter.ts:10-85`; criação de contrato usa RPC transacional e valida retorno (`src/services/travel-contract.functions.ts:295-354`). | **Confirmado como superfícies/código; produção de PDF/HTML, abertura browser, dados persistidos, versão/provenance não verificados.** | Jornada create → save → reload → edit → publish → URL pública; abrir PDF/HTML em Chromium; verificar versão, tenant, conteúdo persistido e erro de export/deploy hook (`builder-exporter.ts:94-123`). |
| **W12.5 Externa/recovery** | O pipeline chama `processOperatorQuoteOcr`/`parseOperatorVoucherAI` (`travel-canonical-pipeline.functions.ts:5-6,77-97`), mas isso não prova provider real. A migration não chama operadora, pagamento ou reserva externa (`20270119000000...sql:1-7`). | **Não verificado; ausência de prova de provider real/staging.** | Provider sandbox/credencial autorizada, timeout, cancelamento, webhook assinado, replay, backoff, dead-letter/reprocessamento e observabilidade por correlação. Mocks/doubles devem ser identificados como tais. |

## 4. Findings estáveis

### W12-PROD-01 — Não há prova de integração viva de banco/RLS

**Estado:** confirmado como lacuna de evidência; não afirmar defeito de produção sem replay.  
**Prova:** a migration define controles e função `SECURITY DEFINER` com `SET row_security = off` (`supabase/migrations/20270119000000_p0_atomic_voucher_apply.sql:27-40`), enquanto o teste `travel-w12-integrity.test.ts` apenas lê o texto dos arquivos (`:5-10,30-37`). Não há no escopo observado harness que aplique migrations em Postgres e rode os papéis/tenants reais.  
**Risco:** um grant/policy efetivo diferente do SQL esperado, membership indevido ou falha no controle manual pode permitir cross-tenant ou bloquear o fluxo.  
**Critério de fechamento:** snapshot de schema alvo + migration history reconciliado; testes anon/authenticated/staff/tenant A/B/admin/service role; prova de linha afetada e read-back; resultado anexado ao ledger.

### W12-PROD-02 — Teste W12 é structural/source test, não teste end-to-end

**Estado:** confirmado.  
**Prova:** `src/services/travel-w12-integrity.test.ts:5-10` carrega fontes como strings e `:13-37` usa `toContain`/`not.toContain`; não há chamada de handler, provider, Supabase, Storage, browser ou reload. A execução atual passou **32 testes em 5 arquivos**, mas isso certifica somente os doubles/contratos locais dos testes focados.  
**Risco:** código pode satisfazer o texto esperado sem executar OCR, persistir uma linha, respeitar RLS ou renderizar sucesso honesto.  
**Critério de fechamento:** regressão funcional com fixture; mock de falha; banco efêmero; Playwright autenticado; read-back/reload; revisão adversarial.

### W12-PROD-03 — OCR tem persistência/revisão, mas provider e storage reais não estão provados

**Estado:** código confirmado; integração não verificada.  
**Prova:** `travel-canonical-pipeline.functions.ts:55-69` insere ingestion, `:77-103` chama extrator e normaliza, `:105-120` atualiza canonical payload/review state, `:130-140` tenta marcar falha. O input é `fileBase64`/`rawText` (`:19-30`), mas a implementação lida diretamente com o conteúdo e não demonstra upload a Storage, MIME/ownership de objeto, URL assinada ou retenção.  
**Risco:** sucesso parcial entre ingestion, provider e update; arquivo sensível em payload/log; extraction provider configurado mas indisponível; retry duplicando ingestion.  
**Critério de fechamento:** fixture anonimizada passa por UI, Storage, provider sandbox/real autorizado, normalized payload, review e apply; erro em cada fronteira deixa estado recuperável e sem falso sucesso.

### W12-PROD-04 — Aplicação atômica de voucher não equivale a reserva/assento/operadora

**Estado:** confirmado no contrato da migration; gaps de W12.3/W12.5 permanecem abertos.  
**Prova:** comentário explícito da migration (`:4-7`); a função usa advisory lock/idempotency e `FOR UPDATE` (`:86-108`), mas cria/atualiza `tourism_trips`, passageiros e itens locais. Não há chamada a API de companhia, hold/confirm de assento, webhook de operadora ou compensação externa.  
**Risco:** UI pode interpretar `success` local como confirmação de uma reserva externa.  
**Critério de fechamento:** estados separados `draft/held/confirmed/failed` por provider, locator externo verificável, webhook/replay e teste concorrente; nunca marcar reservado por apenas uma escrita local.

### W12-PROD-05 — Comissão/ledger não tem prova de reconciliação transacional completa

**Estado:** lacuna confirmada; possível risco de persistência parcial, ainda não reproduzido em banco real.  
**Prova:** `src/services/commission.functions.ts` lista/atualiza com queries separadas e chama `recordLedgerEntryCore` em bloco posterior (linhas 40-79 e 81-129); `saveTripCommission` usa update ou insert separado (`:209-224`). Os testes de `booking-resources-and-order-split.test.ts` são cálculo em memória, sem banco/concurrency.  
**Risco:** comissão marcada paga sem ledger, ledger sem comissão, replay duplicado, tenant/ator incorreto ou rate divergente do contrato turístico.  
**Critério de fechamento:** RPC/transaction com constraint/idempotency; fault injection entre writes; ledger read-back e reconciliação por trip/order/provider; teste de retry e concorrência.

### W12-PROD-06 — Browser, staging, CI candidato e deploy público não verificados

**Estado:** confirmado como ausência de evidência atual; claims históricos rotulados históricos.  
**Prova:** `docs/audits/PRODUCTION_READINESS_2026-10-06.md:9-14,45-65` registra que produção não estava confirmada, Cloudflare falhava e faltavam deploy/smokes no SHA histórico `4b76520`. `docs/audits/CLOUDFLARE_PAGES_RELEASE.md:48,67,77,81,85-94` descreve correções/configuração esperada, mas exige observar novo deployment e check no SHA candidato. O workflow `.github/workflows/ci.yml:33-56` só executa typecheck, design lint, testes, build e dead-code; não há Playwright, Postgres/RLS, provider, staging smoke ou Cloudflare gate nesse YAML.  
**Risco:** build verde pode coexistir com rota quebrada, sessão incorreta, erro de hydration, cache público de dados privados, falha de provider ou deploy inexistente.  
**Critério de fechamento:** staging URL/commit/SHA; Playwright desktop/mobile com sessão e tenants; requests/responses/console; reload; smoke de worker e rotas; check CI/Cloudflare verde no mesmo SHA; deploy e domínio confirmados pelo provedor.

## 5. Dependências e bloqueios

1. **Banco representativo:** aplicar migrations desde zero e comparar migration history do destino antes de qualquer rollout; a prontidão não pode ser inferida de SQL versionado.
2. **Credenciais/provider:** OCR/operadora/Storage sandbox ou credenciais explicitamente autorizadas; sem elas W12.2/W12.5 ficam bloqueadas, não “passam com mock”.
3. **Browser/staging:** URL de staging, contas/fixtures por role e tenant, seed anonimizado, Chromium/Playwright e acesso a logs.
4. **Release governance:** check Cloudflare e CI do SHA exato; não usar status de PR ou relatório histórico como sucesso atual.
5. **Contrato de produto:** definir claramente se a aplicação de documento cria apenas estado local ou confirma reserva externa; definir estados, comissão, refund/compensação e provenance do artefato.
6. **Migrations paralelas:** comparar `origin/main`, branches de recuperação/P0/evolução e todas as migrations W12 antes de cherry-pick; não usar `git add -A` no worktree contaminado.

## 6. Microfases atômicas propostas e gates

### M12.0 — Congelamento e inventário de ambiente

**Paths de leitura:** `AGENTS.md`, skill, masterplan W12, spec, `git` refs, migrations e ledger.  
**Ação:** fixar SHA candidato, base, worktree, migration history do alvo, URL/branch de staging, contas e provider matrix.  
**Gate:** ledger registra estado antes de qualquer mutação; nenhum branch paralelo incorporado; checks e ownership reconciliados.

### M12.1 — Schema/RLS real desde zero

**Paths autorizados para execução:** migrations W12 e harness de integração, não runtime de produto inicialmente.  
**Ação:** Postgres efêmero, migrations em ordem, dump de tabelas/funções/policies/grants; testar `apply_operator_voucher_atomic` e RPCs públicas por role/tenant.  
**Gate:** schema compila; nenhuma policy/grant inesperado; cross-tenant negado; read-back e rollback provados; `row_security=off` justificado pelo controle explícito e revisão adversarial.

### M12.2 — OCR/Storage/provenance/review

**Ação:** fixture sem PII passa UI de upload → Storage → provider autorizado → ingestion/reconciliation → revisão → aplicação; injetar provider timeout, MIME inválido, Storage failure e erro de update.  
**Gate:** objeto possui owner/tenant/MIME/provenance; status é observável (`processing/needs_review/failed/applied`); não há toast/sucesso sem linha e leitura posterior; retry não duplica ingestion.

### M12.3 — Reserva, assento, comissão e ledger

**Ação:** modelar estados locais versus externos; executar duas confirmações concorrentes, replay, falha entre writes e tenant adverso em Postgres real; validar constraints/RPC/ledger.  
**Gate:** no máximo um assento confirmado; todos os efeitos obrigatórios são atômicos ou compensáveis; comissão/ledger reconciliados por chave idempotente; estado não avança sem provider confirmation.

### M12.4 — Builder/documento e browser

**Ação:** create → save → reload → edit → publish → abrir URL; gerar PDF/HTML, abrir no Chromium desktop/mobile e validar conteúdo, version/provenance, tenant e erro de export/deploy hook.  
**Gate:** artefato não é placeholder; dados sobrevivem reload; deep link e autorização corretos; console/network sem falha crítica; loading/empty/error/success honesto.

### M12.5 — Provider/recovery/webhook

**Ação:** provider sandbox/operadora autorizada com timeout, retry/backoff, cancelamento, callback atrasado/reordenado, assinatura inválida e dead-letter/reprocess.  
**Gate:** cada estado possui correlação e observabilidade; replay idempotente; falha externa reprocessável; nenhum mock apresentado como integração real.

### M12.6 — Staging e release candidate

**Ação:** publicar somente após gates anteriores, registrar SHA, URL, deployment ID, logs e secrets presentes sem expô-los; rodar Playwright e smoke HTTP SSR.  
**Gate:** CI completo + Cloudflare success no mesmo SHA; staging browser por anon/civil/staff/owner/admin e tenant A/B; reload/cache/cookies/headers válidos; somente então abrir decisão de produção.

### M12.7 — Produção autorizada e auditoria adversarial

**Ação:** deploy somente com autorização explícita; smoke público mínimo, observabilidade e rollback plan; refutar cada finding com teste positivo/negativo.  
**Gate:** domínio/deployment confirmado pelo provedor, métricas/logs sem erro de W12, read-back público seguro, matriz 100% classificada. Sem autorização ou provider confirmation, permanecer bloqueado.

## 7. Conclusão

A branch atual demonstra avanço de implementação, sobretudo no isolamento/aceite público e na aplicação atômica de documentos, e os testes focados executados passaram. Isso não satisfaz W12: os gates do masterplan exigem banco/RLS vivos, provider/storage reais, concorrência, artefatos abertos no browser, recovery e staging/deploy observados. Portanto, **não marcar W12 como corrigido, integrado, verificado no browser ou pronto para produção**. O próximo trabalho seguro é M12.0→M12.1, mantendo os findings de provider/browser/staging/produção explicitamente pendentes.
