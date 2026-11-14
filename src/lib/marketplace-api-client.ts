import { createHmac, timingSafeEqual } from "node:crypto";
import { fetchWithExponentialBackoff } from "@/lib/resilient-api-client";

export interface OAuthStatePayload {
  storeId: string;
  platform: string;
  returnPath?: string;
}

export interface TokenExchangeResult {
  accessToken: string;
  refreshToken?: string | null;
  expiresInSeconds?: number | null;
  tokenExpiresAt?: string | null;
  scope?: string | null;
  externalAccountId?: string | null;
  accountNickname?: string | null;
  raw?: Record<string, any>;
}

/**
 * Constant-time string comparison safe against mismatched lengths.
 */
export function safeCompareHexOrString(actual: string, expected: string): boolean {
  const a = Buffer.from((actual || "").trim().toLowerCase(), "utf8");
  const b = Buffer.from((expected || "").trim().toLowerCase(), "utf8");
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Codifica payload de estado OAuth 2.0 em base64url seguro.
 */
export function encodeMarketplaceOAuthState(payload: OAuthStatePayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

/**
 * Decodifica o parâmetro `state` aceitando base64url JSON, JSON bruto ou formato legado `storeId:platform`.
 */
export function decodeMarketplaceOAuthState(stateRaw: string | null | undefined): OAuthStatePayload | null {
  const raw = (stateRaw || "").trim();
  if (!raw) return null;

  // 1. Formato base64url JSON
  try {
    const decoded = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed.storeId === "string" && typeof parsed.platform === "string") {
      return {
        storeId: parsed.storeId,
        platform: parsed.platform,
        returnPath: typeof parsed.returnPath === "string" ? parsed.returnPath : undefined,
      };
    }
  } catch {
    // continua para formatos alternativos
  }

  // 2. JSON direto
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.storeId === "string" && typeof parsed.platform === "string") {
        return {
          storeId: parsed.storeId,
          platform: parsed.platform,
          returnPath: typeof parsed.returnPath === "string" ? parsed.returnPath : undefined,
        };
      }
    } catch {
      // fallback abaixo
    }
  }

  // 3. Legado storeId:platform[:returnPath]
  if (raw.includes(":")) {
    const [storeId, platform, ...rest] = raw.split(":");
    if (storeId && platform) {
      return {
        storeId: storeId.trim(),
        platform: platform.trim(),
        returnPath: rest.length > 0 ? rest.join(":") : undefined,
      };
    }
  }

  return null;
}

/**
 * Assinatura oficial Shopee Open Platform v2 (HMAC-SHA256 hex em partner_id + api_path + ts [+ token + shop_id]).
 */
export function generateShopeeSign(params: {
  partnerId: string | number;
  partnerKey: string;
  apiPath: string;
  timestamp: number;
  accessToken?: string;
  shopId?: string | number;
}): string {
  const partnerId = String(params.partnerId).trim();
  const timestamp = String(params.timestamp);
  const apiPath = params.apiPath.startsWith("/") ? params.apiPath : `/${params.apiPath}`;

  let baseString = `${partnerId}${apiPath}${timestamp}`;
  if (params.accessToken && params.shopId !== undefined && params.shopId !== null && String(params.shopId).trim() !== "") {
    baseString += `${params.accessToken}${String(params.shopId).trim()}`;
  }

  return createHmac("sha256", params.partnerKey.trim()).update(baseString).digest("hex");
}

/**
 * Verificação de assinatura Webhook do Mercado Livre (`x-signature: ts=...,v1=...`).
 * Manifesto oficial: `id:[data.id_url];request-id:[x-request-id];ts:[ts];`
 */
