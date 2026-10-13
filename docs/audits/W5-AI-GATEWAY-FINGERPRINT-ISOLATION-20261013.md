# W5 — Isolamento do fingerprint do AI Core Gateway

**Branch:** `fix/ai-gateway-fingerprint-isolation`
**Base:** `main` pós-merge do PR #29
**Data:** 2026-10-13

## Risco corrigido

O fingerprint usado simultaneamente pelo cache de respostas e pela deduplicação in-flight considerava prompt, system prompt, formato, temperatura e quantidade de imagens, mas não incluía o escopo do usuário/tenant, versão do prompt, limites de geração, contexto ou conteúdo das imagens.

Isso permitia colisões entre solicitações semanticamente diferentes e poderia reutilizar resposta entre contextos de workspace/loja.

## Correção

O fingerprint agora inclui uma representação canônica ordenada de:

- tarefa, prompt e system prompt;
- versão do prompt e módulo;
- `maxTokens`, temperatura, formato, qualidade mínima e teto de custo;
- `userId`, `workspaceId`, `storeId`, role e plano;
- contexto da solicitação;
- MIME type e hash SHA-256 do conteúdo de cada imagem.

Valores aninhados são ordenados antes do hash para manter estabilidade independente da ordem de inserção das propriedades. Segredos não são persistidos no fingerprint: somente o digest é utilizado.

## Evidência local

| Gate | Resultado |
|---|---:|
| `ai-core-gateway.test.ts` | **7/7 PASS** |
| Fingerprint entre tenants diferentes | **PASS** |
| Fingerprint entre versão/limites/imagens diferentes | **PASS** |
| `npm run typecheck` | **PASS** |
| `git diff --check` | **PASS** |

## Limite

A alteração reduz colisões no processo e no cache de cada instância, mas não substitui isolamento RLS/grants no banco, controle de quota distribuído nem testes de concorrência em ambiente de produção/staging.
