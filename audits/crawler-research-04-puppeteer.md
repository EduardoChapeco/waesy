# Puppeteer como camada de rendering para os mineradores Waesy

**Conclusão prática:** Puppeteer não é um crawler completo. É uma biblioteca de automação de navegador que expõe CDP e WebDriver BiDi, cria processos/contexts/pages, sincroniza interação com o DOM, observa a rede e permite executar JavaScript no contexto da página. O projeto não fornece uma frontier de URLs, fila de crawling, scheduler por domínio, robots.txt, política de politeness, retry de HTTP, parser de artigos, deduplicação, banco de resultados ou observabilidade centralizada. Esses elementos já pertencem ao Waesy e devem continuar fora do adaptador Puppeteer. [1] [2]

A melhor aplicação para o Waesy é adicionar um **transporte/renderizador de segundo estágio**: manter APIs, RSS, HTML estático e o Firecrawl/native-fetch como caminhos baratos; usar Puppeteer apenas quando a página exige JavaScript, frames, Shadow DOM, interação ou hidratação; devolver HTML/DOM e metadados para os extractors determinísticos existentes; e registrar cada tentativa no mesmo `crawl_queue`, `scraper_audit_log` e tabelas `mined_*`.

## Base analisada e arquitetura efetiva

O checkout primário analisado foi `puppeteer/puppeteer`, branch `main`, commit `2e45a3af43231cd658285e4da5e7f53e40f24edf` (02/10/2026), além da documentação oficial que se apresenta como Puppeteer 25.12.0. O monorepo separa responsabilidades em três pacotes relevantes:

- `puppeteer`: pacote de alto nível, com instalação e integração do navegador.
- `puppeteer-core`: API, abstrações de Browser/BrowserContext/Page/Frame/Locator, implementações CDP e BiDi, network manager, launcher e tracing.
- `@puppeteer/browsers`: download, cache, descoberta de executável e launch de Chrome/Firefox.

Os manifests locais confirmam essa divisão em `packages/puppeteer/package.json`, `packages/puppeteer-core/package.json` e `packages/browsers/package.json`. A página oficial descreve Puppeteer como API para Chrome e Firefox via DevTools Protocol ou WebDriver BiDi; Chrome é o caminho CDP padrão e Firefox usa BiDi por padrão. [1] [2] [16]

O fluxo interno é aproximadamente:

1. `PuppeteerNode.launch()` resolve o browser, argumentos, perfil e transporte.
2. `BrowserLauncher` inicia o processo, controla sinais, profile temporário, pipe/WebSocket e cleanup.
3. Uma `Connection` fala CDP ou BiDi.
4. `Browser` mantém contexts e targets. `BrowserContext` mantém isolamento de cookies/localStorage e cria pages.
5. `Page` representa uma aba/frame principal, expõe navegação, DOM, evaluate, eventos, network, métricas e tracing.
6. A camada CDP usa `TargetManager`, `FrameManager`, `NetworkManager` e sessões de protocolo para materializar targets e requisições.
7. `@puppeteer/browsers` mantém binários por browser/plataforma/build ID em cache, mas não armazena dados de negócio.

Isso é uma arquitetura de runtime de navegador, não uma arquitetura de coleta distribuída. O próprio FAQ diz que orquestração em grande escala, como Selenium Grid, está fora do escopo de Puppeteer. [16]

### Browser, contexts, pages e isolamento

Um browser recém-criado possui pelo menos um context padrão. `browser.createBrowserContext()` cria contexts adicionais; os contexts não compartilham cookies nem cache, e fechar o context fecha suas pages. Popups criados por uma page permanecem no context pai. A implementação CDP envia `Target.createBrowserContext`, mantém um `Map` de contexts e aceita `proxyServer`, `proxyBypassList` e comportamento de download por context. [3] [4]

Essa unidade é útil para Waesy: um context por job ou por política de domínio evita vazamento de sessão entre fontes e permite descartar cookies/localStorage ao final. O browser pode ser reutilizado entre jobs, enquanto contexts/pages têm ciclo curto. O browser também pode ser desconectado e reconectado por WebSocket; `disconnect()` deixa o processo e as pages vivos, ao contrário de `close()`. [4] [15]

