/**
 * travel-pax-anamnesis.functions.ts — Server Functions TanStack Start para Anamnese PCD e Blindagem de Documentos
 * NORMAS: AGENTS.md (B.1 a B.41), TanStack Start Server Functions
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, requireStaff } from "@/lib/server-access";
import {
  PaxAnamnesisSchema,
  validatePaxDocumentMutationPermission,
  auditPaxFlightReadiness,
  type PaxAnamnesisDTO,
  type DocumentValidationStatus,
} from "@/lib/travel/pax-anamnesis-and-accessibility";

export const UpdatePaxAnamnesisInputSchema = PaxAnamnesisSchema;

export const updatePaxAccessibilityAndAnamnesis = createServerFn({ method: "POST" })
  .validator(UpdatePaxAnamnesisInputSchema)
  .handler(async ({ data }): Promise<{ success: boolean; message: string }> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    if (!identity.id) {
      throw new Error("Acesso não autorizado.");
    }

    // Busca o estado atual do passageiro
    const { data: currentPax, error: fetchErr } = await supabase
      .from("corporate_travelers")
      .select("id, full_name, metadata")
      .eq("id", data.paxId)
      .maybeSingle();

    if (fetchErr || !currentPax) {
      throw new Error("Passageiro não encontrado.");
    }

    const currentMetadata = (currentPax.metadata as Record<string, unknown>) || {};
    const currentDocStatus = (currentMetadata.document_status as DocumentValidationStatus) || "draft";

    // Verifica se o usuário atual é staff/agente
    const isStaff = identity.role === "admin" || identity.role === "staff" || identity.role === "collaborator";

    // Checa trava de imutabilidade
    const permission = validatePaxDocumentMutationPermission({
      currentStatus: currentDocStatus,
      isStaffOrAgent: isStaff,
    });

    if (!permission.allowed) {
      throw new Error(permission.reason || "Alteração não permitida em documentos já blindados.");
    }

    const updatedMetadata = {
      ...currentMetadata,
      pcd_assistance_codes: data.pcdAssistanceCodes,
      requires_companion: data.requiresCompanion,
      medical_clearance_required: data.medicalClearanceRequired,
      dietary_restrictions: data.dietaryRestrictions,
      allergies_notes: data.allergiesNotes || null,
      emergency_contact: data.emergencyContact,
      nationality: data.nationality,
      document_type: data.documentType,
      document_number: data.documentNumber,
      birth_date: data.birthDate,
      trip_id: data.tripId,
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await supabase
      .from("corporate_travelers")
      .update({
        full_name: data.fullName,
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.paxId);

    if (updateErr) {
      throw new Error("Erro ao atualizar anamnese do passageiro: " + updateErr.message);
    }

    return {
      success: true,
      message: "Anamnese e dados de acessibilidade atualizados com sucesso.",
    };
  });

export const HomologatePaxDocumentsByAgentInputSchema = z.object({
  paxId: z.string().uuid(),
  tripId: z.string().uuid(),
  documentStatus: z.enum(["agent_homologated", "locked_immutable"]),
  ocrConfidenceScore: z.number().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const homologatePaxDocumentsByAgent = createServerFn({ method: "POST" })
  .validator(HomologatePaxDocumentsByAgentInputSchema)
  .handler(async ({ data }): Promise<{ success: boolean; status: DocumentValidationStatus }> => {
    const identity = await requireStaff();
    const supabase = getServerClient();

    const { data: currentPax, error: fetchErr } = await supabase
      .from("corporate_travelers")
      .select("id, full_name, metadata")
      .eq("id", data.paxId)
      .maybeSingle();

    if (fetchErr || !currentPax) {
      throw new Error("Passageiro não encontrado para homologação.");
    }

    const currentMetadata = (currentPax.metadata as Record<string, unknown>) || {};

    const updatedMetadata = {
      ...currentMetadata,
      document_status: data.documentStatus,
      ocr_confidence_score: data.ocrConfidenceScore ?? 99.5,
      agent_homologated_by: identity.id,
      agent_homologated_at: new Date().toISOString(),
      homologation_notes: data.notes || null,
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await supabase
      .from("corporate_travelers")
      .update({
        metadata: updatedMetadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.paxId);

    if (updateErr) {
      throw new Error("Erro ao homologar documentos do passageiro: " + updateErr.message);
    }

    return {
      success: true,
      status: data.documentStatus,
    };
  });
