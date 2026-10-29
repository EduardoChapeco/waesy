import { describe, it, expect } from "vitest";
import {
  calculateHaversineDistanceMeters,
  normalizeAddressString,
  scoreGeoProximity,
  scoreAddressText,
  scoreCustomerName,
  scoreTemporalChat,
  scoreNotesAndItems,
  calculateOrderReconciliationScore,
  rankOrderReconciliations,
} from "../../lib/reconciliation-engine";
import type {
  IFoodOrderDetails,
  ReconciliationCandidate,
} from "../../lib/ifood-merchant.types";

describe("iFood & Omnichannel Reconciliation Engine", () => {
  describe("Geodesic Distance (Haversine)", () => {
    it("deve calcular 0 metros para as mesmas coordenadas", () => {
      const d = calculateHaversineDistanceMeters(-26.7258, -53.5186, -26.7258, -53.5186);
      expect(Math.round(d)).toBe(0);
    });

    it("deve calcular distância correta de ~30 metros entre dois pontos próximos", () => {
      // Pequeno deslocamento na mesma quadra
      const d = calculateHaversineDistanceMeters(-26.72580, -53.51860, -26.72605, -53.51860);
      expect(d).toBeGreaterThan(20);
      expect(d).toBeLessThan(40);
    });

    it("atribui pontuação máxima (35) para distâncias <= 50 metros", () => {
      const result = scoreGeoProximity(
        { latitude: -26.7258, longitude: -53.5186 },
        { lat: -26.7259, lng: -53.5186 },
      );
      expect(result.score).toBe(35);
      expect(result.reason).toContain("Geolocalização altamente precisa");
    });

    it("atribui pontuação 25 para distâncias entre 50 e 150 metros", () => {
      const result = scoreGeoProximity(
        { latitude: -26.7258, longitude: -53.5186 },
        { lat: -26.7267, lng: -53.5186 },
      );
      expect(result.score).toBe(25);
    });

    it("atribui 0 pontos para distâncias distantes (> 500m)", () => {
      const result = scoreGeoProximity(
        { latitude: -26.7258, longitude: -53.5186 },
        { lat: -26.7400, lng: -53.5300 },
      );
      expect(result.score).toBe(0);
    });
  });

  describe("Address Normalization & Matching", () => {
    it("normaliza abreviações de logradouros e remove acentuação", () => {
      expect(normalizeAddressString("R. Duque de Caxias, nº 123 - Centro")).toBe(
        "rua duque de caxias n 123 centro",
      );
      expect(normalizeAddressString("Av. Brasil, Apto 402")).toBe(
        "avenida brasil apto 402",
      );
    });

    it("atribui pontuação de número e logradouro coincidente", () => {
      const orderAddr = {
        streetName: "Rua Almirante Tamandaré",
        streetNumber: "450",
        neighborhood: "Centro",
        city: "São Miguel do Oeste",
        state: "SC",
        postalCode: "89870-000",
      };
      const candidateAddr = {
        street: "R. Almirante Tamandaré",
        number: "450",
        city: "São Miguel do Oeste",
        state: "SC",
        zipcode: "89870000",
      };

      const result = scoreAddressText(orderAddr, candidateAddr);
      expect(result.score).toBe(25); // 15 (número) + 7 (logradouro) + 3 (CEP)
      expect(result.reasons).toContain("Número residencial idêntico (#450)");
      expect(result.reasons).toContain("CEP convergente");
    });
  });

  describe("Customer Name Fuzzy Matching", () => {
    it("atribui 20 pontos para primeiro nome e sobrenome coincidentes", () => {
      const result = scoreCustomerName("Carlos Eduardo da Silva", "Carlos Silva");
      expect(result.score).toBe(20);
      expect(result.reason).toContain("Nome e sobrenome coincidentes");
    });

    it("atribui 10 pontos quando apenas o primeiro nome coincide", () => {
      const result = scoreCustomerName("Carlos Alberto Ferreira", "Carlos Mendes");
      expect(result.score).toBe(10);
    });

    it("atribui 0 pontos para nomes completamente divergentes", () => {
      const result = scoreCustomerName("Mariana Costa", "Roberto Almeida");
      expect(result.score).toBe(0);
    });
  });

  describe("Temporal Chat Matching", () => {
    it("atribui 15 pontos se o cliente interagiu no chat há 10 minutos do pedido", () => {
      const orderTime = "2026-10-29T19:30:00Z";
      const recentChat = [
        { text: "Boa noite, vocês ainda têm pizza de calabresa?", createdAt: "2026-10-29T19:20:00Z" },
      ];

      const result = scoreTemporalChat(orderTime, recentChat);
      expect(result.score).toBe(15);
      expect(result.reason).toContain("há menos de 30 min");
    });

    it("atribui 8 pontos se a interação ocorreu há 1 hora", () => {
      const orderTime = "2026-10-29T20:00:00Z";
      const recentChat = [
        { text: "Qual o valor da entrega para o centro?", createdAt: "2026-10-29T19:00:00Z" },
      ];

      const result = scoreTemporalChat(orderTime, recentChat);
      expect(result.score).toBe(8);
    });

    it("atribui 0 pontos se não há chat recente ou superior a 2 horas", () => {
      const orderTime = "2026-10-29T20:00:00Z";
      const recentChat = [
        { text: "Mensagem de ontem", createdAt: "2026-10-28T12:00:00Z" },
      ];

      const result = scoreTemporalChat(orderTime, recentChat);
      expect(result.score).toBe(0);
    });
  });

  describe("Notes and Items Correlation", () => {
    it("identifica correlação quando produto discutido no chat aparece nos itens", () => {
      const mockOrder: IFoodOrderDetails = {
        id: "ifood-order-123",
        createdAt: "2026-10-29T19:30:00Z",
        orderType: "DELIVERY",
        orderTiming: "INSTANT",
        customer: { name: "Lucas Pereira" },
        delivery: {
          deliveryAddress: { streetName: "Rua Santos Dumont", streetNumber: "100", neighborhood: "Centro", city: "SMO", state: "SC", postalCode: "89870000" },
          deliveryBy: "MERCHANT",
        },
        items: [
          { id: "item-1", name: "Hambúrguer Artesanal Smash Duplo", quantity: 1, unitPrice: 38, totalPrice: 38 },
        ],
        total: { subTotal: 38, deliveryFee: 5, benefits: 0, orderAmount: 43 },
        extraInfo: "Sem cebola por favor, tocar interfone 302",
      };

      const chat = [
        { text: "Vocês fazem o hambúrguer artesanal smash duplo sem cebola?", createdAt: "2026-10-29T19:25:00Z" },
      ];

      const result = scoreNotesAndItems(mockOrder, chat);
      expect(result.score).toBe(5);
    });
  });

  describe("Full Composite Multi-Layer Matching", () => {
    it("classifica como HIGH_CONFIDENCE (score >= 80) quando nome, geoespacial, endereço e chat coincidem", () => {
      const order: IFoodOrderDetails = {
        id: "ord-999",
        displayId: "999",
        orderType: "DELIVERY",
        orderTiming: "INSTANT",
        createdAt: "2026-10-29T19:40:00Z",
        customer: { name: "Gabriel Siqueira" },
        delivery: {
          deliveryAddress: {
            streetName: "Rua Marcílio Dias",
            streetNumber: "88",
            neighborhood: "Centro",
            city: "São Miguel do Oeste",
            state: "SC",
            postalCode: "89870-000",
            coordinates: { latitude: -26.7265, longitude: -53.5190 },
          },
          deliveryBy: "MERCHANT",
        },
        items: [{ id: "i1", name: "Combo X-Salada", quantity: 2, unitPrice: 30, totalPrice: 60 }],
        total: { subTotal: 60, deliveryFee: 0, benefits: 0, orderAmount: 60 },
        extraInfo: "Apartamento 401",
      };

      const candidate: ReconciliationCandidate = {
        customerId: "cust-uuid-1",
        customerName: "Gabriel Siqueira Rocha",
        chatConversationId: "chat-uuid-1",
        address: {
          street: "Rua Marcílio Dias",
          number: "88",
          city: "São Miguel do Oeste",
          state: "SC",
          zipcode: "89870-000",
          coordinates: { lat: -26.72652, lng: -53.51901 },
        },
        recentChatActivity: [
          { text: "Olá! Acabei de pedir o Combo X-Salada pelo iFood para o apartamento 401", createdAt: "2026-10-29T19:38:00Z" },
        ],
      };

      const result = calculateOrderReconciliationScore(order, candidate);

      // 35 (Geo) + 25 (Endereço) + 20 (Nome) + 15 (Chat recente) + 5 (Itens/Apto) = 100
      expect(result.score).toBe(100);
      expect(result.confidence).toBe("HIGH_CONFIDENCE");
      expect(result.matchedReasons.length).toBeGreaterThanOrEqual(4);
    });

    it("classifica como PROBABLE_MATCH (50 a 79) quando endereço e nome coincidem mas não houve chat", () => {
      const order: IFoodOrderDetails = {
        id: "ord-888",
        orderType: "DELIVERY",
        orderTiming: "INSTANT",
        createdAt: "2026-10-29T19:40:00Z",
        customer: { name: "Fernanda Lima" },
        delivery: {
          deliveryAddress: {
            streetName: "Avenida Getúlio Vargas",
            streetNumber: "1500",
            neighborhood: "Centro",
            city: "São Miguel do Oeste",
            state: "SC",
            postalCode: "89870-000",
            coordinates: { latitude: -26.7300, longitude: -53.5200 },
          },
          deliveryBy: "MERCHANT",
        },
        items: [],
        total: { subTotal: 50, deliveryFee: 5, benefits: 0, orderAmount: 55 },
      };

      const candidate: ReconciliationCandidate = {
        customerId: "cust-uuid-2",
        customerName: "Fernanda Lima",
        address: {
          street: "Av. Getúlio Vargas",
          number: "1500",
          coordinates: { lat: -26.7308, lng: -53.5205 }, // ~100m
        },
        recentChatActivity: [], // Sem chat prévio
      };

      const result = calculateOrderReconciliationScore(order, candidate);

      // 25 (Geo) + 22 (Endereço) + 20 (Nome) = 67
      expect(result.score).toBeGreaterThanOrEqual(50);
      expect(result.score).toBeLessThan(80);
      expect(result.confidence).toBe("PROBABLE_MATCH");
    });

    it("classifica como LOW_CONFIDENCE e rankOrderReconciliations ordena corretamente candidatos", () => {
      const order: IFoodOrderDetails = {
        id: "ord-777",
        orderType: "DELIVERY",
        orderTiming: "INSTANT",
        createdAt: "2026-10-29T19:40:00Z",
        customer: { name: "Marcos Vinicius" },
        delivery: {
          deliveryAddress: {
            streetName: "Rua Florianópolis",
            streetNumber: "50",
            neighborhood: "Agostini",
            city: "São Miguel do Oeste",
            state: "SC",
            postalCode: "89870-000",
          },
          deliveryBy: "MERCHANT",
        },
        items: [],
        total: { subTotal: 30, deliveryFee: 0, benefits: 0, orderAmount: 30 },
      };

      const candidate1: ReconciliationCandidate = {
        customerId: "c1",
        customerName: "Joana Dark",
        address: { street: "Outra Rua", number: "99" },
      };

      const candidate2: ReconciliationCandidate = {
        customerId: "c2",
        customerName: "Marcos Vinicius Souza",
        address: { street: "Rua Florianópolis", number: "50" },
      };

      const ranked = rankOrderReconciliations(order, [candidate1, candidate2]);
      expect(ranked[0].candidate.customerId).toBe("c2");
      expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
      expect(ranked[1].confidence).toBe("LOW_CONFIDENCE");
    });
  });
});
