# Scrapy como referência para os mineradores Waesy

## Escopo e snapshot analisado

A análise foi feita sobre o repositório oficial `scrapy/scrapy`, clonado em 06/10/2026, na revisão `948e8e31dff916d8793478de2a58f7a4dbc98a06` (`master`, Scrapy `2.19.0`). O código local usado para a leitura está em `/home/ubuntu/jobs/c9b21b1c6646_a0/scrapy`. As afirmações sobre o comportamento do framework foram conferidas na documentação oficial e, quando relevante, no código primário dessa revisão. A documentação descreve um fluxo controlado pelo Engine entre Spider, Scheduler, Downloader, middlewares e Item Pipeline; o networking é assíncrono e orientado a eventos sobre Twisted. [1] [2]

A comparação com Waesy foi feita contra `SYSTEM_INVENTORY.md`, os arquivos em `src/services/mining/` e os utilitários de mineração referenciados por eles. Eu separo o que está **declarado no inventário** do que está **observável na implementação**. Onde há divergência, não assumi que a capacidade declarada esteja efetivamente ativa.

## 1. Arquitetura: o que Scrapy realmente fornece

O Engine é um coordenador de ciclo de vida e fluxo. A sequência documentada é: o Spider gera Requests; o Engine os coloca no Scheduler; o Scheduler entrega a próxima Request; o Downloader executa a requisição através dos Downloader Middlewares; a Response volta ao Engine; Spider Middlewares e Spider produzem Items e novas Requests; Items seguem ao Item Pipeline e Requests retornam ao Scheduler. O ciclo termina quando não existem Requests pendentes. [2]

No código, o Engine mantém estado explícito (`CREATED`, `SPIDER_OPEN`, `RUNNING`, `SPIDER_CLOSING`, `STOPPED`), controla Requests em andamento por slot e fornece sinais de abertura, download, item e encerramento. O comportamento é por crawler: cada `Crawler` tem instâncias próprias de downloader e middlewares e settings resolvidos para aquele crawl. Isso é uma arquitetura de execução durável no processo, não uma fila distribuída por si só. [3] [21]

Scrapy separa pontos de extensão com responsabilidades nítidas:

- **Scheduler:** Requests pendentes, prioridade, persistência opcional e filtro de duplicatas.
- **Downloader e Downloader Middlewares:** transporte HTTP, redirects, cookies, proxy, retry, robots, cache, User-Agent, compressão e métricas de download.
- **Spider e Spider Middlewares:** discovery, parsing, propagação de contexto, profundidade e tratamento da saída do Spider.
- **Item Pipeline:** limpeza, validação, deduplicação de Items e persistência.
- **Extensions/signals:** métricas, logs periódicos, encerramento por limiar, estado do Spider e controles operacionais.

Esse recorte é uma boa referência para não concentrar fila, HTTP, parsing, curadoria e persistência em um único handler. No Waesy, `crawler-batch-engine.ts` é deliberadamente um roteador polimórfico de oito verticais, mas executa seleção de fila, transição de estado, chamada ao provider, extração, curadoria, publicação e auditoria no mesmo fluxo. A separação Scrapy sugere manter o roteamento de vertical, mas extrair quatro contratos independentes: **claim/lease da fila**, **fetch provider**, **extração/validação de Item** e **persistência/auditoria**.

### Comparação direta com Waesy

O inventário em `SYSTEM_INVENTORY.md` descreve a `crawl_queue` como espinha dorsal assíncrona, com `pg_cron`, workers Edge, prioridade, dead-letter e circuit breaker. Isso é mais forte do que o Scheduler local do Scrapy em durabilidade e integração com Postgres. Porém, na função observada `executeCrawlQueueBatchDirect()` (`src/services/mining/crawler-batch-engine.ts:52-530`), a operação é:

1. selecionar linhas `pending` ordenadas por `priority` e `created_at`;
2. atualizar cada linha para `processing`;
3. processar de forma **sequencial**, em um `for...of` com `await`;
4. marcar `completed` ou `failed`.

Não há nessa função `FOR UPDATE SKIP LOCKED`, RPC de claim atômico, lease token, condição `WHERE status = 'pending'` no update ou revalidação após o update. Portanto, dois workers podem selecionar o mesmo item antes de o primeiro update ser observado pelo segundo. O inventário diz que os itens são travados; o código analisado não demonstra esse lock. Isso deve ser tratado como P0 de concorrência, não como uma capacidade já confirmada.

