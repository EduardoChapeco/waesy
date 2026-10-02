# SPEC-S26: Família Superfície e Dados Canônica (Plano 5 — Bloco D)

## 1. Identificação e Metadados
- **ID da Especificação:** SPEC-S26
- **Fase:** S26 (Plano 5 — Estrutura, Escala e Operação BigTech)
- **Módulo Alvo:** `src/components/ui/canonical/data-surface.tsx`, `src/components/ui/canonical/index.ts`, `src/components/design-system/surfaces-family.tsx`, `src/routes/workspace.design-system.tsx`
- **Autor / Agente:** Antigravity / BigTech Executive Board
- **Data:** 2026-10-02
- **Status:** Aprovada para Implementação

---

## 2. Contexto e Objetivos
A Fase S26 formaliza a família canônica de **Superfície e Dados**, unificando containers estruturais (`CanonicalSurface`), blocos de métricas (`CanonicalKpiTile`), linhas de extrato/contábeis (`CanonicalLedgerRow`) e tabelas de dados de alta densidade (`CanonicalDataTable`).
Assegura conformidade estrita com o Catálogo de Design Lint (DL-01 a DL-30):
- **DL-03**: Espaçamentos restritos à grade modular de 4px (`p-0`, `p-3`, `p-4`, `p-6`).
- **DL-05**: Alinhamento numérico estrito com `font-mono` para valores contábeis e quantitativos.
- **DL-07**: Zero sombras decorativas em superfícies utilitárias (apenas borda canônica `border-border`).
- **DL-11/DL-12/DL-13**: Matriz completa de 4 estados (Dados, Skeleton, Vazio e Erro).
- **DL-14 / DL-15**: Alvos de toque móveis >= 44px (`h-11`) e `:focus-visible` obrigatório.

---

## 3. Requisitos EARS (Easy Approach to Requirements Syntax)

### 3.1 Requisitos Ubíquos (Sempre Ativos)
- [REQ-S26-U1]: O sistema SEMPRE deve renderizar `CanonicalSurface` com `rounded-lg border border-border` e preenchimento de fundo semântico (`bg-card`), sem sombras decorativas em superfícies utilitárias.
- [REQ-S26-U2]: O sistema SEMPRE deve formatar valores contábeis, monetários e quantitativos com `font-mono` em `CanonicalKpiTile` e `CanonicalLedgerRow`.

### 3.2 Requisitos Orientados a Evento (Quando... O sistema deve...)
- [REQ-S26-E1]: QUANDO `CanonicalKpiTile` receber propriedade `trend`, O sistema DEVE exibir o percentual com ícone semântico (`TrendingUp` para positivo ou `TrendingDown` para negativo) respeitando a paleta semântica (`text-emerald-600 dark:text-emerald-400` ou `text-destructive`).
- [REQ-S26-E2]: QUANDO uma linha de `CanonicalLedgerRow` for interativa (possuir `onClick` ou `onSelect`), O sistema DEVE aplicar `cursor-pointer hover:bg-muted/40` e manter alvo de toque com altura mínima de 44px (`min-h-11`).

### 3.3 Requisitos Baseados em Estado (Enquanto... O sistema deve...)
- [REQ-S26-S1]: ENQUANTO o estado de `CanonicalKpiTile` ou `CanonicalDataTable` for `loading`, O sistema DEVE renderizar componentes `Skeleton` espelhados com a exata geometria dos elementos de dados para garantir Cumulative Layout Shift (CLS) = 0.
- [REQ-S26-S2]: ENQUANTO a coleção de dados estiver vazia (`data.length === 0`), O sistema DEVE renderizar um `EmptyState` canônico com ícone de domínio e ação de cadastro primária ou secundária.
- [REQ-S26-S3]: ENQUANTO houver erro de carregamento (`error` presente), O sistema DEVE renderizar um painel de alerta descritivo com ação de reintento (`onRetry`).

---

## 4. Invariantes do Módulo
1. **Semântica Monospaçada**: Todo numeral que expressa moeda (BRL), quantidade em estoque, percentual de margem ou código de identificação deve conter a classe `font-mono`.
2. **Grade Espacial Limpa**: Nenhuma classe de espaçamento ou margem fora dos múltiplos de 4px (`p-3`, `p-4`, `p-6`, `gap-2`, `gap-4`).
3. **Ergonomia e Acessibilidade**: Todas as ações clicáveis dentro das superfícies e tabelas devem ter altura mínima de 44px (`h-11` ou `min-h-11`) e anel de foco teclado (`focus-visible:ring-2`).

---

## 5. Critérios de Aceite e Evidências
1. Primitivas `CanonicalSurface`, `CanonicalKpiTile`, `CanonicalLedgerRow` e `CanonicalDataTable` implementadas e exportadas em `src/components/ui/canonical/data-surface.tsx`.
2. Barrel `src/components/ui/canonical/index.ts` atualizado.
3. Componente `src/components/design-system/surfaces-family.tsx` refatorado para exibir a nova família nas 4 matrizes de estado.
4. Suíte de testes `src/components/design-system/design-system-showcase.test.ts` estendida com asserções para a família superfície e dados.
5. Verificação `node scripts/design-lint.mjs --changed` reportando 0 violações P0 e 0 violações P1.
6. Vitest 100% verde.
