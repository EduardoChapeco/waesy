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

  it("rejects non-pending or expired envelopes before requesting the atomic finalizer", async () => {
    const contracts = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = contracts.indexOf("export async function signContractWithGovBr");
    const end = contracts.indexOf("// ─── Geração Automática de Contrato a partir de Pedido", start);
    const signer = contracts.slice(start, end);
    const stateGuard = signer.indexOf('envelope.status !== "pending"');
    const expiryGuard = signer.indexOf("Date.parse(envelope.expires_at)");
    const finalizer = signer.indexOf("finalizeContractSignature(supabase");

    expect(stateGuard).toBeGreaterThan(-1);
    expect(expiryGuard).toBeGreaterThan(-1);
    expect(finalizer).toBeGreaterThan(stateGuard);
    expect(finalizer).toBeGreaterThan(expiryGuard);
    expect(signer).toContain("normalizedInputCpf.length !== 11");
    expect(signer).toContain("normalizedExpectedCpf.length !== 11");
    expect(signer).toContain("normalizedExpectedCpf !== normalizedInputCpf");
    expect(signer).not.toContain('.from("signature_evidence")\n    .insert(');
  });

  it("reconciles an ambiguous RPC response only after reading the signed Gov.br state", async () => {
    const contracts = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = contracts.indexOf("export async function signContractWithGovBr");
    const end = contracts.indexOf("// ─── Geração Automática de Contrato a partir de Pedido", start);
    const signer = contracts.slice(start, end);

    expect(signer).toContain("finalizeContractSignature(supabase");
    expect(signer).toContain('.select("status, signed_at, gov_br_verified, gov_br_level")');
    expect(signer).toContain("if (stateError)");
    expect(signer).toContain('currentEnvelope.gov_br_level === input.govBrLevel');
    expect(signer).toContain("promoteContractAfterSignatures(supabase");
    expect(signer).toContain("throw new Error(\"A assinatura Gov.br não foi confirmada");
    expect(signer).not.toContain('.from("signature_envelopes")\n    .update({\n      status: "signed"');
  });

  it("uses the shared transactional signature RPC and confirms contract completion", async () => {
    const contracts = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = contracts.indexOf("export async function signContractWithGovBr");
    const end = contracts.indexOf("// ─── Geração Automática de Contrato a partir de Pedido", start);
    const signer = contracts.slice(start, end);
    expect(signer).toContain("finalizeContractSignature(supabase");
    expect(signer).toContain("promoteContractAfterSignatures(supabase");
    const helpers = contracts.slice(contracts.indexOf("async function promoteContractAfterSignatures"), start);
    expect(helpers).toContain('.rpc("finalize_contract_signature"');
    expect(helpers).toContain('.rpc("promote_contract_after_signatures"');
    expect(helpers).toContain("contractStatus");
    expect(signer).not.toContain('.from("signature_envelopes")\n    .update({\n      status: "signed"');
  });

  it("requires persisted consented Gov.br evidence before idempotent success", async () => {
    const contracts = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = contracts.indexOf("export async function signContractWithGovBr");
    const end = contracts.indexOf("// ─── Geração Automática de Contrato a partir de Pedido", start);
    const signer = contracts.slice(start, end);
    const retryStart = signer.indexOf("if (alreadyGovBrSigned)");
    const retryEnd = signer.indexOf("const digest =", retryStart);
    const retry = signer.slice(retryStart, retryEnd);
    expect(retry).toContain('.from("signature_evidence")');
    expect(retry).toContain('.eq("envelope_id", envelope.id)');
    expect(retry).toContain('.eq("consent_given", true)');
    expect(retry).toContain('.eq("gov_br_verified", true)');
    expect(retry).toContain('.eq("gov_br_level", input.govBrLevel)');
    expect(retry).toContain("if (evidenceError || !evidence)");
    expect(retry.indexOf("if (evidenceError || !evidence)")).toBeLessThan(retry.indexOf("return {"));
  });

  it("reconciles a Gov.br response only with evidence for the exact digest and level", async () => {
    const contracts = await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8");
    const start = contracts.indexOf("export async function signContractWithGovBr");
    const end = contracts.indexOf("// ─── Geração Automática de Contrato a partir de Pedido", start);
    const signer = contracts.slice(start, end);
    const catchStart = signer.indexOf("  } catch {");
    const catchBlock = signer.slice(catchStart);
    const evidenceRead = catchBlock.indexOf('.from("signature_evidence")');
    const digestFilter = catchBlock.indexOf('.eq("signature_digest", digest)');
    const levelFilter = catchBlock.indexOf('.eq("gov_br_level", input.govBrLevel)');
    const evidenceGuard = catchBlock.indexOf("if (evidenceError || !evidence)");
    const success = catchBlock.indexOf("return {\n        success: true", evidenceGuard);
    expect(evidenceRead).toBeGreaterThan(-1);
    expect(digestFilter).toBeGreaterThan(evidenceRead);
    expect(levelFilter).toBeGreaterThan(digestFilter);
    expect(evidenceGuard).toBeGreaterThan(levelFilter);
    expect(success).toBeGreaterThan(evidenceGuard);
  });
});
