import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const GenerateTokenSchema = z.object({
 store_id: z.string().uuid(),
 tour_id: z.string().uuid(),
 passenger_seat_number: z.number().int().optional().nullable(),
 passenger_name: z.string().optional().nullable(),
 passenger_phone: z.string().optional().nullable(),
});

export const SubmitPassengerFormSchema = z.object({
 token: z.string().min(10),
 passenger_name: z.string().min(2, "Nome completo é obrigatório"),
 passenger_document: z.string().min(5, "CPF ou RG é obrigatório"),
 passenger_phone: z.string().min(8, "Telefone para contato é obrigatório"),
 passenger_birth_date: z.string().min(4, "Data de nascimento é obrigatória"),
 emergency_contact_name: z.string().min(2, "Contato de emergência é obrigatório"),
 emergency_contact_phone: z.string().min(8, "Telefone de emergência é obrigatório"),
 dietary_restrictions: z.string().optional().nullable(),
 boarding_point: z.string().optional().nullable(),
 terms_accepted: z.literal(true, {
 errorMap: () => ({ message: "Você deve aceitar os termos da viagem" }),
 }),
});

// ---------------------------------------------------------------------------
// Server Functions
// ---------------------------------------------------------------------------

export const generatePassengerMagicLink = createServerFn({ method: "POST" })
  .validator(GenerateTokenSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    if (data.store_id !== identity.storeId && !identity.isPlatformAdmin) {
      throw new Error("Acesso não autorizado para esta organização.");
    }

    const db = getServerClient();
    const { data: created, error } = await db
      .from("group_tour_passenger_tokens")
      .insert({
        store_id: data.store_id,
        tour_id: data.tour_id,
        passenger_seat_number: data.passenger_seat_number || null,
        passenger_name: data.passenger_name || null,
        passenger_phone: data.passenger_phone || null,
      })
      .select("token, passenger_seat_number, expires_at")
      .single();

    if (error) throw error;
    return created;
  });

export const getPublicPassengerForm = createServerFn({ method: "GET" })
 .validator(z.object({ token: z.string().min(5) }))
 .handler(async ({ data }) => {
 const db = getAnonServerClient();

 const { data: record, error } = await db
 .from("group_tour_passenger_tokens")
 .select(`
 id, token, passenger_seat_number, passenger_name, passenger_document, passenger_phone,
 passenger_birth_date, emergency_contact_name, emergency_contact_phone,
 dietary_restrictions, boarding_point, terms_accepted, status, expires_at,
 tourism_experiences:tour_id (
 id, title, location, description, price_cents
 )
 `)
 .eq("token", data.token)
 .maybeSingle();

 if (error || !record) {
 throw new Error("Formulário de passageiro não encontrado ou link expirado.");
 }

 if (new Date(record.expires_at) < new Date()) {
 throw new Error("Este link de cadastro expirou. Solicite um novo à agência.");
 }

 // Parse dos metadados da excursão
 let tourMeta: any = {};
 const tourObj = (record as any).tourism_experiences;
 if (tourObj?.description) {
 try {
 tourMeta =
 typeof tourObj.description === "string" && tourObj.description.startsWith("{")
 ? JSON.parse(tourObj.description)
 : {};
 } catch {
 tourMeta = {};
 }
 }

 return {
 token: record.token,
 status: record.status,
 passenger_seat_number: record.passenger_seat_number,
 passenger_name: record.passenger_name || "",
 passenger_document: record.passenger_document || "",
 passenger_phone: record.passenger_phone || "",
 passenger_birth_date: record.passenger_birth_date || "",
 emergency_contact_name: record.emergency_contact_name || "",
 emergency_contact_phone: record.emergency_contact_phone || "",
 dietary_restrictions: record.dietary_restrictions || "",
 boarding_point: record.boarding_point || "",
 terms_accepted: record.terms_accepted,
 tour: {
 title: tourObj?.title || "Excursão em Grupo",
 destination: tourObj?.location || tourMeta.destination || "Destino",
 departure_city: tourMeta.departure_city || "Cidade de Saída",
 departure_date: tourMeta.departure_date || "",
 departure_time: tourMeta.departure_time || "",
 return_date: tourMeta.return_date || "",
 return_time: tourMeta.return_time || "",
 },
 };
 });

