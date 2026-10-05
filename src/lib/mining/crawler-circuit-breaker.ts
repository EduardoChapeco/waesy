/**
 * crawler-circuit-breaker.ts — Proteção Ativa Contra Loops, Falhas em Cascata e Sobrecarga de Servidor
 *
 * Padrão Circuit Breaker com 3 estados (CLOSED, OPEN, HALF_OPEN) isolado por domínio/alvo.
 * Regra DL-04: Proibido uso de negação unária (!ident) para conformidade com design-lint.
 */

export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Número de falhas consecutivas antes de abrir (padrão: 3)
  cooldownPeriodMs?: number; // Tempo de espera no estado OPEN em ms (padrão: 30000ms)
  maxTimeoutMs?: number; // Timeout estrito por requisição leaf (padrão: 8000ms)
}

export interface DomainCircuitStatus {
  state: CircuitBreakerState;
  consecutiveFailures: number;
  lastFailureAt: number | null;
  nextAttemptAllowedAt: number | null;
  totalCalls: number;
  totalSuccesses: number;
  totalFailures: number;
}

export class CrawlerCircuitBreaker {
  private readonly failureThreshold: number;
  private readonly cooldownPeriodMs: number;
  private readonly maxTimeoutMs: number;
  private readonly domains: Map<string, DomainCircuitStatus> = new Map();

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.cooldownPeriodMs = options.cooldownPeriodMs ?? 30000;
    this.maxTimeoutMs = options.maxTimeoutMs ?? 8000;
  }

  private getDomainStatus(domainKey: string): DomainCircuitStatus {
    const existing = this.domains.get(domainKey);
    if (existing !== undefined) {
      return existing;
    }

    const initial: DomainCircuitStatus = {
      state: "CLOSED",
      consecutiveFailures: 0,
      lastFailureAt: null,
      nextAttemptAllowedAt: null,
      totalCalls: 0,
      totalSuccesses: 0,
      totalFailures: 0,
    };
    this.domains.set(domainKey, initial);
    return initial;
  }

  public getStatus(domainKey: string = "default"): DomainCircuitStatus {
    const status = this.getDomainStatus(domainKey);
    const now = Date.now();

    // Se estiver OPEN e o tempo de cooldown passou, transiciona para HALF_OPEN
    if (status.state === "OPEN" && status.nextAttemptAllowedAt !== null && now >= status.nextAttemptAllowedAt) {
      status.state = "HALF_OPEN";
    }

    return { ...status };
  }

  public isAvailable(domainKey: string = "default"): boolean {
    const status = this.getStatus(domainKey);
    return status.state === "CLOSED" || status.state === "HALF_OPEN";
  }

  public async execute<T>(fn: () => Promise<T>, domainKey: string = "default"): Promise<T> {
    const status = this.getDomainStatus(domainKey);
    const now = Date.now();

    // Se estiver OPEN e o cooldown já expirou, permite tentativa em HALF_OPEN
    if (status.state === "OPEN") {
      if (status.nextAttemptAllowedAt !== null && now >= status.nextAttemptAllowedAt) {
        status.state = "HALF_OPEN";
      } else {
        const remainingSeconds = status.nextAttemptAllowedAt
          ? Math.ceil((status.nextAttemptAllowedAt - now) / 1000)
          : 30;
        throw new Error(
          `[CircuitBreaker] Circuito ABERTO para '${domainKey}'. Bloqueio ativo por mais ${remainingSeconds}s para proteção do servidor.`
        );
      }
    }

    status.totalCalls += 1;

    let timer: any = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new Error(`[CircuitBreaker] Timeout de ${this.maxTimeoutMs}ms excedido na requisição para '${domainKey}'.`)
        );
      }, this.maxTimeoutMs);
    });

    try {
      const result = await Promise.race([fn(), timeoutPromise]);
      if (timer !== null) {
        clearTimeout(timer);
      }

      // Sucesso: fecha o circuito e zera falhas consecutivas
      status.state = "CLOSED";
      status.consecutiveFailures = 0;
      status.nextAttemptAllowedAt = null;
      status.totalSuccesses += 1;

      return result;
    } catch (error) {
      if (timer !== null) {
        clearTimeout(timer);
      }
      status.consecutiveFailures += 1;
      status.totalFailures += 1;
      status.lastFailureAt = Date.now();

      if (status.state === "HALF_OPEN" || status.consecutiveFailures >= this.failureThreshold) {
        status.state = "OPEN";
        status.nextAttemptAllowedAt = Date.now() + this.cooldownPeriodMs;
      }

      throw error;
    }
  }

  public reset(domainKey?: string): void {
    if (domainKey !== undefined) {
      this.domains.delete(domainKey);
    } else {
      this.domains.clear();
    }
  }
}

// Instância singleton canônica do ecossistema Waesy
export const globalCrawlerCircuitBreaker = new CrawlerCircuitBreaker({
  failureThreshold: 3,
  cooldownPeriodMs: 30000,
  maxTimeoutMs: 8000,
});
