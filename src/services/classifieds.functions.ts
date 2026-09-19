import { createServerFn } from "@tanstack/react-start";
import { getServerClient } from "@/lib/supabase";
import { getIdentity } from "./identity.functions";
import { requireAdmin } from "@/lib/server-access";
import { z } from "zod";
import { classifiedSchema } from "@/types/community";
import { executeUnifiedAiCall } from "./api-orchestrator.functions";

// ---------------------------------------------------------------------------
// PUBLIC (no auth required) — 100% Real no Supabase | Zero Mocks
// ---------------------------------------------------------------------------

export const getPublicClassifieds = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 limit: z.number().int().min(1).max(100).optional(),
 category: z.string().optional(),
 dealType: z.string().optional(),
 search: z.string().optional(),
 storeId: z.string().uuid().optional(),
 })
 .optional(),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const limit = data?.limit ?? 50;

 try {
 let query = supabase
 .from("classifieds")
 .select("*")
 .eq("status", "active")
 .order("created_at", { ascending: false })
 .limit(limit);

 if (data?.category && data.category !== "todos") {
 query = query.eq("category", data.category);
 }

 if (data?.dealType && data.dealType !== "todos") {
 query = query.eq("deal_type", data.dealType);
 }

 if (data?.search && data.search.trim()) {
 const q = `%${data.search.trim()}%`;
 query = query.or(`title.ilike.${q},content.ilike.${q},location_name.ilike.${q}`);
 }

 const { data: classifieds, error } = await query;

 if (!error && classifieds) {
 return classifieds;
 }
 } catch (err) {
 console.warn("[classifieds] Erro ao buscar no banco:", err);
 }

 return [];
 });

export const getPublicClassifiedById = createServerFn({ method: "GET" })
 .validator(z.string().uuid())
 .handler(async ({ data: id }) => {
 const supabase = getServerClient();
 const identity = await getIdentity().catch(() => null);

 try {
 const { data, error } = await supabase
 .from("classifieds")
 .select("*")
 .eq("id", id)
 .maybeSingle();

 if (error) {
 console.warn("[classifieds] getPublicClassifiedById db error:", error);
 }

 let classifiedData: any = data;
 if (!classifiedData) return null;

 // Busca perfil do autor de forma desacoplada para evitar quebras por nome de constraint FK
 if (classifiedData.author_profile_id && !classifiedData.profiles) {
 let profile = null;
 try {
 const { data: prof } = await supabase
 .from("profiles")
 .select("id, full_name, avatar_url, phone")
 .eq("id", classifiedData.author_profile_id)
 .maybeSingle();
 profile = prof;
 } catch {
 profile = null;
 }

      classifiedData.profiles = profile || {
        id: classifiedData.author_profile_id,
        full_name: classifiedData.contact_name || "Anunciante",
        avatar_url: null,
        phone: classifiedData.contact_whatsapp || classifiedData.whatsapp,
      };
  }

    // Busca informações da loja associada e perguntas personalizadas de atendimento
    if (classifiedData.store_id) {
      try {
        const { data: storeData } = await supabase
          .from("stores")
          .select("id, name, slug, logo_url, phone, pix_key, payment_instructions, settings")
          .eq("id", classifiedData.store_id)
          .maybeSingle();

        if (storeData) {
          classifiedData.store = {
            id: storeData.id,
            name: storeData.name,
            slug: storeData.slug,
            logo_url: storeData.logo_url,
            phone: storeData.phone,
            pix_key: storeData.pix_key || storeData.settings?.pix_key || null,
            payment_instructions: storeData.payment_instructions || storeData.settings?.payment_instructions || null,
            custom_inquiry_fields: storeData.settings?.custom_inquiry_fields || [],
          };

          // Sincronização estrita de pagamentos com o Workspace da Loja
          if (classifiedData.sync_payment_with_store !== false && classifiedData.attributes) {
            const rules = { ...(classifiedData.attributes.payment_rules || {}) };
            const effectivePix = storeData.pix_key || storeData.settings?.pix_key;
            if (effectivePix) {
              rules.pix_key = effectivePix;
              if (rules.pix_enabled === undefined) rules.pix_enabled = true;
            }
            const instructions = storeData.payment_instructions || storeData.settings?.payment_instructions;
            if (instructions) {
              rules.store_payment_instructions = instructions;
            }
            classifiedData.attributes.payment_rules = rules;
          }
        }
      } catch (storeErr) {
        console.warn("[classifieds] error fetching store data:", storeErr);
      }
    }

 const isOwner = !!(identity?.id && classifiedData.author_profile_id === identity.id);
 const isAdmin = !!(identity?.role === "admin" || identity?.role === "master" || identity?.role === "platform_admin" || identity?.role === "owner");
 const canManage = isOwner || isAdmin;

 const viewerContext: "owner" | "admin" | "visitor" | "anonymous" = isOwner
 ? "owner"
 : isAdmin
 ? "admin"
 : identity?.id
 ? "visitor"
 : "anonymous";

  // LGPD & Micro-fase 7.4: Blindagem server-side de endereço quando a privacidade estiver ativada
  const isPrivacyHidden = Boolean(
    classifiedData.hide_location ||
    classifiedData.attributes?.hide_location ||
    classifiedData.attributes?.hide_address ||
    classifiedData.attributes?.hide_exact_address ||
    classifiedData.attributes?.location_privacy === "hidden"
  );

  if (!canManage && isPrivacyHidden) {
    classifiedData.location_lat = null;
    classifiedData.location_lng = null;
    classifiedData.location_name = null;
    classifiedData.city = null;
    classifiedData.state = null;
    classifiedData.neighborhood = null;
    if (classifiedData.attributes) {
      classifiedData.attributes.city = null;
      classifiedData.attributes.state = null;
      classifiedData.attributes.neighborhood = null;
      classifiedData.attributes.location_lat = null;
      classifiedData.attributes.location_lng = null;
    }
  }

 return {
 classified: classifiedData,
 isOwner,
 canManage,
 viewerContext,
 };
 } catch (err) {
 console.error("[classifieds] Falha em getPublicClassifiedById:", err);
 return null;
 }
 });

export const updateClassifiedStatus = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 status: z.enum(["active", "paused", "reserved", "completed", "archived"]),
 reason: z.string().optional(),
 }),
 )
 .handler(async ({ data: { id, status, reason } }) => {
 const supabase = getServerClient();
 const identity = await getIdentity();

 if (!identity || !identity.id) {
 throw new Error("Não autorizado.");
 }

 // Busca o anúncio para verificar autoria
 const { data: existing, error: fetchErr } = await supabase
 .from("classifieds")
 .select("id, author_profile_id, status")
 .eq("id", id)
 .single();

 if (fetchErr || !existing) {
 throw new Error("Anúncio não encontrado.");
 }

 const isAdmin = identity.role === "admin" || identity.role === "master";
 if (existing.author_profile_id !== identity.id && !isAdmin) {
 throw new Error("Você não tem permissão para alterar o estado deste anúncio.");
 }

 const { data: updated, error: updateErr } = await supabase
 .from("classifieds")
 .update({
 status,
 updated_at: new Date().toISOString(),
 })
 .eq("id", id)
 .select()
 .single();

 if (updateErr) {
 console.error("[classifieds] updateClassifiedStatus error:", updateErr);
 throw new Error("Erro ao atualizar o status do anúncio.");
 }

 return { success: true, classified: updated };
 });

// ---------------------------------------------------------------------------
// AUTHENTICATED (own classifieds — user)
// ---------------------------------------------------------------------------

export const getClassifieds = createServerFn({ method: "GET" }).handler(async () => {
 const supabase = getServerClient();
 const identity = await getIdentity();

 if (!identity || !identity.id) {
 throw new Error("Unauthorized");
 }

 const { data, error } = await supabase
 .from("classifieds")
 .select("*")
 .eq("author_profile_id", identity.id)
 .order("created_at", { ascending: false });

 if (error) {
 console.error("Error fetching classifieds:", error);
 throw new Error("Failed to fetch classifieds");
 }

 return data;
});

