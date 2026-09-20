import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { withDataPayload } from "@/services/cart-helpers";

/**
 * Calculates shipping — pure handler for testability.
 */
export async function _calculateShipping({
 cartId,
 productId,
 storeId: explicitStoreId,
 zipcode,
 weightGrams = 500,
}: {
 cartId?: string;
 productId?: string;
 storeId?: string;
 zipcode: string;
 weightGrams?: number;
}) {
 const supabase = getServerClient();
 let resolvedStoreId = explicitStoreId;

 // Se o storeId não foi fornecido explicitamente, resolver via productId ou cartId
 if (!resolvedStoreId && productId) {
 const { data: prodData } = await supabase
 .from("products")
 .select("store_id, weight_kg, width_cm, height_cm, length_cm")
 .eq("id", productId)
 .maybeSingle();
 if (prodData?.store_id) {
 resolvedStoreId = prodData.store_id;
 }
 }

 if (!resolvedStoreId && cartId) {
 const { data: cartData } = await supabase
 .from("carts")
 .select("store_id")
 .eq("id", cartId)
 .maybeSingle();
 if (cartData?.store_id) {
 resolvedStoreId = cartData.store_id;
 }
 }

 if (!resolvedStoreId) {
 const identity = await getServerIdentity().catch(() => null);
 resolvedStoreId = identity?.store_id || undefined;
 }

 if (!resolvedStoreId) {
 return [];
 }

 // Fetch store type to adapt shipping logic
 const { data: storeInfo } = await supabase
 .from("stores")
 .select("address, city, state, settings, zip_code")
 .eq("id", resolvedStoreId)
 .single();
 const settings = (storeInfo?.settings as Record<string, any>) || {};
 const storeType = settings.type || settings.segment || "ecommerce";
 // CEP de origem dinâmico da loja (anti-GAP C2 - fix do hardcoded 01000000)
 const rawStoreZip = (storeInfo as any)?.zip_code || settings.zip_code || settings.zipcode || "";
 const storeOriginZip = String(rawStoreZip).replace(/\D/g, "");

 const finalQuotes: any[] = [];
 const cleanZipcode = zipcode.replace(/\D/g, "");

 // If digital/event niche, return a fixed free quote and exit early
 if (["event_producer", "creator", "band"].includes(storeType)) {
 return [
 {
 provider: "Digital",
 service_name: "Envio Eletrônico / Ingresso",
 price_cents: 0,
 estimated_days: 0,
 },
 ];
 }

 let totalWeightKg = 0;
 let maxW = 0;
 let maxH = 0;
 let maxL = 0;
 let itemsCount = 0;
 let hasMissingDimensions = false;

 if (cartId) {
 const { data: cartItems } = await supabase
 .from("cart_items")
 .select(
 "quantity, product_id, variant_id, products(weight_kg, width_cm, height_cm, length_cm), product_variants(weight_kg, width_cm, height_cm, length_cm)",
 )
 .eq("cart_id", cartId);

 if (cartItems) {
 type LogisticsRow = {
 weight_kg: number | null;
 width_cm: number | null;
 height_cm: number | null;
 length_cm: number | null;
 } | null;
 for (const item of cartItems) {
 const prod = item.products as unknown as LogisticsRow;
 const vari = item.product_variants as unknown as LogisticsRow;
 const wKg = vari?.weight_kg ?? prod?.weight_kg;
 const width = vari?.width_cm ?? prod?.width_cm;
 const height = vari?.height_cm ?? prod?.height_cm;
 const length = vari?.length_cm ?? prod?.length_cm;

 if (wKg == null || width == null || height == null || length == null) {
 hasMissingDimensions = true;
 } else {
 totalWeightKg += Number(wKg) * item.quantity;
 if (Number(width) > maxW) maxW = Number(width);
 if (Number(height) > maxH) maxH = Number(height);
 if (Number(length) > maxL) maxL = Number(length);
 }
 itemsCount += item.quantity;
 }
 }
 }

 if (itemsCount === 0) {
 hasMissingDimensions = true;
 }

 // 1. Fetch Manual Shipping Rates (Fallback/Local rules from Zones)
 const { data: zones } = await supabase
 .from("shipping_zones")
 .select("*, shipping_rates(*)")
 .eq("store_id", resolvedStoreId)
 .eq("is_active", true);

 if (zones && zones.length > 0) {
 // Determine which zones apply to the zipcode (by region prefix)
 const applicableZones = zones.filter((z) => {
 if (!z.regions || z.regions.length === 0) return false;
 return z.regions.some((prefix: string) => {
 if (prefix === "*") return true;
 return cleanZipcode.startsWith(prefix);
 });
 });

 applicableZones.forEach((zone) => {
 if (zone.shipping_rates && Array.isArray(zone.shipping_rates)) {
 zone.shipping_rates.forEach((rate: any) => {
 if (rate.is_active === false) return;
 const isLocalExpress = (rate.name || "").toLowerCase().includes("moto") || (zone.name || "").toLowerCase().includes("local");
 // Multiplicador dinâmico MotoLink Surge Pricing (1.20x para entrega expressa em horários de pico/chuva)
 const surgeMultiplier = isLocalExpress ? 1.20 : 1.0;
 const finalPriceCents = Math.round(rate.price_cents * surgeMultiplier);

        finalQuotes.push({
          id: rate.id || `rate-${rate.name || "local"}`.toLowerCase().replace(/\s+/g, "-"),
          name: rate.name,
          provider: zone.name,
          service_name: rate.name,
          price_cents: finalPriceCents,
          estimated_days: rate.estimated_days || 1,
          surge_applied: surgeMultiplier > 1.0,
          notice: surgeMultiplier > 1.0 ? "Tarifa dinâmica temporária" : undefined,
        });
 });
 }
 });
 }

 // 2. Integração: MelhorEnvio
 // Somente executa se o carrinho for válido, as dimensões existirem e houver chave na integração.
 // Ignora se for nicho de Delivery (onde a entrega é puramente motoboy local via zonas manuais)
 if (cartId && !hasMissingDimensions && itemsCount > 0 && storeType !== "delivery" && storeOriginZip.length === 8) {
 const { data: creds } = await supabase
 .from("integration_credentials")
 .select("token_payload, is_active")
 .eq("store_id", resolvedStoreId)
 .eq("provider", "melhor_envio")
 .maybeSingle();

 if (creds && creds.is_active && creds.token_payload && creds.token_payload.api_token) {
 try {
 const payload = {
 from: { postal_code: storeOriginZip },
 to: { postal_code: cleanZipcode },
 products: [
 {
 id: cartId,
 width: maxW,
 height: maxH,
 length: maxL,
 weight: totalWeightKg,
 insurance_value: 0,
 quantity: 1,
 },
 ],
 };

 const res = await fetch("https://www.melhorenvio.com.br/api/v2/me/shipment/calculate", {
 method: "POST",
 headers: {
 Accept: "application/json",
 "Content-Type": "application/json",
 Authorization: `Bearer ${creds.token_payload.api_token}`,
 },
 body: JSON.stringify(payload),
 });

 if (res.ok) {
 const quotes = await res.json();
 if (Array.isArray(quotes)) {
 for (const q of quotes) {
 if (q.error) continue;
 finalQuotes.push({
 provider: "MelhorEnvio",
 service_name: q.company?.name ? `${q.company.name} - ${q.name}` : q.name,
 price_cents: Math.round(Number(q.price) * 100),
 estimated_days: q.delivery_time || 5,
 });
 }
 }
 } else {
 console.warn("[shipping] MelhorEnvio falhou, ignorando integração.");
 }
 } catch (err) {
 console.error("[shipping] Erro ao chamar MelhorEnvio:", err);
 // Fallback silencioso para frete manual (já populado no array)
    }
  }
}

  // 3. Integração: MotoLink Express (Despacho Local Autônomo com Dynamic Surge Pricing)
  // Se a loja tiver a integração MotoLink ativa no Hub Central de Integrações
  try {
    const { data: motolinkCreds } = await supabase
      .from("integration_credentials")
      .select("token_payload, is_active")
      .eq("store_id", resolvedStoreId)
      .eq("provider", "motolink")
      .maybeSingle();

    if (motolinkCreds?.is_active) {
      const payload = (motolinkCreds.token_payload as Record<string, any>) || {};
      const baseFee = Number(payload.base_dispatch_fee_cents) || 1200; // R$ 12,00 base

      // Inteligência de Surge Pricing: Horários de pico comercial (almoço 11-14h / jantar 18-21h)
      const currentHour = new Date().getHours();
      const isPeakHour = (currentHour >= 11 && currentHour <= 14) || (currentHour >= 18 && currentHour <= 21);
      const surgeMultiplier = isPeakHour ? 1.25 : 1.0;
      const finalPriceCents = Math.round(baseFee * surgeMultiplier);

      const alreadyHasMoto = finalQuotes.some((q) => (q.service_name || "").toLowerCase().includes("motolink"));
      if (!alreadyHasMoto) {
        // Cálculo real de tempo: Tempo de Preparo/Separação da Loja + Deslocamento local
        const prepMinutes = Number(settings.prep_time_minutes || settings.preparation_time_minutes || 0);
        const serviceDisplayName = payload.service_name || "MotoLink Express (Entrega Local)";
        const allowScheduling = Boolean(
          settings.allow_scheduled_delivery ||
          storeType === "market" ||
          storeType === "supermarket" ||
          storeType === "pharmacy"
        );

        let timelineDesc = "Entrega local sob demanda · Despacho após confirmação";
        if (prepMinutes > 0) {
          timelineDesc = `Separação (~${prepMinutes} min) + deslocamento do entregador`;
        }

        finalQuotes.push({
          id: "motolink-express",
          name: serviceDisplayName,
          provider: "MotoLink Express",
          service_name: serviceDisplayName,
          price_cents: finalPriceCents,
          estimated_days: 0,
          description: timelineDesc,
          surge_applied: isPeakHour,
          notice: isPeakHour ? "Tarifa dinâmica temporária por alta demanda local" : undefined,
          allow_scheduling: allowScheduling,
          scheduled_windows: allowScheduling
            ? [
                { id: "today-morning", label: "Hoje (09h às 12h)" },
                { id: "today-afternoon", label: "Hoje (14h às 18h)" },
                { id: "tomorrow-morning", label: "Amanhã (09h às 12h)" },
                { id: "tomorrow-afternoon", label: "Amanhã (14h às 18h)" },
              ]
            : undefined,
        });
      }
    }
  } catch (motolinkErr) {
    console.warn("[shipping] Falha defensiva ao verificar credenciais MotoLink:", motolinkErr);
  }

  // 4. Save to Database to prevent tampering during checkout
 if (finalQuotes.length > 0 && resolvedStoreId) {
 const identity = await getServerIdentity().catch(() => null);
 const quotesToInsert = finalQuotes.map((q) => ({
 store_id: resolvedStoreId,
 cart_id: cartId || null,
 customer_id: identity?.id || null,
 zipcode: cleanZipcode,
 provider: q.provider,
 service_name: q.service_name,
 price_cents: q.price_cents,
 estimated_days: q.estimated_days,
 payload_snapshot: { totalWeightKg, maxW, maxH, maxL },
 }));
 await supabase.from("shipping_quotes").insert(quotesToInsert);
 }

 return finalQuotes;
}

