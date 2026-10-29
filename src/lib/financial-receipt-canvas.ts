/**
 * ============================================================================
 * Waesy Platform — financial-receipt-canvas.ts (Canvas Receipt Generator)
 * ============================================================================
 * Gerador de comprovante financeiro gráfico em alta resolução (2x Retina):
 * - Renderiza o comprovante bancário oficial padrão SPB / 99Pay / Banco Central.
 * - Suporta exportação direta como imagem PNG e compartilhamento nativo via Web Share API.
 * Ref: Prints Screenshot_2026-10-26-08-34-20-285_com.taxis99.jpg
 * ============================================================================
 */

import { formatCents } from "@/lib/utils";

export interface FinancialReceiptData {
  transactionId: string;
  amountCents: number;
  date: Date | string;
  senderName: string;
  senderDocumentMasked?: string;
  senderBank?: string;
  recipientName: string;
  recipientDocumentMasked?: string;
  recipientBank?: string;
  pixKey?: string;
  description?: string;
}

/**
 * Renderiza um canvas 2x nítido com layout oficial de comprovante bancário.
 */
export async function renderFinancialReceiptCanvas(
  data: FinancialReceiptData
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  const width = 800;
  const height = 1100;
  const scale = 2; // Retina 2x

  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível inicializar o contexto 2D do Canvas");

  ctx.scale(scale, scale);

  // Fundo Branco Limpo
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, width, height);

  // Faixa Superior Suave
  ctx.fillStyle = "#F8FAFC";
  ctx.fillRect(0, 0, width, 180);

  // Linha divisória suave
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 180);
  ctx.lineTo(width, 180);
  ctx.stroke();

  // Marca Waesy Bank
  ctx.fillStyle = "#0F172A";
  ctx.font = "bold 26px system-ui, -apple-system, sans-serif";
  ctx.fillText("WAESY BANK", 60, 70);

  ctx.fillStyle = "#64748B";
  ctx.font = "500 14px system-ui, -apple-system, sans-serif";
  ctx.fillText("Comprovante Oficial de Transferência Pix", 60, 95);

  // Status Concluído
  ctx.fillStyle = "#10B981";
  ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
  ctx.fillText(" CONCLUÍDO", 60, 140);

  const formattedDate =
    typeof data.date === "string"
      ? data.date
      : data.date.toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });

  ctx.fillStyle = "#64748B";
  ctx.font = "500 13px system-ui, -apple-system, sans-serif";
  ctx.fillText(formattedDate, 180, 140);

  // Valor em Destaque
  ctx.fillStyle = "#64748B";
  ctx.font = "600 14px system-ui, -apple-system, sans-serif";
  ctx.fillText("VALOR DA TRANSFERÊNCIA", 60, 230);

  ctx.fillStyle = "#0F172A";
  ctx.font = "black 38px monospace, system-ui, sans-serif";
  ctx.fillText(formatCents(data.amountCents), 60, 275);

  let curY = 330;

  function drawSection(title: string, rows: Array<[string, string]>) {
    if (!ctx) return;
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 16px system-ui, -apple-system, sans-serif";
    ctx.fillText(title, 60, curY);
    curY += 12;

    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, curY);
    ctx.lineTo(width - 60, curY);
    ctx.stroke();
    curY += 24;

    for (const [label, val] of rows) {
      ctx.fillStyle = "#64748B";
      ctx.font = "500 13px system-ui, -apple-system, sans-serif";
      ctx.fillText(label, 60, curY);

      ctx.fillStyle = "#0F172A";
      ctx.font = "bold 14px system-ui, -apple-system, sans-serif";
      const valWidth = ctx.measureText(val).width;
      ctx.fillText(val, width - 60 - valWidth, curY);

      curY += 28;
    }
    curY += 16;
  }

  // Seção Destinatário
  drawSection("Dados do Destinatário", [
    ["Nome", data.recipientName || "Não informado"],
    ["CPF/CNPJ", data.recipientDocumentMasked || "***.***.***-**"],
    ["Instituição", data.recipientBank || "Waesy Pagamentos IP S.A."],
    ["Chave Pix", data.pixKey || "Chave direta"],
  ]);

  // Seção Pagador
  drawSection("Dados do Pagador", [
    ["Nome", data.senderName || "Você"],
    ["CPF", data.senderDocumentMasked || "***.***.***-**"],
    ["Instituição", data.senderBank || "WAESY BANK (0001)"],
  ]);

  // Autenticação e Protocolo
  drawSection("Autenticação e Protocolo", [
    ["Código da Agência", "0001 - WAESY SEDE"],
    ["ID da Transação", data.transactionId],
    ["Tarifa Cobrada", "R$ 0,00 (Gratuito)"],
  ]);

  // Rodapé Oficial
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, height - 90);
  ctx.lineTo(width - 60, height - 90);
  ctx.stroke();

  ctx.fillStyle = "#94A3B8";
  ctx.font = "500 11px system-ui, -apple-system, sans-serif";
  ctx.fillText(
    "Comprovante gerado digitalmente pela Waesy Plataforma IP • Válido em todo território nacional.",
    60,
    height - 60
  );
  ctx.fillText(
    "Em caso de dúvidas, consulte nossa Central de Ajuda no app ou pelo site waesy.com",
    60,
    height - 42
  );

  return canvas;
}

/**
 * Faz o download do comprovante em formato PNG de alta definição.
 */
export async function downloadFinancialReceiptImage(
  data: FinancialReceiptData,
  fileName?: string
): Promise<void> {
  const canvas = await renderFinancialReceiptCanvas(data);
  const dataUrl = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName || `comprovante-waesy-${data.transactionId}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Compartilha o comprovante via Web Share API se suportado, senão faz download.
 */
export async function shareFinancialReceipt(
  data: FinancialReceiptData
): Promise<void> {
  const canvas = await renderFinancialReceiptCanvas(data);

  if (typeof navigator !== "undefined" && navigator.share && canvas.toBlob) {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        await downloadFinancialReceiptImage(data);
        return;
      }
      const file = new File([blob], `comprovante-${data.transactionId}.png`, {
        type: "image/png",
      });

      try {
        await navigator.share({
          title: "Comprovante Waesy Bank",
          text: `Comprovante de transferência Pix no valor de ${formatCents(
            data.amountCents
          )} para ${data.recipientName}.`,
          files: [file],
        });
      } catch {
        // Se usuário cancelar o share ou der fallback
        await downloadFinancialReceiptImage(data);
      }
    });
  } else {
    await downloadFinancialReceiptImage(data);
  }
}
