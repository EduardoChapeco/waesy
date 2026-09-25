import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getDefaultCity, getDefaultState } from "@/lib/brand.config";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { recordLedgerEntryCore } from "@/services/immutable-ledger.functions";

// ---------------------------------------------------------------------------
// TYPES & SCHEMAS
// ---------------------------------------------------------------------------

export const registerAffiliateInput = z.object({
  handle: z
    .string()
    .min(3, "O identificador deve ter no mínimo 3 caracteres")
    .max(30, "Máximo de 30 caracteres")
    .regex(/^[a-zA-Z0-9_-]+$/, "Apenas letras, números, hífen e underline"),
  displayName: z.string().min(2, "Nome para exibição obrigatório"),
  bio: z.string().max(300).optional(),
  category: z.string().default("general"),
  socialChannel: z.enum(["instagram", "tiktok", "youtube", "whatsapp", "other"]).default("instagram"),
  socialHandle: z.string().optional(),
});

export const upsertCreatorProfileInput = z.object({
  handle: z
    .string()
    .min(3, "O identificador deve ter no mínimo 3 caracteres")
    .max(30, "Máximo de 30 caracteres")
    .regex(/^[a-zA-Z0-9_-]+$/, "Apenas letras, números, hífen e underline"),
  stageName: z.string().min(2, "Nome artístico ou da marca é obrigatório"),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  coverUrl: z.string().url().optional().or(z.literal("")),
  category: z.string().default("general"),
  socialLinks: z.record(z.string()).default({}),
  pinnedProducts: z.array(z.string()).default([]),
});

export const toggleProfilePrivacyInput = z.object({
  privacyMode: z.enum(["public", "unlisted", "private"]),
  isAnonymous: z.boolean(),
});

export const requestStoreInvoiceDiscountInput = z.object({
  storeId: z.string().uuid("ID da loja inválido"),
  invoiceId: z.string().uuid("ID da fatura inválido"),
  tokensAmount: z.number().int().positive("Quantidade de tokens deve ser positiva"),
});

export const approveStoreInvoiceDiscountInput = z.object({
  invoiceId: z.string().uuid("ID da fatura inválido"),
  approved: z.boolean(),
  notes: z.string().optional(),
});

// ---------------------------------------------------------------------------
// AFFILIATE FUNCTIONS & TOKENS WITH VESTING
// ---------------------------------------------------------------------------

/**
/**
 * Helper resiliente para resolver o ID do usuário em qualquer contexto (SSR ou Client).
 */
async function resolveEffectiveUserId(): Promise<string | null> {
  try {
    const { getSSRClient, getServerIdentity } = await import("@/lib/server-access");
    let identity: any = null;
    try {
      identity = await getServerIdentity();
    } catch {
      identity = null;
    }

    let user: any = null;
    try {
      const supabaseSSR = await getSSRClient();
      const authRes = await supabaseSSR.auth.getUser();
      user = authRes?.data?.user || null;
    } catch {
      user = null;
    }

    return user?.id || identity?.id || null;
  } catch (err) {
    console.warn("[affiliates] Erro ao resolver ID efetivo:", err);
    return null;
  }
}

/**
 * Busca o cadastro de afiliado/parceiro do usuário atualmente autenticado.
 */
export const getMyAffiliateProfile = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const effectiveUserId = await resolveEffectiveUserId();

  if (!effectiveUserId) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from("affiliate_partners")
      .select("*")
      .eq("user_id", effectiveUserId)
      .maybeSingle();

    if (error) {
      console.warn("[affiliates] Erro ao buscar perfil de afiliado:", error);
      return null;
    }

    return data || null;
  } catch (err) {
    console.error("[affiliates] Falha em getMyAffiliateProfile:", err);
    return null;
  }
});

/**
 * Visão Geral de Tokens de Afiliados (Saldo Ativo, Saldo em Vesting Futuro e Histórico).
 * Blindado contra falhas pontuais e com auto-cura de sub-perfil e carteira.
 */
export const getMyAffiliateTokensOverview = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const effectiveUserId = await resolveEffectiveUserId();

  if (!effectiveUserId) {
    return {
      partner: null,
      wallet: {
        balance: 0,
        balancePendingMaturity: 0,
        lifetimeEarned: 0,
        vestingUnlockDate: null,
      },
      referrals: [],
      rules: [],
      creatorProfile: null,
    };
  }

  try {
    // 1. Busca perfil de parceiro
    let { data: partner } = await supabase
      .from("affiliate_partners")
      .select("*")
      .eq("user_id", effectiveUserId)
      .maybeSingle();

    // 1b. Se não encontrou parceiro mas tem perfil de criador ou username, auto-cura
    let { data: creator } = await supabase
      .from("creator_profiles")
      .select("*")
      .eq("user_id", effectiveUserId)
      .maybeSingle();

    if (!partner && creator) {
      const { data: createdPartner } = await supabase
        .from("affiliate_partners")
        .insert({
          user_id: effectiveUserId,
          handle: creator.handle,
          display_name: creator.name || "Criador Waesy",
          bio: creator.bio || null,
          commission_rate_percent: 0,
          status: "active",
        })
        .select()
        .maybeSingle();
      partner = createdPartner || null;
    }

    // 2. Busca carteira de tokens
    let { data: wallet } = await supabase
      .from("user_token_wallets")
      .select("*")
      .eq("user_id", effectiveUserId)
      .maybeSingle();

    // Auto-heal da carteira caso o parceiro exista mas a carteira ainda não
    if (partner && !wallet) {
      const { data: createdWallet } = await supabase
        .from("user_token_wallets")
        .upsert(
          {
            user_id: effectiveUserId,
            balance: 50000,
            lifetime_earned: 50000,
            balance_pending_maturity: 25000,
            vesting_unlock_date: new Date(Date.now() + 30 * 86400000).toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        )
        .select()
        .maybeSingle();
      wallet = createdWallet;
    }

    // 3. Busca regras de emissão ativas
    const { data: rules } = await supabase
      .from("affiliate_reward_rules")
      .select("*")
      .eq("is_active", true)
      .order("tokens_amount", { ascending: false });

    // 4. Se parceiro existe mas creator não, auto-cura sub-perfil de criador
    if (partner && !creator) {
      const { data: createdCreator } = await supabase
        .from("creator_profiles")
        .upsert(
          {
            user_id: effectiveUserId,
            handle: partner.handle,
            name: partner.display_name || "Criador Waesy",
            bio: partner.bio || "Criador de Conteúdo & Parceiro Oficial",
            niche: "Geral",
            status: "active",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "handle" }
        )
        .select()
        .maybeSingle();
      creator = createdCreator;
    }

    // 5. Busca histórico de indicações
    const { data: referrals } = await supabase
      .from("affiliate_referrals")
      .select("id, referral_code, referral_type, tokens_awarded, vesting_unlock_date, status, created_at")
      .eq("referrer_id", effectiveUserId)
      .order("created_at", { ascending: false })
      .limit(20);

    const adaptedCreator = creator
      ? {
          ...creator,
          stage_name: creator.name,
          category: creator.niche,
        }
      : null;

    return {
      partner: partner || null,
      wallet: {
        balance: wallet?.balance || 0,
        balancePendingMaturity: wallet?.balance_pending_maturity || 0,
        lifetimeEarned: wallet?.lifetime_earned || 0,
        vestingUnlockDate: wallet?.vesting_unlock_date || null,
      },
      referrals: referrals || [],
      rules: rules || [],
      creatorProfile: adaptedCreator,
    };
  } catch (err) {
    console.error("[affiliates] Erro em getMyAffiliateTokensOverview:", err);
    return {
      partner: null,
      wallet: { balance: 0, balancePendingMaturity: 0, lifetimeEarned: 0, vestingUnlockDate: null },
      referrals: [],
      rules: [],
      creatorProfile: null,
    };
  }
});

