# Firecrawl — arquitetura, padrões de crawling e adaptações para os mineradores Waesy

**Projeto analisado:** `firecrawl/firecrawl` no commit `8c84d8b6a155495b8088c286d878b2f875de3918` (checkout local de `main`, 2026-10-06). O commit e os arquivos citados abaixo são links imutáveis para o código analisado. A documentação pública é citada separadamente porque descreve a superfície de produto atual e, em alguns casos, Cloud e self-host não têm exatamente as mesmas capacidades.

## Achado central

Firecrawl não é apenas um `fetch` que devolve HTML. No desenho atual, a API valida a requisição, aplica permissões e políticas de segurança, coloca o trabalho em filas duráveis, mantém estado transitório da execução, coordena uma fronteira de URLs para cada crawl, faz o scrape por uma cascata de engines e só depois transforma o documento em Markdown, links, metadados, JSON estruturado e outros formatos. A fronteira de crawling e o pipeline de scrape são desacoplados o suficiente para que uma página encontrada por sitemap ou link percorra o mesmo conjunto de opções de renderização e extração da operação de scrape unitário. A documentação afirma explicitamente que cada página do crawl passa pelo pipeline de scrape.[1] [3]

O Waesy já possui elementos valiosos para qualidade editorial — extração mecânica, JSON-LD, portões de integridade, Jaccard, deduplicação e curadoria — mas o `crawler-batch-engine.ts` ainda combina seleção de itens, marcação de estado, execução e persistência em uma rotina sequencial. O maior ganho não está em trocar o extrator mecânico por LLM. Está em adicionar uma camada de execução confiável: claim atômico com lease, fronteira de descoberta, política de politeness por domínio, tentativas classificadas, dead-letter, métricas por tentativa e armazenamento de evidência.

## O que foi verificado no projeto Firecrawl

A análise usou a documentação oficial, o `docker-compose.yaml` do repositório e o código TypeScript de API, workers, crawler, engines, browser service, extraction, logs e telemetria. Não inferi que uma capacidade Cloud exista no self-host: a própria documentação de self-hosting avisa que o quickstart não tem armazenamento durável, TLS ou alta disponibilidade por padrão, e que Fire Engine, anti-bot avançado, screenshots, ações, Browser, Interact e Agent não fazem parte do stack self-host padrão.[8]

### Arquitetura de execução

A entrada de `/v2/scrape` passa por validação de schema, Safe Mode, permissões, restrição por formato e proteção contra destinos inseguros. A requisição registra um job e, para o fluxo síncrono, adquire o semáforo de concorrência da equipe antes de esperar o processamento. O tempo de espera para obter a vaga também participa do timeout; isso evita que uma fila saturada pareça um timeout de rede. O código está em [`controllers/v2/scrape.ts`][25].

O `/v2/crawl` calcula opções e limite, verifica créditos e política de ameaça para a URL inicial, cria o estado do crawl, busca `robots.txt`, escolhe o backend de fila, cria um grupo com `maxConcurrency` e eventual `delay`, salva o crawl e enfileira o job de kickoff. A resposta devolve um id e uma URL de status; a conclusão pode ser consumida por polling ou webhook, conforme a documentação.[3] O controlador correspondente é [`controllers/v2/crawl.ts`][24].

O job de kickoff dá origem aos jobs de scrape que compartilham `groupId`/crawl id. `scrape-worker.ts` combina estado de crawl, `WebCrawler`, locks de URL, checagem de threat policy, billing, tracing, logging e `runWebScraper`. O finalizador espera o grupo, ordena ou conta resultados, registra custos, dispara eventos e entrega webhook. O finalizador ainda relê os créditos de analytics cinco vezes, com dois segundos entre tentativas, porque a escrita analítica pode chegar depois do último filho.[4] [5]

Existem dois planos de fila. O plano legado/auxiliar usa BullMQ sobre Redis para filas como billing, precrawl, logging e tarefas de geração; `queue-service.ts` configura conexões Redis, eventos de reconexão e retenção de jobs completos/falhos por 24–25 horas.[6] O plano NuQ, usado para scrape/crawl, usa PostgreSQL como fila durável e pode usar RabbitMQ para prefetch e notificações; o próprio código permite backend opcional em FoundationDB. Em RabbitMQ, a fila de prefetch é quorum, durável, limitada a 20.000 mensagens e com expiração de entrega inferior ao timeout do lock. Os jobs têm status, prioridade, lock, owner e group id.[7]

A capacidade por equipe não é um simples `Promise.all`. `team-semaphore.ts` mantém leases em Redis com TTL de 30 segundos, faz polling com jitter e atraso crescente de 25 ms até 250 ms, renova o lease pela metade do TTL, mede aquisição/ocupação com Prometheus e libera o slot em `finally`. Para equipes Firecrawl hospedadas, o backend pode espelhar a vaga em Redis ou FoundationDB. Em self-host, o semáforo de plano é deliberadamente bypassado, portanto o operador precisa impor limites no deployment.[9]

O `queue-worker.ts` estende locks de jobs longos, verifica CPU/RAM antes de aceitar novo trabalho, faz stalled-job check a cada 60 segundos, permite até dez detecções de stall e possui liveness/graceful shutdown. Isso é um padrão importante para Waesy: o worker não deve assumir que o processo que fez o claim ficará vivo até o fim.[10]