export const getClassified = createServerFn({ method: "GET" })
 .validator(z.string().uuid())
 .handler(async ({ data: id }) => {
 const supabase = getServerClient();
 const identity = await getIdentity();

 if (!identity || !identity.id) {
 throw new Error("Unauthorized");
 }

 const { data, error } = await supabase
 .from("classifieds")
 .select("*")
 .eq("id", id)
 .eq("author_profile_id", identity.id)
 .single();

 if (error) {
 console.error("Error fetching classified:", error);
 throw new Error("Failed to fetch classified");
 }

 return data;
});

const upsertClassifiedInput = z.object({
  id: z.string().uuid().optional(),
  store_id: z.string().uuid().nullable().optional(),
  title: z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
  category: z.enum([
    "sale",
    "vehicle",
    "real_estate",
    "service",
    "job",
    "job_offer",
    "trade",
    "donation",
    "event",
    "travel",
    "equipment",
  ]),
  deal_type: z.enum(["venda", "aluguel", "temporada", "servico"]).optional(),
  property_type: z.string().nullable().optional(),
  bedrooms: z.coerce.number().int().optional(),
  bathrooms: z.coerce.number().int().optional(),
  suites: z.coerce.number().int().optional(),
  parking_spots: z.coerce.number().int().optional(),
  area_sqm: z.coerce.number().int().optional(),
  amenities: z.array(z.string()).optional(),
  max_guests: z.coerce.number().int().optional(),
  cleaning_fee_cents: z.coerce.number().int().optional(),
  rental_period: z.string().optional(),
  digital_file_url: z.string().nullable().optional(),
 is_digital: z.boolean().optional(),
 digital_file_name: z.string().nullable().optional(),
 digital_file_size_bytes: z.coerce.number().int().nullable().optional(),
 digital_preview_url: z.string().nullable().optional(),
 download_limit: z.coerce.number().int().optional(),
 access_duration_days: z.coerce.number().int().optional(),
 booking_enabled: z.boolean().optional(),
 available_slots: z.coerce.number().int().optional(),
 service_duration_minutes: z.coerce.number().int().optional(),
 available_weekdays: z.array(z.string()).optional(),
 working_hours_start: z.string().optional(),
 working_hours_end: z.string().optional(),
 property_tags: z.array(z.string()).optional(),
 is_boosted: z.boolean().optional(),
 delivery_mode: z.enum(["pickup", "local_delivery", "national_shipping", "both"]).optional(),
 accepts_trade: z.boolean().optional(),
 accepts_card: z.boolean().optional(),
 max_installments: z.coerce.number().int().optional(),
 accepted_payment_methods: z.array(z.string()).optional(),
 installments_available: z.boolean().optional(),
 cancellation_policy: z.string().optional(),
 content: z.string().min(10, "Descrição deve ter no mínimo 10 caracteres"),
 price_cents: z.coerce.number().int().min(0).nullable().optional(),
 images: z.array(z.string()).optional().default([]),
 whatsapp: z.string().nullable().optional(),
 contact_whatsapp: z.string().nullable().optional(),
 location_name: z.string().nullable().optional(),
 location_text: z.string().nullable().optional(),
 location_lat: z.number().nullable().optional(),
 location_lng: z.number().nullable().optional(),
 condition: z.enum(["new", "used", "refurbished"]).nullable().optional(),
 negotiable: z.boolean().optional().default(true),
 pricing_model: z.enum(["one_time", "recurring"]).optional(),
 billing_cycle: z.enum(["monthly", "quarterly", "semiannual", "yearly"]).optional(),
 setup_fee_cents: z.number().int().min(0).optional(),
 trial_days: z.number().int().min(0).optional(),
 recurring_features: z.array(z.string()).optional(),
 sub_category: z.string().optional(),
 hide_location: z.boolean().optional(),
 location_privacy: z.enum(["full", "city_only", "hidden"]).optional(),
 attributes: z.record(z.any()).optional().default({}),
 status: z.enum(["draft", "active", "paused", "closed"]).default("active"),
 max_discount_pct: z.coerce.number().min(0).max(100).optional().default(0),
 delivery_type: z.enum(["pickup", "local_pickup", "local_delivery", "national_shipping", "both"]).optional(),
});

