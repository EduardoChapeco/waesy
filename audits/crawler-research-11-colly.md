# Colly como referência para melhorar os mineradores Waesy

**Objeto:** `gocolly/colly` (`master`) comparado ao inventário Waesy e ao código em `src/services/mining/`.

**Base técnica consultada:** README e árvore do repositório oficial, documentação oficial Go Colly, API no pkg.go.dev e código-fonte primário. A página de API consultada está publicada como `v2.3.0`; o código-fonte de implementação foi lido no branch `master`. As conclusões abaixo descrevem somente o que está implementado ou explicitamente documentado nessas fontes. Não trato o Colly como um navegador e não atribuo ao projeto capacidades que aparecem apenas em ferramentas externas.

## O que o Colly realmente é

O núcleo do Colly é um **orquestrador HTTP orientado a callbacks**, não um browser automation framework. Um `Collector` mantém o cliente HTTP, cookies, storage de URLs visitadas, regras de domínio/URL, callbacks, contadores, limite de requisições, cache opcional, mapa de `robots.txt` e um `WaitGroup`. `Visit` cria uma requisição; `Request.Visit` cria uma nova requisição preservando `Context` e incrementando a profundidade. O README resume o posicionamento como framework para crawler/scraper/spider, com API limpa, modo síncrono ou assíncrono, cookies, cache, `robots.txt`, limites por domínio e extensões [1] [2].

O fluxo de uma requisição é, em termos de código, `scrape` → checagens de profundidade, máximo de requisições, filtros, robots e URL já visitada → callback `OnRequest` → backend HTTP/cache → callback de headers → callback de erro, se aplicável → normalização de charset → `OnResponse` → `OnHTML` e/ou `OnXML` → `OnScraped` [7]. A documentação oficial registra a ordem dos callbacks: `OnRequest`, `OnError`, `OnResponseHeaders`, `OnResponse`, `OnHTML`, `OnXML` e `OnScraped` [3].

### Objetos e separação de responsabilidades

- **`Collector`:** coordena ciclo de vida, filtros, callbacks, backend e storage.
- **`Request`:** representa método, URL, headers, corpo, profundidade, ID, contexto e proxy aplicado. Tem `Visit`, `Post`, `Do`, `Retry`, `HasVisited`, `Abort` e serialização para fila [10].
- **`Response`:** carrega status, bytes do corpo, headers, request, contexto e, se habilitado, `TraceHTTP`; também pode salvar o corpo em disco [11].
- **`Context`:** mapa pequeno, concorrente e serializável de metadados entre callbacks e requests derivados [15].
- **`httpBackend`:** aplica `LimitRule`, headers de request, cliente HTTP, redirects, cache GET, limite de corpo, descompressão gzip e leitura do corpo [9].
- **`storage.Storage`:** guarda URLs visitadas e cookies. O default é somente memória; `SetStorage` troca o backend e reaproveita a mesma abstração para cookies [12].

Essa decomposição é importante para o Waesy: o Colly resolve transporte, ciclo de request, discovery por callbacks e deduplicação local; não substitui o banco de negócio, a validação editorial, o modelo de entidades ou o scheduler durável.

## Filas, workers e discovery

Há duas camadas que não devem ser confundidas.

### Queue explícita do pacote `queue`

O pacote oficial `github.com/gocolly/colly/v2/queue` implementa uma fila de **requests serializados**. A interface da storage de fila exige `Init`, `AddRequest`, `GetRequest` e `QueueSize`, e precisa ser segura para uso concorrente [8]. `queue.New(threads, storage)` cria consumidores; o exemplo oficial usa dois consumidores e `InMemoryQueueStorage` [4]. `Queue.Run` inicia os workers, bloqueia até a fila ficar vazia e não haver requests ativos, e cada worker chama `Request.Do()` [8]. Requests adicionados durante a execução acordam o loop por um canal interno.

A storage padrão da fila é em memória. No código atual, a capacidade default usada por `queue.New` é 100.000 requests; uma storage com `MaxSize` descarta novas entradas ao atingir a capacidade e retorna `ErrQueueFull` [8]. A fila não é, por si só, uma fila distribuída, não oferece lease, retry agendado, prioridade ou claim transacional. Uma storage customizada pode mudar a durabilidade, mas o contrato de fila continua pequeno e não implementa sozinho coordenação de múltiplos workers.

