import { sanitizeSensitiveText } from "./error-correlator";

export type OperationalLevel = "info" | "warn" | "error";

export interface OperationalContext {
  requestId?: string;
  traceId?: string;
  jobId?: string;
  conversationId?: string;
  tenantId?: string;
  actorId?: string;
  provider?: string;
  routeId?: string;
  [key: string]: unknown;
}

const SECRET_KEY = /(?:password|passwd|secret|token|api[_-]?key|authorization|cookie|encrypted|private[_-]?key|client[_-]?secret)/i;
const CONTENT_KEY = /(?:prompt|message|content|body|payload|raw|base64|text)/i;

export function redactOperationalValue(value: unknown, key = ""): unknown {
  if (SECRET_KEY.test(key)) return "[REDACTED]";
  if (CONTENT_KEY.test(key)) return "[REDACTED_CONTENT]";
  if (typeof value === "string") return sanitizeSensitiveText(value).slice(0, 500);
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redactOperationalValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).slice(0, 50).map(([childKey, childValue]) => [childKey, redactOperationalValue(childValue, childKey)]));
  }
  return value;
}

export function createCorrelationContext(input: Partial<OperationalContext> = {}): OperationalContext {
  const requestId = input.requestId || input.traceId || `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return { ...input, requestId, traceId: input.traceId || requestId };
}

export function logOperationalEvent(level: OperationalLevel, event: string, context: OperationalContext = {}, details: Record<string, unknown> = {}): void {
  const envelope = redactOperationalValue({ event, timestamp: new Date().toISOString(), ...createCorrelationContext(context), details }) as Record<string, unknown>;
  const line = `[waesy:${level}] ${JSON.stringify(envelope)}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}
