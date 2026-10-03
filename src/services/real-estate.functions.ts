/**
 * real-estate.functions.ts — BFF para o Módulo de Imóveis & Chamados de Manutenção
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getCurrentIdentity } from "@/services/cart-helpers";

export interface PropertyMaintenanceDTO {
 id: string;
 property_id: string;
 property_title?: string;
 tenant_profile_id?: string | null;
 landlord_profile_id?: string | null;
 title: string;
 category: "hidraulica" | "eletrica" | "alvenaria" | "pintura" | "eletrodomesticos" | "telhado" | "outros";
 urgency: "baixa" | "media" | "alta" | "emergencia";
 description: string;
 photos: string[];
 status: "open" | "in_review" | "quote_approved" | "in_progress" | "resolved" | "cancelled";
 estimated_cost_cents?: number | null;
 resolved_at?: string | null;
 admin_notes?: string | null;
 created_at: string;
}

export const listPropertyMaintenanceRequests = createServerFn({ method: "GET" })
 .validator(z.object({ propertyId: z.string().uuid().optional() }).optional())
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity();

 if (!identity.customer_id) {
 return [];
 }

 let query = supabase
 .from("property_maintenance_requests")
 .select("*, classifieds(id, title)")
 .order("created_at", { ascending: false });

 if (data?.propertyId) {
 query = query.eq("property_id", data.propertyId);
 }

 const { data: rows, error } = await query;

 if (error) {
 console.error("Erro ao listar chamados de manutenção:", error);
 return [];
 }

 return (rows || []).map((row: any) => ({
 id: row.id,
 property_id: row.property_id,
 property_title: row.classifieds?.title || "Imóvel",
 tenant_profile_id: row.tenant_profile_id,
 landlord_profile_id: row.landlord_profile_id,
 title: row.title,
 category: row.category,
 urgency: row.urgency,
 description: row.description,
 photos: row.photos || [],
 status: row.status,
 estimated_cost_cents: row.estimated_cost_cents ? Number(row.estimated_cost_cents) : null,
 resolved_at: row.resolved_at,
 admin_notes: row.admin_notes,
 created_at: row.created_at,
 })) as PropertyMaintenanceDTO[];
 });

export const createMaintenanceRequest = createServerFn({ method: "POST" })
 .validator(
 z.object({
 propertyId: z.string().uuid(),
 title: z.string().min(3, "Título muito curto"),
 category: z.enum([
 "hidraulica",
 "eletrica",
 "alvenaria",
 "pintura",
 "eletrodomesticos",
 "telhado",
 "outros",
 ]),
 urgency: z.enum(["baixa", "media", "alta", "emergencia"]),
 description: z.string().min(10, "Descreva detalhadamente o problema"),
 photos: z.array(z.string().url()).optional(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity();

 if (!identity.customer_id) {
 throw new Error("Você precisa estar logado para abrir um chamado.");
 }

 const { data: created, error } = await supabase
 .from("property_maintenance_requests")
 .insert({
 property_id: data.propertyId,
 tenant_profile_id: identity.customer_id,
 title: data.title.trim(),
 category: data.category,
 urgency: data.urgency,
 description: data.description.trim(),
 photos: data.photos || [],
 status: "open",
 })
 .select("id")
 .single();

 if (error) {
 console.error("Erro ao criar chamado de manutenção:", error);
 throw new Error("Não foi possível registrar o chamado de manutenção.");
 }

 return {
 success: true,
 requestId: created.id,
 message: "Chamado de manutenção aberto com sucesso!",
 };
 });

export const resolveMaintenanceRequest = createServerFn({ method: "POST" })
 .validator(
 z.object({
 requestId: z.string().uuid(),
 status: z.enum([
 "open",
 "in_progress",
 "in_review",
 "quote_approved",
 "resolved",
 "cancelled",
 ]),
 estimatedCostCents: z.number().int().min(0).optional().nullable(),
 adminNotes: z.string().optional().nullable(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getCurrentIdentity();

 if (!identity.customer_id) {
 throw new Error("Não autorizado.");
 }

 const updatePayload: Record<string, any> = {
 status: data.status,
 updated_at: new Date().toISOString(),
 };

 if (data.adminNotes !== undefined) updatePayload.admin_notes = data.adminNotes;
 if (data.estimatedCostCents !== undefined) updatePayload.estimated_cost_cents = data.estimatedCostCents;
 if (data.status === "resolved") updatePayload.resolved_at = new Date().toISOString();

 const { data: updated, error } = await supabase
 .from("property_maintenance_requests")
 .update(updatePayload)
 .eq("id", data.requestId)
 .select("id, status")
 .single();

 if (error) {
 console.error("Erro ao atualizar chamado:", error);
 throw new Error("Não foi possível atualizar o chamado.");
 }

 return { success: true, request: updated };
 });

export const updateMaintenanceRequestStatus = resolveMaintenanceRequest;

export interface StorePropertyItemDTO {
  id: string;
  title: string;
  location_name?: string | null;
  deal_type?: string | null;
}

export const listStoreProperties = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getServerClient();
    const { getServerIdentity } = await import("@/lib/server-access");
    const serverIdentity = await getServerIdentity().catch(() => null);
    const cartIdentity = await getCurrentIdentity().catch(() => null);

    const storeId = serverIdentity?.store_id;
    const customerId = serverIdentity?.user_id || cartIdentity?.customer_id;

    if (!storeId && !customerId) {
      return [];
    }

    let query = supabase
      .from("classifieds")
      .select("id, title, location_name, deal_type")
      .eq("category", "real_estate")
      .order("created_at", { ascending: false })
      .limit(50);

    if (storeId) {
      query = query.eq("store_id", storeId);
    } else if (customerId) {
      query = query.eq("author_profile_id", customerId);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("Erro ao listar imóveis da loja:", error);
      return [];
    }

    return (rows || []) as StorePropertyItemDTO[];
  });

