import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getIdentity } from "./identity.functions";

export const createDealProposal = createServerFn({ method: "POST" })
 .validator(
 z.object({
 classifiedId: z.string().uuid().optional(),
 sellerId: z.string().uuid(),
 proposedPriceCents: z.number().int().min(0),
 depositCents: z.number().int().min(0).optional().default(0),
 installmentsCount: z.number().int().min(1).max(60).optional().default(1),
 dealType: z.enum(["sale", "rental", "service", "trade", "travel"]).default("sale"),
 terms: z.string().optional(),
 startDate: z.string().optional(),
 endDate: z.string().optional(),
 nightsCount: z.number().int().min(1).optional(),
 dailyRateCents: z.number().int().min(0).optional(),
 cleaningFeeCents: z.number().int().min(0).optional(),
 totalPriceCents: z.number().int().min(0).optional(),
 guestsCount: z.number().int().min(1).optional(),
 isDirectBooking: z.boolean().optional().default(false),
 }),
 )
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getIdentity();
 if (!identity?.id) throw new Error("Não autenticado");

 if (identity.id === input.sellerId) {
 throw new Error("Você não pode enviar uma proposta para o seu próprio anúncio.");
 }

 const isDirect = input.isDirectBooking || false;
 const initialStatus = isDirect ? "accepted" : "negotiating";

 const { data: deal, error } = await supabase
 .from("deals")
 .insert({
 classified_id: input.classifiedId,
 buyer_id: identity.id,
 seller_id: input.sellerId,
 proposed_price_cents: input.totalPriceCents || input.proposedPriceCents,
 deposit_cents: input.depositCents,
 installments_count: input.installmentsCount,
 deal_type: input.dealType === "travel" ? "sale" : input.dealType,
 terms: input.terms,
 start_date: input.startDate ? new Date(input.startDate).toISOString() : null,
 end_date: input.endDate ? new Date(input.endDate).toISOString() : null,
 nights_count: input.nightsCount || 1,
 daily_rate_cents: input.dailyRateCents || null,
 cleaning_fee_cents: input.cleaningFeeCents || 0,
 total_price_cents: input.totalPriceCents || input.proposedPriceCents,
 guests_count: input.guestsCount || 1,
 is_direct_booking: isDirect,
 booking_status: isDirect ? "confirmed" : "pending",
 status: initialStatus,
 })
 .select()
 .single();

 if (error) {
 console.error("[deals] Error creating deal proposal:", error);
 throw new Error("Erro ao registrar proposta ou reserva.");
 }

 // Registra evento de proposta ou reserva inicial
 await supabase.from("deal_events").insert({
 deal_id: deal.id,
 sender_id: identity.id,
 event_type: isDirect ? "direct_booking" : "proposal",
 payload: {
 price_cents: input.totalPriceCents || input.proposedPriceCents,
 nights: input.nightsCount,
 start_date: input.startDate,
 end_date: input.endDate,
 guests: input.guestsCount,
 installments: input.installmentsCount,
 terms: input.terms,
 is_direct: isDirect,
 },
 });

 // Abre canal de conversa P2P entre comprador e vendedor automaticamente
 // (idempotente: reutiliza thread existente se já houver um entre os dois)
 try {
 const { data: existingThread } = await supabase
 .from("chat_threads")
 .select("id")
 .or(
 `and(customer_id.eq.${identity.id},recipient_profile_id.eq.${input.sellerId}),and(customer_id.eq.${input.sellerId},recipient_profile_id.eq.${identity.id})`
 )
 .maybeSingle();

 let threadId: string | undefined = existingThread?.id;

 if (!threadId) {
 const { data: newThread } = await supabase
 .from("chat_threads")
 .insert({
 store_id: null,
 customer_id: identity.id,
 recipient_profile_id: input.sellerId,
 thread_type: "direct_p2p",
 subject: `Negociação #${deal.id.slice(0, 6).toUpperCase()}`,
 status: "open",
 })
 .select()
 .single();
 threadId = newThread?.id;
 }

 if (threadId) {
 const priceFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
 (input.totalPriceCents || input.proposedPriceCents) / 100
 );
 const msgText = isDirect
 ? `✅ Reserva confirmada — ${priceFmt}${input.nightsCount ? ` · ${input.nightsCount} noites` : ""}${input.startDate ? ` · Check-in: ${input.startDate}` : ""}`
 : `🤝 Proposta enviada — ${priceFmt}${input.installmentsCount && input.installmentsCount > 1 ? ` em ${input.installmentsCount}x` : " à vista"}${input.terms ? `\n"${input.terms.slice(0, 120)}"` : ""}`;

 await supabase.from("chat_messages").insert({
 thread_id: threadId,
 message: msgText,
 message_type: "text",
 payload: { deal_id: deal.id, classified_id: input.classifiedId },
 is_staff_reply: false,
 sender_id: identity.id,
 });
 }
 } catch (chatErr) {
 // Erro no chat não deve bloquear a criação do deal — log apenas
 console.warn("[deals] Falha ao criar thread de conversa P2P:", chatErr);
 }

 return { ...deal, chat_thread_id: undefined };
 });