export function verifyMercadoLivreWebhookSignature(params: {
  xSignatureHeader: string | null | undefined;
  xRequestId: string | null | undefined;
  dataId: string | null | undefined;
  secret: string;
  maxAgeSeconds?: number;
}): { valid: boolean; reason?: string } {
  const header = (params.xSignatureHeader || "").trim();
  if (!header) return { valid: false, reason: "Cabeçalho x-signature ausente." };

  let ts = "";
  let v1 = "";
  for (const part of header.split(",")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (key === "ts") ts = val;
    if (key === "v1") v1 = val;
  }

  if (!ts || !v1) {
    return { valid: false, reason: "Formato x-signature inválido (ts/v1 ausentes)." };
  }

  // Checagem opcional de idade quando timestamp numérico é fornecido
  if (params.maxAgeSeconds && /^\d+$/.test(ts)) {
    const rawTs = Number(ts);
    const tsSeconds = rawTs > 1e12 ? Math.floor(rawTs / 1000) : rawTs;
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - tsSeconds) > params.maxAgeSeconds) {
      return { valid: false, reason: "Assinatura x-signature expirada fora da janela de tolerância." };
    }
  }

  const reqId = (params.xRequestId || "").trim();
  const rawDataId = (params.dataId || "").trim();
  const candidates = rawDataId ? Array.from(new Set([rawDataId.toLowerCase(), rawDataId])) : [""];

  for (const idCandidate of candidates) {
    const segments: string[] = [];
    if (idCandidate) segments.push(`id:${idCandidate}`);
    if (reqId) segments.push(`request-id:${reqId}`);
    segments.push(`ts:${ts}`);
    const manifest = `${segments.join(";")};`;

    const expected = createHmac("sha256", params.secret.trim()).update(manifest).digest("hex");
    if (safeCompareHexOrString(v1, expected)) {
      return { valid: true };
    }
  }

  return { valid: false, reason: "Assinatura HMAC Mercado Livre inválida." };
}

/**
 * Verificação de assinatura Webhook Shopee Push Mechanism (`Authorization: HMAC-SHA256(url|body)`).
 */
export function verifyShopeeWebhookSignature(params: {
  authorizationHeader: string | null | undefined;
  callbackUrl: string;
  rawBody: string;
  partnerKey: string;
}): { valid: boolean; reason?: string } {
  const header = (params.authorizationHeader || "").replace(/^Bearer\s+/i, "").trim();
  if (!header) return { valid: false, reason: "Cabeçalho Authorization Shopee ausente." };

  const urlVariants = new Set<string>([params.callbackUrl]);
  try {
    const u = new URL(params.callbackUrl);
    urlVariants.add(`https://${u.host}${u.pathname}${u.search}`);
    urlVariants.add(`https://${u.host}${u.pathname}`);
    urlVariants.add(`${u.origin}${u.pathname}`);
  } catch {
    // mantém callbackUrl bruto
  }

  for (const candidateUrl of urlVariants) {
    const baseString = `${candidateUrl}|${params.rawBody}`;
    const expected = createHmac("sha256", params.partnerKey.trim()).update(baseString).digest("hex");
    if (safeCompareHexOrString(header, expected)) {
      return { valid: true };
    }
  }

  return { valid: false, reason: "Assinatura HMAC Shopee inválida." };
}

/**
 * Verificação Webhook Bling v3 (`X-Bling-Signature-256: sha256=<hex>`).
 */
export function verifyBlingWebhookSignature(params: {
  signatureHeader: string | null | undefined;
  rawBody: string;
  clientSecret: string;
}): { valid: boolean; reason?: string } {
  const sig = (params.signatureHeader || "").trim();
  if (!sig) return { valid: false, reason: "Cabeçalho X-Bling-Signature-256 ausente." };

  const hex = createHmac("sha256", params.clientSecret.trim()).update(params.rawBody).digest("hex");
  const normalized = sig.startsWith("sha256=") ? sig : `sha256=${sig}`;
  return safeCompareHexOrString(normalized, `sha256=${hex}`)
    ? { valid: true }
    : { valid: false, reason: "Assinatura HMAC Bling v3 inválida." };
}

/**
 * Verificação Webhook iFood (`X-IFood-Signature: <hex>`).
 */
export function verifyIfoodWebhookSignature(params: {
  signatureHeader: string | null | undefined;
  rawBody: string;
  clientSecret: string;
}): { valid: boolean; reason?: string } {
  const sig = (params.signatureHeader || "").replace(/^sha256=/i, "").trim();
  if (!sig) return { valid: false, reason: "Cabeçalho X-IFood-Signature ausente." };

  const hex = createHmac("sha256", params.clientSecret.trim()).update(params.rawBody).digest("hex");
  return safeCompareHexOrString(sig, hex)
    ? { valid: true }
    : { valid: false, reason: "Assinatura HMAC iFood inválida." };
}

/**
 * Constrói URL oficial de autorização OAuth 2.0 apontando para `/api/auth/marketplace/callback`.
 */
