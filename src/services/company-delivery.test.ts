import { describe, it, expect } from "vitest";
import {
  SaveDeliverySettingsSchema,
  CreateDispatchSchema,
  UpdateDispatchStatusSchema,
  GetDispatchByDealSchema,
  GetDispatchByOrderSchema,
  CalculateDeliveryFeeSchema,
} from "./company-delivery.functions";

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

  describe("Invariante B.25 — Coalescência Defensiva e Branches Presentes/Ausentes", () => {
    it("valida SaveDeliverySettingsSchema com parâmetros ausentes atribuindo defaults seguros", () => {
      const minimal = SaveDeliverySettingsSchema.parse({});
      expect(minimal.hasOwnCouriers).toBe(false);
      expect(minimal.fixedDeliveryFeeCents).toBe(0);
      expect(minimal.freeDeliveryAboveCents).toBeUndefined();
      expect(minimal.neighborhoodsRates).toEqual([]);
      expect(minimal.motoboyInstructions).toBeUndefined();
      expect(minimal.storeId).toBeUndefined();
    });

    it("valida CreateDispatchSchema com parâmetros opcionais ausentes/nulos", () => {
      const minimal = CreateDispatchSchema.parse({
        customerName: "Carlos Pereira",
        customerPhone: "49988776655",
        deliveryAddress: "Rua Uruguai, 500",
      });
      expect(minimal.customerName).toBe("Carlos Pereira");
      expect(minimal.deliveryFeeCents).toBe(0);
      expect(minimal.orderAmountCents).toBe(0);
      expect(minimal.dealId).toBeUndefined();
      expect(minimal.orderId).toBeUndefined();
      expect(minimal.classifiedId).toBeUndefined();
      expect(minimal.courierId).toBeUndefined();
      expect(minimal.notes).toBeUndefined();
      expect(minimal.deliveryNeighborhood).toBeUndefined();
    });

    it("valida UpdateDispatchStatusSchema sem comprovante e sem PIN opcionais", () => {
      const minimal = UpdateDispatchStatusSchema.parse({
        token: "token_12345",
        status: "accepted",
      });
      expect(minimal.token).toBe("token_12345");
      expect(minimal.status).toBe("accepted");
      expect(minimal.proofPhotoUrl).toBeUndefined();
      expect(minimal.confirmationPin).toBeUndefined();
      expect(minimal.notes).toBeUndefined();
    });

    it("valida GetDispatchByOrderSchema com UUID estrito válido e rejeita inválido", () => {
      const valid = GetDispatchByOrderSchema.safeParse({
        orderId: "22222222-2222-4222-a222-222222222222",
      });
      expect(valid.success).toBe(true);

      const invalid = GetDispatchByOrderSchema.safeParse({
        orderId: "invalid-id",
      });
      expect(invalid.success).toBe(false);
    });

    it("valida CalculateDeliveryFeeSchema com parâmetros presentes e ausentes", () => {
      const minimal = CalculateDeliveryFeeSchema.parse({
        storeId: "33333333-3333-4333-a333-333333333333",
      });
      expect(minimal.subtotalCents).toBe(0);
      expect(minimal.deliveryMode).toBe("delivery");
      expect(minimal.neighborhood).toBeUndefined();
      expect(minimal.classifiedId).toBeUndefined();

      const full = CalculateDeliveryFeeSchema.parse({
        storeId: "33333333-3333-4333-a333-333333333333",
        subtotalCents: 5000,
        deliveryMode: "pickup",
        neighborhood: "Efapi",
        classifiedId: "44444444-4444-4444-a444-444444444444",
      });
      expect(full.subtotalCents).toBe(5000);
      expect(full.deliveryMode).toBe("pickup");
      expect(full.neighborhood).toBe("Efapi");
      expect(full.classifiedId).toBe("44444444-4444-4444-a444-444444444444");
    });
  });
});
