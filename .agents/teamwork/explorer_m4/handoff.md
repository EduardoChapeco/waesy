# Handoff Report — Explorer M4 (Milestone 4: Continuous Mining Engines Consolidation)

**Agent:** Explorer M4 (`teamwork_preview_explorer`)  
**Working Directory:** `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_m4`  
**Parent Orchestrator ID:** `d28f856c-9966-4ad5-80d8-b7dba7b1979c`  
**Date:** 2026-10-04  
**Scope:** Milestone 4 (Continuous Mining Engines Consolidation) — `src/services/mining/` and `src/lib/mining/`

---

## 1. Observation

### 1.1 Verificação das 8 Verticais Industriais em `crawler-batch-engine.ts`
No arquivo `src/services/mining/crawler-batch-engine.ts` (linhas 96–480), a função `executeCrawlQueueBatchDirect` roteia o campo `item.entity_type` entre 8 ramos:

1. **Vertical 1: Vagas & Empregos (`jobs_portal` | `job`)** (linhas 96–125):
   - Invoca: `scrapeUrl(item.url)` e `extractAndPersistJobOpportunity(scrape.html, item.url, { storeId: item.store_id || undefined })`.
   - *Discrepância de Contrato:* Em `src/services/mining/job-opportunity-extractor.ts:296`, a função declara apenas `(html: string, url: string)` e descarta o objeto de opções. Além disso, `job-opportunity-extractor.ts:260` define `companyName = "Empresa em Chapecó"` em caso de fallback heurístico, e linhas 266–267 usam `locationCity = getDefaultCity()` ("Chapecó") e `locationState = getDefaultState()` ("SC"), ignorando metadados de cidade/estado do item da fila.
2. **Vertical 2: Estabelecimentos & Diretório (`places` | `directory`)** (linhas 126–148):
   - Invoca: `harvestAndPersistPlaces({ query: queryTerm, city })` onde `city = item.metadata?.city || "Chapecó"`.
   - *Omissão de Estado:* O parâmetro `state` **não é repassado** na chamada (linha 130).
   - *Fallback Crítico de Coordenadas:* Em `src/services/mining/places-harvester.ts:96`:
     ```typescript
     const bbox = CITY_BBOX_MAP[normCity] || CITY_BBOX_MAP["chapeco"];
     ```
     O dicionário `CITY_BBOX_MAP` possui apenas 4 cidades catarinenses (`chapeco`, `xanxere`, `concordia`, `sao-miguel-do-oeste`). Qualquer consulta para outra cidade (ex.: "Curitiba", "Passo Fundo", "São Paulo") usa o BBOX de Chapecó `[-27.16, -52.70, -27.04, -52.55]`, extrai nós reais de Chapecó e salva no banco com o nome da cidade consultada e estado "SC".
3. **Vertical 3: Licitações & Compras Públicas (`mined_tenders`, `tenders` | `licitacao`)** (linhas 150–174):
   - Invoca:
     ```typescript
     harvestAndPersistPncpTenders({
       query: item.metadata?.query || "Chapecó",
       uf: item.metadata?.uf || "SC",
       codigoMunicipioIbge: item.metadata?.ibge || "4204202",
       limit: 10,
     });
     ```
   - Persiste em `mined_tenders` via PNCP API oficial. Valores de `uf`, `query` e `ibge` possuem fallbacks hardcoded para Chapecó/SC.
4. **Vertical 4: Imóveis & Imobiliárias (`directory_listings`, `real_estate` | `imoveis`)** (linhas 176–202):
   - Invoca:
     ```typescript
     harvestAndPersistRealEstate({
       url: item.url,
       sourceName: item.metadata?.source_name,
       city: item.metadata?.region?.includes("Chapecó") ? "Chapecó" : "Chapecó",
       state: "SC",
       storeId: item.store_id || undefined,
     });
     ```
   - *Linha 180:* Condicional tautológica morta `? "Chapecó" : "Chapecó"`.
   - *Linha 181:* `state: "SC"` hardcoded como literal de string.
