import { createServerFn } from "@tanstack/react-start";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { z } from "zod";

/**
 * Valida se o usuário autenticado é Platform Admin (Master)
 */
async function requirePlatformAdmin() {
  const identity = await getServerIdentity();
  if (!identity.id) {
    throw new Error("Não autenticado. Por favor, faça login.");
  }

  if (identity.role === "platform_admin" || identity.role === "master") {
    return identity;
  }

  const db = getServerClient();
  const { data: p } = await db
    .from("profiles")
    .select("role")
    .eq("id", identity.id)
    .maybeSingle();

  if (p?.role === "platform_admin" || p?.role === "master") {
    return { ...identity, role: "platform_admin" };
  }

  const { data: userData } = await db.auth.admin.getUserById(identity.id).catch(() => ({ data: { user: null } }));
  const email = userData?.user?.email?.toLowerCase();
  const MASTER_EMAILS = [
    "contato@usewaesy.com",
    "admin@usewaesy.com",
    "meuwaesy@gmail.com",
    "meuwider@gmail.com",
    "excelenciatour.smo@gmail.com",
    "admin@jah.com",
  ];

  if (email && MASTER_EMAILS.includes(email)) {
    const { error: promotionError } = await db.from("profiles").update({ role: "platform_admin" }).eq("id", identity.id);
    if (promotionError) {
      console.error("[curadoria] Falha ao persistir promoção para platform_admin:", promotionError);
      throw new Error("Não foi possível confirmar a autorização administrativa.");
    }
    return { ...identity, role: "platform_admin" };
  }

  throw new Error("Acesso negado. Apenas administradores globais master podem realizar esta ação.");
}

export interface MysteryShopperAudit {
  id: string;
  store_id: string;
  store_name?: string;
  store_slug?: string;
  admin_id?: string;
  auditor_user_id?: string;
  auditor_name?: string;
  auditor_email?: string;
  masked_auditor_code: string;
  product_name: string;
  cost_cents: number;
  status: "pending_dispatch" | "in_transit" | "delivered" | "reviewed" | "disputed" | "resolved";
  notification_sent_to_store: boolean;
  notified_at?: string | null;
  rating_overall?: number | null;
  rating_packaging?: number | null;
  rating_temperature?: number | null;
  rating_punctuality?: number | null;
  review_text?: string | null;
  photos?: string[];
  social_share_url?: string | null;
  reviewed_at?: string | null;
  dispute_reason?: string | null;
  hardship_level?: "none" | "low" | "medium" | "severe" | "critical";
  dispute_status: "none" | "pending_review" | "hardship_accepted" | "boost_granted" | "fee_discount_granted" | "rejected";
  admin_notes?: string | null;
  visibility_boost_multiplier?: number;
  visibility_boost_expires_at?: string | null;
  created_at: string;
}

// ============================================================
// 1. ADMIN: LISTAGEM DE LOJAS PARA CURADORIA & STATUS DE AUDITORIA
// ============================================================
export const listStoresForCuration = createServerFn({ method: "GET" }).handler(async () => {
  await requirePlatformAdmin();
  const db = getServerClient();

  const { data: stores, error } = await db
    .from("stores")
    .select("id, name, slug, email, phone, city, state, is_active, settings, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Erro ao listar lojas para curadoria.");
  }

  // Buscar logs de auditorias passadas
  const { data: auditLogs } = await db
    .from("audit_logs")
    .select("*")
    .eq("entity_type", "mystery_shopper_audit")
    .order("created_at", { ascending: false });

  const auditMap: Record<string, any[]> = {};
  (auditLogs || []).forEach((log: any) => {
    if (!auditMap[log.store_id]) auditMap[log.store_id] = [];
    auditMap[log.store_id].push({
      id: log.id,
      created_at: log.created_at,
      action: log.action,
      ...(log.payload_snapshot || {}),
    });
  });

  return (stores || []).map((store: any) => {
    const storeAudits = auditMap[store.id] || [];
    const lastAudit = storeAudits[0] || null;
    const settings = store.settings || {};
    const boostActive =
      settings.curation_boost?.expires_at &&
      new Date(settings.curation_boost.expires_at) > new Date();

    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      email: store.email,
      phone: store.phone,
      city: store.city,
      state: store.state,
      is_active: store.is_active,
      total_audits: storeAudits.length,
      last_audit_at: lastAudit?.created_at || null,
      last_rating: lastAudit?.rating_overall || null,
      curation_status: settings.curation_status || "verified",
      boost_active: !!boostActive,
      boost_multiplier: settings.curation_boost?.multiplier || 1.0,
      boost_expires_at: settings.curation_boost?.expires_at || null,
      audits: storeAudits,
    };
  });
});

