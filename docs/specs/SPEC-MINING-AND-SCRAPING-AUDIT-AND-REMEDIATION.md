# SPEC-MINING-AND-SCRAPING-AUDIT-AND-REMEDIATION
## Auditoria Forense Completa, Remediação e Elevação de Qualidade dos Mineradores Waesy

### 1. Metadados e Controle
- **ID da Spec:** SPEC-MINING-AND-SCRAPING-AUDIT-AND-REMEDIATION
- **Data:** 2026-10-15
- **Status:** Aprovada
- **Autoridade:** Antigravity AI Pair Programmer
- **Escopo Delimitado:**
  - `src/services/mining/job-opportunity-extractor.ts`
  - `src/services/mining/places-harvester.ts`
  - `src/services/mining/places-cnpj-cross-enricher.ts`
  - `src/services/mining/crawler-batch-engine.ts`
  - `src/services/mining.functions.ts`
  - `src/services/crawler-sources.functions.ts`
  - `src/routes/api.cron.mining-worker.ts`
  - `src/services/mining-and-copilot-remediation.test.ts`
  - `docs/design/DECISIONS.md`

---

### 2. Diagnóstico Empírico da Base em Produção
A auditoria profunda via conexão direta ao banco Supabase revelou o seguinte inventário:

1. **`crawl_queue` (8.110 registros):**
   - 100% dos 1.000 itens recentes analisados estão em estado `pending`.
   - 453 itens foram resgatados de travamento pelo CrawlerReaper do DEC-212.
   - A fila permaneceu ociosa devido à ausência de disparo automatizado contínuo do endpoint worker após correção de 503.
   - Domínios reais mapeados: G1 Globo, ND Mais, ClicRDC, SCC10, Vagas.com, Indeed.

2. **`crawler_sources` (74 registros):**
   - 74 fontes cadastradas e 100% ativas (`is_active: true`).
   - 100% das fontes estavam com `last_fetched_at: Nunca` e `items_indexed_count: 0`, pois a rotina de polling automático não estava conectada ao despachador cron central.

3. **`news_articles` (49 registros):**
   - Qualidade textual e visual excelente: 100% com imagens de capa reais (resoluções 1200x, 1920x), 100% com subtítulos, textos ricos entre 1.400 e 2.051 caracteres, scores de qualidade entre 88 e 98.
   - Data do último lote: 30/09/2026. A fila necessita de drenagem ativa para publicar as notícias de outubro.

4. **`directory_listings` (37 registros):**
   - Estabelecimentos cadastrados: 18 via Overpass/OpenStreetMap, 8 leilões, 6 imobiliárias, 3 manuais, 2 Nominatim.
   - **Gargalos Críticos de Qualidade Identificados:**
     - 0% possuem CNPJ cadastrado.
     - 94.6% sem logotipo ou avatar (`avatar_url: null`).
     - 97.3% sem banner.
     - 100% sem fotos.
     - 73% com descrições ausentes ou genéricas.
     - Mapeamento de categorias OSM gerava `category: "geral"` por falta de de-para para tags em inglês (`restaurant`, `cafe`, `supermarket`, `pharmacy`, etc.).

5. **`jobs` (Vagas de Emprego):**
   - Falha arquitetural no `job-opportunity-extractor.ts`: páginas de busca de portais (como `vagas.com.br/vagas-em-chapeco-sc` e `br.indeed.com/empregos-em-Chapecó,-SC`) eram tratadas como uma vaga individual.
   - Títulos corrompidos: `"1 vaga de emprego para chapeco sc"`.
   - Salário corrompido: `"Pular para o conteúdo Vagas.com Menu Cad"`.
   - Descrição corrompida: dump cru do cabeçalho de navegação e banners de cookies com `requirements: []`.

---

### 3. Requisitos EARS (Easy Approach to Requirements Syntax)

- **R1 (Detecção de Páginas de Listagem de Vagas):**
  - *Sintaxe EARS:* QUANDO o `job-opportunity-extractor.ts` processar uma URL de portal de vagas que represente uma listagem, busca ou catálogo de múltiplos postos, o sistema DEVE identificar a página como índice, extrair os links individuais de cada vaga para enfileiramento na `crawl_queue` com prioridade alta, e NUNCA persistir a página de índice como um registro de vaga na tabela `jobs`.

