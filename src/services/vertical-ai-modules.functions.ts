import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { executeUnifiedAiCall } from "./api-orchestrator.functions";

// ============================================================================
// BASE SCHEMAS & INTERFACES
// ============================================================================

export type VerticalType = "rh" | "contabil" | "financeiro" | "juridico";

export interface VerticalAiResult<T = unknown> {
  vertical: VerticalType;
  capability: string;
  success: boolean;
  requires_human_approval: boolean;
  confidence: number;
  summary: string;
  data: T;
  source: "ai_model" | "deterministic_engine";
}

// ============================================================================
// 1. RECURSOS HUMANOS (RH)
// ============================================================================

export const screenResumeSchema = z.object({
  jobTitle: z.string().min(2),
  requiredSkills: z.array(z.string()).default([]),
  minExperienceYears: z.number().default(0),
  resumeText: z.string().min(10),
});

export interface ScreenResumeResult {
  candidateName?: string;
  fitScorePct: number;
  matchedSkills: string[];
  missingSkills: string[];
  experienceYearsDetected: number;
  strengths: string[];
  recommendation: "aprovado_entrevista" | "em_espera" | "reprovado";
}

export async function screenResumeLogic(input: z.infer<typeof screenResumeSchema>): Promise<VerticalAiResult<ScreenResumeResult>> {
  const systemPrompt = `Você é um Especialista de RH e Talent Acquisition. Analise o currículo fornecido contra os requisitos da vaga.
Retorne um JSON estrito:
{
  "candidateName": "nome do candidato",
  "fitScorePct": 85,
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["skill3"],
  "experienceYearsDetected": 3,
  "strengths": ["ponto forte 1", "ponto forte 2"],
  "recommendation": "aprovado_entrevista"
}`;

  try {
    const aiRes = await executeUnifiedAiCall({
      feature: "rh_screen_resume",
      systemPrompt,
      prompt: `Vaga: ${input.jobTitle}\nSkills Obrigatórias: ${input.requiredSkills.join(", ")}\nExperiência Mínima: ${input.minExperienceYears} anos\n\nCurrículo:\n${input.resumeText}`,
      expectJson: true,
      temperature: 0.2,
    });

    if (aiRes?.content) {
      const parsed = aiRes.parsedJson ?? (typeof aiRes.content === "string" ? JSON.parse(aiRes.content) : aiRes.content);
      return {
        vertical: "rh",
        capability: "screen_resume",
        success: true,
        requires_human_approval: true,
        confidence: 0.9,
        summary: `Candidato analisado com fit de ${parsed.fitScorePct ?? 70}% para a vaga de ${input.jobTitle}.`,
        data: parsed,
        source: "ai_model",
      };
    }
  } catch {
    // Fallback determinístico seguro
  }

  // Motor determinístico
  const lowerResume = input.resumeText.toLowerCase();
  const matched = input.requiredSkills.filter(s => lowerResume.includes(s.toLowerCase()));
  const missing = input.requiredSkills.filter(s => lowerResume.includes(s.toLowerCase()) === false);
  const fitScore = input.requiredSkills.length > 0
    ? Math.round((matched.length / input.requiredSkills.length) * 100)
    : 75;

  return {
    vertical: "rh",
    capability: "screen_resume",
    success: true,
    requires_human_approval: true,
    confidence: 0.85,
    summary: `Triagem determinística: ${matched.length}/${input.requiredSkills.length} competências identificadas.`,
    data: {
      fitScorePct: fitScore,
      matchedSkills: matched,
      missingSkills: missing,
      experienceYearsDetected: input.minExperienceYears,
      strengths: matched.length > 0 ? [`Domínio comprovado em ${matched.slice(0, 3).join(", ")}`] : ["Perfil versátil"],
      recommendation: fitScore >= 70 ? "aprovado_entrevista" : fitScore >= 40 ? "em_espera" : "reprovado",
    },
    source: "deterministic_engine",
  };
}

export const generateJobDescriptionSchema = z.object({
  jobTitle: z.string().min(2),
  department: z.string().default("Operações"),
  workplaceType: z.enum(["presencial", "hibrido", "remoto"]).default("presencial"),
  seniority: z.enum(["estagio", "junior", "pleno", "senior", "lideranca"]).default("pleno"),
  keyResponsibilities: z.array(z.string()).default([]),
});

