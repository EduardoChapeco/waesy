# Maxun como referência para os mineradores Waesy

## Leitura principal

O Maxun não é, no código auditado, um crawler distribuído de URLs com uma fila durável por página. Ele é uma plataforma de **robôs declarativos**: o usuário grava ou cria um workflow, o backend agenda uma execução em uma fila PostgreSQL, o worker reserva uma sessão Playwright e o `maxun-core` interpreta as ações. O `crawl` é uma ação do interpretador que mantém uma fila de URLs **em memória**, em breadth-first, dentro de uma única execução e de uma única página Playwright. Essa distinção é importante para não copiar para o Waesy uma arquitetura que o Maxun não possui.

Para o Waesy, as melhores ideias do Maxun são: separar despacho durável de execução; persistir resultados parciais a cada página; tornar escopo, profundidade, filtros, sitemap, links e robots configurações explícitas; aguardar conteúdo por sinais do DOM e requests XHR/fetch em vez de apenas `sleep`; controlar o ciclo de vida do browser; e comparar runs anteriores. O Waesy já é mais forte em extração mecânica verticalizada, circuit breaker por domínio, cooldown persistido, deduplicação semântica, proveniência de fontes públicas e auditoria de negócio. A recomendação é combinar esses pontos sem adotar bypass agressivo de anti-bot, sem introduzir Redis por reflexo e sem substituir os extratores específicos do Waesy por uma captura genérica de HTML.

## O que foi auditado

A comparação foi feita contra o inventário canônico em `/home/ubuntu/waesy-audit/SYSTEM_INVENTORY.md` e contra o código real de `/home/ubuntu/waesy-audit/src/services/mining`, incluindo `crawler-batch-engine.ts`, `automated-harvest.ts`, `mechanical-extractor.ts`, `specialized-extractors.ts`, `places-harvester.ts`, `pncp-harvester.ts`, `semantic-deduplicator.ts` e os utilitários de `/home/ubuntu/waesy-audit/src/lib/mining`. O Maxun foi clonado da branch `develop` no commit `1ec47a5aa8ab510c5b3141594c0059d8e6748bd3`, para que os links de código usados abaixo sejam reprodutíveis.

O próprio inventário Waesy declara 1.837 arquivos em `src`, 537 tabelas, 44 skills, 8 subagentes, 8 verticais, TanStack Start/server functions no BFF, Supabase Postgres com RLS/pg_cron/pg_net/pgvector e 21 arquivos de mineração. O código confirma um motor de fila em `crawl_queue`, roteamento polimórfico por entidade e persistência em tabelas específicas, não um crawler genérico único.

## Arquitetura efetiva do Maxun

### Camadas e processos

O repositório oficial separa frontend React/Vite, backend Express/TypeScript, `maxun-core`, serviço de browser e componentes de storage. O `docker-compose.yml` inicia PostgreSQL, MinIO, backend, frontend e um serviço de browser remoto. O setup oficial também permite instalação sem Docker com Node.js, PostgreSQL, MinIO, Redis e Chromium; no código desta revisão, a fila de execução efetivamente usada é Graphile Worker sobre PostgreSQL, não uma implementação BullMQ/Redis.

O núcleo público de `maxun-core` expõe um `Interpreter` que valida o workflow, calcula condições `where`, executa ações `what` em uma `Page` Playwright e emite callbacks serializáveis/binários. As ações incluem navegação, interação, screenshot, `scrape`, `scrapeSchema`, `scrapeList`, `enqueueLinks`, `crawl` e `search`. O backend acrescenta sockets Socket.IO, persistência Sequelize/Postgres, MinIO para binários, webhooks, integrações e scheduler.

### Filas e execução

A fila durável é Graphile Worker armazenada no mesmo PostgreSQL. `server/src/task-runner.ts` registra identificadores para inicializar/destruir browser, interpretar workflow, parar interpretação, executar run, abortar run e disparar workflow agendado. `WORKER_CONCURRENCY` define a concorrência do runner e o default observado é 10; o pool PostgreSQL usa `TOTAL_CONCURRENCY + 2`. Os jobs possuem `maxAttempts`, `runAt` e `jobKey` por meio de `addJob`.

