/**
 * idempotency-guard.ts — Motor Canônico de Idempotência Transacional (Padrão Stripe / AWS)
 *
 * Garante que mutações críticas (pedidos, pagamentos, emissão de créditos, reservas)
 * sejam executadas exatamente uma vez, mesmo sob retries de rede, duplo clique ou falhas parciais.
 *
 * Invariantes: M01, M08, M09, M13 | Contrato: SPEC-S21-S22
 */

export interface IdempotencyRecord<T = unknown> {
  key: string;
  scope: string;
  status: "executing" | "completed" | "failed";
  result?: T;
  error?: string;
  createdAt: number;
  expiresAt: number;
}

export interface IdempotencyOptions<T> {
  key: string;
  scope: string;
  ttlMs?: number; // Padrão: 5 minutos
  handler: () => Promise<T>;
}

export class IdempotencyConflictError extends Error {
  public key: string;
  public scope: string;

  constructor(message: string, key: string, scope: string) {
    super(message);
    this.name = "IdempotencyConflictError";
    this.key = key;
    this.scope = scope;
  }
}

// Armazenamento em memória (LRU / Sliding Window)
const idempotencyStore = new Map<string, IdempotencyRecord>();

/**
 * Valida o formato da chave de idempotência fornecida pelo cliente ou gateway.
 * Deve possuir entre 8 e 128 caracteres alfanuméricos ou traços/sublinhados.
 */
export function validateIdempotencyKey(key?: string | null): boolean {
  if (!key || typeof key !== "string") return false;
  const trimmed = key.trim();
  if (trimmed.length < 8 || trimmed.length > 128) return false;
  return /^[a-zA-Z0-9_\-.:]+$/.test(trimmed);
}

/**
 * Deriva uma chave de idempotência determinística a partir de escopo e payload,
 * caso o cliente não tenha fornecido explicitamente.
 */
export function deriveIdempotencyKey(scope: string, payload: Record<string, unknown>): string {
  const serialized = JSON.stringify(payload, Object.keys(payload).sort());
  let hash = 0;
  for (let i = 0; i < serialized.length; i++) {
    hash = ((hash << 5) - hash + serialized.charCodeAt(i)) | 0;
  }
  const hexHash = Math.abs(hash).toString(16).padStart(8, "0");
  return `${scope}_${hexHash}`;
}

/**
 * Limpa registros expirados da memória (passivo).
 */
export function cleanupExpiredIdempotencyKeys(now = Date.now()): void {
  for (const [compositeKey, record] of idempotencyStore.entries()) {
    if (now > record.expiresAt) {
      idempotencyStore.delete(compositeKey);
    }
  }
}

/**
 * Reseta o store de idempotência (útil para testes unitários).
 */
export function resetIdempotencyStore(): void {
  idempotencyStore.clear();
}

/**
 * Executa uma operação protegida por chave de idempotência.
 * - Se a chave já foi executada com sucesso, retorna o resultado salvo sem reexecutar.
 * - Se a chave está sendo executada concorrentemente, lança `IdempotencyConflictError`.
 * - Se falhar, libera a chave para novas tentativas.
 */
export async function executeWithIdempotency<T>(options: IdempotencyOptions<T>): Promise<T> {
  const { key, scope, ttlMs = 5 * 60 * 1000, handler } = options;
  const compositeKey = `${scope}:${key}`;
  const now = Date.now();

  // Ocasionalmente limpa chaves expiradas
  if (Math.random() < 0.1) {
    cleanupExpiredIdempotencyKeys(now);
  }

  const existing = idempotencyStore.get(compositeKey);

  if (existing && now <= existing.expiresAt) {
    if (existing.status === "completed") {
      return existing.result as T;
    }

    if (existing.status === "executing") {
      throw new IdempotencyConflictError(
        `Operação com chave ${key} já está em processamento simultâneo. Aguarde a finalização.`,
        key,
        scope
      );
    }
  }

  // Registra início de execução com lock
  const record: IdempotencyRecord<T> = {
    key,
    scope,
    status: "executing",
    createdAt: now,
    expiresAt: now + ttlMs,
  };
  idempotencyStore.set(compositeKey, record as IdempotencyRecord);

  try {
    const result = await handler();

    // Sucesso: armazena resultado em cache
    record.status = "completed";
    record.result = result;
    record.expiresAt = Date.now() + ttlMs;

    return result;
  } catch (error: any) {
    // Falha: remove o lock para permitir retry seguro
    idempotencyStore.delete(compositeKey);
    throw error;
  }
}
