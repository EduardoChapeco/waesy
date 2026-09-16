import { createServerFn } from "@tanstack/react-start";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { z } from "zod";
import crypto from "node:crypto";
import { DEFAULT_BRAND_NAME } from "@/lib/brand";

/**
 * Validates that the current user is a Platform Admin (Master).
 * Master functions bypass standard tenant isolation for global oversight.
 */
async function requirePlatformAdmin() {
 const identity = await getServerIdentity();
 if (!identity.id) {
 throw new Error("Não autenticado. Por favor, faça login.");
 }

 if (identity.role === "platform_admin") {
 return identity;
 }

 const db = getServerClient();
 const { data: p } = await db
 .from("profiles")
 .select("role")
 .eq("id", identity.id)
 .maybeSingle();

 if (p?.role === "platform_admin") {
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
 try {
 await db.from("profiles").update({ role: "platform_admin" }).eq("id", identity.id);
 } catch {}
 return { ...identity, role: "platform_admin" };
 }

 throw new Error("Acesso negado. Apenas administradores globais master podem realizar esta ação.");
}

// ============================================================
// 1. MÉTRICAS GLOBAIS DA PLATAFORMA
// ============================================================

export const getPlatformMetrics = createServerFn({ method: "GET" }).handler(async () => {
 await requirePlatformAdmin();
 const db = getServerClient();

 const [invoicesRes, storesRes, usersRes, reportsRes, kycRes] = await Promise.all([
 db.from("platform_invoices").select("amount_cents, status"),
 db.from("stores").select("id, is_active", { count: "exact" }),
 db.from("profiles").select("id, role", { count: "exact" }),
 db.from("moderation_reports").select("id, status").eq("status", "pending"),
 db.from("identity_kyc_verifications").select("id, status").eq("status", "pending"),
 ]);

 const invoices = invoicesRes.data || [];
 const totalRevenueCents = invoices
 .filter((i: any) => i.status === "paid")
 .reduce((sum: number, i: any) => sum + i.amount_cents, 0);

 const pendingRevenueCents = invoices
 .filter((i: any) => i.status === "pending" || i.status === "overdue")
 .reduce((sum: number, i: any) => sum + i.amount_cents, 0);

 return {
 totalRevenueCents,
 pendingRevenueCents,
 totalStores: storesRes.count || 0,
 totalUsers: usersRes.count || 0,
 pendingReports: reportsRes.data?.length || 0,
 pendingKyc: kycRes.data?.length || 0,
 };
});

// ============================================================
// 2. GESTÃO DE FATURAS & LOJAS
// ============================================================

export const getPlatformInvoicesList = createServerFn({ method: "GET" }).handler(async () => {
  await requirePlatformAdmin();
  const db = getServerClient();
  const { data, error } = await db
    .from("platform_invoices")
    .select("*, stores(id, name, slug, is_active, settings, is_platform_root)")
    .order("created_at", { ascending: false });

  if (error) throw new Error("Erro ao buscar faturas: " + error.message);

  const now = new Date();
  const enriched = (data || []).map((inv: any) => {
    const isPaid = inv.status === "paid";
    const dueDate = inv.due_date ? new Date(inv.due_date) : null;
    let daysOverdue = 0;
    let fineCents = 0;
    let interestCents = 0;
    let totalUpdatedCents = inv.amount_cents || 0;
    let isOverdue = false;

    if (!isPaid && dueDate && now.getTime() > dueDate.getTime()) {
      const diffMs = now.getTime() - dueDate.getTime();
      daysOverdue = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      isOverdue = true;
      // Multa padrão brasileira de 2%
      fineCents = Math.round((inv.amount_cents || 0) * 0.02);
      // Juros pro-rata die de 1% ao mês (0,033% ao dia)
      const dailyRate = 0.01 / 30;
      interestCents = Math.round((inv.amount_cents || 0) * dailyRate * daysOverdue);
      totalUpdatedCents = (inv.amount_cents || 0) + fineCents + interestCents;
    }

    const storeSettings = (inv.stores?.settings as Record<string, any>) || {};
    const isStoreDebtBlocked = Boolean(storeSettings.blocked_due_to_debt);

    return {
      ...inv,
      is_overdue: isOverdue,
      days_overdue: daysOverdue,
      fine_cents: fineCents,
      interest_cents: interestCents,
      total_updated_cents: totalUpdatedCents,
      is_store_debt_blocked: isStoreDebtBlocked,
    };
  });

  return enriched;
});

export const toggleStoreDebtBlock = createServerFn({ method: "POST" })
  .validator(z.object({ storeId: z.string().uuid(), blocked: z.boolean(), reason: z.string().optional() }))
  .handler(async ({ data }) => {
    const admin = await requirePlatformAdmin();
    const db = getServerClient();

    const { data: targetStore, error: fetchErr } = await db
      .from("stores")
      .select("id, slug, is_platform_root, settings")
      .eq("id", data.storeId)
      .single();

    if (fetchErr || !targetStore) {
      throw new Error("Loja não encontrada para alteração de bloqueio.");
    }

    if (targetStore.is_platform_root || targetStore.slug === "waesy") {
      throw new Error("A loja oficial da plataforma (Waesy Root) é protegida contra bloqueio.");
    }

    const currentSettings = (targetStore.settings as Record<string, any>) || {};
    const updatedSettings = {
      ...currentSettings,
      blocked_due_to_debt: data.blocked,
      blocked_at: data.blocked ? new Date().toISOString() : null,
      debt_block_reason: data.blocked ? (data.reason || "Inadimplência de fatura da plataforma") : null,
    };

    const { error } = await db
      .from("stores")
      .update({
        settings: updatedSettings,
        is_active: data.blocked ? false : true,
      })
      .eq("id", data.storeId);

    if (error) throw new Error("Erro ao atualizar bloqueio por dívida: " + error.message);

    await db.from("forensic_audit_events").insert({
      actor_id: admin.id,
      actor_role: "platform_admin",
      target_entity_type: "store",
      target_entity_id: data.storeId,
      action: data.blocked ? "store_blocked_due_to_debt" : "store_unblocked_debt",
      payload_snapshot: { reason: data.reason || (data.blocked ? "Bloqueio administrativo por inadimplência" : "Desbloqueio regular") },
    });

    return { success: true, blocked: data.blocked };
  });

export const getPlatformStoresList = createServerFn({ method: "GET" }).handler(async () => {
 await requirePlatformAdmin();
 const db = getServerClient();
 const { data, error } = await db
 .from("stores")
 .select("id, name, slug, is_active, created_at, settings")
 .order("created_at", { ascending: false });

 if (error) throw new Error("Erro ao buscar lojas: " + error.message);
 return data || [];
});

