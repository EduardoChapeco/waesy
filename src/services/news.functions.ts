import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

export interface NewsSectionDTO {
 type: "paragraph" | "heading" | "quote" | "gallery" | "video";
 content: string | string[];
 caption?: string;
}

export interface NewsArticleDTO {
 id: string;
 store_id: string;
 store_name?: string;
 store_avatar?: string;
 author_profile_id?: string | null;
 author_name?: string;
 title: string;
 slug: string;
 kicker?: string | null;
 subtitle?: string | null;
 content_sections: NewsSectionDTO[];
 cover_media_url?: string | null;
 cover_media_type: "image" | "video" | "gif";
 category: string;
 tags: string[];
 reading_time_minutes: number;
 views_count: number;
 unique_views_count: number;
 status: "draft" | "published" | "archived";
 published_at?: string | null;
 created_at: string;
}

export interface SponsorDTO {
  id: string;
  store_id: string;
  name: string;
  logo_url?: string | null;
  banner_url?: string | null;
  video_url?: string | null;
  website_url?: string | null;
  target_url?: string | null;
  cta_label?: string | null;
  description?: string | null;
  tier: "gold" | "silver" | "standard" | "supporter";
  active: boolean;
  created_at: string;
  magic_token?: string;
  sponsor_store_id?: string | null;
  views_count?: number;
  clicks_count?: number;
}

export interface NewsCommentDTO {
 id: string;
 article_id: string;
 user_id: string;
 author_name: string;
 author_avatar?: string | null;
 content_text: string;
 created_at: string;
}

// ── 1. Leitura Pública de Notícias (100% Real no Supabase) ───────────────────

export const listPublicArticles = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 category: z.string().optional(),
 storeId: z.string().uuid().optional(),
 limit: z.number().int().min(1).max(50).default(20),
 query: z.string().optional(),
 })
 .optional(),
 )
 .handler(async ({ data }): Promise<NewsArticleDTO[]> => {
 const supabase = getAnonServerClient();
 const limit = data?.limit ?? 20;

 try {
 let q = supabase
 .from("news_articles")
 .select(
 `
 id, store_id, author_profile_id, title, slug, kicker, subtitle, content_sections,
 cover_media_url, cover_media_type, category, tags, reading_time_minutes,
 views_count, unique_views_count, status, published_at, created_at,
 stores ( name, avatar_url ),
 profiles ( full_name )
 `,
 )
 .eq("status", "published")
 .order("published_at", { ascending: false })
 .limit(limit);

 if (data?.category && data.category !== "todas") {
 q = q.eq("category", data.category);
 }

 if (data?.storeId) {
 q = q.eq("store_id", data.storeId);
 }

 if (data?.query) {
 q = q.ilike("title", `%${data.query}%`);
 }

 const { data: articles, error } = await q;
 if (error) {
 console.warn("[news] Erro ao buscar artigos no banco:", error);
 return [];
 }

 return (articles || []).map((a: any) => ({
 id: a.id,
 store_id: a.store_id,
 store_name: a.stores?.name || "Portal de Notícias",
 store_avatar: a.stores?.avatar_url || null,
 author_profile_id: a.author_profile_id,
 author_name: a.profiles?.full_name || "Redação",
 title: a.title,
 slug: a.slug,
 kicker: a.kicker,
 subtitle: a.subtitle,
 content_sections: a.content_sections || [],
 cover_media_url: a.cover_media_url,
 cover_media_type: a.cover_media_type || "image",
 category: a.category,
 tags: a.tags || [],
 reading_time_minutes: a.reading_time_minutes || 3,
 views_count: a.views_count || 0,
 unique_views_count: a.unique_views_count || 0,
 status: a.status,
 published_at: a.published_at,
 created_at: a.created_at,
 }));
 } catch (err) {
 console.warn("[news] Erro ao buscar artigos no banco:", err);
 return [];
 }
 });