A deduplicação de despacho usa `jobKey` para execução de um run, mas o caminho observado cria o job de execução com `maxAttempts: 1`. O agendamento usa `maxAttempts: 6`. Há também estado de run e uma contagem manual de retries no fluxo de execução, com limite de três tentativas antes de marcar o run como falho. Portanto, o Maxun tem retry em nível de job/run, mas não apresenta no `crawl` um retry independente por URL com fila de prioridade, lease por item ou dead-letter queue.

O scheduler DB-backed consulta robots vencidos em lote de 10 a cada 30 segundos, usa advisory lock PostgreSQL, `FOR UPDATE` com `skipLocked`, marca `schedulerClaimedAt`, enfileira o workflow e calcula `nextRunAt`. Esse padrão é relevante para o Waesy porque evita duas instâncias dispararem o mesmo agendamento, algo que uma simples leitura seguida de update da fila não garante.

### O que é e não é a fila do crawler

A ação `crawl` cria `visitedUrls`, `crawlQueue` e `crawlResults` em memória. A fila é um array FIFO (`shift`), inicializado com a URL de entrada; a função registra URLs do sitemap e depois segue links em breadth-first. A URL é marcada como visitada quando é adicionada à fila, antes de ser carregada. O crawl é serial: navega, aguarda, extrai, persiste o progresso, e só então expande os links da página.

Há uma classe `Concurrency` para `enqueueLinks`, mas ela é um limitador de tarefas em memória, com `maxConcurrency` por instância; não é uma fila persistida nem um scheduler por domínio. Ela usa `pop`, portanto a ordem da espera é LIFO quando há mais trabalhos do que workers. O `enqueueLinks` abre páginas novas, executa o workflow nelas e fecha cada página, enquanto o `crawl` usa a página corrente.

A consequência prática é: Graphile Worker protege a execução de robôs entre processos; a descoberta de páginas do crawl não sobrevive à queda do processo, não pode ser retomada por outro worker e não distribui URLs entre hosts. O progresso parcialmente coletado, porém, é emitido pelo callback após cada página, o que permite recuperar dados já persistidos mesmo se o restante da execução for abortado.

## Discovery, escopo e deduplicação

A documentação oficial oferece três modos: `domain` para hostname exato, `subdomain` para hostname base e subdomínios, e `path` para o path inicial. Há `limit`, `maxDepth`, `includePaths`, `excludePaths`, `useSitemap`, `followLinks` e `respectRobots`. O SDK Python documenta defaults de 50 páginas, profundidade 3, sitemap e links ativados, robots respeitado e formato Markdown. A documentação também alerta que include/exclude estava em desenvolvimento e não totalmente garantido; no commit auditado, o código aplica os padrões como expressões regulares contra a URL completa.

O sitemap é buscado em `/<sitemap.xml>`. O parser usa regex sobre tags `<loc>`, adiciona URLs regulares com profundidade 1 e inspeciona no máximo 10 sitemaps aninhados. O código não mostra um parser XML completo, decodificação robusta de entidades, consulta de `robots.txt` para descobrir múltiplos sitemaps, limite de URLs inseridas do sitemap antes da fila, ou retry específico do sitemap. Os filtros de configuração e robots são aplicados antes de inserir cada URL.

A extração de links lê todos os elementos `<a>` visíveis no DOM lógico, transforma `href` em URL absoluta pelo navegador e mantém somente `http://` e `https://`. A normalização remove fragmentos e uma barra final. Não há, nesse caminho, uma canonicalização geral de query strings, parâmetros de rastreamento, host em lowercase, porta padrão, percent-encoding ou `rel=canonical`. Isso pode produzir duplicatas semânticas.

Há dois pontos que precisam ser endurecidos antes de usar a ideia no Waesy: o teste de subdomínio no código usa `hostname.endsWith(baseDomain)`, sem exigir o limite de `.`; um hostname malicioso terminado pelo texto do domínio pode passar. Além disso, o modo `path` compara `pathname.startsWith(parsedBase.pathname)`, o que pode aceitar prefixos de caminho que não são um segmento completo. São observações do código, não alegações da documentação.

