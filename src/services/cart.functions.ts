/**
 * Cart server functions Commerce
 *
 * All cart and stock calculations happen here.
 * Never trust the client for prices or availability.
 */

import { createServerFn } from "@tanstack/react-start";
import { getServerIdentity, getSSRClient } from "@/lib/server-access";
import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { logSystemError } from "@/lib/logger";
import { z } from "zod";

import { getGuestSession, getSellerRefCookie } from "@/lib/session";
import { getCurrentIdentity, mergeGuestCartLogic, withDataPayload } from "./cart-helpers";
import type { CartDTO } from "@/types/orders";
import { formatMoney } from "@/lib/money";

// Helpers (getCurrentIdentity, mergeGuestCartLogic) live in ./cart-helpers
// because tss-serverfn-split strips sibling declarations from this file.

/**
 * Ensures a cart exists for the current identity.
 */
async function getOrCreateCartId(
 identity: {
 customer_id: string | null;
 session_token: string | null;
 },
 preferredStoreId?: string | null,
) {
 const supabase = getServerClient();

 // 1. Try to find an existing active cart for this specific store (if preferredStoreId provided)
 let query = supabase.from("carts").select("id").eq("status", "active");
 if (preferredStoreId) {
 query = query.eq("store_id", preferredStoreId);
 }
 if (identity.customer_id) {
 query = query.eq("customer_id", identity.customer_id);
 } else {
 query = query.eq("session_token", identity.session_token as string | undefined);
 }

 const { data: existing } = await query
 .order("created_at", { ascending: false })
 .limit(1)
 .maybeSingle();
 if (existing) return existing.id;

 // 2. Resolve store_id com fallback resiliente
 let storeId = preferredStoreId;
 if (!storeId) {
 try {
 const { resolveTenantStoreId } = await import("@/lib/tenant.server");
 storeId = await resolveTenantStoreId();
 } catch {}
 }

 if (!storeId) {
 const { data: defaultStore } = await supabase
 .from("stores")
 .select("id")
 .limit(1)
 .maybeSingle();
 storeId = defaultStore?.id || null;
 }

  if (!storeId) {
    throw new Error("Nenhuma loja disponível no momento.");
  }

  // 3. Create a new cart for this store
  const { data: newCart, error } = await supabase
    .from("carts")
    .insert({
      store_id: storeId,
      customer_id: identity.customer_id,
      session_token: identity.session_token,
      status: "active",
    })
    .select("id")
    .single();

  if (error || !newCart) {
    throw new Error("Falha ao criar carrinho: " + (error?.message || "Erro desconhecido"));
  }
  return newCart.id;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

export async function fetchCartDTO(
 identity: { customer_id: string | null; session_token: string | null },
 storeId?: string,
): Promise<CartDTO | null> {
 const supabase = getServerClient();

 let query = supabase
 .from("carts")
 .select(
 `
 id,
 status,
 coupon_code,
 discount_cents,
 shipping_cents,
 shipping_method,
 store:stores(id, name, slug, settings),
 cart_items (
 id,
 variant_id,
 qty,
 selected_options,
 price_snapshot_cents,
 product_variants (
 id,
 price_override_cents,
 stock_on_hand,
 sku,
 attributes,
 product:products (
 id,
 title,
 slug,
 price_cents,
 compare_at_cents,
 product_media ( url )
 )
 )
 )
 `,
 )
 .eq("status", "active");

 if (identity.customer_id) query = query.eq("customer_id", identity.customer_id);
 else query = query.eq("session_token", identity.session_token);

 if (storeId) {
 query = query.eq("store_id", storeId);
 }

 const { data: cart, error } = await query
 .order("created_at", { ascending: false })
 .limit(1)
 .maybeSingle();

 if (error) {
 if (error.code === "PGRST116") {
 console.warn(
 `[CART] Multiple active carts or not found (PGRST116) for identity: ${identity.customer_id || identity.session_token}`,
 );
 } else {
 console.error("[CART] Error fetching cart DTO:", error);
 }
 }

 if (!cart) return null;
 return await mapCartToDTO(cart);
}

export async function mapCartToDTO(cart: any): Promise<CartDTO> {
 const supabase = getServerClient();
 interface CartItemRaw {
 id: string;
 variant_id: string;
 qty: number;
 price_snapshot_cents: number;
 selected_options?: Record<string, string | string[]>;
 product_variants?: {
 sku: string;
 price_override_cents: number | null;
 stock_on_hand: number;
 attributes: Record<string, string>;
 status?: string;
 product?: {
 id: string;
 title: string;
 slug: string;
 price_cents: number;
 compare_at_cents: number | null;
 product_media?: { url: string }[];
 };
 };
 }

 let totalCents = 0;
 // 1. Coletar IDs únicos de option_values de todo o carrinho
 const allOptionIds = new Set<string>();
 const rawItems = (cart.cart_items || []) as CartItemRaw[];
 rawItems.forEach((item) => {
 if (item.selected_options) {
 Object.values(item.selected_options).forEach((val) => {
 if (Array.isArray(val)) val.forEach((v) => allOptionIds.add(v));
 else allOptionIds.add(val);
 });
 }
 });

  const optionMetaMap: Record<string, { label: string; priceModifierCents: number }> = {};
  if (allOptionIds.size > 0) {
    const idList = Array.from(allOptionIds);
    const [optRes, modRes] = await Promise.all([
      supabase
        .from("option_values")
        .select("id, label, price_modifier_cents")
        .in("id", idList),
      supabase
        .from("product_modifiers")
        .select("id, title, price_delta_cents")
        .in("id", idList),
    ]);

    if (optRes.data) {
      optRes.data.forEach((v) => {
        optionMetaMap[v.id] = {
          label: v.label,
          priceModifierCents: v.price_modifier_cents || 0,
        };
      });
    }

    if (modRes.data) {
      modRes.data.forEach((m) => {
        optionMetaMap[m.id] = {
          label: m.title,
          priceModifierCents: m.price_delta_cents || 0,
        };
      });
    }
  }

 const items: any[] = [];
 for (const item of rawItems) {
 let variant = item.product_variants;
 let product = variant?.product;

 // Fallback robusto se o join aninhado do PostgREST não trouxer a variante/produto
 if (!variant || !product) {
 try {
 const { data: vData } = await supabase
 .from("product_variants")
 .select("id, sku, price_override_cents, stock_on_hand, attributes, status, product_id, products(id, title, slug, price_cents, compare_at_cents, product_media(url))")
 .eq("id", item.variant_id)
 .maybeSingle();

 if (vData) {
 variant = {
 sku: vData.sku,
 price_override_cents: vData.price_override_cents,
 stock_on_hand: vData.stock_on_hand,
 attributes: (vData.attributes as any) || {},
 status: vData.status,
 product: (vData.products as any) || null,
 };
 product = variant.product;
 }
 } catch (err) {
 console.warn("[cart.functions] Erro ao buscar variante de fallback:", err);
 }
 }

 if (!variant || !product) {
 // Se mesmo com fallback não encontrou, evita crash mas não descarta silenciosamente o total
 continue;
 }

 const image = product.product_media?.[0]?.url || "";
 const price = item.price_snapshot_cents ?? variant.price_override_cents ?? product.price_cents ?? 0;
 const lineTotal = price * item.qty;
 totalCents += lineTotal;

 const availableStock = variant.stock_on_hand || 0;
 const isOutOfStock = availableStock < item.qty;

 const selectedOptionsLabels: string[] = [];
 if (item.selected_options) {
 Object.values(item.selected_options).forEach((val) => {
 if (Array.isArray(val)) {
 val.forEach((v) => {
 const meta = optionMetaMap[v];
 if (meta) {
 selectedOptionsLabels.push(
 meta.priceModifierCents > 0
 ? `${meta.label} (+${formatMoney(meta.priceModifierCents)})`
 : meta.label
 );
 }
 });
 } else {
 const meta = optionMetaMap[val];
 if (meta) {
 selectedOptionsLabels.push(
 meta.priceModifierCents > 0
 ? `${meta.label} (+${formatMoney(meta.priceModifierCents)})`
 : meta.label
 );
 }
 }
 });
 }

 items.push({
 id: item.id,
 variantId: item.variant_id,
 qty: item.qty,
 selectedOptions: item.selected_options || undefined,
 selectedOptionsLabels: selectedOptionsLabels.length > 0 ? selectedOptionsLabels : undefined,
 priceCents: price,
 compareAtCents: product.compare_at_cents ?? null,
 lineTotalCents: lineTotal,
 productTitle: product.title ?? "Produto",
 variantSku: variant.sku || "",
 variantAttributes: variant.attributes || {},
 coverUrl: image,
 isOutOfStock,
 });
 }

 // Dynamic Recalculation (M-08-F2)
 let dynamicDiscountCents = cart.discount_cents || 0;
 let currentCouponCode = cart.coupon_code;

 if (currentCouponCode) {
 const { data: coupon } = await supabase
 .from("coupons")
 .select("*")
 .eq("code", currentCouponCode)
 .eq("is_active", true)
 .maybeSingle();

 if (
 !coupon ||
 (coupon.expires_at && new Date(coupon.expires_at) < new Date()) ||
 (coupon.min_order_cents && totalCents < coupon.min_order_cents)
 ) {
 dynamicDiscountCents = 0;
 currentCouponCode = null;
 await supabase
 .from("carts")
 .update({ coupon_code: null, discount_cents: 0 })
 .eq("id", cart.id);
 } else {
 if (coupon.discount_type === "percentage") {
 dynamicDiscountCents = Math.floor(totalCents * (coupon.discount_value / 100));
 } else if (coupon.discount_type === "fixed_amount") {
 dynamicDiscountCents = Math.round(coupon.discount_value * 100);
 if (dynamicDiscountCents > totalCents) dynamicDiscountCents = totalCents;
 } else if (coupon.discount_type === "free_shipping") {
 dynamicDiscountCents = 0;
 cart.shipping_cents = 0;
 }

 if (dynamicDiscountCents !== cart.discount_cents) {
 await supabase
 .from("carts")
 .update({ discount_cents: dynamicDiscountCents })
 .eq("id", cart.id);
 }
 }
 }

 return {
 id: cart.id,
 storeId: cart.store?.id,
 storeName: cart.store?.name,
 storeLogoUrl: (cart.store?.settings as any)?.logoUrl || (cart.store?.settings as any)?.logo_url || null,
 items,
 subtotalCents: totalCents,
 totalCents: Math.max(0, totalCents + cart.shipping_cents - dynamicDiscountCents),
 shippingCents: cart.shipping_cents,
 shippingMethod: cart.shipping_method,
 discountCents: dynamicDiscountCents,
 couponCode: currentCouponCode,
 itemCount: items.reduce((acc: number, item: { qty: number }) => acc + item.qty, 0),
 };
}

export const getCart = createServerFn({ method: "GET" })
  .validator(withDataPayload(z.object({ storeId: z.string().optional() })).optional())
  .handler(async ({ data }): Promise<CartDTO | null> => {
    const identity = await getCurrentIdentity();
    let storeId = data?.storeId;
    if (!storeId) {
      const { resolveTenantStoreId } = await import("@/lib/tenant.server");
      storeId = (await resolveTenantStoreId()) ?? undefined;
    }
    return fetchCartDTO(identity, storeId as string | undefined);
  });

export async function fetchAllGlobalCarts(identity: {
 customer_id: string | null;
 session_token: string | null;
}): Promise<CartDTO[]> {
 const supabase = getServerClient();

 let query = supabase
 .from("carts")
 .select(
 `
 id,
 status,
 coupon_code,
 discount_cents,
 shipping_cents,
 shipping_method,
 store:stores(id, name, slug, settings),
 cart_items (
 id,
 variant_id,
 qty,
 selected_options,
 price_snapshot_cents,
 product_variants (
 id,
 price_override_cents,
 stock_on_hand,
 sku,
 attributes,
 status,
 product:products (
 id,
 title,
 slug,
 price_cents,
 compare_at_cents,
 product_media ( url )
 )
 )
 )
 `,
 )
 .eq("status", "active");

 if (identity.customer_id) query = query.eq("customer_id", identity.customer_id);
 else query = query.eq("session_token", identity.session_token);

 const { data: carts, error } = await query.order("created_at", { ascending: false });

 if (error || !carts || carts.length === 0) return [];

 const mappedCarts: CartDTO[] = [];
 for (const cart of carts) {
 const dto = await mapCartToDTO(cart);
 if (dto && dto.itemCount > 0) {
 mappedCarts.push(dto);
 }
 }

 return mappedCarts;
}

export const getGlobalCarts = createServerFn({ method: "GET" }).handler(
 async (): Promise<CartDTO[]> => {
 const identity = await getCurrentIdentity();
 return fetchAllGlobalCarts(identity);
 },
);

const CancelCartSchema = z.object({
 cartId: z.string().uuid(),
});

export const cancelCart = createServerFn({ method: "POST" })
  .validator(withDataPayload(CancelCartSchema))
 .handler(async ({ data: { cartId } }) => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity();

 // Verify ownership
 let query = supabase.from("carts").select("id").eq("id", cartId);
 if (identity.customer_id) query = query.eq("customer_id", identity.customer_id);
 else query = query.eq("session_token", identity.session_token);

 const { data: cart } = await query.single();
 if (!cart) return { status: "error" as const, message: "Carrinho não encontrado ou acesso negado." };

 // Update status to cancelled instead of deleting to keep history if needed,
 // or just delete it. Let's delete it so it removes items and cleans up.
 const { error } = await supabase.from("carts").delete().eq("id", cartId);
 if (error) return { status: "error" as const, message: "Falha ao cancelar pacote." };
 return { success: true };
 });

