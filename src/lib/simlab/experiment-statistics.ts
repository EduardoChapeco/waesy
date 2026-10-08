export interface CampaignArmObservation {
  key: string;
  label: string;
  assigned: number;
  conversions: number;
  priceBrl?: number | null;
}

export type RandomizationUnit = "customer" | "session" | "cluster";

export interface CampaignExperimentInput {
  arms: CampaignArmObservation[];
  controlKey: string;
  assignmentMethod: "randomized" | "observational";
  randomizationUnit?: RandomizationUnit | null;
  confidenceLevel?: number;
}

export interface CampaignArmRate {
  key: string;
  label: string;
  assigned: number;
  conversions: number;
  conversionRate: number;
  interval: [number, number] | null;
}

export interface CampaignComparison {
  controlKey: string;
  treatmentKey: string;
  controlRate: number;
  treatmentRate: number;
  absoluteDifference: number;
  relativeDifference: number | null;
  interval: [number, number] | null;
  pValue: number | null;
  pValueMethod: "two_proportion_score" | "fisher_exact" | "not_estimable_sparse" | "not_identifiable_design";
  adjustedPValue?: number;
  causalInterpretation: "randomized_individual_assignment" | "descriptive_only";
  statisticallySignificant: boolean | null;
}

export interface CampaignExperimentAnalysis {
  method: "intention_to_treat_proportion_difference" | "observed_arm_rates_descriptive_only";
  intervalMethod: "newcombe_wilson_score" | "not_estimated_for_design";
  confidenceLevel: number;
  controlKey: string;
  armRates: CampaignArmRate[];
  comparisons: CampaignComparison[];
  limitations: string[];
}

const DEFAULT_CONFIDENCE = 0.95;
const Z_975 = 1.959963984540054;

