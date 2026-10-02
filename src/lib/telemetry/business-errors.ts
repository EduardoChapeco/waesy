/**
 * ============================================================================
 * Waesy Platform — Contabilização Sistemática de Erros de Negócio (Fase S36)
 * ============================================================================
 * Captura, indexação e agregação estatística de falhas de domínio e negócio
 * (pagamentos recusados, estoque esgotado, limites de cota, transições ilegais).
 */

import { sanitizeSensitiveText } from "./error-correlator";

export type BusinessErrorCode =
  | "PAYMENT_REJECTED"
  | "STOCK_DEPLETED"
  | "PLAN_QUOTA_EXCEEDED"
  | "INVALID_STATE_TRANSITION"
  | "TENANT_ACCESS_DENIED"
  | "SCHEMA_VALIDATION_ERROR"
  | "CONCURRENCY_COLLISION"
  | "PROMO_CODE_INVALID";

export interface BusinessErrorEvent {
  id: string;
  code: BusinessErrorCode;
  message: string;
  tenantId?: string;
  userId?: string;
  routeId?: string;
  traceId: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export class BusinessError extends Error {
  public readonly code: BusinessErrorCode;
  public readonly tenantId?: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    code: BusinessErrorCode,
    message: string,
    meta: { tenantId?: string; context?: Record<string, unknown> } = {}
  ) {
    super(message);
    this.name = "BusinessError";
    this.code = code;
    this.tenantId = meta.tenantId;
    this.context = meta.context;
  }
}

/**
 * Sanitiza recursivamente valores de um dicionário de contexto para evitar vazamento de dados
 */
function sanitizeContext(ctx?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!ctx) return undefined;
  const result: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(ctx)) {
    if (typeof val === "string") {
      result[key] = sanitizeSensitiveText(val);
    } else if (typeof val === "object" && val !== null && Array.isArray(val) === false) {
      result[key] = sanitizeContext(val as Record<string, unknown>);
    } else {
      result[key] = val;
    }
  }

  return result;
}

/**
 * Registro e Agregador de Erros de Negócio
 */
class BusinessErrorsRegistry {
  private readonly maxCapacity: number;
  private readonly events: BusinessErrorEvent[] = [];
  private readonly counters = new Map<BusinessErrorCode, number>();
  private readonly tenantCounters = new Map<string, Map<BusinessErrorCode, number>>();

  constructor(maxCapacity = 300) {
    this.maxCapacity = maxCapacity;
  }

  public record(params: {
    code: BusinessErrorCode;
    message: string;
    tenantId?: string;
    userId?: string;
    routeId?: string;
    traceId?: string;
    context?: Record<string, unknown>;
  }): BusinessErrorEvent {
    const traceId =
      params.traceId || `biz_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const eventId = `be_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const event: BusinessErrorEvent = {
      id: eventId,
      code: params.code,
      message: sanitizeSensitiveText(params.message),
      tenantId: params.tenantId,
      userId: params.userId,
      routeId: params.routeId,
      traceId,
      timestamp: new Date().toISOString(),
      context: sanitizeContext(params.context),
    };

    // Incrementar contador global
    const currentGlobal = this.counters.get(params.code) || 0;
    this.counters.set(params.code, currentGlobal + 1);

    // Incrementar contador por tenant se presente
    if (params.tenantId) {
      if (!this.tenantCounters.has(params.tenantId)) {
        this.tenantCounters.set(params.tenantId, new Map());
      }
      const tenantMap = this.tenantCounters.get(params.tenantId)!;
      const currentTenantCount = tenantMap.get(params.code) || 0;
      tenantMap.set(params.code, currentTenantCount + 1);
    }

    // Gerenciar capacidade do ring buffer
    this.events.push(event);
    if (this.events.length > this.maxCapacity) {
      this.events.shift();
    }

    return event;
  }

  public getFrequencyByCode(): Record<BusinessErrorCode, number> {
    const allCodes: BusinessErrorCode[] = [
      "PAYMENT_REJECTED",
      "STOCK_DEPLETED",
      "PLAN_QUOTA_EXCEEDED",
      "INVALID_STATE_TRANSITION",
      "TENANT_ACCESS_DENIED",
      "SCHEMA_VALIDATION_ERROR",
      "CONCURRENCY_COLLISION",
      "PROMO_CODE_INVALID",
    ];

    const result = {} as Record<BusinessErrorCode, number>;
    for (const code of allCodes) {
      result[code] = this.counters.get(code) || 0;
    }
    return result;
  }

  public getFrequencyByTenant(tenantId: string): Record<string, number> {
    const tenantMap = this.tenantCounters.get(tenantId);
    if (!tenantMap) return {};
    return Object.fromEntries(tenantMap.entries());
  }

  public getRecentEvents(limit = 50): readonly BusinessErrorEvent[] {
    return this.events.slice(-limit);
  }

  public get totalErrorsRecorded(): number {
    let total = 0;
    for (const count of this.counters.values()) {
      total += count;
    }
    return total;
  }

  public clear(): void {
    this.events.length = 0;
    this.counters.clear();
    this.tenantCounters.clear();
  }
}

export const businessErrorsRegistry = new BusinessErrorsRegistry();

/**
 * Função de conveniência para registrar um erro de negócio
 */
export function recordBusinessError(params: {
  code: BusinessErrorCode;
  message: string;
  tenantId?: string;
  userId?: string;
  routeId?: string;
  traceId?: string;
  context?: Record<string, unknown>;
}): BusinessErrorEvent {
  return businessErrorsRegistry.record(params);
}