export const calculateShipping = createServerFn({ method: "POST" })
  .validator(
    withDataPayload(
      z.object({
        cartId: z.string().optional(),
        productId: z.string().optional(),
        storeId: z.string().optional(),
        zipcode: z.string().min(1),
        weightGrams: z.number().optional(),
      }),
    ),
  )
  .handler(async ({ data }) => _calculateShipping(data));

// ---------------------------------------------------------------------------

export async function _listShippingZones() {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity.store_id) return [];
 assertStoreAccess(identity, ["owner", "admin", "manager"]);

 const { data: zones } = await supabase
 .from("shipping_zones")
 .select("*, shipping_rates(*)")
 .eq("store_id", identity.store_id);

 return zones || [];
}

export const listShippingZones = createServerFn({ method: "GET" }).handler(_listShippingZones);

// ---------------------------------------------------------------------------

export async function _upsertShippingZone(data: {
 id?: string;
 name: string;
 regions: string[];
 is_active: boolean;
}) {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);

 const payload = { ...data, store_id: identity.store_id };

 const { data: zone, error } = await supabase
 .from("shipping_zones")
 .upsert(payload)
 .select()
 .single();

 if (error) throw new Error(error.message);
 return zone;
}

export const upsertShippingZone = createServerFn({ method: "POST" })
  .validator(
    withDataPayload(
      z.object({
        id: z.string().optional(),
        name: z.string(),
        regions: z.array(z.string()),
        is_active: z.boolean(),
      }),
    ),
  )
  .handler(async ({ data }) => _upsertShippingZone(data));

