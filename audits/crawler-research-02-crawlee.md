# Pesquisa de crawler 02 — Crawlee aplicado aos mineradores Waesy

**Data da análise:** 2026-10-06  
**Projeto analisado:** `apify/crawlee`  
**Checkout primário inspecionado:** commit `8f57dd3caf222079b4a288338d3399604a62eaa2`  
**Pacotes do checkout:** `@crawlee/core` e `@crawlee/basic-crawler` 4.0.0; monorepo/package root 12.9.1  
**Comparação:** `/home/ubuntu/waesy-audit/SYSTEM_INVENTORY.md` e código em `src/services/mining` e `src/lib/mining`.

> Este documento descreve somente capacidades verificadas na documentação/código primário consultados. Onde a adaptação para Waesy exigiria um adaptador, migração de esquema ou código novo, isso está explicitamente marcado como proposta, não como capacidade já existente.

## 1. Escopo e método

A análise usou o repositório oficial no GitHub, os guias versionados no próprio repositório e o código TypeScript das classes centrais. Foram examinados: `BasicCrawler`, `HttpCrawler`, `BrowserCrawler`/`PlaywrightCrawler`, `Request`, `RequestQueue`, `RequestList`/`SitemapRequestLoader`, `RequestManagerTandem`, `ThrottlingRequestManager`, `ConcurrencySystem`, `Session`/`SessionPool`, `ProxyConfiguration`, FileSystemStorage e os guias de storage, sessões, bloqueios, request loaders, escalabilidade e OpenTelemetry. O inventário Waesy foi lido como fonte canônica da arquitetura, e os principais mineradores/utilitários foram conferidos no código.

A conclusão não é que Waesy deva substituir Supabase por Crawlee. Crawlee fornece uma arquitetura de crawling e storage orientada a requests; Waesy possui uma arquitetura de produto/editorial orientada a entidades, RLS e persistência em Postgres. A integração mais segura é usar Crawlee como **motor de aquisição/discovery por request**, mantendo Supabase como sistema de registro, deduplicação de negócio, auditoria e publicação.

## 2. Resumo executivo

Crawlee é um monorepo modular com uma camada de fontes/requests (`Request`, `RequestQueue`, `RequestList`, loaders e managers), uma camada de execução (`BasicCrawler` + crawlers HTTP ou browser), governança de capacidade (`ConcurrencySystem`/autoscaling), identidade (`SessionPool`, cookies, proxy e fingerprint), extração (HTML/JSON/DOM/browser helpers), e storages pluggable (por padrão filesystem; também integração Apify conforme configuração). O request é o objeto de controle: carrega URL, `uniqueKey`, label/userData, depth, retry count, erros, sessão, headers e estado handled.

Os ganhos mais relevantes para Waesy são:

1. **Separar fonte de URLs, manager de requests e execução.** Isso permite combinar seeds de DB/API/sitemap com discovery de links sem duplicar o loop.
2. **Dedupe por `uniqueKey` no ponto de enfileiramento.** É complementar, não substituto, da deduplicação de negócio de Waesy.
3. **Politeness como camada de scheduling, não como sleep no handler.** `ThrottlingRequestManager` mantém filas por domínio, honra `Retry-After`, faz backoff de 429, aplica `Crawl-delay` de robots quando habilitado e não consome retry count no rate-limit administrado por ele.
4. **Backpressure baseada em CPU/memória/event loop/storage**, com limite explícito de tarefas por minuto e governor compartilhável entre vários crawlers.
5. **Retry sem duplicação de resultados.** O handler deve lançar erros; `errorHandler` roda entre tentativas e `failedRequestHandler` após esgotamento. Storage transacional por request faz rollback de Dataset/KVS e writes de queue têm política explícita.
6. **Pipeline HTTP primeiro, browser apenas quando necessário.** O próprio código diz que browser é útil para JavaScript e que HTTP/Cheerio é aproximadamente 10x mais rápido quando JS não é necessário.
7. **Sessão como identidade coerente.** Cookie jar, proxy/IP e fingerprint ficam juntos; sessões podem ser boas/ruins/retiradas, persistidas e compartilhadas entre crawler HTTP e browser.
8. **Observabilidade pronta para OpenTelemetry.** Há spans de run, handling, handler, erros, navegação/HTTP, retry count e logs estruturados; isso pode completar o audit log atual de Waesy.

## 3. Arquitetura extraída do Crawlee

```text
Seeds/RequestList/Sitemap/DB/API
              │
              ▼
    IRequestLoader (leitura)
              │ tandem, opcional
              ▼
IRequestManager / RequestQueue / ThrottlingRequestManager
              │ fetchNextRequest + reclaim + pacing signals
              ▼
 BasicCrawler task loop
   ├─ ConcurrencySystem / Autoscaling
   ├─ SessionPool → cookies + proxyInfo + fingerprint
   ├─ HTTP client (Http/Cheerio/JSDOM/LinkeDOM)
   └─ BrowserPool (Playwright/Puppeteer/Stagehand)
              │
              ▼
   hooks → navigation → requestHandler
              │
       enqueueLinks / addRequests
              │ (discovery de volta à fila)
              ▼
  Dataset / KeyValueStore / RequestQueue transaction
              │
              ▼
  logs, Statistics, OTel spans/metrics e failedRequestHandler
```

