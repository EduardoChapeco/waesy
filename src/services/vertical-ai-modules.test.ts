import { describe, it, expect } from "vitest";
import {
  screenResumeLogic,
  generateJobDescriptionLogic,
  generateInterviewGuideLogic,
  generateCandidateSummaryLogic,
  classifyTransactionLogic,
  reconcileReceiptLogic,
  auditFiscalInconsistencyLogic,
  getFiscalCalendarAlertsLogic,
  parseConversationalExpenseLogic,
  calculateCashFlowForecastLogic,
  generateOverdueReminderCopyLogic,
  generatePeriodFinancialSummaryLogic,
  reviewContractClauseLogic,
  generateNdaDocumentLogic,
  triageLegalDemandLogic,
  runComplianceChecklistLogic,
} from "./vertical-ai-modules.functions";

describe("Vertical AI Modules (PROMPT 11 / Plano #15)", () => {
  // ── 1. RH ─────────────────────────────────────────────────────────────────
  describe("Recursos Humanos (RH)", () => {
    it("1. screenResumeLogic deve pontuar fit e identificar competências", async () => {
      const res = await screenResumeLogic({
        jobTitle: "Entregador Motoboy",
        requiredSkills: ["CNH A", "Pontualidade", "Conhecimento de rotas"],
        minExperienceYears: 1,
        resumeText: "Possuo CNH A definitiva há 3 anos, excelente pontualidade e conhecimento das rotas da cidade.",
      });

      expect(res.success).toBe(true);
      expect(res.vertical).toBe("rh");
      expect(res.requires_human_approval).toBe(true);
      expect(res.data.fitScorePct).toBeGreaterThanOrEqual(60);
      expect(res.data.matchedSkills).toContain("CNH A");
    });

    it("2. generateJobDescriptionLogic deve estruturar descrição limpa de vaga", async () => {
      const res = await generateJobDescriptionLogic({
        jobTitle: "Atendente de Loja",
        department: "Vendas",
        workplaceType: "presencial",
        seniority: "junior",
        keyResponsibilities: ["Operar caixa", "Atender clientes"],
      });

      expect(res.success).toBe(true);
      expect(res.data.title).toContain("Atendente de Loja");
      expect(res.data.responsibilities.length).toBeGreaterThan(0);
      expect(res.requires_human_approval).toBe(false);
    });

    it("3. generateInterviewGuideLogic deve gerar perguntas comportamentais STAR", async () => {
      const res = await generateInterviewGuideLogic({
        jobTitle: "Gerente de Restaurante",
        focusAreas: ["comportamental", "lideranca"],
      });

      expect(res.success).toBe(true);
      expect(res.data.questions.length).toBeGreaterThanOrEqual(3);
      expect(res.data.questions[0].category).toContain("STAR");
    });

    it("4. generateCandidateSummaryLogic deve gerar síntese com recomendação", async () => {
      const res = await generateCandidateSummaryLogic({
        candidateName: "Carlos Silva",
        interviewNotes: "Demonstrou liderança em crises anteriores e ótima comunicação.",
        fitScorePct: 85,
      });

      expect(res.success).toBe(true);
      expect(res.requires_human_approval).toBe(true);
      expect(res.data.finalDecisionAdvice).toBe("avancar_proposta");
    });
  });

  // ── 2. CONTÁBIL & FISCAL ──────────────────────────────────────────────────
  describe("Contábil & Fiscal", () => {
    it("5. classifyTransactionLogic deve mapear para plano de contas e centro de custo", async () => {
      const res = await classifyTransactionLogic({
        description: "Gasolina para entrega motoboy",
        amountCents: 15000,
        isExpense: true,
      });

      expect(res.success).toBe(true);
      expect(res.vertical).toBe("contabil");
      expect(res.data.category).toBe("Logística e Fretes");
      expect(res.data.costCenter).toBe("Operação de Entrega");
    });

    it("6. reconcileReceiptLogic deve aprovar valor exato e apontar divergência", async () => {
      const matchRes = await reconcileReceiptLogic({
        transactionId: "TX-123",
        amountCents: 5000,
        receiptTextOrId: "REC-999",
        expectedAmountCents: 5000,
      });
      expect(matchRes.data.matched).toBe(true);
      expect(matchRes.requires_human_approval).toBe(false);

      const divergeRes = await reconcileReceiptLogic({
        transactionId: "TX-124",
        amountCents: 4500,
        receiptTextOrId: "REC-998",
        expectedAmountCents: 5000,
      });
      expect(divergeRes.data.matched).toBe(false);
      expect(divergeRes.requires_human_approval).toBe(true);
      expect(divergeRes.data.discrepancyCents).toBe(-500);
    });

    it("7. auditFiscalInconsistencyLogic deve detectar divergência entre nota e pedido", async () => {
      const res = await auditFiscalInconsistencyLogic({
        invoiceNumber: "NF-00123",
        totalCents: 10000,
        orderCents: 12000,
        taxCents: 800,
      });

      expect(res.success).toBe(true);
      expect(res.data.hasInconsistencies).toBe(true);
      expect(res.requires_human_approval).toBe(true);
    });

    it("8. getFiscalCalendarAlertsLogic deve gerar cronograma com DAS", async () => {
      const res = await getFiscalCalendarAlertsLogic({
        referenceMonth: 10,
        referenceYear: 2026,
        companyRegime: "simples_nacional",
      });

      expect(res.success).toBe(true);
      expect(res.data.obligations.length).toBeGreaterThanOrEqual(2);
      expect(res.data.obligations[0].obligationName).toContain("DAS");
    });
  });

  // ── 3. FINANCEIRO ─────────────────────────────────────────────────────────
  describe("Gestão Financeira", () => {
    it("9. parseConversationalExpenseLogic deve extrair quantia e categoria de mensagem livre", async () => {
      const res = await parseConversationalExpenseLogic({
        message: "Paguei 180 reais de gasolina pro motoboy ontem",
      });

      expect(res.success).toBe(true);
      expect(res.data.amountCents).toBe(18000);
      expect(res.data.category).toBe("logistica_entrega");
      expect(res.requires_human_approval).toBe(true);
    });

    it("10. calculateCashFlowForecastLogic deve calcular saldo projetado e avaliar risco", async () => {
      const res = await calculateCashFlowForecastLogic({
        currentBalanceCents: 100000,
        expectedReceivables7dCents: 50000,
        expectedPayables7dCents: 20000,
        expectedReceivables30dCents: 150000,
        expectedPayables30dCents: 80000,
      });

      expect(res.success).toBe(true);
      expect(res.data.projectedBalance7dCents).toBe(130000);
      expect(res.data.liquidityRisk).toBe("baixo");
    });

    it("11. generateOverdueReminderCopyLogic deve redigir mensagem amigável com CDC compliance", async () => {
      const res = await generateOverdueReminderCopyLogic({
        customerName: "Maria Oliveira",
        amountCents: 12000,
        daysOverdue: 2,
        pixCopyPaste: "00020126580014BR.GOV.BCB.PIX...",
      });

      expect(res.success).toBe(true);
      expect(res.data.tone).toBe("amigavel");
      expect(res.data.cdcCompliant).toBe(true);
      expect(res.data.whatsappMessage).toContain("Maria Oliveira");
      expect(res.data.whatsappMessage).toContain("0002012658");
    });

    it("12. generatePeriodFinancialSummaryLogic deve gerar margens e DRE sintética", async () => {
      const res = await generatePeriodFinancialSummaryLogic({
        grossRevenueCents: 1000000, // R$ 10.000,00
        cmvCents: 400000,          // R$ 4.000,00
        operatingExpensesCents: 300000, // R$ 3.000,00
      });

      expect(res.success).toBe(true);
      expect(res.data.grossProfitCents).toBe(600000);
      expect(res.data.netEbitdaCents).toBe(300000);
      expect(res.data.grossMarginPct).toBe(60.0);
      expect(res.data.ebitdaMarginPct).toBe(30.0);
    });
  });

  // ── 4. JURÍDICO & GOVERNANÇA ──────────────────────────────────────────────
  describe("Jurídico & Governança", () => {
    it("13. reviewContractClauseLogic deve acusar cláusula com multa desproporcional", async () => {
      const res = await reviewContractClauseLogic({
        clauseText: "Em caso de rescisão, incidirá multa de 50% sobre o valor total do contrato, sendo irrevogavel e irretratavel.",
        contractType: "prestacao_servicos",
      });

      expect(res.success).toBe(true);
      expect(res.data.riskLevel).toBe("abusiva");
      expect(res.data.humanSignOffRequired).toBe(true);
      expect(res.requires_human_approval).toBe(true);
    });

    it("14. generateNdaDocumentLogic deve gerar acordo com jurisdição e vigência", async () => {
      const res = await generateNdaDocumentLogic({
        disclosingPartyName: "Loja Exemplo Ltda",
        receivingPartyName: "Fornecedor Beta",
        validityYears: 3,
        purpose: "Parceria de tecnologia de ponta",
      });

      expect(res.success).toBe(true);
      expect(res.data.title).toContain("CONFIDENCIALIDADE");
      expect(res.data.jurisdictionCity).toBe("Chapecó / SC");
    });

    it("15. triageLegalDemandLogic deve classificar citação judicial com urgência crítica e prazo de 5 dias", async () => {
      const res = await triageLegalDemandLogic({
        demandText: "Citação judicial para contestação em autos de execução",
        senderType: "judicial",
      });

      expect(res.success).toBe(true);
      expect(res.data.urgency).toBe("critica");
      expect(res.data.fatalDeadlineDays).toBe(5);
    });

    it("16. runComplianceChecklistLogic deve auditar checklist de conformidade LGPD", async () => {
      const res = await runComplianceChecklistLogic({
        hasPrivacyPolicy: false,
        storesCourierGpsData: true,
        sharesDataWithThirdParties: true,
      });

      expect(res.success).toBe(true);
      expect(res.data.complianceScorePct).toBe(40);
      expect(res.data.lgpdStatus).toBe("inadequado");
      expect(res.data.requiredActions.length).toBeGreaterThan(0);
    });
  });
});
