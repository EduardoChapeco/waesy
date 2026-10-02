import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  executeWithIdempotency,
  deriveIdempotencyKey,
  validateIdempotencyKey,
  resetIdempotencyStore,
  IdempotencyConflictError,
} from "./idempotency-guard";

describe("idempotency-guard", () => {
  beforeEach(() => {
    resetIdempotencyStore();
  });

  it("valida formato de chaves válidas e inválidas", () => {
    expect(validateIdempotencyKey("valid-key-12345")).toBe(true);
    expect(validateIdempotencyKey("checkout_cart_88319")).toBe(true);
    expect(validateIdempotencyKey("abc")).toBe(false); // Curta demais (< 8)
    expect(validateIdempotencyKey(null)).toBe(false);
    expect(validateIdempotencyKey("")).toBe(false);
    expect(validateIdempotencyKey("invalid spaces in key")).toBe(false);
  });

  it("deriva chave determinística a partir de escopo e payload", () => {
    const payloadA = { orderId: "123", amount: 5000 };
    const payloadB = { amount: 5000, orderId: "123" }; // chaves em ordem invertida
    const keyA = deriveIdempotencyKey("order_create", payloadA);
    const keyB = deriveIdempotencyKey("order_create", payloadB);

    expect(keyA).toBe(keyB);
    expect(keyA.startsWith("order_create_")).toBe(true);
  });

  it("executa handler uma única vez quando a mesma chave é chamada repetidamente", async () => {
    let callCount = 0;
    const handler = async () => {
      callCount += 1;
      return { success: true, orderId: "ord_999" };
    };

    const res1 = await executeWithIdempotency({
      key: "idemp_test_key_001",
      scope: "checkout",
      handler,
    });

    const res2 = await executeWithIdempotency({
      key: "idemp_test_key_001",
      scope: "checkout",
      handler,
    });

    expect(callCount).toBe(1);
    expect(res1).toEqual({ success: true, orderId: "ord_999" });
    expect(res2).toEqual(res1);
  });

  it("lança IdempotencyConflictError quando chamada concorrente tenta executar a mesma chave", async () => {
    let resolveFirst: (val: any) => void;
    const slowHandler = () =>
      new Promise((resolve) => {
        resolveFirst = resolve;
      });

    const firstPromise = executeWithIdempotency({
      key: "concurrent_key_002",
      scope: "payment",
      handler: slowHandler,
    });

    // Chamada simultânea antes da primeira resolver
    await expect(
      executeWithIdempotency({
        key: "concurrent_key_002",
        scope: "payment",
        handler: async () => ({ concurrent: true }),
      })
    ).rejects.toThrow(IdempotencyConflictError);

    resolveFirst!({ done: true });
    const firstResult = await firstPromise;
    expect(firstResult).toEqual({ done: true });
  });

  it("libera o lock em caso de erro para permitir retentativa", async () => {
    let attempts = 0;
    const flakyHandler = async () => {
      attempts += 1;
      if (attempts === 1) {
        throw new Error("Falha temporária de rede");
      }
      return { recovered: true };
    };

    await expect(
      executeWithIdempotency({
        key: "flaky_key_003",
        scope: "billing",
        handler: flakyHandler,
      })
    ).rejects.toThrow("Falha temporária de rede");

    // Segunda chamada DEVE ser permitida pois a anterior falhou
    const result = await executeWithIdempotency({
      key: "flaky_key_003",
      scope: "billing",
      handler: flakyHandler,
    });

    expect(attempts).toBe(2);
    expect(result).toEqual({ recovered: true });
  });
});