### Discovery por callbacks

O padrão mais idiomático é `OnHTML("a[href]", func(e) { e.Request.Visit(e.Attr("href")) })`; a documentação oficial usa exatamente esse modelo [1] [3]. Cada link passa novamente por:

1. normalização/parsing de URL;
2. `MaxDepth` e `MaxRequests`;
3. `DisallowedURLFilters`, `URLFilters` e allow/deny de domínio;
4. `robots.txt`, se ativado;
5. hash de URL/request e storage de URLs visitadas;
6. execução assíncrona ou síncrona, conforme `Async`.

`OnHTML` usa seletores CSS através de `goquery`. `OnXML` usa XPath com `htmlquery` ou `xmlquery` e aceita XML, RSS e Atom quando o content-type ou o sufixo indica XML [7] [10]. O Colly, portanto, tem primitives para seguir links e ler feeds/sitemaps, mas não possui um planejador semântico de discovery, classificação de entidades ou política de prioridade de negócio.

### Concorrência

`Async(true)` dispara requests em goroutines e requer `Wait()` para aguardar o término [3] [7]. Isso não equivale a um limite global de concorrência. O limite é aplicado por regra de domínio no backend; a fila explícita tem sua própria contagem de threads. Essa separação permite combinar fila com regras por host, mas exige cuidado para não contar `Queue.Threads` como politeness.

## Politeness, robots e limites

`LimitRule` pode casar `DomainGlob` ou `DomainRegexp` e aplicar `Parallelism`, `Delay` e `RandomDelay`. O backend adquire um slot antes do request e libera o slot depois de dormir o atraso configurado; na implementação atual, atraso e aleatoriedade estão ligados à liberação do slot, e não a uma política HTTP de retry [9]. O exemplo oficial limita a dois requests simultâneos para `*httpbin.*` e demonstra `Async` + `Wait` [5].

O Collector também implementa allowlist e denylist de domínios, filtros de URL, profundidade máxima, máximo de requests, limite de corpo de resposta de 10 MB por default e timeout de cliente default de 10 segundos [7] [9]. Esses controles são bons blocos de segurança operacional e de redução de custo.

O código possui suporte a `robots.txt`, cache por host e erro explícito `ErrRobotsTxtBlocked`. Porém, a inicialização atual de `Collector` define `IgnoreRobotsTxt = true`. Assim, o suporte existe, mas **a configuração default do código lido não consulta robots**; para uma política Waesy de respeito a robots, é necessário deixar essa opção falsa de forma explícita e testar esse comportamento [7]. Não se deve dizer que “Colly sempre respeita robots” sem essa ressalva.

## Retries e tratamento de falhas

O Colly oferece `OnError`, que recebe `Response` e `error`, e `Request.Retry()`, que repete os mesmos parâmetros. O retry exige corpo seekable quando houver corpo de request; otherwise retorna `ErrRetryBodyUnseekable` [10]. O código do Collector não traz uma política pronta de retries exponenciais, classificação de status, leitura de `Retry-After`, jitter de retry ou limite de tentativas. Uma política de retry precisa ser implementada no `OnError` ou em uma camada externa.

Há distinção entre falha de transporte, status HTTP não 2xx e erro de parsing. Por default, o Colly trata respostas HTTP não 2xx como erro e só permite continuar com `ParseHTTPErrorResponse`; callbacks de erro recebem status e request mesmo quando não há resposta completa [7]. Isso é suficiente para construir uma política, mas não é uma política pronta.

Para o Waesy, a consequência é direta: Colly pode chamar uma função de retry por request, mas o **retry durável por item** deve continuar no `crawl_queue`, com tentativas, `available_at`, motivo, `Retry-After` e limite de tentativas no banco. Não é seguro considerar que `Request.Retry()` substitui esse estado.

## Cache, cookies e storage

O Collector inicia com `storage.InMemoryStorage`, que guarda hash de requests visitados e cookies em memória [12]. `SetStorage` inicializa a storage customizada e cria um cookie jar apoiado por ela [7] [12]. O contrato primário é pequeno: `Visited`, `IsVisited`, `Cookies` e `SetCookies`.

