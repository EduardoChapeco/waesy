# Ledger de evidências — W2.2: restrição da consulta de pedido

**Branch:** `audit/full-remediation-continuation-20261007`  
**HEAD/base inicial:** `919c86881db1ce83de3feae7fcf7df5aadb58b7d` (`origin/main`)  
**Worktree inicial desta retomada:** limpa antes de restaurar snapshots W2; nesta microfase já contém mudanças W2.1–W2.7 e W2.6.1, todas desta execução.  
**PRs #5/#6/#7:** CI unificado SUCCESS; Cloudflare Pages FAILURE. Branch desta execução ainda sem PR.

## Finding confirmado na implementação recuperada

`generateContractFromOrder` executa `select(...)` com `service_role` por UUID antes de provar papel/tenant/ownership. Em seguida, trata qualquer `identity.store_id === order.store_id` como staff, sem chamar `requireStaff()`. A comparação ocorre em memória depois da leitura e não restringe a query. O filtro de token público existe, mas não cobre o caminho privado e não prova ownership de pedido para clientes.

## Prova antes da correção

- Spec: `SPEC-W2-2-ORDER-SERVICE-ROLE-RESTRICTION-20261007.md`.
- Teste previsto: exigir `requireStaff()` no handler e predicados de store/customer na query; esperado falhar no snapshot atual.
- Paths: `contracts.functions.ts`, `contracts-order-security.test.ts`; o caller público existente é lido, não alterado.

## Resultado

| Gate | Estado |
|---|---|
| Teste vermelho antes da correção | Confirmado: o teste novo falhou no snapshot recuperado por falta de role guard e filtro customer/tenant na consulta. |
| Teste focused pós-correção | `contracts-order-security.test.ts`: 4/4 PASS. |
| Suite focused W2.1–W2.7 | 6 ficheiros / 26 testes PASS após W2.3.1 e validações finais. |
| Typecheck | `npm run typecheck`: exit 0 após W2.2/W2.6.1. |
| Build/CI | `npm run build`: exit 0; CI desta branch não executado. |
| Postgres/RLS/JWT/browser/produção | Não executados; não declarar verificados |

## Residual de identidade

`requireStaff()` é a guarda canónica existente, mas `getServerIdentity()` tem auto-heal baseado em campos da loja/email para membership. A microfase garante role + query restrita usando os contratos atuais; a proveniência/remoção de memberships auto-heal pertence à revisão W2.1 e continua em aberto até validação independente.
