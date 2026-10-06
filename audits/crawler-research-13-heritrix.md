# Auditoria 13 — Heritrix 3 para evolução dos mineradores Waesy

## Constatação arquitetural principal

O Heritrix 3 não é apenas um cliente HTTP com parsers. Ele é um **crawler de arquivamento**, orientado a jobs configuráveis por beans Spring, com uma *frontier* durável que coordena descoberta, deduplicação de URIs, filas por host/autoridade, politeness, pré-condições, fetch, extração de links, escrita de WARC, relatórios e recuperação. O repositório oficial o descreve como um crawler extensível, de escala web e qualidade arquivística; também recomenda obedecer `robots.txt`, identificar o crawler e informar um contato operacional no `User-Agent`.[1]

Esta auditoria foi feita sobre o repositório oficial clonado em `/home/ubuntu/jobs/c9b21b1c6646_a12/heritrix3`, commit `be6b49fa6c35c4f546442ab4ffd2e2eab86c599d`, e sobre as páginas oficiais de documentação vinculadas pelo projeto. A comparação usa o inventário `/home/ubuntu/waesy-audit/SYSTEM_INVENTORY.md` e os arquivos em `/home/ubuntu/waesy-audit/src/services/mining`. Quando uma propriedade aparece na documentação, mas não no perfil padrão verificado, ela é tratada como **capacidade configurável**, não como comportamento automaticamente ativo.

## 1. Arquitetura interna do Heritrix

### Job, configuração e ciclo de vida

Um crawl é um *job* Spring. O arquivo principal costuma ser `crawler-beans.cxml` ou `crawler-beans.groovy`; o job reúne beans para metadados, sementes, escopo, *frontier*, cadeias de processamento, limites, storage, cookies, logs, relatórios e controle.[2] O perfil oficial verificado monta explicitamente `FetchChain` e `DispositionChain`, em vez de esconder o fluxo em uma função monolítica.[3]

O `CrawlController` unifica o contexto do job e executa threads de trabalho (*toe threads*). A documentação recomenda dimensionar `maxToeThreads` aproximadamente em duas vezes o número de hosts para crawls pequenos; mais de 150–200 threads raramente compensa sem recursos excepcionais.[2] Isso é diferente de simplesmente aumentar `Promise.all`: o limite de concorrência está ligado ao modelo de filas e à politeness da frontier.

O ciclo nominal é:

1. sementes e eventuais ações de runtime entram no sistema;
2. a preparação da frontier canonicaliza a URI, aplica escopo e regras de fila/precedência;
3. a URI passa pela `FetchChain`, que verifica pré-condições, faz DNS/HTTP e roda extratores;
4. candidatos descobertos são enviados à `CandidateChain`, onde regras de decisão e deduplicação determinam se serão agendados;
5. a `DispositionChain` grava o resultado, atualiza estatísticas, calcula a próxima politeness e devolve a fila ao estado apropriado;
6. a frontier termina quando não há trabalho elegível ou quando um limite/operador pede encerramento.

No perfil oficial, a ordem da `FetchChain` é `Preselector`, `PreconditionEnforcer`, DNS, `FetchHTTP`, `BotBlockDetector`, extrator de headers HTTP, extrator de `robots.txt`, sitemap, HTML, CSS, JavaScript e SWF. O `BrowserProcessor` aparece como opção comentada depois desses extratores, e não como parte obrigatória do caminho padrão.[3]

### Frontier e persistência de estado

A implementação padrão é `BdbFrontier`, uma frontier baseada em vários bancos Berkeley DB JE para manter hosts conhecidos, filas e URIs pendentes.[4] O seu contrato não é somente “uma fila de URLs”: ele mantém o estado de cada `CrawlURI`, a relação com a URI de origem, a contagem de tentativas, as filas por *class key*, os estados de politeness e o filtro de URIs já incluídas.

A `WorkQueueFrontier` mantém estruturas distintas para filas prontas, em processamento, adormecidas, futuras, inativas e aposentadas. A documentação define os estados: `ready` pode emitir agora; `in-process` já emitiu uma URI; `snoozed` espera politeness ou retry; `active` é a soma de filas em processamento, prontas e adormecidas; `retired` foi desativada por quota ou outro motivo; `exhausted` está vazia.[5] Esse vocabulário é importante para Waesy: `pending`, `processing`, `completed` e `failed` não expressam, sozinhos, espera por host, retry futuro, quota, precondição ou estado de recuperação.

A fila usa um `UriUniqFilter` para recordar URIs já incluídas/em processamento. A preparação separa canonicalização, escopo, atribuição à fila, custo e precedência. A documentação lista políticas por host, IP, autoridade ordenada em SURT, domínio de atribuição e buckets; portanto a escolha da chave de fila é uma decisão de governança de carga, não apenas uma otimização.[4] O glossário ressalta que o conceito de host é o hostname da URI, não o IP resolvido; dois domínios no mesmo IP não são automaticamente uma única fila de politeness.[5]

