# Playwright como componente de renderização para os mineradores Waesy

A conclusão operacional é direta: **Playwright é uma excelente camada de navegador/renderização, isolamento, interceptação e diagnóstico, mas não é um crawler de produção**. O repositório `microsoft/playwright` não fornece uma frontier de URLs, parser de `robots.txt`, fila durável de páginas, política de `crawl-delay`, armazenamento de resultados ou extrator de artigos. Ele fornece dois blocos diferentes: a biblioteca de automação (`playwright`/`playwright-core`) e o Playwright Test, um runner de testes com workers, retries, fixtures, reporters e traces. Essa distinção é essencial para não substituir o que o Waesy já tem por um componente que não resolve o mesmo problema. [1] [2]

## O que existe no projeto oficial

### Arquitetura e fronteiras

O README oficial descreve uma API única para Chromium, Firefox e WebKit, utilizável em testes, scripts e ferramentas de agentes. A árvore do repositório separa `packages/playwright-core` (cliente, protocolo, servidor e adaptadores por navegador) de `packages/playwright` (Playwright Test, fixtures, runner e reporters). O código de servidor cria um `Browser`, depois `BrowserContext` e `Page`; os adaptadores específicos conversam com os protocolos dos três browsers. A documentação de Library exige explicitamente lançar o browser, criar um context, criar uma page e fechar context/browser; o Test Runner gerencia essas etapas por fixtures. [1] [2]

`BrowserContext` é a unidade mais útil para um minerador. A documentação o define como um perfil isolado, rápido e barato de criar, com cookies, local storage e session storage independentes. O código-fonte mantém interceptadores de rota, `fetchRequest` e `tracing` no próprio context. Isso permite processar uma URL em um context novo, descartar credenciais/estado ao fim da tentativa e evitar que uma página contaminada afete a próxima. [3] [12]

O isolamento do Playwright Test é mais forte que um simples `Promise.all`: os testes são distribuídos por processos worker; cada worker possui seu browser, e cada teste possui um context limpo. Depois de uma falha, o worker inteiro é descartado e outro é iniciado para preservar um ambiente limpo. O scheduler também suporta fases de projetos, dependências, `maxFailures`, número máximo de workers, paralelismo e sharding. [5] [6] [10] [11]

Esse scheduler é uma fila interna de **grupos de testes**, não uma fila de URLs. O código de `tasks.ts` cria fases e grupos; `dispatcher.ts` distribui os grupos a workers, acompanha eventos de início/fim, erros, steps, attachments e falhas. Não há no código uma entidade equivalente a `crawl_queue`, nem claim de URL, lease, prioridade de domínio ou recuperação de item abandonado. Usar o Playwright Test como se ele fosse o scheduler durável do crawler seria uma adaptação inadequada. O padrão que vale reutilizar é a separação entre unidade de trabalho, worker isolado e descarte/recriação do worker após falha. [10] [11]

### Discovery e frontier

O projeto oficial não implementa descoberta web de crawler. Não há parser nativo de `robots.txt`, sitemap, RSS/Atom, canonicalização de URL, deduplicação de frontier, recrawl schedule, profundidade, escopo por host ou política de revisita. A API de Network monitora e modifica requests da página, e o código cliente pode extrair links do DOM ou observar responses, mas isso é um mecanismo de automação; a decisão de quais URLs enfileirar pertence à aplicação. [1] [4] [12]

Consequentemente, a arquitetura recomendada para o Waesy é manter RSS, sitemaps, classificação e `crawl_queue` fora do Playwright. Usar o browser somente quando a descoberta ou a extração exigirem JavaScript, interação, scroll, paginação ou dados carregados por XHR/fetch. Os links descobertos no browser devem voltar para a mesma normalização, allowlist, deduplicação e persistência de origem já usadas pelo crawler.

### Politeness, rate limiting e isolamento de rede

Não existe no Playwright uma política automática de politeness. O browser aceita proxy global ou por context, cabeçalhos extras, autenticação HTTP e interceptação de requests, mas não decide quantas requisições o site deve receber. A API `browserContext.route()`/`page.route()` permite abortar imagens, continuar com cabeçalhos modificados, cumprir uma resposta sintética ou buscar a resposta original e alterá-la. A própria documentação observa que Service Workers podem esconder eventos de rota; quando a interceptação precisa ser observável, pode ser necessário bloquear Service Workers. [4]