### 3.1 Camada de requests e estado

`Request` representa uma unidade persistida de trabalho e não apenas uma URL. O código mantém `url`, `loadedUrl`, `uniqueKey`, método/payload, headers, `noRetry`, `retryCount`, `errorMessages`, `handledAt`, `label`, `userData`, `sessionId`, `crawlDepth`, `maxRetries` e estratégia de enqueue. O `uniqueKey` padrão normaliza a URL; o caller pode fornecê-lo, manter fragmento, incluir método/payload ou forçar novas ocorrências (`alwaysEnqueue`).

`RequestQueue` é dinâmica, suporta breadth-first/depth-first, aceita discovery durante o crawl, `reclaimRequest` para retry e deduplica por `uniqueKey`; Requests já tratadas continuam contabilizadas. A implementação possui cache local de dedupe e capacidade declarada de até 2 milhões de requests em cache local, mas isso não equivale a uma promessa de que todo crawl de milhões ficará na memória. O backend filesystem mantém locks/estado da fila; `requestQueueAccess: 'single'` é para processo único e `'shared'` trata in-progress como lock de peer até expirar para vários processos.

`RequestList` é somente leitura e otimizada para listas grandes; `SitemapRequestLoader` lê sitemap XML/texto em background e filtra por glob/regex. `RequestManagerTandem` une uma fonte read-only a uma fila gravável: seeds podem vir de sitemap/arquivo/DB e requests descobertas/reclamadas vão para o lado gravável. A abstração `IRequestLoader` também admite loader próprio, por exemplo um adapter para `crawl_queue` do Supabase.

### 3.2 Discovery e roteamento

`enqueueLinks`/`addRequests` extraem links do documento e os colocam no request manager. Há filtros por glob/regex, estratégias de mesmo host/domínio/origin, `transformRequestFunction`, `label`/`userData`, `maxCrawlDepth` e `maxRequestsPerCrawl`. Por padrão o comportamento de discovery é restritivo (mesmo hostname; subdomínios não entram sem estratégia apropriada), o que é um bom default contra explosão de escopo. Router handlers selecionam lógica pelo label.

O modelo é adequado a Waesy porque cada vertical pode ter uma rota/handler tipado: `pncp-list`, `pncp-detail`, `event-detail`, `job-detail`, `rss-article` etc. O `userData` deve carregar somente metadados serializáveis e a origem do seed; a entidade editorial final não deve ser escrita automaticamente apenas porque uma página foi descoberta.

### 3.3 Concorrência, backpressure e escala

`ConcurrencySystem` combina orçamento de concorrência com sinais de carga. No checkout, os defaults são `minConcurrency=1`, `maxConcurrency=200`, `desiredConcurrency=minConcurrency`, ajuste a cada 10 segundos, log periódico a cada 60 segundos e `maxTasksPerMinute=Infinity`. Sinais built-in observam memória, event loop, CPU e backend de storage; o sistema mantém janelas históricas para estabilizar autoscaling e janela curta para reagir a picos. `maxRequestsPerMinute`/`maxTasksPerMinute` impõe limite explícito mesmo quando a máquina comportaria mais.

Um mesmo governor pode ser injetado em múltiplos crawlers, limitando o orçamento combinado; o caller precisa cuidar do lifecycle do governor injetado. Isso é especialmente útil para Waesy: PNCP/API e páginas HTML podem compartilhar um budget por processo, evitando que oito verticais concorram sem coordenação. O limite de recursos não é por domínio; para respeito ao alvo, é necessária também a camada de pacing por domínio.

### 3.4 Politeness, pacing, robots e rate-limit

`sameDomainDelaySecs` oferece uma espera mínima por site e subdomínios; internamente pode construir um `ThrottlingRequestManager`. A implementação de throttling cria uma fila por domínio (ou por registrable domain), de modo que uma fila em backoff não bloqueia outras. Com `domains: 'all'`, cada domínio descoberto recebe fila própria até `maxThrottledDomains` (default 100), e a lista descoberta é persistida no KVS para reabrir queues após restart quando `purgeOnStart` não é usado.

Há dois clocks por domínio: (a) backoff reativo de 429, honrando `Retry-After` e, na falta dele, backoff exponencial de `baseDelaySecs=2` até `maxDelaySecs=60`; (b) crawl delay proativo entre dispatches, com `minCrawlDelaySecs` e o `Crawl-delay` de robots, prevalecendo o maior. Uma request mantida por 429 administrado pelo manager é reagendada sem consumir `maxRequestRetries` e sem penalizar a sessão. Se o domínio fica em rate-limit sem liberar uma request por `maxDomainStallSecs=900`, o crawl termina com `PersistentRateLimitError`, deixando a fila para uma execução posterior; `keepAlive` é exceção por design.