A frontier também tem orçamento de fila: `balanceReplenishAmount`, `queueTotalBudget` e `errorPenaltyAmount` podem limitar quanto uma fila consome e penalizar falhas. A documentação do bean informa que `queueTotalBudget` pode aposentar uma fila e que filas em *long snooze* podem ser descarregadas da memória para o disco.[4] Isso é uma defesa contra um domínio muito expansivo ou muito errático monopolizar o crawler.

### Descoberta e escopo

O escopo é uma sequência de `DecideRule`. Cada regra retorna `ACCEPT`, `REJECT` ou `PASS`; a decisão final é obtida pela sequência ordenada. O manual recomenda começar com as regras padrão e alterá-las individualmente, porque reescrever toda a sequência pode impedir o progresso mínimo esperado do crawler.[2]

O Heritrix traz decisões por domínio, host, prefixo SURT, caminho, tipo de conteúdo, tamanho, status de fetch, profundidade e caminho de hops. Há regras para aceitar sementes, aceitar pré-requisitos, rejeitar caminhos patológicos, limitar hops e aplicar scripts. O `FrontierPreparer` mantém a política de canonicalização e atribui a URI à fila antes do agendamento.[4]

Cada descoberta carrega um *discovery path*. O glossário registra `L` para link, `E` para embed necessário, `X` para embed especulativo, `R` para redirect, `P` para pré-requisito, `I` para link inferido, `M` para manifesto e `S` para formulário sintetizado.[5] Essa informação permite limitar profundidade de navegação e separar custo de conteúdo principal de subrecursos. O Waesy hoje descobre feeds, sitemaps e URLs já fornecidas, mas não mantém equivalente explícito de hops/via/prerequisite em cada item de `crawl_queue`.

No caminho de pós-processamento, `CandidatesProcessor` percorre candidatos e os encaminha à cadeia de candidatos; somente os aceitos chegam à frontier. Ele também trata pré-requisitos, outlinks e promoção especial de redirects de sementes.[6] A consequência prática é que uma URI descoberta não é imediatamente “processada”: ela passa por um ponto único de escopo, canonicalização e deduplicação antes de ganhar trabalho na frontier.

### Pré-condições

O `PreconditionEnforcer` existe para garantir DNS, `robots.txt` e outras condições antes do fetch.[4] No perfil, ele vem antes dos fetchers. Isso evita que cada harvester tenha de implementar sua própria política de robots/DNS ou repetir a mesma verificação por URL.

A política de robots configurável tem `obey`/`classic`, `robotsTxtOnly` e `ignore`. `obey` respeita diretivas de `robots.txt` e `nofollow` de meta tags; `robotsTxtOnly` ignora as meta tags; `ignore` ignora ambos. O manual afirma suporte aos curingas de caminho de RFC 9309 e explica que a meta tag `nofollow` impede o extrator HTML de seguir links e embeds. O atributo `rel=nofollow` é uma configuração separada do extrator HTML.[2] Para o uso público do Waesy, o padrão recomendado é obedecer, documentar exceções legais e não transformar `ignore` em fallback automático.

## 2. Filas, politeness e retries

### Politeness por host

A regra estrutural do Heritrix é que, em determinado instante, somente uma URI de um host é processada. Depois de uma URI, a fila pode ser colocada em *snooze* antes de liberar a próxima.[2] O atraso tem três componentes configuráveis:

- `delayFactor`: multiplica o tempo observado do último fetch daquele host;
- `minDelayMs`: piso de espera;
- `maxDelayMs`: teto da espera calculada.

O perfil documenta também `respectCrawlDelayUpToSeconds`, que permite respeitar o `Crawl-delay` até um limite, e `maxPerHostBandwidthUsageKbSec`, que limita a banda por host.[2][3] Uma configuração “muito polida” do próprio template aumenta o fator, o piso e o teto, e respeita `Crawl-delay` até uma hora; isso demonstra que a policy pode ser associada por *sheet* a uma URI/domínio, em vez de ser apenas um número global.[3]

O efeito não é somente limitar requests por segundo. A duração real do fetch altera o próximo instante elegível; uma resposta lenta alonga o intervalo. O atraso de retry também faz a fila dormir, sem bloquear todo o crawler: outros hosts continuam elegíveis. Essa combinação é um padrão útil para Waesy: limitar por autoridade/domínio, registrar o motivo do bloqueio e permitir que trabalho de outras fontes avance.

### Retry: o que está comprovado

A documentação da frontier lista `maxRetries` e `retryDelaySeconds`; o `BdbFrontier` documenta como valores padrão de referência `maxRetries = 30` e `retryDelaySeconds = 900` segundos.[4] O retry é propriedade da URI dentro da frontier, não um `catch` perdido no harvester.

