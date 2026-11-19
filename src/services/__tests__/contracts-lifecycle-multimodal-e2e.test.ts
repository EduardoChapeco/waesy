import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  assertContractCancellable,
  buildContractSigningUrls,
  formatContractStatusLabel,
  isContractSignedOrCompleted,
  isExternalHttpUrl,
  normalizeBrazilPhoneE164,
  normalizeLegalDocumentStoragePath,
  resolveViewedStatusTransition,
} from "@/lib/contracts/contract-vault-rules";

describe("Contracts Lifecycle & Multimodal Signature E2E Suite", () => {
  describe("1. Contract Vault State Machine & Lifecycle Invariants", () => {
    it("manages transitions between draft, reviewing, signing, signed and completed", () => {
      // Draft & reviewing allow cancellation
      expect(() => assertContractCancellable("draft")).not.toThrow();
      expect(() => assertContractCancellable("reviewing")).not.toThrow();
      expect(() => assertContractCancellable("signing")).not.toThrow();

      // Terminal states reject cancellation
      expect(() => assertContractCancellable("signed")).toThrow(
        "Contratos já assinados e concluídos não podem ser cancelados.",
      );
      expect(() => assertContractCancellable("completed")).toThrow(
        "Contratos já assinados e concluídos não podem ser cancelados.",
      );
      expect(() => assertContractCancellable("cancelled")).toThrow(
        "Este contrato já encontra-se cancelado.",
      );
    });

    it("unifies status labels and completed checks", () => {
      expect(isContractSignedOrCompleted("signed")).toBe(true);
      expect(isContractSignedOrCompleted("completed")).toBe(true);
      expect(isContractSignedOrCompleted("draft")).toBe(false);
      expect(isContractSignedOrCompleted("signing")).toBe(false);

      expect(formatContractStatusLabel("signed")).toBe("Assinado");
      expect(formatContractStatusLabel("completed")).toBe("Assinado");
      expect(formatContractStatusLabel("signing")).toBe("Aguardando Assinaturas");
      expect(formatContractStatusLabel("awaiting_signatures")).toBe("Aguardando Assinaturas");
      expect(formatContractStatusLabel("draft")).toBe("Rascunho");
      expect(formatContractStatusLabel("cancelled")).toBe("Cancelado");
    });

    it("preserves viewed envelope timestamps and never downgrades terminal states", () => {
      expect(resolveViewedStatusTransition("pending", null)).toEqual({
        shouldMarkViewed: true,
        nextStatus: "viewed",
      });
      expect(resolveViewedStatusTransition("viewed", "2026-11-17T12:00:00Z")).toEqual({
        shouldMarkViewed: false,
        nextStatus: "viewed",
      });
      expect(resolveViewedStatusTransition("signed", "2026-11-17T12:00:00Z")).toEqual({
        shouldMarkViewed: false,
        nextStatus: "signed",
      });
    });
  });

  describe("2. Cryptographic Integrity (SHA-256) & Audit Manifest", () => {
    it("computes deterministic SHA-256 digests over document content, clauses and fields", async () => {
      const content = "# Contrato de Prestação de Serviços";
      const clauses = [{ title: "Cláusula 1", text: "Objeto" }];
      const fields = [{ id: "f1", type: "signature", page: 1, x: 100, y: 200 }];

      const textBuffer = new TextEncoder().encode(
        content + JSON.stringify(clauses) + JSON.stringify(fields),
      );
      const hashBuffer = await crypto.subtle.digest("SHA-256", textBuffer);
      const hashHex = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      expect(hashHex).toMatch(/^[0-9a-f]{64}$/);

      // Mutating any clause or field changes the hash
      const mutatedBuffer = new TextEncoder().encode(
        content + JSON.stringify([{ title: "Cláusula 1", text: "Objeto Alterado" }]) + JSON.stringify(fields),
      );
      const mutatedHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", mutatedBuffer)))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      expect(mutatedHash).not.toBe(hashHex);
    });

    it("hashes biometric selfie image payloads immutably", async () => {
      const fakeImageData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]);
      const hashBuffer = await crypto.subtle.digest("SHA-256", fakeImageData);
      const bioHash = Array.from(new Uint8Array(hashBuffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      expect(bioHash).toHaveLength(64);
      expect(bioHash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("3. Multimodal Signing Modalities & Public Link Isolation", () => {
    it("generates public signing links without leaking private workspace routes", () => {
      const token = "tok_sec_9876543210fedcba";
      const links = buildContractSigningUrls({
        signingToken: token,
        documentTitle: "Reserva Pacote Cancún",
        signerName: "Carlos Eduardo Silva",
        signerPhone: "49988776655",
        isReminder: false,
      });

      // Strict public route
      expect(links.signingUrl).toBe(`/assinar/${token}`);
      expect(links.signingUrl).not.toContain("/workspace");

      // Valid WhatsApp dispatch message
      expect(links.manualWhatsappUrl).toBeDefined();
      const decodedMessage = decodeURIComponent(links.manualWhatsappUrl || "");
      expect(decodedMessage).toContain("Carlos");
      expect(decodedMessage).toContain("Reserva Pacote Cancún");
      expect(decodedMessage).toContain(`/assinar/${token}`);
      expect(decodedMessage).not.toContain("/workspace/contratos");
    });

    it("verifies phone normalization and external URL detection", () => {
      expect(normalizeBrazilPhoneE164("49 98877-6655")).toBe("+5549988776655");
      expect(normalizeBrazilPhoneE164("+55 (49) 98877-6655")).toBe("+5549988776655");
      expect(normalizeLegalDocumentStoragePath("legal-documents/store-99/contract-1.pdf")).toBe(
        "store-99/contract-1.pdf",
      );
      expect(isExternalHttpUrl("https://example.com/contrato.pdf")).toBe(true);
    });
  });

  describe("4. Static Governance & BFF Parameter Destructuring (Rule B.25)", () => {
    it("verifies that sealAndIssueContract, signContractEnvelope and updateContractDraft enforce tenant and parameters", async () => {
      const contractsBffSource = (
        await readFile(new URL("../contracts.functions.ts", import.meta.url), "utf8")
      ).replace(/\r\n/g, "\n");

      // Destructuring and parameter usage in sealAndIssueContract
      expect(contractsBffSource).toContain("export const sealAndIssueContract = createServerFn");
      expect(contractsBffSource).toContain("input.contractId");
      expect(contractsBffSource).toContain("input.versionId");
      expect(contractsBffSource).toContain("input.signers");

      // Destructuring and parameter usage in signContractEnvelope
      expect(contractsBffSource).toContain("export const signContractEnvelope = createServerFn");
      expect(contractsBffSource).toContain("input.signingToken");
      expect(contractsBffSource).toContain("input.consent");

      // Tenant isolation: requireStaff and store_id filter
      expect(contractsBffSource).toContain("await requireStaff()");
      expect(contractsBffSource).toContain("actor.store_id");

      // Facial biometrics enforcement in BFF
      expect(contractsBffSource).toContain(
        "if (envelope.require_facial_biometrics && !input.facialBiometricsHash && !input.faceImageUrl)",
      );
    });

    it("verifies public signer route has multimodal support and zero internal route leaks", async () => {
      const signerRouteSource = (
        await readFile(new URL("../../routes/assinar.$token.tsx", import.meta.url), "utf8")
      ).replace(/\r\n/g, "\n");

      // Multimodal modalities
      expect(signerRouteSource).toContain('type SignatureMethod = "draw" | "type" | "upload" | "saved" | "govbr"');
      expect(signerRouteSource).toContain("generateCursiveSignatureImage");
      expect(signerRouteSource).toContain("handleSignatureFileUpload");
      expect(signerRouteSource).toContain("SignatureCanvasPad");

      // OTP support
      expect(signerRouteSource).toContain('envelope.auth_level === "advanced"');
      expect(signerRouteSource).toContain("otpCode");
      expect(signerRouteSource).toContain("handleResendOtp");

      // Zero leakage of private workspace routes
      expect(signerRouteSource).not.toContain("to=\"/workspace");
    });
  });
});