const AddToCartSchema = z.object({
 variantId: z.string().optional(),
 productId: z.string().optional(),
 quantity: z.number().int().min(1).default(1),
 sellerId: z.string().optional(),
 options: z.record(z.union([z.string(), z.array(z.string())])).optional(),
});

export const addToCart = createServerFn({ method: "POST" })
  .validator(withDataPayload(AddToCartSchema))
 .handler(
 async ({ data: { variantId: inputVariantId, productId, quantity, sellerId, options } }) => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity();
 const activeSellerId = sellerId || getSellerRefCookie();

 let targetVariantId = inputVariantId;

 // If only productId provided, fetch first available variant
 if (!targetVariantId && productId) {
 const { data: firstVariant } = await supabase
 .from("product_variants")
 .select("id")
 .eq("product_id", productId)
 .order("created_at", { ascending: true })
 .limit(1)
 .single();

 if (firstVariant) {
 targetVariantId = firstVariant.id;
 }
 }

 if (!targetVariantId) {
 return { status: "error" as const, message: "Selecione uma opção de produto válida." };
 }
 const variantId = targetVariantId;

 // Resolve Store com fallback a partir do produto
 let storeId: string | null = null;
 try {
 const { resolveTenantStoreId } = await import("@/lib/tenant.server");
 storeId = await resolveTenantStoreId();
 } catch {}

 if (!storeId) {
 // Tenta resolver store_id diretamente do produto da variante
 const { data: variantData } = await supabase
 .from("product_variants")
 .select("products(store_id)")
 .eq("id", variantId)
 .maybeSingle();

 const prodStoreId = (variantData?.products as any)?.store_id;
 if (prodStoreId) {
 storeId = prodStoreId;
 } else {
 const { data: defaultStore } = await supabase
 .from("stores")
 .select("id")
 .limit(1)
 .maybeSingle();
 storeId = defaultStore?.id || null;
 }
 }

 if (!storeId) {
 return { status: "error" as const, message: "Loja do produto indisponível." };
 }

 // 1. Tenta inserção atômica via RPC
 let insertedSuccessfully = false;
 try {
 const { data: cartId, error: rpcError } = await supabase.rpc("add_to_cart_atomic_v6", {
 p_store_id: storeId,
 p_customer_id: identity.customer_id,
 p_session_token: identity.session_token,
 p_seller_id: activeSellerId,
 p_variant_id: variantId,
 p_qty: quantity,
 p_options: options || {},
 });
 if (!rpcError && cartId) {
 insertedSuccessfully = true;
 }
 } catch (err) {
 console.warn("[cart.functions] RPC add_to_cart_atomic_v6 falhou, aplicando fallback:", err);
 }

 // 2. Fallback relacional direto
 if (!insertedSuccessfully) {
 const cartId = await getOrCreateCartId(identity, storeId);

 // Preço snapshot base da variante/produto
 const { data: variantRecord } = await supabase
 .from("product_variants")
 .select("price_override_cents, products(price_cents)")
 .eq("id", variantId)
 .single();

 let optionsTotalCents = 0;
 const selectedOptionIds: string[] = [];
 if (options) {
 Object.values(options).forEach((val) => {
 if (Array.isArray(val)) val.forEach((v) => selectedOptionIds.push(v));
 else if (typeof val === "string" && val) selectedOptionIds.push(val);
 });
    if (selectedOptionIds.length > 0) {
      const [optRes, modRes] = await Promise.all([
        supabase
          .from("option_values")
          .select("price_modifier_cents")
          .in("id", selectedOptionIds),
        supabase
          .from("product_modifiers")
          .select("price_delta_cents")
          .in("id", selectedOptionIds),
      ]);

      if (optRes.data) {
        optionsTotalCents += optRes.data.reduce((acc, row) => acc + (row.price_modifier_cents || 0), 0);
      }
      if (modRes.data) {
        optionsTotalCents += modRes.data.reduce((acc, row) => acc + (row.price_delta_cents || 0), 0);
      }
    }
 }

 const basePrice =
 variantRecord?.price_override_cents ??
 (variantRecord?.products as any)?.price_cents ??
 0;
 const priceSnapshot = basePrice + optionsTotalCents;

 // Verifica se item com as MESMAS opções já existe no carrinho
 const optionsJsonStr = JSON.stringify(options || {});
 const { data: existingItems } = await supabase
 .from("cart_items")
 .select("id, qty, selected_options")
 .eq("cart_id", cartId)
 .eq("variant_id", variantId);

 const matchedItem = existingItems?.find(
 (item) => JSON.stringify(item.selected_options || {}) === optionsJsonStr
 );

 if (matchedItem) {
 await supabase
 .from("cart_items")
 .update({ qty: matchedItem.qty + quantity, price_snapshot_cents: priceSnapshot })
 .eq("id", matchedItem.id);
 } else {
 await supabase.from("cart_items").insert({
 cart_id: cartId,
 variant_id: variantId,
 qty: quantity,
 price_snapshot_cents: priceSnapshot,
 selected_options: options || {},
 });
 }
 }

 // Fetch both the store's cart and all global carts to ensure instant UI sync
 const [updatedCart, updatedGlobalCarts] = await Promise.all([
 fetchCartDTO(identity, storeId),
 fetchAllGlobalCarts(identity),
 ]);

 const activeCart = updatedCart || updatedGlobalCarts.find(c => c.storeId === storeId) || updatedGlobalCarts[0] || null;

 return {
 status: "success",
 cart: activeCart,
 globalCarts: updatedGlobalCarts,
 session_token: identity.session_token,
 };
 },
 );

