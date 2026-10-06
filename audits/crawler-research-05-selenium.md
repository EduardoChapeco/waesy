# Selenium para melhorar os mineradores Waesy

O Selenium não é um crawler de páginas. O README do repositório o define como um ecossistema de automação de browsers e uma infraestrutura para a especificação W3C WebDriver; o Grid distribui sessões de browser, não URLs de conteúdo. Esta distinção é o resultado operacional mais importante para o Waesy: Selenium pode ser adotado como uma camada de rendering/execução distribuída e como referência para filas, leases, matching, health checks e observabilidade, mas não substitui frontier/discovery, politeness, extração, deduplicação ou storage editorial. [1] [7]

## Escopo e revisão analisada

A análise foi feita no clone raso do repositório oficial `SeleniumHQ/selenium`, fixado no commit `e431cc8e5622eca7ec3b9666d1eaa238e83e725b` (HEAD do clone em 2026-10-06). A árvore imutável do commit pode ser consultada em [2]. A documentação oficial consultada é a versão publicada em `selenium.dev`; quando documentação e código divergem em detalhes de defaults, o código do commit fixado prevalece.

A comparação do Waesy usa:

- `/home/ubuntu/waesy-audit/SYSTEM_INVENTORY.md`, que registra 21 arquivos em `src/services/mining`, oito verticais de mineração, Supabase Postgres, `crawl_queue`, parsers mecânicos, Jaccard, Overpass, PNCP e BCB.
- `/home/ubuntu/waesy-audit/src/services/mining/crawler-batch-engine.ts`, `/automated-harvest.ts`, `/mechanical-extractor.ts`, `/specialized-extractors.ts`, `/integrity-gate.ts`, os harvesters de PNCP, eventos, leilões, imóveis e lugares, além de `/home/ubuntu/waesy-audit/src/lib/mining/scraper-utils.ts` e `firecrawl-client.ts`.

Não executei sessão contra sites de terceiros, não tentei contornar desafios e não tratei a existência de uma API ou de um fallback como prova de que o fluxo sempre os utiliza. As afirmações sobre o Waesy abaixo são leitura estática do código local, com os caminhos e linhas indicados.

## Arquitetura real do Selenium Grid

A documentação do Grid descreve seis papéis: Event Bus para mensagens assíncronas; New Session Queue para pedidos ainda não atribuídos; Distributor para manter o modelo de slots e escolher onde abrir a sessão; Node para executar sessões WebDriver; Session Map para mapear `sessionId` ao Node; e Router como front-end. [3] [4]

O código confirma esse desenho. `Router` combina as rotas de `SessionMap`, `NewSessionQueue` e `Distributor`; rotas de `/session/{sessionId}/...` passam a `HandleSession`, que consulta o Session Map e encaminha ao Node. [12] [18] Uma nova sessão entra na fila; uma sessão existente não volta a disputar slots. O pacote do Grid também registra que a sessão criada é adicionada ao Session Map e que o Node deve remover o mapeamento no encerramento. [12]

O Event Bus não é o banco de dados da sessão. Ele serve para avisos assíncronos, como status, heartbeat, node removido, node reiniciado e sessão fechada. A documentação separa chamadas HTTP síncronas, nas quais a resposta é necessária, de eventos assíncronos, nos quais a perda da resposta não deve quebrar o fluxo. [3] Essa separação é útil para o Waesy: a reserva/claim de uma URL deve ser transacional; notificação de disponibilidade de worker, métricas e invalidação podem ser eventos.

O startup conceitual oficial é Event Bus e Session Map, depois Queue, Distributor, Router e Nodes. Na prática os componentes podem iniciar em ordens diferentes, mas readiness impede que tráfego seja aceito antes de dependências estarem utilizáveis. [3] O `Router.isReady()` exige Distributor, Session Map e Queue prontos; as implementações Redis também verificam conectividade antes de declarar readiness. [18] [15]

### Slots, stereotypes e matching

Um Node anuncia slots. Cada slot tem um `stereotype`, isto é, a capacidade mínima que um pedido deve satisfazer. O Distributor deriva os stereotypes dos slots disponíveis, usa um `SlotMatcher` para comparar capabilities e um `SlotSelector` para escolher o slot. [3] [4] Isso não é apenas uma abstração de browser: é um padrão de scheduling por capacidade.

