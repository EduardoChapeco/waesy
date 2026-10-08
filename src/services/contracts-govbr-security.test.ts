import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("Gov.br contract signing security boundary", () => {
  it("keeps Gov.br sealing server-only instead of exposing a client RPC", async () => {
    const contracts = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = contracts.indexOf("const GovBrSealInputSchema");
    const fn = contracts.indexOf("export async function signContractWithGovBr", start);
    expect(start).toBeGreaterThan(-1);
    expect(fn).toBeGreaterThan(start);
    expect(contracts.slice(start, fn + 120)).not.toContain("createServerFn");
  });

  it("requires successful token exchange and userinfo before sealing", async () => {
    const callback = await readFile(new URL("../routes/api.auth.govbr.callback.ts", import.meta.url), "utf8");
    expect(callback).toContain("govbr_token_exchange_failed");
    expect(callback).toContain("govbr_missing_access_token");
    expect(callback).toContain("govbr_userinfo_failed");
    expect(callback).toContain("govbr_identity_unverified");
    expect(callback).toContain("govbr_identity_mismatch");
    expect(callback).not.toContain("let govBrCpf = envelope.signer_cpf");
    expect(callback).not.toContain("if (tokenRes.ok) {");
  });
});
