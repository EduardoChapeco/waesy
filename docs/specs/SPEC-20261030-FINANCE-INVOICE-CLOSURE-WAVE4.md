# SPEC-20261030-FINANCE-INVOICE-CLOSURE-WAVE4

## Objetivo
Fechar o ciclo mensal de faturas de cartão no banco, mantendo a criação da próxima competência idempotente e sem confiar em estado de cliente.

## Requisitos EARS
- Quando uma fatura `OPEN` atingir `closing_date`, o sistema deve somar os lançamentos persistidos, mudar o estado para `CLOSED` e selar `amount_cents` em uma operação transacional.
- Quando uma fatura for fechada, o sistema deve criar a próxima competência `OPEN` com `ON CONFLICT DO NOTHING`.
- Quando uma fatura `CLOSED` ultrapassar `due_date` sem pagamento integral, o sistema deve marcar `OVERDUE`.
- Quando `pg_cron` estiver habilitado, o banco deve registrar uma execução diária idempotente da função de fechamento.
- Quando `pg_cron` não estiver disponível, a função deve continuar executável por operador seguro ou job externo sem quebrar a migração.

## Invariantes
- A chave `(card_id, reference_year, reference_month)` permanece única.
- Apenas `service_role` pode executar o fechamento automático.
- A operação não aceita valores de fatura enviados pelo cliente.
- Reexecuções não duplicam faturas nem lançamentos.

## Evidência
- Migração SQL com função `close_due_card_invoices()` e registro tolerante de cron.
- Auditoria de contratos BFF e testes focados do módulo financeiro.