No `LocalDistributor`, a seleção do slot ocorre sob leitura; a reserva do slot usa um lock de escrita curto; a abertura da sessão ocorre depois, fora do lock. [16] Esse recorte evita segurar o lock durante uma operação de I/O lenta. Depois de uma sessão criada, o Distributor grava o Session Map e atualiza o estado do slot. Se a criação falhar, libera a reserva. [16]

O código também explicita um limite de fairness: o polling e o processamento da fila ocorrem fora do lock e, sob contenção, uma requisição pode sofrer starvation. [16] Isso é uma advertência importante para o Waesy. O padrão de reservar rapidamente e fazer I/O fora do lock é recomendável; a política de fairness precisa ser decidida pelo minerador, não presumida.

## Filas, leases e retries

### New Session Queue local

`NewSessionQueue` recebe `POST /session`, cria um `RequestId`, registra o instante de entrada e bloqueia o chamador até a sessão ser concluída, cancelada ou expirar. A interface expõe adicionar, remover, buscar pedidos compatíveis, completar e reenfileirar. [13]

`LocalNewSessionQueue` é explicitamente uma fila em memória. Ela mantém uma deque e um mapa de dados, usa `queue.addLast()` na entrada, reaplica uma tentativa com `offerFirst()` e tem um thread agendado para expirar pedidos. [14] O pedido só é removido definitivamente quando a conclusão é publicada; se o cliente desaparece, é marcado como cancelado. O método de busca espera até `maximumResponseDelay` por dados para reduzir polling agressivo, limita o lote e filtra capabilities contra slots disponíveis. [14]

A fila tem, portanto, propriedades que faltam ao claim direto do Waesy:

1. **identidade por requisição** (`RequestId`), em vez de depender só da URL;
2. **deadline absoluta por pedido**, em vez de apenas uma contagem de tentativas;
3. **claim e completion separados**, para que o worker possa falhar e devolver o item;
4. **requeue na frente**, quando a causa é temporariamente falta de capacidade;
5. **resultado terminal idempotente**, com cancelamento e timeout explícitos;
6. **backpressure por lote e por número de threads**.

A FIFO é a ordem base, mas o matching seleciona pedidos compatíveis com stereotypes. O próprio Distributor alerta que, sob alta contenção, o processamento fora do lock pode causar starvation. Portanto, a adaptação para URLs não deve prometer FIFO rígida se a política de domínio/renderer puder escolher outro item compatível.

### Fila Redis distribuída

`RedisBackedNewSessionQueue` é documentada no código como stateless e horizontalmente escalável. A ordem da fila, payload, deadline e resultado ficam no Redis; réplicas diferentes podem receber a inserção e a conclusão. [15]

O desenho tem detalhes reutilizáveis pelo Waesy:

- lista Redis para a ordem lógica;
- chave de payload e chave de deadline por request;
- TTL para que estado abandonado se limpe após falha de uma réplica;
- caminho rápido com `CountDownLatch` local e polling Redis de 25 ms para completion em outra réplica;
- `SET NX` em marcador de completion para que o primeiro timeout ou sucesso vença a corrida;
- `LREM` atômico para reivindicar um item antes de processá-lo;
- ao perder a corrida de completion, uma sessão já aberta é encerrada pelo Distributor.

[15] Esse último ponto é especialmente relevante: o Selenium não considera a criação do recurso suficiente. Se o cliente já expirou, a sessão criada tardiamente é destruída para não deixar browser órfão. O Waesy deve adotar a mesma compensação para um item cujo lease expirou enquanto a página renderizava.

### Retry no Distributor

O retry de Selenium não é um retry cego de HTTP. O Distributor tenta capabilities contra slots; se não existe slot livre ou nenhum Node atual atende, retorna `RetrySessionRequestException` e a fila reintroduz o pedido na frente, desde que ele ainda esteja válido. [16] Se o request for incompatível com todos os Nodes e `reject-unsupported-caps` estiver ativo, pode ser rejeitado imediatamente. [6]

A fila tem defaults configuráveis no código: timeout de request de 300 segundos, verificação de timeout a cada 10 segundos, retry interval de 15 ms, maximum response delay de 8 segundos e batch size de três vezes os processadores disponíveis. [13] A página de CLI documenta os mesmos conceitos e destaca que o timeout cobre o tempo sentado na fila, enquanto o retry interval governa tentativas quando todos os slots estão ocupados. [6] O valor efetivo deve ser lido do código/configuração da versão em uso, pois a documentação alerta que opções podem mudar antes da página ser atualizada.

