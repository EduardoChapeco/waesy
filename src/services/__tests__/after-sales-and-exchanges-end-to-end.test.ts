import { describe, it, expect } from "vitest";
import {
  getCommercialStatusInfo,
  getCommercialTypeLabel,
  parseCustomerSafeNotes,
  parseRmaForensics,
  formatForensicNotes,
  CreateCustomerAfterSalesSchema,
  CancelCustomerAfterSalesSchema,
} from "../rma.functions";

describe("After-Sales, Exchanges & Returns (Trocas e Devoluções) - End-to-End Suite", () => {
  describe("EARS-01: Commercial Status Mapping (Zero Internal Jargon)", () => {
    it("maps all lifecycle statuses to 100% customer-friendly commercial copy", () => {
      const pending = getCommercialStatusInfo("pending");
      expect(pending.label).toBe("Aguardando Análise da Loja");
      expect(pending.step).toBe(1);
      expect(pending.description).toContain("analisando");

      const authorized = getCommercialStatusInfo("authorized");
      expect(authorized.label).toBe("Devolução Aprovada • Envie o Produto");
      expect(authorized.step).toBe(2);
      expect(authorized.description).toContain("código de postagem");

      const shipped = getCommercialStatusInfo("shipped_back");
      expect(shipped.label).toBe("Produto a Caminho da Loja");
      expect(shipped.step).toBe(2);

      const received = getCommercialStatusInfo("received");
      expect(received.label).toBe("Produto Recebido pela Loja");
      expect(received.step).toBe(3);

      const inspected = getCommercialStatusInfo("inspected");
      expect(inspected.label).toBe("Em Avaliação Técnica");
      expect(inspected.step).toBe(3);

      const resolved = getCommercialStatusInfo("resolved");
      expect(resolved.label).toBe("Solicitação Concluída");
      expect(resolved.step).toBe(4);

      const rejected = getCommercialStatusInfo("rejected");
      expect(rejected.label).toBe("Solicitação Não Aprovada");
      expect(rejected.step).toBe(4);

      const cancelled = getCommercialStatusInfo("cancelled");
      expect(cancelled.label).toBe("Solicitação Cancelada");
      expect(cancelled.step).toBe(4);
    });

    it("maps commercial type labels correctly", () => {
      expect(getCommercialTypeLabel("return")).toBe("Devolução e Reembolso");
      expect(getCommercialTypeLabel("exchange")).toBe("Troca de Produto");
      expect(getCommercialTypeLabel("warranty")).toBe("Acionamento de Garantia");
    });

    it("falls back gracefully for unknown legacy status without throwing", () => {
      const unknown = getCommercialStatusInfo("custom_legacy_status");
      expect(unknown.label).toBe("Em Andamento");
      expect(unknown.step).toBe(1);
      expect(unknown.description).toBeDefined();
    });
  });

  describe("EARS-04: Zero-Leaking of Internal Notes & Forensic Reports", () => {
    it("strips [LAUDO_PERICIAL] and store internal notes from customer-facing text", () => {
      const dirtyNotes = `Tamanho veio errado, solicito troca pelo G.
[LAUDO_PERICIAL] Status: rejected | Risco: ALTO
Observação interna confidencial do lojista: Cliente reincidente em devoluções com indícios de uso prévio.`;

      const safe = parseCustomerSafeNotes(dirtyNotes);
      expect(safe.cleanNotes).toBe("Tamanho veio errado, solicito troca pelo G.");
      expect(safe.cleanNotes).not.toContain("[LAUDO_PERICIAL]");
      expect(safe.cleanNotes).not.toContain("Cliente reincidente");
      expect(safe.cleanNotes).not.toContain("Risco: ALTO");
    });

    it("extracts and strips [CLAIM_PHOTO] tag while preserving original customer complaint", () => {
      const notesWithPhoto = `Produto veio com zíper emperrado e descosturado.
[CLAIM_PHOTO: https://storage.waesy.com/evidence/img123.jpg]`;

      const safe = parseCustomerSafeNotes(notesWithPhoto);
      expect(safe.cleanNotes).toBe("Produto veio com zíper emperrado e descosturado.");
      expect(safe.claimPhotoUrl).toBe("https://storage.waesy.com/evidence/img123.jpg");
      expect(safe.cleanNotes).not.toContain("[CLAIM_PHOTO");
    });

    it("preserves full forensic details when parsed for Store Workspace staff", () => {
      const compositeNotes = `Veio quebrado.
[CLAIM_PHOTO: https://storage.waesy.com/evidence/img456.jpg]
[LAUDO_PERICIAL] Status: verified | Risco: BAIXO`;

      const staffView = parseRmaForensics(compositeNotes);
      expect(staffView.cleanNotes).toBe("Veio quebrado.");
      expect(staffView.claimPhotoUrl).toBe("https://storage.waesy.com/evidence/img456.jpg");
      expect(staffView.forensicStatus).toBe("verified");
      expect(staffView.forensicRisk).toBe("BAIXO");
      expect(staffView.isAiFlagged).toBe(false);
    });

    it("detects AI flagged conditions in forensic parser", () => {
      const flaggedNotes = `Devolução.
[LAUDO_PERICIAL] Status: suspect | Risco: MEDIO`;

      const staffView = parseRmaForensics(flaggedNotes);
      expect(staffView.isAiFlagged).toBe(true);
      expect(staffView.forensicStatus).toBe("suspect");
    });

    it("formats forensic notes properly when saved by workspace", () => {
      const formatted = formatForensicNotes({
        customerNotes: "Produto não serviu",
        claimPhotoUrl: "https://storage.waesy.com/img.jpg",
        forensicStatus: "verified",
        forensicRisk: "BAIXO",
        internalStaffNotes: "Inspecionado pela equipe de qualidade - lacre intacto",
      });

      expect(formatted).toContain("Produto não serviu");
      expect(formatted).toContain("[CLAIM_PHOTO: https://storage.waesy.com/img.jpg]");
      expect(formatted).toContain("[LAUDO_PERICIAL] Status: verified | Risco: BAIXO");
      expect(formatted).toContain("Inspecionado pela equipe de qualidade");

      // Verify that when passed through customer-safe parser, internal staff notes are hidden
      const customerSafe = parseCustomerSafeNotes(formatted);
      expect(customerSafe.cleanNotes).toBe("Produto não serviu");
      expect(customerSafe.cleanNotes).not.toContain("Inspecionado pela equipe de qualidade");
      expect(customerSafe.cleanNotes).not.toContain("[LAUDO_PERICIAL]");
    });
  });

  describe("EARS-02 & EARS-03: Input Validation & Business Rules", () => {
    it("validates valid customer after-sales request payload", () => {
      const validPayload = {
        orderId: "11111111-2222-3333-4444-555555555555",
        type: "exchange" as const,
        reason: "Tamanho ou modelo incompatível",
        notes: "Gostaria de trocar a camiseta tamanho M pelo tamanho G na cor preta.",
        items: [
          {
            orderItemId: "aaaa1111-2222-3333-4444-555555555555",
            qty: 1,
            reason: "Tamanho incorreto",
          },
        ],
      };

      const result = CreateCustomerAfterSalesSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
    });

    it("rejects payload without orderId or with empty items array", () => {
      const invalidNoItems = {
        orderId: "11111111-2222-3333-4444-555555555555",
        type: "return",
        reason: "Arrependimento de compra",
        items: [],
      };

      const result = CreateCustomerAfterSalesSchema.safeParse(invalidNoItems);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors.some((e) => e.path.includes("items"))).toBe(true);
      }
    });

    it("rejects item with zero or negative quantity", () => {
      const invalidQty = {
        orderId: "11111111-2222-3333-4444-555555555555",
        type: "return",
        reason: "Arrependimento",
        items: [
          {
            orderItemId: "aaaa1111-2222-3333-4444-555555555555",
            qty: 0,
          },
        ],
      };

      const result = CreateCustomerAfterSalesSchema.safeParse(invalidQty);
      expect(result.success).toBe(false);
    });

    it("validates request cancellation schema", () => {
      const validCancel = {
        requestId: "11111111-2222-3333-4444-555555555555",
        cancelReason: "Decidi ficar com o produto",
      };

      const result = CancelCustomerAfterSalesSchema.safeParse(validCancel);
      expect(result.success).toBe(true);

      const invalidCancel = {
        requestId: "invalid-uuid",
      };
      expect(CancelCustomerAfterSalesSchema.safeParse(invalidCancel).success).toBe(false);
    });
  });
});
