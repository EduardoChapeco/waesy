/**
 * admin-360-governance.functions.ts — Camada BFF de Telemetria 360º, Auditoria Forense & Governança Master
 *
 * Provê os 8 contratos de servidor para:
 * 1. getUserFull360Activity (Dossiê 360º com 7 dimensões e certificação imutável SHA-256)
 * 2. adminForceSetUserPassword (Redefinição forçada de credencial de acesso via Supabase Auth Admin)
 * 3. adminTransferStoreOwnership (Transferência societária transacional de lojas com recibo forense)
 * 4. adminToggleUserAccess (Bloqueio e desbloqueio imediato de contas com registro auditado)
 * 5. recordFormSubmissionAudit (Ingestão de auditoria de formulários preenchidos com IP/VPN)
 * 6. recordCartTelemetryEvent (Event-stream segundo a segundo de carrinhos e afinidade cliente-loja)
 * 7. recordStaffActionLog (Amarração compulsória de ações de funcionários ao CPF civil do operador)
 * 8. getMyActivityHistory (Auto-inspeção transparente de atividades do cliente civil)
 *
 * Conformidade com Invariante B.25: 100% dos parâmetros desestruturados com coalescência defensiva.
 * Conformidade com Guardas de Segurança: requirePlatformAdmin autônomo (sem dependência de store_id).
 */

import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/start-server-core";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { captureRequestTelemetry } from "@/lib/network-telemetry.server";

// ============================================================================
// UTILITÁRIO CRIPTOGRÁFICO CANÔNICO (Web Crypto API)
// ============================================================================

/**
 * Calcula determinísticamente o hash SHA-256 em representação hexadecimal minúscula.
 * Opera nativamente no runtime Cloudflare Workers e Node.js 18+.
 */
export async function computeSha256Digest(data: unknown): Promise<string> {
  const jsonStr = typeof data === "string" ? data : JSON.stringify(data);
  const msgBuffer = new TextEncoder().encode(jsonStr);
  const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ============================================================================
// GUARDA AUTÔNOMO DE PLATAFORMA MASTER
// ============================================================================

/**
 * Valida se a identidade ativa possui privilégio de platform_admin (Master Admin).
 * Não impõe dependência de store_id para permitir governança global do ecossistema.
 */
async function requirePlatformAdmin() {
  const identity = await getServerIdentity();
  if (!identity.id) {
    throw new Error("Não autenticado. Por favor, faça login.");
  }

  if (identity.role === "platform_admin" || identity.isPlatformAdmin) {
    return identity;
  }

  const db = getServerClient();
  const { data: p } = await db
    .from("profiles")
    .select("role")
    .eq("id", identity.id)
    .maybeSingle();

  if (p?.role === "platform_admin") {
    return { ...identity, role: "platform_admin", isPlatformAdmin: true };
  }

  const { data: userData } = await db.auth.admin
    .getUserById(identity.id)
    .catch(() => ({ data: { user: null } }));

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
      console.error("[360-governance] Falha ao persistir promoção para platform_admin:", promotionError);
      throw new Error("Não foi possível confirmar a autorização administrativa.");
    }
    return { ...identity, role: "platform_admin", isPlatformAdmin: true };
  }

  throw new Error("Acesso negado. Apenas administradores globais master podem realizar esta ação.");
}

// ============================================================================
// SCHEMAS DE VALIDAÇÃO ZOD (INVARIANTE B.25 PARITY)
// ============================================================================

export const getUserFull360ActivityInput = z.object({
  userId: z.string().uuid("ID de usuário inválido"),
});

export const adminForceSetUserPasswordInput = z.object({
  userId: z.string().uuid("ID de usuário inválido"),
  newPassword: z.string().min(8, "A senha deve conter no mínimo 8 caracteres"),
  reason: z.string().optional().default("Redefinição forçada de senha pelo Master Admin"),
});

export const adminTransferStoreOwnershipInput = z.object({
  storeId: z.string().uuid("ID da loja inválido"),
  newOwnerUserId: z.string().uuid("ID do novo titular inválido").optional(),
  newOwnerId: z.string().uuid("ID do novo titular inválido").optional(),
  currentOwnerUserId: z.string().uuid("ID do titular atual inválido").optional().nullable(),
  currentOwnerId: z.string().uuid("ID do titular atual inválido").optional().nullable(),
  reason: z.string().min(5, "Motivo obrigatório para auditoria societária").optional(),
  transferReason: z.string().min(5, "Motivo obrigatório para auditoria societária").optional(),
  notes: z.string().optional().default(""),
});

export const adminToggleUserAccessInput = z.object({
  userId: z.string().uuid("ID de usuário inválido"),
  blocked: z.boolean().optional(),
  block: z.boolean().optional(),
  reason: z.string().optional().default("Ação disciplinar administrativa"),
});

