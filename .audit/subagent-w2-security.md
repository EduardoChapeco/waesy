# Auditoria técnica independente — W2

**Escopo:** identidade, autorização, tenant, RLS, `service_role`, `SECURITY DEFINER`, grants e quota antes de custo externo.  
**Repositório:** `/home/ubuntu/waesy`  
**Snapshot observado:** `main`, `HEAD=98c0d2c2f8c01793a327a12f814c17d9de5e2afb`, `origin/main` no mesmo SHA, 495 migrations no checkout.  
**Data da leitura:** 2026-10-10 00:26 (-03).  
**Natureza:** auditoria somente leitura. Não alterei código, testes, migrations, configuração, branch, banco, deploy ou produção.

## 1. Veredito

**W2 está `partial`/aberta e não pode ser declarada concluída.** Há controles locais úteis — helpers de identidade, guards, migrations de hardening, revogações textuais e testes unitários — mas o isolamento efetivo ainda não foi demonstrado para os endpoints expostos. Encontrei defeitos verificáveis no código atual, inclusive BFFs que usam `service_role` sem autorização suficiente, resolução de identidade que cria contexto silencioso e quota não atômica. A ausência de Postgres/Supabase/JWT/`SET ROLE` impede converter a maioria das hipóteses de impacto em prova de banco, mas não transforma a intenção das migrations em evidência de segurança.

A conclusão respeita os gates oficiais:

- O inventário exige RLS, grants, `SECURITY DEFINER`, ownership e isolamento cross-tenant exercitados com roles/JWT reais (`docs/audits/FULL-REMEDIATION-INVENTORY-20261007.md:39-49,57`).
- A prontidão W0–W7 classifica W2 como parcial/aberta e registra ausência de matriz endpoint×identidade×role×tenant, Postgres, JWT, catálogo de policies/grants, browser, provider e deploy (`docs/audits/20261007-WAVE-READINESS-W0-W7.md:57-65`).
- O masterplan requer, para W2.1–W2.5, matriz completa, testes A/B, RLS com JWT/`SET ROLE`, dump de grants e prova de zero provider/secret/debit antes da rejeição (`docs/audits/WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md:105-115`).
- O relatório histórico W2 anterior também limita seus resultados a evidência estática/testes e declara integração, DB, JWT, browser, CI e produção não verificados (`docs/audits/full-remediation-inventory/02-w2-security.md:9-13,42-58`).

## 2. Níveis de evidência

| Nível | Resultado desta auditoria |
|---|---|
| **Código local** | Confirmados os fluxos e bugs descritos abaixo por leitura do checkout atual. |
| **Teste local** | `npx vitest run src/services/rpc-security-wave.test.ts src/services/rls-cross-tenant-isolation.test.ts src/services/ai-conversations-access.test.ts`: 3 ficheiros, 19 testes, todos verdes. São testes textuais/puras/memória; não exercitam HTTP, banco, RLS ou JWT. |
| **Banco/Postgres** | **Bloqueado/não executado.** Não havia `supabase`/`psql` utilizável nem Docker disponível no ambiente; nenhuma migration foi aplicada. Não há `pg_class`, `pg_policies`, `pg_proc`, `prosecdef`, owners ou grants reais. |
| **Browser/E2E** | Não executado. Nenhuma conclusão de sessão, cookie, subdomínio, reload ou IDOR em browser é promovida. |
| **Provider/segredo** | Não executado. Não há prova de chamadas externas, seleção de chave, saldo ou débito em runtime. |
| **CI** | Não executado neste SHA nesta auditoria. Testes locais não equivalem a CI. |
| **Deploy/produção** | Não acessado; nenhum deploy/smoke público foi feito ou declarado. |

## 3. Baseline e caveat de worktree

O checkout atual não é uma worktree limpa: `git status` mostra vários docs/scripts/testes modificados, `.audit/subagent-w0-w1-release.md` não rastreado e migrations removidas/recriadas como novos nomes (`20270113000000_*` etc.). Esses diffs pertencem ao ambiente compartilhado e não foram tocados. Portanto:

1. os achados abaixo são relativos ao **conteúdo atual da árvore**, não somente ao commit `98c0d2c`;
2. não se deve usar este worktree como candidato de replay ou release;
3. o fato de `origin/main` apontar para o mesmo SHA não torna os diffs locais parte de `main`;
4. a árvore possui 495 migrations, mas não houve replay from-zero, segunda aplicação, reconciliação de colisões ou snapshot de catálogo.

## 4. Achados verificáveis agora

