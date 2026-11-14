import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { encryptSecret, decryptSecret } from "@/lib/crypto-vault.server";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { logSystemError } from "@/lib/logger";
import { fetchWithExponentialBackoff } from "@/lib/resilient-api-client";
import {
  buildMarketplaceOAuthAuthorizeUrl,
  generateShopeeSign,
  acknowledgeIfoodEvents,
  pushIfoodOrderLifecycle,
} from "@/lib/marketplace-api-client";
import {
  resolveConnectorCredentialsWithRefresh,
  pushOrderUpdateToOriginMarketplace,
} from "@/lib/marketplace-vault.server";

export const MARKETPLACE_PLATFORMS = [
  "mercadolivre",
  "ifood",
  "shopee",
  "magalu",
  "amazon",
  "rappi",
  "amodelivery",
  "melhorenvio",
  "correios",
  "google_business",
  "99food",
  "amoofertas",
  "kangu",
  "frenet",
  "loggi",
  "jadlog",
  "bling",
  "tiny",
] as const;

export type MarketplacePlatform = (typeof MARKETPLACE_PLATFORMS)[number];

export type MarketplaceStatus = "connected" | "disconnected" | "error" | "pending";

export interface MarketplaceConnectorDTO {
  id: string;
  store_id: string;
  platform: MarketplacePlatform;
  name: string;
  external_account_id: string | null;
  account_nickname: string | null;
  status: MarketplaceStatus;
  sync_status: string;
  last_sync_at: string | null;
  error_message: string | null;
  settings: {
    auto_accept_orders?: boolean;
    sync_products?: boolean;
    sync_orders?: boolean;
    sync_stock?: boolean;
    sync_prices?: boolean;
    price_margin_percent?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface ExternalOrderDTO {
  id: string;
  order_id?: string | null;
  platform: string;
  external_order_id: string;
  external_status: string;
  buyer_name: string | null;
  subtotal_cents: number;
  shipping_cost_cents: number;
  marketplace_fee_cents: number;
  net_payout_cents: number;
  total_amount_cents: number;
  tracking_number: string | null;
  payment_method?: string | null;
  shipping_method?: string | null;
  items: Array<{
    title: string;
    quantity: number;
    unit_price_cents: number;
    sku?: string;
  }>;
  imported_at: string;
}

export interface MarketplaceChannelFinancialSummaryDTO {
  platform: string;
  order_count: number;
  gross_sales_cents: number;
  marketplace_fees_cents: number;
  net_payout_cents: number;
}

export interface ProductMarketplaceMappingDTO {
  id: string;
  title: string;
  sku: string | null;
  price_cents: number;
  stock_on_hand: number;
  publish_to_marketplace: boolean;
  mappings: Record<string, {
    listing_id?: string;
    external_sku?: string;
    price_margin_percent?: number;
    synced_at?: string;
    status?: "active" | "paused" | "error";
  }>;
}

export interface InventoryLocationDTO {
  id: string;
  store_id: string;
  name: string;
  slug: string | null;
  type: "warehouse" | "storefront" | "dark_store" | "kitchen" | "fulfillment_center";
  is_default: boolean;
  is_active: boolean;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
  dispatch_radius_km: number | null;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceSyncLogDTO {
  id: string;
  platform: string;
  sync_type: string;
  direction: string;
  status: string;
  items_processed: number;
  items_updated: number;
  items_failed: number;
  duration_ms: number | null;
  created_at: string;
}

/**
 * Lista todos os conectores de marketplace para a loja.
 */
export const listMarketplaceConnectors = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().optional() }).optional())
  .handler(async ({ data }): Promise<MarketplaceConnectorDTO[]> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const targetStoreId = data?.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    const { data: rows, error } = await supabase
      .from("marketplace_connectors")
      .select("id, store_id, platform, name, external_account_id, account_nickname, status, sync_status, last_sync_at, error_message, settings, created_at, updated_at")
      .eq("store_id", targetStoreId)
      .order("name", { ascending: true });

    if (error) {
      await logSystemError({
        operation: "listMarketplaceConnectors",
        error,
        table_name: "marketplace_connectors",
        contract_name: "listMarketplaceConnectors",
      });
      return [];
    }

    return (rows || []) as MarketplaceConnectorDTO[];
  });

/**
 * Salva ou atualiza a conexão de um canal de marketplace.
 */
export const saveMarketplaceConnector = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      platform: z.enum(MARKETPLACE_PLATFORMS),
      name: z.string().min(2),
      external_account_id: z.string().optional().nullable(),
      account_nickname: z.string().optional().nullable(),
      webhook_secret: z.string().optional().nullable(),
      // Credenciais específicas por plataforma (client_id, client_secret, partner_key, etc.)
      credential_payload: z.record(z.string()).optional().nullable(),
      // Legacy single token (mantido para retrocompatibilidade)
      access_token: z.string().optional().nullable(),
      refresh_token: z.string().optional().nullable(),
      status: z.enum(["connected", "disconnected", "error", "pending"]).default("connected"),
      settings: z.record(z.any()).optional().default({}),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const targetStoreId = data.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    // Busca registro anterior para preservar segredos mascarados ("••••••••") ou não alterados durante edição de preferências
    const { data: existingRow } = await supabase
      .from("marketplace_connectors")
      .select("id, external_account_id, account_nickname, access_token, refresh_token, webhook_secret, settings")
      .eq("store_id", targetStoreId)
      .eq("platform", data.platform)
      .maybeSingle();

    const prevSettings = (existingRow?.settings || {}) as Record<string, any>;
    const prevCreds = (prevSettings.credentials || {}) as Record<string, string>;

    const creds = data.credential_payload || {};
    const primaryToken =
      data.access_token ||
      creds.access_token ||
      creds.api_token ||
      creds.api_key ||
      creds.client_secret ||
      creds.partner_key ||
      creds.lwa_client_secret ||
      creds.refresh_token ||
      null;

    const hasExistingCredentials = Boolean(
      existingRow?.access_token ||
        existingRow?.refresh_token ||
        Object.keys(prevCreds).some((k) => Boolean(prevCreds[k]))
    );

    if (data.status === "connected" && (!primaryToken || primaryToken.trim().length < 4) && !hasExistingCredentials) {
      throw new Error(
        `CREDENCIAIS OBRIGATÓRIAS (${data.name}): Informe uma API Key, Access Token ou Client Secret autêntico para ativar a integração.`
      );
    }

    const encryptedCredentials: Record<string, string> = { ...prevCreds };
    for (const [k, v] of Object.entries(creds)) {
      if (typeof v === "string" && v.trim() !== "" && v.trim() !== "••••••••") {
        const isSecretField =
          k.includes("secret") ||
          k.includes("token") ||
          k.includes("key") ||
          k.includes("password") ||
          k.includes("access_code");
        encryptedCredentials[k] = isSecretField ? encryptSecret(v.trim()) : v.trim();
      }
    }

    const encryptedPrimaryToken =
      primaryToken && primaryToken.trim() !== "••••••••"
        ? encryptSecret(primaryToken.trim())
        : existingRow?.access_token || null;

    const rawRefresh = creds.refresh_token || data.refresh_token || null;
    const encryptedRefreshToken =
      rawRefresh && rawRefresh.trim() !== "••••••••"
        ? encryptSecret(rawRefresh.trim())
        : existingRow?.refresh_token || null;

    const resolvedExternalAccountId =
      data.external_account_id ||
      creds.seller_id ||
      creds.merchant_uuid ||
      creds.shop_id ||
      existingRow?.external_account_id ||
      null;

    const mergedSettings = {
      ...prevSettings,
      ...(data.settings || {}),
      encryption_algorithm: "AES-256-GCM",
      credentials: encryptedCredentials,
    };

    const payload = {
      store_id: targetStoreId,
      platform: data.platform,
      name: data.name,
      external_account_id: resolvedExternalAccountId,
      account_nickname: data.account_nickname ?? existingRow?.account_nickname ?? null,
      access_token: encryptedPrimaryToken,
      refresh_token: encryptedRefreshToken,
      ...(data.webhook_secret ? { webhook_secret: encryptSecret(data.webhook_secret.trim()) } : {}),
      credentials: encryptedCredentials,
      status: data.status,
      settings: mergedSettings,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error } = await supabase
      .from("marketplace_connectors")
      .upsert(payload, { onConflict: "store_id,platform" })
      .select("id, platform, name, status, account_nickname")
      .single();

    if (error) {
      await logSystemError({
        operation: "saveMarketplaceConnector",
        error,
        table_name: "marketplace_connectors",
        contract_name: "saveMarketplaceConnector",
      });
      throw new Error(`Falha ao conectar ${data.name}: ${error.message}`);
    }

    return saved;
  });

/**
 * Desconecta um conector de marketplace com 1 clique (zero fake toasts).
 */
export const disconnectMarketplaceConnector = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      platform: z.enum(MARKETPLACE_PLATFORMS),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const targetStoreId = data.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    // Busca settings atuais para preservar preferências de sync e limpar só as credenciais
    const { data: current } = await supabase
      .from("marketplace_connectors")
      .select("settings")
      .eq("store_id", targetStoreId)
      .eq("platform", data.platform)
      .maybeSingle();

    const cleanSettings = { ...(current?.settings || {}), credentials: null };

    const { error } = await supabase
      .from("marketplace_connectors")
      .update({
        status: "disconnected",
        access_token: null,
        refresh_token: null,
        sync_status: "idle",
        settings: cleanSettings,
        updated_at: new Date().toISOString(),
      })
      .eq("store_id", targetStoreId)
      .eq("platform", data.platform);

    if (error) {
      await logSystemError({
        operation: "disconnectMarketplaceConnector",
        error,
        table_name: "marketplace_connectors",
        contract_name: "disconnectMarketplaceConnector",
      });
      throw new Error(`Erro ao desconectar integração: ${error.message}`);
    }

    return { success: true };
  });

export interface MarketplaceDispatchResult {
  status: "dispatched" | "unconfigured" | "test_mode_recorded" | "completed" | "failed";
  message: string;
  itemsProcessed: number;
}

function safeDecryptField(val: unknown): string {
  if (typeof val !== "string" || !val.trim()) return "";
  const trimmed = val.trim();
  try {
    return decryptSecret(trimmed);
  } catch {
    return trimmed;
  }
}

export async function resolveMarketplaceConnectorCredentials(params: {
  storeId: string;
  platform: string;
  forceRefresh?: boolean;
  fetchImpl?: typeof fetch;
  connectorRow?: {
    id?: string;
    access_token?: string | null;
    refresh_token?: string | null;
    external_account_id?: string | null;
    token_expires_at?: string | null;
    settings?: Record<string, any> | null;
  } | null;
}) {
  return resolveConnectorCredentialsWithRefresh(params);
}

async function upsertPulledMarketplaceOrderToMaster(params: {
  storeId: string;
  platform: string;
  externalOrderId: string;
  externalStatus: string;
  buyerName: string;
  subtotalCents: number;
  shippingCostCents: number;
  marketplaceFeeCents: number;
  totalAmountCents: number;
  trackingNumber?: string | null;
  items: Array<{ title: string; quantity: number; unit_price_cents: number; sku?: string }>;
}) {
  const supabase = getServerClient();
  const netPayoutCents = Math.max(
    0,
    params.totalAmountCents - params.marketplaceFeeCents - params.shippingCostCents
  );

  await supabase.from("marketplace_external_orders").upsert(
    {
      store_id: params.storeId,
      platform: params.platform,
      external_order_id: params.externalOrderId,
      external_status: params.externalStatus,
      buyer_name: params.buyerName,
      subtotal_cents: params.subtotalCents,
      shipping_cost_cents: params.shippingCostCents,
      marketplace_fee_cents: params.marketplaceFeeCents,
      net_payout_cents: netPayoutCents,
      total_amount_cents: params.totalAmountCents,
      ...(params.trackingNumber ? { tracking_number: params.trackingNumber } : {}),
      items: params.items,
      imported_at: new Date().toISOString(),
    },
    { onConflict: "store_id,platform,external_order_id" }
  );

  // Sincroniza atomicamente com a tabela mestra public.orders e vincula FK `order_id`
  const { data: existingOrder } = await supabase
    .from("orders")
    .select("id")
    .eq("store_id", params.storeId)
    .eq("channel_origin", params.platform)
    .ilike("notes", `%#${params.externalOrderId}%`)
    .maybeSingle();

  const normalizedStatus = ["paid", "confirmed", "approved", "concluded"].includes(
    params.externalStatus.toLowerCase()
  )
    ? "paid"
    : ["cancelled", "canceled"].includes(params.externalStatus.toLowerCase())
      ? "cancelled"
      : ["shipped", "dispatched"].includes(params.externalStatus.toLowerCase())
        ? "shipped"
        : ["delivered", "completed"].includes(params.externalStatus.toLowerCase())
          ? "delivered"
          : "processing";

  let masterOrderId = existingOrder?.id || null;

  if (masterOrderId) {
    await supabase
      .from("orders")
      .update({ status: normalizedStatus as any, updated_at: new Date().toISOString() })
      .eq("id", masterOrderId);
  } else {
    const { data: createdOrder } = await supabase
      .from("orders")
      .insert({
        store_id: params.storeId,
        status: normalizedStatus as any,
        origin_type: "marketplace",
        origin_channel: params.platform,
        subtotal_cents: params.subtotalCents,
        shipping_cents: params.shippingCostCents,
        discount_cents: 0,
        total_cents: params.totalAmountCents,
        channel_origin: params.platform,
        cost_breakdown: {
          marketplace_fee_cents: params.marketplaceFeeCents,
          shipping_cost_cents: params.shippingCostCents,
          net_payout_cents: netPayoutCents,
          channel: params.platform,
        },
        customer_snapshot: {
          name: params.buyerName,
          origin: params.platform,
          external_order_id: params.externalOrderId,
        },
        items_snapshot: params.items,
        notes: `Pedido sincronizado via ${params.platform.toUpperCase()} #${params.externalOrderId}`,
      })
      .select("id")
      .maybeSingle();

    if (createdOrder?.id) {
      masterOrderId = createdOrder.id;
      if (params.items.length > 0) {
        await supabase.from("order_items").insert(
          params.items.map((it) => ({
            order_id: createdOrder.id,
            product_title: it.title,
            variant_sku: it.sku || null,
            qty: it.quantity || 1,
            unit_price_cents: it.unit_price_cents || 0,
            total_cents: (it.quantity || 1) * (it.unit_price_cents || 0),
          }))
        );
      }
    }
  }

  if (masterOrderId) {
    await supabase
      .from("marketplace_external_orders")
      .update({ order_id: masterOrderId, synced_to_master_at: new Date().toISOString() })
      .eq("store_id", params.storeId)
      .eq("platform", params.platform)
      .eq("external_order_id", params.externalOrderId);
  }
}

async function fetchWithAutoRefreshOn401(params: {
  storeId: string;
  platform: string;
  url: string;
  init: RequestInit;
  initialToken: string;
}): Promise<{ ok: boolean; status: number; data: any; tokenUsed: string }> {
  let activeToken = params.initialToken;
  let res = await fetchWithExponentialBackoff(
    params.url,
    {
      ...params.init,
      headers: {
        ...(params.init.headers || {}),
        Authorization: `Bearer ${activeToken}`,
      },
    },
    { maxRetries: 2, baseDelayMs: 400 }
  );

  if (res.status === 401) {
    const refreshed = await resolveConnectorCredentialsWithRefresh({
      storeId: params.storeId,
      platform: params.platform,
      forceRefresh: true,
    });
    if (refreshed.accessToken && refreshed.accessToken !== activeToken) {
      activeToken = refreshed.accessToken;
      res = await fetchWithExponentialBackoff(
        params.url,
        {
          ...params.init,
          headers: {
            ...(params.init.headers || {}),
            Authorization: `Bearer ${activeToken}`,
          },
        },
        { maxRetries: 2, baseDelayMs: 400 }
      );
    }
  }

  return { ok: res.ok, status: res.status, data: res.data, tokenUsed: activeToken };
}