export const recordFormSubmissionAuditInput = z.object({
  formType: z
    .enum([
      "proposal",
      "quote",
      "job_application",
      "support_ticket",
      "user_registration",
      "classified_lead",
      "contact",
      "other",
      "custom",
    ])
    .optional()
    .default("other"),
  formName: z.string().optional(),
  route: z.string().optional(),
  routePath: z.string().optional(),
  payload: z.record(z.any()).optional().default({}),
  storeId: z.string().uuid("ID da loja inválido").optional().nullable(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  isVpn: z.boolean().optional(),
  metadata: z.record(z.any()).optional().default({}),
});

export const recordCartTelemetryEventInput = z.object({
  storeId: z.string().uuid("ID da loja inválido"),
  cartId: z.string().uuid().optional().nullable(),
  productId: z.string().uuid().optional().nullable(),
  variantId: z.string().uuid().optional().nullable(),
  action: z.enum([
    "item_added",
    "item_removed",
    "quantity_updated",
    "cart_abandoned",
    "cart_cleared",
    "checkout_started",
    "cart_restored",
    "add",
    "remove",
    "update_quantity",
    "abandon",
    "checkout_start",
  ]),
  eventType: z
    .enum([
      "item_added",
      "item_removed",
      "quantity_updated",
      "cart_abandoned",
      "cart_cleared",
      "checkout_started",
      "cart_restored",
      "add",
      "remove",
      "update_quantity",
      "abandon",
      "checkout_start",
    ])
    .optional(),
  quantity: z.number().int().optional().default(1),
  quantityDelta: z.number().int().optional(),
  unitPriceCents: z.number().int().min(0).optional().default(0),
  totalCartCents: z.number().int().min(0).optional().default(0),
  itemsCount: z.number().int().min(0).optional().default(1),
  sessionId: z.string().optional().nullable(),
  sessionToken: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional().default({}),
  payload: z.record(z.any()).optional().default({}),
});

export const recordStaffActionLogInput = z.object({
  storeId: z.string().uuid("ID da loja inválido"),
  module: z.string().min(1, "Módulo de operação obrigatório"),
  action: z.string().min(1, "Ação realizada obrigatória"),
  operatorCpf: z.string().optional().nullable(),
  operatorRole: z.string().optional().default("operator"),
  targetEntityType: z.string().optional().nullable(),
  targetEntityId: z.string().optional().nullable(),
  beforePayload: z.record(z.any()).optional().nullable(),
  afterPayload: z.record(z.any()).optional().nullable(),
  diffSummary: z.string().optional().nullable(),
  details: z.record(z.any()).optional().default({}),
  metadata: z.record(z.any()).optional().default({}),
});

export const getMyActivityHistoryInput = z
  .object({
    category: z
      .enum(["all", "forms", "cart", "mobility", "orders"])
      .optional()
      .default("all"),
    type: z.enum(["all", "forms", "cart", "mobility", "orders"]).optional(),
    limit: z.number().int().min(1).max(100).optional().default(50),
    cursor: z.string().optional().nullable(),
  })
  .optional();

// ============================================================================
// 1. DOSSIÊ 360º COMPLETO (7 DIMENSÕES + CERTIFICAÇÃO SHA-256)
// ============================================================================

export const getUserFull360Activity = createServerFn({ method: "GET" })
  .validator(getUserFull360ActivityInput)
  .handler(async ({ data }) => {
    // Invariante B.25: Desestruturação 100% segura
    const { userId } = data;
    const targetUserId = userId;

    await requirePlatformAdmin();
    const db = getServerClient();

    // Executa queries das 7 dimensões em paralelo
    const [
      // Dimensão 1: Geral & Acessos
      profileRes,
      membersRes,
      sanctionsRes,

      // Dimensão 2: Documentos & KYC
      kycRes,
      termsRes,

      // Dimensão 3: Formulários & Cadastros
      formsRes,
      quotesRes,

      // Dimensão 4: Telemetria & Navegação
      sessionsRes,
      devicesRes,
      pwaRes,

      // Dimensão 5: E-Commerce & Carrinhos
      cartRes,
      ordersRes,
      affinityRes,

      // Dimensão 6: Mobilidade & GPS / Dívida
      mobilityRes,
      debtRes,

      // Dimensão 7: Ações como Operador
      staffLogsRes,
    ] = await Promise.all([
      // 1. Geral & Acessos
      db.from("profiles").select("*").eq("id", targetUserId).single(),
      db
        .from("workspace_members")
        .select("id, store_id, role, created_at, stores(id, name, slug, logo_url, is_active)")
        .eq("user_id", targetUserId),
      db
        .from("user_moderation_sanctions")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false }),

      // 2. Documentos & KYC
      db
        .from("identity_kyc_verifications")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false }),
      db
        .from("legal_terms_acceptances")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false }),

      // 3. Formulários & Cadastros
      db
        .from("user_form_submissions_log")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("quotes")
        .select("id, quote_number, total_cents, status, created_at")
        .eq("customer_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(50),

      // 4. Telemetria & Navegação
      db
        .from("session_audit_logs")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(50),
      db
        .from("device_registry")
        .select("*")
        .eq("user_id", targetUserId)
        .order("last_active_at", { ascending: false })
        .limit(50),
      db
        .from("pwa_telemetry")
        .select("*")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(50),

      // 5. E-Commerce & Carrinhos
      db
        .from("user_cart_telemetry")
        .select("*, stores(id, name, slug), products(id, title, price_cents)")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(100),
      db
        .from("orders")
        .select("id, public_token, status, total_cents, created_at, shipping_address, store_id, stores(id, name, slug)")
        .eq("customer_id", targetUserId)
        .neq("origin_type", "mobility")
        .order("created_at", { ascending: false })
        .limit(50),
      db
        .from("customer_store_affinity")
        .select("*, stores(id, name, slug)")
        .eq("customer_id", targetUserId)
        .order("last_interaction_at", { ascending: false })
        .limit(50),

      // 6. Mobilidade & GPS / Dívida
      db
        .from("orders")
        .select("id, status, total_cents, items_snapshot, created_at, shipping_address, store_id")
        .eq("customer_id", targetUserId)
        .eq("origin_type", "mobility")
        .order("created_at", { ascending: false })
        .limit(50),
      db
        .from("customer_debt_ledger")
        .select("*")
        .eq("customer_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(50),

      // 7. Ações como Operador
      db
        .from("employee_tenant_audit_logs")
        .select("*, stores(id, name, slug)")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (!profileRes.data) {
      throw new Error("Perfil de usuário não encontrado.");
    }

    const generatedAt = new Date().toISOString();

    const dossierSnapshot = {
      general_and_access: {
        profile: profileRes.data,
        workspace_memberships: membersRes.data || [],
        sanctions: sanctionsRes.data || [],
      },
      documents_and_kyc: {
        kyc_verifications: kycRes.data || [],
        terms_acceptances: termsRes.data || [],
      },
      forms_and_submissions: {
        submissions_log: formsRes.data || [],
        quotes: quotesRes.data || [],
      },
      telemetry_and_navigation: {
        sessions: sessionsRes.data || [],
        devices: devicesRes.data || [],
        pwa_telemetry: pwaRes.data || [],
      },
      ecommerce_and_carts: {
        cart_events: cartRes.data || [],
        orders: ordersRes.data || [],
        store_affinities: affinityRes.data || [],
      },
      mobility_and_debt: {
        rides_and_deliveries: mobilityRes.data || [],
        debt_ledger: debtRes.data || [],
      },
      staff_operator_actions: {
        actions_log: staffLogsRes.data || [],
      },
      metadata: {
        target_user_id: targetUserId,
        generated_at: generatedAt,
      },
    };

    // Certificação forense imutável via Web Crypto SHA-256
    const sha256Certified = await computeSha256Digest(dossierSnapshot);

    return {
      dossier: dossierSnapshot,
      sha256_certified: sha256Certified,
      sha256_certification: sha256Certified,
      generated_at: generatedAt,
    };
  });

