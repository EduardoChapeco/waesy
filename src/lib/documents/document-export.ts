/**
 * document-export.ts — Motor Unificado de Exportação Multiformato Client-Side
 *
 * Centraliza geração e download seguro em PDF, PNG, HTML autônomo, Word (.doc),
 * Markdown (.md) e Impressão A4/Widescreen limpa sem duplicação entre Builders.
 */

import {
  exportElementAsImage,
  exportElementAsPdf,
  exportMultipleElementsAsPdf,
} from "@/lib/pdf-export";
import { downloadTextFile, sanitizeProposalFilename } from "@/lib/tourism/proposal-export";
import { resolveProposalCanvasTheme } from "@/lib/tourism/proposal-theme-palettes";

export type DocumentExportFormat = "pdf" | "png" | "html" | "doc" | "md" | "print";

export type DocumentPageFormat =
  | "a4-portrait"
  | "a4-landscape"
  | "presentation-169"
  | "story-916"
  | "letter-portrait";

export interface DocumentExportThemeInput {
  templateId?: string | null;
  canvasBg?: string | null;
  brandColor?: string | null;
}

export interface StandaloneDocumentBuildInput {
  title: string;
  subtitle?: string;
  agencyName: string;
  agencyDocument?: string;
  agencyContact?: string;
  agencyLogoUrl?: string | null;
  bodyHtml?: string | null;
  markdownContent?: string | null;
  pageFormat?: DocumentPageFormat;
  theme?: DocumentExportThemeInput;
}

export interface ExportDocumentBundleOptions {
  format: DocumentExportFormat;
  elementId?: string;
  deckSelector?: string;
  filenameBase: string;
  title: string;
  subtitle?: string;
  agencyName: string;
  agencyDocument?: string;
  agencyContact?: string;
  agencyLogoUrl?: string | null;
  markdownContent?: string | null;
  fallbackHtml?: string | null;
  pageFormat?: DocumentPageFormat;
  theme?: DocumentExportThemeInput;
}

export function escapeHtml(raw: string): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInlineMarkdown(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  return out;
}

function isMarkdownTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) return false;
  const cells = trimmed.slice(1, trimmed.endsWith("|") ? -1 : undefined).split("|");
  return cells.length > 0 && cells.every((c) => /^:?-{3,}:?$/.test(c.trim()));
}

function parseTableCells(line: string): string[] {
  const trimmed = line.trim();
  const inner = trimmed.slice(
    trimmed.startsWith("|") ? 1 : 0,
    trimmed.endsWith("|") ? -1 : undefined,
  );
  return inner.split("|").map((cell) => formatInlineMarkdown(cell.trim()));
}

/**
 * Converte Markdown estruturado (títulos, tabelas GFM, listas e citações) para HTML limpo
 * compatível com impressão A4, arquivos HTML portáteis e importação Word (.doc).
 */
export function markdownToBasicHtml(markdown: string): string {
  const lines = String(markdown ?? "").replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    if (/^---+$/.test(trimmed) || /^\*\*\*+$/.test(trimmed)) {
      out.push('<hr class="doc-hr" />');
      i += 1;
      continue;
    }

    const headingMatch = /^(#{1,4})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const level = Math.min(4, headingMatch[1].length);
      out.push(`<h${level} class="doc-h${level}">${formatInlineMarkdown(headingMatch[2])}</h${level}>`);
      i += 1;
      continue;
    }

    if (
      trimmed.startsWith("|") &&
      i + 1 < lines.length &&
      isMarkdownTableSeparator(lines[i + 1])
    ) {
      const headers = parseTableCells(rawLine);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(parseTableCells(lines[i]));
        i += 1;
      }
      const headHtml = `<thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>`;
      const bodyRows = rows
        .map((r) => `<tr>${r.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
        .join("");
      out.push(`<table class="doc-table">${headHtml}<tbody>${bodyRows}</tbody></table>`);
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(formatInlineMarkdown(lines[i].trim().replace(/^>\s?/, "")));
        i += 1;
      }
      out.push(`<blockquote class="doc-quote">${quoteLines.join("<br />")}</blockquote>`);
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(`<li>${formatInlineMarkdown(lines[i].trim().replace(/^[-*]\s+/, ""))}</li>`);
        i += 1;
      }
      out.push(`<ul class="doc-list">${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(`<li>${formatInlineMarkdown(lines[i].trim().replace(/^\d+\.\s+/, ""))}</li>`);
        i += 1;
      }
      out.push(`<ol class="doc-list">${items.join("")}</ol>`);
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^#{1,4}\s+/.test(lines[i].trim()) &&
      !/^[-*]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !lines[i].trim().startsWith(">") &&
      !/^---+$/.test(lines[i].trim()) &&
      !(lines[i].trim().startsWith("|") && i + 1 < lines.length && isMarkdownTableSeparator(lines[i + 1]))
    ) {
      paragraphLines.push(formatInlineMarkdown(lines[i].trim()));
      i += 1;
    }
    if (paragraphLines.length > 0) {
      out.push(`<p class="doc-p">${paragraphLines.join("<br />")}</p>`);
    }
  }

  return out.join("\n");
}

