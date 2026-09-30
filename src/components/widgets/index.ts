/**
 * Widget Library — Chat-Injectable Micro-UIs (MASTER PROMPT V148)
 *
 * Exportações canônicas da biblioteca de Micro-Widgets projetados para injeção
 * dinâmica pela IA dentro do fluxo de chat e uso em painéis de Dashboard.
 *
 * Todos os componentes consomem exclusivamente tokens CSS do Design Silencioso.
 * Todos os payloads são validados via Zod antes da renderização.
 */

// ── Metric Widgets (Fase 1) ──────────────────────────────────────────────────
export { MetricWidget, MetricWidgetPropsSchema } from "./MetricWidget";
export type { MetricWidgetProps } from "./MetricWidget";

// ── Task Kanban Card (Fase 2) ─────────────────────────────────────────────────
export { TaskCard } from "./TaskCard";
export type { TaskCardProps, TaskCardUser } from "./TaskCard";

// ── Task Detail Sheet (Fase 2 — Bifurcação Nativa) ───────────────────────────
export { TaskDetailSheet } from "./TaskDetailSheet";
export type {
  TaskDetailSheetProps,
  TaskDetailData,
  SubtaskItem,
  ApprovalEvent,
} from "./TaskDetailSheet";
