/**
 * Official Brazilian CLT & PJ Payroll Accounting Engine (Motor de Folha de Pagamento)
 * Conforme Tabelas Oficiais de INSS, IRRF, FGTS, Portaria MTE e Legislação Vigente 2026.
 */

export interface INSSBracket {
  faixa: number;
  ceilingCents: number;
  floorCents: number;
  aliquot: number;
}

export const INSS_BRACKETS_2026: INSSBracket[] = [
  { faixa: 1, floorCents: 0, ceilingCents: 151800, aliquot: 0.075 },
  { faixa: 2, floorCents: 151800, ceilingCents: 279388, aliquot: 0.09 },
  { faixa: 3, floorCents: 279388, ceilingCents: 419083, aliquot: 0.12 },
  { faixa: 4, floorCents: 419083, ceilingCents: 815741, aliquot: 0.14 },
];

export const INSS_CEILING_CENTS_2026 = 815741;
export const INSS_MAX_DISCOUNT_CENTS_2026 = 95162; // R$ 951,62

export interface IRRFBracket {
  faixa: number;
  ceilingCents: number;
  floorCents: number;
  aliquot: number;
  deductionCents: number;
}

export const IRRF_BRACKETS_2026: IRRFBracket[] = [
  { faixa: 1, floorCents: 0, ceilingCents: 225920, aliquot: 0.0, deductionCents: 0 },
  { faixa: 2, floorCents: 225920, ceilingCents: 282665, aliquot: 0.075, deductionCents: 16944 },
  { faixa: 3, floorCents: 282665, ceilingCents: 375105, aliquot: 0.15, deductionCents: 38144 },
  { faixa: 4, floorCents: 375105, ceilingCents: 466468, aliquot: 0.225, deductionCents: 66277 },
  { faixa: 5, floorCents: 466468, ceilingCents: Infinity, aliquot: 0.275, deductionCents: 89600 },
];

export const IRRF_DEPENDENT_DEDUCTION_CENTS_2026 = 18959; // R$ 189,59 por dependente
export const IRRF_SIMPLIFIED_DISCOUNT_CENTS_2026 = 56480; // R$ 564,80

import type { SalaryBreakdownItem } from "@/types/hr";
export type { SalaryBreakdownItem };

export interface PayrollCalculationInput {
  baseSalaryCents: number;
  employmentType?: "clt" | "pj" | "internship" | "apprentice" | "temporary" | "freelancer";
  monthlyHoursDivisor?: number; // 220, 180, 150
  hoursOvertime50?: number;
  hoursOvertime100?: number;
  nightHours?: number;
  businessDaysInMonth?: number; // padrão 25
  restDaysInMonth?: number; // padrão 5 (domingos e feriados)
  dependentsCount?: number;
  bonusCents?: number;
  advancesCents?: number;
  absentDays?: number;
  transportVoucherCostCents?: number;
  mealVoucherCopayCents?: number;
  healthPlanCopayCents?: number;
  otherDeductionsCents?: number;
}

export interface PayrollCalculationResult {
  baseSalaryCents: number;
  grossSalaryCents: number;
  netSalaryCents: number;
  inssDiscountCents: number;
  irrfDiscountCents: number;
  fgtsProvisionCents: number;
  overtime50Cents: number;
  overtime100Cents: number;
  dsrOvertimeCents: number;
  totalOvertimeCents: number;
  nightDifferentialCents: number;
  absencesDeductionCents: number;
  transportVoucherDiscountCents: number;
  mealVoucherDiscountCents: number;
  healthPlanDiscountCents: number;
  advancesDiscountCents: number;
  otherDiscountsCents: number;
  bonusAdditionsCents: number;
  totalEarningsCents: number;
  totalDeductionsCents: number;
  salaryBreakdown: SalaryBreakdownItem[];
  bases: {
    baseINSSCents: number;
    baseFIBGTSCents: number;
    baseIRRFCents: number;
    aliquotINSSAverage: number;
    aliquotIRRFNominal: number;
  };
}

