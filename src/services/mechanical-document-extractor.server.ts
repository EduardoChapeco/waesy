import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { inflateSync, inflateRawSync } from "node:zlib";

function decodeHexPdfString(hex: string): string {
  if (!hex) return "";
  // Se for múltiplo de 4 e parecer UTF-16BE (caractere nulo no byte alto)
  if (hex.length >= 4 && hex.length % 4 === 0 && hex.startsWith("00")) {
    let utf16 = "";
    for (let i = 0; i < hex.length; i += 4) {
      const code = parseInt(hex.substring(i, i + 4), 16);
      if (code >= 32 && code <= 65535) {
        utf16 += String.fromCharCode(code);
      } else if (code === 10 || code === 13 || code === 9) {
        utf16 += " ";
      }
    }
    if (utf16.trim().length > 0) return utf16;
  }
  // Padrão ASCII / Latin1 de 2 dígitos hexadecimais
  let latin = "";
  for (let i = 0; i < hex.length; i += 2) {
    const code = parseInt(hex.substring(i, i + 2), 16);
    if (code >= 32 && code <= 255) {
      latin += String.fromCharCode(code);
    } else if (code === 10 || code === 13 || code === 9) {
      latin += " ";
    }
  }
  return latin;
}

function extractPdfTextPureNode(pdfBuffer: Buffer): string {
  const chunks: string[] = [];
  const rawLatin = pdfBuffer.toString("latin1");
  const streamRegex = /stream(?:\r\n|\n|\r)([\s\S]*?)(?:\r\n|\n|\r)endstream/g;
  let match: RegExpExecArray | null;

  const extractStringsFromContent = (content: string) => {
    // Operadores Tj, ' e " com strings literais entre parênteses
    const tjRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*(?:Tj|'|")/g;
    let m: RegExpExecArray | null;
    while ((m = tjRegex.exec(content)) !== null) {
      chunks.push(m[1].replace(/\\([nrtbf()\\])/g, "$1"));
    }

    // Operadores Tj com strings hexadecimais entre sinais de menor e maior <HEX>
    const hexTjRegex = /<([0-9a-fA-F]+)>\s*(?:Tj|'|")/g;
    while ((m = hexTjRegex.exec(content)) !== null) {
      const decoded = decodeHexPdfString(m[1]);
      if (decoded) chunks.push(decoded);
    }

    // Operador TJ (array com posições e strings literais ou hexadecimais)
    const tjArrRegex = /\[([^\]]+)\]\s*TJ/g;
    while ((m = tjArrRegex.exec(content)) !== null) {
      const inner = m[1];
      const partRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)|<([0-9a-fA-F]+)>/g;
      let sm: RegExpExecArray | null;
      const lineParts: string[] = [];
      while ((sm = partRegex.exec(inner)) !== null) {
        if (sm[1] !== undefined) {
          lineParts.push(sm[1].replace(/\\([nrtbf()\\])/g, "$1"));
        } else if (sm[2] !== undefined) {
          const decoded = decodeHexPdfString(sm[2]);
          if (decoded) lineParts.push(decoded);
        }
      }
      if (lineParts.length > 0) chunks.push(lineParts.join(""));
    }
  };

  while ((match = streamRegex.exec(rawLatin)) !== null) {
    const streamBinary = Buffer.from(match[1], "latin1");
    let decompressed: string | null = null;
    try {
      decompressed = inflateSync(streamBinary).toString("latin1");
    } catch {
      try {
        decompressed = inflateRawSync(streamBinary).toString("latin1");
      } catch {
        // Fluxo não comprimido ou cifra desconhecida
      }
    }

    if (decompressed) {
      extractStringsFromContent(decompressed);
    } else {
      extractStringsFromContent(match[1]);
    }
  }

  return normalizeText(chunks.join(" ").replace(/\s+/g, " "));
}


const execFileAsync = promisify(execFile);

export interface MechanicalDocumentExtraction {
  method: "pdftotext" | "tesseract" | "unavailable";
  text: string;
  pageCount?: number;
  metadata: Record<string, string | number | boolean | undefined>;
  needsVisionModel: boolean;
}