// ---------------------------------------------------------------------------

export async function _deleteShippingZone(id: string) {
  const supabase = getServerClient();
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager"]);

  const { error } = await supabase
    .from("shipping_zones")
    .delete()
    .eq("id", id)
    .eq("store_id", identity.store_id);

  if (error) throw new Error(error.message);
  return true;
}

export const deleteShippingZone = createServerFn({ method: "POST" })
  .validator(withDataPayload(z.object({ id: z.string().min(1) })))
  .handler(async ({ data: { id } }) => _deleteShippingZone(id));

// ---------------------------------------------------------------------------

export async function _upsertShippingRate(data: {
  id?: string;
  zone_id: string;
  name: string;
  price_cents: number;
  min_order_cents?: number | null;
  estimated_days?: number | null;
  is_active?: boolean;
}) {
  const supabase = getServerClient();
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager"]);

  const payload = { ...data, store_id: identity.store_id };

  const { data: rate, error } = await supabase
    .from("shipping_rates")
    .upsert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rate;
}

export const upsertShippingRate = createServerFn({ method: "POST" })
  .validator(
    withDataPayload(
      z.object({
        id: z.string().optional(),
        zone_id: z.string().min(1),
        name: z.string(),
        price_cents: z.number().int(),
        min_order_cents: z.number().int().nullish(),
        estimated_days: z.number().int().nullish(),
        is_active: z.boolean().optional(),
      }),
    ),
  )
  .handler(async ({ data }) => _upsertShippingRate(data));

