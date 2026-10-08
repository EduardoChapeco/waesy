# Inventário de Remediação — W1 Governança, Branches, PRs, CI e Release

**Data da auditoria:** 2026-10-07 (sandbox, fuso do ambiente)
**Repositório:** `EduardoChapeco/waesy`
**Escopo:** somente W1 do masterplan: governança de merge, branches, PRs, CI, proteção de `main` e promoção/release.
**Branch auditada:** `audit/full-remediation-20261007`
**HEAD observado:** `fc8f9fc348389029d6e2ac84c5f37a06b0347f30`
**Base documental da spec:** `origin/main`/`919c8688`; a spec ativa informa base R6 `fc8f9fc3` e `origin/main` `919c8688`.
**Regra operacional:** nenhum arquivo de código foi editado, nenhum commit foi criado e nenhuma branch remota foi incorporada.

## 1. Veredito executivo

**W1 permanece aberto e não é gate de release satisfeito.** O repositório local tem uma definição de CI com cinco gates (`.github/workflows/ci.yml:1-56`), mas não contém workflow Cloudflare/Pages nem prova de que os checks sejam obrigatórios na proteção de `main`. A consulta histórica registrada no masterplan informa HTTP 404 para `GET /repos/EduardoChapeco/waesy/branches/main/protection` (masterplan:23); a consulta realizada nesta auditoria não retornou um objeto de proteção/ruleset utilizável. Portanto, **não há evidência atual de regra ativa impedindo merge com check falho, cancelado, pendente ou skipped**.

Os dados GitHub observados contradizem qualquer conclusão de “release pronto”: PRs #1–#4 foram mesclados apesar de checks históricos falhos/cancelados; #5, #6 e o PR documental #7 continuam abertos; nos heads de #1–#6 o check Cloudflare Pages está `failure`, enquanto `5 Quality Gates` varia entre `cancelled`, `failure` e `success`. Isso confirma a necessidade de W1.3/W1.4, mas **não prova a causa-raiz do Cloudflare** nem prova deploy público.

O HEAD local diverge dois commits de `origin/main` (`0` atrás, `2` à frente): `fe0417ae` e `fc8f9fc3`. Esses commits são de remediação P0 de turismo/voucher, não uma implementação de governança W1. O worktree tem dois arquivos de auditoria/spec não rastreados preexistentes: `docs/audits/LEDGER-20261007-FULL-REMEDIATION.md` e `docs/specs/SPEC-20261007-FULL-REMEDIATION-EXECUTION.md`. A presença deles foi preservada; não foram adicionados ao índice.

## 2. Evidência e classificação

### 2.1 Confirmado no código/configuração local

| ID | Finding | Evidência | Estado |
|---|---|---|---|
| W1-C01 | CI unificado tem cinco gates no mesmo job | `.github/workflows/ci.yml:14-46`: job `quality-gates`, nome `5 Quality Gates`, executa typecheck, design lint ratchet, testes, build e dead-code detector | **Confirmado no código** |
| W1-C02 | CI dispara em PR para `main`, push em `main` e dispatch manual | `.github/workflows/ci.yml:3-8` | **Confirmado no código** |
| W1-C03 | Não há workflow de Cloudflare Pages no repositório | `find .github -maxdepth 3 -type f` encontrou apenas `.github/workflows/ci.yml`; o arquivo contém apenas o job de qualidade | **Confirmado no código**; o check Cloudflare é externo ao repositório/integração GitHub |
| W1-C04 | O CI cancela execuções concorrentes pelo grupo da ref | `.github/workflows/ci.yml:10-12`, `cancel-in-progress: true` | **Confirmado no código**; isso pode explicar estados cancelados em determinadas execuções, mas não prova sozinho a causa de PR #1 |
| W1-C05 | A branch local não possui upstream declarado e está limpa quanto a arquivos rastreados, mas tem dois untracked | `git status --short --branch` produziu `## audit/full-remediation-20261007` e os dois paths untracked; `git rev-list --left-right --count origin/main...HEAD` = `0 2` | **Confirmado no Git local** |
| W1-C06 | Os dois commits locais não são W1 | `git log origin/main..HEAD`: `fe0417ae` “harden public travel acceptance and voucher flow”; `fc8f9fc3` “make voucher document apply atomic”; diff contém 27 paths de turismo, SQL, testes e relatório de lint | **Confirmado no histórico local** |
| W1-C07 | A CI não configura explicitamente `required`/branch protection | Não há arquivo de ruleset/protection no repositório; a API de proteção/rulesets não retornou configuração aplicável; o snapshot do masterplan registra HTTP 404 | **Confirmado como ausência de prova/configuração local; proteção remota deve ser confirmada pelo owner** |