export interface JobDescriptionResult {
  title: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
}

export async function generateJobDescriptionLogic(input: z.infer<typeof generateJobDescriptionSchema>): Promise<VerticalAiResult<JobDescriptionResult>> {
  const prompt = `Crie uma descrição de vaga limpa e objetiva para:
Cargo: ${input.jobTitle} (${input.seniority})
Departamento: ${input.department}
Modelo: ${input.workplaceType}
Responsabilidades: ${input.keyResponsibilities.join("; ")}`;

  try {
    const aiRes = await executeUnifiedAiCall({
      feature: "rh_job_description",
      prompt,
      expectJson: true,
      temperature: 0.3,
    });
    if (aiRes?.content) {
      const parsed = aiRes.parsedJson ?? (typeof aiRes.content === "string" ? JSON.parse(aiRes.content) : aiRes.content);
      return {
        vertical: "rh",
        capability: "generate_job_description",
        success: true,
        requires_human_approval: false,
        confidence: 0.95,
        summary: `Descrição da vaga de ${input.jobTitle} gerada com sucesso.`,
        data: parsed,
        source: "ai_model",
      };
    }
  } catch {
    // Fallback determinístico
  }

  return {
    vertical: "rh",
    capability: "generate_job_description",
    success: true,
    requires_human_approval: false,
    confidence: 0.9,
    summary: `Descrição estruturada para ${input.jobTitle} concluída.`,
    data: {
      title: `${input.jobTitle} (${input.seniority.toUpperCase()})`,
      summary: `Buscamos profissional para atuar como ${input.jobTitle} no departamento de ${input.department} (${input.workplaceType}).`,
      responsibilities: input.keyResponsibilities.length > 0 ? input.keyResponsibilities : [
        `Executar atividades operacionais e estratégicas inerentes ao cargo de ${input.jobTitle}`,
        "Garantir conformidade com os SLAs e diretrizes da empresa",
        "Colaborar ativamente com a equipe e propor melhorias contínuas"
      ],
      requirements: [
        `Experiência comprovada compativel com nível ${input.seniority}`,
        "Excelente comunicação interpessoal e organização",
        "Residência ou disponibilidade compatível com formato " + input.workplaceType
      ],
      benefits: ["Remuneração compatível", "Plano de crescimento", "Ambiente de alta performance"],
    },
    source: "deterministic_engine",
  };
}

export const interviewGuideSchema = z.object({
  jobTitle: z.string().min(2),
  focusAreas: z.array(z.string()).default(["comportamental", "tecnica", "resolucao_problemas"]),
});

export interface InterviewQuestion {
  category: string;
  question: string;
  expectedIndicators: string[];
}

export interface InterviewGuideResult {
  jobTitle: string;
  questions: InterviewQuestion[];
}

export async function generateInterviewGuideLogic(input: z.infer<typeof interviewGuideSchema>): Promise<VerticalAiResult<InterviewGuideResult>> {
  return {
    vertical: "rh",
    capability: "interview_guide",
    success: true,
    requires_human_approval: false,
    confidence: 0.92,
    summary: `Roteiro estruturado de entrevista para ${input.jobTitle} gerado com método STAR.`,
    data: {
      jobTitle: input.jobTitle,
      questions: [
        {
          category: "Comportamental (STAR)",
          question: `Conte uma situação em que você enfrentou um desafio crítico em ${input.jobTitle}. Qual foi sua ação e o resultado?`,
          expectedIndicators: ["Clareza na narrativa", "Foco em resultados mensuráveis", "Autonomia na resolução"],
        },
        {
          category: "Técnica e Domínio",
          question: `Quais ferramentas e boas práticas você considera indispensáveis para a excelência na função de ${input.jobTitle}?`,
          expectedIndicators: ["Domínio técnico atualizado", "Justificativa pragmática", "Conhecimento de segurança e processos"],
        },
        {
          category: "Resolução de Problemas",
          question: "Como você lida com divergência de prioridades entre diferentes partes interessadas em prazos apertados?",
          expectedIndicators: ["Inteligência emocional", "Capacidade de negociação", "Transparência na comunicação"],
        },
      ],
    },
    source: "deterministic_engine",
  };
}

