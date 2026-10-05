# Relatório Forense de Auditoria — Crawlers & Mineradores
**Gerado em:** 2026-10-04T02:31:29.932Z
**Execução:** Real ao vivo — Chapecó/SC — Supabase `jfuebqmltksyznovhlwa`

## Resumo Executivo

| Métrica | Valor |
|---|---|
| Total de engines/harvesters auditados | 37 |
| Status OK | 27 |
| Status PARTIAL | 8 |
| Status ERROR | 2 |
| Total de gaps identificados | 16 |

## Matriz de Saúde

| Engine/Harvester | Layer | Status | Latência (ms) | Registros | Gaps |
|---|---|---|---|---|---|
| `market-data-miner.engine` | engine | ✅ OK | 761 | 5 | 0 |
| `economic-indicators-persister` | harvester | ✅ OK | 789 | 5 | 0 |
| `rss-ingester [g1.globo.com]` | engine | ✅ OK | 135 | 100 | 1 |
| `rss-ingester [www.nsctotal.com.br]` | engine | ✅ OK | 136 | 20 | 0 |
| `rss-ingester [www.rbs.com.br]` | engine | ❌ ERROR | 7207 | — | 1 |
| `rss-ingester [www.diariocatarinense.com.br]` | engine | ❌ ERROR | 7236 | — | 1 |
| `rss-ingester [chapecoonline.com.br]` | engine | ✅ OK | 1129 | 10 | 1 |
| `rss-ingester.discoverFeeds` | engine | ✅ OK | 3490 | 2 | 0 |
| `cnpj-enrichment [83102572...]` | engine | ⚠️ PARTIAL | 445 | — | 1 |
| `cnpj-enrichment [10643978...]` | engine | ⚠️ PARTIAL | 420 | — | 1 |
| `cnpj-enrichment [00000000...]` | engine | ✅ OK | 37 | — | 0 |
| `intent-classifier [news]` | engine | ✅ OK | 0 | — | 0 |
| `intent-classifier [job]` | engine | ✅ OK | 0 | — | 0 |
| `intent-classifier [product]` | engine | ✅ OK | 0 | — | 0 |
| `intent-classifier [event]` | engine | ✅ OK | 0 | — | 0 |
| `intent-classifier [business]` | engine | ✅ OK | 0 | — | 0 |
| `social-content-miner [instagram]` | engine | ✅ OK | 662 | — | 1 |
| `social-content-miner [youtube]` | engine | ✅ OK | 341 | — | 0 |
| `social-content-miner [linkedin]` | engine | ✅ OK | 359 | — | 1 |
| `firecrawl-client [chapecoonline.com.br]` | engine | ✅ OK | 1518 | — | 0 |
| `firecrawl-client [g1.globo.com]` | engine | ✅ OK | 854 | — | 0 |
| `firecrawl-client [pncp.gov.br]` | engine | ✅ OK | 745 | — | 0 |
| `mechanical-extractor [chapecoonline.com.br]` | extractor | ✅ OK | 3748 | — | 0 |
| `mechanical-extractor [g1.globo.com]` | extractor | ⚠️ PARTIAL | 6120 | — | 2 |
| `pncp-harvester` | harvester | ✅ OK | 585 | 10 | 0 |
| `job-opportunity-extractor [www.vagas.com.br]` | extractor | ✅ OK | 1138 | — | 0 |
| `job-opportunity-extractor [br.indeed.com]` | extractor | ✅ OK | 1183 | — | 0 |
| `job-opportunity-extractor [www.catho.com.br]` | extractor | ⚠️ PARTIAL | 536 | — | 1 |
| `places-harvester` | harvester | ⚠️ PARTIAL | 215 | 0 | 2 |
| `datajud-harvester` | harvester | ⚠️ PARTIAL | 13792 | — | 1 |
| `real-estate-harvester` | harvester | ✅ OK | 1378 | — | 0 |
| `auction-harvester` | harvester | ✅ OK | 665 | — | 0 |
| `places-cnpj-cross-enricher` | harvester | ✅ OK | 77 | — | 0 |
| `semantic-deduplicator` | extractor | ✅ OK | 123 | — | 0 |
| `specialized-extractor.recipe` | extractor | ⚠️ PARTIAL | 903 | — | 1 |
| `specialized-extractor.event` | extractor | ⚠️ PARTIAL | 1077 | — | 0 |
| `crawler-batch-engine` | harvester | ✅ OK | 2907 | 3 | 1 |