Há outra divergência verificável. O inventário e `11-queue-job-catalog.md` usam `retry_count`/`max_retries`, e o TypeScript incrementa `retry_count` em `crawler-batch-engine.ts:85-93`. A migração encontrada em `supabase/migrations/20260827280000_enterprise_mega_ecosystem_expansion.sql:129-147`, contudo, define `attempts`/`max_attempts`/`last_attempt_at`. A função analisada também não aplica `max_retries`, não calcula `scheduled_for` com backoff e não reencaminha automaticamente um `failed` para `pending`. Existe retry HTTP em `scraper-utils.ts`, mas retry do provider não é o mesmo que retry transacional da fila. O schema efetivo de produção deve ser confirmado antes de qualquer migração.

## 2. Filas, prioridades, deduplicação e retomada

O Scheduler padrão usa uma Priority Queue com filas internas por prioridade. Sem `JOBDIR`, as filas são em memória. Com `JOBDIR`, Requests serializáveis são persistidos em disco e Requests não serializáveis permanecem em memória; Requests em memória têm precedência para a mesma prioridade. O default é LIFO para Requests pendentes, resultando normalmente em depth-first order (DFO). BFO pode ser configurado com `DEPTH_PRIORITY = 1` e filas FIFO. A concorrência pode fazer os primeiros Requests saírem em paralelo, portanto prioridade não é uma garantia de ordem global. [4] [5]

Na revisão atual, o default `SCHEDULER_PRIORITY_QUEUE` é `DownloaderAwarePriorityQueue`. Ela cria uma fila por download slot e escolhe o slot com menos downloads ativos antes de retirar a Request. O slot padrão deriva do domínio, mas pode ser alterado por Request. Isso combina prioridade com distribuição de pressão entre domínios, algo que não aparece no batch engine Waesy. [6]

O dupefilter padrão (`RFPDupeFilter`) calcula fingerprint sobre URL canônica, método e body da Request. Com `JOBDIR`, os fingerprints são persistidos em `requests.seen`; existe também `DiskDupeFilter`, que usa SQLite para reduzir memória em crawls grandes. Retry pode marcar uma Request com `skip_dupefilter_once`, evitando que a nova tentativa seja descartada como duplicata. [7] [8]

`JOBDIR` também persiste Scheduler, dupefilter e, via `SpiderState`, um dicionário de estado do Spider. A retomada exige parada limpa, o mesmo diretório não pode ser compartilhado entre jobs e a documentação alerta que a estrutura interna é dependente da versão. Requests não serializáveis são perdidas ao pausar. Isso é uma retomada operacional simples e útil, mas não substitui uma fila de produção com leases, visibilidade, dead-letter e controle multi-worker. [9]

### O que Waesy já faz e o que falta

Waesy tem deduplicação em vários níveis:

- `automated-harvest.ts` canoniza URL e gera hash SHA-256 antes de consultar `mined_raw_extractions` e `news_articles`.
- `semantic-deduplicator.ts` usa tokens, Jaccard e janela de 48 horas para clusters de notícias.
- `integrity-gate.ts` calcula hash de título, rejeita títulos inválidos e detecta padrões de conteúdo poluído.
- Verticais como PNCP usam `upsert` por `pncp_id`; DataJud consulta `process_number_clean`; eventos e lugares usam chaves compostas ou URLs externas.

Isso é mais rico semanticamente que o fingerprint de Request do Scrapy, mas está aplicado depois ou durante a persistência de cada vertical. A adaptação recomendada é adicionar ao item de fila uma **request fingerprint canônica** independente do dedupe de entidade. Ela deve cobrir URL normalizada, método, body, vertical e versão do parser. O fingerprint deve ser único no banco ou controlado por RPC, e não apenas validado com `select` seguido de `insert`.

Para a fila Waesy, o padrão Scrapy útil é manter três estados separados:

- **ready:** item disponível para claim;
- **in-flight:** item com `lease_id`, `worker_id`, `claimed_at` e `lease_until`;
- **finished/dead-letter:** resultado final, motivo e contagem de tentativas.

O claim deve ser uma única operação SQL, por exemplo uma função que selecione e atualize com `FOR UPDATE SKIP LOCKED`. O backoff deve calcular `next_attempt_at` usando o tipo de falha e `Retry-After`, e o retry deve gerar uma nova tentativa sem apagar a evidência da tentativa anterior.

## 3. Discovery e expansão do crawl

Scrapy possui dois níveis de discovery. Um Spider pode produzir Requests manualmente a partir de `start()`/`start_urls` e `parse`. Para padrões de site, `CrawlSpider` combina `Rule` com `LinkExtractor`: `allow`, `deny`, domínios permitidos, regiões XPath/CSS, extensões ignoradas, tags/atributos, `unique` e `process_value`. Cada link carregado pode carregar `link_text` em `Request.meta`; `process_request` pode atribuir prioridade e `errback`. [10] [11]