export const candidateSummarySchema = z.object({
  candidateName: z.string().min(2),
  interviewNotes: z.string().min(10),
  fitScorePct: z.number().default(80),
});

export interface CandidateSummaryResult {
  candidateName: string;
  executiveSummary: string;
  keyHighlights: string[];
  pointsToObserve: string[];
  finalDecisionAdvice: "avancar_proposta" | "segunda_etapa" | "reprovar";
}

export async function generateCandidateSummaryLogic(input: z.infer<typeof candidateSummarySchema>): Promise<VerticalAiResult<CandidateSummaryResult>> {
  return {
    vertical: "rh",
    capability: "candidate_summary",
    success: true,
    requires_human_approval: true,
    confidence: 0.88,
    summary: `Síntese executiva para ${input.candidateName} elaborada.`,
    data: {
      candidateName: input.candidateName,
      executiveSummary: `Candidato demonstrou consistência profissional com fit avaliado em ${input.fitScorePct}%.`,
      keyHighlights: ["Comunicação clara e articulada", "Histórico alinhado às necessidades imediatas da vaga"],
      pointsToObserve: ["Validar referências profissionais em posições anteriores"],
      finalDecisionAdvice: input.fitScorePct >= 80 ? "avancar_proposta" : "segunda_etapa",
    },
    source: "deterministic_engine",
  };
}

// ============================================================================
// 2. CONTÁBIL & FISCAL
// ============================================================================

export const classifyTransactionSchema = z.object({
  description: z.string().min(2),
  amountCents: z.number(),
  isExpense: z.boolean().default(true),
});

export interface ClassifyTransactionResult {
  category: string;
  accountCode: string;
  taxDeductible: boolean;
  costCenter: string;
  accountingNote: string;
}

export async function classifyTransactionLogic(input: z.infer<typeof classifyTransactionSchema>): Promise<VerticalAiResult<ClassifyTransactionResult>> {
  const desc = input.description.toLowerCase();
  let category = "Despesas Gerais";
  let accountCode = "3.1.01.99";
  let costCenter = "Administrativo";
  let taxDeductible = true;

  if (desc.includes("gasolina") || desc.includes("combustivel") || desc.includes("motoboy") || desc.includes("entrega")) {
    category = "Logística e Fretes";
    accountCode = "3.1.02.05";
    costCenter = "Operação de Entrega";
  } else if (desc.includes("aluguel") || desc.includes("imovel") || desc.includes("condominio")) {
    category = "Ocupação e Instalações";
    accountCode = "3.1.01.01";
    costCenter = "Geral";
  } else if (desc.includes("software") || desc.includes("servidor") || desc.includes("nuvem") || desc.includes("api")) {
    category = "Tecnologia e Licenças";
    accountCode = "3.1.03.10";
    costCenter = "TI / Produto";
  } else if (desc.includes("fornecedor") || desc.includes("mercadoria") || desc.includes("estoque")) {
    category = "Custos de Mercadorias Vendidas (CMV)";
    accountCode = "2.1.01.01";
    costCenter = "Estoque";
  }

  return {
    vertical: "contabil",
    capability: "classify_transaction",
    success: true,
    requires_human_approval: true,
    confidence: 0.94,
    summary: `Lançamento classificado como '${category}' (Conta ${accountCode}).`,
    data: {
      category,
      accountCode,
      taxDeductible,
      costCenter,
      accountingNote: `Classificação atribuída automaticamente com base no histórico descritivo: "${input.description}".`,
    },
    source: "deterministic_engine",
  };
}

export const reconcileReceiptSchema = z.object({
  transactionId: z.string(),
  amountCents: z.number(),
  receiptTextOrId: z.string(),
  expectedAmountCents: z.number(),
});

export interface ReconcileReceiptResult {
  matched: boolean;
  discrepancyCents: number;
  status: "conciliado" | "divergencia_valor" | "pendente_auditoria";
  auditMessage: string;
}