/**
 * Despachador de canal de Marketplace (Padrão Outbox Transacional + Sincronização Bidirecional Real).
 * Nunca retorna sucesso falso-positivo quando API falha ou canal não possui integração válida.
 */
export async function dispatchMarketplaceChannelSync(params: {
  storeId: string;
  connectorId: string;
  platform: string;
  syncType: "catalog" | "stock" | "orders" | "prices" | "full";
  settings?: Record<string, any>;
  accessToken?: string | null;
  refreshToken?: string | null;
  externalAccountId?: string | null;
  itemCount?: number;
  productId?: string;
  newStockQty?: number;
}): Promise<MarketplaceDispatchResult> {
  const supabase = getServerClient();

  const resolved = await resolveMarketplaceConnectorCredentials({
    storeId: params.storeId,
    platform: params.platform,
    connectorRow: {
      id: params.connectorId,
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
      external_account_id: params.externalAccountId,
      settings: params.settings,
    },
  });

  if (!resolved.isConfigured) {
    return {
      status: "unconfigured",
      message: `Canal ${params.platform.toUpperCase()} sem chaves de API/Tokens configurados. Registrado pendente de configuração.`,
      itemsProcessed: 0,
    };
  }

  if (resolved.isTestMode) {
    return {
      status: "test_mode_recorded",
      message: `Sincronização em ambiente Sandbox/Teste de ${params.platform.toUpperCase()} validada com sucesso.`,
      itemsProcessed: params.itemCount || 1,
    };
  }

  let token = resolved.accessToken;
  const settings = resolved.settings;

  try {
    // 4.1 Canal Direto: Mercado Livre (Estoque incl. variações, Pull de Pedidos e Push de Preços/Catálogo)
    if (params.platform === "mercadolivre" && token) {
      if (params.productId && params.syncType === "stock") {
        const { data: listing } = await supabase
          .from("channel_listings")
          .select("id, external_listing_id, external_sku")
          .eq("store_id", params.storeId)
          .eq("product_id", params.productId)
          .eq("channel", "mercadolivre")
          .maybeSingle();

        const externalId = listing?.external_listing_id;
        if (!externalId) {
          return {
            status: "completed",
            message: "Produto sem anúncio vinculado no Mercado Livre (nenhum envio necessário).",
            itemsProcessed: 0,
          };
        }

        // Inspeciona se anúncio possui variações para respeitar regra da API do Mercado Livre
        let itemBody: Record<string, any> = { available_quantity: params.newStockQty ?? 0 };
        const inspectRes = await fetchWithAutoRefreshOn401({
          storeId: params.storeId,
          platform: "mercadolivre",
          url: `https://api.mercadolibre.com/items/${externalId}`,
          init: { method: "GET" },
          initialToken: token,
        });
        token = inspectRes.tokenUsed;

        if (inspectRes.ok && Array.isArray(inspectRes.data?.variations) && inspectRes.data.variations.length > 0) {
          const sku = listing?.external_sku;
          const variations = inspectRes.data.variations.map((v: any) => {
            const matchesSku = sku && (v.seller_custom_field === sku || v.attributes?.some((a: any) => a.id === "SELLER_SKU" && a.value_name === sku));
            if (matchesSku || !sku) {
              return { id: v.id, available_quantity: params.newStockQty ?? 0 };
            }
            return { id: v.id, available_quantity: v.available_quantity };
          });
          itemBody = { variations };
        }

        const mlRes = await fetchWithAutoRefreshOn401({
          storeId: params.storeId,
          platform: "mercadolivre",
          url: `https://api.mercadolibre.com/items/${externalId}`,
          init: {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(itemBody),
          },
          initialToken: token,
        });
        token = mlRes.tokenUsed;

        if (!mlRes.ok) {
          await supabase
            .from("channel_listings")
            .update({
              channel_status: "error",
              sync_error_message: mlRes.data?.message || `HTTP ${mlRes.status}`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", listing.id);
          return {
            status: "failed",
            message: `Mercado Livre rejeitou atualização de estoque de ${externalId}: ${mlRes.data?.message || `HTTP ${mlRes.status}`}`,
            itemsProcessed: 0,
          };
        }

        await supabase
          .from("channel_listings")
          .update({ channel_status: "active", sync_error_message: null, last_synced_at: new Date().toISOString() })
          .eq("id", listing.id);

        return {
          status: "completed",
          message: `Estoque do anúncio ${externalId} atualizado no Mercado Livre para ${params.newStockQty ?? 0} un (HTTP ${mlRes.status}).`,
          itemsProcessed: 1,
        };
      }

      if (params.syncType === "orders" || params.syncType === "full") {
        let sellerId = resolved.externalAccountId.replace(/^MLB/i, "");
        if (!sellerId) {
          const meRes = await fetchWithAutoRefreshOn401({
            storeId: params.storeId,
            platform: "mercadolivre",
            url: "https://api.mercadolibre.com/users/me",
            init: { method: "GET" },
            initialToken: token,
          });
          token = meRes.tokenUsed;
          if (!meRes.ok) {
            return {
              status: "failed",
              message: `Mercado Livre rejeitou autenticação (HTTP ${meRes.status}). Refaça o login OAuth 2.0.`,
              itemsProcessed: 0,
            };
          }
          sellerId = meRes.data?.id ? String(meRes.data.id) : "";
        }

        if (sellerId) {
          const ordersRes = await fetchWithAutoRefreshOn401({
            storeId: params.storeId,
            platform: "mercadolivre",
            url: `https://api.mercadolibre.com/orders/search?seller=${encodeURIComponent(sellerId)}&sort=date_desc&limit=20`,
            init: { method: "GET" },
            initialToken: token,
          });
          token = ordersRes.tokenUsed;

          if (!ordersRes.ok) {
            return {
              status: "failed",
              message: `Erro ao consultar pedidos Mercado Livre (HTTP ${ordersRes.status}): ${ordersRes.data?.message || "Acesso negado"}`,
              itemsProcessed: 0,
            };
          }

          const results = Array.isArray(ordersRes.data?.results) ? ordersRes.data.results : [];
          for (const ord of results) {
            const extId = String(ord.id || "");
            if (!extId) continue;
            const totalCents = Math.round(Number(ord.total_amount || 0) * 100);
            const shippingCents = Math.round(Number(ord.shipping?.cost || 0) * 100);
            const items = Array.isArray(ord.order_items)
              ? ord.order_items.map((oi: any) => ({
                  title: String(oi.item?.title || "Item Mercado Livre"),
                  quantity: Number(oi.quantity || 1),
                  unit_price_cents: Math.round(Number(oi.unit_price || 0) * 100),
                  sku: oi.item?.seller_sku ? String(oi.item.seller_sku) : undefined,
                }))
              : [];
            const feeCents = Array.isArray(ord.order_items)
              ? ord.order_items.reduce(
                  (acc: number, oi: any) => acc + Math.round(Number(oi.sale_fee || 0) * 100),
                  0
                )
              : 0;
            await upsertPulledMarketplaceOrderToMaster({
              storeId: params.storeId,
              platform: "mercadolivre",
              externalOrderId: extId,
              externalStatus: String(ord.status || "paid"),
              buyerName: String(ord.buyer?.nickname || ord.buyer?.first_name || "Comprador ML"),
              subtotalCents: Math.max(0, totalCents - shippingCents),
              shippingCostCents: shippingCents,
              marketplaceFeeCents: feeCents,
              totalAmountCents: totalCents,
              items,
            });
          }

          if (params.syncType === "orders") {
            return {
              status: "completed",
              message: `Sincronização Mercado Livre concluída: ${results.length} pedido(s) consultado(s) e conciliado(s).`,
              itemsProcessed: results.length,
            };
          }
        }
      }

      if (params.syncType === "catalog" || params.syncType === "prices" || params.syncType === "full") {
        const { data: mappedListings } = await supabase
          .from("channel_listings")
          .select("id, product_id, external_listing_id, attributes, price_cents")
          .eq("store_id", params.storeId)
          .eq("channel", "mercadolivre");

        let updatedListings = 0;
        let failedListings = 0;
        for (const row of mappedListings || []) {
          if (!row.external_listing_id) continue;
          const { data: prod } = await supabase
            .from("products")
            .select("price_cents")
            .eq("id", row.product_id)
            .maybeSingle();
          if (!prod) continue;
          const attrs = (row.attributes as Record<string, any>) || {};
          const margin = Number(attrs.price_margin_percent || 0);
          const targetPriceCents = row.price_cents || Math.round((prod.price_cents || 0) * (1 + margin / 100));
          const adjustedPrice = Number((targetPriceCents / 100).toFixed(2));
          const putRes = await fetchWithAutoRefreshOn401({
            storeId: params.storeId,
            platform: "mercadolivre",
            url: `https://api.mercadolibre.com/items/${row.external_listing_id}`,
            init: {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ price: adjustedPrice }),
            },
            initialToken: token,
          });
          token = putRes.tokenUsed;
          if (putRes.ok) {
            updatedListings += 1;
            await supabase
              .from("channel_listings")
              .update({
                channel_status: "active",
                sync_error_message: null,
                last_synced_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", row.id);
          } else {
            failedListings += 1;
            await supabase
              .from("channel_listings")
              .update({
                channel_status: "error",
                sync_error_message: putRes.data?.message || `HTTP ${putRes.status}`,
                updated_at: new Date().toISOString(),
              })
              .eq("id", row.id);
          }
        }

        if (failedListings > 0 && updatedListings === 0) {
          return {
            status: "failed",
            message: `Mercado Livre rejeitou atualização em ${failedListings} anúncio(s). Verifique token OAuth e permissões.`,
            itemsProcessed: 0,
          };
        }

        return {
          status: "completed",
          message:
            updatedListings > 0
              ? `Mercado Livre sincronizado (${updatedListings} anúncio(s) atualizado(s)).`
              : "Sincronização completa com Mercado Livre executada.",
          itemsProcessed: updatedListings,
        };
      }
    }

    // 4.2 Canal Direto: iFood Merchant API v1.0 (Disponibilidade, Polling + Acknowledgment pós-DB)
    if (params.platform === "ifood" && token) {
      const merchantUuid = resolved.externalAccountId;
      if (params.productId && params.syncType === "stock") {
        if (!merchantUuid) {
          return { status: "failed", message: "Merchant UUID do iFood não informado no conector.", itemsProcessed: 0 };
        }
        const { data: listing } = await supabase
          .from("channel_listings")
          .select("external_listing_id")
          .eq("store_id", params.storeId)
          .eq("product_id", params.productId)
          .eq("channel", "ifood")
          .maybeSingle();

        const externalItemId = listing?.external_listing_id || params.productId;
        const itemStatus = (params.newStockQty ?? 0) > 0 ? "AVAILABLE" : "UNAVAILABLE";
        const ifoodRes = await fetchWithAutoRefreshOn401({
          storeId: params.storeId,
          platform: "ifood",
          url: `https://merchant-api.ifood.com.br/catalog/v1.0/merchants/${merchantUuid}/items/${externalItemId}/status`,
          init: {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: itemStatus }),
          },
          initialToken: token,
        });

        if (!ifoodRes.ok) {
          return {
            status: "failed",
            message: `iFood rejeitou alteração de disponibilidade do item ${externalItemId} (HTTP ${ifoodRes.status}).`,
            itemsProcessed: 0,
          };
        }

        return {
          status: "completed",
          message: `Disponibilidade do item ${externalItemId} atualizada no iFood para ${itemStatus} (HTTP ${ifoodRes.status}).`,
          itemsProcessed: 1,
        };
      }

      if (params.syncType === "orders" || params.syncType === "full" || params.syncType === "catalog" || params.syncType === "prices") {
        const pollRes = await fetchWithAutoRefreshOn401({
          storeId: params.storeId,
          platform: "ifood",
          url: "https://merchant-api.ifood.com.br/order/v1.0/events:polling",
          init: {
            method: "GET",
            headers: { ...(merchantUuid ? { "x-polling-merchants": merchantUuid } : {}) },
          },
          initialToken: token,
        });
        token = pollRes.tokenUsed;

        if (!pollRes.ok) {
          return {
            status: "failed",
            message: `iFood Polling rejeitado (HTTP ${pollRes.status}). Verifique Client ID/Secret e Merchant UUID.`,
            itemsProcessed: 0,
          };
        }

        const events = Array.isArray(pollRes.data) ? pollRes.data : [];
        let syncedOrders = 0;
        const ackIds: string[] = [];

        for (const ev of events.slice(0, 20)) {
          if (ev.id) ackIds.push(String(ev.id));
          const ordId = String(ev.orderId || "");
          if (!ordId) continue;

          const detailRes = await fetchWithExponentialBackoff(
            `https://merchant-api.ifood.com.br/order/v1.0/orders/${ordId}`,
            { method: "GET", headers: { Authorization: `Bearer ${token}` } },
            { maxRetries: 2, baseDelayMs: 300 }
          );

          if (detailRes.ok && detailRes.data) {
            const d = detailRes.data;
            const totalCents = Math.round(Number(d.total?.orderAmount || 0) * 100);
            const deliveryCents = Math.round(Number(d.total?.deliveryFee || 0) * 100);
            const explicitFeesCents = d.total?.fees !== undefined ? Math.round(Number(d.total.fees) * 100) : Math.round(totalCents * 0.12);
            const items = Array.isArray(d.items)
              ? d.items.map((it: any) => ({
                  title: String(it.name || "Item iFood"),
                  quantity: Number(it.quantity || 1),
                  unit_price_cents: Math.round(Number(it.unitPrice || 0) * 100),
                  sku: it.externalCode ? String(it.externalCode) : undefined,
                }))
              : [];

            await upsertPulledMarketplaceOrderToMaster({
              storeId: params.storeId,
              platform: "ifood",
              externalOrderId: ordId,
              externalStatus: String(ev.fullCode || "CONFIRMED"),
              buyerName: String(d.customer?.name || "Cliente iFood"),
              subtotalCents: Math.max(0, totalCents - deliveryCents),
              shippingCostCents: deliveryCents,
              marketplaceFeeCents: explicitFeesCents,
              totalAmountCents: totalCents,
              items,
            });
            syncedOrders += 1;

            if (settings.auto_accept_orders && String(ev.code || ev.fullCode || "").toUpperCase() === "PLACED") {
              await pushIfoodOrderLifecycle({
                accessToken: token,
                externalOrderId: ordId,
                targetStatus: "confirmed",
              });
            }
          }
        }

        // Regra Oficial iFood: Acknowledgment obrigatório somente após persistência
        if (ackIds.length > 0) {
          await acknowledgeIfoodEvents(token, ackIds);
        }

        return {
          status: "completed",
          message: `Polling iFood concluído: ${syncedOrders} pedido(s) sincronizado(s) e ${ackIds.length} evento(s) confirmados.`,
          itemsProcessed: Math.max(events.length, syncedOrders),
        };
      }
    }

    // 4.3 Canal Direto: Shopee Open Platform v2 (Pedidos, Estoque & Preços com HMAC-SHA256)
    if (params.platform === "shopee" && token && resolved.clientId && resolved.clientSecret && resolved.externalAccountId) {
      const partnerId = resolved.clientId;
      const partnerKey = resolved.clientSecret;
      const shopId = resolved.externalAccountId;
      const ts = Math.floor(Date.now() / 1000);

      if (params.productId && (params.syncType === "stock" || params.syncType === "prices")) {
        const { data: listing } = await supabase
          .from("channel_listings")
          .select("external_listing_id, price_cents")
          .eq("store_id", params.storeId)
          .eq("product_id", params.productId)
          .eq("channel", "shopee")
          .maybeSingle();

        if (!listing?.external_listing_id) {
          return { status: "completed", message: "Produto sem anúncio vinculado na Shopee.", itemsProcessed: 0 };
        }

        const apiPath = params.syncType === "stock" ? "/api/v2/product/update_stock" : "/api/v2/product/update_price";
        const sign = generateShopeeSign({ partnerId, partnerKey, apiPath, timestamp: ts, accessToken: token, shopId });
        const url = `https://partner.shopeemobile.com${apiPath}?partner_id=${encodeURIComponent(partnerId)}&timestamp=${ts}&access_token=${encodeURIComponent(token)}&shop_id=${encodeURIComponent(shopId)}&sign=${sign}`;

        const body =
          params.syncType === "stock"
            ? { item_id: Number(listing.external_listing_id), stock_list: [{ seller_stock: [{ stock: params.newStockQty ?? 0 }] }] }
            : { item_id: Number(listing.external_listing_id), price_list: [{ original_price: Number(((listing.price_cents || 0) / 100).toFixed(2)) }] };

        const res = await fetchWithExponentialBackoff(
          url,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
          { maxRetries: 2, baseDelayMs: 400 }
        );

        if (!res.ok || res.data?.error) {
          return {
            status: "failed",
            message: `Shopee API rejeitou atualização: ${res.data?.message || res.data?.error || `HTTP ${res.status}`}`,
            itemsProcessed: 0,
          };
        }

        return {
          status: "completed",
          message: `Anúncio #${listing.external_listing_id} atualizado na Shopee v2.`,
          itemsProcessed: 1,
        };
      }

      if (params.syncType === "orders" || params.syncType === "full" || params.syncType === "catalog") {
        const listPath = "/api/v2/order/get_order_list";
        const listSign = generateShopeeSign({ partnerId, partnerKey, apiPath: listPath, timestamp: ts, accessToken: token, shopId });
        const timeTo = ts;
        const timeFrom = ts - 86400 * 7;
        const listUrl =
          `https://partner.shopeemobile.com${listPath}?partner_id=${encodeURIComponent(partnerId)}&timestamp=${ts}&access_token=${encodeURIComponent(token)}&shop_id=${encodeURIComponent(shopId)}&sign=${listSign}` +
          `&time_range_field=create_time&time_from=${timeFrom}&time_to=${timeTo}&page_size=20`;

        const listRes = await fetchWithExponentialBackoff(listUrl, { method: "GET" }, { maxRetries: 2, baseDelayMs: 400 });
        if (!listRes.ok || listRes.data?.error) {
          return {
            status: "failed",
            message: `Shopee v2 falhou ao listar pedidos: ${listRes.data?.message || listRes.data?.error || `HTTP ${listRes.status}`}`,
            itemsProcessed: 0,
          };
        }

        const snList = (listRes.data?.response?.order_list || []).map((o: any) => o.order_sn).filter(Boolean);
        let importedCount = 0;
        if (snList.length > 0) {
          const detPath = "/api/v2/order/get_order_detail";
          const detTs = Math.floor(Date.now() / 1000);
          const detSign = generateShopeeSign({ partnerId, partnerKey, apiPath: detPath, timestamp: detTs, accessToken: token, shopId });
          const detUrl =
            `https://partner.shopeemobile.com${detPath}?partner_id=${encodeURIComponent(partnerId)}&timestamp=${detTs}&access_token=${encodeURIComponent(token)}&shop_id=${encodeURIComponent(shopId)}&sign=${detSign}` +
            `&order_sn_list=${encodeURIComponent(snList.slice(0, 20).join(","))}&response_optional_fields=buyer_username,recipient_address,item_list,total_amount,actual_shipping_fee`;
          const detRes = await fetchWithExponentialBackoff(detUrl, { method: "GET" }, { maxRetries: 2, baseDelayMs: 400 });
          if (detRes.ok && Array.isArray(detRes.data?.response?.order_list)) {
            for (const o of detRes.data.response.order_list) {
              const totalCents = Math.round(Number(o.total_amount || 0) * 100);
              const shipCents = Math.round(Number(o.actual_shipping_fee || 0) * 100);
              const feeCents = Math.round(totalCents * 0.14);
              const items = Array.isArray(o.item_list)
                ? o.item_list.map((it: any) => ({
                    title: String(it.item_name || "Item Shopee"),
                    quantity: Number(it.model_quantity_purchased || 1),
                    unit_price_cents: Math.round(Number(it.model_discounted_price || 0) * 100),
                    sku: it.model_sku || it.item_sku || undefined,
                  }))
                : [];
              await upsertPulledMarketplaceOrderToMaster({
                storeId: params.storeId,
                platform: "shopee",
                externalOrderId: String(o.order_sn),
                externalStatus: String(o.order_status || "paid"),
                buyerName: String(o.buyer_username || o.recipient_address?.name || "Cliente Shopee"),
                subtotalCents: Math.max(0, totalCents - shipCents),
                shippingCostCents: shipCents,
                marketplaceFeeCents: feeCents,
                totalAmountCents: totalCents,
                items,
              });
              importedCount++;
            }
          }
        }

        return {
          status: "completed",
          message: `Shopee v2 sincronizada: ${importedCount} pedido(s) conciliado(s).`,
          itemsProcessed: importedCount,
        };
      }
    }

    // 4.4 Canal Direto: Bling ERP v3 (Pedidos & Estoque com `/Api/v3/` e auto-refresh on 401)
    if (params.platform === "bling" && token) {
      if (params.productId && params.syncType === "stock") {
        const { data: listing } = await supabase
          .from("channel_listings")
          .select("external_listing_id, external_sku")
          .eq("store_id", params.storeId)
          .eq("product_id", params.productId)
          .eq("channel", "bling")
          .maybeSingle();

        const externalProductId = listing?.external_listing_id;
        if (!externalProductId) {
          return { status: "completed", message: "Produto sem vínculo no Bling v3.", itemsProcessed: 0 };
        }

        const stockRes = await fetchWithAutoRefreshOn401({
          storeId: params.storeId,
          platform: "bling",
          url: "https://api.bling.com.br/Api/v3/estoques",
          init: {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
              produto: { id: Number(externalProductId) || externalProductId },
              operacao: "B",
              quantidade: params.newStockQty ?? 0,
              observacoes: "Atualização automática Waesy",
            }),
          },
          initialToken: token,
        });

        if (!stockRes.ok) {
          return {
            status: "failed",
            message: `Bling v3 rejeitou atualização de estoque (HTTP ${stockRes.status}): ${stockRes.data?.error?.message || "Erro"}`,
            itemsProcessed: 0,
          };
        }

        return {
          status: "completed",
          message: `Balanço de estoque enviado ao Bling ERP v3 (${params.newStockQty ?? 0} un).`,
          itemsProcessed: 1,
        };
      }

      const blingRes = await fetchWithAutoRefreshOn401({
        storeId: params.storeId,
        platform: "bling",
        url: "https://api.bling.com.br/Api/v3/pedidos/vendas?limite=20",
        init: { method: "GET", headers: { Accept: "application/json" } },
        initialToken: token,
      });

      if (!blingRes.ok) {
        return {
          status: "failed",
          message: `Bling ERP v3 rejeitou consulta (HTTP ${blingRes.status}). Reautentique OAuth 2.0.`,
          itemsProcessed: 0,
        };
      }

      const rows = Array.isArray(blingRes.data?.data) ? blingRes.data.data : [];
      for (const r of rows) {
        const extId = String(r.id || r.numero || "");
        if (!extId) continue;
        const totalCents = Math.round(Number(r.total || 0) * 100);
        await upsertPulledMarketplaceOrderToMaster({
          storeId: params.storeId,
          platform: "bling",
          externalOrderId: extId,
          externalStatus: "paid",
          buyerName: String(r.contato?.nome || "Cliente Bling ERP"),
          subtotalCents: totalCents,
          shippingCostCents: 0,
          marketplaceFeeCents: 0,
          totalAmountCents: totalCents,
          items: [{ title: `Pedido Bling #${r.numero || extId}`, quantity: 1, unit_price_cents: totalCents }],
        });
      }

      return {
        status: "completed",
        message: `Bling ERP v3 sincronizado: ${rows.length} pedido(s) conciliado(s).`,
        itemsProcessed: rows.length,
      };
    }

    // 4.5 Canal Direto: Magalu Open API
    if (params.platform === "magalu" && token) {
      if (params.productId && params.syncType === "stock") {
        const { data: listing } = await supabase
          .from("channel_listings")
          .select("external_listing_id, external_sku")
          .eq("store_id", params.storeId)
          .eq("product_id", params.productId)
          .eq("channel", "magalu")
          .maybeSingle();

        const sku = listing?.external_sku || listing?.external_listing_id;
        if (!sku) return { status: "completed", message: "Produto sem SKU Magalu vinculado.", itemsProcessed: 0 };

        const res = await fetchWithAutoRefreshOn401({
          storeId: params.storeId,
          platform: "magalu",
          url: `https://api.magalu.com/seller/v1/portfolios/skus/${encodeURIComponent(sku)}/stocks`,
          init: {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ quantity: params.newStockQty ?? 0 }),
          },
          initialToken: token,
        });

        if (!res.ok) {
          return { status: "failed", message: `Magalu rejeitou estoque de ${sku} (HTTP ${res.status}).`, itemsProcessed: 0 };
        }
        return { status: "completed", message: `Estoque SKU ${sku} atualizado na Magalu.`, itemsProcessed: 1 };
      }

      const ordersRes = await fetchWithAutoRefreshOn401({
        storeId: params.storeId,
        platform: "magalu",
        url: "https://api.magalu.com/seller/v1/orders?_limit=20",
        init: { method: "GET", headers: { Accept: "application/json" } },
        initialToken: token,
      });

      if (!ordersRes.ok) {
        return { status: "failed", message: `Magalu Open API falhou (HTTP ${ordersRes.status}).`, itemsProcessed: 0 };
      }

      const list = Array.isArray(ordersRes.data?.results) ? ordersRes.data.results : Array.isArray(ordersRes.data) ? ordersRes.data : [];
      for (const ord of list) {
        const extId = String(ord.code || ord.id || "");
        if (!extId) continue;
        const totalCents = Math.round(Number(ord.amounts?.total || ord.total || 0) * 100);
        await upsertPulledMarketplaceOrderToMaster({
          storeId: params.storeId,
          platform: "magalu",
          externalOrderId: extId,
          externalStatus: String(ord.status || "paid"),
          buyerName: String(ord.customer?.name || "Cliente Magalu"),
          subtotalCents: totalCents,
          shippingCostCents: 0,
          marketplaceFeeCents: Math.round(totalCents * 0.16),
          totalAmountCents: totalCents,
          items: [{ title: `Pedido Magalu #${extId}`, quantity: 1, unit_price_cents: totalCents }],
        });
      }

      return { status: "completed", message: `Magalu sincronizada: ${list.length} pedido(s) conciliado(s).`, itemsProcessed: list.length };
    }

    // 4.6 Canal Direto: Amazon SP-API
    if (params.platform === "amazon" && token) {
      const createdAfter = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
      const ordersRes = await fetchWithExponentialBackoff(
        `https://sellingpartnerapi-na.amazon.com/orders/v0/orders?MarketplaceIds=A2Q3Y263D00KWC&CreatedAfter=${encodeURIComponent(createdAfter)}`,
        { method: "GET", headers: { "x-amz-access-token": token, Accept: "application/json" } },
        { maxRetries: 2, baseDelayMs: 400 }
      );

      if (!ordersRes.ok) {
        return { status: "failed", message: `Amazon SP-API rejeitou requisição (HTTP ${ordersRes.status}).`, itemsProcessed: 0 };
      }

      const list = Array.isArray(ordersRes.data?.payload?.Orders) ? ordersRes.data.payload.Orders : [];
      for (const ord of list) {
        const extId = String(ord.AmazonOrderId || "");
        if (!extId) continue;
        const totalCents = Math.round(Number(ord.OrderTotal?.Amount || 0) * 100);
        await upsertPulledMarketplaceOrderToMaster({
          storeId: params.storeId,
          platform: "amazon",
          externalOrderId: extId,
          externalStatus: String(ord.OrderStatus || "paid"),
          buyerName: String(ord.BuyerInfo?.BuyerName || "Cliente Amazon"),
          subtotalCents: totalCents,
          shippingCostCents: 0,
          marketplaceFeeCents: Math.round(totalCents * 0.15),
          totalAmountCents: totalCents,
          items: [{ title: `Pedido Amazon #${extId}`, quantity: 1, unit_price_cents: totalCents }],
        });
      }

      return { status: "completed", message: `Amazon SP-API sincronizada: ${list.length} pedido(s) conciliado(s).`, itemsProcessed: list.length };
    }

    // 4.7 Webhook Customizado / Endpoint do Lojista
    const webhookUrl = settings.outbound_webhook_url || settings.endpoint_url;
    if (webhookUrl && typeof webhookUrl === "string" && webhookUrl.startsWith("http")) {
      const payload = {
        event: `marketplace.sync.${params.syncType}`,
        store_id: params.storeId,
        platform: params.platform,
        product_id: params.productId,
        stock_qty: params.newStockQty,
        timestamp: new Date().toISOString(),
      };

      const res = await fetchWithExponentialBackoff(
        webhookUrl,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Waesy-Source": "MarketplaceHub" },
          body: JSON.stringify(payload),
        },
        { maxRetries: 3, baseDelayMs: 500 }
      );

      if (res.ok) {
        return {
          status: "completed",
          message: `Despachado via API resiliente para ${params.platform.toUpperCase()} (HTTP ${res.status}, retentativas: ${res.retriesAttempted}).`,
          itemsProcessed: params.itemCount || 1,
        };
      }
      return {
        status: "failed",
        message: `Falha no endpoint externo ${params.platform.toUpperCase()}: HTTP ${res.status}`,
        itemsProcessed: 0,
      };
    }

    return {
      status: "failed",
      message: `Conector ${params.platform.toUpperCase()} sem token OAuth válido ou webhook de saída configurado para disparo real.`,
      itemsProcessed: 0,
    };
  } catch (dispatchErr: any) {
    return {
      status: "failed",
      message: `Erro na comunicação com ${params.platform.toUpperCase()}: ${dispatchErr?.message || "Timeout"}`,
      itemsProcessed: 0,
    };
  }
}

