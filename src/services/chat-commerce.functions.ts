/**
 * chat-commerce.functions.ts — BFF Server Functions para o Chat como Aplicativo
 * Prompt 22: Comércio, Serviços, Agenda, Orçamentos e Rastreio em Tempo Real.
 *
 * Conecta a superfície conversacional diretamente aos módulos de domínio existentes:
 * - Catálogo e Carrinho de Compras (mercado, vestuário, varejo)
 * - Agendamentos e Calendário (serviços e especialistas)
 * - Orçamentos e Cotações (obras, consultorias e demandas)
 * - Rastreio Soberano de Pedidos com Eventos e Telemetria (order_events)
 * - Execução Financeira Idempotente com Ledger Imutável SHA-256
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { recordLedgerEntryCore } from "@/services/immutable-ledger.functions";

// ==============================================================================
// 1. Schemas de Validação Zod
// ==============================================================================

export const PreferredMerchantSchema = z.object({
  merchantId: z.string().uuid(),
  merchantName: z.string().min(1),
  category: z.string().min(1),
  priority: z.number().int().min(1).default(1),
  notes: z.string().optional(),
  isFavorite: z.boolean().default(true),
});

export const UserCommercePreferencesSchema = z.object({
  preferredMerchants: z.array(PreferredMerchantSchema),
  categoryPreferences: z.record(
    z.object({
      preferredMerchantId: z.string().uuid().optional(),
      deliveryWindow: z.string().optional(),
      deliveryAddress: z.string().optional(),
      notes: z.string().optional(),
    }),
  ).default({}),
});

export const SearchCommerceProductsSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  storeId: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(50).default(12),
});

export const ChatCartItemInputSchema = z.object({
  cartId: z.string().uuid().optional(),
  storeId: z.string().uuid(),
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  quantity: z.number().int().min(1).default(1),
  unitPriceCents: z.number().int().min(0).optional(),
  productTitle: z.string().optional(),
});

export const UpdateCartItemQtySchema = z.object({
  cartItemId: z.string().uuid(),
  quantity: z.number().int().min(0),
});

export const ChatOrderTrackingQuerySchema = z.object({
  orderId: z.string().min(1),
});

export const ChatBookingSlotsQuerySchema = z.object({
  serviceId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato deve ser AAAA-MM-DD"),
});

export const CreateChatAppointmentSchema = z.object({
  serviceId: z.string().uuid(),
  storeId: z.string().uuid(),
  scheduledAt: z.string().min(1),
  guestName: z.string().optional(),
  guestPhone: z.string().optional(),
  notes: z.string().optional(),
});

export const RequestChatQuoteSchema = z.object({
  storeId: z.string().uuid(),
  conditions: z.string().min(5, "Descreva a demanda com detalhes"),
  estimatedBudgetCents: z.number().int().min(0).optional(),
  guestName: z.string().optional(),
  guestPhone: z.string().optional(),
  notes: z.string().optional(),
});

export const ProcessChatOrderPaymentSchema = z.object({
  cartId: z.string().uuid(),
  idempotencyKey: z.string().min(8, "Chave de idempotência obrigatória"),
  paymentMethod: z.enum(["pix", "credit_card", "manual"]),
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  shippingAddress: z.record(z.any()).optional(),
  deliveryWindow: z.string().optional(),
});

export const ProcessChatBookingPaymentSchema = z.object({
  appointmentId: z.string().uuid(),
  idempotencyKey: z.string().min(8, "Chave de idempotência obrigatória"),
  paymentMethod: z.enum(["pix", "credit_card", "manual"]),
  customerName: z.string().min(2),
  customerEmail: z.string().email(),
  amountCents: z.number().int().min(0),
});

// ==============================================================================
// 2. Tipos Canônicos de DTO
// ==============================================================================

export type PreferredMerchantDTO = z.infer<typeof PreferredMerchantSchema>;
export type UserCommercePreferencesDTO = z.infer<typeof UserCommercePreferencesSchema>;

export interface ChatCommerceProductDTO {
  id: string;
  title: string;
  priceCents: number;
  imageUrl?: string;
  category?: string;
  storeId: string;
  storeName: string;
  inStock: boolean;
  slug?: string;
  description?: string;
}

export interface ChatCartItemDTO {
  id: string;
  productId: string;
  variantId?: string;
  title: string;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
  imageUrl?: string;
}

export interface ChatCartSummaryDTO {
  cartId: string;
  storeId: string;
  storeName?: string;
  items: ChatCartItemDTO[];
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  totalCents: number;
  status: string;
}

export interface ChatOrderTrackingDTO {
  orderId: string;
  orderNumber: string;
  publicToken: string;
  status: string;
  totalCents: number;
  subtotalCents: number;
  shippingCents: number;
  itemsCount: number;
  courier?: {
    name: string;
    vehicle?: string;
    phone?: string;
    currentLat?: number;
    currentLng?: number;
  };
  deliveryPin?: string;
  deliveryAddress?: string;
  timeline: Array<{
    id: string;
    eventType: string;
    note: string;
    createdAt: string;
    fromStatus?: string;
    toStatus?: string;
  }>;
}

export function canReadChatOrderTracking(
  order: { customer_id?: string | null; store_id?: string | null },
  identity: { id?: string | null; customer_id?: string | null; store_id?: string | null; role?: string } | null,
): boolean {
  return Boolean(identity?.id)
    && (order.customer_id === identity?.customer_id
      || (Boolean(order.store_id)
        && order.store_id === identity?.store_id
        && ["owner", "admin", "manager", "seller", "support"].includes(String(identity?.role || ""))));
}

export interface ChatBookingServiceDTO {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  priceCents: number;
  storeId: string;
  storeName?: string;
}

export interface ChatAppointmentDTO {
  id: string;
  serviceId: string;
  serviceTitle: string;
  storeId: string;
  scheduledAt: string;
  status: string;
  priceCents: number;
  guestName?: string;
  notes?: string;
}

export interface ChatQuoteDTO {
  id: string;
  quoteNumber: string;
  storeId: string;
  status: string;
  subtotalCents: number;
  totalCents: number;
  conditions?: string;
  validUntil?: string;
}

// ==============================================================================
// 3. FASE A — PREFERÊNCIAS COMO DADO (Leitura, Gravação e Resolução de Merchant)
// ==============================================================================

export const getUserCommercePreferences = createServerFn({ method: "GET" }).handler(
  async (): Promise<UserCommercePreferencesDTO> => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (Boolean(identity?.id) === false) {
      return { preferredMerchants: [], categoryPreferences: {} };
    }

    const { data, error } = await db
      .from("user_preferences")
      .select("preferred_merchants, category_preferences")
      .eq("user_id", identity?.id as string)
      .maybeSingle();

    if (error || data === null || data === undefined) {
      return { preferredMerchants: [], categoryPreferences: {} };
    }

    const preferredMerchants = Array.isArray(data.preferred_merchants)
      ? (data.preferred_merchants as PreferredMerchantDTO[])
      : [];
    const categoryPreferences = (data.category_preferences as Record<string, any>) || {};

    return {
      preferredMerchants,
      categoryPreferences,
    };
  },
);

export const saveUserCommercePreferences = createServerFn({ method: "POST" })
  .validator(UserCommercePreferencesSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    if (Boolean(identity?.id) === false) {
      throw new Error("Usuário não autenticado");
    }

    const { error } = await db.from("user_preferences").upsert(
      {
        user_id: identity?.id as string,
        preferred_merchants: data.preferredMerchants,
        category_preferences: data.categoryPreferences,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );

    if (error) {
      throw new Error(`Falha ao salvar preferências de comércio: ${error.message}`);
    }

    return { success: true };
  });

/**
 * Resolução semântica de loja preferida do cliente para uma categoria específica.
 * Sem preferência, retorna a primeira loja ativa no segmento correspondente.
 */
