# W2.8 — Ownership e escritas das mutações de contrato

**Data:** 2026-10-08  
**Branch:** `audit/full-remediation-20261007`

## Finding confirmado

`updateContractDraft` usava identidade apenas para filtrar a tabela `contracts`, mas a versão podia ser apontada por ID cruzado; `sealAndIssueContract` buscava versão por IDs sem ownership, ignorava erros das atualizações de versão/contrato e fazia várias escritas best-effort antes de inserir envelopes.

## Correção desta microfase

- exigir staff nos dois handlers;
- carregar o contrato por `contractId` e `creator_id` do ator;
- exigir que a versão pertença ao contrato e esteja no estado esperado;
- verificar erros e linhas afetadas de updates críticos;
- limitar a microfase ao BFF e testes estáticos/contratuais; RPC transacional, banco real e RLS ficam em W2/W3 posteriores.
