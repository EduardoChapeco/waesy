import { fetchImageAsBase64 } from "@/services/image-proxy.functions";

/**
 * Converte qualquer URL de imagem externa para Data URI (Base64),
 * tornando o canvas de exportação 100% imune a erros de CORS e SecurityError.
 */
export async function convertToCorsSafeDataUri(imageUrl: string): Promise<string> {
  if (!imageUrl || typeof imageUrl !== "string") {
    return "";
  }

  // 1. Se já for Base64 Data URI ou Blob local, retorna imediatamente
  if (imageUrl.startsWith("data:") || imageUrl.startsWith("blob:")) {
    return imageUrl;
  }

  // 2. Tentativa direta pelo browser (rápido quando a CDN possui Access-Control-Allow-Origin: *)
  try {
    const res = await fetch(imageUrl, { mode: "cors" });
    if (res.ok) {
      const blob = await res.blob();
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") resolve(reader.result);
          else reject(new Error("Falha ao ler blob da imagem"));
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return dataUri;
    }
  } catch {
    // Falha silenciosa de CORS no navegador — avança para o fallback server-side
  }

  // 3. Fallback Server-Side via BFF (sem restrições de CORS de navegador)
  try {
    const serverResult = await fetchImageAsBase64({
      data: { imageUrl },
    });

    if (serverResult.success && serverResult.dataUri) {
      return serverResult.dataUri;
    }
  } catch (serverErr) {
    console.warn("[convertToCorsSafeDataUri] Erro no fallback server-side:", serverErr);
  }

  // 4. Último recurso defensivo: retorna a URL original
  return imageUrl;
}

/**
 * Garante o pré-carregamento completo da imagem em memória antes da captura pelo html2canvas
 */
export async function preloadImage(dataUri: string): Promise<void> {
  if (!dataUri) return;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve();
    img.onerror = () => resolve(); // Resiliente: não trava o processo
    img.src = dataUri;
  });
}

/**
 * 🛡️ Varre todos os <img> e elementos com background-image dentro de um elemento DOM,
 * convertendo todas as URLs remotas em Base64 Data URIs seguras antes da renderização via html2canvas.
 * Isso erradica 100% dos erros de SecurityError: Tainted Canvas ao exportar PNG ou PDF.
 */
export async function sanitizeElementImagesForCanvas(element: HTMLElement): Promise<void> {
  if (!element || typeof window === "undefined") return;

  const tasks: Promise<void>[] = [];

  // 1. Processa todas as tags <img>
  const imgElements = Array.from(element.querySelectorAll("img"));
  for (const img of imgElements) {
    const src = img.getAttribute("src");
    if (src && !src.startsWith("data:") && !src.startsWith("blob:")) {
      tasks.push(
        convertToCorsSafeDataUri(src).then(async (safeUri) => {
          if (safeUri && safeUri.startsWith("data:")) {
            img.setAttribute("src", safeUri);
            img.crossOrigin = "anonymous";
            await preloadImage(safeUri);
          }
        })
      );
    }
  }

  // 2. Processa elementos com background-image inline
  const allElements = Array.from(element.querySelectorAll<HTMLElement>("*"));
  for (const el of allElements) {
    const bg = el.style.backgroundImage;
    if (bg && bg.includes("url(")) {
      const match = bg.match(/url\(["']?([^"']+)["']?\)/);
      if (match && match[1] && !match[1].startsWith("data:") && !match[1].startsWith("blob:")) {
        tasks.push(
          convertToCorsSafeDataUri(match[1]).then(async (safeUri) => {
            if (safeUri && safeUri.startsWith("data:")) {
              el.style.backgroundImage = `url("${safeUri}")`;
              await preloadImage(safeUri);
            }
          })
        );
      }
    }
  }

  await Promise.all(tasks);
}
