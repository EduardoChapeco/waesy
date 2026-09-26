import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getIdentity } from "./identity.functions";

// ---------------------------------------------------------------------------
// 1. SUBMIT DEAL REVIEW (AVALIAÇÃO VERIFICADA DE LEAD/NEGÓCIO)
// ---------------------------------------------------------------------------

export const SubmitDealReviewSchema = z.object({
  dealId: z.string().uuid("ID de negociação inválido"),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export const submitDealReview = createServerFn({ method: "POST" })
  .validator(SubmitDealReviewSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) {
      throw new Error("Você precisa estar conectado para avaliar.");
    }

    // 1. Validar se o deal existe e se o usuário é o comprador
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("id, buyer_id, seller_id, classified_id, classifieds(store_id)")
      .eq("id", data.dealId)
      .single();

    if (dealError || !deal) {
      throw new Error("Negociação não encontrada.");
    }

    if (deal.buyer_id !== identity.id) {
      throw new Error("Apenas o comprador registrado nesta negociação pode enviar uma avaliação.");
    }

    // Obter store_id do anúncio ou do vendedor
    let storeId: string | null = (deal.classifieds as any)?.store_id || null;
    if (!storeId) {
      const { data: storeMem } = await supabase
        .from("workspace_members")
        .select("store_id")
        .eq("profile_id", deal.seller_id)
        .limit(1)
        .maybeSingle();
      storeId = storeMem?.store_id || null;
    }

    // 2. Inserir ou atualizar a avaliação única do deal
    const { data: review, error: reviewError } = await supabase
      .from("deal_reviews")
      .upsert(
        {
          deal_id: deal.id,
          store_id: storeId,
          classified_id: deal.classified_id,
          reviewer_id: identity.id,
          seller_id: deal.seller_id,
          rating: data.rating,
          comment: data.comment || null,
          is_verified_deal: true,
          status: "approved",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "deal_id,reviewer_id" }
      )
      .select()
      .single();

    if (reviewError) {
      throw new Error("Erro ao salvar avaliação: " + reviewError.message);
    }

    return {
      success: true,
      review,
    };
  });

// ---------------------------------------------------------------------------
// 2. RESPOND TO REVIEW (LOJISTA / VENDEDOR RESPONDE AO FEEDBACK)
// ---------------------------------------------------------------------------

export const RespondToDealReviewSchema = z.object({
  reviewId: z.string().uuid("ID de avaliação inválido"),
  responseComment: z.string().min(2, "A resposta deve ter pelo menos 2 caracteres").max(1000),
});

export const respondToDealReview = createServerFn({ method: "POST" })
  .validator(RespondToDealReviewSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) {
      throw new Error("Não autenticado.");
    }

    const { data: existing, error: fetchErr } = await supabase
      .from("deal_reviews")
      .select("id, seller_id, store_id")
      .eq("id", data.reviewId)
      .single();

    if (fetchErr || !existing) {
      throw new Error("Avaliação não encontrada.");
    }

    // Validar se o usuário é o vendedor ou gestor da loja
    const isSeller = existing.seller_id === identity.id;
    let isStoreStaff = false;
    if (existing.store_id) {
      const { data: member } = await supabase
        .from("workspace_members")
        .select("id")
        .eq("store_id", existing.store_id)
        .eq("profile_id", identity.id)
        .maybeSingle();
      isStoreStaff = !!member;
    }

    if (!isSeller && !isStoreStaff && identity.role !== "admin") {
      throw new Error("Você não tem autoridade para responder a esta avaliação.");
    }

    const { data: updated, error: updateErr } = await supabase
      .from("deal_reviews")
      .update({
        response_comment: data.responseComment,
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.reviewId)
      .select()
      .single();

    if (updateErr) {
      throw new Error("Erro ao responder avaliação: " + updateErr.message);
    }

    return { success: true, review: updated };
  });

// ---------------------------------------------------------------------------
// 3. LIST STORE REVIEWS & REPUTATION STATS
// ---------------------------------------------------------------------------

export const ListStoreDealReviewsSchema = z.object({
  storeId: z.string().uuid().optional(),
  sellerId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
});

export const listStoreDealReviews = createServerFn({ method: "GET" })
  .validator(ListStoreDealReviewsSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    let query = supabase
      .from("deal_reviews")
      .select(`
        *,
        reviewer:reviewer_id (id, full_name, avatar_url),
        classified:classified_id (id, title, price_cents)
      `)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(data?.limit || 20);

    if (data?.storeId) {
      query = query.eq("store_id", data.storeId);
    } else if (data?.sellerId) {
      query = query.eq("seller_id", data.sellerId);
    }

    const { data: reviews, error } = await query;
    if (error) {
      console.warn("[deal-reviews] Erro ao listar avaliações:", error);
      return {
        reviews: [],
        stats: {
          average_rating: 5.0,
          total_reviews: 0,
          count_5_stars: 0,
          count_4_stars: 0,
          count_3_stars: 0,
          count_low_stars: 0,
          verified_percentage: 100,
        },
      };
    }

    // Calcular estatísticas agregadas
    const all = reviews || [];
    const total = all.length;
    const avg =
      total > 0
        ? Number((all.reduce((acc, r) => acc + (Number(r.rating) || 0), 0) / total).toFixed(1))
        : 0;

    const stats = {
      average_rating: avg,
      total_reviews: total,
      count_5_stars: all.filter((r) => r.rating === 5).length,
      count_4_stars: all.filter((r) => r.rating === 4).length,
      count_3_stars: all.filter((r) => r.rating === 3).length,
      count_low_stars: all.filter((r) => r.rating <= 2).length,
      verified_percentage: 100,
    };

    return {
      reviews: all,
      stats,
    };
  });

// ---------------------------------------------------------------------------
// 4. CHECK CAN REVIEW DEAL
// ---------------------------------------------------------------------------

export const checkCanReviewDeal = createServerFn({ method: "GET" })
  .validator(z.object({ dealId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) return { canReview: false, existingReview: null };

    const { data: deal } = await supabase
      .from("deals")
      .select("id, buyer_id, seller_id, status")
      .eq("id", data.dealId)
      .maybeSingle();

    if (!deal || deal.buyer_id !== identity.id) {
      return { canReview: false, existingReview: null };
    }

    const { data: existingReview } = await supabase
      .from("deal_reviews")
      .select("*")
      .eq("deal_id", data.dealId)
      .eq("reviewer_id", identity.id)
      .maybeSingle();

    return {
      canReview: !existingReview,
      existingReview: existingReview || null,
    };
  });
