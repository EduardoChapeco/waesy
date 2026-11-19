# SPEC-20261117-TOURISM-COMMISSIONS-OFFPAYROLL-RBAC-GOALS

**Status:** Approved for End-to-End Implementation  
**Data:** 2026-11-17  
**Escopo Exclusivo:** Repositório Waesy (`tourism`, `financeiro`, `rh`, `relatorios/metas`, `rbac`)  
**Regras Aplicáveis:** `AGENTS.md` (B.1–B.36), `docs/design/DESIGN.md`, `docs/design/DESIGN-LINT.md`, `skills/waesy-integrity-auditor/SKILL.md`

---

## 1. Requisitos em Sintaxe EARS

### 1.1 Motor Único de Comissões de Turismo (100% Server-Side)
- **EARS-01 [Ubíquo]:** O motor financeiro de vendas turísticas DEVE unificar em `src/lib/travel/commission-engine.ts` e `src/lib/travel/sale-financial-calculator.ts` o cálculo determinístico de: Venda Bruta (GMV), Taxas Não Comissionáveis, Base Comissionável Líquida, Comissão Base da Agência, Over Bruto, Retenção de Over (`0%` em PIX/Dinheiro no balcão; `%` da operadora quando financiado), Over Líquido, Receita da Agência (`Comissão Base + Over Líquido`), Premiação Variável do Consultor e Resultado Líquido Real.
- **EARS-02 [Orientado a Evento]:** Quando uma ficha financeira for criada, atualizada ou recalculada via BFF (`upsertTravelSaleFinancialSheet`, `syncProposalOrContractToFinancialSheet`), o servidor DEVE agregar automaticamente o faturamento acumulado confirmado do consultor na competência mensal (`YYYY-MM`) diretamente no banco de dados e resolver a faixa salarial/comercial ativa sem confiar em valores totais ou faixas enviados pelo cliente.
- **EARS-03 [Orientado a Evento]:** Quando uma venda for confirmada a partir de proposta (`UnifiedProposalWorkspace`, conversão de proposta em viagem ou assinatura de contrato `signContractAsPayer`), o sistema DEVE sincronizar idempotentemente o registro único em `travel_sale_financial_sheets` vinculado a `seller_profile_id`, `proposal_id`, `trip_id` e `operator_supplier_id`.
- **EARS-04 [Indesejado]:** Enquanto a loja pertencer ao nicho `tourism`, o sistema NÃO DEVE aplicar `commission_percent = 60` como padrão na inclusão de equipe (`admin-team.functions.ts`), nem calcular prévia de comissão do agente multiplicando `grandTotalCents` pelo primeiro agente (`agents[0]`) na proposta.

### 1.2 Pagamento "Por Fora" (Off-Payroll / Premiação Variável + Recibo Automático)
- **EARS-05 [Invariante]:** Enquanto uma comissão ou premiação de agente de viagens for configurada como pagamento externo (`off_payroll_award`), o fechamento de folha CLT em `src/services/hr.functions.ts` (`closePayrollAndPostToPayables`) NÃO DEVE inserir esses valores em `employee_payslips`, nem somá-los em `folha_pagamento` ou encargos trabalhistas da folha oficial.
- **EARS-06 [Orientado a Evento]:** Quando o Gestor ou Financeiro aprovar o pagamento das comissões elegíveis de um agente em `travel-commission-payouts.functions.ts`, o servidor DEVE:
  1. Criar registro imutável em `travel_commission_payout_receipts` (`include_in_payroll = FALSE`, `payout_nature = 'premiacao_variavel_por_fora'`, código sequencial `REC-PREM-YYYYMM-XXXX`, hash SHA-256 e snapshot itemizado das reservas);
  2. Vincular e atualizar as fichas incluídas para status `paid` (`agent_payout_receipt_id`);
  3. Registrar a obrigação/desembolso em `financial_obligations` (SQL normalizada) e em `financial_transactions` sob categoria distinta (`premiacao_variavel_comercial`) + `financial_immutable_ledger`;
  4. Disponibilizar o **Recibo Automático** para impressão/PDF pelo gestor e aceite digital (`Confirmar Recebimento / Ciente`) pelo agente favorecido.