O cache HTTP é opcional. Ao configurar `CacheDir`, GETs são armazenados como arquivos, com chave SHA-1 da URL; `CacheExpiration` permite invalidar arquivos velhos. O código não usa cache quando o método não é GET ou quando o request traz `Cache-Control: no-cache`, e não aceita como cache reutilizável uma resposta com status a partir de 500 [9]. Isso é cache de transporte, não deduplicação de conteúdo nem histórico editorial.

A serialização de `Request` usada pela fila inclui URL, método, profundidade, corpo, headers e valores do `Context` [8] [10]. O Context é útil para transportar `crawl_queue_id`, entidade e fonte; ainda assim, a verdade durável de status e idempotência deve ficar no Postgres do Waesy.

## Extração e parsing

O caminho de extração do Colly é deliberadamente mecânico:

- CSS selectors via `OnHTML`/`goquery`;
- XPath via `OnXML`/`htmlquery`/`xmlquery`;
- `Response.Body` como bytes completos, com opção de charset detection por `DetectCharset`;
- normalização de charset para respostas sem UTF-8 explícito;
- `Response.Save` para persistência simples em disco [7] [11].

O código não fornece JSON-LD semântico, OpenGraph, readability/text-density, schema validation, classificação editorial, Jaccard ou persistência em tabelas de domínio. Essas camadas continuam sendo responsabilidade do Waesy.

O `OnResponseHeaders` pode abortar antes de baixar o corpo. Isso é útil para não consumir arquivos grandes ou tipos que não serão extraídos; a documentação do código alerta que abortar dessa maneira impede reuso de conexão em HTTP/1.1 [7].

## Browser, rendering e JavaScript

O Colly usa `net/http` e parsers de HTML/XML. A arquitetura lida com o HTML/XML retornado pelo servidor; não há runtime JavaScript, DOM pós-hidratação, Playwright, Puppeteer, Chrome DevTools, screenshot, resolução de CAPTCHA ou execução de browser headless no núcleo e nos pacotes oficiais consultados [1] [7] [11].

Há suporte a cliente HTTP customizado, `RoundTripper`, redirects, cookie jar e proxy HTTP/SOCKS5; o pacote oficial de proxy inclui um switcher round-robin que altera o proxy por request [7] [14]. Isso não é rendering e não é um mecanismo legítimo de contorno de controle de acesso. O Colly não afirma que uma troca de proxy ou User-Agent torna permitido acessar uma fonte.

Para sites dependentes de JavaScript, o desenho correto é tratar um renderer externo autorizado como **escada de fallback**, separado do worker HTTP. Não é correto prometer que “adotar Colly” resolverá conteúdo renderizado.

## Observabilidade e depuração

O pacote `debug` fornece a interface `Debugger` (`Init`, `Event`) e eventos com `Type`, `RequestID`, `CollectorID` e mapa de valores. Há `LogDebugger` e `WebDebugger` [13]. O Collector gera eventos de request, headers, response, HTML, XML, error e scraped; `Collector.String()` informa contadores e quantidade de callbacks; `TraceHTTP` preenche `Response.Trace` com dados de timing de rede [7].

Esses recursos são bons pontos de integração, mas não são um sistema de observabilidade de produção. O Colly não grava automaticamente métricas em Postgres, não mantém um `scraper_audit_log`, não calcula qualidade de extração, não faz tracing distribuído e não correlaciona um item de fila de negócio sem o Waesy colocar esse ID em `Context` e nos eventos.

## Anti-bot dentro de limites legais

O que existe oficialmente e pode ser usado de forma responsável:

- User-Agent e headers configuráveis;
- cookies e sessão HTTP;
- limites por domínio e atrasos aleatórios;
- robots configurável;
- allowlist/denylist e filtros de URL;
- cooldown e abandono de requests implementáveis no callback de erro;
- proxy configurável para ambientes em que o uso é autorizado [7] [9] [14].

O que não existe como capacidade oficial do Colly: solver de CAPTCHA, bypass de Cloudflare/Turnstile, fingerprinting de browser, evasão de WAF, stealth browser ou garantia de que um proxy será aceito. A recomendação Waesy deve ser: priorizar APIs públicas e feeds, respeitar termos e robots, identificar o bot com contato, usar limites conservadores, parar após challenge/403 e só usar proxy ou credenciais com autorização expressa. Não rotacionar identidade para contornar bloqueio de uma fonte que proibiu o acesso.