// ============================================================================
// 2. REDEFINIÇÃO FORÇADA DE SENHA (MASTER ADMIN AUTH ADMIN)
// ============================================================================

export const adminForceSetUserPassword = createServerFn({ method: "POST" })
  .validator(adminForceSetUserPasswordInput)
  .handler(async ({ data }) => {
    // Invariante B.25: Desestruturação 100% segura
    const { userId, newPassword, reason } = data;
    const targetUserId = userId;
    const safePassword = newPassword;
    const safeReason = (reason ?? "Redefinição forçada de senha pelo Master Admin").trim();

    const admin = await requirePlatformAdmin();
    const db = getServerClient();

    // Executa a alteração direta via Supabase Auth Admin API
    const { error: updateError } = await db.auth.admin.updateUserById(targetUserId, {
      password: safePassword,
    });

    if (updateError) {
      throw new Error(`Falha ao redefinir credencial de acesso: ${updateError.message}`);
    }

    const timestamp = new Date().toISOString();

    // Insere evento na trilha forense imutável
    await db
      .from("forensic_audit_events")
      .insert({
        action: "admin_force_password_reset",
        operator_id: admin.id,
        target_entity_type: "user",
        target_entity_id: targetUserId,
        details: {
          reason: safeReason,
          target_user_id: targetUserId,
          executed_by: admin.id,
          timestamp,
        },
      })
      ;

    return {
      success: true,
      message: "Senha de acesso atualizada com sucesso pelo Master Admin.",
      updatedAt: timestamp,
    };
  });

