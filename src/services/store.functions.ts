import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

// --- DADOS DA LOJA ---

export async function _getStoreSettings() {
 const identity = await getServerIdentity().catch(() => null);
 const targetStoreId =
 identity?.store_id ||
 identity?.memberships?.[0]?.store_id ||
 null;

 if (!targetStoreId) {
 return null;
 }

 const db = getServerClient();
 const { data: store } = await db
 .from("stores")
 .select(
 "id, name, slug, email, phone, cnpj, address, city, state, zip_code, description, pix_key, payment_instructions, settings, ai_knowledge_base",
 )
 .eq("id", targetStoreId)
 .maybeSingle();

 if (!store) return null;

 const settings = (store.settings as Record<string, any>) || {};
 return {
 ...store,
 pix_key: store.pix_key || null,
 payment_instructions: store.payment_instructions || null,
 payment_processing_mode: settings.payment_processing_mode || "platform_gateway",
 logo_url: settings.logoUrl || settings.logo_url || null,
 segment: settings.segment || settings.type || settings.niche || null,
 type: settings.type || settings.segment || null,
 niche: settings.niche || settings.segment || null,
 order_types: settings.order_types || { delivery: true, takeout: true, dine_in: true },
 };
}

export const getStoreSettings = createServerFn({ method: "GET" }).handler(_getStoreSettings);

export const saveStoreSettingsSchema = z.object({
 name: z.string().min(2).max(100),
 email: z.string().email().optional().or(z.literal("")),
 phone: z.string().max(20).optional(),
 cnpj: z.string().max(18).optional(),
 address: z.string().max(200).optional(),
 city: z.string().max(100).optional(),
 state: z.string().max(2).optional(),
 zip_code: z.string().max(9).optional(),
 description: z.string().max(500).optional(),
 pix_key: z.string().max(120).optional().or(z.literal("")),
 payment_instructions: z.string().max(1000).optional().or(z.literal("")),
 payment_processing_mode: z.enum(["platform_gateway", "direct_store"]).optional(),
 segment: z.string().optional(),
 type: z.string().optional(),
 niche: z.string().optional(),
 enabled_modules: z.array(z.string()).optional(),
 logoUrl: z.string().optional(),
 bannerUrl: z.string().optional(),
 faviconUrl: z.string().optional(),
 hideNameWithLogo: z.boolean().optional(),
 custom_checkout_fields: z.array(z.any()).optional(),
 delivery_zones: z.array(z.any()).optional(),
 holiday_exceptions: z.array(z.any()).optional(),
 emergency_pause_until: z.string().nullable().optional(),
 order_types: z
 .object({
 delivery: z.boolean().default(true),
 takeout: z.boolean().default(true),
 dine_in: z.boolean().default(true),
 })
 .optional(),
 ai_knowledge_base: z.string().optional().or(z.literal("")),
});

export async function _saveStoreSettings(data: z.infer<typeof saveStoreSettingsSchema>) {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin"]);

 const {
 segment,
 type,
 niche,
 enabled_modules,
 logoUrl,
 bannerUrl,
 faviconUrl,
 hideNameWithLogo,
 custom_checkout_fields,
 delivery_zones,
 holiday_exceptions,
 emergency_pause_until,
 order_types,
 payment_processing_mode,
 ...columns
 } = data;
 const db = getServerClient();

 // Get current settings to merge
 const { data: currentStore } = await db
 .from("stores")
 .select("settings")
 .eq("id", identity.store_id)
 .single();
 const settings = {
 ...(currentStore?.settings || {}),
 ...(segment ? { segment, type: segment, niche: segment } : {}),
 ...(type && !segment ? { type, segment: type, niche: type } : {}),
 ...(niche && !segment && !type ? { niche, segment: niche, type: niche } : {}),
 ...(enabled_modules !== undefined ? { enabled_modules } : {}),
 ...(payment_processing_mode !== undefined ? { payment_processing_mode } : {}),
 logoUrl,
 bannerUrl,
 faviconUrl,
 hideNameWithLogo,
 custom_checkout_fields:
 custom_checkout_fields !== undefined
 ? custom_checkout_fields
 : currentStore?.settings?.custom_checkout_fields,
 delivery_zones:
 delivery_zones !== undefined
 ? delivery_zones
 : currentStore?.settings?.delivery_zones,
 holiday_exceptions:
 holiday_exceptions !== undefined
 ? holiday_exceptions
 : currentStore?.settings?.holiday_exceptions,
 emergency_pause_until:
 emergency_pause_until !== undefined
 ? emergency_pause_until
 : currentStore?.settings?.emergency_pause_until,
 order_types:
 order_types !== undefined
 ? order_types
 : currentStore?.settings?.order_types || { delivery: true, takeout: true, dine_in: true },
 };

 const { error } = await db
 .from("stores")
 .update({ ...columns, settings })
 .eq("id", identity.store_id);

 if (error) {
 throw new Error("Erro ao salvar configurações da loja: " + error.message);
 }

 return { status: "success" };
}

