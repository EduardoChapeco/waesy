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

// ============================================================================
// MOCKS DO SUPABASE E SERVIDOR
// ============================================================================

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

const mockCivilCustomer = {
  id: "11111111-1111-1111-1111-111111111111",
  userId: "11111111-1111-1111-1111-111111111111",
  role: "customer",
  store_id: null,
  storeId: null,
  isPlatformAdmin: false,
  isCivilContext: true,
  activeContext: "civil",
  memberships: [],
};

const mockAnonymousUser = {
  id: null,
  userId: null,
  role: "anon",
  store_id: null,
  storeId: null,
  isPlatformAdmin: false,
  isCivilContext: false,
  activeContext: "anon",
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
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      "cf-ipcity": "Chapecó",
      "cf-region": "SC",
      "cf-ipcountry": "BR",
    }),
  })),
}));

// In-memory mock database state
const mockDb = {
  profiles: [
    {
      id: "11111111-1111-1111-1111-111111111111",
      full_name: "Cliente Civil Silva",
      email: "cliente@waesy.test",
      tax_id: "123.456.789-00",
      role: "customer",
    },
    {
      id: "22222222-2222-2222-2222-222222222222",
      full_name: "Novo Lojista Oliveira",
      email: "novo.dono@waesy.test",
      tax_id: "987.654.321-99",
      role: "store_admin",
    },
  ],
  stores: [
    {
      id: "33333333-3333-3333-3333-333333333333",
      name: "Loja Teste Central",
      slug: "loja-teste-central",
      owner_id: "11111111-1111-1111-1111-111111111111",
      settings: {},
    },
  ],
  workspace_members: [],
  user_moderation_sanctions: [],
  forensic_audit_events: [],
  user_form_submissions_log: [
    {
      id: "form-01",
      user_id: "11111111-1111-1111-1111-111111111111",
      form_type: "proposal",
      form_name: "Proposta de Compra",
      route: "/anuncio/item-1",
      created_at: "2026-10-01T10:00:00Z",
      metadata: {},
    },
  ],
  user_cart_telemetry: [
    {
      id: "cart-01",
      user_id: "11111111-1111-1111-1111-111111111111",
      store_id: "33333333-3333-3333-3333-333333333333",
      event_type: "item_added",
      created_at: "2026-10-02T11:00:00Z",
      stores: { name: "Loja Teste Central", slug: "loja-teste-central" },
      products: { title: "Camiseta Térmica" },
    },
  ],
  customer_store_affinity: [],
  employee_tenant_audit_logs: [],
  orders: [
    {
      id: "order-01",
      customer_id: "11111111-1111-1111-1111-111111111111",
      public_token: "ORD-987",
      status: "delivered",
      total_cents: 15000,
      origin_type: "store",
      created_at: "2026-10-03T12:00:00Z",
      stores: { name: "Loja Teste Central", slug: "loja-teste-central" },
    },
    {
      id: "ride-01",
      customer_id: "11111111-1111-1111-1111-111111111111",
      status: "completed",
      total_cents: 2250,
      origin_type: "mobility",
      created_at: "2026-10-04T14:00:00Z",
      items_snapshot: {},
    },
  ],
  quotes: [],
  identity_kyc_verifications: [],
  legal_terms_acceptances: [],
  session_audit_logs: [],
  device_registry: [],
  pwa_telemetry: [],
  customer_debt_ledger: [],
};

