/**
 * telemetry-affinity.functions.ts — BFF para Telemetria Comportamental e Algoritmo de Afinidade
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/start-server-core";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getCurrentIdentity } from "@/services/cart-helpers";
import { captureRequestTelemetry } from "@/lib/network-telemetry.server";

export interface UserAffinityDTO {
 niche: string;
 total_score: number;
 interaction_count: number;
 last_interacted_at: string;
}

export const recordUserBehavior = createServerFn({ method: "POST" })
 .validator(
 z.object({
 sessionId: z.string().optional(),
 eventType: z.enum([
 "view_item",
 "search",
 "click_banner",
 "click_whatsapp",
 "add_to_cart",
 "quote_request",
 "booking_complete",
 "order_complete",
 ]),
 entityType: z.enum([
 "product",
 "store",
 "classified",
 "job",
 "tourism",
 "directory",
 "service",
 ]),
 entityId: z.string().uuid().optional(),
 categorySlug: z.string().optional(),
 niche: z.string().optional(),
 metadata: z.record(z.any()).optional(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity().catch(() => null);

 const userId = identity?.customer_id || null;
 const sessionId = data.sessionId || (userId ? null : "anon_session");

 let req: Request | null = null;
    try { req = getRequest(); } catch {}
    const telemetry = req ? captureRequestTelemetry(req) : null;
    const enrichedMetadata = {
      ...(data.metadata || {}),
      ...(telemetry ? {
        client_ip: telemetry.ip,
        device_name: telemetry.deviceName,
        device_type: telemetry.deviceType,
        geo: {
          city: telemetry.geo.city,
          state: telemetry.geo.state,
          country: telemetry.geo.country,
          source: telemetry.geo.source,
        },
      } : {}),
    };

    const { data: res, error } = await supabase.rpc("record_user_behavior_event", {
 p_user_id: userId,
 p_session_id: sessionId,
 p_event_type: data.eventType,
 p_entity_type: data.entityType,
 p_entity_id: data.entityId || null,
 p_category_slug: data.categorySlug || null,
 p_niche: data.niche || "geral",
 p_metadata: enrichedMetadata,
 });

 if (error) {
 console.warn("[telemetry] Erro ao registrar telemetria comportamental:", error);
 return { success: false };
 }

 return { success: true, result: res };
 });

export const getUserTopAffinities = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 sessionId: z.string().optional(),
 limit: z.number().int().min(1).max(10).optional().default(3),
 })
 .optional(),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity().catch(() => null);

 const userId = identity?.customer_id || null;
 const sessionId = data?.sessionId || (userId ? null : "anon_session");

 const { data: rows, error } = await supabase.rpc("get_user_top_affinities", {
 p_user_id: userId,
 p_session_id: sessionId,
 p_limit: data?.limit || 3,
 });

 if (error) {
 console.warn("[telemetry] Erro ao buscar afinidades do usuário:", error);
 return [];
 }

 return (rows || []).map((r: any) => ({
 niche: r.niche,
 total_score: Number(r.total_score || 0),
 interaction_count: Number(r.interaction_count || 0),
 last_interacted_at: r.last_interacted_at,
 })) as UserAffinityDTO[];
 });

export const reconcileTelemetryIdentity = createServerFn({ method: "POST" })
 .validator(
 z.object({
 sessionId: z.string().min(1),
 userId: z.string().uuid().optional().nullable(),
 customerId: z.string().uuid().optional().nullable(),
 })
 )
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const { data, error } = await (supabase.rpc as any)("reconcile_behavioral_telemetry_identity", {
 p_session_id: input.sessionId,
 p_user_id: input.userId || null,
 p_customer_id: input.customerId || null,
 });

 if (error) {
 console.warn("[telemetry] Erro ao reconciliar identidade comportamental:", error);
 return { success: false, error: error.message };
 }

 return { success: true, result: data };
 });



export const linkEventInteractionToCrmFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      eventId: z.string().uuid(),
      storeId: z.string().uuid(),
      fullName: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      interactionType: z.enum(["rsvp", "ticket_buy", "question"]).default("rsvp"),
      metadata: z.record(z.any()).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getCurrentIdentity().catch(() => null);

    let req: Request | null = null;
    try { req = getRequest(); } catch {}
    const telemetry = req ? captureRequestTelemetry(req) : null;
    const enrichedMetadata = {
      ...(data.metadata || {}),
      ...(telemetry ? {
        client_ip: telemetry.ip,
        device_name: telemetry.deviceName,
        device_type: telemetry.deviceType,
        geo: {
          city: telemetry.geo.city,
          state: telemetry.geo.state,
          country: telemetry.geo.country,
          source: telemetry.geo.source,
        },
      } : {}),
    };

    const { data: res, error } = await supabase.rpc("link_event_interaction_to_crm", {
      p_event_id: data.eventId,
      p_store_id: data.storeId,
      p_user_id: identity?.customer_id || null,
      p_full_name: data.fullName || null,
      p_email: data.email || null,
      p_phone: data.phone || null,
      p_interaction_type: data.interactionType,
      p_metadata: enrichedMetadata,
    });

    if (error) {
      console.warn("[telemetry] Erro ao sincronizar evento com CRM:", error);
      return { success: false, error: error.message };
    }

    return res as { success: boolean; lead_id?: string; customer_id?: string; event_id?: string };
  });