O `docker-compose.yaml` torna as dependências explícitas: API, Playwright, Redis, RabbitMQ e `nuq-postgres`, com FoundationDB opcional. Os defaults incluem `CRAWL_CONCURRENT_REQUESTS=10`, `MAX_CONCURRENT_JOBS=5`, `BROWSER_POOL_SIZE=5` e `NUM_WORKERS_PER_QUEUE=8`; contudo o Compose padrão não declara volumes duráveis para Redis, PostgreSQL ou RabbitMQ.[11] A documentação de self-host recomenda adicionar storage, backup/restore, TLS, autenticação, sizing e monitoramento antes de expor a instalação.[8]

### Discovery e fronteira de URLs

O `/map` é deliberadamente rápido: usa principalmente sitemap, complementa com resultados de SERP e dados de crawls anteriores, e retorna URLs com título/descrição quando disponíveis. A própria documentação avisa que ele é uma aproximação e pode não capturar todos os links; para cobertura recursiva e registros de erro, recomenda `/crawl`.[4]

O `/crawl` usa sitemap e traversal recursivo de links. A configuração tem `limit`, `maxDiscoveryDepth`, `includePaths`, `excludePaths`, `regexOnFullURL`, `crawlEntireDomain`, `allowSubdomains`, `allowExternalLinks`, `sitemap` (`include`, `skip`, `only`), `ignoreQueryParameters`, `delay`, `maxConcurrency` e `scrapeOptions`.[3] Por padrão, o crawler limita-se a URLs filhas da origem; links externos e subdomínios precisam ser permitidos explicitamente. `maxDiscoveryDepth` é profundidade de descoberta por saltos, não quantidade de segmentos do path. Páginas na profundidade máxima ainda são raspadas, mas seus links não são seguidos.[3]

No código, `WebCrawler` mantém conjuntos/mapeamentos de URLs visitadas e crawled, normaliza e filtra links com uma implementação Rust (`filterLinks`/`extractLinks`) e tem fallback em JavaScript. Os filtros registram motivo de recusa, como profundidade, regex, backward crawling, robots, tipo de arquivo, protocolo não web, social/mailto, domínio externo e link de seção. A implementação pode operar em escopo de path, domínio, subdomínio ou externo de acordo com flags explícitas.[12] [31]

A descoberta de sitemap não é um `GET` frágil. O crawler obtém `robots.txt`, considera os sitemaps declarados, consulta fontes em lotes de três, limita o número de sitemaps atingidos, processa sitemap index e `.gz`, filtra antes de entregar URLs e grava deduplicação em sets Redis com expiração. Sitemap malformado vira `SitemapError`; timeout de descoberta não derruba silenciosamente a execução inteira, mas é registrado e o crawler continua com o que já foi entregue.[13] [12]

Os resultados do crawl são contados como jobs individuais. Estado, jobs, jobs concluídos e ordem de término ficam em Redis com TTL de 24 horas; marcadores de conclusão são idempotentes, têm três tentativas com atraso de 100/200 ms e um hash de reparo que o reconciler tenta drenar quando Redis falha. Isso protege contra o caso em que o scrape terminou, mas a atualização do conjunto de concluídos caiu.[14]

Há uma consequência operacional que Waesy deveria copiar conscientemente: a ordem de resultados não é a ordem de descoberta. A documentação diz que páginas rodam concorrentemente e que `data` é ordenado por término; perto de um limite de profundidade, o interleaving de rede pode alterar quais ramos são explorados. Para maior reprodutibilidade, recomenda `maxConcurrency=1`, `delay` ou `sitemap=only`, mas nem isso elimina toda variação quando sitemaps são enfileirados separadamente.[3]

### Politeness, robots e limites

Firecrawl respeita `robots.txt` por padrão no crawl; `ignoreRobotsTxt` e `robotsUserAgent` são documentados como recursos Enterprise.[3] O código busca robots com timeout de 8 segundos e cache máximo de um dia, usando a própria cascata de scrape. A decisão testa `FireCrawlAgent`/`FirecrawlAgent`, trata resposta indefinida como permitida e verifica também a versão com barra final. O crawler extrai `crawl-delay` do robots para observabilidade/estado, mas o trecho que faria a promoção automática desse valor para a opção de `delay` no controlador está comentado. Portanto, não se deve afirmar que todo crawl aplica automaticamente o `crawl-delay`; a evidência atual sustenta respeito às regras e leitura do valor, enquanto a aplicação de um intervalo deve ser configurada explicitamente ou confirmada na versão em operação.[15] [12] [24]

A documentação separa rate limit de concorrência. Rate limit mede requisições por minuto; concorrência mede trabalhos em paralelo. Acima de qualquer um deles a API pode retornar 429. Jobs de browser que excedem a concorrência ficam em fila, e o tempo na fila conta no timeout; a fila pode manter jobs por até 48 horas no serviço hospedado.[9] O semáforo por equipe é global à equipe, não um token bucket por domínio-alvo. Não encontrei no código analisado uma garantia de limite de requests por host independente da configuração de `delay`, de robots e de `maxConcurrency` do crawl.