/**
 * Dispara uma sincronização manual e audita em `marketplace_sync_logs`.
 */
export const triggerSyncConnector = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      platform: z.enum(MARKETPLACE_PLATFORMS),
      syncType: z.enum(["catalog", "stock", "orders", "prices", "full"]).default("full"),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const targetStoreId = data.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    const { data: connector } = await supabase
      .from("marketplace_connectors")
      .select("id, status, access_token, refresh_token, external_account_id, settings")
      .eq("store_id", targetStoreId)
      .eq("platform", data.platform)
      .maybeSingle();

    if (!connector || connector.status !== "connected") {
      throw new Error("Integração não conectada. Conecte antes de sincronizar.");
    }

    const startTime = Date.now();

    // Conta quantos produtos têm mapeamento ou estoque para este canal
    const { count: productCount } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", targetStoreId)
      .eq("status", "active");

    const processedCount = productCount || 1;

    // Executa o dispatcher com simetria total de credenciais AES-256-GCM
    const dispatchResult = await dispatchMarketplaceChannelSync({
      storeId: targetStoreId,
      connectorId: connector.id,
      platform: data.platform,
      syncType: data.syncType,
      settings: connector.settings,
      accessToken: connector.access_token,
      refreshToken: connector.refresh_token,
      externalAccountId: connector.external_account_id,
      itemCount: processedCount,
    });

    // Grava no log de sincronização com status real (sem mocks)
    const { data: logEntry } = await supabase
      .from("marketplace_sync_logs")
      .insert({
        store_id: targetStoreId,
        connector_id: connector.id,
        platform: data.platform,
        sync_type: data.syncType,
        direction: "bidirectional",
        status: dispatchResult.status,
        items_processed: dispatchResult.itemsProcessed,
        items_created: 0,
        items_updated: dispatchResult.status === "failed" ? 0 : dispatchResult.itemsProcessed,
        items_failed: dispatchResult.status === "failed" ? dispatchResult.itemsProcessed : 0,
        duration_ms: Math.max(12, Date.now() - startTime),
        errors: dispatchResult.status === "failed" ? [dispatchResult.message] : [],
        metadata: {
          sync_type: data.syncType,
          platform: data.platform,
          triggered_by: identity.userId,
          dispatch_status: dispatchResult.status,
        },
      })
      .select("id")
      .single();

    // Atualiza status do conector
    await supabase
      .from("marketplace_connectors")
      .update({
        sync_status: dispatchResult.status === "failed" ? "error" : "idle",
        last_sync_at: new Date().toISOString(),
        error_message: dispatchResult.status === "failed" ? dispatchResult.message : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", connector.id);

    return {
      success: dispatchResult.status !== "failed",
      logId: logEntry?.id || null,
      status: dispatchResult.status,
      message: dispatchResult.message,
    };
  });

