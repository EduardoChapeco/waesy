import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getCurrentIdentity } from "@/services/cart-helpers";
import {
  communitySchema,
  communityTypeSchema,
  upsertCommunitySchema,
  type Community,
  type CommunityType,
  type CommunityMember,
} from "@/types/community";
import { checkRateLimit } from "@/lib/rate-limiter";

export interface CommunityDetailDTO {
  community: Community;
  is_member: boolean;
  member_role: "owner" | "moderator" | "member" | null;
  recent_members: Array<{
    id: string;
    name: string;
    username?: string | null;
    avatar_url?: string | null;
  }>;
  posts_count: number;
}

export interface CommunityFeedResponse {
  items: Array<{
    id: string;
    community_id: string;
    author: {
      id: string;
      name: string;
      username?: string | null;
      avatar_url?: string | null;
      is_verified?: boolean;
    };
    content_text: string | null;
    media_urls: string[];
    post_type: string;
    post_attributes: Record<string, any>;
    likes_count: number;
    comments_count: number;
    user_liked: boolean;
    created_at: string;
  }>;
  hasMore: boolean;
  nextCursor: string | null;
}

// ─── 1. Obter Comunidade por Slug ──────────────────────────────────────────
export const getCommunityBySlug = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data: { slug } }): Promise<CommunityDetailDTO | null> => {
    const db = getServerClient();
    const cleanSlug = slug.replace(/^@/, "").trim().toLowerCase();

    // Identidade do usuário atual (não-bloqueante)
    let currentUserId: string | null = null;
    try {
      const identity = await getCurrentIdentity();
      currentUserId = (identity as any)?.customer_id || (identity as any)?.id || null;
    } catch {
      currentUserId = null;
    }

    const { data: communityRow, error: commError } = await db
      .from("communities")
      .select("*")
      .eq("slug", cleanSlug)
      .maybeSingle();

    if (commError || !communityRow) {
      return null;
    }

    // Status de membro do visitante
    let isMember = false;
    let memberRole: "owner" | "moderator" | "member" | null = null;

    if (currentUserId) {
      const { data: memberRow } = await db
        .from("community_members")
        .select("role, status")
        .eq("community_id", communityRow.id)
        .eq("profile_id", currentUserId)
        .maybeSingle();

      if (memberRow && memberRow.status === "active") {
        isMember = true;
        memberRole = memberRow.role as any;
      }
    }

    // Busca até 7 membros recentes para o facepile do header Threads
    const { data: membersRows } = await db
      .from("community_members")
      .select(`
        profile_id,
        profiles (
          id,
          name,
          username,
          avatar_url
        )
      `)
      .eq("community_id", communityRow.id)
      .eq("status", "active")
      .order("joined_at", { ascending: false })
      .limit(7);

    const recentMembers = (membersRows || [])
      .map((m: any) => m.profiles)
      .filter(Boolean)
      .map((p: any) => ({
        id: p.id,
        name: p.name || "Membro",
        username: p.username || null,
        avatar_url: p.avatar_url || null,
      }));

    // Contagem de publicações da comunidade
    const { count: postsCount } = await db
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("community_id", communityRow.id)
      .eq("status", "active");

    const validatedCommunity = communitySchema.parse({
      ...communityRow,
      rules: Array.isArray(communityRow.rules) ? communityRow.rules : [],
    });

    return {
      community: validatedCommunity,
      is_member: isMember,
      member_role: memberRole,
      recent_members: recentMembers,
      posts_count: postsCount || 0,
    };
  });

