# SPEC-20261115-COPILOT-FORENSIC-E2E-REFACTOR

- Data: 2026-11-15
- Status: Aprovado para Execucao por Ondas (Waves 1 a 4)
- Branch Base: `release/prod-20261113-fullpage-chat-copilot` (`67125cb3b582a38424fd389741bcabde7ce83555`)
- Escopo: Refatoracao End-to-End do Waesy Copilot (`/workspace/copilot` e `/_store/copilot`), BFF, Gateway IA, Persistencia, Memoria Vetorial, Skills, Builders, Automacao Browser e UI/UX.

## 1. Requisitos em Sintaxe EARS

### Onda 1 — Contratos Canonicos, Banco de Dados, Rotas e Purga Zero-Fake
- **REQ-W1-01 (Constraint e Tipos de Artefatos):** O sistema DEVE alinhar a constraint `ai_artifacts_artifact_type_check` em PostgreSQL e o tipo TypeScript `ChatArtifactType` / `CANONICAL_ARTIFACT_TYPES` para aceitar todos os artefatos canonicos (`document`, `spreadsheet`, `presentation`, `landing_page`, `proposal`, `image`, `video`, `omnibuilder`, `code`, `itinerary`, `travel_itinerary`, `chart`, `interactive_table`, `biolink_cluster`, `builder_bridge`, `travel_dossier`, `document_preview`, `website`, `social_post`, `creative_post`, `dashboard`, `map_view`, `carousel`, `motion_video`, `simlab_report`, `business_plan`, `web_app`, `schedule_plan`).
- **REQ-W1-02 (Persistencia Unificada de Artefatos):** Quando qualquer geracao (chat, builder ou skill) produzir artefato em thread autenticada, o sistema DEVE persistir via `persist_ai_conversation_exchange_atomic` ou `ai_artifacts` com `builder_document_id` / `experience_document_id` e `export_urls` rastreaveis, sem retornar IDs ficticios em caso de erro de banco.
- **REQ-W1-03 (Politicas RLS para Custom Skills e Memory Layers):** O sistema DEVE estender `ai_skills` com `store_id`, `allowed_tools`, `system_instructions` e `model_preference`, permitindo que membros autorizados da loja (`is_store_staff(store_id)`) e proprietarios pessoais (`owner_id = (select auth.uid())`) gerenciem skills customizadas, bem como habilitar leitura/escrita de `ai_memory_layers` para `owner_store_id` via `is_store_staff(owner_store_id)`.
- **REQ-W1-04 (Validacao de Rotas Internas):** O sistema DEVE validar e normalizar todas as URLs internas geradas pela busca interna e pelos builders (`src/lib/ai/route-validator.ts`), corrigindo `/eventos/:id` para `/evento/:id`, `/viagens/:id` para `/turismo/:id` e `/builder?doc=...` para `/workspace/builder?doc=...`, impedindo rotas 404.
- **REQ-W1-05 (Erradicacao Total de Dados Sinteticos):** O sistema NAO DEVE emitir KPIs hardcoded (`14.8%`, `8.2%`, `Math.round(ordersCount * 0.7)`), coordenadas padrao silenciosas (`Chapeco`, `-27.1004, -52.6152`), tabelas ficticias nos atalhos de builders (`handleLaunchBuilder`), passos de telemetria fabricados (`160/240/260ms`) nem fallback SVG `"Previa Ilustrativa"`. Ausencia de dados DEVE gerar estado vazio honesto ou erro tipado.