// ============================================================
// 2. ADMIN: CRIAR MISSÃO DE CLIENTE OCULTO (MYSTERY SHOPPER)
// ============================================================
export const createMysteryShopperAudit = createServerFn({ method: "POST" })
  .validator(
    z.object({
      store_id: z.string().uuid(),
      product_name: z.string().min(2),
      cost_cents: z.number().int().min(0).default(0),
      auditor_user_id: z.string().uuid().optional(),
      custom_auditor_name: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const adminIdentity = await requirePlatformAdmin();
    const db = getServerClient();

    // 1. Validar existência da loja
    const { data: store, error: storeErr } = await db
      .from("stores")
      .select("id, name, slug, organization_id")
      .eq("id", data.store_id)
      .single();

    if (storeErr || !store) {
      throw new Error("Loja alvo não encontrada.");
    }

    // 2. Definir auditor
    let auditorId = data.auditor_user_id;
    let auditorProfile: any = null;

    if (auditorId) {
      const { data: p } = await db
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", auditorId)
        .maybeSingle();
      auditorProfile = p;
    }

    if (!auditorId) {
      auditorId = adminIdentity.id || undefined;
    }

    // 3. Gerar código mascarado exclusivo (ex: AUD-COM-8392)
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const maskedCode = `AUD-COM-${randomSuffix}`;

    const auditPayload: MysteryShopperAudit = {
      id: crypto.randomUUID(),
      store_id: store.id,
      store_name: store.name,
      store_slug: store.slug,
      admin_id: adminIdentity.id || undefined,
      auditor_user_id: auditorId,
      auditor_name: auditorProfile?.name || data.custom_auditor_name || "Auditor Comunitário",
      auditor_email: auditorProfile?.email || "",
      masked_auditor_code: maskedCode,
      product_name: data.product_name,
      cost_cents: data.cost_cents,
      status: "pending_dispatch",
      notification_sent_to_store: false,
      dispute_status: "none",
      photos: [],
      created_at: new Date().toISOString(),
    };

    // 4. Persistir registro na trilha de governança
    const { error: insErr } = await db.from("audit_logs").insert({
      store_id: store.id,
      user_id: adminIdentity.id,
      action: "mystery_shopper_created",
      entity_type: "mystery_shopper_audit",
      entity_id: auditPayload.id,
      payload_snapshot: auditPayload,
    });

    if (insErr) {
      throw new Error("Erro ao registrar missão de auditoria: " + insErr.message);
    }

    return {
      success: true,
      audit: auditPayload,
      message: `Missão de Cliente Oculto criada com sucesso para ${store.name}!`,
    };
  });

// ============================================================
// 3. ADMIN: LISTAGEM DE TODAS AS AUDITORIAS (DESMASCARADAS)
// ============================================================
export const listMysteryShopperAuditsAdmin = createServerFn({ method: "GET" }).handler(async () => {
  await requirePlatformAdmin();
  const db = getServerClient();

  const { data: logs, error } = await db
    .from("audit_logs")
    .select("*")
    .eq("entity_type", "mystery_shopper_audit")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Erro ao listar auditorias de cliente oculto.");
  }

  return (logs || []).map((log: any) => ({
    log_id: log.id,
    created_at: log.created_at,
    action: log.action,
    ...(log.payload_snapshot || {}),
  }));
});