`DepthMiddleware` mantém `request.meta['depth']`, permite `DEPTH_LIMIT`, estatísticas por profundidade e ajuste de prioridade. `OffsiteMiddleware` impede Requests fora de `allowed_domains`. A deduplicação e o controle de profundidade são aplicados na expansão do grafo, não apenas depois que o dado chega ao banco. [12]

No Waesy, discovery observado é mais especializado e orientado a fontes:

- `crawler-batch-engine.ts` reconhece RSS/Atom e enfileira até 15 links de cada feed com `upsert` por URL.
- `places-harvester.ts` consulta Overpass por bounding boxes fixas e faz fallback para Nominatim. Cidades fora de `CITY_BBOX_MAP` retornam vazio para Overpass.
- A API PNCP é consultada diretamente, com cache em memória de cinco minutos e busca de itens detalhados.
- O provider Firecrawl extrai até 50 links via regex simples quando usa `native-fetch`.
- A função de fila não percorre links HTML de forma recursiva e não há `depth`, `allowed_domains` ou regras de link equivalentes implementadas nos arquivos de mineração.

A recomendação não é trocar APIs oficiais por crawling amplo. Para cada vertical, declarar a origem como um de três tipos: **API/endpoint oficial**, **feed de descoberta** ou **site HTML permitido**. Usar um Spider/adapter separado por origem, com allowlist de domínio e regras de URL. Propagar `parent_url`, `discovered_via`, `depth`, `source_id` e `parser_version` em `metadata`. RSS e PNCP podem alimentar a `crawl_queue` como fontes de primeira classe; links HTML devem ser opt-in por domínio e por regra, não uma expansão global.

## 4. Politeness, rate limits e conformidade

Scrapy deixa `CONCURRENT_REQUESTS = 16`, `CONCURRENT_REQUESTS_PER_DOMAIN = 8` e `DOWNLOAD_DELAY = 0` como defaults. `AutoThrottle` vem desabilitado por padrão, mas quando habilitado inicia em `AUTOTHROTTLE_START_DELAY = 5`, ajusta delay por slot usando latência/concurrency, nunca fica abaixo de `DOWNLOAD_DELAY` nem acima de `AUTOTHROTTLE_MAX_DELAY = 60`, e não reduz delay por erro HTTP se isso produzir feedback perigoso. `AUTOTHROTTLE_TARGET_CONCURRENCY` default é 1.0. [13] [14]

O Downloader cria slots por domínio e aceita `DOWNLOAD_SLOTS` para delay, concurrency e configurações por slot. `AutoThrottle` opera por slot. O middleware de robots é opt-in: `ROBOTSTXT_OBEY` default é `False`; quando ativado, baixa e cacheia um parser de `robots.txt` por host, filtra Requests proibidas e incrementa estatísticas. [15] [16]

Downloader Middlewares são ordenados: `process_request` em ordem crescente e `process_response` em ordem decrescente. Os componentes oficiais cobrem offsite, robots, timeout, User-Agent, retry, redirects, cookies, proxy, stats e HTTP cache. O cache HTTP pode reduzir tráfego, mas não deve ser usado para ignorar instruções do site de forma abusiva. [17]

O Waesy já tem alguns controles que são bons candidatos a uma camada de politeness:

- `scraper-utils.ts` acrescenta User-Agent, Accept-Language e timeout;
- `fetchWithRetry()` reconhece 408/429/5xx, lê `Retry-After`, aplica backoff e cria cooldown por domínio;
- 429 cria cooldown de pelo menos 60 segundos e até 30 minutos;
- desafio Cloudflare/anti-bot cria cooldown de 30 minutos;
- `domain_cooldowns` é persistida em Postgres em background;
- DataJud rotaciona chaves, respeita 429 e põe o domínio em cooldown;
- `globalCrawlerCircuitBreaker` protege providers específicos.

O gap principal é o escopo: esses controles são chamados em alguns paths, enquanto o `crawler-batch-engine` e alguns harvesters fazem chamadas de provider diretamente. Não há, nos arquivos observados, um scheduler global que limite todas as verticais por domínio, uma capacidade máxima por provider ou uma política comum de robots. A rotação de User-Agent em `scraper-utils.ts` inclui strings de Chrome/Firefox e uma string Waesy; isso não equivale a simular legitimamente um navegador e não deve ser usado para contornar bloqueios.

### Limite legal e anti-bot

A recomendação para Waesy é **não contornar CAPTCHA, challenge, login, paywall ou bloqueio explícito**. “Anti-bot” deve significar backoff, identificação honesta, respeito a `robots.txt`, Terms of Service aplicáveis, limites publicados e preferência por APIs/feeds públicos. Não recomendo rotação de proxy ou fingerprinting para esconder volume e evitar uma decisão do operador do site. Quando houver 403/challenge, registrar `blocked`, pausar o domínio, guardar o motivo e encaminhar para revisão/autorização humana. A documentação de práticas do Scrapy lista opções operacionais para reduzir bloqueios, mas isso não concede autorização para burlar controles do alvo. [21]

