import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { assertStoreAccess, getServerIdentity } from "@/lib/server-access";

const BucketSchema = z.enum([
  "receipts",
  "legal-documents",
  "identity-vault",
  "cms-media",
  "product-media",
  "classified-media",
  "brand-assets",
  "store-assets",
  "post-media",
]);

const SourceKindSchema = z.enum(["upload", "onboarding", "crawler", "financial", "catalog", "brand", "chat", "system"]);

async function resolveAuthorizedStore(storeId?: string) {
  const identity = await getServerIdentity();
  const resolvedStoreId = storeId || identity.store_id;
  if (!resolvedStoreId) throw new Error("Loja ativa obrigatória para operar documentos.");
  assertStoreAccess({ ...identity, store_id: resolvedStoreId });
  return { identity, storeId: resolvedStoreId };
}

export const createDocumentArtifact = createServerFn({ method: "POST" })
  .validator(z.object({
    storeId: z.string().uuid().optional(),
    bucketId: BucketSchema,
    storagePath: z.string().min(3).max(1024),
    fileName: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(150),
    fileSizeBytes: z.number().int().nonnegative().optional(),
    sha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
    sourceKind: SourceKindSchema.default("upload"),
    provenance: z.record(z.string(), z.unknown()).default({}),
  }))
  .handler(async ({ data }) => {
    const { identity, storeId } = await resolveAuthorizedStore(data.storeId);
    const db = getServerClient();
    const { data: artifact, error } = await db
      .from("document_artifacts")
      .upsert({
        store_id: storeId,
        uploaded_by: identity.id,
        bucket_id: data.bucketId,
        storage_path: data.storagePath,
        file_name: data.fileName,
        mime_type: data.mimeType,
        file_size_bytes: data.fileSizeBytes,
        sha256: data.sha256,
        source_kind: data.sourceKind,
        provenance: data.provenance,
        extraction_status: "pending",
      }, { onConflict: "store_id,bucket_id,storage_path" })
      .select("*")
      .single();
    if (error) throw new Error(`Não foi possível registrar o arquivo: ${error.message}`);
    return artifact;
  });

export const updateDocumentExtraction = createServerFn({ method: "POST" })
  .validator(z.object({
    artifactId: z.string().uuid(),
    status: z.enum(["queued", "processing", "completed", "needs_review", "failed", "not_applicable"]),
    engine: z.string().max(120).optional(),
    version: z.string().max(80).optional(),
    extractedText: z.string().optional(),
    structuredData: z.record(z.string(), z.unknown()).default({}),
    confidence: z.number().min(0).max(1).nullable().optional(),
    provenance: z.record(z.string(), z.unknown()).default({}),
    errorCode: z.string().max(80).optional(),
    errorMessage: z.string().max(1000).optional(),
  }))
  .handler(async ({ data }) => {
    const db = getServerClient();
    const { data: current, error: readError } = await db
      .from("document_artifacts")
      .select("store_id")
      .eq("id", data.artifactId)
      .single();
    if (readError || !current) throw new Error("Artefato documental não encontrado.");
    await resolveAuthorizedStore(current.store_id);

    const { data: artifact, error } = await db
      .from("document_artifacts")
      .update({
        extraction_status: data.status,
        extraction_engine: data.engine,
        extraction_version: data.version,
        extracted_text: data.extractedText,
        structured_data: data.structuredData,
        confidence: data.confidence,
        provenance: data.provenance,
        error_code: data.errorCode,
        error_message: data.errorMessage,
        reviewed_at: data.status === "needs_review" ? null : undefined,
      })
      .eq("id", data.artifactId)
      .select("*")
      .single();
    if (error) throw new Error(`Não foi possível salvar a extração: ${error.message}`);
    return artifact;
  });

export const linkDocumentArtifact = createServerFn({ method: "POST" })
  .validator(z.object({
    artifactId: z.string().uuid(),
    storeId: z.string().uuid().optional(),
    entityType: z.string().min(2).max(80),
    entityId: z.string().uuid().optional(),
    relation: z.string().min(2).max(80).default("attachment"),
    metadata: z.record(z.string(), z.unknown()).default({}),
  }))
  .handler(async ({ data }) => {
    const db = getServerClient();
    const { data: artifact, error: artifactError } = await db
      .from("document_artifacts")
      .select("store_id")
      .eq("id", data.artifactId)
      .single();
    if (artifactError || !artifact) throw new Error("Artefato documental não encontrado.");
    const { identity, storeId } = await resolveAuthorizedStore(data.storeId || artifact.store_id);
    if (storeId !== artifact.store_id) throw new Error("Artefato não pertence à loja ativa.");

    const { data: link, error } = await db
      .from("document_artifact_links")
      .upsert({
        artifact_id: data.artifactId,
        store_id: storeId,
        entity_type: data.entityType,
        entity_id: data.entityId,
        relation: data.relation,
        metadata: data.metadata,
        created_by: identity.id,
      }, { onConflict: "artifact_id,entity_type,entity_id,relation" })
      .select("*")
      .single();
    if (error) throw new Error(`Não foi possível vincular o documento: ${error.message}`);
    return link;
  });
