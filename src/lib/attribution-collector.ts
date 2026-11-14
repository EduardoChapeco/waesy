/**
 * attribution-collector.ts — Coletor Canônico de Telemetria de Atribuição e Dispositivo
 * 
 * Captura determinística de:
 * 1. Cookies Meta Pixel (_fbp, _fbc)
 * 2. Google Ads Click ID (gclid) e Client ID
 * 3. Identificador de Dispositivo Persistente (waesy_device_code)
 * 4. Parâmetros UTM de campanha (utm_source, utm_medium, utm_campaign, utm_term, utm_content)
 * 5. Identidade do usuário logado (profileId)
 */

import { getPersistentDeviceCode } from "@/lib/security-sentinel";

export interface ClientAttributionSnapshot {
  deviceId: string;
  fbp?: string;
  fbc?: string;
  fbclid?: string;
  gclid?: string;
  ttclid?: string;
  ctwaClid?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  adId?: string;
  adsetId?: string;
  campaignId?: string;
  creativeId?: string;
  formId?: string;
  placement?: string;
  adPlatform?: string;
  landingUrl?: string;
  referrer?: string;
  userAgent?: string;
  firstTouch?: {
    source: string;
    campaign?: string;
    medium?: string;
    adId?: string;
    campaignId?: string;
    firstSeenAt: string;
  };
}

/**
 * Lê cookie específico do navegador
 */
function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
  return match ? decodeURIComponent(match[3]) : undefined;
}

function readStoredParam(key: string): string | undefined {
  try {
    return sessionStorage.getItem(key) || localStorage.getItem(key) || undefined;
  } catch {
    return undefined;
  }
}

function persistParam(key: string, value: string | undefined): string | undefined {
  if (value && value.trim()) {
    const clean = value.trim();
    try {
      sessionStorage.setItem(key, clean);
      localStorage.setItem(key, clean);
    } catch {}
    return clean;
  }
  return readStoredParam(key);
}

export function inferAdPlatform(input: {
  ctwaClid?: string;
  fbclid?: string;
  fbc?: string;
  gclid?: string;
  ttclid?: string;
  utmSource?: string;
  adId?: string;
}): string | undefined {
  if (input.ctwaClid) return "whatsapp_ctwa";
  const src = String(input.utmSource || "").toLowerCase();
  if (input.fbclid || input.fbc || /meta|facebook|instagram|fb|ig|reels/.test(src)) return "meta_ads";
  if (input.gclid || /google|gads|adwords|youtube/.test(src)) return "google_ads";
  if (input.ttclid || /tiktok/.test(src)) return "tiktok_ads";
  if (input.adId) return "ads";
  if (src) return src;
  return undefined;
}

/**
 * Coleta instantânea e persistente de dados de atribuição no navegador
 */