// ---------------------------------------------------------------------------

export async function _deleteShippingRate(id: string) {
  const supabase = getServerClient();
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager"]);

  const { error } = await supabase
    .from("shipping_rates")
    .delete()
    .eq("id", id)
    .eq("store_id", identity.store_id);

  if (error) throw new Error(error.message);
  return true;
}

export const deleteShippingRate = createServerFn({ method: "POST" })
  .validator(withDataPayload(z.object({ id: z.string().min(1) })))
  .handler(async ({ data: { id } }) => _deleteShippingRate(id));

export async function _listDrivers() {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity.store_id) return [];
 assertStoreAccess(identity, ["owner", "admin", "manager", "logistics"]);

 const { data: drivers, error } = await supabase
 .from("delivery_drivers")
 .select("*")
 .eq("store_id", identity.store_id)
 .order("name", { ascending: true });

 if (error) throw new Error(error.message);
 return drivers || [];
}

export const listDrivers = createServerFn({ method: "GET" }).handler(_listDrivers);

export const upsertDriver = createServerFn({ method: "POST" })
  .validator(
    withDataPayload(
      z.object({
        id: z.string().optional(),
        name: z.string().min(2),
        phone: z.string().optional(),
        vehicle_type: z.enum(["motorcycle", "bicycle", "car", "van"]).default("motorcycle"),
        status: z.enum(["available", "busy", "offline"]).default("available"),
      }),
    ),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "logistics"]);

    const payload = { ...data, store_id: identity.store_id };
    const { data: driver, error } = await supabase
      .from("delivery_drivers")
      .upsert(payload)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return driver;
  });

export const getOrderDispatches = createServerFn({ method: "GET" })
  .validator(withDataPayload(z.object({ orderId: z.string().min(1) })))
  .handler(async ({ data: { orderId } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "logistics"]);

 const { data, error } = await supabase
 .from("shipments")
 .select("*")
 .eq("order_id", orderId)
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

 if (error) throw new Error(error.message);
 return data || [];
 });

/**
 * 4. GERAÇÃO E GESTÃO DE ETIQUETAS DE DESPACHO (PDF, ZPL II & MELHOR ENVIO)
 * =========================================================================
 */

export interface ShippingLabelPayload {
  order: {
    id: string;
    order_number: string;
    created_at: string;
    total_cents: number;
    tracking_code?: string | null;
    carrier?: string | null;
    shipping_service?: string | null;
  };
  sender: {
    name: string;
    document: string;
    phone: string;
    email?: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zip_code: string;
  };
  recipient: {
    name: string;
    document?: string;
    phone?: string;
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zip_code: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    value_cents: number;
    weight_kg?: number;
  }>;
  total_weight_kg: number;
  package_format: "box" | "envelope" | "roll";
  barcode_data: string;
}

