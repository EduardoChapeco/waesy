import { z } from "zod";

/**
 * Plan Tiers do Ecossistema Waesy (Dual-Engine Architecture).
 * - FREE_MVP: Onboarding simplificado, catálogo rápido e perfil público editável integrado ao Google Meu Negócio.
 * - WAESY_MAX: Workspace Pro nichado, relatórios fiscais, orquestrador de IA com quotas e automações.
 */
export type PlanTier = "FREE_MVP" | "WAESY_MAX";

export const PlanTierEnum = z.enum(["FREE_MVP", "WAESY_MAX"]);

/**
 * Status de Conformidade de Marketplace (Acesso Curado com CNPJ e Suporte).
 */
export type MarketplaceComplianceStatus = "PENDING" | "APPROVED" | "SUSPENDED";

export const MarketplaceComplianceStatusEnum = z.enum([
  "PENDING",
  "APPROVED",
  "SUSPENDED",
]);

/**
 * Schema de Endereço Fiscal / Físico Verificado
 */
export const VerifiedAddressSchema = z.object({
  street: z.string().min(2, "Logradouro é obrigatório"),
  number: z.string().min(1, "Número é obrigatório"),
  complement: z.string().optional(),
  neighborhood: z.string().min(2, "Bairro é obrigatório"),
  city: z.string().min(2, "Cidade é obrigatória"),
  state: z.string().length(2, "UF deve ter 2 letras"),
  zipCode: z.string().regex(/^\d{5}-?\d{3}$/, "CEP inválido"),
  country: z.string().default("BR"),
  coordinates: z
    .object({
      latitude: z.number(),
      longitude: z.number(),
    })
    .optional(),
});

export type VerifiedAddressDTO = z.infer<typeof VerifiedAddressSchema>;

/**
 * Schema de Canal de Suporte Verificado
 */
export const VerifiedSupportChannelSchema = z.object({
  supportEmail: z.string().email("E-mail de suporte inválido"),
  supportPhone: z.string().min(10, "Telefone de suporte inválido"),
  whatsappSac: z.string().optional(),
  operatingHours: z.string().optional(),
});

export type VerifiedSupportChannelDTO = z.infer<typeof VerifiedSupportChannelSchema>;

/**
 * DTO Completo de Conformidade de Marketplace
 */
export interface MarketplaceComplianceDTO {
  id: string;
  storeId: string;
  companyId?: string | null;
  cnpj: string;
  legalName: string; // Razão Social
  tradeName?: string | null; // Nome Fantasia
  verifiedAddress: VerifiedAddressDTO;
  verifiedSupportChannel: VerifiedSupportChannelDTO;
  status: MarketplaceComplianceStatus;
  rejectionReason?: string | null;
  verifiedAt?: string | null;
  expiresAt?: string | null;
  auditedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Resumo de Status de Loja no Marketplace Oficial
 */
export interface StoreComplianceSummaryDTO {
  storeId: string;
  storeName: string;
  storeSlug: string;
  planTier: PlanTier;
  isMarketplaceVerified: boolean;
  complianceStatus: MarketplaceComplianceStatus | "NOT_REQUESTED";
  cnpj?: string | null;
  verifiedBadgeLabel?: string;
}

/**
 * Tipo de Navegação da Vitrine Principal:
 * - 'marketplace': Vitrine Oficial Verificada (Apenas empresas com CNPJ ativo e suporte)
 * - 'classifieds': Classificados Locais (Acesso P2P livre, WhatsApp direto, sem transação forçada)
 */
export type VitrineEngineMode = "marketplace" | "classifieds";