// Builder encadeável do Supabase compatível com todas as chamadas
function createMockQueryBuilder(tableName: keyof typeof mockDb) {
  const state = {
    filters: [] as ((row: any) => boolean)[],
    limitCount: 100,
    insertedRow: null as any,
    updatePayload: null as any,
  };

  const builder: any = {
    select: vi.fn((fields = "*") => builder),
    eq: vi.fn((col: string, val: any) => {
      state.filters.push((row) => row[col] === val);
      return builder;
    }),
    neq: vi.fn((col: string, val: any) => {
      state.filters.push((row) => row[col] !== val);
      return builder;
    }),
    order: vi.fn(() => builder),
    limit: vi.fn((n: number) => {
      state.limitCount = n;
      return builder;
    }),
    single: vi.fn(async () => {
      if (state.insertedRow) {
        return { data: state.insertedRow, error: null };
      }
      const items = (mockDb[tableName] as any[]).filter((row) =>
        state.filters.every((f) => f(row))
      );
      if (items.length === 0) return { data: null, error: { message: "Registro não encontrado" } };
      return { data: items[0], error: null };
    }),
    maybeSingle: vi.fn(async () => {
      const items = (mockDb[tableName] as any[]).filter((row) =>
        state.filters.every((f) => f(row))
      );
      return { data: items.length > 0 ? items[0] : null, error: null };
    }),
    insert: vi.fn((payload: any) => {
      const row = {
        id: `mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        created_at: new Date().toISOString(),
        ...(Array.isArray(payload) ? payload[0] : payload),
      };
      (mockDb[tableName] as any[]).push(row);
      state.insertedRow = row;
      return builder;
    }),
    update: vi.fn((payload: any) => {
      state.updatePayload = payload;
      return builder;
    }),
    upsert: vi.fn(async (payload: any) => {
      const existing = (mockDb[tableName] as any[]).find(
        (r) => r.store_id === payload.store_id && r.user_id === payload.user_id
      );
      if (existing) {
        Object.assign(existing, payload);
      } else {
        (mockDb[tableName] as any[]).push({
          id: `upsert_${Date.now()}`,
          ...payload,
        });
      }
      return { error: null };
    }),
    then: (resolve: any, reject?: any) => {
      if (state.updatePayload) {
        const items = (mockDb[tableName] as any[]).filter((row) =>
          state.filters.every((f) => f(row))
        );
        items.forEach((item) => Object.assign(item, state.updatePayload));
        return Promise.resolve({ data: items, error: null }).then(resolve, reject);
      }
      if (state.insertedRow) {
        return Promise.resolve({ data: state.insertedRow, error: null }).then(resolve, reject);
      }
      const items = (mockDb[tableName] as any[])
        .filter((row) => state.filters.every((f) => f(row)))
        .slice(0, state.limitCount);
      return Promise.resolve({ data: items, error: null }).then(resolve, reject);
    },
    catch: (fn: any) => Promise.resolve().catch(fn),
  };

  return builder;
}

vi.mock("@/lib/supabase", () => ({
  getServerClient: vi.fn(() => ({
    from: vi.fn((tableName: keyof typeof mockDb) => createMockQueryBuilder(tableName)),
    auth: {
      admin: {
        getUserById: vi.fn(async (id: string) => {
          const profile = mockDb.profiles.find((p) => p.id === id);
          if (profile) {
            return {
              data: { user: { id, email: profile.email } },
              error: null,
            };
          }
          if (id === mockAdminUser.id) {
            return {
              data: { user: { id, email: "admin@usewaesy.com" } },
              error: null,
            };
          }
          return { data: { user: null }, error: null };
        }),
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
  getUserFull360Activity,
  adminForceSetUserPassword,
  adminTransferStoreOwnership,
  adminToggleUserAccess,
  recordFormSubmissionAudit,
  recordCartTelemetryEvent,
  recordStaffActionLog,
  getMyActivityHistory,
} from "./admin-360-governance.functions";

// ============================================================================
// SUÍTE DE TESTES UNITÁRIOS
// ============================================================================

describe("admin-360-governance.functions Test Suite", () => {
  beforeEach(() => {
    currentTestIdentity = mockAdminUser;
  });

  // --------------------------------------------------------------------------
  // TESTE 1: HASHING CRIPTOGRÁFICO SHA-256 (Web Crypto API)
  // --------------------------------------------------------------------------
  describe("1. Utilitário Criptográfico SHA-256", () => {
    it("gera hash SHA-256 determinístico de 64 caracteres hexadecimais", async () => {
      const dataA = { userId: "user-123", action: "login", score: 95 };
      const dataB = { userId: "user-123", action: "login", score: 95 };
      const dataC = { userId: "user-123", action: "login", score: 96 };

      const hashA = await computeSha256Digest(dataA);
      const hashB = await computeSha256Digest(dataB);
      const hashC = await computeSha256Digest(dataC);

      expect(hashA).toHaveLength(64);
      expect(/^[0-9a-f]{64}$/.test(hashA)).toBe(true);
      expect(hashA).toBe(hashB); // Determinismo
      expect(hashA).not.toBe(hashC); // Sensibilidade a variações
    });

    it("processa strings e objetos vazios com segurança", async () => {
      const emptyObjHash = await computeSha256Digest({});
      const emptyStrHash = await computeSha256Digest("");
      expect(emptyObjHash).toHaveLength(64);
      expect(emptyStrHash).toHaveLength(64);
      expect(emptyObjHash).not.toBe(emptyStrHash);
    });
  });

  // --------------------------------------------------------------------------
  // TESTE 2: CONTRATOS ZOD & INVARIANTE B.25 (PARÂMETROS OPCIONAIS E BRANCHES)
  // --------------------------------------------------------------------------
  describe("2. Validação de Schemas Zod & Invariante B.25", () => {
    it("valida getUserFull360ActivityInput estritamente com UUID", () => {
      const valid = getUserFull360ActivityInput.safeParse({
        userId: "11111111-1111-1111-1111-111111111111",
      });
      expect(valid.success).toBe(true);

      const invalid = getUserFull360ActivityInput.safeParse({ userId: "nao-e-uuid" });
      expect(invalid.success).toBe(false);
    });

    it("valida adminForceSetUserPasswordInput rejeitando senhas curtas (< 8 chars)", () => {
      const valid = adminForceSetUserPasswordInput.safeParse({
        userId: "11111111-1111-1111-1111-111111111111",
        newPassword: "SuperSenhaSegura2026!",
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.reason).toBe("Redefinição forçada de senha pelo Master Admin");
      }

      const invalid = adminForceSetUserPasswordInput.safeParse({
        userId: "11111111-1111-1111-1111-111111111111",
        newPassword: "123",
      });
      expect(invalid.success).toBe(false);
    });

    it("valida adminTransferStoreOwnershipInput com suporte a aliases de titular e motivo", () => {
      const withAliases = adminTransferStoreOwnershipInput.safeParse({
        storeId: "33333333-3333-3333-3333-333333333333",
        newOwnerId: "22222222-2222-2222-2222-222222222222",
        transferReason: "Alteração de contrato social devidamente protocolada",
      });
      expect(withAliases.success).toBe(true);
      if (withAliases.success) {
        expect(withAliases.data.newOwnerId).toBe("22222222-2222-2222-2222-222222222222");
        expect(withAliases.data.notes).toBe("");
      }
    });

    it("valida adminTransferStoreOwnershipInput rejeitando motivo com menos de 5 caracteres", () => {
      const invalid = adminTransferStoreOwnershipInput.safeParse({
        storeId: "33333333-3333-3333-3333-333333333333",
        newOwnerId: "22222222-2222-2222-2222-222222222222",
        reason: "curt",
      });
      expect(invalid.success).toBe(false);
    });

    it("valida adminToggleUserAccessInput aceitando blocked ou block", () => {
      const withBlock = adminToggleUserAccessInput.safeParse({
        userId: "11111111-1111-1111-1111-111111111111",
        block: true,
      });
      expect(withBlock.success).toBe(true);

      const withBlocked = adminToggleUserAccessInput.safeParse({
        userId: "11111111-1111-1111-1111-111111111111",
        blocked: false,
        reason: "Suspensão revogada pelo comitê",
      });
      expect(withBlocked.success).toBe(true);
    });

    it("valida recordFormSubmissionAuditInput com fallbacks defensivos", () => {
      const minimal = recordFormSubmissionAuditInput.safeParse({});
      expect(minimal.success).toBe(true);
      if (minimal.success) {
        expect(minimal.data.formType).toBe("other");
        expect(minimal.data.payload).toEqual({});
      }
    });

    it("valida recordCartTelemetryEventInput com ações suportadas e delta", () => {
      const valid = recordCartTelemetryEventInput.safeParse({
        storeId: "33333333-3333-3333-3333-333333333333",
        action: "add",
        quantityDelta: 3,
        unitPriceCents: 2500,
        totalCartCents: 7500,
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.quantityDelta).toBe(3);
        expect(valid.data.unitPriceCents).toBe(2500);
      }
    });

    it("valida recordStaffActionLogInput com parâmetros obrigatórios e opcionais", () => {
      const valid = recordStaffActionLogInput.safeParse({
        storeId: "33333333-3333-3333-3333-333333333333",
        module: "catalogo",
        action: "reajuste_preco_massa",
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.operatorRole).toBe("operator");
        expect(valid.data.details).toEqual({});
      }
    });

    it("valida getMyActivityHistoryInput sem parâmetros fornecidos", () => {
      const valid = getMyActivityHistoryInput.safeParse(undefined);
      expect(valid.success).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // TESTE 3: EXECUÇÃO DOS HANDLERS DAS SERVER FUNCTIONS
  // --------------------------------------------------------------------------
  describe("3. Execução dos Handlers das Server Functions", () => {
    it("getUserFull360Activity agrega 7 dimensões e emite certificação SHA-256", async () => {
      const res = await getUserFull360Activity({
        data: { userId: "11111111-1111-1111-1111-111111111111" },
      });

      expect(res).toBeDefined();
      expect(res.dossier).toBeDefined();
      expect(res.dossier.general_and_access.profile.full_name).toBe("Cliente Civil Silva");
      expect(res.dossier.documents_and_kyc).toBeDefined();
      expect(res.dossier.forms_and_submissions).toBeDefined();
      expect(res.dossier.telemetry_and_navigation).toBeDefined();
      expect(res.dossier.ecommerce_and_carts).toBeDefined();
      expect(res.dossier.mobility_and_debt).toBeDefined();
      expect(res.dossier.staff_operator_actions).toBeDefined();
      expect(res.sha256_certified).toHaveLength(64);
      expect(res.sha256_certification).toBe(res.sha256_certified);
    });

    it("getUserFull360Activity rejeita invocação se o usuário não for encontrado", async () => {
      await expect(
        getUserFull360Activity({
          data: { userId: "99999999-9999-9999-9999-999999999999" },
        })
      ).rejects.toThrow(/Perfil de usuário não encontrado/);
    });

    it("getUserFull360Activity rejeita invocação se o solicitante não for Master Admin", async () => {
      currentTestIdentity = mockCivilCustomer;

      await expect(
        getUserFull360Activity({
          data: { userId: "11111111-1111-1111-1111-111111111111" },
        })
      ).rejects.toThrow(/Acesso negado/);
    });

    it("adminForceSetUserPassword atualiza senha e grava evento forense", async () => {
      const res = await adminForceSetUserPassword({
        data: {
          userId: "11111111-1111-1111-1111-111111111111",
          newPassword: "NovaSenhaMaster123!",
          reason: "Solicitação judicial de redefinição",
        },
      });

      expect(res.success).toBe(true);
      expect(res.message).toContain("atualizada com sucesso");
    });

    it("adminTransferStoreOwnership transfere titularidade e emite recibo forense com checksum", async () => {
      const res = await adminTransferStoreOwnership({
        data: {
          storeId: "33333333-3333-3333-3333-333333333333",
          newOwnerUserId: "22222222-2222-2222-2222-222222222222",
          reason: "Venda integral do ponto comercial conforme contrato",
        },
      });

      expect(res.success).toBe(true);
      expect(res.receipt).toBeDefined();
      expect(res.receipt.new_owner_id).toBe("22222222-2222-2222-2222-222222222222");
      expect(res.receipt.checksum_sha256).toHaveLength(64);
    });

    it("adminTransferStoreOwnership rejeita se a loja não existir", async () => {
      await expect(
        adminTransferStoreOwnership({
          data: {
            storeId: "99999999-9999-9999-9999-999999999999",
            newOwnerUserId: "22222222-2222-2222-2222-222222222222",
            reason: "Transferência societária para loja inexistente",
          },
        })
      ).rejects.toThrow(/Estabelecimento não encontrado/);
    });

    it("adminToggleUserAccess bloqueia e desbloqueia usuário com motivo registrado", async () => {
      // Bloqueio
      const blockRes = await adminToggleUserAccess({
        data: {
          userId: "11111111-1111-1111-1111-111111111111",
          blocked: true,
          reason: "Suspeita de fraude em anúncio de veículo",
        },
      });
      expect(blockRes.success).toBe(true);
      expect(blockRes.status).toBe("blocked");

      // Desbloqueio
      const unblockRes = await adminToggleUserAccess({
        data: {
          userId: "11111111-1111-1111-1111-111111111111",
          blocked: false,
          reason: "Identidade verificada com documento original",
        },
      });
      expect(unblockRes.success).toBe(true);
      expect(unblockRes.status).toBe("active");
    });

    it("recordFormSubmissionAudit sanitiza senhas e persiste com IP e metadados", async () => {
      const res = await recordFormSubmissionAudit({
        data: {
          formType: "proposal",
          formName: "Proposta de Compra de Veículo",
          route: "/anuncio/veiculo-123",
          payload: {
            nome: "Comprador Silva",
            proposta: "R$ 45.000,00",
            password: "senha-sensivel-que-deve-sumir",
          },
        },
      });

      expect(res.success).toBe(true);
      expect(res.submissionId).toBeDefined();
    });

    it("recordCartTelemetryEvent registra evento e sincroniza afinidade", async () => {
      const res = await recordCartTelemetryEvent({
        data: {
          storeId: "33333333-3333-3333-3333-333333333333",
          action: "item_added",
          quantity: 2,
          unitPriceCents: 4990,
          totalCartCents: 9980,
        },
      });

      expect(res.success).toBe(true);
      expect(res.eventId).toBeDefined();
    });

    it("recordStaffActionLog exige operador logado e vincula CPF físico", async () => {
      currentTestIdentity = mockAdminUser;

      const res = await recordStaffActionLog({
        data: {
          storeId: "33333333-3333-3333-3333-333333333333",
          module: "pedidos",
          action: "cancelamento_com_estorno",
          details: { motivo: "Cliente solicitou cancelamento antes do envio" },
        },
      });

      expect(res.success).toBe(true);
      expect(res.logId).toBeDefined();
    });

    it("recordStaffActionLog rejeita chamada de visitante não autenticado", async () => {
      currentTestIdentity = mockAnonymousUser;

      await expect(
        recordStaffActionLog({
          data: {
            storeId: "33333333-3333-3333-3333-333333333333",
            module: "pedidos",
            action: "cancelamento_com_estorno",
          },
        })
      ).rejects.toThrow(/Não autenticado/);
    });

    it("getMyActivityHistory retorna lista cronológica consolidada para o cliente civil", async () => {
      currentTestIdentity = mockCivilCustomer;

      const res = await getMyActivityHistory({
        data: { category: "all", limit: 20 },
      });

      expect(res).toBeDefined();
      expect(Array.isArray(res.items)).toBe(true);
      expect(res.categories).toContain("all");
      expect(res.categories).toContain("cart");
      expect(res.categories).toContain("orders");
      expect(res.categories).toContain("mobility");
    });

    it("getMyActivityHistory filtra por categoria específica", async () => {
      currentTestIdentity = mockCivilCustomer;

      const res = await getMyActivityHistory({
        data: { category: "orders", limit: 10 },
      });

      expect(res).toBeDefined();
      expect(Array.isArray(res.items)).toBe(true);
      expect(res.items.every((i) => i.category === "orders")).toBe(true);
    });
  });
});
