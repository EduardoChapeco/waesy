# Auditoria de Producao 2026-10-22 (Supabase + Cloudflare Pages + Repo)

Escopo: leitura em producao (projeto Supabase `jfuebqmltksyznovhlwa`, Pages `usewaesy`, repo `EduardoChapeco/waesy`).
Metodo: SQL somente leitura via conexao direta, API Cloudflare Pages (build logs), dry-run de migrations em transacao com ROLLBACK, cruzamento codigo x schema.
Dados brutos: `docs/handoff/data/`. Scripts reproduziveis: `audit.cjs`, `dryrun.cjs`.

## 0. Limites da auditoria

| Fonte | Estado | Consequencia |
|---|---|---|
| Supabase Management API / logs de Edge, Auth, API, Postgres | `SUPABASE_ACCESS_TOKEN` (`.env.local` e `.env.secrets`) invalido, HTTP 401 | Logs do Logs Explorer NAO lidos. Substituto: tabelas `system_error_logs`, `cron.job_run_details`, `net._http_response`, `pg_stat_statements`. Gerar novo token (sbp_...) e reexecutar. |
| Cloudflare runtime (Workers logs) | Sem tail ativo | Lidos apenas logs de build e historico de deployments. Runtime coberto por `system_error_logs`. |
| Supabase Edge Functions | Nenhuma em `supabase/functions` alem de `infotravel-connector` e `_shared` | Server functions rodam no worker do Pages (TanStack), nao no Supabase. |

## 1. Severidade P0

| ID | Achado | Evidencia | Correcao |
|---|---|---|---|
| P0-01 | Build do Pages quebrado em todas as branches preview desde 2026-10-22 | Deploys `6e44333b`, `2d0db20d`, `238d634e`, `7bc55e28`, `f501510e`, `63941b48` com `build/failure`: `Unexpected token` em `src/components/tourism/contract/new-travel-contract-sheet.tsx:499` (residuo de merge, linhas 497-501 duplicadas). Producao (`222e6c4c`, main, 2026-10-21) continua no ar. | CORRIGIDO neste commit (removido bloco duplicado). Validar com build local e deploy. |
| P0-02 | Funcoes SECURITY DEFINER financeiras executaveis por `anon` | 23 funcoes: `wz_grant_tokens_atomic`, `wz_reserve_tokens_atomic`, `wz_commit_reserved_tokens_atomic`, `wz_release_reserved_tokens_atomic`, `wz_claim_gift_card_atomic`, `wz_get_or_create_bucket`, `wz_migrate_legacy_credits_and_tokens`, `adjust_service_pass_credits`, `mark_appointment_no_show`, `expire_outdated_service_passes`, `get_or_create_wallet_account`, `calculate_wallet_balance_cents`, `decrement_ticket_sold`, `release_resource_slot`, `claim_healthy_api_keys_for_provider`, `save_user_address_atomic`, `delete_user_address_atomic`, outras | Migration `20270302000000_security_hardening_anon_exec_and_search_path.sql` (REVOKE de PUBLIC/anon). PENDENTE: auditar se `authenticated` ainda pode chamar `wz_grant_tokens_atomic` e `wz_claim_gift_card_atomic` sem checagem interna de autoria. |
| P0-03 | 14 funcoes SECURITY DEFINER sem `search_path` fixo | `release_resource_slot`, `approve_installment_conciliation`, `process_checkout_transaction_v2`, `sync_store_to_directory`, `wz_*`, `adjust_service_pass_credits`, `mark_appointment_no_show`, `expire_outdated_service_passes` | Mesma migration `20270302000000` (ALTER FUNCTION ... SET search_path). |
| P0-04 | Segredo hardcoded em funcao do banco | `public.dispatch_mining_cron(text)` (SECURITY DEFINER) contem bearer de cron em texto claro e URL fixa; excecao do `net.http_post` e engolida (`EXCEPTION WHEN OTHERS THEN v_request_id := NULL`) | PENDENTE: mover token para `supabase_vault`, rotacionar, validar no endpoint `/api/cron/mining-worker`, registrar falha em vez de engolir. A origem esta em migration anterior (buscar `dispatch_mining_cron` em `supabase/migrations`). |
| P0-05 | Historico de migrations divergente do schema real | `20270130000000_fix_directory_sync_remove_mocks.sql` consta como aplicada, mas faltam em producao: `travel_quote_requests`, `crm_leads`, `store_ad_campaigns`, `travel_sales_spreadsheet_rows`, `crm_universal_spreadsheet_import_batches`, RPC `save_builder_nodes_atomic`. Dry-run da migration passou (idempotente). | Reaplicar o arquivo (runbook, passo 3). |

## 2. Severidade P1

### 2.1 Migrations locais nao aplicadas (dry-run em producao com ROLLBACK)

Remoto: 620 versoes totais; 11 locais sem registro remoto; 80 versoes so no remoto (aplicadas por MCP/dashboard sem arquivo local, ver `data/pending.txt`).