export const removeFromCart = createServerFn({ method: "POST" })
  .validator(withDataPayload(z.object({ itemId: z.string().uuid() })))
 .handler(async ({ data: { itemId } }) => {
 const supabase = getServerClient();

 // We should verify the cart belongs to the user, but for simplicity
 // we just delete the item (UUID is unguessable) and its reservations

 const { data: item } = await supabase
 .from("cart_items")
 .select("cart_id, variant_id")
 .eq("id", itemId)
 .single();

 if (!item) return { status: "error" as const, message: "Item não encontrado" };

 // Removed stock reservation drop logic here since cart items no longer reserve stock immediately.
 // Stock reservation is handled during checkout order creation now.

 // Delete item
 await supabase.from("cart_items").delete().eq("id", itemId);

 return { status: "success" };
 });

// mergeGuestCartLogic lives in ./cart-helpers (see import above).

export const mergeGuestCart = createServerFn({ method: "POST" })
  .validator(
    withDataPayload(
      z.object({
        customerId: z.string(),
        accessToken: z.string().optional(),
        guestSessionToken: z.string().nullable().optional(),
      }),
    ),
  )
 .handler(async ({ data: { customerId, accessToken, guestSessionToken } }) => {
 // If not explicitly passed, try to read it (safe if synchronous, but might fail if after async)
 const token = guestSessionToken !== undefined ? guestSessionToken : getGuestSession();
 return mergeGuestCartLogic(customerId, accessToken, token);
 });

