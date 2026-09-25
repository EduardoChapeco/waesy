import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export interface ImageProxyResult {
  success: boolean;
  dataUri: string | null;
  contentType?: string;
  error?: string;
}

export const fetchImageAsBase64 = createServerFn({ method: "POST" })
  .validator(
    z.object({
      imageUrl: z.string().url("URL de imagem inválida"),
    }),
  )
  .handler(async ({ data }): Promise<ImageProxyResult> => {
    try {
      const response = await fetch(data.imageUrl, {
        headers: {
          "User-Agent": "WaesySocialEngine/1.0",
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      });

      if (!response.ok) {
        return {
          success: false,
          dataUri: null,
          error: `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");
      const dataUri = `data:${contentType};base64,${base64}`;

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
