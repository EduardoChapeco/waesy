# W2 — Chat commerce sem fallback arbitrário de tenant

**Branch:** `fix/chat-commerce-tenant-context`
**Base:** `main` após merge do PR #29
**Data:** 2026-10-13
**Escopo:** `resolveMerchantForCategory`

## Correção

O resolver de merchant do chat commerce aceitava um merchant preferido, tentava uma loja por segmento e, quando não encontrava correspondência, selecionava a primeira loja da tabela `stores`. Esse último fallback podia direcionar uma operação para tenant sem relação com a categoria solicitada.

A correção:

- preserva o merchant explicitamente preferido;
- preserva a resolução semântica por segmento;
- retorna `null` quando não existe correspondência;
- remove `defaultStore` e `anyStore` do resolver;
- adiciona regressão para categoria inexistente;
- adiciona contrato estático de segurança para impedir a reintrodução do fallback.

## Validações

| Gate | Resultado |
|---|---:|
| `chat-commerce.test.ts` + `tenant-fallbacks.security.test.ts` | **14/14 PASS** |
| `npm run typecheck` | **PASS** |
| Scan do resolver | sem `defaultStore`/`anyStore`; `limit(1)` permanece apenas na busca por segmento |
| `git diff --check` | **PASS** |

## Limite

Esta é uma correção local de autorização/seleção de tenant. Ainda não prova RLS efetivo, JWT, grants, isolamento cross-tenant no Postgres ou comportamento de produção. Esses gates continuam dependentes de ambiente autorizado e evidência de integração.
