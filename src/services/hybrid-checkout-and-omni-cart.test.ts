import { describe, it, expect, vi, beforeEach } from "vitest";
import { isClassifiedConversational, getClassifiedPaymentMethods } from "@/lib/classifieds/semantics";
import { mapCartToDTO } from "./cart.functions";

describe("Master Prompt V140: Hybrid Checkout, Classifieds Bypass & Omni-Cart Matrix", () => {
  describe("Fase 1: Motor Omni-Cart & Array Transformation", () => {
    it("deve mapear os itens do carrinho contendo rigorosamente item_id, selected_variations e price_snapshot", async () => {
      const mockRawCart = {
        id: "cart-uuid-001",
        status: "active",
        store_id: "store-uuid-001",
        discount_cents: 0,
        shipping_cents: 1500,
        coupon_code: null,
        cart_items: [
          {
            id: "ci-001",
            variant_id: "var-001",
            qty: 2,
            price_snapshot_cents: 2500,
            selected_options: { molho: "barbecue", ponto: "ao_ponto" },
            product_variants: {
              sku: "HAMB-01",
              price_override_cents: 2500,
              stock_on_hand: 10,
              attributes: { sabor: "Artesanal" },
              product: {
                id: "prod-001",
                title: "Hambúrguer Artesanal",
                slug: "hamburguer-artesanal",
                price_cents: 2500,
                compare_at_cents: 3000,
                product_media: [{ url: "https://cdn.waesy.com/hamburguer.jpg" }],
              },
            },
          },
          {
            id: "ci-002",
            variant_id: "var-002",
            qty: 1,
            price_snapshot_cents: 1200,
            selected_options: {},
            product_variants: {
              sku: "BAT-01",
              price_override_cents: 1200,
              stock_on_hand: 50,
              attributes: { tamanho: "Grande" },
              product: {
                id: "prod-002",
                title: "Batata Frita Rústica",
                slug: "batata-frita-rustica",
                price_cents: 1200,
                compare_at_cents: null,
                product_media: [{ url: "https://cdn.waesy.com/batata.jpg" }],
              },
            },
          },
        ],
      };

      const dto = await mapCartToDTO(mockRawCart);

      expect(dto).toBeDefined();
      expect(Array.isArray(dto.items)).toBe(true);
      expect(dto.items).toHaveLength(2);

      // Validação do Item 1
      const item1 = dto.items[0];
      expect(item1.id).toBe("ci-001");
      expect(item1.item_id).toBe("var-001");
      expect(item1.variantId).toBe("var-001");
      expect(item1.qty).toBe(2);
      expect(item1.price_snapshot).toBe(2500);
      expect(item1.priceCents).toBe(2500);
      expect(item1.selected_variations).toEqual({ molho: "barbecue", ponto: "ao_ponto" });
      expect(item1.lineTotalCents).toBe(5000);

      // Validação do Item 2
      const item2 = dto.items[1];
      expect(item2.id).toBe("ci-002");
      expect(item2.item_id).toBe("var-002");
      expect(item2.qty).toBe(1);
      expect(item2.price_snapshot).toBe(1200);
      expect(item2.lineTotalCents).toBe(1200);

      // Totais calculados sobre o array sem bugs
      expect(dto.subtotalCents).toBe(6200);
      expect(dto.totalCents).toBe(6200 + 1500);
      expect(dto.itemCount).toBe(3);
    });
  });

  describe("Fase 2: The Classifieds Bypass (O Funil Conversacional)", () => {
    it("deve bifurcar estritamente para conversacional em anúncios C2C, veículos, serviços e imóveis", () => {
      // 1. Desapego Particular / C2C
      const classifiedC2C = {
        id: "ad-001",
        title: "Bicicleta Caloi Aro 29 Usada",
        ad_type: "classified",
        category: "sale",
        price_cents: 85000,
      };
      expect(isClassifiedConversational(classifiedC2C)).toBe(true);

      // 2. Serviço Autônomo
      const serviceAd = {
        id: "ad-002",
        title: "Pintura Residencial e Textura",
        ad_type: "service",
        category: "service",
      };
      expect(isClassifiedConversational(serviceAd)).toBe(true);

      // 3. Imóvel Residencial
      const realEstateAd = {
        id: "ad-003",
        title: "Apartamento 2 Quartos Centro",
        category: "real_estate",
        attributes: { property_type: "apartamento" },
      };
      expect(isClassifiedConversational(realEstateAd)).toBe(true);

      // 4. Veículo
      const vehicleAd = {
        id: "ad-004",
        title: "Honda Civic 2021 Touring",
        category: "vehicle",
      };
      expect(isClassifiedConversational(vehicleAd)).toBe(true);
    });

    it("deve classificar como transacional (carrinho) produtos físicos de lojas e-commerce", () => {
      const ecommerceProduct = {
        id: "prod-100",
        title: "Tênis Esportivo Running",
        ad_type: "product",
        is_store_item: true,
      };
      expect(isClassifiedConversational(ecommerceProduct)).toBe(false);

      const storeCatalogItem = {
        id: "prod-101",
        title: "Camiseta Algodão Egípcio",
        ad_type: "ecommerce",
      };
      expect(isClassifiedConversational(storeCatalogItem)).toBe(false);
    });
  });

  describe("Fase 3: Parametrização de Pagamento (Informativo vs. Transacional)", () => {
    it("deve marcar formas de pagamento aceitas em classificados como is_informative_only = true", () => {
      const mockClassified = {
        id: "ad-200",
        title: "Sofá Retrátil 3 Lugares",
        accepts_pix: true,
        accepts_cash: true,
        attributes: {
          accepts_pix: true,
          accepts_cash: true,
          accepts_card: true,
          max_installments: 3,
          accepts_trade: true,
        },
      };

      const paymentMethods = getClassifiedPaymentMethods(mockClassified);

      expect(paymentMethods.length).toBeGreaterThanOrEqual(3);

      paymentMethods.forEach((method) => {
        expect(method.is_informative_only).toBe(true);
      });

      const pixMethod = paymentMethods.find((m) => m.id === "pix");
      expect(pixMethod).toBeDefined();
      expect(pixMethod?.label).toContain("Pix");
      expect(pixMethod?.is_informative_only).toBe(true);

      const cashMethod = paymentMethods.find((m) => m.id === "cash");
      expect(cashMethod).toBeDefined();
      expect(cashMethod?.label).toContain("Dinheiro");
      expect(cashMethod?.is_informative_only).toBe(true);
    });
  });
});
