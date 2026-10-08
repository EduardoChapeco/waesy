# W2.1/W2.5 — Proteção do extrator de mídia turística

**Data:** 2026-10-07  
**Branch:** `audit/full-remediation-20261007`  
**Base:** `origin/main`  
**Escopo autorizado:** `src/services/travel-ai-extractor.functions.ts`, teste de regressão, ledger e spec desta microfase.

## Reprodução estática confirmada

`parseTravelMediaAI` é um `createServerFn(POST)` que aceita imagem/base64 ou texto, chama `executeUnifiedAiCall` e usa `getServerClient()` para consultar destinos/hotéis, mas não resolve identidade nem aplica um guard de actor no handler. O caller localizado é o importador interno de flyer promocional (`src/components/tourism/promotional-flyer/travel-ai-importer-banner.tsx`), portanto a operação pertence ao workspace de staff. O payload também não tinha limite explícito de tamanho no schema.

## Decisão

Exigir `requireStaff()` antes de qualquer cliente/IA, aplicar rate limit por `store_id:user_id` antes do custo externo e limitar o tamanho de base64/texto na fronteira Zod. Não adicionar fallback fictício, não persistir oferta e não alterar o orchestrator nesta microfase. O acesso aos catálogos continua somente leitura; prova de quota persistente, custo e provider real permanece pendente até W3/W2.5 com banco/integração.

## Gates

Regressão estática deve provar que o guard e rate limit ocorrem antes de `getServerClient`/`executeUnifiedAiCall` e que payloads excessivos são rejeitados. Typecheck, teste focado, suíte de IA aplicável e diff check devem passar. Postgres, JWT real, RLS, quota persistente e Cloudflare continuam não verificados.