`respectRobotsTxtFile` é opt-in. Para cada origin, Crawlee busca/cacheia `robots.txt`, consulta `isAllowed` com user-agent configurável (default `*`) e pode aplicar o `Crawl-delay`. Se o manager não souber fazer pacing, o código avisa que o delay foi descartado; logo, habilitar robots sem um manager que aceite sinais não é garantia de que `Crawl-delay` será honrado. Falha ao buscar robots não é tratada como autorização ilimitada: o código registra warning e continua sem o arquivo, decisão que Waesy deve tornar explícita em sua política de fonte.

### 3.5 Retries, erros e circuitos

O `BasicCrawler` pede que o handler lance exceções, em vez de capturá-las silenciosamente. Uma falha no handler, hooks, navegação, sessão/proxy pode ser tentada até `maxRequestRetries` (default 3); antes de cada nova tentativa o `errorHandler` pode ajustar Request; depois do limite o `failedRequestHandler` recebe Request e erros acumulados. `requestHandlerTimeoutSecs` tem default 60. `noRetry` existe por Request para operações que não devem ser repetidas.

A semântica diferencia erro transitório, erro de sessão e rate-limit. Status bloqueados default são `[401, 403, 429]`; `retryOnBlocked` pode reconhecer paredes Cloudflare/Google por conteúdo, mas não deve ser confundido com autorização ou garantia de bypass. No manager que administra 429, o rate-limit não incrementa retry count. Essa distinção evita o problema de Waesy em que cada 429 pode consumir tentativa e/ou trocar identidade sem reduzir a pressão.

Não há equivalência automática entre o circuit breaker global de Waesy e o retry individual do Crawlee. Waesy deve manter/adaptar seu `crawler-circuit-breaker` como política de domínio/serviço (abertura após falhas consecutivas e cooldown), enquanto Crawlee governa cada Request. Persistência de breaker e cooldown em `domain_cooldowns` deve continuar no Supabase se o comportamento cross-process for necessário; SessionPool e throttled-domain state do Crawlee não substituem isso.

### 3.6 HTTP, browser e rendering

`HttpCrawler` faz request HTTP e expõe resposta, body, JSON, content type e encoding. Por default processa HTML/XML/XHTML/JSON; tipos adicionais são opt-in. Há pre/post navigation hooks e `saveResponseCookies`. `CheerioCrawler` oferece parsing HTML barato; JSDOM/LinkeDOM atendem casos DOM/seletores com custo intermediário. O código/documentação orienta usar browser se JavaScript for necessário.

`BrowserCrawler` usa `BrowserPool`, abre page por Request, fornece `page`, `response`, `gotoOptions`, `extractLinks` e `enqueueLinks`. `PlaywrightCrawler` suporta Chromium/Firefox/WebKit, headless por default, navegação com hooks e helpers verificados no código: `parseWithCheerio`, `waitForSelector`, `infiniteScroll`, `blockRequests`, `saveSnapshot`, `enqueueLinksByClickingElements`, `compileScript` e `handleCloudflareChallenge`. BrowserPool pode ser fornecido/compartilhado ou construído e destruído pelo crawler; há suporte a browser remoto.

A recomendação operacional para Waesy é um pipeline de fallback explícito: HTTP/Cheerio para feeds, APIs, HTML server-rendered e JSON-LD; Playwright para páginas efetivamente dependentes de JS, scroll/interação ou renderização. O fallback não deve ser aplicado cegamente a todo erro de HTTP: deve ser motivado por sinais (conteúdo vazio, shell JS, seletor ausente, challenge reconhecida) e auditado por custo.

### 3.7 Sessões, proxies e anti-bot dentro de limites legais

`SessionPool` é integrado aos crawlers e nunca devolve sessão não utilizável. No código, o pool default admite até 1000 sessões; estratégias de reuso são `random`, `round-robin` e `use-until-failure`. `Session` tem defaults `maxAgeSecs=3000`, `maxErrorScore=3`, `errorScoreDecrement=0.5`, `maxUsageCount=50`; `markBad` aumenta score/uso, `markGood` aumenta uso e reduz score, e `retire` é terminal. Cookie jar, `proxyInfo`, fingerprint e userData são persistíveis; a pool pode ser compartilhada por crawlers HTTP e browser.

`ProxyConfiguration` aceita lista rotativa de proxies ou função que produz URL dinamicamente e expõe `ProxyInfo`; não implica proxy configurado sem fornecimento do usuário. O guia de anti-blocking informa que fingerprints são habilitados por default nos crawlers Playwright/Puppeteer e que uma dica browser/platform/device também é transportada por sessões HTTP, com cliente `impit` podendo mapear isso para perfil TLS/HTTP. O guia também menciona Camoufox e `handleCloudflareChallengeHook`; o código não transforma isso em garantia de sucesso.

