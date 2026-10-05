# DISPATCH — Worker M4 (Continuous Mining Engines Consolidation)

## 2026-10-04T14:25:00Z

### Identity & Mission
- **Role**: Worker M4 (`teamwork_preview_worker`)
- **Working Directory**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m4`
- **Parent Orchestrator ID**: `d28f856c-9966-4ad5-80d8-b7dba7b1979c`
- **Original User Request**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\ORIGINAL_REQUEST.md` (header `## 2026-10-04T03:35:00Z`)
- **Explorer M4 Report**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\explorer_m4\handoff.md`
- **Architecture Index**: `c:\Users\Eduardo Antônio Ramo\Documents\waesy\PROJECT.md`

### MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

### CRITICAL OPERATING CONSTRAINTS (PROIBIÇÃO ABSOLUTA)
1. **NUNCA execute `npm run typecheck` ou `npm run build` sob nenhuma circunstância.**
2. Conformidade absoluta com `AGENTS.md`, `DESIGN.md` e `scripts/design-lint.mjs`.
3. Invariante M01: ZERO MOCKS. Todos os dados são extraídos de fontes reais ou retornam array vazio/erro honesto em falhas de rede.

### Exclusive Write Boundaries
- `src/lib/mining/geo-resolver.ts` (Novo arquivo)
- `src/services/mining/places-harvester.ts`
- `src/services/mining/crawler-batch-engine.ts`
- `src/services/mining/job-opportunity-extractor.ts`
- `src/services/autonomous-copilot-orchestrator.ts`
- `src/services/mining/real-estate-harvester.ts`
- `src/services/mining/auction-harvester.ts`
- `src/services/mining/event-harvester.ts`
- `src/services/mining/automated-harvest.ts`
- `src/services/mining/industrial-crawlers.test.ts`

---

### Implementation Tasks

#### TASK-M4-01: Criar `src/lib/mining/geo-resolver.ts`
- Criar resolvedor canônico determinístico utilizando `GLOBAL_BRAZIL_CITIES_CATALOG` (`src/lib/data/cities-brazil-catalog.ts`) e `BRAZILIAN_STATES` (`src/lib/constants/brazilian-states.ts`).
- Exportar:
  ```typescript
  export function resolveCityAndState(cityName?: string, stateHint?: string): {
    city?: string;
    state?: string;
    ibgeCode?: string;
  };
  export function normalizeStateUf(stateNameOrUf?: string): string | undefined;
  ```
- Normaliza nomes de estados por extenso retornados por geocoders/Nominatim ("Paraná" -> "PR", "Santa Catarina" -> "SC", "Rio Grande do Sul" -> "RS", "São Paulo" -> "SP").
- Para uma cidade fornecida (ex.: "Curitiba", "Passo Fundo", "Chapecó"), resolve seu estado oficial de 2 letras e código IBGE.
- Invariante: Nunca forçar "SC" quando a cidade pertencer a outro estado! Usar `getDefaultCity()` / `getDefaultState()` apenas quando cidade e estado forem completamente indefinidos.

#### TASK-M4-02: Sanear `places-harvester.ts` (BBOX & Nominatim)
1. Em `queryOverpassPlaces` (linhas 95–97):
   - Se `CITY_BBOX_MAP[normCity]` não existir, **NÃO** aplicar o BBOX de Chapecó! Retornar `[]` imediatamente para que a busca prossiga para o Nominatim com a cidade e estado reais.
2. Em `queryNominatimPlaces` (linhas 169, 206):
   - Montar `searchQuery` utilizando o estado resolvido (`${query}, ${city}, ${state}, Brasil`), evitando buscar "Curitiba, SC".
   - Na linha 206, substituir o corte incorreto `addr.state.slice(0, 2)` pela conversão canônica via `normalizeStateUf(addr.state) || state`.
3. Em `harvestAndPersistPlaces` (linhas 248–249):
   - Resolver cidade e estado via `resolveCityAndState(params.city, params.state)`.

#### TASK-M4-03: Sanear Resíduos em `autonomous-copilot-orchestrator.ts`
1. Em `extractDomainAndTargetQuery` (linha 128):
   - Substituir `const state = defaults.state ?? "SC";` por:
     ```typescript
     const resolvedGeo = resolveCityAndState(city, defaults.state);
     const state = resolvedGeo.state ?? defaults.state;
     ```
2. Em `lead_mining` (linha 490) e `lodging_tourism` (linha 675):
   - Usar `state: task.state ?? resolveCityAndState(task.city)?.state`.

#### TASK-M4-04: Consolidar as 8 Verticais em `crawler-batch-engine.ts` e Harvesters
1. **Vertical 1 (`jobs`):**
   - Em `job-opportunity-extractor.ts`, atualizar `extractAndPersistJobOpportunity` para aceitar `options?: { storeId?: string; city?: string; state?: string }`.
   - Propagar `options.city` e `options.state` no payload gravado em `jobs`.
   - Substituir `"Empresa em Chapecó"` (linha 260) por `${options?.city ? `Empresa em ${options.city}` : "Empresa Confidencial"}`.
2. **Vertical 2 (`places`):**
   - Repassar `city` e `state` resolvidos na chamada a `harvestAndPersistPlaces`.
3. **Vertical 3 (`mined_tenders`):**
   - Resolver código IBGE e UF dinamicamente a partir de `item.metadata?.city` / `item.metadata?.uf` via `resolveCityAndState`.
4. **Vertical 4 (`real_estate`):**
   - Eliminar `? "Chapecó" : "Chapecó"` e `state: "SC"`. Extrair cidade e estado de `item.metadata` via `resolveCityAndState`.
5. **Vertical 5 (`auctions`):**
   - Eliminar strings fixas `"Chapecó"` e `"SC"`. Extrair cidade e estado de `item.metadata` via `resolveCityAndState`.
6. **Vertical 6 (`rss`):**
   - Propagar metadados territoriais do feed (`city`, `state`, `region`, `store_id`) para os itens filhos enfileirados na `crawl_queue`.
7. **Vertical 7 (`events`):**
   - Repassar cidade e estado resolvidos; em `event-harvester.ts`, usar `resolveCityAndState`.
8. **Vertical 8 (`news_articles`):**
   - Eliminar UUID hardcoded de loja (`"5108ce27-2df1-4ce2-89f2-681fea6dba95"`), usando fallback limpo `item.store_id || null`.
9. Em `real-estate-harvester.ts`, `auction-harvester.ts`, `event-harvester.ts` e `automated-harvest.ts`:
   - Substituir `|| "SC"` por `resolveCityAndState(city, state).state`.

#### TASK-M4-05: Expandir Cobertura de Testes em `src/services/mining/industrial-crawlers.test.ts`
- Adicionar novos casos de teste unitários validando:
  1. `resolveCityAndState`: resolve capitais e polos regionais em todo o Brasil (Curitiba -> PR, Passo Fundo -> RS, São Paulo -> SP, Florianópolis -> SC).
  2. `normalizeStateUf`: mapeia nomes por extenso do Nominatim ("Paraná" -> "PR", "Santa Catarina" -> "SC", "Rio Grande do Sul" -> "RS").
  3. `queryOverpassPlaces`: retorna array vazio `[]` para cidades não catalogadas no BBOX em vez de vazar coordenadas de Chapecó.
  4. Preservação de proveniência de estado não-SC em `harvestAndPersistPlaces`.

---

### Verification Commands
Executar e documentar no handoff:
1. `cmd /c npx vitest run src/services/mining/` (100% dos testes passando).
2. `cmd /c npx vitest run src/lib/mining/circuit-breaker.test.ts` (100% dos testes passando).
3. `cmd /c npx vitest run src/services/copilot-fsm.test.ts` (100% dos testes passando).
4. `cmd /c npx vitest run src/services/copilot-pipeline-boundaries.test.ts` (100% dos testes passando).
5. `node scripts/design-lint.mjs --ratchet` (0 regressões, Exit Code 0).

### Output
Escrever o relatório completo com evidências em:
`c:\Users\Eduardo Antônio Ramo\Documents\waesy\.agents\teamwork\worker_m4\handoff.md`
Notificar o parent orchestrator (`d28f856c-9966-4ad5-80d8-b7dba7b1979c`).
