import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { encryptSecret, decryptSecret } from "@/lib/crypto-vault.server";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

export type AdCampaign = {
  id: string;
  store_id: string;
  title: string;
  headline?: string;
  media_url?: string | null;
  format: "post_patrocinado" | "banner_destaque" | "story_patrocinado" | "busca_topo" | "stories_sponsor";
  target_location: string | null;
  target_radius_km: number | null;
  daily_budget_cents: number | null;
  total_budget_cents: number;
  status: "active" | "paused" | "completed" | "draft";
  impressions_count: number;
  clicks_count: number;
  spent_cents: number | null;
  created_at: string;
};

export const listAdCampaigns = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

 const { data: campaigns, error } = await supabase
 .from("ad_campaigns")
 .select(
 "id, store_id, title, body, image_url, target_url, product_id, type, budget_cents, status, created_at, starts_at, ends_at, placements, settings",
 )
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

 if (error) {
 console.error("[ads] Error listing campaigns:", error);
 throw new Error("Não foi possível carregar as campanhas de anúncios.");
 }

 // Busca contagem de eventos por campanha
 const campaignIds = (campaigns || []).map((c) => c.id);
 const { data: events, error: eventsError } = await supabase
 .from("ad_events")
 .select("campaign_id, event_type")
 .in(
 "campaign_id",
 campaignIds.length > 0 ? campaignIds : ["00000000-0000-0000-0000-000000000000"],
 );

 if (eventsError) {
   console.error("[ads] Error listing campaign events:", eventsError);
   throw new Error("Não foi possível carregar as métricas de eventos das campanhas.");
 }

 const eventsCount = new Map<string, { views: number; clicks: number }>();
 (events || []).forEach((e) => {
 const curr = eventsCount.get(e.campaign_id) || { views: 0, clicks: 0 };
 if (e.event_type === "view") curr.views++;
 if (e.event_type === "click") curr.clicks++;
 eventsCount.set(e.campaign_id, curr);
 });

 return (campaigns || []).map((c: any) => {
    const stats = eventsCount.get(c.id) || { views: 0, clicks: 0 };
    const placements = c.placements || ["feed"];
    const s = (c.settings as Record<string, any>) || {};
    const format = (s.format as any) || (
      placements.includes("search")
        ? "busca_topo"
        : placements.includes("banner")
        ? "banner_destaque"
        : placements.includes("story")
        ? "story_patrocinado"
        : "post_patrocinado"
    );

    return {
      id: c.id,
      store_id: c.store_id,
      title: c.title || "Campanha Promocional",
      headline: c.body || s.headline || "",
      media_url: c.image_url || null,
      format,
      target_location: typeof s.target_location === "string" && s.target_location.trim() ? s.target_location : null,
      target_radius_km: s.target_radius_km != null && s.target_radius_km !== "" && Number.isFinite(Number(s.target_radius_km)) && Number(s.target_radius_km) > 0 ? Number(s.target_radius_km) : null,
      daily_budget_cents: s.daily_budget_cents != null && s.daily_budget_cents !== "" && Number.isFinite(Number(s.daily_budget_cents)) && Number(s.daily_budget_cents) > 0 ? Number(s.daily_budget_cents) : null,
      total_budget_cents: Number(c.budget_cents),
      status: c.status,
      impressions_count: stats.views,
      clicks_count: stats.clicks,
      spent_cents: s.real_spent_cents != null && s.real_spent_cents !== "" && Number.isFinite(Number(s.real_spent_cents)) ? Number(s.real_spent_cents) : null,
      created_at: c.created_at,
    } as AdCampaign;
  });
});

export const getStoreAdTargets = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

 const { data: products, error: productsError } = await supabase
 .from("products")
 .select("id, title, price_cents, status")
 .eq("store_id", identity.store_id)
 .eq("status", "published")
 .order("created_at", { ascending: false })
 .limit(50);

 const { data: store, error: storeError } = await supabase
 .from("stores")
 .select("id, name, phone, slug")
 .eq("id", identity.store_id)
 .single();

 if (productsError || storeError || !store) {
   console.error("[ads] Error loading ad targets:", productsError || storeError);
   throw new Error("Não foi possível carregar o catálogo ou os dados da loja para anúncios.");
 }

 return {
    storeId: identity.store_id,
    products: products || [],
    storePhone: store?.phone || null,
    storeSlug: store?.slug || "",
    storeName: store?.name || "",
  };
});

export const createAdCampaign = createServerFn({ method: "POST" })
 .validator(
 z.object({
 title: z.string().min(2),
 headline: z.string().optional(),
 format: z.enum(["post_patrocinado", "banner_destaque", "story_patrocinado", "busca_topo", "stories_sponsor"]),
 media_url: z.string().optional(),
 destination_type: z.enum(["product", "post", "whatsapp", "custom_url"]).default("whatsapp"),
 destination_id: z.string().optional(),
 destination_url: z.string().optional(),
 objective: z.enum(["whatsapp_leads", "direct_sales", "brand_awareness"]).default("whatsapp_leads"),
 target_location: z.string().min(2),
 target_radius_km: z.number().min(1).max(100),
 daily_budget_cents: z.number().int().min(500),
 total_budget_cents: z.number().int().min(500),
 }),
 )
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

 const placementMap: Record<string, string[]> = {
 post_patrocinado: ["feed"],
 banner_destaque: ["banner", "market"],
 story_patrocinado: ["story"],
 stories_sponsor: ["story", "banner"],
 busca_topo: ["search"],
 };

 const durationDays = Math.max(1, Math.round(input.total_budget_cents / Math.max(100, input.daily_budget_cents)));
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const productId = input.destination_type === "product" && input.destination_id ? input.destination_id : null;

  const { data: campaign, error } = await supabase
    .from("ad_campaigns")
    .insert({
      store_id: identity.store_id,
      title: input.title,
      body: input.headline || null,
      image_url: input.media_url || null,
      target_url: input.destination_url || null,
      product_id: productId,
      type: input.format === "banner_destaque" ? "fixed_banner" : "dynamic_boost",
      budget_cents: input.total_budget_cents,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      placements: placementMap[input.format] || ["feed"],
      status: "active",
      settings: {
        format: input.format,
        headline: input.headline,
        daily_budget_cents: input.daily_budget_cents,
        total_budget_cents: input.total_budget_cents,
        target_location: input.target_location,
        target_radius_km: input.target_radius_km,
        objective: input.objective,
        destination_type: input.destination_type,
        destination_id: input.destination_id,
        destination_url: input.destination_url,
      },
    })
    .select()
    .single();

  if (productId && campaign) {
    await supabase
      .from("products")
      .update({
        is_sponsored: true,
        sponsored_until: endsAt.toISOString(),
        updated_at: startsAt.toISOString(),
      })
      .eq("id", productId)
      .eq("store_id", identity.store_id);
  }

  if (campaign) {
    try {
      const { executeAtomicInvoiceLedgerBoost } = await import("./billing-ledger.functions");
      await executeAtomicInvoiceLedgerBoost({
        storeId: identity.store_id,
        profileId: identity.id,
        entityType: "product_boost",
        entityId: productId || campaign.id,
        originalAmountCents: input.total_budget_cents,
        description: `Waesy Ads (${input.format}) - ${input.title}`,
        metadata: {
          campaign_id: campaign.id,
          format: input.format,
          duration_days: durationDays,
          sponsored_until: endsAt.toISOString(),
        },
      });
    } catch (err) {
      console.error("[ads] Erro ao registrar invoice_ledger:", err);
      throw new Error("A campanha não pôde ser confirmada porque o lançamento de cobrança falhou.");
    }
  }

 if (error) {
 console.error("[ads] Error creating campaign:", error);
 throw new Error("Erro ao criar campanha de anúncio no banco de dados.");
 }

 // SILENT TRIGGER: Registrar evento no ledger de auditoria
 try {
 await supabase.from("audit_logs").insert({
 store_id: identity.store_id,
 user_id: identity.id,
 action: "ad_campaign_created",
 entity_type: "ad_campaign",
 entity_id: campaign.id,
 payload_snapshot: {
 title: campaign.title,
 headline: input.headline,
 format: input.format,
 media_url: input.media_url,
 destination_type: input.destination_type,
 destination_id: input.destination_id,
 destination_url: input.destination_url,
 objective: input.objective,
 budget_cents: input.total_budget_cents,
 daily_budget_cents: input.daily_budget_cents,
 },
 });
 } catch {
 // Ignora erro não impeditivo de log
 }

 return campaign;
 });

