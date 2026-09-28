import { describe, it, expect } from "vitest";
import { SaveDeliverySettingsSchema, CreateDispatchSchema, UpdateDispatchStatusSchema, GetDispatchByDealSchema } from "./company-delivery.functions";

describe("Company Delivery & Dispatch Contracts (BFF)", () => {
  it("valida schema de taxas de entrega com cálculo em centavos inteiros", () => {
    const validData = {
      storeId: "11111111-1111-4111-a111-111111111111",
      hasOwnCouriers: true,
      fixedDeliveryFeeCents: 1200, // R$ 12,00
      freeDeliveryAboveCents: 15000, // R$ 150,00
      neighborhoodsRates: [
        { neighborhood: "Centro", fee_cents: 800, active: true },
        { neighborhood: "Efapi", fee_cents: 1500, active: true },
      ],
      motoboyInstructions: "Tocar interfone 202 na chegada",
    };

    const parsed = SaveDeliverySettingsSchema.parse(validData);
    expect(parsed.fixedDeliveryFeeCents).toBe(1200);
    expect(parsed.neighborhoodsRates.length).toBe(2);
    expect(parsed.neighborhoodsRates[1].fee_cents).toBe(1500);
  });

  it("rejeita valores negativos em taxas de entrega", () => {
    const invalidData = {
      storeId: "11111111-1111-4111-a111-111111111111",
      fixedDeliveryFeeCents: -500,
    };

    expect(() => SaveDeliverySettingsSchema.parse(invalidData)).toThrow();
  });

  it("valida criação de despacho com todos os campos e formatação segura", () => {
    const dispatchPayload = {
      storeId: "11111111-1111-4111-a111-111111111111",
      customerName: "Ana Clara Silva",
      customerPhone: "49999887766",
      deliveryAddress: "Av. Getúlio Vargas, 1000 - Centro",
      deliveryNeighborhood: "Centro",
      deliveryCity: "Chapecó",
      deliveryFeeCents: 1000,
      orderAmountCents: 18000,
      paymentMethod: "pix",
      notes: "Cuidado com o cão no portão",
    };

    const parsed = CreateDispatchSchema.parse(dispatchPayload);
    expect(parsed.customerName).toBe("Ana Clara Silva");
    expect(parsed.deliveryFeeCents).toBe(1000);
    expect(parsed.orderAmountCents).toBe(18000);
    expect(parsed.deliveryCity).toBe("Chapecó");
  });

  it("rejeita despacho com nome ou endereço de cliente vazios", () => {
    const invalid = {
      customerName: "A", // Menos de 2 caracteres
      customerPhone: "49999887766",
      deliveryAddress: "",
    };

    expect(() => CreateDispatchSchema.parse(invalid)).toThrow();
  });

  it("valida atualização de status de entrega com enum estrito e comprovante", () => {
    const validUpdate = {
      token: "disp_12345678_abcdef",
      status: "delivered",
      proofPhotoUrl: "https://storage.usewaesy.com/proof.jpg",
      confirmationPin: "4521",
    };

    const parsed = UpdateDispatchStatusSchema.parse(validUpdate);
    expect(parsed.status).toBe("delivered");
    expect(parsed.confirmationPin).toBe("4521");
  });

  it("valida contrato de busca de despacho por dealId com UUID estrito", () => {
    const valid = GetDispatchByDealSchema.safeParse({
      dealId: "11111111-1111-4111-a111-111111111111",
    });
    expect(valid.success).toBe(true);

    const invalid = GetDispatchByDealSchema.safeParse({
      dealId: "not-a-uuid",
    });
    expect(invalid.success).toBe(false);
  });
});
