# Onda 01 — Inventário Completo de Repositório

## 1. Topologia do Repositório

- **Tipo:** Sistema All-in-One Integrado (Single Repository com BFF Server Functions desacopladas)
- **Nome do Projeto:** `usewaesy` / Plataforma Waesy
- **Linguagens:** TypeScript (v5.8.3, Strict Mode), React 19.2.0, SQL (PostgreSQL 15+)
- **Build & Bundler:** Vite v6 + `@tailwindcss/vite` v4 + Nitro v3 (`nitro: "3.0.260603-beta"`)
- **Total de Arquivos em `src/`:** 1.837 arquivos fonte TypeScript/TSX

| Diretório | Arquivos | Papel Canônico no Sistema | Invariante de Fronteira |
| :--- | :---: | :--- | :--- |
| `src/components/` | **718** | Primitivas Radix, UI components, blocos de feed, carrosséis, cards | Proibido declarar cores literais ou regras de negócio brutas |
| `src/routes/` | **406** | Rotas tipadas TanStack Router (Storefront, Painel, Conta, APIs) | Proibido acoplar persistência direta sem passar por `services/` |
| `src/services/` | **397** | Camada BFF Server Functions (`createServerFn`), agentes e orquestração | Proibido importar bibliotecas de UI ou manipular DOM |
| `src/lib/` | **245** | Utilitários puros, schemas Zod, formatadores, clientes de infra e IA | Funções puras sem efeitos colaterais de estado de interface |
| `src/types/` | **36** | Definições canônicas de domínio, DTOs e entidades | Tipagem estrita compartilhada |
| `src/hooks/` | **17** | Hooks de UI para viewport, temas, áudio, geolocalização e debounce | Apenas orquestração reativa de estado local |
| `src/registries/` | **6** | Registros de ferramentas, temas e componentes | Catálogo centralizado de capacidades |
| `.agents/` | **266** | Agentes especializados, 44 skills, regras e fluxos de trabalho | Constituição operacional de engenharia autônoma |
| `supabase/migrations/` | **50+** | Migrações DDL transacionais da base de dados PostgreSQL | Fonte de verdade da evolução do schema de produção |
| `scripts/` | **45+** | Scripts de auditoria, benchmarks, design lint e automação | Utilitários operacionais e catracas de CI |

---

## 2. Entrypoints e Configurações

| Entrypoint | Arquivo | Responsabilidade |
| :--- | :--- | :--- |
| **Client Entry** | `src/main.tsx` | Hidratação React 19, montagem do router e providers de query |
| **Router Tree** | `src/routeTree.gen.ts` | Árvore estática gerada pelo TanStack Router Plugin |
| **Root Route** | `src/routes/__root.tsx` | Layout mestre, tema, toasts (Sonner), telemetria e barra global |
| **Vite Config** | `vite.config.ts` | Plugins TanStack Router, Tailwind CSS v4, paths `@/*` |
| **App Config** | `app.config.ts` | Configurações TanStack Start / Nitro SSR runtime |
| **Worker Wrapper**| `scripts/wrap-worker.js` | Empacotamento do worker Nitro para deploy na Cloudflare |
| **Database Client**| `src/lib/supabase.ts` | Fábrica de clientes `getServerClient`, `getAnonServerClient`, `getBrowserClient` |

---

## 3. Catálogo de Verticais de Negócio e Rotas Públicas

O Waesy opera como um ecossistema integrado para cidades e comunidades, cobrindo 8 pilares estruturais:

1. **Comércio & Marketplace:** `_store.marketplace.*`, `_store.loja.$slug`, `_store.produto.$slug`, `_store.carrinho`, `_store.checkout`, `_store.ofertas`, `_store.classificados.*`.
2. **Nichos Especializados:** `_store.acougue`, `_store.bebidas`, `_store.beleza`, `_store.casa`, `_store.construcao`, `_store.eletronicos`, `_store.farmacia`, `_store.gastronomia`, `_store.imoveis`, `_store.limpeza`, `_store.livros`, `_store.mercado`, `_store.moda`, `_store.pet`, `_store.servicos`, `_store.turismo.*`.
3. **Módulo Cívico & Jornalismo:** `_store.noticias.*`, `_store.concursos.*`, `_store.doacoes`.
4. **Trabalho & Vagas:** `_store.empregos.*`, `_store.conta.curriculo`, `_store.conta.candidaturas`.
5. **Agenda Urbana & Cultura:** `_store.eventos`, `_store.evento.$id`, `_store.agenda`, `_store.conta.ingressos`.
6. **Diretório Comercial & Lugares:** `_store.diretorio.*`, `_store.places.*`, `_store.mapa`.
7. **Mobilidade, Logística & Delivery:** `_store.mobilidade`, `_store.motorista.$slug`, `_store.entregador.cadastro`, `_store.entrega.$token`, `_store.garcom`.
8. **Agente & Copilot Autônomo:** `_store.copilot.tsx`, `api.mcp.v1.tools.call.ts`, `api.webmcp.json.ts`.

---

## 4. Camada de Agentes, Copilot e IA

- **Gateway de Modelos:** `src/services/ai-core-gateway.functions.ts` e `src/services/ai-pool.ts` (gerenciamento unificado de chaves, fallbacks e orquestração).
- **Provedores Suportados:** OpenRouter, Groq, Firecrawl, SteelDev, Supabase Vectors.
- **Orquestrador de Copilot:** `src/services/autonomous-copilot-orchestrator.ts` (máquina de estados com telemetria, streaming e execução de ferramentas).
- **Protocolo MCP:** `src/routes/api.mcp.v1.tools.call.ts` (exposição de ferramentas internas para chamadas por agentes e modelos de linguagem).
- **Squads Especializados:** `editorial-squad.ts` (curadoria e formatação jornalística móvel de notícias).

---

## 5. Engines de Mineração e Extração (`src/services/mining/`)

| Engine | Arquivo | Responsabilidade | Zero Mocks |
| :--- | :--- | :--- | :---: |
| **Batch Engine** | `crawler-batch-engine.ts` | Processamento assíncrono puro da `crawl_queue` (8 verticais) | Validado |
| **Lugares & OSM** | `places-harvester.ts` | Extração de estabelecimentos via Overpass API com Bounding Box | Validado |
| **Licitações PNCP** | `pncp-harvester.ts` / `pncp-extractor.ts` | Extração de editais e compras públicas do Governo Federal com itens | Validado |
| **Vagas de Emprego** | `job-opportunity-extractor.ts` | Extração de vagas via Schema.org JobPosting e heurística de contratação | Validado |
| **Imobiliárias** | `real-estate-harvester.ts` | Extração e cadastro de imobiliárias e corretores locais | Validado |
| **Leiloeiros** | `auction-harvester.ts` | Extração de leiloeiros oficiais e casas de leilão judicial | Validado |
| **Agenda & Eventos** | `event-harvester.ts` | Extração de eventos Schema.org e publicação canônica | Validado |
| **Notícias Regionais**| `mechanical-extractor.ts` + `editorial-squad.ts` | Extração mecânica sem IA + curadoria editorial estruturada | Validado |
| **Indicadores BCB** | `economic-indicators-persister.ts` | Cotações do Dólar, Euro, Selic e IPCA via OData oficial | Validado |
| **Cross-Enricher** | `places-cnpj-cross-enricher.ts` | Cruzamento de nós do OpenStreetMap com dados da Receita Federal (BrasilAPI) | Validado |
| **Deduplicador** | `semantic-deduplicator.ts` | Tokenização e similaridade Jaccard em n-gramas com janela de 48h | Validado |

---

## 6. Módulos Abandonados ou Descontinuados Identificados

- `src/services/ai-manus-orchestrator.ts`: Código legado anterior substituído pelo `autonomous-copilot-orchestrator.ts` (já removido da árvore ativa).
- `src/services/manus-and-harvest.test.ts`: Suíte de testes legada do orquestrador descontinuado (substituída por `autonomous-copilot.test.ts` e `industrial-crawlers.test.ts`).
- `_legacyProcessCrawlQueueBatchInternal` em `src/services/mining.functions.ts`: Removido na Onda 00, substituído por `executeCrawlQueueBatchDirect`.
