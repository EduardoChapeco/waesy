import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerClient: vi.fn(),
  getAnonServerClient: vi.fn(),
  getServerIdentity: vi.fn(),
  requireStaff: vi.fn(),
  assertStoreAccess: vi.fn(),
  notifyStoreStaff: vi.fn(),
  emitFinancialEvent: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const state: { schema?: any } = {};
    const builder: any = {
      validator: (schema: any) => {
        state.schema = schema;
        return builder;
      },
      handler: (handler: (args: any) => unknown) => {
        const invoke = (args: any) => {
          const parsedData = state.schema ? state.schema.parse(args?.data) : args?.data;
          return handler({ data: parsedData });
        };
        (invoke as any).schema = state.schema;
        return invoke;
      },
    };
    return builder;
  },
}));

vi.mock("@/lib/supabase", () => ({
  getServerClient: mocks.getServerClient,
  getAnonServerClient: mocks.getAnonServerClient,
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: mocks.getServerIdentity,
  requireStaff: mocks.requireStaff,
  assertStoreAccess: mocks.assertStoreAccess,
}));

vi.mock("@/lib/notifications/store-staff-notify", () => ({
  notifyStoreStaff: mocks.notifyStoreStaff,
}));

vi.mock("@/services/financial-event-bus.service", () => ({
  emitFinancialEvent: mocks.emitFinancialEvent,
}));

import { approveTravelProposal } from "@/services/travel-proposal.functions";
import { bookGroupTourReservation } from "@/services/group-tours.functions";
import { processMultiDomainPaymentWebhook } from "@/services/multi-domain-payment-settlement.service";
import {
  buildInstallmentTable,
  resolveProposalCommercialOffer,
} from "@/lib/tourism/proposal-payment-calc";
import { resolveMaxInstallmentsFromOptions } from "@/lib/tourism/payment-policy";

