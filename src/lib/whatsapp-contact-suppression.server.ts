import { buildBrazilPhoneVariants, sanitizePhoneDigits } from "@/lib/phone-match";
import { isContactScopeSuppressed, type WhatsAppContactScope } from "@/lib/whatsapp-contact-scope";

export interface ContactCaptureSuppressionResult {
  suppressed: boolean;
  reason: "contact_scope" | "explicit_flag" | "staff_directory_phone" | null;
  contactScope: WhatsAppContactScope;
  internalRoleLabel: string | null;
}

/**
 * Avalia de forma centralizada e Zero-Trust se um contato WhatsApp deve ter captura de CRM
 * (`leads_crm`, `whatsapp_lead_conversions`) e disparo de Meta CAPI bloqueados.
 * Contatos internos, stakeholders, fornecedores ou números da equipe da loja continuam operando
 * normalmente no inbox de chat sem poluir o funil comercial nem os pixels.
 */
export async function resolveContactCaptureSuppression(
  db: any,
  input: {
    storeId: string;
    identityId?: string | null;
    phone?: string | null;
    groupJid?: string | null;
    threadMeta?: Record<string, any> | null;
    identityRow?: {
      contact_scope?: string | null;
      suppress_lead_capture?: boolean | null;
      internal_role_label?: string | null;
      metadata?: Record<string, any> | null;
    } | null;
  },
): Promise<ContactCaptureSuppressionResult> {
  const tMeta = input.threadMeta && typeof input.threadMeta === "object" ? input.threadMeta : {};
  const metaScope = typeof tMeta.contact_scope === "string" ? tMeta.contact_scope : null;
  const metaSuppress = tMeta.suppress_lead_capture === true;

  if (isContactScopeSuppressed(metaScope, metaSuppress)) {
    return {
      suppressed: true,
      reason: metaScope && metaScope !== "lead" ? "contact_scope" : "explicit_flag",
      contactScope: (metaScope as WhatsAppContactScope) || "ignored",
      internalRoleLabel: typeof tMeta.internal_role_label === "string" ? tMeta.internal_role_label : null,
    };
  }

  const effectiveGroupJid = String(input.groupJid || tMeta.group_jid || "").trim();
  if (effectiveGroupJid && effectiveGroupJid.endsWith("@g.us")) {
    try {
      const { data: grpRow } = await db
        .from("whatsapp_groups_directory")
        .select("group_role, silence_lead_capture, group_name")
        .eq("store_id", input.storeId)
        .eq("group_jid", effectiveGroupJid)
        .maybeSingle();
      if (grpRow && (grpRow.group_role === "internal_team" || grpRow.silence_lead_capture === true)) {
        return {
          suppressed: true,
          reason: "explicit_flag",
          contactScope: "internal_team",
          internalRoleLabel: grpRow.group_name ? `Grupo Interno (${grpRow.group_name})` : "Grupo Interno",
        };
      }
    } catch {
      // Resiliente se tabela de grupos não estiver populada
    }
  }

  let identity = input.identityRow || null;
  if (!identity && input.identityId) {
    try {
      const { data } = await db
        .from("whatsapp_contact_identities")
        .select("contact_scope, suppress_lead_capture, internal_role_label, metadata")
        .eq("id", input.identityId)
        .eq("store_id", input.storeId)
        .maybeSingle();
      identity = data;
    } catch {
      try {
        const { data } = await db
          .from("whatsapp_contact_identities")
          .select("metadata")
          .eq("id", input.identityId)
          .eq("store_id", input.storeId)
          .maybeSingle();
        identity = data;
      } catch {
        identity = null;
      }
    }
  }

  if (identity) {
    const idMeta = identity.metadata && typeof identity.metadata === "object" ? identity.metadata : {};
    const effectiveScope = identity.contact_scope || (typeof idMeta.contact_scope === "string" ? idMeta.contact_scope : "lead");
    const effectiveFlag = Boolean(identity.suppress_lead_capture || idMeta.suppress_lead_capture);
    if (isContactScopeSuppressed(effectiveScope, effectiveFlag)) {
      return {
        suppressed: true,
        reason: effectiveScope !== "lead" ? "contact_scope" : "explicit_flag",
        contactScope: effectiveScope as WhatsAppContactScope,
        internalRoleLabel: identity.internal_role_label || (typeof idMeta.internal_role_label === "string" ? idMeta.internal_role_label : null),
      };
    }
  }

  // Checa se o telefone pertence a colaborador cadastrado em workspace_members + profiles
  const cleanDigits = sanitizePhoneDigits(input.phone);
  if (cleanDigits.length >= 8) {
    try {
      const { data: staffMembers } = await db
        .from("workspace_members")
        .select("role, profile_id")
        .eq("store_id", input.storeId)
        .limit(100);

      const staffList = Array.isArray(staffMembers) ? staffMembers : [];
      const profileIds = Array.from(
        new Set(staffList.map((m: any) => String(m?.profile_id || "").trim()).filter(Boolean)),
      );

      if (profileIds.length > 0) {
        const { data: profileRows } = await db
          .from("profiles")
          .select("id, phone")
          .in("id", profileIds);

        const roleByProfile = new Map<string, string>();
        for (const m of staffList) {
          if (m?.profile_id) roleByProfile.set(String(m.profile_id), String(m.role || ""));
        }

        const targetVariants = new Set(
          [cleanDigits, ...buildBrazilPhoneVariants(cleanDigits).map((v) => sanitizePhoneDigits(v))].filter(
            (d) => d.length >= 8,
          ),
        );
        for (const prof of profileRows || []) {
          const staffPhone = sanitizePhoneDigits(prof?.phone);
          if (staffPhone.length < 8) continue;
          const staffVariants = buildBrazilPhoneVariants(staffPhone).map((v) => sanitizePhoneDigits(v));
          if (targetVariants.has(staffPhone) || staffVariants.some((sv) => targetVariants.has(sv))) {
            const roleStr = roleByProfile.get(String(prof.id));
            return {
              suppressed: true,
              reason: "staff_directory_phone",
              contactScope: "internal_team",
              internalRoleLabel: roleStr ? `Equipe (${roleStr})` : "Equipe Interna",
            };
          }
        }
      }
    } catch {
      // Sem bloquear fluxo principal caso tabela não esteja acessível
    }
  }

  return {
    suppressed: false,
    reason: null,
    contactScope: "lead",
    internalRoleLabel: null,
  };
}
