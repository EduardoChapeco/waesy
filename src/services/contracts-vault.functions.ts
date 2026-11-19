import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { requireStaff } from "@/lib/server-access";
import type { Json } from "@/integrations/supabase/types";
import { getIdentity } from "./identity.functions";
import {
  assertContractCancellable,
  buildContractSigningUrls,
  isExternalHttpUrl,
  normalizeLegalDocumentStoragePath,
} from "@/lib/contracts/contract-vault-rules";

const DATA_IMAGE_URI_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

/**
 * Gera URL assinada temporária (1 hora) para arquivos privados armazenados no bucket `legal-documents`.
 * Exportada para reuso no BFF de contratos ao servir versões e envelopes públicos.
 */
export async function resolveLegalDocumentSignedUrl(
  supabase: ReturnType<typeof getServerClient>,
  rawSourceUrl: string | null | undefined,
): Promise<string | null> {
  if (!rawSourceUrl) return null;
  if (isExternalHttpUrl(rawSourceUrl)) return rawSourceUrl;

  const objectPath = normalizeLegalDocumentStoragePath(rawSourceUrl);
  if (!objectPath) return null;

  const { data, error } = await supabase.storage
    .from("legal-documents")
    .createSignedUrl(objectPath, 3600);

  if (error || !data?.signedUrl) {
    return null;
  }
  return data.signedUrl;
}

/**
 * Grava evento estruturado na trilha forense (`contract_audit_chain`) sem interromper fluxos já selados.
 */
export async function recordContractAuditEvent(
  supabase: ReturnType<typeof getServerClient>,
  args: {
    contractId: string;
    storeId: string;
    action: string;
    actorProfile?: string | null;
    payloadHash: string;
    metadata?: Record<string, Json>;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
): Promise<void> {
  try {
    await supabase.from("contract_audit_chain").insert({
      contract_id: args.contractId,
      store_id: args.storeId,
      action: args.action,
      actor_profile: args.actorProfile || null,
      payload_hash: args.payloadHash,
      metadata: (args.metadata || {}) as Json,
      ip_address: args.ipAddress || null,
      user_agent: args.userAgent || null,
    });
  } catch (err) {
    console.warn("[contracts-vault] Non-fatal audit event insert error:", err);
  }
}

// ─── Cofre de Pastas Multi-Tenant (public.folders) ─────────────────────────────

export const listContractFolders = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await requireStaff();

  const [{ data: folders, error: foldersErr }, { data: contractRows }] = await Promise.all([
    supabase
      .from("folders")
      .select("id, name, parent_id, store_id, created_at, updated_at")
      .eq("store_id", identity.store_id)
      .order("name", { ascending: true }),
    supabase
      .from("contracts")
      .select("id, folder_id")
      .eq("store_id", identity.store_id),
  ]);

  if (foldersErr) {
    console.error("[contracts-vault] listContractFolders error:", foldersErr);
    throw new Error("Não foi possível carregar as pastas do cofre.");
  }

  const countsByFolder = new Map<string, number>();
  let unfiledCount = 0;

  for (const row of contractRows || []) {
    if (row.folder_id) {
      countsByFolder.set(row.folder_id, (countsByFolder.get(row.folder_id) || 0) + 1);
    } else {
      unfiledCount += 1;
    }
  }

  return {
    folders: (folders || []).map((folder) => ({
      ...folder,
      contractCount: countsByFolder.get(folder.id) || 0,
    })),
    totalContracts: (contractRows || []).length,
    unfiledCount,
  };
});

export const createContractFolder = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().trim().min(1, "Informe o nome da pasta.").max(80),
      parentId: z.string().uuid().nullable().optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await requireStaff();

    if (input.parentId) {
      const { data: parentFolder } = await supabase
        .from("folders")
        .select("id")
        .eq("id", input.parentId)
        .eq("store_id", identity.store_id)
        .maybeSingle();
      if (!parentFolder) {
        throw new Error("Pasta pai não encontrada neste workspace.");
      }
    }

    const { data: folder, error } = await supabase
      .from("folders")
      .insert({
        name: input.name,
        parent_id: input.parentId || null,
        store_id: identity.store_id,
      })
      .select("id, name, parent_id, store_id, created_at, updated_at")
      .single();

    if (error || !folder) {
      console.error("[contracts-vault] createContractFolder error:", error);
      throw new Error("Não foi possível criar a pasta no cofre.");
    }

    return { folder: { ...folder, contractCount: 0 } };
  });

