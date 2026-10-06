import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

const ABANDONED_CART_INACTIVITY_MS = 2 * 60 * 60 * 1000;
const MATCH_TIME_PAGE_SIZE = 1000;

function throwIfQueryFailed(error: { message?: string } | null, message: string): void {
 if (error) {
  throw new Error(error.message ? `${message}: ${error.message}` : message);
 }
}

function requireRows<T>(rows: T[] | null, message: string): T[] {
 if (!Array.isArray(rows)) throw new Error(message);
 return rows;
}

/**
 * Classifies active carts with at least two hours without updates as possible
 * abandonment. This is a time-based heuristic, not proof that no order exists.
 */
export const scanAbandonedCarts = createServerFn({ method: "POST" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);

 const now = new Date();
 const twoHoursAgo = new Date(now.getTime() - ABANDONED_CART_INACTIVITY_MS).toISOString();

 // Checkout marks a cart completed, but the schema has no durable cart_id on
 // orders. Inactivity is therefore only a heuristic and must not be described
 // as confirmation that the customer has no order.
 const { data: stagnantCarts, error: cartsErr } = await supabase
  .from("carts")
  .select("id, customer_id, updated_at")
  .eq("store_id", identity.store_id)
  .eq("status", "active")
  .gt("expires_at", now.toISOString())
  .lt("updated_at", twoHoursAgo);

 throwIfQueryFailed(cartsErr, "Não foi possível consultar carrinhos inativos");
 const candidates = requireRows(stagnantCarts, "A consulta de carrinhos inativos não retornou dados válidos");

 // `cart_id` is unique in abandoned_carts; ignoreDuplicates makes concurrent
 // scans idempotent, and returned rows count only inserts confirmed by PostgREST.
 let scanned = 0;
 let newAbandonsCount = 0;
 for (const cart of candidates) {
  const { data: items, error: itemsErr } = await supabase
   .from("cart_items")
   .select("variant_id, qty, price_snapshot_cents, product_variants(canonical_name, products(title))")
   .eq("cart_id", cart.id);

  throwIfQueryFailed(itemsErr, "Não foi possível consultar os itens do carrinho");
  const cartItems = requireRows(items, "A consulta de itens do carrinho não retornou dados válidos");
  if (cartItems.length === 0) continue;
  scanned++;

  const { data: inserted, error: insertErr } = await supabase
   .from("abandoned_carts")
   .upsert(
    {
     store_id: identity.store_id,
     cart_id: cart.id,
     customer_id: cart.customer_id,
     status: "abandoned",
     cart_snapshot: {
      items: cartItems.map((item: any) => ({
       variant_id: item.variant_id,
       quantity: item.qty,
       price_cents: item.price_snapshot_cents,
       product_title: item.product_variants?.products?.title ?? null,
       variant_name: item.product_variants?.canonical_name ?? null,
      })),
      last_activity_at: cart.updated_at,
      inactivity_heuristic_hours: 2,
     },
    },
    { onConflict: "cart_id", ignoreDuplicates: true },
   )
   .select("id")
   .maybeSingle();

  throwIfQueryFailed(insertErr, "Não foi possível registrar o carrinho para acompanhamento");
  if (inserted?.id) newAbandonsCount++;
 }

 return { scanned, newAbandons: newAbandonsCount, inactivityHeuristicHours: 2 };
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

 throwIfQueryFailed(error, "Não foi possível listar carrinhos inativos");
 const rows = requireRows(carts, "A consulta de carrinhos inativos não retornou dados válidos");

 return rows.map((c) => ({
  id: c.id,
  cartId: c.cart_id,
  status: c.status,
  recoveryAttempts: c.recovery_attempts,
  customerName: c.profiles?.full_name || "Nome não informado",
  customerEmail: c.profiles?.email,
  customerPhone: c.profiles?.phone,
  snapshot: c.cart_snapshot,
  createdAt: c.created_at,
  lastActivityAt: c.cart_snapshot?.last_activity_at ?? null,
 }));
});