## Comparação com o inventário e o código Waesy

O inventário informa 21 arquivos em `src/services/mining/`, 8 verticais, Supabase Postgres com RLS/pg_cron/pg_net/pgvector e motores de parsers mecânicos, Jaccard, Overpass, PNCP e BCB (`SYSTEM_INVENTORY.md`, linhas 10–21). O código lido mostra que o Waesy já possui mais estado de negócio e mais camadas de extração do que o Colly; Colly é uma possível camada de transporte/discovery, não uma substituição integral.

| Dimensão | Colly observado | Waesy observado | Leitura para adoção |
|---|---|---|---|
| Unidade de trabalho | `Collector`/`Request`/`Response`; fila opcional de requests | `crawl_queue` no Supabase, roteamento por `entity_type` | Manter Postgres como fonte de verdade; usar Colly dentro de workers |
| Claim e estados | `Queue.Run` consome e termina; não há lease ou status de negócio | `pending` → `processing` → `completed`/`failed`, incrementa `retry_count` (`crawler-batch-engine.ts:58–93`) | Waesy tem estado durável, mas precisa claim atômico/lease para múltiplos workers |
| Ordem/prioridade | Fila em memória FIFO; sem prioridade nativa | ordena `priority DESC`, depois `created_at ASC` (`crawler-batch-engine.ts:58–65`) | Não trocar a prioridade do banco pela fila default do Colly |
| Paralelismo | `Async`, `Queue.Threads` e `LimitRule` por domínio | `for ... of` sequencial no batch principal; `Promise.all` no enriquecimento PNCP (`crawler-batch-engine.ts`, `pncp-harvester.ts:41–55`) | Adicionar limites por host também para chamadas paralelas de APIs |
| Discovery | `OnHTML` e `OnXML`, `Request.Visit`, profundidade/filtros | RSS (`automated-harvest.ts:105–128`), feeds no batch (`crawler-batch-engine.ts:245–287`), upsert por URL; comentários mencionam sitemap, mas o fluxo lido não implementa um parser de sitemap nessa pasta | Colly pode preencher discovery de links/XML; manter normalização e deduplicação no banco |
| Deduplicação | Hash de request em storage local; revisit proibido por default | SHA-256 de URL canônica e consultas a `mined_raw_extractions`/`news_articles` (`automated-harvest.ts:58–76`, `140–163`); upsert de RSS por `url` | Unificar uma chave canônica e uma constraint única de URL/entidade |
| Politeness | `LimitRule` por glob/regexp, `Parallelism`, `Delay`, `RandomDelay`; robots disponível mas default `IgnoreRobotsTxt=true` | `fetchWithRetry`, rate window em memória, cooldown por domínio persistido em `domain_cooldowns`, circuit breaker | Usar Colly para limite por host, mas manter cooldown/decisão global no Waesy |
| Retry | Só `Request.Retry()` + `OnError`; sem backoff pronto | 3 retries default, backoff 1/2/4s, cap 30s, statuses retryáveis 408/429/500/502/503/504, `Retry-After`, cooldown 429 e 403 (`scraper-utils.ts:252–350`) | Portar a classificação do Waesy; não substituí-la pela API `Retry()` |
| Circuit breaker | Não há circuito por domínio no núcleo | singleton com 3 falhas, 30s cooldown e timeout de 8s (`crawler-circuit-breaker.ts:142–147`) | Chamar o breaker antes do Collector e registrar transições |
| HTTP/rendering | HTTP puro; cookies, redirects, cache, charset; não executa JS | Firecrawl API, fetch nativo e Steel screenshot (`firecrawl-client.ts:52–209`) | Fallback de renderer deve ficar externo; Colly não substitui Firecrawl/Steel |
| Extração | CSS/XPath e corpo bruto | JSON-LD, OpenGraph/meta, seletores por domínio, densidade textual, sanitização, integrity gate e curadoria AI (`mechanical-extractor.ts:1–10`, `204–328`) | Colly pode entregar HTML/headers; preservar extratores Waesy |
| Persistência | storage de visited/cookies e cache de arquivos | tabelas `crawl_queue`, `mined_raw_extractions`, `mined_articles`, `news_articles`, verticais e `scraper_audit_log` | Manter modelo de negócio e auditoria em Supabase |
| Observabilidade | Debugger, eventos, `String`, `TraceHTTP` | logs de console, contadores de resultado e auditoria por harvester | Adaptar eventos para auditoria com `crawl_queue_id` e métricas |
| Conteúdo/API oficial | sem semântica de domínio | PNCP e DataJud consultados por APIs específicas; PNCP faz upsert por `pncp_id` (`pncp-harvester.ts:88–113`) | APIs oficiais continuam preferíveis ao crawling HTML |