5. **Vertical 5: Leilões & Leiloeiros (`directory_listings`, `auctions` | `leiloes`)** (linhas 204–231):
   - Invoca:
     ```typescript
     harvestAndPersistAuctions({
       url: item.url,
       sourceName: item.metadata?.source_name,
       category: item.metadata?.category,
       city: "Chapecó",
       state: "SC",
       storeId: item.store_id || undefined,
     });
     ```
   - *Linhas 209–210:* `city: "Chapecó"` e `state: "SC"` hardcoded; não lê `item.metadata?.city` nem `item.metadata?.state`.
6. **Vertical 6: RSS & Atom Feeds (Descoberta)** (linhas 233–278):
   - Executa `parseFeed(item.url)` e insere até 15 itens na `crawl_queue` com `entity_type: "news"`.
   - *Perda de Metadados:* Na inserção dos filhos (linhas 244–257), `metadata` não propaga `city`, `state` ou `region` herdados do seed pai.
7. **Vertical 7: Eventos & Agenda Cultural (`events`, `event` | `events` | `agenda`)** (linhas 280–312):
   - Invoca: `harvestAndPersistEvent({ url, city, state, storeId, sourceName })` onde `city = item.metadata?.city || "Chapecó"` e `state = item.metadata?.state || "SC"`.
   - Em `src/services/mining/event-harvester.ts:36–38`, há fallbacks idênticos e `storeId` padrão `"5108ce27-2df1-4ce2-89f2-681fea6dba95"`. Em caso de fallback heurístico (linhas 66–67), cria data sintética (`Date.now() + 7 dias`) e venue (`${targetCity} - Centro`).
8. **Vertical 8: Notícias & Artigos HTML (`news_articles`)** (linhas 314–480):
   - Pipeline mecânico: `extractContentMechanically` -> `validateMechanicalCompleteness` (Integrity Gate) -> `curateWithEditorialSquad` -> inserção em `mined_articles` e publicação idempotente em `news_articles`.
   - *Linha 407:* UUID de loja hardcoded `defaultStoreId = item.store_id || "5108ce27-2df1-4ce2-89f2-681fea6dba95"`.

---

### 1.2 Inventário de Padrões Hardcoded Residuais (`state || "SC"` e BBOX)

| Arquivo | Linhas | Código Observado | Impacto Forense |
| :--- | :--- | :--- | :--- |
| `src/services/mining/places-harvester.ts` | 91–92, 96 | `city = "Chapecó", state = "SC"`; `CITY_BBOX_MAP[normCity] \|\| CITY_BBOX_MAP["chapeco"]` | Cidades fora do mapa usam coordenadas de Chapecó no Overpass, poluindo a cidade alvo com empresas catarinenses. |
| `src/services/mining/places-harvester.ts` | 161, 169 | `state: string = "SC"`; `searchQuery = \`${query}, ${city}, ${state}, Brasil\`` | Se state foi omitido para Curitiba, busca Nominatim por `"restaurante, Curitiba, SC, Brasil"` (falha). |
| `src/services/mining/places-harvester.ts` | 206 | `placeState = addr.state ? addr.state.slice(0, 2).toUpperCase() : state;` | `addr.state` do Nominatim é o nome por extenso ("Paraná" -> "PA" [Pará!], "Santa Catarina" -> "SA" [inválido], "Rio Grande do Sul" -> "RI" [inválido]). |
| `src/services/mining/places-harvester.ts` | 248–249 | `const city = params.city \|\| "Chapecó"; const state = params.state \|\| "SC";` | Fallback incondicional para SC quando o chamador não especifica estado. |
| `src/services/autonomous-copilot-orchestrator.ts` | 128 | `const state = defaults.state ?? "SC";` | Se o prompt for "hotéis em Curitiba", extrai cidade Curitiba, mas estado vira "SC". |
| `src/services/autonomous-copilot-orchestrator.ts` | 490 | `state: task.state \|\| "SC",` (em `lead_mining`) | Repassa UF "SC" para `harvestAndPersistPlaces` mesmo para cidades de outros estados. |
| `src/services/autonomous-copilot-orchestrator.ts` | 675 | `state: task.state \|\| "SC",` (em `lodging_tourism`) | Repassa UF "SC" para `harvestAndPersistPlaces`. |
| `src/services/mining/crawler-batch-engine.ts` | 180–181 | `city: item.metadata?.region?.includes("Chapecó") ? "Chapecó" : "Chapecó", state: "SC"` | Ignora metadados do item de imóveis. |
| `src/services/mining/crawler-batch-engine.ts` | 209–210 | `city: "Chapecó", state: "SC"` | Ignora metadados do item de leilões. |
| `src/services/mining/real-estate-harvester.ts` | 36–37 | `const city = options.city \|\| "Chapecó"; const state = options.state \|\| "SC";` | Fallback cego para SC. |
| `src/services/mining/auction-harvester.ts` | 37–38 | `const city = options.city \|\| "Chapecó"; const state = options.state \|\| "SC";` | Fallback cego para SC. |
| `src/services/mining/event-harvester.ts` | 36–37 | `const targetCity = options.city \|\| "Chapecó"; const targetState = options.state \|\| "SC";` | Fallback cego para SC. |
| `src/services/mining/automated-harvest.ts` | 197, 242 | `state: "SC",` | Hardcoded estático na gravação de extrações e matérias. |
| `src/services/mining/job-opportunity-extractor.ts` | 260, 267 | `companyName = "Empresa em Chapecó"`; `locationState = getDefaultState()` | Atribui Chapecó/SC a vagas com parsing heurístico. |
| `src/services/mining/pncp-harvester.ts` | 64–65 | `city: options.municipio \|\| options.query \|\| "Chapecó", uf: options.uf \|\| "SC"` | Fallback para SC em licitações. |
| `src/services/mining/pncp-extractor.ts` | 43–47 | `const query = options.query \|\| getDefaultCity(); const uf = options.uf \|\| "SC"; const ibge = options.codigoMunicipioIbge \|\| "4204202";` | Consulta PNCP com código IBGE de Chapecó e UF SC por padrão. |
| `src/services/mining/places-cnpj-cross-enricher.ts` | 65 | `state: enriched.uf \|\| "SC"` | Fallback para "SC" caso BrasilAPI não traga UF. |
| `src/services/mining.functions.ts` | 155, 746, 1438, 1470 | Diversos `state: ... \|\| "SC"` e `city: "Chapecó"` | Fallbacks no BFF de mineração. |

