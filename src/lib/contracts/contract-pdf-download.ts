import { formatDate } from "@/lib/datetime";
import { TOKEN_HEX } from "@/lib/design-tokens";

export interface PrintableContractSigner {
  name: string;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  role?: string | null;
  status: string;
  viewedAt?: string | null;
  signedAt?: string | null;
  ipAddress?: string | null;
  signatureImageUrl?: string | null;
}

export interface ContractPdfPackageInput {
  title: string;
  categoryLabel: string;
  statusLabel: string;
  contentMarkdown: string;
  verificationCode?: string | null;
  hashSha256?: string | null;
  sealedAt?: string | null;
  sourceFileSignedUrl?: string | null;
  sourceFileName?: string | null;
  signers: PrintableContractSigner[];
}

function escapeHtml(text: string): string {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSimpleMarkdownToPrintHtml(markdown: string): string {
  const lines = (markdown || "").split(/\r?\n/);
  const out: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      out.push('<div style="height:8px"></div>');
      continue;
    }
    if (/^---+$/.test(line)) {
      out.push(`<hr style="border:none;border-top:1px solid ${TOKEN_HEX.neutral300};margin:16px 0;" />`);
      continue;
    }
    const safe = escapeHtml(line).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    if (line.startsWith("# ")) {
      out.push(`<h1 style="font-size:18px;font-weight:700;margin:14px 0 8px;">${safe.slice(2)}</h1>`);
    } else if (line.startsWith("## ")) {
      out.push(`<h2 style="font-size:15px;font-weight:700;margin:12px 0 6px;">${safe.slice(3)}</h2>`);
    } else if (line.startsWith("### ")) {
      out.push(`<h3 style="font-size:13px;font-weight:700;margin:10px 0 4px;">${safe.slice(4)}</h3>`);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      out.push(`<p style="font-size:12px;line-height:1.55;margin:3px 0 3px 16px;">• ${safe.slice(2)}</p>`);
    } else {
      out.push(`<p style="font-size:12px;line-height:1.6;margin:4px 0;">${safe}</p>`);
    }
  }

  return out.join("\n");
}

/**
 * Abre pacote documental A4 imprimivel / salvavel como PDF (Documento + Assinaturas + Certificado SHA-256)
 * ou gera PDF direto via jsPDF quando disponivel no cliente.
 */
