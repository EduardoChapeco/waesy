# Auditoria de crawler — Scrapling (D4Vinci/Scrapling) e implicações para os mineradores Waesy

**ID:** `crawler-research-08-scrapling`  
**Data da inspeção:** 2026-10-06  
**Objeto:** projeto oficial [D4Vinci/Scrapling](https://github.com/D4Vinci/Scrapling), documentação oficial e código primário, comparados com `SYSTEM_INVENTORY.md` e `src/services/mining` do Waesy.  
**Snapshot local do Scrapling:** commit `43dee004866e1c46843a9ac293cc1494aa7915d6` (clone raso do repositório oficial).  

> Este documento é uma análise de arquitetura e código, não um teste de penetração nem uma validação de todos os sites-alvo. Capacidades descritas como suportadas pelo Scrapling são separadas de garantias operacionais: uma opção de browser, stealth ou proxy não garante acesso a um site específico, nem autoriza contornar controle de acesso.

## 1. Escopo, método e baseline Waesy

Foram examinados o README/repositório oficial, a documentação Read the Docs, o agent skill publicado pelo projeto e o código primário do spider engine, scheduler, throttle, checkpoint/cache, robots, requests/results, parser, sessões HTTP/browser e proxy rotator. Também foram lidos `/home/ubuntu/waesy-audit/SYSTEM_INVENTORY.md` e os 21 arquivos de `src/services/mining`, além dos utilitários diretamente importados em `src/lib/mining`.

O inventário informa 1.837 arquivos em `src/`, 537 tabelas, Supabase/Postgres 15+ com RLS, `pg_cron`, `pg_net` e `pgvector`, oito verticais de mineração e 21 arquivos em `src/services/mining`. O Waesy já possui uma base de produção mais orientada a dados do que um spider local: `crawl_queue` e tabelas de entidades no Supabase, logs em `scraper_audit_log`, extratores mecânicos por domínio/tipo, APIs oficiais (PNCP, DataJud, BCB), circuit breaker, cooldown de domínio, deduplicação e um integrity gate.

A comparação correta, portanto, não é “trocar Waesy por Scrapling”. Scrapling é um motor Python integrado de fetching, parsing e spiders; o inventário Waesy é um ecossistema TypeScript/Supabase que já contém fila, persistência e regras editoriais. O uso de maior valor é incorporar padrões de execução do Scrapling em um worker de mineração, preservando Postgres como sistema de registro e acrescentando apenas as capacidades que faltam.

## 2. Arquitetura real do Scrapling

### 2.1 Camadas e ciclo de vida

O projeto reúne quatro camadas que podem ser usadas independentemente:

1. **Fetchers:** `Fetcher`/`AsyncFetcher` sobre `curl_cffi` para HTTP, `DynamicFetcher` sobre Playwright/Chromium para JavaScript e `StealthyFetcher` sobre Patchright/Chromium para cenários que exigem uma sessão de browser mais realista.
2. **Parser:** `Selector`/`Selectors`, baseado em HTML/lxml, com CSS, XPath, procura por texto, filtros, regex, JSON e conversão para Markdown.
3. **Spiders:** uma API assíncrona no estilo Scrapy. O spider declara `start_urls`, `parse` produz itens e/ou `Request`, e o engine coordena scheduler, sessões, callbacks, retries, throttling, robots, stats, hooks e encerramento.
4. **Operação auxiliar:** sessões reutilizáveis, templates de sitemap/XML/CSV/Shopify, exporters JSON/JSONL/CSV/XML, cache de desenvolvimento, checkpoint/resume e MCP/agent skill.

O fluxo efetivo é: `Spider.start_requests()`/`start_urls` → `Scheduler` → `Engine` adquire limite global e/ou por domínio → `SessionManager` escolhe `sid` → fetcher devolve `Response` → engine aplica bloqueio/retry e atualiza `CrawlStats` → callback emite item ou novas requests → exporter/stream/hook recebe itens. O código não é um serviço distribuído de fila: a fila do spider vive no processo e o checkpoint é um estado local serializado.

A documentação de overview afirma explicitamente que o alvo de spiders é oferecer crawls concorrentes, multi-session e com pause/resume; a comparação com Waesy deve considerar que “concorrente” não significa, por si só, worker distribuído com lease transacional.

### 2.2 Scheduler, fingerprint e prioridade

O `Scheduler` usa uma priority queue assíncrona. A prioridade é ordenada de forma que requests de maior prioridade sejam processadas primeiro. O fingerprint padrão combina URL normalizada, método HTTP, corpo, `sid` e, conforme a configuração, kwargs, headers e fragmentos. O fingerprint é usado tanto para deduplicar como para indexar checkpoint/cache.

`dont_filter=True` permite uma request repetida; isso é útil para polling, mas também é uma forma explícita de desabilitar a proteção contra loops e deve ser auditado. O scheduler não é uma fila Kafka/Redis/Supabase; sua durabilidade vem do `crawldir` opcional, não de uma tabela compartilhada entre réplicas.

O `Request` carrega `callback`, `errback`, `priority`, `meta`, `sid`, kwargs de sessão e opções de fingerprint. `response.follow()` herda contexto da request anterior, inclusive `sid` e kwargs, salvo substituição explícita. Esse detalhe evita que uma cadeia descubra páginas com HTTP e, acidentalmente, troque para browser ou para outra sessão.

### 2.3 Concorrência, fila e lifecycle

O engine utiliza `anyio` e limitadores de capacidade: um limite global e, quando configurado, um limite por domínio. A documentação descreve que o engine não deixa mais do que a concorrência global de requests ativas e que o limite por domínio impede que um host consuma toda a capacidade. `download_delay` é aplicado por domínio, não como um simples `sleep` global que paralisa tudo.

O engine espera as requests em voo terminarem em encerramento normal ou pausa graciosa. Hooks (`on_start`, `on_close`, `on_error`, `on_scraped_item`) e `stream()` dão pontos claros para métricas, exportação ou uma camada de persistência externa. O `stream()` é particularmente útil para um worker que precisa entregar itens à medida que chegam, sem esperar o crawl inteiro.

### 2.4 Discovery e templates

O núcleo não impõe um único discovery. O spider pode enfileirar links no callback, e os templates adicionam padrões úteis: `CrawlSpider`/`LinkExtractor` com allow/deny, domínios permitidos, CSS/XPath e extensões; `SitemapSpider`; `XMLFeedSpider`; `CSVFeedSpider`; e `ShopifySpider`. O fingerprint/canonicalização do LinkExtractor reduz links equivalentes, mas a política de domínio continua sendo responsabilidade da configuração.

RSS/Atom e sitemap são caminhos estruturados melhores do que raspar todos os links de uma página. Para Waesy, isso se encaixa ao fluxo já existente de feeds, mas permite unificar discovery em vez de manter regex e listas específicas por serviço.

## 3. Politeness, robots.txt, retries e bloqueios

### 3.1 Robots e limites por origem

O suporte a `robots.txt` está implementado no `robotstxt.py` com `Protego`. O manager busca/cacheia regras por `netloc`, pode consultar `can_fetch` e interpreta `Crawl-delay` e `Request-rate`. O engine pode pré-carregar os robots dos domínios iniciais.

A caveat importante é factual: a documentação e a configuração do spider deixam `robots_txt_obey=False` por padrão. Logo, Scrapling **tem** suporte a robots, mas não é correto afirmar que todo crawl Scrapling é automaticamente compatível. Para Waesy, a configuração recomendada deve inverter explicitamente isso para `True`, registrar o user-agent usado e permitir uma denylist adicional de domínios/paths.

### 3.2 AutoThrottle

O `AutoThrottle` estima latência e ajusta o delay de cada domínio conforme `target_concurrency`, limitando-o entre `autothrottle_start_delay` e `autothrottle_max_delay`. O comportamento de erro é deliberadamente conservador: resposta bloqueada/não-2xx aumenta o delay, e `Retry-After` numérico ou em formato HTTP-date é respeitado dentro do teto configurado. `Crawl-delay`/`Request-rate` de robots funcionam como pisos.

A documentação nota duas condições operacionais relevantes: a latência medida inclui retries internos e, em browsers, o tempo de render; e delays aprendidos não são checkpointados, voltando ao start delay após resume. Isso deve ser observado para que um restart não seja interpretado como licença para acelerar subitamente.

### 3.3 Retries e blocked requests

Em spider, bloqueio é uma decisão separada da exceção de transporte. A configuração padrão lista códigos como 401, 403, 407, 429, 444, 500, 502, 503 e 504 como bloqueáveis; o spider pode sobrescrever `is_blocked` e `retry_blocked_request`. O número de retries de bloqueio é limitado por configuração (`max_blocked_retries`). Para HTTP, o fetcher usa retries de baixo nível; o static engine tenta a request pelo menos uma vez e, em erro `CurlError`, espera `retry_delay` entre tentativas.

Esse desenho é melhor do que retry indiscriminado: 429 deve respeitar Retry-After; 403/401 não devem ser martelados; falha de proxy pode justificar trocar proxy, mas falha de conteúdo ou de autorização não. O projeto possui `ProxyRotator` thread-safe, estratégia cíclica substituível e reconhecimento de erros de conexão/proxy. Não há, entretanto, um mecanismo mágico para determinar que uma política de bloqueio permite rotação de IP.

## 4. Browser, rendering e sessões

### 4.1 Seleção progressiva de fetcher

A documentação recomenda escolher o menor grau de complexidade que funciona: HTTP para HTML/API já renderizado, dynamic browser quando JavaScript/DOM é necessário e stealth browser somente quando o site autorizado exige uma sessão Chromium mais completa. Esse princípio reduz custo, memória, superfície de falhas e impacto sobre o site.

Uma spider pode registrar várias sessões nomeadas. Por exemplo, uma `FetcherSession` HTTP pode coletar listagens e uma `AsyncDynamicSession` ou `AsyncStealthySession` pode buscar somente detalhes. `lazy=True` evita iniciar browser sem necessidade; sessões persistem cookies/estado durante o crawl e fecham automaticamente ao encerrar. `max_pages` controla o page pool do browser; em async, o código espera uma página livre em vez de abrir indefinidamente.

### 4.2 Recursos do browser observados no código

As sessões de browser oferecem waits de load/DOM/network-idle, `wait_selector`, `page_setup`, `page_action`, headers/cookies, user data dir, CDP/Chrome real, interceptação de recursos e captura de XHR/fetch por regex. `disable_resources` reduz imagens, fontes, mídia, websocket e outros recursos quando isso não prejudica a extração; `blocked_domains` bloqueia hosts de subrecursos.

O browser base mantém um pool de páginas e instala rotas de interceptação. Ao capturar XHR, o código guarda respostas cujo resource type é `xhr` ou `fetch` e cuja URL casa com o regex. Esse é um padrão útil para portais que exibem no DOM apenas uma parte dos dados, desde que a captura respeite autorização, privacidade e termos do alvo.

### 4.3 Stealth e limites legais

O código do `StealthySession` usa Patchright, configurações de contexto e opções como `block_webrtc`, ruído de canvas, WebGL, locale/timezone, proxy e user data dir. Há também uma rotina publicada para challenges Cloudflare, limitada a três tentativas internas. O README/documentação usam linguagem de bypass/Cloudflare, mas isso é capacidade técnica publicada, **não** autorização legal nem garantia de sucesso.

Para Waesy, o modo stealth não deve ser o fallback automático para “qualquer 403”. O contrato operacional recomendado é: somente domínios previamente autorizados/permitidos; robots e termos verificados; user-agent transparente quando o contrato exigir; sem tentar CAPTCHA/Turnstile, sem contornar paywall/login, sem coletar dados pessoais fora da finalidade e sem usar proxy rotativo para ocultar abuso. Ao detectar challenge, registrar `blocked/challenge`, aplicar cooldown/quarentena e encaminhar para uma rota autorizada (API, feed, exportação do proprietário ou aprovação humana).

## 5. Parser, extração e estabilidade de seletores

### 5.1 Extração determinística

`Selector` cobre CSS, XPath, texto, atributos, regex, JSON e navegação. O `Response` é um selector enriquecido, com status, headers, cookies, histórico, request metadata, corpo e XHR capturado. `markdown()` converte a página para Markdown; a documentação também apresenta o uso em RAG, com sanitização e `main_content_only`, quando o extra apropriado está instalado.

A separação entre fetch e parser é importante para Waesy: uma mesma função de extração pode consumir HTTP, browser ou fixture/cache, reduzindo acoplamento a Firecrawl. A extração não depende de LLM para CSS/XPath e pode produzir um documento bruto auditável antes de qualquer curadoria.

### 5.2 Adaptive parser

O recurso `adaptive` é um mecanismo determinístico de tolerância a drift. Com `auto_save=True`, o selector salva propriedades do primeiro elemento encontrado, indexadas por URL/base domain e identificador. Se o selector falhar em uma execução posterior e `adaptive=True`, o parser recupera essas propriedades e procura um elemento estruturalmente semelhante. A comparação considera tag, profundidade, pai/avós, atributos, texto e siblings, usando similaridade de sequências; o limiar padrão documentado é 40%.

Isso não é um modelo de IA, não “entende” semanticamente o campo e não prova que o elemento recuperado é o correto. O código salva somente o primeiro elemento selecionado; a própria documentação lista limitações de seletores compostos. O identificador deve ser estável e explícito (por exemplo, `article.title`, `job.salary`), e a recuperação precisa ser validada por schema/quality gate antes da persistência.

A persistência default é SQLite; o projeto oferece `StorageSystemMixin` e um exemplo de adaptador Redis. O contrato exige `save`/`retrieve` e unicidade de `(url, identifier)`; em uso concorrente o adaptador deve ser thread-safe. Esse é um ponto direto de integração com Postgres/Redis do Waesy, mas não se deve confundir o adaptador adaptive com o armazenamento canônico de itens do crawl.

## 6. Checkpoint, cache, storage e observabilidade

### 6.1 Checkpoint/resume

Com `crawldir`, o engine grava periodicamente e em Ctrl+C uma representação local da fila pendente e do conjunto de fingerprints já vistos. O arquivo é escrito atomicamente (temporário + rename), restaura callbacks pelo nome e, ao retomar, evita chamar `start_requests()` novamente. Após conclusão normal o checkpoint é removido. A configuração de intervalo padrão documentada é 300 segundos.

Esse mecanismo resolve pausa/resume de um spider, mas não substitui uma fila durável multi-worker: o estado é local, usa pickle confiável apenas no ambiente do próprio processo e não oferece lease/claim em banco. O Waesy deve manter Supabase como autoridade e usar checkpoint apenas como recuperação local de um worker, se necessário.

### 6.2 Cache de desenvolvimento

O `development_cache` salva respostas em JSON por fingerprint, com body em base64 e escrita atômica. Hit de cache pula rede, delay, rate limit e retry de bloqueio; ainda conta nas estatísticas, com contadores de hits/misses. A documentação avisa que não há expiração automática e o recurso é para desenvolvimento/reprodução, não uma política de freshness de produção.

Esse padrão é valioso para testes de selectors do Waesy e para fixtures de regressão, mas não pode ser usado inadvertidamente em produção para mascarar 429, conteúdo expirado ou retirada de consentimento.

### 6.3 Stats, exports e hooks

`CrawlStats` agrega contadores de requests, responses por status, bytes, erros, retries, bloqueios, robots disallowed, cache hits/misses e itens. Hooks e `stream()` expõem ciclo de vida e itens em tempo real. Exporters cobrem JSON/JSONL/CSV/XML. O Scrapling não oferece, por si só, a telemetria de negócio específica do Waesy (quality score, publicação, tabela de entidade, custo de token); essa ponte precisa ser implementada.

## 7. Comparação direta com o Waesy atual

| Área | Scrapling verificado | Waesy verificado | Diagnóstico |
|---|---|---|---|
| Fila | Priority queue async, fingerprint, dedupe, `dont_filter`, checkpoint local | `crawl_queue` no Supabase, prioridade desc + idade, lote default 5 | Waesy tem durabilidade e integração; falta claim/lease seguro, fingerprint de request e execução concorrente controlada |
| Concorrência | Limite global e opcional por domínio, async capacity limiter | `for` sequencial no `crawler-batch-engine.ts` | Gap claro: domínio lento bloqueia o lote e não existe fairness por origem |
| Discovery | callbacks, LinkExtractor, Sitemap, XML/CSV feeds, canonicalização | RSS/Atom por regex + quatro padrões; fila por `upsert(url)`; outros engines existem em `src/lib/mining` | Scrapling oferece primitives gerais; Waesy deve manter adaptadores verticais e normalizar discovery |
| Robots/politeness | Protego, `can_fetch`, crawl-delay/request-rate, AutoThrottle; robots default off | Não foi observado `robots.txt`/crawl-delay no caminho dos miners lidos; cooldown/rate state próprios | Waesy tem proteção reativa, não conformidade preventiva por origem |
| Retry | Retry de fetch + blocked retry separado, Retry-After, backoff/throttle | `fetchWithRetry` tem 408/429/5xx, backoff e Retry-After; mecânico usa 2 retries; circuit threshold 3/cooldown 30s | Waesy já é bom no transporte; falta política uniforme e estado distribuído/observável |
| Browser | HTTP/dynamic/stealth sessions, page pool, waits, XHR | Firecrawl remoto; native fetch; Steel screenshot fallback devolve HTML placeholder; extrator mecânico não renderiza JS | Não afirmar que fallback Steel extrai DOM. Para JS, integrar worker browser somente em rotas autorizadas |
| Extração | CSS/XPath/text/regex/JSON/Markdown, adaptive selector | JSON-LD, OG/meta, seletores por portal, densidade/readability, JSON-LD vertical | Waesy tem conhecimento de domínio; Scrapling oferece uma camada comum e adaptive como fallback, não substituição do integrity gate |
| Storage | SQLite adaptive/cache/checkpoint; adaptadores customizáveis; estado do spider local | Supabase/Postgres e tabelas de negócio, RLS, upsert e logs | Preservar Postgres; usar storage adaptado só para selector state/fixtures e nunca como único queue store |
| Observabilidade | `CrawlStats`, hooks, stream, cache counters | `scraper_audit_log` e relatórios por serviço, `console.warn/error`, métricas não uniformes | Mapear stats para um schema único e correlacionar `crawl_queue_id`, fingerprint, domínio e tentativa |
| Anti-bot | stealth, proxies, challenge handling publicado | UA rotativo, cooldown 403/Cloudflare, Jina, Firecrawl/Steel | Possibilidade técnica não deve virar evasão automática; acrescentar governança e abort/quarantine |

### 7.1 Pontos fortes que Waesy já possui

O Waesy não deve perder suas vantagens. `crawler-batch-engine.ts` roteia oito entidades e persiste estado por item; `pncp-extractor.ts` usa endpoint oficial, cache de cinco minutos e mapeamento tipado; DataJud/BCB/Overpass têm adaptadores de fonte apropriados; `scraper-utils.ts` trata `Retry-After`, backoff e cooldown de domínio; `crawler-circuit-breaker.ts` tem estados CLOSED/OPEN/HALF_OPEN; `integrity-gate.ts` rejeita conteúdo curto, captcha e matéria sem corpo; a deduplicação semântica usa janela e limiares explícitos; e há auditoria no Supabase.

O `mechanical-extractor.ts` também tem uma cadeia clara: JSON-LD, meta/OpenGraph, selectors e readability/densidade, sem LLM. O `editorial-squad.ts` valida saída com Zod e tem fallback determinístico, o que separa extração factual de curadoria. Esses componentes devem continuar sendo os gates de qualidade e publicação.

### 7.2 Gaps e riscos prioritários

1. **Claim concorrente não demonstrado.** O batch faz `select pending` e depois atualiza cada item para `processing`. Duas execuções podem selecionar o mesmo item antes do update; o `.eq("id", item.id)` não demonstra lease nem condição `status=pending`. `retry_count` é incrementado no claim, mas não há nesta função backoff/`next_attempt_at`/limite de tentativas.
2. **Sem fairness por domínio no batch.** O loop sequencial não limita concorrência por host, não consulta robots e não coordena `Retry-After` entre workers. Os cooldowns existem no utilitário, mas `checkRateLimit` não aparece conectado ao batch como uma política universal.
3. **Browser e provider semantics estão misturados.** `firecrawl-client.ts` tenta Firecrawl, native fetch e Steel; o sucesso Steel retorna URL de screenshot e um HTML placeholder. Isso não pode alimentar um extractor que espera DOM real sem um passo explícito de OCR/visão ou browser DOM autorizado.
4. **Estado de proteção é parcialmente local.** Circuit breaker e rate state estão em memória; cooldown é persistido em background, mas a decisão pode ocorrer antes da persistência e não é uma transação de lease global. O comportamento em múltiplos workers precisa ser consolidado no banco.
5. **Discovery limitado no caminho principal.** `rss-ingester.engine.ts` usa regex para RSS/Atom, testa apenas quatro padrões se não acha `<link>`, e o batch limita a 15 itens por feed. Isso é simples e útil, mas não cobre sitemap/links paginados/rel canonical com a generalidade do LinkExtractor.
6. **Telemetria fragmentada.** Há audit logs robustos em alguns serviços (por exemplo, indicadores BCB e harvest automatizado), porém também há `console` e retornos booleanos. Não há uma linha única por tentativa com latência, status, retry, provider, selector version, bytes, challenge e fingerprint.
7. **Idempotência editorial incompleta.** Em `crawler-batch-engine.ts`, slug usa `Date.now()`; a dedupe por `source_url` reduz duplicatas de publicação, mas ainda há janelas de concorrência e nomes não determinísticos. A publicação deve ficar atrás de chave/idempotency key e uma transação/upsert.

## 8. Adaptação recomendada: Scrapling como worker de fetch/parse, Supabase como autoridade

### 8.1 Arquitetura alvo

A recomendação é um **worker Python Scrapling**, separado do BFF TypeScript, consumindo uma fila Waesy por RPC/endpoint interno. O worker deve receber um item com `crawl_queue_id`, URL, `entity_type`, domínio, prioridade, política de sessão e versão do extractor. O Postgres continua sendo o sistema de registro dos estados e itens; Scrapling fornece execução, rendering, parser, limits e stats.

Fluxo proposto:

```text
Supabase crawl_queue
  -> claim transacional (FOR UPDATE SKIP LOCKED / RPC, lease_until, worker_id)
  -> política de domínio (allowlist, robots, cooldown, next_attempt_at)
  -> Request fingerprint + prioridade local
  -> Scrapling Spider/SessionManager
       HTTP Fetcher -> Dynamic (se JS necessário) -> revisão autorizada
       AutoThrottle + per-domain limiter + retry/Retry-After
       Response + metadata + CrawlStats
  -> parser CSS/XPath/JSON/Markdown + adaptive fallback versionado
  -> schema/integrity gate Waesy
  -> raw response/artifact + entidade + audit attempt
  -> complete / retryable / blocked_quarantine / permanent_failed
```

Não se deve montar uma segunda fila distribuída no SQLite/checkpoint do Scrapling. O checkpoint pode auxiliar a retomada de um processo individual, mas `lease_until`, `attempt`, `next_attempt_at`, `last_error`, `status`, `worker_id` e idempotency key precisam ficar no Supabase.

### 8.2 P0 — segurança de execução e fila

**Implementar claim atômico e lease.** Criar uma função SQL/RPC que selecione itens elegíveis (`pending` ou `retryable`, `next_attempt_at <= now()`, tentativa abaixo do teto), trave com `FOR UPDATE SKIP LOCKED`, marque `processing`, grave `worker_id`, `claimed_at`, `lease_until` e retorne o lote. O ack deve exigir `id` + `worker_id`/lease. Um watchdog devolve leases expirados para retryable.

**Adicionar fingerprint e idempotência.** Canonicalizar URL, método, corpo e parâmetros relevantes; persistir `request_fingerprint` e `extractor_version`. O padrão de fingerprint do Scrapling é uma boa referência, mas os campos de negócio do Waesy (entity type, source, store) devem fazer parte da chave quando necessário.

**Separar estados.** Usar pelo menos `completed`, `retryable`, `blocked_quarantine`, `permanent_failed` e `processing`. Um 429 com Retry-After é retryable; 401/403 sem autorização de reconsulta é quarantine; schema inválido após tentativas é permanent failure ou revisão, não retry infinito.

### 8.3 P0 — politeness e governança

Instanciar `robots_txt_obey=True`, `download_delay` inicial conservador, `concurrent_requests_per_domain` baixo e AutoThrottle com teto. Persistir no audit o resultado de `can_fetch`, regras observadas e user-agent. Complementar robots com allowlist de domínios, paths autorizados e denylist interna.

Usar o `Retry-After` tanto do utilitário atual como da política de domínio do worker. O cooldown deve ser atômico e compartilhado no Postgres; a memória local pode ser cache de leitura, não decisão exclusiva.

Adicionar uma política explícita: **challenge = parar/quarentenar por padrão**, não trocar para stealth/proxy automaticamente. A exceção deve exigir configuração de origem autorizada, base legal/contratual, janela e aprovação. Não contornar login, paywall ou CAPTCHA; preferir API, feed, sitemap, exportação do proprietário ou contato com a origem.

### 8.4 P1 — rendering econômico e observável

Configurar três sessões no `SessionManager`, mas roteá-las por tipo de fonte:

- `http`: FetcherSession/curl para APIs, RSS, HTML estático e listagens;
- `dynamic`: AsyncDynamicSession, `wait_selector`/network-idle e `capture_xhr` apenas quando a página pública autorizada depende de JS;
- `reviewed_browser`: sessão segregada, desabilitada por default, para alvos explicitamente aprovados. Não chamar `solve_cloudflare` por default.

A listagem deve usar HTTP; só detalhes que falharam por ausência de conteúdo no HTML devem subir de nível. Registrar `provider/session_id`, render duration, page count, captured XHR count, blocked resource domains e bytes. Se o alvo é uma API pública, chamar a API diretamente em vez de renderizar browser.

### 8.5 P1 — extração e drift

Migrar progressivamente os extratores de notícias/empregos/eventos para receber um `Response` Scrapling, mas manter os mapeamentos de JSON-LD/OG/CSS do Waesy. Usar `response.css`, XPath e `response.json()` para reduzir regex frágil; usar `response.markdown(main_content_only=True)` apenas como entrada textual, nunca como prova suficiente de campos críticos.

Ativar `adaptive=True` somente em selectors não críticos ou com fallback validado. Salvar identificadores estáveis, limiar, selector original, selector recuperado, score e versão do schema. Persistir no Postgres/Redis um adaptador equivalente ao `StorageSystemMixin`, com chave `(source_domain, template_version, identifier)`; não sobrescrever silenciosamente uma recuperação de baixa confiança. O integrity gate atual deve continuar rejeitando título genérico, corpo curto, captcha, repetição e campos inválidos.

Para cada item, guardar o artefato necessário à auditoria: URL final, status, headers relevantes sem segredos, hash do body, timestamp, provider, fingerprint, selector/template version e motivos de fallback. Bodies completos podem exigir retenção limitada, redaction e política LGPD.

### 8.6 P1 — telemetria unificada

Criar uma tabela/estrutura de `crawler_attempts` ou estender `scraper_audit_log` com: `crawl_queue_id`, `request_fingerprint`, domínio, worker, session/provider, attempt, started/finished, status HTTP, error class, retry-after, throttled_ms, robots decision, blocked/challenge flag, bytes, selector drift score, records extracted/inserted, cache hit, render time e trace/correlation id.

Mapear `CrawlStats` e hooks do Scrapling para essa estrutura. A conclusão de um lote deve retornar contagens consistentes (`found`, `fetched`, `parsed`, `accepted`, `quarantined`, `retried`, `inserted`, `published`) e não apenas `succeeded/failed`. Métricas de publisher/LLM continuam separadas das de transporte.

### 8.7 P2 — discovery, fixtures e testes

Usar LinkExtractor com allow/deny e canonicalização para páginas de portais; incorporar SitemapSpider quando o portal expõe sitemap; manter `rss-ingester.engine.ts` para fontes RSS/Atom, mas normalizar o resultado no mesmo fingerprint/queue contract. Evitar ampliar discovery sem limite: profundidade, extensões, host allowlist e máximo de itens devem ser explícitos.

Adotar o cache de desenvolvimento do Scrapling apenas em ambiente de fixture. Criar testes de contrato para: robots disallow; 429 com Retry-After; 403 challenge; timeout; redirect para host não permitido; dedupe; resume; selector original e adaptive; JSON-LD incompleto; browser XHR; e idempotência de publicação. Os testes oficiais do Scrapling para scheduler, robots, throttle, checkpoint, adaptive e proxy são referências de comportamento, não substitutos dos testes Waesy.

## 9. O que não deve ser copiado sem adaptação

- **Não trocar Supabase por SQLite.** O SQLite default é suficiente para adaptive state de um spider local, mas não para a fila, RLS, publicação e auditoria multi-worker do Waesy.
- **Não assumir que checkpoint é fila distribuída.** Ele é local e serializado; lease/claim deve continuar no Postgres.
- **Não ligar robots “porque existe”.** No Scrapling o suporte é configurável e default off; Waesy deve ligar e auditar.
- **Não tratar stealth, impersonation, Google referer, proxy rotation ou solver como política de retry.** São controles de transporte/browser com risco jurídico e operacional, não resposta genérica a falhas.
- **Não usar cache de desenvolvimento como cache de produção.** A documentação informa ausência de expiração e bypass de rede/rate limit.
- **Não aceitar adaptive selector sem validação.** Similaridade estrutural não garante semântica; campos financeiros, datas, nomes, CNPJ/CPF, preço e status devem passar validators e integrity gate.
- **Não publicar diretamente da primeira extração.** O pipeline Waesy deve manter raw → mechanical validation → entity upsert → curation → publication, com idempotency key.
- **Não alegar que Steel fallback extrai HTML.** No código Waesy examinado, ele retorna screenshot URL e HTML placeholder; requer uma decisão explícita de OCR/visão ou outro DOM fetch para ser útil ao extractor.

## 10. Roadmap executável

| Prioridade | Entrega | Critério de aceite |
|---|---|---|
| P0 | RPC de claim/lease + watchdog | Duas execuções não processam o mesmo item; lease expirado é recuperável |
| P0 | Robots/allowlist/quarantine | Toda tentativa grava decisão robots; challenge não dispara bypass automático |
| P0 | Política de retry por classe | 429 usa Retry-After; 401/403 e challenge não entram em loop; timeout possui teto |
| P1 | Worker Scrapling HTTP com Supabase | RSS/API/HTML estático entram e saem pela mesma fila, com fingerprint e audit |
| P1 | AutoThrottle + limiter por domínio | Concorrência e delay por host observáveis e respeitam teto configurado |
| P1 | Adapter browser progressivo | Dynamic só é usado quando regra da fonte exige; session/page metrics persistem |
| P1 | Parser bridge + adaptive versionado | Drift recuperado apenas acima do limiar e aprovado pelo schema/integrity gate |
| P1 | Schema unificado de attempts | `CrawlStats` e logs Waesy podem ser correlacionados por queue id/fingerprint |
| P2 | Sitemap/LinkExtractor e fixtures | Discovery com host/depth/extension policies e testes replayáveis |
| P2 | Canary vertical | Uma fonte autorizada por vertical comprova custo, latência, qualidade e taxa de bloqueio |

## 11. Conclusão

Scrapling é uma boa referência para tornar o fetching do Waesy menos ad hoc: fornece uma separação limpa entre HTTP, browser e parser; scheduler com fingerprint; limites globais/por domínio; AutoThrottle; robots; blocked-retry; sessões nomeadas; captura de XHR; checkpoint/cache de desenvolvimento; adaptive selectors; exporters; hooks e stats. O projeto é mais forte como **motor de execução e parsing por worker** do que como substituto do domínio de dados e publicação do Waesy.

O principal ganho não é “mais stealth”. É fazer o pipeline obedecer à origem: claim atômico, robots/allowlist, concorrência por domínio, Retry-After, retries classificados, artifacts e stats uniformes, enquanto mantém APIs oficiais, integrity gate, dedupe e Postgres. Stealth/browser e qualquer tratamento de challenge devem ficar atrás de uma política de autorização explícita; quando essa autorização não existe, a resposta correta é parar, registrar e usar uma fonte oficial ou pública alternativa.

## Sources — URLs exatas

As fontes primárias abaixo foram consultadas no repositório/documentação oficiais. Os links de código apontam para `main`; o snapshot local analisado foi o commit indicado no cabeçalho.

1. Repositório oficial: https://github.com/D4Vinci/Scrapling
2. README oficial: https://github.com/D4Vinci/Scrapling/blob/main/README.md
3. Documentação oficial/index: https://scrapling.readthedocs.io/en/latest/index.html
4. Overview de capacidades e escolhas: https://scrapling.readthedocs.io/en/latest/overview.html
5. Arquitetura de spiders: https://scrapling.readthedocs.io/en/latest/spiders/architecture.html
6. Getting started de spiders: https://scrapling.readthedocs.io/en/latest/spiders/getting-started.html
7. Recursos avançados (concurrency, AutoThrottle, checkpoint/cache/stream): https://scrapling.readthedocs.io/en/latest/spiders/advanced.html
8. Requests/responses: https://scrapling.readthedocs.io/en/latest/spiders/requests-responses.html
9. Sessions: https://scrapling.readthedocs.io/en/latest/spiders/sessions.html
10. Proxy e blocked handling: https://scrapling.readthedocs.io/en/latest/spiders/proxy-blocking.html
11. Escolha de fetcher: https://scrapling.readthedocs.io/en/latest/fetching/choosing.html
12. Fetching HTTP estático: https://scrapling.readthedocs.io/en/latest/fetching/static.html
13. Fetching dinâmico: https://scrapling.readthedocs.io/en/latest/fetching/dynamic.html
14. Fetching stealthy: https://scrapling.readthedocs.io/en/latest/fetching/stealthy.html
15. Seleção/adaptive parsing: https://scrapling.readthedocs.io/en/latest/parsing/adaptive.html
16. Sistema de storage adaptive: https://scrapling.readthedocs.io/en/latest/development/adaptive_storage_system.html
17. Agent skill oficial: https://github.com/D4Vinci/Scrapling/blob/main/agent-skill/Scrapling-Skill/SKILL.md
18. Engine primário: https://github.com/D4Vinci/Scrapling/blob/main/scrapling/spiders/engine.py
19. Scheduler primário: https://github.com/D4Vinci/Scrapling/blob/main/scrapling/spiders/scheduler.py
20. Throttle primário: https://github.com/D4Vinci/Scrapling/blob/main/scrapling/spiders/throttle.py
21. Checkpoint e cache: https://github.com/D4Vinci/Scrapling/blob/main/scrapling/spiders/checkpoint.py
22. Cache de desenvolvimento: https://github.com/D4Vinci/Scrapling/blob/main/scrapling/spiders/cache.py
23. Robots: https://github.com/D4Vinci/Scrapling/blob/main/scrapling/spiders/robotstxt.py
24. Requests: https://github.com/D4Vinci/Scrapling/blob/main/scrapling/spiders/request.py
25. Results/stats: https://github.com/D4Vinci/Scrapling/blob/main/scrapling/spiders/result.py
26. Parser primário: https://github.com/D4Vinci/Scrapling/blob/main/scrapling/parser.py
27. Fetcher HTTP primário: https://github.com/D4Vinci/Scrapling/blob/main/scrapling/engines/static.py
28. Browser base/page pool/XHR: https://github.com/D4Vinci/Scrapling/blob/main/scrapling/engines/_browsers/_base.py
29. Stealth session/challenge handling: https://github.com/D4Vinci/Scrapling/blob/main/scrapling/engines/_browsers/_stealth.py
30. Proxy rotator: https://github.com/D4Vinci/Scrapling/blob/main/scrapling/engines/toolbelt/proxy_rotation.py
31. Inventário comparado: arquivo local `/home/ubuntu/waesy-audit/SYSTEM_INVENTORY.md`
32. Código Waesy comparado: diretório local `/home/ubuntu/waesy-audit/src/services/mining` e utilitários diretamente importados em `/home/ubuntu/waesy-audit/src/lib/mining`
