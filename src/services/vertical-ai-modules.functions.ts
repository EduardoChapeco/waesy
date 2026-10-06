import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { assertStoreAccess, getServerIdentity } from "@/lib/server-access";
import { executeUnifiedAiCall } from "./api-orchestrator.functions";

export type VerticalType = "rh" | "contabil" | "financeiro" | "juridico";
export interface VerticalAiResult<T = unknown> {
  vertical: VerticalType;
  capability: string;
  success: boolean;
  requires_human_approval: boolean;
  summary: string;
  data: T;
  source: "ai_model" | "deterministic_engine";
}

const safeInteger = z.number().int().safe();
const nonNegativeCents = safeInteger.min(0);

function validateInput<S extends z.ZodTypeAny>(schema: S, input: unknown): z.infer<S> {
  return schema.parse(input);
}

function makeResult<T>(
  vertical: VerticalType,
  capability: string,
  data: T,
  summary: string,
  requires_human_approval: boolean,
  source: VerticalAiResult<T>["source"] = "deterministic_engine",
  success = true,
): VerticalAiResult<T> {
  return { vertical, capability, success, requires_human_approval, summary, data, source };
}

function normalizedText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

async function executeValidatedAiJson<S extends z.ZodTypeAny>(
  feature: string,
  prompt: string,
  systemPrompt: string,
  outputSchema: S,
  temperature = 0.2,
): Promise<z.infer<S>> {
  const response = await executeUnifiedAiCall({ feature, prompt, systemPrompt, expectJson: true, temperature });
  if (!response?.content) throw new Error(`A chamada de IA para ${feature} não retornou conteúdo; nenhuma saída foi gerada.`);
  const raw = response.parsedJson ?? (typeof response.content === "string" ? JSON.parse(response.content) : response.content);
  return outputSchema.parse(raw);
}

// ── RH ───────────────────────────────────────────────────────────────────────
export const screenResumeSchema = z.object({
  jobTitle: z.string().trim().min(2),
  requiredSkills: z.array(z.string().trim().min(1)).default([]),
  minExperienceYears: z.number().finite().min(0).default(0),
  resumeText: z.string().trim().min(10),
});
const resumeAiOutputSchema = z.object({
  candidateName: z.string().trim().min(1).nullable().optional(),
  skillEvidence: z.array(z.object({ skill: z.string().trim().min(1), evidence: z.string().trim().min(1) })),
});
export interface ScreenResumeResult {
  candidateName?: string;
  fitScorePct: null;
  fitEvaluation: "not_evaluated";
  skillEvidence: Array<{ skill: string; evidence: string }>;
  matchedSkills: string[];
  missingSkills: string[];
  recommendation: "requires_human_review";
}
export async function screenResumeLogic(input: z.input<typeof screenResumeSchema>): Promise<VerticalAiResult<ScreenResumeResult>> {
  const data = validateInput(screenResumeSchema, input);
  const ai = await executeValidatedAiJson(
    "rh_screen_resume",
    `Vaga: ${data.jobTitle}\nCompetências requeridas: ${data.requiredSkills.join(", ")}\nExperiência mínima indicada: ${data.minExperienceYears} anos\n\nCurrículo (única fonte factual):\n${data.resumeText}`,
    "Extraia apenas o nome se estiver explícito e evidências textuais literais para competências obrigatórias. Não pontue adequação, não infira experiência, recomendação ou qualidades. Para cada evidência, copie um trecho contíguo e exato do currículo. Retorne JSON: {\"candidateName\":null,\"skillEvidence\":[{\"skill\":\"competência obrigatória exata\",\"evidence\":\"citação literal\"}]}",
    resumeAiOutputSchema,
  );
  if (ai.candidateName && !normalizedText(data.resumeText).includes(normalizedText(ai.candidateName))) {
    throw new Error("A resposta da IA contém nome ausente do currículo; resultado rejeitado.");
  }
  const requiredByNormalized = new Map(data.requiredSkills.map((skill) => [normalizedText(skill), skill]));
  const evidence = ai.skillEvidence.map((entry) => {
    const requiredSkill = requiredByNormalized.get(normalizedText(entry.skill));
    if (!requiredSkill || !normalizedText(data.resumeText).includes(normalizedText(entry.evidence))) {
      throw new Error("A resposta da IA contém competência não solicitada ou evidência ausente do currículo; resultado rejeitado.");
    }
    return { skill: requiredSkill, evidence: entry.evidence };
  });
  const matchedSkills = [...new Set(evidence.map((entry) => entry.skill))];
  const missingSkills = data.requiredSkills.filter((skill) => !matchedSkills.some((match) => normalizedText(match) === normalizedText(skill)));
  const result: ScreenResumeResult = {
    ...(ai.candidateName ? { candidateName: ai.candidateName } : {}),
    fitScorePct: null,
    fitEvaluation: "not_evaluated",
    skillEvidence: evidence,
    matchedSkills,
    missingSkills,
    recommendation: "requires_human_review",
  };
  return makeResult("rh", "screen_resume", result, `Foram verificadas ${evidence.length} evidências textuais; adequação e recomendação não foram avaliadas por falta de rubrica calibrada.`, true, "ai_model");
}

