# Fechamento de contratos BFF ↔ banco — Onda 2

**Data:** 2026-10-06
**Escopo:** referências detectadas pelo gate `check:bff-tables`
**Regra:** nenhuma tabela, coluna, view ou migration foi inventada sem evidência no código ou em DDL existente.

## Resultado executivo

- Typecheck: **verde — exit code 0**.
- O gate foi corrigido para distinguir:
  - tabelas/views declaradas em migrations;
  - buckets Supabase Storage (`storage.from(...)`);
  - relações internas de `auth` (`schema("auth").from("users")`).
- O baseline caiu de **28 alertas para 11 relações públicas realmente não fechadas**.
- Foram removidas/substituídas 8 referências obsoletas ou falsas:
  - `ads` no cross-sell do carrinho;
  - `channel_vault_credentials`;
  - `direct_conversations`;
  - `direct_messages`;
  - `immutable_ledger_entries`;
  - `post_media`;
  - `store_orders`;
  - `store_stories`.
- Foram criadas migrations reais para:
  - `user_daily_token_quotas`;
  - `whatsapp_leads`.
- Não foi criada migration especulativa para os 11 itens residuais. Eles permanecem bloqueados até introspecção autorizada ou definição de produto/DDL compatível.

## Correções implementadas

| Contrato | Ação | Evidência/canônico |
|---|---|---|
| `ads` | Removido fallback de classificados do cross-sell | `products` + `product_variants`; `classifieds.id` não é `product_variants.id` |
| `channel_vault_credentials` | Removida leitura; uso de `marketplace_connectors.access_token` | migration do Marketplace Hub |
| `direct_conversations` | Removido DELETE legado | `chat_threads` é o modelo atual |
| `direct_messages` | Removido DELETE legado | `chat_messages` é o modelo atual |
| `immutable_ledger_entries` | Substituído por `financial_immutable_ledger`; lookup e gravação agora falham fechado | `20260919_financial_immutable_ledger.sql` |
| `post_media` | Substituído por `posts.media_urls` | `20260811200000_social_feed_unified.sql` |
| `store_orders` | Substituído por `orders.total_cents`, com `assertStoreAccess` por loja | `0003_orders.sql` e BFF de pedidos |
| `store_stories` | Substituído por `stories`; `title` passa a ser `null` porque não existe no schema canônico | `0015_stories_bio.sql` e migrations de stories |
| `receipts` | Classificado como bucket Storage; checker não o trata mais como tabela SQL | migrations `0044_*`, `20261231*` |
| `users` | Classificado como `auth.users`; checker ignora `schema("auth")` | Supabase Auth + `profiles` |
| `user_daily_token_quotas` | Migration real com unique `(user_id, quota_date)`, índices, constraints e RLS próprio | `20270109000000_close_bff_quota_and_whatsapp_lead_contracts.sql` |
| `whatsapp_leads` | Migration real com tenant, status, índices, assigned user e RLS | mesmo arquivo da migration acima |

## Relações ainda bloqueadas

Estas referências continuam fazendo o gate falhar de propósito. **Isso é intencional:** o sistema não mascara pendências com allowlist ou tabelas vazias.

| Relação | Serviço | Motivo do bloqueio | Próximo passo obrigatório |
|---|---|---|---|
| `activation_logs` | `nexus-operations.functions.ts` | Só há INSERT; nenhum DDL local; handler não tem escopo de tenant comprovado | introspecionar remoto; depois definir `store_id`/RLS ou remover endpoint |
| `ad_ledger` | `ads.functions.ts` | Ledger de anúncios ativo, mas nenhum DDL local e não há equivalência provada com `financial_ledger`/`invoice_ledger` | definir DDL contábil, ownership e idempotência antes da migration |
| `badge_templates` | `nexus-operations.functions.ts` | Exportações órfãs e `empresa_id` legado não resolvido na identidade canônica | remover/deprecate ou especificar recurso por `store_id` |
| `condicional_items` | `condicionais.functions.ts` | Contrato pai/filho ativo, sem DDL local, com risco de update por ID sem tenant | modelar `store_condicionais` + items, FKs, RLS e testes cross-tenant |
| `contract_addendums` | `travel-contract.functions.ts` | Existe DDL apenas em `reference-migrations`, incompatível com `contracts` canônico atual | revisar DDL, `contract_audit_chain`, ownership e assinatura antes de promover |
| `eventos_campanhas` | `marketing.functions.ts` | CRUD ativo, sem DDL; candidatos `ad_campaigns`/`match_time_campaigns` não são equivalentes | decidir domínio canônico e migrar o BFF com schema real |
| `lead_capture_forms` | `nexus-operations.functions.ts` | Só há delete legado com `empresa_id`; canônico é `lead_forms.store_id` | remover endpoint órfão ou mapear formalmente para `lead_forms` |
| `store_condicionais` | `condicionais.functions.ts` | Pai do contrato de condicionais sem DDL | mesma decisão de `condicional_items`; não criar placeholder |
| `store_invites` | `invite.functions.ts` | Só há revoke por token; não há tenant/role no filtro; `service_role` bypassa RLS | definir convite de loja/equipe com token único, membership e RLS |
| `travel_bookings` | `automation.functions.ts` | Só há SELECT `*`; colunas completas não são conhecidas | obter schema/consumidores ou substituir por `booking_*` canônico |
| `trip_commissions` | `commission.functions.ts` | Payload é `record(z.any())`, portanto não há colunas confiáveis para migration | definir DTO/SSOT de comissão e DDL antes de criar tabela |

## Segurança aplicada nesta onda

1. A consulta de credenciais do Mercado Livre agora exige `assertStoreAccess` com `targetStoreId`.
2. O fluxo de pagamento de agendamento obtém o `store_id` do agendamento antes de consultar idempotência.
3. Falhas de lookup/gravação do ledger não retornam mais sucesso falso; o pagamento falha fechado.
4. Ações de chat não tentam apagar tabelas legadas desconhecidas.
5. A migration de `whatsapp_leads` usa `store_id`, `auth_user_store_ids()` e policies de SELECT/INSERT/UPDATE.
6. A migration de quota restringe cada registro ao próprio `auth.uid()`.

## Gates executados

```text
npm run typecheck                 PASS
node --check scripts/check-bff-table-contracts.mjs  PASS
 git diff --check                 PASS
```

O gate BFF↔banco permanece vermelho enquanto as 11 relações acima não tiverem schema remoto ou decisão de remoção/substituição. Isso evita afirmar completude que não foi comprovada.
