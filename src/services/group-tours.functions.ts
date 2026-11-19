/**
 * group-tours.functions.ts — BFF para Gestão de Grupos Terrestres, Mapa de Ônibus & Rooming List
 * Padrão BigTech | Zero Mocks | Persistência Real no Supabase
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity, requireStaff } from "@/lib/server-access";
import { parseExperienceMetaDescription } from "@/lib/tourism/travel-blueprint";
import {
  normalizeEntityMediaList,
  normalizeHotelsList,
  normalizeToursList,
  normalizeTransfersList,
  type ProposalMediaItem,
  type ProposalWebPageDTO,
} from "@/lib/tourism/proposal-normalization";

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
 subtitle?: string | null;
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
 excluded_items?: string[];
 status: GroupTourStatus;
 notes?: string | null;
 cover_image_url?: string | null;
 boarding_points?: Array<{ city: string; time: string; location: string }> | null;
 payment_conditions?: string | null;
 vehicle_layout_id?: string | null;
 vehicle_layout_name?: string | null;
 hotels?: any[];
 transfers?: any[];
 tours?: any[];
 itinerary?: any[];
 media?: ProposalMediaItem[];
 pricing_tiers?: any[];
 extra_options?: any[];
 web_page_config?: ProposalWebPageDTO | null;
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
      hotels: z.array(z.any()).optional().default([]),
      transfers: z.array(z.any()).optional().default([]),
      tours: z.array(z.any()).optional().default([]),
      media: z.array(z.any()).optional().default([]),
      webPageConfig: z.any().optional().nullable(),
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
      } catch (err) { console.warn("[group-tours] userStore lookup error:", err); }
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

    const normalizedHotels = normalizeHotelsList(
      Array.isArray(input.hotels) && input.hotels.length > 0
        ? input.hotels
        : input.hotelDetails && (input.hotelDetails.name || input.hotelDetails.hotel_name)
          ? [{
              id: "hotel-1",
              hotel_name: input.hotelDetails.hotel_name || input.hotelDetails.name,
              stars: Number(input.hotelDetails.stars || 3),
              checkin_date: input.hotelDetails.check_in || input.hotelDetails.checkIn || undefined,
              checkout_date: input.hotelDetails.check_out || input.hotelDetails.checkOut || undefined,
              amenities: Array.isArray(input.hotelDetails.amenities) ? input.hotelDetails.amenities : [],
              images: Array.isArray(input.hotelDetails.gallery) ? input.hotelDetails.gallery : [],
            }]
          : [],
    );
    const normalizedTransfers = normalizeTransfersList(input.transfers || []);
    const normalizedTours = normalizeToursList(input.tours || []);
    const normalizedMedia = normalizeEntityMediaList({
      media: input.media,
      featured_image_url: input.coverImageUrl || undefined,
      images: Array.isArray(input.hotelDetails?.gallery) ? input.hotelDetails.gallery : [],
      video_url: input.promoMedia?.youtube_url || input.promoMedia?.youtubeUrl || undefined,
    });

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
        subtitle: `${input.departureCity} -> ${input.destination} (${input.departureDate})`,
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
        vehicle_layout_id: input.vehicleLayoutId || null,
        vehicle_layout_name: input.vehicleLayoutName || null,
        payment_conditions: input.paymentConditions || null,
        boarding_points: input.boardingPoints || [],
        pricing_tiers: input.pricingTiers || [],
        extra_options: input.extraOptions || [],
        itinerary: input.itinerary || [],
        hotels: normalizedHotels,
        transfers: normalizedTransfers,
        tours: normalizedTours,
        media: normalizedMedia,
        web_page_config: input.webPageConfig || null,
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

export const duplicateGroupTour = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid("ID de excursão inválido.") }))
  .handler(async ({ data }): Promise<{ success: boolean; id: string }> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Não autorizado.");

    const { data: src, error: fetchErr } = await supabase
      .from("tourism_experiences")
      .select("*")
      .eq("id", data.id)
      .single();

    if (fetchErr || !src) throw new Error("Excursão não encontrada para duplicação.");
    if (src.store_id !== identity.store_id && identity.role !== "platform_admin") {
      throw new Error("Acesso não autorizado a esta excursão.");
    }

    const totalSeats = Number(src.total_seats) || 46;
    const rawSeats = Array.isArray(src.seats) ? src.seats : [];
    const resetSeats = rawSeats.map((seat: any) => ({
      ...seat,
      status: seat?.status === "blocked" ? "blocked" : "free",
      passenger_name: null,
      passenger_document: null,
      passenger_phone: null,
    }));

    const { data: inserted, error: insErr } = await supabase
      .from("tourism_experiences")
      .insert({
        store_id: src.store_id,
        author_profile_id: identity.id,
        title: `${src.title} (Cópia)`,
        subtitle: src.subtitle,
        category: src.category || "group_tour",
        destination: src.destination,
        destination_city: src.destination_city,
        departure_city: src.departure_city,
        departure_date: src.departure_date,
        departure_time: src.departure_time,
        return_date: src.return_date,
        return_time: src.return_time,
        location: src.location,
        price_cents: src.price_cents,
        price_display: src.price_display,
        duration: src.duration,
        total_seats: totalSeats,
        available_seats: totalSeats,
        seats: resetSeats,
        rooms: [],
        included_items: src.included_items || [],
        excluded_items: src.excluded_items || [],
        cover_image_url: src.cover_image_url || null,
        image_url: src.image_url || null,
        notes: src.notes || null,
        status: "draft",
        description: src.description,
      })
      .select("id")
      .single();

    if (insErr || !inserted) {
      throw new Error("Erro ao duplicar excursão: " + (insErr?.message || "desconhecido"));
    }

    return { success: true, id: inserted.id };
  });

// ─── 2. Buscar Grupo Terrestre por ID (Workspace) ─────────────────────────────

export const getGroupTourById = createServerFn({ method: "GET" })
 .validator(z.object({ id: z.string().uuid("ID de excursão inválido.") }))
 .handler(async ({ data }): Promise<GroupTourDTO | null> => {
 const supabase = getServerClient();
 const identity = await requireStaff();

 const { data: row, error } = await supabase
 .from("tourism_experiences")
 .select("*")
 .eq("id", data.id)
 .maybeSingle();

 if (error) {
   throw new Error(`Erro ao carregar excursão: ${error.message}`);
 }
 if (!row) {
   return null;
 }
 if (row.store_id !== identity.store_id && identity.role !== "platform_admin") {
   throw new Error("Acesso negado: excursão pertence a outra agência.");
 }

 const { meta, humanText } = parseExperienceMetaDescription(row.description);

 const hotelsList = Array.isArray(row.hotels) && row.hotels.length > 0
   ? normalizeHotelsList(row.hotels)
   : meta.hotel_details && (meta.hotel_details.name || meta.hotel_details.hotel_name)
     ? normalizeHotelsList([{
         id: "hotel-1",
         hotel_name: meta.hotel_details.hotel_name || meta.hotel_details.name,
         stars: Number(meta.hotel_details.stars || 3),
         checkin_date: meta.hotel_details.checkIn || undefined,
         checkout_date: meta.hotel_details.checkOut || undefined,
         amenities: Array.isArray(meta.hotel_details.amenities) ? meta.hotel_details.amenities : [],
         images: Array.isArray(meta.hotel_details.gallery) ? meta.hotel_details.gallery : [],
       }])
     : [];

 return {
 id: row.id,
 store_id: row.store_id,
 title: row.title,
 subtitle: row.subtitle || null,
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
 excluded_items: Array.isArray(row.excluded_items) ? row.excluded_items : [],
 status: (row.status === "published" ? "open" : row.status) || "open",
 notes: row.notes || humanText || null,
 cover_image_url: row.cover_image_url || meta.cover_image_url || row.image_url || null,
 boarding_points: Array.isArray(row.boarding_points) && row.boarding_points.length > 0 ? row.boarding_points : (meta.boarding_points || []),
 payment_conditions: row.payment_conditions || meta.payment_conditions || null,
 vehicle_layout_id: row.vehicle_layout_id || meta.vehicle_layout_id || null,
 vehicle_layout_name: row.vehicle_layout_name || meta.vehicle_layout_name || null,
 hotels: hotelsList,
 transfers: normalizeTransfersList(Array.isArray(row.transfers) && row.transfers.length > 0 ? row.transfers : (meta.transfers || [])),
 tours: normalizeToursList(Array.isArray(row.tours) && row.tours.length > 0 ? row.tours : (meta.tours || [])),
 itinerary: Array.isArray(row.itinerary) && row.itinerary.length > 0 ? row.itinerary : (meta.itinerary || []),
 media: normalizeEntityMediaList({
   media: Array.isArray(row.media) && row.media.length > 0 ? row.media : meta.media,
   featured_image_url: row.cover_image_url || meta.cover_image_url || row.image_url || undefined,
   video_url: meta.promo_media?.youtube_url || meta.promo_media?.youtubeUrl || undefined,
 }),
 pricing_tiers: Array.isArray(row.pricing_tiers) && row.pricing_tiers.length > 0 ? row.pricing_tiers : (meta.pricing_tiers || []),
 extra_options: Array.isArray(row.extra_options) && row.extra_options.length > 0 ? row.extra_options : (meta.extra_options || []),
 web_page_config: row.web_page_config || meta.web_page_config || null,
 created_at: row.created_at,
 updated_at: row.updated_at,
 };
 });

// ─── 3. Atualizar Alocação de Poltronas e Quartos ─────────────────────────────

export const updateGroupTourAllocations = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid("ID de excursão inválido."),
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
 const identity = await requireStaff();

 const { data: existingTour, error: fetchErr } = await supabase
   .from("tourism_experiences")
   .select("id, store_id")
   .eq("id", data.id)
   .maybeSingle();
 if (fetchErr || !existingTour) {
   throw new Error("Excursão não encontrada.");
 }
 if (existingTour.store_id !== identity.store_id && identity.role !== "platform_admin") {
   throw new Error("Acesso negado para atualizar excursão de outra agência.");
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
 .eq("id", data.id)
 .eq("store_id", existingTour.store_id);

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
 const { meta, humanText } = parseExperienceMetaDescription(row.description);

 const hotelsList = Array.isArray(row.hotels) && row.hotels.length > 0
   ? normalizeHotelsList(row.hotels)
   : meta.hotel_details && (meta.hotel_details.name || meta.hotel_details.hotel_name)
     ? normalizeHotelsList([{
         id: "hotel-1",
         hotel_name: meta.hotel_details.hotel_name || meta.hotel_details.name,
         stars: Number(meta.hotel_details.stars || 3),
         checkin_date: meta.hotel_details.checkIn || undefined,
         checkout_date: meta.hotel_details.checkOut || undefined,
         amenities: Array.isArray(meta.hotel_details.amenities) ? meta.hotel_details.amenities : [],
         images: Array.isArray(meta.hotel_details.gallery) ? meta.hotel_details.gallery : [],
       }])
     : [];

 return {
 id: row.id,
 store_id: row.store_id,
 title: row.title,
 subtitle: row.subtitle || null,
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
 excluded_items: Array.isArray(row.excluded_items) ? row.excluded_items : [],
 status: (row.status === "published" ? "open" : row.status) || "open",
 notes: row.notes || humanText || null,
 cover_image_url: row.cover_image_url || meta.cover_image_url || row.image_url || null,
 boarding_points: Array.isArray(row.boarding_points) && row.boarding_points.length > 0 ? row.boarding_points : (meta.boarding_points || []),
 payment_conditions: row.payment_conditions || meta.payment_conditions || null,
 vehicle_layout_id: row.vehicle_layout_id || meta.vehicle_layout_id || null,
 vehicle_layout_name: row.vehicle_layout_name || meta.vehicle_layout_name || null,
 hotels: hotelsList,
 transfers: normalizeTransfersList(Array.isArray(row.transfers) && row.transfers.length > 0 ? row.transfers : (meta.transfers || [])),
 tours: normalizeToursList(Array.isArray(row.tours) && row.tours.length > 0 ? row.tours : (meta.tours || [])),
 itinerary: Array.isArray(row.itinerary) && row.itinerary.length > 0 ? row.itinerary : (meta.itinerary || []),
 media: normalizeEntityMediaList({
   media: Array.isArray(row.media) && row.media.length > 0 ? row.media : meta.media,
   featured_image_url: row.cover_image_url || meta.cover_image_url || row.image_url || undefined,
   video_url: meta.promo_media?.youtube_url || meta.promo_media?.youtubeUrl || undefined,
 }),
 pricing_tiers: Array.isArray(row.pricing_tiers) && row.pricing_tiers.length > 0 ? row.pricing_tiers : (meta.pricing_tiers || []),
 extra_options: Array.isArray(row.extra_options) && row.extra_options.length > 0 ? row.extra_options : (meta.extra_options || []),
 web_page_config: row.web_page_config || meta.web_page_config || null,
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
 const identity = await requireStaff();

 const { data: tourRow, error: tourErr } = await supabase
   .from("tourism_experiences")
   .select("id, store_id")
   .eq("id", data.tour_id)
   .maybeSingle();
 if (tourErr || !tourRow) throw new Error("Excursão não encontrada.");
 if (tourRow.store_id !== identity.store_id && identity.role !== "platform_admin") {
   throw new Error("Acesso negado aos custos desta excursão.");
 }

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
 const identity = await requireStaff();

 const { data: tourRow, error: tourErr } = await supabase
   .from("tourism_experiences")
   .select("id, store_id")
   .eq("id", data.tour_id)
   .maybeSingle();
 if (tourErr || !tourRow) throw new Error("Excursão não encontrada.");
 if (tourRow.store_id !== identity.store_id && identity.role !== "platform_admin") {
   throw new Error("Acesso negado para registrar custo em excursão de outra agência.");
 }

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
 const identity = await requireStaff();

 const { data: costRow, error: cErr } = await supabase
   .from("group_tour_costs")
   .select("id, tour_id")
   .eq("id", data.cost_id)
   .maybeSingle();
 if (cErr || !costRow) throw new Error("Item de custo não encontrado.");

 const { data: tourRow } = await supabase
   .from("tourism_experiences")
   .select("id, store_id")
   .eq("id", costRow.tour_id)
   .maybeSingle();
 if (!tourRow || (tourRow.store_id !== identity.store_id && identity.role !== "platform_admin")) {
   throw new Error("Acesso negado para excluir custo de outra agência.");
 }

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
 const identity = await requireStaff();

 const { data: tourRow, error: tourErr } = await supabase
   .from("tourism_experiences")
   .select("id, store_id")
   .eq("id", data.tour_id)
   .maybeSingle();
 if (tourErr || !tourRow) throw new Error("Excursão não encontrada.");
 if (tourRow.store_id !== identity.store_id && identity.role !== "platform_admin") {
   throw new Error("Acesso negado ao orçamento desta excursão.");
 }

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
  .validator(z.object({ id: z.string().uuid("ID de excursão inválido.") }))
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
    const identity = await requireStaff();
    const supabase = getServerClient();
    let q = supabase
      .from("tourism_experiences")
      .select("*")
      .eq("category", "group_tour")
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: false });

    if (data?.search && data.search.trim()) {
      q = q.ilike("title", `%${data.search.trim()}%`);
    }

    const { data: rows, error } = await q;
    if (error) {
      throw new Error(`Erro ao listar excursões da agência: ${error.message}`);
    }
    if (!rows) return [];

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


// ─── 7. Governança de Privacidade, Senha & Vagas da Excursão ───────────────────

export const updateGroupTourSettings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid("ID de excursão inválido."),
      showRemainingSeats: z.boolean().optional(),
      visibilityMode: z.enum(["public", "unlisted", "password_protected"]).optional(),
      accessPassword: z.string().max(100).optional().nullable(),
      allowSharedRooms: z.boolean().optional(),
      singleSupplementCents: z.number().int().nonnegative().optional(),
    })
  )
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const supabase = getServerClient();
    const identity = await requireStaff();

    const { data: tour, error: fetchErr } = await supabase
      .from("tourism_experiences")
      .select("id, store_id, description")
      .eq("id", data.id)
      .single();

    if (fetchErr || !tour) throw new Error("Excursão não encontrada.");
    if (tour.store_id !== identity.store_id && identity.role !== "platform_admin") {
      throw new Error("Acesso negado para alterar configurações de outra agência.");
    }

    let meta: any = {};
    try {
      meta =
        typeof tour.description === "string" && tour.description.startsWith("{")
          ? JSON.parse(tour.description)
          : {};
    } catch {
      meta = {};
    }

    if (data.showRemainingSeats !== undefined) meta.show_remaining_seats = data.showRemainingSeats;
    if (data.visibilityMode !== undefined) meta.visibility_mode = data.visibilityMode;
    if (data.accessPassword !== undefined)
      meta.access_password = data.accessPassword ? data.accessPassword.trim() : null;
    if (data.allowSharedRooms !== undefined) meta.allow_shared_rooms = data.allowSharedRooms;
    if (data.singleSupplementCents !== undefined)
      meta.single_supplement_cents = data.singleSupplementCents;

    const { error: updateErr } = await supabase
      .from("tourism_experiences")
      .update({
        description: JSON.stringify(meta),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (updateErr)
      throw new Error("Falha ao salvar configurações de privacidade: " + updateErr.message);

    return { success: true };
  });

export const validateGroupTourAccessPassword = createServerFn({ method: "POST" })
  .validator(
    z.object({
      tourId: z.string().uuid(),
      password: z.string().trim(),
    })
  )
  .handler(async ({ data }): Promise<{ authorized: boolean; reason?: string }> => {
    const supabase = getAnonServerClient();
    const { data: tour, error } = await supabase
      .from("tourism_experiences")
      .select("id, description")
      .eq("id", data.tourId)
      .maybeSingle();

    if (error || !tour) return { authorized: false, reason: "Excursão não encontrada." };

    let meta: any = {};
    try {
      meta =
        typeof tour.description === "string" && tour.description.startsWith("{")
          ? JSON.parse(tour.description)
          : {};
    } catch {
      meta = {};
    }

    if (meta.visibility_mode !== "password_protected") return { authorized: true };

    const expected = (meta.access_password || "").trim();
    if (!expected || expected === data.password) {
      return { authorized: true };
    }

    return { authorized: false, reason: "Senha incorreta. Solicite o código de acesso à agência." };
  });

// ─── 8. Algoritmo de Pareamento de Quartos Compartilhados ───────────────────────

export const autoPairSharedRooms = createServerFn({ method: "POST" })
  .validator(z.object({ tourId: z.string().uuid("ID de excursão inválido.") }))
  .handler(
    async ({
      data,
    }): Promise<{ success: boolean; pairedCount: number; roomsCreated: number }> => {
      const supabase = getServerClient();
      const identity = await getServerIdentity();
      if (!identity?.id) throw new Error("Não autorizado.");

      const { data: tour, error } = await supabase
        .from("tourism_experiences")
        .select("id, rooms, seats")
        .eq("id", data.tourId)
        .single();

      if (error || !tour) throw new Error("Excursão não encontrada.");

      const currentRooms = (Array.isArray(tour.rooms) ? tour.rooms : []) as HotelRoomAllocationDTO[];
      const currentSeats = (Array.isArray(tour.seats) ? tour.seats : []) as BusSeatDTO[];

      // Identifica passageiros já alocados em quartos existentes
      const allocatedPassengerNames = new Set<string>();
      currentRooms.forEach((r) => {
        (r.passengers || []).forEach((p) => {
          if (p.name) allocatedPassengerNames.add(p.name.trim().toLowerCase());
        });
      });

      // Localiza passageiros com assento confirmado que ainda não foram alocados em quartos
      const unallocatedSharedPax = currentSeats
        .filter(
          (s) =>
            s.passenger_name &&
            s.status === "reserved" &&
            !allocatedPassengerNames.has(s.passenger_name.trim().toLowerCase())
        )
        .map((s) => ({
          name: s.passenger_name as string,
          document: s.passenger_document || undefined,
          phone: s.passenger_phone || undefined,
          seat_number: s.seat_number,
        }));

      if (unallocatedSharedPax.length === 0) {
        return { success: true, pairedCount: 0, roomsCreated: 0 };
      }

      // Agrupa em quartos duplos (2 pessoas por quarto compartilhado)
      const newRooms: HotelRoomAllocationDTO[] = [...currentRooms];
      let roomCounter = currentRooms.length + 1;
      let pairedCount = 0;

      for (let i = 0; i < unallocatedSharedPax.length; i += 2) {
        const pair = unallocatedSharedPax.slice(i, i + 2);
        const roomId = "room-shared-" + roomCounter;
        newRooms.push({
          room_id: roomId,
          room_number: "Q-" + roomCounter,
          room_type: pair.length === 1 ? "single" : "double_twin",
          hotel_name: "Hotel Oficial da Excursão",
          capacity: 2,
          passengers: pair.map((p) => ({
            name: p.name,
            document: p.document,
            phone: p.phone,
            notes: "Alocação automática quarto compartilhado (Poltrona " + p.seat_number + ")",
          })),
        });
        pairedCount += pair.length;
        roomCounter++;
      }

      await supabase
        .from("tourism_experiences")
        .update({
          rooms: newRooms,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.tourId);

      return {
        success: true,
        pairedCount,
        roomsCreated: Math.ceil(unallocatedSharedPax.length / 2),
      };
    }
  );

// ─── 9. Motor Unificado de Reserva & Compra de Excursão ────────────────────────

export const bookGroupTourSchema = z.object({
  tourId: z.string().uuid("ID de excursão inválido"),
  primaryContact: z.object({
    name: z.string().min(2, "Nome completo é obrigatório"),
    email: z.string().email("E-mail válido é obrigatório"),
    phone: z.string().min(8, "Telefone / WhatsApp é obrigatório"),
    document: z.string().optional(),
  }),
  adultsCount: z.number().int().min(1).default(1),
  childrenCount: z.number().int().min(0).default(0),
  childrenAges: z.array(z.number().int().min(0).max(17)).default([]),
  roomPreference: z
    .enum(["single", "shared", "double_couple", "double_twin", "triple", "quadruple"])
    .default("shared"),
  selectedSeats: z.array(z.number().int()).default([]),
  delegateCompanionForms: z.boolean().default(false),
  paymentMethod: z.enum(["pix", "credit_card", "carne", "whatsapp"]).default("pix"),
  notes: z.string().max(500).optional(),
});

export const bookGroupTourReservation = createServerFn({ method: "POST" })
  .validator(bookGroupTourSchema)
  .handler(async ({ data }): Promise<{
    success: boolean;
    reservationCode: string;
    tripId?: string | null;
    totalCents: number;
    companionTokens: string[];
    message: string;
  }> => {
    const supabase = getServerClient();
    const { tourId, primaryContact, adultsCount, childrenCount, childrenAges, roomPreference, selectedSeats, delegateCompanionForms, paymentMethod, notes } = data;

    const { data: tour, error } = await supabase
      .from("tourism_experiences")
      .select("id, title, destination, status, price_cents, total_seats, available_seats, seats, rooms, description, store_id, departure_date, return_date, hotels, transfers, tours, itinerary, included_items, excluded_items, cover_image_url, image_url")
      .eq("id", tourId)
      .single();

    if (error || !tour) throw new Error("Excursão não encontrada.");
    if ((tour as any).status === "cancelled" || (tour as any).status === "closed") {
      throw new Error("Esta excursão não está mais recebendo reservas.");
    }
    const identity = await getServerIdentity().catch(() => null);

    let meta: any = {};
    try {
      meta = typeof tour.description === "string" && tour.description.startsWith("{") ? JSON.parse(tour.description) : {};
    } catch {
      meta = {};
    }

    const totalPax = adultsCount + childrenCount;
    const basePriceCents = Number(tour.price_cents) || 0;
    const singleSupplementCents = roomPreference === "single" ? Number(meta.single_supplement_cents) || 0 : 0;
    const totalCents = basePriceCents * totalPax + singleSupplementCents;

    // Atualiza poltronas no mapa 2D
    const currentSeats = (Array.isArray(tour.seats) ? tour.seats : []) as BusSeatDTO[];
    const updatedSeats = [...currentSeats];

    selectedSeats.forEach((seatNum, idx) => {
      const sIdx = updatedSeats.findIndex((s) => s.seat_number === seatNum);
      if (sIdx >= 0) {
        if (updatedSeats[sIdx].status === "reserved" || updatedSeats[sIdx].status === "blocked") {
          throw new Error("A poltrona " + seatNum + " está indisponível. Selecione outro assento livre.");
        }
        updatedSeats[sIdx] = {
          ...updatedSeats[sIdx],
          status: "reserved",
          passenger_name: idx === 0 ? primaryContact.name : "Acompanhante " + (idx + 1) + " (" + primaryContact.name + ")",
          passenger_phone: idx === 0 ? primaryContact.phone : null,
          passenger_document: idx === 0 ? primaryContact.document || null : null,
        };
      }
    });

    const newAvailable = Math.max(0, (tour.available_seats || tour.total_seats || 46) - totalPax);

    const { error: seatUpdErr } = await supabase
      .from("tourism_experiences")
      .update({
        seats: updatedSeats,
        available_seats: newAvailable,
        updated_at: new Date().toISOString(),
      })
      .eq("id", tourId);

    if (seatUpdErr) {
      throw new Error(`Erro ao atualizar disponibilidade de assentos: ${seatUpdErr.message}`);
    }

    // Geração de tokens de formulário para acompanhantes
    const companionTokens: string[] = [];
    if (delegateCompanionForms && totalPax > 1 && tour.store_id) {
      for (let i = 1; i < totalPax; i++) {
        const assignedSeat = selectedSeats[i] || null;
        const { data: tokenRow } = await supabase
          .from("group_tour_passenger_tokens")
          .insert({
            store_id: tour.store_id,
            tour_id: tourId,
            passenger_seat_number: assignedSeat,
            passenger_name: null,
            passenger_phone: null,
          })
          .select("token")
          .single();

        if (tokenRow?.token) {
          companionTokens.push(tokenRow.token);
        }
      }
    }

    const reservationCode = "EXC-" + crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
    const tAny = tour as any;

    let createdTripId: string | null = null;
    if (tour.store_id) {
      const { data: insertedTrip, error: tripErr } = await supabase
        .from("tourism_trips")
        .insert({
          store_id: tour.store_id,
          created_by_profile_id: identity?.id || null,
          customer_id: identity?.id || null,
          trip_number: reservationCode,
          title: tour.title || `Excursão ${tour.destination || ""}`.trim(),
          destination_city: tour.destination || "Destino Nacional",
          travel_start_date: tAny.departure_date || meta.departure_date || null,
          travel_end_date: tAny.return_date || meta.return_date || null,
          adults_count: adultsCount,
          children_count: childrenCount,
          currency: "BRL",
          total_cents: totalCents,
          status: "confirmed",
          payment_method: paymentMethod,
          client_name: primaryContact.name,
          client_whatsapp: primaryContact.phone,
          client_email: primaryContact.email,
          client_document: primaryContact.document || null,
          cover_image_url: tAny.cover_image_url || tAny.image_url || null,
          flights: [],
          hotels: Array.isArray(tAny.hotels) ? tAny.hotels : [],
          transfers: Array.isArray(tAny.transfers) ? tAny.transfers : [],
          tours: Array.isArray(tAny.tours) ? tAny.tours : [],
          insurance: {},
          itinerary: Array.isArray(tAny.itinerary) ? tAny.itinerary : [],
          rooms: Array.isArray(tour.rooms) ? tour.rooms : [],
          includes: Array.isArray(tAny.included_items) ? tAny.included_items : [],
          excludes: Array.isArray(tAny.excluded_items) ? tAny.excluded_items : [],
          notes: [
            `Reserva de Excursão (${reservationCode}) · Poltronas: ${selectedSeats.join(", ") || "A definir"}`,
            notes ? `Observações: ${notes}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
          portal_content: {
            source_type: "group_tour",
            group_tour_id: tourId,
            selected_seats: selectedSeats,
            children_ages: childrenAges,
            payment_method: paymentMethod,
          },
        })
        .select("id")
        .maybeSingle();

      if (tripErr) {
        throw new Error(`Erro ao registrar viagem da excursão: ${tripErr.message}`);
      }
      createdTripId = insertedTrip?.id || null;

      if (createdTripId) {
        const { error: paxErr } = await supabase.from("trip_passengers").insert({
          trip_id: createdTripId,
          store_id: tour.store_id,
          full_name: primaryContact.name,
          document: primaryContact.document || null,
          email: primaryContact.email,
          phone: primaryContact.phone,
          seat_number: selectedSeats[0] ? String(selectedSeats[0]) : null,
          is_lead_passenger: true,
        });
        if (paxErr) {
          throw new Error(`Viagem da excursão criada parcialmente; falha ao registrar passageiro: ${paxErr.message}`);
        }
      }
    }

    if (tour.store_id) {
      const { notifyStoreStaff } = await import("@/lib/notifications/store-staff-notify");
      await notifyStoreStaff({
        db: supabase,
        storeId: tour.store_id,
        type: "order",
        title: "Nova Reserva Confirmada",
        message: `${primaryContact?.name || "Passageiro"} reservou ${totalPax} vaga(s) em "${tour.title}" (${reservationCode}).`,
        linkUrl: "/workspace/turismo/grupos",
        authorName: primaryContact?.name || null,
      });
    }

    return {
      success: true,
      reservationCode,
      tripId: createdTripId,
      totalCents,
      companionTokens,
      message: "Reserva confirmada com sucesso! Vagas garantidas na excursão " + tour.title + ".",
    };
  });

export const UpdateGroupTourContentSchema = z.object({
  id: z.string().uuid("ID de excursão inválido."),
  title: z.string().min(3).optional().nullable(),
  subtitle: z.string().optional().nullable(),
  destination: z.string().min(2).optional().nullable(),
  departureCity: z.string().optional().nullable(),
  departureDate: z.string().optional().nullable(),
  departureTime: z.string().optional().nullable(),
  returnDate: z.string().optional().nullable(),
  returnTime: z.string().optional().nullable(),
  priceCents: z.number().int().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  coverImageUrl: z.string().optional().nullable(),
  includedItems: z.array(z.string()).optional().nullable(),
  excludedItems: z.array(z.string()).optional().nullable(),
  boardingPoints: z.array(z.any()).optional().nullable(),
  hotels: z.array(z.any()).optional().nullable(),
  transfers: z.array(z.any()).optional().nullable(),
  tours: z.array(z.any()).optional().nullable(),
  itinerary: z.array(z.any()).optional().nullable(),
  media: z.array(z.any()).optional().nullable(),
  pricingTiers: z.array(z.any()).optional().nullable(),
  extraOptions: z.array(z.any()).optional().nullable(),
  paymentConditions: z.string().optional().nullable(),
  webPageConfig: z.any().optional().nullable(),
  status: z.enum(["open", "confirmed", "closed", "completed", "cancelled"]).optional().nullable(),
});

export const updateGroupTourContent = createServerFn({ method: "POST" })
  .validator(UpdateGroupTourContentSchema)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const supabase = getServerClient();
    const identity = await requireStaff();

    const { data: existing, error: fetchErr } = await supabase
      .from("tourism_experiences")
      .select("id, store_id, author_profile_id")
      .eq("id", data.id)
      .maybeSingle();

    if (fetchErr || !existing) {
      throw new Error("Excursão não encontrada.");
    }

    if (existing.store_id && identity.store_id && existing.store_id !== identity.store_id) {
      throw new Error("Sem permissão para editar excursão de outra loja.");
    }

    const patch: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.title !== undefined && data.title !== null) patch.title = data.title.trim();
    if (data.subtitle !== undefined) patch.subtitle = data.subtitle;
    if (data.destination !== undefined && data.destination !== null) {
      patch.destination = data.destination.trim();
      patch.destination_city = data.destination.trim();
      patch.location = data.destination.trim();
    }
    if (data.departureCity !== undefined && data.departureCity !== null) {
      patch.departure_city = data.departureCity.trim();
    }
    if (data.departureDate !== undefined && data.departureDate !== null) {
      patch.departure_date = data.departureDate;
    }
    if (data.departureTime !== undefined && data.departureTime !== null) {
      patch.departure_time = data.departureTime;
    }
    if (data.returnDate !== undefined && data.returnDate !== null) {
      patch.return_date = data.returnDate;
    }
    if (data.returnTime !== undefined && data.returnTime !== null) {
      patch.return_time = data.returnTime;
    }
    if (data.priceCents !== undefined && data.priceCents !== null) {
      patch.price_cents = data.priceCents;
      patch.price_display =
        data.priceCents > 0
          ? (data.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
          : "Sob Consulta";
    }
    if (data.notes !== undefined) patch.notes = data.notes;
    if (data.coverImageUrl !== undefined) {
      patch.cover_image_url = data.coverImageUrl;
      patch.image_url = data.coverImageUrl;
    }
    if (data.includedItems !== undefined && data.includedItems !== null) {
      patch.included_items = data.includedItems;
    }
    if (data.excludedItems !== undefined && data.excludedItems !== null) {
      patch.excluded_items = data.excludedItems;
    }
    if (data.boardingPoints !== undefined && data.boardingPoints !== null) {
      patch.boarding_points = data.boardingPoints;
    }
    if (data.hotels !== undefined && data.hotels !== null) {
      patch.hotels = normalizeHotelsList(data.hotels);
    }
    if (data.transfers !== undefined && data.transfers !== null) {
      patch.transfers = normalizeTransfersList(data.transfers);
    }
    if (data.tours !== undefined && data.tours !== null) {
      patch.tours = normalizeToursList(data.tours);
    }
    if (data.itinerary !== undefined && data.itinerary !== null) {
      patch.itinerary = data.itinerary;
    }
    if (data.media !== undefined && data.media !== null) {
      patch.media = normalizeEntityMediaList({ media: data.media });
    }
    if (data.pricingTiers !== undefined && data.pricingTiers !== null) {
      patch.pricing_tiers = data.pricingTiers;
    }
    if (data.extraOptions !== undefined && data.extraOptions !== null) {
      patch.extra_options = data.extraOptions;
    }
    if (data.paymentConditions !== undefined) {
      patch.payment_conditions = data.paymentConditions;
    }
    if (data.webPageConfig !== undefined) {
      patch.web_page_config = data.webPageConfig;
    }
    if (data.status !== undefined && data.status !== null) {
      patch.status = data.status;
    }

    const { error: updateErr } = await supabase
      .from("tourism_experiences")
      .update(patch)
      .eq("id", data.id);

    if (updateErr) {
      console.error("[group-tours.functions] Erro em updateGroupTourContent:", updateErr);
      throw new Error(`Falha ao salvar conteúdo da excursão: ${updateErr.message}`);
    }

    return { success: true };
  });