function resolvePageRuleCss(pageFormat: DocumentPageFormat = "a4-portrait"): {
  pageRule: string;
  maxWidth: string;
} {
  if (pageFormat === "a4-landscape") {
    return { pageRule: "A4 landscape", maxWidth: "1123px" };
  }
  if (pageFormat === "presentation-169") {
    return { pageRule: "1280px 720px", maxWidth: "1280px" };
  }
  if (pageFormat === "story-916") {
    return { pageRule: "540px 960px", maxWidth: "540px" };
  }
  if (pageFormat === "letter-portrait") {
    return { pageRule: "letter portrait", maxWidth: "816px" };
  }
  return { pageRule: "A4 portrait", maxWidth: "794px" };
}

function buildResolvedPalette(themeInput?: DocumentExportThemeInput) {
  return resolveProposalCanvasTheme({
    templateId: themeInput?.templateId || "executivo-b2b",
    custom_fields: {
      ...(themeInput?.canvasBg ? { canvas_bg_color: themeInput.canvasBg } : {}),
      ...(themeInput?.brandColor ? { canvas_brand_color: themeInput.brandColor } : {}),
    },
  });
}

function collectActiveDocumentStylesCss(): string {
  if (typeof document === "undefined") return "";
  const chunks: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = Array.from(sheet.cssRules || []);
      for (const rule of rules) {
        chunks.push(rule.cssText);
      }
    } catch {
      if (sheet.href) {
        chunks.push(`@import url("${sheet.href}");`);
      }
    }
  }
  return chunks.join("\n");
}

function sanitizeExportDomNode(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;
  const ignored = clone.querySelectorAll('[data-export-ignore="true"], button[data-ui-only="true"]');
  ignored.forEach((node) => node.remove());
  return clone;
}

/**
 * Captura HTML limpo do palco ativo ou de múltiplas páginas de deck (`.presentation-page`, `.a4-page`).
 */
export function captureRenderedElementHtml(elementId?: string, deckSelector?: string): string | null {
  if (typeof document === "undefined") return null;

  if (deckSelector) {
    const scope = elementId ? document.getElementById(elementId) || document : document;
    const nodes = Array.from(scope.querySelectorAll<HTMLElement>(deckSelector));
    if (nodes.length > 0) {
      return nodes
        .map((node, index) => {
          const clean = sanitizeExportDomNode(node);
          const breakClass = index > 0 ? ' class="page-break-before"' : "";
          return `<section${breakClass}>${clean.outerHTML}</section>`;
        })
        .join("\n");
    }
  }

  if (!elementId) return null;
  const el = document.getElementById(elementId);
  if (!el) return null;
  return sanitizeExportDomNode(el).outerHTML;
}

/**
 * Monta HTML autônomo fiel ao tema institucional, pronto para abertura em navegador e impressão A4.
 */
