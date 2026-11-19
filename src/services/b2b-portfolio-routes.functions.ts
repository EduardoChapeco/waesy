import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { requireRole } from "@/lib/auth-guards.server";
import { getServerIdentity } from "@/lib/identity.server";

function throwIfQueryFailed(error: { message?: string } | null, message: string): void {
  if (error) {
    throw new Error(error.message ? `${message}: ${error.message}` : message);
  }
}

// ==============================================================================
// TIPOS E SCHEMAS CANÔNICOS DE B2B E ROTAS
// ==============================================================================

export type RotarySlaStatus = "on_track" | "attention" | "risk" | "churn_loss";

export interface RotaryQueueCustomerDTO {
  portfolioId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  customerLat?: number | null;
  customerLng?: number | null;
  sellerProfileId: string;
  catalogId?: string | null;
  priceTableId?: string | null;
  priceTableName?: string | null;
  visitWeekdays: number[];
  visitFrequencyDays: number;
  avgRepurchaseDays: number;
  lastOrderAt?: string | null;
  daysSinceLastOrder: number;
  nextAttentionDate?: string | null;
  slaStatus: RotarySlaStatus;
  churnRiskScore: number;
  notes?: string | null;
}

export interface RouteStopDTO {
  stopId: string;
  stopOrder: number;
  plannedTime?: string | null;
  status: "pending" | "in_transit" | "completed" | "skipped" | "cancelled";
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  customerAddress?: string | null;
  lat?: number | null;
  lng?: number | null;
}

// ==============================================================================
// HELPERS MATEMÁTICOS E DE GEOFENCE (HAVERSINE)
// ==============================================================================

/**
 * Calcula a distância ortodrômica em metros entre dois pontos geográficos (fórmula de Haversine).
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Raio médio da Terra em metros
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Calcula o próximo ciclo de atenção com base na data do último pedido e frequência média.
 */
export function computeNextAttentionCycle(
  lastOrderAt: string | null | undefined,
  avgRepurchaseDays: number
): { nextAttentionDate: string; daysSinceLastOrder: number; slaStatus: RotarySlaStatus } {
  const now = new Date();
  if (!lastOrderAt) {
    return {
      nextAttentionDate: new Date(now.getTime() + avgRepurchaseDays * 86400000).toISOString().split("T")[0],
      daysSinceLastOrder: 999,
      slaStatus: "risk",
    };
  }

  const lastOrderDate = new Date(lastOrderAt);
  const diffTime = Math.abs(now.getTime() - lastOrderDate.getTime());
  const daysSinceLastOrder = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const nextAttention = new Date(lastOrderDate.getTime() + avgRepurchaseDays * 86400000);
  const nextAttentionDate = nextAttention.toISOString().split("T")[0];

  let slaStatus: RotarySlaStatus = "on_track";
  const ratio = daysSinceLastOrder / Math.max(1, avgRepurchaseDays);

  if (ratio > 1.5) {
    slaStatus = "churn_loss";
  } else if (ratio >= 1.0) {
    slaStatus = "risk";
  } else if (ratio >= 0.8) {
    slaStatus = "attention";
  }

  return { nextAttentionDate, daysSinceLastOrder, slaStatus };
}

// ==============================================================================
// RESOLVER SOBERANO DE PREÇO B2B (SERVER-SIDE ZERO-TRUST)
// ==============================================================================

export const resolveEffectiveCustomerOfferFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      customerId: z.string().uuid().optional(),
      productId: z.string().uuid(),
      quantity: z.number().int().min(1).default(1),
      storeId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data: { customerId, productId, quantity, storeId: explicitStoreId } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    // 1. Busca produto base
    const { data: product, error: prodErr } = await supabase
      .from("products")
      .select("id, title, price_cents, min_order_quantity, store_id")
      .eq("id", productId)
      .single();

    throwIfQueryFailed(prodErr, "Produto não encontrado para resolução de preço.");
    if (!product) throw new Error("Produto não encontrado.");

    const targetStoreId = explicitStoreId || identity.store_id || product.store_id;
    if (!targetStoreId) {
      throw new Error("Loja ativa não identificada.");
    }

    const resolvedCustomerId = customerId || identity.id || identity.user_id;
    const basePrice = Number(product.price_cents ?? (product as any).price ?? 0);
    const productName = product.title || (product as any).name || "Produto";

    let effectivePrice = basePrice;
    let appliedTable: { id: string; name: string; discountPercentage?: number } | null = null;
    let isWholesale = false;

    // 2. Se houver cliente, verificar se possui tabela associada em customer_price_table_assignments
    if (resolvedCustomerId) {
      const { data: assignment } = await supabase
        .from("customer_price_table_assignments")
        .select("price_table_id, price_tables(id, name, base_discount_percentage, active, valid_until)")
        .eq("customer_id", resolvedCustomerId)
        .eq("store_id", targetStoreId)
        .maybeSingle();

      const table = assignment?.price_tables as any;
      if (table && table.active && (!table.valid_until || new Date(table.valid_until) >= new Date())) {
        // Verificar se há item específico na tabela
        const { data: tableItem } = await supabase
          .from("price_table_items")
          .select("custom_price, min_quantity, max_quantity")
          .eq("price_table_id", table.id)
          .eq("product_id", productId)
          .maybeSingle();

        if (tableItem && quantity >= (tableItem.min_quantity || 1)) {
          effectivePrice = Number(tableItem.custom_price || 0);
          appliedTable = { id: table.id, name: table.name };
          isWholesale = true;
        } else if (table.base_discount_percentage > 0) {
          const discount = Math.round(basePrice * (table.base_discount_percentage / 100));
          effectivePrice = Math.max(0, basePrice - discount);
          appliedTable = {
            id: table.id,
            name: table.name,
            discountPercentage: table.base_discount_percentage,
          };
          isWholesale = true;
        }
      }
    }

    return {
      productId: product.id,
      productName,
      basePrice,
      effectivePrice,
      totalPrice: effectivePrice * quantity,
      quantity,
      isWholesale,
      appliedTable,
    };
  });

// ==============================================================================
// FILA OPERACIONAL DIÁRIA (CARTEIRA ROTATIVA)
// ==============================================================================

export const listSellerPortfolioRotaryQueueFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      targetWeekday: z.number().int().min(1).max(7).optional(),
    }).optional()
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const auth = await requireRole(["owner", "admin", "manager", "seller"]);
    const storeId = auth.store_id;

    const query = supabase
      .from("seller_portfolio_assignments")
      .select(`
        id, customer_id, seller_profile_id, catalog_id, price_table_id,
        visit_weekdays, visit_frequency_days, avg_repurchase_days,
        last_visit_at, last_order_at, next_attention_date, churn_risk_score, notes,
        profiles!seller_portfolio_assignments_customer_id_fkey(full_name, phone),
        price_tables(id, name)
      `)
      .eq("store_id", storeId)
      .eq("active", true);

    const { data: rows, error } = await query;
    throwIfQueryFailed(error, "Falha ao consultar carteira rotativa de clientes.");

    const todayWeekday = new Date().getDay() === 0 ? 7 : new Date().getDay(); // 1=Seg..7=Dom
    const requestedWeekday = data?.targetWeekday ?? todayWeekday;

    const parsed: RotaryQueueCustomerDTO[] = (rows || []).map((r: any) => {
      const calc = computeNextAttentionCycle(r.last_order_at, r.avg_repurchase_days || 14);

      return {
        portfolioId: r.id,
        customerId: r.customer_id,
        customerName: r.profiles?.full_name || "Cliente sem Nome",
        customerPhone: r.profiles?.phone || null,
        customerAddress: null,
        sellerProfileId: r.seller_profile_id,
        catalogId: r.catalog_id,
        priceTableId: r.price_table_id,
        priceTableName: r.price_tables?.name || null,
        visitWeekdays: r.visit_weekdays || [1],
        visitFrequencyDays: r.visit_frequency_days || 14,
        avgRepurchaseDays: r.avg_repurchase_days || 14,
        lastOrderAt: r.last_order_at,
        daysSinceLastOrder: calc.daysSinceLastOrder,
        nextAttentionDate: calc.nextAttentionDate,
        slaStatus: calc.slaStatus,
        churnRiskScore: Number(r.churn_risk_score || 0),
        notes: r.notes,
      };
    });

    // Filtra ou agrupa por dia solicitado e hoje
    const todayQueue = parsed.filter((c) => c.visitWeekdays.includes(requestedWeekday));
    const urgentQueue = parsed.filter((c) => c.slaStatus === "risk" || c.slaStatus === "churn_loss");

    return {
      all: parsed,
      todayQueue,
      urgentQueue,
      currentWeekday: todayWeekday,
    };
  });