export function buildMarketplaceOAuthAuthorizeUrl(params: {
  platform: string;
  appUrl: string;
  storeId: string;
  clientId?: string;
  partnerKey?: string;
  returnPath?: string;
}): { configured: boolean; authUrl: string | null; redirectUri: string; message: string } {
  const baseUrl = params.appUrl.replace(/\/$/, "");
  const redirectUri = `${baseUrl}/api/auth/marketplace/callback`;
  const state = encodeMarketplaceOAuthState({
    storeId: params.storeId,
    platform: params.platform,
    returnPath: params.returnPath || "/workspace/integracoes/marketplaces",
  });
  const clientId = (params.clientId || "").trim();

  if (params.platform === "mercadolivre") {
    if (!clientId) {
      return {
        configured: false,
        authUrl: null,
        redirectUri,
        message: "Informe o App ID (Client ID) do Mercado Livre ou configure as chaves Master no Admin.",
      };
    }
    const url = new URL("https://auth.mercadolivre.com.br/authorization");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return { configured: true, authUrl: url.toString(), redirectUri, message: "Redirecionando para o Mercado Livre..." };
  }

  if (params.platform === "bling") {
    if (!clientId) {
      return {
        configured: false,
        authUrl: null,
        redirectUri,
        message: "Informe o Client ID do Bling v3 para autorizar via OAuth 2.0.",
      };
    }
    const url = new URL("https://www.bling.com.br/Api/v3/oauth/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return { configured: true, authUrl: url.toString(), redirectUri, message: "Redirecionando para o Bling ERP v3..." };
  }

  if (params.platform === "shopee") {
    const partnerKey = (params.partnerKey || "").trim();
    if (!clientId || !partnerKey) {
      return {
        configured: false,
        authUrl: null,
        redirectUri,
        message: "Informe o Partner ID e a Partner Key da Shopee Open Platform v2.",
      };
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const apiPath = "/api/v2/shop/auth_partner";
    const sign = generateShopeeSign({
      partnerId: clientId,
      partnerKey,
      apiPath,
      timestamp,
    });
    const callbackWithState = `${redirectUri}?platform=shopee&state=${encodeURIComponent(state)}`;
    const url = new URL(`https://partner.shopeemobile.com${apiPath}`);
    url.searchParams.set("partner_id", clientId);
    url.searchParams.set("timestamp", String(timestamp));
    url.searchParams.set("sign", sign);
    url.searchParams.set("redirect", callbackWithState);
    return { configured: true, authUrl: url.toString(), redirectUri, message: "Redirecionando para a Shopee..." };
  }

  if (params.platform === "magalu") {
    if (!clientId) {
      return {
        configured: false,
        authUrl: null,
        redirectUri,
        message: "Informe o Client ID do Magalu / IntegraCommerce para autorizar via OAuth 2.0.",
      };
    }
    const url = new URL("https://id.magalu.com/login");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return { configured: true, authUrl: url.toString(), redirectUri, message: "Redirecionando para o Magalu..." };
  }

  if (params.platform === "ifood") {
    if (!clientId) {
      return {
        configured: false,
        authUrl: null,
        redirectUri,
        message: "Informe o Client ID e Client Secret do iFood Merchant para autenticar.",
      };
    }
    // iFood aplicativo centralizado usa /authentication/v1.0/oauth/authorize ou client_credentials para software distribuído
    const url = new URL("https://merchant-api.ifood.com.br/authentication/v1.0/oauth/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    return { configured: true, authUrl: url.toString(), redirectUri, message: "Redirecionando para o Portal do Parceiro iFood..." };
  }

  return {
    configured: false,
    authUrl: null,
    redirectUri,
    message: `Configure as chaves de API do canal ${params.platform.toUpperCase()} diretamente no formulário.`,
  };
}

/**
 * Troca authorization code por Access Token + Refresh Token segundo a API oficial da plataforma.
 */
export async function exchangeMarketplaceOAuthCode(params: {
  platform: string;
  code: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  shopId?: string;
  fetchImpl?: typeof fetch;
}): Promise<TokenExchangeResult> {
  const doFetch = params.fetchImpl || fetch;
  const nowSec = Math.floor(Date.now() / 1000);

  if (params.platform === "mercadolivre") {
    const res = await doFetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: params.clientId,
        client_secret: params.clientSecret,
        code: params.code,
        redirect_uri: params.redirectUri,
      }),
      signal: AbortSignal.timeout(12000),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (!res.ok || !body.access_token) {
      throw new Error(body.message || body.error_description || `Mercado Livre OAuth HTTP ${res.status}`);
    }

    let nickname: string | null = null;
    try {
      const meRes = await doFetch("https://api.mercadolibre.com/users/me", {
        headers: { Authorization: `Bearer ${body.access_token}` },
        signal: AbortSignal.timeout(8000),
      });
      if (meRes.ok) {
        const me = (await meRes.json().catch(() => ({}))) as Record<string, any>;
        nickname = me.nickname || null;
      }
    } catch {
      // opcional
    }

    const expiresIn = Number(body.expires_in) || 21600;
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token || null,
      expiresInSeconds: expiresIn,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      scope: body.scope || null,
      externalAccountId: body.user_id ? String(body.user_id) : null,
      accountNickname: nickname,
      raw: body,
    };
  }

  if (params.platform === "bling") {
    const basic = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString("base64");
    const res = await doFetch("https://api.bling.com.br/Api/v3/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: params.code,
      }),
      signal: AbortSignal.timeout(12000),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (!res.ok || !body.access_token) {
      throw new Error(body.error?.message || body.error_description || `Bling v3 OAuth HTTP ${res.status}`);
    }

    let companyId: string | null = null;
    let companyName: string | null = null;
    try {
      const empRes = await doFetch("https://api.bling.com.br/Api/v3/empresas/me/dados-basicos", {
        headers: { Authorization: `Bearer ${body.access_token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (empRes.ok) {
        const emp = (await empRes.json().catch(() => ({}))) as Record<string, any>;
        const d = emp.data || {};
        companyId = d.id ? String(d.id) : d.cnpj || null;
        companyName = d.nome || d.razaoSocial || null;
      }
    } catch {
      // opcional
    }

    const expiresIn = Number(body.expires_in) || 21600;
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token || null,
      expiresInSeconds: expiresIn,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      scope: body.scope || null,
      externalAccountId: companyId,
      accountNickname: companyName,
      raw: body,
    };
  }

  if (params.platform === "shopee") {
    const apiPath = "/api/v2/auth/token/get";
    const sign = generateShopeeSign({
      partnerId: params.clientId,
      partnerKey: params.clientSecret,
      apiPath,
      timestamp: nowSec,
    });
    const url = `https://partner.shopeemobile.com${apiPath}?partner_id=${encodeURIComponent(params.clientId)}&timestamp=${nowSec}&sign=${sign}`;
    const res = await doFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: params.code,
        shop_id: Number(params.shopId || 0),
        partner_id: Number(params.clientId),
      }),
      signal: AbortSignal.timeout(12000),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (!res.ok || body.error || !body.access_token) {
      throw new Error(body.message || body.error || `Shopee OAuth HTTP ${res.status}`);
    }
    const expiresIn = Number(body.expire_in) || 14400;
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token || null,
      expiresInSeconds: expiresIn,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      externalAccountId: params.shopId || (body.shop_id ? String(body.shop_id) : null),
      raw: body,
    };
  }

  if (params.platform === "magalu") {
    const res = await doFetch("https://id.magalu.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: params.clientId,
        client_secret: params.clientSecret,
        code: params.code,
        redirect_uri: params.redirectUri,
      }),
      signal: AbortSignal.timeout(12000),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (!res.ok || !body.access_token) {
      throw new Error(body.error_description || body.message || `Magalu OAuth HTTP ${res.status}`);
    }
    const expiresIn = Number(body.expires_in) || 7200;
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token || null,
      expiresInSeconds: expiresIn,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      scope: body.scope || null,
      raw: body,
    };
  }

  if (params.platform === "ifood") {
    const res = await doFetch("https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grantType: "authorization_code",
        clientId: params.clientId,
        clientSecret: params.clientSecret,
        authorizationCode: params.code,
      }),
      signal: AbortSignal.timeout(12000),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, any>;
    const token = body.accessToken || body.access_token;
    if (!res.ok || !token) {
      throw new Error(body.error?.message || `iFood OAuth HTTP ${res.status}`);
    }
    const expiresIn = Number(body.expiresIn || body.expires_in) || 10800;
    return {
      accessToken: token,
      refreshToken: body.refreshToken || body.refresh_token || null,
      expiresInSeconds: expiresIn,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      raw: body,
    };
  }

  throw new Error(`Troca OAuth 2.0 não suportada para a plataforma ${params.platform}.`);
}