export function buildStandaloneHtmlDocument(input: StandaloneDocumentBuildInput): string {
  const theme = buildResolvedPalette(input.theme);
  const pageCfg = resolvePageRuleCss(input.pageFormat || "a4-portrait");
  const safeTitle = escapeHtml(input.title || "Documento Oficial");
  const safeSubtitle = escapeHtml(input.subtitle || "");
  const safeAgency = escapeHtml(input.agencyName || "Organização Emissora");
  const safeDoc = escapeHtml(input.agencyDocument || "");
  const safeContact = escapeHtml(input.agencyContact || "");
  const embeddedStyles = input.bodyHtml ? collectActiveDocumentStylesCss() : "";

  const renderedBody = input.bodyHtml
    ? input.bodyHtml
    : `
      <header class="doc-masthead">
        <div class="doc-masthead-brand">
          ${input.agencyLogoUrl ? `<img src="${escapeHtml(input.agencyLogoUrl)}" alt="${safeAgency}" class="doc-logo" />` : ""}
          <div>
            <div class="doc-agency-name">${safeAgency}</div>
            ${safeDoc ? `<div class="doc-agency-meta">${safeDoc}</div>` : ""}
            ${safeContact ? `<div class="doc-agency-meta">${safeContact}</div>` : ""}
          </div>
        </div>
        <div class="doc-masthead-meta">
          <div class="doc-badge">${safeTitle}</div>
          ${safeSubtitle ? `<div class="doc-subtitle">${safeSubtitle}</div>` : ""}
        </div>
      </header>
      <main class="doc-markdown-body">
        ${markdownToBasicHtml(input.markdownContent || "")}
      </main>
    `;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle} — ${safeAgency}</title>
  <style>
    @page { size: ${pageCfg.pageRule}; margin: 12mm; }
    ${embeddedStyles}
    :root {
      --doc-bg: ${theme.canvasBg};
      --doc-surface: ${theme.surfaceCard};
      --doc-subtle: ${theme.surfaceSubtle};
      --doc-ink: ${theme.ink};
      --doc-muted: ${theme.inkMuted};
      --doc-border: ${theme.border};
      --doc-brand: ${theme.brandColor};
      --doc-brand-fg: ${theme.brandFg};
    }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      margin: 0;
      padding: 24px;
      background: var(--doc-subtle);
      color: var(--doc-ink);
      font-family: ${theme.bodyFont};
      line-height: 1.55;
    }
    .doc-shell {
      max-width: ${pageCfg.maxWidth};
      margin: 0 auto;
      background: var(--doc-surface);
      border: 1px solid var(--doc-border);
      border-radius: 12px;
      overflow: hidden;
    }
    .doc-masthead {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      padding: 28px 32px;
      border-bottom: 2px solid var(--doc-brand);
      background: var(--doc-surface);
    }
    .doc-masthead-brand { display: flex; align-items: center; gap: 14px; }
    .doc-logo { max-height: 48px; max-width: 140px; object-fit: contain; }
    .doc-agency-name { font-family: ${theme.headingFont}; font-size: 18px; font-weight: 700; color: var(--doc-ink); }
    .doc-agency-meta { font-size: 12px; color: var(--doc-muted); margin-top: 2px; }
    .doc-masthead-meta { text-align: right; }
    .doc-badge { display: inline-block; font-size: 13px; font-weight: 700; color: var(--doc-brand); }
    .doc-subtitle { font-size: 12px; color: var(--doc-muted); margin-top: 4px; }
    .doc-markdown-body { padding: 28px 32px; }
    .doc-h1 { font-family: ${theme.headingFont}; font-size: 22px; margin: 0 0 12px; color: var(--doc-ink); }
    .doc-h2 { font-family: ${theme.headingFont}; font-size: 17px; margin: 22px 0 8px; color: var(--doc-brand); border-bottom: 1px solid var(--doc-border); padding-bottom: 4px; }
    .doc-h3, .doc-h4 { font-size: 14px; font-weight: 700; margin: 16px 0 6px; color: var(--doc-ink); }
    .doc-p { font-size: 13px; margin: 8px 0; color: var(--doc-ink); }
    .doc-hr { border: 0; border-top: 1px solid var(--doc-border); margin: 18px 0; }
    .doc-list { margin: 8px 0 12px; padding-left: 20px; font-size: 13px; }
    .doc-list li { margin: 4px 0; }
    .doc-quote { margin: 12px 0; padding: 10px 14px; border-left: 3px solid var(--doc-brand); background: var(--doc-subtle); font-size: 12.5px; color: var(--doc-muted); }
    .doc-table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 12px; }
    .doc-table th, .doc-table td { border: 1px solid var(--doc-border); padding: 8px 10px; text-align: left; vertical-align: top; }
    .doc-table th { background: var(--doc-subtle); font-weight: 700; color: var(--doc-ink); }
    .page-break-before { page-break-before: always; break-before: page; margin-top: 24px; }
    @media print {
      body { padding: 0; background: var(--doc-surface); }
      .doc-shell { max-width: none; border: none; border-radius: 0; }
      .page-break-before { margin-top: 0; }
    }
  </style>
</head>
<body>
  <div class="doc-shell">
    ${renderedBody}
  </div>
