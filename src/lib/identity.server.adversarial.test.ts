/**
 * Testes Adversariais de Segurança — Zero-Trust Civil Root e Multi-Tenant Isolation
 * 
 * Executado pelo Challenger M1.1 para stress-testing empírico:
 * 1. Zero-Trust Civil Root (DEC-206)
 * 2. Manipulação de cookies e tentativa de spoofing de tenant
 * 3. Tentativas de vazamento de store_id em contexto pessoal
 * 4. Isolamento estrito de assertStoreAccess e resolveStoreContext
 * 5. Ausência de inferência arbitrária de lojas (.limit(1) guessing)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { assertStoreAccess, assertOwnerAccess, assertManagerAccess, type ServerIdentity } from "@/lib/identity-core";
import { resolveStoreContext } from "@/services/builder.functions";

// Mock das dependências de runtime de servidor
const mockHeaders: Record<string, string> = {};
const mockCookies: Record<string, string> = {};

vi.mock("@tanstack/start-server-core", () => ({
  getRequestHeader: vi.fn((key: string) => mockHeaders[key.toLowerCase()] || undefined),
  getCookie: vi.fn((key: string) => mockCookies[key] || undefined),
}));

vi.mock("vinxi/http", () => ({
  getEvent: vi.fn(() => {
    throw new Error("No Vinxi event in unit test");
  }),
}));

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase-ssr.server", () => ({
  getSSRClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

let mockDbProfilesResult: any = { data: null, error: null };
let mockDbMembersResult: any = { data: [], error: null };
let mockDbStoresResult: any = { data: [], error: null };
let mockDbDocResult: any = { data: null, error: null };

vi.mock("@/lib/supabase", () => {
  return {
    getServerClient: vi.fn(() => ({
      from: vi.fn((table: string) => {
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue(mockDbProfilesResult),
          };
        }
        if (table === "workspace_members") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue(mockDbMembersResult),
          };
        }
        if (table === "stores") {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue(mockDbStoresResult),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          };
        }
        if (table === "experience_documents") {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue(mockDbDocResult),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    })),
    getAnonServerClient: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      })),
    })),
  };
});

// Import dynamically to ensure mocks apply
const { getServerIdentity } = await import("@/lib/identity.server");

describe("CHALLENGER STRESS-TEST — Zero-Trust Civil Root (DEC-206)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockHeaders).forEach((k) => delete mockHeaders[k]);
    Object.keys(mockCookies).forEach((k) => delete mockCookies[k]);
    mockHeaders["host"] = `test-${Math.random()}.waesy.com`;
  });

  it("ADV-01: Quando activeContext = 'civil', store_id e storeId DEVEM ser estritamente nulos, mesmo se usuário for proprietário de lojas", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: "user-civil-100", email: "civil@user.com" },
      },
    });

    mockDbProfilesResult = {
      data: { id: "user-civil-100", full_name: "Cidadão Civil", role: "customer" },
    };

    mockDbMembersResult = {
      data: [
        { store_id: "store-alpha-1", role: "owner" },
        { store_id: "store-beta-2", role: "admin" },
      ],
    };

    mockDbStoresResult = {
      data: [
        { id: "store-alpha-1", name: "Loja Alpha", slug: "alpha", settings: {} },
        { id: "store-beta-2", name: "Loja Beta", slug: "beta", settings: {} },
      ],
    };

    // Forçar cookie explícito civil
    mockCookies["waesy_active_context"] = "civil";
    mockHeaders["cookie"] = "waesy_active_context=civil";

    const identity = await getServerIdentity();

    expect(identity.id).toBe("user-civil-100");
    expect(identity.store_id).toBeNull();
    expect(identity.storeId).toBeNull();
    expect(identity.isCivilContext).toBe(true);
    expect(identity.activeContext).toBe("civil");
    // Memberships ainda são conhecidas para alternância, mas store_id ativo NUNCA vaza
    expect(identity.memberships).toHaveLength(2);
  });

  it("ADV-02: Ataque de injeção de cookie de tenant enquanto em contexto civil DEVE ser neutralizado", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: "user-attacker-200", email: "attacker@test.com" },
      },
    });

    mockDbProfilesResult = {
      data: { id: "user-attacker-200", full_name: "Attacker User", role: "customer" },
    };

    mockDbMembersResult = {
      data: [{ store_id: "store-victim-999", role: "owner" }],
    };

    mockDbStoresResult = {
      data: [{ id: "store-victim-999", name: "Loja Vítima", slug: "vitima", settings: {} }],
    };

    // Atacante injeta simultaneamente contexto civil e cookie de tenant de outra loja
    mockCookies["waesy_active_context"] = "civil";
    mockCookies["waesy_active_tenant"] = "store-victim-999";
    mockHeaders["cookie"] = "waesy_active_context=civil; waesy_active_tenant=store-victim-999";

    const identity = await getServerIdentity();

    // A regra Zero-Trust Civil Root (DEC-206) deve anular incondicionalmente
    expect(identity.store_id).toBeNull();
    expect(identity.storeId).toBeNull();
    expect(identity.isCivilContext).toBe(true);
  });

  it("ADV-03: Contexto 'creator' não deve herdar store_id de loja comercial", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: "user-creator-300", email: "creator@test.com" },
      },
    });

    mockDbProfilesResult = {
      data: { id: "user-creator-300", full_name: "Criador Top", role: "customer" },
    };

    mockDbMembersResult = {
      data: [{ store_id: "store-commerce-444", role: "owner" }],
    };

    mockDbStoresResult = {
      data: [{ id: "store-commerce-444", name: "Comércio", slug: "comercio", settings: {} }],
    };

    mockCookies["waesy_active_context"] = "creator";
    mockHeaders["cookie"] = "waesy_active_context=creator; waesy_active_tenant=store-commerce-444";

    const identity = await getServerIdentity();

    expect(identity.store_id).toBeNull();
    expect(identity.storeId).toBeNull();
    expect(identity.isCivilContext).toBe(true);
    expect(identity.activeContext).toBe("creator");
  });
});

describe("CHALLENGER STRESS-TEST — Tenant Spoofing & Cross-Tenant Boundary Probing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockHeaders).forEach((k) => delete mockHeaders[k]);
    Object.keys(mockCookies).forEach((k) => delete mockCookies[k]);
    mockHeaders["host"] = `test-${Math.random()}.waesy.com`;
  });

  it("ADV-04: Usuário comum que injeta cookie de tenant de loja onde NÃO é membro NUNCA adquire o store_id alvo", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: "user-regular-400", email: "regular@test.com" },
      },
    });

    mockDbProfilesResult = {
      data: { id: "user-regular-400", full_name: "Usuário Comum", role: "customer" },
    };

    // Usuário é membro APENAS da sua própria loja
    mockDbMembersResult = {
      data: [{ store_id: "store-own-777", role: "seller" }],
    };

    mockDbStoresResult = {
      data: [{ id: "store-own-777", name: "Minha Loja", slug: "minha-loja", settings: {} }],
    };

    // Injeta cookie tentando acessar loja de terceiro
    mockCookies["waesy_active_context"] = "store";
    mockCookies["waesy_active_tenant"] = "store-victim-888";
    mockHeaders["cookie"] = "waesy_active_context=store; waesy_active_tenant=store-victim-888";

    const identity = await getServerIdentity();

    // matchedMembership para store-victim-888 é falso.
    // O sistema cai para fallback seguro da própria loja do membro (store-own-777)
    expect(identity.store_id).not.toBe("store-victim-888");
    expect(identity.store_id).toBe("store-own-777");
    expect(identity.role).toBe("seller");
  });

  it("ADV-05: Usuário sem nenhuma membership tentando forçar activeContext=store NUNCA adquire store_id", async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: { id: "user-nomember-500", email: "nomember@test.com" },
      },
    });

    mockDbProfilesResult = {
      data: { id: "user-nomember-500", full_name: "Sem Lojas", role: "customer" },
    };

    mockDbMembersResult = { data: [] };
    mockDbStoresResult = { data: [] };

    mockCookies["waesy_active_context"] = "store";
    mockCookies["waesy_active_tenant"] = "store-unauthorized-999";
    mockHeaders["cookie"] = "waesy_active_context=store; waesy_active_tenant=store-unauthorized-999";

    const identity = await getServerIdentity();

    expect(identity.store_id).toBeNull();
    expect(identity.storeId).toBeNull();
    expect(identity.role).toBe("customer");
    expect(identity.isCivilContext).toBe(true);
  });

  it("ADV-06: assertStoreAccess lança Unauthorized imediatamente ao tentar acessar loja alheia", () => {
    const maliciousIdentity: ServerIdentity = {
      id: "attacker-id",
      role: "owner",
      store_id: "store-attacker",
      memberships: [{ store_id: "store-attacker", role: "owner" }],
    };

    expect(() => {
      assertStoreAccess(maliciousIdentity, ["owner"], "store-victim-123");
    }).toThrow(/Unauthorized: Insufficient permissions for store store-victim-123/);
  });

  it("ADV-07: assertOwnerAccess e assertManagerAccess bloqueiam escalação de privilégios de papéis operacionais", () => {
    const sellerIdentity: ServerIdentity = {
      id: "seller-id",
      role: "seller",
      store_id: "store-alpha",
      memberships: [{ store_id: "store-alpha", role: "seller" }],
    };

    // Vendedor não pode invocar assertOwnerAccess
    expect(() => {
      assertOwnerAccess(sellerIdentity, "store-alpha");
    }).toThrow(/Required one of: owner, store_owner, admin, proprietario, platform_admin, master/);

    // Vendedor não pode invocar assertManagerAccess
    expect(() => {
      assertManagerAccess(sellerIdentity, "store-alpha");
    }).toThrow(/Required one of: owner, store_owner, admin, proprietario, manager, gerente, platform_admin, master/);
  });
});

describe("CHALLENGER STRESS-TEST — Builder Platform & Store Guessing Elimination", () => {
  it("ADV-08: resolveStoreContext em builder.functions.ts REJEITA tenant arbitrário se usuário não tiver permissão", async () => {
    const regularIdentity = {
      id: "user-123",
      role: "seller",
      store_id: "store-mine",
      memberships: [{ store_id: "store-mine" }],
    };

    // Usuário tenta acessar targetStoreId alheio
    const resolvedStore = await resolveStoreContext(regularIdentity, "store-victim-target");
    // Não pode resolver para a loja da vítima! Cai para store-mine do próprio usuário
    expect(resolvedStore).toBe("store-mine");
    expect(resolvedStore).not.toBe("store-victim-target");
  });

  it("ADV-09: resolveStoreContext LANÇA EXCEÇÃO se não houver contexto nem loja válida (proibição de adivinhação .limit(1))", async () => {
    const civilIdentity = {
      id: "civil-user",
      role: "customer",
      store_id: null,
      memberships: [],
    };

    await expect(resolveStoreContext(civilIdentity)).rejects.toThrow(
      "Nenhum contexto de loja válido encontrado para a operação do builder.",
    );
  });

  it("ADV-10: resolveStoreContext LANÇA EXCEÇÃO se documentId pertencer a outra loja e usuário não for membro", async () => {
    mockDbDocResult = {
      data: { store_id: "store-secret-victim" },
      error: null,
    };

    const attackerIdentity = {
      id: "attacker-user",
      role: "owner",
      store_id: "store-attacker",
      memberships: [{ store_id: "store-attacker" }],
    };

    await expect(
      resolveStoreContext(attackerIdentity, null, "doc-secret-123"),
    ).rejects.toThrow("Acesso negado ao documento desta loja.");
  });

  it("ADV-11: Platform admin possui autorização explícita para inspecionar lojas e documentos", async () => {
    mockDbDocResult = {
      data: { store_id: "store-target-any" },
      error: null,
    };

    const adminIdentity = {
      id: "admin-master",
      role: "platform_admin",
      store_id: null,
      memberships: [],
    };

    // TargetStoreId explícito
    const resolvedTarget = await resolveStoreContext(adminIdentity, "store-target-any");
    expect(resolvedTarget).toBe("store-target-any");

    // DocumentId explícito
    const resolvedDoc = await resolveStoreContext(adminIdentity, null, "doc-target-456");
    expect(resolvedDoc).toBe("store-target-any");
  });
});
