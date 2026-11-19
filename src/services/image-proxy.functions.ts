import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limiter";
import { getServerIdentity } from "@/lib/server-access";

export interface ImageProxyResult {
  success: boolean;
  dataUri: string | null;
  contentType?: string;
  error?: string;
}

export const fetchImageAsBase64 = createServerFn({ method: "POST" })
  .validator(
    z.object({
      imageUrl: z.string().url("URL de imagem inválida").max(2048),
    }),
  )
  .handler(async ({ data }): Promise<ImageProxyResult> => {
    try {
      const identity = await getServerIdentity();
      if (!identity?.id) {
        return {
          success: false,
          dataUri: null,
          error: "Autenticação obrigatória para proxy de imagem.",
        };
      }

      enforceRateLimit(identity.id, "media_upload");

      const { fetchSafeExternalImageBuffer } = await import("@/lib/security/external-url.server");
      const { buffer, contentType } = await fetchSafeExternalImageBuffer(data.imageUrl, {
        maxBytes: 10 * 1024 * 1024,
        allowedMimePrefix: "image/",
        userAgent: "WaesySocialEngine/1.0",
        accept: "image/avif,image/webp,image/apng,image/png,image/jpeg,image/gif,*/*;q=0.5",
      });

      if (contentType === "image/svg+xml") {
        return {
          success: false,
          dataUri: null,
          error: "Imagens SVG externas não são permitidas no proxy.",
        };
      }

      const dataUri = `data:${contentType};base64,${buffer.toString("base64")}`;

      return {
        success: true,
        dataUri,
        contentType,
      };
    } catch (err: any) {
      console.error("[fetchImageAsBase64] Erro ao buscar imagem externa:", err);
      return {
        success: false,
        dataUri: null,
        error: err?.message || "Falha ao converter imagem para base64",
      };
    }
  });
