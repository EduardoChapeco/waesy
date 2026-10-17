import { describe, it, expect } from "vitest";
import {
  createSubpanelOrderSchema,
  upsertEventSurveySchema,
  submitSurveyResponseSchema,
  createEventSubpanelSchema,
  resolveVerifiedSubpanelOrderItems,
} from "./events.functions";
import {
  signTicketPayload,
  verifyTicketPayload,
} from "@/lib/ticket-crypto";

describe("Event Recursive Subpanels, WCTS-1 Ticket Crypto & Surveys Contract Tests", () => {
  describe("WCTS-1 Cryptographic Ticket Engine (Invariante B.40)", () => {
    const sampleClaims = {
      ticketId: "c1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d",
      eventId: "a1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d",
      lotId: "d1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d",
      ownerProfileId: "f1b2c3d4-e5f6-4a8b-9c0d-1e2f3a4b5c6d",
      issuedAt: 1760700000,
    };

    it("assina ingresso com HMAC-SHA256 canônico e código humano Mod-36 válido", () => {
      const signed = signTicketPayload(sampleClaims);

      expect(signed.qrPayload.startsWith("v1:TKT:")).toBe(true);
      expect(signed.signature).toHaveLength(64);
      expect(signed.humanCode.startsWith("W-TKT-")).toBe(true);
      expect(signed.humanCode.split("-")).toHaveLength(4);

      const verifiedHuman = verifyTicketPayload(signed.humanCode);
      expect(verifiedHuman.isValid).toBe(true);

      const verified = verifyTicketPayload(signed.qrPayload, sampleClaims);
      expect(verified.isValid).toBe(true);
    });

    it("rejeita QR Code com assinatura HMAC adulterada (Tentativa de Falsificação)", () => {
      const signed = signTicketPayload(sampleClaims);
      const forgedQr = signed.qrPayload.slice(0, -4) + "ffff";

      const verification = verifyTicketPayload(forgedQr, sampleClaims);
      expect(verification.isValid).toBe(false);
      expect(verification.errorCode).toBe("INVALID_SIGNATURE");
    });

    it("rejeita QR Code autêntico se apresentado em outro evento (Cross-Event Replay Attack)", () => {
      const signed = signTicketPayload(sampleClaims);
      const otherEventClaims = {
        ...sampleClaims,
        eventId: "99999999-9999-4999-9999-999999999999",
      };

      const verification = verifyTicketPayload(signed.qrPayload, otherEventClaims);
      expect(verification.isValid).toBe(false);
      expect(verification.errorCode).toBe("INVALID_SIGNATURE");
    });

    it("rejeita código curto manual com dígito verificador Mod-36 inválido", () => {
      const signed = signTicketPayload(sampleClaims);
      const parts = signed.humanCode.split("-");
      const currentCheck = parts[3];
      const corruptedCheck = currentCheck === "22" ? "ZZ" : "22";
      const corruptedHumanCode = `${parts[0]}-${parts[1]}-${parts[2]}-${corruptedCheck}`;

      const res = verifyTicketPayload(corruptedHumanCode);
      expect(res.isValid).toBe(false);
      expect(res.errorCode).toBe("INVALID_SIGNATURE");
    });
  });

  describe("Server-Side Concession Price Hardening (Invariante B.41)", () => {
    const dbCatalog = new Map([
      [
        "11111111-2222-4333-8444-555555555555",
        {
          id: "11111111-2222-4333-8444-555555555555",
          nome: "Combo Chopp Artesanal + Burger",
          price_cents: 5000,
          is_active: true,
        },
      ],
    ]);

    it("bloqueia adulteração de preço (unitPriceCents: 1) no cardápio mobile e força o preço oficial do banco (R$ 50,00)", () => {
      const tamperedItems = [
        {
          productId: "11111111-2222-4333-8444-555555555555",
          productName: "Combo Adulterado pelo Cliente",
          quantity: 2,
          unitPriceCents: 1, // Tentativa de pagar R$ 0,01
        },
      ];

      const verified = resolveVerifiedSubpanelOrderItems(
        tamperedItems,
        dbCatalog,
        "mobile_attendee",
        false,
      );

      expect(verified).toHaveLength(1);
      expect(verified[0].unitPriceCents).toBe(5000);
      expect(verified[0].totalPriceCents).toBe(10000);
      expect(verified[0].productName).toBe("Combo Chopp Artesanal + Burger");
    });

    it("rejeita pedido mobile_attendee se o produto não existir no catálogo oficial", () => {
      const fakeItems = [
        {
          productName: "Item Inventado no Inspecionar Elemento",
          quantity: 1,
          unitPriceCents: 100,
        },
      ];

      expect(() =>
        resolveVerifiedSubpanelOrderItems(fakeItems, dbCatalog, "mobile_attendee", false),
      ).toThrow(/inválido ou indisponível para pedido mobile/i);
    });

    it("permite lançamento por peso/valor avulso no PDV quando allowCustomPrice está ativo", () => {
      const buffetItems = [
        {
          productName: "Buffet Livre / Peso (450g)",
          quantity: 1,
          unitPriceCents: 3146,
        },
      ];

      const verified = resolveVerifiedSubpanelOrderItems(
        buffetItems,
        dbCatalog,
        "counter_pos",
        true,
      );

      expect(verified[0].unitPriceCents).toBe(3146);
      expect(verified[0].totalPriceCents).toBe(3146);
    });
  });

  describe("createEventSubpanelSchema", () => {
    it("valida subpainel com parâmetros fiscais, template PDV e taxas de concessão canônicas", () => {
      const payload = {
        eventId: "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
        name: "Bar Central e Bebidas",
        panelType: "bar" as const,
        templateTipo: "bar_comanda" as const,
        managerName: "Carlos Operador",
        managerContact: "(49) 99999-0000",
        concessionPercentage: 12.5,
        concessionFixedCents: 15000,
        allowOnlineOrders: true,
        allowCustomPrice: false,
      };

      const result = createEventSubpanelSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.concessionPercentage).toBe(12.5);
        expect(result.data.concessionFixedCents).toBe(15000);
        expect(result.data.templateTipo).toBe("bar_comanda");
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
        expect(result.data.templateTipo).toBe("bar_simples");
        expect(result.data.concessionPercentage).toBe(10);
        expect(result.data.concessionFixedCents).toBe(0);
        expect(result.data.allowOnlineOrders).toBe(true);
        expect(result.data.allowCustomPrice).toBe(false);
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