O launcher oficial usa timeout de inicialização padrão de 30 segundos, trata SIGINT/SIGTERM/SIGHUP, pode usar pipe ou WebSocket, coleta logs recentes em falha de launch e remove user-data-dir temporário. `userDataDir`, `executablePath`, `channel`, `headless`, `dumpio`, `signal`, `waitForInitialPage` e `protocolTimeout` são opções reais; a compatibilidade é garantida principalmente para o Chrome for Testing baixado pelo Puppeteer, não para qualquer Chrome arbitrário. [5] [18]

## Filas, discovery e politeness

### O que Puppeteer fornece

Puppeteer fornece apenas mecanismos locais que podem ser usados por um crawler:

- eventos `targetcreated`, `targetchanged` e `targetdestroyed` no BrowserContext;
- `waitForTarget(predicate, {timeout})` para esperar popup/target criado por uma page;
- eventos de rede e `page.waitForNetworkIdle()`;
- interceptação individual de requests e uma fila interna de handlers de interceptação.

`HTTPRequest.enqueueInterceptAction()` é uma fila de callbacks assíncronos para **uma requisição interceptada**. Os callbacks não têm ordem garantida, mas são resolvidos antes da finalização daquela interceptação. Isso não é fila de URLs, não persiste trabalho e não distribui jobs. [11]

Não há no projeto, nos pacotes revisados, um scheduler de URLs, frontier, worker pool de crawling, fila persistente, robots.txt, sitemap/RSS discovery ou rate limiter por host. A busca no código encontrou `enqueueInterceptAction` e atrasos de input/debug, mas não uma implementação de crawler com esses conceitos. A ausência é uma limitação de escopo, não uma capacidade oculta.

`waitForNetworkIdle()` só espera a rede da page ficar ociosa por pelo menos o `idleTime` configurado. É uma barreira de sincronização da página, não uma regra de velocidade para o servidor remoto. [10]

### Comparação com Waesy

O Waesy já possui mais infraestrutura de crawler que Puppeteer:

- `crawler-batch-engine.ts` lê `crawl_queue` por prioridade decrescente e idade crescente, limita o lote (padrão 5), roteia entidades e atualiza `pending -> processing -> completed/failed`.
- RSS/Atom é tratado como discovery: até 15 itens por feed são inseridos/upsertados na própria `crawl_queue`, com `onConflict: "url"`.
- `automated-harvest.ts` coleta feeds canônicos, normaliza URL e usa hash SHA-256 para evitar releitura.
- `scraper-utils.ts` possui cooldown por domínio, `Retry-After`, backoff, statuses retryable, detecção de Cloudflare e rate limit em memória.
- `crawler-circuit-breaker.ts` mantém estado por domínio (`CLOSED`, `OPEN`, `HALF_OPEN`), limiar padrão de três falhas, cooldown de 30 s e timeout leaf de 8 s.

Esses mecanismos são complementares a Puppeteer, não substituídos por ele. Para uma page renderizada, o mesmo gate de domínio precisa ser executado antes de `launch/goto`, e a conclusão deve voltar à fila Waesy.

Há gaps reais no código Waesy que Puppeteer não resolve sozinho:

1. A seleção de itens e a marcação `processing` em `crawler-batch-engine.ts` são operações separadas. Sem claim atômico/RPC ou lock, dois workers podem observar o mesmo item antes da atualização.
2. O loop do batch é sequencial. `batchSize` limita quantidade, mas não implementa concorrência controlada.
3. Itens que terminam em `failed` não são re-enfileirados nesse motor; `retry_count` é incrementado, mas não há backoff persistido nem `next_attempt_at` no fluxo revisado.
4. O rate limiter e o circuit breaker principais são em memória; cooldowns de domínio são persistidos em `domain_cooldowns`, mas o contador de chamadas/estado do breaker não é compartilhado entre processos.
5. O comentário de `automated-harvest.ts` menciona RSS e sitemaps, mas a implementação revisada coleta os feeds configurados. Não foi encontrada uma chamada a um parser de sitemap nesse arquivo.

