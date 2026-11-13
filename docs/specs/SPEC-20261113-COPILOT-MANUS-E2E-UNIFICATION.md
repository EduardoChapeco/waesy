# SPEC-20261113-COPILOT-MANUS-E2E-UNIFICATION

## 1. Objetivo
Unificar e endurecer ponta a ponta o ecossistema **Waesy Copilot (Manus Autônomo)**, **Squads Agênticos**, **MCP Bidirecional**, **Uploads Multimodais/RAG**, **Builders/Editores** e **Geradores Visuais (HTML2Canvas, HTML2PDF, HTML2PNG, Posts, Carrosséis e Templates)** para operação em produção, eliminando duplicações, rotas 404, telas desconectadas, dados fictícios e falhas de renderização `oklch`/`oklab`/`CORS`.

## 2. Requisitos em Sintaxe EARS

### EARS-01 — Orquestração Real de Squads & Fim do Sombreamento de Rota
- **QUANDO** o usuário acessar `/workspace/squads`, **O SISTEMA DEVE** renderizar a interface canônica apoiada em banco (`store_squads`, `store_squad_runs`, `SquadArchitectSheet` e aprovação human-in-the-loop) sem que `workspace.squads.tsx` barre `workspace.squads.index.tsx`, mantendo acesso ao catálogo de execução rápida em aba própria.
- **QUANDO** o Copilot receber demanda multi-domínio ou menção de squad/fragmentação (`assembleSquadForIntent`), **O SISTEMA DEVE** fragmentar a demanda em etapas rastreáveis (`@planner`, `@miner`, `@copywriter`, `@analyst`, `@critic`), executar as ferramentas necessárias e registrar `activitySteps` e artefato unificado no thread.

### EARS-02 — MCP Bidirecional (Inbound Seguro + Outbound External MCP Client)
- **QUANDO** o usuário acessar Conectores no Copilot ou Workspace, **O SISTEMA DEVE** carregar estado real de `listUserConnectors()` do banco e permitir cadastrar múltiplos servidores MCP externos (`ai_mcp_servers`) com URL HTTPS validada contra SSRF, método de autenticação criptografado (AES-256-GCM no cofre servidor) e descoberta real via JSON-RPC 2.0 `tools/list`.
- **QUANDO** servidores MCP externos ativos tiverem ferramentas descobertas, **O SISTEMA DEVE** injetá-las no catálogo de ferramentas do `executeAiCopilotPipeline` e executá-las via JSON-RPC 2.0 `tools/call` (com suporte a `application/json` e SSE) respeitando escopo do usuário/tenant.
- **NO** servidor WebMCP de entrada (`mcp-server.functions.ts`), **O SISTEMA NÃO DEVE** ignorar validação de tenant baseada em `NODE_ENV === "test"`.

### EARS-03 — Skills, Agenda, Telemetria Analytics e Manus Computer Reais
- **QUANDO** o usuário abrir Skills, Agenda ou Analytics dentro do Copilot (`AIChatShell`), **O SISTEMA DEVE**:
  1. Carregar e persistir ativação de Skills em `workspace_skill_settings` (lojista) ou `user_skill_preferences` (civil) e aplicá-las no roteamento de `executeAiCopilotPipeline`.
  2. Carregar tarefas agendadas reais (`listAiScheduledTasks`), executar realmente o prompt no `triggerScheduledTaskRun` registrando resultado/erro em `ai_tasks`, e jamais exibir sucesso em bloco `catch`.
  3. Consultar métricas reais escopadas por usuário/loja (`getCopilotUsageAnalytics` em `copilot_executions`, `copilot_execution_steps`, `ai_telemetry_logs`, `ai_skill_runs`) sem KPIs fixos.
  4. Refletir no `ManusComputerDrawer` o status real das etapas (`Em execução`, `Falha na etapa`, `Aguardando tarefa`, `Concluído`).

