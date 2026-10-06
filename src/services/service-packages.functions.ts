/**
 * BFF Server Functions para Pacotes de Serviços, Passes de Aulas e Multi-Agenda
 * Conectado às tabelas service_packages, customer_service_passes, service_pass_ledger
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { resolveTenantStoreId } from "@/lib/server-access";

// --- SCHEMAS ---

export const ServicePackageSchema = z.object({
 id: z.string().uuid().optional(),
 service_id: z.string().uuid(),
 title: z.string().min(2, "Título é obrigatório"),
 description: z.string().nullable().optional(),
 total_credits: z.number().int().min(1, "Deve ter pelo menos 1 crédito/sessão"),
 price_cents: z.number().int().min(0, "Preço inválido"),
 validity_days: z.number().int().min(1).default(30),
 is_recurring: z.boolean().default(false),
 recurrence_interval: z.enum(["weekly", "biweekly", "monthly"]).default("monthly"),
 max_reschedules_per_credit: z.number().int().default(2),
 is_active: z.boolean().default(true),
});

export const BookWithPassSchema = z.object({
 pass_id: z.string().uuid(),
 scheduled_at: z.string().datetime(),
 resource_id: z.string().uuid().optional(),
 guest_name: z.string().optional(),
 guest_phone: z.string().optional(),
 notes: z.string().optional(),
});

// --- SERVER FUNCTIONS ---

/**
 * Lista pacotes públicos de serviços/aulas disponíveis em uma loja.
 */
export const listPublicStorePackages = createServerFn({ method: "GET" })
 .validator(z.object({ store_id: z.string().uuid().optional() }).optional())
 .handler(async ({ data }) => {
 try {
 const supabase = getServerClient();
 let storeId = data?.store_id;

 if (!storeId) {
 const resolved = await resolveTenantStoreId().catch(() => null);
 storeId = resolved || undefined;
 }

 let query = supabase
 .from("service_packages")
 .select(
 `
 id,
 title,
 description,
 total_credits,
 price_cents,
 validity_days,
 is_recurring,
 recurrence_interval,
 is_active,
 booking_services (
 id,
 title,
 duration_minutes,
 price_cents
 ),
 stores (
 id,
 name,
 slug,
 avatar_url
 )
 `,
 )
 .eq("is_active", true)
 .order("price_cents", { ascending: true });

 if (storeId) {
 query = query.eq("store_id", storeId);
 }

 const { data: rows, error } = await query;
 if (error) throw error;
 return rows || [];
 } catch (e: any) {
 console.error("[service-packages] listPublicStorePackages error:", e);
 return [];
 }
 });

/**
 * Retorna todos os passes e pacotes ativos do cliente logado.
 */
export const getMyCustomerPasses = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const identity = await getServerIdentity();
 if (!identity?.id) return [];

 const supabase = getServerClient();
 const { data: passes, error } = await supabase
 .from("customer_service_passes")
 .select(
 `
 id,
 total_credits,
 remaining_credits,
 expires_at,
 status,
 auto_renew,
 created_at,
 service_packages (
 id,
 title,
 description,
 validity_days,
 booking_services (
 id,
 title,
 duration_minutes
 )
 ),
 stores (
 id,
 name,
 slug,
 avatar_url
 ),
 service_pass_ledger (
 id,
 movement_type,
 credits_delta,
 balance_after,
 reason,
 created_at
 )
 `,
 )
 .eq("customer_id", identity.id)
 .order("created_at", { ascending: false });

 if (error) throw error;
 return passes || [];
 } catch (e: any) {
 console.error("[service-packages] getMyCustomerPasses error:", e);
 return [];
 }
});

/**
 * Workspace: Lista todos os pacotes configurados na loja.
 */
export const listWorkspacePackages = createServerFn({ method: "GET" }).handler(async () => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);
 const storeId = identity.store_id || (await resolveTenantStoreId());
 if (!storeId) throw new Error("Loja não selecionada.");

 const supabase = getServerClient();
 const { data: packages, error } = await supabase
 .from("service_packages")
 .select(
 `
 *,
 booking_services (
 id,
 title,
 duration_minutes,
 price_cents
 )
 `,
 )
 .eq("store_id", storeId)
 .order("created_at", { ascending: false });

 if (error) throw new Error(error.message);
 return packages || [];
});

/**
 * Workspace: Salva (cria ou atualiza) um pacote de serviços.
 */
export const saveServicePackage = createServerFn({ method: "POST" })
 .validator(ServicePackageSchema)
 .handler(async ({ data: input }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);
 const storeId = identity.store_id || (await resolveTenantStoreId());
 if (!storeId) throw new Error("Loja não selecionada.");

 const supabase = getServerClient();
 const payload = {
 store_id: storeId,
 service_id: input.service_id,
 title: input.title.trim(),
 description: input.description || null,
 total_credits: input.total_credits,
 price_cents: input.price_cents,
 validity_days: input.validity_days,
 is_recurring: input.is_recurring,
 recurrence_interval: input.recurrence_interval,
 max_reschedules_per_credit: input.max_reschedules_per_credit,
 is_active: input.is_active,
 updated_at: new Date().toISOString(),
 };

 if (input.id) {
 const { data: updated, error } = await supabase
 .from("service_packages")
 .update(payload)
 .eq("id", input.id)
 .eq("store_id", storeId)
 .select()
 .single();

 if (error) throw new Error(`Erro ao atualizar pacote: ${error.message}`);
 return updated;
 } else {
 const { data: created, error } = await supabase
 .from("service_packages")
 .insert(payload)
 .select()
 .single();

 if (error) throw new Error(`Erro ao criar pacote: ${error.message}`);
 return created;
 }
 });

