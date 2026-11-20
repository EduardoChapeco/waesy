import { createHash } from "node:crypto";
import { getServerClient } from "@/lib/supabase";
import { isSyntheticPlaceholderEmail } from "@/lib/contact-sanitize";
import { decryptSecret } from "@/lib/crypto-vault.server";
import { selectMatchedPixelsForContext } from "@/lib/pixel-routing";
import { resolveContactCaptureSuppression } from "@/lib/whatsapp-contact-suppression.server";
import {
  formatReadableCampaignDetail,
  resolveAndEnrichMetaAdMetadata,
} from "@/services/meta-ad-enrichment.server";

export type AttributionPayload = {
  platform?: string | null;
  source?: string | null;
  medium?: string | null;
  campaign?: string | null;
  campaign_name?: string | null;
  campaign_id?: string | null;
  ad_id?: string | null;
  ad_name?: string | null;
  adset_id?: string | null;
  adset_name?: string | null;
  creative_id?: string | null;
  form_id?: string | null;
  ad_effective_status?: string | null;
  ad_headline?: string | null;
  ad_body?: string | null;
  ad_media_url?: string | null;
  source_url?: string | null;
  landing_url?: string | null;
  referrer?: string | null;
  listing_id?: string | null;
  listing_origin?: string | null;
  listing_title?: string | null;
  ctwa_clid?: string | null;
  fbclid?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  ttclid?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  lead_code?: string | null;
  device_id?: string | null;
  captured_via?: string | null;
  detected_at?: string | null;
  source_pixel_id?: string | null;
};

type DbClient = ReturnType<typeof getServerClient>;

export function digitsOnly(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}

export function isGroupJidOrSyntheticPhone(jid: unknown, entityId?: unknown): boolean {
  const jidStr = String(jid || "").toLowerCase();
  const entStr = String(entityId || "").toLowerCase();
  if (jidStr.includes("@g.us") || entStr.includes("@g.us")) return true;
  if (jidStr.includes("@newsletter") || entStr.includes("@newsletter")) return true;
  const entDigits = digitsOnly(entityId);
  // WhatsApp group JIDs typically start with 120363 and have >= 15 digits (sometimes 10-11 before @g.us for older hyphenated groups)
  if (/^120363\d{10,}$/.test(entDigits)) return true;
  return false;
}

export function normalizePhoneE164(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw || raw.includes("@g.us") || raw.includes("@newsletter") || raw.includes("@lid")) {
    return null;
  }
  const cleanJid = raw.replace(/@.*$/, "");
  const digits = digitsOnly(cleanJid);
  if (digits.length < 8 || digits.length > 15) return null;
  if (/^120363\d{10,}$/.test(digits)) return null;
  if (digits.length === 10 || digits.length === 11) return `+55${digits}`;
  return `+${digits}`;
}

export function extractParticipantPhone(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw || raw.includes("@lid") || raw.includes("@g.us") || raw.includes("@newsletter")) return null;
  return normalizePhoneE164(raw);
}

export function formatPhoneDisplay(value: unknown): string {
  const e164 = normalizePhoneE164(value);
  if (!e164) return String(value || "").trim();
  const d = digitsOnly(e164);
  if (d.startsWith("55") && d.length === 13) {
    return `+55 (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9)}`;
  }
  if (d.startsWith("55") && d.length === 12) {
    return `+55 (${d.slice(2, 4)}) ${d.slice(4, 8)}-${d.slice(8)}`;
  }
  return e164;
}

/**
 * Gera variantes tolerantes para casar telefones BR (com/sem DDI 55 e com/sem 9o dígito)
 */
export function buildPhoneLookupCandidates(rawPhone: unknown): {
  e164: string | null;
  digits: string;
  suffix8: string | null;
  variants: string[];
} {
  const e164 = normalizePhoneE164(rawPhone);
  const digits = digitsOnly(e164 || rawPhone);
  if (digits.length < 8) {
    return { e164: null, digits: "", suffix8: null, variants: [] };
  }
  const set = new Set<string>([digits, `+${digits}`]);
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    const local = digits.slice(2);
    set.add(local);
    if (local.length === 11 && local[2] === "9") {
      const without9 = local.slice(0, 2) + local.slice(3);
      set.add(without9);
      set.add(`55${without9}`);
      set.add(`+55${without9}`);
    } else if (local.length === 10) {
      const with9 = local.slice(0, 2) + "9" + local.slice(2);
      set.add(with9);
      set.add(`55${with9}`);
      set.add(`+55${with9}`);
    }
  } else if (digits.length === 10 || digits.length === 11) {
    set.add(`55${digits}`);
    set.add(`+55${digits}`);
  }
  const suffix8 = digits.slice(-8);
  return {
    e164,
    digits,
    suffix8,
    variants: Array.from(set),
  };
}

function isSyntheticSelfName(val: string | null | undefined): boolean {
  if (!val) return true;
  const clean = val.trim().toLowerCase();
  return ["você", "voce", "you", "eu", "grupo whatsapp", "canal whatsapp"].includes(clean);
}

function firstCleanString(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim().length > 0) return v.trim();
  }
  return null;
}

export function extractWhatsAppGroupContext(body: Record<string, any>, item: Record<string, any>) {
  const key = (item.key || item.message?.key || {}) as Record<string, any>;
  const rawRemoteJid = firstCleanString(
    key.remoteJid,
    item.remoteJid,
    body?.data?.remoteJid,
    item.chatId,
  );
  const isGroup = Boolean(
    (rawRemoteJid && rawRemoteJid.endsWith("@g.us")) ||
      item.isGroup === true ||
      body?.data?.isGroup === true,
  );

  const groupSubject = isGroup
    ? firstCleanString(
        item.groupName,
        item.groupSubject,
        item.subject,
        item.chatName,
        item.groupMetadata?.subject,
        body?.data?.groupMetadata?.subject,
        body?.data?.groupName,
        body?.data?.groupSubject,
        body?.data?.subject,
        body?.data?.chatName,
      )
    : null;

  const senderJid = firstCleanString(
    key.participantAlt,
    key.senderPn,
    key.cleanedSenderPn,
    key.participant,
    item.participant,
    item.participantAlt,
    item.author,
    body?.data?.participant,
  );

  const senderPhone = isGroup
    ? extractParticipantPhone(key.senderPn) ||
      extractParticipantPhone(key.cleanedSenderPn) ||
      extractParticipantPhone(key.participantAlt) ||
      extractParticipantPhone(key.participant) ||
      extractParticipantPhone(item.participant) ||
      extractParticipantPhone(item.author)
    : null;

  const rawPushName = firstCleanString(item.pushName, item.senderName, body?.pushName);
  const senderName = rawPushName && !isSyntheticSelfName(rawPushName) ? rawPushName : null;

  return {
    isGroup,
    groupJid: isGroup ? rawRemoteJid : null,
    groupSubject,
    senderJid,
    senderPhone,
    senderName,
  };
}