describe("OPERAÇÃO VERDADE CANÔNICA — Bateria de Provas E2E (MF-01 a MF-04)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("MF-01 & MF-02: Aceite Público de Proposta com Gateway Online, 36x e Reconciliação de Lead", () => {
    it("deve aceitar proposta com paymentPreference='gateway_online' e parcelas em 36x criando lead ganho quando proposta não tinha lead_id", async () => {
      const storeId = "88888888-8888-8888-8888-888888888888";
      const proposalId = "99999999-9999-9999-9999-999999999999";
      const token = "prop_token_canonical_truth";
      const snapshotHash = "hash_canonical_123";

      let createdLead: any = null;
      let proposalUpdatedWithLead = false;
      let contractCreated = false;
      let envelopeCreated = false;

      const fakeDb: any = {
        from: (table: string) => {
          if (table === "travel_proposals") {
            return {
              select: () => ({
                eq: (col: string, val: string) => ({
                  maybeSingle: async () => ({
                    data: {
                      id: proposalId,
                      store_id: storeId,
                      public_token: token,
                      snapshot_hash: snapshotHash,
                      options: [{ id: "opt-1", name: "Opção Premium", total_cents: 1200000 }],
                      visibility_mode: "public",
                      is_hidden: false,
                      status: "sent",
                      title: "Maragogi dos Sonhos",
                      destination_city: "Maragogi",
                      total_cents: 1200000,
                      total_value_cents: 1200000,
                      lead_id: null, // Sem lead prévio
                    },
                    error: null,
                  }),
                }),
              }),
              update: (patch: any) => ({
                eq: (col: string, val: string) => {
                  if (patch.lead_id) proposalUpdatedWithLead = true;
                  return Promise.resolve({ data: null, error: null });
                },
              }),
            };
          }

          if (table === "leads_crm") {
            const queryChain: any = {
              eq: () => queryChain,
              or: () => queryChain,
              ilike: () => queryChain,
              order: () => queryChain,
              limit: () => queryChain,
              maybeSingle: async () => ({ data: null }),
            };
            return {
              select: () => queryChain,
              insert: (record: any) => {
                createdLead = { id: "new-crm-lead-id", ...record };
                return {
                  select: () => ({
                    maybeSingle: async () => ({ data: createdLead, error: null }),
                  }),
                };
              },
              update: () => ({
                eq: () => ({
                  eq: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            };
          }

          if (table === "contracts") {
            return {
              select: () => ({
                eq: () => ({
                  or: () => ({
                    maybeSingle: async () => ({ data: null }),
                  }),
                }),
              }),
              insert: (record: any) => {
                contractCreated = true;
                return {
                  select: () => ({
                    maybeSingle: async () => ({ data: { id: "new-contract-uuid" }, error: null }),
                  }),
                };
              },
            };
          }

          if (table === "signature_envelopes") {
            return {
              insert: () => {
                envelopeCreated = true;
                return Promise.resolve({ data: null, error: null });
              },
            };
          }

          if (table === "financial_transactions") {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => ({
                    maybeSingle: async () => ({ data: null }),
                  }),
                }),
              }),
              insert: () => Promise.resolve({ data: null, error: null }),
            };
          }

          return {
            select: () => ({ maybeSingle: async () => ({ data: null }) }),
            insert: () => Promise.resolve({ data: null, error: null }),
            update: () => Promise.resolve({ data: null, error: null }),
          };
        },
        rpc: (fn: string, params: any) => {
          if (fn === "record_public_travel_proposal_acceptance") {
            // Verifica que a RPC recebe 'gateway_online' e parcelas em 36x
            expect(params.p_payment_preference).toBe("gateway_online");
            expect(params.p_payment_installments).toBe(36);
            return Promise.resolve({
              data: { success: true, acceptance_id: "acc-uuid-truth-123", replayed: false },
              error: null,
            });
          }
          return Promise.resolve({ data: null, error: null });
        },
      };

      mocks.getServerClient.mockReturnValue(fakeDb);

      const res = await (approveTravelProposal as any)({
        data: {
          token,
          snapshotHash,
          selectedOptionId: "opt-1",
          acceptedByName: "Marina Santos",
          acceptedByEmail: "marina@exemplo.com",
          paymentPreference: "gateway_online",
          paymentInstallments: 36,
          passengers: [
            {
              name: "Marina Santos",
              document: "123.456.789-00",
              email: "marina@exemplo.com",
              phone: "(11) 98765-4321",
              birthDate: "1990-05-15",
            },
          ],
        },
      });

      expect(res.success).toBe(true);
      expect(res.acceptanceId).toBe("acc-uuid-truth-123");
      expect(createdLead).not.toBeNull();
      expect(createdLead.name).toBe("Marina Santos");
      expect(createdLead.status).toBe("won");
      expect(proposalUpdatedWithLead).toBe(true);
      expect(contractCreated).toBe(true);
      expect(envelopeCreated).toBe(true);
    });
  });

  describe("MF-03: Sincronização Transacional de Excursão com CRM, Contratos e Financeiro", () => {
    it("deve criar viagem, poltrona, reconciliar lead no CRM, contrato em contracts e transacao financeira", async () => {
      const storeId = "88888888-8888-8888-8888-888888888888";
      const tourId = "77777777-7777-7777-7777-777777777777";

      let leadInserted = false;
      let contractInserted = false;
      let financialInserted = false;

      const fakeDb: any = {
        from: (table: string) => {
          if (table === "tourism_experiences") {
            return {
              select: () => ({
                eq: () => ({
                  single: async () => ({
                    data: {
                      id: tourId,
                      store_id: storeId,
                      title: "Excursão Beto Carrero World",
                      destination: "Penha/SC",
                      price_cents: 45000,
                      total_seats: 46,
                      available_seats: 46,
                      seats: [{ seat_number: 12, status: "available" }],
                      rooms: [],
                    },
                    error: null,
                  }),
                }),
              }),
              update: () => ({
                eq: () => Promise.resolve({ error: null }),
              }),
            };
          }

          if (table === "tourism_trips") {
            return {
              insert: () => ({
                select: () => ({
                  maybeSingle: async () => ({ data: { id: "created-trip-id" }, error: null }),
                }),
              }),
            };
          }

          if (table === "trip_passengers") {
            return {
              insert: () => Promise.resolve({ error: null }),
            };
          }

          if (table === "leads_crm") {
            const queryChain: any = {
              eq: () => queryChain,
              or: () => queryChain,
              ilike: () => queryChain,
              order: () => queryChain,
              limit: () => queryChain,
              maybeSingle: async () => ({ data: null }),
            };
            return {
              select: () => queryChain,
              insert: () => {
                leadInserted = true;
                return {
                  select: () => ({
                    maybeSingle: async () => ({ data: { id: "crm-lead-excursion-id" }, error: null }),
                  }),
                };
              },
            };
          }

          if (table === "contracts") {
            return {
              insert: () => {
                contractInserted = true;
                return {
                  select: () => ({
                    maybeSingle: async () => ({ data: { id: "contract-excursion-id" }, error: null }),
                  }),
                };
              },
            };
          }

          if (table === "signature_envelopes") {
            return {
              insert: () => Promise.resolve({ error: null }),
            };
          }

          if (table === "financial_transactions") {
            return {
              insert: () => {
                financialInserted = true;
                return Promise.resolve({ error: null });
              },
            };
          }

          return {
            select: () => ({ maybeSingle: async () => ({ data: null }) }),
            insert: () => Promise.resolve({ data: null, error: null }),
            update: () => Promise.resolve({ data: null, error: null }),
          };
        },
      };

      mocks.getServerClient.mockReturnValue(fakeDb);
      mocks.getServerIdentity.mockResolvedValue({ id: "profile-user-1" });

      const res = await (bookGroupTourReservation as any)({
        data: {
          tourId,
          primaryContact: {
            name: "Carlos Silveira",
            phone: "(49) 99123-4567",
            document: "987.654.321-11",
            email: "carlos@exemplo.com",
          },
          adultsCount: 1,
          childrenCount: 0,
          childrenAges: [],
          roomPreference: "double_couple",
          selectedSeats: [12],
          paymentMethod: "pix",
          delegateCompanionForms: false,
        },
      });

      expect(res.success).toBe(true);
      expect(res.tripId).toBe("created-trip-id");
      expect(leadInserted).toBe(true);
      expect(contractInserted).toBe(true);
      expect(financialInserted).toBe(true);
      expect(mocks.notifyStoreStaff).toHaveBeenCalled();
    });
  });

  describe("MF-04: Liquidação Server-Side Multi-Domínio de Webhooks de Pagamento", () => {
    it("deve liquidar pagamento de proposta turística liberando contrato e atualizando CRM", async () => {
      const proposalId = "11111111-1111-1111-1111-111111111111";
      const storeId = "store-truth-uuid-5";

      let proposalUpdated = false;
      let contractSigned = false;

      const fakeDb: any = {
        from: (table: string) => {
          if (table === "travel_proposals") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: proposalId,
                      store_id: storeId,
                      title: "Cancún All Inclusive",
                      customer_id: "customer-123",
                      lead_id: "lead-456",
                    },
                  }),
                }),
              }),
              update: () => {
                proposalUpdated = true;
                return {
                  eq: () => Promise.resolve({ error: null }),
                };
              },
            };
          }

          if (table === "leads_crm") {
            return {
              select: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: { custom_fields: {} } }),
                }),
              }),
              update: () => ({
                eq: () => Promise.resolve({ error: null }),
              }),
            };
          }

          if (table === "contracts") {
            return {
              update: () => {
                contractSigned = true;
                return {
                  eq: () => ({
                    eq: () => Promise.resolve({ error: null }),
                  }),
                };
              },
            };
          }

          if (table === "financial_transactions") {
            return {
              upsert: () => Promise.resolve({ error: null }),
            };
          }

          return {
            select: () => ({ maybeSingle: async () => ({ data: null }) }),
          };
        },
      };

      mocks.getServerClient.mockReturnValue(fakeDb);

      const result = await processMultiDomainPaymentWebhook({
        provider: "mercado_pago",
        eventId: "evt-mp-truth-777",
        providerRef: "pay-ref-888",
        referenceId: `proposal:${proposalId}`,
        status: "approved",
        amountCents: 850000,
        payload: { id: "pay-ref-888", status: "approved" },
      });

      expect(result.status).toBe("processed");
      expect(result.domain).toBe("proposals");
      expect(proposalUpdated).toBe(true);
      expect(contractSigned).toBe(true);
      expect(mocks.emitFinancialEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceDomain: "TOURISM",
          sourceEntityId: proposalId,
          status: "COMPLETED",
          amountCents: 850000,
        }),
      );
    });
  });

  describe("MF-05: Sincronização Atômica de Proposta, Parcelamento Contínuo (1x a 36x) sem Pular 13x e 16x", () => {
    it("deve calcular tabela de parcelas contínua até 16x e 36x contendo 13x e 16x sem lacunas", () => {
      const table16 = buildInstallmentTable(579636, 16, true);
      expect(table16).toHaveLength(16);
      expect(table16.map((r) => r.count)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
      ]);

      const inst13 = table16.find((r) => r.count === 13);
      expect(inst13).toBeDefined();
      expect(inst13?.installmentCents).toBe(Math.round(579636 / 13));

      const inst16 = table16.find((r) => r.count === 16);
      expect(inst16).toBeDefined();
      expect(inst16?.installmentCents).toBe(Math.round(579636 / 16));

      const table36 = buildInstallmentTable(1000000, 36, true);
      expect(table36).toHaveLength(36);
      expect(table36[12].count).toBe(13);
      expect(table36[15].count).toBe(16);
      expect(table36[35].count).toBe(36);
    });

    it("deve resolver maxInstallments até 36x na oferta comercial e respeitar campanhas especiais de 16x", () => {
      const offer16 = resolveProposalCommercialOffer({
        totalCents: 579636,
        paymentDisplayConfig: {
          max_installments: 16,
          interest_free: true,
          show_card: true,
        },
      });
      expect(offer16.maxInstallments).toBe(16);
      expect(offer16.installmentTable).toHaveLength(16);

      const offer36 = resolveProposalCommercialOffer({
        totalCents: 1200000,
        paymentDisplayConfig: {
          max_installments: 36,
          interest_free: false,
          show_card: true,
        },
      });
      expect(offer36.maxInstallments).toBe(36);
      expect(offer36.installmentTable).toHaveLength(36);

      const resolved = resolveMaxInstallmentsFromOptions([
        { method: "credit_card", installments_count: 16, installment_value_cents: 36227 },
        { method: "boleto", installments_count: 24, installment_value_cents: 24151 },
      ]);
      expect(resolved.maxCardInstallments).toBe(16);
      expect(resolved.maxBoletoInstallments).toBe(24);
      expect(resolved.maxInstallments).toBe(24);
    });
  });
});
