/**
 * notifications.functions.test.ts — Testes Unitários de Notificações do Workspace (F16)
 *
 * Valida a listagem, filtragem e marcação de leitura atômica de notificações reais.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do createServerFn do @tanstack/react-start
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any) => {
        const validated = schema ? schema.parse(args?.data) : args?.data;
        return fn({ data: validated });
      },
    }),
    handler: (fn: any) => async (args: any) => fn(args || {}),
  }),
}));

const mockUserId = "usr-123-uuid";

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn(async () => ({
    id: mockUserId,
    customer_id: mockUserId,
    role: "owner",
  })),
}));

const mockNotificationsData = [
  {
    id: "notif-1",
    user_id: mockUserId,
    type: "order",
    title: "Novo Pedido Recebido",
    message: "Pedido 1029 no valor de R$ 250,00 foi confirmado.",
    link_url: "/workspace/pedidos/ord-1",
    is_read: false,
    created_at: "2026-10-02T15:00:00Z",
  },
  {
    id: "notif-2",
    user_id: mockUserId,
    type: "interaction",
    title: "Nova Mensagem de Atendimento",
    message: "Cliente enviou dúvida sobre o produto.",
    link_url: "/workspace/atendimento",
    is_read: true,
    created_at: "2026-10-02T14:00:00Z",
  },
];

function createFluentBuilder(dataToReturn: any) {
  const builder: any = {
    data: dataToReturn,
    error: null,
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    update: vi.fn(() => builder),
    then: (resolve: any) => resolve({ data: dataToReturn, error: null }),
  };
  return builder;
}

const mockFrom = vi.fn((table: string) => {
  if (table === "notifications") return createFluentBuilder(mockNotificationsData);
  return createFluentBuilder([]);
});

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: mockFrom,
  }),
  getBrowserClient: () => ({
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
    })),
    removeChannel: vi.fn(),
  }),
}));

import {
  listNotificationsFn,
  markNotificationReadFn,
  markAllNotificationsAsRead,
} from "./notifications.functions";

describe("F16: notifications.functions — Notificações em Tempo Real", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. listNotificationsFn deve retornar lista tipada de notificações do usuário", async () => {
    const res = await listNotificationsFn({
      data: { limit: 10 },
    });

    expect(res).toBeDefined();
    expect(res).toHaveLength(2);
    expect(res[0].id).toBe("notif-1");
    expect(res[0].type).toBe("order");
    expect(res[0].title).toBe("Novo Pedido Recebido");
    expect(res[0].isRead).toBe(false);
  });

  it("2. markNotificationReadFn deve atualizar status da notificação para lida", async () => {
    const res = await markNotificationReadFn({
      data: { notificationId: "notif-1" },
    });

    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });

  it("3. markAllNotificationsAsRead deve marcar todas notificações pendentes como lidas", async () => {
    const res = await markAllNotificationsAsRead();

    expect(res).toBeDefined();
    expect(res.success).toBe(true);
  });
});