Configuração mínima sugerida para fontes HTML autorizadas:

```python
ROBOTSTXT_OBEY = True
AUTOTHROTTLE_ENABLED = True
AUTOTHROTTLE_TARGET_CONCURRENCY = 0.5
AUTOTHROTTLE_START_DELAY = 5
AUTOTHROTTLE_MAX_DELAY = 120
CONCURRENT_REQUESTS_PER_DOMAIN = 2
DOWNLOAD_DELAY = 1
USER_AGENT = "WaesyBot/2.x (+URL de contato e política)"
```

Os valores devem ser calibrados por fonte, e não copiados cegamente. APIs oficiais podem ter política própria e não devem receber os mesmos headers ou delays de um site editorial.

## 5. Retries e tratamento de falhas

O `RetryMiddleware` oficial é orientado a Requests. Por padrão, Scrapy repete HTTP 500, 502, 503, 504, 522, 524, 408 e 429, além de exceções de rede configuradas. `RETRY_TIMES = 2` significa tentativa inicial mais duas tentativas. `Request.meta` pode sobrescrever `max_retry_times`, `dont_retry`, `retry_times`, `priority_adjust` e `give_up_log_level`. A nova Request copia a original, incrementa `retry_times`, marca `skip_dupefilter_once` e, por default, reduz prioridade em 1; stats registram contagem, motivo e limite atingido. [18] [19]

Isso é mais completo que um `try/catch` no handler porque o erro continua visível para errback, dupefilter, Scheduler, stats e sinais. Também diferencia erro de resposta e exceção de transporte.

No Waesy há dois mecanismos distintos:

1. **Retry no fetch:** `fetchWithRetry()` usa até três retries por default, delay inicial de 1s, multiplicador 2 e teto de 30s. Para 429 lê `Retry-After`; para Cloudflare/403 cria cooldown; para erros de rede continua o backoff.
2. **Retry específico de provider:** `fetchHtmlWithStealth()` faz duas novas tentativas com 1s/2s e depois tenta Jina Reader. `queryDataJud()` faz até três tentativas, gira chaves, trata 429/401/403 e usa cooldown.

O primeiro mecanismo é útil, mas o fallback Jina transforma conteúdo externo em um HTML sintético (`<article>...</article>`). O campo deve registrar `provider = jina` e a qualidade deve impedir que a origem seja confundida com HTML original. O fallback Steel em `firecrawl-client.ts` retorna uma URL de screenshot e um HTML placeholder; isso serve como evidência visual, não como conteúdo extraível. Não deve ser marcado como extração textual bem-sucedida.

P0 recomendado: modelar a decisão do retry no nível da fila, com uma taxonomia compatível entre Scrapy e Waesy:

- `network_timeout`, `dns`, `connection_reset`: retry exponencial com jitter;
- `408`, `429`, `5xx`: retry respeitando `Retry-After`;
- `401`, `403`, `captcha`, challenge: não insistir; cooldown/dead-letter;
- `200_empty`, `200_challenge_body`, parser failure: no máximo uma tentativa em provider alternativo autorizado;
- erro de validação de negócio: não repetir HTTP; enviar para revisão ou corrigir parser.

Cada tentativa deve registrar provider, status, latência, reason, retry index, next attempt e fingerprint. O item só deve chegar a dead-letter depois de esgotar a política da fonte, não depois de uma falha única da API.

## 6. Browser, JavaScript e rendering

O core Scrapy fornece download handlers para esquemas como HTTP/HTTPS, FTP, S3, file e data. O handler HTTP não é um navegador headless e não executa JavaScript. A arquitetura permite substituir o handler por outro pacote através de `DOWNLOAD_HANDLERS`; a documentação também alerta que handlers alternativos podem não suportar todos os sinais/settings do handler padrão. [20]

A integração primária mais conhecida no ecossistema é `scrapy-playwright`, que é um plugin separado, não uma capacidade nativa do repositório `scrapy/scrapy`. Ele ativa browser por `Request.meta['playwright']`, permite `wait_until`, `wait_for_selector`, `PageMethod`, screenshots, ações e reutilização explícita de uma Page. O plugin tem limitações próprias, entre elas ausência de proxy por Request e sinais `headers_received`/`bytes_received` não disparados pelo handler Playwright. [22]

No Waesy, `firecrawl-client.ts` tenta, nessa ordem:

- Firecrawl API, pedindo `markdown` e `html` e `waitFor`;
- `native-fetch` com retry e detecção de challenge;
- Steel.dev para screenshot headless quando o native fetch falha;
- falha explícita com `provider`, `isBlocked` e `rateLimited`.

`react-mining-adapter.ts` envolve o provider em um loop ReAct de até três iterações, mas o `act` continua sendo `scrapeUrl`; o loop não implementa um browser por conta própria. Não encontrei Playwright, Puppeteer ou uma sessão de navegador persistente em `src/services/mining`. Portanto, não se deve descrever Waesy como “crawler browser-based” de forma geral. Ele é um crawler HTTP/provider-based com fallback de screenshot e uma camada de retry/replanejamento.

Adaptação recomendada: criar uma **lane de rendering** separada, acionada somente quando o contrato da fonte autorizar e a extração HTTP for insuficiente. Essa lane pode continuar usando Firecrawl/Steel ou adotar um worker Python com `scrapy-playwright`, mas deve retornar um contrato explícito `{html, markdown, screenshot, provider, final_url, status, evidence_quality}`. Não usar screenshot placeholder como HTML de entrada. Limitar browser por domínio, número de páginas e tempo, fechar Pages sempre e não persistir cookies entre tenants sem política clara.

## 7. Extração, validação e enriquecimento

A extração nativa do Scrapy usa Selectors sobre HTML/XML com CSS e XPath, incluindo `::text`, `::attr`, `.get()`, `.getall()`, regex e seleção aninhada. `CrawlSpider` entrega a Response ao callback da regra, e o callback pode devolver Items e novas Requests. [10] [23]

O Item Pipeline processa componentes sequencialmente. Cada componente pode limpar, validar, deduplicar, persistir ou descartar com `DropItem`. A ordem é explícita pelo número em `ITEM_PIPELINES`; componentes podem ser coroutines e têm `open_spider`/`close_spider`. [24]

Feed Exports fornecem JSON, JSON Lines, CSV, XML e outros exporters customizados. Os storages oficiais incluem filesystem, FTP/FTPS, S3, GCS e stdout; alguns fazem entrega atrasada ao final do crawl. Isso é bom para snapshots e handoff, mas não é um upsert transacional de entidade. [25]

Media Pipelines baixam arquivos/imagens pelo downloader normal, evitam redownload recente, calculam checksum, armazenam em filesystem/FTP/S3/GCS e, para imagens, podem converter, criar thumbnails e aplicar dimensões mínimas. Isso é uma opção melhor que baixar imagens incidentalmente durante o parser. [26]

Waesy tem uma camada de extração de domínio mais rica:

- `mechanical-extractor.ts` usa JSON-LD/`@graph`, meta tags/OpenGraph, seletores por domínio e densidade textual.
- `specialized-extractors.ts` interpreta Recipe, Event, Job e Lodging Schema.org e normaliza valores.
- `job-opportunity-extractor.ts` combina JSON-LD com heurística HTML e normaliza salário BRL.
- `pncp-extractor.ts` usa a API oficial, cache de cinco minutos e converte DTO para um formato unificado.
- `places-harvester.ts` normaliza OSM/Overpass/Nominatim.
- `integrity-gate.ts` mede completude, poluição, imagens e score.
- `editorial-squad.ts` faz curadoria IA com schema Zod, depois o batch engine publica ou deixa `pending_review`.

A principal adaptação Scrapy não é substituir esses parsers por CSS genérico. É colocá-los em uma cadeia declarativa: `Response -> Extractor da vertical -> Item tipado -> Pipeline de integridade -> Pipeline de dedupe -> Pipeline de persistência`. O Item deve carregar `source_url`, `canonical_url`, `source_provider`, `extraction_method`, `parser_version`, `quality_score`, `raw_evidence_ref` e `observed_at`. A IA editorial deve permanecer depois da validação mecânica, como já ocorre no caminho de notícias, e não ser usada para preencher campos sem evidência.

Para feeds XML/CSV muito grandes, usar iteração streaming do Scrapy em vez de construir um DOM inteiro. Para JSON-LD, manter o parser Waesy, mas registrar falhas de schema por tipo e preservar o fragmento bruto com limite de tamanho. Para cada parser, adicionar testes com HTML real anonimizado, casos de ausência de campo e conteúdo de challenge.

## 8. Observabilidade e controle operacional

O Stats Collector do Scrapy é uma API de chave/valor sempre disponível para componentes, com `inc_value`, `set_value`, `max_value`, `min_value` e `get_stats`. O `MemoryStatsCollector` mantém stats da última execução por nome de Spider; outros collectors podem persistir em backend próprio. [27]

