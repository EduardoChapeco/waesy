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

export interface RubricScores {
  faithfulness_to_ground_truth: number; // 0 to 5
  actionability_and_structure: number; // 0 to 5
  brand_tone_and_silence: number; // 0 to 5
  compliance_and_safety: number; // 0 to 5
  completeness_and_depth: number; // 0 to 5
  latency_and_efficiency: number; // 0 to 5
}

export interface BenchmarkEvaluationResult {
  id: string;
  category: string;
  capability: string;
  passed: boolean;
  scores: RubricScores;
  averageScore: number;
  latencyMs: number;
  notes: string[];
}

export interface FullEvaluationReport {
  timestamp: string;
  totalBenchmarks: number;
  passedCount: number;
  failedCount: number;
  overallScore: number;
  rubricAverages: RubricScores;
  hasRegression: boolean;
  regressionDetails: string[];
  results: BenchmarkEvaluationResult[];
}

// Mapa de despacho para execução das capacidades
async function dispatchCapability(capability: string, input: any): Promise<any> {
  switch (capability) {
    case "screen_resume":
      return screenResumeLogic(input);
    case "generate_job_description":
      return generateJobDescriptionLogic(input);
    case "interview_guide":
      return generateInterviewGuideLogic(input);
    case "candidate_summary":
      return generateCandidateSummaryLogic(input);
    case "classify_transaction":
      return classifyTransactionLogic(input);
    case "reconcile_receipt":
      return reconcileReceiptLogic(input);
    case "audit_fiscal_inconsistency":
      return auditFiscalInconsistencyLogic(input);
    case "fiscal_calendar_alerts":
      return getFiscalCalendarAlertsLogic(input);
    case "conversational_expense_entry":
      return parseConversationalExpenseLogic(input);
    case "cash_flow_forecast":
      return calculateCashFlowForecastLogic(input);
    case "overdue_reminder_copy":
      return generateOverdueReminderCopyLogic(input);
    case "period_financial_summary":
      return generatePeriodFinancialSummaryLogic(input);
    case "review_contract_clause":
      return reviewContractClauseLogic(input);
    case "generate_nda":
      return generateNdaDocumentLogic(input);
    case "legal_demand_triage":
      return triageLegalDemandLogic(input);
    case "compliance_checklist":
      return runComplianceChecklistLogic(input);
    default:
      throw new Error(`Capacidade não mapeada no avaliador: ${capability}`);
  }
}

// Avaliador de rubricas determinístico
function scoreResult(benchmark: any, output: any): { passed: boolean; scores: RubricScores; notes: string[] } {
  const expected = benchmark.expectedOutputs;
  const notes: string[] = [];
  let passed = true;

  let faithfulness = 5.0;
  let actionability = 5.0;
  let brandTone = 5.0;
  let compliance = 5.0;
  let completeness = 5.0;
  let latency = 5.0;

  if (expected.expectedSuccess !== undefined && output.success !== expected.expectedSuccess) {
    passed = false;
    compliance -= 1.0;
    notes.push(`Estado de execução (${output.success}) diverge do esperado (${expected.expectedSuccess})`);
  }

  if (output.success === false && expected.expectedSuccess !== false) {
    passed = false;
    faithfulness = 1.0;
    completeness = 1.0;
    notes.push("Execução retornou success = false");
  }

  const data = output.data;

  // Verificações específicas do benchmark
  if (expected.minFitScorePct !== undefined && data.fitScorePct < expected.minFitScorePct) {
    passed = false;
    faithfulness -= 1.0;
    notes.push(`Fit score (${data.fitScorePct}) abaixo do esperado (${expected.minFitScorePct})`);
  }

  if (expected.requiredMatchedSkills) {
    for (const skill of expected.requiredMatchedSkills) {
      if (Boolean(data.matchedSkills) === false || data.matchedSkills.includes(skill) === false) {
        passed = false;
        faithfulness -= 0.5;
        notes.push(`Skill obrigatória '${skill}' não foi identificada`);
      }
    }
  }

  if (expected.expectedCategory && data.category !== expected.expectedCategory) {
    passed = false;
    faithfulness -= 1.0;
    notes.push(`Categoria '${data.category}' diverge do esperado '${expected.expectedCategory}'`);
  }

  if (expected.matched !== undefined && data.matched !== expected.matched) {
    passed = false;
    faithfulness -= 1.5;
    notes.push(`Status de conciliação diverge do esperado`);
  }

  if (expected.requiresHumanApproval !== undefined && output.requires_human_approval !== expected.requiresHumanApproval) {
    passed = false;
    compliance -= 2.0;
    notes.push(`Flag de aprovação humana incorreta: esperava ${expected.requiresHumanApproval}`);
  }

  if (expected.hasInconsistencies !== undefined && data.hasInconsistencies !== expected.hasInconsistencies) {
    passed = false;
    compliance -= 1.5;
    notes.push("Detecção de inconsistência fiscal divergente");
  }

  if (expected.expectedAmountCents !== undefined && data.amountCents !== expected.expectedAmountCents) {
    passed = false;
    faithfulness -= 1.5;
    notes.push(`Valor monetário extraído (${data.amountCents}) diverge de ${expected.expectedAmountCents}`);
  }

  if (expected.riskLevel && data.riskLevel !== expected.riskLevel) {
    passed = false;
    compliance -= 1.0;
    notes.push(`Nível de risco jurídico divergente: obteve '${data.riskLevel}', esperava '${expected.riskLevel}'`);
  }

  for (const field of ["fitEvaluation", "assessmentStatus", "legalAssessmentStatus", "lgpdStatus"] as const) {
    if (expected[field] !== undefined && data[field] !== expected[field]) {
      passed = false;
      compliance -= 1.0;
      notes.push(`Estado ${field} (${data[field]}) diverge do esperado (${expected[field]})`);
    }
  }

  if (expected.urgency && data.urgency !== expected.urgency) {
    passed = false;
    compliance -= 1.0;
    notes.push(`Urgência divergente: obteve '${data.urgency}', esperava '${expected.urgency}'`);
  }

  return {
    passed,
    scores: {
      faithfulness_to_ground_truth: Math.max(0, faithfulness),
      actionability_and_structure: Math.max(0, actionability),
      brand_tone_and_silence: Math.max(0, brandTone),
      compliance_and_safety: Math.max(0, compliance),
      completeness_and_depth: Math.max(0, completeness),
      latency_and_efficiency: Math.max(0, latency),
    },
    notes,
  };
}

