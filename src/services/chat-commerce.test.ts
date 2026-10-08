import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveAiPipelineSteps } from "@/services/ai-conversations.functions";
import {
  executeChatOrderPaymentCore,
  executeChatBookingPaymentCore,
  resolveMerchantForCategory,
  canReadChatOrderTracking,
} from "@/services/chat-commerce.functions";

// Mock do Supabase e do Ledger Imutável
const mockLedgerEntries: Record<string, any> = {};
const mockOrders: Record<string, any> = {};
const mockAppointments: Record<string, any> = {};
const mockCarts: Record<string, any> = {};
const mockCartItems: Record<string, any[]> = {};
const mockStores: Record<string, any> = {
  "store-mercado-01": { id: "store-mercado-01", name: "Supermercado Central Chapecó", segment: "mercado" },
  "store-moda-02": { id: "store-moda-02", name: "Boutique Elegance Moda", segment: "vestuario" },
  "store-clinica-03": { id: "store-clinica-03", name: "Clínica Integrada de Saúde", segment: "saude" },
};

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: (table: string) => ({
      select: (fields?: string) => ({
        eq: (col: string, val: any) => ({
          eq: (col2: string, val2: any) => ({
            maybeSingle: async () => {
              if (table === "carts") return { data: mockCarts[val] || null, error: null };
              return { data: null, error: null };
            },
            single: async () => {
              if (table === "carts") return { data: mockCarts[val] || null, error: null };
              return { data: null, error: null };
            },
          }),
          maybeSingle: async () => {
            if (table === "immutable_ledger_entries") {
              const entry = mockLedgerEntries[val];
              return { data: entry || null, error: null };
            }
            if (table === "stores") {
              return { data: mockStores[val] || null, error: null };
            }
            return { data: null, error: null };
          },
          single: async () => {
            if (table === "carts") return { data: mockCarts[val] || null, error: null };
            if (table === "orders") return { data: mockOrders[val] || null, error: null };
            if (table === "booking_appointments") return { data: mockAppointments[val] || null, error: null };
            return { data: null, error: null };
          },
          order: () => ({
            limit: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
          neq: () => ({
            gte: () => ({
              lte: async () => ({ data: [], error: null }),
            }),
          }),
          then: async (resolve: any) => {
            if (table === "cart_items") {
              return resolve({ data: mockCartItems[val] || [], error: null });
            }
            return resolve({ data: [], error: null });
          },
        }),
        ilike: (col: string, val: string) => ({
          limit: () => ({
            maybeSingle: async () => {
              if (table === "stores") {
                const clean = val.replace(/%/g, "").toLowerCase();
                const found = Object.values(mockStores).find((s) => s.segment.includes(clean));
                return { data: found || null, error: null };
              }
              return { data: null, error: null };
            },
          }),
        }),
        limit: () => ({
          maybeSingle: async () => ({ data: Object.values(mockStores)[0] || null, error: null }),
        }),
      }),
      insert: (record: any) => ({
        select: (fields?: string) => ({
          single: async () => {
            if (table === "orders") {
              const id = `order-${Date.now()}`;
              const publicToken = `wsy_${Date.now()}`;
              const orderRecord = { ...record, id, public_token: publicToken };
              mockOrders[id] = orderRecord;
              return { data: orderRecord, error: null };
            }
            if (table === "booking_appointments") {
              const id = `app-${Date.now()}`;
              const appRecord = { ...record, id };
              mockAppointments[id] = appRecord;
              return { data: appRecord, error: null };
            }
            return { data: { id: "inserted-id", ...record }, error: null };
          },
        }),
      }),
      update: (updates: any) => ({
        eq: (col: string, val: any) => ({
          select: () => ({
            single: async () => {
              if (table === "booking_appointments") {
                const current = mockAppointments[val] || { id: val, store_id: "store-clinica-03" };
                const updated = { ...current, ...updates };
                mockAppointments[val] = updated;
                return { data: updated, error: null };
              }
              return { data: updates, error: null };
            },
          }),
          then: async (resolve: any) => {
            if (table === "carts") {
              if (mockCarts[val]) mockCarts[val].status = updates.status;
            }
            return resolve({ data: updates, error: null });
          },
        }),
      }),
    }),
  }),
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: async () => ({
    id: "usr-customer-001",
    email: "cliente@waesy.com.br",
  }),
}));

