/**
 * @fileoverview Motor puro de consolidacao multi-touch da jornada de aquisicao (Primeiro Toque,
 * Ultimo Toque, frequencia de cliques por anuncio/campanha e linha do tempo cronologica).
 */

export interface RawTouchpointInput {
  id?: string | null;
  ad_platform?: string | null;
  platform?: string | null;
  source?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  campaign?: string | null;
  campaign_name?: string | null;
  campaign_id?: string | null;
  adset_id?: string | null;
  adset_name?: string | null;
  ad_id?: string | null;
  ad_name?: string | null;
  ad_headline?: string | null;
  form_id?: string | null;
  source_pixel_id?: string | null;
  pixel_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  entity_title?: string | null;
  listing_id?: string | null;
  listing_title?: string | null;
  ctwa_clid?: string | null;
  fbclid?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
  ttclid?: string | null;
  lead_code?: string | null;
  captured_via?: string | null;
  click_count?: number | null;
  created_at?: string | null;
  captured_at?: string | null;
  detected_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface NormalizedJourneyTouchpoint {
  key: string;
  occurredAt: string;
  occurredMs: number;
  channel: string;
  platform: string;
  source: string | null;
  medium: string | null;
  campaignName: string | null;
  campaignId: string | null;
  adsetName: string | null;
  adsetId: string | null;
  adName: string | null;
  adId: string | null;
  listingTitle: string | null;
  listingId: string | null;
  pixelId: string | null;
  leadCode: string | null;
  capturedVia: string | null;
  clickCount: number;
  hasCtwa: boolean;
  hasMetaClick: boolean;
  hasGoogleClick: boolean;
  hasTikTokClick: boolean;
}

export interface CustomerTouchpointJourneySummary {
  totalTouchpointsCount: number;
  totalClicksCount: number;
  uniqueCampaignsCount: number;
  uniqueAdsCount: number;
  uniqueSourcesCount: number;
  firstTouch: NormalizedJourneyTouchpoint | null;
  lastTouch: NormalizedJourneyTouchpoint | null;
  timeline: NormalizedJourneyTouchpoint[];
}

function pickStr(...values: unknown[]): string | null {
  for (const val of values) {
    if (typeof val === "string" && val.trim()) {
      return val.trim();
    }
  }
  return null;
}

export function classifyAttributionChannel(tp: RawTouchpointInput): string {
  const plat = String(tp.ad_platform || tp.platform || tp.utm_source || tp.source || "")
    .trim()
    .toLowerCase();
  if (tp.ctwa_clid) return "Meta Click-to-WhatsApp";
  if (plat.includes("meta") || plat.includes("facebook") || plat.includes("instagram") || tp.fbclid) {
    return "Meta Ads";
  }
  if (plat.includes("google") || tp.gclid || tp.gbraid || tp.wbraid) {
    return "Google Ads";
  }
  if (plat.includes("tiktok") || tp.ttclid) {
    return "TikTok Ads";
  }
  if (tp.form_id || String(tp.captured_via || "").includes("form")) {
    return "Formulário Web";
  }
  if (plat.includes("whatsapp") || String(tp.captured_via || "").includes("whatsapp")) {
    return "WhatsApp";
  }
  return plat || "Tráfego Direto / Vitrine";
}

function parseTouchpointIso(tp: RawTouchpointInput): { iso: string; ms: number } {
  const raw = pickStr(tp.created_at, tp.captured_at, tp.detected_at);
  if (raw) {
    const ms = Date.parse(raw);
    if (Number.isFinite(ms) && ms > 0) {
      return { iso: new Date(ms).toISOString(), ms };
    }
  }
  return { iso: new Date(0).toISOString(), ms: 0 };
}

/**
 * Mescla um novo clique/toque no array JSONB do card mantendo contagem de frequencia
 * quando o mesmo anuncio/campanha e clicado novamente (sem descartar interacoes repetidas).
 */
export function mergeTouchpointWithFrequency(
  existingList: unknown,
  incoming: Record<string, unknown>,
  nowIso: string,
  maxItems = 30,
): Array<Record<string, unknown>> {
  const list = Array.isArray(existingList)
    ? existingList.map((item) => ({ ...(item as Record<string, unknown>) }))
    : [];
  const adId = pickStr(incoming.ad_id, incoming.meta_ad_id);
  const campaignId = pickStr(incoming.campaign_id, incoming.meta_campaign_id);
  const ctwaClid = pickStr(incoming.ctwa_clid);
  const leadCode = pickStr(incoming.lead_code);
  const listingId = pickStr(incoming.listing_id, incoming.entity_id);
  const incomingAt = pickStr(incoming.captured_at, incoming.detected_at) || nowIso;

  const incomingKey = [adId || "", campaignId || "", listingId || "", leadCode || ""].join("|");
  const hasMeaningfulSignal = Boolean(
    adId ||
      campaignId ||
      ctwaClid ||
      leadCode ||
      listingId ||
      incoming.utm_campaign ||
      incoming.fbclid ||
      incoming.gclid,
  );
  if (!hasMeaningfulSignal) return list.slice(-maxItems);

  // Se o ctwa_clid ou gclid ou fbclid for inedito ou timestamp > 60s da ultima vez, registra novo toque
  // e incrementa click_count cumulativo quando compartilha o mesmo anuncio
  let lastSameAdIdx = -1;
  if (incomingKey !== "|||") {
    for (let i = list.length - 1; i >= 0; i--) {
      const tp = list[i];
      const k = [
        pickStr(tp.ad_id, tp.meta_ad_id) || "",
        pickStr(tp.campaign_id, tp.meta_campaign_id) || "",
        pickStr(tp.listing_id, tp.entity_id) || "",
        pickStr(tp.lead_code) || "",
      ].join("|");
      if (k === incomingKey) {
        lastSameAdIdx = i;
        break;
      }
    }
  }

  if (lastSameAdIdx >= 0) {
    const prevTp = list[lastSameAdIdx];
    const prevMs = Date.parse(String(prevTp.last_clicked_at || prevTp.captured_at || "")) || 0;
    const curMs = Date.parse(incomingAt) || Date.now();
    const diffMs = Math.abs(curMs - prevMs);
    const sameClid = Boolean(ctwaClid && prevTp.ctwa_clid === ctwaClid);

    if (sameClid || diffMs < 30_000) {
      list[lastSameAdIdx] = {
        ...prevTp,
        ...incoming,
        captured_at: prevTp.captured_at || incomingAt,
        last_clicked_at: incomingAt,
        click_count: Math.max(1, Number(prevTp.click_count || 1)) + (sameClid ? 0 : 1),
      };
      return list.slice(-maxItems);
    }

    const prevCount = list.reduce((sum, item) => {
      const k = [
        pickStr(item.ad_id, item.meta_ad_id) || "",
        pickStr(item.campaign_id, item.meta_campaign_id) || "",
        pickStr(item.listing_id, item.entity_id) || "",
        pickStr(item.lead_code) || "",
      ].join("|");
      return k === incomingKey ? Math.max(sum, Number(item.click_count || 1)) : sum;
    }, 1);

    list.push({
      ...incoming,
      captured_at: incomingAt,
      last_clicked_at: incomingAt,
      click_count: prevCount + 1,
    });
    return list.slice(-maxItems);
  }

  list.push({
    ...incoming,
    captured_at: incomingAt,
    last_clicked_at: incomingAt,
    click_count: Math.max(1, Number(incoming.click_count || 1)),
  });
  return list.slice(-maxItems);
}

/**
 * Consolida todos os touchpoints (tabela `ad_attribution_touchpoints` + snapshots JSONB do lead)
 * em ordem cronologica com metricas de 1o Toque, Ultimo Toque e cardinalidade unica.
 */
export function computeCustomerTouchpointJourney(
  touchpoints: RawTouchpointInput[],
  fallbackSnapshot?: RawTouchpointInput | null,
): CustomerTouchpointJourneySummary {
  const combined: RawTouchpointInput[] = Array.isArray(touchpoints) ? [...touchpoints] : [];
  if (combined.length === 0 && fallbackSnapshot && Object.keys(fallbackSnapshot).length > 0) {
    combined.push(fallbackSnapshot);
  }

  const dedupMap = new Map<string, NormalizedJourneyTouchpoint>();

  combined.forEach((raw, idx) => {
    if (!raw || typeof raw !== "object") return;
    const { iso, ms } = parseTouchpointIso(raw);
    const meta = (raw.metadata && typeof raw.metadata === "object" ? raw.metadata : {}) as Record<string, unknown>;
    const campaignName = pickStr(raw.campaign_name, raw.campaign, raw.utm_campaign, meta.campaign_name);
    const campaignId = pickStr(raw.campaign_id, meta.campaign_id, meta.meta_campaign_id);
    const adsetName = pickStr(raw.adset_name, meta.adset_name);
    const adsetId = pickStr(raw.adset_id, meta.adset_id);
    const adName = pickStr(raw.ad_name, raw.ad_headline, meta.ad_name);
    const adId = pickStr(raw.ad_id, meta.ad_id, meta.meta_ad_id);
    const listingTitle = pickStr(raw.entity_title, raw.listing_title);
    const listingId = pickStr(raw.entity_id, raw.listing_id);
    const source = pickStr(raw.utm_source, raw.source, raw.ad_platform, raw.platform);
    const medium = pickStr(raw.utm_medium, meta.utm_medium);
    const pixelId = pickStr(raw.source_pixel_id, raw.pixel_id, meta.source_pixel_id);
    const leadCode = pickStr(raw.lead_code);
    const capturedVia = pickStr(raw.captured_via);

    const hasSignal = Boolean(
      campaignName ||
        campaignId ||
        adName ||
        adId ||
        listingTitle ||
        raw.ctwa_clid ||
        raw.fbclid ||
        raw.gclid ||
        raw.ttclid ||
        source ||
        leadCode,
    );
    if (!hasSignal) return;

    const dedupKey = raw.id
      ? `id:${raw.id}`
      : `sig:${ms}|${campaignId || campaignName || ""}|${adId || adName || ""}|${raw.ctwa_clid || ""}|${leadCode || idx}`;

    const clickCount = Math.max(1, Number(raw.click_count || meta.click_count || 1));
    const entry: NormalizedJourneyTouchpoint = {
      key: dedupKey,
      occurredAt: iso,
      occurredMs: ms,
      channel: classifyAttributionChannel(raw),
      platform: pickStr(raw.ad_platform, raw.platform, source) || "direct",
      source,
      medium,
      campaignName,
      campaignId,
      adsetName,
      adsetId,
      adName,
      adId,
      listingTitle,
      listingId,
      pixelId,
      leadCode,
      capturedVia,
      clickCount,
      hasCtwa: Boolean(raw.ctwa_clid),
      hasMetaClick: Boolean(raw.fbclid || raw.fbc || raw.fbp),
      hasGoogleClick: Boolean(raw.gclid || raw.gbraid || raw.wbraid),
      hasTikTokClick: Boolean(raw.ttclid),
    };

    const existing = dedupMap.get(dedupKey);
    if (!existing) {
      dedupMap.set(dedupKey, entry);
    } else {
      existing.clickCount = Math.max(existing.clickCount, entry.clickCount);
      existing.campaignName = existing.campaignName || entry.campaignName;
      existing.adName = existing.adName || entry.adName;
      existing.listingTitle = existing.listingTitle || entry.listingTitle;
    }
  });

  const timeline = Array.from(dedupMap.values()).sort((a, b) => a.occurredMs - b.occurredMs);
  const campaignsSet = new Set<string>();
  const adsSet = new Set<string>();
  const sourcesSet = new Set<string>();
  let totalClicks = 0;

  for (const tp of timeline) {
    totalClicks += tp.clickCount;
    const cKey = tp.campaignId || tp.campaignName;
    if (cKey) campaignsSet.add(cKey.toLowerCase());
    const aKey = tp.adId || tp.adName;
    if (aKey) adsSet.add(aKey.toLowerCase());
    sourcesSet.add(tp.channel.toLowerCase());
  }

  return {
    totalTouchpointsCount: timeline.length,
    totalClicksCount: totalClicks,
    uniqueCampaignsCount: campaignsSet.size,
    uniqueAdsCount: adsSet.size,
    uniqueSourcesCount: sourcesSet.size,
    firstTouch: timeline[0] || null,
    lastTouch: timeline.length > 0 ? timeline[timeline.length - 1] : null,
    timeline,
  };
}
