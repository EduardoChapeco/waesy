# SPEC-F17: Painel Financeiro Real (Receita, Despesas e Fluxo de Caixa)

## 1. Contexto e Escopo
A Fase F17 consolida a camada BFF de gestão financeira do Workspace Pro.
O ecossistema Waesy exige gestão financeira estritamente fundamentada em dados reais agregados do banco de dados (M01: Zero Mocks), com isolamento multi-tenant intransponível (`store_id` a partir da sessão segura, nunca do cliente).

## 2. Requisitos EARS

### [REQ-F17-01] Listagem de Lançamentos Financeiros com Filtros
- **Quando** o operador do Workspace consultar os lançamentos financeiros da loja,
- **o sistema DEVE** retornar os registros reais da tabela `financial_transactions` através de `listFinancialEntriesFn`, aplicando filtros opcionais por período (`startDate`, `endDate`), tipo de transação (`type`), categoria (`category`), paginação (`limit`, `offset`), isolados pelo `store_id` do operador autenticado.

### [REQ-F17-02] Lançamento Manual de Despesas e Ajustes
- **Quando** o operador com permissão financeira registrar manualmente uma movimentação em `createFinancialEntryFn`,
- **o sistema DEVE** validar os parâmetros via Zod (`type`, `amount_cents` > 0, `description`), garantir que o tipo não é receita (receitas são geradas exclusivamente por gatilhos de pedidos/vendas), normalizar despesas com valor negativo no banco e persistir em `financial_transactions` com auditoria de `created_by`.

### [REQ-F17-03] Resumo de Fluxo de Caixa por Período
- **Quando** o operador solicitar o resumo financeiro em `getCashFlowSummaryFn`,
- **o sistema DEVE** calcular a partir dos registros reais do período o total de receitas brutas (`total_revenue_cents`), total de despesas operacionais (`total_expense_cents`), total de reembolsos (`total_refund_cents`), resultado líquido (`net_cents`) e quantidade total de transações (`transaction_count`).

### [REQ-F17-04] Rota Canônica do Painel Financeiro
- **Quando** o usuário acessar a rota `/workspace/financeiro` ou `/workspace/financeiro/`,
- **o sistema DEVE** resolver a rota sem erro 404, direcionando para o fluxo de caixa ativo ou exibindo a visão financeira consolidada.

## 3. Invariantes e Regras Pétreas
- **Zero Mocks (M01):** Nenhum valor fictício, saldo inventado ou transação sintética.
- **Valores Monetários Inteiros:** Todo valor monetário é armazenado e manipulado estritamente em centavos inteiros (`amount_cents`), nunca ponto flutuante.
- **Isolamento Multi-Tenant:** `store_id` obtido estritamente de `identity.store_id` após `assertStoreAccess`.
- **Integridade de Receita:** Proibido lançamento manual de `revenue_sale` ou `revenue_pos_sale`.
- **Qualidade e Design Lint:** 0 erros no typecheck, 0 violações P0/P1 na catraca do design lint, 0 falhas nos testes unitários e build de produção aprovado.

## 4. Critérios de Aceite
- [ ] `src/services/financial.functions.ts` exporta `listFinancialEntriesFn`, `createFinancialEntryFn`, `getCashFlowSummaryFn`.
- [ ] `src/routes/workspace.financeiro.index.tsx` criada e registrada no TanStack Router.
- [ ] Suíte de testes `src/services/financial.functions.test.ts` com cobertura total dos cenários de sucesso, validação e rejeição de receita manual.
- [ ] 4 Gates de qualidade aprovados: vitest, design-lint --ratchet, typecheck, build.
