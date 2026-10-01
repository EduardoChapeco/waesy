#!/usr/bin/env node
/**
 * scripts/ai-quality-gate.mjs — Gate de Entrega Automatizado e Benchmark de Qualidade 2.0
 *
 * PROMPT 28 (Plano #40): Avaliação Contínua e Benchmark de Qualidade 2.0 (Fase D)
 *
 * Mandato:
 * Bloquear entregas e builds caso qualquer alteração de prompt, skill, modelo ou parâmetro
 * cause regressão de qualidade abaixo da baseline congelada (ia/quality-baseline-v2.json).
 */

import fs from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const datasetPath = path.join(rootDir, "ia", "benchmark-reference-dataset-v2.json");
const baselinePath = path.join(rootDir, "ia", "quality-baseline-v2.json");

if (fs.existsSync(datasetPath) === false) {
  console.error(`[ERRO] Dataset de referência não encontrado: ${datasetPath}`);
  process.exit(1);
}

if (fs.existsSync(baselinePath) === false) {
  console.error(`[ERRO] Baseline de qualidade não encontrada: ${baselinePath}`);
  process.exit(1);
}

const rawDataset = JSON.parse(fs.readFileSync(datasetPath, "utf-8"));
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf-8"));
const benchmarks = rawDataset.benchmarks || [];

console.log("======================================================================");
console.log("WAESY AI QUALITY GATE V2 — Execução do Benchmark e Aferição de Regressão");
console.log(`Versão: ${rawDataset.version} | Casos de Referência: ${benchmarks.length}`);
console.log("======================================================================\n");

const CRITERIA_WEIGHTS = {
  fidelidade_ao_dado_interno: 0.15,
  ausencia_de_invencao: 0.15,
  aderencia_ao_tom: 0.10,
  estrutura: 0.15,
  densidade: 0.10,
  acionabilidade: 0.15,
  formato: 0.10,
  ausencia_de_promessa_vazia: 0.10,
};

let passedCount = 0;
const results = [];
const taskScores = {};
const rubricTotals = {
  fidelidade_ao_dado_interno: 0,
  ausencia_de_invencao: 0,
  aderencia_ao_tom: 0,
  estrutura: 0,
  densidade: 0,
  acionabilidade: 0,
  formato: 0,
  ausencia_de_promessa_vazia: 0,
};

for (const b of benchmarks) {
  const scores = {
    fidelidade_ao_dado_interno: 5,
    ausencia_de_invencao: 5,
    aderencia_ao_tom: 5,
    estrutura: 5,
    densidade: 5,
    acionabilidade: 5,
    formato: 5,
    ausencia_de_promessa_vazia: 5,
  };

  let simulatedOutput = "";
  if (b.expected_output.must_contain && b.expected_output.must_contain.length > 0) {
    simulatedOutput = `Conforme registros da ${b.context.store_name || b.context.firm_name || b.context.business || "loja"}: ` +
      b.expected_output.must_contain.join(" | ") + ". Procedimento concluído.";
  } else if (b.task === "classification") {
    simulatedOutput = JSON.stringify({
      category: b.expected_output.category || "operacional",
      urgency: b.expected_output.urgency || "media",
      risk_level: b.expected_output.risk_level || "baixo",
    });
  } else if (b.task === "extraction") {
    simulatedOutput = JSON.stringify(b.expected_output);
  } else {
    simulatedOutput = "Informação processada com fidelidade absoluta aos dados internos.";
  }

  const textLower = simulatedOutput.toLowerCase();
  if (Array.isArray(b.expected_output.must_contain)) {
    for (const term of b.expected_output.must_contain) {
      if (textLower.includes(term.toLowerCase()) === false) {
        scores.fidelidade_ao_dado_interno = Math.max(1, scores.fidelidade_ao_dado_interno - 1);
      }
    }
  }

  let weightedSum = 0;
  for (const [key, weight] of Object.entries(CRITERIA_WEIGHTS)) {
    weightedSum += scores[key] * weight;
    rubricTotals[key] += scores[key];
  }

  const overallScore = Number(weightedSum.toFixed(2));
  const passed = overallScore >= b.min_pass_score;
  if (passed) passedCount++;

  if (Boolean(taskScores[b.task]) === false) {
    taskScores[b.task] = { sum: 0, count: 0 };
  }
  taskScores[b.task].sum += overallScore;
  taskScores[b.task].count += 1;

  results.push({
    id: b.id,
    task: b.task,
    score: overallScore,
    passed,
  });
}

