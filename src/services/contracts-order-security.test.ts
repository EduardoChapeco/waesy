import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("order contract authorization boundary", () => {
  it("keeps public-token and authenticated ownership checks in the server handler", async () => {
    const source = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const handler = source.indexOf("export const generateContractFromOrder");
    const tokenSchema = source.indexOf("publicToken: z.string()", handler);
    const tokenFilter = source.indexOf('.eq("public_token", input.publicToken)', handler);
    const staffCheck = source.indexOf("const isTenantStaff = identity?.store_id === order.store_id;", handler);
    const customerCheck = source.indexOf("const isOrderCustomer = identity?.id && identity.id === customer.profile_id;", handler);
    const denial = source.indexOf("Você não tem permissão para gerar contrato deste pedido.", handler);
    const insert = source.indexOf('.from("contracts")', denial);
    expect(handler).toBeGreaterThan(-1);
    expect(tokenSchema).toBeGreaterThan(handler);
    expect(tokenFilter).toBeGreaterThan(tokenSchema);
    expect(staffCheck).toBeGreaterThan(tokenFilter);
    expect(customerCheck).toBeGreaterThan(staffCheck);
    expect(denial).toBeGreaterThan(customerCheck);
    expect(insert).toBeGreaterThan(denial);
  });

  it("forwards the route token from the public confirmation page", async () => {
    const source = await readFile(
      new URL("../routes/_store.pedido.$publicToken.confirmacao.tsx", import.meta.url),
      "utf8",
    );
    expect(source).toContain("const { publicToken } = Route.useParams();");
    expect(source).toContain("publicToken } });");
  });

  it("anchors manual contract creation to staff tenant identity", async () => {
    const source = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const handler = source.indexOf("export const createContract");
    const guard = source.indexOf("const identity = await requireStaff();", handler);
    const mismatch = source.indexOf("input.storeId !== identity.store_id", guard);
    const insert = source.indexOf("store_id: identity.store_id", mismatch);
    expect(handler).toBeGreaterThan(-1);
    expect(guard).toBeGreaterThan(handler);
    expect(mismatch).toBeGreaterThan(guard);
    expect(insert).toBeGreaterThan(mismatch);
  });
});