---
## market-data-miner.engine
**Layer:** engine | **Status:** OK | **Latência:** 761ms | **Registros:** 5

### Propostas de Melhoria
- Adicionar IGP-DI (código 190) e INCC (192)
- Incluir Taxa CDI (série 12) e Taxa IPCA-15 (série 13522)
- Calcular variação 30d vs 12m para contexto de inflação
- Cache Redis/KV com TTL=3h para evitar rate limit BCB
- Webhook para alertar quando Selic muda (critical event)

---
## economic-indicators-persister
**Layer:** harvester | **Status:** OK | **Latência:** 789ms | **Registros:** 5

### Propostas de Melhoria
- Adicionar campo 'forecast_median' com expectativa Focus BCB
- Persistir série temporal completa (30 pontos) em JSONB
- Trigger de notificação quando variação > 5%
- Dashboard endpoint para frontend sem re-fetch BCB

---
## rss-ingester [g1.globo.com]
**Layer:** engine | **Status:** OK | **Latência:** 135ms | **Registros:** 100

### Campos Nulos/Vazios
- `contentEncoded`
### Gaps Identificados
- Muitos itens sem imageUrl — impacta UI
### Propostas de Melhoria
- Parser de Atom feed além de RSS 2.0
- Extração de imagem OG como fallback de imageUrl
- Categorização automática via intent-classifier
- Deduplicação por guid + URL canônica
- Score de relevância local (menciona Chapecó/SC?)

---
## rss-ingester [www.nsctotal.com.br]
**Layer:** engine | **Status:** OK | **Latência:** 136ms | **Registros:** 20

### Campos Nulos/Vazios
- `contentEncoded`
### Propostas de Melhoria
- Parser de Atom feed além de RSS 2.0
- Extração de imagem OG como fallback de imageUrl
- Categorização automática via intent-classifier
- Deduplicação por guid + URL canônica
- Score de relevância local (menciona Chapecó/SC?)

---
## rss-ingester [www.rbs.com.br]
**Layer:** engine | **Status:** ERROR | **Latência:** 7207ms | **Registros:** N/A

### Erro
```
Error: Falha ao buscar feed https://www.rbs.com.br/santacatarina/feed/: HTTP 503
```
### Gaps Identificados
- ERRO: Error: Falha ao buscar feed https://www.rbs.com.br/santacatarina/feed/: HTTP 503
### Propostas de Melhoria
- Parser de Atom feed além de RSS 2.0
- Extração de imagem OG como fallback de imageUrl
- Categorização automática via intent-classifier
- Deduplicação por guid + URL canônica
- Score de relevância local (menciona Chapecó/SC?)

---
## rss-ingester [www.diariocatarinense.com.br]
**Layer:** engine | **Status:** ERROR | **Latência:** 7236ms | **Registros:** N/A

### Erro
```
TypeError: fetch failed
```
### Gaps Identificados
- ERRO: TypeError: fetch failed
### Propostas de Melhoria
- Parser de Atom feed além de RSS 2.0
- Extração de imagem OG como fallback de imageUrl
- Categorização automática via intent-classifier
- Deduplicação por guid + URL canônica
- Score de relevância local (menciona Chapecó/SC?)

---
## rss-ingester [chapecoonline.com.br]
**Layer:** engine | **Status:** OK | **Latência:** 1129ms | **Registros:** 10

