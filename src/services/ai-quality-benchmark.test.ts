/**
 * ai-quality-benchmark.test.ts — Suíte de Testes Automatizados de Qualidade da IA 2.0
 *
 * PROMPT 28 (Plano #40): Avaliação Contínua e Benchmark de Qualidade 2.0
 *
 * Casos de Teste Rigorosos:
 * 1. Fase A: Validação do catálogo de rubricas ancoradas 0 a 5 com pesos e descrições estritas.
 * 2. Fase B: Integridade e cobertura das 9 tarefas nos 20 casos do dataset de referência.
 * 3. Fase C: Avaliação determinística: penalização por termos ausentes, clichês de IA e promessas vazias.
 * 4. Fase D: Detecção e bloqueio de regressão contra a baseline congelada.
 * 5. Fase E: Painel FinOps & Qualidade com cálculo de variação, 3 piores tarefas e custo por resposta aceita.
 */

import { describe, it, expect, vi } from "vitest";

// Mock do TanStack Start createServerFn para execução em testes unitários
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: () => ({
      handler: (h: any) => async (args: any) => h({ data: args?.data !== undefined ? args.data : args }),
    }),
    handler: (h: any) => async (args: any) => h({ data: args?.data !== undefined ? args.data : args }),
  }),
}));

import {
  CANONICAL_QUALITY_CRITERIA,
  TASK_QUALITY_RUBRIC_PROFILES,
  calculateWeightedQualityScore,
  QualityCriterionKey,
  QualityTaskType,
} from "./ai-quality-rubrics";
import {
  evaluateOutputAgainstBenchmark,
  runPlatformQualityBenchmark,
  getAiQualityDashboardLogic,
  BenchmarkCaseItem,
} from "./ai-quality-benchmark.functions";

// Mock de infraestrutura para execução isolada em teste
vi.mock("@/lib/supabase", () => {
  return {
    getServerClient: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnValue(Promise.resolve({ data: null, error: null })),
      })),
    })),
    SupabaseUnconfiguredError: class extends Error {},
  };
});

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn(async () => ({
    id: "usr_admin_test",
    role: "admin",
    store_id: null,
  })),
  requireAdmin: vi.fn(async () => true),
}));

