# Waesy — Crawler Evolution Blueprint

**Versão:** 1.0  
**Data:** 2026-10-06  
**Escopo:** evolução dos mineradores, da frontier e dos agentes de browser do Waesy.  
**Base:** `crawler-research-01` a `crawler-research-15`, inventário e auditorias gerais em `/home/ubuntu/waesy-audit/audits/`.

> **Decisão executiva:** o Waesy não deve trocar sua especialização brasileira, Supabase/RLS, APIs oficiais, extratores mecânicos, Integrity Gate e deduplicação semântica por um crawler genérico. Deve adicionar uma camada de execução comparável às melhores práticas open source: claim/lease distribuído, frontier explícita, politeness por origem, cascata HTTP → browser, contratos versionados, evidência bruta, reprocessamento determinístico, observabilidade OTel e um agente ReAct/Copilot limitado por ferramentas e evidências.

## 1. Como ler este documento

As afirmações estão marcadas para não confundir código auditado com proposta:

- **[COMPROVADO]** — observado no código/documentação do snapshot auditado ou no código Waesy lido; pode depender de versão, configuração, Cloud versus self-host ou caminho de execução.
- **[RECOMENDAÇÃO]** — desenho novo para o Waesy, ainda não uma capacidade existente.
- **[CRITÉRIO]** — condição verificável para aceitar a implementação.

Os projetos comparados não são equivalentes. Scrapy/Crawlee/Crawl4AI/Scrapling são motores de crawling; Playwright/Puppeteer/Selenium são runtimes de browser; Firecrawl é uma plataforma de scrape/crawl com diferenças entre Cloud e self-host; Heritrix é principalmente arquivístico; StormCrawler é uma topologia distribuída; Agent-Reach é um control plane de canais; ScrapeGraphAI é um executor de grafos/LLM. Nenhum deve ser descrito como possuindo todas as capacidades dos demais.

## 2. Resposta direta: o que fazer para chegar ao melhor do open source

### 2.1 Ordem correta de investimento

1. **Corrigir a fila antes de adicionar browsers.** O fluxo auditado de `crawler-batch-engine.ts` seleciona `pending`, marca `processing` em operação posterior e processa em série. Não há prova de claim atômico, lease ou reaper. Isso é um risco de duplicidade e perda de trabalho, não uma otimização futura.
2. **Criar um FetchGateway único.** Toda chamada — API oficial, RSS, HTML, Firecrawl, Playwright ou outro provider — deve passar pela mesma `AccessPolicy`, robots, limite por origem, timeout, Retry-After, backoff, cooldown, circuit breaker e auditoria.
3. **Separar discovery, aquisição, rendering, extração, qualidade e publicação.** O browser nunca deve decidir sozinho quais URLs entram na frontier nem publicar uma entidade.
4. **Adotar HTTP-first/browser-when-needed.** Fetch estático, APIs, RSS, sitemap e JSON-LD são a primeira tentativa. Playwright é uma segunda etapa para JavaScript, hidratação, scroll, iframes ou interação pública autorizada. Browser indiscriminado aumenta custo, latência, superfície de SSRF e risco de bloqueio.
5. **Preservar o domínio Waesy.** JSON-LD, Schema.org, PNCP, DataJud, OSM/Overpass, BCB, seletores por fonte, validação de datas/preços/CNPJ, Integrity Gate, Jaccard e curadoria continuam sendo a fonte de qualidade. Frameworks genéricos não fornecem qualidade editorial.
6. **Fazer cada resultado explicável e reprocessável.** Guardar `run_id`, `attempt_id`, URL final, status, provider, método, versão do parser/policy, hashes, evidências e motivo de descarte. O mesmo raw pode ser reextraído após uma melhoria sem novo fetch.
7. **Usar ReAct/Copilot para decisão controlada, não para inventar dados.** O agente escolhe ferramentas e rotas dentro de uma allowlist, observa resultados estruturados, pede aprovação quando necessário e só afirma o que tem `EvidenceObject` verificável.
8. **Adotar zero mocks em produção.** Falha, bloqueio, conteúdo vazio ou screenshot sem DOM são estados honestos. Não usar HTML sintético, datas default, venue inventado, preço presumido ou fallback que pareça sucesso.

### 2.2 Stack recomendada

| Camada | Escolha recomendada | Motivo | O que não assumir |
|---|---|---|---|
| Controle e system of record | TypeScript atual + Supabase/Postgres/RLS + RPC SQL | Preserva o investimento Waesy e permite claim/lease, constraints, upsert e auditoria | `crawl_queue` auditada ainda não prova `SKIP LOCKED`; implementar e testar |
| Worker HTTP/discovery | **Crawlee em TypeScript** como primeira opção de runtime; adaptar `IRequestLoader`/`RequestManager` ao Supabase | Request model, labels, `uniqueKey`, throttling, backpressure, sessions e OTel encaixam no stack atual | FileSystemStorage ou RequestQueue local não substituem Postgres distribuído |
| Alternativas de referência | Padrões de Scrapy, Crawl4AI e Scrapling; sidecar Python somente se houver caso medido | Aproveita scheduler, rate limit, adaptive parser, seeder e cache | Não operar quatro frameworks em paralelo sem ownership e benchmark |
| Browser | **Playwright direto** em render workers isolados | DOM real, contextos isolados, rede, trace e boa cobertura de JS | Playwright Test não é frontier nem fila de URLs |
| Browser remoto | Selenium Grid apenas se o volume/isolamento exigir pool remoto real | Matching de capabilities, slots, health e draining | Grid limita sessões, não substitui politeness por domínio |
| Puppeteer | Adapter compatível opcional, não segundo scheduler | Bom CDP/runtime quando Playwright não cobre uma necessidade | Não tem fila, robots, extração ou retry HTTP |
| Provider externo | Firecrawl via adapter v2 validado, com limites por tenant e status assíncrono | Crawl/map/extract, cascata de engines, SSRF/threat policy e jobs duráveis são boas referências | Cloud, self-host, Fire Engine, Browser, Agent, screenshots e anti-bot não são a mesma oferta |
| Steel | Opcional, somente com contrato que devolva DOM/HTML real ou como artefato visual explícito | Pode complementar rendering autorizado | O caminho auditado devolve screenshot e HTML placeholder; isso **não** é extração textual |
| LLM/agente | `autonomous-copilot-orchestrator.ts` + MCP/tool contracts + ReAct limitado | Já há orquestrador, streaming, telemetria, pool de modelos e MCP | LLM não substitui parser determinístico, retry, dedupe ou autorização |
| Fila adicional | Postgres primeiro; Redis apenas para locks/cooldowns/cache transitórios quando medir necessidade | Evita duplicar a fonte de verdade | Não adicionar Kafka, Storm, Temporal, Graphile Worker ou Redis por reflexo |
| Observabilidade | W3C TraceContext + OpenTelemetry + métricas/alertas + `scraper_audit_log` | Correlação de tentativa, provider, browser e persistência | Logs isolados não demonstram saúde do sistema |

**Decisão de escopo:** começar com **Crawlee + Playwright + Supabase**, usando Firecrawl como provider opcional. Scrapy, Crawl4AI, Scrapling, Selenium, Puppeteer, Colly, StormCrawler e Heritrix fornecem padrões e podem ser usados em workers específicos somente com um benchmark/owner explícito.