export const updateCartItemQty = createServerFn({ method: "POST" })
  .validator(withDataPayload(z.object({ variantId: z.string().uuid(), delta: z.number().int() })))
 .handler(async ({ data: { variantId, delta } }) => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity();

 let cartQuery = supabase.from("carts").select("id").eq("status", "active");
 if (identity.customer_id) cartQuery = cartQuery.eq("customer_id", identity.customer_id);
 else cartQuery = cartQuery.eq("session_token", identity.session_token);

 const { data: cart } = await cartQuery
 .order("created_at", { ascending: false })
 .limit(1)
 .maybeSingle();
 if (!cart) return { status: "error" as const, message: "Carrinho não encontrado" };

 const { data: existingItem } = await supabase
 .from("cart_items")
 .select("id, qty")
 .eq("cart_id", cart.id)
 .eq("variant_id", variantId)
 .maybeSingle();

 if (!existingItem) return { status: "error" as const, message: "Item não está no carrinho" };

 const newTotalQty = existingItem.qty + delta;
 if (newTotalQty <= 0) {
 // Just remove
 await supabase.from("cart_items").delete().eq("id", existingItem.id);
 return { status: "success" };
 }

 // We no longer reserve stock during cart operations.
 // Atomic validation happens at checkout.
 await supabase.from("cart_items").update({ qty: newTotalQty }).eq("id", existingItem.id);

 return { status: "success" };
 });

