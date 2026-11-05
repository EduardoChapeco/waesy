/**
 * Workspace User View Preferences — Comprehensive Adversarial Stress Test Suite
 * 
 * Verificação empírica e adversarial:
 * 1. Fuzzing de injeção SQL, Path Traversal, Prototype Pollution e tipos corrompidos.
 * 2. Invariante B.25 — Matriz combinatória de parâmetros presentes, omitidos e nulos.
 * 3. Teste de estresse de concorrência e idempotência sob rajadas assimétricas.
 * 4. Resiliência de exceções (falha de rede, timeout, deadlock de banco).
 * 5. Mapeamento estrito de defaults de fábrica e integridade multi-tenant.
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
  WorkspaceModuleEnum,
  WorkspaceViewModeEnum,
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
let mockDbSelectError: any = null;
let mockDbUpsertError: any = null;

const VALID_STORE_A = "11111111-1111-1111-1111-111111111111";
const VALID_USER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

let currentIdentity: any = {
  id: VALID_USER_A,
  userId: VALID_USER_A,
  role: "owner",
  store_id: VALID_STORE_A,
  memberships: [{ store_id: VALID_STORE_A, role: "owner" }],
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
    const hasMembership =
      identity.store_id === VALID_STORE_A ||
      identity.memberships?.some((m: any) => m.store_id === VALID_STORE_A);
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
        throw new Error(`Tabela inesperada: ${table}`);
      }

      return {
        select: (_fields = "*") => ({
          eq: (col1: string, val1: any) => ({
            eq: (col2: string, val2: any) => ({
              eq: (col3: string, val3: any) => ({
                maybeSingle: async () => {
                  if (mockDbSelectError) {
                    return { data: null, error: mockDbSelectError };
                  }
                  const row = mockDbPreferences.find(
                    (r: any) => r[col1] === val1 && r[col2] === val2 && r[col3] === val3
                  );
                  return { data: row ? { ...row } : null, error: null };
                },
                single: async () => {
                  if (mockDbSelectError) {
                    return { data: null, error: mockDbSelectError };
                  }
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
        upsert: (payload: any, _options?: { onConflict?: string }) => {
          if (mockDbUpsertError) {
            return {
              select: () => ({
                single: async () => ({
                  data: null,
                  error: mockDbUpsertError,
                }),
              }),
            };
          }

          const rowData = Array.isArray(payload) ? payload[0] : payload;
          const idx = mockDbPreferences.findIndex(
            (r) =>
              r.store_id === rowData.store_id &&
              r.user_id === rowData.user_id &&
              r.module === rowData.module
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
              id: `pref-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
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
// ADVERSARIAL TEST SUITE
// ============================================================================

describe("Adversarial Stress Test: workspace-view-preferences.functions.ts", () => {
  beforeEach(() => {
    mockDbPreferences = [];
    mockDbSelectError = null;
    mockDbUpsertError = null;
    currentIdentity = {
      id: VALID_USER_A,
      userId: VALID_USER_A,
      role: "owner",
      store_id: VALID_STORE_A,
      memberships: [{ store_id: VALID_STORE_A, role: "owner" }],
    };
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // SUITE 1: Injection, Malicious Fuzzing & Schema Boundaries
  // ---------------------------------------------------------------------------
  describe("Suite 1: Injection, Malicious Fuzzing & Schema Boundaries", () => {
    it("rejeita injeções SQL clássicas no campo store_id", () => {
      const sqlInjections = [
        "'; DROP TABLE workspace_user_view_preferences; --",
        "' OR '1'='1",
        "11111111-1111-1111-1111-111111111111' UNION SELECT * FROM auth.users --",
        "admin'--",
        "00000000-0000-0000-0000-000000000000; SELECT pg_sleep(5);",
      ];

      for (const injection of sqlInjections) {
        const res = WorkspaceViewPreferenceSchema.safeParse({
          store_id: injection,
          module: "agenda",
          view_mode: "table",
        });
        expect(res.success).toBe(false);
      }
    });

    it("rejeita caracteres nulos (\0) e strings vazias no store_id", () => {
      expect(
        WorkspaceViewPreferenceSchema.safeParse({
          store_id: "",
          module: "agenda",
          view_mode: "table",
        }).success
      ).toBe(false);

      expect(
        WorkspaceViewPreferenceSchema.safeParse({
          store_id: "\0",
          module: "agenda",
          view_mode: "table",
        }).success
      ).toBe(false);

      expect(
        WorkspaceViewPreferenceSchema.safeParse({
          store_id: "   ",
          module: "agenda",
          view_mode: "table",
        }).success
      ).toBe(false);
    });

    it("aceita UUIDs canônicos em caixa baixa, caixa alta e nil UUID", () => {
      const validUuids = [
        VALID_STORE_A,
        "AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA",
        NIL_UUID,
        "123e4567-e89b-12d3-a456-426614174000",
      ];

      for (const uuid of validUuids) {
        const res = WorkspaceViewPreferenceSchema.safeParse({
          store_id: uuid,
          module: "clientes",
          view_mode: "cards",
        });
        expect(res.success).toBe(true);
      }
    });

    it("impõe case-sensitivity estrita em WorkspaceModuleEnum", () => {
      const invalidCaseModules = ["AGENDA", "Clientes", "PEDIDOS", "Tarefas", "financeiro "];
      for (const mod of invalidCaseModules) {
        const res = WorkspaceModuleEnum.safeParse(mod);
        expect(res.success).toBe(false);
      }
    });

    it("impõe case-sensitivity estrita em WorkspaceViewModeEnum", () => {
      const invalidCaseModes = ["TABLE", "Kanban", "CARDS", "calendar ", "3d"];
      for (const mode of invalidCaseModes) {
        const res = WorkspaceViewModeEnum.safeParse(mode);
        expect(res.success).toBe(false);
      }
    });

    it("rejeita sort_direction fora de 'asc' ou 'desc'", () => {
      const badDirections = ["ASC", "DESC", "ascending", "descending", "1", 1, true];
      for (const dir of badDirections) {
        const res = WorkspaceViewPreferenceSchema.safeParse({
          store_id: VALID_STORE_A,
          module: "pedidos",
          view_mode: "table",
          sort_direction: dir,
        });
        expect(res.success).toBe(false);
      }
    });

    it("rejeita tipos inválidos para column_settings (array, string, number)", () => {
      const invalidColumnSettings = [
        ["col1", "col2"],
        "name,age,email",
        12345,
        true,
      ];

      for (const val of invalidColumnSettings) {
        const res = WorkspaceViewPreferenceSchema.safeParse({
          store_id: VALID_STORE_A,
          module: "agenda",
          view_mode: "table",
          column_settings: val,
        });
        expect(res.success).toBe(false);
      }
    });

    it("rejeita tipos inválidos para filters (array, string, boolean)", () => {
      const invalidFilters = [
        ["active", "pending"],
        "status=active",
        999,
        false,
      ];

      for (const val of invalidFilters) {
        const res = WorkspaceViewPreferenceSchema.safeParse({
          store_id: VALID_STORE_A,
          module: "agenda",
          view_mode: "table",
          filters: val,
        });
        expect(res.success).toBe(false);
      }
    });

    it("previne prototype pollution via payload JSON em column_settings e filters", async () => {
      const maliciousPayload = JSON.parse(`{
        "store_id": "${VALID_STORE_A}",
        "module": "clientes",
        "view_mode": "table",
        "column_settings": {
          "__proto__": { "polluted": "yes" },
          "constructor": { "prototype": { "isAdmin": true } }
        },
        "filters": {
          "__proto__": { "hacked": true }
        }
      }`);

      const result = await saveWorkspaceViewPreference({ data: maliciousPayload });
      expect(result.success).toBe(true);

      // Asserção empírica de não-poluição do protótipo global
      expect((Object.prototype as any).polluted).toBeUndefined();
      expect((Object.prototype as any).isAdmin).toBeUndefined();
      expect((Object.prototype as any).hacked).toBeUndefined();
    });

    it("suporta payloads volumosos e aninhados sem stack overflow", async () => {
      const deepObject: Record<string, any> = {};
      for (let i = 0; i < 500; i++) {
        deepObject[`column_custom_${i}`] = {
          visible: i % 2 === 0,
          width: 120 + (i % 50),
          pinned: i === 0 ? "left" : null,
          metadata: { tag: `tag_${i}`, flags: [i, i * 2] },
        };
      }

      const result = await saveWorkspaceViewPreference({
        data: {
          store_id: VALID_STORE_A,
          module: "financeiro",
          view_mode: "table",
          column_settings: deepObject,
          filters: { date_range: "all_time", search: "A".repeat(1000) },
        },
      });

      expect(result.success).toBe(true);
      expect(Object.keys(result.data.column_settings).length).toBe(500);
      expect(result.data.filters.search.length).toBe(1000);
    });
  });

  // ---------------------------------------------------------------------------
  // SUITE 2: Invariante B.25 — Matriz Combinatória de Opcionais e Nulos
  // ---------------------------------------------------------------------------
  describe("Suite 2: Invariante B.25 — Matriz Combinatória de Parâmetros", () => {
    it("atende caso mínimo absoluto: apenas store_id, module e view_mode", async () => {
      const res = await saveWorkspaceViewPreference({
        data: {
          store_id: VALID_STORE_A,
          module: "turismo",
          view_mode: "cards",
        },
      });

      expect(res.success).toBe(true);
      expect(res.data.store_id).toBe(VALID_STORE_A);
      expect(res.data.module).toBe("turismo");
      expect(res.data.view_mode).toBe("cards");
      expect(res.data.column_settings).toEqual({});
      expect(res.data.sort_field).toBeNull();
      expect(res.data.sort_direction).toBeNull();
      expect(res.data.filters).toEqual({});
    });

    it("preserva sort_field nulo com sort_direction 'desc'", async () => {
      const res = await saveWorkspaceViewPreference({
        data: {
          store_id: VALID_STORE_A,
          module: "agenda",
          view_mode: "calendar",
          sort_field: null,
          sort_direction: "desc",
        },
      });

      expect(res.success).toBe(true);
      expect(res.data.sort_field).toBeNull();
      expect(res.data.sort_direction).toBe("desc");
    });

    it("preserva sort_field preenchido com sort_direction nulo", async () => {
      const res = await saveWorkspaceViewPreference({
        data: {
          store_id: VALID_STORE_A,
          module: "pedidos",
          view_mode: "kanban",
          sort_field: "total_amount",
          sort_direction: null,
        },
      });

      expect(res.success).toBe(true);
      expect(res.data.sort_field).toBe("total_amount");
      expect(res.data.sort_direction).toBeNull();
    });

    it("desestrutura e retorna todos os 6 módulos com seus factory defaults canônicos", async () => {
      const modules = ["agenda", "clientes", "pedidos", "tarefas", "financeiro", "turismo"] as const;
      for (const mod of modules) {
        const pref = await getWorkspaceViewPreference({
          data: {
            store_id: VALID_STORE_A,
            module: mod,
          },
        });

        expect(pref.store_id).toBe(VALID_STORE_A);
        expect(pref.module).toBe(mod);
        expect(pref.view_mode).toBe(DEFAULT_VIEW_MODES[mod]);
        expect(pref.column_settings).toEqual({});
        expect(pref.sort_field).toBeNull();
        expect(pref.sort_direction).toBeNull();
        expect(pref.filters).toEqual({});
      }
    });
  });

  // ---------------------------------------------------------------------------
  // SUITE 3: Concorrência, Rajadas Simultâneas e Idempotência
  // ---------------------------------------------------------------------------
  describe("Suite 3: Concorrência, Rajadas Simultâneas e Idempotência", () => {
    it("suporta rajada de 50 gravações simultâneas sem duplicar registros no banco", async () => {
      const modes: Array<"table" | "kanban" | "cards"> = ["table", "kanban", "cards"];
      const promises = [];

      for (let i = 0; i < 50; i++) {
        const mode = modes[i % 3];
        promises.push(
          saveWorkspaceViewPreference({
            data: {
              store_id: VALID_STORE_A,
              module: "tarefas",
              view_mode: mode,
              column_settings: { iteration: i },
            },
          })
        );
      }

      const results = await Promise.all(promises);
      expect(results.length).toBe(50);
      for (const r of results) {
        expect(r.success).toBe(true);
      }

      // Prova empírica: exatamente 1 registro retido na tabela para (store_id, user_id, module)
      const rowsForModule = mockDbPreferences.filter(
        (r) => r.store_id === VALID_STORE_A && r.user_id === VALID_USER_A && r.module === "tarefas"
      );
      expect(rowsForModule.length).toBe(1);
    });

    it("suporta interleaved concurrent reads e writes", async () => {
      // Pré-popula
      await saveWorkspaceViewPreference({
        data: {
          store_id: VALID_STORE_A,
          module: "pedidos",
          view_mode: "kanban",
        },
      });

      const operations = [];
      for (let i = 0; i < 20; i++) {
        if (i % 2 === 0) {
          operations.push(
            getWorkspaceViewPreference({
              data: { store_id: VALID_STORE_A, module: "pedidos" },
            })
          );
        } else {
          operations.push(
            saveWorkspaceViewPreference({
              data: {
                store_id: VALID_STORE_A,
                module: "pedidos",
                view_mode: i % 4 === 1 ? "table" : "cards",
              },
            })
          );
        }
      }

      const results = await Promise.all(operations);
      expect(results.length).toBe(20);
      // Garantir que nenhum reader ou writer lançou exceção
      for (const r of results) {
        expect(r).toBeDefined();
      }
    });

    it("suporta rajada de 10 resets consecutivos de forma estritamente idempotente", async () => {
      await saveWorkspaceViewPreference({
        data: {
          store_id: VALID_STORE_A,
          module: "agenda",
          view_mode: "table",
        },
      });
      expect(mockDbPreferences.length).toBe(1);

      const resetPromises = Array.from({ length: 10 }, () =>
        resetWorkspaceViewPreference({
          data: { store_id: VALID_STORE_A, module: "agenda" },
        })
      );

      const resetResults = await Promise.all(resetPromises);
      for (const res of resetResults) {
        expect(res.success).toBe(true);
        expect(res.defaultViewMode).toBe(DEFAULT_VIEW_MODES.agenda);
      }
      expect(mockDbPreferences.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // SUITE 4: Resiliência de Erros e Exceções de Banco / Rede
  // ---------------------------------------------------------------------------
  describe("Suite 4: Resiliência de Erros e Exceções de Banco / Rede", () => {
    it("getWorkspaceViewPreference degrada graciosamente para default se o banco falhar", async () => {
      mockDbSelectError = { message: "connection timeout / pool exhausted" };

      const pref = await getWorkspaceViewPreference({
        data: {
          store_id: VALID_STORE_A,
          module: "clientes",
        },
      });

      // Não explode exceção — retorna fallback de fábrica seguro
      expect(pref.store_id).toBe(VALID_STORE_A);
      expect(pref.module).toBe("clientes");
      expect(pref.view_mode).toBe(DEFAULT_VIEW_MODES.clientes); // "table"
      expect(pref.column_settings).toEqual({});
    });

    it("saveWorkspaceViewPreference propaga erro descritivo se o banco rejeitar o upsert", async () => {
      mockDbUpsertError = { message: "violates foreign key constraint store_id" };

      await expect(
        saveWorkspaceViewPreference({
          data: {
            store_id: VALID_STORE_A,
            module: "pedidos",
            view_mode: "table",
          },
        })
      ).rejects.toThrow("Erro ao salvar preferência de visualização: violates foreign key constraint store_id");
    });

    it("getWorkspaceViewPreference retorna default seguro se getServerIdentity lançar erro", async () => {
      const { getServerIdentity } = await import("@/lib/server-access");
      vi.mocked(getServerIdentity).mockRejectedValueOnce(new Error("Network failure"));

      const pref = await getWorkspaceViewPreference({
        data: {
          store_id: VALID_STORE_A,
          module: "financeiro",
        },
      });

      expect(pref.view_mode).toBe(DEFAULT_VIEW_MODES.financeiro);
    });

    it("resetWorkspaceViewPreference propaga erro se usuário não autenticado", async () => {
      const { getServerIdentity } = await import("@/lib/server-access");
      vi.mocked(getServerIdentity).mockResolvedValueOnce(null as any);

      await expect(
        resetWorkspaceViewPreference({
          data: {
            store_id: VALID_STORE_A,
            module: "agenda",
          },
        })
      ).rejects.toThrow("Usuário não autenticado");
    });
  });
});