### EARS-04 — Multimodal, PDF, OCR & Falha Honesta em Upload/Thread
- **QUANDO** `uploadCopilotMultimodalAttachment` falhar em ambos os buckets (`copilot-uploads` e `store-assets`), **O SISTEMA DEVE** lançar erro explícito em vez de retornar URL pública não gravada.
- **QUANDO** usuário autenticado falhar ao criar thread em `workspace.copilot.tsx`, **O SISTEMA NÃO DEVE** degradar silenciosamente para modo visitante (`executeGuestCopilotMessage`), devendo exibir estado de erro com retentativa.
- **QUANDO** o usuário anexar imagem, texto, CSV, JSON ou PDF no chat, **O SISTEMA DEVE** resolver os anexos antes do roteamento/primeira chamada ao Gateway de IA, extrair texto real de UTF-8 e streams PDF (inclusive `FlateDecode` / fallback `ocr` via gateway quando binário/imagem) e exibir erro honesto na base de conhecimento do projeto caso PDF seja criptografado/escaneado sem texto.

### EARS-05 — Builders Unificados, Zero 404 & Zero Fake Data
- **QUANDO** qualquer artefato do Copilot (`ArtifactBuilderEditor`, `CopilotArtifactPanel`) abrir o editor completo via `/workspace/builder?doc=<id>` ou `/workspace/builder/$documentId/editor`, **O SISTEMA DEVE** resolver a rota válida `/workspace/builder` (criada em `src/routes/workspace.builder.index.tsx`) suportando tanto `experience_documents` quanto `workspace_builder_documents` com edição, salvamento real (erro explícito se falhar), preview e exportação HTML/PDF/PNG.
- **QUANDO** falhar IA em `builder-copilot-bridge.ts`, `ArtifactDashboard.tsx` ou fallback legado `resolveAiPipelineSteps`, **O SISTEMA NÃO DEVE** injetar empresas/telefones/KPIs fictícios (`"Mercado Central SMO"`, `"49999999999"`, `"R$ 42.850,00"`).
- **QUANDO** lojista/staff acessar `/workspace/estudio`, **O SISTEMA DEVE** permitir acesso a `STAFF_ROLES`, sincronizar `StudioCanvas` com `elements`, `background` e `zoom` externos e manter `id="studio-canvas-stage"` para exportação PNG/PDF funcional.

### EARS-06 — Motor Universal HTML2Canvas / HTML2PDF / HTML2PNG (Compatível com Tailwind v4 `oklch`/`oklab`) & Templates de Posts/Carrosséis
- **PARA TODO** gerador baseado em `html2canvas` (`src/lib/pdf-export.ts`, `ArtifactCreativePost`, `ArtifactTravelDossier`, `ArtifactInteractiveTable`, `ArtifactDashboard`, `CopilotArtifactPanel`, `workspace.marketing.studio.tsx`, `workspace.estudio.index.tsx`, `CarouselStudioEditor`, `CarouselWizardModal`, `RecipeStoryModal`, `SocialStudioModal`, `TravelPromoFlyerModal`, `VoucherStudio`, `CurriculoGeneratorModal`), **O SISTEMA DEVE**:
  1. Sanitizar em `onclone` todas as cores computadas e estilos contendo `oklch(...)`, `oklab(...)`, `color-mix(...)`, `lab(...)` ou `lch(...)` para `rgb(...)`/`rgba(...)` válidos via motor compartilhado (`src/lib/canvas/html2canvas-safe.ts`).
  2. Pré-converter imagens externas via `convertToCorsSafeDataUri` (`allowTaint: false, useCORS: true`), evitando `SecurityError: Tainted canvases may not be exported`.
  3. Garantir no `ArtifactCreativePost` (Copilot) e no `CopilotArtifactPanel` botões táteis (`h-11 min-h-11`) de **Baixar PNG**, **Exportar PDF**, edição ao vivo (título, subtítulo, lista, preço, CTA, imagem/logo, cores/temas visuais, formatos `1:1`, `4:5`, `9:16`, `16:9`) e salvamento direto em draft/Studio/Social.
  4. Garantir no `workspace.marketing.studio.tsx`, `CarouselStudioEditor` e `CarouselWizardModal` layouts distintos por arquétipo, personalização visual real e exportação de **todas as lâminas do carrossel em PDF multipágina** + PNG individual.

