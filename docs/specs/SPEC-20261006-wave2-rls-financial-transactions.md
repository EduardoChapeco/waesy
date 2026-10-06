# SPEC-20261006 — Onda 2: RLS e transações financeiras

## Objetivo

Reconciliar o isolamento dos agregados críticos de turismo e proteger o ledger financeiro com operações server-side idempotentes, sem depender de policies públicas permissivas.

## Escopo atômico

Esta onda cobre `travel_proposals`, `travel_contracts`, `tourism_trips`, `trip_passengers`, `trip_confirmation_items`, `tourism_vouchers`, `travel_proposal_acceptances`, `travel_sales`, `travel_timeline_events`, `financial_immutable_ledger` e um novo agregado `travel_sale_payments`.

O acesso público a proposta, contrato e voucher será feito exclusivamente pelos Server Functions tokenizados. As policies públicas de leitura/alteração serão removidas para impedir acesso direto por PostgREST.

## Requisitos EARS

- **Quando** uma sessão autenticada ler ou alterar um agregado turístico, **o banco deve** exigir `is_store_staff(store_id)` ou uma regra explícita de ownership público tokenizado fora do PostgREST.
- **Quando** uma operação de escrita receber `store_id`, **a policy deve** aplicar `WITH CHECK` ao mesmo tenant, impedindo troca de loja durante update/insert.
- **Quando** um cliente tentar inserir, atualizar ou apagar o ledger imutável, **o banco deve** negar a operação diretamente.
- **Quando** um pagamento turístico for registrado, **a RPC deve** bloquear a venda, verificar o tenant, aceitar uma chave idempotente, inserir pagamento, registrar ledger e timeline na mesma transação.
- **Quando** a mesma chave idempotente for repetida, **a RPC deve** retornar o lançamento existente sem duplicar pagamento, ledger ou evento.
- **Quando** a cadeia do ledger for atualizada concorrentemente, **a função deve** serializar a obtenção do hash anterior com advisory lock transacional.

## Invariantes

- Nenhuma policy `USING(true)` ou `WITH CHECK(true)` permanece nos agregados sensíveis desta spec.
- Nenhum endpoint público usa UUID interno como credencial.
- Pagamento, ledger e timeline não podem ficar parcialmente persistidos.
- Nenhum `DROP TABLE`, alteração destrutiva de dados ou backfill irreversível será executado nesta migration.
- A validação real de grants/RLS requer Postgres/Supabase; a migration deve ser revisada com `db reset`/`db lint` quando disponível.

## Critérios de aceite

| Gate       | Critério                                                                           |
| ---------- | ---------------------------------------------------------------------------------- |
| SQL        | Migration parseável, idempotente e sem timestamp duplicado                         |
| RLS        | Policies críticas têm tenant + `WITH CHECK`; policies públicas sensíveis removidas |
| Financeiro | Nova RPC tem lock, UNIQUE de idempotência, ledger e timeline                       |
| BFF        | Função financeira exige `requireFinance` e valida valores positivos                |
| Regressão  | Testes focados, typecheck dos arquivos alterados, build e diff limpo               |

## Resultado da execução

A migration adiciona 443 migrations totais sem colisão de versão e não contém `USING (true)` ou `WITH CHECK (true)` nos novos agregados. Prettier e ESLint passaram no BFF; o build de produção e o client-leak check passaram. Os testes focados de RLS, RBAC financeiro, ledger, lifecycle e onboarding passaram com 5 arquivos e 33 testes.

O typecheck com heap de 8 GB terminou com exit code 2 por erros legados em rotas existentes, sem referências a `travel-financial.functions.ts`, `record_travel_sale_payment` ou à migration da Onda 2. A validação efetiva das policies, grants, funções SECURITY DEFINER e parser SQL ainda depende da execução em Postgres/Supabase real.