export const upsertClassified = createServerFn({ method: "POST" })
 .validator(upsertClassifiedInput)
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getIdentity();

 if (!identity || !identity.id) {
 throw new Error("Unauthorized");
 }

 const { id, ...rest } = input;
 const isUpdating = !!id;

 // Sanitiza e mapeia os campos para colunas existentes estritamente na tabela classifieds
 const payload: Record<string, any> = {
 title: rest.title,
 content: rest.content,
 category: rest.category,
 deal_type: rest.deal_type || rest.attributes?.deal_type || (rest.category === "real_estate" ? "venda" : "venda"),
 property_type: rest.property_type || rest.attributes?.property_type || null,
 bedrooms: rest.bedrooms ?? rest.attributes?.bedrooms ?? null,
 bathrooms: rest.bathrooms ?? rest.attributes?.bathrooms ?? null,
 suites: rest.suites ?? rest.attributes?.suites ?? null,
 parking_spots: rest.parking_spots ?? rest.attributes?.parking_spots ?? null,
 area_sqm: rest.area_sqm ?? rest.attributes?.area_sqm ?? null,
 amenities: Array.isArray(rest.amenities) ? rest.amenities : Array.isArray(rest.attributes?.amenities) ? rest.attributes.amenities : [],
 max_guests: rest.max_guests ?? rest.attributes?.max_guests ?? 1,
 cleaning_fee_cents: rest.cleaning_fee_cents ?? rest.attributes?.cleaning_fee_cents ?? 0,
 rental_period: rest.rental_period || rest.attributes?.rental_period || (rest.deal_type === "temporada" ? "diaria" : "mensal"),
 is_digital: rest.is_digital ?? (!!rest.digital_file_url),
 digital_file_url: rest.digital_file_url || rest.attributes?.digital_file_url || null,
 digital_file_name: rest.digital_file_name || rest.attributes?.digital_file_name || null,
 digital_file_size_bytes: rest.digital_file_size_bytes ?? rest.attributes?.digital_file_size_bytes ?? null,
 digital_preview_url: rest.digital_preview_url || rest.attributes?.digital_preview_url || null,
 download_limit: rest.download_limit ?? rest.attributes?.download_limit ?? 5,
 access_duration_days: rest.access_duration_days ?? rest.attributes?.access_duration_days ?? null,
 booking_enabled: rest.booking_enabled ?? rest.attributes?.booking_enabled ?? false,
 available_slots: rest.available_slots ?? rest.attributes?.available_slots ?? null,
 service_duration_minutes: rest.service_duration_minutes ?? rest.attributes?.service_duration_minutes ?? null,
 property_tags: Array.isArray(rest.property_tags) ? rest.property_tags : Array.isArray(rest.attributes?.property_tags) ? rest.attributes.property_tags : [],
 is_boosted: rest.is_boosted ?? rest.attributes?.is_boosted ?? false,
 delivery_mode: rest.delivery_mode || rest.attributes?.delivery_mode || "pickup",
 accepts_trade: rest.accepts_trade ?? rest.attributes?.accepts_trade ?? false,
 accepts_card: rest.accepts_card ?? rest.attributes?.accepts_card ?? false,
 max_installments: rest.max_installments ?? rest.attributes?.max_installments ?? 1,
 price_cents: rest.price_cents ?? null,
 pricing_model: rest.pricing_model || rest.attributes?.pricing_model || "one_time",
 billing_cycle: rest.billing_cycle || rest.attributes?.billing_cycle || "monthly",
 setup_fee_cents: rest.setup_fee_cents ?? rest.attributes?.setup_fee_cents ?? 0,
 trial_days: rest.trial_days ?? rest.attributes?.trial_days ?? 0,
 recurring_features: rest.recurring_features || rest.attributes?.recurring_features || [],
 sub_category: rest.sub_category || rest.attributes?.sub_category || null,
 contact_whatsapp: rest.contact_whatsapp || rest.whatsapp || null,
 location_name: rest.location_name || null,
 location_text: rest.location_text || rest.location_name || null,
 location_lat: rest.location_lat ?? null,
 location_lng: rest.location_lng ?? null,
 images: Array.isArray(rest.images) ? rest.images : [],
 condition: rest.condition || null,
 negotiable: rest.negotiable ?? true,
  attributes: {
    ...(rest.attributes || {}),
    hide_location: rest.hide_location !== undefined ? rest.hide_location : (rest.attributes?.hide_location ?? false),
    location_privacy: rest.location_privacy || rest.attributes?.location_privacy || "full",
    pricing_model: rest.pricing_model || rest.attributes?.pricing_model || "one_time",
   billing_cycle: rest.billing_cycle || rest.attributes?.billing_cycle || "monthly",
   setup_fee_cents: rest.setup_fee_cents ?? rest.attributes?.setup_fee_cents ?? 0,
   trial_days: rest.trial_days ?? rest.attributes?.trial_days ?? 0,
   recurring_features: rest.recurring_features || rest.attributes?.recurring_features || [],
   sub_category: rest.sub_category || rest.attributes?.sub_category || null,
   accepted_payment_methods: rest.accepted_payment_methods ?? rest.attributes?.accepted_payment_methods ?? ["pix", "cartao_credito", "dinheiro"],
   installments_available: rest.installments_available ?? rest.attributes?.installments_available ?? true,
   cancellation_policy: rest.cancellation_policy || rest.attributes?.cancellation_policy || "Negociação direta com o anunciante",
   ...(rest.available_weekdays ? { available_weekdays: rest.available_weekdays } : {}),
   ...(rest.working_hours_start ? { working_hours_start: rest.working_hours_start } : {}),
   ...(rest.working_hours_end ? { working_hours_end: rest.working_hours_end } : {}),
 },
 status: rest.status || "active",
 max_discount_pct: rest.max_discount_pct ?? 0,
 delivery_type: rest.delivery_type || rest.delivery_mode || rest.attributes?.delivery_type || "pickup",
 author_profile_id: identity.id,
 store_id: rest.store_id || null,
 };

  let savedRecord: any = null;

  if (isUpdating) {
    const { data, error } = await supabase
      .from("classifieds")
      .update(payload)
      .eq("id", id)
      .eq("author_profile_id", identity.id)
      .select()
      .single();

    if (error) {
      console.error("Error updating classified:", error);
      throw new Error(error.message || "Falha ao atualizar anúncio.");
    }
    savedRecord = data;
  } else {
    const { data, error } = await supabase
      .from("classifieds")
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error("Error inserting classified:", error);
      throw new Error(error.message || "Falha ao salvar anúncio.");
    }
    savedRecord = data;
  }

  // Telemetria invisível de histórico de rotatividade de ponto comercial (Fase 4 Master Plan)
  if (savedRecord && (savedRecord.category === "business" || savedRecord.attributes?.commercial_point_type)) {
    const address = savedRecord.location_name || savedRecord.location_text || savedRecord.address;
    if (address && address.trim()) {
      (async () => {
        try {
          const city = savedRecord.city || "Chapecó";
          const state = savedRecord.state || "SC";
          const addressNorm = address.trim().toLowerCase();

          const { data: existingPoint } = await supabase
            .from("commercial_point_records")
            .select("id, turnover_count")
            .ilike("address_normalized", `%${addressNorm}%`)
            .maybeSingle();

          let pointId = existingPoint?.id;
          if (!pointId) {
            const { data: newPoint } = await supabase
              .from("commercial_point_records")
              .insert({
                address_normalized: address.trim(),
                city,
                state,
                area_sqm: Number(savedRecord.attributes?.area_sqm) || null,
                point_type: savedRecord.attributes?.commercial_point_type || "loja_rua",
                current_occupant_name: savedRecord.title,
                current_occupant_cnpj: savedRecord.attributes?.company_cnpj || null,
                current_occupant_segment: savedRecord.attributes?.business_segment || "Comércio Geral",
                occupancy_status: savedRecord.attributes?.business_type === "repasse_ponto" ? "transitioning" : "occupied",
                turnover_count: 1,
              })
              .select("id")
              .single();
            pointId = newPoint?.id;
          } else {
            await supabase
              .from("commercial_point_records")
              .update({
                current_occupant_name: savedRecord.title,
                current_occupant_cnpj: savedRecord.attributes?.company_cnpj || null,
                current_occupant_segment: savedRecord.attributes?.business_segment || "Comércio Geral",
                occupancy_status: savedRecord.attributes?.business_type === "repasse_ponto" ? "transitioning" : "occupied",
                turnover_count: ((existingPoint as any)?.turnover_count || 0) + 1,
                updated_at: new Date().toISOString(),
              })
              .eq("id", pointId);
          }

          if (pointId) {
            await supabase.from("commercial_point_turnover").insert({
              commercial_point_id: pointId,
              former_company_name: savedRecord.title,
              former_cnpj: savedRecord.attributes?.company_cnpj || null,
              segment: savedRecord.attributes?.business_segment || "Comércio Geral",
              duration_months: Number(savedRecord.attributes?.contract_remaining_years) 
                ? Math.round(Number(savedRecord.attributes.contract_remaining_years) * 12) 
                : 12,
              reason_for_leaving: savedRecord.attributes?.sale_reason || "Transição Comercial",
              reported_revenue_monthly_cents: savedRecord.attributes?.monthly_revenue_cents || null,
            });
          }
        } catch (telemetryErr: any) {
          console.warn("[classifieds] Telemetria de ponto comercial registrada com fallback:", telemetryErr?.message);
        }
      })().catch(() => {});
    }
  }

  return savedRecord;
 });

export const deleteClassified = createServerFn({ method: "POST" })
 .validator(z.string().uuid())
 .handler(async ({ data: id }) => {
 const supabase = getServerClient();
 const identity = await getIdentity();

 if (!identity || !identity.id) {
 throw new Error("Unauthorized");
 }

 const { error } = await supabase
 .from("classifieds")
 .delete()
 .eq("id", id)
 .eq("author_profile_id", identity.id);

 if (error) {
 console.error("Error deleting classified:", error);
 throw new Error("Failed to delete classified");
 }

 return { success: true };
 });


// ---------------------------------------------------------------------------
// CANDIDATURAS A VAGAS DE CLASSIFICADOS (100% Real no Supabase)
// ---------------------------------------------------------------------------

export const applyToClassifiedJob = createServerFn({ method: "POST" })
 .validator(
 z.object({
 classified_id: z.string().uuid(),
 candidate_name: z.string().min(2, "Nome do candidato é obrigatório"),
 candidate_email: z.string().email().optional(),
 candidate_phone: z.string().optional(),
 education_level: z.string().optional(),
 experience_years: z.string().optional(),
 candidate_role: z.string().optional(),
 resume_url: z.string().optional(),
 resume_snapshot: z.record(z.any()).optional(),
 cover_note: z.string().optional(),
 })
 )
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getIdentity().catch(() => null);

 const { data, error } = await supabase
 .from("classified_applications")
 .insert({
 classified_id: input.classified_id,
 candidate_profile_id: identity?.id || null,
 candidate_name: input.candidate_name,
 candidate_email: input.candidate_email || null,
 candidate_phone: input.candidate_phone || null,
 education_level: input.education_level || null,
 experience_years: input.experience_years || null,
 candidate_role: input.candidate_role || null,
 resume_url: input.resume_url || null,
 resume_snapshot: input.resume_snapshot || {},
 cover_note: input.cover_note || null,
 status: "pending",
 })
 .select()
 .single();

 if (error) {
 console.error("[classifieds] Erro ao aplicar para vaga:", error);
 throw new Error(error.message || "Falha ao enviar candidatura.");
 }

 // Conexão Sistêmica: Se o classificado pertence a uma loja/empresa, gera Lead no Funil Comercial
 const { data: item } = await supabase
 .from("classifieds")
 .select("id, title, store_id")
 .eq("id", input.classified_id)
 .maybeSingle();

 if (item?.store_id) {
 try {
 await supabase
 .from("leads_crm")
 .insert({
 store_id: item.store_id,
 full_name: input.candidate_name.trim(),
 email: input.candidate_email || null,
 phone: input.candidate_phone || null,
 title: `Candidatura: ${item.title}`,
 destination: `Classificado: ${item.title}`,
 source: "site",
 lead_source_detail: "Classificados / Vagas",
 status: "new",
 tags: ["Classificados", "Candidato", input.candidate_role || item.title],
 notes: `Candidatura a vaga via classificados. Cargo pretendido: ${input.candidate_role || "Não informado"}. Experiência: ${input.experience_years || "Não informada"}. Escolaridade: ${input.education_level || "Não informada"}. Nota: ${input.cover_note || "Nenhuma"}.`,
 });
 } catch (err: any) {
 console.warn("[classifieds] Failed to sync to leads_crm:", err);
 }
 }

 return data;
 });

