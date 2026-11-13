import { getServerClient } from "@/lib/supabase";
import { decryptSecret, encryptSecret } from "@/lib/crypto-vault.server";
import {
  generateShopeeSign,
  pushIfoodOrderLifecycle,
  refreshMarketplaceAccessToken,
} from "@/lib/marketplace-api-client";
import { fetchWithExponentialBackoff } from "@/lib/resilient-api-client";

export function safeDecryptVaultValue(val: unknown): string {
  if (typeof val !== "string" || !val.trim()) return "";
  const trimmed = val.trim();
  try {
    return decryptSecret(trimmed);
  } catch {
    return trimmed;
  }
}

export interface ResolvedMarketplaceCredentials {
  connectorId?: string;
  isConfigured: boolean;
  isTestMode: boolean;
  accessToken: string;
  refreshToken: string;
  externalAccountId: string;
  clientId: string;
  clientSecret: string;
  tokenExpiresAt?: string | null;
  decryptedCreds: Record<string, string>;
  settings: Record<string, any>;
}

/**
 * Resolve credenciais do conector de marketplace combinando:
 * 1) Registro da loja em `marketplace_connectors`
 * 2) Vault legado `integration_credentials`
 * 3) Chaves Master de App OAuth na matriz (`waesy-matriz`) / variáveis de ambiente
 * Inclui renovação automática de tokens próximos do vencimento ou após HTTP 401.
 */