- **R2 (Blindagem de Detecção de Salário):**
  - *Sintaxe EARS:* QUANDO nenhum padrão numérico de salário em Real (BRL) for encontrado na extração mecânica, a função `parseBrlSalaryToCents` DEVE retornar `{ display: "A combinar" }` e É EXPRESSAMENTE PROIBIDO fatiar texto arbitrário do início da página.

- **R3 (Enriquecimento Visual e Semântico de Estabelecimentos - Places Harvester):**
  - *Sintaxe EARS:* QUANDO o `places-harvester.ts` consultar nós e polígonos comerciais do OpenStreetMap / Overpass, o motor DEVE:
    1. Mapear tags OSM em inglês (`restaurant`, `cafe`, `supermarket`, `pharmacy`, `hotel`, `bank`, `car_repair`, etc.) e português para categorias canônicas da Waesy;
    2. Ignorar nós com nomes genéricos ou marcadores de categoria brutos ("Restaurante", "Lanchonete", "Loja", "Farmácia");
    3. Gerar descrição informativa profissional completa com nome, categoria, logradouro, cidade e estado;
    4. Derivar `avatar_url` de alta resolução a partir do favicon do domínio (`https://www.google.com/s2/favicons?domain=${domain}&sz=128`) se possuir website, ou gerar badge canônico semântico por nicho;
    5. Atribuir galeria `photos` inicial com o avatar identificado;
    6. Calcular `data_quality_score` dinâmico conforme completude de campos.

- **R4 (Descoberta Ativa de CNPJ e Enriquecimento Cruzado):**
  - *Sintaxe EARS:* QUANDO o `places-cnpj-cross-enricher.ts` for executado, o motor DEVE inspecionar estabelecimentos locais que possuam `website_url` mas estejam com `cnpj` nulo, buscando padrões de CNPJ no HTML institucional, validando o dígito verificador via módulo 11, e consultando a BrasilAPI para enriquecer Razão Social, CNAE oficial, telefone verificado, endereço completo e quadro societário (QSA).

- **R5 (Governança e Polling Automático de Fontes de Crawler):**
  - *Sintaxe EARS:* QUANDO o job agendado `"rss-fetcher"` for despachado pelo worker cron, o sistema DEVE consultar as fontes ativas em `crawler_sources` com intervalo de coleta vencido, enfileirar os novos itens de feed na `crawl_queue` e atualizar atomicamente `last_fetched_at`, `status` e `items_indexed_count`.

---

### 4. Roadmap de Tecnologias & Stacks de Elite para Escalabilidade Futura

1. **Camada de Renderização JavaScript (Headless Browser Pool):**
   - Substituição de `fetch` estático simples por pool gerenciado de **Playwright Headless** ou **Browserless / Steel.dev** para contornar SPAs (React/Vue/Angular), permitindo renderizar portais governamentais e de vagas que exigem hidratação no cliente.

2. **Extração de Conteúdo Limpo & Artigos:**
   - Adoção de **Mozilla Readability** (`@mozilla/readability` + `jsdom` ou `cheerio`) para extração precisa do nó do artigo principal, erradicando barras laterais, anúncios e caixas de comentários sem custo de tokens de IA.
   - Integração com **Jina AI Reader** (`https://r.jina.ai/{url}`) como provedor de alta fidelidade para converter páginas HTML em Markdown limpo e estruturado.

3. **Descoberta Urbana Inteligente:**
   - Integração da **Tavily API** / **Exa.ai Neural Search** para pesquisa comercial focada em PMEs da região Oeste Catarinense, descobrindo empresas locais pelo nome e município com retorno de CNPJ e dados de contato.

4. **Extração LLM com Schema-Guided Outputs:**
   - Utilização de Structured Outputs (Zod Schema JSON) via Groq (`llama-3.3-70b-versatile`) e Gemini para extração precisa de cardápios, tabelas de preços, comodidades de pousadas e requisitos de vagas com garantia matemática de tipo.

---

### 5. Critérios de Aceite e Verificação
- [x] Zero erros no `npm run typecheck`.
- [x] Testes unitários do pipeline de mineração aprovados no Vitest.
- [x] Script forense confirmando integridade e saneamento dos dados corrompidos.
- [x] Registro da decisão arquitetural em `docs/design/DECISIONS.md`.
