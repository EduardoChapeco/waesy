# Inventário de Remediação — W3 Schema, Migrations, Tipos e Contratos de Banco

**Data da auditoria:** 2026-10-07  
**Repositório:** `EduardoChapeco/waesy`  
**Escopo:** exclusivamente W3 do masterplan: schema, migrations, tipos Supabase, contratos DTO↔query↔coluna e paginação/limites.  
**Branch auditada:** `audit/full-remediation-20261007`  
**HEAD observado:** `fc8f9fc348389029d6e2ac84c5f37a06b0347f30` (`fc8f9fc3`)  
**Base declarada na spec:** `origin/main`/`919c8688`; a spec informa base R6 `fc8f9fc3`.  
**Regra operacional:** nenhum arquivo de código, migration, tipo ou teste foi editado; nenhum commit, merge, cherry-pick, aplicação de migration, deploy ou alteração de banco foi feito. O único artefato criado nesta frente é este relatório.

## 1. Veredito executivo

**W3 permanece aberto e bloqueado para declaração de conclusão.** Há um avanço real no contrato TypeScript: o placeholder `Database = any` foi substituído por um artefato grande e tipado em `src/integrations/supabase/types.ts` no commit `3d441445`. Isso confirma melhoria estática no consumidor Supabase, mas não prova que o arquivo corresponde ao conjunto de migrations versionado no HEAD, nem que foi regenerado do schema aplicado neste SHA.

O conjunto atual contém **477 arquivos em `supabase/migrations/`, 474 prefixos de versão e 3 colisões de prefixo**, cada uma com dois arquivos distintos:

- `20270106000000`: `campaign_scheduling_and_auto_archive.sql` e `live_p0_security_hardening.sql`;
- `20270107000000`: `cms_locality_and_banner_auto_archive.sql` e `document_artifacts_ocr_provenance.sql`;
- `20270109000000`: `e2e_booking_chat_rls_hardening.sql` e `wave6_tourism_rls_final_hardening.sql`.

As colisões são um finding de histórico/replay, não uma prova isolada de que o banco falha: a ordenação real de um runner precisa ser confirmada e o histórico aplicado precisa ser comparado. Não renomear, reordenar ou apagar migrations aplicadas por inferência.

A heurística local encontrou cinco tabelas criadas por migrations que não aparecem como tabela no arquivo de tipos (`ai_job_charges`, `match_time_campaigns`, `payment_transactions`, `stock_reservations`, `travel_voucher_apply_operations`). Isso é **sinal confirmado de possível drift no artefato ou de falso positivo da heurística** (por exemplo, tabela já existente/gerada por outra migration, regex incompleta, view ou branch de execução); não é prova suficiente de tabela ausente no banco. O arquivo de tipos contém `_applied_migrations` e começa com `Database` estruturado, mas não carrega metadado de proveniência/hash do schema que permita auditar equivalência.

Não existe `supabase` CLI disponível no PATH nesta sandbox e não há credencial/endpoint autorizado para Postgres efêmero. Logo, W3.1, W3.2 e a parte real de W3.4/W3.5 ficaram **não verificadas**. Testes estáticos, typecheck histórico ou testes Zod sintéticos não substituem migration desde zero, introspecção PostgreSQL, RLS/constraints, cardinalidade, nullability e consulta real.

## 2. Evidência e classificação

### 2.1 Confirmado no código e no Git local

