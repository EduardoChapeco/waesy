import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { requireStaff } from "@/lib/server-access";
import { CANONICAL_DESTINATIONS } from "@/lib/tourism/destinations-catalog";
import { GLOBAL_BRAZIL_CITIES_CATALOG } from "@/lib/data/cities-brazil-catalog";
import {
  normalizeDestinationTagList,
  normalizeOpportunityText,
  normalizePeriodSpec,
  normalizeRoomsFromLeadOrLegacy,
  resolveCanonicalDestinationTag,
} from "@/lib/travel/opportunity-matching-engine";
import {
  parseTravelIntentDeterministically,
  type DestinationCatalogSearchHit,
  type ParsedTravelIntentResult,
} from "@/lib/travel/travel-intent-parser";

export type {
  ParsedTravelIntentContact,
  ParsedTravelIntentBudget,
  ParsedTravelIntentPreferences,
  ParsedTravelIntentResult,
  DestinationCatalogSearchHit,
} from "@/lib/travel/travel-intent-parser";

function sanitizePostgrestFilterTerm(raw: string): string {
  return String(raw || "")
    .replace(/[,()*\\]/g, " ")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================================
// SCHEMAS ZOD
// ============================================================================

export const ParseTravelIntentSchema = z.object({
  rawText: z.string().trim().min(4).max(16000),
  mode: z.enum(["lead_intent", "offer_quote"]).default("lead_intent"),
  defaultOriginCity: z.string().trim().max(120).optional().nullable(),
  referenceYear: z.number().int().min(2024).max(2035).optional(),
});

export const SearchUnifiedDestinationsSchema = z.object({
  query: z.string().trim().max(100).default(""),
  limit: z.number().int().min(1).max(40).default(18),
  includeAirports: z.boolean().default(true),
  includeCities: z.boolean().default(true),
});

const AiExtractionOutputSchema = z.object({
  fullName: z.string().trim().nullable().optional(),
  whatsapp: z.string().trim().nullable().optional(),
  email: z.string().trim().nullable().optional(),
  originCity: z.string().trim().nullable().optional(),
  originIata: z.string().trim().nullable().optional(),
  destinations: z.array(z.string().trim()).optional(),
  startDate: z.string().trim().nullable().optional(),
  endDate: z.string().trim().nullable().optional(),
  targetMonths: z.array(z.string().trim()).optional(),
  seasonTags: z.array(z.string().trim()).optional(),
  flexibilityDays: z.number().int().min(0).max(60).nullable().optional(),
  flexibleAnytime: z.boolean().nullable().optional(),
  rooms: z
    .array(
      z.object({
        adultsCount: z.number().int().min(1).max(10).default(2),
        childrenAges: z.array(z.number().int().min(0).max(17)).default([]),
      })
    )
    .optional(),
  maxTotalBudgetCents: z.number().nonnegative().nullable().optional(),
  maxInstallmentCents: z.number().nonnegative().nullable().optional(),
  preferredInstallments: z.number().int().min(1).max(36).nullable().optional(),
  productType: z.string().trim().nullable().optional(),
  inclusionsWanted: z.array(z.string().trim()).optional(),
  minHotelStars: z.number().int().min(1).max(5).nullable().optional(),
  mealPlan: z.string().trim().nullable().optional(),
  summaryTitle: z.string().trim().nullable().optional(),
  confidenceScore: z.number().min(0).max(100).optional(),
});

// ============================================================================
// SERVER FUNCTIONS: BUSCA UNIFICADA DE DESTINOS & PARSER IA DE MARKDOWN/TEXTO
// ============================================================================

export const searchUnifiedDestinationsCatalogFn = createServerFn({ method: "POST" })
  .validator(SearchUnifiedDestinationsSchema)
  .handler(async ({ data }): Promise<{ hits: DestinationCatalogSearchHit[] }> => {
    await requireStaff();
    const query = data.query.trim();
    const safePostgrestTerm = sanitizePostgrestFilterTerm(query);
    const limit = data.limit;
    const includeAirports = data.includeAirports;
    const includeCities = data.includeCities;
    const normQuery = normalizeOpportunityText(query);

    const supabase = getServerClient();
    const hits: DestinationCatalogSearchHit[] = [];
    const seenKeys = new Set<string>();

    const pushHit = (hit: DestinationCatalogSearchHit) => {
      const key = `${hit.normalized}::${hit.iata || ""}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      hits.push(hit);
    };

    // 1. Catalogo de destinos do banco (`destinations` + `travel_destination_gateways`)
    try {
      let destQuery = supabase
        .from("destinations")
        .select("id, name, slug, city, state, country, iata_code")
        .limit(20);
      if (safePostgrestTerm.length >= 2) {
        destQuery = destQuery.or(
          `name.ilike.%${safePostgrestTerm}%,city.ilike.%${safePostgrestTerm}%,iata_code.ilike.%${safePostgrestTerm}%`
        );
      }
      const [{ data: destRows, error: destErr }, { data: gatewayRows, error: gwErr }] = await Promise.all([
        destQuery,
        safePostgrestTerm.length >= 2
          ? supabase
              .from("travel_destination_gateways")
              .select("destination_slug, destination_name, primary_airport_iata, secondary_airport_iata")
              .or(
                `destination_name.ilike.%${safePostgrestTerm}%,primary_airport_iata.ilike.%${safePostgrestTerm}%`
              )
              .limit(10)
          : supabase
              .from("travel_destination_gateways")
              .select("destination_slug, destination_name, primary_airport_iata, secondary_airport_iata")
              .limit(10),
      ]);
      if (destErr && gwErr) throw destErr;

      const gatewayMap = new Map<string, string[]>();
      for (const gw of gatewayRows || []) {
        const gList = [gw.primary_airport_iata, gw.secondary_airport_iata].filter(Boolean) as string[];
        gatewayMap.set(normalizeOpportunityText(gw.destination_name), gList);
        if (gw.destination_slug) {
          gatewayMap.set(normalizeOpportunityText(gw.destination_slug.replace(/-/g, " ")), gList);
        }
      }

      for (const row of destRows || []) {
        const cityStr = String(row.city || row.name || "").trim();
        const norm = normalizeOpportunityText(cityStr);
        const iata = row.iata_code ? String(row.iata_code).toUpperCase() : null;
        const gws = gatewayMap.get(norm) || (iata ? [iata] : []);
        pushHit({
          id: `dest-${row.id}`,
          label: `${row.name}${row.state ? ` (${row.state})` : ""}`,
          normalized: norm,
          iata,
          gatewayIatas: gws,
          city: cityStr,
          state: row.state || null,
          country: row.country || null,
          destinationId: String(row.id),
          cityIbge: null,
          source: "destinations",
          subtitle: [row.state, row.country, iata ? `IATA ${iata}` : gws.length > 0 ? `Gateway ${gws.join("/")}` : ""]
            .filter(Boolean)
            .join(" · "),
        });
      }
    } catch {
      // Silencioso: prossegue para catalogos complementares
    }

    // 2. Catalogo canonico de destinos curados
    for (const d of CANONICAL_DESTINATIONS) {
      const hay = normalizeOpportunityText(`${d.name} ${d.city} ${d.state} ${d.country} ${d.iata}`);
      if (!normQuery || hay.includes(normQuery)) {
        const resolved = resolveCanonicalDestinationTag(d.name);
        pushHit({
          id: `canon-${d.id}`,
          label: `${d.name}${d.state && d.state !== "INT" ? ` (${d.state})` : ""}`,
          normalized: resolved?.normalized || normalizeOpportunityText(d.city),
          iata: resolved?.iata || d.iata || null,
          gatewayIatas: resolved?.gatewayIatas || (d.iata ? [d.iata] : []),
          city: d.city,
          state: d.state,
          country: d.country,
          destinationId: d.id,
          cityIbge: null,
          source: "canonical",
          subtitle: `${d.state === "INT" ? d.country : `${d.city} - ${d.state}`} · Gateway ${d.iata}`,
        });
      }
    }

    // 3. Cidades globais (`cities_global` + catalogo IBGE in-memory)
    if (includeCities && safePostgrestTerm.length >= 2) {
      try {
        const { data: cityRows, error: cityErr } = await supabase
          .from("cities_global")
          .select("id, ibge_code, name, state, country, iata_code")
          .ilike("name", `%${safePostgrestTerm}%`)
          .limit(12);
        if (cityErr) throw cityErr;
        for (const c of cityRows || []) {
          const norm = normalizeOpportunityText(c.name);
          const resolved = resolveCanonicalDestinationTag(c.name);
          pushHit({
            id: `city-${c.id || norm}`,
            label: `${c.name}${c.state ? ` - ${c.state}` : ""}`,
            normalized: norm,
            iata: c.iata_code ? String(c.iata_code).toUpperCase() : resolved?.iata || null,
            gatewayIatas: resolved?.gatewayIatas || (c.iata_code ? [String(c.iata_code).toUpperCase()] : []),
            city: String(c.name),
            state: c.state || null,
            country: c.country || "Brasil",
            destinationId: null,
            cityIbge: c.ibge_code ? String(c.ibge_code) : null,
            source: "cities_global",
            subtitle: `${c.state ? `${c.state}, ` : ""}${c.country || "Brasil"}`,
          });
        }
      } catch {
        for (const c of GLOBAL_BRAZIL_CITIES_CATALOG.slice(0, 600)) {
          if (normalizeOpportunityText(c.name).includes(normQuery)) {
            pushHit({
              id: `city-local-${c.ibge_code}`,
              label: `${c.name} - ${c.state}`,
              normalized: normalizeOpportunityText(c.name),
              iata: null,
              gatewayIatas: [],
              city: c.name,
              state: c.state,
              country: "Brasil",
              destinationId: null,
              cityIbge: c.ibge_code,
              source: "cities_global",
              subtitle: `${c.state}, Brasil`,
            });
          }
          if (hits.length >= limit) break;
        }
      }
    }

    // 4. Aeroportos globais (`airports_global` - leitura real no Supabase)
    if (includeAirports && safePostgrestTerm.length >= 2) {
      const { data: airportRows, error: airportErr } = await supabase
        .from("airports_global")
        .select("iata_code, name, city, state_province, country")
        .eq("is_commercial", true)
        .or(
          `iata_code.ilike.%${safePostgrestTerm}%,city.ilike.%${safePostgrestTerm}%,name.ilike.%${safePostgrestTerm}%`
        )
        .limit(10);
      if (airportErr) {
        throw new Error(`[travel-intent-ai:searchAirports] ${airportErr.message}`);
      }
      for (const ap of airportRows || []) {
        const iata = String(ap.iata_code || "").toUpperCase();
        pushHit({
          id: `iata-${iata}`,
          label: `${ap.city} (${iata})`,
          normalized: normalizeOpportunityText(ap.city),
          iata,
          gatewayIatas: [iata],
          city: ap.city,
          state: ap.state_province || null,
          country: ap.country || null,
          destinationId: null,
          cityIbge: null,
          source: "airports_global",
          subtitle: `${ap.name} · ${ap.country || ""}`,
        });
      }
    }

    return { hits: hits.slice(0, limit) };
  });

export const parseTravelIntentFromTextAI = createServerFn({ method: "POST" })
  .validator(ParseTravelIntentSchema)
  .handler(async ({ data }): Promise<ParsedTravelIntentResult> => {
    const staff = await requireStaff();
    const rawText = data.rawText;
    const mode = data.mode;
    const defaultOriginCity = data.defaultOriginCity || null;
    const referenceYear = data.referenceYear ?? new Date().getUTCFullYear();

    // Base deterministica sempre executada para preenchimento seguro e offline failover
    const deterministic = parseTravelIntentDeterministically(rawText, {
      defaultOriginCity,
      referenceYear,
    });

    const systemInstruction =
      mode === "offer_quote"
        ? `Você é um extrator estruturado de ofertas e orçamentos de turismo para agência brasileira. Retorne APENAS JSON válido seguindo exatamente as chaves solicitadas. Nunca invente informações ausentes (use null). Classifique todas as crianças entre 0 e 17 anos nas respectivas idades dentro de cada quarto.`
        : `Você é um extrator estruturado de leads e intenções de viagem para agência de turismo brasileira. O usuário pode colar um texto em Markdown, resumo de WhatsApp ou ficha livre. Retorne APENAS JSON válido seguindo exatamente as chaves solicitadas. Nunca invente datas ou preços não mencionados (use null). Sempre separe quartos e coloque as idades exatas (0 a 17) de cada criança.`;

    const userPrompt = `Extraia do texto abaixo para JSON com as chaves:
{
  "fullName": string|null,
  "whatsapp": string|null,
  "email": string|null,
  "originCity": string|null,
  "originIata": string|null,
  "destinations": string[],
  "startDate": "YYYY-MM-DD"|null,
  "endDate": "YYYY-MM-DD"|null,
  "targetMonths": ["YYYY-MM"],
  "seasonTags": string[],
  "flexibilityDays": number|null,
  "flexibleAnytime": boolean,
  "rooms": [{"adultsCount": number, "childrenAges": number[]}],
  "maxTotalBudgetCents": number|null,
  "maxInstallmentCents": number|null,
  "preferredInstallments": number|null,
  "productType": "package"|"flight"|"hotel"|"circuit"|null,
  "inclusionsWanted": string[],
  "minHotelStars": number|null,
  "mealPlan": string|null,
  "summaryTitle": string|null,
  "confidenceScore": number
}
Ano de referencia caso ano nao seja citado: ${referenceYear}.
Texto original:
"""
${rawText}
"""`;

    try {
      const { executeUnifiedAiCall } = await import("./api-orchestrator.functions");
      const aiRes = await executeUnifiedAiCall({
        systemInstruction,
        userPrompt,
        feature: "travel_intent_parser",
        taskType: "structured_extraction",
        responseFormat: "json_object",
        expectJson: true,
        temperature: 0.1,
        preferredProvider: "groq",
        storeId: staff.store_id,
        ownerId: staff.id,
      });

      const rawObj =
        aiRes.parsedJson && typeof aiRes.parsedJson === "object"
          ? aiRes.parsedJson
          : JSON.parse(String(aiRes.text || aiRes.content || "{}").replace(/```json|```/g, "").trim());

      const parsed = AiExtractionOutputSchema.safeParse(rawObj);
      if (!parsed.success) {
        return {
          ...deterministic,
          reviewFlags: [
            ...deterministic.reviewFlags,
            "Resposta da IA veio incompleta; usado extrator determinístico de fallback.",
          ],
        };
      }

      const ai = parsed.data;
      const destTags = normalizeDestinationTagList(
        ai.destinations && ai.destinations.length > 0 ? ai.destinations : deterministic.destinations
      );

      // Reconciliar com destinos do banco quando existirem
      try {
        const supabase = getServerClient();
        for (const tag of destTags) {
          if (tag.destinationId || tag.iata) continue;
          const cleanName = sanitizePostgrestFilterTerm(tag.city || tag.label || "");
          if (cleanName.length < 2) continue;
          const { data: matchRow } = await supabase
            .from("destinations")
            .select("id, name, city, state, country, iata_code")
            .ilike("name", `%${cleanName}%`)
            .limit(1)
            .maybeSingle();
          if (matchRow) {
            tag.destinationId = String(matchRow.id);
            tag.city = matchRow.city || tag.city;
            tag.state = matchRow.state || tag.state;
            tag.country = matchRow.country || tag.country;
            if (matchRow.iata_code && !tag.iata) tag.iata = String(matchRow.iata_code).toUpperCase();
            tag.source = "destinations";
          }
        }
      } catch {
        // Silencioso
      }

      const roomSource =
        ai.rooms && ai.rooms.length > 0
          ? ai.rooms.map((r, i) => ({
              roomNumber: i + 1,
              roomLabel: `Quarto ${i + 1}`,
              adultsCount: r.adultsCount,
              childrenCount: r.childrenAges.length,
              childrenAges: r.childrenAges,
            }))
          : deterministic.rooms;

      const normalizedRooms = normalizeRoomsFromLeadOrLegacy({
        rooms: roomSource,
        adultsCount: deterministic.adultsCount,
        childrenCount: deterministic.childrenAges.length,
        childrenAges: deterministic.childrenAges,
      });

      const period = normalizePeriodSpec({
        startDate: ai.startDate ?? deterministic.period.startDate,
        endDate: ai.endDate ?? deterministic.period.endDate,
        targetMonths:
          ai.targetMonths && ai.targetMonths.length > 0 ? ai.targetMonths : deterministic.period.targetMonths,
        seasonTags:
          ai.seasonTags && ai.seasonTags.length > 0 ? ai.seasonTags : deterministic.period.seasonTags,
        flexibilityDays: ai.flexibilityDays ?? deterministic.period.flexibilityDays,
        dateFlexibleFlag: ai.flexibleAnytime ?? deterministic.period.flexibleAnytime,
        interestPeriodText: rawText,
        referenceYear,
      });

      const reviewFlags: string[] = [];
      if (destTags.length === 0) reviewFlags.push("Nenhum destino encontrado; selecione manualmente na lista.");
      if (period.mode === "unspecified") reviewFlags.push("Defina datas, meses alvo ou flexibilidade.");

      return {
        contact: {
          fullName: ai.fullName || deterministic.contact.fullName,
          whatsapp: (ai.whatsapp ? ai.whatsapp.replace(/\D/g, "") : null) || deterministic.contact.whatsapp,
          email: ai.email || deterministic.contact.email,
          originCity: ai.originCity || deterministic.contact.originCity || defaultOriginCity,
          originIata: ai.originIata || deterministic.contact.originIata,
        },
        destinations: destTags,
        period,
        rooms: normalizedRooms.rooms,
        adultsCount: normalizedRooms.adultsCount,
        childrenAges: normalizedRooms.childrenAges,
        budget: {
          maxTotalBudgetCents:
            ai.maxTotalBudgetCents != null ? Math.round(ai.maxTotalBudgetCents) : deterministic.budget.maxTotalBudgetCents,
          maxInstallmentCents:
            ai.maxInstallmentCents != null ? Math.round(ai.maxInstallmentCents) : deterministic.budget.maxInstallmentCents,
          preferredInstallments: ai.preferredInstallments ?? deterministic.budget.preferredInstallments,
        },
        preferences: {
          productType: ai.productType || deterministic.preferences.productType,
          inclusionsWanted:
            ai.inclusionsWanted && ai.inclusionsWanted.length > 0
              ? ai.inclusionsWanted
              : deterministic.preferences.inclusionsWanted,
          minHotelStars: ai.minHotelStars ?? deterministic.preferences.minHotelStars,
          mealPlan: ai.mealPlan || deterministic.preferences.mealPlan,
          summaryTitle: ai.summaryTitle || deterministic.preferences.summaryTitle,
        },
        rawMarkdownPreserved: rawText,
        usedAiProvider: true,
        providerName: `${aiRes.provider}:${aiRes.model}`,
        confidenceScore: ai.confidenceScore ?? deterministic.confidenceScore,
        reviewFlags,
      };
    } catch {
      return {
        ...deterministic,
        reviewFlags: [
          ...deterministic.reviewFlags,
          "Pool de IA indisponível no momento; extração feita de forma determinística local — revise antes de salvar.",
        ],
      };
    }
  });