Para Waesy, politeness deve ser uma política de primeira classe: User-Agent identificável, cache de robots por host, `crawl-delay` como piso quando presente, limite de concorrência por registrable domain, atraso com jitter, respeito a `Retry-After`, bloqueio de caminhos explicitamente proibidos e uma opção de `allowExternalLinks` desligada por padrão. Uma fila global evita sobrecarga do processo Waesy, mas não evita disparar cem requests contra um portal pequeno; a chave de controle precisa incluir o domínio.

### Retries, locks e falhas

A camada HTTP `robustFetch` usa Undici, lookup DNS cacheável, AbortSignal, validação Zod e retry quando `tryCount` é passado para erro de transporte ou status HTTP a partir de 300. O cooldown é opcional e fornecido pelo chamador; não há uma política universal de exponential backoff embutida nesse helper.[16] Isso é uma distinção importante: “tem retry” não significa “todo erro tem backoff”.

O pipeline de scrape também tem `ScrapeRetryTracker`. Ele limita tentativas globais, toggles de feature, remoções de feature e prefetch de PDF/documento, compartilhando o orçamento entre antibot e falhas de proxy para não multiplicar tentativas pelo mesmo recurso. Ao exceder um orçamento, lança `ScrapeRetryLimitError` e registra estatísticas.[17]

`runWebScraper.ts` faz até três tentativas para jobs de crawl e uma para scrape unitário. Ele para em 2xx/304 e transforma o erro final em falha do job.[18] Além disso, há retries específicos em persistência: marcadores de crawl no Redis, créditos no finalizador, reestabelecimento de conexões e publicação de logs. O RabbitMQ de extract usa fila quorum, DLX/DLQ e `x-delivery-limit=1`: falha/crash não é reencaminhado indefinidamente; vai para dead-letter. O worker marca o extract como falho, registra o evento e trata a DLQ separadamente.[19] [20]

A lição para Waesy é classificar o retry por camada e por erro. Timeout de DNS, conexão resetada e 502 transitório podem ser reexecutáveis; 401/403, robots disallow, CAPTCHA, conteúdo vazio e schema inválido devem virar estados finais ou filas de revisão, não loops. Cada tentativa precisa carregar `attempt`, `last_error`, `http_status`, `next_attempt_at` e `lease_owner`. Um job deve ter limite global de tentativas e limite por tipo de falha, além de backoff exponencial com jitter e respeito a `Retry-After`.

### Browser, rendering e anti-bot dentro de limites legais

A cascata de engines é uma das características mais fortes do projeto. Dependendo de configuração e features, a ordem inclui índice/cache, Fire Engine com TLS client e Chrome CDP, variantes stealth, Playwright, fetch, PDF/documento/imagem e engines especialistas. Cada engine declara features suportadas e uma qualidade/prioridade; flags como ações, screenshot, localização, mobile, stealth proxy, PDF, áudio e vídeo influenciam a seleção.[21]

O adapter Playwright da API chama um microsserviço separado. Ele envia URL, `waitFor`, timeout, headers e opção TLS; valida a resposta com Zod e devolve HTML, status, content type e URL final.[22] O serviço `apps/playwright-service-ts/api.ts` mantém um browser Chromium, cria contexto isolado por página, limita páginas com semáforo, usa User-Agent gerado/fornecido, viewport 1280×800, bloqueia service workers, pode bloquear mídia e anúncios e suporta proxy. Também rejeita URLs que resolvam para IP privado/interno, inclusive em requests de navegação, para reduzir SSRF. Contextos e páginas são encerrados após o uso; há health endpoint com páginas ativas.[23]

A documentação lista ações sequenciais como `wait`, `click`, `write`, `press`, `scroll`, `screenshot`, execução de JavaScript, scrape intermediário e PDF. Há limite de 50 ações e limite combinado de espera. Isso resolve conteúdo que só aparece depois de interação, mas não é evidência de que o sistema possa ou deva vencer um CAPTCHA ou uma barreira de autenticação.[7] [23]

Firecrawl documenta proxies, JavaScript e anti-bot como parte do produto hospedado, e o código contém engines Fire Engine/TLS/stealth. Porém, no self-host padrão a própria documentação diz que Fire Engine e comportamento anti-bot avançado precisam de serviço separado.[8] O relatório não trata User-Agent, proxy ou browser como autorização para contornar controle de acesso. Para Waesy, o limite legal/operacional deve ser explícito: acessar apenas páginas públicas ou para as quais haja autorização, respeitar robots e termos aplicáveis, não automatizar login/captcha/medidas de acesso sem autorização, registrar o motivo de bloqueio e permitir opt-out por domínio. A resposta correta a desafio anti-bot é `blocked_by_policy`/`blocked_by_challenge` com cooldown ou revisão, não rotação infinita de identidades.

### Extração e normalização

A transformação é composta. A partir de raw HTML, Firecrawl deriva metadados e HTML limpo, converte para Markdown e, se `onlyMainContent=true` resultar vazio, repete a extração com conteúdo completo. Links e imagens são derivados sob demanda. O `coerceFieldsToFormats` remove campos que não foram solicitados, evitando carregar/expor formatos inúteis.[26]