export async function resolveConnectorCredentialsWithRefresh(params: {
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
}): Promise<ResolvedMarketplaceCredentials> {
  const supabase = getServerClient();
  let connector = params.connectorRow;

  if (!connector || (connector.access_token === undefined && connector.external_account_id === undefined)) {
    const { data: row } = await supabase
      .from("marketplace_connectors")
      .select("id, access_token, refresh_token, external_account_id, token_expires_at, settings")
      .eq("store_id", params.storeId)
      .eq("platform", params.platform)
      .maybeSingle();

    if (row) {
      connector = {
        ...connector,
        ...row,
        settings: { ...(row.settings || {}), ...(params.connectorRow?.settings || {}) },
      };
    }
  }

  const { data: creds } = await supabase
    .from("integration_credentials")
    .select("token_payload, is_active")
    .eq("store_id", params.storeId)
    .eq("provider", params.platform)
    .maybeSingle();

  const settings = (connector?.settings || params.connectorRow?.settings || {}) as Record<string, any>;
  const rawVaultPayload = (creds?.is_active && creds?.token_payload ? creds.token_payload : {}) as Record<string, any>;
  const rawNestedCreds = (settings.credentials || {}) as Record<string, any>;

  const decryptedCreds: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...rawVaultPayload, ...settings, ...rawNestedCreds })) {
    if (typeof v === "string" && v.trim()) {
      decryptedCreds[k] = safeDecryptVaultValue(v);
    }
  }

  let activeToken =
    safeDecryptVaultValue(connector?.access_token) ||
    decryptedCreds.access_token ||
    decryptedCreds.api_token ||
    decryptedCreds.api_key ||
    decryptedCreds.access_code ||
    decryptedCreds.partner_key ||
    decryptedCreds.token ||
    "";

  let refreshToken =
    safeDecryptVaultValue(connector?.refresh_token) ||
    decryptedCreds.refresh_token ||
    "";

  let clientId =
    decryptedCreds.client_id ||
    decryptedCreds.lwa_client_id ||
    decryptedCreds.partner_id ||
    decryptedCreds.api_user ||
    decryptedCreds.username ||
    "";

  let clientSecret =
    decryptedCreds.client_secret ||
    decryptedCreds.lwa_client_secret ||
    decryptedCreds.partner_key ||
    decryptedCreds.api_password ||
    "";

  // Fallback seguro para App Master (`waesy-matriz`) caso a loja use OAuth centralizado
  if ((!clientId || !clientSecret) && ["mercadolivre", "ifood", "shopee"].includes(params.platform)) {
    const storeQ = supabase.from("stores").select("settings");
    const masterQuery =
      typeof (storeQ as any).or === "function"
        ? (storeQ as any).or("slug.eq.waesy-matriz,is_platform_root.eq.true").limit(1)
        : storeQ.eq("slug", "waesy-matriz");
    const { data: masterStore } = await masterQuery.maybeSingle();

    const masterInt = ((masterStore?.settings as any)?.integrations || {}) as Record<string, any>;
    if (params.platform === "mercadolivre") {
      clientId = clientId || safeDecryptVaultValue(masterInt.mercadolivre_app_id) || process.env.MERCADOLIVRE_APP_ID || process.env.MERCADOLIVRE_CLIENT_ID || "";
      clientSecret = clientSecret || safeDecryptVaultValue(masterInt.mercadolivre_client_secret) || process.env.MERCADOLIVRE_CLIENT_SECRET || "";
    } else if (params.platform === "ifood") {
      clientId = clientId || safeDecryptVaultValue(masterInt.ifood_client_id) || process.env.IFOOD_CLIENT_ID || "";
      clientSecret = clientSecret || safeDecryptVaultValue(masterInt.ifood_client_secret) || process.env.IFOOD_CLIENT_SECRET || "";
    } else if (params.platform === "shopee") {
      clientId = clientId || safeDecryptVaultValue(masterInt.shopee_partner_id) || process.env.SHOPEE_PARTNER_ID || "";
      clientSecret = clientSecret || safeDecryptVaultValue(masterInt.shopee_partner_key) || process.env.SHOPEE_PARTNER_KEY || "";
    }
  }

  const externalAccountId =
    connector?.external_account_id ||
    decryptedCreds.seller_id ||
    decryptedCreds.merchant_uuid ||
    decryptedCreds.shop_id ||
    decryptedCreds.restaurant_id ||
    decryptedCreds.location_id ||
    "";

  const expiresAtIso = connector?.token_expires_at || settings.token_expires_at || null;
  const expiresAtMs = expiresAtIso ? Date.parse(expiresAtIso) : NaN;
  const isNearExpiration = Number.isFinite(expiresAtMs) && expiresAtMs - 120_000 <= Date.now();

  const shouldRefreshIfood = params.platform === "ifood" && (!activeToken || isNearExpiration || params.forceRefresh) && Boolean(clientId && clientSecret);
  const shouldRefreshOAuth =
    ["mercadolivre", "bling", "shopee", "amazon", "magalu"].includes(params.platform) &&
    Boolean(refreshToken && clientId && clientSecret) &&
    (!activeToken || isNearExpiration || params.forceRefresh);
  const shouldRefreshCorreios =
    params.platform === "correios" &&
    (!activeToken || isNearExpiration || params.forceRefresh) &&
    Boolean(decryptedCreds.username && decryptedCreds.access_code && decryptedCreds.card_number);

  let updatedExpiresAt = expiresAtIso;

  if (shouldRefreshIfood || shouldRefreshOAuth || shouldRefreshCorreios) {
    try {
      const refreshed = await refreshMarketplaceAccessToken({
        platform: params.platform,
        clientId,
        clientSecret,
        refreshToken,
        externalAccountId,
        username: decryptedCreds.username,
        accessCode: decryptedCreds.access_code,
        cardNumber: decryptedCreds.card_number,
        fetchImpl: params.fetchImpl,
      });

      if (refreshed?.accessToken) {
        activeToken = refreshed.accessToken;
        if (refreshed.refreshToken) refreshToken = refreshed.refreshToken;
        if (refreshed.tokenExpiresAt) updatedExpiresAt = refreshed.tokenExpiresAt;

        if (connector?.id) {
          const encAccess = encryptSecret(activeToken);
          const encRefresh = refreshToken ? encryptSecret(refreshToken) : undefined;
          const nextCreds = {
            ...rawNestedCreds,
            access_token: encAccess,
            ...(encRefresh ? { refresh_token: encRefresh } : {}),
          };

          await supabase
            .from("marketplace_connectors")
            .update({
              access_token: encAccess,
              ...(encRefresh ? { refresh_token: encRefresh } : {}),
              token_expires_at: updatedExpiresAt || null,
              settings: {
                ...settings,
                token_expires_at: updatedExpiresAt || undefined,
                credentials: nextCreds,
              },
              updated_at: new Date().toISOString(),
            })
            .eq("id", connector.id);
        }
      }
    } catch (refreshErr) {
      console.warn(`[marketplace-vault] Falha ao renovar token (${params.platform}):`, refreshErr);
    }
  }

  const isConfigured = Boolean(activeToken || (clientId && clientSecret));
  const isTestMode = Boolean(
    settings.sandbox ||
      settings.is_test ||
      settings.environment === "sandbox" ||
      decryptedCreds.environment === "sandbox"
  );

  return {
    connectorId: connector?.id,
    isConfigured,
    isTestMode,
    accessToken: activeToken,
    refreshToken,
    externalAccountId,
    clientId,
    clientSecret,
    tokenExpiresAt: updatedExpiresAt,
    decryptedCreds,
    settings,
  };
}

