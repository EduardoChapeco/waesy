# Auditoria técnica independente — W0/W1: baseline, governança, CI e release

**ID:** `w0-w1-release`  
**Data da inspeção:** 2026-10-10  
**Repositório:** `/home/ubuntu/waesy`  
**Escopo:** somente W0 (baseline/separação/ledger) e W1 (governança de merge, CI, Cloudflare Pages e release).  
**Método:** leitura dos documentos oficiais solicitados, inspeção read-only de Git/configuração/testes/migrations, execução local sem alteração de código, e consultas read-only à API GitHub. Não houve edição de código, commit, push, merge, deploy, acesso a produção, aplicação de migration remota ou reset/staging.

## 1. Veredito

**Status: `blocked` para promoção/release (com evidência local e remota parcial).**

Há provas independentes positivas de que:

- o checkout aponta para `main` em `98c0d2c2f8c01793a327a12f814c17d9de5e2afb`, igual a `origin/main` no momento da inspeção;
- o CI remoto desse SHA publicou `5 Quality Gates=success` e `Cloudflare Pages=success` no mesmo SHA;
- a proteção de `main` hoje retorna os contextos obrigatórios `5 Quality Gates` e `Cloudflare Pages`, com `strict=true`, `enforce_admins=true` e force-push desabilitado;
- os gates locais executados no worktree atual passaram: typecheck, testes, build, lint e `git diff --check`.

Isso **não fecha W0/W1 nem autoriza release**. A prova é invalidada para um candidato limpo porque o worktree está contaminado por 32 paths (incluindo 16 mudanças de migrations como oito deletes + oito untracked), não existe ledger W0 atual 109/109 com ownership/status/evidência por finding, o próprio `HEAD` limpo falha o checker de unicidade de migrations por cinco prefixos duplicados, não houve teste negativo da proteção, e não foi obtida evidência independente de deployment/smoke público. O check Cloudflare é prova de check/provider-GitHub no SHA; não é, sozinho, prova de deployment funcional ou produção.

A classificação `blocked` é deliberadamente conservadora: os dois checks verdes do SHA publicado não certificam as alterações locais ainda não commitadas, e o release deve permanecer parado enquanto não houver candidato isolado, migrations reconciliadas, ledger e revisão/observação de deploy adequados.

## 2. Fontes oficiais e regra de evidência

Foram lidos:

- `docs/audits/FULL-REMEDIATION-INVENTORY-20261007.md`, especialmente as condições globais de promoção e a linha W1;
- `docs/audits/20261007-WAVE-READINESS-W0-W7.md`, especialmente as seções W0/W1 e a matriz de lacunas;
- `docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md`, principalmente W0.1–W0.3 e W1.1–W1.4;
- `docs/audits/full-remediation-inventory/01-w1-governance.md`;
- `docs/audits/CLOUDFLARE_PAGES_RELEASE.md` e `docs/audits/20261007-holistic-execution-ledger.md`.

Os documentos de 2026-10-07 são snapshots históricos. Eles continuam úteis para os critérios, mas não foram promovidos automaticamente a estado atual. Onde há divergência, a API/Git e a execução local atuais são a evidência atual; nenhuma conclusão histórica foi reutilizada como prova de outro SHA.

## 3. Baseline atual (W0-A/W0-B)

### 3.1 Git e worktree

Prova Git local:

- branch: `main`;
- `HEAD`: `98c0d2c2f8c01793a327a12f814c17d9de5e2afb`;
- `origin/main`: o mesmo SHA;
- ahead/behind: `0 0`;
- não há paths staged, mas há **32 paths modificados/não rastreados**;
- os paths alterados incluem relatórios/documentação, dois testes e oito migrations rastreadas removidas junto com oito migrations novas untracked.

A lista completa de migrations em disco tem 495 arquivos. O estado de trabalho substitui estas oito versões:

- antigas: `20270113000000_*`, quatro `20270114000000_*`, dois `20270115000000_*`, `20270116000000_*` e `20270117000000_*` (oito arquivos no status efetivo);
- novas untracked: `20270113010000_brand_kits_contract_and_provenance.sql`, `20270114000001_contract_signature_completion.sql`, `20270114000002_p0_public_travel_proposal_acceptance.sql`, `20270114000003_studio_template_library.sql`, `20270115000001_external_event_source_provenance.sql`, `20270115000002_p0_secure_public_contract_access.sql`, `20270116000001_simlab_tenant_integrity_and_rbac.sql` e `20270117000001_remove_event_and_mining_fake_defaults.sql`.