export const generateJobDescriptionSchema = z.object({
  jobTitle: z.string().trim().min(2),
  department: z.string().trim().min(1).default("Operações"),
  workplaceType: z.enum(["presencial", "hibrido", "remoto"]).default("presencial"),
  seniority: z.enum(["estagio", "junior", "pleno", "senior", "lideranca"]).default("pleno"),
  keyResponsibilities: z.array(z.string().trim().min(1)).default([]),
});
const jobDescriptionAiOutputSchema = z.object({
  title: z.string().trim().min(2),
  summary: z.string().trim().min(1),
  responsibilities: z.array(z.string().trim().min(1)),
  requirements: z.array(z.string().trim().min(1)),
  benefits: z.array(z.string().trim().min(1)).optional(),
});
export interface JobDescriptionResult {
  title: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  contentStatus: "draft";
}
export async function generateJobDescriptionLogic(input: z.input<typeof generateJobDescriptionSchema>): Promise<VerticalAiResult<JobDescriptionResult>> {
  const data = validateInput(generateJobDescriptionSchema, input);
  const generated = await executeValidatedAiJson(
    "rh_job_description",
    `Cargo: ${data.jobTitle} (${data.seniority})\nDepartamento: ${data.department}\nModelo: ${data.workplaceType}\nResponsabilidades informadas: ${data.keyResponsibilities.join("; ")}`,
    "Redija um rascunho de descrição de vaga usando os dados fornecidos. Não invente benefícios, remuneração, políticas, requisitos legais ou condições não informadas. Se benefícios não foram fornecidos (neste caso), retorne lista vazia. Retorne JSON com title, summary, responsibilities, requirements e benefits.",
    jobDescriptionAiOutputSchema,
    0.3,
  );
  return makeResult("rh", "generate_job_description", { ...generated, benefits: [], contentStatus: "draft" }, `Rascunho de descrição para ${data.jobTitle}; revise requisitos e condições antes de publicar.`, true, "ai_model");
}

export const interviewGuideSchema = z.object({
  jobTitle: z.string().trim().min(2),
  focusAreas: z.array(z.string().trim().min(1)).default([]),
});
const interviewGuideAiOutputSchema = z.object({
  jobTitle: z.string().trim().min(2),
  questions: z.array(z.object({ category: z.string().trim().min(1), question: z.string().trim().min(1), expectedIndicators: z.array(z.string().trim().min(1)) })).min(1),
});
export interface InterviewQuestion { category: string; question: string; expectedIndicators: string[] }
export interface InterviewGuideResult { jobTitle: string; questions: InterviewQuestion[]; contentStatus: "draft" }
export async function generateInterviewGuideLogic(input: z.input<typeof interviewGuideSchema>): Promise<VerticalAiResult<InterviewGuideResult>> {
  const data = validateInput(interviewGuideSchema, input);
  const generated = await executeValidatedAiJson(
    "rh_interview_guide",
    `Cargo: ${data.jobTitle}\nÁreas informadas: ${data.focusAreas.join(", ")}`,
    "Crie um rascunho de perguntas de entrevista relacionadas somente ao cargo e às áreas informadas. Os indicadores esperados são pontos de observação, não critérios automáticos de aprovação. Retorne JSON com jobTitle e questions: [{category, question, expectedIndicators}].",
    interviewGuideAiOutputSchema,
  );
  return makeResult("rh", "interview_guide", { ...generated, contentStatus: "draft" }, `Rascunho de roteiro de entrevista para ${data.jobTitle}; não é avaliação de candidatos.`, true, "ai_model");
}

