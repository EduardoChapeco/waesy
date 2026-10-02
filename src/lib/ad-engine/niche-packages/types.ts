/**
 * types.ts — Contrato Canônico de Pacote de Nicho (G10–G18)
 * 
 * Regra P10/R10: Nicho é DADO, nunca código.
 * Cada nicho é um pacote declarativo autocontido com terminologia,
 * taxonomia, arquétipos autorizados, seções, fiscal, documentos e SLAs.
 */

import { z } from 'zod';

export type CanonicalArchetypeId =
  | 'A01' // Produto Simples com Estoque
  | 'A02' // Produto com Variações
  | 'A03' // Produto Composto / Kit / Combo
  | 'A04' // Produto com Adicionais e Extras
  | 'A05' // Produto Digital
  | 'A06' // Assinatura / Plano / Clube
  | 'A07' // Pacote / Bundle de Serviços
  | 'A08' // Serviço com Agendamento
  | 'A09' // Serviço por Orçamento
  | 'A10' // Locação de Curta Duração
  | 'A11' // Locação de Longa Duração / Contrato
  | 'A12' // Venda de Alto Valor com Documentação
  | 'A13' // Ingresso / Evento
  | 'A14' // Varejo de Consumo (Peso/Volume/Perecível)
  | 'A15'; // Serviço Avulso / Taxa / Processo

export type NichePackageId =
  | 'turismo'
  | 'varejo'
  | 'mercado'
  | 'servicos'
  | 'imoveis'
  | 'veiculos'
  | 'digital'
  | 'beleza_estetica'
  | 'saude_clinica'
  | 'locacao_equipamentos'
  | 'eventos';


export type ArchetypePermission = 'enabled' | 'optional' | 'prohibited';

export interface TerminologyConfig {
  entitySingular: string;
  entityPlural: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  pricingLabel: string;
  unitLabel: string;
  documentLabel: string;
  operatorRoleLabel: string;
  customerRoleLabel: string;
}

export interface TaxonomyAttributeDefinition {
  key: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'currency' | 'date';
  unit?: string;
  options?: Array<{ value: string; label: string }>;
  isFilterable: boolean;
  isSearchable: boolean;
  isRequired: boolean;
  isInternalOnly?: boolean;
  appliesToArchetypes: CanonicalArchetypeId[];
}

export interface NicheDetailSection {
  id: string;
  label: string;
  order: number;
  isRequired: boolean;
  isInternalOnly?: boolean;
}

export interface FiscalRegulatoryConfig {
  taxRegimeRecommendation: 'simples' | 'presumido' | 'real' | 'any';
  requiresNcm: boolean;
  requiresCnae: boolean;
  primaryCnaeCode?: string;
  defaultTaxRatePercent?: number;
  regulatoryBody?: string; // ex: Cadastur, CRECI, CRM, MAPA
  mandatoryLegalDisclaimers: string[];
  minimumAge?: number;
  requiresKycOrNda?: boolean;
}

export interface GeneratedDocumentConfig {
  type: 'voucher' | 'contract' | 'quote' | 'invoice' | 'service_order' | 'term';
  title: string;
  templateCode: string;
  requiresSignature: boolean;
  validityDaysDefault?: number;
}

export interface NicheSlaConfig {
  confirmationTimeoutHours: number;
  dispatchTimeoutHours?: number;
  responseTimeoutMinutes: number;
  cancellationNoticeHours: number;
}

export interface StatusTransitionRule {
  fromStatus: string;
  toStatus: string;
  allowedRoles: string[];
  actionName: string;
}

export interface UiSemanticsConfig {
  heroPlaceholder: string;
  searchPlaceholder: string;
  emptyCatalogMessage: string;
  orderSuccessMessage: string;
  leadCapturePrompt: string;
}

export interface NichePackage {
  id: NichePackageId;
  name: string;
  description: string;
  version: string;
  allowedArchetypes: Record<CanonicalArchetypeId, ArchetypePermission>;
  defaultArchetype: CanonicalArchetypeId;
  defaultSellingUnit: string;
  allowedSellingUnits: string[];
  terminology: TerminologyConfig;
  attributes: TaxonomyAttributeDefinition[];
  detailSections: NicheDetailSection[];
  fiscalAndRegulatory: FiscalRegulatoryConfig;
  documents: GeneratedDocumentConfig[];
  slas: NicheSlaConfig;
  statusGlossary: Record<string, string>;
  statusTransitions: StatusTransitionRule[];
  uiSemantics: UiSemanticsConfig;
}