O Maxun contabiliza falhas de navegação como entradas de resultado com `error`, e essas entradas contam para `crawlResults.length < limit`. Isso é bom para transparência e resultado parcial, mas significa que um limite de 50 pode retornar menos de 50 páginas bem-sucedidas após erros. Não há requeue da URL que falhou.

## Politeness e robots.txt

Quando `respectRobots` é verdadeiro, o Maxun busca `robots.txt` no host inicial e interpreta grupos de `User-agent`, `Disallow`, `Allow` e `Crawl-delay`. A regra tenta privilegiar grupos cujo agente contém `bot`, `crawler` ou `spider`, com fallback para `*`. O matching cobre igualdade/prefixo, curingas simples e um tratamento de `$`. Se robots não existir, estiver inacessível ou falhar no parse, o log diz que o crawl prossegue sem restrições.

O `Crawl-delay` convertido para milissegundos é aguardado entre páginas bem-sucedidas, não necessariamente entre toda tentativa HTTP. O código não mostra um rate limiter por domínio, token bucket, limite de requests simultâneos por host, respeito a `Retry-After`, backoff de 429/503 ou cooldown persistido após bloqueio. Também não mostra uma política explícita para uma URL de host diferente antes de verificar o escopo.

Isso é um limite importante: “respeita robots” no Maxun é uma capacidade real, mas o parser é caseiro e o fallback de erro é permissivo. Para um minerador de produção, a política deve ser fail-closed para alvos de terceiros quando a decisão de robots é desconhecida, ou exigir uma configuração explícita de autorização para prosseguir.

O Waesy já possui uma camada mais madura nesse ponto. `scraper-utils.ts` tem retry com backoff exponencial e jitter operacional, leitura de `Retry-After`, cooldown de 429 e 403/Cloudflare, user-agent rotativo, rate limit por chave e cooldown persistível em `domain_cooldowns`. `crawler-circuit-breaker.ts` mantém circuitos `CLOSED`, `OPEN` e `HALF_OPEN` por domínio, com limiar de três falhas, cooldown de 30 segundos e timeout de oito segundos. Esse mecanismo deve ser preservado; Maxun acrescenta a ele a necessidade de uma decisão formal de robots e um delay positivo mesmo sem `Crawl-delay` quando a política do alvo assim exigir.

## Browser, rendering e readiness

O Maxun usa Playwright sobre um browser remoto. `BrowserPool` mantém slots por usuário, separa estados de `recording` e `run`, registra `reserved`, `initializing`, `ready` e `failed`, limita a dois browsers por usuário e possui locks de reserva. O controller inicializa de forma assíncrona, espera conexão do frontend, destrói sessões com timeout de 30 segundos e encerra recording após 10 minutos.

O `RemoteBrowser` cria um `BrowserContext` por sessão. Usa JavaScript habilitado, viewport desktop, `reducedMotion`, timeout de contexto e user-agent escolhido de uma lista. A navegação é serializada por página com uma promessa por estado de navegação, evitando duas navegações concorrentes na mesma página. Para gravação, usa rrweb para streaming do DOM; para execução de robôs, o código pula rrweb para reduzir custo.

A estratégia de navegação distingue modos: `networkidle` quando a operação exige renderização visual, e `domcontentloaded` para operações DOM-only, como crawl e links. Para screenshot, há uma espera limitada de até dez segundos por `networkidle`, espera de imagens e um segundo adicional; o timeout de network idle é engolido, para não travar sites com websockets, anúncios ou chat. Para extração, o interpretador procura primeiro um seletor conhecido, depois usa `requestIdleCallback` e contagem de XHR/fetch pendentes, com janela de até 8 segundos e timeout total de 15 segundos. Isso é mais robusto que um `sleep` fixo.

