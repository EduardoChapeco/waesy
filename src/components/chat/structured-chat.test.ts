import { describe, it, expect } from "vitest";
import {
  StructuredMessageView,
  type StructuredMessagePayload,
  type AIChatBlock,
  type AIChatAction,
} from "./structured-message-view";
import {
  sendStaffMessageSchema,
  sendCustomerMessageSchema,
} from "@/services/chat.functions";

describe("Structured Chat & Conversational Commerce Engine (ia/09-chat.md & ia/10-comercio.md)", () => {
  it("1. Deve exportar o componente StructuredMessageView como função React válida", () => {
    expect(StructuredMessageView).toBeDefined();
    expect(typeof StructuredMessageView).toBe("function");
  });

  it("2. Deve aceitar e validar payload de Order Tracker nas 5 etapas canônicas", () => {
    const trackerBlock: AIChatBlock = {
      type: "order_tracker",
      data: {
        order_id: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        current_stage: "dispatched",
        total_cents: 18990,
        delivery_address: "Av. Brasil, 1500 - Centro",
      },
    };

    expect(trackerBlock.type).toBe("order_tracker");
    expect(trackerBlock.data.current_stage).toBe("dispatched");
    expect(trackerBlock.data.total_cents).toBe(18990);
  });

  it("3. Deve aceitar e validar payload de Product Card com ação de compra", () => {
    const productBlock: AIChatBlock = {
      type: "product_card",
      data: {
        id: "prod-4812",
        title: "Tênis Esportivo Ultra Comfort",
        category: "Calçados",
        price_cents: 24990,
        in_stock: true,
        image_url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
        slug: "tenis-esportivo-ultra",
      },
    };

    const action: AIChatAction = {
      id: "act-add-cart",
      label: "Adicionar ao Pedido",
      action_type: "add_to_cart",
      payload: { product_id: "prod-4812" },
    };

    const payload: StructuredMessagePayload = {
      text: "Encontrei este item disponível na sua numeração:",
      blocks: [productBlock],
      actions: [action],
    };

    expect(payload.blocks?.length).toBe(1);
    expect(payload.blocks?.[0].type).toBe("product_card");
    expect(payload.actions?.[0].action_type).toBe("add_to_cart");
  });

  it("4. Deve aceitar e validar payload de Proposal Card com condições de pagamento", () => {
    const proposalBlock: AIChatBlock = {
      type: "proposal_card",
      data: {
        proposal_id: "prop-9988",
        title: "Pacote Viagem Serra Gaúcha 4D/3N",
        total_cents: 185000,
        installments: "10x de R$ 185,00 sem juros",
        valid_until: "15/10/2026",
        status: "Ativa",
      },
    };

    const action: AIChatAction = {
      id: "act-confirm-prop",
      label: "Aceitar Proposta",
      action_type: "confirm_proposal",
      payload: { proposal_id: "prop-9988" },
    };

    const payload: StructuredMessagePayload = {
      text: "Orçamento exclusivo gerado:",
      blocks: [proposalBlock],
      actions: [action],
    };

    expect(payload.blocks?.[0].data.total_cents).toBe(185000);
    expect(payload.actions?.[0].action_type).toBe("confirm_proposal");
  });

  it("5. Deve aceitar e validar payload de MetricWidget no chat", () => {
    const metricBlock: AIChatBlock = {
      type: "metric_widget",
      data: {
        title: "CSAT Atendimento",
        value: "4.9 / 5.0",
        change: 0.3,
        trend: "up",
        timeframe: "Esta semana",
        variant: "compact",
        status: "success",
      },
    };

    expect(metricBlock.type).toBe("metric_widget");
    expect(metricBlock.data.value).toBe("4.9 / 5.0");
    expect(metricBlock.data.status).toBe("success");
  });

  it("6. Deve aceitar e validar payload de TaskCard no chat", () => {
    const taskBlock: AIChatBlock = {
      type: "task_card",
      data: {
        id: "task-001",
        title: "Confirmar comprovante de transferência Pix",
        category: "Financeiro",
        priority: "urgent",
        status: "in_progress",
        dueDate: "Hoje, 17:00",
      },
    };

    expect(taskBlock.type).toBe("task_card");
    expect(taskBlock.data.priority).toBe("urgent");
  });

  it("7. Deve aceitar e validar payload de TableBlock no chat", () => {
    const tableBlock: AIChatBlock = {
      type: "table",
      data: {
        title: "Comparativo de Tarifas",
        headers: ["Plano", "Mensal", "Taxa por Pedido"],
        rows: [
          ["Essencial", "R$ 0,00", "5.0%"],
          ["Profissional", "R$ 89,00", "2.5%"],
          ["Enterprise", "R$ 249,00", "1.2%"],
        ],
      },
    };

    expect(tableBlock.type).toBe("table");
    expect(tableBlock.data.headers.length).toBe(3);
    expect(tableBlock.data.rows.length).toBe(3);
  });

  it("8. Deve validar no Zod Schema sendStaffMessageSchema a aceitação de message_type: structured_blocks", () => {
    const validStaffInput = {
      threadId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      message: "Proposta enviada",
      message_type: "structured_blocks",
      attachments: [],
      payload: {
        blocks: [
          {
            type: "proposal_card",
            data: { proposal_id: "p1", title: "Proposta", total_cents: 10000 },
          },
        ],
      },
    };

    const parsed = sendStaffMessageSchema.parse(validStaffInput);
    expect(parsed.message_type).toBe("structured_blocks");
    expect((parsed.payload as any).blocks.length).toBe(1);
  });

  it("9. Deve validar no Zod Schema sendCustomerMessageSchema a aceitação de message_type: structured_blocks", () => {
    const validCustomerInput = {
      threadId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      message: "Interesse no item",
      message_type: "structured_blocks",
      attachments: [],
      payload: {
        blocks: [
          {
            type: "product_card",
            data: { id: "prod-1", title: "Item selecionado" },
          },
        ],
      },
    };

    const parsed = sendCustomerMessageSchema.parse(validCustomerInput);
    expect(parsed.message_type).toBe("structured_blocks");
  });

  it("10. Deve rejeitar schemas com message_type inválido", () => {
    const invalidInput = {
      threadId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      message: "Teste",
      message_type: "unsupported_card_type",
      attachments: [],
      payload: {},
    };

    expect(() => sendStaffMessageSchema.parse(invalidInput)).toThrow();
  });
});