A adaptação recomendada é: claim atômico de fila; lease/visibility timeout; `attempt`, `next_attempt_at`, `last_error_kind` e `blocked_until` persistidos; limite de concorrência por domínio; e uma política que escolha fetch nativo ou browser rendering por item.

## Retries, timeouts e falhas

O projeto Puppeteer não tenta novamente genericamente um `goto()` ou uma resposta HTTP. `Page.goto()` retorna a resposta do recurso principal (a última após redirects); status 404/500 não necessariamente causam exceção e devem ser inspecionados por `HTTPResponse.status()`. [6]

Há retries internos importantes, mas restritos a locators. A classe `Locator` usa RxJS `retry({delay: RETRY_DELAY})` para repetir localização/precondições/ação até o timeout total. Antes de clicar, pode esperar presença, viewport, visibilidade, enabled e bounding box estável em dois frames. A documentação recomenda locators; `waitForSelector` é API de menor nível e não repete automaticamente a ação posterior. [7] [20]

Os timeouts de espera e locator têm padrão de 30 segundos; timeout de navegação pode ser configurado separadamente. O `AbortSignal` pode cancelar waits e ações. Isso é uma boa base para evitar sleeps cegos em páginas dinâmicas, mas não deve ser confundido com retry de transporte: retry de 429, 5xx, DNS, timeout e bloqueio deve permanecer no policy layer Waesy.

No Waesy, `fetchWithRetry()` já implementa categorias retryable `[408, 429, 500, 502, 503, 504]`, backoff multiplicativo, limite máximo, parsing de `Retry-After` e cooldown especial para 429/Cloudflare. O código também retorna `isBlocked`, `rateLimited` e `errorType` em interfaces de resultado. Use essas mesmas categorias para o caminho Puppeteer, mas não repita uma página que retornou conteúdo de desafio ou um bloqueio deliberado.

Uma política segura para o adaptador seria:

- retry de launch/processo apenas em falha transitória de runtime;
- retry de navegação somente para falhas de rede ou statuses explicitamente retryable;
- retry de locator apenas dentro do timeout da ação;
- zero retry automático para CAPTCHA, `403` com desafio, paywall, login obrigatório ou robots/ToS proibitivo;
- cada retry registra tentativa, causa, delay e domínio no audit log.

## Browser/rendering e extração

### Capacidades confirmadas de Puppeteer

Puppeteer renderiza uma page real e permite:

- navegação com `page.goto()` e espera explícita;
- eventos `DOMContentLoaded`, `load`, frames, workers e popups;
- `page.evaluate()`/`evaluateHandle()` para executar lógica no contexto da página;
- seletores CSS, text, XPath, ARIA e Shadow DOM via locators;
- acesso a requests/responses, headers, redirect chain e falhas;
- screenshots, PDF, download behavior, cookies, geolocation e permissões;
- CDP session para recursos específicos do Chrome.

`page.evaluate()` serializa a função para o contexto da página; ela não captura variáveis do escopo Node. Retornos de objetos são serializados como JSON e um DOM node puro pode voltar como `{}`; para referências vivas existem `JSHandle`/`ElementHandle`. Portanto, extractors Waesy devem devolver DTOs JSON simples ou extrair texto/atributos dentro da própria função. [15]

O Puppeteer não fornece Readability, parser de JSON-LD/Schema.org, normalização de salário, validação PNCP, Jaccard, gate de qualidade ou deduplicação. Ele entrega o DOM/rendered HTML e eventos; os extractors Waesy continuam responsáveis pelo significado do conteúdo.

### Comparação com Waesy

Waesy já possui uma camada mecânica mais especializada:

- `mechanical-extractor.ts` tenta JSON-LD, OpenGraph/meta tags, seletores e densidade textual/readability.
- `specialized-extractors.ts` trata Recipe/Event JSON-LD.
- `job-opportunity-extractor.ts` trata JobPosting, salários BRL e check constraints.
- `pncp-extractor.ts` consulta a API oficial e mantém cache de 5 minutos.
- `integrity-gate.ts` rejeita títulos genéricos, desafios, corpos vazios, repetição do título e textos com poucos parágrafos.
- `semantic-deduplicator.ts` faz Jaccard em títulos numa janela de 48 horas.