/**
 * Workspace: Deleta um pacote de serviços.
 */
export const deleteServicePackage = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);
 const storeId = identity.store_id || (await resolveTenantStoreId());
 if (!storeId) throw new Error("Loja não selecionada.");

 const supabase = getServerClient();
 const { error } = await supabase
 .from("service_packages")
 .delete()
 .eq("id", id)
 .eq("store_id", storeId);

 if (error) throw new Error(`Erro ao remover pacote: ${error.message}`);
 return { success: true };
 });

/**
 * Agendamento Atômico utilizando Crédito de Passe.
 */
export const bookAppointmentWithPass = createServerFn({ method: "POST" })
 .validator(BookWithPassSchema)
 .handler(async ({ data: input }) => {
 const identity = await getServerIdentity();
 if (!identity?.id) {
 throw new Error("Você precisa estar autenticado para utilizar seus passes de aulas.");
 }

 const supabase = getServerClient();
 const { data: result, error } = await supabase.rpc("redeem_service_pass_credit", {
 p_pass_id: input.pass_id,
 p_customer_id: identity.id,
 p_scheduled_at: input.scheduled_at,
 p_resource_id: input.resource_id || null,
 p_guest_name: input.guest_name || (identity as any).name || (identity as any).email || null,
 p_guest_phone: input.guest_phone || null,
 p_notes: input.notes || null,
 });

 if (error) {
 throw new Error(`Falha ao agendar sessão: ${error.message}`);
 }

 return result;
 });

/**
 * Cancelamento e Reembolso do Crédito para o Passe do Cliente.
 */
export const cancelAppointmentAndRefundPass = createServerFn({ method: "POST" })
 .validator(z.object({ appointment_id: z.string().uuid(), reason: z.string().optional() }))
 .handler(async ({ data: { appointment_id, reason } }) => {
 const identity = await getServerIdentity();
 if (!identity?.id) {
 throw new Error("Acesso negado.");
 }

 const supabase = getServerClient();
 const { data: result, error } = await supabase.rpc("refund_service_pass_credit", {
 p_appointment_id: appointment_id,
 p_user_id: identity.id,
 p_reason: reason || "Cancelamento de sessão",
 });

 if (error) {
 throw new Error(`Erro ao cancelar agendamento: ${error.message}`);
 }

 return result;
 });

/**
 * Workspace / Staff: Check-in de presença na sessão/aula.
 */
export const checkInAppointment = createServerFn({ method: "POST" })
 .validator(z.object({ appointment_id: z.string().uuid() }))
 .handler(async ({ data: { appointment_id } }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);
 const storeId = identity.store_id || (await resolveTenantStoreId());
 if (!storeId) throw new Error("Loja não encontrada.");

 const supabase = getServerClient();
 const { data: updated, error } = await supabase
 .from("booking_appointments")
 .update({
 check_in_at: new Date().toISOString(),
 check_in_by: identity.id,
 status: "completed",
 updated_at: new Date().toISOString(),
 })
 .eq("id", appointment_id)
 .eq("store_id", storeId)
 .select()
 .single();

 if (error) throw new Error(`Erro ao registrar presença: ${error.message}`);
 return updated;
 });

/**
 * Compra Direta de Pacote de Aulas/Serviços com emissão imediata do Passe do Cliente.
 */
export const buyServicePackageDirect = createServerFn({ method: "POST" })
 .validator(
 z.object({
 package_id: z.string().uuid(),
 payment_method: z.enum(["pix", "credit_card", "manual"]),
 customer_name: z.string().min(2),
 customer_phone: z.string().min(8),
 }),
 )
 .handler(async ({ data: input }) => {
 const identity = await getServerIdentity();
 if (!identity?.id) {
 throw new Error("Você precisa estar conectado com sua conta para adquirir pacotes.");
 }

 const supabase = getServerClient();

 // 1. Busca dados do pacote
 const { data: pkg, error: pkgErr } = await supabase
 .from("service_packages")
 .select("*, stores(id, name)")
 .eq("id", input.package_id)
 .eq("is_active", true)
 .single();

 if (pkgErr || !pkg) throw new Error("Pacote não encontrado ou inativo.");

 const expiresAt = new Date();
 expiresAt.setDate(expiresAt.getDate() + pkg.validity_days);

 // 2. Emite o Passe do Cliente
 const { data: pass, error: passErr } = await supabase
 .from("customer_service_passes")
 .insert({
 store_id: pkg.store_id,
 customer_id: identity.id,
 package_id: pkg.id,
 total_credits: pkg.total_credits,
 remaining_credits: pkg.total_credits,
 expires_at: expiresAt.toISOString(),
 status: "active",
 auto_renew: pkg.is_recurring,
 })
 .select()
 .single();

 if (passErr || !pass) throw new Error(`Falha ao emitir passe: ${passErr?.message}`);

 // 3. Registra no Ledger imutável
 await supabase.from("service_pass_ledger").insert({
 pass_id: pass.id,
 movement_type: "credit_grant",
 credits_delta: pkg.total_credits,
 balance_after: pkg.total_credits,
 reason: `Compra do pacote "${pkg.title}" via ${input.payment_method.toUpperCase()}`,
 });

 return {
 success: true,
 pass_id: pass.id,
 package_title: pkg.title,
 total_credits: pkg.total_credits,
 expires_at: expiresAt.toISOString(),
 };
 });

