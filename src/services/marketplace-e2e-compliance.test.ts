import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildMarketplaceOAuthAuthorizeUrl,
  decodeMarketplaceOAuthState,
  encodeMarketplaceOAuthState,
  exchangeMarketplaceOAuthCode,
  generateShopeeSign,
  pushIfoodOrderLifecycle,
  verifyBlingWebhookSignature,
  verifyIfoodWebhookSignature,
  verifyMercadoLivreWebhookSignature,
  verifyShopeeWebhookSignature,
} from "@/lib/marketplace-api-client";
import {
  pushOrderUpdateToOriginMarketplace,
  resolveConnectorCredentialsWithRefresh,
} from "@/lib/marketplace-vault.server";
import { encryptSecret } from "@/lib/crypto-vault.server";
import { dispatchMarketplaceChannelSync } from "./marketplace-hub.functions";
import { handleInboundWebhook, retryFailedWebhooks } from "./marketplace-webhooks.functions";

function makeChain(result: any = { data: null, error: null }, opts?: {
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onUpsert?: (payload: any) => void;
  onEq?: (col: string, val: any) => void;
  maybeSingleResult?: any;
  singleResult?: any;
}) {
  const chain: any = {
    select: vi.fn(() => chain),
    insert: vi.fn((payload: any) => {
      opts?.onInsert?.(payload);
      return chain;
    }),
    update: vi.fn((payload: any) => {
      opts?.onUpdate?.(payload);
      return chain;
    }),
    upsert: vi.fn((payload: any) => {
      opts?.onUpsert?.(payload);
      return chain;
    }),
    delete: vi.fn(() => chain),
    eq: vi.fn((col: string, val: any) => {
      opts?.onEq?.(col, val);
      return chain;
    }),
    neq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    ilike: vi.fn(() => chain),
    is: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    gt: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    lt: vi.fn(() => chain),
    not: vi.fn(() => chain),
    or: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => opts?.maybeSingleResult ?? result),
    single: vi.fn(async () => opts?.singleResult ?? result),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

describe("Marketplace E2E Compliance, Security & Bidirectional Sync Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Official API Cryptography, Signatures & OAuth State", () => {
    it("verifies Mercado Livre x-signature with exact manifest and 300s replay protection", () => {
      const secret = "ml_app_secret_prod_999";
      const nowSec = Math.floor(Date.now() / 1000);
      const manifest = `id:20000123456;request-id:req-abc-123;ts:${nowSec};`;
      const v1 = createHmac("sha256", secret).update(manifest).digest("hex");

      const valid = verifyMercadoLivreWebhookSignature({
        xSignatureHeader: `ts=${nowSec},v1=${v1}`,
        xRequestId: "req-abc-123",
        dataId: "20000123456",
        secret,
        maxAgeSeconds: 300,
      });
      expect(valid.valid).toBe(true);

      const tampered = verifyMercadoLivreWebhookSignature({
        xSignatureHeader: `ts=${nowSec},v1=${v1.replace(/^./, v1[0] === "a" ? "b" : "a")}`,
        xRequestId: "req-abc-123",
        dataId: "20000123456",
        secret,
        maxAgeSeconds: 300,
      });
      expect(tampered.valid).toBe(false);

      const expiredTs = nowSec - 600;
      const expiredV1 = createHmac("sha256", secret)
        .update(`id:20000123456;request-id:req-abc-123;ts:${expiredTs};`)
        .digest("hex");
      const expired = verifyMercadoLivreWebhookSignature({
        xSignatureHeader: `ts=${expiredTs},v1=${expiredV1}`,
        xRequestId: "req-abc-123",
        dataId: "20000123456",
        secret,
        maxAgeSeconds: 300,
      });
      expect(expired.valid).toBe(false);
    });

    it("verifies Shopee url|rawBody, Bling sha256= header and iFood X-IFood-Signature", () => {
      const url = "https://waesy.com/api/webhooks/marketplaces?platform=shopee";
      const body = JSON.stringify({ code: 3, data: { ordersn: "240101XYZ" }, shop_id: 7788 });
      const shopeeSig = createHmac("sha256", "shpk_test").update(`${url}|${body}`).digest("hex");
      expect(verifyShopeeWebhookSignature({ authorizationHeader: shopeeSig, callbackUrl: url, rawBody: body, partnerKey: "shpk_test" }).valid).toBe(true);
      expect(verifyShopeeWebhookSignature({ authorizationHeader: shopeeSig, callbackUrl: url, rawBody: `${body} `, partnerKey: "shpk_test" }).valid).toBe(false);

      const blingSig = "sha256=" + createHmac("sha256", "bling_sec").update(body).digest("hex");
      expect(verifyBlingWebhookSignature({ signatureHeader: blingSig, rawBody: body, clientSecret: "bling_sec" }).valid).toBe(true);
      expect(verifyBlingWebhookSignature({ signatureHeader: blingSig, rawBody: body, clientSecret: "wrong" }).valid).toBe(false);

      const ifoodSig = createHmac("sha256", "ifood_sec").update(body).digest("hex");
      expect(verifyIfoodWebhookSignature({ signatureHeader: ifoodSig, rawBody: body, clientSecret: "ifood_sec" }).valid).toBe(true);
    });

    it("builds official OAuth URLs pointing to /api/auth/marketplace/callback and round-trips state", () => {
      const state = encodeMarketplaceOAuthState({
        storeId: "11111111-1111-1111-1111-111111111111",
        platform: "mercadolivre",
        returnPath: "/workspace/integracoes/marketplaces",
      });
      expect(decodeMarketplaceOAuthState(state)).toEqual({
        storeId: "11111111-1111-1111-1111-111111111111",
        platform: "mercadolivre",
        returnPath: "/workspace/integracoes/marketplaces",
      });

      const ml = buildMarketplaceOAuthAuthorizeUrl({
        platform: "mercadolivre",
        appUrl: "https://waesy.com",
        storeId: "11111111-1111-1111-1111-111111111111",
        clientId: "123456",
      });
      expect(ml.configured).toBe(true);
      expect(ml.redirectUri).toBe("https://waesy.com/api/auth/marketplace/callback");
      expect(ml.authUrl).toContain("auth.mercadolivre.com.br/authorization");

      const bling = buildMarketplaceOAuthAuthorizeUrl({
        platform: "bling",
        appUrl: "https://waesy.com",
        storeId: "11111111-1111-1111-1111-111111111111",
        clientId: "bling-cid",
      });
      expect(bling.configured).toBe(true);
      expect(bling.authUrl).toContain("www.bling.com.br/Api/v3/oauth/authorize");

      const shopee = buildMarketplaceOAuthAuthorizeUrl({
        platform: "shopee",
        appUrl: "https://waesy.com",
        storeId: "11111111-1111-1111-1111-111111111111",
        clientId: "200123",
        partnerKey: "shpk_live",
      });
      expect(shopee.configured).toBe(true);
      expect(shopee.authUrl).toContain("partner.shopeemobile.com/api/v2/shop/auth_partner");
      expect(generateShopeeSign({ partnerId: "200123", partnerKey: "shpk_live", apiPath: "/api/v2/shop/auth_partner", timestamp: 1700000000 })).toHaveLength(64);
    });
  });

  describe("2. Token Auto-Refresh, Rotation & Vault Persistence", () => {
    it("proactively refreshes expired Bling token with Basic Auth and rotates encrypted refresh_token", async () => {
      const supabaseModule = await import("@/lib/supabase");
      const updatePayloads: any[] = [];
      const pastIso = new Date(Date.now() - 60_000).toISOString();

      const spy = vi.spyOn(supabaseModule, "getServerClient").mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === "marketplace_connectors") {
            return makeChain(
              {
                data: {
                  id: "conn-bling-1",
                  access_token: encryptSecret("old_bling_access"),
                  refresh_token: encryptSecret("old_bling_refresh"),
                  external_account_id: "bling-acc-1",
                  token_expires_at: pastIso,
                  settings: {
                    credentials: {
                      client_id: "bling_cid_1",
                      client_secret: encryptSecret("bling_secret_1"),
                    },
                  },
                },
                error: null,
              },
              { onUpdate: (p) => updatePayloads.push(p) }
            );
          }
          return makeChain({ data: null, error: null });
        }),
      } as any);

      const fakeFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: "fresh_bling_access_v3",
            refresh_token: "rotated_bling_refresh_v3",
            expires_in: 21600,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      try {
        const resolved = await resolveConnectorCredentialsWithRefresh({
          storeId: "store-1",
          platform: "bling",
          fetchImpl: fakeFetch as any,
        });

        expect(resolved.accessToken).toBe("fresh_bling_access_v3");
        expect(resolved.refreshToken).toBe("rotated_bling_refresh_v3");
        expect(fakeFetch).toHaveBeenCalledTimes(1);
        const [calledUrl, init] = fakeFetch.mock.calls[0];
        expect(calledUrl).toBe("https://api.bling.com.br/Api/v3/oauth/token");
        expect((init as any).headers.Authorization).toMatch(/^Basic /);
        expect(updatePayloads.length).toBe(1);
        expect(updatePayloads[0].access_token).not.toBe("fresh_bling_access_v3"); // Must be AES encrypted
      } finally {
        spy.mockRestore();
      }
    });

    it("exchanges OAuth code for Shopee using partner HMAC sign", async () => {
      const fakeFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            access_token: "shp_access_1",
            refresh_token: "shp_refresh_1",
            expire_in: 14400,
            merchant_id: 5566,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        )
      );

      const res = await exchangeMarketplaceOAuthCode({
        platform: "shopee",
        code: "auth_code_99",
        redirectUri: "https://waesy.com/api/auth/marketplace/callback",
        clientId: "200123",
        clientSecret: "shpk_live",
        shopId: "998877",
        fetchImpl: fakeFetch as any,
      });

      expect(res.accessToken).toBe("shp_access_1");
      expect(res.externalAccountId).toBe("998877");
      expect(fakeFetch.mock.calls[0][0]).toContain("/api/v2/auth/token/get");
    });
  });

  describe("3. iFood Thin Webhook Pull-Back, ACK-After-Commit & Retry Recovery", () => {
    it("acknowledges iFood event ONLY AFTER database persistence succeeds (positive case)", async () => {
      const supabaseModule = await import("@/lib/supabase");
      const externalUpserts: any[] = [];
      const orderInserts: any[] = [];
      const eventUpdates: any[] = [];

      const spy = vi.spyOn(supabaseModule, "getServerClient").mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === "marketplace_webhook_events") {
            return makeChain(
              { data: null, error: null },
              {
                maybeSingleResult: { data: null, error: null },
                singleResult: { data: { id: "evt-row-pos" }, error: null },
                onUpdate: (p) => eventUpdates.push(p),
              }
            );
          }
          if (table === "marketplace_connectors") {
            return makeChain({
              data: {
                id: "conn-ifood-1",
                access_token: encryptSecret("ifood_token_live"),
                external_account_id: "merchant-uuid-1",
                token_expires_at: new Date(Date.now() + 3600_000).toISOString(),
                settings: { auto_accept_orders: true, client_id: "cid", client_secret: "csec" },
              },
              error: null,
            });
          }
          if (table === "marketplace_external_orders") {
            return makeChain(
              { data: { id: "ext-order-row-1", order_id: "master-ord-1" }, error: null },
              { onUpsert: (p) => externalUpserts.push(p) }
            );
          }
          if (table === "orders") {
            return makeChain(
              { data: { id: "master-ord-1" }, error: null },
              {
                maybeSingleResult: { data: null, error: null },
                singleResult: { data: { id: "master-ord-1" }, error: null },
                onInsert: (p) => orderInserts.push(p),
              }
            );
          }
          return makeChain({ data: null, error: null });
        }),
      } as any);

      const originalFetch = globalThis.fetch;
      const calledUrls: string[] = [];
      globalThis.fetch = vi.fn().mockImplementation(async (inputUrl: any) => {
        const u = String(inputUrl);
        calledUrls.push(u);
        if (u.includes("/order/v1.0/orders/ifood-ord-123")) {
          return new Response(
            JSON.stringify({
              id: "ifood-ord-123",
              displayId: "8844",
              fullCode: "PLACED",
              customer: { name: "Ana Paula" },
              total: { subTotal: 50, deliveryFee: 8, orderAmount: 58 },
              items: [{ name: "Combo X", quantity: 1, totalPrice: 50, externalCode: "SKU-1" }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(JSON.stringify({}), { status: 202, headers: { "Content-Type": "application/json" } });
      }) as any;

      try {
        const res = await handleInboundWebhook({
          platform: "ifood",
          eventId: "ifood-evt-positive",
          topic: "PLACED",
          resourceId: "ifood-ord-123",
          storeId: "store-1",
          payload: { id: "ifood-evt-positive", orderId: "ifood-ord-123", fullCode: "PLACED" },
        });

        expect(res.status).toBe("processed");
        expect(externalUpserts.length).toBeGreaterThanOrEqual(1);
        expect(orderInserts.length).toBeGreaterThanOrEqual(1);
        expect(calledUrls.some((u) => u.includes("/order/v1.0/orders/ifood-ord-123"))).toBe(true);
        expect(calledUrls.some((u) => u.includes("/events/acknowledgment"))).toBe(true);
        expect(calledUrls.some((u) => u.includes("/confirm"))).toBe(true);
        expect(eventUpdates.some((u) => u.status === "processed")).toBe(true);
      } finally {
        globalThis.fetch = originalFetch;
        spy.mockRestore();
      }
    });

    it("does NOT send iFood acknowledgment when DB order persistence fails (negative commit-before-ack test)", async () => {
      const supabaseModule = await import("@/lib/supabase");
      const eventUpdates: any[] = [];
      const spy = vi.spyOn(supabaseModule, "getServerClient").mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === "marketplace_webhook_events") {
            return makeChain(
              { data: { id: "evt-row-fail" }, error: null },
              {
                maybeSingleResult: { data: null, error: null },
                singleResult: { data: { id: "evt-row-fail" }, error: null },
                onUpdate: (u) => eventUpdates.push(u),
              }
            );
          }
          if (table === "marketplace_connectors") {
            return makeChain({
              data: {
                id: "conn-ifood-1",
                access_token: encryptSecret("ifood_token_live"),
                token_expires_at: new Date(Date.now() + 3600_000).toISOString(),
                settings: {},
              },
              error: null,
            });
          }
          if (table === "orders" || table === "marketplace_external_orders") {
            return makeChain(
              { data: null, error: { message: "db_write_timeout" } },
              {
                maybeSingleResult: { data: null, error: null },
                singleResult: { data: null, error: { message: "db_write_timeout" } },
              }
            );
          }
          return makeChain({ data: null, error: null });
        }),
      } as any);

      const originalFetch = globalThis.fetch;
      const calledUrls: string[] = [];
      globalThis.fetch = vi.fn().mockImplementation(async (inputUrl: any) => {
        const u = String(inputUrl);
        calledUrls.push(u);
        if (u.includes("/order/v1.0/orders/")) {
          return new Response(
            JSON.stringify({
              id: "ifood-ord-fail",
              fullCode: "PLACED",
              customer: { name: "Joao" },
              total: { orderAmount: 42 },
              items: [{ name: "Pizza", quantity: 1, totalPrice: 42 }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
        return new Response(null, { status: 202 });
      }) as any;

      try {
        await handleInboundWebhook({
          platform: "ifood",
          eventId: "ifood-evt-fail-1",
          topic: "PLACED",
          resourceId: "ifood-ord-fail",
          storeId: "store-1",
          payload: { id: "ifood-evt-fail-1", orderId: "ifood-ord-fail", fullCode: "PLACED" },
        });

        expect(calledUrls.some((u) => u.includes("/events/acknowledgment"))).toBe(false);
        expect(eventUpdates.some((u) => u.status === "failed")).toBe(true);
      } finally {
        globalThis.fetch = originalFetch;
        spy.mockRestore();
      }
    });

    it("retries failed webhooks via routeWebhookPlatformEvent without falsely returning duplicate", async () => {
      const supabaseModule = await import("@/lib/supabase");
      const updates: any[] = [];
      const failedRow = {
        id: "wh-failed-1",
        store_id: "store-1",
        platform: "mercadolivre",
        event_id: "ml-evt-retry",
        topic: "orders_v2",
        resource_id: "/orders/9001",
        status: "failed",
        retry_count: 1,
        payload: {
          id: 9001,
          status: "paid",
          total_amount: 120,
          buyer: { first_name: "Lucas", last_name: "Lima" },
          order_items: [{ quantity: 1, unit_price: 120, item: { title: "Fone", seller_sku: "SKU-A" } }],
        },
      };

      const spy = vi.spyOn(supabaseModule, "getServerClient").mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === "marketplace_webhook_events") {
            return makeChain({ data: [failedRow], error: null }, { onUpdate: (u) => updates.push(u) });
          }
          if (table === "marketplace_connectors" || table === "product_variants") {
            return makeChain({ data: null, error: null });
          }
          if (table === "orders") {
            return makeChain(
              { data: { id: "ok-order-id" }, error: null },
              {
                maybeSingleResult: { data: null, error: null },
                singleResult: { data: { id: "ok-order-id" }, error: null },
              }
            );
          }
          return makeChain({ data: { id: "ok-id" }, error: null });
        }),
      } as any);

      try {
        const res = await retryFailedWebhooks("store-1", 5);
        expect(res.retried).toBe(1);
        expect(res.recovered).toBe(1);
        expect(updates.some((u) => u.status === "processed")).toBe(true);
      } finally {
        spy.mockRestore();
      }
    });
  });

  describe("4. Multi-Tenant Feed Isolation & Honest Outbound Dispatch", () => {
    it("enforces fail-closed 400/404 and filters restricted visibility channels on Meta CSV feed", async () => {
      const supabaseModule = await import("@/lib/supabase");
      const tenantModule = await import("@/lib/tenant.server");
      const feedModule = await import("@/routes/api.feed.meta[.]csv");
      const GET = (feedModule.Route as any)?.options?.server?.handlers?.GET;
      expect(typeof GET).toBe("function");

      const tenantSpy = vi.spyOn(tenantModule, "resolveTenantStoreId").mockResolvedValue(null);
      const resNoStore = await GET({ request: new Request("https://waesy.com/api/feed/meta.csv") });
      expect(resNoStore.status).toBe(400);
      tenantSpy.mockRestore();

      const spy = vi.spyOn(supabaseModule, "getServerClient").mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === "stores") return makeChain({ data: null, error: null });
          return makeChain({ data: [], error: null });
        }),
      } as any);

      const resUnknownStore = await GET({ request: new Request("https://waesy.com/api/feed/meta.csv?store=inexistente") });
      expect(resUnknownStore.status).toBe(404);
      spy.mockRestore();

      const spyValid = vi.spyOn(supabaseModule, "getServerClient").mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === "stores") return makeChain({ data: { id: "store-tenant-a" }, error: null });
          if (table === "products") {
            return makeChain({
              data: [
                {
                  id: "p1",
                  slug: "visivel",
                  title: "Camisa Oficial",
                  description: "Algodão",
                  price_cents: 9900,
                  commercial_rules: { visibility_channel: "public" },
                  product_variants: [{ sku: "CAM-1", stock_on_hand: 5 }],
                  product_media: [{ url: "https://cdn.waesy.com/cam.jpg", sort_order: 0 }],
                },
                {
                  id: "p2",
                  slug: "vip",
                  title: "Item VIP Secreto",
                  description: "Restrito",
                  price_cents: 19900,
                  commercial_rules: { visibility_channel: "vip_only" },
                  product_variants: [{ sku: "VIP-1", stock_on_hand: 2 }],
                  product_media: [],
                },
              ],
              error: null,
            });
          }
          return makeChain({ data: null, error: null });
        }),
      } as any);

      try {
        const resOk = await GET({ request: new Request("https://waesy.com/api/feed/meta.csv?store=loja-a") });
        expect(resOk.status).toBe(200);
        const csv = await resOk.text();
        expect(csv).toContain("Camisa Oficial");
        expect(csv).not.toContain("Item VIP Secreto");
      } finally {
        spyValid.mockRestore();
      }
    });

    it("returns honest failed status on Mercado Livre HTTP 500 instead of fake success", async () => {
      const supabaseModule = await import("@/lib/supabase");
      const listingUpdates: any[] = [];
      const spy = vi.spyOn(supabaseModule, "getServerClient").mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === "marketplace_connectors") {
            return makeChain({
              data: { id: "conn-ml-1", access_token: encryptSecret("ml_tok"), settings: {} },
              error: null,
            });
          }
          if (table === "channel_listings") {
            return makeChain(
              {
                data: { id: "lst-ml-1", external_listing_id: "MLB123456", external_sku: null },
                error: null,
              },
              { onUpdate: (u) => listingUpdates.push(u) }
            );
          }
          return makeChain({ data: null, error: null });
        }),
      } as any);

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockImplementation(async () =>
        new Response(JSON.stringify({ message: "Internal Server Error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      ) as any;

      try {
        const res = await dispatchMarketplaceChannelSync({
          storeId: "store-1",
          connectorId: "conn-ml-1",
          platform: "mercadolivre",
          syncType: "stock",
          productId: "prod-1",
          newStockQty: 7,
        });

        expect(res.status).toBe("failed");
        expect(res.itemsProcessed).toBe(0);
        expect(listingUpdates.some((u) => u.channel_status === "error")).toBe(true);
      } finally {
        globalThis.fetch = originalFetch;
        spy.mockRestore();
      }
    });

    it("pushes dispatch status & tracking back to origin marketplace (iFood / Mercado Livre)", async () => {
      const supabaseModule = await import("@/lib/supabase");
      const spy = vi.spyOn(supabaseModule, "getServerClient").mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === "orders") {
            return makeChain({
              data: { id: "ord-1", channel_origin: "ifood", origin_channel: "ifood", notes: "" },
              error: null,
            });
          }
          if (table === "marketplace_external_orders") {
            return makeChain({
              data: {
                id: "ext-1",
                platform: "ifood",
                external_order_id: "ifood-abc-99",
                raw_payload: {},
              },
              error: null,
            });
          }
          if (table === "marketplace_connectors") {
            return makeChain({
              data: {
                id: "conn-ifood",
                access_token: encryptSecret("ifood_bearer_tok"),
                token_expires_at: new Date(Date.now() + 3600_000).toISOString(),
                settings: {},
              },
              error: null,
            });
          }
          return makeChain({ data: null, error: null });
        }),
      } as any);

      const mockFetch = vi.fn().mockImplementation(async () => new Response(null, { status: 202 }));
      try {
        const res = await pushOrderUpdateToOriginMarketplace({
          storeId: "store-1",
          orderId: "ord-1",
          targetStatus: "shipped",
          trackingCode: "BR999888777",
          fetchImpl: mockFetch as any,
        });

        expect(res.dispatched).toBe(true);
        expect(res.platform).toBe("ifood");
        expect(res.ok).toBe(true);
        expect(mockFetch.mock.calls[0][0]).toBe("https://merchant-api.ifood.com.br/order/v1.0/orders/ifood-abc-99/dispatch");

        const ifoodDirect = await pushIfoodOrderLifecycle({
          accessToken: "tok",
          externalOrderId: "ifood-abc-99",
          targetStatus: "startPreparation",
          fetchImpl: mockFetch as any,
        });
        expect(ifoodDirect.ok).toBe(true);
        expect(mockFetch.mock.calls[1][0]).toBe("https://merchant-api.ifood.com.br/order/v1.0/orders/ifood-abc-99/startPreparation");
      } finally {
        spy.mockRestore();
      }
    });
  });
});
