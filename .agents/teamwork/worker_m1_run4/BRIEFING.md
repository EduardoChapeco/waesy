# BRIEFING — 2026-10-04T19:55:00Z

## Mission
Milestone 1 (Run 4): Saneamento de rotas quebradas, erradicação de fake toasts, correção de botões órfãos, blindagem de error boundary em 5 rotas e realocação dos 12 testes de rota fora de src/routes/.

## 🔒 My Identity
- Archetype: implementer, qa, specialist
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m1_run4
- Original parent: f5055954-3bc6-4fa7-b6c9-7f61186365f7
- Milestone: M1: R1 Inventário Forense, Limpeza de Rotas & Fake Toasts

## 🔒 Key Constraints
- PROIBIÇÃO ABSOLUTA: Proibido executar `npm run typecheck` ou `npm run build` sob qualquer circunstância.
- Execute apenas testes focados com Vitest via `cmd /c npx vitest run <file>` e `node scripts/design-lint.mjs --changed`.
- Documentar todas as mudanças e decisões arquiteturais em `docs/design/DECISIONS.md`.
- Modificações cirúrgicas e estritas nos arquivos de escopo exclusivo.
- Sem mocks, sem façadas, sem hardcode de resultados.

## Current Parent
- Conversation ID: f5055954-3bc6-4fa7-b6c9-7f61186365f7
- Updated: not yet

## Task Summary
- **What to build**: 
  1. Corrigir links quebrados em `src/components/chat/waesy-copilot-drawer.tsx` (`/mobility` -> `/mobilidade`, `/checkout/${cartId}` -> `/checkout`) e ligar mutations reais ou honestos handlers aos fake toasts.
  2. Corrigir rotas em `src/components/onboarding/fast-company-onboarding.tsx` (`/@slug` e `/empresa/id` -> `/c/${resolvedSlug}` ou `/loja/${resolvedSlug}`).
  3. Corrigir botão/mock em `src/routes/workspace.imoveis.manutencoes.tsx` e botão cancelar em `src/routes/_store.conta.creditos.tsx`.
  4. Adicionar error handling / error boundary nas 5 rotas sem tratamento de erro.
  5. Mover os 12 arquivos `*.test.ts` de `src/routes/` para diretório fora do mapeamento de rotas (ex: `src/routes/__tests__/` ou correspondente).
- **Success criteria**: Testes focados com Vitest passando, design-lint limpo nos arquivos alterados, árvore de rotas saneada.
- **Interface contracts**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\orchestrator_5\PROJECT.md`
- **Code layout**: `src/routes/`, `src/components/`

## Key Decisions Made
- Iniciar investigando cada um dos arquivos designados e suas dependências antes de qualquer alteração.

## Artifact Index
- `.agents/teamwork/worker_m1_run4/DISPATCH.md` — Assignment do orchestrator
- `.agents/teamwork/worker_m1_run4/BRIEFING.md` — Situational awareness
- `.agents/teamwork/worker_m1_run4/progress.md` — Liveness heartbeat
- `.agents/teamwork/worker_m1_run4/handoff.md` — Relatório final de entrega

## Change Tracker
- **Files modified**: Nenhum ainda
- **Build status**: Pendente
- **Pending issues**: Nenhum

## Quality Status
- **Build/test result**: Pendente
- **Lint status**: Pendente
- **Tests added/modified**: Nenhum ainda

## Loaded Skills
- Source: N/A
