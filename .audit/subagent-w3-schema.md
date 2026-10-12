# Auditoria técnica independente — W3: migrations, schema, tipos e contratos de banco

**ID:** `w3-schema`  
**Data da auditoria:** 2026-10-10  
**Repositório:** `/home/ubuntu/waesy`  
**Escopo:** somente W3 — migrations, schema, tipos Supabase, contratos DTO/query/coluna, BFF e paginação/limites.  
**Auditor:** subagente independente, leitura e testes locais somente.

## 1. Veredito

**Status geral: BLOCKED / W3 aberta e não promovível.**

Há evidência local positiva de que:

- `src/integrations/supabase/types.ts` deixou de ser `Database = any` e é um artefato estruturado grande;
- o checker lexical de migrations passa no **worktree atual**;
- o checker de duplicação de tipos passa;
- `typecheck` local passa;
- o teste focal `src/services/wave3-contracts.test.ts` passa (7 testes).

Esses resultados **não fecham W3**. O checkout não tem `supabase` CLI, `psql`, `postgres`, `pg_isready`, Docker ou Podman disponíveis, e não há endpoint/credencial autorizados para um Postgres efêmero. Portanto não foi possível aplicar migrations, validar dependências SQL, consultar catálogo/RLS/grants/functions/triggers, repetir o replay, comparar histórico de migrations, regenerar tipos contra schema aplicado ou executar contratos BFF contra banco real.

Além do bloqueio ambiental, há defeitos/risco verificável no material local:

1. **O HEAD versionado ainda contém colisões de prefixo de migration.** O worktree mascara isso com oito deleções + oito arquivos renumerados não rastreados; o `check:schema` passa porque lê o filesystem atual, não porque o commit candidato esteja limpo.
2. **O artefato `Database` não é conectado aos clientes Supabase.** `src/lib/supabase.ts` importa somente o tipo genérico `SupabaseClient`, não importa `Database` e chama `createClient` sem generic. Assim, o typecheck não valida nomes de tabela/coluna contra `types.ts`.
3. **Há drift local confirmado entre DDL e `types.ts`:** pelo menos `user_daily_token_quotas` é criada em migration e usada pelo BFF, mas está ausente do artefato de tipos. Também há outros objetos DDL locais ausentes no tipo; isso é evidência de drift do repositório/artefato, não prova do estado remoto.
4. **O scanner BFF continua falhando localmente:** 19 relações públicas referenciadas pelos serviços não têm declaração local encontrada pelo scanner. Isso pode incluir contratos legados ou relações remotas, portanto não deve ser convertido automaticamente em “tabela ausente no banco”, mas permanece gap W3.4 não resolvido.
5. **O helper de paginação não usa o `id` do cursor como desempate:** o cursor codifica `(sortValue,id)`, mas a query aplica apenas `lt/gt(sortColumn, sortValue)` e ordena apenas por `sortColumn`. Registros com o mesmo timestamp/valor podem ser pulados ou duplicados entre páginas. O teste existente não cobre empate.

Nenhuma wave foi declarada concluída. Não foram alterados código, migrations, tipos, testes, banco, provider, CI, deploy ou produção; somente este relatório foi criado.

## 2. Baseline local e risco de atribuição

A base documental oficial foi lida:

- `docs/audits/FULL-REMEDIATION-INVENTORY-20261007.md` — W3 aberta/bloqueada para replay; exige inventário congelado, replay em banco vazio, segunda aplicação/drift, geração real de tipos, contratos BFF e paginação real.
- `docs/audits/20261007-WAVE-READINESS-W0-W7.md` — W3.1/W3.2 bloqueadas, W3.3 apenas parcial, W3.4 aberta e W3.5 somente em memória; código, teste local, banco, browser, CI, provider e deploy devem ser separados.
- `docs/audits/full-remediation-inventory/03-w3-schema.md` — confirma como histórico os achados de 477 migrations/3 colisões e a ausência de replay; não foi tratado como prova do checkout atual.
- `docs/audits/W3_SCHEMA_DRIFT.md` — documenta geração histórica de tipos e renumeração histórica, mas explicitamente não prova banco atual.
- `docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md`, especialmente cartão W3.1–W3.5 — exige Postgres efêmero, snapshot de catálogo, reconciliação de histórico, geração de tipos e fixtures >1 página.

