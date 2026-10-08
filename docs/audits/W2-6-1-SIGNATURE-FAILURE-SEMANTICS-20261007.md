# Ledger de evidências — W2.6.1: falha de transição na assinatura

**Branch:** `audit/full-remediation-continuation-20261007`  
**HEAD/base:** `919c86881db1ce83de3feae7fcf7df5aadb58b7d` (`origin/main`)  
**Estado da worktree:** snapshots W2.1–W2.6 e W2.7 já restaurados; nenhuma alteração de terceiros foi detectada no clone inicial limpo.

## Finding confirmado

O snapshot recuperado W2.6 em `signContractEnvelope` executava update condicional de `pending` para `signed`, mas no ramo `transitionErr || !transitioned` ignorava o erro de delete da evidência e devolvia `success: true` sem reler o estado do envelope. Assim, uma falha de DB, cleanup ou uma transição que não ocorreu podia ser reportada como assinatura concluída.

## Reprodução e escopo

- Spec: `SPEC-W2-6-1-SIGNATURE-FAILURE-SEMANTICS-20261007.md`.
- Paths permitidos: `contracts.functions.ts` (handler), `contracts-manual-sign-security.test.ts` e este ledger/relatório de continuidade.
- Regressão a executar antes da correção: teste exige re-leitura do estado, verificação do cleanup e ausência de retorno positivo em erro desconhecido; esperado falhar no snapshot atual.

## Provas

| Gate | Resultado |
|---|---|
| Teste vermelho antes da correção | Confirmado: nova regressão falhou na branch recuperada, pois não havia re-leitura do status nem ramo de erro explícito. |
| Testes pós-correção | `contracts-manual-sign-security.test.ts`: 3/3 PASS; inclui limite/expiração, compare-and-set e resultado da falha. |
| Typecheck | `npm run typecheck`: exit 0 após W2.2/W2.6.1. |
| Build/CI | `npm run build`: exit 0 no estado atual; CI desta branch não executado. |
| Postgres real, concorrência/fault injection, RLS, browser/produção | Não executados; não reivindicar como verificados |

## Correção no snapshot final

No ramo de erro/compare-and-set sem row, o handler relê `status` e `signed_at`; só aceita o estado atual `signed`, distingue a confirmação desta tentativa, verifica o resultado do delete da evidência perdedora e lança erro se o estado/cleanup não puder ser confirmado. A consulta do banco e a atomicidade permanecem sem prova de integração.