export const toggleAdCampaignStatus = createServerFn({ method: "POST" })
 .validator(
 z.object({
 campaignId: z.string().uuid(),
 status: z.enum(["active", "paused"]),
 }),
 )
 .handler(async ({ data: { campaignId, status } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

 const { data: updated, error } = await supabase
 .from("ad_campaigns")
 .update({ status, updated_at: new Date().toISOString() })
 .eq("id", campaignId)
 .eq("store_id", identity.store_id)
 .select()
 .single();

 if (error) {
 console.error("[ads] Error updating campaign status:", error);
 throw new Error("Erro ao atualizar status da campanha.");
 }

 return updated;
});

/**
 * 2. GESTÃO DE CANAIS EXTERNOS DE TRÁFEGO PAGO (META ADS & GOOGLE ADS)
 * ====================================================================
 */

export interface StoreAdChannelsDTO {
  meta_ads: {
    connected: boolean;
    pixel_id: string;
    ad_account_id: string;
    catalog_feed_url: string;
  };
  google_ads: {
    connected: boolean;
    conversion_id: string;
    customer_id: string;
    merchant_feed_url: string;
  };
  tiktok_ads: {
    connected: boolean;
    pixel_id: string;
  };
}

export const getStoreAdChannelsSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<StoreAdChannelsDTO> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

    const { data: store } = await supabase
      .from("stores")
      .select("slug, settings")
      .eq("id", identity.store_id)
      .single();

    const settings = (store?.settings as Record<string, any>) || {};
    const channels = settings.ad_channels || {};
    const storeSlug = store?.slug || identity.store_id;

    const baseUrl = process.env.VITE_APP_URL || "https://usewaesy.pages.dev";

    return {
      meta_ads: {
        connected: Boolean(channels.meta_ad_account_id || settings.meta_pixel_id),
        pixel_id: settings.meta_pixel_id || channels.meta_pixel_id || "",
        ad_account_id: channels.meta_ad_account_id || "",
        catalog_feed_url: `${baseUrl}/api/feed/meta.csv?store=${storeSlug}`,
      },
      google_ads: {
        connected: Boolean(channels.google_customer_id || channels.google_conversion_id),
        conversion_id: channels.google_conversion_id || settings.gtm_id || "",
        customer_id: channels.google_customer_id || "",
        merchant_feed_url: `${baseUrl}/api/feed/xml?store=${storeSlug}`,
      },
      tiktok_ads: {
        connected: Boolean(channels.tiktok_pixel_id),
        pixel_id: channels.tiktok_pixel_id || "",
      },
    };
  },
);

export const saveStoreAdChannelsSettings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      meta_pixel_id: z.string().optional(),
      meta_ad_account_id: z.string().optional(),
      google_conversion_id: z.string().optional(),
      google_customer_id: z.string().optional(),
      tiktok_pixel_id: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { data: store } = await supabase
      .from("stores")
      .select("settings")
      .eq("id", identity.store_id)
      .single();

    const currentSettings = (store?.settings as Record<string, any>) || {};
    const currentChannels = currentSettings.ad_channels || {};

    const updatedChannels = {
      ...currentChannels,
      meta_ad_account_id: data.meta_ad_account_id?.trim() || currentChannels.meta_ad_account_id,
      google_conversion_id: data.google_conversion_id?.trim() || currentChannels.google_conversion_id,
      google_customer_id: data.google_customer_id?.trim() || currentChannels.google_customer_id,
      tiktok_pixel_id: data.tiktok_pixel_id?.trim() || currentChannels.tiktok_pixel_id,
    };

    const updatedSettings = {
      ...currentSettings,
      meta_pixel_id: data.meta_pixel_id?.trim() || currentSettings.meta_pixel_id,
      ad_channels: updatedChannels,
    };

    const { error } = await supabase
      .from("stores")
      .update({ settings: updatedSettings })
      .eq("id", identity.store_id);

    if (error) {
      throw new Error("Erro ao salvar configurações dos canais de tráfego pago: " + error.message);
    }

    return { success: true };
  });

export const generateUtmTrackingLink = createServerFn({ method: "POST" })
  .validator(
    z.object({
      targetPath: z.string(),
      source: z.enum(["meta_ads", "google_ads", "tiktok_ads", "whatsapp", "influencer"]),
      campaignName: z.string().min(1, "Nome da campanha obrigatório"),
      medium: z.enum(["cpc", "stories", "feed", "reels", "search", "shopping", "direct"]).default("cpc"),
      content: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

    const { data: store } = await supabase
      .from("stores")
      .select("slug")
      .eq("id", identity.store_id)
      .single();

    const baseUrl = process.env.VITE_APP_URL || "https://usewaesy.pages.dev";
    const path = data.targetPath.startsWith("/") ? data.targetPath : `/${data.targetPath}`;

    const cleanCampaign = data.campaignName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "_");

    const url = new URL(`${baseUrl}${path}`);
    url.searchParams.set("utm_source", data.source);
    url.searchParams.set("utm_medium", data.medium);
    url.searchParams.set("utm_campaign", cleanCampaign);
    if (data.content) {
      url.searchParams.set("utm_content", data.content);
    }

    return { trackingUrl: url.toString(), cleanCampaign };
  });


