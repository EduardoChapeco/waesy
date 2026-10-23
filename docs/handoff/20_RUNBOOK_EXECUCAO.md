# Runbook de Execucao em Outra Maquina

Pre-requisitos: Node 22, `npm ci`, acesso ao repo `EduardoChapeco/waesy`, ao projeto Supabase `jfuebqmltksyznovhlwa` e ao Cloudflare Pages `usewaesy`.

## 0. Credenciais (nao versionadas)

| Item | Onde | Estado em 2026-10-22 |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | `.env.secrets` | INVALIDO (401). Gerar novo em supabase.com/dashboard/account/tokens. |
| `SUPABASE_DB_PASSWORD` | `.env.secrets` | Valido (conexao direta `db.<ref>.supabase.co:5432` funcionou). |
| Cloudflare | `npx wrangler login` | Valido (escopo `pages (write)`). |
| GitHub | Git Credential Manager | Valido para push e API REST. |

## 1. Leitura obrigatoria (ordem)

1. `AGENTS.md`
2. `docs/handoff/10_AUDITORIA_PRODUCAO_2026-10-22.md` (estado real e defeitos)
3. `docs/handoff/00_INDEX.md` (planos e specs, com precedencia)
4. `docs/handoff/01_planos_mestres_recentes/PLANO_MESTRE_GLOBAL_PENDENCIAS_REFATORACOES_E_PROXIMAS_ONDAS_2026.md`

## 2. Gates locais

| Gate | Comando |
|---|---|
| Typecheck | `npm run typecheck` |
| Testes | `npm test` |
| Design lint | `npm run lint:design` |
| Build | `npm run build` |

## 3. Banco (Supabase)

O historico remoto diverge do local (80 versoes so no remoto, 11 so no local). Nao usar `supabase db push` sem reparar. Metodo validado: dry-run em transacao com ROLLBACK (`docs/handoff/data/dryrun.cjs`), depois aplicacao real em transacao e registro em `supabase_migrations.schema_migrations`.

Ordem de aplicacao (todas validadas em dry-run cumulativo em 2026-10-22):

| # | Versao | Arquivo |
|---|---|---|
| 1 | 20270130000000 | `20270130000000_fix_directory_sync_remove_mocks.sql` (ja registrada, objetos ausentes; reaplicar) |
| 2 | 20261002000000 | `20261002000000_events_external_ticket_and_creator_analytics.sql` |
| 3 | 20261002000001 | `20261002000001_f04_classifieds_promotion_columns.sql` |
| 4 | 20261002000002 | `20261002000002_s21_performatic_rls.sql` |
| 5 | 20261002000003 | `20261002000003_s20_scale_indexes.sql` |
| 6 | 20261002 | `20261002_quick.sql` |
| 7 | 20261022000002 | `20261022000002_classified_commercial_performance_and_telemetry.sql` |
| 8 | 20261022000003 | `20261022000003_travel_commercial_intelligence_backlog.sql` |
| 9 | 20270125000002 | `20270125000002_ai_operating_system_isolation.sql` |
| 10 | 20270223000000 | `20270223000000_advanced_address_platform_mercadolivre_parity.sql` |
| 11 | 20270225000000 | `20270225000000_global_iata_airports_unification.sql` |
| 12 | 20270226000001 | `20270226000001_canonical_twenty_tables_ecosystem_unification.sql` |
| 13 | 20270226120000 | `20270226120000_airport_cms_and_intelligence.sql` |
| 14 | 20270227000000 | `20270227000000_travel_tourism_ecosystem_completion.sql` |
| 15 | 20270228000000 | `20270228000000_canonical_corporate_travelers_and_trips.sql` |
| 16 | 20270301000000 | `20270301000000_travel_contract_templates.sql` |
| 17 | 20270302000000 | `20270302000000_security_hardening_anon_exec_and_search_path.sql` |

Verificacao pos-aplicacao: reexecutar `node docs/handoff/data/audit.cjs out.json` (com `NODE_PATH=node_modules`); esperado: `missingTables` reduzido ao bloco "sem migration" da secao 2.2 da auditoria, `anonExecSecDef` e `secDefNoSearchPath` vazios.

## 4. Cloudflare Pages

Projeto `usewaesy`. Producao = branch `main`. Variaveis e segredos so no painel do Pages (ver `docs/audits/CLOUDFLARE_PAGES_RELEASE.md`). Apos merge em `main`, confirmar `deploy/success` com `npx wrangler pages deployment list --project-name usewaesy`; em falha, ler o log via API `/accounts/<id>/pages/projects/usewaesy/deployments/<id>/history/logs`.

## 5. GitHub

Fechar PR #39 por merge. Apagar branches remotas `docs/master-systemic-plan-2026`, `prod/unified-production-release`, `release/production-20261021-migrations-and-travel-os`, `feat/ecosystem-tourism-address-completion-20261021-1812` apos o merge. Apagar a branch local `fix/niche-isolation-squircle-anti-truncate-20261017` (ja em `main`).

## 6. Backlog pos-deploy (ordem)

| Prioridade | Item | Referencia |
|---|---|---|
| P0 | Mover segredo de `dispatch_mining_cron` para Vault e rotacionar | Auditoria P0-04 |
| P0 | Revisar autorizacao interna de `wz_grant_tokens_atomic` e `wz_claim_gift_card_atomic` para `authenticated` | Auditoria P0-02 |
| P1 | Causa raiz de `catalog.getStoreCatalog` (81 erros) | Auditoria 2.3 |
| P1 | Endpoint `/api/cron/mining-worker` assincrono (27 timeouts) | Auditoria 2.4 |
| P1 | Tabelas fantasma do `mcp-tool-registry` e demais objetos sem migration | Auditoria 2.2 |
| P1 | 29 tabelas com RLS e sem politica | Auditoria 2.5 |
| P2 | Revogar TRUNCATE/REFERENCES/TRIGGER de anon/authenticated | Auditoria 2.5 |
| P2 | 608 FKs sem indice; `DELETE FROM stores` lento | Auditoria 2.6 |
| P2 | Normalizar encoding das migrations | Auditoria 2.7 |
| P2 | Carga IATA completa (93 de ~7314 aeroportos em producao antes da migration 11) | Auditoria 2.1 |
