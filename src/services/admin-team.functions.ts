import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

// ---------------------------------------------------------------------------
// Team Management (Equipe)
// ---------------------------------------------------------------------------

export async function _listTeamMembers() {
 const db = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);

 const { data: members, error } = await db
 .from("workspace_members")
 .select("profile_id, role, created_at, profiles(id, full_name, avatar_url)")
 .eq("store_id", identity.store_id)
 .in("role", ["owner", "admin", "manager", "seller", "finance", "content"])
 .order("created_at", { ascending: true });

 const profiles =
 members?.map((m) => ({
 id: m.profile_id,
 role: m.role,
 created_at: m.created_at,
 full_name: (m.profiles as any)?.full_name || "",
 avatar_url: (m.profiles as any)?.avatar_url || null,
 })) || [];

 if (error) throw error;

 if (!profiles || profiles.length === 0) return [];

 try {
 const userIds = profiles.map((p) => p.id);
 const { data: authUsers, error: authError } = await db
 .schema("auth")
 .from("users")
 .select("id, email")
 .in("id", userIds);

 if (!authError && authUsers) {
 const emailMap = new Map<string, string>(authUsers.map((u: any) => [u.id, u.email]));
 return profiles.map((p) => ({
 ...p,
 email: emailMap.get(p.id) || null,
 }));
 }
 } catch (e) {
 console.error("[admin-team] Error fetching auth emails:", e);
 }

 return profiles.map((p) => ({ ...p, email: null }));
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
 role: "owner" | "admin" | "manager" | "seller" | "finance" | "content" | "customer";
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
 role: z.enum(["owner", "admin", "manager", "seller", "finance", "content", "customer"]),
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

export async function _inviteTeamMember(input: {
 email: string;
 fullName: string;
 role: "admin" | "manager" | "seller" | "finance" | "content" | "stock" | "support";
}) {
 const db = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);

 // Prevent lower roles from creating higher privileged roles
 if (identity.role === "manager" && input.role === "admin") {
 throw new Error("Gerentes não podem convidar membros com cargo de Administrador.");
 }

 let targetUserId: string | null = null;

 // 1. Tenta criar usuário novo
 const { data: authData, error: authError } = await db.auth.admin.createUser({
 email: input.email.toLowerCase().trim(),
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
 (u) => u.email?.toLowerCase() === input.email.toLowerCase().trim(),
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

 if (!targetUserId) {
 throw new Error("Não foi possível identificar o usuário para vincular à equipe.");
 }

 // 2. Garante perfil preenchido
 await db.from("profiles").upsert({
 id: targetUserId,
 full_name: input.fullName,
 });

 // 3. Insere ou atualiza vínculo estritamente no store_id da loja ativa
 const { error: memberError } = await db.from("workspace_members").upsert(
 {
 profile_id: targetUserId,
 store_id: identity.store_id,
 role: input.role,
 },
 { onConflict: "profile_id,store_id" },
 );

 if (memberError) {
 throw new Error(`Erro ao vincular membro à loja: ${memberError.message}`);
 }

 return { status: "success" as const };
}

export const inviteTeamMember = createServerFn({ method: "POST" })
 .validator(
 z.object({
 email: z.string().email(),
 fullName: z.string().min(1),
 role: z.enum(["admin", "manager", "seller", "finance", "content", "stock", "support"]),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 return await _inviteTeamMember(input);
 } catch (e: unknown) {
 console.error("[admin-team] inviteTeamMember error:", e);
 throw new Error(e instanceof Error ? e.message : "Erro ao convidar membro.");
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
      documentNumber: z.string().optional().nullable(),
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
