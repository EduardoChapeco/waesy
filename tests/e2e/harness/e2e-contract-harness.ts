/**
 * Waesy E2E Test Suite - Contract Harness
 * Opaque-box simulation harness executing domain contracts and invariants.
 */

import {
  WorkspaceViewPreferenceSchema,
  type WorkspaceViewPreference,
  AppointmentRecordSchema,
  type AppointmentRecord,
  CustomerRecordSchema,
  type CustomerRecord,
  OrderRecordSchema,
  type OrderRecord,
  TaskRecordSchema,
  type TaskRecord,
} from "./test-fixtures";

export class E2EContractHarness {
  private viewPreferences = new Map<string, WorkspaceViewPreference>();
  private appointments = new Map<string, AppointmentRecord>();
  private customers = new Map<string, CustomerRecord>();
  private orders = new Map<string, OrderRecord>();
  private tasks = new Map<string, TaskRecord>();
  private debtLedger = new Map<string, { cpf: string; debt_cents: number; active: boolean }>();
  private auditLogs: Array<{ action: string; timestamp: string; payload: Record<string, unknown> }> = [];

  // --- View Preferences Domain ---
  async getViewPreference(storeId: string, module: string): Promise<WorkspaceViewPreference> {
    const key = `${storeId}:${module}`;
    const existing = this.viewPreferences.get(key);
    if (existing) {
      return existing;
    }
    // Default fallback
    return WorkspaceViewPreferenceSchema.parse({
      store_id: storeId,
      module: module as any,
      view_mode: "table",
      column_settings: {},
      sort_field: null,
      sort_direction: null,
      filters: {},
    });
  }

  async saveViewPreference(payload: unknown): Promise<WorkspaceViewPreference> {
    const parsed = WorkspaceViewPreferenceSchema.parse(payload);
    const key = `${parsed.store_id}:${parsed.module}`;
    this.viewPreferences.set(key, parsed);
    this.logAudit("VIEW_PREFERENCE_SAVED", { key, view_mode: parsed.view_mode });
    return parsed;
  }

  // --- Appointment Booking & Audit Domain (Feature 6 & 13) ---
  async createAppointment(payload: unknown): Promise<AppointmentRecord> {
    const parsed = AppointmentRecordSchema.parse(payload);
    this.appointments.set(parsed.id, parsed);
    this.logAudit("APPOINTMENT_CREATED", { id: parsed.id, store_id: parsed.store_id });
    return parsed;
  }

  async updateAppointmentStatus(params: {
    id: string;
    store_id: string;
    status: "scheduled" | "confirmed" | "in_service" | "completed" | "no_show" | "cancelled";
    completed_by?: string | null;
    no_show_marked_by?: string | null;
    cancelled_by?: string | null;
    cancellation_reason?: string | null;
  }): Promise<AppointmentRecord> {
    const current = this.appointments.get(params.id);
    if (!current) {
      throw new Error(`Appointment ${params.id} not found`);
    }
    if (current.store_id !== params.store_id) {
      throw new Error(`Unauthorized cross-tenant mutation on appointment ${params.id}`);
    }

    const nowIso = new Date().toISOString();
    const updated: AppointmentRecord = {
      ...current,
      status: params.status,
    };

    if (params.status === "completed") {
      updated.completed_at = nowIso;
      updated.completed_by = params.completed_by || null;
    } else if (params.status === "no_show") {
      updated.no_show_marked_at = nowIso;
      updated.no_show_marked_by = params.no_show_marked_by || null;
    } else if (params.status === "cancelled") {
      updated.cancelled_at = nowIso;
      updated.cancelled_by = params.cancelled_by || null;
      updated.cancellation_reason = params.cancellation_reason || null;
    }

    const parsed = AppointmentRecordSchema.parse(updated);
    this.appointments.set(parsed.id, parsed);
    this.logAudit("APPOINTMENT_STATUS_UPDATED", {
      id: parsed.id,
      status: params.status,
      completed_at: parsed.completed_at,
      completed_by: parsed.completed_by,
    });
    return parsed;
  }

  // --- Customers Domain (Feature 7) ---
  async createCustomer(payload: unknown): Promise<CustomerRecord> {
    const parsed = CustomerRecordSchema.parse(payload);
    this.customers.set(parsed.id, parsed);
    return parsed;
  }

  async listCustomers(storeId: string): Promise<CustomerRecord[]> {
    return Array.from(this.customers.values()).filter((c) => c.store_id === storeId);
  }

  // --- Orders & PDV/WMS Domain (Feature 8, 14, B.23) ---
  async createOrder(payload: unknown): Promise<OrderRecord> {
    const parsed = OrderRecordSchema.parse(payload);
    this.orders.set(parsed.id, parsed);
    return parsed;
  }

  async advanceOrderStatus(
    orderId: string,
    storeId: string,
    status: OrderRecord["status"]
  ): Promise<OrderRecord> {
    const order = this.orders.get(orderId);
    if (!order) throw new Error(`Order ${orderId} not found`);
    if (order.store_id !== storeId) throw new Error("Cross-tenant violation");
    order.status = status;
    this.orders.set(orderId, order);
    return order;
  }

  // --- Tasks Domain (Feature 9) ---
  async createTask(payload: unknown): Promise<TaskRecord> {
    const parsed = TaskRecordSchema.parse(payload);
    this.tasks.set(parsed.id, parsed);
    return parsed;
  }

  async listTasks(storeId: string): Promise<TaskRecord[]> {
    return Array.from(this.tasks.values()).filter((t) => t.store_id === storeId);
  }

  // --- Waesy Go Mobility Invariants (B.23, B.24) ---
  calculateTripFee(distanceKm: number, vehicleType: "moto" | "carro") {
    const minPerKm = vehicleType === "moto" ? 200 : 250; // cents
    const baseFee = vehicleType === "moto" ? 500 : 700;
    const distanceCost = Math.round(distanceKm * minPerKm);
    const driverFareCents = baseFee + distanceCost;
    const platformFixedFeeCents = 99; // Invariant B.23: Fixed R$ 0,99
    return {
      driverFareCents,
      platformFixedFeeCents,
      totalPassengerCents: driverFareCents + platformFixedFeeCents,
    };
  }

  recordPassengerDebt(cpf: string, amountCents: number) {
    this.debtLedger.set(cpf, { cpf, debt_cents: amountCents, active: true });
    this.logAudit("CUSTOMER_DEBT_RECORDED", { cpf, amountCents });
  }

  checkPassengerDebt(cpf: string): boolean {
    const entry = this.debtLedger.get(cpf);
    return entry ? entry.active : false;
  }

  // --- Audit Logging ---
  private logAudit(action: string, payload: Record<string, unknown>) {
    this.auditLogs.push({
      action,
      timestamp: new Date().toISOString(),
      payload,
    });
  }

  getAuditLogs() {
    return [...this.auditLogs];
  }

  clear() {
    this.viewPreferences.clear();
    this.appointments.clear();
    this.customers.clear();
    this.orders.clear();
    this.tasks.clear();
    this.debtLedger.clear();
    this.auditLogs = [];
  }
}
