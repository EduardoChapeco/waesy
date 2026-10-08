import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("public document verification projection", () => {
  it("does not select or return private contract metadata", async () => {
    const source = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = source.indexOf("export const verifyDocumentPublic");
    const end = source.indexOf("// ─── Listagem de Contratos", start);
    const block = source.slice(start, end);
    expect(block).not.toContain("dispatch_settings");
    expect(block).not.toContain("observers");
    expect(block).not.toContain("creator:creator_id");
    expect(block).not.toContain("signer_email");
    expect(block).not.toContain("signer_phone");
    expect(block).toContain("sealedVersion:");
  });

  it("uses an explicit allowlist for the tourism fallback", async () => {
    const source = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = source.indexOf("Fallback: busca contratos turísticos");
    const end = source.indexOf("if (tourismContract)", start);
    expect(source.slice(start, end)).not.toContain('.select("*")');
    expect(source.slice(start, end)).toContain("metadata");
  });
});