O `LocalDistributor` usa um pool fixo para criação de sessões. O tamanho padrão no código é obtido das opções do Distributor; a documentação recomenda não aumentar threads indiscriminadamente porque context switching pode piorar a performance. [6] Isso fornece ao Waesy um limite operacional claro para workers de rendering.

## Discovery: o que existe e o que não existe

O Selenium descobre **Nodes e capacidades**, não páginas. O discovery de Node ocorre por eventos de status/heartbeat e confirmação HTTP do endpoint de status; o Distributor mantém um `GridModel` dos Nodes e slots. [3] [17] Não há no Grid uma frontier de URLs, parser de RSS, sitemap, link extractor, canonicalização de URL, deduplicação de conteúdo ou política de recrawl.

A inspeção da árvore fixada não encontrou implementação de `robots.txt`, crawler frontier, politeness por domínio, captcha solver, stealth, Cloudflare bypass ou proxy rotation no projeto. O repositório tem referências a `user-agent` como parte normal do cliente HTTP e funcionalidades de emulação de browser, mas isso não equivale a uma política de crawler nem a evasão de bot detection. A ausência foi tratada como uma limitação observada no código, não como prova de que nenhuma extensão externa possa adicionar tais funções.

No Waesy, discovery está no fluxo de RSS e da fila. `automated-harvest.ts` define feeds canônicos, lê cada feed, monta candidatos e limita processamento por `maxItems`; `crawler-batch-engine.ts` detecta feeds por extensão ou caminho e enfileira até 15 links com `upsert` por URL. [Waesy: `src/services/mining/automated-harvest.ts:49-128,134-169`; `src/services/mining/crawler-batch-engine.ts:245-287`]. O comentário de `automated-harvest.ts` menciona feeds e sitemaps, mas o trecho analisado implementa apenas a coleta pelos feeds configurados; não há evidência, nesse arquivo, de um parser de sitemap.

A recomendação é manter discovery como serviço Waesy separado. Selenium deve receber uma tarefa já descoberta, com URL canônica, tipo de entidade, origem, escopo legal, prioridade e política de acesso. Não é adequado usar a sessão do browser como mecanismo de descoberta livre de links sem limites, porque isso confunde o custo alto do rendering com a lógica de frontier.

## Politeness, rate limiting e limites legais

Selenium Grid limita concorrência por slots e pode drenar Nodes, mas essa limitação é de **sessões de automação**, não de requisições por domínio-alvo. Não existe no Grid um token bucket por hostname, leitura de `Retry-After`, parser de `robots.txt`, atraso entre páginas do mesmo site ou decisão baseada em termos de uso. [3] [4] [6]

O Waesy já possui bons blocos, porém espalhados. `scraper-utils.ts` define retries para 408, 429, 500, 502, 503 e 504; faz backoff multiplicativo de 1 s, limitado a 30 s; interpreta `Retry-After`; mantém cooldown por domínio; grava `domain_cooldowns` no Supabase; marca Cloudflare/anti-bot; e aplica pausa de 30 minutos para um 403 identificado como desafio. [Waesy: `src/lib/mining/scraper-utils.ts:32-48,74-165,167-220,252-349`]. Também existem helpers de rate limit em memória, mas a busca pelo repositório encontrou uso desses helpers apenas nas próprias definições de `src/lib/mining/scraper-utils.ts`, enquanto o `rate-limiter.ts` encontrado é usado por serviços sociais/auth; não há prova de que todo harvester passe por um token bucket de domínio.

Há uma inconsistência importante: `mechanical-extractor.ts` tem um `fetchHtmlWithStealth` próprio, com User-Agent rotativo, dois retries e sleeps de 1 s/2 s, circuito global e fallback Jina. [Waesy: `src/services/mining/mechanical-extractor.ts:122-198`]. `firecrawl-client.ts` tenta Firecrawl, depois `fetchWithRetry`, e depois Steel.dev como browser headless; quando Steel retorna somente screenshot, o código cria um HTML placeholder com comentário e URL da imagem, sem DOM extraído. [Waesy: `src/lib/mining/firecrawl-client.ts:52-209`]. Assim, o caminho “renderizado” não é automaticamente um caminho de extração textual válido.

