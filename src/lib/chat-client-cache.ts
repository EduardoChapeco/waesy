/**
 * chat-client-cache.ts — Cache incremental e persistência de sessão do Atendimento Ao Vivo.
 *
 * Evita que trocas de conversa, revalidações ou reconexões Realtime zerem o histórico
 * exibido e refaçam carregamentos bloqueantes do zero.
 */

const STORAGE_PREFIX = "waesy:chat:v1:";
const MAX_CACHED_THREADS = 30;
const MAX_PERSISTED_MESSAGES_PER_THREAD = 150;
const MAX_INLINE_ATTACHMENT_STORAGE_CHARS = 48_000;

export type CachedChatMessage = Record<string, any> & {
  id?: string;
  external_message_id?: string | null;
  created_at?: string | null;
};

const messagesMemoryCache = new Map<string, CachedChatMessage[]>();
const threadListMemoryCache = new Map<string, any[]>();
const customer360MemoryCache = new Map<string, any>();

function buildThreadKey(storeId: string | undefined | null, threadId: string): string {
  return `${storeId || "default"}:${threadId}`;
}

function touchLru<K, V>(map: Map<K, V>, key: K, value: V, limit: number): void {
  if (map.has(key)) {
    map.delete(key);
  }
  map.set(key, value);
  while (map.size > limit) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
}

function sanitizeMessagesForStorage(messages: CachedChatMessage[]): CachedChatMessage[] {
  return messages.slice(-MAX_PERSISTED_MESSAGES_PER_THREAD).map((m) => {
    const atts = Array.isArray(m.attachments)
      ? m.attachments.map((att: unknown) =>
          typeof att === "string" && att.length > MAX_INLINE_ATTACHMENT_STORAGE_CHARS ? "" : att,
        ).filter(Boolean)
      : m.attachments;

    let nextPayload = m.payload;
    if (nextPayload?.media?.url && typeof nextPayload.media.url === "string" && nextPayload.media.url.length > MAX_INLINE_ATTACHMENT_STORAGE_CHARS) {
      nextPayload = {
        ...nextPayload,
        media: {
          ...nextPayload.media,
          url: undefined,
        },
      };
    }

    return {
      ...m,
      attachments: atts,
      payload: nextPayload,
    };
  });
}

function parseMsgTimeMs(msg: CachedChatMessage): number {
  if (!msg?.created_at) return 0;
  const ms = Date.parse(String(msg.created_at));
  return Number.isNaN(ms) ? 0 : ms;
}

/**
 * Mescla mensagens novas/atualizadas sobre a lista já em cache preservando ordem cronológica,
 * dedup por `id` ou `external_message_id`, e sem descartar mensagens já enviadas/sincronizadas.
 */
export function mergeMessagesIncremental<T extends CachedChatMessage>(
  existing: T[],
  incoming: T[],
): T[] {
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return existing;
  }
  if (!Array.isArray(existing) || existing.length === 0) {
    return [...incoming].sort((a, b) => parseMsgTimeMs(a) - parseMsgTimeMs(b));
  }

  const next = [...existing];
  const indexById = new Map<string, number>();
  const indexByExtId = new Map<string, number>();

  next.forEach((item, idx) => {
    if (item?.id) indexById.set(String(item.id), idx);
    if (item?.external_message_id) indexByExtId.set(String(item.external_message_id), idx);
  });

  let changed = false;
  for (const msg of incoming) {
    if (!msg) continue;
    const idKey = msg.id ? String(msg.id) : "";
    const extKey = msg.external_message_id ? String(msg.external_message_id) : "";

    const existingIdx =
      (idKey ? indexById.get(idKey) : undefined) ??
      (extKey ? indexByExtId.get(extKey) : undefined);

    if (existingIdx !== undefined) {
      const prevMsg = next[existingIdx];
      const prevMedia = prevMsg?.payload?.media;
      const nextMedia = msg?.payload?.media;
      const mergedMedia =
        prevMedia || nextMedia
          ? {
              ...(prevMedia || {}),
              ...(nextMedia || {}),
              ...(prevMedia?.url && !nextMedia?.url ? { url: prevMedia.url } : {}),
            }
          : undefined;
      const merged = {
        ...prevMsg,
        ...msg,
        payload: {
          ...(prevMsg?.payload || {}),
          ...(msg?.payload || {}),
          ...(mergedMedia ? { media: mergedMedia } : {}),
        },
        attachments:
          Array.isArray(msg.attachments) && msg.attachments.length > 0
            ? msg.attachments
            : prevMsg.attachments,
      } as T;
      next[existingIdx] = merged;
      if (merged.id) indexById.set(String(merged.id), existingIdx);
      if (merged.external_message_id) indexByExtId.set(String(merged.external_message_id), existingIdx);
      changed = true;
    } else {
      const insertIdx = next.length;
      next.push(msg);
      if (idKey) indexById.set(idKey, insertIdx);
      if (extKey) indexByExtId.set(extKey, insertIdx);
      changed = true;
    }
  }

  if (!changed) return existing;
  next.sort((a, b) => parseMsgTimeMs(a) - parseMsgTimeMs(b));
  return next;
}