// ── ZOD SCHEMAS PARA VALIDAÇÃO ESTRITA EM RUNTIME (G10) ──

export const terminologySchema = z.object({
  entitySingular: z.string().min(1),
  entityPlural: z.string().min(1),
  primaryActionLabel: z.string().min(1),
  secondaryActionLabel: z.string().optional(),
  pricingLabel: z.string().min(1),
  unitLabel: z.string().min(1),
  documentLabel: z.string().min(1),
  operatorRoleLabel: z.string().min(1),
  customerRoleLabel: z.string().min(1),
});

export const taxonomyAttributeSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(['string', 'number', 'boolean', 'select', 'currency', 'date']),
  unit: z.string().optional(),
  options: z.array(z.object({ value: z.string(), label: z.string() })).optional(),
  isFilterable: z.boolean(),
  isSearchable: z.boolean(),
  isRequired: z.boolean(),
  isInternalOnly: z.boolean().optional(),
  appliesToArchetypes: z.array(z.string()),
});

export const nicheDetailSectionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  order: z.number().int().positive(),
  isRequired: z.boolean(),
  isInternalOnly: z.boolean().optional(),
});

export const fiscalRegulatorySchema = z.object({
  taxRegimeRecommendation: z.enum(['simples', 'presumido', 'real', 'any']),
  requiresNcm: z.boolean(),
  requiresCnae: z.boolean(),
  primaryCnaeCode: z.string().optional(),
  defaultTaxRatePercent: z.number().nonnegative().optional(),
  regulatoryBody: z.string().optional(),
  mandatoryLegalDisclaimers: z.array(z.string()),
  minimumAge: z.number().int().nonnegative().optional(),
  requiresKycOrNda: z.boolean().optional(),
});

export const generatedDocumentSchema = z.object({
  type: z.enum(['voucher', 'contract', 'quote', 'invoice', 'service_order', 'term']),
  title: z.string().min(1),
  templateCode: z.string().min(1),
  requiresSignature: z.boolean(),
  validityDaysDefault: z.number().int().positive().optional(),
});

export const nicheSlaSchema = z.object({
  confirmationTimeoutHours: z.number().nonnegative(),
  dispatchTimeoutHours: z.number().nonnegative().optional(),
  responseTimeoutMinutes: z.number().positive(),
  cancellationNoticeHours: z.number().nonnegative(),
});

export const statusTransitionRuleSchema = z.object({
  fromStatus: z.string().min(1),
  toStatus: z.string().min(1),
  allowedRoles: z.array(z.string()),
  actionName: z.string().min(1),
});

export const uiSemanticsSchema = z.object({
  heroPlaceholder: z.string().min(1),
  searchPlaceholder: z.string().min(1),
  emptyCatalogMessage: z.string().min(1),
  orderSuccessMessage: z.string().min(1),
  leadCapturePrompt: z.string().min(1),
});

export const nichePackageSchema = z.object({
  id: z.enum([
    'turismo',
    'varejo',
    'mercado',
    'servicos',
    'imoveis',
    'veiculos',
    'digital',
    'beleza_estetica',
    'saude_clinica',
    'locacao_equipamentos',
    'eventos',
  ]),
  name: z.string().min(1),
  description: z.string().min(1),
  version: z.string().min(1),
  allowedArchetypes: z.record(z.string(), z.enum(['enabled', 'optional', 'prohibited'])),
  defaultArchetype: z.string(),
  defaultSellingUnit: z.string().min(1),
  allowedSellingUnits: z.array(z.string().min(1)),
  terminology: terminologySchema,
  attributes: z.array(taxonomyAttributeSchema),
  detailSections: z.array(nicheDetailSectionSchema),
  fiscalAndRegulatory: fiscalRegulatorySchema,
  documents: z.array(generatedDocumentSchema),
  slas: nicheSlaSchema,
  statusGlossary: z.record(z.string(), z.string()),
  statusTransitions: z.array(statusTransitionRuleSchema),
  uiSemantics: uiSemanticsSchema,
});