</body>
</html>`;
}

/**
 * Monta HTML compatível com Microsoft Word (.doc) / LibreOffice preservando tabelas e A4.
 */
export function buildWordCompatibleDocHtml(input: StandaloneDocumentBuildInput): string {
  const theme = buildResolvedPalette(input.theme);
  const safeTitle = escapeHtml(input.title || "Documento Oficial");
  const safeSubtitle = escapeHtml(input.subtitle || "");
  const safeAgency = escapeHtml(input.agencyName || "Organização Emissora");
  const safeDoc = escapeHtml(input.agencyDocument || "");
  const safeContact = escapeHtml(input.agencyContact || "");
  const isLandscape =
    input.pageFormat === "a4-landscape" || input.pageFormat === "presentation-169";

  const contentBody =
    input.markdownContent && input.markdownContent.trim().length > 0
      ? markdownToBasicHtml(input.markdownContent)
      : input.bodyHtml || "";

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>${safeTitle}</title>
  <style>
    @page WordSection1 {
      size: ${isLandscape ? "29.7cm 21.0cm" : "21.0cm 29.7cm"};
      margin: 1.8cm 1.8cm 1.8cm 1.8cm;
    }
    div.WordSection1 { page: WordSection1; }
    body { font-family: Calibri, Arial, sans-serif; color: ${theme.ink}; font-size: 10.5pt; line-height: 1.45; }
    .header-table { width: 100%; border-collapse: collapse; border-bottom: 2pt solid ${theme.brandColor}; margin-bottom: 14pt; }
    .header-table td { padding: 6pt 0; vertical-align: top; }
    .agency-title { font-size: 14pt; font-weight: bold; color: ${theme.brandColor}; }
    .agency-meta { font-size: 8.5pt; color: ${theme.inkMuted}; }
    .doc-h1 { font-size: 16pt; font-weight: bold; color: ${theme.ink}; margin: 12pt 0 6pt; }
    .doc-h2 { font-size: 12pt; font-weight: bold; color: ${theme.brandColor}; border-bottom: 0.75pt solid ${theme.border}; padding-bottom: 2pt; margin: 14pt 0 6pt; }
    .doc-h3, .doc-h4 { font-size: 10.5pt; font-weight: bold; margin: 10pt 0 4pt; }
    .doc-p { margin: 5pt 0; }
    .doc-table { width: 100%; border-collapse: collapse; margin: 8pt 0; font-size: 9.5pt; }
    .doc-table th, .doc-table td { border: 0.75pt solid ${theme.border}; padding: 5pt 7pt; text-align: left; }
    .doc-table th { background: ${theme.surfaceSubtle}; font-weight: bold; }
    .doc-quote { border-left: 3pt solid ${theme.brandColor}; padding: 6pt 10pt; background: ${theme.surfaceSubtle}; margin: 8pt 0; }
    .doc-hr { border: 0; border-top: 0.75pt solid ${theme.border}; margin: 10pt 0; }
    .doc-list { margin: 4pt 0 8pt 16pt; }
  </style>
</head>
<body>
  <div class="WordSection1">
    <table class="header-table">
      <tr>
        <td>
          <div class="agency-title">${safeAgency}</div>
          ${safeDoc ? `<div class="agency-meta">${safeDoc}</div>` : ""}
          ${safeContact ? `<div class="agency-meta">${safeContact}</div>` : ""}
        </td>
        <td style="text-align:right;">
          <div style="font-size:11pt;font-weight:bold;">${safeTitle}</div>
          ${safeSubtitle ? `<div class="agency-meta">${safeSubtitle}</div>` : ""}
        </td>
      </tr>
    </table>
    ${contentBody}
  </div>
</body>
</html>`;
}

export function exportDocumentAsHtml(
  input: StandaloneDocumentBuildInput & { filenameBase: string },
): void {
  const html = buildStandaloneHtmlDocument(input);
  const filename = sanitizeProposalFilename(input.filenameBase, "html");
  downloadTextFile(html, filename, "text/html;charset=utf-8");
}

export function exportDocumentAsWordDoc(
  input: StandaloneDocumentBuildInput & { filenameBase: string },
): void {
  const docHtml = buildWordCompatibleDocHtml(input);
  const filename = sanitizeProposalFilename(input.filenameBase, "doc");
  downloadTextFile(docHtml, filename, "application/msword;charset=utf-8");
}

export function exportDocumentAsMarkdown(input: {
  filenameBase: string;
  title: string;
  agencyName?: string;
  contentMarkdown: string;
}): void {
  const header = input.agencyName
    ? `<!-- Documento: ${input.title} | Emissor: ${input.agencyName} -->\n\n`
    : `<!-- Documento: ${input.title} -->\n\n`;
  const filename = sanitizeProposalFilename(input.filenameBase, "md");
  downloadTextFile(`${header}${input.contentMarkdown}`, filename, "text/markdown;charset=utf-8");
}