/**
 * Calcula o desconto progressivo de INSS conforme faixas oficiais de 2026.
 */
export function calculateINSS(grossSalaryCents: number): {
  inssCents: number;
  effectiveAliquot: number;
  breakdown: Array<{ faixa: number; aliquot: number; baseFaixaCents: number; discountCents: number }>;
} {
  if (grossSalaryCents <= 0) {
    return { inssCents: 0, effectiveAliquot: 0, breakdown: [] };
  }

  const calculationBase = Math.min(grossSalaryCents, INSS_CEILING_CENTS_2026);
  let totalINSSCents = 0;
  const breakdown: Array<{ faixa: number; aliquot: number; baseFaixaCents: number; discountCents: number }> = [];

  for (const bracket of INSS_BRACKETS_2026) {
    if (calculationBase > bracket.floorCents) {
      const taxableInBracket = Math.min(calculationBase, bracket.ceilingCents) - bracket.floorCents;
      const bracketDiscount = Math.round(taxableInBracket * bracket.aliquot);
      totalINSSCents += bracketDiscount;
      breakdown.push({
        faixa: bracket.faixa,
        aliquot: bracket.aliquot,
        baseFaixaCents: taxableInBracket,
        discountCents: bracketDiscount,
      });
    }
  }

  // Teto legal absoluto
  totalINSSCents = Math.min(totalINSSCents, INSS_MAX_DISCOUNT_CENTS_2026);
  const effectiveAliquot = grossSalaryCents > 0 ? (totalINSSCents / grossSalaryCents) * 100 : 0;

  return {
    inssCents: totalINSSCents,
    effectiveAliquot: Math.round(effectiveAliquot * 100) / 100,
    breakdown,
  };
}

/**
 * Calcula o Imposto de Renda Retido na Fonte (IRRF) conforme tabela progressiva oficial 2026.
 * Avalia se o desconto simplificado oficial é mais benéfico ao colaborador.
 */
export function calculateIRRF(
  grossTaxableCents: number,
  inssDiscountCents: number,
  dependentsCount = 0,
  otherLegalDeductionsCents = 0,
): {
  irrfCents: number;
  nominalAliquot: number;
  deductionParcelCents: number;
  usedSimplified: boolean;
  baseCalculoCents: number;
} {
  const dependentsDeduction = dependentsCount * IRRF_DEPENDENT_DEDUCTION_CENTS_2026;
  const legalDeductions = inssDiscountCents + dependentsDeduction + otherLegalDeductionsCents;
  const simplifiedDeduction = IRRF_SIMPLIFIED_DISCOUNT_CENTS_2026;

  // O trabalhador sempre tem direito à opção mais favorável (menor imposto)
  const useSimplified = simplifiedDeduction > legalDeductions;
  const effectiveDeduction = useSimplified ? simplifiedDeduction : legalDeductions;
  const baseCalculoCents = Math.max(0, grossTaxableCents - effectiveDeduction);

  let selectedBracket = IRRF_BRACKETS_2026[0];
  for (const bracket of IRRF_BRACKETS_2026) {
    if (baseCalculoCents > bracket.floorCents) {
      selectedBracket = bracket;
    }
  }

  if (selectedBracket.aliquot === 0) {
    return {
      irrfCents: 0,
      nominalAliquot: 0,
      deductionParcelCents: 0,
      usedSimplified: useSimplified,
      baseCalculoCents,
    };
  }

  const rawTax = Math.round(baseCalculoCents * selectedBracket.aliquot);
  const irrfCents = Math.max(0, rawTax - selectedBracket.deductionCents);

  return {
    irrfCents,
    nominalAliquot: selectedBracket.aliquot * 100,
    deductionParcelCents: selectedBracket.deductionCents,
    usedSimplified: useSimplified,
    baseCalculoCents,
  };
}