| Migration | Dry-run inicial | Causa | Correcao aplicada no arquivo |
|---|---|---|---|
| `20261002000000_events_external_ticket_and_creator_analytics` | FALHA | `policy creator_showcase_self_manage already exists` | `DROP POLICY IF EXISTS` antes de cada `CREATE POLICY` |
| `20261022000003_travel_commercial_intelligence_backlog` | FALHA | FK para `public.customers` (nao existe) | FK trocada para `public.customers_crm(id)` |
| `20270125000002_ai_operating_system_isolation` | FALHA | `ai_skills` ja existe com schema legado (`is_active`, `is_system`), sem `is_enabled` | `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` aditivo (8 colunas). Coexistem `is_active` e `is_enabled`: decisao de consolidacao pendente (DEC). |
| `20270225000000_global_iata_airports_unification` | FALHA | `airports_global`/`ck_airports` sem `updated_at` | `ADD COLUMN IF NOT EXISTS updated_at`. Producao tem 93 aeroportos; a migration carrega ~7314. |
| `20270226120000_airport_cms_and_intelligence` | FALHA | `profiles.is_admin` nao existe | Politica usa `profiles.role = 'admin' OR public.is_platform_admin()` |
| `20270227000000_travel_tourism_ecosystem_completion` | FALHA | `travel_quote_requests` ausente (ver P0-05) | Criacao idempotente da tabela, RLS e politica de membros antes da politica publica |
| Demais 8 (`20261002000001..3`, `20261002_quick`, `20261022000002`, `20270223000000`, `20270226000001`, `20270228000000`, `20270301000000`) | OK | n/a | nenhuma |
| `20270302000000_security_hardening_anon_exec_and_search_path` (NOVA) | OK | P0-02, P0-03 | n/a |

Resultado final: 15 arquivos pendentes + `20270130000000` reaplicavel, todos OK no dry-run cumulativo.

### 2.2 Tabelas e RPCs referenciadas no codigo e inexistentes em producao

Cobertas pelas migrations pendentes (apos aplicar): `ai_artifacts`, `ai_artifact_versions`, `ai_connectors`, `ai_threads`, `ai_messages`, `ai_tasks`, `ai_scheduled_tasks`, `carona_preferences`, `carona_passenger_reviews`, `carona_recurring_schedules`, `carona_stop_points`, `intercity_bus_routes`, `corporate_contracts`, `corporate_credit_lines`, `corporate_travel_budgets`, `corporate_travel_advances`, `corporate_travel_expenses`, `corporate_travelers`, `airport_cms_profiles`, `event_ticket_affiliates`, `classified_vehicle_fipe_cache`, `service_package_commissions`, `service_package_recurrences`, `travel_rooming_allocations`, `travel_operator_commissions`, `travel_flight_reaccommodations`, `travel_commercial_contacts`, `travel_interests`, `travel_opportunity_matches`, `travel_contract_templates`; RPCs `set_default_user_address_atomic`, `update_address_instructions_atomic`; e via `20270130000000`: `crm_leads`, `travel_quote_requests`, `store_ad_campaigns`, `travel_sales_spreadsheet_rows`, `crm_universal_spreadsheet_import_batches`, `save_builder_nodes_atomic`.

SEM migration em lugar nenhum (exigem decisao: criar tabela ou remover referencia):

| Objeto | Arquivo(s) de codigo | Observacao |
|---|---|---|
| `payment_methods` | `src/services/module-auditor.ts` | auditor |
| `master_products`, `deliveries`, `service_schedules`, `tourism_proposals`, `commercial_proposals`, `digital_contracts`, `fiscal_invoices`, `store_marketplace_integrations` | `src/services/mcp-tool-registry.ts` | registro de ferramentas aponta para tabelas fantasma; candidatas a nomes canonicos existentes |
| `users` | `admin-team.functions.ts`, `onboarding.functions.ts` | provavelmente deveria ser `profiles` ou `auth.users` via admin API |
| `receipts` | `fiscal-nfe.functions.ts`, `payment.functions.ts` | fluxo fiscal |
| `google_business_connections` | `onboarding-pipeline.server.ts` | onboarding Google |
| `travel_quote_requests` (coluna de uso) | `builder.functions.ts`, `tourism.functions.ts` | resolvido por 20270227/20270130 |
| RPC `increment_airport_view_count` | `tourism-airports.functions.ts` | sem migration |

### 2.3 Erros de runtime (tabela `system_error_logs`, 84 linhas, 2026-09-17 a 2026-10-22)

| Rota | Mensagem | Ocorrencias | Ultima | Tabela |
|---|---|---|---|---|
| `catalog.getStoreCatalog` | "Nao foi possivel carregar os produtos." (`listPublishedProducts`, `src/services/catalog.functions.ts:280`) | 81 | 2026-10-22 17:24 UTC | `public.products` |
| `catalog.getStoreCatalog` | "Nenhuma loja foi configurada..." | 3 | 2026-09-21 | n/a |

Volume por dia: 10-22: 20, 10-21: 4, 10-20: 10, 10-19: 3, 10-16: 8. Colunas e RLS da query foram verificadas e existem (`products`, `product_variants`, `product_media`). Causa raiz NAO confirmada. Hipoteses: join `product_variants!inner` com filtro `.eq("product_variants.status","active")` combinado com `categories` inner, ou erro transitorio do cliente anon. A tabela tem 1 produto publicado. Acao: logar `error.code`/`error.details` em `system_error_logs.payload` (hoje `payload` e nulo) e reproduzir com o client anon.

