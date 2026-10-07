# Ledger de Evidências — Onda Storage, pagamentos, UI e vitrines

## Snapshot e escopo

- Data/hora: 2026-10-07T11:44:00-03:00
- Repositório: `EduardoChapeco/waesy`
- Branch/HEAD: `main` / `21b5c34368c795c83759f1801e76365025c10e3a`
- Base remota comparada: `origin/main` no mesmo SHA
- PR(s) e estado/checks: PR #16 merged; PRs abertos históricos #5, #6 e #7 fora do escopo e não serão alterados
- Worktree inicial: limpo (`## main...origin/main`); nenhum path preexistente a preservar
- Ambiente: Sandbox Ubuntu 24.04, Node 22, Supabase project `jfuebqmltksyznovhlwa`; browser E2E real e provider financeiro real não executados ainda
- Escopo incluído: `src/services/storage.functions.ts`, `src/services/payment*.ts`, `src/services/checkout.functions.ts`, rotas e componentes de perfil/vitrine canônicos, testes, spec e ledger
- Escopo excluído: SimLab, módulos sem relação direta com Storage/pagamentos/vitrine, alterações destrutivas de dados, credenciais e deploy manual

## Preflight de leitura por microfase

| Onda.microfase | AGENTS/skill/plano lidos | Paths lidos | Hash inicial | Ação autorizada | Leitura antes de mutar |
|---|---|---|---|---|---|
| W16.3/W9.2/W14.2 | `AGENTS.md`, skill, template, plano W9/W16/W17, spec ativa | storage.functions.ts, storage.functions.test.ts, migrations Storage | 21b5c343 | spec, testes e correção de contrato Storage | sim |
| W16.1/W14.2 | mesmos documentos | payment.functions.ts, payment-gateway.server.ts, checkout.functions.ts, checkout tests | 21b5c343 | testes e correção de integridade financeira | sim |
| W16.5/W13.2 | mesmos documentos + `docs/design/DESIGN.md` e `DESIGN-LINT.md` pendentes de leitura na microfase visual | canonical-store-profile-view.tsx, experience-renderer.tsx, `_store.loja.$slug.tsx`, `_store.diretorio.$id.tsx`, rails e testes | 21b5c343 | nativização e data-driven visibility sem perda visual | sim |

## Findings e estado de prova

| ID | Severidade | Estado | Path(s) | Reprodução baseline | Causa-raiz | Correção | Prova depois | Revisão adversarial |
|---|---|---|---|---|---|---|---|---|
| INT-STORAGE-01 | high | confirmado | storage.functions.ts:221-233,380-394,510-524,579-593 | inspeção confirma createBucket em runtime | auto-healing público no BFF | remover criação runtime; bucket ausente falha explícita | pendente | remover bucket no teste deve falhar, sem criar |
| INT-STORAGE-02 | high | confirmado | storage.functions.ts:163-178,239-245,286-290,334-339,599-633 | inspeção confirma getPublicUrl em vários fluxos | contratos antigos não distinguem privado/público | URL assinada para objetos privados; persistir somente URL compatível com bucket | pendente | negar leitura cross-tenant e testar expiração |
| INT-STORAGE-03 | medium | confirmado | storage.functions.ts:117-136 vs 26-45 | enum e allowlist divergentes | duas fontes de contrato | unificar lista canônica e teste | pendente | testar cada bucket permitido e proibido |
| INT-PAY-01 | high | confirmado | payment-gateway.server.ts:61-69 | 2xx sem id produz ref vazia | parsing aceita resposta incompleta | rejeitar payload sem id/provider status reconhecido | pendente | 2xx malformed, 4xx, timeout |
| INT-PAY-02 | high | confirmado | payment.functions.ts:218-229 | ref sintética criada localmente | bypass legado usa marcador fake | provider_ref nulo para manual ou comprovante externo real | pendente | replay e confirmação sem ref |
| INT-PAY-03 | high | confirmado | checkout.functions.ts:84-104 | sem store retorna config hardcoded | fallback comercial global | retorno `unconfigured`/config mínima não comercial ou exigir store | pendente | sem store e store incompleta |
| INT-PAY-04 | medium | confirmado | checkout.functions.ts:390-396 | erro de frete continua checkout | warning não bloqueante | provider configurado falha deve retornar erro explícito; apenas pickup/manual não chama provider | pendente | provider 500 e retry |
| INT-UI-01 | high | confirmado | canonical-store-profile-view.tsx:188-194,326-328 | dados ausentes recebem cidade/estado/horário | defaults de UX tratados como dados | estado vazio/omitido | pendente | perfil sem campos |
| INT-UI-02 | high | confirmado | loaders públicos citados | catch devolve arrays vazios | erro indistinguível de ausência de dados | loader retorna erro observável e UI não publica se fonte crítica falhar | pendente | erro BFF vs dataset vazio |
| INT-UI-03 | medium | confirmado | canonical-store-profile-view.tsx:117-136 | localStorage reidrata seções | cache local tratado como fonte | somente props persistidas são canônicas; cache apenas draft do owner | pendente | reload anônimo após cache |
| INT-UI-04 | medium | confirmado | experience-renderer.tsx e rails | aliases/fallbacks legacy no caminho canônico | bridges acumulados | adapter único normaliza DTO antes do renderer; componentes recebem props canônicas | pendente | remover campo legacy deve ser detectado |
| INT-UI-05 | medium | confirmado | _store.diretorio.$id.tsx:151-168 | catálogo oficial vazio cai em classificados/mining | fallback mistura proveniência | omitir catálogo oficial; fontes alternativas têm superfície explicitamente distinta | pendente | loja sem catálogo oficial |