### 1.3 Cobrança e Conciliação com Operadoras
- **EARS-07 [Orientado a Evento]:** Quando houver comissões a receber de operadoras (`requires_operator_invoice = true` / `operator_balance_cents > 0`), o sistema DEVE permitir consolidar reservas por operadora e competência em `travel_operator_billing_batches` (Borderô/Fatura de Cobrança + status de NFS-e sobre `Receita da Agência` em `travel_tax_shield_ledger`), além de persistir baixas reais (`reconcileOperatorReceivableFn` / `settleOperatorBillingBatchFn`) em banco e `financial_transactions`.
- **EARS-08 [Orientado a Estado]:** Quando uma venda for liquidada diretamente no balcão (`comissao_balcao_a_vista`), o servidor DEVE zerar o saldo a receber da operadora, marcar `is_cash_settled = true`, dispensar NFS-e contra operadora quando aplicável e opcionalmente gerar título em `financial_obligations` pelo saldo Net devido à operadora.

### 1.4 Integração Minhas Vendas, Vendas da Agência e Perfil do Funcionário
- **EARS-09 [Orientado a Papel]:** Na rota `/workspace/turismo/minhas-vendas`, um agente (`seller`) DEVE visualizar exclusivamente suas próprias vendas, evolução mês a mês (`MoM %`), termômetro até a próxima faixa, status das premiações por fora (`Provisionada`, `Liberada`, `Paga`) e seus recibos automáticos com aceite digital; usuários `owner`, `admin`, `manager` e `finance` DEVEM visualizar o Painel Geral da Agência com agregação loja inteira e filtro agente por agente.
- **EARS-10 [Ubíquo]:** O Perfil/Prontuário do Colaborador (`EmployeeDossierModal` em `/workspace/financeiro/funcionarios` e `/workspace/rh/folha`, além do drawer de perfil comercial em `/workspace/configuracoes/equipe`) DEVE exibir aba conectada em tempo real com vendas do mês, crescimento, histórico de faixas e recibos de premiação por fora pagos ao colaborador.

### 1.5 Blindagem RBAC Completa (UI + Sidebar + Shell + BFF + RLS)
- **EARS-11 [Indesejado]:** Usuários com papel `seller`, `support`, `operations` ou `cashier` NÃO PODEM: (a) editar metas, faixas de comissão, taxas de operadoras ou políticas de cancelamento; (b) acessar `/workspace/turismo/comissoes`, `/workspace/rh/compliance`, `/workspace/configuracoes/sessoes`, `/workspace/viabilidade` ou `/workspace/squads`; (c) alterar/excluir fornecedores em `travel-suppliers.functions.ts`; (d) alterar dados financeiros em `saveTripFinancialDetails` ou `upsertTravelSaleFinancialSheet`; (e) consultar ponto eletrônico de terceiros em `listEmployeeTimeEntries`.
- **EARS-12 [Orientado a Estado]:** A matriz `workspace_role_permissions` (`RolePermissionsMatrix.tsx`) DEVE adaptar nomenclatura ao nicho ativo e atuar como barreira efetiva compartilhada com os BFFs.

### 1.6 Módulo de Metas com Estatística Real e IA (`/workspace/relatorios/metas`)
- **EARS-13 [Orientado a Estado]:** Quando o workspace ativo for `tourism`, `getRevenueGoalsAndForecast` (`src/services/revenue-goals.functions.ts`) DEVE calcular metas realizadas e projeções a partir de `travel_sale_financial_sheets`, `travel_proposals` e `leads_crm` (separando GMV Bruto, Receita Líquida da Agência e Resultado Pós-Variável), persistindo histórico mensal em `agency_goal_targets`.
- **EARS-14 [Ubíquo]:** O motor estatístico (`src/lib/goals/statistical-forecast.ts`) DEVE calcular sazonalidade mensal (`S_m`), peso de dias úteis (`w_d`), velocidade recente `EWMA`, pipeline ponderado por taxa histórica de conversão e tempo restante de fechamento, e intervalos probabilísticos `P10 / P50 / P90` no servidor, alimentando recomendações explicáveis opcionais via `executeAiCoreGateway` (`ai-core-gateway.functions.ts`).
- **EARS-15 [Orientado a Papel]:** Agentes (`seller`) DEVEM visualizar em `/workspace/relatorios/metas` exclusivamente sua própria meta, ritmo estatístico e recomendações em modo **somente leitura**, com edição restrita a `owner`, `admin` e `manager`.

