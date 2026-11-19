import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateProposalForExport } from "@/lib/tourism/proposal-validation";

const mocks = vi.hoisted(() => ({
  identity: {
    id: "00000000-0000-4000-8000-0000000000a1",
    store_id: "00000000-0000-4000-8000-0000000000b1",
    role: "manager",
    fullName: "Gestor Turismo",
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
    requireStaff: vi.fn(async () => mocks.identity),
  };
});

import {
  createCorporateRfp,
  listCorporateRfps,
  updateCorporateRfpStatus,
} from "@/services/corporate-travel.functions";
import {
  deleteDepartureCard,
  getDepartureWithChecklist,
} from "@/services/travel-departures.functions";

describe("W1.B5 Tourism Corporate RFP, Export Guard & Departures Isolation Suite", () => {
  const storeA = "00000000-0000-4000-8000-0000000000b1";
  const storeB = "00000000-0000-4000-8000-0000000000b2";
  const agencyA = "55555555-5555-4555-8555-555555555551";
  const agencyB = "55555555-5555-4555-8555-555555555552";
  const rfpId = "66666666-6666-4666-8666-666666666661";
  const depId = "77777777-7777-4777-8777-777777777771";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.identity = {
      id: "00000000-0000-4000-8000-0000000000a1",
      store_id: storeA,
      role: "manager",
      fullName: "Gestor Turismo",
      memberships: [{ store_id: storeA, role: "manager" }],
    };
  });

  function makeChain(handlers: {
    maybeSingle?: () => unknown;
    single?: () => unknown;
    rows?: unknown[];
    onInsert?: (p: unknown) => void;
    onUpdate?: (p: unknown) => void;
  }) {
    let mode = "select";
    let payload: unknown = null;
    const chain: Record<string, unknown> = {
      select: () => chain,
      insert: (p: unknown) => {
        mode = "insert";
        payload = p;
        handlers.onInsert?.(p);
        return chain;
      },
      update: (p: unknown) => {
        mode = "update";
        payload = p;
        handlers.onUpdate?.(p);
        return chain;
      },
      delete: () => {
        mode = "delete";
        return chain;
      },
      eq: () => chain,
      or: () => chain,
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => ({
        data: handlers.maybeSingle ? handlers.maybeSingle() : null,
        error: null,
      }),
      single: async () => ({
        data: handlers.single ? handlers.single() : payload ?? { id: "row-1" },
        error: null,
      }),
      then: (resolve: (r: unknown) => void) => {
        resolve({ data: handlers.rows ?? [], error: null, mode });
      },
    };
    return chain;
  }

  describe("validateProposalForExport", () => {
    it("bloqueia proposta vazia ou publicada sem valor e aprova proposta com vôos/web_page", () => {
      const emptyRes = validateProposalForExport({
        title: "",
        destination_city: "",
        flights: [],
        hotels: [],
      });
      expect(emptyRes.ok).toBe(false);
      expect(emptyRes.errors.length).toBeGreaterThanOrEqual(2);

      const sentZero = validateProposalForExport({
        title: "Roteiro Bariloche",
        status: "sent",
        flights: [{ flight_number: "LA8000" }],
        pricing: { total_price_cents: 0 },
      });
      expect(sentZero.ok).toBe(false);

      const validRes = validateProposalForExport({
        title: "Roteiro Bariloche",
        status: "sent",
        web_page: { blocks: [{ id: "b1", type: "hero" }] },
        pricing: { total_price_cents: 950_000 },
      });
      expect(validRes).toEqual({ ok: true, errors: [] });
    });
  });

  describe("Corporate RFPs CRUD & Multi-Tenant Guards", () => {
    it("cria, lista e atualiza status de RFP escopado na agência", async () => {
      const inserts: unknown[] = [];
      const updates: unknown[] = [];

      mocks.supabase.from.mockImplementation((table: string) => {
        if (table === "agencies") {
          return makeChain({
            maybeSingle: () => ({ id: agencyA, organization_id: null }),
          });
        }
        return makeChain({
          rows: [
            {
              id: rfpId,
              agency_id: agencyA,
              company_name: "Acme SA",
              destination: "Lisboa",
              status: "pending",
            },
          ],
          maybeSingle: () => ({
            id: rfpId,
            agency_id: agencyA,
            organization_id: null,
          }),
          single: () => ({
            id: rfpId,
            company_name: "Acme SA",
            destination: "Lisboa",
            status: "quoted",
          }),
          onInsert: (p) => inserts.push(p),
          onUpdate: (p) => updates.push(p),
        });
      });

      const created = await createCorporateRfp({
        data: {
          storeId: storeA,
          companyName: "Acme SA",
          destination: "Lisboa",
          budget: 15000,
        },
      });
      expect(created).toBeTruthy();
      expect(inserts[0]).toMatchObject({
        agency_id: agencyA,
        company_name: "Acme SA",
        destination: "Lisboa",
        status: "pending",
      });

      const list = await listCorporateRfps({ data: { storeId: storeA } });
      expect(list).toHaveLength(1);

      await updateCorporateRfpStatus({
        data: { storeId: storeA, rfpId, status: "quoted" },
      });
      expect(updates[0]).toMatchObject({ status: "quoted" });
    });

    it("bloqueia acesso cross-tenant em listCorporateRfps e updateCorporateRfpStatus", async () => {
      await expect(
        listCorporateRfps({ data: { storeId: storeB } })
      ).rejects.toThrow("Unauthorized");

      mocks.supabase.from.mockImplementation((table: string) => {
        if (table === "agencies") {
          return makeChain({
            maybeSingle: () => ({ id: agencyA, organization_id: null }),
          });
        }
        return makeChain({
          maybeSingle: () => ({
            id: rfpId,
            agency_id: agencyB,
            organization_id: null,
          }),
        });
      });

      await expect(
        updateCorporateRfpStatus({
          data: { storeId: storeA, rfpId, status: "won" },
        })
      ).rejects.toThrow("Acesso não autorizado");
    });
  });

  describe("Departures Kanban Tenant Isolation Fixes", () => {
    it("bloqueia leitura e exclusão cross-tenant em travel_departures_kanban", async () => {
      mocks.supabase.from.mockImplementation(() =>
        makeChain({
          maybeSingle: () => ({ id: depId, store_id: storeB }),
          single: () => ({ id: depId, store_id: storeB }),
        })
      );

      await expect(
        getDepartureWithChecklist({ data: { departure_id: depId } })
      ).rejects.toThrow("Acesso não autorizado");

      await expect(
        deleteDepartureCard({ data: { id: depId } })
      ).rejects.toThrow("Unauthorized");
    });
  });
});
