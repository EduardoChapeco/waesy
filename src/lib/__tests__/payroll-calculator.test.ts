import { describe, it, expect } from "vitest";
import {
  calculateINSS,
  calculateIRRF,
  calculateFGTS,
  calculateOvertime,
  calculateNightDifferential,
  calculatePayroll,
  calculateTerminationSeverance,
  calculateVacationPay,
  INSS_MAX_DISCOUNT_CENTS_2026,
} from "../payroll-calculator";

describe("Motor Contábil de Folha de Pagamento Brasileira (CLT / PJ)", () => {
  describe("Tabela Progressiva de INSS 2026", () => {
    it("deve calcular alíquota de 7.5% para salário mínimo (R$ 1.518,00)", () => {
      const res = calculateINSS(151800);
      // 151800 * 0.075 = 11385 centavos (R$ 113,85)
      expect(res.inssCents).toBe(11385);
      expect(res.breakdown).toHaveLength(1);
    });

    it("deve calcular progressivamente para salário de R$ 3.000,00", () => {
      const res = calculateINSS(300000);
      // Faixa 1: 151800 * 0.075 = 11385
      // Faixa 2: (279388 - 151800) * 0.09 = 127588 * 0.09 = 11483
      // Faixa 3: (300000 - 279388) * 0.12 = 20612 * 0.12 = 2473
      // Total esperado: 11385 + 11483 + 2473 = 25341 (R$ 253,41)
      expect(res.inssCents).toBe(25341);
      expect(res.breakdown).toHaveLength(3);
    });

    it("deve respeitar o teto máximo de INSS 2026 (R$ 951,62)", () => {
      const res = calculateINSS(1500000); // R$ 15.000,00
      expect(res.inssCents).toBe(INSS_MAX_DISCOUNT_CENTS_2026);
    });

    it("retorna 0 para salários nulos ou negativos", () => {
      expect(calculateINSS(0).inssCents).toBe(0);
      expect(calculateINSS(-1000).inssCents).toBe(0);
    });
  });

  describe("Tabela Progressiva de IRRF 2026", () => {
    it("deve isentar salários dentro da faixa de isenção", () => {
      const res = calculateIRRF(220000, 16500, 0);
      expect(res.irrfCents).toBe(0);
    });

    it("deve aplicar dedução simplificada quando mais vantajosa que deduções legais", () => {
      const res = calculateIRRF(350000, 28000, 0);
      expect(res.usedSimplified).toBe(true);
      expect(res.irrfCents).toBeGreaterThan(0);
    });

    it("deve considerar deduções por dependente legal", () => {
      const semDep = calculateIRRF(600000, 70000, 0);
      const comDoisDep = calculateIRRF(600000, 70000, 2);
      expect(comDoisDep.irrfCents).toBeLessThan(semDep.irrfCents);
    });
  });

  describe("Provisão de FGTS", () => {
    it("deve calcular 8% sobre a remuneração bruta para empregados padrão", () => {
      expect(calculateFGTS(300000)).toBe(24000); // R$ 240,00
    });

    it("deve calcular 2% sobre a remuneração para jovem aprendiz", () => {
      expect(calculateFGTS(151800, true)).toBe(3036); // R$ 30,36
    });
  });

  describe("Horas Extras e DSR", () => {
    it("deve calcular hora extra 50% e 100% com DSR reflexo", () => {
      const res = calculateOvertime(220000, 220, 10, 5, 25, 5);
      // Valor hora = 220000 / 220 = 1000 centavos (R$ 10,00/h)
      // HE 50%: 1000 * 1.5 * 10 = 15000 centavos
      // HE 100%: 1000 * 2.0 * 5 = 10000 centavos
      // Soma HE = 25000
      // DSR = (25000 / 25) * 5 = 5000 centavos
      expect(res.rateHourlyCents).toBe(1000);
      expect(res.overtime50Cents).toBe(15000);
      expect(res.overtime100Cents).toBe(10000);
      expect(res.dsrCents).toBe(5000);
      expect(res.totalOvertimeCents).toBe(30000);
    });
  });

  describe("Adicional Noturno", () => {
    it("deve calcular adicional noturno considerando a hora reduzida de 52m30s", () => {
      const res = calculateNightDifferential(220000, 220, 7);
      expect(res.effectiveNightHours).toBe(8); // 7 * (60 / 52.5) = 8 horas noturnas
      // 1000 centavos * 0.20 * 8 = 1600 centavos (R$ 16,00)
      expect(res.nightDiffCents).toBe(1600);
    });
  });

  describe("Cálculo Integral de Folha de Pagamento (calculatePayroll)", () => {
    it("calcula folha PJ sem encargos previdenciários CLT", () => {
      const res = calculatePayroll({
        baseSalaryCents: 500000,
        employmentType: "pj",
        bonusCents: 50000,
        advancesCents: 100000,
      });

      expect(res.grossSalaryCents).toBe(550000);
      expect(res.netSalaryCents).toBe(450000);
      expect(res.inssDiscountCents).toBe(0);
      expect(res.irrfDiscountCents).toBe(0);
      expect(res.fgtsProvisionCents).toBe(0);
    });

    it("calcula folha CLT completa com breakdown estruturado e rubricas oficiais", () => {
      const res = calculatePayroll({
        baseSalaryCents: 300000,
        employmentType: "clt",
        hoursOvertime50: 10,
        transportVoucherCostCents: 15000, // Custo VT menor que 6% (R$ 180,00)
        mealVoucherCopayCents: 5000,
        advancesCents: 40000,
      });

      expect(res.baseSalaryCents).toBe(300000);
      expect(res.grossSalaryCents).toBeGreaterThan(300000);
      expect(res.inssDiscountCents).toBeGreaterThan(0);
      expect(res.fgtsProvisionCents).toBeGreaterThan(0);
      expect(res.transportVoucherDiscountCents).toBe(15000);
      expect(res.mealVoucherDiscountCents).toBe(5000);
      expect(res.advancesDiscountCents).toBe(40000);
      expect(res.netSalaryCents).toBe(res.totalEarningsCents - res.totalDeductionsCents);

      // Rubricas oficiais devem estar no breakdown
      const codes = res.salaryBreakdown.map((i) => i.code);
      expect(codes).toContain("001"); // Salário Base
      expect(codes).toContain("015"); // HE 50%
      expect(codes).toContain("101"); // INSS
      expect(codes).toContain("105"); // VT
      expect(codes).toContain("106"); // VR
      expect(codes).toContain("150"); // Adiantamento
      expect(codes).toContain("900"); // FGTS
    });
  });

  describe("Cálculo de Rescisão Trabalhista CLT", () => {
    it("deve calcular saldo de salário, aviso prévio proporcional e multa de 40% do FGTS", () => {
      const res = calculateTerminationSeverance({
        baseSalaryCents: 300000,
        hireDate: "2024-01-01",
        terminationDate: "2026-06-15",
        terminationReason: "unjustified_dismissal",
        noticeType: "indemnified",
        fgtsBalanceCents: 500000,
      });

      // 2 anos trabalhados = 30 + 6 = 36 dias de aviso
      expect(res.noticeDays).toBe(36);
      expect(res.workedDaysPayCents).toBe(150000); // 15 dias de salário
      expect(res.noticePeriodPayCents).toBe(360000); // 36 dias de aviso
      expect(res.fgtsPenaltyCents).toBe(200000); // 40% de 500000
      expect(res.totalSeveranceGrossCents).toBeGreaterThan(0);
    });
  });

  describe("Cálculo de Férias e Abono Pecuniário", () => {
    it("deve calcular 30 dias de férias com 1/3 constitucional e abono de 10 dias", () => {
      const res = calculateVacationPay({
        baseSalaryCents: 300000,
        vacationDays: 20,
        sellPecuniaryAllowanceDays: 10,
        advanceThirteenth: true,
      });

      expect(res.vacationPayCents).toBe(200000); // 20 dias gozados
      expect(res.constitutionalThirdCents).toBe(66667); // 1/3 de 200000
      expect(res.pecuniaryAllowancePayCents).toBe(100000); // 10 dias vendidos
      expect(res.pecuniaryThirdCents).toBe(33333); // 1/3 de 100000
      expect(res.advanceThirteenthCents).toBe(150000); // 50% adiantamento 13º
      expect(res.totalVacationGrossCents).toBe(550000);
    });
  });
});