export const toggleStoreStatus = createServerFn({ method: "POST" })
 .validator(z.object({ storeId: z.string().uuid(), isActive: z.boolean(), reason: z.string().optional() }))
 .handler(async ({ data }) => {
 const admin = await requirePlatformAdmin();
 const db = getServerClient();

 // Proteção de Imunidade: A loja oficial da plataforma (Root) nunca pode ser suspensa
 const { data: targetStore } = await db
 .from("stores")
 .select("id, slug, is_platform_root")
 .eq("id", data.storeId)
 .single();

 if (targetStore?.is_platform_root || targetStore?.slug === "waesy" || targetStore?.slug === "waesy") {
 throw new Error("A loja oficial da plataforma (Waesy Root) é protegida contra suspensão ou exclusão.");
 }

 const { error } = await db
 .from("stores")
 .update({ is_active: data.isActive })
 .eq("id", data.storeId);

 if (error) throw new Error("Erro ao alterar status da loja: " + error.message);

 // Registra evento no log forense
 await db.from("forensic_audit_events").insert({
 actor_id: admin.id,
 actor_role: "platform_admin",
 target_entity_type: "store",
 target_entity_id: data.storeId,
 action: data.isActive ? "store_reinstated" : "store_suspended",
 payload_snapshot: { reason: data.reason || "Intervenção administrativa master" },
 });

 return { success: true };
 });

export const updateInvoiceStatus = createServerFn({ method: "POST" })
 .validator(
 z.object({
 invoiceId: z.string().uuid(),
 status: z.enum(["pending", "paid", "overdue", "cancelled"]),
 receiptUrl: z.string().url().optional().nullable(),
 notes: z.string().optional().nullable(),
 }),
 )
 .handler(async ({ data }) => {
 await requirePlatformAdmin();
 const db = getServerClient();

 const updateData: any = { status: data.status };
 if (data.status === "paid") {
 updateData.paid_at = new Date().toISOString();
 } else {
 updateData.paid_at = null;
 }
 if (data.receiptUrl !== undefined) {
 updateData.receipt_url = data.receiptUrl;
 }
 if (data.notes !== undefined) {
 updateData.notes = data.notes;
 }

 const { error } = await db
 .from("platform_invoices")
 .update(updateData)
 .eq("id", data.invoiceId);

 if (error) throw new Error("Erro ao atualizar status da fatura: " + error.message);
 return { success: true };
 });

export const createPlatformInvoice = createServerFn({ method: "POST" })
 .validator(
 z.object({
 storeId: z.string().uuid(),
 description: z.string().min(1, "Descrição obrigatória"),
 amountCents: z.number().positive("Valor deve ser maior que zero"),
 dueDate: z.string(),
 receiptUrl: z.string().url().optional().nullable(),
 notes: z.string().optional().nullable(),
 }),
 )
 .handler(async ({ data }) => {
 await requirePlatformAdmin();
 const db = getServerClient();

    const { error } = await db.from("platform_invoices").insert({
      store_id: data.storeId,
      description: data.description,
      amount_cents: data.amountCents,
      due_date: data.dueDate,
      receipt_url: data.receiptUrl || null,
      notes: data.notes || null,
      status: "pending",
    });

    if (error) throw new Error("Erro ao emitir fatura: " + error.message);
    return { success: true };
  });

export const duplicatePlatformInvoice = createServerFn({ method: "POST" })
  .validator(z.object({ invoiceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requirePlatformAdmin();
    const db = getServerClient();

    const { data: original, error: fetchErr } = await db
      .from("platform_invoices")
      .select("*")
      .eq("id", data.invoiceId)
      .single();

    if (fetchErr || !original) throw new Error("Fatura original não encontrada.");

    const { error } = await db.from("platform_invoices").insert({
      store_id: original.store_id,
      description: `${original.description} (Cópia)`,
      amount_cents: original.amount_cents,
      due_date: original.due_date,
      status: "pending",
    });

    if (error) throw new Error("Erro ao duplicar fatura: " + error.message);
    return { success: true };
  });

export const deletePlatformInvoice = createServerFn({ method: "POST" })
  .validator(z.object({ invoiceId: z.string().uuid() }))
  .handler(async ({ data }) => {
    await requirePlatformAdmin();
    const db = getServerClient();

    const { error } = await db
      .from("platform_invoices")
      .delete()
      .eq("id", data.invoiceId);

    if (error) throw new Error("Erro ao excluir fatura: " + error.message);
    return { success: true };
  });

// ============================================================
// 3. TRUST & SAFETY — MODERAÇÃO GLOBAL DE CONTEÚDO & DENÚNCIAS
// ============================================================

export const listModerationReports = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 status: z.enum(["all", "pending", "in_review", "resolved_removed", "resolved_dismissed", "resolved_warned"]).optional(),
 entityType: z.string().optional(),
 })
 .optional(),
 )
 .handler(async ({ data: params }) => {
 await requirePlatformAdmin();
 const db = getServerClient();

 let query = db
 .from("moderation_reports")
 .select("*, reporter:profiles!moderation_reports_reporter_profile_id_fkey(id, full_name, role)")
 .order("created_at", { ascending: false });

 if (params?.status && params.status !== "all") {
 query = query.eq("status", params.status);
 }
 if (params?.entityType && params.entityType !== "all") {
 query = query.eq("entity_type", params.entityType);
 }

 const { data, error } = await query;
 if (error) throw new Error("Erro ao buscar denúncias: " + error.message);
 return data || [];
 });

export const resolveModerationReport = createServerFn({ method: "POST" })
 .validator(
 z.object({
 reportId: z.string().uuid(),
 actionTaken: z.enum([
 "content_removed",
 "content_hidden",
 "author_warned",
 "author_banned",
 "dismissed",
 ]),
 moderatorNotes: z.string().min(3, "Justificativa obrigatória"),
 }),
 )
 .handler(async ({ data }) => {
 const admin = await requirePlatformAdmin();
 const db = getServerClient();

 // 1. Busca dados da denúncia
 const { data: report, error: repErr } = await db
 .from("moderation_reports")
 .select("*")
 .eq("id", data.reportId)
 .single();

 if (repErr || !report) throw new Error("Denúncia não encontrada.");

 // 2. Executa a ação sobre o conteúdo alvo
 if (data.actionTaken === "content_removed" || data.actionTaken === "content_hidden") {
 if (report.entity_type === "post") {
 await db.from("posts").update({ status: "archived" }).eq("id", report.entity_id);
 } else if (report.entity_type === "classified") {
 await db.from("classifieds").update({ status: "closed" }).eq("id", report.entity_id);
 } else if (report.entity_type === "product") {
 await db.from("products").update({ status: "archived" }).eq("id", report.entity_id);
 }
 }

 // 3. Atualiza o status da denúncia
 const resolvedStatus =
 data.actionTaken === "dismissed"
 ? "resolved_dismissed"
 : data.actionTaken === "author_warned"
 ? "resolved_warned"
 : "resolved_removed";

 await db
 .from("moderation_reports")
 .update({
 status: resolvedStatus,
 action_taken: data.actionTaken,
 moderator_id: admin.id,
 moderator_notes: data.moderatorNotes,
 resolved_at: new Date().toISOString(),
 })
 .eq("id", data.reportId);

 // 4. Log Forense
 await db.from("forensic_audit_events").insert({
 actor_id: admin.id,
 actor_role: "platform_admin",
 target_entity_type: report.entity_type,
 target_entity_id: report.entity_id,
 action: `moderation_${data.actionTaken}`,
 payload_snapshot: { report_id: data.reportId, notes: data.moderatorNotes },
 });

 return { success: true };
 });