export const saveStoreSettings = createServerFn({ method: "POST" })
 .validator(saveStoreSettingsSchema)
 .handler(async ({ data }) => _saveStoreSettings(data));

// --- CONTROLE DE ABERTURA / PAUSA OPERACIONAL IMEDIATA ---

export const toggleStoreOpenStatusSchema = z.object({
 isOpen: z.boolean(),
 pauseMinutes: z.number().optional(),
});

export async function _toggleStoreOpenStatus(data: z.infer<typeof toggleStoreOpenStatusSchema>) {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);

 const db = getServerClient();
 const storeId = identity.store_id;

 const { data: currentStore, error: fetchErr } = await db
 .from("stores")
 .select("settings")
 .eq("id", storeId)
 .single();

 if (fetchErr || !currentStore) {
 throw new Error("Loja não encontrada para alteração de status.");
 }

 let emergency_pause_until: string | null = null;
 if (!data.isOpen) {
 if (data.pauseMinutes && data.pauseMinutes > 0) {
 const pauseDate = new Date(Date.now() + data.pauseMinutes * 60 * 1000);
 emergency_pause_until = pauseDate.toISOString();
 } else {
 const endOfDay = new Date();
 endOfDay.setHours(23, 59, 59, 999);
 emergency_pause_until = endOfDay.toISOString();
 }
 }

 const updatedSettings = {
 ...(currentStore.settings || {}),
 emergency_pause_until,
 manual_open_override: data.isOpen ? true : false,
 };

 const { error: updateErr } = await db
 .from("stores")
 .update({
 settings: updatedSettings,
 updated_at: new Date().toISOString(),
 })
 .eq("id", storeId);

 if (updateErr) {
 throw new Error(`Erro ao atualizar status da loja: ${updateErr.message}`);
 }

 return {
 success: true,
 isOpen: data.isOpen,
 emergency_pause_until,
 };
}

export const toggleStoreOpenStatus = createServerFn({ method: "POST" })
  .validator(toggleStoreOpenStatusSchema)
  .handler(async ({ data }) => _toggleStoreOpenStatus(data));

// --- POLÍTICAS DA LOJA ---

export async function _getPolicies() {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);

 const db = getServerClient();
 const { data: store, error } = await db
 .from("stores")
 .select("id, policies")
 .eq("id", identity.store_id)
 .single();

 if (error || !store) {
 throw new Error("Loja não encontrada ou erro ao carregar políticas");
 }

 return store;
}

export const getPolicies = createServerFn({ method: "GET" }).handler(_getPolicies);

export const savePoliciesSchema = z.object({
 privacy_policy: z.string(),
 return_policy: z.string(),
 terms: z.string(),
});

export async function _savePolicies(data: z.infer<typeof savePoliciesSchema>) {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin"]);

 const db = getServerClient();
 const { error } = await db.from("stores").update({ policies: data }).eq("id", identity.store_id);

 if (error) {
 throw new Error("Erro ao salvar políticas: " + error.message);
 }

 return { status: "success" };
}

export const savePolicies = createServerFn({ method: "POST" })
 .validator(savePoliciesSchema)
 .handler(async ({ data }) => _savePolicies(data));

// --- SEO DA LOJA ---