O ganho do Puppeteer é preencher o caso em que esses extractors hoje recebem HTML incompleto porque o conteúdo só aparece após JavaScript, interação, scroll, frame ou chamada XHR. O browser deve ser um **pré-processador de conteúdo renderizado**, não um substituto dos parsers.

Há dois riscos concretos no caminho atual que devem ser corrigidos antes de acoplar browser rendering:

- `firecrawl-client.ts` tem fallback Steel que retorna screenshot URL e um HTML sintético contendo apenas comentário `Steel screenshot captured`. Isso pode marcar a captura como `success`/HTML, mas não fornece corpo extraível para o integrity gate. Deve ser estado explícito `screenshot_only`/`extraction_unavailable`, nunca HTML falso.
- `event-harvester.ts` usa data sete dias no futuro e venue `${cidade} - Centro` quando não encontra JSON-LD. Isso é dado inferido/sintético, apesar da invariante declarada de zero mocks. Com browser rendering, a ausência de dados deve continuar sendo ausência, ou o registro deve ter `inference_flags` e não ser publicado como fato.

## Interceptação e uso responsável de recursos

`page.setRequestInterception(true)` habilita abort/continue/respond, mas toda request interceptada fica parada até uma dessas resoluções ou até ser servida do cache. A documentação exige verificar `isInterceptResolutionHandled()` imediatamente antes da resolução; se handlers aguardarem operações assíncronas, a verificação deve ser repetida de forma síncrona. A versão atual também possui Cooperative Intercept Mode com prioridades, mas um handler legado sem prioridade pode reverter para resolução imediata. [9]

A implementação CDP aplica `Fetch.enable` a todas as URLs e desabilita o cache de protocolo quando a interceptação está ativa. Isso torna fácil bloquear imagens, fontes, mídia e analytics, mas pode alterar o comportamento da página e deixar requests paradas se o handler falhar. [9] [19]

Para Waesy:

- bloquear imagens/fontes só quando o extractor não depende delas; preservar `og:image` e JSON-LD quando necessários;
- limitar o bloqueio a tipos/hosts conhecidos e registrar o conjunto de recursos abortados;
- preferir `page.setCacheEnabled(false/true)` deliberado ao assumir que interceptação é neutra;
- não usar interceptação para burlar login, CAPTCHA, paywall ou controles de acesso;
- definir um handler único, síncrono na decisão inicial, com `isInterceptResolutionHandled()`.

## Observabilidade

Puppeteer fornece eventos suficientes para instrumentar cada job: `request`, `response`, `requestfailed`, `requestfinished`, `requestservedfromcache`, `console`, `pageerror`, `error` (crash), `frameattached/detached/navigated`, `popup`, `workercreated/destroyed` e `close`. A documentação diferencia falha de rede de resposta HTTP: 404/503 continuam sendo respostas HTTP e não necessariamente geram `requestfailed`. [12]

`page.metrics()` retorna timestamp monotônico, documents, frames, listeners, DOM nodes, layouts, recálculo de estilo, duração de scripts/tasks e heap JS. `page.tracing.start/stop()` pode criar trace JSON em arquivo ou retornar `Uint8Array`; há apenas um trace ativo por browser. O debugging oficial também oferece `NODE_DEBUG=puppeteer:*`, `browser.debugInfo.pendingProtocolErrors`, `dumpio` e captura de console da página. [13] [14] [17]

O Waesy já grava `scraper_audit_log` com scraper, ação, status, records, duração, erros e metadados, além de contadores em `AutomatedHarvestReport`. A integração deve anexar, por job:

- `transport: native-fetch | firecrawl | puppeteer-cdp | puppeteer-bidi`;
- browser/version, context/page IDs e URL final;
- status HTTP, redirect count, `requestfailed` errorText e motivo de bloqueio;
- tempos de launch/context/goto/wait/extraction/persist;
- bytes/requests e `page.metrics()` no final;
- screenshot/trace apenas em amostragem ou falha, com retenção e controle de PII.

