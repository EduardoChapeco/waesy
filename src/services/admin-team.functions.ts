import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { cleanDocument, validateCnpjMod11, validateCpfMod11 } from "@/lib/document-validator";
import {
  STAFF_MEMBER_ROLES,
  assertStoreStaffSeatAvailable,
  checkStoreStaffSeatLimit,
} from "@/lib/architecture/module-plan-governance";

const contractorDocumentSchema = z
 .string()
 .trim()
 .max(20, "Documento excede o tamanho permitido.")
 .refine((value) => {
  if (!value) return true;
  const digits = cleanDocument(value);
  if (digits.length === 11) return validateCpfMod11(value);
  if (digits.length === 14) return validateCnpjMod11(value);
  return /^[0-9A-Za-z./-]{5,20}$/.test(value);
 }, "Informe um CPF, CNPJ ou RG válido.");

// ---------------------------------------------------------------------------
// Schemas & Shared Sync Helpers (Equipe & Vínculo de Atendimento/RH)
// ---------------------------------------------------------------------------

export const teamMemberOperationalFieldsSchema = z.object({
  phone: z.string().max(40).nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  defaultDepartmentSlug: z.string().max(80).nullable().optional(),
  whatsappInstanceId: z.string().uuid().nullable().optional(),
  isAttendanceAgent: z.boolean().optional(),
  attendancePresence: z.enum(["online", "busy", "away", "offline"]).optional(),
  maxConcurrentChats: z.number().int().min(1).max(200).optional(),
  canTransferChats: z.boolean().optional(),
  canCloseChats: z.boolean().optional(),
  canManageWhatsappQr: z.boolean().optional(),
  onlyAssignedOrSector: z.boolean().optional(),
  contractType: z.string().max(60).nullable().optional(),
  commissionPercent: z.number().min(0).max(100).nullable().optional(),
  feeBearer: z.string().max(60).nullable().optional(),
  canViewUnmaskedContacts: z.boolean().optional(),
  autoDeductSupplies: z.boolean().optional(),
});

export const inviteTeamMemberSchema = teamMemberOperationalFieldsSchema.extend({
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.enum(["admin", "manager", "seller", "cashier", "finance", "content", "stock", "support"]),
});

export const updateTeamMemberProfileSchema = teamMemberOperationalFieldsSchema.extend({
  profileId: z.string().uuid(),
  fullName: z.string().min(1).optional(),
  role: z.enum(["owner", "admin", "manager", "seller", "cashier", "finance", "content", "stock", "support"]).optional(),
});

export const toggleAgentPresenceSchema = z.object({
  profileId: z.string().uuid().optional(),
  presence: z.enum(["online", "busy", "away", "offline"]),
  storeId: z.string().uuid().optional(),
});