### Campos Nulos/Vazios
- `imageUrl`
### Gaps Identificados
- Muitos itens sem imageUrl — impacta UI
### Propostas de Melhoria
- Parser de Atom feed além de RSS 2.0
- Extração de imagem OG como fallback de imageUrl
- Categorização automática via intent-classifier
- Deduplicação por guid + URL canônica
- Score de relevância local (menciona Chapecó/SC?)

---
## rss-ingester.discoverFeeds
**Layer:** engine | **Status:** OK | **Latência:** 3490ms | **Registros:** 2

### Propostas de Melhoria
- Tentar /feed, /rss, /atom como fallback quando auto-discovery falha
- Salvar feeds descobertos automaticamente em rss_feeds do banco
- Periodicidade de re-discovery a cada 7 dias

---
## cnpj-enrichment [83102572...]
**Layer:** engine | **Status:** PARTIAL | **Latência:** 445ms | **Registros:** N/A

### Campos Nulos/Vazios
- `RESULT_NULL`
### Gaps Identificados
- CNPJ 83102572000107 retornou null — API indisponível ou CNPJ inativo
### Propostas de Melhoria
- Cascading: BrasilAPI → ReceitaWS → CNPJ.JA como fallback
- Cache local com TTL=24h para evitar rate limit
- Enriquecer com CNAE secundário + situação cadastral
- Filtrar CNPJs inativos (situação !== 'ATIVA') antes de persistir
- Score de qualidade ponderado por campos críticos (telefone, email, cnae)

---
## cnpj-enrichment [10643978...]
**Layer:** engine | **Status:** PARTIAL | **Latência:** 420ms | **Registros:** N/A

### Campos Nulos/Vazios
- `RESULT_NULL`
### Gaps Identificados
- CNPJ 10643978000153 retornou null — API indisponível ou CNPJ inativo
### Propostas de Melhoria
- Cascading: BrasilAPI → ReceitaWS → CNPJ.JA como fallback
- Cache local com TTL=24h para evitar rate limit
- Enriquecer com CNAE secundário + situação cadastral
- Filtrar CNPJs inativos (situação !== 'ATIVA') antes de persistir
- Score de qualidade ponderado por campos críticos (telefone, email, cnae)

---
## cnpj-enrichment [00000000...]
**Layer:** engine | **Status:** OK | **Latência:** 37ms | **Registros:** N/A

### Campos Nulos/Vazios
- `email`
### Propostas de Melhoria
- Cascading: BrasilAPI → ReceitaWS → CNPJ.JA como fallback
- Cache local com TTL=24h para evitar rate limit
- Enriquecer com CNAE secundário + situação cadastral
- Filtrar CNPJs inativos (situação !== 'ATIVA') antes de persistir
- Score de qualidade ponderado por campos críticos (telefone, email, cnae)

---
## intent-classifier [news]
**Layer:** engine | **Status:** OK | **Latência:** 0ms | **Registros:** N/A

### Propostas de Melhoria
- Adicionar Camada 2.5: análise de title+H1 com regex antes do AI fallback
- Cache de classificações por URL hash para evitar re-classificar a mesma URL
- Treinar regras específicas para portais locais catarinenses
- Adicionar tipo 'recipe', 'real_estate', 'auction' ao enum MinedEntityType
- Métricas de acurácia por tipo no scraper_audit_log

---
## intent-classifier [job]
**Layer:** engine | **Status:** OK | **Latência:** 0ms | **Registros:** N/A

### Propostas de Melhoria
- Adicionar Camada 2.5: análise de title+H1 com regex antes do AI fallback
- Cache de classificações por URL hash para evitar re-classificar a mesma URL
- Treinar regras específicas para portais locais catarinenses
- Adicionar tipo 'recipe', 'real_estate', 'auction' ao enum MinedEntityType
- Métricas de acurácia por tipo no scraper_audit_log

---
## intent-classifier [product]
**Layer:** engine | **Status:** OK | **Latência:** 0ms | **Registros:** N/A