function assertCount(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} deve ser um inteiro não negativo.`);
  }
}

function validateArm(arm: CampaignArmObservation): void {
  if (!arm.key.trim()) throw new Error("Cada braço precisa de uma chave única.");
  if (!arm.label.trim()) throw new Error("Cada braço precisa de um nome.");
  assertCount(arm.assigned, `${arm.label}: pessoas atribuídas`);
  assertCount(arm.conversions, `${arm.label}: conversões`);
  if (arm.assigned === 0) throw new Error(`${arm.label}: não há pessoas atribuídas.`);
  if (arm.conversions > arm.assigned) {
    throw new Error(`${arm.label}: conversões não podem superar pessoas atribuídas.`);
  }
  if (arm.priceBrl != null && (!Number.isFinite(arm.priceBrl) || arm.priceBrl <= 0)) {
    throw new Error(`${arm.label}: preço deve ser maior que zero.`);
  }
}

function inverseNormalCdf(p: number): number {
  if (!(p > 0 && p < 1)) throw new Error("Probabilidade fora do intervalo (0, 1).");

  // Peter J. Acklam's rational approximation.
  const a = [
    -3.969683028665376e1,
    2.209460984245205e2,
    -2.759285104469687e2,
    1.38357751867269e2,
    -3.066479806614716e1,
    2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1,
    1.615858368580409e2,
    -1.556989798598866e2,
    6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3,
    -3.223964580411365e-1,
    -2.400758277161838,
    -2.549732539343734,
    4.374664141464968,
    2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3,
    3.224671290700398e-1,
    2.445134137142996,
    3.754408661907416,
  ];
  const low = 0.02425;
  const high = 1 - low;

  if (p < low) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > high) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5;
  const r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

function normalCdf(x: number): number {
  const absX = Math.abs(x);
  const t = 1 / (1 + 0.2316419 * absX);
  const density = 0.3989422804014327 * Math.exp(-0.5 * absX * absX);
  const tail = density * t * (
    0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429)))
  );
  return x >= 0 ? 1 - tail : tail;
}

function wilsonInterval(successes: number, trials: number, confidenceLevel: number): [number, number] {
  const z = inverseNormalCdf(1 - (1 - confidenceLevel) / 2);
  const p = successes / trials;
  const z2 = z * z;
  const denominator = 1 + z2 / trials;
  const center = (p + z2 / (2 * trials)) / denominator;
  const half = (z / denominator) * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials));
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

function logGamma(z: number): number {
  const coefficients = [
    676.5203681218851,
    -1259.1392167224028,
    771.3234287776531,
    -176.6150291621406,
    12.507343278686905,
    -0.13857109526572012,
    9.984369578019572e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z);
  const shifted = z - 1;
  let x = 0.9999999999998099;
  for (let i = 0; i < coefficients.length; i += 1) x += coefficients[i] / (shifted + i + 1);
  const t = shifted + coefficients.length - 0.5;
  return 0.9189385332046727 + (shifted + 0.5) * Math.log(t) - t + Math.log(x);
}

function logChoose(n: number, k: number): number {
  if (k < 0 || k > n) return Number.NEGATIVE_INFINITY;
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

function fisherExactTwoSided(a: number, b: number, c: number, d: number): number | null {
  const treatmentN = a + b;
  const controlN = c + d;
  const totalN = treatmentN + controlN;
  const totalSuccesses = a + c;
  const minA = Math.max(0, treatmentN - (totalN - totalSuccesses));
  const maxA = Math.min(treatmentN, totalSuccesses);
  if (maxA - minA > 50000) return null;

  const logDenominator = logChoose(totalN, treatmentN);
  const logProbability = (x: number) => logChoose(totalSuccesses, x) +
    logChoose(totalN - totalSuccesses, treatmentN - x) - logDenominator;
  const observedLogProbability = logProbability(a);
  let pValue = 0;
  for (let x = minA; x <= maxA; x += 1) {
    const lp = logProbability(x);
    if (lp <= observedLogProbability + 1e-12) pValue += Math.exp(lp);
  }
  return Math.max(0, Math.min(1, pValue));
}

function compareArms(
  control: CampaignArmObservation,
  treatment: CampaignArmObservation,
  confidenceLevel: number,
  randomized: boolean,
  identifiableIndividualDesign: boolean,
): CampaignComparison {
  const p0 = control.conversions / control.assigned;
  const p1 = treatment.conversions / treatment.assigned;
  const difference = p1 - p0;
  const [l0, u0] = wilsonInterval(control.conversions, control.assigned, confidenceLevel);
  const [l1, u1] = wilsonInterval(treatment.conversions, treatment.assigned, confidenceLevel);
  const lower = difference - Math.sqrt((p1 - l1) ** 2 + (u0 - p0) ** 2);
  const upper = difference + Math.sqrt((u1 - p1) ** 2 + (p0 - l0) ** 2);

  if (!identifiableIndividualDesign) {
    return {
      controlKey: control.key,
      treatmentKey: treatment.key,
      controlRate: p0,
      treatmentRate: p1,
      absoluteDifference: difference,
      relativeDifference: p0 === 0 ? null : difference / p0,
      interval: null,
      pValue: null,
      pValueMethod: "not_identifiable_design",
      causalInterpretation: "descriptive_only",
      statisticallySignificant: null,
    };
  }

  const totalN = control.assigned + treatment.assigned;
  const pooled = (control.conversions + treatment.conversions) / totalN;
  const expected = [
    control.assigned * pooled,
    control.assigned * (1 - pooled),
    treatment.assigned * pooled,
    treatment.assigned * (1 - pooled),
  ];
  const sparse = expected.some((cell) => cell < 5);
  let pValue: number | null;
  let pValueMethod: CampaignComparison["pValueMethod"];
  if (sparse) {
    pValue = fisherExactTwoSided(
      treatment.conversions,
      treatment.assigned - treatment.conversions,
      control.conversions,
      control.assigned - control.conversions,
    );
    pValueMethod = pValue == null ? "not_estimable_sparse" : "fisher_exact";
  } else {
    const standardError = Math.sqrt(pooled * (1 - pooled) * (1 / control.assigned + 1 / treatment.assigned));
    const z = standardError === 0 ? 0 : difference / standardError;
    pValue = Math.max(0, Math.min(1, 2 * (1 - normalCdf(Math.abs(z)))));
    pValueMethod = "two_proportion_score";
  }

  return {
    controlKey: control.key,
    treatmentKey: treatment.key,
    controlRate: p0,
    treatmentRate: p1,
    absoluteDifference: difference,
    relativeDifference: p0 === 0 ? null : difference / p0,
    interval: [Math.max(-1, lower), Math.min(1, upper)],
    pValue,
    pValueMethod,
    causalInterpretation: randomized ? "randomized_individual_assignment" : "descriptive_only",
    statisticallySignificant: pValue == null ? null : pValue < (1 - confidenceLevel),
  };
}

/**
 * Compara cada variante com o controle usando a análise por intenção de tratar:
 * denominador = pessoas/contas atribuídas, não apenas as que clicaram ou abriram.
 * Para randomização por cluster/geografia, esta função não substitui uma análise
 * que modele o desenho por cluster.
 */
export function analyzeCampaignExperiment(input: CampaignExperimentInput): CampaignExperimentAnalysis {
  const confidenceLevel = input.confidenceLevel ?? DEFAULT_CONFIDENCE;
  if (!(confidenceLevel > 0.8 && confidenceLevel < 1)) {
    throw new Error("O nível de confiança precisa estar entre 0,80 e 1.");
  }
  if (input.arms.length < 2) throw new Error("Informe ao menos controle e uma variante.");
  for (const arm of input.arms) validateArm(arm);
  if (new Set(input.arms.map((arm) => arm.key)).size !== input.arms.length) {
    throw new Error("As chaves dos braços precisam ser únicas.");
  }
  const control = input.arms.find((arm) => arm.key === input.controlKey);
  if (!control) throw new Error("O braço de controle informado não existe.");
  const identifiableIndividualDesign = input.assignmentMethod !== "randomized" || input.randomizationUnit === "customer";

  const comparisons = input.arms
    .filter((arm) => arm.key !== control.key)
    .map((arm) => compareArms(
      control,
      arm,
      confidenceLevel,
      input.assignmentMethod === "randomized" && input.randomizationUnit === "customer",
      identifiableIndividualDesign,
    ));
  const limitations = [
    "Os valores de entrada são agregados informados/importados pelo workspace; a análise não comprova a origem dos dados.",
    "O denominador é a quantidade atribuída, conforme intenção de tratar. Não use impressões repetidas como se fossem pessoas independentes.",
    "A causalidade só é indicada para atribuição randomizada por cliente/conta única; resultados observacionais são descritivos.",
    "A inferência não cobre lucro incremental se margem, custo e canibalização não forem medidos.",
  ];
  if (comparisons.some((comparison) => comparison.pValueMethod === "not_estimable_sparse")) {
    limitations.push("Ao menos uma comparação tem contagens esparsas; o teste de significância foi omitido, embora o intervalo score continue disponível.");
  }
  if (input.assignmentMethod === "randomized" && !identifiableIndividualDesign) {
    limitations.push("Sessão/cluster não possui estimador de independência implementado; diferenças e taxas são exibidas apenas como totais descritivos, sem IC ou p-value.");
  }

  return {
    method: identifiableIndividualDesign
      ? "intention_to_treat_proportion_difference"
      : "observed_arm_rates_descriptive_only",
    intervalMethod: identifiableIndividualDesign ? "newcombe_wilson_score" : "not_estimated_for_design",
    confidenceLevel,
    controlKey: control.key,
    armRates: input.arms.map((arm) => ({
      key: arm.key,
      label: arm.label,
      assigned: arm.assigned,
      conversions: arm.conversions,
      conversionRate: arm.conversions / arm.assigned,
      interval: identifiableIndividualDesign
        ? wilsonInterval(arm.conversions, arm.assigned, confidenceLevel)
        : null,
    })),
    comparisons,
    limitations,
  };
}

/** Correção step-down de Holm para comparações múltiplas contra controle. */
export function holmAdjustPValues(pValues: number[]): number[] {
  if (pValues.some((p) => !Number.isFinite(p) || p < 0 || p > 1)) {
    throw new Error("Todos os p-values precisam estar no intervalo [0, 1].");
  }
  const sorted = pValues.map((pValue, index) => ({ pValue, index })).sort((a, b) => a.pValue - b.pValue);
  const adjusted = new Array<number>(pValues.length);
  let previous = 0;
  sorted.forEach(({ pValue, index }, rank) => {
    const candidate = Math.min(1, (sorted.length - rank) * pValue);
    previous = Math.max(previous, candidate);
    adjusted[index] = previous;
  });
  return adjusted;
}

export interface SampleSizePlan {
  method: "two_independent_proportions_normal_approximation";
  baselineRate: number;
  targetRate: number;
  alpha: number;
  power: number;
  requiredPerArm: number;
  totalRequired: number;
  limitations: string[];
}

export function planTwoArmSampleSize(input: {
  baselineRate: number;
  targetRate: number;
  alpha?: number;
  power?: number;
}): SampleSizePlan {
  const alpha = input.alpha ?? 0.05;
  const power = input.power ?? 0.8;
  const { baselineRate, targetRate } = input;
  if (!(baselineRate > 0 && baselineRate < 1 && targetRate > 0 && targetRate < 1)) {
    throw new Error("As taxas base e alvo precisam estar entre 0 e 1.");
  }
  if (baselineRate === targetRate) throw new Error("A taxa alvo precisa diferir da taxa base.");
  if (!(alpha > 0 && alpha < 0.2)) throw new Error("Alpha precisa estar entre 0 e 0,20.");
  if (!(power > 0.5 && power < 1)) throw new Error("O poder precisa estar entre 0,50 e 1.");

  const zAlpha = inverseNormalCdf(1 - alpha / 2);
  const zPower = inverseNormalCdf(power);
  const averageRate = (baselineRate + targetRate) / 2;
  const numerator = zAlpha * Math.sqrt(2 * averageRate * (1 - averageRate)) +
    zPower * Math.sqrt(baselineRate * (1 - baselineRate) + targetRate * (1 - targetRate));
  const requiredPerArm = Math.ceil((numerator * numerator) / ((targetRate - baselineRate) ** 2));

  return {
    method: "two_independent_proportions_normal_approximation",
    baselineRate,
    targetRate,
    alpha,
    power,
    requiredPerArm,
    totalRequired: 2 * requiredPerArm,
    limitations: [
      "A aproximação supõe duas amostras independentes e alocação 1:1.",
      "O plano não corrige perda de rastreamento, contaminação entre variantes, múltiplas métricas ou randomização por cluster.",
      "O baseline deve vir de dados observados; a taxa de conversão de personas sintéticas não é um baseline válido.",
    ],
  };
}

export interface PriceResponseArm extends CampaignArmObservation {
  priceBrl: number;
}

export interface PriceResponseModel {
  method: "grouped_binomial_logit_log_price";
  coefficients: { intercept: number; logPrice: number };
  covariance: [[number, number], [number, number]];
  referencePriceBrl: number;
  predictedConversionAtReference: number;
  elasticityAtReference: number;
  elasticityInterval95: [number, number];
  calibrationStatus: "fitted_requires_holdout_validation";
  limitations: string[];
}

function logistic(value: number): number {
  const bounded = Math.max(-30, Math.min(30, value));
  return 1 / (1 + Math.exp(-bounded));
}

/**
 * Ajusta uma demanda binomial logística agrupada sobre preços de braços
 * randomizados: logit(P(conversão)) = beta0 + beta1 * log(preço).
 * Não estima causalidade a partir de preços observacionais e não declara o
 * ajuste validado sem holdout prospectivo.
 */
export function fitRandomizedPriceResponse(input: {
  arms: PriceResponseArm[];
  assignmentMethod: "randomized" | "observational";
  randomizationUnit: RandomizationUnit;
}): PriceResponseModel {
  if (input.assignmentMethod !== "randomized") {
    throw new Error("Elasticidade causal de preço requer braços de preço randomizados.");
  }
  if (input.randomizationUnit !== "customer") {
    throw new Error("A curva de preço exige randomização por cliente/conta única; análise por sessão/cluster não está implementada.");
  }
  if (input.arms.length < 3) throw new Error("Use pelo menos três níveis de preço randomizados.");
  input.arms.forEach(validateArm);
  const uniquePrices = new Set(input.arms.map((arm) => arm.priceBrl));
  if (uniquePrices.size < 3) throw new Error("Os braços precisam ter ao menos três preços distintos.");
  if (input.arms.some((arm) => !Number.isFinite(arm.priceBrl) || arm.priceBrl <= 0)) {
    throw new Error("Todos os braços precisam de preço positivo observado.");
  }
  const totalSuccesses = input.arms.reduce((sum, arm) => sum + arm.conversions, 0);
  const totalFailures = input.arms.reduce((sum, arm) => sum + arm.assigned - arm.conversions, 0);
  if (totalSuccesses < 5 || totalFailures < 5) {
    throw new Error("Dados insuficientes: são necessárias ao menos cinco conversões e cinco não conversões observadas.");
  }

  let beta0 = 0;
  let beta1 = 0;
  let h00 = 0;
  let h01 = 0;
  let h11 = 0;
  let converged = false;
  const ridge = 1e-8;

  for (let iteration = 0; iteration < 100; iteration += 1) {
    let g0 = 0;
    let g1 = 0;
    h00 = ridge;
    h01 = 0;
    h11 = ridge;

    for (const arm of input.arms) {
      const x = Math.log(arm.priceBrl);
      const probability = logistic(beta0 + beta1 * x);
      const weight = arm.assigned * probability * (1 - probability);
      g0 += arm.conversions - arm.assigned * probability;
      g1 += (arm.conversions - arm.assigned * probability) * x;
      h00 += weight;
      h01 += weight * x;
      h11 += weight * x * x;
    }

    const determinant = h00 * h11 - h01 * h01;
    if (!Number.isFinite(determinant) || determinant <= 1e-14) {
      throw new Error("O desenho de preços não identifica os parâmetros do modelo.");
    }
    const step0 = (h11 * g0 - h01 * g1) / determinant;
    const step1 = (-h01 * g0 + h00 * g1) / determinant;
    beta0 += step0;
    beta1 += step1;

    if (!Number.isFinite(beta0) || !Number.isFinite(beta1) || Math.abs(beta0) > 100 || Math.abs(beta1) > 100) {
      throw new Error("O modelo de preço não convergiu; verifique separação ou tamanho da amostra.");
    }
    if (Math.max(Math.abs(step0), Math.abs(step1)) < 1e-8) {
      converged = true;
      break;
    }
  }
  if (!converged) throw new Error("O ajuste logístico não convergiu dentro do limite de iterações.");

  // Recalcular a Hessiana no ponto convergido para a covariância de Wald.
  h00 = ridge;
  h01 = 0;
  h11 = ridge;
  for (const arm of input.arms) {
    const x = Math.log(arm.priceBrl);
    const probability = logistic(beta0 + beta1 * x);
    const weight = arm.assigned * probability * (1 - probability);
    h00 += weight;
    h01 += weight * x;
    h11 += weight * x * x;
  }
  const determinant = h00 * h11 - h01 * h01;
  const covariance: [[number, number], [number, number]] = [
    [h11 / determinant, -h01 / determinant],
    [-h01 / determinant, h00 / determinant],
  ];
  const referencePriceBrl = Math.exp(input.arms.reduce((sum, arm) => sum + Math.log(arm.priceBrl), 0) / input.arms.length);
  const logReferencePrice = Math.log(referencePriceBrl);
  const predictedConversionAtReference = logistic(beta0 + beta1 * logReferencePrice);
  const elasticityAtReference = beta1 * (1 - predictedConversionAtReference);
  const elasticityGradient0 = -beta1 * predictedConversionAtReference * (1 - predictedConversionAtReference);
  const elasticityGradient1 = (1 - predictedConversionAtReference) -
    beta1 * predictedConversionAtReference * (1 - predictedConversionAtReference) * logReferencePrice;
  const elasticityVariance = elasticityGradient0 ** 2 * covariance[0][0] +
    2 * elasticityGradient0 * elasticityGradient1 * covariance[0][1] +
    elasticityGradient1 ** 2 * covariance[1][1];
  const elasticitySe = Math.sqrt(Math.max(0, elasticityVariance));

  return {
    method: "grouped_binomial_logit_log_price",
    coefficients: { intercept: beta0, logPrice: beta1 },
    covariance,
    referencePriceBrl,
    predictedConversionAtReference,
    elasticityAtReference,
    elasticityInterval95: [elasticityAtReference - Z_975 * elasticitySe, elasticityAtReference + Z_975 * elasticitySe],
    calibrationStatus: "fitted_requires_holdout_validation",
    limitations: [
      "O efeito causal depende da atribuição randomizada de clientes a preços e de não haver interferência entre braços.",
      "A elasticidade reportada é local ao preço geométrico médio dos braços e supõe relação linear entre log-preço e logit da conversão.",
      "O intervalo de Wald é aproximado; o ajuste precisa de holdout prospectivo por período/loja antes de uso como previsão.",
      "Não inclui margem, custo de aquisição, estoque, canibalização ou efeito sobre ticket médio.",
    ],
  };
}

export function predictPriceResponse(model: PriceResponseModel, priceBrl: number): {
  conversionProbability: number;
  interval95: [number, number];
} {
  if (!Number.isFinite(priceBrl) || priceBrl <= 0) throw new Error("O preço de previsão deve ser positivo.");
  const x = Math.log(priceBrl);
  const eta = model.coefficients.intercept + model.coefficients.logPrice * x;
  const variance = model.covariance[0][0] + 2 * x * model.covariance[0][1] + x * x * model.covariance[1][1];
  const standardError = Math.sqrt(Math.max(0, variance));
  return {
    conversionProbability: logistic(eta),
    interval95: [logistic(eta - Z_975 * standardError), logistic(eta + Z_975 * standardError)],
  };
}