Não há exportador Prometheus, OpenTelemetry ou painel de observabilidade embutido no Puppeteer; essa agregação continua sendo do Waesy.

## Storage e ciclo de vida

O storage próprio do Puppeteer é de execução: cookies/localStorage por BrowserContext, perfil `userDataDir`, arquivos de download/screenshot/trace e cache de binários. A configuração oficial recomenda arquivos de configuração e permite mudar o `cacheDirectory`; por padrão recente, binários ficam em `~/.cache/puppeteer`. O cache de `@puppeteer/browsers` organiza instalações por browser, plataforma e build ID e não é banco de resultados. [8] [18] [19]

O storage de negócio do Waesy é superior e deve permanecer como fonte de verdade: Supabase Postgres, `crawl_queue`, `mined_raw_extractions`, `mined_articles`, `news_articles`, `directory_listings`, `events`, `jobs`, `scraper_audit_log`, `domain_cooldowns` e demais tabelas específicas. BrowserContext não deve ser usado como mecanismo de fila ou persistência de artigo.

Recomendação operacional: um browser residente por worker, contexts temporários por job/política, pages sempre fechadas em `finally`, contexts fechados no final do job e browser fechado no shutdown. Use perfil persistente somente quando a fonte autorizar e quando a sessão for explicitamente necessária; caso contrário, contexts isolados reduzem vazamento de cookies e memória.

## Anti-bot dentro de limites legais

A documentação e o código oficial não oferecem uma camada de stealth, rotação de proxy, resolução de CAPTCHA, fingerprint spoofing ou bypass de Cloudflare. `setUserAgent`, headers, proxy e request interception são mecanismos de automação/rede, não autorização para contornar controles do site. O FAQ observa que sites podem distinguir eventos confiáveis e não confiáveis; isso descreve o comportamento de automação, não uma promessa de evasão. [9] [16]

A política de segurança oficial diz que o chamador é responsável por usar com segurança e conforme a finalidade as capacidades de instalação, automação, gravação em disco e extensões. [17] Para o Waesy, a postura deve ser conservadora:

- identificar o bot com User-Agent e contato quando a fonte permitir;
- respeitar robots.txt, termos de uso, direitos autorais, limites de API e políticas do domínio;
- aplicar limite por domínio, backoff e cooldown mesmo quando o navegador conseguir fazer mais;
- parar e marcar `blocked` ao detectar CAPTCHA, challenge, `403`/`503` de proteção, login ou paywall;
- não automatizar resolução de CAPTCHA, roubo/reuso de sessão, bypass de autenticação ou evasão deliberada de bloqueios;
- conservar apenas dados permitidos, com minimização, retenção e controle de acesso.

Isso aproveita a detecção de desafio já existente no Waesy sem transformar Puppeteer em ferramenta de evasão.

## Adaptações prioritárias para Waesy

1. **Criar `puppeteer-renderer.ts` como transporte, não como crawler.** Recebe um item já claimado da `crawl_queue`, aplica a policy de domínio, abre/reusa browser, cria context isolado, navega e devolve `{html, finalUrl, status, title, links, screenshot?, metrics}`.
2. **Reusar a fila atual com claim atômico.** Adicionar lease, `next_attempt_at`, `attempt_count`, `blocked_until` e erro categorizado. Não criar uma fila paralela em memória.
3. **Adicionar seleção de transporte.** API/JSON/RSS/HTML estático usam fetch nativo; páginas com sinais de hidratação, corpo vazio após fetch ou interação necessária usam Puppeteer; Firecrawl continua fallback externo quando configurado.
4. **Implementar espera por sinais, não sleeps fixos.** Usar `goto()` com timeout e verificação de status, `waitForNetworkIdle()` com limite, locators/`waitForFunction` para um selector ou condição de conteúdo e `AbortSignal` para cancelamento.
5. **Separar retry de ação e retry de transporte.** Locator pode repetir precondições; Waesy decide backoff/status/blocked. Nunca converter `TimeoutError` em publicação sem validar conteúdo.
6. **Integrar extração existente.** Alimentar JSON-LD/OG/CSS/readability e extractors de jobs/eventos/PNCP com DOM renderizado. Corrigir `screenshot_only` e os defaults sintéticos de evento antes de liberar publicação.
7. **Aplicar interceptação mínima.** Abortar apenas recursos dispensáveis, com guarda de resolução e telemetria; manter cache e imagens quando necessários à qualidade.
8. **Adicionar telemetria de browser.** Escutar PageEvents, medir `page.metrics`, salvar trace/screenshot em falhas amostradas e gravar identificadores no `scraper_audit_log`.
9. **Gerenciar memória explicitamente.** Fechar pages/contexts em `finally`, reciclar browser depois de N jobs ou sinais de crescimento de heap, e usar `page.metrics()`/crash events para decidir reciclagem.
10. **Manter a barreira legal.** Policy de domínio deve ser capaz de responder `allowed`, `rate_limited`, `blocked_challenge`, `robots_disallowed`, `auth_required` e `unsupported`; somente `allowed` segue para browser.