// ─── 2. Listar Comunidades Públicas (Diretório / Vitrine) ───────────────────
export const listCommunities = createServerFn({ method: "GET" })
  .validator(
    z.object({
      type: communityTypeSchema.optional(),
      search: z.string().optional(),
      limit: z.number().int().min(1).max(50).default(20),
      cursor: z.string().optional(),
    }).optional()
  )
  .handler(async ({ data }) => {
    const { type, search, limit = 20, cursor } = data || {};
    const db = getServerClient();

    let query = db
      .from("communities")
      .select("*")
      .eq("status", "active")
      .eq("privacy", "public")
      .order("member_count", { ascending: false })
      .limit(limit + 1);

    if (type) {
      query = query.eq("community_type", type);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`title.ilike.${term},slug.ilike.${term},description.ilike.${term}`);
    }

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("[listCommunities] Error fetching communities:", error);
      return { items: [], hasMore: false, nextCursor: null };
    }

    const hasMore = (rows || []).length > limit;
    const items = (rows || []).slice(0, limit).map((r) =>
      communitySchema.parse({
        ...r,
        rules: Array.isArray(r.rules) ? r.rules : [],
      })
    );
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at || null : null;

    return {
      items,
      hasMore,
      nextCursor,
    };
  });

// ─── 3. Criar Comunidade ───────────────────────────────────────────────────
export const createCommunity = createServerFn({ method: "POST" })
  .validator(upsertCommunitySchema)
  .handler(async ({ data: input }): Promise<Community> => {
    const db = getServerClient();
    const identity = await getCurrentIdentity();
    const userId = (identity as any)?.customer_id || (identity as any)?.id;

    if (!userId) {
      throw new Error("Faça login para criar uma comunidade.");
    }

    const rate = checkRateLimit(userId, "community_create");
    if (!rate.allowed) {
      throw new Error(`Aguarde ${rate.retryAfterSec}s para criar outra comunidade.`);
    }

    const cleanSlug = input.slug.replace(/^@/, "").toLowerCase().trim();

    // Verifica se slug já existe
    const { data: existing } = await db
      .from("communities")
      .select("id")
      .eq("slug", cleanSlug)
      .maybeSingle();

    if (existing) {
      throw new Error(`O identificador @${cleanSlug} já está em uso. Escolha outro.`);
    }

    const { data: created, error } = await db
      .from("communities")
      .insert({
        slug: cleanSlug,
        title: input.title.trim(),
        description: input.description?.trim() || "",
        community_type: input.community_type,
        cover_mode: input.cover_mode,
        cover_gradient_preset: input.cover_gradient_preset,
        cover_image_url: input.cover_image_url || null,
        avatar_url: input.avatar_url || null,
        privacy: input.privacy,
        rules: input.rules || [],
        owner_id: userId,
        member_count: 1,
        online_count: 1,
        status: "active",
      })
      .select()
      .single();

    if (error || !created) {
      console.error("[createCommunity] Error creating community:", error);
      throw new Error("Falha ao criar comunidade. Tente novamente.");
    }

    // Insere criador como membro owner
    await db.from("community_members").insert({
      community_id: created.id,
      profile_id: userId,
      role: "owner",
      status: "active",
    });

    return communitySchema.parse({
      ...created,
      rules: Array.isArray(created.rules) ? created.rules : [],
    });
  });

// ─── 4. Atualizar Comunidade ───────────────────────────────────────────────
export const updateCommunity = createServerFn({ method: "POST" })
  .validator(
    z.object({
      communityId: z.string().uuid(),
      updates: upsertCommunitySchema.partial(),
    })
  )
  .handler(async ({ data: { communityId, updates } }): Promise<Community> => {
    const db = getServerClient();
    const identity = await getCurrentIdentity();
    const userId = (identity as any)?.customer_id || (identity as any)?.id;

    if (!userId) {
      throw new Error("Acesso não autorizado.");
    }

    // Verifica se usuário é owner ou moderador
    const { data: member } = await db
      .from("community_members")
      .select("role")
      .eq("community_id", communityId)
      .eq("profile_id", userId)
      .maybeSingle();

    if (!member || !["owner", "moderator"].includes(member.role)) {
      throw new Error("Você não possui permissão de gestão nesta comunidade.");
    }

    const payload: Record<string, any> = {};
    if (updates.title) payload.title = updates.title.trim();
    if (updates.description !== undefined) payload.description = updates.description.trim();
    if (updates.community_type) payload.community_type = updates.community_type;
    if (updates.cover_mode) payload.cover_mode = updates.cover_mode;
    if (updates.cover_gradient_preset) payload.cover_gradient_preset = updates.cover_gradient_preset;
    if (updates.cover_image_url !== undefined) payload.cover_image_url = updates.cover_image_url;
    if (updates.avatar_url !== undefined) payload.avatar_url = updates.avatar_url;
    if (updates.privacy) payload.privacy = updates.privacy;
    if (updates.rules) payload.rules = updates.rules;

    const { data: updated, error } = await db
      .from("communities")
      .update(payload)
      .eq("id", communityId)
      .select()
      .single();

    if (error || !updated) {
      console.error("[updateCommunity] Error updating:", error);
      throw new Error("Falha ao salvar alterações da comunidade.");
    }

    return communitySchema.parse({
      ...updated,
      rules: Array.isArray(updated.rules) ? updated.rules : [],
    });
  });