---

### 1.3 Circuit Breaker por Domínio (`CrawlerCircuitBreaker`)
- **Arquivo:** `src/lib/mining/crawler-circuit-breaker.ts`.
- **Estados:** 3 estados formais (`CLOSED`, `OPEN`, `HALF_OPEN`), conforme `CircuitBreakerState` (linha 8).
- **Parâmetros canônicos:**
  - `failureThreshold = 3` (linhas 11, 33, 144).
  - `cooldownPeriodMs = 30000` (linhas 12, 34, 145) — 30 segundos no estado `OPEN` antes de permitir `HALF_OPEN`.
  - `maxTimeoutMs = 8000` (linhas 13, 35, 146) — 8 segundos de timeout estrito por requisição folha via `Promise.race`.
- **Transições:**
  - `CLOSED -> OPEN`: quando `consecutiveFailures >= failureThreshold` (linha 124).
  - `OPEN -> HALF_OPEN`: automático na próxima chamada após decorrido o cooldown (`now >= status.nextAttemptAllowedAt`, linhas 62, 81).
  - `HALF_OPEN -> CLOSED`: em caso de sucesso da execução de teste (linha 110).
  - `HALF_OPEN -> OPEN`: em caso de falha durante o estado de prova (linha 125).
- **Isolamento por domínio:** Mantido em `Map<string, DomainCircuitStatus>`. Falha em um domínio não bloqueia outros alvos.
- **Instância Singleton:** `globalCrawlerCircuitBreaker` exportada na linha 143.

---

### 1.4 Deduplicação Semântica Jaccard (`semantic-deduplicator.ts`)
- **Arquivo:** `src/services/mining/semantic-deduplicator.ts`.
- **Tokenização:** `normalizeAndTokenize` (linha 21) normaliza NFD, remove diacríticos e pontuação, filtra stopwords em português (conjunto fechado de 39 palavras) e palavras com `<= 2` caracteres.
- **Similaridade:** `computeJaccardSimilarity` (linha 31) calcula `|A ∩ B| / |A ∪ B|`.
- **Janela temporal:** 48 horas (`windowStart = new Date(refTime - 48 * 60 * 60 * 1000).toISOString()`, linha 64).
- **Limiares canônicos:**
  - `0.55`: Cluster de história (`isDuplicate: false`, vincula ao `cluster_id` existente, linha 90).
  - `0.80`: Duplicata estrita (`isDuplicate: true`, linha 94).
