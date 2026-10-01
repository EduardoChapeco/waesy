/**
 * types.ts — Padrão de Conteúdo Canônico em 11 Blocos (G19–G21)
 * 
 * Regra: Nenhum anúncio é texto livre desestruturado.
 * Todo anúncio é composto por blocos tipados, versionados e sanitizados.
 */

import { z } from 'zod';
import { CanonicalArchetypeId } from '../niche-packages/types';

// B1: Identidade
export interface B1_IdentityBlock {
  type: 'B1_IDENTITY';
  title: string;
  subtitle?: string;
  category: string;
  brand?: string;
  model?: string;
  condition: 'new' | 'used' | 'refurbished' | 'service';
  indexableTags: string[];
  isInternalOnly?: boolean;
}

// B2: Proposta de Valor
export interface B2_ValuePropositionBlock {
  type: 'B2_VALUE_PROPOSITION';
  summaryLine: string; // Exatamente 1 frase de impacto
  highlights: string[]; // Até 5 destaques curtos
  isInternalOnly?: boolean;
}

// B3: Mídia com Papel Definido
export type MediaRole =
  | 'cover'
  | 'environment'
  | 'detail'
  | 'in_use'
  | 'social_proof'
  | 'video_tour'
  | 'internal_document';

export interface B3_RoleMediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  role: MediaRole;
  altText: string;
  displayOrder: number;
  isInternalOnly?: boolean;
}

export interface B3_RoleMediaBlock {
  type: 'B3_ROLE_MEDIA';
  items: B3_RoleMediaItem[];
  isInternalOnly?: boolean;
}

// B4: Especificações Tipadas
export interface SpecificationProperty {
  key: string;
  label: string;
  value: string | number | boolean;
  unit?: string;
  isInternalOnly?: boolean;
}

export interface B4_TypedSpecificationsBlock {
  type: 'B4_TYPED_SPECIFICATIONS';
  archetypeId: CanonicalArchetypeId;
  specs: SpecificationProperty[];
  isInternalOnly?: boolean;
}

// B5: Inclusos e Exclusos
export interface InclusionsExclusionsItem {
  label: string;
  isIncluded: boolean;
  notes?: string;
}

export interface B5_InclusionsExclusionsBlock {
  type: 'B5_INCLUSIONS_EXCLUSIONS';
  items: InclusionsExclusionsItem[];
  isInternalOnly?: boolean;
}

// B6: Condições Comerciais e Entrega
export interface B6_CommercialConditionsBlock {
  type: 'B6_COMMERCIAL_CONDITIONS';
  paymentMethods: string[];
  maxInstallments?: number;
  installmentInterestFree?: boolean;
  depositRequiredCents?: number;
  leadTimeDays?: number;
  warrantyPeriodDays?: number;
  fulfillmentType: 'shipping' | 'pickup' | 'on_site' | 'digital_instant';
  isInternalOnly?: boolean;
}

// B7: Políticas
export interface B7_PoliciesBlock {
  type: 'B7_POLICIES';
  cancellationPolicy: string;
  refundPolicy: string;
  returnPolicy?: string;
  noShowPolicy?: string;
  lateFeePercent?: number;
  isInternalOnly?: boolean;
}

// B8: Perguntas Frequentes (FAQ)
export interface FaqPair {
  question: string;
  answer: string;
}

export interface B8_FaqBlock {
  type: 'B8_FAQ';
  questions: FaqPair[];
  isInternalOnly?: boolean;
}

// B9: Logística e Operação
export interface B9_LogisticsOperationBlock {
  type: 'B9_LOGISTICS_OPERATION';
  coverageAreaKm?: number;
  operatingCities?: string[];
  preparationTimeMinutes?: number;
  appointmentLeadTimeHours?: number;
  requiresVehicleLayout?: boolean;
  isInternalOnly?: boolean;
}

// B10: Fiscal
export interface B10_FiscalBlock {
  type: 'B10_FISCAL';
  ncmCode?: string;
  cestCode?: string;
  cnaeCode?: string;
  originCode?: string;
  estimatedTaxPercent?: number;
  supplierCnpjInternal?: string;
  isInternalOnly?: boolean;
}

// B11: SEO
export interface B11_SeoBlock {
  type: 'B11_SEO';
  slug: string;
  metaTitle: string;
  metaDescription: string;
  canonicalUrl?: string;
  keywords: string[];
  isInternalOnly?: boolean;
}

// Bloco Interno de Margem / Custo (G24: Estritamente isInternalOnly = true)
export interface InternalEconomicsBlock {
  type: 'INTERNAL_ECONOMICS';
  costCents: number;
  targetMarginPercent: number;
  grossProfitCents: number;
  supplierName?: string;
  internalNotes?: string;
  isInternalOnly: true;
}

