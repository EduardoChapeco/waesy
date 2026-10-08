import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("contract mutation authorization boundary", () => {
  it("checks creator ownership and editable version before updating drafts", async () => {
    const source = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = source.indexOf("export const updateContractDraft");
    const end = source.indexOf("// ─── Selagem Criptográfica", start);
    const block = source.slice(start, end);
    expect(block).toContain("const identity = await requireStaff();");
    expect(block).toContain('.eq("creator_id", identity.id)');
    expect(block).toContain('.eq("contract_id", ownedContract.id)');
    expect(block).toContain('.eq("is_sealed", false)');
    expect(block).toContain('.select("id")');
    expect(block).toContain("!updatedDraft");
    expect(block).toContain("!updatedVersion");
  });

  it("requires an owned draft and checks every critical seal transition", async () => {
    const source = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = source.indexOf("export const sealAndIssueContract");
    const end = source.indexOf("// ─── Extração Inteligente", start);
    const block = source.slice(start, end);
    expect(block).toContain("requireStaff()");
    expect(block).toContain('.eq("creator_id", actor.id)');
    expect(block).toContain('.eq("store_id", actor.store_id)');
    expect(block).toContain('.rpc("seal_and_issue_contract"');
    expect(block).toContain("rpcError");
  });
});