As extensões nativas incluem CoreStats, LogStats, LogCount, CloseSpider, SpiderState, AutoThrottle e, na revisão analisada, RemoteControl. CoreStats registra tempo, finish reason, Requests/Responses e Items; CloseSpider encerra por timeout, páginas, Items, ausência de Items ou erros; LogStats mostra progresso periódico. Extensões conectam-se a signals e são o ponto recomendado para métricas transversais. [28]

O DownloaderStats e o AutoThrottle debug ajudam a obter status, tamanho, latência, slot, concorrência e delay. Não encontrei no core uma implementação nativa de tracing distribuído W3C, exportação Prometheus ou persistência automática em Postgres. Essas integrações precisam ser customizadas por extension, signal handler ou collector.

Waesy já registra em `scraper_audit_log` URL, status, latência, bytes/itens em vários harvesters; também tem `system_audit_logs` e `ai_telemetry_logs`. Isso é melhor para forense e FinOps que o default MemoryStatsCollector. Os gaps documentados em `14-observability-gaps.md` permanecem relevantes: falta traceparent ponta a ponta, métricas agregadas do circuit breaker e alerta de crescimento da fila. A implementação também usa muitos `console.warn` e logs de provider; eles devem receber `run_id`, `queue_id`, `domain`, `vertical`, `provider`, `attempt` e `trace_id`.

Adaptação concreta: implementar uma `Scrapy Stats Extension` equivalente para Waesy, mesmo que a execução permaneça TypeScript. Os nomes devem ser estáveis e agregáveis:

```text
crawl.queue.claimed
crawl.queue.completed
crawl.queue.dead_letter
crawl.request.sent
crawl.response.2xx
crawl.response.4xx
crawl.response.429
crawl.response.5xx
crawl.blocked.challenge
crawl.retry.count
crawl.retry.give_up
crawl.item.extracted
crawl.item.rejected
crawl.item.duplicate
crawl.provider.firecrawl
crawl.provider.native_fetch
crawl.provider.steel
crawl.latency_ms
```

Persistir um resumo por execução e por domínio no Postgres, mas não transformar cada log de baixa cardinalidade em linha de auditoria sem retenção. O corpo bruto deve ir para storage com checksum; a tabela deve guardar referência, tamanho e política de retenção.

## 9. Storage e ciclo de vida dos artefatos

Scrapy distingue estado do crawl (`JOBDIR`), dados extraídos (Item Pipeline/Feed Export) e mídia (Media Pipeline). O core não fornece um pipeline Postgres. A persistência relacional e upsert precisam ser implementados no `ITEM_PIPELINES` ou em um adapter equivalente. [9] [24] [25]

Waesy usa Supabase Postgres como destino canônico e tem RLS, `pg_cron`, `pg_net`, pgvector e várias tabelas de entidades. Isso não deve ser substituído por JSONL: o banco é necessário para dedupe, estado de publicação, joins geográficos e auditoria. O padrão Scrapy útil é só o contrato de pipeline e a separação de responsabilidades.

Sugestão de storage em três camadas:

1. **Metadados transacionais:** `crawl_queue`, tentativa, item canônico, estado de curadoria e auditoria no Postgres.
2. **Evidência bruta:** HTML/JSON/markdown/screenshot em bucket com chave por `run_id/domain/fingerprint`, checksum e TTL.
3. **Export/handoff:** JSONL ou Parquet por execução/vertical para reprocessamento e analytics, sem fazer esse arquivo ser a fonte canônica.

O feed export do Scrapy alerta que S3/GCS/FTP podem fazer upload ao final do crawl. Para jobs que precisam de entrega incremental, usar objetos particionados por lote ou persistência de Item; não esperar que um único feed final seja checkpoint durável.

## 10. Pontos fortes de Scrapy para Waesy

1. **Contratos de componente claros.** Scheduler, Downloader, Spider, Pipeline e Extension reduzem acoplamento e tornam cada falha observável.
2. **Backpressure por slots.** Concorrência por domínio e `DownloaderAwarePriorityQueue` limitam pressão sem criar uma regra artesanal por provider.
3. **Retry integrado ao ciclo.** Retry preserva Request, errback, prioridade, dupefilter e stats; não é apenas um loop em torno de `fetch()`.
4. **Discovery controlável.** `LinkExtractor`, `Rule`, offsite e depth permitem expansão explícita, testável e restrita.
5. **Politeness configurável.** AutoThrottle, `DOWNLOAD_SLOTS`, robots, delay, cookies, proxy e HTTP cache são pontos de política conhecidos.
6. **Parsing testável.** Selectors e Items permitem separar extração de persistência e escrever contratos por fonte.
7. **Operação de crawl.** JOBDIR, signals, StatsCollector, CloseSpider, LogStats e RemoteControl dão mecanismos prontos para pausar, medir e encerrar.
8. **Artefatos de mídia.** Files/Images Pipeline já resolve checksum, cache e thumbnails de forma concorrente.

