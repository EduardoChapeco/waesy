import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

/**
 * Scans for carts that haven't been updated in 2 hours and converts them
 * to abandoned carts if they haven't been already.
 */
export const scanAbandonedCarts = createServerFn({ method: "POST" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);

 // In a real Cron job, this runs automatically.
 // Here we trigger it from the Admin panel to simulate the scan.
 const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

 // Find carts from this store that are older than 2 hours and not attached to an order
 const { data: stagnantCarts, error: cartsErr } = await supabase
 .from("carts")
 .select("id, customer_id, updated_at")
 .eq("store_id", identity.store_id)
 .lt("updated_at", twoHoursAgo);

 if (cartsErr || !stagnantCarts || stagnantCarts.length === 0) {
 return { scanned: 0, newAbandons: 0 };
 }

 // Ensure they haven't already been marked
 let newAbandonsCount = 0;
 for (const cart of stagnantCarts) {
 const { data: existing } = await supabase
 .from("abandoned_carts")
 .select("id")
 .eq("cart_id", cart.id)
 .maybeSingle();

 if (!existing) {
 // Take a snapshot of the cart items (for marketing emails)
 const { data: items } = await supabase
 .from("cart_items")
 .select("*, product_variants(*, products(title))")
 .eq("cart_id", cart.id);

 await supabase.from("abandoned_carts").insert({
 store_id: identity.store_id,
 cart_id: cart.id,
 customer_id: cart.customer_id,
 status: "abandoned",
 cart_snapshot: { items: items || [] },
 });
 newAbandonsCount++;
 }
 }

 return { scanned: stagnantCarts.length, newAbandons: newAbandonsCount };
});

export const listAbandonedCarts = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

 const { data: carts, error } = await supabase
 .from("abandoned_carts")
 .select("*, profiles!abandoned_carts_customer_id_fkey(full_name, email, phone)")
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

 if (error || !carts) return [];

 return carts.map((c) => ({
 id: c.id,
 cartId: c.cart_id,
 status: c.status,
 recoveryAttempts: c.recovery_attempts,
 customerName: c.profiles?.full_name || "Visitante Anônimo",
 customerEmail: c.profiles?.email,
 customerPhone: c.profiles?.phone,
 snapshot: c.cart_snapshot,
 createdAt: c.created_at,
 }));
});

export const markRecoveryAttempt = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

 // Fetch current to increment
 const { data: cart } = await supabase
 .from("abandoned_carts")
 .select("recovery_attempts")
 .eq("id", id)
 .eq("store_id", identity.store_id)
 .single();

 if (cart) {
 await supabase
 .from("abandoned_carts")
 .update({
 recovery_attempts: cart.recovery_attempts + 1,
 last_attempt_at: new Date().toISOString(),
 })
 .eq("id", id)
 .eq("store_id", identity.store_id);
 }

 return { success: true };
 });

/**
 * Gamification "Match Time" Engine
 * Pulls 5 random active variants from the store to show in the Tinder-style UI.
 */
export const generateMatchTimeOffers = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 // Select a few random products that have stock
 const { data: variants, error } = await supabase
 .from("product_variants")
 .select(
 "id, price_cents, canonical_name, products!inner(id, title, store_id, is_active), product_media(url)",
 )
 .eq("products.store_id", identity.store_id)
 .eq("products.is_active", true)
 .limit(20);

 if (error || !variants) return [];

 // Shuffle and pick 5
 const shuffled = variants.sort(() => 0.5 - Math.random()).slice(0, 5);

  // Buscar se há campanha de flash match ativa para aplicar desconto real configurado pelo lojista
  const { data: activeCampaign } = await supabase
    .from("eventos_campanhas")
    .select("config")
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  const campaignDiscountPct = Number(activeCampaign?.config?.discount_percentage || 0);
  const discountFactor = campaignDiscountPct > 0 ? campaignDiscountPct / 100 : 0;

  return shuffled.map((v) => {
    const originalPrice = v.price_cents;
    const matchPrice = discountFactor > 0 ? Math.floor(originalPrice * (1 - discountFactor)) : originalPrice;

    return {
      variantId: v.id,
      productId: (v.products as any)?.id,
      title: (v.products as any)?.title,
      variantName: v.canonical_name,
      image: v.product_media?.[0]?.url || null,
      originalPrice,
      matchPrice,
      discountPercentage: campaignDiscountPct,
    };
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGNS (eventos_campanhas)
// ─────────────────────────────────────────────────────────────────────────────

const CampaignInsertSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional(),
  tipo: z.string(),
  status: z.string().default("draft"),
  publico_alvo: z.string().optional(),
  orcamento: z.number().nullable().optional(),
  data_inicio: z.string().nullable().optional(),
  data_fim: z.string().nullable().optional(),
  config: z.record(z.any()).optional(),
});

export const createCampaign = createServerFn({ method: "POST" })
  .validator(CampaignInsertSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity?.empresa_id) throw new Error("Empresa nao identificada");

    const { data: camp, error } = await supabase
      .from("eventos_campanhas")
      .insert({ empresa_id: (identity as any).empresa_id, ...data })
      .select()
      .single();

    if (error) throw error;
    return camp;
  });

export const updateCampaignStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), status: z.string() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity?.empresa_id) throw new Error("Empresa nao identificada");

    const { error } = await supabase
      .from("eventos_campanhas")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("empresa_id", (identity as any).empresa_id);

    if (error) throw error;
    return { ok: true };
  });