Para acesso autorizado e dentro de limites legais, a adaptação recomendada é:

- uma única `AccessPolicy` antes de qualquer Firecrawl, fetch nativo ou sessão Selenium;
- User-Agent estável e identificável, por exemplo `WaesyBot/...` com URL de contato, em vez de rotação destinada a parecer tráfego de usuários diferentes;
- leitura e cache de `robots.txt` quando aplicável, respeito a termos, APIs oficiais e instruções do proprietário;
- token bucket distribuído por hostname, com limite separado para navegação, recursos e chamadas de API observadas;
- obediência a `Retry-After`, cooldown persistente e parada após CAPTCHA, login obrigatório, paywall ou desafio anti-bot;
- nunca resolver CAPTCHA, mascarar identidade, girar proxies ou modificar sinais do browser para contornar controle de acesso.

O WebDriver BiDi permite handlers que interceptam e alteram headers/body ou bloqueiam requisições; a documentação apresenta isso como controle para testes e debugging. [11] No Waesy, essa capacidade deve ser restrita a ambientes próprios ou a integrações explicitamente autorizadas, como bloquear imagens e fontes para reduzir custo, observar JSON público ou inserir cabeçalho de correlação. Ela não deve ser usada como bypass de proteção de terceiros.

## Browser, rendering e extração

WebDriver controla o browser de forma nativa, local ou remotamente. O Remote WebDriver separa a máquina cliente da máquina que executa browser e driver, permitindo que o Waesy mantenha a aplicação e distribua render workers. [7] [8]

A API inclui navegação, URL atual, título, DOM, `getPageSource`, JavaScript, elementos, screenshot, impressão e timeouts. [23] Isso torna Selenium útil para páginas em que o HTML inicial não contém a matéria e o conteúdo aparece depois de JavaScript, hidratação, scroll ou interação autorizada. O Grid escolhe um Node compatível por capabilities; o Waesy pode modelar `browserName`, `headless`, locale, proxy permitido, tamanho de viewport e perfil de rede como capacidades do worker.

O mecanismo correto para sincronizar uma página dinâmica é espera por condição. A documentação distingue implicit wait global de explicit wait por condição e recomenda não misturá-los, pois isso gera tempos imprevisíveis. `FluentWait` permite polling interval, timeout e exceções ignoradas. [9] Para mineração, isso é melhor que `sleep(1000)` fixo: esperar por um seletor de conteúdo, por uma quantidade mínima de texto, por uma resposta autorizada ou por ociosidade de rede, com deadline global.

WebDriver BiDi adiciona um WebSocket para eventos de rede, console e erros JavaScript. [10] A API de rede documentada inclui handlers de request/response e autenticação, com implementação acompanhada pelo issue oficial `#13993`. [11] Para Waesy, BiDi pode fornecer telemetria e, em sites autorizados, capturar a resposta JSON pública que o frontend usa, evitando parsear apenas a árvore visual. Isso não significa que Selenium persista respostas, escolha artigos ou interprete Schema.org automaticamente; o código do Waesy ainda precisa validar e extrair.

A integração de menor risco é:

1. Discovery Waesy produz um `crawl_queue` item com URL, entity type e `render_policy`.
2. Um worker obtém lease e cria uma sessão Selenium somente para itens que falharam no fetch ou que foram classificados como JS-required.
3. O worker chama `driver.get(url)`, usa explicit waits com deadline e coleta URL final, título, DOM/page source, texto relevante e eventos BiDi permitidos.
4. O HTML renderizado entra no mesmo `extractContentMechanically` e nos mesmos `validateMechanicalCompleteness`/`integrity-gate` já usados pelo Waesy.
5. O worker encerra a sessão em `finally`, publica resultado idempotente e, se o lease venceu, executa compensação para não deixar browser órfão.

Não se deve retornar apenas screenshot como se fosse HTML. Screenshot é evidência visual e pode ser anexado como artefato de auditoria; a extração textual precisa de DOM/page source, texto acessível ou uma resposta pública capturada de maneira autorizada.

## Extração, qualidade e deduplicação

