import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// MOCKS DO CREATE_SERVER_FN E SERVIDOR
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

const mockAdminUser = {
  id: "00000000-0000-0000-0000-000000000001",
  userId: "00000000-0000-0000-0000-000000000001",
  role: "platform_admin",
  store_id: null,
  storeId: null,
  isPlatformAdmin: true,
  isCivilContext: false,
  activeContext: "platform",
  memberships: [],
};

let currentTestIdentity: any = mockAdminUser;

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn(async () => currentTestIdentity),
}));

vi.mock("@tanstack/start-server-core", () => ({
  getRequest: vi.fn(() => ({
    headers: new Headers({
      "cf-connecting-ip": "177.136.240.10",
      "user-agent": "AdversarialTest/1.0",
      "cf-ipcity": "Chapecó",
      "cf-region": "SC",
      "cf-ipcountry": "BR",
    }),
  })),
}));

const capturedDbInserts: Record<string, any[]> = {
  user_cart_telemetry: [],
  employee_tenant_audit_logs: [],
  user_form_submissions_log: [],
  forensic_audit_events: [],
  user_moderation_sanctions: [],
};

function createMockQueryBuilder(tableName: string) {
  const state = {
    filters: [] as any[],
    insertedRow: null as any,
  };

  const builder: any = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    neq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    single: vi.fn(async () => {
      if (state.insertedRow) return { data: state.insertedRow, error: null };
      if (tableName === "profiles") {
        return {
          data: {
            id: "11111111-1111-1111-1111-111111111111",
            full_name: "Usuario Teste",
            email: "user@waesy.test",
            tax_id: "123.456.789-00",
            role: "customer",
          },
          error: null,
        };
      }
      if (tableName === "stores") {
        return {
          data: {
            id: "33333333-3333-3333-3333-333333333333",
            name: "Loja Teste",
            slug: "loja-teste",
            owner_id: "11111111-1111-1111-1111-111111111111",
            settings: {},
          },
          error: null,
        };
      }
      return { data: null, error: { message: "Not found" } };
    }),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    insert: vi.fn((payload: any) => {
      const row = {
        id: `mock_${Date.now()}`,
        created_at: new Date().toISOString(),
        ...(Array.isArray(payload) ? payload[0] : payload),
      };
      if (!capturedDbInserts[tableName]) capturedDbInserts[tableName] = [];
      capturedDbInserts[tableName].push(row);
      state.insertedRow = row;
      return builder;
    }),
    update: vi.fn(() => builder),
    upsert: vi.fn(async () => ({ error: null })),
    then: (resolve: any, reject?: any) => {
      if (state.insertedRow) {
        return Promise.resolve({ data: state.insertedRow, error: null }).then(resolve, reject);
      }
      return Promise.resolve({ data: [], error: null }).then(resolve, reject);
    },
    catch: (fn: any) => Promise.resolve().catch(fn),
  };
  return builder;
}

vi.mock("@/lib/supabase", () => ({
  getServerClient: vi.fn(() => ({
    from: vi.fn((tableName: string) => createMockQueryBuilder(tableName)),
    auth: {
      admin: {
        getUserById: vi.fn(async (id: string) => ({
          data: { user: { id, email: "admin@usewaesy.com" } },
          error: null,
        })),
        updateUserById: vi.fn(async (id: string, attrs: any) => ({
          data: { user: { id, ...attrs } },
          error: null,
        })),
      },
    },
  })),
}));

import {
  computeSha256Digest,
  getUserFull360ActivityInput,
  adminForceSetUserPasswordInput,
  adminTransferStoreOwnershipInput,
  adminToggleUserAccessInput,
  recordFormSubmissionAuditInput,
  recordCartTelemetryEventInput,
  recordStaffActionLogInput,
  getMyActivityHistoryInput,
  recordCartTelemetryEvent,
  recordStaffActionLog,
  recordFormSubmissionAudit,
  adminTransferStoreOwnership,
  adminToggleUserAccess,
  getMyActivityHistory,
} from "./admin-360-governance.functions";