Baseline observada agora:

- branch local: `main`;
- `HEAD`: `98c0d2c2f8c01793a327a12f814c17d9de5e2afb`;
- worktree suja, com alterações de outros agentes/documentos e alterações de migrations;
- `supabase/migrations/`: **495 arquivos** no HEAD e no filesystem atual;
- no **HEAD**: **487 prefixos únicos** e **8 prefixos duplicados**;
- no filesystem do worktree: **495 prefixos únicos**, porque oito migrations antigas estão marcadas como deletadas e oito renumerações estão não rastreadas;
- os oito novos arquivos têm hash SHA-256 idêntico ao arquivo antigo correspondente, mas renomear conteúdo não reconcilia `schema_migrations` nem prova o estado de qualquer banco.

Colisões ainda presentes no HEAD:

```text
20270113000000:
  20270113000000_brand_kits_contract_and_provenance.sql
  20270113000000_security_advisory_remediation.sql

20270114000000:
  20270114000000_competitor_snapshot_provenance.sql
  20270114000000_contract_signature_completion.sql
  20270114000000_p0_public_travel_proposal_acceptance.sql
  20270114000000_studio_template_library.sql

20270115000000:
  20270115000000_contract_seal_atomic_authorization.sql
  20270115000000_external_event_source_provenance.sql
  20270115000000_p0_secure_public_contract_access.sql

20270116000000:
  20270116000000_p0_staff_travel_proposal_conversion.sql
  20270116000000_simlab_tenant_integrity_and_rbac.sql

20270117000000:
  20270117000000_p0_secure_public_voucher_access.sql
  20270117000000_remove_event_and_mining_fake_defaults.sql
```

O worktree atual contém renumerações não rastreadas para oito dos arquivos colidentes. Isso explica o resultado verde do checker local, mas **não é um candidato commitado/reproduzível**. Não recomendo staging/commit automático nem aplicar os novos IDs a qualquer banco sem comparar histórico aplicado e plano de reconciliação.

## 3. Evidência local executada e classificação

| Evidência | Resultado observado | Nível que prova | O que não prova |
|---|---|---|---|
| `npm run check:schema` | PASS; `migrations=495`, `tables_declared=601`, `functions_declared=211`, versões únicas | leitura lexical do filesystem atual | SQL compila, replay, dependências, catálogo, RLS, grants ou estado do commit |
| `npm run check:types-ssot` | PASS; 1.986 arquivos, 0 tipos/interfaces duplicados, `Database=any` não encontrado | análise textual de tipos | tipos foram gerados do banco correto ou estão alinhados às migrations |
| `npx vitest run src/services/wave3-contracts.test.ts` | PASS; 1 arquivo, 7 testes | teste local de Zod/payloads sintéticos | banco, DTO real, colunas, nullability, FK, RLS ou RPC |
| `npm run typecheck` | PASS, status 0 | compilação TypeScript local | schema; o cliente Supabase está declarado como `SupabaseClient` não parametrizado |
| `node scripts/check-bff-table-contracts.mjs` | FAIL; 19 `MISSING_TABLE` | gap local de scanner BFF↔DDL | tabela realmente ausente no banco remoto, pois não houve introspecção |
| `git diff --check` | PASS | whitespace do diff | validade SQL ou integração |
| browser/E2E | não executado | nenhum | login, reload, paginação UI, cross-tenant ou deploy |
| CI/provider/deploy | não executado nesta auditoria | nenhum | checks do SHA, deployment, smoke ou produção |
| Postgres/Supabase | bloqueado: binários/CLI indisponíveis | nenhum | replay, catálogo, RLS, grants, funções, triggers e constraints |

