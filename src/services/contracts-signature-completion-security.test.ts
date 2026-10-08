import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";

const migrationPath = new URL("../../supabase/migrations/20270114000000_contract_signature_completion.sql", import.meta.url);
const sealMigrationPath = new URL("../../supabase/migrations/20270115000000_contract_seal_atomic_authorization.sql", import.meta.url);
const servicePath = new URL("./contracts.functions.ts", import.meta.url);
const typesPath = new URL("../integrations/supabase/types.ts", import.meta.url);
const signerRoutePath = new URL("../routes/assinar.$token.tsx", import.meta.url);
const manifestPath = new URL("../components/contracts/contract-audit-manifest.tsx", import.meta.url);

async function source(path: URL): Promise<string> {
  return readFile(path, "utf8");
}

describe("canonical contract signature completion", () => {
  it("locks the version and contract, promotes only after every signed envelope, and serializes evidence atomically", async () => {
    const migration = await source(migrationPath);
    expect(migration).toContain("FUNCTION public.finalize_contract_signature(");
    expect(migration).toContain("FUNCTION public.promote_contract_after_signatures(");
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("status = 'completed'");
    expect(migration).toContain("status <> 'signed'");
    expect(migration).toContain("signed_at IS NULL");
    expect(migration).toContain("INSERT INTO public.signature_evidence");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.finalize_contract_signature");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.finalize_contract_signature");
    expect(migration).toContain("prevent_envelope_on_completed_contract");
    expect(migration).toContain("contract_version_id");
    expect(migration).toContain("v_signed_at := clock_timestamp()");
    expect(migration).toContain("a versão de um envelope existente é imutável");
    expect(migration).toContain("v_auth_method IS NULL");
    expect(migration).toContain("WHERE e.status <> 'signed'");
    expect(migration).toContain("OR e.signed_at IS NULL");
    expect(migration).toContain("AND NOT EXISTS (");
  });

  it("wires manual and Gov.br signers to the database transaction, not a separate signed update", async () => {
    const contracts = await source(servicePath);
    const manualStart = contracts.indexOf("export const signContractEnvelope");
    const publicStart = contracts.indexOf("// ─── Verificação Pública", manualStart);
    const govStart = contracts.indexOf("export async function signContractWithGovBr");
    const orderStart = contracts.indexOf("// ─── Geração Automática de Contrato a partir de Pedido", govStart);
    const manual = contracts.slice(manualStart, publicStart);
    const gov = contracts.slice(govStart, orderStart);
    const helpers = contracts.slice(contracts.indexOf("async function promoteContractAfterSignatures"), manualStart);
    for (const signer of [manual, gov]) {
      expect(signer).toContain("finalizeContractSignature(supabase");
      expect(signer).toContain("promoteContractAfterSignatures(supabase");
      expect(signer).not.toContain('.from("signature_envelopes")\n      .update({\n        status: "signed"');
    }
    expect(helpers).toContain('.rpc("finalize_contract_signature"');
    expect(helpers).toContain('.rpc("promote_contract_after_signatures"');
    expect(helpers).toContain("contractStatus");
  });

  it("declares the RPC contracts in generated Supabase types", async () => {
    const types = await source(typesPath);
    expect(types).toContain("finalize_contract_signature:");
    expect(types).toContain("promote_contract_after_signatures:");
    expect(types).toContain("seal_and_issue_contract:");
  });

  it("authorizes sealing to the authenticated creator and tenant before a single atomic RPC", async () => {
    const contracts = await source(servicePath);
    const start = contracts.indexOf("export const sealAndIssueContract");
    const end = contracts.indexOf("// ─── Extração Inteligente", start);
    const seal = contracts.slice(start, end);
    expect(seal).toContain("requireStaff()");
    expect(seal).toContain('.eq("creator_id", actor.id)');
    expect(seal).toContain('.eq("store_id", actor.store_id)');
    expect(seal).toContain('.rpc("seal_and_issue_contract"');
    expect(seal).toContain("p_expected_signature_fields: version.signature_fields");
    expect(seal).not.toContain("getIdentity()");
    expect(seal).not.toContain('.from("contract_versions")\n      .update({');
    expect(seal).not.toContain('.from("contracts")\n      .update({');
    expect(seal).not.toContain('.from("signature_envelopes")\n      .insert(');

    const migration = await source(sealMigrationPath);
    expect(migration).toContain("FUNCTION public.seal_and_issue_contract(");
    expect(migration).toContain("v_contract.creator_id IS DISTINCT FROM p_actor_id");
    expect(migration).toContain("v_contract.store_id IS DISTINCT FROM p_store_id");
    expect(migration).toContain("v_version.signature_fields IS DISTINCT FROM p_expected_signature_fields");
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("status = 'completed'");
    expect(migration).toContain("REVOKE ALL ON FUNCTION public.seal_and_issue_contract");
    expect(migration).toContain("GRANT EXECUTE ON FUNCTION public.seal_and_issue_contract");
  });

  it("describes the individual signature, not the whole contract, on the signer route", async () => {
    const route = await source(signerRoutePath);
    expect(route).toContain("A sua assinatura foi registada");
    expect(route).not.toContain("Documento assinado eletronicamente com sucesso!");
    expect(route).not.toContain("Documento Assinado");
    expect(route).not.toContain('search?.signed === "true"');
    expect(route).toContain('envelope?.status === "signed"');
    const callback = await source(new URL("../routes/api.auth.govbr.callback.ts", import.meta.url));
    expect(callback).not.toContain("?signed=true");
  });

  it("has no fabricated hash or unconditional advanced-signature claim in the public manifest", async () => {
    const manifest = await source(manifestPath);
    expect(manifest).toContain("Hash ainda não disponível");
    expect(manifest).not.toContain("CÁLCULO CRIPTOGRÁFICO EM ANDAMENTO");
    expect(manifest).not.toContain("Assinatura Avançada · Lei 14.063/2020");
  });
});