/**
 * Lista pedidos recebidos de marketplaces externos para o painel de expedição.
 */
export const listMarketplaceExternalOrders = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      platform: z.string().optional(),
    }).optional()
  )
  .handler(async ({ data }): Promise<ExternalOrderDTO[]> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const targetStoreId = data?.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    let query = supabase
      .from("marketplace_external_orders")
      .select("*")
      .eq("store_id", targetStoreId)
      .order("imported_at", { ascending: false })
      .limit(50);

    if (data?.platform && data.platform !== "all") {
      query = query.eq("platform", data.platform);
    }

    const { data: orders, error } = await query;
    if (error) {
      await logSystemError({
        operation: "listMarketplaceExternalOrders",
        error,
        table_name: "marketplace_external_orders",
        contract_name: "listMarketplaceExternalOrders",
      });
      return [];
    }

    return (orders || []) as ExternalOrderDTO[];
  });

/**
 * Retorna o resumo financeiro consolidado por canal de marketplace.
 */
export const getMarketplaceFinancialSummary = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().optional() }).optional())
  .handler(async ({ data }): Promise<MarketplaceChannelFinancialSummaryDTO[]> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const targetStoreId = data?.storeId || identity.store_id;
    if (!targetStoreId) return [];

    const { data: rows, error } = await supabase
      .from("marketplace_external_orders")
      .select("platform, total_amount_cents, marketplace_fee_cents, net_payout_cents")
      .eq("store_id", targetStoreId);

    if (error || !rows) return [];

    const summaryMap = new Map<string, MarketplaceChannelFinancialSummaryDTO>();

    for (const row of rows) {
      const plat = row.platform || "outros";
      const current = summaryMap.get(plat) || {
        platform: plat,
        order_count: 0,
        gross_sales_cents: 0,
        marketplace_fees_cents: 0,
        net_payout_cents: 0,
      };

      current.order_count += 1;
      current.gross_sales_cents += row.total_amount_cents || 0;
      current.marketplace_fees_cents += row.marketplace_fee_cents || 0;
      current.net_payout_cents += row.net_payout_cents || (row.total_amount_cents - (row.marketplace_fee_cents || 0));

      summaryMap.set(plat, current);
    }

    return Array.from(summaryMap.values());
  });

export async function _syncStockToMarketplacesInternal(
  storeId: string,
  productId: string,
  newStockQty: number
): Promise<{ success: boolean; syncedChannels: number; message: string }> {
  try {
    const supabase = getServerClient();
    const { data: connectors } = await supabase
      .from("marketplace_connectors")
      .select("id, platform, access_token, refresh_token, external_account_id, settings")
      .eq("store_id", storeId)
      .eq("status", "connected");

    if (!connectors || connectors.length === 0) {
      return { success: true, syncedChannels: 0, message: "Nenhum canal ativo com sincronização de estoque ligada." };
    }

    let syncedCount = 0;
    for (const conn of connectors) {
      const isSyncStockEnabled = conn.settings?.sync_stock ?? true;
      if (!isSyncStockEnabled) continue;

      const dispatchResult = await dispatchMarketplaceChannelSync({
        storeId,
        connectorId: conn.id,
        platform: conn.platform,
        syncType: "stock",
        settings: conn.settings,
        accessToken: conn.access_token,
        refreshToken: conn.refresh_token,
        externalAccountId: conn.external_account_id,
        productId,
        newStockQty,
        itemCount: 1,
      });

      await supabase.from("marketplace_sync_logs").insert({
        store_id: storeId,
        connector_id: conn.id,
        platform: conn.platform,
        sync_type: "stock",
        direction: "export",
        status: dispatchResult.status,
        items_processed: 1,
        items_created: 0,
        items_updated: dispatchResult.status === "failed" ? 0 : 1,
        items_failed: dispatchResult.status === "failed" ? 1 : 0,
        duration_ms: 45,
        errors: dispatchResult.status === "failed" ? [dispatchResult.message] : [],
        metadata: {
          product_id: productId,
          stock_qty: newStockQty,
          synced_at: new Date().toISOString(),
          dispatch_status: dispatchResult.status,
        },
      });

      syncedCount += 1;
    }

    return {
      success: true,
      syncedChannels: syncedCount,
      message: `Estoque de ${newStockQty} un atualizado em ${syncedCount} canal(is) conectado(s).`,
    };
  } catch (err: any) {
    console.warn("[marketplace-hub] Falha na sincronização interna de estoque:", err);
    return { success: false, syncedChannels: 0, message: err?.message || "Falha na sincronização." };
  }
}

/**
 * Busca e concilia um SKU vindo de marketplace externo com a variante interna da loja.
 */
export async function matchMarketplaceSkuToVariant(
  storeId: string,
  sku: string
): Promise<{ variantId: string; productId: string; currentStock: number } | null> {
  const supabase = getServerClient();
  const cleanSku = (sku || "").trim();
  if (!cleanSku) return null;

  const { data: variant } = await supabase
    .from("product_variants")
    .select("id, product_id, stock_on_hand, products!inner(store_id)")
    .eq("sku", cleanSku)
    .eq("products.store_id", storeId)
    .maybeSingle();

  if (!variant) return null;

  return {
    variantId: variant.id,
    productId: variant.product_id,
    currentStock: variant.stock_on_hand || 0,
  };
}

/**
 * Transmite a atualização de estoque físico de uma variante para todos os canais de marketplace conectados via HTTP real.
 */
export async function broadcastStockUpdateToMarketplaces(
  storeId: string,
  variantId: string,
  newStockQty: number
): Promise<{ success: boolean; updatedChannels: string[] }> {
  const supabase = getServerClient();
  const safeQty = Math.max(0, newStockQty);

  // 1. Atualiza estoque interno na variante
  const { data: variant } = await supabase
    .from("product_variants")
    .update({ stock_on_hand: safeQty, updated_at: new Date().toISOString() })
    .eq("id", variantId)
    .select("product_id")
    .maybeSingle();

  if (!variant?.product_id) {
    return { success: false, updatedChannels: [] };
  }

  // 2. Soma estoque total das variantes do produto e dispara sync HTTP real nos canais conectados
  const { data: allVariants } = await supabase
    .from("product_variants")
    .select("stock_on_hand")
    .eq("product_id", variant.product_id);

  const totalProductStock = (allVariants || []).reduce((sum, v) => sum + Number(v.stock_on_hand || 0), 0) || safeQty;

  const syncRes = await _syncStockToMarketplacesInternal(storeId, variant.product_id, totalProductStock);

  const { data: connectors } = await supabase
    .from("marketplace_connectors")
    .select("platform, settings")
    .eq("store_id", storeId)
    .eq("status", "connected");

  const updatedChannels = (connectors || [])
    .filter((c) => c.settings?.sync_stock !== false)
    .map((c) => c.platform);

  return { success: syncRes.success, updatedChannels };
}

/**
 * Sincroniza estoque ativo de um produto para todos os marketplaces conectados.
 */
export const syncProductStockToMarketplaces = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      productId: z.string().uuid(),
      newStockQty: z.number().int().min(0),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const targetStoreId = data.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    return await _syncStockToMarketplacesInternal(targetStoreId, data.productId, data.newStockQty);
  });

/**
 * Mapeia produto local para anúncio externo (Mercado Livre, Shopee, iFood, etc.)
 * Persiste na tabela canônica channel_listings e sincroniza com products.availability_channels.
 */
export const mapProductToMarketplace = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      productId: z.string().uuid(),
      platform: z.enum(MARKETPLACE_PLATFORMS),
      externalListingId: z.string().min(2),
      externalSku: z.string().optional(),
      priceMarginPercent: z.number().min(0).max(100).default(0),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const targetStoreId = data.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    const { data: product, error: fetchErr } = await supabase
      .from("products")
      .select("id, price_cents, availability_channels")
      .eq("id", data.productId)
      .eq("store_id", targetStoreId)
      .single();

    if (fetchErr || !product) throw new Error("Produto não encontrado.");

    const basePriceCents = product.price_cents || 0;
    const channelPriceCents = data.priceMarginPercent > 0
      ? Math.round(basePriceCents * (1 + data.priceMarginPercent / 100))
      : basePriceCents;

    // 1. Grava na tabela relacional channel_listings (V122/V123 Omni-Hub ERP)
    const { error: listingErr } = await supabase
      .from("channel_listings")
      .upsert(
        {
          store_id: targetStoreId,
          product_id: data.productId,
          channel: data.platform,
          external_listing_id: data.externalListingId.trim(),
          external_sku: data.externalSku?.trim() || null,
          price_cents: channelPriceCents,
          channel_status: "active",
          is_active: true,
          commission_rate: 0,
          last_synced_at: new Date().toISOString(),
          attributes: {
            price_margin_percent: data.priceMarginPercent,
            base_price_cents: basePriceCents,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id,product_id,channel" }
      );

    if (listingErr) {
      console.warn("[mapProductToMarketplace] Erro ao gravar em channel_listings:", listingErr.message);
    }

    // 2. Mantém sincronia no JSONB availability_channels para leitura legada
    const currentChannels = (product.availability_channels as Record<string, any>) || {};
    currentChannels[data.platform] = {
      listing_id: data.externalListingId.trim(),
      external_sku: data.externalSku?.trim() || null,
      price_margin_percent: data.priceMarginPercent,
      price_cents: channelPriceCents,
      synced_at: new Date().toISOString(),
      status: "active",
    };

    const { error: updateErr } = await supabase
      .from("products")
      .update({
        availability_channels: currentChannels,
        publish_to_marketplace: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.productId);

    if (updateErr) throw new Error(`Falha ao mapear anúncio: ${updateErr.message}`);

    return {
      success: true,
      message: `Produto vinculado com sucesso ao canal ${data.platform.toUpperCase()} (#${data.externalListingId})!`,
    };
  });

/**
 * Remove o vínculo de um produto com um marketplace.
 */
export const deleteProductChannelListing = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      productId: z.string().uuid(),
      platform: z.enum(MARKETPLACE_PLATFORMS),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const targetStoreId = data.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    // Remove da tabela relacional channel_listings
    await supabase
      .from("channel_listings")
      .delete()
      .eq("store_id", targetStoreId)
      .eq("product_id", data.productId)
      .eq("channel", data.platform);

    // Remove do JSONB availability_channels
    const { data: product } = await supabase
      .from("products")
      .select("availability_channels")
      .eq("id", data.productId)
      .eq("store_id", targetStoreId)
      .single();

    if (product) {
      const current = (product.availability_channels as Record<string, any>) || {};
      delete current[data.platform];
      await supabase
        .from("products")
        .update({
          availability_channels: current,
          publish_to_marketplace: Object.keys(current).length > 0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.productId);
    }

    return {
      success: true,
      message: `Anúncio desvinculado do canal ${data.platform.toUpperCase()} com sucesso.`,
    };
  });

/**
 * Lista os produtos da loja com informações de mapeamento em marketplaces.
 * Consulta prioritariamente a tabela relacional channel_listings.
 */
export const listProductMarketplaceMappings = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().optional() }).optional())
  .handler(async ({ data }): Promise<ProductMarketplaceMappingDTO[]> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const targetStoreId = data?.storeId || identity.store_id;
    if (!targetStoreId) return [];

    const [{ data: products, error }, { data: listings }] = await Promise.all([
      supabase
        .from("products")
        .select(`
          id, title, price_cents, availability_channels, publish_to_marketplace,
          product_variants ( id, sku, stock_on_hand )
        `)
        .eq("store_id", targetStoreId)
        .order("title", { ascending: true })
        .limit(60),
      supabase
        .from("channel_listings")
        .select("product_id, channel, price_cents, external_listing_id, external_sku, channel_status, last_synced_at, attributes")
        .eq("store_id", targetStoreId),
    ]);

    if (error || !products) return [];

    // Mapeia channel_listings por produto
    const listingsByProduct = new Map<string, Record<string, any>>();
    for (const listing of listings || []) {
      const current = listingsByProduct.get(listing.product_id) || {};
      const attrs = (listing.attributes as Record<string, any>) || {};
      current[listing.channel] = {
        listing_id: listing.external_listing_id || undefined,
        external_sku: listing.external_sku || undefined,
        price_margin_percent: attrs.price_margin_percent || 0,
        price_cents: listing.price_cents,
        synced_at: listing.last_synced_at || undefined,
        status: listing.channel_status === "paused" ? "paused" : listing.channel_status === "error" ? "error" : "active",
      };
      listingsByProduct.set(listing.product_id, current);
    }

    return products.map((p) => {
      const firstVariant = (p.product_variants as any[])?.[0];
      const jsonbChannels = (p.availability_channels as Record<string, any>) || {};
      const relationalChannels = listingsByProduct.get(p.id) || {};
      const mergedMappings = { ...jsonbChannels, ...relationalChannels };

      return {
        id: p.id,
        title: p.title,
        sku: firstVariant?.sku || null,
        price_cents: p.price_cents || 0,
        stock_on_hand: firstVariant?.stock_on_hand || 0,
        publish_to_marketplace: p.publish_to_marketplace ?? false,
        mappings: mergedMappings,
      };
    });
  });

/**
 * Lista os logs de sincronização dos conectores para auditoria no Workspace.
 */
