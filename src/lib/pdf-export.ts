/**
 * pdf-export.ts — Utilitário de Alta Resolução para Exportação de HTML para Imagem (PNG) e PDF
 * Carregamento lazy-load para evitar impacto de bundle em SSR.
 * Inclui sanitização automática Base64 contra erros de CORS (Tainted Canvas),
 * neutralização de escala CSS visual (anti-blur / anti-miniaturização) e
 * suporte a paginação multi-folhas estruturada para documentos editoriais e A4.
 */
import { sanitizeElementImagesForCanvas } from "@/lib/canvas/cors-safe-image";

interface TransformBackup {
  element: HTMLElement;
  transform: string;
  transformOrigin: string;
}

/**
 * Neutraliza temporariamente transformações CSS de escala visual (zoom de viewport)
 * que degradam a resolução e miniaturizam elementos na captura do html2canvas.
 */
function neutralizeTransforms(target: HTMLElement): () => void {
  const backups: TransformBackup[] = [];

  // Salva e zera no elemento alvo
  backups.push({
    element: target,
    transform: target.style.transform,
    transformOrigin: target.style.transformOrigin,
  });
  target.style.transform = "none";

  // Salva e zera em pais diretos caso tenham escala ativa
  let parent = target.parentElement;
  while (parent && parent !== document.body) {
    if (parent.style.transform && parent.style.transform !== "none") {
      backups.push({
        element: parent,
        transform: parent.style.transform,
        transformOrigin: parent.style.transformOrigin,
      });
      parent.style.transform = "none";
    }
    parent = parent.parentElement;
  }

  // Retorna função restauradora
  return () => {
    for (const b of backups) {
      b.element.style.transform = b.transform;
      b.element.style.transformOrigin = b.transformOrigin;
    }
  };
}

export interface ExportImageOptions {
  filename?: string;
  scale?: number;
  backgroundColor?: string | null;
}

/**
 * Captura um elemento DOM e exporta como Imagem PNG em alta resolução nativa (scale: 2)
 */
export async function exportElementAsImage(
  elementOrId: string | HTMLElement,
  filenameOrOptions: string | ExportImageOptions = "proposta-de-viagem.png"
): Promise<void> {
  const element =
    typeof elementOrId === "string"
      ? document.getElementById(elementOrId)
      : elementOrId;
  if (!element) {
    throw new Error(
      `Elemento ${typeof elementOrId === "string" ? `#${elementOrId}` : "DOM"} não encontrado na página.`
    );
  }

  const filename =
    typeof filenameOrOptions === "string"
      ? filenameOrOptions
      : filenameOrOptions.filename || "proposta-de-viagem.png";
  const customScale =
    typeof filenameOrOptions === "object" ? filenameOrOptions.scale : undefined;
  const customBg =
    typeof filenameOrOptions === "object" ? filenameOrOptions.backgroundColor ?? null : null;

  // 🛡️ Sanitização de imagens externas para Base64 segura contra CORS
  await sanitizeElementImagesForCanvas(element);

  // Aguarda fontes remotas terminarem carregamento
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  // Neutraliza transformações de zoom de tela para renderização na resolução nativa 1:1
  const restoreTransforms = neutralizeTransforms(element);

  try {
    const html2canvas = (await import("html2canvas")).default;

    const canvas = await html2canvas(element, {
      scale:
        customScale ||
        Math.max(2, Math.min(3, typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2)),
      useCORS: true,
      allowTaint: false,
      backgroundColor: customBg,
      logging: false,
      imageTimeout: 15000,
    });

    const imgData = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = imgData;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    restoreTransforms();
  }
}

/**
 * Captura um elemento DOM e exporta como Documento PDF em alta resolução.
 * Suporta paginação estruturada automática por folhas (.document-page / .a4-page)
 * para evitar fatiamento cego de linhas de texto e blocos visuais.
 */
export async function exportElementAsPdf(
  elementId: string,
  filename: string = "proposta-de-viagem.pdf",
  defaultOrientation: "p" | "l" = "p"
): Promise<Blob> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Elemento #${elementId} não encontrado na página.`);
  }

  // 🛡️ Sanitização de imagens externas para Base64 segura contra CORS
  await sanitizeElementImagesForCanvas(element);

  // Oculta botões e controles interativos marcados como no-print
  const noPrintElements = element.querySelectorAll(".no-print");
  const originalDisplays: Array<{ el: HTMLElement; display: string }> = [];
  noPrintElements.forEach((el) => {
    const htmlEl = el as HTMLElement;
    originalDisplays.push({ el: htmlEl, display: htmlEl.style.display });
    htmlEl.style.display = "none";
  });

  // Aguarda carregamento de fontes
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  // Neutraliza transformações de zoom de tela
  const restoreTransforms = neutralizeTransforms(element);

  try {
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    // Verifica se o documento é composto por páginas estruturadas explícitas
    const explicitPages = element.querySelectorAll<HTMLElement>(
      ".document-page, .a4-page, .a4-landscape-page, .presentation-page, .pdf-page"
    );

    if (explicitPages.length > 0) {
      // ── MODO MULTIPÁGINA ESTRUTURADO (Zero Fatiamento Cego) ──
      let pdf: any = null;

      for (let i = 0; i < explicitPages.length; i++) {
        const pageEl = explicitPages[i];
        const isLandscape =
          pageEl.classList.contains("a4-landscape-page") ||
          pageEl.classList.contains("presentation-page") ||
          pageEl.offsetWidth > pageEl.offsetHeight;

        const orientation = isLandscape ? "l" : "p";
        const pageCanvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          // design-lint-ignore DL-01 reason:"HTML2Canvas print media requires pure white background" expiry:"2030-01-01"
          backgroundColor: "#ffffff",
          logging: false,
          imageTimeout: 15000,
        });

        const imgData = pageCanvas.toDataURL("image/jpeg", 0.95);

        if (i === 0) {
          pdf = new jsPDF(orientation, "mm", "a4");
        } else {
          pdf.addPage("a4", orientation);
        }

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
      }

      pdf.save(filename);
      return pdf.output("blob");
    }

    // ── MODO DOCUMENTO CONTÍNUO / LÂMINA ÚNICA ──
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      // design-lint-ignore DL-01 reason:"HTML2Canvas print media requires pure white background" expiry:"2030-01-01"
      backgroundColor: "#ffffff",
      logging: false,
      imageTimeout: 15000,
    });

    const isCanvasLandscape = canvas.width > canvas.height;
    const orientation = defaultOrientation || (isCanvasLandscape ? "l" : "p");
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = new jsPDF(orientation, "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // Primeira página
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Páginas adicionais se o canvas for maior que uma página A4
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
    return pdf.output("blob");
  } finally {
    restoreTransforms();
    originalDisplays.forEach(({ el, display }) => {
      el.style.display = display;
    });
  }
}