export const getArticleDetail = createServerFn({ method: "GET" })
 .validator(z.object({ slug: z.string(), storeSlug: z.string().optional() }))
 .handler(
 async ({
 data: { slug },
 }): Promise<{
 article: NewsArticleDTO | null;
 sponsors: SponsorDTO[];
 related: NewsArticleDTO[];
 linkedEvent?: any;
 }> => {
 const supabase = getAnonServerClient();

 try {
 const { data: articleData, error } = await supabase
 .from("news_articles")
 .select(
 `
 id, store_id, author_profile_id, title, slug, kicker, subtitle, content_sections,
 cover_media_url, cover_media_type, category, tags, reading_time_minutes,
 views_count, unique_views_count, status, published_at, created_at,
 stores ( name, avatar_url, slug ),
 profiles ( full_name )
 `,
 )
 .eq("slug", slug)
 .eq("status", "published")
 .limit(1)
 .maybeSingle();

 if (!error && articleData) {
 const [sponsorsRes, relatedRes, eventRelRes] = await Promise.all([
 supabase
 .from("sponsors")
 .select("*")
 .eq("store_id", articleData.store_id)
 .eq("active", true)
 .limit(6),
 supabase
 .from("news_articles")
 .select("id, title, slug, kicker, cover_media_url, category, published_at, created_at")
 .eq("status", "published")
 .eq("category", articleData.category)
 .neq("id", articleData.id)
 .order("published_at", { ascending: false })
 .limit(4),
 supabase
 .from("event_news_relations")
 .select(
 "events(id, title, event_date, location, venue, cover_image, is_external, external_ticket_url, price_min_cents, rsvp_going_count)",
 )
 .eq("news_article_id", articleData.id)
 .limit(1),
 ]);

 const linkedEvent = (eventRelRes?.data?.[0] as any)?.events || null;

 return {
 article: articleData as any,
 sponsors: (sponsorsRes.data || []) as SponsorDTO[],
 related: (relatedRes.data || []) as NewsArticleDTO[],
 linkedEvent,
 };
 }
 } catch (err) {
 console.warn("[news] Erro ao buscar detalhe do artigo no banco:", err);
 }

 return { article: null, sponsors: [], related: [], linkedEvent: null };
 },
 );

// ── 2. Gestão no Workspace (Notícias & Redação) ──────────────────────────────

export const listWorkspaceArticles = createServerFn({ method: "GET" }).handler(
 async (): Promise<NewsArticleDTO[]> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity.store_id) return [];

 const { data } = await supabase
 .from("news_articles")
 .select("*")
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

 return (data || []) as NewsArticleDTO[];
 },
);

export const createArticle = createServerFn({ method: "POST" })
 .validator(
 z.object({
 title: z.string().min(3),
 slug: z.string().min(2),
 kicker: z.string().optional(),
 subtitle: z.string().optional(),
 content_sections: z.array(
 z.object({
 type: z.enum(["paragraph", "heading", "quote", "gallery", "video"]),
 content: z.union([z.string(), z.array(z.string())]),
 caption: z.string().optional(),
 }),
 ),
 cover_media_url: z.string().url().optional(),
 cover_media_type: z.enum(["image", "video", "gif"]).default("image"),
 category: z.string().default("geral"),
 tags: z.array(z.string()).default([]),
 reading_time_minutes: z.number().int().default(3),
 status: z.enum(["draft", "published", "archived"]).default("published"),
 }),
 )
 .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity.store_id) throw new Error("Nenhum espaço de trabalho ativo.");

    // Gatekeeping: Apenas veículos credenciados no Consórcio de Imprensa podem publicar
    const { data: storeInfo } = await supabase
      .from("stores")
      .select("is_press_consortium, press_accreditation_status, is_platform_root")
      .eq("id", identity.store_id)
      .single();

    const isAuthorized =
      storeInfo?.is_platform_root ||
      storeInfo?.is_press_consortium ||
      storeInfo?.press_accreditation_status === "approved" ||
      identity.role === "admin";

    if (!isAuthorized) {
      throw new Error(
        "Apenas veículos e jornais credenciados no Consórcio de Imprensa podem publicar notícias. Solicite seu credenciamento junto à administração.",
      );
    }

 const { data: created, error } = await supabase
 .from("news_articles")
 .insert({
 store_id: identity.store_id,
 author_profile_id: identity.id || null,
 title: input.title,
 slug: input.slug.toLowerCase().trim(),
 kicker: input.kicker || null,
 subtitle: input.subtitle || null,
 content_sections: input.content_sections,
 cover_media_url: input.cover_media_url || null,
 cover_media_type: input.cover_media_type,
 category: input.category,
 tags: input.tags,
 reading_time_minutes: input.reading_time_minutes,
 status: input.status,
 published_at: input.status === "published" ? new Date().toISOString() : null,
 })
 .select()
 .single();

 if (error) throw new Error(error.message);
 return created as NewsArticleDTO;
 });