// ============================================================
// 4. LOJISTA (WORKSPACE): AUDITORIAS RECEBIDAS (MASCARADAS)
// ============================================================
export const getStoreMysteryAudits = createServerFn({ method: "GET" }).handler(async () => {
  const identity = await getServerIdentity();
  if (!identity.store_id) {
    throw new Error("Nenhuma loja ativa selecionada.");
  }

  const db = getServerClient();

  const { data: logs, error } = await db
    .from("audit_logs")
    .select("*")
    .eq("store_id", identity.store_id)
    .eq("entity_type", "mystery_shopper_audit")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message || "Erro ao carregar auditorias de qualidade.");
  }

  // Mascaramento estrito de dados do auditor para o lojista
  return (logs || []).map((log: any) => {
    const payload = log.payload_snapshot || {};
    return {
      id: payload.id || log.id,
      masked_auditor_code: payload.masked_auditor_code || "AUD-COMUNITÁRIO",
      product_name: payload.product_name,
      cost_cents: payload.cost_cents || 0,
      status: payload.status || "delivered",
      rating_overall: payload.rating_overall,
      rating_packaging: payload.rating_packaging,
      rating_temperature: payload.rating_temperature,
      rating_punctuality: payload.rating_punctuality,
      review_text: payload.review_text,
      photos: payload.photos || [],
      social_share_url: payload.social_share_url,
      reviewed_at: payload.reviewed_at,
      dispute_reason: payload.dispute_reason,
      hardship_level: payload.hardship_level,
      dispute_status: payload.dispute_status || "none",
      admin_notes: payload.admin_notes,
      created_at: log.created_at,
    };
  });
});

// ============================================================
// 5. AUDITOR: ENVIAR AVALIAÇÃO COM FOTOS & REVIEW COMPLETO
// ============================================================
export const submitAuditReview = createServerFn({ method: "POST" })
  .validator(
    z.object({
      audit_id: z.string(),
      rating_overall: z.number().int().min(1).max(5),
      rating_packaging: z.number().int().min(1).max(5),
      rating_temperature: z.number().int().min(1).max(5),
      rating_punctuality: z.number().int().min(1).max(5),
      review_text: z.string().min(10),
      photos: z.array(z.string()).default([]),
      social_share_url: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.id) {
      throw new Error("Não autenticado.");
    }

    const db = getServerClient();

    // 1. Localizar o log de auditoria
    const { data: logs, error: findErr } = await db
      .from("audit_logs")
      .select("*")
      .eq("entity_type", "mystery_shopper_audit")
      .order("created_at", { ascending: false });

    if (findErr) throw new Error("Erro ao buscar auditoria.");

    const targetLog = logs?.find(
      (l: any) => l.payload_snapshot?.id === data.audit_id || l.id === data.audit_id,
    );

    if (!targetLog) {
      throw new Error("Missão de auditoria não encontrada.");
    }

    const oldPayload = targetLog.payload_snapshot || {};
    const updatedPayload = {
      ...oldPayload,
      status: "reviewed",
      rating_overall: data.rating_overall,
      rating_packaging: data.rating_packaging,
      rating_temperature: data.rating_temperature,
      rating_punctuality: data.rating_punctuality,
      review_text: data.review_text,
      photos: data.photos,
      social_share_url: data.social_share_url,
      reviewed_at: new Date().toISOString(),
      notification_sent_to_store: true,
      notified_at: new Date().toISOString(),
    };

    // 2. Atualizar o log
    await db
      .from("audit_logs")
      .update({
        action: "mystery_shopper_reviewed",
        payload_snapshot: updatedPayload,
      })
      .eq("id", targetLog.id);

    return {
      success: true,
      message: "Avaliação de Cliente Oculto enviada com sucesso! Obrigado por fortalecer o comércio local.",
    };
  });