export async function _getStoreSeo() {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);

 const db = getServerClient();
 const { data: store, error } = await db
 .from("stores")
 .select("id, seo_title, seo_description, seo_keywords")
 .eq("id", identity.store_id)
 .single();

 if (error || !store) {
 throw new Error("Loja não encontrada ou erro ao carregar SEO");
 }

 return store;
}

export const getStoreSeo = createServerFn({ method: "GET" }).handler(_getStoreSeo);

export const saveStoreSeoSchema = z.object({
 seo_title: z.string().max(60),
 seo_description: z.string().max(160),
 seo_keywords: z.string(),
});

export async function _saveStoreSeo(data: z.infer<typeof saveStoreSeoSchema>) {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin"]);

 const db = getServerClient();
 const { error } = await db.from("stores").update(data).eq("id", identity.store_id);

 if (error) {
 throw new Error("Erro ao salvar SEO: " + error.message);
 }

 return { status: "success" };
}

export const saveStoreSeo = createServerFn({ method: "POST" })
 .validator(saveStoreSeoSchema)
 .handler(async ({ data }) => _saveStoreSeo(data));

// --- PERFIL PÚBLICO DA LOJA ---

export async function _getPublicProfile() {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "support", "finance", "seller"]);

 const db = getServerClient();
 const { data: store, error } = await db
 .from("stores")
 .select(
 "id, name, description, address, phone, settings",
 )
 .eq("id", identity.store_id)
 .single();

 if (error || !store) {
 throw new Error("Loja não encontrada ou erro ao carregar perfil público");
 }

 const settings = (store.settings as Record<string, any>) || {};
 return {
 id: store.id,
 name: store.name,
 description: store.description || "",
 address: store.address || "",
 phone: store.phone || "",
 logo_url: settings.logoUrl || settings.logo_url || null,
 business_hours: settings.working_hours || settings.businessHours || null,
 social_links: settings.social_links || settings.socialLinks || null,
 settings,
 };
}

export const getPublicProfile = createServerFn({ method: "GET" }).handler(_getPublicProfile);

export const savePublicProfileSchema = z.object({
 description: z.string().max(500),
 phone: z.string().max(20).optional(),
 address: z.string().max(200).optional(),
 business_hours: z.string().max(200).optional(),
 logo_url: z.string().url().optional().or(z.literal("")),
 settings: z.record(z.any()).optional(),
});

export async function _savePublicProfile(data: z.infer<typeof savePublicProfileSchema>) {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin"]);

 const db = getServerClient();
 const { data: currentStore } = await db
 .from("stores")
 .select("settings")
 .eq("id", identity.store_id)
 .single();

 const currentSettings = (currentStore?.settings || {}) as Record<string, any>;
 const { description, phone, address, business_hours, logo_url, settings: extraSettings } = data;

 const mergedSettings = {
 ...currentSettings,
 ...(extraSettings || {}),
 ...(logo_url !== undefined ? { logoUrl: logo_url, logo_url } : {}),
 ...(business_hours !== undefined ? { working_hours: business_hours, businessHours: business_hours } : {}),
 };

 const { error } = await db
 .from("stores")
 .update({
 description,
 phone,
 address,
 settings: mergedSettings,
 })
 .eq("id", identity.store_id);

 if (error) {
 throw new Error("Erro ao salvar perfil público: " + error.message);
 }

 return { status: "success" };
}

export const savePublicProfile = createServerFn({ method: "POST" })
 .validator(savePublicProfileSchema)
 .handler(async ({ data }) => _savePublicProfile(data));

// --- CONFIGURAÇÕES DE PAGAMENTO ---

export async function _getPaymentSettings() {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);

 const db = getServerClient();
 const { data: store, error } = await db
 .from("stores")
 .select("id, pix_key, payment_instructions, settings")
 .eq("id", identity.store_id)
 .single();

 if (error || !store) {
 throw new Error("Loja não encontrada");
 }

 const settingsObj = (store.settings || {}) as Record<string, any>;
 const paySettings = settingsObj.payment_settings || {};

 return {
 status: "ok" as const,
 data: {
 pix_key: store.pix_key,
 payment_instructions: store.payment_instructions,
 pix_discount_percentage: Number(paySettings.pix_discount_percentage ?? 0),
 max_installments: Number(paySettings.max_installments ?? 12),
 interest_free_installments: Number(paySettings.interest_free_installments ?? 3),
 installment_interest_rate: Number(paySettings.installment_interest_rate ?? 2.99),
 },
 };
}