describe("PROMPT 28 — Qualidade da IA: Rubricas Ancoradas, Dataset de Referência e Regressão 2.0", () => {
  // ── FASE A: RUBRICAS ANCORADAS DE 0 A 5 POR TAREFA ──
  it("Fase A: Todas as 8 rubricas possuem âncoras textuais obrigatórias para cada nota (0 a 5)", () => {
    const criteriaKeys = Object.keys(CANONICAL_QUALITY_CRITERIA) as QualityCriterionKey[];
    expect(criteriaKeys.length).toBe(8);

    let sumWeights = 0;
    for (const key of criteriaKeys) {
      const crit = CANONICAL_QUALITY_CRITERIA[key];
      expect(crit.key).toBe(key);
      expect(crit.label.length).toBeGreaterThan(3);
      expect(crit.description.length).toBeGreaterThan(10);
      expect(crit.weight).toBeGreaterThan(0);
      sumWeights += crit.weight;

      // Verificação das 6 âncoras (0 a 5)
      for (let score = 0; score <= 5; score++) {
        const anchor = crit.anchors[score as 0 | 1 | 2 | 3 | 4 | 5];
        expect(typeof anchor).toBe("string");
        expect(anchor.length).toBeGreaterThan(15);
      }
    }

    // A soma dos pesos deve totalizar 1.0 (100%)
    expect(Number(sumWeights.toFixed(2))).toBe(1.0);

    // Verificação dos perfis das 9 tarefas
    const tasks: QualityTaskType[] = [
      "chat",
      "document",
      "presentation",
      "page",
      "ad",
      "classification",
      "extraction",
      "summary",
      "code",
    ];
    for (const task of tasks) {
      const profile = TASK_QUALITY_RUBRIC_PROFILES[task];
      expect(profile).toBeDefined();
      expect(profile.minAcceptableScore).toBeGreaterThanOrEqual(4.4);
    }
  });

  // ── FASE B: DATASET CANÔNICO DE REFERÊNCIA (20 CASOS) ──
  it("Fase B: Dataset possui 20 casos de referência cobrindo integralmente as tarefas críticas", async () => {
    const report = await runPlatformQualityBenchmark();
    expect(report.totalBenchmarks).toBe(20);
    expect(report.version).toBe("2.0.0");

    // Validação de que todas as 9 tarefas possuem casos no benchmark
    const tasksCovered = Object.keys(report.taskAverages) as QualityTaskType[];
    expect(tasksCovered.length).toBe(9);

    for (const task of tasksCovered) {
      expect(report.taskAverages[task]).toBeGreaterThan(0);
    }
  });

  // ── FASE C: AVALIAÇÃO DETERMINÍSTICA E PENALIZAÇÃO DE DESVIOS ──
  it("Fase C: Avaliador penaliza termos ausentes, clichês prolixos de IA, emojis e promessas vazias", () => {
    const mockCase: BenchmarkCaseItem = {
      id: "TEST-CASE-01",
      task: "chat",
      title: "Teste de Atendimento",
      prompt: "Qual o horário da cantina?",
      context: { store_name: "Cantina Central" },
      expected_output: {
        must_contain: ["11:30 às 23:00", "Cantina Central"],
        prohibited_terms: ["Certamente", "Com certeza"],
      },
      acceptance_criteria: ["Informar horário correto", "Sem clichês de IA"],
      min_pass_score: 4.5,
    };

    // 1. Saída Perfeita (Nota 5.0)
    const perfectOutput = "O horário de funcionamento da Cantina Central é das 11:30 às 23:00.";
    const evalPerfect = evaluateOutputAgainstBenchmark(mockCase, perfectOutput);
    expect(evalPerfect.passed).toBe(true);
    expect(evalPerfect.overallScore).toBe(5);
    expect(evalPerfect.notes.length).toBe(0);

    // 2. Saída com termo obrigatório faltando
    const missingTermOutput = "Estamos abertos das 11:30 às 23:00.";
    const evalMissing = evaluateOutputAgainstBenchmark(mockCase, missingTermOutput);
    expect(evalMissing.scores.fidelidade_ao_dado_interno).toBeLessThan(5);
    expect(evalMissing.notes.some((n) => n.includes("Termo obrigatório ausente"))).toBe(true);

    // 3. Saída com clichê proibido de IA ("Certamente!")
    const clicheOutput = "Certamente! A Cantina Central atende das 11:30 às 23:00.";
    const evalCliche = evaluateOutputAgainstBenchmark(mockCase, clicheOutput);
    expect(evalCliche.scores.aderencia_ao_tom).toBeLessThan(5);
    expect(evalCliche.notes.some((n) => n.includes("clichê proibido"))).toBe(true);

    // 4. Saída com promessa vazia infundada ("garantimos 100%")
    const emptyPromiseOutput = "Na Cantina Central garantimos 100% de satisfação das 11:30 às 23:00.";
    const evalPromise = evaluateOutputAgainstBenchmark(mockCase, emptyPromiseOutput);
    expect(evalPromise.scores.ausencia_de_promessa_vazia).toBeLessThan(5);
    expect(evalPromise.notes.some((n) => n.includes("Promessa infundada"))).toBe(true);
  });

  // ── FASE D: GATE DE DETECÇÃO DE REGRESSÃO ──
  it("Fase D: runPlatformQualityBenchmark detecta regressão e falha quando as notas caem abaixo da baseline", async () => {
    // 1. Execução padrão (sem regressões)
    const cleanReport = await runPlatformQualityBenchmark();
    expect(cleanReport.hasRegression).toBe(false);
    expect(cleanReport.passRatePct).toBe(100);
    expect(cleanReport.overallScore).toBeGreaterThanOrEqual(4.8);

    // 2. Execução simulada com degradação artificial de um caso
    const degradedOutputs: Record<string, string> = {
      "BENCH-2.0-CHAT-01": "Não sei o horário, desculpe pelo transtorno terrível.",
      "BENCH-2.0-DOC-01": "Contrato sem valor e sem garantias para ninguém.",
    };
    const degradedReport = await runPlatformQualityBenchmark(degradedOutputs);
    expect(degradedReport.failedCount).toBeGreaterThanOrEqual(1);
    expect(degradedReport.passRatePct).toBeLessThan(100);
  });

  // ── FASE E: PAINEL ANALÍTICO FINOPS E QUALIDADE ──
  it("Fase E: getAiQualityDashboardService retorna métricas de FinOps, variação e identifica as 3 piores tarefas", async () => {
    const dashboard = await getAiQualityDashboardLogic();

    expect(dashboard.overallScore).toBeGreaterThan(4.0);
    expect(dashboard.passRatePct).toBeGreaterThan(90);
    expect(dashboard.finops).toBeDefined();
    expect(dashboard.finops.avgCostPerAcceptedResponseUsd).toBeGreaterThan(0);
    expect(dashboard.finops.humanAcceptanceRatePct).toBeGreaterThan(95);

    // As 3 piores tarefas devem estar ordenadas crescentemente por nota
    expect(dashboard.threeWorstTasks.length).toBe(3);
    expect(dashboard.threeWorstTasks[0].score).toBeLessThanOrEqual(dashboard.threeWorstTasks[1].score);
    expect(dashboard.threeWorstTasks[1].score).toBeLessThanOrEqual(dashboard.threeWorstTasks[2].score);
  });
});
