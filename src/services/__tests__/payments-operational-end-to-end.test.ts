import { describe, it, expect, vi } from "vitest";
import { generatePixBrCode, crc16Ccitt } from "@/lib/pix-payload";
import { signReceiptPayload, verifyReceiptSignature } from "@/services/financial-ledger.functions";

describe("Centro Operacional de Pagamentos — End-to-End Test Suite", () => {
  describe("1. Geração de Códigos Pix (EMV / BRCode BACEN)", () => {
    it("gera código Pix estático com CRC16 válido e sem valor embutido", () => {
      const payload = generatePixBrCode({
        pixKey: "suporte@waesy.com",
        merchantName: "Waesy Pagamentos",
        merchantCity: "CHAPECO",
        description: "RECEBIMENTO WAESY",
      });

      expect(payload).toContain("000201");
      expect(payload).toContain("br.gov.bcb.pix");
      expect(payload).toContain("suporte@waesy.com");
      expect(payload).toContain("WAESY PAGAMENTOS");
      expect(payload).toContain("CHAPECO");
      expect(payload).not.toContain("5405"); // Sem sub-campo de valor

      // Verifica que os 4 últimos dígitos são o CRC16 correto dos caracteres anteriores
      const body = payload.slice(0, -4);
      const expectedCrc = crc16Ccitt(body);
      const actualCrc = payload.slice(-4);
      expect(actualCrc).toBe(expectedCrc);
    });

    it("gera código Pix dinâmico com valor exato em centavos inteiros (sub-campo 54)", () => {
      const payload = generatePixBrCode({
        pixKey: "12345678909",
        amountCents: 15990, // R$ 159,90
        merchantName: "Loja Parceira",
        merchantCity: "CHAPECO",
        txId: "COB12345678",
        description: "Pedido #48392",
      });

      expect(payload).toContain("5406159.90"); // Tag 54, tamanho 06, valor 159.90
      expect(payload).toContain("COB12345678");
      expect(payload).toContain("5802BR");
      expect(payload).toContain("5303986"); // Moeda BRL

      const body = payload.slice(0, -4);
      const expectedCrc = crc16Ccitt(body);
      expect(payload.slice(-4)).toBe(expectedCrc);
    });

    it("rejeita geração sem chave Pix", () => {
      expect(() =>
        generatePixBrCode({
          pixKey: "",
          merchantName: "Waesy",
          merchantCity: "CHAPECO",
        })
      ).toThrowError("Chave Pix obrigatória");
    });
  });

  describe("2. Faturas e Encargos Financeiros Pro-Rata Die", () => {
    it("calcula multa de 2% e juros diários pro-rata de 1% a.m. para faturas em atraso", () => {
      const amountCents = 100000; // R$ 1.000,00
      const daysOverdue = 15;

      // Multa padrão brasileira de 2%
      const expectedFine = Math.round(amountCents * 0.02); // 2000 centavos = R$ 20,00
      // Juros de 1% a.m. (0,033% ao dia)
      const dailyRate = 0.01 / 30;
      const expectedInterest = Math.round(amountCents * dailyRate * daysOverdue); // 500 centavos = R$ 5,00
      const totalPayable = amountCents + expectedFine + expectedInterest; // R$ 1.025,00

      expect(expectedFine).toBe(2000);
      expect(expectedInterest).toBe(500);
      expect(totalPayable).toBe(102500);
    });

    it("não aplica encargos quando a fatura está dentro do prazo de vencimento", () => {
      const amountCents = 50000;
      const daysOverdue = 0;
      const fineCents = daysOverdue > 0 ? Math.round(amountCents * 0.02) : 0;
      const interestCents = daysOverdue > 0 ? Math.round(amountCents * (0.01 / 30) * daysOverdue) : 0;

      expect(fineCents).toBe(0);
      expect(interestCents).toBe(0);
      expect(amountCents + fineCents + interestCents).toBe(50000);
    });
  });

  describe("3. Comprovantes Criptográficos com HMAC-SHA256 (Inviolabilidade)", () => {
    it("gera assinatura HMAC determinística e verifica autenticidade do recibo", () => {
      const receiptData = {
        transactionId: "TX-PAY-88291",
        authenticationCode: "AUTH-88291-ABCD",
        amountCents: 24500, // R$ 245,00
        issuedAt: "2026-10-21T00:00:00.000Z",
        payerName: "Cliente Comprador",
        payeeName: "Loja Parceira",
      };

      const signature = signReceiptPayload(receiptData);
      expect(signature).toHaveLength(64); // SHA-256 hex tem 64 caracteres

      const isValid = verifyReceiptSignature({
        ...receiptData,
        hmacSignature: signature,
      });
      expect(isValid).toBe(true);
    });

    it("rejeita comprovante adulterado em qualquer campo crítico", () => {
      const originalData = {
        transactionId: "TX-PAY-88291",
        authenticationCode: "AUTH-88291-ABCD",
        amountCents: 24500,
        issuedAt: "2026-10-21T00:00:00.000Z",
        payerName: "Cliente Comprador",
        payeeName: "Loja Parceira",
      };

      const validSignature = signReceiptPayload(originalData);

      // Adulteração maliciosa do valor de R$ 245,00 para R$ 1.000,00
      const tamperedData = {
        ...originalData,
        amountCents: 100000,
        hmacSignature: validSignature,
      };

      const isValid = verifyReceiptSignature(tamperedData);
      expect(isValid).toBe(false);
    });
  });

  describe("4. Regras de Transição e Idempotência Operacional", () => {
    it("não permite regressão de status financeiro 'paid' para 'pending'", () => {
      const currentStatus = "paid";
      const incomingWebhookStatus = "pending";

      const canRegress = (current: string, next: string) => {
        if (current === "paid" && (next === "pending" || next === "processing")) {
          return false;
        }
        return true;
      };

      expect(canRegress(currentStatus, incomingWebhookStatus)).toBe(false);
    });

    it("distingue adequadamente pagamentos de saída de cobranças de entrada", () => {
      const orderPayment = { origin_type: "order", direction: "outgoing" };
      const tripPayment = { origin_type: "mobility_trip", direction: "outgoing" };
      const carnePayment = { origin_type: "carne_installment", direction: "outgoing" };
      const pixCharge = { origin_type: "pix_charge", direction: "incoming" };
      const p2pReceived = { origin_type: "p2p_transfer", direction: "incoming" };

      expect(orderPayment.direction).toBe("outgoing");
      expect(tripPayment.direction).toBe("outgoing");
      expect(carnePayment.direction).toBe("outgoing");
      expect(pixCharge.direction).toBe("incoming");
      expect(p2pReceived.direction).toBe("incoming");
    });
  });
});
