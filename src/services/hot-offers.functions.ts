import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { requireStaff } from "@/lib/server-access";
import {
  applyClientOverrideToInheritedProposal,
  assertHotOfferZeroPii,
  buildClientProposalFromMasterOffer,
  buildHotOfferWhatsAppGroupCopy,
  formatBrlFromCents,
  sanitizeProposalToHotOfferPayload,
  type HotFlameStyle,
  type HotOfferBadgeKind,
  type HotOfferDTO,
} from "@/lib/tourism/hot-offer-sanitizer";
import {
  internalEvaluateSupplyAgainstAllLeads,
  type RadarMatchLeadPreview,
} from "@/services/opportunity-radar.functions";
import {
  normalizeLegacyOfferToCanonical,
  type HistoricalPriceCheck,
} from "@/lib/travel/opportunity-matching-engine";
import type { TravelProposalDTO } from "@/services/travel-proposal.functions";

const HotOfferBadgeKindSchema = z.enum(["hot_offer", "hot_black", "flash", "opportunity"]);
const HotFlameStyleSchema = z.enum(["none", "instagram_ring", "pixel_fire", "hot_black"]);

const SelectedMatchedLeadSchema = z.object({
  leadId: z.string().uuid().optional().nullable(),
  fullName: z.string().min(1),
  whatsapp: z.string().min(6),
  email: z.string().email().optional().nullable(),
  adultsCount: z.number().int().min(1).max(20).optional().default(2),
  childrenCount: z.number().int().min(0).max(12).optional().default(0),
  childrenAges: z.array(z.number().int().min(0).max(17)).optional().default([]),
  overridePriceCents: z.number().int().min(0).optional().nullable(),
  overrideRoomType: z.string().max(120).optional().nullable(),
  overrideHotelName: z.string().max(180).optional().nullable(),
  overrideInstallmentsMax: z.number().int().min(1).max(36).optional().nullable(),
  overrideNotes: z.string().max(1000).optional().nullable(),
  customPitchText: z.string().max(2000).optional().nullable(),
  sendWhatsAppImmediately: z.boolean().optional().default(false),
});

export interface HotOfferEligibilityEvaluationResult {
  isEligible: boolean;
  historicalCheck: HistoricalPriceCheck;
  matchedLeadsCount: number;
  matchedLeads: RadarMatchLeadPreview[];
  suggestedGroupCopy: string;
  trackedPreviewUrl: string;
  storeSlug: string;
  promoGroups: Array<{
    id: string;
    group_jid: string;
    group_name: string;
    group_role: string;
    participants_count: number;
    auto_publish_eligible: boolean;
  }>;
}

function mapHotOfferRowToDTO(row: Record<string, any>): HotOfferDTO {
  return {
    id: String(row.id),
    store_id: String(row.store_id),
    source_proposal_id: row.source_proposal_id ? String(row.source_proposal_id) : null,
    source_quote_id: row.source_quote_id ? String(row.source_quote_id) : null,
    tourism_experience_id: row.tourism_experience_id ? String(row.tourism_experience_id) : null,
    slug: String(row.slug || ""),
    title: String(row.title || ""),
    subtitle: row.subtitle ? String(row.subtitle) : null,
    badge_kind: (row.badge_kind as HotOfferBadgeKind) || "hot_offer",
    flame_style: (row.flame_style as HotFlameStyle) || "pixel_fire",
    destination_city: String(row.destination_city || ""),
    destination_state: row.destination_state ? String(row.destination_state) : null,
    destination_country: row.destination_country ? String(row.destination_country) : "Brasil",
    origin_city: row.origin_city ? String(row.origin_city) : null,
    origin_iata: row.origin_iata ? String(row.origin_iata) : null,
    destination_iata: row.destination_iata ? String(row.destination_iata) : null,
    departure_date: row.departure_date ? String(row.departure_date).slice(0, 10) : null,
    return_date: row.return_date ? String(row.return_date).slice(0, 10) : null,
    nights_count: Number(row.nights_count || 0),
    adults_base_count: Math.max(1, Number(row.adults_base_count || 2)),
    children_base_count: Math.max(0, Number(row.children_base_count || 0)),
    price_cents: Number(row.price_cents || 0),
    original_price_cents: row.original_price_cents != null ? Number(row.original_price_cents) : null,
    discount_pct: row.discount_pct != null ? Number(row.discount_pct) : null,
    historical_verdict:
      (row.historical_verdict as HotOfferDTO["historical_verdict"]) || "insufficient_history",
    historical_savings_pct:
      row.historical_savings_pct != null ? Number(row.historical_savings_pct) : null,
    historical_median_cents:
      row.historical_median_cents != null ? Number(row.historical_median_cents) : null,
    installments_max: Math.max(1, Number(row.installments_max || 10)),
    installment_value_cents:
      row.installment_value_cents != null ? Number(row.installment_value_cents) : null,
    pix_discount_pct: Number(row.pix_discount_pct ?? 5),
    seats_left: row.seats_left != null ? Number(row.seats_left) : null,
    flights: Array.isArray(row.flights) ? row.flights : [],
    hotels: Array.isArray(row.hotels) ? row.hotels : [],
    transfers: Array.isArray(row.transfers) ? row.transfers : [],
    itinerary: Array.isArray(row.itinerary) ? row.itinerary : [],
    inclusions: Array.isArray(row.inclusions) ? row.inclusions : [],
    exclusions: Array.isArray(row.exclusions) ? row.exclusions : [],
    media_urls: Array.isArray(row.media_urls) ? row.media_urls : [],
    story_media_url: row.story_media_url ? String(row.story_media_url) : null,
    group_media_url: row.group_media_url ? String(row.group_media_url) : null,
    whatsapp_copy_summary: row.whatsapp_copy_summary ? String(row.whatsapp_copy_summary) : null,
    boarding_requirements: row.boarding_requirements ? String(row.boarding_requirements) : null,
    cancellation_policy: row.cancellation_policy ? String(row.cancellation_policy) : null,
    status: (row.status as HotOfferDTO["status"]) || "active",
    is_published_in_app: Boolean(row.is_published_in_app ?? true),
    expires_at: row.expires_at ? String(row.expires_at) : null,
    views_count: Number(row.views_count || 0),
    clicks_count: Number(row.clicks_count || 0),
    leads_generated_count: Number(row.leads_generated_count || 0),
    created_at: String(row.created_at || new Date().toISOString()),
    updated_at: String(row.updated_at || new Date().toISOString()),
  };
}