### Onda 2 — Streaming SSE Real, Orquestrador ReAct Multi-Passos, RAG Vetorial e Hierarquia de Memoria
- **REQ-W2-01 (Streaming SSE Incremental End-to-End):** Quando o usuario enviar uma mensagem no Copilot, o cliente (`useCopilotSession`) DEVE conectar-se a `POST /api/ai/stream` com `AbortController` real e consumir eventos incrementais (`run_started`, `step_started`, `step_updated`, `step_completed`, `browser_frame`, `artifact_draft`, `artifact_ready`, `widget`, `structured`, `delta`, `done`, `error`), persistindo o turno atomicamente ao finalizar.
- **REQ-W2-02 (Orquestrador ReAct Multi-Passos sem `if/else` Rigido):** Enquanto a thread recebe comandos sequenciais ou mudancas de assunto no meio da conversa, o backend DEVE executar planejamento ReAct iterativo (`src/services/copilot-react-orchestrator.ts`) com acesso dinamico as ferramentas permitidas (MCP, SimLabs, Mineracao, Builders, Imagem, Studio, Browser), sem depender de `last_intent` pegajoso nem exigir prefixos rigidos.
- **REQ-W2-03 (Gate Estrito de Skills Ativas):** Se uma skill estiver desativada (`isEnabled = false`) para o usuario/empresa, o orquestrador DEVE excluir suas ferramentas (`allowed_tools`) e suas instrucoes de sistema do contexto e impedir sua invocacao em runtime.
- **REQ-W2-04 (Embeddings Reais 1536d e Batching):** Quando o pipeline armazenar ou consultar `copilot_semantic_memory` ou `copilot_project_embeddings`, o gateway DEVE invocar `gemini-embedding-001` com `outputDimensionality: 1536` e normalizacao L2 (ou `batchEmbedContents` em lotes). Caso nenhum provedor de embedding esteja disponivel, o sistema NAO DEVE gravar hashes SHA-256 falsos no PGVector, devendo registrar apenas busca lexical explicita.
- **REQ-W2-05 (Compactacao Automatica e Hierarquia Empresa -> Projeto -> Thread -> Usuario):** Quando uma thread exceder o limiar de turnos/caracteres, o backend DEVE compactar turnos antigos em `working_memory.compacted_summary` e montar o prompt na ordem hierarquica `ai_brand_voice_settings` + `ai_memory_layers` (loja/nicho) -> conhecimento do projeto (vetorial + lexical) -> resumo compactado -> janela recente -> fatos pessoais (`user_id`), alem de oferecer painel UI de gestao de memoria.

### Onda 3 — Skills Unificadas, Generative UI Widgets, Sandbox Web Ao Vivo, Imagem Real + Worker, SimLabs/Mineracao e Playwright/Steel
- **REQ-W3-01 (Central Unificada de Skills sem Auto-Envio e sem AI-Smell):** A tela `CopilotSkillsCenter` DEVE carregar apenas a fonte canonica do banco + skills customizadas da loja/pessoais, permitir CRUD de skills customizadas, remover badge tecnico `SSOT v1.0` / `v1.0.0` / snake_case visivel, e garantir que `openSkillDetail` apenas abra o modal sem disparar mensagem automatica no chat (`Testar no chat` preenche o composer).
- **REQ-W3-02 (Widgets Generativos Inline e Sandbox Web Live):** O chat DEVE renderizar widgets interativos reais via `renderCopilotWidget` em `StructuredMessageView`, e artefatos `web_app` / `website` / `landing_page` DEVEM renderizar preview real em `<iframe sandbox="allow-scripts allow-forms allow-modals">` com arvore de arquivos, troca de viewport, captura de erros de console, download HTML/Bundle e ponte para `OmniEditor`, `UniversalDocumentStudio` (PDF), `CreativeArtboardRenderer`/`CarouselStudioEditor`/`MOTION_STUDIO_TEMPLATES` (PNG/PDF) e planilhas editaveis com formulas `=SUM` / `=AVG`.
- **REQ-W3-03 (Geracao Real de Imagens, Worker Assincrono e Ditado de Voz):** O gateway DEVE gerar imagens reais via Gemini image-generation / OpenRouter / OpenAI com upload persistente no bucket `store-assets` e processar filas via `POST /api/ai/jobs/process`. O composer DEVE capturar audio real via `MediaRecorder` / transcricao em `/api/ai/transcribe` (com fallback Web Speech ou toast de erro honesto), removendo timers ficticios.
- **REQ-W3-04 (Exposicao de SimLabs 4.0 e Mineracao):** O catalogo MCP / ReAct DEVE expor ferramentas de simulacao (`simlab_run_batch`, `simlab_test_seven_sins`, `simlab_focus_group`) e mineracao (`mining_harvest_places`, `mining_enrich_cnpj`, `mining_datajud_lookup`, `mining_pncp_tenders`, `mining_economic_indicators`) retornando artefatos visuais estruturados.
- **REQ-W3-05 (Automacao de Browser Multi-Driver com SSRF Guard):** O runner `src/services/browser-automation-runner.ts` DEVE suportar drivers `vps_playwright_cdp`, `steel_cloud` e `firecrawl_fallback`, respeitando `isPublicHttpUrl` / `isHostAllowed`, transmitindo `browserUrl`, `screenshotUrl` e logs reais para o `ManusComputerDrawer` com controles `Pausar agente` e `Assumir controle`.