async function resolveAndValidateOperationalLinks(
  db: any,
  storeId: string,
  input: {
    departmentId?: string | null;
    defaultDepartmentSlug?: string | null;
    whatsappInstanceId?: string | null;
  },
) {
  let resolvedDepartmentId: string | null | undefined = input.departmentId;
  let resolvedDepartmentSlug: string | null | undefined = input.defaultDepartmentSlug;

  if (input.departmentId) {
    const { data: dept, error } = await db
      .from("chat_departments")
      .select("id, slug, store_id")
      .eq("id", input.departmentId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (error) throw new Error(`Falha ao validar setor: ${error.message}`);
    if (!dept) throw new Error("Setor informado não pertence a esta loja.");
    resolvedDepartmentId = dept.id;
    resolvedDepartmentSlug = dept.slug;
  } else if (input.departmentId === null) {
    resolvedDepartmentId = null;
    if (input.defaultDepartmentSlug === undefined) resolvedDepartmentSlug = null;
  } else if (input.defaultDepartmentSlug) {
    const { data: dept } = await db
      .from("chat_departments")
      .select("id, slug")
      .eq("slug", input.defaultDepartmentSlug)
      .eq("store_id", storeId)
      .maybeSingle();
    if (dept) {
      resolvedDepartmentId = dept.id;
      resolvedDepartmentSlug = dept.slug;
    }
  }

  let resolvedWhatsappInstanceId: string | null | undefined = input.whatsappInstanceId;
  if (input.whatsappInstanceId) {
    const { data: inst, error } = await db
      .from("whatsapp_channel_instances")
      .select("id, store_id")
      .eq("id", input.whatsappInstanceId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (error) throw new Error(`Falha ao validar canal WhatsApp: ${error.message}`);
    if (!inst) throw new Error("Canal WhatsApp informado não pertence a esta loja.");
    resolvedWhatsappInstanceId = inst.id;
  } else if (input.whatsappInstanceId === null) {
    resolvedWhatsappInstanceId = null;
  }

  return {
    departmentId: resolvedDepartmentId,
    defaultDepartmentSlug: resolvedDepartmentSlug,
    whatsappInstanceId: resolvedWhatsappInstanceId,
  };
}

async function syncMemberAttendanceGovernanceAndDepartments(
  db: any,
  storeId: string,
  profileId: string,
  memberRow: Record<string, any>,
  departmentExplicitlyUpdated: boolean,
) {
  if (departmentExplicitlyUpdated) {
    try {
      const { data: depts } = await db
        .from("chat_departments")
        .select("id, assigned_agent_ids")
        .eq("store_id", storeId);

      for (const dept of depts || []) {
        const currentIds: string[] = Array.isArray(dept.assigned_agent_ids)
          ? dept.assigned_agent_ids
          : [];
        const shouldInclude =
          Boolean(memberRow.department_id) &&
          dept.id === memberRow.department_id &&
          memberRow.is_attendance_agent !== false;
        const alreadyIncluded = currentIds.includes(profileId);

        if (shouldInclude && !alreadyIncluded) {
          await db
            .from("chat_departments")
            .update({
              assigned_agent_ids: [...currentIds, profileId],
              updated_at: new Date().toISOString(),
            })
            .eq("id", dept.id)
            .eq("store_id", storeId);
        } else if (!shouldInclude && alreadyIncluded) {
          await db
            .from("chat_departments")
            .update({
              assigned_agent_ids: currentIds.filter((id) => id !== profileId),
              updated_at: new Date().toISOString(),
            })
            .eq("id", dept.id)
            .eq("store_id", storeId);
        }
      }
    } catch (err) {
      console.warn("[admin-team] Aviso ao sincronizar assigned_agent_ids em chat_departments:", err);
    }
  }

  try {
    const { data: storeRow } = await db
      .from("stores")
      .select("id, settings")
      .eq("id", storeId)
      .maybeSingle();

    if (storeRow) {
      const currentSettings = ((storeRow.settings || {}) as Record<string, any>);
      const currentGov = ((currentSettings.whatsapp_governance || {}) as Record<string, any>);
      const currentAgentPerms = ((currentGov.agentPermissions || {}) as Record<string, any>);

      const nextGov = {
        ...currentGov,
        agentPermissions: {
          ...currentAgentPerms,
          [profileId]: {
            ...(currentAgentPerms[profileId] || {}),
            canTransfer: memberRow.can_transfer_chats !== false,
            canClose: memberRow.can_close_chats !== false,
            canManageQr: Boolean(memberRow.can_manage_whatsapp_qr),
            onlyOwnOrSector: Boolean(memberRow.only_assigned_or_sector),
            defaultDepartmentSlug: memberRow.default_department_slug || "triagem",
            departmentId: memberRow.department_id || null,
            whatsappInstanceId: memberRow.whatsapp_instance_id || null,
            maxConcurrentChats: Number(memberRow.max_concurrent_chats || 10),
            isAttendanceAgent: memberRow.is_attendance_agent !== false,
          },
        },
      };

      await db
        .from("stores")
        .update({ settings: { ...currentSettings, whatsapp_governance: nextGov } })
        .eq("id", storeId);
    }
  } catch (err) {
    console.warn("[admin-team] Aviso ao sincronizar whatsapp_governance em stores.settings:", err);
  }
}

// ---------------------------------------------------------------------------
// Team Management (Equipe)
// ---------------------------------------------------------------------------

export async function _listTeamMembers(deps?: { db?: any; identity?: any }) {
  const db = deps?.db ?? getServerClient();
  const identity = deps?.identity ?? (await getServerIdentity());
  assertStoreAccess(identity, [...STAFF_MEMBER_ROLES]);

  const effectiveRole =
    (identity.memberships || []).find((m: any) => m.store_id === identity.store_id)?.role ||
    identity.role;
  const canReadFinancialContract = ["owner", "admin", "manager", "finance", "master", "platform_admin"].includes(
    effectiveRole,
  );

  const [{ data: members, error }, { data: departments }, { data: instances }] = await Promise.all([
    db
      .from("workspace_members")
      .select(
        "profile_id, role, created_at, department_id, default_department_slug, whatsapp_instance_id, is_attendance_agent, attendance_presence, max_concurrent_chats, can_transfer_chats, can_close_chats, can_manage_whatsapp_qr, only_assigned_or_sector, contract_type, commission_percent, fee_bearer, can_view_unmasked_contacts, auto_deduct_supplies, profiles(id, full_name, avatar_url, phone)",
      )
      .eq("store_id", identity.store_id)
      .in("role", [...STAFF_MEMBER_ROLES])
      .order("created_at", { ascending: true }),
    db
      .from("chat_departments")
      .select("id, name, slug, color")
      .eq("store_id", identity.store_id),
    db
      .from("whatsapp_channel_instances")
      .select("id, display_name, display_phone_number, status")
      .eq("store_id", identity.store_id),
  ]);

  if (error) throw error;

  const deptById = new Map<string, any>((departments || []).map((d: any) => [d.id, d]));
  const deptBySlug = new Map<string, any>((departments || []).map((d: any) => [d.slug, d]));
  const instanceById = new Map<string, any>((instances || []).map((i: any) => [i.id, i]));

  const profiles =
    members?.map((m: any) => {
      const dept =
        (m.department_id ? deptById.get(m.department_id) : null) ||
        (m.default_department_slug ? deptBySlug.get(m.default_department_slug) : null) ||
        null;
      const waInst = m.whatsapp_instance_id ? instanceById.get(m.whatsapp_instance_id) || null : null;
      return {
        id: m.profile_id,
        role: m.role,
        created_at: m.created_at,
        full_name: m.profiles?.full_name || "",
        avatar_url: m.profiles?.avatar_url || null,
        phone: m.profiles?.phone || null,
        department_id: m.department_id || dept?.id || null,
        default_department_slug: m.default_department_slug || dept?.slug || null,
        department: dept
          ? { id: dept.id, name: dept.name, slug: dept.slug, color: dept.color || null }
          : null,
        whatsapp_instance_id: m.whatsapp_instance_id || null,
        whatsapp_instance: waInst
          ? {
              id: waInst.id,
              display_name: waInst.display_name,
              display_phone_number: waInst.display_phone_number || null,
              status: waInst.status,
            }
          : null,
        is_attendance_agent: m.is_attendance_agent ?? true,
        attendance_presence: m.attendance_presence || "online",
        max_concurrent_chats: m.max_concurrent_chats ?? 10,
        can_transfer_chats: m.can_transfer_chats ?? true,
        can_close_chats: m.can_close_chats ?? true,
        can_manage_whatsapp_qr: m.can_manage_whatsapp_qr ?? false,
        only_assigned_or_sector: m.only_assigned_or_sector ?? false,
        contract_type: canReadFinancialContract ? m.contract_type || "partner_law" : null,
        commission_percent: canReadFinancialContract ? (m.commission_percent ?? 60) : null,
        fee_bearer: canReadFinancialContract ? m.fee_bearer || "proportional" : null,
        can_view_unmasked_contacts: m.can_view_unmasked_contacts ?? false,
        auto_deduct_supplies: canReadFinancialContract ? (m.auto_deduct_supplies ?? true) : null,
      };
    }) || [];

  if (profiles.length === 0) return [];

  try {
    const userIds = profiles.map((p: any) => p.id);
    const { data: authUsers, error: authError } = await db
      .schema("auth")
      .from("users")
      .select("id, email")
      .in("id", userIds);

    if (!authError && authUsers) {
      const emailMap = new Map<string, string>(authUsers.map((u: any) => [u.id, u.email]));
      return profiles.map((p: any) => ({
        ...p,
        email: emailMap.get(p.id) || null,
      }));
    }
  } catch (e) {
    console.error("[admin-team] Error fetching auth emails:", e);
  }

  return profiles.map((p: any) => ({ ...p, email: null }));
}

export const listTeamMembers = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const data = await _listTeamMembers();
    return data;
  } catch (e) {
    if (e instanceof SupabaseUnconfiguredError) throw e;
    console.error("[admin-team] listTeamMembers error:", e);
    throw new Error("Erro ao listar equipe.");
  }
});