Isso é útil para reduzir custo e ruído, por exemplo abortar fontes, anúncios ou imagens não necessárias em um domínio autorizado. Não deve ser confundido com polidez: reduzir bytes não substitui limite de concorrência, intervalo por host, respeito a `Retry-After`, `robots.txt`, termos de uso ou mecanismos de opt-out. O Playwright não oferece um `crawl-delay` ou um token bucket por domínio.

### Retries e backoff

Há três semânticas diferentes no projeto e elas não devem ser misturadas:

1. **Retries do Playwright Test.** O runner repete o teste inteiro. Em caso de falha, recria o worker/browser; o teste pode ser classificado como `passed`, `flaky` ou `failed`. Isso protege isolamento e reprodutibilidade, mas não é uma política de HTTP. [5]
2. **Auto-wait e polling.** Ações e assertions esperam condições de actionability. Para `locator.click()`, por exemplo, o Playwright aguarda resolução única do locator, visibilidade, estabilidade, recebimento de eventos e habilitação. Isso é espera de UI, não retry de fetch de página. [7]
3. **Retry de `route.fetch()`.** A API documentada possui `maxRetries`, mas informa explicitamente que, no momento, apenas `ECONNRESET` é repetido e que códigos HTTP não são repetidos. O default é zero. O código interno de `fetch.ts` usa backoff de 250 ms dobrado, mas só para reset de conexão. Um 429, 403 ou 503 precisa de política da aplicação. [8] [13]

Em um minerador, a classificação deve ser externa ao Playwright: erros transitórios de rede e 5xx podem ter backoff com jitter; 429 deve respeitar `Retry-After` e abrir cooldown por host; 403, CAPTCHA, paywall e bloqueio devem interromper ou mudar para uma fonte/API autorizada, não ser repetidos agressivamente. Em retries de renderização, criar um context novo e, se necessário, reciclar o browser worker é mais seguro do que reutilizar cookies e DOM possivelmente corrompidos.

### Browser e rendering

O Playwright cobre o caso ausente no fetch estático: abre Chromium/Firefox/WebKit, executa JavaScript e permite aguardar elementos, URL, responses e estados do DOM. `page.goto()` espera o evento `load` por padrão, mas a documentação alerta que páginas modernas continuam buscando dados e executando scripts depois de `load`; não existe uma definição universal de “página carregada”. A interação baseada em locators aguarda o elemento se tornar acionável, e a aplicação deve escolher um critério de prontidão específico, com timeout limitado. [1] [2] [7] [9]

Para mineração, o dado útil costuma ser `page.content()` depois de um estado verificável, o texto/atributos de locators, respostas JSON observadas e a cadeia de redirects/status. A opção `waitForTimeout` isolada é um fallback frágil; um seletor, uma resposta de API ou uma condição de conteúdo é mais auditável. A documentação de navegação também alerta para hidratação incompleta: um elemento pode aparecer antes de os listeners da aplicação estarem prontos. [9]

O projeto oficial não faz extração editorial. Não há parser nativo de `NewsArticle`, `Product`, JSON-LD, Readability, qualidade de corpo ou deduplicação semântica. O browser deve entregar HTML/DOM/JSON/responses ao extrator Waesy, que continua responsável por schema.org, OpenGraph, seletores por domínio, densidade, qualidade, clusterização e curadoria.

### Extração e interceptação

A camada Network observa requests/responses HTTP/HTTPS, incluindo XHR e `fetch`, e permite capturar ou alterar requests. Ela pode revelar o endpoint JSON usado por uma página dinâmica, reduzir a dependência do texto visual e registrar status, headers, body e timing. Também suporta WebSockets. Isso é especialmente útil para portais de empregos, agendas e diretórios que renderizam uma lista vazia no HTML inicial e só populam o conteúdo após uma chamada XHR. [4]

A recomendação é usar a resposta de API somente quando a origem e a autorização estiverem claras e manter o HTML renderizado como evidência. Nunca declarar sucesso apenas porque o browser carregou uma tela; aplicar o Integrity Gate depois da renderização, verificando título, corpo, parágrafos, conteúdo de desafio e consistência da fonte.

