/**
 * ============================================================================
 * Waesy Platform — Detecção de Quebra Silenciosa (Fase S34 - Bloco E)
 * ============================================================================
 * Monitora, captura e previne falhas silenciosas em jobs em background,
 * promessas rejeitadas órfãs e retornos nulos inesperados de entidades críticas.
 */

import { errorRegistry, type CorrelatedErrorEvent } from "./error-correlator";

export class SilentEntityNotFoundError extends Error {
  public readonly entityName: string;
  public readonly tenantId?: string;
  public readonly routeId?: string;
  public readonly traceId: string;

  constructor(
    entityName: string,
    meta: { tenantId?: string; routeId?: string; traceId: string }
  ) {
    super(`Entidade obrigatória não encontrada: "${entityName}"`);
    this.name = "SilentEntityNotFoundError";
    this.entityName = entityName;
    this.tenantId = meta.tenantId;
    this.routeId = meta.routeId;
    this.traceId = meta.traceId;
  }
}

export class AsyncJobTimeoutError extends Error {
  public readonly jobName: string;
  public readonly timeoutMs: number;
  public readonly traceId: string;

  constructor(jobName: string, timeoutMs: number, traceId: string) {
    super(`Job assíncrono "${jobName}" excedeu o timeout operacional de ${timeoutMs}ms`);
    this.name = "AsyncJobTimeoutError";
    this.jobName = jobName;
    this.timeoutMs = timeoutMs;
    this.traceId = traceId;
  }
}

export interface AsyncJobOptions<T> {
  timeoutMs?: number;
  tenantId?: string;
  userId?: string;
  routeId?: string;
  traceId?: string;
  fallbackValue?: T;
  onError?: (err: unknown, traceId: string) => void;
}

export interface AsyncJobResult<T> {
  ok: boolean;
  data?: T;
  error?: unknown;
  durationMs: number;
  traceId: string;
}

/**
 * Executa um job assíncrono com barreira defensiva, proteção contra timeout,
 * medição de duração e registro correlacionado no errorRegistry.
 */
export async function executeAsyncJobSafely<T>(
  jobName: string,
  fn: () => Promise<T>,
  options: AsyncJobOptions<T> = {}
): Promise<AsyncJobResult<T>> {
  const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
  const traceId = options.traceId || `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const timeoutMs = options.timeoutMs ?? 30_000;

  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new AsyncJobTimeoutError(jobName, timeoutMs, traceId));
      }, timeoutMs);
    });

    const data = await Promise.race([fn(), timeoutPromise]);

    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }

    const endTime = typeof performance !== "undefined" ? performance.now() : Date.now();
    const durationMs = Math.round(endTime - startTime);

    return {
      ok: true,
      data,
      durationMs,
      traceId,
    };
  } catch (err: unknown) {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }

    const endTime = typeof performance !== "undefined" ? performance.now() : Date.now();
    const durationMs = Math.round(endTime - startTime);

    errorRegistry.record(traceId, err, {
      source: "worker",
      tenantId: options.tenantId,
      userId: options.userId,
      routeId: options.routeId,
      context: {
        jobName,
        durationMs,
        timeoutMs,
        isTimeout: err instanceof AsyncJobTimeoutError,
      },
    });

    if (options.onError) {
      try {
        options.onError(err, traceId);
      } catch (onErrorErr) {
        // Falha no callback onError também é registrada para evitar vazamento silencioso
        errorRegistry.record(`${traceId}_onerror`, onErrorErr, {
          source: "worker",
          tenantId: options.tenantId,
        });
      }
    }

    return {
      ok: false,
      data: options.fallbackValue,
      error: err,
      durationMs,
      traceId,
    };
  }
}

/**
 * Assegura que uma entidade esperada não seja nula ou indefinida.
 * Se nula, registra evento estruturado de quebra silenciosa e lança exceção tipada.
 */
export function assertRequiredEntity<T>(
  value: T | null | undefined,
  entityName: string,
  meta: {
    tenantId?: string;
    routeId?: string;
    traceId?: string;
    context?: Record<string, unknown>;
  } = {}
): T {
  if (value === null || value === undefined) {
    const traceId = meta.traceId || `entity_null_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const error = new SilentEntityNotFoundError(entityName, {
      tenantId: meta.tenantId,
      routeId: meta.routeId,
      traceId,
    });

    errorRegistry.record(traceId, error, {
      source: "worker",
      tenantId: meta.tenantId,
      routeId: meta.routeId,
      context: {
        entityName,
        ...meta.context,
      },
    });

    throw error;
  }

  return value;
}

/**
 * Monitor global para registrar promessas rejeitadas e não tratadas.
 * Retorna função de cancelamento (teardown).
 */
export function setupUnhandledRejectionMonitor(
  onSilentBreak?: (event: CorrelatedErrorEvent) => void
): () => void {
  const isBrowser = typeof window !== "undefined";
  const hasProcess = typeof process !== "undefined" && typeof process.on === "function";

  if (isBrowser) {
    const handler = (event: PromiseRejectionEvent) => {
      const traceId = `unhandled_client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const recorded = errorRegistry.record(traceId, event.reason, {
        source: "client",
      });
      if (onSilentBreak) {
        onSilentBreak(recorded);
      }
    };

    window.addEventListener("unhandledrejection", handler);
    return () => window.removeEventListener("unhandledrejection", handler);
  }

  if (hasProcess) {
    const handler = (reason: unknown) => {
      const traceId = `unhandled_node_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const recorded = errorRegistry.record(traceId, reason, {
        source: "worker",
      });
      if (onSilentBreak) {
        onSilentBreak(recorded);
      }
    };

    process.on("unhandledRejection", handler);
    return () => {
      process.off("unhandledRejection", handler);
    };
  }

  return () => {};
}