export async function resolveMerchantForCategory(
  category: string,
  preferredMerchantId?: string,
): Promise<{ storeId: string; storeName: string } | null> {
  const db = getServerClient();

  if (Boolean(preferredMerchantId)) {
    const { data: store } = await db
      .from("stores")
      .select("id, name")
      .eq("id", preferredMerchantId as string)
      .maybeSingle();

    if (store !== null && store !== undefined) {
      return { storeId: store.id, storeName: store.name };
    }
  }

  // Fallback para loja ativa com correspondência no segmento
  const { data: defaultStore } = await db
    .from("stores")
    .select("id, name, segment")
    .ilike("segment", `%${category}%`)
    .limit(1)
    .maybeSingle();

  if (defaultStore !== null && defaultStore !== undefined) {
    return { storeId: defaultStore.id, storeName: defaultStore.name };
  }

  // Fallback geral de loja primária
  const { data: anyStore } = await db
    .from("stores")
    .select("id, name")
    .limit(1)
    .maybeSingle();

  if (anyStore !== null && anyStore !== undefined) {
    return { storeId: anyStore.id, storeName: anyStore.name };
  }

  return null;
}

// ==============================================================================
// 4. FASE B — DO PEDIDO À ENTREGA (Busca Filtrável, Carrinho Real e Rastreio)
// ==============================================================================