No código atual de `AbstractFrontier`, `needsReenqueuing` só retorna `true` automaticamente para `S_DEFERRED`, `S_CONNECT_FAILED`, `S_CONNECT_LOST` e `S_DOMAIN_UNRESOLVABLE`. Para HTTP 401 ele só reencaminha quando há credencial RFC 2617 carregada. O código verifica `overMaxRetries` antes disso.[7] O comentário do próprio código registra que timeout ainda exige decisão de política; portanto não é correto dizer que Heritrix reintenta automaticamente qualquer timeout, HTTP 429, 5xx ou erro de conteúdo.

Isso produz uma distinção útil para Waesy:

- **falha transitória de transporte** pode ser reencaminhada com atraso e limite;
- **bloqueio, robots, 401 sem credencial, 403, 429, captcha ou conteúdo vazio** deve ter política explícita e, em muitos casos, ser encerrado ou colocado em revisão;
- **falha de extração** não deve gerar indefinidamente novo download se o mesmo corpo já foi obtido.

O status `S_TOO_MANY_RETRIES = -8` representa o encerramento após retries, e os status separados para robots, URI não buscável, pré-requisito, quota, runtime e bloqueio de usuário tornam possível explicar por que uma URI não foi processada.[8] O Heritrix, portanto, tem melhor semântica de estado que um único `failed`.

### Comparação com o Waesy

O `crawler-batch-engine.ts` seleciona itens `pending` da tabela `crawl_queue`, ordena por `priority` e `created_at`, limita o lote, marca cada registro como `processing` e incrementa `retry_count` antes de roteá-lo por `entity_type`.[W1] Ele processa o lote em um `for` sequencial, com cada harvester especializado atualizando o status do item. Isso é uma boa base de idempotência operacional e roteamento, mas ainda é uma fila de aplicação, não uma frontier por host: não há no código examinado estado equivalente a `ready`, `snoozed`, `in-process`, `retired`, `future` e `exhausted`, nem uma chave de politeness derivada de hostname.

No `automated-harvest.ts`, o fluxo lê RSS, produz candidatos, limita `maxItems`, consulta Supabase para dedupe, baixa e extrai, grava a extração, chama curadoria e publica.[W2] O caminho é efetivo para conteúdo conhecido e RSS, mas não é um crawler de links gerais. O `hashCanonicalUrl` remove parâmetros de rastreamento e usa SHA-256; isso é valioso para idempotência, mas não substitui o `UriUniqFilter` com estado de descoberta, via, hops, tentativa e host.

Há pontos fortes no tratamento de limites: `pncp-extractor.ts` possui cache em memória de cinco minutos, timeout de 15 segundos e fallback para cache; consultas de itens têm timeout de oito segundos.[W3] `places-harvester.ts` e `datajud-harvester.ts` registram respostas 429 e ativam cooldown; DataJud limita três tentativas de chave e usa atraso exponencial com jitter antes de cooldown.[W4] Isso é uma política específica de API, não uma camada transversal para toda a `crawl_queue`.

A recomendação é não substituir esses harvesters de domínio por HTML crawling genérico. Em vez disso, adicionar uma pequena frontier transversal ao redor deles: host/API key, `next_eligible_at`, `attempt`, `failure_class`, `retry_after`, `robots_state`, `content_fingerprint`, `trace_id`, `source_policy` e `discovery_path`. O roteamento industrial de Waesy pode permanecer especializado, enquanto a disciplina de fila e telemetria se torna comum.

## 3. Fetch, extração e browser/rendering

### Fetch e extratores nativos

O perfil oficial separa fetch de extração. Depois de HTTP, o Heritrix detecta respostas de serviços de bloqueio, extrai URIs de headers, `robots.txt`, sitemaps, HTML, CSS, JavaScript e SWF.[3] O `ExtractorHTML` é um extrator de links e atributos de URI; seu código cobre, entre outros, `href`, `cite`, `action`, `src`, `srcset`, `data-src`, `data-original`, `codebase`, `classid`, `data`, `archive` e `code`.[9] A finalidade é construir a próxima fronteira de URIs, não produzir um objeto jornalístico com título, lead, autor, parágrafos e imagem.

O `BotBlockDetector` detecta respostas de serviços de bloqueio e adiciona a anotação `botblock:service`.[4] Isso é observabilidade e classificação; não é um resolvedor de desafio. Não há base para afirmar que o Heritrix contorna Cloudflare, Akamai, CAPTCHA, fingerprinting ou políticas de acesso.

A extração de conteúdo rico do Waesy é mais específica. O `mechanical-extractor.ts` declara camadas para JSON-LD, OpenGraph/meta tags, seletores CSS e densidade textual, além de produzir `title`, `lead`, `bodyText`, imagens, contagens e tipos de entidade.[W5] A extração JSON-LD suporta `@graph`, `NewsArticle`, `Article`, `BlogPosting` e `Event`, e rejeita como corpo completo candidatos com menos de 120 palavras ou três parágrafos.[W5] Essa é uma capacidade de produto que Heritrix não entrega por padrão e deve continuar em um processador/adaptador Waesy posterior ao fetch.