// ─── 5. Entrar / Sair da Comunidade (Toggle Atômico) ────────────────────────
export const toggleCommunityMembership = createServerFn({ method: "POST" })
  .validator(z.object({ communityId: z.string().uuid() }))
  .handler(async ({ data: { communityId } }): Promise<{ isMember: boolean; memberCount: number }> => {
    const db = getServerClient();
    const identity = await getCurrentIdentity();
    const userId = (identity as any)?.customer_id || (identity as any)?.id;

    if (!userId) {
      throw new Error("Faça login para participar da comunidade.");
    }

    const { data: community } = await db
      .from("communities")
      .select("id, owner_id, member_count")
      .eq("id", communityId)
      .single();

    if (!community) {
      throw new Error("Comunidade não encontrada.");
    }

    const { data: existingMember } = await db
      .from("community_members")
      .select("role, status")
      .eq("community_id", communityId)
      .eq("profile_id", userId)
      .maybeSingle();

    let isMemberNow = false;
    let nextCount = community.member_count || 1;

    if (existingMember) {
      if (existingMember.role === "owner") {
        throw new Error("O proprietário não pode sair da sua própria comunidade.");
      }

      await db
        .from("community_members")
        .delete()
        .eq("community_id", communityId)
        .eq("profile_id", userId);

      nextCount = Math.max(1, nextCount - 1);
      isMemberNow = false;
    } else {
      await db.from("community_members").insert({
        community_id: communityId,
        profile_id: userId,
        role: "member",
        status: "active",
      });

      nextCount = nextCount + 1;
      isMemberNow = true;
    }

    // Atualiza contagem atômica
    await db
      .from("communities")
      .update({ member_count: nextCount })
      .eq("id", communityId);

    return {
      isMember: isMemberNow,
      memberCount: nextCount,
    };
  });

