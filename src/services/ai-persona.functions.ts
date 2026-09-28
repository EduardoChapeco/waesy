/**
 * ai-persona.functions.ts — Motor de Persona Comportamental Preditiva (Omni-Persona Engine)
 *
 * Compila a telemetria do usuário (buscas, afinidades, cliques, tempo de tela, ticket médio)
 * num payload JSON ultra-denso e otimizado para tokens, pronto para injeção silenciosa
 * nos prompts de IA (SDR, Recomendações, Buscas Semânticas e BioLinks).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getCurrentIdentity } from "@/services/cart-helpers";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

export interface PersonaDenseContext {
  affinities: string[]; // ex: ["eletronicos:0.85", "calcados:0.60"]
  recent_searches: string[]; // ex: ["iphone 13", "tenis corrida"]
  unmet_searches: string[]; // buscas com 0 resultados
  intent: "curious" | "warm" | "ready_to_buy" | "bargain_hunter" | "vip";
  price_bracket: "budget" | "balanced" | "premium";
  avg_ticket_cents: number;
  total_interactions: number;
  recent_entities_viewed: Array<{ type: string; id: string; title?: string }>;
  recommended_tone: "agile" | "consultative" | "promotional" | "exclusive";
}

/**
 * Helper interno para geração de contexto de persona no servidor (zero-overhead).
 */
