# SPEC-F14 — Motor de Busca Universal (Classificados + Marketplace + Places)

## 1. Identificação e Metadados
- **ID:** SPEC-F14-UNIVERSAL-SEARCH
- **Fase:** F14 (Plano de Estabilização E2E — Os 4 Pilares)
- **Status:** Aprovada
- **Data:** 2026-10-02
- **Autor:** BigTech Engineering & Architecture Board (Antigravity Agent)
- **SSOT Relacionados:** `AGENTS.md`, `DESIGN.md`, `DESIGN-LINT.md`, `PROXIMOS_PLANOS_EXECUCAO.md`, `SPEC-F01-MARKETPLACE-SHOWCASE.md`.

---

## 2. Contexto e Escopo Delimitado
O ecossistema Waesy unifica a descoberta urbana em seus 3 pilares públicos de consumo:
1. **Places (`/places`, `/diretorio`):** Estabelecimentos físicos, horários e reputação.
2. **Classificados (`/classificados`):** Anúncios C2C, desapego e microcomércio informal.
3. **Marketplace (`/marketplace`):** Vitrines comerciais transacionais de empresas credenciadas (Workspace Pro).

Esta especificação consolida o Motor de Busca Universal:
- **Server Function Federada (`universalSearchFn` / `federatedSearch`):** Execução paralela em `Promise.all` nas tabelas `products`, `classifieds` e `stores`/`places` no Supabase com isolamento de tenant.
- **Paridade de Rota (`/busca` e `/buscar`):** Suporte transparente a ambas as URLs com preservação de query parameters (`?q=...&tipo=...`).
- **Zero Mocks (M01):** Resultados 100% reais provenientes do banco, exibindo `<EmptyState />` honesto na ausência de correspondências.

---

## 3. Requisitos Funcionais em Sintaxe EARS

### 3.1 Requisitos Ubíquos (Ubiquitous Requirements)
- **EARS-U01:** O sistema SHALL retornar em cada item do resultado o atributo `type` discriminado (`product`, `classified`, `store`, `event`), permitindo renderização polimórfica de cards.
- **EARS-U02:** O sistema SHALL consultar dados reais no Supabase em `products`, `classifieds` e `stores`, proibindo dados sintéticos ou placeholders mock (M01: Zero Mocks).

### 3.2 Requisitos Orientados a Eventos (Event-driven Requirements)
- **EARS-E01:** QUANDO o usuário acessar `/_store/busca` com parâmetros de busca, O sistema SHALL redirecionar imediatamente para `/_store/buscar` preservando a querystring.
- **EARS-E02:** QUANDO o usuário digitar uma query de busca com 2 ou mais caracteres, O sistema SHALL disparar `universalSearchFn` em paralelo em todos os pilares solicitados.

### 3.3 Requisitos de Estado (State-driven Requirements)
- **EARS-S01:** ENQUANTO a busca não retornar correspondências, A interface SHALL apresentar o componente canônico `<EmptyState />` informando que nenhum resultado foi encontrado para o termo pesquisado.
- **EARS-S02:** ENQUANTO os dados estiverem sendo carregados, A interface SHALL exibir esqueletos geométricos paritários (`PageSkeleton`).

### 3.4 Tratamento de Comportamentos Indesejados (Unwanted Behaviors)
- **EARS-W01:** SE a query de busca for menor que 2 caracteres, ENTÃO O sistema NÃO SHALL disparar queries federadas pesadas, exibindo em vez disso as sugestões de descoberta (`getSearchDiscoveryData`).
- **EARS-W02:** SE uma das queries do banco falhar, ENTÃO O sistema SHALL tratar graciosamente o erro retornando lista vazia para a entidade sem quebrar as demais.

---

## 4. Definition of Done & Critérios de Aceite
- [ ] Exportação de `universalSearchFn` em `src/services/search.functions.ts`.
- [ ] Criação de rota `src/routes/_store.busca.tsx` com redirecionamento canônico para `/buscar`.
- [ ] Suíte de testes unitários verdes em `src/services/search.functions.test.ts`.
- [ ] 0 violações de design lint na catraca (`node scripts/design-lint.mjs --ratchet`).
- [ ] 0 erros de compilação TypeScript (`npm run typecheck`).
- [ ] Registro canônico em `docs/design/DECISIONS.md` (`DEC-140`).