export const getPaymentSettings = createServerFn({ method: "GET" }).handler(
 _getPaymentSettings as any,
);

export const savePaymentSettingsSchema = z.object({
 pix_key: z.string().max(255).optional().or(z.literal("")),
 payment_instructions: z.string().max(1000).optional().or(z.literal("")),
 pix_discount_percentage: z.number().min(0).max(100).optional().default(0),
 max_installments: z.number().int().min(1).max(12).optional().default(12),
 interest_free_installments: z.number().int().min(1).max(12).optional().default(3),
 installment_interest_rate: z.number().min(0).max(100).optional().default(2.99),
});

export const savePaymentSettings = createServerFn({ method: "POST" })
 .validator(savePaymentSettingsSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin"]);

 const db = getServerClient();

 // Fetch existing settings
 const { data: store } = await db
 .from("stores")
 .select("settings")
 .eq("id", identity.store_id)
 .single();

 const currentSettings = (store?.settings || {}) as Record<string, any>;
 const { pix_key, payment_instructions, ...extra } = data;

 const updatedSettings = {
 ...currentSettings,
 payment_settings: {
 ...(currentSettings.payment_settings || {}),
 ...extra,
 },
 };

 const { error } = await db
 .from("stores")
 .update({
 pix_key,
 payment_instructions,
 settings: updatedSettings,
 })
 .eq("id", identity.store_id);

 if (error) throw new Error("Erro ao salvar configurações de pagamento: " + error.message);

 return { status: "success" as const };
 });

/**
 * Public-facing: Returns PIX key and payment instructions for a specific order.
 * Uses service role so it's safe to call from customer-facing server functions.
 * The order's store_id is used to look up the store, ensuring tenant isolation.
 */
export async function getStorePaymentInfoByOrderId(orderId: string) {
 const db = getServerClient();

 // Get the store_id from the order (service role bypasses RLS safely)
 const { data: order } = await db.from("orders").select("store_id").eq("id", orderId).single();

 if (!order?.store_id) return null;

 const { data: store } = await db
 .from("stores")
 .select("pix_key, payment_instructions")
 .eq("id", order.store_id)
 .single();

 return store || null;
}

export const executeHardRefresh = createServerFn({ method: "POST" })
 .validator(z.object({ confirmText: z.string() }))
 .handler(async ({ data: { confirmText } }) => {
 const db = getServerClient();
 const { data, error } = await db.rpc("execute_hard_refresh", { p_confirm_text: confirmText });
 if (error) {
 console.error("[HardRefreshError]", error);
 throw new Error(error.message);
 }
 return data;
 });

// ---------------------------------------------------------------------------
// Horários de Funcionamento — Microfase G
// Persistido em stores.settings.working_hours como JSONB.
// Schema canônico: { [day]: { open: boolean, intervals: [{from, to}] } }
// ---------------------------------------------------------------------------

/** Dias da semana canônicos */
export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
 mon: "Segunda",
 tue: "Terça",
 wed: "Quarta",
 thu: "Quinta",
 fri: "Sexta",
 sat: "Sábado",
 sun: "Domingo",
};

export type TimeInterval = {
 from: string; // "09:00"
 to: string; // "18:00"
};

export type DaySchedule = {
 open: boolean;
 intervals: TimeInterval[];
};

export type WorkingHours = Record<Weekday, DaySchedule>;

/** Horário padrão caso não exista configuração */
export const DEFAULT_WORKING_HOURS: WorkingHours = {
 mon: { open: true, intervals: [{ from: "09:00", to: "18:00" }] },
 tue: { open: true, intervals: [{ from: "09:00", to: "18:00" }] },
 wed: { open: true, intervals: [{ from: "09:00", to: "18:00" }] },
 thu: { open: true, intervals: [{ from: "09:00", to: "18:00" }] },
 fri: { open: true, intervals: [{ from: "09:00", to: "18:00" }] },
 sat: { open: false, intervals: [] },
 sun: { open: false, intervals: [] },
};