### Propostas de Melhoria
- Adicionar Camada 2.5: análise de title+H1 com regex antes do AI fallback
- Cache de classificações por URL hash para evitar re-classificar a mesma URL
- Treinar regras específicas para portais locais catarinenses
- Adicionar tipo 'recipe', 'real_estate', 'auction' ao enum MinedEntityType
- Métricas de acurácia por tipo no scraper_audit_log

---
## intent-classifier [event]
**Layer:** engine | **Status:** OK | **Latência:** 0ms | **Registros:** N/A

### Propostas de Melhoria
- Adicionar Camada 2.5: análise de title+H1 com regex antes do AI fallback
- Cache de classificações por URL hash para evitar re-classificar a mesma URL
- Treinar regras específicas para portais locais catarinenses
- Adicionar tipo 'recipe', 'real_estate', 'auction' ao enum MinedEntityType
- Métricas de acurácia por tipo no scraper_audit_log

---
## intent-classifier [business]
**Layer:** engine | **Status:** OK | **Latência:** 0ms | **Registros:** N/A

### Propostas de Melhoria
- Adicionar Camada 2.5: análise de title+H1 com regex antes do AI fallback
- Cache de classificações por URL hash para evitar re-classificar a mesma URL
- Treinar regras específicas para portais locais catarinenses
- Adicionar tipo 'recipe', 'real_estate', 'auction' ao enum MinedEntityType
- Métricas de acurácia por tipo no scraper_audit_log

---
## social-content-miner [instagram]
**Layer:** engine | **Status:** OK | **Latência:** 662ms | **Registros:** N/A

### Campos Nulos/Vazios
- `title`
- `description`
- `avatarUrl`
### Gaps Identificados
- description null — bio não extraída
### Propostas de Melhoria
- Instagram: usar endpoint /api/v1/users/web_profile_info/ via cookie autenticado
- YouTube: YouTube Data API v3 com chave gratuita (quota 10k/dia)
- LinkedIn: scraping via Nitter/cache proxy para evitar bot block
- TikTok: oembed API pública para métricas de vídeos
- Persistir em store_social_profiles ou directory_listings.social_links
- Score de engajamento calculado de followers + posts recentes

---
## social-content-miner [youtube]
**Layer:** engine | **Status:** OK | **Latência:** 341ms | **Registros:** N/A

### Campos Nulos/Vazios
- `handleOrId`
### Propostas de Melhoria
- Instagram: usar endpoint /api/v1/users/web_profile_info/ via cookie autenticado
- YouTube: YouTube Data API v3 com chave gratuita (quota 10k/dia)
- LinkedIn: scraping via Nitter/cache proxy para evitar bot block
- TikTok: oembed API pública para métricas de vídeos
- Persistir em store_social_profiles ou directory_listings.social_links
- Score de engajamento calculado de followers + posts recentes

---
## social-content-miner [linkedin]
**Layer:** engine | **Status:** OK | **Latência:** 359ms | **Registros:** N/A

### Gaps Identificados
- description null — bio não extraída
### Propostas de Melhoria
- Instagram: usar endpoint /api/v1/users/web_profile_info/ via cookie autenticado
- YouTube: YouTube Data API v3 com chave gratuita (quota 10k/dia)
- LinkedIn: scraping via Nitter/cache proxy para evitar bot block
- TikTok: oembed API pública para métricas de vídeos
- Persistir em store_social_profiles ou directory_listings.social_links
- Score de engajamento calculado de followers + posts recentes

---
## firecrawl-client [chapecoonline.com.br]
**Layer:** engine | **Status:** OK | **Latência:** 1518ms | **Registros:** N/A

### Propostas de Melhoria
- Jina Reader fallback já implementado — verificar se está ativo
- Circuit breaker por domínio: já implementado via globalCrawlerCircuitBreaker
- Rotação de User-Agent mais agressiva (mobile, tablet, bot-allowed)
- Proxy rotation para sites com rate limit por IP
- Cache de HTML por 1h para domínios frequentes
- Puppeteer/Playwright como último recurso para SPAs (ex: pncp.gov.br)