`git diff --check` passou, mas isso prova somente whitespace do diff, não atribuição, ownership, segurança ou prontidão de release. O worktree não é um candidato isolado/limpo.

### 3.2 W0.1/W0.2/W0.3

O masterplan exige snapshot imutável, separação de código/documentação e um registro estável para **109/109 findings**, com owner, baseline reproduzível, risco, dependência e artefato de prova. A busca atual encontrou ledgers de microfases/domínios, mas não um ledger W0 contemporâneo que demonstre uma linha completa por finding com todos esses campos.

O inventário oficial também declara que 109 IDs são inventário narrativo, não ledger completo. Portanto:

- **W0.1:** parcial; SHA/base e status atual foram capturados nesta auditoria, mas não há pacote imutável de PRs/checks/worktrees/datas que reconcilie o snapshot histórico com o checkout atual;
- **W0.2:** bloqueada; há mistura de documentação, testes e migrations locais de outra frente, sem decisão de ownership registrada nesta baseline;
- **W0.3:** aberta; não há prova de 109/109 com status e artefato individual.

Não declarar W0 concluída.

## 4. Bugs e gaps verificáveis agora

### F-W0-01 — O `HEAD` publicado ainda contém cinco colisões de versão de migration (P0 release/schema)

Em um archive limpo de `HEAD` (sem qualquer arquivo untracked/working-tree), a contagem é **495 SQL / 487 prefixos**, com colisões em:

- `20270113000000` — 2 arquivos;
- `20270114000000` — 4 arquivos;
- `20270115000000` — 3 arquivos;
- `20270116000000` — 2 arquivos;
- `20270117000000` — 2 arquivos.

Executar `node scripts/check-schema-consolidation.mjs` nesse archive termina com `exit=1` e lista as cinco colisões. No worktree atual, a substituição untracked deixa 495/495 e `npm run check:schema` termina `exit=0`; essa correção **não pertence ao SHA candidato**, pois não está commitada.

Isso é uma falha diretamente verificável de baseline/release: o mesmo SHA que recebeu CI verde não passa o checker de schema quando o checkout é materializado exatamente pelo Git. O CI atual sequer executa `check:schema`, portanto não detecta esta condição.

### F-W1-01 — CI não protege o contrato de migrations/schema

`.github/workflows/ci.yml` contém apenas o job `quality-gates` com cinco passos: typecheck, design ratchet, testes, build e dead-code detector. Não há `npm run check:schema`, replay em Postgres, segunda aplicação, snapshot de catálogo, geração/verificação de `types.ts`, browser/E2E, ou validação de provider/deploy.

Isso não é um defeito do job nominal “5 Quality Gates”; é uma lacuna verificável entre o critério oficial de release (replay/reconciliação das migrations e demais níveis separados) e o que o status obrigatório realmente cobre. Em particular, F-W0-01 passa despercebido no CI.

### F-W0-02 — A correção de colisões está somente no worktree

A inspeção `git status --porcelain=v2` mostra os oito arquivos antigos como deletes unstaged e oito arquivos de timestamp novo como `?` untracked. Nenhum deles está no `HEAD`/`origin/main`. Não é seguro chamar a árvore física de “baseline corrigida” nem reutilizar os checks de `98c0d2` para ela.

### F-W1-02 — O comando de deploy permite publicar worktree sujo

`package.json:25` define:

```text
npx wrangler pages deploy dist --project-name usewaesy --commit-dirty=true --no-bundle
```

O flag `--commit-dirty=true` é explicitamente incompatível com W0-A/W1-E: ele permite que o deploy seja executado apesar de modificações não commitadas. Além disso, não há preflight que rejeite untracked files e verifique que o SHA local é o SHA do candidato aprovado. O comando não foi executado nesta auditoria; o achado é estático e reproduzível.

### F-W1-03 — Proteção existe, mas não há revisão obrigatória nem teste negativo de política

A consulta read-only atual da API de proteção de `main` retornou:

- `required_status_checks.contexts`: `5 Quality Gates`, `Cloudflare Pages`;
- `strict=true`;
- `enforce_admins.enabled=true`;
- `allow_force_pushes.enabled=false`;
- `required_pull_request_reviews.dismiss_stale_reviews=true`;
- `required_approving_review_count=0`;
- `/repos/EduardoChapeco/waesy/rulesets` retornou `[]`.

