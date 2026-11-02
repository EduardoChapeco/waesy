import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { decryptSecret } from "@/lib/crypto-vault.server";
import { executeUnifiedAiCall } from "./api-orchestrator.functions";
import { resolveCityNewsCover } from "@/lib/news/city-editorial-images";

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
  city?: string;
  state?: string;
  source_url?: string | null;
  ai_summary?: string | null;
  reading_time_minutes: number;
  views_count: number;
  unique_views_count: number;
  status: "draft" | "published" | "archived";
  published_at?: string | null;
  created_at: string;
  editorial_stage?: "em_apuracao" | "apurado" | "publicado" | "oculto";
  is_members_only?: boolean;
  source_credibility?: string | null;
  ad_policy?: ArticleAdPolicy;
  exclusive_sponsor_ids?: string[];
  placement_overrides?: Record<string, string>;
}

export const CANONICAL_EDITORIAL_PLACEMENT_ZONES = [
  "portal_top_billboard",
  "breaking_rail_card",
  "feed_in_stream",
  "sidebar_sticky",
  "article_hero_sponsor",
  "article_inline_mid",
  "article_footer_cta",
  "builder_custom_slot",
] as const;

export type CanonicalEditorialPlacementZone = (typeof CANONICAL_EDITORIAL_PLACEMENT_ZONES)[number];

export type ArticleAdPolicy = "inherit_network" | "exclusive_lock" | "ads_disabled";

export interface SponsorCreativeDTO {
  banner_url?: string | null;
  headline?: string | null;
  cta_label?: string | null;
  aspect_ratio?: string | null;
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
  tier: "diamond" | "gold" | "silver" | "standard" | "supporter";
  active: boolean;
  created_at: string;
  magic_token?: string;
  sponsor_store_id?: string | null;
  views_count?: number;
  clicks_count?: number;
  // Extensões do Editorial Ad Server
  placement_mode?: "all" | "specific";
  allowed_placements?: string[];
  target_cities?: string[];
  target_categories?: string[];
  creatives_by_placement?: Record<string, SponsorCreativeDTO>;
  starts_at?: string | null;
  ends_at?: string | null;
  max_impressions_quota?: number | null;
  max_clicks_quota?: number | null;
  priority_weight?: number;
  public_report_token?: string;
}