### Achados específicos do Waesy que a comparação revela

1. **O batch principal não é concorrente.** `executeCrawlQueueBatchDirect` busca um lote, marca cada item e processa cada um dentro de um `for ... of`. Isso dá uma forma de backpressure simples, mas o código mostrado não implementa espera por domínio nem claim atômico entre processos.

2. **`retry_count` é incrementado no claim, mas a própria função não reprograma automaticamente um item falho.** O item é marcado `failed` com `error_message`; não há, nesse arquivo, `available_at`, backoff persistido ou retorno para `pending`. A política precisa ser completada no scheduler/SQL.

3. **Discovery de RSS é melhor que discovery genérico de links, mas está espalhado.** O batch limita filhos de feed a 15 e usa `upsert` com `onConflict: "url"`; o harvester automatizado usa lista de feeds canônicos e limite `maxItems`. Não há, nos arquivos lidos, um pipeline único para seguir links HTML com allowlist por domínio.

4. **O Waesy já possui uma política de retry mais rica que o Colly.** `fetchWithRetry` interpreta `Retry-After`, distingue 429/403, cria cooldown progressivo e persiste cooldown em Postgres. Esta lógica deve ser preservada e apenas receber sinais do transporte Colly.

5. **Há duas proteções de falha com escopos diferentes.** O circuit breaker mantém estado por domínio em memória; `setDomainCooldown` também mantém mapa em memória e persiste `domain_cooldowns`. A integração precisa definir precedência e evitar que workers diferentes tomem decisões incompatíveis.

6. **A escada de renderer não entrega sempre conteúdo extraível.** Se Firecrawl falhar, o fallback nativo tenta obter HTML. Se o domínio parecer bloqueado ou a resposta falhar, Steel pode retornar somente uma URL de screenshot e o código monta um HTML com o comentário `<!-- Steel screenshot captured -->` (`firecrawl-client.ts:161–190`). Isso é evidência de captura, não corpo textual. Um worker deve marcar esse resultado como `rendered_screenshot_only`, não publicá-lo como matéria.

7. **O `mechanical-extractor` tem quatro camadas reais de extração, mas os comentários de “stealth/anti-bloqueio” não mudam essa limitação.** O fetch usa headers de navegador, User-Agents rotativos, duas tentativas adicionais com espera fixa de 1s/2s e fallback Jina Reader (`mechanical-extractor.ts:123–198`). Isso não equivale a browser completo nem autoriza bypass de controle de acesso.

8. **O PNCP combina busca e enriquecimento paralelo.** `Promise.all` enriquece todos os contratos retornados, embora limite a busca profunda de itens aos três primeiros. Esse paralelismo deve ter limite por API e `Retry-After`, especialmente se um Collector for introduzido para endpoints HTTP.

## Adaptação recomendada: Colly como worker HTTP controlado pelo Waesy

### 1. Manter a fila durável e adicionar claim seguro

Não substituir `crawl_queue` pelo `InMemoryQueueStorage`. Criar uma função SQL/RPC de claim que faça, em transação, `SELECT ... FOR UPDATE SKIP LOCKED`, limite por `store_id`/domínio e grave `processing`, `lease_until`, `worker_id`, `attempt` e `started_at`. Um item expirado pode voltar a `pending` apenas depois do lease. `retry_count` deve ser acompanhado de `next_attempt_at` e `last_error_class`.

Dentro do worker, criar um Collector por lote/vertical ou por política de domínio. Colocar `crawl_queue_id`, `entity_type`, cidade, estado e fonte em `colly.Context`. Não permitir que um callback publique diretamente sem passar pelo idempotency key e pelo integrity gate do Waesy.