A superfície de formatos é mais ampla do que Markdown: HTML limpo, raw HTML, raw base64, screenshot, links, images, JSON estruturado, summary, query, branding, product, menu, áudio/vídeo e outros conforme engine e plano.[2] O guia avançado também documenta PDF `fast`, `auto` com fallback OCR e `ocr`, limite de páginas e blocos/layout por página.[7]

Para JSON, o pipeline aceita schema ou prompt. `llmExtract.ts` normaliza schema, torna objetos estritos, detecta schemas recursivos para escolher modelo, limita input por tokens/caracteres, registra custos/uso e integra telemetria. A documentação de scrape mostra JSON no mesmo pipeline de uma página, enquanto `/extract` é o modo assíncrono para várias URLs ou curingas; resultados têm id/status, fontes e expiração de 24 horas.[2] [5] [27]

Waesy está bem posicionado ao manter extração mecânica antes de IA. `mechanical-extractor.ts`/`specialized-extractors.ts` procuram densidade textual, JSON-LD e tipos específicos; `integrity-gate.ts` rejeita título genérico, corpo vazio, conteúdo poluído por challenge e repetição; `editorial-squad` só entra depois. Esse é um controle de custo e qualidade melhor do que enviar toda página ao LLM. O padrão a importar é tornar o contrato explícito: `raw_fetch -> normalize -> mechanical candidate -> integrity gate -> typed schema -> optional editorial LLM -> dedupe -> persistence`, com razões de descarte e proveniência em cada transição.

### Observabilidade, webhooks e storage

Firecrawl propaga contexto W3C de tracing para jobs de fila e usa OpenTelemetry com exportação batch. Há uma camada de amostragem para zero-data-retention: spans iniciados em contexto ZDR não são gravados, e spans marcados posteriormente também são descartados antes do export.[28] Isso é mais forte do que simplesmente apagar o corpo no log.

O sistema usa logs estruturados Winston, métricas Prometheus de semáforo, runtime e duração de jobs, health/liveness endpoints e tabelas de logs de jobs. `log_job.ts` também pode publicar registros por tabela em Pub/Sub com timeout curto, backoff 250 ms -> 5 s, orçamento total de 30 s e deduplicação a jusante por row id; há helpers para salvar resultados em GCS.[29] Webhooks passam por RabbitMQ persistente, reconectam e aplicam backpressure aguardando `drain` por até 30 segundos.[30]

O storage é deliberadamente dividido por finalidade. Redis guarda estado transitório de crawl e expira em 24 horas; PostgreSQL/NuQ guarda a fila durável; logs e entidades vão para banco/analytics; GCS é opção para resultados grandes; Pub/Sub conduz atividade; FoundationDB é backend experimental de fila. O self-host guide não promete durabilidade sem volumes e não deve ser tratado como arquitetura pronta para produção.[8] [11] [14]

No Waesy, `scraper_audit_log` registra agregados — itens encontrados, extraídos, inseridos, tokens poupados e duração — e há muitos `console.warn/error`. Isso é útil para FinOps, mas não responde bem a “qual URL falhou, em qual tentativa, por qual engine, sob qual lease e qual cooldown está ativo?”. A recomendação é preservar o agregado e adicionar uma linha por job/attempt, sem armazenar conteúdo sensível desnecessário.

## Comparação com o inventário e o código Waesy

O inventário canônico informa 21 arquivos em `src/services/mining/`, Postgres Supabase com RLS, `pg_cron`, `pg_net` e `pgvector,` e engines de mineração baseadas em parsers mecânicos, Jaccard, Overpass, PNCP e BCB.[31] O código pesquisado confirma que o Waesy já tem roteamento para oito verticais em `crawler-batch-engine.ts`: jobs, places, tenders, real estate, auctions, RSS, events e news.[32]

| Área | Firecrawl verificado | Waesy verificado | Gap e decisão recomendada |
|---|---|---|---|
| Fila | NuQ PG/RabbitMQ, BullMQ auxiliar, grupos, locks, owners, semáforo | `crawl_queue` Supabase, seleção por prioridade/idade, loop sequencial | Implementar claim atômico com lease e worker bounded-concurrency. Não copiar toda a topologia sem necessidade. |
| Discovery | `/map` rápido; `/crawl` sitemap + links, escopo, profundidade, dedupe Redis | RSS/sources e itens já inseridos; RSS gera novos itens | Criar `discover` separado que combine RSS, sitemap e links HTML, com policy de escopo. |
| Politeness | robots default, cache, `delay`, `maxConcurrency`, queue timeout | Não aparece no `crawler-batch-engine`; client faz retry/cooldown | Cache de robots e rate limiter por domínio são prioridade; challenge e robots devem ser estados explícitos. |
| Retry | budgets por camada, 3 tentativas em crawl, DLQ e repair | `retry_count` é incrementado no update; sem política de backoff/lease visível no motor | Backoff classificado, `Retry-After`, max attempts, DLQ/review e idempotency key. |
| Browser | Playwright isolado; Fire Engine opcional; waterfall; actions/PDF | Firecrawl `/v1/scrape`, native fetch, fallback Steel screenshot | Migrar para `/v2`/SDK e usar renderização só quando necessária; não tratar screenshot placeholder como HTML. |
| Extração | Markdown/HTML/JSON/schema/prompt/format transformers | Mecânica + JSON-LD + integridade + curadoria editorial | Manter gate Waesy; padronizar `ExtractionResult` por vertical e proveniência. |
| Dedupe | sets por crawl/URL lock; crawl jobs idempotentes | SHA-256 URL, checks de banco, Jaccard 0,55/0,80 | Usar URL canonical + content hash + cluster semântico; claim deve impedir corrida entre workers. |
| Observabilidade | OTel propagado para fila, Prometheus, logs, webhooks, ZDR | `scraper_audit_log`, contadores e console | Acrescentar métricas/trace por attempt, domínio, status, engine, bytes e motivo de descarte. |
| Storage | Redis efêmero + PG queue + logs/analytics/GCS/PubSub | Supabase persistente, RLS e auditoria | Separar fila/estado transitório de entidades; definir TTL e retenção de HTML/raw. |
| Segurança | SSRF/private-IP, threat policy, blocklist, Safe Mode | Challenge detection, cooldown e fallback | Adicionar SSRF e allow/deny domain policy; não transformar anti-bot em bypass irrestrito. |