export const candidateSummarySchema = z.object({ candidateName: z.string().trim().min(2), interviewNotes: z.string().trim().min(10) });
export interface CandidateSummaryResult {
  candidateName: string;
  executiveSummary: string;
  keyHighlights: string[];
  pointsToObserve: string[];
  finalDecisionAdvice: "requires_human_review";
  contentStatus: "draft";
}
export async function generateCandidateSummaryLogic(input: z.input<typeof candidateSummarySchema>): Promise<VerticalAiResult<CandidateSummaryResult>> {
  const data = validateInput(candidateSummarySchema, input);
  return makeResult("rh", "candidate_summary", {
    candidateName: data.candidateName,
    executiveSummary: data.interviewNotes,
    keyHighlights: [],
    pointsToObserve: ["A nota fornecida não inclui rubrica validada; revisão humana necessária antes de qualquer decisão."],
    finalDecisionAdvice: "requires_human_review",
    contentStatus: "draft",
  }, `Rascunho fiel às notas fornecidas para ${data.candidateName}; nenhuma pontuação ou decisão foi calculada.`, true);
}

// ── CONTÁBIL E FISCAL ────────────────────────────────────────────────────────
export const classifyTransactionSchema = z.object({ description: z.string().trim().min(2), amountCents: nonNegativeCents, isExpense: z.boolean().optional() });
export interface ClassifyTransactionResult {
  category: string;
  classificationStatus: "keyword_candidate" | "not_classified";
  accountCode: null;
  taxDeductible: null;
  taxDeductibilityStatus: "not_evaluated";
  costCenter: string | null;
  accountingNote: string;
}
export async function classifyTransactionLogic(input: z.input<typeof classifyTransactionSchema>): Promise<VerticalAiResult<ClassifyTransactionResult>> {
  const data = validateInput(classifyTransactionSchema, input);
  const desc = normalizedText(data.description);
  let category = "não classificado";
  let costCenter: string | null = null;
  let classificationStatus: ClassifyTransactionResult["classificationStatus"] = "not_classified";
  if (["gasolina", "combustivel", "motoboy", "entrega"].some((term) => desc.includes(term))) {
    category = "Logística e Fretes"; costCenter = "Operação de Entrega"; classificationStatus = "keyword_candidate";
  } else if (["aluguel", "imovel", "condominio"].some((term) => desc.includes(term))) {
    category = "Ocupação e Instalações"; costCenter = "Geral"; classificationStatus = "keyword_candidate";
  } else if (["software", "servidor", "nuvem", "api"].some((term) => desc.includes(term))) {
    category = "Tecnologia e Licenças"; costCenter = "TI / Produto"; classificationStatus = "keyword_candidate";
  } else if (["fornecedor", "mercadoria", "estoque"].some((term) => desc.includes(term))) {
    category = "Custos de Mercadorias Vendidas (CMV)"; costCenter = "Estoque"; classificationStatus = "keyword_candidate";
  }
  return makeResult("contabil", "classify_transaction", {
    category, classificationStatus, accountCode: null, taxDeductible: null, taxDeductibilityStatus: "not_evaluated", costCenter,
    accountingNote: "Categoria/centro de custo são candidatos por correspondência de palavras; plano de contas, natureza da operação e dedutibilidade não foram verificados.",
  }, `Classificação preliminar (${classificationStatus}); valide com a contabilidade antes de lançar.`, true);
}