export type AnyCanonicalContentBlock =
  | B1_IdentityBlock
  | B2_ValuePropositionBlock
  | B3_RoleMediaBlock
  | B4_TypedSpecificationsBlock
  | B5_InclusionsExclusionsBlock
  | B6_CommercialConditionsBlock
  | B7_PoliciesBlock
  | B8_FaqBlock
  | B9_LogisticsOperationBlock
  | B10_FiscalBlock
  | B11_SeoBlock
  | InternalEconomicsBlock;

// Estrutura Completa do Anúncio Padronizado
export interface CanonicalAdContent {
  version: string;
  locale: string;
  narrativeDescription: string; // Campo único sanitizado (G22)
  blocks: {
    b1_identity: B1_IdentityBlock;
    b2_value_proposition: B2_ValuePropositionBlock;
    b3_role_media: B3_RoleMediaBlock;
    b4_specifications: B4_TypedSpecificationsBlock;
    b5_inclusions_exclusions: B5_InclusionsExclusionsBlock;
    b6_commercial_conditions: B6_CommercialConditionsBlock;
    b7_policies: B7_PoliciesBlock;
    b8_faq?: B8_FaqBlock;
    b9_logistics?: B9_LogisticsOperationBlock;
    b10_fiscal?: B10_FiscalBlock;
    b11_seo: B11_SeoBlock;
    internal_economics?: InternalEconomicsBlock;
  };
}

// ── ZOD SCHEMAS PARA OS BLOCOS (G20, G21) ──

export const b1IdentitySchema = z.object({
  type: z.literal('B1_IDENTITY'),
  title: z.string().min(3).max(120),
  subtitle: z.string().max(160).optional(),
  category: z.string().min(2),
  brand: z.string().optional(),
  model: z.string().optional(),
  condition: z.enum(['new', 'used', 'refurbished', 'service']),
  indexableTags: z.array(z.string()),
  isInternalOnly: z.boolean().optional(),
});

export const b2ValuePropositionSchema = z.object({
  type: z.literal('B2_VALUE_PROPOSITION'),
  summaryLine: z.string().min(10).max(180),
  highlights: z.array(z.string().min(2).max(80)).max(5),
  isInternalOnly: z.boolean().optional(),
});

export const b3RoleMediaSchema = z.object({
  type: z.literal('B3_ROLE_MEDIA'),
  items: z.array(
    z.object({
      id: z.string(),
      url: z.string().url(),
      thumbnailUrl: z.string().url().optional(),
      role: z.enum([
        'cover',
        'environment',
        'detail',
        'in_use',
        'social_proof',
        'video_tour',
        'internal_document',
      ]),
      altText: z.string(),
      displayOrder: z.number().int(),
      isInternalOnly: z.boolean().optional(),
    })
  ),
  isInternalOnly: z.boolean().optional(),
});

export const b4SpecificationsSchema = z.object({
  type: z.literal('B4_TYPED_SPECIFICATIONS'),
  archetypeId: z.string(),
  specs: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      value: z.union([z.string(), z.number(), z.boolean()]),
      unit: z.string().optional(),
      isInternalOnly: z.boolean().optional(),
    })
  ),
  isInternalOnly: z.boolean().optional(),
});

export const b5InclusionsExclusionsSchema = z.object({
  type: z.literal('B5_INCLUSIONS_EXCLUSIONS'),
  items: z.array(
    z.object({
      label: z.string().min(1),
      isIncluded: z.boolean(),
      notes: z.string().optional(),
    })
  ),
  isInternalOnly: z.boolean().optional(),
});

export const b6CommercialConditionsSchema = z.object({
  type: z.literal('B6_COMMERCIAL_CONDITIONS'),
  paymentMethods: z.array(z.string()),
  maxInstallments: z.number().int().nonnegative().optional(),
  installmentInterestFree: z.boolean().optional(),
  depositRequiredCents: z.number().int().nonnegative().optional(),
  leadTimeDays: z.number().int().nonnegative().optional(),
  warrantyPeriodDays: z.number().int().nonnegative().optional(),
  fulfillmentType: z.enum(['shipping', 'pickup', 'on_site', 'digital_instant']),
  isInternalOnly: z.boolean().optional(),
});

export const b7PoliciesSchema = z.object({
  type: z.literal('B7_POLICIES'),
  cancellationPolicy: z.string().min(5),
  refundPolicy: z.string().min(5),
  returnPolicy: z.string().optional(),
  noShowPolicy: z.string().optional(),
  lateFeePercent: z.number().nonnegative().optional(),
  isInternalOnly: z.boolean().optional(),
});

export const b11SeoSchema = z.object({
  type: z.literal('B11_SEO'),
  slug: z.string().min(3),
  metaTitle: z.string().min(5).max(70),
  metaDescription: z.string().min(10).max(160),
  canonicalUrl: z.string().url().optional(),
  keywords: z.array(z.string()),
  isInternalOnly: z.boolean().optional(),
});