export interface EditorialAdSlotResolution {
  placement_zone: CanonicalEditorialPlacementZone;
  status: "served" | "house_ad" | "disabled" | "empty";
  sponsor: SponsorDTO | null;
  is_exclusive: boolean;
  is_house_ad: boolean;
  rendered_creative: {
    banner_url: string | null;
    headline: string;
    cta_label: string;
    target_url: string;
  };
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
        city: z.string().optional(),
        regionHint: z.enum(["vale_do_paraiba", "santa_catarina", "all"]).optional(),
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
 id, store_id, author_profile_id, author_name, source_url, ai_summary, quality_score,
 title, slug, kicker, subtitle, content_sections,
 cover_media_url, cover_media_type, category, tags, city, state, reading_time_minutes,
 views_count, unique_views_count, status, published_at, created_at,
 stores ( name, logo_url, avatar_url, slug ),
 profiles ( full_name, avatar_url )
 `,
        )
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(Math.max(limit * 3, 60));

      if (data?.category && data.category !== "todas") {
        q = q.eq("category", data.category);
      }

      if (data?.storeId) {
        q = q.eq("store_id", data.storeId);
      }

      if (data?.query) {
        q = q.ilike("title", `%${data.query}%`);
      }

      const { data: rawArticles, error } = await q;
      if (error) {
        console.warn("[news] Erro ao buscar artigos no banco:", error);
        return [];
      }

      let articlesList = Array.isArray(rawArticles) ? [...rawArticles] : [];

      // Priorização por proximidade geográfica:
      // Se houver matérias da cidade ativa, elas lideram o feed.
      // Se a cidade não tiver notícias próprias locais cadastradas,
      // as notícias estaduais/regionais/nacionais mais recentes são exibidas normalmente,
      // evitando a tela vazia de "Nenhuma notícia encontrada".
      const cleanCity =
        data?.city &&
        data.city !== "todas" &&
        data.city !== "Todas" &&
        data.city !== "Global" &&
        data.city !== "all"
          ? data.city.trim().toLowerCase()
          : null;

      if (cleanCity && articlesList.length > 1) {
        articlesList.sort((a: any, b: any) => {
          const aCity = (a.city || "").toLowerCase();
          const bCity = (b.city || "").toLowerCase();
          const aTags = Array.isArray(a.tags)
            ? a.tags.map((t: string) => String(t).toLowerCase())
            : [];
          const bTags = Array.isArray(b.tags)
            ? b.tags.map((t: string) => String(t).toLowerCase())
            : [];

          const aMatch =
            aCity.includes(cleanCity) || aTags.some((t: string) => t.includes(cleanCity));
          const bMatch =
            bCity.includes(cleanCity) || bTags.some((t: string) => t.includes(cleanCity));

          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
          return 0;
        });
      } else if (data?.regionHint === "vale_do_paraiba" && articlesList.length > 1) {
        const valeKeywords = [
          "são josé dos campos",
          "sao jose dos campos",
          "taubaté",
          "taubate",
          "jacareí",
          "jacarei",
          "pindamonhangaba",
          "guaratinguetá",
          "guaratingueta",
          "caçapava",
          "cacapava",
          "lorena",
          "aparecida",
          "cruzeiro",
          "caraguatatuba",
          "ubatuba",
          "são sebastião",
          "sao sebastiao",
          "ilhabela",
          "campos do jordão",
          "campos do jordao",
          "vale do paraíba",
          "vale do paraiba",
        ];
        articlesList.sort((a: any, b: any) => {
          const aBlob = `${a.city || ""} ${a.state || ""} ${a.title || ""}`.toLowerCase();
          const bBlob = `${b.city || ""} ${b.state || ""} ${b.title || ""}`.toLowerCase();
          const aScore =
            (a.state === "SP" ? 2 : 0) +
            (valeKeywords.some((k) => aBlob.includes(k)) ? 3 : 0) +
            (a.cover_media_url ? 1 : 0);
          const bScore =
            (b.state === "SP" ? 2 : 0) +
            (valeKeywords.some((k) => bBlob.includes(k)) ? 3 : 0) +
            (b.cover_media_url ? 1 : 0);
          return bScore - aScore;
        });
      }

      // Validação de integridade: preserva notícias que possuem título válido.
      // Imagens sintéticas de Unsplash são sanitizadas para null para renderização honesta em texto (Invariante B.33).
      const qualifiedArticles = articlesList.filter((a: any) => {
        if (!a.title || String(a.title).trim().length === 0) return false;
        return true;
      });

      return qualifiedArticles.slice(0, limit).map((a: any) => {
        const effectiveCover = resolveCityNewsCover({
          coverUrl: a.cover_media_url,
          city: a.city,
          state: a.state,
          category: a.category,
          tags: a.tags,
          title: a.title,
        });

        const isWaesy = Boolean(
          (a.stores?.name && /waesy/i.test(a.stores.name)) ||
          (a.author_name && /waesy/i.test(a.author_name)),
        );
        const resolvedStoreAvatar =
          a.stores?.logo_url ||
          a.stores?.avatar_url ||
          a.profiles?.avatar_url ||
          (isWaesy ? "/brand-logo.png" : null);

        return {
          id: a.id,
          store_id: a.store_id,
          store_name: a.stores?.name || (isWaesy ? "Waesy" : "Portal de Notícias"),
          store_avatar: resolvedStoreAvatar,
          author_profile_id: a.author_profile_id,
          author_name: a.author_name || a.profiles?.full_name || "Redação",
          title: a.title,
          slug: a.slug,
          kicker: a.kicker,
          subtitle: a.subtitle,
          content_sections: a.content_sections || [],
          cover_media_url: effectiveCover,
          cover_media_type: a.cover_media_type || "image",
          category: a.category,
          tags: a.tags || [],
          city: a.city || "Santa Catarina",
          state: a.state || "SC",
          source_url: a.source_url || null,
          ai_summary: a.ai_summary || null,
          reading_time_minutes: a.reading_time_minutes || 3,
          views_count: a.views_count || 0,
          unique_views_count: a.unique_views_count || 0,
          status: a.status,
          published_at: a.published_at,
          created_at: a.created_at,
        };
      });
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
 id, store_id, author_profile_id, author_name, source_url, ai_summary, quality_score,
 title, slug, kicker, subtitle, content_sections,
 cover_media_url, cover_media_type, category, tags, reading_time_minutes,
 views_count, unique_views_count, status, published_at, created_at,
 stores ( name, logo_url, avatar_url, slug ),
 profiles ( full_name, avatar_url )
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
              .select(
                "id, title, slug, kicker, cover_media_url, category, published_at, created_at",
              )
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

          const isWaesyArticle = Boolean(
            ((articleData as any).stores?.name &&
              /waesy/i.test((articleData as any).stores.name)) ||
            ((articleData as any).author_name && /waesy/i.test((articleData as any).author_name)),
          );
          const resolvedDetailAvatar =
            (articleData as any).stores?.logo_url ||
            (articleData as any).stores?.avatar_url ||
            (articleData as any).profiles?.avatar_url ||
            (isWaesyArticle ? "/brand-logo.png" : null);

          return {
            article: {
              ...articleData,
              store_name:
                (articleData as any).stores?.name ||
                (isWaesyArticle ? "Waesy" : "Portal de Notícias"),
              store_avatar: resolvedDetailAvatar,
              cover_media_url: resolveCityNewsCover({
                coverUrl: articleData.cover_media_url,
                city: (articleData as any).city,
                category: (articleData as any).category,
                tags: (articleData as any).tags,
                title: (articleData as any).title,
              }),
            } as any,
            sponsors: (sponsorsRes.data || []) as SponsorDTO[],
            related: ((relatedRes.data || []) as any[]).map((rel) => ({
              ...rel,
              cover_media_url: resolveCityNewsCover({
                coverUrl: rel.cover_media_url,
                category: rel.category,
                title: rel.title,
              }),
            })) as NewsArticleDTO[],
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
      editorial_stage: z
        .enum(["em_apuracao", "apurado", "publicado", "oculto"])
        .default("publicado"),
      is_members_only: z.boolean().default(false),
      source_credibility: z.string().optional(),
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
        editorial_stage: input.editorial_stage || "publicado",
        is_members_only: Boolean(input.is_members_only),
        source_credibility: input.source_credibility || "Oficial / Verificado",
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
      editorial_stage: z.enum(["em_apuracao", "apurado", "publicado", "oculto"]).optional(),
      is_members_only: z.boolean().optional(),
      source_credibility: z.string().optional(),
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
      await supabase.from("news_likes").insert({ article_id: articleId, user_id: identity.id });
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
      const { data } = await supabase
        .from("sponsors")
        .select("views_count")
        .eq("id", sponsorId)
        .single();
      if (data) {
        await supabase
          .from("sponsors")
          .update({ views_count: (data.views_count || 0) + 1 })
          .eq("id", sponsorId);
      }
    }
    return { success: true };
  });

export const recordSponsorClick = createServerFn({ method: "POST" })
  .validator(z.object({ sponsorId: z.string().uuid(), placement: z.string().optional() }))
  .handler(async ({ data: { sponsorId } }) => {
    const supabase = getServerClient();
    const { data } = await supabase
      .from("sponsors")
      .select("clicks_count")
      .eq("id", sponsorId)
      .single();
    if (data) {
      await supabase
        .from("sponsors")
        .update({ clicks_count: (data.clicks_count || 0) + 1 })
        .eq("id", sponsorId);
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
      .select(
        "id, name, logo_url, banner_url, website_url, tier, active, views_count, clicks_count, created_at",
      )
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
      tone: z
        .enum(["editorial", "profissional", "imparcial", "opinativo", "tecnico"])
        .default("editorial"),
      content_type: z.enum(["news", "blog_post", "recipe", "tech_spec"]).default("news"),
    }),
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
      throw new Error(
        `Domínio ${domain} está bloqueado: ${scraperConfig.blocked_reason || "Violação de ToS"}`,
      );
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
      let rawKey: string;
      try {
        rawKey = decryptSecret(data.encrypted_key);
      } catch {
        return null;
      }
      await supabase
        .from("api_key_pools")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", data.id);
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
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${firecrawlKey.rawKey}`,
          },
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

    try {
      const aiRes = await executeUnifiedAiCall({
        systemPrompt,
        userPrompt,
        responseFormat: "json_object",
        temperature: 0.2,
      });
      if (aiRes.parsedJson) {
        extracted = aiRes.parsedJson;
        aiProviderUsed = aiRes.provider;
      }
    } catch (e: any) {
      console.warn("[importArticle] Unified AI error:", e.message);
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

    const contentText = (article.content_sections as any[])
      .filter((s) => s.type === "paragraph")
      .map((s) => s.content)
      .join("\n")
      .slice(0, 5000);

    const prompt = `Título: ${article.title}\nSubtítulo: ${article.subtitle || ""}\nConteúdo: ${contentText}`;

    const aiRes = await executeUnifiedAiCall({
      systemPrompt:
        "Você é um editor de notícias. Gere um resumo executivo de 2-3 frases do artigo fornecido, capturando o ponto principal, impacto e contexto. Seja direto, objetivo e retorne APENAS o texto do resumo.",
      userPrompt: prompt,
      temperature: 0.3,
      maxTokens: 256,
    });

    const summary = aiRes.content.trim();

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
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storeId);
      let targetUuid = storeId;

      if (!isUuid) {
        const { data: st } = await supabase
          .from("stores")
          .select("id")
          .eq("slug", storeId)
          .maybeSingle();
        if (!st?.id) return [];
        targetUuid = st.id;
      }

      const { data, error } = await supabase
        .from("sponsors")
        .select("*")
        .eq("store_id", targetUuid)
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
  .validator(
    z.object({
      magicToken: z.string().uuid().optional(),
      reportToken: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data: input }): Promise<PublicSponsorReportDTO | null> => {
    try {
      const token = input.reportToken || input.magicToken;
      if (!token) return null;

      const supabase = getServerClient();
      let sponsor: any = null;

      // 1. Tenta por public_report_token
      const { data: byReportToken } = await supabase
        .from("sponsors")
        .select("*, stores(name, logo_url, city, state)")
        .eq("public_report_token", token)
        .maybeSingle();

      if (byReportToken) {
        sponsor = byReportToken;
      } else {
        // Fallback para magic_token legado
        const { data: byMagicToken } = await supabase
          .from("sponsors")
          .select("*, stores(name, logo_url, city, state)")
          .eq("magic_token", token)
          .maybeSingle();
        sponsor = byMagicToken;
      }

      if (!sponsor) return null;

      // Busca telemetria unificada de sponsor_ad_events e ad_telemetry_events
      const [modernEventsRes, legacyEventsRes] = await Promise.all([
        supabase
          .from("sponsor_ad_events")
          .select("event_type, duration_seconds, created_at, placement_zone")
          .eq("sponsor_id", sponsor.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("ad_telemetry_events")
          .select("event_type, duration_seconds, created_at")
          .eq("sponsor_id", sponsor.id)
          .order("created_at", { ascending: true }),
      ]);

      const events = [...(modernEventsRes.data || []), ...(legacyEventsRes.data || [])];

      let recordedImpressions = sponsor.views_count || 0;
      let recordedClicks = sponsor.clicks_count || 0;
      let totalDurationSeconds = 0;

      const dailyMap = new Map<string, { impressions: number; clicks: number }>();

      events.forEach((ev: any) => {
        const date = new Date(ev.created_at).toISOString().split("T")[0];
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { impressions: 0, clicks: 0 });
        }
        const entry = dailyMap.get(date)!;

        if (ev.event_type === "view_impression" || ev.event_type === "viewable_impression") {
          entry.impressions += 1;
        } else if (ev.event_type === "click") {
          entry.clicks += 1;
        } else if (ev.event_type === "view_duration") {
          totalDurationSeconds += ev.duration_seconds || 0;
        }
      });

      const eventImpressionsSum = Array.from(dailyMap.values()).reduce(
        (acc, d) => acc + d.impressions,
        0,
      );
      const eventClicksSum = Array.from(dailyMap.values()).reduce((acc, d) => acc + d.clicks, 0);

      const totalImpressions = Math.max(recordedImpressions, eventImpressionsSum);
      const totalClicks = Math.max(recordedClicks, eventClicksSum);
      const ctrPercent =
        totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

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
export const listStoreSponsoredCampaigns = createServerFn({ method: "GET" }).handler(
  async (): Promise<SponsorDTO[]> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity.store_id) return [];

    const { data } = await supabase
      .from("sponsors")
      .select("*, stores(name, logo_url)")
      .eq("sponsor_store_id", identity.store_id)
      .order("created_at", { ascending: false });

    return (data || []) as SponsorDTO[];
  },
);

