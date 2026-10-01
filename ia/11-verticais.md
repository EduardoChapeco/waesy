# 11. Módulos Verticais com IA: RH, Contábil, Financeiro e Jurídico

**Status:** APROVADO E IMPLEMENTADO  
**Plano:** #15 (PROMPT 11)  
**Data:** 2026-09-30  
**Arquitetura:** Porta única via `executeUnifiedAiCall` (PROMPT 02), catálogo declarativo de skills (PROMPT 03), squads autônomos (PROMPT 04), memória e tom de voz (PROMPT 05), registry de blocos (PROMPT 06) e chat AI-first (PROMPT 09).

---

## 1. Princípios e Regras Invioláveis

1. **Porta Única**: Nenhum módulo vertical conecta diretamente a provedores de LLM externos; todas as chamadas trafegam pelo Gateway Central de IA com fallback e telemetria.
2. **Revisão Humana Obrigatória (Human-in-the-Loop)**: Toda decisão com impacto trabalhista, fiscal, financeiro ou contratual é classificada com `requires_human_approval = true` e nível de confiança auditável.
3. **Zero Mocks & Zero Fallbacks Encenados**: Em ausência de chaves de IA no ambiente, o sistema aplica estruturação semântica determinística baseada em regras de negócio canônicas sem números ou textos fictícios.
4. **Isolamento Multi-Tenant**: Dados de funcionários, lançamentos financeiros, obrigações contábeis e minutas jurídicas são estritamente filtrados pelo `store_id` e permissões do `workspace_members`.
5. **Integração Omnichannel**: As 16 capacidades verticais são acionáveis tanto pela interface dedicada do workspace quanto via ações estruturadas no Chat AI-First.

---

## 2. Matriz das 16 Capacidades Verticais por Módulo

| Módulo | Capacidade | Finalidade | Nível de Risco | Exige Aprovação Humana | Ação de Chat |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RH** | `screen_resume` | Triagem e pontuação de aderência de candidatos | Médio | Sim | `action:rh_screen_resume` |
| **RH** | `generate_job_description` | Criação de descrições de vagas alinhadas ao nicho | Baixo | Não | `action:rh_job_description` |
| **RH** | `interview_guide` | Roteiro estruturado de perguntas STAR para recrutamento | Baixo | Não | `action:rh_interview_guide` |
| **RH** | `candidate_summary` | Síntese executiva imparcial de histórico e qualificações | Médio | Sim | `action:rh_candidate_summary` |
| **Contábil** | `classify_transaction` | Classificação automática de despesas no Plano de Contas | Médio | Sim | `action:contabil_classify` |
| **Contábil** | `reconcile_receipt` | Cruzamento de comprovantes PIX/DOC com pedidos e saldo | Alto | Sim | `action:contabil_reconcile` |
| **Contábil** | `audit_fiscal_inconsistency` | Verificação de notas fiscais, alíquotas e divergências | Alto | Sim | `action:contabil_audit_fiscal` |
| **Contábil** | `fiscal_calendar_alerts` | Projeção de calendário tributário e alertas de vencimento | Médio | Não | `action:contabil_calendar` |
| **Financeiro** | `conversational_expense_entry` | Lançamento e estruturação de despesa via mensagem livre | Médio | Sim | `action:fin_record_expense` |
| **Financeiro** | `cash_flow_forecast` | Projeção de fluxo de caixa com análise de solvência | Médio | Não | `action:fin_cash_forecast` |
| **Financeiro** | `overdue_reminder_copy` | Régua de cobrança cordial e personalizável via WhatsApp | Baixo | Sim | `action:fin_reminder_copy` |
| **Financeiro** | `period_financial_summary` | Sumário gerencial com DRE sintética e margem de lucro | Baixo | Não | `action:fin_period_summary` |
| **Jurídico** | `review_contract_clause` | Detecção de cláusulas abusivas, limites e ambiguidades | Crítico | Sim | `action:legal_review_clause` |
| **Jurídico** | `generate_nda` | Minuta contratual de confidencialidade mútua/unilateral | Alto | Sim | `action:legal_generate_nda` |
| **Jurídico** | `legal_demand_triage` | Triagem de notificações extrajudiciais e contencioso | Alto | Sim | `action:legal_triage_demand` |
| **Jurídico** | `compliance_checklist` | Auditoria de conformidade regulatória (LGPD, CDC) | Médio | Sim | `action:legal_compliance` |

---

## 3. Especificação Detalhada por Módulo

### 3.1. Recursos Humanos (RH)