/**
 * Calcula provisão de FGTS (8% geral ou 2% para Aprendiz).
 * Não é descontado do salário líquido (obrigação patronal).
 */
export function calculateFGTS(grossRemunerationCents: number, isApprentice = false): number {
  if (grossRemunerationCents <= 0) return 0;
  const aliquot = isApprentice ? 0.02 : 0.08;
  return Math.round(grossRemunerationCents * aliquot);
}

/**
 * Calcula Horas Extras (50% e 100%) e reflexo no DSR (Descanso Semanal Remunerado).
 */
export function calculateOvertime(
  salaryBaseCents: number,
  monthlyHoursDivisor = 220,
  hours50 = 0,
  hours100 = 0,
  businessDays = 25,
  restDays = 5,
): {
  rateHourlyCents: number;
  overtime50Cents: number;
  overtime100Cents: number;
  dsrCents: number;
  totalOvertimeCents: number;
} {
  const divisor = monthlyHoursDivisor > 0 ? monthlyHoursDivisor : 220;
  const rateHourlyCents = Math.round(salaryBaseCents / divisor);

  const overtime50Cents = Math.round(rateHourlyCents * 1.5 * hours50);
  const overtime100Cents = Math.round(rateHourlyCents * 2.0 * hours100);

  const sumOvertime = overtime50Cents + overtime100Cents;
  const dsrCents = businessDays > 0 ? Math.round((sumOvertime / businessDays) * restDays) : 0;

  return {
    rateHourlyCents,
    overtime50Cents,
    overtime100Cents,
    dsrCents,
    totalOvertimeCents: sumOvertime + dsrCents,
  };
}

/**
 * Calcula Adicional Noturno (20% sobre hora normal e fator da hora reduzida 52,5min).
 */
export function calculateNightDifferential(
  salaryBaseCents: number,
  monthlyHoursDivisor = 220,
  nightHours = 0,
): {
  nightDiffCents: number;
  effectiveNightHours: number;
} {
  if (nightHours <= 0) return { nightDiffCents: 0, effectiveNightHours: 0 };
  const divisor = monthlyHoursDivisor > 0 ? monthlyHoursDivisor : 220;
  const rateHourlyCents = Math.round(salaryBaseCents / divisor);
  // Hora noturna CLT = 52 minutos e 30 segundos (fator 60 / 52.5 = 1.142857)
  const effectiveNightHours = Math.round(nightHours * (60 / 52.5) * 100) / 100;
  const nightDiffCents = Math.round(rateHourlyCents * 0.20 * effectiveNightHours);
  return { nightDiffCents, effectiveNightHours };
}

/**
 * Motor Central de Cálculo de Folha de Pagamento Completo (CLT e PJ).
 */