export const updateArticle = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 title: z.string().min(3).optional(),
 slug: z.string().min(2).optional(),
 kicker: z.string().nullable().optional(),
 subtitle: z.string().nullable().optional(),
 content_sections: z
 .array(
 z.object({
 type: z.enum(["paragraph", "heading", "quote", "gallery", "video"]),
 content: z.union([z.string(), z.array(z.string())]),
 caption: z.string().optional(),
 }),
 )
 .optional(),
 cover_media_url: z.string().nullable().optional(),
 cover_media_type: z.enum(["image", "video", "gif"]).optional(),
 category: z.string().optional(),
 tags: z.array(z.string()).optional(),
 reading_time_minutes: z.number().int().optional(),
 status: z.enum(["draft", "published", "archived"]).optional(),
 }),
 )
 .handler(async ({ data: { id, ...patch } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("Acesso negado.");

 const updatePayload: Record<string, any> = { ...patch, updated_at: new Date().toISOString() };
 if (patch.status === "published") {
 updatePayload.published_at = new Date().toISOString();
 }

 const { data: updated, error } = await supabase
 .from("news_articles")
 .update(updatePayload)
 .eq("id", id)
 .eq("store_id", identity.store_id)
 .select()
 .single();

 if (error) throw new Error(error.message);
 return updated as NewsArticleDTO;
 });

export const deleteArticle = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("Acesso negado.");

 const { error } = await supabase
 .from("news_articles")
 .delete()
 .eq("id", id)
 .eq("store_id", identity.store_id);

 if (error) throw new Error(error.message);
 return { success: true };
 });

// ── 3. Gestão de Patrocinadores (Sponsors) ──────────────────────────────────

export const listWorkspaceSponsors = createServerFn({ method: "GET" }).handler(
 async (): Promise<SponsorDTO[]> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity.store_id) return [];

 const { data } = await supabase
 .from("sponsors")
 .select("*")
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

 return (data || []) as SponsorDTO[];
 },
);

export const createSponsor = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().min(2),
      logo_url: z.string().url().optional(),
      banner_url: z.string().url().optional(),
      video_url: z.string().url().optional(),
      website_url: z.string().url().optional(),
      cta_label: z.string().default("Saiba Mais"),
      description: z.string().optional(),
      tier: z.enum(["gold", "silver", "standard", "supporter"]).default("standard"),
      sponsor_store_id: z.string().uuid().nullable().optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity.store_id) throw new Error("Acesso negado.");

    const { data, error } = await supabase
      .from("sponsors")
      .insert({
        store_id: identity.store_id,
        name: input.name,
        logo_url: input.logo_url || null,
        banner_url: input.banner_url || null,
        video_url: input.video_url || null,
        website_url: input.website_url || null,
        cta_label: input.cta_label,
        description: input.description || null,
        tier: input.tier,
        sponsor_store_id: input.sponsor_store_id || null,
        active: true,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data as SponsorDTO;
  });

export const updateSponsor = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 name: z.string().min(2).optional(),
 logo_url: z.string().nullable().optional(),
 banner_url: z.string().nullable().optional(),
 video_url: z.string().nullable().optional(),
 website_url: z.string().nullable().optional(),
 cta_label: z.string().optional(),
 description: z.string().nullable().optional(),
 tier: z.enum(["gold", "silver", "standard", "supporter"]).optional(),
 sponsor_store_id: z.string().uuid().nullable().optional(),
 active: z.boolean().optional(),
 }),
 )
 .handler(async ({ data: { id, ...patch } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("Acesso negado.");

 const { data, error } = await supabase
 .from("sponsors")
 .update({ ...patch, updated_at: new Date().toISOString() })
 .eq("id", id)
 .eq("store_id", identity.store_id)
 .select()
 .single();

 if (error) throw new Error(error.message);
 return data as SponsorDTO;
 });

export const deleteSponsor = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("Acesso negado.");

 const { error } = await supabase
 .from("sponsors")
 .delete()
 .eq("id", id)
 .eq("store_id", identity.store_id);

 if (error) throw new Error(error.message);
 return { success: true };
 });

// ── 4. Comentários & Likes Reais ────────────────────────────────────────────

export const listArticleComments = createServerFn({ method: "GET" })
 .validator(z.object({ articleId: z.string().uuid() }))
 .handler(async ({ data: { articleId } }): Promise<NewsCommentDTO[]> => {
 const supabase = getAnonServerClient();

 const { data } = await supabase
 .from("news_comments")
 .select(
 `
 id, article_id, user_id, content_text, created_at,
 profiles ( full_name, avatar_url )
 `,
 )
 .eq("article_id", articleId)
 .eq("status", "active")
 .order("created_at", { ascending: false });

 return (data || []).map((c: any) => ({
 id: c.id,
 article_id: c.article_id,
 user_id: c.user_id,
 author_name: c.profiles?.full_name || "Leitor",
 author_avatar: c.profiles?.avatar_url || null,
 content_text: c.content_text,
 created_at: c.created_at,
 }));
 });

