/**
 * pudo.functions.ts — BFF para Rede de Pontos de Retirada (PUDO Pick Up & Drop Off) & Logística Reversa
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { assertStoreAccess, getServerIdentity, STAFF_ROLES } from "@/lib/server-access";

export interface PudoLocationDTO {
 id: string;
 store_id: string;
 name: string;
 address: string;
 city: string;
 state: string;
 lat?: number | null;
 lng?: number | null;
 opening_hours: string;
 fee_per_package_cents: number;
 max_storage_capacity: number;
 is_active: boolean;
 contact_phone?: string | null;
}

export interface PudoPackageDTO {
 id: string;
 tracking_code: string;
 order_id?: string | null;
 pudo_location_id: string;
 pudo_location_name?: string;
 sender_name: string;
 recipient_name: string;
 recipient_phone: string;
 recipient_document?: string | null;
 security_pickup_code: string;
 status:
 | "in_transit"
 | "received_at_hub"
 | "ready_for_pickup"
 | "delivered_to_customer"
 | "overdue"
 | "return_requested"
 | "returned_to_hub";
 received_at?: string | null;
 expires_at?: string | null;
 picked_up_at?: string | null;
 has_damage: boolean;
 damage_notes?: string | null;
 damage_photos: string[];
 created_at: string;
}

export const listPublicPudoLocations = createServerFn({ method: "GET" })
 .validator(z.object({ city: z.string().optional() }).optional())
 .handler(async ({ data }) => {
 const supabase = getAnonServerClient();

 let query = supabase
 .from("pudo_partner_locations")
 .select("*")
 .eq("is_active", true)
 .order("name", { ascending: true });

 if (data?.city) {
 query = query.ilike("city", `%${data.city}%`);
 }

 const { data: rows, error } = await query;

 if (error) {
 console.error("Erro ao listar pontos de retirada:", error);
 return [];
 }

 return (rows || []).map((row: any) => ({
 id: row.id,
 store_id: row.store_id,
 name: row.name,
 address: row.address,
 city: row.city,
 state: row.state,
 lat: row.lat ? Number(row.lat) : null,
 lng: row.lng ? Number(row.lng) : null,
 opening_hours: row.opening_hours,
 fee_per_package_cents: row.fee_per_package_cents,
 max_storage_capacity: row.max_storage_capacity,
 is_active: row.is_active,
 contact_phone: row.contact_phone,
 })) as PudoLocationDTO[];
 });

export const listStorePudoPackages = createServerFn({ method: "GET" })
 .validator(z.object({ status: z.string().optional() }).optional())
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, STAFF_ROLES);
 const supabase = getServerClient();
 const storeId = identity.store_id;

 let query = supabase
 .from("pudo_packages")
 .select("*, pudo_partner_locations!inner(id, name, address, store_id)")
 .eq("pudo_partner_locations.store_id", storeId)
 .order("created_at", { ascending: false });

 if (data?.status && data.status !== "all") {
 query = query.eq("status", data.status);
 }

 const { data: rows, error } = await query;

 if (error) {
 console.error("Erro ao listar pacotes PUDO do lojista:", error);
 throw new Error("Erro ao carregar pacotes PUDO da loja.");
 }

 return (rows || []).map((row: any) => ({
 id: row.id,
 tracking_code: row.tracking_code,
 order_id: row.order_id,
 pudo_location_id: row.pudo_location_id,
 pudo_location_name: row.pudo_partner_locations?.name || "Ponto de Retirada",
 sender_name: row.sender_name,
 recipient_name: row.recipient_name,
 recipient_phone: row.recipient_phone,
 recipient_document: row.recipient_document,
 security_pickup_code: row.security_pickup_code,
 status: row.status,
 received_at: row.received_at,
 expires_at: row.expires_at,
 picked_up_at: row.picked_up_at,
 has_damage: row.has_damage ?? false,
 damage_notes: row.damage_notes,
 damage_photos: row.damage_photos || [],
 created_at: row.created_at,
 })) as PudoPackageDTO[];
 });

export const checkInPudoPackage = createServerFn({ method: "POST" })
 .validator(
 z.object({
 trackingCode: z.string().min(4, "Código de rastreio inválido"),
 locationId: z.string().uuid(),
 senderName: z.string().min(2, "Informe o remetente"),
 recipientName: z.string().min(2, "Informe o destinatário"),
 recipientPhone: z.string().min(8, "Telefone inválido"),
 securityPickupCode: z.string().min(4).max(6).optional(),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, STAFF_ROLES);
 const supabase = getServerClient();
 const storeId = identity.store_id;

 const { data: ownedLoc, error: locErr } = await supabase
 .from("pudo_partner_locations")
 .select("id")
 .eq("id", data.locationId)
 .eq("store_id", storeId)
 .maybeSingle();

 if (locErr || !ownedLoc) {
 throw new Error("Ponto PUDO não encontrado ou pertence a outra loja.");
 }

 const randomBuf = new Uint32Array(1);
 globalThis.crypto.getRandomValues(randomBuf);
 const pickupCode =
 data.securityPickupCode || String(1000 + (randomBuf[0] % 9000));

 const { data: created, error } = await supabase
 .from("pudo_packages")
 .insert({
 tracking_code: data.trackingCode.trim().toUpperCase(),
 pudo_location_id: data.locationId,
 sender_name: data.senderName.trim(),
 recipient_name: data.recipientName.trim(),
 recipient_phone: data.recipientPhone.trim(),
 security_pickup_code: pickupCode,
 status: "ready_for_pickup",
 received_at: new Date().toISOString(),
 })
 .select("id, tracking_code, security_pickup_code")
 .single();

 if (error) {
 console.error("Erro ao registrar entrada de pacote:", error);
 throw new Error("Código de rastreio já cadastrado ou erro na gravação.");
 }

 return {
 success: true,
 packageId: created.id,
 trackingCode: created.tracking_code,
 securityPickupCode: created.security_pickup_code,
 message: "Pacote registrado e pronto para retirada pelo cliente!",
 };
 });

export const deliverPudoPackageToCustomer = createServerFn({ method: "POST" })
 .validator(
 z.object({
 packageId: z.string().uuid(),
 pickupCodeEntered: z.string().min(4, "Informe o código de segurança de 4 dígitos"),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, STAFF_ROLES);
 const supabase = getServerClient();
 const storeId = identity.store_id;

 const { data: pkg, error } = await supabase
 .from("pudo_packages")
 .select("id, security_pickup_code, status, recipient_name, pudo_partner_locations!inner(store_id)")
 .eq("id", data.packageId)
 .eq("pudo_partner_locations.store_id", storeId)
 .maybeSingle();

 if (error || !pkg) {
 throw new Error("Pacote não encontrado para esta loja.");
 }

 if (pkg.security_pickup_code.trim() !== data.pickupCodeEntered.trim()) {
 throw new Error("Código de segurança incorreto. Confirme com o cliente.");
 }

 const { error: updateError } = await supabase
 .from("pudo_packages")
 .update({
 status: "delivered_to_customer",
 picked_up_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 })
 .eq("id", pkg.id);

 if (updateError) {
 throw new Error("Erro ao confirmar entrega.");
 }

 return {
 success: true,
 message: `Pacote entregue com sucesso para ${pkg.recipient_name}!`,
 };
 });

export const reportPackageDamageAndReturn = createServerFn({ method: "POST" })
 .validator(
 z.object({
 packageId: z.string().uuid(),
 damageNotes: z.string().min(5, "Descreva a avaria"),
 damagePhotos: z.array(z.string().url()).optional(),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, STAFF_ROLES);
 const supabase = getServerClient();
 const storeId = identity.store_id;

 const { data: pkg, error: lookupErr } = await supabase
 .from("pudo_packages")
 .select("id, pudo_partner_locations!inner(store_id)")
 .eq("id", data.packageId)
 .eq("pudo_partner_locations.store_id", storeId)
 .maybeSingle();

 if (lookupErr || !pkg) {
 throw new Error("Pacote não encontrado para esta loja.");
 }

 const { error } = await supabase
 .from("pudo_packages")
 .update({
 status: "return_requested",
 has_damage: true,
 damage_notes: data.damageNotes.trim(),
 damage_photos: data.damagePhotos || [],
 updated_at: new Date().toISOString(),
 })
 .eq("id", pkg.id);

 if (error) {
 throw new Error("Erro ao solicitar logística reversa.");
 }

 return {
 success: true,
 message: "Logística reversa solicitada e pacote marcado com avaria para devolução.",
 };
 });