| ID | Finding | Evidência | Estado |
|---|---|---|---|
| W3-C01 | O tipo Supabase deixou de ser `any` | `src/integrations/supabase/types.ts:1-40` contém `export type Database = { ... }`; `rg` não encontrou `Database = any` nesse arquivo. O diff de `3d441445` mostra a substituição do placeholder por ~45 mil linhas | **Confirmado no código**; não equivale a contrato de banco validado |
| W3-C02 | Há um artefato de tipo muito grande e com proveniência histórica registrada | `src/integrations/supabase/types.ts`; `docs/audits/W3_SCHEMA_DRIFT.md:11-17`; `docs/specs/SPEC-W3-SUPABASE-TYPES.md:13-18`; commit `3d441445` | **Confirmado historicamente/documentalmente**; a geração não foi reproduzida nesta auditoria |
| W3-C03 | O repositório tem 477 migrations e três prefixos duplicados | Contagem local por `supabase/migrations/*.sql`: 477 arquivos, 474 prefixos únicos; colisões exatas listadas no veredito | **Confirmado no worktree atual** |
| W3-C04 | O estado de migration não é trivialmente transacional/uniforme | Apenas 263/477 arquivos começam com `begin;`/`BEGIN`; 463 arquivos não começam assim (o número inclui arquivos que podem abrir transação depois ou depender do runner). A contagem não prova atomicidade ou falha, mas demonstra que não há garantia textual uniforme | **Confirmado como característica do código; sem inferir defeito runtime** |
| W3-C05 | Existe migration explícita de reconciliação de contrato, mas ela é parcial | `supabase/migrations/20270110020000_schema_contract_reconciliation.sql:1-40`: `BEGIN`, coluna/index compatível em `workspace_members`, backfill condicional, `increment_cache_hit`, revoke/grant de RPC; não gera tipos, não valida todo DTO/projection e não reconcilia as tabelas encontradas pela heurística | **Confirmado no código** |
| W3-C06 | Há alguns testes que inspecionam texto de migration ou schemas locais, não um harness Postgres geral | `src/services/wave3-contracts.test.ts:4-177` recria Zod schemas e valida payloads sintéticos; testes como `src/services/ai-media-jobs.functions.test.ts` e `src/services/omni-builder.functions.test.ts` usam `toContain` em SQL. Nenhum teste auditado aplica toda a árvore de migrations em banco vazio | **Confirmado no código; insuficiente para W3.1–W3.4** |
| W3-C07 | O package não oferece gate de migration desde zero nem geração verificável de tipos | `package.json:14-38` contém `typecheck`, `test`, `check:schema` e gates canônicos, mas não um comando de replay de migrations/Postgres nem comando de geração Supabase. `scripts/check-schema-consolidation.mjs` é uma verificação de consolidação estática, não introspecção de banco | **Confirmado no código/configuração** |
| W3-C08 | O worktree está contaminado por artefatos documentais preexistentes, não por mutação desta auditoria | `git status --short --untracked-files=all` antes da escrita mostrou `docs/audits/LEDGER-20261007-FULL-REMEDIATION.md`, `docs/audits/full-remediation-inventory/01-w1-governance.md`, `docs/specs/SPEC-20261007-FULL-REMEDIATION-EXECUTION.md`; não foi usado `git add -A` | **Confirmado no Git local** |

### 2.2 Confirmado no histórico, mas não promovido a prova do HEAD

| ID | Finding | Evidência | Estado |
|---|---|---|---|
| W3-H01 | A geração de tipos foi registrada como feita diretamente do projeto Supabase Waesy | `docs/audits/W3_SCHEMA_DRIFT.md:11-17` e `docs/specs/SPEC-W3-SUPABASE-TYPES.md:3-18`; commit `3d441445` | **Confirmado historicamente/documentalmente**; não verificado contra banco atual ou migrations do HEAD |
| W3-H02 | O relatório histórico declara 468 migrations aplicadas | `docs/audits/W3_SCHEMA_DRIFT.md:3-5` | **Histórico**; o worktree atual contém 477 arquivos, e não foi obtido snapshot atual de `schema_migrations`/`_applied_migrations` |
| W3-H03 | A branch `origin/chore/recover-waesy-task-2026-10-06` contém os artefatos W3 e migrations adicionais | Comparação Git local lista, nessa branch histórica, `W3_SCHEMA_DRIFT.md`, `SPEC-W3-SUPABASE-TYPES.md`, `types.ts` e migrations P0/travel. O masterplan:24, 28-49 alerta para 13 paths locais de recuperação | **Confirmado no histórico/refs locais**; ownership e equivalência não verificados |
| W3-H04 | `3d441445` incluiu tipo, auditoria, spec e ajuste de gate de duplicações | `git show --stat 3d441445`: `src/integrations/supabase/types.ts`, `docs/audits/W3_SCHEMA_DRIFT.md`, `docs/specs/SPEC-W3-SUPABASE-TYPES.md`, `scripts/check-type-duplications.mjs`, CI | **Confirmado no histórico**; não significa que todos os gates foram repetidos em `fc8f9fc3` |