**Limite de conformidade para Waesy:** usar somente fontes permitidas, respeitar termos aplicáveis, robots quando política do alvo exigir, rate limits, identidade declarada e contato/UA apropriado. Fingerprint/proxy/rotação devem ser usados para consistência, isolamento de sessão e confiabilidade em alvos autorizados — não para contornar autenticação, paywall, CAPTCHA, bloqueio explícito ou controles de acesso. Não há recomendação neste relatório para automatizar CAPTCHA ou contornar controle de acesso. `retryOnBlocked` e challenge helpers devem ser opt-in, com allowlist, teto de custo e registro do motivo.

### 3.8 Extração e qualidade

Crawlee é deliberadamente agnóstico ao schema de negócio: entrega contexto de request/response/body/DOM/page e helpers. A extração de entidade fica no handler. Isso combina com os extratores especializados de Waesy: JSON-LD (`@graph`), meta/OpenGraph, seletores de domínio e densidade textual podem permanecer; Crawlee pode apenas fornecer um contexto uniforme e persistir snapshots/resultados intermediários.

O `parseWithCheerio` do Playwright permite reutilizar os extratores HTML sem executar seletores diretamente no browser em cada campo. `waitForSelector` e `infiniteScroll` cobrem páginas JS; `blockRequests` pode reduzir imagens/analytics em alvos em que isso seja permitido. `saveSnapshot` é útil para evidência de debug, mas não deve virar payload padrão de toda request.

A integrity gate de Waesy (mínimo de palavras, detecção de challenge/erro, score, hash/Jaccard e no-stock-image) continua necessária. Crawlee não afirma validação editorial, não sabe que uma data de evento é factual e não impede o fallback de Waesy que hoje preenche data/venue/isFree quando o evento estruturado não existe. Esse fallback deve ser corrigido separadamente: ausência de campo deve permanecer ausência ou estado `needs_review`, nunca valor inventado.

### 3.9 Storage, atomicidade e reprocessamento

Por default, Crawlee usa `CRAWLEE_STORAGE_DIR`/`./storage` e FileSystemStorage. Request queues ficam em `request_queues`, datasets em `datasets` e KVS em `key_value_stores`. Dataset é append-only; KVS é MIME-aware para JSON, texto, bytes, screenshots/PDFs e estado. Storages default/run-scoped são purgados no início; storages nomeados persistem. O backend nativo do filesystem possui formato, timestamps, contagem, locks e persistência de estado; há modo single/shared para filas on-disk.

Durante request handling, Dataset/KVS/alguns writes de queue usam transaction por request: sucesso faz commit conjunto; throw faz rollback e retry não duplica os writes buffered. Enqueue de queue é `writeThrough` por default, porque discovery precisa alimentar a execução mesmo enquanto o handler corre; pode ser `deferred` quando all-or-nothing for importante. Há caveat de entrega cross-storage at-least-once em falha parcial de commit. `errorHandler` e `failedRequestHandler` rodam depois do rollback e seus writes são diretos.

Isso não substitui Postgres/Supabase. Para Waesy, o Dataset/KVS deve ser usado, se desejado, para raw HTML/JSON-LD/screenshot/trace local por run; a publicação em tabelas canônicas continua em Supabase, com idempotência por chave de negócio, RLS e auditoria. Não foi encontrada no Crawlee core uma implementação nativa de claim transacional em Supabase, nem uma garantia de `FOR UPDATE SKIP LOCKED` para a tabela `crawl_queue`; isso precisa ser escrito no adapter/database function de Waesy.

### 3.10 Observabilidade

O logger/status do crawler acompanha estado e estatísticas; Request armazena retry count e error messages; `failedRequestHandler` permite registrar falha terminal. O pacote `@crawlee/otel` instrumenta automaticamente, quando configurado antes do import, spans de `run`, `handleRequest`, `runRequestHandler`, handlers de erro, request HTTP e navegação browser. Os spans carregam URL, método HTTP, Request ID e retry count; logs Crawlee podem ser encaminhados a OpenTelemetry logs. A documentação usa Jaeger para traces, mas alerta que Jaeger all-in-one não aceita OTLP logs; logs devem ir a Collector/backend compatível.

A adaptação ideal é correlacionar `request.id`/`uniqueKey`, `crawl_queue.id`, `source_domain`, `vertical`, `attempt`, `session_id` (sem vazar credenciais), status HTTP, `blocked_class`, `extraction_quality` e `publish_decision`. O audit log atual de Waesy deve receber o mesmo trace/span id quando possível. Métricas mínimas: requests por domínio e status, latência, bytes, retries, 429/403, robots-skipped, browser fallback rate, queue lag, items extracted/accepted/rejected, duplicate rate, cost per vertical e breaker state.