export const renameContractFolder = createServerFn({ method: "POST" })
  .validator(
    z.object({
      folderId: z.string().uuid(),
      name: z.string().trim().min(1, "Informe o novo nome.").max(80),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await requireStaff();

    const { data: updated, error } = await supabase
      .from("folders")
      .update({
        name: input.name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.folderId)
      .eq("store_id", identity.store_id)
      .select("id, name, parent_id, store_id, created_at, updated_at")
      .maybeSingle();

    if (error || !updated) {
      throw new Error("Pasta não encontrada ou sem permissão para renomear.");
    }

    return { folder: updated };
  });

export const deleteContractFolder = createServerFn({ method: "POST" })
  .validator(z.object({ folderId: z.string().uuid() }))
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await requireStaff();

    // Remove referência dos contratos da loja antes de excluir a pasta para não perder documentos
    await supabase
      .from("contracts")
      .update({ folder_id: null, updated_at: new Date().toISOString() })
      .eq("folder_id", input.folderId)
      .eq("store_id", identity.store_id);

    const { data: deleted, error } = await supabase
      .from("folders")
      .delete()
      .eq("id", input.folderId)
      .eq("store_id", identity.store_id)
      .select("id")
      .maybeSingle();

    if (error || !deleted) {
      throw new Error("Pasta não encontrada ou sem permissão para excluir.");
    }

    return { success: true, folderId: deleted.id };
  });