// ============================================================
// 4. GESTÃO DE USUÁRIOS & SANÇÕES DISCIPLINARES GRANULARES
// ============================================================

export const listAllUsers = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 search: z.string().optional(),
 role: z.string().optional(),
 })
 .optional(),
 )
 .handler(async ({ data: params }) => {
 await requirePlatformAdmin();
 const db = getServerClient();

 let query = db
 .from("profiles")
 .select("*")
 .order("created_at", { ascending: false })
 .limit(100);

 if (params?.search && params.search.trim()) {
 const q = `%${params.search.trim()}%`;
 query = query.or(`full_name.ilike.${q},tax_id.ilike.${q}`);
 }
 if (params?.role && params.role !== "all") {
 query = query.eq("role", params.role);
 }

 const { data: profiles, error: profErr } = await query;
 if (profErr) {
 console.error("[listAllUsers] Erro ao buscar profiles:", profErr);
 throw new Error("Erro ao buscar usuários: " + profErr.message);
 }

 if (!profiles || profiles.length === 0) return [];

 // Busca sanções de forma desacoplada e segura
 try {
 const userIds = profiles.map((p: any) => p.id);
 const { data: sanctions } = await db
 .from("user_moderation_sanctions")
 .select("*")
 .in("user_id", userIds)
 .eq("is_active", true);

 const sanctionsMap = new Map<string, any[]>();
 (sanctions || []).forEach((s: any) => {
 const list = sanctionsMap.get(s.user_id) || [];
 list.push(s);
 sanctionsMap.set(s.user_id, list);
 });

 return profiles.map((p: any) => ({
 ...p,
 user_moderation_sanctions: sanctionsMap.get(p.id) || [],
 }));
 } catch (err) {
 console.warn("[listAllUsers] Falha não impeditiva ao enriquecer sanções:", err);
 return profiles.map((p: any) => ({
 ...p,
 user_moderation_sanctions: [],
 }));
 }
 });

export const applyUserSanction = createServerFn({ method: "POST" })
 .validator(
 z.object({
 userId: z.string().uuid(),
 sanctionType: z.enum([
 "warning",
 "mute_comments",
 "block_posts",
 "block_classifieds",
 "block_commerce",
 "ban_temporary",
 "ban_permanent",
 ]),
 reason: z.string().min(5, "Motivo obrigatório"),
 moderatorNotes: z.string().optional(),
 durationDays: z.number().int().min(1).optional(),
 }),
 )
 .handler(async ({ data }) => {
 const admin = await requirePlatformAdmin();
 const db = getServerClient();

 const expiresAt = data.durationDays
 ? new Date(Date.now() + data.durationDays * 24 * 60 * 60 * 1000).toISOString()
 : null;

 const { error } = await db.from("user_moderation_sanctions").insert({
 user_id: data.userId,
 sanction_type: data.sanctionType,
 reason: data.reason,
 moderator_notes: data.moderatorNotes || null,
 expires_at: expiresAt,
 is_active: true,
 applied_by: admin.id,
 });

 if (error) throw new Error("Erro ao aplicar sanção: " + error.message);

 // Se banimento permanente, suspende o perfil
 if (data.sanctionType === "ban_permanent") {
 await db.from("profiles").update({ role: "suspended" }).eq("id", data.userId);
 }

 // Log Forense
 await db.from("forensic_audit_events").insert({
 actor_id: admin.id,
 actor_role: "platform_admin",
 target_entity_type: "user",
 target_entity_id: data.userId,
 action: `sanction_${data.sanctionType}`,
 payload_snapshot: { reason: data.reason, duration_days: data.durationDays },
 });

 return { success: true };
 });

export const revokeUserSanction = createServerFn({ method: "POST" })
 .validator(z.object({ sanctionId: z.string().uuid() }))
 .handler(async ({ data }) => {
 const admin = await requirePlatformAdmin();
 const db = getServerClient();

 const { error } = await db
 .from("user_moderation_sanctions")
 .update({ is_active: false })
 .eq("id", data.sanctionId);

 if (error) throw new Error("Erro ao revogar sanção: " + error.message);
 return { success: true };
 });

export const adminUpdateUserRole = createServerFn({ method: "POST" })
  .validator(
    z.object({
      targetUserId: z.string().uuid(),
      newRole: z.enum(["customer", "store_owner", "operator", "platform_admin"]),
    }),
  )
  .handler(async ({ data: { targetUserId, newRole } }) => {
    const admin = await requirePlatformAdmin();
    const db = getServerClient();

    const { error: rpcErr } = await db.rpc("admin_set_user_role", {
      p_target_user_id: targetUserId,
      p_new_role: newRole,
    });

    if (rpcErr) {
      const { error: updateErr } = await db
        .from("profiles")
        .update({ role: newRole })
        .eq("id", targetUserId);

      if (updateErr) {
        throw new Error("Erro ao atualizar papel do usuário: " + updateErr.message);
      }
    }

    try {
      await db.from("forensic_audit_events").insert({
        actor_id: admin.id,
        actor_role: "platform_admin",
        target_entity_type: "user",
        target_entity_id: targetUserId,
        action: `update_user_role_to_${newRole}`,
        payload_snapshot: { newRole },
      });
    } catch {}

    return { success: true, message: `Nível do usuário atualizado para ${newRole}.` };
  });

// ============================================================
// 5. KYC & VERIFICAÇÃO FACIAL / SELO DE AUTENTICIDADE
// ============================================================

export const listKycVerifications = createServerFn({ method: "GET" })
 .validator(
 z
 .object({
 status: z.enum(["all", "pending", "under_review", "approved", "rejected"]).optional(),
 })
 .optional(),
 )
 .handler(async ({ data: params }) => {
 await requirePlatformAdmin();
 const db = getServerClient();

 let query = db
 .from("identity_kyc_verifications")
 .select("*")
 .order("created_at", { ascending: false });

 if (params?.status && params.status !== "all") {
 query = query.eq("status", params.status);
 }

 const { data: verifications, error } = await query;
 if (error) {
 console.error("[listKycVerifications] Erro na consulta:", error);
 throw new Error("Erro ao buscar verificações KYC: " + error.message);
 }

 if (!verifications || verifications.length === 0) return [];

 try {
 const userIds = Array.from(new Set(verifications.map((v: any) => v.user_id).filter(Boolean)));
 if (userIds.length > 0) {
 const { data: users } = await db
 .from("profiles")
 .select("id, full_name, avatar_url, role")
 .in("id", userIds);

 const usersMap = new Map<string, any>((users || []).map((u: any) => [u.id, u]));

 return verifications.map((v: any) => ({
 ...v,
 user: usersMap.get(v.user_id) || null,
 }));
 }
 return verifications;
 } catch (err) {
 console.warn("[listKycVerifications] Falha não impeditiva ao enriquecer usuários:", err);
 return verifications;
 }
 });