## Limites e decisões que não devem ser atribuídos a Puppeteer

Puppeteer não confirma que uma URL é permitida para coleta, não calcula prioridade de negócio, não deduplica no Postgres, não valida campos canônicos, não sabe se um artigo é factual, não faz curadoria editorial e não garante que uma página não contém PII. Também não garante que uma resposta dinâmica terminou apenas porque ocorreu `load` ou `networkidle`; cada fonte precisa de condição de completude e o `integrity-gate` precisa continuar sendo a barreira final.

A conclusão é deliberadamente assimétrica: **Puppeteer é uma excelente camada de rendering, sincronização e diagnóstico; Waesy já é a camada de discovery, politeness, retries, extração semântica, deduplicação, auditoria e storage.** A integração de maior valor preserva essa separação e usa o browser somente nos casos em que o transporte HTTP atual não consegue observar o conteúdo real.

## Referências

[1]: https://github.com/puppeteer/puppeteer "Puppeteer — repositório oficial"
[2]: https://github.com/puppeteer/puppeteer/blob/main/README.md "Puppeteer README oficial"
[3]: https://pptr.dev/api/puppeteer.browsercontext "BrowserContext class — documentação oficial"
[4]: https://pptr.dev/api/puppeteer.browser "Browser class — documentação oficial"
[5]: https://pptr.dev/api/puppeteer.puppeteernode.launch "PuppeteerNode.launch — documentação oficial"
[6]: https://pptr.dev/api/puppeteer.page.goto "Page.goto — documentação oficial"
[7]: https://pptr.dev/guides/page-interactions "Page interactions e Locators — documentação oficial"
[8]: https://pptr.dev/guides/configuration "Configuration — documentação oficial"
[9]: https://pptr.dev/guides/network-interception "Request Interception — documentação oficial"
[10]: https://pptr.dev/api/puppeteer.page.waitfornetworkidle "Page.waitForNetworkIdle — documentação oficial"
[11]: https://pptr.dev/api/puppeteer.httprequest.enqueueinterceptaction "HTTPRequest.enqueueInterceptAction — documentação oficial"
[12]: https://pptr.dev/api/puppeteer.pageevent "PageEvent — documentação oficial"
[13]: https://pptr.dev/api/puppeteer.page.metrics "Page.metrics — documentação oficial"
[14]: https://pptr.dev/guides/debugging "Debugging — documentação oficial"
[15]: https://pptr.dev/guides/javascript-execution "JavaScript execution — documentação oficial"
[16]: https://pptr.dev/faq "FAQ — documentação oficial"
[17]: https://github.com/puppeteer/puppeteer/blob/main/SECURITY.md "Puppeteer SECURITY.md oficial"
[18]: https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/node/BrowserLauncher.ts "BrowserLauncher.ts — código primário"
[19]: https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/cdp/NetworkManager.ts "NetworkManager.ts — código primário"
[20]: https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/api/locators/locators.ts "locators.ts — código primário"
[21]: https://github.com/puppeteer/puppeteer/blob/main/packages/puppeteer-core/src/cdp/Tracing.ts "Tracing.ts — código primário"
[22]: https://github.com/puppeteer/puppeteer/blob/main/packages/browsers/src/Cache.ts "Cache.ts — código primário"