export const listClassifiedJobApplications = createServerFn({ method: "GET" })
 .validator(z.string().uuid())
 .handler(async ({ data: classified_id }) => {
 const supabase = getServerClient();
 const identity = await getIdentity();
 if (!identity?.id) throw new Error("Unauthorized");

 const { data: apps, error } = await supabase
 .from("classified_applications")
 .select("*")
 .eq("classified_id", classified_id)
 .order("created_at", { ascending: false });

 if (error) {
 console.error("[classifieds] Erro ao listar candidaturas:", error);
 return [];
 }

 return apps || [];
 });

export const getDigitalDownloadSignedUrl = createServerFn({ method: "POST" })
  .validator(z.object({ classifiedId: z.string().uuid() }))
  .handler(async ({ data: { classifiedId } }) => {
    const supabase = getServerClient();
    const { data: ad, error } = await supabase
      .from("classifieds")
      .select("id, title, digital_file_url, digital_file_name, is_digital, status")
      .eq("id", classifiedId)
      .single();

    if (error || !ad) throw new Error("Anúncio não encontrado.");
    if (!ad.digital_file_url) throw new Error("Este anúncio não possui arquivo digital anexado.");

    let storagePath = ad.digital_file_url;
    if (storagePath.includes("/classifieds/")) {
      storagePath = storagePath.split("/classifieds/")[1];
    }

    // Se já é uma URL pública direta com https, retorna ela
    if (storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
      return {
        downloadUrl: storagePath,
        fileName: ad.digital_file_name || `${ad.title || "arquivo"}.zip`,
      };
    }

    const { data: signedData, error: signErr } = await supabase
      .storage
      .from("classifieds")
      .createSignedUrl(storagePath, 3600);

    if (signErr) {
      console.warn("[classifieds] createSignedUrl falhou, tentando URL pública:", signErr);
      const { data: pubData } = supabase.storage.from("classifieds").getPublicUrl(storagePath);
      return {
        downloadUrl: pubData.publicUrl,
        fileName: ad.digital_file_name || `${ad.title || "arquivo"}.zip`,
      };
    }

    return {
      downloadUrl: signedData?.signedUrl || ad.digital_file_url,
      fileName: ad.digital_file_name || `${ad.title || "arquivo"}.zip`,
    };
  });

// ---------------------------------------------------------------------------
// RECURRING SUBSCRIPTIONS & RENTS ENGINE (Waesy Subscriptions)
// ---------------------------------------------------------------------------

export const subscribeToClassifiedPlan = createServerFn({ method: "POST" })
  .validator(
    z.object({
      classifiedId: z.string().uuid(),
      notes: z.string().optional(),
      paymentMethod: z.enum(["pix", "credit_card", "bank_transfer", "cash"]).default("pix"),
      pixKey: z.string().optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity || !identity.id) {
      throw new Error("Identifique-se para assinar este plano.");
    }

    // Busca o anúncio para verificar se é recorrente e obter o vendedor
    const { data: ad, error: adErr } = await supabase
      .from("classifieds")
      .select("id, author_profile_id, price_cents, pricing_model, billing_cycle, setup_fee_cents, title")
      .eq("id", input.classifiedId)
      .single();

    if (adErr || !ad) {
      throw new Error("Anúncio não encontrado.");
    }

    if (ad.author_profile_id === identity.id) {
      throw new Error("Você não pode assinar o seu próprio anúncio.");
    }

    const priceCents = ad.price_cents || 0;
    const billingCycle = ad.billing_cycle || "monthly";
    const setupFeeCents = ad.setup_fee_cents || 0;

    // Calcula a data da próxima fatura
    const nextDate = new Date();
    if (billingCycle === "yearly") {
      nextDate.setFullYear(nextDate.getFullYear() + 1);
    } else if (billingCycle === "semiannual") {
      nextDate.setMonth(nextDate.getMonth() + 6);
    } else if (billingCycle === "quarterly") {
      nextDate.setMonth(nextDate.getMonth() + 3);
    } else {
      nextDate.setMonth(nextDate.getMonth() + 1);
    }

    const { data: sub, error: subErr } = await supabase
      .from("classified_subscriptions")
      .insert({
        classified_id: ad.id,
        subscriber_profile_id: identity.id,
        seller_profile_id: ad.author_profile_id,
        status: "active",
        billing_cycle: billingCycle,
        price_cents: priceCents,
        setup_fee_paid_cents: setupFeeCents,
        next_billing_date: nextDate.toISOString().split("T")[0],
        last_payment_date: new Date().toISOString(),
        subscriber_notes: input.notes || null,
        payment_method: input.paymentMethod,
        pix_key: input.pixKey || null,
      })
      .select()
      .single();

    if (subErr) {
      console.error("[classifieds] Erro ao criar assinatura:", subErr);
      throw new Error(subErr.message || "Erro ao registrar assinatura.");
    }

    return sub;
  });

export const listMyClassifiedSubscriptions = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity || !identity.id) return [];

    const { data, error } = await supabase
      .from("classified_subscriptions")
      .select(`
        *,
        classified:classified_id (
          id,
          title,
          category,
          images,
          location_name,
          contact_whatsapp
        ),
        seller:seller_profile_id (
          id,
          full_name,
          avatar_url,
          phone
        )
      `)
      .eq("subscriber_profile_id", identity.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[classifieds] listMyClassifiedSubscriptions error:", error);
      return [];
    }

    return data || [];
  });

export const listSellerClassifiedSubscriptions = createServerFn({ method: "GET" })
  .handler(async () => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity || !identity.id) {
      return { subscriptions: [], metrics: { mrrCents: 0, activeCount: 0, totalCount: 0 } };
    }

    const { data, error } = await supabase
      .from("classified_subscriptions")
      .select(`
        *,
        classified:classified_id (
          id,
          title,
          category,
          images,
          pricing_model,
          billing_cycle
        ),
        subscriber:subscriber_profile_id (
          id,
          full_name,
          avatar_url,
          phone
        )
      `)
      .eq("seller_profile_id", identity.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[classifieds] listSellerClassifiedSubscriptions error:", error);
      return { subscriptions: [], metrics: { mrrCents: 0, activeCount: 0, totalCount: 0 } };
    }

    const subs = data || [];
    const activeSubs = subs.filter((s: any) => s.status === "active");

    // Calcula MRR estimado considerando ciclos
    const mrrCents = activeSubs.reduce((acc: number, item: any) => {
      const price = item.price_cents || 0;
      if (item.billing_cycle === "yearly") return acc + Math.round(price / 12);
      if (item.billing_cycle === "semiannual") return acc + Math.round(price / 6);
      if (item.billing_cycle === "quarterly") return acc + Math.round(price / 3);
      return acc + price;
    }, 0);

    return {
      subscriptions: subs,
      metrics: {
        mrrCents,
        activeCount: activeSubs.length,
        totalCount: subs.length,
      },
    };
  });

export const updateSubscriptionStatus = createServerFn({ method: "POST" })
  .validator(
    z.object({
      subscriptionId: z.string().uuid(),
      status: z.enum(["active", "past_due", "paused", "canceled"]),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity || !identity.id) throw new Error("Unauthorized");

    const { data, error } = await supabase
      .from("classified_subscriptions")
      .update({ status: input.status, updated_at: new Date().toISOString() })
      .eq("id", input.subscriptionId)
      .or(`seller_profile_id.eq.${identity.id},subscriber_profile_id.eq.${identity.id}`)
      .select()
      .single();

    if (error) throw new Error(error.message || "Erro ao atualizar status da assinatura.");
    return data;
  });