export const searchChatCommerceProducts = createServerFn({ method: "GET" })
  .validator(SearchCommerceProductsSchema)
  .handler(async ({ data: filter }): Promise<ChatCommerceProductDTO[]> => {
    const db = getServerClient();

    let query = db
      .from("products")
      .select("id, title, price_cents, images, category, store_id, in_stock, slug, description, stores(name)")
      .eq("status", "active")
      .limit(filter.limit);

    if (Boolean(filter.storeId)) {
      query = query.eq("store_id", filter.storeId as string);
    }

    if (Boolean(filter.category)) {
      query = query.ilike("category", `%${filter.category}%`);
    }

    if (Boolean(filter.query)) {
      query = query.ilike("title", `%${filter.query}%`);
    }

    const { data: rows, error } = await query;
    if (error || Boolean(rows) === false) {
      return [];
    }

    return rows.map((p: any) => {
      const storeName = Array.isArray(p.stores) ? p.stores[0]?.name : p.stores?.name || "Loja Oficial";
      const imageUrl = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : undefined;

      return {
        id: p.id,
        title: p.title,
        priceCents: p.price_cents || 0,
        imageUrl,
        category: p.category || undefined,
        storeId: p.store_id,
        storeName,
        inStock: Boolean(p.in_stock ?? true),
        slug: p.slug || undefined,
        description: p.description || undefined,
      };
    });
  });