### W2-F01 — BFF Studio exposto com `service_role` e sem ownership/tenant obrigatório (P0/P1)

**Evidência de código:** `src/services/studio.functions.ts:54-92,97-117,122-172,177-194`.

- `listStudioProjects` chama `getServerIdentity()` mas não rejeita identidade anônima nem chama `assertStoreAccess`/`requireStaff`. Se `data.store_id` for fornecido, ele vira diretamente o filtro `.eq("store_id", data.store_id)`; não existe verificação de membership no store informado.
- `getStudioProjectById` usa `getServerClient()` e faz `.eq("id", data.id)` sem qualquer identidade, actor, store ou owner check.
- `saveStudioProject` resolve a identidade, mas em update filtra apenas `.eq("id", data.id)`. Não filtra o owner/tenant anterior; o payload substitui `store_id` por `identity.store_id` e `user_id` por `identity.id`. Um caller que conheça um ID pode editar/mover o projeto de outra loja, sujeito apenas ao comportamento do banco.
- `deleteStudioProject` também filtra apenas por ID, embora o `identity` seja carregado e nunca usado para autorização.

`getServerClient()` é explicitamente `service_role` e bypassa RLS (`src/lib/supabase.ts:129-160`). Assim, políticas posteriores de `studio_projects` não protegem estes handlers. O código já é prova suficiente de **ausência de enforcement no BFF**; o número de linhas realmente afetadas permanece prova de banco pendente.

**Correção local de baixo risco:** exigir identidade autenticada/staff antes de todos os handlers; para leitura/alteração/delete, derivar o target a partir do registro e aceitar somente `(auth.uid() = user_id)` ou membership staff do `store_id`; em update/delete usar filtro de owner/store e rejeitar `count=0`/retorno vazio. Não aceitar `store_id` arbitrário do cliente sem `assertStoreAccess(identity, roles, targetStoreId)`.

### W2-F02 — Operações de assento/check-in bypassam autorização e podem atravessar tenants (P0/P1)

**Evidência de código:** `src/services/tourism-operations.functions.ts:101-153,158-205`.

- `listExperienceSeatReservations` usa `getAnonServerClient()` e retorna `passenger_name` para qualquer request com `experience_id` (`:101-113`). Mesmo que o banco negue anon, o endpoint está desenhado para consultar PII sem actor; se uma policy pública permitir assentos, ocorre vazamento de nome/documento operacional. A política efetiva não foi verificada.
- `reserveExperienceSeat` usa `getServerClient()` sem `getServerIdentity`, sem membership, sem validar que `experience_id`, `bus_layout_id` e `order_id` pertencem ao mesmo tenant; o check-then-insert também é não atômico (`:118-152`). A RLS não limita `service_role`.
- `validateEventTicketCheckin` exige apenas `identity.id` (`:158-164`). O QR é procurado globalmente (`.eq("qr_code_hash", ...)`, `:166-170`), sem evento/store/role/membership do operador. Um usuário autenticado de outra loja que possua um hash pode atuar no ingresso alheio. O resultado do `update` é ignorado (`:187-196`) e a função retorna `success: true` mesmo se a escrita falhar.

A migration de security advisory apenas cria policy `event_checkins_service_role_only` para o papel privilegiado (`supabase/migrations/20270113000000_security_advisory_remediation.sql:16-38`); isso não substitui guard no endpoint. A migration histórica de turismo contém policies `USING(true)` em entidades sensíveis (`supabase/migrations/20260930000000_tourism_core_unified_tables.sql:388-428`), enquanto migrations posteriores tentam endurecer outras tabelas. Sem banco aplicado, não se pode dizer qual policy está efetiva.

**Correção local de baixo risco:** para reserva, exigir actor e derivar store/experience/order do servidor; trocar check-then-insert por RPC/unique constraint transacional. Para listagem pública, retornar somente disponibilidade/seat number, nunca `passenger_name`. Para check-in, exigir staff do store do evento, incluir `store_id`/evento no lookup e usar update condicional `WHERE id=? AND is_checked_in=false`, tratando erro/linha afetada antes de responder sucesso.

### W2-F03 — Guest recebe primeira loja como tenant silencioso (P1, potencial P0 em endpoints dependentes)

**Evidência:** `src/lib/identity.server.ts:70-105` e `src/lib/tenant.server.ts:5-10,46-49`.