export const approveAndPublishAdCampaign = createServerFn({ method: "POST" })
  .validator(
    z.object({
      campaignTitle: z.string().min(1, "Título obrigatório"),
      platform: z.enum(["meta_instagram", "meta_facebook", "google_search", "omnichannel_local"]).default("meta_instagram"),
      dailyBudgetCents: z.number().positive("Orçamento deve ser positivo"),
      durationDays: z.number().int().positive().default(7),
      targeting: z.object({
        locationLabel: z.string(),
        radiusKm: z.number(),
        ageRange: z.tuple([z.number(), z.number()]),
        interestTags: z.array(z.string()),
      }),
      creative: z.object({
        format: z.string(),
        headline: z.string(),
        bodyCopy: z.string(),
        callToActionLabel: z.string(),
        destinationUrl: z.string(),
        recommendedImageUrl: z.string(),
      }),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

    const totalBudgetCents = data.dailyBudgetCents * data.durationDays;
    const now = new Date();
    const endsAt = new Date(now.getTime() + data.durationDays * 24 * 60 * 60 * 1000);

    const placementMap: Record<string, string[]> = {
      meta_instagram: ["feed", "story"],
      meta_facebook: ["feed"],
      google_search: ["search"],
      omnichannel_local: ["feed", "banner", "search", "story"],
    };

    const { data: inserted, error } = await supabase
      .from("ad_campaigns")
      .insert({
        store_id: identity.store_id,
        title: data.campaignTitle,
        type: data.platform.startsWith("meta") ? "social_boost" : "featured_placement",
        budget_cents: totalBudgetCents,
        status: "active",
        starts_at: now.toISOString(),
        ends_at: endsAt.toISOString(),
        placements: placementMap[data.platform] || ["feed"],
        settings: {
          platform: data.platform,
          daily_budget_cents: data.dailyBudgetCents,
          duration_days: data.durationDays,
          targeting: data.targeting,
          creative: data.creative,
          approved_by_user_id: identity.id,
          approved_at: now.toISOString(),
          created_via: "mcp_ai_voice_command",
        },
      })
      .select("id, title, status, budget_cents, created_at")
      .single();

    if (error) {
      console.error("[ads] Erro ao aprovar campanha via MCP:", error);
      throw new Error(`Falha ao registrar campanha: ${error.message}`);
    }

    return {
      success: true,
      campaignId: inserted.id,
      title: inserted.title,
      status: inserted.status,
      totalBudgetCents: inserted.budget_cents,
      message: `Campanha "${inserted.title}" aprovada e ativada com sucesso!`,
    };
  });


/**
 * 4. GLOBAL AD-NETWORK ARBITRAGE & SPLIT ENGINE (V109 SPEC)
 * ==========================================================
 * Regra A: Conta Própria (Pro/Agências) -> 100% Budget repassado diretamente via OAuth.
 * Regra B: Express Boost (Arbitragem) -> Divide o valor: 20% Waesy Software Fee / 80% Meta/Google API.
 */

export interface AdSplitResult {
  total_budget_cents: number;
  waesy_take_rate: number;
  waesy_revenue_cents: number;
  external_ad_spend_cents: number;
  routing_mode: "client_own_account" | "waesy_global_arbitrage";
  destination_platform: "meta_ads" | "google_ads" | "waesy_network";
}

export const calculateAdBudgetSplit = (
  totalBudgetCents: number,
  hasOwnAdAccount: boolean,
  destinationPlatform: "meta_ads" | "google_ads" | "waesy_network" = "meta_ads"
): AdSplitResult => {
  if (hasOwnAdAccount) {
    return {
      total_budget_cents: totalBudgetCents,
      waesy_take_rate: 0,
      waesy_revenue_cents: 0,
      external_ad_spend_cents: totalBudgetCents,
      routing_mode: "client_own_account",
      destination_platform: destinationPlatform,
    };
  }

  // Regra B: Express Boost Arbitrage (Padrão 20% Waesy / 80% Meta Ads)
  const takeRate = Number(process.env.WAESY_AD_TAKE_RATE || 0.20);
  const waesyRevenueCents = Math.round(totalBudgetCents * takeRate);
  const externalSpendCents = totalBudgetCents - waesyRevenueCents;

  return {
    total_budget_cents: totalBudgetCents,
    waesy_take_rate: takeRate,
    waesy_revenue_cents: waesyRevenueCents,
    external_ad_spend_cents: externalSpendCents,
    routing_mode: "waesy_global_arbitrage",
    destination_platform: destinationPlatform,
  };
};

export const getAdNetworkTreasuryMetrics = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getServerIdentity();

  if (!identity.isPlatformAdmin) {
    throw new Error("Acesso exclusivo para administradores da rede.");
  }

  const [{ data: campaigns, error: campaignsError }, { data: ledgerRows, error: ledgerError }] = await Promise.all([
    supabase.from("ad_campaigns").select("id, status"),
    supabase.from("ad_ledger").select("entry_type, amount_cents"),
  ]);

  if (campaignsError || ledgerError) {
    console.error("[ads] Erro ao buscar métricas de tesouraria de ads:", campaignsError || ledgerError);
    throw new Error("Não foi possível carregar as campanhas e lançamentos observados da tesouraria.");
  }

  const sumLedgerType = (entryType: string) => (ledgerRows || [])
    .filter((entry: any) => entry.entry_type === entryType)
    .reduce((sum: number, entry: any) => {
      if (entry.amount_cents == null || entry.amount_cents === "") throw new Error("Lançamento sem valor no livro-razão de anúncios.");
      const amount = Number(entry.amount_cents);
      if (!Number.isFinite(amount)) throw new Error("Lançamento inválido no livro-razão de anúncios.");
      return sum + amount;
    }, 0);

  return {
    // Valores registrados no ledger; orçamento de campanha não é tratado como receita ou gasto realizado.
    total_processed_cents: sumLedgerType("boost_payment"),
    waesy_revenue_cents: sumLedgerType("waesy_fee_retention"),
    // O livro-razão de rede não comprova o gasto reportado pela plataforma externa.
    external_ad_spend_cents: null,
    active_campaigns_count: (campaigns || []).filter((campaign: any) => campaign.status === "active").length,
    total_campaigns_count: (campaigns || []).length,
  };
});

export const listAllNetworkCampaignsAdmin = createServerFn({ method: "GET" })
  .validator(
    z.object({
      status: z.enum(["all", "active", "paused", "completed"]).default("all"),
      limit: z.number().int().min(1).max(100).default(50),
    }).default({})
  )
  .handler(async ({ data: { status, limit } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    if (!identity.isPlatformAdmin) {
      throw new Error("Acesso exclusivo para administradores da rede.");
    }

    let query = supabase
      .from("ad_campaigns")
      .select("id, store_id, title, type, budget_cents, status, created_at, starts_at, ends_at, settings, store:store_id (id, name, slug)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[ads] Erro ao listar campanhas admin:", error);
      throw new Error("Não foi possível carregar as campanhas da rede.");
    }

    const { data: ledgerRows, error: ledgerError } = await supabase
      .from("ad_ledger")
      .select("campaign_id, entry_type, amount_cents, routing_mode")
      .in("campaign_id", (data || []).length ? (data || []).map((campaign: any) => campaign.id) : ["00000000-0000-0000-0000-000000000000"]);
    if (ledgerError) {
      console.error("[ads] Erro ao consultar ledger das campanhas admin:", ledgerError);
      throw new Error("Não foi possível carregar os lançamentos das campanhas da rede.");
    }

    return (data || []).map((c: any) => {
      const campaignLedger = (ledgerRows || []).filter((entry: any) => entry.campaign_id === c.id);
      const feeEntries = campaignLedger.filter((entry: any) => entry.entry_type === "waesy_fee_retention");
      const recordedFee = feeEntries.length
        ? feeEntries.reduce((sum: number, entry: any) => {
            if (entry.amount_cents == null || entry.amount_cents === "") throw new Error("Lançamento sem valor no livro-razão de anúncios.");
            const amount = Number(entry.amount_cents);
            if (!Number.isFinite(amount)) throw new Error("Lançamento inválido no livro-razão de anúncios.");
            return sum + amount;
          }, 0)
        : null;

      return {
        id: c.id,
        store_id: c.store_id,
        store_name: c.store?.name || "Loja da Rede",
        store_slug: c.store?.slug || "",
        title: c.title || "Impulsionamento",
        status: c.status,
        total_budget_cents: Number(c.budget_cents),
        waesy_revenue_cents: recordedFee,
        external_spend_cents: null,
        routing_mode: campaignLedger[0]?.routing_mode || null,
        created_at: c.created_at,
        ends_at: c.ends_at,
      };
    });
  });