export const getOrderShippingLabelData = createServerFn({ method: "GET" })
  .validator(withDataPayload(z.object({ orderId: z.string().min(1) })))
  .handler(async ({ data: { orderId } }): Promise<ShippingLabelPayload> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "logistics"]);

    // 1. Busca os dados do pedido com itens
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*, order_items(*, products(*), product_variants(*))")
      .eq("id", orderId)
      .eq("store_id", identity.store_id)
      .single();

    if (orderErr || !order) {
      throw new Error("Pedido não encontrado para emissão de etiqueta.");
    }

    // 2. Busca dados cadastrais e configurações de frete da loja
    const { data: store } = await supabase
      .from("stores")
      .select("id, name, cnpj, phone, email, address, city, state, zip_code, settings")
      .eq("id", identity.store_id)
      .single();

    const storeSettings = (store?.settings as Record<string, any>) || {};
    const shippingConfig = storeSettings.shipping_config || {};
    const isCustomSender = shippingConfig.sender_origin_type === "custom_distribution_center";

    // 3. Resolve endereço do Remetente (Híbrido)
    const sender = {
      name: (isCustomSender ? shippingConfig.sender_name : null) || store?.name || "Loja Parceira Waesy",
      document: (isCustomSender ? shippingConfig.sender_document : null) || store?.cnpj || "",
      phone: (isCustomSender ? shippingConfig.sender_phone : null) || store?.phone || "",
      email: store?.email || undefined,
      street: (isCustomSender ? shippingConfig.sender_street : null) || store?.address || "Endereço Comercial",
      number: (isCustomSender ? shippingConfig.sender_number : null) || "S/N",
      complement: isCustomSender ? shippingConfig.sender_complement : "",
      neighborhood: (isCustomSender ? shippingConfig.sender_neighborhood : null) || "Centro",
      city: (isCustomSender ? shippingConfig.sender_city : null) || store?.city || "São Paulo",
      state: (isCustomSender ? shippingConfig.sender_state : null) || store?.state || "SP",
      zip_code: (isCustomSender ? shippingConfig.sender_zip_code : null) || store?.zip_code || "01000-000",
    };

    // 4. Resolve endereço do Destinatário
    const rawShippingAddr = order.shipping_address || {};
    const recipient = {
      name: order.customer_name || rawShippingAddr.recipient_name || rawShippingAddr.name || "Destinatário",
      document: order.customer_cpf || rawShippingAddr.document || undefined,
      phone: order.customer_phone || rawShippingAddr.phone || undefined,
      street: rawShippingAddr.street || rawShippingAddr.logradouro || rawShippingAddr.address || "Endereço de Entrega",
      number: String(rawShippingAddr.number || rawShippingAddr.numero || "S/N"),
      complement: rawShippingAddr.complement || rawShippingAddr.complemento || undefined,
      neighborhood: rawShippingAddr.neighborhood || rawShippingAddr.bairro || "Bairro",
      city: rawShippingAddr.city || rawShippingAddr.cidade || "Cidade",
      state: rawShippingAddr.state || rawShippingAddr.uf || "UF",
      zip_code: (rawShippingAddr.zipcode || rawShippingAddr.cep || rawShippingAddr.zip_code || "00000-000").replace(/\D/g, ""),
    };

    // 5. Itens do Pacote e Peso
    let totalWeight = 0;
    const items = (order.order_items || []).map((item: any) => {
      const prod = item.products || {};
      const vari = item.product_variants || {};
      const wKg = vari.weight_kg ?? prod.weight_kg ?? 0.3;
      totalWeight += Number(wKg) * (item.quantity || 1);

      return {
        description: item.title || item.name || prod.name || "Item Comercial",
        quantity: item.quantity || 1,
        value_cents: item.price_cents || item.unit_price_cents || 0,
        weight_kg: Number(wKg),
      };
    });

    const trackingCode = order.tracking_code || order.metadata?.tracking_code || `WAE${order.order_number?.replace(/\D/g, "").padStart(9, "0")}BR`;

    return {
      order: {
        id: order.id,
        order_number: String(order.order_number || order.id.slice(0, 8)),
        created_at: order.created_at,
        total_cents: order.total_cents || 0,
        tracking_code: order.tracking_code || order.metadata?.tracking_code,
        carrier: order.carrier || order.metadata?.carrier || "Correios",
        shipping_service: order.shipping_service || order.metadata?.shipping_service || "SEDEX",
      },
      sender,
      recipient,
      items,
      total_weight_kg: Number(Math.max(0.1, totalWeight).toFixed(3)),
      package_format: "box",
      barcode_data: trackingCode,
    };
  });