Assim, há evidência de checks obrigatórios ativos, mas não há evidência de uma aprovação humana obrigatória, ruleset aplicável ou teste autorizado demonstrando bloqueio para cada estado `failure`, `cancelled`, `pending` e `skipped`. A exigência oficial é comportamento de bloqueio, não apenas a existência dos contextos.

Não inferi `required_conversation_resolution`, linear history ou outros campos não capturados nesta consulta.

### F-W1-04 — `cancel-in-progress: true` pode produzir estados cancelled no check obrigatório

O workflow usa `concurrency` com `cancel-in-progress: true` (linhas 10–12). A configuração é válida para economia de recursos, mas torna cancelamentos uma saída normal do check; o histórico oficial já registrou run cancelada. Não há no workflow uma política explícita que transforme cancelamento em fail seguro ou que isole release candidates de cancelamento. Isso deve ser tratado como risco de governança, não como prova de que qualquer cancelamento histórico teve esta causa.

### F-W1-05 — Cobertura de CI não equivale a release

O job remoto verde não executa browser/reload, banco/RLS/JWT, Storage, provider real/sandbox, migrations from-zero/segunda aplicação, staging, deployment observado ou smoke público. O build local gera `dist/_worker.js`, mas isso é prova local de empacotamento; não é prova provider, deploy ou produção.

## 5. Evidência executada, separada por nível

| Nível | Resultado atual | O que prova | O que não prova |
|---|---|---|---|
| Git/local baseline | `HEAD=origin/main=98c0d2c`; 32 paths sujos; `git diff --check=0` | estado do checkout e integridade de whitespace | candidato limpo, ownership, merge ou release |
| Local typecheck | `npm run typecheck` exit 0 | compilação TypeScript do worktree em Node local | execução CI no Node 20, DB, browser ou provider |
| Local tests | `npm test`: **272 files / 1.735 tests passed**, exit 0 | testes Vitest presentes | browser, Postgres/RLS, provider, concorrência real ou deploy |
| Local build | `npm run build` exit 0; `dist` gerado (~38 MB), `dist/_worker.js`; client-leak OK (492 chunks) | bundle/worker local e ausência do leak verificado pelo script | Pages deployment, runtime edge, secrets ou smoke |
| Local lint | `npm run lint -- --quiet` exit 0 | ESLint local | CI/deploy/produção |
| Local schema checker no worktree | `npm run check:schema` exit 0; 495/495 prefixos | apenas a árvore física com migrations untracked renomeadas | `HEAD`, porque o resultado depende de arquivos não commitados |
| Schema checker no archive de `HEAD` | exit 1; cinco prefixos duplicados | bug real do candidato commitado | aplicação real, porque não há Postgres/replay |
| CI GitHub | run `37842567301` para SHA `98c0d2c`; concluída `success` | CI remoto dos arquivos commitados, conforme workflow | schema replay, browser, DB, deploy funcional |
| Check provider/GitHub | check `Cloudflare Pages=success` no mesmo SHA, URL GitHub do run `113536613807` | provider check reportado ao GitHub | logs completos, URL/SHA publicado observado, smoke público |
| Proteção GitHub | contexts obrigatórios e `strict=true`; approvals 0; rulesets [] | configuração remota observada | teste negativo de bloqueio, revisão humana, deploy |
| Provider Cloudflare | documentação registra causas/correções históricas; check atual verde | histórico e status do check | log atual do deployment, configuração/secrets atuais e comportamento público |
| Deploy/produção | **não executado** por restrição da tarefa; nenhuma prova de deployment/smoke produzida | respeito ao escopo | release ou produção |
| Banco/migrations remotas | **não aplicado** | nenhum | replay, RLS, grants, funções, drift ou Storage |

Observação de comparabilidade: o ambiente local desta auditoria usa Node 22, enquanto o workflow fixa Node 20. Os resultados locais são, portanto, sinais locais positivos, não reprodução exata do runner CI.

## 6. Estado das microfases W1

