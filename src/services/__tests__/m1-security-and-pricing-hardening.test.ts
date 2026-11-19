import { beforeEach, describe, expect, it, vi } from "vitest";
import { STAFF_ROLES, assertStoreAccess, type ServerIdentity } from "@/lib/identity-core";
import { assertSafeExternalMediaUrl } from "@/lib/security/external-url.server";

type QueryResult = { data: any; error: any; count?: number };

const {
  mockTableHandlers,
  mockServerIdentity,
  mockUserIdentity,
  mockQuickOrderIdentity,
  mockInsertedPayloads,
  mockDb,
} = vi.hoisted(() => {
  const handlers: Record<string, (op: string, payload?: any, filters?: Array<[string, string, any]>) => QueryResult> = {};
  const inserts: Array<{ table: string; payload: any }> = [];

  function makeChain(table: string) {
    let op = "select";
    let payload: any = undefined;
    const filters: Array<[string, string, any]> = [];

    const execute = (): QueryResult => {
      if (op === "insert" || op === "upsert") {
        inserts.push({ table, payload });
      }
      const fn = handlers[table];
      if (!fn) {
        return { data: null, error: null, count: 0 };
      }
      return fn(op, payload, filters);
    };

    const chain: any = {
      select: () => chain,
      insert: (data: any) => {
        op = "insert";
        payload = data;
        return chain;
      },
      upsert: (data: any) => {
        op = "upsert";
        payload = data;
        return chain;
      },
      update: (data: any) => {
        op = "update";
        payload = data;
        return chain;
      },
      delete: () => {
        op = "delete";
        return chain;
      },
      eq: (col: string, val: any) => {
        filters.push(["eq", col, val]);
        return chain;
      },
      neq: (col: string, val: any) => {
        filters.push(["neq", col, val]);
        return chain;
      },
      in: (col: string, val: any) => {
        filters.push(["in", col, val]);
        return chain;
      },
      ilike: (col: string, val: any) => {
        filters.push(["ilike", col, val]);
        return chain;
      },
      or: (val: string) => {
        filters.push(["or", "or", val]);
        return chain;
      },
      is: (col: string, val: any) => {
        filters.push(["is", col, val]);
        return chain;
      },
      not: (col: string, opStr: string, val: any) => {
        filters.push([`not:${opStr}`, col, val]);
        return chain;
      },
      gt: (col: string, val: any) => {
        filters.push(["gt", col, val]);
        return chain;
      },
      gte: (col: string, val: any) => {
        filters.push(["gte", col, val]);
        return chain;
      },
      lt: (col: string, val: any) => {
        filters.push(["lt", col, val]);
        return chain;
      },
      lte: (col: string, val: any) => {
        filters.push(["lte", col, val]);
        return chain;
      },
      contains: (col: string, val: any) => {
        filters.push(["contains", col, val]);
        return chain;
      },
      order: () => chain,
      limit: () => chain,
      range: () => chain,
      maybeSingle: () => Promise.resolve(execute()),
      single: () => Promise.resolve(execute()),
      then: (resolve: (val: QueryResult) => any, reject?: (err: any) => any) =>
        Promise.resolve(execute()).then(resolve, reject),
    };
    return chain;
  }

  return {
    mockTableHandlers: handlers,
    mockInsertedPayloads: inserts,
    mockServerIdentity: vi.fn<() => Promise<ServerIdentity>>(),
    mockUserIdentity: vi.fn<() => Promise<any>>(),
    mockQuickOrderIdentity: vi.fn<() => Promise<any>>(),
    mockDb: {
      from: (table: string) => makeChain(table),
      rpc: vi.fn(async () => ({ data: null, error: null })),
    },
  };
});

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: () => ({
      handler: (fn: any) => fn,
    }),
    handler: (fn: any) => fn,
  }),
}));

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => mockDb,
  getAnonServerClient: () => mockDb,
}));

vi.mock("@/lib/server-access", () => ({
  STAFF_ROLES,
  MANAGER_ROLES: ["owner", "platform_admin", "manager", "admin"],
  OWNER_ROLES: ["owner", "platform_admin"],
  assertStoreAccess,
  getServerIdentity: (...args: any[]) => mockServerIdentity(...args),
  getSSRClient: () => mockDb,
}));

vi.mock("@/services/identity.functions", () => ({
  getIdentity: (...args: any[]) => mockUserIdentity(...args),
}));

vi.mock("@/services/cart-helpers", () => ({
  getCurrentIdentity: (...args: any[]) => mockQuickOrderIdentity(...args),
  withDataPayload: (schema: any) => schema,
}));

