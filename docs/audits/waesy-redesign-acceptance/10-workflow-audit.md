# 10 — Auditoria dos 52 Fluxos Operacionais de Negócio

## 1. Síntese da Cobertura de Fluxos
O mapeamento integral dos 52 fluxos está registrado no arquivo [workflow-audit.csv](file:///c:/Users/Excelência%20Tour%20SMO/Documents/waesy/docs/audits/waesy-redesign-acceptance/workflow-audit.csv).

- **Fluxos Totalmente Aprovados com Testes E2E:** 12 fluxos (23.1%)
- **Fluxos Funcionalmente Validados (Sem Testes Automatizados E2E Dedicados):** 36 fluxos (69.2%)
- **Fluxos com Pendências ou Gaps (Não Conformes / Parciais):** 4 fluxos (7.7%)

---

## 2. Fluxos Auditados com Gaps Críticos

### WF-012: Emissão Fiscal Automática (NF-e)
- **Problema (GAP-001 / NC-005):** Quando um pedido é liquidado no PDV ou Delivery, se a loja não tiver configurado o token do Focus NFe, o sistema ignora o erro silenciosamente sem gerar alerta na fila fiscal (`fiscal_events_queue`).
- **Severidade:** **P0**.

### WF-006: Fechamento de Agendamento e Recepção
- **Problema (GAP-002 / NC-006):** A conclusão do atendimento na agenda atualiza o status para `completed`, mas não dispara opcionalmente um título a receber no módulo de Caixa diário.
- **Severidade:** **P1**.

### WF-021: Expiração de Checkout de Impulsionamento de Classificados
- **Problema (GAP-003 / NC-007):** Ausência de rotina cron para cancelar tentativas de impulsionamento abandonadas há mais de 24 horas no gateway de pagamento.
- **Severidade:** **P2**.

### WF-018: Simulação de Audiência (SimLab)
- **Problema (GAP-004 / NC-008):** Os relatórios gerados por inteligência artificial são estáticos e não possuem botão para aplicar as alterações diretamente ao catálogo de produtos.
- **Severidade:** **P2**.