## 11. Limites e riscos de adotar Scrapy sem adaptação

1. **Não é uma fila distribuída de Postgres.** Scheduler/JOBDIR são locais ao processo/job; multi-worker exige integração própria.
2. **JOBDIR não é storage de negócio.** A própria documentação trata os arquivos como detalhe de implementação e exige mesma versão para retomada.
3. **Retry não entende regra de negócio.** Um 200 com challenge, JSON inválido ou item incompleto precisa de validação Waesy.
4. **Robots é opt-in.** Ativar explicitamente e adicionar policy de Terms/consentimento fora do framework.
5. **Core não renderiza JS.** Browser exige handler externo, custo, isolamento e política de sessão.
6. **AutoThrottle não é limite rígido.** Target concurrency é média sugerida, não garantia instantânea.
7. **Feed export não é transação.** Upload tardio pode perder um lote se o processo morrer antes do fechamento.
8. **Fingerprints de Request não substituem dedupe semântico.** O Jaccard/título/entidade de Waesy continua necessário.
9. **Handlers alternativos podem perder sinais/settings.** Isso importa ao conectar Playwright, aiohttp, httpx ou providers externos.
10. **Não há capacidade comprovada de bypass legal.** Um challenge deve ser bloqueio/cooldown, não convite a aumentar furtividade.

## 12. Adaptações priorizadas para Waesy

### P0 — segurança de fila e integridade

- Criar RPC de claim atômico em `crawl_queue` usando `FOR UPDATE SKIP LOCKED`, `lease_id`, `worker_id`, `claimed_at` e `lease_until`.
- Unificar nomes de retry: escolher `attempts/max_attempts` ou `retry_count/max_retries` e atualizar migration, TypeScript, inventário e auditoria.
- Implementar `next_attempt_at`, backoff e dead-letter no banco; não marcar todo erro de provider diretamente como `failed` definitivo.
- Adicionar idempotency key única por `(canonical_url, vertical, parser_version)` e constraints nas entidades.
- Registrar `run_id` e `attempt_id` em cada transição; separar `processed_at` de `claimed_at`.

### P1 — politeness e provider policy

- Criar tabela/configuração de `crawler_sources` com `allowed_domains`, `robots_required`, `max_concurrency`, `min_delay`, `max_pages`, `allowed_methods`, `provider_policy` e `terms_reviewed_at`.
- Fazer todos os caminhos usarem um `FetchGateway` único, em vez de chamadas `fetch()` e provider espalhadas.
- Aplicar slots por domínio/provider, AutoThrottle equivalente e limite global por tenant.
- Ativar robots por default para HTML; permitir exceção somente com registro de base legal/autorização e revisão.
- Tratar 403/challenge/CAPTCHA como bloqueio terminal temporário. Não fazer rotação de proxy ou User-Agent para evitar bloqueio explícito.

### P1 — contratos de extração

- Introduzir `MinedItem` versionado com origem, fingerprint, método, qualidade, evidência e timestamp.
- Adaptar `mechanical-extractor`, especializados, PNCP e DataJud para implementarem o mesmo contrato de extractor, mantendo seus parsers de domínio.
- Mover dedupe de entidade e validação para pipelines ordenados; manter `editorial-squad` depois do Integrity Gate.
- Adicionar fixtures de JSON-LD, HTML incompleto, challenge, redirect, 429 e rendering necessário.

### P2 — browser/rendering controlado

- Manter HTTP/API como caminho primário.
- Colocar Firecrawl/Steel/Playwright em uma lane separada, com quota, timeout, provider e `evidence_quality` explícitos.
- Se usar `scrapy-playwright`, fechar Page, limitar contexto/cookies e medir custo por domínio; não assumir que os sinais do handler HTTP continuarão disponíveis.
- Nunca promover screenshot placeholder para artigo ou campo textual.

### P2 — observabilidade

- Criar extension/collector equivalente a StatsCollector, com counters por vertical/provider/domínio e persistência resumida.
- Propagar W3C `traceparent` do cron/worker até provider e Supabase.
- Emitir alertas para fila pendente, leases expirados, dead-letter, 429, challenge e queda de `items_extracted / requests`.
- Persistir snapshot de resposta com checksum quando necessário para auditoria, respeitando retenção e privacidade.

## Conclusão operacional

Scrapy é uma referência forte para o **motor de execução** dos mineradores Waesy, não um substituto direto do ecossistema Waesy. O framework oferece scheduler, slots, discovery, retry, politeness, pipelines e métricas de forma coerente. Waesy já é mais especializado em APIs brasileiras, normalização geográfica, dedupe semântico, curadoria, Supabase e auditoria. A melhor arquitetura é combinar os dois conjuntos de padrões: manter Postgres como fila e fonte canônica, mas importar os contratos Scrapy para claim, slot por domínio, retry estruturado, discovery permitido, pipeline tipado e stats por componente.

