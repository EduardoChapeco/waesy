

## W2.2 — geração de contrato por pedido — 2026-10-07

Finding corrigido: o handler aceitava UUID de pedido sem provar actor, tenant ou token público. Agora o fluxo público exige `publicToken` coincidente com `orders.public_token`; chamadas sem token exigem identidade cujo `store_id` coincide com o pedido ou cujo `id` coincide com `customer_snapshot.profile_id`. O caller de confirmação pública encaminha o token da rota. Regressão focada: 3 arquivos / 9 testes verdes; typecheck verde; diff check verde. A microfase não fecha assinatura Gov.br, RLS remoto ou os demais handlers de contratos.
