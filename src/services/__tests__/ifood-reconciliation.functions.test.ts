import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do createServerFn do @tanstack/react-start para execução direta e limpa em testes
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
  saveIFoodMerchantCredentials,
  getIFoodIntegrationStatus,
  reconcileExternalIFoodOrder,
  getChatLinkedExternalOrders,
} from "../ifood-reconciliation.functions";

const mockDb: Record<string, any[]> = {
  integration_credentials: [],
  chat_conversations: [],
  profiles: [],
  chat_messages: [],
  audit_logs: [],
};

const MOCK_STORE_ID = "11111111-1111-1111-1111-111111111111";
const MOCK_CONV_ID = "22222222-2222-2222-2222-222222222222";
const MOCK_CUST_ID = "33333333-3333-3333-3333-333333333333";

let mockIdentity: any = {
  id: "user-owner-1",
  store_id: MOCK_STORE_ID,
  role: "owner",
};

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn(async () => mockIdentity),
  assertStoreAccess: vi.fn((identity, roles) => {
    if (!identity || !roles.includes(identity.role)) {
      throw new Error("Acesso negado");
    }
  }),
}));

vi.mock("@/lib/crypto-vault.server", () => ({
  encryptSecret: vi.fn((str) => `enc_${str}`),
  decryptSecret: vi.fn((str) => str.replace("enc_", "")),
}));

vi.mock("../audit.functions", () => ({
  logAuditAction: vi.fn(async (identity, action, table, recordId, metadata) => {
    mockDb.audit_logs.push({ identity, action, table, recordId, metadata });
  }),
}));

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: (table: string) => ({
      select: (fields?: string) => ({
        eq: (col1: string, val1: any) => ({
          eq: (col2: string, val2: any) => ({
            maybeSingle: async () => {
              const rows = (mockDb[table] || []).filter(
                (r) => r[col1] === val1 && r[col2] === val2,
              );
              return { data: rows[0] || null, error: null };
            },
            order: () => ({
              limit: async () => {
                const rows = (mockDb[table] || []).filter(
                  (r) => r[col1] === val1 && r[col2] === val2,
                );
                return { data: rows, error: null };
              },
            }),
          }),
          maybeSingle: async () => {
            const rows = (mockDb[table] || []).filter((r) => r[col1] === val1);
            return { data: rows[0] || null, error: null };
          },
          order: () => ({
            limit: async () => {
              const rows = (mockDb[table] || []).filter((r) => r[col1] === val1);
              return { data: rows, error: null };
            },
          }),
          in: async (colIn: string, values: any[]) => {
            const rows = (mockDb[table] || []).filter((r) => values.includes(r[colIn]));
            return { data: rows, error: null };
          },
        }),
        in: async (colIn: string, values: any[]) => {
          const rows = (mockDb[table] || []).filter((r) => values.includes(r[colIn]));
          return { data: rows, error: null };
        },
      }),
      upsert: (record: any) => ({
        select: () => ({
          single: async () => {
            const existingIndex = mockDb[table].findIndex(
              (r) => r.store_id === record.store_id && r.provider === record.provider,
            );
            const rowId = record.id || `rec-${Date.now()}`;
            const fullRecord = { ...record, id: rowId };
            if (existingIndex >= 0) {
              mockDb[table][existingIndex] = fullRecord;
            } else {
              mockDb[table].push(fullRecord);
            }
            return { data: fullRecord, error: null };
          },
        }),
      }),
      insert: async (record: any) => {
        mockDb[table].push({ ...record, id: `msg-${Date.now()}` });
        return { data: record, error: null };
      },
    }),
  }),
}));