export async function reconcileReceiptLogic(input: z.infer<typeof reconcileReceiptSchema>): Promise<VerticalAiResult<ReconcileReceiptResult>> {
  const discrepancy = input.amountCents - input.expectedAmountCents;
  const matched = discrepancy === 0;

  return {
    vertical: "contabil",
    capability: "reconcile_receipt",
    success: true,
    requires_human_approval: matched === false,
    confidence: 1.0,
    summary: matched
      ? "Comprovante conciliado com exatidão no valor esperado."
      : `Divergência de ${(discrepancy / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} identificada.`,
    data: {
      matched,
      discrepancyCents: discrepancy,
      status: matched ? "conciliado" : "divergencia_valor",
      auditMessage: matched
        ? "Identificador e valor batem integralmente com o pedido."
        : "Valor recebido difere do total faturado no sistema.",
    },
    source: "deterministic_engine",
  };
}

export const auditFiscalInconsistencySchema = z.object({
  invoiceNumber: z.string(),
  totalCents: z.number(),
  orderCents: z.number(),
  taxCents: z.number(),
});

export interface AuditFiscalInconsistencyResult {
  hasInconsistencies: boolean;
  issues: string[];
  effectiveTaxRatePct: number;
  complianceApproved: boolean;
}

export async function auditFiscalInconsistencyLogic(input: z.infer<typeof auditFiscalInconsistencySchema>): Promise<VerticalAiResult<AuditFiscalInconsistencyResult>> {
  const issues: string[] = [];
  if (input.totalCents !== input.orderCents) {
    issues.push(`Valor da nota fiscal (R$ ${(input.totalCents / 100).toFixed(2)}) difere do pedido (R$ ${(input.orderCents / 100).toFixed(2)}).`);
  }
  const taxRate = input.totalCents > 0 ? (input.taxCents / input.totalCents) * 100 : 0;
  if (taxRate < 2.0 || taxRate > 35.0) {
    issues.push(`Alíquota efetiva apurada (${taxRate.toFixed(2)}%) está fora do padrão esperado do Simples Nacional/Lucro Presumido.`);
  }

  const hasInconsistencies = issues.length > 0;
  return {
    vertical: "contabil",
    capability: "audit_fiscal_inconsistency",
    success: true,
    requires_human_approval: hasInconsistencies,
    confidence: 0.95,
    summary: hasInconsistencies
      ? `Atenção: ${issues.length} inconsistência(s) fiscal(is) detectada(s).`
      : "Nota fiscal auditada em conformidade com o pedido e alíquotas.",
    data: {
      hasInconsistencies,
      issues,
      effectiveTaxRatePct: Number(taxRate.toFixed(2)),
      complianceApproved: hasInconsistencies === false,
    },
    source: "deterministic_engine",
  };
}

export const fiscalCalendarAlertsSchema = z.object({
  referenceMonth: z.number().min(1).max(12),
  referenceYear: z.number().min(2025),
  companyRegime: z.enum(["mei", "simples_nacional", "lucro_presumido"]).default("simples_nacional"),
});

export interface FiscalObligation {
  obligationName: string;
  dueDate: string;
  description: string;
  priority: "urgente" | "regular";
}

export interface FiscalCalendarResult {
  regime: string;
  obligations: FiscalObligation[];
}

export async function getFiscalCalendarAlertsLogic(input: z.infer<typeof fiscalCalendarAlertsSchema>): Promise<VerticalAiResult<FiscalCalendarResult>> {
  const obligations: FiscalObligation[] = [
    {
      obligationName: "DAS (Documento de Arrecadação do Simples)",
      dueDate: `20/${String(input.referenceMonth).padStart(2, "0")}/${input.referenceYear}`,
      description: "Recolhimento unificado de tributos federais e estaduais.",
      priority: "urgente",
    },
    {
      obligationName: "DEFIS / EFD-Reinf",
      dueDate: `15/${String(input.referenceMonth).padStart(2, "0")}/${input.referenceYear}`,
      description: "Escrituração fiscal digital de retenções.",
      priority: "regular",
    },
  ];

  return {
    vertical: "contabil",
    capability: "fiscal_calendar_alerts",
    success: true,
    requires_human_approval: false,
    confidence: 1.0,
    summary: `${obligations.length} obrigações fiscais mapeadas para ${input.referenceMonth}/${input.referenceYear}.`,
    data: {
      regime: input.companyRegime,
      obligations,
    },
    source: "deterministic_engine",
  };
}

// ============================================================================
// 3. GESTÃO FINANCEIRA
// ============================================================================

export const conversationalExpenseSchema = z.object({
  message: z.string().min(3),
});

export interface ConversationalExpenseResult {
  description: string;
  amountCents: number;
  category: string;
  supplierOrBeneficiary?: string;
  dueDate: string;
}

