import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getMicroCache,
  setMicroCache,
  invalidateMicroCache,
  invalidateMicroCachePrefix,
  getOrSetMicroCache,
  clearAllMicroCache,
} from "./micro-cache";

describe("micro-cache", () => {
  beforeEach(() => {
    clearAllMicroCache();
  });

  it("armazena e recupera valores dentro do TTL", () => {
    setMicroCache("test-key", { foo: "bar" }, 5000);
    const result = getMicroCache<{ foo: string }>("test-key");
    expect(result).toEqual({ foo: "bar" });
  });

  it("expira valores após o TTL", async () => {
    setMicroCache("quick-expire", "expired", 10);
    await new Promise((r) => setTimeout(r, 25));
    const result = getMicroCache<string>("quick-expire");
    expect(result).toBeUndefined();
  });

  it("executa o fetcher apenas uma vez em chamadas simultâneas (Single-Flight)", async () => {
    const fetcher = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return { loaded: true };
    });

    const [res1, res2, res3] = await Promise.all([
      getOrSetMicroCache("shared-key", fetcher, 5000),
      getOrSetMicroCache("shared-key", fetcher, 5000),
      getOrSetMicroCache("shared-key", fetcher, 5000),
    ]);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(res1).toEqual({ loaded: true });
    expect(res2).toEqual({ loaded: true });
    expect(res3).toEqual({ loaded: true });
  });

  it("invalida chave específica e por prefixo", () => {
    setMicroCache("store:1", "data1", 5000);
    setMicroCache("store:2", "data2", 5000);
    setMicroCache("other:3", "data3", 5000);

    invalidateMicroCache("store:1");
    expect(getMicroCache("store:1")).toBeUndefined();
    expect(getMicroCache("store:2")).toBe("data2");

    invalidateMicroCachePrefix("store:");
    expect(getMicroCache("store:2")).toBeUndefined();
    expect(getMicroCache("other:3")).toBe("data3");
  });
});
