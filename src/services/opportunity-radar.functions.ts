import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { requireStaff } from "@/lib/server-access";
import {
  evaluateHistoricalAdvantage,
  evaluateUnifiedOpportunityMatch,
  normalizeDestinationTagList,
  normalizeLegacyDemandToCanonical,
  normalizeLegacyOfferToCanonical,
  normalizeOpportunityText,
  normalizePeriodSpec,
  normalizeRoomsFromLeadOrLegacy,
  type CanonicalDemandLead,
  type CanonicalSupplyOffer,
  type ChildSimulationResult,
  type HistoricalPriceCheck,
  type HistoricalPriceObservationInput,
  type RecentLeadProposalRef,
  type UnifiedOpportunityResult,
} from "@/lib/travel/opportunity-matching-engine";

// ============================================================================
// TIPOS UNICOS SSOT DA BFF UNIFICADA DO RADAR DE OPORTUNIDADES
// ============================================================================

export interface RadarMatchLeadPreview {
  targetType: "lead_crm" | "travel_interest" | "client_demand";
  leadId: string | null;
  interestId: string | null;
  demandId: string | null;
  contactId: string | null;
  fullName: string;
  whatsapp: string | null;
  destinationRequested: string;
  roomsSummary: string | null;
  clientBudgetCents: number | null;
  matchScore: number;
  matchTier: string;
  requiresChildRequote: boolean;
  effectiveTotalCents: number;
  childSimulation: ChildSimulationResult | null;
  historicalCheck: HistoricalPriceCheck | null;
  historicalVerdict: HistoricalPriceCheck["verdict"];
  historicalSavingsPct: number | null;
  alreadyProposedRecently: boolean;
  reasons: string[];
  warnings: string[];
  suggestedPitchPt: string;
}

export interface RadarEvaluationSummary {
  supplyId: string;
  supplySourceType: string;
  destinationCity: string;
  evaluatedDemandsCount: number;
  matchedCount: number;
  persistedCount: number;
  matchedLeads: RadarMatchLeadPreview[];
}

export interface UnifiedRadarOpportunityItem {
  id: string;
  originTable: "travel_opportunities" | "travel_opportunity_matches";
  sourceType: "proposal" | "quote_capture" | "agency_quote" | "catalog_package" | "ocr_quote" | "offer_engine";
  sourceId: string | null;
  offerTitle: string;
  destinationCity: string;
  departureDate: string | null;
  quotedTotalCents: number;
  effectiveTotalCents: number;
  clientBudgetCents: number | null;
  variancePct: number | null;
  targetType: "lead_crm" | "travel_interest" | "client_demand";
  leadId: string | null;
  interestId: string | null;
  demandId: string | null;
  contactId: string | null;
  customerName: string;
  customerPhone: string | null;
  customerDestinations: string[];
  customerPeriodLabel: string | null;
  customerRoomsSummary: string | null;
  matchScore: number;
  matchTier: string;
  normalizedStatus: "new" | "reviewed" | "approached" | "promoted_to_crm" | "dismissed";
  rawStatus: string;
  requiresChildRequote: boolean;
  childSimulation: ChildSimulationResult | null;
  historicalCheck: HistoricalPriceCheck | null;
  alreadyProposedRecently: boolean;
  matchReasons: string[];
  warnings: string[];
  whatsappPitchDraft: string;
  tariffTemperature: string | null;
  createdAt: string;
}

export interface LeadVerifiedOpportunitiesBundle {
  verifiedOpportunities: UnifiedRadarOpportunityItem[];
  verifiedSimilarProposals: Array<{
    id: string;
    title: string;
    destinationCity: string;
    departureDate: string | null;
    adultsCount: number;
    childrenCount: number;
    totalCents: number;
    effectiveTotalCents: number;
    matchScore: number;
    matchTier: string;
    requiresChildRequote: boolean;
    reasons: string[];
    warnings: string[];
    historicalVerdict: HistoricalPriceCheck["verdict"];
    historicalSavingsPct: number | null;
    publicToken: string | null;
    clientName: string | null;
    status: string | null;
    createdAt: string;
  }>;
  verifiedCaptures: Array<{
    id: string;
    operatorSlug: string;
    sourcePage: string;
    destinationCity: string;
    startDate: string | null;
    totalCents: number;
    effectiveTotalCents: number;
    adultsCount: number;
    childrenCount: number;
    matchScore: number;
    requiresChildRequote: boolean;
    reasons: string[];
    warnings: string[];
    historicalVerdict: HistoricalPriceCheck["verdict"];
    createdAt: string;
  }>;
  historicalBenchmark: HistoricalPriceCheck | null;
}

// ============================================================================
// CARREGADORES COMPARTILHADOS DE CONTEXTO (HISTORICO, COOLDOWN E DEMANDAS)
// ============================================================================

async function loadStoreHistoricalObservations(
  storeId: string
): Promise<HistoricalPriceObservationInput[]> {
  const supabase = getServerClient();
  const observations: HistoricalPriceObservationInput[] = [];

  try {
    const [{ data: obsRows }, { data: captureRows }, { data: propRows }, { data: quoteRows }] = await Promise.all([
      supabase
        .from("travel_price_observations")
        .select("id, route_fingerprint, price_cents, observed_at, source")
        .eq("store_id", storeId)
        .order("observed_at", { ascending: false })
        .limit(120),
      supabase
        .from("travel_quote_captures")
        .select("id, destination_city, total_cents, adults_count, children_count, created_at")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(80),
      supabase
        .from("travel_proposals")
        .select("id, destination_city, title, pricing, adults_count, children_count, created_at")
        .eq("store_id", storeId)
        .in("status", ["sent", "viewed", "accepted"])
        .order("created_at", { ascending: false })
        .limit(80),
      supabase
        .from("travel_quotes")
        .select("id, destination_city, quote_amount_cents, adults_count, children_count, created_at")
        .eq("store_id", storeId)
        .gt("quote_amount_cents", 0)
        .order("created_at", { ascending: false })
        .limit(80),
    ]);

    for (const o of obsRows || []) {
      if (Number(o.price_cents) > 0 && o.route_fingerprint) {
        observations.push({
          id: String(o.id),
          destination: String(o.route_fingerprint).replace(/[-_>/]/g, " "),
          totalCents: Number(o.price_cents),
          adultsCount: 2,
          source: String(o.source || "observation"),
          observedAt: o.observed_at ? String(o.observed_at) : undefined,
        });
      }
    }

    for (const c of captureRows || []) {
      if (Number(c.total_cents) > 0 && c.destination_city) {
        observations.push({
          id: String(c.id),
          destination: String(c.destination_city),
          totalCents: Number(c.total_cents),
          adultsCount: Number(c.adults_count || 2),
          childrenCount: Number(c.children_count || 0),
          source: "capture",
          observedAt: c.created_at ? String(c.created_at) : undefined,
        });
      }
    }

    for (const p of propRows || []) {
      const pricing = (p.pricing || {}) as Record<string, unknown>;
      const total = Number(
        pricing.totalCents ||
          pricing.total_cents ||
          pricing.total_price_cents ||
          pricing.finalTotalCents ||
          0
      );
      const dest = String(p.destination_city || p.title || "").trim();
      if (total > 0 && dest) {
        observations.push({
          id: String(p.id),
          destination: dest,
          totalCents: total,
          adultsCount: Number(p.adults_count || 2),
          childrenCount: Number(p.children_count || 0),
          source: "proposal",
          observedAt: p.created_at ? String(p.created_at) : undefined,
        });
      }
    }

    for (const q of quoteRows || []) {
      const total = Number(q.quote_amount_cents || 0);
      const dest = String(q.destination_city || "").trim();
      if (total > 0 && dest) {
        observations.push({
          id: String(q.id),
          destination: dest,
          totalCents: total,
          adultsCount: Number(q.adults_count || 2),
          childrenCount: Number(q.children_count || 0),
          source: "quote",
          observedAt: q.created_at ? String(q.created_at) : undefined,
        });
      }
    }
  } catch {
    // Resiliente se alguma tabela auxiliar estiver vazia
  }

  return observations;
}

async function loadRecentProposalsByLeadMap(
  storeId: string,
  cooldownDays = 30
): Promise<Map<string, RecentLeadProposalRef[]>> {
  const map = new Map<string, RecentLeadProposalRef[]>();
  const cutoffIso = new Date(Date.now() - cooldownDays * 86_400_000).toISOString();
  try {
    const supabase = getServerClient();
    const { data } = await supabase
      .from("travel_proposals")
      .select("id, lead_id, title, destination_city, travel_start_date, created_at")
      .eq("store_id", storeId)
      .not("lead_id", "is", null)
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: false })
      .limit(250);

    for (const row of data || []) {
      if (!row.lead_id) continue;
      const list = map.get(String(row.lead_id)) || [];
      list.push({
        id: String(row.id),
        title: row.title ? String(row.title) : undefined,
        destinationNormalized: normalizeOpportunityText(String(row.destination_city || row.title || "")),
        departureDate: row.travel_start_date ? String(row.travel_start_date).slice(0, 10) : null,
        createdAt: String(row.created_at),
      });
      map.set(String(row.lead_id), list);
    }
  } catch {
    // Silencioso
  }
  return map;
}