### BrowserProcessor

O Heritrix possui `BrowserProcessor`, mas ele é opcional. A documentação descreve abertura em navegador local via WebDriver BiDi, execução de `Behavior` e registro de subrecursos via proxy HTTP; ele deve ser usado com `FetchHTTP2` e normalmente fica depois dos extratores de links.[4] Os behaviors oficiais incluem extração de links JavaScript e rolagem até o fim da página.

O código verificado cria tabs, intercepta requests HTTP/HTTPS, navega até estado `complete`, espera até 30 segundos pela ociosidade de rede e executa behaviors. A configuração expõe concorrência máxima, executável e opções do driver.[10] Se o navegador morrer, o processor reinicia a instância uma vez e repete a visita; se o behavior falhar, registra o erro. O relatório do processor contabiliza páginas visitadas, subrecursos e reinícios.[10]

O limite é importante: isso é **renderização funcional e captura de subrecursos**, não “stealth browsing”. O código não demonstra rotação de identidade, evasão de CAPTCHA, falsificação de sinais de automação, bypass de login ou uso de proxies para contornar bloqueios. Para Waesy, BrowserProcessor deve ser um estágio caro, opt-in e acionado somente quando a fonte permitir conteúdo público renderizado; não deve ser um retry automático para vencer um bloqueio.

O Waesy já possui `react-mining-adapter.ts`, que chama um cliente de scraping, valida se o resultado é aproveitável e retorna decisão `complete` ou `retry` após iterações do loop.[W6] Essa peça pode virar um adaptador de “renderização sob demanda”, mas hoje não é equivalente ao BrowserProcessor: o código examinado não mostra uma frontier de subrecursos, isolamento por host, limite de abas, espera de rede uniforme, contador de reinícios ou associação do resultado renderizado ao mesmo `CrawlURI`.

### O que adaptar para extração

A composição mais segura é:

`Frontier/Fetch -> corpo bruto e metadados -> detector de bloqueio -> extractor mecânico Waesy -> validação de completude -> persistência de evidência -> curadoria/publicação`.

A extração de links do Heritrix pode alimentar descoberta, enquanto os extratores Waesy continuam produzindo dados de negócio. Para páginas que requerem JavaScript, use BrowserProcessor ou o adaptador existente somente em segunda tentativa, depois de um classificador que diferencie “HTML vazio porque precisa de JS” de “bloqueio/captcha/robots”. Guardar o HTML bruto e os headers antes da curadoria permite reprocessar parser sem baixar novamente.

## 4. Storage, deduplicação e recuperação

### WARC e evidência de captura

O `WARCWriterChainProcessor` grava registros construídos por uma cadeia de `WARCRecordBuilder`; o código define offset e nome do arquivo e chama `writer.writeRecord`. O perfil permite builders de resposta DNS, HTTP, WHOIS, FTP, revisit, request HTTP e metadata.[3][11] O perfil também expõe rotação por tamanho, compressão, diretório, início de novos arquivos no checkpoint e `skipIdenticalDigests`, mas várias dessas propriedades aparecem comentadas. Portanto, devem ser habilitadas e testadas para o job desejado; não se deve assumir que toda opção está ativa no default.

O modelo WARC é uma boa referência para Waesy separar:

- **evidência bruta**: corpo, headers, status, timestamp, URL final, redirects, digest e origem;
- **extração derivada**: título, entidade, campos estruturados e qualidade;
- **produto editorial**: artigo, anúncio, evento ou listagem publicado.

Hoje o Waesy grava `mined_raw_extractions` e depois `news_articles`, o que já separa bruto e produto melhor que uma única tabela.[W2] Falta, no código revisado, um registro de captura com headers/status/redirects, digest do corpo, tentativa e policy, ou um arquivo/objeto imutável equivalente a WARC. A adaptação não precisa adotar WARC inteiro no primeiro passo; pode criar `crawl_captures` e armazenar o corpo em object storage, mantendo no Postgres apenas metadados e ponteiros. Se a exigência for preservação auditável, WARC é a opção tecnicamente mais próxima do padrão do Heritrix.

### Deduplicação

Há duas deduplicações distintas no Heritrix: URI já incluída no `UriUniqFilter`, e deduplicação/revisita por conteúdo na camada WARC quando configurada. O bean `RevisitRecordBuilder` existe para registrar revisitas, mas a presença do builder na capacidade não significa que a política esteja ativada em todo perfil.[4][3]