export const getChatCartSummary = createServerFn({ method: "GET" })
  .validator(z.object({ cartId: z.string().uuid().optional(), storeId: z.string().uuid().optional() }))
  .handler(async ({ data }): Promise<ChatCartSummaryDTO | null> => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    let cartQuery = db.from("carts").select("id, store_id, status, shipping_cents, discount_cents").eq("status", "active");

    if (Boolean(data.cartId)) {
      cartQuery = cartQuery.eq("id", data.cartId as string);
    } else if (Boolean(identity?.id)) {
      cartQuery = cartQuery.eq("customer_id", identity?.id as string);
    } else {
      return null;
    }

    if (Boolean(data.storeId)) {
      cartQuery = cartQuery.eq("store_id", data.storeId as string);
    }

    const { data: cart } = await cartQuery.order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (cart === null || cart === undefined) {
      return null;
    }

    // Carregar itens do carrinho
    const { data: items } = await db
      .from("cart_items")
      .select("id, product_id, variant_id, quantity, unit_price_cents, total_price_cents, products(title, images)")
      .eq("cart_id", cart.id);

    const itemsDTO: ChatCartItemDTO[] = (items || []).map((it: any) => {
      const prod = Array.isArray(it.products) ? it.products[0] : it.products;
      const imageUrl = Array.isArray(prod?.images) && prod.images.length > 0 ? prod.images[0] : undefined;

      return {
        id: it.id,
        productId: it.product_id,
        variantId: it.variant_id || undefined,
        title: prod?.title || "Item do Carrinho",
        quantity: it.quantity,
        unitPriceCents: it.unit_price_cents,
        totalPriceCents: it.total_price_cents || it.unit_price_cents * it.quantity,
        imageUrl,
      };
    });

    const subtotalCents = itemsDTO.reduce((acc, it) => acc + it.totalPriceCents, 0);
    const shippingCents = cart.shipping_cents || 0;
    const discountCents = cart.discount_cents || 0;
    const totalCents = Math.max(0, subtotalCents + shippingCents - discountCents);

    return {
      cartId: cart.id,
      storeId: cart.store_id,
      items: itemsDTO,
      subtotalCents,
      shippingCents,
      discountCents,
      totalCents,
      status: cart.status,
    };
  });

export const addChatCartItem = createServerFn({ method: "POST" })
  .validator(ChatCartItemInputSchema)
  .handler(async ({ data }): Promise<ChatCartSummaryDTO> => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    // 1. Obter ou criar carrinho ativo
    let resolvedCartId = data.cartId;
    if (Boolean(resolvedCartId) === false) {
      const { data: existingCart } = await db
        .from("carts")
        .select("id")
        .eq("store_id", data.storeId)
        .eq("status", "active")
        .eq("customer_id", identity?.id || null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingCart !== null && existingCart !== undefined) {
        resolvedCartId = existingCart.id;
      } else {
        const { data: newCart, error: createCartErr } = await db
          .from("carts")
          .insert({
            store_id: data.storeId,
            customer_id: identity?.id || null,
            status: "active",
          })
          .select("id")
          .single();

        if (createCartErr || Boolean(newCart) === false) {
          throw new Error("Falha ao inicializar carrinho");
        }
        resolvedCartId = newCart.id;
      }
    }

    // 2. Preço do produto e verificação de estoque
    let unitPriceCents = data.unitPriceCents;
    if (typeof unitPriceCents !== "number" || unitPriceCents <= 0) {
      const { data: product } = await db
        .from("products")
        .select("price_cents")
        .eq("id", data.productId)
        .single();
      unitPriceCents = product?.price_cents || 0;
    }

    // 3. Inserir ou incrementar no carrinho
    const { data: existingItem } = await db
      .from("cart_items")
      .select("id, quantity")
      .eq("cart_id", resolvedCartId as string)
      .eq("product_id", data.productId)
      .maybeSingle();

    if (existingItem !== null && existingItem !== undefined) {
      const newQty = existingItem.quantity + data.quantity;
      await db
        .from("cart_items")
        .update({
          quantity: newQty,
          total_price_cents: newQty * (unitPriceCents || 0),
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingItem.id);
    } else {
      await db.from("cart_items").insert({
        cart_id: resolvedCartId as string,
        product_id: data.productId,
        variant_id: data.variantId || null,
        quantity: data.quantity,
        unit_price_cents: unitPriceCents || 0,
        total_price_cents: data.quantity * (unitPriceCents || 0),
      });
    }

    // Retorna resumo atualizado
    const summary = await getChatCartSummary({ data: { cartId: resolvedCartId as string } });
    if (Boolean(summary) === false) {
      throw new Error("Falha ao carregar carrinho atualizado");
    }
    return summary as ChatCartSummaryDTO;
  });