## 3. Arquivos Autorizados para Mutação
- Migration aditiva local: `supabase/migrations/20270407000000_copilot_external_mcp_and_unification.sql`
- Infra / Utils / BFF:
  - `src/lib/ai/mcp-client.ts` (novo)
  - `src/lib/canvas/html2canvas-safe.ts` (novo)
  - `src/lib/canvas/cors-safe-image.ts`
  - `src/lib/pdf-export.ts`
  - `src/services/mcp-connectors.functions.ts` (novo)
  - `src/services/ai-connectors-vault.functions.ts`
  - `src/services/ai-skills-router.functions.ts`
  - `src/services/ai-scheduled-tasks.functions.ts`
  - `src/services/ai-conversations.functions.ts`
  - `src/services/builder-copilot-bridge.ts`
  - `src/services/mcp-server.functions.ts`
  - `src/services/copilot-execution-persistence.ts`
- Rotas & UI Copilot/Squads/Studio/Builders:
  - `src/routes/workspace.builder.index.tsx` (novo)
  - `src/routes/workspace.squads.tsx`
  - `src/routes/workspace.copilot.tsx`
  - `src/routes/_store.copilot.tsx`
  - `src/routes/workspace.estudio.index.tsx`
  - `src/routes/workspace.marketing.studio.tsx`
  - `src/components/chat/ai-chat-shell.tsx`
  - `src/components/chat/copilot-connectors-center.tsx`
  - `src/components/chat/copilot-skills-center.tsx`
  - `src/components/chat/copilot-scheduled-tasks-view.tsx`
  - `src/components/chat/copilot-analytics-dashboard.tsx`
  - `src/components/chat/manus-computer-drawer.tsx`
  - `src/components/chat/copilot-project-knowledge-panel.tsx`
  - `src/components/chat/copilot-artifact-panel.tsx`
  - `src/components/chat/artifacts/ArtifactBuilderEditor.tsx`
  - `src/components/chat/artifacts/ArtifactCreativePost.tsx`
  - `src/components/chat/artifacts/ArtifactDashboard.tsx`
  - `src/components/chat/artifacts/ArtifactTravelDossier.tsx`
  - `src/components/chat/artifacts/ArtifactInteractiveTable.tsx`
  - `src/components/studio/studio-canvas.tsx`
  - `src/components/studio/carousel-studio-editor.tsx`
  - `src/components/studio/carousel-wizard-modal.tsx`
  - `src/components/recipes/recipe-story-modal.tsx`
  - `src/components/tourism/promotional-flyer/travel-promo-flyer-modal.tsx`
  - `src/design-system/copilot/copilot-chat-workspace.tsx`
- Testes & Governança:
  - `src/lib/ai/mcp-client.test.ts` (novo)
  - `src/lib/canvas/html2canvas-safe.test.ts` (novo)
  - `src/services/copilot-manus-unification.test.ts` (novo)
  - `docs/audits/LEDGER-20261113-COPILOT-MANUS-E2E.md`
  - `docs/design/DECISIONS.md`

## 4. Critérios de Aceite & Prova
1. Todos os testes unitários e de regressão cobrindo SSRF/JSON-RPC MCP externo, skills DB persistence & filtering, execução de tarefa agendada, anexos antes do gateway e falha fechada em storage, eliminação de fake data e sanitização `oklch`/`oklab`/`CORS` no exportador aprovados via Vitest.
2. `npm.cmd run typecheck` (Exit 0), `npm.cmd run build` (Exit 0), `node scripts/design-lint.mjs --ratchet` (0 P0 e não-regressão), `node scripts/contrast-audit.mjs` (Exit 0), `node scripts/check-bff-table-contracts.mjs` (0 faltantes), `node scripts/check-circular-deps.mjs` (0 ciclos), `node scripts/check-schema-consolidation.mjs` e `node scripts/audit/validate-migration-inventory.mjs` aprovados no SHA final.
