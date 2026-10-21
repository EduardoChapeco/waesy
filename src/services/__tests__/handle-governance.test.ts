/**
 * handle-governance.test.ts — Testes Unitários de Governança de Handle (@username), Quarentena de 30 Dias e Reivindicação Soberana
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do createServerFn do @tanstack/react-start
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

const mockAdminId = "99999999-9999-9999-9999-999999999999";
const mockUserId = "11111111-1111-1111-1111-111111111111";
const mockOtherUserId = "22222222-2222-2222-2222-222222222222";

let mockProfilesData: any[] = [];
let mockHistoryData: any[] = [];
let mockAuditLogs: any[] = [];
let mockNotifications: any[] = [];

function createMockDb() {
  return {
    from: (table: string) => {
      let currentData: any[] = [];
      if (table === "profiles") currentData = mockProfilesData;
      else if (table === "handle_history") currentData = mockHistoryData;
      else if (table === "session_audit_logs") currentData = mockAuditLogs;
      else if (table === "notifications") currentData = mockNotifications;

      let filterUsername: string | null = null;
      let filterInUsernames: string[] | null = null;
      let filterOldHandle: string | null = null;
      let filterInOldHandles: string[] | null = null;
      let filterId: string | null = null;
      let filterGtCreatedAt: string | null = null;

      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn((col: string, val: any) => {
          if (col === "username") filterUsername = val;
          if (col === "old_handle") filterOldHandle = val;
          if (col === "id") filterId = val;
          return chain;
        }),
        in: vi.fn((col: string, vals: any[]) => {
          if (col === "username") filterInUsernames = vals;
          if (col === "old_handle") filterInOldOldHandles: filterInOldHandles = vals;
          return chain;
        }),
        gt: vi.fn((col: string, val: any) => {
          if (col === "created_at") filterGtCreatedAt = val;
          return chain;
        }),
        or: vi.fn(() => chain),
        order: vi.fn(() => chain),
        limit: vi.fn(() => chain),
        maybeSingle: vi.fn(async () => {
          let found = null;
          if (table === "profiles") {
            if (filterUsername) found = currentData.find((p) => p.username === filterUsername);
            else if (filterId) found = currentData.find((p) => p.id === filterId);
          } else if (table === "handle_history") {
            if (filterOldHandle) {
              found = currentData.find((h) => {
                const matchHandle = h.old_handle === filterOldHandle;
                if (!matchHandle) return false;
                if (filterGtCreatedAt) return new Date(h.created_at) > new Date(filterGtCreatedAt);
                return true;
              });
            }
          }
          return { data: found || null, error: null };
        }),
        insert: vi.fn(async (rowOrRows: any) => {
          const items = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
          currentData.push(...items);
          return { data: items, error: null };
        }),
        update: vi.fn((updates: any) => ({
          eq: vi.fn(async (col: string, val: any) => {
            if (col === "id") {
              const item = currentData.find((p) => p.id === val);
              if (item) Object.assign(item, updates);
            }
            return { error: null };
          }),
        })),
        then: (resolve: any) => {
          let result = [...currentData];
          if (filterInUsernames) {
            result = result.filter((p) => filterInUsernames!.includes(p.username));
          }
          if (filterInOldHandles) {
            result = result.filter((h) => filterInOldHandles!.includes(h.old_handle));
          }
          resolve({ data: result, error: null });
        },
      };
      return chain;
    },
    auth: {
      admin: {
        updateUserById: vi.fn(async () => ({ data: { user: {} }, error: null })),
      },
    },
    rpc: vi.fn(async () => ({ data: { status: "success" }, error: null })),
  };
}

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => createMockDb(),
}));

let currentMockIdentity: any = {
  id: mockUserId,
  role: "customer",
  isPlatformAdmin: false,
};

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn(async () => currentMockIdentity),
  getSSRClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: currentMockIdentity.id } } })),
      updateUser: vi.fn(async () => ({ error: null })),
    },
  })),
}));

vi.mock("@/lib/network-telemetry.server", () => ({
  captureRequestTelemetry: vi.fn(() => ({
    ip: "189.100.20.10",
    deviceType: "desktop",
    geo: { city: "São Miguel do Oeste", state: "SC", country: "BR" },
  })),
  getRealClientIP: vi.fn(() => "189.100.20.10"),
}));

vi.mock("@tanstack/start-server-core", () => ({
  getRequest: vi.fn(() => new Request("http://localhost:3000")),
  setResponseHeader: vi.fn(),
}));

import {
  checkHandleAvailability,
  adminReclaimHandle,
  generateAvailableHandleSuggestions,
  RESERVED_SYSTEM_HANDLES,
} from "../auth.functions";

describe("Governança de Handles (@username), Quarentena e Proteção de Marca", () => {
  beforeEach(() => {
    mockProfilesData = [
      { id: mockUserId, full_name: "Eduardo Silva", username: "eduardo_smo", role: "customer" },
      { id: mockOtherUserId, full_name: "Carlos Andrade", username: "carlos_dev", role: "customer" },
    ];
    mockHistoryData = [];
    mockAuditLogs = [];
    mockNotifications = [];
    currentMockIdentity = {
      id: mockUserId,
      role: "customer",
      isPlatformAdmin: false,
    };
  });

  describe("Validação e Disponibilidade (checkHandleAvailability)", () => {
    it("rejeita handles com menos de 3 caracteres", async () => {
      const res = await checkHandleAvailability({
        data: { handle: "ed", fullName: "Eduardo Silva" },
      });
      expect(res.available).toBe(false);
      expect(res.reason).toContain("mínimo 3 caracteres");
      expect(res.suggestions.length).toBeGreaterThan(0);
    });

    it("rejeita handles reservados da plataforma (waesy, admin, etc)", async () => {
      const res = await checkHandleAvailability({
        data: { handle: "waesy", fullName: "Eduardo Silva" },
      });
      expect(res.available).toBe(false);
      expect(res.reason).toContain("reservado exclusivamente");
      expect(RESERVED_SYSTEM_HANDLES.has("waesy")).toBe(true);
    });

    it("detecta colisão com outro usuário existente e sugere alternativas", async () => {
      const res = await checkHandleAvailability({
        data: { handle: "carlos_dev", fullName: "Eduardo Silva", profileId: mockUserId },
      });
      expect(res.available).toBe(false);
      expect(res.reason).toContain("já está em uso por outro membro");
      expect(res.suggestions.length).toBeGreaterThan(0);
    });

    it("reconhece o próprio handle atual do usuário como disponível", async () => {
      const res = await checkHandleAvailability({
        data: { handle: "eduardo_smo", profileId: mockUserId },
      });
      expect(res.available).toBe(true);
      expect(res.isCurrent).toBe(true);
      expect(res.reason).toContain("já é o seu nome de usuário atual");
    });

    it("detecta quarentena de 30 dias de handle liberado por outro membro", async () => {
      // Carlos alterou o handle ontem, deixando "carlos_antigo" em quarentena
      mockHistoryData.push({
        id: "hist-1",
        profile_id: mockOtherUserId,
        old_handle: "carlos_antigo",
        new_handle: "carlos_dev",
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 dias atrás
      });

      const res = await checkHandleAvailability({
        data: { handle: "carlos_antigo", profileId: mockUserId },
      });
      expect(res.available).toBe(false);
      expect(res.isQuarantined).toBe(true);
      expect(res.reason).toContain("quarentena");
      expect(res.daysRemaining).toBe(28);
    });

    it("permite ao titular original restaurar seu próprio handle em quarentena", async () => {
      mockHistoryData.push({
        id: "hist-2",
        profile_id: mockUserId,
        old_handle: "eduardo_original",
        new_handle: "eduardo_smo",
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const res = await checkHandleAvailability({
        data: { handle: "eduardo_original", profileId: mockUserId },
      });
      expect(res.available).toBe(true);
      expect(res.isRestorable).toBe(true);
      expect(res.reason).toContain("Você pode restaurá-lo");
    });

    it("aprova handle inédito e válido", async () => {
      const res = await checkHandleAvailability({
        data: { handle: "novo_membro_2026", fullName: "Novo Membro" },
      });
      expect(res.available).toBe(true);
      expect(res.isQuarantined).toBe(false);
      expect(res.reason).toContain("Disponível para uso");
    });
  });

  describe("Gerador de 5 Sugestões Atômicas (generateAvailableHandleSuggestions)", () => {
    it("gera até 5 sugestões válidas, livres e sem conflito de caracteres", async () => {
      const suggestions = await generateAvailableHandleSuggestions("eduardo", "Eduardo Silva", 5);
      expect(suggestions.length).toBeLessThanOrEqual(5);
      expect(suggestions.length).toBeGreaterThan(0);
      for (const sug of suggestions) {
        expect(sug).toMatch(/^[a-z0-9_]{3,30}$/);
        expect(RESERVED_SYSTEM_HANDLES.has(sug)).toBe(false);
      }
    });
  });

  describe("Ação Soberana do Admin Master (adminReclaimHandle)", () => {
    it("bloqueia chamadas de usuários civis não-admin", async () => {
      currentMockIdentity = { id: mockUserId, role: "customer", isPlatformAdmin: false };
      await expect(
        adminReclaimHandle({
          data: {
            targetProfileId: mockOtherUserId,
            claimedHandle: "carlos_dev",
            newHandleForTarget: "carlos_civil",
            action: "reassign_and_reserve",
            reason: "Uso oficial da marca pela administração",
          },
        }),
      ).rejects.toThrow("Acesso restrito");
    });

    it("permite ao platform_admin reivindicar handle com registro auditado e notificação formal", async () => {
      currentMockIdentity = { id: mockAdminId, role: "platform_admin", isPlatformAdmin: true };

      const res = await adminReclaimHandle({
        data: {
          targetProfileId: mockOtherUserId,
          claimedHandle: "carlos_dev",
          newHandleForTarget: "carlos_civil",
          action: "reassign_and_reserve",
          reason: "Direito de Marca Registrada Waesy",
          trademarkNotice: "Seu @ anterior foi reivindicado por motivos legais de marca registrada.",
        },
      });

      expect(res.status).toBe("success");
      expect(res.claimedHandle).toBe("carlos_dev");
      expect(res.newHandle).toBe("carlos_civil");

      // Perfil foi atualizado
      const target = mockProfilesData.find((p) => p.id === mockOtherUserId);
      expect(target.username).toBe("carlos_civil");

      // Notificação in-app emitida
      expect(mockNotifications.length).toBe(1);
      expect(mockNotifications[0].profile_id).toBe(mockOtherUserId);
      expect(mockNotifications[0].title).toContain("Reivindicação de Nome de Usuário / Marca");

      // Log forense emitido
      expect(mockAuditLogs.length).toBe(1);
      expect(mockAuditLogs[0].event_type).toBe("admin_handle_reclaim");
    });
  });
});
