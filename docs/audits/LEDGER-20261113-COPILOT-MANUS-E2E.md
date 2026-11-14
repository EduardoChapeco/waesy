# Ledger de Evidencias — Auditoria e Unificacao Copilot Manus, MCP & Geradores HTML2Canvas/PDF/Posts

## Snapshot e escopo

- Data/hora (ISO, fuso): `2026-11-13T16:53:00-03:00`
- Repositorio: `EduardoChapeco/waesy`
- Branch/HEAD: `release/prod-20261113-fullpage-chat-copilot` @ `44fd7076c5010c6b0a15064170493ff64fcbbb1a`
- Base remota comparada: `HEAD` local com worktree preexistente das ondas W1-W5 integralmente preservado
- PR(s) e estado/checks: Pre-PR local no repositorio Waesy (`task-1596` typecheck e `task-1760` vite build de W5 ainda em andamento em background durante preflight)
- Worktree inicial e paths preexistentes preservados: Todas as alteracoes preexistentes da Wave 5 (`niche-ssot.ts`, `unified-field-bridge.ts`, `contract-compiler*`, etc.) mantidas sem reversao; edicoes apenas cirurgicas via `edit_file` (e `write_file` apenas para arquivos novos virgens).
- Ambiente e versoes: Windows, PowerShell, Node, Vitest, TypeScript, Vite v8.2.1, Tailwind CSS v4 (`oklch`/`oklab`/`color-mix` tokens em `src/styles.css`).
- Escopo explicitamente incluido/excluido:
  - Incluido: Unificacao Squads (`/workspace/squads` + `ai-conversations.functions.ts` + `ai-squads-registry.ts`); Suporte externo MCP bidirecional (`ai_mcp_servers` + SSRF-safe JSON-RPC client + Vault + prompt/tool dispatch); Conectores, Skills, Tarefas Agendadas, Analytics & ManusComputerDrawer conectados a BFF real; Pipeline multimodal/anexos/PDF antes do roteamento e sem fallback falso; Correcao rota/bridge Builders (`/workspace/builder` + `/workspace/builder/$documentId/editor` + `/workspace/estudio`); Engine universal safe HTML2Canvas/HTML2PDF/HTML2PNG com normalizacao `oklch`/`oklab`/`color-mix` e upgrade completo de templates/editores de posts, carrosseis e artefatos no Copilot e no Studio; Aposentadoria limpa de duplicidades (`copilot-chat-workspace.tsx`).
  - Excluido: Push remoto de migrations/deploy sem confirmacao humana explicita; reescrita integral de arquivos existentes.

## Preflight de leitura por microfase

| Onda.microfase | AGENTS/skill/plano lidos | Paths de implementacao lidos (UI/rota, BFF, DTO, SQL, teste) | Hash/commit inicial | Acao autorizada | Leitura concluida antes de mutar? |
|---|---|---|---|---|---|
| CM.0 | `AGENTS.md`, `waesy-integrity-auditor/SKILL.md`, `waesy-evidence-ledger-template.md`, `WAESY_HOLISTIC_REMEDIATION_MASTERPLAN_2026-10-06.md` | `_store.copilot.tsx`, `workspace.copilot.tsx`, `ai-chat-shell.tsx`, `waesy-copilot-drawer.tsx`, `chat-composer.tsx`, `manus-computer-drawer.tsx`, `manus-task-telemetry-sheet.tsx`, `copilot-project-knowledge-panel.tsx`, `copilot-artifact-panel.tsx`, `ArtifactBuilderEditor.tsx`, `ArtifactCreativePost.tsx`, `ArtifactInteractiveTable.tsx`, `ArtifactDashboard.tsx`, `ArtifactTravelDossier.tsx`, `ArtifactBiolinkCluster.tsx`, `copilot-connectors-center.tsx`, `copilot-skills-center.tsx`, `copilot-scheduled-tasks-view.tsx`, `copilot-analytics-dashboard.tsx`, `workspace.squads.tsx`, `workspace.squads.index.tsx`, `workspace.builder.$documentId.editor.tsx`, `workspace.estudio.index.tsx`, `workspace.marketing.studio.tsx`, `ai-conversations.functions.ts`, `autonomous-copilot-orchestrator.ts`, `ai-agent-squad-orchestrator.functions.ts`, `squads-runtime.functions.ts`, `ai-skills-router.functions.ts`, `ai-connectors-vault.functions.ts`, `ai-scheduled-tasks.functions.ts`, `ai-core-gateway.functions.ts`, `api-orchestrator.functions.ts`, `builder-copilot-bridge.ts`, `ai-builder-composition.functions.ts`, `mcp-server.functions.ts`, `mcp-orchestrator.functions.ts`, `studio.functions.ts`, `pdf-export.ts`, `cors-safe-image.ts`, `carousel-studio-editor.tsx`, `carousel-wizard-modal.tsx`, `studio-canvas.tsx`, `slide-renderer.tsx`, `slide-renderer-escamas.tsx`, `recipe-story-modal.tsx`, `social-studio-modal.tsx`, `SocialCardGeneratorModal.tsx`, `travel-promo-flyer-modal.tsx`, `VoucherStudio.tsx`, `curriculo-generator-modal.tsx`, `copilot-chat-workspace.tsx`, `20270125000002_ai_operating_system_isolation.sql` | `44fd7076` | Criar Spec EARS e executar fatiamento S1-S4 | Sim |

## Finding e estado de prova

