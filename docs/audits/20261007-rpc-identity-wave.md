# Onda RPC/identidade — evidência final

A auditoria reproduziu no banco real três problemas: o trigger `auth.on_auth_user_created` ainda estava ativo; `handle_new_user()` atribuía role por heurística e podia criar organização, loja e membership; e RPCs SECURITY DEFINER críticas estavam executáveis por `anon` e `authenticated`.

A migration `rpc_grants_and_explicit_profile_provisioning`, aplicada pelo Supabase como versão `20261007142914`, removeu o trigger e a função, eliminou o overload UUID do magic link, removeu o nome de agência fictício e revogou EXECUTE público de todas as funções públicas SECURITY DEFINER, mantendo EXECUTE para `service_role`.

O signup server-side agora provisiona explicitamente apenas um perfil `customer` e falha se o upsert não persistir. A regra de produto de criação posterior de loja/workspace não foi simulada nem criada nesta onda.

## Validação

| Verificação | Resultado |
|---|---|
| Trigger `on_auth_user_created` | Ausente no banco real |
| Função `handle_new_user` | Ausente no banco real |
| Overload `get_public_lead_by_token(uuid)` | Ausente |
| Grants das RPCs críticas | anon/authenticated negados; service_role permitido |
| Testes direcionados | 12 aprovados |
| Typecheck | PASS |
| Suíte completa | PASS |
| Build de produção | PASS |
| Client-leak guard | PASS |
| ESLint quiet | PASS |
| Deploy público | Não verificado |