## 3. O que já é fato sobre o Waesy e o que falta

### 3.1 Capacidades comprovadas e que devem ser preservadas

- **[COMPROVADO]** O Waesy possui oito verticais e extratores especializados: notícias, vagas, lugares, PNCP, imóveis, leilões, eventos e indicadores.
- **[COMPROVADO]** Há APIs/fontes oficiais para PNCP, DataJud, BCB e OSM/Overpass; essas rotas devem continuar preferenciais sobre scraping genérico.
- **[COMPROVADO]** `mechanical-extractor.ts` usa JSON-LD, OpenGraph/meta, seletores e densidade textual; `integrity-gate.ts` rejeita títulos genéricos, corpos curtos, repetição, challenge e conteúdo contaminado.
- **[COMPROVADO]** `semantic-deduplicator.ts` usa tokens/Jaccard e janela temporal; outras verticais usam identificadores de negócio e upsert.
- **[COMPROVADO]** `scraper-utils.ts` tem timeout, retry de 408/429/5xx, `Retry-After`, backoff e cooldown; existe circuit breaker e `domain_cooldowns` persistido.
- **[COMPROVADO]** Há `crawl_queue`, `mined_raw_extractions`, entidades canônicas e `scraper_audit_log`, além de RLS e storage Supabase.
- **[COMPROVADO]** Existe `autonomous-copilot-orchestrator.ts`, gateway/pool de modelos, MCP e `editorial-squad.ts`; a arquitetura alvo já define `CanonicalToolContract`, `EvidenceObject` e `DurableWorkflowContract`.

### 3.2 Gaps comprovados pela auditoria

- **[COMPROVADO]** No batch engine auditado, seleção e atualização são separadas; o loop é sequencial. Não foi demonstrado `FOR UPDATE SKIP LOCKED`, lease, heartbeat, condição de owner ou requeue persistente.
- **[COMPROVADO]** Há divergência de nomenclatura entre `retry_count/max_retries` e `attempts/max_attempts`; confirmar o schema de produção antes de migrar.
- **[COMPROVADO]** Retry HTTP de `fetchWithRetry` não é retry transacional da fila.
- **[COMPROVADO]** Não há uma política global comprovada que alcance todas as verticais, todos os providers e todos os workers com robots, token bucket, cooldown e Retry-After.
- **[COMPROVADO]** O fallback Steel observado pode retornar screenshot URL e HTML placeholder. Deve ser `screenshot_only`/`extraction_unavailable`, nunca `html` publicável.
- **[COMPROVADO]** O fallback de evento com data/venue/gratuidade sintéticos contradiz a invariante de zero mocks; ausência deve ser `unknown`, `needs_review` ou falha honesta.
- **[COMPROVADO]** Provider, Cloud/self-host, defaults e capabilities dos projetos estudados variam por versão/configuração; os snapshots não são promessas de comportamento atual universal.

## 4. Arquitetura-alvo em camadas

```text
┌───────────────────────────────────────────────────────────────────────┐
│  Interface / API / pg_cron / MCP / Copilot                           │
│  intenção → policy → plano durável → aprovação quando necessário     │
└───────────────────────────────┬───────────────────────────────────────┘
                                │ run_id / idempotency_key / traceparent
┌───────────────────────────────▼───────────────────────────────────────┐
│  Control Plane de Runs e Frontier (Supabase/Postgres/RLS)             │
│  source_registry · crawl_runs · crawl_queue · discovery · leases     │
│  domain_policy/cooldowns · attempts · DLQ · publish/outbox            │
└───────────────────────────────┬───────────────────────────────────────┘
                                │ claim FOR UPDATE SKIP LOCKED
┌───────────────────────────────▼───────────────────────────────────────┐
│  Orchestrator / Scheduler                                             │
│  prioridade + fairness + budget global + token bucket por origem      │
│  robots/ToS decision · circuit breaker · retry matrix · reaper         │
└───────────────────────────────┬───────────────────────────────────────┘
                                │ FetchTask
┌───────────────┬───────────────▼──────────────┬────────────────────────┐
│ API/RSS/Sitemap│ HTTP worker (Crawlee/native)│ Browser render worker  │
│ PNCP/DataJud   │ fetch/headers/cache/links   │ Playwright; Selenium   │
│ OSM/BCB        │                              │ remoto somente se útil  │
└──────┬────────┴───────────────┬──────────────┴─────────────┬──────────┘
       │                        │                            │
       └────────────────────────▼────────────────────────────▼──────────┐
                                FetchGateway                              │
                 AccessPolicy · SSRF guard · redirects · artifacts         │
┌─────────────────────────────────────────────────────────────────────────▼┐
│ Parse / Extract                                                        │
│ JSON-LD/OG/meta → schemas verticais → Readability/CSS/XPath → LLM     │
│ LLM somente seletivo, schema fechado, evidência por campo             │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ ExtractionResult
┌─────────────────────────────────▼───────────────────────────────────────┐
│ Integrity / Quality / Dedup                                            │
│ content hash · validade · score · challenge gate · entity key          │
│ URL dedupe + body dedupe + semantic Jaccard + conflitos                │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │ ValidatedItem
┌───────────────────────────────┬─▼───────────────────────────────────────┐
│ Raw/evidence object storage  │ Postgres canônico / outbox               │
│ HTML/JSON/DOM/trace amostrado│ raw extraction · entity versions        │
│ checksum + TTL + signed URL  │ upsert idempotente · editorial publish  │
└───────────────────────────────┴─────────────────────────────────────────┘
                                  │
                    OTel traces · metrics · audit · replay
```

### 4.1 Princípios de fronteira

- **[RECOMENDAÇÃO]** `crawl_queue` é a autoridade sobre trabalho de URL; nenhum framework local pode concluir um item sem ack condicionado a `lease_id`/owner.
- **[RECOMENDAÇÃO]** `FetchGateway` é o único ponto permitido para rede. Providers não devem fazer `fetch` direto fora da política.
- **[RECOMENDAÇÃO]** Browser recebe um `FetchTask` já autorizado e com orçamento; não escolhe livremente links externos.
- **[RECOMENDAÇÃO]** Parser recebe `FetchDocument` real ou fixture derivada de captura real. `screenshot_only` não implementa `html` por coerção.
- **[RECOMENDAÇÃO]** Publicação é outbox/idempotente e separada de captura; falha de editorial não perde a evidência de aquisição.

## 5. Orquestração e integração dos componentes

### 5.1 Crawler orchestration

**Adotar [RECOMENDAÇÃO]:** um `CrawlerOrchestrator` que coordene quatro loops independentes:

1. `discover`: seeds de API/RSS/sitemap/HTML permitido entram como `crawl_discoveries` e são convertidos em requests canônicas.
2. `claim`: workers reclamam itens aptos pelo domínio, prioridade, budget, `next_attempt_at` e policy.
3. `execute`: FetchGateway executa native/API, Firecrawl ou browser conforme `render_policy`.
4. `complete`: persiste tentativa, deriva resultado, atualiza frontier/outbox e faz ack somente se o lease ainda pertence ao worker.

**Padrões comprovados a reutilizar:**

