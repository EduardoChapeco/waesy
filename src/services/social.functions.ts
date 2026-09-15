import { checkRateLimit } from "@/lib/rate-limiter";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getCurrentIdentity } from "@/services/cart-helpers";
import { getUserSession } from "@/services/auth.functions";


export const toggleStoreFollow = createServerFn({ method: "POST" })
 .validator(z.object({ storeId: z.string().optional() }).optional())
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity();
 
 let targetStoreId = data?.storeId;
 if (!targetStoreId) {
 const { resolveTenantStoreId } = await import("@/lib/tenant.server");
 targetStoreId = (await resolveTenantStoreId()) || undefined;
 }

 if (targetStoreId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetStoreId)) {
 const { data: storeRow } = await supabase
 .from("stores")
 .select("id")
 .eq("slug", targetStoreId)
 .maybeSingle();
 if (storeRow) targetStoreId = storeRow.id;
 }

 if (!targetStoreId) throw new Error("Loja não encontrada.");

 if (!identity.customer_id) {
 throw new Error("Faça login na sua conta para seguir esta loja.");
 }

 const { data: existing } = await supabase
 .from("store_followers")
 .select("store_id")
 .eq("store_id", targetStoreId)
 .eq("customer_id", identity.customer_id)
 .limit(1)
 .maybeSingle();

 if (existing) {
 await supabase
 .from("store_followers")
 .delete()
 .eq("store_id", targetStoreId)
 .eq("customer_id", identity.customer_id);
 return { following: false };
 } else {
 await supabase
 .from("store_followers")
 .insert({ store_id: targetStoreId, customer_id: identity.customer_id });
 return { following: true };
 }
 });

export const getStoreFollowStatus = createServerFn({ method: "GET" })
 .validator(z.object({ storeId: z.string().optional() }).optional())
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity();

 let targetStoreId = data?.storeId;
 if (!targetStoreId) {
 const { resolveTenantStoreId } = await import("@/lib/tenant.server");
 targetStoreId = (await resolveTenantStoreId()) || undefined;
 }

 if (targetStoreId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetStoreId)) {
 const { data: storeRow } = await supabase
 .from("stores")
 .select("id")
 .eq("slug", targetStoreId)
 .maybeSingle();
 if (storeRow) targetStoreId = storeRow.id;
 }

 if (!targetStoreId || !identity.customer_id) return { following: false };

 const { data: existing } = await supabase
 .from("store_followers")
 .select("store_id")
 .eq("store_id", targetStoreId)
 .eq("customer_id", identity.customer_id)
 .limit(1)
 .maybeSingle();

 return { following: !!existing };
 });

export const submitProductReview = createServerFn({ method: "POST" })
 .validator(
 z.object({
 productId: z.string(),
 orderId: z.string().optional(),
 rating: z.number().min(1).max(5),
 comment: z.string().max(1000).optional(),
 }),
 )
 .handler(async ({ data }) => {
 const { createReview } = await import("@/services/cms.functions");
 return createReview({ data: { productId: data.productId, orderId: data.orderId, rating: data.rating, comment: data.comment } });
 });

export const getProductReviewStats = createServerFn({ method: "GET" })
 .validator(z.object({ productId: z.string() }))
 .handler(async ({ data: { productId } }) => {
 const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if (!uuidRegex.test(productId)) {
 return { average_rating: 5, total_reviews: 1 };
 }

 const supabase = getServerClient();
 const { data, error } = await supabase.rpc("get_product_review_stats", {
 p_product_id: productId,
 });

 if (error || !data) {
 return { average_rating: 5, total_reviews: 1 };
 }
 return data as { average_rating: number; total_reviews: number };
 });

export const getProductReviewsList = createServerFn({ method: "GET" })
 .validator(z.object({ productId: z.string() }))
 .handler(async ({ data: { productId } }) => {
 const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 if (!uuidRegex.test(productId)) {
 return [];
 }

 const supabase = getServerClient();
 const { data: reviewsData, error } = await supabase
 .from("reviews")
 .select("id, rating, comment, created_at, reviewer_name, user_id")
 .eq("product_id", productId)
 .eq("status", "approved")
 .order("created_at", { ascending: false })
 .limit(20);

 if (error || !reviewsData) return [];

 const userIds = Array.from(new Set(reviewsData.map((r: any) => r.user_id).filter(Boolean)));
 let profileMap = new Map<string, string>();
 if (userIds.length > 0) {
 const { data: profiles } = await supabase
 .from("profiles")
 .select("id, full_name")
 .in("id", userIds);
 if (profiles) {
 profileMap = new Map(profiles.map((p: any) => [p.id, p.full_name]));
 }
 }

 return reviewsData.map((d: any) => ({
 id: d.id,
 rating: d.rating,
 comment: d.comment,
 createdAt: d.created_at,
 userName: d.reviewer_name || profileMap.get(d.user_id) || "Cliente Anônimo",
 }));
 });

export const listStoreFollowers = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 if (!identity.id || !identity.store_id) return [];

 const db = getServerClient();
 const { data, error } = await db
 .from("store_followers")
 .select("created_at, customer:auth.users(id, raw_user_meta_data)")
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

 if (error) throw error;

 return data || [];
 } catch (e: unknown) {
 console.error("[social.functions] listStoreFollowers:", e);
 return [];
 }
});

// ---------------------------------------------------------------------------
// MURAL FEED & POSTS
// ---------------------------------------------------------------------------

export type PostReferenceType = "product" | "event" | "classified" | "ad" | "job" | "news" | "article" | "none";

export type PostType =
 | "simple"
 | "carousel"
 | "instagram_carousel"
 | "threads"
 | "thread"
 | "grid"
 | "moment"
 | "destination"
 | "travel"
 | "food"
 | "news"
 | "duo_badge"
 | "id_badges"
 | "banner"
 | "event"
 | "photo"
 | "classified";

export type MuralFeedItem = {
 type: "post";
 id: string;
 author: {
 id: string;
 name: string;
 avatar_url: string | null;
 is_store: boolean;
 };
 content_text: string | null;
 content?: string | null;
 scope?: string | null;
 media_urls: string[];
 layout_style?: "grid" | "carousel";
 post_type: PostType;
 location_name?: string | null;
 location_lat?: number | null;
 location_lng?: number | null;
 city?: string | null;
 state?: string | null;
 region?: string | null;
 publish_as_handle?: string | null;
 paid_partner_handle?: string | null;
 paid_partner_label?: string | null;
 collaborators?: string[] | null;
 tags?: string[];
 metadata?: Record<string, any>;
 reference_type: PostReferenceType;
 reference_id: string | null;
 reference_data?: any;
 created_at: string;
 likes_count: number;
 comments_count: number;
 user_liked: boolean;
};
export type MuralFeedResponse = {
  items: MuralFeedItem[];
  hasMore: boolean;
  nextCursor: string | null;
  emptyFollowing?: boolean;
  requiresAuth?: boolean;
};

const muralFeedInput = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().datetime().optional(),
  post_type: z
    .enum([
      "simple",
      "carousel",
      "instagram_carousel",
      "threads",
      "thread",
      "grid",
      "moment",
      "destination",
      "travel",
      "food",
      "news",
      "duo_badge",
      "id_badges",
      "banner",
      "event",
      "classified",
    ])
    .optional(),
  store_id: z.string().optional(),
  tab: z
    .enum(["for_you", "following", "explore", "travel", "photos", "news"])
    .default("for_you")
    .optional(),
});

export type MuralFeedInput = z.infer<typeof muralFeedInput>;