/**
 * Retorna o timestamp ISO da mensagem mais recente já em cache para consulta incremental `afterCreatedAt`.
 */
export function getLatestMessageCursor(messages: CachedChatMessage[]): string | undefined {
  if (!Array.isArray(messages) || messages.length === 0) return undefined;
  let maxMs = 0;
  let maxIso: string | undefined;
  for (const msg of messages) {
    const ms = parseMsgTimeMs(msg);
    if (ms > maxMs && typeof msg.created_at === "string") {
      maxMs = ms;
      maxIso = msg.created_at;
    }
  }
  return maxIso;
}

export function getCachedThreadMessages(
  storeId: string | undefined | null,
  threadId: string | undefined | null,
): CachedChatMessage[] | null {
  if (!threadId) return null;
  const key = buildThreadKey(storeId, threadId);
  const inMem = messagesMemoryCache.get(key);
  if (inMem && inMem.length > 0) {
    return inMem;
  }

  if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}msgs:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    touchLru(messagesMemoryCache, key, parsed, MAX_CACHED_THREADS);
    return parsed;
  } catch {
    return null;
  }
}

export function setCachedThreadMessages(
  storeId: string | undefined | null,
  threadId: string | undefined | null,
  messages: CachedChatMessage[],
): void {
  if (!threadId) return;
  const key = buildThreadKey(storeId, threadId);
  touchLru(messagesMemoryCache, key, messages, MAX_CACHED_THREADS);

  if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") {
    return;
  }

  try {
    const compact = sanitizeMessagesForStorage(messages);
    window.sessionStorage.setItem(`${STORAGE_PREFIX}msgs:${key}`, JSON.stringify(compact));
  } catch {
    // Ignora caso sessionStorage esteja sem cota ou bloqueado
  }
}

export function clearCachedThreadMessages(
  storeId: string | undefined | null,
  threadId: string | undefined | null,
): void {
  if (!threadId) return;
  const key = buildThreadKey(storeId, threadId);
  messagesMemoryCache.delete(key);
  if (typeof window !== "undefined" && typeof window.sessionStorage !== "undefined") {
    try {
      window.sessionStorage.removeItem(`${STORAGE_PREFIX}msgs:${key}`);
    } catch {
      // noop
    }
  }
}

export function getCachedCustomer360(
  storeId: string | undefined | null,
  threadId: string | undefined | null,
): any | null {
  if (!storeId || !threadId) return null;
  return customer360MemoryCache.get(buildThreadKey(storeId, threadId)) ?? null;
}

export function setCachedCustomer360(
  storeId: string | undefined | null,
  threadId: string | undefined | null,
  data: any,
): void {
  if (!storeId || !threadId || !data) return;
  touchLru(customer360MemoryCache, buildThreadKey(storeId, threadId), data, MAX_CACHED_THREADS);
}

export function getCachedThreadList(storeId: string | undefined | null): any[] | null {
  if (!storeId) return null;
  const inMem = threadListMemoryCache.get(storeId);
  if (inMem && inMem.length > 0) return inMem;

  if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}threads:${storeId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    threadListMemoryCache.set(storeId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

export function setCachedThreadList(
  storeId: string | undefined | null,
  threads: any[],
): void {
  if (!storeId || !Array.isArray(threads) || threads.length === 0) return;
  const compact = threads.slice(0, 120);
  threadListMemoryCache.set(storeId, compact);
  if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}threads:${storeId}`, JSON.stringify(compact));
  } catch {
    // noop
  }
}

export function clearAllChatClientCache(): void {
  messagesMemoryCache.clear();
  threadListMemoryCache.clear();
  customer360MemoryCache.clear();
}