O Waesy tem hash SHA-256 de URL canônica para idempotência, consulta por `source_url`/hash e `upsert` em fontes estruturadas como PNCP.[W2][W3] Também tem clusterização semântica por Jaccard em títulos, janela de 48 horas e limiares 0,55/0,80.[W7] Esse dedupe de produto não é equivalente à dedupe de captura: dois URLs podem trazer a mesma resposta, e o mesmo URL pode mudar. A arquitetura recomendada mantém as três chaves:

1. `canonical_url_hash` para não agendar o mesmo alvo lógico;
2. `content_digest` para reconhecer o mesmo corpo em URLs/visitas diferentes;
3. `story_cluster_id` para agrupar coberturas editoriais relacionadas.

### Checkpoints, recovery e disco

O glossário oficial define checkpoint como uma representação do estado em storage estável suficiente para recuperar e continuar o crawl; o trabalho posterior ao checkpoint pode ser perdido, mas o anterior não.[5] O perfil inclui `CheckpointService`, diretório de checkpoints e `ActionDirectory` para incluir sementes, agendar ou recuperar URIs no meio do crawl.[3][4]

O `DiskSpaceMonitor` verifica espaço durante snapshots de estatísticas e pede pausa quando um caminho cai abaixo do limiar configurado.[12] A operação também tem recovery logs para reconstituir URIs pendentes. Esses mecanismos são uma referência direta para Waesy: uma execução `processing` não pode ficar órfã depois de crash, timeout de função edge ou reinício do worker. O item precisa voltar a `ready`/`retryable` com lease expirada, não permanecer indefinidamente em `processing`.

O Postgres/Supabase documentado no inventário Waesy é adequado para estado transacional e auditoria, mas não substitui sozinho armazenamento de corpo grande, journal de frontier e checkpoint de worker. Recomenda-se manter filas e leases no banco, corpos em object storage e checkpoints pequenos contendo offsets/IDs de lote e estado de retry.

## 5. Observabilidade e operação

O REST API oficial expõe `GET /engine` com versão, heap e jobs, e `GET /engine/job/{jobname}` com estado do controller, status de saída, fila, totais de URI, tamanhos, taxa de documentos/KB, threads, profundidade média/máxima, frontier, logs, alerts, reports e heap.[13] O endpoint de job é um contrato operacional mais rico que retornar apenas `succeeded`/`failed`.

O `StatisticsTracker` atualiza snapshots e logs em intervalo configurável, com 20 segundos como padrão no código verificado. Ele mantém diretório de reports e acompanha estatísticas de sementes e fontes, com observação de que esses rastreamentos podem ser caros em crawls grandes.[14] O projeto também possui relatórios de frontier, hosts, MIME types, response codes, processors, seeds, source tags e toe threads; o perfil registra `CrawlSummaryReport` e demais reports via contexto do job.

O manual orienta ativar `FINEST` para `DecideRuleSequence` quando se precisa explicar por que uma URI foi aceita ou rejeitada.[2] Esse padrão é especialmente útil para o Waesy, onde uma URL pode ser descartada por domínio, entidade, duplicidade, validação ou falta de completude. Um evento de decisão deve conter regra, valor comparado, resultado e versão da policy, não somente um `console.warn`.

O Waesy já grava `scraper_audit_log` com itens encontrados, extraídos, publicados, duração e estimativa de tokens em `automated-harvest.ts`.[W2] Harvesters especializados também registram sucesso/falha, e vários usam `console.warn`/`console.error`.[W4] O que falta é uma visão transversal de:

- profundidade e tamanho da fila por estado;
- idade do item mais antigo e tempo em `processing`;
- requests por domínio e atraso efetivamente aplicado;
- distribuição de status HTTP e falhas de transporte;
- retries por classe, `Retry-After` e cooldown;
- bytes baixados, bytes persistidos, digest duplicado e conteúdo novo;
- bloqueios detectados e decisões de não prosseguir;
- latência e taxa de sucesso por extractor;
- custo de browser, páginas e subrecursos;
- correlação entre `crawl_queue`, captura, extração e publicação.

Esses campos devem ser emitidos em logs estruturados e tabelas de métricas. `scraper_audit_log` pode continuar como auditoria de negócio, mas não deve ser o único lugar para métricas de alta cardinalidade por request.

A operação do próprio Heritrix merece ser copiada: WUI/REST deve ser privado, por padrão em loopback, com HTTPS e credencial forte. A documentação alerta que a UI pode alterar o crawl, ler/escrever arquivos locais e executar scripts fornecidos pelo operador.[15] Para um worker Waesy, isso significa não expor funções de controle diretamente na internet, separar credenciais de leitura/escrita e dar permissões mínimas ao processo.

## 6. Anti-bot dentro de limites legais

O padrão correto não é “vencer o anti-bot”. É **detectar, respeitar, registrar e parar ou pedir autorização**. O Heritrix oferece três peças compatíveis com esse princípio:

1. política explícita de robots e nofollow;
2. identificação por `User-Agent` e URL de contato;
3. `BotBlockDetector`, que apenas anota a resposta como bloqueio.

O README oficial pede que operadores considerem a carga no site e identifiquem o crawler com contato. A documentação também diz que politeness deve ser estrita salvo permissão expressa para crawling agressivo.[1][5] Portanto, um adaptador Waesy deve:

- enviar um `User-Agent` estável e honesto, com contato e página de policy;
- respeitar `robots.txt`, `Retry-After`, `Crawl-delay` quando aplicável e termos/leis da fonte;
- limitar por hostname/API, não apenas por processo global;
- classificar páginas de captcha, challenge, login e bloqueio como `blocked_by_source`, sem loop de retry;
- preservar status e corpo de bloqueio para auditoria, sem publicar seu conteúdo;
- usar browser apenas para conteúdo público permitido e somente quando o fetch simples indicar necessidade legítima de renderização;
- nunca adicionar rotação de proxies, spoofing de fingerprint, bypass de CAPTCHA, credenciais não autorizadas ou técnicas de evasão como “fallback”.

O código Waesy atual contém cabeçalhos com aparência de navegador, user agents aleatórios e um fallback por `r.jina.ai` descrito como conversão de URLs com anti-bot em conteúdo limpo.[W5] Isso deve ser tratado como risco de policy: um proxy de leitura de terceiros pode transferir a requisição a outra infraestrutura, alterar o contexto jurídico e dificultar a atribuição do crawler. Se for mantido, precisa de allowlist explícita de fontes, base legal/contratual, aviso de processamento terceirizado, limite de conteúdo e classificação separada de `third_party_reader`, nunca como bypass automático de bloqueio.

Também há um risco grave fora do escopo técnico do Heritrix: `datajud-harvester.ts` contém uma chave codificada como fallback no fonte, além de rotação de chaves.[W4] Essa prática não deve ser copiada. Chaves devem estar em secret manager, ser revogáveis e não aparecer em relatório público ou cliente. A auditoria Heritrix aponta para a necessidade de controle operacional, mas não autoriza reutilizar credenciais.

## 7. Adaptações priorizadas para os mineradores Waesy

### P0 — Segurança, correção e governança

1. **Corrigir segredo exposto**: remover a chave literal de DataJud do fonte, rotacionar a credencial e usar apenas secret manager/env seguro. Registrar a rotação separadamente.
2. **Definir policy de acesso por fonte**: `robots_policy`, `allowed_methods`, `contact_url`, `max_rate`, `respect_retry_after`, `browser_allowed`, `third_party_reader_allowed` e `legal_basis`.
3. **Adicionar classificação de bloqueio**: `blocked_by_robots`, `blocked_by_source`, `captcha_detected`, `auth_required`, `rate_limited`, `transport_error`, `parse_error` e `policy_rejected`. Não usar retry genérico para todos.
4. **Remover a ideia de stealth como requisito**: trocar nomenclatura e documentação de “Stealth HTTP Fetcher” por “HTTP fetch identificado e compatível com policy”; headers comuns não equivalem a autorização.

### P1 — Frontier mínima persistente

5. **Criar estados de fila inspirados no Heritrix**: `ready`, `leased`, `snoozed`, `retry_wait`, `blocked`, `done`, `failed_terminal`, `retired`. Manter `processing` apenas como lease com `lease_expires_at`.
6. **Adicionar chave de politeness**: `authority_key` por hostname/porta e, quando a fonte exigir, uma chave manual compartilhada por hosts correlatos. Ter `next_eligible_at`, `last_fetch_duration_ms`, `delay_factor`, `min_delay_ms`, `max_delay_ms`, `crawl_delay_ms` e `bytes_window`.
7. **Fazer claim atômico**: seleção por prioridade/idade somente de itens `ready` cujo `next_eligible_at <= now`, com `FOR UPDATE SKIP LOCKED` ou RPC transacional. O `update` separado do batch engine pode permitir que dois workers processem a mesma linha.
8. **Persistir retries como estado**: `attempt`, `max_attempts`, `retry_at`, `failure_class`, `http_status`, `retry_after_ms`, `last_error` e `next_action`. Aplicar backoff limitado com jitter apenas a falhas transitórias; 401/403/429/challenge devem obedecer a regras específicas da fonte.
9. **Adicionar quota por item/domínio**: bytes, documentos, tempo, chamadas de API e custo de browser. Aposentar ou pausar a fonte quando exceder o orçamento, registrando a decisão.

### P1 — Captura e evidência