export function extractWhatsAppReferralAndTokens(
  payload: Record<string, any> | null | undefined,
  text?: string | null,
): AttributionPayload | null {
  const item = payload || {};
  const rawMsg = (item.message || item.data?.message || {}) as Record<string, any>;
  const msg = (rawMsg.ephemeralMessage?.message || rawMsg.viewOnceMessage?.message || rawMsg.viewOnceMessageV2?.message || rawMsg) as Record<string, any>;
  const extAd =
    item.referral ||
    msg.referral ||
    rawMsg.referral ||
    item.contextInfo?.externalAdReply ||
    msg.extendedTextMessage?.contextInfo?.externalAdReply ||
    msg.imageMessage?.contextInfo?.externalAdReply ||
    msg.videoMessage?.contextInfo?.externalAdReply ||
    msg.audioMessage?.contextInfo?.externalAdReply ||
    msg.documentMessage?.contextInfo?.externalAdReply ||
    msg.buttonsResponseMessage?.contextInfo?.externalAdReply ||
    item.data?.contextInfo?.externalAdReply ||
    (item.ctwa_clid || item.ad_headline || item.ad_id
      ? {
          ctwa_clid: item.ctwa_clid,
          source_id: item.ad_id || item.source_id,
          source_type: item.source_type || "ad",
          source_url: item.source_url,
          headline: item.ad_headline,
          body: item.ad_body,
          image_url: item.ad_media_url,
        }
      : null);

  const result: AttributionPayload = {};
  let hasSignal = false;

  if (extAd && typeof extAd === "object") {
    const ctwaClid = firstCleanString(extAd.ctwa_clid, extAd.ctwaClid);
    const sourceId = firstCleanString(extAd.source_id, extAd.sourceId, extAd.ad_id, extAd.adId);
    const sourceType = firstCleanString(extAd.source_type, extAd.sourceType);
    const sourceUrl = firstCleanString(extAd.source_url, extAd.sourceUrl);
    const headline = firstCleanString(extAd.headline, extAd.title);
    const body = firstCleanString(extAd.body, extAd.description);
    const mediaUrl = firstCleanString(extAd.image_url, extAd.video_url, extAd.thumbnailUrl, extAd.thumbnail);

    if (ctwaClid || sourceId || sourceUrl || headline) {
      hasSignal = true;
      result.platform = ctwaClid || sourceType === "ad" ? "meta_ads" : sourceType || "whatsapp_ctwa";
      result.source = sourceType === "ad" || ctwaClid ? "meta_ads" : "whatsapp_ctwa";
      result.medium = "ctwa";
      result.ctwa_clid = ctwaClid;
      result.ad_id = sourceId;
      result.source_url = sourceUrl;
      result.ad_headline = headline;
      result.ad_body = body;
      result.ad_media_url = mediaUrl;
      result.captured_via = "whatsapp_ctwa_referral";
    }
  }

  const textStr = String(text || "").trim();
  if (textStr) {
    // Extrai código Waesy (ex: "Ref: #Waesy-W8F39" ou "#WAE-...")
    const refMatch = textStr.match(/Ref:\s*#?([A-Za-z0-9_-]{5,32})/i) || textStr.match(/#(Waesy-W[A-Z0-9]{4,12})/i);
    if (refMatch?.[1]) {
      hasSignal = true;
      result.lead_code = refMatch[1].trim();
      if (!result.captured_via) result.captured_via = "whatsapp_ref_code";
    }

    // Extrai URLs com UTMs / ad_id coladas no texto de entrada
    const urlMatch = textStr.match(/https?:\/\/[^\s]+/i);
    if (urlMatch?.[0]) {
      try {
        const parsed = new URL(urlMatch[0]);
        const qp = parsed.searchParams;
        const uSource = qp.get("utm_source");
        const uMedium = qp.get("utm_medium");
        const uCampaign = qp.get("utm_campaign");
        const uContent = qp.get("utm_content");
        const uTerm = qp.get("utm_term");
        const fbclid = qp.get("fbclid");
        const gclid = qp.get("gclid");
        const ttclid = qp.get("ttclid");
        const adId = qp.get("ad_id") || qp.get("meta_ad_id");
        const campaignId = qp.get("campaign_id") || qp.get("meta_campaign_id");
        if (uSource || uCampaign || fbclid || gclid || ttclid || adId || campaignId) {
          hasSignal = true;
          result.source_url = result.source_url || urlMatch[0];
          result.utm_source = result.utm_source || uSource;
          result.utm_medium = result.utm_medium || uMedium;
          result.utm_campaign = result.utm_campaign || uCampaign;
          result.utm_content = result.utm_content || uContent;
          result.utm_term = result.utm_term || uTerm;
          result.fbclid = result.fbclid || fbclid;
          result.gclid = result.gclid || gclid;
          result.ttclid = result.ttclid || ttclid;
          result.ad_id = result.ad_id || adId;
          result.campaign_id = result.campaign_id || campaignId;
          if (!result.captured_via) result.captured_via = "whatsapp_url_params";
        }
      } catch {
        // Ignora URL malformada no texto
      }
    }
  }

  if (!hasSignal) return null;
  if (!result.platform) {
    const src = String(result.utm_source || "").toLowerCase();
    if (result.ctwa_clid || result.fbclid || /meta|facebook|instagram|fb|ig/.test(src)) result.platform = "meta_ads";
    else if (result.gclid || /google|gads/.test(src)) result.platform = "google_ads";
    else if (result.ttclid || /tiktok/.test(src)) result.platform = "tiktok_ads";
  }
  result.detected_at = new Date().toISOString();
  return result;
}

export function cleanAttributionObject(raw: Record<string, any> | null | undefined): AttributionPayload {
  if (!raw || typeof raw !== "object") return {};
  const keys: Array<keyof AttributionPayload> = [
    "platform",
    "source",
    "medium",
    "campaign",
    "campaign_id",
    "campaign_name",
    "ad_id",
    "ad_name",
    "adset_id",
    "adset_name",
    "creative_id",
    "form_id",
    "source_pixel_id",
    "ad_effective_status",
    "ad_headline",
    "ad_body",
    "ad_media_url",
    "source_url",
    "landing_url",
    "referrer",
    "listing_id",
    "listing_origin",
    "listing_title",
    "ctwa_clid",
    "fbclid",
    "fbp",
    "fbc",
    "gclid",
    "gbraid",
    "wbraid",
    "ttclid",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
    "lead_code",
    "device_id",
    "captured_via",
    "detected_at",
  ];
  const out: AttributionPayload = {};
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === "string" && v.trim()) {
      out[k] = v.trim();
    }
  }
  return out;
}