describe("BFF Server Functions: iFood Reconciliation & Central de Integrações", () => {
  beforeEach(() => {
    mockDb.integration_credentials = [];
    mockDb.chat_conversations = [];
    mockDb.profiles = [];
    mockDb.chat_messages = [];
    mockDb.audit_logs = [];
    mockIdentity = {
      id: "user-owner-1",
      store_id: MOCK_STORE_ID,
      role: "owner",
    };
  });

  it("salva credenciais do lojista iFood criptografando segredos no cofre", async () => {
    const result = await saveIFoodMerchantCredentials({
      data: {
        storeId: MOCK_STORE_ID,
        credentials: {
          merchantId: "ifood-merchant-999",
          clientId: "client-abc-123",
          clientSecret: "secret-xyz-789",
          appName: "Restaurante Sabor da Cidade",
        },
        isActive: true,
      },
    });

    expect(result.success).toBe(true);
    expect(mockDb.integration_credentials.length).toBe(1);

    const saved = mockDb.integration_credentials[0];
    expect(saved.provider).toBe("ifood");
    expect(saved.is_active).toBe(true);
    expect(saved.public_metadata.merchant_id).toBe("ifood-merchant-999");
    expect(saved.secret_payload_encrypted).toContain("enc_");
    expect(saved.secret_payload_encrypted).toContain("secret-xyz-789");

    // Verifica log de auditoria
    expect(mockDb.audit_logs.length).toBe(1);
    expect(mockDb.audit_logs[0].action).toBe("UPDATED_INTEGRATION_CREDENTIAL");
  });

  it("retorna status de conexão ativa para o lojista", async () => {
    mockDb.integration_credentials.push({
      id: "cred-1",
      store_id: MOCK_STORE_ID,
      provider: "ifood",
      is_active: true,
      public_metadata: { merchant_id: "merchant-456", app_name: "Pizzaria Waesy" },
      updated_at: "2026-10-29T18:00:00Z",
    });

    const status = await getIFoodIntegrationStatus({
      data: { storeId: MOCK_STORE_ID },
    });

    expect(status.isConnected).toBe(true);
    expect(status.merchantId).toBe("merchant-456");
    expect(status.appName).toBe("Pizzaria Waesy");
  });

  it("retorna isConnected=false quando não há credencial ativa", async () => {
    const status = await getIFoodIntegrationStatus({
      data: { storeId: MOCK_STORE_ID },
    });

    expect(status.isConnected).toBe(false);
  });

  it("reconcilia pedido externo e gera mensagem de sistema no chat para casamento de alta confiança", async () => {
    // Configura conversa e perfil do cliente
    mockDb.chat_conversations.push({
      id: MOCK_CONV_ID,
      store_id: MOCK_STORE_ID,
      customer_id: MOCK_CUST_ID,
      updated_at: "2026-10-29T19:35:00Z",
    });

    mockDb.profiles.push({
      id: MOCK_CUST_ID,
      full_name: "Bruno Silveira",
      phone: "49999998888",
      resume_data: {
        addresses: [
          {
            street: "Rua Almirante Tamandaré",
            number: "200",
            city: "São Miguel do Oeste",
            state: "SC",
            coordinates: { lat: -26.726, lng: -53.518 },
            is_default: true,
          },
        ],
      },
    });

    mockDb.chat_messages.push({
      id: "msg-1",
      conversation_id: MOCK_CONV_ID,
      content: "Tem coca cola 2L gelada?",
      created_at: "2026-10-29T19:32:00Z",
    });

    const result = await reconcileExternalIFoodOrder({
      data: {
        storeId: MOCK_STORE_ID,
        order: {
          id: "ifood-order-888",
          displayId: "888",
          orderType: "DELIVERY",
          orderTiming: "INSTANT",
          createdAt: "2026-10-29T19:34:00Z",
          customer: { name: "Bruno Silveira" },
          delivery: {
            deliveryAddress: {
              streetName: "Rua Almirante Tamandaré",
              streetNumber: "200",
              neighborhood: "Centro",
              city: "São Miguel do Oeste",
              state: "SC",
              postalCode: "89870000",
              coordinates: { latitude: -26.72605, longitude: -53.51805 },
            },
            deliveryBy: "MERCHANT",
          },
          items: [{ id: "i1", name: "Pizza Grande", quantity: 1, unitPrice: 50, totalPrice: 50 }],
          total: { subTotal: 50, deliveryFee: 0, benefits: 0, orderAmount: 50 },
        },
        autoLinkIfHighConfidence: true,
      },
    });

    expect(result.success).toBe(true);
    expect(result.linkStatus).toBe("AUTOMATICALLY_LINKED");
    expect(result.bestMatch?.customerName).toBe("Bruno Silveira");
    expect(result.bestMatch?.chatConversationId).toBe(MOCK_CONV_ID);
    expect(result.bestMatch?.score).toBeGreaterThanOrEqual(80);

    // Confirma que a mensagem de sistema foi gerada no chat
    const sysMsg = mockDb.chat_messages.find((m) => m.sender_type === "system");
    expect(sysMsg).toBeDefined();
    expect(sysMsg?.content).toContain("Pedido iFood N. 888");
  });

  it("recupera pedidos externos vinculados para a conversa de chat", async () => {
    mockDb.chat_messages.push({
      id: "msg-ext-1",
      conversation_id: MOCK_CONV_ID,
      sender_type: "system",
      content: "Pedido iFood N. 888 vinculado automaticamente",
      metadata: {
        is_external_order: true,
        provider: "ifood",
        external_order_id: "ifood-order-888",
        confidence_score: 95,
        matched_reasons: ["Geolocalização altamente precisa"],
      },
      created_at: "2026-10-29T19:35:00Z",
    });

    const orders = await getChatLinkedExternalOrders({
      data: { conversationId: MOCK_CONV_ID },
    });

    expect(orders.length).toBe(1);
    expect(orders[0].provider).toBe("ifood");
    expect(orders[0].externalOrderId).toBe("ifood-order-888");
    expect(orders[0].confidenceScore).toBe(95);
  });
});