function buildCanonicalDemandsFromStoreRows(params: {
  leadRows: Record<string, unknown>[];
  interestRows: Record<string, unknown>[];
  demandRows: Record<string, unknown>[];
  recentByLead: Map<string, RecentLeadProposalRef[]>;
}): CanonicalDemandLead[] {
  const candidates: CanonicalDemandLead[] = [];
  const seenLeadIds = new Set<string>();

  for (const row of params.leadRows) {
    const status = String(row.status || "").toLowerCase();
    if (["won", "lost", "archived", "opted_out", "closed_won", "closed_lost"].includes(status)) continue;
    const leadId = String(row.id);
    seenLeadIds.add(leadId);
    candidates.push(
      normalizeLegacyDemandToCanonical({
        ...row,
        demand_source: "lead_crm",
        lead_id: leadId,
        recent_proposals: params.recentByLead.get(leadId) || [],
      })
    );
  }

  for (const row of params.interestRows) {
    const status = String(row.status || "open").toLowerCase();
    if (["cancelled", "converted", "dormant"].includes(status)) continue;
    const contact = (row.travel_commercial_contacts || {}) as Record<string, unknown>;
    if (String(contact.status || "").toLowerCase() === "opted_out") continue;

    const linkedLeadId = (row.lead_id || contact.linked_crm_lead_id || null) as string | null;
    const datesObj = (row.dates || {}) as Record<string, unknown>;
    const partyObj = (row.party || {}) as Record<string, unknown>;
    const budgetObj = (row.budget || {}) as Record<string, unknown>;

    const demand = normalizeLegacyDemandToCanonical({
      id: row.id,
      demand_source: "travel_interest",
      lead_id: linkedLeadId,
      contact_id: row.contact_id,
      full_name: contact.name || row.title || "Interessado",
      whatsapp: contact.phone || null,
      destination_tags:
        Array.isArray(row.destination_tags) && row.destination_tags.length > 0
          ? row.destination_tags
          : row.destinations,
      preferred_destinations: row.destinations,
      destination: row.title,
      travel_start: datesObj.exactDepartureDate || null,
      travel_end: datesObj.exactReturnDate || null,
      target_months: datesObj.targetMonths || [],
      period_tags: row.period_tags || (datesObj.preferredSeason ? [String(datesObj.preferredSeason)] : []),
      flexibility_days: row.flexibility_days ?? (datesObj.flexibility === "flexible_plus_minus_7" ? 7 : 3),
      date_flexibility_mode: datesObj.flexibility === "flexible_anytime" ? "flexible_anytime" : undefined,
      date_flexible: datesObj.flexibility === "flexible_anytime",
      room_occupancies: row.room_occupancies,
      pax_adults: partyObj.adults ?? 2,
      pax_children: partyObj.children ?? 0,
      children_ages: partyObj.childAges || [],
      max_total_budget_cents: budgetObj.maxTotalBudgetCents || null,
      max_installment_cents: budgetObj.maxInstallmentCents || null,
      preferred_installments: budgetObj.preferredInstallments || null,
      wanted_inclusions: row.inclusions_wanted || [],
      raw_intent_markdown: row.raw_intent_markdown || row.source_inquiry_text || null,
      recent_proposals: linkedLeadId ? params.recentByLead.get(String(linkedLeadId)) || [] : [],
    });

    // Se o interesse pertence a um lead que ja foi avaliado diretamente, evita duplicidade se ja tem os mesmos destinos
    if (linkedLeadId && seenLeadIds.has(String(linkedLeadId))) {
      const parentLead = candidates.find((c) => c.leadId === String(linkedLeadId));
      if (parentLead) {
        // Enriquece o lead principal com destinos/orcamento/quartos do interesse sem duplicar linhas
        const mergedDest = normalizeDestinationTagList([...parentLead.destinations, ...demand.destinations]);
        parentLead.destinations = mergedDest;
        if (!parentLead.maxTotalBudgetCents && demand.maxTotalBudgetCents) {
          parentLead.maxTotalBudgetCents = demand.maxTotalBudgetCents;
        }
        if (parentLead.childrenAges.length === 0 && demand.childrenAges.length > 0) {
          parentLead.childrenAges = demand.childrenAges;
          parentLead.rooms = demand.rooms;
        }
        continue;
      }
    }

    candidates.push(demand);
  }

  for (const dRow of params.demandRows) {
    if (String(dRow.status || "active") !== "active") continue;
    const crmLeadId = (dRow.crm_lead_id || null) as string | null;
    if (crmLeadId && seenLeadIds.has(String(crmLeadId))) continue;

    candidates.push(
      normalizeLegacyDemandToCanonical({
        id: dRow.id,
        demand_source: "client_demand",
        lead_id: crmLeadId,
        full_name: dRow.contact_name || "Demanda",
        whatsapp: dRow.contact_phone || null,
        destination: dRow.destination_city || "",
        earliest_departure: dRow.earliest_departure || null,
        latest_departure: dRow.latest_departure || null,
        budget_max_cents: dRow.budget_max_cents || null,
        pax_adults: dRow.adults_count || 2,
        pax_children: dRow.children_count || 0,
      })
    );
  }

  return candidates;
}

function mapHistoricalVerdictToTemperature(
  verdict: HistoricalPriceCheck["verdict"]
): "cold" | "moderate" | "warm" | "insufficient_data" {
  if (verdict === "great_deal") return "cold";
  if (verdict === "fair_price") return "moderate";
  if (verdict === "above_market") return "warm";
  return "insufficient_data";
}

function buildOpportunityRowFromEvaluation(params: {
  storeId: string;
  offer: CanonicalSupplyOffer;
  demand: CanonicalDemandLead;
  evalResult: UnifiedOpportunityResult;
  sourceProposalId?: string | null;
  sourceQuoteId?: string | null;
  sourceCaptureId?: string | null;
  sourceClassifiedId?: string | null;
}): Record<string, unknown> {
  const variancePct =
    params.evalResult.budgetVariancePct !== null
      ? Math.max(-999, Math.min(999, Number(params.evalResult.budgetVariancePct.toFixed(2))))
      : 0;

  return {
    store_id: params.storeId,
    demand_id: params.demand.demandSource === "client_demand" ? params.demand.id : null,
    capture_id: params.sourceCaptureId || null,
    source_proposal_id: params.sourceProposalId || null,
    source_quote_id: params.sourceQuoteId || null,
    source_classified_id: params.sourceClassifiedId || null,
    source_type: params.offer.sourceType,
    offer_title: params.offer.title || params.offer.destinationCity,
    destination_city: params.offer.destinationCity,
    departure_date: params.offer.departureDate ? String(params.offer.departureDate).slice(0, 10) : null,
    adults_count: Math.max(1, Math.round(params.offer.quotedAdultsCount || 2)),
    children_count: Math.max(0, Math.round(params.offer.quotedChildrenCount || 0)),
    lead_id: params.demand.leadId || null,
    target_lead_id: params.demand.leadId || null,
    target_interest_id: params.demand.demandSource === "travel_interest" ? params.demand.id : null,
    match_score: Math.round(params.evalResult.matchScore * 100) / 100,
    match_reasons: params.evalResult.matchReasons,
    quoted_total_cents: Math.max(0, Math.round(params.offer.totalPriceCents || 0)),
    simulated_total_cents: Math.max(0, Math.round(params.evalResult.effectiveOfferTotalCents || 0)),
    client_budget_cents: Math.max(0, Math.round(params.demand.maxTotalBudgetCents || 0)),
    variance_pct: variancePct,
    historical_reference_median_cents: params.evalResult.historicalCheck.historicalMedianCents,
    tariff_temperature: mapHistoricalVerdictToTemperature(params.evalResult.historicalCheck.verdict),
    status: "open",
    whatsapp_pitch_draft: params.evalResult.suggestedPitchPt,
    requires_child_requote: params.evalResult.requiresChildRequote,
    child_simulation: params.evalResult.childSimulation,
    historical_check: params.evalResult.historicalCheck,
    already_proposed_recently: params.evalResult.alreadyProposedRecently,
    warnings: params.evalResult.warnings,
    match_tier: params.evalResult.matchTier,
    match_version: "unified_v2",
    updated_at: new Date().toISOString(),
  };
}

