import { createFileRoute } from "@tanstack/react-router";
import { handleInboundWebhook, type InboundWebhookPayload } from "@/services/marketplace-webhooks.functions";
import { getServerClient } from "@/lib/supabase";
import { decryptSecret } from "@/lib/crypto-vault.server";
import {
  safeCompareHexOrString,
  verifyBlingWebhookSignature,
  verifyIfoodWebhookSignature,
  verifyMercadoLivreWebhookSignature,
  verifyShopeeWebhookSignature,
} from "@/lib/marketplace-api-client";
import { createHmac } from "node:crypto";

import type {} from "@tanstack/react-start";

function safeDecryptSecret(val: unknown): string {
  if (typeof val !== "string" || !val.trim()) return "";
  try {
    return decryptSecret(val.trim());
  } catch {
    return val.trim();
  }
}

/**
 * Normaliza identificador externo de conta, tópico, eventId e resourceId por provedor.
 */
function extractProviderWebhookMeta(platform: string, rawBody: any, url: URL, headers: Headers) {
  const firstItem = Array.isArray(rawBody) ? rawBody[0] || {} : rawBody || {};
  let eventId: string | undefined;
  let topic: string | undefined;
  let resourceId: string | undefined;
  let externalAccountId: string | undefined;
  let dataIdForMl: string | undefined;

  if (platform === "mercadolivre") {
    eventId = rawBody?._id || rawBody?.id || headers.get("x-request-id") || undefined;
    topic = rawBody?.topic || undefined;
    resourceId = rawBody?.resource || undefined;
    externalAccountId = rawBody?.user_id ? String(rawBody.user_id) : undefined;
    dataIdForMl =
      url.searchParams.get("data.id") ||
      url.searchParams.get("id") ||
      (rawBody?.data?.id ? String(rawBody.data.id) : undefined) ||
      (typeof rawBody?.resource === "string" ? rawBody.resource.split("/").filter(Boolean).pop() : undefined);
  } else if (platform === "ifood") {
    eventId = firstItem?.id || headers.get("x-ifood-event-id") || undefined;
    topic = firstItem?.fullCode || firstItem?.code || undefined;
    resourceId = firstItem?.orderId || undefined;
    externalAccountId = firstItem?.merchantId || firstItem?.merchant_id || undefined;
  } else if (platform === "shopee") {
    const dataObj = rawBody?.data || {};
    eventId = rawBody?.msg_id || (rawBody?.code !== undefined && dataObj?.ordersn ? `shopee:${rawBody.code}:${dataObj.ordersn}` : undefined);
    topic = rawBody?.code !== undefined ? String(rawBody.code) : rawBody?.topic || undefined;
    resourceId = dataObj?.ordersn || dataObj?.order_sn || rawBody?.resourceId || undefined;
    externalAccountId = rawBody?.shop_id ? String(rawBody.shop_id) : undefined;
  } else if (platform === "bling" || platform === "tiny") {
    eventId = rawBody?.eventId || rawBody?.id || (rawBody?.data?.id ? String(rawBody.data.id) : undefined);
    topic = rawBody?.event || rawBody?.tipo || rawBody?.topic || undefined;
    resourceId = rawBody?.data?.id ? String(rawBody.data.id) : rawBody?.resourceId || rawBody?.numero || undefined;
    externalAccountId = rawBody?.empresaId ? String(rawBody.empresaId) : undefined;
  } else if (platform === "magalu") {
    eventId = rawBody?.id || rawBody?.event_id || undefined;
    topic = rawBody?.event || rawBody?.topic || undefined;
    resourceId = rawBody?.data?.code || rawBody?.order_id || rawBody?.id_order || undefined;
    externalAccountId = rawBody?.seller_id || rawBody?.sellerId ? String(rawBody.seller_id || rawBody.sellerId) : undefined;
  } else if (platform === "focus_nfe" || platform === "nuvem_fiscal") {
    eventId = rawBody?.ref || rawBody?.id || rawBody?.chave_nfe || undefined;
    topic = rawBody?.status || rawBody?.situacao || undefined;
    resourceId = rawBody?.ref || rawBody?.chave_nfe || undefined;
  } else {
    eventId = rawBody?.id || rawBody?.eventId || undefined;
    topic = rawBody?.topic || rawBody?.event_type || undefined;
    resourceId = rawBody?.resourceId || rawBody?.orderId || undefined;
  }

  return { eventId, topic, resourceId, externalAccountId, dataIdForMl };
}

/**
 * Valida assinatura criptográfica HMAC SHA-256 conforme as regras oficiais de cada provedor.
 */
