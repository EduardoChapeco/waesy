const VIDEO_EXTENSION_REGEX = /\.(mp4|webm|ogg|mov|quicktime|m4v|avi|mkv)(\?.*)?$/i;

/**
 * Detector canônico de URL de mídia de vídeo (W01).
 */
export function isVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  const trimmed = String(url).trim();
  if (!trimmed) return false;
  const clean = trimmed.split("?")[0].toLowerCase();
  if (VIDEO_EXTENSION_REGEX.test(clean)) return true;
  const lower = trimmed.toLowerCase();
  return (
    clean.includes("video") ||
    lower.includes(".mp4") ||
    lower.includes(".webm") ||
    lower.includes(".mov") ||
    lower.includes("/video/") ||
    lower.includes("video=") ||
    lower.includes("mime=video") ||
    lower.includes("video%2f")
  );
}

/**
 * Leitor canônico de arquivo File/Blob para Data URL base64.
 */
export function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}
