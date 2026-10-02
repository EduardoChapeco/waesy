# SPEC-F02: Blindagem da Rota de Classificados e Desambiguação de Contexto

## 1. Contexto e Motivação
A plataforma Waesy deve manter uma separação nítida e transparente entre o canal de **Classificados** (negociação informal, desapegos, vendas diretas entre pessoas físicas ou pequenos prestadores sem complexidade) e o canal de **Marketplace** (vitrines de empresas verificadas com estoque, nota fiscal e checkout).

A Fase F02 implementa a blindagem de `/_store/classificados/`, adicionando desambiguação visual canônica, filtros estritos de listagens avulsas e links contextuais para o Marketplace e o Places.

---

## 2. Requisitos em Sintaxe EARS

### [REQ-F02-01] Desambiguação Visual e Navegação Cruzada
- **EARS (Ubíquo):** A página de Classificados (`src/routes/_store.classificados.index.tsx`) deve exibir um banner de cabeçalho esclarecendo seu papel (negociação direta e desapegos locais) e provendo link de direcionamento para o Marketplace (`/marketplace`) e para o Guia de Lugares (`/diretorio`).

### [REQ-F02-02] Isolamento de Origem das Listagens
- **EARS (Quando dados carregados):** O catálogo de classificados deve priorizar listagens do tipo avulso/informal (`origin === "classified"` ou sem checkout corporativo obrigatório), impedindo poluição do feed com itens gerenciados por ERP corporativo.

### [REQ-F02-03] Acessibilidade e Design Lint
- **EARS (Ubíquo):** Todos os novos elementos visuais devem respeitar a grade de 4px, touch targets >= 44px (`h-11`), foco explícito `:focus-visible` e zero violações no `scripts/design-lint.mjs`.

---

## 3. Invariantes
1. Não quebrar os filtros existentes nem o hook `useClassifiedCatalog`.
2. Preservar suporte a SEO e metadados OpenGraph.
3. Manter a catraca de Design Lint com zero regressões.

---

## 4. Critérios de Aceite
- [ ] `src/routes/_store.classificados.index.tsx` enriquecida com faixa de desambiguação canônica e links para `/marketplace` e `/diretorio`.
- [ ] Testes unitários atualizados em `src/routes/_store.classificados.test.ts`.
- [ ] `npm run typecheck` Exit Code 0.
- [ ] `node scripts/design-lint.mjs --ratchet` Exit Code 0.
