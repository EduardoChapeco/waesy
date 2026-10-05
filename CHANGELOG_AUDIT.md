# CHANGELOG_AUDIT.md — Histórico de Auditoria do Sistema

## [2.1.0] - 2026-10-04
### Adicionado
- **Marco 1 (Governança do Design System & Linting):** Parser determinístico `parseJsxTags` em `scripts/design-lint.mjs` eliminando falsos positivos em DL-04 e DL-15; saneamento das 4 rotas de loja (`_store.diretorio`, `_store.empregos`, `_store.eventos`, `_store.noticias`) com touch targets >= 44px (`h-11`) e skeletons de 4 estados; catraca `--ratchet` congelada em 15.417 violações (DEC-021).
- **Marco 2 (Indexação Urbana Contextual por Cidade):** Resolução isomórfica `resolveActiveCity` (`src/lib/city-helper.ts`), reatividade instantânea via `LocationMasterPill` (`router.invalidate()`), paridade Zod RPC (`city: z.string().optional()`), e purga de dados sintéticos em vitrines (DEC-175).
- **Marco 3 (Resiliência do Chat Copilot & Protocolo WebMCP):** Máquina de estados determinística de 13 fases (`CopilotFsmPhase`), error boundaries defensivos com transição determinística para `FAILED_RETRYABLE`, sandboxing de dados não-confiáveis (`<user_untrusted_data>`) via `prompt-shield.ts`, e integração terminal com o catálogo de 41 ferramentas do `MCP_TOOL_REGISTRY` (DEC-176, DEC-177).
- **Marco 4 (Consolidação dos Motores Industriais de Mineração):** Resolvedor geográfico nacional desacoplado `geo-resolver.ts` (`resolveCityAndState`, `normalizeStateUf`), erradicação de BBOX fallback para Chapecó e UF cegos ("SC"), consolidação das 8 verticais industriais sem mocks e circuit breakers de 3 estados (DEC-178).
- **Marco 5 (Auditoria de Vitória & Fechamento Integrado):** 118 testes unitários e empíricos verdes no Vitest (100% de aprovação), Catraca de CI do Design Lint aprovada com código 0 e zero regressões, veredito formal `VICTORY CONFIRMED` emitido pelo Victory Auditor independente (DEC-179).

## [2.0.0] - 2026-10-04
### Adicionado
- Estrutura completa de auditoria em `audits/` (24 relatórios analíticos cobrindo as 40 Ondas).
- Catálogos de máquina em `audits/machine-readable/` (repository, database, services, endpoints, skills, engines, integrations, workflows, risks, changes).
- Documentos de governança raiz: `AUDIT_STATUS.md`, `SYSTEM_INVENTORY.md`, `DEPENDENCY_MAP.md`, `DATA_MODEL_MAP.md`, `INTEGRATION_MAP.md`, `CHAT_CONTRACT.md`, `SKILL_CATALOG.md`, `RISK_REGISTER.md`, `DECISION_LOG.md`, `CHANGELOG_AUDIT.md`.
- Migração `20270103000000_news_articles_city_indexation.sql` para indexação contextual por cidade.
- Motor `event-harvester.ts` com suporte a Schema.org para a tabela `events`.
- Branch de eventos e promoção automática de notícias para `news_articles` em `crawler-batch-engine.ts`.
- Suíte expandida de testes em `industrial-crawlers.test.ts` (9 testes verdes).

### Removido
- `src/services/ai-manus-orchestrator.ts` (código legado substituído por `autonomous-copilot-orchestrator.ts`).
- `src/services/manus-and-harvest.test.ts` (suíte legada obsoleta).
- `_legacyProcessCrawlQueueBatchInternal` de `src/services/mining.functions.ts` (dead code).
