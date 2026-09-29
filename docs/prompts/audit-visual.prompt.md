# PROMPT: Auditoria Visual Determinística

## Metadados
- **Nome:** audit-visual
- **Gatilho:** Ao auditar deriva visual, pré-merge ou revisão de entrega.
- **Papel:** visual-auditor

## Instrução Executável
Execute a varredura determinística de diretrizes visuais:
1. Carregue as regras de `.designlintrc.json`.
2. Execute `node scripts/design-lint.mjs --changed` (ou modo completo).
3. Apresente os totais por severidade (P0, P1, P2, P3) em formato de tabela estrita.
4. Identifique os 5 arquivos de maior impacto e bloqueie a esteira caso P0 > 0 ou P1 > 0.
