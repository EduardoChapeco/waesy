/**
 * Waesy E2E Test Suite - Domain Fixtures and Test Contracts
 * Derived from ORIGINAL_REQUEST.md, PROJECT.md, and AGENTS.md
 */

import { z } from "zod";

// --- Feature 4 & 5: View Preferences Schema Contract ---
export const WorkspaceViewPreferenceSchema = z.object({
  store_id: z.string().uuid(),
  module: z.enum(["agenda", "clientes", "pedidos", "tarefas", "financeiro", "turismo"]),
  view_mode: z.enum(["table", "kanban", "cards", "calendar"]),
  column_settings: z.record(z.any()).optional().default({}),
  sort_field: z.string().nullable().optional(),
  sort_direction: z.enum(["asc", "desc"]).nullable().optional(),
  filters: z.record(z.any()).optional().default({}),
});

export type WorkspaceViewPreference = z.infer<typeof WorkspaceViewPreferenceSchema>;

// --- Feature 2: KPI Metric Contract ---
export const KpiMetricSchema = z.object({
  title: z.string().max(30),
  value: z.union([z.string(), z.number()]),
  subValue: z.string().optional(),
  trendDirection: z.enum(["up", "down", "neutral"]).optional(),
  trendText: z.string().optional(),
  sparklineData: z.array(z.number()).optional(),
  sparklineColor: z.string().optional(),
  tooltip: z.string().optional(),
});

// --- Feature 6 & 13: Appointment & Audit Contract ---
export const AppointmentStatusEnum = z.enum([
  "scheduled",
  "confirmed",
  "in_service",
  "completed",
  "no_show",
  "cancelled",
]);

export const AppointmentRecordSchema = z.object({
  id: z.string().uuid(),
  store_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  customer_name: z.string(),
  professional_id: z.string().uuid(),
  professional_name: z.string(),
  service_name: z.string(),
  price_cents: z.number().int().nonnegative(),
  scheduled_at: z.string().datetime(),
  status: AppointmentStatusEnum,
  completed_at: z.string().datetime().nullable().optional(),
  completed_by: z.string().uuid().nullable().optional(),
  no_show_marked_at: z.string().datetime().nullable().optional(),
  no_show_marked_by: z.string().uuid().nullable().optional(),
  cancelled_at: z.string().datetime().nullable().optional(),
  cancelled_by: z.string().uuid().nullable().optional(),
  cancellation_reason: z.string().nullable().optional(),
});

export type AppointmentRecord = z.infer<typeof AppointmentRecordSchema>;

// --- Feature 7: Customer CRM Contract ---
export const CustomerRecordSchema = z.object({
  id: z.string().uuid(),
  store_id: z.string().uuid(),
  name: z.string().min(2),
  phone: z.string(),
  email: z.string().email().optional(),
  lead_stage: z.enum(["new_lead", "contacted", "qualified", "active_client", "churned"]),
  total_spent_cents: z.number().int().nonnegative().default(0),
  appointments_count: z.number().int().nonnegative().default(0),
  created_at: z.string().datetime(),
});

export type CustomerRecord = z.infer<typeof CustomerRecordSchema>;

// --- Feature 8: Order & Delivery Contract ---
export const OrderRecordSchema = z.object({
  id: z.string().uuid(),
  store_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      quantity: z.number().int().positive(),
      price_cents: z.number().int().nonnegative(),
    })
  ),
  subtotal_cents: z.number().int().nonnegative(),
  platform_fee_cents: z.literal(99), // Invariant B.23: Fixed R$ 0,99 fee (0% commission)
  delivery_fee_cents: z.number().int().nonnegative(),
  total_cents: z.number().int().nonnegative(),
  status: z.enum([
    "pending",
    "confirmed",
    "in_kitchen",
    "ready_for_pickup",
    "dispatched",
    "delivered",
    "cancelled",
  ]),
  created_at: z.string().datetime(),
});