export const reconcileReceiptSchema = z.object({
  transactionId: z.string().trim().min(1), amountCents: nonNegativeCents, receiptTextOrId: z.string().trim().min(1), expectedAmountCents: nonNegativeCents,
});
export interface ReconcileReceiptResult { matched: boolean; discrepancyCents: number; status: "conciliado" | "divergencia_valor" | "pendente_auditoria"; auditMessage: string }
export async function reconcileReceiptLogic(input: z.input<typeof reconcileReceiptSchema>): Promise<VerticalAiResult<ReconcileReceiptResult>> {
  const data = validateInput(reconcileReceiptSchema, input);
  const discrepancy = data.amountCents - data.expectedAmountCents;
  const idsCoincide = data.transactionId === data.receiptTextOrId;
  const valueCoincides = discrepancy === 0;
  const matched = idsCoincide && valueCoincides;
  const status = !valueCoincides ? "divergencia_valor" : "pendente_auditoria";
  return makeResult("contabil", "reconcile_receipt", {
    matched, discrepancyCents: discrepancy, status,
    auditMessage: `ID textual ${idsCoincide ? "coincide" : "não coincide"}; valor ${valueCoincides ? "coincide" : "diverge"} em ${discrepancy} centavos. Autenticidade e vínculo do comprovante não foram verificados.`,
  }, matched ? "ID e valor coincidem nos campos fornecidos; conciliação/autenticidade ainda requer auditoria." : `Comparação aritmética concluída; diferença de ${discrepancy} centavos ou identificador pendente de confirmação.`, true);
}

export const auditFiscalInconsistencySchema = z.object({ invoiceNumber: z.string().trim().min(1), totalCents: nonNegativeCents, orderCents: nonNegativeCents, taxCents: nonNegativeCents });
export interface AuditFiscalInconsistencyResult {
  hasInconsistencies: boolean;
  issues: string[];
  effectiveTaxRatePct: number | null;
  complianceStatus: "not_evaluated";
}
export async function auditFiscalInconsistencyLogic(input: z.input<typeof auditFiscalInconsistencySchema>): Promise<VerticalAiResult<AuditFiscalInconsistencyResult>> {
  const data = validateInput(auditFiscalInconsistencySchema, input);
  const issues: string[] = [];
  if (data.totalCents !== data.orderCents) issues.push(`Total informado (${data.totalCents} centavos) difere do pedido (${data.orderCents} centavos).`);
  const taxRate = data.totalCents > 0 ? (data.taxCents / data.totalCents) * 100 : null;
  return makeResult("contabil", "audit_fiscal_inconsistency", {
    hasInconsistencies: issues.length > 0, issues, effectiveTaxRatePct: taxRate === null ? null : Number(taxRate.toFixed(2)), complianceStatus: "not_evaluated",
  }, `Comparação aritmética da nota ${data.invoiceNumber} concluída; adequação tributária não avaliada sem regime, documentos e regra aplicável.`, true);
}

export const fiscalCalendarAlertsSchema = z.object({ referenceMonth: z.number().int().min(1).max(12), referenceYear: z.number().int().min(2000).max(2200), companyRegime: z.enum(["mei", "simples_nacional", "lucro_presumido"]) });
export interface FiscalObligation { obligationName: string; dueDate: string; description: string; priority: "urgente" | "regular" }
export interface FiscalCalendarResult { regime: string; obligations: FiscalObligation[]; assessmentStatus: "not_evaluated" }
export async function getFiscalCalendarAlertsLogic(input: z.input<typeof fiscalCalendarAlertsSchema>): Promise<VerticalAiResult<FiscalCalendarResult>> {
  const data = validateInput(fiscalCalendarAlertsSchema, input);
  return makeResult("contabil", "fiscal_calendar_alerts", { regime: data.companyRegime, obligations: [], assessmentStatus: "not_evaluated" }, `Calendário de ${data.referenceMonth}/${data.referenceYear} não avaliado: não há fonte/regra validada de obrigações por regime nesta função.`, true, "deterministic_engine", false);
}

