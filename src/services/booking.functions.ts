import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { resolveTenantStoreId } from "@/lib/tenant.server";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { getWorkingIntervalsForDate } from "@/services/store.functions";

// --- SCHEMAS ---

export const bookingServiceSchema = z.object({
 id: z.string().uuid(),
 store_id: z.string().uuid(),
 title: z.string(),
 description: z.string().nullable(),
 duration_minutes: z.number(),
 price_cents: z.number(),
 status: z.enum(["active", "archived"]),
});

export const createAppointmentSchema = z.object({
 service_id: z.string().uuid(),
 guest_name: z.string().min(2, "Nome é obrigatório"),
 guest_phone: z.string().min(10, "Telefone é obrigatório"),
 scheduled_at: z.string().datetime(),
 notes: z.string().optional(),
 pass_id: z.string().uuid().optional(),
});

// --- FUNCTIONS ---

/**
 * Consulta passes ativos do cliente logado para um serviço específico.
 */
export const listMyPassesForService = createServerFn({ method: "GET" })
 .validator(z.object({ service_id: z.string().uuid() }))
 .handler(async ({ data: { service_id } }) => {
 try {
 const identity = await getServerIdentity();
 if (!identity?.id) return [];

 const db = getServerClient();
 const { data: passes, error } = await db
 .from("customer_service_passes")
 .select(`
 id, package_id, total_credits, remaining_credits, expires_at, status,
 service_packages!inner (
 id, title, service_id
 )
 `)
 .eq("customer_id", identity.id)
 .eq("status", "active")
 .gt("remaining_credits", 0)
 .gt("expires_at", new Date().toISOString())
 .eq("service_packages.service_id", service_id);

 if (error) {
 console.error("[booking.functions] listMyPassesForService error:", error);
 return [];
 }

 return passes || [];
 } catch {
 return [];
 }
 });

/**
 * Lista todos os agendamentos do cliente logado (Próximos ou Histórico).
 */
export const listCustomerAppointments = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 status: z.enum(["all", "upcoming", "past"]).default("all").optional(),
 })
 .optional(),
 )
 .handler(async ({ data: params }) => {
 try {
 const identity = await getServerIdentity();
 if (!identity?.id) return [];

 const db = getServerClient();
 let query = db
 .from("booking_appointments")
 .select(`
 id, scheduled_at, status, notes, guest_name, guest_phone, pass_id, created_at,
 booking_services (
 id, title, duration_minutes, price_cents, category
 ),
 stores (
 id, name, slug, avatar_url, settings
 )
 `)
 .eq("customer_id", identity.id)
 .order("scheduled_at", { ascending: params?.status === "past" ? false : true });

 const now = new Date().toISOString();
 if (params?.status === "upcoming") {
 query = query.gte("scheduled_at", now);
 } else if (params?.status === "past") {
 query = query.lt("scheduled_at", now);
 }

 const { data, error } = await query;
 if (error) {
 console.error("[booking.functions] listCustomerAppointments error:", error);
 return [];
 }

 return data || [];
 } catch (e) {
 console.error("[booking.functions] listCustomerAppointments caught error:", e);
 return [];
 }
 });

/**
 * Cancela um agendamento do cliente e estorna créditos de pacotes se aplicável.
 */
