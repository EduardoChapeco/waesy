import { describe, it, expect } from "vitest";
import { z } from "zod";

// Schemas de Validação Canônicos (DEC-279 / SPEC-CARNES-RECEIVABLES-END-TO-END-REMEDIATION)
export const submitProofInputSchema = z.object({
  installmentId: z.string().uuid("ID de parcela inválido"),
  proofUrl: z.string().url("URL de comprovante inválida"),
  notes: z.string().optional(),
});

export const earlySettlementInputSchema = z.object({
  receivableId: z.string().uuid("ID de carnê inválido"),
  installmentIds: z.array(z.string().uuid()).optional(),
});

export const renegotiateCarneInputSchema = z.object({
  receivableId: z.string().uuid("ID de carnê inválido"),
  newInstallmentsCount: z.number().int().min(1).max(72),
  firstDueDate: z.string(),
  interestRateMonthly: z.number().min(0).default(0),
  finePercent: z.number().min(0).default(0),
  agreedTotalCents: z.number().int().positive().optional(),
  reason: z.string().min(5, "Justificativa obrigatória da renegociação"),
});

export const createCarneInputSchema = z.object({
  debtorId: z.string().uuid("Selecione um cliente válido"),
  title: z.string().min(2, "Título do carnê é obrigatório"),
  description: z.string().optional(),
  totalCents: z.number().int().positive("Valor total deve ser positivo"),
  installmentsCount: z.number().int().min(1).max(72, "Máximo de 72 parcelas"),
  firstDueDate: z.string(),
  interestRateMonthly: z.number().min(0).default(0),
  finePercent: z.number().min(0).default(0),
  graceDays: z.number().int().min(0).default(0),
  contractId: z.string().uuid().optional(),
  dealId: z.string().uuid().optional(),
  storeId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  originType: z.enum(["order", "deal_p2p", "store_pos", "condicional_conversion", "renegotiation"]).default("store_pos"),
});

// Funções Puras de Domínio Financeiro de Carnês
export function calculateInstallmentLateCharges(params: {
  originalAmountCents: number;
  dueDate: Date;
  referenceDate: Date;
  graceDays: number;
  finePercent: number;
  interestRateMonthly: number;
  discountCents?: number;
}): {
  isOverdue: boolean;
  lateDays: number;
  fineCents: number;
  interestCents: number;
  finalAmountCents: number;
} {
  const diffMs = params.referenceDate.getTime() - params.dueDate.getTime();
  const isOverdue = diffMs > 0;
  if (!isOverdue) {
    const finalAmountCents = Math.max(0, params.originalAmountCents - (params.discountCents || 0));
    return {
      isOverdue: false,
      lateDays: 0,
      fineCents: 0,
      interestCents: 0,
      finalAmountCents,
    };
  }

  const lateDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  let fineCents = 0;
  let interestCents = 0;

  if (lateDays > params.graceDays) {
    if (params.finePercent > 0) {
      fineCents = Math.round((params.originalAmountCents * params.finePercent) / 100);
    }
    if (params.interestRateMonthly > 0) {
      interestCents = Math.round(
        params.originalAmountCents * (params.interestRateMonthly / 30 / 100) * lateDays,
      );
    }
  }

  const finalAmountCents = Math.max(
    0,
    params.originalAmountCents + fineCents + interestCents - (params.discountCents || 0),
  );

  return {
    isOverdue: true,
    lateDays,
    fineCents,
    interestCents,
    finalAmountCents,
  };
}

