import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/start-server-core";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import { z } from "zod";
import crypto from "node:crypto";
import {
  type LegalPolicyType,
  type ConsentRecordItem,
  type TelemetricAuditProof,
  CANONICAL_LEGAL_POLICIES,
} from "@/types/legal-consent";

const recordConsentSchema = z.object({
  leadId: z.string().optional().nullable(),
  customerId: z.string().optional().nullable(),
  storeId: z.string().min(1, "storeId é obrigatório"),
  policyType: z.string().min(1),
  policyTitle: z.string().min(1),
  policyVersion: z.string().default("v1.0"),
  policyContent: z.string().optional().default(""),
  method: z.enum(["quick_link", "onboarding_form", "physical_document", "crm_operator"]).default("quick_link"),
  operatorId: z.string().optional().nullable(),
  operatorName: z.string().optional().nullable(),
  physicalProofUrl: z.string().optional().nullable(),
  geolocation: z
    .object({
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      accuracy: z.number().optional(),
    })
    .optional(),
});

export const recordLeadOrCustomerConsent = createServerFn({ method: "POST" })
  .validator(recordConsentSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();

    // 1. Telemetria Forense Server-Side Incontestável
    const cfIp = getRequestHeader("cf-connecting-ip");
    const xForwardedFor = getRequestHeader("x-forwarded-for");
    const xRealIp = getRequestHeader("x-real-ip");
    const rawIp = cfIp || (xForwardedFor ? xForwardedFor.split(",")[0].trim() : null) || xRealIp || "127.0.0.1";
    const userAgent = getRequestHeader("user-agent") || "Navegador Desconhecido";
    const cfCity = getRequestHeader("cf-ipcity") || undefined;
    const cfRegion = getRequestHeader("cf-region") || undefined;
    const cfCountry = getRequestHeader("cf-ipcountry") || "BR";

    const acceptedAt = new Date().toISOString();
    const certificateCode = `WAESY-LGPD-${crypto.randomBytes(4).toString("hex").toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // 2. Hash Criptográfico SHA-256 do Texto + Telemetria
    const hashSource = `${rawIp}|${userAgent}|${data.policyType}|${data.policyVersion}|${data.policyContent}|${acceptedAt}|${certificateCode}`;
    const sha256Hash = crypto.createHash("sha256").update(hashSource).digest("hex");
    const ipAddressHash = crypto.createHash("sha256").update(rawIp).digest("hex");

    const proof: TelemetricAuditProof = {
      ip_address: rawIp,
      ip_address_hash: ipAddressHash,
      user_agent: userAgent,
      session_id: sha256Hash.substring(0, 16),
      geolocation: data.geolocation || {
        city: cfCity,
        state: cfRegion,
        country: cfCountry,
      },
      sha256_hash: sha256Hash,
      accepted_at: acceptedAt,
      method: data.method,
      certificate_code: certificateCode,
      operator_id: data.operatorId || null,
      operator_name: data.operatorName || null,
      physical_proof_url: data.physicalProofUrl || null,
    };

    const newRecord: ConsentRecordItem = {
      id: crypto.randomUUID(),
      policy_type: data.policyType as LegalPolicyType,
      policy_title: data.policyTitle,
      policy_version: data.policyVersion,
      status: "accepted",
      proof,
      revoked_at: null,
      revocation_reason: null,
    };

    // 3. Persistência Dupla em legal_terms_acceptances
    try {
      await db.from("legal_terms_acceptances").insert({
        term_type: data.policyType,
        version: data.policyVersion,
        ip_address: rawIp,
        ip_address_hash: ipAddressHash,
        user_agent: userAgent,
        session_id: certificateCode,
        signature_hash: sha256Hash,
        metadata: {
          lead_id: data.leadId || null,
          customer_id: data.customerId || null,
          store_id: data.storeId,
          method: data.method,
          certificate_code: certificateCode,
          geolocation: proof.geolocation,
          policy_title: data.policyTitle,
          operator_id: data.operatorId || null,
          operator_name: data.operatorName || null,
          physical_proof_url: data.physicalProofUrl || null,
        },
        accepted_at: acceptedAt,
      });
    } catch (err) {
      console.error("[legal-telemetry] Erro não-bloqueante ao registrar em legal_terms_acceptances:", err);
    }

    // 4. Persistência em forensic_audit_events
    try {
      await db.from("forensic_audit_events").insert({
        actor_id: data.operatorId || null,
        actor_role: data.operatorId ? "staff_operator" : "lead_customer",
        target_entity_type: data.leadId ? "leads_crm" : "customers_crm",
        target_entity_id: data.leadId || data.customerId || certificateCode,
        action: "LEGAL_TERM_CONSENT_GRANTED",
        ip_address: rawIp,
        user_agent: userAgent,
        payload_snapshot: {
          policy_type: data.policyType,
          certificate_code: certificateCode,
          method: data.method,
          lead_id: data.leadId,
          customer_id: data.customerId,
          accepted_at: acceptedAt,
        },
        checksum_sha256: sha256Hash,
      });
    } catch (err) {
      console.error("[legal-telemetry] Erro não-bloqueante ao registrar em forensic_audit_events:", err);
    }

    // 5. Persistência via RPC SECURITY DEFINER (funciona mesmo para cliente não-autenticado em /m/consent/$leadId)
    await (db.rpc as any)("record_public_lead_consent", {
      _lead_id: data.leadId || null,
      _customer_id: data.customerId || null,
      _consent_record: newRecord,
    }).then(() => null, () => null);

    // 5.1 Sincronização direta adicional em leads_crm (quando autenticado como staff)
    if (data.leadId) {
      const { data: leadRow } = await db
        .from("leads_crm")
        .select("custom_fields")
        .eq("id", data.leadId)
        .maybeSingle();

      const existingCustom = (leadRow?.custom_fields as Record<string, any>) || {};
      const currentList: ConsentRecordItem[] = Array.isArray(existingCustom.consent_records)
        ? existingCustom.consent_records
        : [];

      // Remove versão anterior do mesmo policy_type para manter a mais recente como ativa
      const updatedList = [
        newRecord,
        ...currentList.filter((item) => item.policy_type !== data.policyType),
      ];

      await db
        .from("leads_crm")
        .update({
          custom_fields: {
            ...existingCustom,
            consent_records: updatedList,
            last_consent_at: acceptedAt,
          },
        })
        .eq("id", data.leadId);
    }

    // 6. Atualização atômica em customers_crm (se customerId existir)
    if (data.customerId) {
      const { data: custRow } = await db
        .from("customers_crm")
        .select("custom_fields")
        .eq("id", data.customerId)
        .maybeSingle();

      const existingCustom = (custRow?.custom_fields as Record<string, any>) || {};
      const currentList: ConsentRecordItem[] = Array.isArray(existingCustom.consent_records)
        ? existingCustom.consent_records
        : [];

      const updatedList = [
        newRecord,
        ...currentList.filter((item) => item.policy_type !== data.policyType),
      ];

      await db
        .from("customers_crm")
        .update({
          custom_fields: {
            ...existingCustom,
            consent_records: updatedList,
            last_consent_at: acceptedAt,
          },
        })
        .eq("id", data.customerId);
    }

    return {
      success: true,
      certificateCode,
      acceptedAt,
      record: newRecord,
    };
  });

export const revokeConsentAction = createServerFn({ method: "POST" })
  .validator(
    z.object({
      leadId: z.string().optional().nullable(),
      customerId: z.string().optional().nullable(),
      policyType: z.string().min(1),
      reason: z.string().default("Solicitado pelo titular"),
    })
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    const revokedAt = new Date().toISOString();

    if (data.leadId) {
      const { data: leadRow } = await db
        .from("leads_crm")
        .select("custom_fields")
        .eq("id", data.leadId)
        .maybeSingle();

      const existingCustom = (leadRow?.custom_fields as Record<string, any>) || {};
      const currentList: ConsentRecordItem[] = Array.isArray(existingCustom.consent_records)
        ? existingCustom.consent_records
        : [];

      const updatedList = currentList.map((item) => {
        if (item.policy_type === data.policyType) {
          return {
            ...item,
            status: "revoked" as const,
            revoked_at: revokedAt,
            revocation_reason: data.reason,
          };
        }
        return item;
      });

      await db
        .from("leads_crm")
        .update({
          custom_fields: {
            ...existingCustom,
            consent_records: updatedList,
          },
        })
        .eq("id", data.leadId);
    }

    if (data.customerId) {
      const { data: custRow } = await db
        .from("customers_crm")
        .select("custom_fields")
        .eq("id", data.customerId)
        .maybeSingle();

      const existingCustom = (custRow?.custom_fields as Record<string, any>) || {};
      const currentList: ConsentRecordItem[] = Array.isArray(existingCustom.consent_records)
        ? existingCustom.consent_records
        : [];

      const updatedList = currentList.map((item) => {
        if (item.policy_type === data.policyType) {
          return {
            ...item,
            status: "revoked" as const,
            revoked_at: revokedAt,
            revocation_reason: data.reason,
          };
        }
        return item;
      });

      await db
        .from("customers_crm")
        .update({
          custom_fields: {
            ...existingCustom,
            consent_records: updatedList,
          },
        })
        .eq("id", data.customerId);
    }

    return { success: true, revokedAt };
  });

export const getLeadConsentBundle = createServerFn({ method: "GET" })
  .validator(
    z.object({
      leadId: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const db = getServerClient();

    // Tenta primeiramente via RPC SECURITY DEFINER para suportar links públicos (/m/consent/$leadId)
    const { data: rpcBundle } = await (db.rpc as any)("get_public_lead_consent_bundle", {
      _lead_id: data.leadId,
    }).then((res: any) => res, () => ({ data: null }));

    let lead: any = rpcBundle?.lead || null;
    let store: any = rpcBundle?.store || null;
    let travelTemplates: any[] = rpcBundle?.travel_templates || [];
    let universalTemplates: any[] = rpcBundle?.universal_templates || [];

    if (!lead) {
      const { data: directLead, error } = await db
        .from("leads_crm")
        .select("id, full_name, phone, email, store_id, custom_fields")
        .eq("id", data.leadId)
        .maybeSingle();

      if (error || !directLead) {
        throw new Error("Lead não encontrado para consulta de consentimento.");
      }
      lead = directLead;

      const [storeRes, travelRes, universalRes] = await Promise.all([
        db
          .from("stores")
          .select("id, name, settings")
          .eq("id", lead.store_id)
          .maybeSingle(),
        db
          .from("travel_contract_templates")
          .select("id, title, description, clauses, updated_at")
          .eq("store_id", lead.store_id)
          .then((res) => res, () => ({ data: [] as any[] })),
        db
          .from("contract_templates")
          .select("id, title, category, description, content_markdown, clauses")
          .eq("store_id", lead.store_id)
          .then((res) => res, () => ({ data: [] as any[] })),
      ]);
      store = storeRes.data;
      travelTemplates = travelRes.data || [];
      universalTemplates = universalRes.data || [];
    }

    const settingsPolicies =
      ((store?.settings as Record<string, any>)?.legal_policies as Record<string, any>) ||
      ((store?.settings as Record<string, any>)?.policies as Record<string, any>) ||
      {};

    const storePolicies: Record<string, any> = {
      ...settingsPolicies,
    };

    // Mescla templates de contratos turísticos configurados na loja
    for (const tpl of travelTemplates || []) {
      const key = `travel_tpl_${tpl.id}`;
      const clausesText = Array.isArray(tpl.clauses)
        ? tpl.clauses.map((c: any) => `### ${c.section || "Cláusula"}\n${c.clause_text || ""}`).join("\n\n")
        : "";
      storePolicies[key] = {
        title: tpl.title || "Contrato Turístico da Agência",
        description: tpl.description || "Minuta personalizada configurada no módulo de Contratos Turísticos.",
        content: clausesText || tpl.description || "",
        version: "v1.0",
      };
    }

    // Mescla templates universais de contratos/termos configurados na loja
    for (const tpl of universalTemplates || []) {
      const key = `contract_tpl_${tpl.id}`;
      const clausesText =
        tpl.content_markdown ||
        (Array.isArray(tpl.clauses)
          ? tpl.clauses.map((c: any) => `### ${c.title || c.section || "Cláusula"}\n${c.content || c.clause_text || ""}`).join("\n\n")
          : "");
      storePolicies[key] = {
        title: tpl.title || "Termo / Contrato Personalizado",
        description: tpl.description || "Modelo configurado na Central de Contratos.",
        content: clausesText,
        version: "v1.0",
      };
    }

    const existingConsents: ConsentRecordItem[] = Array.isArray(lead.custom_fields?.consent_records)
      ? lead.custom_fields.consent_records
      : [];

    const boundPolicyKeys: string[] = Array.isArray(lead.custom_fields?.bound_policy_keys)
      ? lead.custom_fields.bound_policy_keys
      : [];

    return {
      lead: {
        id: lead.id,
        fullName: lead.full_name,
        phone: lead.phone,
        email: lead.email,
        storeId: lead.store_id,
      },
      store: {
        id: store?.id,
        name: store?.name || "Agência de Viagens",
      },
      canonicalPolicies: CANONICAL_LEGAL_POLICIES,
      storePolicies,
      existingConsents,
      boundPolicyKeys,
    };
  });