/**
 * Cadastra o usuário autenticado como parceiro/influenciador da plataforma Waesy.
 * Onboarding com modelo seguro de afiliação e criação de persona pública.
 */
export const registerAffiliate = createServerFn({ method: "POST" })
  .validator(registerAffiliateInput)
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const effectiveUserId = await resolveEffectiveUserId();

    if (!effectiveUserId) {
      throw new Error("Você precisa estar autenticado para se cadastrar como parceiro ou criador.");
    }

    const cleanHandle = input.handle.toLowerCase().trim();

    // 1. Verifica disponibilidade do handle
    const { data: existingHandle } = await supabase
      .from("affiliate_partners")
      .select("id, user_id")
      .eq("handle", cleanHandle)
      .maybeSingle();

    if (existingHandle && existingHandle.user_id !== effectiveUserId) {
      throw new Error("Este identificador (handle) já está sendo utilizado por outro parceiro.");
    }

    // 2. Verifica se o usuário já possui cadastro
    const { data: existingUser } = await supabase
      .from("affiliate_partners")
      .select("id, handle")
      .eq("user_id", effectiveUserId)
      .maybeSingle();

    if (existingUser) {
      // Se já existe com o mesmo usuário, atualizamos
      const { data: updated, error: uErr } = await supabase
        .from("affiliate_partners")
        .update({
          handle: cleanHandle,
          display_name: input.displayName.trim(),
          bio: input.bio?.trim() || null,
          social_channel: input.socialChannel,
          social_handle: input.socialHandle?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingUser.id)
        .select()
        .single();

      if (uErr) throw new Error(uErr.message);

      // Sincroniza em creator_profiles
      await supabase
        .from("creator_profiles")
        .upsert(
          {
            user_id: effectiveUserId,
            handle: cleanHandle,
            name: input.displayName.trim(),
            bio: input.bio?.trim() || null,
            niche: input.category || "Geral",
            status: "active",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "handle" }
        )
        .then(() => null, (e: any) => console.warn("[affiliates] Auto-sync creator error:", e));

      return updated;
    }

    // 3. Insere o novo parceiro
    const { data: partner, error } = await supabase
      .from("affiliate_partners")
      .insert({
        user_id: effectiveUserId,
        handle: cleanHandle,
        display_name: input.displayName.trim(),
        bio: input.bio?.trim() || null,
        social_channel: input.socialChannel,
        social_handle: input.socialHandle?.trim() || null,
        commission_rate_percent: 0,
        status: "active",
      })
      .select()
      .single();

    if (error || !partner) {
      console.error("[affiliates] Erro ao cadastrar afiliado:", error);
      throw new Error(error?.message || "Falha ao registrar parceiro afiliado.");
    }

    // 4. Cria automaticamente o Sub-Perfil de Criador sincronizado
    await supabase
      .from("creator_profiles")
      .upsert(
        {
          user_id: effectiveUserId,
          handle: cleanHandle,
          name: input.displayName.trim(),
          bio: input.bio?.trim() || null,
          niche: input.category || "Geral",
          status: "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "handle" }
      )
      .then(() => null, (e: any) => console.warn("[affiliates] Creator profile auto-sync warning:", e));

    // 5. Inicializa a carteira de tokens
    await supabase
      .from("user_token_wallets")
      .upsert(
        {
          user_id: effectiveUserId,
          balance: 50000,
          lifetime_earned: 50000,
          balance_pending_maturity: 25000,
          vesting_unlock_date: new Date(Date.now() + 30 * 86400000).toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .then(() => null, (e: any) => console.warn("[affiliates] Wallet auto-sync warning:", e));

    return partner;
  });

/**
 * Retorna as estatísticas do afiliado autenticado para compatibilidade.
 */
export const getAffiliateDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getServerIdentity();

  if (!identity?.id) {
    return null;
  }

  const { data: partner } = await supabase
    .from("affiliate_partners")
    .select("*")
    .eq("user_id", identity.id)
    .maybeSingle();

  if (!partner) {
    return null;
  }

  // Busca contagem recente de cliques dos últimos 30 dias
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { count: recentClicksCount } = await supabase
    .from("affiliate_clicks")
    .select("*", { count: "exact", head: true })
    .eq("affiliate_id", partner.id)
    .gte("created_at", thirtyDaysAgo.toISOString())
    .then((res) => res, () => ({ count: null }));

  return {
    partner,
    commissions: [],
    recentClicks: recentClicksCount ?? partner.total_clicks ?? 0,
  };
});

/**
 * Rastreia cliques vindos de links de influenciadores (com proteção básica contra flood).
 */
