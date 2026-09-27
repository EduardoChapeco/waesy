import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @tanstack/react-start for pure server function execution in Vitest
vi.mock("@tanstack/react-start", () => ({
  createServerFn: vi.fn(() => {
    const fnBuilder: any = {
      validator: vi.fn((schema: any) => {
        fnBuilder._schema = schema;
        return fnBuilder;
      }),
      handler: vi.fn((handlerFn: any) => {
        const callable = async (args: any) => {
          let data = args?.data;
          if (fnBuilder._schema && data !== undefined) {
            data = fnBuilder._schema.parse(data);
          }
          return handlerFn({ data });
        };
        callable.handler = handlerFn;
        return callable;
      }),
    };
    return fnBuilder;
  }),
}));

const mockSingleAd = {
  id: "00000000-0000-0000-0000-000000000001",
  author_profile_id: "collaborator-999",
  store_id: "store-456",
  status: "active",
};

function createChainableQuery(resolvedData: any) {
  const chain: any = {
    eq: vi.fn(() => chain),
    single: vi.fn().mockResolvedValue({ data: resolvedData, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: resolvedData, error: null }),
    select: vi.fn(() => chain),
  };
  return chain;
}

let mockFrom: any;

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: (...args: any[]) => mockFrom(...args),
  }),
}));

vi.mock("@/services/identity.functions", () => ({
  getIdentity: vi.fn(async () => ({
    id: "user-owner-123",
    role: "customer",
    store_id: "store-456",
    memberships: [{ store_id: "store-456", role: "owner" }],
  })),
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn(async () => ({
    id: "user-owner-123",
    role: "customer",
    store_id: "store-456",
    memberships: [{ store_id: "store-456", role: "owner" }],
  })),
}));

import { updateClassifiedStatus, deleteClassified } from "./classifieds.functions";
import { getIdentity } from "./identity.functions";

describe("Classifieds Lifecycle & Store Authority Tests (BigTech Board)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom = vi.fn((table: string) => {
      return {
        select: vi.fn(() => createChainableQuery(mockSingleAd)),
        update: vi.fn((updateData: any) => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: { ...mockSingleAd, ...updateData },
                error: null,
              }),
            })),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      };
    });
  });

  it("1. Deve validar que a função updateClassifiedStatus está definida", () => {
    expect(updateClassifiedStatus).toBeDefined();
  });

  it("2. Deve permitir que o proprietário da loja associada altere o status do anúncio mesmo se author_profile_id for de outro colaborador", async () => {
    const result = await updateClassifiedStatus({
      data: {
        id: "00000000-0000-0000-0000-000000000001",
        status: "paused",
      },
    });

    expect(result.success).toBe(true);
    expect(result.classified.status).toBe("paused");
  }, 15000);

  it("3. Deve rejeitar alteração de status se o usuário não for autor, admin ou dono da loja", async () => {
    // Simula usuário estranho que não pertence à loja
    vi.mocked(getIdentity).mockResolvedValueOnce({
      id: "stranger-999",
      role: "customer",
      store_id: "another-store-999",
      memberships: [{ store_id: "another-store-999", role: "owner" }],
    } as any);

    // Mock para que a busca do anúncio retorne anúncio de outra loja, e membros/owner retornem null
    mockFrom = vi.fn((table: string) => {
      if (table === "classifieds") {
        return {
          select: vi.fn(() => createChainableQuery({
            id: "00000000-0000-0000-0000-000000000001",
            author_profile_id: "collaborator-999",
            store_id: "store-456",
            status: "active",
          })),
        };
      }
      return {
        select: vi.fn(() => createChainableQuery(null)),
      };
    });

    await expect(
      updateClassifiedStatus({
        data: {
          id: "00000000-0000-0000-0000-000000000001",
          status: "paused",
        },
      })
    ).rejects.toThrow("Você não tem permissão para alterar o estado deste anúncio.");
  }, 15000);

  it("4. Deve permitir exclusão de anúncio pelo dono da loja associada", async () => {
    const result = await deleteClassified({
      data: "00000000-0000-0000-0000-000000000001",
    });

    expect(result.success).toBe(true);
  }, 15000);
});
