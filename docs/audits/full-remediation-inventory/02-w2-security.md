# W2 — Identidade, autorização, tenant, RLS e grants

**Data da leitura:** 2026-10-07 (-03)  
**Repositório:** `EduardoChapeco/waesy`  
**Branch/HEAD:** `audit/full-remediation-20261007` / `fc8f9fc3`  
**Base comparada:** `origin/main` / `919c8688`  
**Escopo:** inventário independente da onda W2 do masterplan; nenhuma alteração de código, migration aplicada, commit, deploy ou mudança em banco foi feita nesta auditoria.

## 1. Conclusão executiva

W2 **permanece aberta e não pode ser declarada concluída**. Há uma arquitetura de intenção consistente (`getServerIdentity`, `assertStoreAccess`, helpers de role e migrations recentes de grants), mas a evidência disponível é predominantemente estática e de testes que inspecionam strings/mocks. Não há nesta sessão Postgres efêmero/staging, JWT real, `SET ROLE`, dump de privilégios, teste cross-tenant contra banco, browser, CI do SHA final ou produção.

O risco mais importante é sistêmico: `getServerClient()` usa `service_role` e explicitamente bypassa RLS (`src/lib/supabase.ts:126-160`). Portanto, a presença de RLS e de um helper em um arquivo não prova isolamento de um endpoint; cada função exposta deve provar autenticação, ator, tenant, ownership dos IDs, erro e contagem/linha afetada antes de qualquer query/mutação. O inventário estático encontra vários serviços com chamadas service-role sem um guard identificável no arquivo (ver seção 4), mas isso é **sinal de triagem**, não prova individual de bypass explorável.

## 2. Evidência e limites

### Confirmado nesta árvore

- A branch está limpa quanto a arquivos rastreados, mas contém artefatos não rastreados preexistentes: `docs/audits/LEDGER-20261007-FULL-REMEDIATION.md`, `docs/audits/full-remediation-inventory/` e `docs/specs/SPEC-20261007-FULL-REMEDIATION-EXECUTION.md`. Este relatório é o único arquivo escrito para a tarefa.
- HEAD contém apenas dois commits após `origin/main`: `fe0417ae` e `fc8f9fc3`, ambos concentrados em fluxo público/atômico de turismo; o histórico de segurança anterior inclui `21b5c343` (remoção de trigger/provisionamento implícito e grants RPC) e `4428c99f` (advisories). Histórico não equivale a prova no HEAD nem a aplicação no banco.
- O masterplan define W2.1–W2.5 como: identidade confiável; fechamento de `service_role`; policies RLS; grants/`SECURITY DEFINER`; auth/quota antes de custo externo (`WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md:105-115`). A spec exige baseline, reprodução, teste negativo, microfase atômica e separação de evidências (`SPEC-20261007-FULL-REMEDIATION-EXECUTION.md:12-19`).
- `src/lib/server-access.ts:27-43,66-105` oferece ponte para `getServerIdentity`, resolução de tenant e guards (`requireRole`, `requireStaff`, `requireAdmin`, `requirePlatformAdmin`, etc.), mas é apenas um adaptador; não força seu uso em todo `createServerFn`.
- `src/lib/supabase.ts:140-160` cria o cliente com `SUPABASE_SERVICE_ROLE_KEY` e documenta que ele bypassa RLS; `getAnonServerClient` (`:163-188`) respeita RLS, mas não fornece por si só sessão/claims autenticados.
- `20270113000000_security_advisory_remediation.sql:5-7` remove `on_auth_user_created`/`handle_new_user`; `:68-96` revoga EXECUTE de todas as funções `SECURITY DEFINER` públicas para `PUBLIC, anon, authenticated` e concede a `service_role`; `:98-124` adiciona assertivas. Isso é um controle forte no texto da migration, porém não foi aplicado/verificado em banco nesta sessão.
- `20261007130000_rpc_grants_and_explicit_profile_provisioning.sql` contém `get_public_lead_by_token(text)` como `SECURITY DEFINER` com `search_path` fixo (`:13-18`), mas consulta por token/id (`:29-38`) e retorna PII de lead (`:40-63`). A migration posterior pretende retirar EXECUTE público; a eficácia, ordem e estado instalado precisam ser provados no catálogo do banco.
- `src/services/rpc-security-wave.test.ts:19-37` verifica conteúdo textual de migration e ausência textual de inserts implícitos em `auth.functions.ts`; não invoca Postgres, não verifica `has_function_privilege`, RLS, JWT ou leakage.
- `src/services/rls-cross-tenant-isolation.test.ts:121-186` usa arrays em memória para “simular RLS”, checa lista de rotas e agregação local; não prova policy, query real ou tenant no banco.