export async function _updateTeamMemberRole(input: {
 id: string;
 role: "owner" | "admin" | "manager" | "seller" | "cashier" | "finance" | "content" | "customer";
}) {
 const db = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin"]);

 // Prevent owner from demoting themselves
 if (input.id === identity.id && input.role !== "owner" && identity.role === "owner") {
 throw new Error("O dono da loja não pode rebaixar a si mesmo.");
 }

 // Fetch target user's current profile first to apply business rules
 const { data: targetProfile, error: fetchError } = await db
 .from("workspace_members")
 .select("role")
 .eq("profile_id", input.id)
 .eq("store_id", identity.store_id)
 .single();

 if (fetchError || !targetProfile) {
 throw new Error("Membro da equipe não encontrado ou pertence a outra loja.");
 }

 // 1. Only owner can edit owner
 if (targetProfile.role === "owner" && identity.role !== "owner") {
 throw new Error("Apenas o proprietário pode alterar suas próprias permissões.");
 }

 // 2. Only owner can promote someone to owner
 if (input.role === "owner" && identity.role !== "owner") {
 throw new Error("Apenas o proprietário pode transferir a propriedade da loja.");
 }

 const { data, error } = await db
 .from("workspace_members")
 .update({ role: input.role })
 .eq("profile_id", input.id)
 .eq("store_id", identity.store_id)
 .select()
 .single();

 if (error) throw error;
 return data;
}