export const generateZplShippingLabel = createServerFn({ method: "POST" })
  .validator(withDataPayload(z.object({ orderId: z.string().min(1) })))
  .handler(async ({ data: { orderId } }) => {
    const payload = await getOrderShippingLabelData({ data: { orderId } });

    const cleanCepRecipient = payload.recipient.zip_code.replace(/\D/g, "");
    const trackingCode = payload.order.tracking_code || payload.barcode_data;
    const carrier = payload.order.carrier || "CORREIOS";
    const service = payload.order.shipping_service || "SEDEX";

    // Script canônico ZPL II padrão 100x150mm (800x1200 dots a 203 DPI)
    const zpl = [
      "^XA",
      "^PW800",
      "^LL1200",
      "^LH0,0",
      // Cabeçalho da Transportadora
      "^FO50,40^GB700,100,3^FS",
      `^FO70,60^A0N,45,45^FD${carrier.toUpperCase()}^FS`,
      `^FO480,65^A0N,35,35^FD${service.toUpperCase()}^FS`,
      // Código de Rastreamento Code 128
      "^FO100,180^BY3,3,100",
      `^BCN,100,Y,N,N^FD${trackingCode}^FS`,
      // Divisória
      "^FO50,330^GB700,2,2^FS",
      // Bloco DESTINATÁRIO
      "^FO50,350^A0N,28,28^FDDestinatario:^FS",
      `^FO50,385^A0N,32,32^FD${payload.recipient.name.slice(0, 38)}^FS`,
      `^FO50,425^A0N,26,26^FD${payload.recipient.street}, ${payload.recipient.number} ${payload.recipient.complement || ""}^FS`,
      `^FO50,460^A0N,26,26^FDBairro: ${payload.recipient.neighborhood}^FS`,
      `^FO50,495^A0N,28,28^FD${payload.recipient.city} - ${payload.recipient.state}^FS`,
      `^FO50,535^A0N,36,36^FDCEP: ${cleanCepRecipient.slice(0, 5)}-${cleanCepRecipient.slice(5)}^FS`,
      // Código de barras do CEP do Destinatário
      "^FO480,480^BY2,2,70",
      `^BCN,70,N,N,N^FD${cleanCepRecipient}^FS`,
      // Divisória
      "^FO50,600^GB700,2,2^FS",
      // Bloco REMETENTE
      "^FO50,620^A0N,24,24^FDRemetente:^FS",
      `^FO50,650^A0N,26,26^FD${payload.sender.name.slice(0, 40)}^FS`,
      `^FO50,680^A0N,22,22^FD${payload.sender.street}, ${payload.sender.number}^FS`,
      `^FO50,705^A0N,22,22^FD${payload.sender.neighborhood} - ${payload.sender.city}/${payload.sender.state}^FS`,
      `^FO50,730^A0N,24,24^FDCEP: ${payload.sender.zip_code}^FS`,
      // Informações do Pacote
      "^FO50,780^GB700,120,2^FS",
      `^FO70,800^A0N,24,24^FDPedido: #${payload.order.order_number}^FS`,
      `^FO350,800^A0N,24,24^FDPeso: ${payload.total_weight_kg} kg^FS`,
      `^FO70,840^A0N,20,20^FDItens: ${payload.items.length} produto(s) no volume^FS`,
      // Rodapé Chancelas
      "^FO200,950^A0N,22,22^FDWAESY LOGISTICA & FULFILLMENT NACIONAL^FS",
      "^XZ",
    ].join("\n");

    return { zpl, trackingCode, fileName: `etiqueta_${payload.order.order_number}_${trackingCode}.zpl` };
  });

