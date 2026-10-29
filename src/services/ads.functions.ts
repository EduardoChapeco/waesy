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
  leads_count?: number;
  converted_leads_count?: number;
  revenue_cents?: number;
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

 // Busca leads associados a anúncios desta loja para cálculo de CPL e Receita Real
 const { data: campaignLeads } = await supabase
   .from("leads_crm")
   .select("id, custom_fields, estimated_value_cents, status")
   .eq("store_id", identity.store_id);

 const leadsMap = new Map<string, { count: number; convertedCount: number; revenueCents: number }>();
 (campaignLeads || []).forEach((l: any) => {
   const cf = (l.custom_fields as Record<string, any>) || {};
   const adId = cf.meta_ad_id || cf.campaign_id;
   if (adId) {
     const curr = leadsMap.get(adId) || { count: 0, convertedCount: 0, revenueCents: 0 };
     curr.count++;
     if (l.status === "converted" || l.status === "won") {
       curr.convertedCount++;
       curr.revenueCents += l.estimated_value_cents || 0;
     }
     leadsMap.set(adId, curr);
   }
 });

 return (campaigns || []).map((c: any) => {
    const stats = eventsCount.get(c.id) || { views: 0, clicks: 0 };
    const lData = leadsMap.get(c.id) || leadsMap.get(c.external_campaign_id) || { count: 0, convertedCount: 0, revenueCents: 0 };
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
      leads_count: lData.count,
      converted_leads_count: lData.convertedCount,
      revenue_cents: lData.revenueCents,
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
      .maybeSingle();

    // Sincroniza também em store_ad_campaigns (se o ID pertencer à tabela externa ou tiver mesmo título na loja)
    const { data: extCampaign } = await supabase
      .from("store_ad_campaigns")
      .select("id, platform, external_campaign_id, title")
      .eq("store_id", identity.store_id)
      .or(updated?.title ? `id.eq.${campaignId},title.eq.${updated.title}` : `id.eq.${campaignId}`)
      .maybeSingle();

    let remoteSyncStatus = "local_only";

    if (extCampaign) {
      await supabase
        .from("store_ad_campaigns")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", extCampaign.id);

      const extId = String(extCampaign.external_campaign_id || "").trim();
      if (extId && !extId.startsWith("loc_") && !extId.startsWith("err_")) {
        const resolvedAuth = await resolveValidStoreAdToken(
          supabase,
          identity.store_id,
          extCampaign.platform as "meta_ads" | "google_ads"
        );
        if (resolvedAuth?.accessToken) {
          try {
            if (extCampaign.platform === "meta_ads") {
              const metaStatus = status === "active" ? "ACTIVE" : "PAUSED";
              const res = await fetch(`https://graph.facebook.com/v20.0/${extId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  status: metaStatus,
                  access_token: resolvedAuth.accessToken,
                }),
              });
              remoteSyncStatus = res.ok ? `meta_${metaStatus.toLowerCase()}` : "meta_sync_warning";
            } else if (extCampaign.platform === "google_ads") {
              const cleanCustomerId = String(resolvedAuth.accountId || "").replace(/\D/g, "");
              const devToken = resolvedAuth.developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "";
              const gStatus = status === "active" ? "ENABLED" : "PAUSED";
              if (cleanCustomerId && devToken) {
                const resourceName = extId.startsWith("customers/")
                  ? extId
                  : `customers/${cleanCustomerId}/campaigns/${extId}`;
                const res = await fetch(
                  `https://googleads.googleapis.com/v17/customers/${cleanCustomerId}/campaigns:mutate`,
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${resolvedAuth.accessToken}`,
                      "developer-token": devToken,
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      operations: [
                        {
                          updateMask: "status",
                          update: {
                            resourceName,
                            status: gStatus,
                          },
                        },
                      ],
                    }),
                  }
                );
                remoteSyncStatus = res.ok ? `google_${gStatus.toLowerCase()}` : "google_sync_warning";
              }
            }
          } catch {
            remoteSyncStatus = "remote_unreachable";
          }
        }
      }
    }

    if (error && !extCampaign) {
      console.error("[ads] Error updating campaign status:", error);
      throw new Error("Erro ao atualizar status da campanha.");
    }

    return {
      ...(updated || extCampaign || { id: campaignId, status }),
      remoteSyncStatus,
    };
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
    .select("id, platform, account_id, account_name, status, pixel_id, conversion_id, last_api_sync_at, token_expires_at, metadata")
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
      oauthAccessToken: z.string().min(8, "Token OAuth 2.0 / API Key inválido").optional(),
      oauthRefreshToken: z.string().optional(),
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

    const { data: existing } = await supabase
      .from("store_ad_accounts")
      .select("id, oauth_access_token, oauth_refresh_token, metadata")
      .eq("store_id", identity.store_id)
      .eq("platform", data.platform)
      .maybeSingle();

    // Permite atualizar apenas a conta/pixel selecionada quando o token já foi salvo pelo OAuth 1-Clique
    const encryptedOAuthToken = data.oauthAccessToken?.trim()
      ? encryptSecret(data.oauthAccessToken.trim())
      : existing?.oauth_access_token || "";

    if (!encryptedOAuthToken) {
      throw new Error("Token OAuth 2.0 obrigatório para a primeira conexão.");
    }

    const encryptedRefreshToken = data.oauthRefreshToken?.trim()
      ? encryptSecret(data.oauthRefreshToken.trim())
      : existing?.oauth_refresh_token || null;

    if (existing?.id) {
      await supabase
        .from("store_ad_accounts")
        .update({
          account_id: data.accountId.trim(),
          account_name: data.accountName.trim(),
          oauth_access_token: encryptedOAuthToken,
          oauth_refresh_token: encryptedRefreshToken,
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
        oauth_refresh_token: encryptedRefreshToken,
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

/**
 * Helper interno: Resolve o token OAuth descriptografado da loja e renova automaticamente
 * caso seja Google Ads com refresh_token disponível e access_token expirado.
 */
export async function resolveValidStoreAdToken(
  supabase: any,
  storeId: string,
  platform: "meta_ads" | "google_ads"
): Promise<{
  accountId: string;
  accountName: string;
  accessToken: string;
  pixelId: string | null;
  conversionId: string | null;
  developerToken: string;
  metadata: Record<string, any>;
}> {
  const { data: oauthAccount } = await supabase
    .from("store_ad_accounts")
    .select("id, account_id, account_name, oauth_access_token, oauth_refresh_token, token_expires_at, pixel_id, conversion_id, metadata")
    .eq("store_id", storeId)
    .eq("platform", platform)
    .maybeSingle();

  if (!oauthAccount?.account_id || !oauthAccount?.oauth_access_token) {
    throw new Error(
      `INTEGRAÇÃO INATIVA (${platform.toUpperCase()}): Nenhuma chave OAuth 2.0 encriptada encontrada no cofre da loja. Ative a integração antes de operar.`
    );
  }

  let accessToken = decryptSecret(oauthAccount.oauth_access_token);
  const expiresAtMs = oauthAccount.token_expires_at ? new Date(oauthAccount.token_expires_at).getTime() : Infinity;

  // Renovação automática OAuth 2.0 para Google Ads quando próximo de expirar
  if (
    platform === "google_ads" &&
    oauthAccount.oauth_refresh_token &&
    Number.isFinite(expiresAtMs) &&
    expiresAtMs < Date.now() + 60_000
  ) {
    try {
      const refreshToken = decryptSecret(oauthAccount.oauth_refresh_token);
      const clientId = process.env.GOOGLE_ADS_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "";
      const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || "";
      if (clientId && clientSecret && refreshToken) {
        const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }).toString(),
        });
        const refreshJson = await refreshRes.json().catch(() => ({}));
        if (refreshRes.ok && refreshJson?.access_token) {
          accessToken = String(refreshJson.access_token);
          const newExpiresIso = new Date(Date.now() + (Number(refreshJson.expires_in) || 3600) * 1000).toISOString();
          await supabase
            .from("store_ad_accounts")
            .update({
              oauth_access_token: encryptSecret(accessToken),
              token_expires_at: newExpiresIso,
              updated_at: new Date().toISOString(),
            })
            .eq("id", oauthAccount.id);
        }
      }
    } catch (refErr) {
      console.warn("[ads] Falha ao renovar token OAuth Google Ads:", refErr);
    }
  }

  return {
    accountId: String(oauthAccount.account_id),
    accountName: String(oauthAccount.account_name || "Conta Business"),
    accessToken,
    pixelId: oauthAccount.pixel_id || null,
    conversionId: oauthAccount.conversion_id || null,
    developerToken: process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
    metadata: ((oauthAccount.metadata as Record<string, any>) || {}),
  };
}

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

    // 2. Resolve OAuth 2.0 credentials (com auto-refresh se aplicável)
    const resolvedAuth = await resolveValidStoreAdToken(supabase, identity.store_id!, data.platform);
    const hasOwnAccount = true;
    const rawAccessToken = resolvedAuth.accessToken;
    const adAccountId = resolvedAuth.accountId.replace(/^act_/, "");
    let externalCampaignId = "";
    let externalAdSetOrGroupId: string | null = null;
    let externalCreativeId: string | null = null;
    let externalAdId: string | null = null;
    let externalApiStatus = "";

    if (data.platform === "meta_ads") {
      // Passo 2.1: Cria a Campanha na Meta Graph API
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

      // Passo 2.2: Tenta provisionar Conjunto de Anúncios (AdSet) + Criativo (AdCreative) + Anúncio (Ad)
      try {
        const adSetRes = await fetch(`https://graph.facebook.com/v20.0/act_${adAccountId}/adsets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `${data.campaignTitle} • Conjunto ${data.targetLocation} (${data.targetRadiusKm}km)`,
            campaign_id: externalCampaignId,
            daily_budget: data.dailyBudgetCents,
            billing_event: "IMPRESSIONS",
            optimization_goal: "LINK_CLICKS",
            bid_strategy: "LOWEST_COST_WITHOUT_CAP",
            targeting: {
              geo_locations: { countries: ["BR"] },
            },
            status: "ACTIVE",
            access_token: rawAccessToken,
          }),
        });
        const adSetJson = await adSetRes.json().catch(() => ({}));
        if (adSetRes.ok && adSetJson?.id) {
          externalAdSetOrGroupId = String(adSetJson.id);

          const igPages = Array.isArray(resolvedAuth.metadata?.discovered_instagram_accounts)
            ? resolvedAuth.metadata.discovered_instagram_accounts
            : [];
          const pageId = igPages[0]?.pageId || resolvedAuth.metadata?.primary_page_id || null;

          if (pageId) {
            const creativeRes = await fetch(`https://graph.facebook.com/v20.0/act_${adAccountId}/adcreatives`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: `Criativo • ${data.headline}`,
                object_story_spec: {
                  page_id: pageId,
                  link_data: {
                    message: data.bodyCopy,
                    link: data.destinationUrl,
                    name: data.headline,
                    ...(data.imageUrl ? { picture: data.imageUrl } : {}),
                    call_to_action: {
                      type: "SHOP_NOW",
                      value: { link: data.destinationUrl },
                    },
                  },
                },
                access_token: rawAccessToken,
              }),
            });
            const creativeJson = await creativeRes.json().catch(() => ({}));
            if (creativeRes.ok && creativeJson?.id) {
              externalCreativeId = String(creativeJson.id);
              const adRes = await fetch(`https://graph.facebook.com/v20.0/act_${adAccountId}/ads`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: `Anúncio • ${data.headline}`,
                  adset_id: externalAdSetOrGroupId,
                  creative: { creative_id: externalCreativeId },
                  status: "ACTIVE",
                  access_token: rawAccessToken,
                }),
              });
              const adJson = await adRes.json().catch(() => ({}));
              if (adRes.ok && adJson?.id) {
                externalAdId = String(adJson.id);
              }
            }
          }
        }
      } catch (subErr) {
        console.warn("[ads:meta] Campanha raiz criada; sub-entidades AdSet/Creative requerem Page vinculada:", subErr);
      }
    } else {
      const customerId = adAccountId.replace(/-/g, "");
      const googleUrl = `https://googleads.googleapis.com/v17/customers/${customerId}/campaigns:mutate`;
      const googleRes = await fetch(googleUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${rawAccessToken}`,
          "developer-token": resolvedAuth.developerToken,
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

      // Tenta provisionar AdGroup e ResponsiveSearchAd no Google Ads
      try {
        const adGroupRes = await fetch(
          `https://googleads.googleapis.com/v17/customers/${customerId}/adGroups:mutate`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${rawAccessToken}`,
              "developer-token": resolvedAuth.developerToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              operations: [
                {
                  create: {
                    name: `${data.campaignTitle} • Grupo Principal`,
                    campaign: externalCampaignId,
                    status: "ENABLED",
                    type: "SEARCH_STANDARD",
                  },
                },
              ],
            }),
          }
        );
        const adGroupJson = await adGroupRes.json().catch(() => ({}));
        if (adGroupRes.ok && adGroupJson?.results?.[0]?.resourceName) {
          externalAdSetOrGroupId = String(adGroupJson.results[0].resourceName);

          const adRes = await fetch(
            `https://googleads.googleapis.com/v17/customers/${customerId}/adGroupAds:mutate`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${rawAccessToken}`,
                "developer-token": resolvedAuth.developerToken,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                operations: [
                  {
                    create: {
                      adGroup: externalAdSetOrGroupId,
                      status: "ENABLED",
                      ad: {
                        finalUrls: [data.destinationUrl],
                        responsiveSearchAd: {
                          headlines: [
                            { text: data.headline.slice(0, 30) },
                            { text: data.campaignTitle.slice(0, 30) },
                            { text: "Confira na Vitrine Oficial" },
                          ],
                          descriptions: [
                            { text: data.bodyCopy.slice(0, 90) },
                            { text: `Atendimento em ${data.targetLocation.slice(0, 50)}` },
                          ],
                        },
                      },
                    },
                  },
                ],
              }),
            }
          );
          const adJson = await adRes.json().catch(() => ({}));
          if (adRes.ok && adJson?.results?.[0]?.resourceName) {
            externalAdId = String(adJson.results[0].resourceName);
          }
        }
      } catch (gSubErr) {
        console.warn("[ads:google] Campanha raiz criada; AdGroup/RSA complementar:", gSubErr);
      }
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
        external_adset_or_group_id: externalAdSetOrGroupId,
        external_creative_id: externalCreativeId,
        external_ad_id: externalAdId,
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
        external_adset_or_group_id: externalAdSetOrGroupId,
        external_ad_id: externalAdId,
        external_api_status: externalApiStatus,
        routing_mode: splitResult.split.routing_mode,
      },
    });

    return {
      success: true,
      campaignId: splitResult.campaignId,
      externalCampaignId,
      externalAdSetOrGroupId,
      externalCreativeId,
      externalAdId,
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
        taskType: "fast_json",
        responseFormat: "json_object",
        expectJson: true,
        prompt,
        storeId: identity.store_id || undefined,
        ownerId: identity.id || undefined,
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
  let observedSpendSumCents = 0;
  let hasAnyObservedSpend = false;

  const campaignRoiBreakdown = campaignList.map((camp) => {
    const campEvents = (adEvents || []).filter((e) => e.campaign_id === camp.id);
    const s = ((camp as any).settings as Record<string, any>) || {};
    const syncedViews = Number(s.synced_impressions || 0);
    const syncedClicks = Number(s.synced_clicks || 0);
    const views = Math.max(campEvents.filter((e) => e.event_type === "view").length, syncedViews);
    const clicks = Math.max(campEvents.filter((e) => e.event_type === "click").length, syncedClicks);

    const realSpentCents =
      s.real_spent_cents != null && s.real_spent_cents !== "" && Number.isFinite(Number(s.real_spent_cents))
        ? Number(s.real_spent_cents)
        : null;

    if (realSpentCents != null) {
      hasAnyObservedSpend = true;
      observedSpendSumCents += realSpentCents;
    }

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
      spendCents: realSpentCents,
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
  const totalSpendCents = hasAnyObservedSpend ? observedSpendSumCents : null;

  return {
    totalPlannedBudgetCents: campaignList.every((campaign: any) => campaign.budget_cents != null)
      ? campaignList.reduce((sum: number, campaign: any) => sum + Number(campaign.budget_cents), 0)
      : null,
    totalSpendCents,
    totalAttributedRevenueCents,
    totalAttributedOrdersCount,
    totalImpressions,
    totalClicks,
    headline: `R$ ${globalRevenueReais} em pedidos pagos associados por identificador exato de campanha`,
    attributionRule: "Somente pedidos com status paid e attributed_campaign_id igual ao ID da campanha (ou, sem esse ID, utm_campaign exatamente igual); created_at deve estar no período da campanha. Associação não comprova causalidade.",
    periodLabel: periodLabels.length ? `Períodos individuais: ${periodLabels.join("; ")}` : "Sem campanhas no período.",
    spendLabel: totalSpendCents != null
      ? `Gasto real sincronizado via API oficial (Meta Insights / Google Ads GAQL): R$ ${(totalSpendCents / 100).toFixed(2).replace(".", ",")}.`
      : "Gasto real não observado; não há ROI calculado. Orçamentos exibidos são planejados.",
    campaigns: campaignRoiBreakdown,
    invoiceLedgerEntries: ledgerRows || [],
  };
});

/**
 * ============================================================================
 * 12. V150: LOGIN RÁPIDO OAUTH 2.0 (1-CLIQUE), DESCOBERTA DE CONTAS & MCP ADS SKILLS
 * ============================================================================
 * Implementa os fluxos oficiais de:
 * - Google Ads MCP (`customers:listAccessibleCustomers`, `googleAds:searchStream` GAQL, Account Diagnostics, Data Manager Ingestion)
 * - Meta Ads Graph API v20.0 (`me/adaccounts`, `/insights`, Account Diagnostics, Conversions API CAPI)
 */

export const getExternalAdsOAuthUrl = createServerFn({ method: "POST" })
  .validator(
    z.object({
      platform: z.enum(["meta_ads", "google_ads"]),
      returnTo: z.string().default("/workspace/marketing/anuncios"),
      originUrl: z.string().url().optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const baseOrigin = data.originUrl || process.env.PUBLIC_APP_URL || "https://usewaesy.pages.dev";
    const redirectUri = `${baseOrigin.replace(/\/$/, "")}/api/auth/ads/callback`;

    const statePayload = Buffer.from(
      JSON.stringify({
        storeId: identity.store_id,
        platform: data.platform,
        returnTo: data.returnTo,
        ts: Date.now(),
      }),
      "utf8"
    ).toString("base64url");

    const { data: masterStore } = await supabase
      .from("stores")
      .select("settings")
      .limit(1)
      .maybeSingle();

    const globalAdNet = ((masterStore?.settings as any)?.global_ad_network as Record<string, any>) || {};

    if (data.platform === "meta_ads") {
      const metaClientId =
        process.env.META_APP_ID ||
        process.env.VITE_META_APP_ID ||
        globalAdNet.meta_app_id ||
        "";

      if (!metaClientId) {
        return {
          configured: false,
          platform: "meta_ads" as const,
          authUrl: null,
          message: "META_APP_ID ainda não configurado no ambiente global. Utilize a conexão direta via Token OAuth 2.0 abaixo ou configure o App ID no Admin Master.",
        };
      }

      const scopes = [
        "ads_management",
        "ads_read",
        "business_management",
        "pages_read_engagement",
        "pages_manage_posts",
        "instagram_basic",
        "instagram_content_publish",
      ].join(",");

      const authUrl = new URL("https://www.facebook.com/v20.0/dialog/oauth");
      authUrl.searchParams.set("client_id", metaClientId);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("state", statePayload);
      authUrl.searchParams.set("scope", scopes);
      authUrl.searchParams.set("response_type", "code");

      return {
        configured: true,
        platform: "meta_ads" as const,
        authUrl: authUrl.toString(),
        scopes: scopes.split(","),
      };
    }

    const googleClientId =
      process.env.GOOGLE_ADS_CLIENT_ID ||
      process.env.GOOGLE_CLIENT_ID ||
      globalAdNet.google_client_id ||
      "";

    if (!googleClientId) {
      return {
        configured: false,
        platform: "google_ads" as const,
        authUrl: null,
        message: "GOOGLE_ADS_CLIENT_ID ainda não configurado no ambiente global. Utilize a conexão direta via Token OAuth 2.0 abaixo ou configure o Client ID no Admin Master.",
      };
    }

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", googleClientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/adwords");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", statePayload);

    return {
      configured: true,
      platform: "google_ads" as const,
      authUrl: authUrl.toString(),
      scopes: ["https://www.googleapis.com/auth/adwords"],
    };
  });

/**
 * Descoberta automática de Contas de Anúncio, Pixels e Perfis Instagram (Meta Ads & Google Ads MCP)
 */
export const discoverAccessibleAdAccountsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      platform: z.enum(["meta_ads", "google_ads"]),
      oauthAccessTokenOverride: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    return executeDiscoverAccessibleAdAccounts(supabase, identity.store_id!, data.platform, data.oauthAccessTokenOverride);
  });

export async function executeDiscoverAccessibleAdAccounts(
  supabase: any,
  storeId: string,
  platform: "meta_ads" | "google_ads",
  oauthAccessTokenOverride?: string
) {
  let accessToken = oauthAccessTokenOverride?.trim() || "";
  let developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "";

  if (!accessToken) {
    const resolved = await resolveValidStoreAdToken(supabase, storeId, platform);
    accessToken = resolved.accessToken;
    developerToken = resolved.developerToken;
  }

  if (platform === "meta_ads") {
    const accountsRes = await fetch(
      `https://graph.facebook.com/v20.0/me/adaccounts?fields=id,account_id,name,currency,account_status,amount_spent&limit=25&access_token=${encodeURIComponent(accessToken)}`
    );
    const accountsJson = await accountsRes.json().catch(() => ({}));
    if (!accountsRes.ok) {
      throw new Error(
        `Erro Meta Graph API (${accountsRes.status}): ${accountsJson?.error?.message || "Não foi possível listar as contas de anúncio."}`
      );
    }

    const accounts = (Array.isArray(accountsJson?.data) ? accountsJson.data : []).map((acc: any) => ({
      id: String(acc.id || `act_${acc.account_id}`),
      accountId: String(acc.account_id || acc.id || "").replace(/^act_/, ""),
      name: String(acc.name || `Conta ${acc.account_id}`),
      currency: String(acc.currency || "BRL"),
      status: Number(acc.account_status) === 1 ? "ACTIVE" : "INACTIVE",
      amountSpentCents: acc.amount_spent != null ? Number(acc.amount_spent) : 0,
    }));

    const pixels: Array<{ id: string; name: string; accountId: string }> = [];
    if (accounts.length > 0) {
      try {
        const pxRes = await fetch(
          `https://graph.facebook.com/v20.0/act_${accounts[0].accountId}/adspixels?fields=id,name&limit=10&access_token=${encodeURIComponent(accessToken)}`
        );
        const pxJson = await pxRes.json().catch(() => ({}));
        if (Array.isArray(pxJson?.data)) {
          for (const px of pxJson.data) {
            if (px?.id) {
              pixels.push({
                id: String(px.id),
                name: String(px.name || `Pixel ${px.id}`),
                accountId: accounts[0].accountId,
              });
            }
          }
        }
      } catch {
        // Pixels opcionais
      }
    }

    return {
      platform: "meta_ads" as const,
      accounts,
      pixels,
      discoveredAt: new Date().toISOString(),
    };
  }

  // Google Ads MCP: listAccessibleCustomers + customer_client query
  const listRes = await fetch(
    "https://googleads.googleapis.com/v17/customers:listAccessibleCustomers",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(developerToken ? { "developer-token": developerToken } : {}),
      },
    }
  );
  const listJson = await listRes.json().catch(() => ({}));
  if (!listRes.ok) {
    throw new Error(
      `Erro Google Ads API (${listRes.status}): ${listJson?.error?.message || "Falha em listAccessibleCustomers."}`
    );
  }

  const resourceNames: string[] = Array.isArray(listJson?.resourceNames) ? listJson.resourceNames : [];
  const accounts = resourceNames.map((rName) => {
    const cleanId = String(rName).replace(/^customers\//, "").replace(/\D/g, "");
    const formatted = cleanId.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
    return {
      id: cleanId,
      accountId: formatted,
      name: `Google Ads Customer ${formatted}`,
      currency: "BRL",
      status: "ACTIVE",
      amountSpentCents: 0,
    };
  });

  return {
    platform: "google_ads" as const,
    accounts,
    pixels: [],
    discoveredAt: new Date().toISOString(),
  };
}

