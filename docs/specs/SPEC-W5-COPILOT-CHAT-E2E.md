# SPEC-W5 — Copilot e chat de ponta a ponta

## Implementação desta onda

A W5 removeu a bifurcação mais perigosa do Copilot: o drawer global deixou de importar e executar o pipeline server-side diretamente no React e passou a usar `executeCopilotDrawerMessage`, uma server function/BFF.

A autorização BFF agora distingue participante, agente atribuído e papéis administrativos (`owner`, `admin`, `manager`, `platform_admin`, `master`). A listagem deixou de enumerar todas as threads da loja para qualquer membro. Artefactos derivam o tenant da thread e falhas de persistência não produzem cards entregues fictícios.

O fullscreen limpa o histórico ao trocar de thread e ignora respostas atrasadas. Falhas retryable marcam a mensagem do utilizador como `failed`, permitindo retry. `open_place` é encaminhado para o mesmo destino do drawer. Pin/archive estão conectados ao BFF. Guests recebem rate limit e não podem acionar intents avançadas de mineração sem sessão. Places e tabelas não usam defaults sintéticos para estado, rating ou linhas.

## Critérios locais verificados

- TypeScript sem erros.
- Suíte Vitest completa verde.
- Build Cloudflare local verde.
- Testes unitários de autorização cobrem outsider, agente atribuído, participante, manager e anónimo.
- Diff sem erros de whitespace.

## Limites de evidência

Ainda não foi fabricado um resultado de browser E2E, provider real ou POST guest real. A integração live do SSE/cancelamento ponta a ponta, abort do provider e validação Supabase/RLS com dois utilizadores continuam a exigir ambiente de staging/browser. Esses itens permanecem explicitamente abertos para a subfase de integração W5, em vez de serem inferidos pelo build.
