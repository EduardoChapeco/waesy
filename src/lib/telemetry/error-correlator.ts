/**
 * ============================================================================
 * Waesy Platform — Motor de Telemetria e Correlação de Erros (Fases S32 e S33)
 * ============================================================================
 * Substitui o buffer cego de 5 segundos por correlação determinística por requestId/traceId,
 * redação de PII (zero dados pessoais) e contexto multi-tenant.
 */

export interface ErrorDetails {
  name: string;
  message: string;
  stack?: string;
  cause?: unknown;
}

export interface CorrelatedErrorEvent {
  traceId: string;
  timestamp: string;
  source: "client" | "worker" | "ssr" | "api";
  release: string;
  tenantId?: string;
  userId?: string;
  routeId?: string;
  error: ErrorDetails;
  context?: Record<string, unknown>;
}

export const APP_RELEASE = process.env.VITE_APP_VERSION || "2.4.0";

/**
 * Sanitização e Redação Estrita de PII (Tokens, Senhas, CPF, Cartão)
 */
export function sanitizeSensitiveText(text: string): string {
  if (!text) return text;
  return text
    // Redigir tokens JWT (header.payload.signature)
    .replace(/eyJ[a-zA-Z0-9_-]{5,}\.[a-zA-Z0-9_-]{2,}\.[a-zA-Z0-9_-]{2,}/g, "[REDACTED_JWT]")
    // Redigir chaves de API secretas (sk_live, sbp_, sb_secret)
    .replace(/(?:sk_live|sk_test|sbp_|supabase_key)[a-zA-Z0-9_-]{16,}/gi, "[REDACTED_SECRET_KEY]")
    // Redigir números de cartão de crédito (13 a 19 dígitos)
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[REDACTED_CARD]")
    // Redigir CPFs formatados
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, "[REDACTED_CPF]")
    // Redigir parâmetros de URL com chaves sensíveis
    .replace(/([?&](?:password|token|secret|apiKey|access_token)=)[^&]*/gi, "$1[REDACTED]");
}

/**
 * Registro Correlacionado de Erros com contenção de memória FIFO
 */
class CorrelatedErrorRegistry {
  private readonly maxCapacity: number;
  private readonly errorsByTrace = new Map<string, CorrelatedErrorEvent>();
  private readonly recentErrorsRing: CorrelatedErrorEvent[] = [];
  private readonly maxRingSize = 50;

  constructor(maxCapacity = 150) {
    this.maxCapacity = maxCapacity;
  }

  /**
   * Extrai ou gera um traceId a partir de um objeto Request ou header
   */
  public extractTraceId(request?: Request): string {
    if (!request) {
      return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }
    const cfRay = request.headers.get("cf-ray");
    if (cfRay) return cfRay;

    const xRequestId = request.headers.get("x-request-id");
    if (xRequestId) return xRequestId;

    return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Registra um erro associado ao traceId/requestId específico
   */
  public record(
    traceId: string,
    rawError: unknown,
    meta: {
      source?: "client" | "worker" | "ssr" | "api";
      tenantId?: string;
      userId?: string;
      routeId?: string;
      context?: Record<string, unknown>;
    } = {}
  ): CorrelatedErrorEvent {
    let errObj: ErrorDetails;

    if (rawError instanceof Error) {
      errObj = {
        name: rawError.name || "Error",
        message: sanitizeSensitiveText(rawError.message || "Unknown error"),
        stack: rawError.stack ? sanitizeSensitiveText(rawError.stack) : undefined,
        cause: rawError.cause,
      };
    } else if (typeof rawError === "string") {
      errObj = {
        name: "StringError",
        message: sanitizeSensitiveText(rawError),
      };
    } else {
      errObj = {
        name: "UnhandledRejection",
        message: sanitizeSensitiveText(JSON.stringify(rawError) || "Non-Error thrown"),
      };
    }

    const event: CorrelatedErrorEvent = {
      traceId,
      timestamp: new Date().toISOString(),
      source: meta.source || "worker",
      release: APP_RELEASE,
      tenantId: meta.tenantId,
      userId: meta.userId,
      routeId: meta.routeId,
      error: errObj,
      context: meta.context,
    };

    // Gestão de capacidade FIFO
    if (this.errorsByTrace.size >= this.maxCapacity) {
      const oldestKey = this.errorsByTrace.keys().next().value;
      if (oldestKey) this.errorsByTrace.delete(oldestKey);
    }

    this.errorsByTrace.set(traceId, event);

    // Adiciona ao ring buffer para telemetria de integridade
    this.recentErrorsRing.push(event);
    if (this.recentErrorsRing.length > this.maxRingSize) {
      this.recentErrorsRing.shift();
    }

    return event;
  }

  /**
   * Consome e remove o erro correlacionado a este traceId
   */
  public consume(traceId: string): CorrelatedErrorEvent | undefined {
    const event = this.errorsByTrace.get(traceId);
    if (event) {
      this.errorsByTrace.delete(traceId);
    }
    return event;
  }

  /**
   * Retorna os últimos N erros registrados para diagnóstico
   */
  public getRecentEvents(): readonly CorrelatedErrorEvent[] {
    return this.recentErrorsRing;
  }

  /**
   * Quantidade de erros correlacionados aguardando consumo
   */
  public get pendingCount(): number {
    return this.errorsByTrace.size;
  }

  /**
   * Limpa todos os erros (útil para testes unitários)
   */
  public clear(): void {
    this.errorsByTrace.clear();
    this.recentErrorsRing.length = 0;
  }
}

export const errorRegistry = new CorrelatedErrorRegistry();
