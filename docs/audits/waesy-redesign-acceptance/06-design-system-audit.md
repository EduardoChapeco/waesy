# 06 — Auditoria do Design System e Conformidade de Tokens

## 1. Estado da Camada de Tokens CSS
- **Tokens Canônicos:** Definidos em `src/styles.css` e consumidos via utilitários semânticos do Tailwind CSS v4.
- **Cores Semânticas:** `var(--background)`, `var(--foreground)`, `var(--card)`, `var(--primary)`, `var(--muted)`, `var(--destructive)`, `var(--warning)`, `var(--success)`.
- **Higienização Realizada no Commit `21226706`:** Remoção de 32 cores hexadecimais literais em `src/services/kanban-config.functions.ts` e substituição por variáveis de token CSS.

---

## 2. Catraca Mecânica de Design Lint (CI Ratchet)
- **Comando de Verificação:** `node scripts/design-lint.mjs --ratchet`
- **Baseline Fixada:** 674 violações totais.
- **Distribuição por Severidade:**
  - **P0 (Bloqueadores Críticos):** **0 violações** (zero `!important`, zero quebras críticas de contraste).
  - **P1 (Bloqueadores de Merge):** **668 violações** (valores arbitrários e cores hexadecimais em arquivos legados).
  - **P2 (Avisos de Melhoria):** **6 violações**.
- **Não-Regressão:** A baseline histórica foi reduzida em 20 unidades durante os trabalhos preparatórios da auditoria.