### 2.4 pg_cron / pg_net

| Item | Valor |
|---|---|
| Jobs ativos | 5 (`mining_market_data_daily`, `mining_rss_fetcher_30m`, `mining_continuous_crawler_15m`, `mining_datajud_sync_6h`, `mining_cnpj_enrichment_daily`) |
| Status `cron.job_run_details` (3 dias) | todos `succeeded` (sucesso do despacho, nao do trabalho) |
| `net._http_response` com erro | 27 timeouts de 25000 ms, ultimo 2026-10-23 00:30 UTC; o worker `/api/cron/mining-worker` nao responde em 25 s |
| Acao | Tornar o endpoint assincrono (aceitar e enfileirar, responder 202), registrar HTTP status em `scraper_audit_log` |

### 2.5 RLS e permissoes

| Item | Valor |
|---|---|
| Tabelas public | 717 (nenhuma sem RLS) |
| RLS ativo sem nenhuma politica (deny-all para clientes) | 29: `ai_job_charges`, `studio_template_library`, `unsplash_studio_selections`, `travel_voucher_apply_operations`, `activation_logs`, `ads`, `badge_templates`, `channel_vault_credentials`, `contract_addendums`, `direct_conversations`, `direct_messages`, `eventos_campanhas`, `immutable_ledger_entries`, `lead_capture_forms`, `store_invites`, `post_media`, `store_orders`, `store_stories`, `travel_bookings`, `trip_commissions`, `travel_sale_financial_sheets`, `travel_sale_non_commissionable_fees`, `travel_sale_over_deductions`, `travel_sale_internal_costs`, `travel_sale_supplier_items`, `travel_financial_audit_logs`, `classified_analytics_events`, `classified_metrics_daily`, `gift_card_events`. Se o front le essas tabelas com client de usuario, falha silenciosa (ex.: `direct_messages`, `store_orders`, `travel_bookings`). Se so service_role acessa, ok. Verificar caso a caso. |
| Grants | `anon` e `authenticated` possuem INSERT/UPDATE/DELETE/TRUNCATE em tabelas public (ex.: `product_variants`). Protecao depende 100% de RLS. Recomendado: `REVOKE TRUNCATE, REFERENCES, TRIGGER` de `anon`/`authenticated`. |
| Politicas permissivas | `product_variants_select_public` USING (true) coexiste com `variants_public_read` (filtrada): a permissiva anula a filtrada. `travel_quote_requests` INSERT anon com `WITH CHECK (true)` sem limite de taxa. |

### 2.6 Qualidade do banco

| Item | Valor |
|---|---|
| Tamanho | 100 MB |
| Indices invalidos | 0 |
| Tabelas sem PK | 0 |
| FKs sem indice de suporte | 608 (a revisar, priorizar tabelas quentes) |
| Dead tuples | `crawl_queue` 404, `news_articles` 90 (normal) |
| Query lenta | `DELETE FROM stores WHERE id = $1`: 13 chamadas, media 1913 ms (cascata sem indices nas FKs) |
| Extensoes | `pg_cron`, `pg_net`, `pg_stat_statements`, `vector`, `supabase_vault` ativas |

### 2.7 Encoding

Migrations `20270130000000`, `20270227000000` e `20270225000000` contem bytes Windows-1252 interpretados como UTF-8 (mojibake em comentarios e em nomes de politica: `cotaï¿½ao`). Politica criada com nome corrompido em `20270227000000` (bloco 6). Normalizar para UTF-8 sem BOM.

## 3. Repositorio

| Item | Estado |
|---|---|
| Branch de trabalho | `feat/ecosystem-tourism-address-completion-20261021-1812`, contem todos os commits das demais branches |
| Remoto, branches alem de `main` | `docs/master-systemic-plan-2026` (+17), `feat/ecosystem-tourism-address-completion-20261021-1812` (+16), `prod/unified-production-release` (+8), `release/production-20261021-migrations-and-travel-os` (+8). Todas ancestrais de HEAD, sem conflito com `main`. |
| PR aberto | #39 (`feat/ecosystem-tourism-address-completion-20261021-1812` -> `main`) |
| `gh` CLI | nao instalado; API REST via token do Git Credential Manager funciona |
| Producao Pages | ultimo deploy production `222e6c4c` (main, 2026-10-21 21:23 UTC, success) |

## 4. Itens nao verificados

| Item | Motivo |
|---|---|
| Logs de Auth, API Gateway, Postgres, Realtime, Edge no Supabase | Token de gestao invalido |
| Logs de runtime dos Workers do Pages em tempo real | Nao ha tail |
| Validade de colunas (apenas tabelas e RPCs foram cruzadas com o codigo) | Escopo desta passagem; reexecutar com extracao de `.select()` |
| Typecheck e testes completos | Ver secao de gates em `20_RUNBOOK_EXECUCAO.md` |