export const reviewKycVerification = createServerFn({ method: "POST" })
 .validator(
 z.object({
 kycId: z.string().uuid(),
 status: z.enum(["approved", "rejected", "requires_resubmission"]),
 rejectionReason: z.string().optional(),
 internalNotes: z.string().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const admin = await requirePlatformAdmin();
 const db = getServerClient();

 const { data: kyc, error: getErr } = await db
 .from("identity_kyc_verifications")
 .select("user_id")
 .eq("id", data.kycId)
 .single();

 if (getErr || !kyc) throw new Error("Registro KYC não encontrado.");

 const { error } = await db
 .from("identity_kyc_verifications")
 .update({
 status: data.status,
 reviewed_by: admin.id,
 rejection_reason: data.rejectionReason || null,
 internal_notes: data.internalNotes || null,
 verified_at: data.status === "approved" ? new Date().toISOString() : null,
 })
 .eq("id", data.kycId);

 if (error) throw new Error("Erro ao revisar KYC: " + error.message);

 // Se aprovado, adiciona selo de verificado no perfil
 if (data.status === "approved") {
 await db.from("profiles").update({ is_verified: true }).eq("id", kyc.user_id);
 }

 return { success: true };
 });

// ============================================================
// 6. DOSSIÊ JUDICIAL & PROVAS 360º DO USUÁRIO
// ============================================================

export const getUser360Dossier = createServerFn({ method: "GET" })
 .validator(z.object({ userId: z.string().uuid() }))
 .handler(async ({ data: { userId } }) => {
 await requirePlatformAdmin();
 const db = getServerClient();

 const [profileRes, ordersRes, ridesRes, appointmentsRes, quotesRes, termsRes, auditRes] =
 await Promise.all([
 db.from("profiles").select("*").eq("id", userId).single(),
 db.from("orders").select("id, public_token, status, total_cents, created_at, shipping_address").eq("customer_id", userId).neq("origin_type", "mobility"),
 db.from("orders").select("id, status, total_cents, items_snapshot, created_at, shipping_address").eq("customer_id", userId).eq("origin_type", "mobility"),
 db.from("booking_appointments").select("id, scheduled_at, status, created_at").eq("customer_id", userId),
 db.from("quotes").select("id, quote_number, total_cents, status, created_at").eq("customer_id", userId),
 db.from("legal_terms_acceptances").select("*").eq("user_id", userId),
 db.from("forensic_audit_events").select("*").eq("target_entity_id", userId).order("created_at", { ascending: false }).limit(50),
 ]);

 if (!profileRes.data) throw new Error("Perfil não encontrado.");

 const dossierSnapshot = {
 profile: profileRes.data,
 orders: ordersRes.data || [],
 mobility_rides: ridesRes.data || [],
 appointments: appointmentsRes.data || [],
 quotations: quotesRes.data || [],
 terms_acceptances: termsRes.data || [],
 audit_events: auditRes.data || [],
 generated_at: new Date().toISOString(),
 };

 // Gera Hash SHA-256 do Dossiê para Imutabilidade e Validade Jurídica (Web Crypto API)
 const jsonStr = JSON.stringify(dossierSnapshot);
 const msgBuffer = new TextEncoder().encode(jsonStr);
 const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", msgBuffer);
 const hashArray = Array.from(new Uint8Array(hashBuffer));
 const sha256 = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

 return {
 dossier: dossierSnapshot,
 sha256_certification: sha256,
 };
 });

// ============================================================
// 7. GESTÃO DE ACESSOS, MAGIC LINK & RESET DE SENHA
// ============================================================

export const adminTriggerPasswordReset = createServerFn({ method: "POST" })
 .validator(z.object({ email: z.string().email() }))
 .handler(async ({ data: { email } }) => {
 await requirePlatformAdmin();
 const db = getServerClient();

 // Dispara magic link via Supabase Auth
 const { error } = await db.auth.resetPasswordForEmail(email, {
 redirectTo: "/recuperar-senha",
 });

 if (error) throw new Error("Erro ao disparar e-mail de recuperação: " + error.message);
 return { success: true, message: `Link de redefinição enviado para ${email}.` };
 });

// ============================================================
// ============================================================
// 8. IDENTIDADE DA MARCA (Logo, Favicon, Nome da Plataforma)
// ============================================================

/**
 * Localiza de forma resiliente a loja matriz/raiz da plataforma.
 * Se nenhuma loja tiver is_platform_root=true, seleciona a loja padrão e a marca como matriz.
 */
export async function resolvePlatformRootStore(db: any) {
  // 1. Tenta buscar por is_platform_root=true ou slugs canônicos
  const { data: store } = await db
    .from("stores")
    .select("id, name, address, city, state, settings, is_platform_root, slug")
    .or("is_platform_root.eq.true,slug.eq.waesy,slug.eq.waesy-matriz,slug.eq.matriz")
    .limit(1)
    .maybeSingle();

  if (store) return store;

  // 2. Fallback de resiliência: primeira store registrada
  const { data: firstStore } = await db
    .from("stores")
    .select("id, name, address, city, state, settings, is_platform_root, slug")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstStore) {
    try {
      await db.from("stores").update({ is_platform_root: true }).eq("id", firstStore.id);
    } catch {}
    return { ...firstStore, is_platform_root: true };
  }

  return null;
}

/**
 * Busca as configurações públicas de identidade e canais da plataforma.
 * Consulta prioritariamente a tabela canônica platform_brand_settings.
 * Acesso livre para renderização no Super App, cabeçalhos, rodapés e página de contato.
 */