/**
 * 5. PERSISTÊNCIA ATÔMICA DE ARBITRAGEM & AD-LEDGER (V109 SPEC)
 * =============================================================
 * Registra a transação no livro-razão (ad_ledger) e cria/atualiza
 * a ad_campaign correspondente.
 */
export async function recordAdCampaignAndLedgerSplit(params: {
  storeId?: string | null;
  classifiedId?: string | null;
  title: string;
  totalBudgetCents: number;
  hasOwnAdAccount: boolean;
  destinationPlatform?: "meta_ads" | "google_ads" | "waesy_network";
  startsAt?: string;
  endsAt?: string;
  description?: string;
  metadata?: Record<string, any>;
}) {
  const supabase = getServerClient();
  const split = calculateAdBudgetSplit(
    params.totalBudgetCents,
    params.hasOwnAdAccount,
    params.destinationPlatform || "meta_ads"
  );

  const now = new Date().toISOString();

  // 1. Cria campanha na ad-network
  const { data: campaign, error: campaignErr } = await supabase
    .from("ad_campaigns")
    .insert({
      store_id: params.storeId || null,
      classified_id: params.classifiedId || null,
      title: params.title,
      type: "express_boost",
      budget_cents: params.totalBudgetCents,
      waesy_fee_cents: split.waesy_revenue_cents,
      external_ad_spend_cents: split.external_ad_spend_cents,
      routing_mode: split.routing_mode,
      external_platform: split.destination_platform,
      status: "active",
      starts_at: params.startsAt || now,
      ends_at: params.endsAt || null,
      placements: ["feed", "search", "story"],
    })
    .select("id")
    .single();

  if (campaignErr) {
    console.error("[ads] Erro ao registrar ad_campaign:", campaignErr);
    throw new Error("Não foi possível registrar a campanha de anúncios.");
  }

  const campaignId = campaign?.id || null;
  if (!campaignId) throw new Error("A campanha não retornou um identificador válido.");

  // 2. Insere no ad_ledger (Double-entry / Livro-razão)
  const ledgerEntries = [
    {
      campaign_id: campaignId,
      store_id: params.storeId || null,
      classified_id: params.classifiedId || null,
      entry_type: "boost_payment",
      amount_cents: params.totalBudgetCents,
      routing_mode: split.routing_mode,
      description: params.description || `Recebimento bruto de impulsionamento: ${params.title}`,
      metadata: params.metadata || {},
    },
    {
      campaign_id: campaignId,
      store_id: params.storeId || null,
      classified_id: params.classifiedId || null,
      entry_type: "waesy_fee_retention",
      amount_cents: split.waesy_revenue_cents,
      routing_mode: split.routing_mode,
      description: `Retenção de software Waesy Ads (${Math.round(split.waesy_take_rate * 100)}%)`,
      metadata: { take_rate: split.waesy_take_rate },
    },
    {
      campaign_id: campaignId,
      store_id: params.storeId || null,
      classified_id: params.classifiedId || null,
      entry_type: "external_ad_spend",
      amount_cents: split.external_ad_spend_cents,
      routing_mode: split.routing_mode,
      description: `Injeção de saldo em leilão via API (${split.destination_platform})`,
      metadata: { platform: split.destination_platform },
    },
  ];

  const { error: ledgerErr } = await supabase.from("ad_ledger").insert(ledgerEntries);
  if (ledgerErr) {
    console.error("[ads] Erro ao registrar entradas no ad_ledger:", ledgerErr);
    throw new Error("Não foi possível registrar os lançamentos da campanha no livro-razão.");
  }

  return {
    campaignId,
    split,
  };
}

/**
 * 6. HUB DE CONFIGURAÇÃO DE TOKENS GLOBAIS (ADMIN MASTER)
 * =======================================================
 * Permite ao Master configurar o Take Rate e as chaves de API da Ad-Network
 */
export const getGlobalAdNetworkConfig = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getServerIdentity();
  if (!identity.isPlatformAdmin) {
    throw new Error("Acesso exclusivo para administradores da rede.");
  }

  const { data: store } = await supabase
    .from("stores")
    .select("id, settings")
    .or("is_platform_root.eq.true,slug.eq.waesy,slug.eq.waesy-matriz,slug.eq.matriz")
    .limit(1)
    .maybeSingle();

  const settings = (store?.settings as Record<string, any>) || {};
  const adConfig = (settings.global_ad_network as Record<string, any>) || {};

  const metaToken = adConfig.meta_access_token || process.env.META_ADS_ACCESS_TOKEN || "";
  const googleToken = adConfig.google_developer_token || process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "";

  return {
    take_rate: Number(adConfig.take_rate || process.env.WAESY_AD_TAKE_RATE || 0.20),
    meta_configured: !!(metaToken && metaToken.length > 8),
    meta_access_token_masked: metaToken ? `${metaToken.slice(0, 6)}••••••••${metaToken.slice(-4)}` : "",
    meta_ad_account_id: adConfig.meta_ad_account_id || "",
    meta_pixel_id: adConfig.meta_pixel_id || "",
    google_configured: !!(googleToken && googleToken.length > 5),
    google_developer_token_masked: googleToken ? `${googleToken.slice(0, 4)}••••••••` : "",
    google_customer_id: adConfig.google_customer_id || "",
  };
});

export const updateGlobalAdNetworkConfig = createServerFn({ method: "POST" })
  .validator(
    z.object({
      take_rate: z.number().min(0.01).max(0.99),
      meta_access_token: z.string().optional(),
      meta_ad_account_id: z.string().optional(),
      meta_pixel_id: z.string().optional(),
      google_developer_token: z.string().optional(),
      google_customer_id: z.string().optional(),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity.isPlatformAdmin) {
      throw new Error("Acesso exclusivo para administradores da rede.");
    }

    const { data: store } = await supabase
      .from("stores")
      .select("id, settings")
      .or("is_platform_root.eq.true,slug.eq.waesy,slug.eq.waesy-matriz,slug.eq.matriz")
      .limit(1)
      .maybeSingle();

    if (!store?.id) throw new Error("Loja matriz da plataforma não encontrada.");

    const currentSettings = (store.settings as Record<string, any>) || {};
    const currentAdConfig = (currentSettings.global_ad_network as Record<string, any>) || {};

    const updatedAdConfig = {
      ...currentAdConfig,
      take_rate: input.take_rate,
      meta_access_token: input.meta_access_token?.trim() || currentAdConfig.meta_access_token || "",
      meta_ad_account_id: input.meta_ad_account_id?.trim() || currentAdConfig.meta_ad_account_id || "",
      meta_pixel_id: input.meta_pixel_id?.trim() || currentAdConfig.meta_pixel_id || "",
      google_developer_token: input.google_developer_token?.trim() || currentAdConfig.google_developer_token || "",
      google_customer_id: input.google_customer_id?.trim() || currentAdConfig.google_customer_id || "",
      updated_at: new Date().toISOString(),
      updated_by: identity.id,
    };

    const { error } = await supabase
      .from("stores")
      .update({
        settings: {
          ...currentSettings,
          global_ad_network: updatedAdConfig,
        },
      })
      .eq("id", store.id);

    if (error) {
      console.error("[ads] Erro ao atualizar configurações de ads:", error);
      throw new Error("Erro ao salvar credenciais globais de anúncio.");
    }

    return { success: true };
  });