### Onda 4 — Layout Adaptativo, Rotas Clicaveis e Validacao Completa
- **REQ-W4-01 (Layout 3 Colunas Adaptativo e Design Hygiene):** `AIChatShell` DEVE permitir recolher a Coluna 1B no desktop, alternar largura/split da Coluna 3, usar `@container` em tabelas/toolbars de artefatos (`ArtifactInteractiveTable`), remover ticks de minimap, eliminar icones `Sparkles` nos arquivos do Copilot e garantir alvos de toque >= 44px no mobile.
- **REQ-W4-02 (Links Clicaveis Validados em Markdown):** `CopilotMessageRenderer` DEVE transformar rotas internas Waesy validas (`validateInternalRoute`) em links navegaveis clicaveis (`<Link>`).

## 2. Escopo de Arquivos Autorizados

### Criacao (arquivos novos via `write_file`)
- `docs/specs/SPEC-20261115-COPILOT-FORENSIC-E2E-REFACTOR.md`
- `docs/audits/LEDGER-20261115-COPILOT-E2E.md`
- `supabase/migrations/20270417000000_copilot_unified_artifacts_memory_skills_exec.sql`
- `src/lib/ai/artifact-contract.ts`
- `src/lib/ai/route-validator.ts`
- `src/services/copilot-react-orchestrator.ts`
- `src/services/browser-automation-runner.ts`
- `src/routes/api.ai.jobs.process.ts`
- `src/routes/api.ai.transcribe.ts`
- `src/components/chat/copilot-memory-settings-sheet.tsx`
- `src/components/chat/artifacts/ArtifactWebPreview.tsx`
- `src/services/copilot-forensic-e2e-v2.test.ts`

### Edicao Cirurgica (arquivos existentes via `edit_file`)
- `src/types/chat.ts`
- `src/lib/ai/sse.ts`
- `src/lib/web-agent/agent-core.ts`
- `src/services/copilot-internal-search.ts`
- `src/services/ai-builder-composition.functions.ts`
- `src/services/builder-copilot-bridge.ts`
- `src/services/ai-core-gateway.functions.ts`
- `src/services/copilot-memory.functions.ts`
- `src/services/copilot-projects.functions.ts`
- `src/services/ai-skills-router.functions.ts`
- `src/services/ai-conversations.functions.ts`
- `src/services/ai-pool.ts`
- `src/services/web-agent.functions.ts`
- `src/registries/mcp-tool-registry.ts`
- `src/routes/api.ai.stream.ts`
- `src/routes/workspace.copilot.tsx`
- `src/routes/_store.copilot.tsx`
- `src/hooks/use-copilot-session.ts`
- `src/components/chat/ai-chat-shell.tsx`
- `src/components/chat/copilot-skills-center.tsx`
- `src/components/chat/copilot-artifact-panel.tsx`
- `src/components/chat/artifacts/ArtifactInteractiveMap.tsx`
- `src/components/chat/artifacts/ArtifactInteractiveTable.tsx`
- `src/components/chat/artifacts/ArtifactBuilderEditor.tsx`
- `src/components/chat/structured-message-view.tsx`
- `src/components/chat/copilot-message-renderer.tsx`
- `src/components/chat/manus-computer-drawer.tsx`
- `src/components/chat/manus-task-telemetry-sheet.tsx`
- `src/components/chat/chat-composer.tsx`
- `docs/design/DECISIONS.md`

## 3. Criterios de Aceite e Gates
1. `npm.cmd run check:schema` = Exit 0
2. `npm.cmd run check:bff` = Exit 0
3. `npm.cmd run lint:design` = Exit 0 (sem novas violacoes P0/P1)
4. `npm.cmd run check:tokens` = Exit 0
5. `npm.cmd run check:types-ssot` = Exit 0
6. `npm.cmd run check:cycles` = Exit 0
7. `npm.cmd run typecheck` = Exit 0
8. `npm.cmd run test` = Exit 0 (incluindo reproducao e correcao em `copilot-forensic-e2e-v2.test.ts` + suites existentes do Copilot)
9. `npm.cmd run build` = Exit 0
10. `npm.cmd run check:route-budget` = Exit 0 (< 25.00 MB)
