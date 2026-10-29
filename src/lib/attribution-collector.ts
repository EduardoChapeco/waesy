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
  gclid?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  landingUrl?: string;
  referrer?: string;
  userAgent?: string;
  firstTouch?: {
    source: string;
    campaign?: string;
    medium?: string;
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

/**
 * Coleta instantânea de dados de atribuição no navegador
 */
export function collectClientAttribution(): ClientAttributionSnapshot {
  if (typeof window === "undefined") {
    return {
      deviceId: "srv_unknown",
    };
  }

  // 1. Identificador Persistente do Dispositivo
  const deviceId = getPersistentDeviceCode();

  // 2. Meta Pixel Cookies
  const fbp = getCookie("_fbp");
  let fbc = getCookie("_fbc");

  // Se não houver cookie _fbc mas houver fbclid na URL, compõe o formato canônico fb.1.<timestamp>.<fbclid>
  const urlParams = new URLSearchParams(window.location.search);
  const fbclid = urlParams.get("fbclid");
  if (!fbc && fbclid) {
    fbc = `fb.1.${Date.now()}.${fbclid}`;
    try {
      document.cookie = `_fbc=${fbc}; path=/; max-age=7776000; SameSite=Lax`;
    } catch {
      // Ignora erro de cookie
    }
  }

  // 3. Google Ads Click ID (gclid)
  let gclid = urlParams.get("gclid") || undefined;
  if (gclid) {
    try {
      sessionStorage.setItem("waesy_gclid", gclid);
    } catch {}
  } else {
    try {
      gclid = sessionStorage.getItem("waesy_gclid") || undefined;
    } catch {}
  }

  // 4. Parâmetros UTM
  const utmSource = urlParams.get("utm_source") || undefined;
  const utmMedium = urlParams.get("utm_medium") || undefined;
  const utmCampaign = urlParams.get("utm_campaign") || undefined;
  const utmTerm = urlParams.get("utm_term") || undefined;
  const utmContent = urlParams.get("utm_content") || undefined;

  // Persiste UTMs na sessão para não perder em navegações internas
  if (utmSource || utmCampaign) {
    try {
      sessionStorage.setItem("waesy_utm_source", utmSource || "");
      sessionStorage.setItem("waesy_utm_campaign", utmCampaign || "");
      sessionStorage.setItem("waesy_utm_medium", utmMedium || "");
    } catch {}
  }

  // 5. First-Touch Attribution Persistence (Resolução contínua entre sessões)
  let firstTouch: any = undefined;
  try {
    const rawFt = localStorage.getItem("waesy_first_touch");
    if (rawFt) {
      firstTouch = JSON.parse(rawFt);
    } else if (utmSource || utmCampaign || fbclid || gclid) {
      firstTouch = {
        source: utmSource || (fbclid ? "meta_ads" : (gclid ? "google_ads" : "direct")),
        campaign: utmCampaign,
        medium: utmMedium,
        firstSeenAt: new Date().toISOString(),
      };
      localStorage.setItem("waesy_first_touch", JSON.stringify(firstTouch));
    }
  } catch {}

  return {
    deviceId,
    fbp,
    fbc,
    gclid,
    utmSource: utmSource || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("waesy_utm_source") || undefined : undefined),
    utmMedium: utmMedium || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("waesy_utm_medium") || undefined : undefined),
    utmCampaign: utmCampaign || (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("waesy_utm_campaign") || undefined : undefined),
    utmTerm,
    utmContent,
    landingUrl: window.location.href,
    referrer: document.referrer || undefined,
    userAgent: navigator.userAgent,
    firstTouch,
  };
}
