import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const chain: any = {};
    chain.validator = () => chain;
    chain.handler = () => ({});
    return chain;
  },
}));
import { executeUnifiedAiCall } from "./api-orchestrator.functions";
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

vi.mock("./api-orchestrator.functions", () => ({ executeUnifiedAiCall: vi.fn() }));

const ai = vi.mocked(executeUnifiedAiCall);
const aiResponse = (parsedJson: unknown) => ({
  content: JSON.stringify(parsedJson), text: JSON.stringify(parsedJson), provider: "openai" as const, model: "test", parsedJson,
});

beforeEach(() => {
  ai.mockImplementation(async ({ feature }) => {
    if (feature === "rh_screen_resume") return aiResponse({
      candidateName: null,
      skillEvidence: [
        { skill: "CNH A", evidence: "CNH A definitiva" },
        { skill: "Pontualidade", evidence: "pontualidade" },
      ],
    });
    if (feature === "rh_job_description") return aiResponse({
      title: "Atendente de Loja", summary: "Rascunho para revisão.",
      responsibilities: ["Operar caixa", "Atender clientes"], requirements: ["Revisar requisitos com a equipe"], benefits: ["Benefício inventado"],
    });
    if (feature === "rh_interview_guide") return aiResponse({
      jobTitle: "Gerente de Restaurante", questions: [{ category: "Comportamental", question: "Descreva uma situação relevante.", expectedIndicators: ["Contexto e ações relatados"] }],
    });
    throw new Error(`Feature inesperada: ${feature}`);
  });
});