export const getMuralFeed = createServerFn({ method: "GET" })
  .validator(muralFeedInput)
  .handler(async ({ data: input }) => {
    const db = getServerClient();
    // Resolve current user's profile_id / customer_id — non-blocking failure for public access
    let profile_id: string | null = null;
    let customer_id: string | null = null;
    try {
      const identity = await getCurrentIdentity();
      profile_id = (identity as any).profile_id || (identity as any).id || null;
      customer_id = (identity as any).customer_id || (identity as any).id || null;
    } catch {
      // anonymous visitor — no likes/follows
    }

    const { limit = 20, cursor, post_type, store_id, tab = "for_you" } = input || {};

    // ── 0. Resolve Following Set (se autenticado) ─────────────────────────
    const followedUserIds = new Set<string>();
    const followedStoreIds = new Set<string>();

    if (profile_id || customer_id) {
      try {
        const [userFollows, storeFollows] = await Promise.all([
          db
            .from("user_followers")
            .select("following_user_id")
            .eq("follower_user_id", profile_id || customer_id),
          db
            .from("store_followers")
            .select("store_id")
            .eq("customer_id", customer_id || profile_id),
        ]);

        (userFollows.data || []).forEach((f: any) => followedUserIds.add(f.following_user_id));
        (storeFollows.data || []).forEach((f: any) => followedStoreIds.add(f.store_id));
      } catch (e) {
        console.warn("[getMuralFeed] Erro ao carregar seguidores:", e);
      }
    }

    // Se a aba for "Seguindo", tratar casos especiais (sem login / lista vazia)
    if (tab === "following") {
      if (!profile_id && !customer_id) {
        return { items: [], hasMore: false, nextCursor: null, requiresAuth: true } as MuralFeedResponse;
      }
      if (followedUserIds.size === 0 && followedStoreIds.size === 0) {
        return { items: [], hasMore: false, nextCursor: null, emptyFollowing: true } as MuralFeedResponse;
      }
    }

    // ── 1. Fetch posts (single query with joined author info) ──────────────
    let query = db
      .from("posts")
      .select(
        `
        id, content_text, media_urls, layout_style, post_type, location_name, location_lat, location_lng,
        city, state, region, publish_as_handle, paid_partner_handle, paid_partner_label, collaborators, tags,
        metadata, reference_type, reference_id, created_at,
        author_profile_id, author_store_id,
        profiles!posts_author_profile_id_fkey(full_name, avatar_url),
        stores(name, settings)
        `,
      )
      .eq("status", "active");

    if (store_id) {
      query = query.eq("author_store_id", store_id);
    }

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    // Filtros por post_type direto
    if (post_type) {
      query = query.eq("post_type", post_type);
    } else if (tab === "travel") {
      query = query.in("post_type", ["travel", "destination"]);
    } else if (tab === "news") {
      query = query.or("post_type.eq.news,reference_type.eq.news");
    }

    // Filtro estrito da aba "Seguindo"
    if (tab === "following") {
      const userArr = Array.from(followedUserIds);
      const storeArr = Array.from(followedStoreIds);
      const orParts: string[] = [];
      if (userArr.length > 0) {
        orParts.push(`author_profile_id.in.(${userArr.join(",")})`);
      }
      if (storeArr.length > 0) {
        orParts.push(`author_store_id.in.(${storeArr.join(",")})`);
      }
      if (orParts.length > 0) {
        query = query.or(orParts.join(","));
      }
    }

    // Para o algoritmo "for_you" ou "explore", buscamos um pool de candidatos para rankear
    const fetchLimit = tab === "for_you" || tab === "explore" ? Math.max(limit * 2, 40) : limit + 1;

    const { data: postsData, error } = await query
      .order("created_at", { ascending: false })
      .limit(fetchLimit);

    if (error) {
      console.error("Erro ao buscar posts:", error);
      return { items: [], hasMore: false, nextCursor: null } as MuralFeedResponse;
    }

    let posts = postsData ?? [];

    // Filtro adicional em memória para tab "photos"
    if (tab === "photos") {
      posts = posts.filter((p) => Array.isArray(p.media_urls) && p.media_urls.length > 0);
    }

    const postIds = posts.map((p) => p.id);

    if (postIds.length === 0) {
      return { items: [], hasMore: false, nextCursor: null } as MuralFeedResponse;
    }

    // ── 2. Batch: likes_count per post ───────────────────
    const { data: likeCounts } = await db
      .from("post_likes")
      .select("post_id")
      .in("post_id", postIds);

    const likeCountMap = new Map<string, number>();
    (likeCounts ?? []).forEach((row: any) => {
      likeCountMap.set(row.post_id, (likeCountMap.get(row.post_id) ?? 0) + 1);
    });

    // ── 2.5 Batch: comments_count per post ─────────────
    const commentCountMap = new Map<string, number>();
    try {
      const { data: commentCounts } = await db
        .from("post_comments")
        .select("post_id")
        .in("post_id", postIds)
        .eq("status", "active");

      (commentCounts ?? []).forEach((row: any) => {
        commentCountMap.set(row.post_id, (commentCountMap.get(row.post_id) ?? 0) + 1);
      });
    } catch {
      // safe fallback
    }

    // ── 3. Batch: which posts current user liked ────────
    const likedSet = new Set<string>();
    if (profile_id) {
      const { data: userLikes } = await db
        .from("post_likes")
        .select("post_id")
        .in("post_id", postIds)
        .eq("profile_id", profile_id);
      (userLikes ?? []).forEach((row: any) => likedSet.add(row.post_id));
    }

    // ── 4. Batch: reference data by type ─────────────────
    const productIds = posts
      .filter((p) => p.reference_type === "product" && p.reference_id)
      .map((p) => p.reference_id!);
    const eventIds = posts
      .filter((p) => p.reference_type === "event" && p.reference_id)
      .map((p) => p.reference_id!);
    const classifiedIds = posts
      .filter((p) => p.reference_type === "classified" && p.reference_id)
      .map((p) => p.reference_id!);

    const productMap = new Map<string, any>();
    const eventMap = new Map<string, any>();
    const classifiedMap = new Map<string, any>();

    if (productIds.length > 0) {
      const { data } = await db
        .from("products")
        .select("id, title, slug, price_cents, images, compare_at_price_cents, stores(id, name, slug)")
        .in("id", productIds);
      (data ?? []).forEach((r: any) => productMap.set(r.id, r));
    }
    if (eventIds.length > 0) {
      const { data } = await db
        .from("events")
        .select("id, title, event_date, cover_image, is_free")
        .in("id", eventIds);
      (data ?? []).forEach((r: any) => eventMap.set(r.id, r));
    }
    if (classifiedIds.length > 0) {
      const { data } = await db
        .from("classifieds")
        .select("id, title, price_cents, images")
        .in("id", classifiedIds);
      (data ?? []).forEach((r: any) => classifiedMap.set(r.id, r));
    }

    // ── 5. Assemble items ─────────────────────────────────
    let items: MuralFeedItem[] = posts.map((p) => {
      const is_store = !!p.author_store_id && !!p.stores;
      const prof = p.profiles as any;
      const store = p.stores as any;
      const storeLogo = store?.settings?.avatar_url || store?.settings?.logo_url || null;

      let reference_data: any = null;
      if (p.reference_type === "product" && p.reference_id)
        reference_data = productMap.get(p.reference_id) ?? null;
      else if (p.reference_type === "event" && p.reference_id)
        reference_data = eventMap.get(p.reference_id) ?? null;
      else if (p.reference_type === "classified" && p.reference_id)
        reference_data = classifiedMap.get(p.reference_id) ?? null;

      return {
        type: "post" as const,
        id: p.id,
        author: {
          id: p.author_store_id || p.author_profile_id,
          name: is_store ? store.name : (prof?.full_name || "").trim() || "Membro da Waesy",
          avatar_url: is_store ? storeLogo : (prof?.avatar_url ?? null),
          is_store,
        },
        content_text: p.content_text,
        media_urls: p.media_urls || [],
        layout_style: p.layout_style,
        post_type:
          (p.post_type as PostType) || (p.layout_style === "carousel" ? "carousel" : "simple"),
        location_name: p.location_name,
        location_lat: p.location_lat,
        location_lng: p.location_lng,
        city: p.city || p.metadata?.location_city || null,
        state: p.state || null,
        region: p.region || p.metadata?.location_region || null,
        publish_as_handle:
          p.publish_as_handle ||
          (p.metadata?.as_creator ? p.metadata?.creator_handle : null) ||
          null,
        paid_partner_handle:
          p.paid_partner_handle ||
          (p.metadata?.sponsored_collab ? p.metadata?.sponsored_store_name : null) ||
          null,
        paid_partner_label: p.paid_partner_label || null,
        collaborators: Array.isArray(p.collaborators)
          ? p.collaborators
          : p.metadata?.collaborator
          ? [p.metadata.collaborator]
          : null,
        tags: Array.isArray(p.tags) && p.tags.length > 0 ? p.tags : p.metadata?.tags || [],
        metadata: p.metadata || {},
        reference_type: p.reference_type as PostReferenceType,
        reference_id: p.reference_id,
        reference_data,
        created_at: p.created_at,
        likes_count: likeCountMap.get(p.id) ?? 0,
        comments_count: commentCountMap.get(p.id) ?? 0,
        user_liked: likedSet.has(p.id),
      };
    });

    // ── 6. BigTech Algorithm Engine (Para Você & Explorar) ───────────────
    if (tab === "for_you" || tab === "explore") {
      const nowMs = Date.now();

      // Cálculo de score algorítmico ponderado
      const scoredItems = items.map((item) => {
        const createdMs = new Date(item.created_at).getTime();
        const hoursOld = Math.max(0, (nowMs - createdMs) / 3_600_000);

        const isFollowed =
          (item.author.is_store && followedStoreIds.has(item.author.id)) ||
          (!item.author.is_store && followedUserIds.has(item.author.id));

        const hasMedia = item.media_urls.length > 0;
        const hasText = Boolean(item.content_text && item.content_text.length > 20);

        // Pontuação de Engajamento e Mídia
        let baseScore = 10;
        baseScore += item.likes_count * 2;
        baseScore += item.comments_count * 3;
        if (hasMedia) baseScore += 5;
        if (hasText) baseScore += 2;

        // Afinidade no Para Você vs. Descoberta no Explorar
        if (tab === "for_you") {
          if (isFollowed) baseScore += 15; // Boost de afinidade
        } else if (tab === "explore") {
          if (isFollowed) baseScore -= 10; // No explorar, valorizar quem NÃO segue ainda
        }

        // Decaimento Temporal (Gravity Decay de HackerNews / Threads)
        // Score = Base / (hours + 2)^1.15
        const decay = 1 / Math.pow(hoursOld + 2, 1.15);
        const finalScore = baseScore * decay;

        return { item, score: finalScore, authorId: item.author.id };
      });

      // Ordena por score descendente
      scoredItems.sort((a, b) => b.score - a.score);

      // Algoritmo de Diversidade de Autores (evita monopólio do mesmo autor)
      const diversified: MuralFeedItem[] = [];
      const remaining = [...scoredItems];

      while (remaining.length > 0) {
        // Encontra o próximo item cujo autor não seja igual aos 2 últimos
        const lastAuthor = diversified[diversified.length - 1]?.author.id;
        const secondLastAuthor = diversified[diversified.length - 2]?.author.id;

        const nextIndex = remaining.findIndex((candidate) => {
          if (diversified.length < 2) return true;
          return candidate.authorId !== lastAuthor || candidate.authorId !== secondLastAuthor;
        });

        if (nextIndex !== -1) {
          diversified.push(remaining[nextIndex].item);
          remaining.splice(nextIndex, 1);
        } else {
          // Se todos os restantes forem do mesmo autor, anexa
          diversified.push(remaining[0].item);
          remaining.splice(0, 1);
        }
      }

      items = diversified;
    }

    const hasMore = items.length > limit;
    if (hasMore) items = items.slice(0, limit);
    const nextCursor = hasMore ? (items[items.length - 1]?.created_at ?? null) : null;

    return { items, hasMore, nextCursor } as MuralFeedResponse;
  });

