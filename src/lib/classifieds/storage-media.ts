import { getBrowserClient } from "@/lib/supabase";

const KNOWN_STORAGE_BUCKETS = [
  "post-media",
  "public_media",
  "product-media",
  "cms-media",
  "banners",
  "classifieds",
  "avatar",
  "store-media",
  "documents",
];

/**
 * resolveStorageMediaUrl
 * Converte qualquer caminho relativo do Supabase Storage ou URL em uma URL pública completa,
 * prevenindo duplicação de nomes de buckets e imagens quebradas.
 */
export function resolveStorageMediaUrl(
  raw: string | null | undefined,
  defaultBucket = "post-media"
): string {
  if (!raw || typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // 1. URLs absolutas ou data/blob já são utilizáveis diretamente
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  try {
    const supabase = getBrowserClient();
    let cleanPath = trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
    let targetBucket = defaultBucket;

    // Detecta se o path já inicia com um bucket conhecido
    for (const b of KNOWN_STORAGE_BUCKETS) {
      if (cleanPath.startsWith(`${b}/`)) {
        targetBucket = b;
        cleanPath = cleanPath.slice(b.length + 1);
        break;
      }
    }

    const { data } = supabase.storage.from(targetBucket).getPublicUrl(cleanPath);
    return data?.publicUrl || trimmed;
  } catch {
    return trimmed;
  }
}