`tenant.server.ts` declara corretamente que não há fallback para a primeira store e retorna `null` sem contexto. Porém `getServerIdentity()` para usuário não autenticado, após `resolveTenantStoreId()` retornar `null`, usa `getServerClient().from("stores").select("id").limit(1).maybeSingle()` e coloca essa loja em `guestIdentity.store_id` (`identity.server.ts:82-105`). Isso contradiz o contrato do tenant resolver e cria um contexto organizacional para anon sem cookie/subdomínio. Qualquer handler que confira somente `identity.store_id`, ou use o valor para selecionar dados, pode operar/consultar a primeira loja.

**Correção local de baixo risco:** remover o fallback `stores.limit(1)`; identidade guest deve sempre ter `store_id: null` sem contexto confiável. Adicionar regressão explícita para anon sem cookie e sem subdomínio.

### W2-F04 — Auto-heal transforma email/settings em ownership e grava membership `owner` (P1, potencial P0)

**Evidência:** `src/lib/identity.server.ts:181-320`.

Quando memberships está vazio, o código procura lojas por `stores.email.ilike(userEmail)` ou por `settings->>user_id`/`settings->>created_by` (`:239-268,273-280`). Cada resultado é convertido em membership com `role: "owner"` (`:284-305`) e persistido em `workspace_members` com `role: "owner"` por `service_role` (`:307-320`). Email de contato ou metadados de criação não são, por si, uma prova de titularidade. Esta é uma escalada de privilégio verificável no desenho; exploração em um banco com dados reais requer fixture/JWT e está pendente.

**Correção local de baixo risco:** desativar a criação automática de membership; mover provisionamento para fluxo explícito de onboarding/convite com prova de posse e role determinada pelo servidor. No mínimo, auto-heal nunca deve inferir `owner` de email, `created_by` ou JSON editável.

### W2-F05 — Memoização da identidade não incorpora `Host`/subdomínio (P1)

**Evidência:** `src/lib/identity.server.ts:19-59,347-395` e `src/lib/tenant.server.ts:26-44`.

`resolveMemoKey()` é composto pelo cookie de auth e cookies `waesy_*`, mas não pelo header `Host`. O tenant resolver usa o subdomínio para obter o store (`tenant.server.ts:26-42`). Para o mesmo usuário autenticado navegando entre subdomínios sem mudança do cookie tenant, o cache de 10 segundos pode devolver a identidade anterior, incluindo `store_id`/role de A, ao request de B. A identidade também é guardada e devolvida como objeto mutável no contexto/cache; `assertStoreAccess` altera `store_id` e `role` in-place (`src/lib/identity-core.ts:88-125`).

Não afirmo que todo navegador compartilha os cookies entre os subdomínios nem que toda rota vulnerável esteja alcançável; afirmo o defeito de chave/isolamento e o risco de contexto errado. **Browser e DB são necessários para quantificar impacto.**

**Correção local de baixo risco:** incluir host/subdomínio e todos os cookies de tenant na chave; ou retirar o memo global e manter cache estritamente por request. Retornar cópia imutável da identidade e fazer asserts sem mutar o objeto de origem.

### W2-F06 — `assertStoreAccess` possui escape de membership e mutação antes da validação (P1)

**Evidência:** `src/lib/identity-core.ts:79-126`.

- Com `targetStoreId` ausente, se `identity.store_id` está preenchido, mas não existe membership correspondente, o ramo `:115-117` retorna sucesso apenas porque `identity.role` está em `allowedRoles`; portanto o helper não exige membership em todos os caminhos.
- Antes de validar membership, o helper grava `identity.store_id = effectiveStoreId` (`:95-106`). Em falha de cross-tenant, o objeto já foi mutado; para platform admin, também muta deliberadamente (`:88-92`). No contexto/memo compartilhado isso pode contaminar chamadas subsequentes.

O caminho nominal `getServerIdentity()` costuma preencher memberships; logo a exploração completa depende de falha/variação de resolução. Ainda assim, o contrato do helper é mais permissivo do que a regra W2.2.

**Correção local de baixo risco:** remover o ramo `!targetMembership && !targetStoreId`, exigir membership para qualquer não-global, calcular `effectiveStoreId` em variável local e retornar uma nova identidade/resultado sem mutar o objeto recebido. Testar identity sem membership, alvo A/B, platform admin e erro seguido de nova chamada.

### W2-F07 — Quota civil é read-modify-write não atômico e ignora erros (P1)

**Evidência:** `src/services/token-quota.functions.ts:149-228`.