O Selenium não tem equivalente ao extrator mecânico do Waesy. O projeto expõe comandos WebDriver; não implementa JSON-LD, OpenGraph, CSS selectors de portais, Readability, Jaccard editorial, Schema.org Event/JobPosting/Recipe ou score de completude.

Isso é uma força de composição, não uma lacuna a ser “corrigida” no Selenium. O Waesy já tem uma camada de extração determinística: JSON-LD, metatags/OpenGraph, seletores por domínio, densidade textual e sanitização. [Waesy: `src/services/mining/mechanical-extractor.ts:1-10,202-328,331-407`]. Tem também extratores de Recipe, Event e JobPosting via Schema.org. [Waesy: `src/services/mining/specialized-extractors.ts:50-164,167-292,350-...`]. O `integrity-gate.ts` bloqueia título genérico, conteúdo de CAPTCHA/desafio, corpo curto, corpo que repete título/lead e artigos com poucos parágrafos; calcula score, flags, Jaccard de títulos e saúde de imagem. [Waesy: `src/services/mining/integrity-gate.ts:43-109,168-302`]

A alteração deve ser apenas acrescentar `extraction_method: "selenium_rendered_dom"` ou equivalente, mantendo o mesmo contrato de resultado. Assim o browser resolve a renderização, e o parser mecânico continua sendo a fonte de verdade da extração. O texto gerado por LLM pode continuar no estágio editorial já existente, depois do gate, e não deve ser usado para “preencher” corpo ausente.

Há uma cautela no código atual de eventos: se não encontra JSON-LD, `event-harvester.ts` monta fallback com data sete dias no futuro, local `${city} - Centro` e entrada gratuita. [Waesy: `src/services/mining/event-harvester.ts:53-79`]. Isso é uma inferência de negócio, não um dado extraído. Um render worker Selenium não corrige essa semântica; o gate deveria exigir evidência de data, local e preço antes de publicar, ou registrar explicitamente os campos como desconhecidos.

## Observabilidade e controle operacional

Observabilidade é uma área em que Selenium é uma referência forte. A documentação define três pilares: traces, metrics e logs. O servidor instrumenta requests com OpenTelemetry; spans carregam atributos, eventos normais e eventos de erro; logs estruturados incluem timestamp, trace ID, span ID, handler, status HTTP, sessão e exceção. [5]

O código mostra spans com nomes de operação e atributos de request ID, capabilities, session ID, session URI e classe do logger no Distributor, fila, Session Map JDBC/Redis e Node. [13] [15] [16] [19] [20] [21] Filas e Distributor ainda expõem atributos JMX como tamanho da fila, contagem de Nodes, slots ativos e slots ociosos. [14] [16]

O Waesy já grava `scraper_audit_log` no harvest automatizado e em harvesters como PNCP e leilões, com status, duração, registros afetados e resumo. [Waesy: `src/services/mining/automated-harvest.ts:287-300`; `auction-harvester.ts:166-195`; `pncp-harvester.ts:100-132`]. Porém, o motor de lote não produz um trace de ponta a ponta por item, e `event-harvester.ts` não registra auditoria própria. O avanço recomendado é adicionar um `crawl_run_id`/`trace_id` desde o claim até a persistência, com spans ou ao menos campos uniformes:

- `queue_wait_ms`, `lease_id`, `attempt`, `retry_at`, `deadline_at`;
- `source_domain`, `source_url`, `final_url`, `entity_type`, `access_policy`;
- provider (`native-fetch`, Firecrawl ou Selenium), browser/driver/version, Node ID e render mode;
- `navigation_ms`, `wait_ms`, `dom_capture_ms`, `extraction_ms`, `persist_ms`;
- HTTP status observado, tamanho do HTML, quantidade de links, palavras, parágrafos, score e flags;
- motivo de bloqueio, paywall, CAPTCHA, timeout, cancelamento ou publicação.

As métricas mínimas são profundidade da fila, idade do item mais antigo, taxa de claim duplicado, sucesso por provider, tempo de render, sessions ativas, browser crash, timeout, bloqueios por domínio, itens extraídos e publicados. O objetivo é permitir responder “o site está indisponível?” sem atribuir toda falha a um parser.

## Storage e ciclo de vida