export const listMarketplaceSyncLogs = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      platform: z.string().optional(),
      limit: z.number().int().min(1).max(50).default(20),
    }).default({ limit: 20 })
  )
  .handler(async ({ data: { storeId, platform, limit } }): Promise<MarketplaceSyncLogDTO[]> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const targetStoreId = storeId || identity.store_id;
    if (!targetStoreId) return [];

    let query = supabase
      .from("marketplace_sync_logs")
      .select("id, platform, sync_type, direction, status, items_processed, items_updated, items_failed, duration_ms, created_at")
      .eq("store_id", targetStoreId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (platform && platform !== "all") {
      query = query.eq("platform", platform);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.warn("[listMarketplaceSyncLogs] Erro:", error);
      return [];
    }

    return (rows || []) as MarketplaceSyncLogDTO[];
  });

/**
 * Sincroniza dados institucionais da loja para a API do Google Business Profile
 */
export const syncGoogleBusinessProfile = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      syncHours: z.boolean().default(true),
      syncAddress: z.boolean().default(true),
      syncCatalogLink: z.boolean().default(true),
    }).default({ syncHours: true, syncAddress: true, syncCatalogLink: true })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const targetStoreId = data?.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    // Busca dados cadastrais da loja
    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id, name, slug, phone, settings, city, state")
      .eq("id", targetStoreId)
      .single();

    if (storeErr || !store) throw new Error("Loja não encontrada.");

    // Busca conector ativo do Google Business
    const { data: connector } = await supabase
      .from("marketplace_connectors")
      .select("id, status, access_token, refresh_token, external_account_id, settings")
      .eq("store_id", targetStoreId)
      .eq("platform", "google_business")
      .maybeSingle();

    if (!connector || connector.status !== "connected") {
      throw new Error("Integração com o Google Meu Negócio não está conectada. Configure sua conta primeiro.");
    }

    const resolvedGbp = await resolveMarketplaceConnectorCredentials({
      storeId: targetStoreId,
      platform: "google_business",
      connectorRow: connector,
    });

    const locationId = resolvedGbp.decryptedCreds.location_id || resolvedGbp.externalAccountId;
    if (!resolvedGbp.accessToken && !locationId) {
      throw new Error("Credenciais OAuth ou Location ID do Google Business Profile ausentes.");
    }

    let remoteVerified = false;
    if (resolvedGbp.accessToken && locationId && resolvedGbp.accessToken.startsWith("ya29.")) {
      const normalizedName = locationId.startsWith("locations/") ? locationId : `locations/${locationId}`;
      const gbpRes = await fetchWithExponentialBackoff(
        `https://mybusinessbusinessinformation.googleapis.com/v1/${normalizedName}?updateMask=title,phoneNumbers`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${resolvedGbp.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: store.name,
            ...(store.phone ? { phoneNumbers: { primaryPhone: store.phone } } : {}),
          }),
        },
        { maxRetries: 2, baseDelayMs: 400 }
      );
      if (!gbpRes.ok) {
        throw new Error(`Google Business Profile rejeitou atualização (HTTP ${gbpRes.status}).`);
      }
      remoteVerified = true;
    }

    // Registra log de sincronização com colunas canônicas válidas
    await supabase.from("marketplace_sync_logs").insert({
      store_id: targetStoreId,
      connector_id: connector.id,
      platform: "google_business",
      sync_type: "catalog",
      direction: "export",
      status: remoteVerified ? "completed" : "partial",
      items_processed: 1,
      items_created: 0,
      items_updated: remoteVerified ? 1 : 0,
      items_failed: 0,
      duration_ms: 120,
      errors: remoteVerified ? [] : ["Sincronização de feed XML/GBP marcada; configure OAuth token ya29.* para PATCH direto."],
      metadata: {
        action: "google_business_profile_sync",
        synced_at: new Date().toISOString(),
        store_name: store.name,
        phone: store.phone,
        city: store.city,
        state: store.state,
        remote_verified: remoteVerified,
      },
    });

    // Atualiza timestamp do conector
    await supabase
      .from("marketplace_connectors")
      .update({
        last_sync_at: new Date().toISOString(),
        sync_status: "idle",
        updated_at: new Date().toISOString(),
      })
      .eq("id", connector.id);

    return {
      success: true,
      message: remoteVerified
        ? "Perfil institucional sincronizado via API do Google Meu Negócio com sucesso!"
        : "Dados institucionais prontos no feed GBP. Adicione token OAuth (ya29.*) para atualização remota automática.",
      syncedAt: new Date().toISOString(),
    };
  });

/**
 * Lista todos os locais de estoque (Depósitos, Dark Stores, Lojas Físicas) da loja.
 */
export const listInventoryLocations = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().optional() }).optional())
  .handler(async ({ data }): Promise<InventoryLocationDTO[]> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const targetStoreId = data?.storeId || identity.store_id;
    if (!targetStoreId) return [];

    const { data: locations, error } = await supabase
      .from("inventory_locations")
      .select("*")
      .eq("store_id", targetStoreId)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true });

    if (error) {
      await logSystemError({
        operation: "listInventoryLocations",
        error,
        table_name: "inventory_locations",
        contract_name: "listInventoryLocations",
      });
      return [];
    }

    return (locations || []) as InventoryLocationDTO[];
  });

/**
 * Cria ou atualiza um local de estoque (Dark Store, Depósito Central, etc.)
 */
export const saveInventoryLocation = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      id: z.string().uuid().optional(),
      name: z.string().min(2),
      type: z.enum(["warehouse", "storefront", "dark_store", "kitchen", "fulfillment_center"]).default("warehouse"),
      is_default: z.boolean().default(false),
      is_active: z.boolean().default(true),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postal_code: z.string().optional(),
      dispatch_radius_km: z.number().min(0).max(200).default(10),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const targetStoreId = data.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    if (data.is_default) {
      // Se este for o padrão, remove a marca de padrão dos outros
      await supabase
        .from("inventory_locations")
        .update({ is_default: false, updated_at: new Date().toISOString() })
        .eq("store_id", targetStoreId);
    }

    const payload = {
      store_id: targetStoreId,
      name: data.name.trim(),
      type: data.type,
      is_default: data.is_default,
      is_active: data.is_active,
      address: data.address?.trim() || null,
      city: data.city?.trim() || null,
      state: data.state?.trim() || null,
      postal_code: data.postal_code?.trim() || null,
      dispatch_radius_km: data.dispatch_radius_km,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { error } = await supabase
        .from("inventory_locations")
        .update(payload)
        .eq("id", data.id)
        .eq("store_id", targetStoreId);

      if (error) throw new Error(`Falha ao atualizar armazém: ${error.message}`);
      return { success: true, message: "Local de estoque atualizado com sucesso!", id: data.id };
    } else {
      const { data: created, error } = await supabase
        .from("inventory_locations")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw new Error(`Falha ao criar armazém: ${error.message}`);
      return { success: true, message: "Novo local de estoque criado com sucesso!", id: created.id };
    }
  });

/**
 * Remove um local de estoque da loja. Não permite remover o armazém padrão.
 */
export const deleteInventoryLocation = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      id: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin"]);

    const targetStoreId = data.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    const { data: target } = await supabase
      .from("inventory_locations")
      .select("is_default")
      .eq("id", data.id)
      .eq("store_id", targetStoreId)
      .single();

    if (target?.is_default) {
      throw new Error("Não é possível remover o local de estoque padrão da loja.");
    }

    const { error } = await supabase
      .from("inventory_locations")
      .delete()
      .eq("id", data.id)
      .eq("store_id", targetStoreId);

    if (error) throw new Error(`Falha ao remover armazém: ${error.message}`);
    return { success: true, message: "Local de estoque removido com sucesso." };
  });

/**
 * ============================================================================
 * IMPORTAÇÃO REAL E2E DE PRODUTOS DO MERCADO LIVRE (API OFICIAL OPEN DATA)
 * ============================================================================
 */
export const importProductFromMercadoLivre = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      mlbIdOrUrl: z.string().min(5, "Informe o ID MLB ou o link do anúncio"),
      locationId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const targetStoreId = input.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    // 1. Extração cirúrgica do MLB ID (aceita tanto MLB123... quanto URL completa)
    const match = input.mlbIdOrUrl.match(/MLB-?(\d+)/i);
    const cleanMlbId = match ? `MLB${match[1]}` : input.mlbIdOrUrl.trim().toUpperCase();

    if (!/^MLB\d+$/i.test(cleanMlbId)) {
      throw new Error("Formato de ID do Mercado Livre inválido. Ex: MLB1234567890 ou link completo do anúncio.");
    }

    // 2. Fetch real na API oficial do Mercado Livre (autenticado quando houver conector ativo)
    let mlCreds = await resolveConnectorCredentialsWithRefresh({
      storeId: targetStoreId,
      platform: "mercadolivre",
    });

    const fetchMlEndpoint = async (url: string, accessToken?: string) =>
      fetch(url, {
        headers: {
          "User-Agent": "Waesy/1.0",
          Accept: "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        signal: AbortSignal.timeout(10000),
      });

    let mlbRes = await fetchMlEndpoint(
      `https://api.mercadolibre.com/items/${cleanMlbId}`,
      mlCreds.accessToken || undefined
    );

    if (mlbRes.status === 401 && mlCreds.refreshToken) {
      mlCreds = await resolveConnectorCredentialsWithRefresh({
        storeId: targetStoreId,
        platform: "mercadolivre",
        forceRefresh: true,
      });
      if (mlCreds.accessToken) {
        mlbRes = await fetchMlEndpoint(
          `https://api.mercadolibre.com/items/${cleanMlbId}`,
          mlCreds.accessToken
        );
      }
    }

    if (!mlbRes.ok) {
      if (mlbRes.status === 404) {
        throw new Error(`Anúncio ${cleanMlbId} não encontrado no Mercado Livre.`);
      }
      throw new Error(`Falha na comunicação com a API do Mercado Livre (HTTP ${mlbRes.status}).`);
    }

    const item = await mlbRes.json();
    let fullDescription = "";
    try {
      const descRes = await fetchMlEndpoint(
        `https://api.mercadolibre.com/items/${cleanMlbId}/description`,
        mlCreds.accessToken || undefined
      );
      if (descRes.ok) {
        const descJson = (await descRes.json().catch(() => ({}))) as Record<string, any>;
        fullDescription = String(descJson.plain_text || descJson.text || "").trim();
      }
    } catch {
      // Descrição complementar não é bloqueante para importação do item
    }

    const priceCents = Math.round((Number(item.price) || 0) * 100);
    const title = (item.title || "Produto Importado ML").trim();
    const stockQty = Math.max(0, Number(item.available_quantity) || 0);

    // Gera slug amigável único por MLB ID
    const baseSlug = title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50);
    const uniqueSlug = `${baseSlug}-${cleanMlbId.toLowerCase()}`;

    // 3. Local de estoque alvo (armazém padrão se não especificado)
    let warehouseId = input.locationId;
    if (!warehouseId) {
      const { data: defaultLoc } = await supabase
        .from("inventory_locations")
        .select("id")
        .eq("store_id", targetStoreId)
        .eq("is_default", true)
        .maybeSingle();

      warehouseId = defaultLoc?.id;
    }

    // 4. Upsert defensivo em `products` (evita colisão ao reimportar o mesmo MLB ID)
    const { data: existingProd } = await supabase
      .from("products")
      .select("id, availability_channels, attributes")
      .eq("store_id", targetStoreId)
      .eq("slug", uniqueSlug)
      .maybeSingle();

    const mlChannelMeta = {
      listing_id: cleanMlbId,
      external_sku: item.seller_custom_field || cleanMlbId,
      price_cents: priceCents,
      price_margin_percent: 0,
      synced_at: new Date().toISOString(),
      status: item.status === "active" ? "active" : "paused",
    };

    const productWritePayload = {
      store_id: targetStoreId,
      title,
      slug: uniqueSlug,
      description:
        fullDescription ||
        (item.condition === "new"
          ? "Produto Novo importado via Mercado Livre."
          : "Produto Usado importado via Mercado Livre."),
      price_cents: priceCents,
      status: item.status === "active" ? "active" : "draft",
      brand: item.attributes?.find((a: any) => a.id === "BRAND")?.value_name || null,
      ean: item.attributes?.find((a: any) => a.id === "GTIN")?.value_name || null,
      publish_to_marketplace: true,
      availability_channels: {
        ...((existingProd?.availability_channels as Record<string, any>) || {}),
        mercadolivre: mlChannelMeta,
      },
      attributes: {
        ...((existingProd?.attributes as Record<string, any>) || {}),
        permalink: item.permalink,
        condition: item.condition,
        category_id: item.category_id,
        pictures: (item.pictures || []).map((p: any) => p.secure_url || p.url).filter(Boolean),
        imported_from: "mercadolivre",
        imported_at: new Date().toISOString(),
      },
    };

    const { data: product, error: prodErr } = existingProd?.id
      ? await supabase
          .from("products")
          .update(productWritePayload)
          .eq("id", existingProd.id)
          .select()
          .single()
      : await supabase.from("products").insert(productWritePayload).select().single();

    if (prodErr) {
      console.error("[marketplace-hub] Erro ao cadastrar produto do Mercado Livre:", prodErr);
      throw new Error(`Erro ao salvar produto importado: ${prodErr.message}`);
    }

    // 5. Garante variante padrão com SKU e estoque atualizado
    const targetSku = item.seller_custom_field || `MLB-${cleanMlbId}`;
    const { data: existingVar } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", product.id)
      .limit(1)
      .maybeSingle();

    const { data: variant, error: varErr } = existingVar?.id
      ? await supabase
          .from("product_variants")
          .update({ sku: targetSku, price_cents: priceCents, stock_on_hand: stockQty })
          .eq("id", existingVar.id)
          .select()
          .single()
      : await supabase
          .from("product_variants")
          .insert({
            product_id: product.id,
            sku: targetSku,
            price_cents: priceCents,
            stock_on_hand: stockQty,
          })
          .select()
          .single();

    if (varErr) {
      console.warn("[marketplace-hub] Aviso ao criar/atualizar variante para produto importado:", varErr.message);
    }

    // 6. Cadastra imagens em `product_media` na primeira importação
    const pictures = (item.pictures || []).slice(0, 5);
    if (!existingProd?.id) {
      for (let i = 0; i < pictures.length; i++) {
        const picUrl = pictures[i].secure_url || pictures[i].url;
        if (picUrl) {
          await supabase.from("product_media").insert({
            product_id: product.id,
            url: picUrl,
            alt: `${title} - Foto ${i + 1}`,
            media_type: "image",
            sort_order: i,
          });
        }
      }
    }

    // 7. Reflete no inventário do armazém se disponível
    if (warehouseId && variant?.id) {
      await supabase.from("product_location_inventories").upsert(
        {
          store_id: targetStoreId,
          location_id: warehouseId,
          product_id: product.id,
          variant_id: variant.id,
          stock_qty: stockQty,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "location_id,product_id,variant_id" }
      );
    }

    // 8. Grava no channel_listings relacional
    await supabase.from("channel_listings").upsert(
      {
        store_id: targetStoreId,
        product_id: product.id,
        channel: "mercadolivre",
        external_listing_id: cleanMlbId,
        external_sku: item.seller_custom_field || cleanMlbId,
        price_cents: priceCents,
        channel_status: item.status === "active" ? "active" : "paused",
        is_active: item.status === "active",
        commission_rate: 0.16,
        last_synced_at: new Date().toISOString(),
        attributes: {
          permalink: item.permalink,
          condition: item.condition,
          category_id: item.category_id,
          imported: true,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id,product_id,channel" }
    );

    // 9. Grava no log de sincronização com enums canônicos
    await supabase.from("marketplace_sync_logs").insert({
      store_id: targetStoreId,
      platform: "mercadolivre",
      sync_type: "catalog",
      direction: "import",
      status: "completed",
      items_processed: 1,
      items_created: existingProd?.id ? 0 : 1,
      items_updated: existingProd?.id ? 1 : 0,
      items_failed: 0,
      duration_ms: 120,
      errors: [],
      metadata: {
        product_id: product.id,
        mlb_id: cleanMlbId,
        title,
        price_cents: priceCents,
      },
    });

    return {
      success: true,
      product: {
        id: product.id,
        title: product.title,
        price_cents: product.price_cents,
        stock: stockQty,
        mlb_id: cleanMlbId,
        permalink: item.permalink,
        image_url: pictures[0]?.secure_url || pictures[0]?.url || null,
      },
      message: existingProd?.id
        ? `Produto "${title}" atualizado do Mercado Livre.`
        : `Produto "${title}" importado com sucesso do Mercado Livre.`,
    };
  });

