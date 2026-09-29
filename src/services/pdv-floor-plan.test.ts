import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do TanStack Start createServerFn para execução limpa em testes unitários
vi.mock("@tanstack/react-start", () => {
  return {
    createServerFn: () => {
      let currentValidator: any = null;
      return {
        validator: (v: any) => {
          currentValidator = v;
          return {
            handler: (h: any) => async (args: any) => {
              const inputData = args?.data !== undefined ? args.data : args;
              const validated =
                currentValidator && typeof currentValidator.parse === "function"
                  ? currentValidator.parse(inputData)
                  : inputData;
              return h({ data: validated });
            },
          };
        },
        handler: (h: any) => async (args: any) => {
          const inputData = args?.data !== undefined ? args.data : args;
          return h({ data: inputData });
        },
      };
    },
  };
});

// Mock exato dos módulos importados por reservations.functions.ts
vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: {
                id: "plan-123",
                store_id: "00000000-0000-0000-0000-000000000001",
                name: "Salão Principal",
                grid_cols: 4,
                grid_rows: 3,
                tables: [
                  { id: "m1", label: "Mesa 01", seats: 4, col: 1, row: 1, shape: "square" },
                  { id: "m2", label: "Mesa 02", seats: 2, col: 2, row: 1, shape: "round" },
                  { id: "m3", label: "Mesa 03", seats: 6, col: 3, row: 1, shape: "rectangle" },
                ],
                is_active: true,
              },
              error: null,
            }),
          }),
        }),
      }),
      upsert: () => ({
        select: () => ({
          single: async () => ({
            data: { id: "plan-123", name: "Salão Principal" },
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: async () => ({
    id: "00000000-0000-0000-0000-000000000099",
    store_id: "00000000-0000-0000-0000-000000000001",
    role: "owner",
  }),
}));

describe("PDV & Gastronomia — Planta do Salão 2D (store_floor_plans)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve carregar a planta do salão com mesas e coordenadas 2D", async () => {
    const { getStoreFloorPlan } = await import("./reservations.functions");
    const plan = await getStoreFloorPlan({
      data: { store_id: "00000000-0000-0000-0000-000000000001", name: "Salão Principal" },
    });

    expect(plan).toBeDefined();
    expect(plan.name).toBe("Salão Principal");
    expect(plan.grid_cols).toBe(4);
    expect(plan.grid_rows).toBe(3);
    expect(plan.tables).toHaveLength(3);
    expect(plan.tables[0].label).toBe("Mesa 01");
    expect(plan.tables[0].seats).toBe(4);
  });

  it("deve validar a integridade dos dados para persistência da planta", async () => {
    const { saveStoreFloorPlan } = await import("./reservations.functions");
    const saved = await saveStoreFloorPlan({
      data: {
        store_id: "00000000-0000-0000-0000-000000000001",
        name: "Salão Principal",
        grid_cols: 4,
        grid_rows: 3,
        tables: [
          { id: "m1", label: "Mesa 01", seats: 4, col: 1, row: 1, shape: "square" },
        ],
      },
    });

    expect(saved).toBeDefined();
    expect(saved.id).toBe("plan-123");
  });
});