---
## firecrawl-client [g1.globo.com]
**Layer:** engine | **Status:** OK | **Latência:** 854ms | **Registros:** N/A

### Propostas de Melhoria
- Jina Reader fallback já implementado — verificar se está ativo
- Circuit breaker por domínio: já implementado via globalCrawlerCircuitBreaker
- Rotação de User-Agent mais agressiva (mobile, tablet, bot-allowed)
- Proxy rotation para sites com rate limit por IP
- Cache de HTML por 1h para domínios frequentes
- Puppeteer/Playwright como último recurso para SPAs (ex: pncp.gov.br)

---
## firecrawl-client [pncp.gov.br]
**Layer:** engine | **Status:** OK | **Latência:** 745ms | **Registros:** N/A

### Propostas de Melhoria
- Jina Reader fallback já implementado — verificar se está ativo
- Circuit breaker por domínio: já implementado via globalCrawlerCircuitBreaker
- Rotação de User-Agent mais agressiva (mobile, tablet, bot-allowed)
- Proxy rotation para sites com rate limit por IP
- Cache de HTML por 1h para domínios frequentes
- Puppeteer/Playwright como último recurso para SPAs (ex: pncp.gov.br)

---
## mechanical-extractor [chapecoonline.com.br]
**Layer:** extractor | **Status:** OK | **Latência:** 3748ms | **Registros:** N/A

### Campos Nulos/Vazios
- `author`
### Propostas de Melhoria
- Extração de data de publicação com 4 padrões (JSON-LD, meta, OpenGraph, heurístico)
- Análise de paywall: se >50% do texto está hidden/blur, marcar como 'paywalled'
- Score de relevância local: boost se menciona 'Chapecó', 'SC', 'catarinense'
- Extração de autor com link para perfil e mini-bio
- Detecção de conteúdo publicitário (sponsored/advertorial) para filtrar

---
## mechanical-extractor [g1.globo.com]
**Layer:** extractor | **Status:** PARTIAL | **Latência:** 6120ms | **Registros:** N/A

### Campos Nulos/Vazios
- `lead`
- `bodyMarkdown`
- `bodyText`
- `author`
- `coverImageUrl`
- `galleryImages`
### Gaps Identificados
- Integrity Gate REPROVADO: Conteúdo mecânico insuficiente (0 palavras). A matéria exige apuração completa com múltiplos parágrafos.
- coverImageUrl null — sem imagem de capa extraída
### Propostas de Melhoria
- Extração de data de publicação com 4 padrões (JSON-LD, meta, OpenGraph, heurístico)
- Análise de paywall: se >50% do texto está hidden/blur, marcar como 'paywalled'
- Score de relevância local: boost se menciona 'Chapecó', 'SC', 'catarinense'
- Extração de autor com link para perfil e mini-bio
- Detecção de conteúdo publicitário (sponsored/advertorial) para filtrar

---
## pncp-harvester
**Layer:** harvester | **Status:** OK | **Latência:** 585ms | **Registros:** 10

### Propostas de Melhoria
- Extrair items/lotes do edital (já existe fetchPncpContractItems) — integrar no payload mined_tenders
- Adicionar scraping do PDF do edital para extrair especificações técnicas
- Alertas automáticos para licitações de categorias estratégicas (obras, TI, saúde)
- Paginação automática até limite de 100 editais mais recentes
- Expandir para outros municípios da região (Xanxerê, Pinhalzinho, São Carlos)
- Campo 'status' computado: aberto, encerrado, suspenso (via data de encerramento)

---
## job-opportunity-extractor [www.vagas.com.br]
**Layer:** extractor | **Status:** OK | **Latência:** 1138ms | **Registros:** N/A

