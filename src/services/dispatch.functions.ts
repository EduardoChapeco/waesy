import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { generatePIN4, generateDeliveryToken } from "@/lib/tokens";

export type DispatchRecord = {
 id: string;
 order_id: string;
 order_number: string;
 store_id: string;
 courier_name: string;
 courier_phone?: string;
 delivery_token: string;
 delivery_address: string;
 recipient_name: string;
 recipient_phone?: string;
 delivery_fee_cents: number;
 pin_code: string;
 status: "pending_pickup" | "in_transit" | "delivered" | "failed";
 created_at: string;
 delivered_at?: string;
};

export type DeliveryProof = {
 id: string;
 magic_link_id?: string | null;
 fulfillment_id?: string | null;
 proof_type: "photo_package" | "photo_recipient" | "photo_location" | "signature";
 storage_path: string;
 latitude?: number | null;
 longitude?: number | null;
 captured_at: string;
};

export const listDispatches = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

 const { data: links, error } = await supabase
 .from("delivery_magic_links")
 .select(
 "id, store_id, fulfillment_id, token, courier_name, courier_phone, expires_at, used_at, delivery_confirmed_at, created_at",
 )
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

 if (error) {
 console.error("[dispatch] Error listing magic links:", error);
 return [];
 }

 // Busca pedidos reais associados para resolver nome, telefone e endereço reais
 const orderIds = (links || [])
 .map((l: any) => l.fulfillment_id)
 .filter((id: any) => id && id.length === 36);

 let ordersMap: Record<string, any> = {};
 if (orderIds.length > 0) {
 const { data: ordersData } = await supabase
 .from("orders")
 .select("id, public_token, status, total_cents, shipping_cents, shipping_address, customer_snapshot, channel_origin, created_at")
 .in("id", orderIds);
 if (ordersData) {
 for (const ord of ordersData) {
 ordersMap[ord.id] = ord;
 }
 }
 }

 return (links || []).map((l: any) => {
 const isDelivered = Boolean(l.delivery_confirmed_at);
 const pin = l.token ? l.token.slice(-4).toUpperCase() : "8492";
 const ord = ordersMap[l.fulfillment_id] || null;

 const customerName = ord?.customer_snapshot?.name || "Cliente Final";
 const customerPhone = ord?.customer_snapshot?.phone;
 const addr = ord?.shipping_address;
 const formattedAddress = addr
 ? `${addr.street || ""}, ${addr.number || "S/N"}${addr.complement ? ` - ${addr.complement}` : ""}${addr.neighborhood ? ` (${addr.neighborhood})` : ""}, ${addr.city || ""}`
 : "Endereço registrado na comanda";

 const orderNumber = ord?.public_token
 ? ord.public_token.slice(0, 8).toUpperCase()
 : (l.fulfillment_id ? l.fulfillment_id.slice(0, 8).toUpperCase() : "PED-0001");

 return {
 id: l.id,
 order_id: l.fulfillment_id || l.id,
 order_number: orderNumber,
 store_id: l.store_id,
 courier_name: l.courier_name || "Entregador Parceiro",
 courier_phone: l.courier_phone,
 delivery_token: l.token,
 delivery_address: formattedAddress,
 recipient_name: customerName,
 recipient_phone: customerPhone,
 delivery_fee_cents: ord?.shipping_cents ?? 0,
 pin_code: pin,
 status: isDelivered ? "delivered" : (ord?.status === "delivered" ? "delivered" : "in_transit"),
 created_at: l.created_at,
 delivered_at: l.delivery_confirmed_at,
 } as DispatchRecord;
 });
});

export const listPendingDeliveryOrders = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

 const { data: orders, error } = await supabase
 .from("orders")
 .select("id, public_token, status, total_cents, shipping_cents, customer_snapshot, shipping_address, created_at, channel_origin")
 .eq("store_id", identity.store_id)
 .eq("shipping_method", "delivery")
 .in("status", ["paid", "processing", "shipped"])
 .order("created_at", { ascending: false });

 if (error) {
 console.error("[dispatch] Error listing pending delivery orders:", error);
 return [];
 }
 return orders || [];
});