/**
 * Enriches matched leads with recent WhatsApp chat messages & audio transcriptions (`chat_messages` / `chat_threads`)
 * when a client mentioned the target destination in conversation or voice notes.
 */
async function enrichMatchesWithWhatsAppConversationIntent(params: {
  storeId: string;
  destinationCity: string;
  existingMatches: RadarMatchLeadPreview[];
  effectivePriceCents: number;
}): Promise<RadarMatchLeadPreview[]> {
  const destClean = params.destinationCity.trim();
  if (destClean.length < 3) return params.existingMatches;

  const supabase = getServerClient();
  const results = [...params.existingMatches];
  const seenPhones = new Set(
    results.map((m) => (m.whatsapp || "").replace(/\D/g, "")).filter(Boolean)
  );

  try {
    const { data: msgRows } = await supabase
      .from("chat_messages")
      .select("id, thread_id, content, message_type, metadata, created_at")
      .eq("store_id", params.storeId)
      .ilike("content", `%${destClean}%`)
      .order("created_at", { ascending: false })
      .limit(40);

    if (!msgRows || msgRows.length === 0) return results;

    const threadIds = Array.from(
      new Set(msgRows.map((m: any) => String(m.thread_id || "")).filter(Boolean))
    );
    if (threadIds.length === 0) return results;

    const { data: threadRows } = await supabase
      .from("chat_threads")
      .select("id, customer_name, customer_phone, lead_id, metadata")
      .eq("store_id", params.storeId)
      .in("id", threadIds);

    for (const thread of threadRows || []) {
      const tMeta = (thread.metadata || {}) as Record<string, any>;
      // Skip groups or suppressed internal contacts
      if (tMeta.is_group === true || tMeta.contact_scope === "internal_team" || tMeta.suppress_lead_capture === true) {
        continue;
      }
      const phone = String(thread.customer_phone || "").trim();
      const phoneDigits = phone.replace(/\D/g, "");
      if (!phoneDigits || phoneDigits.length < 8) continue;

      const matchingMsg = msgRows.find((m: any) => String(m.thread_id) === String(thread.id));
      const isAudioTranscript =
        matchingMsg?.message_type === "audio" ||
        Boolean((matchingMsg?.metadata as any)?.audio_transcription);

      const snippet = String(matchingMsg?.content || "").slice(0, 90);
      const evidenceReason = isAudioTranscript
        ? `Áudio transcrito no WhatsApp citou "${destClean}": "${snippet}"`
        : `Conversa no WhatsApp mencionou "${destClean}": "${snippet}"`;

      const existingIdx = results.findIndex(
        (r) =>
          (thread.lead_id && r.leadId === String(thread.lead_id)) ||
          (r.whatsapp && r.whatsapp.replace(/\D/g, "") === phoneDigits)
      );

      if (existingIdx >= 0) {
        const current = results[existingIdx];
        if (!current.reasons.some((reason) => reason.includes("WhatsApp"))) {
          results[existingIdx] = {
            ...current,
            matchScore: Math.min(99, current.matchScore + 6),
            reasons: [evidenceReason, ...current.reasons],
          };
        }
        continue;
      }

      if (seenPhones.has(phoneDigits)) continue;
      seenPhones.add(phoneDigits);

      const customerName = String(thread.customer_name || "Cliente WhatsApp").trim();
      const firstName = customerName.split(/\s+/)[0] || "Olá";
      results.push({
        targetType: "lead_crm",
        leadId: thread.lead_id ? String(thread.lead_id) : null,
        interestId: null,
        demandId: null,
        contactId: null,
        fullName: customerName,
        whatsapp: phone,
        destinationRequested: destClean,
        roomsSummary: "1 qto · 2 adt",
        clientBudgetCents: null,
        matchScore: isAudioTranscript ? 84 : 79,
        matchTier: "high",
        requiresChildRequote: false,
        effectiveTotalCents: params.effectivePriceCents,
        childSimulation: {
          applied: false,
          requiresChildRequote: false,
          reasonPt: "Base 2 adultos",
          baseOfferAdultsCount: 2,
          basePerAdultCents: Math.round(params.effectivePriceCents / 2),
          simulatedAirPlusTransferPerChildCents: 0,
          simulationSource: "not_needed",
          simulatedAirSharePct: 0,
          adultsSubtotalCents: params.effectivePriceCents,
          childrenSubtotalCents: 0,
          simulatedTotalCents: params.effectivePriceCents,
          deltaVsOfferTotalCents: 0,
          infantsCount: 0,
          chd2to11Count: 0,
          teens12to17Count: 0,
          perChildBreakdown: [],
        },
        historicalCheck: {
          sampleCount: 0,
          historicalMedianCents: null,
          historicalMinCents: null,
          historicalMaxCents: null,
          comparedUnitCents: Math.round(params.effectivePriceCents / 2),
          historicalSavingsPct: null,
          verdict: "insufficient_history",
          verdictLabelPt: "Identificado via conversa WhatsApp",
        },
        historicalVerdict: "insufficient_history",
        historicalSavingsPct: null,
        alreadyProposedRecently: false,
        reasons: [evidenceReason],
        warnings: [],
        suggestedPitchPt: `${firstName}, surgiu uma condição especial para ${destClean} (${formatBrlFromCents(
          params.effectivePriceCents
        )}) que combina com o que conversamos no WhatsApp! Posso te mandar os detalhes?`,
      });
    }
  } catch {
    // Non-blocking enrichment
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}

export const evaluateProposalHistoricalOfferEligibilityFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      proposalId: z.string().uuid().optional().nullable(),
      title: z.string().optional().nullable(),
      destinationCity: z.string().min(2),
      originCity: z.string().optional().nullable(),
      originIata: z.string().optional().nullable(),
      destinationIata: z.string().optional().nullable(),
      departureDate: z.string().optional().nullable(),
      returnDate: z.string().optional().nullable(),
      adultsCount: z.number().int().min(1).max(20).optional().default(2),
      childrenAges: z.array(z.number().int().min(0).max(17)).optional().default([]),
      totalPriceCents: z.number().int().min(0),
      installmentsMax: z.number().int().min(1).max(36).optional().default(10),
      hotelHeadline: z.string().optional().nullable(),
      includesHeadline: z.array(z.string()).optional().default([]),
      excludeLeadId: z.string().uuid().optional().nullable(),
    })
  )
  .handler(async ({ data }): Promise<HotOfferEligibilityEvaluationResult> => {
    await requireStaff();
    const supabase = getServerClient();

    const [{ data: storeRow }, { data: groupRows }] = await Promise.all([
      supabase
        .from("stores")
        .select("id, slug, name")
        .eq("id", data.storeId)
        .maybeSingle(),
      supabase
        .from("whatsapp_groups_directory")
        .select("id, group_jid, group_name, group_role, participants_count, auto_publish_eligible, is_active")
        .eq("store_id", data.storeId)
        .eq("is_active", true)
        .neq("group_role", "internal_team")
        .order("participants_count", { ascending: false })
        .limit(50),
    ]);

    const storeSlug = String(storeRow?.slug || "agencia");
    const offer = normalizeLegacyOfferToCanonical({
      id: data.proposalId || `eval-${Date.now()}`,
      source_type: "proposal",
      title: data.title?.trim() || `Oferta ${data.destinationCity.trim()}`,
      destination_city: data.destinationCity.trim(),
      destination_iata: data.destinationIata?.trim().toUpperCase() || null,
      origin_city: data.originCity?.trim() || null,
      origin_iata: data.originIata?.trim().toUpperCase() || null,
      departure_date: data.departureDate?.trim() || null,
      return_date: data.returnDate?.trim() || null,
      adults_count: data.adultsCount,
      children_count: data.childrenAges.length,
      children_ages: data.childrenAges,
      total_cents: data.totalPriceCents,
      product_type: "package",
      target_lead_id: data.excludeLeadId || null,
    });

    const summary = await internalEvaluateSupplyAgainstAllLeads({
      storeId: data.storeId,
      offer,
      sourceProposalId: data.proposalId ?? null,
      dryRun: true,
      minScore: 55,
    });

    const historicalCheck: HistoricalPriceCheck = summary.standaloneHistoricalCheck || {
      sampleCount: 0,
      historicalMedianCents: null,
      historicalMinCents: null,
      historicalMaxCents: null,
      comparedUnitCents: Math.round(data.totalPriceCents / Math.max(1, data.adultsCount)),
      historicalSavingsPct: null,
      verdict: "insufficient_history",
      verdictLabelPt: "Sem histórico suficiente na rota",
    };

    const enrichedMatches = await enrichMatchesWithWhatsAppConversationIntent({
      storeId: data.storeId,
      destinationCity: data.destinationCity,
      existingMatches: summary.matchedLeads,
      effectivePriceCents: data.totalPriceCents,
    });

    const isEligible =
      historicalCheck.verdict === "great_deal" ||
      (typeof historicalCheck.historicalSavingsPct === "number" &&
        historicalCheck.historicalSavingsPct >= 8) ||
      enrichedMatches.length > 0;

    const nightsCount =
      data.departureDate && data.returnDate
        ? Math.max(
            1,
            Math.round((Date.parse(data.returnDate) - Date.parse(data.departureDate)) / 86_400_000)
          )
        : 0;

    const { trackedUrl, summaryCopy } = buildHotOfferWhatsAppGroupCopy({
      title: data.title?.trim() || `Pacote ${data.destinationCity.trim()}`,
      destinationCity: data.destinationCity.trim(),
      departureDate: data.departureDate || null,
      returnDate: data.returnDate || null,
      nightsCount,
      adultsCount: data.adultsCount,
      priceCents: data.totalPriceCents,
      installmentsMax: data.installmentsMax,
      badgeKind:
        historicalCheck.historicalSavingsPct && historicalCheck.historicalSavingsPct >= 15
          ? "hot_black"
          : "hot_offer",
      historicalSavingsPct: historicalCheck.historicalSavingsPct,
      hotelHeadline: data.hotelHeadline || null,
      includesHeadline: data.includesHeadline,
      appSlug: storeSlug,
      offerIdOrSlug: data.proposalId || "oferta-hot",
    });

    return {
      isEligible,
      historicalCheck,
      matchedLeadsCount: enrichedMatches.length,
      matchedLeads: enrichedMatches,
      suggestedGroupCopy: summaryCopy,
      trackedPreviewUrl: trackedUrl,
      storeSlug,
      promoGroups: (groupRows || []).map((g: any) => ({
        id: String(g.id),
        group_jid: String(g.group_jid),
        group_name: String(g.group_name || "Grupo WhatsApp"),
        group_role: String(g.group_role || "unclassified"),
        participants_count: Number(g.participants_count || 0),
        auto_publish_eligible: Boolean(g.auto_publish_eligible),
      })),
    };
  });