export const respondToDealProposal = createServerFn({ method: "POST" })
 .validator(
 z.object({
 dealId: z.string().uuid(),
 action: z.enum(["accept", "reject", "counter_proposal", "cancel", "confirm_dates", "complete"]),
 counterPriceCents: z.number().int().min(0).optional(),
 message: z.string().optional(),
 }),
 )
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getIdentity();
 if (!identity?.id) throw new Error("Não autenticado");

 const { data: deal, error: fetchErr } = await supabase
 .from("deals")
 .select("*")
 .eq("id", input.dealId)
 .single();

 if (fetchErr || !deal) throw new Error("Negociação não encontrada.");

 if (deal.buyer_id !== identity.id && deal.seller_id !== identity.id) {
 throw new Error("Acesso negado a esta negociação.");
 }

 let nextStatus = deal.status;
 let nextBookingStatus = deal.booking_status;

 if (input.action === "accept" || input.action === "confirm_dates") {
 nextStatus = "accepted";
 nextBookingStatus = "confirmed";
 } else if (input.action === "reject") {
 nextStatus = "rejected";
 nextBookingStatus = "cancelled";
 } else if (input.action === "cancel") {
 nextStatus = "cancelled";
 nextBookingStatus = "cancelled";
 } else if (input.action === "complete") {
 nextStatus = "completed";
 nextBookingStatus = "completed";
 }

 const updatePayload: Record<string, any> = {
 status: nextStatus,
 booking_status: nextBookingStatus,
 updated_at: new Date().toISOString(),
 };

 if (input.action === "counter_proposal" && input.counterPriceCents !== undefined) {
 updatePayload.proposed_price_cents = input.counterPriceCents;
 }

 const { data: updatedDeal, error: updateErr } = await supabase
 .from("deals")
 .update(updatePayload)
 .eq("id", deal.id)
 .select()
 .single();

 if (updateErr) throw new Error("Erro ao atualizar negociação.");

 // Registra o evento de resposta
 await supabase.from("deal_events").insert({
 deal_id: deal.id,
 sender_id: identity.id,
 event_type: input.action,
 payload: {
 message: input.message,
 counter_price: input.counterPriceCents,
 },
 });

  // Notifica no canal de chat P2P da negociação (Turn 6)
  try {
    const otherPartyId = deal.buyer_id === identity.id ? deal.seller_id : deal.buyer_id;
    const { data: thread } = await supabase
      .from("chat_threads")
      .select("id")
      .or(
        `and(customer_id.eq.${identity.id},recipient_profile_id.eq.${otherPartyId}),and(customer_id.eq.${otherPartyId},recipient_profile_id.eq.${identity.id})`
      )
      .maybeSingle();

    if (thread?.id) {
      let notifText = "";
      if (input.action === "counter_proposal" && input.counterPriceCents) {
        const formatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
          input.counterPriceCents / 100
        );
        notifText = `⚡ Contraproposta: ${formatted}${input.message ? ` — "${input.message}"` : ""}`;
      } else if (input.action === "accept" || input.action === "confirm_dates") {
        notifText = `🎉 Proposta aceita! O acordo foi formalizado na plataforma.`;
      } else if (input.action === "reject") {
        notifText = `❌ Proposta recusada.`;
      } else if (input.action === "complete") {
        notifText = `📦 Recebimento confirmado! Negociação concluída com sucesso.`;
      } else if (input.action === "cancel") {
        notifText = `⚠️ Proposta cancelada.`;
      }

      if (notifText) {
        await supabase.from("chat_messages").insert({
          thread_id: thread.id,
          message: notifText,
          message_type: "text",
          payload: { deal_id: deal.id, action: input.action },
          is_staff_reply: false,
          sender_id: identity.id,
        });
      }
    }
  } catch (chatErr) {
    console.warn("[deals] Falha ao notificar atualização no chat P2P:", chatErr);
  }

 return updatedDeal;
 });

export const getDealsByUser = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getIdentity();
 if (!identity?.id) throw new Error("Não autenticado");

 const { data, error } = await supabase
 .from("deals")
 .select(
 `
 *,
 classified:classified_id (id, title, category, images, location_name),
 buyer:buyer_id (id, full_name, avatar_url),
 seller:seller_id (id, full_name, avatar_url)
 `,
 )
 .or(`buyer_id.eq.${identity.id},seller_id.eq.${identity.id}`)
 .order("updated_at", { ascending: false });

 if (error) {
 console.error("[deals] getDealsByUser error:", error);
 throw new Error("Erro ao listar negociações.");
 }

 return data || [];
});

export const getDealById = createServerFn({ method: "GET" })
 .validator(z.string().uuid())
 .handler(async ({ data: dealId }) => {
 const supabase = getServerClient();
 const identity = await getIdentity();
 if (!identity?.id) throw new Error("Não autenticado");

 const { data: deal, error } = await supabase
 .from("deals")
 .select(
 `
 *,
 classified:classified_id (id, title, category, images, location_name),
 buyer:buyer_id (id, full_name, avatar_url),
 seller:seller_id (id, full_name, avatar_url)
 `,
 )
 .eq("id", dealId)
 .single();

 if (error || !deal) throw new Error("Negociação não encontrada.");

 if (deal.buyer_id !== identity.id && deal.seller_id !== identity.id) {
 throw new Error("Acesso negado.");
 }

 const { data: events } = await supabase
 .from("deal_events")
 .select(
 `
 *,
 sender:sender_id (id, full_name, avatar_url)
 `,
 )
 .eq("deal_id", dealId)
 .order("created_at", { ascending: true });

 return { deal, events: events || [] };
 });

export const getClassifiedBookedDates = createServerFn({ method: "GET" })
  .validator(z.object({ classifiedId: z.string().uuid() }))
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const { data: deals, error } = await supabase
      .from("deals")
      .select("id, start_date, end_date, booking_status, status")
      .eq("classified_id", input.classifiedId)
      .in("status", ["accepted", "completed"])
      .gte("end_date", now.toISOString())
      .not("start_date", "is", null)
      .not("end_date", "is", null);

    if (error) {
      console.warn("[deals] Error fetching booked dates:", error);
      return [];
    }

    return (deals || []).map((d: any) => ({
      startDate: d.start_date ? d.start_date.split("T")[0] : "",
      endDate: d.end_date ? d.end_date.split("T")[0] : "",
    }));
  });