- Scrapy: separação Engine/Scheduler/Downloader/Pipeline, prioridade, slots e signals.
- Crawlee: `Request` tipado, `uniqueKey`, `RequestManager`, throttling por domínio, concurrency system, sessions e OTel.
- Crawl4AI: produtor/consumidor bounded, backpressure, seeding de sitemap, BFS/DFS/Best-First e `CrawlResult` rico.
- Heritrix/StormCrawler: estados `ready`, `snoozed`, `retry_wait`, `blocked`, `retired`, discovery path e frontier por host.
- Firecrawl: grupos de crawl, locks/leases, finalização idempotente, DLQ e cascata de engines.

**Não copiar sem adaptação:** filas locais/JOBDIR/SQLite, que não oferecem claim multi-worker; defaults de robots desligados; stealth/proxy como suposto bypass; storage de negócio de cada projeto.

### 5.2 Browser agents: Playwright, Puppeteer e Selenium

**Playwright direto — recomendado [RECOMENDAÇÃO]:**

- browser residente por worker; `BrowserContext` novo por tentativa;
- `page.goto` com deadline, status explícito, redirects e `finalUrl`;
- readiness por seletor, response JSON autorizada, quantidade mínima de texto ou condição específica; evitar `sleep` cego;
- listeners de request/response/failure/console/pageerror;
- `page.content()` e responses JSON como evidência para os extractors Waesy;
- trace/HAR/screenshot/DOM em primeiro retry, bloqueio, erro de integridade ou amostra, com redaction;
- fechamento de page/context em `finally`; reciclagem do browser em crash, heap excessivo ou contaminação;
- interceptação mínima e registrada, somente para recursos dispensáveis em fonte autorizada.

**Puppeteer — referência/adapter [RECOMENDAÇÃO]:** útil para CDP, métricas de page, tracing e compatibilidade com Chrome, mas não deve introduzir uma fila paralela. A aplicação ainda fornece frontier, retries, robots e policy.

**Selenium Grid — evolução condicional [RECOMENDAÇÃO]:** adotar somente quando métricas justificarem browser remoto, múltiplos tipos de capabilities, isolamento por Node ou escala horizontal. Reutilizar o padrão de slots/capabilities, health, draining, deadlines e compensação de sessão tardia; manter `crawl_queue` fora do Grid.

**Limite legal comum:** nenhum browser agent recebe autorização para CAPTCHA solver, bypass de Cloudflare/WAF, paywall, login não fornecido, fingerprint spoofing para furar bloqueio ou rotação de proxy para esconder abuso. O estado correto é `blocked_by_challenge`, `blocked_by_auth`, `blocked_by_policy` ou `needs_review`.

### 5.3 Firecrawl e Steel

**Firecrawl:**

- **[COMPROVADO]** A arquitetura auditada separa API, grupos, filas NuQ/Postgres, filas auxiliares Redis/RabbitMQ, frontier, robots, engines, transformadores, extraction, finalização e OTel.
- **[RECOMENDAÇÃO]** Criar `FirecrawlProviderV2` com contrato assíncrono de `start`, `status`, `results`/webhook, timeout, idempotency key e status explícito. Usar `/map` para descoberta barata e `/crawl` somente com escopo/depth/limit definidos; usar `/scrape` para página unitária.
- **[RECOMENDAÇÃO]** Tratar Cloud, self-host e versão como capabilities descobertas em runtime: `supports.browser`, `supports.screenshot`, `supports.actions`, `supports.extract`, `supports.crawl`, `supports.ssrf_guard`. Não prometer recursos não confirmados.
- **[RECOMENDAÇÃO]** Submeter resultado ao mesmo Integrity Gate e dedupe; Firecrawl nunca publica diretamente.
- **[RECOMENDAÇÃO]** Definir teto de custo/latência e fallback para native/Playwright; não encadear retries em todas as engines sem orçamento.

**Steel:**

- **[COMPROVADO]** No caminho Waesy auditado, Steel pode retornar screenshot URL e HTML sintético.
- **[RECOMENDAÇÃO]** Se não houver `html`, `dom`, `markdown` ou `content_type` factual, persistir `content_kind = screenshot`, `extraction_status = unavailable`; permitir OCR somente como operação explícita, versionada e com revisão.
- **[CRITÉRIO]** É proibido converter screenshot URL em `<html>` placeholder para passar em extractor ou marcar `success`.
- **[RECOMENDAÇÃO]** Promover Steel apenas após teste de contrato contra URLs autorizadas que comprove DOM/HTML real, status, URL final, redirects, checksum e encerramento de sessão.

### 5.4 ReAct e Copilot

O ReAct deve ser um **controlador de decisão**, não o scraper e não a fonte dos fatos.

**Loop recomendado [RECOMENDAÇÃO]:**

```text
INTENT → PLAN bounded → ACT(tool) → OBSERVE(result/evidence) →
CHECK(policy/quality) → ACT(next tool or stop) → ANSWER with citations
```

**Ferramentas MCP/CanonicalToolContract sugeridas:**

- `source.describe(source_id, url)` — classifica API/feed/HTML/browser, capability e policy;
- `crawl.plan(seed, scope, budget)` — cria run e frontier, sem executar acesso externo irreversível;
- `crawl.status(run_id)` — somente leitura;
- `crawl.pause/resume/replay(run_id, selector)` — exige idempotency key e autorização;
- `fetch.preview(request_id)` — retorna status, headers redigidos, checksum e amostra;
- `extract.run(document_id, schema_version)` — determinístico primeiro;
- `quality.explain(result_id)` — motivos de aceitação/rejeição;
- `dedupe.explain(entity_id)` — evidência de cluster/conflito;
- `artifact.get(artifact_id)` — signed URL com TTL e redaction;
- `publish.draft(result_id)` — Nível 1, reversível;
- `publish.commit(result_id)` — Nível 2, somente com aprovação humana quando externo/irreversível.

**Guardrails:**

- máximo de passos, tokens, custo e tempo por run;
- tool allowlist por agente e por tenant;
- schema de entrada/saída validado por Zod;
- `EvidenceObject` obrigatório para cada afirmação factual;
- conteúdo HTML/Markdown delimitado como **dados não confiáveis**, nunca instrução de sistema;
- `null`/`unknown` permitidos; o modelo não pode preencher lacunas;
- stop em robots disallow, SSRF, challenge, auth, paywall, orçamento excedido ou ausência de evidência;
- `WAITING_APPROVAL` para publicação, credencial, acesso externo sensível ou mudança de policy;
- cada passo e decisão persistidos em `agent_runs`/`agent_steps`, com trace e tool version.

**Integração com Copilot existente:** adaptar `autonomous-copilot-orchestrator.ts` para delegar mineração por tool contract, observar `CrawlResult`/`ExtractionResult`, aguardar eventos duráveis e produzir resposta com URLs, timestamps, status e confiança. O Copilot não deve chamar providers diretamente nem assumir que `html` implica conteúdo válido.

## 6. Contratos de dados e tabelas

### 6.1 Envelope de request

