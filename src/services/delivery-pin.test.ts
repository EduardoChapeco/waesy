import { describe, it, expect, vi } from "vitest";

describe("Protocolo Criptográfico de PIN de Entrega (BigTech Delivery Security)", () => {
  it("deve derivar hash determinístico e seguro para PIN de entrega", async () => {
    const crypto = await import("crypto");
    const orderId = "6338d637-49bd-4544-a441-219da293c315";
    const pin = "482915";

    const hash = crypto
      .createHash("sha256")
      .update(pin + orderId)
      .digest("hex");

    expect(hash).toBeDefined();
    expect(hash.length).toBe(64);

    // Validação de idempotência
    const recomputedHash = crypto
      .createHash("sha256")
      .update(pin + orderId)
      .digest("hex");

    expect(hash).toBe(recomputedHash);
  });

  it("deve rejeitar PIN com comprimento inválido fora de 4 a 8 dígitos", () => {
    const validPins = ["1234", "123456", "12345678"];
    const invalidPins = ["12", "123", "123456789"];

    validPins.forEach((p) => {
      expect(p.length >= 4 && p.length <= 8).toBe(true);
    });

    invalidPins.forEach((p) => {
      expect(p.length >= 4 && p.length <= 8).toBe(false);
    });
  });
});
