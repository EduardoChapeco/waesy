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

describe("contract vault domain rules & lifecycle", () => {
  it("transitions envelope from pending to viewed without downgrading terminal states", () => {
    expect(resolveViewedStatusTransition("pending", null)).toEqual({
      shouldMarkViewed: true,
      nextStatus: "viewed",
    });

    expect(resolveViewedStatusTransition("viewed", null)).toEqual({
      shouldMarkViewed: true,
      nextStatus: "viewed",
    });

    expect(resolveViewedStatusTransition("viewed", "2026-11-15T10:00:00Z")).toEqual({
      shouldMarkViewed: false,
      nextStatus: "viewed",
    });

    expect(resolveViewedStatusTransition("signed", null)).toEqual({
      shouldMarkViewed: false,
      nextStatus: "signed",
    });

    expect(resolveViewedStatusTransition("cancelled", null)).toEqual({
      shouldMarkViewed: false,
      nextStatus: "cancelled",
    });

    expect(resolveViewedStatusTransition("declined", "2026-11-15T10:00:00Z")).toEqual({
      shouldMarkViewed: false,
      nextStatus: "declined",
    });
  });

  it("prevents cancelling signed or completed contracts", () => {
    expect(() => assertContractCancellable("draft")).not.toThrow();
    expect(() => assertContractCancellable("signing")).not.toThrow();
    expect(() => assertContractCancellable("completed")).toThrow(
      "Contratos já assinados e concluídos não podem ser cancelados.",
    );
    expect(() => assertContractCancellable("signed")).toThrow(
      "Contratos já assinados e concluídos não podem ser cancelados.",
    );
    expect(() => assertContractCancellable("cancelled")).toThrow(
      "Este contrato já encontra-se cancelado.",
    );
  });

  it("unifies signed and completed contract status labels", () => {
    expect(isContractSignedOrCompleted("signed")).toBe(true);
    expect(isContractSignedOrCompleted("completed")).toBe(true);
    expect(isContractSignedOrCompleted("signing")).toBe(false);
    expect(formatContractStatusLabel("signed")).toBe("Assinado");
    expect(formatContractStatusLabel("completed")).toBe("Assinado");
    expect(formatContractStatusLabel("cancelled")).toBe("Cancelado");
  });

  it("extracts canonical bucket object paths from legacy signed URLs or relative keys", () => {
    expect(normalizeLegalDocumentStoragePath("store-1/contracts/doc.pdf")).toBe(
      "store-1/contracts/doc.pdf",
    );
    expect(normalizeLegalDocumentStoragePath("legal-documents/store-1/contracts/doc.pdf")).toBe(
      "store-1/contracts/doc.pdf",
    );
    expect(
      normalizeLegalDocumentStoragePath(
        "https://abc.supabase.co/storage/v1/object/sign/legal-documents/store-1/contracts/contrato%20final.pdf?token=xyz",
      ),
    ).toBe("store-1/contracts/contrato final.pdf");
    expect(isExternalHttpUrl("https://cdn.example.com/public.pdf")).toBe(true);
    expect(
      isExternalHttpUrl(
        "https://abc.supabase.co/storage/v1/object/sign/legal-documents/store-1/a.pdf?token=1",
      ),
    ).toBe(false);
  });

  it("builds reminder WhatsApp URL and E.164 normalization accurately", () => {
    expect(normalizeBrazilPhoneE164("(49) 99999-1234")).toBe("+5549999991234");
    const links = buildContractSigningUrls({
      signingToken: "tok_abc1234567890123",
      documentTitle: "Contrato Fornecimento",
      signerName: "Ana Paula Souza",
      signerPhone: "49999991234",
      isReminder: true,
    });
    expect(links.signingUrl).toBe("/assinar/tok_abc1234567890123");
    expect(links.manualWhatsappUrl).toContain("https://wa.me/5549999991234?text=");
    expect(decodeURIComponent(links.manualWhatsappUrl || "")).toContain("Lembrete:");
  });
});

describe("contract vault server authorization & tenant isolation boundary", () => {
  it("enforces store_id scoping and requireStaff across every folder and lifecycle BFF", async () => {
    const source = (
      await readFile(new URL("./contracts-vault.functions.ts", import.meta.url), "utf8")
    ).replace(/\r\n/g, "\n");

    const requiredFunctions = [
      "listContractFolders",
      "createContractFolder",
      "renameContractFolder",
      "deleteContractFolder",
      "moveContractToFolder",
      "resendContractEnvelope",
      "cancelContract",
      "listTeamSignatureStatuses",
    ];

    for (let i = 0; i < requiredFunctions.length; i += 1) {
      const fnName = requiredFunctions[i];
      const start = source.indexOf(`export const ${fnName}`);
      const nextFn = requiredFunctions[i + 1];
      const end = nextFn ? source.indexOf(`export const ${nextFn}`, start) : source.length;
      const block = source.slice(start, end);

      expect(start, `${fnName} must exist`).toBeGreaterThan(-1);
      expect(block, `${fnName} must call requireStaff`).toContain("await requireStaff()");
      expect(block, `${fnName} must scope by identity.store_id`).toContain("identity.store_id");
    }

    const cancelStart = source.indexOf("export const cancelContract");
    const cancelBlock = source.slice(
      cancelStart,
      source.indexOf("export const listTeamSignatureStatuses"),
    );
    expect(cancelBlock).toContain("assertContractCancellable(");
    expect(cancelBlock).toContain('action: "CANCELLED"');

    const resendStart = source.indexOf("export const resendContractEnvelope");
    const resendBlock = source.slice(resendStart, cancelStart);
    expect(resendBlock).toContain('envelope.status === "signed"');
    expect(resendBlock).toContain("whatsapp_channel_instances");
    expect(resendBlock).toContain("whatsapp_outbox");
    expect(resendBlock).toContain('action: "REMINDER_SENT"');
  });

  it("does not block contract creation or signing on kyc_verifications while enforcing facial biometrics when required", async () => {
    const contractsSource = (
      await readFile(new URL("./contracts.functions.ts", import.meta.url), "utf8")
    ).replace(/\r\n/g, "\n");
    expect(contractsSource).not.toContain("assertUserKycVerified");
    expect(contractsSource).toContain("if (envelope.require_facial_biometrics && !input.facialBiometricsHash && !input.faceImageUrl)");

    const signerRouteSource = (
      await readFile(new URL("../routes/assinar.$token.tsx", import.meta.url), "utf8")
    ).replace(/\r\n/g, "\n");
    expect(signerRouteSource).not.toContain("/api/upload-media");
    expect(signerRouteSource).toContain('crypto.subtle.digest("SHA-256"');
    expect(signerRouteSource).toContain("facialBiometricsHash: facialBiometricsHash || undefined");

    const vaultIndexSource = (
      await readFile(new URL("../routes/workspace.contratos.index.tsx", import.meta.url), "utf8")
    ).replace(/\r\n/g, "\n");
    expect(vaultIndexSource).toContain("const queryError = Boolean(loadError) || (isError && !initialContracts?.length);");
  });
});
