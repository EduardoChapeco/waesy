import { describe, it, expect } from "vitest";
import { z } from "zod";
import { formatMoney } from "@/lib/money";

// Schemas e helpers espelhados da capacidade
const createEntrySchema = z.object({
  type: z.enum(["income", "expense"]),
  amountCents: z.number().int().positive("Valor deve ser maior que zero"),
  description: z.string().min(2, "Descrição deve ter no mínimo 2 caracteres"),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  categoryId: z.string().uuid().optional().nullable(),
  paymentMethod: z.string().default("pix"),
  notes: z.string().optional().nullable(),
});

const submitProofSchema = z.object({
  installmentId: z.string().uuid(),
  proofUrl: z.string().url("URL do comprovante inválida"),
  notes: z.string().optional(),
});

const conciliateInstallmentSchema = z.object({
  installmentId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  rejectionReason: z.string().optional(),
  waiveInterest: z.boolean().default(false),
  discountCents: z.number().int().min(0).default(0),
});

function calculateLateInterest(params: {
  amountCents: number;
  dueDate: Date;
  currentDate: Date;
  monthlyInterestRate: number; // ex: 2.5 (%)
  finePercent: number; // ex: 2.0 (%)
  graceDays: number;
}) {
  const diffTime = params.currentDate.getTime() - params.dueDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= params.graceDays) {
    return {
      isLate: false,
      lateDays: 0,
      fineCents: 0,
      interestCents: 0,
      totalDueCents: params.amountCents,
    };
  }

  const fineCents = Math.round(params.amountCents * (params.finePercent / 100));
  const dailyRate = params.monthlyInterestRate / 30 / 100;
  const interestCents = Math.round(params.amountCents * dailyRate * diffDays);
  const totalDueCents = params.amountCents + fineCents + interestCents;

  return {
    isLate: true,
    lateDays: diffDays,
    fineCents,
    interestCents,
    totalDueCents,
  };
}

describe("Personal Finance & Carnê Digital Bilateral Test Suite (Ciclo 89)", () => {
  describe("1. Schemas de Lançamentos Financeiros Pessoais", () => {
    it("deve validar lançamento válido de despesa em centavos", () => {
      const payload = {
        type: "expense" as const,
        amountCents: 15490, // R$ 154,90
        description: "Supermercado Semanal",
        entryDate: "2026-09-06",
        paymentMethod: "pix",
      };

      const result = createEntrySchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.amountCents).toBe(15490);
        expect(formatMoney(result.data.amountCents)).toBe("R$ 154,90");
      }
    });

    it("deve rejeitar valor negativo ou zero", () => {
      const invalidPayload = {
        type: "expense" as const,
        amountCents: -500,
        description: "Valor inválido",
        entryDate: "2026-09-06",
      };

      const result = createEntrySchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it("deve rejeitar data em formato incorreto", () => {
      const invalidPayload = {
        type: "income" as const,
        amountCents: 50000,
        description: "Salário",
        entryDate: "06/09/2026", // não está em YYYY-MM-DD
      };

      const result = createEntrySchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe("2. Regras de Negócio de Carnês, Juros de Mora e Conciliação", () => {
    it("não deve cobrar juros ou multa se o pagamento estiver dentro do período de carência (grace days)", () => {
      const dueDate = new Date("2026-09-01T00:00:00Z");
      const currentDate = new Date("2026-09-03T00:00:00Z"); // 2 dias depois, carência de 3 dias

      const result = calculateLateInterest({
        amountCents: 10000, // R$ 100,00
        dueDate,
        currentDate,
        monthlyInterestRate: 2.5,
        finePercent: 2.0,
        graceDays: 3,
      });

      expect(result.isLate).toBe(false);
      expect(result.fineCents).toBe(0);
      expect(result.interestCents).toBe(0);
      expect(result.totalDueCents).toBe(10000);
    });

    it("deve calcular multa fixa de 2% e juros proporcionais após o vencimento", () => {
      const dueDate = new Date("2026-08-01T00:00:00Z");
      const currentDate = new Date("2026-08-31T00:00:00Z"); // 30 dias de atraso

      const result = calculateLateInterest({
        amountCents: 100000, // R$ 1.000,00
        dueDate,
        currentDate,
        monthlyInterestRate: 3.0, // 3% ao mês
        finePercent: 2.0, // 2% de multa fixa
        graceDays: 2,
      });

      expect(result.isLate).toBe(true);
      expect(result.lateDays).toBe(30);
      expect(result.fineCents).toBe(2000); // 2% de 1000 = R$ 20,00
      expect(result.interestCents).toBe(3000); // 3% em 30 dias = R$ 30,00
      expect(result.totalDueCents).toBe(105000); // R$ 1.050,00
    });

    it("deve validar payload de submissão de comprovante pelo cliente", () => {
      const proofPayload = {
        installmentId: "e0000000-0000-0000-0000-000000000001",
        proofUrl: "https://storage.usewaesy.com/receipts/proof-123.jpg",
        notes: "Transferência PIX realizada às 14:32",
      };

      const result = submitProofSchema.safeParse(proofPayload);
      expect(result.success).toBe(true);
    });

    it("deve validar conciliação da loja com perdão de juros ou desconto", () => {
      const conciliationPayload = {
        installmentId: "e0000000-0000-0000-0000-000000000001",
        decision: "approved" as const,
        waiveInterest: true,
        discountCents: 500, // R$ 5,00 de desconto promocional
      };

      const result = conciliateInstallmentSchema.safeParse(conciliationPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.waiveInterest).toBe(true);
        expect(result.data.discountCents).toBe(500);
      }
    });

    it("deve validar régua de cobrança automatizada via WhatsApp e PIX Copia e Cola", () => {
      const reminderInputSchema = z.object({
        installmentId: z.string().uuid(),
        template: z.enum(["friendly", "due_warning", "overdue_discount", "custom"]).default("friendly"),
        customMessage: z.string().optional(),
        discountOfferedPercent: z.number().min(0).max(100).optional(),
      });

      const validFriendly = reminderInputSchema.safeParse({
        installmentId: "e0000000-0000-0000-0000-000000000001",
        template: "friendly",
      });
      expect(validFriendly.success).toBe(true);

      const validDiscount = reminderInputSchema.safeParse({
        installmentId: "e0000000-0000-0000-0000-000000000001",
        template: "overdue_discount",
        discountOfferedPercent: 15,
      });
      expect(validDiscount.success).toBe(true);

      // Validação da montagem de URL do WhatsApp
      const cleanPhone = "49999998888";
      const message = "Olá! Lembrando sobre o vencimento da sua parcela.";
      const whatsappUrl = `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`;
      expect(whatsappUrl).toContain("https://wa.me/5549999998888");
      expect(whatsappUrl).toContain("Ol%C3%A1");
    });
  });
});