vi.mock("@/lib/logger", () => ({
  logSystemError: vi.fn(),
  logSystemEvent: vi.fn(),
  logTelemetryError: vi.fn(),
}));

describe("M1 — Segurança BFF, Anti-SSRF & Integridade Autoritativa de Preços", () => {
  beforeEach(() => {
    for (const k of Object.keys(mockTableHandlers)) {
      delete mockTableHandlers[k];
    }
    mockInsertedPayloads.length = 0;
    mockServerIdentity.mockReset();
    mockUserIdentity.mockReset();
    mockQuickOrderIdentity.mockReset();
    mockServerIdentity.mockResolvedValue({
      id: null,
      role: "customer",
      store_id: null,
      memberships: [],
    });
    mockUserIdentity.mockResolvedValue(null);
    mockQuickOrderIdentity.mockResolvedValue(null);
  });

  describe("1. Anti-SSRF (assertSafeExternalMediaUrl)", () => {
    it("deve bloquear loopback, metadata cloud, IPs privados, notação hex/decimal, IPv6 privado, credenciais e esquemas não-HTTP", () => {
      const blockedUrls = [
        "http://127.0.0.1/secret.png",
        "http://localhost:8080/admin.png",
        "http://sub.localhost/a.png",
        "http://169.254.169.254/latest/meta-data/",
        "http://10.0.0.5/internal.jpg",
        "http://172.16.10.2/internal.jpg",
        "http://192.168.1.50/router.jpg",
        "http://100.64.0.1/cgnat.jpg",
        "http://0x7f000001/hex.png",
        "http://2130706433/decimal.png",
        "http://[::1]/ipv6.png",
        "http://[::ffff:127.0.0.1]/mapped.png",
        "http://[fe80::1]/linklocal.png",
        "http://printer.local/a.png",
        "http://db.internal/a.png",
        "https://user:pass@cdn.example.com/a.png",
        "ftp://cdn.example.com/a.png",
        "file:///etc/passwd",
        "not-a-url",
      ];

      for (const raw of blockedUrls) {
        expect(() => assertSafeExternalMediaUrl(raw), `Deveria bloquear ${raw}`).toThrow();
      }
    });

    it("deve permitir URLs públicas HTTPS e HTTP legítimas sem credenciais", () => {
      expect(assertSafeExternalMediaUrl("https://cdn.example.com/img.png").hostname).toBe("cdn.example.com");
      expect(assertSafeExternalMediaUrl("http://images.example.org/banner.webp").protocol).toBe("http:");
    });
  });

  describe("2. Bootstrap Master Admin (Sem E-mails Hardcoded)", () => {
    it("deve conceder privilégio apenas via env WAESY_MASTER_EMAILS / BOOTSTRAP_MASTER_EMAILS", async () => {
      const prevWaesy = process.env.WAESY_MASTER_EMAILS;
      const prevBootstrap = process.env.BOOTSTRAP_MASTER_EMAILS;
      delete process.env.WAESY_MASTER_EMAILS;
      delete process.env.BOOTSTRAP_MASTER_EMAILS;

      try {
        const { isBootstrapPlatformAdminEmail } = await import("@/lib/identity.server");
        expect(isBootstrapPlatformAdminEmail("gabriel@waesy.com")).toBe(false);
        expect(isBootstrapPlatformAdminEmail("admin@waesy.com.br")).toBe(false);
        expect(isBootstrapPlatformAdminEmail(null)).toBe(false);

        process.env.WAESY_MASTER_EMAILS = "ops@cliente-real.com.br";
        expect(isBootstrapPlatformAdminEmail("OPS@CLIENTE-REAL.COM.BR")).toBe(true);
        expect(isBootstrapPlatformAdminEmail("outro@waesy.com")).toBe(false);
      } finally {
        if (prevWaesy === undefined) delete process.env.WAESY_MASTER_EMAILS;
        else process.env.WAESY_MASTER_EMAILS = prevWaesy;
        if (prevBootstrap === undefined) delete process.env.BOOTSTRAP_MASTER_EMAILS;
        else process.env.BOOTSTRAP_MASTER_EMAILS = prevBootstrap;
      }
    });
  });

  describe("3. Hardening Auth BFF (Promotions, PUDO, Associações & Portal Público)", () => {
    it("deve bloquear usuário anônimo ou civil em listStorePromotions e checkInPudoPackage", async () => {
      const { listStorePromotions, createPromotion } = await import("../promotions.functions");
      const { listStorePudoPackages, checkInPudoPackage } = await import("../pudo.functions");

      await expect(listStorePromotions()).rejects.toThrow(/Unauthorized/i);
      await expect(
        createPromotion({
          data: {
            title: "Promo Indevida",
            type: "percentage_discount",
            discount_percent: 20,
            buy_qty: 1,
            get_qty: 1,
          },
        }),
      ).rejects.toThrow(/Unauthorized/i);

      mockServerIdentity.mockResolvedValue({
        id: "civil-1",
        role: "customer",
        store_id: null,
        memberships: [],
      });

      await expect(listStorePudoPackages({ data: {} })).rejects.toThrow(/Unauthorized/i);
      await expect(
        checkInPudoPackage({
          data: {
            trackingCode: "BR1234",
            locationId: "11111111-1111-4111-8111-111111111111",
            recipientName: "Cliente",
            recipientPhone: "49999999999",
            senderName: "Loja",
          },
        }),
      ).rejects.toThrow(/Unauthorized/i);
    });

    it("deve impedir vazamento de notas internas e membros pendentes em listEntityMembers para anônimos", async () => {
      const { listEntityMembers } = await import("../association.functions");
      mockTableHandlers.store_association_memberships = () => ({
        data: [
          {
            id: "mem-1",
            entity_store_id: "11111111-1111-4111-8111-111111111111",
            member_store_id: "22222222-2222-4222-8222-222222222222",
            status: "approved",
            discount_percent: 10,
            entity_default_discount_accepted: true,
            custom_benefit_description: "10% OFF",
            joined_at: "2026-11-01T00:00:00Z",
            created_at: "2026-11-01T00:00:00Z",
            notes: "Nota privada confidencial",
            requested_by: "user-secreto",
          },
        ],
        error: null,
      });

      await expect(
        listEntityMembers({
          data: {
            entityStoreId: "11111111-1111-4111-8111-111111111111",
            status: "pending",
          },
        }),
      ).rejects.toThrow(/Unauthorized/i);

      const publicRes = await listEntityMembers({
        data: {
          entityStoreId: "11111111-1111-4111-8111-111111111111",
          status: "approved",
        },
      });
      expect(publicRes).toHaveLength(1);
      expect((publicRes[0] as any).notes).toBeUndefined();
      expect((publicRes[0] as any).requested_by).toBeUndefined();
    });

    it("deve retornar store: null em getCustomerPortalBySlug inexistente e omitir ai_knowledge_base/settings no Branded App público", async () => {
      const { getCustomerPortalBySlug } = await import("../customer-portal.functions");
      const { getPublicBrandedAppBySlugFn } = await import("../branded-app.functions");

      mockTableHandlers.stores = () => ({ data: null, error: null });
      const missingPortal = await getCustomerPortalBySlug({ data: { slug: "loja-inexistente" } });
      expect(missingPortal).toEqual({ store: null, portalConfig: null, document: null });

      mockTableHandlers.stores = () => ({
        data: {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Agência Exemplo",
          slug: "agencia-exemplo",
          description: "Portal oficial",
          phone: "49999999999",
          email: "privado@agencia.com",
          ai_knowledge_base: "PROMPT SECRETO INTERNO",
          settings: { secret_webhook_token: "sk_live_123" },
        },
        error: null,
      });

      const appBundle = await getPublicBrandedAppBySlugFn({ data: { slug: "agencia-exemplo" } });
      expect(appBundle).not.toBeNull();
      expect(appBundle?.store.ai_knowledge_base).toBeNull();
      expect(appBundle?.store.settings).toEqual({});
    });
  });

  describe("4. Integridade Autoritativa de Preços e Regras Zero-Trust (QuickOrder, Events, Deals)", () => {
    it("deve rejeitar fallback de UUID fictício e preço adulterado no QuickOrder", async () => {
      const { createQuickOrder } = await import("../quick-order.functions");

      mockTableHandlers.products = () => ({
        data: {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          store_id: "11111111-1111-4111-8111-111111111111",
          price_cents: 15000,
          status: "published",
          settings: {},
        },
        error: null,
      });

      // Tentativa sem store válida (não deve cair em 00000000-...-000000000002)
      const noStoreRes = await createQuickOrder({
        data: {
          customerName: "João Teste",
          customerPhone: "49999999999",
          items: [
            {
              title: "Pacote Premium",
              quantity: 1,
              unitPriceCents: 100,
              totalCents: 100,
            },
          ],
          subtotalCents: 100,
          deliveryFeeCents: 0,
          discountCents: 0,
          grandTotalCents: 100,
        },
      });
      expect(noStoreRes.status).toBe("error");
      expect(noStoreRes.message).toMatch(/Loja|anunciante/i);

      // Tentativa de adulterar unitPriceCents (R$ 1,00 vs R$ 150,00 no banco)
      const tamperedRes = await createQuickOrder({
        data: {
          storeId: "11111111-1111-4111-8111-111111111111",
          productId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          customerName: "João Teste",
          customerPhone: "49999999999",
          items: [
            {
              title: "Pacote Premium",
              quantity: 1,
              unitPriceCents: 100,
              totalCents: 100,
            },
          ],
          subtotalCents: 100,
          deliveryFeeCents: 0,
          discountCents: 0,
          grandTotalCents: 100,
        },
      });
      expect(tamperedRes.status).toBe("error");
      expect(tamperedRes.message).toMatch(/preço|divergente|catálogo/i);
    });

    it("deve recomputar preço oficial do lote no checkoutClassifiedEventTicket e bloquear lote esgotado", async () => {
      const { checkoutClassifiedEventTicket } = await import("../classifieds-events.functions");
      mockUserIdentity.mockResolvedValue({ id: "buyer-1", full_name: "Comprador", cpf: "12345678900" });

      mockTableHandlers.classifieds = () => ({
        data: {
          id: "evt-1",
          title: "Festival Waesy",
          author_profile_id: "seller-1",
          price_cents: 8000,
          status: "published",
          attributes: {
            ticket_tiers: [
              { id: "vip", name: "Área VIP", price_cents: 25000, capacity: 10, sold_count: 2 },
              { id: "esgotado", name: "Lote 1", price_cents: 5000, capacity: 5, sold_count: 5 },
            ],
          },
        },
        error: null,
      });

      mockTableHandlers.classified_applications = () => ({
        data: { id: "tkt-1" },
        error: null,
      });

      await expect(
        checkoutClassifiedEventTicket({
          data: {
            classifiedId: "evt-1",
            tierId: "esgotado",
            tierName: "Lote 1",
            quantity: 1,
            unitPriceCents: 5000,
            buyerName: "Maria",
            buyerWhatsapp: "49999999999",
            paymentMethod: "pix",
          },
        }),
      ).rejects.toThrow(/esgotado/i);

      const ticketResult = await checkoutClassifiedEventTicket({
        data: {
          classifiedId: "evt-1",
          tierId: "vip",
          tierName: "Área VIP",
          quantity: 2,
          unitPriceCents: 100, // Tentativa de fraude: envia R$ 1,00 em vez de R$ 250,00
          buyerName: "Maria",
          buyerWhatsapp: "49999999999",
          paymentMethod: "pix",
        },
      });

      expect(ticketResult.success).toBe(true);
      expect(ticketResult.totalAmountCents).toBe(50000);
      expect(ticketResult.tickets).toHaveLength(2);
    });

    it("deve bloquear reserva instantânea fraudulenta e auto-aceite da própria proposta em deals", async () => {
      const { createDealProposal, respondToDealProposal } = await import("../deals.functions");
      mockUserIdentity.mockResolvedValue({ id: "buyer-1", role: "customer" });

      mockTableHandlers.classifieds = () => ({
        data: {
          id: "33333333-3333-4333-8333-333333333333",
          title: "Chalé Serra",
          author_profile_id: "44444444-4444-4444-8444-444444444444",
          price_cents: 45000,
          status: "published",
          attributes: { allow_instant_booking: false, daily_rate_cents: 45000 },
        },
        error: null,
      });

      await expect(
        createDealProposal({
          data: {
            classifiedId: "33333333-3333-4333-8333-333333333333",
            sellerId: "44444444-4444-4444-8444-444444444444",
            proposedPriceCents: 100,
            dealType: "rental",
            nightsCount: 2,
            isDirectBooking: true,
          },
        }),
      ).rejects.toThrow(/reserva instantânea|aprovação/i);

      mockTableHandlers.deals = () => ({
        data: {
          id: "55555555-5555-4555-8555-555555555555",
          buyer_id: "buyer-1",
          seller_id: "44444444-4444-4444-8444-444444444444",
          status: "negotiating",
          proposed_price_cents: 10000,
        },
        error: null,
      });
      mockTableHandlers.deal_events = () => ({
        data: {
          id: "ev-latest",
          event_type: "proposal",
          sender_id: "buyer-1",
        },
        error: null,
      });

      await expect(
        respondToDealProposal({
          data: {
            dealId: "55555555-5555-4555-8555-555555555555",
            action: "accept",
          },
        }),
      ).rejects.toThrow(/contraparte|própria proposta/i);
    });
  });
});