// ============================================================================
// PERSISTENCIA SEGURA DE OPORTUNIDADES (UPSERT + LOG + FALLBACK SELECT/UPDATE)
// ============================================================================

const OPTIONAL_OPP_SNAPSHOT_COLS = [
  "offer_title",
  "destination_city",
  "departure_date",
  "adults_count",
  "children_count",
] as const;

function stripOptionalOppSnapshotCols(payload: Record<string, unknown>): Record<string, unknown> {
  const clone = { ...payload };
  for (const col of OPTIONAL_OPP_SNAPSHOT_COLS) {
    delete clone[col];
  }
  return clone;
}

async function persistTravelOpportunitySafe(
  supabase: ReturnType<typeof getServerClient>,
  oppPayload: Record<string, unknown>,
  onConflictCols?: string | null
): Promise<boolean> {
  const isMissingCol = (err: { code?: string; message?: string } | null | undefined) =>
    Boolean(err && /42703|column .* does not exist|PGRST204/i.test(`${err.code || ""} ${err.message || ""}`));

  if (onConflictCols) {
    const conflictKeys = onConflictCols.split(",").map((k) => k.trim()).filter(Boolean);
    let lookup = supabase
      .from("travel_opportunities")
      .select("id, status")
      .eq("store_id", String(oppPayload.store_id || ""));
    for (const key of conflictKeys) {
      if (key === "store_id") continue;
      const val = oppPayload[key];
      lookup = val == null ? lookup.is(key, null) : lookup.eq(key, val);
    }
    const { data: existing } = await lookup.limit(1).maybeSingle();
    if (existing?.id) {
      const existingStatus = String(existing.status || "open").toLowerCase();
      const preserveStatus = existingStatus !== "open" && existingStatus !== "new";
      const safePatch = preserveStatus
        ? { ...oppPayload, status: existing.status }
        : oppPayload;
      let { error: updErr } = await supabase
        .from("travel_opportunities")
        .update(safePatch)
        .eq("id", existing.id)
        .eq("store_id", String(oppPayload.store_id || ""));
      if (isMissingCol(updErr)) {
        ({ error: updErr } = await supabase
          .from("travel_opportunities")
          .update(stripOptionalOppSnapshotCols(safePatch))
          .eq("id", existing.id)
          .eq("store_id", String(oppPayload.store_id || "")));
      }
      if (!updErr) return true;
      console.warn(`[opportunity-radar] existing update failed: ${updErr.message}`);
      return false;
    }

    let { error: upsertErr } = await supabase
      .from("travel_opportunities")
      .upsert(oppPayload, { onConflict: onConflictCols });
    if (isMissingCol(upsertErr)) {
      ({ error: upsertErr } = await supabase
        .from("travel_opportunities")
        .upsert(stripOptionalOppSnapshotCols(oppPayload), { onConflict: onConflictCols }));
    }
    if (!upsertErr) return true;
    console.warn(
      `[opportunity-radar] upsert failed (${onConflictCols}): ${upsertErr.code || ""} ${upsertErr.message}`
    );

    let { error: insErr } = await supabase.from("travel_opportunities").insert(oppPayload);
    if (isMissingCol(insErr)) {
      ({ error: insErr } = await supabase
        .from("travel_opportunities")
        .insert(stripOptionalOppSnapshotCols(oppPayload)));
    }
    if (!insErr) return true;
    console.warn(`[opportunity-radar] fallback insert failed: ${insErr.message}`);
    return false;
  }

  let { error: insertErr } = await supabase.from("travel_opportunities").insert(oppPayload);
  if (isMissingCol(insertErr)) {
    ({ error: insertErr } = await supabase
      .from("travel_opportunities")
      .insert(stripOptionalOppSnapshotCols(oppPayload)));
  }
  if (!insertErr) return true;
  console.warn(`[opportunity-radar] insert failed: ${insertErr.message}`);
  return false;
}

// ============================================================================
// MOTOR BIDIRECIONAL 1: OFERTA/PROPOSTA -> TODOS OS LEADS E INTERESSES
// ============================================================================

export async function internalEvaluateSupplyAgainstAllLeads(params: {
  storeId: string;
  offer: CanonicalSupplyOffer;
  sourceProposalId?: string | null;
  sourceQuoteId?: string | null;
  sourceCaptureId?: string | null;
  sourceClassifiedId?: string | null;
  dryRun?: boolean;
  minScore?: number;
}): Promise<RadarEvaluationSummary & { standaloneHistoricalCheck?: HistoricalPriceCheck }> {
  const supabase = getServerClient();
  const [
    { data: leadRows },
    { data: interestRows },
    { data: demandRows },
    historicalObservations,
    recentByLead,
  ] = await Promise.all([
    supabase
      .from("leads_crm")
      .select(
        "id, full_name, phone, whatsapp, destination, destination_tags, origin_city, origin_iata, travel_start, travel_end, interest_period, period_tags, target_months, flexibility_days, date_flexibility_mode, room_occupancies, pax_adults, pax_children, pax_ages, children_ages, rooms_count, budget_cents, estimated_value_cents, status, custom_fields, raw_intent_markdown, notes"
      )
      .eq("store_id", params.storeId)
      .limit(400),
    supabase
      .from("travel_interests")
      .select(
        "id, contact_id, lead_id, title, destinations, destination_tags, dates, period_tags, flexibility_days, party, room_occupancies, budget, inclusions_wanted, raw_intent_markdown, source_inquiry_text, status, travel_commercial_contacts(id, name, phone, status, linked_crm_lead_id)"
      )
      .eq("store_id", params.storeId)
      .in("status", ["open", "matched", "nurturing"])
      .limit(300),
    supabase
      .from("travel_client_demands")
      .select("*")
      .eq("store_id", params.storeId)
      .eq("status", "active")
      .limit(200),
    loadStoreHistoricalObservations(params.storeId),
    loadRecentProposalsByLeadMap(params.storeId, 30),
  ]);

  const candidates = buildCanonicalDemandsFromStoreRows({
    leadRows: (leadRows || []) as Record<string, unknown>[],
    interestRows: (interestRows || []) as Record<string, unknown>[],
    demandRows: (demandRows || []) as Record<string, unknown>[],
    recentByLead,
  });

  const minScore = typeof params.minScore === "number" ? params.minScore : 60;
  const matchedLeads: RadarMatchLeadPreview[] = [];
  let persistedCount = 0;

  for (const demand of candidates) {
    const evalResult = evaluateUnifiedOpportunityMatch(params.offer, demand, {
      minScore,
      historicalObservations,
    });

    if (!evalResult.isMatch) continue;

    const childAges = demand.childrenAges || [];
    const roomsSummary = `${Math.max(1, demand.rooms.length)} qto · ${demand.adultsCount} adt${
      childAges.length > 0 ? ` · ${childAges.length} cri. (${childAges.join(", ")}a)` : ""
    }`;

    matchedLeads.push({
      targetType: demand.demandSource,
      leadId: demand.leadId || null,
      interestId: demand.demandSource === "travel_interest" ? demand.id : null,
      demandId: demand.demandSource === "client_demand" ? demand.id : null,
      contactId: demand.contactId || null,
      fullName: demand.fullName,
      whatsapp: demand.whatsapp || null,
      destinationRequested: demand.destinations.map((d) => d.label).join(", "),
      roomsSummary,
      clientBudgetCents: demand.maxTotalBudgetCents || null,
      matchScore: evalResult.matchScore,
      matchTier: evalResult.matchTier,
      requiresChildRequote: evalResult.requiresChildRequote,
      effectiveTotalCents: evalResult.effectiveOfferTotalCents,
      childSimulation: evalResult.childSimulation,
      historicalCheck: evalResult.historicalCheck,
      historicalVerdict: evalResult.historicalCheck.verdict,
      historicalSavingsPct: evalResult.historicalCheck.historicalSavingsPct,
      alreadyProposedRecently: evalResult.alreadyProposedRecently,
      reasons: evalResult.matchReasons,
      warnings: evalResult.warnings,
      suggestedPitchPt: evalResult.suggestedPitchPt,
    });

    if (params.dryRun) continue;

    // Persistencia nao-destrutiva na tabela unificada `travel_opportunities`
    try {
      const oppPayload = buildOpportunityRowFromEvaluation({
        storeId: params.storeId,
        offer: params.offer,
        demand,
        evalResult,
        sourceProposalId: params.sourceProposalId,
        sourceQuoteId: params.sourceQuoteId,
        sourceCaptureId: params.sourceCaptureId,
        sourceClassifiedId: params.sourceClassifiedId,
      });

      let onConflictCols: string | undefined;
      if (params.sourceProposalId && demand.leadId) {
        onConflictCols = "store_id,source_proposal_id,target_lead_id";
      } else if (params.sourceProposalId && demand.demandSource === "travel_interest") {
        onConflictCols = "store_id,source_proposal_id,target_interest_id";
      } else if (params.sourceQuoteId && demand.leadId) {
        onConflictCols = "store_id,source_quote_id,target_lead_id";
      } else if (params.sourceCaptureId && demand.leadId) {
        onConflictCols = "lead_id,capture_id";
      } else if (params.sourceCaptureId && demand.demandSource === "client_demand") {
        onConflictCols = "demand_id,capture_id";
      }

      if (await persistTravelOpportunitySafe(supabase, oppPayload, onConflictCols)) {
        persistedCount++;
      }

      // Se houver leadId no CRM, atualiza carimbo `last_matched_at` sem sobrescrever custom_fields existentes
      if (demand.leadId) {
        await supabase
          .from("leads_crm")
          .update({ last_matched_at: new Date().toISOString() })
          .eq("id", demand.leadId)
          .eq("store_id", params.storeId);
      }

      if (demand.demandSource === "travel_interest") {
        await supabase
          .from("travel_interests")
          .update({ status: "matched", updated_at: new Date().toISOString() })
          .eq("id", demand.id)
          .eq("store_id", params.storeId)
          .eq("status", "open");
      }
    } catch {
      // Nao falha
    }
  }

  matchedLeads.sort((a, b) => b.matchScore - a.matchScore);
  const effectivePerAdult = Math.round(
    Math.max(0, params.offer.totalPriceCents || 0) / Math.max(1, params.offer.quotedAdultsCount || 2)
  );
  const standaloneSimulation: ChildSimulationResult = {
    applied: false,
    requiresChildRequote: false,
    reasonPt: "Base padrão para análise histórica",
    baseOfferAdultsCount: Math.max(1, params.offer.quotedAdultsCount || 2),
    basePerAdultCents: effectivePerAdult,
    simulatedAirPlusTransferPerChildCents: 0,
    simulationSource: "not_needed",
    simulatedAirSharePct: 0,
    adultsSubtotalCents: params.offer.totalPriceCents || 0,
    childrenSubtotalCents: 0,
    simulatedTotalCents: params.offer.totalPriceCents || 0,
    deltaVsOfferTotalCents: 0,
    infantsCount: 0,
    chd2to11Count: 0,
    teens12to17Count: 0,
    perChildBreakdown: [],
  };
  const standaloneHistoricalCheck = evaluateHistoricalAdvantage(
    params.offer,
    standaloneSimulation,
    historicalObservations
  );

  return {
    supplyId: params.offer.id,
    supplySourceType: params.offer.sourceType,
    destinationCity: params.offer.destinationCity,
    evaluatedDemandsCount: candidates.length,
    matchedCount: matchedLeads.length,
    persistedCount,
    matchedLeads: matchedLeads.slice(0, 30),
    standaloneHistoricalCheck,
  };
}