/**
 * Gestão do Consórcio de Imprensa para Admin Master
 */
export const listPressConsortiumStores = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getServerIdentity();
  if (identity.role !== "admin") throw new Error("Acesso restrito à administração.");

  const { data, error } = await supabase
    .from("stores")
    .select(
      "id, name, slug, logo_url, city, state, is_press_consortium, press_accreditation_status, press_approved_at, created_at",
    )
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

// ── 5. Proxy Seguro de Capas Jornalísticas para Estúdio PNG (<canvas> Anti-CORS) e Sync Regional ──

export function isSafePublicHttpsImageUrl(rawUrl?: string | null): boolean {
  if (!rawUrl || typeof rawUrl !== "string") return false;
  try {
    const parsed = new URL(rawUrl.trim());
    if (parsed.protocol !== "https:") return false;

    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.includes("unsplash.com") ||
      host.includes("pexels.com") ||
      host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      host.startsWith("169.254.") ||
      host.startsWith("0.") ||
      host === "::1" ||
      host.startsWith("[")
    ) {
      return false;
    }

    const octets = host.split(".");
    if (octets.length === 4 && octets.every((p) => /^\d+$/.test(p))) {
      const first = Number(octets[0]);
      const second = Number(octets[1]);
      if (first === 172 && second >= 16 && second <= 31) return false;
      if (first === 100 && second >= 64 && second <= 127) return false;
    }

    return true;
  } catch {
    return false;
  }
}