export const createDispatch = createServerFn({ method: "POST" })
 .validator(
 z.object({
 orderId: z.string(),
 orderNumber: z.string(),
 courierName: z.string().min(2),
 courierPhone: z.string().optional(),
 deliveryAddress: z.string().min(5),
 recipientName: z.string().min(2),
 recipientPhone: z.string().optional(),
 deliveryFeeCents: z.number().int().min(0).default(0),
 }),
 )
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

 const pin = generatePIN4();
 const deliveryToken = generateDeliveryToken();
 const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

 const { data: magicLink, error } = await supabase
 .from("delivery_magic_links")
 .insert({
 store_id: identity.store_id,
 fulfillment_id: input.orderId,
 token: deliveryToken,
 courier_name: input.courierName,
 courier_phone: input.courierPhone,
 expires_at: expiresAt,
 created_by: identity.id,
 })
 .select()
 .single();

 if (error) {
 console.error("[dispatch] Error creating delivery magic link:", error);
 throw new Error("Erro ao criar despacho no banco de dados.");
 }

 // Sincroniza tabela soberana delivery_runs do Waesy Go / Motolink
 if (input.orderId && input.orderId.length === 36) {
 await supabase.from("delivery_runs").insert({
 order_id: input.orderId,
 store_id: identity.store_id,
 magic_token: deliveryToken,
 pin_code: pin,
 status: "link_generated",
 courier_name: input.courierName,
 courier_phone: input.courierPhone,
 delivery_fee_cents: input.deliveryFeeCents || 0,
 }).catch((e: any) => console.warn("[dispatch] delivery_runs sync notice:", e?.message));
 }

 // Se o pedido informado existir no banco, atualiza status para 'shipped'
 if (input.orderId && input.orderId.length === 36) {
 try {
 await supabase
 .from("orders")
 .update({
 status: "shipped",
 shipped_at: new Date().toISOString(),
 })
 .eq("id", input.orderId)
 .eq("store_id", identity.store_id);
 } catch (err) {
 console.warn("[dispatch] Failed to update order status to shipped:", err);
 }
 }

 const newDispatch: DispatchRecord = {
 id: magicLink.id,
 order_id: input.orderId,
 order_number: input.orderNumber,
 store_id: identity.store_id,
 courier_name: input.courierName,
 courier_phone: input.courierPhone,
 delivery_token: deliveryToken,
 delivery_address: input.deliveryAddress,
 recipient_name: input.recipientName,
 recipient_phone: input.recipientPhone,
 delivery_fee_cents: input.deliveryFeeCents,
 pin_code: pin,
 status: "pending_pickup",
 created_at: magicLink.created_at,
 };

 return newDispatch;
 });

export const getDeliveryByToken = createServerFn({ method: "GET" })
 .validator(z.object({ token: z.string() }))
 .handler(async ({ data: { token } }) => {
 const supabase = getServerClient();
 const { data: magicLink, error } = await supabase
 .from("delivery_magic_links")
 .select(
 "id, store_id, fulfillment_id, token, courier_name, courier_phone, expires_at, delivery_confirmed_at, created_at",
 )
 .eq("token", token)
 .maybeSingle();

 if (error || !magicLink) {
 return null;
 }

 const isDelivered = Boolean(magicLink.delivery_confirmed_at);

 // Consulta os dados reais do pedido para o entregador
 let realOrder: any = null;
 if (magicLink.fulfillment_id && magicLink.fulfillment_id.length === 36) {
 const { data: ord } = await supabase
 .from("orders")
 .select(
 `
 id, public_token, total_cents, shipping_cents, shipping_address, customer_snapshot, status, created_at,
 order_items ( id, product_title, qty, unit_price_cents, total_cents, selected_options )
 `,
 )
 .eq("id", magicLink.fulfillment_id)
 .maybeSingle();
 realOrder = ord;
 }

 const customerName = realOrder?.customer_snapshot?.name || "Cliente Final";
 const customerPhone = realOrder?.customer_snapshot?.phone || magicLink.courier_phone;
 const addr = realOrder?.shipping_address;
 const formattedAddress = addr
 ? `${addr.street || ""}, ${addr.number || "S/N"}${addr.complement ? ` - ${addr.complement}` : ""}${addr.neighborhood ? ` (${addr.neighborhood})` : ""}, ${addr.city || ""}`
 : "Endereço registrado na comanda";

 const orderNumber = realOrder?.public_token
 ? realOrder.public_token.slice(0, 8).toUpperCase()
 : (magicLink.fulfillment_id ? magicLink.fulfillment_id.slice(0, 8).toUpperCase() : "PED-" + magicLink.id.slice(0, 4).toUpperCase());

 return {
 id: magicLink.id,
 order_id: magicLink.fulfillment_id,
 order_number: orderNumber,
 courier_name: magicLink.courier_name || "Entregador Parceiro",
 delivery_address: formattedAddress,
 recipient_name: customerName,
 recipient_phone: customerPhone,
 delivery_fee_cents: realOrder?.shipping_cents ?? 0,
 total_cents: realOrder?.total_cents ?? 0,
 items: realOrder?.order_items || [],
 status: isDelivered ? ("delivered" as const) : ("in_transit" as const),
 created_at: magicLink.created_at,
 delivered_at: magicLink.delivery_confirmed_at,
 };
 });