### 2. Configurar politeness de forma explícita

Para cada fonte autorizada:

- `AllowedDomains` com allowlist fechada;
- `DisallowedURLFilters` para downloads, logout, pesquisa infinita e URLs com parâmetros explosivos;
- `MaxDepth` e `MaxRequests` finitos por job;
- `MaxBodySize` menor para páginas que não precisam de 10 MB;
- `LimitRule` por hostname, com `Parallelism` baixo e `Delay`/`RandomDelay` calibrados;
- `IgnoreRobotsTxt` falso, validado por teste de integração;
- `Context` com cancelamento e timeout do job;
- `OnResponseHeaders` para abortar MIME/tamanho não desejados.

A regra de domínio deve ser unificada com `waitForRateLimit`/cooldown do Waesy. Se um domínio estiver em `domain_cooldowns`, não chamar Colly; se receber 429/403/challenge, pausar o domínio e persistir a decisão.

### 3. Usar discovery estruturado, não crawling aberto

Para notícias, começar por RSS, sitemap permitido ou API oficial. Usar `OnXML` para extrair links de feed/sitemap e `OnHTML` somente em páginas de domínio autorizado. Cada URL descoberta deve ser canonicalizada, removendo rastreadores e fragmentos, e inserida por constraint única no `crawl_queue` com metadata do pai, profundidade e motivo.

O armazenamento local de visited do Colly é um acelerador. Ele não deve ser a única deduplicação em uma instalação com vários workers ou com reprocessamento por data.

### 4. Integrar retries sem duplicar políticas

No `OnError`, classificar:

- retry limitado para timeout, falha de conexão, 408, 429, 500, 502, 503 e 504;
- usar `Retry-After` quando presente;
- não repetir 404, URL proibida, bloqueio de robots ou erro permanente de parsing;
- para challenge/403, registrar e aplicar cooldown, sem tentar contornar;
- persistir a próxima tentativa no `crawl_queue` com backoff exponencial e jitter.

`Request.Retry()` pode ser usado apenas para um retry rápido dentro da mesma tentativa, sempre com contador no Context. O retry principal deve reabrir o job via banco, para sobreviver a reinício do processo.

### 5. Encadear extração Colly ao pipeline existente

`OnResponse` deve encaminhar corpo, headers, status, URL final, profundidade e tempo para o `mechanical-extractor`. O Colly pode reduzir código de fetch e entregar `goquery`/XPath para seletores simples, mas não remover:

- JSON-LD e `@graph`;
- OpenGraph/meta tags;
- dicionário de seletores por domínio;
- extração por densidade textual;
- `validateMechanicalCompleteness`/integrity gate;
- deduplicação e curadoria.

Após a extração mecânica, gravar `mined_raw_extractions` antes da curadoria AI. Só promover para `news_articles` depois de validação, atribuição da fonte e idempotência.

### 6. Separar HTTP de rendering externo

Manter Firecrawl/renderer autorizado como escalada quando HTML inicial não contiver conteúdo útil ou exigir JavaScript. O Collector não deve ser configurado para “burlar” esse caso. O resultado do renderer precisa informar `provider`, `rendered`, `screenshot_only`, `html_available` e `blocked`; screenshot sem DOM/texto deve falhar no integrity gate ou ir para revisão manual.

Para PNCP, DataJud, BCB e outras fontes com API pública, continuar usando o cliente de API específico. Crawler genérico não deve substituir fonte oficial estruturada.

### 7. Mapear eventos para a auditoria Waesy

Registrar, por request, `crawl_queue_id`, `request_id`, `collector_id`, URL original e final, host, depth, método, status, bytes, provider, cache hit, proxy autorizado, tentativas, erro classificado e duração. Usar:

- `OnRequest` para início;
- `OnResponseHeaders` para status/MIME e aborto;
- `OnResponse` para bytes e final URL;
- `OnError` para erro e agendamento;
- `OnScraped` para fechamento;
- `TraceHTTP` para timing de rede;
- `Debugger` customizado para emitir eventos estruturados, além de `scraper_audit_log`.

Não usar apenas `console.log`: ele não oferece correlação durável nem painel de taxa de erro por domínio.

### 8. Testar com uma fonte pública e casos adversariais