export const cancelCustomerAppointment = createServerFn({ method: "POST" })
 .validator(z.object({ appointmentId: z.string().uuid(), reason: z.string().optional() }))
 .handler(async ({ data: { appointmentId, reason } }) => {
 try {
 const identity = await getServerIdentity();
 if (!identity?.id) throw new Error("Não autorizado.");

 const db = getServerClient();

 // Busca o agendamento pertencente ao cliente
 const { data: appt, error: fetchErr } = await db
 .from("booking_appointments")
 .select("id, status, scheduled_at, pass_id, customer_id")
 .eq("id", appointmentId)
 .eq("customer_id", identity.id)
 .single();

 if (fetchErr || !appt) {
 throw new Error("Agendamento não encontrado.");
 }

 if (appt.status === "cancelled") {
 return { success: true, message: "Agendamento já estava cancelado." };
 }

 // Atualiza o status para cancelado
 const { error: updateErr } = await db
 .from("booking_appointments")
 .update({
 status: "cancelled",
 notes: reason ? `Cancelado pelo cliente: ${reason}` : "Cancelado pelo cliente",
 updated_at: new Date().toISOString(),
 })
 .eq("id", appointmentId);

 if (updateErr) throw updateErr;

 // Se foi agendado com passe de sessões (pass_id), estorna 1 crédito
 if (appt.pass_id) {
 const { data: passRow } = await db
 .from("customer_service_passes")
 .select("id, remaining_credits, total_credits")
 .eq("id", appt.pass_id)
 .single();

 if (passRow) {
 const restoredBalance = Math.min(passRow.total_credits, passRow.remaining_credits + 1);
 await db
 .from("customer_service_passes")
 .update({
 remaining_credits: restoredBalance,
 status: "active",
 updated_at: new Date().toISOString(),
 })
 .eq("id", appt.pass_id);

 await db.from("service_pass_ledger").insert({
 pass_id: appt.pass_id,
 appointment_id: appt.id,
 movement_type: "session_cancelled_refund",
 credits_delta: 1,
 balance_after: restoredBalance,
 reason: "Reembolso de crédito por cancelamento do agendamento",
 });
 }
 }

 return { success: true, message: "Agendamento cancelado com sucesso." };
 } catch (e: unknown) {
 console.error("[booking.functions] cancelCustomerAppointment error:", e);
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao cancelar agendamento.",
 );
 }
 });

/**
 * Lista serviços de agendamento disponíveis na loja atual ou na comunidade.
 */
export const listBookingServices = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 category: z.string().optional(),
 gender_target: z.string().optional(),
 search: z.string().optional(),
 })
 .optional(),
 )
 .handler(async ({ data: params }) => {
 try {
 const db = getServerClient();
 let query = db
 .from("booking_services")
 .select("*, stores(id, name, slug, settings)")
 .eq("status", "active")
 .order("title");

 if (params?.category && params.category !== "todos") {
 query = query.eq("category", params.category);
 }

 if (params?.gender_target && params.gender_target !== "todos") {
 query = query.or(`gender_target.eq.${params.gender_target},gender_target.eq.unissex,gender_target.eq.todos`);
 }

 if (params?.search && params.search.trim()) {
 const q = `%${params.search.trim()}%`;
 query = query.or(`title.ilike.${q},description.ilike.${q}`);
 }

 const { data, error } = await query;

 if (error) throw error;
 const mappedData = (data || []).map((row: any) => {
 const storeSettings = (row.stores?.settings as any) || {};
 const storeLogo = storeSettings.logoUrl || storeSettings.logo_url || null;
 return {
 ...row,
 stores: row.stores ? {
 ...row.stores,
 avatar_url: storeLogo,
 logo_url: storeLogo,
 } : null,
 };
 });

 return { status: "success" as const, data: mappedData };
 } catch (error: unknown) {
 console.error("[booking.functions] listBookingServices error:", error);
 return { status: "success" as const, data: [] };
 }
 });

/**
 * Busca detalhes canônicos de um serviço por ID para a página de detalhes.
 */
export const getBookingServiceById = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data: { id } }) => {
    try {
      const db = getServerClient();
      const { data: service, error } = await db
        .from("booking_services")
        .select(`
          *,
          stores (
            id, name, slug, avatar_url, settings
          )
        `)
        .eq("id", id)
        .eq("status", "active")
        .maybeSingle();

      if (error || !service) return null;

      const storeSettings = (service.stores?.settings as any) || {};
      const storeLogo = storeSettings.logoUrl || storeSettings.logo_url || null;

      // Buscar pacotes de sessões ativos para este serviço
      const { data: packages } = await db
        .from("service_packages")
        .select("*")
        .eq("service_id", id)
        .eq("status", "active")
        .order("price_cents");

      // Buscar outros serviços relacionados da mesma categoria ou loja
      const { data: related } = await db
        .from("booking_services")
        .select("id, title, price_cents, duration_minutes, image_url, category, stores(id, name, slug)")
        .eq("status", "active")
        .neq("id", id)
        .order("title")
        .limit(4);

      return {
        ...service,
        stores: service.stores ? {
          ...service.stores,
          avatar_url: storeLogo,
          logo_url: storeLogo,
        } : null,
        packages: packages || [],
        relatedServices: related || [],
      };
    } catch (err: unknown) {
      console.error("[booking.functions] getBookingServiceById error:", err);
      return null;
    }
  });

/**
 * Busca horários disponíveis para um serviço em uma data específica.
 * Horários baseados nos Working Hours configurados pela loja (sem fallback hardcoded).
 */