## 4. Comparação direta com o inventário/código Waesy

| Capacidade | Crawlee verificado | Waesy hoje (evidência conferida) | Lacuna/risco | Adaptação recomendada |
|---|---|---|---|---|
| Fila | `RequestQueue` persistente, dinâmica, BFS/DFS, dedupe por `uniqueKey`, reclaim | `crawler-batch-engine.ts` lê `crawl_queue`, loop sequencial, marca `processing`, incrementa `retry_count` | Não aparece claim/lease atômico; concorrência entre workers pode duplicar trabalho ou deixar `processing` órfão | Criar RPC de claim com lease/owner/heartbeat; adapter `IRequestManager` que converta rows em Request e finalize/reclame por idempotency key |
| Seeds/discovery | RequestList, sitemap loader, tandem, enqueueLinks com filtros/labels/depth | Seeds e URLs por vertical; RSS upsert por URL; `sitemap-crawler.engine.ts` existe | Discovery não está unificada num manager; risco de loops/duplicação por vertical | Unificar `WaesyRequest`/RequestQueue adapter e usar `uniqueKey` com `source + canonical URL + operation`; limitar host/domain/depth |
| Canonicalização | Normalização de URL e custom `uniqueKey` | SHA-256 canonical URL e remoção de UTM/fbclid/gclid/ref; URL canonicalizer | Chave Crawlee não conhece identidade de entidade/vertical; canonicalização diferente pode duplicar no Postgres | Manter canonicalizador Waesy como fonte de negócio; usar resultado como `uniqueKey` e manter `entity_key` separado |
| Politeness | pacing por domínio, robots opt-in, Crawl-delay, Retry-After, backoff e stall guard | UA rotativo, mapa de rate-limit, cooldown progressivo e `domain_cooldowns` Postgres; fetch retry | Parte do pacing está no utilitário/handler, não no scheduler; browser/provider paths podem divergir | Mover espera para manager/adaptador; usar `ThrottlingRequestManager` ou reproduzir contrato no claim scheduler; manter `domain_cooldowns` como fonte cross-process |
| Retries | `maxRequestRetries`, `errorHandler`, `failedRequestHandler`, `noRetry`, request errors | `fetchWithRetry` 3 tentativas 1/2s, statuses transitórios; circuit breaker 3/30s; Firecrawl fallback | Retry de fetch, provider e queue não têm uma política única; retries podem duplicar writes se handler captura/finaliza cedo | Handler lança; classificar transient/rate-limit/permanent; commit de resultado após sucesso; failed handler em tabela de dead-letter |
| Circuit breaker | Não é o mesmo que breaker de negócio; há retry/session/throttling | breaker global per-domain CLOSED/OPEN/HALF_OPEN, 30s, e cooldown persistido | Estado in-memory do breaker pode não coordenar workers | Preservar breaker Waesy; persistir estado/leases; não contar 429 já tratado pelo pacer como falha de identidade |
| HTTP | HTTP/Cheerio/JSDOM/LinkeDOM; MIME/JSON/XML/encoding/cookies | fetch nativo, Firecrawl, Jina, Steel placeholder; extrator mecânico | Provider fallback não uniforme; Steel não retorna DOM/conteúdo equivalente | HTTP crawler para aquisição primária, Firecrawl/Jina como provider explicitamente rotulado; não publicar placeholder |
| Browser | Playwright/Puppeteer via BrowserPool, hooks, wait, scroll, snapshots, remote browser | Não há Playwright/Puppeteer nos arquivos principais conferidos | Páginas JS dependem de provider screenshot/HTML; extração pode perder conteúdo | Introduzir browser lane allowlisted e limitada, com `maxConcurrency` baixo, timeout, snapshot sob demanda e custo auditado |
| Sessão/proxy | SessionPool; cookies+proxy+fingerprint; markGood/Bad/retire; persistência | UAs rotativos; proxy/provider externo no Firecrawl; sem pool de identidade no core Waesy | UA rotativa isolada não mantém cookie/IP/fingerprint coerentes | Opt-in SessionPool para crawlers autorizados; mapear session id e proxy info sem persistir segredo; manter proxy policy por fonte |
| Anti-bot | fingerprints browser default, `retryOnBlocked`, challenge helper, Impit hint | Cloudflare detector, cooldown, Steel screenshot fallback, strings de challenge | Risco de misturar bloqueio com falha de conteúdo; placeholder/event fallback pode contaminar dado | Tratar bloqueio como estado de aquisição; respeitar allowlist/ToS/robots; sem CAPTCHA/access-control bypass; evidência e `needs_review` |
| Extração | Handler agnóstico; `$`, `page`, body, JSON, parseWithCheerio, links | JSON-LD, meta, selectors, readability, specialized extractors | Extratores atuais espalhados por harvester/provider | Extrator puro recebe `NormalizedCrawlDocument`; handlers só navegam/coletam; integrity gate decide |
| Qualidade | Não é editorial; `failedRequestHandler` só falha técnica | integrity gate, Jaccard, hash, editorial squad e enrichment | Não confundir HTTP success com dado válido | Manter integrity/editorial; registrar quality decision no request transaction/result |
| Storage | FS queues/datasets/KVS, request transactions e locks locais | Supabase Postgres/RLS 537 tabelas; `crawl_queue`, raw/audit tables | Crawlee não é backend Supabase nativo nem substitui RLS | Persistir queue/result canônico em Supabase; usar FS/KVS para artefatos de run; adapter próprio |
| Observabilidade | Stats/status e `@crawlee/otel` spans/logs | `scraper_audit_log`, tokens/telemetry, logs de harvest | Falta correlação uniforme por request/attempt/domain e métricas scheduler | OTel + campos de correlação em audit; dashboards por domínio/vertical/status |
| Conformidade | robots é opt-in e sinais podem ser ignorados por manager simples | Não aparece política central robots/UA/terms no inventário conferido | Risco de fontes divergirem em ritmo/política | Source registry com `allowed`, robots policy, max RPS, UA, retention, legal owner; bloqueio de enqueue fora da política |