O Grid armazena estado de execução, não conteúdo editorial. O Session Map local é em memória e mantém `sessionId -> Session`, com cache temporário de sessões removidas para diagnóstico. [19] Há Session Map JDBC persistindo `session_ids`, URI, capabilities, stereotype e início numa tabela `sessions_map`, com spans de INSERT/SELECT/DELETE. [20] Há também Session Map Redis com chaves para URI, capabilities, stereotype e início, removidas em eventos de sessão fechada, Node removido ou reiniciado. [21]

A fila Redis do Grid é um storage transitório com TTL e resultado; não é um log de conteúdo. O Waesy deve manter Supabase Postgres como fonte canônica de artigos, tenders, events, directory listings e auditoria. A tecnologia de storage do Grid pode inspirar apenas o estado da tarefa e do worker:

- Postgres continua guardando `crawl_queue`, raw extractions, `mined_articles`, `news_articles` e `scraper_audit_log`;
- Redis opcional pode absorver claims/resultados de alta taxa, desde que exista reconciliação para Postgres;
- browser profile, cookies e artefatos de rede devem ser efêmeros, com retenção mínima e sem guardar credenciais ou dados pessoais desnecessários;
- screenshot/HTML bruto devem ir para storage de artefatos somente se houver necessidade de auditoria e política de retenção definida.

## Comparação direta com o motor Waesy

O `crawler-batch-engine.ts` busca `crawl_queue` em `status = pending`, ordena por prioridade decrescente e idade, limita o lote e depois percorre os itens em um `for` sequencial. Ele atualiza cada item para `processing`, incrementa `retry_count`, executa um harvester por `entity_type` e marca `completed` ou `failed`. [Waesy: `src/services/mining/crawler-batch-engine.ts:52-93,95-121,131-244,245-330,331-530`]

Isso tem virtudes: roteamento claro para oito entidades, processamento puro fora de request HTTP, estados explícitos, limites de lote e idempotência específica em vários harvesters. A fila não é, contudo, uma claim distribuída equivalente à fila Redis do Selenium. O `select` de pendentes e o `update` posterior não são uma única operação condicional; dois workers podem observar o mesmo item antes de qualquer um gravar `processing`. Não há lease/`locked_until`, owner do worker, `retry_at` ou dead-letter no trecho analisado. Uma falha vira `failed` imediatamente, sem distinguir “tentar mais tarde” de “conteúdo inválido”.

O `automated-harvest.ts` é forte em economia de custo: canonicaliza URL, remove parâmetros de tracking, calcula SHA-256, verifica duplicidade em `mined_raw_extractions` e `news_articles`, extrai sem IA, aplica integrity gate, grava raw, chama curadoria e registra `tokens_saved`. [Waesy: `src/services/mining/automated-harvest.ts:58-77,134-205,212-300`]. Ele também é sequencial por candidato e não compartilha o mesmo contrato de retry/lease do `crawler-batch-engine`.

O Waesy já tem mais política de acesso que Selenium: `fetchWithRetry`, cooldown persistente, `Retry-After`, detecção de 403/429 e circuit breaker. A fragilidade é a fragmentação: fetch mecânico, Firecrawl, Steel e Jina possuem caminhos diferentes; browser screenshot não entrega DOM; a rotação de User-Agent e cabeçalhos “stealth” podem entrar em tensão com transparência e limites legais. Selenium deve ser inserido atrás de uma política única, não como mais um fallback que contorna a decisão de bloqueio.

## Adaptações recomendadas, em ordem

### P0 — Corrigir semântica da fila antes de adicionar browser

1. Transformar a retirada em claim atômica. Uma função SQL deve atualizar somente `pending` cujo `retry_at <= now()` e cujo lease está livre, gravando `status = processing`, `lease_id`, `worker_id`, `lease_until`, `attempt` e retornando a linha. Isso evita dois workers para a mesma URL.
2. Introduzir deadline e `retry_at` separados. Falta de slot, timeout transitório, 429 e erro de rede retornam à fila com backoff; conteúdo inválido, CAPTCHA, paywall e URL não autorizada vão para estado terminal ou revisão, não para retry infinito.
3. Reaproveitar o padrão de completion vencedor do Redis Queue: resultado terminal tem versão/lease; um worker atrasado que perde a corrida deve descartar ou compensar o browser aberto.
4. Adicionar `max_attempts`, `last_error_type`, `next_attempt_at`, `dead_letter_reason` e heartbeat/renovação do lease. Incrementar `retry_count` não deve ser a única informação de retry.