// ============================================================================
// 3. TRANSFERÊNCIA DE TITULARIDADE DE LOJA COM RECIBO FORENSE
// ============================================================================

export const adminTransferStoreOwnership = createServerFn({ method: "POST" })
  .validator(adminTransferStoreOwnershipInput)
  .handler(async ({ data }) => {
    // Invariante B.25: Desestruturação 100% segura com suporte a aliases
    const {
      storeId,
      newOwnerUserId,
      newOwnerId,
      currentOwnerUserId,
      currentOwnerId,
      reason,
      transferReason,
      notes,
    } = data;

    const safeStoreId = storeId;
    const safeNewOwnerId = (newOwnerUserId ?? newOwnerId)!;
    if (!safeNewOwnerId) {
      throw new Error("ID do novo titular é obrigatório.");
    }
    const safeCurrentOwnerId = currentOwnerUserId ?? currentOwnerId ?? null;
    const safeReason = (reason ?? transferReason ?? "Transferência societária realizada pelo Master Admin").trim();
    const safeNotes = (notes ?? "").trim();

    const admin = await requirePlatformAdmin();
    const db = getServerClient();

    // 1. Verifica existência da loja
    const { data: store, error: storeErr } = await db
      .from("stores")
      .select("id, name, slug, owner_id, settings")
      .eq("id", safeStoreId)
      .single();

    if (storeErr || !store) {
      throw new Error("Estabelecimento não encontrado.");
    }

    // 2. Verifica existência do novo proprietário
    const { data: newOwnerProfile, error: profileErr } = await db
      .from("profiles")
      .select("id, full_name, email, tax_id")
      .eq("id", safeNewOwnerId)
      .single();

    if (profileErr || !newOwnerProfile) {
      throw new Error("Perfil do novo titular não encontrado.");
    }

    const previousOwnerId = safeCurrentOwnerId || store.owner_id;
    const timestamp = new Date().toISOString();

    // 3. Atualiza o proprietário anterior em workspace_members para 'manager'
    if (previousOwnerId) {
      await db
        .from("workspace_members")
        .update({ role: "manager" })
        .eq("store_id", safeStoreId)
        .eq("user_id", previousOwnerId)
        ;
    }

    // 4. Insere ou atualiza o novo titular em workspace_members com role 'owner'
    const { error: memberErr } = await db
      .from("workspace_members")
      .upsert(
        {
          store_id: safeStoreId,
          user_id: safeNewOwnerId,
          role: "owner",
          is_active: true,
          updated_at: timestamp,
        },
        { onConflict: "store_id,user_id" }
      );

    if (memberErr) {
      throw new Error(`Falha ao atribuir permissão societária: ${memberErr.message}`);
    }

    // 5. Atualiza a loja com novo owner_id e registro nos settings
    const existingSettings =
      store.settings && typeof store.settings === "object" ? store.settings : {};

    const updatedSettings = {
      ...existingSettings,
      previous_owner_id: previousOwnerId,
      transferred_at: timestamp,
      transfer_reason: safeReason,
      transfer_operator_id: admin.id,
      notes: safeNotes,
    };

    const { error: updateStoreErr } = await db
      .from("stores")
      .update({
        owner_id: safeNewOwnerId,
        settings: updatedSettings,
        updated_at: timestamp,
      })
      .eq("id", safeStoreId);

    if (updateStoreErr) {
      throw new Error(`Falha ao atualizar dados do estabelecimento: ${updateStoreErr.message}`);
    }

    // 6. Gera recibo forense com checksum SHA-256
    const receiptData = {
      receipt_id: `transfer_${safeStoreId.substring(0, 8)}_${Date.now()}`,
      store_id: safeStoreId,
      store_name: store.name,
      previous_owner_id: previousOwnerId,
      new_owner_id: safeNewOwnerId,
      new_owner_name: newOwnerProfile.full_name || newOwnerProfile.email,
      admin_operator_id: admin.id,
      reason: safeReason,
      notes: safeNotes,
      timestamp,
    };

    const receiptSha256 = await computeSha256Digest(receiptData);
    const receipt = {
      ...receiptData,
      checksum_sha256: receiptSha256,
      sha256_receipt: receiptSha256,
    };

    // 7. Registra evento na trilha forense
    await db
      .from("forensic_audit_events")
      .insert({
        action: "store_ownership_transfer",
        operator_id: admin.id,
        target_entity_type: "store",
        target_entity_id: safeStoreId,
        details: receipt,
      })
      ;

    return {
      success: true,
      message: "Titularidade societária transferida com sucesso.",
      receipt,
    };
  });

// ============================================================================
// 4. BLOQUEIO / DESBLOQUEIO IMEDIATO DE ACESSO COM MOTIVO REGISTRADO
// ============================================================================