const FetchNewsImageDataUrlSchema = z.object({
  imageUrl: z.string().min(8).max(2048),
});

export const fetchNewsImageDataUrlFn = createServerFn({ method: "POST" })
  .validator(FetchNewsImageDataUrlSchema)
  .handler(async ({ data: { imageUrl } }): Promise<{ ok: boolean; dataUrl: string | null }> => {
    if (!isSafePublicHttpsImageUrl(imageUrl)) {
      return { ok: false, dataUrl: null };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6500);
      const res = await fetch(imageUrl, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          "User-Agent": "WaesyEditorialStudio/2.0",
        },
      });
      clearTimeout(timeout);

      if (!res.ok) return { ok: false, dataUrl: null };
      if (res.url && !isSafePublicHttpsImageUrl(res.url)) {
        return { ok: false, dataUrl: null };
      }

      const contentType = (res.headers.get("content-type") || "")
        .split(";")[0]
        .trim()
        .toLowerCase();
      if (!contentType.startsWith("image/")) {
        return { ok: false, dataUrl: null };
      }

      const buffer = await res.arrayBuffer();
      if (buffer.byteLength === 0 || buffer.byteLength > 5_000_000) {
        return { ok: false, dataUrl: null };
      }

      const base64 = Buffer.from(buffer).toString("base64");
      return {
        ok: true,
        dataUrl: `data:${contentType};base64,${base64}`,
      };
    } catch {
      return { ok: false, dataUrl: null };
    }
  });

const SyncRegionalMinedNewsSchema = z
  .object({
    regionPreset: z.enum(["vale_do_paraiba", "santa_catarina", "nacional"]).optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    maxItems: z.number().int().min(1).max(20).optional(),
  })
  .optional();

export const syncRegionalMinedNewsFn = createServerFn({ method: "POST" })
  .validator(SyncRegionalMinedNewsSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.user_id) {
      throw new Error("Autenticação necessária para sincronizar pautas.");
    }

    const regionPreset = data?.regionPreset ?? "vale_do_paraiba";
    const city =
      data?.city ?? (regionPreset === "vale_do_paraiba" ? "São José dos Campos" : undefined);
    const state = data?.state ?? (regionPreset === "vale_do_paraiba" ? "SP" : undefined);
    const maxItems = data?.maxItems ?? 8;

    const { executeAutomatedNewsHarvest } = await import("./mining/automated-harvest");
    return executeAutomatedNewsHarvest({
      storeId: identity.store_id || undefined,
      regionPreset,
      city,
      state,
      maxItems,
    });
  });

// ── 7. Motor BFF Editorial Ad Server & Display Network ───────────────────────

export const resolveEditorialAdPlacementsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      articleId: z.string().uuid().optional(),
      pageSlug: z.string().optional(),
      placementZones: z.array(z.string()).min(1),
      viewerCity: z.string().optional(),
      category: z.string().optional(),
    }),
  )
  .handler(async ({ data: input }): Promise<Record<string, EditorialAdSlotResolution>> => {
    const supabase = getServerClient();
    const resolutions: Record<string, EditorialAdSlotResolution> = {};

    let article: {
      id: string;
      store_id: string;
      ad_policy: ArticleAdPolicy;
      exclusive_sponsor_ids: string[];
      placement_overrides: Record<string, string>;
      category?: string;
      city?: string;
    } | null = null;

    if (input.articleId) {
      const { data: artData } = await supabase
        .from("news_articles")
        .select(
          "id, store_id, ad_policy, exclusive_sponsor_ids, placement_overrides, category, city",
        )
        .eq("id", input.articleId)
        .maybeSingle();

      if (artData && artData.store_id === input.storeId) {
        article = {
          id: artData.id,
          store_id: artData.store_id,
          ad_policy: (artData.ad_policy as ArticleAdPolicy) || "inherit_network",
          exclusive_sponsor_ids: (artData.exclusive_sponsor_ids as string[]) || [],
          placement_overrides: (artData.placement_overrides as Record<string, string>) || {},
          category: artData.category,
          city: artData.city,
        };
      }
    }

    // Brand Safety: Se a matéria desativou anúncios, retorna vazio para todas as zonas
    if (article?.ad_policy === "ads_disabled") {
      for (const zone of input.placementZones) {
        resolutions[zone] = {
          placement_zone: zone as CanonicalEditorialPlacementZone,
          status: "disabled",
          sponsor: null,
          is_exclusive: false,
          is_house_ad: false,
          rendered_creative: {
            banner_url: null,
            headline: "",
            cta_label: "",
            target_url: "",
          },
        };
      }
      return resolutions;
    }

    // Isolamento multi-tenant estrito: busca apenas anunciantes deste portal
    const { data: rawSponsors } = await supabase
      .from("sponsors")
      .select("*")
      .eq("store_id", input.storeId)
      .eq("active", true);

    const sponsors: SponsorDTO[] = (rawSponsors || []) as SponsorDTO[];
    const now = new Date();

    // Filtra vigência de datas e quotas de impressões/cliques
    const validPool = sponsors.filter((s) => {
      if (s.starts_at && new Date(s.starts_at) > now) return false;
      if (s.ends_at && new Date(s.ends_at) < now) return false;
      if (s.max_impressions_quota && (s.views_count || 0) >= s.max_impressions_quota) return false;
      if (s.max_clicks_quota && (s.clicks_count || 0) >= s.max_clicks_quota) return false;
      return true;
    });

    const resolveCreative = (s: SponsorDTO, zone: string) => {
      const custom = s.creatives_by_placement?.[zone];
      return {
        banner_url: custom?.banner_url || s.banner_url || s.logo_url || null,
        headline: custom?.headline || s.name,
        cta_label: custom?.cta_label || s.cta_label || "Saiba Mais",
        target_url: s.website_url || s.target_url || "#",
      };
    };

    const pickWeighted = (candidates: SponsorDTO[]): SponsorDTO | null => {
      if (candidates.length === 0) return null;
      if (candidates.length === 1) return candidates[0];

      const getWeight = (s: SponsorDTO) => {
        if (typeof s.priority_weight === "number" && s.priority_weight > 0)
          return s.priority_weight;
        if (s.tier === "diamond") return 50;
        if (s.tier === "gold") return 30;
        if (s.tier === "silver") return 20;
        return 10;
      };

      const totalWeight = candidates.reduce((acc, s) => acc + getWeight(s), 0);
      let randomVal = Math.random() * totalWeight;

      for (const s of candidates) {
        randomVal -= getWeight(s);
        if (randomVal <= 0) return s;
      }
      return candidates[0];
    };

    for (const zone of input.placementZones) {
      // 1. Verificação de override pontual na matéria
      const overrideSponsorId = article?.placement_overrides?.[zone];
      if (overrideSponsorId) {
        const overrideSponsor = sponsors.find((s) => s.id === overrideSponsorId);
        if (overrideSponsor) {
          resolutions[zone] = {
            placement_zone: zone as CanonicalEditorialPlacementZone,
            status: "served",
            sponsor: overrideSponsor,
            is_exclusive: true,
            is_house_ad: false,
            rendered_creative: resolveCreative(overrideSponsor, zone),
          };
          continue;
        }
      }

      // 2. Patrocínio exclusivo (exclusive_lock)
      if (article?.ad_policy === "exclusive_lock") {
        const exclusiveCandidates = validPool.filter((s) =>
          article.exclusive_sponsor_ids?.includes(s.id),
        );
        const selected = pickWeighted(exclusiveCandidates);
        if (selected) {
          resolutions[zone] = {
            placement_zone: zone as CanonicalEditorialPlacementZone,
            status: "served",
            sponsor: selected,
            is_exclusive: true,
            is_house_ad: false,
            rendered_creative: resolveCreative(selected, zone),
          };
          continue;
        }
      }

      // 3. Rede Geral (inherit_network) com filtros de cidade, categoria e zona permitida
      const matchingCandidates = validPool.filter((s) => {
        // Se a matéria for exclusive_lock mas não achou candidato exclusivo, não vaza rede geral
        if (article?.ad_policy === "exclusive_lock") return false;

        // Filtro por cidade (geotargeting)
        if (s.target_cities && s.target_cities.length > 0) {
          const currentCity = input.viewerCity || article?.city;
          if (
            !currentCity ||
            !s.target_cities.some((c) => c.toLowerCase() === currentCity.toLowerCase())
          ) {
            return false;
          }
        }

        // Filtro por categoria editorial
        if (s.target_categories && s.target_categories.length > 0) {
          const currentCat = input.category || article?.category;
          if (
            !currentCat ||
            !s.target_categories.some((c) => c.toLowerCase() === currentCat.toLowerCase())
          ) {
            return false;
          }
        }

        // Filtro por zona permitida
        if (s.placement_mode === "specific") {
          if (!s.allowed_placements?.includes(zone)) {
            return false;
          }
        }

        return true;
      });

      const selected = pickWeighted(matchingCandidates);

      if (selected) {
        resolutions[zone] = {
          placement_zone: zone as CanonicalEditorialPlacementZone,
          status: "served",
          sponsor: selected,
          is_exclusive: false,
          is_house_ad: false,
          rendered_creative: resolveCreative(selected, zone),
        };
      } else {
        // 4. Fallback House Ad (Anuncie no Portal)
        resolutions[zone] = {
          placement_zone: zone as CanonicalEditorialPlacementZone,
          status: "house_ad",
          sponsor: null,
          is_exclusive: false,
          is_house_ad: true,
          rendered_creative: {
            banner_url: null,
            headline: "Espaço Publicitário Disponível",
            cta_label: "Anuncie no Portal",
            target_url: `/paginas/anuncie?portal=${input.storeId}&zone=${zone}`,
          },
        };
      }
    }

    return resolutions;
  });