### Observabilidade

O Trace Viewer é o ponto forte para depuração de uma tentativa de browser. Um trace pode incluir ações, log de espera, snapshots completos de DOM antes/durante/depois, screenshots/screencast, erros, console, requests/responses de rede, metadados de browser/viewport/duração e attachments. Ele pode ser aberto localmente ou em `trace.playwright.dev`; a documentação informa que o viewer no browser processa o trace localmente e não o transmite para fora. O próprio projeto grava traces em arquivos de artefato e tem `Tracing`, snapshotter e HAR tracer no código do servidor. [10] [14] [15]

O Playwright Test também fornece reporters `list`, `dot`, `json`, `html`, `blob` e API de reporter customizado. HTML e JSON são úteis para resultados de execução, mas não são armazenamento de resultados minerados. Para um crawler, o padrão aplicável é emitir um registro de tentativa com status, duração, provider, browser, URL final, erro, tentativa, host e URIs de artefatos; ativar trace/HAR/screenshot de forma amostrada, em primeiro retry ou em bloqueio/falha de integridade, para não explodir custo e retenção. [11]

### Storage

`BrowserContext` mantém estado de sessão durante a navegação e pode salvar/restaurar storage state; o isolamento evita vazamento entre tentativas. Traces, vídeos, screenshots, HARs e attachments são artefatos de execução. Nada disso é uma tabela de conteúdo. O Playwright não sabe persistir um artigo, uma licitação ou uma deduplicação de história; a camada Waesy/Supabase deve continuar sendo o system of record. [2] [3] [10]

### Anti-bot dentro de limites legais

O repositório oficial oferece automação legítima de browsers, proxy configurável, autenticação, headers e interceptação. Ele não oferece uma capacidade oficial de “bypass” de CAPTCHA, Cloudflare, paywall ou controles de acesso. Não se deve adicionar solver de CAPTCHA, fingerprint spoofing, rotação de proxies para contornar bloqueios, falsificação de identidade do crawler ou acesso a áreas privadas sem autorização.

Para uso legal e sustentável, o renderer deve identificar o Waesy com User-Agent e contato, limitar-se a hosts autorizados, consultar e respeitar `robots.txt`/termos quando aplicável, cumprir `Retry-After`, parar em 403/CAPTCHA/paywall, preferir APIs públicas e registrar a razão de recusa. A rota de interceptação deve reduzir recursos apenas quando isso não quebrar o conteúdo necessário. O Playwright pode tornar um navegador mais capaz; não transforma uma requisição não autorizada em autorizada.

## Comparação com o inventário e o código Waesy

O inventário canônico informa 1.837 arquivos em `src`, 537 tabelas, oito verticais e 21 arquivos em `src/services/mining/`, com Supabase Postgres, RLS, pg_cron, pg_net e pgvector. O subtree de mining inspecionado não importa Playwright diretamente. Ele usa parsers mecânicos, Jaccard, PNCP/Overpass/BCB e um cliente Firecrawl com fallbacks nativos e Steel. [Waesy: `SYSTEM_INVENTORY.md`]

### O que o Waesy já faz bem e deve ser preservado