O `check-schema-consolidation.mjs` deve ser interpretado como checker lexical: lê todos os `.sql` presentes no diretório, conta regex de `CREATE TABLE`/`CREATE FUNCTION`, verifica duplicidade e procura `Database = any`. Ele não abre SQL, não cria banco, não consulta `pg_catalog` e não compara o artefato de tipos com o schema.

## 4. Achados confirmados no código/worktree

### W3-F01 — HEAD ainda tem oito colisões de versão; PASS do checker é mascarado pelo worktree

**Severidade:** P0 para replay/lançamento de schema.  
**Confiança:** confirmada no Git local; sem concluir comportamento de runner.

- `git ls-tree -r --name-only HEAD -- supabase/migrations` encontrou 495 arquivos, 487 prefixos únicos e os 8 prefixos duplicados listados acima.
- O worktree tem oito `D` e oito `??` correspondentes.
- A comparação de conteúdo mostrou hashes iguais entre cada arquivo antigo no `HEAD` e o arquivo renumerado no worktree.
- `npm run check:schema` passou somente porque usa `fs.readdirSync` do filesystem atual; migrations não rastreadas entram na contagem e os arquivos antigos removidos deixam de ser vistos.

**Impacto:** um commit construído sem incluir explicitamente as renumerações continuará com colisões; um commit que inclua a renumeração poderá divergir de qualquer histórico de migration já aplicado. Não é seguro escolher runner, renomear, reordenar ou apagar por inferência.

**Correção local de baixo risco (proposta, não aplicada):** em branch/commit isolado, congelar lista e hashes de `git ls-tree`/worktree, revisar a decisão de IDs com responsável do histórico e fazer o gate de duplicidade operar também sobre a árvore versionada/candidato, não apenas sobre arquivos não rastreados. Depois, em Postgres efêmero e em clone de histórico autorizado, comparar IDs completos, nomes e objetos antes de qualquer rollout.

### W3-F02 — Cliente Supabase não recebe o `Database` gerado

**Severidade:** P1; torna o gate de tipos enganoso para contratos BFF.  
**Confiança:** confirmada no código.

`src/lib/supabase.ts`:

- linha 18 importa `createClient` e `SupabaseClient`, mas não importa `Database` de `src/integrations/supabase/types.ts`;
- linhas 79, 81, 140, 173 e 213 expõem `SupabaseClient` sem generic;
- linhas 151 e 183 chamam `createClient(url, key, options)` sem `createClient<Database>`.

Não foi encontrada importação produtiva de `src/integrations/supabase/types.ts` para parametrizar esses clientes. Consequentemente, o `typecheck` passa mesmo para strings de tabela/coluna que não aparecem no tipo gerado. Isso explica por que o drift de quota abaixo não é capturado.

**Correção local de baixo risco (proposta):** após regenerar/reconciliar o artefato, criar um alias `SupabaseClient<Database>` e aplicá-lo primeiro a uma factory server/anon tipada ou, em mudança controlada, a todas as factories e ao proxy. Rodar typecheck e corrigir apenas os erros de contratos reais; não usar `as any`/allowlist para silenciar o resultado. Uma mudança global deve ser revisada separadamente por causa do blast radius.

### W3-F03 — `user_daily_token_quotas` é DDL local ativo, usada pelo BFF e ausente do tipo

**Severidade:** P1 para W3.4; a atomicidade/cobrança é também dependência W4/W5.  
**Confiança:** drift local confirmado; estado remoto não verificado.

- `supabase/migrations/20270109000000_close_bff_quota_and_whatsapp_lead_contracts.sql:4-12` cria `public.user_daily_token_quotas` com PK, FK para `auth.users`, `quota_date`, `used_tokens`, datas e `UNIQUE (user_id, quota_date)`; linhas seguintes configuram índice, RLS e grants.
- `src/services/token-quota.functions.ts:71-76,153-158,195-211` faz select/update/insert nessa relação.
- Busca direta em `src/integrations/supabase/types.ts` não encontra `user_daily_token_quotas`.
- O cliente usado por esse serviço é o cliente genérico, por isso `npm run typecheck` não detecta o nome ausente.