export const markRecoveryAttempt = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

 // Read the current count, then use it in the update predicate to avoid
 // reporting success for a missing row or silently losing a concurrent update.
 const { data: cart, error: fetchError } = await supabase
  .from("abandoned_carts")
  .select("recovery_attempts")
  .eq("id", id)
  .eq("store_id", identity.store_id)
  .maybeSingle();

 throwIfQueryFailed(fetchError, "Não foi possível localizar o carrinho para registrar a tentativa");
 if (!cart) throw new Error("Carrinho inativo não encontrado nesta loja.");

 const currentAttempts = cart.recovery_attempts ?? 0;
 const { data: updated, error: updateError } = await supabase
  .from("abandoned_carts")
  .update({
   recovery_attempts: currentAttempts + 1,
   last_attempt_at: new Date().toISOString(),
  })
  .eq("id", id)
  .eq("store_id", identity.store_id)
  .eq("recovery_attempts", currentAttempts)
  .select("id")
  .maybeSingle();

 throwIfQueryFailed(updateError, "Não foi possível registrar a tentativa de recuperação");
 if (!updated?.id) throw new Error("O carrinho mudou durante a atualização; tente novamente.");

 return { success: true };
 });

/**
 * Match Time product discovery. The existing offer schema requires an
 * authenticated customer and session, neither of which this route creates;
 * therefore this endpoint only returns verified catalog prices and never
 * fabricates a discount or an unredeemable offer.
 */
export const generateMatchTimeOffers = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 const storeId = identity.store_id ?? identity.memberships?.[0]?.store_id ?? null;
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"], storeId);
 if (!identity.store_id) throw new Error("Nenhuma loja ativa foi selecionada.");

 const { data: store, error: storeError } = await supabase
  .from("stores")
  .select("id")
  .eq("id", identity.store_id)
  .maybeSingle();
 throwIfQueryFailed(storeError, "Não foi possível validar a loja ativa");
 if (!store?.id) throw new Error("A loja ativa não foi encontrada.");

 const variants: any[] = [];
 for (let offset = 0; ; offset += MATCH_TIME_PAGE_SIZE) {
  const { data: page, error } = await supabase
   .from("product_variants")
   .select("id, price_cents, canonical_name, products!inner(id, title, store_id, is_active), product_media(url)")
   .eq("products.store_id", store.id)
   .eq("products.is_active", true)
   .eq("status", "active")
   .gt("stock_on_hand", 0)
   .order("id", { ascending: true })
   .range(offset, offset + MATCH_TIME_PAGE_SIZE - 1);

  throwIfQueryFailed(error, "Não foi possível carregar produtos para o Match Time");
  const pageRows = requireRows(page, "A consulta de produtos não retornou dados válidos");
  variants.push(...pageRows);
  if (pageRows.length < MATCH_TIME_PAGE_SIZE) break;
 }

 // Shuffle a copy and return at most five catalog entries, at their original price.
 const shuffled = [...variants];
 for (let index = shuffled.length - 1; index > 0; index--) {
  const swapIndex = Math.floor(Math.random() * (index + 1));
  [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
 }

 return shuffled.slice(0, 5).map((variant) => ({
  variantId: variant.id,
  productId: variant.products?.id,
  title: variant.products?.title,
  variantName: variant.canonical_name,
  image: variant.product_media?.[0]?.url || null,
  originalPrice: variant.price_cents,
 }));
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
  og_description_template: z.string().default("Confira {item_title}."),
  default_og_image_url: z.string().default(""),
  whatsapp_share_template: z.string().default("Confira {item_title} ({item_price}): {item_url}"),
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

    const storeName = store.name?.trim() || "Nome não informado";
    const storeSlug = store.slug?.trim() || "";
    const defaultImage = rawSocial.default_og_image_url || store.banner_url || store.logo_url || "";

    return {
      og_title_template: rawSocial.og_title_template || `{item_title} | ${storeName}`,
      og_description_template:
        rawSocial.og_description_template ||
        "Confira {item_title}.",
      default_og_image_url: defaultImage,
      whatsapp_share_template:
        rawSocial.whatsapp_share_template ||
        "Confira {item_title} ({item_price}): {item_url}",
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