export const updateArticleAdConfigFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      articleId: z.string().uuid(),
      adPolicy: z.enum(["inherit_network", "exclusive_lock", "ads_disabled"]),
      exclusiveSponsorIds: z.array(z.string().uuid()).default([]),
      placementOverrides: z.record(z.string(), z.string()).default({}),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity.store_id) {
      throw new Error("Acesso negado: loja ou portal não identificado.");
    }

    const { data, error } = await supabase
      .from("news_articles")
      .update({
        ad_policy: input.adPolicy,
        exclusive_sponsor_ids: input.exclusiveSponsorIds,
        placement_overrides: input.placementOverrides,
      })
      .eq("id", input.articleId)
      .eq("store_id", identity.store_id)
      .select("id, ad_policy, exclusive_sponsor_ids, placement_overrides")
      .single();

    if (error) {
      throw new Error(`Erro ao atualizar configuração de publicidade: ${error.message}`);
    }

    return data;
  });

export const recordEditorialAdEventFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      sponsorId: z.string().uuid().nullable().optional(),
      placementZone: z.string(),
      articleId: z.string().uuid().nullable().optional(),
      pageSlug: z.string().nullable().optional(),
      eventType: z.enum(["ad_loaded", "viewable_impression", "click", "view_duration"]),
      isExclusive: z.boolean().default(false),
      viewerCity: z.string().nullable().optional(),
      deviceType: z.enum(["desktop", "mobile", "tablet"]).default("desktop"),
      sessionToken: z.string().nullable().optional(),
      durationSeconds: z.number().int().min(0).default(0),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();

    try {
      // 1. Tenta RPC atômica
      const { data: rpcResult, error: rpcErr } = await supabase.rpc(
        "record_editorial_ad_telemetry",
        {
          p_store_id: input.storeId,
          p_sponsor_id: input.sponsorId || null,
          p_placement_zone: input.placementZone,
          p_article_id: input.articleId || null,
          p_page_slug: input.pageSlug || null,
          p_event_type: input.eventType,
          p_is_exclusive: input.isExclusive,
          p_viewer_city: input.viewerCity || null,
          p_device_type: input.deviceType,
          p_session_token: input.sessionToken || null,
          p_duration_seconds: input.durationSeconds,
        },
      );

      if (!rpcErr) {
        return { success: true, recorded: rpcResult };
      }
    } catch {
      // Continua para fallback direto
    }

    // 2. Inserção direta defensiva caso a RPC falhe
    try {
      await supabase.from("sponsor_ad_events").insert({
        store_id: input.storeId,
        sponsor_id: input.sponsorId || null,
        placement_zone: input.placementZone,
        article_id: input.articleId || null,
        page_slug: input.pageSlug || null,
        event_type: input.eventType,
        is_exclusive_delivery: input.isExclusive,
        viewer_city: input.viewerCity || null,
        device_type: input.deviceType,
        session_token: input.sessionToken || null,
        duration_seconds: input.durationSeconds,
      });

      if (input.sponsorId) {
        if (input.eventType === "viewable_impression") {
          const { data: s } = await supabase
            .from("sponsors")
            .select("views_count")
            .eq("id", input.sponsorId)
            .single();
          if (s) {
            await supabase
              .from("sponsors")
              .update({ views_count: (s.views_count || 0) + 1 })
              .eq("id", input.sponsorId);
          }
        } else if (input.eventType === "click") {
          const { data: s } = await supabase
            .from("sponsors")
            .select("clicks_count")
            .eq("id", input.sponsorId)
            .single();
          if (s) {
            await supabase
              .from("sponsors")
              .update({ clicks_count: (s.clicks_count || 0) + 1 })
              .eq("id", input.sponsorId);
          }
        }
      }

      return { success: true, recorded: true };
    } catch {
      return { success: false, recorded: false };
    }
  });

export interface EditorialAdAnalyticsSummaryDTO {
  totalImpressions: number;
  totalViewableImpressions: number;
  viewabilityRatePercent: number;
  totalClicks: number;
  overallCtrPercent: number;
  totalDurationSeconds: number;
  byZone: {
    zone: string;
    impressions: number;
    viewableImpressions: number;
    clicks: number;
    ctrPercent: number;
  }[];
  bySponsor: {
    sponsorId: string;
    sponsorName: string;
    tier: string;
    viewsCount: number;
    clicksCount: number;
    ctrPercent: number;
    maxImpressionsQuota?: number | null;
    quotaUsedPercent?: number | null;
    publicReportToken?: string;
  }[];
}