vi.mock("@/services/immutable-ledger.functions", () => ({
  recordLedgerEntryCore: async (params: any) => {
    if (params.idempotencyKey) {
      mockLedgerEntries[params.idempotencyKey] = {
        reference_entity_id: params.referenceEntityId,
        amount_cents: params.amountCents,
        metadata: params.metadata,
      };
    }
    return { success: true };
  },
}));

describe("Prompt 22: O Chat como Aplicativo (Comércio, Serviços, Agenda, Orçamentos e Idempotência)", () => {
  beforeEach(() => {
    // Reset dos mocks antes de cada teste
    for (const key in mockLedgerEntries) delete mockLedgerEntries[key];
    for (const key in mockOrders) delete mockOrders[key];
    for (const key in mockAppointments) delete mockAppointments[key];
    for (const key in mockCarts) delete mockCarts[key];
    for (const key in mockCartItems) delete mockCartItems[key];
  });

  // ============================================================================
  // Teste 1: FASE A — PREFERÊNCIAS COMO DADO
  // ============================================================================
  it("resolveMerchantForCategory respeita merchant preferido por categoria com prioridade", async () => {
    const resolvedDirect = await resolveMerchantForCategory("mercado", "store-mercado-01");
    expect(resolvedDirect?.storeId).toBe("store-mercado-01");
    expect(resolvedDirect?.storeName).toBe("Supermercado Central Chapecó");

    const resolvedByCategory = await resolveMerchantForCategory("vestuario");
    expect(resolvedByCategory?.storeId).toBe("store-moda-02");
    expect(resolvedByCategory?.storeName).toBe("Boutique Elegance Moda");
  });

  // ============================================================================
  // Teste 2: FASE E / FLUXO 1 — Compra em Mercado (Recálculo no Servidor + Idempotência)
  // ============================================================================
  it("Fluxo 1 (Compra em Mercado): Recalcula valores no servidor e processa pedido com idempotência", async () => {
    const cartId = "cart-mercado-001";
    mockCarts[cartId] = {
      id: cartId,
      store_id: "store-mercado-01",
      shipping_cents: 990,
      discount_cents: 0,
      status: "active",
    };
    mockCartItems[cartId] = [
      {
        id: "item-1",
        product_id: "prod-leite-01",
        quantity: 2,
        unit_price_cents: 490,
        total_price_cents: 980,
        products: { title: "Leite Integral 1L" },
      },
      {
        id: "item-2",
        product_id: "prod-cafe-02",
        quantity: 1,
        unit_price_cents: 1890,
        total_price_cents: 1890,
        products: { title: "Café Especial Torrado 500g" },
      },
    ];

    const idempotencyKey = "idemp-mercado-checkout-99991";

    const result = await executeChatOrderPaymentCore({
      cartId,
      idempotencyKey,
      paymentMethod: "pix",
      customerName: "Eduardo Cliente",
      customerEmail: "eduardo@waesy.com.br",
      shippingAddress: { street: "Av. Getúlio Vargas", number: "100", city: "Chapecó", state: "SC" },
    });

    expect(result.success).toBe(true);
    expect(result.wasReplay).toBe(false);
    expect(result.orderId).toBeDefined();
    expect(result.publicToken).toBeDefined();

    // Verificação de Recálculo Soberano no Servidor: (980 + 1890) + 990 = 3860
    expect(result.totalCents).toBe(3860);

    // Verificação de Idempotência Criptográfica por Repetição:
    // Chamar novamente com a mesma idempotencyKey DEVE retornar a transação gravada no ledger sem criar novo pedido
    const replayResult = await executeChatOrderPaymentCore({
      cartId,
      idempotencyKey,
      paymentMethod: "pix",
      customerName: "Eduardo Cliente",
      customerEmail: "eduardo@waesy.com.br",
    });

    expect(replayResult.success).toBe(true);
    expect(replayResult.wasReplay).toBe(true);
    expect(replayResult.orderId).toBe(result.orderId);
    expect(replayResult.totalCents).toBe(result.totalCents);
  });

  // ============================================================================
  // Teste 3: FASE E / FLUXO 2 — Compra em Loja de Vestuário
  // ============================================================================
  it("Fluxo 2 (Compra em Loja de Vestuário): Criação soberana de pedido de vestuário e finalização do carrinho", async () => {
    const cartId = "cart-vestuario-002";
    mockCarts[cartId] = {
      id: cartId,
      store_id: "store-moda-02",
      shipping_cents: 1500,
      discount_cents: 2000, // Cupom de R$ 20,00
      status: "active",
    };
    mockCartItems[cartId] = [
      {
        id: "item-vest-1",
        product_id: "prod-vestido-01",
        quantity: 1,
        unit_price_cents: 18990,
        total_price_cents: 18990,
        products: { title: "Vestido Midi Alfaiataria" },
      },
    ];

    const idempotencyKey = "idemp-moda-checkout-88882";

    const result = await executeChatOrderPaymentCore({
      cartId,
      idempotencyKey,
      paymentMethod: "credit_card",
      customerName: "Maria Moda",
      customerEmail: "maria@waesy.com.br",
      shippingAddress: { street: "Rua Fernando Machado", number: "500", city: "Chapecó", state: "SC" },
    });

    expect(result.success).toBe(true);
    expect(result.wasReplay).toBe(false);

    // Total: 18990 + 1500 (frete) - 2000 (desconto) = 18490
    expect(result.totalCents).toBe(18490);

    // Carrinho deve ter sido marcado como completed
    expect(mockCarts[cartId].status).toBe("completed");
  });

  // ============================================================================
  // Teste 4: FASE E / FLUXO 3 — Agendamento de Serviço com Pagamento
  // ============================================================================
  it("Fluxo 3 (Agendamento de Serviço): Confirmação de horário com registro no ledger imutável e idempotência", async () => {
    const appointmentId = "app-clinica-001";
    mockAppointments[appointmentId] = {
      id: appointmentId,
      store_id: "store-clinica-03",
      service_id: "srv-consulta-01",
      status: "pending",
    };

    const idempotencyKey = "idemp-booking-pay-77773";

    const result = await executeChatBookingPaymentCore({
      appointmentId,
      idempotencyKey,
      paymentMethod: "pix",
      customerName: "Carlos Paciente",
      customerEmail: "carlos@waesy.com.br",
      amountCents: 15000,
    });

    expect(result.success).toBe(true);
    expect(result.wasReplay).toBe(false);
    expect(result.appointmentId).toBe(appointmentId);
    expect(mockAppointments[appointmentId].status).toBe("confirmed");

    // Replay com a mesma chave deve acusar repetição idempotente
    const replayResult = await executeChatBookingPaymentCore({
      appointmentId,
      idempotencyKey,
      paymentMethod: "pix",
      customerName: "Carlos Paciente",
      customerEmail: "carlos@waesy.com.br",
      amountCents: 15000,
    });

    expect(replayResult.success).toBe(true);
    expect(replayResult.wasReplay).toBe(true);
  });

  // ============================================================================
  // Teste 5: FASE B / C — Integração com Pipeline Conversacional da IA
  // ============================================================================
  it("Pipeline conversacional da IA aciona tools reais para comércio, rastreio e agenda", () => {
    // Intenção de compra
    const commerceRes = resolveAiPipelineSteps("Gostaria de comprar itens no mercado e ver o carrinho");
    expect(commerceRes.activitySteps.some((s) => s.label.includes("search_catalog_products"))).toBe(true);
    expect(commerceRes.updatedMemory.last_commerce_query).toBeDefined();

    // Intenção de rastreio de pedido
    const trackingRes = resolveAiPipelineSteps("Quero rastrear meu pedido de entrega");
    expect(trackingRes.activitySteps.some((s) => s.label.includes("order_events"))).toBe(true);
    expect(trackingRes.updatedMemory.last_tracking_query).toBeDefined();

    // Intenção de agendamento de serviço
    const bookingRes = resolveAiPipelineSteps("Preciso agendar um horário com o especialista");
    expect(bookingRes.activitySteps.some((s) => s.label.includes("booking_services"))).toBe(true);
    expect(bookingRes.updatedMemory.last_booking_query).toBeDefined();
  });

  it("bloqueia rastreio por UUID para cliente ou loja não relacionados", () => {
    const order = { customer_id: "customer-a", store_id: "store-a" };
    expect(canReadChatOrderTracking(order, { id: "customer-a", customer_id: "customer-a", store_id: "store-z", role: "customer" })).toBe(true);
    expect(canReadChatOrderTracking(order, { id: "manager-a", customer_id: "customer-z", store_id: "store-a", role: "manager" })).toBe(true);
    expect(canReadChatOrderTracking(order, { id: "customer-b", customer_id: "customer-b", store_id: "store-b", role: "customer" })).toBe(false);
    expect(canReadChatOrderTracking(order, null)).toBe(false);
  });
});