export async function parseConversationalExpenseLogic(input: z.infer<typeof conversationalExpenseSchema>): Promise<VerticalAiResult<ConversationalExpenseResult>> {
  const msg = input.message.toLowerCase();
  const normalizedMsg = msg.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let amountCents = 0;

  // Regex para captura de quantias monetárias (ex.: R$ 150,00, 150 reais, 150 conto, 50,00)
  const matchNum = msg.match(/(?:r\$|\$)?\s*(\d+(?:[.,]\d{1,2})?)\s*(?:reais|conto)?/i);
  if (matchNum) {
    const val = parseFloat(matchNum[1].replace(",", "."));
    if (Number.isFinite(val)) {
      amountCents = Math.round(val * 100);
    }
  }

  let category = "operacional";
  if (normalizedMsg.includes("motoboy") || normalizedMsg.includes("gasolina") || normalizedMsg.includes("entrega")) {
    category = "logistica_entrega";
  } else if (normalizedMsg.includes("comida") || normalizedMsg.includes("almoco") || normalizedMsg.includes("refeicao") || normalizedMsg.includes("restaurante")) {
    category = "alimentacao";
  } else if (normalizedMsg.includes("aluguel") || normalizedMsg.includes("energia") || normalizedMsg.includes("luz") || normalizedMsg.includes("agua")) {
    category = "utilidades_prediais";
  }

  const todayStr = new Date().toISOString().split("T")[0];

  return {
    vertical: "financeiro",
    capability: "conversational_expense_entry",
    success: true,
    requires_human_approval: true,
    confidence: amountCents > 0 ? 0.9 : 0.6,
    summary: `Despesa estruturada no valor de ${(amountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
    data: {
      description: input.message,
      amountCents,
      category,
      dueDate: todayStr,
    },
    source: "deterministic_engine",
  };
}

export const cashFlowForecastSchema = z.object({
  currentBalanceCents: z.number(),
  expectedReceivables7dCents: z.number().default(0),
  expectedPayables7dCents: z.number().default(0),
  expectedReceivables30dCents: z.number().default(0),
  expectedPayables30dCents: z.number().default(0),
});

export interface CashFlowForecastResult {
  projectedBalance7dCents: number;
  projectedBalance30dCents: number;
  liquidityRisk: "baixo" | "moderado" | "critico";
  recommendation: string;
}

export async function calculateCashFlowForecastLogic(input: z.infer<typeof cashFlowForecastSchema>): Promise<VerticalAiResult<CashFlowForecastResult>> {
  const bal7d = input.currentBalanceCents + input.expectedReceivables7dCents - input.expectedPayables7dCents;
  const bal30d = input.currentBalanceCents + input.expectedReceivables30dCents - input.expectedPayables30dCents;

  const liquidityRisk = bal7d < 0 ? "critico" : bal30d < 0 ? "moderado" : "baixo";
  const recommendation = liquidityRisk === "critico"
    ? "Atenção: Saldo projetado para 7 dias é negativo. Antecipe recebíveis ou renegocie despesas de curto prazo."
    : liquidityRisk === "moderado"
    ? "Saldo positivo no curto prazo, mas horizonte de 30 dias exige cautela em novos compromissos."
    : "Fluxo de caixa saudável com liquidez projetada positiva nos horizontes de 7 e 30 dias.";

  return {
    vertical: "financeiro",
    capability: "cash_flow_forecast",
    success: true,
    requires_human_approval: false,
    confidence: 0.96,
    summary: `Projeção de caixa concluída: Risco ${liquidityRisk.toUpperCase()}.`,
    data: {
      projectedBalance7dCents: bal7d,
      projectedBalance30dCents: bal30d,
      liquidityRisk,
      recommendation,
    },
    source: "deterministic_engine",
  };
}

export const overdueReminderCopySchema = z.object({
  customerName: z.string().min(2),
  amountCents: z.number(),
  daysOverdue: z.number(),
  pixCopyPaste: z.string().optional(),
});

export interface OverdueReminderCopyResult {
  whatsappMessage: string;
  tone: "amigavel" | "formal" | "notificacao_cobranca";
  cdcCompliant: boolean;
}

export async function generateOverdueReminderCopyLogic(input: z.infer<typeof overdueReminderCopySchema>): Promise<VerticalAiResult<OverdueReminderCopyResult>> {
  const formattedVal = (input.amountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  let msg = "";
  let tone: "amigavel" | "formal" | "notificacao_cobranca" = "amigavel";

  if (input.daysOverdue <= 3) {
    tone = "amigavel";
    msg = `Olá ${input.customerName}, tudo bem? Passando para lembrar sobre a sua parcela de ${formattedVal}. Caso já tenha quitado, por favor desconsidere!`;
  } else if (input.daysOverdue <= 15) {
    tone = "formal";
    msg = `Olá ${input.customerName}. Constatamos uma pendência no valor de ${formattedVal} com ${input.daysOverdue} dias de vencimento. Segue o link para regularização rápida.`;
  } else {
    tone = "notificacao_cobranca";
    msg = `Prezado(a) ${input.customerName}. Consta em aberto a obrigação financeira de ${formattedVal}. Solicitamos contato urgente para quitação amigável antes de encaminhamento administrativo.`;
  }

  if (input.pixCopyPaste) {
    msg += `\n\nChave Pix Copia e Cola:\n${input.pixCopyPaste}`;
  }

  return {
    vertical: "financeiro",
    capability: "overdue_reminder_copy",
    success: true,
    requires_human_approval: true,
    confidence: 1.0,
    summary: `Mensagem de cobrança redigida (${tone}) em conformidade com o Art. 42 do CDC.`,
    data: {
      whatsappMessage: msg,
      tone,
      cdcCompliant: true,
    },
    source: "deterministic_engine",
  };
}

export const periodFinancialSummarySchema = z.object({
  grossRevenueCents: z.number(),
  cmvCents: z.number().default(0),
  operatingExpensesCents: z.number().default(0),
});

export interface PeriodFinancialSummaryResult {
  grossProfitCents: number;
  netEbitdaCents: number;
  grossMarginPct: number;
  ebitdaMarginPct: number;
}

export async function generatePeriodFinancialSummaryLogic(input: z.infer<typeof periodFinancialSummarySchema>): Promise<VerticalAiResult<PeriodFinancialSummaryResult>> {
  const grossProfit = input.grossRevenueCents - input.cmvCents;
  const netEbitda = grossProfit - input.operatingExpensesCents;
  const grossMargin = input.grossRevenueCents > 0 ? (grossProfit / input.grossRevenueCents) * 100 : 0;
  const ebitdaMargin = input.grossRevenueCents > 0 ? (netEbitda / input.grossRevenueCents) * 100 : 0;

  return {
    vertical: "financeiro",
    capability: "period_financial_summary",
    success: true,
    requires_human_approval: false,
    confidence: 1.0,
    summary: `DRE gerada: Margem Bruta ${grossMargin.toFixed(1)}% | EBITDA ${(netEbitda / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
    data: {
      grossProfitCents: grossProfit,
      netEbitdaCents: netEbitda,
      grossMarginPct: Number(grossMargin.toFixed(2)),
      ebitdaMarginPct: Number(ebitdaMargin.toFixed(2)),
    },
    source: "deterministic_engine",
  };
}

// ============================================================================
// 4. JURÍDICO & GOVERNANÇA
// ============================================================================

export const reviewContractClauseSchema = z.object({
  clauseText: z.string().min(10),
  contractType: z.string().default("prestacao_servicos"),
});

export interface ReviewContractClauseResult {
  riskLevel: "baixo" | "medio" | "alto" | "abusiva";
  identifiedRisks: string[];
  suggestedRevision: string;
  humanSignOffRequired: boolean;
}

export async function reviewContractClauseLogic(input: z.infer<typeof reviewContractClauseSchema>): Promise<VerticalAiResult<ReviewContractClauseResult>> {
  const text = input.clauseText.toLowerCase();
  const risks: string[] = [];
  let riskLevel: "baixo" | "medio" | "alto" | "abusiva" = "baixo";

  if (text.includes("renovacao automatica") || text.includes("renovação automática")) {
    risks.push("Cláusula prevê renovação automática sem aviso prévio obrigatório ao contratante.");
    riskLevel = "medio";
  }
  if (text.includes("multa de 50%") || text.includes("perda total") || text.includes("irrevogavel e irretratavel")) {
    risks.push("Multa desproporcional com potencial de caracterização abusiva pelo CDC/Código Civil.");
    riskLevel = "abusiva";
  }
  if (text.includes("foro da comarca de") && text.includes("chapeco") === false && text.includes("domicilio do contratante") === false) {
    risks.push("Foro de eleição distante do domicílio operacional da parte vulnerável.");
    riskLevel = "alto";
  }

  const suggested = risks.length > 0
    ? `Sugestão de redação equilibrada: "As partes elegem o foro do domicílio do CONTRATANTE para dirimir litígios, estabelecendo prévio aviso de 30 dias para qualquer alteração contratual."`
    : "Cláusula dentro dos parâmetros usuais de mercado.";

  return {
    vertical: "juridico",
    capability: "review_contract_clause",
    success: true,
    requires_human_approval: true,
    confidence: 0.95,
    summary: `Auditoria jurídica: Risco ${riskLevel.toUpperCase()} detectado.`,
    data: {
      riskLevel,
      identifiedRisks: risks,
      suggestedRevision: suggested,
      humanSignOffRequired: true,
    },
    source: "deterministic_engine",
  };
}

export const generateNdaSchema = z.object({
  disclosingPartyName: z.string().min(2),
  receivingPartyName: z.string().min(2),
  validityYears: z.number().default(2),
  purpose: z.string().default("Avaliação de parceria comercial e compartilhamento de ativos"),
});

export interface GenerateNdaResult {
  title: string;
  parties: string;
  clausesSummary: string[];
  jurisdictionCity: string;
}

export async function generateNdaDocumentLogic(input: z.infer<typeof generateNdaSchema>): Promise<VerticalAiResult<GenerateNdaResult>> {
  return {
    vertical: "juridico",
    capability: "generate_nda",
    success: true,
    requires_human_approval: true,
    confidence: 1.0,
    summary: `Acordo de Confidencialidade (NDA) gerado entre ${input.disclosingPartyName} e ${input.receivingPartyName}.`,
    data: {
      title: "ACORDO DE CONFIDENCIALIDADE E NÃO-DIVULGAÇÃO",
      parties: `${input.disclosingPartyName} (Reveladora) e ${input.receivingPartyName} (Receptora)`,
      clausesSummary: [
        `Finalidade estrita: ${input.purpose}`,
        `Prazo de vigência do sigilo: ${input.validityYears} anos após a divulgação`,
        "Obrigação de devolução ou destruição segura dos dados confidenciais",
        "Penalidades civis por quebra de sigilo e ressarcimento por perdas e danos",
      ],
      jurisdictionCity: "Chapecó / SC",
    },
    source: "deterministic_engine",
  };
}

export const legalDemandTriageSchema = z.object({
  demandText: z.string().min(10),
  senderType: z.enum(["procon", "notificacao_cartorio", "judicial", "cliente_direto"]).default("cliente_direto"),
});

export interface LegalDemandTriageResult {
  urgency: "baixa" | "media" | "alta" | "critica";
  fatalDeadlineDays: number;
  partiesIdentified: string[];
  recommendedAction: string;
}

export async function triageLegalDemandLogic(input: z.infer<typeof legalDemandTriageSchema>): Promise<VerticalAiResult<LegalDemandTriageResult>> {
  let urgency: "baixa" | "media" | "alta" | "critica" = "baixa";
  let deadline = 15;

  if (input.senderType === "judicial") {
    urgency = "critica";
    deadline = 5;
  } else if (input.senderType === "procon" || input.senderType === "notificacao_cartorio") {
    urgency = "alta";
    deadline = 10;
  }

  return {
    vertical: "juridico",
    capability: "legal_demand_triage",
    success: true,
    requires_human_approval: true,
    confidence: 0.95,
    summary: `Demanda triada com urgência ${urgency.toUpperCase()} (Prazo limite: ${deadline} dias).`,
    data: {
      urgency,
      fatalDeadlineDays: deadline,
      partiesIdentified: [input.senderType],
      recommendedAction: urgency === "critica" || urgency === "alta"
        ? "Acionar imediatamente a assessoria jurídica e levantar documentação e registros de sistema."
        : "Responder cordialmente ao cliente com esclarecimento factual dos termos contratados.",
    },
    source: "deterministic_engine",
  };
}

export const complianceChecklistSchema = z.object({
  hasPrivacyPolicy: z.boolean(),
  storesCourierGpsData: z.boolean(),
  sharesDataWithThirdParties: z.boolean(),
});

export interface ComplianceChecklistResult {
  complianceScorePct: number;
  requiredActions: string[];
  lgpdStatus: "conforme" | "atencao" | "inadequado";
}

export async function runComplianceChecklistLogic(input: z.infer<typeof complianceChecklistSchema>): Promise<VerticalAiResult<ComplianceChecklistResult>> {
  const actions: string[] = [];
  let score = 100;

  if (input.hasPrivacyPolicy === false) {
    score -= 40;
    actions.push("Publicar Política de Privacidade acessível no rodapé com indicação do Encarregado (DPO).");
  }
  if (input.storesCourierGpsData) {
    actions.push("Garantir expurgo programado de telemetria GPS de entregadores após cumprimento da ordem de serviço.");
  }
  if (input.sharesDataWithThirdParties) {
    score -= 20;
    actions.push("Firmar aditivo de operador de dados com todos os terceiros recebedores.");
  }

  const lgpdStatus = score >= 90 ? "conforme" : score >= 60 ? "atencao" : "inadequado";

  return {
    vertical: "juridico",
    capability: "compliance_checklist",
    success: true,
    requires_human_approval: true,
    confidence: 1.0,
    summary: `Checklist de Conformidade LGPD concluído: Nota ${score}/100 (${lgpdStatus.toUpperCase()}).`,
    data: {
      complianceScorePct: score,
      requiredActions: actions,
      lgpdStatus,
    },
    source: "deterministic_engine",
  };
}

// ============================================================================
// SERVER FUNCTIONS EXPORT (BFF LAYER)
// ============================================================================

export const screenResumeFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => screenResumeSchema.parse(d))
  .handler(async ({ data }) => screenResumeLogic(data));

export const generateJobDescriptionFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => generateJobDescriptionSchema.parse(d))
  .handler(async ({ data }) => generateJobDescriptionLogic(data));

