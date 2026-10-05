# Project: Waesy Ecosystem Platform Engineering (Run 3)

## Architecture
- **Client & Routing**: TanStack Router (`src/routes/`) com rotas públicas de loja (`_store.*`), workspace (`workspace.*`) e admin (`admin-master.*`).
- **BFF (Server Functions)**: TanStack Start `createServerFn()` em `src/services/*.functions.ts`, com validação perimetral Zod e autorização SSR.
- **Design System**: Tokens semânticos em `docs/design/tokens.json` e `src/styles.css`, grade de 4px, alvos de toque >= 44px (`h-11`) no mobile, Bento Grid de 12 colunas no desktop, zero emojis (DL-23), conformidade estrita com `scripts/design-lint.mjs`.
- **Indexação Contextual Urbana**: Resolução unificada de cidade ativa (`resolveActiveCity`) via URL (`?city=`), cookies SSR/cliente (`waesy_city`) e Cloudflare `cf-ipcity`, sincronizado com invalidação reativa de rotas via `LocationMasterPill`.
- **Inteligência Artificial (Copilot)**: Máquina de estados determinística de 13 fases (`CHAT_CONTRACT.md`), integração canônica com 41 ferramentas MCP (`src/registries/mcp-tool-registry.ts`), prompt sandboxing (`prompt-shield.ts`), isolamento defensivo contra falhas de harvesters e emissão de artefatos.
- **Motores Industriais de Mineração**: 8 verticais no `crawler-batch-engine.ts`, circuit breaker por domínio de 3 estados (`CrawlerCircuitBreaker`), deduplicação semântica Jaccard 48h (`semantic-deduplicator.ts`), fila assíncrona `crawl_queue`, e zero mocks de dados ou imagens.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Linter DL-04 & DL-15 Refinement | Eliminar 4.200 falsos positivos de DL-04 (negação JS `!var`) e DL-15 (JSX multi-linha) em `scripts/design-lint.mjs` | M1 | Survey 1 (Explorer R1) |
| 2 | Store Routes Design System Remediation | Sanear as 4 rotas modificadas (`_store.diretorio`, `_store.empregos`, `_store.eventos`, `_store.noticias`): remover classes `-[...]`, emojis, cores literais, e botões < 44px | M1 | Survey 1 (Explorer R1) |
| 3 | 4-State Matrix Completeness | Adicionar `<Skeleton>` loading na busca e categorias de notícias em `_store.noticias.index.tsx` (DL-11) | M1 | Survey 1 (Explorer R1) |
| 4 | UI Primitives Hardening | Corrigir `empty-state.tsx` (`min-h-56`, `h-11`), `button.tsx` (`px-6`), e `motion-reduce:animate-none` em spinners | M1 | Survey 1 (Explorer R1) |
| 5 | Design-Lint Ratchet Recalibration | Atualizar baseline com linter saneado e garantir Exit Code 0 em `node scripts/design-lint.mjs --ratchet` | M1 | Survey 1 (Explorer R1) |
| 6 | SSR-Aware City Resolution | Atualizar `resolveActiveCity` em `src/lib/city-helper.ts` para inspecionar cookies SSR e header `cf-ipcity` | M2 | Survey 2 (Explorer R2) |
| 7 | Location Pill Reactive Sync | Conectar `LocationMasterPill` ao TanStack Router (`router.invalidate()`) para atualização instantânea de conteúdo ao trocar de cidade | M2 | Survey 2 (Explorer R2) |
| 8 | BFF Zod City Contract Parity | Declarar `city: z.string().optional()` nos validadores de `jobs.functions.ts`, `directory.functions.ts`, `classifieds.functions.ts` e `search.functions.ts` | M2 | Survey 2 (Explorer R2) |
| 9 | Portal Route Loader City Scoping | Passar `filteredCity` em todas as chamadas de serviços nos loaders de `_store.index.tsx`, `_store.explorar.tsx`, `_store.agenda.tsx` | M2 | Survey 2 (Explorer R2) |
| 10 | Surface CMS City Filter & Mock Purge | Filtrar `storesQuery` e `productsQuery` por cidade em `surface-cms.functions.ts` e eliminar métricas sintéticas hardcoded | M2 | Survey 2 (Explorer R2) |
| 11 | Crawler Metadata City Propagation | Propagar `source.region` de `crawler_sources` para `crawl_queue.metadata` e persistir `city`/`state` em `news_articles` | M2 | Survey 2 (Explorer R2) |
| 12 | Copilot 13-Phase FSM Runtime | Implementar tipos e transições formais da FSM de 13 fases em `src/types/copilot-fsm.ts` e `ai-conversations.functions.ts` | M3 | Survey 3 (Explorer R3) |
| 13 | Harvester Defensive Shielding | Envolver chamadas de ferramentas externas em `autonomous-copilot-orchestrator.ts` com tratamento defensivo e fallback amigável `FAILED_RETRYABLE` | M3 | Survey 3 (Explorer R3) |
| 14 | WebMCP Tool Registry Integration | Conectar despachante de ferramentas do Copilot às 41 ferramentas do `MCP_TOOL_REGISTRY` via `executeMcpToolCall` | M3 | Survey 3 (Explorer R3) |
| 15 | Untrusted Web Prompt Sandboxing | Aplicar `buildSandboxedPromptPayload` em `ai-conversations.functions.ts` para blindar o modelo contra injeção externa | M3 | Survey 3 (Explorer R3) |
| 16 | Mining Engines Verification | Validar integridade das 8 verticais industriais, circuit breakers, deduplicação Jaccard e manter 100% dos testes Vitest | M4 | Survey 3 (Explorer R4) |
| 17 | Final Verification & Quality Gate | Executar `node scripts/design-lint.mjs --changed`, suite Vitest de mineração, typecheck e registrar em `DECISIONS.md` | M5 | Orchestrator Run 3 |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: R1 Design System Governance & Lint | Refinar regex DL-04/DL-15 em `scripts/design-lint.mjs`, sanear 4 rotas (`diretorio`, `empregos`, `eventos`, `noticias`), matriz 4-estados com Skeleton, primitivas `empty-state`/`button`, recalibrar baseline | none | DONE |
| 2 | M2: R2 Active City Contextual Indexing | `resolveActiveCity` SSR, `LocationMasterPill` invalidation, Zod schemas em jobs/directory/classifieds/search, route loaders em index/explorar/agenda, surface-cms query scoping e crawler metadata | M1 | DONE |
| 3 | M3: R3 Copilot Chat State Machine Resilience | Tipos e transições da FSM 13-fases, try/catch defensivo em harvesters com status `failed`, integração com `executeMcpToolCall` (41 MCP tools), prompt shield sandboxing | none | DONE |
| 4 | M4: R4 Continuous Mining Engines Consolidation | Validação contínua das 8 verticais, circuit breakers, deduplicação Jaccard, execução assíncrona da `crawl_queue`, saneamento de proveniência territorial e conformidade com testes Vitest | none | DONE |
| 5 | M5: Final Quality Gate & Verification | Executar `node scripts/design-lint.mjs --changed` com código 0 e zero violações P0/P1 adicionadas, catraca aprovada, 100% vitest em todas as suítes e registro formal em `DECISIONS.md` | M1, M2, M3, M4 | DONE |