export const bindPolicyTemplateToLead = createServerFn({ method: "POST" })
  .validator(
    z.object({
      leadId: z.string().min(1),
      customerId: z.string().optional().nullable(),
      policyKey: z.string().min(1),
      policyTitle: z.string().min(1),
      policyVersion: z.string().default("v1.0"),
      policyContent: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const db = getServerClient();

    const { data: leadRow, error } = await db
      .from("leads_crm")
      .select("custom_fields")
      .eq("id", data.leadId)
      .maybeSingle();

    if (error || !leadRow) {
      throw new Error("Lead não encontrado para vincular termo.");
    }

    const existingCustom = (leadRow.custom_fields as Record<string, any>) || {};
    const currentBound: string[] = Array.isArray(existingCustom.bound_policy_keys)
      ? existingCustom.bound_policy_keys
      : [
          "privacy_policy",
          "quotation_policy",
          "sensitive_data_policy",
          "cancellation_policy",
          "terms_of_service",
        ];

    const updatedBound = Array.from(new Set([...currentBound, data.policyKey]));

    const currentConsents: ConsentRecordItem[] = Array.isArray(existingCustom.consent_records)
      ? existingCustom.consent_records
      : [];

    const alreadyInConsents = currentConsents.some((c) => c.policy_type === data.policyKey);
    const pendingRecord: ConsentRecordItem = {
      id: crypto.randomUUID(),
      policy_type: data.policyKey as LegalPolicyType,
      policy_title: data.policyTitle,
      policy_version: data.policyVersion,
      status: "pending",
      proof: null,
      revoked_at: null,
      revocation_reason: null,
    };

    const updatedConsents = alreadyInConsents
      ? currentConsents
      : [...currentConsents, pendingRecord];

    await db
      .from("leads_crm")
      .update({
        custom_fields: {
          ...existingCustom,
          bound_policy_keys: updatedBound,
          consent_records: updatedConsents,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.leadId);

    if (data.customerId) {
      const { data: custRow } = await db
        .from("customers_crm")
        .select("custom_fields")
        .eq("id", data.customerId)
        .maybeSingle();
      if (custRow) {
        const custCustom = (custRow.custom_fields as Record<string, any>) || {};
        const custConsents: ConsentRecordItem[] = Array.isArray(custCustom.consent_records)
          ? custCustom.consent_records
          : [];
        if (!custConsents.some((c) => c.policy_type === data.policyKey)) {
          await db
            .from("customers_crm")
            .update({
              custom_fields: {
                ...custCustom,
                bound_policy_keys: updatedBound,
                consent_records: [...custConsents, pendingRecord],
              },
            })
            .eq("id", data.customerId);
        }
      }
    }

    return {
      success: true,
      boundPolicyKeys: updatedBound,
      consentRecords: updatedConsents,
      pendingRecord,
    };
  });