O rollout deve começar por um feed/portal público autorizado. Os testes precisam cobrir: URL duplicada com `utm_*`, redirect para domínio não permitido, robots proibindo path, 429 com `Retry-After`, 503 repetido, timeout, corpo acima do limite, charset não UTF-8, HTML sem corpo, RSS/XML, challenge 403, renderer que só retorna screenshot e reinício entre `processing` e retry. Medir requests por domínio, p95, bytes, taxa de erro, itens extraídos, duplicatas, custo de renderer e tempo até publicação.

## Limites que devem permanecer explícitos

- Colly não executa JavaScript e não é headless browser.
- Colly não possui retry exponencial automático nem entende `Retry-After` sem código do usuário.
- A fila oficial default é em memória; durabilidade/distribuição exigem storage e coordenação adicionais.
- A deduplicação default é local ao storage do Collector e não substitui constraint/claim no Supabase.
- O suporte a robots existe, mas o `Init` lido inicia com `IgnoreRobotsTxt=true`; habilitar conformidade é decisão de configuração.
- Proxy round-robin e User-Agent configurável não são bypass de anti-bot nem autorização para contornar bloqueios.
- Colly não extrai semântica editorial, não valida schema de negócio e não persiste as tabelas Waesy.
- A promessa geral do README de alta velocidade ou crawling de milhões de páginas não é garantia para um domínio específico, nem substitui orçamento de requests e limites do site-alvo.

## Conclusão operacional

A melhor adaptação é **compor**, não reescrever: Supabase `crawl_queue` e auditoria continuam controlando durabilidade, prioridade, estado e idempotência; a política de retry/circuit breaker do Waesy continua sendo autoridade; Colly entra como worker HTTP/XML/HTML com allowlist, robots explicitamente habilitado, `LimitRule`, callbacks, discovery controlado, cache opcional e eventos de telemetria. Firecrawl/Steel permanecem renderizadores externos de fallback, e parsers mecânicos, APIs oficiais, integrity gate e curadoria continuam no Waesy.

Assim, o projeto ganha uma unidade de crawling mais previsível e testável sem assumir capacidades que o Colly não tem e sem transformar proteção anti-bot em evasão. O ganho principal não é “bypassar bloqueios”; é tornar explícitos limites por domínio, profundidade, tamanho, visited state, callbacks, cancelamento, observabilidade e separação entre transporte e negócio.

## Referências

[1]: https://github.com/gocolly/colly "Repositório oficial gocolly/colly e README"
[2]: https://go-colly.org/docs/ "Documentação oficial Go Colly"
[3]: https://go-colly.org/docs/introduction/start/ "Go Colly — Getting started e ordem dos callbacks"
[4]: https://go-colly.org/docs/examples/queue/ "Go Colly — exemplo oficial de Queue"
[5]: https://go-colly.org/docs/examples/rate_limit/ "Go Colly — exemplo oficial de Rate limit"
[6]: https://pkg.go.dev/github.com/gocolly/colly/v2 "API oficial do pacote github.com/gocolly/colly/v2"
[7]: https://raw.githubusercontent.com/gocolly/colly/master/colly.go "Código-fonte primário — Collector"
[8]: https://raw.githubusercontent.com/gocolly/colly/master/queue/queue.go "Código-fonte primário — queue.Queue e Storage"
[9]: https://raw.githubusercontent.com/gocolly/colly/master/http_backend.go "Código-fonte primário — backend HTTP, cache e LimitRule"
[10]: https://raw.githubusercontent.com/gocolly/colly/master/request.go "Código-fonte primário — Request, Visit, Retry e Marshal"
[11]: https://raw.githubusercontent.com/gocolly/colly/master/response.go "Código-fonte primário — Response, charset e Save"
[12]: https://raw.githubusercontent.com/gocolly/colly/master/storage/storage.go "Código-fonte primário — storage de URLs visitadas e cookies"
[13]: https://pkg.go.dev/github.com/gocolly/colly/v2/debug "API oficial do pacote debug do Colly"
[14]: https://raw.githubusercontent.com/gocolly/colly/master/proxy/proxy.go "Código-fonte primário — proxy round-robin"
[15]: https://raw.githubusercontent.com/gocolly/colly/master/context.go "Código-fonte primário — Context entre callbacks e requests"