O scrape de Markdown/HTML faz uma navegação com fallback, aguarda XHR/fetch, tenta fechar overlays por Escape e seletores comuns, remove scripts, estilos, iframes, objetos, metadados e atributos de evento, e achata alguns shadow roots antes de converter para Markdown. O crawl captura título, metadados, HTML, texto, links, word count e timestamp; formatos posteriores podem descartar campos não solicitados. Screenshots são capturados na primeira passagem, evitando revisitar cada página em uma segunda varredura.

## Anti-bot dentro de limites legais

O código Maxun contém fingerprint-generator/fingerprint-injector, patch do `navigator.webdriver`, user-agents, proxy por usuário e integração de adblocker. O contexto recebe proxy autenticado quando configurado, fingerprint é anexado e há uma tentativa de esconder `webdriver`. A documentação/README também mostra parceiros de proxy.

Essas são capacidades observáveis no código, mas não devem ser tratadas como garantia de atravessar Cloudflare, CAPTCHA, login ou controle de acesso. O próprio crawl é documentado como inadequado para workflows complexos de login/formulário; para isso a documentação recomenda Extract. Não há no código auditado um resolvedor de CAPTCHA nem uma autorização para quebrar controles de acesso.

Para o Waesy, a regra legal e operacional deve ser: somente rastrear páginas públicas ou alvos para os quais exista autorização; respeitar robots.txt, termos, limites e direitos autorais; não resolver CAPTCHA, não contornar paywall/login e não rotacionar IP para escapar de bloqueio; registrar 403/429 e pausar o domínio. Proxies, headers realistas e browser podem servir a compatibilidade e isolamento de sessão autorizada, não a evasão de controles.

O Waesy atualmente tem fallbacks Firecrawl, native fetch, Steel e Jina, além de detecção explícita de Cloudflare/bot challenge. A adaptação recomendada é preservar o retorno honesto `isBlocked`, `rateLimited`, `httpStatus` e `provider`, e nunca transformar uma screenshot de fallback em HTML sem conteúdo que pareça sucesso de extração. O `firecrawl-client.ts` já registra cooldown de domínio para desafio Cloudflare; esse padrão é mais seguro que insistir em tentativas.

## Extração

O Maxun divide extração em três famílias úteis:

- `scrape` genérico e heurístico, incluindo descoberta de listas por estrutura DOM;
- `scrapeSchema` com seletores, atributos, shadow DOM e iframes;
- `scrapeList` com campos, limite e paginação, além de `crawl`/`search` que retornam conteúdo por página.

`maxun-core` usa callbacks incrementais para dados serializáveis e binários. `scrapeList` tenta novamente duas vezes quando a avaliação retorna vazio, com atraso fixo de 500 ms. A extração de lista trata paginação em um caminho separado. O interpretador limita, no backend editor/run observado, configurações de `scrapeList` acima de 5 em uma etapa de validação específica; isso não é um limite geral documentado para todo crawl.

O Waesy tem um diferencial de domínio: `mechanical-extractor.ts` prioriza JSON-LD Schema.org, OpenGraph/meta tags, seletores por portal e densidade textual; `specialized-extractors.ts` trata Recipe, Event e JobPosting; `pncp-extractor`/`pncp-harvester` usam API oficial; places usa Overpass/Nominatim; e a pipeline aplica integrity gate, curation e persistência específica. Não há motivo para trocar isso por `scrape` genérico. O padrão Maxun a adotar é o de **extração como estágio após readiness e antes de persistência incremental**, com evidência de método, URL, status, timestamp e erro por item.

Um cuidado para o Waesy: a função Maxun que copia HTML/texto do DOM não é um extrator editorial. Ela captura também boilerplate e marca status HTTP como 200 no metadata do DOM. O Waesy deve manter seus gates de completude, contagem de palavras, flags de poluição, conteúdo hash, provenance e validação de imagem.

## Observabilidade, histórico e storage