function normalizeText(value: string): string {
  return value
    .replace(new RegExp(String.fromCharCode(0), "g"), "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Extração local, sem provider externo. Falhas retornam indisponibilidade explícita;
 * nunca são mascaradas por texto inventado.
 */
export async function extractDocumentMechanically(input: {
  base64: string;
  mimeType: string;
  name?: string;
}): Promise<MechanicalDocumentExtraction> {
  const allowedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp", "image/tiff"]);
  if (!allowedMimeTypes.has(input.mimeType)) {
    return { method: "unavailable", text: "", metadata: { reason: "unsupported_mime_type", mimeType: input.mimeType }, needsVisionModel: true };
  }
  const bytes = Buffer.from(input.base64, "base64");
  if (!bytes.length) {
    return { method: "unavailable", text: "", metadata: { reason: "empty_file" }, needsVisionModel: true };
  }
  if (bytes.length > 25 * 1024 * 1024) {
    return { method: "unavailable", text: "", metadata: { reason: "file_too_large", maxBytes: 25 * 1024 * 1024 }, needsVisionModel: true };
  }

  const dir = await mkdtemp(join(tmpdir(), "waesy-doc-"));
  const extension = input.mimeType === "application/pdf" ? ".pdf" : ".img";
  const source = join(dir, `source${extension}`);
  const output = join(dir, "extracted.txt");
  try {
    await writeFile(source, bytes, { mode: 0o600 });
    if (input.mimeType === "application/pdf" || input.name?.toLowerCase().endsWith(".pdf")) {
      try {
        const { stdout: info } = await execFileAsync("pdfinfo", [source], { timeout: 10_000, maxBuffer: 256 * 1024 });
        const pages = info.match(/^Pages:\s+(\d+)/m)?.[1];
        if (pages && Number(pages) > 100) {
          return { method: "unavailable", text: "", pageCount: Number(pages), metadata: { fileName: input.name, mimeType: input.mimeType, reason: "page_limit_exceeded" }, needsVisionModel: true };
        }
        await execFileAsync("pdftotext", ["-layout", "-enc", "UTF-8", source, output], { timeout: 30_000, maxBuffer: 2 * 1024 * 1024 });
        const text = normalizeText(await readFile(output, "utf8"));
        return {
          method: "pdftotext",
          text,
          pageCount: pages ? Number(pages) : undefined,
          metadata: { fileName: input.name, mimeType: input.mimeType, extractedCharacters: text.length },
          needsVisionModel: text.length < 40,
        };
      } catch (error) {
        const fallbackText = extractPdfTextPureNode(bytes);
        if (fallbackText.length >= 40) {
          return {
            method: "pdftotext",
            text: fallbackText,
            metadata: { fileName: input.name, mimeType: input.mimeType, extractedCharacters: fallbackText.length, engine: "pure_node_zlib" },
            needsVisionModel: false,
          };
        }
        return {
          method: "unavailable",
          text: "",
          metadata: { fileName: input.name, mimeType: input.mimeType, reason: error instanceof Error ? error.message.slice(0, 160) : "pdf_engine_failed" },
          needsVisionModel: true,
        };
      }
    }

    try {
      await execFileAsync("tesseract", [source, output.replace(/\.txt$/, ""), "-l", "por+eng"], { timeout: 45_000, maxBuffer: 2 * 1024 * 1024 });
      const text = normalizeText(await readFile(output, "utf8"));
      return {
        method: "tesseract",
        text,
        metadata: { fileName: input.name, mimeType: input.mimeType, extractedCharacters: text.length },
        needsVisionModel: text.length < 40,
      };
    } catch (error) {
      return {
        method: "unavailable",
        text: "",
        metadata: { fileName: input.name, mimeType: input.mimeType, reason: error instanceof Error ? error.message.slice(0, 160) : "ocr_engine_unavailable" },
        needsVisionModel: true,
      };
    }
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}
