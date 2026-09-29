import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import {
  VerifiedAddressSchema,
  VerifiedSupportChannelSchema,
  type MarketplaceComplianceDTO,
  type StoreComplianceSummaryDTO,
  type MarketplaceComplianceStatus,
  type PlanTier,
} from "@/types/marketplace-compliance";

/**
 * Validação algorítmica de CNPJ brasileiro (Módulo 11 da Receita Federal)
 */
export function validateCnpj(rawCnpj: string): boolean {
  if (!rawCnpj) return false;
  const cleaned = rawCnpj.replace(/\D/g, "");
  if (cleaned.length !== 14) return false;

  // Rejeita sequências repetidas (ex: 11111111111111)
  if (/^(\d)\1+$/.test(cleaned)) return false;

  // Cálculo do primeiro dígito verificador
  let size = cleaned.length - 2;
  let numbers = cleaned.substring(0, size);
  const digits = cleaned.substring(size);
  let sum = 0;
  let pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0), 10)) return false;

  // Cálculo do segundo dígito verificador
  size = size + 1;
  numbers = cleaned.substring(0, size);
  sum = 0;
  pos = size - 7;

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i), 10) * pos--;
    if (pos < 2) pos = 9;
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(digits.charAt(1), 10);
}

/**
 * Formata CNPJ para visualização limpa
 */
export function formatCnpj(rawCnpj: string): string {
  const cleaned = rawCnpj.replace(/\D/g, "");
  if (cleaned.length !== 14) return rawCnpj;
  return cleaned.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5"
  );
}

// ---------------------------------------------------------------------------
// 1. CONSULTAR STATUS DE CONFORMIDADE DA LOJA
// ---------------------------------------------------------------------------
export const GetStoreComplianceStatusSchema = z
  .object({
    storeId: z.string().uuid("ID da loja inválido").optional(),
  })
  .optional();

export const getStoreComplianceStatus = createServerFn({ method: "GET" })
  .validator((d: unknown) => GetStoreComplianceStatusSchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    const targetStoreId = data?.storeId || identity.storeId;
    if (!targetStoreId) {
      throw new Error("ID da loja não fornecido e nenhuma loja ativa na sessão.");
    }

    const { data: store, error: storeErr } = await supabase
      .from("stores")
      .select("id, name, slug, plan_tier")
      .eq("id", targetStoreId)
      .maybeSingle();

    if (storeErr || !store) {
      throw new Error("Loja não encontrada.");
    }

    const { data: compliance } = await supabase
      .from("marketplace_compliance")
      .select("*")
      .eq("store_id", targetStoreId)
      .maybeSingle();

    const status: MarketplaceComplianceStatus | "NOT_REQUESTED" = compliance
      ? (compliance.status as MarketplaceComplianceStatus)
      : "NOT_REQUESTED";

    return {
      storeId: store.id,
      storeName: store.name,
      storeSlug: store.slug,
      planTier: (store.plan_tier as PlanTier) || "FREE_MVP",
      isMarketplaceVerified: status === "APPROVED",
      complianceStatus: status,
      cnpj: compliance?.cnpj || null,
      verifiedBadgeLabel:
        status === "APPROVED" ? "Marketplace Verificado" : undefined,
      compliance: compliance || null,
    };
  });

// ---------------------------------------------------------------------------
// 2. SUBMETER LOJA PARA CONFORMIDADE NO MARKETPLACE (Lojista)
// ---------------------------------------------------------------------------
export const SubmitStoreComplianceSchema = z.object({
  storeId: z.string().uuid().optional(),
  cnpj: z.string().min(14, "CNPJ inválido"),
  legalName: z.string().min(3, "Razão Social é obrigatória"),
  tradeName: z.string().optional(),
  stateRegistration: z.string().optional(),
  sacPhone: z.string().min(8, "Telefone de SAC obrigatório"),
  sacEmail: z.string().email("E-mail de SAC inválido"),
  returnPolicyUrl: z.string().optional(),
  fiscalNotes: z.string().optional(),
  verifiedAddress: VerifiedAddressSchema.optional(),
  verifiedSupportChannel: VerifiedSupportChannelSchema.optional(),
});

