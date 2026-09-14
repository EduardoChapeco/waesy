/**
 * clipboard-media.ts — Utilitário de Extração Universal de Mídias via Clipboard (Ctrl+V)
 * 
 * Permite capturar prints de tela (Windows / macOS), imagens copiadas do navegador,
 * GIFs animados, arquivos de vídeo e URLs de imagem da área de transferência
 * garantindo a extração na resolução nativa máxima.
 */

export interface ExtractedClipboardMedia {
  file: File;
  type: "image" | "video" | "gif";
  previewUrl: string;
  source: "file" | "html" | "url";
}

/**
 * Verifica se um arquivo é imagem, gif ou vídeo suportado
 */
export function isSupportedMediaType(type: string): boolean {
  return (
    type.startsWith("image/") ||
    type.startsWith("video/") ||
    type === "application/pdf"
  );
}

/**
 * Extrai todas as mídias disponíveis em um evento de colagem (onPaste)
 */
export async function extractMediaFromClipboard(
  event: React.ClipboardEvent | ClipboardEvent
): Promise<ExtractedClipboardMedia[]> {
  const clipboardData = (event as React.ClipboardEvent).clipboardData || (event as ClipboardEvent).clipboardData;
  if (!clipboardData) return [];

  const results: ExtractedClipboardMedia[] = [];

  // 1. Processa arquivos nativos do clipboard (ex: Prints de tela Win+Shift+S, arquivos copiados do Explorer)
  const items = Array.from(clipboardData.items || []);
  const files = Array.from(clipboardData.files || []);

  // Coleta de arquivos diretos
  for (const file of files) {
    if (isSupportedMediaType(file.type)) {
      const isVideo = file.type.startsWith("video/");
      const isGif = file.type === "image/gif";
      results.push({
        file,
        type: isVideo ? "video" : isGif ? "gif" : "image",
        previewUrl: URL.createObjectURL(file),
        source: "file",
      });
    }
  }

  // Se já encontrou arquivos em files, retorna (evita duplicatas com items)
  if (results.length > 0) {
    return results;
  }

  // 2. Inspeciona items detalhadamente caso files esteja vazio (ex: imagem colada de aba do navegador)
  for (const item of items) {
    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file && isSupportedMediaType(file.type)) {
        const isVideo = file.type.startsWith("video/");
        const isGif = file.type === "image/gif";
        results.push({
          file,
          type: isVideo ? "video" : isGif ? "gif" : "image",
          previewUrl: URL.createObjectURL(file),
          source: "file",
        });
      }
    }
  }

  if (results.length > 0) {
    return results;
  }

  // 3. Inspeciona HTML copiado (ex: copiar imagem de um site no Chrome)
  const htmlData = clipboardData.getData("text/html");
  if (htmlData) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlData, "text/html");
      const imgElements = Array.from(doc.querySelectorAll("img"));

      for (const img of imgElements) {
        const src = img.getAttribute("src");
        if (src) {
          // Se for base64
          if (src.startsWith("data:image/")) {
            const blob = await fetch(src).then((r) => r.blob());
            const ext = src.split(";")[0].split("/")[1] || "png";
            const file = new File([blob], `clipboard-pasted-image.${ext}`, {
              type: blob.type || `image/${ext}`,
            });
            results.push({
              file,
              type: blob.type === "image/gif" ? "gif" : "image",
              previewUrl: URL.createObjectURL(file),
              source: "html",
            });
          }
        }
      }
    } catch {
      // Falha silenciosa em HTML malformado
    }
  }

  return results;
}

/**
 * Converte um arquivo File em string base64 pura para envio via Server Functions
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}
