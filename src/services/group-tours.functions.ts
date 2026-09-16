/**
 * group-tours.functions.ts — BFF para Gestão de Grupos Terrestres, Mapa de Ônibus & Rooming List
 * Padrão BigTech | Zero Mocks | Persistência Real no Supabase
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";

// ─── Tipagens Canônicas de Grupos Terrestres ──────────────────────────────────

export interface BusSeatDTO {
 seat_number: number;
 row: number;
 column: "A" | "B" | "C" | "D"; // A/B lado esquerdo, C/D lado direito
 floor: 1 | 2; // Para double-decker
 status: "free" | "reserved" | "blocked";
 passenger_name?: string | null;
 passenger_document?: string | null;
 passenger_phone?: string | null;
 boarding_point?: string | null;
}

export interface HotelRoomAllocationDTO {
 room_id: string;
 room_number?: string | null;
 room_type: "single" | "double_couple" | "double_twin" | "triple" | "quadruple";
 hotel_name: string;
 capacity: number;
 passengers: Array<{
 name: string;
 document?: string;
 phone?: string;
 notes?: string;
 }>;
}

export type GroupTourStatus = "open" | "confirmed" | "closed" | "completed" | "cancelled";

export interface GroupTourDTO {
 id: string;
 store_id: string | null;
 title: string;
 destination: string;
 departure_city: string;
 departure_date: string;
 departure_time: string;
 return_date: string;
 return_time: string;
 bus_company_name?: string | null;
 bus_plate?: string | null;
 driver_name?: string | null;
 driver_phone?: string | null;
 total_seats: number;
 seats: BusSeatDTO[];
 rooms: HotelRoomAllocationDTO[];
 price_cents: number;
 included_items: string[];
 status: GroupTourStatus;
 notes?: string | null;
 cover_image_url?: string | null;
 boarding_points?: Array<{ city: string; time: string; location: string }> | null;
 payment_conditions?: string | null;
 vehicle_layout_id?: string | null;
 vehicle_layout_name?: string | null;
 created_at: string;
 updated_at: string;
}

// ─── Gerador de Layout Padrão de Ônibus 46 Lugares ────────────────────────────

export function generateDefaultBusSeats(totalSeats: number = 46): BusSeatDTO[] {
 const seats: BusSeatDTO[] = [];
 const rows = Math.ceil(totalSeats / 4);

 let currentSeat = 1;
 for (let r = 1; r <= rows; r++) {
 const cols: Array<"A" | "B" | "C" | "D"> = ["A", "B", "C", "D"];
 for (const col of cols) {
 if (currentSeat <= totalSeats) {
 seats.push({
 seat_number: currentSeat,
 row: r,
 column: col,
 floor: 1,
 status: "free",
 passenger_name: null,
 passenger_document: null,
 passenger_phone: null,
 boarding_point: null,
 });
 currentSeat++;
 }
 }
 }
 return seats;
}

// ─── 1. Criação de Viagem em Grupo / Excursão ─────────────────────────────────

export const createGroupTour = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().min(3, "Título obrigatório"),
      slug: z.string().optional(),
      destination: z.string().min(2, "Destino obrigatório"),
      departureCity: z.string().min(2, "Cidade de saída obrigatória").default("São Miguel do Oeste"),
      departureDate: z.string().min(1, "Data de saída obrigatória"),
      departureTime: z.string().default("06:00"),
      returnDate: z.string().min(1, "Data de retorno obrigatória"),
      returnTime: z.string().default("20:00"),
      totalSeats: z.number().int().min(1).max(200).default(46),
      priceCents: z.number().int().min(0).default(0),
      includedItems: z.array(z.string()).default([]),
      excludedItems: z.array(z.string()).default([]),
      notes: z.string().optional(),
      coverImageUrl: z.string().optional(),
      vehicleLayoutId: z.string().optional(),
      vehicleLayoutName: z.string().optional(),
      boardingPoints: z
        .array(
          z.object({
            city: z.string(),
            time: z.string(),
            location: z.string(),
          })
        )
        .default([]),
      paymentConditions: z.string().optional(),
      busCompanyName: z.string().optional(),
      busPlate: z.string().optional(),
      driverName: z.string().optional(),
      driverPhone: z.string().optional(),
      hotelDetails: z.record(z.any()).optional(),
      promoMedia: z.record(z.any()).optional(),
      pricingTiers: z.array(z.any()).default([]),
      extraOptions: z.array(z.any()).default([]),
      itinerary: z.array(z.any()).default([]),
      isPublic: z.boolean().default(true),
      viewTemplate: z.enum(["standard", "instagram_editorial"]).default("instagram_editorial").optional(),
      status: z.enum(["open", "confirmed", "closed", "completed", "cancelled"]).default("open"),
    })
  )
  .handler(async ({ data: input }): Promise<{ success: boolean; id: string }> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    if (!identity?.id) {
      throw new Error("Não autorizado.");
    }

    // Resolução defensiva do store_id
    let effectiveStoreId = identity.store_id || null;
    if (!effectiveStoreId && identity.memberships && identity.memberships.length > 0) {
      effectiveStoreId = identity.memberships[0].store_id || null;
    }
    if (!effectiveStoreId) {
      try {
        const { data: userStore } = await supabase
          .from("stores")
          .select("id")
          .or(`owner_id.eq.${identity.id},is_platform_root.eq.true`)
          .limit(1)
          .maybeSingle();
        if (userStore) {
          effectiveStoreId = userStore.id;
        }
      } catch {}
    }

    // Helper de conversão segura de data
    const parseSafeIsoDate = (val: string | undefined): string => {
      if (!val) return new Date().toISOString();
      try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return new Date().toISOString();
        return d.toISOString();
      } catch {
        return new Date().toISOString();
      }
    };

    const depIso = parseSafeIsoDate(input.departureDate);
    const retIso = parseSafeIsoDate(input.returnDate);

    let durationText = "1 dia";
    try {
      const dep = new Date(depIso);
      const ret = new Date(retIso);
      const diffDays = Math.max(1, Math.round((ret.getTime() - dep.getTime()) / (1000 * 60 * 60 * 24)));
      durationText = `${diffDays} ${diffDays === 1 ? "dia" : "dias"}`;
    } catch {
      durationText = "Excursão";
    }

    let finalSeats = generateDefaultBusSeats(input.totalSeats);
    let finalTotalSeats = input.totalSeats;

    // Se um veículo da frota foi selecionado, importar o mapa de poltronas real dele!
    if (input.vehicleLayoutId) {
      const { data: vLayout } = await supabase
        .from("vehicle_layouts")
        .select("id, name, seat_map, total_capacity, is_double_decker")
        .eq("id", input.vehicleLayoutId)
        .maybeSingle();

      if (vLayout && Array.isArray(vLayout.seat_map) && vLayout.seat_map.length > 0) {
        const mappedSeats: BusSeatDTO[] = [];
        let count = 0;
        vLayout.seat_map.forEach((cell: any) => {
          if (cell.type === "seat") {
            count++;
            const seatNum = parseInt(String(cell.label).replace(/\D/g, ""), 10) || count;
            const colLetter: "A" | "B" | "C" | "D" =
              cell.c === 0 ? "A" : cell.c === 1 ? "B" : cell.c === 3 ? "C" : "D";

            mappedSeats.push({
              seat_number: seatNum,
              row: (cell.r ?? 0) + 1,
              column: colLetter,
              floor: (cell.deck === 2 ? 2 : 1) as 1 | 2,
              status: cell.status === "blocked" ? "blocked" : "free",
              passenger_name: null,
              passenger_document: null,
              passenger_phone: null,
              boarding_point: null,
            });
          }
        });

        if (mappedSeats.length > 0) {
          finalSeats = mappedSeats;
          finalTotalSeats = mappedSeats.length;
        }
      }
    }

    const metaPayload = {
      slug: input.slug || null,
      cover_image_url: input.coverImageUrl || null,
      vehicle_layout_id: input.vehicleLayoutId || null,
      vehicle_layout_name: input.vehicleLayoutName || null,
      boarding_points: input.boardingPoints || [],
      payment_conditions: input.paymentConditions || null,
      bus_company_name: input.busCompanyName || null,
      bus_plate: input.busPlate || null,
      driver_name: input.driverName || null,
      driver_phone: input.driverPhone || null,
      notes: input.notes || null,
      hotel_details: input.hotelDetails || null,
      promo_media: input.promoMedia || null,
      pricing_tiers: input.pricingTiers || [],
      extra_options: input.extraOptions || [],
      itinerary: input.itinerary || [],
      is_public: input.isPublic,
      view_template: input.viewTemplate || "instagram_editorial",
      status: input.status,
    };

    const priceDisplay = input.priceCents > 0
      ? (input.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "Sob Consulta";

    const { data: inserted, error } = await supabase
      .from("tourism_experiences")
      .insert({
        store_id: effectiveStoreId,
        author_profile_id: identity.id,
        title: input.title.trim(),
        subtitle: `${input.departureCity} ➔ ${input.destination} (${input.departureDate})`,
        category: "group_tour",
        destination: input.destination.trim(),
        destination_city: input.destination.trim(),
        departure_city: input.departureCity.trim(),
        departure_date: depIso,
        departure_time: input.departureTime || "06:00",
        return_date: retIso,
        return_time: input.returnTime || "20:00",
        location: input.destination.trim(),
        price_cents: input.priceCents,
        price_display: priceDisplay,
        duration: durationText,
        total_seats: finalTotalSeats,
        available_seats: finalTotalSeats,
        seats: finalSeats,
        rooms: [],
        included_items: input.includedItems,
        excluded_items: input.excludedItems || [],
        cover_image_url: input.coverImageUrl || null,
        image_url: input.coverImageUrl || null,
        notes: input.notes?.trim() || null,
        status: input.status,
        description: JSON.stringify(metaPayload),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[group-tours.functions] Erro ao criar grupo terrestre:", error);
      throw new Error("Falha ao salvar grupo terrestre: " + error.message);
    }

    return { success: true, id: inserted.id };
  });

// ─── 2. Buscar Grupo Terrestre por ID (Workspace) ─────────────────────────────

export const getGroupTourById = createServerFn({ method: "GET" })
 .validator(z.object({ id: z.string().min(1) }))
 .handler(async ({ data }): Promise<GroupTourDTO | null> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 if (!identity?.id) {
 throw new Error("Não autorizado.");
 }

 const { data: row, error } = await supabase
 .from("tourism_experiences")
 .select("*")
 .eq("id", data.id)
 .maybeSingle();

 if (error || !row) {
 return null;
 }

 let meta: any = {};
 try {
 meta = typeof row.description === "string" && row.description.startsWith("{") ? JSON.parse(row.description) : {};
 } catch {
 meta = {};
 }

 return {
 id: row.id,
 store_id: row.store_id,
 title: row.title,
 destination: row.destination || row.location || meta.destination || "Destino",
 departure_city: row.departure_city || meta.departure_city || "Origem",
 departure_date: row.departure_date ? new Date(row.departure_date).toISOString().split("T")[0] : (meta.departure_date || row.created_at?.split("T")[0]),
 departure_time: row.departure_time || meta.departure_time || "06:00",
 return_date: row.return_date ? new Date(row.return_date).toISOString().split("T")[0] : (meta.return_date || meta.departure_date || row.created_at?.split("T")[0]),
 return_time: row.return_time || meta.return_time || "20:00",
 bus_company_name: row.bus_company_name || meta.bus_company_name || "",
 bus_plate: row.bus_plate || meta.bus_plate || "",
 driver_name: row.driver_name || meta.driver_name || "",
 driver_phone: row.driver_phone || meta.driver_phone || "",
 total_seats: row.total_seats || meta.total_seats || 46,
 seats: (Array.isArray(row.seats) && row.seats.length > 0 ? row.seats : (meta.seats || generateDefaultBusSeats(row.total_seats || 46))),
 rooms: (Array.isArray(row.rooms) ? row.rooms : (meta.rooms || [])),
 price_cents: Number(row.price_cents) || 0,
 included_items: row.included_items || [],
 status: (row.status === "published" ? "open" : row.status) || "open",
 notes: row.notes || meta.notes || null,
 cover_image_url: meta.cover_image_url || null,
 boarding_points: meta.boarding_points || [],
 payment_conditions: meta.payment_conditions || null,
 vehicle_layout_id: meta.vehicle_layout_id || null,
 vehicle_layout_name: meta.vehicle_layout_name || null,
 created_at: row.created_at,
 updated_at: row.updated_at,
 };
 });

// ─── 3. Atualizar Alocação de Poltronas e Quartos ─────────────────────────────

export const updateGroupTourAllocations = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().min(1),
 seats: z.array(z.any()).optional(),
 rooms: z.array(z.any()).optional(),
 busCompanyName: z.string().optional().nullable(),
 busPlate: z.string().optional().nullable(),
 driverName: z.string().optional().nullable(),
 driverPhone: z.string().optional().nullable(),
 status: z.enum(["open", "confirmed", "closed", "completed", "cancelled"]).optional(),
 })
 )
 .handler(async ({ data }): Promise<{ success: boolean }> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 if (!identity?.id) {
 throw new Error("Não autorizado.");
 }

 const patch: any = {
 updated_at: new Date().toISOString(),
 };
 if (data.seats) patch.seats = data.seats;
 if (data.rooms) patch.rooms = data.rooms;
 if (data.busCompanyName !== undefined) patch.bus_company_name = data.busCompanyName;
 if (data.busPlate !== undefined) patch.bus_plate = data.busPlate;
 if (data.driverName !== undefined) patch.driver_name = data.driverName;
 if (data.driverPhone !== undefined) patch.driver_phone = data.driverPhone;
 if (data.status) patch.status = data.status;

 const { error } = await supabase
 .from("tourism_experiences")
 .update(patch)
 .eq("id", data.id);

 if (error) {
 console.error("[group-tours.functions] Erro ao atualizar alocações:", error);
 throw new Error("Falha ao salvar alocações: " + error.message);
 }

 return { success: true };
 });

// ─── 4. Listagem de Grupos Terrestres da Agência (Workspace) ──────────────────

export const listAgencyGroupTours = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 status: z.string().optional(),
 search: z.string().optional(),
 })
 .optional()
 )
 .handler(async ({ data }): Promise<GroupTourDTO[]> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 if (!identity?.id) {
 return [];
 }

 let query = supabase
 .from("tourism_experiences")
 .select("*")
 .eq("category", "group_tour")
 .order("created_at", { ascending: false });

 if (identity.store_id) {
 query = query.eq("store_id", identity.store_id);
 } else {
 query = query.eq("author_profile_id", identity.id);
 }

 if (data?.status && data.status !== "all") {
 if (data.status === "open") {
 query = query.in("status", ["open", "published"]);
 } else {
 query = query.eq("status", data.status);
 }
 }

 if (data?.search) {
 query = query.or(`title.ilike.%${data.search}%,destination.ilike.%${data.search}%,departure_city.ilike.%${data.search}%`);
 }

 const { data: rows, error } = await query;

 if (error) {
 console.error("[group-tours.functions] Erro ao listar excursões:", error);
 return [];
 }
 if (!rows) return [];

 return rows.map((row: any) => {
 let meta: any = {};
 try {
 meta = typeof row.description === "string" && row.description.startsWith("{") ? JSON.parse(row.description) : {};
 } catch {
 meta = {};
 }

 return {
 id: row.id,
 store_id: row.store_id,
 title: row.title,
 destination: row.destination || row.location || meta.destination || "Destino",
 departure_city: row.departure_city || meta.departure_city || "Origem",
 departure_date: row.departure_date ? new Date(row.departure_date).toISOString().split("T")[0] : (meta.departure_date || row.created_at?.split("T")[0]),
 departure_time: row.departure_time || meta.departure_time || "06:00",
 return_date: row.return_date ? new Date(row.return_date).toISOString().split("T")[0] : (meta.return_date || meta.departure_date || row.created_at?.split("T")[0]),
 return_time: row.return_time || meta.return_time || "20:00",
 bus_company_name: row.bus_company_name || meta.bus_company_name || "",
 bus_plate: row.bus_plate || meta.bus_plate || "",
 driver_name: row.driver_name || meta.driver_name || "",
 driver_phone: row.driver_phone || meta.driver_phone || "",
 total_seats: row.total_seats || meta.total_seats || 46,
 seats: (Array.isArray(row.seats) && row.seats.length > 0 ? row.seats : (meta.seats || generateDefaultBusSeats(row.total_seats || 46))),
 rooms: (Array.isArray(row.rooms) ? row.rooms : (meta.rooms || [])),
 price_cents: Number(row.price_cents) || 0,
 included_items: row.included_items || [],
 status: (row.status === "published" ? "open" : row.status) || "open",
 notes: row.notes || meta.notes || null,
 cover_image_url: meta.cover_image_url || null,
 boarding_points: meta.boarding_points || [],
 payment_conditions: meta.payment_conditions || null,
 vehicle_layout_id: meta.vehicle_layout_id || null,
 vehicle_layout_name: meta.vehicle_layout_name || null,
 created_at: row.created_at,
 updated_at: row.updated_at,
 };
 });
 });

// ─── 5. Gestão Financeira de Custos da Excursão & Break-even ───────────────────

export interface GroupTourCostItem {
 id: string;
 tour_id: string;
 category: "transport" | "hotel" | "insurance" | "tickets" | "guide" | "food" | "other";
 description: string;
 cost_cents: number;
 is_fixed: boolean;
 created_at: string;
}

export const listGroupTourCosts = createServerFn({ method: "GET" })
 .validator(z.object({ tour_id: z.string().uuid() }))
 .handler(async ({ data }): Promise<GroupTourCostItem[]> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity?.id) throw new Error("Não autorizado.");

 const { data: costs, error } = await supabase
 .from("group_tour_costs")
 .select("*")
 .eq("tour_id", data.tour_id)
 .order("created_at", { ascending: true });

 if (error) throw error;
 return costs || [];
 });

export const createGroupTourCost = createServerFn({ method: "POST" })
 .validator(
 z.object({
 tour_id: z.string().uuid(),
 category: z.enum(["transport", "hotel", "insurance", "tickets", "guide", "food", "other"]),
 description: z.string().min(1, "Descrição do custo obrigatória"),
 cost_cents: z.number().int().min(0),
 is_fixed: z.boolean().default(true),
 })
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity?.id) throw new Error("Não autorizado.");

 const { data: created, error } = await supabase
 .from("group_tour_costs")
 .insert({
 tour_id: data.tour_id,
 category: data.category,
 description: data.description.trim(),
 cost_cents: data.cost_cents,
 is_fixed: data.is_fixed,
 })
 .select()
 .single();

 if (error) throw error;
 return created;
 });

export const deleteGroupTourCost = createServerFn({ method: "POST" })
 .validator(z.object({ cost_id: z.string().uuid() }))
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity?.id) throw new Error("Não autorizado.");

 const { error } = await supabase
 .from("group_tour_costs")
 .delete()
 .eq("id", data.cost_id);

 if (error) throw error;
 return { success: true };
 });

export const getGroupTourBudgetSummary = createServerFn({ method: "GET" })
 .validator(z.object({ tour_id: z.string().uuid(), price_cents: z.number().int() }))
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity?.id) throw new Error("Não autorizado.");

 const { data: costs, error } = await supabase
 .from("group_tour_costs")
 .select("*")
 .eq("tour_id", data.tour_id);

 if (error) throw error;

 const allCosts = costs || [];
 const totalFixedCents = allCosts
 .filter((c) => c.is_fixed)
 .reduce((sum, c) => sum + (c.cost_cents || 0), 0);

 const variablePerPaxCents = allCosts
 .filter((c) => !c.is_fixed)
 .reduce((sum, c) => sum + (c.cost_cents || 0), 0);

 const contributionMarginPerPax = data.price_cents - variablePerPaxCents;
 const breakEvenPax =
 contributionMarginPerPax > 0 ? Math.ceil(totalFixedCents / contributionMarginPerPax) : 0;

 return {
 totalFixedCents,
 variablePerPaxCents,
 contributionMarginPerPax,
 breakEvenPax,
 itemCount: allCosts.length,
 };
 });

// ─── 6. Excluir Excursão / Viagem em Grupo ────────────────────────────────────

export const deleteGroupTour = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().min(1) }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Não autorizado.");

    let query = supabase.from("tourism_experiences").delete().eq("id", data.id);
    if (identity.store_id) query = query.eq("store_id", identity.store_id);
    else query = query.eq("author_profile_id", identity.id);

    const { error } = await query;
    if (error) throw new Error("Erro ao excluir excursão: " + error.message);
    return { success: true };
  });

export const listGroupTours = createServerFn({ method: "GET" })
  .validator(z.object({ search: z.string().optional() }).optional())
  .handler(async ({ data }): Promise<GroupTourDTO[]> => {
    const supabase = getServerClient();
    let q = supabase
      .from("tourism_experiences")
      .select("*")
      .eq("category", "group_tour")
      .order("created_at", { ascending: false });

    if (data?.search && data.search.trim()) {
      q = q.ilike("title", `%${data.search.trim()}%`);
    }

    const { data: rows, error } = await q;
    if (error || !rows) return [];

    return rows.map((row) => ({
      id: row.id,
      store_id: row.store_id,
      title: row.title,
      destination: row.destination || row.location || "Destino",
      departure_city: row.departure_city || "Origem",
      departure_date: row.departure_date ? new Date(row.departure_date).toISOString().split("T")[0] : "",
      departure_time: row.departure_time || "06:00",
      return_date: row.return_date ? new Date(row.return_date).toISOString().split("T")[0] : "",
      return_time: row.return_time || "20:00",
      total_seats: row.total_seats || 46,
      seats: Array.isArray(row.seats) ? row.seats : [],
      rooms: Array.isArray(row.rooms) ? row.rooms : [],
      price_cents: Number(row.price_cents) || 0,
      included_items: row.included_items || [],
      status: (row.status as any) || "open",
      cover_image_url: row.cover_image_url || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  });