```ts
interface CrawlRequest {
  id: string;
  run_id: string;
  source_id: string;
  vertical: Vertical;
  url: string;
  canonical_url: string;
  request_fingerprint: string; // URL + method + body + vertical + parser/policy version
  method: "GET" | "POST" | "HEAD";
  payload_ref?: string;        // nunca segredo inline
  parent_request_id?: string;
  discovered_via: "seed" | "api" | "rss" | "atom" | "sitemap" | "html" | "browser_xhr";
  depth: number;
  priority: number;
  render_policy: "never" | "on_fetch_failure" | "when_js_signal" | "required";
  parser_version: string;
  policy_version: string;
  attempt_count: number;
  max_attempts: number;
  next_attempt_at: string;
  lease_id?: string;
  lease_owner?: string;
  lease_until?: string;
}
```

### 6.2 Envelope de captura

```ts
interface FetchDocument {
  request_id: string;
  attempt_id: string;
  requested_url: string;
  final_url?: string;
  redirect_chain: string[];
  status?: number;
  headers: Record<string, string>; // allowlist, sem segredos
  content_type?: string;
  content_kind: "html" | "json" | "xml" | "pdf" | "image" | "dom" | "markdown" | "screenshot" | "empty";
  body_ref?: string;                 // bucket privado/content-addressed
  body_sha256?: string;
  bytes?: number;
  provider: "native_fetch" | "crawlee" | "firecrawl" | "playwright" | "puppeteer" | "selenium" | "steel";
  render_mode: "static" | "browser" | "remote_browser" | "visual_only";
  robots_decision: "allowed" | "disallowed" | "unknown" | "not_applicable";
  policy_decision: "allow" | "deny" | "review";
  timings: Record<string, number>;
}
```

### 6.3 `ExtractionResult` e evidência

```ts
interface ExtractionResult<T> {
  result_id: string;
  attempt_id: string;
  vertical: string;
  schema_version: string;
  extractor_version: string;
  method: "api" | "jsonld" | "opengraph" | "selector" | "readability" | "llm" | "manual_review";
  value: T;
  field_evidence: Array<{
    field: string;
    value: unknown;
    source_url: string;
    selector_or_path?: string;
    excerpt_ref?: string;
    confidence: number;
    status: "supported" | "verified" | "conflicting" | "unknown";
  }>;
  quality_score: number;
  warnings: string[];
  integrity_status: "pass" | "fail" | "needs_review";
  content_hash: string;
}
```

### 6.4 Tabelas mínimas — aditivas e com migration expand/contract

| Tabela | Campos essenciais | Índices/constraints | Finalidade |
|---|---|---|---|
| `crawler_sources` | `source_id`, vertical, domains, allowlist, robots_mode, ua, rate/concurrency, render_policy, owner/legal_basis, policy_version | `source_id` único | Registro de fonte e política |
| `crawl_runs` | `run_id`, source, seed, status, budget, started/finished, config snapshot, trace id | idempotency key única | Unidade de execução/replay |
| `crawl_queue` | URL requisitada/canônica, `request_fingerprint`, parent, depth, priority, status, `next_attempt_at`, lease, attempts, error class | `UNIQUE(source_id, request_fingerprint, parser_version, policy_version)`; partial index de itens aptos | Frontier durável |
| `crawl_discoveries` | parent, child, discovery source, depth, accepted/rejected, reason, timestamp | unique `(run_id, canonical_url, discovered_via)` | Explicabilidade da frontier |
| `crawl_attempts` | queue id, lease id, worker, provider, start/end, status HTTP, final URL, retry class, timings, trace | unique attempt id | Ledger imutável de tentativa |
| `crawl_artifacts` | attempt, kind, sha256, private object key, bytes, MIME, retention, redaction | `UNIQUE(sha256, kind)` opcional | Raw HTML/JSON/DOM/trace/screenshot |
| `domain_policies`/`domain_cooldowns` | host/registrable domain, next_allowed_at, retry-after, circuit state, robots ETag/body hash, reason | unique host/policy version | Politeness compartilhada |
| `mined_raw_extractions` | source URL/hash, schema/extractor version, raw result, quality, evidence | unique por canonical URL + content hash + version | Derivação bruta/reprocessável |
| `entity_versions` | entity id, version, source result, valid_from, supersedes, diff | unique entity/version | Versionamento de negócio |
| `publish_outbox` | event id, entity/version, idempotency, status, attempts, next attempt | unique idempotency | Publicação idempotente |
| `agent_runs`/`agent_steps` | run, parent, state, tool, input/output redigidos, evidence refs, tokens, cost, approval | unique step key | ReAct/Copilot durável |

**Compatibilidade de schema:** adicionar `attempt_count`, `max_attempts`, `next_attempt_at`, `lease_*` e `error_class` primeiro; manter view/trigger temporária para os nomes antigos (`retry_count`, `attempts`) até todos os leitores migrarem. Não apagar coluna antes de confirmar zero consumidores.

### 6.5 Chaves e deduplicação em quatro níveis

1. **Request:** URL canônica + método + body/payload + fonte + vertical + versão de parser/policy.
2. **Conteúdo:** SHA-256 do corpo normalizado, com ETag/Last-Modified quando disponível.
3. **Entidade:** ID da fonte (`pncp_id`, processo, CNPJ, URL externa ou chave composta) e constraints no banco.
4. **Semântica:** Jaccard/cluster de título/corpo, janela temporal e regras por vertical; conflitos vão para revisão, não para sobrescrita cega.

Canonicalização deve preservar diferenças semânticas, remover fragmentos e trackers apenas por allowlist, normalizar host/esquema/porta, tratar slash/encoding e registrar a versão da função. Não usar `select` seguido de `insert` como única proteção: a constraint/upsert/RPC vence a corrida.

## 7. Máquina de estados de job

```text
QUEUED ──claim──> LEASED ──policy──> FETCHING ──JS needed──> RENDERING
  │                   │                  │                     │
  │                   │                  └──error──────────────┘
  │                   │                                         │
  │                   └──lease expired──> RECLAIMED            ▼
  │                                                  EXTRACTING
  │                                                        │
  │                                                        ▼
  │                                                  INTEGRITY_GATE
  │                                             ┌────────┼────────┐
  │                                             │        │        │
  │                                           PASS   REVIEW    FAIL
  │                                             │        │        │
  │                                             ▼        ▼        ▼
  │                                         DEDUPE  NEEDS_REVIEW  terminal/quarantine
  │                                             │
  │                                             ▼
  │                                         PERSISTING
  │                                             │
  │                                             ▼
  │                                         COMPLETED
  │
  └────────────── retryable ──> RETRY_WAIT ──next_attempt_at──> QUEUED

DENIED_ROBOTS / BLOCKED_POLICY / BLOCKED_CHALLENGE / AUTH_REQUIRED → BLOCKED_QUARANTINE
429/503/timeout/DNS transient → RETRY_WAIT (Retry-After e backoff)
401/403/404 semânticos, schema inválido, SSRF, limite de orçamento → FAILED_TERMINAL ou NEEDS_REVIEW
```

**Transições obrigatórias [RECOMENDAÇÃO]:**