**Classificação:** não afirmar “tabela ausente no banco”. A prova é: “DDL local e consumidor existem, mas o artefato de tipos rastreado não contém essa tabela e o cliente não o aplica”.

**Correção local de baixo risco (proposta):** gerar tipos a partir do schema aplicado ao HEAD/candidato (ou, sem banco ainda, registrar o bloqueio em vez de fabricar manualmente o tipo); importar `Database` no cliente; adicionar teste de compilação/contract que falhe quando o BFF usa relação não presente. Depois verificar colunas, nullability e RLS com Postgres real.

### W3-F04 — Outros objetos de DDL local não aparecem no artefato de tipos

**Severidade:** P1/P2, dependente de uso e de lifecycle.  
**Confiança:** confirmado como discrepância textual; não prova de schema remoto.

A busca textual confirmou presença de `CREATE TABLE` local e ausência de chave correspondente em `types.ts` para, entre outros:

- `ai_job_charges` — `20261007000001_ai_media_jobs_quota_lifecycle.sql`;
- `travel_voucher_apply_operations` — `20270119000000_p0_atomic_voucher_apply.sql`;
- `user_daily_token_quotas` e `whatsapp_leads` — `20270109000000_close_bff_quota_and_whatsapp_lead_contracts.sql`;
- `studio_template_library` — `20270114000003_studio_template_library.sql`;
- `unsplash_studio_selections` — `20270114010000_unsplash_studio_selection_ledger.sql`;
- `simlab_observed_campaign_arms` — `20270109000001_simlab_observed_experiments_and_provenance.sql`;
- `match_time_campaigns` — `0018_growth_engagement.sql`;
- `stock_reservations` — `0003_orders.sql`;
- `payment_transactions` — `0028_payment_transactions.sql`, com migration posterior de limpeza (`20260726090000_cleanup_ghost_payment_tables.sql`), portanto este último exige análise de lifecycle e não deve ser simplesmente adicionado ao tipo.

A lista deve ser reconciliada contra o catálogo real: tabelas criadas e depois removidas, views, objetos de schema diferente e migrations condicionais podem ser falsos positivos. O finding seguro é a falta de reconciliação/generation determinística, não “tabela ausente em produção”.

### W3-F05 — Scanner BFF falha com 19 relações sem declaração local

**Severidade:** P1 para W3.4; algumas entradas podem ser legado/remote e precisam de decisão.

Execução atual de `node scripts/check-bff-table-contracts.mjs`:

```text
Migrations analisadas: 495
Tabelas declaradas: 611
Tabelas referenciadas por BFF: 495
Tabelas sem declaração local: 19
```

Relações listadas pelo scanner:

```text
activation_logs
ad_ledger
ads
badge_templates
channel_vault_credentials
condicional_items
contract_addendums
direct_conversations
direct_messages
eventos_campanhas
immutable_ledger_entries
lead_capture_forms
post_media
store_condicionais
store_invites
store_orders
store_stories
travel_bookings
trip_commissions
```

O scanner é útil como gap local e falha fechado, mas só varre regex de migrations e `.from("...")` em `src/services/**/*.functions.ts`; não introspecta banco, não modela views/`auth`, não resolve aliases nem decide contratos canônicos. O baseline oficial já orienta não inventar placeholders. A falha deve permanecer visível até cada relação ter introspecção autorizada, substituição canônica ou remoção documentada.

**Correção local de baixo risco (proposta):** manter o scanner no CI com saída versionada e allowlist vazia/justificada; adicionar classificação explícita `public table/view`, `auth`, Storage, legado e “decisão de remoção”. Não mascarar os 19 itens com allowlist ampla.

### W3-F06 — Paginação keyset ignora o desempate por `id`

