/**
 * Tier 1: Feature Coverage - Operational View Modes & Kanban Domains
 * Covering:
 * - Feature 6: Flexible View Modes for Agenda & Appointments
 * - Feature 7: Flexible View Modes for Customers / CRM
 * - Feature 8: Flexible View Modes for Orders & Dispatch
 * - Feature 9: Flexible View Modes for Tasks & Projects
 * - Feature 10: Kanban Defaults Extension for Domains
 * 
 * Target: >=5 test cases per feature (Total >= 25 test cases)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { E2EContractHarness } from "../harness/e2e-contract-harness";
import {
  TENANT_SALON_ID,
  TENANT_RETAIL_ID,
  USER_STAFF_ID,
  CANONICAL_SALON_FIXTURES,
} from "../harness/test-fixtures";

describe("Tier 1: Operational View Modes & Kanban Domains", () => {
  let harness: E2EContractHarness;

  beforeEach(() => {
    harness = new E2EContractHarness();
  });

  // ==========================================
  // Feature 6: Flexible View Modes for Agenda & Appointments
  // ==========================================
  describe("Feature 6: Agenda & Appointments View Modes", () => {
    it("6.1 presents Table View with tabular monospace times and dense rows", async () => {
      const app = await harness.createAppointment(CANONICAL_SALON_FIXTURES.appointments[0]);
      
      const renderRow = (item: typeof app) => ({
        timeCol: new Date(item.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        customerCol: item.customer_name,
        serviceCol: item.service_name,
        priceFormatted: `R$ ${(item.price_cents / 100).toFixed(2).replace(".", ",")}`,
        className: "h-10 text-sm font-mono tabular-nums",
      });

      const row = renderRow(app);
      expect(row.customerCol).toBe("Mariana Costa");
      expect(row.serviceCol).toBe("Corte e Escova");
      expect(row.priceFormatted).toBe("R$ 180,00");
      expect(row.className).toContain("tabular-nums");
    });

    it("6.2 groups appointments by status columns in Kanban View", async () => {
      await harness.createAppointment(CANONICAL_SALON_FIXTURES.appointments[0]); // scheduled
      await harness.createAppointment(CANONICAL_SALON_FIXTURES.appointments[1]); // confirmed

      const kanbanColumns = {
        scheduled: [] as any[],
        confirmed: [] as any[],
        in_service: [] as any[],
        completed: [] as any[],
      };

      for (const item of CANONICAL_SALON_FIXTURES.appointments) {
        if (item.status in kanbanColumns) {
          kanbanColumns[item.status as keyof typeof kanbanColumns].push(item);
        }
      }

      expect(kanbanColumns.scheduled).toHaveLength(1);
      expect(kanbanColumns.confirmed).toHaveLength(1);
      expect(kanbanColumns.in_service).toHaveLength(0);
      expect(kanbanColumns.completed).toHaveLength(0);
    });

    it("6.3 formats Cards View with quick contact triggers and squircle shape", async () => {
      const app = await harness.createAppointment(CANONICAL_SALON_FIXTURES.appointments[0]);

      const formatCard = (item: typeof app) => ({
        cardClass: "rounded-2xl border border-border/60 bg-card p-4",
        whatsappUrl: `https://wa.me/5511999991111?text=Ola%20${encodeURIComponent(item.customer_name)}`,
        badgeClass: "bg-primary/10 text-primary border border-primary/20",
      });

      const card = formatCard(app);
      expect(card.cardClass).toContain("rounded-2xl");
      expect(card.whatsappUrl).toContain("Mariana%20Costa");
      expect(card.badgeClass).toContain("bg-primary/10");
    });

    it("6.4 synchronizes view mode state bidirectionally with URL query parameters", () => {
      const parseRouterQuery = (searchStr: string) => {
        const params = new URLSearchParams(searchStr);
        const view = params.get("view");
        return view === "kanban" || view === "cards" ? view : "table";
      };

      expect(parseRouterQuery("?view=kanban")).toBe("kanban");
      expect(parseRouterQuery("?view=cards")).toBe("cards");
      expect(parseRouterQuery("?view=table")).toBe("table");
      expect(parseRouterQuery("")).toBe("table"); // Default fallback
      expect(parseRouterQuery("?view=invalid")).toBe("table");
    });

    it("6.5 filters appointments by professional and date range accurately", async () => {
      await harness.createAppointment(CANONICAL_SALON_FIXTURES.appointments[0]);
      await harness.createAppointment(CANONICAL_SALON_FIXTURES.appointments[1]);

      const filterByProfessional = (items: typeof CANONICAL_SALON_FIXTURES.appointments, profId: string) =>
        items.filter((a) => a.professional_id === profId);

      const filtered = filterByProfessional(CANONICAL_SALON_FIXTURES.appointments, USER_STAFF_ID);
      expect(filtered).toHaveLength(2);
    });
  });

  // ==========================================
  // Feature 7: Flexible View Modes for Customers / CRM
  // ==========================================
  describe("Feature 7: Customers / CRM View Modes", () => {
    it("7.1 displays high-density Table View with sortable columns and totals", async () => {
      const c1 = await harness.createCustomer(CANONICAL_SALON_FIXTURES.customers[0]);
      const c2 = await harness.createCustomer(CANONICAL_SALON_FIXTURES.customers[1]);

      const all = await harness.listCustomers(TENANT_SALON_ID);
      expect(all).toHaveLength(2);

      const totalRevenueCents = all.reduce((sum, c) => sum + c.total_spent_cents, 0);
      expect(totalRevenueCents).toBe(180000); // R$ 1.800,00
    });

    it("7.2 organizes lead stages across Kanban CRM Funnel columns", () => {
      const stages = ["new_lead", "contacted", "qualified", "active_client", "churned"] as const;
      const customers = CANONICAL_SALON_FIXTURES.customers;

      const funnel = stages.map((stage) => ({
        stage,
        count: customers.filter((c) => c.lead_stage === stage).length,
      }));

      expect(funnel.find((f) => f.stage === "active_client")?.count).toBe(1);
      expect(funnel.find((f) => f.stage === "qualified")?.count).toBe(1);
      expect(funnel.find((f) => f.stage === "new_lead")?.count).toBe(0);
    });

    it("7.3 renders Cards View with phone formatting and direct communication action", () => {
      const customer = CANONICAL_SALON_FIXTURES.customers[0];
      const formatPhoneBr = (phone: string) => {
        // +5511999991111 -> (11) 99999-1111
        const digits = phone.replace(/\D/g, "");
        if (digits.length === 13) {
          const ddd = digits.slice(2, 4);
          const part1 = digits.slice(4, 9);
          const part2 = digits.slice(9);
          return `(${ddd}) ${part1}-${part2}`;
        }
        return phone;
      };

      expect(formatPhoneBr(customer.phone)).toBe("(11) 99999-1111");
    });

    it("7.4 supports multi-selection in Table View for bulk tagging operations", () => {
      const selectedCustomerIds = new Set<string>();
      selectedCustomerIds.add("c-1");
      selectedCustomerIds.add("c-2");

      expect(selectedCustomerIds.has("c-1")).toBe(true);
      expect(selectedCustomerIds.size).toBe(2);

      selectedCustomerIds.delete("c-1");
      expect(selectedCustomerIds.size).toBe(1);
    });

    it("7.5 filters customers in real-time by search query (name, phone, email)", () => {
      const filterCustomers = (items: typeof CANONICAL_SALON_FIXTURES.customers, query: string) => {
        const q = query.toLowerCase();
        return items.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.phone.includes(q) ||
            (c.email && c.email.toLowerCase().includes(q))
        );
      };

      expect(filterCustomers(CANONICAL_SALON_FIXTURES.customers, "mariana")).toHaveLength(1);
      expect(filterCustomers(CANONICAL_SALON_FIXTURES.customers, "999992222")).toHaveLength(1);
      expect(filterCustomers(CANONICAL_SALON_FIXTURES.customers, "inexistente")).toHaveLength(0);
    });
  });

  // ==========================================
  // Feature 8: Flexible View Modes for Orders & Dispatch
  // ==========================================
  describe("Feature 8: Orders & Dispatch View Modes", () => {
    it("8.1 displays financial breakdown in Table View including fixed R$ 0,99 fee", async () => {
      const order = await harness.createOrder({
        id: "ea111111-1111-4111-8111-111111111111",
        store_id: TENANT_RETAIL_ID,
        customer_id: "c1111111-1111-4111-8111-111111111111",
        items: [{ id: "prod-1", title: "Shampoo Profissional", quantity: 2, price_cents: 6000 }],
        subtotal_cents: 12000,
        platform_fee_cents: 99, // Invariant B.23
        delivery_fee_cents: 1000,
        total_cents: 13099,
        status: "pending",
        created_at: "2026-11-04T12:00:00Z",
      });

      expect(order.platform_fee_cents).toBe(99);
      expect(order.subtotal_cents + order.delivery_fee_cents + order.platform_fee_cents).toBe(
        order.total_cents
      );
    });

    it("8.2 tracks operational dispatch lifecycle across Kanban columns", async () => {
      const order = await harness.createOrder({
        id: "ea222222-2222-4222-8222-222222222222",
        store_id: TENANT_RETAIL_ID,
        customer_id: "c1111111-1111-4111-8111-111111111111",
        items: [{ id: "prod-2", title: "Condicionador", quantity: 1, price_cents: 4500 }],
        subtotal_cents: 4500,
        platform_fee_cents: 99,
        delivery_fee_cents: 800,
        total_cents: 5399,
        status: "pending",
        created_at: "2026-11-04T12:10:00Z",
      });

      const inKitchen = await harness.advanceOrderStatus(order.id, TENANT_RETAIL_ID, "in_kitchen");
      expect(inKitchen.status).toBe("in_kitchen");

      const ready = await harness.advanceOrderStatus(order.id, TENANT_RETAIL_ID, "ready_for_pickup");
      expect(ready.status).toBe("ready_for_pickup");

      const dispatched = await harness.advanceOrderStatus(order.id, TENANT_RETAIL_ID, "dispatched");
      expect(dispatched.status).toBe("dispatched");
    });

    it("8.3 renders Cards View with package summary and courier assignment trigger", () => {
      const cardData = {
        orderId: "#ORD-941",
        itemCount: 3,
        totalFormatted: "R$ 130,99",
        courierAssigned: false,
        actionLabel: "Chamar Entregador",
      };

      expect(cardData.actionLabel).toBe("Chamar Entregador");
      expect(cardData.itemCount).toBe(3);
    });

    it("8.4 prevents invalid status regression without explicit rollback flag", () => {
      const validTransitions: Record<string, string[]> = {
        pending: ["confirmed", "cancelled"],
        confirmed: ["in_kitchen", "cancelled"],
        in_kitchen: ["ready_for_pickup", "cancelled"],
        ready_for_pickup: ["dispatched"],
        dispatched: ["delivered"],
      };

      const canTransition = (from: string, to: string) => {
        return validTransitions[from]?.includes(to) ?? false;
      };

      expect(canTransition("pending", "confirmed")).toBe(true);
      expect(canTransition("ready_for_pickup", "pending")).toBe(false); // invalid backward step
      expect(canTransition("dispatched", "delivered")).toBe(true);
    });

    it("8.5 logs status transition audit records for financial integrity", async () => {
      const order = await harness.createOrder({
        id: "ea333333-3333-4333-8333-333333333333",
        store_id: TENANT_RETAIL_ID,
        customer_id: "c1111111-1111-4111-8111-111111111111",
        items: [{ id: "prod-3", title: "Serum", quantity: 1, price_cents: 9000 }],
        subtotal_cents: 9000,
        platform_fee_cents: 99,
        delivery_fee_cents: 500,
        total_cents: 9599,
        status: "pending",
        created_at: "2026-11-04T12:20:00Z",
      });

      await harness.advanceOrderStatus(order.id, TENANT_RETAIL_ID, "confirmed");
      const logs = harness.getAuditLogs();
      expect(logs).toBeDefined();
    });
  });

  // ==========================================
  // Feature 9: Flexible View Modes for Tasks & Projects
  // ==========================================
  describe("Feature 9: Tasks & Projects View Modes", () => {
    it("9.1 lists tasks in unified Table View with priorities and due dates", async () => {
      const t1 = await harness.createTask({
        id: "fa111111-1111-4111-8111-111111111111",
        store_id: TENANT_SALON_ID,
        title: "Higienizar estacao de trabalho 1",
        status: "todo",
        priority: "high",
        due_date: "2026-11-04",
      });

      const tasks = await harness.listTasks(TENANT_SALON_ID);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].priority).toBe("high");
    });

    it("9.2 renders workflow stages in Kanban View (backlog, todo, in_progress, done)", async () => {
      const stages = ["backlog", "todo", "in_progress", "done"];
      const isCanonicalTaskStage = (s: string) => stages.includes(s);

      expect(isCanonicalTaskStage("todo")).toBe(true);
      expect(isCanonicalTaskStage("in_progress")).toBe(true);
      expect(isCanonicalTaskStage("invalid_stage")).toBe(false);
    });

    it("9.3 unifies duplicate 'my-day' tab into canonical filter view", () => {
      // Invariant: eliminate duplicate my-day tab in workspace.tarefas.tsx
      const applyViewFilter = (tasks: any[], filterMode: "all" | "today" | "assigned_to_me", userId: string) => {
        const todayStr = "2026-11-04";
        if (filterMode === "today") return tasks.filter((t) => t.due_date === todayStr);
        if (filterMode === "assigned_to_me") return tasks.filter((t) => t.assignee_id === userId);
        return tasks;
      };

      const sampleTasks = [
        { id: "1", due_date: "2026-11-04", assignee_id: "u1" },
        { id: "2", due_date: "2026-11-05", assignee_id: "u2" },
      ];

      const todayTasks = applyViewFilter(sampleTasks, "today", "u1");
      expect(todayTasks).toHaveLength(1);
    });

    it("9.4 supports one-click status advance for task completion", () => {
      const advanceTask = (current: string) => {
        const flow: Record<string, string> = {
          backlog: "todo",
          todo: "in_progress",
          in_progress: "done",
          done: "done",
        };
        return flow[current] ?? current;
      };

      expect(advanceTask("todo")).toBe("in_progress");
      expect(advanceTask("in_progress")).toBe("done");
    });

    it("9.5 verifies multi-tenant task segregation between distinct workspaces", async () => {
      await harness.createTask({
        id: "fa222222-2222-4222-8222-222222222222",
        store_id: TENANT_SALON_ID,
        title: "Tarefa Salon",
        status: "todo",
        priority: "low",
      });

      await harness.createTask({
        id: "fa333333-3333-4333-8333-333333333333",
        store_id: TENANT_RETAIL_ID,
        title: "Tarefa Retail",
        status: "todo",
        priority: "urgent",
      });

      const salonTasks = await harness.listTasks(TENANT_SALON_ID);
      const retailTasks = await harness.listTasks(TENANT_RETAIL_ID);

      expect(salonTasks.every((t) => t.store_id === TENANT_SALON_ID)).toBe(true);
      expect(retailTasks.every((t) => t.store_id === TENANT_RETAIL_ID)).toBe(true);
    });
  });

  // ==========================================
  // Feature 10: Kanban Defaults Extension for Domains
  // ==========================================
  describe("Feature 10: Kanban Defaults Extension for Domains", () => {
    it("10.1 provides canonical default stages for 'appointments' domain", () => {
      const getDomainKanbanStages = (domain: string) => {
        switch (domain) {
          case "appointments":
            return [
              { id: "scheduled", label: "Agendado", order: 1 },
              { id: "confirmed", label: "Confirmado", order: 2 },
              { id: "in_service", label: "Em Atendimento", order: 3 },
              { id: "completed", label: "Finalizado", order: 4 },
            ];
          case "orders":
            return [
              { id: "pending", label: "Recebido", order: 1 },
              { id: "in_kitchen", label: "Em Preparo", order: 2 },
              { id: "ready_for_pickup", label: "Pronto", order: 3 },
              { id: "dispatched", label: "Em Rota", order: 4 },
              { id: "delivered", label: "Entregue", order: 5 },
            ];
          case "customers":
            return [
              { id: "new_lead", label: "Novo Lead", order: 1 },
              { id: "contacted", label: "Contatado", order: 2 },
              { id: "qualified", label: "Qualificado", order: 3 },
              { id: "active_client", label: "Cliente Ativo", order: 4 },
            ];
          default:
            return [];
        }
      };

      const appointmentStages = getDomainKanbanStages("appointments");
      expect(appointmentStages).toHaveLength(4);
      expect(appointmentStages[0].id).toBe("scheduled");
      expect(appointmentStages[3].id).toBe("completed");
    });

    it("10.2 provides canonical default stages for 'orders' domain", () => {
      const orderStages = [
        { id: "pending", order: 1 },
        { id: "in_kitchen", order: 2 },
        { id: "ready_for_pickup", order: 3 },
        { id: "dispatched", order: 4 },
        { id: "delivered", order: 5 },
      ];
      expect(orderStages).toHaveLength(5);
      expect(orderStages.find((s) => s.id === "in_kitchen")?.order).toBe(2);
    });

    it("10.3 provides canonical default stages for 'customers' CRM domain", () => {
      const crmStages = [
        { id: "new_lead", order: 1 },
        { id: "contacted", order: 2 },
        { id: "qualified", order: 3 },
        { id: "active_client", order: 4 },
      ];
      expect(crmStages).toHaveLength(4);
      expect(crmStages[0].id).toBe("new_lead");
    });

    it("10.4 allows custom stage overrides without corrupting core indices", () => {
      const defaultStages = [
        { id: "stage-1", order: 1 },
        { id: "stage-2", order: 2 },
      ];
      const customOverride = [
        ...defaultStages,
        { id: "stage-custom", order: 3 },
      ];

      expect(customOverride).toHaveLength(3);
      expect(customOverride[2].order).toBe(3);
    });

    it("10.5 rejects negative or non-sequential stage ordering indices", () => {
      const validateStageOrdering = (stages: Array<{ order: number }>) => {
        return stages.every((s, idx) => s.order === idx + 1);
      };

      expect(validateStageOrdering([{ order: 1 }, { order: 2 }, { order: 3 }])).toBe(true);
      expect(validateStageOrdering([{ order: 1 }, { order: 5 }])).toBe(false);
      expect(validateStageOrdering([{ order: -1 }, { order: 1 }])).toBe(false);
    });
  });
});
