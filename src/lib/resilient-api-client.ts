/**
 * resilient-api-client.ts — Resilient HTTP Client with Exponential Backoff & Full Jitter
 *
 * Implements Enterprise-grade rate limit resilience (HTTP 429 Too Many Requests)
 * and transient server failure recovery (HTTP 500, 502, 503, 504) for all
 * external Marketplace and ERP integrations (Mercado Livre, iFood, Bling, Meta/WhatsApp).
 */

export interface ResilientRequestConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOnStatuses?: number[];
  timeoutMs?: number;
  onRetry?: (attempt: number, delayMs: number, reason: string) => void;
}

export interface ResilientResponse<T = any> {
  ok: boolean;
  status: number;
  statusText: string;
  data: T;
  retriesAttempted: number;
  headers: Record<string, string>;
}

const DEFAULT_CONFIG: Required<Omit<ResilientRequestConfig, "onRetry">> = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 8000,
  retryOnStatuses: [429, 500, 502, 503, 504],
  timeoutMs: 12000,
};

/**
 * Calculates exponential delay with Full Jitter to prevent thundering herd problem.
 * Formula: delay = Math.random() * Math.min(maxDelay, baseDelay * 2^attempt)
 */
export function calculateJitteredBackoff(
  attempt: number,
  baseDelayMs: number = DEFAULT_CONFIG.baseDelayMs,
  maxDelayMs: number = DEFAULT_CONFIG.maxDelayMs,
  retryAfterSeconds?: number
): number {
  if (retryAfterSeconds && retryAfterSeconds > 0) {
    // When external API explicitly specifies Retry-After header
    const explicitMs = retryAfterSeconds * 1000;
    // Add small random jitter (0-200ms)
    return Math.min(maxDelayMs * 2, explicitMs + Math.random() * 200);
  }

  const exponential = baseDelayMs * Math.pow(2, attempt);
  const capped = Math.min(maxDelayMs, exponential);
  // Full Jitter
  return Math.floor(Math.random() * capped);
}

/**
 * Executes an HTTP fetch with automatic exponential backoff, jitter, and timeout handling.
 */
export async function fetchWithExponentialBackoff<T = any>(
  url: string,
  options: RequestInit = {},
  config: ResilientRequestConfig = {}
): Promise<ResilientResponse<T>> {
  const maxRetries = config.maxRetries ?? DEFAULT_CONFIG.maxRetries;
  const baseDelayMs = config.baseDelayMs ?? DEFAULT_CONFIG.baseDelayMs;
  const maxDelayMs = config.maxDelayMs ?? DEFAULT_CONFIG.maxDelayMs;
  const retryOnStatuses = config.retryOnStatuses ?? DEFAULT_CONFIG.retryOnStatuses;
  const timeoutMs = config.timeoutMs ?? DEFAULT_CONFIG.timeoutMs;

  let attempt = 0;

  while (true) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const mergedSignal = options.signal
        ? anySignal([options.signal, controller.signal])
        : controller.signal;

      const res = await fetch(url, {
        ...options,
        signal: mergedSignal,
      });

      clearTimeout(timeoutHandle);

      // Check if we hit a retryable status code
      if (retryOnStatuses.includes(res.status) && attempt < maxRetries) {
        attempt++;

        // Parse optional Retry-After header
        const retryAfterHeader = res.headers.get("Retry-After");
        let retryAfterSeconds: number | undefined;
        if (retryAfterHeader) {
          const parsed = parseInt(retryAfterHeader, 10);
          if (!isNaN(parsed) && parsed > 0) {
            retryAfterSeconds = parsed;
          }
        }

        const delay = calculateJitteredBackoff(attempt, baseDelayMs, maxDelayMs, retryAfterSeconds);
        config.onRetry?.(attempt, delay, `HTTP ${res.status} ${res.statusText}`);

        await sleep(delay);
        continue;
      }

      // Parse headers
      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value;
      });

      // Parse body safely
      let data: any = null;
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        data = await res.json().catch(() => null);
      } else {
        const text = await res.text().catch(() => "");
        try {
          data = JSON.parse(text);
        } catch {
          data = text;
        }
      }

      return {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        data,
        retriesAttempted: attempt,
        headers: responseHeaders,
      };
    } catch (err: any) {
      clearTimeout(timeoutHandle);

      const isTimeout = err?.name === "AbortError" || err?.message?.includes("aborted");
      const isNetworkError = !isTimeout;

      if (attempt < maxRetries) {
        attempt++;
        const delay = calculateJitteredBackoff(attempt, baseDelayMs, maxDelayMs);
        const reason = isTimeout ? `Timeout (${timeoutMs}ms)` : `Network Error (${err?.message || "unknown"})`;
        config.onRetry?.(attempt, delay, reason);

        await sleep(delay);
        continue;
      }

      return {
        ok: false,
        status: isTimeout ? 408 : 0,
        statusText: isTimeout ? "Request Timeout" : "Network Error",
        data: { error: err?.message || "Failed request" } as any,
        retriesAttempted: attempt,
        headers: {},
      };
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function anySignal(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort();
      return signal;
    }
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}