export const submitArticleComment = createServerFn({ method: "POST" })
 .validator(
 z.object({
 articleId: z.string().uuid(),
 contentText: z.string().min(3).max(1000),
 }),
 )
 .handler(async ({ data: { articleId, contentText } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 if (!identity.id) {
 throw new Error("Você precisa estar autenticado para comentar.");
 }

 const { data, error } = await supabase
 .from("news_comments")
 .insert({
 article_id: articleId,
 user_id: identity.id,
 profile_id: identity.id,
 content_text: contentText.trim(),
 status: "active",
 })
 .select()
 .single();

 if (error) throw new Error(error.message);
 return { success: true, comment: data };
 });

export const toggleArticleLike = createServerFn({ method: "POST" })
 .validator(z.object({ articleId: z.string().uuid() }))
 .handler(async ({ data: { articleId } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 if (!identity.id) {
 throw new Error("Faça login para curtir esta matéria.");
 }

 const { data: existing } = await supabase
 .from("news_likes")
 .select("article_id")
 .eq("article_id", articleId)
 .eq("user_id", identity.id)
 .maybeSingle();

 if (existing) {
 await supabase
 .from("news_likes")
 .delete()
 .eq("article_id", articleId)
 .eq("user_id", identity.id);
 return { liked: false };
 } else {
 await supabase
 .from("news_likes")
 .insert({ article_id: articleId, user_id: identity.id });
 return { liked: true };
 }
 });

export const getArticleLikeStatus = createServerFn({ method: "GET" })
 .validator(z.object({ articleId: z.string().uuid() }))
 .handler(async ({ data: { articleId } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity.id) return { liked: false, totalLikes: 0 };

 const [userLikeRes, countRes] = await Promise.all([
 supabase
 .from("news_likes")
 .select("article_id")
 .eq("article_id", articleId)
 .eq("user_id", identity.id)
 .maybeSingle(),
 supabase
 .from("news_likes")
 .select("user_id", { count: "exact", head: true })
 .eq("article_id", articleId),
 ]);

 return {
 liked: !!userLikeRes.data,
 totalLikes: countRes.count || 0,
 };
 });

export const recordSponsorImpression = createServerFn({ method: "POST" })
 .validator(z.object({ sponsorId: z.string().uuid(), placement: z.string().optional() }))
 .handler(async ({ data: { sponsorId, placement } }) => {
 const supabase = getServerClient();
 try {
 await supabase.rpc("increment_sponsor_impressions", {
 p_sponsor_id: sponsorId,
 p_placement: placement || "feed",
 });
 } catch {
 // Fallback update
 const { data } = await supabase.from("sponsors").select("views_count").eq("id", sponsorId).single();
 if (data) {
 await supabase.from("sponsors").update({ views_count: (data.views_count || 0) + 1 }).eq("id", sponsorId);
 }
 }
 return { success: true };
 });

export const recordSponsorClick = createServerFn({ method: "POST" })
 .validator(z.object({ sponsorId: z.string().uuid(), placement: z.string().optional() }))
 .handler(async ({ data: { sponsorId } }) => {
 const supabase = getServerClient();
 const { data } = await supabase.from("sponsors").select("clicks_count").eq("id", sponsorId).single();
 if (data) {
 await supabase.from("sponsors").update({ clicks_count: (data.clicks_count || 0) + 1 }).eq("id", sponsorId);
 }
 return { success: true };
 });

export const getSponsorAnalytics = createServerFn({ method: "GET" })
 .validator(z.object({ storeId: z.string().uuid().optional() }).optional())
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 const storeId = data?.storeId || identity.store_id;
 if (!storeId) return [];

 const { data: sponsors } = await supabase
 .from("sponsors")
 .select("id, name, logo_url, banner_url, website_url, tier, active, views_count, clicks_count, created_at")
 .eq("store_id", storeId)
 .order("created_at", { ascending: false });

 return (sponsors || []).map((s: any) => {
 const views = s.views_count || 0;
 const clicks = s.clicks_count || 0;
 const ctr = views > 0 ? Number(((clicks / views) * 100).toFixed(2)) : 0;
 return {
 ...s,
 views_count: views,
 clicks_count: clicks,
 ctr_percent: ctr,
 };
 });
 });

