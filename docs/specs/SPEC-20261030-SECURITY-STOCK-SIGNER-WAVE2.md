# SPEC-20261030 — Segurança de Estoque e Assinatura Pública (Onda 2)

## Requisitos EARS

- **Quando** uma movimentação de estoque for solicitada pela camada BFF, **o sistema deverá** validar a variante e a loja na mesma transação, registrar o movimento e atualizar `stock_on_hand` atomicamente.
- **Quando** o movimento for `reserve` ou `release`, **o sistema deverá** rejeitar o caminho legado porque a reserva física foi removida do schema canônico; o checkout atômico permanece o único proprietário desse fluxo.
- **Quando** uma assinatura pública for lida por token, **o sistema deverá** executar a consulta exclusivamente no servidor e devolver somente os campos necessários para a tela pública.
- **Quando** uma assinatura pública for confirmada, **o sistema deverá** atualizar somente um registro ainda `pending`, falhando de forma explícita em corrida ou repetição.
- **Quando** qualquer função SQL criada por esta spec for invocável, **o sistema deverá** ter `search_path` fixo, privilégios revogados para clientes públicos e autorização limitada à camada BFF.

## Invariantes

1. Nenhum componente ou rota acessa estoque ou `travel_contract_signers` diretamente.
2. Nenhuma confirmação de assinatura usa cliente anon com permissão de escrita.
3. `stock_reserved` não é referenciado pelo serviço canônico pós-migração.
4. Falhas de persistência não geram toast de sucesso.

## Escopo autorizado

- `src/services/canonical-stock-ledger.functions.ts`
- `src/services/travel-continuous-flow.functions.ts`
- `supabase/migrations/20261030170000_harden_stock_and_public_signers.sql`
- testes focados dos dois serviços

## Evidência

- teste unitário do schema e dos contratos de erro;
- auditoria textual sem referências ativas a `stock`/`reserved_stock` no serviço canônico;
- `git diff --check`;
- typecheck global quando o processo já iniciado terminar.