`consumeCivilTokens` lê saldo/cota (`:152-161,173-186`), atualiza wallet em operação separada (`:188-192`), depois atualiza/insere quota (`:195-212`) e registra auditoria (`:214-228`). Não há lock, RPC atômica, condição de saldo, idempotency key ou verificação de erro de qualquer update/insert. Duas chamadas concorrentes podem validar o mesmo saldo, perder atualização ou permitir consumo duplicado; falha posterior pode deixar débito parcial e a função ainda pode retornar sucesso. A documentação W3 já registra que `user_daily_token_quotas` não foi encontrada nas migrations/tipos; isso é quebra de contrato local a reconciliar, não prova de schema remoto.

**Correção local de baixo risco:** centralizar débito em RPC transacional com `FOR UPDATE`/`UPDATE ... WHERE balance >= ...`, unique key por operação, retorno de linhas afetadas e rollback; tratar cada erro antes de responder. Não permitir `customTokenAmount` cliente controlar custo sem allowlist/limite.

### W2-F08 — Caminhos de custo não estão cobertos transversalmente por preauthorization (P1)

**Evidência:**

- No Copilot, apenas o ramo com `context.storeId` chama `requireTokensOrTollbooth`; quando `context.storeId` é nulo, o código chama `runGateway()` diretamente (`src/services/ai-conversations.functions.ts:768-781`). O ramo pode ser legítimo para contexto civil, mas ainda é uma chamada externa sem prova de quota/rate-limit/zero-secret antes do provider.
- No lifecycle de mídia, `finalize_ai_async_job` cobra somente depois de um job já executado, na finalização (`supabase/migrations/20261007000001_ai_media_jobs_quota_lifecycle.sql:106-135`). Isso é explicitamente posterior ao custo externo, contrariando W2.5; as funções são concedidas somente a `service_role` (`:139-146`), portanto todo worker/route caller precisa de guard/escopo próprio.

O requisito não é demonstrado por mocks. O teste necessário deve instrumentar provider e leitura de segredo e provar `zero calls/zero debit` em anon, sem saldo, replay e tenant alheio.

### W2-F09 — Migrations de grants/`SECURITY DEFINER` têm intenção forte, mas não provam actor, ordem efetiva ou futuro (P1; P0 se exposto)

**Evidência:**

- `20261007130000_rpc_grants_and_explicit_profile_provisioning.sql:13-66` cria `get_public_lead_by_token(text)` como `SECURITY DEFINER`, com `search_path` fixo, e retorna PII de lead; o loop `:72-96` revoga `EXECUTE` de todas as funções `prosecdef` existentes naquele instante e concede `service_role`.
- `20270113000000_security_advisory_remediation.sql:68-96` repete uma revogação dinâmica em funções existentes, mas não é um mecanismo de default privilege para funções criadas depois, nem substitui auditoria de owner/search_path/actor. Para 25 tabelas cria policy `FOR ALL TO service_role USING(true) WITH CHECK(true)` (`:16-38`); isso é uma allowlist do papel privilegiado, não isolamento por tenant para callers service-role.
- `record_travel_sale_payment` é `SECURITY DEFINER`, trava a venda e usa `auth.uid()` (`20261006150000_wave2_rls_financial_transactions.sql:257-324`), mas não valida dentro da RPC se o actor é membro/staff/finance da `v_sale.store_id`; só o grant posterior para `service_role` (`:326-331`) reduz a superfície direta. `finalize_ai_async_job` valida `p_store_id`/job, mas não actor (`20261007000001_ai_media_jobs_quota_lifecycle.sql:106-135`).

Os grants efetivos, owners, overloads, `proconfig`, `search_path` instalado e se as migrations foram aplicadas estão bloqueados sem banco. Não classifiquei a presença de `USING(true)` em migrations públicas de catálogo como bug por si só; tabelas de referência podem ser públicas, mas as policies legacy de turismo e o conjunto de 95 ficheiros com `USING(true)`/47 com `WITH CHECK(true)` exigem reconciliação por tabela, role e finalidade.

**Correção/evidência de baixo risco:** gerar dump `pg_proc`/`pg_policies`/`information_schema.role_table_grants` pós-replay; definir owner/search_path qualificado e actor/membership dentro de cada `SECURITY DEFINER`; aplicar revogações/grants após todas as funções e testar cada assinatura com anon/authenticated/owner/tenant alheio/admin/service-role.

### W2-F10 — Suíte verde atual não tem poder discriminatório para RLS/tenant (P1 de assurance)

**Evidência:**

- `src/services/rls-cross-tenant-isolation.test.ts:12-18,120-167` cria identities e arrays em memória; o “RLS” é `Array.filter` local, sem policy/query/DB.
- `src/services/rpc-security-wave.test.ts:5-37` lê strings de migration e source; não chama RPC nem `has_function_privilege` em Postgres.
- `src/services/ai-conversations-access.test.ts:4-23` testa uma função pura com objetos `as any`.