export const submitCommunityNewsTip = createServerFn({ method: "POST" })
 .validator(
 z.object({
 storeId: z.string().uuid(),
 tipText: z.string().min(5),
 authorName: z.string().min(2),
 contactInfo: z.string().optional(),
 mediaUrls: z.array(z.string().url()).optional(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const slug = `pauta-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
 const { data: tip, error } = await supabase
 .from("news_articles")
 .insert({
 store_id: data.storeId,
 title: `[Sugestão de Pauta] ${data.authorName}`,
 subtitle: data.contactInfo ? `Contato: ${data.contactInfo}` : null,
 kicker: "Comunidade",
 slug,
 content_sections: [{ type: "paragraph", content: data.tipText }],
 cover_media_url: data.mediaUrls && data.mediaUrls.length > 0 ? data.mediaUrls[0] : null,
 status: "draft",
 source_type: "community_tip",
 curation_status: "pending_review",
 author_name: data.authorName,
 })
 .select()
 .single();

 if (error) {
 console.warn("[news_tips] Erro ao salvar pauta:", error.message);
 return { success: true, message: "Sugestão recebida pela redação!" };
 }
 return { success: true, tip };
 });

export const listCommunityNewsTips = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity.store_id) return [];

 const { data } = await supabase
 .from("news_articles")
 .select("*")
 .eq("store_id", identity.store_id)
 .eq("source_type", "community_tip")
 .order("created_at", { ascending: false });

 return data || [];
});

// ── 5. Importador de Artigo via URL (Workspace Integration) ─────────────────

export interface ImportedArticlePreview {
 title: string;
 subtitle: string;
 kicker: string;
 category: string;
 tags: string[];
 cover_media_url: string | null;
 content_sections: NewsSectionDTO[];
 reading_time_minutes: number;
 quality_score: number;
 ai_summary: string;
 source_url: string;
 source_domain: string;
 ai_provider_used: string;
 mined_article_id: string | null;
}

/**
 * Importa e estrutura um artigo/notícia a partir de qualquer URL.
 * Usa Firecrawl (se disponível) + IA (Gemini/Groq) para extração.
 * Grava em mined_articles para rastreabilidade e retorna preview para o editor.
 */
export const importArticleFromUrl = createServerFn({ method: "POST" })
 .validator(
 z.object({
 url: z.string().url("URL inválida — informe uma URL completa (https://...)"),
 tone: z.enum(["editorial", "profissional", "imparcial", "opinativo", "tecnico"]).default("editorial"),
 content_type: z.enum(["news", "blog_post", "recipe", "tech_spec"]).default("news"),
 })
 )
 .handler(async ({ data: input }): Promise<ImportedArticlePreview> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("Nenhum espaço de trabalho ativo.");

 const domain = new URL(input.url).hostname;

 // Verifica bloqueio do domínio
 const { data: scraperConfig } = await supabase
 .from("scraper_configs")
 .select("is_blocked, blocked_reason")
 .eq("domain", domain)
 .maybeSingle();

 if (scraperConfig?.is_blocked) {
 throw new Error(`Domínio ${domain} está bloqueado: ${scraperConfig.blocked_reason || "Violação de ToS"}`);
 }

 // Helper: próxima chave ativa
 async function getNextActiveKey(provider: string) {
 const { data } = await supabase
 .from("api_key_pools")
 .select("id, encrypted_key")
 .eq("provider", provider)
 .eq("is_active", true)
 .order("last_used_at", { ascending: true, nullsFirst: true })
 .limit(1)
 .maybeSingle();
 if (!data?.encrypted_key) return null;
 const rawKey = Buffer.from(data.encrypted_key, "base64").toString("utf-8");
 await supabase.from("api_key_pools").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
 return { id: data.id, rawKey };
 }

 // 1. Extração de conteúdo
 let rawContent = "";
 let firecrawlUsed = false;

 const firecrawlKey = await getNextActiveKey("firecrawl");
 if (firecrawlKey) {
 try {
 const fcRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
 method: "POST",
 headers: { "Content-Type": "application/json", Authorization: `Bearer ${firecrawlKey.rawKey}` },
 body: JSON.stringify({ url: input.url, formats: ["markdown"], onlyMainContent: true }),
 signal: AbortSignal.timeout(12000),
 });
 if (fcRes.ok) {
 const fcJson = await fcRes.json();
 rawContent = fcJson?.data?.markdown || "";
 if (rawContent) firecrawlUsed = true;
 }
 } catch (e: any) {
 console.warn("[importArticle] Firecrawl error:", e.message);
 }
 }

 if (!rawContent) {
 const fetchRes = await fetch(input.url, {
 headers: { "User-Agent": "Mozilla/5.0 (compatible; WaesyBot/1.0)" },
 signal: AbortSignal.timeout(8000),
 });
 if (!fetchRes.ok) throw new Error(`Não foi possível acessar a URL (HTTP ${fetchRes.status})`);
 const html = await fetchRes.text();
 rawContent = html
 .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
 .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
 .replace(/<[^>]+>/g, " ")
 .replace(/\s+/g, " ")
 .slice(0, 15000);
 }

 if (!rawContent || rawContent.length < 50) {
 throw new Error("A página não retornou conteúdo suficiente para importação.");
 }

 const sanitized = rawContent.replace(/\{\{|\}\}/g, "").slice(0, 12000);

 // 2. Estruturação via IA
 const systemPrompt = `Você é um editor-chefe de jornalismo digital. Extraia e estruture o conteúdo abaixo no formato JSON solicitado. Retorne APENAS JSON válido, sem markdown.`;
 const userPrompt = `Extraia e estruture este conteúdo como artigo jornalístico.
URL: ${input.url}
Tom: ${input.tone}

Conteúdo:
${sanitized}

Retorne APENAS este JSON:
{
 "title": "Título editorial da matéria",
 "subtitle": "Subtítulo/lead conciso e informativo",
 "kicker": "Chapéu (ex: POLÍTICA, ECONOMIA, CIDADE)",
 "category": "cidade|politica|economia|cultura|esportes|tecnologia|urgente|geral",
 "tags": ["tag1", "tag2", "tag3"],
 "cover_image_url": "URL da imagem de capa se encontrada ou null",
 "summary": "Resumo executivo de 2-3 frases",
 "estimated_reading_time": 3,
 "quality_score": 75,
 "sections": [
 {"type": "paragraph", "content": "Primeiro parágrafo..."},
 {"type": "heading", "content": "Subtítulo de seção"},
 {"type": "paragraph", "content": "Continuação..."},
 {"type": "quote", "content": "Citação importante", "caption": "Fonte/autor"}
 ]
}`;

 let extracted: any = null;
 let aiProviderUsed = "fallback";

 const geminiKey = await getNextActiveKey("gemini");
 const groqKey = await getNextActiveKey("groq");

 if (geminiKey) {
 try {
 const gRes = await fetch(
 `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey.rawKey}`,
 {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 systemInstruction: { parts: [{ text: systemPrompt }] },
 contents: [{ parts: [{ text: userPrompt }] }],
 generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
 }),
 signal: AbortSignal.timeout(20000),
 }
 );
 if (gRes.ok) {
 const gJson = await gRes.json();
 const txt = gJson?.candidates?.[0]?.content?.parts?.[0]?.text;
 if (txt) { extracted = JSON.parse(txt); aiProviderUsed = "gemini"; }
 }
 } catch (e: any) {
 console.warn("[importArticle] Gemini error:", e.message);
 }
 }

 if (!extracted && groqKey) {
 try {
 const grRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
 method: "POST",
 headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey.rawKey}` },
 body: JSON.stringify({
 model: "llama-3.1-70b-versatile",
 messages: [
 { role: "system", content: `${systemPrompt}\nResponda APENAS com JSON válido.` },
 { role: "user", content: userPrompt },
 ],
 temperature: 0.2,
 response_format: { type: "json_object" },
 }),
 signal: AbortSignal.timeout(20000),
 });
 if (grRes.ok) {
 const grJson = await grRes.json();
 const content = grJson?.choices?.[0]?.message?.content;
 if (content) { extracted = JSON.parse(content); aiProviderUsed = "groq"; }
 }
 } catch (e: any) {
 console.warn("[importArticle] Groq error:", e.message);
 }
 }

 // Fallback determinístico
 if (!extracted) {
 extracted = {
 title: `Conteúdo importado de ${domain}`,
 subtitle: `Importado de ${input.url}`,
 kicker: "IMPORTADO",
 category: "geral",
 tags: [domain.replace("www.", "")],
 cover_image_url: null,
 summary: `Conteúdo importado de ${input.url}. Revise antes de publicar.`,
 estimated_reading_time: 3,
 quality_score: 20,
 sections: [{ type: "paragraph" as const, content: sanitized.slice(0, 3000) }],
 };
 aiProviderUsed = "fallback";
 }

 // 3. Persiste em mined_articles para rastreabilidade
 const { data: mined } = await supabase
 .from("mined_articles")
 .insert({
 source_url: input.url,
 source_domain: domain,
 source_type: "crawl",
 store_id: identity.store_id,
 raw_title: extracted.title,
 extracted_markdown: rawContent.slice(0, 50000),
 ai_structured_title: extracted.title,
 ai_structured_subtitle: extracted.subtitle,
 ai_structured_sections: extracted.sections || [],
 ai_suggested_kicker: extracted.kicker,
 ai_suggested_category: extracted.category,
 ai_suggested_tags: extracted.tags || [],
 ai_suggested_cover_url: extracted.cover_image_url || null,
 ai_summary: extracted.summary,
 quality_score: extracted.quality_score || 50,
 word_count: rawContent.split(/\s+/).length,
 has_cover_image: !!extracted.cover_image_url,
 status: "pending_review",
 tokens_consumed: 3000, // burn_content_import_url
 ai_provider_used: aiProviderUsed,
 firecrawl_used: firecrawlUsed,
 processing_completed_at: new Date().toISOString(),
 })
 .select("id")
 .single();

 return {
 title: extracted.title || "",
 subtitle: extracted.subtitle || "",
 kicker: extracted.kicker || "",
 category: extracted.category || "geral",
 tags: extracted.tags || [],
 cover_media_url: extracted.cover_image_url || null,
 content_sections: (extracted.sections || []) as NewsSectionDTO[],
 reading_time_minutes: extracted.estimated_reading_time || 3,
 quality_score: extracted.quality_score || 50,
 ai_summary: extracted.summary || "",
 source_url: input.url,
 source_domain: domain,
 ai_provider_used: aiProviderUsed,
 mined_article_id: mined?.id || null,
 };
 });