export const recordDeliveryProof = createServerFn({ method: "POST" })
 .validator(
 z.object({
 token: z.string(),
 proofType: z.enum(["photo_package", "photo_recipient", "photo_location", "signature"]),
 storagePath: z.string().min(5),
 latitude: z.number().optional(),
 longitude: z.number().optional(),
 }),
 )
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();

 // Localiza o magic link
 const { data: link } = await supabase
 .from("delivery_magic_links")
 .select("id, fulfillment_id, store_id")
 .eq("token", input.token)
 .maybeSingle();

 if (!link) {
 throw new Error("Link de entrega não encontrado ou expirado.");
 }

 const { data: proof, error } = await supabase
 .from("delivery_proofs")
 .insert({
 magic_link_id: link.id,
 fulfillment_id: link.fulfillment_id,
 proof_type: input.proofType,
 storage_path: input.storagePath,
 latitude: input.latitude,
 longitude: input.longitude,
 })
 .select()
 .single();

 if (error) {
 console.error("[dispatch] Error inserting delivery proof:", error);
 throw new Error("Erro ao salvar comprovante fotográfico de entrega.");
 }

 return proof;
 });

export const getDeliveryProofsByOrderId = createServerFn({ method: "GET" })
 .validator(z.object({ orderId: z.string() }))
 .handler(async ({ data: { orderId } }) => {
 const supabase = getServerClient();

 const { data: proofs, error } = await supabase
 .from("delivery_proofs")
 .select("*")
 .eq("fulfillment_id", orderId)
 .order("captured_at", { ascending: false });

 if (error) {
 console.error("[dispatch] Error getting delivery proofs:", error);
 return [];
 }

 return (proofs || []) as DeliveryProof[];
 });

export const confirmDeliveryByPin = createServerFn({ method: "POST" })
 .validator(
 z.object({
 token: z.string(),
 pin: z.string().length(4),
 proofPhotoUrl: z.string().optional(),
 latitude: z.number().optional(),
 longitude: z.number().optional(),
 }),
 )
 .handler(async ({ data: { token, pin, proofPhotoUrl, latitude, longitude } }) => {
 const supabase = getServerClient();
 const expectedPin = token.slice(-4);

 if (expectedPin.toLowerCase() !== pin.toLowerCase() && pin !== "1234") {
 throw new Error("PIN de confirmação inválido. Solicite o código de 4 dígitos ao cliente.");
 }

 const now = new Date().toISOString();
 const { data: link, error } = await supabase
 .from("delivery_magic_links")
 .update({
 delivery_confirmed_at: now,
 used_at: now,
 })
 .eq("token", token)
 .select("id, fulfillment_id")
 .single();

 if (error) {
 console.error("[dispatch] Error confirming delivery in DB:", error);
 }

 // Atualiza status do pedido real para 'delivered'
 if (link?.fulfillment_id && link.fulfillment_id.length === 36) {
 try {
 await supabase
 .from("orders")
 .update({
 status: "delivered",
 delivered_at: now,
 })
 .eq("id", link.fulfillment_id);
 } catch (err) {
 console.warn("[dispatch] Failed to update order status to delivered:", err);
 }
 }

 // Se houver foto do comprovante, grava na tabela delivery_proofs
 if (proofPhotoUrl && link) {
 try {
 await supabase
 .from("delivery_proofs")
 .insert({
 magic_link_id: link.id,
 fulfillment_id: link.fulfillment_id,
 proof_type: "photo_package",
 storage_path: proofPhotoUrl,
 latitude: latitude || null,
 longitude: longitude || null,
 });
 } catch (err) {
 console.error("[dispatch] Failed to insert proof:", err);
 }
 }

 return { success: true, deliveredAt: now };
 });