export const updateChatCartItemQuantity = createServerFn({ method: "POST" })
  .validator(UpdateCartItemQtySchema)
  .handler(async ({ data }): Promise<{ success: boolean; cartId?: string }> => {
    const db = getServerClient();

    const { data: item } = await db
      .from("cart_items")
      .select("id, cart_id, unit_price_cents")
      .eq("id", data.cartItemId)
      .single();

    if (item === null || item === undefined) {
      throw new Error("Item do carrinho não encontrado");
    }

    if (data.quantity <= 0) {
      await db.from("cart_items").delete().eq("id", data.cartItemId);
    } else {
      await db
        .from("cart_items")
        .update({
          quantity: data.quantity,
          total_price_cents: data.quantity * item.unit_price_cents,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.cartItemId);
    }

    return { success: true, cartId: item.cart_id };
  });

export const getChatOrderTracking = createServerFn({ method: "GET" })
  .validator(ChatOrderTrackingQuerySchema)
  .handler(async ({ data }): Promise<ChatOrderTrackingDTO> => {
    const db = getServerClient();

    // 1. Buscar Pedido por ID ou public_token
    let orderQuery = db
      .from("orders")
      .select(
        "id, order_number, public_token, status, total_cents, subtotal_cents, shipping_cents, shipping_address, customer_snapshot, customer_id, store_id, order_items(id)",
      );

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.orderId);
    if (isUuid) {
      orderQuery = orderQuery.eq("id", data.orderId);
    } else {
      orderQuery = orderQuery.eq("public_token", data.orderId);
    }

    const { data: order, error: orderErr } = await orderQuery.maybeSingle();
    if (orderErr || order === null || order === undefined) {
      throw new Error("Pedido não encontrado");
    }

    if (isUuid) {
      const identity = await getServerIdentity().catch(() => null);
      if (!canReadChatOrderTracking(order, identity)) throw new Error("Você não tem permissão para consultar este pedido.");
    }

    // 2. Buscar Linha do Tempo Real do Pedido (order_events)
    const { data: events } = await db
      .from("order_events")
      .select("id, event_type, from_status, to_status, note, created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    // 3. Montar endereço legível
    const addr = order.shipping_address as any;
    const formattedAddress = addr
      ? `${addr.street || ""}, ${addr.number || ""} - ${addr.neighborhood || ""}, ${addr.city || ""}`
      : undefined;

    const timeline = (events || []).map((ev: any) => ({
      id: ev.id,
      eventType: ev.event_type,
      note: ev.note || "Evento registrado",
      createdAt: ev.created_at,
      fromStatus: ev.from_status || undefined,
      toStatus: ev.to_status || undefined,
    }));

    return {
      orderId: order.id,
      orderNumber: order.order_number || `WSY-${order.public_token.slice(0, 6).toUpperCase()}`,
      publicToken: order.public_token,
      status: order.status,
      totalCents: order.total_cents,
      subtotalCents: order.subtotal_cents,
      shippingCents: order.shipping_cents,
      itemsCount: Array.isArray(order.order_items) ? order.order_items.length : 0,
      deliveryAddress: formattedAddress,
      timeline,
    };
  });

// ==============================================================================
// 5. FASE C — SERVIÇOS, DEMANDAS E ORÇAMENTOS (Agenda, Slots e Cotações)
// ==============================================================================

export const listChatBookingServices = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid().optional() }))
  .handler(async ({ data }): Promise<ChatBookingServiceDTO[]> => {
    const db = getServerClient();

    let query = db
      .from("booking_services")
      .select("id, title, description, duration_minutes, price_cents, store_id, stores(name)")
      .eq("status", "active")
      .limit(20);

    if (Boolean(data.storeId)) {
      query = query.eq("store_id", data.storeId as string);
    }

    const { data: services, error } = await query;
    if (error || Boolean(services) === false) {
      return [];
    }

    return services.map((s: any) => ({
      id: s.id,
      title: s.title,
      description: s.description || undefined,
      durationMinutes: s.duration_minutes || 60,
      priceCents: s.price_cents || 0,
      storeId: s.store_id,
      storeName: Array.isArray(s.stores) ? s.stores[0]?.name : s.stores?.name || "Prestador Parceiro",
    }));
  });