/**
 * Gera um resumo executivo de um artigo existente com IA
 */
export const aiSummarizeArticle = createServerFn({ method: "POST" })
 .validator(z.object({ article_id: z.string().uuid() }))
 .handler(async ({ data: { article_id } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("Acesso negado.");

 const { data: article, error } = await supabase
 .from("news_articles")
 .select("title, subtitle, content_sections")
 .eq("id", article_id)
 .eq("store_id", identity.store_id)
 .single();

 if (error || !article) throw new Error("Artigo não encontrado.");

 const { data: keyData } = await supabase
 .from("api_key_pools")
 .select("encrypted_key")
 .eq("provider", "gemini")
 .eq("is_active", true)
 .order("last_used_at", { ascending: true, nullsFirst: true })
 .limit(1)
 .maybeSingle();

 if (!keyData?.encrypted_key) throw new Error("Nenhuma chave de IA disponível.");
 const rawKey = Buffer.from(keyData.encrypted_key, "base64").toString("utf-8");

 const contentText = (article.content_sections as any[])
 .filter((s) => s.type === "paragraph")
 .map((s) => s.content)
 .join("\n")
 .slice(0, 5000);

 const prompt = `Você é um editor de notícias. Gere um resumo executivo de 2-3 frases do artigo abaixo, capturando o ponto principal, impacto e contexto. Seja direto e objetivo.

Título: ${article.title}
Subtítulo: ${article.subtitle || ""}
Conteúdo: ${contentText}

Retorne APENAS o texto do resumo, sem formatação ou prefixos.`;

 const gRes = await fetch(
 `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${rawKey}`,
 {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 body: JSON.stringify({
 contents: [{ parts: [{ text: prompt }] }],
 generationConfig: { temperature: 0.3, maxOutputTokens: 256 },
 }),
 signal: AbortSignal.timeout(15000),
 }
 );

 if (!gRes.ok) throw new Error(`Erro na IA: HTTP ${gRes.status}`);
 const gJson = await gRes.json();
 const summary = gJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Persiste o resumo no artigo
  await supabase
    .from("news_articles")
    .update({ ai_summary: summary, updated_at: new Date().toISOString() })
    .eq("id", article_id);

  return { summary };
});

/**
 * Retorna os patrocinadores ativos vinculados à loja
 */
export const listStorePublicSponsors = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string() }))
  .handler(async ({ data: { storeId } }): Promise<SponsorDTO[]> => {
    try {
      const supabase = getServerClient();
      const { data, error } = await supabase
        .from("sponsors")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

      if (error) return [];
      return (data || []) as SponsorDTO[];
    } catch {
      return [];
    }
  });