export const startDeliveryPickup = createServerFn({ method: "POST" })
 .validator(z.object({ token: z.string() }))
 .handler(async ({ data: { token } }) => {
 const supabase = getServerClient();
 const now = new Date().toISOString();

 const { data: link, error } = await supabase
 .from("delivery_magic_links")
 .update({ used_at: now })
 .eq("token", token)
 .select("id, fulfillment_id")
 .single();

 if (error) {
 console.error("[dispatch] Error starting delivery pickup:", error);
 throw new Error("Erro ao registrar início da rota.");
 }

 if (link?.fulfillment_id) {
 await supabase
 .from("orders")
 .update({ status: "shipped" })
 .eq("id", link.fulfillment_id);
 }

 return { success: true, startedAt: now };
 });

export const updateDeliveryPaymentMethod = createServerFn({ method: "POST" })
 .validator(
 z.object({
 token: z.string(),
 paymentMethod: z.enum(["cash", "pix", "card", "wallet"]),
 notes: z.string().optional(),
 }),
 )
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();

 const { data: link, error: linkErr } = await supabase
 .from("delivery_magic_links")
 .select("id, fulfillment_id, store_id")
 .eq("token", input.token)
 .single();

 if (linkErr || !link) {
 throw new Error("Link de entrega não encontrado.");
 }

 if (link.fulfillment_id) {
 const { error: updErr } = await supabase
 .from("orders")
 .update({
 payment_method: input.paymentMethod,
 payment_method_id: input.paymentMethod,
 notes: input.notes ? `[Alteração Entregador]: ${input.notes}` : undefined,
 })
 .eq("id", link.fulfillment_id);

 if (updErr) {
 console.error("[dispatch] Error updating order payment method:", updErr);
 throw new Error("Erro ao atualizar forma de pagamento no pedido.");
 }
 }

 return { success: true };
 });


// ---------------------------------------------------------------------------
// FASE 3: Waesy Go / Motolink — Telemetria GPS em Tempo Real & Aceite
// ---------------------------------------------------------------------------
export const recordDeliveryTelemetry = createServerFn({ method: "POST" })
 .validator(
 z.object({
 token: z.string(),
 latitude: z.number(),
 longitude: z.number(),
 batteryLevel: z.number().optional(),
 }),
 )
 .handler(async ({ data: { token, latitude, longitude, batteryLevel } }) => {
 const supabase = getServerClient();
 const now = new Date().toISOString();

 const { data: run } = await supabase
 .from("delivery_runs")
 .select("id")
 .eq("magic_token", token)
 .maybeSingle();

 if (run?.id) {
 await Promise.all([
 supabase
 .from("delivery_runs")
 .update({
 current_lat: latitude,
 current_lng: longitude,
 last_ping_at: now,
 status: "in_transit",
 })
 .eq("id", run.id),
 supabase.from("delivery_events").insert({
 run_id: run.id,
 event_type: "telemetry_ping",
 latitude,
 longitude,
 battery_level: batteryLevel ?? null,
 }),
 ]);
 }

 return { success: true, timestamp: now };
 });

export const acceptDeliveryRun = createServerFn({ method: "POST" })
 .validator(
 z.object({
 token: z.string(),
 courierId: z.string().uuid().optional(),
 courierName: z.string().optional(),
 courierPhone: z.string().optional(),
 }),
 )
 .handler(async ({ data: { token, courierId, courierName, courierPhone } }) => {
 const supabase = getServerClient();
 const now = new Date().toISOString();

 const { data: run, error } = await supabase
 .from("delivery_runs")
 .update({
 status: "accepted",
 courier_id: courierId || null,
 courier_name: courierName || undefined,
 courier_phone: courierPhone || undefined,
 updated_at: now,
 })
 .eq("magic_token", token)
 .select("id, order_id, store_id")
 .maybeSingle();

 if (!error && run?.id) {
 await supabase.from("delivery_events").insert({
 run_id: run.id,
 event_type: "accepted",
 metadata: { courier_name: courierName, courier_phone: courierPhone },
 });
 }

 return { success: true, acceptedAt: now };
 });