// ── FINANCEIRO ───────────────────────────────────────────────────────────────
export const conversationalExpenseSchema = z.object({ message: z.string().trim().min(3) });
export interface ConversationalExpenseResult {
  description: string; amountCents: number | null; category: string; supplierOrBeneficiary?: string; dueDate: null;
  dateStatus: "not_provided"; parseStatus: "extracted" | "not_evaluated"; contentStatus: "draft";
}
const noExpenseAmount: ConversationalExpenseResult = { description: "", amountCents: null, category: "unknown", dueDate: null, dateStatus: "not_provided", parseStatus: "not_evaluated", contentStatus: "draft" };
function parseMoneyToken(token: string): number | null {
  const normalized = token.includes(",") ? token.replace(/\./g, "").replace(",", ".") : token;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0 || amount > Number.MAX_SAFE_INTEGER / 100) return null;
  return Math.round(amount * 100);
}
export async function parseConversationalExpenseLogic(input: z.input<typeof conversationalExpenseSchema>): Promise<VerticalAiResult<ConversationalExpenseResult>> {
  const data = validateInput(conversationalExpenseSchema, input);
  const moneyPattern = /(?:r\$\s*(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[,.]\d{1,2})?)|\b(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?|\d+(?:[,.]\d{1,2})?)\s*(?:reais?|contos?)\b)/gi;
  const tokens = [...data.message.matchAll(moneyPattern)].map((match) => match[1] ?? match[2]).filter(Boolean);
  if (tokens.length !== 1) {
    const result = { ...noExpenseAmount, description: data.message };
    return makeResult("financeiro", "conversational_expense_entry", result, tokens.length === 0 ? "Valor não identificado com segurança; lançamento não criado." : "Mais de um valor foi identificado; lançamento requer esclarecimento.", true, "deterministic_engine", false);
  }
  const amountCents = parseMoneyToken(tokens[0]);
  if (amountCents === null) return makeResult("financeiro", "conversational_expense_entry", { ...noExpenseAmount, description: data.message }, "Valor fora do formato/limite aceito; lançamento não criado.", true, "deterministic_engine", false);
  const msg = normalizedText(data.message);
  const category = msg.includes("motoboy") || msg.includes("gasolina") || msg.includes("entrega") ? "logistica_entrega"
    : ["comida", "almoco", "refeicao", "restaurante"].some((term) => msg.includes(term)) ? "alimentacao"
    : ["aluguel", "energia", "luz", "agua"].some((term) => msg.includes(term)) ? "utilidades_prediais" : "unknown";
  const result: ConversationalExpenseResult = { description: data.message, amountCents, category, dueDate: null, dateStatus: "not_provided", parseStatus: "extracted", contentStatus: "draft" };
  return makeResult("financeiro", "conversational_expense_entry", result, `Valor explicitamente informado: ${(amountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. Data de vencimento não informada; confirme categoria e dados antes de registrar.`, true);
}

export const cashFlowForecastSchema = z.object({
  currentBalanceCents: safeInteger,
  expectedReceivables7dCents: nonNegativeCents,
  expectedPayables7dCents: nonNegativeCents,
  expectedReceivables30dCents: nonNegativeCents,
  expectedPayables30dCents: nonNegativeCents,
});
export interface CashFlowForecastResult {
  projectedBalance7dCents: number; projectedBalance30dCents: number; liquidityRisk: "baixo" | "moderado" | "critico"; recommendation: string;
  calculationBasis: string;
}
export async function calculateCashFlowForecastLogic(input: z.input<typeof cashFlowForecastSchema>): Promise<VerticalAiResult<CashFlowForecastResult>> {
  const data = validateInput(cashFlowForecastSchema, input);
  const bal7d = data.currentBalanceCents + data.expectedReceivables7dCents - data.expectedPayables7dCents;
  const bal30d = data.currentBalanceCents + data.expectedReceivables30dCents - data.expectedPayables30dCents;
  if (!Number.isSafeInteger(bal7d) || !Number.isSafeInteger(bal30d)) throw new Error("Projeção fora do intervalo inteiro seguro.");
  const liquidityRisk = bal7d < 0 ? "critico" : bal30d < 0 ? "moderado" : "baixo";
  const recommendation = liquidityRisk === "critico" ? "Saldo calculado em 7 dias negativo; revise premissas e alternativas de caixa."
    : liquidityRisk === "moderado" ? "Saldo calculado em 30 dias negativo; revise premissas e compromissos futuros."
    : "Saldos calculados não negativos nos horizontes informados; isso não garante liquidez futura.";
  return makeResult("financeiro", "cash_flow_forecast", {
    projectedBalance7dCents: bal7d, projectedBalance30dCents: bal30d, liquidityRisk, recommendation,
    calculationBasis: "Saldo inicial + recebíveis informados - pagamentos informados em cada horizonte. Não estima fluxos ausentes nem garante disponibilidade/realização dos valores.",
  }, `Cálculo aritmético concluído a partir dos valores fornecidos; risco é apenas o rótulo derivado de saldo negativo.`, true);
}

