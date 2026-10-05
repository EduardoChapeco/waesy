
## 9. SSE do Copilot — checkpoint 2026-10-05

Foi adicionado `POST /api/ai/stream`, usando o gateway canônico já existente e o protocolo `src/lib/ai/sse.ts`. A conexão emite eventos tipados `status` (`planning`, `running`, `verifying`), `delta` final, `done` com provider/model/callId e `error` estruturado, com headers anti-buffering para EventSource/fetch streaming. O contrato está pronto para trocar o delta final por deltas nativos dos providers sem quebrar o cliente.

Esta entrega **não declara token streaming nativo concluído**: o gateway atual ainda executa a chamada upstream de forma síncrona e transmite o resultado final pelo envelope SSE. O próximo lote deve implementar `stream: true` para OpenAI-compatible, Anthropic e Gemini, além de persistir tool calls e estados de execução.

Validação: `vite build --mode development` passou e regenerou `src/routeTree.gen.ts`; 4 testes SSE/registry passaram; `git diff --check` passou; o typecheck voltou a 136 erros, sem erros em `api.ai.stream.ts` ou `src/lib/ai/sse.ts`.