## 5. Adaptações Waesy propostas, em ordem de prioridade

### P0 — Corrigir sem trocar o stack

1. **Introduzir uma política de Request unificada.** Criar um objeto interno com `id`, `source`, `vertical`, `url`, `canonicalUrl`, `uniqueKey`, `operation`, `depth`, `priority`, `domain`, `attempt`, `maxAttempts`, `notBefore`, `leaseOwner`, `traceId` e `userData`. Mesmo que o executor continue em Supabase, adotar a semântica de Request do Crawlee.
2. **Claim/lease atômico para `crawl_queue`.** Implementar função Postgres/Supabase que, numa transação, selecione `pending` ou `processing` expirado por prioridade/`available_at`, grave `processing`, `lease_owner`, `lease_expires_at`, `attempt` e devolva a linha. Finalização deve ser condicionada ao owner/lease. Adicionar heartbeat e reclaim de leases expirados. Isso é a correção mais importante antes de aumentar concorrência.
3. **Separar retry de rate-limit.** Em 429/`Retry-After`, agendar `not_before` por domínio e não gastar tentativa da entidade. Em 5xx/timeouts, usar backoff limitado; em 401/403/challenge, classificar como bloqueio e decidir se aposenta identidade, abre breaker ou termina como `needs_review`. Não trocar proxy repetidamente como resposta automática a rate limit.
4. **Centralizar politeness por domínio.** Mover `checkRateLimit`/`waitForRateLimit` do handler para o scheduler/claim. Manter `domain_cooldowns` em Postgres para sobreviver a múltiplos workers. Cada source registry deve declarar escopo, delay mínimo, teto de RPS e política robots.
5. **Idempotência de resultado.** Toda publicação deve usar `entity_key`/`canonical_url_hash`/source-specific key e upsert ou unique constraint; o retry do mesmo Request pode executar novamente, mas não criar duas notícias/eventos/listings. O raw extraction deve conter `request_id`, attempt e provider.

### P1 — Usar Crawlee onde ele agrega valor

6. **Criar adapter Supabase → RequestManager.** Em vez de apontar o `RequestQueue` filesystem como sistema canônico, implementar um `IRequestManager` ou um bridge de `RequestList`/tandem que leia seeds do Supabase e escreva discovery/reclaim no Supabase. A interface deve respeitar `fetchNextRequest`, `markRequestAsHandled`, `reclaimRequest`, `addRequest(s)` e `recordPacingSignal`. Se um adapter completo for grande, começar com um producer/consumer bridge bem testado, explicitando semântica de at-least-once.
7. **Separar lanes HTTP e browser.** Uma `Http/CheerioCrawler` por conjunto de sources server-rendered/APIs; uma `PlaywrightCrawler` apenas para URLs em que sinais de JS o justifiquem. Compartilhar um governor de concorrência ou budgets equivalentes; limitar browser por CPU/memória/custo.
8. **Conectar os extratores existentes a um documento normalizado.** Os harvesters não devem saber se o documento veio de fetch, Crawlee HTTP, Firecrawl ou Playwright. Definir `{url, loadedUrl, status, headers, body?, html?, markdown?, screenshot?, provider, fetchedAt, requestId}`; `specialized-extractors`, `mechanical-extractor` e `integrity-gate` operam sobre isso. Provider fallback deve registrar sua causa e não mascarar placeholder como conteúdo.
9. **Rotas por label/vertical.** Usar labels como `pncp-list`, `pncp-detail`, `event-detail`, `job-detail`, `real-estate`, `auction`, `rss-article`; cada handler deve ter schema de userData e filtros de discovery. `maxCrawlDepth` e `maxRequestsPerCrawl` devem ser obrigatórios em jobs de discovery.
10. **Sessão somente quando necessário.** Para fonte autorizada que exige cookie/estado, usar SessionPool para manter cookie, proxy e fingerprint coerentes; persistir estado sensível apenas em storage protegido. Para API oficial PNCP, não adicionar browser/fingerprint/proxy sem necessidade.