export const updateOrderShippingDispatch = createServerFn({ method: "POST" })
  .validator(
    withDataPayload(
      z.object({
        orderId: z.string().min(1),
        carrier: z.string().min(1, "Informe a transportadora"),
        trackingCode: z.string().min(3, "Informe o código de rastreamento"),
        serviceName: z.string().optional(),
        notifyCustomer: z.boolean().default(true),
      }),
    ),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "logistics"]);

    const cleanTracking = data.trackingCode.trim().toUpperCase();

    // 1. Atualiza pedido
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, status, metadata, order_number, customer_phone, customer_name")
      .eq("id", data.orderId)
      .eq("store_id", identity.store_id)
      .single();

    if (orderErr || !order) {
      throw new Error("Pedido não encontrado para despacho.");
    }

    const currentMeta = (order.metadata as Record<string, any>) || {};
    const updatedMeta = {
      ...currentMeta,
      carrier: data.carrier,
      tracking_code: cleanTracking,
      shipping_service: data.serviceName || "Padrão",
      dispatched_at: new Date().toISOString(),
    };

    const nextStatus = order.status === "cancelled" ? "cancelled" : "shipped";

    const { error: updateErr } = await supabase
      .from("orders")
      .update({
        status: nextStatus,
        carrier: data.carrier,
        tracking_code: cleanTracking,
        metadata: updatedMeta,
      })
      .eq("id", data.orderId);

    if (updateErr) {
      // Tenta fallback sem colunas que possam não existir em schemas antigos
      await supabase
        .from("orders")
        .update({
          status: nextStatus,
          metadata: updatedMeta,
        })
        .eq("id", data.orderId);
    }

    // 2. Registra na tabela shipments
    await supabase.from("shipments").insert({
      store_id: identity.store_id,
      order_id: data.orderId,
      carrier: data.carrier,
      tracking_number: cleanTracking,
      shipping_method: data.serviceName || "Standard",
      status: "in_transit",
    });

    return { success: true, trackingCode: cleanTracking };
  });

export const getStoreShippingSettings = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager", "logistics"]);

  const { data: store } = await supabase
    .from("stores")
    .select("settings, name, cnpj, address, city, state, zip_code, phone")
    .eq("id", identity.store_id)
    .single();

  const settings = (store?.settings as Record<string, any>) || {};
  const config = settings.shipping_config || {};

  return {
    sender_origin_type: config.sender_origin_type || "store_profile",
    sender_name: config.sender_name || store?.name || "",
    sender_document: config.sender_document || store?.cnpj || "",
    sender_phone: config.sender_phone || store?.phone || "",
    sender_zip_code: config.sender_zip_code || store?.zip_code || "",
    sender_street: config.sender_street || store?.address || "",
    sender_number: config.sender_number || "",
    sender_complement: config.sender_complement || "",
    sender_neighborhood: config.sender_neighborhood || "",
    sender_city: config.sender_city || store?.city || "",
    sender_state: config.sender_state || store?.state || "",
    enabled_formats: {
      pdf: config.enabled_formats?.pdf !== false,
      zpl: config.enabled_formats?.zpl !== false,
      melhor_envio: Boolean(config.enabled_formats?.melhor_envio),
    },
    default_format: config.default_format || "pdf_100x150",
    auto_content_declaration: config.auto_content_declaration !== false,
    melhor_envio_token: config.melhor_envio_token ? "••••••••" : "",
    melhor_envio_environment: config.melhor_envio_environment || "production",
  };
});

export const saveStoreShippingSettings = createServerFn({ method: "POST" })
  .validator(
    withDataPayload(
      z.object({
        sender_origin_type: z.enum(["store_profile", "custom_distribution_center"]),
        sender_name: z.string().optional(),
        sender_document: z.string().optional(),
        sender_phone: z.string().optional(),
        sender_zip_code: z.string().optional(),
        sender_street: z.string().optional(),
        sender_number: z.string().optional(),
        sender_complement: z.string().optional(),
        sender_neighborhood: z.string().optional(),
        sender_city: z.string().optional(),
        sender_state: z.string().optional(),
        enabled_formats: z.object({
          pdf: z.boolean(),
          zpl: z.boolean(),
          melhor_envio: z.boolean(),
        }),
        default_format: z.enum(["melhor_envio", "pdf_100x150", "zpl"]),
        auto_content_declaration: z.boolean(),
        melhor_envio_token: z.string().optional(),
        melhor_envio_environment: z.enum(["sandbox", "production"]).optional(),
      }),
    ),
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
    const existingShipping = currentSettings.shipping_config || {};

    const updatedConfig = {
      ...data,
      melhor_envio_token:
        data.melhor_envio_token && !data.melhor_envio_token.includes("••••")
          ? data.melhor_envio_token
          : existingShipping.melhor_envio_token,
    };

    const { error } = await supabase
      .from("stores")
      .update({
        settings: {
          ...currentSettings,
          shipping_config: updatedConfig,
        },
      })
      .eq("id", identity.store_id);

    if (error) throw new Error("Erro ao salvar configurações de frete: " + error.message);
    return { success: true };
  });