// ============================================================================
// MOTOR BIDIRECIONAL 2: NOVO/ATUALIZADO LEAD OU INTERESSE -> OFERTAS DA LOJA
// ============================================================================

export async function internalEvaluateDemandAgainstAllSupply(params: {
  storeId: string;
  leadId?: string | null;
  interestId?: string | null;
}): Promise<{ matchedCount: number; persistedCount: number }> {
  const supabase = getServerClient();
  let demand: CanonicalDemandLead | null = null;
  const recentByLead = await loadRecentProposalsByLeadMap(params.storeId, 30);

  if (params.leadId) {
    const { data: leadRow } = await supabase
      .from("leads_crm")
      .select(
        "id, full_name, phone, whatsapp, destination, destination_tags, origin_city, origin_iata, travel_start, travel_end, interest_period, period_tags, target_months, flexibility_days, date_flexibility_mode, room_occupancies, pax_adults, pax_children, pax_ages, children_ages, rooms_count, budget_cents, estimated_value_cents, status, custom_fields, raw_intent_markdown, notes"
      )
      .eq("id", params.leadId)
      .eq("store_id", params.storeId)
      .maybeSingle();

    if (leadRow) {
      const leadStatusNorm = String(leadRow.status || "open").toLowerCase();
      if (["won", "lost", "archived", "opted_out", "closed_won", "closed_lost"].includes(leadStatusNorm)) {
        return { matchedCount: 0, persistedCount: 0 };
      }
      demand = normalizeLegacyDemandToCanonical({
        ...leadRow,
        demand_source: "lead_crm",
        lead_id: leadRow.id,
        recent_proposals: recentByLead.get(String(leadRow.id)) || [],
      });
    }
  } else if (params.interestId) {
    const { data: intRow } = await supabase
      .from("travel_interests")
      .select("*, travel_commercial_contacts(id, name, phone, status, linked_crm_lead_id)")
      .eq("id", params.interestId)
      .eq("store_id", params.storeId)
      .maybeSingle();
    if (intRow) {
      const built = buildCanonicalDemandsFromStoreRows({
        leadRows: [],
        interestRows: [intRow as Record<string, unknown>],
        demandRows: [],
        recentByLead,
      });
      demand = built[0] || null;
    }
  }

  if (!demand || demand.destinations.length === 0) {
    return { matchedCount: 0, persistedCount: 0 };
  }

  const cutoffIso = new Date(Date.now() - 45 * 86_400_000).toISOString();
  const [{ data: propRows }, { data: captureRows }, { data: quoteRows }, historicalObservations] = await Promise.all([
    supabase
      .from("travel_proposals")
      .select("id, lead_id, customer_id, title, destination_city, destination_iata, travel_start_date, travel_end_date, adults_count, children_count, children_ages, rooms_count, rooms, pricing, airfare_per_adult_cents, transfer_per_adult_cents, status, created_at")
      .eq("store_id", params.storeId)
      .in("status", ["draft", "sent", "viewed", "accepted"])
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("travel_quote_captures")
      .select("id, operator_slug, source_page, origin_city, destination_city, start_date, end_date, total_cents, adults_count, children_count, lead_id, created_at")
      .eq("store_id", params.storeId)
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("travel_quotes")
      .select("id, protocol_number, contact_name, origin_city, origin_iata, destination_city, destination_iata, departure_date, return_date, adults_count, children_count, children_ages, room_occupancies, quote_amount_cents, lead_id, created_at")
      .eq("store_id", params.storeId)
      .gt("quote_amount_cents", 0)
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: false })
      .limit(40),
    loadStoreHistoricalObservations(params.storeId),
  ]);

  let matchedCount = 0;
  let persistedCount = 0;

  const processSupply = async (
    offer: CanonicalSupplyOffer,
    refs: { proposalId?: string | null; quoteId?: string | null; captureId?: string | null }
  ) => {
    const evalResult = evaluateUnifiedOpportunityMatch(offer, demand!, {
      minScore: 60,
      historicalObservations,
    });
    if (!evalResult.isMatch) return;
    matchedCount++;

    const payload = buildOpportunityRowFromEvaluation({
      storeId: params.storeId,
      offer,
      demand: demand!,
      evalResult,
      sourceProposalId: refs.proposalId,
      sourceQuoteId: refs.quoteId,
      sourceCaptureId: refs.captureId,
    });

    try {
      let conflict: string | undefined;
      if (refs.proposalId && demand!.leadId) conflict = "store_id,source_proposal_id,target_lead_id";
      else if (refs.proposalId && demand!.demandSource === "travel_interest") conflict = "store_id,source_proposal_id,target_interest_id";
      else if (refs.quoteId && demand!.leadId) conflict = "store_id,source_quote_id,target_lead_id";
      else if (refs.captureId && demand!.leadId) conflict = "lead_id,capture_id";

      if (await persistTravelOpportunitySafe(supabase, payload, conflict)) {
        persistedCount++;
      }
    } catch {
      // Nao falha
    }
  };

  for (const p of propRows || []) {
    if (demand.leadId && p.lead_id === demand.leadId) continue;
    const offer = normalizeLegacyOfferToCanonical({ ...p, source_type: "proposal" });
    await processSupply(offer, { proposalId: String(p.id) });
  }

  for (const c of captureRows || []) {
    if (demand.leadId && c.lead_id === demand.leadId) continue;
    const offer = normalizeLegacyOfferToCanonical({
      ...c,
      source_type: "quote_capture",
      title: `Captura ${c.operator_slug || "InfoTravel"}: ${c.destination_city}`,
    });
    await processSupply(offer, { captureId: String(c.id) });
  }

  for (const q of quoteRows || []) {
    if (demand.leadId && q.lead_id === demand.leadId) continue;
    const quoteLabel = q.protocol_number
      ? `Cotação ${q.protocol_number} — ${q.destination_city}`
      : `Cotação ${q.destination_city}`;
    const offer = normalizeLegacyOfferToCanonical({
      ...q,
      title: quoteLabel,
      total_cents: Number(q.quote_amount_cents || 0),
      source_type: "agency_quote",
      rooms: q.room_occupancies,
    });
    await processSupply(offer, { quoteId: String(q.id) });
  }

  if (params.leadId && matchedCount > 0) {
    await supabase
      .from("leads_crm")
      .update({ last_matched_at: new Date().toISOString() })
      .eq("id", params.leadId)
      .eq("store_id", params.storeId);
  }

  return { matchedCount, persistedCount };
}