- **Zero Tokens de IA:** Algoritmo determinístico puro sem consumo de modelos LLM.

---

### 1.5 Execução Assíncrona da `crawl_queue`
- **Tabela:** `crawl_queue` no Supabase.
- **Transições de status:**
  1. `pending`: Itens enfileirados por sitemaps, RSS ou chamadas de API.
  2. `processing`: Marcado ao iniciar o processamento em lote em `crawler-batch-engine.ts:87`, registrando `processed_at` e incrementando `retry_count`.
  3. `completed`: Marcado em caso de sucesso (`completed_at = now()`, `error_message = null`).
  4. `failed`: Marcado em caso de exceção capturada no `try/catch` (linha 486), persistindo `error_message` truncado em 300 caracteres.
- **Gaps arquiteturais:**
  - Não há trava atômica a nível de linha (ex.: `FOR UPDATE SKIP LOCKED`). Múltiplos workers paralelos podem selecionar os mesmos itens `pending` antes da atualização para `processing`.
  - Ausência de fila de descarte final (`dead_letter`) após limite máximo de retentativas.

---

### 1.6 Execução dos Testes Vitest (Resultados Verbatim)

#### Comando 1: `cmd /c npx vitest run src/services/mining/`
```text
The plugin "vite-tsconfig-paths" is detected. Vite now supports tsconfig paths resolution natively via the resolve.tsconfigPaths option. You can remove the plugin and set resolve.tsconfigPaths: true in your Vite config instead.

 RUN  v4.1.10 C:/Users/Eduardo Antônio Ramo/Documents/waesy

stderr | src/services/mining/pncp-and-indicators.test.ts > PNCP Harvester & Mining Extraction Unit Tests > fetchPncpContracts handles network failures transparently without synthetic mock data
[pncp-extractor] Falha ao consultar PNCP: Error: Network timeout

 ✓ src/services/mining/pncp-and-indicators.test.ts (3 tests) 17ms
 ✓ src/services/mining/industrial-crawlers.test.ts (9 tests) 97ms

 Test Files  2 passed (2)
      Tests  12 passed (12)
   Start at  11:16:40
   Duration  1.76s (transform 916ms, setup 316ms, import 1.99s, tests 114ms, environment 0ms)
Exit Code: 0
```

#### Comando 2: `cmd /c npx vitest run src/lib/mining/circuit-breaker.test.ts`
```text
The plugin "vite-tsconfig-paths" is detected. Vite now supports tsconfig paths resolution natively via the resolve.tsconfigPaths option. You can remove the plugin and set resolve.tsconfigPaths: true in your Vite config instead.

 RUN  v4.1.10 C:/Users/Eduardo Antônio Ramo/Documents/waesy

 ✓ src/lib/mining/circuit-breaker.test.ts (8 tests) 223ms

 Test Files  1 passed (1)
      Tests  8 passed (8)
   Start at  11:16:53
   Duration  1.31s (transform 178ms, setup 187ms, import 93ms, tests 223ms, environment 0ms)
Exit Code: 0
```

#### Testes correlacionados adicionais:
- `cmd /c npx vitest run src/services/copilot-fsm.test.ts`: **16/16 passed** (5.08s, Exit Code 0).
- `cmd /c npx vitest run src/services/copilot-pipeline-boundaries.test.ts`: **7/7 passed** (2.30s, Exit Code 0).
- `cmd /c npx vitest run src/services/autonomous-copilot.test.ts`: **15/15 passed** (2.03s, Exit Code 0).

---

## 2. Logic Chain