export function mergeAttributionPayloads(
  base?: Record<string, any> | null,
  incoming?: Record<string, any> | null,
): AttributionPayload {
  const b = cleanAttributionObject(base);
  const inc = cleanAttributionObject(incoming);
  return {
    ...b,
    ...inc,
    // Preserva primeiro toque caso já exista quando o novo é mais genérico
    fbp: inc.fbp || b.fbp,
    fbc: inc.fbc || b.fbc,
    fbclid: inc.fbclid || b.fbclid,
    gclid: inc.gclid || b.gclid,
    gbraid: inc.gbraid || b.gbraid,
    wbraid: inc.wbraid || b.wbraid,
    ttclid: inc.ttclid || b.ttclid,
    ctwa_clid: inc.ctwa_clid || b.ctwa_clid,
    ad_id: inc.ad_id || b.ad_id,
    campaign_id: inc.campaign_id || b.campaign_id,
    campaign: inc.campaign || b.campaign,
    utm_source: inc.utm_source || b.utm_source,
    utm_medium: inc.utm_medium || b.utm_medium,
    utm_campaign: inc.utm_campaign || b.utm_campaign,
    utm_content: inc.utm_content || b.utm_content,
    utm_term: inc.utm_term || b.utm_term,
    listing_id: inc.listing_id || b.listing_id,
    listing_title: inc.listing_title || b.listing_title,
    form_id: inc.form_id || b.form_id,
    lead_code: inc.lead_code || b.lead_code,
    detected_at: b.detected_at || inc.detected_at || new Date().toISOString(),
  };
}

export async function recordAttributionTouchpoint(
  db: DbClient,
  input: {
    storeId?: string | null;
    deviceId?: string | null;
    visitorId?: string | null;
    profileId?: string | null;
    phone?: string | null;
    email?: string | null;
    leadCode?: string | null;
    ctwaClid?: string | null;
    fbclid?: string | null;
    fbp?: string | null;
    fbc?: string | null;
    gclid?: string | null;
    gbraid?: string | null;
    wbraid?: string | null;
    ttclid?: string | null;
    utmSource?: string | null;
    utmMedium?: string | null;
    utmCampaign?: string | null;
    utmContent?: string | null;
    utmTerm?: string | null;
    adPlatform?: string | null;
    adId?: string | null;
    adsetId?: string | null;
    campaignId?: string | null;
    creativeId?: string | null;
    formId?: string | null;
    adHeadline?: string | null;
    adBody?: string | null;
    adMediaUrl?: string | null;
    sourceUrl?: string | null;
    landingUrl?: string | null;
    referrer?: string | null;
    entityType?: string | null;
    entityId?: string | null;
    entityTitle?: string | null;
    capturedVia?: string;
    leadId?: string | null;
    customerId?: string | null;
    threadId?: string | null;
    ipAddress?: string | null;
    geoCity?: string | null;
    geoState?: string | null;
    geoCountry?: string | null;
    gpsLatitude?: number | null;
    gpsLongitude?: number | null;
    gpsSource?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<string | null> {
  try {
    const phoneInfo = buildPhoneLookupCandidates(input.phone);
    const hasSignal = Boolean(
      phoneInfo.digits ||
        input.leadCode ||
        input.ctwaClid ||
        input.fbclid ||
        input.fbc ||
        input.fbp ||
        input.gclid ||
        input.gbraid ||
        input.wbraid ||
        input.ttclid ||
        input.utmSource ||
        input.utmCampaign ||
        input.adId ||
        input.campaignId ||
        input.formId ||
        input.entityId,
    );
    if (!hasSignal) return null;

    const platform =
      input.adPlatform ||
      (input.ctwaClid
        ? "meta_ads"
        : input.fbclid || input.fbc
          ? "meta_ads"
          : input.gclid || input.gbraid || input.wbraid
            ? "google_ads"
            : input.ttclid
              ? "tiktok_ads"
              : input.utmSource || null);

    const baseRow: Record<string, unknown> = {
      store_id: input.storeId || null,
      device_id: input.deviceId || null,
      visitor_id: input.visitorId || null,
      profile_id: input.profileId || null,
      phone_e164: phoneInfo.e164,
      phone_digits: phoneInfo.digits || null,
      email: input.email ? input.email.trim().toLowerCase() : null,
      lead_code: input.leadCode || null,
      ctwa_clid: input.ctwaClid || null,
      fbclid: input.fbclid || null,
      fbp: input.fbp || null,
      fbc: input.fbc || null,
      gclid: input.gclid || input.gbraid || input.wbraid || null,
      ttclid: input.ttclid || null,
      utm_source: input.utmSource || null,
      utm_medium: input.utmMedium || null,
      utm_campaign: input.utmCampaign || null,
      utm_content: input.utmContent || null,
      utm_term: input.utmTerm || null,
      ad_platform: platform,
      ad_id: input.adId || null,
      adset_id: input.adsetId || null,
      campaign_id: input.campaignId || null,
      creative_id: input.creativeId || null,
      form_id: input.formId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.formId) ? input.formId : null,
      ...(input.formId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.formId)
        ? { external_form_id: input.formId }
        : {}),
      ad_headline: input.adHeadline || null,
      ad_body: input.adBody || null,
      ad_media_url: input.adMediaUrl || null,
      source_url: input.sourceUrl || null,
      landing_url: input.landingUrl || null,
      referrer: input.referrer || null,
      entity_type: input.entityType || null,
      entity_id: input.entityId || null,
      entity_title: input.entityTitle || null,
      captured_via: input.capturedVia || "web_visit",
      lead_id: input.leadId || null,
      customer_id: input.customerId || null,
      thread_id: input.threadId || null,
      metadata: {
        ...(input.metadata || {}),
        ...(input.gbraid ? { gbraid: input.gbraid } : {}),
        ...(input.wbraid ? { wbraid: input.wbraid } : {}),
        ...(input.ipAddress ? { ip_address: input.ipAddress } : {}),
        ...(input.geoCity ? { geo_city: input.geoCity } : {}),
        ...(input.geoState ? { geo_state: input.geoState } : {}),
        ...(input.geoCountry ? { geo_country: input.geoCountry } : {}),
        ...(typeof input.gpsLatitude === "number" ? { gps_latitude: input.gpsLatitude } : {}),
        ...(typeof input.gpsLongitude === "number" ? { gps_longitude: input.gpsLongitude } : {}),
        ...(input.gpsSource ? { gps_source: input.gpsSource } : {}),
      },
    };

    const fullRow = {
      ...baseRow,
      ...(input.gbraid ? { gbraid: input.gbraid } : {}),
      ...(input.wbraid ? { wbraid: input.wbraid } : {}),
      ...(input.ipAddress ? { ip_address: input.ipAddress } : {}),
      ...(input.geoCity ? { geo_city: input.geoCity } : {}),
      ...(input.geoState ? { geo_state: input.geoState } : {}),
      ...(input.geoCountry ? { geo_country: input.geoCountry } : {}),
      ...(typeof input.gpsLatitude === "number" ? { gps_latitude: input.gpsLatitude } : {}),
      ...(typeof input.gpsLongitude === "number" ? { gps_longitude: input.gpsLongitude } : {}),
      ...(input.gpsSource ? { gps_source: input.gpsSource } : {}),
    };

    let { data, error } = await (db.from("ad_attribution_touchpoints") as any)
      .insert(fullRow)
      .select("id")
      .maybeSingle();

    if (error && /column|does not exist|schema/i.test(error.message || "")) {
      ({ data, error } = await (db.from("ad_attribution_touchpoints") as any)
        .insert(baseRow)
        .select("id")
        .maybeSingle());
    }

    if (error) return null;
    return data?.id ? String(data.id) : null;
  } catch {
    return null;
  }
}