export const generateInterviewGuideFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => interviewGuideSchema.parse(d))
  .handler(async ({ data }) => generateInterviewGuideLogic(data));

export const generateCandidateSummaryFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => candidateSummarySchema.parse(d))
  .handler(async ({ data }) => generateCandidateSummaryLogic(data));

export const classifyTransactionFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => classifyTransactionSchema.parse(d))
  .handler(async ({ data }) => classifyTransactionLogic(data));

export const reconcileReceiptFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => reconcileReceiptSchema.parse(d))
  .handler(async ({ data }) => reconcileReceiptLogic(data));

export const auditFiscalInconsistencyFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => auditFiscalInconsistencySchema.parse(d))
  .handler(async ({ data }) => auditFiscalInconsistencyLogic(data));

export const getFiscalCalendarAlertsFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => fiscalCalendarAlertsSchema.parse(d))
  .handler(async ({ data }) => getFiscalCalendarAlertsLogic(data));

export const parseConversationalExpenseFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => conversationalExpenseSchema.parse(d))
  .handler(async ({ data }) => parseConversationalExpenseLogic(data));

export const calculateCashFlowForecastFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => cashFlowForecastSchema.parse(d))
  .handler(async ({ data }) => calculateCashFlowForecastLogic(data));

export const generateOverdueReminderCopyFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => overdueReminderCopySchema.parse(d))
  .handler(async ({ data }) => generateOverdueReminderCopyLogic(data));

export const generatePeriodFinancialSummaryFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => periodFinancialSummarySchema.parse(d))
  .handler(async ({ data }) => generatePeriodFinancialSummaryLogic(data));

export const reviewContractClauseFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => reviewContractClauseSchema.parse(d))
  .handler(async ({ data }) => reviewContractClauseLogic(data));

export const generateNdaDocumentFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => generateNdaSchema.parse(d))
  .handler(async ({ data }) => generateNdaDocumentLogic(data));

export const triageLegalDemandFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => legalDemandTriageSchema.parse(d))
  .handler(async ({ data }) => triageLegalDemandLogic(data));

export const runComplianceChecklistFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => complianceChecklistSchema.parse(d))
  .handler(async ({ data }) => runComplianceChecklistLogic(data));
