import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

describe("manual contract signing security boundary", () => {
  it("bounds signing input and rejects expired envelopes", async () => {
    const source = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = source.indexOf("export const signContractEnvelope");
    const expiry = source.indexOf("envelope.expires_at", start);
    expect(source.slice(start, start + 1300)).toContain("signingToken: z.string().trim().min(16).max(240)");
    expect(source.slice(start, start + 1300)).toContain("signatureImageBase64: z.string().max(2_000_000)");
    expect(expiry).toBeGreaterThan(start);
  });

  it("finalizes evidence and envelope in one transaction without a best-effort cleanup", async () => {
    const source = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = source.indexOf("export const signContractEnvelope");
    const end = source.indexOf("// ─── Verificação Pública", start);
    const signer = source.slice(start, end);
    expect(signer).toContain("finalizeContractSignature(supabase");
    expect(signer).toContain("promoteContractAfterSignatures(supabase");
    expect(signer).toContain(".select(\"status, signed_at\")");
    expect(signer).toContain('.eq("signature_digest", digest)');
    expect(signer).not.toContain('.from("signature_evidence")\n      .insert(');
    expect(signer).not.toContain('.from("signature_envelopes")\n      .update({\n        status: "signed"');
  });

  it("reports ambiguous success only after re-reading a signed envelope and promoting its contract", async () => {
    const source = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = source.indexOf("export const signContractEnvelope");
    const end = source.indexOf("// ─── Verificação Pública", start);
    const signer = source.slice(start, end);
    const recheck = signer.indexOf('.select("status, signed_at")');
    const signedCheck = signer.indexOf('latestEnvelope?.status === "signed"', recheck);
    const evidenceCheck = signer.indexOf('.eq("signature_digest", digest)', signedCheck);
    const promotion = signer.indexOf("promoteContractAfterSignatures(supabase", evidenceCheck);
    const explicitFailure = signer.indexOf("throw new Error(\"A assinatura não foi confirmada", promotion);

    expect(recheck).toBeGreaterThan(-1);
    expect(signedCheck).toBeGreaterThan(recheck);
    expect(evidenceCheck).toBeGreaterThan(signedCheck);
    expect(promotion).toBeGreaterThan(evidenceCheck);
    expect(explicitFailure).toBeGreaterThan(promotion);
  });

  it("finalizes evidence, envelope, and contract completion through the transactional RPC", async () => {
    const source = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = source.indexOf("export const signContractEnvelope");
    const end = source.indexOf("// ─── Verificação Pública", start);
    const signer = source.slice(start, end);
    expect(signer).toContain("finalizeContractSignature(supabase");
    expect(signer).toContain("promoteContractAfterSignatures(supabase");
    const helpers = source.slice(source.indexOf("async function promoteContractAfterSignatures"), start);
    expect(helpers).toContain('.rpc("finalize_contract_signature"');
    expect(helpers).toContain('.rpc("promote_contract_after_signatures"');
    expect(helpers).toContain("contractStatus");
    expect(signer).not.toContain('.from("signature_envelopes")\n      .update({\n        status: "signed"');
  });

  it("proves persisted consent evidence before idempotent success for an already-signed envelope", async () => {
    const source = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = source.indexOf("export const signContractEnvelope");
    const end = source.indexOf("// ─── Verificação Pública", start);
    const signer = source.slice(start, end);
    const retryStart = signer.indexOf('if (envelope.status === "signed")');
    const digestStart = signer.indexOf("const digest =", retryStart);
    const retry = signer.slice(retryStart, digestStart);
    expect(retry).toContain('.from("signature_evidence")');
    expect(retry).toContain('.eq("envelope_id", envelope.id)');
    expect(retry).toContain('.eq("consent_given", true)');
    expect(retry).toContain("if (evidenceError || !evidence)");
    expect(retry.indexOf("if (evidenceError || !evidence)")).toBeLessThan(retry.indexOf("return {\n        success: true"));
  });

  it("does not reconcile an ambiguous response unless this exact digest has consented evidence", async () => {
    const source = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = source.indexOf("export const signContractEnvelope");
    const end = source.indexOf("// ─── Verificação Pública", start);
    const signer = source.slice(start, end);
    const catchStart = signer.indexOf("    } catch {");
    const catchBlock = signer.slice(catchStart);
    const evidenceRead = catchBlock.indexOf('.from("signature_evidence")');
    const digestFilter = catchBlock.indexOf('.eq("signature_digest", digest)');
    const evidenceGuard = catchBlock.indexOf("if (evidenceError || !evidence)");
    const success = catchBlock.indexOf("return {\n          success: true", evidenceGuard);
    expect(evidenceRead).toBeGreaterThan(-1);
    expect(digestFilter).toBeGreaterThan(evidenceRead);
    expect(evidenceGuard).toBeGreaterThan(digestFilter);
    expect(success).toBeGreaterThan(evidenceGuard);
  });
});
