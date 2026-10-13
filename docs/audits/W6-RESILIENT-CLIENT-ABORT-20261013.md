# W6 — Abort ponta a ponta no cliente resiliente

**Branch:** `fix/resilient-client-abort-backoff`
**Base:** `main` pós-merge do PR #29
**Data:** 2026-10-13

## Risco corrigido

O cliente `fetchWithExponentialBackoff` propagava `AbortSignal` para o `fetch`, mas ignorava cancelamento durante o backoff entre tentativas. Além disso, um abort externo era tratado como timeout/rede e podia iniciar novas tentativas.

## Correção

- o backoff agora recebe o `options.signal`;
- o `sleep` é cancelado imediatamente quando o chamador aborta;
- abort externo retorna `status=499` / `Client Closed Request`;
- nenhum retry adicional é iniciado após o cancelamento;
- timeout interno continua distinguido de cancelamento externo;
- regressão cobre HTTP 429 seguido de abort no callback de retry.

## Evidência local

| Gate | Resultado |
|---|---:|
| `omni-integration-compliance.test.ts` | **10/10 PASS** |
| Cancelamento durante backoff | **PASS** — somente 1 chamada ao provider |
| `npm run typecheck` | **PASS** |
| `git diff --check` | **PASS** |

## Limite

Ainda falta validar cancelamento e reconexão em consumidores reais, provider sandbox, 429/5xx reais e telemetria/custo distribuídos em staging autorizado.