export const moveContractToFolder = createServerFn({ method: "POST" })
  .validator(
    z.object({
      contractId: z.string().uuid(),
      folderId: z.string().uuid().nullable(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await requireStaff();

    if (input.folderId) {
      const { data: targetFolder } = await supabase
        .from("folders")
        .select("id")
        .eq("id", input.folderId)
        .eq("store_id", identity.store_id)
        .maybeSingle();
      if (!targetFolder) {
        throw new Error("Pasta de destino não pertence a este workspace.");
      }
    }

    const { data: moved, error } = await supabase
      .from("contracts")
      .update({
        folder_id: input.folderId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.contractId)
      .eq("store_id", identity.store_id)
      .select("id, folder_id")
      .maybeSingle();

    if (error || !moved) {
      throw new Error("Contrato não encontrado ou sem permissão.");
    }

    return { success: true, contractId: moved.id, folderId: moved.folder_id };
  });

// ─── Acompanhamento, Reenvio e Cancelamento de Envelopes ─────────────────────

export const resendContractEnvelope = createServerFn({ method: "POST" })
  .validator(
    z.object({
      envelopeId: z.string().uuid(),
      channel: z.enum(["whatsapp", "email", "direct_link"]).optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await requireStaff();

    const { data: envelope, error: envErr } = await supabase
      .from("signature_envelopes")
      .select(
        `
        id, signing_token, status, signer_name, signer_email, signer_phone,
        dispatch_channel, reminder_count,
        contract_version:contract_version_id (
          id, title, contract_id,
          contract:contract_id (id, store_id, title, status)
        )
        `,
      )
      .eq("id", input.envelopeId)
      .maybeSingle();

    if (envErr || !envelope) {
      throw new Error("Envelope de assinatura não encontrado.");
    }

    const version = envelope.contract_version as any;
    const contract = version?.contract as any;
    if (!contract || contract.store_id !== identity.store_id) {
      throw new Error("Acesso negado ao envelope de outro workspace.");
    }
    if (contract.status === "cancelled") {
      throw new Error("Não é possível reenviar link de um contrato cancelado.");
    }
    if (envelope.status === "signed") {
      throw new Error("Este signatário já concluiu a assinatura do documento.");
    }

    const nowIso = new Date().toISOString();
    const nextReminderCount = Number(envelope.reminder_count || 0) + 1;

    const { data: updatedEnv, error: updErr } = await supabase
      .from("signature_envelopes")
      .update({
        last_reminder_at: nowIso,
        reminder_count: nextReminderCount,
      })
      .eq("id", envelope.id)
      .select("id, reminder_count, last_reminder_at")
      .maybeSingle();

    if (updErr || !updatedEnv) {
      throw new Error("Não foi possível registrar o lembrete do envelope.");
    }

    const links = buildContractSigningUrls({
      signingToken: envelope.signing_token,
      documentTitle: version?.title || contract.title || "Contrato",
      signerName: envelope.signer_name,
      signerPhone: envelope.signer_phone,
      isReminder: true,
    });

    const preferredChannel = input.channel || envelope.dispatch_channel || "direct_link";
    let queuedWhatsapp = false;
    let deliveryChannelNote = "Link de assinatura pronto para envio manual.";

    if (preferredChannel === "whatsapp" && links.normalizedPhone) {
      const { data: instance } = await supabase
        .from("whatsapp_channel_instances")
        .select("id, provider, is_active")
        .eq("store_id", identity.store_id)
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (instance?.id) {
        const idempotencyKey = `contract-reminder:${envelope.id}:${nextReminderCount}`;
        const { error: outboxErr } = await supabase.from("whatsapp_outbox").upsert(
          {
            store_id: identity.store_id,
            channel_instance_id: instance.id,
            provider: instance.provider,
            idempotency_key: idempotencyKey,
            recipient_phone: links.normalizedPhone,
            message_type: "text",
            payload: {
              text: links.waMessage,
              contract_id: contract.id,
              envelope_id: envelope.id,
              signing_url: links.fullUrl,
            },
            status: "pending",
            attempts: 0,
            updated_at: nowIso,
          },
          { onConflict: "store_id,idempotency_key" },
        );
        if (!outboxErr) {
          queuedWhatsapp = true;
          deliveryChannelNote = "Lembrete enfileirado na instância WhatsApp conectada da loja.";
        }
      } else {
        deliveryChannelNote =
          "Nenhuma instância WhatsApp conectada; use o botão do WhatsApp Web ou copie o link.";
      }
    }

    await recordContractAuditEvent(supabase, {
      contractId: contract.id,
      storeId: identity.store_id,
      action: "REMINDER_SENT",
      actorProfile: identity.id,
      payloadHash: `${envelope.id}:r${nextReminderCount}`,
      metadata: {
        envelope_id: envelope.id,
        signer_name: envelope.signer_name,
        channel: preferredChannel,
        queued_whatsapp: queuedWhatsapp,
        reminder_count: nextReminderCount,
      },
    });

    return {
      success: true,
      envelopeId: envelope.id,
      reminderCount: updatedEnv.reminder_count,
      lastReminderAt: updatedEnv.last_reminder_at,
      signingUrl: links.signingUrl,
      fullUrl: links.fullUrl,
      manualWhatsappUrl: links.manualWhatsappUrl,
      queuedWhatsapp,
      deliveryChannelNote,
    };
  });

export const cancelContract = createServerFn({ method: "POST" })
  .validator(
    z.object({
      contractId: z.string().uuid(),
      reason: z.string().trim().min(3, "Informe o motivo do cancelamento.").max(500).optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await requireStaff();

    const { data: contract, error: fetchErr } = await supabase
      .from("contracts")
      .select("id, status, store_id, title")
      .eq("id", input.contractId)
      .eq("store_id", identity.store_id)
      .maybeSingle();

    if (fetchErr || !contract) {
      throw new Error("Contrato não encontrado neste workspace.");
    }

    assertContractCancellable(contract.status);

    const nowIso = new Date().toISOString();
    const reason = input.reason || "Cancelado pelo emissor no cofre de contratos.";

    const { data: updated, error: updateErr } = await supabase
      .from("contracts")
      .update({
        status: "cancelled",
        void_reason: reason,
        cancelled_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", contract.id)
      .eq("store_id", identity.store_id)
      .select("id, status, cancelled_at, void_reason")
      .maybeSingle();

    if (updateErr || !updated) {
      throw new Error("Não foi possível cancelar o contrato.");
    }

    await recordContractAuditEvent(supabase, {
      contractId: contract.id,
      storeId: identity.store_id,
      action: "CANCELLED",
      actorProfile: identity.id,
      payloadHash: `${contract.id}:cancelled`,
      metadata: { reason, previous_status: contract.status },
    });

    return { success: true, contract: updated };
  });

// ─── Assinatura Cadastrada de Colaboradores & Perfil Próprio (1-Click Sign) ───

export const listTeamSignatureStatuses = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await requireStaff();

  const { data: members, error: membersErr } = await supabase
    .from("workspace_members")
    .select("id, profile_id, role, is_active")
    .eq("store_id", identity.store_id);

  if (membersErr) {
    throw new Error("Não foi possível consultar assinaturas da equipe.");
  }

  const activeMembers = (members || []).filter((m) => m.is_active !== false);
  const profileIds = Array.from(
    new Set(activeMembers.map((m) => m.profile_id).filter(Boolean)),
  );
  if (profileIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, phone, cpf, saved_signature_url, saved_initials_url")
    .in("id", profileIds);

  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  return activeMembers.map((m) => {
    const p = profileMap.get(m.profile_id);
    const effectiveSignature = p?.saved_signature_url || p?.saved_initials_url || null;
    return {
      memberId: m.id,
      profileId: m.profile_id,
      role: m.role,
      fullName: p?.full_name || "Colaborador",
      avatarUrl: p?.avatar_url || null,
      phone: p?.phone || null,
      cpf: p?.cpf || null,
      hasSavedSignature: Boolean(effectiveSignature),
      hasSavedInitials: Boolean(p?.saved_initials_url),
      savedSignaturePreview: effectiveSignature,
    };
  });
});

export const getUserSignatureProfile = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getIdentity();
  if (!identity?.id) {
    return {
      authenticated: false,
      profileId: null,
      fullName: null,
      email: null,
      phone: null,
      cpf: null,
      savedSignature: null,
      savedInitials: null,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, phone, cpf, saved_signature_url, saved_initials_url")
    .eq("id", identity.id)
    .maybeSingle();

  return {
    authenticated: true,
    profileId: identity.id,
    fullName: profile?.full_name || identity.fullName || identity.name || null,
    email: identity.email || null,
    phone: profile?.phone || null,
    cpf: profile?.cpf || null,
    savedSignature: profile?.saved_signature_url || profile?.saved_initials_url || null,
    savedInitials: profile?.saved_initials_url || null,
  };
});

export const saveUserSignatureAndInitials = createServerFn({ method: "POST" })
  .validator(
    z.object({
      signatureImageBase64: z
        .string()
        .trim()
        .max(2_000_000)
        .regex(DATA_IMAGE_URI_RE, "Assinatura inválida.")
        .nullable()
        .optional(),
      initialsImageBase64: z
        .string()
        .trim()
        .max(1_000_000)
        .regex(DATA_IMAGE_URI_RE, "Rubrica inválida.")
        .nullable()
        .optional(),
    }),
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getIdentity();
    if (!identity?.id) throw new Error("Não autenticado.");

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("saved_signature_url, saved_initials_url")
      .eq("id", identity.id)
      .maybeSingle();

    const updatePayload: Record<string, string | null> = {
      updated_at: new Date().toISOString(),
    };
    if (input.signatureImageBase64 !== undefined) {
      updatePayload.saved_signature_url = input.signatureImageBase64;
      if (
        input.signatureImageBase64 === null &&
        input.initialsImageBase64 === undefined &&
        !existingProfile?.saved_signature_url &&
        existingProfile?.saved_initials_url
      ) {
        updatePayload.saved_initials_url = null;
      }
    }
    if (input.initialsImageBase64 !== undefined) {
      updatePayload.saved_initials_url = input.initialsImageBase64;
      if (
        input.initialsImageBase64 &&
        input.signatureImageBase64 === undefined &&
        !existingProfile?.saved_signature_url
      ) {
        updatePayload.saved_signature_url = input.initialsImageBase64;
      }
    }

    const { data: updated, error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", identity.id)
      .select("id, saved_signature_url, saved_initials_url")
      .maybeSingle();

    if (error || !updated) {
      throw new Error("Não foi possível atualizar sua assinatura cadastrada.");
    }

    return {
      success: true,
      profileId: updated.id,
      savedSignature: updated.saved_signature_url || updated.saved_initials_url || null,
      savedInitials: updated.saved_initials_url,
    };
  });