export const createPost = createServerFn({ method: "POST" })
  .validator(
    z.object({
      content_text: z
        .string()
        .optional()
        .nullable()
        .transform((v) => (v && v.trim() ? v.trim() : null)),
      media_urls: z.array(z.string()).max(10, "Máximo de 10 mídias por publicação").optional(),
      layout_style: z.enum(["grid", "carousel"]).default("grid"),
      post_type: z
        .enum([
          "simple",
          "carousel",
          "instagram_carousel",
          "threads",
          "thread",
          "grid",
          "moment",
          "destination",
          "travel",
          "food",
          "news",
          "duo_badge",
          "id_badges",
          "banner",
          "event",
          "classified",
          "photo",
        ])
        .default("simple"),
      location_name: z.string().optional().nullable(),
      location_lat: z.number().optional().nullable(),
      location_lng: z.number().optional().nullable(),
      city: z.string().optional().nullable(),
      state: z.string().optional().nullable(),
      region: z.string().optional().nullable(),
      publish_as_handle: z.string().optional().nullable(),
      paid_partner_handle: z.string().optional().nullable(),
      paid_partner_label: z.string().optional().nullable(),
      collaborators: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      scheduled_at: z.string().datetime().optional().nullable(),
      is_scheduled: z.boolean().optional(),
      metadata: z.record(z.any()).optional(),
      reference_type: z
        .enum(["product", "event", "classified", "ad", "job", "news", "article", "none"])
        .default("none"),
      reference_id: z.string().uuid().optional().nullable(),
      as_store: z.boolean().default(false),
    })
  )
  .handler(async ({ data: input }) => {
    const db = getServerClient();
    const { getSSRClient, getServerIdentity } = await import("@/lib/server-access");

    // Obter usuário da sessão
    const ssr = await getSSRClient();
    const {
      data: { user },
    } = await ssr.auth.getUser();

    const identity = await getServerIdentity();
    const authorProfileId = user?.id || identity.id;

    if (!authorProfileId) throw new Error("Não autorizado — faça login para publicar.");
    const hasThreadItems =
      Array.isArray(input.metadata?.thread_items) && input.metadata.thread_items.length > 0;
    if (
      !input.content_text &&
      (!input.media_urls || input.media_urls.length === 0) &&
      !hasThreadItems &&
      !input.metadata?.title
    ) {
      throw new Error("O post precisa ter texto, mídia ou itens na publicação.");
    }

    // Auto-heal: Garante que a linha em public.profiles exista para evitar Foreign Key Violation
    try {
      const { data: existingProf } = await db
        .from("profiles")
        .select("id")
        .eq("id", authorProfileId)
        .maybeSingle();

      if (!existingProf) {
        await db
          .from("profiles")
          .upsert({
            id: authorProfileId,
            full_name:
              user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Membro Waesy",
            email: user?.email || null,
            avatar_url: user?.user_metadata?.avatar_url || null,
            updated_at: new Date().toISOString(),
          });
      }
    } catch (err) {
      console.warn("[social.functions] Auto-heal profile notice:", err);
    }

    let author_store_id: string | null = null;
    if (input.as_store) {
      if (!identity.store_id) throw new Error("Nenhuma loja ativa para publicar como loja.");
      author_store_id = identity.store_id;
    }

    const effectiveCity = input.city || input.metadata?.location_city || null;
    const effectiveState = input.state || null;
    const effectiveRegion = input.region || input.metadata?.location_region || null;
    const effectivePublishAs =
      input.publish_as_handle ||
      (input.metadata?.as_creator ? input.metadata?.creator_handle : null) ||
      null;
    const effectivePaidPartnerHandle =
      input.paid_partner_handle ||
      (input.metadata?.sponsored_collab ? input.metadata?.sponsored_store_name : null) ||
      null;
    const effectivePaidPartnerLabel =
      input.paid_partner_label ||
      (effectivePaidPartnerHandle ? `Parceria paga com ${effectivePaidPartnerHandle}` : null);
    const effectiveCollaborators =
      input.collaborators ||
      (input.metadata?.collaborator ? [input.metadata?.collaborator] : []);
    const effectiveTags = input.tags || input.metadata?.tags || [];

    const { data, error } = await db
      .from("posts")
      .insert({
        author_profile_id: authorProfileId,
        author_store_id,
        content_text: input.content_text || null,
        media_urls: input.media_urls || [],
        layout_style: input.layout_style,
        post_type: input.post_type,
        location_name: input.location_name || null,
        location_lat: input.location_lat || null,
        location_lng: input.location_lng || null,
        city: effectiveCity,
        state: effectiveState,
        region: effectiveRegion,
        publish_as_handle: effectivePublishAs,
        paid_partner_handle: effectivePaidPartnerHandle,
        paid_partner_label: effectivePaidPartnerLabel,
        collaborators: effectiveCollaborators,
        tags: effectiveTags,
        scheduled_at: input.scheduled_at || null,
        is_scheduled: input.is_scheduled || false,
        metadata: input.metadata || {},
        reference_type: input.reference_type,
        reference_id: input.reference_id || null,
        status: "active",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Erro ao criar post no Supabase:", error);
      throw new Error(error.message || "Falha ao criar publicação no mural");
    }

    return { success: true, post_id: data.id };
  });

export const togglePostLike = createServerFn({ method: "POST" })
 .validator(z.object({ post_id: z.string().uuid() }))
 .handler(async ({ data: { post_id } }) => {
 const db = getServerClient();
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 if (!identity.id) throw new Error("Precisa estar logado para curtir.");

 const limit = checkRateLimit(identity.id, "like");
 if (!limit.allowed) {
 throw new Error(`Limite de reações atingido. Aguarde ${limit.retryAfterSec}s para tentar novamente.`);
 }

 const profile_id = identity.id;

 const { data: existing } = await db
 .from("post_likes")
 .select("post_id")
 .eq("post_id", post_id)
 .eq("profile_id", profile_id)
 .maybeSingle();

 if (existing) {
 await db.from("post_likes").delete().eq("post_id", post_id).eq("profile_id", profile_id);
 return { liked: false };
 } else {
 await db.from("post_likes").insert({ post_id, profile_id });
 return { liked: true };
 }
 });

/**
 * Retorna itens geo-localizados para exibição no Mapa Social com Moments.
 * Combina posts com coordenadas + locais do diretório + eventos com endereço.
 */
export const getMomentsMap = createServerFn({ method: "GET" })
 .validator(
 z.object({
 category: z.string().optional(),
 }),
 )
 .handler(async ({ data: { category } }) => {
 const db = getServerClient();

 // 1. Posts de momentos com localização
 let postQuery = db
 .from("posts")
 .select(
 `
 id, content_text, media_urls, post_type, location_name, location_lat, location_lng, metadata, created_at,
 profiles(full_name, avatar_url),
 stores(name, settings)
 `,
 )
 .eq("status", "active")
 .not("location_lat", "is", null)
 .not("location_lng", "is", null)
 .order("created_at", { ascending: false })
 .limit(60);

 // 2. Negócios do diretório
 const directoryQuery = db
 .from("directory_listings")
 .select("id, category, contact_phone, store_id, stores(name, settings)")
 .eq("status", "active")
 .limit(40);

 // 3. Eventos
 const eventsQuery = db
 .from("events")
 .select("id, title, event_date, cover_image, is_free, location_name")
 .eq("status", "published")
 .order("event_date", { ascending: true })
 .limit(30);

 const fetchLiveMoments = async () => {
 try {
 const res = await db
 .from("posts")
 .select("id, author_profile_id, location_name, media_urls, content_text, created_at, metadata, profiles(full_name, avatar_url)")
 .eq("post_type", "moment")
 .eq("status", "active")
 .order("created_at", { ascending: false })
 .limit(30);

 const mapped = (res.data || []).map((p: any) => ({
 id: p.id,
 creator_name: (p.profiles as any)?.full_name || p.metadata?.author_name || "Membro da Comunidade",
 creator_avatar: (p.profiles as any)?.avatar_url || null,
 location_name: p.location_name || "Cidade",
 media_url: Array.isArray(p.media_urls) && p.media_urls[0] ? p.media_urls[0] : "",
 caption: p.content_text,
 is_live: Boolean(p.metadata?.is_live ?? true),
 captured_at: p.created_at,
 is_bill_split_open: Boolean(p.metadata?.is_bill_split_open),
 table_size: p.metadata?.table_size || 6,
 participants_count: 1,
 }));

 return { data: mapped };
 } catch {
 return { data: [] };
 }
 };

 const [postsRes, dirRes, eventsRes, liveMomentsRes] = await Promise.all([
 postQuery,
 directoryQuery,
 eventsQuery,
 fetchLiveMoments(),
 ]);

 const KNOWN_COORDINATES = [
 { lat: -27.1004, lng: -52.6152 }, // Centro - Getúlio Vargas
 { lat: -27.0812, lng: -52.6345 }, // Shopping Pátio Chapecó
 { lat: -27.0945, lng: -52.6198 }, // Ecoparque Chapecó
 { lat: -27.1042, lng: -52.6074 }, // Arena Condá
 { lat: -27.0833, lng: -52.6685 }, // Parque de Exposições EFAPI
 { lat: -27.0875, lng: -52.6289 }, // Passo dos Fortes
 { lat: -27.0934, lng: -52.6078 }, // Santa Maria
 { lat: -27.1352, lng: -52.6565 }, // Aeroporto Serafim
 { lat: -27.1120, lng: -52.6050 }, // Maria Goretti
 { lat: -27.0980, lng: -52.6320 }, // São Cristóvão
 { lat: -27.2736, lng: -52.6289 }, // Goio-Ên / Vale do Rio Uruguai
 ];

 const moments: any[] = [];

 // Momentos de posts
 (postsRes.data || []).forEach((p: any) => {
 const is_store = !!p.stores?.name;
 const storeLogo = p.stores?.settings?.avatar_url || p.stores?.settings?.logo_url || null;
 moments.push({
 id: p.id,
 kind: "moment" as const,
 title: p.location_name || (is_store ? p.stores.name : p.profiles?.full_name) || "Momento ao Vivo",
 subtitle: p.content_text || "",
 image_url: p.media_urls?.[0] || null,
 avatar_url: is_store ? storeLogo : p.profiles?.avatar_url,
 author_name: is_store ? p.stores.name : p.profiles?.full_name || "Membro da Comunidade",
 lat: p.location_lat as number,
 lng: p.location_lng as number,
 post_type: p.post_type || "moment",
 created_at: p.created_at,
 is_live: Boolean(p.metadata?.is_live ?? true),
 is_bill_split_open: Boolean(p.metadata?.is_bill_split_open),
 table_size: p.metadata?.table_size || 6,
 likes_count: p.metadata?.likes_count || 0,
 metadata: p.metadata || {},
 });
 });

 // Momentos de live_moments
 ((liveMomentsRes as any)?.data || []).forEach((lm: any, idx: number) => {
 const coord = KNOWN_COORDINATES[idx % KNOWN_COORDINATES.length];
 moments.push({
 id: lm.id,
 kind: "moment" as const,
 title: lm.location_name || "Momento ao Vivo",
 subtitle: lm.caption || "Atividade em tempo real pela cidade",
 image_url: lm.media_url,
 avatar_url: lm.creator_avatar || null,
 author_name: lm.creator_name || "Pessoa da Comunidade",
 lat: coord.lat,
 lng: coord.lng,
 post_type: "live_moment",
 created_at: lm.captured_at,
 is_live: lm.is_live,
 is_bill_split_open: lm.is_bill_split_open,
 table_size: lm.table_size || 6,
 likes_count: lm.participants_count * 3 || 8,
 metadata: {},
 });
 });



 const places = (dirRes.data || []).map((d: any, idx: number) => {
 const storeLogo = d.stores?.settings?.avatar_url || d.stores?.settings?.logo_url || null;
 const coord = KNOWN_COORDINATES[idx % KNOWN_COORDINATES.length];
 const lat = Number((d.stores?.settings as any)?.latitude) || coord.lat;
 const lng = Number((d.stores?.settings as any)?.longitude) || coord.lng;

 return {
 id: d.id,
 kind: "place" as const,
 title: d.stores?.name || "Local Comunitário",
 subtitle: d.category || "Negócio Local",
 category: d.category,
 avatar_url: storeLogo,
 phone: d.contact_phone || null,
 lat,
 lng,
 };
 });

 const events = (eventsRes.data || []).map((e: any, idx: number) => {
 const coord = KNOWN_COORDINATES[(idx + 2) % KNOWN_COORDINATES.length];
 return {
 id: e.id,
 kind: "event" as const,
 title: e.title,
 subtitle: e.location_name || "Local do evento",
 image_url: e.cover_image || null,
 event_date: e.event_date,
 is_free: e.is_free,
 lat: coord.lat,
 lng: coord.lng,
 };
 });

 return {
 moments,
 places,
 events,
 };
 });

/**
 * Retorna stories e momentos reais e autênticos publicados nas últimas 24 horas.
 * Se nenhuma loja ou usuário publicou nada nas últimas 24h, retorna lista vazia [] (zero mocks).
 */
export const getFeedStories = createServerFn({ method: "GET" }).handler(async () => {
 const db = getServerClient();

 const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

 // Consulta apenas stories reais ativos publicados nas últimas 24 horas
 const { data: realStories, error } = await db
 .from("stories")
 .select("id, store_id, media_url, link_url, created_at, stores(id, name, settings)")
 .eq("status", "active")
 .gte("created_at", twentyFourHoursAgo)
 .order("created_at", { ascending: false })
 .limit(20);

 if (error || !realStories || realStories.length === 0) {
 return [];
 }

 return realStories.map((s: any) => {
 const store = s.stores;
 const storeLogo = store?.settings?.logoUrl || store?.settings?.avatar_url || store?.settings?.logo_url || "";
 return {
 id: `story-${s.id}`,
 type: "store" as const,
 title: store?.name || "Loja",
 image_url: s.media_url,
 avatar_url: storeLogo || null,
 link_url: s.link_url || null,
 badge: "Loja",
 created_at: s.created_at,
 };
 });
});

export interface LiveMomentDTO {
 id: string;
 creator_name: string;
 creator_avatar?: string;
 location_name: string;
 media_url: string;
 caption?: string;
 is_live: boolean;
 captured_at: string;
 is_bill_split_open: boolean;
 table_size?: number;
 participants_count: number;
}

/**
 * Retorna Momentos Ao Vivo da cidade (fotos instantâneas sem filtro com carimbo ao vivo e encontros para dividir conta)
 */
export const getLiveMoments = createServerFn({ method: "GET" }).handler(async () => {
 const db = getServerClient();

 try {
 const { data: posts, error } = await db
 .from("posts")
 .select("id, author_profile_id, location_name, media_urls, content_text, created_at, metadata, profiles(full_name, avatar_url)")
 .eq("post_type", "moment")
 .eq("status", "active")
 .order("created_at", { ascending: false })
 .limit(20);

 if (!error && posts && posts.length > 0) {
 return posts.map((p: any) => ({
 id: p.id,
 creator_name: (p.profiles as any)?.full_name || p.metadata?.author_name || "Membro da Comunidade",
 creator_avatar: (p.profiles as any)?.avatar_url || null,
 location_name: p.location_name || "Cidade",
 media_url: Array.isArray(p.media_urls) && p.media_urls[0] ? p.media_urls[0] : "",
 caption: p.content_text,
 is_live: Boolean(p.metadata?.is_live ?? true),
 captured_at: p.created_at,
 is_bill_split_open: Boolean(p.metadata?.is_bill_split_open),
 table_size: p.metadata?.table_size || 6,
 participants_count: 1,
 })) as LiveMomentDTO[];
 }
 } catch {
 // Fallback silencioso para lista vazia
 }

 return [] as LiveMomentDTO[];
});

/**
 * Publica um Momento Instantâneo / Ao Vivo da Vida Cotidiana no Mapa
 */
export const publishLiveMoment = createServerFn({ method: "POST" })
 .validator(
 z.object({
 caption: z.string().min(2, "Descreva o que você está fazendo"),
 media_url: z.string().url("Foto obrigatória para o momento ao vivo"),
 location_name: z.string().min(2, "Informe onde você está"),
 location_lat: z.number(),
 location_lng: z.number(),
 is_bill_split_open: z.boolean().default(false),
 table_size: z.number().min(2).max(20).optional(),
 vibe: z.enum(["ao_vivo", "mesa_aberta", "cafe_trabalho", "parque_esporte", "encontro_musica"]).default("ao_vivo"),
 author_name: z.string().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const db = getServerClient();
 const identity = await getCurrentIdentity();

 const authorName =
 (identity as any)?.full_name || data.author_name || "Membro da Comunidade";
 const authorId = identity.customer_id || null;

 try {
 // 1. Gravar em posts (post_type = moment)
 await db.from("posts").insert({
 author_profile_id: authorId,
 content_text: data.caption,
 media_urls: [data.media_url],
 post_type: "moment",
 location_name: data.location_name,
 location_lat: data.location_lat,
 location_lng: data.location_lng,
 metadata: {
 is_live: true,
 is_bill_split_open: data.is_bill_split_open,
 table_size: data.table_size || 6,
 vibe: data.vibe,
 author_name: authorName,
 },
 status: "active",
 });
 } catch (e: any) {
 console.warn("[moments] Erro ao persistir momento ao vivo:", e?.message || e);
 }

 return {
 status: "ok",
 message: "Seu momento ao vivo foi publicado no mapa da cidade!",
 };
 });


/**
 * Retorna amigos/membros sugeridos para seguir.
 */
export const getSuggestedFriends = createServerFn({ method: "GET" }).handler(async () => {
 const db = getServerClient();
 const { data } = await db.from("profiles").select("id, full_name, avatar_url, bio").limit(8);

 return (data || []).map((p: any) => ({
 id: p.id,
 name: p.full_name || "Membro Comunitário",
 avatar_url: p.avatar_url,
 reason: "Ativo na comunidade",
 bio: p.bio,
 }));
});

/**
 * Busca lojas para autocomplete de empresas nas experiências profissionais
 */
export const searchStoresForCompanyAutocomplete = createServerFn({ method: "GET" })
 .validator(z.object({ query: z.string().optional() }))
 .handler(async ({ data: { query } }) => {
 const db = getServerClient();
 let q = db.from("stores").select("id, name, slug, settings, city, state").limit(10);
 if (query && query.trim().length > 0) {
 q = q.ilike("name", `%${query.trim()}%`);
 }
 const { data } = await q;
 return (data || []).map((s: any) => ({
 id: s.id,
 name: s.name,
 slug: s.slug,
 logo_url: s.settings?.logoUrl || s.settings?.logo_url || null,
 city: s.city,
 state: s.state,
 }));
 });

/**
 * Atualiza os dados do currículo/perfil profissional (Padrão Corporativo Waesy) de forma atômica
 */
export const updateMemberResumeData = createServerFn({ method: "POST" })
 .validator(
 z.object({
 resumeData: z.record(z.any()),
 }),
 )
 .handler(async ({ data: { resumeData } }) => {
 const db = getServerClient();
 const { getCurrentIdentity } = await import("@/services/cart-helpers");
 const identity = await getCurrentIdentity();
 const userId = (identity as any)?.id || (identity as any)?.customer_id;
 if (!userId) throw new Error("Não autorizado. Faça login para editar seu perfil.");

 const { error } = await db
 .from("profiles")
 .update({ resume_data: resumeData, updated_at: new Date().toISOString() })
 .eq("id", userId);

 if (error) {
 console.error("[social.functions] updateMemberResumeData error:", error);
 throw new Error(error.message);
 }

 // Sincroniza avaliações de empregadores para inteligência comunitária (Avaliação Corporativa)
 if (Array.isArray(resumeData.experiences)) {
 for (const exp of resumeData.experiences) {
 if (exp.company && (exp.company_rating || exp.salary_cents || exp.exit_reason || exp.review_text)) {
 try {
 await db.from("employer_reviews").insert({
 profile_id: userId,
 company_name: exp.company,
 store_id: exp.store_id || null,
 role_title: exp.title || "Colaborador",
 salary_cents: exp.salary_cents || null,
 exit_reason: exp.exit_reason || null,
 company_rating: exp.company_rating || null,
 would_recommend: exp.would_recommend ?? true,
 review_text: exp.review_text || null,
 is_anonymous: exp.is_anonymous ?? false,
 });
 } catch {
 // fallback silencioso caso já exista
 }
 }
 }
 }

 return { status: "ok" as const };
 });

/**
 * Retorna estatísticas de inteligência de empregador da empresa (Nota média, Recomendação, Média salarial)
 */
export const getCompanyEmployerStats = createServerFn({ method: "GET" })
 .validator(z.object({ companyName: z.string().optional(), storeId: z.string().optional() }))
 .handler(async ({ data: { companyName, storeId } }) => {
 const db = getServerClient();
 let query = db.from("employer_reviews").select("company_rating, salary_cents, would_recommend, exit_reason, review_text, created_at");
 if (storeId) {
 query = query.eq("store_id", storeId);
 } else if (companyName) {
 query = query.ilike("company_name", companyName);
 } else {
 return null;
 }

 const { data: rows, error } = await query;
 if (error || !rows || rows.length === 0) return null;

 const total = rows.length;
 const ratings = rows.filter((r) => r.company_rating).map((r) => r.company_rating!);
 const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
 const recommends = rows.filter((r) => r.would_recommend === true).length;
 const recommendRate = Math.round((recommends / total) * 100);
 const salaries = rows.filter((r) => r.salary_cents && r.salary_cents > 0).map((r) => Number(r.salary_cents));
 const avgSalaryCents = salaries.length > 0 ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length) : null;

 return {
 reviewsCount: total,
 avgRating: avgRating ? Number(avgRating.toFixed(1)) : null,
 recommendRate,
 avgSalaryCents,
 recentReviews: rows.filter((r) => r.review_text).slice(0, 5),
 };
 });

/**
 * Retorna o perfil público 360° de um membro com suas publicações, classificados, eventos, lojas e métricas sociais.
 * Suporta busca por UUID ou por @username / username.
 */
export const getPublicMemberProfile = createServerFn({ method: "GET" })
 .validator(z.object({ profileId: z.string().min(1) }))
 .handler(async ({ data: { profileId } }) => {
 const db = getServerClient();
 const { getCurrentIdentity } = await import("@/services/cart-helpers");

 let currentUserId: string | null = null;
 try {
 const identity = await getCurrentIdentity();
 currentUserId = (identity as any)?.id || (identity as any)?.customer_id || null;
 } catch {
 // visitante anônimo
 }

 // 1. Resolver o perfil do membro por UUID ou Username (@username / encoded / fallback)
 let decodedId = profileId;
 try {
 decodedId = decodeURIComponent(profileId);
 } catch {}
 decodedId = decodedId.replace(/^%40/i, "").replace(/^@/, "").trim().toLowerCase();

 const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decodedId);
 let rawProfile: any = null;

 try {
 const query = db
 .from("profiles")
 .select(
 "id, full_name, username, avatar_url, cover_url, bio, occupation, city, state, phone, instagram, website, role, is_verified, profile_type, badges, resume_data, biolinks, featured_banner_url, featured_banner_link, created_at",
 );

 if (isUuid) {
 const res = await query.eq("id", decodedId).maybeSingle();
 rawProfile = res.data;
 } else {
 // Busca 1: por username exato ou sem case
 const resByUsername = await query.ilike("username", decodedId).maybeSingle();
 rawProfile = resByUsername.data;

 // Busca 1.1: por histórico de handles antigos (redirecionamento inteligente)
 if (!rawProfile) {
 const { data: historyMatch } = await db
 .from("handle_history")
 .select("profile_id")
 .ilike("old_handle", decodedId)
 .order("created_at", { ascending: false })
 .limit(1)
 .maybeSingle();

 if (historyMatch?.profile_id) {
 const resFromHistory = await db
 .from("profiles")
 .select(
 "id, full_name, username, avatar_url, cover_url, bio, occupation, city, state, phone, instagram, website, role, is_verified, profile_type, badges, resume_data, biolinks, featured_banner_url, featured_banner_link, created_at",
 )
 .eq("id", historyMatch.profile_id)
 .maybeSingle();
 rawProfile = resFromHistory.data;
 }
 }

 // Busca 2: por full_name aproximado
 if (!rawProfile) {
 const resByName = await db
 .from("profiles")
 .select(
 "id, full_name, username, avatar_url, cover_url, bio, occupation, city, state, phone, instagram, website, role, is_verified, profile_type, badges, resume_data, biolinks, featured_banner_url, featured_banner_link, created_at",
 )
 .ilike("full_name", `%${decodedId}%`)
 .limit(1)
 .maybeSingle();
 rawProfile = resByName.data;
 }

 // Busca 2.5: por handle de Criador / Marca em creator_profiles
 if (!rawProfile) {
 const { data: creatorMatch } = await db
 .from("creator_profiles")
 .select("*")
 .ilike("handle", decodedId)
 .maybeSingle();

 if (creatorMatch?.user_id) {
 const resFromCreatorUser = await db
 .from("profiles")
 .select("id, city, state, role, created_at")
 .eq("id", creatorMatch.user_id)
 .maybeSingle();

 rawProfile = {
 id: creatorMatch.user_id,
 full_name: creatorMatch.name || "Criador Waesy",
 username: creatorMatch.handle,
 avatar_url: creatorMatch.avatar_url || null, // NEVER fall back to personal civil face photo!
 cover_url: creatorMatch.cover_url || null,   // NEVER fall back to personal civil cover!
 bio: creatorMatch.bio || "",
 occupation: creatorMatch.niche || "Criador de Conteúdo", // NEVER personal civil job title!
 city: creatorMatch.city || resFromCreatorUser?.data?.city || "São Miguel do Oeste",
 state: creatorMatch.state || resFromCreatorUser?.data?.state || "SC",
 phone: null,
 instagram: creatorMatch.social_links?.instagram || null,
 website: creatorMatch.social_links?.website || null,
 role: "creator",
 is_verified: creatorMatch.is_official_ambassador ?? false,
 profile_type: "creator",
 badges: creatorMatch.is_official_ambassador ? [creatorMatch.ambassador_badge_label || "Embaixador Oficial"] : [],
 resume_data: null, // Zero civil resume leak!
 biolinks: [],      // Zero civil biolink leak!
 featured_banner_url: creatorMatch.banner_url || null,
 featured_banner_link: creatorMatch.banner_link || null,
 created_at: creatorMatch.created_at || new Date().toISOString(),
 _isCreatorTarget: true,
 _creatorMatch: creatorMatch,
 };
 }
 }

 // Busca 3: se ainda não encontrou e usuário está autenticado
 if (!rawProfile && currentUserId) {
 const resCurrent = await db
 .from("profiles")
 .select(
 "id, full_name, username, avatar_url, cover_url, bio, occupation, city, state, phone, instagram, website, role, is_verified, profile_type, badges, resume_data, biolinks, featured_banner_url, featured_banner_link, created_at",
 )
 .eq("id", currentUserId)
 .maybeSingle();
 rawProfile = resCurrent.data;
 }
 }
 } catch (err) {
 console.error("[social.functions] Erro ao buscar perfil:", err);
 // Retorna null amigável em vez de quebrar
 rawProfile = null;
 }

 if (!rawProfile) {
 return {
 profile: null,
 isOwner: false,
 posts: [],
 classifieds: [],
 events: [],
 stores: [],
 stats: {
 postsCount: 0,
 classifiedsCount: 0,
 eventsCount: 0,
 followersCount: 0,
 followingCount: 0,
 totalLikes: 0,
 },
 isFollowing: false,
 };
 }

 const targetUserId = rawProfile.id;

 // 2. Buscar dados filhos usando targetUserId legítimo
 const fetchMemberPosts = async () => {
 try {
 return await db
 .from("posts")
 .select(
 `id, content_text, media_urls, layout_style, post_type, location_name, reference_type, reference_id, created_at`,
 )
 .eq("author_profile_id", targetUserId)
 .eq("status", "active")
 .order("created_at", { ascending: false })
 .limit(30);
 } catch {
 return { data: [] };
 }
 };

 const fetchMemberClassifieds = async () => {
 try {
 return await db
 .from("classifieds")
 .select(
 "id, title, content, price_cents, images, category, condition, location_name, created_at",
 )
 .eq("author_profile_id", targetUserId)
 .eq("status", "active")
 .order("created_at", { ascending: false })
 .limit(20);
 } catch {
 return { data: [] };
 }
 };

 const fetchMemberEvents = async () => {
 try {
 return await db
 .from("events")
 .select(
 "id, title, description, cover_image, event_date, location_name, is_free, price_cents, status, created_at",
 )
 .or(`author_profile_id.eq.${targetUserId},created_by.eq.${targetUserId}`)
 .order("event_date", { ascending: false })
 .limit(15);
 } catch {
 return { data: [] };
 }
 };

 const fetchFollowersCount = async () => {
 try {
 return await db
 .from("user_followers")
 .select("follower_user_id", { count: "exact", head: true })
 .eq("following_user_id", targetUserId);
 } catch {
 return { count: 0 };
 }
 };

 const fetchFollowingCount = async () => {
 try {
 return await db
 .from("user_followers")
 .select("following_user_id", { count: "exact", head: true })
 .eq("follower_user_id", targetUserId);
 } catch {
 return { count: 0 };
 }
 };

 const fetchIsFollowing = async () => {
 if (!currentUserId) return { data: null };
 try {
 return await db
 .from("user_followers")
 .select("following_user_id")
 .eq("following_user_id", targetUserId)
 .eq("follower_user_id", currentUserId)
 .maybeSingle();
 } catch {
 return { data: null };
 }
 };

 const [postsRes, classifiedsRes, eventsRes, followersCountRes, followingCountRes, isFollowingRes] =
 await Promise.all([
 fetchMemberPosts(),
 fetchMemberClassifieds(),
 fetchMemberEvents(),
 fetchFollowersCount(),
 fetchFollowingCount(),
 fetchIsFollowing(),
 ]);

 // Buscar lojas associadas ao perfil via workspace_members (tabela canônica)
 let memberStores: any[] = [];
 try {
 const { data: wsMemRows } = await db
 .from("workspace_members")
 .select("store_id")
 .eq("profile_id", targetUserId)
 .limit(15);

 const storeIds = Array.from(
 new Set((wsMemRows || []).map((m: any) => m.store_id)),
 ).filter(Boolean);

 if (storeIds.length > 0) {
 const { data: storesData } = await db
 .from("stores")
 .select("id, name, slug, description, city, state, settings")
 .in("id", storeIds);

 memberStores = (storesData || []).map((st: any) => {
 const settings = (st.settings as Record<string, any>) || {};
 return {
 id: st.id,
 name: st.name,
 slug: st.slug,
 description: st.description || "",
 city: st.city,
 state: st.state,
 logo_url: settings.logoUrl || settings.logo_url || null,
 };
 });
 }
 } catch (storeErr) {
 console.warn("[social.functions] Erro ao buscar lojas do membro:", storeErr);
 memberStores = [];
 }

 const isOwner = !!(currentUserId && currentUserId === targetUserId);

 const profileData = {
 id: targetUserId,
 full_name: rawProfile?.full_name || null,
 username: rawProfile?.username || null,
 avatar_url: rawProfile?.avatar_url || null,
 cover_url: rawProfile?.cover_url || null,
 bio: rawProfile?.bio || null,
 occupation: rawProfile?.occupation || null,
 city: rawProfile?.city || null,
 state: rawProfile?.state || null,
 phone: rawProfile?.phone || null,
 instagram: rawProfile?.instagram || null,
 website: rawProfile?.website || null,
 role: rawProfile?.role || "customer",
 is_verified: rawProfile?.is_verified ?? false,
 profile_type: rawProfile?.profile_type || "personal",
 badges: rawProfile?.badges || [],
 biolinks: (rawProfile?.biolinks as any) || [],
 resume_data: (rawProfile?.resume_data as any) || null,
 featured_banner_url: rawProfile?.featured_banner_url || null,
 featured_banner_link: rawProfile?.featured_banner_link || null,
 created_at: rawProfile?.created_at || new Date().toISOString(),
 };

 const postIds = (postsRes.data || []).map((p: any) => p.id);
 let realTotalLikes = 0;
 if (postIds.length > 0) {
 try {
 const { count } = await db
 .from("post_likes")
 .select("post_id", { count: "exact", head: true })
 .in("post_id", postIds);
 realTotalLikes = count || 0;
 } catch {
 realTotalLikes = 0;
 }
 }

 // 3. Buscar Dados de Criador / Marca & Vitrine se aplicável
 let creatorProfile: any = rawProfile?._creatorMatch || null;
 if (!creatorProfile) {
 try {
 const { data: cp } = await db
 .from("creator_profiles")
 .select("*")
 .eq("user_id", targetUserId)
 .maybeSingle();
 creatorProfile = cp || null;
 } catch {
 creatorProfile = null;
 }
 }

 let partnerStores: any[] = [];
 let pinnedProducts: any[] = [];
 let creatorEvents: any[] = [];

 if (creatorProfile) {
 // 3.1 Lojas parceiras vinculadas na vitrine
 const storeIds = Array.isArray(creatorProfile.partner_store_ids) ? creatorProfile.partner_store_ids : [];
 if (storeIds.length > 0) {
 try {
 const { data: stores } = await db
 .from("stores")
            .select("id, name, slug, logo_url, city, state, settings")
 .in("id", storeIds)
            .eq("is_active", true);

 partnerStores = (stores || []).map((s: any) => ({
 id: s.id,
 name: s.name,
 slug: s.slug,
 logoUrl: s.logo_url || null,
            bannerUrl: s.settings?.bannerUrl || s.settings?.banner_url || null,
 city: s.city || "Chapecó",
 state: s.state || "SC",
            segment: s.settings?.segment || s.settings?.niche || "Varejo",
 couponCode: `${(creatorProfile.handle || "WAESY").toUpperCase().slice(0, 6)}10`,
 discountPercent: 10,
 }));
 } catch (err) {
 console.warn("[social.functions] Erro ao buscar lojas da vitrine do criador:", err);
 }
 }

 // 3.2 Produtos da Vitrine
 try {
 const { data: pinned } = await db
 .from("creator_showcase_products")
 .select(`
 id,
 custom_title,
 custom_description,
 sort_order,
 is_pinned,
 product:products (
 id,
 name,
 slug,
 description,
 price_cents,
 images,
 store:stores (
 id,
 name,
 slug,
 logo_url
 )
 )
 `)
 .eq("creator_profile_id", creatorProfile.id)
 .order("is_pinned", { ascending: false })
 .order("sort_order", { ascending: true });
 pinnedProducts = pinned || [];
 } catch (err) {
 console.warn("[social.functions] Erro ao buscar produtos da vitrine do criador:", err);
 }

 // 3.3 Eventos da Marca / Artista
 try {
 const cleanHandle = (creatorProfile.handle || "").toLowerCase().trim();
 const stageName = creatorProfile.name || creatorProfile.stage_name || cleanHandle;
 const { data: evts } = await db
 .from("events")
 .select("id, title, description, event_date, end_date, location, city, state, cover_image, price_cents, is_free, is_external_ticket, external_ticket_url, category")
 .eq("status", "published")
 .gte("event_date", new Date().toISOString())
 .or(`creator_handle.ilike.%${cleanHandle}%,organizer_name.ilike.%${stageName}%,created_by.eq.${targetUserId}`)
 .order("event_date", { ascending: true })
 .limit(10);
 creatorEvents = evts || [];
 } catch (err) {
 console.warn("[social.functions] Erro ao buscar eventos do criador:", err);
 }
 }

 const isCreatorTarget = Boolean(rawProfile?._isCreatorTarget);

 return {
 profile: profileData,
 creatorProfile: isCreatorTarget && creatorProfile ? {
 ...creatorProfile,
 stage_name: creatorProfile.name || creatorProfile.stage_name,
 category: creatorProfile.niche || creatorProfile.category || "Geral",
 showcase_order: creatorProfile.showcase_order || ["banner", "stores", "products", "events"],
 partner_store_ids: creatorProfile.partner_store_ids || [],
 } : null,
 isCreator: isCreatorTarget,
 partnerStores: isCreatorTarget ? partnerStores : [],
 pinnedProducts: isCreatorTarget ? pinnedProducts : [],
 creatorEvents: isCreatorTarget ? creatorEvents : [],
 posts: (postsRes.data || []).map((p: any) => ({
 id: p.id,
 content_text: p.content_text,
 media_urls: p.media_urls || [],
 post_type: p.post_type || "text",
 location_name: p.location_name,
 created_at: p.created_at,
 })),
 classifieds: (classifiedsRes.data || []).map((c: any) => ({
 id: c.id,
 title: c.title,
 content: c.content,
 price_cents: c.price_cents,
 images: c.images || [],
 category: c.category,
 condition: c.condition,
 location_name: c.location_name,
 created_at: c.created_at,
 })),
 events: (eventsRes.data || []).map((e: any) => ({
 id: e.id,
 title: e.title,
 description: e.description,
 cover_image: e.cover_image,
 event_date: e.event_date,
 location_name: e.location_name,
 is_free: e.is_free,
 price_cents: e.price_cents,
 status: e.status,
 created_at: e.created_at,
 })),
 stores: memberStores,
 stats: {
 postsCount: (postsRes.data || []).length,
 classifiedsCount: (classifiedsRes.data || []).length,
 eventsCount: (eventsRes.data || []).length,
 followersCount: followersCountRes.count || 0,
 followingCount: followingCountRes.count || 0,
 totalLikes: realTotalLikes,
 },
 isFollowing: !!isFollowingRes.data,
 isOwner,
 };
 });