- **Discovery durável:** `sitemap-crawler.engine.ts` percorre índices recursivos, limita profundidade/quantidade, canonicaliza URLs e faz upsert em `crawl_queue` com metadados de sitemap. `rss-ingester.engine.ts` encontra feeds por `<link rel=alternate>` e padrões comuns e extrai RSS/Atom. Isso é uma frontier real; Playwright não substitui essa parte.
- **Fila e roteamento por entidade:** `crawler-batch-engine.ts` ordena `crawl_queue` por prioridade e idade, roteia jobs para notícias, vagas, places, PNCP, imóveis, leilões, RSS e eventos e grava estados `processing`, `completed` e `failed`.
- **Resiliência HTTP:** `scraper-utils.ts` implementa retry configurável com status 408/429/500/502/503/504, backoff exponencial, timeout, `Retry-After`, cooldown de domínio e persistência de `domain_cooldowns`. `crawler-circuit-breaker.ts` tem estados CLOSED/OPEN/HALF_OPEN, limiar de três falhas, cooldown de 30 s e timeout leaf de 8 s.
- **Camada mecânica:** `mechanical-extractor.ts` usa JSON-LD, OpenGraph/meta tags, seletores específicos e densidade textual. O `integrity-gate.ts` rejeita título genérico, corpo curto, repetição, páginas de CAPTCHA/Cloudflare e artigos com poucos parágrafos antes de gastar tokens.
- **Idempotência e qualidade:** `automated-harvest.ts` normaliza URL, calcula SHA-256, consulta `mined_raw_extractions`/`news_articles`, registra extração bruta e estima tokens economizados. `semantic-deduplicator.ts` usa janela de 48 horas e Jaccard com limiares de clusterização/duplicata.
- **Persistência e auditoria:** os harvesters usam upsert/idempotência em Supabase, guardam extração bruta e registram `scraper_audit_log`. O pipeline separa raw extraction, curadoria e publicação canônica.

### Gaps que Playwright ajuda a fechar

1. **Rendering dinâmico no caminho principal.** O `firecrawl-client.ts` tenta Firecrawl, depois fetch nativo, e só então Steel. O fallback Steel devolve uma URL de screenshot e um HTML sintético com o comentário `Steel screenshot captured`; esse HTML não contém o DOM da página e, portanto, não alimenta de fato os extratores mecânicos. Um adapter direto com Playwright deve preencher esse vazio para páginas em que o HTML inicial tem corpo insuficiente.
2. **Claim concorrente de fila.** O `crawler-batch-engine.ts` primeiro seleciona itens `pending` e depois, em loop sequencial, atualiza cada item para `processing`. Dois workers podem selecionar o mesmo item antes do update. O `retry_count` é incrementado, mas não há lease/heartbeat/recuperação de `processing` abandonado no arquivo inspecionado. A arquitetura de workers do Playwright inspira isolamento e reciclagem, mas a correção deve ser uma operação atômica no Postgres (`FOR UPDATE SKIP LOCKED`, lease e owner), não o Test Runner.
3. **Fairness por host.** O cooldown e o rate limit de `scraper-utils.ts` usam mapas em memória; o cooldown é persistido, mas o token bucket/contador não é distribuído entre processos. O batch engine também processa o lote em série e não declara uma política de concorrência por domínio. Adicionar Playwright sem um scheduler por host pode aumentar a pressão no site.
4. **Retry de browser sem política de tentativa.** `react-mining-adapter.ts` limita o loop a três iterações, mas repete `scrapeUrl` e aceita qualquer resultado com `html` ou `markdown`. Não existe uma matriz explícita de retry por status, tipo de falha, host, browser ou conteúdo. O renderer precisa classificar network/5xx, 429, bloqueio, timeout, DOM insuficiente e erro de extração separadamente.
5. **Observabilidade de renderização.** `scraper_audit_log` registra resumo e duração, mas não há no fluxo de mining evidência equivalente a DOM snapshot, console, request/response, screenshot ou trace vinculada à tentativa. Isso torna difícil diagnosticar “HTML vazio”, hidratação, endpoint quebrado ou bloqueio intermitente.
6. **Evidência HTTP incompleta.** Os registros têm URL, domínio, método de extração e texto, mas o modelo de tentativa deveria guardar status final, URL após redirects, headers não sensíveis, content type, tamanho, timings, browser/version, renderer strategy, content hash e artefact URI. Isso permite distinguir erro de fonte, bloqueio e regressão do extrator.
7. **Anti-bot agressivo demais.** `scraper-utils.ts` rotaciona User-Agent, incluindo strings de browsers e `WaesyBot`; `mechanical-extractor.ts` envia `Sec-CH-UA` fixos e chama Jina Reader depois de falhas; `firecrawl-client.ts` tenta Steel após detectar bloqueio. A detecção de bloqueio e o cooldown são bons, mas a rotação/fallback não deve virar evasão. A política precisa ser explicitamente de identificação, consentimento/allowlist e parada em desafio, não de “furar” proteção.
8. **HTML parsing fora de DOM real.** Regex de `<p>`, `<meta>` e `<script>` é eficiente para estático, mas é vulnerável a HTML irregular, conteúdo inserido por JS, shadow DOM e variações de atributos. Playwright deve ser uma camada condicional; não substituir JSON-LD e parsers mecânicos, que são mais baratos e determinísticos quando funcionam.

