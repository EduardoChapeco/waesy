import { getNicheContractBlueprint } from "@/lib/niches/unified-field-bridge";
import { resolveUnifiedNicheId } from "@/lib/niches/niche-ssot";

export type UploadedContractDocKind = "pdf" | "docx" | "markdown" | "text" | "image";

export interface ParsedUploadedContractDocument {
  kind: UploadedContractDocKind;
  title: string;
  markdown: string;
  pageCount: number;
  pagesMarkdown: string[];
  mimeType: string;
}

export interface ContractNicheProfile {
  nicheId: string;
  isTourism: boolean;
  defaultCategory: string;
  defaultTemplateId: string;
  allowedSemanticGroups: string[];
  preferredTemplateCategories: string[];
  allowTravelProposalsImport: boolean;
}

const CHARS_PER_A4_PAGE = 2600;

function stripExtensionTitle(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^.]+$/, "");
  const cleaned = withoutExt.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || "Documento Contratual";
}

function decodeXmlEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, num) => {
      const code = Number(num);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    });
}

async function inflateRawBytes(compressed: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream !== "undefined") {
    const bufferSlice = compressed.buffer.slice(
      compressed.byteOffset,
      compressed.byteOffset + compressed.byteLength,
    ) as ArrayBuffer;
    const stream = new Blob([bufferSlice]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const buf = await new Response(stream).arrayBuffer();
    return new Uint8Array(buf);
  }
  const zlib = await import("node:zlib");
  return new Uint8Array(zlib.inflateRawSync(compressed));
}