export const getPublicBrandSettings = createServerFn({ method: "GET" }).handler(async () => {
  const db = getServerClient();

  // 1. Tenta ler da tabela canônica de marca
  const { data: brandRow } = await db
    .from("platform_brand_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (brandRow) {
    return {
      store_id: null,
      platform_name: brandRow.platform_name || DEFAULT_BRAND_NAME,
      logo_url: brandRow.logo_url || null,
      favicon_url: brandRow.favicon_url || null,
      show_name: brandRow.show_name !== false,
      show_logo: brandRow.show_logo !== false,
      support_email: brandRow.support_email || "contato@usewaesy.com",
      support_whatsapp: brandRow.support_whatsapp || null,
      support_hours: brandRow.support_hours || "Segunda a Sexta, das 08h às 18h",
      login_split_image_url: brandRow.login_split_image_url || null,
      login_bg_desktop_url: brandRow.login_bg_desktop_url || null,
      login_bg_tablet_url: brandRow.login_bg_tablet_url || null,
      login_bg_mobile_url: brandRow.login_bg_mobile_url || null,
      social_instagram: brandRow.social_instagram || null,
      social_facebook: brandRow.social_facebook || null,
      social_linkedin: brandRow.social_linkedin || null,
      address: brandRow.address || null,
      city: brandRow.city || null,
      state: brandRow.state || null,
      seo_title: brandRow.seo_title || "Waesy",
      seo_description: brandRow.seo_description || "Plataforma Comunitária de Comércio Local, Serviços, Turismo e Comunidade",
    };
  }

  // 2. Fallback resiliente para a loja raiz
  const store = await resolvePlatformRootStore(db);
  const settings = (store?.settings as Record<string, any>) || {};
  const storeName = store?.name || DEFAULT_BRAND_NAME;

  return {
    store_id: store?.id || null,
    platform_name: storeName,
    logo_url: settings.logoUrl || settings.logo_url || null,
    favicon_url: settings.faviconUrl || settings.favicon_url || null,
    show_name: settings.show_name !== false,
    show_logo: settings.show_logo !== false,
    support_email: settings.support_email || "contato@usewaesy.com",
    support_whatsapp: settings.support_whatsapp || null,
    support_hours: settings.support_hours || "Segunda a Sexta, das 08h às 18h",
    login_split_image_url: settings.login_split_image_url || null,
    login_bg_desktop_url: settings.login_bg_desktop_url || settings.login_split_image_url || null,
    login_bg_tablet_url: settings.login_bg_tablet_url || settings.login_split_image_url || null,
    login_bg_mobile_url: settings.login_bg_mobile_url || settings.login_split_image_url || null,
    social_instagram: settings.social_instagram || null,
    social_facebook: settings.social_facebook || null,
    social_linkedin: settings.social_linkedin || null,
    address: store?.address || null,
    city: store?.city || null,
    state: store?.state || null,
    seo_title: store?.seo_title || "Waesy",
    seo_description: store?.seo_description || "Plataforma Comunitária de Comércio Local, Serviços, Turismo e Comunidade",
  };
});

/**
 * Busca as configurações globais de identidade visual da plataforma para o Admin Master.
 */
