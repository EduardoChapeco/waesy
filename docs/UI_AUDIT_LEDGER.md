# UI_AUDIT_LEDGER.md — Registro Canônico de Auditoria Contínua de UI por Módulo

> Fonte Única da Verdade (SSOT) para o ciclo recorrente de elevação, auditoria cirúrgica e saneamento visual de módulos e rotas (PROMPT 18).

---

## 1. Regras Operacionais da Fila de Auditoria
1. **Um módulo por sessão**: proibido auditar ou tentar corrigir múltiplos módulos concorrentemente.
2. **Teto de três níveis**: Leitura cirúrgica delimitada estritamente em `rota -> componente -> chamada`.
3. **Catraca Anti-Regressão**: Nenhuma entrega pode aumentar a dívida técnica visual global ou do módulo.
4. **Alvos de Toque & Acessibilidade**: Piso mínimo de 44x44px (`h-11`) em controles interativos e teclado `:focus-visible` em 100% dos botões.
5. **Zero Mocks**: Todas as telas auditadas devem manter fidelidade com contratos BFF e dados reais de banco.

---

## 2. Histórico de Módulos Elevados e Auditados

| Ciclo | Data | Rota / Módulo Alvo | Violações Antes (P0/P1/P2/P3) | Violações Depois (P0/P1/P2/P3) | Redução Líquida | Status | Decisão | Relatório |
|---|---|---|---|---|---|---|---|---|
| #01 | 2026-10-01 | `src/routes/workspace.turismo.viagens.$id.tsx` | 63 (44/17/1/1) | 0 (0/0/0/0) | -63 violações | Concluído | DEC-034 | `ia/18-turismo-viagens.md` |

---

## 3. Fila de Prioridade dos Próximos Módulos
1. `src/routes/_store.conta.classificados.novo.tsx` (Classificados Wizard - maior débito residual)
2. `src/components/commerce/travel/travel-package-detail-view.tsx` (Turismo: Detalhe de Pacote)
3. `src/components/mining/mining-dashboard.tsx` (Mineração / Pool de Dados)
4. `src/components/classifieds/editorial-showcase-view.tsx` (Classificados: Vitrine Editorial)
5. Shell e navegação (`app-shell`, `mobile-nav`, `global-rail`)