---

## 2. Escopo de Arquivos Autorizados

- `supabase/migrations/20270607000000_tourism_commissions_offpayroll_rbac_goals_ssot.sql` (novo)
- `src/lib/travel/sale-financial-calculator.ts`
- `src/lib/travel/commission-engine.ts` (novo)
- `src/lib/goals/statistical-forecast.ts` (novo)
- `src/lib/rbac-permissions.ts` (novo)
- `src/lib/workspace-navigation.ts`
- `src/components/workspace/workspace-shell.tsx`
- `src/components/workspace/RolePermissionsMatrix.tsx`
- `src/services/travel-financials.functions.ts`
- `src/services/travel-pre-boarding-and-commissions.functions.ts`
- `src/services/travel-commissions-unified.functions.ts` (novo)
- `src/services/travel-commission-payouts.functions.ts` (novo)
- `src/services/travel-operator-billing.functions.ts` (novo)
- `src/services/travel-suppliers.functions.ts`
- `src/services/travel-lifecycle.functions.ts`
- `src/services/travel-continuous-flow.functions.ts`
- `src/services/admin-team.functions.ts`
- `src/services/hr.functions.ts`
- `src/services/financial-obligations.functions.ts`
- `src/services/commission.functions.ts`
- `src/services/channel-reports.functions.ts`
- `src/services/revenue-goals.functions.ts`
- `src/components/tourism/InlineSalesSpreadsheetAndGoalsPanel.tsx`
- `src/components/tourism/CommissionAwardReceiptModal.tsx` (novo)
- `src/components/tourism/OperatorBillingPanel.tsx` (novo)
- `src/components/tourism/EmployeeCommercialProfilePanel.tsx` (novo)
- `src/components/tourism/unified-proposal-workspace.tsx`
- `src/components/hr/employee-dossier-modal.tsx`
- `src/routes/workspace.turismo.comissoes.tsx`
- `src/routes/workspace.turismo.minhas-vendas.tsx` (novo)
- `src/routes/workspace.turismo.viagens.$id.tsx`
- `src/routes/workspace.configuracoes.equipe.tsx`
- `src/routes/workspace.financeiro.comissoes.tsx`
- `src/routes/workspace.financeiro.recebiveis.tsx`
- `src/routes/workspace.financeiro.contas-pagar.tsx`
- `src/routes/workspace.financeiro.funcionarios.tsx`
- `src/routes/workspace.rh.folha.tsx`
- `src/routes/workspace.relatorios.metas.tsx`
- Suites Vitest (`*.test.ts`) cobrindo cálculo, acumulação mensal, pagamento por fora, recibos, RBAC negativo/positivo, cobrança de operadoras e forecast estatístico.

---

## 3. Critérios de Aceite Mensuráveis

1. `npm run typecheck` sem novos erros nos módulos alterados/criados (e validação de build completa `npm run build` + `npm run check:route-budget` abaixo de 25.00 MB).
2. `npm run check:schema` e `npm run check:bff` aprovados (0 tabelas não declaradas, 0 versões SQL duplicadas).
3. `npm run lint:design` aprovado sem violações P0/P1 nos arquivos alterados/criados.
4. Suítes Vitest específicas aprovadas provando casos positivos, negativos de autorização/tenant, recálculo de faixa server-side, isolamento CLT vs "por fora" e forecast estatístico P10/P50/P90.