export const getAvailableSlots = createServerFn({ method: "GET" })
  .validator(z.object({ service_id: z.string().uuid(), date: z.string() }))
  .handler(async ({ data: { service_id, date } }) => {
    try {
      const db = getServerClient();

      // 1. Buscar serviço para saber a duração e loja
      const { data: service, error: sErr } = await db
        .from("booking_services")
        .select("id, duration_minutes, store_id")
        .eq("id", service_id)
        .single();

      if (sErr || !service) throw new Error("Serviço não encontrado.");

      const tenantStoreId = await resolveTenantStoreId();
      const storeId = service.store_id || tenantStoreId;
      if (!storeId) throw new Error("Loja não encontrada no contexto.");

      // 2. Buscar agendamentos existentes do dia
      const startOfDay = new Date(`${date}T00:00:00.000Z`);
      const endOfDay = new Date(`${date}T23:59:59.999Z`);

      const { data: existing, error: apptErr } = await db
        .from("booking_appointments")
        .select("scheduled_at, booking_services(duration_minutes)")
        .eq("store_id", storeId)
        .neq("status", "cancelled")
        .gte("scheduled_at", startOfDay.toISOString())
        .lte("scheduled_at", endOfDay.toISOString());

      if (apptErr) throw apptErr;

      // 3. Buscar intervalos de trabalho reais da loja
      const intervals = await getWorkingIntervalsForDate(storeId, date);

      if (intervals.length === 0) {
        // Loja fechada nesse dia
        return { status: "success" as const, data: [] };
      }

      const duration = service.duration_minutes || 60;
      const slots: string[] = [];

      // 4. Para cada intervalo configurado, calcular slots válidos
      for (const interval of intervals) {
        const [fromH, fromM] = interval.from.split(":").map(Number);
        const [toH, toM] = interval.to.split(":").map(Number);
        const intervalEndMinutes = toH * 60 + toM;

        let currentMinutes = fromH * 60 + fromM;

        while (currentMinutes + duration <= intervalEndMinutes) {
          const h = Math.floor(currentMinutes / 60);
          const m = currentMinutes % 60;
          const slotTime = new Date(
            `${date}T${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:00.000Z`,
          );

          const isOccupied = existing?.some((appt: any) => {
            const apptStart = new Date(appt.scheduled_at);
            const apptDuration = appt.booking_services?.duration_minutes || 60;
            const apptEnd = new Date(apptStart.getTime() + apptDuration * 60000);
            const proposedEnd = new Date(slotTime.getTime() + duration * 60000);
            return slotTime < apptEnd && proposedEnd > apptStart;
          });

          if (!isOccupied) {
            slots.push(slotTime.toISOString());
          }

          currentMinutes += duration;
        }
      }

      return { status: "success" as const, data: slots };
    } catch (error: unknown) {
      console.error("[booking.functions] getAvailableSlots error:", error);
      throw new Error(
        (error instanceof Error ? error.message : String(error)) ||
          "Erro ao buscar horários disponíveis.",
      );
    }
  });

/**
 * Cria um novo agendamento.
 */