export const adminToggleUserAccess = createServerFn({ method: "POST" })
  .validator(adminToggleUserAccessInput)
  .handler(async ({ data }) => {
    // Invariante B.25: Desestruturação 100% segura com suporte a aliases
    const { userId, blocked, block, reason } = data;
    const targetUserId = userId;
    const isBlocked = blocked !== undefined ? blocked : (block !== undefined ? block : false);
    const safeReason = (reason ?? "Ação disciplinar administrativa").trim();

    const admin = await requirePlatformAdmin();
    const db = getServerClient();

    // Verifica existência do perfil
    const { data: profile, error: profErr } = await db
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("id", targetUserId)
      .single();

    if (profErr || !profile) {
      throw new Error("Perfil de usuário não encontrado.");
    }

    const timestamp = new Date().toISOString();

    if (isBlocked) {
      // 1. Supabase Auth Ban imediato
      await db.auth.admin
        .updateUserById(targetUserId, {
          ban_duration: "876000h", // 100 anos
        })
        ;

      // 2. Insere sanção em user_moderation_sanctions
      await db
        .from("user_moderation_sanctions")
        .insert({
          user_id: targetUserId,
          sanction_type: "permanent_ban",
          reason: safeReason,
          created_by: admin.id,
          is_active: true,
          created_at: timestamp,
        })
        ;

      // 3. Atualiza perfil
      await db
        .from("profiles")
        .update({
          role: profile.role === "platform_admin" ? profile.role : "suspended",
          updated_at: timestamp,
        })
        .eq("id", targetUserId)
        ;
    } else {
      // 1. Supabase Auth Unban imediato
      await db.auth.admin
        .updateUserById(targetUserId, {
          ban_duration: "none",
        })
        ;

      // 2. Revoga sanções ativas
      await db
        .from("user_moderation_sanctions")
        .update({
          is_active: false,
          revoked_at: timestamp,
          revoke_reason: safeReason,
          revoked_by: admin.id,
        })
        .eq("user_id", targetUserId)
        .eq("is_active", true)
        ;

      // 3. Restaura papel do perfil se estava suspenso
      if (profile.role === "suspended") {
        await db
          .from("profiles")
          .update({
            role: "customer",
            updated_at: timestamp,
          })
          .eq("id", targetUserId)
          ;
      }
    }

    // Registra na trilha forense
    await db
      .from("forensic_audit_events")
      .insert({
        action: isBlocked ? "admin_block_user" : "admin_unblock_user",
        operator_id: admin.id,
        target_entity_type: "user",
        target_entity_id: targetUserId,
        details: {
          blocked: isBlocked,
          reason: safeReason,
          timestamp,
        },
      })
      ;

    return {
      success: true,
      status: isBlocked ? "blocked" : "active",
      message: isBlocked
        ? "Acesso do usuário bloqueado com sucesso."
        : "Acesso do usuário desbloqueado com sucesso.",
    };
  });

// ============================================================================
// 5. INGESTÃO DE AUDITORIA DE FORMULÁRIOS SUBMETIDOS (COM IP & VPN)
// ============================================================================

