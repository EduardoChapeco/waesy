import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearNodeFallbackInflightMap,
  getRequestScopedInflightMap,
} from "@/lib/request-inflight";
import {
  clearAllMicroCache,
  getOrSetMicroCache,
} from "@/lib/cache/micro-cache";

describe("Worker Request-Scoped In-Flight Isolation (handle_cross_request_promise_resolution)", () => {
  afterEach(() => {
    delete (globalThis as any).__env__;
    clearNodeFallbackInflightMap();
    clearAllMicroCache();
    vi.restoreAllMocks();
  });

  it("isola mapas de Promises em voo por objeto de requisicao distinto", async () => {
    const reqA = { url: "https://waesy.com.br/workspace/atendimento/chat", id: "req-a" };
    const reqB = { url: "https://waesy.com.br/workspace/atendimento/chat", id: "req-b" };

    const mapA1 = getRequestScopedInflightMap<string>("identity", reqA);
    const mapA2 = getRequestScopedInflightMap<string>("identity", reqA);
    const mapB = getRequestScopedInflightMap<string>("identity", reqB);

    expect(mapA1).not.toBeNull();
    expect(mapA1).toBe(mapA2);
    expect(mapB).not.toBeNull();
    expect(mapB).not.toBe(mapA1);

    // Simula requisicao A deixando uma Promise pendente que nunca e compartilhada com B
    const neverSettledFromA = new Promise<string>(() => {});
    mapA1!.set("user-1", neverSettledFromA);

    expect(mapB!.has("user-1")).toBe(false);

    const pB = Promise.resolve("fresh-for-B");
    mapB!.set("user-1", pB);
    await expect(mapB!.get("user-1")).resolves.toBe("fresh-for-B");
  });

  it("separa namespaces diferentes dentro da mesma requisicao", () => {
    const req = { id: "req-same" };
    const identityMap = getRequestScopedInflightMap("identity", req);
    const microCacheMap = getRequestScopedInflightMap("micro-cache", req);

    expect(identityMap).not.toBeNull();
    expect(microCacheMap).not.toBeNull();
    expect(identityMap).not.toBe(microCacheMap);
  });

  it("retorna null no runtime Cloudflare Workers (__env__) quando nao ha contexto de requisicao ativo", () => {
    (globalThis as any).__env__ = { VITE_SITE_URL: "https://waesy.com.br" };
    const map = getRequestScopedInflightMap("micro-cache");
    expect(map).toBeNull();
  });

  it("micro-cache funciona em Workers sem contexto global compartilhado e expira corretamente", async () => {
    (globalThis as any).__env__ = { VITE_SITE_URL: "https://waesy.com.br" };
    let calls = 0;

    const first = await getOrSetMicroCache(
      "test:worker:key",
      async () => {
        calls += 1;
        return `val-${calls}`;
      },
      60_000,
    );
    const second = await getOrSetMicroCache(
      "test:worker:key",
      async () => {
        calls += 1;
        return `val-${calls}`;
      },
      60_000,
    );

    expect(first).toBe("val-1");
    expect(second).toBe("val-1");
    expect(calls).toBe(1);
  });

  it("contrato estatico: nenhum modulo critico mantem Map/variavel global de Promise entre requisicoes", () => {
    const root = process.cwd();
    const checks: Array<{ path: string; forbidden: RegExp[] }> = [
      {
        path: "src/lib/identity.server.ts",
        forbidden: [/IDENTITY_INFLIGHT_MAP\s*=\s*new Map/],
      },
      {
        path: "src/lib/cache/micro-cache.ts",
        forbidden: [/pendingPromises\s*=\s*new Map/],
      },
      {
        path: "src/server.ts",
        forbidden: [/serverEntryPromise\s*:/, /let\s+serverEntryPromise/],
      },
      {
        path: "src/services/ai-core-gateway.functions.ts",
        forbidden: [/const\s+inFlightRequests\s*=\s*new Map/],
      },
      {
        path: "src/services/infotravel.ts",
        forbidden: [/const\s+inFlightRequests\s*=\s*new Map/],
      },
      {
        path: "src/services/copilot-execution-persistence.ts",
        forbidden: [/pendingExecutionWrites\s*=\s*new Map/],
      },
    ];

    for (const check of checks) {
      const source = readFileSync(resolve(root, check.path), "utf-8");
      for (const pattern of check.forbidden) {
        expect(source, `${check.path} nao pode conter ${pattern}`).not.toMatch(pattern);
      }
    }
  });
});
