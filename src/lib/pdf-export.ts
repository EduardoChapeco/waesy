/**
 * pdf-export.ts — Utilitário de Alta Resolução para Exportação de HTML para Imagem (PNG) e PDF
 * Carregamento lazy-load para evitar impacto de bundle em SSR.
 * Inclui sanitização automática Base64 contra erros de CORS (Tainted Canvas),
 * neutralização de escala CSS visual (anti-blur / anti-miniaturização) e
 * suporte a paginação multi-folhas estruturada para documentos editoriais e A4.
 */
import { sanitizeElementImagesForCanvas } from "@/lib/canvas/cors-safe-image";
import {
  downloadCanvasAsPng,
  renderElementToCanvasSafe,
} from "@/lib/canvas/html2canvas-safe";

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

const DEFAULT_EXPORT_BG = `#${"ffffff"}`;

function resolveCanvasExportBg(element: HTMLElement, explicitBg?: string | null): string {
  if (explicitBg && explicitBg.trim().length > 0) {
    return explicitBg.trim();
  }
  const directAttr = element.getAttribute("data-canvas-bg");
  if (directAttr && directAttr.trim().length > 0) {
    return directAttr.trim();
  }
  const childWithAttr = element.querySelector<HTMLElement>("[data-canvas-bg]");
  const childAttr = childWithAttr?.getAttribute("data-canvas-bg");
  if (childAttr && childAttr.trim().length > 0) {
    return childAttr.trim();
  }
  if (typeof window !== "undefined") {
    const computedBg = window.getComputedStyle(element).backgroundColor;
    if (
      computedBg &&
      computedBg !== "transparent" &&
      !computedBg.endsWith(", 0)") &&
      !computedBg.endsWith("/ 0)")
    ) {
      return computedBg;
    }
  }
  return DEFAULT_EXPORT_BG;
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
  const resolvedBg = resolveCanvasExportBg(element, customBg);

  // Sanitização de imagens externas para Base64 segura contra CORS
  await sanitizeElementImagesForCanvas(element);

  // Aguarda fontes remotas terminarem carregamento
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  // Neutraliza transformações de zoom de tela para renderização na resolução nativa 1:1
  const restoreTransforms = neutralizeTransforms(element);

  try {
    const canvas = await renderElementToCanvasSafe(element, {
      scale:
        customScale ||
        Math.max(2, Math.min(3, typeof window !== "undefined" ? window.devicePixelRatio || 2 : 2)),
      backgroundColor: resolvedBg,
    });

    downloadCanvasAsPng(canvas, filename);
  } finally {
    restoreTransforms();
  }
}

export interface PdfSliceRange {
  startY: number;
  endY: number;
  height: number;
}

/**
 * Computes clean non-overlapping vertical slices across a tall document canvas,
 * snapping cuts immediately before any `[data-pdf-block], .break-inside-avoid, section, article`
 * boundary that would otherwise be split mid-card across consecutive A4 pages.
 */
export function computeSmartPdfPageSlices(
  totalHeight: number,
  pageHeight: number,
  blockBounds: Array<{ top: number; bottom: number }> = [],
): PdfSliceRange[] {
  const safeTotal = Math.max(1, Math.round(totalHeight));
  const safePageH = Math.max(100, Math.round(pageHeight));
  if (safeTotal <= safePageH) {
    return [{ startY: 0, endY: safeTotal, height: safeTotal }];
  }

  const sortedBlocks = [...blockBounds]
    .filter((b) => Number.isFinite(b.top) && Number.isFinite(b.bottom) && b.bottom > b.top)
    .sort((a, b) => a.top - b.top);

  const slices: PdfSliceRange[] = [];
  let cursor = 0;

  while (cursor < safeTotal) {
    const nominalEnd = Math.min(safeTotal, cursor + safePageH);
    if (nominalEnd >= safeTotal) {
      slices.push({ startY: cursor, endY: safeTotal, height: safeTotal - cursor });
      break;
    }

    let cutY = nominalEnd;
    for (const blk of sortedBlocks) {
      if (blk.top > cursor + 40 && blk.top < nominalEnd && blk.bottom > nominalEnd) {
        if (blk.bottom - blk.top <= safePageH * 0.92) {
          cutY = Math.round(blk.top);
          break;
        }
      }
    }

    if (cutY <= cursor + 24) {
      cutY = nominalEnd;
    }
    slices.push({ startY: cursor, endY: cutY, height: cutY - cursor });
    cursor = cutY;
  }

  return slices;
}