const timeIntervalSchema = z.object({
 from: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
 to: z.string().regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
});

const dayScheduleSchema = z.object({
 open: z.boolean(),
 intervals: z.array(timeIntervalSchema),
});

export const workingHoursSchema = z.object({
 mon: dayScheduleSchema,
 tue: dayScheduleSchema,
 wed: dayScheduleSchema,
 thu: dayScheduleSchema,
 fri: dayScheduleSchema,
 sat: dayScheduleSchema,
 sun: dayScheduleSchema,
});

/** Retorna os horários de funcionamento da loja */
export const getWorkingHours = createServerFn({ method: "GET" }).handler(async () => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);

 const db = getServerClient();
 const { data: store } = await db
 .from("stores")
 .select("settings")
 .eq("id", identity.store_id)
 .single();

 const raw = (store?.settings as any)?.working_hours;
 if (!raw) return DEFAULT_WORKING_HOURS;

 // Valida e normaliza o schema — coluna legada pode ter formato diferente
 const parsed = workingHoursSchema.safeParse(raw);
 return parsed.success ? parsed.data : DEFAULT_WORKING_HOURS;
});

/** Salva os horários de funcionamento */
export const saveWorkingHours = createServerFn({ method: "POST" })
 .validator(workingHoursSchema)
 .handler(async ({ data: workingHours }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin"]);

 const db = getServerClient();

 // Lê settings atuais para fazer merge (não sobrescrever outros campos)
 const { data: store } = await db
 .from("stores")
 .select("settings")
 .eq("id", identity.store_id)
 .single();

 const currentSettings = (store?.settings as Record<string, any>) || {};

 const { error } = await db
 .from("stores")
 .update({
 settings: {
 ...currentSettings,
 working_hours: workingHours,
 },
 })
 .eq("id", identity.store_id);

 if (error) throw new Error("Erro ao salvar horários: " + error.message);
 return { success: true };
 });

/**
 * Retorna os intervalos disponíveis de uma data para o booking engine.
 * Usado por getAvailableSlots para substituir o hardcode 09:00-18:00.
 */
export async function getWorkingIntervalsForDate(
 storeId: string,
 date: string, // "YYYY-MM-DD"
): Promise<TimeInterval[]> {
 const db = getServerClient();
 const { data: store } = await db.from("stores").select("settings").eq("id", storeId).single();

 const raw = (store?.settings as any)?.working_hours as WorkingHours | undefined;
 if (!raw) return [{ from: "09:00", to: "18:00" }]; // fallback seguro

 // Mapear dia da semana
 const dayIndex = new Date(date + "T12:00:00Z").getUTCDay(); // 0=Sun, 1=Mon...
 const dayMap: Record<number, Weekday> = {
 0: "sun",
 1: "mon",
 2: "tue",
 3: "wed",
 4: "thu",
 5: "fri",
 6: "sat",
 };
 const dayKey = dayMap[dayIndex];
 const schedule = raw[dayKey];

 if (!schedule?.open || !schedule.intervals?.length) return [];
 return schedule.intervals;
}

// --- GESTÃO DE MÚLTIPLAS LOJAS DO LOJISTA ---