### Evidência específica do Waesy atual

`crawler-batch-engine.ts` seleciona `pending` por prioridade e idade, limita o lote, marca cada item como `processing`, incrementa `retry_count`, executa a vertical e atualiza para `completed`/`failed`. A atualização é feita por id, mas o trecho analisado não mostra uma transação de claim com `FOR UPDATE SKIP LOCKED`, uma condição `status=pending` na atualização, `lease_until`, `worker_id` ou heartbeat. Em execução concorrente, dois workers podem ler o mesmo item antes de qualquer update; esse é o risco operacional mais importante do motor.[32]

`automated-harvest.ts` busca candidatos RSS, normaliza parâmetros de tracking e gera SHA-256, consulta duplicatas no banco, extrai mecanicamente, passa pelo portão, grava `mined_raw_extractions`, chama a curadoria editorial e publica em `news_articles`. O loop é sequencial e seus erros são principalmente `console.warn`; o `scraper_audit_log` é escrito no fim. Isso é bom para auditoria agregada, mas a falha no meio pode deixar item `processing` sem recuperação automática.[33]

`firecrawl-client.ts` já tenta Firecrawl, mas aponta para `https://api.firecrawl.dev/v1/scrape`, usa timeout de 20 segundos, pede Markdown/HTML e `waitFor=1000`, e não expõe map/crawl assíncrono, status, webhook, sitemap, include/exclude, `maxDiscoveryDepth`, `maxConcurrency` ou sources. Em seguida usa `fetchWithRetry`; se detectar challenge ou 403, aplica cooldown de 30 minutos e tenta Steel para screenshot. Quando Steel retorna apenas screenshot, o adapter devolve um HTML sintético com comentário, portanto não é uma extração de texto e não deve ser tratado como sucesso editorial.[34] [36]

`integrity-gate.ts` é uma defesa que Firecrawl não substitui: normaliza título, calcula Jaccard, rejeita corpos menores que o mínimo da vertical, detecta padrões de CAPTCHA/Cloudflare/“just a moment” e marca flags. O padrão recomendado é preservar esse gate depois de qualquer engine Firecrawl/Playwright, e enriquecer o registro com `render_engine`, `status_code`, `content_type`, `challenge_detected`, `robots_allowed` e `attempt`.[35]

## Plano de adaptação para os mineradores Waesy

### P0 — corrigir a confiabilidade da fila

Criar uma função server-side/RPC de claim que, em uma transação, selecione itens `pending` ou `retryable` cujo `next_attempt_at` venceu, ordene por prioridade/idade, aplique `FOR UPDATE SKIP LOCKED`, grave `status='processing'`, `lease_owner`, `lease_until`, `attempt`, `started_at` e devolva os itens ao worker. O worker deve renovar o lease durante browser/LLM e um reconciler deve mover `processing` expirado para `retryable` ou `dead_letter`. O update final deve exigir `id`, `lease_owner` e status atual, para que um worker antigo não possa sobrescrever o resultado de uma reexecução.

Separar o “job de descoberta” do “job de página”. Um item de feed/sitemap cria URLs canônicas com chave única; cada URL produz uma tentativa de scrape/extract; a vertical só persiste depois do contrato de extração e do integrity gate. Para as oito verticais, o dispatcher existente continua útil, mas não deve ser responsável por implementar as regras de fila oito vezes.

### P0 — política de retry e estados de bloqueio

Adicionar uma matriz de retry. Erros transitórios de rede, DNS ou 502/503/504 podem usar, por exemplo, 3 tentativas com `base=1s`, multiplicador 2, teto de 60s e jitter; 429 deve respeitar `Retry-After`; 401/403/robots disallow/CAPTCHA/schema inválido/HTTP 404 devem ser finais ou ir para revisão conforme a vertical. A matriz é uma recomendação de implementação para Waesy, não uma capacidade observada no código Firecrawl.