export async function getAiPersonaContextInternal(params: {
  userId?: string | null;
  sessionId?: string | null;
  civilId?: string | null;
}): Promise<PersonaDenseContext> {
  const supabase = getServerClient();
  const uid = params.userId || null;
  const sid = params.sessionId || null;

  // 1. Buscar afinidades agregadas
  let affinities: string[] = [];
  try {
    let affQuery = supabase
      .from("user_category_affinity")
      .select("niche, total_score")
      .order("total_score", { ascending: false })
      .limit(4);

    if (uid) {
      affQuery = affQuery.eq("user_id", uid);
    } else if (sid) {
      affQuery = affQuery.eq("session_id", sid);
    }

    const { data: affData } = await affQuery;
    if (affData && affData.length > 0) {
      affinities = affData.map(
        (a) => `${a.niche}:${Number(a.total_score || 0).toFixed(2)}`,
      );
    }
  } catch (e) {
    console.warn("[ai-persona] Falha ao ler afinidades:", e);
  }

  // 2. Buscar histórico recente de buscas e buscas com zero resultados
  let recentSearches: string[] = [];
  let unmetSearches: string[] = [];
  try {
    let sQuery = supabase
      .from("search_history")
      .select("query, normalized_query, results_count, niche")
      .order("created_at", { ascending: false })
      .limit(10);

    if (uid) {
      sQuery = sQuery.eq("user_id", uid);
    } else if (sid) {
      sQuery = sQuery.eq("session_id", sid);
    }

    const { data: sData } = await sQuery;
    if (sData && sData.length > 0) {
      const seen = new Set<string>();
      for (const s of sData) {
        if (!seen.has(s.normalized_query)) {
          seen.add(s.normalized_query);
          recentSearches.push(s.query);
          if (s.results_count === 0 && unmetSearches.length < 3) {
            unmetSearches.push(s.query);
          }
        }
      }
      recentSearches = recentSearches.slice(0, 5);
    }
  } catch (e) {
    console.warn("[ai-persona] Falha ao ler histórico de buscas:", e);
  }

  // 3. Buscar eventos de comportamento recentes para inferir intenção e ticket médio
  let totalInteractions = 0;
  let hasHighIntentEvent = false;
  let hasWarmEngagement = false;
  let recentEntities: Array<{ type: string; id: string; title?: string }> = [];
  let pricesViewed: number[] = [];

  try {
    let behQuery = supabase
      .from("user_behavior_events")
      .select("event_type, entity_type, entity_id, dwell_time_ms, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(25);

    if (uid) {
      behQuery = behQuery.eq("user_id", uid);
    } else if (sid) {
      behQuery = behQuery.eq("session_id", sid);
    }

    const { data: behData } = await behQuery;
    if (behData && behData.length > 0) {
      totalInteractions = behData.length;
      for (const ev of behData) {
        if (
          ev.event_type === "add_to_cart" ||
          ev.event_type === "click_whatsapp" ||
          ev.event_type === "quote_request" ||
          ev.event_type === "order_complete" ||
          ev.event_type === "booking_complete"
        ) {
          hasHighIntentEvent = true;
        }

        if (
          ev.dwell_time_ms > 20000 ||
          ev.event_type === "view_item"
        ) {
          hasWarmEngagement = true;
        }

        if (ev.entity_id && recentEntities.length < 4) {
          recentEntities.push({
            type: ev.entity_type,
            id: ev.entity_id,
            title: ev.metadata?.title || undefined,
          });
        }

        if (ev.metadata?.price_cents && typeof ev.metadata.price_cents === "number") {
          pricesViewed.push(ev.metadata.price_cents);
        }
      }
    }
  } catch (e) {
    console.warn("[ai-persona] Falha ao analisar eventos comportamentais:", e);
  }

  // 4. Calcular ticket médio e sensibilidade a preço
  const avgTicketCents =
    pricesViewed.length > 0
      ? Math.round(pricesViewed.reduce((a, b) => a + b, 0) / pricesViewed.length)
      : 0;

  let priceBracket: "budget" | "balanced" | "premium" = "balanced";
  if (avgTicketCents > 0) {
    if (avgTicketCents < 8000) {
      priceBracket = "budget";
    } else if (avgTicketCents > 40000) {
      priceBracket = "premium";
    }
  }

  // 5. Classificar intenção do usuário
  let intent: "curious" | "warm" | "ready_to_buy" | "bargain_hunter" | "vip" = "curious";
  if (hasHighIntentEvent) {
    intent = priceBracket === "premium" ? "vip" : "ready_to_buy";
  } else if (hasWarmEngagement || recentSearches.length >= 3) {
    intent = "warm";
  } else if (recentSearches.some((q) => /barato|promo|desapego|desconto|usado/i.test(q))) {
    intent = "bargain_hunter";
  }

  // 6. Tom recomendado para a IA
  let recommendedTone: "agile" | "consultative" | "promotional" | "exclusive" = "consultative";
  if (intent === "ready_to_buy" || intent === "vip") {
    recommendedTone = priceBracket === "premium" ? "exclusive" : "agile";
  } else if (intent === "bargain_hunter") {
    recommendedTone = "promotional";
  }

  const personaContext: PersonaDenseContext = {
    affinities,
    recent_searches: recentSearches,
    unmet_searches: unmetSearches,
    intent,
    price_bracket: priceBracket,
    avg_ticket_cents: avgTicketCents,
    total_interactions: totalInteractions,
    recent_entities_viewed: recentEntities,
    recommended_tone: recommendedTone,
  };

  // Salvar / atualizar perfil de persona silenciosamente em segundo plano
  if (uid || sid) {
    try {
      const { error: upsertErr } = await supabase.from("ai_persona_profiles").upsert(
        {
          user_id: uid,
          session_id: sid,
          persona_code: `shopper_${intent}_${priceBracket}`,
          persona_group: "consumer",
          intent_classification: intent,
          price_sensitivity: priceBracket,
          top_niches: affinities,
          recent_queries: recentSearches,
          avg_ticket_cents: avgTicketCents,
          interaction_count: totalInteractions,
          last_active_at: new Date().toISOString(),
          token_dense_context: personaContext as any,
          updated_at: new Date().toISOString(),
        },
        { onConflict: uid ? "user_id" : undefined },
      );
      if (upsertErr) {
        console.warn("[ai-persona] Upsert ai_persona_profiles aviso:", upsertErr.message);
      }
    } catch {
      // Ignorar falha assíncrona de cache de persona
    }
  }

  return personaContext;
}

/**
 * Server Function: buildAiPersonaContext
 * Endpoint BFF para compilar a telemetria do usuário num JSON token-denso
 */
export const buildAiPersonaContext = createServerFn({ method: "POST" })
  .validator(
    z.object({
      civilId: z.string().uuid().optional(),
      userId: z.string().uuid().optional(),
      sessionId: z.string().optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    let effectiveUserId = input.userId || input.civilId || null;
    let effectiveSessionId = input.sessionId || null;

    if (!effectiveUserId && !effectiveSessionId) {
      try {
        const identity = await getCurrentIdentity();
        effectiveUserId = identity.customer_id;
        effectiveSessionId = identity.session_token;
      } catch {
        // Visitante não autenticado
      }
    }

    const context = await getAiPersonaContextInternal({
      userId: effectiveUserId,
      sessionId: effectiveSessionId,
      civilId: input.civilId || effectiveUserId,
    });

    const compressedContext = JSON.stringify(context);

    return {
      success: true,
      context,
      compressedContext,
      tokenEstimate: Math.ceil(compressedContext.length / 4),
    };
  });

/**
 * Server Function: listStorePersonasOverview
 * Retorna lista de personas, distribuição de intenção e termos buscados para o painel de CRM da loja
 */
export const listStorePersonasOverview = createServerFn({ method: "GET" })
  .validator(
    z.object({
      intent: z.enum(["all", "curious", "warm", "ready_to_buy", "bargain_hunter", "vip"]).optional().default("all"),
      limit: z.number().int().min(1).max(50).optional().default(20),
    }).optional()
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

    const filterIntent = data?.intent || "all";
    const limit = data?.limit || 20;

    let query = supabase
      .from("ai_persona_profiles")
      .select("*")
      .order("last_active_at", { ascending: false })
      .limit(limit);

    if (filterIntent !== "all") {
      query = query.eq("intent_classification", filterIntent);
    }

    const [personasRes, searchesRes] = await Promise.all([
      query,
      supabase
        .from("search_history")
        .select("query, normalized_query, results_count, niche, created_at")
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    const rawPersonas = personasRes.data || [];
    const rawSearches = searchesRes.data || [];

    // Agregação de buscas mais frequentes e demandas não atendidas (zero-results)
    const searchMap = new Map<string, { query: string; count: number; zeroResults: boolean; niche: string }>();
    for (const s of rawSearches) {
      const key = s.normalized_query;
      const existing = searchMap.get(key);
      if (existing) {
        existing.count += 1;
        if (s.results_count === 0) existing.zeroResults = true;
      } else {
        searchMap.set(key, {
          query: s.query,
          count: 1,
          zeroResults: s.results_count === 0,
          niche: s.niche || "geral",
        });
      }
    }
    const topSearches = Array.from(searchMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Distribuição de intenção
    const intentCounts = {
      ready_to_buy: 0,
      warm: 0,
      curious: 0,
      bargain_hunter: 0,
      vip: 0,
    };
    for (const p of rawPersonas) {
      const intCls = p.intent_classification as keyof typeof intentCounts;
      if (intentCounts[intCls] !== undefined) {
        intentCounts[intCls] += 1;
      }
    }

    return {
      personas: rawPersonas,
      topSearches,
      intentDistribution: intentCounts,
      totalCount: rawPersonas.length,
    };
  });
