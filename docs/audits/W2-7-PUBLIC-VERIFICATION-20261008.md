# W2.7 — Verificação pública de documentos

**Data:** 2026-10-08  
**Branch:** `audit/full-remediation-20261007`

## Finding

`verifyDocumentPublic` era público por desenho, mas selecionava e retornava dados privados desnecessários: configurações de dispatch, observadores, identidade do criador e e-mail/telefone dos signatários. O fallback turístico também usava `select("*")`.

## Correção

- a consulta principal passou a usar uma allowlist sem creator, `dispatch_settings` ou `observers`;
- envelopes públicos retornam somente nome/role/status/data/nível de autenticação/cor, sem e-mail ou telefone;
- o retorno público não repassa configurações internas;
- o fallback turístico usa seleção explícita de colunas.

## Evidência

5 arquivos / 11 testes focados verdes; typecheck verde; diff check verde. RLS efetivo, grants e resposta em banco remoto continuam não verificados nesta sessão.