O Maxun usa Winston para console e arquivos `error.log`/`combined.log`, logs de etapa do interpretador, eventos de erro de job, Socket.IO para progresso e PostHog opcional condicionado a `MAXUN_TELEMETRY=true`. O modelo `Run` persiste status, timestamps, log, `serializableOutput`, `binaryOutput`, `retryCount`, `isPartial` e `hasChanges`. O `WorkflowInterpreter` mantém buffer de persistência de tamanho 5, flush a cada 3 segundos, até três retries de persistência e contagem de itens já persistidos para não regravar cumulativamente toda a lista.

O comparador de runs busca a execução bem-sucedida anterior, normaliza whitespace para text/Markdown/HTML e grava `hasChanges`/`changedFormats`. Para listas, canonicaliza chaves e ordena linhas antes da comparação. A documentação confirma histórico de runs, abort, `get_latest_run`, status e monitoramento. A documentação também deixa claro que comparação de screenshots e monitoramento de crawl são Cloud-only; não se deve inferir que a edição OSS tenha todas as funções de monitoramento da nuvem.

MinIO armazena screenshots e documentos. O código cria bucket, escreve objeto por `runId/key`, preserva base64 se upload falhar e atualiza o JSONB do run. Porém, o código aplica política pública `s3:GetObject` ao bucket de screenshots/documentos em vários caminhos. Para um sistema Waesy com dados potencialmente sensíveis, não copie essa configuração: prefira bucket privado e URLs assinadas com expiração, RLS/ACL e auditoria de acesso.

No Waesy, `scraper_audit_log` já registra itens encontrados/processados/inseridos, duração, source e erros; o pipeline de notícias calcula tokens economizados; e as tabelas `mined_raw_extractions`, `mined_articles`, `news_articles`, `directory_listings`, `mined_tenders` e `economic_indicators` separam estágios de negócio. A melhoria é aproximar a granularidade operacional do Maxun sem perder a separação por domínio: registrar cada attempt, host, método, status HTTP, provider, wait strategy, conteúdo hash, selector/schema usado, retry-after, cooldown e trace/run id.

## Comparação direta com o código Waesy

### Fila e concorrência

O `crawler-batch-engine.ts` busca itens `pending`, ordena por `priority` e `created_at`, limita o lote, atualiza cada item para `processing` e processa sequencialmente. O tamanho default observado é 5. O código incrementa `retry_count`, mas a execução mostrada não decide um `next_retry_at`, não faz backoff baseado nessa contagem e marca falha terminal após a exceção do item. Como o select e o update não são uma operação de claim atômica, duas instâncias podem selecionar o mesmo item antes da atualização.

O Maxun oferece o padrão de fila durável, `jobKey`, advisory lock/skip-locked para agendamento e estados de run, mas o crawl interno também não distribui páginas. A adaptação de maior valor é criar uma função/RPC Supabase/Postgres de claim com `FOR UPDATE SKIP LOCKED`, lease e owner, inspirada no scheduler Maxun, e manter o processamento vertical do Waesy. Não é necessário adicionar Redis só porque o setup do Maxun o menciona.

### Discovery

O `automated-harvest.ts` descobre candidatos principalmente em feeds RSS canônicos e o batch engine enfileira links de feed com `upsert` por URL. Há sitemaps e descoberta em outros módulos do Waesy, além do crawler contínuo. O Maxun oferece um contrato mais explícito e uniforme para modo, depth, include/exclude, sitemap, follow links e robots. Waesy deveria representar esses metadados na fila (`parent_id`, `depth`, `discovered_by`, `discovery_timestamp`, `canonical_url`, `scope_id`) e aplicar escopo antes de chamar cada vertical.

### Politeness e retries

O Waesy é superior ao Maxun na proteção de domínio: possui circuit breaker por host, cooldown persistido, Retry-After, user-agents rotativos e detecção de rate limit/Cloudflare. Falta unificar isso no `crawler-batch-engine` e conectar a decisão de retry ao estado da fila. O padrão recomendado é: erros de transporte/429/503 ficam `retryable` com `next_attempt_at` e jitter; 403/CAPTCHA/robots disallow ficam `blocked`/`skipped`; erro de schema ou integridade fica `rejected`; erro de persistência fica `retryable` com idempotency key; e o item vai para uma fila terminal após um teto.

### Browser/rendering