/**
 * 7. AUDITORIA FORENSE DO LIVRO-RAZÃO (AD-LEDGER)
 * ===============================================
 * Consulta os lançamentos contábeis em partidas dobradas da Ad-Network.
 */
export const listAdLedgerEntries = createServerFn({ method: "GET" })
  .validator(
    z.object({
      campaignId: z.string().uuid().optional(),
      limit: z.number().int().min(1).max(100).default(50),
    }).default({})
  )
  .handler(async ({ data: { campaignId, limit } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity.isPlatformAdmin) {
      throw new Error("Acesso exclusivo para administradores da rede.");
    }

    let query = supabase
      .from("ad_ledger")
      .select("id, campaign_id, store_id, classified_id, entry_type, amount_cents, currency, routing_mode, description, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (campaignId) {
      query = query.eq("campaign_id", campaignId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[ads] Erro ao listar lançamentos do ad_ledger:", error);
      throw new Error("Não foi possível carregar os lançamentos do livro-razão de anúncios.");
    }

    return (data || []).map((entry: any) => ({
      id: entry.id,
      campaign_id: entry.campaign_id,
      store_id: entry.store_id,
      classified_id: entry.classified_id,
      entry_type: entry.entry_type,
      amount_cents: Number(entry.amount_cents) || 0,
      currency: entry.currency || "BRL",
      routing_mode: entry.routing_mode || "waesy_global_arbitrage",
      description: entry.description || "Lançamento de anúncio",
      metadata: entry.metadata || {},
      created_at: entry.created_at,
    }));
  });

/**
 * 8. GESTÃO OPERACIONAL DE CAMPANHAS PELO ADMIN MASTER
 * ====================================================
 */
export const toggleAdCampaignStatusAdmin = createServerFn({ method: "POST" })
  .validator(
    z.object({
      campaignId: z.string().uuid(),
      status: z.enum(["active", "paused", "completed"]),
    })
  )
  .handler(async ({ data: { campaignId, status } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity.isPlatformAdmin) {
      throw new Error("Acesso exclusivo para administradores da rede.");
    }

    const { data: updated, error } = await supabase
      .from("ad_campaigns")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", campaignId)
      .select("id, status, title")
      .single();

    if (error) {
      console.error("[ads] Erro ao alterar status de campanha (admin):", error);
      throw new Error("Erro ao atualizar status da campanha.");
    }

    return updated;
  });

export const deleteAdCampaign = createServerFn({ method: "POST" })
  .validator(
    z.object({
      campaignId: z.string().uuid(),
    }),
  )
  .handler(async ({ data: { campaignId } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { error } = await supabase
      .from("ad_campaigns")
      .delete()
      .eq("id", campaignId)
      .eq("store_id", identity.store_id);

    if (error) {
      console.error("[ads] Error deleting campaign:", error);
      throw new Error("Erro ao excluir campanha.");
    }

    return { success: true };
  });




/**
 * ============================================================================
 * 9. V142 OMNI-MARKETING ENGINE: MAX TIER GATE, OAUTH 2.0 & EXTERNAL ADS BINDING
 * ============================================================================
 */

export async function assertWaesyMaxTier(supabase: any, storeId: string, isPlatformAdmin?: boolean) {
  if (isPlatformAdmin) return { planTier: "max" as const, discountRate: 0.5 };

  const { data: store } = await supabase
    .from("stores")
    .select("plan_tier, settings")
    .eq("id", storeId)
    .maybeSingle();

  const rawTier = String(
    store?.plan_tier || (store?.settings as any)?.plan_tier || "free"
  ).toLowerCase();

  const isMax = rawTier.includes("max") || rawTier.includes("enterprise");
  if (!isMax) {
    throw new Error(
      "MAX_TIER_REQUIRED: O módulo de Tráfego Externo (Meta Ads / Google Ads) e AI Ad Builder é exclusivo para assinantes Waesy Max."
    );
  }

  return { planTier: "max" as const, discountRate: 0.5 };
}

export const getStoreMarketingTierStatus = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, slug, plan_tier, settings")
    .eq("id", identity.store_id)
    .maybeSingle();

  const rawTier = String(
    (store as any)?.plan_tier || ((store?.settings as any)?.plan_tier) || "free"
  ).toLowerCase();

  const isMax =
    Boolean(identity.isPlatformAdmin) ||
    rawTier.includes("max") ||
    rawTier.includes("enterprise");

  const planTier: "free" | "mvp" | "pro" | "max" = isMax
    ? "max"
    : rawTier.includes("pro") || rawTier.includes("growth")
    ? "pro"
    : rawTier.includes("mvp")
    ? "mvp"
    : "free";

  const { data: oauthAccounts } = await supabase
    .from("store_ad_accounts")
    .select("id, platform, account_id, account_name, status, pixel_id, conversion_id, last_api_sync_at")
    .eq("store_id", identity.store_id);

  return {
    storeId: identity.store_id,
    storeName: store?.name || "Loja",
    planTier,
    isMaxUnlocked: isMax,
    boostDiscountPercent: isMax ? 50 : planTier === "pro" ? 20 : 0,
    externalAdsAllowed: isMax,
    aiBuilderAllowed: isMax,
    connectedOAuthAccounts: oauthAccounts || [],
  };
});

export const upgradeStoreToWaesyMax = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin"]);

  const now = new Date().toISOString();
  const { data: store } = await supabase
    .from("stores")
    .select("settings")
    .eq("id", identity.store_id)
    .maybeSingle();

  const updatedSettings = {
    ...((store?.settings as Record<string, any>) || {}),
    plan_tier: "max",
    upgraded_to_max_at: now,
  };

  await supabase
    .from("stores")
    .update({
      plan_tier: "max",
      settings: updatedSettings,
      updated_at: now,
    })
    .eq("id", identity.store_id);

  try {
    const { recordSubscriptionMonthlyFee } = await import("./billing-ledger.functions");
    await recordSubscriptionMonthlyFee({
      data: {
        storeId: identity.store_id!,
        amountCents: 9900,
      },
    });
  } catch (err) {
    console.warn("[ads] Aviso ao registrar assinatura mensal Waesy Max:", err);
  }

  return { success: true, planTier: "max" as const };
});