describe("Vertical AI Modules — grounding, inputs e revisão humana", () => {
  describe("RH", () => {
    it("extrai evidência literal do currículo sem produzir score ou decisão automática", async () => {
      const res = await screenResumeLogic({
        jobTitle: "Entregador Motoboy", requiredSkills: ["CNH A", "Pontualidade", "Conhecimento de rotas"],
        minExperienceYears: 1, resumeText: "Possuo CNH A definitiva há 3 anos, excelente pontualidade e conhecimento das rotas da cidade.",
      });
      expect(res.success).toBe(true);
      expect(res.data.fitScorePct).toBeNull();
      expect(res.data.fitEvaluation).toBe("not_evaluated");
      expect(res.data.matchedSkills).toEqual(["CNH A", "Pontualidade"]);
      expect(res.data.missingSkills).toEqual(["Conhecimento de rotas"]);
      expect(res.data.recommendation).toBe("requires_human_review");
      expect(res).not.toHaveProperty("confidence");
    });

    it("rejeita evidência inventada e falha da IA em vez de usar fallback", async () => {
      ai.mockResolvedValueOnce(aiResponse({ candidateName: null, skillEvidence: [{ skill: "CNH A", evidence: "texto ausente" }] }));
      await expect(screenResumeLogic({ jobTitle: "Entregador", requiredSkills: ["CNH A"], resumeText: "Currículo com dados de exemplo.", minExperienceYears: 0 })).rejects.toThrow(/evidência ausente/);
      ai.mockResolvedValueOnce(aiResponse({ candidateName: "Nome Inventado", skillEvidence: [] }));
      await expect(screenResumeLogic({ jobTitle: "Entregador", requiredSkills: [], resumeText: "Currículo sem qualquer identificação pessoal.", minExperienceYears: 0 })).rejects.toThrow(/nome ausente/);
      ai.mockRejectedValueOnce(new Error("sem provedor"));
      await expect(generateJobDescriptionLogic({ jobTitle: "Atendente" })).rejects.toThrow("sem provedor");
    });

    it("produz descrição como rascunho, sem semear benefícios não informados", async () => {
      const res = await generateJobDescriptionLogic({ jobTitle: "Atendente de Loja", department: "Vendas", workplaceType: "presencial", seniority: "junior", keyResponsibilities: ["Operar caixa"] });
      expect(res.data.benefits).toEqual([]);
      expect(res.data.contentStatus).toBe("draft");
      expect(res.requires_human_approval).toBe(true);
    });

    it("valida estrutura de roteiro gerado por IA e o identifica como rascunho", async () => {
      const res = await generateInterviewGuideLogic({ jobTitle: "Gerente de Restaurante", focusAreas: ["comportamental"] });
      expect(res.data.questions).toHaveLength(1);
      expect(res.data.contentStatus).toBe("draft");
    });

    it("resume somente as notas fornecidas e não cria score, highlights ou parecer", async () => {
      const res = await generateCandidateSummaryLogic({ candidateName: "Carlos Silva", interviewNotes: "Demonstrou liderança em crises anteriores e ótima comunicação." });
      expect(res.data.executiveSummary).toBe("Demonstrou liderança em crises anteriores e ótima comunicação.");
      expect(res.data.keyHighlights).toEqual([]);
      expect(res.data.finalDecisionAdvice).toBe("requires_human_review");
      expect(res.data.contentStatus).toBe("draft");
    });
  });

  describe("Contábil e fiscal", () => {
    it("retorna classificação preliminar sem conta contábil nem dedutibilidade presumida", async () => {
      const res = await classifyTransactionLogic({ description: "Gasolina para entrega motoboy", amountCents: 15000, isExpense: true });
      expect(res.data.category).toBe("Logística e Fretes");
      expect(res.data.classificationStatus).toBe("keyword_candidate");
      expect(res.data.accountCode).toBeNull();
      expect(res.data.taxDeductible).toBeNull();
      expect(res.data.taxDeductibilityStatus).toBe("not_evaluated");
      expect(res.requires_human_approval).toBe(true);
      await expect(classifyTransactionLogic({ description: "X", amountCents: -1 })).rejects.toThrow();
    });

    it("não concilia apenas pelo valor e exige auditoria do vínculo/autenticidade", async () => {
      const res = await reconcileReceiptLogic({ transactionId: "TX-123", amountCents: 5000, receiptTextOrId: "REC-999", expectedAmountCents: 5000 });
      expect(res.data.matched).toBe(false);
      expect(res.data.status).toBe("pendente_auditoria");
      expect(res.data.auditMessage).toContain("não coincide");
      expect(res.requires_human_approval).toBe(true);
      const exact = await reconcileReceiptLogic({ transactionId: "TX-123", amountCents: 5000, receiptTextOrId: "TX-123", expectedAmountCents: 5000 });
      expect(exact.data.matched).toBe(true);
      expect(exact.data.status).toBe("pendente_auditoria");
      expect(exact.requires_human_approval).toBe(true);
    });

    it("calcula diferença e taxa aritmética sem declarar conformidade tributária", async () => {
      const res = await auditFiscalInconsistencyLogic({ invoiceNumber: "NF-00123", totalCents: 10000, orderCents: 12000, taxCents: 800 });
      expect(res.data.hasInconsistencies).toBe(true);
      expect(res.data.issues).toHaveLength(1);
      expect(res.data.effectiveTaxRatePct).toBe(8);
      expect(res.data.complianceStatus).toBe("not_evaluated");
      const zero = await auditFiscalInconsistencyLogic({ invoiceNumber: "NF-2", totalCents: 0, orderCents: 0, taxCents: 0 });
      expect(zero.data.effectiveTaxRatePct).toBeNull();
    });

    it("não fabrica obrigações sem calendário validado para o regime", async () => {
      const res = await getFiscalCalendarAlertsLogic({ referenceMonth: 10, referenceYear: 2026, companyRegime: "simples_nacional" });
      expect(res.data.obligations).toEqual([]);
      expect(res.data.assessmentStatus).toBe("not_evaluated");
      expect(res.requires_human_approval).toBe(true);
    });
  });

  describe("Financeiro", () => {
    it("extrai valor com unidade e não converte data relativa em vencimento", async () => {
      const res = await parseConversationalExpenseLogic({ message: "Paguei 180 reais de gasolina pro motoboy ontem" });
      expect(res.success).toBe(true);
      expect(res.data.amountCents).toBe(18000);
      expect(res.data.category).toBe("logistica_entrega");
      expect(res.data.dueDate).toBeNull();
      expect(res.data.dateStatus).toBe("not_provided");
      expect(res.data.contentStatus).toBe("draft");
    });

    it("não cria lançamento quando valor é ausente ou ambíguo", async () => {
      const missing = await parseConversationalExpenseLogic({ message: "Comprei gasolina ontem" });
      expect(missing.success).toBe(false);
      expect(missing.data.amountCents).toBeNull();
      const ambiguous = await parseConversationalExpenseLogic({ message: "Paguei 180 reais e mais 20 reais" });
      expect(ambiguous.success).toBe(false);
      expect(ambiguous.data.amountCents).toBeNull();
    });

    it("calcula projeção com todos os fluxos explicitamente fornecidos", async () => {
      const res = await calculateCashFlowForecastLogic({ currentBalanceCents: 100000, expectedReceivables7dCents: 50000, expectedPayables7dCents: 20000, expectedReceivables30dCents: 150000, expectedPayables30dCents: 80000 });
      expect(res.data.projectedBalance7dCents).toBe(130000);
      expect(res.data.liquidityRisk).toBe("baixo");
      expect(res.data.calculationBasis).toContain("Não estima fluxos ausentes");
      await expect(calculateCashFlowForecastLogic({ currentBalanceCents: 100000, expectedReceivables7dCents: 50000, expectedPayables7dCents: 20000, expectedReceivables30dCents: 150000 } as never)).rejects.toThrow();
    });

    it("redige cobrança como rascunho sem alegar conformidade CDC", async () => {
      const res = await generateOverdueReminderCopyLogic({ customerName: "Maria Oliveira", amountCents: 12000, daysOverdue: 2, pixCopyPaste: "PIX-TESTE" });
      expect(res.data.tone).toBe("informativo");
      expect(res.data.legalComplianceStatus).toBe("not_evaluated");
      expect(res.data.contentStatus).toBe("draft");
      expect(res.data.whatsappMessage).toContain("Maria Oliveira");
    });

    it("só calcula margens com todos os campos e explicita que não é EBITDA", async () => {
      const res = await generatePeriodFinancialSummaryLogic({ grossRevenueCents: 1000000, cmvCents: 400000, operatingExpensesCents: 300000 });
      expect(res.data.grossProfitCents).toBe(600000);
      expect(res.data.operatingResultCents).toBe(300000);
      expect(res.data.grossMarginPct).toBe(60);
      expect(res.data.operatingMarginPct).toBe(30);
      expect(res.data.calculationBasis).toContain("não equivale a EBITDA");
      await expect(generatePeriodFinancialSummaryLogic({ grossRevenueCents: 1000000, cmvCents: 400000 } as never)).rejects.toThrow();
    });
  });

  describe("Jurídico e governança", () => {
    it("retorna sinais textuais, não classificação jurídica", async () => {
      const res = await reviewContractClauseLogic({ clauseText: "Em caso de rescisão, incidirá multa de 50% sobre o valor total do contrato, sendo irrevogavel e irretratavel.", contractType: "prestacao_servicos" });
      expect(res.data.riskLevel).toBe("not_evaluated");
      expect(res.data.identifiedRisks.length).toBeGreaterThan(0);
      expect(res.data.suggestedRevision).toBeNull();
      expect(res.data.legalAssessmentStatus).toBe("not_evaluated");
      expect(res.requires_human_approval).toBe(true);
    });

    it("gera NDA como rascunho sem inventar foro ou prazo padrão", async () => {
      const res = await generateNdaDocumentLogic({ disclosingPartyName: "Loja Exemplo Ltda", receivingPartyName: "Fornecedor Beta", validityYears: 3, purpose: "Parceria de tecnologia" });
      expect(res.data.title).toContain("RASCUNHO");
      expect(res.data.jurisdictionCity).toBeNull();
      expect(res.data.contentStatus).toBe("draft");
      await expect(generateNdaDocumentLogic({ disclosingPartyName: "A Ltda", receivingPartyName: "B Ltda", purpose: "Parceria" } as never)).rejects.toThrow();
    });

    it("não infere prazo ou urgência pelo remetente", async () => {
      const res = await triageLegalDemandLogic({ demandText: "Citação judicial para contestação em autos de execução", senderType: "judicial" });
      expect(res.data.urgency).toBe("not_evaluated");
      expect(res.data.fatalDeadlineDays).toBeNull();
      expect(res.data.evaluationStatus).toBe("not_evaluated");
      expect(res.data.recommendedAction).toContain("documento original");
      expect(res.requires_human_approval).toBe(true);
    });

    it("não pontua conformidade LGPD com checklist parcial", async () => {
      const res = await runComplianceChecklistLogic({ hasPrivacyPolicy: false, storesCourierGpsData: true, sharesDataWithThirdParties: true });
      expect(res.data.complianceScorePct).toBeNull();
      expect(res.data.lgpdStatus).toBe("not_evaluated");
      expect(res.data.requiredActions.length).toBeGreaterThan(0);
      expect(res.requires_human_approval).toBe(true);
    });
  });
});
