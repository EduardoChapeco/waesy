import { compressImage } from "@/lib/image-compression";
import { uploadMediaUniversal } from "@/services/storage.functions";

/**
 * uploadClassifiedMedia
 * Realiza a compressão client-side de uma imagem e envia via Server Function
 * para o Supabase Storage (bucket 'post-media', pasta 'classifieds/{folder}'),
 * retornando a URL pública definitiva e permanente (sem URLs temporárias 'blob:').
 */
export async function uploadClassifiedMedia(
  file: File,
  folder = "general",
): Promise<string> {
  if (!file) throw new Error("Nenhum arquivo fornecido para upload.");

  // 1. Validação básica de tipo
  const isImage = file.type.startsWith("image/");
  if (!isImage) {
    throw new Error("Apenas imagens são permitidas para este campo.");
  }

  // 2. Compressão client-side inteligente para economia de banda e upload veloz
  let fileToUpload = file;
  try {
    const compressed = await compressImage(file, {
      maxDimension: 1600,
      webpQuality: 0.82,
    });
    fileToUpload = compressed.file;
  } catch (err) {
    console.warn("[uploadClassifiedMedia] Compressão falhou, enviando arquivo original:", err);
  }

  // 3. Conversão para base64 para envio seguro via BFF
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(fileToUpload);
  });

  const ext = fileToUpload.name.split(".").pop()?.toLowerCase() || "jpg";
  const cleanName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

  // 4. Executa upload universal no bucket post-media
  const res = await uploadMediaUniversal({
    data: {
      base64Data,
      fileName: cleanName,
      fileType: fileToUpload.type || "image/jpeg",
      bucket: "post-media",
      folder: `classifieds/${folder}`,
    },
  });

  if (!res?.url) {
    throw new Error("Falha ao obter URL pública do Supabase Storage.");
  }

  return res.url;
}