### 2.3 Hipóteses/risco que não devem ser promovidos a defeito confirmado

1. **Colisão de prefixo necessariamente quebra o runner:** plausível dependendo do Supabase CLI/runner e do histórico aplicado, mas não confirmado sem executar desde zero e consultar a tabela de migrations. Pode haver ordenação lexicográfica estável pelo nome completo, ou o histórico pode já ter registrado os nomes.
2. **As cinco tabelas ausentes do tipo provam que o tipo está stale:** a regex somente procura `CREATE TABLE public.*`; não cobre tabelas pré-existentes, SQL dinâmico, schemas alternativos, views/materialized views ou objetos criados por outras formas. Requer `pg_catalog`/`information_schema` e regeneração no mesmo schema.
3. **Ausência de `BEGIN` no início prova escrita parcial:** migrations podem ser transacionais implicitamente pelo runner ou abrir transação depois; é um risco de revisão, não prova de falha.
4. **A migration de reconciliação corrige drift integral:** ela cobre somente `workspace_members` e uma RPC de cache; o nome “schema_contract_reconciliation” não prova cobertura total de DTOs, enumerações, FKs ou projeções.
5. **Os tipos foram gerados de um schema incorreto:** há alegação documental de geração direta, mas sem snapshot/hash do banco e sem comparação migration→catalog não é possível confirmar nem refutar.

### 2.4 Não verificado/bloqueado

- Aplicação de todas as 477 migrations em Postgres efêmero a partir de zero, sem pular arquivo (W3.1).
- Compilação real de constraints, triggers, funções, policies, grants e dependências na ordem efetiva do runner.
- Replay/idempotência com histórico legado, incluindo as três colisões e os arquivos `IF NOT EXISTS`/`DROP POLICY` (W3.2).
- Comparação entre o histórico real do banco e os 474 IDs/prefixos versionados.
- Regeneração de `src/integrations/supabase/types.ts` no schema aplicado do HEAD e diff determinístico do artefato.
- Cobertura de views, funções RPC e enums no tipo gerado contra o catálogo real.
- Contract tests que cruzem, para cada BFF, projection/DTO/Zod com coluna, tipo, nullable, enum, FK e cardinalidade reais (W3.4).
- Prova de paginação em banco com fixtures maiores que uma página, ordenação estável, total e limite máximo (W3.5).
- RLS, grants e isolamento multi-tenant reais; estes pertencem principalmente a W2, mas precisam ser preservados no replay de W3.
- Resultado dos checks do SHA `fc8f9fc3` especificamente. O typecheck/test/build histórico de `3d441445` não certifica este candidato.

## 3. Comparação com masterplan e spec

O cartão W3 do masterplan (`WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md:117-127`) exige cinco saídas independentes:

- **W3.1 — Banco vazio:** aplicar tudo em ordem e arquivar snapshot; hoje há apenas arquivos locais e nenhuma execução real.
- **W3.2 — Drift/idempotência:** comparar histórico aplicado e repetir operação sem duplicar objetos/perder dados; colisões permanecem abertas.
- **W3.3 — Tipos reais:** gerar do schema aplicado e corrigir consumidores; `Database = any` foi removido historicamente, mas a geração atual e o fechamento de consumidores não foram reproduzidos.
- **W3.4 — DTO↔query↔coluna:** validar projeções/Zod contra catálogo real; os testes observados são em grande parte schemas sintéticos ou assertions de strings.
- **W3.5 — Paginação/limites:** provar >1 página, cursor/offset, total, ordenação e filtros; há utilitários/testes de paginação no repositório, mas nenhuma evidência desta auditoria de fixture Postgres que feche o cartão W3.

