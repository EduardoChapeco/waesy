import { describe, expect, it } from "vitest";
import {
  convertWordDocumentXmlToMarkdown,
  detectPdfPageCount,
  extractZipEntryBytes,
  paginateContractMarkdown,
  parseUploadedContractDocument,
  resolveContractNicheProfile,
} from "./document-file-parser";

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c ^= bytes[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function writeU16(arr: number[], value: number) {
  arr.push(value & 0xff, (value >>> 8) & 0xff);
}

function writeU32(arr: number[], value: number) {
  arr.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
}

function buildStoredZip(entries: Array<{ name: string; content: string }>): Uint8Array {
  const encoder = new TextEncoder();
  const out: number[] = [];
  const centralDir: number[] = [];

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = encoder.encode(entry.content);
    const sum = crc32(dataBytes);
    const localOffset = out.length;

    // Local File Header (method 0 stored)
    writeU32(out, 0x04034b50);
    writeU16(out, 20);
    writeU16(out, 0);
    writeU16(out, 0);
    writeU16(out, 0);
    writeU16(out, 0);
    writeU32(out, sum);
    writeU32(out, dataBytes.length);
    writeU32(out, dataBytes.length);
    writeU16(out, nameBytes.length);
    writeU16(out, 0);
    out.push(...nameBytes, ...dataBytes);

    // Central Directory Header
    writeU32(centralDir, 0x02014b50);
    writeU16(centralDir, 20);
    writeU16(centralDir, 20);
    writeU16(centralDir, 0);
    writeU16(centralDir, 0);
    writeU16(centralDir, 0);
    writeU16(centralDir, 0);
    writeU32(centralDir, sum);
    writeU32(centralDir, dataBytes.length);
    writeU32(centralDir, dataBytes.length);
    writeU16(centralDir, nameBytes.length);
    writeU16(centralDir, 0);
    writeU16(centralDir, 0);
    writeU16(centralDir, 0);
    writeU16(centralDir, 0);
    writeU32(centralDir, 0);
    writeU32(centralDir, localOffset);
    centralDir.push(...nameBytes);
  }

  const centralOffset = out.length;
  out.push(...centralDir);

  // EOCD
  writeU32(out, 0x06054b50);
  writeU16(out, 0);
  writeU16(out, 0);
  writeU16(out, entries.length);
  writeU16(out, entries.length);
  writeU32(out, centralDir.length);
  writeU32(out, centralOffset);
  writeU16(out, 0);

  return new Uint8Array(out);
}

describe("contract document file parser and niche isolation", () => {
  it("parses real .docx zip XML into markdown headings, bold text, tables, and page count", async () => {
    const wordXml = `<?xml version="1.0" encoding="UTF-8"?>
      <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:body>
          <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>CONTRATO DE FORNECIMENTO</w:t></w:r></w:p>
          <w:p><w:r><w:t>Entre </w:t></w:r><w:r><w:rPr><w:b/></w:rPr><w:t>Foodman Delivery</w:t></w:r><w:r><w:t> e o parceiro.</w:t></w:r></w:p>
          <w:tbl>
            <w:tr><w:tc><w:p><w:r><w:t>Item</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Valor</w:t></w:r></w:p></w:tc></w:tr>
            <w:tr><w:tc><w:p><w:r><w:t>Taxa</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>R$ 200,00</w:t></w:r></w:p></w:tc></w:tr>
          </w:tbl>
          <w:p><w:r><w:br w:type="page"/></w:r><w:r><w:t>Clausula de encerramento.</w:t></w:r></w:p>
        </w:body>
      </w:document>`;

    const zipBytes = buildStoredZip([{ name: "word/document.xml", content: wordXml }]);
    const entry = await extractZipEntryBytes(zipBytes, "word/document.xml");
    expect(entry).not.toBeNull();

    const parsed = await parseUploadedContractDocument({
      name: "contrato-parceria-foodman.docx",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      bytes: zipBytes,
    });

    expect(parsed.kind).toBe("docx");
    expect(parsed.pageCount).toBe(2);
    expect(parsed.markdown).toContain("# CONTRATO DE FORNECIMENTO");
    expect(parsed.markdown).toContain("**Foodman Delivery**");
    expect(parsed.markdown).toContain("| Item | Valor |");
    expect(parsed.markdown).toContain("Clausula de encerramento.");
  });

  it("detects page count from PDF bytes without loading heavy dependencies", () => {
    const mockPdf = new TextEncoder().encode(
      "%PDF-1.4\n1 0 obj << /Type /Pages /Count 3 /Kids [2 0 R 3 0 R 4 0 R] >> endobj\n2 0 obj << /Type /Page >> endobj",
    );
    expect(detectPdfPageCount(mockPdf)).toBe(3);

    const leafOnlyPdf = new TextEncoder().encode(
      "%PDF-1.4\n1 0 obj << /Type /Page >> endobj\n2 0 obj << /Type /Page >> endobj",
    );
    expect(detectPdfPageCount(leafOnlyPdf)).toBe(2);
  });

  it("converts Word XML tables safely and splits long markdown into A4 pages", () => {
    const { markdown } = convertWordDocumentXmlToMarkdown(
      `<w:document><w:body><w:p><w:r><w:t>Linha 1</w:t></w:r></w:p></w:body></w:document>`,
    );
    expect(markdown).toBe("Linha 1");

    const pages = paginateContractMarkdown("Secao A\n\n---\n\nSecao B", 1);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toBe("Secao A");
    expect(pages[1]).toBe("Secao B");
  });

  it("isolates non-tourism niches from tourism variables and proposals while keeping tourism functional for agencies", () => {
    const foodProfile = resolveContractNicheProfile({ niche: "gastronomy" });
    expect(foodProfile.isTourism).toBe(false);
    expect(foodProfile.allowedSemanticGroups).not.toContain("turismo");
    expect(foodProfile.allowTravelProposalsImport).toBe(false);
    expect(foodProfile.defaultCategory).toBe("service_agreement");

    const tourismProfile = resolveContractNicheProfile({ niche: "tourism" });
    expect(tourismProfile.isTourism).toBe(true);
    expect(tourismProfile.allowedSemanticGroups).toContain("turismo");
    expect(tourismProfile.allowTravelProposalsImport).toBe(true);
  });
});
