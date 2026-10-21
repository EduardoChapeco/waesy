import { renderSVG } from "uqr";

/**
 * Utilitário Soberano para Geração de QR Code 100% Offline (Sem APIs de terceiros).
 * Garante privacidade absoluta (zero vazamento de dados), resiliência em locais sem internet
 * e renderização vetorial cristalina com SVG.
 */

export interface QrCodeOptions {
  border?: number;
  whiteColor?: string;
  blackColor?: string;
}

/**
 * Gera o conteúdo XML/SVG de um QR Code.
 */
export function generateQrCodeSvg(text: string, options?: QrCodeOptions): string {
  if (!text) return "";
  try {
    return renderSVG(text, {
      border: options?.border ?? 2,
      whiteColor: options?.whiteColor ?? "white",
      blackColor: options?.blackColor ?? "black",
    });
  } catch (err) {
    console.error("[qr-code] Erro ao renderizar SVG do QR Code:", err);
    return "";
  }
}

/**
 * Gera Data URI (`data:image/svg+xml;utf8,...`) para uso direto em elementos <img>.
 */
export function generateQrCodeDataUri(text: string, options?: QrCodeOptions): string {
  const svg = generateQrCodeSvg(text, options);
  if (!svg) return "";
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
