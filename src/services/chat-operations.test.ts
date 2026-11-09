import { describe, it, expect } from "vitest";
import {
  createQuickAnswerSchema,
  createTagSchema,
  scheduleMessageSchema,
  interpolateTemplateVariables,
} from "@/services/chat-operations.functions";
import {
  normalizeWhatsAppQrDataUri,
  extractEvolutionQrPayload,
} from "@/services/whatsapp-channel-instances.functions";
import { isOutsideSupportSchedule } from "@/services/whatsapp-automation-runtime.server";

describe("Chat Operations Schemas (Whaticket CRM Convergence)", () => {
  it("valida criação de resposta rápida com atalho limpo", () => {
    const valid = createQuickAnswerSchema.safeParse({
      shortcut: "pix",
      title: "Chave PIX",
      message: "Chave PIX: contato@empresa.com",
      category: "financeiro",
    });

    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.shortcut).toBe("pix");
      expect(valid.data.category).toBe("financeiro");
    }
  });

  it("rejeita resposta rápida sem mensagem ou com atalho vazio", () => {
    const invalid = createQuickAnswerSchema.safeParse({
      shortcut: "",
      title: "Título",
      message: "",
    });

    expect(invalid.success).toBe(false);
  });

  it("valida criação de tag com cor hexadecimal válida", () => {
    const valid = createTagSchema.safeParse({
      name: "Cliente VIP",
      color_hex: "emerald",
      is_kanban_column: true,
      kanban_order: 1,
    });

    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.color_hex).toBe("emerald");
      expect(valid.data.is_kanban_column).toBe(true);
    }
  });

  it("rejeita tag com cor inválida fora do padrão hex", () => {
    const invalid = createTagSchema.safeParse({
      name: "Tag Inválida",
      color_hex: "",
    });

    expect(invalid.success).toBe(false);
  });

  it("valida agendamento de mensagem WhatsApp com data ISO futura", () => {
    const valid = scheduleMessageSchema.safeParse({
      recipientPhone: "+5549999998888",
      messageText: "Olá! Segue o lembrete da sua viagem.",
      scheduledFor: "2027-03-01T10:00:00.000Z",
    });

    expect(valid.success).toBe(true);
  });

  it("rejeita agendamento sem data válida ou sem telefone", () => {
    const invalid = scheduleMessageSchema.safeParse({
      recipientPhone: "123",
      messageText: "Teste",
      scheduledFor: "data-invalida",
    });

    expect(invalid.success).toBe(false);
  });

  it("interpola variáveis dinâmicas de templates WhatsApp ({{nome_cliente}}, {{numero_pedido}}, {{link_pagamento}})", () => {
    const template =
      "Olá {{nome_cliente}}! Seu pedido {{numero_pedido}} na {{loja}} aguarda pagamento em {{link_pagamento}} ({{telefone}}).";
    const result = interpolateTemplateVariables(template, {
      customerName: "Marina Costa",
      customerPhone: "+5549999112233",
      storeName: "Waesy Store",
      orderNumber: "PED-9842",
      paymentLink: "https://waesy.app/pay/9842",
    });

    expect(result).toBe(
      "Olá Marina Costa! Seu pedido PED-9842 na Waesy Store aguarda pagamento em https://waesy.app/pay/9842 (+5549999112233).",
    );
  });

  it("normaliza QR Code do WhatsApp em Base64 puro, Data URI e SVG e extrai payloads Evolution v1/v2", () => {
    const rawBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
    expect(normalizeWhatsAppQrDataUri(rawBase64)).toBe(`data:image/png;base64,${rawBase64}`);
    expect(normalizeWhatsAppQrDataUri(`data:image/png;base64,${rawBase64}`)).toBe(
      `data:image/png;base64,${rawBase64}`,
    );
    expect(normalizeWhatsAppQrDataUri("<svg><rect/></svg>")).toContain("data:image/svg+xml;utf8,");

    const v2Payload = extractEvolutionQrPayload({
      qrcode: { base64: rawBase64, pairingCode: "ABCD-1234" },
    });
    expect(v2Payload.qrCodeBase64).toBe(`data:image/png;base64,${rawBase64}`);
    expect(v2Payload.pairingCode).toBe("ABCD-1234");
  });

  it("avalia corretamente janela de expediente (support_schedules) para automação de ausência", () => {
    const schedules = [
      { day: "Segunda a Sexta", hours: "08:00 às 18:00", active: true },
      { day: "Sábado", hours: "08:00 às 12:00", active: true },
      { day: "Domingo e Feriados", hours: "Fechado", active: false },
    ];
    // Quarta-feira 14:30 UTC-3 (17:30 UTC) -> Dentro do horário
    expect(isOutsideSupportSchedule(schedules, new Date("2026-11-04T17:30:00.000Z"))).toBe(false);
    // Quarta-feira 21:00 UTC-3 (00:00 UTC do dia seguinte) -> Fora do horário
    expect(isOutsideSupportSchedule(schedules, new Date("2026-11-05T00:00:00.000Z"))).toBe(true);
    // Domingo 10:00 UTC-3 (13:00 UTC) -> Fora do horário
    expect(isOutsideSupportSchedule(schedules, new Date("2026-11-08T13:00:00.000Z"))).toBe(true);
  });
});
