import { getRequest } from "@tanstack/start-server-core";

const REQUEST_INFLIGHT_REGISTRY = new WeakMap<
  object,
  Map<string, Map<string, Promise<unknown>>>
>();
const NODE_FALLBACK_INFLIGHT_REGISTRY = new Map<string, Map<string, Promise<unknown>>>();

function isCloudflareWorkersRuntime(): boolean {
  if (typeof globalThis !== "undefined" && (globalThis as any).__env__) {
    return true;
  }
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.userAgent === "string" &&
    navigator.userAgent.includes("Cloudflare-Workers")
  ) {
    return true;
  }
  return false;
}

/**
 * Returns an in-flight Promise deduplication map scoped strictly to the active HTTP request.
 *
 * Inside Cloudflare Workers (`handle_cross_request_promise_resolution`), sharing a pending I/O
 * Promise across distinct HTTP requests causes the runtime to drop settlement once the creator
 * request ends. Keying by the active request/event object isolates concurrency within the same
 * request lifecycle while preventing cross-request contamination.
 */
export function getRequestScopedInflightMap<T>(
  namespace: string,
  explicitContext?: object | null,
): Map<string, Promise<T>> | null {
  if (typeof window !== "undefined") {
    return null;
  }

  let scopeKey: object | null = explicitContext && typeof explicitContext === "object" ? explicitContext : null;
  if (!scopeKey) {
    try {
      const req = getRequest();
      if (req && typeof req === "object") {
        scopeKey = req;
      }
    } catch {
      scopeKey = null;
    }
  }

  if (scopeKey) {
    let byNamespace = REQUEST_INFLIGHT_REGISTRY.get(scopeKey);
    if (!byNamespace) {
      byNamespace = new Map();
      REQUEST_INFLIGHT_REGISTRY.set(scopeKey, byNamespace);
    }
    let map = byNamespace.get(namespace);
    if (!map) {
      map = new Map();
      byNamespace.set(namespace, map);
    }
    return map as Map<string, Promise<T>>;
  }

  // Outside HTTP request context: never share Promises globally in Cloudflare Workers.
  if (isCloudflareWorkersRuntime()) {
    return null;
  }

  let fallbackMap = NODE_FALLBACK_INFLIGHT_REGISTRY.get(namespace);
  if (!fallbackMap) {
    fallbackMap = new Map();
    NODE_FALLBACK_INFLIGHT_REGISTRY.set(namespace, fallbackMap);
  }
  return fallbackMap as Map<string, Promise<T>>;
}

export function clearNodeFallbackInflightMap(namespace?: string): void {
  if (namespace) {
    NODE_FALLBACK_INFLIGHT_REGISTRY.get(namespace)?.clear();
    return;
  }
  for (const map of NODE_FALLBACK_INFLIGHT_REGISTRY.values()) {
    map.clear();
  }
}
