

## W2.4 — tenant da criação manual de contratos — 2026-10-07

`createContract` agora exige staff, rejeita `storeId` divergente da sessão e persiste somente `identity.store_id`. Regressão de contratos: 2 arquivos / 5 testes verdes; typecheck e diff check verdes. RLS remoto e banco real continuam pendentes.
