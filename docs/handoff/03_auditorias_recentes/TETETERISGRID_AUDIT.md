# TETETERISGRID_AUDIT.md — Auditoria Matemática e Visual do Motor TeteterisGrid

**Data:** 2026-10-21
**Status:** Auditado & Verificado

---

## 1. Componentes Auditados

1. **Engine Algorítmica 2D:** `src/lib/layout/teteterisgrid-engine.ts` (`computeTeteterisGrid`, `TeteterisOccupancyMatrix`)
2. **Componente Canônico de Visão:** `src/components/common/teteterisgrid-view.tsx` (`TeteterisGridView`)
3. **Renderizador de Especificações de Nicho:** `src/components/common/niche-specifications-display.tsx` (`NicheSpecificationsDisplay`)
4. **Bento Grid da Vitrine Pública:** `src/components/home/BentoGridTetris.tsx` (`BentoGridTetris`)
5. **Bento Grid Assimétrico do Studio Builder:** `src/components/builder/blocks/BentoAsymmetricGrid.tsx` (`BentoAsymmetricGrid`)

---

## 2. Verificação Matemática da Invariante Zero-Voids (`computeTeteterisGrid`)

A invariante fundamental da engine exige que a soma das áreas dos blocos alocados feche múltiplos exatos de `maxCols` na grade, sem buracos residuais:
$$\sum_{i=1}^{N} (\text{colSpan}_i \times \text{rowSpan}_i) = \text{maxCols} \times \text{totalRows}$$

| Quantidade de Cards ($N$) | `maxCols = 4` (Spans Gerados) | Soma de Áreas (`maxCols = 4`) | `maxCols = 6` (Spans Gerados) | Soma de Áreas (`maxCols = 6`) | Buracos / Lacunas |
| :---: | :--- | :---: | :--- | :---: | :---: |
| **1 Card** | `[4x1]` (Widescreen 4:1) | $4 = 4 \times 1$ | `[6x1]` (Widescreen 21:9) | $6 = 6 \times 1$ | **0** |
| **2 Cards** | `[2x1, 2x1]` (Split 50/50) | $4 = 4 \times 1$ | `[3x1, 3x1]` (Split 50/50) | $6 = 6 \times 1$ | **0** |
| **3 Cards** | `[2x2, 2x1, 2x1]` (Hero + 2) ou `[2x1, 2x1, 4x1]` | $8 = 4 \times 2$ | `[2x1, 2x1, 2x1]` (Linha única) | $6 = 6 \times 1$ | **0** |
| **4 Cards** | `[1x1, 1x1, 1x1, 1x1]` ou `4x [2x1]` | $4$ ou $8$ | `[1x1, 1x1, 1x1, 3x1]` (Greedy Tail) | $6 = 6 \times 1$ | **0** |
| **5 Cards** | `[2x2, 2x1, 2x1, 2x1, 2x1]` | $12 = 4 \times 3$ | `[1x1, 1x1, 1x1, 1x1, 2x1]` | $6 = 6 \times 1$ | **0** |
| **8 Cards** | `8x [1x1]` (ou spans preferenciais com fechamento guloso) | $8 = 4 \times 2$ | `6x [1x1]` + `[1x1, 5x1]` | $12 = 6 \times 2$ | **0** |

---

## 3. Achados e Correções Aplicadas (Anti-Truncate & Container Compacto)

1. **Suporte a Modo Compacto (`compact` / Preview Mobile) em `TeteterisGridView`:**
   - Quando renderizado dentro de um container de preview mobile (`390px`) em um monitor desktop (`>= 1280px`), as classes globais `xl:grid-cols-4` faziam o grid tentar abrir 4 colunas dentro de 390px.
   - **Correção:** Adicionada prop `compact?: boolean` e suporte responsivo seguro em `TeteterisGridView` para colapsar para 1–2 colunas quando em preview mobile compacto, preservando 4/6 colunas no desktop.
2. **Erradicação de `truncate` em Especificações (`CanonicalListingView`):**
   - Removida a classe `truncate` nos valores de especificações técnicas de `CanonicalListingView` (linha 246), aplicando `break-words leading-snug` em conformidade com a Invariante B.38 (`AGENTS.md`).
3. **Prevenção de CLS / Efeito Sanfona (Invariante B.43):**
   - Imagens em galerias e cards possuem container com `aspect-ratio` explícito (`aspect-[4/3]`, `aspect-[16/10]`, `aspect-square`) e `overflow-hidden bg-muted` antes do carregamento da mídia.
