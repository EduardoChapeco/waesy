# LEDGER_B2B_ROTARY_AND_OMNIMATCH_E2E_2026-11-17.md
# Livro Canônico de Evidências: B2B Comercial, Carteira Rotativa, Rotas GPS & OmniMatch Engine

## 1. Metadados do Preflight
- **Data (ISO):** 2026-11-17T16:04:00-03:00
- **Branch:** `release/prod-20261113-fullpage-chat-copilot`
- **Base Commit:** `c0e1d351`
- **Operador Responsável:** Conselho Executivo Soberano Waesy
- **Spec de Referência:** `docs/specs/SPEC-B2B-ROTARY-CRM-GPS-ROUTES-AND-OMNIMATCH-ENGINE.md`

## 2. Diagnóstico Factual Inicial dos 6 Domínios

| Domínio | Arquivo e Linha | Diagnóstico do Risco / Falha | Ação Corretiva Arquitetural |
| :--- | :--- | :--- | :--- |
| **1. Segurança de Tabelas de Preço** | `supabase/migrations/20260825220000_multi_price_tables_b2b_erp.sql:60-70` | **Vulnerabilidade RLS Crítica:** `price_tables_public_read` e `price_table_items_public_read` expõem preços de atacado B2B a consultas anônimas sem verificação de tenant ou vínculo de cliente se `active = true`. | Dropar políticas públicas genéricas e criar coluna `visibility_scope = 'b2b_restricted'`. Apenas staff ou clientes vinculados em `customer_price_table_assignments` podem consultar preços restritos. |
| **2. CRM & Carteira Rotativa** | `src/routes/workspace.crm.tsx:113` | Visão de CRM limitada a "clientes", "funil" e "personas", sem fila operacional diária orientada a ciclo de recompra e dias de visita. | Implementar aba "Dia a Dia" com separação por dias da semana (Seg a Sex), métricas de atraso e cálculo de risco de churn. |
| **3. Rotas & Telemetria de Campo** | `src/components/mobility/maplibre-canvas.tsx` | MapLibre implementado apenas no fluxo de motorista de mobilidade, ausente na gestão de rotas do representante B2B. | Criar tabelas `sales_routes`, `sales_route_stops` e `sales_visit_logs` com geofence Haversine e integrar visualizador de rota. |
| **4. Matriz de Catálogos e Carteira** | `src/services/crm.functions.ts` | Ausência de vínculo entre cliente, vendedor responsável, catálogo autorizado e tabela de preços. | Criar `seller_portfolio_assignments` e função soberana `resolveEffectiveCustomerOffer`. |
| **5. Automações de Pós-Venda** | `src/services/whatsapp-evolution-sync.server.ts` | Mensagens transacionais sem diferenciação por nicho (B2B vs Turismo vs Serviços) e sem supressão de grupos internos. | Integrar gatilhos pós-venda configuráveis no BFF respeitando `whatsapp-contact-suppression.server.ts`. |
| **6. OmniMatch / Match Time** | `src/services/match-time.functions.ts:159` e `src/routes/_store.match-time.tsx:42` | Desconto fixo hardcoded de 50% em código de teste e ausência de motor neural com cartas de trade-off e Studio no Workspace. | Criar `match_deck_templates`, `match_cards`, `match_visitor_brains` e Studio em `/workspace/match-time` + componente tátil no App. |

## 3. Log de Execução por Microfases

| Fase | Descrição | Status | Evidência de Fechamento |
| :--- | :--- | :--- | :--- |
| **Fase 1** | Migração SQL Segura (`20270609000000`) | Concluída | `check-schema-consolidation.mjs` OK (646 migrações, 0 duplicatas) |
| **Fase 2** | Serviços BFF Soberanos (`b2b-portfolio-routes` & `match-engine`) | Concluída | `check-bff-table-contracts.mjs` OK (705 tabelas referenciadas, 0 sem declaração) |
| **Fase 3** | UI Studio no Workspace e Integração App Próprio | Concluída | `/workspace/match-time` + `RotaryQueueView` e `FieldRoutesView` em `/workspace/crm` |
| **Fase 4** | Higienização Visual e Catraca Design Lint | Concluída | `node scripts/design-lint.mjs --ratchet` APROVADA (0 violações P0-P3 em 2387 arquivos) |
| **Fase 5** | Testes Automatizados E2E Vitest | Concluída | 14/14 testes aprovados em 2 suítes Vitest (100% de sucesso) |
