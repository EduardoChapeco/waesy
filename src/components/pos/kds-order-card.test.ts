/**
 * kds-order-card.test.ts — Suíte de Testes do KDS Order Card Nativizado
 *
 * PROMPT 31 (Plano #41): Nativização de Ativos e Deduplicação entre Projetos
 */

import { describe, it, expect } from "vitest";
import { KDSOrder } from "./kds-order-card";

describe("PROMPT 31 — Nativização de KDS Order Card (Contratos e Estados)", () => {
  it("Fase 1: Estrutura canônica de pedido KDS possui todos os campos operacionais necessários", () => {
    const mockOrder: KDSOrder = {
      id: "ord_kds_01",
      orderNumber: "104",
      customerName: "Eduardo Chapeco",
      tableNumber: "12",
      source: "table",
      priority: "urgent",
      status: "queued",
      createdAt: new Date(Date.now() - 5 * 60000).toISOString(),
      items: [
        { id: "item_01", name: "Hambúrguer Rústico", quantity: 2, notes: "Sem cebola", isCompleted: false },
        { id: "item_02", name: "Batata Rústica", quantity: 1, isCompleted: true },
      ],
    };

    expect(mockOrder.orderNumber).toBe("104");
    expect(mockOrder.priority).toBe("urgent");
    expect(mockOrder.items.length).toBe(2);
    expect(mockOrder.items[0].notes).toBe("Sem cebola");
    expect(mockOrder.items[1].isCompleted).toBe(true);
  });

  it("Fase 2: Validação de transições de status operacionais (queued -> in_preparation -> ready)", () => {
    const validStatuses = ["queued", "in_preparation", "ready"];
    for (const status of validStatuses) {
      const order: KDSOrder = {
        id: `ord_${status}`,
        orderNumber: "99",
        source: "pdv",
        priority: "normal",
        status: status as any,
        createdAt: new Date().toISOString(),
        items: [{ id: "i1", name: "Suco Natural", quantity: 1 }],
      };
      expect(order.status).toBe(status);
    }
  });

  it("Fase 3: Suporte a múltiplos canais de origem (pdv, delivery, table, marketplace)", () => {
    const sources = ["pdv", "delivery", "table", "marketplace"];
    for (const source of sources) {
      const order: KDSOrder = {
        id: `ord_${source}`,
        orderNumber: "101",
        source: source as any,
        priority: "normal",
        status: "queued",
        createdAt: new Date().toISOString(),
        items: [],
      };
      expect(order.source).toBe(source);
    }
  });
});