| ID | Severidade | Estado | Path(s)/linha(s) | Reprodução antes | Causa-raiz | Correção/path(s) | Prova depois | Revisão adversarial |
|---|---|---|---|---|---|---|---|---|
| **CM-01** | P0 | confirmado | `src/routes/workspace.squads.tsx:1-248`, `src/routes/workspace.squads.index.tsx:1-100`, `src/registries/ai-squads-registry.ts`, `src/services/ai-conversations.functions.ts` | `/workspace/squads` sem `<Outlet />` sombreia `workspace.squads.index.tsx`; `CANONICAL_AI_SQUADS` nunca e usado em runtime; `ai-conversations` tem 0 imports de squad | 3 sistemas paralelos de Squad sem integracao ao Copilot | — | — | — |
| **CM-02** | P0 | confirmado | `copilot-connectors-center.tsx:103-113`, `copilot-skills-center.tsx:25,84,105-112`, `copilot-scheduled-tasks-view.tsx:58-64,88-98`, `ai-chat-shell.tsx:823-844`, `copilot-analytics-dashboard.tsx:34-84`, `manus-computer-drawer.tsx:91-97`, `ai-scheduled-tasks.functions.ts:120-168` | Conectores com estado inicial falso; Skills altera apenas `useState`; Agenda recebe zero props em `AIChatShell` e mascara erro com toast de sucesso; Analytics 100% estatico; Computer drawer exibe badge fixa de concluido; `triggerScheduledTaskRun` nao executa prompt | Telas plugadas sem BFF real ou scoped queries | — | — | — |
| **CM-03** | P0 | confirmado | `mcp-server.functions.ts:385`, ausencia de cliente MCP de saida e tabela multi-servidor | Apenas servidor WebMCP de entrada existe; usuario nao consegue cadastrar URL/Bearer de servidor MCP externo, listar `tools/list` nem invocar `tools/call` pelo Copilot; `NODE_ENV === "test"` pula check de tenant | Falta tabela `ai_mcp_servers`, cliente SSRF-safe JSON-RPC 2.0 e registro no pipeline Copilot | — | — | — |
| **CM-04** | P0 | confirmado | `workspace.copilot.tsx:524-526`, `ai-conversations.functions.ts:629-631,2575,4135-4166`, `copilot-project-knowledge-panel.tsx:38-55` | Erro ao criar thread rebaixa usuario logado para guest; upload retorna URL sintetica se ambos buckets falham; PDF ignorado em `resolveCopilotAttachments` e lido apenas no Stage 4 pos-roteamento | Fallbacks silenciosos e ordenacao invertida do pipeline multimodal | — | — | — |
| **CM-05** | P0 | confirmado | `copilot-artifact-panel.tsx:92`, `ArtifactBuilderEditor.tsx:58-85`, `builder-copilot-bridge.ts:62-366,386-450,643-645`, `ArtifactDashboard.tsx:62-97`, `ai-conversations.functions.ts:380-410`, `workspace.estudio.index.tsx:34-41,97-100,221,516`, `studio-canvas.tsx:92-120,589-597` | Links apontam para `/workspace/builder?doc=` (404); `ArtifactBuilderEditor` mostra toast de sucesso em erro; fake data em bridges/dashboard; `workspace.estudio` bloqueia lojistas e passa `elements`/`background` ignorados por `StudioCanvas` + exporta `#studio-canvas-stage` inexistente | Divergencia entre `experience_documents` e `workspace_builder_documents`, ausência de rota `/workspace/builder` e props quebradas em `StudioCanvas` | — | — | — |
| **CM-06** | P0 | confirmado | `src/styles.css:371-395`, `src/lib/pdf-export.ts:160-250`, `carousel-studio-editor.tsx:165-215`, `recipe-story-modal.tsx:42-51`, `carousel-wizard-modal.tsx:280-381`, `workspace.marketing.studio.tsx:680-854`, `ArtifactCreativePost.tsx:1-369`, `ArtifactTravelDossier.tsx:180-191`, `copilot-chat-workspace.tsx` | Tokens CSS Tailwind v4 em `oklch`/`oklab`/`color-mix` quebram `html2canvas`; `allowTaint: true` causa `SecurityError` em `toDataURL`; `ArtifactCreativePost` e `CarouselWizardModal` não exportam PNG/PDF; `workspace.marketing.studio` exporta só 1 slide e usa card genérico escuro único; `copilot-chat-workspace.tsx` duplica shell sem uso em rotas | Falta sanitizador de cores CSS computadas (`onclone`) + CORS dataURI + templates/controles unificados de exportacao PNG/PDF | — | — | — |

## Matriz de teste por finding

Para cada ID, registrar `pass/fail/not run` apos execucao real.

- [ ] Regressao reproduz falha na baseline (`CM-01`..`CM-06`)
- [ ] Caso positivo
- [ ] Caso negativo de identidade/role/tenant & SSRF MCP
- [ ] Erro de provider/DB/bucket e rollback honesto sem sucesso ficticio
- [ ] Exportacao HTML2Canvas/PDF com tokens `oklch`/`oklab`/`color-mix` normalizados para `rgb(...)`
- [ ] Reload/rehidratação de Conectores, MCP Externo, Skills, Agendamentos, Builder Docs
- [ ] Typecheck, design-lint `--ratchet`, contrast-audit, BFF/schema/cycles/migration-inventory e build no SHA final

## Gates e resultados

| Comando/ambiente | SHA exato | Resultado/exit code | Evidencia/log | O que NAO prova |
|---|---|---|---|---|
| Preflight estatico e leitura de codigo-fonte | `44fd7076` + worktree | Baseline confirmada | Ver paths/linhas acima | Runtime ao vivo contra Postgres/Supabase remoto |