export type OrderRecord = z.infer<typeof OrderRecordSchema>;

// --- Feature 9: Task Contract ---
export const TaskRecordSchema = z.object({
  id: z.string().uuid(),
  store_id: z.string().uuid(),
  title: z.string().min(1),
  status: z.enum(["backlog", "todo", "in_progress", "done"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  due_date: z.string().nullable().optional(),
  assignee_id: z.string().uuid().nullable().optional(),
});

export type TaskRecord = z.infer<typeof TaskRecordSchema>;

// --- Canonical Fixtures ---
export const TENANT_SALON_ID = "a1111111-1111-4111-8111-111111111111";
export const TENANT_RETAIL_ID = "b2222222-2222-4222-8222-222222222222";
export const TENANT_CLINIC_ID = "c3333333-3333-4333-8333-333333333333";

export const USER_ADMIN_ID = "e9999999-9999-4999-8999-999999999999";
export const USER_STAFF_ID = "f8888888-8888-4888-8888-888888888888";

export const CANONICAL_SALON_FIXTURES = {
  storeId: TENANT_SALON_ID,
  kpiMetrics: [
    {
      title: "Agendamentos Hoje",
      value: 18,
      subValue: "+22% vs ontem",
      trendDirection: "up" as const,
      trendText: "+22%",
      sparklineData: [10, 12, 14, 11, 15, 18],
    },
    {
      title: "Faturamento Diario",
      value: "R$ 2.450,00",
      subValue: "Meta: R$ 3.000",
      trendDirection: "up" as const,
      trendText: "+8%",
      sparklineData: [1200, 1500, 1800, 2100, 2450],
    },
    {
      title: "Taxa de Ocupacao",
      value: "84%",
      subValue: "6 profissionais",
      trendDirection: "neutral" as const,
      trendText: "Estavel",
      sparklineData: [80, 82, 85, 83, 84],
    },
    {
      title: "Ticket Medio",
      value: "R$ 136,10",
      subValue: "18 atendimentos",
      trendDirection: "up" as const,
      trendText: "+5%",
      sparklineData: [120, 125, 130, 128, 136],
    },
  ],
  appointments: [
    {
      id: "d1111111-1111-4111-8111-111111111111",
      store_id: TENANT_SALON_ID,
      customer_id: "e1111111-1111-4111-8111-111111111111",
      customer_name: "Mariana Costa",
      professional_id: USER_STAFF_ID,
      professional_name: "Juliana Silva (Cabeleireira)",
      service_name: "Corte e Escova",
      price_cents: 18000,
      scheduled_at: "2026-11-04T10:00:00Z",
      status: "scheduled" as const,
    },
    {
      id: "d2222222-2222-4222-8222-222222222222",
      store_id: TENANT_SALON_ID,
      customer_id: "e2222222-2222-4222-8222-222222222222",
      customer_name: "Fernanda Lima",
      professional_id: USER_STAFF_ID,
      professional_name: "Juliana Silva (Cabeleireira)",
      service_name: "Coloracao e Mechas",
      price_cents: 35000,
      scheduled_at: "2026-11-04T11:30:00Z",
      status: "confirmed" as const,
    },
  ],
  customers: [
    {
      id: "e1111111-1111-4111-8111-111111111111",
      store_id: TENANT_SALON_ID,
      name: "Mariana Costa",
      phone: "+5511999991111",
      email: "mariana.costa@example.com",
      lead_stage: "active_client" as const,
      total_spent_cents: 145000,
      appointments_count: 8,
      created_at: "2026-01-15T09:00:00Z",
    },
    {
      id: "e2222222-2222-4222-8222-222222222222",
      store_id: TENANT_SALON_ID,
      name: "Fernanda Lima",
      phone: "+5511999992222",
      email: "fernanda.lima@example.com",
      lead_stage: "qualified" as const,
      total_spent_cents: 35000,
      appointments_count: 1,
      created_at: "2026-10-20T14:30:00Z",
    },
  ],
};