- **`screen_resume`**: Analisa currículo em texto bruto contra os requisitos de uma vaga aberta (`job_title`, `required_skills`, `experience_years`). Extrai competências técnicas, experiência relevante, pontos fortes, lacunas e atribui nota de fit (0 a 100%).
- **`generate_job_description`**: Produz título direto, missão da posição, responsabilidades-chave, requisitos indispensáveis, diferenciais e benefícios de acordo com a cultura da empresa e o nicho de mercado local.
- **`interview_guide`**: Elabora roteiro de entrevista com 5 a 8 perguntas situacionais/comportamentais (formato STAR: Situação, Tarefa, Ação, Resultado) com rubrica de avaliação para o entrevistador.
- **`candidate_summary`**: Gera dossiê sintético de 1 página contendo histórico profissional, principais realizações quantificadas, avaliação de fit e recomendação de avanço para fase decisória.

### 3.2. Contábil & Fiscal

- **`classify_transaction`**: Processa descrição de despesa (ex.: "combustível entrega moto", "aluguel sala comercial") e mapeia para a categoria do Plano de Contas padrão, natureza contábil (despesa operacional, custo de mercadoria, despesa administrativa) e dedutibilidade fiscal.
- **`reconcile_receipt`**: Cruza identificador de transação PIX/cartão com o pedido de origem e extrato bancário, validando valor em centavos, data/hora e divergências de arredondamento.
- **`audit_fiscal_inconsistency`**: Inspeciona NF-e/NFC-e emitidas para detectar ausência de vínculo com pedidos, alíquota incorreta de ICMS/Simples Nacional e divergência entre valor faturado e recebido.
- **`fiscal_calendar_alerts`**: Computa prazos de recolhimento de impostos federais, estaduais e municipais (DAS, ICMS ST, ISS) com cálculo de antecedência para aviso de liquidez.

### 3.3. Gestão Financeira

- **`conversational_expense_entry`**: Converte frases informais enviadas pelo lojista no chat (ex.: "paguei 150 conto pro motoboy da entrega ontem a noite") em um objeto estruturado de despesa com valor em centavos (15000), categoria `logistica_entrega`, fornecedor e data de vencimento/pagamento.
- **`cash_flow_forecast`**: Avalia contas a pagar e a receber nos próximos 7, 30 e 90 dias, aplicando taxa esperada de inadimplência e sinalizando dias com saldo projetado negativo.
- **`overdue_reminder_copy`**: Redige mensagens de lembrete de parcela vencida (preventivo, no dia do vencimento, 3 dias após, 7 dias após) respeitando o Art. 42 do CDC (sem constrangimento ou coação) e injetando chave PIX e linha digitável.
- **`period_financial_summary`**: Consolida receitas brutas, custos de mercadoria (CMV), despesas operacionais fixas e variáveis, resultando em EBITDA e margem de contribuição com comparativo de período anterior.

### 3.4. Jurídico & Governança

- **`review_contract_clause`**: Analisa minutas contratuais (prestação de serviços, locação, fornecimento, parceria) identificando cláusulas de renovação automática silenciosa, multas desproporcionais, foro divergente da comarca e ausência de SLA.
- **`generate_nda`**: Cria acordo de confidencialidade sob medida (unilateral ou bilateral) protegendo segredos comerciais, listas de clientes e dados operacionais com vigência definida e penalidades proporcionais.
- **`legal_demand_triage`**: Examina notificações extrajudiciais, reclamações no Procon ou citações judiciais recebidas, extraindo prazo fatal de resposta, partes envolvidas, valor atribuído à causa e recomendação de providências imediatas.
- **`compliance_checklist`**: Avalia processos do workspace à luz da LGPD (bases legais de tratamento, termo de consentimento, descarte seguro de dados de clientes e entregadores) gerando plano de ação corretivo.

---

## 4. Integração com o Chat AI-First e Blocos de UI

Todas as capacidades exportam um payload canônico de renderização utilizável pelo componente `src/components/chat/structured-message-view.tsx` contendo:
```json
{
  "type": "vertical_ai_result",
  "vertical": "rh" | "contabil" | "financeiro" | "juridico",
  "capability": "screen_resume",
  "title": "Triagem de Candidato",
  "confidence": 0.95,
  "requires_human_approval": true,
  "summary": "Candidato apresenta 88% de aderência à vaga com destaque em logística urbana.",
  "data": { ... },
  "actions": [
    { "label": "Aprovar para Entrevista", "action": "approve_candidate", "variant": "default" },
    { "label": "Descartar com Feedback", "action": "reject_candidate", "variant": "outline" }
  ]
}
```

---

## 5. Critérios de Aceite e Definição de Pronto

- [x] Especificação técnica registrada em `ia/11-verticais.md`.
- [x] Serviço canônico `src/services/vertical-ai-modules.functions.ts` implementado com 16 capacidades tipadas.
- [x] Suíte de testes automatizados `src/services/vertical-ai-modules.test.ts` com 100% de aprovação.
- [x] Proteção Human-in-the-Loop ativa em todas as operações com impacto jurídico, financeiro ou trabalhista.
- [x] Roteamento de fallback determinístico seguro contra indisponibilidade de rede ou chave de IA.
- [x] Ledger atualizado e selo `PROMPT_11_VERTICAL_AI_MODULES_CERTIFIED` emitido.