1. **Da propagação de proveniência geográfica e contaminação de banco:**
   - *Observação:* `CITY_BBOX_MAP` em `places-harvester.ts:77–83` contém apenas cidades do Oeste Catarinense e recorre a `CITY_BBOX_MAP["chapeco"]` quando a cidade não é encontrada (linha 96). Em `crawler-batch-engine.ts`, chamadas aos harvesters forçam `state: "SC"` e cidades não-SC não têm seu UF resolvido.
   - *Raciocínio:* Quando um usuário ou robô solicita prospecção de estabelecimentos em Curitiba (PR) ou Passo Fundo (RS), a query da Overpass API é executada com a coordenada de Chapecó. Os dados reais de restaurantes e lojas de Chapecó são retornados, atribuídos à cidade "Curitiba" e gravados em `directory_listings` com latitude/longitude de Chapecó e UF "SC".
   - *Conclusão:* Trata-se de uma corrupção sistemática de proveniência de dados urbanos. É imperativo: (a) nunca usar BBOX de Chapecó como fallback para cidades não mapeadas (delegando diretamente para o Nominatim ou geocodificação dinâmica); (b) resolver o estado (UF) correto usando os catálogos já existentes no projeto (`GLOBAL_BRAZIL_CITIES_CATALOG` e `BRAZILIAN_STATES`).

2. **Do defeito na extração de UF pelo Nominatim:**
   - *Observação:* `places-harvester.ts:206` executa `addr.state ? addr.state.slice(0, 2).toUpperCase() : state`.
   - *Raciocínio:* O Nominatim retorna em `addr.state` o nome completo do estado brasileiro (ex.: "Paraná", "Santa Catarina", "Rio Grande do Sul", "São Paulo"). Cortar os dois primeiros caracteres gera siglas falsas: "Paraná" -> "PA" (Pará!), "Rio Grande do Sul" -> "RI" (sigla inexistente), "Santa Catarina" -> "SA" (sigla inexistente).
   - *Conclusão:* É necessário mapear o nome por extenso contra o catálogo oficial `BRAZILIAN_STATES` (`src/lib/constants/brazilian-states.ts`) para obter a sigla de 2 letras correta.

3. **Da desconexão entre `crawler-batch-engine.ts` e `job-opportunity-extractor.ts`:**
   - *Observação:* `crawler-batch-engine.ts:102` repassa `{ storeId: item.store_id || undefined }`, mas `extractAndPersistJobOpportunity` aceita apenas `(html, url)`. Além disso, o extractor fixa `companyName = "Empresa em Chapecó"` em fallback heurístico.
   - *Raciocínio:* A assinatura da função foi esquecida durante a refatoração, impedindo a passagem de metadados de loja e proveniência territorial (cidade/estado).
   - *Conclusão:* O contrato deve ser alinhado para receber opções tipadas `{ storeId?: string; city?: string; state?: string }` e propagar esses dados para a tabela `jobs`.

4. **Da solidez dos componentes de infraestrutura:**
   - *Observação:* `CrawlerCircuitBreaker` possui seus 3 estados e timings testados unitariamente; `SemanticDeduplicator` possui normalização, stopwords e limiares 0.55/0.80 auditados e verdes.
   - *Raciocínio:* A arquitetura central de isolamento de falhas e deduplicação atende integralmente às especificações do projeto e aos mandatos de zero tokens de IA e zero mocks.
   - *Conclusão:* A fundação algorítmica de mineração é robusta; o esforço de Milestone 4 deve se concentrar na correção cirúrgica de proveniência geográfica e consistência de parâmetros nas 8 verticais.

---

## 3. Caveats

1. **Restrição Absoluta de Build & Typecheck:**
   - Em conformidade estrita com a regra R6 / DISPATCH, `npm run typecheck` e `npm run build` **NUNCA** foram executados. A validação foi 100% restrita a testes focados via Vitest e inspeção estática profunda do código-fonte.
2. **Ambiente Windows PowerShell vs npx:**
   - A política de execução do PowerShell nesta máquina bloqueia o carregador `npx.ps1`. Todos os comandos de teste devem ser executados através de `cmd /c npx vitest run ...` ou `node ./node_modules/vitest/vitest.mjs run ...`.
3. **Escopo Read-Only:**
   - Como Explorer, nenhum arquivo de código de produção em `src/` foi modificado. Todas as correções estão detalhadas no Plano de Remediação abaixo para implementação pelo Worker M4.

---

## 4. Conclusion & Concrete Remediation Plan for Worker M4

### Diagnóstico Resumido