/**
 * Empurra transição de status, código de rastreio ou cancelamento do Waesy de volta ao canal de origem.
 */
export async function pushOrderUpdateToOriginMarketplace(params: {
  storeId: string;
  orderId: string;
  targetStatus: string;
  trackingCode?: string;
  carrierName?: string;
  trackingUrl?: string;
  cancellationReason?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ dispatched: boolean; platform?: string; ok: boolean; message: string }> {
  const supabase = getServerClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, channel_origin, origin_channel, notes")
    .eq("id", params.orderId)
    .eq("store_id", params.storeId)
    .maybeSingle();

  const { data: extOrder } = await supabase
    .from("marketplace_external_orders")
    .select("id, platform, external_order_id, external_status, raw_payload")
    .eq("store_id", params.storeId)
    .eq("order_id", params.orderId)
    .maybeSingle();

  const platform = String(extOrder?.platform || order?.channel_origin || order?.origin_channel || "").toLowerCase();
  const externalOrderId =
    extOrder?.external_order_id ||
    (typeof order?.notes === "string" ? order.notes.match(/#([A-Za-z0-9_-]+)/)?.[1] : undefined);

  if (!platform || !externalOrderId || ["waesy_app", "pos", "pdv", "whatsapp", "direct"].includes(platform)) {
    return { dispatched: false, ok: true, message: "Pedido interno sem canal de marketplace externo." };
  }

  const creds = await resolveConnectorCredentialsWithRefresh({
    storeId: params.storeId,
    platform,
    fetchImpl: params.fetchImpl,
  });

  if (!creds.isConfigured || !creds.accessToken) {
    return {
      dispatched: false,
      platform,
      ok: false,
      message: `Conector ${platform.toUpperCase()} sem token ativo para notificar status.`,
    };
  }

  try {
    if (platform === "ifood") {
      const res = await pushIfoodOrderLifecycle({
        accessToken: creds.accessToken,
        externalOrderId,
        targetStatus: params.targetStatus,
        cancellationReason: params.cancellationReason,
        fetchImpl: params.fetchImpl,
      });

      if (extOrder?.id) {
        await supabase
          .from("marketplace_external_orders")
          .update({
            external_status: res.ok ? params.targetStatus : extOrder.external_status,
            ...(params.cancellationReason ? { cancellation_reason: params.cancellationReason } : {}),
            updated_at: new Date().toISOString(),
          })
          .eq("id", extOrder.id);
      }

      return { dispatched: true, platform, ok: res.ok, message: res.message };
    }

    if (platform === "mercadolivre") {
      const st = params.targetStatus.toLowerCase();
      if (st === "cancelled" || st === "canceled") {
        const res = await fetchWithExponentialBackoff(
          `https://api.mercadolibre.com/orders/${encodeURIComponent(externalOrderId)}/cancellations`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${creds.accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              reason_id: "seller_cancelled",
              description: params.cancellationReason || "Cancelado pelo vendedor via Waesy",
            }),
          },
          { maxRetries: 2, baseDelayMs: 400 }
        );
        return {
          dispatched: true,
          platform,
          ok: res.ok,
          message: res.ok ? `Cancelamento enviado ao Mercado Livre #${externalOrderId}` : `Mercado Livre HTTP ${res.status}`,
        };
      }

      if (params.trackingCode) {
        const orderRes = await fetchWithExponentialBackoff(
          `https://api.mercadolibre.com/orders/${encodeURIComponent(externalOrderId)}`,
          { method: "GET", headers: { Authorization: `Bearer ${creds.accessToken}` } },
          { maxRetries: 2, baseDelayMs: 400 }
        );
        const shipmentId = orderRes.data?.shipping?.id;
        if (shipmentId) {
          const trackRes = await fetchWithExponentialBackoff(
            `https://api.mercadolibre.com/shipments/${shipmentId}/tracking`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${creds.accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                tracking_number: params.trackingCode,
                tracking_url: params.trackingUrl || undefined,
                carrier: params.carrierName || "Transportadora",
              }),
            },
            { maxRetries: 2, baseDelayMs: 400 }
          );

          if (extOrder?.id) {
            await supabase
              .from("marketplace_external_orders")
              .update({
                tracking_number: params.trackingCode,
                external_status: "shipped",
              })
              .eq("id", extOrder.id);
          }

          return {
            dispatched: true,
            platform,
            ok: trackRes.ok,
            message: trackRes.ok
              ? `Rastreio ${params.trackingCode} enviado ao Mercado Livre (Envio #${shipmentId})`
              : `Mercado Livre Envio HTTP ${trackRes.status}`,
          };
        }
      }
      return { dispatched: false, platform, ok: true, message: "Transição sem endpoint externo requerido no Mercado Livre." };
    }

    if (platform === "shopee" && creds.clientId && creds.clientSecret && creds.externalAccountId) {
      const st = params.targetStatus.toLowerCase();
      if ((st === "shipped" || params.trackingCode) && st !== "cancelled") {
        const ts = Math.floor(Date.now() / 1000);
        const apiPath = "/api/v2/logistics/ship_order";
        const sign = generateShopeeSign({
          partnerId: creds.clientId,
          partnerKey: creds.clientSecret,
          apiPath,
          timestamp: ts,
          accessToken: creds.accessToken,
          shopId: creds.externalAccountId,
        });
        const url = `https://partner.shopeemobile.com${apiPath}?partner_id=${encodeURIComponent(creds.clientId)}&timestamp=${ts}&access_token=${encodeURIComponent(creds.accessToken)}&shop_id=${encodeURIComponent(creds.externalAccountId)}&sign=${sign}`;
        const res = await fetchWithExponentialBackoff(
          url,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              order_sn: externalOrderId,
              ...(params.trackingCode ? { non_integrated: { tracking_number: params.trackingCode } } : {}),
            }),
          },
          { maxRetries: 2, baseDelayMs: 400 }
        );
        return {
          dispatched: true,
          platform,
          ok: res.ok && !res.data?.error,
          message: res.ok && !res.data?.error ? `Despacho confirmado na Shopee #${externalOrderId}` : `Shopee: ${res.data?.message || res.status}`,
        };
      }
    }

    return { dispatched: false, platform, ok: true, message: `Canal ${platform.toUpperCase()} sincronizado localmente.` };
  } catch (err: any) {
    return {
      dispatched: true,
      platform,
      ok: false,
      message: err?.message || `Erro ao notificar ${platform.toUpperCase()}`,
    };
  }
}
