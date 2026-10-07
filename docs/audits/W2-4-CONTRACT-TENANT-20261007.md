# W2.4 — Tenant da criação manual de contratos

**Data:** 2026-10-07  
**Branch:** `audit/full-remediation-20261007`

## Finding

`createContract` aceitava `storeId` controlado pelo cliente e usava esse valor na inserção. A autenticação era apenas presença de identidade; não havia exigência de staff nem comparação de tenant.

## Correção

O handler agora exige `requireStaff()`, rejeita `input.storeId` quando diverge de `identity.store_id` e sempre persiste `identity.store_id`. Os callers atuais não enviam `storeId`, portanto continuam usando o tenant da sessão.

## Evidência

Regressão de contratos: 2 arquivos / 5 testes verdes; typecheck verde; diff check verde. A cobertura de RLS remoto e banco real permanece pendente.
