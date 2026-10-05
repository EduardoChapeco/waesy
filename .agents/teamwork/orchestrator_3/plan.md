# Engineering Plan — Project Orchestrator (Run 3)

## Objective
Orquestrar a entrega de ponta a ponta dos 4 pilares estratégicos da plataforma Waesy definidos em `ORIGINAL_REQUEST.md` (## 2026-10-04T03:35:00Z) e `DISPATCH.md`:
1. **R1**: Governança e Integridade Visual do Design System (DESIGN.md, AGENTS.md, tokens semânticos, grade 4px, alvos >=44px, design-lint zero P0/P1).
2. **R2**: Indexação e Filtragem Contextual por Cidade (`resolveActiveCity` em notícias, vagas, eventos, diretório e vitrines, paridade canônica).
3. **R3**: Resiliência do Chat Copilot e Protocolo MCP (máquina de 13 fases, resiliência contra falhas em ferramentas, dado web não-confiável, artefatos vivos).
4. **R4**: Execução Contínua e Desacoplada de Motores de Mineração (8 verticais em `src/services/mining/`, circuit breakers, deduplicação Jaccard, `crawl_queue`, vitest 100%).

---

## Phases & Execution DAG

### Phase 0: Survey & Technical Mapping (Parallel Explorers)
- **Explorer 1 (Design System & Lint Audit)**:
  - Scope: R1. Audit UI components and pages against `scripts/design-lint.mjs`, identify any remaining hex colors, arbitrary classes `-[...]`, missing 4-state matrix (data/loading/empty/error), and mobile touch targets <44px.
  - Working dir: `.agents/teamwork/explorer_survey_r1/`
- **Explorer 2 (Civic & Commercial City Indexing Audit)**:
  - Scope: R2. Audit `resolveActiveCity`, civic modules (notícias, vagas, eventos, diretório, vitrines) and TanStack routes to verify city-level isolation and filtering parity.
  - Working dir: `.agents/teamwork/explorer_survey_r2/`
- **Explorer 3 (Copilot Resilience & Mining Engines Audit)**:
  - Scope: R3 & R4. Audit Copilot chat FSM (13 phases, MCP integration, error recovery) and the 8 mining engines in `src/services/mining/` (circuit breakers, Jaccard dedup, `crawl_queue`, existing vitest tests).
  - Working dir: `.agents/teamwork/explorer_survey_r3_r4/`

### Phase 1: Milestone Definition & PROJECT.md Update
- Synthesize findings from Explorers 1, 2, 3 into a consolidated Feature Inventory and updated Milestones in `PROJECT.md`.
- Establish exact file boundaries and interface contracts for M1, M2, M3, M4.

### Phase 2: Implementation Track (Per-Milestone Iteration Loop)
For each Milestone (M1, M2, M3, M4):
- **Explorer**: Propose precise implementation plan and identify affected files.
- **Worker**: Implement changes, run targeted lints/tests, ensure zero regressions.
- **Reviewers (2)**: Independent code and architectural reviews.
- **Challengers (2)**: Empirical verification and stress testing.
- **Forensic Auditor (1)**: Integrity audit (anti-mock, anti-hardcoding, genuine implementation).
- **Gate**: Pass requires clean audit + approvals from all reviewers and challengers + passing tests.

### Phase 3: Final Quality Gate & Verification (M5)
- Full verification: `node scripts/design-lint.mjs --changed` with exit code 0 and zero P0/P1 additions.
- Vitest suite for mining: `vitest run src/services/mining/` with 100% pass rate.
- Typecheck verification on modified routes.
- Architectural decisions documented in `docs/design/DECISIONS.md`.
- Final reporting to Project Sentinel.