A prioridade não é adicionar mais um provider de scraping. É fechar as garantias que o código atual não prova: claim atômico, nomes de retry coerentes, backoff persistido, dedupe com constraints, policy de robots/Terms e distinção rigorosa entre HTML, markdown, screenshot e conteúdo de fallback.

## Referências

[1]: https://github.com/scrapy/scrapy/tree/948e8e31dff916d8793478de2a58f7a4dbc98a06 "Scrapy — snapshot oficial analisado, revisão 948e8e31"
[2]: https://docs.scrapy.org/en/latest/topics/architecture.html "Scrapy Architecture overview"
[3]: https://github.com/scrapy/scrapy/blob/948e8e31dff916d8793478de2a58f7a4dbc98a06/scrapy/core/engine.py "Scrapy ExecutionEngine — código-fonte"
[4]: https://docs.scrapy.org/en/latest/topics/scheduler.html "Scrapy Scheduler"
[5]: https://github.com/scrapy/scrapy/blob/948e8e31dff916d8793478de2a58f7a4dbc98a06/scrapy/core/scheduler.py "Scrapy Scheduler — código-fonte"
[6]: https://github.com/scrapy/scrapy/blob/948e8e31dff916d8793478de2a58f7a4dbc98a06/scrapy/pqueues.py "Scrapy priority queues — código-fonte"
[7]: https://docs.scrapy.org/en/latest/topics/jobs.html "Scrapy Jobs: pausing and resuming crawls"
[8]: https://github.com/scrapy/scrapy/blob/948e8e31dff916d8793478de2a58f7a4dbc98a06/scrapy/dupefilters.py "Scrapy duplicate filters — código-fonte"
[9]: https://docs.scrapy.org/en/latest/topics/jobs.html#job-directory "Scrapy job directory and persistence limitations"
[10]: https://docs.scrapy.org/en/latest/topics/spiders.html "Scrapy Spiders, CrawlSpider and Rules"
[11]: https://docs.scrapy.org/en/latest/topics/link-extractors.html "Scrapy Link Extractors"
[12]: https://docs.scrapy.org/en/latest/topics/spider-middleware.html "Scrapy Spider Middleware and DepthMiddleware"
[13]: https://docs.scrapy.org/en/latest/topics/autothrottle.html "Scrapy AutoThrottle extension"
[14]: https://github.com/scrapy/scrapy/blob/948e8e31dff916d8793478de2a58f7a4dbc98a06/scrapy/extensions/throttle.py "Scrapy AutoThrottle — código-fonte"
[15]: https://docs.scrapy.org/en/latest/topics/downloader-middleware.html "Scrapy Downloader Middleware"
[16]: https://github.com/scrapy/scrapy/blob/948e8e31dff916d8793478de2a58f7a4dbc98a06/scrapy/downloadermiddlewares/robotstxt.py "Scrapy RobotsTxtMiddleware — código-fonte"
[17]: https://github.com/scrapy/scrapy/blob/948e8e31dff916d8793478de2a58f7a4dbc98a06/scrapy/settings/default_settings.py "Scrapy default settings — código-fonte"
[18]: https://docs.scrapy.org/en/latest/topics/request-response.html#request-meta-special-keys "Scrapy Request.meta special keys"
[19]: https://github.com/scrapy/scrapy/blob/948e8e31dff916d8793478de2a58f7a4dbc98a06/scrapy/downloadermiddlewares/retry.py "Scrapy RetryMiddleware — código-fonte"
[20]: https://docs.scrapy.org/en/latest/topics/download-handlers.html "Scrapy Download handlers"
[21]: https://docs.scrapy.org/en/latest/topics/practices.html "Scrapy Practices and live crawl guidance"
[22]: https://github.com/scrapy-plugins/scrapy-playwright "scrapy-playwright — integração primária de browser no ecossistema Scrapy"
[23]: https://docs.scrapy.org/en/latest/topics/selectors.html "Scrapy Selectors"
[24]: https://docs.scrapy.org/en/latest/topics/item-pipeline.html "Scrapy Item Pipeline"
[25]: https://docs.scrapy.org/en/latest/topics/feed-exports.html "Scrapy Feed exports"
[26]: https://docs.scrapy.org/en/latest/topics/media-pipeline.html "Scrapy Files and Images Pipeline"
[27]: https://docs.scrapy.org/en/latest/topics/stats.html "Scrapy Stats Collection"
[28]: https://docs.scrapy.org/en/latest/topics/extensions.html "Scrapy Extensions"