## Adaptações recomendadas, em ordem

### 1. Criar um renderer condicional, não um crawler paralelo

Adicionar um provider Waesy, por exemplo `src/lib/mining/playwright-renderer.ts`, com contrato explícito `render(url, policy) -> RenderResult`. O provider deve manter um browser por processo/worker, criar um `BrowserContext` novo por tentativa, abrir uma page, configurar listeners de request/response/console/pageerror, navegar com timeout e fechar context sempre em `finally`. O resultado deve incluir `html`, `finalUrl`, status principal, redirects, links, JSON/responses observados, timings, provider e flags de bloqueio.

A decisão deve ser: native fetch/mechanical first; Playwright quando o domínio estiver configurado como dinâmico, o corpo estático for curto, houver sinal de hidratação, o extractor detectar challenge parcial ou houver uma tarefa interativa autorizada. Depois de `page.content()`, reaplicar `extractContentMechanically()` e `validateMechanicalCompleteness()`.

### 2. Implementar claim/lease de fila no banco

Criar uma função SQL transacional que reivindique N URLs com `status = pending`, ordene por prioridade/idade, respeite `next_attempt_at`, grave `processing_owner`, `processing_started_at`, `lease_until` e incremente tentativa no mesmo statement. Um job de recuperação deve devolver leases expirados para `pending` ou `dead_letter` conforme a política. O owner pode ser um worker Node, não um teste Playwright.

### 3. Adicionar scheduler por domínio

Usar uma fila global com limites por host: máximo de requests e contexts simultâneos, intervalo mínimo, jitter pequeno, cooldown compartilhado e respeito a `Retry-After`. Consultar `robots.txt` e termos para hosts permitidos e registrar a decisão. Um renderer Playwright deve obedecer ao mesmo scheduler do fetch; abrir vários contexts não pode contornar o rate limit.

### 4. Separar retry de transporte, browser e conteúdo

Definir uma tabela de decisão no código:

- retry limitado com backoff + jitter para timeout de rede, reset e 5xx;
- em 429, usar `Retry-After` e cooldown do host;
- em 403/CAPTCHA/paywall, não repetir agressivamente e não tentar bypass;
- em erro de browser/context, fechar context e tentar uma vez em novo context;
- em corpo insuficiente, mudar estratégia de `static` para `rendered` e depois `api-observed`, se autorizado;
- depois do máximo de tentativas, marcar falha terminal com motivo normalizado.

Isso complementa, em vez de copiar, o `maxRetries` de `route.fetch()`, que não cobre HTTP codes.

### 5. Capturar observabilidade amostrada

Ativar tracing somente em primeiro retry, falha de integridade, bloqueio suspeito ou amostra de diagnóstico. Usar screenshot/DOM snapshot/HAR quando o caso exigir, com redaction de cookies, authorization e dados pessoais antes de persistir. Gravar em storage de artefatos e inserir no Supabase apenas URI, checksum, retenção, tipo e vínculo com `crawl_queue.id`/`crawl_attempt.id`. Emitir métricas por host e strategy: sucesso, bloqueio, 429, tempo de navegação, bytes, palavras extraídas, qualidade e custo.

### 6. Manter extração determinística e evidência bruta

A page renderizada deve ser uma entrada adicional do pipeline, não uma licença para enviar cada página a LLM. Preservar JSON-LD, OpenGraph, texto limpo, HTML bruto comprimido e responses JSON. Reutilizar o Integrity Gate, `generateTitleHash`, Jaccard e gates de imagem. Adicionar uma `renderer_version` e `extraction_method = playwright_dom`, `playwright_network_json` ou equivalente para auditoria.

### 7. Definir uma política legal explícita

O código deve recusar hosts fora da allowlist, registrar o User-Agent real do Waesy, respeitar `robots.txt`/terms conforme a política jurídica do produto, não resolver CAPTCHA, não rotacionar proxy para contornar 403, não reutilizar cookies de usuários sem autorização e não usar Jina/Steel como forma automática de contornar um bloqueio. Quando a fonte oferecer API pública, preferi-la. Em 403/anti-bot, registrar `blocked_by_source` e parar ou encaminhar para revisão.

