# Correção de fallbacks de tenant — Builder, Upsell e Cart

**PR:** #29
**Escopo:** remoção de seleção arbitrária da primeira loja em três domínios.

## Correções

### Builder

`resolveStoreContext` não consulta mais `stores.limit(1)` quando um `platform_admin`/`master` não informa tenant. O administrador global precisa fornecer `targetStoreId`, `documentId` ou possuir `identity.store_id`; caso contrário, a operação falha explicitamente.

### Upsell / Order Bump

`getActiveOrderBumpForCart` agora exige `storeId` UUID no contrato de entrada. O handler usa somente o tenant declarado e não consulta uma loja padrão. O checkout só habilita a consulta quando o cart ou o perfil da loja fornecem esse tenant.

### Cart

Foram removidos dois fallbacks:

1. criação de carrinho: sem `preferredStoreId` ou tenant resolvido por `resolveTenantStoreId`, a operação falha com `Nenhum contexto de loja identificado para o carrinho.`;
2. cross-sell: `getCartCrossSellItems` exige `storeId` UUID e não busca a primeira loja.

## Evidência automatizada

| Gate | Resultado |
|---|---:|
| Testes focais builder + contratos + segurança de tenant | PASS — 17 testes |
| `npm run typecheck` | PASS |
| Scan de `firstStore`/`defaultStore` nos três domínios | PASS — nenhuma ocorrência |
| `git diff --check` | PASS |

## Limites e próximos controles

A correção impede associação arbitrária de tenant no código. Ainda é necessário validar, em ambiente autorizado, RLS/JWT/grants, tenants A/B, concorrência e autorização de `storeId` público conforme o modelo de catálogo. Os fallbacks equivalentes em turismo lifecycle, master e mining permanecem fora deste escopo e continuam abertos para revisão própria.
