/**
 * barcode-scanner.test.ts — Suíte de Testes do Leitor Óptico e Classificador de Códigos
 *
 * PROMPT 31 (Plano #41): Nativização de Ativos e Deduplicação entre Projetos
 */

import { describe, it, expect } from "vitest";
import { classifyScannedCode } from "./barcode-scanner-modal";

describe("PROMPT 31 — Nativização de Leitor Óptico (classifyScannedCode)", () => {
  it("Fase 1: Classifica Gift Cards (GC-) corretamente", () => {
    const result = classifyScannedCode("GC-2026-ABCD");
    expect(result.type).toBe("gift_card");
    expect(result.format).toBe("CODE_128");
  });

  it("Fase 2: Classifica Chaves e QR Codes de NF-e (44 dígitos e URLs)", () => {
    const chave44 = "42261012345678000190550010000012341000012345";
    const resultChave = classifyScannedCode(chave44);
    expect(resultChave.type).toBe("nfe");
    expect(resultChave.format).toBe("QR_CODE");

    const urlSefaz = "https://dfe-portal.svrs.rs.gov.br/dfe/qrCode?p=chNFe=4226101234";
    const resultUrl = classifyScannedCode(urlSefaz);
    expect(resultUrl.type).toBe("nfe");
  });

  it("Fase 3: Classifica PIX EMV corretamente", () => {
    const pixEmv = "00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000";
    const result = classifyScannedCode(pixEmv);
    expect(result.type).toBe("pix");
    expect(result.format).toBe("QR_CODE");
  });

  it("Fase 4: Classifica Cupons, Credenciais e Ingressos", () => {
    expect(classifyScannedCode("CUPOM-10OFF").type).toBe("coupon");
    expect(classifyScannedCode("PROMO-VERAO").type).toBe("coupon");
    expect(classifyScannedCode("CRED-STAFF-01").type).toBe("credential");
    expect(classifyScannedCode("TKT-FESTIVAL-2026").type).toBe("ticket");
    expect(classifyScannedCode("INGR-VIP-99").type).toBe("ticket");
  });

  it("Fase 5: Classifica Códigos de Barras EAN-13, EAN-8 e UPC de Produtos", () => {
    // EAN-13
    const ean13 = "7891234567890";
    const res13 = classifyScannedCode(ean13);
    expect(res13.type).toBe("product_barcode");
    expect(res13.format).toBe("EAN_13");

    // EAN-8
    const ean8 = "12345678";
    const res8 = classifyScannedCode(ean8);
    expect(res8.type).toBe("product_barcode");
    expect(res8.format).toBe("EAN_8");

    // UPC-A (12 dígitos)
    const upcA = "012345678905";
    const resUpc = classifyScannedCode(upcA);
    expect(resUpc.type).toBe("product_barcode");
    expect(resUpc.format).toBe("UPC_A");
  });

  it("Fase 6: Classifica URLs de produtos e texto desconhecido", () => {
    const productUrl = "https://waesy.com/loja/p/tenis-runner-41";
    expect(classifyScannedCode(productUrl).type).toBe("product_qr");

    const unknown = "ABC-RANDOM-TEXT";
    expect(classifyScannedCode(unknown).type).toBe("unknown");
    expect(classifyScannedCode(unknown).format).toBe("TEXT");
  });
});