/**
 * Retorna patrocinadores ativos da Rede Display para rotação pública no portal de notícias
 */
export const listPublicNewsSponsors = createServerFn({ method: "GET" })
  .validator(z.object({ limit: z.number().optional() }).optional())
  .handler(async ({ data }): Promise<SponsorDTO[]> => {
    try {
      const supabase = getServerClient();
      const limit = data?.limit || 12;
      const { data: sponsors, error } = await supabase
        .from("sponsors")
        .select("*")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) return [];
      return (sponsors || []) as SponsorDTO[];
    } catch {
      return [];
    }
  });

// ── 4. Relatório Público via Link Mágico & Consórcio de Imprensa ──────────────

export interface PublicSponsorReportDTO {
  sponsor: SponsorDTO;
  newspaperName: string;
  newspaperLogo?: string | null;
  newspaperCity?: string | null;
  metrics: {
    totalImpressions: number;
    totalClicks: number;
    ctrPercent: number;
    totalDurationSeconds: number;
  };
  dailyPoints: { date: string; impressions: number; clicks: number }[];
}

export const getPublicSponsorReport = createServerFn({ method: "GET" })
  .validator(z.object({ magicToken: z.string().uuid() }))
  .handler(async ({ data: { magicToken } }): Promise<PublicSponsorReportDTO | null> => {
    try {
      const supabase = getServerClient();
      const { data: sponsor, error } = await supabase
        .from("sponsors")
        .select("*, stores(name, logo_url, city, state)")
        .eq("magic_token", magicToken)
        .single();

      if (error || !sponsor) return null;

      // Busca telemetria de ad_telemetry_events
      const { data: events } = await supabase
        .from("ad_telemetry_events")
        .select("event_type, duration_seconds, created_at")
        .eq("sponsor_id", sponsor.id)
        .order("created_at", { ascending: true });

      let recordedImpressions = sponsor.views_count || 0;
      let recordedClicks = sponsor.clicks_count || 0;
      let totalDurationSeconds = 0;

      const dailyMap = new Map<string, { impressions: number; clicks: number }>();

      (events || []).forEach((ev: any) => {
        const date = new Date(ev.created_at).toISOString().split("T")[0];
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { impressions: 0, clicks: 0 });
        }
        const entry = dailyMap.get(date)!;

        if (ev.event_type === "view_impression") {
          entry.impressions += 1;
        } else if (ev.event_type === "click") {
          entry.clicks += 1;
        } else if (ev.event_type === "view_duration") {
          totalDurationSeconds += (ev.duration_seconds || 0);
        }
      });

      const eventImpressionsSum = Array.from(dailyMap.values()).reduce((acc, d) => acc + d.impressions, 0);
      const eventClicksSum = Array.from(dailyMap.values()).reduce((acc, d) => acc + d.clicks, 0);

      const totalImpressions = Math.max(recordedImpressions, eventImpressionsSum);
      const totalClicks = Math.max(recordedClicks, eventClicksSum);
      const ctrPercent = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

      const dailyPoints = Array.from(dailyMap.entries()).map(([date, counts]) => ({
        date,
        impressions: counts.impressions,
        clicks: counts.clicks,
      }));

      const newspaper = sponsor.stores as any;

      return {
        sponsor: sponsor as SponsorDTO,
        newspaperName: newspaper?.name || "Veículo de Imprensa Local",
        newspaperLogo: newspaper?.logo_url || null,
        newspaperCity: newspaper?.city ? `${newspaper.city}/${newspaper.state || ""}` : null,
        metrics: {
          totalImpressions,
          totalClicks,
          ctrPercent,
          totalDurationSeconds,
        },
        dailyPoints,
      };
    } catch (err) {
      console.error("[getPublicSponsorReport] error:", err);
      return null;
    }
  });