10. **Criar `crawl_captures`** com URL requisitada/final, método, status, headers selecionados, timestamp, duração, bytes, digest, redirect chain, content type, `user_agent_profile`, `authority_key`, `attempt`, `queue_item_id` e ponteiro para corpo bruto.
11. **Separar três dedupes**: URL canônica, digest de corpo e cluster de produto. Preservar o Jaccard editorial, mas não usá-lo para impedir nova captura quando a fonte mudou.
12. **Guardar resposta de bloqueio sem publicar**: corpo/headers mínimos, anotação do detector e TTL de cooldown. O objetivo é explicar a decisão, não tentar repetir indefinidamente.
13. **Adicionar recovery**: worker que reclassifica leases expiradas; checkpoint por lote; contador de itens perdidos; teste de reinício no meio do batch; alerta para filas `processing` antigas.

### P2 — Extração em camadas

14. **Manter o roteamento especializado** do Waesy para PNCP, DataJud, lugares, imóveis, leilões, empregos e eventos. Heritrix não substitui esses modelos de domínio.
15. **Adicionar pipeline genérico de links apenas onde necessário**: seeds -> fetch -> extração de links -> `crawl_queue`, com depth/hops, via e tipo de descoberta. Restringir cada fonte por SURT/host/path e por content type.
16. **Executar extração mecânica antes de IA**, como já faz o Waesy. Armazenar o método (`json_ld`, `css_selector`, `readability`, `opengraph`), score de completude e versão do parser.
17. **Usar renderização como segunda tentativa**: o adapter React/browser deve ter orçamento de páginas, limite de tabs, espera de rede, contagem de reinícios, captura de subrecursos e classificação de erro. Bloqueio não pode virar gatilho de browser.
18. **Adicionar `extractor_version` e reprocessamento offline**: se o HTML bruto já estiver salvo, uma mudança de parser não deve exigir novo request ao site.

### P2 — Observabilidade e operação

19. **Expandir `scraper_audit_log` ou criar métricas separadas** com fila, host, tentativa, status, bytes, duração, retry, cooldown, digest, extractor, browser e decisão de policy.
20. **Construir endpoints internos de operação**, inspirados em `/engine` e `/engine/job/{jobname}`: status do worker, heap/recursos, fila por estado, throughput, oldest item, host cooldowns, falhas e links para evidência.
21. **Registrar decisão de escopo**: cada rejeição deve dizer qual regra decidiu, qual valor foi observado, e se foi `PASS`, `ACCEPT` ou `REJECT`. Isso evita “sumiço silencioso” de URL.
22. **Pausar por disco, storage ou quota**, em vez de continuar baixando quando a persistência falhar. Um `published` sem evidência bruta e um `processed` sem resultado auditável devem ser estados de erro, não sucesso.

## 8. O que não deve ser copiado ou afirmado

- Heritrix não é, pelo código e docs examinados, um bypass de anti-bot; `BotBlockDetector` anota bloqueios.
- `BrowserProcessor` não prova suporte a CAPTCHA, stealth, fingerprint evasion, proxy rotation ou login automatizado autorizado.
- O default não torna toda a extração de conteúdo jornalístico pronta; os extratores nativos são principalmente descoberta de links e subrecursos.
- `maxRetries` não significa retry universal de 429, 5xx e timeout. A implementação atual explicita um conjunto menor de estados transitórios.[7]
- `skipIdenticalDigests`, WARC builders, BrowserProcessor e diversas políticas aparecem como configuração. Capacidade disponível não é configuração ativa em todo job.
- Berkeley DB/WARC não significam Supabase, Postgres, object storage ou publicação editorial. Waesy precisa de adaptadores próprios.
- O comportamento observável na documentação oficial “latest” deve ser confrontado com a versão realmente implantada. Este relatório ancora o código primário no commit informado, mas não afirma que qualquer pacote antigo tem exatamente o mesmo BrowserProcessor ou defaults.

## 9. Decisão de arquitetura recomendada

A melhor evolução não é “portar Heritrix inteiro” para TypeScript nem transformar o Waesy em um crawler arquivístico genérico. É adotar os seus **contratos**:

- uma frontier durável e por autoridade;
- canonicalização e filtro de URI antes do trabalho;
- estados de fila que distinguem espera, retry, bloqueio e término;
- politeness calculada por host/API, com atraso e banda persistentes;
- escopo explícito por regras e discovery path;
- captura bruta imutável separada da extração e da publicação;
- retries classificados, limitados e auditáveis;
- browser opt-in para renderização legítima, nunca para contornar bloqueio;
- snapshots, checkpoints, recuperação de leases, relatórios e endpoint operacional;
- política legal e identificável por fonte.

Com essa camada comum, os oito roteadores industriais e os extratores específicos continuam sendo a vantagem do Waesy. Heritrix fornece o padrão de coordenação, tolerância a falhas e responsabilidade operacional; `mechanical-extractor`, `pncp-extractor`, `semantic-deduplicator`, os harvesters especializados e a curadoria permanecem responsáveis pelo significado do dado. Essa separação reduz requests repetidos, evita que uma fonte agressiva monopolize o batch e torna possível responder, para cada item publicado: de onde veio, quando foi capturado, com qual política, qual corpo foi usado, qual parser o extraiu e por que a decisão foi aceita.