function readUint16LE(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32LE(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

/**
 * Extrai uma entrada especifica de um arquivo ZIP (ex.: word/document.xml em .docx)
 * usando o Central Directory para suportar entradas com Data Descriptor.
 */
export async function extractZipEntryBytes(
  zipBytes: Uint8Array,
  targetEntryPath: string,
): Promise<Uint8Array | null> {
  if (zipBytes.length < 22) return null;

  // Localiza End of Central Directory (PK\x05\x06) de tras para frente (max comment 64KB)
  const searchStart = Math.max(0, zipBytes.length - 65558);
  let eocdOffset = -1;
  for (let i = zipBytes.length - 22; i >= searchStart; i--) {
    if (
      zipBytes[i] === 0x50 &&
      zipBytes[i + 1] === 0x4b &&
      zipBytes[i + 2] === 0x05 &&
      zipBytes[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) return null;

  const centralDirSize = readUint32LE(zipBytes, eocdOffset + 12);
  const centralDirOffset = readUint32LE(zipBytes, eocdOffset + 16);
  const centralDirEnd = Math.min(zipBytes.length, centralDirOffset + centralDirSize);
  const decoder = new TextDecoder("utf-8");

  let cursor = centralDirOffset;
  while (cursor + 46 <= centralDirEnd) {
    if (
      zipBytes[cursor] !== 0x50 ||
      zipBytes[cursor + 1] !== 0x4b ||
      zipBytes[cursor + 2] !== 0x01 ||
      zipBytes[cursor + 3] !== 0x02
    ) {
      break;
    }

    const compressionMethod = readUint16LE(zipBytes, cursor + 10);
    const compressedSize = readUint32LE(zipBytes, cursor + 20);
    const nameLength = readUint16LE(zipBytes, cursor + 28);
    const extraLength = readUint16LE(zipBytes, cursor + 30);
    const commentLength = readUint16LE(zipBytes, cursor + 32);
    const localHeaderOffset = readUint32LE(zipBytes, cursor + 42);

    const entryName = decoder.decode(zipBytes.subarray(cursor + 46, cursor + 46 + nameLength));
    cursor += 46 + nameLength + extraLength + commentLength;

    if (entryName !== targetEntryPath) continue;

    if (
      localHeaderOffset + 30 > zipBytes.length ||
      zipBytes[localHeaderOffset] !== 0x50 ||
      zipBytes[localHeaderOffset + 1] !== 0x4b ||
      zipBytes[localHeaderOffset + 2] !== 0x03 ||
      zipBytes[localHeaderOffset + 3] !== 0x04
    ) {
      return null;
    }

    const localNameLen = readUint16LE(zipBytes, localHeaderOffset + 26);
    const localExtraLen = readUint16LE(zipBytes, localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const dataEnd = Math.min(zipBytes.length, dataStart + compressedSize);
    const payload = zipBytes.subarray(dataStart, dataEnd);

    if (compressionMethod === 0) return payload;
    if (compressionMethod === 8) return inflateRawBytes(payload);
    throw new Error(`Metodo ZIP nao suportado no arquivo DOCX (${compressionMethod}).`);
  }

  return null;
}

/**
 * Converte XML do Word (word/document.xml) em Markdown limpo preservando
 * titulos, negrito, listas, tabelas GFM e quebras de pagina explicitas.
 */
export function convertWordDocumentXmlToMarkdown(xmlContent: string): {
  markdown: string;
  pagesMarkdown: string[];
} {
  if (!xmlContent) return { markdown: "", pagesMarkdown: [""] };

  const normalized = xmlContent.replace(/\r?\n/g, "");
  const pageChunks: string[] = [];
  let currentLines: string[] = [];

  // Processa blocos top-level dentro de <w:body> (paragrafos e tabelas)
  const bodyMatch = normalized.match(/<w:body[^>]*>([\s\S]*?)<\/w:body>/i);
  const body = bodyMatch ? bodyMatch[1] : normalized;
  const blockRegex = /<w:(tbl|p)\b[^>]*>[\s\S]*?<\/w:\1>/gi;

  const extractRunText = (segment: string): string => {
    const runs: string[] = [];
    const runRegex = /<w:r\b[^>]*>([\s\S]*?)<\/w:r>/gi;
    let rMatch: RegExpExecArray | null;
    while ((rMatch = runRegex.exec(segment)) !== null) {
      const rInner = rMatch[1];
      const textParts: string[] = [];
      const tRegex = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/>|<w:br\b([^>]*)\/>/gi;
      let tMatch: RegExpExecArray | null;
      while ((tMatch = tRegex.exec(rInner)) !== null) {
        if (tMatch[1] !== undefined) {
          textParts.push(decodeXmlEntities(tMatch[1]));
        } else if (/w:tab/i.test(tMatch[0])) {
          textParts.push(" ");
        } else if (tMatch[2] && /w:type=["']page["']/i.test(tMatch[2])) {
          textParts.push("\n---WAESY_PAGE_BREAK---\n");
        } else {
          textParts.push("  \n");
        }
      }
      let txt = textParts.join("");
      if (!txt) continue;
      const isBold = /<w:b\b(?![^>]*val=["']0["'])/i.test(rInner);
      const isItalic = /<w:i\b(?![^>]*val=["']0["'])/i.test(rInner);
      const trimmed = txt.trim();
      if (trimmed && !trimmed.includes("---WAESY_PAGE_BREAK---")) {
        const leadingSpace = /^\s+/.test(txt) ? " " : "";
        const trailingSpace = /\s+$/.test(txt) ? " " : "";
        if (isBold && isItalic) txt = `${leadingSpace}***${trimmed}***${trailingSpace}`;
        else if (isBold) txt = `${leadingSpace}**${trimmed}**${trailingSpace}`;
        else if (isItalic) txt = `${leadingSpace}*${trimmed}*${trailingSpace}`;
      }
      runs.push(txt);
    }
    if (runs.length > 0) return runs.join("").trim();
    return decodeXmlEntities(segment.replace(/<[^>]+>/g, "")).trim();
  };

  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = blockRegex.exec(body)) !== null) {
    const tag = blockMatch[1].toLowerCase();
    const xmlBlock = blockMatch[0];

    if (tag === "tbl") {
      const rowMatches = xmlBlock.match(/<w:tr\b[^>]*>[\s\S]*?<\/w:tr>/gi) || [];
      const parsedRows: string[][] = [];
      for (const rowXml of rowMatches) {
        const cellMatches = rowXml.match(/<w:tc\b[^>]*>[\s\S]*?<\/w:tc>/gi) || [];
        const cells = cellMatches.map((cellXml) =>
          extractRunText(cellXml)
            .replace(/\s*\n\s*/g, " ")
            .replace(/\|/g, "\\|")
            .trim(),
        );
        if (cells.length > 0) parsedRows.push(cells);
      }
      if (parsedRows.length > 0) {
        const colCount = Math.max(...parsedRows.map((r) => r.length));
        const header = parsedRows[0].concat(Array(Math.max(0, colCount - parsedRows[0].length)).fill(""));
        const separator = Array(colCount).fill("---");
        const tableLines = [
          `| ${header.join(" | ")} |`,
          `| ${separator.join(" | ")} |`,
          ...parsedRows.slice(1).map((r) => {
            const padded = r.concat(Array(Math.max(0, colCount - r.length)).fill(""));
            return `| ${padded.join(" | ")} |`;
          }),
        ];
        currentLines.push(tableLines.join("\n"));
      }
      continue;
    }

    const hasExplicitPageBreak =
      /<w:br\b[^>]*w:type=["']page["']/i.test(xmlBlock) || /<w:lastRenderedPageBreak/i.test(xmlBlock);
    const pStyleMatch = xmlBlock.match(/<w:pStyle\b[^>]*w:val=["']([^"']+)["']/i);
    const styleName = (pStyleMatch?.[1] || "").toLowerCase();
    const isList = /<w:numPr\b/i.test(xmlBlock);

    let lineText = extractRunText(xmlBlock);
    if (lineText.includes("---WAESY_PAGE_BREAK---")) {
      const parts = lineText.split("---WAESY_PAGE_BREAK---");
      if (parts[0]?.trim()) currentLines.push(parts[0].trim());
      pageChunks.push(currentLines.join("\n\n").trim());
      currentLines = [];
      lineText = parts.slice(1).join(" ").trim();
    }

    if (lineText) {
      const plainHeading = lineText.replace(/\*\*/g, "").trim();
      if (styleName.includes("title") || styleName.includes("heading1") || styleName === "1") {
        currentLines.push(`# ${plainHeading}`);
      } else if (styleName.includes("heading2") || styleName === "2") {
        currentLines.push(`## ${plainHeading}`);
      } else if (styleName.includes("heading") || styleName === "3") {
        currentLines.push(`### ${plainHeading}`);
      } else if (isList) {
        currentLines.push(`- ${lineText}`);
      } else {
        currentLines.push(lineText);
      }
    } else if (hasExplicitPageBreak && currentLines.length > 0) {
      pageChunks.push(currentLines.join("\n\n").trim());
      currentLines = [];
    }
  }

  const trailing = currentLines.join("\n\n").trim();
  if (trailing || pageChunks.length === 0) {
    pageChunks.push(trailing);
  }

  const nonEmptyPages = pageChunks.filter((p) => p.trim().length > 0);
  const pages = nonEmptyPages.length > 0 ? nonEmptyPages : [""];
  return {
    markdown: pages.join("\n\n---\n\n"),
    pagesMarkdown: pages,
  };
}

/**
 * Estima a quantidade exata de paginas de um binario PDF inspecionando dicionarios `/Type /Page`.
 */
export function detectPdfPageCount(pdfBytes: Uint8Array): number {
  if (!pdfBytes || pdfBytes.length < 8) return 1;
  const sampleLimit = Math.min(pdfBytes.length, 4_000_000);
  const ascii = new TextDecoder("latin1").decode(pdfBytes.subarray(0, sampleLimit));

  // Preferir /Count dentro do dicionario raiz de /Pages quando legivel
  const countMatches = [...ascii.matchAll(/\/Type\s*\/Pages\b[\s\S]{0,240}?\/Count\s+(\d+)/g)];
  if (countMatches.length > 0) {
    const counts = countMatches
      .map((m) => Number(m[1]))
      .filter((n) => Number.isFinite(n) && n >= 1 && n <= 300);
    if (counts.length > 0) {
      return Math.max(...counts);
    }
  }

  const leafPages = ascii.match(/\/Type\s*\/Page\b(?!s)/g);
  if (leafPages && leafPages.length > 0) {
    return Math.min(300, leafPages.length);
  }

  return 1;
}

/**
 * Divide Markdown contratual em paginas A4 logicas respeitando divisores explicitos (`---`)
 * e limite de caracteres por folha, para preview fiel no canvas de posicionamento.
 */
export function paginateContractMarkdown(markdown: string, targetMinPages = 1): string[] {
  const clean = (markdown || "").trim();
  if (!clean) {
    return Array.from({ length: Math.max(1, targetMinPages) }, () => "");
  }

  const explicitSections = clean
    .split(/\n\s*---+\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  const pages: string[] = [];
  for (const section of explicitSections.length > 0 ? explicitSections : [clean]) {
    if (section.length <= CHARS_PER_A4_PAGE) {
      pages.push(section);
      continue;
    }

    const paragraphs = section.split(/\n\n+/);
    let buffer = "";
    for (const para of paragraphs) {
      if (buffer.length > 0 && buffer.length + para.length + 2 > CHARS_PER_A4_PAGE) {
        pages.push(buffer.trim());
        buffer = para;
      } else {
        buffer = buffer ? `${buffer}\n\n${para}` : para;
      }
    }
    if (buffer.trim()) {
      pages.push(buffer.trim());
    }
  }

  while (pages.length < Math.max(1, targetMinPages)) {
    pages.push("");
  }

  return pages;
}

/**
 * Processa arquivos reais carregados (.pdf, .docx, .md, .txt, imagens) em texto estruturado e contagem de paginas.
 */
export async function parseUploadedContractDocument(input: {
  name: string;
  mimeType: string;
  bytes: Uint8Array;
}): Promise<ParsedUploadedContractDocument> {
  const lowerName = (input.name || "").toLowerCase();
  const mime = (input.mimeType || "").toLowerCase();
  const title = stripExtensionTitle(input.name);

  if (mime === "application/pdf" || lowerName.endsWith(".pdf")) {
    const pageCount = detectPdfPageCount(input.bytes);
    return {
      kind: "pdf",
      title,
      markdown: "",
      pageCount,
      pagesMarkdown: Array.from({ length: pageCount }, (_, i) => `Pagina ${i + 1} do PDF anexado (${input.name})`),
      mimeType: "application/pdf",
    };
  }

  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) {
    const docXmlBytes = await extractZipEntryBytes(input.bytes, "word/document.xml");
    if (!docXmlBytes) {
      throw new Error("Nao foi possivel ler o conteudo interno do arquivo .docx.");
    }
    const xmlStr = new TextDecoder("utf-8").decode(docXmlBytes);
    const { markdown, pagesMarkdown } = convertWordDocumentXmlToMarkdown(xmlStr);
    return {
      kind: "docx",
      title,
      markdown: markdown || `# ${title}\n\n(Documento Word importado sem texto visivel)`,
      pageCount: Math.max(1, pagesMarkdown.length),
      pagesMarkdown: pagesMarkdown.length > 0 ? pagesMarkdown : [markdown],
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }

  if (
    mime.includes("markdown") ||
    mime.startsWith("text/") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".txt")
  ) {
    const rawText = new TextDecoder("utf-8").decode(input.bytes).trim();
    const kind: UploadedContractDocKind = lowerName.endsWith(".md") || mime.includes("markdown") ? "markdown" : "text";
    const pagesMarkdown = paginateContractMarkdown(rawText, 1);
    return {
      kind,
      title,
      markdown: rawText,
      pageCount: Math.max(1, pagesMarkdown.length),
      pagesMarkdown,
      mimeType: kind === "markdown" ? "text/markdown" : "text/plain",
    };
  }

  if (mime.startsWith("image/") || /\.(png|jpe?g|webp)$/.test(lowerName)) {
    return {
      kind: "image",
      title,
      markdown: "",
      pageCount: 1,
      pagesMarkdown: [`Imagem digitalizada anexada (${input.name})`],
      mimeType: mime || "image/png",
    };
  }

  throw new Error("Formato nao suportado. Envie arquivos PDF, DOCX, Markdown (.md), TXT ou imagem.");
}

/**
 * Resolve isolamento semantico completo de templates, variaveis e fontes CRM
 * de acordo com o nicho real da loja ativa (eliminando enviesamento de turismo).
 */
export function resolveContractNicheProfile(storeOrNiche?: unknown): ContractNicheProfile {
  const nicheId = resolveUnifiedNicheId(storeOrNiche);
  const blueprint = getNicheContractBlueprint(nicheId);

  switch (nicheId) {
    case "tourism":
      return {
        nicheId,
        isTourism: true,
        defaultCategory: blueprint.contractCategory || "tourism_package",
        defaultTemplateId: blueprint.defaultTemplateId,
        allowedSemanticGroups: ["geral", "financeiro", "turismo", "juridico", "rh"],
        preferredTemplateCategories: ["tourism", "tourism_package", "service_agreement", "employment"],
        allowTravelProposalsImport: true,
      };
    case "automotive":
      return {
        nicheId,
        isTourism: false,
        defaultCategory: "vehicle_sale",
        defaultTemplateId: blueprint.defaultTemplateId,
        allowedSemanticGroups: ["geral", "financeiro", "automotivo", "juridico", "comodato", "rh"],
        preferredTemplateCategories: ["vehicle_sale", "vehicle_consignation", "service_agreement", "comodato"],
        allowTravelProposalsImport: false,
      };
    case "real_estate":
      return {
        nicheId,
        isTourism: false,
        defaultCategory: "real_estate_rental",
        defaultTemplateId: blueprint.defaultTemplateId,
        allowedSemanticGroups: ["geral", "financeiro", "imobiliario", "juridico", "comodato", "rh"],
        preferredTemplateCategories: ["real_estate_rental", "real_estate_sale", "lease", "service_agreement"],
        allowTravelProposalsImport: false,
      };
    case "retail":
      return {
        nicheId,
        isTourism: false,
        defaultCategory: blueprint.contractCategory || "general_deal",
        defaultTemplateId: blueprint.defaultTemplateId,
        allowedSemanticGroups: ["geral", "financeiro", "condicional", "comodato", "juridico", "rh"],
        preferredTemplateCategories: ["fashion_retail", "pos_retail", "general_deal", "service_agreement", "employment"],
        allowTravelProposalsImport: false,
      };
    case "law_firm":
      return {
        nicheId,
        isTourism: false,
        defaultCategory: "legal_retainer",
        defaultTemplateId: blueprint.defaultTemplateId,
        allowedSemanticGroups: ["geral", "financeiro", "juridico", "imobiliario", "rh"],
        preferredTemplateCategories: ["legal_retainer", "service_agreement", "ndas", "general_deal"],
        allowTravelProposalsImport: false,
      };
    case "aesthetics_clinic":
    case "healthcare":
    case "dental":
    case "psychology":
    case "vet_petshop":
    case "beauty_salon":
    case "barbershop":
      return {
        nicheId,
        isTourism: false,
        defaultCategory: "medical_aesthetic_consent",
        defaultTemplateId: blueprint.defaultTemplateId,
        allowedSemanticGroups: ["geral", "financeiro", "rh", "juridico", "comodato"],
        preferredTemplateCategories: ["medical_aesthetic_consent", "service_agreement", "employment", "partnership"],
        allowTravelProposalsImport: false,
      };
    case "gastronomy":
    default:
      return {
        nicheId,
        isTourism: false,
        defaultCategory: "service_agreement",
        defaultTemplateId: "template-prestacao-servicos",
        allowedSemanticGroups: ["geral", "financeiro", "rh", "comodato", "juridico"],
        preferredTemplateCategories: [
          "service_agreement",
          "employment",
          "partnership",
          "ndas",
          "general_deal",
          "pos_retail",
        ],
        allowTravelProposalsImport: false,
      };
  }
}
