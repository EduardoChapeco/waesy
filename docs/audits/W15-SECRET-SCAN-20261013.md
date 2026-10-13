# W15 — Secret scan de alta confiança e supply chain

**Branch:** `fix/supply-chain-secret-scan`
**Base:** `main` pós-merge do PR #29
**Data:** 2026-10-13

## Implementação

Foi criado `scripts/audit/scan-secrets.mjs` e o comando `npm run audit:secrets`. O scanner lê somente arquivos rastreados pelo Git e bloqueia padrões de alta confiança:

- private keys PEM/OpenSSH;
- AWS access keys;
- GitHub tokens;
- Slack tokens;
- Google API keys;
- chaves OpenAI-style live/test;
- atribuições literais de `SUPABASE_SERVICE_ROLE_KEY`.

A única allowlist é explícita e localizada no fixture `src/services/ai-core-gateway.test.ts`, cujo valor `sample-secret-do-not-leak` existe para provar que o gateway remove credenciais do retorno. A allowlist registra motivo e não aceita curingas.

O gate foi adicionado ao workflow CI como `Gate 0f — High-Confidence Secret Scan`.

## Resultado

| Item | Resultado |
|---|---:|
| Arquivos rastreados analisados | **4.602** |
| Findings não allowlisted | **0** |
| Allowlist | **1 fixture explícito** |
| `npm run audit:secrets` | **PASS** |
| `node --check` | **PASS** |
| `git diff --check` | **PASS** |

## Limite

Este scanner não substitui rotação/revogação de credenciais, secret scanning histórico do Git, SAST/DAST, SBOM ou revisão de dependências transitivas. Ele bloqueia apenas padrões determinísticos de alta confiança no snapshot rastreado.
