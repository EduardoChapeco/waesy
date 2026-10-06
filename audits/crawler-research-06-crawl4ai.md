# Auditoria de crawler — Crawl4AI e adaptações para os mineradores Waesy

**ID:** `crawler-research-06-crawl4ai`  
**Data da análise:** 2026-10-06  
**Projeto analisado:** [unclecode/crawl4ai](https://github.com/unclecode/crawl4ai)  
**Revisão do código local:** `8afd0a68064ff7049303c9f9d037ab6228aac43c`  
**Versão declarada no clone:** `0.9.4`  
**Escopo de comparação:** `/home/ubuntu/waesy-audit/SYSTEM_INVENTORY.md`, `src/services/mining/` e utilitários de crawling em `src/lib/mining/`.

> **Conclusão executiva.** Crawl4AI não é apenas um parser HTML: é um runtime assíncrono de crawling com browser Playwright, cache, dispatcher concorrente, limites por domínio, estratégias de deep crawl, seeding por sitemap/Common Crawl, extração mecânica ou opcionalmente via LLM, e telemetria por tarefa. Waesy já possui ativos que não devem ser substituídos — fila durável no Supabase, roteamento de oito verticais, ingestão de RSS/PNCP/sitemap, circuit breaker por domínio, fallback e um gate editorial/mecânico rigoroso. O melhor desenho é incorporar padrões de execução do Crawl4AI a um worker/sidecar e manter o Supabase como fonte de verdade, não trocar a fila de produção por SQLite local nem copiar indiscriminadamente mecanismos de evasão.

## 1. Método, escopo e limites da evidência

A investigação usou o README e documentação oficial, e o código primário do repositório clonado. A implementação é a fonte de verdade quando há divergência com uma página da documentação. Em particular, a página `advanced/crawl-dispatcher` consultada ainda apresenta conteúdo de dispatcher como “coming soon”, enquanto `async_dispatcher.py` contém um dispatcher implementado; portanto, as conclusões sobre filas, rate limiting e memória foram verificadas diretamente no código da revisão indicada.

A análise não atribui ao Crawl4AI capacidades que não foram encontradas. O detector anti-bot é heurístico e o projeto oferece proxies, user-agent, stealth/magic, retries e uma função de fallback; ele não é evidência de resolução de CAPTCHA, quebra de autenticação, bypass de paywall ou acesso legítimo a conteúdo protegido. Qualquer adaptação Waesy deve operar somente em fontes autorizadas, respeitar robots.txt quando aplicável, termos de uso, limites publicados, direitos autorais, privacidade e controles de acesso.

## 2. Arquitetura do Crawl4AI

O caminho principal é `AsyncWebCrawler`. Ele coordena uma estratégia de execução (normalmente Playwright), configuração por URL (`CrawlerRunConfig`), cache, parser/limpeza de HTML, Markdown, extração estruturada, deep crawl e o resultado normalizado `CrawlResult`. O código inicializa logger, diretório base `~/.crawl4ai`, banco/cache e componentes de robots/deep crawl; o ciclo de vida explícito é `start()`/`close()` ou context manager.

A fronteira de rede/renderização é `AsyncPlaywrightCrawlerStrategy`, que usa `BrowserManager` e adapters Playwright/undetected. A estratégia expõe hooks para criação do browser/contexto, criação de página, alteração de user-agent, execução, `before_goto`, `after_goto`, recuperação e retorno de HTML. A configuração escolhe headless/browser type/CDP/contexto persistente, headers/UA/locale/timezone/geolocalização, proxy e sessão. Para uma URL HTTP, a estratégia navega em browser; para `file://` e `raw://`, há caminho rápido sem browser ou caminho browser quando JS, screenshot, PDF, espera, iframes, captura de rede/console ou outra operação exige renderização.

O contrato `CrawlResult` é mais rico que “HTML ou erro”: contém HTML bruto e limpo, Markdown, conteúdo extraído, mídia, links, tabelas, screenshot/PDF/MHTML, status/headers/redirecionamento, sessão, certificado SSL opcional, requests e mensagens de console, resultado do dispatcher, estado de cache e `crawl_stats` anti-bot. Isso torna o resultado adequado para uma camada de ingestão/qualidade, mas não substitui a validação jornalística.

## 3. Filas, despacho, concorrência e backpressure

`arun_many()` aceita uma lista de URLs e, no caminho normal, cria `MemoryAdaptiveDispatcher` por padrão. O dispatcher usa uma `PriorityQueue`, limite de sessões (`max_session_permit`), monitoramento de memória e estados de tarefa (`QUEUED`, `IN_PROGRESS`, `COMPLETED`, `FAILED`). A execução registra tempo de espera, duração, uso e pico de memória, erro e quantidade de retries. Em pressão crítica de memória, tarefas podem ser reencaminhadas/reencolocadas; há limiares de memória, uma tarefa de monitor e mecanismos de fairness/espera para evitar que uma carga monopolize o executor. `SemaphoreDispatcher` oferece o modelo mais simples, com semáforo fixo e rate limiter opcional.

O componente `AsyncUrlSeeder` usa uma `asyncio.Queue` limitada. O produtor faz discovery, mantém `seen`, bloqueia ao encher a fila e fornece backpressure; workers retiram URLs, aplicam limite de concorrência, validação de URL/head, live check e extração. O tamanho é limitado dinamicamente (mínimo/máximo e proporcional à concorrência), com `max_urls` e parada coordenada. Essa combinação — fila bounded, produtor/consumidor, deduplicação antes do trabalho e cancelamento por limite — é um padrão especialmente útil para grandes domínios.

Há uma nuance importante: quando `deep_crawl_strategy` está configurada, o `arun_many()` contorna o dispatcher e itera pelas URLs iniciais chamando `arun()` diretamente; o comentário no código explica que o dispatcher espera um `CrawlResult` único, enquanto deep crawl pode retornar uma lista. Assim, não se deve afirmar que todo deep crawl está automaticamente submetido à mesma concorrência adaptativa de `arun_many` normal. A documentação de sessões também estabelece que `session_id` é para reuso sequencial de page/context e não para execução paralela.

## 4. Discovery e deep crawling

O seeder oficial combina duas fontes verificadas: sitemap/índices de sitemap e Common Crawl (`source="sitemap+cc"`). Ele mantém cache de índice Common Crawl, cache local de resultados por URL/domínio com TTL, pode fazer HEAD/live check, baixar apenas um trecho de `<head>`, extrair title/meta/link/JSON-LD/lang e depois pontuar relevância com BM25. O caminho de sitemap trata `.gz`/índices aninhados e a descoberta pode ser limitada por padrão/padrão de URL, número máximo, concorrência e `hits_per_sec`.

Para navegação a partir de uma página, as estratégias BFS, DFS e Best-First compartilham filtros/scorers e estado de traversal. A implementação BFS mantém URLs visitadas, normaliza/deduplica links, controla profundidade, páginas máximas, links externos, filtros e score; possui modo streaming, callback de mudança de estado, cancelamento e `resume_state`. Os filtros incluem padrão de URL, domínio, tipo de conteúdo, extensão, status, palavra-chave e cadeia de filtros; o componente BM25/score permite gastar browser e extração apenas em links candidatos. O Best-First ordena a fronteira por score/relevância em vez de uma simples fila FIFO.

Há ainda um modo adaptativo, documentado como busca por ganho/confiabilidade: prioriza URLs cuja combinação de relevância, novidade e autoridade tende a aumentar cobertura, com `max_pages`, `top_k`, `min_gain`, persistência/retomada e exportação de conhecimento. A própria documentação limita o uso adaptativo para arquivamento completo de site ou extração estruturada determinística; ele é uma otimização de descoberta, não uma substituição de um plano completo de coleta.

## 5. Politeness, retries e proteção de origem

O `RateLimiter` é por `netloc`, com atraso base configurável por faixa (`mean_delay`/`max_range`), jitter, atraso máximo, contagem de falhas e retries. Para respostas 429/503 há backoff e aumento do atraso; em sucesso o atraso pode ser reduzido gradualmente. O dispatcher ainda limita sessões globais. Esse desenho separa dois controles que Waesy deve manter separados: concorrência total do worker e ritmo/fairness por domínio.

O suporte a robots existe, mas é opt-in na configuração de execução (`check_robots_txt=False` por default); portanto, não se deve presumir que todo crawl Crawl4AI respeita robots automaticamente. A política operacional de Waesy deve ligar a verificação por padrão para discovery/crawling geral, registrar a decisão e permitir exceção apenas com justificativa de fonte autorizada.

A execução individual suporta `max_retries`, lista de proxies/rotação, sessões sticky e `fallback_fetch_function`. Em cada tentativa, o detector coleta estado e a estrutura `crawl_stats` registra tentativas, retries, proxies usados e se houve fallback; o resultado final conserva erro e status. O detector em `antibot_detector.py` combina sinais de status HTTP, título/corpo, challenge/CAPTCHA e padrões estruturais. Isso permite **parar e classificar** uma barreira, ou tentar uma rota autorizada e documentada, mas não equivale a vencer o desafio.

### Anti-bot dentro de limites legais

O padrão seguro para Waesy é: (1) identificar 403/429/challenge e guardar o motivo; (2) respeitar `Retry-After`, cooldown e política do domínio; (3) reduzir concorrência ou interromper; (4) usar browser apenas quando o conteúdo público exige JavaScript; (5) usar proxy ou fallback apenas quando contratado/autorizado e sem mascarar identidade para violar controle; e (6) enviar o item a revisão ou fonte alternativa. Não usar CAPTCHA solving, credenciais não fornecidas, exploração de falhas, bypass de paywall, rotação de IP para contornar bloqueio deliberado ou captura de dados privados.

## 6. Browser, rendering e interação

Playwright é a principal vantagem operacional do Crawl4AI frente ao fetch nativo. `CrawlerRunConfig` permite `wait_until`, seletor/JS em `wait_for`, timeout, delay antes de retornar HTML, scripts antes/depois da espera, scroll de página inteira, virtual scroll, iframes, shadow DOM, remoção de overlays/consentimento, downloads, screenshot, PDF e MHTML. Há captura opcional de requests/responses/falhas e console, com headers, timing, status e corpo textual de response; o resultado retorna esses eventos, sujeito ao custo/volume de observabilidade.

Hooks permitem adaptar uma página sem reescrever o ciclo de browser. Sessões reusam cookies/estado para paginação sequencial. Há geração/alteração de UA, locale/timezone/geolocation e opções de simulação/override de navegador, mas esses recursos devem ser tratados como compatibilidade para conteúdo público autorizado, não como promessa de invisibilidade.

## 7. Extração, normalização e qualidade

Antes de LLM, o Crawl4AI tem extração determinística: `JsonCssExtractionStrategy` e `JsonXPathExtractionStrategy` recebem schema com campos simples, listas, objetos aninhados e listas aninhadas; há suporte a regex e a uma estratégia de scraping sem LLM. O pipeline também extrai Markdown, mídia, links e tabelas. O `DefaultMarkdownGenerator` pode produzir Markdown bruto, fit/filtered Markdown/HTML, referências e citações, com filtros de pruning ou BM25.

`LLMExtractionStrategy` aceita múltiplos provedores/configurações, schema e formatos de input, chunking/overlap e coleta de uso. É uma etapa opcional e potencialmente cara; o resultado deve ser validado por schema e por regras mecânicas. O padrão que interessa a Waesy não é “usar LLM em tudo”, mas separar coleta/renderização, limpeza determinística, extração schema-first, validação de integridade e enriquecimento editorial.

## 8. Observabilidade

O `CrawlerMonitor` oferece dashboard de terminal e estado consultável. Por tarefa, registra status, URL, tempos, uso/pico de memória, erro, retry count, wait time e duração. Globalmente mantém contagens por estado, fila (total/maior/tempo médio de espera), URLs concluídas, memória, pico, duração média, ETA e taxa/quantidade de requeue. `DispatchResult` é anexado ao `CrawlResult`, de modo que a telemetria viaja com o resultado.

A captura de rede/console é detalhada, mas opcional, porque pode aumentar memória e expor dados sensíveis. Para produção Waesy, requests/responses devem ter redaction de cookies, tokens, POST bodies e PII, retenção limitada e correlação com `crawl_queue.id`/`run_id`.

## 9. Cache e storage

O cache local principal é SQLite assíncrono (`~/.crawl4ai/crawl4ai.db`) com tabela `crawled_data`; conteúdo pesado é gravado em arquivos por hash e a tabela guarda referências, JSON de media/links/metadata/headers/downloads, sucesso, screenshot e metadados de validação. O `AsyncDatabaseManager` usa pool/semaphore de conexões, WAL e `busy_timeout`; operações de banco têm até três tentativas com espera crescente. O smart cache mantém ETag, Last-Modified, fingerprint do HEAD e timestamp, permitindo validar frescor sem reler todo o conteúdo.

Isso é excelente como cache local de worker, mas não é uma fila distribuída nem um ledger editorial. Para Waesy, Supabase/Postgres deve continuar sendo a fonte de verdade para estado, lease, deduplicação, publicação, auditoria e reprocessamento; o padrão content-addressed/ETag pode ser aplicado como camada de cache de HTML/Markdown/browser.

## 10. Comparação com o inventário e o código Waesy

O inventário declara 1.837 arquivos em `src/`, oito verticais e 21 arquivos em `src/services/mining/`. A contagem atual no workspace encontrou **23 arquivos TypeScript** nesse diretório; o inventário está defasado em duas unidades e deve ser atualizado. Essa diferença não invalida o inventário funcional, mas importa para auditoria de cobertura.

| Área | Crawl4AI verificado | Waesy verificado | Leitura e decisão |
|---|---|---|---|
| Orquestração | `AsyncWebCrawler` + dispatcher configurável | `crawler-batch-engine.ts` lê `crawl_queue` no Supabase, default de 5, ordena prioridade/data e processa `for...of` serial | Waesy tem durabilidade e publicação; falta worker concorrente/lease/fairness. Adotar padrões, não trocar Postgres por SQLite. |
| Claim/fila | PriorityQueue em memória, estados e requeue | Atualiza item para `processing`, `retry_count+1`, depois `completed`/`failed` | A fila Waesy não mostra claim atômico/lease nesta camada. Adicionar `claimed_by`, `lease_until`, tentativa e recuperação de leases órfãos. |
| Politeness | RateLimiter por netloc, atraso+jitter/backoff, dispatcher global | `scraper-utils.ts` tem rate window/cooldown; circuit breaker por domínio e `domain_cooldowns` persistido | Waesy já protege origem, mas sem scheduler por domínio integrado à fila; centralizar decisão antes do fetch/browser. |
| Retry | Retry de execução, proxy/fallback, 429/503 com backoff e stats | `fetchWithRetry`: até 3, 408/429/5xx, `Retry-After`, cooldown 429/403; circuit threshold 3 | Waesy é bom em leaf HTTP; precisa taxonomia persistente por item e política distinta para HTTP, browser, parsing e qualidade. |
| Robots | suporte explícito, porém opt-in | Não encontrado como gate padrão no batch/harvest | Ligar robots/política por padrão no crawler geral e registrar `robots_allowed/blocked`. |
| Discovery | Sitemap + Common Crawl + head/JSON-LD/BM25; BFS/DFS/Best-First/adaptive | sitemap XML recursivo até 10k/depth 3, canonicalização, classificação e upsert; RSS fixo; PNCP oficial | Waesy tem fontes próprias e oficiais; adicionar seeder/head scoring/visited state para páginas públicas, sem abandonar PNCP/RSS. |
| Rendering | Playwright/BrowserManager, JS, wait, scroll, iframe, shadow, screenshot/PDF/MHTML | Firecrawl API; `fetch` nativo com UA/retry; Steel fallback devolve screenshot e HTML placeholder | Gap principal. Criar rota browser para páginas JS autorizadas; não tratar screenshot placeholder como artigo extraído. |
| Extração | CSS/XPath schema, Markdown/fit, links/media/tabelas; LLM opcional | mecânica em JSON-LD/OpenGraph/meta/CSS/densidade; extratores especializados e gate de integridade; editorial LLM | Waesy já tem qualidade editorial forte. Adicionar schema-first/CSS-XPath e fit Markdown reduz dependência de heurística. |
| Anti-bot | detector heurístico, proxies, UA/magic, fallback; não resolve CAPTCHA | `isCloudflareOrBotChallenge`, cooldown, Firecrawl/Steel fallback, padrões de pollution | Os dois devem parar/classificar barreiras. Formalizar limites legais e não promover fallback sem corpo real. |
| Observabilidade | monitor por tarefa, memória, fila, retry, wait, requeue, dispatch result; requests/console opcionais | `scraper_audit_log`, `crawl_queue` status/error, logs console, métricas de circuito | Enriquecer o audit log Waesy com timings, provider, status, retry reason, bytes, cache, render mode e bloqueio. |
| Storage | SQLite local + arquivos por hash + ETag/Last-Modified/fingerprint | Supabase para fila/artigos/auditoria; cache PNCP em memória 5 min; cooldown Postgres | Adotar cache content-addressed/validadores como camada, com retenção e PII controladas. |
| Domínios verticais | runtime genérico; não conhece publicação jornalística | 8 tipos, PNCP, BCB/Overpass e promoção editorial | Waesy mantém vantagem de produto e domínio; Crawl4AI é infraestrutura de coleta. |

### Pontos fortes específicos de Waesy

`crawler-batch-engine.ts` já faz roteamento por oito tipos de entidade e mantém vínculo entre fila, artigo minerado e publicação. `automated-harvest.ts` usa RSS, deduplicação por URL/canonicalização/hash e `scraper_audit_log`. `sitemap-crawler.engine.ts` percorre índices recursivos, limita total/profundidade, canonicaliza e faz upsert em lotes de 200. `pncp-extractor.ts` acessa API pública oficial, tem timeout e fallback para cache. `crawler-circuit-breaker.ts` tem estados CLOSED/OPEN/HALF_OPEN, limiar, cooldown, timeout e contadores. O `integrity-gate.ts` barra título genérico, corpo vazio/repetido, bloqueios e artigos curtos antes de promover conteúdo.

### Gaps prioritários observados

O batch principal é serial por item e não evidencia claim atômico/lease nem fairness por domínio. O sitemap crawler faz fetch sequencial de sitemaps e não agrega Common Crawl, preview de head ou score de relevância. A rota Firecrawl/Steel é útil como fallback de fornecedor, mas o retorno Steel contém HTML placeholder e screenshot; não deve ser promovido como conteúdo extraído. O gate de pollution é valioso, porém padrões amplos como `cloudflare`, `captcha` e `robot` podem gerar falso positivo em uma notícia que apenas menciona esses termos; o motivo deve ser tipado por sinal (`http_status`, `challenge_body`, `content_keyword`) e revisável. Não foi encontrado um gate robots padrão no batch/harvest.

## 11. Adaptações recomendadas para Waesy

### Fase A — segurança e contratos, baixo risco

1. **Definir um contrato `CrawlAttempt`/`CrawlResult` equivalente ao Crawl4AI.** Persistir `run_id`, `queue_id`, URL canônica, domínio, provider, modo (`native`, `browser`, `api`), status HTTP, redirects, timeout, bytes, duração, cache hit/validation, retry count, reason/taxonomy de bloqueio, extraction method, word/paragraph count e qualidade. Manter headers/cookies/body de rede fora do log comum e redigir dados sensíveis.
2. **Tornar robots/política uma decisão explícita.** Antes do fetch, registrar `allowed`, `disallowed`, `unknown` e a política aplicada. `unknown` deve ser conservador para discovery ampla; exceções para APIs/fontes contratadas devem ficar em catálogo de fonte.
3. **Atualizar o inventário** de 21 para 23 arquivos (ou explicar se dois são testes/artefatos) e documentar as fontes oficiais e o provider efetivamente usado.

### Fase B — fila distribuída e polidez

4. **Adicionar claim atômico e lease no Supabase.** Uma função SQL deve selecionar itens `pending` elegíveis por prioridade, `next_attempt_at`, domínio e lease expirado, marcando `processing`, `claimed_by`, `claimed_at`, `lease_until` e `attempt`. O worker deve renovar lease e converter crash em reprocessamento seguro.
5. **Introduzir scheduler por domínio inspirado no `RateLimiter`.** Estado mínimo: `next_allowed_at`, atraso base, sucesso/falha consecutivos, `Retry-After`, cooldown, última resposta e concorrência atual. O dispatcher global deve limitar browser/CPU; o scheduler por domínio deve limitar origem; ambos precisam de backpressure e jitter.
6. **Separar filas por custo.** Discovery/HEAD/API barata, fetch nativo, browser/render, extração e editorial LLM não devem competir no mesmo semáforo. Cada estágio publica o próximo trabalho e define timeout/retry próprios.

### Fase C — discovery e rendering

7. **Portar o padrão bounded producer/consumer do seeder.** Enriquecer o `crawl_queue` com `discovery_source`, `discovery_depth`, `parent_url`, `sitemap_lastmod`, `score`, `visited_key` e `discovered_at`. Aplicar dedupe/canonicalização antes do enqueue. Avaliar Common Crawl somente para descoberta histórica de fontes públicas e com política de uso clara.
8. **Adicionar uma rota Playwright dedicada.** Usar browser apenas quando `Content-Type`, sinais de HTML incompleto ou regra da fonte exigirem; `wait_for` por seletor/condição, timeout e captura opcional de screenshot/network/console. Reusar contexto/sessão apenas de modo sequencial. A saída deve ser HTML real ou falha explícita — nunca promover o placeholder Steel como corpo.
9. **Adotar extração schema-first.** Para cada vertical, definir CSS/XPath/JSON-LD schema versionado e fallback mecânico. Só depois rodar LLM editorial. Enviar `fit_markdown`/texto limpo ao gate atual e manter URL/trechos de evidência para atribuição.

### Fase D — adaptive/qualidade e operação

10. **Adicionar BFS/Best-First resumível somente a jobs de descoberta.** `visited`, profundidade, score e `resume_state` devem ser persistidos no Supabase; não usar estratégia adaptativa para tarefas que exigem cobertura completa ou captura determinística de cada URL.
11. **Migrar qualidade do dispatcher para métricas operacionais.** Dashboard/consulta por backlog, oldest pending, wait p50/p95, duração por provider, taxa de browser, 429/403, cooldown ativo, retry, lease recovery, cache hit, conteúdo vazio e promoção/rejeição. Alertar quando um domínio está sendo pressionado ou quando um provider retorna placeholders.
12. **Aplicar cache validável.** Guardar HTML/Markdown pesado por hash em object storage ou volume de worker e metadados no Postgres; usar ETag/Last-Modified/fingerprint/TTL. Definir retenção, remoção e acesso para dados pessoais e conteúdos licenciados.

## 12. Caveats e decisões que não devem ser copiadas cegamente

* O dispatcher em documentação pode estar defasado em relação ao código; fixar versão/commit e testar a integração antes de depender da API.
* Rate limiter por domínio e semáforo global não são robots.txt; ambos são necessários, mas não equivalentes.
* Deep crawl via `arun_many` tem caminho que contorna o dispatcher; validar concorrência real no cenário adotado.
* Browser stealth, UA randômico e proxy não constituem autorização. Eles não devem ser usados para contornar CAPTCHA, autenticação, paywall ou bloqueio deliberado.
* LLM extraction pode falhar, alucinar e custar; usar schema, validação mecânica, provenance e limites de tokens.
* SQLite/cache local do Crawl4AI não substitui Supabase para coordenação multi-worker, publicação ou auditoria.
* O `CrawlResult` conserva muita telemetria; requests/console/screenshot podem conter segredos, PII e grande volume. Redigir e limitar retenção.

## Sources — URLs exatas

1. https://github.com/unclecode/crawl4ai/blob/main/README.md
2. https://github.com/unclecode/crawl4ai/tree/main
3. https://docs.crawl4ai.com/core/quickstart/
4. https://docs.crawl4ai.com/core/browser-crawler-config/
5. https://docs.crawl4ai.com/core/deep-crawling/
6. https://docs.crawl4ai.com/core/url-seeding/
7. https://docs.crawl4ai.com/core/adaptive-crawling/
8. https://docs.crawl4ai.com/advanced/adaptive-strategies/
9. https://docs.crawl4ai.com/advanced/multi-url-crawling/
10. https://docs.crawl4ai.com/advanced/crawl-dispatcher/
11. https://docs.crawl4ai.com/core/cache-modes/
12. https://docs.crawl4ai.com/extraction/no-llm-strategies/
13. https://docs.crawl4ai.com/extraction/llm-strategies/
14. https://docs.crawl4ai.com/advanced/anti-bot-and-fallback/
15. https://docs.crawl4ai.com/advanced/hooks-auth/
16. https://docs.crawl4ai.com/advanced/session-management/
17. https://docs.crawl4ai.com/core/markdown-generation/
18. https://docs.crawl4ai.com/core/local-files/
19. https://docs.crawl4ai.com/privacy/
20. https://github.com/unclecode/crawl4ai/blob/8afd0a68064ff7049303c9f9d037ab6228aac43c/crawl4ai/async_webcrawler.py
21. https://github.com/unclecode/crawl4ai/blob/8afd0a68064ff7049303c9f9d037ab6228aac43c/crawl4ai/async_dispatcher.py
22. https://github.com/unclecode/crawl4ai/blob/8afd0a68064ff7049303c9f9d037ab6228aac43c/crawl4ai/async_url_seeder.py
23. https://github.com/unclecode/crawl4ai/blob/8afd0a68064ff7049303c9f9d037ab6228aac43c/crawl4ai/deep_crawling/bfs_strategy.py
24. https://github.com/unclecode/crawl4ai/blob/8afd0a68064ff7049303c9f9d037ab6228aac43c/crawl4ai/antibot_detector.py
25. https://github.com/unclecode/crawl4ai/blob/8afd0a68064ff7049303c9f9d037ab6228aac43c/crawl4ai/async_database.py
26. https://github.com/unclecode/crawl4ai/blob/8afd0a68064ff7049303c9f9d037ab6228aac43c/crawl4ai/components/crawler_monitor.py
27. https://github.com/unclecode/crawl4ai/blob/8afd0a68064ff7049303c9f9d037ab6228aac43c/crawl4ai/async_configs.py
28. https://github.com/unclecode/crawl4ai/blob/8afd0a68064ff7049303c9f9d037ab6228aac43c/crawl4ai/async_crawler_strategy.py

## Arquivos locais comparados

* `/home/ubuntu/waesy-audit/SYSTEM_INVENTORY.md`
* `/home/ubuntu/waesy-audit/src/services/mining/crawler-batch-engine.ts`
* `/home/ubuntu/waesy-audit/src/services/mining/automated-harvest.ts`
* `/home/ubuntu/waesy-audit/src/services/mining/mechanical-extractor.ts`
* `/home/ubuntu/waesy-audit/src/services/mining/integrity-gate.ts`
* `/home/ubuntu/waesy-audit/src/services/mining/pncp-extractor.ts`
* `/home/ubuntu/waesy-audit/src/lib/mining/sitemap-crawler.engine.ts`
* `/home/ubuntu/waesy-audit/src/lib/mining/scraper-utils.ts`
* `/home/ubuntu/waesy-audit/src/lib/mining/crawler-circuit-breaker.ts`
* `/home/ubuntu/waesy-audit/src/lib/mining/firecrawl-client.ts`

