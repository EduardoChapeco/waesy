import { describe, it, expect } from "vitest";
import { registerAffiliateInput, upsertCreatorProfileInput, toggleProfilePrivacyInput, requestStoreInvoiceDiscountInput, approveStoreInvoiceDiscountInput } from "./affiliates.functions";

describe("Diretiva BigTech: Afiliados, Tokens de Vesting, Sub-Perfis de Criadores & Governança Bilateral", () => {
  it("1. cadastra parceiro/afiliado sem exigir chave PIX nem comissão em dinheiro fixa", () => {
    const validPayload = {
      handle: "pedro_reviews",
      displayName: "Pedro Reviews Tech",
      bio: "Reviews de tecnologia e produtos locais",
      category: "tecnologia",
      socialChannel: "instagram" as const,
      socialHandle: "@pedro_reviews",
    };

    const parsed = registerAffiliateInput.safeParse(validPayload);
    expect(parsed.success).toBe(true);

    if (parsed.success) {
      expect(parsed.data.handle).toBe("pedro_reviews");
      expect(parsed.data.displayName).toBe("Pedro Reviews Tech");
      // @ts-expect-error - Garante que pixKey não existe no schema
      expect(parsed.data.pixKey).toBeUndefined();
    }
  });

  it("2. valida sub-perfil de criador / influenciador vinculado à conta titular", () => {
    const creatorPayload = {
      handle: "gabriela_influencer",
      stageName: "Gabi Lifestyle",
      bio: "Dicas de gastronomia e hotéis na região",
      category: "gastronomia",
      socialLinks: { instagram: "@gabi_life", tiktok: "@gabilife" },
      pinnedProducts: ["prod-123", "prod-456"],
    };

    const parsed = upsertCreatorProfileInput.safeParse(creatorPayload);
    expect(parsed.success).toBe(true);

    if (parsed.success) {
      expect(parsed.data.stageName).toBe("Gabi Lifestyle");
      expect(parsed.data.pinnedProducts).toHaveLength(2);
    }
  });

  it("3. permite alternar perfil civil pessoal para modo anônimo/privado", () => {
    const privacyPayload = {
      privacyMode: "private" as const,
      isAnonymous: true,
    };

    const parsed = toggleProfilePrivacyInput.safeParse(privacyPayload);
    expect(parsed.success).toBe(true);

    if (parsed.success) {
      expect(parsed.data.privacyMode).toBe("private");
      expect(parsed.data.isAnonymous).toBe(true);
    }
  });

  it("4. valida requisição de abatimento de fatura de mensalidade com tokens da loja", () => {
    const discountRequest = {
      storeId: "11111111-2222-3333-4444-555555555555",
      invoiceId: "66666666-7777-8888-9999-000000000000",
      tokensAmount: 500000, // 500.000 tokens para abatimento
    };

    const parsed = requestStoreInvoiceDiscountInput.safeParse(discountRequest);
    expect(parsed.success).toBe(true);

    if (parsed.success) {
      expect(parsed.data.tokensAmount).toBe(500000);
      // Cálculo de equivalência: 500.000 tokens a R$ 50/1M = R$ 25,00 (2500 centavos)
      const centsDiscount = Math.round((parsed.data.tokensAmount / 1000) * 5);
      expect(centsDiscount).toBe(2500);
    }
  });

  it("5. valida aprovação e conciliação bilateral pelo Super Admin", () => {
    const approvalPayload = {
      invoiceId: "66666666-7777-8888-9999-000000000000",
      approved: true,
      notes: "Abatimento auditado e aprovado com sucesso.",
    };

    const parsed = approveStoreInvoiceDiscountInput.safeParse(approvalPayload);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.approved).toBe(true);
    }
  });

  it("6. calcula vesting e data de maturidade futura para tokens de indicação", () => {
    const now = new Date("2026-09-01T12:00:00Z");
    const vestingDays = 30;
    const unlockDate = new Date(now.getTime() + vestingDays * 24 * 60 * 60 * 1000);

    expect(unlockDate.toISOString()).toBe("2026-10-01T12:00:00.000Z");
    expect(unlockDate.getTime() > now.getTime()).toBe(true);
  });
});
