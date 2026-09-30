import { describe, it, expect, vi, beforeEach } from "vitest";
import { mapCartToDTO } from "./cart.functions";
import { mergeGuestCartLogic } from "./cart-helpers";

describe("Cart Lifecycle End-to-End & Integrity Suite", () => {
  describe("1. mapCartToDTO: Real Calculations, Stock & Options", () => {
    it("deve detectar esgotamento de estoque quando stock_on_hand for menor que a quantidade requisitada", async () => {
      const mockRawCart = {
        id: "cart-001",
        status: "active",
        store_id: "store-001",
        discount_cents: 0,
        shipping_cents: 0,
        coupon_code: null,
        cart_items: [
          {
            id: "ci-001",
            variant_id: "var-001",
            qty: 5,
            price_snapshot_cents: 1000,
            selected_options: {},
            product_variants: {
              sku: "SKU-001",
              price_override_cents: 1000,
              stock_on_hand: 2, // 2 disponíveis < 5 pedidos => Esgotado
              attributes: {},
              product: {
                id: "p-001",
                title: "Produto Exemplo",
                slug: "produto-exemplo",
                price_cents: 1000,
                compare_at_cents: null,
                product_media: [],
              },
            },
          },
          {
            id: "ci-002",
            variant_id: "var-002",
            qty: 1,
            price_snapshot_cents: 2000,
            selected_options: {},
            product_variants: {
              sku: "SKU-002",
              price_override_cents: 2000,
              stock_on_hand: 10, // 10 disponíveis >= 1 pedido => Em estoque
              attributes: {},
              product: {
                id: "p-002",
                title: "Produto Em Estoque",
                slug: "produto-em-estoque",
                price_cents: 2000,
                compare_at_cents: null,
                product_media: [],
              },
            },
          },
        ],
      };

      const dto = await mapCartToDTO(mockRawCart);

      expect(dto).toBeDefined();
      expect(dto.items).toHaveLength(2);
      expect(dto.items[0].isOutOfStock).toBe(true);
      expect(dto.items[1].isOutOfStock).toBe(false);
      expect(dto.subtotalCents).toBe(5 * 1000 + 1 * 2000);
      expect(dto.itemCount).toBe(6);
    });

    it("deve calcular subtotal, desconto percentual e total final com rigor aritmético", async () => {
      const mockRawCart = {
        id: "cart-002",
        status: "active",
        store_id: "store-001",
        discount_cents: 500, // R$ 5,00 de desconto
        shipping_cents: 1200, // R$ 12,00 de frete
        coupon_code: "PROMO5",
        cart_items: [
          {
            id: "ci-003",
            variant_id: "var-003",
            qty: 2,
            price_snapshot_cents: 3500, // R$ 35,00 cada
            selected_options: {},
            product_variants: {
              sku: "SKU-003",
              price_override_cents: 3500,
              stock_on_hand: 20,
              attributes: { Cor: "Azul" },
              product: {
                id: "p-003",
                title: "Camiseta Dry",
                slug: "camiseta-dry",
                price_cents: 3500,
                compare_at_cents: 4500,
                product_media: [{ url: "https://waesy.com/camiseta.jpg" }],
              },
            },
          },
        ],
      };

      const dto = await mapCartToDTO(mockRawCart);

      expect(dto.subtotalCents).toBe(7000); // 2 * 3500
      expect(dto.discountCents).toBe(500);
      expect(dto.shippingCents).toBe(1200);
      expect(dto.totalCents).toBe(7000 - 500 + 1200); // 7700
      expect(dto.itemCount).toBe(2);
      expect(dto.couponCode).toBe("PROMO5");
      expect(dto.items[0].variantAttributes).toEqual({ Cor: "Azul" });
      expect(dto.items[0].compareAtCents).toBe(4500);
    });

    it("deve mapear carrinho vazio sem crash e com contadores zerados", async () => {
      const mockEmptyCart = {
        id: "cart-empty",
        status: "active",
        store_id: "store-001",
        discount_cents: 0,
        shipping_cents: 0,
        coupon_code: null,
        cart_items: [],
      };

      const dto = await mapCartToDTO(mockEmptyCart);

      expect(dto.items).toEqual([]);
      expect(dto.subtotalCents).toBe(0);
      expect(dto.totalCents).toBe(0);
      expect(dto.itemCount).toBe(0);
      expect(dto.discountCents).toBe(0);
      expect(dto.shippingCents).toBe(0);
    });
  });

  describe("2. mergeGuestCartLogic: Sessão Anônima e Reivindicação de Carrinho", () => {
    it("deve retornar sucesso imediato quando não houver token de convidado", async () => {
      const result = await mergeGuestCartLogic("customer-123", undefined, null);
      expect(result).toEqual({ status: "success" });
    });
  });
});
