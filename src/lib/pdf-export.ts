/**
 * pdf-export.ts — Utilitário de Alta Resolução para Exportação de HTML para Imagem (PNG) e PDF
 * Carregamento lazy-load para evitar impacto de bundle em SSR.
 * Inclui sanitização automática Base64 contra erros de CORS (Tainted Canvas).
 */
import { sanitizeElementImagesForCanvas } from "@/lib/canvas/cors-safe-image";

/**
 * Captura um elemento DOM e exporta como Imagem PNG em alta resolução (scale: 2)
 */
export async function exportElementAsImage(
  elementId: string,
  filename: string = "proposta-de-viagem.png"
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Elemento #${elementId} não encontrado na página.`);
  }

  // 🛡️ Sanitização de imagens externas para Base64 segura contra CORS
  await sanitizeElementImagesForCanvas(element);

  // Lazy-load html2canvas
  const html2canvas = (await import("html2canvas")).default;

  // Aguarda carregamento de fontes
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = imgData;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Captura um elemento DOM e exporta como Documento PDF A4 em alta resolução
 */
export async function exportElementAsPdf(
  elementId: string,
  filename: string = "proposta-de-viagem.pdf",
  orientation: "p" | "l" = "p"
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
    htmlEl.style.setProperty("display", "none", "important");
  });

  // Aguarda carregamento de fontes
  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  // Restaura exibição dos elementos no-print
  originalDisplays.forEach(({ el, display }) => {
    el.style.display = display;
  });

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
}