- `claim_next(limit, worker_id, lease_duration)` é uma única função SQL com `FOR UPDATE SKIP LOCKED`, filtro `next_attempt_at <= now()`, domínio elegível e update do lease na mesma transação.
- `heartbeat(queue_id, lease_id)` estende o lease somente para o owner correto.
- `ack_success/fail(queue_id, lease_id)` exige owner/lease; um worker atrasado não pode sobrescrever outro.
- Reaper move `LEASED/FETCHING/RENDERING/EXTRACTING` com lease expirado para `RETRY_WAIT` ou `FAILED_TERMINAL`, conforme orçamento.
- Tentativa é imutável; o estado da fila é mutável. Nunca apagar a evidência da tentativa anterior.
- `Retry-After` é o piso do próximo agendamento; não consumir tentativa para um rate limit que o scheduler assumiu, mas contabilizar o evento.

## 8. Qualidade, versionamento, reprocessamento e persistência

### 8.1 Pipeline de qualidade

```text
FetchDocument real
 → normalização/canonicalização
 → extração mecânica por vertical
 → schema validation
 → Integrity Gate
 → evidence/provenance
 → dedupe de request/body/entity/semântica
 → upsert transacional
 → curadoria LLM seletiva
 → publish outbox
```

**Regras:**

- JSON-LD/API oficial antes de heurística; LLM depois do gate, nunca como curativo para body vazio.
- Datas, locais, preços, moeda, CNPJ/CPF, identificadores de edital e URLs devem ter validators específicos.
- Falta de campo é `null`/`unknown`; não usar data futura, “Centro”, “gratuito” ou preço default.
- Toda saída tem `extraction_method`, `provider`, `parser_version`, `schema_version`, `content_hash`, `source_url`, `extracted_at`, `quality_score` e flags.
- LLM recebe schema fechado, orçamento de tokens, conteúdo delimitado, instrução de não inferir e exige evidência por campo. Resposta inválida vai para `needs_review`/reprocess, nunca para publish automático.

### 8.2 Versionamento

Versionar separadamente:

- `canonicalizer_version`;
- `access_policy_version`;
- `parser_version` e `schema_version` por vertical;
- `provider_adapter_version`;
- `prompt_version` e `model_id` para LLM;
- `dedupe_policy_version`;
- `quality_gate_version`.

**Reprocessamento:** selecionar por `source_id`, `content_hash`, `parser_version`, falha ou janela de data; ler raw privado, executar parser novo e publicar apenas se a nova versão passar constraints/quality. Re-fetch só quando raw expirou ou policy exigir. Usar `pg_cron`/job interno com idempotency key e rate budget; gerar diff por campo, não substituir silenciosamente.

### 8.3 Persistência e retenção

- Postgres: estado transacional, metadados, hashes, qualidade, entidades, versões, auditoria e outbox.
- Bucket privado content-addressed: HTML/JSON/XML/DOM/Markdown/PDF, screenshots e traces selecionados; signed URL com TTL.
- Logs: sem Authorization, cookies, tokens, corpos POST ou PII desnecessária; headers por allowlist.
- Retenção por finalidade: raw curto para fontes comuns, maior para auditoria crítica se houver base legal; apagar artefato sem referência após TTL.
- JSONL/Parquet de exportação somente como cópia/reprocessamento, nunca como autoridade de publicação.

## 9. Conformidade, robots, rate limits e segurança

### 9.1 AccessPolicy única

**[RECOMENDAÇÃO]** Antes do primeiro byte, avaliar:

1. esquema somente `http`/`https`;
2. source/domain/path allowlist;
3. robots cacheado e decisão `allowed/disallowed/unknown`;
4. Terms/consentimento/base legal e finalidade;
5. User-Agent identificável, contato e headers mínimos;
6. limite de requests/concorrência por hostname e registrable domain;
7. `Retry-After`, crawl-delay e cooldown como pisos;
8. links externos/subdomínios desligados por padrão;
9. stop em 401/403/challenge/CAPTCHA/paywall/login obrigatório;
10. auditoria da decisão e motivo.

Robots não é autorização jurídica única, e rate limit não é robots. Se robots não puder ser obtido, a policy deve ter resultado explícito — normalmente `review`/`deny` para crawl geral — e não assumir permissão ilimitada.

### 9.2 Matriz de retry

| Classe | Exemplos | Ação |
|---|---|---|
| Transitória | timeout, reset, DNS temporário, 502/503/504 | retry limitado, exponential backoff + jitter |
| Rate limit | 429, `Retry-After` | agendar após header/piso, cooldown por domínio; não insistir |
| Bloqueio | 403/challenge/CAPTCHA/robots | parar, quarentenar, registrar e pedir fonte/autorização; zero evasão |
| Auth | 401/login/paywall | terminal/review; não reutilizar credencial não autorizada |
| Conteúdo | vazio, placeholder, schema inválido | não retry cego; tentar rota autorizada ou reprocessar |
| Parser | bug/drift/selector missing | `needs_review`, guardar artefato, corrigir versão e replay |
| Storage | deadlock/transiente DB/object store | retry idempotente e DLQ se exceder orçamento |

### 9.3 SSRF e browser egress

**[RECOMENDAÇÃO P0]** Implementar em `url-canonicalizer` e no FetchGateway:

- parsear URL com parser rigoroso; rejeitar `file:`, `data:`, `gopher:`, `ftp:` e esquemas desconhecidos;
- rejeitar loopback, RFC1918, link-local, multicast, CGNAT, IPv6 privado/ULA e metadata endpoints (`169.254.169.254` etc.);
- resolver DNS A/AAAA antes de conectar e revalidar após cada redirect; bloquear DNS rebinding e pinçar IP permitido por tentativa;
- limitar redirects e reavaliar allowlist/policy no destino final;
- egress de browser em rede/sandbox separada, sem acesso ao Postgres/metadata/serviços internos;
- bloquear `localhost`, nomes internos, portas administrativas e ranges privados mesmo que apareçam após resolução;
- proxy/egress allowlist explícito, sem aceitar proxy arbitrário vindo da URL do usuário;
- registrar somente host/IP classificado e motivo, sem expor segredos;
- testes com IPv4, IPv6, DNS rebinding, redirects, userinfo, IDN/punycode e URLs ambíguas.

Firecrawl fornece referências úteis de threat policy e checagem de IP privado em seu Playwright service; isso não elimina a necessidade de defesa no gateway Waesy.

### 9.4 Prompt injection e segredos

- HTML, Markdown, JSON-LD e texto de terceiros são dados não confiáveis; nunca são instruções para o sistema.
- Sanitizar scripts/hidden content antes de LLM, delimitar conteúdo e bloquear tool calls originados de texto coletado.
- Segredos em secret manager/env protegido; nunca em URL, `metadata`, trace, artifact ou prompt sem necessidade.
- Cookie/storage state de browser por context, TTL curto e redaction; sem login automático ou perfil pessoal compartilhado.
- Ações externas Nível 2 exigem `WAITING_APPROVAL` e idempotency key, conforme o contrato de agentes.

## 10. Observabilidade e operação

### 10.1 Identidade e traces

Propagar `traceparent`/`tracestate`, `run_id`, `queue_id`, `attempt_id`, `lease_id`, `source_id`, `vertical`, `provider`, `parser_version` e `policy_version`. Spans mínimos:

`claim → policy → robots → DNS/SSRF → queue_wait → fetch → render → extract → integrity → dedupe → persist → publish`.