export async function downloadSignedContractPackagePdf(input: ContractPdfPackageInput): Promise<void> {
  if (typeof window === "undefined") return;

  const verifyUrl = input.verificationCode
    ? `${window.location.origin}/verify/document/${input.verificationCode}`
    : null;

  const signerBlocksHtml = input.signers
    .map((signer) => {
      const signedBadge =
        signer.status === "signed"
          ? `Assinado em ${signer.signedAt ? formatDate(signer.signedAt) : "data registrada"}`
          : signer.viewedAt
            ? `Visualizado em ${formatDate(signer.viewedAt)} (Aguardando assinatura)`
            : "Aguardando assinatura";

      const imgHtml =
        signer.status === "signed" && signer.signatureImageUrl
          ? `<img src="${escapeHtml(signer.signatureImageUrl)}" alt="Assinatura" style="max-height:56px;max-width:220px;object-fit:contain;margin-bottom:6px;display:block;" />`
          : `<div style="height:40px;border-bottom:1px solid ${TOKEN_HEX.neutral400};width:220px;margin-bottom:6px;"></div>`;

      return `
        <div style="border:1px solid ${TOKEN_HEX.neutral300};border-radius:8px;padding:12px;background:${TOKEN_HEX.white};break-inside:avoid;">
          ${imgHtml}
          <div style="font-size:12px;font-weight:700;color:${TOKEN_HEX.neutral900};">${escapeHtml(signer.name)}</div>
          <div style="font-size:11px;color:${TOKEN_HEX.neutral600};">${escapeHtml(signer.email || signer.phone || "Signatario")}${signer.document ? ` · CPF/Doc: ${escapeHtml(signer.document)}` : ""}</div>
          <div style="font-size:11px;margin-top:4px;font-weight:600;color:${signer.status === "signed" ? TOKEN_HEX.green700 : TOKEN_HEX.amber700};">${escapeHtml(signedBadge)}</div>
          ${signer.ipAddress ? `<div style="font-size:10px;color:${TOKEN_HEX.neutral500};font-family:monospace;">IP: ${escapeHtml(signer.ipAddress)}</div>` : ""}
        </div>
      `;
    })
    .join("");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.title)} — Documento e Certificado</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: "Inter", Arial, sans-serif; color: ${TOKEN_HEX.neutral900}; margin: 0; padding: 0; background: ${TOKEN_HEX.white}; }
    .header { border-bottom: 2px solid ${TOKEN_HEX.neutral900}; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
    .meta { font-size: 11px; color: ${TOKEN_HEX.neutral600}; margin-top: 4px; }
    .section { margin-top: 22px; padding-top: 14px; border-top: 1px solid ${TOKEN_HEX.neutral300}; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 10px; }
    .hash-box { background: ${TOKEN_HEX.neutral50}; border: 1px solid ${TOKEN_HEX.neutral300}; border-radius: 6px; padding: 10px; font-family: monospace; font-size: 10px; word-break: break-all; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:${TOKEN_HEX.neutral600};">${escapeHtml(input.categoryLabel)}</div>
      <h1 style="font-size:18px;margin:4px 0 0;">${escapeHtml(input.title)}</h1>
      <div class="meta">Status: <strong>${escapeHtml(input.statusLabel)}</strong>${input.sealedAt ? ` · Selado em ${escapeHtml(formatDate(input.sealedAt))}` : ""}</div>
    </div>
    ${input.verificationCode ? `<div style="text-align:right;font-family:monospace;font-size:11px;">Codigo: <strong>${escapeHtml(input.verificationCode)}</strong></div>` : ""}
  </div>

  <div>
    ${
      input.contentMarkdown?.trim()
        ? renderSimpleMarkdownToPrintHtml(input.contentMarkdown)
        : `<p style="font-size:12px;color:${TOKEN_HEX.neutral700};">Documento baseado em arquivo original anexado: <strong>${escapeHtml(input.sourceFileName || "Arquivo Original")}</strong>.</p>`
    }
  </div>

  <div class="section">
    <h2 style="font-size:14px;margin:0 0 8px;">Protocolo de Assinaturas e Evidencias</h2>
    <div class="grid">${signerBlocksHtml}</div>
    ${
      input.hashSha256
        ? `<div class="hash-box"><strong>SHA-256 da Versao Selada:</strong> ${escapeHtml(input.hashSha256)}${verifyUrl ? `<br/><strong>Validacao Publica:</strong> ${escapeHtml(verifyUrl)}` : ""}</div>`
        : ""
    }
  </div>
</body>
</html>`;

  const printWin = window.open("", "_blank", "noopener,noreferrer");
  if (printWin) {
    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 300);
    return;
  }

  // Fallback direto com jsPDF quando popup for bloqueado
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const lines = pdf.splitTextToSize(
    [
      input.title,
      `${input.categoryLabel} | Status: ${input.statusLabel}`,
      input.hashSha256 ? `SHA-256: ${input.hashSha256}` : "",
      "",
      input.contentMarkdown || `Documento original: ${input.sourceFileName || "Anexado"}`,
      "",
      "ASSINATURAS:",
      ...input.signers.map(
        (s) =>
          `- ${s.name} (${s.status === "signed" ? `Assinado ${s.signedAt || ""}` : "Pendente"})`,
      ),
    ]
      .filter(Boolean)
      .join("\n"),
    175,
  );
  let y = 18;
  for (const l of lines) {
    if (y > 275) {
      pdf.addPage();
      y = 18;
    }
    pdf.setFontSize(10);
    pdf.text(l, 16, y);
    y += 5;
  }
  const safeName = (input.title || "contrato")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  pdf.save(`${safeName || "contrato"}-certificado.pdf`);
}
