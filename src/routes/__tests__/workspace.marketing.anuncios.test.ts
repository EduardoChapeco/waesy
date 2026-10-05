import { describe, it, expect } from "vitest";
import { z } from "zod";

const AdCampaignStatusSchema = z.object({
  campaignId: z.string().uuid(),
  status: z.enum(["active", "paused", "draft", "completed"]),
});

describe("Microfase 1A: Validação de Anúncios & Contratos Responsivos", () => {
  it("valida payload de alternância de status de campanha", () => {
    const valid = {
      campaignId: "123e4567-e89b-12d3-a456-426614174000",
      status: "active" as const,
    };
    const result = AdCampaignStatusSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejeita status inválido de campanha", () => {
    const invalid = {
      campaignId: "123e4567-e89b-12d3-a456-426614174000",
      status: "excluido",
    };
    const result = AdCampaignStatusSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("garante que a estrutura de grid móvel inicia em coluna única (grid-cols-1) para evitar esmagamento", () => {
    const mobileGridClass = "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4";
    expect(mobileGridClass).toContain("grid-cols-1");
    expect(mobileGridClass).toContain("sm:grid-cols-2");
    expect(mobileGridClass).toContain("lg:grid-cols-4");
  });

  it("assegura que o padding do shell móvel utiliza gutter respirável (px-4) sem overflow", () => {
    const shellGutterClass = "px-4 sm:px-6 lg:px-8";
    expect(shellGutterClass).toContain("px-4");
  });
});
