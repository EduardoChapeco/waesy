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

 return deal;
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