export const recordSubscriptionPayment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      subscriptionId: z.string().uuid(),
    }),
  )
  .handler(async ({ data: { subscriptionId } }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity || !identity.id) throw new Error("Unauthorized");

    // Apenas o vendedor pode registrar recebimento de pagamento
    const { data: sub, error: fetchErr } = await supabase
      .from("classified_subscriptions")
      .select("id, billing_cycle, next_billing_date")
      .eq("id", subscriptionId)
      .eq("seller_profile_id", identity.id)
      .single();

    if (fetchErr || !sub) throw new Error("Assinatura não encontrada ou sem autorização.");

    const currentDate = new Date(sub.next_billing_date || new Date());
    if (sub.billing_cycle === "yearly") {
      currentDate.setFullYear(currentDate.getFullYear() + 1);
    } else if (sub.billing_cycle === "semiannual") {
      currentDate.setMonth(currentDate.getMonth() + 6);
    } else if (sub.billing_cycle === "quarterly") {
      currentDate.setMonth(currentDate.getMonth() + 3);
    } else {
      currentDate.setMonth(currentDate.getMonth() + 1);
    }

    const { data, error } = await supabase
      .from("classified_subscriptions")
      .update({
        status: "active",
        last_payment_date: new Date().toISOString(),
        next_billing_date: currentDate.toISOString().split("T")[0],
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscriptionId)
      .select()
      .single();

    if (error) throw new Error(error.message || "Erro ao confirmar pagamento da mensalidade.");
    return data;
  });

// ---------------------------------------------------------------------------
// TELEMETRY & AD BOOSTING ENGINE (100% Real no Supabase | Zero Mocks)
// ---------------------------------------------------------------------------

export const trackClassifiedView = createServerFn({ method: "POST" })
  .validator(z.object({ adId: z.string().uuid() }))
  .handler(async ({ data: { adId } }) => {
    const supabase = getServerClient();
    try {
      // Tenta via RPC atômico primeiro
      const { error: rpcErr } = await supabase.rpc("increment_classified_view", { ad_id: adId });
      if (rpcErr) {
        // Fallback defensivo com update direto
        const { data: current } = await supabase.from("classifieds").select("views_count").eq("id", adId).single();
        if (current) {
          await supabase
            .from("classifieds")
            .update({ views_count: (current.views_count || 0) + 1 })
            .eq("id", adId);
        }
      }
      return { success: true };
    } catch (err) {
      console.warn("[classifieds] trackClassifiedView warning:", err);
      return { success: false };
    }
  });

export const trackClassifiedWhatsAppClick = createServerFn({ method: "POST" })
  .validator(z.object({ adId: z.string().uuid() }))
  .handler(async ({ data: { adId } }) => {
    const supabase = getServerClient();
    try {
      // Tenta via RPC atômico primeiro
      const { error: rpcErr } = await supabase.rpc("increment_classified_click", { ad_id: adId });
      if (rpcErr) {
        // Fallback defensivo com update direto
        const { data: current } = await supabase.from("classifieds").select("clicks_count").eq("id", adId).single();
        if (current) {
          await supabase
            .from("classifieds")
            .update({ clicks_count: (current.clicks_count || 0) + 1 })
            .eq("id", adId);
        }
      }
      return { success: true };
    } catch (err) {
      console.warn("[classifieds] trackClassifiedWhatsAppClick warning:", err);
      return { success: false };
    }
  });

// ============================================================
// BOOST PAYMENTS — Gateway Real de Pagamento
// Zero-Mock Policy: boost só ativa APÓS pagamento confirmado
// ============================================================

const BOOST_PLAN_PRICES: Record<number, number> = {
  7: 1990,
  15: 3490,
  30: 5990,
};

/**
 * Verifica se há um gateway de pagamento configurado na plataforma.
 * Consultado pela UI ANTES de abrir o modal de checkout.
 * Se não houver provider, o botão é bloqueado e o modal não abre.
 */
export const getBoostPaymentStatus = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();

  // Busca configurações da loja raiz da plataforma (gateway global)
  const { data: store } = await supabase
    .from("stores")
    .select("settings")
    .or("slug.eq.waesy-matriz,is_platform_root.eq.true")
    .limit(1)
    .maybeSingle();

  const settings = (store?.settings as Record<string, any>) || {};
  const integrations = (settings.integrations as Record<string, any>) || {};

  const hasAsaas = !!(integrations.asaas_api_key && integrations.asaas_api_key.length > 10);
  const hasStripe = !!(integrations.stripe_secret_key && integrations.stripe_secret_key.length > 10);

  // Determina provider ativo (Asaas tem prioridade por ser brasileiro/PIX nativo)
  const activeProvider = hasAsaas ? "asaas" : hasStripe ? "stripe" : null;

  return {
    available: !!activeProvider,
    provider: activeProvider as "asaas" | "stripe" | null,
    message: activeProvider
      ? `Gateway ${activeProvider === "asaas" ? "Asaas (PIX/Boleto/Cartão)" : "Stripe"} configurado e ativo.`
      : "Nenhum gateway de pagamento configurado. Configure em /admin-master/integracoes.",
  };
});

/**
 * Inicia um pagamento de boost real via gateway configurado.
 * Cria registro pendente em classified_boost_payments.
 * Retorna instrução de pagamento (QR Code PIX ou link).
 */
