import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateSlug, resolveUniqueStoreSlug } from "@/lib/slug-utils";

// Mock @tanstack/react-start
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any) => fn({ data: schema ? schema.parse(args?.data) : args?.data }),
    }),
    handler: (fn: any) => async (args: any) => fn(args || {}),
  }),
}));

// Mock @tanstack/start-server-core cookies
const mockSetCookie = vi.fn();
vi.mock("@tanstack/start-server-core", () => ({
  setCookie: (...args: any[]) => mockSetCookie(...args),
}));

// Mock server-access
let mockIdentityId: string | null = "00000000-0000-0000-0000-111111111111";
let mockIdentityRole: string = "customer";
const mockClearIdentityCache = vi.fn();

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn(async () => {
    if (!mockIdentityId) throw new Error("Sessão não autenticada");
    return {
      id: mockIdentityId,
      email: "test-owner@waesy.test",
      role: mockIdentityRole,
    };
  }),
  getSSRClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: mockIdentityId ? { id: mockIdentityId, email: "test-owner@waesy.test" } : null },
      })),
    },
  })),
  clearIdentityCache: () => mockClearIdentityCache(),
}));

describe("MICROFASE 2 — Resolução de Onboarding e Validação de Tenant na Criação de Lojas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIdentityId = "00000000-0000-0000-0000-111111111111";
    mockIdentityRole = "customer";
  });

  describe("1. Geração Determinística e Resolução de Slugs Sem Números Aleatórios", () => {
    it("deve gerar slug limpo e elegante a partir de nome com acentos e caracteres especiais", () => {
      const slug = generateSlug("Café & Restaurante São Bento #1!");
      expect(slug).toBe("cafe-restaurante-sao-bento-1");
      expect(slug).not.toMatch(/-[0-9]{4,}$/); // Sem números aleatórios de 4+ dígitos
    });

    it("deve resolver slug sem colisão diretamente no banco", async () => {
      const mockDb = {
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              neq: () => ({
                maybeSingle: async () => ({ data: null }),
              }),
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        }),
      };

      const resolved = await resolveUniqueStoreSlug(mockDb, "Pizzaria Bella Napoli");
      expect(resolved).toBe("pizzaria-bella-napoli");
    });

    it("deve incrementar deterministamente (-2, -3) quando houver colisão de slug sem randoms", async () => {
      let callCount = 0;
      const mockDb = {
        from: (table: string) => ({
          select: () => ({
            eq: (_col: string, val: string) => ({
              neq: () => ({
                maybeSingle: async () => {
                  if (val === "padaria-central") return { data: { id: "existing-store" } };
                  if (val === "padaria-central-2") return { data: { id: "existing-store-2" } };
                  return { data: null };
                },
              }),
              maybeSingle: async () => {
                if (val === "padaria-central") return { data: { id: "existing-store" } };
                if (val === "padaria-central-2") return { data: { id: "existing-store-2" } };
                return { data: null };
              },
            }),
          }),
        }),
      };

      const resolved = await resolveUniqueStoreSlug(mockDb, "Padaria Central");
      expect(resolved).toBe("padaria-central-3");
    });
  });

  describe("2. Contrato BFF createStore — Blindagem Atômica e Anti-Zombie Store", () => {
    it("deve rejeitar chamada de criação de loja se a sessão não estiver autenticada", async () => {
      mockIdentityId = null;
      const { createStore } = await import("@/services/identity.functions");

      await expect(
        createStore({
          data: {
            name: "Loja Não Autorizada",
            type: "retail",
          },
        })
      ).rejects.toThrow("Sessão não autenticada");
    });

    it("deve rejeitar criação com nome menor que 2 caracteres via validação Zod", async () => {
      const { createStore } = await import("@/services/identity.functions");

      await expect(
        createStore({
          data: {
            name: "A",
            type: "retail",
          },
        })
      ).rejects.toThrow();
    });

    it("deve provisionar loja atomicamente vinculando context_profile_id e workspace_members com role: 'owner'", async () => {
      const insertedOrg: any[] = [];
      const insertedStore: any[] = [];
      const insertedMembers: any[] = [];
      const profileUpdates: any[] = [];

      const mockClient = {
        from: (table: string) => {
          if (table === "profiles") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { id: mockIdentityId, role: "customer" } }),
                }),
              }),
              update: (payload: any) => ({
                eq: (_col: string, id: string) => {
                  profileUpdates.push({ id, ...payload });
                  return Promise.resolve({ error: null });
                },
              }),
            };
          }
          if (table === "organizations") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null }),
                }),
              }),
              insert: (payload: any) => {
                const org = { id: "00000000-0000-0000-0000-org000000001", ...payload };
                insertedOrg.push(org);
                return {
                  select: () => ({
                    single: async () => ({ data: org, error: null }),
                  }),
                };
              },
            };
          }
          if (table === "stores") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null }),
                }),
              }),
              insert: (payload: any) => {
                const store = { id: "00000000-0000-0000-0000-store00000001", ...payload };
                insertedStore.push(store);
                return {
                  select: () => ({
                    single: async () => ({ data: store, error: null }),
                  }),
                };
              },
            };
          }
          if (table === "workspace_members") {
            return {
              upsert: async (payload: any) => {
                insertedMembers.push(payload);
                return { error: null };
              },
            };
          }
          return {};
        },
      };

      vi.doMock("@/lib/supabase", () => ({
        getServerClient: () => mockClient,
      }));

      const { createStore } = await import("@/services/identity.functions");

      const res = await createStore({
        data: {
          name: "Padaria Doce Trigo",
          type: "gastronomy",
          city: "Chapecó",
          state: "SC",
        },
      });

      expect(res.success).toBe(true);
      expect(res.storeId).toBe("00000000-0000-0000-0000-store00000001");
      expect(res.storeSlug).toBe("padaria-doce-trigo");

      // 1. Prova de context_profile_id e is_active no store
      expect(insertedStore.length).toBe(1);
      expect(insertedStore[0].context_profile_id).toBe(mockIdentityId);
      expect(insertedStore[0].is_active).toBe(true);
      expect(insertedStore[0].slug).toBe("padaria-doce-trigo");

      // 2. Prova de vínculo de owner em workspace_members
      expect(insertedMembers.length).toBe(1);
      expect(insertedMembers[0].profile_id).toBe(mockIdentityId);
      expect(insertedMembers[0].user_id).toBe(mockIdentityId);
      expect(insertedMembers[0].role).toBe("owner");
      expect(insertedMembers[0].is_active).toBe(true);
      expect(insertedMembers[0].store_id).toBe("00000000-0000-0000-0000-store00000001");

      // 3. Prova de atualização de role para owner no perfil
      expect(profileUpdates.length).toBe(1);
      expect(profileUpdates[0].role).toBe("owner");

      // 4. Prova de gravação dos cookies de tenant ativo
      expect(mockSetCookie).toHaveBeenCalledWith(
        "waesy_active_context",
        "store",
        expect.objectContaining({ path: "/" })
      );
      expect(mockSetCookie).toHaveBeenCalledWith(
        "waesy_active_tenant",
        "00000000-0000-0000-0000-store00000001",
        expect.objectContaining({ path: "/" })
      );
    });

    it("deve executar ROLLBACK ATÔMICO eliminando store e organization caso o vínculo em workspace_members falhe", async () => {
      const deletedStores: string[] = [];
      const deletedOrgs: string[] = [];

      const mockClient = {
        from: (table: string) => {
          if (table === "profiles") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { id: mockIdentityId, role: "owner" } }),
                }),
              }),
            };
          }
          if (table === "organizations") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null }),
                }),
              }),
              insert: (payload: any) => ({
                select: () => ({
                  single: async () => ({
                    data: { id: "org-to-rollback", ...payload },
                    error: null,
                  }),
                }),
              }),
              delete: () => ({
                eq: (_col: string, id: string) => {
                  deletedOrgs.push(id);
                  return Promise.resolve({ error: null });
                },
              }),
            };
          }
          if (table === "stores") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: null }),
                }),
              }),
              insert: (payload: any) => ({
                select: () => ({
                  single: async () => ({
                    data: { id: "store-to-rollback", ...payload },
                    error: null,
                  }),
                }),
              }),
              delete: () => ({
                eq: (_col: string, id: string) => {
                  deletedStores.push(id);
                  return Promise.resolve({ error: null });
                },
              }),
            };
          }
          if (table === "workspace_members") {
            return {
              upsert: async () => ({
                error: new Error("Simulação de falha de foreign key ou deadlock em workspace_members"),
              }),
            };
          }
          return {};
        },
      };

      vi.doMock("@/lib/supabase", () => ({
        getServerClient: () => mockClient,
      }));

      const { createStore } = await import("@/services/identity.functions");

      await expect(
        createStore({
          data: {
            name: "Loja com Falha de Vínculo",
            type: "retail",
          },
        })
      ).rejects.toThrow("A loja não foi ativada porque o vínculo seguro do proprietário falhou");

      // Verificação de Rollback: ZERO lojas ou organizações órfãs deixadas no banco
      expect(deletedStores).toContain("store-to-rollback");
      expect(deletedOrgs).toContain("org-to-rollback");
    });
  });
});