export function calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
  const isPJ = input.employmentType === "pj";
  const baseSalaryCents = Math.max(0, input.baseSalaryCents);

  if (isPJ) {
    const bonusCents = Math.max(0, input.bonusCents || 0);
    const advancesCents = Math.max(0, input.advancesCents || 0);
    const otherDiscountsCents = Math.max(0, input.otherDeductionsCents || 0);
    const grossSalaryCents = baseSalaryCents + bonusCents;
    const netSalaryCents = Math.max(0, grossSalaryCents - advancesCents - otherDiscountsCents);

    const salaryBreakdown: SalaryBreakdownItem[] = [
      { code: "001", description: "Honorários Prestação PJ", type: "earning", amount_cents: baseSalaryCents },
    ];
    if (bonusCents > 0) {
      salaryBreakdown.push({ code: "050", description: "Bônus / Meta PJ", type: "earning", amount_cents: bonusCents });
    }
    if (advancesCents > 0) {
      salaryBreakdown.push({ code: "150", description: "Adiantamento / Retirada PJ", type: "deduction", amount_cents: advancesCents });
    }
    if (otherDiscountsCents > 0) {
      salaryBreakdown.push({ code: "199", description: "Outros Descontos / Glosas", type: "deduction", amount_cents: otherDiscountsCents });
    }

    return {
      baseSalaryCents,
      grossSalaryCents,
      netSalaryCents,
      inssDiscountCents: 0,
      irrfDiscountCents: 0,
      fgtsProvisionCents: 0,
      overtime50Cents: 0,
      overtime100Cents: 0,
      dsrOvertimeCents: 0,
      totalOvertimeCents: 0,
      nightDifferentialCents: 0,
      absencesDeductionCents: 0,
      transportVoucherDiscountCents: 0,
      mealVoucherDiscountCents: 0,
      healthPlanDiscountCents: 0,
      advancesDiscountCents: advancesCents,
      otherDiscountsCents,
      bonusAdditionsCents: bonusCents,
      totalEarningsCents: grossSalaryCents,
      totalDeductionsCents: advancesCents + otherDiscountsCents,
      salaryBreakdown,
      bases: {
        baseINSSCents: 0,
        baseFIBGTSCents: 0,
        baseIRRFCents: 0,
        aliquotINSSAverage: 0,
        aliquotIRRFNominal: 0,
      },
    };
  }

  // --- CÁLCULO CLT COMPLETO ---
  const divisor = input.monthlyHoursDivisor || 220;
  const hours50 = input.hoursOvertime50 || 0;
  const hours100 = input.hoursOvertime100 || 0;
  const nightHours = input.nightHours || 0;
  const businessDays = input.businessDaysInMonth || 25;
  const restDays = input.restDaysInMonth || 5;

  // 1. Horas Extras e DSR
  const ot = calculateOvertime(baseSalaryCents, divisor, hours50, hours100, businessDays, restDays);

  // 2. Adicional Noturno
  const night = calculateNightDifferential(baseSalaryCents, divisor, nightHours);

  // 3. Faltas e DSR Perdido
  const absentDays = input.absentDays || 0;
  const dayRateCents = Math.round(baseSalaryCents / 30);
  const absencesDeductionCents = absentDays > 0 ? (dayRateCents * absentDays) + dayRateCents : 0; // falta + 1 DSR

  // 4. Bônus e Adicionais
  const bonusAdditionsCents = Math.max(0, input.bonusCents || 0);

  // 5. Total de Proventos Brutos Sujeitos a INSS/FGTS
  const grossSalaryCents = Math.max(
    0,
    baseSalaryCents + ot.totalOvertimeCents + night.nightDiffCents + bonusAdditionsCents - absencesDeductionCents,
  );

  // 6. INSS Progressivo 2026
  const inss = calculateINSS(grossSalaryCents);

  // 7. IRRF 2026
  const irrf = calculateIRRF(grossSalaryCents, inss.inssCents, input.dependentsCount || 0);

  // 8. FGTS Provisionado 8%
  const isApprentice = input.employmentType === "apprentice";
  const fgtsProvisionCents = calculateFGTS(grossSalaryCents, isApprentice);

  // 9. Benefícios e Descontos Voluntários/Legais
  // VT: máx 6% do salário base ou custo total fornecido
  const maxVT6Percent = Math.round(baseSalaryCents * 0.06);
  const transportVoucherDiscountCents = input.transportVoucherCostCents
    ? Math.min(maxVT6Percent, input.transportVoucherCostCents)
    : 0;

  const mealVoucherDiscountCents = Math.max(0, input.mealVoucherCopayCents || 0);
  const healthPlanDiscountCents = Math.max(0, input.healthPlanCopayCents || 0);
  const advancesDiscountCents = Math.max(0, input.advancesCents || 0);
  const otherDiscountsCents = Math.max(0, input.otherDeductionsCents || 0);

  // 10. Totais Consolidados
  const totalEarningsCents = baseSalaryCents + ot.totalOvertimeCents + night.nightDiffCents + bonusAdditionsCents;
  const totalDeductionsCents =
    inss.inssCents +
    irrf.irrfCents +
    absencesDeductionCents +
    transportVoucherDiscountCents +
    mealVoucherDiscountCents +
    healthPlanDiscountCents +
    advancesDiscountCents +
    otherDiscountsCents;

  const netSalaryCents = Math.max(0, totalEarningsCents - totalDeductionsCents);

  // 11. Montagem da Rubrica Contábil Canônica (Breakdown Oficial)
  const salaryBreakdown: SalaryBreakdownItem[] = [
    { code: "001", description: "Salário Base Mensal", reference: "30 dias", type: "earning", amount_cents: baseSalaryCents },
  ];

  if (ot.overtime50Cents > 0) {
    salaryBreakdown.push({
      code: "015",
      description: "Horas Extras 50%",
      reference: `${hours50}h`,
      type: "earning",
      amount_cents: ot.overtime50Cents,
    });
  }
  if (ot.overtime100Cents > 0) {
    salaryBreakdown.push({
      code: "016",
      description: "Horas Extras 100% (Dom/Fer)",
      reference: `${hours100}h`,
      type: "earning",
      amount_cents: ot.overtime100Cents,
    });
  }
  if (ot.dsrCents > 0) {
    salaryBreakdown.push({
      code: "020",
      description: "DSR sobre Horas Extras",
      reference: `${restDays}/${businessDays}d`,
      type: "earning",
      amount_cents: ot.dsrCents,
    });
  }
  if (night.nightDiffCents > 0) {
    salaryBreakdown.push({
      code: "030",
      description: "Adicional Noturno (20%)",
      reference: `${night.effectiveNightHours}h`,
      type: "earning",
      amount_cents: night.nightDiffCents,
    });
  }
  if (bonusAdditionsCents > 0) {
    salaryBreakdown.push({
      code: "050",
      description: "Bônus / Gratificação",
      reference: "",
      type: "earning",
      amount_cents: bonusAdditionsCents,
    });
  }

  // Descontos
  if (absencesDeductionCents > 0) {
    salaryBreakdown.push({
      code: "100",
      description: "Faltas e DSR Perdido",
      reference: `${absentDays}d`,
      type: "deduction",
      amount_cents: absencesDeductionCents,
    });
  }
  if (inss.inssCents > 0) {
    salaryBreakdown.push({
      code: "101",
      description: "INSS Oficial Previdência",
      reference: `${inss.effectiveAliquot}%`,
      type: "deduction",
      amount_cents: inss.inssCents,
    });
  }
  if (irrf.irrfCents > 0) {
    salaryBreakdown.push({
      code: "102",
      description: "IRRF Imposto de Renda",
      reference: `${irrf.nominalAliquot}%`,
      type: "deduction",
      amount_cents: irrf.irrfCents,
    });
  }
  if (transportVoucherDiscountCents > 0) {
    salaryBreakdown.push({
      code: "105",
      description: "Vale Transporte (VT)",
      reference: "até 6%",
      type: "deduction",
      amount_cents: transportVoucherDiscountCents,
    });
  }
  if (mealVoucherDiscountCents > 0) {
    salaryBreakdown.push({
      code: "106",
      description: "Vale Alimentação / Refeição",
      reference: "Copart.",
      type: "deduction",
      amount_cents: mealVoucherDiscountCents,
    });
  }
  if (healthPlanDiscountCents > 0) {
    salaryBreakdown.push({
      code: "110",
      description: "Assistência Médica / Odonto",
      reference: "Copart.",
      type: "deduction",
      amount_cents: healthPlanDiscountCents,
    });
  }
  if (advancesDiscountCents > 0) {
    salaryBreakdown.push({
      code: "150",
      description: "Adiantamento Salarial / Vales",
      reference: "",
      type: "deduction",
      amount_cents: advancesDiscountCents,
    });
  }
  if (otherDiscountsCents > 0) {
    salaryBreakdown.push({
      code: "199",
      description: "Outros Descontos Autorizados",
      reference: "",
      type: "deduction",
      amount_cents: otherDiscountsCents,
    });
  }

  // Informativo FGTS (neutral)
  salaryBreakdown.push({
    code: "900",
    description: "FGTS do Mês (Depósito Patronal 8%)",
    reference: "8%",
    type: "neutral",
    amount_cents: fgtsProvisionCents,
  });

  return {
    baseSalaryCents,
    grossSalaryCents,
    netSalaryCents,
    inssDiscountCents: inss.inssCents,
    irrfDiscountCents: irrf.irrfCents,
    fgtsProvisionCents,
    overtime50Cents: ot.overtime50Cents,
    overtime100Cents: ot.overtime100Cents,
    dsrOvertimeCents: ot.dsrCents,
    totalOvertimeCents: ot.totalOvertimeCents,
    nightDifferentialCents: night.nightDiffCents,
    absencesDeductionCents,
    transportVoucherDiscountCents,
    mealVoucherDiscountCents,
    healthPlanDiscountCents,
    advancesDiscountCents,
    otherDiscountsCents,
    bonusAdditionsCents,
    totalEarningsCents,
    totalDeductionsCents,
    salaryBreakdown,
    bases: {
      baseINSSCents: grossSalaryCents,
      baseFIBGTSCents: grossSalaryCents,
      baseIRRFCents: irrf.baseCalculoCents,
      aliquotINSSAverage: inss.effectiveAliquot,
      aliquotIRRFNominal: irrf.nominalAliquot,
    },
  };
}

