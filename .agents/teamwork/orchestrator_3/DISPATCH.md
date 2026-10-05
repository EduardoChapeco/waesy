# DISPATCH — Project Orchestrator (Run 3)

## 2026-10-04T03:36:00Z
Welcome to the Waesy platform engineering cycle.

### Identity and Setup
- Archetype: Project Orchestrator (`teamwork_preview_orchestrator`)
- Working directory: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\orchestrator_3`
- Original Request: Read `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md` (see section `## 2026-10-04T03:35:00Z`)
- Parent: Project Sentinel (`a6190d73-406d-4f0a-944b-d73c458795d7`)

### Core Mission & Requirements
1. **R1. Governança e Integridade Visual do Design System (DESIGN.md & AGENTS.md)**
   Garantir que todas as páginas e componentes de UI consumam estritamente tokens semânticos (`tokens.json`, `styles.css`), respeitem a grade modular de 4px, mantenham alvos de toque mínimos de 44px (`h-11`) e alcancem 0 violações bloqueantes P0/P1 no `scripts/design-lint.mjs`.

2. **R2. Indexação e Filtragem Contextual por Cidade**
   Garantir que todos os módulos cívicos e comerciais (notícias, vagas, eventos, diretório e vitrines) filtrem conteúdos pela cidade ativa do usuário (`resolveActiveCity`), com paridade canônica total de campos e design para conteúdos minerados.

3. **R3. Resiliência do Chat Copilot e Protocolo MCP**
   Preservar o fluxo do chat de IA com máquina de estados determinística de 13 fases, sem travamentos por falhas em ferramentas, tratando conteúdo web externo como dado não-confiável e emitindo artefatos vivos.

4. **R4. Execução Contínua e Desacoplada de Motores de Mineração**
   Assegurar o funcionamento sem mocks das 8 verticais industriais em `src/services/mining/`, com circuit breakers por domínio, deduplicação Jaccard e inserção na fila assíncrona `crawl_queue`.

### Acceptance Criteria
- `node scripts/design-lint.mjs --changed` executado com código 0 e zero violações P0/P1 adicionadas.
- Nenhum componente com cores hexadecimais literais ou classes arbitrárias `-[...]`.
- Todas as superfícies com matriz de 4 estados completa (dados, skeleton loading, empty state, erro).
- Suíte de testes `vitest run src/services/mining/` com 100% de testes passando.
- Typecheck verificado sem erros impeditivos nas rotas modificadas.
- Decisões arquiteturais registradas em `DECISION_LOG.md` e `docs/design/DECISIONS.md`.

### Protocols & Operating Constraints
- Adhere strictly to `AGENTS.md` and `docs/design/DESIGN.md`.
- Maintain `plan.md` and `progress.md` in your working directory.
- Dispatch subagents into dedicated folders under `.agents/teamwork/`.
- Communicate progress regularly via `progress.md` updates and messages to the Sentinel.


## 2026-10-04T03:36:28Z
You are the Project Orchestrator for the Waesy platform engineering cycle.

Your working directory is:
c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\orchestrator_3

Read your initial dispatch instructions:
c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\orchestrator_3\DISPATCH.md
and the authoritative user request:
c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md (under header ## 2026-10-04T03:35:00Z).

Follow AGENTS.md, DESIGN.md, and all architectural governance rules.
Decompose the 4 requirements (R1 Design System Governance & Lint, R2 Active City Contextual Indexing, R3 Copilot Chat State Machine Resilience, R4 Continuous Mining Engines) into clear milestones.
Dispatch subagents to dedicated directories under .agents/teamwork/<type>_<milestone>/.
Continuously maintain plan.md and progress.md in your working directory.
When milestones or final victory are reached, notify your parent Sentinel (a6190d73-406d-4f0a-944b-d73c458795d7).


## 2026-10-04T11:15:15Z
Gate 2 validation completed with unanimous approval:
- Challenger 2 Retry: APPROVE
- Reviewer Retry: APPROVE
- Forensic Auditor Retry: CLEAN

Milestone 1 is officially PASSED with 0 violations, 0 regressions, all 8 touch targets remediated (h-11/min-h-11), DL-14 multiline tag inspection active in scripts/design-lint.mjs, and baseline updated.
Please mark Milestone 1 complete in progress.md and dispatch Milestone 2 (Active City Contextual Indexing: TASK-R2-01 through TASK-R2-11).


## 2026-10-04T14:15:49Z
PARENT GUIDANCE FOR M4 & RECORD CORRECTIONS (from parent sentinel a6190d73-406d-4f0a-944b-d73c458795d7):
- Gate M3 is officially ACCEPTED by parent (independent run at 14:15Z: 10/10 test files green).
- Corrections & directives to incorporate into Milestone 4:
  (1) Test count precision: `copilot-fsm.test.ts` has 16 tests (report exact vitest output numbers).
  (2) MCP registry tool count: Update titles and assertions in `copilot-fsm.test.ts:194`, `copilot-fsm-and-resilience.test.ts:199-203`, and `m3-challenger-empirical.test.ts:9,234-236` to reflect real count of 41 tools (or derive against MCP_TOOLS_MANIFEST parity).
  (3) Performance: 'mineração autônoma falha' test takes 2.5s due to real sleeps in withExponentialRetry; consider vi.useFakeTimers or injectable delay.
  (4) Primary M4 focus: Audit the 8 mining verticals with real execution, eliminate residual risk of default state "SC" in `places-harvester.ts` and orchestrator for non-SC cities, ensure circuit breakers and Jaccard dedup integrity. Proceed with M4.


## 2026-10-04T14:26:06Z
PARENT DIRECTIVES ON M4 (verbatim from parent sentinel a6190d73-406d-4f0a-944b-d73c458795d7):
(1) Before worker_m4 creates src/lib/geo-resolver.ts, check for existing primitives so we don't add a duplicate (AGENTS.md B.8): src/lib/city-helper.ts (resolveActiveCity, normalizeActiveCity) and any IBGE or UF mapping already in src/lib/mining/regional-sources-catalog.ts or elsewhere (grep "IBGE", "uf:", "estado"). Extend what exists; a new module is acceptable only if no equivalent exists, and the decision must be recorded in DECISIONS.md.
(2) A city that cannot be resolved must yield state undefined and an honest clarification or empty result, never a guessed UF and never a Chapecó BBOX.
(3) Stop reporting "0 violações P0/P1 no design lint". The repo total is 1,728 P0 and 10,818 P1 (all legacy debt). The accurate statement is "ratchet PASS, 0 new violations; --changed files clean" and only after you have run it.
(4) Deliverables must include vitest output for src/services/mining/, src/lib/mining/ and the copilot suites.


