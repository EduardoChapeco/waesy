import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { enforceRateLimit } from "@/lib/rate-limiter";

const ALLOWED_UPLOAD_BUCKETS = new Set([
  "post-media",
  "classifieds",
  "classified-media",
  "legal-documents",
  "cms-media",
  "product-media",
  "covers",
  "avatars",
  "banners",
  "public_media",
  "social",
]);
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/avif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
  "application/octet-stream",
]);

function validateMimeType(contentType: string) {
  const cleanType = contentType.toLowerCase().split(";")[0].trim();
  if (!ALLOWED_MIME_TYPES.has(cleanType)) {
    throw new Error(
      `Tipo de arquivo não permitido (${contentType}). Aceitos: imagens, vídeos, PDFs, documentos (DOC/DOCX) e textos/logs.`,
    );
  }
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
        "post-media",
        "public_media",
        "brand-assets",
        "legal-documents",
        "receipts",
        "identity-vault",
        "store-assets",
        "destination-media",
        "social",
      ]),
      contentType: z.string(),
    }),
  )
  .handler(async ({ data: { fileName, bucket, contentType } }) => {
    try {
      validateMimeType(contentType);

      const supabase = getServerClient();
      const ext = fileName.split(".").pop() || "png";

      const { getServerIdentity } = await import("@/lib/server-access");
      const { store_id, id: userId } = await getServerIdentity();
      if (!store_id && !userId) throw new Error("Não autorizado");

      enforceRateLimit(userId || store_id || "guest", "media_upload");

      const folder = store_id || userId;
      const uniqueName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${ext}`;

      // Tenta criar a URL assinada
      let result = await supabase.storage.from(bucket).createSignedUploadUrl(uniqueName);

      // Auto-Healing: Cria o bucket se não existir e tenta novamente
      const errMsg = result.error?.message || "";
      if (
        errMsg.includes("Bucket not found") ||
        errMsg.includes("The related resource does not exist")
      ) {
        console.log(`[storage] Bucket ${bucket} missing. Auto-healing...`);
        const { error: createError } = await supabase.storage.createBucket(bucket, {
          public: ![
            "payment-proofs",
            "rma-proofs",
            "legal-documents",
            "receipts",
            "identity-vault",
          ].includes(bucket),
          fileSizeLimit: 10485760, // 10MB
        });

        if (createError) {
          throw new Error(`Auto-healing failed: ${createError.message}`);
        }

        result = await supabase.storage.from(bucket).createSignedUploadUrl(uniqueName);
      }

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

    // Auto-healing: cria o bucket público se não existir
    const errMsg = result.error?.message || "";
    if (
      errMsg.includes("Bucket not found") ||
      errMsg.includes("The related resource does not exist")
    ) {
      const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 100 * 1024 * 1024, // 100MB para fotos e vídeos em alta resolução
      });
      if (createErr) throw new Error(`[storage] Bucket auto-heal failed: ${createErr.message}`);
      result = await supabase.storage.from(BUCKET).createSignedUploadUrl(uniqueName);
    }

    if (result.error || !result.data) {
      throw new Error(`Erro ao gerar URL de upload de mídia: ${result.error?.message}`);
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
      bucket: z.enum(["cms-media", "store-assets", "product-media", "covers", "avatars", "banners"]),
    }),
  )
  .handler(async ({ data: { fileName, fileType, base64Data, bucket } }) => {
    try {
      validateMimeType(fileType);

      const { getServerIdentity } = await import("@/lib/server-access");
      const identity = await getServerIdentity();
      if (!identity.id || !identity.store_id) throw new Error("Acesso negado: loja não identificada.");
      enforceRateLimit(identity.id, "media_upload");

      const supabase = getServerClient();
      const ext = fileName.split(".").pop() || "png";
      const folder = identity.store_id;
      const uniqueName = `stores/${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;

      // Extrai os bytes a partir da string base64
      const base64Content = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
      const buffer = Buffer.from(base64Content, "base64");
      if (buffer.byteLength > MAX_UPLOAD_BYTES)
        throw new Error("Arquivo excede o limite de 25 MB.");

      let { error: uploadError } = await supabase.storage.from(bucket).upload(uniqueName, buffer, {
        contentType: fileType,
        upsert: true,
      });

      if (uploadError) {
        throw new Error(`Erro ao fazer upload da mídia: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(uniqueName);

      return {
        url: publicUrlData.publicUrl,
        path: uniqueName,
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
      const { getServerIdentity } = await import("@/lib/server-access");
      const identity = await getServerIdentity();
      if (!identity.id) throw new Error("Faça login para enviar fotos ou vídeos.");

      const supabase = getServerClient();
      const ext = fileName.split(".").pop() || "jpg";
      const uniqueName = `${identity.id}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const bucket = "post-media";

      const base64Content = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
      const buffer = Buffer.from(base64Content, "base64");

      let { error: uploadError } = await supabase.storage.from(bucket).upload(uniqueName, buffer, {
        contentType: fileType,
        upsert: true,
      });

      if (uploadError) {
        throw new Error(
          `Bucket de upload indisponível ou upload rejeitado: ${uploadError.message}`,
        );
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

      if (
        uploadError &&
        (uploadError.message.includes("Bucket not found") ||
          uploadError.message.includes("The related resource does not exist"))
      ) {
        await supabase.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: 20 * 1024 * 1024,
        });
        const retry = await supabase.storage.from(bucket).upload(uniqueName, buffer, {
          contentType: fileType,
          upsert: true,
        });
        uploadError = retry.error;
      }

      if (uploadError) {
        throw new Error(`Erro ao salvar imagem no servidor: ${uploadError.message}`);
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
 * Bypassa RLS client-side através do service_role e auto-cria buckets faltantes.
 */
export const uploadMediaUniversal = createServerFn({ method: "POST" })
  .validator(
    z.object({
      fileName: z.string().min(1),
      fileType: z.string().min(1),
      base64Data: z.string().min(1),
      bucket: z.string().default("post-media"),
      folder: z.string().default("uploads"),
    }),
  )
  .handler(async ({ data: { fileName, fileType, base64Data, bucket, folder } }) => {
    try {
      const { getServerIdentity } = await import("@/lib/server-access");
      const identity = await getServerIdentity();
      if (!identity.id) throw new Error("Faça login para enviar mídia.");
      if (!ALLOWED_UPLOAD_BUCKETS.has(bucket)) throw new Error("Bucket de upload não permitido.");
      validateMimeType(fileType);
      const supabase = getServerClient();
      const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
      const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;
      const tenantFolder = identity.store_id || identity.id;
      const uniqueName = `${tenantFolder}/${cleanName}`;

      const base64Content = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
      const buffer = Buffer.from(base64Content, "base64");
      if (buffer.byteLength > MAX_UPLOAD_BYTES)
        throw new Error("Arquivo excede o limite de 25 MB.");

      let { error: uploadError } = await supabase.storage.from(bucket).upload(uniqueName, buffer, {
        contentType: fileType,
        upsert: true,
      });

      if (uploadError) {
        throw new Error(`Erro ao persistir mídia no storage: ${uploadError.message}`);
      }

      const isPrivate = new Set(["classifieds", "classified-media", "legal-documents"]).has(bucket);
      const signed = isPrivate
        ? await supabase.storage.from(bucket).createSignedUrl(uniqueName, 900)
        : null;
      if (isPrivate && (signed?.error || !signed?.data?.signedUrl))
        throw new Error("Não foi possível gerar URL privada para o arquivo.");
      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(uniqueName);

      return {
        id: cleanName,
        url: isPrivate ? signed!.data!.signedUrl : publicUrlData.publicUrl,
        path: uniqueName,
        name: fileName,
        type: fileType.startsWith("video/") ? ("video" as const) : ("image" as const),
      };
    } catch (e: any) {
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

      let { error: uploadError } = await supabase.storage.from(bucket).upload(uniqueName, buffer, {
        contentType: fileType,
        upsert: true,
      });

      if (
        uploadError &&
        (uploadError.message.includes("Bucket not found") ||
          uploadError.message.includes("The related resource does not exist"))
      ) {
        await supabase.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: 25 * 1024 * 1024,
        });
        const retry = await supabase.storage.from(bucket).upload(uniqueName, buffer, {
          contentType: fileType,
          upsert: true,
        });
        uploadError = retry.error;
      }

      if (uploadError) {
        throw new Error(`Erro ao persistir asset de marca no storage: ${uploadError.message}`);
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
      target: z.enum(["avatar", "cover", "creator_avatar", "creator_cover"]),
    }),
  )
  .handler(async ({ data: { base64Data, fileName, fileType, target } }) => {
    try {
      const { getServerIdentity } = await import("@/lib/server-access");
      const identity = await getServerIdentity();
      if (!identity.id) throw new Error("Faça login para atualizar a mídia do seu perfil.");

      const supabase = getServerClient();
      const bucket =
        target === "avatar" || target === "creator_avatar"
          ? "avatars"
          : target === "cover" || target === "creator_cover"
            ? "covers"
            : "post-media";
      const ext = fileName.split(".").pop() || "png";
      const uniqueName = `profiles/${identity.id}/${target}_${Date.now()}.${ext}`;

      const base64Content = base64Data.includes(",") ? base64Data.split(",")[1] : base64Data;
      const buffer = Buffer.from(base64Content, "base64");

      let { error: uploadError } = await supabase.storage.from(bucket).upload(uniqueName, buffer, {
        contentType: fileType,
        upsert: true,
      });

      if (
        uploadError &&
        (uploadError.message.includes("Bucket not found") ||
          uploadError.message.includes("The related resource does not exist"))
      ) {
        await supabase.storage.createBucket(bucket, {
          public: true,
          fileSizeLimit: 25 * 1024 * 1024,
        });
        const retry = await supabase.storage.from(bucket).upload(uniqueName, buffer, {
          contentType: fileType,
          upsert: true,
        });
        uploadError = retry.error;
      }

      if (uploadError) {
        throw new Error(`Erro no upload da mídia: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(uniqueName);
      const publicUrl = publicUrlData.publicUrl;

      // Persistência Atômica Imediata no Banco de Dados
      if (target === "avatar") {
        await supabase
          .from("profiles")
          .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
          .eq("id", identity.id);
      } else if (target === "cover") {
        await supabase
          .from("profiles")
          .update({ cover_url: publicUrl, updated_at: new Date().toISOString() })
          .eq("id", identity.id);
      } else if (target === "creator_avatar") {
        await supabase
          .from("creator_profiles")
          .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
          .eq("user_id", identity.id);
      } else if (target === "creator_cover") {
        await supabase
          .from("creator_profiles")
          .update({
            cover_url: publicUrl,
            banner_url: publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", identity.id);
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