### P0 — Unificar AccessPolicy

1. Toda saída (`fetch`, Firecrawl, Jina, Steel, Selenium) recebe a mesma decisão de domínio, User-Agent, robots/terms, cooldown e limite.
2. Não iniciar browser para domínio em cooldown ou em desafio; registrar o bloqueio e agendar nova avaliação conforme política.
3. Remover a ideia de “bypass” do caminho padrão. Fallback headless deve significar renderização autorizada, não contorno de CAPTCHA/Cloudflare.

### P1 — Criar um Render Worker compatível com capabilities

O worker pode ser uma pequena implementação de Node/worker com Selenium Remote WebDriver. Ele deve anunciar slots por `browserName`, `headless`, locale, capacidade de rede e perfil de acesso. A tarefa deve solicitar `render_policy = never | on_fetch_failure | required`, além de tempo máximo, seletor/condição permitida e limite de bytes.

O worker deve usar explicit waits e page load strategy, capturar DOM/page source e URL final, opcionalmente habilitar BiDi para telemetria ou JSON público autorizado, e sempre executar `quit()` em `finally`. O resultado deve ser um HTML/texto bruto versionado para o parser existente, não um artigo já curado.

### P1 — Preservar o pipeline mecânico e tornar rendering observável

Adicionar `selenium_rendered_dom` ao método de extração; não duplicar JSON-LD/OpenGraph/Schema.org no worker. Passar o conteúdo renderizado pelo mesmo integrity gate, manter `quality_flags`, e impedir que fallback de evento invente data, local ou gratuidade. Registrar browser, node, duração, condição esperada, URL final, status e tamanho do DOM.

### P1 — Telemetria de item

Criar uma linha de auditoria por tentativa, além do resumo por batch, ou padronizar spans com `crawl_run_id`. Incluir queue wait, render, parse, curadoria, persistência, provider, domínio e motivo de erro. Adicionar gauges de idade da fila e sessões de render ativas. O padrão do Selenium de trace/span/event e health readiness é uma boa referência, mas não exige converter todo o Supabase em JMX.

### P2 — Escalar somente depois da medição

Se Supabase e poucos workers forem suficientes, manter Postgres e usar claims SQL. Se a taxa justificar, Redis pode fornecer fila transitória e notificações, mantendo Postgres como fonte canônica. Um pool de browser deve ser dimensionado por slots e memória, não por “número de URLs”; a documentação do Grid alerta que threads em excesso podem piorar desempenho. [6]

## Forças e limites do Selenium para este uso

**Forças:** protocolo WebDriver padronizado e cross-browser; execução local/remota; Grid distribuído por Router/Queue/Distributor/Node/Session Map; matching por capabilities; fila com deadline, retry por falta de capacidade e completion idempotente; Redis/JDBC para estado de sessão; heartbeat, health checks e drain; tracing OpenTelemetry, logs estruturados, JMX e APIs de estado; BiDi para eventos de rede, console e JavaScript; waits explícitos para páginas dinâmicas. [3] [5] [7] [8] [9] [10] [15] [16] [20] [21]

**Limites:** não é crawler; não descobre URLs; não lê RSS/sitemap/robots; não impõe politeness por domínio; não faz retry HTTP com `Retry-After`; não parseia conteúdo nem calcula qualidade/deduplicação; não persiste artigos; browser é caro e pode deixar recursos órfãos se o ciclo de vida não for tratado; network handlers BiDi são ferramentas de automação/teste, não um sistema de evasão. A fila Selenium gerencia criação de sessões, e não recrawls de milhões de páginas.

**Decisão recomendada:** incorporar Selenium apenas como pool de rendering controlado, com a fila/telemetria/política de acesso do Waesy corrigidas primeiro. Copiar o padrão de claim, deadline, requeue, health e observabilidade do Grid; não copiar a suposição de que capacidade de browser equivale a capacidade de crawling. Manter discovery, extraction, integrity, editorial curation e storage no Waesy.

## Sources