function verifyHmacSignature(params: {
  platform: string;
  rawText: string;
  requestUrl: string;
  dataIdForMl?: string;
  headers: Headers;
  secrets: string[];
}): { isValid: boolean; reason?: string; missingSecret?: boolean } {
  const uniqueSecrets = Array.from(new Set(params.secrets.map((s) => s.trim()).filter(Boolean)));
  if (uniqueSecrets.length === 0) {
    return { isValid: false, missingSecret: true, reason: "Webhook secret is not configured" };
  }

  const { platform, rawText, headers } = params;

  for (const secret of uniqueSecrets) {
    // 1. Mercado Livre: x-signature + x-request-id + data.id
    const mlSigHeader = headers.get("x-signature");
    if (platform === "mercadolivre" && mlSigHeader) {
      const check = verifyMercadoLivreWebhookSignature({
        xSignatureHeader: mlSigHeader,
        xRequestId: headers.get("x-request-id"),
        dataId: params.dataIdForMl,
        secret,
        maxAgeSeconds: 300,
      });
      if (check.valid) return { isValid: true };
    }

    // 2. Shopee Push: Authorization header = HMAC(callbackUrl|rawBody)
    const shopeeAuth = headers.get("authorization");
    if (platform === "shopee" && shopeeAuth && !shopeeAuth.startsWith("Basic ")) {
      const check = verifyShopeeWebhookSignature({
        authorizationHeader: shopeeAuth,
        callbackUrl: params.requestUrl,
        rawBody: rawText,
        partnerKey: secret,
      });
      if (check.valid) return { isValid: true };
    }

    // 3. Bling v3: X-Bling-Signature-256
    const blingSig = headers.get("x-bling-signature-256");
    if ((platform === "bling" || platform === "tiny") && blingSig) {
      const check = verifyBlingWebhookSignature({
        signatureHeader: blingSig,
        rawBody: rawText,
        clientSecret: secret,
      });
      if (check.valid) return { isValid: true };
    }

    // 4. iFood: X-IFood-Signature
    const ifoodSig = headers.get("x-ifood-signature");
    if (platform === "ifood" && ifoodSig) {
      const check = verifyIfoodWebhookSignature({
        signatureHeader: ifoodSig,
        rawBody: rawText,
        clientSecret: secret,
      });
      if (check.valid) return { isValid: true };
    }

    // 5. Padrões genéricos HMAC-SHA256 sobre rawBody
    const genericHeader =
      headers.get("x-hub-signature-256") ||
      headers.get("x-shopee-signature") ||
      headers.get("x-bling-signature") ||
      headers.get("x-magalu-signature") ||
      headers.get("x-webhook-signature") ||
      headers.get("x-waesy-signature");

    if (genericHeader) {
      const normalized = genericHeader.replace(/^sha256=/i, "").trim();
      const computed = createHmac("sha256", secret).update(rawText).digest("hex");
      if (safeCompareHexOrString(normalized, computed)) {
        return { isValid: true };
      }
    }
  }

  return { isValid: false, reason: "Assinatura HMAC inválida ou ausente" };
}

