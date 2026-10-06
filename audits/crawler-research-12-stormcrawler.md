# StormCrawler: análise técnica para evolução dos mineradores Waesy

## Identificação e escopo

O URL solicitado, `https://github.com/DigitalPebble/storm-crawler`, redireciona para o repositório oficial atual [`apache/stormcrawler`](https://github.com/apache/stormcrawler). A análise abaixo usa o repositório atual, a documentação oficial publicada em `stormcrawler.apache.org` e os READMEs/código dos módulos oficiais. O branch consultado é `main`; portanto, qualquer adoção deve ser feita contra uma versão fixada e testada, não contra o branch flutuante.

O inventário Waesy foi lido em `/home/ubuntu/waesy-audit/SYSTEM_INVENTORY.md`. O código comparado foi o conteúdo de `/home/ubuntu/waesy-audit/src/services/mining` e os utilitários diretamente importados em `/home/ubuntu/waesy-audit/src/lib/mining`. Não foram inferidas capacidades de arquivos que não foram encontrados.

## Arquitetura do StormCrawler

StormCrawler é uma coleção modular de componentes sobre Apache Storm, não um produto monolítico de busca. A separação central é entre **controle do crawl** e **processamento do conteúdo**. A fronteira decide o que e quando buscar; o pipeline de parsing/indexação decide o que extrair, manter e armazenar [3].

O fluxo oficial é:

1. Um `Spout` obtém URLs de uma fronteira ou de um backend de status, por exemplo `AggregationSpout` ou `SQLSpout`.
2. A URL é particionada, normalmente por host, para que a fila por destino imponha politeness.
3. `FetcherBolt` consulta robots, aplica o atraso da fila, chama um `Protocol` e emite conteúdo, status HTTP, headers, MIME e metadados.
4. Conteúdo HTML vai para `JSoupParser`; sitemaps podem ser tratados pelo `SiteMapParser`; documentos não HTML podem ser desviados para o `ParserBolt` do módulo Tika.
5. Parse filters podem alterar texto, metadados e outlinks. URL filters aceitam, rejeitam ou normalizam URLs antes de elas voltarem para a fronteira.
6. `Indexer`/storage persiste o documento. `StatusUpdater` recebe resultados de fetch e parse e envia o novo status, links descobertos e metadados de volta à fronteira, fechando o ciclo de controle [3].

O código-base confirma que `StatusEmitterBolt` é a abstração comum a fetchers e parsers: inicializa `URLFilters` e `MetadataTransfer`, resolve links relativos, filtra outlinks e emite `DISCOVERED` no `StatusStream` (`core/src/main/java/org/apache/stormcrawler/bolt/StatusEmitterBolt.java`). O `FetcherBolt` é multithread e baseado em filas; seus threads retiram `FetchItem` de filas, consultam regras de robots, registram tempo de espera e de fetch, emitem conteúdo ou status e contabilizam métricas (`core/src/main/java/org/apache/stormcrawler/bolt/FetcherBolt.java`).

O modelo é adequado a crawls recursivos e a streams contínuos de URLs. Ele não obriga a Waesy a migrar seus harvesters de API: a parte valiosa é a separação entre agenda/estado de URL e processamento de conteúdo, que pode ser aplicada em TypeScript/Postgres antes de introduzir Storm.

## Filas, discovery e escopo

### Filas locais e frontier distribuída

No core, `fetcher.queue.mode` agrupa por `byHost` (padrão), `byDomain` ou `byIP`. `fetcher.threads.number` limita o total de threads; `fetcher.threads.per.queue` controla concorrência por fila; `fetcher.max.queue.size`, `fetcher.max.urls.in.queues` e `fetcher.timeout.queue` limitam memória e idade das entradas [4]. Esse desenho evita que um domínio com muitos links monopolize o processo e torna a unidade de politeness explícita.

Para escala distribuída, o módulo oficial `external/urlfrontier` integra Spout e StatusUpdater com o serviço URLFrontier por gRPC. A frontier armazena/agenda URLs e o StormCrawler continua responsável pelo fetch e parsing. O StatusUpdater envia URLs conhecidas individualmente e URLs descobertas em lotes via `PutDiscovered`, com `urlfrontier.batch.size` padrão 100; em fronteiras antigas há fallback para envio individual [6]. O módulo também documenta TLS, injeção de seeds pelo cliente e a necessidade de não usar plaintext quando a fronteira está em outro host.

`QueueRegulatorBolt` é opcional. Ele pode bloquear a fila de um host após rate-limit e encaminhar `Retry-After`, com backoff crescente, fator, teto e jitter; também pode aplicar `Crawl-delay` do robots ao URLFrontier quando explicitamente configurado. A documentação alerta que a regulação depende de uma única endpoint, não recupera URLs já entregues pelo Spout e não é estritamente atômica quando há múltiplos clientes concorrentes para a mesma fila. Esse é um limite operacional importante, não uma garantia de consistência global [6].

### Discovery

A descoberta ocorre pelo processamento de outlinks, redirecionamentos e, se ativado, sitemaps (`sitemap.discovery`). Antes de entrar na frontier, URLs passam por filtros configuráveis e ordenados. A documentação oficial dá como padrões: limite de tamanho, repetição de path, normalização/canonicalização e filtro por MIME [3]. O `MetadataTransfer` restringe o que é propagado aos outlinks e o que é persistido no status; também permite rastrear profundidade e caminho [4].

O StormCrawler não promete que qualquer JavaScript ou mapa proprietário seja descoberto automaticamente. Para aplicações SPA, o módulo Playwright tem um detector de renderização que observa fingerprints de frameworks, raízes de hidratação vazias, `<noscript>` e combinações de pouco texto/outlinks. O detector apenas marca metadado; a refetch imediata depende de `DelegatorProtocol` e, se desejada, de `JsRenderingRedirectionBolt` [4] [7].

## Politeness, robots e retries

### Politeness por host

A politeness é aplicada em camadas. O Fetcher usa filas por destino e um atraso mínimo entre requisições. O atraso é derivado de `Crawl-delay` quando aplicável, do `fetcher.server.delay` padrão de 1 segundo e de `fetcher.server.min.delay` em filas multithread. O `fetcher.max.crawl.delay` padrão é 30 segundos. Se o site exigir mais que isso, o comportamento padrão é emitir `ERROR`; somente com `fetcher.max.crawl.delay.force=true` o fetcher limita o atraso local e publica o valor para uma eventual `QueueRegulatorBolt` [4] [5].

Robots é consultado e cacheado por host. Há cache separado para regras válidas e erros. O crawler aceita configuração explícita do nome e identidade do User-Agent, agentes adicionais para seleção das regras, respeito a `X-Robots-Tag` e `<meta name="robots">`, e tratamento estrito de `nofollow`. A própria documentação recomenda identificação transparente, contato e URL do crawler. Existem chaves para ignorar robots, mas isso é uma opção operacional perigosa e não deve ser usada por Waesy como atalho [4] [5].

### Retry orientado por status

O estado da URL dirige a política. `DISCOVERED` é novo; `FETCHED` é sucesso; `FETCH_ERROR` representa falha transitória; `ERROR` representa falha terminal; `REDIRECTION` representa redirecionamento. `FETCH_ERROR` incrementa `fetch.error.count` e, por padrão, é escalado para `ERROR` após três ocorrências. A agenda padrão refaz `FETCHED` em 1 dia, `FETCH_ERROR` em 2 horas e não refaz `ERROR`. Em sucesso, os metadados de erro são limpos [5].

Essa política é mais completa do que um contador de tentativas solto: distingue erro transitório de erro terminal, conserva a causa no status e delega a decisão de quando tentar de novo ao scheduler. O módulo URLFrontier complementa o modelo para 429/503: respeita `Retry-After` quando utilizável e, sem esse header, faz backoff por host com fator 2, teto padrão de 24 horas, decadência e jitter [6].

O retry do protocolo HTTP também é configurável. A documentação atual usa OkHttp como implementação padrão e expõe retry de falha de conexão, timeout, cookies, headers, limite de corpo e proxy. Isso não significa que cada código HTTP seja automaticamente repetido: o fluxo de status e as políticas do backend decidem a reapresentação [4] [5].

## Browser e rendering

O módulo Playwright é um `Protocol` para páginas renderizadas com JavaScript. Pode iniciar o navegador, conectar a um Chrome existente por CDP ou conectar a um servidor Playwright remoto por WebSocket. Há espera por `load`, `domcontentloaded` ou `networkidle`, corte de tipos de recurso, avaliações JavaScript e captura do DOM renderizado [7].

A extensão mais útil para Waesy é a cadeia ordenada de `PageAction`: esperar seletor, dispensar overlay/banner de cookies, expandir abas/accordions, rolar até o fim, avaliar JavaScript e tirar screenshot. Falha de uma ação é registrada e engolida pela cadeia; erro de configuração pode fazer a topologia falhar no início [4] [5] [7]. A própria documentação limita screenshots em base64 a diagnóstico e pequeno volume; para volume maior recomenda blob store [7].

O detector seletivo é importante para custo e estabilidade: primeiro faz fetch HTTP barato; somente páginas com sinais de SPA entram na perna Playwright. O módulo documenta que o detector não resolve desafio Cloudflare, DataDome ou Akamai. Uma página de challenge pode exigir um navegador com propriedades de stealth, que não é fornecido pelo StormCrawler. Isso não é uma promessa de bypass anti-bot e não deve ser interpretado como autorização para contornar controle de acesso [7].

## Extração e normalização

O parser HTML é baseado em Jsoup, identifica MIME/charset, extrai texto e outlinks, normaliza tags robots e pode limitar a quantidade de outlinks. Parse filters são extensões isoladas: podem acessar bytes, DOM quando necessário, `ParseResult`, metadados e outlinks. Se nenhum filtro exige DOM, o parser pode pular a geração do DOM, reduzindo custo [3] [5].

Para PDF, Word, Excel, PowerPoint e outros formatos, o módulo Tika fornece `ParserBolt` como complemento ao JSoup. A configuração permite whitelist de MIME, parsing de documentos embutidos, limite de caracteres e timeout em JVM separada via Tika Pipes. Em timeout ou crash do processo auxiliar há status de erro e, quando possível, resultado parcial marcado como truncado. O README exige conectar JSoup, um redirecionador e Tika em streams apropriados; Tika não é automaticamente acionado por qualquer topologia [8].

Há também módulo oficial de extração de texto com LLM compatível com APIs OpenAI/Ollama, mas é opcional e configurado como `textextractor.class`. Não deve ser confundido com extração determinística nem ativado sem política de custo, privacidade e avaliação [4].

## Observabilidade

O StormCrawler usa o sistema de métricas do Apache Storm. O Fetcher registra contadores de eventos, médias de tempo de download e espera em fila, taxa de páginas/erros, bytes e threads ativas; o bucket padrão é de 10 segundos [5]. A Storm UI fornece latência, contagens de emit/execute e erros por Spout/Bolt. Os módulos OpenSearch, Solr e SQL têm `MetricsConsumer`; o OpenSearch ainda fornece `StatusMetricsBolt`, índices de métricas/status e dashboards de top hosts, threads, páginas por segundo, bytes e URLs esperando em fila [10].

Essa telemetria é diferente de apenas gravar uma linha de auditoria ao final. Ela permite distinguir fila congestionada, fetch lento, parser lento, erro por host e throughput. A métrica deve continuar separada do dado de negócio; o Indexer não deve ser o único lugar para observar saúde do crawler.

## Storage, replay e módulos externos

O core aceita componentes de persistência plugáveis. O módulo OpenSearch fornece indexação, Spout de agregação, StatusUpdater e métricas/status, além de dashboards [10]. O módulo SQL fornece SQLSpout, StatusUpdater, Indexer e MetricsConsumer, com script de tabelas baseado em MySQL [11]. Isso demonstra a arquitetura de adapters, mas não equivale a suporte pronto para Supabase/Postgres ou para o schema Waesy.

O módulo WARC escreve registros request/response em arquivos com compressão, rotação e digests. Para registros HTTP completos é necessário armazenar headers e usar o protocolo OkHttp; o WARC bolt é um dead-end e não repassa tuplas para o pipeline seguinte. O mesmo módulo lê WARC como entrada por `WARCSpout`, permitindo replay offline [9]. WARC é útil para auditoria/reprocessamento, mas demanda política de retenção, proteção de dados pessoais e armazenamento separado do banco canônico.

## Comparação com o inventário e o código Waesy

### O que Waesy já possui

O inventário declara 21 arquivos em `src/services/mining`, oito verticais, Supabase Postgres 15+, RLS, `pg_cron`, `pg_net` e pgvector. O código observado já tem bons elementos de controle:

- `crawler-batch-engine.ts` lê `crawl_queue` por prioridade e idade, marca `processing`, incrementa `retry_count` e processa jobs, places, PNCP, imóveis, leilões, RSS, eventos e notícias. O caminho de RSS faz descoberta e `upsert` em `crawl_queue` por URL. O loop é sequencial e o código mostrado não faz claim atômico/lease nem remarca automaticamente um item `failed` para uma data futura (`crawler-batch-engine.ts:52-94`, `252-287`, `500-509`).
- `automated-harvest.ts` implementa feeds RSS, normalização e hash SHA-256 de URL, verificação de idempotência em `mined_raw_extractions`/`news_articles`, extração mecânica, gate, curadoria, publicação e `scraper_audit_log`. Apesar do comentário mencionar feeds e sitemaps, a implementação lida diretamente com a lista de RSS e não mostra descoberta automática de sitemap (`automated-harvest.ts:49-55`, `105-184`).
- `scraper-utils.ts` possui `fetchWithRetry` com até três retries por padrão, backoff exponencial, estados de cooldown por domínio, leitura de `Retry-After`, detecção de 429 e reconhecimento de challenge Cloudflare. O `crawler-circuit-breaker.ts` mantém CLOSED/OPEN/HALF_OPEN por domínio, com limiar três, cooldown de 30 segundos e timeout de 8 segundos.
- `mechanical-extractor.ts` tem quatro camadas: JSON-LD, OpenGraph/meta, seletores por domínio e densidade textual/readability. O fetch nativo usa headers parecidos com navegador e dois retries fixos; depois tenta `r.jina.ai` (`mechanical-extractor.ts:123-198`). O código não mostra consulta de robots, agrupamento por host ou atraso por fila.
- Extratores especializados cobrem `Recipe`, `Event` e `JobPosting` em JSON-LD, além de heurísticas de HTML. Os harvesters PNCP e DataJud consomem APIs oficiais, fazem upsert/deduplicação e registram auditoria. DataJud trata 429 com rotação de chaves, backoff e cooldown (`datajud-harvester.ts:168-263`).
- `integrity-gate.ts` rejeita título genérico, corpo vazio, conteúdo que repete título/lead e padrões de captcha/Cloudflare/403. `semantic-deduplicator.ts` calcula Jaccard em títulos e janela temporal de 48 horas. O conjunto de testes cobre parsing JSON-LD de evento, resolução geográfica, Overpass/Nominatim e funções do batch engine, mas não cobre politeness por host, robots, claims concorrentes ou leases.
- A persistência é de negócio e auditoria: `news_articles`, `mined_articles`, `mined_raw_extractions`, `jobs`, `events`, `directory_listings`, `mined_tenders`, `mined_lawsuits`, `economic_indicators`, `crawl_queue`, `domain_cooldowns` e `scraper_audit_log` aparecem no código. Isso é mais expressivo para o produto Waesy do que um índice de documentos genérico.

### Diferenças críticas

1. **Controle de fila:** StormCrawler possui feedback de status até a frontier, filas por host e scheduler de próxima tentativa. Waesy tem uma tabela de fila e um lote direto, mas a leitura seguida de update não mostra proteção contra dois workers reivindicarem o mesmo item, nem lease para item preso em `processing`.
2. **Politeness:** StormCrawler aplica `robots.txt`, `Crawl-delay`, agrupamento por host/domain/IP e limites de fila. Waesy tem cooldown, rate limiter e circuit breaker, mas eles são principalmente reativos a erro/rate limit. `fetchWithRetry` não substitui robots nem um atraso positivo por host antes do primeiro sucesso.
3. **Retry semântico:** Waesy contabiliza `retry_count`, mas o batch engine marca falha e encerra o item; não há, nesses arquivos, uma política equivalente a `FETCH_ERROR` versus `ERROR` com `next_attempt_at`, limite e reset de metadados de erro. DataJud tem política mais madura porque é um cliente API especializado.
4. **Discovery:** RSS, APIs e Overpass/Nominatim são fortes em suas verticais. Não há no caminho estudado um pipeline genérico de outlinks com URL filters ordenados, sitemap discovery e controle de profundidade/path.
5. **Browser:** Não foi encontrado Playwright direto em `src/services/mining`. O cliente Firecrawl tenta API Firecrawl, fetch nativo e Steel; a resposta Steel é screenshot e o código a envolve em HTML vazio (`firecrawl-client.ts:161-190`). Isso pode marcar a operação como sucesso, mas não entrega DOM/texto/links para extração. Portanto, Steel não deve ser tratado como fallback de conteúdo sem uma etapa explícita de OCR/DOM autorizada.
6. **Extração:** Waesy tem extração de domínio e Schema.org bastante útil, porém determinística e específica. StormCrawler oferece uma cadeia configurável de parse filters, MIME routing, Tika e, opcionalmente, LLM. StormCrawler não conhece entidades Waesy, regras BRL, CNJ, PNCP ou qualidade editorial; essa camada precisa continuar no Waesy.
7. **Observabilidade:** `scraper_audit_log` registra resultado agregado de cada harvester, e logs de console registram erros. Não há nos arquivos analisados métricas contínuas equivalentes a active threads, queue wait, pages/sec, bytes/sec ou erro por bolt/host. O circuito mantém contadores em memória, não uma série temporal de operação.
8. **Replay/storage:** Waesy persiste dados e texto extraído, mas não possui no caminho analisado gravação WARC de request/response ou replay de captura. Isso limita investigação de mudanças de fonte e reprocessamento sem nova chamada.

## Anti-bot dentro de limites legais

A recomendação segura é **reduzir carga e respeitar controles**, não tentar contorná-los. StormCrawler documenta User-Agent transparente, robots, delays, cookies configuráveis e proxies com gerenciadores simples/múltiplos. Proxy é uma capacidade de transporte e distribuição controlada; não é autorização para ignorar robots, paywall, CAPTCHA, WAF ou limites contratuais [4] [7].

Para Waesy, headers rotativos que imitam navegadores devem ser substituídos, quando possível, por um User-Agent estável e identificável, com URL e contato. Ao receber 403/challenge/CAPTCHA, a ação padrão deve ser parar o domínio, registrar motivo, respeitar `Retry-After` e solicitar uma fonte/API autorizada. Browser rendering pode executar JavaScript necessário ao uso normal de uma página, mas não deve ser usado para resolver CAPTCHA, burlar login ou contornar bloqueio de acesso. Proxies devem ser próprios ou contratados com autorização explícita e ser auditados por origem.

## Adaptações recomendadas para os mineradores Waesy

### Prioridade 1: adotar o modelo de controle sem trocar a stack

1. Acrescentar à `crawl_queue` campos `available_at`, `leased_until`, `claimed_by`, `attempt`, `host_key`, `domain_key`, `last_http_status`, `last_error_kind`, `retry_after`, `robots_checked_at` e `next_action`. Criar uma função SQL transacional que selecione, bloqueie e reivindique itens pendentes (`FOR UPDATE SKIP LOCKED`), com lease recuperável quando um worker morrer.
2. Separar `FETCH_ERROR` transitório de `ERROR` terminal. Para timeout, conexão, 429 e 5xx: usar backoff exponencial com jitter e `Retry-After`; para 401/403/robots/challenge: registrar bloqueio e não repetir em loop; para erro de parser: não refazer fetch sem mudança de estratégia.
3. Introduzir uma chave de politeness por host e um limitador persistente por host. O circuito breaker deve continuar como proteção de falha, não como único mecanismo de taxa. Começar com uma requisição por host e atraso configurável; elevar concorrência somente por allowlist.
4. Fazer o claim atômico antes do processamento e publicar métricas de `queue_wait_ms`, `fetch_ms`, `parse_ms`, status HTTP, bytes, retries, items descobertos, items rejeitados e motivo de rejeição.

### Prioridade 2: discovery e rendering seletivos

5. Criar uma interface de discovery que una RSS, sitemap, outlinks HTML, APIs e seeds de vertical. Cada URL passa por filtros ordenados de esquema, host permitido, canonicalização, remoção de tracking, tamanho, path repetido, MIME esperado e profundidade. O RSS atual permanece como adapter, não como o crawler inteiro.
6. Substituir o fallback Steel-screenshot por um adapter Playwright que devolva HTML renderizado, status, headers/metadados e links, ou marcar screenshot como diagnóstico sem `success` de extração. O modo browser deve ser opt-in por domínio/URL ou detector de SPA, com orçamento de tempo e recursos.
7. Reusar a ideia de `PageAction` para sites permitidos: esperar seletor, fechar banner de cookies, expandir tabs e rolar. Registrar cada ação e falha. Não adicionar ações para CAPTCHA, bypass de WAF ou extração de áreas que exigem login sem consentimento.

### Prioridade 3: extração, storage e operação

8. Modelar um envelope de captura comum (`url`, `final_url`, `status`, `headers`, `mime`, `body`, `fetched_at`, `provider`, `robots_decision`, `rendered`) e ligar os extratores Waesy a ele. Isso elimina a diferença atual entre Firecrawl, fetch nativo, Jina e APIs.
9. Manter JSON-LD, heurísticas e regras CNJ/PNCP como extratores de negócio. Para PDFs/editais, adicionar uma etapa Tika ou equivalente isolada, com whitelist MIME, limite de texto, timeout e indicação de truncamento. O resultado bruto deve passar pelo `integrity-gate` antes de curadoria/publicação.
10. Expandir `scraper_audit_log` para séries de métricas ou uma tabela de eventos de crawl. Se OpenSearch/Solr/SQL não for adotado, reproduzir os nomes conceituais das métricas StormCrawler no Postgres e criar agregações por host, vertical e provider. A auditoria de negócio não deve substituir health/throughput.
11. Avaliar WARC somente para fontes críticas, disputas, debugging e reprocessamento. Gravar headers e digests, aplicar retenção e remover/restringir dados pessoais conforme a finalidade. O WARC deve ser storage de captura, não a tabela canônica Waesy.

### Quando considerar uma migração real para StormCrawler

Usar somente as adaptações de controle acima se o volume continuar pequeno/médio e as fontes forem APIs, RSS e páginas independentes. Considerar uma topologia StormCrawler + URLFrontier quando houver crawl recursivo de grande volume, muitos hosts simultâneos, necessidade de baixa latência contínua, backpressure e métricas de topology/bolt. Nesse cenário, criar um adapter de StatusUpdater para o domínio `crawl_queue`/Supabase ou manter Supabase como projeção de negócio; não tentar encaixar diretamente o schema Waesy no SQL de exemplo do módulo, que é baseado em MySQL [11].

A ordem segura é: (a) leases/status/politeness/metrics no Postgres; (b) discovery e Playwright seletivo; (c) WARC e Tika conforme necessidade; (d) URLFrontier/Storm apenas depois de medir que o batch engine não atende. Assim Waesy captura os padrões comprovados do StormCrawler sem perder os extratores oficiais, a curadoria, os gates de integridade e o armazenamento de produto que diferenciam seus mineradores.

## Referências

[1]: https://github.com/DigitalPebble/storm-crawler "URL histórico solicitado; redireciona para o repositório Apache atual"
[2]: https://github.com/apache/stormcrawler "Repositório oficial atual do Apache StormCrawler"
[3]: https://stormcrawler.apache.org/docs/latest/architecture.html "Arquitetura oficial: frontier, fetcher, parsers, filtros e status"
[4]: https://stormcrawler.apache.org/docs/latest/configuration.html "Configuração oficial: User-Agent, robots, proxy, filas, Playwright, Tika, WARC e spouts"
[5]: https://stormcrawler.apache.org/docs/latest/extending.html "Operação e extensão oficial: componentes, politeness, retries, métricas e tuning"
[6]: https://github.com/apache/stormcrawler/tree/main/external/urlfrontier "Módulo oficial URLFrontier: Spout, StatusUpdater e QueueRegulator"
[7]: https://github.com/apache/stormcrawler/tree/main/external/playwright "Módulo oficial Playwright: rendering, detector e PageActions"
[8]: https://github.com/apache/stormcrawler/tree/main/external/tika "Módulo oficial Tika: parsing de documentos não HTML"
[9]: https://github.com/apache/stormcrawler/tree/main/external/warc "Módulo oficial WARC: gravação e leitura de arquivos de captura"
[10]: https://github.com/apache/stormcrawler/tree/main/external/opensearch "Módulo oficial OpenSearch: indexação, status, métricas e dashboards"
[11]: https://github.com/apache/stormcrawler/tree/main/external/sql "Módulo oficial SQL: SQLSpout, StatusUpdater, Indexer e MetricsConsumer"
[12]: https://github.com/apache/stormcrawler/blob/main/core/src/main/java/org/apache/stormcrawler/bolt/FetcherBolt.java "Código oficial do FetcherBolt"
[13]: https://github.com/apache/stormcrawler/blob/main/core/src/main/java/org/apache/stormcrawler/bolt/JSoupParserBolt.java "Código oficial do JSoupParserBolt"
[14]: https://github.com/apache/stormcrawler/blob/main/core/src/main/java/org/apache/stormcrawler/bolt/StatusEmitterBolt.java "Código oficial do StatusEmitterBolt e filtragem de outlinks"
[15]: https://github.com/apache/stormcrawler/blob/main/external/urlfrontier/src/main/java/org/apache/stormcrawler/urlfrontier/QueueRegulatorBolt.java "Código oficial do QueueRegulatorBolt"
[16]: https://github.com/apache/stormcrawler/blob/main/core/src/main/java/org/apache/stormcrawler/protocol/DelegatorProtocol.java "Código oficial do DelegatorProtocol"
[17]: https://github.com/crawler-commons/url-frontier "Serviço URLFrontier integrado pelo módulo oficial"