// ============================================================================
// MOTOR DE VERIFICACAO PARA O DOSSIE DO LEAD (SUBSTITUI F-OPP-01 E F-OPP-02)
// ============================================================================

export async function internalGetVerifiedOpportunitiesForLead(params: {
  storeId: string;
  leadId: string;
}): Promise<LeadVerifiedOpportunitiesBundle> {
  const supabase = getServerClient();
  const { data: leadRow } = await supabase
    .from("leads_crm")
    .select(
      "id, full_name, phone, whatsapp, destination, destination_tags, origin_city, origin_iata, travel_start, travel_end, interest_period, period_tags, target_months, flexibility_days, date_flexibility_mode, room_occupancies, pax_adults, pax_children, pax_ages, children_ages, rooms_count, budget_cents, estimated_value_cents, status, custom_fields"
    )
    .eq("id", params.leadId)
    .eq("store_id", params.storeId)
    .maybeSingle();

  if (!leadRow) {
    return {
      verifiedOpportunities: [],
      verifiedSimilarProposals: [],
      verifiedCaptures: [],
      historicalBenchmark: null,
    };
  }

  const recentByLead = await loadRecentProposalsByLeadMap(params.storeId, 30);
  const demand = normalizeLegacyDemandToCanonical({
    ...leadRow,
    demand_source: "lead_crm",
    lead_id: leadRow.id,
    recent_proposals: recentByLead.get(String(leadRow.id)) || [],
  });

  // Se o lead nao tem destino definido, nao devolve propostas nem capturas aleatorias
  if (demand.destinations.length === 0) {
    return {
      verifiedOpportunities: [],
      verifiedSimilarProposals: [],
      verifiedCaptures: [],
      historicalBenchmark: null,
    };
  }

  const [{ data: otherProposals }, { data: captures }, { data: persistedOpps }, historicalObservations] =
    await Promise.all([
      supabase
        .from("travel_proposals")
        .select(
          "id, lead_id, public_token, title, destination_city, destination_iata, travel_start_date, travel_end_date, adults_count, children_count, children_ages, rooms_count, rooms, client_name, status, pricing, airfare_per_adult_cents, transfer_per_adult_cents, created_at"
        )
        .eq("store_id", params.storeId)
        .or(`lead_id.is.null,lead_id.neq.${params.leadId}`)
        .order("created_at", { ascending: false })
        .limit(60),
      supabase
        .from("travel_quote_captures")
        .select(
          "id, operator_slug, source_page, origin_city, destination_city, start_date, end_date, total_cents, adults_count, children_count, lead_id, summary_pitch_text, created_at"
        )
        .eq("store_id", params.storeId)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("travel_opportunities")
        .select("*")
        .eq("store_id", params.storeId)
        .or(`target_lead_id.eq.${params.leadId},lead_id.eq.${params.leadId}`)
        .neq("status", "dismissed")
        .order("match_score", { ascending: false })
        .limit(20),
      loadStoreHistoricalObservations(params.storeId),
    ]);

  const verifiedSimilarProposals: LeadVerifiedOpportunitiesBundle["verifiedSimilarProposals"] = [];
  for (const p of otherProposals || []) {
    const offer = normalizeLegacyOfferToCanonical({ ...p, source_type: "proposal" });
    const evalRes = evaluateUnifiedOpportunityMatch(offer, demand, {
      minScore: 58,
      historicalObservations,
    });
    if (!evalRes.isMatch) continue;
    verifiedSimilarProposals.push({
      id: String(p.id),
      title: String(p.title || p.destination_city || "Proposta"),
      destinationCity: String(p.destination_city || ""),
      departureDate: offer.departureDate || null,
      adultsCount: offer.quotedAdultsCount,
      childrenCount: offer.quotedChildrenCount,
      totalCents: offer.totalPriceCents,
      effectiveTotalCents: evalRes.effectiveOfferTotalCents,
      matchScore: evalRes.matchScore,
      matchTier: evalRes.matchTier,
      requiresChildRequote: evalRes.requiresChildRequote,
      reasons: evalRes.matchReasons,
      warnings: evalRes.warnings,
      historicalVerdict: evalRes.historicalCheck.verdict,
      historicalSavingsPct: evalRes.historicalCheck.historicalSavingsPct,
      publicToken: p.public_token ? String(p.public_token) : null,
      clientName: p.client_name ? String(p.client_name) : null,
      status: p.status ? String(p.status) : null,
      createdAt: String(p.created_at),
    });
  }
  verifiedSimilarProposals.sort((a, b) => b.matchScore - a.matchScore);

  const verifiedCaptures: LeadVerifiedOpportunitiesBundle["verifiedCaptures"] = [];
  for (const c of captures || []) {
    const offer = normalizeLegacyOfferToCanonical({
      ...c,
      source_type: "quote_capture",
      title: c.destination_city,
    });
    const evalRes = evaluateUnifiedOpportunityMatch(offer, demand, {
      minScore: 58,
      historicalObservations,
    });
    if (!evalRes.isMatch) continue;
    verifiedCaptures.push({
      id: String(c.id),
      operatorSlug: String(c.operator_slug || "infotravel"),
      sourcePage: String(c.source_page || "orcamento_salvo"),
      destinationCity: String(c.destination_city || ""),
      startDate: c.start_date ? String(c.start_date) : null,
      totalCents: Number(c.total_cents || 0),
      effectiveTotalCents: evalRes.effectiveOfferTotalCents,
      adultsCount: Number(c.adults_count || 1),
      childrenCount: Number(c.children_count || 0),
      matchScore: evalRes.matchScore,
      requiresChildRequote: evalRes.requiresChildRequote,
      reasons: evalRes.matchReasons,
      warnings: evalRes.warnings,
      historicalVerdict: evalRes.historicalCheck.verdict,
      createdAt: String(c.created_at),
    });
  }
  verifiedCaptures.sort((a, b) => b.matchScore - a.matchScore);

  const proposalById = new Map<string, Record<string, unknown>>(
    (otherProposals || []).map((p: Record<string, unknown>) => [String(p.id), p])
  );
  const captureById = new Map<string, Record<string, unknown>>(
    (captures || []).map((c: Record<string, unknown>) => [String(c.id), c])
  );

  const verifiedOpportunities: UnifiedRadarOpportunityItem[] = (persistedOpps || []).map((row: Record<string, unknown>) => {
    const srcProp = row.source_proposal_id ? proposalById.get(String(row.source_proposal_id)) : undefined;
    const srcCap = row.capture_id ? captureById.get(String(row.capture_id)) : undefined;
    const hydratedTitle = srcProp
      ? String(srcProp.title || srcProp.destination_city || demand.destinations[0]?.label || "Proposta")
      : srcCap
        ? `Orçamento ${String(srcCap.operator_slug || "Operadora")} · ${String(srcCap.destination_city || "")}`
        : demand.destinations[0]?.label || "Oportunidade Verificada";
    const hydratedDest = String(
      srcProp?.destination_city || srcCap?.destination_city || demand.destinations[0]?.label || ""
    );
    const hydratedDeparture = (srcProp?.travel_start_date || srcCap?.start_date || null) as string | null;

    return {
      id: String(row.id),
      originTable: "travel_opportunities",
      sourceType: (row.source_type as UnifiedRadarOpportunityItem["sourceType"]) || "quote_capture",
      sourceId: (row.source_proposal_id || row.capture_id || row.source_quote_id || null) as string | null,
      offerTitle: hydratedTitle,
      destinationCity: hydratedDest,
      departureDate: hydratedDeparture,
      quotedTotalCents: Number(row.quoted_total_cents || 0),
      effectiveTotalCents: Number(row.simulated_total_cents || row.quoted_total_cents || 0),
      clientBudgetCents: Number(row.client_budget_cents || 0) || null,
      variancePct: row.variance_pct != null ? Number(row.variance_pct) : null,
      targetType: "lead_crm",
      leadId: params.leadId,
      interestId: (row.target_interest_id as string | null) || null,
      demandId: (row.demand_id as string | null) || null,
      contactId: null,
      customerName: demand.fullName,
      customerPhone: demand.whatsapp || null,
      customerDestinations: demand.destinations.map((d) => d.label),
      customerPeriodLabel: demand.period.displayLabel || null,
      customerRoomsSummary: `${demand.rooms.length} qto · ${demand.adultsCount} adt${demand.childrenAges.length ? ` · ${demand.childrenAges.length} cri.` : ""}`,
      matchScore: Number(row.match_score || 0),
      matchTier: String(row.match_tier || "strong_match"),
      normalizedStatus: normalizeStatusToUi(String(row.status || "open")),
      rawStatus: String(row.status || "open"),
      requiresChildRequote: Boolean(row.requires_child_requote),
      childSimulation: (row.child_simulation as ChildSimulationResult | null) || null,
      historicalCheck: (row.historical_check as HistoricalPriceCheck | null) || null,
      alreadyProposedRecently: Boolean(row.already_proposed_recently),
      matchReasons: Array.isArray(row.match_reasons) ? (row.match_reasons as string[]) : [],
      warnings: Array.isArray(row.warnings) ? (row.warnings as string[]) : [],
      whatsappPitchDraft: String(row.whatsapp_pitch_draft || ""),
      tariffTemperature: (row.tariff_temperature as string | null) || null,
      createdAt: String(row.created_at),
    };
  });

  // Benchmark historico do proprio destino principal do lead
  const refProposal = verifiedSimilarProposals[0];
  const refCapture = verifiedCaptures[0];
  const primaryOfferStub: CanonicalSupplyOffer = {
    id: "benchmark",
    sourceType: refProposal ? "proposal" : refCapture ? "quote_capture" : "proposal",
    title: demand.destinations[0].label,
    destinationCity: demand.destinations[0].city || demand.destinations[0].label,
    destinationIata: demand.destinations[0].iata || null,
    quotedAdultsCount: refProposal?.adultsCount ?? refCapture?.adultsCount ?? demand.adultsCount,
    quotedChildrenCount: refProposal?.childrenCount ?? refCapture?.childrenCount ?? 0,
    quotedChildrenAges: [],
    totalPriceCents: refProposal?.totalCents || refCapture?.totalCents || 0,
  };
  const historicalBenchmark =
    primaryOfferStub.totalPriceCents > 0
      ? evaluateUnifiedOpportunityMatch(primaryOfferStub, {
          ...demand,
          period: { mode: "flexible_anytime", targetMonths: [], seasonTags: [], flexibilityDays: 0, flexibleAnytime: true },
        }, { minScore: 1, historicalObservations }).historicalCheck
      : null;

  return {
    verifiedOpportunities,
    verifiedSimilarProposals: verifiedSimilarProposals.slice(0, 10),
    verifiedCaptures: verifiedCaptures.slice(0, 10),
    historicalBenchmark,
  };
}