### Campos Nulos/Vazios
- `job.salaryMinCents`
- `job.salaryMaxCents`
- `job.requirements`
- `job.benefits`
- `job.contactWhatsapp`
- `job.contactEmail`
### Propostas de Melhoria
- Usar Indeed RSS feed (https://br.indeed.com/rss?q=chapeco&l=SC) em vez de HTML scraping
- Integrar API Catho (disponível via parceria) para vagas estruturadas
- Extrair múltiplas vagas de uma página-lista, não só a primeira
- Deduplicate por hash(título+empresa+cidade) com janela 7d
- Salário mínimo local por cargo (benchmarking com CAGED SC)
- Análise de demanda de habilidades (quais skills mais pedidas em Chapecó)

---
## job-opportunity-extractor [br.indeed.com]
**Layer:** extractor | **Status:** OK | **Latência:** 1183ms | **Registros:** N/A

### Campos Nulos/Vazios
- `job.salaryMinCents`
- `job.salaryMaxCents`
- `job.requirements`
- `job.benefits`
- `job.contactWhatsapp`
- `job.contactEmail`
### Propostas de Melhoria
- Usar Indeed RSS feed (https://br.indeed.com/rss?q=chapeco&l=SC) em vez de HTML scraping
- Integrar API Catho (disponível via parceria) para vagas estruturadas
- Extrair múltiplas vagas de uma página-lista, não só a primeira
- Deduplicate por hash(título+empresa+cidade) com janela 7d
- Salário mínimo local por cargo (benchmarking com CAGED SC)
- Análise de demanda de habilidades (quais skills mais pedidas em Chapecó)

---
## job-opportunity-extractor [www.catho.com.br]
**Layer:** extractor | **Status:** PARTIAL | **Latência:** 536ms | **Registros:** N/A

### Gaps Identificados
- Extração falhou: Não foi possível extrair dados de vaga de https://www.catho.com.br/vagas-de-emprego/chapeco-sc/. Conteúdo sem indicadores de contratação.
### Propostas de Melhoria
- Usar Indeed RSS feed (https://br.indeed.com/rss?q=chapeco&l=SC) em vez de HTML scraping
- Integrar API Catho (disponível via parceria) para vagas estruturadas
- Extrair múltiplas vagas de uma página-lista, não só a primeira
- Deduplicate por hash(título+empresa+cidade) com janela 7d
- Salário mínimo local por cargo (benchmarking com CAGED SC)
- Análise de demanda de habilidades (quais skills mais pedidas em Chapecó)

---
## places-harvester
**Layer:** harvester | **Status:** PARTIAL | **Latência:** 215ms | **Registros:** 0

### Gaps Identificados
- Campos nulos no DB: latitude, longitude
- 0 lugares inseridos — Overpass timeout ou limite de rate
### Propostas de Melhoria
- Expandir amenity tags: atm, bank, pharmacy, hospital, fuel, school, supermarket
- Adicionar coleta de horário de funcionamento (opening_hours tag do OSM)
- Score de completude por lugar: 100% se tem phone + website + category + coords
- Vincular automaticamente ao CNPJ enricher via cross-enricher
- Importar avaliações (Google Maps Places API gratuita tem 5k/mês)
- Salvar bbox das buscas para evitar re-fetch de área já coberta

---
## datajud-harvester
**Layer:** harvester | **Status:** PARTIAL | **Latência:** 13792ms | **Registros:** N/A

### Campos Nulos/Vazios
- `lawsuit`
### Gaps Identificados
- DataJud falhou: [object Object]
### Propostas de Melhoria
- Busca em massa por vara (unidade: 0018 = Chapecó) sem número de processo específico
- Alerta de processo para empresas cadastradas na plataforma (vincular por CNPJ)
- Extração de valor da causa e tipo de ação para análise de risco
- Pesquisa por CPF/CNPJ de partes em vez de número do processo
- Dashboard de processos ativos por empresa/nicho

---
## real-estate-harvester
**Layer:** harvester | **Status:** OK | **Latência:** 1378ms | **Registros:** N/A

### Propostas de Melhoria
- Integrar Zap Imóveis, Viva Real e OLX simultaneamente
- Extrair preço por m², localização (bairro), tipo (casa/apto), quartos, garagem
- Calcular índice de preço médio por bairro (IVB - Índice Waesy de Valorização)
- Alertas de preço: notificar quando imóvel novo abaixo do preço médio do bairro
- Vincular com CNPJ da imobiliária anunciante para cross-reference
- Scraping de Schema.org RealEstateListing para dados estruturados

---
## auction-harvester
**Layer:** harvester | **Status:** OK | **Latência:** 665ms | **Registros:** N/A

### Propostas de Melhoria
- Integrar Leilão Vip, Lance e Leilão, Superbid Exchange
- Leilões judiciais via portal TJSC (e-proc)
- Extração de: bem leiloado, avaliação, lance mínimo, data do leilão, comissão
- Schema: criar tabela mined_auctions separada com campos específicos
- Alertas de leilão por categoria (imóvel, veículo, maquinário)
- Integrar com Nota Fiscal de arrematação via SEFAZ

---
## places-cnpj-cross-enricher
**Layer:** harvester | **Status:** OK | **Latência:** 77ms | **Registros:** N/A

### Propostas de Melhoria
- Cruzar por nome fantasia quando CNPJ não está disponível (Levenshtein similarity)
- Enriquecer com data de abertura e capital social do CNPJ
- Identificar CNPJs com situação 'BAIXADA' para marcar como inativo no diretório
- Score de confiança do match: exato CNPJ=100%, por nome=60-80%
- Persistir cnae_principal como tag de categoria no directory_listings

---
## semantic-deduplicator
**Layer:** extractor | **Status:** OK | **Latência:** 123ms | **Registros:** N/A

### Propostas de Melhoria
- Substituir Jaccard por TF-IDF cosine similarity para maior precisão
- Embeddings semânticos (BERT/paraphrase-multilingual) para duplicatas parafraseadas
- Janela temporal configurável por vertical (notícias=48h, editais=7d)
- Persistir clusters em tabela story_clusters para rastrear cobertura de eventos
- Score de relevância local incrementado para notícias de Chapecó

---
## specialized-extractor.recipe
**Layer:** extractor | **Status:** PARTIAL | **Latência:** 903ms | **Registros:** N/A

### Campos Nulos/Vazios
- `ALL`
### Gaps Identificados
- Receita null — sem Schema.org Recipe no HTML
### Propostas de Melhoria
- Extração de nutrição (NutritionInformation Schema.org) e calorias por porção
- Sugestão automática de ingredientes disponíveis em parceiros locais de Chapecó
- BOM (Bill of Materials) de receitas para stock de supermercado
- Categorização automática: sobremesa, refeição, bebida, lanche
- Score de dificuldade baseado em número de passos e ingredientes

---
## specialized-extractor.event
**Layer:** extractor | **Status:** PARTIAL | **Latência:** 1077ms | **Registros:** N/A

### Campos Nulos/Vazios
- `ALL`
### Propostas de Melhoria
- Integrar ticketing APIs: Sympla, Blueticket, Ingresso.com (APIs públicas disponíveis)
- Extração de capacidade máxima e ingressos restantes
- Alertas de evento próximo para usuários do app por geolocalização
- Importar agenda oficial da Prefeitura de Chapecó (RSS/JSON público)
- Classificação de evento: show, esportivo, corporativo, cultural, gastronomia

---
## crawler-batch-engine
**Layer:** harvester | **Status:** OK | **Latência:** 2907ms | **Registros:** 3

### Gaps Identificados
- Falha no item https://valor.globo.com/rss/: Falha ao buscar feed https://valor.globo.com/rss/: HTTP 404
### Propostas de Melhoria
- Priority queue: processar primeiro itens por prioridade (1=alta, 3=normal, 5=baixa)
- Dead-letter queue: após 3 falhas, mover para dead_letter_queue com diagnóstico
- Paralelismo controlado: processar N itens em paralelo com Promise.allSettled
- Categoria de falha: timeout vs HTTP4xx vs parse_error vs DB_error
- Dashboard de saúde da fila em tempo real (pending, processing, failed, done)
- Auto-seeding: adicionar URLs novas via discovery automático de sitemap.xml
