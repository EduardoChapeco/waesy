import { describe, it, expect } from "vitest";
import { saveStoreSettingsSchema } from "../store.functions";
import { CheckoutSchema } from "../checkout.functions";

describe("GAP-06 & GAP-08: Coordinates and Delivery Telemetry Regression Suite", () => {
  it("GAP-08: saveStoreSettingsSchema accepts numeric latitude and longitude", () => {
    const payload = {
      name: "Loja Teste",
      segment: "food",
      latitude: -26.723456,
      longitude: -53.518123,
    };
    const parsed = saveStoreSettingsSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.latitude).toBe(-26.723456);
      expect(parsed.data.longitude).toBe(-53.518123);
    }
  });

  it("GAP-08: saveStoreSettingsSchema allows null and undefined for coordinates", () => {
    const nullPayload = { name: "Loja Teste", latitude: null, longitude: null };
    const undefinedPayload = { name: "Loja Teste" };
    expect(saveStoreSettingsSchema.safeParse(nullPayload).success).toBe(true);
    expect(saveStoreSettingsSchema.safeParse(undefinedPayload).success).toBe(true);
  });

  it("GAP-06: processCheckoutSchema accepts shippingAddress with GPS latitude and longitude", () => {
    const payload = {
      cartId: "11111111-1111-1111-1111-111111111111",
      customerName: "Viajante Teste",
      customerEmail: "cliente@teste.com",
      customerPhone: "(49) 99999-9999",
      shippingMethod: "manual_table" as const,
      paymentMethod: "pix" as const,
      shippingAddress: {
        zipcode: "89900000",
        street: "Rua Duque de Caxias",
        number: "100",
        neighborhood: "Centro",
        city: "São Miguel do Oeste",
        state: "SC",
        latitude: -26.723456,
        longitude: -53.518123,
      },
    };
    const parsed = CheckoutSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      const addr = parsed.data.shippingAddress as Record<string, any>;
      expect(addr.latitude).toBe(-26.723456);
      expect(addr.longitude).toBe(-53.518123);
    }
  });
});