A maior parte do batch Waesy usa HTTP/Firecrawl/native fetch e extrai HTML; o `react-mining-adapter` fornece caminho de browser/React. O Maxun integra readiness DOM/XHR, páginas Playwright e sessões remotas. A adaptação é adicionar um estágio de escalation controlado: HTTP primeiro; browser autorizado somente se HTML não tiver conteúdo suficiente, se houver sinais de renderização necessária ou se a fonte estiver explicitamente configurada; retornar o motivo da escalada. Não usar browser para contornar uma resposta 403 sem autorização.

### Extração e qualidade

O Waesy já tem quatro camadas mecânicas, especializações por entidade, integrity gate, Jaccard e hash. O Maxun contribui com `scrapeSchema`/`scrapeList` declarativos, readiness por seletor e persistência incremental. A recomendação é adicionar um contrato comum de `ExtractionEvidence` ao retorno dos harvester: `{method, selectorOrSchema, sourceUrl, canonicalUrl, fetchedAt, httpStatus, contentHash, wordCount, qualityFlags}`. Isso reduz a diferença entre notícia, edital, evento, lugar e indicador sem eliminar seus parsers.

### Deduplicação

O Maxun deduplica URLs normalizadas removendo fragmento e slash final durante um crawl. O Waesy tem uma deduplicação de negócio mais forte: hash SHA-256 de URL canônica, `upsert` por conflitos e Jaccard em janela temporal de 48 horas. A melhoria é combinar os dois níveis: deduplicação de frontier por canonical URL antes do fetch e deduplicação de entidade/conteúdo depois da extração. O hash de conteúdo do crawler contínuo pode impedir reprocessamento semântico de páginas que mudam somente boilerplate.

### Observabilidade e armazenamento

O Waesy já registra auditoria em `scraper_audit_log`, mas o batch engine poderia preservar um registro de attempt por item, em vez de apenas estado final. O Maxun oferece referência para `isPartial`, flush incremental, logs de progresso e diff da execução anterior. O Waesy deve adotar esses padrões no Postgres/Supabase: run id, item id, attempt number, start/end, provider, status, http status, blocked/rate-limited, bytes/words, extraction method, error class e output version. Para binários, não usar policy pública por default; usar storage privado com URL assinada.

## Plano de adaptação recomendado

1. **P0 — claim seguro e lease da fila.** Criar RPC/transação para selecionar `pending` elegíveis por prioridade/idade, bloquear com `SKIP LOCKED`, gravar `processing`, `lease_until`, `worker_id` e `attempt_count` no mesmo passo. Um watchdog devolve itens cujo lease expirou, com limite de recuperações.

2. **P0 — política explícita de resultado.** Separar `completed`, `retryable`, `blocked`, `rejected` e `failed_terminal`. Persistir `last_error_class`, `http_status`, `retry_after`, `next_attempt_at`, `cooldown_until` e `provider`. Reusar o circuit breaker por domínio antes de claimar trabalho novo desse host.

3. **P0 — frontier comum.** Adicionar canonicalização segura de URL, parent/depth/discovered_by, escopo por hostname/path e limite de frontier. Rejeitar esquemas não HTTP(S), IPs/hosts privados quando a tarefa não exigir acesso interno e subdomínios por comparação de labels, não por `endsWith` ingênuo.

4. **P1 — discovery híbrida.** Implementar parser XML robusto para sitemap index, limite de sitemaps e páginas, seguir links somente depois da página aprovada e aplicar robots/escopo antes de inserir. Registrar a origem da descoberta. O padrão BFS do Maxun é apropriado para previsibilidade, mas a fila deve ser persistida no Waesy.

5. **P1 — politeness por host.** Preservar o circuito Waesy e adicionar token bucket por hostname, delay mínimo configurável, parsing de robots com bibliotecas testadas e fail-closed para falha de política em alvos externos. Respeitar `Retry-After`; não insistir em 403/CAPTCHA.

