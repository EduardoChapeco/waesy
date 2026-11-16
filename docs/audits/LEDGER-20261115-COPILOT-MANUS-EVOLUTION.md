# Ledger de Evidencias — Evolucao Waesy Copilot Nivel Manus AI (`2026-11-15`)

## 1. Snapshot e Escopo

- **Data/hora (ISO, fuso):** `2026-11-15T22:36:00-03:00`
- **Repositorio:** `EduardoChapeco/waesy`
- **Branch/HEAD:** `release/prod-20261113-fullpage-chat-copilot` / `67125cb3b582a38424fd389741bcabde7ce83555`
- **Worktree inicial:** Alteracoes preexistentes da Onda anterior preservadas integralmente (incluindo `SPEC-20261115-COPILOT-FORENSIC-E2E-REFACTOR.md`, `api.cron.ai-jobs.ts`, `api.cron.ai-scheduled-tasks.ts`, etc.). Nenhuma mudanca preexistente descartada.
- **Ambiente:** Node `v24.14.1` (Windows), Runtime Alvo `Cloudflare Pages` (`dist/_worker.js`), Banco `Supabase PostgreSQL 17.6` (`jfuebqmltksyznovhlwa`, extensoes ativas verificadas: `pg_cron`, `pg_net`, `vector`).
- **Pools ativos confirmados via SQL read-only:** `gemini(1)`, `groq(3)`, `openrouter(1)`, `steel(3)`, `firecrawl(3)`, `datajud(1)`, `places_scraper(1)`, `resend(1)`.
- **Escopo delimitado:** `docs/specs/SPEC-20261115-COPILOT-MANUS-LEVEL-EVOLUTION.md`.

## 2. Preflight de Leitura por Onda

| Onda | Docs/Skills lidos | Arquivos inspecionados antes da edicao | Baseline Test/Status | Acao autorizada |
|---|---|---|---|---|
| M1-M5 | `AGENTS.md`, `DESIGN.md`, `DESIGN-LINT.md`, `skills/waesy-integrity-auditor/SKILL.md`, `recursive-audit`, `supabase`, `supabase-postgres-best-practices`, `security-guard`, `design-lint`, `prompt-optimizer` | `copilot-react-orchestrator.ts`, `ai-conversations.functions.ts`, `autonomous-copilot-orchestrator.ts`, `ai-agent-squad-orchestrator.functions.ts`, `browser-automation-runner.ts`, `agent-core.ts`, `mcp-tool-registry.ts`, `copilot-execution-persistence.ts`, `use-copilot-session.ts`, `manus-computer-drawer.tsx`, `copilot-artifact-panel.tsx`, `ai-chat-shell.tsx`, `vite.config.ts`, `check-route-size.mjs`, `naming-convention-validator.mjs` | `3 passed files, 30/30 passed tests` em `copilot-forensic-e2e-v2`, `copilot-forensic-p0-p2`, `copilot-subagent-spawner` | Criar modulo VFS, Safe Compute Sandbox, Steel CDP WebSocket client, Subagentes paralelos, Checkpoints duraveis multi-turno, Sandbox Python Wasm client-side e testes completos |

## 3. Achados Baseline Reproduzidos (Antes das Mutacoes)

| ID | Severidade | Status Inicial | Localizacao Exata | Causa-Raiz Confirmada |
|---|---|---|---|---|
| `F-M01` | P1 | Confirmado | `src/lib/web-agent/agent-core.ts:5-6,163-166` e `src/services/browser-automation-runner.ts:226-237` | `agent-core.ts` ignora `click`/`type`/`scroll` (`continue` no-op); Steel usava apenas `/v1/scrape` estatico sem sessoes `/v1/sessions` + CDP WebSocket + `sessionViewerUrl` live. |
| `F-M02` | P1 | Confirmado | `src/services/copilot-react-orchestrator.ts:103-130,1139,1189,1197-1199` | Teto rigido de 4 iteracoes, 3 acoes e 32s sem plano vivo (`plan.md`), sem checkpoints de retomada e sem ferramentas de workspace VFS/compute. |
| `F-M03` | P1 | Confirmado | `src/hooks/use-copilot-session.ts:123-166` e `src/components/chat/manus-computer-drawer.tsx:154-265` | Aba `Editor Inline` dependia apenas de fallback sintetico do resumo do artefato sem arquivos VFS reais nem diffs reais; `Pausar agente` e `Assumir controle` sem persistencia de controle nem `liveViewerUrl`. |
| `F-M04` | P1 | Confirmado | `src/services/copilot-react-orchestrator.ts:103-130`, `src/services/autonomous-copilot-orchestrator.ts:574-657`, `src/services/ai-agent-squad-orchestrator.functions.ts:283-361` | Planejador ReAct sem acao `spawn_subagents` paralela; `executeSubagentDAG` isolado em teste com `@planner`/`@critic` estaticos (`tokensUsed: 0`); `runSquadGraphExecution` estritamente sequencial. |
| `F-M05` | P1 | Confirmado | `src/components/chat/copilot-artifact-panel.tsx:275-287`, `src/registries/mcp-tool-registry.ts` | Ausencia de tool deterministica de computacao segura CSV/JSON/matematica e ausencia de sandbox Python Wasm / JS interativa com `stdout`/`stderr` para artefatos `code`. |
| `F-M06` | P2 | Confirmado | `supabase/migrations/`, `src/routes/api.cron.ai-jobs.ts`, `src/routes/api.cron.ai-scheduled-tasks.ts` | Tabelas `copilot_executions` e `copilot_execution_steps` fora de `supabase_realtime`; ausencia de rota worker `/api/cron/ai-tasks` para retomada automatica de checkpoints em background. |

## 4. Log de Execucao e Provas

- Ledger inicializado antes de qualquer mutacao de codigo fonte ou migration.
- `F-M01` a `F-M06` implementados: VFS (`workspace-vfs.ts`), Sandbox de Computação Segura (`safe-compute-sandbox.ts`), Steel CDP Live Session (`steel-cdp-client.ts`), Web Agent interativo (`agent-core.ts`), Loop ReAct com plano vivo, subagentes e checkpoints multi-turno (`copilot-react-orchestrator.ts`, `api.cron.ai-tasks.ts`), Pyodide/JS sandbox + Drawer Manus (`artifact-code-sandbox.tsx`, `manus-execution-plan-bar.tsx`, `manus-computer-drawer.tsx`) e migration realtime/cron (`20270520000000_copilot_manus_realtime_and_crons.sql`).
- Erros TypeScript residuais identificados pelo `tsc --noEmit` (`agent-core.ts`, `ai-conversations.functions.ts`, `ai-pool.ts`, `use-copilot-session.ts`) corrigidos para Exit Code 0.
- Suítes Copilot (`copilot-manus-evolution.test.ts`, `copilot-forensic-e2e-v2.test.ts`, `copilot-forensic-p0-p2.test.ts`, `copilot-subagent-spawner.test.ts`, `copilot-memory-and-builder.test.ts`, `ai-conversations-idempotency.test.ts`, `ai-chat-shell.test.ts`, `structured-chat.test.ts`, `m9-copilot-canva-studio-contract.test.tsx`) aprovadas.
- Migração SQL `20270520000000_copilot_manus_realtime_and_crons.sql` pronta localmente e pendente de aplicação confirmada no banco remoto `jfuebqmltksyznovhlwa`.