export const getChatAvailableSlots = createServerFn({ method: "GET" })
  .validator(ChatBookingSlotsQuerySchema)
  .handler(async ({ data }): Promise<Array<{ slot: string; available: boolean }>> => {
    const db = getServerClient();

    // Janelas canônicas comerciais: das 08:00 às 18:00 de hora em hora
    const candidateHours = ["08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

    // Buscar agendamentos existentes no dia para o serviço
    const startOfDay = `${data.date}T00:00:00.000Z`;
    const endOfDay = `${data.date}T23:59:59.999Z`;

    const { data: existing } = await db
      .from("booking_appointments")
      .select("scheduled_at, status")
      .eq("service_id", data.serviceId)
      .neq("status", "cancelled")
      .gte("scheduled_at", startOfDay)
      .lte("scheduled_at", endOfDay);

    const bookedTimes = new Set(
      (existing || []).map((app: any) => {
        const d = new Date(app.scheduled_at);
        return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
      }),
    );

    return candidateHours.map((slot) => ({
      slot,
      available: Boolean(bookedTimes.has(slot)) === false,
    }));
  });

export const createChatAppointment = createServerFn({ method: "POST" })
  .validator(CreateChatAppointmentSchema)
  .handler(async ({ data }): Promise<ChatAppointmentDTO> => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    // 1. Obter serviço e preço oficial
    const { data: service, error: srvErr } = await db
      .from("booking_services")
      .select("id, title, price_cents")
      .eq("id", data.serviceId)
      .single();

    if (srvErr || Boolean(service) === false) {
      throw new Error("Serviço de agendamento não encontrado");
    }

    // 2. Inserir agendamento no banco
    const { data: appointment, error: appErr } = await db
      .from("booking_appointments")
      .insert({
        store_id: data.storeId,
        service_id: data.serviceId,
        customer_id: identity?.id || null,
        guest_name: data.guestName || identity?.email?.split("@")[0] || "Cliente Waesy",
        guest_phone: data.guestPhone || null,
        scheduled_at: data.scheduledAt,
        status: "pending",
        notes: data.notes || null,
      })
      .select("id, service_id, store_id, scheduled_at, status, notes, guest_name")
      .single();

    if (appErr || Boolean(appointment) === false) {
      throw new Error(`Falha ao registrar agendamento: ${appErr?.message}`);
    }

    return {
      id: appointment.id,
      serviceId: service.id,
      serviceTitle: service.title,
      storeId: appointment.store_id,
      scheduledAt: appointment.scheduled_at,
      status: appointment.status,
      priceCents: service.price_cents || 0,
      guestName: appointment.guest_name,
      notes: appointment.notes,
    };
  });