Não incluir body, cookies, Authorization ou prompt sensível em spans.

### 10.2 Métricas obrigatórias

- backlog por status, prioridade, source e domínio;
- idade p50/p95/p99 e tamanho da DLQ;
- claims concorrentes/duplicados, leases expirados e tempo de heartbeat;
- throughput, queue wait, fetch/render/parse/persist latency;
- status HTTP, 401/403/404/429/5xx, Retry-After e cooldown;
- robots allow/deny/unknown, blocked/challenge/auth;
- browser escalation rate, sessions ativas, crashes, heap, pages por worker;
- cache hit/miss, ETag/Last-Modified, bytes e custo Firecrawl/LLM;
- extraction pass/fail/review, conteúdo vazio, placeholder rejected, schema drift;
- duplicate/entity conflict/Jaccard cluster e publish success/failure;
- tokens/custo/latência de Copilot/ReAct por tool e modelo.

### 10.3 Alertas e runbooks

**P0:** duplicate claim, SSRF permitido, publish sem evidence, `screenshot_only` marcado como success, worker sem lease/ack.  
**P1:** 429/403 acima do baseline, lease recovery crescente, DLQ, quality pass em queda, browser crash loop, provider indisponível.  
**P2/P3:** fila envelhecendo, cache hit baixo, drift de selector, custo LLM, inventário de fonte desatualizado.

O `mining-doctor --json` deve informar por fonte: backend ativo, policy, robots status, última tentativa, cooldown, erro categorizado e instrução de reparo sem segredos.

## 11. Plano de implementação 30/60/90/180 dias

### 0–30 dias — fundação P0

- Confirmar schema de produção e reconciliar `retry_count` versus `attempts`.
- Criar migration expand: `lease_id`, `lease_owner`, `lease_until`, `claimed_at`, `heartbeat_at`, `next_attempt_at`, `attempt_count`, `max_attempts`, `error_class`, `blocked_until`, `parser_version`, `policy_version`, `request_fingerprint`.
- Implementar RPC `claim_next` com `FOR UPDATE SKIP LOCKED`, ack condicionado ao lease e reaper de órfãos; teste concorrente com 100 workers.
- Centralizar `AccessPolicy` + `FetchGateway`; conectar native/API/RSS/Firecrawl/Steel ao contrato.
- Ativar robots conforme política da fonte, UA honesto, rate/cooldown distribuído e matriz de retry.
- Corrigir Steel placeholder e remover defaults sintéticos de eventos; introduzir `unknown/needs_review`.
- Criar `crawl_attempts`, reason codes e métricas mínimas; manter `scraper_audit_log` compatível.
- Registrar decision log do que é comprovado versus recomendado; fixar versões de providers.

**Saída:** nenhuma duplicidade de claim em teste, nenhum falso sucesso de screenshot/placeholder, retry persistente e policy observável.

### 31–60 dias — worker HTTP e browser controlado

- Integrar Crawlee como worker HTTP/discovery atrás do Supabase; labels por vertical e source.
- Implementar queue por domínio, token bucket, fairness, `maxDepth`, `maxRequests`, sitemap/RSS/API seeds e `parent_url`.
- Construir Playwright render worker com context por tentativa, readiness, network listeners, DOM real e trace amostrado.
- Cascata `native/API → Crawlee HTTP → Firecrawl → Playwright`; cada promoção motivada por sinal e budget.
- Adicionar private artifact bucket, SHA-256, ETag/Last-Modified e replay local usando capturas reais.
- Pilotar notícias/RSS e eventos, depois uma fonte HTML JS autorizada; sem expandir para oito verticais de uma vez.

**Saída:** execução concorrente segura em piloto, browser somente quando necessário e reprocessamento sem rede para raw capturado.

### 61–90 dias — qualidade, discovery e agentes

- Implementar `crawl_discoveries`, entity versions, publish outbox e diffs por campo.
- Versionar canonicalizer/parser/schema/policy/prompt/model; criar reprocess selector por versão.
- Completar Integrity Gate com checks por vertical e `ExtractionEvidence` por campo.
- Instrumentar OTel/W3C, dashboards, SLOs e alertas de fila/blocked/quality.
- Integrar ReAct ao Copilot via MCP/CanonicalToolContract; bounded steps, evidence, approval e stop conditions.
- Criar `mining-doctor --json`, canaries por fonte e testes de prompt injection/SSRF/DNS rebinding.

**Saída:** agente pode planejar e consultar o sistema sem acessar providers diretamente ou inventar campos; mudanças de parser produzem diff/review.

### 91–180 dias — escala seletiva e endurecimento

- Medir se Postgres/Crawlee/Playwright atendem o volume; só então avaliar Selenium Grid, Redis transitório, Crawl4AI/Scrapling sidecar, StormCrawler/URLFrontier ou Heritrix/WARC para casos específicos.
- Expandir discovery Best-First/score apenas para jobs que precisam de crawl recursivo; manter cobertura determinística via sitemap/API.
- Adicionar reprocessamento contínuo de drift, comparação entre runs e canaries por domínio.
- Fazer teste de carga, chaos de worker/lease, backup/restore de DB e object storage, rotação de browser e DLQ replay.
- Definir contratos de provider com conformance suite; negociar APIs/feeds/exportações quando fontes bloquearem crawling.
- Revisar retenção, copyright, privacy, RLS, acessos de artefatos e base legal com responsáveis do produto.

**Saída:** escala demonstrada por telemetria, não por contagem de threads; provider/renderer intercambiável sem quebrar qualidade ou compliance.

## 12. Matriz priorizada P0–P3