A spec ativa (`SPEC-20261007-FULL-REMEDIATION-EXECUTION.md:12-19, 21-31, 33-43`) exige baseline, paths, reprodução, teste negativo, microfase atômica e classificação separada de typecheck, build, integração Postgres, browser, CI e produção. A presente frente atende apenas à leitura/inventário; não há autorização para converter evidência histórica em “corrigido”.

## 4. Paths, dependências e risco de mistura

### Paths auditados

- `supabase/migrations/*.sql` — inventário de 477 migrations e análise de colisões/ordem textual; somente leitura.
- `supabase/config.toml`, `supabase/seed.sql`, `supabase/tests/copilot_execution_access.sql` — configuração/fixtures; não aplicados.
- `src/integrations/supabase/types.ts` — contrato gerado; somente leitura.
- `scripts/check-schema-consolidation.mjs`, `scripts/check-type-duplications.mjs`, `package.json` — gates/scripts estáticos.
- `src/services/wave3-contracts.test.ts` e testes relacionados encontrados via inventário — avaliação de discriminação dos testes.
- `docs/audits/W3_SCHEMA_DRIFT.md`, `docs/specs/SPEC-W3-SUPABASE-TYPES.md` — evidência histórica W3.
- `docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md`, `docs/specs/SPEC-20261007-FULL-REMEDIATION-EXECUTION.md`, `AGENTS.md`, skill de integridade — contratos de auditoria.

### Dependências para fechar W3

- Supabase CLI ou runner equivalente com versão fixada e Docker/Postgres disponível.
- Snapshot/backup autorizado do banco legado, incluindo tabela de migrations, catálogo, extensões, roles/grants e objetos fora de `public` quando aplicável.
- Credencial/ambiente de teste separado; não usar produção e não aplicar migration por inferência.
- Geração oficial de tipos contra o banco efêmero/representativo e revisão do diff por um responsável diferente do executor.
- Inventário de BFFs/DTOs e consultas canônicas; fixtures com nulls, enums, FKs, cardinalidade e mais de uma página.
- Gate CI que falhe quando type artifact não corresponder ao schema ou quando aparecer `Database = any`.

### Riscos de branches remotas e commits locais

- `origin/main` está em `919c8688`, enquanto o candidato está dois commits à frente (`fe0417ae`, `fc8f9fc3`) com foco P0 turismo/voucher. Não reutilizar checks de `origin/main`, `3d441445`, PRs #5/#6 ou `75b7177f` como checks do HEAD.
- `origin/chore/recover-waesy-task-2026-10-06` contém o conjunto histórico de W3 e migrations P0/travel; não fazer cherry-pick/merge sem comparação de paths, ownership, IDs de migration e estado aplicado.
- `origin/audit/recursive-p0-remediation`, `origin/feat/waesy-canonical-travel-evolution`, `origin/feat/waesy-studio-omni-audit` e `origin/feat/whatsapp-wave1-8-complete-release` podem conter migrations com IDs/objetos semelhantes; misturar branches pode produzir duplicação, ordem diferente e checks não atribuíveis.
- A branch atual contém alterações de banco/turismo dos commits locais; qualquer implementação futura W3 deve ser isolada em commit/branch própria e não usar `git add -A`.
- `docs/audits/full-remediation-inventory/01-w1-governance.md` e artefatos documentais não rastreados já estavam no worktree; preservá-los e não confundi-los com prova de aplicação de schema.

## 5. Microfases atômicas e gates propostos