### 2.2 Confirmado no histórico/API GitHub, não necessariamente no estado atual do código

| ID | Finding | Evidência | Estado |
|---|---|---|---|
| W1-H01 | PRs #1–#4 foram mesclados em `main` mesmo com checks problemáticos | Masterplan:20-23 e execução `gh api` por SHA: #1 Cloudflare `failure`, Quality Gates `cancelled`; #2 ambos `failure`; #3 Cloudflare `failure` e ausência de Quality Gates visível; #4 ambos `failure` | **Confirmado historicamente**; não repetir como estado do HEAD final sem nova execução |
| W1-H02 | PRs #5 e #6 estão abertos e o PR #7 documental também está aberto | API GitHub observada: #5 `open`, head `chore/sync-task-qhMPHRy4` SHA `713c0c96`; #6 `open`, head `chore/recover-waesy-task-2026-10-06` SHA `8e1b2c49`; #7 `open`, head `docs/waesy-holistic-remediation-2026-10-06` SHA `a57eda21` | **Confirmado na consulta GitHub desta auditoria** |
| W1-H03 | Heads de #5 e #6 tinham Quality Gates success, mas Cloudflare Pages failure | Checks por SHA observados: #5 `5 Quality Gates=success`, Cloudflare `failure`; #6 `5 Quality Gates=success`, Cloudflare `failure` | **Confirmado no histórico dos SHAs consultados**; não prova o candidato local `fc8f9fc3` |
| W1-H04 | PR #1 teve Quality Gates cancelled; #2/#4 failure | Checks por SHA observados: #1 `cancelled`; #2 `failure`; #4 `failure` | **Confirmado historicamente** |
| W1-H05 | Branches remotas de risco existem e não foram incorporadas automaticamente | `git branch -a`: `origin/audit/recursive-p0-remediation`, `origin/chore/recover-waesy-task-2026-10-06`, `origin/feat/waesy-canonical-travel-evolution`, `origin/feat/waesy-studio-omni-audit`, `origin/feat/whatsapp-wave1-8-complete-release`, além de `origin/main` e outras branches de auditoria | **Confirmado no snapshot Git local**; equivalência funcional/ownership ainda não verificada |

### 2.3 Hipóteses que não podem ser promovidas a finding confirmado

1. **Causa do Cloudflare Pages:** o status genérico `failure` não identifica erro de build, binding duplicado, projeto incorreto, segredo ausente ou falha de provider. O masterplan exige logs completos e reprodução (W1.3); nada nesta auditoria prova a causa.
2. **Motivo dos cancelamentos:** `cancel-in-progress: true` é uma explicação plausível para cancelamento de execuções concorrentes, porém não há correlação de jobs/eventos suficiente para atribuí-la ao PR #1.
3. **Estado atual da proteção de `main`:** o snapshot diz HTTP 404 e a consulta atual não retornou objeto; isso é forte evidência de ausência/indisponibilidade de proteção, mas requer confirmação do owner via API/ruleset com código HTTP capturado e permissão adequada.
4. **Deploy público:** não há prova de URL pública, deployment ativo, SHA publicado ou smoke test. Um check Cloudflare histórico, mesmo `success`, não seria prova de deploy funcional sem confirmação do provider.

## 3. Comparação com o masterplan e a spec

O cartão W1 do masterplan (`WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md:94-103`) exige:

- **W1.1:** ruleset/proteção de `main`, PR obrigatório e checks obrigatórios, bloqueando `failed`, `cancelled`, `pending` e `skipped`;
- **W1.2:** `5 Quality Gates` e Cloudflare Pages (ou gate de deploy equivalente) exigidos para publicação, ambos `success` no mesmo SHA candidato;
- **W1.3:** logs completos de Cloudflare para #1–#6, reprodução local e causa-raiz reproduzível;
- **W1.4:** manter #5/#6 abertos até todos os checks passarem e revisar merges #1–#4.

A spec ativa reforça que o plano não pode incorporar branches paralelas (`SPEC-20261007-FULL-REMEDIATION-EXECUTION.md:33-39`), que cada onda precisa de gates independentes (`:17-19`) e que completude global requer CI do SHA final verde e deploy/smoke confirmado quando autorizado (`:41-43`). O estado observado atende apenas parcialmente ao aspecto de definição local de Quality Gates. **Nenhum dos quatro critérios W1 possui prova completa de saída.**

A documentação histórica do commit `75b7177f` declara “W0 baseline e W1 release governance verified” e “CI e Cloudflare Pages passed on same SHA”, mas esse registro é histórico e não deve ser promovido: o masterplan explicitamente informa que o status observado posteriormente dos PRs #5/#6 mantinha Cloudflare failure, e a skill manda tratar evidência anterior como histórica até replay no SHA atual. O commit local atual também está dois commits à frente de `origin/main`, logo a prova de outro SHA não certifica `fc8f9fc3`.

## 4. Paths, dependências e riscos

### Paths auditados / permitidos nesta frente

- `.github/workflows/ci.yml` — único workflow local de CI; leitura, sem alteração.
- `docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md` — cartão W1, snapshot de PR/checks e inventário de branches.
- `docs/specs/SPEC-20261007-FULL-REMEDIATION-EXECUTION.md` — regras de isolamento e gates.
- `docs/audits/LEDGER-20261007-FULL-REMEDIATION.md` — untracked preexistente, não editado.
- `docs/audits/full-remediation-inventory/01-w1-governance.md` — este relatório.

### Dependências externas

- Permissão de administração do repositório para consultar/criar ruleset/proteção de `main`.
- GitHub Actions checks no SHA exato do candidato.
- Integração Cloudflare Pages e logs completos do provider para os heads dos PRs #1–#6.
- Credenciais/ambiente de build compatíveis com o projeto Pages; não presentes como prova local.
- Owner/revisor independente para aprovação; o auditor não deve criar e aprovar sozinho a mesma correção.
- Autorização explícita para merge, migration, deploy e smoke público; nenhuma foi inferida.

### Riscos de mistura com branches remotas

- `origin/chore/recover-waesy-task-2026-10-06` contém os 13 paths locais de recuperação descritos no masterplan; não fazer cherry-pick nem `merge` sem comparação de paths e ownership.
- `origin/audit/recursive-p0-remediation`, `origin/feat/waesy-canonical-travel-evolution`, `origin/feat/waesy-studio-omni-audit` e `origin/feat/whatsapp-wave1-8-complete-release` têm histórico de PRs/escopos diferentes. Misturá-las pode contaminar o candidato e invalidar a atribuição de checks.
- O HEAD local contém migrations e alterações de turismo/voucher fora de W1. Um futuro commit de governança deve ser separado desses 27 paths; não usar `git add -A`.
- `origin/main` está no commit de merge `919c8688`; um candidato baseado em `fc8f9fc3` não pode reutilizar checks de `919c8688`, dos PRs #5/#6 ou do commit histórico `75b7177f`.

## 5. Microfases atômicas e gates

