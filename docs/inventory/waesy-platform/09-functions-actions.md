# 09 — Inventário de Funções BFF e Operações de Negócio (290 Funções)

O Waesy implementa o padrão BFF (Backend-for-Frontend) via Server Functions tipadas por Zod em `src/services/*.functions.ts`.

## 1. Responsabilidades das Funções BFF
- Validação estrita de parâmetros de entrada via Zod Schemas.
- Garantia de isolamento multi-tenant (`store_id` / `organization_id`).
- Execução transacional de queries SQL e chamadas de RPC.
- Tratamento defensivo contra vazamento de erros técnicos para o cliente.

## 2. Relação Completa das Ações em CSV
A listagem completa das centenas de operações exportadas, seus arquivos de origem, tabelas modificadas e RPCs invocadas está disponível em:
👉 [`actions.csv`](./actions.csv)