6. **P1 — readiness e browser escalation.** Copiar do Maxun a espera por seletor, contagem XHR/fetch e timeout limitado. Usar browser remoto/contexto isolado apenas em tarefas autorizadas e com limites de páginas, memória e tempo. Persistir o `wait_strategy` e motivo da escalada.

7. **P1 — persistência incremental.** Depois de cada página/entidade, gravar delta idempotente e checkpoint de frontier. Manter o item bruto separado do resultado curado. Isso combina o flush incremental do Maxun com `mined_raw_extractions` e `scraper_audit_log` do Waesy.

8. **P2 — monitoramento operacional.** Adicionar comparação por hash/campos para cada vertical e diffs de runs, mas distinguir mudança de conteúdo de mudança de boilerplate. Não ativar IA para todo diff; usar os gates determinísticos antes de qualquer curadoria.

9. **P2 — segurança de storage e anti-bot.** Manter artefatos privados, usar URLs assinadas e registrar consentimento/configuração de proxy. Não copiar patch de `navigator.webdriver`, rotação de IP ou fingerprint como técnica de evasão padrão. Quando a origem bloquear ou exigir CAPTCHA, marcar bloqueio e parar.

## Padrões úteis e o que não copiar

**Copiar/adaptar:** fila PostgreSQL durável em nível de job; `jobKey`/idempotência; advisory lock e `skipLocked` do scheduler; estados explícitos; BrowserPool com reserva/health/cleanup; navegação serializada; wait por seletor e requests; flush incremental; output parcial honesto; comparação com run anterior; formatos de saída declarativos; escopo e limites de crawl explícitos.

**Não copiar sem revisão:** fallback de robots que prossegue sem restrição quando a leitura falha; parser regex de XML; matching de subdomínio por `endsWith`; ausência de retry/requeue por URL; policy pública de MinIO; atribuir HTTP 200 ao metadata derivado do DOM; tratar fingerprint/webdriver/proxy como bypass anti-bot; e adicionar Redis apesar de a fila efetiva do código ser PostgreSQL.

## Conclusão

Maxun é uma boa referência de **produto de execução de workflows em browser** e de **contrato declarativo para crawl**, não uma implementação pronta de crawler distribuído industrial. Waesy já possui a base de domínio, qualidade, fontes oficiais, circuit breaker e auditoria que Maxun não oferece nesse nível. O ganho mais seguro é estrutural: claim transacional, leases, retries classificados, frontier persistida, discovery/robots explícitos, readiness de browser e checkpoints incrementais. Anti-bot deve permanecer subordinado à autorização e à politeness; bloqueio é um resultado válido, não uma falha a ser contornada.

## Referências primárias