export async function runFullQualityEvaluation(): Promise<FullEvaluationReport> {
  let rawBenchmarks: { benchmarks?: any[] } = { benchmarks: [] };
  let baseline: any = null;

  try {
    if (typeof process !== "undefined" && typeof process.cwd === "function") {
      const fsMod = await import("node:fs");
      const pathMod = await import("node:path");
      const benchPath = pathMod.join(process.cwd(), "ia", "reference-benchmarks.json");
      const baselinePath = pathMod.join(process.cwd(), "ia", "quality-baseline.json");

      if (fsMod.existsSync(benchPath)) {
        rawBenchmarks = JSON.parse(fsMod.readFileSync(benchPath, "utf-8"));
      }
      if (fsMod.existsSync(baselinePath)) {
        baseline = JSON.parse(fsMod.readFileSync(baselinePath, "utf-8"));
      }
    }
  } catch (err) {
    console.warn("[ai-evaluator] Leitura via filesystem ignorada no runtime atual:", err);
  }

  const benchmarks: any[] = rawBenchmarks.benchmarks || [];

  const results: BenchmarkEvaluationResult[] = [];
  let passedCount = 0;

  for (const b of benchmarks) {
    const t0 = performance.now();
    let output: any;
    try {
      output = await dispatchCapability(b.capability, b.input);
    } catch (err: any) {
      output = { success: false, data: {}, summary: err.message };
    }
    const latencyMs = Math.round(performance.now() - t0);

    const { passed, scores, notes } = scoreResult(b, output);
    if (passed) passedCount++;

    const avg = Number(
      (
        (scores.faithfulness_to_ground_truth +
          scores.actionability_and_structure +
          scores.brand_tone_and_silence +
          scores.compliance_and_safety +
          scores.completeness_and_depth +
          scores.latency_and_efficiency) /
        6
      ).toFixed(2)
    );

    results.push({
      id: b.id,
      category: b.category,
      capability: b.capability,
      passed,
      scores,
      averageScore: avg,
      latencyMs,
      notes,
    });
  }

  const total = results.length;
  const rubricAverages: RubricScores = {
    faithfulness_to_ground_truth: Number((results.reduce((acc, r) => acc + r.scores.faithfulness_to_ground_truth, 0) / total).toFixed(2)),
    actionability_and_structure: Number((results.reduce((acc, r) => acc + r.scores.actionability_and_structure, 0) / total).toFixed(2)),
    brand_tone_and_silence: Number((results.reduce((acc, r) => acc + r.scores.brand_tone_and_silence, 0) / total).toFixed(2)),
    compliance_and_safety: Number((results.reduce((acc, r) => acc + r.scores.compliance_and_safety, 0) / total).toFixed(2)),
    completeness_and_depth: Number((results.reduce((acc, r) => acc + r.scores.completeness_and_depth, 0) / total).toFixed(2)),
    latency_and_efficiency: Number((results.reduce((acc, r) => acc + r.scores.latency_and_efficiency, 0) / total).toFixed(2)),
  };

  const overallScore = Number(
    (
      (rubricAverages.faithfulness_to_ground_truth +
        rubricAverages.actionability_and_structure +
        rubricAverages.brand_tone_and_silence +
        rubricAverages.compliance_and_safety +
        rubricAverages.completeness_and_depth +
        rubricAverages.latency_and_efficiency) /
      6
    ).toFixed(2)
  );

  // Verificação de regressão contra baseline
  const regressionDetails: string[] = [];
  let hasRegression = false;

  if (baseline) {
    const thresholds = baseline.thresholds || {};

    if (overallScore < (thresholds.min_overall_score ?? 4.2)) {
      hasRegression = true;
      regressionDetails.push(`Nota geral (${overallScore}) abaixo do piso mínimo (${thresholds.min_overall_score})`);
    }

    if (rubricAverages.compliance_and_safety < (thresholds.min_compliance_score ?? 4.5)) {
      hasRegression = true;
      regressionDetails.push(`Nota de conformidade (${rubricAverages.compliance_and_safety}) abaixo do piso (${thresholds.min_compliance_score})`);
    }
  }

  return {
    timestamp: new Date().toISOString(),
    totalBenchmarks: total,
    passedCount,
    failedCount: total - passedCount,
    overallScore,
    rubricAverages,
    hasRegression,
    regressionDetails,
    results,
  };
}
