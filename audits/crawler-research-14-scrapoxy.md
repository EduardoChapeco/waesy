# Auditoria de crawler — Scrapoxy (crawler-research-14)

**Data da análise:** 2026-10-06  
**Projeto analisado:** [fabienvauchelles/scrapoxy](https://github.com/fabienvauchelles/scrapoxy)  
**Escopo:** arquitetura, filas e coordenação, discovery, politeness, retries, browser/rendering, extração, observabilidade, storage, tratamento de bloqueios dentro de limites legais e padrões úteis para os mineradores Waesy.

## 1. Resumo executivo

O Scrapoxy não é um crawler de conteúdo. Historicamente, ele foi um **control plane/data plane de proxies**: agrega provedores e instâncias em um endpoint único, seleciona um proxy por requisição, faz health/fingerprint, suporta afinidade de sessão e devolve métricas por proxy. A extração de HTML, parsing de entidades, deduplicação e curadoria ficam fora dele, no cliente de scraping.

Há uma limitação de evidência importante. O repositório solicitado foi migrado para `scrapoxy/scrapoxy`; o upstream atual está marcado como descontinuado, a documentação pública e o backend hospedado foram retirados, e o código público atual é essencialmente um aviso de descontinuação e um artefato launcher. O README oficial histórico da tag `4.22.1` preserva as capacidades anunciadas, mas não preserva a implementação. Os detalhes de implementação abaixo foram cruzados, quando necessário, com um **mirror/fork histórico não oficial** (`jeanhackpy/scrapoxy`) e são explicitamente rotulados como evidência secundária. Não devem ser tratados como contrato atual nem como recomendação de instalar/copiar o Scrapoxy.

Para Waesy, o valor reutilizável é o padrão de **orquestração de egress autorizado**: abstrair providers/connectors, manter estado de saúde por rota, separar tráfego do control plane, usar afinidade explícita, enviar feedback de ban/rate-limit para retirar uma rota e medir resultado por rota. O Scrapoxy não fornece a fila de URLs, a política por domínio, o parser ou o armazenamento de entidades de que o Waesy precisa; esses continuam sendo responsabilidades do Waesy.

### Conclusões principais

1. **Não adicionar Scrapoxy como dependência de produção.** Ele está descontinuado; a licença atual limita uso/revenda de serviço de proxy e o backend público foi encerrado.
2. **Preservar a separação de camadas:** `crawl_queue`/workers/harvesters do Waesy não devem conhecer detalhes de provider ou sessão de egress.
3. **Prioridade operacional:** implementar claim/lease atômico da fila, visibilidade/heartbeat, fairness por domínio e estado de saúde distribuído. O worker atual busca itens `pending`, marca `processing` e processa sequencialmente, mas não mostra uma claim atômica com lease.
4. **Usar browser apenas como capacidade autorizada e excepcional.** Scrapoxy fazia proxy/MITM e sticky session; não era um renderer nem um extrator. O fallback Steel atual do Waesy captura screenshot, mas devolve HTML placeholder; isso não é DOM utilizável.
5. **Não transformar “evitar bans” em bypass.** Desafios, CAPTCHA, Cloudflare e `403` devem resultar em parada/cooldown e revisão de autorização, nunca em tentativa de contornar controle de acesso.

## 2. Estado do projeto e níveis de evidência

| Nível | Fonte | O que pode ser afirmado |
|---|---|---|
| P1 — upstream oficial atual | Repositório migrado, árvore GitHub/API, site e Q&A oficiais | Estado de descontinuação, migração, remoção de docs/backend, licença atual e ausência de fonte pública atual suficiente para auditar a implementação. |
| P1 — upstream oficial histórico | README da tag `4.22.1` | Capacidades anunciadas: endpoint único, connectors, rotação, fingerprint, auto-scale, sticky browser session, ban management, métricas, coverage, Docker/Kubernetes. |
| P2 — fonte secundária de implementação | Fork/mirror público `jeanhackpy/scrapoxy` | Nomes de módulos e comportamento observável de uma cópia histórica; usado apenas para entender padrões, nunca como garantia de capacidade atual. |
| P2 — índice gerado | DeepWiki | Confirma integrações/clientes e sticky/blacklist em alto nível; não substitui o upstream. A página de arquitetura retornou `Loading...` e não foi usada para inventar detalhes. |
| W — código local | `/home/ubuntu/waesy-audit` | Estado real do Waesy: fila, discovery, cooldown, circuit breaker, providers de extração, storage e telemetria. |

O repositório originalmente solicitado, `fabienvauchelles/scrapoxy`, aponta para o projeto migrado. O repositório migrado `scrapoxy/scrapoxy` atualmente informa que o Scrapoxy foi descontinuado. A página oficial `https://scrapoxy.io/` informa que a documentação pública, imagens Docker e backend público foram retirados; o Q&A oficial confirma que o backend fornecia serviços como GeoIP, status online de proxies e verificação de país, mas não está mais disponível. Portanto, “Scrapoxy suporta X hoje” não é uma afirmação válida.

## 3. Arquitetura reconstruída com cautela

### 3.1 Arquitetura funcional histórica

A forma mais segura de descrevê-la é um plano de dados e um plano de controle separados:

```text
Cliente de scraping / Scrapy / Requests / Playwright / browser
                    |
             endpoint proxy único
                    |
       Master: HTTP + CONNECT, auth, seleção
                    |
        Commander: projeto, pool, sessão, status
             /          |             \
     connectors     refresh/probe       storage
   provider APIs     fingerprint/health  local/distributed
             \          |             /
                 proxy/transport nodes
```

O README oficial histórico descreve o endpoint único, pools derivados de datacenter subscriptions, serviços de proxy, farms 4G e listas HTTP/HTTPS/SOCKS. O mirror histórico contém módulos separados para `master`, `commander-client`, `connectors`, `transports`, `probe`, `refresh`, `tasks`, `storages` e charts Kubernetes. Essa separação é evidência do snapshot do mirror, não uma promessa do upstream atual.

No código do mirror, o `MasterService`:

- aceita requisições HTTP e `CONNECT`;
- autentica o projeto por `Proxy-Authorization`/Basic auth via cliente Commander;
- pede o próximo proxy elegível;
- pode solicitar scale-up quando o projeto está em estado `CALM` e auto-scale está ativo;
- remove headers internos de proxy do request antes de encaminhar;
- pode substituir `User-Agent` pelo UA associado à rota;
- usa um `transport` conforme o tipo do proxy;
- adiciona `x-scrapoxy-proxyname` na resposta;
- encaminha por túnel ou por TLS MITM quando há certificado configurado;
- contabiliza requests/bytes/status por proxy e envia agregados ao componente de refresh.

Esse fluxo é útil para Waesy como fronteira arquitetural, mas não deve ser copiado literalmente. O código público atual não contém esse serviço e a licença atual não autoriza assumir que ele possa ser operado/revendido como um serviço de proxy.

### 3.2 Componentes e responsabilidades

| Componente histórico observado | Responsabilidade | O que não prova |
|---|---|---|
| Master | Proxy de tráfego HTTP/CONNECT, escolha da rota e interceptação | Não é crawler, parser ou browser automation. |
| Commander | API/control plane para projetos, conectores, proxies, sessões, status e operações administrativas | Não há evidência atual de uma API pública operacional. |
| Connectors/transports | Adapters para provedores e formas de transporte | A lista/configuração de connectors do mirror não é garantia de disponibilidade ou autorização atuais. |
| Refresh | Fingerprint, métricas, proxies, tasks e sincronização de estado | Não é uma fila de URLs de páginas. |
| Probe | Endpoint de saúde agregado de providers | Não substitui validação de conteúdo ou aceitação legal da fonte. |
| Storage | No mirror: memória/arquivo local e storage distribuído Mongo/MS, com modelos de projetos, connectors, credenciais, proxies, free proxies, sources, tasks, users e windows | Não há evidência de Supabase/Postgres no Scrapoxy histórico inspecionado. |
| Clientes | Scrapy, Requests, browser automation e outras bibliotecas podem usar o proxy | Browser é cliente do proxy; não significa renderer interno. |

### 3.3 Fluxo de uma requisição e afinidade

A afinidade aparece de duas formas compatíveis: o proxy pode devolver `x-scrapoxy-proxyname`, e uma sessão pode receber cookie interno `scrapoxy-proxyname`. O middleware Python histórico copia esse header para requests seguintes. No modo MITM, o cliente precisa confiar na CA do Scrapoxy; isso permitia interceptar headers/responses, acrescentar cookie e manter o mesmo proxy durante uma sessão de browser.

O padrão aplicável ao Waesy é uma abstração neutra, por exemplo `egress_route_id`/`session_affinity_id`, em vez de propagar o nome de um produto. A afinidade deve ser opcional, com TTL, escopo por domínio/fonte e revogação quando a rota falha. Não se deve compartilhar cookies entre tenants ou entre domínios sem justificativa explícita.

## 4. Filas, tasks e coordenação

### 4.1 O que existe no Scrapoxy histórico

O mirror contém `RefreshTasksService`, que busca `getNextTaskToRefresh()`, obtém uma factory por tipo, trava a task no Commander, executa ou cancela, captura erro e atualiza a task. Há fluxo análogo para refresh de proxies: busca um lote, faz fingerprint em paralelo, registra erro por proxy e envia `refreshProxies`. Também existe um loop de refresh de métricas com `refreshDelay` e `errorDelay`.

Isso é uma **coordenação de lifecycle do pool**, não uma fila de crawling de documentos. Não foi encontrada evidência no snapshot inspecionado de uma fila de URLs com robots policy, profundidade, canonicalização, retry por domínio ou parsing de conteúdo. Também não foi afirmado um broker específico: o código observado usa clientes/serviços e storage, não autoriza concluir que exista Redis/Bull/Kafka.

### 4.2 Comparação com Waesy

O inventário canônico registra 1.837 arquivos em `src/`, 537 tabelas, 8 verticais de mineração e 21 arquivos em `src/services/mining/`, com Supabase Postgres 15+, RLS, `pg_cron`, `pg_net` e `pgvector`.

No `crawler-batch-engine.ts`, o fluxo atual:

1. consulta `crawl_queue` com `status = pending`;
2. ordena por prioridade decrescente e idade crescente;
3. pega lote padrão de 5;
4. marca cada item como `processing` e incrementa `retry_count`;
5. roteia por `entity_type` para jobs, places, tenders, real estate, auctions, RSS, events e news;
6. grava `completed`/`failed`, erro e timestamps.

O arquivo executa o lote sequencialmente. A leitura observada não mostra uma operação transacional de claim (`UPDATE ... WHERE status = pending ... RETURNING`), lease/visibility timeout, heartbeat ou fencing token. Em duas execuções simultâneas, há risco de os mesmos itens serem lidos antes da marcação, dependendo das garantias externas. Isso é uma lacuna de produção, não uma capacidade do Scrapoxy que deva ser copiada sem adaptação.

### 4.3 Adaptação recomendada de fila

A melhoria inspirada no padrão de coordenação é criar uma função transacional Supabase, por exemplo `claim_crawl_queue_batch`, com:

- seleção de itens `pending` cujo `scheduled_for <= now()` e cujo `cooldown_until` expirou;
- `FOR UPDATE SKIP LOCKED`;
- transição atômica para `processing` com `lease_until`, `worker_id`, `attempt_id` e `claimed_at`;
- recuperação de leases expirados, limitada por `max_attempts`;
- heartbeat para jobs longos;
- prioridade com fairness por domínio/tenant, evitando que uma única fonte consuma o lote;
- `idempotency_key`/URL canônica e `ON CONFLICT`.

O `retry_count` deve representar tentativas de uma operação específica; falhas de extração, rate-limit, bloqueio, timeout e erro de storage devem ter `error_type` e política diferente. A fila de URLs deve continuar separada de qualquer futura fila de egress/provider.

## 5. Discovery

### 5.1 Scrapoxy

O discovery do Scrapoxy histórico é de **proxies e capacidade**, não de páginas: conectores consultam APIs de datacenter/proxy services/hardware, listas gratuitas são agregadas e testadas, providers online são mantidos no pool, fingerprint é atualizado e auto-scale reage ao tráfego. O README cita parâmetros como país e tipo de OS para diversidade de proxies, mas isso não deve ser confundido com descoberta de conteúdo nem usado para falsificar identidade.

Não há evidência primária atual de que o Scrapoxy tenha crawler de sitemap, RSS, links, canonicalização, extração de Schema.org ou deduplicação de artigos.

### 5.2 Waesy

O Waesy já possui discovery de conteúdo mais rico:

- `sitemap-crawler.engine.ts` trata `sitemapindex`/`urlset`, usa canonicalização, mantém `visitedSitemaps`, limita a 10.000 URLs e profundidade 3;
- insere em lotes de 200 com `upsert` por URL, preservando `lastmod`, `changefreq`, prioridade e origem;
- `crawler-sources.functions.ts` mantém um registry de fontes RSS/HTML sitemap/jobs/real estate/auctions/tenders/news/ecommerce;
- `crawler-batch-engine.ts` cria o roteamento polimórfico pelas oito verticais;
- RSS enfileira links descobertos com metadados da fonte.

O que pode ser aproveitado do Scrapoxy é a ideia de um **registry de adapters** e de um estado de disponibilidade por adapter. O discovery de conteúdo continua no Waesy e deve obedecer à autorização e à política da fonte.

## 6. Politeness, retries e backpressure

### 6.1 Evidência do Scrapoxy

O README oficial histórico afirma que somente proxies online são roteados, que proxies podem ser rotacionados, que o pool pode ser escalado conforme tráfego e que um scraper pode retirar um proxy quando detectar ban. O middleware Python do mirror usa, por padrão, `429` e `503` como sinais de blacklist, envia o ID da rota ao API, força nova verificação e repete a request até duas vezes com atraso aleatório padrão entre 60 e 180 segundos.

Isso é **politeness/health do egress**, não uma política completa de frequência por domínio. Não foi localizada evidência oficial de `robots.txt`, janela por host, limite de concorrência por origem ou consentimento legal. Portanto, não é correto atribuir ao Scrapoxy essas capacidades.

### 6.2 Waesy atual

`src/lib/mining/scraper-utils.ts` já fornece uma base mais explícita:

- UA rotativo e identificável, incluindo `WaesyBot` com URL de contato;
- rate limit em memória por chave;
- `Retry-After` em segundos ou HTTP-Date;
- retry padrão até 3 tentativas, backoff 1s/2s/... até 30s, para `408, 429, 500, 502, 503, 504`;
- cooldown de domínio para `429` de no mínimo 60s e no máximo 30min;
- cooldown de 30min para desafio Cloudflare/anti-bot identificado;
- persistência assíncrona em `domain_cooldowns`;
- detecção de sinais de Cloudflare, Turnstile, DDoS-Guard, PerimeterX e “access denied”.

`crawler-circuit-breaker.ts` mantém `CLOSED/OPEN/HALF_OPEN`, threshold padrão de 3 falhas, cooldown de 30s e timeout leaf de 8s. Porém, o singleton mantém contadores em memória do processo; não é uma coordenação distribuída entre workers/instâncias. A migração persiste cooldowns, mas a consulta em memória é o caminho decisório principal e precisa ser revisada para consistência entre réplicas.

### 6.3 Gaps e adaptação

A recomendação não é “rotacionar mais para evitar bloqueio”. É aplicar um orçamento explícito e respeitoso por domínio:

- um scheduler por host/fonte com `next_allowed_at`, concorrência máxima, tokens por janela e custo estimado;
- respeitar `Retry-After`, `robots.txt` quando aplicável e termos/autorização da fonte;
- tratar `403` challenge/CAPTCHA como **stop + cooldown + revisão**, não como retry infinito;
- propagar o resultado da request para `domain_cooldowns`, circuit breaker e `crawl_queue` de modo idempotente;
- incluir jitter apenas para evitar sincronização acidental de workers, não para sobrecarregar uma fonte;
- usar backpressure quando a fila crescer, diminuindo discovery antes de aumentar concorrência.

## 7. Browser, rendering e sessões

### 7.1 O que o Scrapoxy fazia

O Scrapoxy histórico fornecia um proxy para clientes como Requests, Scrapy, Selenium, Splash, Puppeteer, Playwright e Crawlee. O índice secundário de integrações confirma que o CA/MITM era necessário para HTTPS quando se desejava interceptação, logging, blacklist e sticky session. Isso significa que o browser era executado **fora** do Scrapoxy e usava o Scrapoxy como proxy.

O Scrapoxy não deve ser descrito como um Chromium renderer, executor de JavaScript, capturador de DOM, parser de Schema.org ou extrator de Markdown. O código observado do Master opera streams HTTP/TLS, cabeçalhos, cookies e sockets; não renderiza páginas.

### 7.2 Waesy atual

O `firecrawl-client.ts` tem uma ordem clara:

1. Firecrawl com formatos markdown/html e timeout de 20s;
2. `fetchWithRetry` nativo com UA e detecção de challenge;
3. Steel para screenshot quando a página está bloqueada ou o fetch falha;
4. falha explícita com `isBlocked`, `rateLimited`, status e provider.

Atenção: o retorno de Steel observado traz `screenshotUrl` e um HTML placeholder (`<!-- Steel screenshot captured -->`), não o DOM real. Ele não pode alimentar o `mechanical-extractor` como se fosse HTML da página. Se Waesy precisar de rendering real, deve haver um adapter autorizado de Playwright/Chromium que devolva explicitamente `html`, `text`, `links`, `screenshot` e telemetria; screenshot sozinho é evidência visual, não conteúdo extraível.

### 7.3 Adaptação segura

Adicionar uma interface `RenderedFetchProvider` opcional, acionada somente para fontes autorizadas marcadas `requires_javascript`:

- contexto isolado por job/tenant/domínio;
- limite de páginas, tempo, memória e downloads;
- cookies e local storage não compartilhados por padrão;
- `robots`/política da fonte avaliados antes do job;
- screenshot e HTML armazenados separadamente;
- challenge/CAPTCHA detectado e encerrado;
- fallback para HTML nativo sem tentar “bypass”.

## 8. Extração e qualidade

O Scrapoxy apenas transporta o tráfego. Seu fingerprint endpoint histórico recebe identificadores da instalação, modo, connector, proxy e contadores; ele não extrai conteúdo da página. A extração continua sendo uma responsabilidade forte do Waesy:

- `mechanical-extractor.ts` usa camadas JSON-LD, meta tags, seletores de domínio e densidade textual;
- `specialized-extractors.ts`, `pncp-extractor.ts` e `job-opportunity-extractor.ts` tratam contratos de fontes específicas;
- `integrity-gate.ts` rejeita títulos genéricos, desafios/captcha, conteúdo curto, repetição de lead e imagens inválidas;
- `semantic-deduplicator.ts` usa similaridade Jaccard e janela temporal;
- `editorial-squad.ts` fica depois da extração mecânica, com schema e fallback determinístico.

O padrão aproveitável é manter **transporte/egress → aquisição → extração determinística → qualidade → curadoria** como fronteiras independentes. Não acoplar um eventual browser/provider ao curador IA e não permitir que uma falha de IA seja registrada como sucesso de aquisição.

## 9. Observabilidade

### 9.1 Scrapoxy histórico

O README lista tráfego de entrada/saída, número de requests, proxies ativos, requests por proxy e cobertura geográfica. No Master do mirror, `ConnectionMetrics` acumula por proxy:

- requests;
- requests válidos e inválidos, considerando status `< 400` como válido;
- bytes enviados e recebidos.

O Master faz flush periódico para o componente de refresh. O Probe retorna JSON com o status de seus providers e HTTP 400 se algum probe estiver falso. Não foi encontrada evidência suficiente de Prometheus, OpenTelemetry, tracing distribuído, SLOs ou logs estruturados atuais; não inventar esses recursos.

### 9.2 Waesy atual e proposta

Waesy já expõe estatísticas de `crawl_queue`, feeds, scrapers e `mined_articles`, grava `scraper_audit_log`, informa provider/status/block/rate-limit em resultados e mantém estados de qualidade. Para aproximar a granularidade operacional do padrão de proxy, registrar por tentativa:

| Dimensão | Campos sugeridos |
|---|---|
| Identidade | `job_id`, `queue_id`, `source_id`, `domain`, `worker_id`, `attempt_id` |
| Egress | `provider`, `route_id`/`session_id` opcional, país/transport apenas se autorizado |
| Resultado | HTTP status, `error_type`, `is_blocked`, `rate_limited`, `retry_after`, challenge class |
| Tempo/tamanho | DNS/connect/TTFB/total, bytes de request/response, conteúdo recebido |
| Extração | parser usado, entities, word count, quality score, dedup key |
| Governança | robots/consent check, policy version, terms/source snapshot |

O `route_id` não precisa ser Scrapoxy; é uma chave interna de uma futura camada de egress. Nunca gravar credenciais, cookies ou tokens em logs. Métricas agregadas devem ter retenção e cardinalidade controladas.

## 10. Storage e segurança

### 10.1 Scrapoxy

O README histórico fala em Docker/Kubernetes e o mirror mostra storage local em memória/arquivo e storage distribuído com modelos para projetos, connectors, credenciais, proxies, free proxies, sources, tasks, usuários, parâmetros e janelas. Isso sugere uma modelagem adequada para **estado do control plane**, não para os objetos ricos de mineração do Waesy. Não há evidência primária atual de PostgreSQL, RLS ou Supabase no Scrapoxy.

### 10.2 Waesy

Waesy usa Supabase Postgres, RLS, `pg_cron`/`pg_net` e tabelas de domínio. A migração `20261115000000_crawler_resilience_and_mined_products.sql` acrescenta a `crawl_queue` campos como `last_http_status`, `is_blocked`, `cooldown_until`, `error_type` e `extracted_entities`; cria índice único de URL e índice de pendentes por agendamento/cooldown; e cria `domain_cooldowns` com motivo, status, vencimento, erros consecutivos e último erro.

Há um risco de segurança concreto que deve ser corrigido independentemente do Scrapoxy: a mesma migração mostra policies `domain_cooldowns_public_read` e `domain_cooldowns_staff_all` com `USING (true)`. Isso pode permitir leitura/alteração ampla se a policy estiver efetiva para roles públicas. O relatório não assume que a migration tenha sido aplicada sem verificar o banco; recomenda revisar as policies efetivas e restringir escrita a `service_role`/worker autorizado, com acesso de leitura mínimo.

### 10.3 Storage recomendado para a próxima fase

Adicionar, no mínimo, entidades separadas para `crawler_source_policy`, `crawl_queue_lease`, `domain_budget`, `egress_provider_health`, `egress_route_health`, `session_affinity` e `crawl_attempt_events`. Usar constraints, índices parciais e RPCs transacionais; não expor secrets, headers de autenticação ou cookies via RLS pública. O control plane de egress, se existir, deve ser interno e não uma API de proxy revendível.

## 11. Anti-bot dentro de limites legais

O marketing histórico do Scrapoxy falava em “avoid bans”, fingerprint, rotação e blacklist. Isso descreve mecanismos técnicos, não autorização jurídica. Proxy rotation, UA rotation ou fingerprinting não tornam permitido coletar uma fonte. Para Waesy:

- coletar somente fontes públicas ou expressamente autorizadas;
- respeitar termos, robots/políticas publicadas e limites do operador;
- identificar o bot com UA e contato verdadeiros;
- aplicar rate limit e cooldown conservadores;
- interromper em CAPTCHA, Turnstile, Cloudflare challenge, `403` de controle de acesso ou instrução de não rastrear;
- não tentar resolver CAPTCHA, contornar login, falsificar identidade, esconder origem, quebrar controles técnicos ou usar proxy para violar restrições;
- manter trilha de fonte, finalidade, base de autorização e decisão de parada;
- remover/limitar dados pessoais conforme finalidade e política de retenção.

A detecção já existente em `scraper-utils.ts` é uma boa postura de segurança: detectar e pausar. O uso de headers “Chrome-like” em alguns extratores deve ser revisado para não apresentar uma identidade enganosa; o UA declarativo `WaesyBot` com contato é preferível para fontes que o permitam.

## 12. Matriz de comparação e decisões para Waesy

| Capacidade | Scrapoxy histórico evidenciado | Waesy atual | Decisão |
|---|---|---|---|
| Endpoint de egress | Master HTTP/CONNECT e transports | Firecrawl/native fetch/Steel; sem camada de egress unificada | Criar interface interna de provider/route, sem depender de Scrapoxy. |
| Pool/discovery de proxies | Connectors, free proxy lists, providers, online probe | Providers de aquisição (Firecrawl, PNCP, Overpass, BCB etc.), sem pool de proxy próprio | Reutilizar registry/health adapter, não importar lista de proxies não autorizados. |
| Fila | Tasks/proxy refresh no control plane | `crawl_queue`, batch engine, pg_cron/jobs | Implementar claim/lease e fairness; manter fila de conteúdo separada. |
| Discovery de páginas | Não evidenciado | Sitemaps, RSS, registry de sources e classificação | Waesy é mais completo; manter canonicalização e idempotência. |
| Politeness | Blacklist 429/503 e somente online; robots não evidenciado | Retry-After, cooldown persistente, rate limit e breaker local | Tornar orçamento por domínio distribuído e parar em challenge. |
| Retry | Fingerprint max 2; blacklist max 2 com 60–180s; error delay | Retry max 3, exponential, 429/403 policy, circuit breaker | Unificar política por classe de erro e registrar attempts. |
| Sticky session | Header/cookie e CA/MITM | Não há cookie/session jar no extractor mecânico | Adicionar apenas para jobs autorizados e com isolamento por domínio. |
| Browser/rendering | Proxy usado por browsers; não renderer | Firecrawl HTML/Markdown; Steel screenshot placeholder | Criar renderer real opcional; não usar screenshot como HTML. |
| Extração | Não evidenciada | Extratores mecânicos/especializados, integrity, Jaccard, IA | Não misturar proxy com parsing/curadoria. |
| Observabilidade | por-proxy request/status/bytes, Probe, coverage anunciada | queue stats, audit logs, status/provider/quality | Adicionar métricas por tentativa, domínio e rota. |
| Storage | Mirror: file/memory + Mongo/MS; histórico não atual | Postgres/Supabase/RLS/cron/pg_net | Fortalecer RLS e adicionar leases/attempt events. |
| Estado do produto | Descontinuado; docs/backend removidos | Sistema ativo no inventário | Nenhuma dependência operacional; apenas padrões arquiteturais. |

## 13. Backlog priorizado de adaptações

### P0 — segurança e correção imediata

1. Corrigir/verificar policies de `domain_cooldowns` e demais tabelas de crawler; remover `USING (true)` amplo para escrita.
2. Documentar política de parada em CAPTCHA/challenge/403 e impedir que fallbacks tentem contornar o bloqueio.
3. Corrigir o contrato Steel: `screenshotUrl` deve ser armazenado como artefato visual; não marcar HTML placeholder como conteúdo extraído.
4. Não copiar código do Scrapoxy nem depender de imagens, APIs ou backend descontinuados; revisar a licença atual antes de qualquer uso.

### P1 — fila e fairness

1. Criar RPC de claim atômico com `SKIP LOCKED`, `lease_until`, heartbeat e recuperação de lease expirado.
2. Introduzir `source_id`/domínio como chave de fairness e budget; impedir que sitemap/RSS de uma fonte monopolize workers.
3. Separar `scheduled_for`, `cooldown_until`, `next_retry_at` e `retry_count`; classificar falhas por tipo.
4. Emitir `crawl_attempt_events` com métricas e correlação por job.

### P2 — abstração de egress autorizada

1. Definir `EgressProvider` com `acquireRoute`, `releaseRoute`, `health`, `reportOutcome` e `supportsSessionAffinity`.
2. Manter health por provider/route e usar circuit breaker distribuído; não escolher rota somente por rotação aleatória.
3. Usar afinidade somente quando a fonte e o job exigirem, com TTL e revogação.
4. Se um browser autorizado for necessário, executar em worker isolado e usar a mesma política de domínio da aquisição nativa.

### P3 — qualidade e SLO

1. Medir latência, bytes, status, challenge, qualidade e dedup por fonte/provider.
2. Criar dashboards para fila envelhecida, leases expirados, taxa de erro por domínio, `429/403`, taxa de extração vazia e divergência entre screenshot/HTML.
3. Testar concorrência de workers, idempotência de URL, retry-after, cooldown persistente e recuperação após crash.

## 14. Fontes exatas

### Fontes oficiais do Scrapoxy

- **S1 — repositório solicitado:** https://github.com/fabienvauchelles/scrapoxy
- **S2 — upstream migrado atual:** https://github.com/scrapoxy/scrapoxy
- **S3 — árvore pública atual:** https://api.github.com/repos/scrapoxy/scrapoxy/git/trees/main?recursive=1
- **S4 — README oficial histórico da tag 4.22.1:** https://raw.githubusercontent.com/scrapoxy/scrapoxy/4.22.1/README.md
- **S5 — árvore oficial histórica:** https://github.com/scrapoxy/scrapoxy/tree/4.22.1
- **S6 — licença atual:** https://raw.githubusercontent.com/scrapoxy/scrapoxy/main/LICENSE.md
- **S7 — site oficial e aviso de descontinuação:** https://scrapoxy.io/
- **S8 — Q&A oficial de descontinuação:** https://scrapoxy.io/qna
- **S9 — pacote/launcher histórico:** https://raw.githubusercontent.com/scrapoxy/scrapoxy/4.22.1/dist/scrapoxy/package.json
- **S10 — launcher histórico:** https://raw.githubusercontent.com/scrapoxy/scrapoxy/4.22.1/dist/scrapoxy/scrapoxy.js

### Evidência secundária de implementação histórica — não é upstream atual

- **S11 — mirror histórico:** https://github.com/jeanhackpy/scrapoxy
- **S12 — Master:** https://github.com/jeanhackpy/scrapoxy/blob/master/packages/backend/sdk/src/master/master.service.ts
- **S13 — Master module:** https://github.com/jeanhackpy/scrapoxy/blob/master/packages/backend/sdk/src/master/master.module.ts
- **S14 — Probe:** https://github.com/jeanhackpy/scrapoxy/blob/master/packages/backend/sdk/src/probe/probe.service.ts
- **S15 — proxy refresh:** https://github.com/jeanhackpy/scrapoxy/blob/master/packages/backend/sdk/src/refresh/proxies/proxies.service.ts
- **S16 — task refresh:** https://github.com/jeanhackpy/scrapoxy/blob/master/packages/backend/sdk/src/refresh/tasks/tasks.service.ts
- **S17 — métricas por proxy:** https://github.com/jeanhackpy/scrapoxy/blob/master/packages/backend/sdk/src/master/metrics.ts
- **S18 — API Python:** https://github.com/jeanhackpy/scrapoxy/blob/master/packages/python-api/src/scrapoxy/api.py
- **S19 — scheduler Scrapy:** https://github.com/jeanhackpy/scrapoxy/blob/master/packages/python-api/src/scrapoxy/scheduler.py
- **S20 — blacklist/retry:** https://github.com/jeanhackpy/scrapoxy/blob/master/packages/python-api/src/scrapoxy/blacklist.py
- **S21 — sticky middleware:** https://github.com/jeanhackpy/scrapoxy/blob/master/packages/python-api/src/scrapoxy/sticky.py
- **S22 — fingerprint:** https://github.com/jeanhackpy/scrapoxy/blob/master/packages/backend/sdk/src/fingerprint/fingerprint.helpers.ts
- **S23 — storage tree:** https://github.com/jeanhackpy/scrapoxy/tree/master/packages/backend/sdk/src/storages
- **S24 — Helm/simple cluster:** https://github.com/jeanhackpy/scrapoxy/tree/master/packages/charts/src/scrapoxy-simple-cluster
- **S25 — índice secundário de integrações:** https://deepwiki.com/scrapoxy/scrapoxy/6-integrations

### Evidência local Waesy

- `/home/ubuntu/waesy-audit/SYSTEM_INVENTORY.md`
- `/home/ubuntu/waesy-audit/src/services/mining/crawler-batch-engine.ts`
- `/home/ubuntu/waesy-audit/src/lib/mining/scraper-utils.ts`
- `/home/ubuntu/waesy-audit/src/lib/mining/crawler-circuit-breaker.ts`
- `/home/ubuntu/waesy-audit/src/lib/mining/sitemap-crawler.engine.ts`
- `/home/ubuntu/waesy-audit/src/lib/mining/firecrawl-client.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/mechanical-extractor.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/integrity-gate.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/semantic-deduplicator.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/editorial-squad.ts`
- `/home/ubuntu/waesy-audit/src/services/mining.functions.ts`
- `/home/ubuntu/waesy-audit/supabase/migrations/20261115000000_crawler_resilience_and_mined_products.sql`

## Veredito

**Scrapoxy é uma referência arquitetural de control plane de egress, não uma solução de mineração de conteúdo para Waesy.** O padrão mais útil é a combinação de adapters de provider, health/Probe, afinidade explícita, feedback de rota banida, métricas por rota e separação entre Master/control plane/refresh/storage. O Waesy já é mais forte em discovery, extraction, integrity e persistence; deve incorporar apenas os padrões acima, corrigindo primeiro leasing/fairness da fila e RLS. O estado descontinuado, a remoção do backend/documentação, a ausência de fonte pública atual e a licença atual impedem recomendar dependência, fork ou redistribuição do Scrapoxy.
