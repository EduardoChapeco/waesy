# SPEC-20261115-COPILOT-MANUS-LEVEL-EVOLUTION

- Data: 2026-11-15
- Status: Aprovado para Execucao Completa (Waves M1 a M5)
- Branch Base: `release/prod-20261113-fullpage-chat-copilot` (`67125cb3b582a38424fd389741bcabde7ce83555`)
- Escopo: Evolucao completa do Waesy Copilot para autonomia executiva nivel Manus AI sobre a stack Cloudflare Pages/Workers + Supabase + Steel Cloud + Browser Sandbox, com execucao 100% real (zero fakes/stubs).

## 1. Requisitos em Sintaxe EARS

### Wave M1 — Virtual Filesystem (VFS) & Workspace de Tarefa com Diffs Reais
- **REQ-M1-01 (VFS Isolado por Execucao):** While uma execucao do Copilot estiver ativa em `copilot_executions`, the system shall manter um sistema de arquivos virtual persistido em `copilot_executions.state.files` (`WorkspaceVfsMap`) com limites defensivos (`MAX_VFS_FILES = 32`, `MAX_VFS_FILE_BYTES = 200_000`), suportando criacao, leitura, listagem e patch exato de arquivos.
- **REQ-M1-02 (Diffs Reais e Sync para o Editor Inline):** When `vfs_write_file` ou `vfs_patch_file` modificar um arquivo do VFS, the system shall calcular o diff real entre estado anterior e modificado, emitir evento SSE `file_updated` / passo `AIActivityStep` com `fileDiff` real, e sincronizar o arquivo para a aba `Editor Inline` do `ManusComputerDrawer` com seletor multi-arquivo.

### Wave M2 — Motor de Computacao Segura no Worker & Sandbox Python/JS Interativa no Browser
- **REQ-M2-01 (Compute Sandbox Server-Side Sem `eval`):** When o Copilot invocar `sandbox_compute` (via MCP/ReAct), the system shall executar analises matematicas, estatisticas, filtragens, agrupamentos e transformacoes CSV/JSON sobre entradas diretas ou arquivos do VFS usando parser AST deterministico sem `eval()` ou `new Function()` (compativel com Cloudflare Workers).
- **REQ-M2-02 (Ponte Remota Sandbox VM quando Configurada):** If `WAESY_SANDBOX_RUNNER_URL` ou chave `e2b` estiver configurada no ambiente/cofre com URL publica valida (anti-SSRF), the system shall despachar scripts Python/Node/Bash para a sandbox remota real e retornar `stdout`, `stderr`, exit code e runtime real (`remote_sandbox_vm`); caso contrario, the system shall informar honestamente que nenhuma VM remota esta provisionada sem simular bash falso.
- **REQ-M2-03 (Sandbox Python Wasm / JS Isolado no Browser):** While o usuario visualizar artefato do tipo `code` ou script Python/JS no painel de artefatos (`artifact-code-sandbox.tsx`), the system shall permitir execucao real client-side em `<iframe sandbox="allow-scripts">` / Pyodide carregado sob demanda no browser (adicionando 0 bytes ao `_worker.js`), exibindo `stdout`, `stderr` e erros de execucao reais.

### Wave M3 — Navegador Cloud Interativo Steel CDP (Sessoes, Clicks, Type, Scroll, Live Viewer)
- **REQ-M3-01 (Cliente CDP WebSocket para Steel Sessions):** When `browser_navigate_url` ou `browser_task` executar com credencial ativa do pool `steel` (ou `WAESY_BROWSER_RUNNER_URL`), the system shall iniciar ou reutilizar uma sessao Steel (`POST https://api.steel.dev/v1/sessions`), conectar via Chrome DevTools Protocol (CDP WebSocket) e suportar acoes reais multi-passo (`navigate`, `click`, `type`, `scroll`, `wait`, `extract`, `screenshot`), devolvendo `sessionId`, `liveViewerUrl` (`sessionViewerUrl`), `screenshotUrl` persistido e `driver: "steel_cdp_session"`.
- **REQ-M3-02 (Degradacao Honesta e SSRF Guard):** If a sessao CDP falhar ou o ambiente nao suportar upgrade WebSocket, the system shall degradar em cascata para Steel `/v1/scrape` (`steel_cloud`) ou Firecrawl/HTTP (`firecrawl_fallback`), preservando integralmente o bloqueio anti-SSRF (`isPublicHttpUrl` / `isHostAllowed`) e allowlist de hosts em todas as acoes (`open`, `follow`, `click`, `type`, `scroll`, `wait`, `screenshot`, `extract`) em `agent-core.ts`.
- **REQ-M3-03 (Human-in-the-Loop Takeover):** While `liveBrowserFrame.liveViewerUrl` estiver presente no `ManusComputerDrawer`, the system shall expor acao real de "Assumir controle" abrindo o viewer interativo da sessao para login/captcha humano e permitindo retomar o agente com contexto atualizado.