describe("Adversarial Empirical Challenges — admin-360-governance.functions", () => {
  beforeEach(() => {
    currentTestIdentity = mockAdminUser;
    Object.keys(capturedDbInserts).forEach((k) => (capturedDbInserts[k] = []));
  });

  // ==========================================================================
  // CHALLENGE 1: SHA-256 DETERMINISM & COLLISION RESISTANCE
  // ==========================================================================
  describe("Challenge 1: SHA-256 Cryptographic Hash Engine", () => {
    it("produz hashes 100% idênticos para a mesma entrada em 500 iterações (determinismo estrito)", async () => {
      const fixedPayload = {
        userId: "11111111-1111-1111-1111-111111111111",
        cart: [{ id: "p-1", qty: 2 }],
        meta: { timestamp: "2026-10-05T00:00:00Z" },
      };
      const initialHash = await computeSha256Digest(fixedPayload);

      for (let i = 0; i < 500; i++) {
        const nextHash = await computeSha256Digest(fixedPayload);
        expect(nextHash).toBe(initialHash);
      }
    });

    it("produz hashes únicos com zero colisões em 1.000 entradas com mutações mínimas de 1 bit/char", async () => {
      const hashes = new Set<string>();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const mutatedPayload = {
          seq: i,
          entropy: `seed_${i}_${(i * 31) % 997}`,
          status: i % 2 === 0 ? "active" : "pending",
        };
        const hash = await computeSha256Digest(mutatedPayload);
        expect(hash).toHaveLength(64);
        expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
        hashes.add(hash);
      }

      expect(hashes.size).toBe(iterations); // Zero colisões
    });

    it("avalia comportamento sob ordenação de chaves em objetos (Key Ordering Sensitivity)", async () => {
      const objA = { alpha: 1, beta: 2 };
      const objB = { beta: 2, alpha: 1 };

      const hashA = await computeSha256Digest(objA);
      const hashB = await computeSha256Digest(objB);

      // JSON.stringify é dependente de ordem de chaves
      expect(hashA).not.toBe(hashB);
    });

    it("processa primitivos, null e string vazia sem lançar exceções não tratadas", async () => {
      const hNull = await computeSha256Digest(null);
      const hEmpty = await computeSha256Digest("");
      const hZero = await computeSha256Digest(0);
      const hFalse = await computeSha256Digest(false);

      expect(hNull).toHaveLength(64);
      expect(hEmpty).toHaveLength(64);
      expect(hZero).toHaveLength(64);
      expect(hFalse).toHaveLength(64);
      expect(new Set([hNull, hEmpty, hZero, hFalse]).size).toBe(4);
    });
  });

  // ==========================================================================
  // CHALLENGE 2: INVARIANTE B.25 — PAYLOAD VS METADATA ALIASING DEFECT
  // ==========================================================================
  describe("Challenge 2: Invariante B.25 — Aliasing e Coalescência Defensiva", () => {
    it("EMPIRICAL CHECK: recordCartTelemetryEvent quando invocado apenas com 'payload' (sem 'metadata')", async () => {
      // Invocação passando payload customizado e omitindo metadata
      const res = await recordCartTelemetryEvent({
        data: {
          storeId: "33333333-3333-3333-3333-333333333333",
          action: "item_added",
          payload: { customKey: "valor_critico", coupon: "DESC10" },
        },
      });

      expect(res.success).toBe(true);

      const inserted = capturedDbInserts.user_cart_telemetry[0];
      expect(inserted).toBeDefined();

      // OBSERVAÇÃO ADVERSARIAL:
      // Se metadata possui .default({}), metadata torna-se {} e safePayload = metadata ?? payload ?? {} resulta em {}!
      // Comprovado empiricamente: inserted.payload é {} em vez de preservar os dados enviados!
      expect(inserted.payload).toEqual({ customKey: "valor_critico", coupon: "DESC10" });
    });

    it("EMPIRICAL CHECK: recordStaffActionLog quando invocado apenas com 'metadata' (sem 'details')", async () => {
      const res = await recordStaffActionLog({
        data: {
          storeId: "33333333-3333-3333-3333-333333333333",
          module: "fiscal",
          action: "emissao_nfe",
          metadata: { chave_nfe: "42261000000000000000000000000000000000000000" },
        },
      });

      expect(res.success).toBe(true);

      const inserted = capturedDbInserts.employee_tenant_audit_logs[0];
      expect(inserted).toBeDefined();

      // Comprovado empiricamente: inserted.details é {} em vez de preservar os dados enviados!
      expect(inserted.details).toEqual({ chave_nfe: "42261000000000000000000000000000000000000000" });
    });
  });

  // ==========================================================================
  // CHALLENGE 3: EDGE CASES DE PARÂMETROS NULOS, VAZIOS E INVÁLIDOS
  // ==========================================================================
  describe("Challenge 3: Edge Cases em Todos os 8 Contratos", () => {
    it("adminTransferStoreOwnership falha graciosamente se newOwnerUserId e newOwnerId forem ambos omitidos", async () => {
      await expect(
        adminTransferStoreOwnership({
          data: {
            storeId: "33333333-3333-3333-3333-333333333333",
            reason: "Transferência sem novo titular fornecido",
          } as any,
        })
      ).rejects.toThrow(/ID do novo titular é obrigatório/);
    });

    it("adminTransferStoreOwnership aceita currentOwnerUserId como null", async () => {
      const res = await adminTransferStoreOwnership({
        data: {
          storeId: "33333333-3333-3333-3333-333333333333",
          newOwnerId: "11111111-1111-1111-1111-111111111111",
          currentOwnerUserId: null,
          reason: "Transferência com titular anterior nulo",
        },
      });
      expect(res.success).toBe(true);
    });

    it("adminToggleUserAccess aceita block=true ou blocked=true indiferentemente", async () => {
      const res1 = await adminToggleUserAccess({
        data: {
          userId: "11111111-1111-1111-1111-111111111111",
          block: true,
        },
      });
      expect(res1.status).toBe("blocked");

      const res2 = await adminToggleUserAccess({
        data: {
          userId: "11111111-1111-1111-1111-111111111111",
          blocked: false,
        },
      });
      expect(res2.status).toBe("active");
    });

    it("recordFormSubmissionAudit sanitiza múltiplas variações de campos sensíveis", async () => {
      await recordFormSubmissionAudit({
        data: {
          formType: "quote",
          route: "/orcamento",
          payload: {
            nome: "Usuario",
            user_password: "123",
            senha_acesso: "456",
            token_auth: "abc",
            api_secret: "def",
            card_cvv: "999",
            cardnumber: "4000123456789010",
            normalField: "visivel",
          },
        },
      });

      const inserted = capturedDbInserts.user_form_submissions_log[0];
      expect(inserted.sanitized_payload.user_password).toBe("[REDACTED]");
      expect(inserted.sanitized_payload.senha_acesso).toBe("[REDACTED]");
      expect(inserted.sanitized_payload.token_auth).toBe("[REDACTED]");
      expect(inserted.sanitized_payload.api_secret).toBe("[REDACTED]");
      expect(inserted.sanitized_payload.card_cvv).toBe("[REDACTED]");
      expect(inserted.sanitized_payload.cardnumber).toBe("[REDACTED]");
      expect(inserted.sanitized_payload.normalField).toBe("visivel");
    });

    it("getMyActivityHistory lida com entrada completamente vazia (undefined)", async () => {
      const res = await getMyActivityHistory({ data: undefined });
      expect(res).toBeDefined();
      expect(res.items).toEqual([]);
      expect(res.categories).toContain("all");
    });

    it("getMyActivityHistory valida limites extremos de paginação (limit=0 e limit=101 são rejeitados pelo Zod)", () => {
      expect(getMyActivityHistoryInput.safeParse({ limit: 0 }).success).toBe(false);
      expect(getMyActivityHistoryInput.safeParse({ limit: 101 }).success).toBe(false);
      expect(getMyActivityHistoryInput.safeParse({ limit: 1 }).success).toBe(true);
      expect(getMyActivityHistoryInput.safeParse({ limit: 100 }).success).toBe(true);
    });

    it("adminForceSetUserPasswordInput rejeita senhas com 7 caracteres e aceita com 8", () => {
      expect(
        adminForceSetUserPasswordInput.safeParse({
          userId: "11111111-1111-1111-1111-111111111111",
          newPassword: "1234567",
        }).success
      ).toBe(false);

      expect(
        adminForceSetUserPasswordInput.safeParse({
          userId: "11111111-1111-1111-1111-111111111111",
          newPassword: "12345678",
        }).success
      ).toBe(true);
    });
  });
});
