import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { requireRole } from "@/lib/auth-guards.server";
import { getServerIdentity } from "@/lib/identity.server";

function throwIfQueryFailed(error: { message?: string } | null, message: string): void {
  if (error) {
    throw new Error(error.message ? `${message}: ${error.message}` : message);
  }
}

// ==============================================================================
// TIPOS E SCHEMAS CANÔNICOS DE OMNIMATCH / MATCHTRAVEL
// ==============================================================================

export type MatchCardKind = "trade_off" | "hot_offer" | "travel_package" | "product" | "service";
export type MatchSwipeAction = "like" | "pass" | "superlike";

export interface MatchCardDTO {
  id: string;
  deckTemplateId: string;
  cardKind: MatchCardKind;
  title: string;
  subtitle?: string | null;
  badge?: string | null;
  coverImageUrl?: string | null;
  mediaUrls: string[];
  metadata: Record<string, any>;
  tradeOffAxis?: string | null;
  axisWeights: Record<string, number>;
  linkedEntityId?: string | null;
  ctaLabel: string;
  displayOrder: number;
}

export interface MatchVisitorBrainDTO {
  id: string;
  storeId: string;
  visitorSessionId: string;
  customerId?: string | null;
  leadId?: string | null;
  axisScores: Record<string, number>;
  swipesCount: number;
  likesCount: number;
  passesCount: number;
  topMatchedOfferIds: string[];
  lastSwipedAt: string;
}

// ==============================================================================
// HELPERS MATEMÁTICOS DE VETORES E BANDITS
// ==============================================================================

/**
 * Normaliza um vetor euclidiano (L2 norm).
 */
export function normalizeVectorL2(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return vec;
  return vec.map((v) => v / norm);
}

/**
 * Atualiza o vetor de preferência de forma incremental ponderada (Exponential Moving Average).
 */
export function updateIncrementalEmbedding(
  currentEmbedding: number[] | null | undefined,
  cardVector: number[],
  weight: number = 0.2
): number[] {
  if (!currentEmbedding || currentEmbedding.length === 0) {
    return normalizeVectorL2(cardVector);
  }
  const updated = currentEmbedding.map((curr, idx) => {
    const cardVal = cardVector[idx] ?? 0;
    return curr * (1 - weight) + cardVal * weight;
  });
  return normalizeVectorL2(updated);
}

// ==============================================================================
// BUSCA E BATCHING DINÂMICO DE CARTAS (APP / VITRINE)
// ==============================================================================