### Wave M4 — Planejador Dinamico, Sub-Agentes LLM Paralelos & Loop Duravel por Checkpoints
- **REQ-M4-01 (Plano Estruturado Vivo):** When `runCopilotReactOrchestrator` iniciar tarefa complexa (ou via atualizacao de progresso), the system shall manter `ExecutionPlanStep[]` persistido em `copilot_executions.plan`, espelhado em `plan.md` no VFS e transmitido via evento SSE `plan_updated`, exibindo checklist com progresso real na UI.
- **REQ-M4-02 (Sub-Agentes Paralelos Reais `spawn_subagents`):** When o planejador ReAct emitir acao `spawn_subagents`, the system shall executar de 2 a 4 sub-agentes concorrentes via `Promise.allSettled` dentro do orcamento de subrequests do request, cada um com janela de contexto isolada, acesso restrito a tools MCP/browser/VFS permitidas pela `EffectiveSkillPolicy`, gravacao de `ai_tasks` filho (`parent_task_id`) e emissao de eventos `step_started`/`step_completed` com `role`, `tokensUsed` e evidencias reais. Também DEVE corrigir `executeSubagentDAG` e `runSquadGraphExecution` para suportar paralelismo e eliminar placeholders `tokensUsed: 0` quando o gateway estiver ativo.
- **REQ-M4-03 (Checkpoints Duraveis Multi-Turno & Controle Real):** While uma execucao atingir o limite seguro do chunk HTTP (`maxIterations: 8` / `maxActions: 6` / ~26s ou teto de subrequests), if etapas criticas permanecerem pendentes, the system shall persistir checkpoint completo em `copilot_executions` (`status: "paused"`, `current_phase: "PARTIAL_RESULT"`), emitir evento SSE `checkpoint` e suportar retomada continua autenticada (`continueExecutionId` em `POST /api/ai/stream`) bem como controle humano (`controlCopilotExecutionFn`: `pause`, `resume`, `inject_guidance`, `cancel`) verificando ownership multi-tenant (`user_id` / `is_store_staff`).
- **REQ-M4-04 (Worker Assincrono de Retomada & Realtime):** The system shall prover endpoint autenticado por token de worker (`POST /api/cron/ai-tasks`) para retomar checkpoints marcados com `autoResume: true`, mantendo compatibilidade de cron `pg_cron`/`pg_net` e habilitando `supabase_realtime` em `copilot_executions` e `copilot_execution_steps`.

### Wave M5 — UI/UX Nível Manus em Conformidade Total Design Lint & Worker Budget
- **REQ-M5-01 (Componentes UI Seguros & Orcamento SSR):** Todos os componentes novos (`manus-execution-plan-bar.tsx`, `artifact-code-sandbox.tsx`) devem ter `<= 250` linhas (`check:size`), seguir nomenclatura `kebab-case` (`check:naming`), zero violacoes P0/P1 no `lint:design`, zero icones `Sparkles`, alvos tateis `>= 44px` no mobile, zero `any` em tipos novos e registro client-only em `vite.config.ts` para manter `dist/_worker.js/index.js <= 25.00 MiB`.

## 2. Escopo de Arquivos Autorizados

### Criacao (arquivos novos via `write_file`)
- `docs/specs/SPEC-20261115-COPILOT-MANUS-LEVEL-EVOLUTION.md`
- `docs/audits/LEDGER-20261115-COPILOT-MANUS-EVOLUTION.md`
- `src/lib/ai/workspace-vfs.ts`
- `src/lib/ai/safe-compute-sandbox.ts`
- `src/lib/ai/steel-cdp-client.ts`
- `src/routes/api.cron.ai-tasks.ts`
- `src/components/chat/manus-execution-plan-bar.tsx`
- `src/components/chat/artifacts/artifact-code-sandbox.tsx`
- `supabase/migrations/20270520000000_copilot_manus_realtime_and_crons.sql`
- `src/services/copilot-manus-evolution.test.ts`

### Edicao Cirurgica (arquivos existentes via `edit_file`)
- `src/types/chat.ts`
- `src/lib/ai/sse.ts`
- `src/lib/ai/copilot-types.ts`
- `src/lib/web-agent/agent-core.ts`
- `src/registries/mcp-tool-registry.ts`
- `src/services/browser-automation-runner.ts`
- `src/services/copilot-execution-persistence.ts`
- `src/services/copilot-skill-policy.ts`
- `src/services/autonomous-copilot-orchestrator.ts`
- `src/services/ai-agent-squad-orchestrator.functions.ts`
- `src/services/copilot-react-orchestrator.ts`
- `src/services/ai-conversations.functions.ts`
- `src/routes/api.ai.stream.ts`
- `src/hooks/use-copilot-session.ts`
- `src/components/chat/manus-computer-drawer.tsx`
- `src/components/chat/copilot-artifact-panel.tsx`
- `src/components/chat/artifacts/index.ts`
- `src/components/chat/ai-chat-shell.tsx`
- `src/routes/workspace.copilot.tsx`
- `src/routes/_store.copilot.tsx`
- `vite.config.ts`
- `docs/design/DECISIONS.md`

## 3. Criterios de Aceite e Gates
1. `npm.cmd run check:schema` = Exit 0
2. `npm.cmd run check:bff` = Exit 0
3. `npm.cmd run check:migration-inventory` = Exit 0
4. `npm.cmd run check:tokens` = Exit 0
5. `npm.cmd run check:types-ssot` = Exit 0
6. `npm.cmd run check:cycles` = Exit 0
7. `npm.cmd run check:naming` = Exit 0
8. `npm.cmd run lint:design` = Exit 0 (0 novas P0/P1)
9. `npm.cmd run audit:buttons` = Exit 0
10. `npm.cmd run typecheck` = Exit 0
11. `npm.cmd run test -- src/services/copilot-manus-evolution.test.ts src/services/copilot-forensic-e2e-v2.test.ts src/services/copilot-forensic-p0-p2.test.ts src/services/copilot-subagent-spawner.test.ts` (e suite aplicavel) = Exit 0
12. `npm.cmd run build` + `npm.cmd run check:route-budget` = Exit 0 (`_worker.js <= 25.00 MiB`)