### Histórico (não é prova atual)

- O masterplan reporta que não houve aplicação de migrations, alteração de runtime/RLS, deploy ou confirmação de provider na fase documental (`WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md:51-56`).
- O próprio masterplan registra como padrões recorrentes: `service_role` em funções expostas sem autorização/tenant, policies permissivas e testes que aceitam sucesso sintético (`:69-78` e achados das unidades Copilot/chat/persistência). Esses achados devem ser reexecutados no SHA `fc8f9fc3`; não foram promovidos automaticamente a defeitos atuais.
- `21b5c343` e `4428c99f` são commits locais de hardening, mas não demonstram migration aplicada nem substituem o dump de grants exigido por W2.4.

### Hipóteses de risco a confirmar

- Algum endpoint/worker que chama `getServerClient()` pode aceitar UUID/`store_id` vindo do body e operar fora do tenant do ator. A triagem encontra candidatos, mas exige leitura por função e teste negativo A/B no banco.
- A revogação global de EXECUTE em `20270113000000_security_advisory_remediation.sql` pode quebrar RPCs legítimas chamadas por `authenticated`/`anon`, ou criar dependência implícita excessiva de `service_role`; só catálogo e smoke tests com grants reais distinguem hardening correto de regressão.
- Policies antigas e novas podem coexistir, ou uma policy `FOR ALL` pode ter `USING` sem `WITH CHECK` explícito. O padrão exige inventário por tabela/policy no banco, não somente grep de migrations.
- O padrão `getAnonServerClient()` em resolução de subdomínio (`src/lib/tenant.server.ts:26-42`, observado na árvore) pode expor enumeração de slugs/tenant se `stores` tiver leitura pública; impacto é dependente da policy instalada.

### Não verificado / bloqueado

- Estado real das migrations, `pg_policies`, `pg_class.rowsecurity`, owners, `prosecdef`, `proconfig`, `search_path`, grants efetivos e default privileges.
- Comportamento com JWT real de anon/authenticated, usuário A/B, memberships em duas lojas, platform admin e `service_role`.
- Teste de leitura/escrita cross-tenant, RPCs `SECURITY DEFINER`, webhooks/jobs e workers sem sessão.
- Quota/rate-limit antes de seleção de chave/provider em toda superfície W2.5.
- CI/checks, browser, staging, deploy e produção.

## 3. Inventário por microfase W2

| Microfase | Estado de evidência | Observação e gate necessário |
|---|---|---|
| W2.1 Identidade confiável | **Parcial / não verificado** | Helpers existem, mas não há matriz endpoint×ator×role×tenant. Fechar somente após inventário de todos `createServerFn`, RPC, stream, job e webhook e requests anônimos rejeitados. |
| W2.2 Fechar `service_role` | **Risco confirmado na arquitetura; exploração não verificada** | O cliente bypassa RLS por desenho. A lista de callers sem guard identificável é triagem, não veredito. Gate: cada caller precisa guard/ownership ou justificativa de escopo público, teste A/B e prova de linha afetada. |
| W2.3 Policies RLS | **Não verificado** | Há migrations com policies tenant-aware, mas o banco efetivo não foi consultado. Gate: Postgres desde zero + legado, JWT real/`SET ROLE`, enumeração de `USING(true)`, `WITH CHECK(true)`, `store_id IS NULL` e RLS ausente. |
| W2.4 Grants/`SECURITY DEFINER` | **Código/migration confirmado; integração não verificada** | Revogação dinâmica existe, mas falta dump comparativo pós-migration e teste de anon/authenticated/owner/tenant-alheio/admin/service-role. Revisar owner/search_path e overloads. |
| W2.5 Cotas antes do custo | **Não verificado** | Não há prova única de que todas as entradas autenticam, verificam quota/rate-limit e só então selecionam chave/iniciam provider. Gate: instrumentar provider e secret access, casos anon/sem saldo/replay. |

## 4. Findings acionáveis

### W2-F01 — `service_role` é uma fronteira sem enforcement universal

**Classificação:** confirmado no código; impacto cross-tenant **não verificado**. **Severidade proposta:** P0 se qualquer candidato demonstrar acesso por ID cross-tenant; caso contrário P1 de governança/isolamento.

**Evidência:** `src/lib/supabase.ts:140-160` cria cliente service-role e declara bypass de RLS. `server-access.ts:33-43,66-105` apenas expõe helpers. Uma triagem estática encontrou serviços com `getServerClient` e nenhum token de guard detectável no arquivo, incluindo `src/services/search.functions.ts`, `seller.functions.ts`, `simlab.functions.ts`, `telemetry-affinity.functions.ts`, `timeline.functions.ts`, `tourism-airports.functions.ts`, `travel-ai-extractor.functions.ts`, `travel-financial.functions.ts` e `whatsapp-outbox.worker.ts`; a lista é indicativa e deve ser revisada função a função.