| Microfase oficial | Estado independente | Motivo |
|---|---|---|
| W1-A — congelar candidato | **bloqueada** | worktree com 32 paths; migrations untracked; sem ledger de ownership/reconciliação |
| W1-B — confirmar política | **parcial/bloqueada** | proteção e contexts capturados; approvals=0, rulesets=[], sem teste negativo |
| W1-C — contrato de checks | **parcial** | 5 gates locais e dois checks remotos verdes no SHA; schema/replay/browser/deploy não entram |
| W1-D — diagnosticar Cloudflare | **parcial** | causas históricas documentadas e check atual verde; não há log atual completo associado a uma reprodução desta auditoria |
| W1-E — candidato isolado | **bloqueada** | checks pertencem ao `HEAD` commitado, mas o checkout de trabalho inclui mudança de migrations não commitada; não há artefato de candidato limpo |
| W1-F — promoção controlada | **bloqueada** | sem revisão adversarial registrada com pacote completo, sem deployment/smoke, e com F-W0-01 ainda presente no SHA |

Não há base para declarar W1 concluída, mesmo com os dois checks verdes no SHA atual de `main`.

## 7. Correções locais de baixo risco para o agente principal

Estas são recomendações; **não foram aplicadas** nesta auditoria:

1. **Separar o candidato:** criar worktree limpa de `origin/main`/SHA explicitamente escolhido; preservar os 32 paths atuais fora do candidato; registrar status, base, branches, remotos e ownership antes de qualquer commit.
2. **Resolver migrations como mudança própria:** manter uma única versão/prefixo por migration, revisar a ordem semântica e executar `check:schema` no archive limpo; só depois aplicar em Postgres efêmero autorizado e testar replay duas vezes. Não tratar o resultado do worktree untracked como correção publicada.
3. **Adicionar o checker ao CI:** incluir `npm run check:schema` como gate bloqueante antes de qualquer conclusão de `5 Quality Gates`, e, após ambiente autorizado, adicionar replay/segunda aplicação e snapshots de catálogo. A primeira mudança é local e de baixo risco; replay remoto continua dependente de ambiente.
4. **Impedir deploy sujo:** remover `--commit-dirty=true` do caminho de release ou colocar preflight que falhe para qualquer saída de `git status --porcelain --untracked-files=all` e valide o SHA candidato. O deploy deve ser uma operação posterior ao merge/checks, não um bypass local.
5. **Registrar política negativa:** com autorização administrativa, exigir ao menos uma aprovação humana se esse for o modelo de governança; capturar HTTP/status e regras completas; fazer teste controlado em PR descartável para `failure`, `cancelled`, `pending` e `skipped`. Não simular o teste por parser.
6. **Definir release candidate sem cancelamento perigoso:** para a branch/PR de release, usar grupo de concorrência que não cancele o check obrigatório ou documentar uma regra que nunca aceite `cancelled`; qualquer ajuste deve ser validado em GitHub, não somente no YAML.
7. **Fixar ações externas por SHA:** opcional, mas baixo risco operacional depois de validar os SHAs: `actions/checkout`, `setup-node` e `upload-artifact` estão referenciadas apenas por tags major (`@v4`), sem pin de commit.
8. **Reconciliar o ledger W0:** criar um artefato imutável com exatamente 109 linhas/IDs, owner, baseline, dependências, risco, path e nível de evidência; marcar explicitamente não reproduzidos como bloqueados. Não transformar documentação de microfase em prova de todos os findings.

## 8. Não evidenciado e bloqueadores

- Nenhum Postgres/Supabase efêmero ou remoto foi usado; não há replay, drift, RLS, grants, `SECURITY DEFINER`, ownership ou isolamento cross-tenant.
- Nenhuma migration foi aplicada remotamente.
- Nenhum browser E2E/reload/smoke foi executado.
- Nenhum provider externo foi exercitado; `Cloudflare Pages=success` é check/provider reportado, não log/observação de deployment.
- Nenhuma URL pública ou produção foi acessada nesta tarefa.
- Não há objeto de deployment/smoke anexado para provar o release; o check verde não substitui esses níveis.
- O estado local está compartilhado/sujo e contém alterações de outras frentes; não atribuir essas alterações à W0/W1 nem incorporá-las automaticamente.

## 9. Decisão operacional

**Manter promoção e release bloqueados.** O próximo passo seguro é obter uma worktree documental/candidata limpa, reconciliar as migrations duplicadas no SHA que será avaliado, fechar o ledger W0 109/109, executar o checker no conteúdo commitado e obter a evidência administrativa negativa de proteção. Somente então reexecutar o candidato isolado, confirmar `5 Quality Gates` + `Cloudflare Pages` no mesmo SHA e separar deployment/smoke como evidências próprias.

Nenhuma wave foi declarada concluída neste relatório.