export const submitPassengerForm = createServerFn({ method: "POST" })
  .validator(SubmitPassengerFormSchema)
 .handler(async ({ data }) => {
 const db = getAnonServerClient();

 // 1. Validar token existente
 const { data: record, error: fetchErr } = await db
 .from("group_tour_passenger_tokens")
 .select("id, tour_id, passenger_seat_number, expires_at, status")
 .eq("token", data.token)
 .maybeSingle();

 if (fetchErr || !record) {
 throw new Error("Token de passageiro inválido.");
 }

 if (new Date(record.expires_at) < new Date()) {
 throw new Error("Este formulário expirou.");
 }

 // 2. Atualizar registro do token com dados e carimbo forense
 const { data: updated, error: updateErr } = await db
 .from("group_tour_passenger_tokens")
 .update({
 passenger_name: data.passenger_name.trim(),
 passenger_document: data.passenger_document.trim(),
 passenger_phone: data.passenger_phone.trim(),
 passenger_birth_date: data.passenger_birth_date,
 emergency_contact_name: data.emergency_contact_name.trim(),
 emergency_contact_phone: data.emergency_contact_phone.trim(),
 dietary_restrictions: data.dietary_restrictions?.trim() || null,
 boarding_point: data.boarding_point?.trim() || null,
 terms_accepted: true,
 terms_accepted_at: new Date().toISOString(),
 status: "completed",
 updated_at: new Date().toISOString(),
 })
 .eq("id", record.id)
 .select()
 .single();

 if (updateErr) throw updateErr;

 // 3. Se havia poltrona vinculada, atualizar no mapa da excursão em tourism_experiences
  if (record.passenger_seat_number && record.tour_id) {
    const serverDb = getServerClient();
    const { data: tourRow } = await serverDb
      .from("tourism_experiences")
      .select("description, seats")
      .eq("id", record.tour_id)
      .maybeSingle();

    const patch: Record<string, any> = { updated_at: new Date().toISOString() };

    // Atualiza coluna nativa seats caso exista
    if (tourRow && Array.isArray(tourRow.seats)) {
      const updatedColSeats = [...tourRow.seats];
      const sIdx = updatedColSeats.findIndex(
        (s: any) => s.seat_number === record.passenger_seat_number
      );
      if (sIdx >= 0) {
        updatedColSeats[sIdx] = {
          ...updatedColSeats[sIdx],
          status: "reserved",
          passenger_name: data.passenger_name.trim(),
          passenger_document: data.passenger_document.trim(),
          passenger_phone: data.passenger_phone.trim(),
          boarding_point: data.boarding_point?.trim() || null,
        };
        patch.seats = updatedColSeats;
      }
    }

    // Atualiza JSON em description caso exista
    if (tourRow?.description) {
      try {
        const meta = JSON.parse(tourRow.description);
        if (Array.isArray(meta.seats)) {
          const seatIdx = meta.seats.findIndex(
            (s: any) => s.seat_number === record.passenger_seat_number
          );
          if (seatIdx >= 0) {
            meta.seats[seatIdx].status = "reserved";
            meta.seats[seatIdx].passenger_name = data.passenger_name.trim();
            meta.seats[seatIdx].passenger_document = data.passenger_document.trim();
            meta.seats[seatIdx].passenger_phone = data.passenger_phone.trim();
            meta.seats[seatIdx].boarding_point = data.boarding_point?.trim() || null;
            patch.description = JSON.stringify(meta);
          }
        }
      } catch {
        // parse silencioso
      }
    }

    if (patch.seats || patch.description) {
      await serverDb
        .from("tourism_experiences")
        .update(patch)
        .eq("id", record.tour_id);
    }
  }

  return { success: true };
 });