| Microfase | Escopo mínimo | Gate de saída | Bloqueio explícito |
|---|---|---|---|
| W3-A — Congelar inventário | Registrar SHA/base, lista ordenada dos 477 arquivos, hashes, 3 colisões, refs/branches e estado do worktree | Ledger imutável com `git status`, `git diff --check`, IDs/nome completo e ownership | Parar se qualquer migration local vier de branch paralela não atribuída |
| W3-B — Replay banco vazio | Em Postgres efêmero, aplicar todos os arquivos em ordem do runner, com extensões/roles mínimas documentadas | Execução limpa; snapshot de `pg_class`, columns, constraints, triggers, functions, policies e grants | Sem CLI/DB/credencial: **bloqueado**, não simular com parser |
| W3-C — Drift e replay | Comparar histórico legado↔arquivos; executar replay/segunda aplicação em clone e verificar contagens/objetos/dados | IDs reconciliados; colisões explicadas; repetição sem duplicação/perda; divergência classificada | Não renomear ou reordenar migrations aplicadas antes da prova |
| W3-D — Regenerar tipos | Gerar `src/integrations/supabase/types.ts` do schema W3-B com versão fixada; revisar tables/views/functions/enums | Diff determinístico, sem `Database = any`; cada objeto novo tem contrato e proveniência | Não aceitar geração manual ou de projeto/branch diferente |
| W3-E — Contratos BFF | Selecionar BFFs por tabela/projection; comparar Zod, select, DTO, nullability, enum, FK/cardinalidade no catálogo | Contract tests positivos/negativos falham diante de coluna renomeada, null indevido ou enum inválido | Se a semântica de produto estiver ambígua, parar e pedir decisão |
| W3-F — Paginação/limites | Escolher endpoints canônicos de tabelas; fixtures >1 página; cursor/offset, total, filtros e ordenação estável | Sem lacuna/duplicação; última página e total conferem; limite máximo rejeita query ampla | Não declarar W3.5 por teste unitário de função sem banco |
| W3-G — Gate e handoff | Adicionar somente após aprovação os comandos CI/reprodução, executar typecheck/test/build e revisão adversarial | Ledger separa código, integração DB, CI e produção; revisor independente confirma regressão | Não promover typecheck/build a prova de migration/RLS/provider |

## 6. Matriz de evidência atual

| Prova | Resultado | Limite |
|---|---|---|
| Leitura de AGENTS, skill, masterplan, spec e documentos W3 | **pass** | Prova preflight documental apenas |
| Git status/branches/logs e comparação de commits | **pass** | Não prova estado remoto do banco ou checks do SHA |
| Contagem de migrations e colisões | **pass** | Não prova falha do runner |
| Inspeção de `types.ts` | **pass parcial** | Prova estrutura TypeScript; não prova frescor/equivalência do schema |
| `wave3-contracts.test.ts` e assertions de SQL | **pass parcial** | Testes sintéticos/textuais; não prova Postgres |
| Supabase CLI/Postgres efêmero | **bloqueado/não executado** | CLI não disponível; sem ambiente autorizado |
| Replay/idempotência/RLS/catalog snapshot | **não executado** | Dependem de W3-B/W3-C e credenciais |
| Browser/CI/deploy | **fora do gate direto desta frente; não executado** | Não reutilizar como evidência W3 |

## 7. Conclusão operacional

**Status W3:** `aberto / parcialmente instrumentado / bloqueado para promoção`.

**Confirmado:** três colisões de prefixo no conjunto atual; 477 migrations no worktree; `Database = any` removido historicamente e tipo estruturado presente; migration de reconciliação parcial; testes de contrato existentes, porém majoritariamente sintéticos/textuais; não há comando local observado que execute replay completo.

**Histórico:** alegação de 468 migrations aplicadas e geração direta do projeto Supabase; sucesso de typecheck/test/build associado ao commit de geração, não ao candidato final.

**Hipótese:** colisões quebram runner; cinco tabelas ausentes demonstram stale type; falta de `BEGIN` implica escrita parcial. Todas requerem reprodução/catalogação real.

**Não verificado:** banco vazio, drift do banco legado, idempotência, equivalência do type artifact ao schema do HEAD, DTO↔query↔coluna completo, RLS/grants reais e paginação em fixtures multi-página.

**Decisão:** não renomear/reordenar migrations, não regenerar tipos contra projeto/branch desconhecido, não declarar W3 concluído e não promover o artefato tipado a prova de contrato de banco. O próximo passo seguro é W3-A/W3-B com ambiente Postgres efêmero e ledger; só após W3-C deve haver qualquer decisão de reparo de IDs, migration de reconciliação ou fechamento de consumidores.