/**
 * Sincroniza métricas reais em tempo real via Meta Graph Insights API e Google Ads GAQL (`googleAds:searchStream`),
 * alimentando `real_spent_cents`, `synced_impressions` e `synced_clicks` nas campanhas da loja.
 */
export const syncExternalAdCampaignMetricsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      platform: z.enum(["meta_ads", "google_ads", "all"]).default("all"),
      datePreset: z.enum(["LAST_7_DAYS", "LAST_30_DAYS", "THIS_MONTH"]).default("LAST_30_DAYS"),
    }).default({})
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

    return executeSyncExternalAdCampaignMetrics(supabase, identity.store_id!, data.platform, data.datePreset);
  });

export async function executeSyncExternalAdCampaignMetrics(
  supabase: any,
  storeId: string,
  platform: "meta_ads" | "google_ads" | "all" = "all",
  datePreset: "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH" = "LAST_30_DAYS"
) {
  const { data: oauthAccounts } = await supabase
    .from("store_ad_accounts")
    .select("platform, account_id, status")
    .eq("store_id", storeId)
    .eq("status", "connected");

  const connectedPlatforms = (oauthAccounts || [])
    .map((a: any) => a.platform as "meta_ads" | "google_ads")
    .filter((p: string) => platform === "all" || p === platform);

  const { data: storeCampaigns } = await supabase
    .from("ad_campaigns")
    .select("id, title, settings, status")
    .eq("store_id", storeId);

  const campaigns = storeCampaigns || [];
  const syncedResults: Array<{
    platform: string;
    externalCampaignId: string;
    campaignName: string;
    spendCents: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctrPercent: number;
    cpcCents: number;
    frequency?: number;
    budgetLostImpressionShare?: number;
  }> = [];
  const errors: string[] = [];

  for (const plat of connectedPlatforms) {
    try {
      const auth = await resolveValidStoreAdToken(supabase, storeId, plat);

      if (plat === "meta_ads") {
        const cleanAccId = auth.accountId.replace(/^act_/, "");
        const metaPreset =
          datePreset === "LAST_7_DAYS" ? "last_7d" : datePreset === "THIS_MONTH" ? "this_month" : "last_30d";
        const insightsUrl = `https://graph.facebook.com/v20.0/act_${cleanAccId}/insights?level=campaign&date_preset=${metaPreset}&fields=campaign_id,campaign_name,spend,impressions,clicks,cpc,ctr,frequency,actions&limit=50&access_token=${encodeURIComponent(auth.accessToken)}`;

        const res = await fetch(insightsUrl);
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          errors.push(`Meta Insights (${res.status}): ${json?.error?.message || "Erro ao consultar insights."}`);
          continue;
        }

        const rows = Array.isArray(json?.data) ? json.data : [];
        for (const row of rows) {
          const spendBrl = parseFloat(row.spend || "0") || 0;
          const spendCents = Math.round(spendBrl * 100);
          const impressions = parseInt(row.impressions || "0", 10) || 0;
          const clicks = parseInt(row.clicks || "0", 10) || 0;
          const ctrPercent = parseFloat(row.ctr || "0") || 0;
          const cpcCents = Math.round((parseFloat(row.cpc || "0") || 0) * 100);
          const frequency = parseFloat(row.frequency || "0") || 0;
          const actionsArr = Array.isArray(row.actions) ? row.actions : [];
          const conversions = actionsArr
            .filter((a: any) => ["purchase", "lead", "onsite_conversion.messaging_conversation_started_7d"].includes(a.action_type))
            .reduce((acc: number, a: any) => acc + (parseInt(a.value || "0", 10) || 0), 0);

          syncedResults.push({
            platform: "meta_ads",
            externalCampaignId: String(row.campaign_id || ""),
            campaignName: String(row.campaign_name || "Campanha Meta"),
            spendCents,
            impressions,
            clicks,
            conversions,
            ctrPercent,
            cpcCents,
            frequency,
          });

          // Sincroniza na campanha local correspondente em `ad_campaigns`
          const matched = campaigns.find((c: any) => {
            const s = (c.settings as Record<string, any>) || {};
            return (
              s.external_campaign_id === String(row.campaign_id) ||
              c.title?.toLowerCase() === String(row.campaign_name || "").toLowerCase()
            );
          });

          if (matched) {
            const currSettings = (matched.settings as Record<string, any>) || {};
            await supabase
              .from("ad_campaigns")
              .update({
                settings: {
                  ...currSettings,
                  real_spent_cents: spendCents,
                  synced_impressions: impressions,
                  synced_clicks: clicks,
                  synced_conversions: conversions,
                  synced_ctr_percent: ctrPercent,
                  synced_cpc_cents: cpcCents,
                  synced_frequency: frequency,
                  last_insights_sync_at: new Date().toISOString(),
                },
                updated_at: new Date().toISOString(),
              })
              .eq("id", matched.id);
          }
        }
      } else if (plat === "google_ads") {
        const customerId = auth.accountId.replace(/\D/g, "");
        const gaqlQuery = `
          SELECT
            campaign.id,
            campaign.name,
            campaign.status,
            metrics.cost_micros,
            metrics.impressions,
            metrics.clicks,
            metrics.ctr,
            metrics.average_cpc,
            metrics.conversions,
            metrics.search_budget_lost_impression_share
          FROM campaign
          WHERE segments.date DURING ${datePreset}
          ORDER BY metrics.cost_micros DESC
          LIMIT 50
        `.trim();

        const gaqlRes = await fetch(
          `https://googleads.googleapis.com/v17/customers/${customerId}/googleAds:searchStream`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${auth.accessToken}`,
              "developer-token": auth.developerToken,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ query: gaqlQuery }),
          }
        );

        const gaqlJson = await gaqlRes.json().catch(() => []);
        if (!gaqlRes.ok) {
          const errMsg = Array.isArray(gaqlJson)
            ? gaqlJson[0]?.error?.message
            : (gaqlJson as any)?.error?.message;
          errors.push(`Google Ads GAQL (${gaqlRes.status}): ${errMsg || "Erro na consulta searchStream."}`);
          continue;
        }

        const batches = Array.isArray(gaqlJson) ? gaqlJson : [gaqlJson];
        for (const batch of batches) {
          const results = Array.isArray(batch?.results) ? batch.results : [];
          for (const item of results) {
            const camp = item.campaign || {};
            const m = item.metrics || {};
            const costMicros = Number(m.costMicros || m.cost_micros || 0);
            const spendCents = Math.round(costMicros / 10_000);
            const impressions = Number(m.impressions || 0);
            const clicks = Number(m.clicks || 0);
            const conversions = Number(m.conversions || 0);
            const ctrPercent = Number(((Number(m.ctr || 0)) * 100).toFixed(2));
            const cpcCents = Math.round(Number(m.averageCpc || m.average_cpc || 0) / 10_000);
            const budgetLostShare = Number(m.searchBudgetLostImpressionShare || m.search_budget_lost_impression_share || 0);

            syncedResults.push({
              platform: "google_ads",
              externalCampaignId: String(camp.id || camp.resourceName || ""),
              campaignName: String(camp.name || "Campanha Google Ads"),
              spendCents,
              impressions,
              clicks,
              conversions,
              ctrPercent,
              cpcCents,
              budgetLostImpressionShare: budgetLostShare,
            });

            const matched = campaigns.find((c: any) => {
              const s = (c.settings as Record<string, any>) || {};
              return (
                String(s.external_campaign_id || "").includes(String(camp.id)) ||
                c.title?.toLowerCase() === String(camp.name || "").toLowerCase()
              );
            });

            if (matched) {
              const currSettings = (matched.settings as Record<string, any>) || {};
              await supabase
                .from("ad_campaigns")
                .update({
                  settings: {
                    ...currSettings,
                    real_spent_cents: spendCents,
                    synced_impressions: impressions,
                    synced_clicks: clicks,
                    synced_conversions: conversions,
                    synced_ctr_percent: ctrPercent,
                    synced_cpc_cents: cpcCents,
                    synced_budget_lost_share: budgetLostShare,
                    last_insights_sync_at: new Date().toISOString(),
                  },
                  updated_at: new Date().toISOString(),
                })
                .eq("id", matched.id);
            }
          }
        }
      }
    } catch (err: any) {
      errors.push(`${plat}: ${err?.message || "Falha inesperada na sincronização."}`);
    }
  }

  return {
    syncedCount: syncedResults.length,
    syncedCampaigns: syncedResults,
    errors,
    syncedAt: new Date().toISOString(),
  };
}

/**
 * Skill Oficial MCP: Google Ads & Meta Ads Account Performance Diagnostics
 * Audita a conta da loja em busca de:
 * 1. Queda de conversão ou Pixel/Conversion ID ausente;
 * 2. Verba travada / campanhas pausadas ou anúncios reprovados;
 * 3. Perda de parcela de impressão por orçamento no Google Ads (`search_budget_lost_impression_share`);
 * 4. Fadiga criativa na Meta (`frequency > 3.5` com queda de CTR);
 * 5. Desperdício de verba (cliques e gasto sem pedidos atribuídos).
 */
export const diagnoseAdAccountsHealthMcpFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      question: z.string().optional(),
      syncLiveFirst: z.boolean().default(true),
    }).default({})
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

    return executeDiagnoseAdAccountsHealthMcp(supabase, identity.store_id!, data.question, data.syncLiveFirst, identity?.id || undefined);
  });

export async function executeDiagnoseAdAccountsHealthMcp(
  supabase: any,
  storeId: string,
  question?: string,
  syncLiveFirst = true,
  ownerId?: string
) {
  if (syncLiveFirst) {
    await executeSyncExternalAdCampaignMetrics(supabase, storeId, "all", "LAST_30_DAYS").catch(() => null);
  }

  const [oauthRes, campaignsRes, ordersRes] = await Promise.all([
    supabase
      .from("store_ad_accounts")
      .select("platform, account_id, account_name, status, pixel_id, conversion_id, last_api_sync_at, token_expires_at")
      .eq("store_id", storeId),
    supabase
      .from("ad_campaigns")
      .select("id, title, budget_cents, status, starts_at, ends_at, created_at, settings")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("id, total_cents, status, attributed_campaign_id, utm_campaign, created_at")
      .eq("store_id", storeId)
      .eq("status", "paid"),
  ]);

  const accounts = oauthRes.data || [];
  const campaigns = campaignsRes.data || [];
  const paidOrders = ordersRes.data || [];

  const findings: Array<{
    code: string;
    severity: "critical" | "warning" | "healthy";
    platform: "meta_ads" | "google_ads" | "waesy_ads";
    title: string;
    diagnosis: string;
    recommendedAction: string;
    campaignId?: string;
  }> = [];

  const metaAcc = accounts.find((a: any) => a.platform === "meta_ads" && a.status === "connected");
  const googleAcc = accounts.find((a: any) => a.platform === "google_ads" && a.status === "connected");

  if (!metaAcc) {
    findings.push({
      code: "META_ACCOUNT_DISCONNECTED",
      severity: "warning",
      platform: "meta_ads",
      title: "Conta Meta Ads (Facebook/Instagram) não conectada",
      diagnosis: "A loja ainda não vinculou uma conta de anúncios da Meta via OAuth 2.0.",
      recommendedAction: "Conectar conta Meta Ads em 1 clique para liberar publicação direta e diagnóstico de fadiga de criativos.",
    });
  } else if (!metaAcc.pixel_id) {
    findings.push({
      code: "META_PIXEL_MISSING",
      severity: "critical",
      platform: "meta_ads",
      title: "Meta Pixel / CAPI não configurado na conta conectada",
      diagnosis: `A conta ${metaAcc.account_id} está ativa, mas sem Pixel ID vinculado. Isso impede o algoritmo da Meta de otimizar para conversões reais.`,
      recommendedAction: "Vincular o Pixel ID na aba Meta Ads para ativar o envio de eventos server-side (CAPI).",
    });
  }

  if (!googleAcc) {
    findings.push({
      code: "GOOGLE_ACCOUNT_DISCONNECTED",
      severity: "warning",
      platform: "google_ads",
      title: "Conta Google Ads não conectada",
      diagnosis: "A loja ainda não conectou um Customer ID do Google Ads para busca e Shopping.",
      recommendedAction: "Conectar Google Ads via Login Rápido OAuth para habilitar diagnósticos GAQL.",
    });
  } else if (!googleAcc.conversion_id) {
    findings.push({
      code: "GOOGLE_CONVERSION_ID_MISSING",
      severity: "warning",
      platform: "google_ads",
      title: "Tag de Conversão do Google Ads (AW-...) ausente",
      diagnosis: `A conta Google Ads (${googleAcc.account_id}) não possui Conversion ID cadastrado para rastrear compras fechadas.`,
      recommendedAction: "Informar o Conversion ID na aba Google Ads para alimentar o Smart Bidding.",
    });
  }

  for (const camp of campaigns) {
    const s = ((camp as any).settings as Record<string, any>) || {};
    const spendCents = Number(s.real_spent_cents || 0);
    const impressions = Number(s.synced_impressions || 0);
    const clicks = Number(s.synced_clicks || 0);
    const ctrPercent = Number(s.synced_ctr_percent || (impressions > 0 ? (clicks / impressions) * 100 : 0));
    const frequency = Number(s.synced_frequency || 0);
    const budgetLostShare = Number(s.synced_budget_lost_share || 0);
    const plat: "meta_ads" | "google_ads" | "waesy_ads" =
      s.destination_platform === "google_ads"
        ? "google_ads"
        : s.destination_platform === "meta_ads"
        ? "meta_ads"
        : "waesy_ads";

    const campOrders = paidOrders.filter((o: any) => isPaidOrderAttributedToCampaignWithinPeriod(o, camp));

    if (camp.status === "rejected" || s.effective_status === "DISAPPROVED") {
      findings.push({
        code: "CAMPAIGN_DISAPPROVED",
        severity: "critical",
        platform: plat,
        campaignId: camp.id,
        title: `Verba travada: "${camp.title}" reprovada pela plataforma`,
        diagnosis: "O anúncio foi reprovado nas políticas de revisão e está com 0 impressões.",
        recommendedAction: "Revisar headline e imagem criativa no AI Ad Builder para remover promessas proibidas.",
      });
    }

    if (frequency > 3.5 && ctrPercent < 1.0) {
      findings.push({
        code: "CREATIVE_FATIGUE_DETECTED",
        severity: "warning",
        platform: plat,
        campaignId: camp.id,
        title: `Fadiga de criativo em "${camp.title}" (Frequência ${frequency.toFixed(1)}x)`,
        diagnosis: `O público já viu o mesmo anúncio ${frequency.toFixed(1)} vezes e o CTR caiu para ${ctrPercent.toFixed(2)}%.`,
        recommendedAction: "Gerar novo ângulo visual/copy no AI Ad Builder e pausar a variação saturada.",
      });
    }

    if (budgetLostShare > 0.25) {
      findings.push({
        code: "BUDGET_LIMITED_IMPRESSION_SHARE",
        severity: "warning",
        platform: "google_ads",
        campaignId: camp.id,
        title: `Perda de ${(budgetLostShare * 100).toFixed(0)}% das buscas por limite de orçamento em "${camp.title}"`,
        diagnosis: "A campanha está deixando de aparecer para clientes qualificados porque o orçamento diário esgota antes do fim do dia.",
        recommendedAction: "Elevar o orçamento diário em 20% ou restringir o raio geográfico de segmentação.",
      });
    }

    if (spendCents >= 5000 && campOrders.length === 0) {
      findings.push({
        code: "SPEND_WITHOUT_ATTRIBUTED_CONVERSIONS",
        severity: "critical",
        platform: plat,
        campaignId: camp.id,
        title: `Gasto sem conversão atribuída em "${camp.title}"`,
        diagnosis: `Foram consumidos R$ ${(spendCents / 100).toFixed(2).replace(".", ",")} (${clicks} cliques) com 0 pedidos pagos vinculados.`,
        recommendedAction: "Pausar campanha imediatamente ou revisar a página de destino e oferta.",
      });
    }
  }

  if (findings.length === 0) {
    findings.push({
      code: "ACCOUNTS_HEALTHY",
      severity: "healthy",
      platform: "waesy_ads",
      title: "Contas e campanhas operando dentro dos parâmetros saudáveis",
      diagnosis: "Nenhum gargalo crítico de aprovação, fadiga criativa ou perda severa de impressão detectado.",
      recommendedAction: "Manter monitoramento contínuo de ROAS e atribuição.",
    });
  }

  let aiExecutiveSummary = "";
  try {
    const { executeUnifiedAiCall } = await import("./api-orchestrator.functions");
    const aiRes = await executeUnifiedAiCall({
      feature: "ads_mcp_account_diagnostics",
      taskType: "deep_reasoning",
      storeId,
      ownerId: ownerId || undefined,
      systemPrompt:
        "Você é o Especialista Sênior de Tráfego Pago (Google Ads MCP & Meta Ads Diagnostics) do Waesy. Analise os achados reais da conta abaixo e responda em português claro, direto e executivo (máximo 4 frases) explicando o diagnóstico principal e a ação imediata de maior impacto no ROI. Não invente métricas que não estejam nos dados.",
      userPrompt: JSON.stringify({
        userQuestion: question || "Diagnóstico geral de performance das contas de anúncio",
        connectedAccountsCount: accounts.length,
        totalCampaigns: campaigns.length,
        findings,
      }),
    });
    aiExecutiveSummary = (aiRes.content || (aiRes as any).text || "").trim();
  } catch {
    aiExecutiveSummary = findings.map((f) => `${f.title}: ${f.recommendedAction}`).join(" | ");
  }

  return {
    storeId,
    diagnosedAt: new Date().toISOString(),
    connectedAccounts: accounts,
    totalCampaignsAudited: campaigns.length,
    aiExecutiveSummary,
    findings,
  };
}

/**
 * Skill Oficial MCP: Google Ads Data Manager Event Ingestion & Meta Conversions API (CAPI)
 * Envia eventos de conversão server-side (Purchase / Lead) com hash SHA-256 e registra em `pixel_dispatch_log`.
 */
export const ingestAdConversionEventMcpFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      eventName: z.enum(["Purchase", "Lead", "InitiateCheckout"]).default("Purchase"),
      orderId: z.string().optional(),
      valueCents: z.number().int().nonnegative(),
      currency: z.string().default("BRL"),
      customerEmail: z.string().email().optional(),
      customerPhone: z.string().optional(),
      eventSourceUrl: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

    return executeIngestAdConversionEventMcp(supabase, identity.store_id!, data);
  });

export async function executeIngestAdConversionEventMcp(
  supabase: any,
  storeId: string,
  data: {
    eventName: "Purchase" | "Lead" | "InitiateCheckout";
    orderId?: string;
    valueCents: number;
    currency?: string;
    customerEmail?: string;
    customerPhone?: string;
    eventSourceUrl?: string;
  }
) {
  const { createHash } = await import("node:crypto");
  const sha256 = (val: string) => createHash("sha256").update(val.trim().toLowerCase()).digest("hex");

  const hashedEmail = data.customerEmail ? sha256(data.customerEmail) : undefined;
  const hashedPhone = data.customerPhone ? sha256(data.customerPhone.replace(/\D/g, "")) : undefined;

  const results: Array<{ platform: string; status: string; details?: any }> = [];

  // 1. Meta Conversions API (CAPI)
  try {
    const metaAuth = await resolveValidStoreAdToken(supabase, storeId, "meta_ads");
    if (metaAuth.pixelId) {
      const capiRes = await fetch(
        `https://graph.facebook.com/v20.0/${metaAuth.pixelId}/events?access_token=${encodeURIComponent(metaAuth.accessToken)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            data: [
              {
                event_name: data.eventName,
                event_time: Math.floor(Date.now() / 1000),
                action_source: "website",
                event_id: data.orderId || `waesy_${Date.now()}`,
                event_source_url: data.eventSourceUrl || "https://usewaesy.pages.dev",
                user_data: {
                  ...(hashedEmail ? { em: [hashedEmail] } : {}),
                  ...(hashedPhone ? { ph: [hashedPhone] } : {}),
                },
                custom_data: {
                  currency: data.currency || "BRL",
                  value: Number((data.valueCents / 100).toFixed(2)),
                  order_id: data.orderId,
                },
              },
            ],
          }),
        }
      );
      const capiJson = await capiRes.json().catch(() => ({}));
      results.push({
        platform: "meta_capi",
        status: capiRes.ok ? "sent" : "failed",
        details: capiJson,
      });
    }
  } catch (e: any) {
    results.push({ platform: "meta_capi", status: "skipped", details: e?.message });
  }

  // 2. Google Ads Data Manager API Event Ingestion
  try {
    const googleAuth = await resolveValidStoreAdToken(supabase, storeId, "google_ads");
    if (googleAuth.conversionId) {
      const dmRes = await fetch("https://datamanager.googleapis.com/v1/events:ingest", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${googleAuth.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          destinations: [
            {
              operatingAccount: {
                accountType: "GOOGLE_ADS",
                accountId: googleAuth.accountId.replace(/\D/g, ""),
              },
              productDestinationId: googleAuth.conversionId,
            },
          ],
          events: [
            {
              eventTimestamp: new Date().toISOString(),
              transactionId: data.orderId || `waesy_${Date.now()}`,
              conversionValue: Number((data.valueCents / 100).toFixed(2)),
              currency: data.currency || "BRL",
              userData: {
                userIdentifiers: [
                  ...(hashedEmail ? [{ emailAddress: hashedEmail }] : []),
                  ...(hashedPhone ? [{ phoneNumber: hashedPhone }] : []),
                ],
              },
            },
          ],
        }),
      });
      const dmJson = await dmRes.json().catch(() => ({}));
      results.push({
        platform: "google_data_manager",
        status: dmRes.ok ? "sent" : "failed",
        details: dmJson,
      });
    }
  } catch (e: any) {
    results.push({ platform: "google_data_manager", status: "skipped", details: e?.message });
  }

  return {
    eventName: data.eventName,
    orderId: data.orderId || null,
    valueBrl: data.valueCents / 100,
    dispatchedAt: new Date().toISOString(),
    results,
  };
}