export function printCleanDocument(input: StandaloneDocumentBuildInput): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  const html = buildStandaloneHtmlDocument(input);
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.className = "fixed inset-0 w-0 h-0 border-0 pointer-events-none opacity-0";
  document.body.appendChild(iframe);

  const cleanup = () => {
    window.setTimeout(() => {
      if (iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
    }, 1000);
  };

  try {
    const doc = iframe.contentWindow?.document;
    if (!doc || !iframe.contentWindow) {
      cleanup();
      window.print();
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    window.setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.print();
      } finally {
        cleanup();
      }
    }, 180);
  } catch {
    cleanup();
    window.print();
  }
}

/**
 * Dispatcher unificado para qualquer Studio/Builder (PDF, PNG, HTML, Word .doc, Markdown e Impressão).
 */
export async function exportDocumentBundle(
  options: ExportDocumentBundleOptions,
): Promise<{ ok: boolean; format: DocumentExportFormat }> {
  const {
    format,
    elementId,
    deckSelector,
    filenameBase,
    title,
    subtitle,
    agencyName,
    agencyDocument,
    agencyContact,
    agencyLogoUrl,
    markdownContent,
    fallbackHtml,
    pageFormat = "a4-portrait",
    theme,
  } = options;

  const isLandscape =
    pageFormat === "a4-landscape" || pageFormat === "presentation-169";

  if (format === "pdf") {
    if (deckSelector && typeof document !== "undefined") {
      const scope = elementId ? document.getElementById(elementId) || document : document;
      const deckNodes = Array.from(scope.querySelectorAll<HTMLElement>(deckSelector));
      if (deckNodes.length > 1) {
        await exportMultipleElementsAsPdf(
          deckNodes,
          sanitizeProposalFilename(filenameBase, "pdf"),
        );
        return { ok: true, format };
      }
    }
    if (!elementId) {
      throw new Error("Elemento de visualização ausente para exportação em PDF.");
    }
    await exportElementAsPdf(
      elementId,
      sanitizeProposalFilename(filenameBase, "pdf"),
      isLandscape ? "l" : "p",
    );
    return { ok: true, format };
  }

  if (format === "png") {
    let target: HTMLElement | string | null = elementId || null;
    if (deckSelector && typeof document !== "undefined") {
      const scope = elementId ? document.getElementById(elementId) || document : document;
      const firstSlide = scope.querySelector<HTMLElement>(deckSelector);
      if (firstSlide) target = firstSlide;
    }
    if (!target) {
      throw new Error("Palco visual ausente para exportação em PNG.");
    }
    await exportElementAsImage(target, {
      filename: sanitizeProposalFilename(filenameBase, "png"),
      scale: 2,
    });
    return { ok: true, format };
  }

  const capturedHtml = captureRenderedElementHtml(elementId, deckSelector) || fallbackHtml;

  if (format === "html") {
    exportDocumentAsHtml({
      filenameBase,
      title,
      subtitle,
      agencyName,
      agencyDocument,
      agencyContact,
      agencyLogoUrl,
      bodyHtml: capturedHtml,
      markdownContent,
      pageFormat,
      theme,
    });
    return { ok: true, format };
  }

  if (format === "doc") {
    exportDocumentAsWordDoc({
      filenameBase,
      title,
      subtitle,
      agencyName,
      agencyDocument,
      agencyContact,
      agencyLogoUrl,
      bodyHtml: capturedHtml,
      markdownContent,
      pageFormat,
      theme,
    });
    return { ok: true, format };
  }

  if (format === "md") {
    const resolvedMd =
      markdownContent && markdownContent.trim().length > 0
        ? markdownContent
        : `# ${title}\n\n${subtitle ? `${subtitle}\n\n` : ""}**Emissor:** ${agencyName}\n`;
    exportDocumentAsMarkdown({
      filenameBase,
      title,
      agencyName,
      contentMarkdown: resolvedMd,
    });
    return { ok: true, format };
  }

  printCleanDocument({
    title,
    subtitle,
    agencyName,
    agencyDocument,
    agencyContact,
    agencyLogoUrl,
    bodyHtml: capturedHtml,
    markdownContent,
    pageFormat,
    theme,
  });
  return { ok: true, format };
}

export async function exportStudioDocument(
  format: DocumentExportFormat,
  options: Omit<ExportDocumentBundleOptions, "format">,
): Promise<{ ok: boolean; format: DocumentExportFormat }> {
  return exportDocumentBundle({
    ...options,
    format,
  });
}
