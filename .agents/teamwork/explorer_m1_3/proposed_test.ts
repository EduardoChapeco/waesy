/**
 * Workspace User View Preferences Vitest Suite
 * 
 * Cobertura de testes unitários:
 * 1. Validação estrita de Schemas Zod (PROJECT.md Interface Contract 1)
 * 2. Invariante B.25 (100% parâmetros desestruturados e variação de opcionais/nulos)
 * 3. Ciclo de vida BFF (get, save/upsert idempotente, reset)
 * 4. Isolamento Multi-Tenant e Zero-Trust (membros da loja e isolamento entre usuários)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// MOCK DO CREATE_SERVER_FN (@tanstack/react-start)
// ============================================================================
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any) => {
        const validated = schema ? schema.parse(args?.data) : args?.data;
        return fn({ data: validated });
      },
    }),
    handler: (fn: any) => async (args: any) => fn(args || {}),
  }),
}));

import {
  WorkspaceViewPreferenceSchema,
  GetWorkspaceViewPreferenceSchema,
  SaveWorkspaceViewPreferenceSchema,
  ResetWorkspaceViewPreferenceSchema,
  DEFAULT_VIEW_MODES,
  getWorkspaceViewPreference,
  saveWorkspaceViewPreference,
  resetWorkspaceViewPreference,
} from "../workspace-view-preferences.functions";

// ============================================================================
// ESTADO EM MEMÓRIA DO BANCO MOCKADO
// ============================================================================

interface MockPrefRow {
  id: string;
  store_id: string;
  user_id: string;
  module: string;
  view_mode: string;
  column_settings: Record<string, any>;
  sort_field: string | null;
  sort_direction: "asc" | "desc" | null;
  filters: Record<string, any>;
  created_at: string;
  updated_at: string;
}

let mockDbPreferences: MockPrefRow[] = [];

const STORE_A = "11111111-1111-1111-1111-111111111111";
const STORE_B = "22222222-2222-2222-2222-222222222222";
const USER_ALICE = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_BOB = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

let currentIdentity: any = {
  id: USER_ALICE,
  userId: USER_ALICE,
  role: "owner",
  store_id: STORE_A,
  memberships: [{ store_id: STORE_A, role: "owner" }],
};

// ============================================================================
// MOCKS DE SERVER ACCESS E SUPABASE
// ============================================================================

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn(async () => currentIdentity),
  assertStoreAccess: vi.fn((identity, roles) => {
    if (!identity || !identity.id) {
      throw new Error("Não autenticado");
    }
    const hasMembership = identity.store_id === STORE_A || 
      identity.memberships?.some((m: any) => m.store_id === STORE_A);
    if (!hasMembership) {
      throw new Error("Acesso negado: loja não autorizada");
    }
  }),
  STAFF_ROLES: ["owner", "admin", "manager", "seller", "stock", "finance", "content", "support"],
}));

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: (table: string) => {
      if (table !== "workspace_user_view_preferences") {
        throw new Error(`Tabela inesperada no mock: ${table}`);
      }

      return {
        select: (fields = "*") => ({
          eq: (col1: string, val1: any) => ({
            eq: (col2: string, val2: any) => ({
              eq: (col3: string, val3: any) => ({
                maybeSingle: async () => {
                  const row = mockDbPreferences.find(
                    (r: any) => r[col1] === val1 && r[col2] === val2 && r[col3] === val3
                  );
                  return { data: row ? { ...row } : null, error: null };
                },
                single: async () => {
                  const row = mockDbPreferences.find(
                    (r: any) => r[col1] === val1 && r[col2] === val2 && r[col3] === val3
                  );
                  if (!row) return { data: null, error: { message: "Registro não encontrado" } };
                  return { data: { ...row }, error: null };
                },
              }),
            }),
          }),
        }),
        upsert: (payload: any, options?: { onConflict?: string }) => {
          const rowData = Array.isArray(payload) ? payload[0] : payload;
          const idx = mockDbPreferences.findIndex(
            (r) => r.store_id === rowData.store_id && r.user_id === rowData.user_id && r.module === rowData.module
          );
          const now = new Date().toISOString();

          if (idx >= 0) {
            mockDbPreferences[idx] = {
              ...mockDbPreferences[idx],
              ...rowData,
              updated_at: now,
            };
            return {
              select: () => ({
                single: async () => ({
                  data: { ...mockDbPreferences[idx] },
                  error: null,
                }),
              }),
            };
          } else {
            const newRow: MockPrefRow = {
              id: `pref-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
              store_id: rowData.store_id,
              user_id: rowData.user_id,
              module: rowData.module,
              view_mode: rowData.view_mode,
              column_settings: rowData.column_settings || {},
              sort_field: rowData.sort_field || null,
              sort_direction: rowData.sort_direction || null,
              filters: rowData.filters || {},
              created_at: now,
              updated_at: now,
            };
            mockDbPreferences.push(newRow);
            return {
              select: () => ({
                single: async () => ({
                  data: { ...newRow },
                  error: null,
                }),
              }),
            };
          }
        },
        delete: () => ({
          eq: (col1: string, val1: any) => ({
            eq: (col2: string, val2: any) => ({
              eq: async (col3: string, val3: any) => {
                const initialLen = mockDbPreferences.length;
                mockDbPreferences = mockDbPreferences.filter(
                  (r: any) => !(r[col1] === val1 && r[col2] === val2 && r[col3] === val3)
                );
                return { error: null, count: initialLen - mockDbPreferences.length };
              },
            }),
          }),
        }),
      };
    },
  }),
}));

// ============================================================================
// SUÍTE DE TESTES
// ============================================================================

describe("Workspace User View Preferences — Testes de Contrato BFF & Invariantes", () => {
  beforeEach(() => {
    mockDbPreferences = [];
    currentIdentity = {
      id: USER_ALICE,
      userId: USER_ALICE,
      role: "owner",
      store_id: STORE_A,
      memberships: [{ store_id: STORE_A, role: "owner" }],
    };
    vi.clearAllMocks();
  });

  describe("1. Validação Estrita de Schemas Zod (Interface Contract 1)", () => {
    it("deve validar payload completo com todos os módulos operacionais", () => {
      const modules = ["agenda", "clientes", "pedidos", "tarefas", "financeiro", "turismo"] as const;
      for (const mod of modules) {
        const valid = WorkspaceViewPreferenceSchema.safeParse({
          store_id: STORE_A,
          module: mod,
          view_mode: "table",
          column_settings: { visible: ["name", "status"] },
          sort_field: "created_at",
          sort_direction: "desc",
          filters: { status: "active" },
        });
        expect(valid.success).toBe(true);
      }
    });

    it("deve validar payload para todos os modos de visualização", () => {
      const modes = ["table", "kanban", "cards", "calendar"] as const;
      for (const mode of modes) {
        const valid = WorkspaceViewPreferenceSchema.safeParse({
          store_id: STORE_A,
          module: "agenda",
          view_mode: mode,
        });
        expect(valid.success).toBe(true);
        if (valid.success) {
          expect(valid.data.column_settings).toEqual({});
          expect(valid.data.filters).toEqual({});
          expect(valid.data.sort_field).toBeNull();
          expect(valid.data.sort_direction).toBeNull();
        }
      }
    });

    it("deve rejeitar store_id que não seja UUID", () => {
      const invalid = WorkspaceViewPreferenceSchema.safeParse({
        store_id: "loja-invalida-123",
        module: "pedidos",
        view_mode: "kanban",
      });
      expect(invalid.success).toBe(false);
    });

    it("deve rejeitar módulo inválido ou não autorizado", () => {
      const invalid = WorkspaceViewPreferenceSchema.safeParse({
        store_id: STORE_A,
        module: "modulo_desconhecido",
        view_mode: "table",
      });
      expect(invalid.success).toBe(false);
    });

    it("deve rejeitar view_mode inválido", () => {
      const invalid = WorkspaceViewPreferenceSchema.safeParse({
        store_id: STORE_A,
        module: "pedidos",
        view_mode: "3d_space",
      });
      expect(invalid.success).toBe(false);
    });

    it("deve rejeitar sort_direction fora de asc/desc", () => {
      const invalid = WorkspaceViewPreferenceSchema.safeParse({
        store_id: STORE_A,
        module: "pedidos",
        view_mode: "table",
        sort_direction: "sideways",
      });
      expect(invalid.success).toBe(false);
    });
  });

  describe("2. Conformidade com Invariante B.25 (Variação de Parâmetros Presentes e Ausentes)", () => {
    it("deve persistir e desestruturar payload completo com todos os parâmetros presentes", async () => {
      const result = await saveWorkspaceViewPreference({
        data: {
          store_id: STORE_A,
          module: "pedidos",
          view_mode: "kanban",
          column_settings: { collapsed: ["done"] },
          sort_field: "priority",
          sort_direction: "asc",
          filters: { channel: "whatsapp" },
        },
      });

      expect(result.success).toBe(true);
      expect(result.data.store_id).toBe(STORE_A);
      expect(result.data.module).toBe("pedidos");
      expect(result.data.view_mode).toBe("kanban");
      expect(result.data.column_settings).toEqual({ collapsed: ["done"] });
      expect(result.data.sort_field).toBe("priority");
      expect(result.data.sort_direction).toBe("asc");
      expect(result.data.filters).toEqual({ channel: "whatsapp" });
    });

    it("deve aplicar tratamento defensivo quando parâmetros opcionais forem omitidos", async () => {
      const result = await saveWorkspaceViewPreference({
        data: {
          store_id: STORE_A,
          module: "clientes",
          view_mode: "cards",
        },
      });

      expect(result.success).toBe(true);
      expect(result.data.column_settings).toEqual({});
      expect(result.data.sort_field).toBeNull();
      expect(result.data.sort_direction).toBeNull();
      expect(result.data.filters).toEqual({});
    });

    it("deve aceitar parâmetros nulos explicitamente sem quebrar a execução", async () => {
      const result = await saveWorkspaceViewPreference({
        data: {
          store_id: STORE_A,
          module: "tarefas",
          view_mode: "table",
          sort_field: null,
          sort_direction: null,
        },
      });

      expect(result.success).toBe(true);
      expect(result.data.sort_field).toBeNull();
      expect(result.data.sort_direction).toBeNull();
    });
  });

  describe("3. Ciclo de Vida BFF e Idempotência (get / upsert / reset)", () => {
    it("deve retornar fallback canônico padrão se o usuário não possuir preferência salva", async () => {
      const pref = await getWorkspaceViewPreference({
        data: {
          store_id: STORE_A,
          module: "agenda",
        },
      });

      expect(pref.store_id).toBe(STORE_A);
      expect(pref.module).toBe("agenda");
      expect(pref.view_mode).toBe(DEFAULT_VIEW_MODES.agenda); // "calendar"
      expect(pref.column_settings).toEqual({});
    });

    it("deve atualizar idempotentemente uma preferência existente via upsert", async () => {
      // 1ª gravação: table
      await saveWorkspaceViewPreference({
        data: {
          store_id: STORE_A,
          module: "tarefas",
          view_mode: "table",
        },
      });

      expect(mockDbPreferences.length).toBe(1);
      expect(mockDbPreferences[0].view_mode).toBe("table");

      // 2ª gravação: alternância para kanban
      const updated = await saveWorkspaceViewPreference({
        data: {
          store_id: STORE_A,
          module: "tarefas",
          view_mode: "kanban",
        },
      });

      expect(mockDbPreferences.length).toBe(1); // Não duplicou a linha
      expect(updated.data.view_mode).toBe("kanban");
      expect(mockDbPreferences[0].view_mode).toBe("kanban");
    });

    it("deve resetar preferência para os padrões de fábrica do módulo", async () => {
      await saveWorkspaceViewPreference({
        data: {
          store_id: STORE_A,
          module: "pedidos",
          view_mode: "cards",
        },
      });
      expect(mockDbPreferences.length).toBe(1);

      const resetRes = await resetWorkspaceViewPreference({
        data: {
          store_id: STORE_A,
          module: "pedidos",
        },
      });

      expect(resetRes.success).toBe(true);
      expect(resetRes.defaultViewMode).toBe(DEFAULT_VIEW_MODES.pedidos);
      expect(mockDbPreferences.length).toBe(0);
    });
  });

  describe("4. Isolamento Multi-Tenant e Restrições de Segurança Zero-Trust", () => {
    it("deve impedir gravação se usuário não estiver autenticado", async () => {
      const { getServerIdentity } = await import("@/lib/server-access");
      vi.mocked(getServerIdentity).mockResolvedValueOnce(null as any);

      await expect(
        saveWorkspaceViewPreference({
          data: {
            store_id: STORE_A,
            module: "agenda",
            view_mode: "table",
          },
        })
      ).rejects.toThrow("Usuário não autenticado");
    });

    it("deve impedir acesso se o usuário não pertencer à loja requisitada (Store B)", async () => {
      const { assertStoreAccess } = await import("@/lib/server-access");
      vi.mocked(assertStoreAccess).mockImplementationOnce(() => {
        throw new Error("Acesso negado: loja não autorizada");
      });

      await expect(
        saveWorkspaceViewPreference({
          data: {
            store_id: STORE_B,
            module: "clientes",
            view_mode: "kanban",
          },
        })
      ).rejects.toThrow("Acesso negado: loja não autorizada");
    });

    it("deve isolar preferências entre dois usuários distintos na mesma loja", async () => {
      // Alice salva 'table' para pedidos
      await saveWorkspaceViewPreference({
        data: {
          store_id: STORE_A,
          module: "pedidos",
          view_mode: "table",
        },
      });

      // Alterna contexto para Bob
      currentIdentity = {
        id: USER_BOB,
        userId: USER_BOB,
        role: "admin",
        store_id: STORE_A,
        memberships: [{ store_id: STORE_A, role: "admin" }],
      };

      // Bob consulta pedidos -> deve receber o default porque Alice salvou para ela
      const bobPref = await getWorkspaceViewPreference({
        data: {
          store_id: STORE_A,
          module: "pedidos",
        },
      });
      expect(bobPref.view_mode).toBe(DEFAULT_VIEW_MODES.pedidos); // kanban default

      // Bob salva 'cards' para pedidos
      await saveWorkspaceViewPreference({
        data: {
          store_id: STORE_A,
          module: "pedidos",
          view_mode: "cards",
        },
      });

      // No banco devem existir duas preferências independentes para a mesma loja e mesmo módulo
      expect(mockDbPreferences.length).toBe(2);
      const aliceRow = mockDbPreferences.find((r) => r.user_id === USER_ALICE);
      const bobRow = mockDbPreferences.find((r) => r.user_id === USER_BOB);
      expect(aliceRow?.view_mode).toBe("table");
      expect(bobRow?.view_mode).toBe("cards");
    });
  });
});
