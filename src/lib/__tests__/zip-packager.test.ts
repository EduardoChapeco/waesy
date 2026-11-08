import { describe, it, expect } from "vitest";
import { calculateCrc32, createZipArchive } from "../zip-packager";

describe("zip-packager", () => {
  it("calcula checksum CRC-32 corretamente", () => {
    const data = Buffer.from("hello world", "utf-8");
    const crc = calculateCrc32(data);
    expect(crc.toString(16)).toBe("d4a1185");
  });

  it("gera arquivo ZIP válido com múltiplos arquivos", () => {
    const files = [
      { path: "manifest.json", content: JSON.stringify({ name: "Waesy Sync", version: "2.0.0" }) },
      { path: "popup.html", content: "<!DOCTYPE html><html><body>Waesy Extension</body></html>" },
      { path: "scripts/worker.js", content: "console.log('worker active');" },
    ];

    const zipBuffer = createZipArchive(files);
    expect(zipBuffer).toBeInstanceOf(Buffer);
    expect(zipBuffer.length).toBeGreaterThan(100);

    // Verifica assinatura mágica inicial do PKZIP (0x04034b50 -> 'PK\x03\x04')
    expect(zipBuffer.readUInt32LE(0)).toBe(0x04034b50);

    // Verifica assinatura de EOCD no final (0x06054b50 -> 'PK\x05\x06')
    const eocdOffset = zipBuffer.length - 22;
    expect(zipBuffer.readUInt32LE(eocdOffset)).toBe(0x06054b50);
  });

  it("preserva caracteres acentuados e caminhos normalizados UTF-8", () => {
    const files = [
      { path: "documentos\\instruções_excelência.txt", content: "Automação para São Miguel do Oeste" },
    ];

    const zipBuffer = createZipArchive(files);
    const textContent = zipBuffer.toString("utf-8");
    expect(textContent).toContain("documentos/instruções_excelência.txt");
  });
});
