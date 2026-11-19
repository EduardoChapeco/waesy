import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createHash } from "node:crypto";
import { getServerClient } from "@/lib/supabase";
import { enforceRateLimit } from "@/lib/rate-limiter";
import { BuilderAssetRefSchema, STUDIO_UPLOAD_RIGHTS_ATTESTATION_VERSION, type BuilderAssetRef } from "@/lib/builder/asset-contract";
import { classifyChatFile, extensionForMime, resolveNormalizedMimeType } from "@/lib/chat-media-attachment";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
  "image/bmp",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
  "video/x-msvideo",
  "video/3gpp",
  "audio/mpeg",
  "audio/mp3",
  "audio/ogg",
  "audio/opus",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "text/csv",
  "text/rtf",
  "application/rtf",
  "application/json",
  "application/xml",
  "text/xml",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
  "application/vnd.rar",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/octet-stream",
]);

const PRIVATE_SIGNED_BUCKETS = new Set([
  "payment-proofs",
  "rma-proofs",
  "legal-documents",
  "receipts",
  "order-receipts",
  "identity-vault",
  "copilot-uploads",
]);

const ALLOWED_BFF_BUCKETS = new Set([
  "product-media",
  "cms-media",
  "payment-proofs",
  "rma-proofs",
  "classifieds",
  "classified-media",
  "covers",
  "avatars",
  "banners",
  "home-banners",
  "home-categories",
  "post-media",
  "public_media",
  "legal-documents",
  "receipts",
  "order-receipts",
  "identity-vault",
  "store-assets",
  "brand-assets",
  "destination-media",
  "recipes",
  "social",
  "copilot-uploads",
]);

const MAX_INLINE_UPLOAD_BYTES = 20 * 1024 * 1024;

function decodeInlineUpload(base64Data: string): Buffer {
  const base64Content = base64Data.includes(",") ? base64Data.split(",", 2)[1] : base64Data;
  if (!base64Content || !/^[A-Za-z0-9+/\s]+={0,2}$/.test(base64Content)) {
    throw new Error("Conteúdo Base64 inválido.");
  }
  const normalized = base64Content.replace(/\s/g, "");
  const estimatedBytes =
    Math.floor((normalized.length * 3) / 4) -
    (normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0);
  if (estimatedBytes <= 0 || estimatedBytes > MAX_INLINE_UPLOAD_BYTES) {
    throw new Error("Arquivo excede o limite de 20 MB para upload BFF.");
  }
  return Buffer.from(normalized, "base64");
}

function assertAllowedBffBucket(bucket: string) {
  if (!ALLOWED_BFF_BUCKETS.has(bucket)) {
    throw new Error("Bucket de upload não permitido.");
  }
}

function assertSafeFolder(folder: string) {
  if (!/^[a-zA-Z0-9/_-]{1,120}$/.test(folder) || folder.includes("..")) {
    throw new Error("Pasta de upload inválida.");
  }
}

function validateMimeType(contentType: string) {
  const cleanType = contentType.toLowerCase().split(";")[0].trim();
  if (!ALLOWED_MIME_TYPES.has(cleanType)) {
    throw new Error(
      `Tipo de arquivo não permitido (${contentType}). Aceitos: imagens, GIFs, vídeos, áudios, PDFs, planilhas, apresentações, documentos e arquivos compactados.`,
    );
  }
}

function inspectImageDimensions(buffer: Buffer, contentType: string): { width: number | null; height: number | null } {
  const type = contentType.toLowerCase().split(";")[0].trim();
  if (type === "image/png" && buffer.length >= 24 && buffer.readUInt32BE(0) === 0x89504e47) return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  if (type === "image/gif" && buffer.length >= 10 && buffer.toString("ascii", 0, 3) === "GIF") return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  if (type === "image/jpeg" && buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) { offset++; continue; }
      const marker = buffer[offset + 1];
      const segmentLength = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      if (segmentLength < 2) break;
      offset += 2 + segmentLength;
    }
  }
  return { width: null, height: null };
}

/**
 * Retorna uma URL assinada para que o cliente faça o upload diretamente para o Supabase Storage,
 * aliviando o servidor (BFF) de processar buffers/base64 de grandes arquivos (LGPD/Performance).
 * API_CONTRACTS.md - 8.1 Solicitar URL de upload
 */