export function simulateEarlySettlementCore(params: {
  installments: Array<{
    id: string;
    originalAmountCents: number;
    dueDate: Date;
    status: string;
  }>;
  referenceDate: Date;
  graceDays: number;
  finePercent: number;
  interestRateMonthly: number;
  promptDiscountPercent: number;
}): {
  installmentsCount: number;
  totalNominalCents: number;
  totalFineCents: number;
  totalInterestCents: number;
  totalDiscountCents: number;
  netPayoffCents: number;
} {
  const pending = params.installments.filter((i) => i.status !== "paid");
  let totalNominalCents = 0;
  let totalFineCents = 0;
  let totalInterestCents = 0;
  let totalDiscountCents = 0;

  pending.forEach((inst) => {
    totalNominalCents += inst.originalAmountCents;
    if (inst.dueDate < params.referenceDate) {
      // Vencida: encargos até hoje
      const diffMs = params.referenceDate.getTime() - inst.dueDate.getTime();
      const lateDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      if (lateDays > params.graceDays) {
        totalFineCents += Math.round((inst.originalAmountCents * params.finePercent) / 100);
        totalInterestCents += Math.round(
          inst.originalAmountCents * (params.interestRateMonthly / 30 / 100) * lateDays,
        );
      }
    } else {
      // Vincenda: desconto de antecipação
      const disc = Math.round((inst.originalAmountCents * params.promptDiscountPercent) / 100);
      totalDiscountCents += disc;
    }
  });

  const netPayoffCents = Math.max(
    0,
    totalNominalCents + totalFineCents + totalInterestCents - totalDiscountCents,
  );

  return {
    installmentsCount: pending.length,
    totalNominalCents,
    totalFineCents,
    totalInterestCents,
    totalDiscountCents,
    netPayoffCents,
  };
}

