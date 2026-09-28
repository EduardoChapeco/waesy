import { describe, it, expect } from "vitest";
import { inboundWebhookPayloadSchema } from "./marketplace-webhooks.functions";
import { requestAffiliatePayoutInput, adminProcessPayoutRequestInput } from "./affiliates.functions";
import { buildEscPosReceipt, buildZplShippingLabel, EscPosBuilder } from "@/lib/thermal-printer";

describe("Marketplace Webhooks & Inbound Contract Tests", () => {
  it("valida payload de webhook do Mercado Livre com sucesso", () => {
    const raw = {
      platform: "mercadolivre",
      eventId: "evt_meli_987",
      topic: "orders_v2",
      resourceId: "/orders/2000001",
      payload: {
        id: 2000001,
        status: "paid",
        total_amount: 199.9,
      },
    };

    const parsed = inboundWebhookPayloadSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.platform).toBe("mercadolivre");
      expect(parsed.data.resourceId).toBe("/orders/2000001");
    }
  });

  it("valida payload de webhook do iFood OpenDelivery v1.0", () => {
    const raw = {
      platform: "ifood",
      eventId: "ifood_evt_555",
      topic: "PLACED",
      resourceId: "ord_ifood_99",
      payload: {
        orderId: "ord_ifood_99",
        code: "PLACED",
        orderAmount: 85.5,
      },
    };

    const parsed = inboundWebhookPayloadSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
  });

  it("valida payload de callback de autorização fiscal da Focus NFe", () => {
    const raw = {
      platform: "focus_nfe",
      eventId: "nfe_ref_44",
      topic: "autorizado",
      resourceId: "35260900000000000000550010000000441000000440",
      payload: {
        ref: "nfe_ref_44",
        status: "autorizado",
        chave_nfe: "35260900000000000000550010000000441000000440",
        caminho_danfe: "https://api.focusnfe.com.br/danfe/44.pdf",
      },
    };

    const parsed = inboundWebhookPayloadSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
  });

  it("rejeita plataforma não suportada", () => {
    const raw = {
      platform: "unsupported_platform",
      payload: {},
    };

    const parsed = inboundWebhookPayloadSchema.safeParse(raw);
    expect(parsed.success).toBe(false);
  });
});

describe("Affiliate Payout Governance & PIX Contracts", () => {
  it("valida solicitação de saque com valor superior ao piso mínimo (R$ 50,00)", () => {
    const raw = {
      amountCents: 15000, // R$ 150,00
      pixKeyType: "cpf",
      pixKey: "123.456.789-00",
      notes: "Saque semanal",
    };

    const parsed = requestAffiliatePayoutInput.safeParse(raw);
    expect(parsed.success).toBe(true);
  });

  it("rejeita solicitação de saque abaixo do piso de R$ 50,00 (5000 centavos)", () => {
    const raw = {
      amountCents: 4999, // R$ 49,99
      pixKeyType: "email",
      pixKey: "afiliado@exemplo.com",
    };

    const parsed = requestAffiliatePayoutInput.safeParse(raw);
    expect(parsed.success).toBe(false);
  });

  it("valida contrato de aprovação e quitação de repasse", () => {
    const raw = {
      requestId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      action: "approve_paid",
      receiptUrl: "https://storage.usewaesy.com/comprovante_pix.pdf",
      notes: "Transferência concluída via banco",
    };

    const parsed = adminProcessPayoutRequestInput.safeParse(raw);
    expect(parsed.success).toBe(true);
  });
});

describe("Thermal Printer Engine (ESC/POS & ZPL) Raw Byte Tests", () => {
  it("gera comandos ESC/POS com inicialização, negrito e corte de papel", () => {
    const bytes = buildEscPosReceipt({
      storeName: "Mercado Central Chapecó",
      orderNumber: "ORD-987",
      orderDate: "11/09/2026",
      items: [
        { name: "Queijo Artesanal", qty: 2, priceCents: 3000 },
        { name: "Pão Caseiro", qty: 1, priceCents: 1200 },
      ],
      subtotalCents: 7200,
      totalCents: 7200,
      paymentMethod: "PIX",
      channelSource: "mercadolivre",
    });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(50);

    // Byte de inicialização ESC @ (0x1B, 0x40)
    expect(bytes[0]).toBe(0x1b);
    expect(bytes[1]).toBe(0x40);

    // Contém corte total de papel no final GS V A 0 (0x1D, 0x56, 0x41, 0x00)
    const len = bytes.length;
    expect(bytes[len - 4]).toBe(0x1d);
    expect(bytes[len - 3]).toBe(0x56);
    expect(bytes[len - 2]).toBe(0x41);
    expect(bytes[len - 1]).toBe(0x00);
  });

  it("gera script ZPL válido para etiqueta padrão 100x150mm", () => {
    const zpl = buildZplShippingLabel({
      carrierName: "Correios SEDEX",
      serviceType: "Expresso",
      trackingNumber: "BR123456789X",
      orderNumber: "8899",
      batchCode: "WAVE-01",
      recipient: {
        name: "Maria Santos",
        street: "Rua das Flores",
        number: "250",
        neighborhood: "Jardins",
        city: "Chapecó",
        state: "SC",
        zipCode: "89802-000",
      },
      sender: {
        storeName: "Loja Principal",
        city: "Chapecó",
        state: "SC",
        zipCode: "89801-000",
      },
      channelSource: "ifood",
      totalItemsCount: 3,
    });

    expect(zpl).toContain("^XA");
    expect(zpl).toContain("^PW800");
    expect(zpl).toContain("^LL1200");
    expect(zpl).toContain("^XZ");
    expect(zpl).toContain("BR123456789X");
    expect(zpl).toContain("CORREIOS SEDEX");
    expect(zpl).toContain("MARIA SANTOS");
    expect(zpl).toContain("89802-000");
  });
});
