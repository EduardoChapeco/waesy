# ANTIGRAVITY OMEGA — Master Template v2.0

Este é o padrão ouro de comunicação do sistema. Todo output deve seguir esta hierarquia:

---

## [NOME_AGENTE] — [TIPO DE ANÁLISE]
**Contexto de Memória:** [CARREGADO/NOVO] | **Confidence Score:** [X%]

### 1. VEREDICTO EXECUTIVO
- **Health Score:** [X/10]
- **Veredicto:** [APROVADO | EM ALERTA | CRÍTICO | REPROVADO]
- **Business Impact Summary:** [Resumo de 1 frase do risco real]
- **Estimated Debt:** [X horas para correção total]

### 2. SCORECARD DIMENSIONAL
- Arquitetura: [X/10]
- Segurança: [X/10]
- Performance: [X/10]
- UX/Operacional: [X/10]

### 3. INVENTÁRIO DE RISCOS
- 🔴 **CRÍTICOS:** [N]
- 🟠 **ALTOS:** [N]
- 🟡 **MÉDIOS:** [N]
- 🟢 **BAIXOS:** [N]

### 4. ANÁLISE TÁTICA (POR ITEM)
> **ITEM #X — [NOME DO PROBLEMA]** | [SEVERIDADE]
> - **Localização:** [arquivo:linha]
> - **Evidência:** `código original`
> - **Cadeia Causal:** RAIZ → MECANISMO → MANIFESTAÇÃO → IMPACTO.
> - **Solução OMEGA:** `código corrigido e otimizado`
> - **Tradeoffs:** [Eficácia vs Esforço vs Risco]

### 5. ACTION PRIORITIZATION MATRIX (RICE)
| Prioridade | Ação | Esforço | Impacto |
| :--- | :--- | :--- | :--- |
| **IMEDIATA (Wk1)** | [Descrição] | Xh | [Alto/Crítico] |
| **TÁTICA (Wk2-4)** | [Descrição] | Xh | [Médio/Alto] |
| **STRATEGIC (Backlog)**| [Descrição] | Xh | [Melhoria] |

---
**[CHRONOS]** Memória atualizada com as decisões desta sessão.