export const initiateBoostPayment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      adId: z.string().uuid(),
      planDays: z.union([z.literal(7), z.literal(15), z.literal(30)]),
    })
  )
  .handler(async ({ data: { adId, planDays } }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();

    if (!identity?.id) {
      throw new Error("Você precisa estar autenticado para impulsionar um anúncio.");
    }

    // 1. Valida autoria do anúncio
    const { data: classified, error: classifiedErr } = await supabase
      .from("classifieds")
      .select("id, author_profile_id, title")
      .eq("id", adId)
      .single();

    if (classifiedErr || !classified) throw new Error("Anúncio não encontrado.");

    const isAdmin = identity.role === "admin" || identity.role === "master";
    if (classified.author_profile_id !== identity.id && !isAdmin) {
      throw new Error("Você não tem autorização para impulsionar este anúncio.");
    }

    // 2. Verifica gateway configurado — Zero Mock Policy
    const { data: store } = await supabase
      .from("stores")
      .select("settings")
      .or("slug.eq.waesy-matriz,is_platform_root.eq.true")
      .limit(1)
      .maybeSingle();

    const settings = (store?.settings as Record<string, any>) || {};
    const integrations = (settings.integrations as Record<string, any>) || {};

    const asaasKey = integrations.asaas_api_key;
    const stripeKey = integrations.stripe_secret_key;

    const hasAsaas = !!(asaasKey && asaasKey.length > 10 && !asaasKey.includes("••••"));
    const hasStripe = !!(stripeKey && stripeKey.length > 10 && !stripeKey.includes("••••"));
    const activeProvider: "asaas" | "stripe" | null = hasAsaas ? "asaas" : hasStripe ? "stripe" : null;

    // Se não há gateway: bloqueia completamente — sem fallback simulado
    if (!activeProvider) {
      throw new Error(
        "Nenhum gateway de pagamento está configurado na plataforma. " +
        "Configure Asaas ou Stripe em /admin-master/integracoes para habilitar o impulsionamento."
      );
    }

    const amountCents = BOOST_PLAN_PRICES[planDays];
    const planName = `Destaque ${planDays} dias`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    let providerRef: string | null = null;
    let pixQrCode: string | null = null;
    let pixCopyPaste: string | null = null;
    let paymentLink: string | null = null;
    let providerPayload: Record<string, any> = {};

    // 3. Chama o provider real
    if (activeProvider === "asaas") {
      // --- ASAAS: Gera cobrança PIX ---
      // Determina se é sandbox (chave começa com $aact_) ou produção
      const isAsaasSandbox = asaasKey.startsWith("$aact_");
      const asaasBaseUrl = isAsaasSandbox
        ? "https://sandbox.asaas.com/api/v3"
        : "https://api.asaas.com/api/v3";

      // Busca email e nome do usuário no banco (identity não tem esses campos)
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("name, username, email")
        .eq("id", identity.id!)
        .maybeSingle();

      const userEmail = (userProfile as any)?.email || "";
      const userName = (userProfile as any)?.name || (userProfile as any)?.username || "Usuário Waesy";

      // Primeiro: verifica/cria customer no Asaas
      let asaasCustomerId: string | null = null;
      try {
        const customerRes = await fetch(`${asaasBaseUrl}/customers?email=${encodeURIComponent(userEmail)}`, {
          headers: { "access_token": asaasKey, "Content-Type": "application/json" },
        });
        const customerData = await customerRes.json();
        if (customerData?.data?.[0]?.id) {
          asaasCustomerId = customerData.data[0].id;
        } else {
          // Cria customer
          const createRes = await fetch(`${asaasBaseUrl}/customers`, {
            method: "POST",
            headers: { "access_token": asaasKey, "Content-Type": "application/json" },
            body: JSON.stringify({
              name: userName,
              email: userEmail || undefined,
            }),
          });
          const created = await createRes.json();
          asaasCustomerId = created?.id || null;
        }
      } catch (e) {
        console.error("[boost] Asaas customer lookup error:", e);
      }

      if (!asaasCustomerId) {
        throw new Error("Não foi possível criar o cliente no gateway de pagamento. Tente novamente.");
      }

      // Gera cobrança PIX
      const dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 dias
      const dueDateStr = dueDate.toISOString().split("T")[0];

      const chargeRes = await fetch(`${asaasBaseUrl}/payments`, {
        method: "POST",
        headers: { "access_token": asaasKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: asaasCustomerId,
          billingType: "PIX",
          value: amountCents / 100,
          dueDate: dueDateStr,
          description: `Waesy — ${planName} para anúncio "${classified.title}"`,
          externalReference: adId,
        }),
      });

      if (!chargeRes.ok) {
        const errBody = await chargeRes.json().catch(() => ({}));
        console.error("[boost] Asaas charge error:", errBody);
        throw new Error("Erro ao gerar cobrança PIX. Verifique as credenciais do gateway.");
      }

      const charge = await chargeRes.json();
      providerRef = charge?.id || null;
      paymentLink = charge?.invoiceUrl || null;
      providerPayload = charge;

      // Busca QR Code PIX
      if (providerRef) {
        try {
          const pixRes = await fetch(`${asaasBaseUrl}/payments/${providerRef}/pixQrCode`, {
            headers: { "access_token": asaasKey },
          });
          if (pixRes.ok) {
            const pixData = await pixRes.json();
            pixQrCode = pixData?.encodedImage || null;
            pixCopyPaste = pixData?.payload || null;
          }
        } catch (e) {
          console.error("[boost] Asaas PIX QR error:", e);
        }
      }
    } else if (activeProvider === "stripe") {
      // --- STRIPE: Gera Payment Intent ---
      const stripeRes = await fetch("https://api.stripe.com/v1/payment_intents", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          amount: String(amountCents),
          currency: "brl",
          description: `Waesy — ${planName} para anúncio "${classified.title}"`,
          metadata: JSON.stringify({ ad_id: adId, plan_days: String(planDays) }),
        }),
      });

      if (!stripeRes.ok) {
        const errBody = await stripeRes.json().catch(() => ({}));
        console.error("[boost] Stripe payment intent error:", errBody);
        throw new Error("Erro ao gerar intenção de pagamento. Verifique as credenciais do gateway.");
      }

      const intent = await stripeRes.json();
      providerRef = intent?.id || null;
      paymentLink = null; // Stripe usa client_secret na UI
      providerPayload = { client_secret: intent?.client_secret, id: intent?.id };
    }

    // 4. Registra transação pendente no banco
    const { data: boostPayment, error: insertErr } = await supabase
      .from("classified_boost_payments")
      .insert({
        classified_id: adId,
        profile_id: identity.id,
        plan_days: planDays,
        plan_name: planName,
        amount_cents: amountCents,
        provider: activeProvider,
        provider_ref: providerRef,
        provider_payload: providerPayload,
        status: "pending",
        pix_qr_code: pixQrCode,
        pix_copy_paste: pixCopyPaste,
        payment_link: paymentLink,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertErr || !boostPayment) {
      console.error("[boost] insert classified_boost_payments error:", insertErr);
      throw new Error("Erro ao registrar transação de pagamento. Tente novamente.");
    }

    return {
      success: true,
      boostPaymentId: boostPayment.id,
      provider: activeProvider,
      amountCents,
      planName,
      planDays,
      pixQrCode,
      pixCopyPaste,
      paymentLink,
      stripeClientSecret: activeProvider === "stripe" ? (providerPayload as any).client_secret : null,
      expiresAt: expiresAt.toISOString(),
      adTitle: classified.title,
    };
  });

/**
 * Ativa o boost no anúncio classificado.
 * Chamado APENAS pelo admin ou webhook do provider após pagamento confirmado.
 * NUNCA chamado diretamente pela UI do usuário.
 */
export const confirmBoostPaymentAdmin = createServerFn({ method: "POST" })
  .validator(
    z.object({
      boostPaymentId: z.string().uuid(),
      method: z.enum(["admin_manual", "webhook"]).default("admin_manual"),
    })
  )
  .handler(async ({ data: { boostPaymentId, method } }) => {
    const supabase = getServerClient();

    // Somente admins podem confirmar manualmente
    if (method === "admin_manual") {
      await requireAdmin();
    }

    const identity = await getIdentity();

    // Busca o boost payment
    const { data: bp, error: bpErr } = await supabase
      .from("classified_boost_payments")
      .select("id, classified_id, plan_days, plan_name, status")
      .eq("id", boostPaymentId)
      .single();

    if (bpErr || !bp) throw new Error("Transação de boost não encontrada.");
    if (bp.status === "paid") throw new Error("Este boost já foi ativado.");
    if (bp.status !== "pending") throw new Error(`Boost em estado inválido: ${bp.status}`);

    const now = new Date().toISOString();
    const boostedUntil = new Date(Date.now() + bp.plan_days * 24 * 60 * 60 * 1000).toISOString();

    // Atualiza o boost payment para 'paid'
    const { error: payErr } = await supabase
      .from("classified_boost_payments")
      .update({
        status: "paid",
        paid_at: now,
        activated_at: now,
        confirmed_by: identity?.id || null,
      })
      .eq("id", boostPaymentId);

    if (payErr) throw new Error("Erro ao confirmar pagamento do boost.");

    // Ativa o boost no anúncio (SOMENTE aqui, após pagamento)
    const { error: boostErr } = await supabase
      .from("classifieds")
      .update({
        is_boosted: true,
        boosted_until: boostedUntil,
        boost_plan: bp.plan_name,
        boosted_at: now,
        updated_at: now,
      })
      .eq("id", bp.classified_id);

    if (boostErr) {
      console.error("[boost] activate classified error:", boostErr);
      throw new Error("Pagamento confirmado mas erro ao ativar o destaque. Contate o suporte.");
    }

    return {
      success: true,
      classifiedId: bp.classified_id,
      boostedUntil,
      plan: bp.plan_name,
    };
  });

/**
 * Lista os pagamentos de boost para o painel admin.
 */