export const createAppointment = createServerFn({ method: "POST" })
  .validator(createAppointmentSchema)
  .handler(async ({ data: input }) => {
    try {
      const db = getServerClient();

      // 1. Obter store_id a partir do serviço agendado
      const { data: service, error: sErr } = await db
        .from("booking_services")
        .select("id, store_id, title, duration_minutes, price_cents")
        .eq("id", input.service_id)
        .single();

      if (sErr || !service) throw new Error("Serviço não encontrado.");

      const tenantStoreId = await resolveTenantStoreId();
      const storeId = service.store_id || tenantStoreId;
      if (!storeId) throw new Error("Loja não encontrada no contexto.");

 // Try to get logged in user (optional)
 let customer_id = null;
 try {
 const identity = await getServerIdentity();
 customer_id = identity?.id || null;
 } catch (e) {
 // Guest user
 }

 let apptStatus = "pending";
 let passRow: any = null;

 if (input.pass_id) {
 // Debita 1 crédito do passe do cliente
 const { data: pData } = await db
 .from("customer_service_passes")
 .select("id, remaining_credits")
 .eq("id", input.pass_id)
 .single();

 passRow = pData;
 if (passRow && passRow.remaining_credits > 0) {
 const newBalance = passRow.remaining_credits - 1;
 await db
 .from("customer_service_passes")
 .update({
 remaining_credits: newBalance,
 status: newBalance === 0 ? "exhausted" : "active",
 updated_at: new Date().toISOString(),
 })
 .eq("id", input.pass_id);

 apptStatus = "confirmed";
 }
 }

 const { data, error } = await db
 .from("booking_appointments")
 .insert({
 store_id: storeId,
 service_id: input.service_id,
 customer_id,
 guest_name: input.guest_name,
 guest_phone: input.guest_phone,
 scheduled_at: input.scheduled_at,
 notes: input.notes,
 pass_id: input.pass_id || null,
 status: apptStatus,
 })
 .select()
 .single();

 if (error) throw error;

 if (input.pass_id && data && passRow) {
 // Grava no ledger de auditoria
 await db.from("service_pass_ledger").insert({
 pass_id: input.pass_id,
 appointment_id: data.id,
 movement_type: "session_booked",
 credits_delta: -1,
 balance_after: Math.max(0, passRow.remaining_credits - 1),
 reason: `Agendamento confirmado para ${input.scheduled_at}`,
 });
 }

 return { status: "success" as const, data };
 } catch (error: unknown) {
 console.error("[booking.functions] createAppointment error:", error);
 throw new Error(
 (error instanceof Error ? error.message : String(error)) || "Erro ao criar agendamento.",
 );
 }
 });

// --- ADMIN FUNCTIONS ---

export const listResources = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin"]);
 const storeId = await resolveTenantStoreId();
 if (!storeId) throw new Error("Loja não encontrada no contexto.");

 const db = getServerClient();
 const { data, error } = await db
 .from("booking_resources")
 .select(
 `
 id, name, resource_type, capacity, status,
 booking_resource_availabilities (
 id, day_of_week, start_time, end_time
 )
 `,
 )
 .eq("store_id", storeId)
 .order("name", { ascending: true });

 if (error) throw error;
 return { status: "success" as const, data: data || [] };
 } catch (error: unknown) {
 console.error("[booking.functions] listResources error:", error);
 throw new Error(
 (error instanceof Error ? error.message : String(error)) || "Erro ao listar recursos.",
 );
 }
});

export const saveResource = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid().optional(),
 name: z.string().min(1),
 resource_type: z.enum(["person", "room", "equipment"]),
 capacity: z.number().int().min(1).default(1),
 status: z.enum(["active", "inactive"]).default("active"),
 availabilities: z.array(
 z.object({
 day_of_week: z.number().int().min(0).max(6),
 start_time: z.string(),
 end_time: z.string(),
 }),
 ),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin"]);
 const storeId = await resolveTenantStoreId();
 if (!storeId) throw new Error("Loja não encontrada no contexto.");

 const db = getServerClient();
 let resourceId = input.id;

 if (!resourceId) {
 const { data, error } = await db
 .from("booking_resources")
 .insert({
 store_id: storeId,
 name: input.name,
 resource_type: input.resource_type,
 capacity: input.capacity,
 status: input.status,
 })
 .select("id")
 .single();

 if (error || !data) throw error || new Error("Falha ao criar recurso");
 resourceId = data.id;
 } else {
 const { error } = await db
 .from("booking_resources")
 .update({
 name: input.name,
 resource_type: input.resource_type,
 capacity: input.capacity,
 status: input.status,
 })
 .eq("id", resourceId)
 .eq("store_id", storeId);

 if (error) throw error;
 }

 await db.from("booking_resource_availabilities").delete().eq("resource_id", resourceId);

 if (input.availabilities.length > 0) {
 const { error: vErr } = await db.from("booking_resource_availabilities").insert(
 input.availabilities.map((a: any) => ({
 resource_id: resourceId,
 day_of_week: a.day_of_week,
 start_time: a.start_time,
 end_time: a.end_time,
 })),
 );
 if (vErr) throw vErr;
 }

 return { status: "success" as const, data: { id: resourceId } };
 } catch (e: unknown) {
 console.error("[booking] saveResource error:", e);
 throw new Error("Erro ao salvar recurso.");
 }
 });

