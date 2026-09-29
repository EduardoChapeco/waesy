import { describe, it, expect } from "vitest";
import { createAppointmentSchema } from "./booking.functions";
import { calculateOrderFinancialSplit } from "./order.functions";

describe("Booking Multi-Resource Allocation & Order Financial Split Engine", () => {
  it("valida schema de agendamento com resource_id e campos canônicos", () => {
    const raw = {
      service_id: "a0000000-0000-0000-0000-000000000001",
      guest_name: "Carlos Silveira",
      guest_phone: "(49) 99123-4567",
      scheduled_at: "2026-10-15T14:00:00.000Z",
      notes: "Corte degradê navalhado",
      resource_id: "b0000000-0000-0000-0000-000000000002",
    };

    const parsed = createAppointmentSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.resource_id).toBe("b0000000-0000-0000-0000-000000000002");
      expect(parsed.data.guest_name).toBe("Carlos Silveira");
    }
  });

  it("permite agendamento sem resource_id para alocação flexível", () => {
    const raw = {
      service_id: "a0000000-0000-0000-0000-000000000001",
      guest_name: "Mariana Souza",
      guest_phone: "(49) 99876-5432",
      scheduled_at: "2026-10-15T15:30:00.000Z",
    };

    const parsed = createAppointmentSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.resource_id).toBeUndefined();
    }
  });

  it("rejeita agendamento com nome ou telefone inválidos", () => {
    const raw = {
      service_id: "a0000000-0000-0000-0000-000000000001",
      guest_name: "A", // Min 2 caracteres
      guest_phone: "123", // Min 10 dígitos
      scheduled_at: "2026-10-15T15:30:00.000Z",
    };

    const parsed = createAppointmentSchema.safeParse(raw);
    expect(parsed.success).toBe(false);
  });

  it("calcula split financeiro multi-seller em integer cents com comissão padrão da plataforma (5%)", () => {
    const order = {
      subtotal_cents: 10000, // R$ 100,00 de produtos
      shipping_cents: 1500, // R$ 15,00 de frete
      total_cents: 11500, // R$ 115,00 total
    };

    const split = calculateOrderFinancialSplit(order, 5);

    // Comissão da plataforma: 5% de R$ 100,00 = R$ 5,00 (500 centavos)
    expect(split.platform_fee_cents).toBe(500);
    expect(split.platform_fee_percent).toBe(5);

    // Taxa de gateway estimada: 2% do total (R$ 115,00) = R$ 2,30 (230 centavos)
    expect(split.gateway_fee_cents).toBe(230);

    // Repasse líquido do seller: R$ 115,00 - R$ 5,00 - R$ 2,30 = R$ 107,70 (10770 centavos)
    expect(split.seller_net_cents).toBe(10770);
    expect(split.settlement_status).toBe("pending");
    expect(split.subtotal_cents).toBe(10000);
    expect(split.shipping_cents).toBe(1500);
  });

  it("calcula split com alíquota personalizada de comissão e garante não oneração do frete", () => {
    const order = {
      subtotal_cents: 25000, // R$ 250,00
      shipping_cents: 3000, // R$ 30,00
      total_cents: 28000, // R$ 280,00
    };

    // Alíquota de 10% de comissão
    const split = calculateOrderFinancialSplit(order, 10);

    // 10% de 25000 = 2500 centavos (R$ 25,00)
    expect(split.platform_fee_cents).toBe(2500);
    // 2% de 28000 = 560 centavos
    expect(split.gateway_fee_cents).toBe(560);
    // Seller net = 28000 - 2500 - 560 = 24940 centavos
    expect(split.seller_net_cents).toBe(24940);
  });
});