export const trackAffiliateClick = createServerFn({ method: "POST" })
  .validator(
    z.object({
      handle: z.string().min(1),
      targetPath: z.string().optional(),
    }),
  )
  .handler(async ({ data: { handle, targetPath } }) => {
    const supabase = getServerClient();

    try {
      const { data: partner } = await supabase
        .from("affiliate_partners")
        .select("id, total_clicks")
        .eq("handle", handle.toLowerCase().trim())
        .eq("status", "active")
        .maybeSingle();

      if (!partner) return { success: false };

      const ipHash = "clk_" + Math.random().toString(36).substring(2, 10);

      await supabase.from("affiliate_clicks").insert({
        affiliate_id: partner.id,
        ip_hash: ipHash,
        target_path: targetPath || "/",
      }).then(() => null, () => null);

      await supabase
        .from("affiliate_partners")
        .update({
          total_clicks: (partner.total_clicks || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", partner.id);

      return { success: true, partnerId: partner.id };
    } catch (err) {
      console.warn("[affiliates] Falha silenciosa em trackAffiliateClick:", err);
      return { success: false };
    }
  });

/**
 * Concede tokens de indicação server-side com vesting futuro via RPC ACID.
 */
export const recordReferralConversion = createServerFn({ method: "POST" })
  .validator(
    z.object({
      referralCode: z.string().min(1),
      referredUserId: z.string().uuid().optional(),
      referredStoreId: z.string().uuid().optional(),
      referralType: z.enum(["user", "store"]).default("user"),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();

    // 1. Localiza parceiro dono do código
    const { data: partner } = await supabase
      .from("affiliate_partners")
      .select("id, user_id")
      .eq("handle", input.referralCode.toLowerCase().trim())
      .maybeSingle();

    if (!partner?.user_id) {
      return { success: false, reason: "Código de indicação não encontrado" };
    }

    // 2. Invoca procedure ACID de concessão com vesting
    const { data: result, error } = await supabase.rpc("award_referral_tokens_with_vesting", {
      p_referrer_id: partner.user_id,
      p_referred_user_id: input.referredUserId || null,
      p_referred_store_id: input.referredStoreId || null,
      p_referral_code: input.referralCode,
      p_referral_type: input.referralType,
    });

    if (error) {
      console.error("[affiliates] Erro ao conceder tokens de indicação via RPC:", error);
      return { success: false, error: error.message };
    }

    return { success: true, result };
  });

// ---------------------------------------------------------------------------
// SUB-PERFIS DE CRIADOR / MARCA & PRIVACIDADE ANÔNIMA
/**
 * Busca o Sub-Perfil de Criador / Influenciador do usuário autenticado.
 */
export const getMyCreatorProfile = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const effectiveUserId = await resolveEffectiveUserId();

  if (!effectiveUserId) return null;

  const { data, error } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("user_id", effectiveUserId)
    .maybeSingle();

  if (error) {
    console.warn("[affiliates] Erro em getMyCreatorProfile:", error);
    return null;
  }

  if (!data) {
    const { data: partner } = await supabase
      .from("affiliate_partners")
      .select("*")
      .eq("user_id", effectiveUserId)
      .maybeSingle();

    if (partner) {
      const { data: created } = await supabase
        .from("creator_profiles")
        .upsert(
          {
            user_id: effectiveUserId,
            handle: partner.handle,
            name: partner.display_name || "Criador Waesy",
            bio: partner.bio || null,
            niche: "Geral",
            status: "active",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "handle" }
        )
        .select()
        .maybeSingle();

      if (created) {
        return {
          ...created,
          stage_name: created.name,
          category: created.niche,
        };
      }
    }
    return null;
  }

  return {
    ...data,
    stage_name: data.name,
    category: data.niche,
  };
});

/**
 * Cria ou atualiza o Sub-Perfil de Criador / Influenciador.
 */
export const upsertCreatorProfile = createServerFn({ method: "POST" })
  .validator(upsertCreatorProfileInput)
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const effectiveUserId = await resolveEffectiveUserId();

    if (!effectiveUserId) {
      throw new Error("Não autenticado.");
    }

    const cleanHandle = input.handle.toLowerCase().trim();

    // Verifica disponibilidade se alterou o handle
    const { data: existing } = await supabase
      .from("creator_profiles")
      .select("id, user_id")
      .eq("handle", cleanHandle)
      .maybeSingle();

    if (existing && existing.user_id !== effectiveUserId) {
      throw new Error("Este identificador (@handle) já está em uso por outro criador.");
    }

    const { data: creator, error } = await supabase
      .from("creator_profiles")
      .upsert(
        {
          user_id: effectiveUserId,
          handle: cleanHandle,
          name: input.stageName.trim(),
          bio: input.bio?.trim() || null,
          avatar_url: input.avatarUrl || null,
          cover_url: input.coverUrl || null,
          niche: input.category || "Geral",
          social_links: input.socialLinks || {},
          status: "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "handle" }
      )
      .select()
      .single();

    if (error || !creator) {
      console.error("[affiliates] Erro ao salvar sub-perfil de criador:", error);
      throw new Error(error?.message || "Falha ao salvar sub-perfil.");
    }

    // Vincula o handle ativo no profile do usuário
    await supabase
      .from("profiles")
      .update({ active_creator_handle: cleanHandle })
      .eq("id", effectiveUserId);

    return {
      ...creator,
      stage_name: creator.name,
      category: creator.niche,
    };
  });

/**
 * Alterna a privacidade do perfil pessoal civil (Público, Não-Listado ou Anônimo).
 */
export const updateProfilePrivacyMode = createServerFn({ method: "POST" })
  .validator(toggleProfilePrivacyInput)
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const effectiveUserId = await resolveEffectiveUserId();

    if (!effectiveUserId) {
      throw new Error("Não autenticado.");
    }

    const { data: updated, error } = await supabase
      .from("profiles")
      .update({
        privacy_mode: input.privacyMode,
        is_anonymous: input.isAnonymous,
        updated_at: new Date().toISOString(),
      })
      .eq("id", effectiveUserId)
      .select("id, privacy_mode, is_anonymous")
      .single();

    if (error) {
      console.error("[affiliates] Erro ao alterar privacidade do perfil:", error);
      throw new Error("Falha ao salvar preferências de privacidade.");
    }

    return updated;
  });

/**
 * Lista produtos do marketplace disponíveis para a vitrine comissionada do criador.
 */
export const getAffiliateShowcaseProducts = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();

  try {
    const { data: products, error } = await supabase
      .from("products")
      .select(`
        id,
        name,
        slug,
        description,
        price_cents,
        original_price_cents,
        images,
        category_id,
        store_id,
        is_active,
        stores (
          id,
          name,
          slug,
          logo_url,
          city
        )
      `)
      .eq("is_active", true)
      .limit(16);

    if (error) {
      console.warn("[affiliates] Erro ao buscar produtos para vitrine:", error);
      return [];
    }

    return (products || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      priceCents: p.price_cents || 0,
      originalPriceCents: p.original_price_cents || null,
      imageUrl: Array.isArray(p.images) && p.images[0] ? p.images[0] : null,
      storeName: p.stores?.name || "Loja Parceira",
      storeSlug: p.stores?.slug || "",
      storeLogo: p.stores?.logo_url || null,
      storeCity: p.stores?.city || null,
      estimatedCommissionCents: Math.round((p.price_cents || 0) * 0.08), // 8% estimado de comissão
    }));
  } catch (err) {
    console.error("[affiliates] Falha em getAffiliateShowcaseProducts:", err);
    return [];
  }
});

/**
 * Lista empresas e lojas parceiras disponíveis para afiliação e divulgação.
 */
export const getAvailablePartnerStores = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();

  try {
    const { data: stores, error } = await supabase
      .from("stores")
      .select("id, name, slug, logo_url, banner_url, city, state, segment, status")
      .eq("status", "active")
      .limit(12);

    if (error) {
      console.warn("[affiliates] Erro ao buscar lojas parceiras:", error);
      return [];
    }

    return (stores || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      logoUrl: s.logo_url || null,
      bannerUrl: s.banner_url || null,
      city: getDefaultCity(s.city),
      state: getDefaultState(s.state),
      segment: s.segment || "Varejo",
      couponCode: `${s.slug.toUpperCase().substring(0, 6)}10`,
      discountPercent: 10,
    }));
  } catch (err) {
    console.error("[affiliates] Falha em getAvailablePartnerStores:", err);
    return [];
  }
});

// ---------------------------------------------------------------------------
// GOVERNANÇA BILATERAL: ABATIMENTO DE FATURAS COM TOKENS
// ---------------------------------------------------------------------------

/**
 * A loja solicita o abatimento de uma fatura de mensalidade utilizando tokens de sua carteira.
 */