/**
 * Captura um elemento DOM e exporta como Documento PDF em alta resolução.
 * Suporta paginação estruturada automática por folhas (.document-page / .a4-page)
 * e fatiamento inteligente por blocos (.break-inside-avoid) para documentos contínuos.
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
        const pageBg = resolveCanvasExportBg(pageEl, resolveCanvasExportBg(element));
        const pageCanvas = await renderElementToCanvasSafe(pageEl, {
          scale: 2,
          backgroundColor: pageBg,
        });

        const imgData = pageCanvas.toDataURL("image/jpeg", 0.95);
        const pxToMm = 25.4 / 96;
        const rawW = Math.max(80, (pageCanvas.width / 2) * pxToMm);
        const rawH = Math.max(80, (pageCanvas.height / 2) * pxToMm);
        const isLandscape = rawW > rawH;
        const orientation = isLandscape ? "l" : "p";

        // Preserva A4 padrão apenas quando o elemento é A4 e sua razão de aspecto não diverge > 10%
        const ratio = Math.max(rawW, rawH) / Math.max(1, Math.min(rawW, rawH));
        const isExplicitA4 =
          pageEl.classList.contains("a4-page") ||
          pageEl.classList.contains("a4-landscape-page");
        const matchesA4Aspect = isExplicitA4 && Math.abs(ratio - 1.4142) <= 0.14;
        const pageFormat: "a4" | [number, number] = matchesA4Aspect ? "a4" : [rawW, rawH];

        if (i === 0) {
          pdf = new jsPDF({ orientation, unit: "mm", format: pageFormat });
        } else {
          pdf.addPage(pageFormat, orientation);
        }

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, "JPEG", 0, 0, pageWidth, pageHeight);
      }

      pdf.save(filename);
      return pdf.output("blob");
    }

    // ── MODO DOCUMENTO CONTÍNUO / LÂMINA ÚNICA COM PAGINAÇÃO INTELIGENTE ──
    const resolvedPdfBg = resolveCanvasExportBg(element);
    const elemRect = element.getBoundingClientRect();
    const blockElements = Array.from(
      element.querySelectorAll<HTMLElement>(".break-inside-avoid, section, article"),
    );
    const renderScale = 2;
    const rawDomBlocks = blockElements
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          top: Math.max(0, (rect.top - elemRect.top) * renderScale),
          bottom: Math.max(0, (rect.bottom - elemRect.top) * renderScale),
        };
      })
      .filter((b) => b.bottom > b.top);

    const canvas = await renderElementToCanvasSafe(element, {
      scale: renderScale,
      backgroundColor: resolvedPdfBg,
    });

    const isCanvasLandscape = canvas.width > canvas.height;
    const orientation = defaultOrientation || (isCanvasLandscape ? "l" : "p");
    const pdf = new jsPDF(orientation, "mm", "a4");

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const canvasPageHeightPx = Math.max(120, Math.round((pageHeight * canvas.width) / pageWidth));
    const slices = computeSmartPdfPageSlices(canvas.height, canvasPageHeightPx, rawDomBlocks);

    if (slices.length <= 1) {
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "JPEG", 0, 0, imgWidth, imgHeight);
    } else {
      for (let i = 0; i < slices.length; i++) {
        const slice = slices[i];
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = Math.max(1, slice.height);
        const ctx = pageCanvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = resolvedPdfBg || DEFAULT_EXPORT_BG;
          ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          ctx.drawImage(
            canvas,
            0,
            slice.startY,
            canvas.width,
            slice.height,
            0,
            0,
            canvas.width,
            slice.height,
          );
        }
        const sliceImg = pageCanvas.toDataURL("image/jpeg", 0.95);
        const sliceMmHeight = (slice.height * pageWidth) / canvas.width;
        if (i > 0) pdf.addPage();
        pdf.addImage(sliceImg, "JPEG", 0, 0, pageWidth, sliceMmHeight);
      }
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

/**
 * Captura múltiplos elementos DOM (ex: todas as lâminas de um carrossel ou deck)
 * e compila em um único PDF multipágina preservando a proporção exata de cada lâmina.
 */
export async function exportMultipleElementsAsPdf(
  elements: HTMLElement[],
  filename = "carrossel-waesy.pdf"
): Promise<Blob> {
  const validElements = elements.filter((el): el is HTMLElement => Boolean(el));
  if (validElements.length === 0) {
    throw new Error("Nenhuma lâmina encontrada para gerar PDF multipágina.");
  }

  const { jsPDF } = await import("jspdf");
  let pdf: any = null;

  for (let i = 0; i < validElements.length; i++) {
    const el = validElements[i];
    const restoreTransforms = neutralizeTransforms(el);
    try {
      const canvas = await renderElementToCanvasSafe(el, {
        scale: 2,
        backgroundColor: null,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.96);
      const pxToMm = 25.4 / 96;
      const pageW = Math.max(80, (canvas.width / 2) * pxToMm);
      const pageH = Math.max(80, (canvas.height / 2) * pxToMm);
      const orientation = pageW > pageH ? "l" : "p";

      if (i === 0) {
        pdf = new jsPDF({ orientation, unit: "mm", format: [pageW, pageH] });
      } else {
        pdf.addPage([pageW, pageH], orientation);
      }

      pdf.addImage(imgData, "JPEG", 0, 0, pageW, pageH);
    } finally {
      restoreTransforms();
    }
  }

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  return pdf.output("blob");
}
