import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const dispatch = readFileSync(resolve(process.cwd(), "src/services/dispatch.functions.ts"), "utf8");
const checkout = readFileSync(resolve(process.cwd(), "src/services/checkout.functions.ts"), "utf8");
const detector = readFileSync(resolve(process.cwd(), "scripts/dead-code-detector.mjs"), "utf8");

describe("P0 security hardening", () => {
  it("expira e torna uso único os magic links de entrega", () => {
    expect(dispatch).toContain("magicLink.expires_at");
    expect(dispatch).toContain("link.used_at");
    expect(dispatch).toContain("link.delivery_confirmed_at");
    expect(dispatch).toContain('.is("used_at", null)');
    expect(dispatch).not.toContain('pin !== "1234"');
  });

  it("restringe provas de entrega a staff da loja relacionada", () => {
    const block = dispatch.slice(
      dispatch.indexOf("export const getDeliveryProofsByOrderId"),
      dispatch.indexOf("export const confirmDeliveryByPin"),
    );
    expect(block).toContain("assertStoreAccess(identity");
    expect(block).toContain("delivery_magic_links");
    expect(block).toContain("identity.store_id");
    expect(block).not.toContain('.select("*")');
  });

  it("confere propriedade do carrinho antes do RPC de checkout", () => {
    const block = checkout.slice(
      checkout.indexOf("export const processCheckout"),
      checkout.indexOf("// Zero-Trust Barreira"),
    );
    expect(block).toContain("ownedCart");
    expect(block).toContain("ownedCart.customer_id === identity.customer_id");
    expect(block).toContain("ownedCart.session_token === guestSession");
  });

  it("faz --ci usar o modo estrito do detector", () => {
    expect(detector).toContain('process.argv.includes("--ci")');
    expect(detector).toContain('const strict = process.argv.includes("--strict") || process.argv.includes("--ci")');
    expect(detector).toContain("auditDeadCode({ strict })");
  });
});