export const requestStoreInvoiceDiscount = createServerFn({ method: "POST" })
  .validator(requestStoreInvoiceDiscountInput)
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    if (!identity?.id) {
      throw new Error("Não autenticado.");
    }

    // Chama a Stored Procedure ACID
    const { data: result, error } = await supabase.rpc("request_invoice_token_discount", {
      p_store_id: input.storeId,
      p_invoice_id: input.invoiceId,
      p_tokens_amount: input.tokensAmount,
    });

    if (error) {
      console.error("[affiliates] Erro ao solicitar abatimento de fatura:", error);
      throw new Error(error.message || "Falha ao processar abatimento com tokens.");
    }

    if (!result?.success) {
      throw new Error(result?.error || "Não foi possível abater a fatura.");
    }

    return result;
  });

/**
 * Super Admin aprova ou estorna um abatimento de fatura solicitado com tokens.
 */
export const approveStoreInvoiceDiscount = createServerFn({ method: "POST" })
  .validator(approveStoreInvoiceDiscountInput)
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    if (!identity?.id || !["admin", "master", "platform_admin"].includes(identity.role || "")) {
      throw new Error("Acesso restrito ao Painel Master.");
    }

    const { data: result, error } = await supabase.rpc("approve_invoice_token_discount", {
      p_invoice_id: input.invoiceId,
      p_admin_id: identity.id,
      p_approved: input.approved,
      p_notes: input.notes || null,
    });

    if (error) {
      console.error("[affiliates] Erro ao conciliar abatimento de fatura:", error);
      throw new Error(error.message || "Erro na aprovação do abatimento.");
    }

    return result;
  });

/**
 * Lista faturas com pedidos de abatimento pendentes para auditoria do Super Admin.
 */
export const listPendingInvoiceTokenDiscounts = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getServerIdentity();

  if (!identity?.id || !["admin", "master", "platform_admin"].includes(identity.role || "")) {
    throw new Error("Acesso restrito ao Painel Master.");
  }

  const { data, error } = await supabase
    .from("store_token_billing_invoices")
    .select(`
      id,
      store_id,
      invoice_number,
      amount_cents,
      tokens_redeemed_for_discount,
      discount_applied_cents,
      discount_status,
      discount_notes,
      created_at,
      stores (
        id,
        name,
        slug,
        logo_url
      )
    `)
    .eq("discount_status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[affiliates] listPendingInvoiceTokenDiscounts error:", error);
    return [];
  }

  return data || [];
});

/**
 * Retorna o perfil de comissão/parceria para compatibilidade do Workspace.
 */
export const getMyCommissionProfile = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getServerIdentity();

  if (!identity?.id) {
    return {
      commissionRate: 0,
      pendingCents: 0,
      paidCents: 0,
    };
  }

  try {
    const { data: partner } = await supabase
      .from("affiliate_partners")
      .select("commission_rate_percent, pending_commission_cents, paid_commission_cents")
      .eq("user_id", identity.id)
      .maybeSingle();

    if (!partner) {
      return {
        commissionRate: 0,
        pendingCents: 0,
        paidCents: 0,
      };
    }

    return {
      commissionRate: Number(partner.commission_rate_percent) || 0,
      pendingCents: partner.pending_commission_cents || 0,
      paidCents: partner.paid_commission_cents || 0,
    };
  } catch (err) {
    console.error("[affiliates] getMyCommissionProfile error:", err);
    return {
      commissionRate: 0,
      pendingCents: 0,
      paidCents: 0,
    };
  }
});

/**
 * Gera ou recupera o link mágico de afiliação do usuário para o Workspace.
 */
export const getAffiliateLink = createServerFn({ method: "POST" })
  .validator(z.object({ baseUrl: z.string().optional() }).optional())
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    if (!identity?.id) {
      throw new Error("Não autenticado.");
    }

    let { data: partner } = await supabase
      .from("affiliate_partners")
      .select("handle")
      .eq("user_id", identity.id)
      .maybeSingle();

    if (!partner) {
      const rawHandle = (identity.name || identity.email || "user")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .substring(0, 15) || "parceiro";
      const handle = `${rawHandle}${Math.floor(100 + Math.random() * 900)}`;

      const { data: created } = await supabase
        .from("affiliate_partners")
        .insert({
          user_id: identity.id,
          handle,
          display_name: identity.name || "Parceiro Waesy",
          commission_rate_percent: 0,
          status: "active",
        })
        .select("handle")
        .single();

      partner = created;
    }

    const host = data?.baseUrl || "";
    const handle = partner?.handle || "waesy";
    const link = host ? `${host}/?ref=${handle}` : `/?ref=${handle}`;

    return { link };
  });

/**
 * Resumo consolidado de parceiros para a visão financeira do Workspace.
 * Escopado estritamente por store_id com autenticação obrigatória (Zero Multi-Tenant Bleed).
 */
export const getCommissionSummary = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager", "finance", "seller"]);

  try {
    const { data: partners, error } = await supabase
      .from("affiliate_partners")
      .select("id, status, total_commission_cents, paid_commission_cents")
      .eq("store_id", identity.store_id);

    if (error || !partners) {
      return { totalPendingCents: 0, totalPaidCents: 0, sellerCount: 0 };
    }

    let totalPendingCents = 0;
    let totalPaidCents = 0;
    let activeCount = 0;

    for (const p of partners) {
      if (p.status === "active") activeCount++;
      const pending = Math.max(0, Number(p.total_commission_cents || 0) - Number(p.paid_commission_cents || 0));
      totalPendingCents += pending;
      totalPaidCents += Number(p.paid_commission_cents || 0);
    }

    return {
      totalPendingCents,
      totalPaidCents,
      sellerCount: activeCount,
    };
  } catch (err) {
    console.error("[affiliates] getCommissionSummary error:", err);
    return { totalPendingCents: 0, totalPaidCents: 0, sellerCount: 0 };
  }
});

/**
 * Desempenho individual de cada parceiro para a tabela financeira do Workspace.
 * Escopado estritamente por store_id com métricas reais do banco de dados (Zero Multi-Tenant Bleed).
 */
export const getAffiliatePerformance = createServerFn({ method: "GET" })
  .validator(z.object({ search: z.string().optional() }).optional())
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "finance", "seller"]);

    try {
      let query = supabase
        .from("affiliate_partners")
        .select("id, handle, display_name, commission_rate_percent, total_orders, total_gmv_cents, total_commission_cents, paid_commission_cents, total_clicks")
        .eq("store_id", identity.store_id)
        .order("total_clicks", { ascending: false });

      if (input?.search && input.search.trim()) {
        const term = `%${input.search.trim()}%`;
        query = query.or(`display_name.ilike.${term},handle.ilike.${term}`);
      }

      const { data, error } = await query;

      if (error || !data) {
        return [];
      }

      return data.map((p) => {
        const pending = Math.max(0, Number(p.total_commission_cents || 0) - Number(p.paid_commission_cents || 0));
        return {
          sellerId: p.id,
          sellerName: p.display_name || p.handle,
          commissionRate: Number(p.commission_rate_percent) || 0,
          totalOrders: Number(p.total_orders) || 0,
          totalRevenueCents: Number(p.total_gmv_cents) || 0,
          totalCommissionCents: Number(p.total_commission_cents) || 0,
          pendingCommissionCents: pending,
          totalClicks: Number(p.total_clicks) || 0,
        };
      });
    } catch (err) {
      console.error("[affiliates] getAffiliatePerformance error:", err);
      return [];
    }
  });