| Microfase | Escopo mínimo | Gate de saída | Bloqueio explícito |
|---|---|---|---|
| W1-A — Congelar candidato | Registrar SHA, base, status, diff de paths e branches; separar os dois untracked e os 27 paths locais | Ledger com `git status`, `git diff --check`, `git rev-list`, lista de paths e decisão de ownership | Parar se houver path de branch paralela misturado ou worktree contaminada não atribuída |
| W1-B — Confirmar política GitHub | Consultar API com HTTP status capturado; identificar branch protection ou ruleset aplicável, PR obrigatório, dismiss stale reviews, conversation resolution e checks obrigatórios | Evidência API no SHA/branch corretos; teste autorizado demonstra que cada check `failure/cancelled/pending/skipped` bloqueia merge | Sem admin/404/permissão: status **bloqueado**, não “protegido” |
| W1-C — Fechar contrato de checks | Confirmar nomes exatos e estabilidade dos checks; manter `5 Quality Gates`; definir Cloudflare Pages ou gate de deploy equivalente sem duplicar jobs | PR de teste/candidato apresenta todos os checks esperados e nenhum check obrigatório ausente/skipped | Não alterar workflow para mascarar falha, allowlist ampla ou baseline de lint |
| W1-D — Diagnosticar Cloudflare | Baixar logs completos de #1–#6, associar cada log ao head SHA, reproduzir build e separar erro de provider, projeto, binding, secrets ou app | Causa-raiz documentada, reprodução determinística e correção mínima; check Cloudflare verde no candidato | Sem logs/provider: **não verificado**; não atribuir causa pelo status genérico |
| W1-E — Validar candidato isolado | Em branch dedicada contendo apenas mudança W1, executar CI no SHA candidato e obter `5 Quality Gates=success` + Cloudflare/deploy gate `success` no mesmo SHA | SHA, URLs de checks, artefatos e revisão adversarial anexados ao ledger; worktree limpa | Não reutilizar checks de outro SHA; não fazer merge/deploy automático |
| W1-F — Promoção controlada | Após W1-B..E e revisão independente, tratar #5/#6 conforme política e revisar merges históricos como dívida de governança | PR final aprovado somente com checks obrigatórios verdes; deploy/smoke separados e autorizados | Enquanto qualquer check estiver `failure/cancelled/pending/skipped`, release fica bloqueada |

## 6. Matriz de verificação atual

| Prova | Resultado | O que prova / não prova |
|---|---|---|
| Leitura de `AGENTS.md`, skill, masterplan, spec e ledger template | **pass** | Conformidade do preflight documental; não prova runtime/release |
| `git status` e branches locais/remotas | **pass** | Estado local e divergência; não prova integridade de branches no servidor |
| `.github/workflows/ci.yml` | **pass parcial** | Cinco gates declarados; não prova checks obrigatórios nem Cloudflare |
| API PRs/check-runs #1–#6 | **pass histórico** | Estados/checks dos SHAs consultados; não prova SHA local |
| API proteção/rulesets de `main` | **not run/blocked para prova conclusiva** | Não foi obtido objeto de regra aplicável; snapshot registra 404 |
| Logs Cloudflare completos | **not run** | Sem causa-raiz e sem prova de reprodução |
| Typecheck/test/build do HEAD local | **not run nesta auditoria** | Não prova W1, e executar os gates não criaria proteção/release |
| Deploy público/smoke | **not run** | Não autorizado e não confirmado |

## 7. Conclusão operacional

**Status W1:** `aberto / bloqueado para promoção`.

**Confirmado:** CI local declara cinco gates; não há workflow Cloudflare local; há divergência local de dois commits e dois untracked; PRs/checks históricos apresentam exatamente o padrão de governança descrito no masterplan; não há objeto de proteção/ruleset utilizável registrado na consulta atual.

**Não verificado:** política efetiva do GitHub em `main` com HTTP status preservado; logs e causa do Cloudflare; checks do SHA `fc8f9fc3`; deploy público; bloqueio real de merge sob falha/cancelamento/pending/skipped; revisão independente.

**Decisão:** não declarar W1 concluído, não declarar `main` protegido, não mesclar #5/#6, não fazer deploy e não promover `fc8f9fc3` como release. O próximo passo seguro é W1-A/W1-B com ledger imutável e consulta administrativa da política; só depois executar W1-C–W1-F em branch de governança isolada.