**Risco:** UUID/`store_id` do payload, webhook ou job pode tornar-se capability; RLS não limita o cliente service-role. Workers sem usuário precisam de autenticação do evento e escopo explícito, não “sem identidade = global”.

**Reprodução necessária:** para cada handler, usuário A chama com ID/tenant B; usuário anônimo chama endpoint; usuário staff de B tenta A; verificar HTTP/erro, query, linhas retornadas/afetadas e leitura posterior. Não aceitar apenas 401/200 ou mock.

**Dependências:** matriz W2.1, schema/migrations W3, banco efêmero, fixtures de duas lojas. **Não corrigido nesta auditoria.**

### W2-F02 — Policies e RLS efetivos não foram reconciliados com migrations

**Classificação:** existência de policies em migrations confirmada; estado efetivo e bypass **não verificados**. **Severidade:** P0 para qualquer tabela sensível sem RLS/policy restritiva; P1 enquanto gap de prova.

**Evidência:** `20260730234419_refactor_identity_and_tenancy.sql` contém policies tenant-aware usando `has_workspace_role`/`is_store_staff` (por exemplo `:157-244` e `:249-260`). `20270109000000_wave6_tourism_rls_final_hardening.sql` cria políticas tenant manage e revoga anon em tabelas turísticas (`:22-29`, `:50-120`). Porém o masterplan exige revisão por tabela/coluna e rejeição de `USING(true)`, `WITH CHECK(true)` e `store_id IS NULL`; grep histórico encontra policies públicas legítimas e diversas policies em migrations, sem prova de qual versão está instalada.

**Risco:** policy permissiva residual, tabela nova sem `ENABLE ROW LEVEL SECURITY`, `FOR ALL` com check insuficiente, ou owner/service-role contornando a prova.

**Gate:** aplicar migrations desde zero e contra snapshot representativo; exportar `pg_class`, `pg_policies`, roles/grants; executar matriz anon/authenticated/tenant A/B/admin/service-role; incluir INSERT e UPDATE (não apenas SELECT).

### W2-F03 — Revogação global de `SECURITY DEFINER` precisa de prova de regressão e privilégio efetivo

**Classificação:** migration e intenção confirmadas; segurança efetiva não verificada. **Severidade:** P1, promovível a P0 se RPC público expuser PII/mutação.

**Evid��ncia:** `20270113000000_security_advisory_remediation.sql:68-96` percorre todas as funções públicas `prosecdef`, revoga `PUBLIC, anon, authenticated` e concede `service_role`; `:98-124` verifica somente magic link. `20261007130000_rpc_grants_and_explicit_profile_provisioning.sql:13-18` cria função `SECURITY DEFINER` com search path fixo e `:29-63` seleciona/retorna campos de lead.

**Risco:** overloads/funções criadas depois da migration, owner com poderes excessivos, search path/qualificação incompleta, ou BFF que usa `service_role` sem validar ator. A assertiva do arquivo não prova todos os grants de todas as funções no banco.

**Gate:** `pg_proc`/`has_function_privilege` pós-migration; dump antes/depois; testes de cada assinatura para anon/authenticated/owner/tenant alheio/admin/service-role; review de `SET search_path`, owner e toda tabela tocada.

### W2-F04 — Testes atuais têm baixa discriminação para RLS/tenant

**Classificação:** confirmado no teste; falha de produção **não verificada**. **Severidade:** P1.

**Evidência:** `src/services/rls-cross-tenant-isolation.test.ts:121-186` filtra arrays locais e calcula receita em memória; não cria sessão, banco, policy ou query. `src/services/rpc-security-wave.test.ts:19-37` apenas lê strings de migration/source. `src/services/ai-conversations-access.test.ts:12-22` testa função pura com `as any`, não endpoint/DB.

**Risco:** regressão de policy, grant ou query service-role pode passar verde. Typecheck/build/teste mockado não sobem de nível de evidência, conforme skill e spec.

**Gate:** suíte contra Postgres efêmero/Supabase de teste com dois tenants, JWT real/claims, banco limpo e migrations; mutation test removendo filtro/policy deve falhar; anexar logs e linhas afetadas.

### W2-F05 — Resolução de tenant por cookie/subdomínio não é, sozinha, identidade confiável

**Classificação:** mecanismo confirmado no código; bypass **não verificado**. **Severidade:** P1, P0 se usado para escrita sem membership.