/**
 * Seguir ou deixar de seguir um membro real da comunidade com persistência no Supabase.
 */
export const toggleUserFollow = createServerFn({ method: "POST" })
 .validator(z.object({ targetUserId: z.string().uuid() }))
 .handler(async ({ data: { targetUserId } }) => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity();

 if (!identity.customer_id) {
 throw new Error("Você precisa estar logado para seguir um membro.");
 }

 const limit = checkRateLimit(identity.customer_id, "follow");
 if (!limit.allowed) {
 throw new Error(`Limite de ações atingido. Aguarde ${limit.retryAfterSec}s para tentar novamente.`);
 }

 if (identity.customer_id === targetUserId) {
 throw new Error("Você não pode seguir seu próprio perfil.");
 }

 const { data: existing } = await supabase
 .from("user_followers")
 .select("following_user_id")
 .eq("following_user_id", targetUserId)
 .eq("follower_user_id", identity.customer_id)
 .limit(1)
 .maybeSingle();

 if (existing) {
 await supabase
 .from("user_followers")
 .delete()
 .eq("following_user_id", targetUserId)
 .eq("follower_user_id", identity.customer_id);
 return { following: false };
 } else {
 await supabase
 .from("user_followers")
 .insert({
 following_user_id: targetUserId,
 follower_user_id: identity.customer_id,
 });
 return { following: true };
 }
 });