**Severidade:** P1/P2; pode causar lacunas/duplicação em dataset real.  
**Confiança:** bug de lógica local confirmado por leitura; não foi executado contra Postgres.

`src/lib/pagination/keyset-pagination.ts`:

- linhas 9–12 codificam `CursorPayload { sortValue, id }`;
- linhas 106–109 incluem `id` no `nextCursor`;
- linhas 159–164, porém, aplicam apenas `lt(sortColumn, decoded.sortValue)` ou `gt(...)`;
- linha 167 ordena somente `sortColumn`, sem uma segunda ordem por `id`.

Se duas linhas têm o mesmo `created_at` (caso comum), o cursor da primeira página contém o ID, mas a próxima query filtra todas as linhas com `created_at` igual. Isso pode pular linhas; o ID do cursor não participa da busca. O teste `src/lib/pagination/keyset-pagination.test.ts:94-114` cobre apenas timestamps distintos e mock builder, não empate nem dataset >1 página em banco.

**Correção local de baixo risco (proposta):** formalizar a ordem `(sortColumn, id)` e aplicar predicado lexicográfico compatível com asc/desc — por exemplo, ramo `sort < cursor.sortValue OR (sort = cursor.sortValue AND id < cursor.id)` para desc — além de ordenar pelo mesmo par. O código deve usar o operador PostgREST adequado, validar coluna permitida e ganhar regressão com dois ou mais itens empatados. Não declarar W3.5 fechado até executar fixture real com ordenação, filtros, total/última página e limite máximo.

## 5. Critérios W3 ainda não demonstrados

| Microfase oficial | Estado independente agora | Evidência mínima ainda necessária |
|---|---|---|
| W3-A inventário congelado | parcial; há lista local, mas worktree suja e migrations não rastreadas | SHA candidato, lista/hashes dos arquivos versionados, ownership, status, colisões e base imutáveis |
| W3-B replay banco vazio | **bloqueada** | Postgres efêmero autorizado; aplicar todas as migrations sem pular; logs de cada arquivo; snapshot de `pg_class`, colunas, constraints, triggers, functions, policies e grants |
| W3-C drift/segunda aplicação | **bloqueada** | histórico real de migrations, reconciliação de IDs completos/names, clone, segunda aplicação, contagens e ausência de perda/duplicação |
| W3-D tipos reais | parcial | `supabase gen types`/runner equivalente fixado contra schema aplicado, hash/proveniência, diff determinístico e tipos de tabelas/views/functions/enums |
| W3-E DTO↔query↔coluna | aberta; scanner falha | cliente parametrizado com `Database`; matriz BFF; contratos positivos/negativos para nome, tipo, nullability, enum, FK e cardinalidade |
| W3-F paginação/limites | parcial apenas em memória | fixture Postgres >1 página, empate de sort, cursor, total/última página, filtros e limite máximo; prova de ausência de lacuna/duplicação |
| W3-G handoff | não pronta | revisão adversarial independente, artefatos no mesmo SHA e bloqueadores resolvidos ou explicitamente aceitos |

## 6. Safe fixes para o agente principal

Estas são propostas locais de baixo risco; **não foram aplicadas nesta auditoria**:

