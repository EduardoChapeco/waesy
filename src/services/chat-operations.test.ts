import { describe, it, expect } from "vitest";
import {
  createQuickAnswerSchema,
  createTagSchema,
  scheduleMessageSchema,
} from "@/services/chat-operations.functions";

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
});
