# Auditoria técnica — ScrapeGraphAI para evolução dos mineradores Waesy

**ID da pesquisa:** `crawler-research-09-scrapegraphai`  
**Projeto analisado:** [ScrapeGraphAI/Scrapegraph-ai](https://github.com/ScrapeGraphAI/Scrapegraph-ai)  
**Checkout local analisado:** `/home/ubuntu/jobs/c9b21b1c6646_a8/Scrapegraph-ai`  
**Commit exato:** `194055e203afce41ed4e70365dbc416bad756115` (`2.3.1`, checkout de 2026-10-06)  
**Baseline Waesy:** [`/home/ubuntu/waesy-audit/SYSTEM_INVENTORY.md`](file:///home/ubuntu/waesy-audit/SYSTEM_INVENTORY.md) e `src/services/mining/`, além dos utilitários em `src/lib/mining/`.

> **Conclusão curta:** ScrapeGraphAI é uma boa referência para **orquestração em grafo, extração orientada a schema, seleção de transporte/renderização e métricas por etapa**. O repositório open source, porém, **não é um crawler distribuído com fila durável, lease, backoff de domínio, armazenamento de páginas ou observabilidade operacional completa**. Essas propriedades aparecem na documentação do **serviço gerenciado** Crawl/History/Monitor, não devem ser atribuídas ao pacote Python local. Para o Waesy, a recomendação é adotar a linguagem de grafos e alguns contratos de fronteira do serviço gerenciado, preservando a fila Supabase, os parsers mecânicos e as proteções de politeness que o Waesy já possui.

## 1. Escopo, método e distinções de evidência

A análise combinou três níveis, mantendo-os separados:

1. **Código primário do checkout oficial** no commit acima: grafos, nós, loaders, parsing, callbacks, telemetria e integração Burr.
2. **Documentação oficial** em `docs.scrapegraphai.com`: serviços Scrape, Extract, Crawl, History e Monitor; API de erros, gerenciamento de crawl e SDK Python.
3. **Código real do Waesy**, não apenas o inventário: `crawler-batch-engine.ts`, `automated-harvest.ts`, `mechanical-extractor.ts`, `integrity-gate.ts`, `specialized-extractors.ts`, `places-harvester.ts`, `pncp-extractor.ts`, `pncp-harvester.ts`, `react-mining-adapter.ts` e os utilitários `firecrawl-client.ts`, `crawler-circuit-breaker.ts`, `scraper-utils.ts` e `ai-react-loop.ts`.

A documentação de Crawl/History/Monitor descreve o **serviço/API hospedado**. O código localizado no repositório open source não contém essa implementação persistente do serviço. Onde uma capacidade é gerenciada, o relatório marca explicitamente como **managed-only**; onde existe no checkout local, há referência ao arquivo primário correspondente.

## 2. Arquitetura — o que o ScrapeGraphAI é

### 2.1. Open source: pipelines em grafo dentro do processo

O núcleo Python transforma um workflow em uma sequência de nós com entradas e saídas declaradas sobre um `dict` de estado. Em termos funcionais:

```text
prompt/source
   -> FetchNode (requests, BrowserBase, Scrape.do, Plasmate ou Chromium)
   -> ParseNode (HTML -> texto/Markdown, links/imagens, chunks)
   -> GenerateAnswerNode (LLM por chunk, parser JSON/Pydantic)
   -> Merge/answer
```

`BaseGraph` mantém `nodes`, `edges` e `entry_point`, executa o sucessor do nó atual e muta o estado. Cada nó recebe uma expressão de chaves, como `user_prompt & urls`, e escreve as chaves declaradas. O executor registra tempo de execução por nó e coleta dados de callbacks de LLM. A execução é síncrona do ponto de vista do processo; alguns nós internos usam `asyncio`, threads ou paralelismo de chamadas de modelo.

As famílias mais relevantes são:

- **SmartScraperGraph:** uma página/fonte e uma pergunta/schema.
- **SmartScraperMultiGraph:** lista de URLs, com processamento dos documentos.
- **SearchGraph:** LLM transforma o prompt em query; um provider de busca retorna URLs; cada URL passa por um `SmartScraperGraph`; por fim os resultados são mesclados.
- **SmartScraperGraph com nível K:** busca recursiva de links até uma profundidade configurada.
- **GraphIteratorNode:** instancia um grafo por item e limita o número de tarefas concorrentes.
- **BatchGenerateAnswerNode:** caminho opcional de OpenAI Batch API, com polling e correlação por `custom_id`; é uma fila de inferência de terceiro, não a fila do crawler.

A integração opcional com Burr transforma os nós em ações Burr e usa tracking local, hooks e estado Burr. Ela fornece uma máquina de estados/observabilidade adicional, não uma fila distribuída pronta para substituir o `crawl_queue` do Waesy.

### 2.2. Serviço/API gerenciado: uma camada diferente

A documentação oficial apresenta serviços hospedados que não estão implementados como armazenamento durável no checkout open source:

- **Scrape:** uma chamada pode retornar Markdown, HTML, links, imagens, resumo, JSON, branding e screenshot.
- **Extract:** recebe URL, HTML ou Markdown, prompt e schema JSON e devolve JSON tipado com uso de tokens e metadados do chunker.
- **Crawl:** inicia um job assíncrono multi-página e oferece polling/webhook, fronteira de páginas, profundidade, limites e stop/resume.
- **History:** persiste chamadas e relações pai/filho para auditoria/replay.
- **Monitor:** agenda fetch por cron, detecta diffs e envia webhook.

Portanto, “ScrapeGraphAI tem filas, armazenamento, monitoramento e retry” só é uma afirmação válida para partes do **serviço gerenciado**, não para o executor open source local.

## 3. Fila, jobs e fronteira de crawling

### 3.1. O que há no open source

O open source tem três formas de concorrência, cada uma com escopo menor que uma fila operacional:

| Mecanismo | O que faz | O que não faz |
|---|---|---|
| `GraphIteratorNode` | Processa uma lista de URLs usando semáforo e `batchsize` (padrão observado: 16), isolando um grafo por URL | Não persiste item pendente, não faz claim/lease, não reabre job após processo morrer |
| `asyncio.gather` nos loaders | Busca várias URLs da lista ao mesmo tempo; `ChromiumLoader.alazy_load` agrega resultados | Não impõe orçamento por domínio; pode gerar rajada se o chamador passar lista grande |
| `BatchGenerateAnswerNode` | Envia prompts ao OpenAI Batch, faz polling, mapeia respostas por `custom_id` | É batch de LLM; não é fronteira de URLs, não controla fetch, robots ou armazenamento do crawler |

Não foi localizado no executor open source um banco de jobs, tabela de frontier, claim atômico, lease, worker heartbeat, dead-letter queue, reaper ou paginação persistente do conjunto de URLs. O estado principal é um dicionário em memória que desaparece com o processo.

### 3.2. O que a documentação gerenciada acrescenta

A documentação oficial de [Crawl](https://docs.scrapegraphai.com/services/crawl) descreve um contrato operacional que vale a pena reproduzir no Waesy:

- criação de um `crawl job id` assíncrono;
- status/contadores (`status`, `total`, `finished`, `pages`);
- páginas com `url`, `depth`, `status`, `parentUrl`, `contentType`, `links` e `scrapeRefId`;
- limites explícitos de `maxPages`, `maxDepth` e `maxLinksPerPage`;
- mesmo domínio por padrão, mais padrões de inclusão/exclusão e allowlist de MIME;
- resultados paginados por cursor em `/crawl/:id/pages`;
- conteúdo separado da listagem de frontier, recuperável pelo identificador de scrape;
- stop, resume e delete. O [endpoint de gerenciamento](https://docs.scrapegraphai.com/api-reference/endpoint/crawl/manage) afirma que stop preserva páginas já buscadas e impede nova expansão, enquanto resume continua da última frontier.

Esse contrato é particularmente útil para o Waesy porque complementa a fila de entidades atual com uma **fila de páginas**, sem misturar a unidade “artigo/vaga/licitação” com a unidade “URL visitada”.

### 3.3. Comparação com a fila Waesy

O inventário registra 1.837 arquivos em `src`, 537 tabelas, Postgres/Supabase 15+ com RLS, pg_cron/pg_net/pgvector, oito verticais e 21 arquivos em `src/services/mining/`. O `crawler-batch-engine.ts` lê `crawl_queue` em `pending`, ordena por prioridade e idade, limita o lote, marca cada item como `processing`, incrementa `retry_count`, roteia oito tipos de entidade e atualiza `completed` ou `failed`.

Isso é **mais operacional** que o executor open source do ScrapeGraphAI, pois já há fila persistida, jobs acionáveis por cron/serverless/CLI, auditoria e persistência vertical. Há, entretanto, uma lacuna importante: a leitura de pendentes e a posterior atualização para `processing` são operações separadas. O update mostrado é apenas por `id`, sem uma condição `status = pending` ou claim transacional. Dois workers podem ler o mesmo item antes de um deles marcá-lo. Além disso, o `retry_count` é incrementado, mas o catch marca `failed`; não há no trecho analisado uma política que recoloque automaticamente falhas retryable na fila com backoff, nem lease/reaper para um worker que morra em `processing`.

**Recomendação de fila:** manter o `crawl_queue` de entidade e criar uma fronteira de páginas/descobertas, com claim atômico via RPC/transaction (`UPDATE ... WHERE status='pending' ... RETURNING`, ou `FOR UPDATE SKIP LOCKED`), `lease_until`, `claimed_by`, `attempt`, `next_attempt_at`, `retryable`, `dead_letter_reason` e reaper periódico.

## 4. Discovery e controle de expansão

### 4.1. Discovery no ScrapeGraphAI open source

`FetchNodeLevelK` faz o seguinte:

1. recebe URL inicial;
2. busca conteúdo com `ChromiumLoader`, BrowserBase ou Scrape.do;
3. extrai `href` com BeautifulSoup;
4. resolve URLs relativas com `urljoin`;
5. descarta vários esquemas não web (`mailto`, `javascript`, `data`, `ftp`, `file`, `ws`, entre outros);
6. evita duplicatas comparando URLs textualmente com os documentos atuais/novos;
7. repete por `depth`.

A implementação é um bom esqueleto didático, mas não é uma frontier de produção: não há canonicalização robusta, fragment/query tracking policy, persistência, orçamento por domínio, sitemap, `Retry-After`, hash de conteúdo ou limite global de páginas. Há também uma ressalva que deve ser tratada como bug até a correção/teste: quando `only_inside_links=True`, `get_full_links` descarta qualquer link que já comece com `http://` ou `https://`; na prática, preserva relativos e pode descartar links absolutos internos, em vez de verificar se o hostname é o mesmo.

`SearchGraph` representa outro estilo de discovery. `SearchInternetNode` pede ao LLM uma query, chama `search_on_web` (DuckDuckGo por padrão ou provider configurado, incluindo Serper), limita resultados e passa as URLs ao `GraphIteratorNode`. É adequado para pesquisa orientada a pergunta; não deve ser confundido com descoberta completa de um domínio.

### 4.2. Discovery gerenciado e adaptação Waesy

O Crawl gerenciado oferece o desenho mais útil: same-origin por padrão, `max_depth`, `max_pages`, `max_links_per_page`, include/exclude glob e `allowedTypes`. O Waesy já mantém catálogo regional com sitemaps e motores especializados, mas o `automated-harvest.ts` analisado executa principalmente o caminho RSS; o comentário sobre RSS+sitemaps não é evidência suficiente de um crawler de sitemap completo naquele arquivo.

A adaptação recomendada é um **discovery planner determinístico**, com precedência:

```text
fonte oficial/API/PNCP/OSM/RSS/sitemap
  -> URL canonicalizada + hash
  -> filtro de domínio/rota/MIME/robots/allowlist
  -> frontier persistida (parent_id, depth, source_kind)
  -> fetch HTTP
  -> render JS somente sob sinal
  -> parse vertical / links
  -> inserção de novas URLs com UNIQUE canonical_url_hash
```

O LLM pode gerar query ou selecionar uma estratégia como no `SearchGraph`, mas não deve controlar sozinho limites de domínio, aceitação de links ou condições legais.

## 5. Politeness, robots e limites legais

### 5.1. Implementação do projeto analisado

O open source contém `RobotsNode`, que obtém `robots.txt` e consulta um LLM para decidir se o path é permitido; se reprovado, interrompe, salvo configuração explícita de `force_scraping`. Isso é uma **barreira de grafo**, não uma política global: não há no caminho geral de `FetchNodeLevelK` um rate budget por host, respeito documentado a `Crawl-delay`, fila por domínio ou coordenação entre workers. Também não se deve concluir que a presença de Playwright, `undetected_playwright`/Malenia, proxy ou Scrape.do garanta acesso a qualquer site.

A documentação do serviço gerenciado restringe o endpoint Scrape a URLs públicas e documenta same-origin/allowlists no Crawl. Isso reduz superfície, mas continua não sendo autorização para contornar login, paywall, CAPTCHA, controles de acesso, termos contratuais ou proibições legais.

### 5.2. O Waesy já está melhor em resiliência de domínio

O Waesy possui proteções que faltam ou são menos explícitas no executor OSS:

- `crawler-circuit-breaker.ts`: estados `CLOSED`, `OPEN`, `HALF_OPEN`, limiar de três falhas, cooldown de 30 s, timeout leaf de 8 s e contadores por domínio;
- `scraper-utils.ts`: UA rotativo, timeout de 15 s, retryable statuses, backoff, leitura de `Retry-After`, cooldown de 429 de 60 s a 30 min e pausa de 403/Cloudflare;
- `firecrawl-client.ts`: detecta corpo de challenge, registra `isBlocked`/`rateLimited` e faz fallback de provider;
- `integrity-gate.ts`: rejeita conteúdo de CAPTCHA/Cloudflare/paywall e páginas curtas ou poluídas;
- `places-harvester.ts`: usa User-Agent identificável e aplica cooldown quando Nominatim devolve 429;
- `mechanical-extractor.ts`: tem retry de HTTP e fallback Jina Reader.

Essas proteções devem continuar sendo a base. O enriquecimento inspirado pelo ScrapeGraphAI deve adicionar uma decisão de transporte e um registro de motivo, **não aumentar a agressividade**.

### 5.3. Política legal recomendada para qualquer adaptação

O crawler Waesy deve operar apenas em fontes públicas e autorizadas para o caso de uso, respeitar `robots.txt`/termos aplicáveis e identificar-se com User-Agent e contato. Deve parar ou colocar em quarentena quando encontrar login, paywall, CAPTCHA, `403`/challenge ou sinal inequívoco de acesso restrito, salvo autorização explícita do proprietário e configuração documentada. Proxies, cookies, stealth e geolocalização devem ser tratados como recursos de compatibilidade/autorização, não como técnicas para burlar controle de acesso. Em particular, não adotar `force_scraping` como default e não rotacionar IPs para atravessar rate limit.

## 6. Retries, timeouts e backoff

No `ChromiumLoader`, o `retry_limit` efetivo da assinatura é 1, apesar de docstring mencionar 3 em um ponto. O loop repete em exceções e encerra com erro, mas não há backoff exponencial/jitter no browser loader. `ascrape_playwright` aplica timeout assíncrono e usa o `storage_state`; `FetchNode` com `requests` aplica timeout quando configurado, mas não fornece por si só uma política de retry HTTP. `FetchNodeLevelK` captura erro e pula o link, em vez de persistir a falha para retry posterior.

A documentação gerenciada de erros diz que os SDKs tratam 429 com backoff exponencial respeitando `Retry-After`, e 5xx com backoff e número limitado de tentativas. Isso é uma referência de contrato da API, não uma prova de que o executor OSS local faça o mesmo.

**Adaptação para Waesy:** unificar retry em uma política por classe:

| Classe | Ação recomendada |
|---|---|
| Timeout, reset, 502/503/504 | Retry com exponential backoff + jitter, teto e lease renovável |
| 429 | Respeitar `Retry-After`; cooldown por domínio/provider; não fazer rajada de retries |
| 403/challenge/CAPTCHA/login/paywall | `blocked`, sem retry cego; encaminhar para revisão/configuração autorizada |
| HTML vazio, parser incompleto | Retry com transporte alternativo apenas se a política permitir; depois `insufficient_content` |
| Erro de schema/validação | Reprocessar extração limitada ou marcar `needs_review`; não refazer fetch indefinidamente |
| 4xx permanente | `failed_final`/dead-letter com evidência |

O `retry_count` existente deve ser complementado por `attempt`, `last_error_class`, `next_attempt_at`, `retryable`, `provider`, `mode`, `http_status` e `blocked_reason`.

## 7. Browser, rendering e transporte

A seleção de transporte é uma das melhores ideias reutilizáveis do projeto:

1. **HTTP/BeautifulSoup/requests:** caminho barato para HTML server-rendered, quando `use_soup` está ativo.
2. **Plasmate opcional:** engine leve que retorna text/SOM/Markdown/links, aceita seletor CSS/headers/timeout e pode fazer fallback para Chromium. Deve ser tratado como opcional, não como capacidade garantida do ambiente Waesy.
3. **Chromium/Playwright:** abre Chromium ou Firefox, suporta proxy, `storage_state`, espera de load state, JavaScript, `networkidle`, scroll incremental e screenshot/HTML. Em alguns caminhos aplica `Malenia.apply_stealth(context)`.
4. **BrowserBase/Scrape.do:** integrações externas configuradas pelo usuário, com proxy/geografia conforme provider.
5. **Proxy broker/free proxies:** existe utilitário, mas confiabilidade, origem, privacidade e legalidade não são garantidas; não deve ser uma base de produção.

Há duas cautelas importantes. Primeiro, `ChromiumLoader.alazy_load` cria uma tarefa para cada URL e usa `asyncio.gather`; o limite por lote vem do chamador, não do loader. Segundo, `scroll_to_bottom` para pela altura da página e pelo timeout; a própria implementação alerta que lazy loading pode tornar o critério imperfeito.

O Waesy hoje faz **HTTP-first** no extractor mecânico e usa Firecrawl/native-fetch/Steel nos providers. O Steel fallback no `firecrawl-client.ts` retorna uma URL de screenshot e um HTML-placeholder; ele não é um HTML semântico apto para o extractor. Por isso, a adaptação segura é:

```text
native HTTP -> validação de corpo/challenge
   -> se JS necessário e autorizado: Playwright/managed renderer
   -> se provider só entrega screenshot: armazenamento visual/revisão, não parser HTML
```

Registrar sempre `render_mode`, `provider`, `wait_ms`, `scroll_count`, `storage_state_ref` (nunca cookie secreto), `http_status`, `content_type` e `blocked_reason`.

## 8. Extração, chunking e validação

O pipeline OSS separa aquisição de entendimento:

- `ParseNode` limpa/converte HTML e pode coletar links e imagens.
- `split_text_into_chunks.py` faz chunking por tokens via `semchunk`; reduz o tamanho configurado a 90% para margem.
- `GenerateAnswerNode` chama o LLM por chunk em paralelo quando necessário e usa uma etapa de merge.
- `output_parser.py` suporta Pydantic v2 e normaliza uma saída JSON com chaves duplicadas em casos específicos.
- `BatchGenerateAnswerNode` envia vários prompts em uma requisição OpenAI Batch e mantém correlação por `custom_id`.
- O schema JSON/Pydantic orienta campos e permite uma saída tipada, mas não substitui validação semântica, provenance ou integrity gate.

O Waesy tem uma vantagem forte no domínio: `mechanical-extractor.ts` é explicitamente **zero IA** e usa quatro camadas (JSON-LD, metatags/OpenGraph, seletores de domínio e densidade textual), com extratores especializados para Recipe/Event/JobPosting/Lodging. O `integrity-gate` calcula flags/score e o `editorial-squad` aplica IA depois, com Zod, atribuição de fonte e regra contra inventar fatos. A recomendação é não substituir essa sequência por um prompt genérico.

**Padrão recomendado:**

```text
Schema.org/API oficial/selector conhecido
  -> normalização determinística
  -> integrity gate e provenance
  -> LLM JSON Schema somente para campos não resolvidos
  -> validação Zod/Pydantic + confiança por campo
  -> deduplicação e persistência
```

O uso seletivo do Extract gerenciado/LLM local pode cobrir páginas desconhecidas, mas deve receber apenas conteúdo que passou por bloqueio/integridade, com schema fechado, limites de tokens e rejeição de campos sem evidência. O `semantic-deduplicator.ts` do Waesy, baseado em Jaccard/Janela, continua sendo mais previsível para deduplicação editorial do que um merge generativo.

## 9. Observabilidade, auditoria e privacidade

### 9.1. ScrapeGraphAI OSS

O `BaseGraph` e os callbacks capturam tempo, requests bem-sucedidas, tokens de prompt/completion e custo estimado do modelo. O logging central pode ser elevado de WARNING para INFO/DEBUG e aceita handler/propagation. Isso é útil como modelo de **métrica por nó**, mas não é um backend de métricas/traces nem uma execução durável.

Há um ponto de privacidade que precisa ser considerado antes de reutilizar o pacote: `telemetry/telemetry.py` vem habilitada por default, cria um identificador anônimo em `~/.scrapegraphai.conf` e pode enviar em thread daemon para `https://sgai-oss-tracing.onrender.com/v1/telemetry` prompt, schema JSON, conteúdo do site, resposta do LLM, modelo e URL. Existe `disable_telemetry()` e a variável/configuração `SCRAPEGRAPHAI_TELEMETRY_ENABLED=false`, além de limite de 1.000 chamadas por sessão, mas o Waesy não deve enviar conteúdo editorial ou PII a um endpoint externo sem decisão explícita.

### 9.2. Serviço gerenciado

[History](https://docs.scrapegraphai.com/services/history) oferece o desenho desejável de auditoria: `id`, `sessionId`, serviço, status, params, resultado, erro, duração, `requestParentId` e timestamp; entradas filhas de Crawl herdam a sessão e o relacionamento pai, e podem ser reproduzidas sem reexecutar/criar créditos. Monitor expõe atividade, diffs e duração; Crawl expõe páginas e referência individual.

### 9.3. Waesy

O Waesy já persiste `scraper_audit_log`, executa FinOps/contagem de tokens no fluxo editorial, registra provider/status/blocked em `FirecrawlResult`, guarda qualidade e provenance nas entidades e possui circuit breaker com contadores. O que falta é uma visão uniforme por **run -> page -> attempt -> stage -> record**. Sugere-se criar/normalizar:

- `mining_runs`: vertical, trigger, tenant/store, policy version, started/finished/status;
- `crawl_frontier`: run, canonical URL/hash, parent, depth, domain, state, lease, next attempt, status;
- `crawl_attempts`: transport/provider/mode, request/result timings, status, bytes, retry class, block signal;
- `mining_stage_events`: stage/node, input/output refs, duration, token/cost, error class, schema version;
- relações de provenance nos registros finais (`source_url`, `source_domain`, `crawl_page_id`, `run_id`, `extraction_method`, `evidence_hash`).

Não copiar a telemetria externa por padrão; preferir o Supabase existente, logs estruturados e métricas internas com redaction.

## 10. Storage e reprocessamento

No OSS, `data_export.py` exporta listas para JSON/CSV/XML. `cache_path` aparece em configurações/nós, mas não foi localizado como um armazenamento de job/páginas durável e coordenado no executor. Burr pode rastrear estado local, mas o contrato operacional ainda é de processo/aplicação.

No gerenciado, a documentação diz que Crawl persiste páginas e History registra chamadas; Monitor persiste ticks/diffs. Essas garantias não devem ser inferidas para o pacote local.

O Waesy é o sistema com storage mais completo dos dois no escopo analisado: Postgres/Supabase, RLS, tabelas verticais, `crawl_queue`, `mined_raw_extractions`, `scraper_audit_log`, `news_articles`, `directory_listings`, `mined_tenders` e caches específicos como o PNCP em memória por cinco minutos. A adaptação correta é adicionar entidades de execução/frontier, não trocar Postgres por estado de grafo em memória.

## 11. Matriz comparativa

| Dimensão | ScrapeGraphAI OSS | ScrapeGraphAI gerenciado | Waesy atual | Julgamento |
|---|---|---|---|---|
| Orquestração | Grafos de nós e estado em memória | Jobs e serviços API | Queue + workers por vertical + funções | Waesy deve absorver estágio/edge; manter queue |
| Fila | Sem fila durável; semáforo/batch | Crawl assíncrono com frontier persistida | `crawl_queue` persistida, mas claim/lease incompleto | Corrigir atomics/leases e adicionar page frontier |
| Discovery | Links recursivos, busca por query | same-origin, profundidade/páginas/links, include/exclude | RSS, catálogo/sitemaps, APIs, OSM/PNCP | SG fornece contrato de limites; Waesy tem fontes mais relevantes |
| Politeness | Robots node pontual; sem budget global | same-origin/public URL; detalhes de serviço | circuit breaker, cooldown, 429/403, rate limit | Waesy já é melhor; tornar policy central/DB-backed |
| Retry | Browser retry limitado, sem backoff local | SDK documenta backoff 429/5xx | retry/backoff/cooldown no utilitário, falhas da fila sem requeue | Unificar classes, leases e dead-letter |
| Rendering | requests/Plasmate/Playwright/BrowserBase/Scrape.do | fetchConfig `auto/fast/js`, wait, scroll, stealth | Firecrawl/native/Steel; mecânico HTTP-first | Adotar ladder e evidência de render; não usar screenshot como HTML |
| Extração | LLM + schema, chunk/merge, JSON/Pydantic | Extract JSON/formatos múltiplos | parsers determinísticos + integrity + IA editorial | Manter mecânico-first e usar LLM seletivo |
| Anti-bot | Integrações/stealth/proxy, sem garantia | stealth/proxy gerenciado | challenge detection, cooldown, provider fallback | Apenas compatibilidade autorizada; stop em acesso restrito |
| Observabilidade | logs, node timing, tokens/custos; telemetry externa OSS | History, sessão, parent/replay | audit log, FinOps, quality, circuit counters | Adotar trace por run/page/stage; evitar exfiltração |
| Storage | estado/export/Burr opcional | páginas/history/monitor persistidos | Supabase/Postgres/RLS e tabelas verticais | SG inspira schema de provenance; storage Waesy fica |

## 12. Adaptações priorizadas para os mineradores Waesy

### P0 — segurança operacional e correção de fila

1. **Claim atômico:** substituir `select pending` + `update processing` por RPC/transação que retorne apenas itens reclamados; incluir `worker_id`, `lease_until`, `claimed_at`.
2. **Reaper:** job pg_cron que devolve `processing` expirado para retryable ou dead-letter, preservando `attempt` e erro.
3. **Retry explícito:** classificar por timeout/5xx/429/blocked/parser/schema; backoff exponencial com jitter e `Retry-After`; nunca retry cego para CAPTCHA/login/paywall/403 challenge.
4. **Política por domínio:** combinar o circuit breaker atual com um bucket persistente ou coordenado por domínio, com `next_allowed_at`, limite de concorrência e contagem de 429. O semáforo de `GraphIteratorNode` sozinho não resolve isso.
5. **Observabilidade mínima:** cada item deve carregar `run_id`, `page_id`, `attempt_id`, provider, mode, HTTP status, duração, bytes, error class, blocked reason e parser method.

### P1 — frontier e renderização

6. **Adicionar `crawl_frontier`:** `canonical_url_hash` único por run/source, `parent_id`, `depth`, `source_kind`, `same_origin`, include/exclude, MIME e estado. Usar o contrato de página do Crawl gerenciado como referência, sem alegar que ele existe no OSS.
7. **Discovery por camadas:** API oficial/JSON/feed/sitemap antes de HTML; links só depois; canonicalizar host, fragmentos e parâmetros de tracking; limitar `max_depth`, `max_pages` e `max_links_per_page` por policy.
8. **Ladder HTTP -> JS:** usar o fetch mecânico atual primeiro; promover para browser apenas se o corpo for vazio, indicar JS, ou um extractor autorizado exigir; guardar decisão e custo.
9. **Corrigir/testar `only_inside_links`:** verificar hostname de cada URL absoluta contra origem, em vez de descartar todas as absolutas; adicionar testes de relative, same-host, subdomínio, `mailto` e tracking query.
10. **Não usar screenshot como conteúdo:** um provider que só retorna screenshot pode alimentar evidência visual/revisão, mas não deve ser marcado como HTML extraível.

### P1 — qualidade e extração

11. **Grafo de estágio, não grafo gerativo:** modelar `discover -> fetch -> render? -> parse -> integrity -> enrich -> dedupe -> persist` com estado tipado e eventos por nó. As transições condicionais podem usar as ideias do BaseGraph, mas a execução deve continuar durável no banco.
12. **Schema fechado opcional:** adicionar um extractor LLM estruturado para campos desconhecidos após `integrity-gate`, com JSON Schema/Zod, máximo de tokens, campos obrigatórios, evidência por campo e `confidence`.
13. **Chunk/merge auditável:** para páginas grandes, guardar hash/índice de chunks e associar cada campo ao chunk/evidência. Não aceitar um merge que invente valores ausentes.
14. **Provenance e replay:** persistir HTML/Markdown normalizado ou referência de objeto, método de extração e policy version quando permitido; permitir reexecutar parse/validation sem refazer fetch.

### P2 — operação contínua

15. **Monitoramento de mudança:** em vez de copiar o serviço Monitor inteiro, criar policy pg_cron por fonte/canonical URL, guardar hash/versão do conteúdo e diff limitado, com webhook interno opcional.
16. **Sessões correlacionadas:** adotar `run_id` e `parent_run_id` inspirados em `sessionId`/`requestParentId` de History para ligar discovery, páginas e entidades.
17. **Métricas de custo/latência:** consolidar requests, browser seconds, tokens, custo estimado, cache hit, parser pass rate, blocked rate, duplicate rate e publish rate por domínio/vertical.
18. **Privacidade:** desabilitar qualquer telemetry externa do OSS em pipelines Waesy (`SCRAPEGRAPHAI_TELEMETRY_ENABLED=false` se o pacote vier a ser usado) e aplicar redaction de prompt, cookies, tokens, PII e HTML bruto em logs.

## 13. Fluxo alvo sugerido

```text
pg_cron/API/manual trigger
  -> create mining_run(policy_version)
  -> atomic claim crawl_queue item
  -> discover source/API/RSS/sitemap
  -> canonicalize + legal/robots/domain budget check
  -> claim crawl_frontier page with lease
  -> native HTTP fetch
       |-- blocked/challenge/login/paywall -> quarantine + audit, no blind retry
       |-- empty/JS signal -> authorized Playwright/managed renderer
  -> store page attempt + normalized content reference
  -> deterministic vertical parser
       |-- known schema -> specialized extractor
       |-- unknown fields -> bounded JSON-schema LLM extractor
  -> integrity gate + evidence/confidence
  -> dedupe + enrichment/editorial (if policy permits)
  -> idempotent persistence/upsert
  -> emit stage/page/run event
  -> schedule retry/dead-letter or mark complete
```

O grafo é usado para tornar o fluxo explícito e observável; o banco continua sendo a fonte de verdade da fila, lease, status e resultados.

## 14. Critérios de aceitação para a implementação Waesy

Antes de promover uma adaptação, executar testes determinísticos para:

- dois workers concorrentes não processarem o mesmo `crawl_queue.id`;
- worker interrompido ter item recuperado pelo reaper após expirar o lease;
- 429 com `Retry-After` atrasar e não aumentar concorrência;
- 403/CAPTCHA/paywall cair em `blocked` sem rotação agressiva;
- same-origin permitir absoluto interno e rejeitar externo, mantendo relativos;
- canonicalização colapsar tracking params e fragmentos sem colapsar URLs semanticamente diferentes;
- `max_depth`, `max_pages`, `max_links_per_page` e allowlist de MIME serem respeitados;
- parser mecânico continuar sem tokens para Recipe/Event/JobPosting/Lodging/PNCP;
- LLM estruturado rejeitar schema inválido e preservar ausência como `null/unknown`, sem inventar;
- reprocessamento de parse usar conteúdo armazenado sem novo fetch;
- audit trail ligar run, page, attempt, stage e registro persistido;
- nenhum cookie, chave, prompt sensível ou HTML bruto sair por log/telemetria não autorizada.

## 15. Limites e caveats

- O open source e a API hospedada são produtos diferentes. As capacidades de Crawl persistente, History, Monitor, webhooks, diffs, créditos e stealth gerenciado foram tratadas como **managed-only** quando não confirmadas no checkout local.
- `retry_limit` do ChromiumLoader tem uma inconsistência entre docstring e assinatura; a análise usa o valor efetivo do código.
- A existência de Playwright, Malenia, proxy ou provider externo não equivale a bypass garantido de anti-bot. Nenhum mecanismo deve ser usado para ultrapassar controle de acesso sem autorização.
- `FetchNodeLevelK` fornece descoberta simples, não um crawler production-grade; a ressalva de `only_inside_links` deve ser coberta por teste/correção antes de reutilização.
- O relatório não pressupõe que sitemaps catalogados no Waesy sejam efetivamente consumidos por todos os fluxos; o comportamento observado de `automated-harvest.ts` é RSS-oriented.
- Não foi feita medição de benchmark entre engines, nem foi inferida disponibilidade de browsers/binaries na implantação Waesy.

## 16. Fontes primárias e URLs exatas

### ScrapeGraphAI — repositório e código

- Repositório oficial: https://github.com/ScrapeGraphAI/Scrapegraph-ai
- Checkout exato analisado: https://github.com/ScrapeGraphAI/Scrapegraph-ai/tree/194055e203afce41ed4e70365dbc416bad756115
- `BaseGraph`: https://github.com/ScrapeGraphAI/Scrapegraph-ai/blob/194055e203afce41ed4e70365dbc416bad756115/scrapegraphai/graphs/base_graph.py
- `AbstractGraph`: https://github.com/ScrapeGraphAI/Scrapegraph-ai/blob/194055e203afce41ed4e70365dbc416bad756115/scrapegraphai/graphs/abstract_graph.py
- `SearchGraph`: https://github.com/ScrapeGraphAI/Scrapegraph-ai/blob/194055e203afce41ed4e70365dbc416bad756115/scrapegraphai/graphs/search_graph.py
- `FetchNode`: https://github.com/ScrapeGraphAI/Scrapegraph-ai/blob/194055e203afce41ed4e70365dbc416bad756115/scrapegraphai/nodes/fetch_node.py
- `FetchNodeLevelK`: https://github.com/ScrapeGraphAI/Scrapegraph-ai/blob/194055e203afce41ed4e70365dbc416bad756115/scrapegraphai/nodes/fetch_node_level_k.py
- `GraphIteratorNode`: https://github.com/ScrapeGraphAI/Scrapegraph-ai/blob/194055e203afce41ed4e70365dbc416bad756115/scrapegraphai/nodes/graph_iterator_node.py
- `ParseNode`: https://github.com/ScrapeGraphAI/Scrapegraph-ai/blob/194055e203afce41ed4e70365dbc416bad756115/scrapegraphai/nodes/parse_node.py
- `GenerateAnswerNode`: https://github.com/ScrapeGraphAI/Scrapegraph-ai/blob/194055e203afce41ed4e70365dbc416bad756115/scrapegraphai/nodes/generate_answer_node.py
- `BatchGenerateAnswerNode`: https://github.com/ScrapeGraphAI/Scrapegraph-ai/blob/194055e203afce41ed4e70365dbc416bad756115/scrapegraphai/nodes/batch_generate_answer_node.py
- `RobotsNode`: https://github.com/ScrapeGraphAI/Scrapegraph-ai/blob/194055e203afce41ed4e70365dbc416bad756115/scrapegraphai/nodes/robots_node.py
- Chromium/Playwright loader: https://github.com/ScrapeGraphAI/Scrapegraph-ai/blob/194055e203afce41ed4e70365dbc416bad756115/scrapegraphai/docloaders/chromium.py
- Plasmate loader: https://github.com/ScrapeGraphAI/Scrapegraph-ai/blob/194055e203afce41ed4e70365dbc416bad756115/scrapegraphai/docloaders/plasmate.py
- Scrape.do loader: https://github.com/ScrapeGraphAI/Scrapegraph-ai/blob/194055e203afce41ed4e70365dbc416bad756115/scrapegraphai/docloaders/scrape_do.py
- Proxy rotation: https://github.com/ScrapeGraphAI/Scrapegraph-ai/blob/194055e203afce41ed4e70365dbc416bad756115/scrapegraphai/utils/proxy_rotation.py
- Token chunking: https://github.com/ScrapeGraphAI/Scrapegraph-ai/blob/194055e203afce41ed4e70365dbc416bad756115/scrapegraphai/utils/split_text_into_chunks.py
- Output parser: https://github.com/ScrapeGraphAI/Scrapegraph-ai/blob/194055e203afce41ed4e70365dbc416bad756115/scrapegraphai/utils/output_parser.py
- LLM callback manager: https://github.com/ScrapeGraphAI/Scrapegraph-ai/blob/194055e203afce41ed4e70365dbc416bad756115/scrapegraphai/utils/llm_callback_manager.py
- Custom callback/costs: https://github.com/ScrapeGraphAI/Scrapegraph-ai/blob/194055e203afce41ed4e70365dbc416bad756115/scrapegraphai/utils/custom_callback.py
- Logging: https://github.com/ScrapeGraphAI/Scrapegraph-ai/blob/194055e203afce41ed4e70365dbc416bad756115/scrapegraphai/utils/logging.py
- Data export: https://github.com/ScrapeGraphAI/Scrapegraph-ai/blob/194055e203afce41ed4e70365dbc416bad756115/scrapegraphai/utils/data_export.py
- Burr bridge: https://github.com/ScrapeGraphAI/Scrapegraph-ai/blob/194055e203afce41ed4e70365dbc416bad756115/scrapegraphai/integrations/burr_bridge.py
- Telemetry: https://github.com/ScrapeGraphAI/Scrapegraph-ai/blob/194055e203afce41ed4e70365dbc416bad756115/scrapegraphai/telemetry/telemetry.py

### ScrapeGraphAI — documentação oficial

- Índice oficial: https://docs.scrapegraphai.com/llms.txt
- Introdução: https://docs.scrapegraphai.com/introduction
- Scrape: https://docs.scrapegraphai.com/services/scrape
- Scrape API reference: https://docs.scrapegraphai.com/api-reference/endpoint/scrape
- Extract: https://docs.scrapegraphai.com/services/extract
- Crawl: https://docs.scrapegraphai.com/services/crawl
- Crawl management: https://docs.scrapegraphai.com/api-reference/endpoint/crawl/manage
- Error handling: https://docs.scrapegraphai.com/api-reference/errors
- History: https://docs.scrapegraphai.com/services/history
- Monitor: https://docs.scrapegraphai.com/services/monitor
- Python SDK: https://docs.scrapegraphai.com/sdks/python

### Waesy — arquivos locais examinados

- `/home/ubuntu/waesy-audit/SYSTEM_INVENTORY.md`
- `/home/ubuntu/waesy-audit/src/services/mining/crawler-batch-engine.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/automated-harvest.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/mechanical-extractor.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/integrity-gate.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/semantic-deduplicator.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/editorial-squad.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/specialized-extractors.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/places-harvester.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/pncp-extractor.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/pncp-harvester.ts`
- `/home/ubuntu/waesy-audit/src/services/mining/react-mining-adapter.ts`
- `/home/ubuntu/waesy-audit/src/lib/mining/firecrawl-client.ts`
- `/home/ubuntu/waesy-audit/src/lib/mining/crawler-circuit-breaker.ts`
- `/home/ubuntu/waesy-audit/src/lib/mining/scraper-utils.ts`
- `/home/ubuntu/waesy-audit/src/services/ai-react-loop.ts`

## Veredito

O ScrapeGraphAI deve ser incorporado ao Waesy como **referência de desenho** e, se necessário, como componente limitado de extração/renderização, não como substituto da plataforma de crawling. O ganho mais seguro é formalizar no Waesy um grafo de etapas com estado tipado, contratos de frontier e provenance, usando a infraestrutura Postgres já existente para fila, lease, backoff, politeness, auditoria e reprocessamento. A extração mecânica, os extratores de Schema.org/PNCP/OSM e o integrity gate permanecem como primeira linha; LLM e browser entram apenas por policy, com limites, evidência e respeito a controles de acesso.