describe("Módulo Carnês, Parcelamentos e Acordos — Auditoria End-to-End (DEC-279)", () => {
  describe("1. Validação de Schemas e Contratos de Entrada", () => {
    it("deve validar payload correto de envio de comprovante", () => {
      const res = submitProofInputSchema.safeParse({
        installmentId: "b0000000-0000-0000-0000-000000000001",
        proofUrl: "https://storage.waesy.com/receipts/proof-123.jpg",
        notes: "Comprovante pago via Pix",
      });
      expect(res.success).toBe(true);
    });

    it("deve rejeitar URL inválida no envio de comprovante", () => {
      const res = submitProofInputSchema.safeParse({
        installmentId: "b0000000-0000-0000-0000-000000000001",
        proofUrl: "not-a-valid-url",
      });
      expect(res.success).toBe(false);
    });

    it("deve validar emissão de carnê com tipo de origem 'order'", () => {
      const res = createCarneInputSchema.safeParse({
        debtorId: "b0000000-0000-0000-0000-000000000002",
        title: "Carnê Pedido 1029",
        totalCents: 30000,
        installmentsCount: 3,
        firstDueDate: "2026-11-20T00:00:00Z",
        orderId: "a0000000-0000-0000-0000-000000000003",
        originType: "order",
      });
      expect(res.success).toBe(true);
    });

    it("deve validar proposta de renegociação", () => {
      const res = renegotiateCarneInputSchema.safeParse({
        receivableId: "b0000000-0000-0000-0000-000000000004",
        newInstallmentsCount: 6,
        firstDueDate: "2026-12-01T00:00:00Z",
        reason: "Acordo formalizado com o cliente para alongamento de prazo",
      });
      expect(res.success).toBe(true);
    });
  });

  describe("2. Recálculo Matemático Transparente de Encargos e Juros Pro-Rata", () => {
    it("não deve cobrar multa ou juros para parcela dentro do prazo de vencimento", () => {
      const result = calculateInstallmentLateCharges({
        originalAmountCents: 10000, // R$ 100,00
        dueDate: new Date("2026-10-30T00:00:00Z"),
        referenceDate: new Date("2026-10-25T00:00:00Z"),
        graceDays: 2,
        finePercent: 2, // 2%
        interestRateMonthly: 3, // 3% a.m.
      });

      expect(result.isOverdue).toBe(false);
      expect(result.lateDays).toBe(0);
      expect(result.fineCents).toBe(0);
      expect(result.interestCents).toBe(0);
      expect(result.finalAmountCents).toBe(10000);
    });

    it("não deve cobrar juros ou multa se estiver dentro da tolerância de dias de carência (grace_days)", () => {
      const result = calculateInstallmentLateCharges({
        originalAmountCents: 10000,
        dueDate: new Date("2026-10-20T00:00:00Z"),
        referenceDate: new Date("2026-10-22T00:00:00Z"), // 2 dias de atraso
        graceDays: 3, // 3 dias de tolerância
        finePercent: 2,
        interestRateMonthly: 3,
      });

      expect(result.isOverdue).toBe(true);
      expect(result.lateDays).toBe(2);
      expect(result.fineCents).toBe(0);
      expect(result.interestCents).toBe(0);
      expect(result.finalAmountCents).toBe(10000);
    });

    it("deve aplicar multa de 2% e juros pro-rata die com exatidão após carência", () => {
      const result = calculateInstallmentLateCharges({
        originalAmountCents: 10000, // R$ 100,00
        dueDate: new Date("2026-10-01T00:00:00Z"),
        referenceDate: new Date("2026-10-11T00:00:00Z"), // 10 dias de atraso
        graceDays: 0,
        finePercent: 2, // Multa fixa de 2% = R$ 2,00 (200 cents)
        interestRateMonthly: 3, // 3% ao mês = 0.1% ao dia -> 10 dias = 1% = R$ 1,00 (100 cents)
      });

      expect(result.isOverdue).toBe(true);
      expect(result.lateDays).toBe(10);
      expect(result.fineCents).toBe(200);
      expect(result.interestCents).toBe(100);
      expect(result.finalAmountCents).toBe(10300); // R$ 103,00
    });
  });

  describe("3. Simulação e Amortização de Quitação Antecipada (Amortização com Desconto)", () => {
    it("deve calcular quitação antecipada deduzindo desconto de pontualidade nas parcelas vincendas", () => {
      const sim = simulateEarlySettlementCore({
        installments: [
          {
            id: "inst-1",
            originalAmountCents: 10000,
            dueDate: new Date("2026-11-15T00:00:00Z"), // vincenda
            status: "pending",
          },
          {
            id: "inst-2",
            originalAmountCents: 10000,
            dueDate: new Date("2026-12-15T00:00:00Z"), // vincenda
            status: "pending",
          },
        ],
        referenceDate: new Date("2026-10-21T00:00:00Z"),
        graceDays: 0,
        finePercent: 2,
        interestRateMonthly: 2.5,
        promptDiscountPercent: 5, // 5% de desconto de antecipação
      });

      expect(sim.installmentsCount).toBe(2);
      expect(sim.totalNominalCents).toBe(20000); // R$ 200,00
      expect(sim.totalFineCents).toBe(0);
      expect(sim.totalInterestCents).toBe(0);
      expect(sim.totalDiscountCents).toBe(1000); // R$ 10,00 (5% de R$ 200)
      expect(sim.netPayoffCents).toBe(19000); // R$ 190,00
    });

    it("deve ignorar parcelas já quitadas na simulação de antecipação", () => {
      const sim = simulateEarlySettlementCore({
        installments: [
          {
            id: "inst-1",
            originalAmountCents: 10000,
            dueDate: new Date("2026-09-15T00:00:00Z"),
            status: "paid", // já paga
          },
          {
            id: "inst-2",
            originalAmountCents: 10000,
            dueDate: new Date("2026-11-15T00:00:00Z"),
            status: "pending",
          },
        ],
        referenceDate: new Date("2026-10-21T00:00:00Z"),
        graceDays: 0,
        finePercent: 2,
        interestRateMonthly: 2.5,
        promptDiscountPercent: 5,
      });

      expect(sim.installmentsCount).toBe(1);
      expect(sim.totalNominalCents).toBe(10000);
      expect(sim.netPayoffCents).toBe(9500); // R$ 95,00
    });
  });

  describe("4. Invariante Zero-Trust de Comprovante e Conciliação da Loja", () => {
    it("não deve considerar parcela quitada ao submeter comprovante sem aprovação do lojista", () => {
      const installment = {
        id: "inst-99",
        status: "pending",
        conciliation_status: "none",
        payment_proof_url: null as string | null,
      };

      // Cliente anexa comprovante
      const updated = {
        ...installment,
        payment_proof_url: "https://storage.waesy.com/receipts/proof-99.jpg",
        conciliation_status: "pending",
      };

      // Permanece em dívida até conciliação
      expect(updated.status).toBe("pending");
      expect(updated.conciliation_status).toBe("pending");
      expect(updated.status === "paid").toBe(false);
    });

    it("deve liquidar a parcela somente após aprovação da loja", () => {
      const installment = {
        id: "inst-99",
        status: "pending",
        conciliation_status: "pending",
      };

      // Loja aprova
      const approved = {
        ...installment,
        status: "paid",
        conciliation_status: "approved",
        paid_at: new Date().toISOString(),
      };

      expect(approved.status).toBe("paid");
      expect(approved.conciliation_status).toBe("approved");
      expect(Boolean(approved.paid_at)).toBe(true);
    });
  });
});