function sha256(val: string): string {
  return createHash("sha256").update(val).digest("hex");
}

/**
 * Disparo server-side resiliente (sem exigir browser cookies) para Meta CAPI e registro em lead_conversion_telemetry.
 */
export async function dispatchServerSidePixelConversion(
  db: DbClient,
  input: {
    storeId: string;
    eventName:
      | "Lead"
      | "Contact"
      | "QualifiedLead"
      | "Purchase"
      | "PageView"
      | "ViewContent"
      | "InitiateCheckout"
      | "Search";
    eventId: string;
    eventSource?: string;
    leadId?: string | null;
    threadId?: string | null;
    phone?: string | null;
    email?: string | null;
    fullName?: string | null;
    fbp?: string | null;
    fbc?: string | null;
    ctwaClid?: string | null;
    gclid?: string | null;
    gbraid?: string | null;
    wbraid?: string | null;
    deviceId?: string | null;
    sourceUrl?: string | null;
    clientIpAddress?: string | null;
    clientUserAgent?: string | null;
    sourcePixelId?: string | null;
    campaignId?: string | null;
    adId?: string | null;
    formId?: string | null;
    customData?: Record<string, unknown>;
  },
): Promise<{ sent: boolean; reason?: string; matchedPixelsCount?: number }> {
  try {
    // 1. Idempotência estrita em lead_conversion_telemetry
    const { data: existingLog } = await db
      .from("lead_conversion_telemetry")
      .select("id, status")
      .eq("store_id", input.storeId)
      .eq("event_id", input.eventId)
      .maybeSingle();
    if (existingLog?.id) {
      return { sent: existingLog.status === "delivered", reason: "already_dispatched" };
    }

    const { data: pixelConfig } = await (db.from("store_pixel_configs") as any)
      .select("meta_pixel_id, meta_capi_token, meta_test_event_code, google_ads_id, google_ads_conversion_label, ga4_measurement_id, track_quotes, track_whatsapp_leads")
      .eq("store_id", input.storeId)
      .maybeSingle();

    if (input.eventName === "Lead" && pixelConfig?.track_quotes === false) {
      return { sent: false, reason: "lead_tracking_disabled" };
    }
    if (input.eventName === "Contact" && pixelConfig?.track_whatsapp_leads === false) {
      return { sent: false, reason: "whatsapp_tracking_disabled" };
    }

    // Resolve token legado/padrao do cofre (usado como fallback para multi-pixel ou pixel unico)
    let fallbackAccessToken = "";
    let fallbackTestEventCode = String(pixelConfig?.meta_test_event_code || "").trim();
    const { data: cred } = await db
      .from("integration_credentials")
      .select("secret_payload_encrypted, token_payload")
      .eq("store_id", input.storeId)
      .eq("provider", "meta_pixel")
      .eq("is_active", true)
      .maybeSingle();

    if (cred?.secret_payload_encrypted) {
      try {
        const parsed = JSON.parse(decryptSecret(cred.secret_payload_encrypted));
        if (typeof parsed?.access_token === "string") fallbackAccessToken = parsed.access_token.trim();
        if (typeof parsed?.test_event_code === "string" && parsed.test_event_code.trim()) {
          fallbackTestEventCode = parsed.test_event_code.trim();
        }
      } catch {}
    }
    if (!fallbackAccessToken && typeof pixelConfig?.meta_capi_token === "string") {
      fallbackAccessToken = pixelConfig.meta_capi_token.trim();
    }

    // 2. Coletar Multi-Pixels ativos (marketing_source_pixels) e rotear por campanha/anuncio/formulario
    const metaTargets: Array<{
      sourcePixelId: string | null;
      externalPixelId: string;
      accessToken: string;
      testEventCode: string;
    }> = [];

    try {
      const { data: sourcePixels } = await (db.from("marketing_source_pixels") as any)
        .select("id, provider, external_pixel_id, secret_payload_encrypted, test_event_code, enabled_events, routing_rules, is_default, is_active")
        .eq("store_id", input.storeId)
        .eq("provider", "meta_pixel")
        .eq("is_active", true);

      if (Array.isArray(sourcePixels) && sourcePixels.length > 0) {
        const matched = selectMatchedPixelsForContext(
          sourcePixels,
          {
            sourcePixelId: input.sourcePixelId || null,
            campaignId: input.campaignId || (input.customData?.campaign_id ? String(input.customData.campaign_id) : null),
            adId: input.adId || (input.customData?.ad_id ? String(input.customData.ad_id) : null),
            formId: input.formId || (input.customData?.form_id ? String(input.customData.form_id) : null),
            landingPath: input.sourceUrl || null,
          },
          input.eventName,
          "meta_pixel",
        );

        for (const px of matched) {
          let pxToken = "";
          let pxTestCode = String(px.test_event_code || fallbackTestEventCode).trim();
          if (px.secret_payload_encrypted) {
            try {
              const dec = JSON.parse(decryptSecret(String(px.secret_payload_encrypted)));
              if (typeof dec?.access_token === "string") pxToken = dec.access_token.trim();
              if (typeof dec?.test_event_code === "string" && dec.test_event_code.trim()) {
                pxTestCode = dec.test_event_code.trim();
              }
            } catch {}
          }
          const resolvedTok = pxToken || fallbackAccessToken;
          if (px.external_pixel_id && resolvedTok) {
            metaTargets.push({
              sourcePixelId: String(px.id),
              externalPixelId: String(px.external_pixel_id),
              accessToken: resolvedTok,
              testEventCode: pxTestCode,
            });
          }
        }
      }
    } catch {
      // Tolerancia se migration 20270601000000 ainda nao aplicada
    }

    if (metaTargets.length === 0 && pixelConfig?.meta_pixel_id && fallbackAccessToken) {
      metaTargets.push({
        sourcePixelId: null,
        externalPixelId: String(pixelConfig.meta_pixel_id),
        accessToken: fallbackAccessToken,
        testEventCode: fallbackTestEventCode,
      });
    }

    if (!pixelConfig && metaTargets.length === 0) {
      return { sent: false, reason: "pixel_not_configured" };
    }

    let metaDelivered = false;
    let metaReason = metaTargets.length > 0 ? "capi_error" : (pixelConfig?.meta_pixel_id ? "capi_token_missing" : "pixel_not_configured");

    if (metaTargets.length > 0) {
      const userData: Record<string, any> = {};
      const phoneDigits = digitsOnly(normalizePhoneE164(input.phone) || input.phone);
      if (phoneDigits.length >= 8) userData.ph = [sha256(phoneDigits)];
      if (input.email && !isSyntheticPlaceholderEmail(input.email)) {
        userData.em = [sha256(input.email.trim().toLowerCase())];
      }
      if (input.fullName && !/^\+?\d+$/.test(input.fullName.trim())) {
        const parts = input.fullName.trim().toLowerCase().split(/\s+/);
        if (parts[0]) userData.fn = [sha256(parts[0])];
        if (parts.length > 1) userData.ln = [sha256(parts[parts.length - 1])];
      }
      if (input.fbp) userData.fbp = input.fbp;
      if (input.fbc) userData.fbc = input.fbc;
      if (input.ctwaClid) userData.ctwa_clid = input.ctwaClid;
      if (input.clientIpAddress) userData.client_ip_address = input.clientIpAddress;
      if (input.clientUserAgent) userData.client_user_agent = input.clientUserAgent;

      const eventPayload: Record<string, any> = {
        event_name: input.eventName,
        event_id: input.eventId,
        event_time: Math.floor(Date.now() / 1000),
        action_source: input.ctwaClid ? "business_messaging" : "website",
        ...(input.ctwaClid ? { messaging_channel: "whatsapp" } : {}),
        ...(input.sourceUrl ? { event_source_url: input.sourceUrl } : {}),
        user_data: userData,
        custom_data: {
          currency: "BRL",
          lead_event_source: input.eventSource || "waesy_omnichannel",
          ...(input.customData || {}),
        },
      };

      for (let idx = 0; idx < metaTargets.length; idx++) {
        const target = metaTargets[idx];
        const bodyPayload: Record<string, any> = {
          data: [eventPayload],
          ...(target.testEventCode ? { test_event_code: target.testEventCode } : {}),
        };

        let responseData: Record<string, any> = {};
        let targetDelivered = false;
        try {
          const capiRes = await fetch(
            `https://graph.facebook.com/v19.0/${encodeURIComponent(target.externalPixelId)}/events?access_token=${encodeURIComponent(target.accessToken)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(bodyPayload),
              signal: AbortSignal.timeout(6000),
            },
          );
          responseData = (await capiRes.json().catch(() => ({}))) as Record<string, any>;
          targetDelivered = capiRes.ok;
          if (targetDelivered) {
            metaDelivered = true;
            metaReason = "delivered";
          }
        } catch (err: any) {
          responseData = { error: err?.message || "network_error" };
        }

        const logEventId = idx === 0 ? input.eventId : `${input.eventId}_px_${target.externalPixelId}`;
        const telRow: Record<string, any> = {
          store_id: input.storeId,
          lead_id: input.leadId || null,
          thread_id: input.threadId || null,
          event_name: input.eventName,
          event_id: logEventId,
          event_source: input.eventSource || "waesy_omnichannel",
          channel: "meta_capi",
          status: targetDelivered ? "delivered" : "failed",
          response_data: responseData,
          ...(target.sourcePixelId ? { source_pixel_id: target.sourcePixelId } : {}),
          external_pixel_id: target.externalPixelId,
        };
        await (db.from("lead_conversion_telemetry") as any)
          .insert(telRow)
          .then(async (res: any) => {
            if (res?.error && /source_pixel_id|external_pixel_id|column/i.test(res.error.message || "")) {
              delete telRow.source_pixel_id;
              delete telRow.external_pixel_id;
              await (db.from("lead_conversion_telemetry") as any).insert(telRow).then(() => null, () => null);
            }
          }, () => null);

        if (targetDelivered && target.sourcePixelId) {
          await (db.from("marketing_source_pixels") as any)
            .update({ last_fired_at: new Date().toISOString() })
            .eq("id", target.sourcePixelId)
            .eq("store_id", input.storeId)
            .then(() => null, () => null);
        }
      }
    }

    // 3. Disparo paralelo para GA4 Measurement Protocol / Google Ads offline quando configurado
    let gaDelivered = false;
    const gaMeasurementId = String(pixelConfig?.ga4_measurement_id || "").trim();
    if (gaMeasurementId) {
      let gaApiSecret = "";
      try {
        const parsedLegacy = JSON.parse(String(pixelConfig?.google_ads_id || "{}"));
        if (typeof parsedLegacy?.api_secret === "string") gaApiSecret = parsedLegacy.api_secret.trim();
      } catch {}
      if (!gaApiSecret) {
        const { data: gaCred } = await db
          .from("integration_credentials")
          .select("secret_payload_encrypted")
          .eq("store_id", input.storeId)
          .eq("provider", "google_analytics")
          .eq("is_active", true)
          .maybeSingle();
        if (gaCred?.secret_payload_encrypted) {
          try {
            const parsedGa = JSON.parse(decryptSecret(gaCred.secret_payload_encrypted));
            if (typeof parsedGa?.api_secret === "string") gaApiSecret = parsedGa.api_secret.trim();
          } catch {}
        }
      }

      if (gaApiSecret) {
        const gaEventName = input.eventName === "Purchase" ? "purchase" : "generate_lead";
        const clientId = input.deviceId || input.gclid || input.gbraid || input.wbraid || input.leadId || `waesy.${Date.now()}`;
        let gaRespData: Record<string, any> = {};
        try {
          const gaRes = await fetch(
            `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(gaMeasurementId)}&api_secret=${encodeURIComponent(gaApiSecret)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                client_id: String(clientId),
                events: [
                  {
                    name: gaEventName,
                    params: {
                      currency: "BRL",
                      value: Number(input.customData?.value || 0),
                      transaction_id: input.eventId,
                      gclid: input.gclid || undefined,
                      gbraid: input.gbraid || undefined,
                      wbraid: input.wbraid || undefined,
                    },
                  },
                ],
              }),
              signal: AbortSignal.timeout(5000),
            },
          );
          gaDelivered = gaRes.ok;
          gaRespData = { status: gaRes.status };
        } catch (err: any) {
          gaRespData = { error: err?.message || "ga4_network_error" };
        }

        await (db.from("lead_conversion_telemetry") as any)
          .insert({
            store_id: input.storeId,
            lead_id: input.leadId || null,
            thread_id: input.threadId || null,
            event_name: gaEventName,
            event_id: `${input.eventId}_ga4`,
            event_source: input.eventSource || "waesy_omnichannel",
            channel: "ga4_mp",
            status: gaDelivered ? "delivered" : "failed",
            response_data: gaRespData,
          })
          .then(() => null, () => null);
      }
    }

    const anySent = metaDelivered || gaDelivered;
    return { sent: anySent, reason: anySent ? "delivered" : metaReason };
  } catch {
    return { sent: false, reason: "unexpected_error" };
  }
}

