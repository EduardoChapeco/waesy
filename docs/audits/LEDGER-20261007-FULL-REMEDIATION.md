

## W2.6 — assinatura manual de envelope — 2026-10-07

O handler agora limita entradas, rejeita envelopes expirados, verifica o insert da evidência e usa compare-and-set `pending → signed`; concorrência perdedora remove sua evidência e retorna idempotente. Regressão focada: 4 arquivos / 9 testes verdes; typecheck e diff check verdes. RPC transacional, IP real do request e prova em banco/runtime continuam pendentes.