export function collectClientAttribution(): ClientAttributionSnapshot {
  if (typeof window === "undefined") {
    return {
      deviceId: "srv_unknown",
    };
  }

  // 1. Identificador Persistente do Dispositivo
  const deviceId = getPersistentDeviceCode();

  // 2. Meta Pixel Cookies & Click ID
  const fbp = getCookie("_fbp") || readStoredParam("waesy_fbp");
  if (fbp) persistParam("waesy_fbp", fbp);
  let fbc = getCookie("_fbc") || readStoredParam("waesy_fbc");

  const urlParams = new URLSearchParams(window.location.search);
  const fbclid = persistParam("waesy_fbclid", urlParams.get("fbclid") || undefined);
  if (!fbc && fbclid) {
    fbc = `fb.1.${Date.now()}.${fbclid}`;
    try {
      document.cookie = `_fbc=${fbc}; path=/; max-age=7776000; SameSite=Lax`;
    } catch {}
  }
  if (fbc) persistParam("waesy_fbc", fbc);

  // 3. Google / TikTok / Click-to-WhatsApp Click IDs
  const gclid = persistParam("waesy_gclid", urlParams.get("gclid") || urlParams.get("wbraid") || urlParams.get("gbraid") || undefined);
  const ttclid = persistParam("waesy_ttclid", urlParams.get("ttclid") || undefined);
  const ctwaClid = persistParam("waesy_ctwa_clid", urlParams.get("ctwa_clid") || undefined);

  // 4. Parâmetros UTM & IDs de Anúncio / Campanha / Conjunto / Criativo
  const utmSource = persistParam("waesy_utm_source", urlParams.get("utm_source") || undefined);
  const utmMedium = persistParam("waesy_utm_medium", urlParams.get("utm_medium") || undefined);
  const utmCampaign = persistParam("waesy_utm_campaign", urlParams.get("utm_campaign") || undefined);
  const utmTerm = persistParam("waesy_utm_term", urlParams.get("utm_term") || undefined);
  const utmContent = persistParam("waesy_utm_content", urlParams.get("utm_content") || undefined);

  const adId = persistParam(
    "waesy_ad_id",
    urlParams.get("ad_id") || urlParams.get("meta_ad_id") || urlParams.get("hsa_ad") || urlParams.get("utm_id") || undefined,
  );
  const adsetId = persistParam(
    "waesy_adset_id",
    urlParams.get("adset_id") || urlParams.get("meta_adset_id") || urlParams.get("hsa_grp") || undefined,
  );
  const campaignId = persistParam(
    "waesy_campaign_id",
    urlParams.get("campaign_id") || urlParams.get("meta_campaign_id") || urlParams.get("hsa_cam") || undefined,
  );
  const creativeId = persistParam("waesy_creative_id", urlParams.get("creative_id") || undefined);
  const formId = persistParam("waesy_form_id", urlParams.get("form_id") || urlParams.get("meta_form_id") || undefined);
  const placement = persistParam("waesy_placement", urlParams.get("placement") || undefined);

  const landingUrl = persistParam("waesy_landing_url", window.location.href) || window.location.href;
  const referrer = persistParam("waesy_referrer", document.referrer || undefined);

  const adPlatform = inferAdPlatform({ ctwaClid, fbclid, fbc, gclid, ttclid, utmSource, adId });

  // 5. First-Touch Attribution Persistence (Resolução contínua entre sessões)
  let firstTouch: ClientAttributionSnapshot["firstTouch"] = undefined;
  try {
    const rawFt = localStorage.getItem("waesy_first_touch");
    if (rawFt) {
      firstTouch = JSON.parse(rawFt);
    } else if (utmSource || utmCampaign || fbclid || gclid || ttclid || ctwaClid || adId) {
      firstTouch = {
        source: adPlatform || utmSource || "direct",
        campaign: utmCampaign,
        medium: utmMedium,
        adId,
        campaignId,
        firstSeenAt: new Date().toISOString(),
      };
      localStorage.setItem("waesy_first_touch", JSON.stringify(firstTouch));
    }
  } catch {}

  return {
    deviceId,
    fbp,
    fbc,
    fbclid,
    gclid,
    ttclid,
    ctwaClid,
    utmSource,
    utmMedium,
    utmCampaign,
    utmTerm,
    utmContent,
    adId,
    adsetId,
    campaignId,
    creativeId,
    formId,
    placement,
    adPlatform,
    landingUrl,
    referrer,
    userAgent: navigator.userAgent,
    firstTouch,
  };
}

export function buildAttributionCustomFields(attr: ClientAttributionSnapshot): Record<string, string> {
  const out: Record<string, string> = {};
  if (attr.deviceId) out.device_id = attr.deviceId;
  if (attr.fbp) out.fbp = attr.fbp;
  if (attr.fbc) out.fbc = attr.fbc;
  if (attr.fbclid) out.fbclid = attr.fbclid;
  if (attr.gclid) out.gclid = attr.gclid;
  if (attr.ttclid) out.ttclid = attr.ttclid;
  if (attr.ctwaClid) out.ctwa_clid = attr.ctwaClid;
  if (attr.utmSource) out.utm_source = attr.utmSource;
  if (attr.utmMedium) out.utm_medium = attr.utmMedium;
  if (attr.utmCampaign) out.utm_campaign = attr.utmCampaign;
  if (attr.utmTerm) out.utm_term = attr.utmTerm;
  if (attr.utmContent) out.utm_content = attr.utmContent;
  if (attr.adId) out.meta_ad_id = attr.adId;
  if (attr.adsetId) out.meta_adset_id = attr.adsetId;
  if (attr.campaignId) out.campaign_id = attr.campaignId;
  if (attr.creativeId) out.creative_id = attr.creativeId;
  if (attr.formId) out.meta_form_id = attr.formId;
  if (attr.placement) out.placement = attr.placement;
  if (attr.adPlatform) out.ad_platform = attr.adPlatform;
  if (attr.landingUrl) out.landing_url = attr.landingUrl;
  return out;
}
