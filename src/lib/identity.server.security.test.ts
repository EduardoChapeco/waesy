import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/lib/identity.server.ts"), "utf8");

describe("identity.server — isolamento de contexto", () => {
  it("não atribui a primeira loja do banco a visitantes sem tenant", () => {
    expect(source).not.toContain(".from(\"stores\")\n          .select(\"id\")\n          .limit(1)");
    expect(source).toContain("const guestIdentity: ServerIdentity");
    expect(source).toContain("store_id: activeStoreId");
  });

  it("inclui o host na chave do cache de identidade", () => {
    expect(source).toContain('const host = getRequestHeader("host") || "unknown-host"');
    expect(source).toContain("return `${host}|${sb}|${ctx}`");
  });
});