export const overdueReminderCopySchema = z.object({ customerName: z.string().trim().min(2), amountCents: nonNegativeCents, daysOverdue: z.number().int().safe().min(0), pixCopyPaste: z.string().trim().min(1).optional() });
export interface OverdueReminderCopyResult { whatsappMessage: string; tone: "informativo"; legalComplianceStatus: "not_evaluated"; contentStatus: "draft" }
export async function generateOverdueReminderCopyLogic(input: z.input<typeof overdueReminderCopySchema>): Promise<VerticalAiResult<OverdueReminderCopyResult>> {
  const data = validateInput(overdueReminderCopySchema, input);
  const formattedVal = (data.amountCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  let msg = `Olá ${data.customerName}, este é um lembrete sobre o valor informado de ${formattedVal}, com ${data.daysOverdue} dia(s) de atraso. Caso já tenha pago, desconsidere. Em caso de dúvida, entre em contato para conferirmos os dados.`;
  if (data.pixCopyPaste) msg += `\n\nPix informado para conferência:\n${data.pixCopyPaste}`;
  return makeResult("financeiro", "overdue_reminder_copy", { whatsappMessage: msg, tone: "informativo", legalComplianceStatus: "not_evaluated", contentStatus: "draft" }, "Rascunho de mensagem gerado; adequação jurídica e dados de cobrança não avaliados.", true);
}

export const periodFinancialSummarySchema = z.object({ grossRevenueCents: nonNegativeCents, cmvCents: nonNegativeCents, operatingExpensesCents: nonNegativeCents });
export interface PeriodFinancialSummaryResult { grossProfitCents: number; operatingResultCents: number; grossMarginPct: number | null; operatingMarginPct: number | null; calculationBasis: string }
export async function generatePeriodFinancialSummaryLogic(input: z.input<typeof periodFinancialSummarySchema>): Promise<VerticalAiResult<PeriodFinancialSummaryResult>> {
  const data = validateInput(periodFinancialSummarySchema, input);
  const grossProfit = data.grossRevenueCents - data.cmvCents;
  const operatingResult = grossProfit - data.operatingExpensesCents;
  const grossMargin = data.grossRevenueCents > 0 ? Number(((grossProfit / data.grossRevenueCents) * 100).toFixed(2)) : null;
  const operatingMargin = data.grossRevenueCents > 0 ? Number(((operatingResult / data.grossRevenueCents) * 100).toFixed(2)) : null;
  return makeResult("financeiro", "period_financial_summary", {
    grossProfitCents: grossProfit, operatingResultCents: operatingResult, grossMarginPct: grossMargin, operatingMarginPct: operatingMargin,
    calculationBasis: "Lucro bruto = receita bruta informada - CMV informado. Resultado operacional simplificado = lucro bruto - despesas operacionais informadas; não equivale a EBITDA/DRE completa. Campos devem ser fornecidos, sem omissão tratada como zero.",
  }, `Cálculo aritmético dos valores fornecidos concluído; consulte a base de cálculo antes de usar como DRE.`, true);
}

// ── JURÍDICO E GOVERNANÇA ────────────────────────────────────────────────────
export const reviewContractClauseSchema = z.object({ clauseText: z.string().trim().min(10), contractType: z.string().trim().min(1).optional() });
export interface ReviewContractClauseResult { riskLevel: "not_evaluated"; identifiedRisks: string[]; suggestedRevision: null; legalAssessmentStatus: "not_evaluated"; humanSignOffRequired: true }
export async function reviewContractClauseLogic(input: z.input<typeof reviewContractClauseSchema>): Promise<VerticalAiResult<ReviewContractClauseResult>> {
  const data = validateInput(reviewContractClauseSchema, input);
  const text = normalizedText(data.clauseText);
  const terms = ["renovacao automatica", "multa de 50%", "perda total", "irrevogavel e irretratavel", "foro da comarca de"];
  const indicators = terms.filter((term) => text.includes(term)).map((term) => `Expressão localizada no texto: "${term}" (sinal textual, não conclusão jurídica).`);
  return makeResult("juridico", "review_contract_clause", {
    riskLevel: "not_evaluated", identifiedRisks: indicators, suggestedRevision: null, legalAssessmentStatus: "not_evaluated", humanSignOffRequired: true,
  }, `Sinais textuais extraídos (${indicators.length}); mérito, validade e risco jurídico não avaliados.`, true);
}

export const generateNdaSchema = z.object({
  disclosingPartyName: z.string().trim().min(2), receivingPartyName: z.string().trim().min(2), validityYears: z.number().finite().positive().max(100), purpose: z.string().trim().min(1),
});
export interface GenerateNdaResult { title: string; parties: string; clausesSummary: string[]; jurisdictionCity: null; contentStatus: "draft" }
export async function generateNdaDocumentLogic(input: z.input<typeof generateNdaSchema>): Promise<VerticalAiResult<GenerateNdaResult>> {
  const data = validateInput(generateNdaSchema, input);
  return makeResult("juridico", "generate_nda", {
    title: "ACORDO DE CONFIDENCIALIDADE E NÃO-DIVULGAÇÃO — RASCUNHO",
    parties: `${data.disclosingPartyName} (parte divulgadora) e ${data.receivingPartyName} (parte receptora)`,
    clausesSummary: [`Finalidade informada: ${data.purpose}`, `Prazo solicitado: ${data.validityYears} anos (validade jurídica não avaliada)`, "Sugestão de tratar devolução ou eliminação de informações conforme orientação jurídica."],
    jurisdictionCity: null, contentStatus: "draft",
  }, "Rascunho de NDA; foro não informado e nenhuma cláusula foi validada juridicamente. Revisão profissional necessária.", true);
}

export const legalDemandTriageSchema = z.object({ demandText: z.string().trim().min(10), senderType: z.enum(["procon", "notificacao_cartorio", "judicial", "cliente_direto"]).optional() });
export interface LegalDemandTriageResult { urgency: "not_evaluated"; fatalDeadlineDays: null; partiesIdentified: string[]; recommendedAction: string; evaluationStatus: "not_evaluated"; providedSenderType: string | null }
export async function triageLegalDemandLogic(input: z.input<typeof legalDemandTriageSchema>): Promise<VerticalAiResult<LegalDemandTriageResult>> {
  const data = validateInput(legalDemandTriageSchema, input);
  return makeResult("juridico", "legal_demand_triage", {
    urgency: "not_evaluated", fatalDeadlineDays: null, partiesIdentified: [],
    recommendedAction: "Encaminhe o documento original à assessoria jurídica para identificar destinatários, prazo expresso e providências cabíveis. Não use este resultado para calcular prazo.",
    evaluationStatus: "not_evaluated", providedSenderType: data.senderType ?? null,
  }, "Urgência e prazo não avaliados: o tipo do remetente não determina prazo e o documento exige leitura jurídica.", true);
}

export const complianceChecklistSchema = z.object({ hasPrivacyPolicy: z.boolean(), storesCourierGpsData: z.boolean(), sharesDataWithThirdParties: z.boolean() });
export interface ComplianceChecklistResult { complianceScorePct: null; requiredActions: string[]; lgpdStatus: "not_evaluated"; assessmentStatus: "not_evaluated" }
export async function runComplianceChecklistLogic(input: z.input<typeof complianceChecklistSchema>): Promise<VerticalAiResult<ComplianceChecklistResult>> {
  const data = validateInput(complianceChecklistSchema, input);
  const actions: string[] = [];
  if (!data.hasPrivacyPolicy) actions.push("Verificar com o responsável por privacidade se existe aviso/política aplicável, atual e acessível.");
  if (data.storesCourierGpsData) actions.push("Revisar finalidade, base legal, transparência, acesso, retenção e descarte dos dados de GPS com assessoria especializada.");
  if (data.sharesDataWithThirdParties) actions.push("Mapear terceiros, dados compartilhados, papéis e instrumentos aplicáveis para revisão especializada.");
  if (actions.length === 0) actions.push("Os três itens informados não permitem concluir conformidade; realizar avaliação completa e documentada.");
  return makeResult("juridico", "compliance_checklist", { complianceScorePct: null, requiredActions: actions, lgpdStatus: "not_evaluated", assessmentStatus: "not_evaluated" }, "Checklist parcial; não calcula nota nem declara conformidade LGPD a partir dos campos disponíveis.", true);
}

// ============================================================================
// SERVER FUNCTIONS EXPORT (BFF LAYER)
// ============================================================================

async function requireVerticalWorkspaceAccess() {
  const identity = await getServerIdentity();
  if (!identity.id || !identity.store_id) {
    throw new Error("Autenticação e workspace ativo são necessários para usar os módulos verticais.");
  }
  assertStoreAccess(
    identity,
    ["owner", "store_owner", "proprietario", "admin", "manager", "gerente"],
    identity.store_id,
  );
}

export const screenResumeFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => screenResumeSchema.parse(d))
  .handler(async ({ data }) => { await requireVerticalWorkspaceAccess(); return screenResumeLogic(data); });