### P2 — Confiabilidade editorial/observabilidade

11. **OTel com correlação Waesy.** Instrumentar Crawlee antes do import e adicionar span attributes de `crawl_queue_id`, vertical, source, provider, policy decision e result id. Não colocar token/cookie/proxy credentials em spans.
12. **Artefatos de evidência.** KVS/FS ou object storage pode guardar HTML/JSON bruto, response headers, screenshot e snapshot apenas em erro, amostra ou `needs_review`; Supabase guarda referência, hash e retenção. Dataset append-only pode servir a export de resultados intermediários, mas publicação canônica fica em Postgres.
13. **Dead-letter e replay.** `failedRequestHandler` deve gravar uma linha de falha classificada (`permanent`, `blocked`, `rate_limited`, `parse`, `storage`, `unknown`) com errors, loadedUrl, attempts e last provider. Um replay deve poder reabrir somente falhas transitórias ou uma fonte explicitamente autorizada.
14. **Testes de contrato.** Adicionar testes para claim concorrente de dois workers, lease expiry, dedupe de canonical URL, retry sem duplicar publish, 429 com Retry-After, robots skip, max depth, browser fallback, placeholder rejection, session retirement e OTel correlation. Os testes existentes cobrem dedupe/JSON-LD/geo/OSM, mas não demonstram essas garantias do scheduler.

## 6. Desenho de integração recomendado

```text
SourceRegistry (allowlist, terms/robots, rate policy, extractor)
          │ seeds
          ▼
Supabase crawl_queue  ←── RPC claim/lease/heartbeat/finalize
          │ adapter/bridge
          ▼
Crawlee Request / RequestManager
          ├─ Throttling/pacing por domínio + Retry-After
          ├─ shared ConcurrencySystem budget
          ├─ Http/Cheerio lane
          └─ Playwright lane (allowlisted, low concurrency)
          │ normalized document
          ▼
Waesy extractors → integrity gate → semantic dedupe → editorial/curator
          │ transaction + idempotency key
          ▼
Supabase raw extraction / canonical entities / audit log
          │
          └─ KVS/object evidence under retention policy + OTel trace
```

A decisão de publicação deve ser explicitamente posterior à aquisição e extração. `response.status === 200`, screenshot disponível ou Markdown de provider não são, sozinhos, evidência de conteúdo factual. Em especial, o código atual de `event-harvester.ts` deve deixar de preencher `startDate`, `venue` e `isFree` sintéticos quando não houver evento estruturado; isso é um risco de integridade independente de Crawlee.

## 7. Limites e caveats

- A análise é de um checkout do repositório, commit indicado acima; APIs e defaults podem mudar. Fixar versão e executar testes de integração antes de produção.
- O filesystem storage do Crawlee não é uma fila distribuída Supabase. Seu modo shared protege um caso de múltiplos processos que compartilham o storage on-disk; não demonstra claim distribuído sobre a tabela Postgres de Waesy.
- `respectRobotsTxtFile` é opt-in e falha de fetch de robots resulta em warning/ausência do arquivo no código verificado; Waesy precisa escolher e documentar uma política mais conservadora para fontes críticas.
- `retryOnBlocked`, fingerprints, proxy rotation e `handleCloudflareChallenge` não garantem acesso, não conferem permissão e não devem ser usados para burlar controles. O relatório não propõe CAPTCHA solving, bypass de login/paywall ou evasão de bloqueios explícitos.
- Dataset é append-only; KVS é record/file store; transações cobrem writes bufferizados do request, mas cross-storage é at-least-once em falha parcial. Supabase ainda precisa de constraints/upserts/idempotência.
- Browser é mais caro e não deve ser fallback indiscriminado. Steel screenshot, conforme o código Waesy conferido, não é equivalente a HTML/DOM e nunca deve ser tratado como conteúdo extraído.
- Não foi verificada uma integração nativa pronta do Crawlee com Supabase `crawl_queue`, nem um claim SQL específico para Waesy. Essa parte é engenharia nova.

## 8. Fontes exatas

### Repositório e código primário

