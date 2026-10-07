# Spec — Grants de RPC e provisionamento explícito de perfil

**Data:** 2026-10-07
**Escopo:** `supabase/migrations`, `src/services/auth.functions.ts`, testes de contrato e ledger.

## Requisitos EARS

- **Quando** a migration for aplicada, **então** o trigger `auth.on_auth_user_created` e a função pública `handle_new_user()` não existirão mais.
- **Quando** um usuário for criado pelo fluxo de cadastro, **então** o BFF autenticado inserirá ou atualizará explicitamente somente o perfil daquele `createdUserId`, com role inicial `customer`, sem criar organização, loja ou membership automaticamente.
- **Quando** uma RPC `SECURITY DEFINER` pública for chamada por `anon` ou `authenticated`, **então** a execução será negada, exceto funções explicitamente classificadas como leitura pública segura.
- **Quando** o servidor Waesy chamar uma RPC protegida, **então** o papel `service_role` continuará autorizado, pois os BFFs usam exclusivamente o cliente server-side com chave `service_role`.
- **Quando** o magic link for consultado, **então** haverá uma única assinatura `_token text`, sem overload UUID ambíguo, e ausência de loja não produzirá nome de agência inventado.

## RPCs protegidas nesta onda

`add_to_cart_atomic_v6`, `process_checkout_atomic`, `process_checkout_transaction_v2` (todas as assinaturas existentes), `get_public_lead_by_token(text)`, `get_public_lead_by_token(uuid)` e `reconcile_behavioral_telemetry_identity(text, uuid, uuid)`.

## Invariantes

1. Nenhum usuário novo recebe `platform_admin` por contagem de usuários, e-mail ou qualquer heurística no banco.
2. Nenhuma organização, loja ou membership é criada implicitamente durante signup.
3. Falha de provisionamento do perfil não é convertida em sucesso de cadastro.
4. O cliente browser não chama diretamente as RPCs protegidas; os callers existentes são BFFs server-side.
5. A migration é transacional, idempotente e não apaga dados de usuários existentes.

## Evidências obrigatórias

- Consulta real dos grants e do trigger antes/depois.
- Testes de contrato para ausência de `handle_new_user`, grants protegidos e provisionamento explícito.
- `npm run typecheck`, testes direcionados, `npm run build` e `git diff --check`.
- O ledger deve distinguir código corrigido, migration aplicada, integração verificada e deploy não verificado.