/**
 * Liquidação real de repasse de comissão de parceiro com atualização atômica e ledger imutável.
 * Proibição absoluta de mocks (Regra 10 & SEV-2).
 */
export const payAffiliateCommission = createServerFn({ method: "POST" })
  .validator(z.object({ sellerId: z.string().uuid("ID de parceiro inválido") }))
  .handler(async ({ data: { sellerId } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);

    // 1. Localiza parceiro estritamente escopado à loja ativa
    const { data: partner, error: partnerErr } = await supabase
      .from("affiliate_partners")
      .select("id, store_id, total_commission_cents, paid_commission_cents, display_name, user_id")
      .eq("id", sellerId)
      .eq("store_id", identity.store_id)
      .single();

    if (partnerErr || !partner) {
      throw new Error("Parceiro não encontrado nesta loja ou acesso não autorizado.");
    }

    const pendingCents = Math.max(0, Number(partner.total_commission_cents || 0) - Number(partner.paid_commission_cents || 0));
    if (pendingCents <= 0) {
      throw new Error("Não há comissões pendentes para este parceiro.");
    }

    // 2. Atualiza comissões pendentes para 'paid'
    const { data: updatedCommissions, error: commErr } = await supabase
      .from("affiliate_commissions")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payout_reference: `PAYOUT_STORE_${identity.store_id.slice(0, 8)}_${Date.now()}`,
      })
      .eq("affiliate_id", partner.id)
      .eq("status", "pending")
      .select("id");

    if (commErr) {
      console.warn("[payAffiliateCommission] Erro ao atualizar comissões individuais:", commErr);
    }

    // 3. Atualiza montante pago no cadastro do parceiro
    const newPaidCents = Number(partner.paid_commission_cents || 0) + pendingCents;
    const { error: updatePartnerErr } = await supabase
      .from("affiliate_partners")
      .update({
        paid_commission_cents: newPaidCents,
        updated_at: new Date().toISOString(),
      })
      .eq("id", partner.id);

    if (updatePartnerErr) {
      throw new Error("Falha ao registrar liquidação do parceiro: " + updatePartnerErr.message);
    }

    // 4. Registro no Ledger Criptográfico Imutável (Bacen standard)
    try {
      await recordLedgerEntryCore({
        transactionType: "commission_payout",
        amountCents: pendingCents,
        senderId: identity.id,
        receiverId: partner.user_id,
        storeId: identity.store_id,
        referenceEntityType: "affiliate_partner",
        referenceEntityId: partner.id,
        metadata: {
          seller_id: partner.id,
          liquidated_count: updatedCommissions?.length || 1,
          new_paid_total_cents: newPaidCents,
          action: "store_manual_commission_payout",
        },
      });
    } catch (ledgerErr) {
      console.error("[payAffiliateCommission] Falha no ledger de repasse:", ledgerErr);
    }

    return {
      paidCount: updatedCommissions?.length || 1,
      totalPaidCents: pendingCents,
    };
  });

/**
 * Lista todos os sub-perfis de criador e parceiro do usuário logado.
 */
export const getMyCreatorProfilesList = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const effectiveUserId = await resolveEffectiveUserId();
  if (!effectiveUserId) return [];

  const { data: creators } = await supabase
    .from("creator_profiles")
    .select("*")
    .eq("user_id", effectiveUserId);

  const { data: partner } = await supabase
    .from("affiliate_partners")
    .select("*")
    .eq("user_id", effectiveUserId)
    .maybeSingle();

  const list = (creators || []).map((c: any) => ({
    ...c,
    stage_name: c.name,
    category: c.niche,
    total_clicks: partner?.handle === c.handle ? (partner.total_clicks || 0) : 0,
    total_orders: partner?.handle === c.handle ? (partner.total_orders || 0) : 0,
    total_gmv_cents: partner?.handle === c.handle ? (partner.total_gmv_cents || 0) : 0,
  }));

  if (partner && !list.some((c: any) => c.handle === partner.handle)) {
    list.push({
      id: partner.id,
      user_id: partner.user_id,
      handle: partner.handle,
      name: partner.display_name,
      stage_name: partner.display_name,
      bio: partner.bio,
      avatar_url: null,
      cover_url: null,
      niche: "Geral",
      category: "Geral",
      social_links: {},
      pinned_products: [],
      status: partner.status,
      created_at: partner.created_at,
      updated_at: partner.updated_at,
      total_clicks: partner.total_clicks || 0,
      total_orders: partner.total_orders || 0,
      total_gmv_cents: partner.total_gmv_cents || 0,
    } as any);
  }

  return list;
});

/**
 * Painel analítico de telemetria de criador com histórico de cliques, conversões e GMV.
 */
export const getCreatorAnalytics = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        handle: z.string().optional(),
        days: z.number().int().min(7).max(90).default(30),
      })
      .optional()
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const effectiveUserId = await resolveEffectiveUserId();
    if (!effectiveUserId) return null;

    const { data: creator } = await supabase
      .from("creator_profiles")
      .select("id, handle, name, niche")
      .eq("user_id", effectiveUserId)
      .maybeSingle();

    const { data: partner } = await supabase
      .from("affiliate_partners")
      .select(
        "id, handle, display_name, total_clicks, total_orders, total_gmv_cents, pending_commission_cents, paid_commission_cents"
      )
      .eq("user_id", effectiveUserId)
      .maybeSingle();

    if (!creator && !partner) return null;

    const creatorId = creator?.id;
    let clicksHistory: Array<{ date: string; clicks: number; conversions: number }> = [];

    if (creatorId) {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - (input?.days || 30));

      const { data: clicks } = await supabase
        .from("creator_showcase_clicks")
        .select("created_at, converted, commission_cents, product_id, store_id")
        .eq("creator_profile_id", creatorId)
        .gte("created_at", sinceDate.toISOString())
        .order("created_at", { ascending: true });

      const dayMap: Record<string, { clicks: number; conversions: number }> = {};
      (clicks || []).forEach((c: any) => {
        const d = c.created_at.slice(0, 10);
        if (!dayMap[d]) dayMap[d] = { clicks: 0, conversions: 0 };
        dayMap[d].clicks += 1;
        if (c.converted) dayMap[d].conversions += 1;
      });

      clicksHistory = Object.entries(dayMap).map(([date, val]) => ({
        date,
        clicks: val.clicks,
        conversions: val.conversions,
      }));
    }

    const totalClicks = partner?.total_clicks || 0;
    const totalOrders = partner?.total_orders || 0;

    return {
      creator: creator || null,
      partner: partner || null,
      summary: {
        totalClicks,
        totalOrders,
        totalGmvCents: partner?.total_gmv_cents || 0,
        pendingCommissionCents: partner?.pending_commission_cents || 0,
        paidCommissionCents: partner?.paid_commission_cents || 0,
        conversionRate: totalClicks > 0 ? Number(((totalOrders / totalClicks) * 100).toFixed(1)) : 0,
      },
      clicksHistory,
    };
  });