1. https://github.com/apify/crawlee
2. https://github.com/apify/crawlee/tree/master/packages
3. https://github.com/apify/crawlee/blob/master/packages/basic-crawler/src/internals/basic-crawler.ts
4. https://github.com/apify/crawlee/blob/master/packages/basic-crawler/src/internals/autoscaling/concurrency_system.ts
5. https://github.com/apify/crawlee/blob/master/packages/basic-crawler/src/internals/throttling_request_manager.ts
6. https://github.com/apify/crawlee/blob/master/packages/basic-crawler/src/internals/session_pool/session_pool.ts
7. https://github.com/apify/crawlee/blob/master/packages/basic-crawler/src/internals/session_pool/session.ts
8. https://github.com/apify/crawlee/blob/master/packages/core/src/request.ts
9. https://github.com/apify/crawlee/blob/master/packages/core/src/storages/request_queue.ts
10. https://github.com/apify/crawlee/blob/master/packages/core/src/storages/request_manager.ts
11. https://github.com/apify/crawlee/blob/master/packages/http-crawler/src/internals/http-crawler.ts
12. https://github.com/apify/crawlee/blob/master/packages/browser-crawler/src/internals/browser-crawler.ts
13. https://github.com/apify/crawlee/blob/master/packages/playwright-crawler/src/internals/playwright-crawler.ts
14. https://github.com/apify/crawlee/blob/master/packages/core/src/proxy_configuration.ts
15. https://github.com/apify/crawlee/blob/master/packages/core/src/storages/dataset.ts
16. https://github.com/apify/crawlee/blob/master/packages/core/src/storages/key_value_store.ts
17. https://github.com/apify/crawlee/blob/master/packages/fs-storage/src/file-system-storage.ts
18. https://github.com/apify/crawlee/blob/master/packages/basic-crawler/src/internals/crawlers/statistics.ts

### Documentação oficial do repositório/site

19. https://crawlee.dev/js/docs/introduction
20. https://crawlee.dev/js/docs/guides/request-loaders
21. https://crawlee.dev/js/docs/guides/request-storage
22. https://crawlee.dev/js/docs/guides/result-storage
23. https://crawlee.dev/js/docs/guides/scaling-crawlers
24. https://crawlee.dev/js/docs/guides/session-management
25. https://crawlee.dev/js/docs/guides/avoid-blocking
26. https://crawlee.dev/js/docs/guides/trace-and-monitor-crawlers
27. https://github.com/apify/crawlee/blob/master/docs/introduction/03-adding-urls.mdx
28. https://github.com/apify/crawlee/blob/master/docs/guides/request_loaders.mdx
29. https://github.com/apify/crawlee/blob/master/docs/guides/request_storage.mdx
30. https://github.com/apify/crawlee/blob/master/docs/guides/result_storage.mdx
31. https://github.com/apify/crawlee/blob/master/docs/guides/scaling_crawlers.mdx
32. https://github.com/apify/crawlee/blob/master/docs/guides/session_management.mdx
33. https://github.com/apify/crawlee/blob/master/docs/guides/avoid_blocking.mdx
34. https://github.com/apify/crawlee/blob/master/docs/guides/trace-and-monitor-crawlers.mdx

### Inventário e código Waesy usados na comparação

35. `file:///home/ubuntu/waesy-audit/SYSTEM_INVENTORY.md` — inventário canônico local.
36. `file:///home/ubuntu/waesy-audit/src/services/mining/crawler-batch-engine.ts` — fila/lote.
37. `file:///home/ubuntu/waesy-audit/src/services/mining/automated-harvest.ts` — RSS/harvest e persistência.
38. `file:///home/ubuntu/waesy-audit/src/services/mining/mechanical-extractor.ts` — camadas de extração/fetch.
39. `file:///home/ubuntu/waesy-audit/src/lib/mining/scraper-utils.ts` — retry, UA, rate limit/cooldowns.
40. `file:///home/ubuntu/waesy-audit/src/lib/mining/crawler-circuit-breaker.ts` — breaker.
41. `file:///home/ubuntu/waesy-audit/src/lib/mining/firecrawl-client.ts` — providers/fallback.
42. `file:///home/ubuntu/waesy-audit/src/services/mining/integrity-gate.ts` — qualidade/dedupe.
43. `file:///home/ubuntu/waesy-audit/src/services/mining/specialized-extractors.ts` — JSON-LD e extratores.
44. `file:///home/ubuntu/waesy-audit/src/services/mining/event-harvester.ts` — extração/fallback de eventos.
45. `file:///home/ubuntu/waesy-audit/src/services/mining/industrial-crawlers.test.ts` — testes de mineração.

## Conclusão

Crawlee oferece a melhor referência encontrada para transformar Waesy de um conjunto de harvesters com loops, retries e cooldowns dispersos em um sistema de **requests duráveis, descoberta controlada, pacing por origem, backpressure, retries classificadas e observabilidade correlacionada**. A adaptação não deve substituir a governança de dados de Waesy: deve colocar Crawlee atrás de um adapter que preserve Supabase/RLS, constraints, canonicalização, integrity gate, curadoria editorial e auditoria. O primeiro passo é claim/lease idempotente da `crawl_queue` e política central de domínio; somente depois faz sentido habilitar concorrência maior ou browser rendering.