| ID | Prioridade | Entrega | Owner sugerido | Dependência | Pronto quando |
|---|---|---|---|---|---|
| Q-01 | P0 | Claim SQL atômico + lease/heartbeat/ack/reaper | Data/Mining | schema confirmado | teste concorrente sem duplicidade e recuperação de crash |
| Q-02 | P0 | Unificar tentativas/backoff/DLQ/reason codes | Mining platform | Q-01 | 429/5xx/403 têm destinos distintos e persistentes |
| Q-03 | P0 | AccessPolicy/FetchGateway único | Security/Mining | source registry | nenhum provider faz rede fora do gateway |
| Q-04 | P0 | Robots/UA/rate limit/cooldown distribuído | Compliance/Mining | Q-03 | decisão auditada e Retry-After respeitado |
| Q-05 | P0 | SSRF/DNS/redirect egress guard | Security | Q-03 | suíte adversarial bloqueia IPs internos/rebinding |
| Q-06 | P0 | Remover placeholders/defaults sintéticos | Vertical owners | Q-02 | zero `success` sem conteúdo/evidence real |
| Q-07 | P0 | Idempotência/constraints por request e entidade | Data | Q-01 | 100 workers não geram publicação duplicada |
| Q-08 | P1 | `crawl_attempts`/artifacts/evidence | Mining platform | Q-02 | toda tentativa tem status, provider, hash e trace |
| Q-09 | P1 | Crawlee HTTP/discovery worker | Mining | Q-01/Q-03 | pilotado em duas fontes sem violar budget |
| Q-10 | P1 | Playwright renderer | Browser platform | Q-03/Q-05 | DOM real, readiness, context isolado e cleanup |
| Q-11 | P1 | Integrity/schema/version/dedupe pipeline | Data/Verticals | Q-08 | replay de raw gera resultado versionado/diff |
| Q-12 | P1 | Publish outbox e entity versions | Data/Product | Q-11 | eventos idempotentes e rollback editorial |
| Q-13 | P1 | OTel + dashboards + doctor | SRE | Q-08 | 99% das tentativas piloto correlacionadas |
| Q-14 | P1 | MCP tools/ReAct bounded no Copilot | AI/Mining | Q-11/Q-13 | tool contracts, evidence e approval testados |
| Q-15 | P2 | Firecrawl v2 adapter/capability discovery | Integrations | Q-03/Q-08 | Cloud/self-host não são confundidos; webhook idempotente |
| Q-16 | P2 | Selector drift/adaptive fallback | Vertical owners | Q-11 | baixa confiança vai a review e não publica |
| Q-17 | P2 | Cache content-addressed/ETag/Last-Modified | SRE/Data | Q-08 | reprocess funciona sem rede e TTL é respeitado |
| Q-18 | P2 | Selenium Grid remoto | Browser platform | métricas de escala | benchmark prova ganho sobre Playwright local |
| Q-19 | P2 | PDF/OCR autorizado | Documents | Q-11 | MIME/size/timeout/quality gate e provenance |
| Q-20 | P3 | StormCrawler/Heritrix/WARC | Architecture | escala medida | caso de uso e custo justificam operação adicional |
| Q-21 | P3 | ScrapeGraphAI/LLM amplo | AI | evidence/quality | apenas campos não determinísticos, com custo e review |
| Q-22 | P3 | Provider/egress pool avançado | Security/Legal | policy contratual | uso autorizado e não orientado a bypass |

## 13. Critérios de aceite

### Fila e durabilidade

- **[CRITÉRIO]** Com 100 workers concorrentes e a mesma frontier, cada `request_fingerprint` é reclamado por no máximo um lease válido por vez.
- **[CRITÉRIO]** Worker morto ou sem heartbeat retorna ao estado elegível dentro do SLA definido, sem apagar `crawl_attempts`.
- **[CRITÉRIO]** Ack de worker com lease expirado não altera o item nem entidades publicadas por outro worker.
- **[CRITÉRIO]** Restart preserva pending, retry_wait, blocked/quarantine, DLQ e artefatos; não depende de memória local.

### Politeness e segurança

- **[CRITÉRIO]** Robots disallow não gera fetch da página; a decisão e o parser/policy version são auditados.
- **[CRITÉRIO]** 429 não gera nova request antes de `Retry-After`/piso e atualiza cooldown compartilhado.
- **[CRITÉRIO]** 403/challenge/CAPTCHA/paywall/login não aciona rotação infinita, stealth automático ou solver; produz estado bloqueado/review.
- **[CRITÉRIO]** URLs para loopback, private/link-local/metadata, esquemas não HTTP(S), redirects privados e DNS rebinding são bloqueadas antes do conteúdo chegar ao parser.
- **[CRITÉRIO]** Cookies, Authorization, tokens, PII desnecessária e corpos POST não aparecem em logs/traces/artifacts públicos.

### Conteúdo e zero mocks

- **[CRITÉRIO]** Screenshot sem DOM nunca é armazenado como HTML, Markdown ou entidade factual; `screenshot_only` não passa no Integrity Gate textual.
- **[CRITÉRIO]** Ausência de data/local/preço/gratuidade resulta em `null/unknown/review`, nunca em valor default.
- **[CRITÉRIO]** Cada campo crítico publicado tem URL, timestamp, método/path de extração, content hash e status de evidência.
- **[CRITÉRIO]** Produção não usa `mock`, placeholder, fixture sintética ou “success” fabricado; fixtures de teste, quando necessárias, são capturas reais versionadas e rotuladas.

### Qualidade e reprocessamento

- **[CRITÉRIO]** Reprocessar o mesmo raw com a mesma versão é determinístico para etapas mecânicas; diferenças de LLM registram modelo/prompt/custo e passam por schema.
- **[CRITÉRIO]** Trocar parser/schema gera `entity_version` e diff por campo, sem destruir a versão anterior.
- **[CRITÉRIO]** Duplicidade de URL, conteúdo e entidade é testada separadamente; Jaccard não substitui constraint de banco.
- **[CRITÉRIO]** Qualquer conteúdo rejeitado explica o motivo em `quality_flags`/`quality.explain`.

### Operação e Copilot

- **[CRITÉRIO]** Pelo menos 99% das tentativas do piloto têm `trace_id`, `run_id`, `queue_id` e `attempt_id` correlacionáveis; o restante gera alerta.
- **[CRITÉRIO]** Dashboards distinguem queue wait, fetch, render, parse e persist; não reportam somente duração total.
- **[CRITÉRIO]** ReAct é interrompido por limite de passos/custo/tempo, policy deny, ausência de evidence ou tool inválida.
- **[CRITÉRIO]** Ações externas irreversíveis entram em `WAITING_APPROVAL`; respostas do Copilot citam fontes e diferenciam `verified`, `supported`, `conflicting`, `stale` e `unknown`.

## 14. Riscos, trade-offs e mitigação

| Risco | Probabilidade/impacto | Mitigação |
|---|---|---|
| Aumentar concorrência antes de corrigir claim | alta/crítico | P0 Q-01, teste de corrida, rollout por canary |
| Browser explode custo/memória | alta/alto | HTTP-first, budget por source, page/context lifecycle, browser pool limitado |
| Provider Cloud/self-host divergente | alta/alto | capability discovery, snapshots fixos, conformance tests, fallback honesto |
| Robots/policy incompleto em uma vertical | média/crítico | AccessPolicy obrigatória no gateway, deny/review fail-closed para fonte geral |
| SSRF via redirect/DNS/browser | média/crítico | resolver/egress guard, sandbox, revalidação a cada hop e testes adversariais |
| Prompt injection em página | alta/alto | conteúdo como dados, sanitização, tool allowlist, evidence e aprovação |
| Drift de seletor/JSON-LD | alta/médio | schema version, quality gate, adaptive apenas como fallback, review e replay |
| Duplicidade em upsert/publicação | média/alto | constraints, idempotency keys, outbox vencedor e ack condicionado ao lease |
| Retenção de PII/cookies/traces | média/alto | redaction, buckets privados, TTL, contexto isolado e finalidade mínima |
| Polyglot sprawl (TS/Python/Java) | média/alto | Crawlee+Playwright primeiro; sidecar somente com benchmark/owner |
| Agente alucina ou toma ação indevida | média/crítico | ReAct bounded, schema, EvidenceObject, WAITING_APPROVAL, zero mocks |
| Reprocessamento altera histórico silenciosamente | média/alto | entity versions, diff, publish outbox e rollback |
| Inventário defasado | comprovado/médio | atualizar contagem/owners como tarefa P1; não tratar inventário como prova de runtime |
| Lock starvation/fairness | média/alto | priority aging, fairness por source/domain, budgets separados e métricas |
| Cache mascara bloqueio/conteúdo vencido | média/médio | cache só com TTL/ETag/policy; development cache separado de produção |

## 15. Referências numeradas oficiais

