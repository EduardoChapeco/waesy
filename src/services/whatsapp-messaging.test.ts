import { describe, it, expect } from "vitest";
import { dispatchDocumentSchema } from "./whatsapp-messaging.functions";

describe("dispatchDocumentSchema", () => {
  it("valida payload completo com sucesso", () => {
    const input = {
      documentType: "invoice",
      documentId: "inv-1234",
      documentCode: "#FAT-2026-0042",
      documentTitle: "Fatura de Serviços de Turismo",
      recipientPhone: "49999998888",
      recipientName: "Maria da Silva",
      documentUrl: "https://waesy.com/_store/fatura/tok-123",
      totalCents: 450000,
    };

    const res = dispatchDocumentSchema.safeParse(input);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.totalCents).toBe(450000);
      expect(res.data.documentType).toBe("invoice");
    }
  });

  it("aceita payload sem totalCents opcional", () => {
    const input = {
      documentType: "contract",
      documentId: "ctr-5678",
      documentCode: "#CTR-2026-0001",
      documentTitle: "Contrato de Prestação de Serviços",
      recipientPhone: "11988887777",
      recipientName: "João Santos",
      documentUrl: "https://waesy.com/assinar/tok-contrato-abc",
    };

    const res = dispatchDocumentSchema.safeParse(input);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.totalCents).toBeUndefined();
    }
  });

  it("rejeita telefone curto ou inválido", () => {
    const input = {
      documentType: "budget",
      documentId: "bdg-001",
      documentCode: "#ORC-001",
      documentTitle: "Orçamento",
      recipientPhone: "123",
      recipientName: "Cliente",
      documentUrl: "https://waesy.com/_store/fatura/tok-1",
    };

    const res = dispatchDocumentSchema.safeParse(input);
    expect(res.success).toBe(false);
  });

  it("rejeita URL malformada", () => {
    const input = {
      documentType: "voucher",
      documentId: "vch-001",
      documentCode: "#VCH-001",
      documentTitle: "Voucher",
      recipientPhone: "49999990000",
      recipientName: "Viajante",
      documentUrl: "url-invalida",
    };

    const res = dispatchDocumentSchema.safeParse(input);
    expect(res.success).toBe(false);
  });
});
