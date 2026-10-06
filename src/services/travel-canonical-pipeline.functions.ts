import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, requireStaff } from "@/lib/server-access";
import { processOperatorQuoteOcr } from "./travel-operator-ocr.functions";
import { parseOperatorVoucherAI } from "./travel-lifecycle.functions";

const SourceKindSchema = z.enum([
  "operator_quote",
  "reservation_confirmation",
  "payment_receipt",
  "operator_contact",
  "voucher",
  "contract",
  "other",
]);

const DocumentInputSchema = z.object({
  fileBase64: z.string().optional(),
  fileMime: z.string().optional(),
  fileName: z.string().optional(),
  rawText: z.string().optional(),
  sourceKind: SourceKindSchema.default("operator_quote"),
  leadId: z.string().uuid().optional().nullable(),
}).refine((data) => Boolean(data.fileBase64 || data.rawText?.trim()), {
  message: "Envie um arquivo ou texto para extração.",
});

const ApplyInputSchema = z.object({
  ingestionId: z.string().uuid(),
  leadId: z.string().uuid().optional().nullable(),
  clientName: z.string().trim().min(2).optional(),
  clientPhone: z.string().trim().optional(),
  clientEmail: z.string().email().optional(),
});

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const ingestTravelDocument = createServerFn({ method: "POST" })
  .validator(DocumentInputSchema)
  .handler(async ({ data }) => {
    const identity = await requireStaff();
    const supabase = getServerClient();
    const contentSha256 = await sha256Hex(`${data.fileMime || ""}|${data.fileName || ""}|${data.fileBase64 || data.rawText || ""}`);

    const { data: ingestion, error: insertError } = await supabase
      .from("travel_document_ingestions")
      .insert({
        store_id: identity.store_id,
        lead_id: data.leadId || null,
        source_kind: data.sourceKind,
        file_name: data.fileName || null,
        file_mime: data.fileMime || null,
        content_sha256: contentSha256,
        extraction_status: "processing",
        extraction_provider: "waesy-ai-gateway",
        created_by_profile_id: identity.id,
      })
      .select("id")
      .single();

    if (insertError || !ingestion?.id) {
      throw new Error(`Não foi possível registrar a ingestão do documento: ${insertError?.message || "ID ausente"}`);
    }

    try {
      // Os extratores existentes continuam sendo a única porta de IA; esta camada
      // apenas torna cada resultado persistente, revisável e ligado ao tenant correto.
      const extraction = data.sourceKind === "operator_quote"
        ? await (processOperatorQuoteOcr as any)({
            data: {
              fileBase64: data.fileBase64,
              fileMime: data.fileMime,
              fileName: data.fileName,
              rawText: data.rawText,
            },
          })
        : await (parseOperatorVoucherAI as any)({
            data: {
              fileBase64: data.fileBase64,
              fileMime: data.fileMime,
              fileName: data.fileName,
              rawText: data.rawText,
            },
          });

      const { error: updateError } = await supabase
        .from("travel_document_ingestions")
        .update({
          extraction: extraction.data || extraction.parsed,
          extraction_status: "needs_review",
          review_status: "pending",
          confidence: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ingestion.id)
        .eq("store_id", identity.store_id);

      if (updateError) throw new Error(`OCR extraído, mas não persistido: ${updateError.message}`);

      return {
        success: true,
        ingestionId: ingestion.id,
        requiresReview: true,
        sourceKind: data.sourceKind,
        data: extraction.data || extraction.parsed,
      };
    } catch (error) {
      await supabase
        .from("travel_document_ingestions")
        .update({
          extraction_status: "failed",
          error_message: error instanceof Error ? error.message : "Falha desconhecida no OCR",
          updated_at: new Date().toISOString(),
        })
        .eq("id", ingestion.id)
        .eq("store_id", identity.store_id);
      throw error;
    }
  });

export const listTravelDocumentIngestions = createServerFn({ method: "GET" })
  .validator(z.object({ status: z.string().optional() }).default({}))
  .handler(async ({ data }) => {
    const identity = await requireStaff();
    const supabase = getServerClient();
    let query = supabase
      .from("travel_document_ingestions")
      .select("*")
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (data.status) query = query.eq("extraction_status", data.status);
    const { data: rows, error } = await query;
    if (error) throw new Error(`Erro ao listar documentos OCR: ${error.message}`);
    return rows || [];
  });

export const applyTravelOcrToDraft = createServerFn({ method: "POST" })
  .validator(ApplyInputSchema)
  .handler(async ({ data }) => {
    await requireStaff();
    const supabase = getServerClient();
    const { data: result, error } = await supabase.rpc("apply_travel_ocr_to_draft", {
      p_ingestion_id: data.ingestionId,
      p_lead_id: data.leadId || null,
      p_client_name: data.clientName || null,
      p_client_phone: data.clientPhone || null,
      p_client_email: data.clientEmail || null,
    });
    if (error) throw new Error(`Não foi possível aplicar o OCR ao draft: ${error.message}`);
    return result as {
      success: boolean;
      lead_id: string | null;
      budget_id: string;
      proposal_id: string;
      proposal_token: string;
    };
  });

export const recordTravelProposalAcceptance = createServerFn({ method: "POST" })
  .validator(z.object({
    proposalId: z.string().uuid(),
    publicToken: z.string().min(8),
    snapshotHash: z.string().min(16),
    idempotencyKey: z.string().min(8),
    acceptedByName: z.string().trim().min(2).optional(),
    acceptedByEmail: z.string().email().optional(),
    termsVersion: z.string().default("travel-v1"),
  }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const { data: result, error } = await supabase.rpc("record_travel_proposal_acceptance", {
      p_proposal_id: data.proposalId,
      p_public_token: data.publicToken,
      p_snapshot_hash: data.snapshotHash,
      p_idempotency_key: data.idempotencyKey,
      p_accepted_by_name: data.acceptedByName || null,
      p_accepted_by_email: data.acceptedByEmail || null,
      p_terms_version: data.termsVersion,
    });
    if (error) throw new Error(`Aceite não registrado: ${error.message}`);
    return result;
  });

export const convertAcceptedTravelProposal = createServerFn({ method: "POST" })
  .validator(z.object({
    proposalId: z.string().uuid(),
    idempotencyKey: z.string().min(8),
  }))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const supabase = getServerClient();
    const { data: result, error } = await supabase.rpc("convert_accepted_travel_proposal", {
      p_proposal_id: data.proposalId,
      p_idempotency_key: `${identity.store_id}:${data.idempotencyKey}`,
    });
    if (error) throw new Error(`Conversão em viagem não concluída: ${error.message}`);
    return result;
  });