As referências abaixo são os pontos primários usados nos relatórios individuais. Os commits indicados nos relatórios são snapshots; verificar a versão em uso antes de afirmar que um default ou capacidade permanece igual.

1. Scrapy — arquitetura: https://docs.scrapy.org/en/latest/topics/architecture.html
2. Scrapy — scheduler: https://docs.scrapy.org/en/latest/topics/scheduler.html
3. Scrapy — jobs/persistência: https://docs.scrapy.org/en/latest/topics/jobs.html
4. Scrapy — AutoThrottle: https://docs.scrapy.org/en/latest/topics/autothrottle.html
5. Scrapy — Downloader middlewares: https://docs.scrapy.org/en/latest/topics/downloader-middleware.html
6. Scrapy — Item pipelines: https://docs.scrapy.org/en/latest/topics/item-pipeline.html
7. Scrapy — Stats/extensions: https://docs.scrapy.org/en/latest/topics/stats.html
8. Scrapy — Retry middleware no código: https://github.com/scrapy/scrapy/blob/master/scrapy/downloadermiddlewares/retry.py
9. Scrapy — robots middleware no código: https://github.com/scrapy/scrapy/blob/master/scrapy/downloadermiddlewares/robotstxt.py
10. Scrapy Playwright: https://github.com/scrapy-plugins/scrapy-playwright
11. Crawlee — repositório oficial: https://github.com/apify/crawlee
12. Crawlee — RequestQueue: https://github.com/apify/crawlee/blob/master/packages/core/src/storages/request_queue.ts
13. Crawlee — concurrency system: https://github.com/apify/crawlee/blob/master/packages/basic-crawler/src/internals/autoscaling/concurrency_system.ts
14. Crawlee — throttling request manager: https://github.com/apify/crawlee/blob/master/packages/basic-crawler/src/internals/throttling_request_manager.ts
15. Crawlee — sessões: https://github.com/apify/crawlee/blob/master/packages/basic-crawler/src/internals/session_pool/session_pool.ts
16. Crawlee — tracing/OpenTelemetry: https://crawlee.dev/js/docs/guides/trace-and-monitor-crawlers
17. Playwright — repositório oficial: https://github.com/microsoft/playwright
18. Playwright — browser contexts: https://playwright.dev/docs/browser-contexts
19. Playwright — network interception: https://playwright.dev/docs/network
20. Playwright — retries: https://playwright.dev/docs/test-retries
21. Playwright — trace viewer: https://playwright.dev/docs/trace-viewer
22. Puppeteer — repositório oficial: https://github.com/puppeteer/puppeteer
23. Puppeteer — `Page.goto`: https://pptr.dev/api/puppeteer.page.goto
24. Puppeteer — network interception: https://pptr.dev/guides/network-interception
25. Selenium Grid — arquitetura: https://www.selenium.dev/documentation/grid/architecture/
26. Selenium — Remote WebDriver: https://www.selenium.dev/documentation/webdriver/drivers/remote_webdriver/
27. Selenium — waits: https://www.selenium.dev/documentation/webdriver/waits/
28. Selenium — BiDi network: https://www.selenium.dev/documentation/webdriver/bidi/network/
29. Crawl4AI — documentação: https://docs.crawl4ai.com/core/quickstart/
30. Crawl4AI — deep crawling: https://docs.crawl4ai.com/core/deep-crawling/
31. Crawl4AI — multi-URL/dispatcher: https://docs.crawl4ai.com/advanced/multi-url-crawling/
32. Crawl4AI — extração sem LLM: https://docs.crawl4ai.com/extraction/no-llm-strategies/
33. Firecrawl — introdução: https://docs.firecrawl.dev/introduction
34. Firecrawl — scrape: https://docs.firecrawl.dev/features/scrape
35. Firecrawl — crawl: https://docs.firecrawl.dev/features/crawl
36. Firecrawl — map: https://docs.firecrawl.dev/features/map
37. Firecrawl — extract: https://docs.firecrawl.dev/features/extract
38. Firecrawl — self-host: https://docs.firecrawl.dev/contributing/self-host
39. Firecrawl — rate limits: https://docs.firecrawl.dev/rate-limits
40. Firecrawl — controlador de crawl no código: https://github.com/firecrawl/firecrawl/blob/main/apps/api/src/controllers/v2/crawl.ts
41. Firecrawl — threat/Playwright service: https://github.com/firecrawl/firecrawl/blob/main/apps/playwright-service-ts/api.ts
42. Firecrawl — OTel tracer: https://github.com/firecrawl/firecrawl/blob/main/apps/api/src/lib/otel-tracer.ts
43. Scrapling — repositório oficial: https://github.com/D4Vinci/Scrapling
44. Scrapling — arquitetura de spiders: https://scrapling.readthedocs.io/en/latest/spiders/architecture.html
45. Scrapling — fetching: https://scrapling.readthedocs.io/en/latest/fetching/choosing.html
46. Scrapling — parsing adaptive: https://scrapling.readthedocs.io/en/latest/parsing/adaptive.html
47. ScrapeGraphAI — repositório: https://github.com/ScrapeGraphAI/Scrapegraph-ai
48. Maxun — repositório: https://github.com/getmaxun/maxun
49. Colly — documentação: https://go-colly.org/docs/
50. Colly — queue: https://go-colly.org/docs/examples/queue/
51. Apache StormCrawler — arquitetura: https://stormcrawler.apache.org/docs/latest/architecture.html
52. StormCrawler — repositório: https://github.com/apache/stormcrawler
53. Heritrix — documentação: https://heritrix.readthedocs.io/en/latest/bean-reference.html
54. Heritrix — repositório: https://github.com/internetarchive/heritrix3
55. Agent-Reach — repositório oficial: https://github.com/Panniantong/Agent-Reach
56. Agent-Reach — doctor/configuração: https://github.com/Panniantong/Agent-Reach/blob/main/agent_reach/doctor.py
57. OpenTelemetry — contexto W3C: https://opentelemetry.io/docs/concepts/context-propagation/
58. OWASP — SSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html

### Fontes locais de auditoria

- `/home/ubuntu/waesy-audit/SYSTEM_INVENTORY.md`
- `/home/ubuntu/waesy-audit/audits/crawler-research-01-scrapy.md` até `crawler-research-15-agent-reach.md`
- `/home/ubuntu/waesy-audit/audits/13-security-threat-model.md`
- `/home/ubuntu/waesy-audit/audits/14-observability-gaps.md`
- `/home/ubuntu/waesy-audit/audits/18-architecture-target.md`
- `/home/ubuntu/waesy-audit/audits/20-migration-plan.md`

## 16. Definição de sucesso

O Waesy estará no nível esperado quando puder responder, para cada item: **por que esta URL foi descoberta, por que foi permitida, quem a reclamou, qual provider/browser a buscou, qual foi o status real, que evidência sustentou cada campo, qual versão do parser produziu o resultado, por que foi deduplicado/publicado, como reprocessá-lo e como interromper o acesso sem burlar o operador da fonte**.

A meta não é ter o maior número de browsers ou frameworks. É ter a combinação mais confiável de **frontier durável, aquisição econômica, rendering condicional, qualidade verificável, evidência reprocessável, agentes limitados e operação legal**.