export const getEditorialAdNetworkAnalyticsFn = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        storeId: z.string().uuid().optional(),
        days: z.number().int().min(1).max(90).default(30),
      })
      .optional(),
  )
  .handler(async ({ data: input }): Promise<EditorialAdAnalyticsSummaryDTO | null> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    const storeId = input?.storeId || identity.store_id;
    if (!storeId) return null;

    const days = input?.days || 30;
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [sponsorsRes, eventsRes] = await Promise.all([
      supabase
        .from("sponsors")
        .select(
          "id, name, tier, views_count, clicks_count, max_impressions_quota, public_report_token",
        )
        .eq("store_id", storeId),
      supabase
        .from("sponsor_ad_events")
        .select("sponsor_id, placement_zone, event_type, duration_seconds")
        .eq("store_id", storeId)
        .gte("created_at", sinceDate),
    ]);

    const sponsors = sponsorsRes.data || [];
    const events = eventsRes.data || [];

    let totalImpressions = 0;
    let totalViewableImpressions = 0;
    let totalClicks = 0;
    let totalDurationSeconds = 0;

    const zoneMap = new Map<string, { impressions: number; viewable: number; clicks: number }>();

    for (const ev of events) {
      if (!zoneMap.has(ev.placement_zone)) {
        zoneMap.set(ev.placement_zone, { impressions: 0, viewable: 0, clicks: 0 });
      }
      const zStats = zoneMap.get(ev.placement_zone)!;

      if (ev.event_type === "ad_loaded") {
        totalImpressions += 1;
        zStats.impressions += 1;
      } else if (ev.event_type === "viewable_impression") {
        totalViewableImpressions += 1;
        zStats.viewable += 1;
      } else if (ev.event_type === "click") {
        totalClicks += 1;
        zStats.clicks += 1;
      } else if (ev.event_type === "view_duration") {
        totalDurationSeconds += ev.duration_seconds || 0;
      }
    }

    const viewabilityRate =
      totalImpressions > 0
        ? Number(((totalViewableImpressions / totalImpressions) * 100).toFixed(1))
        : 100;

    const overallCtr =
      totalViewableImpressions > 0
        ? Number(((totalClicks / totalViewableImpressions) * 100).toFixed(2))
        : 0;

    const byZone = Array.from(zoneMap.entries()).map(([zone, stats]) => ({
      zone,
      impressions: stats.impressions,
      viewableImpressions: stats.viewable,
      clicks: stats.clicks,
      ctrPercent:
        stats.viewable > 0 ? Number(((stats.clicks / stats.viewable) * 100).toFixed(2)) : 0,
    }));

    const bySponsor = sponsors.map((s: any) => {
      const views = s.views_count || 0;
      const clicks = s.clicks_count || 0;
      const ctr = views > 0 ? Number(((clicks / views) * 100).toFixed(2)) : 0;
      const quota = s.max_impressions_quota;
      const quotaUsedPercent =
        quota && quota > 0 ? Number(((views / quota) * 100).toFixed(1)) : null;

      return {
        sponsorId: s.id,
        sponsorName: s.name,
        tier: s.tier,
        viewsCount: views,
        clicksCount: clicks,
        ctrPercent: ctr,
        maxImpressionsQuota: quota,
        quotaUsedPercent,
        publicReportToken: s.public_report_token,
      };
    });

    return {
      totalImpressions,
      totalViewableImpressions,
      viewabilityRatePercent: viewabilityRate,
      totalClicks,
      overallCtrPercent: overallCtr,
      totalDurationSeconds,
      byZone,
      bySponsor,
    };
  });

// ============================================================================
// REDES SOCIAIS EDITORIAIS & AGENDAMENTO AUTOMATIZADO (INSTAGRAM FEED & STORIES)
// ============================================================================

export interface EditorialSocialScheduleDTO {
  id: string;
  store_id: string;
  article_id?: string | null;
  channel: "instagram_feed" | "instagram_stories" | "whatsapp_channel" | "multi_channel";
  status: "draft" | "scheduled" | "publishing" | "published" | "failed";
  scheduled_for: string;
  published_at?: string | null;
  caption_text?: string | null;
  rendered_assets: string[];
  auto_post_mode: "manual" | "daily_scheduled" | "immediate";
  fixed_ending_slide_url?: string | null;
  layout_variant?: string;
  error_message?: string | null;
  created_at: string;
  article_title?: string;
}

export interface EditorialSocialSettingsDTO {
  store_id: string;
  instagram_account_handle?: string | null;
  auto_publish_stories_enabled: boolean;
  auto_publish_feed_enabled: boolean;
  daily_stories_time: string;
  fixed_ending_slide_url?: string | null;
  random_layouts_enabled: boolean;
}

export const scheduleEditorialSocialPostFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      storeId?: string;
      articleId?: string;
      channel: "instagram_feed" | "instagram_stories" | "whatsapp_channel" | "multi_channel";
      scheduledFor?: string;
      captionText?: string;
      renderedAssets?: string[];
      autoPostMode?: "manual" | "daily_scheduled" | "immediate";
      fixedEndingSlideUrl?: string;
      layoutVariant?: string;
    }) => {
      return z
        .object({
          storeId: z.string().optional(),
          articleId: z.string().optional(),
          channel: z.enum([
            "instagram_feed",
            "instagram_stories",
            "whatsapp_channel",
            "multi_channel",
          ]),
          scheduledFor: z.string().optional(),
          captionText: z.string().optional(),
          renderedAssets: z.array(z.string()).optional(),
          autoPostMode: z.enum(["manual", "daily_scheduled", "immediate"]).optional(),
          fixedEndingSlideUrl: z.string().optional(),
          layoutVariant: z.string().optional(),
        })
        .parse(d);
    },
  )
  .handler(async ({ data }) => {
    const {
      storeId: explicitStoreId,
      articleId,
      channel,
      scheduledFor,
      captionText,
      renderedAssets = [],
      autoPostMode = "manual",
      fixedEndingSlideUrl,
      layoutVariant = "classic_card",
    } = data;

    const identity = await getServerIdentity();
    const storeId = explicitStoreId || identity.storeId;
    if (!storeId) {
      throw new Error("Loja editorial não identificada para agendamento.");
    }
    assertStoreAccess(identity, ["owner", "admin", "manager", "editor"]);

    const supabase = getServerClient();
    const scheduledTimestamp = scheduledFor
      ? new Date(scheduledFor).toISOString()
      : new Date().toISOString();

    const { data: inserted, error } = await supabase
      .from("editorial_social_schedules")
      .insert({
        store_id: storeId,
        article_id: articleId || null,
        channel,
        status: autoPostMode === "immediate" ? "published" : "scheduled",
        scheduled_for: scheduledTimestamp,
        published_at: autoPostMode === "immediate" ? new Date().toISOString() : null,
        caption_text: captionText || null,
        rendered_assets: renderedAssets,
        auto_post_mode: autoPostMode,
        fixed_ending_slide_url: fixedEndingSlideUrl || null,
        layout_variant: layoutVariant,
      })
      .select()
      .single();

    if (error) {
      console.error("[scheduleEditorialSocialPostFn] Insert error:", error);
      throw new Error("Falha ao registrar agendamento social editorial.");
    }

    return inserted as EditorialSocialScheduleDTO;
  });

