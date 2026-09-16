import { describe, it, expect, vi } from "vitest";

const mockActiveCoupon = {
  id: "coupon-uuid-1",
  store_id: "c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7",
  code: "DEZOFF",
  discount_type: "percentage",
  discount_value: 10,
  min_order_cents: 5000, // R$ 50,00
  max_uses: 100,
  uses_count: 5,
  is_active: true,
  expires_at: new Date(Date.now() + 86400000).toISOString(), // amanhã
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockFixedCoupon = {
  id: "coupon-uuid-2",
  store_id: "c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7",
  code: "VINTEFIXO",
  discount_type: "fixed_amount",
  discount_value: 20, // R$ 20,00
  min_order_cents: 8000, // R$ 80,00
  max_uses: 10,
  uses_count: 2,
  is_active: true,
  expires_at: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockExpiredCoupon = {
  id: "coupon-uuid-3",
  store_id: "c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7",
  code: "EXPIRADO",
  discount_type: "percentage",
  discount_value: 15,
  min_order_cents: null,
  max_uses: null,
  uses_count: 0,
  is_active: true,
  expires_at: new Date(Date.now() - 86400000).toISOString(), // ontem
};

vi.mock("@/lib/supabase", () => ({
  getServerClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "coupons") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn((field: string, val: string) => ({
              eq: vi.fn((f2: string, v2: string) => ({
                maybeSingle: vi.fn().mockImplementation(async () => {
                  if (v2 === "DEZOFF") return { data: mockActiveCoupon, error: null };
                  if (v2 === "VINTEFIXO") return { data: mockFixedCoupon, error: null };
                  if (v2 === "EXPIRADO") return { data: mockExpiredCoupon, error: null };
                  return { data: null, error: null };
                }),
              })),
            })),
          })),
        };
      }
      return { select: vi.fn() };
    }),
  })),
}));

import { validateCouponLogic } from "./growth.functions";

describe("Coupons Engine & Validation (Big Tech Standards)", () => {
  const storeId = "c6ccd3b2-aa54-42a2-b0fe-251daa5b97f7";

  it("1. Deve validar com sucesso um cupom percentual de 10% quando o pedido mínimo é atingido", async () => {
    const res = await validateCouponLogic({
      storeId,
      code: "DEZOFF",
      cartTotalCents: 10000, // R$ 100,00
    });

    expect(res).toBeDefined();
    expect(res.valid).toBe(true);
    expect(res.code).toBe("DEZOFF");
    expect(res.discount_type).toBe("percentage");
    expect(res.discount_cents).toBe(1000); // R$ 10,00 (10% de 10000)
    expect(res.is_free_shipping).toBe(false);
  });

  it("2. Deve rejeitar cupom quando o pedido não atinge o valor mínimo configurado", async () => {
    await expect(
      validateCouponLogic({
        storeId,
        code: "DEZOFF",
        cartTotalCents: 4000, // R$ 40,00 (mínimo é R$ 50,00)
      }),
    ).rejects.toThrow(/pedido mínimo/i);
  });

  it("3. Deve validar cupom de valor fixo em reais corretamente", async () => {
    const res = await validateCouponLogic({
      storeId,
      code: "VINTEFIXO",
      cartTotalCents: 15000, // R$ 150,00
    });

    expect(res).toBeDefined();
    expect(res.valid).toBe(true);
    expect(res.discount_type).toBe("fixed_amount");
    expect(res.discount_cents).toBe(2000); // R$ 20,00
  });

  it("4. Deve rejeitar cupom expirado", async () => {
    await expect(
      validateCouponLogic({
        storeId,
        code: "EXPIRADO",
        cartTotalCents: 20000,
      }),
    ).rejects.toThrow(/expirou/i);
  });

  it("5. Deve rejeitar código inexistente", async () => {
    await expect(
      validateCouponLogic({
        storeId,
        code: "NAOEXISTE",
        cartTotalCents: 20000,
      }),
    ).rejects.toThrow(/não encontrado/i);
  });
});