const UpdateCartItemOptionsSchema = z.object({
 itemId: z.string().uuid(),
 variantId: z.string().uuid().optional(),
 options: z.record(z.union([z.string(), z.array(z.string())])).optional(),
 quantity: z.number().int().min(1).optional(),
});

export const updateCartItemOptions = createServerFn({ method: "POST" })
  .validator(withDataPayload(UpdateCartItemOptionsSchema))
 .handler(async (params) => {
 const { itemId, variantId, options, quantity } = params.data;
 const supabase = getServerClient();
 const identity = await getCurrentIdentity();

 // 1. Get cart item
 const { data: item } = await supabase
 .from("cart_items")
 .select("id, cart_id, variant_id, qty")
 .eq("id", itemId)
 .single();

 if (!item) return { status: "error" as const, message: "Item do carrinho não encontrado." };

 const updatePayload: Record<string, any> = {};
 if (variantId) updatePayload.variant_id = variantId;
 if (options !== undefined) updatePayload.selected_options = options;
 if (quantity !== undefined) updatePayload.qty = quantity;

 if (variantId && variantId !== item.variant_id) {
 const { data: variantRecord } = await supabase
 .from("product_variants")
 .select("price_override_cents, products(price_cents)")
 .eq("id", variantId)
 .single();
 const priceSnapshot =
 variantRecord?.price_override_cents ??
 (variantRecord?.products as any)?.price_cents ??
 0;
 updatePayload.price_snapshot_cents = priceSnapshot;
 }

 try {
 const { error: updateError } = await supabase
 .from("cart_items")
 .update(updatePayload)
 .eq("id", itemId);

 if (updateError) throw updateError;
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 logSystemError({ route: "cart.functions.updateCartItemOptions", error: e, payload: params.data });
 console.error("[cart.functions] Erro ao atualizar opções do item:", e);
 return { status: "error" as const, message: "Falha ao atualizar opções do item." };
 }

 const [updatedCart, updatedGlobalCarts] = await Promise.all([
 fetchCartDTO(identity),
 fetchAllGlobalCarts(identity),
 ]);

 return {
 status: "success",
 cart: updatedCart,
 globalCarts: updatedGlobalCarts,
 };
 });