1. **Congelar a árvore candidata antes de editar migrations.** Separar o relatório/ledger da worktree suja, registrar `HEAD`, base, `git status`, lista ordenada e hashes; não fazer `git add -A`.
2. **Corrigir o gate para inspecionar a árvore que será commitada.** Além do filesystem, executar a checagem contra `git ls-tree`/artefato staged ou exigir que nenhum migration untracked participe de um PASS. Isso impede o falso verde atual.
3. **Não decidir renumerações por inferência.** Preservar os hashes antigos, comparar com histórico aplicado autorizado e só então criar uma migration/ledger de reconciliação explícita. Não renomear em produção, não reordenar e não apagar conteúdo já aplicado.
4. **Fazer o tipo Supabase ser SSOT efetivo.** Após replay/generation autorizados, parametrizar as factories (`SupabaseClient<Database>`/`createClient<Database>`) e deixar o typecheck revelar consumers divergentes; nunca corrigir com `any`.
5. **Adicionar verificação de proveniência do `types.ts`.** Guardar versão da CLI/runner, SHA do schema ou fingerprint do catálogo e falhar CI quando o arquivo gerado divergir. Sem banco disponível, registrar `blocked`, não gerar stub.
6. **Manter o BFF scanner como gate separado e explícito.** Resolver cada relação faltante por introspecção, remoção ou contrato canônico; não criar tabelas placeholder e não promover o scanner textual a prova de banco.
7. **Corrigir a ordenação keyset com desempate.** Usar `(sortValue,id)` tanto no cursor quanto em predicado/`order`, validar empates e adicionar teste de fixture com timestamps iguais antes de uso em produção.
8. **Depois do schema, revisar erros de escrita de quota.** `token-quota.functions.ts:153-211` ignora erros dos selects/updates/inserts; a correção correta deve preservar atomicidade/idempotência e ser validada com banco/concorrência, portanto é handoff W3→W4, não um patch especulativo nesta auditoria.

## 7. Bloqueadores explícitos e separação de evidência

- **Banco:** bloqueado por ausência de CLI/runner/servidor/credencial. Não foi aplicado nenhum SQL e não foi usado banco remoto.
- **RLS/grants/SECURITY DEFINER:** apenas texto de migrations; não há prova de policy efetiva, role, JWT, `auth.uid`, `SET ROLE` ou isolamento cross-tenant. O detalhe de RLS pertence primariamente W2, mas é objeto obrigatório do replay W3.
- **Browser:** não executado; nenhum claim de paginação/UI/reload foi promovido.
- **CI:** não executado para este SHA nesta auditoria; o PASS de comandos locais não equivale a CI.
- **Provider/Storage:** fora do escopo de prova e não executado.
- **Deploy/produção:** não acessados; não há declaração de migration aplicada ou produção saudável.

## 8. Conclusão para handoff

O trabalho seguro a seguir é: congelar um candidato limpo, reconciliar as oito colisões do HEAD com histórico aplicado, obter Postgres efêmero autorizado, executar replay completo duas vezes, capturar catálogo/policies/grants/functions/triggers, regenerar tipos no mesmo schema e então fechar BFF/paginação com testes de banco. Até lá, o resultado correto é **W3 bloqueada/partial**, não `green`, mesmo com `check:schema`, `check:types-ssot`, typecheck e testes Vitest verdes.

**Artefatos lidos e principais paths:**

- `/home/ubuntu/waesy/supabase/migrations/`
- `/home/ubuntu/waesy/src/integrations/supabase/types.ts`
- `/home/ubuntu/waesy/src/lib/supabase.ts`
- `/home/ubuntu/waesy/src/services/token-quota.functions.ts`
- `/home/ubuntu/waesy/src/lib/pagination/keyset-pagination.ts`
- `/home/ubuntu/waesy/src/lib/pagination/keyset-pagination.test.ts`
- `/home/ubuntu/waesy/src/services/wave3-contracts.test.ts`
- `/home/ubuntu/waesy/scripts/check-schema-consolidation.mjs`
- `/home/ubuntu/waesy/scripts/check-type-duplications.mjs`
- `/home/ubuntu/waesy/scripts/check-bff-table-contracts.mjs`
- `/home/ubuntu/waesy/package.json`
- `/home/ubuntu/waesy/docs/audits/FULL-REMEDIATION-INVENTORY-20261007.md`
- `/home/ubuntu/waesy/docs/audits/20261007-WAVE-READINESS-W0-W7.md`
- `/home/ubuntu/waesy/docs/audits/full-remediation-inventory/03-w3-schema.md`
- `/home/ubuntu/waesy/docs/audits/W3_SCHEMA_DRIFT.md`
- `/home/ubuntu/waesy/docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md`