[1]: https://github.com/SeleniumHQ/selenium "Repositório oficial SeleniumHQ/selenium e README"
[2]: https://github.com/SeleniumHQ/selenium/tree/e431cc8e5622eca7ec3b9666d1eaa238e83e725b "Árvore do commit analisado e revisão imutável"
[3]: https://www.selenium.dev/documentation/grid/architecture/ "Arquitetura oficial do Selenium Grid"
[4]: https://www.selenium.dev/documentation/grid/components/ "Componentes oficiais do Selenium Grid"
[5]: https://www.selenium.dev/documentation/grid/advanced_features/observability/ "Observabilidade oficial do Selenium Grid"
[6]: https://www.selenium.dev/documentation/grid/configuration/cli_options/ "Opções CLI oficiais do Selenium Grid"
[7]: https://www.selenium.dev/documentation/webdriver/ "Documentação oficial do WebDriver"
[8]: https://www.selenium.dev/documentation/webdriver/drivers/remote_webdriver/ "Remote WebDriver oficial"
[9]: https://www.selenium.dev/documentation/webdriver/waits/ "Estratégias oficiais de espera e polling"
[10]: https://www.selenium.dev/documentation/webdriver/bidi/ "WebDriver BiDi oficial"
[11]: https://www.selenium.dev/documentation/webdriver/bidi/network/ "Recursos de rede oficiais do WebDriver BiDi"
[12]: https://github.com/SeleniumHQ/selenium/blob/e431cc8e5622eca7ec3b9666d1eaa238e83e725b/java/src/org/openqa/selenium/grid/package-info.java "Descrição de pacote do Grid no commit analisado"
[13]: https://github.com/SeleniumHQ/selenium/blob/e431cc8e5622eca7ec3b9666d1eaa238e83e725b/java/src/org/openqa/selenium/grid/sessionqueue/NewSessionQueue.java "Contrato da New Session Queue no commit analisado"
[14]: https://github.com/SeleniumHQ/selenium/blob/e431cc8e5622eca7ec3b9666d1eaa238e83e725b/java/src/org/openqa/selenium/grid/sessionqueue/local/LocalNewSessionQueue.java "Fila local do Grid no commit analisado"
[15]: https://github.com/SeleniumHQ/selenium/blob/e431cc8e5622eca7ec3b9666d1eaa238e83e725b/java/src/org/openqa/selenium/grid/sessionqueue/redis/RedisBackedNewSessionQueue.java "Fila Redis distribuída do Grid no commit analisado"
[16]: https://github.com/SeleniumHQ/selenium/blob/e431cc8e5622eca7ec3b9666d1eaa238e83e725b/java/src/org/openqa/selenium/grid/distributor/local/LocalDistributor.java "Distributor local do Grid no commit analisado"
[17]: https://github.com/SeleniumHQ/selenium/blob/e431cc8e5622eca7ec3b9666d1eaa238e83e725b/java/src/org/openqa/selenium/grid/distributor/local/LocalNodeRegistry.java "Registro, heartbeat e health checks de Nodes"
[18]: https://github.com/SeleniumHQ/selenium/blob/e431cc8e5622eca7ec3b9666d1eaa238e83e725b/java/src/org/openqa/selenium/grid/router/Router.java "Router do Grid no commit analisado"
[19]: https://github.com/SeleniumHQ/selenium/blob/e431cc8e5622eca7ec3b9666d1eaa238e83e725b/java/src/org/openqa/selenium/grid/sessionmap/local/LocalSessionMap.java "Session Map local do Grid"
[20]: https://github.com/SeleniumHQ/selenium/blob/e431cc8e5622eca7ec3b9666d1eaa238e83e725b/java/src/org/openqa/selenium/grid/sessionmap/jdbc/JdbcBackedSessionMap.java "Session Map JDBC do Grid"
[21]: https://github.com/SeleniumHQ/selenium/blob/e431cc8e5622eca7ec3b9666d1eaa238e83e725b/java/src/org/openqa/selenium/grid/sessionmap/redis/RedisBackedSessionMap.java "Session Map Redis do Grid"
[22]: https://github.com/SeleniumHQ/selenium/blob/e431cc8e5622eca7ec3b9666d1eaa238e83e725b/java/src/org/openqa/selenium/grid/node/Node.java "Node e rotas WebDriver do Grid"
[23]: https://github.com/SeleniumHQ/selenium/blob/e431cc8e5622eca7ec3b9666d1eaa238e83e725b/java/src/org/openqa/selenium/remote/DriverCommand.java "Comandos WebDriver expostos pelo código"
