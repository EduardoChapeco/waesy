import { describe, it, expect } from "vitest";
import {
  createSubpanelOrderSchema,
  upsertEventSurveySchema,
  submitSurveyResponseSchema,
  createEventSubpanelSchema,
} from "./events.functions";

describe("Event Recursive Subpanels & Surveys Contract Tests", () => {
  describe("createEventSubpanelSchema", () => {
    it("valida subpainel com parâmetros fiscais e taxas de concessão canônicas", () => {
      const payload = {
        eventId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        name: "Bar Central e Bebidas",
        panelType: "bar" as const,
        managerName: "Carlos Operador",
        managerContact: "(49) 99999-0000",
        concessionPercentage: 12.5,
        concessionFixedCents: 15000,
        allowOnlineOrders: true,
      };

      const result = createEventSubpanelSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.concessionPercentage).toBe(12.5);
        expect(result.data.concessionFixedCents).toBe(15000);
        expect(result.data.allowOnlineOrders).toBe(true);
      }
    });

    it("aplica valores padrão quando parâmetros opcionais são omitidos", () => {
      const payload = {
        eventId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        name: "Truck Hambúrguer Artesanal",
      };

      const result = createEventSubpanelSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.panelType).toBe("bar");
        expect(result.data.concessionPercentage).toBe(10);
        expect(result.data.concessionFixedCents).toBe(0);
        expect(result.data.allowOnlineOrders).toBe(true);
      }
    });
  });

  describe("createSubpanelOrderSchema & Concession Math", () => {
    it("valida payload de pedido com múltiplos itens e cálculo de comissão de concessão", () => {
      const payload = {
        token: "tok_test_concession_123",
        customerName: "Mariana Silva",
        customerPhone: "(49) 98888-7777",
        paymentMethod: "pix" as const,
        orderType: "counter_pos" as const,
        items: [
          {
            productName: "Água Mineral 500ml",
            quantity: 3,
            unitPriceCents: 600,
          },
          {
            productName: "Chopp Pilsen Artesanal 400ml",
            quantity: 2,
            unitPriceCents: 1500,
          },
        ],
      };

      const result = createSubpanelOrderSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        const subtotal = result.data.items.reduce((acc, i) => acc + i.quantity * i.unitPriceCents, 0);
        expect(subtotal).toBe(4800); // R$ 48,00

        // Regra de comissão: 10% de taxa da produtora
        const concessionPercentage = 10;
        const concessionFixedCents = 0;
        const percentageFee = Math.round((subtotal * concessionPercentage) / 100);
        const totalFee = percentageFee + concessionFixedCents;
        const netToPartner = subtotal - totalFee;

        expect(percentageFee).toBe(480); // R$ 4,80
        expect(netToPartner).toBe(4320); // R$ 43,20
      }
    });

    it("rejeita pedido sem itens ou com itens vazios", () => {
      const invalidPayload = {
        token: "tok_test",
        items: [],
      };

      const result = createSubpanelOrderSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });

    it("rejeita pedido com quantidade ou preço negativo", () => {
      const invalidPayload = {
        token: "tok_test",
        items: [
          {
            productName: "Item Inválido",
            quantity: -1,
            unitPriceCents: 500,
          },
        ],
      };

      const result = createSubpanelOrderSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe("upsertEventSurveySchema & Geofencing Math", () => {
    it("valida criação de pesquisa de satisfação estruturada com schema-forms", () => {
      const surveyPayload = {
        eventId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        title: "Pesquisa de Satisfação & Experiência",
        description: "Avalie o som, praça de alimentação e portaria",
        isActive: true,
        startsAt: "2026-11-20T18:00:00Z",
        endsAt: "2026-11-21T06:00:00Z",
        venueLatitude: -27.1004,
        venueLongitude: -52.6152,
        geoRadiusMeters: 800,
        formSchema: {
          questions: [
            {
              id: "q_satisfaction_general",
              label: "Qual o seu nível de satisfação geral com o festival?",
              type: "rating",
              required: true,
            },
            {
              id: "q_food_quality",
              label: "Como você avalia a agilidade da praça de alimentação?",
              type: "choice",
              required: true,
              options: ["Excelente", "Boa", "Regular", "Lenta"],
            },
            {
              id: "q_comments",
              label: "Sugestões para a próxima edição:",
              type: "text",
              required: false,
            },
          ],
        },
      };

      const result = upsertEventSurveySchema.safeParse(surveyPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Pesquisa de Satisfação & Experiência");
        expect(result.data.geoRadiusMeters).toBe(800);
      }
    });

    it("calcula precisão geofence com fórmula Haversine", () => {
      // Local do evento: Parque de Exposições Efapi Chapecó (-27.0543, -52.6468)
      const eventLat = -27.0543;
      const eventLng = -52.6468;
      const radiusMeters = 1000; // 1km de raio

      const calculateDistance = (lat: number, lng: number) => {
        const R = 6371e3;
        const dLat = ((lat - eventLat) * Math.PI) / 180;
        const dLon = ((lng - eventLng) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((eventLat * Math.PI) / 180) *
            Math.cos((lat * Math.PI) / 180) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      // Usuário 1: Dentro do parque (a 200m)
      const userInsideDist = calculateDistance(-27.055, -52.645);
      expect(userInsideDist).toBeLessThan(radiusMeters);

      // Usuário 2: No centro da cidade (a ~6km)
      const userOutsideDist = calculateDistance(-27.1004, -52.6152);
      expect(userOutsideDist).toBeGreaterThan(radiusMeters);
    });
  });

  describe("submitSurveyResponseSchema", () => {
    it("valida submissão com coordenadas e respostas mapeadas", () => {
      const responsePayload = {
        surveyId: "b1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d",
        eventId: "a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d",
        latitude: -27.0545,
        longitude: -52.6465,
        answers: {
          q_satisfaction_general: 5,
          q_food_quality: "Excelente",
          q_comments: "Parabéns pela agilidade dos caixas!",
        },
      };

      const result = submitSurveyResponseSchema.safeParse(responsePayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.answers.q_satisfaction_general).toBe(5);
        expect(result.data.latitude).toBe(-27.0545);
      }
    });

    it("rejeita submissão sem surveyId ou sem answers", () => {
      const invalidPayload = {
        surveyId: "invalid-uuid",
        eventId: "invalid-uuid",
      };

      const result = submitSurveyResponseSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });
});