/**
 * Cálculo de Rescisão Trabalhista CLT (Lei 12.506/2011).
 */
export function calculateTerminationSeverance(params: {
  baseSalaryCents: number;
  hireDate: string; // YYYY-MM-DD
  terminationDate: string; // YYYY-MM-DD
  terminationReason: "unjustified_dismissal" | "justified_dismissal" | "employee_resignation" | "mutual_agreement";
  noticeType: "worked" | "indemnified" | "dispensed";
  fgtsBalanceCents?: number;
}): {
  workedDaysPayCents: number;
  noticePeriodPayCents: number;
  thirteenthProportionalCents: number;
  vacationProportionalCents: number;
  vacationConstitutionalThirdCents: number;
  fgtsPenaltyCents: number;
  totalSeveranceGrossCents: number;
  noticeDays: number;
} {
  const { baseSalaryCents, hireDate, terminationDate, terminationReason, noticeType, fgtsBalanceCents = 0 } = params;

  const [hY, hM, hD] = hireDate.split("-").map(Number);
  const [tY, tM, tD] = terminationDate.split("-").map(Number);
  const hire = new Date(hY, (hM || 1) - 1, hD || 1);
  const term = new Date(tY, (tM || 1) - 1, tD || 1);
  const diffYears = Math.max(0, Math.floor((term.getTime() - hire.getTime()) / (365.25 * 24 * 3600 * 1000)));

  // Lei 12.506/11: 30 dias + 3 dias por ano completo trabalhado (até 90 dias)
  const noticeDays = Math.min(90, 30 + (diffYears * 3));
  const dayRateCents = Math.round(baseSalaryCents / 30);

  // 1. Saldo de salário dos dias trabalhados no mês de rescisão
  const terminationDay = tD || 1;
  const workedDaysPayCents = terminationDay * dayRateCents;

  // 2. Aviso Prévio
  let noticePeriodPayCents = 0;
  if (noticeType === "indemnified" && (terminationReason === "unjustified_dismissal" || terminationReason === "mutual_agreement")) {
    const factor = terminationReason === "mutual_agreement" ? 0.5 : 1.0;
    noticePeriodPayCents = Math.round(dayRateCents * noticeDays * factor);
  }

  // 3. 13º Salário Proporcional (avos no ano)
  const monthsWorkedInYear = term.getMonth() + (terminationDay >= 15 ? 1 : 0);
  let thirteenthProportionalCents = 0;
  if (terminationReason !== "justified_dismissal") {
    const factor = terminationReason === "mutual_agreement" ? 0.5 : 1.0;
    thirteenthProportionalCents = Math.round((baseSalaryCents / 12) * monthsWorkedInYear * factor);
  }

  // 4. Férias Proporcionais + 1/3
  let vacationProportionalCents = 0;
  let vacationConstitutionalThirdCents = 0;
  if (terminationReason !== "justified_dismissal") {
    vacationProportionalCents = Math.round((baseSalaryCents / 12) * monthsWorkedInYear);
    vacationConstitutionalThirdCents = Math.round(vacationProportionalCents / 3);
  }

  // 5. Multa Rescisória FGTS (40% demissão sem justa causa, 20% acordo mútuo)
  let fgtsPenaltyCents = 0;
  if (terminationReason === "unjustified_dismissal") {
    fgtsPenaltyCents = Math.round(fgtsBalanceCents * 0.40);
  } else if (terminationReason === "mutual_agreement") {
    fgtsPenaltyCents = Math.round(fgtsBalanceCents * 0.20);
  }

  const totalSeveranceGrossCents =
    workedDaysPayCents +
    noticePeriodPayCents +
    thirteenthProportionalCents +
    vacationProportionalCents +
    vacationConstitutionalThirdCents +
    fgtsPenaltyCents;

  return {
    workedDaysPayCents,
    noticePeriodPayCents,
    thirteenthProportionalCents,
    vacationProportionalCents,
    vacationConstitutionalThirdCents,
    fgtsPenaltyCents,
    totalSeveranceGrossCents,
    noticeDays,
  };
}

