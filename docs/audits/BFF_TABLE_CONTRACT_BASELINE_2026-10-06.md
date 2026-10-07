# Baseline de contratos BFF ↔ migrations

**Data:** 2026-10-06
**Comando:** `npm run check:bff-tables`
**Resultado:** bloqueado honestamente; não foi criada nenhuma tabela especulativa.

## Resumo

O scanner encontrou 439 migrations, 552 tabelas declaradas e 471 tabelas referenciadas diretamente pelos serviços BFF. **28 referências não possuem `CREATE TABLE` correspondente no snapshot local.** Isso não prova que estejam ausentes no banco remoto, porque as credenciais Supabase não estão disponíveis nesta sessão; prova apenas que o repositório não fornece evidência local suficiente para afirmar completude.

## Bloqueadores

| Tabela/recurso | Referência BFF | Tratamento |
|---|---|---|
| `activation_logs` | src/services/nexus-operations.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `ad_ledger` | src/services/ads.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `ads` | src/services/cart.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `badge_templates` | src/services/nexus-operations.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `channel_vault_credentials` | src/services/marketplace-hub.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `classified_ads` | src/services/growth-targets.functions.ts, src/services/classifieds.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `companies` | src/services/claim-intelligence.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `condicional_items` | src/services/condicionais.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `contract_addendums` | src/services/travel-contract.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `direct_conversations` | src/services/chat.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `direct_messages` | src/services/chat.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `eventos_campanhas` | src/services/marketing.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `eventos_tarefas_view` | src/services/events.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `immutable_ledger_entries` | src/services/chat-commerce.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `lead_capture_forms` | src/services/nexus-operations.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `post_media` | src/services/social.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `receipts` | src/services/payment.functions.ts, src/services/fiscal-nfe.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `store_condicionais` | src/services/condicionais.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `store_invites` | src/services/invite.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `store_members` | src/services/cash-safes.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `store_orders` | src/services/ai-conversations.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `store_stories` | src/services/stories.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `travel_bookings` | src/services/automation.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `trip_commissions` | src/services/commission.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `unified_listings_view` | src/services/unified-listing-workflow.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `user_daily_token_quotas` | src/services/token-quota.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `users` | src/services/onboarding.functions.ts, src/services/admin-team.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |
| `whatsapp_leads` | src/services/crm.functions.ts | Verificar no schema remoto ou adicionar migration real com colunas, RLS e testes; não criar placeholder. |

## Decisão

O gate permanece fora do `check:canonical` enquanto o snapshot remoto não for verificado, mas deve ser executado em CI e em qualquer release. A falha não será mascarada por allowlist ampla. As tabelas ausentes exigem inspeção do schema remoto, confirmação de ownership e migrations compatíveis antes de qualquer alteração de BFF.

## Limitações

`src/integrations/supabase/types.ts` atualmente define `Database = any`, portanto o TypeScript não consegue verificar colunas e relações. A geração de tipos deve ser feita a partir do projeto Supabase autorizado antes de afirmar alinhamento integral de colunas.
