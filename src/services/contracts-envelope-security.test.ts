import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("public envelope and saved signature boundary", () => {
  it("uses an explicit envelope projection for the signing page", async () => {
    const source = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = source.indexOf("export const getEnvelopeByToken");
    const end = source.indexOf("// ─── Reconciliação", start);
    const block = source.slice(start, end);
    expect(block).toContain("id, signing_token, status, signed_at, signer_name, signer_email, signer_phone, signer_role");
    expect(block).toContain("contract:contract_id (id, title, category, verification_code)");
    expect(block).not.toContain("\n        *,");
    expect(block).not.toContain("dispatch_settings");
    expect(block).not.toContain("observers");
  });

  it("bounds saved signatures and verifies the profile update", async () => {
    const source = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = source.indexOf("export const saveUserSignature");
    const end = source.indexOf("export const getUserSavedSignature", start);
    const block = source.slice(start, end);
    expect(block).toContain("max(2_000_000)");
    expect(block).toContain("data:image\\/(png|jpeg|webp);base64,");
    expect(block).toContain('.select("id")');
    expect(block).toContain("!updatedProfile");
  });
});
