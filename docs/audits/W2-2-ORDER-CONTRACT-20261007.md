# W2.2 — Geração de contrato a partir de pedido

**Data:** 2026-10-07  
**Branch:** `audit/full-remediation-20261007`  
**Escopo:** `contracts.functions.ts` e o caller de confirmação pública.

## Finding confirmado

`generateContractFromOrder` recebia somente `orderId`, consultava o pedido por UUID e criava contrato/envelope sem autenticação, sem prova de pertencimento ao tenant e sem token público. O endpoint era chamado por dois contextos legítimos de workspace e por uma confirmação pública de pedido.

## Correção planejada

- aceitar `publicToken` opcional e exigir que ele coincida com `orders.public_token` no fluxo público;
- quando não houver token público, exigir identidade autenticada e provar que ela é staff do `store_id` do pedido ou o cliente identificado em `customer_snapshot.profile_id`;
- não aceitar UUID isolado de chamada anônima;
- atualizar somente o caller público para encaminhar o token já presente na URL;
- adicionar regressão estática para impedir remoção dessas barreiras.

## Fora do escopo desta microfase

Assinatura Gov.br real, selagem multi-write, RLS no banco remoto e auditoria de todos os demais handlers de `contracts.functions.ts` permanecem itens W2 posteriores.
