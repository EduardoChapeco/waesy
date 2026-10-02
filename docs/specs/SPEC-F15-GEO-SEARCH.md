# SPEC-F15 — Geolocalização e Filtros de Proximidade (Places & Classificados)

## 1. Identificação e Metadados
- **ID:** SPEC-F15-GEO-SEARCH
- **Fase:** F15 (Plano de Estabilização E2E — Os 4 Pilares)
- **Status:** Aprovada
- **Data:** 2026-10-02
- **Autor:** BigTech Engineering & Architecture Board (Antigravity Agent)
- **SSOT Relacionados:** `AGENTS.md`, `DESIGN.md`, `DESIGN-LINT.md`, `PROXIMOS_PLANOS_EXECUCAO.md`, `cities.ts`.

---

## 2. Contexto e Escopo Delimitado
O ecossistema Waesy organiza o comércio e serviços locais por geolocalização e proximidade física.
Esta especificação estabelece os motores canônicos de busca geográfica e filtros por cidade e bairro:
1. **Places (`geoSearchPlacesFn`):** Busca de estabelecimentos físicos por raio geodésico (Haversine esférico) centrado em coordenadas GPS (`lat`, `lng`, `radiusKm`).
2. **Classificados (`geoSearchClassifiedsFn`):** Filtros textuais e geográficos por cidade e bairro em anúncios particulares ativos.
3. **Resolução de Cidade Mais Próxima (`resolveLocationCityFn`):** Identificação determinística da cidade canônica de referência a partir de coordenadas geográficas.
4. **Zero Mocks (M01):** Todas as consultas operam exclusivamente sobre dados reais do banco de dados no Supabase (`stores`, `classifieds`).

---

## 3. Requisitos Funcionais em Sintaxe EARS

### 3.1 Requisitos Ubíquos (Ubiquitous Requirements)
- **EARS-U01:** O sistema SHALL calcular distâncias geodésicas reais em quilômetros com precisão de 1 casa decimal usando a fórmula esférica de Haversine (`R = 6371km`).
- **EARS-U02:** O sistema SHALL retornar a lista de estabelecimentos ordenada por distância ascendente (`distanceKm` menor primeiro).
- **EARS-U03:** O sistema SHALL consultar dados reais no Supabase em `stores` e `classifieds`, proibindo dados sintéticos ou placeholders mock (M01: Zero Mocks).

### 3.2 Requisitos Orientados a Eventos (Event-driven Requirements)
- **EARS-E01:** QUANDO o cliente fornecer coordenadas `lat` e `lng`, O sistema SHALL calcular a distância até cada estabelecimento com localização física e filtrar aqueles dentro do raio `radiusKm`.
- **EARS-E02:** QUANDO o cliente filtrar classificados por `city` ou `neighborhood`, O sistema SHALL filtrar anúncios ativos onde o campo `location_text` ou metadados contenham a localidade especificada.

### 3.3 Requisitos de Estado (State-driven Requirements)
- **EARS-S01:** ENQUANTO não houver estabelecimentos dentro do raio geodésico solicitado, O sistema SHALL retornar lista vazia `{ places: [], count: 0 }` para exibição de `<EmptyState />` honesto.
- **EARS-S02:** ENQUANTO as coordenadas fornecidas forem inválidas (NaN ou fora da faixa -90 a 90 / -180 a 180), O sistema SHALL rejeitar a chamada via validação Zod sem consultar o banco.

### 3.4 Tratamento de Comportamentos Indesejados (Unwanted Behaviors)
- **EARS-W01:** SE um estabelecimento físico não possuir coordenadas geográficas cadastradas em seus metadados, ENTÃO O sistema NÃO SHALL incluí-lo na busca por raio geodésico, evitando distâncias incorretas ou nulas.
- **EARS-W02:** SE o raio solicitado for menor que 1km ou maior que 300km, ENTÃO O sistema SHALL clampar o raio dentro da faixa permitida [1, 300].

---

## 4. Definition of Done & Critérios de Aceite
- [ ] Implementação de `src/services/geo-search.functions.ts` com `geoSearchPlacesFn`, `geoSearchClassifiedsFn` e `resolveLocationCityFn`.
- [ ] Validação estrita Zod em todos os inputs.
- [ ] Suíte de testes unitários verdes em `src/services/geo-search.functions.test.ts`.
- [ ] 0 violações de design lint na catraca (`node scripts/design-lint.mjs --ratchet`).
- [ ] 0 erros de compilação TypeScript (`npm run typecheck`).
- [ ] Build de produção Cloudflare Pages aprovado (`npm run build`).
- [ ] Registro canônico em `docs/design/DECISIONS.md` (`DEC-141`).