export const updateTeamMemberRole = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 role: z.enum(["owner", "admin", "manager", "seller", "cashier", "finance", "content", "customer"]),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const data = await _updateTeamMemberRole(input);
 return data;
 } catch (e: unknown) {
 console.error("[admin-team] updateTeamMemberRole error:", e);
 throw new Error(e instanceof Error ? e.message : "Erro.");
 }
 });

export async function _inviteTeamMember(
  input: z.infer<typeof inviteTeamMemberSchema>,
  deps?: { db?: any; identity?: any },
) {
  const db = deps?.db ?? getServerClient();
  const identity = deps?.identity ?? (await getServerIdentity());
  assertStoreAccess(identity, ["owner", "admin", "manager"]);

  // Prevent lower roles from creating higher privileged roles
  if (identity.role === "manager" && input.role === "admin") {
    throw new Error("Gerentes não podem convidar membros com cargo de Administrador.");
  }

  let targetUserId: string | null = null;
  const normalizedEmail = input.email.toLowerCase().trim();

  const resolvedLinks = await resolveAndValidateOperationalLinks(db, identity.store_id, {
    departmentId: input.departmentId,
    defaultDepartmentSlug: input.defaultDepartmentSlug,
    whatsappInstanceId: input.whatsappInstanceId,
  });

  const [{ data: storeRow }, { data: currentMembers }] = await Promise.all([
    db
      .from("stores")
      .select("id, name, slug, is_platform_root, plan_tier, settings")
      .eq("id", identity.store_id)
      .single(),
    db
      .from("workspace_members")
      .select("profile_id")
      .eq("store_id", identity.store_id)
      .in("role", [...STAFF_MEMBER_ROLES]),
  ]);

  const activeMemberIds = new Set((currentMembers || []).map((m: any) => m.profile_id).filter(Boolean));
  if (storeRow) {
    const seatStatus = checkStoreStaffSeatLimit(storeRow, activeMemberIds.size);
    if (!seatStatus.allowed) {
      const { data: listData } = await db.auth.admin.listUsers();
      const existingUser = listData?.users?.find((u: any) => u.email?.toLowerCase() === normalizedEmail);
      if (existingUser?.id && activeMemberIds.has(existingUser.id)) {
        targetUserId = existingUser.id;
      } else {
        assertStoreStaffSeatAvailable(storeRow, activeMemberIds.size);
      }
    }
  }

  if (!targetUserId) {
    // 1. Tenta criar usuário novo
    const { data: authData, error: authError } = await db.auth.admin.createUser({
      email: normalizedEmail,
      password: "Waesy" + Math.random().toString(36).slice(-8) + "!",
      email_confirm: true,
      user_metadata: {
        full_name: input.fullName,
      },
    });

    if (authError) {
      if (
        authError.message?.toLowerCase().includes("already") ||
        authError.message?.toLowerCase().includes("registered") ||
        authError.message?.toLowerCase().includes("exists")
      ) {
        // Localiza usuário já existente pelo e-mail
        const { data: listData } = await db.auth.admin.listUsers();
        const existingUser = listData?.users?.find(
          (u: any) => u.email?.toLowerCase() === normalizedEmail,
        );
        if (existingUser?.id) {
          targetUserId = existingUser.id;
        } else {
          throw new Error(`Erro ao localizar usuário existente: ${authError.message}`);
        }
      } else {
        throw new Error(`Erro ao registrar usuário: ${authError.message}`);
      }
    } else if (authData?.user?.id) {
      targetUserId = authData.user.id;
    }
  }

  if (!targetUserId) {
    throw new Error("Não foi possível identificar o usuário para vincular à equipe.");
  }

  if (storeRow) {
    assertStoreStaffSeatAvailable(storeRow, activeMemberIds.size, {
      isExistingStoreMember: activeMemberIds.has(targetUserId),
    });
  }

  // 2. Garante perfil preenchido (nome + telefone operacional)
  const profileUpsert: Record<string, any> = {
    id: targetUserId,
    full_name: input.fullName,
  };
  if (input.phone !== undefined) {
    profileUpsert.phone = input.phone?.trim() || null;
  }
  await db.from("profiles").upsert(profileUpsert);

  // 3. Insere ou atualiza vínculo completo no store_id da loja ativa
  const memberPayload: Record<string, any> = {
    profile_id: targetUserId,
    store_id: identity.store_id,
    role: input.role,
    department_id: resolvedLinks.departmentId ?? null,
    default_department_slug: resolvedLinks.defaultDepartmentSlug ?? null,
    whatsapp_instance_id: resolvedLinks.whatsappInstanceId ?? null,
    is_attendance_agent: input.isAttendanceAgent ?? true,
    attendance_presence: input.attendancePresence ?? "online",
    max_concurrent_chats: input.maxConcurrentChats ?? 10,
    can_transfer_chats: input.canTransferChats ?? true,
    can_close_chats: input.canCloseChats ?? true,
    can_manage_whatsapp_qr: input.canManageWhatsappQr ?? false,
    only_assigned_or_sector: input.onlyAssignedOrSector ?? false,
    contract_type: input.contractType ?? "partner_law",
    commission_percent: input.commissionPercent ?? 60,
    fee_bearer: input.feeBearer ?? "proportional",
    can_view_unmasked_contacts: input.canViewUnmaskedContacts ?? false,
    auto_deduct_supplies: input.autoDeductSupplies ?? true,
  };

  const { data: savedMember, error: memberError } = await db
    .from("workspace_members")
    .upsert(memberPayload, { onConflict: "profile_id,store_id" })
    .select("*")
    .single();

  if (memberError) {
    throw new Error(`Erro ao vincular membro à loja: ${memberError.message}`);
  }

  await syncMemberAttendanceGovernanceAndDepartments(
    db,
    identity.store_id,
    targetUserId,
    savedMember || memberPayload,
    resolvedLinks.departmentId !== undefined || resolvedLinks.defaultDepartmentSlug !== undefined,
  );

  return { status: "success" as const, profileId: targetUserId, member: savedMember || memberPayload };
}

