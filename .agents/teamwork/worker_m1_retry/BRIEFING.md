# BRIEFING — 2026-10-04T04:45:00Z

## Mission
Remediar os 8 alvos de toque sub-44px identificados pelo Challenger 2 nas rotas de loja, atualizar a regra DL-14 em scripts/design-lint.mjs para análise JSX multilinha com parseJsxTags, e validar com sucesso os testes, lint (--changed), baseline e ratcheting.

## 🔒 My Identity
- Archetype: teamwork_preview_worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m1_retry
- Original parent: d28f856c-9966-4ad5-80d8-b7dba7b1979c
- Milestone: Milestone 1 (Design System Governance & UI Stress-Test — Remediation Iteration 2)

## 🔒 Key Constraints
- Exclusive write boundaries:
  1. `src/routes/_store.diretorio.index.tsx`
  2. `src/routes/_store.empregos.index.tsx`
  3. `src/routes/_store.eventos.tsx`
  4. `scripts/design-lint.mjs`
  5. `design-lint.baseline.json`
- PROIBIÇÃO ABSOLUTA (R6): Proibido executar `npm run typecheck` ou `npm run build` sob qualquer circunstância.
- Integridade: Proibido hardcode de resultados de teste, facades ou bypasses.
- Conformidade total com AGENTS.md, DESIGN.md e WCAG 2.2 AA (DL-14 touch targets >= 44px).

## Current Parent
- Conversation ID: d28f856c-9966-4ad5-80d8-b7dba7b1979c
- Updated: 2026-10-04T04:40:16Z

## Task Summary
- **What to build**:
  1. Remediar 8 touch targets sub-44px nas rotas de loja:
     - `src/routes/_store.diretorio.index.tsx`: Linhas 244 (Button size="sm"), 530 (ProtectedContactButton h-10), 539 (Button h-10), 626 (ProtectedContactButton h-8), 633 (Button h-8).
     - `src/routes/_store.empregos.index.tsx`: Linha 251 (Button size="sm").
     - `src/routes/_store.eventos.tsx`: Linha 596 (button nativo), 763 (Button size="sm").
  2. Atualizar regra DL-14 em `scripts/design-lint.mjs` para usar `parseJsxTags` cobrindo tags multilinhas.
  3. Validar: `node scripts/design-lint.test.mjs`, `node scripts/design-lint.mjs --changed`, `node scripts/design-lint.mjs --update-baseline`, `node scripts/design-lint.mjs --ratchet`.
- **Success criteria**: 0 falhas em testes unitários, 0 violações P0/P1 no lint (--changed), baseline atualizada e ratchet aprovado com exit code 0.
- **Interface contracts**: `AGENTS.md`, `docs/design/DESIGN.md`, `docs/design/DESIGN-LINT.md`.
- **Code layout**: `src/routes/`, `scripts/`.

## Key Decisions Made
- [TBD]

## Artifact Index
- `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m1_retry\DISPATCH.md` — Despacho oficial e tarefas
- `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m1_retry\BRIEFING.md` — Memória persistente
- `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m1_retry\progress.md` — Heartbeat de progresso
- `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m1_retry\handoff.md` — Relatório de handoff

## Change Tracker
- **Files modified**: None yet
- **Build status**: Not started
- **Pending issues**: None

## Quality Status
- **Build/test result**: Not run yet
- **Lint status**: Not run yet
- **Tests added/modified**: [TBD]

## Loaded Skills
- **Source**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\skills\design-lint\SKILL.md`
  - **Local copy**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\skills\design-lint\SKILL.md`
  - **Core methodology**: Execução determinística de regras visuais DL-01 a DL-30 sem falsos positivos.
- **Source**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\skills\accessibility-floor\SKILL.md`
  - **Local copy**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\skills\accessibility-floor\SKILL.md`
  - **Core methodology**: Garantia mecânica do piso WCAG 2.2 AA (touch target >= 44px, focus ring visível).
- **Source**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\skills\design-ops\SKILL.md`
  - **Local copy**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\skills\design-ops\SKILL.md`
  - **Core methodology**: Aplicação de tokens semânticos, grade modular de 4px e ausência de classes arbitrárias.