Persistir estados como `blocked_by_robots`, `blocked_by_policy`, `blocked_by_challenge`, `rate_limited`, `unsupported_content`, `empty_content`, `extraction_failed`, `retryable` e `dead_letter`. Isso mantém a distinção entre “site recusou acesso”, “sistema falhou” e “extrator não entendeu”. Um cooldown por domínio deve impedir que todos os jobs daquela origem falhem imediatamente em cadeia.

### P0 — politeness e segurança por domínio

Implementar `robots.txt` por host com TTL de 24 horas, User-Agent identificável e avaliação antes de enfileirar links. Usar o `crawl-delay` como piso de atraso quando presente; se o portal exigir autorização, respeitar a lista de domínios permitidos do Waesy. Adicionar token bucket/semaphore por registrable domain, separado da concorrência global, com limite configurável por fonte e jitter.

Adicionar validação de URL e DNS para bloquear IP privado, loopback, link-local e protocolos não HTTP(S), seguindo o padrão do Playwright service. Registrar redirects e revalidar o destino final contra allowlist/blocklist. Firecrawl faz isso no browser service e tem blocklist/threat policy no caminho da API; Waesy deve ter o equivalente antes de abrir uma página ou seguir um link descoberto.

O modo anti-bot deve ser “renderização autorizada”, não “bypass”. Native fetch, Playwright e Firecrawl podem ser selecionados como engines de acesso público permitido. CAPTCHA, login obrigatório, robots disallow e challenge explícito devem causar bloqueio/cooldown ou revisão. Não usar rotação de User-Agent, proxies ou Steel para contornar controles de acesso sem autorização e sem avaliação jurídica/comercial do alvo.

### P1 — discovery e reprodutibilidade

Criar um módulo `site-discovery` com três fontes: RSS/Atom já existente, sitemap/robots e links HTML. Cada URL deve ser canonicalizada removendo fragmentos e parâmetros de tracking; parâmetros funcionais podem ser preservados sob configuração. Deduplicar por canonical URL antes da fila e por content hash depois da extração. A política deve suportar `includePaths`, `excludePaths`, `maxDepth`, `maxDiscoveryDepth`, `allowSubdomains`, `allowExternalLinks=false` e `ignoreQueryParameters=true` por padrão.

Oferecer dois modos. `map` descobre e retorna candidatos com baixo custo; `crawl` cria jobs de página e registra recusas. Guardar `discovery_source`, `discovered_from`, `depth`, `scope_decision` e `denial_reason`. Isso permitirá auditar por que uma notícia de sitemap entrou, por que um PDF foi ignorado ou por que um link externo não virou job.

Para execuções reprodutíveis, o Waesy deve aceitar `concurrency=1`/`delay` e ordenar a saída por `discovered_at`/`sequence`, não por término do worker. Para produção, a ordem de ingestão pode ser concorrente, mas o estado deve manter a sequência de descoberta e a ordenação editorial separadas.

### P1 — adapter Firecrawl/Browser correto

Atualizar o client para a API v2 documentada e tratar scrape/crawl/map como operações distintas. Para uma URL conhecida, usar scrape com formatos mínimos necessários; para site, começar por map quando houver seleção humana ou crawl quando a cobertura recursiva for desejada; para lote estruturado, usar extract assíncrono e salvar o id/status. Preferir webhook ou polling com timeout e backoff, em vez de manter uma request HTTP de 20 segundos para todo o trabalho.

Manter a cascata local: `native-fetch` para HTML estático, Firecrawl/Playwright para JS ou renderização necessária, parser PDF/OCR só quando o tipo exigir, e `mechanical-extractor` depois do conteúdo renderizado. O resultado do engine deve sempre trazer `provider`, `engine`, `url_final`, `status_code`, `content_type`, `raw/markdown`, `cached`, `attempt` e `elapsed_ms`. Se a saída for apenas screenshot, marcar `visual_only` e não enviar para o fluxo editorial de texto.

Se o Waesy self-hostar Firecrawl, planejar explicitamente o stack e as limitações da versão escolhida: Redis, queue backend, Playwright, volumes, logs, health checks e backup. Não habilitar uma flag esperando obter Fire Engine, Interact ou anti-bot avançado que a documentação classifica como serviço separado/Cloud-only no self-host padrão.[8]

### P1 — contrato de extração e qualidade

Manter a ordem mecânica antes do LLM. Para notícias, o contrato mínimo deve exigir título não genérico, corpo com o tamanho/paragraph count da vertical, URL fonte, timestamp/author quando disponível, content type, status HTTP e imagem apenas quando for uma URL real. Para jobs, licitações, imóveis, leilões, places e eventos, schemas Zod por vertical devem distinguir campo ausente de campo inferido.

Salvar `extraction_method` (`json_ld`, `density`, `markdown`, `llm_schema`, `pdf_text`, `ocr`), versão do parser, hash do conteúdo, tokens/custo de LLM, warnings e fonte. O Firecrawl trimma entradas por token e trata schema estrito; Waesy pode adotar a mesma disciplina para evitar mandar páginas enormes ou listas inteiras ao modelo.[27]