/**
 * Consulta status de seguimento de um membro da comunidade.
 */
export const getUserFollowStatus = createServerFn({ method: "GET" })
 .validator(z.object({ targetUserId: z.string().uuid() }))
 .handler(async ({ data: { targetUserId } }) => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity();

 if (!identity.customer_id) return { following: false };

 const { data: existing } = await supabase
 .from("user_followers")
 .select("following_user_id")
 .eq("following_user_id", targetUserId)
 .eq("follower_user_id", identity.customer_id)
 .limit(1)
 .maybeSingle();

 return { following: !!existing };
 });

// ---------------------------------------------------------------------------
// POST COMMENTS & INDIVIDUAL MEDIA INTERACTIONS (INSTAGRAM-LIKE)
// ---------------------------------------------------------------------------

export interface PostCommentDTO {
 id: string;
 post_id: string;
 profile_id: string;
 media_url?: string | null;
 parent_id?: string | null;
 content: string;
 status: "active" | "hidden" | "deleted";
 likes_count: number;
 user_liked?: boolean;
 created_at: string;
 author: {
 id: string;
 name: string;
 username?: string | null;
 avatar_url?: string | null;
 };
}

export const listPostComments = createServerFn({ method: "GET" })
 .validator(
 z.object({
 postId: z.string().uuid(),
 mediaUrl: z.string().optional().nullable(),
 limit: z.number().int().default(50),
 }),
 )
 .handler(async ({ data: { postId, mediaUrl, limit } }): Promise<PostCommentDTO[]> => {
 const db = getServerClient();
 let currentProfileId: string | null = null;
 try {
 const identity = await getCurrentIdentity();
 currentProfileId = identity.customer_id || null;
 } catch {}

 let query = db
 .from("post_comments")
 .select(`
 id, post_id, profile_id, media_url, parent_id, content, status, likes_count, created_at,
 profiles(id, full_name, username, avatar_url)
 `)
 .eq("post_id", postId)
 .eq("status", "active")
 .order("created_at", { ascending: true })
 .limit(limit);

 if (mediaUrl) {
 query = query.eq("media_url", mediaUrl);
 }

 const { data: rows, error } = await query;
 if (error || !rows) {
 return [];
 }

 const commentIds = rows.map((r: any) => r.id);
 let likedCommentIds = new Set<string>();
 if (currentProfileId && commentIds.length > 0) {
 try {
 const { data: userLikes } = await db
 .from("post_comment_likes")
 .select("comment_id")
 .in("comment_id", commentIds)
 .eq("profile_id", currentProfileId);
 (userLikes || []).forEach((l: any) => likedCommentIds.add(l.comment_id));
 } catch {}
 }

 const formatted: PostCommentDTO[] = rows.map((r: any) => {
 const prof = r.profiles || {};
 return {
 id: r.id,
 post_id: r.post_id,
 profile_id: r.profile_id,
 media_url: r.media_url,
 parent_id: r.parent_id,
 content: r.content,
 status: r.status,
 likes_count: r.likes_count || 0,
 user_liked: likedCommentIds.has(r.id),
 created_at: r.created_at,
 author: {
 id: prof.id || r.profile_id,
 name: prof.full_name || "Membro Waesy",
 username: prof.username || null,
 avatar_url: prof.avatar_url || null,
 },
 };
 });

 return formatted;
 });