Os 19/19 testes focados passam, mas isso apenas prova que os contratos locais e strings esperadas permanecem; não prova isolamento. O teste de mutação necessário deve remover filtro/policy e falhar, além de usar dois tenants, JWT/roles reais, INSERT/UPDATE/DELETE/SELECT e linhas afetadas.

## 5. O que foi positivamente observado

- `src/lib/server-access.ts` centraliza adaptadores de identidade/guards e `src/lib/identity-core.ts` contém listas explícitas de roles.
- `src/lib/tenant.server.ts` não faz fallback para primeira loja quando usado isoladamente.
- `20261006150000_wave2_rls_financial_transactions.sql:17-147` adiciona `USING` e `WITH CHECK` tenant-aware em vários agregados de turismo; isso é intenção correta, ainda sem prova instalada.
- `20261007130000` e `20270113000000` revogam EXECUTE público de várias funções `SECURITY DEFINER`; a intenção é boa, mas precisa de catálogo e regressão para não virar falso sentimento de segurança.
- O scan de bundle (`scripts/check-client-server-leak.mjs`) verifica runtime server em chunks de boot; esse gate não prova autorização/RLS e não foi tratado como tal.

## 6. Gaps/bloqueadores para fechar W2

1. **Banco não disponível/sem replay:** sem Postgres/Supabase autorizado, JWT A/B, `SET ROLE`, `pg_policies`, `pg_class.rowsecurity`, `pg_proc`, owners e grants.
2. **Worktree suja:** alterações e migrations deletadas/recriadas impedem tratar este SHA como candidato imutável; primeiro congelar e reconciliar paths/hashes.
3. **Matriz W2.1 inexistente:** ainda não há inventário completo endpoint × identidade × role × tenant para `createServerFn`, rotas, stream, RPC, jobs e webhooks.
4. **Service-role triage extensa:** análise textual encontrou 304 ficheiros com `getServerClient` e 64 sem token textual de guard (inclui testes, jobs e rotas públicas; é triagem, não veredito). Requer revisão função a função e allowlist explícita.
5. **Sem provider/quota real:** não há prova de segredo/provider/worker antes/depois do gate, concorrência, débito único ou replay.
6. **Sem browser/CI/deploy:** não há teste de cookie/subdomínio, IDOR HTTP, reload, CI no mesmo SHA, staging, deploy ou smoke público.
7. **Schema/migrations ainda bloqueantes:** não se sabe se as 495 migrations aplicam desde zero, se policies legacy são substituídas, ou se tabelas/colunas usadas por quota existem.

## 7. Safe fixes recomendados ao agente principal

1. **P0 imediato:** fechar Studio e tourism operations com guard obrigatório, escopo derivado do registro/tenant e checagem de linhas afetadas; remover PII de endpoint anon.
2. Remover fallback `stores.limit(1)` para guest e criar regressão local anon sem contexto → `store_id=null`.
3. Desligar auto-heal de membership por email/settings; provisionar somente por onboarding/convite explícito e role server-side.
4. Corrigir memo key para incluir host/tenant e eliminar mutação de objetos retornados por `assertStoreAccess`.
5. Tornar `assertStoreAccess` deny-by-default: membership obrigatório para não-global, sem mutação antes da validação.
6. Migrar token debit/quota para uma RPC transacional com lock, idempotência e tratamento de erros; reconciliar DDL/tipos de `user_daily_token_quotas`.
7. Forçar tollbooth também no caminho civil antes de qualquer gateway/provider, ou documentar e provar formalmente uma política de custo zero; mídia deve reservar quota antes do provider e reconciliar falha/cancelamento.
8. Adicionar suíte de integração W2 contra Postgres descartável com migrations do candidato, duas lojas, JWTs reais e dump de catálogo/grants; manter os testes textuais apenas como smoke de source.
9. Adicionar um lint/ledger de callers `service_role` com justificativa por handler, owner de revisão e negative test, sem considerar apenas presença textual de `getServerIdentity` como prova.

## 8. Evidência e conclusão final

A evidência independente atual suporta **bugs de código confirmados** (Studio, turismo, fallback guest, auto-heal, memoização, helper permissivo e quota não atômica), **intenção de hardening em migrations** e **testes locais limitados**. Não suporta uma afirmação de RLS/grants efetivos, isolamento cross-tenant em banco, proteção de provider/quota em runtime, browser, CI, provider ou deploy. Portanto, nenhuma microfase W2.1–W2.5, nem a frente W2 inteira, deve ser marcada como concluída neste snapshot.