A deduplicação deve ocorrer em três níveis: URL canônica na fila, content hash para republicação literal e cluster semântico para o mesmo fato em fontes diferentes. Os limiares Jaccard atuais de 0,55 para cluster e 0,80 para duplicata devem permanecer configuráveis por vertical e ser calibrados com dados reais; não devem ser tratados como verdade universal.

### P2 — observabilidade e storage

Adicionar métricas Prometheus ou compatíveis: `crawl_claim_total`, `crawl_lease_expired_total`, `scrape_attempt_total{provider,engine,status}`, `domain_inflight`, `domain_cooldown_active`, `robots_blocked_total`, `challenge_blocked_total`, `extraction_gate_rejected_total{reason}`, `queue_wait_seconds`, `fetch_seconds`, `llm_tokens_total` e `persist_failure_total`. O trace deve atravessar o job de fila e incluir `crawl_id`, `queue_id`, `url_hash`, domínio e vertical, sem incluir o corpo quando a retenção for zero.

O `scraper_audit_log` agregado deve continuar como relatório FinOps. Criar também `crawler_job_attempts` (um registro por tentativa) e `crawler_discoveries` (um registro por URL descoberta/recusada). Guardar raw HTML somente sob retenção configurada, redigir cookies/Authorization e separar conteúdo de telemetria. Um pequeno TTL em Redis pode manter leases, cooldowns e frontier transitória; Supabase/Postgres permanece a fonte durável para estado de negócio, auditoria e DLQ.

Usar webhooks internos/eventos apenas quando houver consumidor idempotente. Cada evento deve ter `event_id`, `job_id`, `attempt`, `occurred_at`, `schema_version` e chave de deduplicação. O objetivo não é replicar toda a infraestrutura Firecrawl, mas trazer para Waesy os invariantes: job não desaparece, conclusão é idempotente, falha é observável e retry não duplica publicação.

## Limites e cautelas

O repositório muda rapidamente. A documentação de self-host consultada está explicitamente fixada em `v2.11.162`, enquanto o checkout analisado é um commit mais recente da branch principal; por isso o Compose do commit e as notas de release devem ser tratados como fonte de verdade para uma implantação específica.[8] O rate-limit documentado é da API hospedada e não deve ser usado como sizing de Waesy self-host.[9]

Não encontrei evidência suficiente para afirmar que Firecrawl impõe automaticamente um limite independente por domínio em todo crawl, que todo `crawl-delay` de robots é aplicado automaticamente, ou que Fire Engine/stealth está disponível no self-host padrão. O código mostra leitura de robots, delay configurável, semáforo por equipe e engines opcionais; as limitações estão registradas acima para não converter nomes de features em garantias.

A presença de um fallback de screenshot no adapter Waesy não equivale a conteúdo extraído. O caminho atual também usa `/v1/scrape`, enquanto a documentação atual exemplifica `/v2`; uma migração deve ser testada contra o contrato e plano da conta, não assumida. Este relatório não recomenda bypass de CAPTCHA, autenticação ou robots, e não substitui revisão jurídica dos sites/fontes que Waesy pretende acessar.

## Referências

