

## W2.3 — selagem Gov.br — 2026-10-07

Corrigido P0: o callback não sela mais após falha do token exchange/userinfo e não usa claims do envelope como fallback de identidade. A função de selagem não é mais uma Server Function exposta; é server-only e só aceita claims não vazias já obtidas pelo callback. CPF do `userinfo.sub` é comparado ao CPF do envelope quando existente. Regressão focada: 3 arquivos / 7 testes verdes; typecheck e diff check verdes. Validação criptográfica de id_token/nonce/state, staging Gov.br, RLS remoto e transação real continuam pendentes.