/**
 * Renova Access Token expirado segundo a especificação oficial de cada API.
 */
export async function refreshMarketplaceAccessToken(params: {
  platform: string;
  clientId?: string | null;
  clientSecret?: string | null;
  refreshToken?: string | null;
  externalAccountId?: string | null;
  username?: string | null;
  accessCode?: string | null;
  cardNumber?: string | null;
  fetchImpl?: typeof fetch;
}): Promise<TokenExchangeResult | null> {
  const doFetch = params.fetchImpl || fetch;
  const nowSec = Math.floor(Date.now() / 1000);

  if (params.platform === "mercadolivre" && params.clientId && params.clientSecret && params.refreshToken) {
    const res = await doFetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: params.clientId,
        client_secret: params.clientSecret,
        refresh_token: params.refreshToken,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (!res.ok || !body.access_token) return null;
    const expiresIn = Number(body.expires_in) || 21600;
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token || params.refreshToken,
      expiresInSeconds: expiresIn,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      raw: body,
    };
  }

  if (params.platform === "bling" && params.clientId && params.clientSecret && params.refreshToken) {
    const basic = Buffer.from(`${params.clientId}:${params.clientSecret}`).toString("base64");
    const res = await doFetch("https://api.bling.com.br/Api/v3/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: params.refreshToken,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (!res.ok || !body.access_token) return null;
    const expiresIn = Number(body.expires_in) || 21600;
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token || params.refreshToken,
      expiresInSeconds: expiresIn,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      raw: body,
    };
  }

  if (params.platform === "shopee" && params.clientId && params.clientSecret && params.refreshToken && params.externalAccountId) {
    const apiPath = "/api/v2/auth/access_token/get";
    const sign = generateShopeeSign({
      partnerId: params.clientId,
      partnerKey: params.clientSecret,
      apiPath,
      timestamp: nowSec,
    });
    const url = `https://partner.shopeemobile.com${apiPath}?partner_id=${encodeURIComponent(params.clientId)}&timestamp=${nowSec}&sign=${sign}`;
    const res = await doFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refresh_token: params.refreshToken,
        partner_id: Number(params.clientId),
        shop_id: Number(params.externalAccountId),
      }),
      signal: AbortSignal.timeout(10000),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (!res.ok || body.error || !body.access_token) return null;
    const expiresIn = Number(body.expire_in) || 14400;
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token || params.refreshToken,
      expiresInSeconds: expiresIn,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      raw: body,
    };
  }

  if (params.platform === "ifood" && params.clientId && params.clientSecret) {
    const form = new URLSearchParams(
      params.refreshToken
        ? {
            grantType: "refresh_token",
            clientId: params.clientId,
            clientSecret: params.clientSecret,
            refreshToken: params.refreshToken,
          }
        : {
            grantType: "client_credentials",
            clientId: params.clientId,
            clientSecret: params.clientSecret,
          }
    );
    const res = await doFetch("https://merchant-api.ifood.com.br/authentication/v1.0/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      signal: AbortSignal.timeout(10000),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, any>;
    const token = body.accessToken || body.access_token;
    if (!res.ok || !token) return null;
    const expiresIn = Number(body.expiresIn || body.expires_in) || 10800;
    return {
      accessToken: token,
      refreshToken: body.refreshToken || body.refresh_token || params.refreshToken || null,
      expiresInSeconds: expiresIn,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      raw: body,
    };
  }

  if (params.platform === "amazon" && params.clientId && params.clientSecret && params.refreshToken) {
    const res = await doFetch("https://api.amazon.com/auth/o2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: params.refreshToken,
        client_id: params.clientId,
        client_secret: params.clientSecret,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (!res.ok || !body.access_token) return null;
    const expiresIn = Number(body.expires_in) || 3600;
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token || params.refreshToken,
      expiresInSeconds: expiresIn,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      raw: body,
    };
  }

  if (params.platform === "magalu" && params.clientId && params.clientSecret && params.refreshToken) {
    const res = await doFetch("https://id.magalu.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: params.clientId,
        client_secret: params.clientSecret,
        refresh_token: params.refreshToken,
      }),
      signal: AbortSignal.timeout(10000),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (!res.ok || !body.access_token) return null;
    const expiresIn = Number(body.expires_in) || 7200;
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token || params.refreshToken,
      expiresInSeconds: expiresIn,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      raw: body,
    };
  }

  if (params.platform === "correios" && params.username && params.accessCode && params.cardNumber) {
    const basic = Buffer.from(`${params.username}:${params.accessCode}`).toString("base64");
    const res = await doFetch("https://api.correios.com.br/token/v1/autentica/cartaopostagem", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ numero: params.cardNumber.trim() }),
      signal: AbortSignal.timeout(10000),
    });
    const body = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (!res.ok || !body.token) return null;
    return {
      accessToken: body.token,
      refreshToken: null,
      tokenExpiresAt: body.expiraEm ? new Date(body.expiraEm).toISOString() : new Date(Date.now() + 82800 * 1000).toISOString(),
      raw: body,
    };
  }

  return null;
}

