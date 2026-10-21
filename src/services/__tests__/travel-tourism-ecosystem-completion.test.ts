/**
 * travel-tourism-ecosystem-completion.test.ts
 *
 * Suíte de Testes Canônica para o Ecossistema Completo de Viagens & Turismo.
 * Cobre:
 * 1. Cotações sob Medida (requestTravelQuote & listAgencyTravelQuotes com protocolo e dual-write).
 * 2. Comissões e Contas a Receber de Operadoras (cálculo de comissão D+30 e transição de status).
 * 3. Normalização de Rooming List e Alocações de Hotelaria (travel_rooming_allocations).
 * 4. Reacomodação de Malha Aérea ANAC e Notificação Multicanal (travel_flight_reaccommodations).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do createServerFn do @tanstack/react-start para execução direta em testes unitários
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any) => {
        const validated = schema ? schema.parse(args?.data) : args?.data;
        return fn({ data: validated });
      },
    }),
    handler: (fn: any) => async (args: any) => fn(args || {}),
  }),
}));

// Mock Supabase
const mockQuotesStore: any[] = [];
const mockQuoteRequestsStore: any[] = [];
const mockRoomingStore: any[] = [];
const mockCommissionsStore: any[] = [];
const mockReaccomStore: any[] = [];

vi.mock("@/lib/supabase", () => {
  return {
    getServerClient: () => ({
      from: (table: string) => {
        return {
          select: (cols?: string) => ({
            eq: (field: string, val: any) => ({
              eq: (f2: string, v2: any) => ({
                order: () => Promise.resolve({
                  data: (table === "travel_operator_commissions" ? mockCommissionsStore : []).filter(
                    (item) => item[field] === val && item[f2] === v2
                  ),
                  error: null,
                }),
              }),
              order: () => Promise.resolve({
                data: (
                  table === "travel_rooming_allocations"
                    ? mockRoomingStore
                    : table === "travel_operator_commissions"
                    ? mockCommissionsStore
                    : table === "travel_flight_reaccommodations"
                    ? mockReaccomStore
                    : mockQuotesStore
                ).filter((item) => item[field] === val),
                error: null,
              }),
              limit: (n: number) => ({
                order: () => Promise.resolve({
                  data: (table === "travel_quote_requests" ? mockQuoteRequestsStore : []).filter(
                    (item) => item[field] === val
                  ).slice(0, n),
                  error: null,
                }),
              }),
            }),
            order: (orderField?: string, opts?: any) => ({
              limit: (n: number) => Promise.resolve({
                data: (table === "travel_quotes" ? mockQuotesStore : []).slice(0, n),
                error: null,
              }),
            }),
            or: (cond: string) => ({
              eq: () => ({
                limit: (n: number) => Promise.resolve({
                  data: mockQuotesStore.slice(0, n),
                  error: null,
                }),
              }),
              limit: (n: number) => Promise.resolve({
                data: mockQuotesStore.slice(0, n),
                error: null,
              }),
            }),
          }),
          insert: (payload: any) => {
            const row = { id: "00000000-0000-0000-0000-" + String(Math.floor(100000000000 + Math.random() * 900000000000)), ...payload };
            if (table === "travel_quotes") mockQuotesStore.push(row);
            if (table === "travel_quote_requests") mockQuoteRequestsStore.push(row);
            if (table === "travel_rooming_allocations") mockRoomingStore.push(row);
            if (table === "travel_operator_commissions") mockCommissionsStore.push(row);
            if (table === "travel_flight_reaccommodations") mockReaccomStore.push(row);
            return {
              select: () => ({
                single: () => Promise.resolve({ data: row, error: null }),
              }),
              catch: (fn: any) => Promise.resolve(),
            };
          },
          update: (patch: any) => ({
            eq: (field: string, val: any) => {
              const targetStore =
                table === "travel_quotes"
                  ? mockQuotesStore
                  : table === "travel_operator_commissions"
                  ? mockCommissionsStore
                  : mockReaccomStore;
              const idx = targetStore.findIndex((item) => item[field] === val);
              if (idx !== -1) {
                targetStore[idx] = { ...targetStore[idx], ...patch };
              }
              return Promise.resolve({ error: null });
            },
          }),
          delete: () => ({
            eq: (field: string, val: any) => {
              const idx = mockQuotesStore.findIndex((item) => item[field] === val);
              if (idx !== -1) mockQuotesStore.splice(idx, 1);
              return Promise.resolve({ error: null });
            },
          }),
        };
      },
    }),
  };
});

describe("Travel & Tourism Ecosystem Completion — Prova de Integração", () => {
  const storeId = "00000000-0000-0000-0000-000000000001";

  beforeEach(() => {
    mockQuotesStore.length = 0;
    mockQuoteRequestsStore.length = 0;
    mockRoomingStore.length = 0;
    mockCommissionsStore.length = 0;
    mockReaccomStore.length = 0;
  });

  describe("1. Cotações sob Medida (Tailor-made Quotes)", () => {
    it("deve cadastrar cotação com protocolo determinístico e vincular à loja", async () => {
      const { requestTravelQuote } = await import("../tourism.functions");

      const res = await requestTravelQuote({
        data: {
          store_id: storeId,
          origin_city: "Chapecó",
          origin_iata: "XAP",
          destination_city: "Paris",
          destination_iata: "CDG",
          departure_date: "2027-05-10",
          return_date: "2027-05-20",
          adults_count: 2,
          rooms_count: 1,
          trip_type: "air_package",
          contact_name: "Mariana Souza",
          contact_whatsapp: "49991234567",
          budget_tier: "premium",
          special_notes: "Lua de mel, hotel boutique com vista",
        },
      });

      expect(res.success).toBe(true);
      expect(res.id).toBeDefined();
      expect(res.protocol).toMatch(/^COT-\d{4}-\d{5}$/);

      expect(mockQuotesStore.length).toBe(1);
      expect(mockQuotesStore[0].protocol_number).toBe(res.protocol);
      expect(mockQuotesStore[0].destination_city).toBe("Paris");
      expect(mockQuotesStore[0].store_id).toBe(storeId);
    });

    it("deve sincronizar com travel_quote_requests quando store_id for informado", async () => {
      const { requestTravelQuote } = await import("../tourism.functions");

      await requestTravelQuote({
        data: {
          store_id: storeId,
          origin_city: "São Paulo",
          destination_city: "Orlando",
          adults_count: 3,
          contact_name: "Família Lima",
          contact_whatsapp: "11988887777",
          budget_tier: "standard",
        },
      });

      expect(mockQuoteRequestsStore.length).toBe(1);
      expect(mockQuoteRequestsStore[0].client_name).toBe("Família Lima");
      expect(mockQuoteRequestsStore[0].destination).toBe("Orlando");
      expect(mockQuoteRequestsStore[0].passengers_count).toBe(3);
    });
  });

  describe("2. Comissões e Contas a Receber de Operadoras", () => {
    it("deve calcular a comissão em centavos automaticamente e projetar D+30", async () => {
      const { createOperatorCommission } = await import("../tourism.functions");

      const res = await createOperatorCommission({
        data: {
          store_id: storeId,
          operator_name: "Abreu",
          booking_reference: "ABR-992144",
          passenger_name: "Carlos Eduardo",
          destination: "Lisboa & Porto",
          travel_departure_date: "2027-09-01",
          gross_amount_cents: 1500000, // R$ 15.000,00
          commission_rate_percent: 12.0, // 12%
          payout_rule: "departure_plus_30",
        },
      });

      expect(res.success).toBe(true);
      expect(res.commission_amount_cents).toBe(180000); // 12% de R$ 15.000 = R$ 1.800,00

      expect(mockCommissionsStore.length).toBe(1);
      expect(mockCommissionsStore[0].commission_amount_cents).toBe(180000);
      expect(mockCommissionsStore[0].status).toBe("pending");
      expect(mockCommissionsStore[0].estimated_payout_date).toBe("2027-10-01"); // 30 dias após 01/09
    });

    it("deve atualizar o status da comissão para aprovado ou pago", async () => {
      const { createOperatorCommission, updateOperatorCommissionStatus } = await import("../tourism.functions");

      const created = await createOperatorCommission({
        data: {
          store_id: storeId,
          operator_name: "Orinter",
          booking_reference: "ORI-1122",
          passenger_name: "Juliana Mendes",
          gross_amount_cents: 800000,
          commission_rate_percent: 10.0,
        },
      });

      const updateRes = await updateOperatorCommissionStatus({
        data: {
          id: created.id,
          status: "paid",
          notes: "Repasse liquidado no Bradesco agência 1234",
        },
      });

      expect(updateRes.success).toBe(true);
      expect(mockCommissionsStore[0].status).toBe("paid");
      expect(mockCommissionsStore[0].notes).toContain("Bradesco");
    });
  });

  describe("3. Rooming List e Normalização de Hotelaria", () => {
    it("deve persistir alocações de quartos com hóspedes e tipo de quarto", async () => {
      const { saveTourRoomingAllocation, listTourRoomingAllocations } = await import("../tourism.functions");
      const tourId = "00000000-0000-0000-0000-000000000099";

      const alloc = await saveTourRoomingAllocation({
        data: {
          tour_id: tourId,
          store_id: storeId,
          hotel_name: "Grand Hotel Bariloche",
          room_number: "204",
          room_type: "double_twin",
          capacity: 2,
          guest_name: "Roberto Silva",
          guest_document: "012.345.678-99",
          special_requests: "Andar alto, camas separadas",
          status: "confirmed",
        },
      });

      expect(alloc.success).toBe(true);
      expect(alloc.id).toBeDefined();

      const list = await listTourRoomingAllocations({ data: { tourId } });
      expect(list.length).toBe(1);
      expect(list[0].hotel_name).toBe("Grand Hotel Bariloche");
      expect(list[0].room_number).toBe("204");
      expect(list[0].guest_name).toBe("Roberto Silva");
      expect(list[0].special_requests).toBe("Andar alto, camas separadas");
    });
  });

  describe("4. Reacomodação de Malha Aérea ANAC", () => {
    it("deve registrar alteração de voo em maiúsculas e marcar notificação enviada", async () => {
      const { createFlightReaccommodation, markFlightReaccommodationNotified } = await import("../tourism.functions");

      const created = await createFlightReaccommodation({
        data: {
          store_id: storeId,
          pnr_locator: "hjk89a",
          airline_code: "g3",
          passenger_name: "Fernanda Costa",
          original_flight_number: "G3 1450",
          original_departure_time: "2027-04-15T08:00:00Z",
          new_flight_number: "G3 1452",
          new_departure_time: "2027-04-15T11:30:00Z",
          change_reason: "Cancelamento por manutenção preventiva",
          notification_channel: "whatsapp",
        },
      });

      expect(created.success).toBe(true);
      expect(mockReaccomStore.length).toBe(1);
      expect(mockReaccomStore[0].pnr_locator).toBe("HJK89A");
      expect(mockReaccomStore[0].airline_code).toBe("G3");
      expect(mockReaccomStore[0].passenger_notified).toBe(false);

      const notifyRes = await markFlightReaccommodationNotified({ data: { id: created.id } });
      expect(notifyRes.success).toBe(true);
      expect(mockReaccomStore[0].passenger_notified).toBe(true);
      expect(mockReaccomStore[0].notification_timestamp).toBeDefined();
    });
  });
});