[1]: https://github.com/getmaxun/maxun/blob/1ec47a5aa8ab510c5b3141594c0059d8e6748bd3/README.md "Maxun README no commit auditado"
[2]: https://github.com/getmaxun/maxun/tree/1ec47a5aa8ab510c5b3141594c0059d8e6748bd3 "Árvore do repositório Maxun no commit auditado"
[3]: https://docs.maxun.dev/ "Documentação oficial Maxun"
[4]: https://docs.maxun.dev/robot/crawl/crawl-introduction "Documentação oficial de Crawl"
[5]: https://docs.maxun.dev/sdk/python-sdk/sdk-crawl "Documentação oficial do SDK Python Crawl"
[6]: https://docs.maxun.dev/sdk/python-sdk/sdk-robot "Documentação oficial de Robot Management, runs e schedules"
[7]: https://docs.maxun.dev/monitoring "Documentação oficial de Monitoring"
[8]: https://github.com/getmaxun/maxun/blob/1ec47a5aa8ab510c5b3141594c0059d8e6748bd3/maxun-core/src/interpret.ts "maxun-core Interpreter, crawl, robots, sitemap e readiness"
[9]: https://github.com/getmaxun/maxun/blob/1ec47a5aa8ab510c5b3141594c0059d8e6748bd3/maxun-core/src/utils/concurrency.ts "Concurrency em memória do maxun-core"
[10]: https://github.com/getmaxun/maxun/blob/1ec47a5aa8ab510c5b3141594c0059d8e6748bd3/server/src/task-runner.ts "Tasks e runner Graphile Worker"
[11]: https://github.com/getmaxun/maxun/blob/1ec47a5aa8ab510c5b3141594c0059d8e6748bd3/server/src/storage/graphileWorker.ts "Wrapper Graphile Worker e addJob"
[12]: https://github.com/getmaxun/maxun/blob/1ec47a5aa8ab510c5b3141594c0059d8e6748bd3/server/src/schedule-worker.ts "Scheduler DB-backed com advisory lock e SKIP LOCKED"
[13]: https://github.com/getmaxun/maxun/blob/1ec47a5aa8ab510c5b3141594c0059d8e6748bd3/server/src/browser-management/classes/BrowserPool.ts "Pool e estados de browser"
[14]: https://github.com/getmaxun/maxun/blob/1ec47a5aa8ab510c5b3141594c0059d8e6748bd3/server/src/browser-management/classes/RemoteBrowser.ts "RemoteBrowser, Playwright, proxy e fingerprint"
[15]: https://github.com/getmaxun/maxun/blob/1ec47a5aa8ab510c5b3141594c0059d8e6748bd3/server/src/markdownify/scrape.ts "Readiness e conversão de páginas"
[16]: https://github.com/getmaxun/maxun/blob/1ec47a5aa8ab510c5b3141594c0059d8e6748bd3/server/src/utils/output-post-processor.ts "Formatos e pós-processamento de crawl/search"
[17]: https://github.com/getmaxun/maxun/blob/1ec47a5aa8ab510c5b3141594c0059d8e6748bd3/server/src/models/Run.ts "Modelo persistido de Run"
[18]: https://github.com/getmaxun/maxun/blob/1ec47a5aa8ab510c5b3141594c0059d8e6748bd3/server/src/utils/run-comparison.ts "Comparação entre runs"
[19]: https://github.com/getmaxun/maxun/blob/1ec47a5aa8ab510c5b3141594c0059d8e6748bd3/server/src/storage/mino.ts "Storage MinIO e policy de objetos"
[20]: https://github.com/getmaxun/maxun/blob/1ec47a5aa8ab510c5b3141594c0059d8e6748bd3/server/src/routes/proxy.ts "Configuração de proxy criptografada"
[21]: https://github.com/getmaxun/maxun/blob/1ec47a5aa8ab510c5b3141594c0059d8e6748bd3/server/src/utils/analytics.ts "Telemetry PostHog condicionada a MAXUN_TELEMETRY"
[22]: https://github.com/getmaxun/maxun/blob/1ec47a5aa8ab510c5b3141594c0059d8e6748bd3/docker-compose.yml "Topologia Docker oficial"
[23]: https://github.com/getmaxun/maxun/blob/1ec47a5aa8ab510c5b3141594c0059d8e6748bd3/SETUP.md "Setup e variáveis oficiais"

## Evidência local Waesy

- `file:///home/ubuntu/waesy-audit/SYSTEM_INVENTORY.md`
- `file:///home/ubuntu/waesy-audit/src/services/mining/crawler-batch-engine.ts`
- `file:///home/ubuntu/waesy-audit/src/services/mining/automated-harvest.ts`
- `file:///home/ubuntu/waesy-audit/src/services/mining/mechanical-extractor.ts`
- `file:///home/ubuntu/waesy-audit/src/services/mining/specialized-extractors.ts`
- `file:///home/ubuntu/waesy-audit/src/services/mining/places-harvester.ts`
- `file:///home/ubuntu/waesy-audit/src/services/mining/pncp-harvester.ts`
- `file:///home/ubuntu/waesy-audit/src/services/mining/semantic-deduplicator.ts`
- `file:///home/ubuntu/waesy-audit/src/lib/mining/crawler-circuit-breaker.ts`
- `file:///home/ubuntu/waesy-audit/src/lib/mining/firecrawl-client.ts`
- `file:///home/ubuntu/waesy-audit/src/lib/mining/continuous-crawler.engine.ts`
- `file:///home/ubuntu/waesy-audit/src/lib/mining/scraper-utils.ts`