export const deleteCampaign = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity?.empresa_id) throw new Error("Empresa nao identificada");

    const { error } = await supabase
      .from("eventos_campanhas")
      .delete()
      .eq("id", data.id)
      .eq("empresa_id", (identity as any).empresa_id);

    if (error) throw error;
    return { ok: true };
  });

export const duplicateCampaign = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity?.empresa_id) throw new Error("Empresa nao identificada");

    const { data: orig, error: fetchErr } = await supabase
      .from("eventos_campanhas")
      .select("*")
      .eq("id", data.id)
      .eq("empresa_id", (identity as any).empresa_id)
      .single();

    if (fetchErr || !orig) throw fetchErr ?? new Error("Campanha nao encontrada");

    const { error } = await supabase.from("eventos_campanhas").insert({
      empresa_id: (identity as any).empresa_id,
      nome: orig.nome + " (copia)",
      descricao: orig.descricao,
      tipo: orig.tipo,
      status: "draft",
      orcamento: orig.orcamento,
      publico_alvo: orig.publico_alvo,
      config: orig.config,
    });

    if (error) throw error;
    return { ok: true };
  });

// ── Social Share & Open Graph Settings ─────────────────────────────────────

export interface StoreSocialShareSettingsDTO {
  og_title_template: string;
  og_description_template: string;
  default_og_image_url: string;
  whatsapp_share_template: string;
  twitter_card_type: "summary_large_image" | "summary";
  facebook_app_id?: string;
  site_name_suffix?: string;
  enable_smart_preview: boolean;
  store_name: string;
  store_slug: string;
  store_logo_url?: string;
  store_banner_url?: string;
}

const SocialShareSettingsSchema = z.object({
  og_title_template: z.string().default("{item_title} | {store_name}"),
  og_description_template: z.string().default("Confira {item_title} na {store_name}. Atendimento rápido e direto no WhatsApp!"),
  default_og_image_url: z.string().default(""),
  whatsapp_share_template: z.string().default("Olá! Encontrei isso na {store_name} e achei que você iria gostar: {item_title} {item_price} 👉 {item_url}"),
  twitter_card_type: z.enum(["summary_large_image", "summary"]).default("summary_large_image"),
  facebook_app_id: z.string().optional().default(""),
  site_name_suffix: z.string().optional().default("Waesy"),
  enable_smart_preview: z.boolean().default(true),
});

export const getStoreSocialShareSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<StoreSocialShareSettingsDTO> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "operator"]);

    const { data: store, error } = await supabase
      .from("stores")
      .select("id, name, slug, logo_url, banner_url, headline, settings")
      .eq("id", identity.store_id)
      .single();

    if (error || !store) {
      throw error || new Error("Loja não encontrada.");
    }

    const settings = (store.settings as Record<string, any>) || {};
    const rawSocial = settings.social_share || {};

    const storeName = store.name || "Minha Loja";
    const storeSlug = store.slug || "loja";
    const defaultImage = rawSocial.default_og_image_url || store.banner_url || store.logo_url || "";

    return {
      og_title_template: rawSocial.og_title_template || `{item_title} | ${storeName}`,
      og_description_template:
        rawSocial.og_description_template ||
        (store.headline ? `${store.headline} • Compre online ou reserve com atendimento direto.` : `Confira os produtos e serviços de ${storeName}.`),
      default_og_image_url: defaultImage,
      whatsapp_share_template:
        rawSocial.whatsapp_share_template ||
        `Olá! Veja o que encontrei na ${storeName}: {item_title} por apenas {item_price}! Acesse: {item_url}`,
      twitter_card_type: rawSocial.twitter_card_type || "summary_large_image",
      facebook_app_id: rawSocial.facebook_app_id || "",
      site_name_suffix: rawSocial.site_name_suffix || "Waesy",
      enable_smart_preview: rawSocial.enable_smart_preview ?? true,
      store_name: storeName,
      store_slug: storeSlug,
      store_logo_url: store.logo_url || "",
      store_banner_url: store.banner_url || "",
    };
  }
);

export const saveStoreSocialShareSettings = createServerFn({ method: "POST" })
  .validator(SocialShareSettingsSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { data: store, error: fetchErr } = await supabase
      .from("stores")
      .select("id, settings")
      .eq("id", identity.store_id)
      .single();

    if (fetchErr || !store) {
      throw fetchErr || new Error("Loja não encontrada.");
    }

    const currentSettings = (store.settings as Record<string, any>) || {};
    const updatedSettings = {
      ...currentSettings,
      social_share: {
        og_title_template: data.og_title_template,
        og_description_template: data.og_description_template,
        default_og_image_url: data.default_og_image_url,
        whatsapp_share_template: data.whatsapp_share_template,
        twitter_card_type: data.twitter_card_type,
        facebook_app_id: data.facebook_app_id,
        site_name_suffix: data.site_name_suffix,
        enable_smart_preview: data.enable_smart_preview,
        updated_at: new Date().toISOString(),
      },
    };

    const { error: updateErr } = await supabase
      .from("stores")
      .update({ settings: updatedSettings })
      .eq("id", identity.store_id);

    if (updateErr) {
      throw updateErr;
    }

    return { success: true };
  });

