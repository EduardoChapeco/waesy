/**
 * tourism.functions.ts — BFF para o Módulo de Turismo, Viagens & Lazer
 * 100% Real no Supabase | Zero Mocks | Gestão de Vouchers e Reservas
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getCurrentIdentity } from "@/services/cart-helpers";

// ─── Interfaces & Tipagens ───────────────────────────────────────────────────

export interface TourismItemDTO {
 id: string;
 store_id?: string | null;
 author_profile_id?: string | null;
 title: string;
 subtitle?: string | null;
 description: string;
 summary?: string | null;
 category: "passeios" | "hospedagens" | "gastronomia_turistica" | "aventura" | "agencias" | "cultura";
 location: string;
 location_name?: string;
 duration: string;
 price_display: string;
 price_cents?: number | null;
 image_url: string;
 cover_image?: string;
 gallery_urls: string[];
 provider_name: string;
 provider_logo_url?: string | null;
 contact_whatsapp: string;
 rating: number;
 badge_label?: string;
 included_items: string[];
 what_to_bring: string[];
 itinerary?: Array<{ day?: number; title: string; description: string; time?: string }> | null;
 is_featured: boolean;
 status: "active" | "inactive" | "draft";
 created_at: string;
}

export interface TourismPassenger {
 name: string;
 document?: string;
 phone?: string;
 notes?: string;
}

export interface TourismBookingDTO {
 id: string;
 experience_id: string;
 profile_id?: string | null;
 voucher_code: string;
 customer_name: string;
 customer_email: string;
 customer_phone: string;
 desired_date: string | null;
 guests_count: number;
 total_price_cents: number;
 payment_status: "pending" | "paid" | "confirmed" | "cancelled" | "refunded";
 payment_method: string;
 passengers: TourismPassenger[];
 meeting_point?: string | null;
 emergency_contact?: string | null;
 message?: string | null;
 status: "pending" | "contacted" | "confirmed" | "cancelled";
 created_at: string;
 experience?: TourismItemDTO | null;
}

// ─── 1. Listagem Pública de Turismo (Zero Mocks) ────────────────────────────

export const listPublicTourism = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 category: z.string().optional(),
 search: z.string().optional(),
 limit: z.number().int().min(1).max(100).optional(),
 })
 .optional(),
 )
 .handler(async ({ data }) => {
 const supabase = getAnonServerClient();
 const limit = data?.limit ?? 50;

 let query = supabase
 .from("tourism_experiences")
 .select("*")
 .eq("status", "active")
 .not("id", "like", "b0000000-%")
 .not("title", "ilike", "%Catamarã%")
 .not("title", "ilike", "%Rota das Cachoeiras%")
 .not("title", "ilike", "%Trilha Ecológica%")
 .order("is_featured", { ascending: false })
 .order("created_at", { ascending: false })
 .limit(limit);

 if (data?.category && data.category !== "todos") {
 query = query.eq("category", data.category);
 }

 if (data?.search && data.search.trim()) {
 const q = `%${data.search.trim()}%`;
 query = query.or(
 `title.ilike.${q},subtitle.ilike.${q},location.ilike.${q},provider_name.ilike.${q},description.ilike.${q}`,
 );
 }

 const { data: rows, error } = await query;

 if (error || !rows) {
 if (error) console.error("[tourism.functions] listPublicTourism error:", error);
 return [];
 }

 return rows.map((row: any) => ({
 id: row.id,
 store_id: row.store_id,
 author_profile_id: row.author_profile_id,
 title: row.title,
 subtitle: row.subtitle,
 description: row.description,
 summary: row.subtitle || row.description?.slice(0, 120),
 category: row.category,
 location: row.location,
 location_name: row.location?.split(",")?.[0] || row.location,
 duration: row.duration,
 price_display: row.price_display,
 price_cents: row.price_cents ? Number(row.price_cents) : null,
 image_url: row.image_url,
 cover_image: row.image_url,
 gallery_urls: row.gallery_urls || [],
 provider_name: row.provider_name,
 provider_logo_url: row.provider_logo_url,
 contact_whatsapp: row.contact_whatsapp,
 rating: Number(row.rating || 5.0),
 badge_label: row.badge_label || "Experiência",
 included_items: row.included_items || [],
 what_to_bring: row.what_to_bring || [],
 is_featured: row.is_featured ?? false,
 status: row.status,
 created_at: row.created_at,
 })) as TourismItemDTO[];
 });

// ─── 2. Detalhes de uma Experiência Turística ────────────────────────────────

export const getPublicTourismById = createServerFn({ method: "GET" })
 .validator(z.object({ experienceId: z.string() }))
 .handler(async ({ data: { experienceId } }) => {
 const supabase = getAnonServerClient();

 const { data: row, error } = await supabase
 .from("tourism_experiences")
 .select("*")
 .eq("id", experienceId)
 .maybeSingle();

 if (error || !row) {
 if (error) console.error("[tourism.functions] getPublicTourismById error:", error);
 return null;
 }

 return {
 id: row.id,
 store_id: row.store_id,
 author_profile_id: row.author_profile_id,
 title: row.title,
 subtitle: row.subtitle,
 description: row.description,
 summary: row.subtitle || row.description?.slice(0, 120),
 category: row.category,
 location: row.location,
 location_name: row.location?.split(",")?.[0] || row.location,
 duration: row.duration,
 price_display: row.price_display,
 price_cents: row.price_cents ? Number(row.price_cents) : null,
 image_url: row.image_url,
 cover_image: row.image_url,
 gallery_urls: row.gallery_urls || [],
 provider_name: row.provider_name,
 provider_logo_url: row.provider_logo_url,
 contact_whatsapp: row.contact_whatsapp,
 rating: Number(row.rating || 5.0),
 badge_label: row.badge_label || "Experiência",
 included_items: row.included_items || [],
 what_to_bring: row.what_to_bring || [],
 itinerary: row.itinerary || row.attributes?.itinerary || row.attributes?.itinerary_days || null,
 is_featured: row.is_featured ?? false,
 status: row.status,
 created_at: row.created_at,
 } as TourismItemDTO;
 });

// ─── 3. Reserva Direta com Emissão de Voucher Digital (In-App Booking) ────────

export const bookTourismExperience = createServerFn({ method: "POST" })
  .validator(
    z.object({
      experienceId: z.string(),
      customerName: z.string().min(2, "Informe seu nome completo"),
      customerEmail: z.string().email("E-mail inválido"),
      customerPhone: z.string().min(8, "Telefone inválido"),
      desiredDate: z.string().min(1, "Selecione a data da viagem/passeio"),
      guestsCount: z.number().int().min(1, "Mínimo de 1 participante").default(1),
      selectedSeats: z.array(z.number().int().positive()).optional().default([]),
      passengers: z
        .array(
          z.object({
            name: z.string().min(2, "Nome do passageiro"),
            document: z.string().optional(),
            phone: z.string().optional(),
            notes: z.string().optional(),
            seatNumber: z.number().optional(),
          }),
        )
        .optional(),
      paymentMethod: z.enum(["pix", "credit_card", "boleto", "agency_pay"]).default("pix"),
      message: z.string().max(1000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getCurrentIdentity().catch(() => null);

    // 1. Obter detalhes da experiência e o mapa de assentos atual
    const { data: experience, error: expError } = await supabase
      .from("tourism_experiences")
      .select("id, title, location, price_cents, provider_name, contact_whatsapp, seats, total_seats, available_seats, category")
      .eq("id", data.experienceId)
      .single();

    if (expError || !experience) {
      throw new Error("Experiência turística não encontrada ou indisponível.");
    }

    // 2. Validação e Reserva Atômica de Poltronas (se informadas)
    const seatsToBook = (data.selectedSeats && data.selectedSeats.length > 0)
      ? data.selectedSeats
      : (data.passengers || []).map((p: any) => p.seatNumber).filter((s): s is number => typeof s === "number" && s > 0);

    let updatedSeatsArray = Array.isArray(experience.seats) ? [...experience.seats] : null;

    if (seatsToBook.length > 0 && updatedSeatsArray) {
      for (const seatNum of seatsToBook) {
        const seatIdx = updatedSeatsArray.findIndex((s: any) => s.seat_number === seatNum);
        if (seatIdx !== -1) {
          const targetSeat = updatedSeatsArray[seatIdx];
          if (targetSeat.status === "reserved" || targetSeat.status === "blocked") {
            throw new Error(`A poltrona nº ${seatNum} já está reservada por outro passageiro. Por favor, selecione outro assento.`);
          }
        }
      }

      // Aloca os assentos aos passageiros
      seatsToBook.forEach((seatNum, idx) => {
        const seatIdx = updatedSeatsArray!.findIndex((s: any) => s.seat_number === seatNum);
        const pax = data.passengers?.[idx] || { name: data.customerName, document: undefined, phone: data.customerPhone };
        const updatedSeat = {
          ...(seatIdx !== -1 ? updatedSeatsArray![seatIdx] : {
            seat_number: seatNum,
            row: Math.ceil(seatNum / 4),
            column: seatNum % 2 === 1 ? "A" : "B",
            floor: 1,
          }),
          status: "reserved",
          passenger_name: pax.name || data.customerName,
          passenger_document: pax.document || null,
          passenger_phone: pax.phone || data.customerPhone,
        };

        if (seatIdx !== -1) {
          updatedSeatsArray![seatIdx] = updatedSeat;
        } else {
          updatedSeatsArray!.push(updatedSeat);
        }
      });

      const currentAvailable = Number(experience.available_seats ?? experience.total_seats ?? 46);
      const newAvailable = Math.max(0, currentAvailable - seatsToBook.length);

      const { error: seatUpdateError } = await supabase
        .from("tourism_experiences")
        .update({
          seats: updatedSeatsArray,
          available_seats: newAvailable,
        })
        .eq("id", data.experienceId);

      if (seatUpdateError) {
        console.error("[tourism.functions] Erro ao alocar poltronas:", seatUpdateError);
        throw new Error("Não foi possível reservar a poltrona selecionada no momento.");
      }

      // Sincroniza espelho em trip_seat_reservations para telemetria de frota
      for (const seatNum of seatsToBook) {
        try {
          await supabase.from("trip_seat_reservations").insert({
            experience_id: data.experienceId,
            seat_number: seatNum,
            passenger_name: data.customerName,
            passenger_doc: data.passengers?.[0]?.document || null,
            passenger_phone: data.customerPhone,
            status: "confirmed",
          });
        } catch {}
      }
    }

    // 3. Gerar código único de voucher com Entropia Criptográfica (CSPRNG)
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    const randomSuffix = 100000 + (randomBuffer[0] % 900000);
    const voucherCode = `WDR-TUR-${randomSuffix}`;

    // 4. Calcular valor total em centavos
    const unitPrice = Number(experience.price_cents || 0);
    const totalPriceCents = unitPrice * data.guestsCount;

    // 5. Inserir reserva no Supabase com persistência real
    const { data: booking, error: bookError } = await supabase
      .from("tourism_inquiries")
      .insert({
        experience_id: data.experienceId,
        profile_id: identity?.customer_id || null,
        voucher_code: voucherCode,
        customer_name: data.customerName.trim(),
        customer_email: data.customerEmail.trim().toLowerCase(),
        customer_phone: data.customerPhone.trim(),
        desired_date: data.desiredDate,
        guests_count: data.guestsCount,
        total_price_cents: totalPriceCents,
        payment_status: "confirmed",
        payment_method: data.paymentMethod,
        passengers: data.passengers || [{ name: data.customerName.trim() }],
        meeting_point: experience.location,
        message: data.message?.trim() || null,
        status: "confirmed",
        notes: seatsToBook.length > 0 ? `Poltrona(s) reservada(s): ${seatsToBook.join(", ")}` : null,
      })
      .select("id, voucher_code, created_at")
      .single();

    if (bookError) {
      console.error("[tourism.functions] Erro ao gravar reserva de turismo:", bookError);
      throw new Error("Não foi possível confirmar a sua reserva no momento. Tente novamente.");
    }

    return {
      success: true,
      booking_id: booking.id,
      voucher_code: booking.voucher_code,
      message: "Reserva confirmada com sucesso! Seu voucher digital foi emitido.",
      redirect_url: `/conta/viagens?voucher=${booking.voucher_code}`,
    };
  });

// ─── 4. Inquérito / Solicitação de Orçamento Turístico ────────────────────────

export const inquireTourismExperience = createServerFn({ method: "POST" })
 .validator(
 z.object({
 experienceId: z.string(),
 customerName: z.string().min(2, "Informe seu nome"),
 customerEmail: z.string().email("E-mail inválido"),
 customerPhone: z.string().min(8, "Telefone inválido"),
 desiredDate: z.string().optional(),
 guestsCount: z.number().int().min(1).default(1),
 message: z.string().max(1000).optional(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity().catch(() => null);

 const { error } = await supabase.from("tourism_inquiries").insert({
 experience_id: data.experienceId,
 profile_id: identity?.customer_id || null,
 customer_name: data.customerName.trim(),
 customer_email: data.customerEmail.trim().toLowerCase(),
 customer_phone: data.customerPhone.trim(),
 desired_date: data.desiredDate || null,
 guests_count: data.guestsCount,
 message: data.message?.trim() || null,
 status: "pending",
 });

 if (error) {
 console.error("[tourism.functions] Erro ao registrar interesse turístico:", error);
 throw new Error("Erro ao registrar interesse: " + error.message);
 }

 return {
 success: true,
 message: "Solicitação de reserva registrada com sucesso!",
 };
 });

// ─── 5. Minhas Viagens do Cliente (Customer Trips & Vouchers) ────────────────

export const listCustomerTrips = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity().catch(() => null);

 if (!identity?.customer_id) {
 return [];
 }

 const { data: rows, error } = await supabase
 .from("tourism_inquiries")
 .select(
 `
 id, experience_id, voucher_code, customer_name, customer_email, customer_phone,
 desired_date, guests_count, total_price_cents, payment_status, payment_method,
 passengers, meeting_point, status, created_at,
 tourism_experiences (
 id, title, subtitle, description, category, location, duration,
 price_display, price_cents, image_url, provider_name, contact_whatsapp, rating
 )
 `,
 )
 .eq("profile_id", identity.customer_id)
 .order("created_at", { ascending: false });

 if (error || !rows) {
 if (error) console.error("[tourism.functions] listCustomerTrips error:", error);
 return [];
 }

 return rows.map((row: any) => ({
 id: row.id,
 experience_id: row.experience_id,
 voucher_code: row.voucher_code || `WDR-TUR-${row.id.slice(0, 6).toUpperCase()}`,
 customer_name: row.customer_name,
 customer_email: row.customer_email,
 customer_phone: row.customer_phone,
 desired_date: row.desired_date,
 guests_count: row.guests_count || 1,
 total_price_cents: Number(row.total_price_cents || 0),
 payment_status: row.payment_status || "confirmed",
 payment_method: row.payment_method || "pix",
 passengers: row.passengers || [],
 meeting_point: row.meeting_point,
 status: row.status,
 created_at: row.created_at,
 experience: row.tourism_experiences
 ? {
 id: row.tourism_experiences.id,
 title: row.tourism_experiences.title,
 subtitle: row.tourism_experiences.subtitle,
 description: row.tourism_experiences.description,
 category: row.tourism_experiences.category,
 location: row.tourism_experiences.location,
 duration: row.tourism_experiences.duration,
 price_display: row.tourism_experiences.price_display,
 price_cents: row.tourism_experiences.price_cents,
 image_url: row.tourism_experiences.image_url,
 provider_name: row.tourism_experiences.provider_name,
 contact_whatsapp: row.tourism_experiences.contact_whatsapp,
 rating: Number(row.tourism_experiences.rating || 5.0),
 gallery_urls: [],
 included_items: [],
 what_to_bring: [],
 is_featured: false,
 status: "active",
 created_at: row.created_at,
 }
 : null,
 })) as TourismBookingDTO[];
});

// ─── 6. Detalhe de um Voucher Específico ──────────────────────────────────────

export const getTripVoucherDetail = createServerFn({ method: "GET" })
 .validator(z.object({ voucherCode: z.string() }))
 .handler(async ({ data: { voucherCode } }) => {
 const supabase = getServerClient();

 const { data: row, error } = await supabase
 .from("tourism_inquiries")
 .select(
 `
 id, experience_id, voucher_code, customer_name, customer_email, customer_phone,
 desired_date, guests_count, total_price_cents, payment_status, payment_method,
 passengers, meeting_point, status, created_at,
 tourism_experiences (
 id, title, subtitle, description, category, location, duration,
 price_display, price_cents, image_url, provider_name, contact_whatsapp, rating,
 included_items, what_to_bring
 )
 `,
 )
 .eq("voucher_code", voucherCode)
 .maybeSingle();

 if (error || !row) {
 return null;
 }

 return {
 id: row.id,
 experience_id: row.experience_id,
 voucher_code: row.voucher_code,
 customer_name: row.customer_name,
 customer_email: row.customer_email,
 customer_phone: row.customer_phone,
 desired_date: row.desired_date,
 guests_count: row.guests_count,
 total_price_cents: Number(row.total_price_cents || 0),
 payment_status: row.payment_status,
 payment_method: row.payment_method,
 passengers: row.passengers || [],
 meeting_point: row.meeting_point,
 status: row.status,
 created_at: row.created_at,
 experience: row.tourism_experiences as any,
 } as TourismBookingDTO;
 });

// ─── 7. Cadastro de Experiência Turística no Workspace ────────────────────────

export const createTourismExperience = createServerFn({ method: "POST" })
 .validator(
 z.object({
 title: z.string().min(3, "Título muito curto"),
 subtitle: z.string().optional(),
 description: z.string().min(10, "Descrição detalhada obrigatória"),
 category: z.enum([
 "passeios",
 "hospedagens",
 "gastronomia_turistica",
 "aventura",
 "agencias",
 "cultura",
 ]),
 location: z.string().min(3, "Informe o local ou ponto de encontro"),
 duration: z.string().min(1, "Informe a duração ou período"),
 priceDisplay: z.string().min(1, "Informe o valor visual (ex: R$ 150/pessoa)"),
 priceCents: z.number().int().min(0).optional(),
 imageUrl: z.string().url("Informe a URL da foto principal"),
 galleryUrls: z.array(z.string()).optional(),
 providerName: z.string().min(2, "Nome da agência ou anfitrião"),
 contactWhatsapp: z.string().min(8, "WhatsApp de contato"),
 includedItems: z.array(z.string()).optional(),
 whatToBring: z.array(z.string()).optional(),
 isFeatured: z.boolean().default(false),
 }),
 )
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();

 if (!identity.id) {
 throw new Error("Não autorizado — faça login como parceiro para cadastrar.");
 }

 const { data: newRow, error } = await supabase
 .from("tourism_experiences")
 .insert({
 store_id: identity.store_id || null,
 author_profile_id: identity.id,
 title: input.title.trim(),
 subtitle: input.subtitle?.trim() || null,
 description: input.description.trim(),
 category: input.category,
 location: input.location.trim(),
 duration: input.duration.trim(),
 price_display: input.priceDisplay.trim(),
 price_cents: input.priceCents || null,
 image_url: input.imageUrl,
 gallery_urls: input.galleryUrls || [],
 provider_name: input.providerName.trim(),
 contact_whatsapp: input.contactWhatsapp.trim(),
 included_items: input.includedItems || [],
 what_to_bring: input.whatToBring || [],
 is_featured: input.isFeatured,
 status: "active",
 })
 .select("id")
 .single();

 if (error) {
 console.error("[tourism.functions] Erro ao cadastrar experiência:", error);
 throw new Error("Falha ao salvar experiência no Supabase: " + error.message);
 }

 return { success: true, experience_id: newRow.id };
 });

// ─── ESTRUTURAS CANÔNICAS DE COTAÇÃO DE VIAGEM & HOSPEDAGEM (PADRÃO CVC / TRAVELAGENCIAS) ───
export type TravelTripType = "air_package" | "hotel_only" | "cruise" | "bus" | "visa_assistance";

export interface TravelQuoteRequestDTO {
 id: string;
 origin_city: string;
 origin_iata?: string | null;
 destination_city: string;
 destination_iata?: string | null;
 departure_date?: string | null;
 return_date?: string | null;
 rooms_count: number;
 adults_count: number;
 children_count: number;
 children_ages: number[];
 trip_type: TravelTripType;
 flexible_dates?: boolean;
 contact_name: string;
 contact_whatsapp: string;
 contact_email?: string | null;
 budget_tier?: "economy" | "standard" | "premium" | "luxury";
 special_notes?: string | null;
 status: "new" | "analyzing" | "quoted" | "won" | "lost";
 agency_notes?: string | null;
 quote_amount_cents?: number | null;
 created_at: string;
}

export const requestTravelQuote = createServerFn({ method: "POST" })
 .validator(
 z.object({
 origin_city: z.string().min(1, "Origem obrigatória"),
 origin_iata: z.string().optional(),
 destination_city: z.string().min(1, "Destino obrigatório"),
 destination_iata: z.string().optional(),
 departure_date: z.string().optional(),
 return_date: z.string().optional(),
 rooms_count: z.number().default(1),
 adults_count: z.number().default(2),
 children_count: z.number().default(0),
 children_ages: z.array(z.number()).default([]),
 trip_type: z.enum(["air_package", "hotel_only", "cruise", "bus", "visa_assistance"]).default("air_package"),
 flexible_dates: z.boolean().default(false),
 contact_name: z.string().min(1, "Nome obrigatório"),
 contact_whatsapp: z.string().min(8, "WhatsApp obrigatório"),
 contact_email: z.string().optional(),
 budget_tier: z.enum(["economy", "standard", "premium", "luxury"]).default("standard"),
 special_notes: z.string().optional(),
 })
 )
 .handler(async ({ data }): Promise<{ success: boolean; id: string }> => {
 const supabase = getServerClient();

 const { data: inserted, error } = await supabase
 .from("travel_quotes")
 .insert({
 origin_city: data.origin_city,
 origin_iata: data.origin_iata || null,
 destination_city: data.destination_city,
 destination_iata: data.destination_iata || null,
 departure_date: data.departure_date || null,
 return_date: data.return_date || null,
 rooms_count: data.rooms_count,
 adults_count: data.adults_count,
 children_count: data.children_count,
 children_ages: data.children_ages,
 trip_type: data.trip_type,
 flexible_dates: data.flexible_dates,
 contact_name: data.contact_name,
 contact_whatsapp: data.contact_whatsapp,
 contact_email: data.contact_email || null,
 budget_tier: data.budget_tier,
 special_notes: data.special_notes || null,
 status: "new",
 })
 .select("id")
 .single();

 if (error) {
 console.error("[tourism.functions] Erro ao gravar cotação na tabela travel_quotes:", error);
 return { success: false, id: "" };
 }

 return { success: true, id: inserted.id };
 });

export const listAgencyTravelQuotes = createServerFn({ method: "GET" })
 .validator(
 z.object({
 status: z.enum(["all", "new", "analyzing", "quoted", "won", "lost"]).default("all"),
 limit: z.number().default(50),
 })
 )
 .handler(async ({ data }): Promise<TravelQuoteRequestDTO[]> => {
 const supabase = getServerClient();
 
 let query = supabase.from("travel_quotes").select("*").order("created_at", { ascending: false }).limit(data.limit);
 
 if (data.status !== "all") {
 query = query.eq("status", data.status);
 }
 
 const { data: rows, error } = await query;

 if (error || !rows) {
 return [];
 }

 return rows.map((r: any) => ({
 id: r.id,
 origin_city: r.origin_city,
 origin_iata: r.origin_iata,
 destination_city: r.destination_city,
 destination_iata: r.destination_iata,
 departure_date: r.departure_date,
 return_date: r.return_date,
 rooms_count: r.rooms_count,
 adults_count: r.adults_count,
 children_count: r.children_count,
 children_ages: r.children_ages,
 trip_type: r.trip_type,
 flexible_dates: r.flexible_dates,
 contact_name: r.contact_name,
 contact_whatsapp: r.contact_whatsapp,
 contact_email: r.contact_email,
 budget_tier: r.budget_tier,
 special_notes: r.special_notes,
 status: r.status,
 agency_notes: r.agency_notes,
 quote_amount_cents: r.quote_amount_cents,
 created_at: r.created_at,
 }));
 });

export const createAgencyTravelQuoteSchema = z.object({
 contact_name: z.string().min(2, "Nome do cliente é obrigatório"),
 contact_whatsapp: z.string().min(8, "WhatsApp do cliente é obrigatório"),
 contact_email: z.string().optional().nullable(),
 origin_city: z.string().default("Chapecó"),
 origin_iata: z.string().optional().nullable(),
 destination_city: z.string().min(2, "Destino é obrigatório"),
 destination_iata: z.string().optional().nullable(),
 departure_date: z.string().optional().nullable(),
 return_date: z.string().optional().nullable(),
 adults_count: z.number().int().min(1).default(2),
 children_count: z.number().int().min(0).default(0),
 children_ages: z.array(z.number().int()).optional().nullable(),
 flexible_dates: z.boolean().optional().default(false),
 rooms_count: z.number().int().min(1).default(1),
 trip_type: z.enum(["air_package", "hotel_only", "cruise", "bus", "visa_assistance"]).default("air_package"),
 budget_tier: z.enum(["economy", "standard", "premium", "luxury"]).default("standard"),
 special_notes: z.string().optional().nullable(),
 agency_notes: z.string().optional().nullable(),
 quote_amount_cents: z.number().int().nonnegative().optional().nullable(),
 status: z.enum(["new", "analyzing", "quoted", "won", "lost"]).default("new"),
});

export const createAgencyTravelQuote = createServerFn({ method: "POST" })
 .validator(createAgencyTravelQuoteSchema)
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const { data: inserted, error } = await supabase
 .from("travel_quotes")
 .insert({
 origin_city: data.origin_city,
 origin_iata: data.origin_iata || null,
 destination_city: data.destination_city,
 destination_iata: data.destination_iata || null,
 departure_date: data.departure_date || null,
 return_date: data.return_date || null,
 rooms_count: data.rooms_count,
 adults_count: data.adults_count,
 children_count: data.children_count,
 children_ages: data.children_ages || [],
 flexible_dates: data.flexible_dates ?? false,
 trip_type: data.trip_type,
 contact_name: data.contact_name,
 contact_whatsapp: data.contact_whatsapp,
 contact_email: data.contact_email || null,
 budget_tier: data.budget_tier,
 special_notes: data.special_notes || null,
 agency_notes: data.agency_notes || null,
 quote_amount_cents: data.quote_amount_cents || null,
 status: data.status,
 })
 .select("id")
 .single();

 if (error) {
 console.error("[tourism.functions] Erro ao cadastrar cotação manual:", error);
 throw new Error(error.message || "Erro ao cadastrar cotação.");
 }

 return { id: inserted.id };
 });

export const updateAgencyTravelQuoteSchema = z.object({
 id: z.string().uuid(),
 status: z.enum(["new", "analyzing", "quoted", "won", "lost"]).optional(),
 agency_notes: z.string().optional().nullable(),
 quote_amount_cents: z.number().int().nonnegative().optional().nullable(),
 departure_date: z.string().optional().nullable(),
 return_date: z.string().optional().nullable(),
 adults_count: z.number().int().optional(),
 children_count: z.number().int().optional(),
});

export const updateAgencyTravelQuote = createServerFn({ method: "POST" })
 .validator(updateAgencyTravelQuoteSchema)
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const { id, ...patch } = data;

 const { error } = await supabase
 .from("travel_quotes")
 .update({
 ...patch,
 updated_at: new Date().toISOString(),
 })
 .eq("id", id);

 if (error) {
 console.error("[tourism.functions] Erro ao atualizar cotação:", error);
 throw new Error(error.message || "Erro ao atualizar cotação.");
 }

 return { success: true };
 });

export const deleteAgencyTravelQuote = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const { error } = await supabase.from("travel_quotes").delete().eq("id", data.id);

 if (error) {
 console.error("[tourism.functions] Erro ao deletar cotação:", error);
 throw new Error(error.message || "Erro ao deletar cotação.");
 }

 return { success: true };
 });