/**
 * Retorna as campanhas publicitárias em que a loja logada é o patrocinador
 */
export const listStoreSponsoredCampaigns = createServerFn({ method: "GET" })
  .handler(async (): Promise<SponsorDTO[]> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity.store_id) return [];

    const { data } = await supabase
      .from("sponsors")
      .select("*, stores(name, logo_url)")
      .eq("sponsor_store_id", identity.store_id)
      .order("created_at", { ascending: false });

    return (data || []) as SponsorDTO[];
  });

/**
 * Gestão do Consórcio de Imprensa para Admin Master
 */
export const listPressConsortiumStores = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (identity.role !== "admin") throw new Error("Acesso restrito à administração.");

    const { data, error } = await supabase
      .from("stores")
      .select("id, name, slug, logo_url, city, state, is_press_consortium, press_accreditation_status, press_approved_at, created_at")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  });

export const reviewPressAccreditation = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      status: z.enum(["approved", "pending", "revoked", "unaccredited"]),
    }),
  )
  .handler(async ({ data: { storeId, status } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (identity.role !== "admin") throw new Error("Acesso restrito à administração.");

    const isApproved = status === "approved";
    const { data, error } = await supabase
      .from("stores")
      .update({
        press_accreditation_status: status,
        is_press_consortium: isApproved,
        press_approved_at: isApproved ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", storeId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  });