export const createPostComment = createServerFn({ method: "POST" })
 .validator(
 z.object({
 postId: z.string().uuid(),
 mediaUrl: z.string().optional().nullable(),
 parentId: z.string().uuid().optional().nullable(),
 content: z.string().min(1, "O comentário não pode ser vazio").max(1000),
 }),
 )
 .handler(async ({ data: { postId, mediaUrl, parentId, content } }): Promise<PostCommentDTO> => {
 const db = getServerClient();
 const identity = await getCurrentIdentity();
 if (!identity.customer_id) {
 throw new Error("Faça login na sua conta para comentar.");
 }

 const limit = checkRateLimit(identity.customer_id, "comment");
 if (!limit.allowed) {
 throw new Error(`Muitos comentários em pouco tempo. Aguarde ${limit.retryAfterSec}s.`);
 }

 const { data: created, error } = await db
 .from("post_comments")
 .insert({
 post_id: postId,
 profile_id: identity.customer_id,
 media_url: mediaUrl || null,
 parent_id: parentId || null,
 content: content.trim(),
 status: "active",
 })
 .select(`
 id, post_id, profile_id, media_url, parent_id, content, status, likes_count, created_at,
 profiles(id, full_name, username, avatar_url)
 `)
 .single();

 if (error || !created) {
 // Auto-fallback resiliente
 return {
 id: "cmt-" + Date.now(),
 post_id: postId,
 profile_id: identity.customer_id,
 media_url: mediaUrl || null,
 parent_id: parentId || null,
 content: content.trim(),
 status: "active",
 likes_count: 0,
 user_liked: false,
 created_at: new Date().toISOString(),
 author: {
 id: identity.customer_id,
 name: "Você",
 username: "voce",
 avatar_url: null,
 },
 };
 }

 const prof = (created as any).profiles || {};
 return {
 id: created.id,
 post_id: created.post_id,
 profile_id: created.profile_id,
 media_url: created.media_url,
 parent_id: created.parent_id,
 content: created.content,
 status: created.status,
 likes_count: created.likes_count || 0,
 user_liked: false,
 created_at: created.created_at,
 author: {
 id: prof.id || created.profile_id,
 name: prof.full_name || "Você",
 username: prof.username || null,
 avatar_url: prof.avatar_url || null,
 },
 };
 });

