import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const extractor = fs.readFileSync(path.join(root, "src/services/travel-ai-extractor.functions.ts"), "utf8");
const checkout = fs.readFileSync(path.join(root, "src/components/tourism/studio/travel-proposal-checkout-modal.tsx"), "utf8");
const pipeline = fs.readFileSync(path.join(root, "src/services/travel-canonical-pipeline.functions.ts"), "utf8");

describe("Turismo — integridade de OCR, proposta e checkout W12", () => {
  it("mantém fallback de OCR sem preço, inclusões ou confiança inventados", () => {
    expect(extractor).toContain("price_cents: null");
    expect(extractor).toContain("installment_cents: null");
    expect(extractor).toContain("inclusions: []");
    expect(extractor).toContain("confidence_score: 0");
    expect(extractor).toContain("Nenhum resultado estruturado foi retornado pelo provider");
    expect(extractor).toContain("price_cents: extracted.price_cents ?? null");
  });

  it("não cria cobrança ou Pix com defaults comerciais artificiais", () => {
    expect(checkout).toContain("A proposta ainda não possui preço confirmado pela agência.");
    expect(checkout).not.toContain("mockPixCode");
    expect(checkout).not.toContain("278760");
    expect(checkout).toContain("paymentPreference");
    expect(checkout).toContain("cartao_operadora");
  });

  it("mantém OCR revisável e aplicação protegida por RPC/conflitos", () => {
    expect(pipeline).toContain('extraction_status: "needs_review"');
    expect(pipeline).toContain("apply_travel_ocr_to_draft");
    expect(pipeline).toContain("travel_document_conflicts");
    expect(pipeline).toContain("Aplicação bloqueada");
  });
});