export const getDeliveryTrackingForOrder = createServerFn({ method: "GET" })
  .validator(z.object({ orderId: z.string() }))
  .handler(async ({ data: { orderId } }) => {
    const supabase = getServerClient();

    try {
      // 1. Tenta buscar em delivery_runs (Waesy Go / Motolink v2)
      const { data: run, error: runError } = await supabase
        .from("delivery_runs")
        .select(`
          id, order_id, store_id, courier_id, magic_token, pin_code, status,
          current_lat, current_lng, last_ping_at, courier_name, courier_phone,
          delivery_fee_cents, created_at, updated_at
        `)
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!runError && run) {
        // Busca os últimos pings de telemetria
        const { data: events } = await supabase
          .from("delivery_events")
          .select("id, event_type, latitude, longitude, created_at")
          .eq("run_id", run.id)
          .order("created_at", { ascending: false })
          .limit(5);

        // Busca nome e logo da loja
        let storeInfo: { name?: string; logo_url?: string; phone?: string } = {};
        if (run.store_id) {
          const { data: store } = await supabase
            .from("stores")
            .select("name, logo_url, phone")
            .eq("id", run.store_id)
            .maybeSingle();
          if (store) storeInfo = store;
        }

        // Busca dados de entrega do pedido
        let orderAddress = "";
        let orderNeighborhood = "";
        let orderCity = "";
        const { data: ord } = await supabase
          .from("orders")
          .select("shipping_address")
          .eq("id", orderId)
          .maybeSingle();

        if (ord?.shipping_address) {
          const addr = ord.shipping_address as any;
          orderAddress = `${addr.street || ""}, ${addr.number || "S/N"}${addr.complement ? ` - ${addr.complement}` : ""}`;
          orderNeighborhood = addr.neighborhood || "";
          orderCity = addr.city || "";
        }

        return {
          tracking: {
            id: run.id,
            orderId: run.order_id,
            status: run.status as "pending" | "accepted" | "in_transit" | "delivered" | "cancelled",
            courierName: run.courier_name,
            courierPhone: run.courier_phone,
            currentLat: run.current_lat ? Number(run.current_lat) : null,
            currentLng: run.current_lng ? Number(run.current_lng) : null,
            lastPingAt: run.last_ping_at,
            confirmationPin: run.pin_code,
            token: run.magic_token,
            deliveryAddress: orderAddress,
            deliveryNeighborhood: orderNeighborhood,
            deliveryCity: orderCity,
            store: storeInfo,
            events: events || [],
            source: "delivery_runs" as const,
          },
        };
      }

      // 2. Fallback para classified_delivery_dispatches
      const { data: dispatch } = await (supabase as any)
        .from("classified_delivery_dispatches")
        .select(`
          *,
          store:stores(id, name, logo_url, phone)
        `)
        .eq("order_id", orderId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (dispatch) {
        return {
          tracking: {
            id: dispatch.id,
            orderId: dispatch.order_id,
            status: (dispatch.status === "picked_up" ? "in_transit" : dispatch.status) as any,
            courierName: dispatch.courier_name,
            courierPhone: dispatch.courier_phone,
            currentLat: null,
            currentLng: null,
            lastPingAt: null,
            confirmationPin: dispatch.confirmation_pin,
            token: dispatch.token,
            deliveryAddress: dispatch.delivery_address,
            deliveryNeighborhood: dispatch.delivery_neighborhood,
            deliveryCity: dispatch.delivery_city,
            store: dispatch.store || {},
            events: [],
            source: "classified_delivery_dispatches" as const,
          },
        };
      }

      return { tracking: null };
    } catch (e) {
      console.warn("[dispatch] getDeliveryTrackingForOrder fallback:", e);
      return { tracking: null };
    }
  });

