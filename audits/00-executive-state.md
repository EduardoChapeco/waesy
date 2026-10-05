# Onda 00 — Preparação, Limites e Estado Executivo do Sistema All-in-One

## 1. Identificação do Projeto e Contexto Inicial

```yaml
project_name: "Waesy (usewaesy)"
project_root: "C:\\Users\\Eduardo Antônio Ramo\\Documents\\waesy"
backend_stack: "TanStack Start (React 19 SSR) + Nitro Engine v3 (Cloudflare Worker wrapper) + Server Functions (createServerFn) + Zod v3.24.2"
frontend_stack: "React 19.2.0 + TanStack Router v1.170 + TanStack Query v5.101 + Tailwind CSS v4 + Radix UI + Lucide/Phosphor Icons + Framer Motion v13.4"
database: "Supabase PostgreSQL (Postgres 15/16, Project ID: jfuebqmltksyznovhlwa) com RLS, PostGIS/Overpass, pg_cron, pg_net e pg_graphql"
queue_system: "crawl_queue (PostgreSQL polimórfico com priority, retry_count, state lock) + pg_cron jobs + API Cron Worker (/api/cron/mining-worker)"
storage: "Supabase Storage (Buckets: media, news, products, avatars, assets, documents)"
deployment: "Cloudflare Pages & Workers via Nitro Worker Bundle (scripts/wrap-worker.js + Wrangler v3)"
main_branch: "main"
active_commit: "3792ef29681a79cbcc26e25b70a6c868004e6167"
allowed_environments: ["development", "staging"]
production_changes: "SOMENTE COM APROVACAO EXPLICITA"

existing_ai_providers:
  - name: "OpenRouter"
    type: "LLM Pool (Mistral, Llama, Claude, DeepSeek)"
  - name: "Groq"
    type: "Low-latency inference"
  - name: "Firecrawl"
    type: "Web scraping & Markdown extraction"
  - name: "SteelDev"
    type: "Headless browser automation"
  - name: "Supabase pgvector"
    type: "Embeddings & semantic search"

existing_integrations:
  - "BrasilAPI (CNPJ, CEP, Bancos, DDD)"
  - "ReceitaWS / Minha Receita (Fallback de enriquecimento cadastral)"
  - "PNCP — Portal Nacional de Contratações Públicas (Licitações & compras municipais)"
  - "Banco Central do Brasil — SGS & Olinda OData (Dólar, Euro, Selic, IPCA)"
  - "OpenStreetMap / Overpass API (Comércio e geolocalização urbana)"
  - "DataJud / CNJ (Metadados processuais e tribunais — TRF4, TJSC)"
  - "Mercado Pago & PIX (Pagamentos transacionais)"
  - "WhatsApp Webhook / Direct Contact"
  - "Cloudflare CDN & Edge Caching"

existing_skills:
  - "44 skills ativas em .agents/skills/ (design-ops, component-api, recursive-audit, supabase, security-guard, etc.)"

existing_agents:
  - "8 subagentes em .agents/agents/ (a11y-guardian, component-craftsman, content-editor, design-system-architect, flow-architect, platform-splitter, spec-writer, visual-auditor) + Autonomous Copilot"

existing_crawlers:
  - "8 verticais industriais em src/services/mining/ (places, pncp, jobs, real_estate, auctions, events, news, economic_indicators)"

existing_editors:
  - "Rich Text (ProseMirror/Tiptap/Lexical), Canvas Post Builder (html2canvas, fabric/konva), HTML Landing Page Builder"

existing_converters:
  - "html2canvas v1.4.1, jspdf v4.2.1, sharp/canvas adapters"

existing_data_modules:
  - "news_articles, jobs, events, directory_listings, mined_tenders, economic_indicators, stores, products, orders, cart, profiles, banners, coupons"

hard_constraints:
  - "não quebrar o chat existente"
  - "não duplicar tabelas, serviços, skills ou engines sem justificativa"
  - "não alterar produção automaticamente"
  - "não apagar dados"
  - "não expor segredos"
  - "não mudar contratos públicos sem compatibilidade"
```

---

## 2. Status do Ambiente e Limites de Operação

- **Diretório Ativo:** `C:\Users\Eduardo Antônio Ramo\Documents\waesy`
- **Branch Ativo:** `main` (rastreado, commit `3792ef29681a79cbcc26e25b70a6c868004e6167`)
- **Modo de Trabalho:** Estritamente `DISCOVERY` e `ANALYSIS` nesta fase. Nenhuma alteração destrutiva em banco ou produção.
- **Backups e CI:** Migrações versionadas em `supabase/migrations/` (50+ migrações ativas). Baseline de design-lint congelada. Suíte Vitest ativa com 20+ testes unitários e de integração verdes.
- **Áreas Intocáveis:** `node_modules/`, `dist/`, `.git/`, credenciais e dados em repouso dos clientes.

---

## 3. Resumo de Evidências Coletadas

| Recurso | Estado Observado | Evidência |
| :--- | :--- | :--- |
| **Git Working Tree** | Modificações ativas de refinamento de crawlers e filtros urbanos | `git status -s` (28 arquivos rastreados, 20 não rastreados) |
| **Banco Supabase** | Conectado com sucesso ao projeto `jfuebqmltksyznovhlwa` | Consultas SQL via MCP comprovando 49 artigos publicados, 25 listings ativos, 7.316 itens em fila |
| **Catálogo de Skills** | 44 skills completas registradas em `.agents/skills/` | Leitura de diretórios em `.agents/skills/` |
| **Subagentes** | 8 subagentes especializados operacionais | Arquivos `.agents/agents/*.md` |
| **Motores de Mineração** | 8 verticais industriais operando em `src/services/mining/` | Bateria de testes `vitest run src/services/mining/` com 12/12 testes verdes |
| **Design Lint** | Monitorado e dentro da baseline (catraca ativa) | `node scripts/design-lint.mjs --changed` executado com código 0 |