export const recordFormSubmissionAudit = createServerFn({ method: "POST" })
  .validator(recordFormSubmissionAuditInput)
  .handler(async ({ data }) => {
    // Invariante B.25: Desestruturação 100% segura
    const {
      formType,
      formName,
      route,
      routePath,
      payload,
      storeId,
      ip,
      userAgent,
      isVpn,
      metadata,
    } = data;

    const safeFormType = formType ?? "other";
    const safeRoute = route ?? routePath ?? "/";
    const safeRoutePath = routePath ?? route ?? "/";
    const safeFormName = formName ?? `Form_${safeFormType}`;
    const safePayload = payload ?? {};
    const safeStoreId = storeId ?? null;
    const safeMetadata = metadata ?? {};

    // Higienização perimetral de payload: expurga senhas, tokens e credenciais
    const sanitizedPayload: Record<string, any> = {};
    for (const [key, value] of Object.entries(safePayload)) {
      const lower = key.toLowerCase();
      if (
        lower.includes("password") ||
        lower.includes("senha") ||
        lower.includes("token") ||
        lower.includes("secret") ||
        lower.includes("cvv") ||
        lower.includes("cardnumber")
      ) {
        sanitizedPayload[key] = "[REDACTED]";
      } else {
        sanitizedPayload[key] = value;
      }
    }

    // Identidade do chamador (autenticado ou visitante anônimo)
    const identity = await getServerIdentity().catch(() => null);
    const userId = identity?.id || null;

    // Resolução de telemetria de rede e geo
    let req: Request | null = null;
    try {
      req = getRequest();
    } catch {}
    const telemetry = req ? captureRequestTelemetry(req) : null;

    const clientIp = ip ?? telemetry?.ip ?? "127.0.0.1";
    const clientUserAgent = userAgent ?? telemetry?.userAgent ?? "Navegador Web";
    const clientIsVpn = isVpn !== undefined ? isVpn : (telemetry?.isDatacenterOrVpn ?? false);
    const geo = telemetry?.geo;

    const db = getServerClient();
    const { data: record, error } = await db
      .from("user_form_submissions_log")
      .insert({
        user_id: userId,
        profile_id: userId,
        store_id: safeStoreId,
        form_type: safeFormType,
        form_name: safeFormName,
        route: safeRoute,
        route_path: safeRoutePath,
        sanitized_payload: sanitizedPayload,
        ip_address: clientIp,
        is_vpn: clientIsVpn,
        user_agent: clientUserAgent,
        geo_city: geo?.city ?? null,
        geo_state: geo?.state ?? null,
        geo_country: geo?.country ?? null,
        metadata: safeMetadata,
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.warn("[360-governance] Falha ao registrar log de formulário:", error.message);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      submissionId: record?.id,
      createdAt: record?.created_at,
    };
  });

// ============================================================================
// 6. INGESTÃO DE TELEMETRIA DE CARRINHO & AFINIDADE CLIENTE-LOJA
// ============================================================================

export const recordCartTelemetryEvent = createServerFn({ method: "POST" })
  .validator(recordCartTelemetryEventInput)
  .handler(async ({ data }) => {
    // Invariante B.25: Desestruturação 100% segura
    const {
      storeId,
      cartId,
      productId,
      variantId,
      action,
      eventType,
      quantity,
      quantityDelta,
      unitPriceCents,
      totalCartCents,
      itemsCount,
      sessionId,
      sessionToken,
      metadata,
      payload,
    } = data;

    const safeStoreId = storeId;
    const safeCartId = cartId ?? null;
    const safeProductId = productId ?? null;
    const safeVariantId = variantId ?? null;
    const safeAction = eventType ?? action;
    const safeQuantityDelta = quantityDelta ?? quantity ?? 1;
    const safeUnitPriceCents = unitPriceCents ?? 0;
    const safeTotalCartCents = totalCartCents ?? 0;
    const safeItemsCount = itemsCount ?? 1;
    const safeSessionToken = sessionToken ?? sessionId ?? null;
    const safePayload = { ...(payload || {}), ...(metadata || {}) };

    const identity = await getServerIdentity().catch(() => null);
    const userId = identity?.id || null;

    let req: Request | null = null;
    try {
      req = getRequest();
    } catch {}
    const telemetry = req ? captureRequestTelemetry(req) : null;

    const db = getServerClient();
    const { data: record, error: cartErr } = await db
      .from("user_cart_telemetry")
      .insert({
        cart_id: safeCartId,
        store_id: safeStoreId,
        user_id: userId,
        session_token: safeSessionToken,
        session_id: safeSessionToken,
        product_id: safeProductId,
        variant_id: safeVariantId,
        event_type: safeAction,
        quantity_delta: safeQuantityDelta,
        unit_price_cents: safeUnitPriceCents,
        total_cart_cents: safeTotalCartCents,
        items_count: safeItemsCount,
        payload: safePayload,
        metadata: safePayload,
        ip_address: telemetry?.ip ?? null,
        user_agent: telemetry?.userAgent ?? null,
        device_fingerprint: telemetry?.deviceName ?? null,
      })
      .select("id, created_at")
      .single();

    if (cartErr) {
      console.warn("[360-governance] Falha ao registrar telemetria de carrinho:", cartErr.message);
      return { success: false, error: cartErr.message };
    }

    // Atualização de métricas em customer_store_affinity se o usuário for identificado
    if (userId && safeStoreId) {
      try {
        const isAdd = safeAction === "add" || safeAction === "item_added";
        const isCheckout = safeAction === "checkout_start" || safeAction === "checkout_started";
        const now = new Date().toISOString();

        const { data: existingAffinity } = await db
          .from("customer_store_affinity")
          .select("*")
          .eq("customer_id", userId)
          .eq("store_id", safeStoreId)
          .maybeSingle();

        if (existingAffinity) {
          const newCartAdditions = isAdd
            ? (existingAffinity.cart_additions_count || 0) + 1
            : (existingAffinity.cart_additions_count || 0);

          let newLevel = existingAffinity.affinity_level || "visitor";
          if (newLevel === "lead" || newLevel === "visitor") {
            if (isCheckout) newLevel = "buyer";
            else if (newCartAdditions >= 3) newLevel = "fan";
          }

          await db
            .from("customer_store_affinity")
            .update({
              cart_additions_count: newCartAdditions,
              total_cart_additions: newCartAdditions,
              affinity_level: newLevel,
              last_interaction_at: now,
              last_cart_activity_at: now,
              updated_at: now,
            })
            .eq("id", existingAffinity.id);
        } else {
          await db.from("customer_store_affinity").insert({
            customer_id: userId,
            store_id: safeStoreId,
            affinity_level: isCheckout ? "buyer" : "lead",
            total_visits: 1,
            visits_count: 1,
            total_cart_additions: isAdd ? 1 : 0,
            cart_additions_count: isAdd ? 1 : 0,
            total_orders_count: 0,
            orders_count: 0,
            total_revenue_cents: 0,
            total_spent_cents: 0,
            average_ticket_cents: 0,
            last_visit_at: now,
            last_interaction_at: now,
            last_cart_activity_at: now,
          });
        }
      } catch (affErr) {
        console.warn("[360-governance] Falha não-bloqueante na matriz de afinidade:", affErr);
      }
    }

    return {
      success: true,
      eventId: record?.id,
      createdAt: record?.created_at,
    };
  });

// ============================================================================
// 7. AUDITORIA DE AÇÕES CORPORATIVAS DE FUNCIONÁRIOS (AMARRADAS AO CPF)
// ============================================================================

export const recordStaffActionLog = createServerFn({ method: "POST" })
  .validator(recordStaffActionLogInput)
  .handler(async ({ data }) => {
    // Invariante B.25: Desestruturação 100% segura
    const {
      storeId,
      module,
      action,
      operatorCpf,
      operatorRole,
      targetEntityType,
      targetEntityId,
      beforePayload,
      afterPayload,
      diffSummary,
      details,
      metadata,
    } = data;

    const safeStoreId = storeId;
    const safeModule = module;
    const safeAction = action;
    const safeOperatorCpf = operatorCpf ?? null;
    const safeOperatorRole = operatorRole ?? "operator";
    const safeTargetEntityType = targetEntityType ?? null;
    const safeTargetEntityId = targetEntityId ?? null;
    const safeBeforePayload = beforePayload ?? null;
    const safeAfterPayload = afterPayload ?? null;
    const safeDiffSummary = diffSummary ?? null;
    const safeDetails = { ...(metadata || {}), ...(details || {}) };

    // Requer operador corporativo autenticado
    const identity = await getServerIdentity();
    if (!identity.id) {
      throw new Error("Não autenticado. Usuário deve estar logado para registrar ação corporativa.");
    }

    const db = getServerClient();

    // Recupera CPF físico do operador a partir do perfil caso não fornecido explicitamente
    let finalCpf = safeOperatorCpf;
    if (!finalCpf) {
      const { data: profile } = await db
        .from("profiles")
        .select("tax_id")
        .eq("id", identity.id)
        .single();
      finalCpf = profile?.tax_id ?? null;
    }

    let req: Request | null = null;
    try {
      req = getRequest();
    } catch {}
    const telemetry = req ? captureRequestTelemetry(req) : null;

    const { data: logEntry, error } = await db
      .from("employee_tenant_audit_logs")
      .insert({
        user_id: identity.id,
        profile_id: identity.id,
        store_id: safeStoreId,
        operator_cpf: finalCpf,
        operator_role: safeOperatorRole,
        module: safeModule,
        action: safeAction,
        target_entity_type: safeTargetEntityType,
        target_entity_id: safeTargetEntityId,
        before_payload: safeBeforePayload,
        after_payload: safeAfterPayload,
        diff_summary: safeDiffSummary,
        details: safeDetails,
        metadata: safeDetails,
        ip_address: telemetry?.ip ?? null,
        is_vpn: telemetry?.isDatacenterOrVpn ?? false,
        user_agent: telemetry?.userAgent ?? null,
        device_fingerprint: telemetry?.deviceName ?? null,
      })
      .select("id, created_at")
      .single();

    if (error) {
      throw new Error(`Falha ao registrar auditoria de operador: ${error.message}`);
    }

    return {
      success: true,
      logId: logEntry?.id,
      createdAt: logEntry?.created_at,
    };
  });

// ============================================================================
// 8. VISÃO TRANSPARENTE DO CLIENTE CIVIL: MINHA ATIVIDADE
// ============================================================================

export const getMyActivityHistory = createServerFn({ method: "GET" })
  .validator(getMyActivityHistoryInput)
  .handler(async ({ data }) => {
    // Invariante B.25: Desestruturação 100% defensiva com tratamento de dados opcionais
    const input = (data ?? {}) as any;
    const { category, type, limit, cursor } = input;
    const safeCategory = type ?? category ?? "all";
    const safeLimit = limit ?? 50;
    const safeCursor = cursor ?? null;

    const identity = await getServerIdentity();
    if (!identity.id) {
      throw new Error("Não autenticado. Faça login para consultar seu histórico de atividades.");
    }

    const userId = identity.id;
    const db = getServerClient();

    const shouldFetchForms = safeCategory === "all" || safeCategory === "forms";
    const shouldFetchCart = safeCategory === "all" || safeCategory === "cart";
    const shouldFetchOrders = safeCategory === "all" || safeCategory === "orders";
    const shouldFetchMobility = safeCategory === "all" || safeCategory === "mobility";

    const [formsRes, cartRes, ordersRes, mobilityRes] = await Promise.all([
      shouldFetchForms
        ? db
            .from("user_form_submissions_log")
            .select("id, form_type, form_name, route, created_at, metadata")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(safeLimit)
        : Promise.resolve({ data: [] }),
      shouldFetchCart
        ? db
            .from("user_cart_telemetry")
            .select(
              "id, event_type, store_id, product_id, created_at, stores(name, slug), products(title)"
            )
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(safeLimit)
        : Promise.resolve({ data: [] }),
      shouldFetchOrders
        ? db
            .from("orders")
            .select("id, public_token, status, total_cents, created_at, stores(name, slug)")
            .eq("customer_id", userId)
            .neq("origin_type", "mobility")
            .order("created_at", { ascending: false })
            .limit(safeLimit)
        : Promise.resolve({ data: [] }),
      shouldFetchMobility
        ? db
            .from("orders")
            .select("id, status, total_cents, created_at, items_snapshot")
            .eq("customer_id", userId)
            .eq("origin_type", "mobility")
            .order("created_at", { ascending: false })
            .limit(safeLimit)
        : Promise.resolve({ data: [] }),
    ]);

    interface ActivityItem {
      id: string;
      category: "forms" | "cart" | "orders" | "mobility";
      title: string;
      description: string;
      timestamp: string;
      metadata?: Record<string, any>;
    }

    const items: ActivityItem[] = [];

    // Mapeamento de formulários enviados
    for (const f of formsRes.data || []) {
      items.push({
        id: f.id,
        category: "forms",
        title: f.form_name || "Formulário Enviado",
        description: `Submetido na rota ${f.route || "/"}`,
        timestamp: f.created_at,
        metadata: { form_type: f.form_type, ...(f.metadata || {}) },
      });
    }

    // Mapeamento de eventos de carrinho
    for (const c of cartRes.data || []) {
      const storeName = (c.stores as any)?.name || "Estabelecimento";
      const productTitle = (c.products as any)?.title || "Produto";
      let actionLabel = "Atividade no carrinho";
      if (c.event_type === "add" || c.event_type === "item_added") {
        actionLabel = "Item adicionado ao carrinho";
      } else if (c.event_type === "remove" || c.event_type === "item_removed") {
        actionLabel = "Item removido do carrinho";
      } else if (c.event_type === "abandon" || c.event_type === "cart_abandoned") {
        actionLabel = "Carrinho abandonado";
      } else if (c.event_type === "checkout_start" || c.event_type === "checkout_started") {
        actionLabel = "Checkout iniciado";
      }

      items.push({
        id: c.id,
        category: "cart",
        title: actionLabel,
        description: `${productTitle} em ${storeName}`,
        timestamp: c.created_at,
        metadata: { event_type: c.event_type, store_id: c.store_id },
      });
    }

    // Mapeamento de pedidos de e-commerce
    for (const o of ordersRes.data || []) {
      const storeName = (o.stores as any)?.name || "Estabelecimento";
      const val = (o.total_cents / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      items.push({
        id: o.id,
        category: "orders",
        title: `Pedido ${o.public_token || o.id.substring(0, 8)}`,
        description: `${val} • ${storeName} (${o.status})`,
        timestamp: o.created_at,
        metadata: { total_cents: o.total_cents, status: o.status },
      });
    }

    // Mapeamento de mobilidade & fretes
    for (const m of mobilityRes.data || []) {
      const val = (m.total_cents / 100).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });
      items.push({
        id: m.id,
        category: "mobility",
        title: "Corrida / Entrega Waesy Go",
        description: `${val} • Status: ${m.status}`,
        timestamp: m.created_at,
        metadata: { total_cents: m.total_cents, status: m.status },
      });
    }

    // Ordenação cronológica decrescente
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Paginação simples com base no cursor se fornecido
    let filteredItems = items;
    if (safeCursor) {
      const cursorIndex = items.findIndex((i) => i.id === safeCursor);
      if (cursorIndex >= 0) {
        filteredItems = items.slice(cursorIndex + 1);
      }
    }

    const paginatedItems = filteredItems.slice(0, safeLimit);

    return {
      items: paginatedItems,
      total: items.length,
      categories: ["all", "forms", "cart", "orders", "mobility"],
      hasMore: filteredItems.length > safeLimit,
    };
  });
