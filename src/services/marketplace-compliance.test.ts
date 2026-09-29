import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  validateCnpj,
  formatCnpj,
} from "./marketplace-compliance.functions";
import {
  PlanTierEnum,
  MarketplaceComplianceStatusEnum,
  VerifiedAddressSchema,
  VerifiedSupportChannelSchema,
} from "@/types/marketplace-compliance";

describe("V141: Dual-Engine Architecture & Marketplace Governance", () => {
  describe("1. CNPJ Validator & Formatter Engine", () => {
    it("deve validar CNPJ real com dígitos verificadores corretos", () => {
      // CNPJ de teste padrão da Receita Federal (formato válido)
      expect(validateCnpj("11.222.333/0001-81")).toBe(true);
      expect(validateCnpj("11222333000181")).toBe(true);
      expect(validateCnpj("00.000.000/0001-91")).toBe(true); // Banco do Brasil
    });

    it("deve rejeitar CNPJs inválidos ou sequências repetidas", () => {
      expect(validateCnpj("11.111.111/1111-11")).toBe(false);
      expect(validateCnpj("00.000.000/0000-00")).toBe(false);
      expect(validateCnpj("12.345.678/0001-99")).toBe(false);
      expect(validateCnpj("")).toBe(false);
      expect(validateCnpj("123")).toBe(false);
    });

    it("deve formatar CNPJ corretamente com máscara canônica", () => {
      expect(formatCnpj("11222333000181")).toBe("11.222.333/0001-81");
      expect(formatCnpj("00000000000191")).toBe("00.000.000/0001-91");
    });
  });

  describe("2. Dual-Engine Plan Tiers & Compliance Schemas", () => {
    it("deve aceitar estritamente os tiers FREE_MVP e WAESY_MAX", () => {
      expect(PlanTierEnum.parse("FREE_MVP")).toBe("FREE_MVP");
      expect(PlanTierEnum.parse("WAESY_MAX")).toBe("WAESY_MAX");
      expect(() => PlanTierEnum.parse("ENTERPRISE")).toThrow();
    });

    it("deve aceitar os status normativos de conformidade PENDING, APPROVED e SUSPENDED", () => {
      expect(MarketplaceComplianceStatusEnum.parse("PENDING")).toBe("PENDING");
      expect(MarketplaceComplianceStatusEnum.parse("APPROVED")).toBe("APPROVED");
      expect(MarketplaceComplianceStatusEnum.parse("SUSPENDED")).toBe("SUSPENDED");
      expect(() => MarketplaceComplianceStatusEnum.parse("REJECTED_UNKNOWN")).toThrow();
    });

    it("deve validar endereço fiscal completo", () => {
      const validAddress = {
        street: "Avenida Getúlio Vargas",
        number: "1230",
        neighborhood: "Centro",
        city: "São Miguel do Oeste",
        state: "SC",
        zipCode: "89900-000",
        country: "BR",
      };
      const parsed = VerifiedAddressSchema.parse(validAddress);
      expect(parsed.city).toBe("São Miguel do Oeste");
      expect(parsed.state).toBe("SC");
    });

    it("deve validar canais de suporte obrigatórios da empresa", () => {
      const validSupport = {
        supportEmail: "atendimento@lojamodelo.com.br",
        supportPhone: "(49) 3622-0000",
        whatsappSac: "49999998888",
        operatingHours: "Seg-Sex 08h-18h",
      };
      const parsed = VerifiedSupportChannelSchema.parse(validSupport);
      expect(parsed.supportEmail).toBe("atendimento@lojamodelo.com.br");
    });
  });

  describe("3. Segregação Absoluta: Marketplace Verificado vs Classificados", () => {
    it("deve segregar anúncios classificados de produtos de marketplace oficial", () => {
      // Simulação da segregação em memória
      const mixedCatalog = [
        {
          id: "ad-1",
          type: "classified",
          title: "Bicicleta Caloi Usada",
          hasCnpj: false,
          isVerifiedStore: false,
          primaryCta: "WHATSAPP_CHAT",
        },
        {
          id: "prod-1",
          type: "marketplace_product",
          title: "Notebook Dell Inspiron Novo com NF",
          hasCnpj: true,
          cnpj: "11.222.333/0001-81",
          complianceStatus: "APPROVED",
          isVerifiedStore: true,
          primaryCta: "DIRECT_CHECKOUT",
        },
      ];

      // Filtro Marketplace Oficial: Somente itens verificados com CNPJ aprovado
      const verifiedMarketplaceItems = mixedCatalog.filter(
        (item) => item.type === "marketplace_product" && item.isVerifiedStore && item.complianceStatus === "APPROVED"
      );

      // Filtro Classificados: Acesso P2P livre, conversa direta
      const classifiedItems = mixedCatalog.filter((item) => item.type === "classified");

      expect(verifiedMarketplaceItems).toHaveLength(1);
      expect(verifiedMarketplaceItems[0].title).toContain("Notebook Dell");
      expect(verifiedMarketplaceItems[0].primaryCta).toBe("DIRECT_CHECKOUT");

      expect(classifiedItems).toHaveLength(1);
      expect(classifiedItems[0].title).toContain("Bicicleta Caloi");
      expect(classifiedItems[0].primaryCta).toBe("WHATSAPP_CHAT");
    });
  });
});