export const generateJobDescriptionFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => generateJobDescriptionSchema.parse(d))
  .handler(async ({ data }) => { await requireVerticalWorkspaceAccess(); return generateJobDescriptionLogic(data); });

export const generateInterviewGuideFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => interviewGuideSchema.parse(d))
  .handler(async ({ data }) => { await requireVerticalWorkspaceAccess(); return generateInterviewGuideLogic(data); });

export const generateCandidateSummaryFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => candidateSummarySchema.parse(d))
  .handler(async ({ data }) => { await requireVerticalWorkspaceAccess(); return generateCandidateSummaryLogic(data); });

export const classifyTransactionFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => classifyTransactionSchema.parse(d))
  .handler(async ({ data }) => { await requireVerticalWorkspaceAccess(); return classifyTransactionLogic(data); });

export const reconcileReceiptFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => reconcileReceiptSchema.parse(d))
  .handler(async ({ data }) => { await requireVerticalWorkspaceAccess(); return reconcileReceiptLogic(data); });

export const auditFiscalInconsistencyFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => auditFiscalInconsistencySchema.parse(d))
  .handler(async ({ data }) => { await requireVerticalWorkspaceAccess(); return auditFiscalInconsistencyLogic(data); });

export const getFiscalCalendarAlertsFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => fiscalCalendarAlertsSchema.parse(d))
  .handler(async ({ data }) => { await requireVerticalWorkspaceAccess(); return getFiscalCalendarAlertsLogic(data); });

