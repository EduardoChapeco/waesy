# Reauditoria de dados — Migrations, schemas, tabelas, RLS e tenants

- **Data da análise:** 2026-10-06
- **Escopo:** exclusivamente `supabase/migrations`, schemas/tabelas/policies/RPCs e consumidores Supabase em `src/`, mais testes diretamente relacionados a dados/RLS.
- **Repositório:** `/home/ubuntu/waesy-audit`
- **Modo:** análise estática do código-fonte e execução local de typecheck/testes; não houve conexão com uma base Supabase nem execução das migrations em PostgreSQL.
- **Alterações:** não alterei código, SQL, testes ou configuração. Este arquivo é o único artefato produzido por esta etapa.

## Sumário executivo

A base contém **443 migrations de produção** em `supabase/migrations` e **271 migrations de referência** em `supabase/reference-migrations`; as de referência foram tratadas como material não necessariamente aplicado. Há bloqueadores de aplicação de schema: quatro colisões de versão de migration, referências a colunas que não existem em `workspace_members` (`user_id` e `is_active`) em policies recentes e divergências de nomes de policies que impedem determinar um conjunto final de permissões. Também há um RPC chamado pelo TypeScript que não tem definição SQL (`increment_cache_hit`) e uma lacuna de evidência: o teste chamado de isolamento RLS só filtra arrays em memória, enquanto os serviços de servidor usam `service_role`, que bypassa RLS.

**Severidade global:** **Crítica** até que as migrations sejam validadas/aplicadas em um PostgreSQL limpo e que exista um teste de integração real com dois tenants.

## Método e limites

1. Inventariei os arquivos SQL de produção e comparei declarações de tabelas, colunas, funções, policies e grants com chamadas `.from(...)`/`.rpc(...)` literais no TypeScript.
2. Li as migrations fundacionais e os blocos finais de hardening (`20261116000001`, `20261226000000`, `20261227000000`, `20261231000000`, `20270108000000`, `20270109000000`, `20270110000000`).
3. O typecheck local falhou com 4 erros; um é diretamente de contrato de pagamento/dados (`cash_on_delivery` versus schema de entrada), e os demais envolvem rota/evento.
4. `npm test -- --reporter=verbose` executou **213 arquivos, 210 aprovados e 3 falhos; 1.414 testes aprovados de 1.417**. As três falhas observadas foram copilot boundary e duas suítes de crypto-vault sem `VAULT_MASTER_KEY`; não são prova de sucesso de RLS.
5. O working tree já estava sujo, com vários arquivos modificados e migrations/rotas não rastreadas antes do relatório. Portanto, este relatório não afirma qual subset foi aplicado no banco real.

## Achados

### DATA-01 — Colisões de versão nas migrations de produção

- **Classificação:** fato confirmado; hipótese de impacto operacional depende do executor/estado do ledger.
- **Risco:** **Crítico — bloqueio de deploy, ordem ambígua e divergência entre ambientes.**
- **Evidência:** existem, no mínimo, estes prefixos repetidos:
  - `supabase/migrations/20261002000001_f04_classifieds_promotion_columns.sql:1` e `20261002000001_s20_scale_indexes.sql:1`;
  - `supabase/migrations/20261115000000_crawler_resilience_and_mined_products.sql:1` e `20261115000000_systemic_order_number_and_telemetry.sql:1`;
  - `supabase/migrations/20270106000000_campaign_scheduling_and_auto_archive.sql:1` e `20270106000000_live_p0_security_hardening.sql:1`;
  - `supabase/migrations/20270107000000_cms_locality_and_banner_auto_archive.sql:1` e `20270107000000_document_artifacts_ocr_provenance.sql:1`.
- **Fato técnico:** os nomes carregam a mesma chave numérica inicial para mais de um arquivo. Um executor que usa essa chave como versão única não consegue representar dois arquivos de forma determinística; normalmente rejeita duplicidade ou exige reconciliação manual.
- **Hipótese/impacto:** se um ambiente aplicou somente um dos arquivos, o schema diverge silenciosamente do ambiente que aplicou o outro; isso pode explicar colunas/RPCs presentes em TypeScript mas ausentes na base.
- **Dependências:** ledger de migrations (`supabase_migrations`/mecanismo equivalente), CI/CD e qualquer snapshot de schema.
- **Correção concreta:** escolher uma ordem canônica, renomear todos os arquivos para versões numéricas únicas antes de aplicar, atualizar referências/ledger de forma controlada e executar `supabase db reset`/diff em um banco descartável. Não marcar migrations como aplicadas apenas para contornar a colisão.