export const listBoostPayments = createServerFn({ method: "GET" })
  .validator(
    z.object({
      status: z.enum(["pending", "paid", "failed", "refunded", "expired", "all"]).optional().default("all"),
      limit: z.number().int().min(1).max(100).optional().default(50),
    }).optional()
  )
  .handler(async ({ data }) => {
    await requireAdmin();
    const supabase = getServerClient();

    const status = data?.status ?? "all";
    const limit = data?.limit ?? 50;

    let query = supabase
      .from("classified_boost_payments")
      .select(`
        id,
        classified_id,
        profile_id,
        plan_days,
        plan_name,
        amount_cents,
        provider,
        provider_ref,
        status,
        payment_link,
        paid_at,
        activated_at,
        expires_at,
        failure_reason,
        created_at,
        profiles!profile_id(id, name, username, avatar_url),
        classifieds!classified_id(id, title, category)
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data: results, error } = await query;
    if (error) {
      console.error("[boost] listBoostPayments error:", error);
      return [];
    }

    return results || [];
  });

/**
 * Consulta o status de um boost payment específico (para polling da UI).
 */
export const getBoostPaymentById = createServerFn({ method: "GET" })
  .validator(z.object({ boostPaymentId: z.string().uuid() }))
  .handler(async ({ data: { boostPaymentId } }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Não autenticado.");

    const { data, error } = await supabase
      .from("classified_boost_payments")
      .select("id, status, paid_at, activated_at, expires_at, pix_qr_code, pix_copy_paste, payment_link, amount_cents, plan_name, plan_days, provider")
      .eq("id", boostPaymentId)
      .eq("profile_id", identity.id)
      .single();

    if (error || !data) throw new Error("Transação não encontrada.");
    return data;
  });

// Mantido para compatibilidade com imports antigos — agora é alias seguro
// que retorna erro se não há gateway configurado.
export const boostClassifiedAd = initiateBoostPayment;

/**
 * Refina título, descrição persuasiva e tags do classificado via Pool Unificado de IA.
 * Pure handler desacoplado para testes e uso interno.
 */
export async function internalRefineClassifiedWithAI(options: {
  title?: string;
  description?: string;
  niche?: string;
}) {
  const title = options.title || "";
  const description = options.description || "";
  const niche = options.niche || "desapego";

  const systemPrompt = `Você é um Copywriter e Especialista em Classificados de alta conversão da plataforma Waesy.
O usuário fornecerá um título preliminar e/ou descrição de um anúncio do nicho "${niche}".
Sua tarefa é aprimorar o anúncio mantendo a fidelidade total aos fatos, tornando a linguagem persuasiva, elegante, clara e estruturada.
Formate a descrição com parágrafos curtos e tópicos (bullet points) destacando diferenciais, estado de conservação, garantias ou especificações técnicas.
Retorne APENAS um JSON válido no seguinte formato:
{
  "title": "Título refinado, direto e atraente (máx 80 caracteres)",
  "description": "Texto estruturado e persuasivo para o anúncio",
  "suggestedTags": ["tag1", "tag2", "tag3"]
}
Sem blocos de código markdown adicionais fora do JSON.`;

  const userPrompt = `Nicho: ${niche}\nTítulo atual: ${title || "Não informado"}\nDescrição atual: ${description || "Não informada"}\n\nPor favor, aprimore e retorne o JSON.`;

  try {
    const res = await executeUnifiedAiCall({
      systemPrompt,
      userPrompt,
      responseFormat: "json_object",
      maxTokens: 800,
      temperature: 0.3,
    });

    const parsed = res.parsedJson || JSON.parse(res.content);
    return {
      success: true,
      title: (parsed.title || title).trim(),
      description: (parsed.description || description).trim(),
      suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : [],
    };
  } catch (err: any) {
    console.warn("[classifieds] refineClassifiedWithAI fallback defensivo:", err?.message);
    return {
      success: false,
      title,
      description,
      suggestedTags: [],
      message: err?.message || "Não foi possível conectar ao motor de IA no momento.",
    };
  }
}

/**
 * Server Function para refinar anúncios via IA a partir da interface do usuário.
 */
export const refineClassifiedWithAI = createServerFn({ method: "POST" })
  .validator(
    z.object({
      title: z.string().optional().default(""),
      description: z.string().optional().default(""),
      niche: z.string().optional().default("desapego"),
    })
  )
  .handler(async ({ data }) => internalRefineClassifiedWithAI(data));

// ============================================================================
// TERMOS DE CONFIDENCIALIDADE (NDA DIGITAL) — 100% REAL COM PERSISTÊNCIA
// ============================================================================

/**
 * Assina digitalmente o termo de confidencialidade (NDA) para revelar dados
 * financeiros e estratégicos de anúncios de empresas e pontos comerciais.
 */
export const signClassifiedNda = createServerFn({ method: "POST" })
  .validator(
    z.object({
      classifiedId: z.string().uuid("ID de anúncio inválido"),
      signerName: z.string().min(3, "Nome completo é obrigatório"),
      signerEmail: z.string().email("E-mail corporativo válido é obrigatório"),
      signerDocument: z.string().min(11, "CPF ou CNPJ válido é obrigatório"),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getIdentity();
    if (!identity?.id) {
      throw new Error("É necessário estar autenticado para assinar o termo de confidencialidade.");
    }

    const supabase = getServerClient();

    // 1. Validar que o anúncio existe e exige NDA
    const { data: classified, error: classifiedErr } = await supabase
      .from("classified_ads")
      .select("id, owner_id, title, attributes")
      .eq("id", data.classifiedId)
      .maybeSingle();

    if (classifiedErr || !classified) {
      throw new Error("Oportunidade não encontrada.");
    }

    // Se o usuário é o próprio anunciante, não precisa assinar
    if (classified.owner_id === identity.id) {
      return {
        success: true,
        alreadyOwner: true,
        message: "Você é o proprietário deste anúncio.",
      };
    }

    // 2. Extrair dados de auditoria de rede se disponível
    let ipAddress: string | null = null;
    let userAgent: string | null = null;
    try {
      const { getRequest } = await import("@tanstack/start-server-core");
      const req = getRequest();
      if (req) {
        ipAddress = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || null;
        userAgent = req.headers.get("user-agent") || null;
      }
    } catch {
      // Ignora erro em ambientes de teste
    }

    // 3. Registrar assinatura no banco de dados com RLS
    const { data: record, error: signErr } = await supabase
      .from("classified_nda_signatures")
      .upsert(
        {
          classified_id: data.classifiedId,
          user_id: identity.id,
          signer_name: data.signerName.trim(),
          signer_email: data.signerEmail.trim().toLowerCase(),
          signer_document: data.signerDocument.trim(),
          ip_address: ipAddress,
          user_agent: userAgent,
          status: "active",
          signed_at: new Date().toISOString(),
        },
        { onConflict: "classified_id, user_id" }
      )
      .select("id, signed_at")
      .single();

    if (signErr) {
      console.error("[signClassifiedNda] Erro ao registrar assinatura:", signErr);
      throw new Error("Falha ao salvar assinatura digital do termo: " + signErr.message);
    }

    return {
      success: true,
      signatureId: record.id,
      signedAt: record.signed_at,
      message: "Termo de confidencialidade assinado com sucesso! Dados liberados.",
    };
  });

/**
 * Consulta se o usuário autenticado já assinou o NDA de um anúncio específico.
 */
export const checkClassifiedNdaStatus = createServerFn({ method: "GET" })
  .validator(
    z.object({
      classifiedId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getIdentity().catch(() => null);
    if (!identity?.id) {
      return { isSigned: false, isOwner: false };
    }

    const supabase = getServerClient();

    // 1. Verificar se é o proprietário
    const { data: classified } = await supabase
      .from("classified_ads")
      .select("owner_id")
      .eq("id", data.classifiedId)
      .maybeSingle();

    if (classified?.owner_id === identity.id) {
      return { isSigned: true, isOwner: true };
    }

    // 2. Verificar assinatura ativa
    const { data: signature } = await supabase
      .from("classified_nda_signatures")
      .select("id, signed_at")
      .eq("classified_id", data.classifiedId)
      .eq("user_id", identity.id)
      .eq("status", "active")
      .maybeSingle();

    return {
      isSigned: !!signature,
      signedAt: signature?.signed_at || null,
      isOwner: false,
    };
  });

/**
 * Lista todos os investidores que assinaram o NDA para o proprietário do anúncio.
 */
export const listClassifiedNdaSignatures = createServerFn({ method: "GET" })
  .validator(
    z.object({
      classifiedId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Não autenticado");

    const supabase = getServerClient();

    // Validar autoridade do proprietário ou admin
    const { data: classified } = await supabase
      .from("classified_ads")
      .select("id, owner_id, title")
      .eq("id", data.classifiedId)
      .single();

    if (!classified) throw new Error("Anúncio não encontrado");

    if (classified.owner_id !== identity.id && identity.role !== "admin") {
      throw new Error("Apenas o anunciante pode auditar os termos de sigilo deste anúncio.");
    }

    const { data: signatures, error } = await supabase
      .from("classified_nda_signatures")
      .select("id, signer_name, signer_email, signer_document, signed_at, status")
      .eq("classified_id", data.classifiedId)
      .order("signed_at", { ascending: false });

    if (error) {
      throw new Error("Erro ao listar assinaturas de sigilo: " + error.message);
    }

    // Mascarar CPF/CNPJ para conformidade LGPD
    return (signatures || []).map((sig) => {
      const doc = sig.signer_document || "";
      const maskedDoc = doc.length > 6
        ? `${doc.slice(0, 3)}.***.${doc.slice(-2)}`
        : "***";

      return {
        id: sig.id,
        signerName: sig.signer_name,
        signerEmail: sig.signer_email,
        signerDocumentMasked: maskedDoc,
        signedAt: sig.signed_at,
        status: sig.status,
      };
    });
  });

// ---------------------------------------------------------------------------
// CONVERSÃO DE ANÚNCIO PARA WORKSPACE PRO (FASE 5: Estabilidade & Pontes Pro)
// ---------------------------------------------------------------------------

export const ConvertClassifiedToWorkspaceStoreSchema = z.object({
  classifiedId: z.string().uuid(),
  customStoreName: z.string().optional(),
});

export const convertClassifiedToWorkspaceStore = createServerFn({ method: "POST" })
  .validator(ConvertClassifiedToWorkspaceStoreSchema)
  .handler(async ({ data: { classifiedId, customStoreName } }) => {
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Sessão não autenticada.");

    const db = getServerClient();

    // 1. Buscar o anúncio
    const { data: classified, error: classError } = await db
      .from("classifieds")
      .select("*")
      .eq("id", classifiedId)
      .single();

    if (classError || !classified) {
      throw new Error("Anúncio não encontrado.");
    }

    // 2. Validar se o usuário é o autor do anúncio
    const authorId = classified.author_id;
    if (authorId && authorId !== identity.id && identity.role !== "admin") {
      throw new Error("Apenas o autor do anúncio pode convertê-lo em Loja Pro no Workspace.");
    }

    // 3. Se já possuir loja vinculada, retornar os dados da loja existente
    if (classified.store_id) {
      const { data: existingStore } = await db
        .from("stores")
        .select("id, name, slug")
        .eq("id", classified.store_id)
        .maybeSingle();

      if (existingStore) {
        return {
          success: true,
          storeId: existingStore.id,
          storeSlug: existingStore.slug,
          isExisting: true,
          redirectUrl: "/workspace",
        };
      }
    }

    // 4. Criar organização e loja profissional
    const storeName = customStoreName || classified.title || "Minha Empresa";
    const baseSlug = storeName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "empresa";
    const uniqueSlug = `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;

    const { data: org, error: orgErr } = await db
      .from("organizations")
      .insert({
        name: storeName,
        slug: uniqueSlug,
      })
      .select("id")
      .single();

    if (orgErr || !org) {
      throw new Error("Falha ao criar organização para a nova loja: " + (orgErr?.message || "Erro desconhecido"));
    }

    const attrs = classified.attributes || {};
    const storeSettings: Record<string, any> = {
      type: attrs.business_segment || classified.category || "negocios",
      segment: attrs.business_segment || attrs.sub_niche || classified.category || "negocios",
      niche: attrs.niche || classified.category || "negocios",
      logoUrl: classified.images?.[0] || null,
      bannerUrl: classified.images?.[1] || classified.images?.[0] || null,
      origin_classified_id: classified.id,
      converted_from_classified_at: new Date().toISOString(),
      niche_attributes: attrs,
      commercial_point: attrs.commercial_point_type || null,
      point_id: attrs.point_id || null,
      token_wallet: {
        balance: 50_000,
        lifetime_purchased: 50_000,
        lifetime_consumed: 0,
        estimated_time_saved_hours: 24.0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };

    const { data: store, error: storeErr } = await db
      .from("stores")
      .insert({
        organization_id: org.id,
        name: storeName,
        slug: uniqueSlug,
        cnpj: attrs.company_cnpj || null,
        city: classified.location_name || attrs.city || "Chapecó",
        phone: classified.contact_whatsapp || classified.contact_phone || null,
        logo_url: classified.images?.[0] || null,
        banner_url: classified.images?.[1] || classified.images?.[0] || null,
        settings: storeSettings,
      })
      .select("id, name, slug")
      .single();

    if (storeErr || !store) {
      throw new Error("Falha ao criar loja profissional: " + (storeErr?.message || "Erro desconhecido"));
    }

    // 5. Vincular usuário como proprietário (owner)
    try {
      await db.from("workspace_members").upsert(
        {
          profile_id: identity.id,
          store_id: store.id,
          role: "owner",
        },
        { onConflict: "profile_id,store_id" }
      );
    } catch (e: any) {
      console.warn("[convertClassifiedToWorkspaceStore] workspace_members upsert warning:", e?.message);
    }

    // 6. Atualizar anúncio vinculando ao store_id recém-criado
    await db
      .from("classifieds")
      .update({
        store_id: store.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", classified.id);

    // 7. Se houver ponto comercial com endereço, vincular telemetria física
    if (attrs.point_id) {
      try {
        await db
          .from("commercial_point_records")
          .update({
            current_occupant_name: store.name,
            occupancy_status: "occupied",
            updated_at: new Date().toISOString(),
          })
          .eq("id", attrs.point_id);
      } catch {
        // Silencioso
      }
    }

    return {
      success: true,
      storeId: store.id,
      storeSlug: store.slug,
      isExisting: false,
      redirectUrl: "/workspace",
    };
  });

// ---------------------------------------------------------------------------
// GESTÃO WORKSPACE: NEGÓCIOS / M&A, NDAs E DOAÇÕES (FASE 3 & FASE 5)
// ---------------------------------------------------------------------------

/**
 * Lista todos os anúncios de negócios, empresas e pontos comerciais pertencentes à loja / lojista.
 */
export const listStoreBusinessClassifieds = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await getIdentity();
  if (!identity?.id) throw new Error("Não autenticado");

  const supabase = getServerClient();
  let query = supabase
    .from("classifieds")
    .select("*")
    .order("created_at", { ascending: false });

  if (identity.store_id) {
    query = query.or(`store_id.eq.${identity.store_id},author_profile_id.eq.${identity.id}`);
  } else {
    query = query.eq("author_profile_id", identity.id);
  }

  const { data, error } = await query;
  if (error) throw new Error("Erro ao buscar negócios da loja: " + error.message);

  return (data || []).filter((item: any) => {
    return (
      item.category === "business" ||
      item.attributes?.niche === "business" ||
      Boolean(item.attributes?.is_business_sale)
    );
  });
});

/**
 * Lista todos os termos de sigilo (NDAs) assinados por investidores/compradores para empresas da loja.
 */
export const listStoreAllNdaSignatures = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await getIdentity();
  if (!identity?.id) throw new Error("Não autenticado");

  const supabase = getServerClient();
  let adsQuery = supabase.from("classifieds").select("id, title");
  if (identity.store_id) {
    adsQuery = adsQuery.or(`store_id.eq.${identity.store_id},author_profile_id.eq.${identity.id}`);
  } else {
    adsQuery = adsQuery.eq("author_profile_id", identity.id);
  }

  const { data: ads, error: adsErr } = await adsQuery;
  if (adsErr || !ads || ads.length === 0) return [];

  const adIds = ads.map((a: any) => a.id);
  const adMap = new Map(ads.map((a: any) => [a.id, a.title]));

  const { data: signatures, error: sigErr } = await supabase
    .from("classified_nda_signatures")
    .select("id, classified_id, signer_name, signer_email, signer_document, signed_at, ip_address, status")
    .in("classified_id", adIds)
    .order("signed_at", { ascending: false });

  if (sigErr) {
    console.warn("[listStoreAllNdaSignatures] Erro ou tabela sem registros:", sigErr.message);
    return [];
  }

  return (signatures || []).map((sig: any) => {
    const doc = sig.signer_document || "";
    const maskedDoc = doc.length > 6 ? `${doc.slice(0, 3)}.***.${doc.slice(-2)}` : "***";
    return {
      id: sig.id,
      classifiedId: sig.classified_id,
      classifiedTitle: adMap.get(sig.classified_id) || "Empresa / Ponto Comercial",
      signerName: sig.signer_name,
      signerEmail: sig.signer_email,
      signerDocumentMasked: maskedDoc,
      signedAt: sig.signed_at,
      ipAddress: sig.ip_address || "Não registrado",
      status: sig.status,
    };
  });
});

/**
 * Lista todas as doações e campanhas de solidariedade promovidas pela loja.
 */
export const listStoreDonations = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await getIdentity();
  if (!identity?.id) throw new Error("Não autenticado");

  const supabase = getServerClient();
  let query = supabase
    .from("classifieds")
    .select("*")
    .order("created_at", { ascending: false });

  if (identity.store_id) {
    query = query.or(`store_id.eq.${identity.store_id},author_profile_id.eq.${identity.id}`);
  } else {
    query = query.eq("author_profile_id", identity.id);
  }

  const { data, error } = await query;
  if (error) throw new Error("Erro ao buscar doações: " + error.message);

  return (data || []).filter((item: any) => {
    return (
      item.category === "donation" ||
      item.attributes?.niche === "donation" ||
      item.attributes?.niche === "doacao"
    );
  });
});