export const requestChatQuote = createServerFn({ method: "POST" })
  .validator(RequestChatQuoteSchema)
  .handler(async ({ data }): Promise<ChatQuoteDTO> => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    const year = new Date().getFullYear();
    const quoteNumber = `ORC-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
    const estimatedCents = data.estimatedBudgetCents || 0;
    const validUntil = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString();

    const { data: quote, error } = await db
      .from("quotes")
      .insert({
        store_id: data.storeId,
        customer_id: identity?.id || null,
        guest_name: data.guestName || null,
        guest_phone: data.guestPhone || null,
        quote_number: quoteNumber,
        status: "draft",
        subtotal_cents: estimatedCents,
        total_cents: estimatedCents,
        conditions: data.conditions,
        internal_notes: data.notes || null,
        valid_until: validUntil,
      })
      .select("id, quote_number, store_id, status, subtotal_cents, total_cents, conditions, valid_until")
      .single();

    if (error || Boolean(quote) === false) {
      throw new Error(`Falha ao registrar solicitação de orçamento: ${error?.message}`);
    }

    return {
      id: quote.id,
      quoteNumber: quote.quote_number,
      storeId: quote.store_id,
      status: quote.status,
      subtotalCents: quote.subtotal_cents,
      totalCents: quote.total_cents,
      conditions: quote.conditions,
      validUntil: quote.valid_until,
    };
  });

// ==============================================================================
// 6. FASE D — PAGAMENTO E IDEMPOTÊNCIA (Recálculo no Servidor e Ledger SHA-256)
// ==============================================================================

/**
 * Processamento idempotente de compra com recalculo no servidor e ledger criptográfico.
 */
export const processChatOrderPayment = createServerFn({ method: "POST" })
  .validator(ProcessChatOrderPaymentSchema)
  .handler(async ({ data }): Promise<{ success: boolean; orderId: string; publicToken: string; totalCents: number; wasReplay: boolean }> => {
    return await executeChatOrderPaymentCore(data);
  });

export async function executeChatOrderPaymentCore(
  data: z.infer<typeof ProcessChatOrderPaymentSchema>,
): Promise<{ success: boolean; orderId: string; publicToken: string; totalCents: number; wasReplay: boolean }> {
  const db = getServerClient();
  const identity = await getServerIdentity().catch(() => null);

  // 1. Verificação Estrita de Idempotência no Ledger
  const { data: existingLedger } = await db
    .from("immutable_ledger_entries")
    .select("reference_entity_id, amount_cents, metadata")
    .eq("idempotency_key", data.idempotencyKey)
    .maybeSingle();

  if (existingLedger !== null && existingLedger !== undefined && existingLedger.reference_entity_id) {
    // Replay idempotente — pedido já foi pago e processado anteriormente
    const { data: existingOrder } = await db
      .from("orders")
      .select("id, public_token, total_cents")
      .eq("id", existingLedger.reference_entity_id)
      .single();

    if (existingOrder !== null && existingOrder !== undefined) {
      return {
        success: true,
        orderId: existingOrder.id,
        publicToken: existingOrder.public_token,
        totalCents: existingOrder.total_cents,
        wasReplay: true,
      };
    }
  }

  // 2. Carregar Carrinho e Validar Itens
  const { data: cart, error: cartErr } = await db
    .from("carts")
    .select("id, store_id, shipping_cents, discount_cents")
    .eq("id", data.cartId)
    .single();

  if (cartErr || cart === null || cart === undefined) {
    throw new Error("Carrinho expirado ou não encontrado");
  }

  const { data: cartItems } = await db
    .from("cart_items")
    .select("id, product_id, variant_id, quantity, unit_price_cents, total_price_cents, products(title)")
    .eq("cart_id", data.cartId);

  if (Boolean(cartItems) === false || (cartItems as any[]).length === 0) {
    throw new Error("O carrinho está vazio. Adicione itens antes de realizar o pagamento.");
  }

  // 3. Recálculo Mandatório no Servidor (Zero Trust do Cliente)
  const itemsSnapshot = (cartItems as any[]).map((it) => {
    const prod = Array.isArray(it.products) ? it.products[0] : it.products;
    return {
      product_id: it.product_id,
      variant_id: it.variant_id,
      title: prod?.title || "Item do Pedido",
      quantity: it.quantity,
      unit_price_cents: it.unit_price_cents,
      total_cents: it.total_price_cents || it.unit_price_cents * it.quantity,
    };
  });

  const subtotalCents = itemsSnapshot.reduce((acc, it) => acc + it.total_cents, 0);
  const shippingCents = cart.shipping_cents || 0;
  const discountCents = cart.discount_cents || 0;
  const totalCents = Math.max(0, subtotalCents + shippingCents - discountCents);

  // 4. Criação Soberana do Pedido
  const { data: newOrder, error: orderErr } = await db
    .from("orders")
    .insert({
      store_id: cart.store_id,
      customer_id: identity?.id || null,
      status: "paid",
      items_snapshot: itemsSnapshot,
      subtotal_cents: subtotalCents,
      shipping_cents: shippingCents,
      discount_cents: discountCents,
      total_cents: totalCents,
      shipping_method: "delivery",
      shipping_address: data.shippingAddress || {},
      paid_at: new Date().toISOString(),
    })
    .select("id, public_token, total_cents")
    .single();

  if (orderErr || Boolean(newOrder) === false) {
    throw new Error(`Falha ao registrar pedido: ${orderErr?.message}`);
  }

  // 5. Atualizar status do carrinho para finalizado
  await db.from("carts").update({ status: "completed" }).eq("id", data.cartId);

  // 6. Registro no Ledger Criptográfico SHA-256 com Idempotência
  try {
    await recordLedgerEntryCore({
      transactionType: "order_payment",
      amountCents: totalCents,
      senderId: identity?.id || null,
      storeId: cart.store_id,
      referenceEntityType: "order",
      referenceEntityId: newOrder.id,
      idempotencyKey: data.idempotencyKey,
      metadata: {
        payment_method: data.paymentMethod,
        customer_email: data.customerEmail,
        customer_name: data.customerName,
        items_count: itemsSnapshot.length,
      },
    });
  } catch (ledgerErr) {
    console.error("[chat-commerce.functions] Falha ao registrar no ledger imutável:", ledgerErr);
  }

  return {
    success: true,
    orderId: newOrder.id,
    publicToken: newOrder.public_token,
    totalCents: newOrder.total_cents,
    wasReplay: false,
  };
}

/**
 * Processamento idempotente de pagamento para agendamento de serviço.
 */
export const processChatBookingPayment = createServerFn({ method: "POST" })
  .validator(ProcessChatBookingPaymentSchema)
  .handler(async ({ data }): Promise<{ success: boolean; appointmentId: string; wasReplay: boolean }> => {
    return await executeChatBookingPaymentCore(data);
  });

export async function executeChatBookingPaymentCore(
  data: z.infer<typeof ProcessChatBookingPaymentSchema>,
): Promise<{ success: boolean; appointmentId: string; wasReplay: boolean }> {
  const db = getServerClient();
  const identity = await getServerIdentity().catch(() => null);

  // 1. Verificação de Idempotência
  const { data: existingLedger } = await db
    .from("immutable_ledger_entries")
    .select("reference_entity_id")
    .eq("idempotency_key", data.idempotencyKey)
    .maybeSingle();

  if (existingLedger !== null && existingLedger !== undefined && existingLedger.reference_entity_id) {
    return {
      success: true,
      appointmentId: existingLedger.reference_entity_id,
      wasReplay: true,
    };
  }

  // 2. Atualizar status do agendamento para confirmado
  const { data: appointment, error: appErr } = await db
    .from("booking_appointments")
    .update({
      status: "confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.appointmentId)
    .select("id, store_id, service_id")
    .single();

  if (appErr || appointment === null || appointment === undefined) {
    throw new Error("Agendamento não encontrado para confirmação de pagamento");
  }

  // 3. Registrar no Ledger Imutável
  try {
    await recordLedgerEntryCore({
      transactionType: "booking_payment",
      amountCents: data.amountCents,
      senderId: identity?.id || null,
      storeId: appointment.store_id,
      referenceEntityType: "booking_appointment",
      referenceEntityId: appointment.id,
      idempotencyKey: data.idempotencyKey,
      metadata: {
        payment_method: data.paymentMethod,
        customer_email: data.customerEmail,
        customer_name: data.customerName,
      },
    });
  } catch (ledgerErr) {
    console.error("[chat-commerce.functions] Falha ao registrar agendamento no ledger:", ledgerErr);
  }

  return {
    success: true,
    appointmentId: appointment.id,
    wasReplay: false,
  };
}