export const toggleMediaLike = createServerFn({ method: "POST" })
 .validator(
 z.object({
 postId: z.string().uuid(),
 mediaUrl: z.string().min(1),
 }),
 )
 .handler(async ({ data: { postId, mediaUrl } }): Promise<{ liked: boolean; likes_count: number }> => {
 const db = getServerClient();
 const identity = await getCurrentIdentity();
 if (!identity.customer_id) {
 throw new Error("Faça login para curtir esta foto.");
 }

 const { data: existing } = await db
 .from("post_media_likes")
 .select("profile_id")
 .eq("post_id", postId)
 .eq("media_url", mediaUrl)
 .eq("profile_id", identity.customer_id)
 .maybeSingle();

 if (existing) {
 await db
 .from("post_media_likes")
 .delete()
 .eq("post_id", postId)
 .eq("media_url", mediaUrl)
 .eq("profile_id", identity.customer_id);
 } else {
 await db
 .from("post_media_likes")
 .insert({
 post_id: postId,
 media_url: mediaUrl,
 profile_id: identity.customer_id,
 });
 }

 const { count } = await db
 .from("post_media_likes")
 .select("profile_id", { count: "exact", head: true })
 .eq("post_id", postId)
 .eq("media_url", mediaUrl);

 return {
 liked: !existing,
 likes_count: count ?? (!existing ? 1 : 0),
 };
 });

export const getPostMediaStats = createServerFn({ method: "GET" })
 .validator(
 z.object({
 postId: z.string().uuid(),
 }),
 )
 .handler(async ({ data: { postId } }): Promise<Record<string, { likes_count: number; comments_count: number; user_liked: boolean }>> => {
 const db = getServerClient();
 let currentProfileId: string | null = null;
 try {
 const identity = await getCurrentIdentity();
 currentProfileId = identity.customer_id || null;
 } catch {}

 const [likesRes, commentsRes] = await Promise.all([
 db.from("post_media_likes").select("media_url, profile_id").eq("post_id", postId),
 db.from("post_comments").select("media_url").eq("post_id", postId).eq("status", "active"),
 ]);

 const stats: Record<string, { likes_count: number; comments_count: number; user_liked: boolean }> = {};

 (likesRes.data || []).forEach((row: any) => {
 if (!stats[row.media_url]) {
 stats[row.media_url] = { likes_count: 0, comments_count: 0, user_liked: false };
 }
 stats[row.media_url].likes_count += 1;
 if (currentProfileId && row.profile_id === currentProfileId) {
 stats[row.media_url].user_liked = true;
 }
 });

 (commentsRes.data || []).forEach((row: any) => {
 if (row.media_url) {
 if (!stats[row.media_url]) {
 stats[row.media_url] = { likes_count: 0, comments_count: 0, user_liked: false };
 }
 stats[row.media_url].comments_count += 1;
 }
 });

 return stats;
 });

export interface MemberAnalyticsDTO {
 profile: {
 id: string;
 full_name: string;
 username: string | null;
 avatar_url: string | null;
 };
 overview: {
 followersCount: number;
 followersGained7d: number;
 followersGained30d: number;
 followingCount: number;
 postsCount: number;
 totalLikes: number;
 totalComments: number;
 totalClassifieds: number;
 totalEvents: number;
 engagementRate: number;
 estimatedReach: number;
 };
 formatDistribution: {
 text: number;
 photo: number;
 video: number;
 gallery: number;
 zine: number;
 };
 topPosts: Array<{
 id: string;
 content_text: string;
 media_url?: string | null;
 created_at: string;
 post_type: string;
 likes_count: number;
 comments_count: number;
 engagement_score: number;
 }>;
 recentFollowers: Array<{
 id: string;
 full_name: string;
 username: string | null;
 avatar_url: string | null;
 created_at: string;
 }>;
}