export const applyCouponToCart = createServerFn({ method: "POST" })
  .validator(withDataPayload(z.object({ code: z.string().toUpperCase() })))
 .handler(async ({ data: { code } }) => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity();

 let cartQuery = supabase.from("carts").select("id").eq("status", "active");
 if (identity.customer_id) cartQuery = cartQuery.eq("customer_id", identity.customer_id);
 else cartQuery = cartQuery.eq("session_token", identity.session_token);

 const { data: cart } = await cartQuery
 .order("created_at", { ascending: false })
 .limit(1)
 .maybeSingle();
 if (!cart) return { status: "error" as const, message: "Carrinho não encontrado" };

 // Get current cart details to check subtotal
 const cartDetails = await getCart();
 if (!cartDetails) return { status: "error" as const, message: "Erro ao buscar detalhes do carrinho" };

 // Search for coupon
 const { resolveTenantStoreId } = await import("@/lib/tenant.server");
 const storeId = await resolveTenantStoreId();
 if (!storeId) return { status: "error" as const, message: "Loja não configurada" };
 const store = { id: storeId };
 if (!store) return { status: "error" as const, message: "Loja não configurada" };

 const { data: coupon } = await supabase
 .from("coupons")
 .select("*")
 .eq("store_id", store.id)
 .eq("code", code)
 .eq("is_active", true)
 .maybeSingle();

 if (!coupon) return { status: "error" as const, message: "Cupom inválido ou expirado." };

 // Check expiration
 if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
 return { status: "error" as const, message: "Este cupom já expirou." };
 }

 // Check limits
 if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
 return { status: "error" as const, message: "Este cupom atingiu o limite de usos." };
 }

 if (coupon.min_order_cents && cartDetails.subtotalCents < coupon.min_order_cents) {
 return { status: "error" as const, message: `Valor mínimo para este cupom é ${formatMoney(coupon.min_order_cents)}` };
 }

 // Calculate discount
 let newDiscountCents = 0;
 if (coupon.discount_type === "percentage") {
 newDiscountCents = Math.floor(cartDetails.subtotalCents * (coupon.discount_value / 100));
 } else if (coupon.discount_type === "fixed_amount") {
 newDiscountCents = Math.round(coupon.discount_value * 100);
 if (newDiscountCents > cartDetails.subtotalCents)
 newDiscountCents = cartDetails.subtotalCents;
 } else if (coupon.discount_type === "free_shipping") {
 // Actually we should apply this later during checkout or set a flag.
 // For now we set shipping to 0.
 newDiscountCents = 0;
 }

 await supabase
 .from("carts")
 .update({
 coupon_code: code,
 discount_cents: newDiscountCents,
 shipping_cents: coupon.discount_type === "free_shipping" ? 0 : cartDetails.shippingCents, // if it was free shipping
 })
 .eq("id", cart.id);

 return { message: "Cupom aplicado com sucesso!" };
 });

