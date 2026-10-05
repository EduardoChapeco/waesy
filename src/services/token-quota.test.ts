import { describe, it, expect } from "vitest";
import {
  DAILY_FREE_CIVIL_TOKENS,
  TOKEN_COST_TABLE,
  CheckQuotaSchema,
  ConsumeTokensSchema,
} from "./token-quota.functions";

describe("Token Quota Engine (Épico 4 / REQ-TOK-01 a REQ-TOK-06)", () => {
  it("deve provisionar 100.000 tokens como cota diária gratuita padrão para usuários civis", () => {
    expect(DAILY_FREE_CIVIL_TOKENS).toBe(100_000);
  });

  it("deve isentar integralmente (0 tokens) busca comercial de lojas e leitura de notícias", () => {
    expect(TOKEN_COST_TABLE.commercial_search.tokens).toBe(0);
    expect(TOKEN_COST_TABLE.commercial_search.isFree).toBe(true);

    expect(TOKEN_COST_TABLE.news_reading.tokens).toBe(0);
    expect(TOKEN_COST_TABLE.news_reading.isFree).toBe(true);

    expect(TOKEN_COST_TABLE.feed_browsing.tokens).toBe(0);
    expect(TOKEN_COST_TABLE.feed_browsing.isFree).toBe(true);
  });

  it("deve calibrar custos em escala de milhares para mineração CNPJ, documentos e sites", () => {
    expect(TOKEN_COST_TABLE.copilot_chat_turn.tokens).toBe(1_000);
    expect(TOKEN_COST_TABLE.cnpj_mining_batch.tokens).toBe(25_000);
    expect(TOKEN_COST_TABLE.doc_generation_pdf.tokens).toBe(75_000);
    expect(TOKEN_COST_TABLE.doc_generation_sheet.tokens).toBe(75_000);
    expect(TOKEN_COST_TABLE.doc_generation_presentation.tokens).toBe(90_000);
    expect(TOKEN_COST_TABLE.site_generation_full.tokens).toBe(250_000);
  });

  it("deve validar schemas de verificação e consumo corretamente", () => {
    const validCheck = CheckQuotaSchema.safeParse({ operation: "cnpj_mining_batch" });
    expect(validCheck.success).toBe(true);

    const validConsume = ConsumeTokensSchema.safeParse({
      operation: "site_generation_full",
      metadata: { siteId: "test-site-123" },
    });
    expect(validConsume.success).toBe(true);

    const invalidConsume = ConsumeTokensSchema.safeParse({
      operation: "doc_generation_pdf",
      customTokenAmount: -50,
    });
    expect(invalidConsume.success).toBe(false);
  });
});
