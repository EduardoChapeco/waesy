# Onda 05 — Auditoria de APIs e Contratos

## 1. Arquitetura da Camada de APIs

O sistema utiliza o padrão **BFF Tipado com Server Functions do TanStack Start (`createServerFn`)** complementado por rotas de borda REST/Webhook sob `src/routes/api.*.ts`.

| Tipo de Endpoint | Mecanismo | Validação | Autenticação / Governança |
| :--- | :--- | :--- | :--- |
| **Server Functions (BFF)** | `createServerFn({ method })` | Zod Schemas (`.validator(schema)`) | `getServerIdentity()`, `assertStoreAccess()` |
| **Edge REST / Webhooks** | `createFileRoute("/api/...")` | JSON Schema / Zod | Bearer Token, Webhook Secret, HMAC |
| **AI Tool Protocol (MCP)** | `/api/mcp/v1/tools/call` | Model Context Protocol v1 | Token de autorização, Rate Limit por Tenant |
| **Cron Agendado** | `/api/cron/mining-worker` | Query/Header Secret | Verificação de chave interna do pg_cron |

---

## 2. Catálogo de Endpoints de Borda (`src/routes/api.*.ts`)

| Rota | Método | Finalidade | Efeitos Colaterais / Idempotência |
| :--- | :---: | :--- | :--- |
| `/api/mcp/v1/tools/call` | `POST` | Execução de ferramentas canônicas por agentes | Idempotente com chave; executa queries e ações |
| `/api/webmcp.json` | `GET` | Manifesto de capacidades MCP para descoberta web | Somente leitura (JSON canônico de ferramentas) |
| `/api/cron/mining-worker` | `POST` | Acionamento autônomo do lote de mineração | Idempotente por lote via `crawl_queue` locks |
| `/api/mining/worker` | `POST` | Worker de extração profunda de URLs pendentes | Atualiza status para `completed` / `failed` |
| `/api/webhooks/pix` | `POST` | Confirmação de recebimento instantâneo de pagamentos | Transacional com reconciliação no ledger |
| `/api/webhooks/whatsapp` | `POST` | Ingestão de mensagens de atendimento e cotações | Enfileiramento de sessão de atendimento |
| `/api/webhooks/shipment` | `POST` | Atualização de tracking e comprovantes de entrega | Transição de status do pedido para entregue |
| `/api/openapi.json` | `GET` | Especificação OpenAPI 3.0 para documentação | Somente leitura |

---

## 3. Principais Contratos de Server Functions

### 3.1. Notícias & Jornalismo (`src/services/news.functions.ts`)
- `listPublicArticles`: `{ category?, storeId?, limit, query?, city? }` -> `Promise<NewsArticleDTO[]>`
- `getArticleDetail`: `{ slug, storeSlug? }` -> `Promise<NewsArticleDetailDTO>`
- `createArticleFn`: `{ storeId, title, content_sections, cover_media_url, ... }` -> `Promise<NewsArticleDTO>`

### 3.2. Vagas de Trabalho (`src/services/jobs.functions.ts`)
- `listPublicJobs`: `{ category?, search?, contract_type?, city?, limit? }` -> `Promise<JobItemDTO[]>`
- `getJobById`: `{ jobId }` -> `Promise<JobDetailDTO>`

### 3.3. Agenda & Eventos (`src/services/events.functions.ts`)
- `getPublicEvents`: `{ limit?, category?, city?, state?, dateFrom?, dateTo? }` -> `Promise<EventDTO[]>`
- `submitEventRsvp`: `{ eventId, status: 'going' | 'interested' | 'not_going' }` -> `Promise<RsvpResultDTO>`

### 3.4. Diretório & Comércio Local (`src/services/directory.functions.ts`)
- `getPublicDirectory`: `{ limit?, category?, search?, city? }` -> `Promise<DirectoryListingDTO[]>`
- `getPublicDirectoryById`: `{ id }` -> `Promise<DirectoryListingDTO>`

### 3.5. Lote de Mineração (`src/services/mining.functions.ts` & `crawler-batch-engine.ts`)
- `executeCrawlQueueBatchDirect`: `{ batchSize?, limit?, storeId? }` -> `Promise<CrawlBatchResult>` (Puro, desacoplado de HTTP).