### DATA-02 — Policies de suporte e storage usam `workspace_members.user_id`, coluna inexistente

- **Classificação:** fato confirmado no conjunto de migrations versionadas.
- **Risco:** **Crítico — erro de aplicação da migration; se contornado manualmente, policies deixam de proteger/autorizar o tenant como pretendido.**
- **Schema canônico:** `supabase/migrations/20260730234419_refactor_identity_and_tenancy.sql:9-17` cria `public.workspace_members` com `profile_id`, `store_id`, `role`, timestamps e `UNIQUE(profile_id, store_id)`. Não cria `user_id`.
- **Evidência 1:** `supabase/migrations/20261116000001_support_tickets_rls_and_bilateral.sql:38-41` e `:50-53` testam `wm.user_id = auth.uid()`; o mesmo ocorre para mensagens em `:94-98` e `:108-112`.
- **Evidência 2:** `supabase/migrations/20261231000000_storage_rls_lockdown_views_security_invoker.sql:243-249`, `:269-275`, `:309-315` e `:334-341` repetem `wm.user_id` dentro das policies de `storage.objects`.
- **Fato técnico:** em um banco que contém exatamente a tabela criada pela migration canônica, a expressão da policy referencia uma coluna inexistente. A criação da policy deve falhar na validação do SQL; não foi executado um PostgreSQL real nesta auditoria, portanto não afirmo o estado do banco remoto.
- **Dependências:** `workspace_members`, policies de `support_tickets`, `ticket_messages`, `storage.objects` e todas as migrations posteriores que pressupõem o hardening.
- **Correção concreta:** substituir a referência pela coluna canônica `wm.profile_id` (ou formalizar uma migration explícita que adicione `user_id`, sem manter dois pivôs). Recriar as policies em transação, validar em banco limpo e adicionar teste SQL que verifica `pg_attribute`/policy expression e acesso cruzado.

### DATA-03 — `20270109000000` usa `workspace_members.is_active`, também inexistente, e enumera papéis que o schema não aceita

- **Classificação:** fato confirmado; a consequência de aplicação é inferida da validação normal de policies PostgreSQL.
- **Risco:** **Crítico — a migration E2E de booking/support não é aplicável contra o schema canônico; isolamento fica sem a regra final.**
- **Evidência:** `supabase/migrations/20270109000000_e2e_booking_chat_rls_hardening.sql:21-28` usa `wm.profile_id = auth.uid() AND wm.is_active = true` na policy de `booking_appointments`. A mesma coluna é usada em `:46-59` nas policies de `support_tickets`.
- **Schema comparado:** `20260730234419_refactor_identity_and_tenancy.sql:9-16` não declara nem adiciona `is_active`; a busca em todas as migrations de produção encontrou apenas `ALTER TABLE ... ENABLE/FORCE ROW LEVEL SECURITY` para `workspace_members`, não `ADD COLUMN is_active`.
- **Evidência adicional:** o `CHECK` de `role` em `20260730234419_refactor_identity_and_tenancy.sql:13` permite `owner`, `admin`, `manager`, `seller`, `stock`, `finance`, `content`, `support`, `customer`. A policy final compara também `store_owner`, `proprietario`, `gerente` e `professional` (`:24`, `:55`, `:59`), que não podem existir em linhas que respeitam esse check.
- **Fato técnico:** `is_active` não está no contrato de tabela; os papéis adicionais são logicamente inalcançáveis sob o check existente. Não há evidência de que uma migration não encontrada tenha sido aplicada fora deste repositório.
- **Correção concreta:** decidir um único contrato: (a) adicionar `is_active NOT NULL DEFAULT true` e normalizar o catálogo de papéis, ou (b) remover `is_active`/papéis impossíveis das policies. Usar `profile_id` e uma função helper única (`has_workspace_role`) para evitar repetir pivôs. Validar INSERT/SELECT/UPDATE de booking e suporte para usuário, staff do tenant A e tenant B.

### DATA-04 — Limpeza de policies de suporte tem nomes incompatíveis; conjunto final pode continuar permissivo/ambíguo