export const getMatchDeckBatchFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeSlug: z.string().optional(),
      deckTemplateSlug: z.string().optional().default("default"),
      visitorSessionId: z.string().min(1),
      limit: z.number().int().min(1).max(30).default(12),
    })
  )
  .handler(async ({ data: { storeSlug, deckTemplateSlug, visitorSessionId, limit } }) => {
    const supabase = getServerClient();

    // 1. Resolver storeId
    let storeId: string | null = null;
    if (storeSlug) {
      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("slug", storeSlug)
        .maybeSingle();
      storeId = store?.id ?? null;
    }

    if (!storeId) {
      const identity = await getServerIdentity().catch(() => null);
      storeId = identity?.store_id ?? null;
    }

    if (!storeId) {
      return { template: null, cards: [], brain: null };
    }

    // 2. Busca ou inicializa o template do deck
    let { data: template } = await supabase
      .from("match_deck_templates")
      .select("*")
      .eq("store_id", storeId)
      .eq("slug", deckTemplateSlug)
      .maybeSingle();

    if (!template) {
      // Tenta fallback para template ativo da loja
      const { data: fallbackTemplate } = await supabase
        .from("match_deck_templates")
        .select("*")
        .eq("store_id", storeId)
        .eq("active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      template = fallbackTemplate;
    }

    // 3. Busca o cérebro atual do visitante
    const { data: brain } = await supabase
      .from("match_visitor_brains")
      .select("*")
      .eq("store_id", storeId)
      .eq("visitor_session_id", visitorSessionId)
      .maybeSingle();

    // 4. Busca cartas ativas ainda não avaliadas na sessão via RPC match_next_cards_batch (com fallback para query filtrada por template)
    let cards: any[] | null = null;
    if (!template?.id) {
      const { data: rpcCards, error: rpcErr } = await supabase.rpc("match_next_cards_batch", {
        p_store_id: storeId,
        p_visitor_session_id: visitorSessionId,
        p_limit: limit,
      });
      if (!rpcErr && Array.isArray(rpcCards)) {
        cards = rpcCards;
      }
    }
    if (!cards) {
      let cardQuery = supabase
        .from("match_cards")
        .select("*")
        .eq("store_id", storeId)
        .eq("active", true)
        .order("display_order", { ascending: true })
        .limit(limit);

      if (template?.id) {
        cardQuery = cardQuery.eq("deck_template_id", template.id);
      }

      const { data: queriedCards, error: cardsErr } = await cardQuery;
      throwIfQueryFailed(cardsErr, "Falha ao carregar cartas do OmniMatch.");
      cards = queriedCards || [];
    }

    const formattedCards: MatchCardDTO[] = (cards || []).map((c: any) => ({
      id: c.id,
      deckTemplateId: c.deck_template_id,
      cardKind: c.card_kind,
      title: c.title,
      subtitle: c.subtitle,
      badge: c.badge,
      coverImageUrl: c.cover_image_url,
      mediaUrls: Array.isArray(c.media_urls) ? c.media_urls : [],
      metadata: c.metadata || {},
      tradeOffAxis: c.trade_off_axis,
      axisWeights: c.axis_weights || {},
      linkedEntityId: c.linked_entity_id,
      ctaLabel: c.cta_label || "Quero Conhecer",
      displayOrder: c.display_order || 0,
    }));

    return {
      template,
      cards: formattedCards,
      brain: brain
        ? {
            id: brain.id,
            storeId: brain.store_id,
            visitorSessionId: brain.visitor_session_id,
            customerId: brain.customer_id,
            leadId: brain.lead_id,
            axisScores: brain.axis_scores || {},
            swipesCount: brain.swipes_count,
            likesCount: brain.likes_count,
            passesCount: brain.passes_count,
            topMatchedOfferIds: brain.top_matched_offer_ids || [],
            lastSwipedAt: brain.last_swiped_at,
          }
        : null,
    };
  });

// ==============================================================================
// REGISTRO DE SWIPE E ATUALIZAÇÃO NEURAL INCREMENTAL
// ==============================================================================

export const recordMatchSwipeAndAnalyzeFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      visitorSessionId: z.string().min(1),
      cardId: z.string().uuid(),
      action: z.enum(["like", "pass", "superlike"]),
      dwellTimeMs: z.number().int().min(0).default(1000),
    })
  )
  .handler(async ({ data: { storeId, visitorSessionId, cardId, action, dwellTimeMs } }) => {
    const supabase = getServerClient();

    // 1. Busca dados da carta
    const { data: card, error: cardErr } = await supabase
      .from("match_cards")
      .select("id, card_kind, trade_off_axis, axis_weights, linked_entity_id")
      .eq("id", cardId)
      .eq("store_id", storeId)
      .single();

    throwIfQueryFailed(cardErr, "Carta não encontrada para registro de swipe.");
    if (!card) throw new Error("Carta não encontrada.");

    // 2. Busca ou cria o registro do cérebro do visitante
    let { data: brain } = await supabase
      .from("match_visitor_brains")
      .select("*")
      .eq("store_id", storeId)
      .eq("visitor_session_id", visitorSessionId)
      .maybeSingle();

    const currentAxisScores: Record<string, number> = brain?.axis_scores ? { ...brain.axis_scores } : {};
    const cardWeights = (card.axis_weights || {}) as Record<string, number>;

    // Multiplicador da ação
    const actionMultiplier = action === "superlike" ? 2.0 : action === "like" ? 1.0 : -0.5;

    // Atualiza pontuações de eixos
    for (const [axisKey, weight] of Object.entries(cardWeights)) {
      const current = currentAxisScores[axisKey] ?? 0;
      currentAxisScores[axisKey] = Math.round((current + weight * actionMultiplier) * 100) / 100;
    }

    const nextSwipesCount = (brain?.swipes_count || 0) + 1;
    const nextLikesCount = (brain?.likes_count || 0) + (action !== "pass" ? 1 : 0);
    const nextPassesCount = (brain?.passes_count || 0) + (action === "pass" ? 1 : 0);

    const topOffers = brain?.top_matched_offer_ids ? [...brain.top_matched_offer_ids] : [];
    if (action !== "pass" && card.linked_entity_id && !topOffers.includes(card.linked_entity_id)) {
      topOffers.unshift(card.linked_entity_id);
    }

    if (brain) {
      await supabase
        .from("match_visitor_brains")
        .update({
          axis_scores: currentAxisScores,
          swipes_count: nextSwipesCount,
          likes_count: nextLikesCount,
          passes_count: nextPassesCount,
          top_matched_offer_ids: topOffers.slice(0, 10),
          last_swiped_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", brain.id);
    } else {
      const { data: newBrain } = await supabase
        .from("match_visitor_brains")
        .insert({
          store_id: storeId,
          visitor_session_id: visitorSessionId,
          axis_scores: currentAxisScores,
          swipes_count: nextSwipesCount,
          likes_count: nextLikesCount,
          passes_count: nextPassesCount,
          top_matched_offer_ids: topOffers.slice(0, 10),
          last_swiped_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      brain = newBrain;
    }

    // Registra o swipe detalhado em match_time_swipes
    const { error: swipeInsertErr } = await supabase.from("match_time_swipes").insert({
      store_id: storeId,
      visitor_session_id: visitorSessionId,
      match_card_id: cardId,
      customer_id: brain?.customer_id || null,
      product_id: card.card_kind === "product" ? card.linked_entity_id : null,
      action,
      hesitation_ms: Math.max(0, Math.round(dwellTimeMs || 0)),
    });
    if (swipeInsertErr) {
      console.warn("[match-engine] Aviso ao gravar swipe em match_time_swipes:", swipeInsertErr.message);
    }

    return {
      success: true,
      swipesCount: nextSwipesCount,
      likesCount: nextLikesCount,
      axisScores: currentAxisScores,
      topMatchedOfferIds: topOffers.slice(0, 5),
    };
  });

// ==============================================================================
// COSTURA DE IDENTIDADE (STITCHING) DE VISITANTE A LEAD / CLIENTE CRM
// ==============================================================================

export const stitchMatchBrainToCustomerOrLeadFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      visitorSessionId: z.string().min(1),
      fullName: z.string().min(2).max(100),
      phone: z.string().min(8).max(25),
      email: z.string().email().optional(),
      requestedOfferId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data: { storeId, visitorSessionId, fullName, phone, email, requestedOfferId } }) => {
    const supabase = getServerClient();

    // 1. Sanitizar telefone
    const cleanPhone = phone.replace(/\D/g, "");

    // 2. Buscar cérebro do visitante
    const { data: brain } = await supabase
      .from("match_visitor_brains")
      .select("*")
      .eq("store_id", storeId)
      .eq("visitor_session_id", visitorSessionId)
      .maybeSingle();

    const axisScores = (brain?.axis_scores as Record<string, number>) || {};
    const topAxes = Object.entries(axisScores)
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");

    const interestSummary = topAxes ? `Preferências identificadas no Match: ${topAxes}` : "Engajamento via Match Time";

    // 3. Busca se lead já existe na tabela canônica leads_crm pelo telefone para evitar duplicação
    const suffix8 = cleanPhone.slice(-8);
    const { data: existingLead } = await supabase
      .from("leads_crm")
      .select("id, notes, custom_fields")
      .eq("store_id", storeId)
      .ilike("phone", `%${suffix8}%`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let leadId: string;

    if (existingLead) {
      leadId = existingLead.id;
      const updatedNotes = existingLead.notes
        ? `${existingLead.notes}\n[OmniMatch] ${interestSummary}`
        : `[OmniMatch] ${interestSummary}`;
      const prevCustom = (existingLead.custom_fields && typeof existingLead.custom_fields === "object"
        ? existingLead.custom_fields
        : {}) as Record<string, unknown>;

      await supabase
        .from("leads_crm")
        .update({
          notes: updatedNotes,
          custom_fields: {
            ...prevCustom,
            omnimatch_axes: axisScores,
            omnimatch_requested_offer_id: requestedOfferId || null,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", leadId)
        .eq("store_id", storeId);
    } else {
      const { data: newLead, error: leadErr } = await supabase
        .from("leads_crm")
        .insert({
          store_id: storeId,
          title: `${fullName.trim()} — OmniMatch`,
          full_name: fullName.trim(),
          phone: cleanPhone,
          email: email?.trim() || null,
          status: "new",
          pipeline_stage: "inbox",
          kanban_stage_key: "inbox",
          source: "match_time",
          notes: `[OmniMatch] ${interestSummary}`,
          custom_fields: {
            omnimatch_axes: axisScores,
            omnimatch_requested_offer_id: requestedOfferId || null,
          },
        })
        .select("id")
        .single();

      throwIfQueryFailed(leadErr, "Falha ao criar lead a partir do OmniMatch.");
      if (!newLead) throw new Error("Falha ao criar lead a partir do OmniMatch.");
      leadId = newLead.id;
    }

    await supabase.rpc("deduplicate_and_link_lead_to_customer", {
      p_lead_id: leadId,
      p_store_id: storeId,
    }).then(() => null, () => null);

    // 4. Atualiza vínculo no cérebro
    if (brain) {
      await supabase
        .from("match_visitor_brains")
        .update({
          lead_id: leadId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", brain.id);
    }

    return {
      success: true,
      leadId,
      message: "Identidade vinculada ao CRM com sucesso.",
    };
  });

// ==============================================================================
// GESTÃO STUDIO WORKSPACE (/workspace/match-time)
// ==============================================================================

export const listMatchDeckTemplatesFn = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const auth = await requireRole(["owner", "admin", "manager"]);
  const storeId = auth.store_id;

  const { data: templates, error } = await supabase
    .from("match_deck_templates")
    .select(`
      id, niche_id, title, slug, description, card_mix_rules, active, target_persona, created_at,
      match_cards(count)
    `)
    .eq("store_id", storeId)
    .order("created_at", { ascending: false });

  throwIfQueryFailed(error, "Falha ao carregar templates do OmniMatch.");

  return (templates || []).map((t: any) => ({
    id: t.id,
    nicheId: t.niche_id,
    title: t.title,
    slug: t.slug,
    description: t.description,
    cardMixRules: t.card_mix_rules,
    active: t.active,
    targetPersona: t.target_persona,
    cardCount: t.match_cards?.[0]?.count || 0,
    createdAt: t.created_at,
  }));
});

export const upsertMatchCardFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional().nullable(),
      deckTemplateId: z.string().uuid(),
      cardKind: z.enum(["trade_off", "hot_offer", "travel_package", "product", "service"]),
      title: z.string().min(2).max(120),
      subtitle: z.string().max(200).optional().nullable(),
      badge: z.string().max(40).optional().nullable(),
      coverImageUrl: z.string().max(1000).optional().nullable(),
      tradeOffAxis: z.string().max(50).optional().nullable(),
      axisWeights: z.record(z.string(), z.number()).optional().default({}),
      linkedEntityId: z.string().uuid().optional().nullable(),
      ctaLabel: z.string().max(50).optional().default("Quero Conhecer"),
      displayOrder: z.number().int().default(0),
      active: z.boolean().default(true),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const auth = await requireRole(["owner", "admin", "manager"]);
    const storeId = auth.store_id;

    if (data.id) {
      const { data: updated, error } = await supabase
        .from("match_cards")
        .update({
          deck_template_id: data.deckTemplateId,
          card_kind: data.cardKind,
          title: data.title,
          subtitle: data.subtitle ?? null,
          badge: data.badge ?? null,
          cover_image_url: data.coverImageUrl ?? null,
          trade_off_axis: data.tradeOffAxis ?? null,
          axis_weights: data.axisWeights,
          linked_entity_id: data.linkedEntityId ?? null,
          cta_label: data.ctaLabel,
          display_order: data.displayOrder,
          active: data.active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id)
        .eq("store_id", storeId)
        .select("*")
        .single();

      throwIfQueryFailed(error, "Falha ao atualizar carta.");
      return updated;
    } else {
      const { data: inserted, error } = await supabase
        .from("match_cards")
        .insert({
          store_id: storeId,
          deck_template_id: data.deckTemplateId,
          card_kind: data.cardKind,
          title: data.title,
          subtitle: data.subtitle ?? null,
          badge: data.badge ?? null,
          cover_image_url: data.coverImageUrl ?? null,
          trade_off_axis: data.tradeOffAxis ?? null,
          axis_weights: data.axisWeights,
          linked_entity_id: data.linkedEntityId ?? null,
          cta_label: data.ctaLabel,
          display_order: data.displayOrder,
          active: data.active,
        })
        .select("*")
        .single();

      throwIfQueryFailed(error, "Falha ao criar carta.");
      return inserted;
    }
  });

export const deleteMatchCardFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      cardId: z.string().uuid(),
    })
  )
  .handler(async ({ data: { cardId } }) => {
    const supabase = getServerClient();
    const auth = await requireRole(["owner", "admin", "manager"]);
    const storeId = auth.store_id;

    const { error } = await supabase
      .from("match_cards")
      .delete()
      .eq("id", cardId)
      .eq("store_id", storeId);

    throwIfQueryFailed(error, "Falha ao remover carta.");
    return { success: true };
  });

export const generateMatchDeckAiBatchFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      deckTemplateId: z.string().uuid(),
      nicheId: z.string().default("geral"),
      targetPersona: z.string().optional(),
      count: z.number().int().min(2).max(10).default(4),
    })
  )
  .handler(async ({ data: { deckTemplateId, nicheId, count } }) => {
    const supabase = getServerClient();
    const auth = await requireRole(["owner", "admin", "manager"]);
    const storeId = auth.store_id;

    // Seeds canônicas curadas por nicho para garantia anti-synthetic
    const NICHE_TRADE_OFF_SEEDS: Record<string, Array<{
      title: string;
      subtitle: string;
      tradeOffAxis: string;
      axisWeights: Record<string, number>;
      badge: string;
    }>> = {
      turismo: [
        {
          title: "Praia Tropical ou Serra Serena?",
          subtitle: "Deslize para a direita se prefere água salgada e sol, ou esquerda para lareira e altitude.",
          tradeOffAxis: "clima_ambiente",
          axisWeights: { praia_sol: 1.0, serra_frio: -1.0 },
          badge: "Estilo de Viagem",
        },
        {
          title: "All-Inclusive ou Gastronomia de Rua?",
          subtitle: "Direita para comodidade e open bar ilimitado; esquerda para explorar bistrôs locais autênticos.",
          tradeOffAxis: "estilo_hospedagem",
          axisWeights: { resort_luxo: 1.0, exploracao_local: -1.0 },
          badge: "Experiência",
        },
        {
          title: "Roteiro Planejado ou Aventura Espontânea?",
          subtitle: "Direita para passeios com guia e horários marcados; esquerda para alugar um 4x4 e desbravar.",
          tradeOffAxis: "ritmo_viagem",
          axisWeights: { conforto_guiado: 1.0, aventura_livre: -1.0 },
          badge: "Ritmo",
        },
        {
          title: "Viagem Romântica a Dois ou Em Família?",
          subtitle: "Direita para refúgio tranquilo e intimista; esquerda para atrações com monitores e crianças.",
          tradeOffAxis: "companhia",
          axisWeights: { casal_romance: 1.0, familia_criancas: -1.0 },
          badge: "Perfil",
        },
      ],
      imobiliaria: [
        {
          title: "Casa em Condomínio ou Apartamento Central?",
          subtitle: "Direita para quintal amplo e segurança privativa; esquerda para conveniência e mobilidade a pé.",
          tradeOffAxis: "tipologia_imovel",
          axisWeights: { casa_espaco: 1.0, ap_central: -1.0 },
          badge: "Espaço",
        },
        {
          title: "Pronto para Morar ou Na Planta para Customizar?",
          subtitle: "Direita para mudar imediatamente; esquerda para personalizar acabamentos e valorização futura.",
          tradeOffAxis: "prazo_imovel",
          axisWeights: { pronto_imediato: 1.0, planta_investimento: -1.0 },
          badge: "Momento",
        },
      ],
      automotivo: [
        {
          title: "SUV Espaçoso ou Sedã Executivo?",
          subtitle: "Direita para posição alta de dirigir e porta-malas generoso; esquerda para elegância e dinâmica.",
          tradeOffAxis: "carroceria",
          axisWeights: { suv_espaco: 1.0, seda_conforto: -1.0 },
          badge: "Design",
        },
        {
          title: "Híbrido/Elétrico ou Motor Combustão Tradicional?",
          subtitle: "Direita para economia e zero emissões na cidade; esquerda para autonomia em estradas remotas.",
          tradeOffAxis: "propulsao",
          axisWeights: { eletrico_eco: 1.0, combustao_raiz: -1.0 },
          badge: "Motorização",
        },
      ],
    };

    const seeds = NICHE_TRADE_OFF_SEEDS[nicheId] || NICHE_TRADE_OFF_SEEDS.turismo;
    const selected = seeds.slice(0, count);

    const createdCards = [];
    let order = 10;
    for (const s of selected) {
      const { data: card } = await supabase
        .from("match_cards")
        .insert({
          store_id: storeId,
          deck_template_id: deckTemplateId,
          card_kind: "trade_off",
          title: s.title,
          subtitle: s.subtitle,
          badge: s.badge,
          trade_off_axis: s.tradeOffAxis,
          axis_weights: s.axisWeights,
          cta_label: "Quero Este Perfil",
          display_order: order,
          active: true,
        })
        .select("*")
        .single();

      if (card) createdCards.push(card);
      order += 10;
    }

    return {
      success: true,
      count: createdCards.length,
      cards: createdCards,
    };
  });

