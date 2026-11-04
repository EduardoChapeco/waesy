/**
 * micro-cache.ts — Cache em memória com TTL e proteção contra Stampede (Single-Flight).
 *
 * Utilizado em Server Functions e rotas SSR no Cloudflare Worker / Node.js
 * para evitar que múltiplas requisições paralelas atinjam o Supabase REST repetidamente.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const memoryStore = new Map<string, CacheEntry<unknown>>();
const pendingPromises = new Map<string, Promise<unknown>>();

/**
 * Retorna o valor em cache se ainda for válido.
 */
export function getMicroCache<T>(key: string): T | undefined {
  const entry = memoryStore.get(key);
  if (!entry) return undefined;

  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return undefined;
  }

  return entry.value as T;
}

/**
 * Grava um valor no cache com TTL especificado em milissegundos.
 */
export function setMicroCache<T>(key: string, value: T, ttlMs = 60_000): void {
  // Não cachear undefined ou null se for desejado re-tentativa imediata,
  // mas aqui permitimos null para indicar 'não encontrado' temporariamente (anti-DDoS).
  const validTtl = ttlMs > 0 ? ttlMs : 60_000;
  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + validTtl,
  });
}

/**
 * Remove uma chave do cache.
 */
export function invalidateMicroCache(key: string): void {
  memoryStore.delete(key);
}

/**
 * Remove todas as chaves que começam com o prefixo.
 */
export function invalidateMicroCachePrefix(prefix: string): void {
  for (const key of memoryStore.keys()) {
    if (key.startsWith(prefix)) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Executa fetcher apenas se a chave não estiver no cache.
 * Possui Single-Flight: se N requisições simultâneas pedirem a mesma chave,
 * o fetcher é invocado apenas 1 vez, e todas compartilham a mesma Promise.
 */
export async function getOrSetMicroCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 60_000
): Promise<T> {
  // 1. Verifica cache existente
  const cached = getMicroCache<T>(key);
  if (cached !== undefined) {
    return cached;
  }

  // 2. Proteção contra Stampede (Single-Flight)
  let pending = pendingPromises.get(key) as Promise<T> | undefined;
  if (!pending) {
    pending = (async () => {
      try {
        const result = await fetcher();
        setMicroCache(key, result, ttlMs);
        return result;
      } finally {
        pendingPromises.delete(key);
      }
    })();
    pendingPromises.set(key, pending);
  }

  return pending;
}

/**
 * Limpa todo o cache (útil para testes).
 */
export function clearAllMicroCache(): void {
  memoryStore.clear();
  pendingPromises.clear();
}