## Referências

[1]: https://github.com/internetarchive/heritrix3 "Repositório oficial internetarchive/heritrix3 e README"
[2]: https://heritrix.readthedocs.io/en/latest/configuring-jobs.html "Heritrix 3 — Configuring Crawl Jobs"
[3]: https://github.com/internetarchive/heritrix3/blob/be6b49fa6c35c4f546442ab4ffd2e2eab86c599d/engine/src/main/resources/org/archive/crawler/restlet/profile-crawler-beans.cxml "Perfil padrão do crawl job no commit auditado"
[4]: https://heritrix.readthedocs.io/en/latest/bean-reference.html "Heritrix 3 — Bean Reference"
[5]: https://heritrix.readthedocs.io/en/latest/glossary.html "Heritrix 3 — Glossary"
[6]: https://github.com/internetarchive/heritrix3/blob/be6b49fa6c35c4f546442ab4ffd2e2eab86c599d/engine/src/main/java/org/archive/crawler/postprocessor/CandidatesProcessor.java "CandidatesProcessor no commit auditado"
[7]: https://github.com/internetarchive/heritrix3/blob/be6b49fa6c35c4f546442ab4ffd2e2eab86c599d/engine/src/main/java/org/archive/crawler/frontier/AbstractFrontier.java "AbstractFrontier e decisão de re-enfileiramento no commit auditado"
[8]: https://github.com/internetarchive/heritrix3/blob/be6b49fa6c35c4f546442ab4ffd2e2eab86c599d/modules/src/main/java/org/archive/modules/fetcher/FetchStatusCodes.java "FetchStatusCodes no commit auditado"
[9]: https://github.com/internetarchive/heritrix3/blob/be6b49fa6c35c4f546442ab4ffd2e2eab86c599d/modules/src/main/java/org/archive/modules/extractor/ExtractorHTML.java "ExtractorHTML no commit auditado"
[10]: https://github.com/internetarchive/heritrix3/blob/be6b49fa6c35c4f546442ab4ffd2e2eab86c599d/engine/src/main/java/org/archive/crawler/processor/BrowserProcessor.java "BrowserProcessor no commit auditado"
[11]: https://github.com/internetarchive/heritrix3/blob/be6b49fa6c35c4f546442ab4ffd2e2eab86c599d/modules/src/main/java/org/archive/modules/writer/WARCWriterChainProcessor.java "WARCWriterChainProcessor no commit auditado"
[12]: https://github.com/internetarchive/heritrix3/blob/be6b49fa6c35c4f546442ab4ffd2e2eab86c599d/engine/src/main/java/org/archive/crawler/monitor/DiskSpaceMonitor.java "DiskSpaceMonitor no commit auditado"
[13]: https://heritrix.readthedocs.io/en/latest/api.html "Heritrix 3 — REST API"
[14]: https://github.com/internetarchive/heritrix3/blob/be6b49fa6c35c4f546442ab4ffd2e2eab86c599d/engine/src/main/java/org/archive/crawler/reporting/StatisticsTracker.java "StatisticsTracker no commit auditado"
[15]: https://heritrix.readthedocs.io/en/latest/operating.html "Heritrix 3 — Operating Heritrix"

### Evidências locais do Waesy consultadas

- `/home/ubuntu/waesy-audit/SYSTEM_INVENTORY.md`
- `/home/ubuntu/waesy-audit/src/services/mining/crawler-batch-engine.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/automated-harvest.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/mechanical-extractor.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/react-mining-adapter.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/semantic-deduplicator.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/pncp-extractor.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/pncp-harvester.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/places-harvester.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/datajud-harvester.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/auction-harvester.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/event-harvester.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/real-estate-harvester.ts`

[W1]: `/home/ubuntu/waesy-audit/src/services/mining/crawler-batch-engine.ts`, linhas 52–93 e roteamento por entidade
[W2]: `/home/ubuntu/waesy-audit/src/services/mining/automated-harvest.ts`, linhas 4–10, 106–177 e 186–300
[W3]: `/home/ubuntu/waesy-audit/src/services/mining/pncp-extractor.ts`, linhas 43–132 e 201–239
[W4]: `/home/ubuntu/waesy-audit/src/services/mining/datajud-harvester.ts` e `/home/ubuntu/waesy-audit/src/services/mining/places-harvester.ts`, trechos de cooldown, 429, tentativas e auditoria
[W5]: `/home/ubuntu/waesy-audit/src/services/mining/mechanical-extractor.ts`, linhas 1–10, 122–198 e 202–328
[W6]: `/home/ubuntu/waesy-audit/src/services/mining/react-mining-adapter.ts`, linhas 1–43
[W7]: `/home/ubuntu/waesy-audit/src/services/mining/semantic-deduplicator.ts`, linhas 1–108