export const updateCartShipping = createServerFn({ method: "POST" })
  .validator(
    withDataPayload(
      z.object({
        zipcode: z.string().min(5),
        method: z.string().min(2),
        cents: z.number().min(0),
      }),
    ),
  )
 .handler(async ({ data: { zipcode, method, cents } }) => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity();

 let cartQuery = supabase.from("carts").select("id").eq("status", "active");
 if (identity.customer_id) cartQuery = cartQuery.eq("customer_id", identity.customer_id);
 else cartQuery = cartQuery.eq("session_token", identity.session_token);

 const { data: cart } = await cartQuery
 .order("created_at", { ascending: false })
 .limit(1)
 .maybeSingle();
 if (!cart) return { status: "error" as const, message: "Carrinho não encontrado" };

 await supabase
 .from("carts")
 .update({
 shipping_zipcode: zipcode,
 shipping_method: method,
 shipping_cents: cents,
 })
 .eq("id", cart.id);

 return { status: "success", message: "Frete atualizado com sucesso" };
 });

export const updateCartContact = createServerFn({ method: "POST" })
  .validator(
    withDataPayload(
      z.object({
        guestEmail: z.string().email().optional(),
        guestPhone: z.string().optional(),
      }),
    ),
  )
 .handler(async ({ data: { guestEmail, guestPhone } }) => {
 try {
 const identity = await getCurrentIdentity();
 const cartId = await getOrCreateCartId(identity);

 if (!cartId) {
 return { status: "error" as const, message: "Nenhum carrinho ativo encontrado" };
 }

 const db = getServerClient();
 const { error } = await db
 .from("carts")
 .update({
 guest_email: guestEmail,
 guest_phone: guestPhone,
 })
 .eq("id", cartId);

 if (error) throw error;
 return { success: true };
 } catch (e: unknown) {
 console.error("[cart] updateCartContact error:", e);
 return { status: "error" as const, message: "Falha ao atualizar contato do carrinho" };
 }
 });

export const triggerAbandonedCartsEngine = createServerFn({ method: "POST" }).handler(async () => {
 try {
 // Idealmente isto é restrito a service_role/admin/webhook auth
 const db = getServerClient();
 const { error } = await db.rpc("process_abandoned_carts");
 if (error) throw error;
 return { success: true };
 } catch (e: unknown) {
 console.error("[cart] triggerAbandonedCartsEngine error:", e);
 return { status: "error" as const, message: "Falha ao disparar motor de carrinhos abandonados" };
 }
});
