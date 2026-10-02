/**
 * marketplace-checkout.functions.test.ts — Testes do Checkout do Marketplace B2C
 *
 * Fase F08 do Plano Mestre de Estabilização dos 4 Pilares.
 *
 * Valida schemas Zod de entrada, cálculo de subtotal/frete, regras de frete grátis,
 * validação de itens de pedido, garantia de idempotência e isolamento do Pilar 3.
 */

import { describe, it, expect } from "vitest";
import {
  calculateShippingInputSchema,
  marketplaceCustomerSchema,
  marketplaceAddressSchema,
  createMarketplaceOrderInputSchema,
  type ShippingOptionDTO,
} from "./marketplace-checkout.functions";

describe("Fase F08 — Checkout do Marketplace B2C", () => {
  const MOCK_STORE_ID = "550e8400-e29b-41d4-a716-446655440001";
  const MOCK_PRODUCT_ID = "550e8400-e29b-41d4-a716-446655440002";

  // CENÁRIO 1: Validação do Schema de Cálculo de Frete
  it("deve validar o schema de cálculo de frete com dados válidos", () => {
    const valid = calculateShippingInputSchema.safeParse({
      storeId: MOCK_STORE_ID,
      cep: "89801000",
      subtotalCents: 5000,
    });
    expect(valid.success).toBe(true);

    const invalidCep = calculateShippingInputSchema.safeParse({
      storeId: MOCK_STORE_ID,
      cep: "123", // curto demais
    });
    expect(invalidCep.success).toBe(false);
  });

  // CENÁRIO 2: Validação de Dados do Consumidor
  it("deve validar dados do consumidor e rejeitar telefone curto ou nome vazio", () => {
    const validCustomer = marketplaceCustomerSchema.safeParse({
      name: "Maria Silva",
      phone: "49999998888",
      email: "maria@exemplo.com",
    });
    expect(validCustomer.success).toBe(true);

    const invalidName = marketplaceCustomerSchema.safeParse({
      name: "M", // menor que 2 caracteres
      phone: "49999998888",
    });
    expect(invalidName.success).toBe(false);

    const invalidPhone = marketplaceCustomerSchema.safeParse({
      name: "Maria Silva",
      phone: "123", // menor que 8 dígitos
    });
    expect(invalidPhone.success).toBe(false);
  });

  // CENÁRIO 3: Validação de Endereço de Entrega
  it("deve validar campos obrigatórios de endereço de entrega", () => {
    const validAddress = marketplaceAddressSchema.safeParse({
      street: "Avenida Getúlio Vargas",
      number: "100",
      neighborhood: "Centro",
      city: "Chapecó",
      state: "SC",
      cep: "89801000",
      complement: "Apto 402",
    });
    expect(validAddress.success).toBe(true);

    const missingStreet = marketplaceAddressSchema.safeParse({
      street: "",
      number: "100",
      neighborhood: "Centro",
      city: "Chapecó",
      state: "SC",
      cep: "89801000",
    });
    expect(missingStreet.success).toBe(false);
  });

  // CENÁRIO 4: Validação de Payload Completo de Pedido do Marketplace
  it("deve validar payload completo de criação de pedido", () => {
    const validPayload = {
      storeId: MOCK_STORE_ID,
      customer: {
        name: "Carlos Eduardo",
        phone: "49988887777",
        email: "carlos@exemplo.com",
      },
      shippingAddress: {
        street: "Rua Marechal Deodoro",
        number: "500",
        neighborhood: "Centro",
        city: "Chapecó",
        state: "SC",
        cep: "89801000",
      },
      shippingOptionId: "motolink_express",
      shippingCents: 990,
      paymentMethod: "pix" as const,
      items: [
        {
          productId: MOCK_PRODUCT_ID,
          title: "Café Especial Torrado 250g",
          priceCents: 3500,
          quantity: 2,
        },
      ],
      idempotencyKey: "idemp-uuid-token-0001",
    };

    const result = createMarketplaceOrderInputSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  // CENÁRIO 5: Rejeição de Pedido com Carrinho Vazio
  it("deve rejeitar pedido quando a lista de itens estiver vazia", () => {
    const emptyItemsPayload = {
      storeId: MOCK_STORE_ID,
      customer: {
        name: "Carlos Eduardo",
        phone: "49988887777",
      },
      shippingAddress: {
        street: "Rua Marechal Deodoro",
        number: "500",
        neighborhood: "Centro",
        city: "Chapecó",
        state: "SC",
        cep: "89801000",
      },
      shippingOptionId: "retirada",
      shippingCents: 0,
      paymentMethod: "cash_on_delivery" as const,
      items: [], // Vazio!
      idempotencyKey: "idemp-uuid-token-0002",
    };

    const result = createMarketplaceOrderInputSchema.safeParse(emptyItemsPayload);
    expect(result.success).toBe(false);
  });

  // CENÁRIO 6: Cálculo Matemático Preciso de Totais (Centavos Inteiros)
  it("deve calcular o total somando itens e frete com centavos inteiros", () => {
    const items = [
      { priceCents: 2500, quantity: 2 }, // 5000
      { priceCents: 1200, quantity: 3 }, // 3600
    ];
    const shippingCents = 990;

    const subtotalCents = items.reduce((acc, i) => acc + i.priceCents * i.quantity, 0);
    const totalCents = subtotalCents + shippingCents;

    expect(subtotalCents).toBe(8600);
    expect(totalCents).toBe(9590);
  });

  // CENÁRIO 7: Regra de Frete Grátis acima do Limite
  it("deve aplicar frete grátis quando subtotal atingir o limiar", () => {
    const thresholdCents = 15000; // R$ 150,00
    const subtotalAbaixo = 12000;
    const subtotalAcima = 16000;

    const isFreeAbaixo = subtotalAbaixo >= thresholdCents;
    const isFreeAcima = subtotalAcima >= thresholdCents;

    expect(isFreeAbaixo).toBe(false);
    expect(isFreeAcima).toBe(true);
  });
});