async function internalDispatchHotOfferToWhatsAppGroups(params: {
  storeId: string;
  userId?: string | null;
  hotOffer: HotOfferDTO;
  groupIds: string[];
  mediaUrl?: string | null;
  captionText?: string | null;
  storeSlug: string;
}): Promise<{
  sentCount: number;
  failedCount: number;
  blockedInternalCount: number;
  results: Array<{
    groupId: string;
    groupName: string;
    status: "sent" | "queued" | "failed" | "blocked_internal_group";
    error?: string | null;
  }>;
}> {
  if (!Array.isArray(params.groupIds) || params.groupIds.length === 0) {
    return { sentCount: 0, failedCount: 0, blockedInternalCount: 0, results: [] };
  }

  const supabase = getServerClient();
  const uniqueGroupIds = Array.from(new Set(params.groupIds.filter(Boolean)));

  const { data: groupRows, error: grpError } = await supabase
    .from("whatsapp_groups_directory")
    .select("id, store_id, instance_id, default_instance_id, group_jid, group_name, group_role, silence_lead_capture")
    .eq("store_id", params.storeId)
    .in("id", uniqueGroupIds);

  if (grpError) {
    throw new Error(`Falha ao validar grupos WhatsApp da loja: ${grpError.message}`);
  }

  // Zero-Trust Cross-Tenant Verification: all requested groupIds must belong to storeId
  const foundIds = new Set((groupRows || []).map((g: any) => String(g.id)));
  for (const requestedId of uniqueGroupIds) {
    if (!foundIds.has(requestedId)) {
      throw new Error(
        `Acesso negado (Zero-Trust): O grupo ${requestedId} não pertence a esta agência.`
      );
    }
  }

  // Load connected WhatsApp instances for the store
  const { data: instances } = await supabase
    .from("whatsapp_channel_instances")
    .select("id, provider, external_instance_id, status, config_encrypted")
    .eq("store_id", params.storeId);

  const instanceMap = new Map<string, any>();
  let fallbackInstance: any = null;
  for (const inst of instances || []) {
    instanceMap.set(String(inst.id), inst);
    if (!fallbackInstance && inst.status === "connected") {
      fallbackInstance = inst;
    }
  }
  if (!fallbackInstance && instances && instances.length > 0) {
    fallbackInstance = instances[0];
  }

  const { trackedUrl, summaryCopy } = buildHotOfferWhatsAppGroupCopy({
    title: params.hotOffer.title,
    destinationCity: params.hotOffer.destination_city,
    departureDate: params.hotOffer.departure_date,
    returnDate: params.hotOffer.return_date,
    nightsCount: params.hotOffer.nights_count,
    adultsCount: params.hotOffer.adults_base_count,
    priceCents: params.hotOffer.price_cents,
    installmentsMax: params.hotOffer.installments_max,
    installmentValueCents: params.hotOffer.installment_value_cents,
    badgeKind: params.hotOffer.badge_kind,
    historicalSavingsPct: params.hotOffer.historical_savings_pct,
    hotelHeadline: params.hotOffer.hotels?.[0]?.hotel_name || null,
    includesHeadline: params.hotOffer.inclusions,
    appSlug: params.storeSlug,
    offerIdOrSlug: params.hotOffer.id,
  });

  const effectiveCaption = (params.captionText || params.hotOffer.whatsapp_copy_summary || summaryCopy).trim();
  const effectiveMediaUrl =
    params.mediaUrl || params.hotOffer.group_media_url || params.hotOffer.story_media_url || params.hotOffer.media_urls[0] || null;

  const { sendWithWhatsAppAdapter } = await import("@/services/whatsapp-outbound-adapters.server");

  let sentCount = 0;
  let failedCount = 0;
  let blockedInternalCount = 0;
  const results: Array<{
    groupId: string;
    groupName: string;
    status: "sent" | "queued" | "failed" | "blocked_internal_group";
    error?: string | null;
  }> = [];

  for (const grp of groupRows || []) {
    const groupId = String(grp.id);
    const groupName = String(grp.group_name || "Grupo WhatsApp");
    const groupJid = String(grp.group_jid || "").trim();
    const role = String(grp.group_role || "unclassified");

    // Invariante R5: Grupos de Equipe Interna NUNCA recebem disparos promocionais
    if (role === "internal_team" || grp.silence_lead_capture === true) {
      blockedInternalCount++;
      await supabase.from("offer_campaign_dispatches").insert({
        store_id: params.storeId,
        hot_offer_id: params.hotOffer.id,
        source_proposal_id: params.hotOffer.source_proposal_id || null,
        target_kind: "whatsapp_group",
        whatsapp_group_id: groupId,
        group_jid: groupJid,
        group_name: groupName,
        media_url: effectiveMediaUrl,
        caption_text: effectiveCaption,
        tracked_url: trackedUrl,
        status: "blocked_internal_group",
        error_message: "Disparo bloqueado: grupo classificado como Equipe Interna.",
        dispatched_by: params.userId || null,
      });
      results.push({
        groupId,
        groupName,
        status: "blocked_internal_group",
        error: "Grupo classificado como Equipe Interna (bloqueado por governança).",
      });
      continue;
    }

    const chosenInstance =
      (grp.default_instance_id && instanceMap.get(String(grp.default_instance_id))) ||
      (grp.instance_id && instanceMap.get(String(grp.instance_id))) ||
      fallbackInstance;

    let status: "sent" | "queued" | "failed" = "queued";
    let providerMessageId: string | null = null;
    let errorMessage: string | null = null;

    if (chosenInstance && groupJid) {
      try {
        const adapterRes = await sendWithWhatsAppAdapter(chosenInstance, {
          recipientPhone: groupJid,
          messageType: effectiveMediaUrl ? "image" : "text",
          payload: effectiveMediaUrl
            ? {
                media_url: effectiveMediaUrl,
                caption: effectiveCaption,
                text: effectiveCaption,
                idempotencyKey: `hot_offer:${params.hotOffer.id}:grp:${groupId}:${Date.now()}`,
              }
            : {
                text: effectiveCaption,
                idempotencyKey: `hot_offer:${params.hotOffer.id}:grp:${groupId}:${Date.now()}`,
              },
        });

        if (adapterRes.httpStatus < 400) {
          status = "sent";
          providerMessageId = adapterRes.externalMessageId;
          sentCount++;
        } else {
          status = "failed";
          errorMessage = "Falha no envio via WhatsApp HTTP " + adapterRes.httpStatus;
          failedCount++;
        }
      } catch (err: any) {
        status = "failed";
        errorMessage = err?.message || "Erro ao enviar mensagem ao grupo";
        failedCount++;
      }
    } else {
      // Queue in whatsapp_outbox if no live adapter connection is active right now
      const { data: outboxRow, error: outboxErr } = await supabase
        .from("whatsapp_outbox")
        .insert({
          store_id: params.storeId,
          channel_instance_id: chosenInstance?.id || null,
          provider: chosenInstance?.provider || "evolution_api",
          idempotency_key: `hot_offer:${params.hotOffer.id}:grp:${groupId}`,
          recipient_phone: groupJid,
          message_type: effectiveMediaUrl ? "image" : "text",
          payload: {
            media_url: effectiveMediaUrl,
            caption: effectiveCaption,
            text: effectiveCaption,
            tracked_url: trackedUrl,
            hot_offer_id: params.hotOffer.id,
          },
          status: "pending",
        })
        .select("id")
        .maybeSingle();

      if (outboxErr) {
        status = "failed";
        errorMessage = outboxErr.message;
        failedCount++;
      } else {
        status = "queued";
        providerMessageId = outboxRow?.id ? String(outboxRow.id) : null;
        sentCount++;
      }
    }

    await supabase.from("offer_campaign_dispatches").insert({
      store_id: params.storeId,
      hot_offer_id: params.hotOffer.id,
      source_proposal_id: params.hotOffer.source_proposal_id || null,
      target_kind: "whatsapp_group",
      whatsapp_group_id: groupId,
      group_jid: groupJid,
      group_name: groupName,
      instance_id: chosenInstance?.id || null,
      media_url: effectiveMediaUrl,
      caption_text: effectiveCaption,
      tracked_url: trackedUrl,
      provider_message_id: providerMessageId,
      status,
      error_message: errorMessage,
      dispatched_by: params.userId || null,
    });

    results.push({
      groupId,
      groupName,
      status,
      error: errorMessage,
    });
  }

  return { sentCount, failedCount, blockedInternalCount, results };
}

