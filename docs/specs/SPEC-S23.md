# SPEC-S23: Auditoria de Tokens e Consolidação na Fonte Única

## 1. Identificação e Metadados
- **Fase**: S23 (Auditoria de Tokens e Consolidação na Fonte Única).
- **Plano**: Plano 5 — Estrutura, Escala e Operação BigTech (Bloco D: Design System como Fonte Única).
- **Responsáveis**: BigTech Engineering Board (Design System Architect, Staff Frontend Engineer, Visual Auditor).
- **Data**: 2026-10-02.
- **Invariantes**: DL-01, DL-02, DL-03, DL-04, B.2, B.4, B.8.
- **Severidade**: P0 (Consistência Visual, Tokens DTCG e Fonte Única da Verdade).

---

## 2. Requisitos em Sintaxe EARS

- **[EARS-1] (Ubíquo - Padrão W3C DTCG)**: O arquivo `docs/design/tokens.json` DEVE estruturar 100% dos tokens de design nas três camadas canônicas (Primitivos -> Semânticos -> Componente) com `$type` e `$value` em conformidade estrita com o padrão W3C Design Tokens Community Group (DTCG).
- **[EARS-2] (Ubíquo - Paridade Bidirecional de Variáveis CSS)**: Todo token declarado em `docs/design/tokens.json` DEVE possuir correspondência direta em `src/styles.css` (no bloco `:root` ou `@theme inline`), e toda variável consumida pelos componentes canônicos DEVE estar rastreada e documentada no catálogo de tokens.
- **[EARS-3] (Condicional - Execução de Validação Automatizada)**: Quando o script `node scripts/token-sync.mjs --check` for executado, o sistema DEVE inspecionar todas as referências cruzadas entre `tokens.json` e `src/styles.css`, emitindo Exit Code 0 se houver 100% de paridade ou Exit Code 1 se forem encontrados tokens órfãos ou aliases quebrados.
- **[EARS-4] (Comportamento Indesejado - Desvio de Token Hardcoded)**: O sistema NÃO DEVE permitir cores literais (`#hex`, `rgb`, `hsl`) ou espaçamentos arbitrários fora da grade modular de 4px nos componentes de UI, bloqueando desvios através de `scripts/design-lint.mjs`.
- **[EARS-5] (State-Driven - Suporte a Modo Escuro Semântico)**: Quando o tema do sistema for alterado (`.dark`), as variáveis semânticas (`surface-canvas`, `surface-card`, `text-primary`, `border-default`) DEVEM remapear automaticamente para os tokens tonais correspondentes sem intervenção em componentes.

---

## 3. Arquitetura das Camadas de Tokens

### Camada 1: Primitivos (`tokens.json` -> `primitive`)
- Escalas neutras e coloridas: `neutral` (0 a 950), `red`, `green`, `amber`, `blue`.
- Escala espacial modular: múltiplos de 4px (`space.0` a `space.16`).
- Geometria de cantos: `radius` (`xs` a `full`).

### Camada 2: Semânticos (`tokens.json` -> `semantic`)
- Superfícies: `surface-canvas`, `surface-card`, `surface-elevated`, `surface-muted`.
- Tipografia: `text-primary`, `text-secondary`, `text-muted`, `text-inverse`.
- Bordas e divisores: `border-default`, `border-subtle`, `border-focus`.
- Feedback: `feedback-success`, `feedback-warning`, `feedback-error`, `feedback-info`.

### Camada 3: Componente (`tokens.json` -> `component` / `@theme inline`)
- Botões: `button-primary-bg`, `button-primary-text`, `button-radius`.
- Inputs: `input-border`, `input-focus-ring`, `input-radius`, `input-height-mobile` (44px).
- Cards: `card-border`, `card-bg`, `card-radius`.

---

## 4. Evidências de Aceite
1. Execução de `node scripts/token-sync.mjs --check` com Exit Code 0 e relatório de paridade.
2. `src/styles.css` e `docs/design/tokens.json` sincronizados sem variáveis órfãs.
3. 0 violações P0/P1 na auditoria de design com catraca (`node scripts/design-lint.mjs --ratchet`).
4. Testes Vitest 100% verdes (`npm run test`).
5. Zero erros TypeScript (`npm run typecheck`).
