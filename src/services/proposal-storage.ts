/**
 * proposal-storage.ts — Contratos Canônicos de Upload e Storage de Propostas (BFF BigTech)
 * Re-exporta Server Functions de storage.functions.ts com zero dependência de client Supabase.
 */

import { uploadStoreMedia } from "./storage.functions";
import { readFileAsDataUrl } from "@/lib/media-utils";

export * from "./storage.functions";

/**
 * Upload de mídias de proposta (mapa estático, imagens customizadas)
 */
export async function uploadProposalMedia(
  agencyId: string,
  proposalId: string,
  file: File,
  slot: string = "media"
): Promise<string> {
  try {
    const base64 = await readFileAsDataUrl(file);
    const result = await uploadStoreMedia({
      data: {
        fileName: file.name || `proposal_${slot}_${Date.now()}.png`,
        fileType: file.type || "image/png",
        base64Data: base64,
        bucket: "cms-media",
      },
    });
    return result.url;
  } catch (err: any) {
    console.warn("[uploadProposalMedia] Erro no upload direto, utilizando ObjectURL fallback:", err?.message);
    if (typeof window !== "undefined" && window.URL) {
      return URL.createObjectURL(file);
    }
    return "";
  }
}