export const submitStoreCompliance = createServerFn({ method: "POST" })
  .validator(SubmitStoreComplianceSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    const targetStoreId = data.storeId || identity.storeId;
    if (!targetStoreId) {
      throw new Error("ID da loja não fornecido e nenhuma loja ativa na sessão.");
    }
    assertStoreAccess(identity, ["owner", "admin", "master"], targetStoreId);

    const cleanCnpj = data.cnpj.replace(/\D/g, "");
    if (!validateCnpj(cleanCnpj)) {
      throw new Error("O CNPJ fornecido é inválido perante as regras da Receita Federal.");
    }

    const formattedCnpj = formatCnpj(cleanCnpj);

    const address = data.verifiedAddress || {
      street: "Endereço Cadastrado na Plataforma",
      number: "S/N",
      neighborhood: "Centro",
      city: "Sede",
      state: "SC",
      zipcode: "89900-000",
    };

    const supportChannel = data.verifiedSupportChannel || {
      channelType: "whatsapp" as const,
      contactValue: data.sacPhone,
      slaHours: 24,
    };

    const payload = {
      store_id: targetStoreId,
      cnpj: formattedCnpj,
      legal_name: data.legalName.trim(),
      trade_name: data.tradeName ? data.tradeName.trim() : null,
      state_registration: data.stateRegistration || null,
      sac_phone: data.sacPhone.trim(),
      sac_email: data.sacEmail.trim(),
      return_policy_url: data.returnPolicyUrl || null,
      fiscal_notes: data.fiscalNotes || null,
      verified_address: address,
      verified_support_channel: supportChannel,
      status: "PENDING",
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    };

    const { data: saved, error } = await supabase
      .from("marketplace_compliance")
      .upsert(payload, { onConflict: "store_id" })
      .select("*")
      .single();

    if (error) {
      throw new Error("Falha ao submeter conformidade da loja: " + error.message);
    }

    return {
      message: "Dados de conformidade submetidos com sucesso para homologação no Marketplace!",
      compliance: saved,
      id: saved.id,
      storeId: saved.store_id,
      companyId: saved.company_id,
      cnpj: saved.cnpj,
      legalName: saved.legal_name,
      tradeName: saved.trade_name,
      verifiedAddress: saved.verified_address,
      verifiedSupportChannel: saved.verified_support_channel,
      status: saved.status,
      rejectionReason: saved.rejection_reason,
      approvedAt: saved.approved_at,
      createdAt: saved.created_at,
      updatedAt: saved.updated_at,
    };
  });

export const getStoreMarketplaceCompliance = getStoreComplianceStatus;
export const submitMarketplaceCompliance = submitStoreCompliance;

// ---------------------------------------------------------------------------
// 3. AUDITORIA & APROVAÇÃO DE CONFORMIDADE (Admin Master / Backoffice)
// ---------------------------------------------------------------------------
export const AuditStoreComplianceSchema = z.object({
  storeId: z.string().uuid(),
  decision: z.enum(["APPROVE", "REJECT", "SUSPEND"]),
  rejectionReason: z.string().optional(),
  validityMonths: z.number().int().min(1).default(12),
});

export const auditStoreCompliance = createServerFn({ method: "POST" })
  .validator(AuditStoreComplianceSchema)
  .handler(async ({ data }): Promise<{ success: boolean; newStatus: MarketplaceComplianceStatus }> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    if (!identity || !["master", "platform_admin", "admin"].includes(identity.role)) {
      throw new Error("Ação restrita aos auditores de conformidade do Waesy.");
    }

    let status: MarketplaceComplianceStatus = "PENDING";
    let verifiedAt: string | null = null;
    let expiresAt: string | null = null;

    if (data.decision === "APPROVE") {
      status = "APPROVED";
      verifiedAt = new Date().toISOString();
      const exp = new Date();
      exp.setMonth(exp.getMonth() + data.validityMonths);
      expiresAt = exp.toISOString();
    } else if (data.decision === "REJECT" || data.decision === "SUSPEND") {
      status = "SUSPENDED";
    }

    const { error } = await supabase
      .from("marketplace_compliance")
      .update({
        status,
        rejection_reason: data.rejectionReason || null,
        verified_at: verifiedAt,
        expires_at: expiresAt,
        audited_by: identity.id,
        updated_at: new Date().toISOString(),
      })
      .eq("store_id", data.storeId);

    if (error) {
      throw new Error("Erro ao atualizar auditoria de conformidade: " + error.message);
    }

    return { success: true, newStatus: status };
  });

// ---------------------------------------------------------------------------
// 4. LISTAR LOJAS VERIFICADAS DO MARKETPLACE OFICIAL (Filtro Estrito)
// ---------------------------------------------------------------------------
export const ListVerifiedMarketplaceStoresSchema = z.object({
  city: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(20),
});

export const listVerifiedMarketplaceStores = createServerFn({ method: "GET" })
  .validator(ListVerifiedMarketplaceStoresSchema)
  .handler(async ({ data }): Promise<StoreComplianceSummaryDTO[]> => {
    const supabase = getServerClient();

    let query = supabase
      .from("marketplace_compliance")
      .select(`
        id,
        cnpj,
        status,
        store:stores (
          id,
          name,
          slug,
          city,
          plan_tier
        )
      `)
      .eq("status", "APPROVED")
      .limit(data.limit);

    const { data: records, error } = await query;

    if (error) {
      console.warn("[listVerifiedMarketplaceStores] Erro ao buscar lojas verificadas:", error.message);
      return [];
    }

    return (records || [])
      .filter((r: any) => r.store)
      .map((r: any) => ({
        storeId: r.store.id,
        storeName: r.store.name,
        storeSlug: r.store.slug,
        planTier: (r.store.plan_tier as PlanTier) || "FREE_MVP",
        isMarketplaceVerified: true,
        complianceStatus: "APPROVED",
        cnpj: r.cnpj,
        verifiedBadgeLabel: "Marketplace Verificado",
      }));
  });