/**
 * Confirma recebimento de eventos no polling / webhook iFood (OBRIGATÓRIO após persistência).
 */
export async function acknowledgeIfoodEvents(
  accessToken: string,
  eventIds: string[],
  fetchImpl?: typeof fetch
): Promise<boolean> {
  const uniqueIds = Array.from(new Set(eventIds.map((id) => String(id).trim()).filter(Boolean)));
  if (!accessToken || uniqueIds.length === 0) return false;

  const doFetch = fetchImpl || fetch;
  try {
    const res = await doFetch("https://merchant-api.ifood.com.br/order/v1.0/events/acknowledgment", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(uniqueIds.map((id) => ({ id }))),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Propaga transição de ciclo de vida do pedido Waesy -> iFood Merchant API v1.0.
 */
export async function pushIfoodOrderLifecycle(params: {
  accessToken: string;
  externalOrderId: string;
  targetStatus: string;
  cancellationReason?: string;
  cancellationCode?: string;
  fetchImpl?: typeof fetch;
}): Promise<{ ok: boolean; status: number; message: string }> {
  const orderId = encodeURIComponent(params.externalOrderId);
  const baseHeaders = {
    Authorization: `Bearer ${params.accessToken}`,
    "Content-Type": "application/json",
  };
  const st = (params.targetStatus || "").toLowerCase();

  let endpoint = "";
  let body: string | undefined;

  if (st === "paid" || st === "confirmed" || st === "confirm") {
    endpoint = `https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}/confirm`;
  } else if (st === "processing" || st === "preparing" || st === "kitchen_prep" || st === "startpreparation") {
    endpoint = `https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}/startPreparation`;
  } else if (st === "ready" || st === "ready_for_pickup" || st === "readytopickup") {
    endpoint = `https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}/readyToPickup`;
  } else if (st === "shipped" || st === "dispatched" || st === "dispatch") {
    endpoint = `https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}/dispatch`;
  } else if (st === "cancelled" || st === "canceled" || st === "requestcancellation") {
    endpoint = `https://merchant-api.ifood.com.br/order/v1.0/orders/${orderId}/requestCancellation`;
    body = JSON.stringify({
      reason: params.cancellationReason || "Cancelado pelo estabelecimento no Waesy",
      cancellationCode: params.cancellationCode || "501",
    });
  } else {
    return { ok: true, status: 204, message: `Status ${params.targetStatus} sem transição correspondente no iFood.` };
  }

  const doFetch = params.fetchImpl || fetch;
  if (params.fetchImpl) {
    const res = await doFetch(endpoint, { method: "POST", headers: baseHeaders, body, signal: AbortSignal.timeout(10000) });
    return {
      ok: res.ok,
      status: res.status,
      message: res.ok ? `iFood atualizado (${st})` : `iFood HTTP ${res.status}`,
    };
  }

  const res = await fetchWithExponentialBackoff(
    endpoint,
    { method: "POST", headers: baseHeaders, body },
    { maxRetries: 2, baseDelayMs: 400 }
  );
  return {
    ok: res.ok,
    status: res.status,
    message: res.ok ? `iFood atualizado (${st})` : `iFood HTTP ${res.status}`,
  };
}
