/**
 * travel-wooba-and-vault.test.ts
 * Suíte de Testes de Regressão: Conector Wooba Travellink, Cofre de Cartão Zero-Leakage e Ferramentas Blis.ai
 */

import { describe, it, expect } from "vitest";
import {
  validateLuhn,
  detectCardBrand,
} from "./travel-credit-vault.functions";
import {
  calculateNormalizedPricing,
} from "./travel-supply-orchestrator.service";
import {
  WoobaCredentialsSchema,
} from "./travel-wooba-connector.service";

describe("Travel Security: Cofre de Cartão Server-Side (Zero-Leakage)", () => {
  it("deve validar cartões legítimos via algoritmo de Luhn", () => {
    // Cartões de teste padrão Luhn-compliant
    expect(validateLuhn("4532015112830366")).toBe(true); // Visa
    expect(validateLuhn("5555555555554444")).toBe(true); // Mastercard
  });

  it("deve rejeitar cartões inválidos com falha no checksum Luhn", () => {
    expect(validateLuhn("4532015112830367")).toBe(false);
    expect(validateLuhn("1234567890123456")).toBe(false);
    expect(validateLuhn("")).toBe(false);
    expect(validateLuhn("123")).toBe(false);
  });

  it("deve identificar bandeiras canônicas corretamente", () => {
    expect(detectCardBrand("4000123456789010")).toBe("visa");
    expect(detectCardBrand("5105105105105100")).toBe("mastercard");
    expect(detectCardBrand("340012345678901")).toBe("amex");
    expect(detectCardBrand("5067123456789012")).toBe("elo");
    expect(detectCardBrand("6062821234567890")).toBe("hipercard");
    expect(detectCardBrand("9999123456789012")).toBe("unknown");
  });
});

describe("Wooba Travellink: Segregação Estrita de Margens & Pricing", () => {
  it("deve calcular o preço de venda somando líquido, taxas, markup e taxa fixa", () => {
    const pricing = calculateNormalizedPricing({
      netAmountCents: 100000, // R$ 1.000,00
      taxAmountCents: 7500,   // R$ 75,00 taxa de embarque
      supplierFeeCents: 1500, // R$ 15,00 taxa do fornecedor
      agencyMarkupPercent: 10,// 10% de R$ 1.000 = R$ 100,00
      agencyFixedFeeCents: 3500, // R$ 35,00 taxa de emissão
      currency: "BRL",
    });

    expect(pricing.net_amount_cents).toBe(100000);
    expect(pricing.tax_amount_cents).toBe(7500);
    expect(pricing.supplier_fee_cents).toBe(1500);
    expect(pricing.agency_markup_cents).toBe(10000); // 10%
    expect(pricing.service_fee_cents).toBe(3500);
    // 100000 + 7500 + 1500 + 10000 + 3500 = 122500 (R$ 1.225,00)
    expect(pricing.selling_total_cents).toBe(122500);
  });

  it("deve validar schema de credenciais Wooba", () => {
    const valid = {
      agency_code: "AG123",
      username: "excelenciatour",
      password: "secret_password",
      environment: "production",
      default_markup_percent: 12,
      default_fixed_fee_cents: 4000,
    };

    const parsed = WoobaCredentialsSchema.parse(valid);
    expect(parsed.agency_code).toBe("AG123");
    expect(parsed.default_markup_percent).toBe(12);
  });

  it("deve falhar se credenciais Wooba estiverem vazias", () => {
    expect(() =>
      WoobaCredentialsSchema.parse({
        agency_code: "",
        username: "",
        password: "",
      })
    ).toThrow();
  });
});