| Área Auditada | Status Atual | Severidade | Ação do Worker M4 |
| :--- | :--- | :--- | :--- |
| **8 Verticais Industriais** | Funcionais, porém verticais 2, 4, 5 e 8 possuem fallbacks/strings hardcoded | Média | Remover strings literais, propagar metadados e alinhar contrato em `job-opportunity-extractor`. |
| **BBOX Fallback da Overpass** | Falha crítica de proveniência: cidades fora de SC recebem BBOX de Chapecó | Alta (P1) | Remover fallback para BBOX de Chapecó; delegar cidades não catalogadas para o Nominatim. |
| **Parsing UF Nominatim** | `addr.state.slice(0, 2)` corrompe siglas de estados brasileiros | Alta (P1) | Mapear `addr.state` usando `BRAZILIAN_STATES` em `src/lib/constants/brazilian-states.ts`. |
| **Resíduos `state \|\| "SC"`** | Presentes no orchestrator e múltiplos harvesters | Alta (P1) | Criar utilitário de resolução cidade-estado e eliminar fallbacks arbitrários para SC. |
| **Circuit Breaker (3 estados)** | 100% Conforme e aprovado (8/8 testes) | Nenhuma | Manter; adicionar caso de teste de integração se necessário. |
| **Deduplicação Jaccard** | 100% Conforme e aprovado (0.55/0.80) | Nenhuma | Manter integridade em `semantic-deduplicator.ts`. |
| **Suíte de Testes Vitest** | 100% verde (12/12 em mining, 8/8 em circuit breaker) | Nenhuma | Expandir suíte com testes de proveniência geográfica multi-estado. |

---

### Plano de Remediação Concreto (Tarefas para o Worker M4)

#### TASK-M4-01: Criar Resolvedor Canônico de Cidade e Estado (`src/lib/mining/geo-resolver.ts`)
- Criar função utilitária pura:
  ```typescript
  export function resolveCityAndState(cityName?: string, stateHint?: string): {
    city?: string;
    state?: string;
    ibgeCode?: string;
  };
  ```
- Consumir o catálogo `GLOBAL_BRAZIL_CITIES_CATALOG` (`src/lib/data/cities-brazil-catalog.ts`) e `BRAZILIAN_STATES` (`src/lib/constants/brazilian-states.ts`).
- Se `cityName` for fornecido (ex.: "Curitiba", "Passo Fundo", "São Paulo"), resolver seu estado autêntico ("PR", "RS", "SP") e código IBGE.
- Se `stateHint` for um nome por extenso (ex.: "Paraná", "Rio Grande do Sul", retornado pelo Nominatim), converter deterministamente para a sigla oficial de 2 letras.
- **Invariante:** Nunca retornar "SC" quando a cidade pertencer a outro estado da federação.

#### TASK-M4-02: Sanear `places-harvester.ts` (BBOX & Nominatim)
1. Em `queryOverpassPlaces` (linhas 95–97):
   - Se `CITY_BBOX_MAP[normCity]` não existir, **não** aplicar o BBOX de Chapecó. Retornar `[]` imediatamente para que a busca prossiga para o Nominatim com a cidade e estado reais.
2. Em `queryNominatimPlaces` (linhas 169, 206):
   - Montar `searchQuery` utilizando o estado resolvido (evitando buscar "Curitiba, SC").
   - Substituir `addr.state.slice(0, 2)` pela conversão canônica via `BRAZILIAN_STATES`.
3. Em `harvestAndPersistPlaces` (linhas 248–249):
   - Resolver cidade e estado via `resolveCityAndState(params.city, params.state)`.

#### TASK-M4-03: Sanear Resíduos em `autonomous-copilot-orchestrator.ts`
1. Em `extractDomainAndTargetQuery` (linha 128):
   - Eliminar `const state = defaults.state ?? "SC"`. Resolver estado a partir da cidade extraída:
     ```typescript
     const resolvedGeo = resolveCityAndState(city, defaults.state);
     const state = resolvedGeo.state ?? defaults.state;
     ```
2. Em `lead_mining` (linha 490) e `lodging_tourism` (linha 675):
   - Usar `state: task.state ?? resolveCityAndState(task.city)?.state`.

