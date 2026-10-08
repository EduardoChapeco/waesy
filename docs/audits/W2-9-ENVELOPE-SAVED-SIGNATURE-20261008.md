# W2.9 — Projeção do envelope e assinatura salva

**Data:** 2026-10-08  
**Branch:** `audit/full-remediation-20261007`

## Findings confirmados

- `getEnvelopeByToken` usava `select("*")` para uma rota pública de assinatura, expondo colunas que não fazem parte do contrato mínimo da tela.
- `saveUserSignature` aceitava string sem limite, usava `getServerClient()` e retornava sucesso sem verificar erro ou linha atualizada.

## Correção

- aplicar allowlist de envelope/versão/contrato com os campos realmente usados pela rota pública;
- validar token com limite;
- limitar assinatura salva a data URL de imagem com tamanho máximo;
- verificar `error` e linha afetada no update do perfil;
- manter `getUserSavedSignature` limitado ao perfil autenticado.
