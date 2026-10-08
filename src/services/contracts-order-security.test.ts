import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("order contract authorization boundary", () => {
  it("keeps public-token and authenticated ownership checks in the server handler", async () => {
    const source = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const handler = source.indexOf("export const generateContractFromOrder");
    const tokenSchema = source.indexOf("publicToken: z.string()", handler);
    const tokenFilter = source.indexOf('.eq("public_token", input.publicToken)', handler);
    const staffCheck = source.indexOf("staffStoreId = (await requireStaff()).store_id", handler);
    const staffFilter = source.indexOf('.eq("store_id", staffStoreId)', handler);
    const customerFilter = source.indexOf('.filter("customer_snapshot->>profile_id", "eq", authenticatedUserId)', handler);
    const denial = source.indexOf("Pedido não encontrado ou sem permissão.", handler);
    const insert = source.indexOf('.from("contracts")', denial);
    expect(handler).toBeGreaterThan(-1);
    expect(tokenSchema).toBeGreaterThan(handler);
    expect(tokenFilter).toBeGreaterThan(tokenSchema);
    expect(staffCheck).toBeGreaterThan(handler);
    expect(staffFilter).toBeGreaterThan(staffCheck);
    expect(customerFilter).toBeGreaterThan(staffFilter);
    expect(denial).toBeGreaterThan(customerFilter);
    expect(insert).toBeGreaterThan(denial);
  });

  it("requires role and query-level tenant/owner constraints", async () => {
    const source = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = source.indexOf("export const generateContractFromOrder");
    const end = source.indexOf("export const generateContractFromDeal", start);
    const section = source.slice(start, end);

    expect(section).toContain('if (!input.publicToken && !authenticatedUserId)');
    expect(section).toContain("staffStoreId = (await requireStaff()).store_id");
    expect(section).toContain('.eq("store_id", staffStoreId)');
    expect(section).toContain('.filter("customer_snapshot->>profile_id", "eq", authenticatedUserId)');
    expect(section).toContain('.eq("public_token", input.publicToken)');
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
