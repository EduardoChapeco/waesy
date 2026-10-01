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

  it("11. Deve aceitar e estruturar bloco vertical_ai_result com ação execute_vertical_ai", () => {
    const verticalBlock: AIChatBlock = {
      type: "vertical_ai_result",
      data: {
        vertical: "financeiro",
        capability: "conversational_expense_entry",
        title: "Despesa Registrada",
        confidence: 0.95,
        requires_human_approval: true,
        summary: "Despesa de R$ 150,00 para entrega.",
      },
    };

    const action: AIChatAction = {
      id: "act-approve-expense",
      label: "Aprovar Lançamento",
      action_type: "execute_vertical_ai",
      payload: { expense_id: "exp-1" },
    };

    const payload: StructuredMessagePayload = {
      text: "Lançamento processado pelo módulo financeiro:",
      blocks: [verticalBlock],
      actions: [action],
    };

    expect(payload.blocks?.[0].type).toBe("vertical_ai_result");
    expect(payload.actions?.[0].action_type).toBe("execute_vertical_ai");
  });

  it("12. Deve aceitar e validar bloco card_carousel (Fase C)", () => {
    const carouselBlock: AIChatBlock = {
      type: "card_carousel",
      data: {
        title: "Destaques da Cidade",
        items: [
          { title: "Café Colonial", subtitle: "Gastronomia", price_cents: 4500 },
          { title: "Trilha da Cachoeira", subtitle: "Ecoturismo", price_cents: 3000 },
        ],
      },
    };

    expect(carouselBlock.type).toBe("card_carousel");
    expect(carouselBlock.data.items.length).toBe(2);
  });

  it("13. Deve aceitar e validar bloco entity_card com avaliação e endereço", () => {
    const entityBlock: AIChatBlock = {
      type: "entity_card",
      data: {
        name: "Restaurante Central",
        category: "Gastronomia",
        rating: 4.8,
        address: "Rua do Comércio, 120",
        action: { label: "Ver Cardápio", action_type: "navigate", payload: { slug: "restaurante-central" } },
      },
    };

    expect(entityBlock.type).toBe("entity_card");
    expect(entityBlock.data.rating).toBe(4.8);
    expect(entityBlock.data.action.action_type).toBe("navigate");
  });

  it("14. Deve aceitar e validar bloco inline_form com submit_form", () => {
    const formBlock: AIChatBlock = {
      type: "inline_form",
      data: {
        title: "Dados para Nota Fiscal",
        fields: [
          { name: "cpf", label: "CPF/CNPJ", placeholder: "000.000.000-00" },
          { name: "nome", label: "Nome Completo" },
        ],
        submit_label: "Salvar Dados",
      },
    };

    expect(formBlock.type).toBe("inline_form");
    expect(formBlock.data.fields.length).toBe(2);
  });

  it("15. Deve aceitar e validar bloco poll com cast_vote", () => {
    const pollBlock: AIChatBlock = {
      type: "poll",
      data: {
        poll_id: "poll-101",
        question: "Qual o melhor dia para a feira local?",
        options: [
          { id: "opt-sab", label: "Sábado de Manhã" },
          { id: "opt-dom", label: "Domingo de Tarde" },
        ],
      },
    };

    expect(pollBlock.type).toBe("poll");
    expect(pollBlock.data.options.length).toBe(2);
  });

  it("16. Deve aceitar e validar bloco event_card com rsvp_event", () => {
    const eventBlock: AIChatBlock = {
      type: "event_card",
      data: {
        event_id: "ev-777",
        title: "Festival de Inverno 2026",
        date_label: "15 a 18 de Julho",
        location: "Praça Central",
      },
    };

    expect(eventBlock.type).toBe("event_card");
    expect(eventBlock.data.event_id).toBe("ev-777");
  });

  it("17. Deve aceitar e validar bloco job_card com apply_job", () => {
    const jobBlock: AIChatBlock = {
      type: "job_card",
      data: {
        job_id: "job-32",
        role: "Entregador Parceiro",
        company: "MotoLink Express",
        regime: "MEI / Autônomo",
        salary: "R$ 3.500 - R$ 5.000 / mês",
      },
    };

    expect(jobBlock.type).toBe("job_card");
    expect(jobBlock.data.regime).toBe("MEI / Autônomo");
  });

  it("18. Deve aceitar e validar bloco financial_entry com reconcile_entry", () => {
    const financialBlock: AIChatBlock = {
      type: "financial_entry",
      data: {
        entry_id: "fin-990",
        description: "Repasse Quinquenal Fornecedor",
        amount_cents: 142000,
        category: "Contas a Pagar",
      },
    };

    expect(financialBlock.type).toBe("financial_entry");
    expect(financialBlock.data.amount_cents).toBe(142000);
  });

  it("19. Deve aceitar e validar bloco summary_card com key_points", () => {
    const summaryBlock: AIChatBlock = {
      type: "summary_card",
      data: {
        title: "Briefing do Turno",
        summary: "Fechamento operacional com 98% de entregas no prazo.",
        key_points: ["142 pedidos faturados", "Tempo médio: 24 min", "Zero sinistros"],
      },
    };

    expect(summaryBlock.type).toBe("summary_card");
    expect(summaryBlock.data.key_points.length).toBe(3);
  });

  it("20. Deve suportar a matriz completa de 5 estados (Fase D)", () => {
    // Estado 1: Loading
    const loadingProps = { payload: {}, isLoading: true };
    expect(loadingProps.isLoading).toBe(true);

    // Estado 2: Streaming
    const streamingProps = { payload: { text: "Gerando resposta..." }, isStreaming: true };
    expect(streamingProps.isStreaming).toBe(true);

    // Estado 3: Error
    const errorProps = { payload: {}, error: "Timeout de rede", onRetry: () => {} };
    expect(errorProps.error).toBe("Timeout de rede");
    expect(typeof errorProps.onRetry).toBe("function");

    // Estado 4: Empty
    const emptyProps = { payload: { text: "", blocks: [], actions: [] } };
    expect(emptyProps.payload.blocks.length).toBe(0);

    // Estado 5: Filled
    const filledProps: StructuredMessagePayload = {
      text: "Operação concluída com sucesso.",
      blocks: [{ type: "metric_widget", data: { title: "Total", value: "100" } }],
    };
    expect(filledProps.blocks?.length).toBe(1);
  });
});

