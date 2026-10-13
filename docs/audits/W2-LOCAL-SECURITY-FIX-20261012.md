# W2 — Correção local de isolamento de tenant

**Candidato:** `37219b6baca03c974fe9d78693a274c6a235ccc8` antes desta correção
**Escopo:** `createCustomerTicket` em `src/services/support-tickets.functions.ts`.

## Finding corrigido

O fluxo calculava `storeId || identity.store_id` e, quando ambos estavam ausentes, consultava a primeira loja cadastrada. Isso podia associar um ticket de usuário autenticado a um tenant arbitrário.

A implementação agora exige contexto explícito: `storeId || identity.store_id`. Quando não existe contexto, lança `Loja de destino não identificada.` e não consulta `stores` para escolher uma loja.

## Validação

| Verificação | Resultado |
|---|---:|
| Teste focal W3/contracts + identity + Studio | PASS — 13 testes |
| `npm run typecheck` | PASS |
| `git diff --check` | PASS |
| Scan de fallbacks restantes | executado; há ocorrências em builder, upsell, cart, tourism lifecycle, master e mining, que permanecem abertas para revisão específica |

## Limite

Esta é uma correção local de código. Não prova RLS, grants, JWT, isolamento real no Postgres, nem que os demais domínios tenham contrato seguro. W2 permanece `partial`/`blocked` para promoção até os testes de banco, concorrência, provider e cross-tenant A/B serem executados em ambiente autorizado.
