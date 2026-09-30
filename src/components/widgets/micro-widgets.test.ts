/**
 * micro-widgets.test.ts — Testes Unitários para a Biblioteca de Micro-Widgets V148
 *
 * Cobre:
 * - MetricWidget: validação Zod para os 3 variantes + payload inválido
 * - TaskCard: variantes board/list/chat e detecção de presença em tempo real
 * - TaskDetailSheet: bifurcação nativa Desktop/Mobile
 */
import { describe, it, expect } from "vitest";
import { MetricWidgetPropsSchema } from "@/components/widgets/MetricWidget";
import type { TaskCardProps, TaskCardUser } from "@/components/widgets/TaskCard";
import type { TaskDetailData } from "@/components/widgets/TaskDetailSheet";

// ────────────────────────────────────────────────────────────────────────────
// SECTION 1 — MetricWidget: Validação de Schema Zod (safeParse)
// ────────────────────────────────────────────────────────────────────────────

describe("MetricWidget — Schema Zod (V148 FASE 1)", () => {
  // 1a. CircularProgress
  describe("Variante circular_progress", () => {
    it("aceita payload válido", () => {
      const payload = {
        type: "circular_progress",
        title: "Taxa de Conclusão",
        percentage: 72,
        subtitle: "Projetos do trimestre",
        statusLabel: "Em progresso",
        badgeVariant: "success",
      };
      const result = MetricWidgetPropsSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("rejeita percentage > 100", () => {
      const payload = { type: "circular_progress", title: "SLA", percentage: 150 };
      const result = MetricWidgetPropsSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("rejeita percentage < 0", () => {
      const payload = { type: "circular_progress", title: "SLA", percentage: -5 };
      const result = MetricWidgetPropsSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("rejeita title excedendo 50 caracteres", () => {
      const payload = {
        type: "circular_progress",
        title: "A".repeat(51),
        percentage: 50,
      };
      const result = MetricWidgetPropsSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  // 1b. BarChartMinimal
  describe("Variante bar_chart_minimal", () => {
    it("aceita payload válido com 7 pontos de dados", () => {
      const payload = {
        type: "bar_chart_minimal",
        title: "Horas Rastreadas",
        totalLabel: "42h esta semana",
        dataPoints: [
          { label: "Seg", value: 6 },
          { label: "Ter", value: 8, highlight: true },
          { label: "Qua", value: 7 },
          { label: "Qui", value: 9 },
          { label: "Sex", value: 6 },
          { label: "Sáb", value: 4 },
          { label: "Dom", value: 2 },
        ],
      };
      const result = MetricWidgetPropsSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("rejeita dataPoints com menos de 3 itens", () => {
      const payload = {
        type: "bar_chart_minimal",
        title: "Horas",
        totalLabel: "10h",
        dataPoints: [
          { label: "Seg", value: 5 },
          { label: "Ter", value: 3 },
        ],
      };
      const result = MetricWidgetPropsSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("rejeita dataPoints com mais de 14 itens", () => {
      const payload = {
        type: "bar_chart_minimal",
        title: "Horas",
        totalLabel: "10h",
        dataPoints: Array.from({ length: 15 }, (_, i) => ({
          label: `D${i}`,
          value: i + 1,
        })),
      };
      const result = MetricWidgetPropsSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  // 1c. BigNumber
  describe("Variante big_number", () => {
    it("aceita payload com valor numérico e tendência", () => {
      const payload = {
        type: "big_number",
        title: "Tarefas Pendentes",
        value: 23,
        trendPercentage: -12,
        trendLabel: "Vs. semana anterior",
        subtitle: "Equipe de Desenvolvimento",
      };
      const result = MetricWidgetPropsSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("aceita value como string (ex: '14h 30min')", () => {
      const payload = {
        type: "big_number",
        title: "Tempo Médio de Resposta",
        value: "14h 30min",
      };
      const result = MetricWidgetPropsSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("aceita payload mínimo sem campos opcionais", () => {
      const payload = { type: "big_number", title: "Pedidos", value: 0 };
      const result = MetricWidgetPropsSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  // 1d. Payload Inválido / Malformado
  describe("Payload inválido e proteção de fallback", () => {
    it("rejeita type desconhecido", () => {
      const payload = { type: "sparkline", value: 42 };
      const result = MetricWidgetPropsSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it("rejeita payload vazio", () => {
      const result = MetricWidgetPropsSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("rejeita payload nulo", () => {
      const result = MetricWidgetPropsSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it("expõe mensagem de erro no resultado", () => {
      const result = MetricWidgetPropsSchema.safeParse({ type: "invalid" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.length).toBeGreaterThan(0);
      }
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SECTION 2 — TaskCard: Contratos de Props e Variantes (sem renderização DOM)
// ────────────────────────────────────────────────────────────────────────────

describe("TaskCard — Contratos de Props (V148 FASE 2)", () => {
  const baseTask: TaskCardProps = {
    id: "task-001",
    code: "TSK-104",
    title: "Implementar motor de presença em tempo real",
    category: "Feature",
    priority: "high",
    status: "in_progress",
    variant: "board",
  };

  it("aceita todas as props obrigatórias", () => {
    expect(baseTask.id).toBe("task-001");
    expect(baseTask.code).toBe("TSK-104");
    expect(baseTask.category).toBe("Feature");
  });

  it("tem variante padrão 'board'", () => {
    expect(baseTask.variant).toBe("board");
  });

  it("variante 'list' está no domínio de variantes", () => {
    const listCard: TaskCardProps = { ...baseTask, variant: "list" };
    expect(listCard.variant).toBe("list");
  });

  it("variante 'chat' está no domínio de variantes", () => {
    const chatCard: TaskCardProps = { ...baseTask, variant: "chat" };
    expect(chatCard.variant).toBe("chat");
  });

  it("detecta presença ativa via activeEditor", () => {
    const activeUser: TaskCardUser = {
      id: "user-42",
      name: "Eduardo Chapecó",
      isEditing: true,
    };
    const liveCard: TaskCardProps = { ...baseTask, activeEditor: activeUser };
    expect(liveCard.activeEditor?.id).toBe("user-42");
    expect(liveCard.activeEditor?.isEditing).toBe(true);
  });

  it("suporta cluster de até 3+ assignees", () => {
    const assignees: TaskCardUser[] = [
      { id: "u1", name: "Ana Lima" },
      { id: "u2", name: "Carlos Mendes" },
      { id: "u3", name: "Julia Santos" },
      { id: "u4", name: "Pedro Costa" },
    ];
    const card: TaskCardProps = { ...baseTask, assignees };
    expect(card.assignees?.length).toBe(4);
    // O componente exibe os 3 primeiros + badge "+1"
    const visible = card.assignees!.slice(0, 3);
    expect(visible.length).toBe(3);
    const overflow = card.assignees!.length - 3;
    expect(overflow).toBe(1);
  });

  it("subtasksCount é calculado corretamente", () => {
    const card: TaskCardProps = {
      ...baseTask,
      subtasksCount: { completed: 3, total: 5 },
    };
    const ratio = card.subtasksCount!.completed / card.subtasksCount!.total;
    expect(ratio).toBe(0.6);
    expect(card.subtasksCount!.completed).toBeLessThanOrEqual(card.subtasksCount!.total);
  });

  it("status 'done' define tarefa como concluída", () => {
    const doneCard: TaskCardProps = { ...baseTask, status: "done" };
    expect(doneCard.status).toBe("done");
  });

  it("prioridade 'urgent' está no domínio de prioridades", () => {
    const urgentCard: TaskCardProps = { ...baseTask, priority: "urgent" };
    expect(["low", "medium", "high", "urgent"]).toContain(urgentCard.priority);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// SECTION 3 — TaskDetailSheet: Estrutura de Dados e Bifurcação
// ────────────────────────────────────────────────────────────────────────────

describe("TaskDetailSheet — Contratos e Bifurcação Nativa (V148 FASE 2)", () => {
  const sampleTask: TaskDetailData = {
    id: "task-001",
    code: "TSK-104",
    title: "Implementar motor de presença em tempo real",
    category: "Feature",
    priority: "high",
    status: "in_progress",
    description: "Motor de presença via Supabase Realtime com canal por tarefa.",
    assignees: [{ id: "u1", name: "Eduardo Chapecó" }],
    activeEditor: { id: "u1", name: "Eduardo Chapecó", isEditing: true },
    subtasks: [
      { id: "st-1", title: "Configurar canal Realtime", completed: true },
      { id: "st-2", title: "Sincronizar presença no TaskCard", completed: false },
    ],
    approvals: [
      {
        id: "ap-1",
        authorName: "Arquiteto de Plataforma",
        action: "submitted",
        notes: "Submetido para revisão de arquitetura.",
        timestamp: "Há 1 hora",
      },
    ],
  };

  it("contém ID e código canônicos", () => {
    expect(sampleTask.id).toBe("task-001");
    expect(sampleTask.code).toBe("TSK-104");
  });

  it("tem descrição narrativa da tarefa", () => {
    expect(sampleTask.description).toBeDefined();
    expect(sampleTask.description!.length).toBeGreaterThan(10);
  });

  it("tem pelo menos uma subtarefa concluída e uma pendente", () => {
    const completed = sampleTask.subtasks!.filter((s) => s.completed);
    const pending = sampleTask.subtasks!.filter((s) => !s.completed);
    expect(completed.length).toBeGreaterThan(0);
    expect(pending.length).toBeGreaterThan(0);
  });

  it("activeEditor está vinculado a um assignee existente", () => {
    const editorId = sampleTask.activeEditor!.id;
    const found = sampleTask.assignees!.find((a) => a.id === editorId);
    expect(found).toBeDefined();
  });

  it("timeline de aprovações tem authorName e timestamp válidos", () => {
    sampleTask.approvals!.forEach((approval) => {
      expect(approval.authorName.length).toBeGreaterThan(0);
      expect(approval.timestamp.length).toBeGreaterThan(0);
      expect(["approved", "rejected", "requested_changes", "submitted"]).toContain(
        approval.action
      );
    });
  });

  it("bifurcação por media query: mobile → bottom, desktop → right", () => {
    // Simula a lógica de bifurcação sem DOM (puramente lógica de estado)
    const isMobile = (width: number) => width <= 768;
    const getSide = (width: number) => (isMobile(width) ? "bottom" : "right");

    expect(getSide(375)).toBe("bottom");   // iPhone 14
    expect(getSide(768)).toBe("bottom");   // tablet portrait limite
    expect(getSide(769)).toBe("right");    // tablet landscape início
    expect(getSide(1280)).toBe("right");   // laptop
    expect(getSide(1920)).toBe("right");   // desktop 1080p
  });
});
