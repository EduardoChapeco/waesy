# W2.5 — OCR contratual

**Data:** 2026-10-07  
**Branch:** `audit/full-remediation-20261007`

## Finding

`extractContractDataFromOcr` era um POST sem guard de staff/rate limit e aceitava `imageUrl`, fazendo fetch server-side de uma URL controlada pelo chamador. O payload base64 também não tinha limite explícito.

## Correção

O OCR agora exige `requireStaff()`, aplica rate limit por tenant/usuário antes da chamada multimodal e limita base64 a 12 milhões de caracteres. O caminho de URL foi removido: os callers reais usam upload/base64 e a remoção elimina uma superfície SSRF desnecessária.

## Evidência

3 arquivos / 7 testes focados verdes; typecheck verde; diff check verde. Limites persistentes de quota, provider real e banco remoto permanecem pendentes.
