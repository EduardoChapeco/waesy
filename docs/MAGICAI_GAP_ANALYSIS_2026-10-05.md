
## 8. Implementado nesta rodada (checkpoint 2026-10-05)

### Lote P0 — contenção e base visual

- **Corrigido:** `src/routes/__root.tsx`, `src/routes/_store.tsx`, `src/routes/_store.classificados.$id.tsx` e `src/routes/workspace.tsx` agora normalizam `unknown` para `Error` no contrato de `errorComponent`, preservando redirects e diagnóstico.
- **Corrigido:** webhooks críticos passaram a exigir assinatura HMAC server-side; secrets não ficam em query string nem fallback estático.
- **Corrigido:** scripts administrativos deixaram de conter URLs/senhas/service-role keys hardcoded; exigem secrets do ambiente/cofre.
- **Aplicado:** tokens MagicAI como ponte no `src/styles.css`: Inter existente, primária `#7C3AED`, rail 64px, contexto 280px, `data-theme="dark"`, motion 150ms.
- **Validado:** `npm run check:tokens` passou; suíte de design passou com 44 testes; `webhook-signature.test.ts` passou; sintaxe dos scripts alterados passou; scanner não encontrou os valores exatos comprometidos.

### Lote P1 — pool multi-provider

- **Criado:** `src/lib/ai/provider-registry.ts` como registry único para OpenRouter, Groq, Gemini, OpenAI, Anthropic e DeepSeek, com protocolo, modelo padrão, capacidades, free-tier e cadeia de fallback.
- **Corrigido:** `src/services/ai-pool.ts` deixou de retornar sucesso sandbox quando não há chave e deixou de suportar somente OpenRouter/Groq; passou a executar adapters OpenAI-compatible, Gemini e Anthropic, com timeout, telemetria de tentativas e fallback somente para falhas retryable.
- **Testado:** `provider-registry.test.ts` + `webhook-signature.test.ts`: 6 testes aprovados.

### Estado honesto dos gates

- **TypeScript:** 136 erros existentes na baseline continuam; os maiores clusters são rotas de marketing/financeiro e handlers webhook. O próximo lote deve reduzir esses erros por contratos, sem mascarar com `any`.
- **Não considerado concluído:** SSE real, tool calling persistido, reservation/rollback de créditos, ReAct multi-agent, adapters multimídia/telefonia e E2E dos builders.