#### TASK-M4-04: Consolidar as 8 Verticais em `crawler-batch-engine.ts`
1. **Vertical 1 (`jobs`):**
   - Atualizar a assinatura de `extractAndPersistJobOpportunity` em `job-opportunity-extractor.ts` para `(html: string, url: string, options?: { storeId?: string; city?: string; state?: string })`.
   - Propagar `options.city` e `options.state` no payload gravado em `jobs`.
   - Substituir a string hardcoded `"Empresa em Chapecó"` por `${options?.city ? `Empresa em ${options.city}` : "Empresa Confidencial"}`.
2. **Vertical 2 (`places`):**
   - Repassar `city` e `state` resolvidos na chamada a `harvestAndPersistPlaces`.
3. **Vertical 3 (`mined_tenders`):**
   - Resolver código IBGE e UF dinamicamente a partir do município indicado nos metadados.
4. **Vertical 4 (`real_estate`):**
   - Eliminar `? "Chapecó" : "Chapecó"` e `state: "SC"`. Extrair cidade e estado de `item.metadata`.
5. **Vertical 5 (`auctions`):**
   - Eliminar strings fixas `"Chapecó"` e `"SC"`. Extrair cidade e estado de `item.metadata`.
6. **Vertical 6 (`rss`):**
   - Propagar metadados territoriais do feed (`city`, `state`, `region`, `store_id`) para os itens filhos enfileirados na `crawl_queue`.
7. **Vertical 7 (`events`):**
   - Repassar cidade e estado resolvidos; não fabricar datas arbitrárias sem marcação de incerteza.
8. **Vertical 8 (`news_articles`):**
   - Eliminar UUID hardcoded de loja (`"5108ce27-2df1-4ce2-89f2-681fea6dba95"`), usando fallback limpo `item.store_id || null`.

#### TASK-M4-05: Expandir Cobertura de Testes Vitest
- Criar novos testes unitários em `src/services/mining/industrial-crawlers.test.ts` validando:
  1. `harvestAndPersistPlaces` com cidades de outros estados (Curitiba/PR, Passo Fundo/RS, São Paulo/SP) preservando o UF exato.
  2. `queryOverpassPlaces` retornando vazio para cidades sem BBOX em vez de vazar nós de Chapecó.
  3. `resolveCityAndState` identificando corretamente capitais e polos regionais em todo o Brasil.
  4. Conversão correta de nomes por extenso do Nominatim ("Paraná" -> "PR", "Santa Catarina" -> "SC").

---

## 5. Verification Method

Para verificar de forma independente e reproduzível os achados desta auditoria:

1. **Inspeção de Código Estática:**
   - Verificar `places-harvester.ts:96` para confirmar o fallback do BBOX para Chapecó.
   - Verificar `places-harvester.ts:206` para confirmar o corte de 2 caracteres em nomes de estados do Nominatim.
   - Verificar `autonomous-copilot-orchestrator.ts:128, 490, 675` para confirmar os defaults residuais `"SC"`.
   - Verificar `crawler-batch-engine.ts:180, 209` para confirmar as strings literais fixas.
   - Verificar `job-opportunity-extractor.ts:296` para confirmar a divergência de assinatura com `crawler-batch-engine.ts:102`.

2. **Comandos de Teste Vitest:**
   - Suíte de mineração:
     ```powershell
     cmd /c npx vitest run src/services/mining/
     ```
     *Critério de Sucesso:* 12/12 testes passando.
   - Suíte de circuit breaker:
     ```powershell
     cmd /c npx vitest run src/lib/mining/circuit-breaker.test.ts
     ```
     *Critério de Sucesso:* 8/8 testes passando.
   - Suítes correlacionadas de copilot e resiliência:
     ```powershell
     cmd /c npx vitest run src/services/copilot-fsm.test.ts
     cmd /c npx vitest run src/services/copilot-pipeline-boundaries.test.ts
     cmd /c npx vitest run src/services/autonomous-copilot.test.ts
     ```
     *Critério de Sucesso:* 38/38 testes passando.

3. **Condições de Invalidação:**
   - Se qualquer teste em `src/services/mining/` ou `src/lib/mining/circuit-breaker.test.ts` falhar, ou se comandos proibidos (`typecheck`/`build`) forem acionados, o gate de Milestone 4 deve ser bloqueado.