function normalizeStatusToUi(raw: string): UnifiedRadarOpportunityItem["normalizedStatus"] {
  const s = raw.toLowerCase();
  if (s === "open" || s === "new") return "new";
  if (s === "viewed" || s === "reviewed") return "reviewed";
  if (s === "contacted" || s === "approached" || s === "engaged") return "approached";
  if (s === "converted" || s === "promoted_to_crm") return "promoted_to_crm";
  return "dismissed";
}

// ============================================================================
// SERVER FUNCTIONS PUBLICAS DO RADAR UNIFICADO
// ============================================================================

const ListUnifiedRadarInputSchema = z.object({
  statusFilter: z
    .enum(["all", "new", "reviewed", "approached", "promoted_to_crm", "dismissed"])
    .default("all"),
  sourceTypeFilter: z
    .enum(["all", "proposal", "quote_capture", "agency_quote", "catalog_package", "ocr_quote"])
    .default("all"),
  destinationQuery: z.string().trim().max(100).optional(),
  onlyHighScore: z.boolean().default(false),
  limit: z.number().int().min(10).max(250).default(100),
});

export const listUnifiedRadarOpportunitiesFn = createServerFn({ method: "POST" })
  .validator(ListUnifiedRadarInputSchema)
  .handler(async ({ data }): Promise<{ items: UnifiedRadarOpportunityItem[]; totalCount: number }> => {
    const staff = await requireStaff();
    const supabase = getServerClient();

    const [{ data: oppRows }, { data: matchRows }] = await Promise.all([
      supabase
        .from("travel_opportunities")
        .select(`
          *,
          leads_crm:target_lead_id(id, full_name, phone, whatsapp, destination, destination_tags, interest_period, target_months, travel_start, travel_end, room_occupancies, pax_adults, pax_children, children_ages),
          travel_client_demands:demand_id(id, contact_name, contact_phone, destination_city, earliest_departure, latest_departure, adults_count, children_count),
          travel_quote_captures:capture_id(id, operator_slug, destination_city, start_date, total_cents),
          travel_proposals:source_proposal_id(id, title, destination_city, travel_start_date, pricing)
        `)
        .eq("store_id", staff.store_id)
        .order("match_score", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(data.limit),
      supabase
        .from("travel_opportunity_matches")
        .select(`
          *,
          travel_interests:interest_id(id, title, destinations, destination_tags, dates, party, budget, room_occupancies),
          travel_commercial_contacts:contact_id(id, name, phone, linked_crm_lead_id),
          classifieds:offer_id(id, title, metadata)
        `)
        .eq("store_id", staff.store_id)
        .order("match_score", { ascending: false })
        .order("matched_at", { ascending: false })
        .limit(data.limit),
    ]);

    const unified: UnifiedRadarOpportunityItem[] = [];

    const quoteIds = Array.from(
      new Set((oppRows || []).map((r: any) => r.source_quote_id).filter(Boolean).map(String))
    );
    const interestIds = Array.from(
      new Set((oppRows || []).map((r: any) => r.target_interest_id).filter(Boolean).map(String))
    );
    const quoteById = new Map<string, Record<string, unknown>>();
    const interestById = new Map<string, Record<string, unknown>>();

    if (quoteIds.length > 0 || interestIds.length > 0) {
      const [quoteLookup, interestLookup] = await Promise.all([
        quoteIds.length > 0
          ? supabase
              .from("travel_quotes")
              .select("id, protocol_number, destination_city, departure_date, return_date, quote_amount_cents, adults_count, children_count, children_ages")
              .eq("store_id", staff.store_id)
              .in("id", quoteIds)
          : Promise.resolve({ data: [] }),
        interestIds.length > 0
          ? supabase
              .from("travel_interests")
              .select("id, title, destinations, destination_tags, dates, party, room_occupancies, travel_commercial_contacts(id, name, phone, linked_crm_lead_id)")
              .eq("store_id", staff.store_id)
              .in("id", interestIds)
          : Promise.resolve({ data: [] }),
      ]);
      for (const q of (quoteLookup.data || []) as Record<string, unknown>[]) {
        if (q.id) quoteById.set(String(q.id), q);
      }
      for (const it of (interestLookup.data || []) as Record<string, unknown>[]) {
        if (it.id) interestById.set(String(it.id), it);
      }
    }

    for (const r of oppRows || []) {
      const lead = (r.leads_crm || {}) as Record<string, unknown>;
      const demand = (r.travel_client_demands || {}) as Record<string, unknown>;
      const capture = (r.travel_quote_captures || {}) as Record<string, unknown>;
      const proposal = (r.travel_proposals || {}) as Record<string, unknown>;
      const quoteRow = r.source_quote_id ? quoteById.get(String(r.source_quote_id)) || {} : {};
      const interestRow = r.target_interest_id ? interestById.get(String(r.target_interest_id)) || {} : {};
      const interestContact = (interestRow.travel_commercial_contacts || {}) as Record<string, unknown>;
      const interestParty = (interestRow.party || {}) as Record<string, unknown>;

      const destCity = String(
        r.destination_city ||
          proposal.destination_city ||
          capture.destination_city ||
          quoteRow.destination_city ||
          lead.destination ||
          demand.destination_city ||
          (Array.isArray(interestRow.destinations) ? interestRow.destinations[0] : "") ||
          "Destino"
      );
      const quoteLabel = quoteRow.protocol_number
        ? `Cotação ${quoteRow.protocol_number} — ${destCity}`
        : quoteRow.destination_city
          ? `Cotação ${quoteRow.destination_city}`
          : "";
      const offerTitle = String(
        r.offer_title ||
          proposal.title ||
          quoteLabel ||
          (capture.operator_slug ? `Captura ${capture.operator_slug}: ${destCity}` : destCity)
      );
      const roomNorm = normalizeRoomsFromLeadOrLegacy({
        rooms: lead.room_occupancies || interestRow.room_occupancies,
        adultsCount: Number(lead.pax_adults || interestParty.adults || demand.adults_count || 2),
        childrenCount: Number(lead.pax_children || interestParty.children || demand.children_count || 0),
        childrenAges: lead.children_ages || interestParty.childAges || interestParty.childrenAges,
      });

      const interestDates = (interestRow.dates || {}) as Record<string, unknown>;
      const periodObj = normalizePeriodSpec({
        startDate: (lead.travel_start || demand.earliest_departure || interestDates.exactDepartureDate) as string | null,
        endDate: (lead.travel_end || demand.latest_departure || interestDates.exactReturnDate) as string | null,
        targetMonths: (lead.target_months as string[] | null) || (interestDates.targetMonths as string[] | null) || [],
        interestPeriodText: (lead.interest_period as string | null) || null,
      });

      unified.push({
        id: String(r.id),
        originTable: "travel_opportunities",
        sourceType: (r.source_type as UnifiedRadarOpportunityItem["sourceType"]) || "quote_capture",
        sourceId: (r.source_proposal_id || r.capture_id || r.source_quote_id || r.source_classified_id || null) as string | null,
        offerTitle,
        destinationCity: destCity,
        departureDate: (r.departure_date || proposal.travel_start_date || capture.start_date || quoteRow.departure_date || null) as string | null,
        quotedTotalCents: Number(r.quoted_total_cents || 0),
        effectiveTotalCents: Number(r.simulated_total_cents || r.quoted_total_cents || 0),
        clientBudgetCents: Number(r.client_budget_cents || 0) || null,
        variancePct: r.variance_pct != null ? Number(r.variance_pct) : null,
        targetType: r.target_lead_id || r.lead_id ? "lead_crm" : r.target_interest_id ? "travel_interest" : "client_demand",
        leadId: (r.target_lead_id || r.lead_id || interestContact.linked_crm_lead_id || null) as string | null,
        interestId: (r.target_interest_id || null) as string | null,
        demandId: (r.demand_id || null) as string | null,
        contactId: (interestContact.id || null) as string | null,
        customerName: String(lead.full_name || interestContact.name || demand.contact_name || interestRow.title || "Cliente"),
        customerPhone: (lead.whatsapp || lead.phone || interestContact.phone || demand.contact_phone || null) as string | null,
        customerDestinations: normalizeDestinationTagList(
          (lead.destination_tags || interestRow.destination_tags) as string[] | undefined,
          String(lead.destination || demand.destination_city || (Array.isArray(interestRow.destinations) ? interestRow.destinations[0] : "") || destCity)
        ).map((d) => d.label),
        customerPeriodLabel: periodObj.displayLabel || null,
        customerRoomsSummary: `${roomNorm.rooms.length} qto · ${roomNorm.adultsCount} adt${
          roomNorm.childrenCount > 0 ? ` · ${roomNorm.childrenCount} cri. (${roomNorm.childrenAges.join(", ")}a)` : ""
        }`,
        matchScore: Number(r.match_score || 0),
        matchTier: String(r.match_tier || "strong_match"),
        normalizedStatus: normalizeStatusToUi(String(r.status || "open")),
        rawStatus: String(r.status || "open"),
        requiresChildRequote: Boolean(r.requires_child_requote),
        childSimulation: (r.child_simulation as ChildSimulationResult | null) || null,
        historicalCheck: (r.historical_check as HistoricalPriceCheck | null) || null,
        alreadyProposedRecently: Boolean(r.already_proposed_recently),
        matchReasons: Array.isArray(r.match_reasons) ? (r.match_reasons as string[]) : [],
        warnings: Array.isArray(r.warnings) ? (r.warnings as string[]) : [],
        whatsappPitchDraft: String(r.whatsapp_pitch_draft || ""),
        tariffTemperature: (r.tariff_temperature as string | null) || null,
        createdAt: String(r.created_at),
      });
    }

    for (const m of matchRows || []) {
      const interest = (m.travel_interests || {}) as Record<string, unknown>;
      const contact = (m.travel_commercial_contacts || {}) as Record<string, unknown>;
      const snapshot = (m.offer_snapshot || {}) as Record<string, unknown>;
      const dims = Array.isArray(m.dimensions) ? (m.dimensions as Array<{ details?: string }>) : [];
      const partyObj = (interest.party || {}) as Record<string, unknown>;
      const budgetObj = (interest.budget || {}) as Record<string, unknown>;
      const childAges = Array.isArray(partyObj.childAges) ? (partyObj.childAges as number[]) : [];

      unified.push({
        id: String(m.id),
        originTable: "travel_opportunity_matches",
        sourceType: "catalog_package",
        sourceId: m.offer_id ? String(m.offer_id) : null,
        offerTitle: String(snapshot.title || interest.title || "Pacote / Oferta"),
        destinationCity: String(snapshot.destinationCity || (Array.isArray(interest.destinations) ? interest.destinations[0] : "") || ""),
        departureDate: snapshot.datesDisplayText ? String(snapshot.datesDisplayText) : null,
        quotedTotalCents: Number(snapshot.totalPriceCents || 0),
        effectiveTotalCents: Number(m.simulated_total_cents || snapshot.totalPriceCents || 0),
        clientBudgetCents: Number(budgetObj.maxTotalBudgetCents || 0) || null,
        variancePct: null,
        targetType: "travel_interest",
        leadId: (m.lead_id || contact.linked_crm_lead_id || null) as string | null,
        interestId: m.interest_id ? String(m.interest_id) : null,
        demandId: null,
        contactId: m.contact_id ? String(m.contact_id) : null,
        customerName: String(contact.name || interest.title || "Contato Comercial"),
        customerPhone: contact.phone ? String(contact.phone) : null,
        customerDestinations: Array.isArray(interest.destinations) ? (interest.destinations as string[]) : [],
        customerPeriodLabel: null,
        customerRoomsSummary: `${partyObj.adults || 2} adt${
          childAges.length > 0 ? ` · ${childAges.length} cri. (${childAges.join(", ")}a)` : ""
        }`,
        matchScore: Number(m.match_score || 0),
        matchTier: String(m.match_tier || (Number(m.match_score) >= 85 ? "exact_match" : "strong_match")),
        normalizedStatus: normalizeStatusToUi(String(m.status || "new")),
        rawStatus: String(m.status || "new"),
        requiresChildRequote: Boolean(m.requires_child_requote),
        childSimulation: (m.child_simulation as ChildSimulationResult | null) || null,
        historicalCheck: (m.historical_check as HistoricalPriceCheck | null) || null,
        alreadyProposedRecently: Boolean(m.already_proposed_recently),
        matchReasons: dims.map((d) => d.details || "").filter(Boolean),
        warnings: Array.isArray(m.warnings) ? (m.warnings as string[]) : [],
        whatsappPitchDraft: String(m.approach_draft || ""),
        tariffTemperature: null,
        createdAt: String(m.matched_at || m.created_at),
      });
    }

    const filtered = unified.filter((item) => {
      if (data.statusFilter !== "all" && item.normalizedStatus !== data.statusFilter) return false;
      if (data.sourceTypeFilter !== "all" && item.sourceType !== data.sourceTypeFilter) return false;
      if (data.onlyHighScore && item.matchScore < 80) return false;
      if (data.destinationQuery) {
        const q = normalizeOpportunityText(data.destinationQuery);
        const hay = normalizeOpportunityText(
          `${item.destinationCity} ${item.offerTitle} ${item.customerName} ${item.customerDestinations.join(" ")}`
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    filtered.sort((a, b) => b.matchScore - a.matchScore || b.createdAt.localeCompare(a.createdAt));

    return { items: filtered.slice(0, data.limit), totalCount: filtered.length };
  });

export const reEvaluateUnifiedRadarFn = createServerFn({ method: "POST" })
  .validator(z.object({ maxSuppliesToScan: z.number().int().min(1).max(60).default(25) }))
  .handler(async ({ data }): Promise<{ scannedSupplies: number; totalMatchesFound: number; persistedCount: number }> => {
    const staff = await requireStaff();
    const supabase = getServerClient();
    const cutoffIso = new Date(Date.now() - 45 * 86_400_000).toISOString();

    const [{ data: proposals }, { data: captures }, { data: quotes }] = await Promise.all([
      supabase
        .from("travel_proposals")
        .select("id, lead_id, customer_id, title, destination_city, destination_iata, travel_start_date, travel_end_date, adults_count, children_count, children_ages, rooms_count, rooms, pricing, airfare_per_adult_cents, transfer_per_adult_cents, status, created_at")
        .eq("store_id", staff.store_id)
        .in("status", ["sent", "viewed", "draft"])
        .gte("created_at", cutoffIso)
        .order("created_at", { ascending: false })
        .limit(data.maxSuppliesToScan),
      supabase
        .from("travel_quote_captures")
        .select("id, operator_slug, source_page, origin_city, destination_city, start_date, end_date, total_cents, adults_count, children_count, lead_id, created_at")
        .eq("store_id", staff.store_id)
        .gte("created_at", cutoffIso)
        .order("created_at", { ascending: false })
        .limit(data.maxSuppliesToScan),
      supabase
        .from("travel_quotes")
        .select("id, protocol_number, contact_name, origin_city, origin_iata, destination_city, destination_iata, departure_date, return_date, adults_count, children_count, children_ages, room_occupancies, quote_amount_cents, lead_id, created_at")
        .eq("store_id", staff.store_id)
        .gt("quote_amount_cents", 0)
        .gte("created_at", cutoffIso)
        .order("created_at", { ascending: false })
        .limit(Math.max(10, Math.floor(data.maxSuppliesToScan / 2))),
    ]);

    let scannedSupplies = 0;
    let totalMatchesFound = 0;
    let persistedCount = 0;

    for (const p of proposals || []) {
      scannedSupplies++;
      const offer = normalizeLegacyOfferToCanonical({ ...p, source_type: "proposal" });
      const res = await internalEvaluateSupplyAgainstAllLeads({
        storeId: staff.store_id,
        offer,
        sourceProposalId: String(p.id),
      });
      totalMatchesFound += res.matchedCount;
      persistedCount += res.persistedCount;
    }

    for (const c of captures || []) {
      scannedSupplies++;
      const offer = normalizeLegacyOfferToCanonical({
        ...c,
        source_type: "quote_capture",
        title: c.destination_city,
      });
      const res = await internalEvaluateSupplyAgainstAllLeads({
        storeId: staff.store_id,
        offer,
        sourceCaptureId: String(c.id),
      });
      totalMatchesFound += res.matchedCount;
      persistedCount += res.persistedCount;
    }

    for (const q of quotes || []) {
      scannedSupplies++;
      const quoteLabel = q.protocol_number
        ? `Cotação ${q.protocol_number} — ${q.destination_city}`
        : `Cotação ${q.destination_city}`;
      const offer = normalizeLegacyOfferToCanonical({
        ...q,
        title: quoteLabel,
        total_cents: Number(q.quote_amount_cents || 0),
        source_type: "agency_quote",
        rooms: q.room_occupancies,
      });
      const res = await internalEvaluateSupplyAgainstAllLeads({
        storeId: staff.store_id,
        offer,
        sourceQuoteId: String(q.id),
      });
      totalMatchesFound += res.matchedCount;
      persistedCount += res.persistedCount;
    }

    return { scannedSupplies, totalMatchesFound, persistedCount };
  });

export const getLeadVerifiedOpportunitiesFn = createServerFn({ method: "POST" })
  .validator(z.object({ leadId: z.string().uuid() }))
  .handler(async ({ data }): Promise<LeadVerifiedOpportunitiesBundle> => {
    const staff = await requireStaff();
    return internalGetVerifiedOpportunitiesForLead({
      storeId: staff.store_id,
      leadId: data.leadId,
    });
  });

export const updateUnifiedOpportunityStatusFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      opportunityId: z.string().uuid(),
      originTable: z.enum(["travel_opportunities", "travel_opportunity_matches"]),
      action: z.enum(["reviewed", "approached", "dismissed", "restore"]),
    })
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const staff = await requireStaff();
    const supabase = getServerClient();

    if (data.originTable === "travel_opportunities") {
      const targetStatus =
        data.action === "restore"
          ? "open"
          : data.action === "reviewed"
            ? "viewed"
            : data.action === "approached"
              ? "contacted"
              : "dismissed";
      const patch: Record<string, unknown> = {
        status: targetStatus,
        updated_at: new Date().toISOString(),
      };
      if (targetStatus === "contacted") patch.contacted_at = new Date().toISOString();
      if (targetStatus === "dismissed") patch.dismissed_at = new Date().toISOString();
      if (targetStatus === "open") patch.dismissed_at = null;

      const { error } = await supabase
        .from("travel_opportunities")
        .update(patch)
        .eq("id", data.opportunityId)
        .eq("store_id", staff.store_id);
      if (error) throw new Error(error.message);
      return { ok: true };
    }

    const { error } = await supabase
      .from("travel_opportunity_matches")
      .update({
        status: data.action === "restore" ? "new" : data.action,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.opportunityId)
      .eq("store_id", staff.store_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const AnalyzeIncomingOfferSchema = z.object({
  title: z.string().trim().max(180).optional(),
  destinationCity: z.string().trim().min(2, "Destino obrigatório").max(160),
  destinationIata: z.string().trim().max(6).optional().nullable(),
  originCity: z.string().trim().max(120).optional().nullable(),
  originIata: z.string().trim().max(6).optional().nullable(),
  departureDate: z.string().trim().optional().nullable(),
  returnDate: z.string().trim().optional().nullable(),
  quotedAdultsCount: z.number().int().min(1).max(20).default(2),
  quotedChildrenAges: z.array(z.number().int().min(0).max(17)).max(12).optional().default([]),
  totalPriceCents: z.number().int().min(0),
  airfarePerAdultCents: z.number().int().min(0).optional().nullable(),
  transferPerAdultCents: z.number().int().min(0).optional().nullable(),
  productType: z.string().trim().max(60).optional().default("package"),
  sourceType: z
    .enum(["proposal", "quote_capture", "agency_quote", "catalog_package", "ocr_quote", "offer_engine"])
    .optional()
    .default("ocr_quote"),
  sourceProposalId: z.string().uuid().optional().nullable(),
  sourceQuoteId: z.string().uuid().optional().nullable(),
  sourceCaptureId: z.string().uuid().optional().nullable(),
  excludeLeadId: z.string().uuid().optional().nullable(),
  persistMatches: z.boolean().optional().default(false),
  minScore: z.number().int().min(30).max(95).optional().default(55),
});

export type IncomingOfferPipelineAnalysis = {
  destinationCity: string;
  title: string;
  totalPriceCents: number;
  perAdultCents: number;
  historicalCheck: HistoricalPriceCheck | null;
  evaluatedDemandsCount: number;
  matchedCount: number;
  persistedCount: number;
  matchedLeads: RadarMatchLeadPreview[];
};

export const analyzeIncomingOfferAgainstPipelineFn = createServerFn({ method: "POST" })
  .validator(AnalyzeIncomingOfferSchema)
  .handler(async ({ data }): Promise<IncomingOfferPipelineAnalysis> => {
    const staff = await requireStaff();
    const offerTitle = data.title?.trim() || `Cotação ${data.destinationCity.trim()}`;
    const offer = normalizeLegacyOfferToCanonical({
      id: data.sourceProposalId || data.sourceQuoteId || data.sourceCaptureId || `sim-${Date.now()}`,
      source_type: data.sourceType,
      title: offerTitle,
      destination_city: data.destinationCity.trim(),
      destination_iata: data.destinationIata?.trim().toUpperCase() || null,
      origin_city: data.originCity?.trim() || null,
      origin_iata: data.originIata?.trim().toUpperCase() || null,
      departure_date: data.departureDate?.trim() || null,
      return_date: data.returnDate?.trim() || null,
      adults_count: data.quotedAdultsCount,
      children_count: data.quotedChildrenAges.length,
      children_ages: data.quotedChildrenAges,
      total_cents: data.totalPriceCents,
      airfare_per_adult_cents: data.airfarePerAdultCents ?? null,
      transfer_per_adult_cents: data.transferPerAdultCents ?? null,
      product_type: data.productType || "package",
      target_lead_id: data.excludeLeadId || null,
    });

    const summary = await internalEvaluateSupplyAgainstAllLeads({
      storeId: staff.store_id,
      offer,
      sourceProposalId: data.sourceProposalId ?? null,
      sourceQuoteId: data.sourceQuoteId ?? null,
      sourceCaptureId: data.sourceCaptureId ?? null,
      dryRun: !data.persistMatches,
      minScore: data.minScore,
    });

    return {
      destinationCity: offer.destinationCity,
      title: offer.title,
      totalPriceCents: offer.totalPriceCents,
      perAdultCents: Math.round(offer.totalPriceCents / Math.max(1, offer.quotedAdultsCount || 2)),
      historicalCheck: summary.standaloneHistoricalCheck ?? null,
      evaluatedDemandsCount: summary.evaluatedDemandsCount,
      matchedCount: summary.matchedCount,
      persistedCount: summary.persistedCount,
      matchedLeads: summary.matchedLeads,
    };
  });