## Julgamento final

Playwright merece entrar no Waesy como **renderer autorizado e instrumentado**, atrás da fila e das políticas existentes. Ele melhora precisamente os casos que o código atual não cobre bem: JavaScript, hidratação, DOM real, XHR/fetch, screenshots, traces e isolamento por tentativa. Ele não substitui sitemap/RSS discovery, `crawl_queue`, cooldown distribuído, retries HTTP, Supabase, extração mecânica, Integrity Gate ou deduplicação.

A maior oportunidade imediata é corrigir a combinação “fallback Steel com HTML sintético + aceite ReAct baseado apenas em `html`/`markdown`” e acrescentar um adapter Playwright que devolva DOM real ou falha explícita. A segunda é tornar o claim da fila atômico e distribuído. Sem essas duas mudanças, aumentar capacidade de browser pode apenas tornar duplicação, custo, bloqueios e falsos sucessos mais rápidos.

## Referências

[1]: https://github.com/microsoft/playwright "microsoft/playwright — repositório oficial e README"
[2]: https://playwright.dev/docs/library "Playwright Library — uso direto da biblioteca versus Test Runner"
[3]: https://playwright.dev/docs/browser-contexts "Isolation — BrowserContext e isolamento"
[4]: https://playwright.dev/docs/network "Network — monitoramento, interceptação, proxy e eventos de rede"
[5]: https://playwright.dev/docs/test-retries "Retries — retries, workers e classificação de testes"
[6]: https://playwright.dev/docs/test-parallel "Parallelism — workers, limites, sharding e isolamento"
[7]: https://playwright.dev/docs/actionability "Auto-waiting — actionability checks e assertions retried"
[8]: https://playwright.dev/docs/api/class-route "Route — route.fetch, maxRetries e limites de retry"
[9]: https://playwright.dev/docs/navigations "Navigations — load, conteúdo tardio, hidratação e lifecycle"
[10]: https://playwright.dev/docs/trace-viewer "Trace viewer — DOM snapshots, rede, console, screenshots e attachments"
[11]: https://playwright.dev/docs/test-reporters "Reporters — reporters built-in, JSON/HTML e reporter customizado"
[12]: https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/browser.ts "Código oficial — criação de BrowserContext"
[13]: https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/fetch.ts "Código oficial — retries internos de API request e ECONNRESET"
[14]: https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/trace/recorder/tracing.ts "Código oficial — recorder de tracing"
[15]: https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/har/harTracer.ts "Código oficial — HAR tracer de rede"
[16]: https://github.com/microsoft/playwright/blob/main/packages/playwright/src/runner/dispatcher.ts "Código oficial — dispatcher de grupos e workers"
[17]: https://github.com/microsoft/playwright/blob/main/packages/playwright/src/runner/tasks.ts "Código oficial — fases, dependências, grupos e maxFailures"
[18]: https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/browserContext.ts "Código oficial — BrowserContext, interceptors, tracing e storage"
[19]: https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/network.ts "Código oficial — Route e interceptação de requests"

## Fontes locais do Waesy inspecionadas

- `/home/ubuntu/waesy-audit/SYSTEM_INVENTORY.md`
- `/home/ubuntu/waesy-audit/src/services/mining/crawler-batch-engine.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/automated-harvest.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/mechanical-extractor.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/integrity-gate.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/semantic-deduplicator.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/react-mining-adapter.ts`
- `/home/ubuntu/waesy-audit/src/lib/mining/firecrawl-client.ts`
- `/home/ubuntu/waesy-audit/src/lib/mining/scraper-utils.ts`
- `/home/ubuntu/waesy-audit/src/lib/mining/crawler-circuit-breaker.ts`
- `/home/ubuntu/waesy-audit/src/lib/mining/continuous-crawler.engine.ts`
- `/home/ubuntu/waesy-audit/src/lib/mining/sitemap-crawler.engine.ts`
- `/home/ubuntu/waesy-audit/src/lib/mining/rss-ingester.engine.ts`
