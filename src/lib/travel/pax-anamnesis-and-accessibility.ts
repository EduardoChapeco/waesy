/**
 * pax-anamnesis-and-accessibility.ts — Modelos e Regras de Negócio para Acessibilidade PCD,
 * Anamnese de Viagem e Blindagem de Documentos (Zero-Trust Anti-Fraude)
 * NORMAS: AGENTS.md (B.1 a B.41), Resolução ANAC nº 280/2013, IATA Passenger Accessibility Standards
 */

import { z } from "zod";

// Códigos IATA padronizados para passageiros com necessidade de assistência especial (PNAE)
export const IATA_PCD_ASSISTANCE_CODES = [
  "WCHR", // Cadeira de rodas para distâncias longas (consegue subir degraus e caminhar na cabine)
  "WCHS", // Cadeira de rodas até a porta da aeronave (não sobe degraus, mas caminha na cabine)
  "WCHC", // Cadeira de rodas até o assento (totalmente imóvel, necessita de auxílio para sentar)
  "BLND", // Passageiro cego ou com baixa visão (com ou sem cão-guia)
  "DEAF", // Passageiro surdo ou com deficiência auditiva severa
  "DPNA", // Passageiro com deficiência intelectual, cognitiva ou psicossocial
  "MEDIF", // Medical Information Form (requer autorização prévia da junta médica da Cia aérea)
  "FREMEC", // Frequent Traveller Medical Card (dispensa MEDIF para viagens repetidas)
  "OXYG", // Necessidade de oxigênio suplementar a bordo
  "NONE", // Nenhuma necessidade especial declarada
] as const;

export type IataPcdAssistanceCode = (typeof IATA_PCD_ASSISTANCE_CODES)[number];

// Tipos de restrições alimentares universais
export const DIETARY_RESTRICTION_CODES = [
  "standard",
  "gluten_free",
  "lactose_free",
  "diabetic",
  "vegan",
  "vegetarian",
  "kosher",
  "halal",
  "low_sodium",
  "hindu_non_vegetarian",
] as const;

export type DietaryRestrictionCode = (typeof DIETARY_RESTRICTION_CODES)[number];

export type DocumentValidationStatus =
  | "draft"
  | "pending_ocr_validation"
  | "ocr_validated"
  | "agent_homologated"
  | "locked_immutable";

export interface PaxAnamnesisDTO {
  paxId: string;
  tripId: string;
  fullName: string;
  documentType: "cpf" | "passport" | "rg";
  documentNumber: string;
  birthDate: string; // YYYY-MM-DD
  nationality: string;
  pcdAssistanceCodes: IataPcdAssistanceCode[];
  requiresCompanion: boolean;
  medicalClearanceRequired: boolean;
  dietaryRestrictions: DietaryRestrictionCode[];
  allergiesNotes?: string | null;
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  documentStatus: DocumentValidationStatus;
  ocrConfidenceScore?: number | null;
  agentHomologatedBy?: string | null;
  agentHomologatedAt?: string | null;
  appleWalletPassUrl?: string | null;
  googleWalletPassUrl?: string | null;
  updatedAt: string;
}

export const PaxAnamnesisSchema = z.object({
  paxId: z.string().uuid(),
  tripId: z.string().uuid(),
  fullName: z.string().min(3),
  documentType: z.enum(["cpf", "passport", "rg"]),
  documentNumber: z.string().min(5),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  nationality: z.string().default("BRA"),
  pcdAssistanceCodes: z.array(z.enum(IATA_PCD_ASSISTANCE_CODES)).default(["NONE"]),
  requiresCompanion: z.boolean().default(false),
  medicalClearanceRequired: z.boolean().default(false),
  dietaryRestrictions: z.array(z.enum(DIETARY_RESTRICTION_CODES)).default(["standard"]),
  allergiesNotes: z.string().max(1000).optional().nullable(),
  emergencyContact: z.object({
    name: z.string().min(2),
    phone: z.string().min(8),
    relationship: z.string().min(2),
  }),
});

/**
 * Avalia se os dados do passageiro podem ser editados pelo cliente ou se estão blindados.
 * Regra: se status for 'agent_homologated' ou 'locked_immutable', usuários civis NÃO podem alterar.
 * Somente agentes de viagens credenciados podem reabrir a ficha para correção.
 */
export function validatePaxDocumentMutationPermission(params: {
  currentStatus: DocumentValidationStatus;
  isStaffOrAgent: boolean;
}): { allowed: boolean; reason?: string } {
  if (params.isStaffOrAgent) {
    return { allowed: true };
  }

  if (params.currentStatus === "agent_homologated" || params.currentStatus === "locked_immutable") {
    return {
      allowed: false,
      reason:
        "Documentos já homologados e travados pelo agente de viagens. Para correções de dados protegidos, solicite ao seu agente emissor.",
    };
  }

  return { allowed: true };
}

/**
 * Calcula os alertas operacionais de embarque e voo baseados na anamnese do viajante.
 */
export function auditPaxFlightReadiness(anamnesis: PaxAnamnesisDTO): {
  isReadyForIssuance: boolean;
  warnings: string[];
  blockers: string[];
} {
  const warnings: string[] = [];
  const blockers: string[] = [];

  const hasWheelchair = anamnesis.pcdAssistanceCodes.some((c) => ["WCHR", "WCHS", "WCHC"].includes(c));
  if (hasWheelchair) {
    warnings.push("Notificar Cia aérea com antecedência mínima de 48h para garantir assistência em solo e embarque prioritário (Res. ANAC 280/2013).");
  }

  if (anamnesis.pcdAssistanceCodes.includes("MEDIF") || anamnesis.medicalClearanceRequired) {
    if (anamnesis.documentStatus !== "agent_homologated" && anamnesis.documentStatus !== "locked_immutable") {
      blockers.push("Formulário MEDIF pendente de homologação pelo departamento médico da operadora/Cia aérea.");
    }
  }

  if (anamnesis.documentType === "passport") {
    // Validação mínima de formato para passaporte
    if (anamnesis.documentNumber.length < 6) {
      blockers.push("Número de passaporte inválido para emissão internacional.");
    }
  }

  return {
    isReadyForIssuance: blockers.length === 0,
    warnings,
    blockers,
  };
}
