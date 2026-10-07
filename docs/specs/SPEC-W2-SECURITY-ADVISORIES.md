# SPEC-W2 — Remediação de advisories de segurança

## Escopo

Corrigir findings confirmados no projeto Supabase Waesy sem ampliar permissões nem alterar fluxos públicos intencionais.

## Requisitos EARS

- **Quando** uma view pública for marcada como `SECURITY DEFINER`, **o sistema deve** usar `security_invoker` para respeitar RLS do utilizador.
- **Quando** uma função for marcada com `search_path` mutável, **o sistema deve** fixar `search_path` em `public, pg_temp`.
- **Quando** uma tabela tiver RLS ativo e nenhuma policy, **o sistema deve** declarar explicitamente uma policy exclusiva de `service_role`, mantendo acesso público/autenticado fechado até existir contrato de domínio.
- **Quando** um RPC alterar dados financeiros, convites privilegiados ou completar onboarding, **o sistema deve** impedir execução por `anon` e preservar apenas os papéis explicitamente necessários.

## Invariantes

1. Nenhuma policy nova concede acesso a `anon` ou `authenticated` por omissão.
2. `service_role` mantém o caminho operacional dos workers e migrations.
3. Checkout, telemetry e verificadores públicos não são revogados nesta microfase sem teste de contrato específico.
4. A migration é idempotente e não remove dados.

## Evidência exigida

- Advisory de segurança antes e depois.
- `pg_policies` confirma policy explícita nas 24 tabelas.
- `pg_proc.proconfig` confirma search path fixo.
- `pg_class.reloptions` confirma `security_invoker` na view.
- Typecheck, testes, build e diff check no SHA final.