/**
 * Correlaciona mensagem WhatsApp recebida com Click-to-WhatsApp, Ref Code, Touchpoints de Pixel ou Submissão de Formulário,
 * enriquecendo o thread, a identidade e o card do CRM (`leads_crm`) + disparando CAPI deduplicado.
 */
export async function correlateAndPersistInboundWhatsAppAttribution(
  db: DbClient,
  input: {
    storeId: string;
    threadId: string;
    identityId?: string | null;
    phone: string;
    pushName?: string | null;
    text?: string | null;
    payload?: Record<string, any> | null;
    existingThreadMeta?: Record<string, any> | null;
    existingThreadAttribution?: Record<string, any> | null;
  },
): Promise<{
  attribution: AttributionPayload;
  leadId: string | null;
  customerId: string | null;
  capiDispatched: boolean;
  suppressed?: boolean;
  suppressionReason?: string | null;
}> {
  const phoneLookup = buildPhoneLookupCandidates(input.phone);
  const directSignal = extractWhatsAppReferralAndTokens(input.payload, input.text);
  let resolvedAttr: AttributionPayload = mergeAttributionPayloads(
    input.existingThreadAttribution || (input.existingThreadMeta?.attribution as any),
    directSignal || undefined,
  );

  // Gate Zero-Trust de contatos internos / stakeholders / equipe / contatos silenciados:
  // mantem mensagens no inbox interno e bloqueia leads_crm, whatsapp_lead_conversions e Meta CAPI.
  const suppression = await resolveContactCaptureSuppression(db, {
    storeId: input.storeId,
    identityId: input.identityId,
    phone: phoneLookup.e164 || input.phone,
    threadMeta: input.existingThreadMeta,
  });

  if (suppression.suppressed) {
    const suppressedMeta = {
      ...(input.existingThreadMeta || {}),
      contact_scope: suppression.contactScope,
      suppress_lead_capture: true,
      ...(suppression.internalRoleLabel ? { internal_role_label: suppression.internalRoleLabel } : {}),
    };
    await (db.from("chat_threads") as any)
      .update({
        ...(phoneLookup.e164 ? { primary_phone_e164: phoneLookup.e164 } : {}),
        metadata: suppressedMeta,
      })
      .eq("id", input.threadId)
      .eq("store_id", input.storeId)
      .then(() => null, () => null);

    return {
      attribution: resolvedAttr,
      leadId: null,
      customerId: null,
      capiDispatched: false,
      suppressed: true,
      suppressionReason: suppression.reason,
    };
  }

  // 1. Caso haja Ref: #Waesy-W... na mensagem -> buscar whatsapp_lead_conversions
  if (directSignal?.lead_code) {
    try {
      const { data: conv } = await (db.from("whatsapp_lead_conversions") as any)
        .select("*")
        .eq("lead_code", directSignal.lead_code)
        .maybeSingle();
      if (conv) {
        const convMeta = (conv.metadata && typeof conv.metadata === "object" ? conv.metadata : {}) as Record<string, any>;
        resolvedAttr = mergeAttributionPayloads(resolvedAttr, {
          utm_source: conv.utm_source || convMeta.utm_source,
          utm_medium: conv.utm_medium || convMeta.utm_medium,
          utm_campaign: conv.utm_campaign || convMeta.utm_campaign,
          utm_content: convMeta.utm_content,
          utm_term: convMeta.utm_term,
          fbclid: conv.fbclid || convMeta.fbclid,
          fbp: conv.fbp || convMeta.fbp,
          fbc: conv.fbc || convMeta.fbc,
          gclid: conv.gclid || convMeta.gclid,
          ttclid: conv.ttclid || convMeta.ttclid,
          ctwa_clid: conv.ctwa_clid || convMeta.ctwa_clid,
          ad_id: conv.ad_id || convMeta.meta_ad_id || convMeta.ad_id,
          campaign_id: conv.campaign_id || convMeta.campaign_id,
          listing_id: conv.entity_id,
          listing_origin: conv.entity_type,
          listing_title: conv.entity_title,
          source_url: conv.origin_url,
          captured_via: "whatsapp_ref_code",
        });

        await (db.from("whatsapp_lead_conversions") as any)
          .update({
            status: "responded",
            lead_phone_e164: phoneLookup.e164 || input.phone,
            notes: `${conv.notes || ""}\n[Inbound WhatsApp ${new Date().toISOString()}]: ${(input.text || "").slice(0, 300)}`.trim().slice(-1500),
          })
          .eq("id", conv.id);
      }
    } catch {}
  }

  // 2. Busca reversa em ad_attribution_touchpoints por telefone (30 dias)
  if (phoneLookup.variants.length > 0 || phoneLookup.suffix8) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const orFilters: string[] = [];
      for (const v of phoneLookup.variants) {
        const cleanV = digitsOnly(v);
        if (cleanV.length >= 8) orFilters.push(`phone_digits.eq.${cleanV}`);
      }
      if (phoneLookup.suffix8) orFilters.push(`phone_digits.ilike.%${phoneLookup.suffix8}`);

      if (orFilters.length > 0) {
        const { data: touchpoints } = await (db.from("ad_attribution_touchpoints") as any)
          .select("*")
          .eq("store_id", input.storeId)
          .gte("created_at", thirtyDaysAgo)
          .or(orFilters.join(","))
          .order("created_at", { ascending: false })
          .limit(25);

        const tp = Array.isArray(touchpoints) ? touchpoints[0] : null;
        if (tp) {
          resolvedAttr = mergeAttributionPayloads(resolvedAttr, {
            platform: tp.ad_platform,
            utm_source: tp.utm_source,
            utm_medium: tp.utm_medium,
            utm_campaign: tp.utm_campaign,
            utm_content: tp.utm_content,
            utm_term: tp.utm_term,
            ad_id: tp.ad_id,
            adset_id: tp.adset_id,
            campaign_id: tp.campaign_id,
            creative_id: tp.creative_id,
            form_id: tp.form_id,
            ad_headline: tp.ad_headline,
            ad_body: tp.ad_body,
            ad_media_url: tp.ad_media_url,
            source_url: tp.source_url,
            landing_url: tp.landing_url,
            listing_id: tp.entity_id,
            listing_origin: tp.entity_type,
            listing_title: tp.entity_title,
            ctwa_clid: tp.ctwa_clid,
            fbclid: tp.fbclid,
            fbp: tp.fbp,
            fbc: tp.fbc,
            gclid: tp.gclid,
            gbraid: tp.gbraid || (tp.metadata as any)?.gbraid,
            wbraid: tp.wbraid || (tp.metadata as any)?.wbraid,
            ttclid: tp.ttclid,
            lead_code: tp.lead_code,
            device_id: tp.device_id,
            captured_via: resolvedAttr.captured_via || tp.captured_via,
          });
        }
      }
    } catch {}
  }

  // 3. Busca reversa em lead_form_submissions pelo telefone informado no formulário (30 dias)
  if (phoneLookup.suffix8) {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: sub } = await (db.from("lead_form_submissions") as any)
        .select("id, form_id, classified_id, contact_name, contact_email, contact_phone, utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, fbp, fbc, gclid, ttclid, ad_id, campaign_id, created_at")
        .eq("store_id", input.storeId)
        .gte("created_at", thirtyDaysAgo)
        .ilike("contact_phone", `%${phoneLookup.suffix8}%`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (sub) {
        resolvedAttr = mergeAttributionPayloads(resolvedAttr, {
          form_id: sub.form_id,
          listing_id: sub.classified_id,
          utm_source: sub.utm_source,
          utm_medium: sub.utm_medium,
          utm_campaign: sub.utm_campaign,
          utm_content: sub.utm_content,
          utm_term: sub.utm_term,
          fbclid: sub.fbclid,
          fbp: sub.fbp,
          fbc: sub.fbc,
          gclid: sub.gclid,
          ttclid: sub.ttclid,
          ad_id: sub.ad_id,
          campaign_id: sub.campaign_id,
          captured_via: resolvedAttr.captured_via || "lead_form_phone_match",
        });
      }
    } catch {}
  }

  // 4. Resolver nome amigável da campanha · conjunto · anúncio (local + Meta Graph API fallback)
  if (resolvedAttr.ad_id || resolvedAttr.campaign_id) {
    const enrichedMeta = await resolveAndEnrichMetaAdMetadata(db, {
      storeId: input.storeId,
      adId: resolvedAttr.ad_id,
      campaignId: resolvedAttr.campaign_id,
      adsetId: resolvedAttr.adset_id,
    }).catch(() => null);

    if (enrichedMeta) {
      if (enrichedMeta.campaignName) {
        resolvedAttr.campaign = enrichedMeta.campaignName;
        resolvedAttr.campaign_name = enrichedMeta.campaignName;
        if (!resolvedAttr.utm_campaign) resolvedAttr.utm_campaign = enrichedMeta.campaignName;
      }
      if (enrichedMeta.campaignId && !resolvedAttr.campaign_id) resolvedAttr.campaign_id = enrichedMeta.campaignId;
      if (enrichedMeta.adsetId && !resolvedAttr.adset_id) resolvedAttr.adset_id = enrichedMeta.adsetId;
      if (enrichedMeta.adsetName && !resolvedAttr.adset_name) resolvedAttr.adset_name = enrichedMeta.adsetName;
      if (enrichedMeta.adName && !resolvedAttr.ad_name) resolvedAttr.ad_name = enrichedMeta.adName;
      if (enrichedMeta.adHeadline && !resolvedAttr.ad_headline) resolvedAttr.ad_headline = enrichedMeta.adHeadline;
      if (enrichedMeta.adBody && !resolvedAttr.ad_body) resolvedAttr.ad_body = enrichedMeta.adBody;
      if (enrichedMeta.creativeThumbnailUrl && !resolvedAttr.ad_media_url) resolvedAttr.ad_media_url = enrichedMeta.creativeThumbnailUrl;
      if (enrichedMeta.sourcePixelId && !resolvedAttr.source_pixel_id) resolvedAttr.source_pixel_id = enrichedMeta.sourcePixelId;
    }
  }

  // Fallback semântico de origem caso seja WhatsApp orgânico sem campanha identificada
  if (!resolvedAttr.platform && !resolvedAttr.source) {
    resolvedAttr.platform = "whatsapp";
    resolvedAttr.source = "whatsapp";
    resolvedAttr.captured_via = resolvedAttr.captured_via || "whatsapp_inbound";
  }
  resolvedAttr.detected_at = resolvedAttr.detected_at || new Date().toISOString();

  // 5. Ingestão ou mesclagem canônica no CRM (leads_crm + customers_crm)
  let leadId: string | null = null;
  let customerId: string | null = null;
  try {
    const { ingestOmnichannelLead } = await import("./omnichannel-lead-ingestion");
    const leadSource =
      resolvedAttr.ctwa_clid || resolvedAttr.platform === "meta_ads"
        ? "meta_ads"
        : resolvedAttr.platform === "google_ads"
          ? "google_ads"
          : resolvedAttr.form_id
            ? "lead_form"
            : "whatsapp";

    const readableSourceDetail = formatReadableCampaignDetail({
      campaignName: resolvedAttr.campaign || resolvedAttr.campaign_name || resolvedAttr.utm_campaign,
      adsetName: resolvedAttr.adset_name,
      adName: resolvedAttr.ad_name,
      adHeadline: resolvedAttr.ad_headline,
      listingTitle: resolvedAttr.listing_title,
      adId: resolvedAttr.ad_id,
    });

    const ingested = await ingestOmnichannelLead(db, {
      storeId: input.storeId,
      source: leadSource,
      sourceDetail: readableSourceDetail || "WhatsApp Atendimento",
      fullName: input.pushName || phoneLookup.e164 || input.phone,
      phone: phoneLookup.e164 || input.phone,
      message: input.text?.slice(0, 600) || null,
      sourceListingId: resolvedAttr.listing_id || null,
      sourceListingOrigin: (resolvedAttr.listing_origin as "product" | "classified" | "experience" | "builder" | "form" | null) || null,
      sourceListingTitle: resolvedAttr.listing_title || resolvedAttr.ad_headline || resolvedAttr.ad_name || null,
      sourceFormId: resolvedAttr.form_id || null,
      customFields: {
        ...resolvedAttr,
        thread_id: input.threadId,
        ...(resolvedAttr.ad_id ? { meta_ad_id: resolvedAttr.ad_id } : {}),
        ...(resolvedAttr.form_id ? { meta_form_id: resolvedAttr.form_id } : {}),
        ...(resolvedAttr.campaign_id ? { meta_campaign_id: resolvedAttr.campaign_id, campaign_id: resolvedAttr.campaign_id } : {}),
        ...(resolvedAttr.adset_id ? { meta_adset_id: resolvedAttr.adset_id } : {}),
      },
    });
    leadId = ingested.leadId;
    customerId = ingested.customerId;
  } catch {}

  // 6. Gravar touchpoint vinculado ao thread/lead se houve sinal de anúncio ou ref code
  if (directSignal) {
    await recordAttributionTouchpoint(db, {
      storeId: input.storeId,
      phone: phoneLookup.e164 || input.phone,
      leadCode: resolvedAttr.lead_code,
      ctwaClid: resolvedAttr.ctwa_clid,
      fbclid: resolvedAttr.fbclid,
      fbp: resolvedAttr.fbp,
      fbc: resolvedAttr.fbc,
      gclid: resolvedAttr.gclid,
      ttclid: resolvedAttr.ttclid,
      utmSource: resolvedAttr.utm_source,
      utmMedium: resolvedAttr.utm_medium,
      utmCampaign: resolvedAttr.utm_campaign,
      utmContent: resolvedAttr.utm_content,
      utmTerm: resolvedAttr.utm_term,
      adPlatform: resolvedAttr.platform,
      adId: resolvedAttr.ad_id,
      adsetId: resolvedAttr.adset_id,
      campaignId: resolvedAttr.campaign_id,
      formId: resolvedAttr.form_id,
      adHeadline: resolvedAttr.ad_headline,
      adBody: resolvedAttr.ad_body,
      adMediaUrl: resolvedAttr.ad_media_url,
      sourceUrl: resolvedAttr.source_url,
      capturedVia: resolvedAttr.captured_via || "whatsapp_inbound",
      leadId,
      customerId,
      threadId: input.threadId,
    });
  }

  // 7. Sincronizar atribuição em chat_threads e whatsapp_contact_identities
  const nextThreadMeta = {
    ...(input.existingThreadMeta || {}),
    attribution: resolvedAttr,
    ...(leadId ? { active_lead_id: leadId } : {}),
  };

  await (db.from("chat_threads") as any)
    .update({
      primary_phone_e164: phoneLookup.e164 || input.phone,
      attribution: resolvedAttr,
      metadata: nextThreadMeta,
      ...(leadId ? { lead_id: leadId } : {}),
      ...(customerId ? { customer_id: customerId } : {}),
    })
    .eq("id", input.threadId)
    .eq("store_id", input.storeId)
    .then(() => null, () => null);

  if (input.identityId) {
    await (db.from("whatsapp_contact_identities") as any)
      .update({
        ...(leadId ? { lead_id: leadId } : {}),
        ...(customerId ? { customer_id: customerId } : {}),
        metadata: { attribution: resolvedAttr },
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.identityId)
      .eq("store_id", input.storeId)
      .then(() => null, () => null);
  }

  // 8. Disparo automático CAPI `Lead` deduplicado para fechar o loop com Meta Ads / Pixel
  const dayBucket = new Date().toISOString().slice(0, 10);
  const eventKeySuffix = resolvedAttr.ad_id || resolvedAttr.ctwa_clid || resolvedAttr.lead_code || dayBucket;
  const capiEventId = `wa_lead_${input.storeId.slice(0, 8)}_${phoneLookup.digits}_${String(eventKeySuffix).slice(0, 32)}`;
  const capiRes = await dispatchServerSidePixelConversion(db, {
    storeId: input.storeId,
    eventName: "Lead",
    eventId: capiEventId,
    eventSource: resolvedAttr.ctwa_clid ? "whatsapp_ctwa" : "whatsapp_inbound",
    leadId,
    threadId: input.threadId,
    phone: phoneLookup.e164 || input.phone,
    fullName: input.pushName || null,
    fbp: resolvedAttr.fbp || null,
    fbc: resolvedAttr.fbc || null,
    ctwaClid: resolvedAttr.ctwa_clid || null,
    sourceUrl: resolvedAttr.source_url || resolvedAttr.landing_url || null,
    sourcePixelId: resolvedAttr.source_pixel_id || null,
    campaignId: resolvedAttr.campaign_id || null,
    adId: resolvedAttr.ad_id || null,
    formId: resolvedAttr.form_id || null,
    customData: {
      ad_id: resolvedAttr.ad_id || undefined,
      campaign_id: resolvedAttr.campaign_id || undefined,
      utm_source: resolvedAttr.utm_source || undefined,
      utm_campaign: resolvedAttr.utm_campaign || undefined,
      lead_code: resolvedAttr.lead_code || undefined,
    },
  });

  return {
    attribution: resolvedAttr,
    leadId,
    customerId,
    capiDispatched: capiRes.sent,
  };
}