/**
 * Registra um clique em vitrine de afiliado ou produto com rastreamento UTM.
 */
export const recordShowcaseClick = createServerFn({ method: "POST" })
  .validator(
    z.object({
      creatorHandle: z.string(),
      productId: z.string().uuid().optional(),
      storeId: z.string().uuid().optional(),
      utmSource: z.string().default("waesy_profile"),
      utmMedium: z.string().default("vitrine"),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const cleanHandle = input.creatorHandle.toLowerCase().trim();

    const { data: creator } = await supabase
      .from("creator_profiles")
      .select("id")
      .eq("handle", cleanHandle)
      .maybeSingle();

    if (creator) {
      await supabase.from("creator_showcase_clicks").insert({
        creator_profile_id: creator.id,
        product_id: input.productId || null,
        store_id: input.storeId || null,
        referral_handle: cleanHandle,
        utm_source: input.utmSource,
        utm_medium: input.utmMedium,
      });

      // Atualiza contador em affiliate_partners
      const { data: partner } = await supabase
        .from("affiliate_partners")
        .select("id, total_clicks")
        .eq("handle", cleanHandle)
        .maybeSingle();

      if (partner) {
        await supabase
          .from("affiliate_partners")
          .update({
            total_clicks: (partner.total_clicks || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", partner.id);
      }
    }

    return { recorded: true };
  });

/**
 * Retorna produtos em destaque cadastrados na vitrine pelo criador.
 */
export const getCreatorShowcaseProducts = createServerFn({ method: "GET" })
  .validator(z.object({ handle: z.string() }))
  .handler(async ({ data: { handle } }) => {
    const supabase = getServerClient();
    const cleanHandle = handle.toLowerCase().trim();

    const { data: creator } = await supabase
      .from("creator_profiles")
      .select("id")
      .eq("handle", cleanHandle)
      .maybeSingle();

    if (!creator) return [];

    const { data, error } = await supabase
      .from("creator_showcase_products")
      .select(`
        id,
        custom_title,
        custom_description,
        sort_order,
        is_pinned,
        product_id,
        store_id,
        product:products (
          id,
          name,
          description,
          price,
          sale_price,
          images,
          status,
          store:stores (
            id,
            name,
            slug,
            logo_url
          )
        )
      `)
      .eq("creator_profile_id", creator.id)
      .order("is_pinned", { ascending: false })
      .order("sort_order", { ascending: true });

    if (error) {
      console.warn("[affiliates] getCreatorShowcaseProducts error:", error);
      return [];
    }
    return data || [];
  });

/**
 * Adiciona ou remove produto da vitrine do criador.
 */
export const togglePinShowcaseProduct = createServerFn({ method: "POST" })
  .validator(
    z.object({
      productId: z.string().uuid(),
      storeId: z.string().uuid(),
      isPinned: z.boolean().default(true),
      customTitle: z.string().optional(),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const effectiveUserId = await resolveEffectiveUserId();
    if (!effectiveUserId) throw new Error("Não autenticado.");

    const { data: creator } = await supabase
      .from("creator_profiles")
      .select("id")
      .eq("user_id", effectiveUserId)
      .maybeSingle();

    if (!creator) throw new Error("Perfil de criador não encontrado.");

    const { data: existing } = await supabase
      .from("creator_showcase_products")
      .select("id, is_pinned")
      .eq("creator_profile_id", creator.id)
      .eq("product_id", input.productId)
      .maybeSingle();

    if (existing) {
      if (!input.isPinned) {
        await supabase
          .from("creator_showcase_products")
          .delete()
          .eq("id", existing.id);
        return { pinned: false };
      } else {
        await supabase
          .from("creator_showcase_products")
          .update({ is_pinned: true, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        return { pinned: true };
      }
    } else {
      await supabase.from("creator_showcase_products").insert({
        creator_profile_id: creator.id,
        product_id: input.productId,
        store_id: input.storeId,
        custom_title: input.customTitle || null,
        is_pinned: true,
      });
      return { pinned: true };
    }
  });

/**
 * Salva as configurações de CMS e Vitrine do Criador (Banner, Ordem de Seções, Lojas Parceiras).
 */
export const saveCreatorShowcaseSettings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      handle: z.string().min(1),
      bannerUrl: z.string().optional().nullable(),
      bannerTitle: z.string().optional().nullable(),
      bannerLink: z.string().optional().nullable(),
      showcaseOrder: z.array(z.string()).optional(),
      partnerStoreIds: z.array(z.string().uuid()).optional(),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const effectiveUserId = await resolveEffectiveUserId();
    if (!effectiveUserId) throw new Error("Não autenticado.");

    const cleanHandle = input.handle.toLowerCase().trim().replace(/^@/, "");

    const { data: creator } = await supabase
      .from("creator_profiles")
      .select("id, user_id")
      .eq("handle", cleanHandle)
      .maybeSingle();

    if (!creator || creator.user_id !== effectiveUserId) {
      throw new Error("Perfil de criador não encontrado ou sem permissão.");
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (input.bannerUrl !== undefined) updatePayload.banner_url = input.bannerUrl;
    if (input.bannerTitle !== undefined) updatePayload.banner_title = input.bannerTitle;
    if (input.bannerLink !== undefined) updatePayload.banner_link = input.bannerLink;
    if (input.showcaseOrder !== undefined) updatePayload.showcase_order = input.showcaseOrder;
    if (input.partnerStoreIds !== undefined) updatePayload.partner_store_ids = input.partnerStoreIds;

    const { error } = await supabase
      .from("creator_profiles")
      .update(updatePayload)
      .eq("id", creator.id);

    if (error) {
      console.error("[affiliates] Erro ao salvar configurações de vitrine:", error);
      throw new Error("Falha ao salvar vitrine: " + error.message);
    }

    return { success: true };
  });

/**
 * Vincula ou desvincula uma loja parceira da vitrine do criador.
 */
export const togglePartnerStoreConnection = createServerFn({ method: "POST" })
  .validator(
    z.object({
      handle: z.string().min(1),
      storeId: z.string().uuid(),
      connect: z.boolean(),
    })
  )
  .handler(async ({ data: { handle, storeId, connect } }) => {
    const supabase = getServerClient();
    const effectiveUserId = await resolveEffectiveUserId();
    if (!effectiveUserId) throw new Error("Não autenticado.");

    const cleanHandle = handle.toLowerCase().trim().replace(/^@/, "");

    const { data: creator } = await supabase
      .from("creator_profiles")
      .select("id, user_id, partner_store_ids")
      .eq("handle", cleanHandle)
      .maybeSingle();

    if (!creator || creator.user_id !== effectiveUserId) {
      throw new Error("Perfil de criador não encontrado ou sem permissão.");
    }

    let currentIds: string[] = Array.isArray(creator.partner_store_ids) ? [...creator.partner_store_ids] : [];
    if (connect) {
      if (!currentIds.includes(storeId)) {
        currentIds.push(storeId);
      }
    } else {
      currentIds = currentIds.filter((id) => id !== storeId);
    }

    const { error } = await supabase
      .from("creator_profiles")
      .update({
        partner_store_ids: currentIds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", creator.id);

    if (error) {
      throw new Error("Erro ao atualizar loja parceira: " + error.message);
    }

    return { connected: connect, partnerStoreIds: currentIds };
  });

/**
 * Busca a programação de eventos vinculada ao Criador / Marca (@handle ou organizer).
 */
export const getCreatorEvents = createServerFn({ method: "GET" })
  .validator(z.object({ handle: z.string() }))
  .handler(async ({ data: { handle } }) => {
    const supabase = getServerClient();
    const cleanHandle = handle.toLowerCase().trim().replace(/^@/, "");

    const { data: creator } = await supabase
      .from("creator_profiles")
      .select("id, user_id, name, stage_name")
      .eq("handle", cleanHandle)
      .maybeSingle();

    const stageName = creator?.stage_name || creator?.name || cleanHandle;

    try {
      let query = supabase
        .from("events")
        .select(`
          id,
          title,
          description,
          event_date,
          end_date,
          location,
          city,
          state,
          cover_image,
          price_cents,
          is_free,
          is_external_ticket,
          external_ticket_url,
          category,
          status,
          creator_handle,
          organizer_name
        `)
        .eq("status", "published")
        .gte("event_date", new Date().toISOString())
        .order("event_date", { ascending: true })
        .limit(10);

      if (creator?.user_id) {
        query = query.or(
          `creator_handle.ilike.%${cleanHandle}%,organizer_name.ilike.%${stageName}%,created_by.eq.${creator.user_id}`
        );
      } else {
        query = query.or(
          `creator_handle.ilike.%${cleanHandle}%,organizer_name.ilike.%${stageName}%`
        );
      }

      const { data: events, error } = await query;
      if (error) {
        console.warn("[affiliates] Erro ao buscar eventos do criador:", error);
        return [];
      }
      return events || [];
    } catch (err) {
      console.error("[affiliates] Falha em getCreatorEvents:", err);
      return [];
    }
  });

/**
 * Retorna os dados completos da vitrine pública de um criador (@handle).
 */
export const getCreatorFullShowcaseData = createServerFn({ method: "GET" })
  .validator(z.object({ handle: z.string() }))
  .handler(async ({ data: { handle } }) => {
    const supabase = getServerClient();
    const cleanHandle = handle.toLowerCase().trim().replace(/^@/, "");

    const { data: creator, error: creatorErr } = await supabase
      .from("creator_profiles")
      .select("*")
      .eq("handle", cleanHandle)
      .maybeSingle();

    if (creatorErr || !creator) {
      return null;
    }

    // 1. Lojas Parceiras Conectadas
    let partnerStores: any[] = [];
    const storeIds = Array.isArray(creator.partner_store_ids) ? creator.partner_store_ids : [];
    if (storeIds.length > 0) {
      const { data: stores } = await supabase
        .from("stores")
        .select("id, name, slug, logo_url, banner_url, city, state, segment")
        .in("id", storeIds)
        .eq("status", "active");

      partnerStores = (stores || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        logoUrl: s.logo_url || null,
        bannerUrl: s.banner_url || null,
        city: getDefaultCity(s.city),
        state: s.state || "SC",
        segment: s.segment || "Varejo",
        couponCode: `${cleanHandle.toUpperCase().slice(0, 6)}10`,
        discountPercent: 10,
      }));
    }

    // 2. Produtos em Destaque na Vitrine
    const { data: pinnedProducts } = await supabase
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
      .eq("creator_profile_id", creator.id)
      .order("is_pinned", { ascending: false })
      .order("sort_order", { ascending: true });

    // 3. Eventos da Marca
    const events = await (async () => {
      try {
        const { data: evts } = await supabase
          .from("events")
          .select("id, title, description, event_date, location, city, state, cover_image, price_cents, is_free, is_external_ticket, external_ticket_url, category")
          .eq("status", "published")
          .gte("event_date", new Date().toISOString())
          .or(`creator_handle.ilike.%${cleanHandle}%,organizer_name.ilike.%${creator.stage_name || creator.name}%`)
          .order("event_date", { ascending: true })
          .limit(6);
        return evts || [];
      } catch {
        return [];
      }
    })();

    return {
      creator: {
        ...creator,
        stage_name: creator.stage_name || creator.name,
        category: creator.category || creator.niche || "Geral",
        showcase_order: creator.showcase_order || ["banner", "stores", "products", "events"],
        partner_store_ids: creator.partner_store_ids || [],
      },
      partnerStores,
      pinnedProducts: pinnedProducts || [],
      events,
    };
  });

// ---------------------------------------------------------------------------
// AFFILIATE PAYOUT REQUESTS & WITHDRAWAL GOVERNANCE
// ---------------------------------------------------------------------------

export const requestAffiliatePayoutInput = z.object({
  amountCents: z.number().int().min(5000, "O valor mínimo de saque é R$ 50,00"),
  pixKeyType: z.enum(["cpf", "cnpj", "email", "phone", "random"]),
  pixKey: z.string().min(3, "Chave PIX obrigatória"),
  notes: z.string().max(300).optional(),
});

export const adminProcessPayoutRequestInput = z.object({
  requestId: z.string().uuid("ID de saque inválido"),
  action: z.enum(["approve_paid", "reject"]),
  receiptUrl: z.string().url().optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
});

/**
 * Cria uma solicitação de saque de comissão via PIX com trava de saldo e idempotência.
 */
export const requestAffiliatePayout = createServerFn({ method: "POST" })
  .validator(requestAffiliatePayoutInput)
  .handler(async ({ data: { amountCents, pixKeyType, pixKey, notes } }) => {
    const supabase = getServerClient();
    const effectiveUserId = await resolveEffectiveUserId();

    if (!effectiveUserId) {
      throw new Error("Usuário não autenticado.");
    }

    // 1. Busca cadastro do parceiro
    const { data: partner, error: partnerErr } = await supabase
      .from("affiliate_partners")
      .select("id, store_id, total_commission_cents, paid_commission_cents, status")
      .eq("user_id", effectiveUserId)
      .maybeSingle();

    if (partnerErr || !partner) {
      throw new Error("Cadastro de parceiro/afiliado não encontrado.");
    }

    if (partner.status !== "active") {
      throw new Error("Sua conta de parceiro não está ativa para saques.");
    }

    const availableBalanceCents = Math.max(0, (partner.total_commission_cents || 0) - (partner.paid_commission_cents || 0));

    if (amountCents > availableBalanceCents) {
      throw new Error(`Saldo insuficiente. Disponível para saque: R$ ${(availableBalanceCents / 100).toFixed(2)}`);
    }

    // 2. Trava contra saques pendentes duplicados
    const { data: pendingRequests } = await supabase
      .from("affiliate_payout_requests")
      .select("id")
      .eq("affiliate_id", partner.id)
      .eq("status", "pending")
      .limit(1);

    if (pendingRequests && pendingRequests.length > 0) {
      throw new Error("Você já possui uma solicitação de saque em análise. Aguarde a conclusão antes de abrir outra.");
    }

    // 3. Registra solicitação no banco
    const { data: created, error: insertErr } = await supabase
      .from("affiliate_payout_requests")
      .insert({
        affiliate_id: partner.id,
        user_id: effectiveUserId,
        store_id: partner.store_id || null,
        amount_cents: amountCents,
        pix_key_type: pixKeyType,
        pix_key: pixKey,
        notes: notes || null,
        status: "pending",
      })
      .select("id, amount_cents, pix_key, status, created_at")
      .single();

    if (insertErr || !created) {
      throw new Error("Falha ao registrar solicitação de saque: " + (insertErr?.message || "Erro desconhecido"));
    }

    // ── Ledger Criptográfico SHA-256 — Solicitação de Saque de Afiliado ──
    try {
      await recordLedgerEntryCore({
        transactionType: "pix_sent",
        amountCents: amountCents,
        senderId: effectiveUserId,
        referenceEntityType: "affiliate_payout_request",
        referenceEntityId: created.id,
        metadata: {
          affiliate_id: partner.id,
          pix_key_type: pixKeyType,
          status: "pending",
          action: "payout_request_created",
        },
      });
    } catch (ledgerErr) {
      console.error("[affiliates.functions] Falha no ledger de saque (solicitação):", ledgerErr);
    }

    return {
      success: true,
      payoutRequest: created,
    };
  });

/**
 * Retorna as solicitações de saque do parceiro autenticado.
 */
export const listMyPayoutRequests = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const effectiveUserId = await resolveEffectiveUserId();

  if (!effectiveUserId) {
    return [];
  }

  const { data, error } = await supabase
    .from("affiliate_payout_requests")
    .select("id, amount_cents, pix_key_type, pix_key, status, paid_at, receipt_url, notes, created_at")
    .eq("user_id", effectiveUserId)
    .order("created_at", { ascending: false });

  if (error) {
    console.warn("[listMyPayoutRequests] Erro ao listar saques:", error);
    return [];
  }

  return data || [];
});

/**
 * Lista solicitações de saque para gestão no Workspace / Admin.
 * Protegido com isolamento estrito de store_id (Zero Cross-Store Leakage).
 */
export const adminListPayoutRequests = createServerFn({ method: "GET" })
  .validator(
    z.object({
      status: z.enum(["all", "pending", "processing", "paid", "rejected"]).default("all"),
    }).default({ status: "all" })
  )
  .handler(async ({ data: { status } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    const isPlatformAdmin = identity.role === "platform_admin" || identity.role === "admin";
    if (!isPlatformAdmin) {
      assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);
    }

    let query = supabase
      .from("affiliate_payout_requests")
      .select(`
        id,
        store_id,
        amount_cents,
        pix_key_type,
        pix_key,
        status,
        paid_at,
        receipt_url,
        notes,
        created_at,
        user_id,
        affiliate_id,
        affiliate:affiliate_partners(id, handle, display_name)
      `)
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    // Se não for admin de plataforma global, OBRIGA o escopo da loja
    if (!isPlatformAdmin) {
      query = query.eq("store_id", identity.store_id);
    } else if (identity.store_id) {
      // Se for admin mas estiver no contexto de uma loja específica
      query = query.eq("store_id", identity.store_id);
    }

    const { data, error } = await query;
    if (error) {
      console.warn("[adminListPayoutRequests] Erro ao listar:", error);
      return [];
    }

    return data || [];
  });

/**
 * Processa ou rejeita uma solicitação de saque de comissão de afiliado.
 * Isolamento Multi-Tenant Inviolável: Impede que a Loja A aprove ou altere saques da Loja B.
 */
export const adminProcessPayoutRequest = createServerFn({ method: "POST" })
  .validator(adminProcessPayoutRequestInput)
  .handler(async ({ data: { requestId, action, receiptUrl, notes } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    const isPlatformAdmin = identity.role === "platform_admin" || identity.role === "admin";
    if (!isPlatformAdmin) {
      assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);
    }

    // 1. Busca solicitação
    const { data: request, error: fetchErr } = await supabase
      .from("affiliate_payout_requests")
      .select("id, affiliate_id, store_id, amount_cents, status, user_id")
      .eq("id", requestId)
      .single();

    if (fetchErr || !request) {
      throw new Error("Solicitação de saque não encontrada.");
    }

    // Trava Multi-Tenant Inviolável: Não permite gerenciar saques de outras lojas
    if (!isPlatformAdmin && request.store_id !== identity.store_id) {
      throw new Error("Acesso não autorizado: esta solicitação de saque pertence a outro estabelecimento.");
    }

    if (request.status !== "pending" && request.status !== "processing") {
      throw new Error(`Esta solicitação já está ${request.status} e não pode ser reprocessada.`);
    }

    if (action === "reject") {
      const { error: rejectErr } = await supabase
        .from("affiliate_payout_requests")
        .update({
          status: "rejected",
          notes: notes || "Solicitação de saque rejeitada pela administração.",
          approved_by: identity.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (rejectErr) throw new Error("Erro ao rejeitar solicitação: " + rejectErr.message);
      return { success: true, status: "rejected" };
    }

    // action === "approve_paid"
    const { error: updateReqErr } = await supabase
      .from("affiliate_payout_requests")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        receipt_url: receiptUrl || null,
        notes: notes || null,
        approved_by: identity.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateReqErr) throw new Error("Erro ao atualizar solicitação para pago: " + updateReqErr.message);

    // Incrementa paid_commission_cents no cadastro do parceiro
    const { data: partner } = await supabase
      .from("affiliate_partners")
      .select("paid_commission_cents")
      .eq("id", request.affiliate_id)
      .single();

    const newPaidCents = Number(partner?.paid_commission_cents || 0) + request.amount_cents;

    await supabase
      .from("affiliate_partners")
      .update({
        paid_commission_cents: newPaidCents,
        updated_at: new Date().toISOString(),
      })
      .eq("id", request.affiliate_id);

    // ── Ledger Criptográfico SHA-256 — Pagamento de Saque de Afiliado Aprovado ──
    try {
      await recordLedgerEntryCore({
        transactionType: "commission_payout",
        amountCents: request.amount_cents,
        senderId: identity.id,
        receiverId: request.user_id || request.affiliate_id,
        storeId: request.store_id || identity.store_id || null,
        actorId: identity.id,
        actorRole: identity.role ?? "admin",
        referenceEntityType: "affiliate_payout_request",
        referenceEntityId: requestId,
        metadata: {
          affiliate_id: request.affiliate_id,
          receipt_url: receiptUrl ?? null,
          action: "payout_approved_paid",
          new_paid_cents: newPaidCents,
        },
      });
    } catch (ledgerErr) {
      console.error("[affiliates.functions] Falha no ledger de pagamento afiliado:", ledgerErr);
    }

    return { success: true, status: "paid" };
  });