export const connectExternalAdAccountOAuth = createServerFn({ method: "POST" })
  .validator(
    z.object({
      platform: z.enum(["meta_ads", "google_ads"]),
      accountId: z.string().min(3, "ID da conta de anúncios obrigatório"),
      accountName: z.string().min(2).default("Conta Business"),
      oauthAccessToken: z.string().min(8, "Token OAuth 2.0 / API Key inválido"),
      pixelOrConversionId: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    await assertWaesyMaxTier(supabase, identity.store_id!, identity.isPlatformAdmin);

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    // V143 Security E2E: Encriptação AES-256-GCM antes de gravar no banco de dados
    const encryptedOAuthToken = encryptSecret(data.oauthAccessToken.trim());

    const { data: existing } = await supabase
      .from("store_ad_accounts")
      .select("id")
      .eq("store_id", identity.store_id)
      .eq("platform", data.platform)
      .maybeSingle();

    if (existing?.id) {
      await supabase
        .from("store_ad_accounts")
        .update({
          account_id: data.accountId.trim(),
          account_name: data.accountName.trim(),
          oauth_access_token: encryptedOAuthToken,
          token_expires_at: expiresAt,
          pixel_id: data.platform === "meta_ads" ? data.pixelOrConversionId || null : null,
          conversion_id: data.platform === "google_ads" ? data.pixelOrConversionId || null : null,
          status: "connected",
          last_api_sync_at: now,
          updated_at: now,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("store_ad_accounts").insert({
        store_id: identity.store_id,
        platform: data.platform,
        account_id: data.accountId.trim(),
        account_name: data.accountName.trim(),
        oauth_access_token: encryptedOAuthToken,
        token_expires_at: expiresAt,
        pixel_id: data.platform === "meta_ads" ? data.pixelOrConversionId || null : null,
        conversion_id: data.platform === "google_ads" ? data.pixelOrConversionId || null : null,
        status: "connected",
        last_api_sync_at: now,
      });
    }

    // Sincroniza flag de conexão real em stores.settings.ad_channels
    const { data: storeRow } = await supabase
      .from("stores")
      .select("settings")
      .eq("id", identity.store_id)
      .maybeSingle();

    const currSettings = (storeRow?.settings as Record<string, any>) || {};
    const currChannels = currSettings.ad_channels || {};
    const updatedChannels = {
      ...currChannels,
      ...(data.platform === "meta_ads"
        ? { meta_ad_account_id: data.accountId.trim(), meta_pixel_id: data.pixelOrConversionId?.trim() || currChannels.meta_pixel_id }
        : { google_customer_id: data.accountId.trim(), google_conversion_id: data.pixelOrConversionId?.trim() || currChannels.google_conversion_id }),
    };

    await supabase
      .from("stores")
      .update({
        settings: {
          ...currSettings,
          meta_pixel_id: data.platform === "meta_ads" && data.pixelOrConversionId ? data.pixelOrConversionId.trim() : currSettings.meta_pixel_id,
          ad_channels: updatedChannels,
        },
      })
      .eq("id", identity.store_id);

    return {
      success: true,
      platform: data.platform,
      accountId: data.accountId,
      encryptionAlgorithm: "AES-256-GCM",
      syncedAt: now,
    };
  });

export const dispatchExternalMetaOrGoogleCampaign = createServerFn({ method: "POST" })
  .validator(
    z.object({
      platform: z.enum(["meta_ads", "google_ads"]),
      campaignTitle: z.string().min(2),
      dailyBudgetCents: z.number().int().min(1000),
      durationDays: z.number().int().min(1).max(90).default(7),
      productId: z.string().uuid().optional(),
      classifiedId: z.string().uuid().optional(),
      headline: z.string().min(2),
      bodyCopy: z.string().min(5),
      callToAction: z.string().default("SHOP_NOW"),
      imageUrl: z.string().optional(),
      destinationUrl: z.string().min(5),
      targetLocation: z.string().trim().min(2, "Informe a localidade de segmentação."),
      targetRadiusKm: z.number().int().min(1).max(100),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

    // 1. Strict Max Tier Gate
    await assertWaesyMaxTier(supabase, identity.store_id!, identity.isPlatformAdmin);

    const totalBudgetCents = data.dailyBudgetCents * data.durationDays;
    const now = new Date();
    const endsAt = new Date(now.getTime() + data.durationDays * 24 * 60 * 60 * 1000);

    // 2. Fetch OAuth 2.0 credentials for the store (or global network credentials)
    const { data: oauthAccount } = await supabase
      .from("store_ad_accounts")
      .select("account_id, oauth_access_token, pixel_id, conversion_id")
      .eq("store_id", identity.store_id)
      .eq("platform", data.platform)
      .maybeSingle();

    const hasOwnAccount = Boolean(oauthAccount?.account_id && oauthAccount?.oauth_access_token);
    if (!hasOwnAccount) {
      throw new Error(
        `INTEGRAÇÃO INATIVA (${data.platform.toUpperCase()}): Nenhuma chave OAuth 2.0 encriptada encontrada no cofre da loja. Ative a integração antes de disparar campanhas.`
      );
    }

    const rawAccessToken = decryptSecret(oauthAccount!.oauth_access_token);
    const adAccountId = oauthAccount!.account_id.replace(/^act_/, "");
    let externalCampaignId = "";
    let externalApiStatus = "";

    if (data.platform === "meta_ads") {
      const graphUrl = `https://graph.facebook.com/v20.0/act_${adAccountId}/campaigns`;
      const graphRes = await fetch(graphUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.campaignTitle,
          objective: "OUTCOME_SALES",
          status: "ACTIVE",
          special_ad_categories: [],
          daily_budget: data.dailyBudgetCents,
          access_token: rawAccessToken,
        }),
      });
      const graphJson = await graphRes.json().catch(() => ({}));
      if (!graphRes.ok || !graphJson?.id) {
        throw new Error(
          `Erro Meta Graph API (${graphRes.status}): ${graphJson?.error?.message || "Credencial OAuth recusada pelo servidor da Meta."}`
        );
      }
      externalCampaignId = String(graphJson.id);
      externalApiStatus = "live_meta_graph_api";
    } else {
      const customerId = adAccountId.replace(/-/g, "");
      const googleUrl = `https://googleads.googleapis.com/v17/customers/${customerId}/campaigns:mutate`;
      const googleRes = await fetch(googleUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rawAccessToken}`,
          "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operations: [
            {
              create: {
                name: data.campaignTitle,
                advertisingChannelType: "SEARCH",
                status: "ENABLED",
              },
            },
          ],
        }),
      });
      const googleJson = await googleRes.json().catch(() => ({}));
      if (!googleRes.ok || !googleJson?.results?.[0]?.resourceName) {
        throw new Error(
          `Erro Google Ads API (${googleRes.status}): ${googleJson?.error?.message || "Credencial OAuth recusada pelo servidor do Google Ads."}`
        );
      }
      externalCampaignId = String(googleJson.results[0].resourceName);
      externalApiStatus = "live_google_ads_api";
    }

    // 4. Record in ad_campaigns + ad_ledger (V109) + invoice_ledger (V141/V142)
    const splitResult = await recordAdCampaignAndLedgerSplit({
      storeId: identity.store_id,
      classifiedId: data.classifiedId || null,
      title: data.campaignTitle,
      totalBudgetCents,
      hasOwnAdAccount: hasOwnAccount,
      destinationPlatform: data.platform,
      startsAt: now.toISOString(),
      endsAt: endsAt.toISOString(),
      description: `Campanha Externa (${data.platform.toUpperCase()}): ${data.campaignTitle}`,
      metadata: {
        external_campaign_id: externalCampaignId,
        external_api_status: externalApiStatus,
        headline: data.headline,
        body_copy: data.bodyCopy,
        destination_url: data.destinationUrl,
        target_location: data.targetLocation,
        target_radius_km: data.targetRadiusKm,
      },
    });

    if (data.productId) {
      await supabase
        .from("products")
        .update({
          is_sponsored: true,
          sponsored_until: endsAt.toISOString(),
        })
        .eq("id", data.productId)
        .eq("store_id", identity.store_id);
    }

    const { executeAtomicInvoiceLedgerBoost } = await import("./billing-ledger.functions");
    const invoiceReceipt = await executeAtomicInvoiceLedgerBoost({
      storeId: identity.store_id,
      profileId: identity.id,
      entityType: "external_ad_campaign",
      entityId: splitResult.campaignId || data.productId || identity.store_id!,
      originalAmountCents: totalBudgetCents,
      description: `Tráfego Externo ${data.platform === "meta_ads" ? "Meta Ads" : "Google Ads"} - ${data.campaignTitle}`,
      metadata: {
        external_campaign_id: externalCampaignId,
        external_api_status: externalApiStatus,
        routing_mode: splitResult.split.routing_mode,
      },
    });

    return {
      success: true,
      campaignId: splitResult.campaignId,
      externalCampaignId,
      externalApiStatus,
      invoiceId: invoiceReceipt.invoiceId,
      ledgerEntryId: invoiceReceipt.ledgerEntryId,
      totalBudgetCents,
    };
  });

/**
 * ============================================================================
 * 10. FASE 3: AI AD BUILDER (CONEXÃO POOL DE IA V127 + ZOD ESTRUTURADO)
 * ============================================================================
 */
const AiAdCreativeSchema = z.object({
  headline: z.string().trim().min(1).max(38),
  bodyCopy: z.string().trim().min(1).max(200),
  callToActionLabel: z.string().trim().min(1).max(18),
  badgeText: z.string().trim().min(1).max(16),
  targetInterests: z.array(z.string().trim().min(1)).length(3),
}).strict();

export function parseAiAdCreative(rawText: string) {
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("A resposta da IA não contém JSON válido.");
  const candidate = JSON.parse(jsonMatch[0]);
  const validated = AiAdCreativeSchema.safeParse(candidate);
  if (!validated.success) throw new Error("A resposta da IA não respeitou o formato exigido.");
  return validated.data;
}

export const generateAiAdCreativeFromCatalog = createServerFn({ method: "POST" })
  .validator(
    z.object({
      itemType: z.enum(["product", "classified"]).default("product"),
      itemId: z.string().uuid(),
      platform: z.enum(["meta_instagram", "meta_facebook", "google_search", "waesy_vitrine"]).default("meta_instagram"),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

    // Gate Waesy Max
    await assertWaesyMaxTier(supabase, identity.store_id!, identity.isPlatformAdmin);

    const { data: store, error: storeError } = await supabase
      .from("stores")
      .select("name, slug, city")
      .eq("id", identity.store_id)
      .maybeSingle();
    if (storeError || !store) {
      console.error("[ads] Erro ao carregar loja para criativo:", storeError);
      throw new Error("Não foi possível carregar a loja para gerar o criativo.");
    }

    let title: string;
    let description: string;
    let priceCents: number;
    let imageUrl = "";
    let destinationUrl: string;
    const storeSlug = store?.slug || identity.store_id;

    if (data.itemType === "product") {
      const { data: prod, error: productError } = await supabase
        .from("products")
        .select("id, title, description, price_cents, product_media(url)")
        .eq("id", data.itemId)
        .eq("store_id", identity.store_id)
        .maybeSingle();
      if (productError || !prod) {
        console.error("[ads] Produto ausente, inacessível ou erro de consulta:", productError);
        throw new Error("O produto não existe ou não pertence a esta loja. Selecione um item válido do catálogo.");
      }
      title = prod.title;
      description = prod.description || "";
      priceCents = Number(prod.price_cents);
      const mediaArr = (prod as any).product_media || [];
      imageUrl = mediaArr[0]?.url || "";
      destinationUrl = `https://usewaesy.pages.dev/loja/${storeSlug}/produto/${prod.id}?utm_source=${data.platform}&utm_medium=cpc`;
    } else {
      const { data: classified, error: classifiedError } = await supabase
        .from("classifieds")
        .select("id, title, content, price_cents, images")
        .eq("id", data.itemId)
        .eq("store_id", identity.store_id)
        .maybeSingle();
      if (classifiedError || !classified) {
        console.error("[ads] Classificado ausente, inacessível ou erro de consulta:", classifiedError);
        throw new Error("O classificado não existe ou não pertence a esta loja. Selecione um item válido do catálogo.");
      }
      title = classified.title;
      description = classified.content || "";
      priceCents = Number(classified.price_cents);
      const imgs = Array.isArray(classified.images) ? classified.images : [];
      imageUrl = (imgs[0] as string) || "";
      destinationUrl = `https://usewaesy.pages.dev/classificados/${classified.id}?utm_source=${data.platform}&utm_medium=cpc`;
    }

    const priceFormatted = priceCents > 0 ? `R$ ${(priceCents / 100).toFixed(2).replace(".", ",")}` : "Consulte";

    try {
      const { executeUnifiedAiCall } = await import("./api-orchestrator.functions");
      const observedCity = typeof store.city === "string" && store.city.trim() ? ` Cidade cadastrada: ${store.city.trim()}.` : "";
      const prompt = `Crie somente uma sugestão de copy publicitária em JSON estrito com as chaves: headline (máx. 38 caracteres), bodyCopy (máx. 200 caracteres), callToActionLabel (máx. 18 caracteres), badgeText (máx. 16 caracteres) e targetInterests (array de 3 strings). Use apenas os dados comprovados abaixo; não invente benefícios, disponibilidade, urgência, descontos, atendimento, localização ou resultados, nem prometa conversão. Se a informação não estiver nos dados, omita-a. A copy é rascunho para revisão humana. Item: "${title}". Descrição cadastrada: "${description}". Preço cadastrado: ${priceFormatted}.${observedCity}`;
      const aiResult = await executeUnifiedAiCall({
        feature: "marketing_ad_copy",
        prompt,
        storeId: identity.store_id || undefined,
      });

      const rawText = typeof aiResult === "string" ? aiResult : (aiResult as any)?.text || (aiResult as any)?.content || "";
      const parsedCreative = parseAiAdCreative(rawText);

      return {
        itemId: data.itemId,
        itemType: data.itemType,
        platform: data.platform,
        title,
        priceCents,
        priceFormatted,
        imageUrl,
        destinationUrl,
        isDraft: true,
        creative: parsedCreative,
        canvasSpec: {
          width: 1080,
          height: data.platform === "meta_instagram" ? 1350 : 1080,
          aspectRatio: data.platform === "meta_instagram" ? "4:5" : "1:1",
          overlayHeadline: parsedCreative.headline,
          overlayPrice: priceFormatted,
          overlayBadge: parsedCreative.badgeText,
        },
      };
    } catch (aiErr) {
      console.error("[ads] Falha ao gerar/validar copy de anúncio:", aiErr);
      throw new Error("Não foi possível gerar uma copy válida com IA. Nenhum texto substituto foi criado; tente novamente.");
    }
  });

/**
 * ============================================================================
 * 11. FASE 4: DASHBOARD DE ROI & TELEMETRIA E2E (FECHAMENTO DO LOOP V125 + V139)
 * ============================================================================
 */
export function isPaidOrderAttributedToCampaignWithinPeriod(
  order: { status?: string; attributed_campaign_id?: string | null; utm_campaign?: string | null; created_at?: string | null },
  campaign: { id: string; starts_at?: string | null; ends_at?: string | null; created_at?: string | null },
  now = new Date(),
) {
  if (order.status !== "paid") return false;
  const exactIdMatch = order.attributed_campaign_id === campaign.id ||
    (!order.attributed_campaign_id && order.utm_campaign === campaign.id);
  if (!exactIdMatch || !order.created_at) return false;
  const orderTime = new Date(order.created_at).getTime();
  const startTime = new Date(campaign.starts_at || campaign.created_at || "").getTime();
  const endTime = campaign.ends_at ? new Date(campaign.ends_at).getTime() : now.getTime();
  return Number.isFinite(orderTime) && Number.isFinite(startTime) && Number.isFinite(endTime) &&
    orderTime >= startTime && orderTime <= endTime;
}

export const getMarketingRoiClosedLoopMetrics = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

  // 1. Campanhas da loja
  const { data: campaigns, error: campaignsError } = await supabase
    .from("ad_campaigns")
    .select("id, title, product_id, budget_cents, status, starts_at, ends_at, created_at, settings")
    .eq("store_id", identity.store_id)
    .order("created_at", { ascending: false });

  if (campaignsError) {
    console.error("[ads] Erro ao carregar campanhas para métricas:", campaignsError);
    throw new Error("Não foi possível carregar as campanhas para as métricas.");
  }
  const campaignList = campaigns || [];
  const campaignIds = campaignList.map((c) => c.id);

  // 2. Telemetria de Cliques e Visualizações (V125)
  const { data: adEvents, error: eventsError } = await supabase
    .from("ad_events")
    .select("campaign_id, event_type")
    .in("campaign_id", campaignIds.length > 0 ? campaignIds : ["00000000-0000-0000-0000-000000000000"]);

  if (eventsError) {
    console.error("[ads] Erro ao carregar eventos para métricas:", eventsError);
    throw new Error("Não foi possível carregar os eventos das campanhas.");
  }

  // 3. Somente pedidos pagos da loja; associação exige ID explícito da campanha.
  const { data: storeOrders, error: ordersError } = await supabase
    .from("orders")
    .select("id, total_cents, status, attributed_campaign_id, utm_campaign, created_at")
    .eq("store_id", identity.store_id)
    .eq("status", "paid");

  if (ordersError) {
    console.error("[ads] Erro ao carregar pedidos pagos para métricas:", ordersError);
    throw new Error("Não foi possível carregar os pedidos pagos para as métricas.");
  }

  const ordersList = storeOrders || [];

  // 4. Lançamentos do invoice_ledger (V141/V142)
  const { data: ledgerRows, error: ledgerError } = await supabase
    .from("invoice_ledger")
    .select("id, entity_type, entity_id, original_amount_cents, discount_cents, amount_cents, plan_tier, status, description, created_at")
    .eq("store_id", identity.store_id)
    .order("created_at", { ascending: false })
    .limit(30);

  if (ledgerError) {
    console.error("[ads] Erro ao carregar invoice ledger para métricas:", ledgerError);
    throw new Error("Não foi possível carregar os lançamentos do livro-razão.");
  }

  let totalAttributedRevenueCents = 0;
  let totalAttributedOrdersCount = 0;
  let totalImpressions = 0;
  let totalClicks = 0;

  const campaignRoiBreakdown = campaignList.map((camp) => {
    const campEvents = (adEvents || []).filter((e) => e.campaign_id === camp.id);
    const views = campEvents.filter((e) => e.event_type === "view").length;
    const clicks = campEvents.filter((e) => e.event_type === "click").length;
    const attributedOrders = ordersList.filter((order: any) =>
      isPaidOrderAttributedToCampaignWithinPeriod(order, camp),
    );

    const revenueCents = attributedOrders.reduce((acc, order: any) => {
      if (order.total_cents == null || order.total_cents === "") throw new Error("Pedido pago sem valor; receita não disponível.");
      const amount = Number(order.total_cents);
      if (!Number.isFinite(amount)) throw new Error("Pedido pago com valor inválido; receita não disponível.");
      return acc + amount;
    }, 0);

    totalAttributedRevenueCents += revenueCents;
    totalAttributedOrdersCount += attributedOrders.length;
    totalImpressions += views;
    totalClicks += clicks;

    const revenueReais = (revenueCents / 100).toFixed(2).replace(".", ",");
    const periodStart = new Date(camp.starts_at || camp.created_at).toLocaleDateString("pt-BR");
    const periodEnd = camp.ends_at ? new Date(camp.ends_at).toLocaleDateString("pt-BR") : "até hoje";

    return {
      campaignId: camp.id,
      title: camp.title,
      status: camp.status,
      plannedBudgetCents: camp.budget_cents == null ? null : Number(camp.budget_cents),
      spendCents: null,
      revenueCents,
      ordersCount: attributedOrders.length,
      impressionsCount: views,
      clicksCount: clicks,
      periodLabel: `${periodStart} a ${periodEnd}`,
      revenueLabel: `R$ ${revenueReais} em pedidos pagos associados por ID exato no período`,
    };
  });

  const globalRevenueReais = (totalAttributedRevenueCents / 100).toFixed(2).replace(".", ",");
  const periodLabels = campaignRoiBreakdown.map((campaign: any) => campaign.periodLabel);

  return {
    totalPlannedBudgetCents: campaignList.every((campaign: any) => campaign.budget_cents != null)
      ? campaignList.reduce((sum: number, campaign: any) => sum + Number(campaign.budget_cents), 0)
      : null,
    totalSpendCents: null,
    totalAttributedRevenueCents,
    totalAttributedOrdersCount,
    totalImpressions,
    totalClicks,
    headline: `R$ ${globalRevenueReais} em pedidos pagos associados por identificador exato de campanha`,
    attributionRule: "Somente pedidos com status paid e attributed_campaign_id igual ao ID da campanha (ou, sem esse ID, utm_campaign exatamente igual); created_at deve estar no período da campanha. Associação não comprova causalidade.",
    periodLabel: periodLabels.length ? `Períodos individuais: ${periodLabels.join("; ")}` : "Sem campanhas no período.",
    spendLabel: "Gasto real não observado; não há ROI calculado. Orçamentos exibidos são planejados.",
    campaigns: campaignRoiBreakdown,
    invoiceLedgerEntries: ledgerRows || [],
  };
});