export const inviteTeamMember = createServerFn({ method: "POST" })
  .validator(inviteTeamMemberSchema)
  .handler(async ({ data: input }) => {
    try {
      return await _inviteTeamMember(input);
    } catch (e: unknown) {
      console.error("[admin-team] inviteTeamMember error:", e);
      throw new Error(e instanceof Error ? e.message : "Erro ao convidar membro.");
    }
  });

export async function _updateTeamMemberProfile(
  input: z.infer<typeof updateTeamMemberProfileSchema>,
  deps?: { db?: any; identity?: any },
) {
  const db = deps?.db ?? getServerClient();
  const identity = deps?.identity ?? (await getServerIdentity());
  assertStoreAccess(identity, ["owner", "admin", "manager"]);

  const { data: targetMember, error: fetchError } = await db
    .from("workspace_members")
    .select("*")
    .eq("profile_id", input.profileId)
    .eq("store_id", identity.store_id)
    .maybeSingle();

  if (fetchError || !targetMember) {
    throw new Error("Membro da equipe não encontrado ou pertence a outra loja.");
  }

  if (targetMember.role === "owner" && identity.role !== "owner") {
    throw new Error("Apenas o proprietário principal pode alterar outro proprietário.");
  }

  if (input.role !== undefined) {
    if (input.role === "owner" && identity.role !== "owner") {
      throw new Error("Apenas o proprietário pode transferir a propriedade da loja.");
    }
    if (input.profileId === identity.id && input.role !== "owner" && identity.role === "owner") {
      throw new Error("O dono da loja não pode rebaixar a si mesmo.");
    }
    if (identity.role === "manager" && (input.role === "admin" || input.role === "owner")) {
      throw new Error("Gerentes não podem promover membros para Administrador ou Proprietário.");
    }
  }

  const resolvedLinks = await resolveAndValidateOperationalLinks(db, identity.store_id, {
    departmentId: input.departmentId,
    defaultDepartmentSlug: input.defaultDepartmentSlug,
    whatsappInstanceId: input.whatsappInstanceId,
  });

  if (input.fullName !== undefined || input.phone !== undefined) {
    const profilePatch: Record<string, any> = {};
    if (input.fullName !== undefined) profilePatch.full_name = input.fullName.trim();
    if (input.phone !== undefined) profilePatch.phone = input.phone?.trim() || null;
    const { error: profileErr } = await db
      .from("profiles")
      .update(profilePatch)
      .eq("id", input.profileId);
    if (profileErr) {
      throw new Error(`Erro ao atualizar dados pessoais: ${profileErr.message}`);
    }
  }

  const memberPatch: Record<string, any> = {};
  if (input.role !== undefined) memberPatch.role = input.role;
  if (resolvedLinks.departmentId !== undefined) memberPatch.department_id = resolvedLinks.departmentId;
  if (resolvedLinks.defaultDepartmentSlug !== undefined) memberPatch.default_department_slug = resolvedLinks.defaultDepartmentSlug;
  if (resolvedLinks.whatsappInstanceId !== undefined) memberPatch.whatsapp_instance_id = resolvedLinks.whatsappInstanceId;
  if (input.isAttendanceAgent !== undefined) memberPatch.is_attendance_agent = input.isAttendanceAgent;
  if (input.attendancePresence !== undefined) memberPatch.attendance_presence = input.attendancePresence;
  if (input.maxConcurrentChats !== undefined) memberPatch.max_concurrent_chats = input.maxConcurrentChats;
  if (input.canTransferChats !== undefined) memberPatch.can_transfer_chats = input.canTransferChats;
  if (input.canCloseChats !== undefined) memberPatch.can_close_chats = input.canCloseChats;
  if (input.canManageWhatsappQr !== undefined) memberPatch.can_manage_whatsapp_qr = input.canManageWhatsappQr;
  if (input.onlyAssignedOrSector !== undefined) memberPatch.only_assigned_or_sector = input.onlyAssignedOrSector;
  if (input.contractType !== undefined) memberPatch.contract_type = input.contractType;
  if (input.commissionPercent !== undefined) memberPatch.commission_percent = input.commissionPercent;
  if (input.feeBearer !== undefined) memberPatch.fee_bearer = input.feeBearer;
  if (input.canViewUnmaskedContacts !== undefined) memberPatch.can_view_unmasked_contacts = input.canViewUnmaskedContacts;
  if (input.autoDeductSupplies !== undefined) memberPatch.auto_deduct_supplies = input.autoDeductSupplies;

  let updatedMember = targetMember;
  if (Object.keys(memberPatch).length > 0) {
    const { data, error: memberUpdateError } = await db
      .from("workspace_members")
      .update(memberPatch)
      .eq("profile_id", input.profileId)
      .eq("store_id", identity.store_id)
      .select("*")
      .single();

    if (memberUpdateError) {
      throw new Error(`Erro ao atualizar vínculos do colaborador: ${memberUpdateError.message}`);
    }
    updatedMember = data || { ...targetMember, ...memberPatch };
  }

  await syncMemberAttendanceGovernanceAndDepartments(
    db,
    identity.store_id,
    input.profileId,
    updatedMember,
    resolvedLinks.departmentId !== undefined || resolvedLinks.defaultDepartmentSlug !== undefined,
  );

  return { status: "success" as const, member: updatedMember };
}