// ==============================================================================
// ROTEIRIZAÇÃO E CHECK-IN DE CAMPO COM HAVERSINE GEOFENCE
// ==============================================================================

export const listTodaySellerRouteWithStopsFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = getServerClient();
    const auth = await requireRole(["owner", "admin", "manager", "seller"]);
    const storeId = auth.store_id;
    const userId = auth.id;

    const todayWeekday = new Date().getDay() === 0 ? 7 : new Date().getDay();

    // 1. Busca rota ativa do dia para o vendedor
    const { data: route } = await supabase
      .from("sales_routes")
      .select("id, name, weekday, active")
      .eq("store_id", storeId)
      .eq("seller_profile_id", userId)
      .eq("weekday", todayWeekday)
      .eq("active", true)
      .maybeSingle();

    if (!route) {
      return { route: null, stops: [] };
    }

    // 2. Busca paradas da rota com dados do cliente
    const { data: stops, error: stopsErr } = await supabase
      .from("sales_route_stops")
      .select(`
        id, stop_order, planned_time, status, customer_id,
        profiles!sales_route_stops_customer_id_fkey(full_name, phone)
      `)
      .eq("route_id", route.id)
      .order("stop_order", { ascending: true });

    throwIfQueryFailed(stopsErr, "Falha ao carregar paradas da rota do dia.");

    const formattedStops: RouteStopDTO[] = (stops || []).map((s: any) => ({
      stopId: s.id,
      stopOrder: s.stop_order,
      plannedTime: s.planned_time,
      status: s.status,
      customerId: s.customer_id,
      customerName: s.profiles?.full_name || "Cliente sem Nome",
      customerPhone: s.profiles?.phone || null,
      customerAddress: null,
      lat: null,
      lng: null,
    }));

    return { route, stops: formattedStops };
  }
);

export const recordFieldVisitCheckInFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      customerId: z.string().uuid(),
      routeStopId: z.string().uuid().optional().nullable(),
      lat: z.number(),
      lng: z.number(),
      accuracyMeters: z.number().optional().nullable(),
      customerExpectedLat: z.number().optional().nullable(),
      customerExpectedLng: z.number().optional().nullable(),
      notes: z.string().max(2000).optional().nullable(),
      voiceAudioUrl: z.string().max(1000).optional().nullable(),
      voiceTranscript: z.string().max(4000).optional().nullable(),
    })
  )
  .handler(
    async ({
      data: {
        customerId,
        routeStopId,
        lat,
        lng,
        accuracyMeters,
        customerExpectedLat,
        customerExpectedLng,
        notes,
        voiceAudioUrl,
        voiceTranscript,
      },
    }) => {
      const supabase = getServerClient();
      const auth = await requireRole(["owner", "admin", "manager", "seller"]);
      const storeId = auth.store_id;
      const sellerProfileId = auth.id;

      let distanceMeters: number | null = null;
      let geofenceStatus: "within_geofence" | "outside_geofence" | "no_coords" = "no_coords";

      if (
        customerExpectedLat !== undefined &&
        customerExpectedLat !== null &&
        customerExpectedLng !== undefined &&
        customerExpectedLng !== null
      ) {
        distanceMeters = calculateHaversineDistanceMeters(lat, lng, customerExpectedLat, customerExpectedLng);
        geofenceStatus = distanceMeters <= 200 ? "within_geofence" : "outside_geofence";
      }

      // Insere log de visita
      const { data: log, error: logErr } = await supabase
        .from("sales_visit_logs")
        .insert({
          store_id: storeId,
          seller_profile_id: sellerProfileId,
          customer_id: customerId,
          route_stop_id: routeStopId ?? null,
          lat,
          lng,
          accuracy_meters: accuracyMeters ?? null,
          distance_to_customer_meters: distanceMeters,
          geofence_status: geofenceStatus,
          notes: notes ?? null,
          voice_audio_url: voiceAudioUrl ?? null,
          voice_transcript: voiceTranscript ?? null,
        })
        .select("id, checkin_at, geofence_status, distance_to_customer_meters")
        .single();

      throwIfQueryFailed(logErr, "Falha ao registrar check-in de visita em campo.");
      if (!log) {
        throw new Error("Falha ao registrar check-in de visita em campo.");
      }

      // Se houver parada da rota, marca como concluída
      if (routeStopId) {
        await supabase
          .from("sales_route_stops")
          .update({ status: "completed" })
          .eq("id", routeStopId);
      }

      // Atualiza data da última visita na carteira
      await supabase
        .from("seller_portfolio_assignments")
        .update({
          last_visit_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("store_id", storeId)
        .eq("customer_id", customerId)
        .eq("seller_profile_id", sellerProfileId);

      return {
        visitLogId: log.id,
        checkinAt: log.checkin_at,
        geofenceStatus: log.geofence_status,
        distanceToCustomerMeters: log.distance_to_customer_meters,
      };
    }
  );

// ==============================================================================
// CRUZAMENTO IA + WHATSAPP + GPS & ATUALIZAÇÃO DE CICLO PÓS-PEDIDO
// ==============================================================================

export type CommercialAttentionNature =
  | "presencial_gps_validado"
  | "presencial_sem_gps_evidencia_chat"
  | "digital_whatsapp_confirmado"
  | "marcado_manual_sem_evidencia"
  | "divergencia_alerta";

export function classifyCommercialAttentionNature(params: {
  hasValidGps: boolean;
  distanceToCustomerMeters?: number | null;
  hasChatEvidenceOfVisit?: boolean;
  hasVoiceTranscript?: boolean;
  messagesCount: number;
}): { nature: CommercialAttentionNature; summary: string } {
  if (params.hasValidGps) {
    return {
      nature: "presencial_gps_validado",
      summary: `Visita presencial comprovada por GPS dentro do geofence (${params.distanceToCustomerMeters || 0}m).`,
    };
  }
  if (params.hasChatEvidenceOfVisit || params.hasVoiceTranscript) {
    return {
      nature: "presencial_sem_gps_evidencia_chat",
      summary: "Visita presencial confirmada por evidência semântica de áudio/WhatsApp.",
    };
  }
  if (params.messagesCount > 0) {
    return {
      nature: "digital_whatsapp_confirmado",
      summary: `Atendimento realizado via canal digital WhatsApp (${params.messagesCount} mensagens).`,
    };
  }
  if (params.distanceToCustomerMeters && params.distanceToCustomerMeters > 500) {
    return {
      nature: "divergencia_alerta",
      summary: `Alerta: Check-in a mais de ${params.distanceToCustomerMeters}m do cliente sem contato digital.`,
    };
  }
  return {
    nature: "marcado_manual_sem_evidencia",
    summary: "Atendimento registrado sem evidência telemétrica ou digital.",
  };
}

export function calculateNextOrderCycle(orderDateIso: string, avgRepurchaseDays: number): string {
  const avgDays =
    typeof avgRepurchaseDays === "number" && !isNaN(avgRepurchaseDays)
      ? Math.max(1, avgRepurchaseDays)
      : 14;
  const nextDate = new Date(new Date(orderDateIso).getTime() + avgDays * 86400000);
  return nextDate.toISOString().split("T")[0];
}

export interface CommercialAttentionAuditDTO {
  customerId: string;
  date: string;
  auditedNature: CommercialAttentionNature;
  hasGpsCheckIn: boolean;
  distanceToCustomerMeters: number | null;
  hasWhatsAppInteraction: boolean;
  messagesCount: number;
  hasOrderPlaced: boolean;
  orderId?: string | null;
  inferredObjection?: string | null;
  summary: string;
}

export const auditCommercialAttentionEvidenceFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      customerId: z.string().uuid(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      sellerProfileId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data: { customerId, date, sellerProfileId } }) => {
    const supabase = getServerClient();
    const auth = await requireRole(["owner", "admin", "manager", "seller"]);
    const storeId = auth.store_id;
    const targetDate = date || new Date().toISOString().split("T")[0];
    const startOfDay = `${targetDate}T00:00:00.000Z`;
    const endOfDay = `${targetDate}T23:59:59.999Z`;

    // 1. Busca logs de visita com GPS
    let visitQuery = supabase
      .from("sales_visit_logs")
      .select("id, geofence_status, distance_to_customer_meters, checkin_at, notes, voice_transcript")
      .eq("store_id", storeId)
      .eq("customer_id", customerId)
      .gte("checkin_at", startOfDay)
      .lte("checkin_at", endOfDay);

    if (sellerProfileId) {
      visitQuery = visitQuery.eq("seller_profile_id", sellerProfileId);
    }
    const { data: visits } = await visitQuery;
    const hasValidGps = (visits || []).some((v) => v.geofence_status === "within_geofence");
    const bestVisit = (visits || [])[0];

    // 2. Busca mensagens WhatsApp do dia
    const { data: threads } = await supabase
      .from("chat_threads")
      .select("id")
      .eq("store_id", storeId)
      .eq("customer_id", customerId)
      .limit(1);

    let messagesCount = 0;
    let hasChatEvidenceOfVisit = false;
    let chatTextAgg = "";

    if (threads && threads.length > 0) {
      const threadId = threads[0].id;
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("content, created_at, sender_type")
        .eq("thread_id", threadId)
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay)
        .limit(30);

      messagesCount = msgs?.length || 0;
      if (msgs && msgs.length > 0) {
        chatTextAgg = msgs.map((m) => m.content || "").join(" ").toLowerCase();
        const arrivalKeywords = ["aqui na frente", "cheguei", "passando aí", "na loja", "estou aqui", "estou na porta"];
        hasChatEvidenceOfVisit = arrivalKeywords.some((kw) => chatTextAgg.includes(kw));
      }
    }

    // 3. Busca pedidos emitidos no dia
    const { data: orders } = await supabase
      .from("orders")
      .select("id, total_amount, status")
      .eq("store_id", storeId)
      .eq("customer_id", customerId)
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .limit(1);

    const hasOrder = Boolean(orders && orders.length > 0);
    const orderId = hasOrder ? orders![0].id : null;

    // 4. Classificação da Natureza Auditada
    const { nature: auditedNature, summary } = classifyCommercialAttentionNature({
      hasValidGps,
      distanceToCustomerMeters: bestVisit?.distance_to_customer_meters ?? null,
      hasChatEvidenceOfVisit,
      hasVoiceTranscript: Boolean(bestVisit?.voice_transcript),
      messagesCount,
    });

    // Extrai motivo de não-compra se não houve pedido
    let inferredObjection: string | null = null;
    if (!hasOrder && chatTextAgg) {
      if (chatTextAgg.includes("estoque") || chatTextAgg.includes("cheio")) {
        inferredObjection = "estoque_cheio";
      } else if (chatTextAgg.includes("caro") || chatTextAgg.includes("preco") || chatTextAgg.includes("concorrente")) {
        inferredObjection = "preco_concorrencia";
      } else if (chatTextAgg.includes("semana que vem") || chatTextAgg.includes("depois")) {
        inferredObjection = "postergado";
      }
    }

    return {
      customerId,
      date: targetDate,
      auditedNature,
      hasGpsCheckIn: Boolean(visits && visits.length > 0),
      distanceToCustomerMeters: bestVisit?.distance_to_customer_meters ?? null,
      hasWhatsAppInteraction: messagesCount > 0,
      messagesCount,
      hasOrderPlaced: hasOrder,
      orderId,
      inferredObjection,
      summary,
    };
  });

export const syncCustomerOrderCycleFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      customerId: z.string().uuid(),
      orderDate: z.string().optional(),
    })
  )
  .handler(async ({ data: { customerId, orderDate } }) => {
    const supabase = getServerClient();
    const auth = await requireRole(["owner", "admin", "manager", "seller"]);
    const storeId = auth.store_id;
    const nowIso = orderDate || new Date().toISOString();

    const { data: assignments } = await supabase
      .from("seller_portfolio_assignments")
      .select("id, visit_frequency_days, avg_repurchase_days, last_order_at")
      .eq("store_id", storeId)
      .eq("customer_id", customerId);

    if (!assignments || assignments.length === 0) {
      return { updatedCount: 0, nextAttentionDate: null };
    }

    let updatedCount = 0;
    for (const a of assignments) {
      const avgDays = a.avg_repurchase_days || a.visit_frequency_days || 14;
      const nextDateStr = calculateNextOrderCycle(nowIso, avgDays);

      const { error: upErr } = await supabase
        .from("seller_portfolio_assignments")
        .update({
          last_order_at: nowIso,
          next_attention_date: nextDateStr,
          churn_risk_score: 0.0,
          updated_at: new Date().toISOString(),
        })
        .eq("id", a.id);

      if (!upErr) updatedCount++;
    }

    const firstAvg = assignments[0]?.avg_repurchase_days || 14;
    const calculatedNext = calculateNextOrderCycle(nowIso, firstAvg);

    return { updatedCount, nextAttentionDate: calculatedNext };
  });