export const dispatchHotOfferToWhatsAppGroupsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      hotOfferId: z.string().uuid(),
      groupIds: z.array(z.string().uuid()).min(1),
      mediaUrl: z.string().optional().nullable(),
      captionText: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const supabase = getServerClient();

    const [{ data: offerRow, error: offerErr }, { data: storeRow }] = await Promise.all([
      supabase
        .from("hot_offers")
        .select("*")
        .eq("id", data.hotOfferId)
        .eq("store_id", data.storeId)
        .single(),
      supabase.from("stores").select("slug").eq("id", data.storeId).maybeSingle(),
    ]);

    if (offerErr || !offerRow) {
      throw new Error("Oferta pública não encontrada para esta agência.");
    }

    const hotOffer = mapHotOfferRowToDTO(offerRow);
    return internalDispatchHotOfferToWhatsAppGroups({
      storeId: data.storeId,
      userId: staff.id,
      hotOffer,
      groupIds: data.groupIds,
      mediaUrl: data.mediaUrl,
      captionText: data.captionText,
      storeSlug: String(storeRow?.slug || "agencia"),
    });
  });

export const promoteProposalOrPackageToHotOfferFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      proposalId: z.string().uuid().optional().nullable(),
      customTitle: z.string().min(3).max(160).optional().nullable(),
      customSubtitle: z.string().max(240).optional().nullable(),
      destinationCity: z.string().min(2).max(120).optional().nullable(),
      departureDate: z.string().optional().nullable(),
      returnDate: z.string().optional().nullable(),
      adultsCount: z.number().int().min(1).max(20).optional().default(2),
      childrenCount: z.number().int().min(0).max(12).optional().default(0),
      priceCents: z.number().int().min(0).optional().nullable(),
      installmentsMax: z.number().int().min(1).max(36).optional().default(10),
      badgeKind: HotOfferBadgeKindSchema.optional().default("hot_offer"),
      flameStyle: HotFlameStyleSchema.optional().default("pixel_fire"),
      storyMediaUrl: z.string().optional().nullable(),
      groupMediaUrl: z.string().optional().nullable(),
      mediaUrls: z.array(z.string()).optional().default([]),
      flights: z.array(z.any()).optional().default([]),
      hotels: z.array(z.any()).optional().default([]),
      transfers: z.array(z.any()).optional().default([]),
      itinerary: z.array(z.any()).optional().default([]),
      inclusions: z.array(z.string()).optional().default([]),
      exclusions: z.array(z.string()).optional().default([]),
      customWhatsappCopy: z.string().max(3000).optional().nullable(),
      publishToAppOfferPage: z.boolean().optional().default(true),
      publishHotStory: z.boolean().optional().default(true),
      expiresInHours: z.number().int().min(1).max(720).optional().default(72),
      dispatchGroupIds: z.array(z.string().uuid()).optional().default([]),
      selectedMatchedLeads: z.array(SelectedMatchedLeadSchema).optional().default([]),
    })
  )
  .handler(async ({ data }) => {
    const staff = await requireStaff();
    const supabase = getServerClient();

    const { data: storeRow } = await supabase
      .from("stores")
      .select("id, slug, name")
      .eq("id", data.storeId)
      .maybeSingle();
    const storeSlug = String(storeRow?.slug || "agencia");

    let sourceProposal: TravelProposalDTO | null = null;
    if (data.proposalId) {
      const { data: propRow, error: propErr } = await supabase
        .from("travel_proposals")
        .select("*")
        .eq("id", data.proposalId)
        .eq("store_id", data.storeId)
        .maybeSingle();

      if (propErr || !propRow) {
        throw new Error("Proposta de origem não encontrada para esta agência.");
      }
      sourceProposal = propRow as unknown as TravelProposalDTO;
    }

    const syntheticProposalForSanitizer: TravelProposalDTO = sourceProposal
      ? {
          ...sourceProposal,
          title: data.customTitle?.trim() || sourceProposal.title,
          subtitle: data.customSubtitle ?? sourceProposal.subtitle,
          destination_city:
            data.destinationCity?.trim() || sourceProposal.destination_city || "Destino",
          travel_start_date: data.departureDate ?? sourceProposal.travel_start_date,
          travel_end_date: data.returnDate ?? sourceProposal.travel_end_date,
          adults_count: data.adultsCount ?? sourceProposal.adults_count ?? 2,
          children_count: data.childrenCount ?? sourceProposal.children_count ?? 0,
          pricing: {
            currency: sourceProposal.pricing?.currency || "BRL",
            base_price_cents: typeof data.priceCents === "number" ? data.priceCents : Number(sourceProposal.pricing?.base_price_cents || 0),
            boarding_tax_cents: Number(sourceProposal.pricing?.boarding_tax_cents || 0),
            other_taxes_cents: Number(sourceProposal.pricing?.other_taxes_cents || 0),
            discount_cents: Number(sourceProposal.pricing?.discount_cents || 0),
            total_price_cents: typeof data.priceCents === "number" ? data.priceCents : Number(sourceProposal.pricing?.total_price_cents || 0),
            total_cents: typeof data.priceCents === "number" ? data.priceCents : Number(sourceProposal.pricing?.total_cents || 0),
            installments_options: sourceProposal.pricing?.installments_options || [
              {
                installments_count: data.installmentsMax || 10,
                installment_value_cents: Math.round((data.priceCents || 0) / Math.max(1, data.installmentsMax || 10)),
                method: "credit_card",
              },
            ],
            payment_terms: sourceProposal.pricing?.payment_terms,
            custom_fields: sourceProposal.pricing?.custom_fields,
          },
        }
      : ({
          id: `pkg-${Date.now()}`,
          store_id: data.storeId,
          agency_name: String(storeRow?.name || "Agência"),
          quote_id: "",
          public_token: "",
          title: data.customTitle?.trim() || `Oferta ${data.destinationCity || "Especial"}`,
          subtitle: data.customSubtitle || null,
          cover_image_url: data.storyMediaUrl || data.groupMediaUrl || data.mediaUrls[0] || null,
          client_name: "",
          client_whatsapp: "",
          adults_count: data.adultsCount,
          children_count: data.childrenCount,
          canvas_format: "story-916" as const,
          template_theme: "luxury",
          destination_city: data.destinationCity?.trim() || "Destino",
          travel_start_date: data.departureDate || null,
          travel_end_date: data.returnDate || null,
          flights: data.flights as any,
          hotels: data.hotels as any,
          itinerary: data.itinerary as any,
          transfers: data.transfers as any,
          tours: [],
          rooms: [],
          includes: data.inclusions,
          excludes: data.exclusions,
          pricing: {
            currency: "BRL",
            base_price_cents: data.priceCents || 0,
            boarding_tax_cents: 0,
            other_taxes_cents: 0,
            discount_cents: 0,
            total_price_cents: data.priceCents || 0,
            total_cents: data.priceCents || 0,
            installments_options: [
              {
                installments_count: data.installmentsMax || 10,
                installment_value_cents: Math.round(
                  (data.priceCents || 0) / Math.max(1, data.installmentsMax || 10)
                ),
                method: "credit_card",
              },
            ],
          },
          status: "draft",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as TravelProposalDTO);

    const sanitizedPayload = sanitizeProposalToHotOfferPayload({
      proposal: syntheticProposalForSanitizer,
      storeId: data.storeId,
      storeSlug,
      badgeKind: data.badgeKind,
      flameStyle: data.flameStyle,
      storyMediaUrl: data.storyMediaUrl,
      groupMediaUrl: data.groupMediaUrl,
      customTitle: data.customTitle,
      customSubtitle: data.customSubtitle,
      customWhatsappCopy: data.customWhatsappCopy,
      expiresInHours: data.expiresInHours,
    });

    if (data.mediaUrls && data.mediaUrls.length > 0) {
      sanitizedPayload.media_urls = Array.from(
        new Set([...data.mediaUrls, ...sanitizedPayload.media_urls])
      );
    }

    // Hard Zero-PII assertion before DB write
    const piiAudit = assertHotOfferZeroPii(
      sanitizedPayload as unknown as Record<string, unknown>,
      sourceProposal
        ? {
            clientName: sourceProposal.client_name,
            clientWhatsapp: sourceProposal.client_whatsapp,
            clientEmail: sourceProposal.client_email,
            clientDocument: sourceProposal.client_document,
          }
        : undefined
    );
    if (!piiAudit.valid) {
      throw new Error(
        `Bloqueio Zero-PII: Dados pessoais do cliente detectados na oferta pública (${piiAudit.violations.join(", ")}).`
      );
    }

    const { data: insertedOffer, error: offerInsertErr } = await supabase
      .from("hot_offers")
      .insert({
        ...sanitizedPayload,
        source_proposal_id: data.proposalId || null,
        is_published_in_app: data.publishToAppOfferPage,
        created_by: staff.id,
      })
      .select("*")
      .single();

    if (offerInsertErr || !insertedOffer) {
      throw new Error(`Falha ao salvar Oferta-Mestre: ${offerInsertErr?.message || "erro desconhecido"}`);
    }

    const hotOffer = mapHotOfferRowToDTO(insertedOffer);

    // Update source proposal bilateral link
    if (data.proposalId) {
      await supabase
        .from("travel_proposals")
        .update({
          promoted_to_offer_id: hotOffer.id,
          is_offer_source_eligible: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.proposalId)
        .eq("store_id", data.storeId);
    }

    // Channel 1: Publish Hot Story (9:16)
    let createdStoryId: string | null = null;
    if (data.publishHotStory) {
      const storyMedia =
        hotOffer.story_media_url ||
        hotOffer.group_media_url ||
        hotOffer.media_urls?.[0] ||
        null;

      if (!storyMedia) {
        throw new Error("A publicação de Hot Story exige ao menos uma mídia real anexada à oferta.");
      }

      const inAppOfferPath = `/app/${encodeURIComponent(storeSlug)}?offer=${encodeURIComponent(hotOffer.id)}`;
      const badgeLabel =
        hotOffer.badge_kind === "hot_black"
          ? "HOT BLACK"
          : hotOffer.badge_kind === "flash"
            ? "RELÂMPAGO"
            : "HOT OFERTA";

      const { data: storyRow } = await supabase
        .from("stories")
        .insert({
          store_id: data.storeId,
          author_profile_id: staff.id,
          media_url: storyMedia,
          media_type: "image",
          caption: `${hotOffer.title} · ${formatBrlFromCents(hotOffer.price_cents)}`,
          link_url: inAppOfferPath,
          link_label: "Ver Descrição da Oferta",
          story_kind: hotOffer.badge_kind === "hot_black" ? "hot_black" : "hot_offer",
          hot_offer_id: hotOffer.id,
          source_proposal_id: data.proposalId || null,
          offer_badge_label: badgeLabel,
          offer_price_cents: hotOffer.price_cents,
          flame_style: hotOffer.flame_style,
          expires_at: hotOffer.expires_at,
        })
        .select("id")
        .maybeSingle();

      createdStoryId = storyRow?.id ? String(storyRow.id) : null;
    }

    // Channel 2: Dispatch to WhatsApp Promo Groups
    const groupDispatchSummary = await internalDispatchHotOfferToWhatsAppGroups({
      storeId: data.storeId,
      userId: staff.id,
      hotOffer,
      groupIds: data.dispatchGroupIds,
      mediaUrl: hotOffer.group_media_url || hotOffer.story_media_url,
      captionText: data.customWhatsappCopy || hotOffer.whatsapp_copy_summary,
      storeSlug,
    });

    // Channel 3: Create Individual Inherited Proposals (`source_offer_id = hotOffer.id`) for Selected Matched Leads
    const createdClientProposals: Array<{
      proposalId: string;
      leadId: string | null;
      clientName: string;
      clientWhatsapp: string;
      finalTotalCents: number;
      publicToken: string;
    }> = [];

    for (const lead of data.selectedMatchedLeads) {
      const inheritedPayload = buildClientProposalFromMasterOffer({
        masterOffer: hotOffer,
        leadId: lead.leadId || null,
        clientName: lead.fullName,
        clientWhatsapp: lead.whatsapp,
        clientEmail: lead.email || null,
        adultsCount: lead.adultsCount,
        childrenCount: lead.childrenCount,
        childrenAges: lead.childrenAges,
        overridePriceCents: lead.overridePriceCents,
        overrideInstallmentsMax: lead.overrideInstallmentsMax,
        overrideNotes: lead.overrideNotes,
      });

      const updatedPayload =
        lead.overrideRoomType || lead.overrideHotelName
          ? applyClientOverrideToInheritedProposal(
              inheritedPayload,
              {
                roomType: lead.overrideRoomType || undefined,
                hotelName: lead.overrideHotelName || undefined,
                overridePriceCents: lead.overridePriceCents ?? undefined,
                installmentsMax: lead.overrideInstallmentsMax ?? undefined,
                overrideNotes: lead.overrideNotes ?? undefined,
              },
              Math.round(hotOffer.price_cents / Math.max(1, hotOffer.adults_base_count))
            )
          : inheritedPayload;

      const publicToken = `prop-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
      const { data: childPropRow } = await supabase
        .from("travel_proposals")
        .insert({
          store_id: data.storeId,
          source_offer_id: hotOffer.id,
          lead_id: updatedPayload.lead_id,
          agency_name: String(storeRow?.name || "Agência"),
          public_token: publicToken,
          title: updatedPayload.title,
          subtitle: updatedPayload.subtitle,
          cover_image_url: updatedPayload.cover_image_url,
          client_name: updatedPayload.client_name,
          client_whatsapp: updatedPayload.client_whatsapp,
          client_email: updatedPayload.client_email,
          adults_count: updatedPayload.adults_count,
          children_count: updatedPayload.children_count,
          rooms: updatedPayload.rooms,
          destination_city: updatedPayload.destination_city,
          travel_start_date: updatedPayload.travel_start_date,
          travel_end_date: updatedPayload.travel_end_date,
          flights: updatedPayload.flights,
          hotels: updatedPayload.hotels,
          transfers: updatedPayload.transfers,
          itinerary: updatedPayload.itinerary,
          includes: updatedPayload.includes,
          excludes: updatedPayload.excludes,
          pricing: updatedPayload.pricing,
          override_notes: updatedPayload.override_notes,
          canvas_format: "story",
          template_theme: "luxury",
          status: "sent",
        })
        .select("id, public_token")
        .maybeSingle();

      if (childPropRow?.id) {
        const childProposalId = String(childPropRow.id);
        const totalCents = Number(
          updatedPayload.pricing?.total_price_cents ||
          updatedPayload.pricing?.total_cents ||
          (updatedPayload.pricing as any)?.final_total_cents ||
          0
        );
        createdClientProposals.push({
          proposalId: childProposalId,
          leadId: updatedPayload.lead_id,
          clientName: updatedPayload.client_name,
          clientWhatsapp: updatedPayload.client_whatsapp,
          finalTotalCents: totalCents,
          publicToken: String(childPropRow.public_token || publicToken),
        });

        await supabase.from("offer_campaign_dispatches").insert({
          store_id: data.storeId,
          hot_offer_id: hotOffer.id,
          source_proposal_id: data.proposalId || null,
          target_kind: "matched_lead",
          lead_id: updatedPayload.lead_id,
          inherited_proposal_id: childProposalId,
          recipient_phone: updatedPayload.client_whatsapp,
          media_url: hotOffer.story_media_url || hotOffer.group_media_url,
          caption_text:
            lead.customPitchText ||
            `Proposta personalizada para ${updatedPayload.client_name}: ${hotOffer.title} (${formatBrlFromCents(
              totalCents
            )})`,
          tracked_url: `/proposta/${encodeURIComponent(String(childPropRow.public_token || publicToken))}`,
          status: lead.sendWhatsAppImmediately ? "queued" : "sent",
          dispatched_by: staff.id,
        });
      }
    }

    return {
      hotOffer,
      createdStoryId,
      groupDispatchSummary,
      createdClientProposals,
    };
  });

export const executeHotOfferOmnichannelActionFn = promoteProposalOrPackageToHotOfferFn;

export const getPublicHotOfferByIdFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeSlug: z.string().min(1),
      offerIdOrSlug: z.string().min(1),
    })
  )
  .handler(async ({ data }): Promise<HotOfferDTO | null> => {
    const supabase = getServerClient();
    const { data: storeRow } = await supabase
      .from("stores")
      .select("id")
      .eq("slug", data.storeSlug.trim())
      .maybeSingle();

    if (!storeRow?.id) return null;

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      data.offerIdOrSlug.trim()
    );

    let query = supabase
      .from("hot_offers")
      .select("*")
      .eq("store_id", storeRow.id)
      .eq("status", "active")
      .eq("is_published_in_app", true);

    query = isUuid
      ? query.eq("id", data.offerIdOrSlug.trim())
      : query.eq("slug", data.offerIdOrSlug.trim());

    const { data: row } = await query.maybeSingle();
    if (!row) return null;

    if (row.expires_at && Date.parse(String(row.expires_at)) <= Date.now()) {
      return null;
    }

    // Increment view counter non-destructively
    await supabase
      .from("hot_offers")
      .update({ views_count: Number(row.views_count || 0) + 1 })
      .eq("id", row.id);

    return mapHotOfferRowToDTO(row);
  });

export const listStoreHotOffersFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      includeDrafts: z.boolean().optional().default(false),
    })
  )
  .handler(async ({ data }): Promise<HotOfferDTO[]> => {
    const supabase = getServerClient();
    const nowIso = new Date().toISOString();

    let query = supabase
      .from("hot_offers")
      .select("*")
      .eq("store_id", data.storeId)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!data.includeDrafts) {
      query = query
        .eq("status", "active")
        .eq("is_published_in_app", true)
        .or(`expires_at.is.null,expires_at.gt.${nowIso}`);
    } else {
      await requireStaff();
    }

    const { data: rows } = await query;
    return (rows || []).map((r: any) => mapHotOfferRowToDTO(r));
  });

export const applyClientOverrideToInheritedProposalFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      proposalId: z.string().uuid(),
      adultsCount: z.number().int().min(1).max(20).optional(),
      childrenCount: z.number().int().min(0).max(12).optional(),
      childrenAges: z.array(z.number().int().min(0).max(17)).optional(),
      roomType: z.string().max(120).optional(),
      hotelName: z.string().max(180).optional(),
      overridePriceCents: z.number().int().min(0).optional(),
      installmentsMax: z.number().int().min(1).max(36).optional(),
      overrideNotes: z.string().max(1000).optional(),
    })
  )
  .handler(async ({ data }) => {
    await requireStaff();
    const supabase = getServerClient();

    const { data: propRow, error: propErr } = await supabase
      .from("travel_proposals")
      .select("*")
      .eq("id", data.proposalId)
      .eq("store_id", data.storeId)
      .single();

    if (propErr || !propRow) {
      throw new Error("Proposta do cliente não encontrada.");
    }

    let masterBasePerAdultCents: number | undefined;
    if (propRow.source_offer_id) {
      const { data: masterRow } = await supabase
        .from("hot_offers")
        .select("price_cents, adults_base_count")
        .eq("id", propRow.source_offer_id)
        .eq("store_id", data.storeId)
        .maybeSingle();

      if (masterRow) {
        masterBasePerAdultCents = Math.round(
          Number(masterRow.price_cents || 0) / Math.max(1, Number(masterRow.adults_base_count || 2))
        );
      }
    }

    const updated = applyClientOverrideToInheritedProposal(
      {
        store_id: String(propRow.store_id),
        source_offer_id: String(propRow.source_offer_id || ""),
        lead_id: propRow.lead_id ? String(propRow.lead_id) : null,
        client_name: String(propRow.client_name || ""),
        client_whatsapp: String(propRow.client_whatsapp || ""),
        client_email: propRow.client_email ? String(propRow.client_email) : null,
        title: String(propRow.title || ""),
        subtitle: propRow.subtitle ? String(propRow.subtitle) : null,
        cover_image_url: propRow.cover_image_url ? String(propRow.cover_image_url) : null,
        destination_city: String(propRow.destination_city || ""),
        travel_start_date: propRow.travel_start_date ? String(propRow.travel_start_date) : null,
        travel_end_date: propRow.travel_end_date ? String(propRow.travel_end_date) : null,
        adults_count: Number(propRow.adults_count || 2),
        children_count: Number(propRow.children_count || 0),
        rooms: Array.isArray(propRow.rooms) ? propRow.rooms : [],
        flights: Array.isArray(propRow.flights) ? propRow.flights : [],
        hotels: Array.isArray(propRow.hotels) ? propRow.hotels : [],
        transfers: Array.isArray(propRow.transfers) ? propRow.transfers : [],
        itinerary: Array.isArray(propRow.itinerary) ? propRow.itinerary : [],
        includes: Array.isArray(propRow.includes) ? propRow.includes : [],
        excludes: Array.isArray(propRow.excludes) ? propRow.excludes : [],
        pricing: (propRow.pricing as any) || {
          currency: "BRL",
          subtotal_cents: 0,
          discount_cents: 0,
          taxes_cents: 0,
          final_total_cents: 0,
          price_per_person_cents: 0,
          installments_max: 10,
          installment_value_cents: 0,
          pix_discount_percent: 5,
          pix_total_cents: 0,
        },
        override_notes: propRow.override_notes ? String(propRow.override_notes) : null,
      },
      {
        adultsCount: data.adultsCount,
        childrenCount: data.childrenCount,
        childrenAges: data.childrenAges,
        roomType: data.roomType,
        hotelName: data.hotelName,
        overridePriceCents: data.overridePriceCents,
        installmentsMax: data.installmentsMax,
        overrideNotes: data.overrideNotes,
      },
      masterBasePerAdultCents
    );

    const { data: savedRow, error: saveErr } = await supabase
      .from("travel_proposals")
      .update({
        adults_count: updated.adults_count,
        children_count: updated.children_count,
        rooms: updated.rooms,
        hotels: updated.hotels,
        pricing: updated.pricing,
        override_notes: updated.override_notes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.proposalId)
      .eq("store_id", data.storeId)
      .select("*")
      .single();

    if (saveErr) {
      throw new Error(`Falha ao aplicar personalização na proposta do cliente: ${saveErr.message}`);
    }

    return savedRow;
  });