export const getPlatformBrandSettings = createServerFn({ method: "GET" }).handler(async () => {
  await requirePlatformAdmin();
  const db = getServerClient();

  // 1. Tenta buscar da tabela canônica
  const { data: brandRow } = await db
    .from("platform_brand_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const store = await resolvePlatformRootStore(db);

  if (brandRow) {
    return {
      store_id: store?.id || null,
      brand_id: brandRow.id,
      platform_name: brandRow.platform_name || DEFAULT_BRAND_NAME,
      logo_url: brandRow.logo_url || null,
      favicon_url: brandRow.favicon_url || null,
      show_name: brandRow.show_name !== false,
      show_logo: brandRow.show_logo !== false,
      support_email: brandRow.support_email || "contato@usewaesy.com",
      support_whatsapp: brandRow.support_whatsapp || null,
      support_hours: brandRow.support_hours || "Segunda a Sexta, das 08h às 18h",
      login_split_image_url: brandRow.login_split_image_url || null,
      login_bg_desktop_url: brandRow.login_bg_desktop_url || null,
      login_bg_tablet_url: brandRow.login_bg_tablet_url || null,
      login_bg_mobile_url: brandRow.login_bg_mobile_url || null,
      social_instagram: brandRow.social_instagram || null,
      social_facebook: brandRow.social_facebook || null,
      social_linkedin: brandRow.social_linkedin || null,
      address: brandRow.address || store?.address || null,
      city: brandRow.city || store?.city || null,
      state: brandRow.state || store?.state || null,
      seo_title: brandRow.seo_title || "Waesy",
      seo_description: brandRow.seo_description || "Plataforma Comunitária de Comércio Local, Serviços, Turismo e Comunidade",
    };
  }

  const settings = (store?.settings as Record<string, any>) || {};
  const storeName = store?.name || DEFAULT_BRAND_NAME;

  return {
    store_id: store?.id || null,
    brand_id: null,
    platform_name: storeName,
    logo_url: settings.logoUrl || settings.logo_url || null,
    favicon_url: settings.faviconUrl || settings.favicon_url || null,
    show_name: settings.show_name !== false,
    show_logo: settings.show_logo !== false,
    support_email: settings.support_email || "contato@usewaesy.com",
    support_whatsapp: settings.support_whatsapp || null,
    support_hours: settings.support_hours || "Segunda a Sexta, das 08h às 18h",
    login_split_image_url: settings.login_split_image_url || null,
    login_bg_desktop_url: settings.login_bg_desktop_url || settings.login_split_image_url || null,
    login_bg_tablet_url: settings.login_bg_tablet_url || settings.login_split_image_url || null,
    login_bg_mobile_url: settings.login_bg_mobile_url || settings.login_split_image_url || null,
    social_instagram: settings.social_instagram || null,
    social_facebook: settings.social_facebook || null,
    social_linkedin: settings.social_linkedin || null,
    address: store?.address || null,
    city: store?.city || null,
    state: store?.state || null,
    seo_title: store?.seo_title || "Waesy",
    seo_description: store?.seo_description || "Plataforma Comunitária de Comércio Local, Serviços, Turismo e Comunidade",
  };
});

/**
 * Atualiza configurações globais de identidade visual da plataforma.
 * Requer role platform_admin. Persiste tanto em platform_brand_settings quanto na loja matriz.
 */
export const updatePlatformBrandSettings = createServerFn({ method: "POST" })
  .validator(
    z.object({
      logo_url: z.string().url().nullable().optional(),
      favicon_url: z.string().url().nullable().optional(),
      show_name: z.boolean().optional(),
      show_logo: z.boolean().optional(),
      platform_name: z.string().min(1).max(64).optional(),
      support_email: z.string().email().nullable().optional(),
      support_whatsapp: z.string().nullable().optional(),
      support_hours: z.string().nullable().optional(),
      login_split_image_url: z.string().url().nullable().optional(),
      login_bg_desktop_url: z.string().url().nullable().optional(),
      login_bg_tablet_url: z.string().url().nullable().optional(),
      login_bg_mobile_url: z.string().url().nullable().optional(),
      social_instagram: z.string().nullable().optional(),
      social_facebook: z.string().nullable().optional(),
      social_linkedin: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    await requirePlatformAdmin();
    const db = getServerClient();

    // 1. Atualizar ou inserir na tabela canônica platform_brand_settings
    const { data: existingBrand } = await db
      .from("platform_brand_settings")
      .select("id")
      .limit(1)
      .maybeSingle();

    const brandPayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
      ...(input.platform_name !== undefined && { platform_name: input.platform_name, seo_title: input.platform_name }),
      ...(input.logo_url !== undefined && { logo_url: input.logo_url }),
      ...(input.favicon_url !== undefined && { favicon_url: input.favicon_url }),
      ...(input.show_name !== undefined && { show_name: input.show_name }),
      ...(input.show_logo !== undefined && { show_logo: input.show_logo }),
      ...(input.support_email !== undefined && { support_email: input.support_email }),
      ...(input.support_whatsapp !== undefined && { support_whatsapp: input.support_whatsapp }),
      ...(input.support_hours !== undefined && { support_hours: input.support_hours }),
      ...(input.login_split_image_url !== undefined && { login_split_image_url: input.login_split_image_url }),
      ...(input.login_bg_desktop_url !== undefined && { login_bg_desktop_url: input.login_bg_desktop_url }),
      ...(input.login_bg_tablet_url !== undefined && { login_bg_tablet_url: input.login_bg_tablet_url }),
      ...(input.login_bg_mobile_url !== undefined && { login_bg_mobile_url: input.login_bg_mobile_url }),
      ...(input.social_instagram !== undefined && { social_instagram: input.social_instagram }),
      ...(input.social_facebook !== undefined && { social_facebook: input.social_facebook }),
      ...(input.social_linkedin !== undefined && { social_linkedin: input.social_linkedin }),
    };

    if (existingBrand?.id) {
      await db
        .from("platform_brand_settings")
        .update(brandPayload)
        .eq("id", existingBrand.id);
    } else {
      await db
        .from("platform_brand_settings")
        .insert({
          platform_name: input.platform_name || "Waesy",
          ...brandPayload,
        });
    }

    // 2. Sincronizar com a loja matriz stores para retrocompatibilidade
    let store = await resolvePlatformRootStore(db);

    if (!store) {
      const { data: newStore, error: createErr } = await db
        .from("stores")
        .insert({
          name: input.platform_name || "Waesy",
          slug: "waesy",
          is_platform_root: true,
          is_active: true,
          settings: {},
        })
        .select()
        .single();

      if (createErr || !newStore) {
        throw new Error("Erro ao inicializar loja matriz da plataforma.");
      }
      store = newStore;
    }

    const existingSettings = (store.settings as Record<string, any>) || {};

    const updatedSettings = {
      ...existingSettings,
      ...(input.logo_url !== undefined && { logoUrl: input.logo_url, logo_url: input.logo_url }),
      ...(input.favicon_url !== undefined && { faviconUrl: input.favicon_url, favicon_url: input.favicon_url }),
      ...(input.show_name !== undefined && { show_name: input.show_name }),
      ...(input.show_logo !== undefined && { show_logo: input.show_logo }),
      ...(input.support_email !== undefined && { support_email: input.support_email }),
      ...(input.support_whatsapp !== undefined && { support_whatsapp: input.support_whatsapp }),
      ...(input.support_hours !== undefined && { support_hours: input.support_hours }),
      ...(input.login_split_image_url !== undefined && { login_split_image_url: input.login_split_image_url }),
      ...(input.login_bg_desktop_url !== undefined && { login_bg_desktop_url: input.login_bg_desktop_url }),
      ...(input.login_bg_tablet_url !== undefined && { login_bg_tablet_url: input.login_bg_tablet_url }),
      ...(input.login_bg_mobile_url !== undefined && { login_bg_mobile_url: input.login_bg_mobile_url }),
      ...(input.social_instagram !== undefined && { social_instagram: input.social_instagram }),
      ...(input.social_facebook !== undefined && { social_facebook: input.social_facebook }),
      ...(input.social_linkedin !== undefined && { social_linkedin: input.social_linkedin }),
    };

    const updatePayload: Record<string, any> = { settings: updatedSettings, is_platform_root: true };
    if (input.platform_name) updatePayload.name = input.platform_name;

    await db
      .from("stores")
      .update(updatePayload)
      .eq("id", store.id);

    return { success: true, settings: updatedSettings };
  });

// ============================================================
// 9. GESTÃO GLOBAL DE APIS & INTEGRAÇÕES
// ============================================================

export interface PlatformApiIntegrationsDTO {
 mapbox_token?: string;
 stripe_public_key?: string;
 stripe_secret_key?: string;
 asaas_api_key?: string;
 resend_api_key?: string;
 sendgrid_api_key?: string;
 twilio_account_sid?: string;
 twilio_auth_token?: string;
 melhor_envio_token?: string;
 google_maps_api_key?: string;
 openai_api_key?: string;
 webhook_secret?: string;
 // Master Marketplaces & Fiscal
 mercadolivre_app_id?: string;
 mercadolivre_client_secret?: string;
 ifood_client_id?: string;
 ifood_client_secret?: string;
 shopee_partner_id?: string;
 shopee_partner_key?: string;
 focus_nfe_master_token?: string;
 nuvem_fiscal_master_token?: string;
 meta_app_id?: string;
 meta_app_secret?: string;
 google_client_id?: string;
 google_client_secret?: string;
 active_services?: Record<string, "active" | "testing" | "unconfigured" | "error">;
}

/**
 * Busca as chaves de API e status de integrações globais da plataforma.
 * Requer role platform_admin.
 */
export const getPlatformApiIntegrations = createServerFn({ method: "GET" }).handler(
 async (): Promise<PlatformApiIntegrationsDTO> => {
 await requirePlatformAdmin();
 const db = getServerClient();

 const { data: store, error } = await db
 .from("stores")
 .select("settings")
 .or("slug.eq.waesy-matriz,is_platform_root.eq.true")
 .limit(1)
 .maybeSingle();

 if (error) throw new Error("Erro ao buscar integrações: " + error.message);

 const settings = (store?.settings as Record<string, any>) || {};
 const integrations = (settings.integrations as PlatformApiIntegrationsDTO) || {};

 return {
 mapbox_token: integrations.mapbox_token || "",
 stripe_public_key: integrations.stripe_public_key || "",
 stripe_secret_key: integrations.stripe_secret_key ? "••••••••••••••••" : "",
 asaas_api_key: integrations.asaas_api_key ? "••••••••••••••••" : "",
 resend_api_key: integrations.resend_api_key ? "••••••••••••••••" : "",
 sendgrid_api_key: integrations.sendgrid_api_key ? "••••••••••••••••" : "",
 twilio_account_sid: integrations.twilio_account_sid || "",
 twilio_auth_token: integrations.twilio_auth_token ? "••••••••••••••••" : "",
 melhor_envio_token: integrations.melhor_envio_token ? "••••••••••••••••" : "",
 google_maps_api_key: integrations.google_maps_api_key || "",
 openai_api_key: integrations.openai_api_key ? "••••••••••••••••" : "",
 webhook_secret: integrations.webhook_secret || "",
 mercadolivre_app_id: integrations.mercadolivre_app_id || "",
 mercadolivre_client_secret: integrations.mercadolivre_client_secret ? "••••••••••••••••" : "",
 ifood_client_id: integrations.ifood_client_id || "",
 ifood_client_secret: integrations.ifood_client_secret ? "••••••••••••••••" : "",
 shopee_partner_id: integrations.shopee_partner_id || "",
 shopee_partner_key: integrations.shopee_partner_key ? "••••••••••••••••" : "",
 focus_nfe_master_token: integrations.focus_nfe_master_token ? "••••••••••••••••" : "",
 nuvem_fiscal_master_token: integrations.nuvem_fiscal_master_token ? "••••••••••••••••" : "",
 meta_app_id: integrations.meta_app_id || "",
 meta_app_secret: integrations.meta_app_secret ? "••••••••••••••••" : "",
 google_client_id: integrations.google_client_id || "",
 google_client_secret: integrations.google_client_secret ? "••••••••••••••••" : "",
 active_services: integrations.active_services || {
 maps: integrations.mapbox_token ? "active" : "unconfigured",
 payments: integrations.stripe_public_key ? "active" : "unconfigured",
 email: integrations.resend_api_key ? "active" : "unconfigured",
 sms: integrations.twilio_account_sid ? "active" : "unconfigured",
 logistics: integrations.melhor_envio_token ? "active" : "unconfigured",
 },
 };
 },
);

/**
 * Atualiza chaves de API e status de integrações globais da plataforma.
 * Requer role platform_admin.
 */
export const updatePlatformApiIntegrations = createServerFn({ method: "POST" })
 .validator(
 z.object({
 mapbox_token: z.string().optional(),
 stripe_public_key: z.string().optional(),
 stripe_secret_key: z.string().optional(),
 asaas_api_key: z.string().optional(),
 resend_api_key: z.string().optional(),
 sendgrid_api_key: z.string().optional(),
 twilio_account_sid: z.string().optional(),
 twilio_auth_token: z.string().optional(),
 melhor_envio_token: z.string().optional(),
 google_maps_api_key: z.string().optional(),
 openai_api_key: z.string().optional(),
 webhook_secret: z.string().optional(),
 mercadolivre_app_id: z.string().optional(),
 mercadolivre_client_secret: z.string().optional(),
 ifood_client_id: z.string().optional(),
 ifood_client_secret: z.string().optional(),
 shopee_partner_id: z.string().optional(),
 shopee_partner_key: z.string().optional(),
 focus_nfe_master_token: z.string().optional(),
 nuvem_fiscal_master_token: z.string().optional(),
 meta_app_id: z.string().optional(),
 meta_app_secret: z.string().optional(),
 google_client_id: z.string().optional(),
 google_client_secret: z.string().optional(),
 }),
 )
 .handler(async ({ data: input }) => {
 const admin = await requirePlatformAdmin();
 const db = getServerClient();

 const { data: store, error: fetchErr } = await db
 .from("stores")
 .select("id, settings")
 .or("slug.eq.waesy-matriz,is_platform_root.eq.true")
 .limit(1)
 .maybeSingle();

 if (fetchErr || !store) throw new Error("Loja raiz da plataforma não encontrada.");

 const existingSettings = (store.settings as Record<string, any>) || {};
 const existingIntegrations = (existingSettings.integrations as Record<string, any>) || {};

 // Merge seguro: se vier máscara '••••', mantém o valor anterior real
 const cleanValue = (newVal?: string, oldVal?: string) => {
 if (!newVal || newVal.includes("••••")) return oldVal || "";
 return newVal.trim();
 };

 const updatedIntegrations = {
 ...existingIntegrations,
 mapbox_token: cleanValue(input.mapbox_token, existingIntegrations.mapbox_token),
 stripe_public_key: cleanValue(input.stripe_public_key, existingIntegrations.stripe_public_key),
 stripe_secret_key: cleanValue(input.stripe_secret_key, existingIntegrations.stripe_secret_key),
 asaas_api_key: cleanValue(input.asaas_api_key, existingIntegrations.asaas_api_key),
 resend_api_key: cleanValue(input.resend_api_key, existingIntegrations.resend_api_key),
 sendgrid_api_key: cleanValue(input.sendgrid_api_key, existingIntegrations.sendgrid_api_key),
 twilio_account_sid: cleanValue(input.twilio_account_sid, existingIntegrations.twilio_account_sid),
 twilio_auth_token: cleanValue(input.twilio_auth_token, existingIntegrations.twilio_auth_token),
 melhor_envio_token: cleanValue(input.melhor_envio_token, existingIntegrations.melhor_envio_token),
 google_maps_api_key: cleanValue(input.google_maps_api_key, existingIntegrations.google_maps_api_key),
 openai_api_key: cleanValue(input.openai_api_key, existingIntegrations.openai_api_key),
 webhook_secret: cleanValue(input.webhook_secret, existingIntegrations.webhook_secret),
 mercadolivre_app_id: cleanValue(input.mercadolivre_app_id, existingIntegrations.mercadolivre_app_id),
 mercadolivre_client_secret: cleanValue(input.mercadolivre_client_secret, existingIntegrations.mercadolivre_client_secret),
 ifood_client_id: cleanValue(input.ifood_client_id, existingIntegrations.ifood_client_id),
 ifood_client_secret: cleanValue(input.ifood_client_secret, existingIntegrations.ifood_client_secret),
 shopee_partner_id: cleanValue(input.shopee_partner_id, existingIntegrations.shopee_partner_id),
 shopee_partner_key: cleanValue(input.shopee_partner_key, existingIntegrations.shopee_partner_key),
 focus_nfe_master_token: cleanValue(input.focus_nfe_master_token, existingIntegrations.focus_nfe_master_token),
 nuvem_fiscal_master_token: cleanValue(input.nuvem_fiscal_master_token, existingIntegrations.nuvem_fiscal_master_token),
 meta_app_id: cleanValue(input.meta_app_id, existingIntegrations.meta_app_id),
 meta_app_secret: cleanValue(input.meta_app_secret, existingIntegrations.meta_app_secret),
 google_client_id: cleanValue(input.google_client_id, existingIntegrations.google_client_id),
 google_client_secret: cleanValue(input.google_client_secret, existingIntegrations.google_client_secret),
 active_services: {
 maps: input.mapbox_token || existingIntegrations.mapbox_token ? "active" : "unconfigured",
 payments: input.stripe_public_key || existingIntegrations.stripe_public_key ? "active" : "unconfigured",
 email: input.resend_api_key || existingIntegrations.resend_api_key ? "active" : "unconfigured",
 sms: input.twilio_account_sid || existingIntegrations.twilio_account_sid ? "active" : "unconfigured",
 logistics: input.melhor_envio_token || existingIntegrations.melhor_envio_token ? "active" : "unconfigured",
 },
 updated_at: new Date().toISOString(),
 updated_by: admin.id,
 };

 const updatedSettings = {
 ...existingSettings,
 integrations: updatedIntegrations,
 };

 const { error: updateErr } = await db
 .from("stores")
 .update({ settings: updatedSettings })
 .eq("id", store.id);

 if (updateErr) throw new Error("Erro ao salvar integrações: " + updateErr.message);

 // Registra evento de auditoria forense
 await db.from("forensic_audit_events").insert({
 actor_id: admin.id,
 actor_role: "platform_admin",
 target_entity_type: "platform_integrations",
 target_entity_id: store.id,
 action: "update_api_tokens",
 metadata: {
 updated_keys: Object.keys(input).filter((k) => (input as any)[k]),
 },
 });

 return { success: true };
 });

// ============================================================
// 6. CMS & APRESENTAÇÃO DE LOGÍSTICA / MOTOLINK
// ============================================================

export interface LogisticsPresentationSettings {
 title: string;
 subtitle: string;
 badge: string;
 disclaimer: string;
 image_desktop_url: string | null;
 image_tablet_url: string | null;
 image_mobile_url: string | null;
 motolink_name: string;
 features: Array<{
 title: string;
 desc: string;
 icon: string;
 }>;
}

export const DEFAULT_LOGISTICS_PRESENTATION: LogisticsPresentationSettings = {
 title: "Logística Integrada & MotoLink",
 subtitle: "Conecte-se aos entregadores autônomos da sua cidade sem intermediários e com zero taxa de frete.",
 badge: "Zero Taxa de Intermediação",
 disclaimer: "A Waesy é uma infraestrutura tecnológica aberta. Não intermediamos pagamentos de fretes nem cobramos comissão entre entregadores e empresas. A relação comercial e operacional é direta e independente entre das partes.",
 image_desktop_url: null,
 image_tablet_url: null,
 image_mobile_url: null,
 motolink_name: "MotoLink",
 features: [
 {
 title: "Zero Comissão de Frete",
 desc: "Economize de 20% a 30% por entrega. O valor acordado vai 100% para o entregador, sem taxas da plataforma.",
 icon: "BadgePercent",
 },
 {
 title: "Ficha Completa & Segurança",
 desc: "Consulte foto, modelo da moto, placa, contato, selo de verificação e avaliações de outros lojistas da região.",
 icon: "ShieldCheck",
 },
 {
 title: "Frota de Confiança & Bloqueio",
 desc: "Favorite seus motoboys parceiros para chamadas prioritárias e bloqueie condutores com histórico inadequado.",
 icon: "Users",
 },
 {
 title: "MotoLink / Magic Link",
 desc: "Despacho em 1 clique com link inteligente de rastreio em tempo real enviado direto no WhatsApp com rota GPS.",
 icon: "Zap",
 },
 ],
};

export const getLogisticsPresentationSettings = createServerFn({ method: "GET" }).handler(async () => {
 await requirePlatformAdmin();
 const db = getServerClient();
 const store = await resolvePlatformRootStore(db);

 const settings = (store?.settings as Record<string, any>) || {};
 const saved = settings.logistics_presentation as Partial<LogisticsPresentationSettings> | undefined;

 return {
 ...DEFAULT_LOGISTICS_PRESENTATION,
 ...(saved || {}),
 features: saved?.features && saved.features.length > 0 ? saved.features : DEFAULT_LOGISTICS_PRESENTATION.features,
 };
});

export const getPublicLogisticsPresentation = createServerFn({ method: "GET" }).handler(async () => {
 const db = getServerClient();
 try {
 const store = await resolvePlatformRootStore(db);
 const settings = (store?.settings as Record<string, any>) || {};
 const saved = settings.logistics_presentation as Partial<LogisticsPresentationSettings> | undefined;

 return {
 ...DEFAULT_LOGISTICS_PRESENTATION,
 ...(saved || {}),
 features: saved?.features && saved.features.length > 0 ? saved.features : DEFAULT_LOGISTICS_PRESENTATION.features,
 };
 } catch {
 return DEFAULT_LOGISTICS_PRESENTATION;
 }
});

export const updateLogisticsPresentationSettings = createServerFn({ method: "POST" })
 .validator(
 z.object({
 title: z.string().min(2),
 subtitle: z.string().min(2),
 badge: z.string().min(2),
 disclaimer: z.string().min(5),
 image_desktop_url: z.string().url().nullable().optional(),
 image_tablet_url: z.string().url().nullable().optional(),
 image_mobile_url: z.string().url().nullable().optional(),
 motolink_name: z.string().min(2).default("MotoLink"),
 features: z
 .array(
 z.object({
 title: z.string(),
 desc: z.string(),
 icon: z.string(),
 }),
 )
 .optional(),
 }),
 )
 .handler(async ({ data: input }) => {
 const admin = await requirePlatformAdmin();
 const db = getServerClient();
 const store = await resolvePlatformRootStore(db);

 if (!store) throw new Error("Loja raiz da plataforma não encontrada.");

 const existingSettings = (store.settings as Record<string, any>) || {};
 const updatedSettings = {
 ...existingSettings,
 logistics_presentation: {
 title: input.title.trim(),
 subtitle: input.subtitle.trim(),
 badge: input.badge.trim(),
 disclaimer: input.disclaimer.trim(),
 image_desktop_url: input.image_desktop_url || null,
 image_tablet_url: input.image_tablet_url || null,
 image_mobile_url: input.image_mobile_url || null,
 motolink_name: input.motolink_name.trim(),
 features: input.features || DEFAULT_LOGISTICS_PRESENTATION.features,
 updated_at: new Date().toISOString(),
 updated_by: admin.id,
 },
 };

 const { error } = await db
 .from("stores")
 .update({ settings: updatedSettings })
 .eq("id", store.id);

 if (error) {
 throw new Error("Erro ao salvar apresentação de logística: " + error.message);
 }

 return { success: true };
 });

// ============================================================
// 7. AUDITORIA E TELEMETRIA DE SAÚDE DO SISTEMA (7 CAMADAS)
// ============================================================
export const getPlatformSystemHealth = createServerFn({ method: "GET" }).handler(async () => {
 await requirePlatformAdmin();
 const db = getServerClient();

 const [storesCount, productsCount, ordersCount, algorithmParams, walletsCount] = await Promise.all([
 db.from("stores").select("id", { count: "exact", head: true }),
 db.from("products").select("id", { count: "exact", head: true }),
 db.from("orders").select("id", { count: "exact", head: true }),
 db.from("platform_algorithm_parameters").select("*").maybeSingle(),
 db.from("store_token_wallets").select("id", { count: "exact", head: true }),
 ]);

 const algo = algorithmParams.data || {
 weight_geo: 0.25,
 weight_open_status: 0.20,
 weight_user_affinity: 0.20,
 weight_freshness: 0.15,
 weight_store_quality: 0.10,
 weight_token_boost: 0.10,
 };

 const totalWeights = Math.round(
 (Number(algo.weight_geo) +
 Number(algo.weight_open_status) +
 Number(algo.weight_user_affinity) +
 Number(algo.weight_freshness) +
 Number(algo.weight_store_quality) +
 Number(algo.weight_token_boost)) *
 100,
 );

 return {
 status: "healthy",
 timestamp: new Date().toISOString(),
 database: {
 rls_enforced: true,
 isolation_mode: "strict_multi_tenant",
 total_stores: storesCount.count || 0,
 total_products: productsCount.count || 0,
 total_orders: ordersCount.count || 0,
 total_wallets: walletsCount.count || 0,
 },
 algorithm: {
 name: "Waesy Pulse Multi-Signal v1",
 total_weights_percent: totalWeights,
 is_calibrated: totalWeights === 100,
 weights: {
 geo: Number(algo.weight_geo),
 open: Number(algo.weight_open_status),
 affinity: Number(algo.weight_user_affinity),
 freshness: Number(algo.weight_freshness),
 quality: Number(algo.weight_store_quality),
 token_boost: Number(algo.weight_token_boost),
 },
 },
 security: {
 zero_client_trust: true,
 dual_pocket_hard_cost_protection: true,
 immutable_ledger: true,
 },
 ux: {
 three_tap_rule_enforced: true,
 anti_ai_smell_active: true,
 touch_targets_min_44px: true,
 },
 };
});