export const deleteResource = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data: input }) => {
    try {
      const identity = await getServerIdentity();
      assertStoreAccess(identity, ["owner", "admin"]);
      const storeId = await resolveTenantStoreId();
      if (!storeId) throw new Error("Loja não encontrada no contexto.");

      const db = getServerClient();
      await db.from("booking_resource_availabilities").delete().eq("resource_id", input.id);
      const { error } = await db
        .from("booking_resources")
        .delete()
        .eq("id", input.id)
        .eq("store_id", storeId);

      if (error) throw error;

      return { status: "success" as const };
    } catch (e: unknown) {
      console.error("[booking] deleteResource error:", e);
      throw new Error("Erro ao excluir recurso.");
    }
  });

export const listAppointments = createServerFn({ method: "GET" })
 .validator(
 z.object({ date_from: z.string().optional(), date_to: z.string().optional() }).optional(),
 )
 .handler(async ({ data: input }) => {
 try {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin"]);
 const storeId = await resolveTenantStoreId();
 if (!storeId) throw new Error("Loja não encontrada no contexto.");

 const db = getServerClient();

 let query = db
 .from("booking_appointments")
 .select(
 `
 id, scheduled_at, duration_minutes, status, guest_name, guest_phone,
 booking_services(title),
 booking_resources(name)
 `,
 )
 .eq("store_id", storeId)
 .order("scheduled_at", { ascending: true });

 if (input?.date_from) {
 query = query.gte("scheduled_at", input.date_from);
 }
 if (input?.date_to) {
 query = query.lte("scheduled_at", input.date_to);
 }

 const { data, error } = await query;
 if (error) throw error;
 return { status: "success" as const, data: data || [] };
 } catch (e: unknown) {
 console.error("[booking] listAppointments error:", e);
 throw new Error("Erro ao listar agendamentos.");
 }
 });

export const getBookingService = createServerFn({ method: "GET" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 try {
 const db = getServerClient();
 const { data, error } = await db
 .from("booking_services")
 .select("*")
 .eq("id", id)
 .single();

 if (error) throw error;
 return { status: "success" as const, data };
 } catch (e: unknown) {
 console.error("[booking] getBookingService error:", e);
 throw new Error("Serviço não encontrado.");
 }
 });

export const upsertBookingService = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid().optional(),
 title: z.string().min(2, "Título é obrigatório"),
 description: z.string().optional().nullable(),
 duration_minutes: z.number().int().min(5, "Duração mínima é 5 minutos"),
 price_cents: z.number().int().min(0),
 category: z.string().optional().nullable(),
 gender_target: z.string().optional().nullable(),
 image_url: z.string().optional().nullable(),
 cover_url: z.string().optional().nullable(),
 status: z.enum(["active", "archived"]).default("active"),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);
 const storeId = await resolveTenantStoreId();
 if (!storeId) throw new Error("Loja não encontrada no contexto.");

 const db = getServerClient();
 const finalImage = input.cover_url || input.image_url || null;

 if (input.id) {
 // Update
 const { data, error } = await db
 .from("booking_services")
 .update({
 title: input.title,
 description: input.description ?? null,
 duration_minutes: input.duration_minutes,
 price_cents: input.price_cents,
 category: input.category ?? null,
 gender_target: input.gender_target ?? null,
 image_url: finalImage,
 status: input.status,
 updated_at: new Date().toISOString(),
 })
 .eq("id", input.id)
 .eq("store_id", storeId)
 .select()
 .single();

 if (error) throw error;
 return { status: "success" as const, data };
 } else {
 // Insert
 const { data, error } = await db
 .from("booking_services")
 .insert({
 store_id: storeId,
 title: input.title,
 description: input.description ?? null,
 duration_minutes: input.duration_minutes,
 price_cents: input.price_cents,
 category: input.category ?? null,
 gender_target: input.gender_target ?? null,
 image_url: finalImage,
 status: input.status,
 })
 .select()
 .single();

 if (error) throw error;
 return { status: "success" as const, data };
 }
 } catch (e: unknown) {
 console.error("[booking] upsertBookingService error:", e);
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao salvar serviço.",
 );
 }
 });

export const deleteBookingService = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 try {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);
 const storeId = await resolveTenantStoreId();
 if (!storeId) throw new Error("Loja não encontrada no contexto.");

 const db = getServerClient();
 const { error } = await db
 .from("booking_services")
 .update({ status: "archived", updated_at: new Date().toISOString() })
 .eq("id", id)
 .eq("store_id", storeId);

 if (error) throw error;
 return { status: "success" as const };
 } catch (e: unknown) {
 console.error("[booking] deleteBookingService error:", e);
 throw new Error("Erro ao arquivar serviço.");
 }
 });