export const parseConversationalExpenseFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => conversationalExpenseSchema.parse(d))
  .handler(async ({ data }) => { await requireVerticalWorkspaceAccess(); return parseConversationalExpenseLogic(data); });

export const calculateCashFlowForecastFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => cashFlowForecastSchema.parse(d))
  .handler(async ({ data }) => { await requireVerticalWorkspaceAccess(); return calculateCashFlowForecastLogic(data); });

export const generateOverdueReminderCopyFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => overdueReminderCopySchema.parse(d))
  .handler(async ({ data }) => { await requireVerticalWorkspaceAccess(); return generateOverdueReminderCopyLogic(data); });

export const generatePeriodFinancialSummaryFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => periodFinancialSummarySchema.parse(d))
  .handler(async ({ data }) => { await requireVerticalWorkspaceAccess(); return generatePeriodFinancialSummaryLogic(data); });

export const reviewContractClauseFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => reviewContractClauseSchema.parse(d))
  .handler(async ({ data }) => { await requireVerticalWorkspaceAccess(); return reviewContractClauseLogic(data); });

export const generateNdaDocumentFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => generateNdaSchema.parse(d))
  .handler(async ({ data }) => { await requireVerticalWorkspaceAccess(); return generateNdaDocumentLogic(data); });

export const triageLegalDemandFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => legalDemandTriageSchema.parse(d))
  .handler(async ({ data }) => { await requireVerticalWorkspaceAccess(); return triageLegalDemandLogic(data); });

export const runComplianceChecklistFn = createServerFn({ method: "POST" })
  .validator((d: unknown) => complianceChecklistSchema.parse(d))
  .handler(async ({ data }) => { await requireVerticalWorkspaceAccess(); return runComplianceChecklistLogic(data); });