export const Route = createFileRoute("/api/webhooks/marketplaces")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const url = new URL(request.url);
          const rawPlatform = (url.searchParams.get("platform") || "mercadolivre").toLowerCase();
          const platformParam = rawPlatform === "ml" ? "mercadolivre" : rawPlatform;
          let storeIdParam = url.searchParams.get("store_id") || url.searchParams.get("storeId") || undefined;

          const rawText = await request.text();
          let rawBody: any = {};
          try {
            rawBody = JSON.parse(rawText);
          } catch {
            rawBody = {};
          }

          const meta = extractProviderWebhookMeta(platformParam, rawBody, url, request.headers);

          // Resolve secrets e store_id multi-tenant pelo external_account_id quando omitido na URL
          const supabase = getServerClient();
          const candidateSecrets: string[] = [];
          if (process.env.MARKETPLACE_WEBHOOK_SECRET) candidateSecrets.push(process.env.MARKETPLACE_WEBHOOK_SECRET);
          if (platformParam === "mercadolivre" && process.env.MERCADOLIVRE_CLIENT_SECRET) {
            candidateSecrets.push(process.env.MERCADOLIVRE_CLIENT_SECRET);
          }
          if (platformParam === "shopee" && process.env.SHOPEE_PARTNER_KEY) {
            candidateSecrets.push(process.env.SHOPEE_PARTNER_KEY);
          }
          if (platformParam === "ifood" && process.env.IFOOD_CLIENT_SECRET) {
            candidateSecrets.push(process.env.IFOOD_CLIENT_SECRET);
          }

          let connectorQuery = supabase
            .from("marketplace_connectors")
            .select("store_id, credentials, settings, metadata")
            .eq("platform", platformParam);

          if (storeIdParam) {
            connectorQuery = connectorQuery.eq("store_id", storeIdParam);
          } else if (meta.externalAccountId) {
            connectorQuery = connectorQuery.eq("external_account_id", meta.externalAccountId);
          }

          if (storeIdParam || meta.externalAccountId) {
            const { data: conn } = await connectorQuery.limit(1).maybeSingle();
            if (conn) {
              if (!storeIdParam) storeIdParam = conn.store_id;
              const topCreds = ((conn.credentials || {}) as Record<string, any>);
              const creds = ((conn.settings as any)?.credentials || {}) as Record<string, any>;
              const connMeta = ((conn.metadata || {}) as Record<string, any>);
              const foundSecrets = [
                connMeta.webhook_secret,
                topCreds.webhook_secret,
                safeDecryptSecret(topCreds.webhook_secret),
                safeDecryptSecret(creds.webhook_secret),
                safeDecryptSecret(creds.client_secret),
                safeDecryptSecret(creds.partner_key),
              ].filter((s): s is string => typeof s === "string" && s.trim().length > 0);
              candidateSecrets.push(...foundSecrets);
            }
          }

          const { data: masterStore } = await supabase
            .from("stores")
            .select("settings")
            .or("slug.eq.waesy-matriz,is_platform_root.eq.true")
            .limit(1)
            .maybeSingle();

          const masterInt = ((masterStore?.settings as any)?.integrations || {}) as Record<string, any>;
          if (platformParam === "mercadolivre" && masterInt.mercadolivre_client_secret) {
            candidateSecrets.push(safeDecryptSecret(masterInt.mercadolivre_client_secret));
          } else if (platformParam === "ifood" && masterInt.ifood_client_secret) {
            candidateSecrets.push(safeDecryptSecret(masterInt.ifood_client_secret));
          } else if (platformParam === "shopee" && masterInt.shopee_partner_key) {
            candidateSecrets.push(safeDecryptSecret(masterInt.shopee_partner_key));
          }

          const verification = verifyHmacSignature({
            platform: platformParam,
            rawText,
            requestUrl: request.url,
            dataIdForMl: meta.dataIdForMl,
            headers: request.headers,
            secrets: candidateSecrets,
          });

          if (!verification.isValid) {
            console.warn(`[marketplaces-webhook] Rejeição de segurança (${platformParam}): ${verification.reason}`);
            return new Response(
              JSON.stringify({ status: "unauthorized", error: verification.reason || "HMAC signature mismatch" }),
              {
                status: verification.missingSecret ? 503 : 401,
                headers: { "Content-Type": "application/json" },
              }
            );
          }

          // iFood webhooks podem enviar lote em array de eventos no mesmo POST
          if (platformParam === "ifood" && Array.isArray(rawBody)) {
            const batchResults = [];
            for (const item of rawBody) {
              const res = await handleInboundWebhook({
                platform: "ifood",
                eventId: item?.id ? String(item.id) : undefined,
                topic: item?.fullCode || item?.code || undefined,
                resourceId: item?.orderId ? String(item.orderId) : undefined,
                storeId: storeIdParam,
                payload: item || {},
              });
              batchResults.push(res);
            }
            return new Response(JSON.stringify({ status: "processed", count: batchResults.length, results: batchResults }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          const webhookData: InboundWebhookPayload = {
            platform: platformParam as any,
            eventId: meta.eventId,
            topic: meta.topic,
            resourceId: meta.resourceId,
            storeId: storeIdParam,
            payload: rawBody,
          };

          const result = await handleInboundWebhook(webhookData);

          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          console.error("[marketplaces-webhook] Erro no processamento:", e);
          return new Response(
            JSON.stringify({ status: "failed", error: e?.message || "Internal Server Error" }),
            {
              status: 500,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
      },
      GET: async () => {
        return new Response(
          JSON.stringify({
            service: "Waesy Marketplace & ERP Webhook Receiver",
            status: "active",
            supportedPlatforms: [
              "mercadolivre",
              "ifood",
              "shopee",
              "magalu",
              "bling",
              "tiny",
              "focus_nfe",
              "nuvem_fiscal",
              "amazon",
              "melhorenvio",
              "correios",
            ],
            hmacValidation: "enabled",
            replayProtection: "300s_window",
            timestamp: new Date().toISOString(),
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      },
    },
  },
} as never);