export const getMyStoresList = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const db = getServerClient();

 // 1. Resolver usuário autenticado e perfil
 const identity = await getServerIdentity();
 const userId = identity.id;
 const userRole = identity.role;
 const isPlatformAdmin =
 userRole === "platform_admin" ||
 userRole === "master" ||
 userRole === "superadmin";

 if (!userId) {
 return [];
 }

 // 2. Coletar IDs de lojas na tabela canônica workspace_members
 const storeIdsSet = new Set<string>();
 const roleByStoreId: Record<string, string> = {};

 try {
 const { data: wmRows, error: wmErr } = await db
 .from("workspace_members")
 .select("store_id, role")
 .eq("profile_id", userId);

 if (wmErr) {
 console.warn("[stores] Erro ao buscar workspace_members em getMyStoresList:", wmErr.message);
 }

 (wmRows || []).forEach((m: any) => {
 if (m.store_id) {
 storeIdsSet.add(m.store_id);
 roleByStoreId[m.store_id] = m.role || "owner";
 }
 });
 } catch (memErr) {
 console.warn("[stores] Erro ao buscar memberships em getMyStoresList:", memErr);
 }

 // Também inclui qualquer store_id presente nos memberships resolvidos pela identity
 (identity.memberships || []).forEach((m: any) => {
 if (m.store_id) {
 storeIdsSet.add(m.store_id);
 if (!roleByStoreId[m.store_id]) {
 roleByStoreId[m.store_id] = m.role || "owner";
 }
 }
 });

 // 3. Montar query de lojas
 let query = db
 .from("stores")
 .select("id, name, slug, phone, email, cnpj, address, city, state, description, settings, logo_url, created_at, is_active");

 if (isPlatformAdmin) {
 // Platform Admin tem visão completa de todas as lojas e empresas
 query = query.order("created_at", { ascending: false }).limit(50);
 } else if (storeIdsSet.size > 0) {
 query = query.in("id", Array.from(storeIdsSet)).order("created_at", { ascending: false });
 } else {
 return [];
 }

 const { data: stores, error } = await query;
 if (error) {
 console.error("[stores] Erro ao listar lojas:", error);
 return [];
 }

 const activeStoreId = identity.store_id;

 // 4. Enriquecer lojas com metadados e contagem de produtos
 const enriched = await Promise.all(
 (stores || []).map(async (st: any) => {
 let productCount = 0;
 try {
 const { count } = await db
 .from("products")
 .select("id", { count: "exact", head: true })
 .eq("store_id", st.id);
 productCount = count || 0;
 } catch {
 productCount = 0;
 }

 const settings = (st.settings as Record<string, any>) || {};
 const bannerUrl = settings.bannerUrl || settings.banner_url || null;
 const logoUrl = st.logo_url || settings.logoUrl || settings.logo_url || null;
 const type = settings.type || settings.segment || settings.niche || "ecommerce";
 const status = st.is_active === false ? "inactive" : (settings.status || "active");

 return {
 id: st.id,
 name: st.name,
 slug: st.slug,
 type,
 logo_url: logoUrl,
 banner_url: bannerUrl,
 phone: st.phone || "",
 email: st.email || "",
 cnpj: st.cnpj || "",
 address: st.address || "",
 city: st.city || "",
 state: st.state || "",
 description: st.description || "",
 status,
 settings,
 created_at: st.created_at,
 role: roleByStoreId[st.id] || (isPlatformAdmin ? "owner" : "member"),
 is_active_context: st.id === activeStoreId,
 product_count: productCount,
 };
 }),
 );

 return enriched;
 } catch (err) {
 console.error("[stores] Falha geral em getMyStoresList:", err);
 return [];
 }
});

export const updateStoreDetailsSchema = z.object({
 store_id: z.string().uuid(),
 name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
 slug: z.string().min(2).max(100).optional(),
 type: z.string().optional(),
 description: z.string().max(500).optional().nullable(),
 logo_url: z.string().optional().nullable(),
 banner_url: z.string().optional().nullable(),
 phone: z.string().max(30).optional().nullable(),
 email: z.string().email().optional().or(z.literal("")).nullable(),
 city: z.string().max(100).optional().nullable(),
 state: z.string().max(2).optional().nullable(),
 address: z.string().max(250).optional().nullable(),
 cnpj: z.string().max(20).optional().nullable(),
 hide_address_completely: z.boolean().optional(),
 is_address_public: z.boolean().optional(),
 status: z.enum(["active", "draft", "maintenance"]).optional(),
});