// ─── 6. Feed de Publicações da Comunidade ──────────────────────────────────
export const getCommunityFeed = createServerFn({ method: "GET" })
  .validator(
    z.object({
      communityId: z.string().uuid(),
      limit: z.number().int().min(1).max(50).default(20),
      cursor: z.string().optional(),
      templateFilter: z.string().optional(),
    })
  )
  .handler(async ({ data: { communityId, limit = 20, cursor, templateFilter } }): Promise<CommunityFeedResponse> => {
    const db = getServerClient();

    let currentUserId: string | null = null;
    try {
      const identity = await getCurrentIdentity();
      currentUserId = (identity as any)?.customer_id || (identity as any)?.id || null;
    } catch {
      currentUserId = null;
    }

    let query = db
      .from("posts")
      .select(`
        id,
        community_id,
        author_profile_id,
        content_text,
        media_urls,
        post_type,
        post_attributes,
        status,
        created_at,
        profiles (
          id,
          name,
          username,
          avatar_url,
          is_verified
        )
      `)
      .eq("community_id", communityId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(limit + 1);

    if (templateFilter && templateFilter !== "all") {
      query = query.eq("post_type", templateFilter);
    }

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data: postsRows, error } = await query;
    if (error) {
      console.error("[getCommunityFeed] Error:", error);
      return { items: [], hasMore: false, nextCursor: null };
    }

    const rows = postsRows || [];
    const hasMore = rows.length > limit;
    const itemsToProcess = rows.slice(0, limit);

    // Mapeamento de curtidas do usuário atual
    const postIds = itemsToProcess.map((p) => p.id);
    let likedPostIds = new Set<string>();

    if (currentUserId && postIds.length > 0) {
      const { data: userLikes } = await db
        .from("post_likes")
        .select("post_id")
        .eq("profile_id", currentUserId)
        .in("post_id", postIds);

      if (userLikes) {
        likedPostIds = new Set(userLikes.map((l) => l.post_id));
      }
    }

    // Contagem de curtidas e comentários
    const items = await Promise.all(
      itemsToProcess.map(async (row: any) => {
        const { count: likesCount } = await db
          .from("post_likes")
          .select("post_id", { count: "exact", head: true })
          .eq("post_id", row.id);

        const { count: commentsCount } = await db
          .from("post_comments")
          .select("id", { count: "exact", head: true })
          .eq("post_id", row.id)
          .eq("status", "active");

        const authorProfile = row.profiles || {};

        return {
          id: row.id,
          community_id: row.community_id,
          author: {
            id: row.author_profile_id,
            name: authorProfile.name || "Membro",
            username: authorProfile.username || null,
            avatar_url: authorProfile.avatar_url || null,
            is_verified: Boolean(authorProfile.is_verified),
          },
          content_text: row.content_text,
          media_urls: row.media_urls || [],
          post_type: row.post_type || "simple",
          post_attributes: (row.post_attributes as Record<string, any>) || {},
          likes_count: likesCount || 0,
          comments_count: commentsCount || 0,
          user_liked: likedPostIds.has(row.id),
          created_at: row.created_at,
        };
      })
    );

    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].created_at : null;

    return {
      items,
      hasMore,
      nextCursor,
    };
  });

// ─── 7. Publicar Post na Comunidade ────────────────────────────────────────
export const createCommunityPost = createServerFn({ method: "POST" })
  .validator(
    z.object({
      communityId: z.string().uuid(),
      content_text: z.string().nullable().optional(),
      media_urls: z.array(z.string().url()).max(10).default([]),
      post_type: z.enum(["simple", "sale", "news", "video", "event", "job"]).default("simple"),
      post_attributes: z.record(z.any()).default({}),
    })
  )
  .handler(async ({ data: { communityId, content_text, media_urls, post_type, post_attributes } }) => {
    const db = getServerClient();
    const identity = await getCurrentIdentity();
    const userId = (identity as any)?.customer_id || (identity as any)?.id;

    if (!userId) {
      throw new Error("Faça login para publicar nesta comunidade.");
    }

    const rate = checkRateLimit(userId, "community_post");
    if (!rate.allowed) {
      throw new Error(`Aguarde ${rate.retryAfterSec}s para publicar novamente.`);
    }

    // Verifica se a comunidade existe e se é pública ou se o usuário é membro
    const { data: community } = await db
      .from("communities")
      .select("id, privacy")
      .eq("id", communityId)
      .eq("status", "active")
      .single();

    if (!community) {
      throw new Error("Comunidade não encontrada ou inativa.");
    }

    if (community.privacy !== "public") {
      const { data: member } = await db
        .from("community_members")
        .select("status")
        .eq("community_id", communityId)
        .eq("profile_id", userId)
        .maybeSingle();

      if (!member || member.status !== "active") {
        throw new Error("Apenas membros autorizados podem publicar nesta comunidade privada.");
      }
    }

    const { data: createdPost, error } = await db
      .from("posts")
      .insert({
        community_id: communityId,
        author_profile_id: userId,
        content_text: content_text?.trim() || null,
        media_urls: media_urls || [],
        post_type: post_type,
        post_attributes: post_attributes || {},
        status: "active",
      })
      .select()
      .single();

    if (error || !createdPost) {
      console.error("[createCommunityPost] Error:", error);
      throw new Error("Falha ao criar publicação na comunidade.");
    }

    return createdPost;
  });