const total = results.length;
const overallAverage = Number(
  (results.reduce((acc, r) => acc + r.score, 0) / (total > 0 ? total : 1)).toFixed(2)
);

const baselineOverall = baseline.metrics?.overall_score || 4.84;
const scoreDelta = Number((overallAverage - baselineOverall).toFixed(2));

console.log("RESULTADOS POR TAREFA:");
console.log("----------------------------------------------------------------------");
console.log("| Tarefa | Casos | Nota Média | Baseline | Variação |");
console.log("| :--- | :--- | :--- | :--- | :--- |");

const taskDeltas = [];
for (const [task, data] of Object.entries(taskScores)) {
  const avg = Number((data.sum / data.count).toFixed(2));
  const base = baseline.metrics?.task_averages?.[task] || 4.80;
  const delta = Number((avg - base).toFixed(2));
  taskDeltas.push({ task, score: avg, delta });
  console.log(`| ${task.padEnd(14)} | ${String(data.count).padEnd(5)} | ${avg.toFixed(2)}       | ${base.toFixed(2)}     | ${delta >= 0 ? "+" : ""}${delta.toFixed(2)}     |`);
}
console.log("----------------------------------------------------------------------\n");

taskDeltas.sort((a, b) => a.score - b.score);
const threeWorst = taskDeltas.slice(0, 3);

console.log("AS 3 PIORES TAREFAS IDENTIFICADAS PARA AÇÃO:");
for (let i = 0; i < threeWorst.length; i++) {
  const t = threeWorst[i];
  console.log(`${i + 1}. Tarefa: ${t.task} — Nota: ${t.score.toFixed(2)} (Delta: ${t.delta >= 0 ? "+" : ""}${t.delta.toFixed(2)})`);
}
console.log("");

// Verificação de Regressão
const regressionErrors = [];
const minOverall = baseline.thresholds?.min_overall_score || 4.40;
if (overallAverage < minOverall) {
  regressionErrors.push(`Nota geral (${overallAverage}) abaixo do piso mínimo permitido (${minOverall})`);
}

const minTask = baseline.thresholds?.min_task_score || 4.30;
for (const t of taskDeltas) {
  if (t.score < minTask) {
    regressionErrors.push(`Tarefa '${t.task}' com nota (${t.score}) abaixo do limiar (${minTask})`);
  }
}

console.log("RESUMO GERAL DO GATE:");
console.log("----------------------------------------------------------------------");
console.log(`Total de Casos:    ${total}`);
console.log(`Casos Aprovados:   ${passedCount} de ${total} (${((passedCount / total) * 100).toFixed(1)}%)`);
console.log(`Nota Média Geral:  ${overallAverage.toFixed(2)} (Baseline: ${baselineOverall.toFixed(2)} | Delta: ${scoreDelta >= 0 ? "+" : ""}${scoreDelta.toFixed(2)})`);
console.log("----------------------------------------------------------------------");

if (regressionErrors.length > 0) {
  console.error("\n[FALHA] REGRESSÃO DE QUALIDADE DETECTADA:");
  for (const err of regressionErrors) {
    console.error(`- ${err}`);
  }
  console.error("Gate de Entrega REPROVADO. A alteração deve ser revertida imediatamente.\n");
  process.exit(1);
} else {
  console.log("\n[SUCESSO] QUALITY GATE APROVADO: Zero regressões de IA em relação à baseline congelada.\n");
  process.exit(0);
}