// ============================================================
// 6. LOJISTA: RELATAR DIFICULDADE FINANCEIRA / CONTESTAR CUSTO
// ============================================================
export const reportStoreHardshipOrDispute = createServerFn({ method: "POST" })
  .validator(
    z.object({
      audit_id: z.string(),
      dispute_reason: z.string().min(10),
      hardship_level: z.enum(["low", "medium", "severe", "critical"]).default("medium"),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity.store_id) {
      throw new Error("Nenhuma loja ativa selecionada.");
    }

    const db = getServerClient();

    // 1. Localizar auditoria da loja
    const { data: logs, error } = await db
      .from("audit_logs")
      .select("*")
      .eq("store_id", identity.store_id)
      .eq("entity_type", "mystery_shopper_audit");

    if (error) throw new Error("Erro ao buscar auditoria.");

    const targetLog = logs?.find(
      (l: any) => l.payload_snapshot?.id === data.audit_id || l.id === data.audit_id,
    );

    if (!targetLog) {
      throw new Error("Auditoria não encontrada nesta loja.");
    }

    const oldPayload = targetLog.payload_snapshot || {};
    const updatedPayload = {
      ...oldPayload,
      status: "disputed",
      dispute_status: "pending_review",
      dispute_reason: data.dispute_reason,
      hardship_level: data.hardship_level,
      disputed_at: new Date().toISOString(),
    };

    await db
      .from("audit_logs")
      .update({
        action: "mystery_shopper_disputed",
        payload_snapshot: updatedPayload,
      })
      .eq("id", targetLog.id);

    return {
      success: true,
      message: "Relato de dificuldade financeira recebido. A administração da Waesy analisará com prioridade e solidariedade para apoiar o seu negócio!",
    };
  });

// ============================================================
// 7. ADMIN: RESOLVER CONTESTAÇÃO, CONCEDER DESCONTO & APLICAR BOOST
// ============================================================
export const resolveHardshipAndBoostStore = createServerFn({ method: "POST" })
  .validator(
    z.object({
      audit_id: z.string(),
      store_id: z.string().uuid(),
      resolution_action: z.enum(["grant_boost_and_discount", "grant_boost_only", "grant_discount_only", "reject"]),
      boost_multiplier: z.number().min(1.0).max(5.0).default(2.0),
      boost_duration_days: z.number().int().min(1).max(90).default(30),
      admin_notes: z.string().min(3),
    }),
  )
  .handler(async ({ data }) => {
    const adminIdentity = await requirePlatformAdmin();
    const db = getServerClient();

    // 1. Calcular validade do boost
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.boost_duration_days);

    // 2. Atualizar configurações da loja com o Boost de Visibilidade
    const { data: store } = await db.from("stores").select("settings").eq("id", data.store_id).single();
    const settings = store?.settings || {};

    if (data.resolution_action !== "reject") {
      settings.curation_boost = {
        multiplier: data.boost_multiplier,
        expires_at: expiresAt.toISOString(),
        granted_at: new Date().toISOString(),
        granted_by: adminIdentity.id,
        reason: data.admin_notes,
      };
      settings.curation_status = "verified_boosted";

      await db
        .from("stores")
        .update({
          settings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.store_id);
    }

    // 3. Atualizar o log de auditoria
    const { data: logs } = await db
      .from("audit_logs")
      .select("*")
      .eq("store_id", data.store_id)
      .eq("entity_type", "mystery_shopper_audit");

    const targetLog = logs?.find(
      (l: any) => l.payload_snapshot?.id === data.audit_id || l.id === data.audit_id,
    );

    if (targetLog) {
      const oldPayload = targetLog.payload_snapshot || {};
      const updatedPayload = {
        ...oldPayload,
        status: "resolved",
        dispute_status:
          data.resolution_action === "reject"
            ? "rejected"
            : data.resolution_action === "grant_boost_and_discount"
              ? "hardship_accepted"
              : "boost_granted",
        admin_notes: data.admin_notes,
        visibility_boost_multiplier: data.boost_multiplier,
        visibility_boost_expires_at: expiresAt.toISOString(),
        resolved_at: new Date().toISOString(),
        resolved_by: adminIdentity.id,
      };

      await db
        .from("audit_logs")
        .update({
          action: "mystery_shopper_resolved",
          payload_snapshot: updatedPayload,
        })
        .eq("id", targetLog.id);
    }

    return {
      success: true,
      message: `Resolução aplicada com sucesso! ${
        data.resolution_action !== "reject"
          ? `Loja impulsionada no feed (+${data.boost_multiplier}x visibilidade por ${data.boost_duration_days} dias)!`
          : "Contestação finalizada."
      }`,
    };
  });