**Evidência:** `src/lib/tenant.server.ts:14-42` prioriza cookie ativo e depois resolve slug por `getAnonServerClient`; `:46-49` corretamente não cai na primeira loja. Isso é contexto de navegação, não prova de autorização. O contrato W2 exige tenant derivado do servidor e membership/role validado, jamais somente body/cookie.

**Gate:** para toda função que consome `resolveTenantStoreId`, provar que cruza o resultado com `getServerIdentity`/membership antes de leitura sensível ou escrita; testar cookie/subdomínio apontando para B com identidade A e ausência de cookie.

### W2-F06 — Cota antes de custo externo está sem prova transversal

**Classificação:** não verificado; hipótese operacional do masterplan. **Severidade:** P1; P0 caso provider/segredo seja acionável anonimamente.

**Evidência:** o masterplan prescreve W2.5 (`:115`), mas os testes lidos de segurança não instrumentam provider, segredo, quota, rate-limit, débito ou replay. A triagem de callers service-role também mostra workers/serviços que necessitam revisão explícita.

**Gate:** casos anon, sem quota, quota concorrente, tenant alheio e retry; assert de zero chamada externa/zero leitura de secret/zero débito antes da rejeição.

## 5. Riscos de mistura com branches remotas

- A spec proíbe incorporar automaticamente `origin/audit/recursive-p0-remediation`, `origin/chore/recover-waesy-task-2026-10-06`, `origin/feat/waesy-canonical-travel-evolution` ou outras branches (`SPEC-20261007-FULL-REMEDIATION-EXECUTION.md:33-39`).
- O masterplan registra 13 paths locais sujos em outro worktree e recomenda preservá-los sem `git add -A` (`WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md:24-49`). Não foram tocados aqui.
- `origin/main` está em `919c8688`, enquanto o snapshot documental do masterplan tinha bases temporais diferentes. Toda decisão deve comparar SHA/path/ownership, não cherry-pick por assunto.
- Migrations de segurança são ordenadas por timestamp; cherry-pick parcial pode deixar grants/policies sem dependências ou aplicar revogação antes de BFF compatível. Gate obrigatório: migration desde zero, checksum, `git diff --name-status` e revisão de ownership.

## 6. Microfases atômicas propostas e gates

1. **W2.0 — Freeze e ledger:** registrar SHA `fc8f9fc3`, base, status, paths, branches e reprodução; gate: nenhuma mutação sem ledger preenchido.
2. **W2.1 — Matriz de identidade:** enumerar cada `createServerFn`, route handler, stream, RPC, webhook e worker; para cada um registrar ator, role, tenant, fonte do ID, cliente Supabase e saída anônima. Gate: 100% dos entrypoints classificados; candidatos W2-F01 separados.
3. **W2.2 — Fechar service-role por fatia:** selecionar no máximo uma família (por exemplo search/catalog ou tourism); adicionar/validar guard e ownership somente com spec autorizada. Gate: teste positivo A, negativo B, anon, ID inexistente, erro DB, reload/read-back; nenhum `service_role` sem justificativa.
4. **W2.3 — Snapshot RLS:** aplicar todas as migrations em Postgres efêmero e exportar tabelas, policies, roles e grants. Gate: `rowsecurity=true` para escopo, sem permissivos não justificados, migration repetível.
5. **W2.4 — Exercitar RLS real:** fixtures de tenants A/B + roles owner/staff/admin/anon/service-role; SELECT/INSERT/UPDATE/DELETE e IDs de pai. Gate: zero leitura/escrita cruzada, logs de query/contagem e mutation test.
6. **W2.5 — RPC/SECURITY DEFINER/grants:** inventariar `prosecdef`, owner, `search_path`, overloads, EXECUTE/default privileges; revisar a revogação global. Gate: dump before/after e testes por role; nenhum RPC público sem decisão documentada.
7. **W2.6 — Quota/custo:** instrumentar provider/key access e quota/rate-limit nos entrypoints W2; gate: rejeição antes de segredo/provider/débito, concorrência e replay cobertos.
8. **W2.7 — Integração e adversarial review:** rodar typecheck/build/lint apenas como gates independentes; depois browser/CI/staging. Gate final de W2 somente com evidência positiva e negativa anexada; sem declarar produção.

## 7. Critério de fechamento

W2 só pode ser marcada como verificada quando W2.1–W2.5 (e W2.5 de custo quando aplicável) tiverem ledger por microfase, regressão que falha na baseline e passa no SHA candidato, Postgres real/efêmero com JWT/roles, prova cross-tenant negativa, dump de grants, revisão adversarial e checks do mesmo SHA. Até lá, os estados corretos são **confirmado no código/teste**, **histórico**, **hipótese** ou **não verificado**, nunca “corrigido em produção”.