export const getSignedUploadUrl = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fileName: z.string().min(1),
      bucket: z.enum([
        "product-media",
        "cms-media",
        "payment-proofs",
        "rma-proofs",
        "classifieds",
        "classified-media",
        "covers",
        "avatars",
        "banners",
        "home-banners",
        "home-categories",
        "post-media",
        "public_media",
        "legal-documents",
        "receipts",
        "order-receipts",
        "identity-vault",
        "store-assets",
        "brand-assets",
        "destination-media",
        "recipes",
        "social",
        "copilot-uploads",
      ]),
      contentType: z.string(),
    }),
  )
  .handler(async ({ data: { fileName, bucket, contentType } }) => {
    try {
      const normalizedType = resolveNormalizedMimeType(contentType, fileName);
      validateMimeType(normalizedType);

      const supabase = getServerClient();
      const ext = extensionForMime(normalizedType, fileName);

      const { getServerIdentity } = await import("@/lib/server-access");
      const { store_id, id: userId, role } = await getServerIdentity();
      if (!userId) throw new Error("Faça login para enviar arquivos.");

      enforceRateLimit(userId, "media_upload");

      const privateOrStaffBuckets = new Set([
        "payment-proofs",
        "rma-proofs",
        "legal-documents",
        "receipts",
        "order-receipts",
        "identity-vault",
        "cms-media",
        "banners",
        "home-banners",
        "home-categories",
        "store-assets",
        "brand-assets",
        "destination-media",
        "recipes",
      ]);
      const isStaffUser = role !== "customer" && Boolean(store_id);
      if (privateOrStaffBuckets.has(bucket) && !isStaffUser && role !== "platform_admin") {
        throw new Error("Bucket restrito à equipe da loja.");
      }

      const folder = isStaffUser && store_id ? store_id : userId;
      const uniqueName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${ext}`;

      // Tenta criar a URL assinada
      let result = await supabase.storage.from(bucket).createSignedUploadUrl(uniqueName);

      if (result.error || !result.data) {
        throw new Error(`Erro ao gerar URL de upload: ${result.error?.message}`);
      }

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(uniqueName);

      return {
        status: "success" as const,
        signedUrl: result.data.signedUrl,
        token: result.data.token,
        path: result.data.path,
        publicUrl: ![
          "payment-proofs",
          "rma-proofs",
          "legal-documents",
          "receipts",
          "identity-vault",
        ].includes(bucket)
          ? urlData.publicUrl
          : null,
      };
    } catch (e: unknown) {
      console.error("[storage.functions] getSignedUploadUrl error:", e);
      throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao gerar URL");
    }
  });

/**
 * Gera uma URL assinada de upload para o bucket `post-media` (mídia do Mural/Feed).
 *
 * Fluxo:
 * 1. Cliente chama este endpoint com metadata do arquivo.
 * 2. Servidor valida sessão, gera signed URL e retorna {signedUrl, publicUrl}.
 * 3. Cliente faz PUT direto para signedUrl (sem passar dados pelo servidor).
 * 4. Cliente salva publicUrl no post via createPost.
 *
 * AGENTS.md: Upload real — proibido hardcode ou URL de terceiros como placeholder.
 */
export const getPostMediaSignedUrl = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fileName: z.string().min(1).max(256),
      contentType: z.string().min(1).max(100),
    }),
  )
  .handler(async ({ data: { fileName, contentType } }) => {
    validateMimeType(contentType);

    const supabase = getServerClient();
    const { getServerIdentity } = await import("@/lib/server-access");
    const identity = await getServerIdentity();

    if (!identity.id) throw new Error("Não autorizado — faça login para enviar mídia.");

    enforceRateLimit(identity.id, "media_upload");

    const BUCKET = "post-media";
    const ext = fileName.split(".").pop() || contentType.split("/")[1] || "bin";
    const uniqueName = `${identity.id}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

    let result = await supabase.storage.from(BUCKET).createSignedUploadUrl(uniqueName);

    if (result.error || !result.data) {
      throw new Error(
        `Bucket de mídia não provisionado ou indisponível: ${result.error?.message || "URL ausente"}`,
      );
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(uniqueName);

    return {
      signedUrl: result.data.signedUrl,
      path: result.data.path,
      publicUrl: urlData.publicUrl,
    };
  });

/**
 * Upload direto de mídia de lojas e espaços (logos, capas e banners).
 */
export const uploadStoreMedia = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fileName: z.string().min(1),
      fileType: z.string().min(1),
      base64Data: z.string().min(1),
      bucket: z.string().default("cms-media"),
    }),
  )
  .handler(async ({ data: { fileName, fileType, base64Data, bucket } }) => {
    try {
      validateMimeType(fileType);
      assertAllowedBffBucket(bucket);

      const { requireStaff } = await import("@/lib/server-access");
      const identity = await requireStaff();
      enforceRateLimit(identity.id, "media_upload");

      const supabase = getServerClient();
      const ext = fileName.split(".").pop() || "png";
      const folder = identity.store_id;
      const uniqueName = `stores/${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

      // Extrai os bytes a partir da string base64
      const buffer = decodeInlineUpload(base64Data);

      const { error: uploadError } = await supabase.storage.from(bucket).upload(uniqueName, buffer, {
        contentType: fileType,
        upsert: true,
      });

      if (uploadError) {
        throw new Error(`Erro ao fazer upload da mídia: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(uniqueName);
      let resolvedUrl = publicUrlData.publicUrl;
      if (PRIVATE_SIGNED_BUCKETS.has(bucket)) {
        const { data: signedData } = await supabase.storage
          .from(bucket)
          .createSignedUrl(uniqueName, 60 * 60 * 6);
        if (signedData?.signedUrl) {
          resolvedUrl = signedData.signedUrl;
        }
      }

      return {
        url: resolvedUrl,
        path: uniqueName,
        bucket,
      };
    } catch (e: any) {
      console.error("[storage] uploadStoreMedia error:", e);
      throw new Error(e.message || "Erro no upload");
    }
  });

