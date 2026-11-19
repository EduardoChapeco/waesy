import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  identity: {
    id: "00000000-0000-4000-8000-0000000000a1",
    store_id: "00000000-0000-4000-8000-0000000000b1",
    role: "manager",
    fullName: "Gestora Teste",
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

vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => null,
}));

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => mocks.supabase,
  getAnonServerClient: () => mocks.supabase,
}));

vi.mock("@/lib/server-access", async () => {
  const actual = await vi.importActual<typeof import("@/lib/identity-core")>(
    "@/lib/identity-core"
  );
  return {
    ...actual,
    getServerIdentity: vi.fn(async () => mocks.identity),
    requireStaff: vi.fn(async () => mocks.identity),
    resolveTenantStoreId: vi.fn(async () => mocks.identity.store_id),
  };
});

import {
  addLeadActivity,
  archiveLead,
  listArchivedLeads,
  mergeCustomers,
  restoreLead,
  transferLead,
} from "@/services/crm.functions";

describe("W1.B3 CRM Nativization & Tenant Isolation Suite", () => {
  const storeA = "00000000-0000-4000-8000-0000000000b1";
  const storeB = "00000000-0000-4000-8000-0000000000b2";
  const leadId = "11111111-1111-4111-8111-111111111111";
  const userA = "00000000-0000-4000-8000-0000000000a1";
  const userB = "00000000-0000-4000-8000-0000000000a2";
  const srcCustId = "33333333-3333-4333-8333-333333333331";
  const tgtCustId = "33333333-3333-4333-8333-333333333332";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.identity = {
      id: userA,
      store_id: storeA,
      role: "manager",
      fullName: "Gestora Teste",
      memberships: [{ store_id: storeA, role: "manager" }],
    };
  });

  function makeChain(handlers: {
    maybeSingle?: (state: { eqs: Record<string, unknown> }) => unknown;
    onUpdate?: (payload: unknown) => { error: unknown; count?: number };
    onInsert?: (payload: unknown) => { error: unknown };
    selectRows?: unknown[];
  }) {
    const state: {
      eqs: Record<string, unknown>;
      mode: "select" | "update" | "insert";
      payload: unknown;
    } = {
      eqs: {},
      mode: "select",
      payload: null,
    };

    const chain: Record<string, unknown> = {
      select: () => chain,
      update: (payload: unknown) => {
        state.mode = "update";
        state.payload = payload;
        return chain;
      },
      insert: (payload: unknown) => {
        state.mode = "insert";
        state.payload = payload;
        return chain;
      },
      eq: (col: string, val: unknown) => {
        state.eqs[col] = val;
        return chain;
      },
      order: () => chain,
      limit: () => chain,
      maybeSingle: async () => ({
        data: handlers.maybeSingle ? handlers.maybeSingle(state) : null,
        error: null,
      }),
      single: async () => {
        if (state.mode === "insert" && handlers.onInsert) {
          const out = handlers.onInsert(state.payload);
          return { data: state.payload, error: out.error };
        }
        return {
          data: handlers.maybeSingle ? handlers.maybeSingle(state) : { id: "row-1" },
          error: null,
        };
      },
      then: (resolve: (res: unknown) => void) => {
        if (state.mode === "update") {
          const out = handlers.onUpdate
            ? handlers.onUpdate(state.payload)
            : { error: null, count: 0 };
          resolve(out);
          return;
        }
        if (state.mode === "insert") {
          const out = handlers.onInsert
            ? handlers.onInsert(state.payload)
            : { error: null };
          resolve(out);
          return;
        }
        resolve({ data: handlers.selectRows ?? [], error: null });
      },
    };
    return chain;
  }

  it("addLeadActivity aceita { leadId, type, content } e persiste com store_id", async () => {
    const insertedActivities: unknown[] = [];
    mocks.supabase.from.mockImplementation((table: string) => {
      if (table === "leads_crm") {
        return makeChain({
          maybeSingle: () => ({ id: leadId, store_id: storeA }),
        });
      }
      return makeChain({
        onInsert: (payload) => {
          insertedActivities.push(payload);
          return { error: null };
        },
      });
    });

    await addLeadActivity({
      data: { leadId, type: "call", content: "Ligação confirmando roteiro." },
    });

    expect(insertedActivities.length).toBeGreaterThanOrEqual(1);
    expect(insertedActivities[0]).toMatchObject({
      lead_id: leadId,
      type: "call",
      content: "Ligação confirmando roteiro.",
    });
  });

  it("transferLead atualiza responsável, grava nota de auditoria e bloqueia cross-tenant", async () => {
    const updates: unknown[] = [];
    const inserts: unknown[] = [];

    mocks.supabase.from.mockImplementation((table: string) => {
      if (table === "leads_crm") {
        return makeChain({
          maybeSingle: () => ({
            id: leadId,
            store_id: storeA,
            assigned_to: userA,
            owner_id: userA,
          }),
          onUpdate: (payload) => {
            updates.push(payload);
            return { error: null };
          },
        });
      }
      if (table === "profiles") {
        return makeChain({
          maybeSingle: ({ eqs }) => ({
            full_name: eqs.id === userA ? "Ana Silva" : "Carlos Souza",
          }),
        });
      }
      return makeChain({
        onInsert: (payload) => {
          inserts.push(payload);
          return { error: null };
        },
      });
    });

    const res = await transferLead({
      data: { leadId, newOwnerId: userB },
    });

    expect(res).toEqual({
      success: true,
      unchanged: false,
      fromName: "Ana Silva",
      toName: "Carlos Souza",
    });
    expect(updates[0]).toMatchObject({ assigned_to: userB, owner_id: userB });
    expect(inserts[0]).toMatchObject({
      lead_id: leadId,
      store_id: storeA,
      content: 'Responsável alterado de "Ana Silva" para "Carlos Souza"',
    });

    mocks.supabase.from.mockImplementation(() =>
      makeChain({
        maybeSingle: () => ({
          id: leadId,
          store_id: storeB,
          assigned_to: userA,
          owner_id: userA,
        }),
      })
    );

    await expect(
      transferLead({ data: { leadId, newOwnerId: userB } })
    ).rejects.toThrow("Unauthorized");
  });

  it("archiveLead -> listArchivedLeads -> restoreLead preserva e restaura estágio anterior", async () => {
    const updates: unknown[] = [];
    mocks.supabase.from.mockImplementation((table: string) => {
      if (table === "leads_crm") {
        return makeChain({
          maybeSingle: () => ({
            id: leadId,
            store_id: storeA,
            status: "proposal",
            custom_fields: { archived_from_status: "proposal" },
          }),
          selectRows: [{ id: leadId, status: "archived", full_name: "Viajante X" }],
          onUpdate: (payload) => {
            updates.push(payload);
            return { error: null };
          },
        });
      }
      return makeChain({});
    });

    const arch = await archiveLead({
      data: { leadId, reason: "Sem resposta há 30d" },
    });
    expect(arch).toEqual({ success: true, archivedFromStatus: "proposal" });
    expect(updates[0]).toMatchObject({ status: "archived" });

    const archived = await listArchivedLeads();
    expect(archived).toHaveLength(1);

    const rest = await restoreLead({ data: { leadId } });
    expect(rest).toEqual({ success: true, restoredStatus: "proposal" });
    expect(updates[1]).toMatchObject({ status: "proposal" });
  });

  it("mergeCustomers bloqueia vendedor, bloqueia cross-tenant e mescla FKs/tags/LTV para gerente", async () => {
    mocks.identity.role = "seller";
    mocks.identity.memberships = [{ store_id: storeA, role: "seller" }];
    await expect(
      mergeCustomers({
        data: { sourceCustomerId: srcCustId, targetCustomerId: tgtCustId },
      })
    ).rejects.toThrow("Unauthorized");

    mocks.identity.role = "manager";
    mocks.identity.memberships = [{ store_id: storeA, role: "manager" }];

    mocks.supabase.from.mockImplementation(() =>
      makeChain({
        maybeSingle: ({ eqs }) =>
          eqs.id === srcCustId
            ? { id: srcCustId, store_id: storeB, status: "active" }
            : { id: tgtCustId, store_id: storeA, status: "active" },
      })
    );
    await expect(
      mergeCustomers({
        data: { sourceCustomerId: srcCustId, targetCustomerId: tgtCustId },
      })
    ).rejects.toThrow("lojas diferentes");

    const updatedCustomers: Array<{ payload: Record<string, unknown> }> = [];
    mocks.supabase.from.mockImplementation((table: string) => {
      if (table === "customers_crm") {
        return makeChain({
          maybeSingle: ({ eqs }) =>
            eqs.id === srcCustId
              ? {
                  id: srcCustId,
                  store_id: storeA,
                  full_name: "Maria Duplicada",
                  name: "Maria Duplicada",
                  email: "maria@dup.com",
                  phone: "11999990000",
                  document: null,
                  notes: "Nota antiga",
                  tags: ["VIP", "Lua de Mel"],
                  total_spent_cents: 150000,
                  lifetime_lead_count: 2,
                  status: "active",
                }
              : {
                  id: tgtCustId,
                  store_id: storeA,
                  full_name: "Maria Silva",
                  name: "Maria Silva",
                  email: null,
                  phone: "11988887777",
                  document: "12345678900",
                  notes: "Cliente principal",
                  tags: ["VIP", "Europa"],
                  total_spent_cents: 500000,
                  lifetime_lead_count: 3,
                  status: "active",
                },
          onUpdate: (payload) => {
            updatedCustomers.push({
              payload: payload as Record<string, unknown>,
            });
            return { error: null };
          },
        });
      }
      return makeChain({
        onUpdate: () => ({ error: null, count: 1 }),
      });
    });

    const merged = await mergeCustomers({
      data: { sourceCustomerId: srcCustId, targetCustomerId: tgtCustId },
    });

    expect(merged).toEqual({
      success: true,
      targetCustomerId: tgtCustId,
      sourceCustomerId: srcCustId,
      reassignedCount: 12,
    });
    expect(updatedCustomers[0].payload).toMatchObject({
      email: "maria@dup.com",
      total_spent_cents: 650000,
      lifetime_lead_count: 5,
      tags: ["VIP", "Europa", "Lua de Mel"],
    });
    expect(updatedCustomers[1].payload).toMatchObject({
      status: "archived",
    });
  });
});
