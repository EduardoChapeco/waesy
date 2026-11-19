import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calcWeightedItemPriceCents,
  parseWeighableEan13,
  splitBillCents,
} from "@/lib/pos/weighable-barcode";

const mocks = vi.hoisted(() => ({
  identity: {
    id: "00000000-0000-4000-8000-0000000000a1",
    store_id: "00000000-0000-4000-8000-0000000000b1",
    role: "manager",
    fullName: "Gerente PDV",
    memberships: [
      { store_id: "00000000-0000-4000-8000-0000000000b1", role: "manager" },
    ],
  },
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validatorFn: ((input: unknown) => unknown) | null = null;
    const chain = {
      validator: (schema: unknown) => {
        validatorFn =
          typeof schema === "function"
            ? (schema as (i: unknown) => unknown)
            : (i: unknown) => (schema as { parse: (v: unknown) => unknown }).parse(i);
        return chain;
      },
      handler: (fn: (ctx: { data: unknown }) => Promise<unknown>) => {
        return async (arg?: { data?: unknown }) => {
          const raw = arg && "data" in arg ? arg.data : arg;
          const parsed = validatorFn ? validatorFn(raw) : raw;
          return fn({ data: parsed });
        };
      },
    };
    return chain;
  },
}));

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => mocks.supabase,
}));

vi.mock("@/lib/server-access", async () => {
  const actual = await vi.importActual<typeof import("@/lib/identity-core")>(
    "@/lib/identity-core"
  );
  return {
    ...actual,
    getServerIdentity: vi.fn(async () => mocks.identity),
  };
});

import {
  deleteKdsStation,
  deleteRestaurantTable,
  getPosSettings,
  savePosSettings,
  saveRestaurantTable,
} from "@/services/pdv.functions";

describe("W1.B4 PDV, Balança EAN-13, KDS & Mesas Suite", () => {
  const storeA = "00000000-0000-4000-8000-0000000000b1";
  const idA = "44444444-4444-4444-8444-444444444441";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.identity = {
      id: "00000000-0000-4000-8000-0000000000a1",
      store_id: storeA,
      role: "manager",
      fullName: "Gerente PDV",
      memberships: [{ store_id: storeA, role: "manager" }],
    };
  });

  function makeChain(handlers: {
    maybeSingle?: () => unknown;
    single?: () => unknown;
    onOp?: (mode: string, payload: unknown) => void;
  }) {
    let mode = "select";
    let payload: unknown = null;
    const chain: Record<string, unknown> = {
      select: () => chain,
      update: (p: unknown) => {
        mode = "update";
        payload = p;
        return chain;
      },
      insert: (p: unknown) => {
        mode = "insert";
        payload = p;
        return chain;
      },
      upsert: (p: unknown) => {
        mode = "upsert";
        payload = p;
        return chain;
      },
      delete: () => {
        mode = "delete";
        return chain;
      },
      eq: () => chain,
      maybeSingle: async () => ({
        data: handlers.maybeSingle ? handlers.maybeSingle() : null,
        error: null,
      }),
      single: async () => {
        handlers.onOp?.(mode, payload);
        return {
          data: handlers.single ? handlers.single() : payload,
          error: null,
        };
      },
      then: (resolve: (r: unknown) => void) => {
        handlers.onOp?.(mode, payload);
        resolve({ error: null });
      },
    };
    return chain;
  }

  describe("Pure Scale EAN-13 & Bill Split Engines", () => {
    it("decodifica EAN-13 de balança (prefixo 2) em peso líquido kg", () => {
      expect(parseWeighableEan13("2001230015004")).toEqual({
        isWeighable: true,
        productCode: "001230",
        weightKg: 1.5,
        raw: "2001230015004",
      });
      expect(parseWeighableEan13("7891000315507")).toBeNull();
      expect(parseWeighableEan13("2001230000000")).toBeNull();

      expect(
        calcWeightedItemPriceCents({ pricePerKgCents: 4990, weightKg: 1.25 })
      ).toBe(6238);
    });

    it("divide conta com gorjeta, desconto, couvert e resto de centavos conservado", () => {
      const res = splitBillCents({
        totalCents: 100_00,
        peopleCount: 3,
        tipPercent: 10,
        discountCents: 0,
        couvertPerPersonCents: 10_00,
      });
      expect(res.couvertTotalCents).toBe(30_00);
      expect(res.serviceFeeCents).toBe(10_00);
      expect(res.grandTotalCents).toBe(140_00);
      expect(res.shares).toEqual([4668, 4666, 4666]);
      expect(res.shares.reduce((a, b) => a + b, 0)).toBe(res.grandTotalCents);
    });
  });

  describe("KDS Stations & Restaurant Tables CRUD + Pos Settings", () => {
    it("exige gerente para deleteKdsStation e desativa apenas na loja logada", async () => {
      mocks.identity.role = "seller";
      mocks.identity.memberships = [{ store_id: storeA, role: "seller" }];
      await expect(
        deleteKdsStation({ data: { stationId: idA } })
      ).rejects.toThrow("Unauthorized");

      mocks.identity.role = "manager";
      mocks.identity.memberships = [{ store_id: storeA, role: "manager" }];
      const ops: unknown[] = [];
      mocks.supabase.from.mockImplementation(() =>
        makeChain({
          onOp: (mode, payload) => ops.push({ mode, payload }),
        })
      );

      const ok = await deleteKdsStation({ data: { stationId: idA } });
      expect(ok).toEqual({ status: "success" });
      expect(ops[0]).toMatchObject({
        mode: "update",
        payload: { is_active: false },
      });
    });

    it("bloqueia exclusão de mesa ocupada e permite criar/excluir mesa livre", async () => {
      mocks.supabase.from.mockImplementation(() =>
        makeChain({
          single: () => ({ id: idA, table_number: 12, store_id: storeA }),
        })
      );
      const saved = await saveRestaurantTable({
        data: { tableNumber: 12, capacity: 4, shape: "round", zone: "salao" },
      });
      expect(saved.status).toBe("success");

      mocks.supabase.from.mockImplementation(() =>
        makeChain({
          maybeSingle: () => ({ id: idA, status: "occupied", store_id: storeA }),
        })
      );
      await expect(
        deleteRestaurantTable({ data: { tableId: idA } })
      ).rejects.toThrow("Finalize a comanda");

      mocks.supabase.from.mockImplementation(() =>
        makeChain({
          maybeSingle: () => ({ id: idA, status: "available", store_id: storeA }),
        })
      );
      const deleted = await deleteRestaurantTable({ data: { tableId: idA } });
      expect(deleted).toEqual({ status: "success" });
    });

    it("lê default e persiste pos_settings com segurança gerencial", async () => {
      mocks.supabase.from.mockImplementation(() => makeChain({}));
      const defaults = await getPosSettings();
      expect(defaults.require_pin_for_void).toBe(true);

      const saved = await savePosSettings({
        data: {
          maxDiscountWithoutPin: 10,
          requirePinForDiscount: true,
          requirePinForRefund: true,
          requirePinForVoid: true,
        },
      });
      expect(saved.status).toBe("success");
    });
  });
});