/**
 * Upload direto de fotos e vídeos do Mural a partir de arquivo local (Base64 / File Reader)
 */
export const uploadPostMedia = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fileName: z.string().min(1),
      fileType: z.string().min(1),
      base64Data: z.string().min(1),
    }),
  )
  .handler(async ({ data: { fileName, fileType, base64Data } }) => {
    try {
      validateMimeType(fileType);
      const { getServerIdentity } = await import("@/lib/server-access");
      const identity = await getServerIdentity();
      if (!identity.id) throw new Error("Faça login para enviar fotos ou vídeos.");

      const supabase = getServerClient();
      const ext = fileName.split(".").pop() || "jpg";
      const uniqueName = `${identity.id}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const bucket = "post-media";

      const buffer = decodeInlineUpload(base64Data);

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(uniqueName, buffer, {
          contentType: fileType,
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Erro ao salvar mídia: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(uniqueName);

      return {
        url: publicUrlData.publicUrl,
        path: uniqueName,
      };
    } catch (e: any) {
      console.error("[storage] uploadPostMedia error:", e);
      throw new Error(e.message || "Erro no upload do arquivo.");
    }
  });

/**
 * Upload autenticado de comprovante financeiro (payment-proofs) ou memória de grupo (post-media)
 * validando vínculo do usuário com a viagem no servidor.
 */
export const uploadTravelerTripAttachment = createServerFn({ method: "POST" })
  .validator(
    z.object({
      tripId: z.string().uuid("ID de viagem inválido"),
      kind: z.enum(["receipt", "group_memory"]),
      fileName: z.string().min(1).max(256),
      fileType: z.string().min(1).max(120),
      base64Data: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const { tripId, kind, fileName, fileType, base64Data } = data;
    validateMimeType(fileType);

    const { getServerIdentity } = await import("@/lib/server-access");
    const identity = await getServerIdentity();
    if (!identity?.id) {
      throw new Error("Faça login para enviar anexos nesta viagem.");
    }

    enforceRateLimit(identity.id, "media_upload");
    const supabase = getServerClient();

    const { data: trip, error: tripErr } = await supabase
      .from("tourism_trips")
      .select("id, store_id, customer_id, client_email, client_document")
      .eq("id", tripId)
      .maybeSingle();

    if (tripErr || !trip) {
      throw new Error("Viagem não encontrada.");
    }

    const isStaff =
      identity.role === "platform_admin" ||
      (identity.role !== "customer" && Boolean(identity.store_id) && identity.store_id === trip.store_id);

    if (!isStaff) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("cpf")
        .eq("id", identity.id)
        .maybeSingle();
      const userEmail = String(identity.email || "").trim().toLowerCase();
      const rawUserCpf = String(profile?.cpf || "").replace(/\D/g, "");
      const userCpf = rawUserCpf.length === 11 && !/^(\d)\1{10}$/.test(rawUserCpf) ? rawUserCpf : "";
      const rawTripCpf = String(trip.client_document || "").replace(/\D/g, "");
      const tripCpf = rawTripCpf.length === 11 && !/^(\d)\1{10}$/.test(rawTripCpf) ? rawTripCpf : "";

      let isPassenger = false;
      if (userEmail || userCpf) {
        const { data: paxRows } = await supabase
          .from("trip_passengers")
          .select("email, document")
          .eq("trip_id", tripId);
        isPassenger = (paxRows || []).some((p: any) => {
          const pCpf = String(p.document || "").replace(/\D/g, "");
          return (
            (Boolean(userEmail) && String(p.email || "").trim().toLowerCase() === userEmail) ||
            (Boolean(userCpf) && pCpf === userCpf)
          );
        });
      }

      const isOwner =
        trip.customer_id === identity.id ||
        (Boolean(userEmail) && String(trip.client_email || "").trim().toLowerCase() === userEmail) ||
        (Boolean(userCpf) && tripCpf === userCpf);

      if (!isOwner && !isPassenger) {
        throw new Error("Acesso negado para enviar anexos nesta viagem.");
      }
    }

    const bucket = kind === "receipt" ? "payment-proofs" : "post-media";
    const ext = (fileName.split(".").pop() || "bin").replace(/[^a-zA-Z0-9]/g, "").slice(0, 10) || "bin";
    const objectPath = `${trip.store_id}/${tripId}/${identity.id}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const buffer = decodeInlineUpload(base64Data);

    const { error: uploadError } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
      contentType: fileType,
      upsert: true,
    });
    if (uploadError) {
      throw new Error(`Falha ao gravar arquivo no Storage: ${uploadError.message}`);
    }

    let resolvedUrl: string;
    if (PRIVATE_SIGNED_BUCKETS.has(bucket)) {
      const { data: signedData, error: signErr } = await supabase.storage
        .from(bucket)
        .createSignedUrl(objectPath, 60 * 60 * 24);
      if (signErr || !signedData?.signedUrl) {
        throw new Error(`Arquivo salvo, mas falha ao assinar URL: ${signErr?.message || "URL ausente"}`);
      }
      resolvedUrl = signedData.signedUrl;
    } else {
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(objectPath);
      resolvedUrl = publicUrlData.publicUrl;
    }

    return {
      success: true,
      url: resolvedUrl,
      path: objectPath,
      bucket,
    };
  });