export const updateStoreDetails = createServerFn({ method: "POST" })
 .validator(updateStoreDetailsSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 const db = getServerClient();

 // Permissão: verifica se o usuário é owner ou admin da store específica
 const userRole = identity.memberships.find((m) => m.store_id === data.store_id)?.role || identity.role;
 if (!["owner", "admin"].includes(userRole)) {
 throw new Error("Acesso negado: Você precisa ser proprietário ou administrador para alterar os dados desta loja.");
 }

 const { data: currentStore } = await db
 .from("stores")
 .select("settings")
 .eq("id", data.store_id)
 .single();

 const currentSettings = currentStore?.settings || {};
 const updatedSettings = {
 ...currentSettings,
 logoUrl: data.logo_url,
 bannerUrl: data.banner_url,
 type: data.type,
 hide_address_completely: data.hide_address_completely !== undefined ? data.hide_address_completely : (currentSettings.hide_address_completely ?? false),
 is_address_public: data.is_address_public !== undefined ? data.is_address_public : (data.hide_address_completely ? false : (currentSettings.is_address_public ?? true)),
 };

 const updatePayload: Record<string, any> = {
 name: data.name,
 description: data.description || null,
 phone: data.phone || null,
 email: data.email || null,
 city: data.city || null,
 state: data.state || null,
 address: data.address || null,
 cnpj: data.cnpj || null,
 settings: updatedSettings,
 };

 if (data.slug) {
 updatePayload.slug = data.slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, "-");
 }
 if (data.type) {
 updatePayload.type = data.type;
 }
 if (data.status) {
 updatePayload.status = data.status;
 }
 if (data.logo_url !== undefined) {
 updatePayload.logo_url = data.logo_url;
 }
 if (data.banner_url !== undefined) {
 updatePayload.banner_url = data.banner_url;
 }

 const { error: storeError } = await db
 .from("stores")
 .update(updatePayload)
 .eq("id", data.store_id);

 if (storeError) {
 console.error("[updateStoreDetails] Erro ao atualizar store:", storeError);
 throw new Error("Erro ao atualizar loja: " + storeError.message);
 }

 // Sincroniza logo e banner no theme_settings automaticamente
 if (data.logo_url !== undefined || data.banner_url !== undefined) {
 try {
 const themeUpdate: Record<string, any> = {};
 if (data.logo_url !== undefined) themeUpdate.logo_url = data.logo_url;
 if (data.banner_url !== undefined) themeUpdate.hero_background_url = data.banner_url;
 await db.from("theme_settings").update(themeUpdate).eq("store_id", data.store_id);
 } catch (e) {
 console.warn("[updateStoreDetails] Aviso ao sincronizar theme_settings:", e);
 }
 }

  return { success: true, store_id: data.store_id, name: data.name };
});

// --- SEÇÕES CUSTOMIZÁVEIS DA PÁGINA PÚBLICA (ESTILO WIX/APP EDITOR) ---

export const storePageSectionSchema = z.object({
  id: z.string().uuid().optional(),
  store_id: z.string().uuid().optional(),
  section_type: z.enum([
    "banner_carousel",
    "highlight_cards",
    "featured_services",
    "custom_text_block",
    "infinite_feed",
    "contact_hours",
    "coupons_grid",
  ]),
  section_order: z.number().int().default(0),
  title: z.string().nullable().optional(),
  config: z.record(z.any()).default({}),
  is_active: z.boolean().default(true),
});

export const getStorePublicProfileWithSections = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().optional(), store_id: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const db = getServerClient();
    let query = db.from("stores").select(`
      id, name, slug, description, phone, email, address, city, state, cnpj,
      logo_url, banner_url, settings, plan_tier, enabled_modules, created_at
    `);

    if (data.slug) {
      query = query.eq("slug", data.slug);
    } else if (data.store_id) {
      query = query.eq("id", data.store_id);
    } else {
      return null;
    }

    const { data: store, error } = await query.maybeSingle();
    if (!store || error) return null;

    const { data: sections } = await db
      .from("store_page_sections")
      .select("*")
      .eq("store_id", store.id)
      .eq("is_active", true)
      .order("section_order", { ascending: true });

    const [productsCount, reviewsRes, followersCount] = await Promise.all([
      db.from("products").select("id", { count: "exact", head: true }).eq("store_id", store.id).in("status", ["published", "active"]),
      db.from("deal_reviews").select("rating").eq("store_id", store.id),
      db.from("store_followers").select("customer_id", { count: "exact", head: true }).eq("store_id", store.id),
    ]);

    const reviews = reviewsRes.data || [];
    const avgRating =
      reviews.length > 0
        ? Number((reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1))
        : 5.0;

    return {
      store,
      sections: sections || [],
      stats: {
        total_products: productsCount.count || 0,
        total_reviews: reviews.length,
        average_rating: avgRating,
        followers_count: followersCount.count || 0,
      },
    };
  });