export const updateAppointmentStatus = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 status: z.enum([
 "pending",
 "confirmed",
 "cancelled",
 "completed",
 "checked_in",
 "no_show",
 "in_service",
 ]),
 }),
 )
 .handler(async ({ data: { id, status } }) => {
  try {
   const identity = await getServerIdentity();
   assertStoreAccess(identity, ["owner", "admin", "manager", "professional"]);
   const storeId = await resolveTenantStoreId();

   const db = getServerClient();

   // Se for cancelado, estorno automático do passe de sessões se houver pass_id
   if (status === "cancelled") {
    const { data: appt } = await db
     .from("booking_appointments")
     .select("id, pass_id, status")
     .eq("id", id)
     .eq("store_id", storeId)
     .maybeSingle();

    if (appt && appt.status !== "cancelled" && appt.pass_id) {
     const { data: passRow } = await db
      .from("customer_service_passes")
      .select("id, remaining_credits, total_credits")
      .eq("id", appt.pass_id)
      .maybeSingle();

     if (passRow) {
      const restoredBalance = Math.min(passRow.total_credits, passRow.remaining_credits + 1);
      await db
       .from("customer_service_passes")
       .update({
        remaining_credits: restoredBalance,
        status: "active",
        updated_at: new Date().toISOString(),
       })
       .eq("id", appt.pass_id);

      await db.from("service_pass_ledger").insert({
       pass_id: appt.pass_id,
       appointment_id: appt.id,
       movement_type: "session_cancelled_refund",
       credits_delta: 1,
       balance_after: restoredBalance,
       reason: "Reembolso automático de crédito por cancelamento do agendamento pela recepção",
      });
     }
    }
   }

   const { error } = await db
    .from("booking_appointments")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("store_id", storeId);

   if (error) throw error;
   return { success: true };
  } catch (e: unknown) {
   console.error("[booking] updateAppointmentStatus error:", e);
   throw new Error("Erro ao atualizar status do agendamento.");
  }
 });

export const addClinicalRecord = createServerFn({ method: "POST" })
 .validator(
 z.object({
 appointment_id: z.string().uuid(),
 record_type: z.enum(["anamnesis", "evolution", "allergy_warning", "general_note"]),
 content: z.string().min(1),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "professional"]);
 const storeId = await resolveTenantStoreId();

 const db = getServerClient();

 // First get the customer_id from the appointment
 const { data: appt, error: apptErr } = await db
 .from("booking_appointments")
 .select("customer_id")
 .eq("id", input.appointment_id)
 .single();

 if (apptErr) throw apptErr;

 // If customer_id is null (guest booking), we might need to handle it.
 // But the schema says customer_id is NOT NULL for clinical records.
 // Wait, guest bookings might not have customer_id.
 // Let's check `booking_engine_v4.sql`.
 // `customer_id UUID NOT NULL REFERENCES auth.users(id)`
 // If it's a guest, the UI should warn that clinical records need registered users, or we use a fallback.
 if (!appt.customer_id) {
 throw new Error("Não é possível criar prontuário para cliente não cadastrado na base.");
 }

 const { data, error } = await db
 .from("crm_clinical_records")
 .insert({
 store_id: storeId,
 customer_id: appt.customer_id,
 appointment_id: input.appointment_id,
 author_id: identity.id,
 record_type: input.record_type,
 content: input.content,
 })
 .select()
 .single();

 if (error) throw error;
 return { success: true, data };
 } catch (e: unknown) {
 console.error("[booking] addClinicalRecord error:", e);
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao adicionar prontuário.",
 );
 }
 });

export const listClinicalRecords = createServerFn({ method: "GET" })
 .validator(z.object({ appointment_id: z.string().uuid() }))
 .handler(async ({ data: { appointment_id } }) => {
 try {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "professional"]);
 const storeId = await resolveTenantStoreId();

 const db = getServerClient();
 const { data, error } = await db
 .from("crm_clinical_records")
 .select("*, author:author_id(email, raw_user_meta_data)")
 .eq("appointment_id", appointment_id)
 .eq("store_id", storeId)
 .order("created_at", { ascending: false });

 if (error) throw error;
 return { success: true, data: data || [] };
 } catch (e: unknown) {
 console.error("[booking] listClinicalRecords error:", e);
 throw new Error("Erro ao listar prontuários.");
 }
 });