/**
 * Upload de mídia para a administração global (Admin Master)
 * Utilizado para ícones customizados, cards de super nichos e banners do app.
 */
export const uploadAdminMedia = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fileName: z.string().min(1),
      fileType: z.string().min(1),
      base64Data: z.string().min(1),
      folder: z.string().default("platform"),
    }),
  )
  .handler(async ({ data: { fileName, fileType, base64Data, folder } }) => {
    try {
      const { requireAdmin } = await import("@/lib/server-access");
      const identity = await requireAdmin();
      if (identity.role !== "platform_admin") {
        throw new Error("Acesso restrito ao Administrador Master Global.");
      }

      const supabase = getServerClient();
      const ext = fileName.split(".").pop() || "png";
      const uniqueName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const bucket = "cms-media";

      const base64Content = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
      const buffer = Buffer.from(base64Content, "base64");

      let { error: uploadError } = await supabase.storage.from(bucket).upload(uniqueName, buffer, {
        contentType: fileType,
        upsert: true,
      });

      if (uploadError) {
        throw new Error(`Bucket de marca não provisionado ou indisponível: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(uniqueName);

      return {
        url: publicUrlData.publicUrl,
        path: uniqueName,
      };
    } catch (e: any) {
      console.error("[storage] uploadAdminMedia error:", e);
      throw new Error(e.message || "Erro no upload do admin.");
    }
  });

/**
 * Upload universal e resiliente de mídia (imagens e vídeos) via Server Function
 * Bypassa RLS client-side através do service_role com validação prévia de bucket/MIME.
 */
export const uploadMediaUniversal = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fileName: z.string().min(1),
      fileType: z.string().min(1),
      base64Data: z.string().min(1),
      bucket: z.string().default("post-media"),
      folder: z.string().default("uploads"),
      studioAsset: z.object({
        usageSlot: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/),
        rightsAttested: z.literal(true),
        altText: z.string().max(500).default(""),
      }).optional(),
    }),
  )
  .handler(async ({ data: { fileName, fileType, base64Data, bucket, folder, studioAsset } }) => {
    let studioUploadPath: string | null = null;
    let studioLedgerId: string | null = null;
    let storageClient: ReturnType<typeof getServerClient> | null = null;
    try {
      assertAllowedBffBucket(bucket);
      assertSafeFolder(folder);
      const normalizedType = resolveNormalizedMimeType(fileType, fileName);
      validateMimeType(normalizedType);
      const { getServerIdentity, requireAdmin } = await import("@/lib/server-access");
      const identity = studioAsset ? await requireAdmin() : await getServerIdentity();
      if (!identity.id) throw new Error("Faça login para enviar mídia.");
      enforceRateLimit(identity.id, "media_upload");

      if (studioAsset && (bucket !== "public_media" || folder !== "builder" || !identity.store_id)) {
        throw new Error("Upload Studio exige administrador de loja, pasta builder e bucket público aprovado.");
      }
      if (studioAsset && !normalizedType.startsWith("image/")) {
        throw new Error("O ledger Studio aceita somente arquivos de imagem.");
      }
      if (studioAsset && !["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"].includes(normalizedType)) {
        throw new Error("Para upload Studio, use JPEG, PNG, WEBP, AVIF ou GIF; SVG não é aceito sem sanitização.");
      }
      const supabase = getServerClient();
      storageClient = supabase;
      const ext = extensionForMime(normalizedType, fileName);
      const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const tenantNamespace = identity.store_id || identity.id;
      const uniqueName = `${tenantNamespace}/${folder}/${cleanName}`;

      const buffer = decodeInlineUpload(base64Data);
      if (studioAsset) {
        const validSignature = normalizedType === "image/png"
          ? buffer.length >= 24 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
          : normalizedType === "image/jpeg"
          ? buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
          : normalizedType === "image/webp"
          ? buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP"
          : normalizedType === "image/gif"
          ? buffer.length >= 10 && ["GIF87a", "GIF89a"].includes(buffer.toString("ascii", 0, 6))
          : buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp" && ["avif", "avis"].includes(buffer.toString("ascii", 8, 12));
        if (!validSignature) throw new Error("O conteúdo do arquivo não corresponde ao tipo de imagem declarado.");
      }
      const sha256 = createHash("sha256").update(buffer).digest("hex");
      const dimensions = normalizedType.startsWith("image/") ? inspectImageDimensions(buffer, normalizedType) : { width: null, height: null };

      let { error: uploadError } = await supabase.storage.from(bucket).upload(uniqueName, buffer, {
        contentType: normalizedType,
        upsert: false,
      });

      if (uploadError) {
        throw new Error(`Erro ao persistir mídia no storage: ${uploadError.message}`);
      }
      if (studioAsset) studioUploadPath = uniqueName;

      let url: string;
      let signedUrl: string | null = null;
      let assetRef: BuilderAssetRef | null = null;
      if (studioAsset) {
        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(uniqueName);
        url = publicUrlData.publicUrl;
        if (!url.startsWith("https://")) throw new Error("O storage não retornou uma URL pública HTTPS para o asset Studio.");
        const rightsAttestedAt = new Date().toISOString();
        const { data: ledgerRow, error: ledgerError } = await supabase
          .from("media_assets")
          .insert({
            store_id: identity.store_id!,
            file_name: fileName,
            file_size: buffer.byteLength,
            mime_type: normalizedType,
            bucket_name: bucket,
            file_path: uniqueName,
            public_url: url,
            uploaded_by: identity.id,
            studio_usage_slot: studioAsset.usageSlot,
            rights_attested_at: rightsAttestedAt,
            rights_attested_by: identity.id,
            rights_attestation_version: STUDIO_UPLOAD_RIGHTS_ATTESTATION_VERSION,
          })
          .select("id")
          .single();
        if (ledgerError || !ledgerRow?.id) {
          throw new Error(`Upload armazenado, mas o registro de proveniência falhou: ${ledgerError?.message || "ledger ausente"}`);
        }
        studioLedgerId = ledgerRow.id;
        assetRef = BuilderAssetRefSchema.parse({
          asset_id: ledgerRow.id,
          provider: "upload",
          source_asset_id: uniqueName,
          source_url: url,
          license_id: "user-rights-attestation",
          usage_slot: studioAsset.usageSlot,
          alt_text: studioAsset.altText || null,
          download_event_status: "not-required",
          byte_size: buffer.byteLength,
          mime_type: normalizedType,
          width: dimensions.width,
          height: dimensions.height,
          provenance_state: "user-provided",
          captured_at: rightsAttestedAt,
          rights_attested_at: rightsAttestedAt,
          rights_attestation_version: STUDIO_UPLOAD_RIGHTS_ATTESTATION_VERSION,
          usage_notes: "Admin da loja declarou possuir direitos/autorização e consentimentos necessários; o Waesy não realiza verificação jurídica independente.",
        });
        studioUploadPath = null;
        studioLedgerId = null;
      } else if (!PRIVATE_SIGNED_BUCKETS.has(bucket)) {
        const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(uniqueName);
        if (!publicUrlData?.publicUrl) {
          throw new Error("Erro ao resolver URL pública da mídia.");
        }
        url = publicUrlData.publicUrl;
      } else {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage.from(bucket).createSignedUrl(uniqueName, 60 * 60);
        if (signedUrlError || !signedUrlData?.signedUrl) throw new Error(`Erro ao gerar URL assinada da mídia: ${signedUrlError?.message || "URL ausente"}`);
        url = signedUrlData.signedUrl;
        signedUrl = signedUrlData.signedUrl;
      }

      const classified = classifyChatFile({ name: fileName, type: normalizedType });

      return {
        id: cleanName,
        url,
        signedUrl,
        assetRef,
        path: uniqueName,
        name: fileName,
        type: classified.outboundMessageType,
        mimeType: normalizedType,
        byteSize: buffer.byteLength,
        sha256,
        width: dimensions.width,
        height: dimensions.height,
        expiresInSeconds: PRIVATE_SIGNED_BUCKETS.has(bucket) ? 60 * 60 : 0,
      };
    } catch (e: any) {
      if (studioLedgerId && storageClient) {
        try {
          await storageClient.from("media_assets").delete().eq("id", studioLedgerId);
        } catch {
          // Failure to clean metadata must not hide the original upload error.
        }
      }
      if (studioUploadPath && storageClient) {
        await storageClient.storage.from(bucket).remove([studioUploadPath]).catch(() => undefined);
      }
      console.error("[storage] uploadMediaUniversal error:", e);
      throw new Error(e.message || "Erro no upload da mídia.");
    }
  });

/**
 * Upload de Assets de Marca da Plataforma (Logo, Favicon, Backgrounds de Login)
 * Requer role de Administrador Master da Plataforma.
 */
export const uploadBrandAsset = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fileName: z.string().min(1),
      fileType: z.string().min(1),
      base64Data: z.string().min(1),
      category: z.enum(["logo", "favicon", "login_desktop", "login_tablet", "login_mobile"]),
    }),
  )
  .handler(async ({ data: { fileName, fileType, base64Data, category } }) => {
    try {
      const { requirePlatformAdmin } = await import("@/lib/server-access");
      await requirePlatformAdmin();

      const supabase = getServerClient();
      const ext = fileName.split(".").pop() || "png";
      const uniqueName = `brand/${category}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const bucket = "cms-media";

      const base64Content = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
      const buffer = Buffer.from(base64Content, "base64");

      const { error: uploadError } = await supabase.storage.from(bucket).upload(uniqueName, buffer, {
        contentType: fileType,
        upsert: true,
      });

      if (uploadError) {
        throw new Error(`Bucket de marca não provisionado ou indisponível: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(uniqueName);

      return {
        url: publicUrlData.publicUrl,
        path: uniqueName,
      };
    } catch (e: any) {
      console.error("[storage] uploadBrandAsset error:", e);
      throw new Error(e.message || "Erro no upload do asset de marca.");
    }
  });

/**
 * Upload direto e infalível de foto de perfil, capa panorâmica ou marca (Base64)
 * com persistência atômica no banco de dados e auto-healing do bucket.
 */
export const uploadProfileMediaDirect = createServerFn({ method: "POST" })
  .validator(
    z.object({
      base64Data: z.string().min(1),
      fileName: z.string().min(1),
      fileType: z.string().default("image/png"),
      target: z.enum(["avatar", "cover", "creator_avatar", "creator_cover", "biolink_banner"]),
    }),
  )
  .handler(async ({ data: { base64Data, fileName, fileType, target } }) => {
    try {
      const { getServerIdentity } = await import("@/lib/server-access");
      const identity = await getServerIdentity();
      if (!identity.id) throw new Error("Faça login para atualizar a mídia do seu perfil.");

      validateMimeType(fileType);
      if (fileType.toLowerCase().includes("svg")) {
        throw new Error("SVG não é permitido para mídia de perfil.");
      }

      const supabase = getServerClient();
      const bucket =
        target === "avatar" || target === "creator_avatar"
          ? "avatars"
          : target === "cover" || target === "creator_cover"
            ? "covers"
            : "banners";
      const ext = extensionForMime(fileType, fileName);
      const uniqueName = `profiles/${identity.id}/${target}_${Date.now()}.${ext}`;
      const buffer = decodeInlineUpload(base64Data);

      let resolvedBucket = bucket;
      let { error: uploadError } = await supabase.storage.from(bucket).upload(uniqueName, buffer, {
        contentType: fileType,
        upsert: true,
      });

      if (uploadError) {
        console.warn(`[storage] Bucket ${bucket} indisponível (${uploadError.message}), tentando cms-media...`);
        const fallbackBucket = "cms-media";
        const { error: fbErr } = await supabase.storage.from(fallbackBucket).upload(uniqueName, buffer, {
          contentType: fileType,
          upsert: true,
        });
        if (fbErr) {
          throw new Error(`Bucket de perfil indisponível: ${uploadError.message || fbErr.message}`);
        }
        resolvedBucket = fallbackBucket;
      }

      const { data: publicUrlData } = supabase.storage.from(resolvedBucket).getPublicUrl(uniqueName);
      const publicUrl = publicUrlData.publicUrl;

      // Persistência Atômica Imediata no Banco de Dados
      if (target === "avatar") {
        const { error: dbErr } = await supabase
          .from("profiles")
          .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
          .eq("id", identity.id);
        if (dbErr) throw new Error(`Erro ao atualizar avatar do perfil: ${dbErr.message}`);
      } else if (target === "cover") {
        const { error: dbErr } = await supabase
          .from("profiles")
          .update({ cover_url: publicUrl, updated_at: new Date().toISOString() })
          .eq("id", identity.id);
        if (dbErr) throw new Error(`Erro ao atualizar capa do perfil: ${dbErr.message}`);
      } else if (target === "creator_avatar") {
        const { error: dbErr } = await supabase
          .from("creator_profiles")
          .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
          .eq("user_id", identity.id);
        if (dbErr) throw new Error(`Erro ao atualizar avatar do criador: ${dbErr.message}`);
      } else if (target === "creator_cover") {
        const { error: dbErr } = await supabase
          .from("creator_profiles")
          .update({
            cover_url: publicUrl,
            banner_url: publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", identity.id);
        if (dbErr) throw new Error(`Erro ao atualizar capa do criador: ${dbErr.message}`);
      } else if (target === "biolink_banner") {
        const { error: dbErr } = await supabase
          .from("creator_profiles")
          .update({ banner_url: publicUrl, updated_at: new Date().toISOString() })
          .eq("user_id", identity.id);
        if (dbErr) throw new Error(`Erro ao atualizar banner do biolink: ${dbErr.message}`);
      }

      return {
        success: true,
        publicUrl,
        target,
      };
    } catch (e: any) {
      console.error("[storage] uploadProfileMediaDirect error:", e);
      throw new Error(e.message || "Erro no processamento da imagem.");
    }
  });


/**
 * Reemite uma URL curta para um objeto já persistido sem expor a chave de serviço.
 * O path deve começar pelo namespace da loja ou do usuário autenticado.
 */
export const getSignedMediaDownloadUrl = createServerFn({ method: "POST" })
  .validator(z.object({ bucket: z.string().min(1), path: z.string().min(1).max(500), expiresInSeconds: z.number().int().min(60).max(3600).default(900) }))
  .handler(async ({ data }) => {
    assertAllowedBffBucket(data.bucket);
    assertSafeFolder(data.path);
    const identity = await (await import("@/lib/server-access")).getServerIdentity();
    if (!identity.id) throw new Error("Faça login para acessar a mídia.");
    const namespaces = [identity.store_id, identity.id].filter(Boolean) as string[];
    if (!namespaces.some((namespace) => data.path === namespace || data.path.startsWith(`${namespace}/`))) {
      throw new Error("Acesso negado ao objeto de mídia.");
    }
    const { data: signed, error } = await getServerClient().storage.from(data.bucket).createSignedUrl(data.path, data.expiresInSeconds);
    if (error || !signed?.signedUrl) throw new Error(`Não foi possível gerar URL de download: ${error?.message || "URL ausente"}`);
    return { signedUrl: signed.signedUrl, expiresInSeconds: data.expiresInSeconds, bucket: data.bucket, path: data.path };
  });


/**
 * Ingestão segura server-side de mídia por URL externa:
 * Realiza download validado no servidor (anti-SSRF, validação MIME e limite de 20MB)
 * e persiste o binário diretamente no Supabase Storage.
 */
export const ingestExternalMediaUrl = createServerFn({ method: "POST" })
  .validator(
    z.object({
      externalUrl: z.string().url().min(8).max(2048),
      bucket: z.string().default("post-media"),
      folder: z.string().default("classifieds"),
    }),
  )
  .handler(async ({ data: { externalUrl, bucket, folder } }) => {
    assertAllowedBffBucket(bucket);
    assertSafeFolder(folder);
    const { assertSafeExternalMediaUrl } = await import("@/lib/security/external-url.server");
    const parsedUrl = assertSafeExternalMediaUrl(externalUrl);

    const { getServerIdentity } = await import("@/lib/server-access");
    const identity = await getServerIdentity();
    if (!identity.id) {
      throw new Error("Faça login para importar mídia por URL.");
    }
    enforceRateLimit(identity.id, "media_upload");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    let response: Response;
    try {
      let currentUrl = parsedUrl;
      let hopCount = 0;
      while (true) {
        response = await fetch(currentUrl.toString(), {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            Accept: "image/*,video/*,*/*;q=0.8",
            "User-Agent": "WaesyMediaIngestor/1.0",
          },
        });
        if (response.status >= 300 && response.status < 400) {
          const locationHeader = response.headers.get("location");
          if (!locationHeader || hopCount >= 3) {
            throw new Error("Redirecionamento externo bloqueado por segurança.");
          }
          currentUrl = assertSafeExternalMediaUrl(new URL(locationHeader, currentUrl).toString());
          hopCount++;
          continue;
        }
        break;
      }
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      throw new Error(`Falha ao baixar mídia externa (HTTP ${response.status}).`);
    }

    const headerType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const urlExtMatch = parsedUrl.pathname.match(/\.(jpg|jpeg|png|webp|gif|avif|mp4|webm|mov)$/i);
    const inferredMime =
      headerType && ALLOWED_MIME_TYPES.has(headerType)
        ? headerType
        : urlExtMatch
          ? urlExtMatch[1].toLowerCase() === "mp4"
            ? "video/mp4"
            : urlExtMatch[1].toLowerCase() === "webm"
              ? "video/webm"
              : urlExtMatch[1].toLowerCase() === "mov"
                ? "video/quicktime"
                : urlExtMatch[1].toLowerCase() === "png"
                  ? "image/png"
                  : urlExtMatch[1].toLowerCase() === "webp"
                    ? "image/webp"
                    : urlExtMatch[1].toLowerCase() === "gif"
                      ? "image/gif"
                      : "image/jpeg"
          : "image/jpeg";

    validateMimeType(inferredMime);

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength <= 0 || arrayBuffer.byteLength > MAX_INLINE_UPLOAD_BYTES) {
      throw new Error("Mídia externa vazia ou acima do limite máximo de 20 MB.");
    }

    const buffer = Buffer.from(arrayBuffer);
    const ext = extensionForMime(inferredMime);
    const ownerPrefix = identity.store_id || identity.id;
    const uniquePath = `${folder}/${ownerPrefix}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

    const supabase = getServerClient();
    let targetBucket = bucket;
    const { error: uploadError } = await supabase.storage.from(targetBucket).upload(uniquePath, buffer, {
      contentType: inferredMime,
      upsert: true,
    });

    if (uploadError) {
      const fallbackBucket = "cms-media";
      const { error: fbErr } = await supabase.storage.from(fallbackBucket).upload(uniquePath, buffer, {
        contentType: inferredMime,
        upsert: true,
      });
      if (fbErr) {
        throw new Error(`Erro ao persistir mídia importada no Storage: ${uploadError.message}`);
      }
      targetBucket = fallbackBucket;
    }

    const { data: publicUrlData } = supabase.storage.from(targetBucket).getPublicUrl(uniquePath);
    const mediaType: "image" | "video" = inferredMime.startsWith("video/") ? "video" : "image";

    return {
      url: publicUrlData.publicUrl,
      path: uniquePath,
      bucket: targetBucket,
      type: mediaType,
      mimeType: inferredMime,
      byteSize: buffer.byteLength,
    };
  });