export const getStorePageSections = createServerFn({ method: "GET" })
  .validator(z.object({ store_id: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const targetStoreId = data.store_id || identity.store_id;
    if (!targetStoreId) throw new Error("Store ID não fornecido");
    assertStoreAccess(identity, ["owner", "admin", "manager"], targetStoreId);

    const db = getServerClient();
    const { data: sections, error } = await db
      .from("store_page_sections")
      .select("*")
      .eq("store_id", targetStoreId)
      .order("section_order", { ascending: true });

    if (error) throw new Error(error.message);
    return sections || [];
  });

export const saveStorePageSectionsOrder = createServerFn({ method: "POST" })
  .validator(
    z.object({
      store_id: z.string().uuid().optional(),
      ordered_section_ids: z.array(z.string().uuid()),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const targetStoreId = data.store_id || identity.store_id;
    if (!targetStoreId) throw new Error("Store ID não fornecido");
    assertStoreAccess(identity, ["owner", "admin", "manager"], targetStoreId);

    const db = getServerClient();
    const updates = data.ordered_section_ids.map((id, index) =>
      db
        .from("store_page_sections")
        .update({ section_order: index })
        .eq("id", id)
        .eq("store_id", targetStoreId),
    );

    await Promise.all(updates);
    return { success: true };
  });

export const upsertStorePageSection = createServerFn({ method: "POST" })
  .validator(storePageSectionSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const targetStoreId = data.store_id || identity.store_id;
    if (!targetStoreId) throw new Error("Store ID não fornecido");
    assertStoreAccess(identity, ["owner", "admin", "manager"], targetStoreId);

    const db = getServerClient();
    const payload = {
      store_id: targetStoreId,
      section_type: data.section_type,
      section_order: data.section_order,
      title: data.title || null,
      config: data.config,
      is_active: data.is_active,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { data: updated, error } = await db
        .from("store_page_sections")
        .update(payload)
        .eq("id", data.id)
        .eq("store_id", targetStoreId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated;
    } else {
      const { data: created, error } = await db
        .from("store_page_sections")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return created;
    }
  });

export const deleteStorePageSection = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), store_id: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const targetStoreId = data.store_id || identity.store_id;
    if (!targetStoreId) throw new Error("Store ID não fornecido");
    assertStoreAccess(identity, ["owner", "admin", "manager"], targetStoreId);

    const db = getServerClient();
    const { error } = await db
      .from("store_page_sections")
      .delete()
      .eq("id", data.id)
      .eq("store_id", targetStoreId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const getStoreDashboardSummary = createServerFn({ method: "GET" })
  .validator(z.object({ store_id: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const targetStoreId = data.store_id || identity.store_id;
    if (!targetStoreId) throw new Error("Store ID não fornecido");
    assertStoreAccess(identity, ["owner", "admin", "manager", "staff"], targetStoreId);

    const db = getServerClient();
    const today = new Date().toISOString().split("T")[0];

    const [storeRes, productsRes, ordersRes, pendingOrdersRes] = await Promise.all([
      db
        .from("stores")
        .select("id, name, slug, logo_url, plan_tier, enabled_modules")
        .eq("id", targetStoreId)
        .single(),
      db
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("store_id", targetStoreId)
        .eq("status", "active"),
      db
        .from("orders")
        .select("total_cents")
        .eq("store_id", targetStoreId)
        .gte("created_at", today),
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("store_id", targetStoreId)
        .eq("status", "pending"),
    ]);

    const store = storeRes.data;
    const activeProducts = productsRes.count || 0;
    const todayOrders = ordersRes.data || [];
    const todayRevenueCents = todayOrders.reduce((sum, o) => sum + (o.total_cents || 0), 0);
    const pendingOrdersCount = pendingOrdersRes.count || 0;

    return {
      store,
      metrics: {
        activeProducts,
        todayOrdersCount: todayOrders.length,
        todayRevenueCents,
        pendingOrdersCount,
      },
    };
  });
