import { describe, it, expect } from "vitest";
import {
  calculateEAN13Checksum,
  generateEAN13,
  encodeCode128B,
  generateBarcodeSVG,
} from "../barcode-generator";

describe("Barcode Generator & Checksum Utilities", () => {
  it("calcula checksum EAN-13 corretamente", () => {
    // Exemplo clássico EAN-13: 789123456789 -> último dígito é 7
    // Digits: 7, 8, 9, 1, 2, 3, 4, 5, 6, 7, 8, 9
    // Even index: 7, 9, 2, 4, 6, 8 (sum = 36)
    // Odd index: 8, 1, 3, 5, 7, 9 (sum = 33 * 3 = 99)
    // Total = 135 -> mod 10 = 5 -> checksum = 5
    const checksum = calculateEAN13Checksum("789123456789");
    expect(checksum).toBe(5);
  });

  it("gera código EAN-13 completo de 13 dígitos", () => {
    const ean = generateEAN13("789123456789");
    expect(ean).toBe("7891234567895");
    expect(ean.length).toBe(13);
  });

  it("codifica string alfanumérica em Code-128 B", () => {
    const binary = encodeCode128B("CAM-ALG-001");
    expect(typeof binary).toBe("string");
    expect(binary.length).toBeGreaterThan(50);
    // Deve conter apenas '1' e '0'
    expect(/^[01]+$/.test(binary)).toBe(true);
  });

  it("gera SVG vetorial de código de barras", () => {
    const svg = generateBarcodeSVG("7891234567895", { height: 40, showText: true });
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
    expect(svg).toContain("<rect");
    expect(svg).toContain("<text");
    expect(svg).toContain("7891234567895");
  });
});