export const updateTeamMemberProfile = createServerFn({ method: "POST" })
  .validator(updateTeamMemberProfileSchema)
  .handler(async ({ data: input }) => {
    try {
      return await _updateTeamMemberProfile(input);
    } catch (e: unknown) {
      console.error("[admin-team] updateTeamMemberProfile error:", e);
      throw new Error(e instanceof Error ? e.message : "Erro ao atualizar perfil da equipe.");
    }
  });

export async function _toggleAgentPresence(
  input: z.infer<typeof toggleAgentPresenceSchema>,
  deps?: { db?: any; identity?: any },
) {
  const db = deps?.db ?? getServerClient();
  const identity = deps?.identity ?? (await getServerIdentity());
  const targetStoreId = input.storeId || identity.store_id;
  assertStoreAccess(identity, [...STAFF_MEMBER_ROLES], targetStoreId);

  const targetProfileId = input.profileId || identity.id;
  if (targetProfileId !== identity.id) {
    assertStoreAccess(identity, ["owner", "admin", "manager"], targetStoreId);
  }

  const { data, error } = await db
    .from("workspace_members")
    .update({ attendance_presence: input.presence })
    .eq("store_id", targetStoreId)
    .eq("profile_id", targetProfileId)
    .select("profile_id, store_id, attendance_presence")
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao atualizar presença do atendente: ${error.message}`);
  }
  if (!data) {
    throw new Error("Colaborador não encontrado nesta loja.");
  }

  return {
    status: "success" as const,
    profile_id: data.profile_id,
    attendance_presence: data.attendance_presence,
  };
}

export const toggleAgentPresence = createServerFn({ method: "POST" })
  .validator(toggleAgentPresenceSchema)
  .handler(async ({ data: input }) => {
    try {
      return await _toggleAgentPresence(input);
    } catch (e: unknown) {
      console.error("[admin-team] toggleAgentPresence error:", e);
      throw new Error(e instanceof Error ? e.message : "Erro ao atualizar presença.");
    }
  });

export async function _removeTeamMember(input: { profileId: string }) {
 const db = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin"]);

 if (input.profileId === identity.id) {
 throw new Error("Você não pode remover o seu próprio acesso da loja.");
 }

 // Verifica se o alvo é owner
 const { data: targetMember } = await db
 .from("workspace_members")
 .select("role")
 .eq("profile_id", input.profileId)
 .eq("store_id", identity.store_id)
 .maybeSingle();

 if (!targetMember) {
 throw new Error("Membro não encontrado nesta loja.");
 }

 if (targetMember.role === "owner" && identity.role !== "owner") {
 throw new Error("Apenas o proprietário principal pode remover outro proprietário.");
 }

 const { error } = await db
 .from("workspace_members")
 .delete()
 .eq("profile_id", input.profileId)
 .eq("store_id", identity.store_id);

 if (error) {
 throw new Error(`Erro ao revogar acesso: ${error.message}`);
 }

 return { status: "success" as const };
}

export const removeTeamMember = createServerFn({ method: "POST" })
 .validator(z.object({ profileId: z.string().uuid() }))
 .handler(async ({ data: input }) => {
 try {
 return await _removeTeamMember(input);
 } catch (e: unknown) {
 console.error("[admin-team] removeTeamMember error:", e);
 throw new Error(e instanceof Error ? e.message : "Erro ao remover membro.");
 }
 });

// ---------------------------------------------------------------------------
// External Contractors & Freelancers (Terceirizados & Parceiros Externos)
// ---------------------------------------------------------------------------

export const listContractors = createServerFn({ method: "GET" }).handler(async () => {
  const db = getServerClient();
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager", "finance"]);

  const { data, error } = await db
    .from("event_contractors")
    .select("*")
    .eq("store_id", identity.store_id)
    .order("name", { ascending: true });

  if (error) throw new Error("Erro ao listar terceirizados: " + error.message);
  return data || [];
});

export const upsertContractor = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      name: z.string().min(2, "Nome é obrigatório"),
      serviceCategory: z.enum([
        "seguranca",
        "limpeza",
        "buffet",
        "som_iluminacao",
        "fotografia",
        "cenografia",
        "brigadistas",
        "atendimento",
        "outro",
      ]).default("outro"),
      documentNumber: contractorDocumentSchema.optional().nullable(),
      contactPhone: z.string().optional().nullable(),
      contactEmail: z.string().optional().nullable(),
      hourlyRateCents: z.number().int().min(0).default(0),
      fixedFeeCents: z.number().int().min(0).default(0),
      pixKey: z.string().optional().nullable(),
      status: z.enum(["active", "inactive", "blocked"]).default("active"),
      notes: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const payload: any = {
      store_id: identity.store_id,
      name: data.name.trim(),
      service_category: data.serviceCategory,
      document_number: data.documentNumber?.trim() || null,
      contact_phone: data.contactPhone?.trim() || null,
      contact_email: data.contactEmail?.trim() || null,
      hourly_rate_cents: data.hourlyRateCents,
      fixed_fee_cents: data.fixedFeeCents,
      pix_key: data.pixKey?.trim() || null,
      status: data.status,
      metadata: data.notes ? { notes: data.notes.trim() } : {},
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { data: updated, error } = await db
        .from("event_contractors")
        .update(payload)
        .eq("id", data.id)
        .eq("store_id", identity.store_id)
        .select()
        .single();
      if (error) throw new Error("Erro ao atualizar terceirizado: " + error.message);
      return updated;
    } else {
      const { data: created, error } = await db
        .from("event_contractors")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error("Erro ao cadastrar terceirizado: " + error.message);
      return created;
    }
  });

export const deleteContractor = createServerFn({ method: "POST" })
  .validator(z.object({ contractorId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { error } = await db
      .from("event_contractors")
      .delete()
      .eq("id", data.contractorId)
      .eq("store_id", identity.store_id);

    if (error) throw new Error("Erro ao remover terceirizado: " + error.message);
    return { success: true };
  });