export const getMemberAnalyticsInsights = createServerFn({ method: "GET" })
 .validator(z.object({ profileId: z.string().optional() }).optional())
 .handler(async ({ data }): Promise<MemberAnalyticsDTO> => {
 const db = getServerClient();
 const { getCurrentIdentity } = await import("@/services/cart-helpers");
 const identity = await getCurrentIdentity();

 let targetUserId = data?.profileId;
 if (!targetUserId) {
 targetUserId = (identity as any).id || identity.customer_id;
 }
 if (!targetUserId) {
 throw new Error("Faça login para visualizar seus insights e métricas.");
 }

 if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(targetUserId)) {
 const cleanUsername = targetUserId.replace(/^@/, "").trim().toLowerCase();
 const { data: p } = await db.from("profiles").select("id").ilike("username", cleanUsername).maybeSingle();
 if (p) targetUserId = p.id;
 }

 const { data: profile } = await db
 .from("profiles")
 .select("id, full_name, username, avatar_url")
 .eq("id", targetUserId)
 .maybeSingle();

 if (!profile) throw new Error("Perfil não encontrado.");

 const now = new Date();
 const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
 const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

 // 1. Posts do autor
 const { data: posts } = await db
 .from("posts")
 .select("id, content_text, media_urls, post_type, layout_style, created_at")
 .eq("author_profile_id", targetUserId)
 .eq("status", "active")
 .order("created_at", { ascending: false });

 const userPosts = posts || [];
 const postIds = userPosts.map((p) => p.id);

 // 2. Curtidas e comentários reais
 const postLikesMap: Record<string, number> = {};
 const postCommentsMap: Record<string, number> = {};
 let totalLikes = 0;
 let totalComments = 0;

 if (postIds.length > 0) {
 const [likesRes, commentsRes] = await Promise.all([
 db.from("post_likes").select("post_id").in("post_id", postIds),
 db.from("post_comments").select("post_id").in("post_id", postIds).eq("status", "active"),
 ]);

 (likesRes.data || []).forEach((row: any) => {
 postLikesMap[row.post_id] = (postLikesMap[row.post_id] || 0) + 1;
 totalLikes += 1;
 });

 (commentsRes.data || []).forEach((row: any) => {
 postCommentsMap[row.post_id] = (postCommentsMap[row.post_id] || 0) + 1;
 totalComments += 1;
 });
 }

 // 3. Seguidores & Crescimento Real
 const [followersTotalRes, followers7dRes, followers30dRes, followingTotalRes, recentFollowersRes] =
 await Promise.all([
 db.from("user_followers").select("follower_user_id", { count: "exact", head: true }).eq("following_user_id", targetUserId),
 db.from("user_followers").select("follower_user_id", { count: "exact", head: true }).eq("following_user_id", targetUserId).gte("created_at", sevenDaysAgo),
 db.from("user_followers").select("follower_user_id", { count: "exact", head: true }).eq("following_user_id", targetUserId).gte("created_at", thirtyDaysAgo),
 db.from("user_followers").select("following_user_id", { count: "exact", head: true }).eq("follower_user_id", targetUserId),
 db.from("user_followers").select("follower_user_id, created_at").eq("following_user_id", targetUserId).order("created_at", { ascending: false }).limit(6),
 ]);

 const followersCount = followersTotalRes.count || 0;
 const followingCount = followingTotalRes.count || 0;
 const followersGained7d = followers7dRes.count || 0;
 const followersGained30d = followers30dRes.count || 0;

 // Buscar perfis dos seguidores recentes
 let recentFollowers: any[] = [];
 const followerIds = (recentFollowersRes.data || []).map((f: any) => f.follower_user_id);
 if (followerIds.length > 0) {
 const { data: followerProfiles } = await db
 .from("profiles")
 .select("id, full_name, username, avatar_url")
 .in("id", followerIds);

 const profileMap = new Map((followerProfiles || []).map((p) => [p.id, p]));
 recentFollowers = (recentFollowersRes.data || []).map((f: any) => {
 const p = profileMap.get(f.follower_user_id);
 return {
 id: f.follower_user_id,
 full_name: p?.full_name || "Membro da Comunidade",
 username: p?.username || null,
 avatar_url: p?.avatar_url || null,
 created_at: f.created_at,
 };
 });
 }

 // 4. Classificados e Eventos
 const [classRes, eventsRes] = await Promise.all([
 db.from("classifieds").select("id", { count: "exact", head: true }).eq("author_profile_id", targetUserId).eq("status", "active"),
 db.from("events").select("id", { count: "exact", head: true }).eq("author_profile_id", targetUserId),
 ]);

 // 5. Distribuição de formatos
 const formatDistribution = {
 text: userPosts.filter((p) => p.post_type === "text" || (!p.media_urls || p.media_urls.length === 0)).length,
 photo: userPosts.filter((p) => p.post_type === "image" || (p.media_urls && p.media_urls.length === 1)).length,
 video: userPosts.filter((p) => p.post_type === "video").length,
 gallery: userPosts.filter((p) => p.media_urls && p.media_urls.length > 1).length,
 zine: userPosts.filter((p) => p.layout_style === "editorial" || p.layout_style === "zine").length,
 };

 // 6. Top Posts Ranqueados por Engajamento Real
 const topPosts = userPosts
 .map((p) => {
 const likes = postLikesMap[p.id] || 0;
 const comments = postCommentsMap[p.id] || 0;
 const score = likes * 2 + comments * 5;
 return {
 id: p.id,
 content_text: p.content_text || "Sem legenda",
 media_url: p.media_urls?.[0] || null,
 created_at: p.created_at,
 post_type: p.post_type || "text",
 likes_count: likes,
 comments_count: comments,
 engagement_score: score,
 };
 })
 .sort((a, b) => b.engagement_score - a.engagement_score)
 .slice(0, 6);

 const totalPostsCount = userPosts.length;
 const estimatedReach = Math.max(followersCount * 12 + totalPostsCount * 25 + totalLikes * 4 + totalComments * 8, totalLikes + totalComments);
 const engagementRate = totalPostsCount > 0
 ? Number((((totalLikes + totalComments) / Math.max(1, totalPostsCount * Math.max(1, followersCount))) * 100).toFixed(1))
 : 0;

 return {
 profile: {
 id: profile.id,
 full_name: profile.full_name,
 username: profile.username,
 avatar_url: profile.avatar_url,
 },
 overview: {
 followersCount,
 followersGained7d,
 followersGained30d,
 followingCount,
 postsCount: totalPostsCount,
 totalLikes,
 totalComments,
 totalClassifieds: classRes.count || 0,
 totalEvents: eventsRes.count || 0,
 engagementRate,
 estimatedReach,
 },
 formatDistribution,
 topPosts,
 recentFollowers,
 };
 });

/**
 * Busca uma publicação específica por ID para visualização canônica de permalink / thread.
 */
export const getPostById = createServerFn({ method: "GET" })
  .validator(z.object({ postId: z.string().uuid("ID de post inválido") }))
  .handler(async ({ data: { postId } }) => {
    const db = getServerClient();
    const sessionUser = await getUserSession().catch(() => null);
    const currentUserId = (sessionUser as any)?.user?.id || (sessionUser as any)?.id || null;

    // 1. Busca post e autor
    const { data: post, error } = await db
      .from("posts")
      .select(`
        id,
        content,
        created_at,
        reference_type,
        reference_id,
        post_type,
        scope,
        metadata,
        profile:profiles(
          id,
          full_name,
          username,
          avatar_url
        )
      `)
      .eq("id", postId)
      .single();

    if (error || !post) {
      return null;
    }

    // 2. Mídias
    let mediaUrls: string[] = [];
    try {
      const { data: mediaRows } = await db
        .from("post_media")
        .select("media_url, sort_order")
        .eq("post_id", postId)
        .order("sort_order", { ascending: true });

      if (mediaRows && mediaRows.length > 0) {
        mediaUrls = mediaRows.map((m: any) => m.media_url);
      }
    } catch {
      // fallback
    }

    // 3. Contagem de curtidas
    let likesCount = 0;
    try {
      const { count } = await db
        .from("post_likes")
        .select("id", { count: "exact", head: true })
        .eq("post_id", postId);
      likesCount = count || 0;
    } catch {
      likesCount = 0;
    }

    // 4. Contagem de comentários
    let commentsCount = 0;
    try {
      const { count } = await db
        .from("post_comments")
        .select("id", { count: "exact", head: true })
        .eq("post_id", postId)
        .eq("status", "active");
      commentsCount = count || 0;
    } catch {
      commentsCount = 0;
    }

    // 5. Se o usuário atual curtiu
    let userLiked = false;
    if (currentUserId) {
      try {
        const { data: likeRecord } = await db
          .from("post_likes")
          .select("id")
          .eq("post_id", postId)
          .eq("profile_id", currentUserId)
          .maybeSingle();
        userLiked = !!likeRecord;
      } catch {
        userLiked = false;
      }
    }

    // 6. Dados da referência (produto, evento, etc.)
    let referenceData: any = null;
    if (post.reference_type === "product" && post.reference_id) {
      const { data: prod } = await db
        .from("products")
        .select("id, title, price_cents, images, store:stores(id, name, slug)")
        .eq("id", post.reference_id)
        .maybeSingle();
      if (prod) {
        referenceData = {
          title: prod.title,
          price_cents: prod.price_cents,
          image_url: prod.images?.[0] || null,
          store_name: (prod.store as any)?.name || null,
          store_slug: (prod.store as any)?.slug || null,
        };
      }
    } else if (post.reference_type === "event" && post.reference_id) {
      const { data: evt } = await db
        .from("events")
        .select("id, title, event_date, location, cover_image, price_cents, is_free")
        .eq("id", post.reference_id)
        .maybeSingle();
      if (evt) {
        referenceData = {
          title: evt.title,
          date: evt.event_date,
          location: evt.location,
          cover_image: evt.cover_image,
          price_cents: evt.price_cents,
          is_free: evt.is_free,
        };
      }
    }

    const item: MuralFeedItem = {
      type: "post",
      id: post.id,
      content: post.content,
      content_text: post.content,
      created_at: post.created_at,
      reference_type: post.reference_type,
      reference_id: post.reference_id,
      post_type: post.post_type,
      scope: post.scope,
      metadata: post.metadata,
      media_urls: mediaUrls,
      likes_count: likesCount,
      comments_count: commentsCount,
      user_liked: userLiked,
      author: {
        id: (post.profile as any)?.id || (Array.isArray(post.profile) ? (post.profile as any[])[0]?.id : null) || "unknown",
        name: (post.profile as any)?.full_name || (Array.isArray(post.profile) ? (post.profile as any[])[0]?.full_name : null) || "Membro da Comunidade",
        is_store: false,
        avatar_url: (post.profile as any)?.avatar_url || (Array.isArray(post.profile) ? (post.profile as any[])[0]?.avatar_url : null) || null,
      } as any,
      reference_data: referenceData,
    };

    return item;
  });
