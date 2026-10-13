import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const source = (file: string) =>
  fs.readFileSync(path.resolve(process.cwd(), "src/services", file), "utf8");

describe("Tenant fallback security contracts", () => {
  it("builder não deve escolher a primeira loja para administrador global", () => {
    const builder = source("builder.functions.ts");
    expect(builder).not.toContain("firstStore");
    expect(builder).not.toContain('.from("stores").select("id").limit(1)');
    expect(builder).toContain("Administrador global também precisa declarar o tenant-alvo");
  });

  it("Order Bump exige storeId e não consulta a primeira loja", () => {
    const upsell = source("upsell.functions.ts");
    expect(upsell).toContain("storeId: z.string().uuid(),");
    expect(upsell).not.toContain("firstStore");
    expect(upsell).not.toContain('.from("stores").select("id").limit(1)');
  });

  it("carrinho só cria e consulta ofertas com contexto de tenant", () => {
    const cart = source("cart.functions.ts");
    expect(cart).toContain("Nenhum contexto de loja identificado para o carrinho.");
    expect(cart).not.toContain("defaultStore");
    expect(cart).not.toContain("firstStore");
    expect(cart).not.toContain('.from("stores").select("id").limit(1)');
    expect(cart).toContain("storeId: z.string().uuid(),");
  });
});
