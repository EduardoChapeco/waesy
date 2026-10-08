import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import {
  derivePublicVerificationState,
  projectPublicVerificationEnvelope,
  projectPublicVerificationVersion,
  projectPublicTourismVerificationCode,
  projectTourismVerificationVersion,
} from "@/lib/contracts/public-verification-projection";

const servicePath = new URL("./contracts.functions.ts", import.meta.url);
const routePath = new URL("../routes/verify.document.$code.tsx", import.meta.url);

async function verificationBlock(): Promise<string> {
  const source = await readFile(servicePath, "utf8");
  const start = source.indexOf("export const verifyDocumentPublic");
  const end = source.indexOf("// ─── Listagem de Contratos", start);
  return source.slice(start, end);
}

describe("public document verification projection", () => {
  it("requires a sealed SHA-256 version, completed contract, and every canonical envelope signed", () => {
    const version = {
      version_number: 1,
      hash_sha256: "a".repeat(64),
      sealed_at: "2026-10-07T12:00:00.000Z",
      is_sealed: true,
      envelopes: [{ signer_name: "Pessoa", signer_role: "party", status: "signed", signed_at: "2026-10-07T12:01:00.000Z", auth_level: "advanced" }],
    };

    expect(derivePublicVerificationState("completed", version)).toEqual({
      isAuthentic: true,
      isFullySigned: true,
      isPending: false,
      allSignaturesSigned: true,
      pendingReason: null,
    });
    expect(derivePublicVerificationState("signing", version)).toMatchObject({
      isAuthentic: true,
      isFullySigned: false,
      isPending: true,
      allSignaturesSigned: true,
      pendingReason: "completion",
    });
  });

  it("keeps unsigned, rejected, expired, unsealed, and legacy signatures pending", () => {
    const base = {
      version_number: 1,
      hash_sha256: "b".repeat(64),
      sealed_at: "2026-10-07T12:00:00.000Z",
      is_sealed: true,
      envelopes: [{ signer_name: "Pessoa", signer_role: "party", status: "expired", signed_at: null, auth_level: "basic" }],
    };
    expect(derivePublicVerificationState("completed", base)).toMatchObject({
      isAuthentic: true, isFullySigned: false, isPending: true, pendingReason: "signatures",
    });
    expect(derivePublicVerificationState("completed", { ...base, is_sealed: false })).toMatchObject({
      isAuthentic: false, isFullySigned: false, isPending: true, pendingReason: "sealing",
    });
    expect(derivePublicVerificationState("completed", { ...base, hash_sha256: "not-a-sha256" })).toMatchObject({
      isAuthentic: false, isFullySigned: false, isPending: true, pendingReason: "sealing",
    });
    expect(derivePublicVerificationState("completed", { ...base, sealed_at: "not-a-date" })).toMatchObject({
      isAuthentic: false, isFullySigned: false, isPending: true, pendingReason: "sealing",
    });
    expect(derivePublicVerificationState("completed", { ...base, envelopes: [] })).toMatchObject({
      isFullySigned: false, isPending: true, pendingReason: "signatures",
    });
    expect(derivePublicVerificationState("completed", {
      ...base,
      envelopes: [{ ...base.envelopes[0], status: "signed", signed_at: "2026-10-07T12:01:00.000Z" }],
    }, "legacy_metadata")).toMatchObject({
      isAuthentic: true, isFullySigned: false, isPending: true, pendingReason: "legacy",
    });
  });

  it("keeps only verification-safe fields from a version and signer", () => {
    const projected = projectPublicVerificationVersion({
      version_number: 3,
      hash_sha256: "a".repeat(64),
      sealed_at: "2026-10-07T12:00:00.000Z",
      is_sealed: true,
      page_count: 11,
      signature_fields: [{ value: "private document text" }],
      internal_note: "internal",
      envelopes: [
        {
          signer_name: "Pessoa Exemplo",
          signer_role: "party",
          status: "signed",
          signed_at: "2026-10-07T12:01:00.000Z",
          auth_level: "advanced",
          signer_email: "private@example.test",
          signer_phone: "+5500000000000",
          signer_document: "00000000000",
          ip_address: "192.0.2.1",
          user_agent: "private agent",
          signature_image: "data:image/png;base64,private",
          facial_biometrics_hash: "private hash",
          private_extension: "private",
        },
        null,
      ],
    });

    expect(projected).toEqual({
      version_number: 3,
      hash_sha256: "a".repeat(64),
      sealed_at: "2026-10-07T12:00:00.000Z",
      is_sealed: true,
      envelopes: [
        {
          signer_name: "Pessoa Exemplo",
          signer_role: "party",
          status: "signed",
          signed_at: "2026-10-07T12:01:00.000Z",
          auth_level: "advanced",
        },
      ],
    });
    expect(JSON.stringify(projected)).not.toMatch(/private|email|phone|document|ip_address|user_agent|biometrics|signature_image/i);
  });

  it("rejects non-records and preserves no arbitrary extension fields", () => {
    expect(projectPublicVerificationEnvelope(null)).toBeNull();
    expect(projectPublicVerificationVersion("not-a-version")).toBeNull();
    expect(projectPublicVerificationVersion({ arbitrary: "private", envelopes: "invalid" })).toEqual({
      version_number: null,
      hash_sha256: null,
      sealed_at: null,
      is_sealed: false,
      envelopes: [],
    });
  });

  it("projects legacy tourism signatures without exposing their embedded PII", () => {
    const projected = projectTourismVerificationVersion({
      certificate_serial: "CERT-ABC123-2026",
      content_hash: "b".repeat(64),
      signed_at: "2026-10-07T12:00:00.000Z",
      client_name: "Pessoa Exemplo",
      signatures: [
        {
          signer_name: "Pessoa Exemplo",
          signer_document: "00000000000",
          signer_email: "private@example.test",
          signer_phone: "+5500000000000",
          signed_at: "2026-10-07T12:00:00.000Z",
          ip_address: "192.0.2.1",
          user_agent: "private agent",
          signature_image_url: "https://private.test/signature.png",
          auth_serial: "private serial",
          content_hash: "internal hash",
          private_extension: "private",
        },
      ],
    }, 2);

    expect(projected).toEqual({
      version_number: 2,
      hash_sha256: "b".repeat(64),
      sealed_at: "2026-10-07T12:00:00.000Z",
      is_sealed: true,
      envelopes: [
        {
          signer_name: "Pessoa Exemplo",
          signer_role: "party",
          status: "signed",
          signed_at: "2026-10-07T12:00:00.000Z",
          auth_level: null,
        },
      ],
    });
    expect(JSON.stringify(projected)).not.toMatch(/private|document|email|phone|ip_address|user_agent|signature_image|auth_serial/i);
  });

  it("returns only a canonical tourism certificate serial, token, or SHA-256", () => {
    expect(
      projectPublicTourismVerificationCode(
        { certificate_serial: "CERT-ABC123-2026" },
        "ct_public1234",
        "CERT-ABC123-2026",
      ),
    ).toBe("CERT-ABC123-2026");
    expect(
      projectPublicTourismVerificationCode(
        { certificate_serial: "person@example.test" },
        "ct_public1234",
        "person@example.test",
      ),
    ).toBe("ct_public1234");
    expect(
      projectPublicTourismVerificationCode(
        { certificate_serial: "00000000000" },
        "private@example.test",
        "private@example.test",
      ),
    ).toBeNull();
    expect(projectPublicTourismVerificationCode({}, null, "A".repeat(64))).toBe("a".repeat(64));
  });

  it("selects no private fields in the normal public lookup and applies the allowlist", async () => {
    const block = await verificationBlock();
    const selectStart = block.indexOf("const buildContractQuery");
    const selectEnd = block.indexOf("const isHex", selectStart);
    const selection = block.slice(selectStart, selectEnd);

    expect(selection).not.toMatch(/dispatch_settings|observers|creator:creator_id|signer_email|signer_phone|signature_fields|page_count/);
    expect(selection).toContain("current_version");
    expect(block).toContain("projectPublicVerificationVersion(");
    expect(block).toContain("version.version_number === contract.current_version");
    expect(block).toContain("isValid: verificationState.isFullySigned");
    expect(block).not.toContain("dispatchSettings:");
    expect(block).not.toContain("observers:");
  });

  it("uses parameterized tourism lookups and never returns raw metadata signatures", async () => {
    const block = await verificationBlock();
    expect(block).not.toContain(".or(`verification_code.eq.${codeOrHash}`)");
    expect(block).toContain('.filter(column, "eq", value)');
    expect(block).toContain('["metadata->>certificate_serial", serialLookup]');
    expect(block).toContain('["metadata->>content_hash", normalizedHash]');
    expect(block).toContain('.select("id, contract_id")');
    expect(block).toContain("const contractByCode = await findContract(");
    expect(block).toContain("matchedVersionId = matchedVersion.id");
    expect(block).toContain("versions.find((version) => version.id === matchedVersionId)");
    expect(block).not.toContain("(meta.signatures as any[])");
    expect(block).toContain("projectPublicVerificationVersion(");
    expect(block).toContain('"legacy_metadata"');
    expect(block).toContain("isValid: verificationState.isFullySigned");
  });

  it("lets a 64-character tourism hash reach the metadata fallback when no version row exists", async () => {
    const block = await verificationBlock();
    const hashStart = block.indexOf("const isHex");
    const fallbackStart = block.indexOf("if (!contract)", hashStart);
    const primaryHashBranch = block.slice(hashStart, fallbackStart);

    expect(primaryHashBranch).not.toContain('throw new Error("Documento não reconhecido pelo hash informado.")');
    expect(block.indexOf('["metadata->>content_hash", normalizedHash]')).toBeGreaterThan(fallbackStart);
  });

  it("validates the tourism certificate serial before returning it", async () => {
    const block = await verificationBlock();
    expect(block).toContain("projectPublicTourismVerificationCode(");
    expect(block).not.toContain("verificationCode: meta.certificate_serial || tourismContract.verification_code");
  });

  it("bounds public input before database access", async () => {
    const block = await verificationBlock();
    expect(block).toContain(".validator(z.string().trim().min(1).max(256))");
    expect(block.indexOf(".validator(z.string().trim().min(1).max(256))")).toBeLessThan(block.indexOf("getServerClient()"));
  });

  it("does not read signer contacts or observers in the public route", async () => {
    const route = await readFile(routePath, "utf8");
    expect(route).not.toMatch(/signer_email|signer_phone|env\.email|env\.phone|result\.observers|observers=/);
    expect(route).toContain("env.signer_name");
    expect(route).toContain("env.auth_level");
    expect(route).toContain("result.isFullySigned");
    expect(route).toContain("result.isAuthentic");
    expect(route).not.toContain("Documento Autêntico e Verificado");
    expect(route).not.toContain("CÁLCULO CRIPTOGRÁFICO CONCLUÍDO");
  });
});