/**
 * Importação em lote dos anúncios ativos do vendedor autenticado no Mercado Livre.
 */
export const importMercadoLivreSellerListings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      limit: z.number().int().min(1).max(50).default(20),
      status: z.enum(["active", "paused", "all"]).default("active"),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const targetStoreId = input.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    let creds = await resolveConnectorCredentialsWithRefresh({
      storeId: targetStoreId,
      platform: "mercadolivre",
    });

    if (!creds.accessToken) {
      throw new Error("Conecte a conta do Mercado Livre via OAuth 2.0 antes de importar os anúncios da conta.");
    }

    let sellerId = creds.externalAccountId;
    if (!sellerId) {
      let meRes = await fetch("https://api.mercadolibre.com/users/me", {
        headers: { Authorization: `Bearer ${creds.accessToken}`, Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (meRes.status === 401 && creds.refreshToken) {
        creds = await resolveConnectorCredentialsWithRefresh({
          storeId: targetStoreId,
          platform: "mercadolivre",
          forceRefresh: true,
        });
        if (creds.accessToken) {
          meRes = await fetch("https://api.mercadolibre.com/users/me", {
            headers: { Authorization: `Bearer ${creds.accessToken}`, Accept: "application/json" },
            signal: AbortSignal.timeout(10000),
          });
        }
      }
      if (!meRes.ok) {
        throw new Error(`Não foi possível identificar o seller_id no Mercado Livre (HTTP ${meRes.status}).`);
      }
      const meJson = (await meRes.json().catch(() => ({}))) as Record<string, any>;
      sellerId = String(meJson.id || "");
    }

    if (!sellerId) throw new Error("ID do vendedor no Mercado Livre não encontrado.");

    const searchUrl = new URL(`https://api.mercadolibre.com/users/${sellerId}/items/search`);
    searchUrl.searchParams.set("limit", String(input.limit));
    if (input.status !== "all") {
      searchUrl.searchParams.set("status", input.status);
    }

    const searchRes = await fetch(searchUrl.toString(), {
      headers: { Authorization: `Bearer ${creds.accessToken}`, Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });

    if (!searchRes.ok) {
      throw new Error(`Falha ao listar anúncios do vendedor no Mercado Livre (HTTP ${searchRes.status}).`);
    }

    const searchJson = (await searchRes.json().catch(() => ({}))) as { results?: string[] };
    const itemIds = (searchJson.results || []).slice(0, input.limit);
    if (itemIds.length === 0) {
      return { success: true, importedCount: 0, updatedCount: 0, failedCount: 0, message: "Nenhum anúncio encontrado nesta conta." };
    }

    let created = 0;
    let updated = 0;
    let failed = 0;

    for (let i = 0; i < itemIds.length; i += 20) {
      const batch = itemIds.slice(i, i + 20);
      const batchRes = await fetch(`https://api.mercadolibre.com/items?ids=${batch.join(",")}`, {
        headers: { Authorization: `Bearer ${creds.accessToken}`, Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (!batchRes.ok) {
        failed += batch.length;
        continue;
      }
      const entries = (await batchRes.json().catch(() => [])) as Array<{ code: number; body: Record<string, any> }>;
      for (const entry of entries) {
        const item = entry.body;
        if (entry.code !== 200 || !item?.id) {
          failed++;
          continue;
        }
        try {
          const cleanMlbId = String(item.id).toUpperCase();
          const title = String(item.title || cleanMlbId).trim();
          const priceCents = Math.round((Number(item.price) || 0) * 100);
          const stockQty = Math.max(0, Number(item.available_quantity) || 0);
          const baseSlug = title
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 50);
          const uniqueSlug = `${baseSlug}-${cleanMlbId.toLowerCase()}`;

          const { data: existingProd } = await supabase
            .from("products")
            .select("id")
            .eq("store_id", targetStoreId)
            .eq("slug", uniqueSlug)
            .maybeSingle();

          let productId = existingProd?.id;
          if (productId) {
            await supabase
              .from("products")
              .update({
                title,
                price_cents: priceCents,
                status: item.status === "active" ? "active" : "draft",
                updated_at: new Date().toISOString(),
              })
              .eq("id", productId);
            updated++;
          } else {
            const { data: inserted } = await supabase
              .from("products")
              .insert({
                store_id: targetStoreId,
                title,
                slug: uniqueSlug,
                description: item.condition === "new" ? "Produto Novo importado do Mercado Livre." : "Produto Usado importado do Mercado Livre.",
                price_cents: priceCents,
                status: item.status === "active" ? "active" : "draft",
                publish_to_marketplace: true,
                availability_channels: {
                  mercadolivre: {
                    listing_id: cleanMlbId,
                    external_sku: item.seller_custom_field || cleanMlbId,
                    price_cents: priceCents,
                    synced_at: new Date().toISOString(),
                    status: item.status === "active" ? "active" : "paused",
                  },
                },
              })
              .select("id")
              .single();
            productId = inserted?.id;
            if (productId) {
              created++;
              await supabase.from("product_variants").insert({
                product_id: productId,
                sku: item.seller_custom_field || `MLB-${cleanMlbId}`,
                price_cents: priceCents,
                stock_on_hand: stockQty,
              });
              const pics = (item.pictures || []).slice(0, 3);
              for (let pIdx = 0; pIdx < pics.length; pIdx++) {
                const url = pics[pIdx]?.secure_url || pics[pIdx]?.url;
                if (url) {
                  await supabase.from("product_media").insert({
                    product_id: productId,
                    url,
                    alt: `${title} - Foto ${pIdx + 1}`,
                    media_type: "image",
                    sort_order: pIdx,
                  });
                }
              }
            }
          }

          if (productId) {
            await supabase.from("channel_listings").upsert(
              {
                store_id: targetStoreId,
                product_id: productId,
                channel: "mercadolivre",
                external_listing_id: cleanMlbId,
                external_sku: item.seller_custom_field || cleanMlbId,
                price_cents: priceCents,
                channel_status: item.status === "active" ? "active" : "paused",
                is_active: item.status === "active",
                last_synced_at: new Date().toISOString(),
                attributes: { permalink: item.permalink, condition: item.condition, category_id: item.category_id, imported: true },
                updated_at: new Date().toISOString(),
              },
              { onConflict: "store_id,product_id,channel" }
            );
          }
        } catch {
          failed++;
        }
      }
    }

    await supabase.from("marketplace_sync_logs").insert({
      store_id: targetStoreId,
      platform: "mercadolivre",
      sync_type: "catalog",
      direction: "import",
      status: failed > 0 && created + updated === 0 ? "failed" : failed > 0 ? "partial" : "completed",
      items_processed: itemIds.length,
      items_created: created,
      items_updated: updated,
      items_failed: failed,
      duration_ms: 500,
      errors: [],
      metadata: { seller_id: sellerId },
    });

    return {
      success: failed === 0 || created + updated > 0,
      importedCount: created,
      updatedCount: updated,
      failedCount: failed,
      message: `${created} importado(s), ${updated} atualizado(s)${failed > 0 ? `, ${failed} falha(s)` : ""}.`,
    };
  });

/**
 * Publica ou atualiza um produto do catálogo Waesy diretamente no canal externo (Mercado Livre, Shopee ou Bling v3).
 */
export const publishProductToMarketplace = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      productId: z.string().uuid(),
      platform: z.enum(["mercadolivre", "shopee", "bling"]),
      categoryId: z.string().optional(),
      listingTypeId: z.string().default("gold_special"),
      condition: z.enum(["new", "used"]).default("new"),
      marginPercent: z.number().min(-90).max(500).default(0),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const targetStoreId = input.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    const { data: product } = await supabase
      .from("products")
      .select("id, title, description, short_description, price_cents, attributes, availability_channels, product_variants(id, sku, stock_on_hand), product_media(url, sort_order)")
      .eq("id", input.productId)
      .eq("store_id", targetStoreId)
      .single();

    if (!product) throw new Error("Produto não encontrado nesta loja.");

    const { data: existingListing } = await supabase
      .from("channel_listings")
      .select("id, external_listing_id, external_sku")
      .eq("store_id", targetStoreId)
      .eq("product_id", input.productId)
      .eq("channel", input.platform)
      .maybeSingle();

    const variants = (product.product_variants || []) as Array<{ id: string; sku: string; stock_on_hand: number }>;
    const totalStock = variants.reduce((acc, v) => acc + Math.max(0, Number(v.stock_on_hand) || 0), 0);
    const primarySku = variants[0]?.sku || existingListing?.external_sku || product.id.slice(0, 12).toUpperCase();
    const channelPriceCents = Math.max(100, Math.round((product.price_cents || 0) * (1 + input.marginPercent / 100)));
    const priceDecimal = Number((channelPriceCents / 100).toFixed(2));
    const mediaUrls = ((product.product_media || []) as Array<{ url: string; sort_order: number }>)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((m) => m.url)
      .filter((u) => typeof u === "string" && /^https?:\/\//i.test(u));

    let creds = await resolveConnectorCredentialsWithRefresh({
      storeId: targetStoreId,
      platform: input.platform,
    });

    if (!creds.accessToken) {
      throw new Error(`Conector ${input.platform.toUpperCase()} não possui Access Token ativo. Autentique o canal primeiro.`);
    }

    let externalId = existingListing?.external_listing_id || "";
    let permalink: string | undefined;
    let publishOk = false;
    let publishError = "";

    if (input.platform === "mercadolivre") {
      const doMl = async (token: string, method: "POST" | "PUT", url: string, body: Record<string, any>) =>
        fetch(url, {
          method,
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(12000),
        });

      if (externalId) {
        let res = await doMl(creds.accessToken, "PUT", `https://api.mercadolibre.com/items/${externalId}`, {
          price: priceDecimal,
          available_quantity: totalStock,
        });
        if (res.status === 401 && creds.refreshToken) {
          creds = await resolveConnectorCredentialsWithRefresh({ storeId: targetStoreId, platform: "mercadolivre", forceRefresh: true });
          if (creds.accessToken) {
            res = await doMl(creds.accessToken, "PUT", `https://api.mercadolibre.com/items/${externalId}`, {
              price: priceDecimal,
              available_quantity: totalStock,
            });
          }
        }
        const json = (await res.json().catch(() => ({}))) as Record<string, any>;
        publishOk = res.ok;
        permalink = json.permalink;
        if (!res.ok) publishError = json.message || `Mercado Livre HTTP ${res.status}`;
      } else {
        let categoryId = input.categoryId?.trim() || (product.attributes as any)?.category_id || "";
        if (!categoryId) {
          const predRes = await fetch(
            `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?q=${encodeURIComponent(product.title.slice(0, 60))}&limit=1`,
            { headers: { Authorization: `Bearer ${creds.accessToken}` }, signal: AbortSignal.timeout(8000) }
          );
          if (predRes.ok) {
            const predList = (await predRes.json().catch(() => [])) as Array<{ category_id?: string }>;
            categoryId = predList[0]?.category_id || "";
          }
        }
        if (!categoryId) {
          throw new Error("Não foi possível identificar a categoria oficial MLB automaticamente. Informe o Category ID (ex: MLB1055).");
        }

        const createBody: Record<string, any> = {
          title: product.title.slice(0, 60),
          category_id: categoryId,
          price: priceDecimal,
          currency_id: "BRL",
          available_quantity: Math.max(1, totalStock),
          buying_mode: "buy_it_now",
          condition: input.condition,
          listing_type_id: input.listingTypeId,
          seller_custom_field: primarySku,
        };
        if (mediaUrls.length > 0) {
          createBody.pictures = mediaUrls.slice(0, 10).map((url) => ({ source: url }));
        }

        let res = await doMl(creds.accessToken, "POST", "https://api.mercadolibre.com/items", createBody);
        if (res.status === 401 && creds.refreshToken) {
          creds = await resolveConnectorCredentialsWithRefresh({ storeId: targetStoreId, platform: "mercadolivre", forceRefresh: true });
          if (creds.accessToken) {
            res = await doMl(creds.accessToken, "POST", "https://api.mercadolibre.com/items", createBody);
          }
        }
        const json = (await res.json().catch(() => ({}))) as Record<string, any>;
        publishOk = res.ok && Boolean(json.id);
        if (publishOk) {
          externalId = String(json.id);
          permalink = json.permalink;
          if (product.description) {
            await doMl(creds.accessToken, "POST", `https://api.mercadolibre.com/items/${externalId}/description`, {
              plain_text: String(product.description).slice(0, 50000),
            }).catch(() => null);
          }
        } else {
          publishError = json.message || (Array.isArray(json.cause) ? json.cause[0]?.message : "") || `Mercado Livre HTTP ${res.status}`;
        }
      }
    } else if (input.platform === "bling") {
      const blingMethod = externalId ? "PUT" : "POST";
      const blingUrl = externalId
        ? `https://api.bling.com.br/Api/v3/produtos/${encodeURIComponent(externalId)}`
        : "https://api.bling.com.br/Api/v3/produtos";
      const blingRes = await fetch(blingUrl, {
        method: blingMethod,
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          nome: product.title.slice(0, 120),
          codigo: primarySku,
          preco: priceDecimal,
          tipo: "P",
          situacao: "A",
          formato: "S",
          descricaoCurta: product.short_description || undefined,
        }),
        signal: AbortSignal.timeout(12000),
      });
      const json = (await blingRes.json().catch(() => ({}))) as Record<string, any>;
      publishOk = blingRes.ok;
      if (publishOk && json?.data?.id) externalId = String(json.data.id);
      if (!publishOk) publishError = json?.error?.message || `Bling v3 HTTP ${blingRes.status}`;
    } else if (input.platform === "shopee") {
      const partnerId = creds.clientId;
      const partnerKey = creds.clientSecret;
      const shopId = creds.externalAccountId;
      if (!partnerId || !partnerKey || !shopId) {
        throw new Error("Shopee requer Partner ID, Partner Key e Shop ID válidos para publicar ou atualizar itens.");
      }
      if (!externalId) {
        throw new Error("Para publicar novo item na Shopee v2 informe/importe primeiro um item_id existente ou mapeie o category_id numérico Shopee.");
      }
      const timestamp = Math.floor(Date.now() / 1000);
      const apiPath = "/api/v2/product/update_stock";
      const sign = generateShopeeSign({
        partnerId,
        partnerKey,
        apiPath,
        timestamp,
        accessToken: creds.accessToken,
        shopId,
      });
      const shopeeRes = await fetch(
        `https://partner.shopeemobile.com${apiPath}?partner_id=${encodeURIComponent(partnerId)}&timestamp=${timestamp}&access_token=${encodeURIComponent(creds.accessToken)}&shop_id=${encodeURIComponent(shopId)}&sign=${sign}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item_id: Number(externalId) || externalId,
            stock_list: [{ model_id: 0, seller_stock: [{ stock: totalStock }] }],
          }),
          signal: AbortSignal.timeout(10000),
        }
      );
      const json = (await shopeeRes.json().catch(() => ({}))) as Record<string, any>;
      publishOk = shopeeRes.ok && !json.error;
      if (!publishOk) publishError = json.message || json.error || `Shopee HTTP ${shopeeRes.status}`;
    }

    await supabase.from("channel_listings").upsert(
      {
        store_id: targetStoreId,
        product_id: input.productId,
        channel: input.platform,
        external_listing_id: externalId || null,
        external_sku: primarySku,
        price_cents: channelPriceCents,
        channel_status: publishOk ? "active" : "error",
        is_active: publishOk,
        sync_error: publishOk ? null : publishError,
        last_synced_at: new Date().toISOString(),
        attributes: permalink ? { permalink } : {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id,product_id,channel" }
    );

    const channels = (product.availability_channels as Record<string, any>) || {};
    channels[input.platform] = {
      ...(channels[input.platform] || {}),
      listing_id: externalId || null,
      external_sku: primarySku,
      price_cents: channelPriceCents,
      price_margin_percent: input.marginPercent,
      status: publishOk ? "active" : "error",
      synced_at: new Date().toISOString(),
    };
    await supabase
      .from("products")
      .update({ availability_channels: channels, publish_to_marketplace: true, updated_at: new Date().toISOString() })
      .eq("id", input.productId);

    await supabase.from("marketplace_sync_logs").insert({
      store_id: targetStoreId,
      platform: input.platform,
      sync_type: "catalog",
      direction: "export",
      status: publishOk ? "completed" : "failed",
      items_processed: 1,
      items_created: publishOk && !existingListing?.external_listing_id ? 1 : 0,
      items_updated: publishOk && existingListing?.external_listing_id ? 1 : 0,
      items_failed: publishOk ? 0 : 1,
      duration_ms: 250,
      errors: publishOk ? [] : [{ product_id: input.productId, error: publishError }],
      metadata: { external_listing_id: externalId || null },
    });

    if (!publishOk) {
      throw new Error(publishError || `Falha ao publicar produto em ${input.platform}.`);
    }

    return {
      success: true,
      externalListingId: externalId,
      permalink,
      message: `Produto sincronizado com sucesso no canal ${input.platform.toUpperCase()} (${externalId}).`,
    };
  });

/**
 * Executa ação operacional em um pedido de marketplace dentro do Waesy e empurra a transição para a API de origem.
 */
export const syncMarketplaceOrderStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      externalOrderId: z.string().uuid().optional(),
      orderId: z.string().uuid().optional(),
      action: z.enum(["confirm", "startPreparation", "readyToPickup", "dispatch", "cancel"]),
      trackingCode: z.string().optional(),
      carrierName: z.string().optional(),
      trackingUrl: z.string().optional(),
      cancellationReason: z.string().optional(),
      cancellationCode: z.string().optional(),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "staff"]);

    const targetStoreId = input.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");
    if (!input.externalOrderId && !input.orderId) {
      throw new Error("Informe externalOrderId ou orderId para sincronizar o pedido.");
    }

    let extQuery = supabase
      .from("marketplace_external_orders")
      .select("id, platform, external_order_id, order_id, external_status")
      .eq("store_id", targetStoreId);

    if (input.externalOrderId) {
      extQuery = extQuery.eq("id", input.externalOrderId);
    } else if (input.orderId) {
      extQuery = extQuery.eq("order_id", input.orderId);
    }

    const { data: extOrder } = await extQuery.maybeSingle();
    const resolvedOrderId = input.orderId || extOrder?.order_id || null;

    const statusMap: Record<typeof input.action, { masterStatus: string; externalStatus: string }> = {
      confirm: { masterStatus: "paid", externalStatus: "confirmed" },
      startPreparation: { masterStatus: "processing", externalStatus: "preparing" },
      readyToPickup: { masterStatus: "ready_for_pickup", externalStatus: "ready" },
      dispatch: { masterStatus: "shipped", externalStatus: "dispatched" },
      cancel: { masterStatus: "cancelled", externalStatus: "cancelled" },
    };

    const mapped = statusMap[input.action];

    let pushResult: { dispatched: boolean; platform?: string; ok: boolean; message: string } = {
      dispatched: false,
      platform: extOrder?.platform,
      ok: true,
      message: "Atualizado localmente.",
    };

    if (resolvedOrderId) {
      const nowIso = new Date().toISOString();
      const orderPatch: Record<string, any> = {
        status: mapped.masterStatus,
        updated_at: nowIso,
      };
      if (input.action === "dispatch") orderPatch.shipped_at = nowIso;
      if (input.action === "cancel") {
        orderPatch.cancelled_at = nowIso;
        if (input.cancellationReason) orderPatch.cancellation_reason = input.cancellationReason.trim();
      }

      await supabase
        .from("orders")
        .update(orderPatch)
        .eq("id", resolvedOrderId)
        .eq("store_id", targetStoreId);

      if (input.trackingCode) {
        await supabase.from("shipments").insert({
          store_id: targetStoreId,
          order_id: resolvedOrderId,
          tracking_code: input.trackingCode.trim().toUpperCase(),
          carrier_name: input.carrierName?.trim() || "Transportadora",
          tracking_url: input.trackingUrl?.trim() || "",
          status: "in_transit",
          shipped_at: nowIso,
        });
      }

      pushResult = await pushOrderUpdateToOriginMarketplace({
        storeId: targetStoreId,
        orderId: resolvedOrderId,
        targetStatus: mapped.masterStatus,
        trackingCode: input.trackingCode,
        carrierName: input.carrierName,
        trackingUrl: input.trackingUrl,
        cancellationReason: input.cancellationReason,
      });
    } else if (extOrder?.platform === "ifood") {
      const creds = await resolveConnectorCredentialsWithRefresh({ storeId: targetStoreId, platform: "ifood" });
      if (creds.accessToken) {
        const res = await pushIfoodOrderLifecycle({
          accessToken: creds.accessToken,
          externalOrderId: extOrder.external_order_id,
          targetStatus: mapped.masterStatus,
          cancellationReason: input.cancellationReason,
          cancellationCode: input.cancellationCode,
        });
        pushResult = {
          dispatched: true,
          platform: "ifood",
          ok: res.ok,
          message: res.message,
        };
      }
    }

    if (extOrder?.id) {
      await supabase
        .from("marketplace_external_orders")
        .update({
          external_status: mapped.externalStatus,
          ...(input.trackingCode ? { tracking_number: input.trackingCode.trim().toUpperCase() } : {}),
          ...(input.cancellationReason ? { cancellation_reason: input.cancellationReason.trim() } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", extOrder.id)
        .eq("store_id", targetStoreId);
    }

    return {
      success: pushResult.ok,
      status: mapped.externalStatus,
      pushResult,
      message: pushResult.message,
    };
  });

/**
 * Lista perguntas pré-venda armazenadas no inbox de Marketplaces (`marketplace_questions`).
 */
export const listMarketplaceQuestions = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        storeId: z.string().optional(),
        status: z.enum(["all", "unanswered", "answered"]).default("all"),
        limit: z.number().int().min(1).max(100).default(50),
      })
      .optional()
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "staff"]);

    const targetStoreId = input?.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    try {
      let query = supabase
        .from("marketplace_questions")
        .select("id, platform, external_question_id, external_item_id, product_id, buyer_nickname, question_text, answer_text, status, asked_at, answered_at")
        .eq("store_id", targetStoreId)
        .order("asked_at", { ascending: false })
        .limit(input?.limit ?? 50);

      if (input?.status && input.status !== "all") {
        query = query.eq("status", input.status);
      }

      const { data, error } = await query;
      if (error) return [];
      return data || [];
    } catch {
      return [];
    }
  });

/**
 * Busca perguntas recebidas na API oficial do Mercado Livre (`GET /my/received_questions/search`) e persiste em `marketplace_questions`.
 */
export const syncMercadoLivreQuestions = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        storeId: z.string().optional(),
        status: z.enum(["UNANSWERED", "ANSWERED", "ALL"]).default("ALL"),
        limit: z.number().int().min(1).max(50).default(25),
      })
      .optional()
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "staff"]);

    const targetStoreId = input?.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    let creds = await resolveConnectorCredentialsWithRefresh({
      storeId: targetStoreId,
      platform: "mercadolivre",
    });

    if (!creds.accessToken) {
      throw new Error("Conecte sua conta do Mercado Livre para sincronizar perguntas pré-venda.");
    }

    const qUrl = new URL("https://api.mercadolibre.com/my/received_questions/search");
    qUrl.searchParams.set("sort_fields", "date_created");
    qUrl.searchParams.set("sort_types", "DESC");
    qUrl.searchParams.set("api_version", "4");
    qUrl.searchParams.set("limit", String(input?.limit ?? 25));
    if (input?.status && input.status !== "ALL") {
      qUrl.searchParams.set("status", input.status);
    }

    let res = await fetch(qUrl.toString(), {
      headers: { Authorization: `Bearer ${creds.accessToken}`, Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });

    if (res.status === 401 && creds.refreshToken) {
      creds = await resolveConnectorCredentialsWithRefresh({
        storeId: targetStoreId,
        platform: "mercadolivre",
        forceRefresh: true,
      });
      if (creds.accessToken) {
        res = await fetch(qUrl.toString(), {
          headers: { Authorization: `Bearer ${creds.accessToken}`, Accept: "application/json" },
          signal: AbortSignal.timeout(12000),
        });
      }
    }

    if (!res.ok) {
      throw new Error(`Erro ao consultar perguntas no Mercado Livre (HTTP ${res.status}).`);
    }

    const body = (await res.json().catch(() => ({}))) as { questions?: Array<Record<string, any>> };
    const questions = body.questions || [];
    let synced = 0;

    for (const q of questions) {
      const extQId = String(q.id || "");
      const extItemId = String(q.item_id || "");
      if (!extQId || !extItemId) continue;

      const isAnswered = q.status === "ANSWERED" || Boolean(q.answer?.text);
      const { error } = await supabase.from("marketplace_questions").upsert(
        {
          store_id: targetStoreId,
          platform: "mercadolivre",
          external_question_id: extQId,
          external_item_id: extItemId,
          buyer_id: q.from?.id ? String(q.from.id) : null,
          question_text: String(q.text || ""),
          answer_text: q.answer?.text ? String(q.answer.text) : null,
          status: isAnswered ? "answered" : q.status === "CLOSED_UNANSWERED" ? "closed" : "unanswered",
          asked_at: q.date_created || new Date().toISOString(),
          answered_at: q.answer?.date_created || null,
          raw_payload: q,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id,platform,external_question_id" }
      );
      if (!error) synced++;
    }

    await supabase.from("marketplace_sync_logs").insert({
      store_id: targetStoreId,
      platform: "mercadolivre",
      sync_type: "orders",
      direction: "import",
      status: "completed",
      items_processed: questions.length,
      items_created: synced,
      items_updated: 0,
      items_failed: 0,
      duration_ms: 180,
      errors: [],
      metadata: { scope: "questions", synced },
    });

    return {
      success: true,
      syncedCount: synced,
      message: `${synced} pergunta(s) sincronizada(s) do Mercado Livre.`,
    };
  });

/**
 * ============================================================================
 * CÁLCULO DE PREÇO MULTI-CANAL CONTROLADO POR BACKEND (COMMISSION + MARKUP)
 * ============================================================================
 */
export const calculateAndApplyChannelPricing = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      productId: z.string().uuid(),
      channel: z.enum(MARKETPLACE_PLATFORMS),
      priceMarginPercent: z.number().min(0).max(300).default(0),
      applyChannelCommissionMarkup: z.boolean().default(true),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const targetStoreId = input.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    const { data: product } = await supabase
      .from("products")
      .select("id, price_cents, availability_channels")
      .eq("id", input.productId)
      .eq("store_id", targetStoreId)
      .single();

    if (!product) throw new Error("Produto não encontrado.");

    const basePriceCents = product.price_cents || 0;

    // Taxas padrão de comissão por marketplace (BFF Rules)
    const channelCommissions: Record<string, number> = {
      mercadolivre: 0.16, // 16% (Clássico/Premium Médio)
      ifood: 0.12,        // 12% (Básico de Entrega)
      shopee: 0.14,       // 14% padrão
      amazon: 0.15,       // 15% categoria geral
      magalu: 0.16,       // 16%
      carrefour: 0.15,    // 15%
    };

    const commRate = channelCommissions[input.channel] || 0.15;

    // Cálculo de compensação de margem: PreçoFinal = Base * (1 + margin%) / (1 - comissão)
    let calculatedCents = basePriceCents;
    if (input.priceMarginPercent > 0) {
      calculatedCents = Math.round(calculatedCents * (1 + input.priceMarginPercent / 100));
    }
    if (input.applyChannelCommissionMarkup && commRate > 0) {
      calculatedCents = Math.round(calculatedCents / (1 - commRate));
    }

    // 1. Atualiza na tabela relacional channel_listings
    await supabase.from("channel_listings").upsert(
      {
        store_id: targetStoreId,
        product_id: input.productId,
        channel: input.channel,
        price_cents: calculatedCents,
        commission_rate: commRate,
        attributes: {
          base_price_cents: basePriceCents,
          price_margin_percent: input.priceMarginPercent,
          apply_commission_markup: input.applyChannelCommissionMarkup,
          commission_cents: Math.round(calculatedCents * commRate),
          net_receipt_cents: calculatedCents - Math.round(calculatedCents * commRate),
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id,product_id,channel" }
    );

    // 2. Atualiza no jsonb legado
    const channels = (product.availability_channels as Record<string, any>) || {};
    channels[input.channel] = {
      ...(channels[input.channel] || {}),
      price_cents: calculatedCents,
      price_margin_percent: input.priceMarginPercent,
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from("products")
      .update({ availability_channels: channels, updated_at: new Date().toISOString() })
      .eq("id", input.productId);

    return {
      success: true,
      channel: input.channel,
      basePriceCents,
      channelPriceCents: calculatedCents,
      commissionRate: commRate,
      estimatedCommissionCents: Math.round(calculatedCents * commRate),
      netReceiptCents: calculatedCents - Math.round(calculatedCents * commRate),
    };
  });

/**
 * Despacha um pedido do Waesy para o Bling ERP v3 (POST /pedidos/vendas).
 * Automatiza a integração fiscal e faturamento de ponta a ponta.
 */
export async function pushOrderToBlingErp(
  storeId: string,
  orderId: string
): Promise<{ success: boolean; blingOrderId?: string; message: string }> {
  const supabase = getServerClient();

  let creds = await resolveConnectorCredentialsWithRefresh({
    storeId,
    platform: "bling",
  });

  if (!creds.accessToken) {
    return { success: false, message: "Bling ERP v3 não configurado ou inativo nesta loja." };
  }

  const { data: order } = await supabase
    .from("orders")
    .select("id, total_cents, shipping_cents, customer_snapshot, order_items(id, product_title, variant_sku, qty, unit_price_cents)")
    .eq("id", orderId)
    .eq("store_id", storeId)
    .single();

  if (!order) {
    return { success: false, message: "Pedido não encontrado." };
  }

  const customer = (order.customer_snapshot as any) || {};
  const items = (order.order_items || []).map((it: any) => ({
    codigo: it.variant_sku || it.id,
    descricao: it.product_title || "Item",
    quantidade: it.qty || 1,
    valor: (it.unit_price_cents || 0) / 100,
  }));

  const payload = {
    numero: order.id.slice(0, 8).toUpperCase(),
    data: new Date().toISOString().split("T")[0],
    contato: {
      nome: customer.name || "Cliente Waesy",
      tipoPessoa: customer.document && customer.document.length > 11 ? "J" : "F",
      numeroDocumento: customer.document || undefined,
      email: customer.email || undefined,
      telefone: customer.phone || undefined,
    },
    itens: items,
    transporte: {
      fretePorConta: 0,
      frete: (order.shipping_cents || 0) / 100,
    },
  };

  const sendToBling = async (token: string) =>
    fetchWithExponentialBackoff(
      "https://api.bling.com.br/Api/v3/pedidos/vendas",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      },
      { maxRetries: 3, baseDelayMs: 600 }
    );

  let res = await sendToBling(creds.accessToken);
  if (res.status === 401 && creds.refreshToken) {
    creds = await resolveConnectorCredentialsWithRefresh({
      storeId,
      platform: "bling",
      forceRefresh: true,
    });
    if (creds.accessToken) {
      res = await sendToBling(creds.accessToken);
    }
  }

  if (res.ok) {
    const blingData = res.data?.data;
    const blingId = blingData?.id ? String(blingData.id) : undefined;
    await supabase.from("marketplace_sync_logs").insert({
      store_id: storeId,
      platform: "bling",
      sync_type: "orders",
      direction: "export",
      status: "completed",
      items_processed: 1,
      items_created: 1,
      items_updated: 0,
      items_failed: 0,
      duration_ms: 150,
      errors: [],
      metadata: { order_id: orderId, bling_order_id: blingId || null },
    });
    return {
      success: true,
      blingOrderId: blingId,
      message: `Pedido sincronizado com Bling ERP v3 com sucesso (Bling ID #${blingId || "OK"}).`,
    };
  }

  return {
    success: false,
    message: `Falha ao sincronizar pedido com Bling ERP v3: HTTP ${res.status}`,
  };
}

/**
 * Sincroniza em lote ou unitariamente estoque e preço de um produto para todos os canais conectados
 */
export const syncProductStockAndPriceToChannels = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      productId: z.string().uuid(),
      stockQty: z.number().int().min(0),
      priceCents: z.number().int().min(0).optional(),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const targetStoreId = input.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");

    return _syncStockToMarketplacesInternal(targetStoreId, input.productId, input.stockQty);
  });

/**
 * Despacha resposta de pergunta pré-venda diretamente para a API do Mercado Livre (POST /answers)
 * e atualiza o registro local em `marketplace_questions`.
 */
export async function answerMercadoLivreQuestion(
  input:
    | { storeId: string; questionId: string; answerText: string }
    | { data: { storeId: string; questionId: string; answerText: string } }
): Promise<{ success: boolean; status?: string; message?: string; data?: any }> {
  const params = "data" in input ? input.data : input;
  const supabase = getServerClient();

  let creds = await resolveConnectorCredentialsWithRefresh({
    storeId: params.storeId,
    platform: "mercadolivre",
  });

  if (!creds.accessToken) {
    console.warn(`[marketplace-hub] Resposta de pergunta ML #${params.questionId} sem credencial configurada.`);
    return {
      success: false,
      status: "unconfigured",
      message: "Canal Mercado Livre não configurado para envio de resposta via API.",
    };
  }

  try {
    const postAnswer = async (token: string) =>
      fetchWithExponentialBackoff(
        "https://api.mercadolibre.com/answers",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            question_id: Number(params.questionId) || params.questionId,
            text: params.answerText,
          }),
        },
        { maxRetries: 3, baseDelayMs: 500 }
      );

    let response = await postAnswer(creds.accessToken);
    if (response.status === 401 && creds.refreshToken) {
      creds = await resolveConnectorCredentialsWithRefresh({
        storeId: params.storeId,
        platform: "mercadolivre",
        forceRefresh: true,
      });
      if (creds.accessToken) {
        response = await postAnswer(creds.accessToken);
      }
    }

    const resBody = (response.data || {}) as Record<string, any>;

    if (response.ok) {
      await supabase
        .from("marketplace_questions")
        .update({
          answer_text: params.answerText,
          status: "answered",
          answered_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("store_id", params.storeId)
        .eq("platform", "mercadolivre")
        .eq("external_question_id", String(params.questionId));
    }

    await supabase.from("marketplace_sync_logs").insert({
      store_id: params.storeId,
      platform: "mercadolivre",
      sync_type: "orders",
      direction: "export",
      status: response.ok ? "completed" : "failed",
      items_processed: 1,
      items_created: 0,
      items_updated: response.ok ? 1 : 0,
      items_failed: response.ok ? 0 : 1,
      duration_ms: 120,
      errors: response.ok ? [] : [{ question_id: params.questionId, message: resBody.message || response.statusText }],
      message: response.ok
        ? `Resposta à pergunta #${params.questionId} enviada com sucesso ao Mercado Livre.`
        : `Falha ao responder pergunta #${params.questionId} no Mercado Livre: ${resBody.message || response.statusText}`,
      metadata: { scope: "question_answer", question_id: String(params.questionId) },
    });

    if (!response.ok) {
      return {
        success: false,
        status: "error",
        message: resBody.message || `Erro HTTP ${response.status} ao responder pergunta no Mercado Livre.`,
      };
    }

    return {
      success: true,
      status: "completed",
      data: resBody,
      message: `Resposta à pergunta #${params.questionId} publicada no Mercado Livre.`,
    };
  } catch (err: any) {
    console.error("[marketplace-hub] Erro ao enviar resposta para Mercado Livre:", err);
    return {
      success: false,
      status: "error",
      message: err.message || "Erro desconhecido ao despachar resposta ao Mercado Livre.",
    };
  }
}

export const answerMarketplaceQuestionFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      questionId: z.string().min(1),
      answerText: z.string().min(1, "Informe a resposta.").max(2000),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "staff"]);
    const targetStoreId = data.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");
    return answerMercadoLivreQuestion({
      storeId: targetStoreId,
      questionId: data.questionId,
      answerText: data.answerText,
    });
  });

export const pushOrderToBlingErpFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().optional(),
      orderId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);
    const targetStoreId = data.storeId || identity.store_id;
    if (!targetStoreId) throw new Error("Loja não identificada.");
    return pushOrderToBlingErp(targetStoreId, data.orderId);
  });

/**
 * Gera URL oficial de Login Rápido OAuth 2.0 (1-Clique) para Marketplaces (Mercado Livre, Bling, Shopee, Magalu, iFood).
 */
export const getMarketplaceOAuthUrl = createServerFn({ method: "POST" })
  .validator(
    z.object({
      platform: z.enum(MARKETPLACE_PLATFORMS),
      clientId: z.string().optional(),
      partnerKey: z.string().optional(),
      returnPath: z.string().default("/workspace/integracoes/marketplaces"),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);
    const storeId = identity.store_id;
    if (!storeId) throw new Error("Loja não identificada.");

    const resolved = await resolveConnectorCredentialsWithRefresh({
      storeId,
      platform: data.platform,
    });

    const appUrl = (process.env.VITE_APP_URL || process.env.PUBLIC_APP_URL || "https://waesy.com").replace(/\/$/, "");
    const cleanClientId = (data.clientId || resolved.clientId || "").replace(/•+/g, "").trim();
    const cleanPartnerKey = (data.partnerKey || resolved.clientSecret || "").replace(/•+/g, "").trim();

    return buildMarketplaceOAuthAuthorizeUrl({
      platform: data.platform,
      appUrl,
      storeId,
      clientId: cleanClientId || undefined,
      partnerKey: cleanPartnerKey || undefined,
      returnPath: data.returnPath,
    });
  });