- **Classificação:** fato confirmado no texto; efeito efetivo é condicional ao fato de a migration anterior ter sido aplicada.
- **Risco:** **Alto — policies permissivas do PostgreSQL são combinadas por OR para a mesma operação; regras antigas podem permanecer.**
- **Evidência:** `20261116000001_support_tickets_rls_and_bilateral.sql:15`, `:21`, `:27`, `:33` e `:45` cria, respectivamente, `Customers can view own tickets`, `Customers can create support tickets`, `Customers can update own tickets`, `Store members can view/update store support tickets`.
- **Evidência de limpeza incompleta:** `20270109000000_e2e_booking_chat_rls_hardening.sql:31-34` tenta remover `Customers can view their own support tickets`, `Customers can create support tickets`, `Workspace members can view support tickets` e `Workspace members can update support tickets`. Só o segundo nome coincide com uma policy anterior; `Customers can view own tickets`, `Customers can update own tickets` e os dois nomes de `Store members ...` não são removidos.
- **Fato adicional:** `20261116000001` tem comentário de migration `20261116000000` no cabeçalho, embora o filename seja `20261116000001` (`:1-4`), dificultando rastrear qual versão deveria ser removida.
- **Hipótese/impacto:** se policies antigas existirem no banco, a nova migration não define um conjunto determinístico. Em especial, a policy antiga de update de cliente (`:27-30`) continua em paralelo à policy de manager; políticas permissivas são ORadas. Se a migration antiga falhou por `user_id`, o estado pode variar por ambiente.
- **Correção concreta:** fazer `DROP POLICY IF EXISTS` com os nomes reais de todas as versões anteriores, criar policies com nomes canônicos únicos e declarar `USING` **e** `WITH CHECK` para operações de update/insert. Auditar o resultado via `pg_policies` após aplicar em banco limpo e banco com histórico parcial.

### DATA-05 — RPC `increment_cache_hit` é chamado no TypeScript mas não existe em SQL

- **Classificação:** fato confirmado pela busca textual no repositório.
- **Risco:** **Médio — métrica de cache não é atualizada; o erro é silenciosamente descartado.**
- **Evidência:** `src/services/ai-core-gateway.functions.ts:477-486` lê `ai_response_cache` e chama `supabase.rpc("increment_cache_hit", { p_fingerprint: fingerprint })`; a Promise é envolvida em `.catch(() => {})`.
- **Schema existente:** `supabase/migrations/20261206000000_v142_ai_core_gateway_pools_and_telemetry.sql:55-68` cria `ai_response_cache` com `hit_count` (`:64`), mas `rg` em todas as migrations não encontrou `CREATE FUNCTION increment_cache_hit` nem qualquer outra definição desse RPC.
- **Fato técnico:** a chamada retornará erro de função inexistente em ambientes que tenham apenas as migrations deste repositório; o catch impede que o cache hit falhe visivelmente, mas não impede a perda de observabilidade.
- **Correção concreta:** criar uma função SQL `increment_cache_hit(text)` com update atômico por `fingerprint_hash`, definir `search_path`, grants mínimos e RLS/SECURITY DEFINER deliberados; ou remover a chamada e registrar o contador por outro caminho. Adicionar teste de contrato RPC que compara todos os `.rpc()` literais com `pg_proc`/snapshot de functions.

### DATA-06 — O teste chamado de isolamento RLS não exercita PostgreSQL; serviços de servidor bypassam RLS com `service_role`

- **Classificação:** fatos confirmados; não é uma prova de vazamento, mas é uma lacuna de garantia.
- **Risco:** **Alto — uma falha de policy/tenant pode não ser detectada quando o BFF usa service role.**
- **Evidência do cliente:** `src/lib/supabase.ts:129-154` documenta e implementa `getServerClient()` com `SUPABASE_SERVICE_ROLE_KEY`; a própria linha `:153` indica que a chave bypassa RLS. `getAnonServerClient()` é o cliente que respeita RLS (`:163-188`).
- **Evidência do consumidor:** `src/services/marketplace-checkout.functions.ts:166-180` usa `getServerClient()` e chama o RPC de checkout; `src/routes/api.webhooks.payments.ts:52-61` usa o mesmo padrão para o RPC de webhook. O inventário local encontrou uso amplo de `getServerClient` nos serviços.
- **Evidência do teste:** `src/services/rls-cross-tenant-isolation.test.ts:122-135` filtra `mockNotificationsDatabase` em memória; `:152-166` calcula receita em `mockLedger` em memória. Não há cliente Supabase, JWT, role PostgreSQL, fixture SQL ou asserção contra `pg_policies` nesses casos.
- **Fato técnico:** os testes comprovam apenas as funções puras/guardas JavaScript, não a avaliação de RLS no banco. Não se pode concluir “RLS funcionando” a partir deles.
- **Hipótese/impacto:** qualquer handler que aceite `storeId`/`entityId` e esqueça `assertStoreAccess` ou filtro tenant pode ler/mutar outro tenant porque o cliente do banco não será bloqueado por RLS. A auditoria não declarou um vazamento específico sem executar um request real.
- **Correção concreta:** separar caminhos: cliente request-scoped com JWT para operações de usuário, `service_role` somente em jobs/webhooks autenticados; para exceções, validar assinatura/identidade e tenant no próprio RPC. Criar testes de integração com dois tenants reais/fictícios em banco descartável, cobrindo SELECT/INSERT/UPDATE/DELETE via anon, authenticated e service role.

