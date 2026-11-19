import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any) => {
        const parsed = schema && typeof schema.parse === "function" ? schema.parse(args?.data) : args?.data;
        return fn({ data: parsed });
      },
    }),
    handler: (fn: any) => async (args: any) => fn(args || {}),
  }),
}));

const anonIdentity = {
  id: null,
  role: "anon",
  store_id: null,
  memberships: [],
  isPlatformAdmin: false,
};

let currentIdentity: any = anonIdentity;
const mockDbOps: Array<{ table: string; op: string; filter?: string }> = [];

function createChain(table: string, op: string) {
  const filters: string[] = [];
  const chain: any = {
    select: () => chain,
    insert: () => createChain(table, "insert"),
    update: () => createChain(table, "update"),
    upsert: () => createChain(table, "upsert"),
    delete: () => createChain(table, "delete"),
    eq: (col: string, val: unknown) => {
      filters.push(`${col}=${String(val)}`);
      return chain;
    },
    or: (expr: string) => {
      filters.push(`or(${expr})`);
      return chain;
    },
    order: () => chain,
    limit: () => chain,
    range: () => chain,
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: { id: "row-1", profile_id: currentIdentity.id }, error: null }),
    then: (resolve: any) => {
      mockDbOps.push({ table, op, filter: filters.join("&") });
      return Promise.resolve({ data: [], count: 0, error: null }).then(resolve);
    },
  };
  return chain;
}

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: (table: string) => {
      const chain = createChain(table, "select");
      return {
        select: () => chain,
        insert: () => createChain(table, "insert"),
        update: () => createChain(table, "update"),
        upsert: () => createChain(table, "upsert"),
        delete: () => createChain(table, "delete"),
      };
    },
  }),
  getAnonServerClient: () => ({
    from: (table: string) => createChain(table, "select"),
  }),
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn(async () => currentIdentity),
  assertStoreAccess: vi.fn((id: any, _roles: any, storeId: string) => {
    if (!id?.id || (id.store_id !== storeId && !id.isPlatformAdmin)) {
      throw new Error("Acesso negado a esta loja.");
    }
  }),
  requireAdmin: vi.fn(async () => {
    if (!currentIdentity?.id || !["owner", "admin", "platform_admin", "master"].includes(currentIdentity.role)) {
      throw new Error("Acesso negado: privilégio administrativo requerido.");
    }
    return currentIdentity;
  }),
  STAFF_ROLES: ["owner", "admin", "manager", "seller"],
}));

import {
  listMyLawsuits,
  createJusDemand,
  deleteLawsuitMonitor,
  deleteLawsuitDeadline,
  getMyDemands,
} from "./jus.functions";
import { getMyKycStatus, submitKycVerification, listKycVerificationsForAdmin } from "./kyc.functions";
import {
  addCrawlSeedFn,
  addRssFeedFn,
  toggleRssFeed,
  getCrawlQueueFn,
  importMinedProductToStoreFn,
  deleteMinedRecipeFn,
} from "./mining.functions";

describe("Security P0 Regression: Auth Null-ID Guard & JUS Owner Scoping", () => {
  beforeEach(() => {
    currentIdentity = { ...anonIdentity };
    mockDbOps.length = 0;
  });

  it("blocks anonymous getServerIdentity() object ({ id: null }) in JUS, KYC and Mining endpoints", async () => {
    await expect(listMyLawsuits({})).rejects.toThrow(/Não autenticado/i);
    await expect(
      createJusDemand({
        data: {
          title: "Processo Teste",
          legal_area: "civel",
          description: "Descrição mínima válida com detalhes.",
        },
      }),
    ).rejects.toThrow(/Não autenticado/i);
    await expect(getMyDemands()).resolves.toEqual([]);

    await expect(getMyKycStatus()).rejects.toThrow(/Não autenticado/i);
    await expect(
      submitKycVerification({ data: { entity_type: "individual" } }),
    ).rejects.toThrow(/Não autenticado/i);
    await expect(listKycVerificationsForAdmin({})).rejects.toThrow(/governança master/i);

    await expect(
      addCrawlSeedFn({ data: { name: "Seed", url: "https://example.com" } }),
    ).rejects.toThrow(/Não autenticado/i);
    await expect(
      addRssFeedFn({ data: { name: "Feed", feedUrl: "https://example.com/rss.xml" } }),
    ).rejects.toThrow(/Não autenticado/i);
    await expect(
      toggleRssFeed({
        data: { id: "11111111-1111-1111-1111-111111111111", is_active: true },
      }),
    ).rejects.toThrow(/Não autenticado/i);
    await expect(getCrawlQueueFn({ data: {} })).rejects.toThrow(/Não autenticado/i);
    await expect(
      importMinedProductToStoreFn({
        data: {
          minedProductId: "11111111-1111-1111-1111-111111111111",
          storeId: "33333333-3333-3333-3333-333333333333",
        },
      }),
    ).rejects.toThrow(/Não autenticado/i);
    await expect(
      deleteMinedRecipeFn({ data: { id: "11111111-1111-1111-1111-111111111111" } }),
    ).rejects.toThrow(/administrativo/i);
  });

  it("blocks cross-tenant importMinedProductToStoreFn even when authenticated in another store", async () => {
    currentIdentity = {
      id: "22222222-2222-2222-2222-222222222222",
      role: "owner",
      store_id: "33333333-3333-3333-3333-333333333333",
      memberships: [],
      isPlatformAdmin: false,
    };

    await expect(
      importMinedProductToStoreFn({
        data: {
          minedProductId: "11111111-1111-1111-1111-111111111111",
          storeId: "99999999-9999-9999-9999-999999999999",
        },
      }),
    ).rejects.toThrow(/Acesso negado/i);
  });

  it("enforces owner filter on deleteLawsuitMonitor and deleteLawsuitDeadline when authenticated", async () => {
    currentIdentity = {
      id: "22222222-2222-2222-2222-222222222222",
      role: "owner",
      store_id: "33333333-3333-3333-3333-333333333333",
      memberships: [],
      isPlatformAdmin: false,
    };

    await deleteLawsuitMonitor({ data: { id: "11111111-1111-1111-1111-111111111111" } });
    await deleteLawsuitDeadline({ data: { id: "44444444-4444-4444-4444-444444444444" } });

    const monitorDel = mockDbOps.find((op) => op.table === "lawsuit_monitors" && op.op === "delete");
    const deadlineDel = mockDbOps.find((op) => op.table === "lawsuit_deadlines" && op.op === "delete");
    expect(monitorDel?.filter).toContain("or(profile_id.eq.22222222-2222-2222-2222-222222222222,store_id.eq.33333333-3333-3333-3333-333333333333)");
    expect(deadlineDel?.filter).toContain("or(profile_id.eq.22222222-2222-2222-2222-222222222222,store_id.eq.33333333-3333-3333-3333-333333333333)");
  });
});
