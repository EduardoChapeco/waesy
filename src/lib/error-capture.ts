/**
 * ============================================================================
 * Waesy Platform — Captura e Correlação de Erros (Fases S32 e S33)
 * ============================================================================
 * Substitui o buffer cego legado de 5 segundos pelo registro correlacionado
 * de telemetria por traceId/requestId.
 */

import { errorRegistry, type CorrelatedErrorEvent } from "./telemetry/error-correlator";

export { errorRegistry, type CorrelatedErrorEvent };

let latestTraceId: string | undefined;

/**
 * Registra um erro de forma correlacionada a um traceId/requestId
 */
export function recordCorrelatedError(
  traceId: string,
  error: unknown,
  meta?: {
    source?: "client" | "worker" | "ssr" | "api";
    tenantId?: string;
    userId?: string;
    routeId?: string;
    context?: Record<string, unknown>;
  }
): CorrelatedErrorEvent {
  latestTraceId = traceId;
  return errorRegistry.record(traceId, error, meta);
}

// Ouvintes globais de runtime (navegador / worker)
if (typeof globalThis.addEventListener === "function") {
  globalThis.addEventListener("error", (event) => {
    const traceId = `client_err_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    recordCorrelatedError(traceId, (event as ErrorEvent).error ?? event, { source: "client" });
  });

  globalThis.addEventListener("unhandledrejection", (event) => {
    const traceId = `client_rejection_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    recordCorrelatedError(traceId, (event as PromiseRejectionEvent).reason, { source: "client" });
  });
}

/**
 * Consome o erro correlacionado a um traceId. Se nenhum for especificado,
 * tenta recuperar o erro mais recente registrado.
 */
export function consumeLastCapturedError(traceId?: string): unknown {
  const targetId = traceId || latestTraceId;
  if (!targetId) return undefined;

  const event = errorRegistry.consume(targetId);
  if (targetId === latestTraceId) {
    latestTraceId = undefined;
  }

  if (!event) return undefined;

  // Reconstrói uma instância de Error para logging legível
  const err = new Error(event.error.message);
  err.name = event.error.name;
  if (event.error.stack) {
    err.stack = event.error.stack;
  }
  return err;
}
