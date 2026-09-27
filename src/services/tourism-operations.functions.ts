/**
 * tourism-operations.functions.ts — BFF Server Functions para Operações Turísticas & Eventos
 * Layouts de Ônibus (Bus Layouts), Reserva de Assentos, Rooming List e Check-in de Ingressos.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

// ============================================================
// Schemas
// ============================================================

export const createBusLayoutSchema = z.object({
 store_id: z.string().uuid(),
 name: z.string().min(2, "Nome do layout obrigatório"),
 bus_type: z.enum(["single_deck_46", "single_deck_50", "double_deck_leito_60", "van_15"]).default("single_deck_46"),
 total_seats: z.number().int().positive().default(46),
 floors_count: z.number().int().min(1).max(2).default(1),
 seat_matrix: z.array(
 z.object({
 seat_number: z.number().int(),
 floor: z.number().int().default(1),
 row: z.number().int(),
 column: z.enum(["A", "B", "C", "D"]),
 is_leito: z.boolean().default(false),
 }),
 ),
});

export const reserveSeatSchema = z.object({
 experience_id: z.string().uuid(),
 bus_layout_id: z.string().uuid().optional(),
 seat_number: z.number().int().positive(),
 passenger_name: z.string().min(3, "Nome do passageiro obrigatório"),
 passenger_doc: z.string().min(5, "Documento obrigatório"),
 passenger_phone: z.string().optional(),
 order_id: z.string().uuid().optional(),
});

export const validateCheckinSchema = z.object({
 qr_code_hash: z.string().min(6, "Código hash inválido"),
});

// ============================================================
// Server Functions
// ============================================================

/**
 * 1. Lista layouts de ônibus da loja
 */
export const listBusLayouts = createServerFn({ method: "GET" })
 .handler(async () => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const supabase = getServerClient();
 const { data: layouts, error } = await supabase
 .from("trip_bus_layouts")
 .select("*")
 .eq("store_id", identity.store_id)
 .eq("is_active", true)
 .order("name");

 if (error) throw new Error(`Falha ao listar layouts: ${error.message}`);
 return layouts || [];
 });

/**
 * 2. Cria novo layout de assentos de ônibus
 */
export const createBusLayout = createServerFn({ method: "POST" })
 .validator(createBusLayoutSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const supabase = getServerClient();
 const { data: layout, error } = await supabase
 .from("trip_bus_layouts")
 .insert({
 store_id: identity.store_id,
 name: data.name,
 bus_type: data.bus_type,
 total_seats: data.total_seats,
 floors_count: data.floors_count,
 seat_matrix: data.seat_matrix,
 is_active: true,
 })
 .select()
 .single();

 if (error) throw new Error(`Falha ao criar layout: ${error.message}`);
 return layout;
 });

/**
 * 3. Lista assentos reservados de uma experiência/viagem
 */
export const listExperienceSeatReservations = createServerFn({ method: "GET" })
 .validator(z.object({ experience_id: z.string().uuid() }))
 .handler(async ({ data }) => {
 const supabase = getAnonServerClient();
 const { data: reservations, error } = await supabase
 .from("trip_seat_reservations")
 .select("seat_number, status, passenger_name")
 .eq("experience_id", data.experience_id)
 .in("status", ["reserved", "confirmed", "boarded"]);

 if (error) throw new Error(`Falha ao listar reservas: ${error.message}`);
 return reservations || [];
 });

/**
 * 4. Reserva poltrona de ônibus
 */
export const reserveExperienceSeat = createServerFn({ method: "POST" })
 .validator(reserveSeatSchema)
 .handler(async ({ data }) => {
 const supabase = getServerClient();

 // Checa se o assento já está ocupado
 const { data: existing } = await supabase
 .from("trip_seat_reservations")
 .select("id")
 .eq("experience_id", data.experience_id)
 .eq("seat_number", data.seat_number)
 .in("status", ["reserved", "confirmed", "boarded"])
 .maybeSingle();

 if (existing) {
 throw new Error(`A poltrona ${data.seat_number} já está ocupada.`);
 }

 const { data: reservation, error } = await supabase
 .from("trip_seat_reservations")
 .insert({
 experience_id: data.experience_id,
 bus_layout_id: data.bus_layout_id || null,
 seat_number: data.seat_number,
 passenger_name: data.passenger_name,
 passenger_doc: data.passenger_doc,
 passenger_phone: data.passenger_phone || null,
 order_id: data.order_id || null,
 status: "confirmed",
 })
 .select()
 .single();

 if (error) throw new Error(`Falha ao reservar assento: ${error.message}`);
 return reservation;
 });

/**
 * 5. Validação de Ingresso / Check-in via QR Code na Portaria de Evento
 */
export const validateEventTicketCheckin = createServerFn({ method: "POST" })
 .validator(validateCheckinSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity.id) throw new Error("Não autenticado");

 const supabase = getServerClient();

 const { data: checkin, error } = await supabase
 .from("event_checkins")
 .select("*, event:events!event_checkins_event_id_fkey(title, event_date, location)")
 .eq("qr_code_hash", data.qr_code_hash)
 .single();

 if (error || !checkin) {
 throw new Error("Ingresso não encontrado ou inválido");
 }

 if (checkin.is_checked_in) {
 return {
 success: false,
 already_used: true,
 checked_in_at: checkin.checked_in_at,
 attendee_name: checkin.attendee_name,
 event_title: checkin.event.title,
 message: `ATENÇÃO: Ingresso já utilizado em ${new Date(checkin.checked_in_at).toLocaleTimeString("pt-BR")}`,
 };
 }

 // Registra entrada
 const now = new Date().toISOString();
 await supabase
 .from("event_checkins")
 .update({
 is_checked_in: true,
 checked_in_at: now,
 checked_in_by: identity.id,
 })
 .eq("id", checkin.id);

 return {
 success: true,
 already_used: false,
 attendee_name: checkin.attendee_name,
 event_title: checkin.event.title,
 message: "ACESSO LIBERADO! Bom evento!",
 };
 });
