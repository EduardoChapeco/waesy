# AI_COPILOT_SECURITY_AUDIT — Auditoria de Segurança, RLS, Multi-Tenant e Anti-Injeção

## 1. Matriz de Controles de Segurança Implementados

| Vetor de Risco | Controle Implementado | Localização | Status |
| :--- | :--- | :--- | :--- |
| **Acesso Cruzado Multi-Tenant (`entityId` / `storeId`)** | `refineClassifiedWithAI` valida sessão (`getIdentity()`) e verifica `classifieds.user_id === identity.id` e `stores.owner_id === identity.id` no servidor antes de executar quando `entityId` ou `storeId` são informados. | `src/services/classifieds.functions.ts` | PASS |
| **Mutação de Campos Proibidos via Prompt (`price_cents`, `permissions`, `owner_id`)** | `ALLOWED_COPILOT_EDITORIAL_FIELDS` restringe alterações a `['title', 'description', 'summary', 'tags']`. `detectForbiddenFieldMutationInstruction` bloqueia instruções como `"altere o preço para 10 reais"` ou `"mude o owner_id"` com aviso explícito. | `src/lib/classifieds/ai-writing-copilot.ts` | PASS |
| **Prompt Injection via Conteúdo do Anúncio** | Dados do anúncio e instruções são isolados em blocos XML `<AD_FACTUAL_CONTEXT>`, `<CURRENT_DRAFT>` e `<USER_INSTRUCTION>` com diretiva explícita no `systemPrompt` para tratá-los exclusivamente como dados. | `src/services/classifieds.functions.ts` | PASS |
| **Alucinação de Fatos, Preços ou Números** | `validateCopilotOutputFacts` e `sanitizeSuggestedDraftAgainstFactLock` auditam a saída do LLM contra `LockedFacts` (`2026`, `5x2`, `120m²`, `R$ 1.200`) e removem superlativos não comprovados (`"maior evento da região"`, `"500 participantes"`, `"gratuito"`). | `src/lib/classifieds/ai-writing-copilot.ts` | PASS |
| **Vazamento Semântico entre Nichos (B.37)** | `NICHE_COPILOT_ADAPTERS[niche].forbiddenCrossNicheTerms` bloqueia e remove termos incompatíveis (ex.: `"finalidade: venda"`, `"temperatura: gelada"` ou `"quilometragem"` em Turismo/Eventos). | `src/lib/classifieds/ai-writing-copilot.ts` | PASS |
| **Exposição de Chaves de API de IA** | Toda chamada passa exclusivamente pela Server Function `refineClassifiedWithAI` → `executeUnifiedAiCall` no servidor; zero chaves ou chamadas diretas no cliente. | `src/services/api-orchestrator.functions.ts` | PASS |