### DATA-07 — Contrato de método de pagamento diverge entre UI, BFF e enum SQL

- **Classificação:** fato confirmado; typecheck reproduz a incompatibilidade.
- **Risco:** **Médio/Alto — checkout não compila e métodos suportados em uma camada são rejeitados em outra.**
- **Evidência UI:** `src/routes/_store.marketplace.checkout.tsx:118` declara `paymentMethod` como `"pix" | "credit_card" | "cash_on_delivery"`; `:197` passa esse valor para `createMarketplaceOrderFn`.
- **Evidência BFF:** `src/services/marketplace-checkout.functions.ts:64-71` aceita somente `z.enum(["pix", "credit_card"])` e passa o valor em `:169-179` ao RPC.
- **Evidência SQL:** `supabase/migrations/0003_orders.sql:47-52` define `public.payment_method` como `pix`, `credit_card`, `manual`, `receipt`; `cash_on_delivery` não existe nesse enum.
- **Verificação:** `npm run typecheck -- --pretty false` reportou `src/routes/_store.marketplace.checkout.tsx(197,11): Type '"pix" | "credit_card" | "cash_on_delivery"' is not assignable to type '"pix" | "credit_card"'`.
- **Correção concreta:** definir uma matriz canônica de métodos. Se pagamento na entrega for suportado, adicionar um valor SQL compatível e suportar gateway/estado/RLS do método; se não for, remover a opção da UI. Não fazer cast para silenciar o typecheck.

## Itens revisados sem divergência comprovada

- `selected_options` usado pelo RPC de checkout não foi classificado como inexistente: `supabase/migrations/20260828030000_checkout_idempotent_v4.sql:4-5` adiciona a coluna em `order_items` antes do RPC final.
- `customer_snapshot` já é usado por migrations anteriores de checkout; não foi tratado como coluna nova ausente.
- `workspace_members.profile_id` é o pivot canônico em várias migrations e foi confirmado na definição base; o problema é a presença de migrations que usam nomes alternativos sem adição correspondente.
- `20261227000000_fix_security_definer_search_path.sql:6-20` usa um loop de catálogo para funções `SECURITY DEFINER`; a auditoria não confirmou uma assinatura inexistente nesse bloco. Isso não substitui uma execução real contra o catálogo do banco.

## Plano de correção priorizado

1. **P0 — congelar aplicação:** não aplicar migrations novas em produção enquanto as quatro colisões de versão e os erros de colunas/policies não forem reconciliados.
2. **P0 — banco descartável:** gerar uma cópia limpa, aplicar todas as migrations em ordem única e parar no primeiro erro; registrar o primeiro statement e o estado do ledger.
3. **P0 — normalizar tenancy:** decidir `profile_id` versus `user_id` e o contrato de `is_active`/roles; corrigir suporte, storage e booking com policies canônicas e `WITH CHECK` explícito.
4. **P1 — limpar policies:** consultar `pg_policies`, remover nomes legados reais e verificar que não sobra policy permissiva acidental para cada tabela sensível.
5. **P1 — fechar RPCs:** adicionar/remover `increment_cache_hit`, conferir grants e comparar automaticamente cada RPC chamado pelo TypeScript com uma assinatura SQL existente.
6. **P1 — checkout:** alinhar enum SQL, schema Zod e UI; executar teste de criação idempotente, falha de gateway, webhook assinado e isolamento por `store_id`.
7. **P1 — RLS de verdade:** implementar testes de integração PostgreSQL para dois tenants e roles anon/authenticated/service_role; manter os testes unitários atuais apenas como testes de guardas JS.

## Conclusão

A evidência estática não sustenta a afirmação de que o conjunto atual de migrations seja aplicável de forma determinística nem de que os testes existentes provem isolamento RLS no banco. Os bloqueadores mais objetivos são: versões duplicadas, `workspace_members.user_id`/`is_active` inexistentes, limpeza de policies com nomes divergentes e RPC ausente. O estado aplicado no Supabase permanece **não confirmado** sem acesso ao catálogo/ledger real; portanto, os riscos condicionais foram explicitamente separados dos fatos do repositório.
