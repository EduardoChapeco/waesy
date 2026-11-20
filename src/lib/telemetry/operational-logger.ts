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

export interface CanonicalStructuredErrorPayload {
  trace_id: string;
  severity: "error" | "critical";
  route: string;
  module: string;
  contract: string;
  db_schema: string;
  db_table: string;
  db_column: string | null;
  error_code: string;
  reason: string;
  user_role: string;
  timestamp: string;
}

export interface CanonicalErrorInput {
  trace_id?: string;
  severity?: "error" | "critical";
  route?: string;
  module: string;
  contract: string;
  db_schema?: string;
  db_table?: string;
  db_column?: string | null;
  error_code?: string;
  reason?: string;
  user_role?: string;
  error?: unknown;
}

export function buildCanonicalStructuredError(input: CanonicalErrorInput): CanonicalStructuredErrorPayload {
  const errObj = input.error && typeof input.error === "object" ? (input.error as Record<string, unknown>) : null;
  const rawMessage =
    input.reason ||
    (input.error instanceof Error
      ? input.error.message
      : typeof errObj?.message === "string"
        ? errObj.message
        : input.error != null
          ? String(input.error)
          : "unknown_error");

  const inferredCode =
    input.error_code ||
    (typeof errObj?.code === "string" ? errObj.code : null) ||
    (rawMessage.match(/\b(PGRST\d+|42703|42P01|23505|23503|42501|HTTP_\d{3})\b/)?.[1] ?? "RUNTIME_ERROR");

  const colMatch =
    rawMessage.match(/column\s+(?:[a-zA-Z0-9_]+\.)?"?([a-zA-Z0-9_]+)"?\s+does not exist/i) ||
    rawMessage.match(/Could not find the '([a-zA-Z0-9_]+)' column/i);
  const inferredColumn = input.db_column !== undefined ? input.db_column : (colMatch?.[1] ?? null);

  const tableMatch =
    rawMessage.match(/relation\s+"?(?:public\.)?([a-zA-Z0-9_]+)"?\s+does not exist/i) ||
    rawMessage.match(/in\s+'([a-zA-Z0-9_]+)'\s+in the schema cache/i);
  const inferredTable = input.db_table || tableMatch?.[1] || "unknown";

  const traceId =
    input.trace_id ||
    (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `tr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`);

  return {
    trace_id: traceId,
    severity: input.severity || "error",
    route: input.route || "server_fn",
    module: input.module,
    contract: input.contract,
    db_schema: input.db_schema || "public",
    db_table: inferredTable,
    db_column: inferredColumn,
    error_code: inferredCode,
    reason: sanitizeSensitiveText(rawMessage).slice(0, 500),
    user_role: input.user_role || "anonymous",
    timestamp: new Date().toISOString(),
  };
}

export function logCanonicalStructuredError(input: CanonicalErrorInput): CanonicalStructuredErrorPayload {
  const payload = buildCanonicalStructuredError(input);
  console.error(`[waesy:structured-error] ${JSON.stringify(payload)}`);
  return payload;
}
