/**
 * stories.functions.ts — BFF Master para o Ecossistema de Stories, Ads Intercalados e Collabs
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getCurrentIdentity } from "@/services/cart-helpers";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

export interface StoryMediaItemDTO {
 id: string;
 store_id?: string | null;
 author_profile_id?: string | null;
 creator_id?: string | null;
 media_url: string;
 link_url?: string | null;
 link_cta?: string | null;
 duration_seconds: number;
 is_long_format: boolean;
 niche: string;
 hashtags: string[];
 seo_keywords?: string | null;
 product_id?: string | null;
 product_info?: {
 id: string;
 title: string;
 price_cents: number;
 image_url?: string | null;
 } | null;
 is_sponsored: boolean;
 campaign_id?: string | null;
 created_at: string;
 expires_at?: string | null;
 collab_info?: {
 creator_name: string;
 creator_handle: string;
 is_official_ambassador: boolean;
 } | null;
}

export interface StoryGroupDTO {
 groupId: string;
 entityType: "store" | "creator" | "sponsor";
 entityId: string;
 entityName: string;
 entityHandle?: string | null;
 entityAvatarUrl?: string | null;
 isFollowing: boolean;
 isOfficialAmbassador: boolean;
 ambassadorBadgeLabel?: string | null;
 isSponsored: boolean;
 niche: string;
 isOutOfDeliveryRadius?: boolean;
 stories: StoryMediaItemDTO[];
 hasUnseenStories: boolean;
}

// ─── 1. FEED DE STORIES RANQUEADOS (ALGORITMO MULTI-CAMADA) ───────────────────
export const getRankedStoriesFeed = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 niche: z.string().optional(),
 storeId: z.string().optional(),
 city: z.string().optional(),
 })
 .optional(),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity().catch(() => ({ customer_id: null, store_id: null }));

 const targetNiche = data?.niche && data.niche !== "todos" ? data.niche.toLowerCase() : null;

 // 1. Identificar lojas seguidas pelo usuário logado
 const followedStoreIds = new Set<string>();
 if (identity.customer_id) {
 const { data: follows } = await supabase
 .from("store_followers")
 .select("store_id")
 .eq("customer_id", identity.customer_id);

 (follows || []).forEach((f: any) => followedStoreIds.add(f.store_id));
 }

 // 2. Consulta de stories ativos
 let query = supabase
 .from("stories")
 .select(`
 id, store_id, author_profile_id, creator_id, media_url, link_url, link_cta,
 duration_seconds, is_long_format, niche, hashtags, seo_keywords,
 product_id, is_sponsored, campaign_id, created_at, expires_at,
 stores ( id, name, slug, logo_url, rating ),
 creator_profiles ( id, handle, name, avatar_url, is_official_ambassador, ambassador_badge_label, niche ),
 products ( id, title, price_cents, image_url )
 `)
 .eq("status", "active")
 .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
 .order("created_at", { ascending: false })
 .limit(80);

 if (data?.storeId) {
 query = query.eq("store_id", data.storeId);
 } else if (targetNiche && targetNiche !== "geral") {
 query = query.eq("niche", targetNiche);
 }

 const { data: rows, error } = await query;

 if (error) {
 console.error("[stories.functions] Error fetching stories:", error);
 return [] as StoryGroupDTO[];
 }

 // 3. Agrupamento por Entidade (Loja ou Criador)
 const groupMap = new Map<string, StoryGroupDTO>();

 (rows || []).forEach((row: any) => {
 const isCreatorStory = !!row.creator_profiles;
 const groupId = isCreatorStory
 ? `creator_${row.creator_profiles.id}`
 : `store_${row.store_id || "global"}`;

 const mediaItem: StoryMediaItemDTO = {
 id: row.id,
 store_id: row.store_id,
 author_profile_id: row.author_profile_id,
 creator_id: row.creator_id,
 media_url: row.media_url,
 link_url: row.link_url,
 link_cta: row.link_cta,
 duration_seconds: row.duration_seconds || 15,
 is_long_format: !!row.is_long_format || (row.duration_seconds > 60),
 niche: row.niche || "geral",
 hashtags: row.hashtags || [],
 seo_keywords: row.seo_keywords,
 product_id: row.product_id,
 product_info: row.products
 ? {
 id: row.products.id,
 title: row.products.title,
 price_cents: row.products.price_cents,
 image_url: row.products.image_url,
 }
 : null,
 is_sponsored: !!row.is_sponsored,
 campaign_id: row.campaign_id,
 created_at: row.created_at,
 expires_at: row.expires_at,
 collab_info: row.creator_profiles
 ? {
 creator_name: row.creator_profiles.name,
 creator_handle: row.creator_profiles.handle,
 is_official_ambassador: !!row.creator_profiles.is_official_ambassador,
 }
 : null,
 };

 if (!groupMap.has(groupId)) {
 if (isCreatorStory) {
 groupMap.set(groupId, {
 groupId,
 entityType: "creator",
 entityId: row.creator_profiles.id,
 entityName: row.creator_profiles.name,
 entityHandle: `@${row.creator_profiles.handle}`,
 entityAvatarUrl: row.creator_profiles.avatar_url,
 isFollowing: false,
 isOfficialAmbassador: !!row.creator_profiles.is_official_ambassador,
 ambassadorBadgeLabel: row.creator_profiles.ambassador_badge_label || "Embaixador Oficial",
 isSponsored: false,
 niche: row.creator_profiles.niche || "geral",
 stories: [mediaItem],
 hasUnseenStories: true,
 });
 } else {
 const storeName = row.stores?.name || "Comércio Local";
 const isFollowing = row.store_id ? followedStoreIds.has(row.store_id) : false;

 groupMap.set(groupId, {
 groupId,
 entityType: "store",
 entityId: row.store_id || "general",
 entityName: storeName,
 entityHandle: row.stores?.slug ? `@${row.stores.slug}` : undefined,
 entityAvatarUrl: row.stores?.logo_url,
 isFollowing,
 isOfficialAmbassador: false,
 isSponsored: !!row.is_sponsored,
 niche: row.niche || "geral",
 stories: [mediaItem],
 hasUnseenStories: true,
 });
 }
 } else {
 groupMap.get(groupId)!.stories.push(mediaItem);
 }
 });

 const storyGroups = Array.from(groupMap.values());

 // 4. Algoritmo de Ordenação:
 // Rank 1: Lojas que o usuário segue (isFollowing = true)
 // Rank 2: Criadores Embaixadores Oficiais (isOfficialAmbassador = true)
 // Rank 3: Explorar Regional (demais lojas ativas)
 storyGroups.sort((a, b) => {
 if (a.isFollowing && !b.isFollowing) return -1;
 if (!a.isFollowing && b.isFollowing) return 1;

 if (a.isOfficialAmbassador && !b.isOfficialAmbassador) return -1;
 if (!a.isOfficialAmbassador && b.isOfficialAmbassador) return 1;

 return 0;
 });

 return storyGroups;
 });

// ─── 2. CRIAR STORY (COM SUPORTE A VÍDEO LONGO, HASHTAGS E PRODUTOS) ─────────
export const createStory = createServerFn({ method: "POST" })
 .validator(
 z.object({
 mediaUrl: z.string().url(),
 linkUrl: z.string().url().optional().or(z.literal("")),
 linkCta: z.string().max(40).optional(),
 durationSeconds: z.number().int().min(5).max(300).default(15),
 niche: z.string().default("geral"),
 hashtags: z.array(z.string()).default([]),
 productId: z.string().uuid().optional(),
 targetStoreId: z.string().uuid().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 const isLong = data.durationSeconds > 60;
 const storeId = data.targetStoreId || identity.store_id;

 const { data: newStory, error } = await supabase
 .from("stories")
 .insert({
 store_id: storeId,
 author_profile_id: identity.id,
 media_url: data.mediaUrl,
 link_url: data.linkUrl || null,
 link_cta: data.linkCta || null,
 duration_seconds: data.durationSeconds,
 is_long_format: isLong,
 niche: data.niche,
 hashtags: data.hashtags,
 product_id: data.productId || null,
 status: "active",
 expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
 })
 .select()
 .single();

 if (error) {
 console.error("[stories.functions] Erro ao criar story:", error);
 throw new Error("Não foi possível publicar o story.");
 }

 return newStory;
 });

// ─── 3. REGISTRO DE TELEMETRIA & ANALYTICS EM TEMPO REAL ─────────────────────
export const recordStoryTelemetry = createServerFn({ method: "POST" })
 .validator(
 z.object({
 storyId: z.string().uuid(),
 eventType: z.enum(["view", "watch_time", "tap_forward", "tap_back", "click_cta", "click_product", "skipped"]),
 watchTimeSeconds: z.number().int().min(0).max(600).default(0),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getAnonServerClient();

 const { error } = await supabase.from("story_analytics_events").insert({
 story_id: data.storyId,
 event_type: data.eventType,
 watch_time_seconds: data.watchTimeSeconds,
 });

 if (error) {
 console.warn("[stories.functions] Telemetry recording warn:", error.message);
 }

 return { success: true };
 });

// ─── 4. CONCESSÃO DE SELO DE EMBAIXADOR REGIONAL (ADMIN MASTER ONLY) ─────────
export const toggleAmbassadorStatus = createServerFn({ method: "POST" })
 .validator(
 z.object({
 creatorId: z.string().uuid(),
 isOfficialAmbassador: z.boolean(),
 ambassadorBadgeLabel: z.string().default("Embaixador Oficial"),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 if (identity.role !== "master") {
 throw new Error("Apenas o Administrador Master pode conceder selos oficiais de embaixador.");
 }

 const { data: updated, error } = await supabase
 .from("creator_profiles")
 .update({
 is_official_ambassador: data.isOfficialAmbassador,
 ambassador_badge_label: data.ambassadorBadgeLabel,
 verified_by_admin_id: identity.id,
 updated_at: new Date().toISOString(),
 })
 .eq("id", data.creatorId)
 .select()
 .single();

 if (error) {
 console.error("[stories.functions] Erro ao atualizar status de embaixador:", error);
 throw new Error("Falha ao atualizar criador.");
 }

 return updated;
 });

// ─── 5. ANALYTICS DE ENGAJAMENTO E RETENÇÃO DE STORIES (GAP-240) ─────────────
export const getStoreStoriesAnalytics = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

    const { data: storeStories, error: storiesError } = await supabase
      .from("store_stories")
      .select("id, title, media_url, product_id, created_at, expires_at")
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: false })
      .limit(30);

    if (storiesError || storeStories === null || storeStories === undefined || storeStories.length === 0) {
      return {
        totalViews: 0,
        totalWatchTimeSeconds: 0,
        totalProductClicks: 0,
        stories: [],
      };
    }

    const storyIds = storeStories.map((s) => s.id);
    const { data: events } = await supabase
      .from("story_analytics_events")
      .select("story_id, event_type, watch_time_seconds")
      .in("story_id", storyIds);

    let totalViews = 0;
    let totalWatchTimeSeconds = 0;
    let totalProductClicks = 0;
    const storyMetricsMap = new Map<string, { views: number; watchTime: number; clicks: number }>();

    storyIds.forEach((id) => {
      storyMetricsMap.set(id, { views: 0, watchTime: 0, clicks: 0 });
    });

    (events || []).forEach((e) => {
      const metrics = storyMetricsMap.get(e.story_id);
      if (e.event_type === "view") {
        totalViews++;
        if (metrics) metrics.views++;
      } else if (e.event_type === "watch_time") {
        const sec = e.watch_time_seconds || 0;
        totalWatchTimeSeconds += sec;
        if (metrics) metrics.watchTime += sec;
      } else if (e.event_type === "click_product" || e.event_type === "click_cta") {
        totalProductClicks++;
        if (metrics) metrics.clicks++;
      }
    });

    const enrichedStories = storeStories.map((s) => {
      const m = storyMetricsMap.get(s.id) || { views: 0, watchTime: 0, clicks: 0 };
      return {
        id: s.id,
        title: s.title,
        mediaUrl: s.media_url,
        productId: s.product_id,
        createdAt: s.created_at,
        expiresAt: s.expires_at,
        views: m.views,
        watchTimeSeconds: m.watchTime,
        clicks: m.clicks,
      };
    });

    return {
      totalViews,
      totalWatchTimeSeconds,
      totalProductClicks,
      stories: enrichedStories,
    };
  });