export const listEditorialSocialSchedulesFn = createServerFn({ method: "GET" })
  .validator((d: { storeId?: string; limit?: number }) => {
    return z
      .object({
        storeId: z.string().optional(),
        limit: z.number().optional(),
      })
      .parse(d || {});
  })
  .handler(async ({ data }) => {
    const { storeId: explicitStoreId, limit = 50 } = data;
    const identity = await getServerIdentity();
    const storeId = explicitStoreId || identity.storeId;
    if (!storeId) return [];

    assertStoreAccess(identity, ["owner", "admin", "manager", "editor"]);
    const supabase = getServerClient();

    const { data: rows, error } = await supabase
      .from("editorial_social_schedules")
      .select(
        `
        *,
        news_articles (
          title
        )
      `,
      )
      .eq("store_id", storeId)
      .order("scheduled_for", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[listEditorialSocialSchedulesFn] Query error:", error);
      return [];
    }

    return (rows || []).map((r: any) => ({
      ...r,
      article_title: r.news_articles?.title || null,
    })) as EditorialSocialScheduleDTO[];
  });

export const getEditorialSocialSettingsFn = createServerFn({ method: "GET" })
  .validator((d: { storeId?: string }) => {
    return z
      .object({
        storeId: z.string().optional(),
      })
      .parse(d || {});
  })
  .handler(async ({ data }) => {
    const { storeId: explicitStoreId } = data;
    const identity = await getServerIdentity();
    const storeId = explicitStoreId || identity.storeId;
    if (!storeId) {
      return {
        store_id: "",
        auto_publish_stories_enabled: false,
        auto_publish_feed_enabled: false,
        daily_stories_time: "08:00",
        fixed_ending_slide_url: null,
        random_layouts_enabled: true,
      };
    }

    assertStoreAccess(identity, ["owner", "admin", "manager", "editor"]);
    const supabase = getServerClient();

    const { data: row } = await supabase
      .from("editorial_social_settings")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle();

    if (!row) {
      return {
        store_id: storeId,
        instagram_account_handle: null,
        auto_publish_stories_enabled: false,
        auto_publish_feed_enabled: false,
        daily_stories_time: "08:00",
        fixed_ending_slide_url: null,
        random_layouts_enabled: true,
      };
    }

    return row as EditorialSocialSettingsDTO;
  });

export const updateEditorialSocialSettingsFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      storeId?: string;
      instagramAccountHandle?: string;
      autoPublishStoriesEnabled?: boolean;
      autoPublishFeedEnabled?: boolean;
      dailyStoriesTime?: string;
      fixedEndingSlideUrl?: string;
      randomLayoutsEnabled?: boolean;
    }) => {
      return z
        .object({
          storeId: z.string().optional(),
          instagramAccountHandle: z.string().optional(),
          autoPublishStoriesEnabled: z.boolean().optional(),
          autoPublishFeedEnabled: z.boolean().optional(),
          dailyStoriesTime: z.string().optional(),
          fixedEndingSlideUrl: z.string().optional(),
          randomLayoutsEnabled: z.boolean().optional(),
        })
        .parse(d);
    },
  )
  .handler(async ({ data }) => {
    const {
      storeId: explicitStoreId,
      instagramAccountHandle,
      autoPublishStoriesEnabled,
      autoPublishFeedEnabled,
      dailyStoriesTime,
      fixedEndingSlideUrl,
      randomLayoutsEnabled,
    } = data;

    const identity = await getServerIdentity();
    const storeId = explicitStoreId || identity.storeId;
    if (!storeId) {
      throw new Error("Loja editorial não identificada.");
    }
    assertStoreAccess(identity, ["owner", "admin", "manager", "editor"]);

    const supabase = getServerClient();
    const updates: Record<string, any> = {
      store_id: storeId,
      updated_at: new Date().toISOString(),
    };
    if (instagramAccountHandle !== undefined)
      updates.instagram_account_handle = instagramAccountHandle;
    if (autoPublishStoriesEnabled !== undefined)
      updates.auto_publish_stories_enabled = autoPublishStoriesEnabled;
    if (autoPublishFeedEnabled !== undefined)
      updates.auto_publish_feed_enabled = autoPublishFeedEnabled;
    if (dailyStoriesTime !== undefined) updates.daily_stories_time = dailyStoriesTime;
    if (fixedEndingSlideUrl !== undefined)
      updates.fixed_ending_slide_url = fixedEndingSlideUrl || null;
    if (randomLayoutsEnabled !== undefined) updates.random_layouts_enabled = randomLayoutsEnabled;

    const { data: upserted, error } = await supabase
      .from("editorial_social_settings")
      .upsert(updates)
      .select()
      .single();

    if (error) {
      console.error("[updateEditorialSocialSettingsFn] Upsert error:", error);
      throw new Error("Falha ao salvar configurações de automação social.");
    }

    return upserted as EditorialSocialSettingsDTO;
  });
