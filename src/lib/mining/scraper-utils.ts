/**
 * Waesy Shared Scraper Utilities
 * Ported with 100% fidelity from proprietary scraping infrastructure
 */

import { validateCnpjMod11, validateCpfMod11 } from '@/lib/document-validator';

export interface ScraperConfig {
  name: string;
  maxRetries?: number;
  retryDelayMs?: number;
  timeoutMs?: number;
  rateLimit?: {
    requestsPerMinute: number;
  };
}

export interface ScrapingResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  itemsProcessed?: number;
  itemsInserted?: number;
  durationMs?: number;
  httpStatus?: number;
  isBlocked?: boolean;
  rateLimited?: boolean;
  retryAfterSeconds?: number;
  errorType?: 'rate_limit_429' | 'cloudflare_403' | 'network_error' | 'timeout' | 'empty_body' | 'unknown';
}

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableStatuses?: number[];
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  onRetry: () => {},
};

// =============================================================================
// USER AGENTS ROTATIVOS
// =============================================================================

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1",
  "Mozilla/5.0 (compatible; WaesyBot/2.0; +https://waesy.com.br/bot)",
];

let userAgentIndex = 0;

export function getRandomUserAgent(): string {
  userAgentIndex = (userAgentIndex + 1) % USER_AGENTS.length;
  return USER_AGENTS[userAgentIndex];
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// =============================================================================
// COOLDOWNS DE DOMÍNIO & RATE LIMITING RESILIENTE
// =============================================================================

const rateLimitState = new Map<string, { count: number; resetAt: number }>();
const domainCooldowns = new Map<
  string,
  { until: number; reason: string; httpStatus?: number; consecutiveErrors: number }
>();

export function isDomainInCooldown(domain: string): {
  inCooldown: boolean;
  remainingSeconds: number;
  reason?: string;
  httpStatus?: number;
} {
  const cleanDomain = domain.toLowerCase().trim();
  const entry = domainCooldowns.get(cleanDomain);
  if (!entry) return { inCooldown: false, remainingSeconds: 0 };

  const now = Date.now();
  if (now >= entry.until) {
    domainCooldowns.delete(cleanDomain);
    return { inCooldown: false, remainingSeconds: 0 };
  }

  return {
    inCooldown: true,
    remainingSeconds: Math.ceil((entry.until - now) / 1000),
    reason: entry.reason,
    httpStatus: entry.httpStatus,
  };
}

export function setDomainCooldown(
  domain: string,
  durationMs: number,
  reason: string,
  httpStatus?: number
): void {
  const cleanDomain = domain.toLowerCase().trim();
  const existing = domainCooldowns.get(cleanDomain);
  const consecutiveErrors = (existing?.consecutiveErrors || 0) + 1;
  // Multiplicador progressivo se o domínio continuar falhando
  const multiplier = Math.min(consecutiveErrors, 4);
  const finalDuration = durationMs * multiplier;
  const until = Date.now() + finalDuration;

  domainCooldowns.set(cleanDomain, {
    until,
    reason,
    httpStatus,
    consecutiveErrors,
  });

  // Persistência em background no Postgres (domain_cooldowns)
  if (typeof window === "undefined") {
    import("@/lib/supabase").then(({ getServerClient }) => {
      try {
        const supabase = getServerClient();
        supabase.from("domain_cooldowns").upsert({
          domain: cleanDomain,
          reason,
          http_status: httpStatus || null,
          cooldown_until: new Date(until).toISOString(),
          consecutive_errors: consecutiveErrors,
          last_error: reason,
          updated_at: new Date().toISOString(),
        }).then(({ error }) => {
          if (error) console.warn("[scraper-utils] Erro ao persistir domain_cooldowns:", error.message);
        });
      } catch {
        // Fallback defensivo silencioso
      }
    }).catch(() => {});
  }
}

export function clearDomainCooldown(domain: string): void {
  const clean = domain.toLowerCase().trim();
  domainCooldowns.delete(clean);
  if (typeof window === "undefined") {
    import("@/lib/supabase").then(({ getServerClient }) => {
      try {
        const supabase = getServerClient();
        supabase.from("domain_cooldowns").delete().eq("domain", clean).then(() => {});
      } catch {
        // Fallback defensivo silencioso
      }
    }).catch(() => {});
  }
}

export function parseRetryAfterHeader(headers: Headers): number | null {
  const retryHeader = headers.get('retry-after');
  if (!retryHeader) return null;

  // Se for inteiro (segundos)
  const seconds = parseInt(retryHeader, 10);
  if (!isNaN(seconds) && seconds > 0) {
    return seconds;
  }

  // Se for timestamp HTTP-Date
  const parsedDate = Date.parse(retryHeader);
  if (!isNaN(parsedDate)) {
    const diffSeconds = Math.ceil((parsedDate - Date.now()) / 1000);
    return diffSeconds > 0 ? diffSeconds : null;
  }

  return null;
}

export function isCloudflareOrBotChallenge(
  status: number,
  headers?: Headers,
  bodySnippet?: string
): boolean {
  if (status === 403 || status === 503) {
    if (headers) {
      if (headers.has('cf-ray') || headers.get('server')?.toLowerCase().includes('cloudflare')) {
        return true;
      }
      if (headers.has('cf-mitigated')) {
        return true;
      }
    }
  }

  if (bodySnippet) {
    const lower = bodySnippet.toLowerCase();
    if (
      lower.includes('cloudflare') &&
      (lower.includes('turnstile') ||
        lower.includes('attention required') ||
        lower.includes('just a moment...') ||
        lower.includes('verify you are human') ||
        lower.includes('cf-browser-verification'))
    ) {
      return true;
    }
    if (lower.includes('ddos-guard') || lower.includes('perimeterx') || lower.includes('access denied')) {
      return true;
    }
  }

  return false;
}

export function checkRateLimit(key: string, maxRequests: number, windowMs = 60000): boolean {
  const now = Date.now();
  const state = rateLimitState.get(key);

  if (!state || now > state.resetAt) {
    rateLimitState.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (state.count >= maxRequests) {
    return false;
  }

  state.count++;
  return true;
}

export async function waitForRateLimit(key: string, maxRequests: number, windowMs = 60000): Promise<void> {
  while (!checkRateLimit(key, maxRequests, windowMs)) {
    const state = rateLimitState.get(key);
    const waitTime = state ? state.resetAt - Date.now() + 100 : 1000;
    await sleep(Math.max(waitTime, 100));
  }
}

// =============================================================================
// FETCH COM RETRY, PARSE DE RETRY-AFTER E PROTEÇÃO ANTI-BAN
// =============================================================================

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...retryOptions };
  const domain = extractDomain(url);

  // Verificação de cooldown antes da chamada
  if (domain) {
    const cooldown = isDomainInCooldown(domain);
    if (cooldown.inCooldown) {
      throw new Error(
        `DOMAIN_COOLDOWN: Domínio "${domain}" em pausa por mais ${cooldown.remainingSeconds}s devido a ${cooldown.reason}`
      );
    }
  }

  let lastError: Error | null = null;
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Tratamento especial para HTTP 429 (Too Many Requests)
      if (response.status === 429) {
        const retryAfterSeconds = parseRetryAfterHeader(response.headers) || 60;
        if (domain) {
          // Cooldown de segurança no domínio (mínimo 60s, máximo 30min)
          const cooldownMs = Math.min(Math.max(retryAfterSeconds, 60) * 1000, 1800000);
          setDomainCooldown(domain, cooldownMs, 'rate_limit_429', 429);
        }
        if (attempt <= opts.maxRetries) {
          opts.onRetry(attempt, new Error(`HTTP 429: Rate limited. Retry-After: ${retryAfterSeconds}s`));
          // Se o retry after for curto (< 5s), espera; senão encerra tentativas para economizar recursos
          if (retryAfterSeconds <= 5) {
            await sleep(retryAfterSeconds * 1000);
            continue;
          }
        }
        return response;
      }

      // Tratamento de HTTP 403 (Possível Cloudflare / Anti-Bot)
      if (response.status === 403) {
        if (isCloudflareOrBotChallenge(403, response.headers)) {
          if (domain) {
            // Pausa de 30 minutos no domínio para evitar queima de IP
            setDomainCooldown(domain, 30 * 60 * 1000, 'cloudflare_403', 403);
          }
        }
        return response;
      }

      // Status ok ou não passível de retry
      if (!opts.retryableStatuses.includes(response.status)) {
        return response;
      }

      if (attempt <= opts.maxRetries) {
        opts.onRetry(attempt, new Error(`HTTP ${response.status}`));
        await sleep(delay);
        delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt <= opts.maxRetries) {
        opts.onRetry(attempt, lastError);
        await sleep(delay);
        delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

// =============================================================================
// VALIDADORES E SANITIZAÇÃO
// =============================================================================

export const validators = {
  isUrl: (value: unknown): boolean => {
    if (typeof value !== 'string') return false;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  isEmail: (value: unknown): boolean => {
    if (typeof value !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  },

  isPhone: (value: unknown): boolean => {
    if (typeof value !== 'string') return false;
    const cleaned = value.replace(/\D/g, '');
    return cleaned.length >= 10 && cleaned.length <= 13;
  },

  isCNPJ: (value: unknown): boolean => {
    if (typeof value !== 'string') return false;
    return validateCnpjMod11(value);
  },

  isCPF: (value: unknown): boolean => {
    if (typeof value !== 'string') return false;
    return validateCpfMod11(value);
  },
};

export function normalizeUrl(url: string): string {
  let formatted = url.trim();
  if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
    formatted = `https://${formatted}`;
  }
  return formatted;
}

export function extractDomain(url: string): string {
  try {
    const parsed = new URL(normalizeUrl(url));
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function cleanHtmlText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// =============================================================================
// CÁLCULO DE SCORE DE QUALIDADE (0 - 100%)
// =============================================================================

export interface QualityField {
  name: string;
  weight: number;
  validator?: (value: unknown) => boolean;
}

export function calculateDataQualityScore(
  data: Record<string, unknown>,
  fields: QualityField[]
): number {
  let totalWeight = 0;
  let earnedWeight = 0;

  for (const field of fields) {
    totalWeight += field.weight;
    const value = data[field.name];

    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (field.validator && !field.validator(value)) {
      continue;
    }

    earnedWeight += field.weight;
  }

  return totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;
}