[1]: https://docs.firecrawl.dev/introduction "Firecrawl — Introduction"
[2]: https://docs.firecrawl.dev/features/scrape "Firecrawl — Scrape"
[3]: https://docs.firecrawl.dev/features/crawl "Firecrawl — Crawl"
[4]: https://docs.firecrawl.dev/features/map "Firecrawl — Map"
[5]: https://docs.firecrawl.dev/features/extract "Firecrawl — Extract"
[6]: https://github.com/firecrawl/firecrawl/blob/8c84d8b6a155495b8088c286d878b2f875de3918/apps/api/src/services/queue-service.ts "Firecrawl source — queue-service.ts"
[7]: https://docs.firecrawl.dev/advanced-scraping-guide "Firecrawl — Advanced Scraping Guide"
[8]: https://docs.firecrawl.dev/contributing/self-host "Firecrawl — Self-hosting"
[9]: https://docs.firecrawl.dev/rate-limits "Firecrawl — Rate Limits"
[10]: https://github.com/firecrawl/firecrawl/blob/8c84d8b6a155495b8088c286d878b2f875de3918/apps/api/src/services/queue-worker.ts "Firecrawl source — queue-worker.ts"
[11]: https://github.com/firecrawl/firecrawl/blob/8c84d8b6a155495b8088c286d878b2f875de3918/docker-compose.yaml "Firecrawl source — docker-compose.yaml"
[12]: https://github.com/firecrawl/firecrawl/blob/8c84d8b6a155495b8088c286d878b2f875de3918/apps/api/src/scraper/WebScraper/crawler.ts "Firecrawl source — WebScraper/crawler.ts"
[13]: https://github.com/firecrawl/firecrawl/blob/8c84d8b6a155495b8088c286d878b2f875de3918/apps/api/src/scraper/crawler/sitemap.ts "Firecrawl source — scraper/crawler/sitemap.ts"
[14]: https://github.com/firecrawl/firecrawl/blob/8c84d8b6a155495b8088c286d878b2f875de3918/apps/api/src/lib/crawl-redis.ts "Firecrawl source — crawl-redis.ts"
[15]: https://github.com/firecrawl/firecrawl/blob/8c84d8b6a155495b8088c286d878b2f875de3918/apps/api/src/lib/robots-txt.ts "Firecrawl source — robots-txt.ts"
[16]: https://github.com/firecrawl/firecrawl/blob/8c84d8b6a155495b8088c286d878b2f875de3918/apps/api/src/scraper/scrapeURL/lib/fetch.ts "Firecrawl source — scrapeURL/lib/fetch.ts"
[17]: https://github.com/firecrawl/firecrawl/blob/8c84d8b6a155495b8088c286d878b2f875de3918/apps/api/src/scraper/scrapeURL/retryTracker.ts "Firecrawl source — scrapeURL/retryTracker.ts"
[18]: https://github.com/firecrawl/firecrawl/blob/8c84d8b6a155495b8088c286d878b2f875de3918/apps/api/src/main/runWebScraper.ts "Firecrawl source — main/runWebScraper.ts"
[19]: https://github.com/firecrawl/firecrawl/blob/8c84d8b6a155495b8088c286d878b2f875de3918/apps/api/src/services/extract-queue.ts "Firecrawl source — extract-queue.ts"
[20]: https://github.com/firecrawl/firecrawl/blob/8c84d8b6a155495b8088c286d878b2f875de3918/apps/api/src/services/extract-worker.ts "Firecrawl source — extract-worker.ts"
[21]: https://github.com/firecrawl/firecrawl/blob/8c84d8b6a155495b8088c286d878b2f875de3918/apps/api/src/scraper/scrapeURL/engines/index.ts "Firecrawl source — scrapeURL/engines/index.ts"
[22]: https://github.com/firecrawl/firecrawl/blob/8c84d8b6a155495b8088c286d878b2f875de3918/apps/api/src/scraper/scrapeURL/engines/playwright/index.ts "Firecrawl source — scrapeURL/engines/playwright/index.ts"
[23]: https://github.com/firecrawl/firecrawl/blob/8c84d8b6a155495b8088c286d878b2f875de3918/apps/playwright-service-ts/api.ts "Firecrawl source — playwright-service-ts/api.ts"
[24]: https://github.com/firecrawl/firecrawl/blob/8c84d8b6a155495b8088c286d878b2f875de3918/apps/api/src/controllers/v2/crawl.ts "Firecrawl source — controllers/v2/crawl.ts"
[25]: https://github.com/firecrawl/firecrawl/blob/8c84d8b6a155495b8088c286d878b2f875de3918/apps/api/src/controllers/v2/scrape.ts "Firecrawl source — controllers/v2/scrape.ts"
[26]: https://github.com/firecrawl/firecrawl/blob/8c84d8b6a155495b8088c286d878b2f875de3918/apps/api/src/scraper/scrapeURL/transformers/index.ts "Firecrawl source — transformers/index.ts"
[27]: https://github.com/firecrawl/firecrawl/blob/8c84d8b6a155495b8088c286d878b2f875de3918/apps/api/src/scraper/scrapeURL/transformers/llmExtract.ts "Firecrawl source — transformers/llmExtract.ts"
[28]: https://github.com/firecrawl/firecrawl/blob/8c84d8b6a155495b8088c286d878b2f875de3918/apps/api/src/lib/otel-tracer.ts "Firecrawl source — otel-tracer.ts"
[29]: https://github.com/firecrawl/firecrawl/blob/8c84d8b6a155495b8088c286d878b2f875de3918/apps/api/src/services/logging/log_job.ts "Firecrawl source — logging/log_job.ts"
[30]: https://github.com/firecrawl/firecrawl/blob/8c84d8b6a155495b8088c286d878b2f875de3918/apps/api/src/services/webhook/queue.ts "Firecrawl source — webhook/queue.ts"
[31]: file:///home/ubuntu/waesy-audit/SYSTEM_INVENTORY.md "Waesy local source — SYSTEM_INVENTORY.md"
[32]: file:///home/ubuntu/waesy-audit/src/services/mining/crawler-batch-engine.ts "Waesy local source — crawler-batch-engine.ts"
[33]: file:///home/ubuntu/waesy-audit/src/services/mining/automated-harvest.ts "Waesy local source — automated-harvest.ts"
[34]: file:///home/ubuntu/waesy-audit/src/lib/mining/firecrawl-client.ts "Waesy local source — firecrawl-client.ts"
[35]: file:///home/ubuntu/waesy-audit/src/services/mining/integrity-gate.ts "Waesy local source — integrity-gate.ts"
[36]: https://docs.firecrawl.dev/api-reference/endpoint/scrape "Firecrawl — Scrape API reference"

**Arquivos locais comparados:** `/home/ubuntu/waesy-audit/SYSTEM_INVENTORY.md`, `/home/ubuntu/waesy-audit/src/services/mining/crawler-batch-engine.ts`, `/home/ubuntu/waesy-audit/src/services/mining/automated-harvest.ts`, `/home/ubuntu/waesy-audit/src/services/mining/integrity-gate.ts`, `/home/ubuntu/waesy-audit/src/lib/mining/firecrawl-client.ts` e demais arquivos em `/home/ubuntu/waesy-audit/src/services/mining/`.