/**
 * Cálculo de Férias com Abono Pecuniário (Venda de 10 dias) e 1/3 Constitucional.
 */
export function calculateVacationPay(params: {
  baseSalaryCents: number;
  vacationDays: number; // 20 ou 30
  sellPecuniaryAllowanceDays?: number; // 0 ou 10
  advanceThirteenth?: boolean;
}): {
  vacationPayCents: number;
  constitutionalThirdCents: number;
  pecuniaryAllowancePayCents: number;
  pecuniaryThirdCents: number;
  advanceThirteenthCents: number;
  totalVacationGrossCents: number;
} {
  const { baseSalaryCents, vacationDays, sellPecuniaryAllowanceDays = 0, advanceThirteenth = false } = params;
  const dayRateCents = Math.round(baseSalaryCents / 30);

  // Férias gozadas
  const vacationPayCents = vacationDays * dayRateCents;
  const constitutionalThirdCents = Math.round(vacationPayCents / 3);

  // Abono pecuniário (venda permitida de até 10 dias de férias)
  const pecuniaryAllowancePayCents = sellPecuniaryAllowanceDays * dayRateCents;
  const pecuniaryThirdCents = sellPecuniaryAllowanceDays > 0 ? Math.round(pecuniaryAllowancePayCents / 3) : 0;

  // 1ª parcela do 13º salário (50% do salário) se solicitado
  const advanceThirteenthCents = advanceThirteenth ? Math.round(baseSalaryCents * 0.5) : 0;

  const totalVacationGrossCents =
    vacationPayCents +
    constitutionalThirdCents +
    pecuniaryAllowancePayCents +
    pecuniaryThirdCents +
    advanceThirteenthCents;

  return {
    vacationPayCents,
    constitutionalThirdCents,
    pecuniaryAllowancePayCents,
    pecuniaryThirdCents,
    advanceThirteenthCents,
    totalVacationGrossCents,
  };
}
