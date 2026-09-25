import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

export type AdCampaign = {
 id: string;
 store_id: string;
 title: string;
 format: "post_patrocinado" | "banner_destaque" | "story_patrocinado" | "busca_topo";
 target_location: string;
 target_radius_km: number;
 daily_budget_cents: number;
 total_budget_cents: number;
 status: "active" | "paused" | "completed" | "draft";
 impressions_count: number;
 clicks_count: number;
 spent_cents: number;
 created_at: string;
};

export const listAdCampaigns = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

 const { data: campaigns, error } = await supabase
 .from("ad_campaigns")
 .select(
 "id, store_id, title, type, budget_cents, status, created_at, starts_at, ends_at, placements",
 )
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

 if (error) {
 console.error("[ads] Error listing campaigns:", error);
 return [];
 }

 // Busca contagem de eventos por campanha
 const campaignIds = (campaigns || []).map((c) => c.id);
 const { data: events } = await supabase
 .from("ad_events")
 .select("campaign_id, event_type")
 .in(
 "campaign_id",
 campaignIds.length > 0 ? campaignIds : ["00000000-0000-0000-0000-000000000000"],
 );

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
 const format = placements.includes("search")
 ? "busca_topo"
 : placements.includes("banner")
 ? "banner_destaque"
 : placements.includes("story")
 ? "story_patrocinado"
 : "post_patrocinado";

 return {
 id: c.id,
 store_id: c.store_id,
 title: c.title || "Campanha Promocional",
 format,
 target_location: (c.settings as any)?.target_location || "Toda a Região",
 target_radius_km: 15,
 daily_budget_cents: Math.round(c.budget_cents / 5),
 total_budget_cents: c.budget_cents,
 status: c.status,
 impressions_count: stats.views,
 clicks_count: stats.clicks,
 spent_cents: Math.min(c.budget_cents, stats.clicks * 45),
 created_at: c.created_at,
 } as AdCampaign;
 });
});

export const getStoreAdTargets = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

 const { data: products } = await supabase
 .from("products")
 .select("id, title, price_cents, status")
 .eq("store_id", identity.store_id)
 .eq("status", "published")
 .order("created_at", { ascending: false })
 .limit(50);

 const { data: store } = await supabase
 .from("stores")
 .select("id, name, phone, slug")
 .eq("id", identity.store_id)
 .single();

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

 const { data: campaign, error } = await supabase
 .from("ad_campaigns")
 .insert({
 store_id: identity.store_id,
 title: input.title,
 type: input.format === "banner_destaque" ? "fixed_banner" : "dynamic_boost",
 budget_cents: input.total_budget_cents,
 placements: placementMap[input.format] || ["feed"],
 status: "active",
 })
 .select()
 .single();

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