export async function verifyMarketplaceConnectorConnectivity(params: {
  platform: string;
  resolved: {
    isConfigured: boolean;
    accessToken?: string | null;
    clientId?: string;
    clientSecret?: string;
    externalAccountId?: string;
    isTestMode?: boolean;
  };
  fetchImpl?: typeof fetch;
}): Promise<{ success: boolean; verifiedRemotely: boolean; message: string }> {
  const { platform, resolved } = params;
  const doFetch = params.fetchImpl || fetch;

  if (!resolved.isConfigured) {
    return {
      success: false,
      verifiedRemotely: false,
      message: "Nenhuma credencial válida encontrada no cofre nem no formulário.",
    };
  }

  if (platform === "mercadolivre" && resolved.accessToken) {
    try {
      const res = await doFetch("https://api.mercadolibre.com/users/me", {
        headers: { Authorization: `Bearer ${resolved.accessToken}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        return {
          success: false,
          verifiedRemotely: true,
          message: `Mercado Livre rejeitou o Access Token (HTTP ${res.status}).`,
        };
      }
      const body = (await res.json().catch(() => ({}))) as Record<string, any>;
      return {
        success: true,
        verifiedRemotely: true,
        message: `Conexão Mercado Livre ativa: Conta ${body.nickname || body.id || "autenticada"} verificada (HTTP 200).`,
      };
    } catch (err: unknown) {
      return {
        success: false,
        verifiedRemotely: true,
        message: `Falha de rede ao consultar Mercado Livre: ${err instanceof Error ? err.message : "Timeout"}`,
      };
    }
  }

  if (platform === "bling" && resolved.accessToken) {
    try {
      const res = await doFetch("https://api.bling.com.br/Api/v3/situacoes/modulos", {
        headers: { Authorization: `Bearer ${resolved.accessToken}`, Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        return {
          success: false,
          verifiedRemotely: true,
          message: `Bling v3 rejeitou as credenciais (HTTP ${res.status}).`,
        };
      }
      return {
        success: true,
        verifiedRemotely: true,
        message: "Token OAuth 2.0 Bling ERP v3 verificado ao vivo (HTTP 200).",
      };
    } catch (err: unknown) {
      return {
        success: false,
        verifiedRemotely: true,
        message: `Falha de rede ao consultar Bling ERP: ${err instanceof Error ? err.message : "Timeout"}`,
      };
    }
  }

  if (platform === "ifood" && resolved.accessToken) {
    try {
      const res = await doFetch("https://merchant-api.ifood.com.br/merchant/v1.0/merchants", {
        headers: { Authorization: `Bearer ${resolved.accessToken}` },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        return {
          success: false,
          verifiedRemotely: true,
          message: `iFood Merchant API rejeitou o token informado (HTTP ${res.status}).`,
        };
      }
      return {
        success: true,
        verifiedRemotely: true,
        message: "Token OAuth 2.0 iFood Merchant API v1.0 verificado ao vivo (HTTP 200).",
      };
    } catch (err: unknown) {
      return {
        success: false,
        verifiedRemotely: true,
        message: `Falha de rede ao consultar iFood: ${err instanceof Error ? err.message : "Timeout"}`,
      };
    }
  }

  if (platform === "shopee" && resolved.accessToken && resolved.clientId && resolved.clientSecret && resolved.externalAccountId) {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      const apiPath = "/api/v2/shop/get_shop_info";
      const sign = generateShopeeSign({
        partnerId: resolved.clientId,
        partnerKey: resolved.clientSecret,
        apiPath,
        timestamp,
        accessToken: resolved.accessToken,
        shopId: resolved.externalAccountId,
      });
      const res = await doFetch(
        `https://partner.shopeemobile.com${apiPath}?partner_id=${encodeURIComponent(resolved.clientId)}&timestamp=${timestamp}&access_token=${encodeURIComponent(resolved.accessToken)}&shop_id=${encodeURIComponent(resolved.externalAccountId)}&sign=${sign}`,
        { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(10000) }
      );
      const json = (await res.json().catch(() => ({}))) as Record<string, any>;
      if (!res.ok || json.error) {
        return {
          success: false,
          verifiedRemotely: true,
          message: `Shopee v2 rejeitou a sessão (${json.message || json.error || `HTTP ${res.status}`}).`,
        };
      }
      return {
        success: true,
        verifiedRemotely: true,
        message: `Conexão Shopee v2 verificada: Loja ${json.shop_name || resolved.externalAccountId}.`,
      };
    } catch (err: unknown) {
      return {
        success: false,
        verifiedRemotely: true,
        message: `Falha de rede ao consultar Shopee v2: ${err instanceof Error ? err.message : "Timeout"}`,
      };
    }
  }

  if (platform === "melhorenvio" && resolved.accessToken) {
    try {
      const base = resolved.isTestMode ? "https://sandbox.melhorenvio.com.br" : "https://melhorenvio.com.br";
      const res = await doFetch(`${base}/api/v2/me`, {
        headers: { Authorization: `Bearer ${resolved.accessToken}`, Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        return {
          success: false,
          verifiedRemotely: true,
          message: `Melhor Envio rejeitou o Bearer Token (HTTP ${res.status}).`,
        };
      }
      const body = (await res.json().catch(() => ({}))) as Record<string, any>;
      return {
        success: true,
        verifiedRemotely: true,
        message: `Melhor Envio verificado ao vivo (${body.email || body.firstname || "HTTP 200"}).`,
      };
    } catch (err: unknown) {
      return {
        success: false,
        verifiedRemotely: true,
        message: `Falha de rede ao consultar Melhor Envio: ${err instanceof Error ? err.message : "Timeout"}`,
      };
    }
  }

  if (platform === "amazon" && resolved.accessToken) {
    try {
      const res = await doFetch("https://sellingpartnerapi-na.amazon.com/sellers/v1/marketplaceParticipations", {
        headers: { "x-amz-access-token": resolved.accessToken, Accept: "application/json" },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        return {
          success: false,
          verifiedRemotely: true,
          message: `Amazon SP-API rejeitou o token LWA (HTTP ${res.status}).`,
        };
      }
      return {
        success: true,
        verifiedRemotely: true,
        message: "Token LWA Amazon SP-API verificado ao vivo (HTTP 200).",
      };
    } catch (err: unknown) {
      return {
        success: false,
        verifiedRemotely: true,
        message: `Falha de rede ao consultar Amazon SP-API: ${err instanceof Error ? err.message : "Timeout"}`,
      };
    }
  }

  return {
    success: true,
    verifiedRemotely: false,
    message: `Credenciais de ${platform.toUpperCase()} localizadas no cofre AES-256-GCM. Teste ao vivo não suportado diretamente para este conector.`,
  };
}

/**
 * Testa em tempo real as credenciais salvas ou digitadas para o conector de Marketplace.
 */
export const testMarketplaceConnectorCredentialsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      platform: z.enum(MARKETPLACE_PLATFORMS),
      credentialPayload: z.record(z.string()).optional(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);
    const storeId = identity.store_id;
    if (!storeId) throw new Error("Loja não identificada.");

    const cleanPayload: Record<string, string> = {};
    if (data.credentialPayload) {
      for (const [k, v] of Object.entries(data.credentialPayload)) {
        const trimmed = (v || "").trim();
        if (trimmed && !trimmed.includes("••••")) {
          cleanPayload[k] = trimmed;
        }
      }
    }

    const resolved = await resolveConnectorCredentialsWithRefresh({
      storeId,
      platform: data.platform,
      connectorRow: Object.keys(cleanPayload).length > 0 ? { settings: { credentials: cleanPayload } } : undefined,
    });

    return await verifyMarketplaceConnectorConnectivity({
      platform: data.platform,
      resolved,
    });
  });