## Gates e resultados

| Comando | SHA | Resultado | Evidência | Não prova |
|---|---|---|---|---|
| snapshot git status/log | 21b5c343 | pass | worktree limpo e main sincronizado | não prova provider/Storage real |
| rg forensic inventory | 21b5c343 | findings acima | outputs salvos em `/home/ubuntu/terminal_full_output/` | não prova comportamento browser |
| typecheck/lint/test/build | — | not run nesta onda | — | — |

## Bloqueios e decisões

- Provider Mercado Pago real não foi chamado nesta fase; testes de fronteira usarão respostas HTTP discriminantes, sem declarar integração de produção.
- Supabase Storage remoto não será alterado nesta fase sem migration/autoridade e prova de rollback.
- O nome/categoria/horário da empresa não será inferido quando ausente.
- Uma aba ausente por falta de dados é comportamento requerido; não será substituída por empty card comercial.

## Fechamento

- Findings fechados: nenhum ainda.
- Findings abertos: INT-STORAGE-01..03, INT-PAY-01..04, INT-UI-01..05.
- Paths alterados: somente esta spec e este ledger até o início da implementação.
- Commit/PR final: pendente.
- Merge/deploy: não declarar antes de observar diretamente.
- Revisão adversarial: pendente; será executada após cada microfase.

## Fechamento observado da implementação

- Testes: `npx vitest run src/services/storage.functions.test.ts src/services/integrity-wave-20261007.test.ts --reporter=dot` — **12/12 pass**.
- Typecheck: `npm run typecheck` — **exit 0**.
- Build: `npm run build` — **exit 0**; client-leak sentinel: **492 chunks**, 0 runtime server no boot client.
- Design ratchet: **exit 0**, dívida visual reduzida em 536 violações; baseline não foi atualizado. O relatório completo continua com dívida histórica P0/P1 e não foi mascarado.
- Diff hygiene: `git diff --check` — pass.
- Validação remota de provider financeiro/Storage: não executada; não declarar integração externa como validada.
- Findings fechados nesta onda: INT-STORAGE-01, INT-STORAGE-03, INT-PAY-01, INT-PAY-02, INT-PAY-03, INT-UI-01, parte de INT-UI-05. INT-STORAGE-02, INT-PAY-04, INT-UI-02, INT-UI-03 e INT-UI-04 permanecem para microfases posteriores.
