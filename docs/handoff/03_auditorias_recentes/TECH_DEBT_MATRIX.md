# TECH_DEBT_MATRIX.md — Matriz de Débito Técnico e Severidades
## Classificação Taxonômica (P0 a P4), Causa Raiz e Plano de Remediação
**Data:** 2026-10-21  
**Módulo:** Turismo, Viagens & Lazer / Waesy  
**Status:** Auditado com Ações Corretivas Executadas  

---

### 1. Matriz de Problemas por Severidade

| ID | Severidade | Sintoma Operacional | Causa Raiz | Módulos Afetados | Solução Implementada | Risco / Teste |
| :--- | :---: | :--- | :--- | :--- | :--- | :--- |
| **DEBT-01** | **P0** | Risco de perda de contatos de cotação ou poluição cruzada no CRM. | Falta de tabela pré-CRM intermediária para reter intenções de longo prazo (6 a 12 meses). | Cotações / CRM | Criada `travel_commercial_contacts` e `travel_interests` com RLS estrito (DEC-300). | Baixo risco; coberto por testes em `travel-commercial-intelligence.functions.test.ts`. |
| **DEBT-02** | **P1** | Ofertas de pacotes expiradas continuavam aceitando cliques de compra. | Ausência de verificação do fuso horário brasileiro de encerramento (`America/Sao_Paulo`). | Vitrine / Ofertas | Implementada `evaluateOfferLifecycleState` e banner defensivo em `editorial-showcase-view.tsx`. | Zero risco; testado em `excelencia-offer-engine.test.ts`. |
| **DEBT-03** | **P1** | Truncamento visual de hotéis com nomes longos em cards móveis. | Uso da classe `truncate` em contêineres rígidos. | Vitrine / Cards | Substituição por `break-words text-wrap leading-tight` (Invariante B.38). | Testado com hotéis de 50+ caracteres sem overflow. |
| **DEBT-04** | **P2** | Divergência de cores entre Tailwind v4 e classes literais em botões (`text-white`). | Uso de utilitários hardcoded fora dos tokens de design. | Rotas Workspace | Migração para token semântico `text-primary-foreground`. | Validado pelo Design Lint com zero violações. |
| **DEBT-05** | **P3** | Raios de curvatura não-canônicos (`rounded-xl` em cards de métricas). | Mistura de padrões visuais em gavetas. | Workspace Components | Padronização universal em `rounded-lg` (16px) ou `rounded-md` (8px). | Validado pelo Design Lint (DL-09). |

---

### 2. Protocolo de Resolução de Raiz (Anti-Remendo)

Para cada débito identificado:
1. **Identificação da Causa Raiz:** O problema nunca é tratado na ponta superficial (ex: não aumentamos a altura de 30 cards individualmente; corrigimos o primitivo de layout).
2. **Characterization Test:** Um teste automatizado no Vitest captura a falha antes da alteração do código.
3. **Refatoração no Ponto Central:** A correção é aplicada no motor matemático (`excelencia-offer-engine.ts`) ou no token semântico.
4. **Verificação da Catraca:** O Design Lint Ratchet e o Typecheck garantem que nenhum novo débito entre no repositório.
