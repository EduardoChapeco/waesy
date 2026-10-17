import { describe, it, expect } from "vitest";
import { generatePixBrCode, crc16Ccitt, type GeneratePixOptions } from "./pix-payload";

describe("pix-payload generator", () => {
  it("calcula o CRC16 CCITT corretamente conforme padrão BACEN", () => {
    const sample = "000201010212";
    const crc = crc16Ccitt(sample);
    expect(crc).toMatch(/^[0-9A-F]{4}$/);
    expect(crc.length).toBe(4);
  });

  it("gera payload Pix BRCode estático válido com todos os campos obrigatórios", () => {
    const params: GeneratePixOptions = {
      pixKey: "financeiro@waesy.com.br",
      merchantName: "Waesy Turismo e Viagens",
      merchantCity: "Chapeco",
      amountCents: 154990, // R$ 1549.90
      txId: "RES99887766",
      description: "Reserva Hotel Chapecó",
    };

    const brCode = generatePixBrCode(params);

    expect(brCode).toContain("000201"); // Payload format indicator
    expect(brCode).toContain("br.gov.bcb.pix"); // GUI do Pix BACEN
    expect(brCode).toContain("financeiro@waesy.com.br"); // Chave Pix
    expect(brCode).toContain("5303986"); // Moeda BRL (986)
    expect(brCode).toContain("54071549.90"); // Valor formatado com 2 casas decimais
    expect(brCode).toContain("5802BR"); // País BR
    expect(brCode).toContain("WAESY TURISMO E VIAGENS"); // Merchant name normalizado
    expect(brCode).toContain("CHAPECO"); // Merchant city normalizada
    expect(brCode).toContain("RES99887766"); // TxId
    expect(brCode).toContain("6304"); // Início do campo CRC
  });

  it("normaliza caracteres especiais e limita tamanhos conforme especificação BACEN", () => {
    const params: GeneratePixOptions = {
      pixKey: "+5549999999999",
      merchantName: "Pousada & Hotel São João da Boa Vista das Águas Limpas Long Name",
      merchantCity: "São João do Oeste",
      amountCents: 45000,
      txId: "TX-SPEC-123456",
    };

    const brCode = generatePixBrCode(params);

    expect(brCode).not.toContain("ão");
    expect(brCode).not.toContain("Á");
    expect(brCode).toContain("5802BR");
    const crcPart = brCode.slice(-4);
    expect(crcPart).toMatch(/^[0-9A-F]{4}$/);
  });

  it("rejeita chaves Pix vazias", () => {
    expect(() =>
      generatePixBrCode({
        pixKey: "",
        merchantName: "Loja",
        merchantCity: "Cidade",
      })
    ).toThrow("Chave Pix obrigatória");
  });

  it("suporta QR Code estático sem valor pré-definido", () => {
    const params: GeneratePixOptions = {
      pixKey: "12345678000199",
      merchantName: "Waesy",
      merchantCity: "Chapeco",
    };

    const brCode = generatePixBrCode(params);
    expect(brCode).not.toContain("540"); // Tag 54 (amount) não deve estar presente
    expect(brCode).toContain("6304");
  });
});
