# Spec — W2.6.1: semântica de falha na assinatura manual

**Data:** 2026-10-07  
**Branch:** `audit/full-remediation-continuation-20261007`  
**Base:** `919c86881db1ce83de3feae7fcf7df5aadb58b7d`  
**Preflight:** AGENTS, skill/ledger, masterplan W2, relatório W2.6 e handler/testes relidos. Snapshot restaurado W2.6 tinha `transitionErr || !transitioned` seguido de delete não verificado e retorno `{ success: true }`.

## Requisitos EARS

- **Quando** a transição condicional `pending → signed` falha ou devolve erro, **o sistema deve** reler o estado persistido antes de decidir o resultado.
- **Quando** a releitura confirma `status = signed`, **o sistema deve** tratar a repetição como idempotente; não deve reportar sucesso com base apenas em erro/ausência de row.
- **Quando** a releitura confirma estado diferente de `signed`, **o sistema deve** remover a evidência da tentativa perdedora e devolver erro; falha de cleanup também deve ser explícita.
- **Quando** a releitura falha, **o sistema deve** reportar incerteza/erro, nunca sucesso.

## Paths autorizados

- `src/services/contracts.functions.ts` (handler `signContractEnvelope`)
- `src/services/contracts-manual-sign-security.test.ts`
- `docs/audits/W2-6-1-SIGNATURE-FAILURE-SEMANTICS-20261007.md`
- `docs/audits/20261007-W2-CONTINUITY-REVALIDATION.md`

## Critério de aceitação

Teste de regressão reprova no snapshot recuperado antes da correção e passa depois; cobre sucesso por transição, sucesso idempotente somente após re-leitura de estado assinado, erro de transição com estado ainda pendente, falha de leitura e falha de limpeza. Teste estático não prova atomicidade em Postgres/RPC; essa dependência continua explicitamente aberta.