---

## Interface Contracts
### City Context Contract
- `resolveActiveCity(searchParams?, context?)`:
  - Retorna nome canônico da cidade ou `undefined` se "Global", "all", "Todas".
  - Suporta query params, cookie SSR/cliente (`waesy_city`) e edge header `cf-ipcity`.
- `LocationMasterPill`:
  - Ao alterar cidade: persiste cookie, local storage, e aciona `router.invalidate()`.

### Server Functions Zod Contracts
- `listPublicJobs`, `getPublicDirectory`, `getPublicClassifieds`, `federatedSearchInput`:
  - Devem declarar explicitamente `city: z.string().optional()` no objeto schema do `.validator()`.

### Copilot FSM Contract (`CHAT_CONTRACT.md`)
- Fases canônicas:
  `"RECEIVED" | "UNDERSTANDING" | "NEEDS_CLARIFICATION" | "PLANNED" | "WAITING_APPROVAL" | "RUNNING" | "WAITING_TOOL" | "PARTIAL_RESULT" | "VALIDATING" | "COMPLETED" | "FAILED_RETRYABLE" | "FAILED_FINAL" | "CANCELLED"`
- Falha de ferramenta externa transita para `FAILED_RETRYABLE` com mensagem explicativa e opção de retentativa, nunca propagando exceção não tratada para a rota TanStack.

---

## Code Layout
- `scripts/design-lint.mjs`: Mecanismo do linter visual determinístico.
- `src/components/ui/`: Primitivas reutilizáveis de interface (`button.tsx`, `empty-state.tsx`, `skeleton.tsx`).
- `src/components/location/`: Componente global `location-master-pill.tsx`.
- `src/lib/city-helper.ts`: Helper universal de resolução de cidade.
- `src/routes/_store.*`: Rotas de loja e portal público (`index`, `explorar`, `agenda`, `diretorio`, `empregos`, `eventos`, `noticias`).
- `src/services/`: Server Functions BFF (`news`, `jobs`, `directory`, `events`, `classifieds`, `surface-cms`, `search`, `ai-conversations`).
- `src/services/mining/`: Motores de mineração e crawlers industriais.
- `docs/design/DECISIONS.md`: Registro de decisões arquiteturais.
