import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerClient: vi.fn(),
  getAnonServerClient: vi.fn(),
  getServerIdentity: vi.fn(),
  requireStaff: vi.fn(),
  requireFinance: vi.fn(),
  assertStoreAccess: vi.fn(),
  getRequest: vi.fn(),
  getRealClientIP: vi.fn(),
  setResponseHeader: vi.fn(),
  executeUnifiedAiCall: vi.fn(),
  getNextActiveKey: vi.fn(),
  publishDomainEvent: vi.fn(),
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const state: { schema?: unknown } = {};
    const builder: any = {
      validator: (schema: unknown) => {
        state.schema = schema;
        return builder;
      },
      handler: (handler: (args: unknown) => unknown) => {
        const invoke = (args: unknown) => handler(args);
        (invoke as any).schema = state.schema;
        return invoke;
      },
    };
    return builder;
  },
}));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: mocks.getRequest }));
vi.mock("@tanstack/start-server-core", () => ({ setResponseHeader: mocks.setResponseHeader }));
vi.mock("@/lib/supabase", () => ({
  getServerClient: mocks.getServerClient,
  getAnonServerClient: mocks.getAnonServerClient,
}));
vi.mock("@/lib/server-access", () => ({
  getServerIdentity: mocks.getServerIdentity,
  requireStaff: mocks.requireStaff,
  requireFinance: mocks.requireFinance,
  assertStoreAccess: mocks.assertStoreAccess,
}));
vi.mock("@/lib/network-telemetry.server", () => ({
  getRealClientIP: mocks.getRealClientIP,
}));
vi.mock("@/services/api-orchestrator.functions", () => ({
  executeUnifiedAiCall: mocks.executeUnifiedAiCall,
  getNextActiveKey: mocks.getNextActiveKey,
}));
vi.mock("./domain-events.functions", () => ({
  publishDomainEvent: mocks.publishDomainEvent,
}));

import {
  getTravelContractById,
  updateContractClauses,
  deleteTravelContract,
  generateTravelReservationCheckout,
} from "./travel-contract.functions";
import { signContractAsPayer } from "./travel-continuous-flow.functions";
import {
  convertProposalToTrip,
  getTravelerTripPortalDossier,
  saveTripFinancialDetails,
  addTripOfficialDocument,
  deleteTripOfficialDocument,
  updateTripOperationalStructure,
  addTripGroupMemoryMedia,
} from "./travel-lifecycle.functions";
import { submitAndAutoMatchCustomerReceiptFn } from "./travel-ecosystem-engines.functions";
import { bookGroupTourReservation } from "./group-tours.functions";
import { listBookingInstallments, markInstallmentPaid } from "./travel-installments.functions";

const STORE_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STORE_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "99999999-9999-4999-8999-999999999999";
const STAFF_A = "22222222-2222-4222-8222-222222222222";
const TRIP_A = "33333333-3333-4333-8333-333333333333";
const CONTRACT_A = "44444444-4444-4444-8444-444444444444";
const PROPOSAL_A = "55555555-5555-4555-8555-555555555555";
const OPTION_B = "66666666-6666-4666-8666-666666666666";
const DOC_A = "77777777-7777-4777-8777-777777777777";
const TOUR_A = "88888888-8888-4888-8888-888888888888";

type DbOp = {
  table: string;
  action: "select" | "insert" | "update" | "upsert" | "delete";
  payload?: any;
  filters: Array<[string, unknown]>;
};

function createFlexibleMockDb(
  resolver: (table: string, action: DbOp["action"], op: DbOp) => { data?: any; error?: any } | Promise<{ data?: any; error?: any }>,
  rpcImpl?: (fnName: string, args: any) => Promise<{ data?: any; error?: any }>,
) {
  const ops: DbOp[] = [];
  const signedCalls: Array<{ bucket: string; path: string }> = [];

  const from = vi.fn((table: string) => {
    const op: DbOp = { table, action: "select", filters: [] };
    ops.push(op);

    const resolveNow = () => Promise.resolve(resolver(table, op.action, op));

    const chain: any = {
      select: () => chain,
      insert: (payload: any) => {
        op.action = "insert";
        op.payload = payload;
        return chain;
      },
      update: (payload: any) => {
        op.action = "update";
        op.payload = payload;
        return chain;
      },
      upsert: (payload: any) => {
        op.action = "upsert";
        op.payload = payload;
        return chain;
      },
      delete: () => {
        op.action = "delete";
        return chain;
      },
      eq: (col: string, val: unknown) => {
        op.filters.push([`eq:${col}`, val]);
        return chain;
      },
      neq: (col: string, val: unknown) => {
        op.filters.push([`neq:${col}`, val]);
        return chain;
      },
      or: (expr: string) => {
        op.filters.push(["or", expr]);
        return chain;
      },
      in: (col: string, vals: unknown[]) => {
        op.filters.push([`in:${col}`, vals]);
        return chain;
      },
      gt: () => chain,
      order: () => chain,
      limit: () => chain,
      single: () => resolveNow(),
      maybeSingle: () => resolveNow(),
      then: (onFulfilled: any, onRejected: any) => resolveNow().then(onFulfilled, onRejected),
    };
    return chain;
  });

  const rpc = vi.fn((fnName: string, args: any) =>
    rpcImpl ? rpcImpl(fnName, args) : Promise.resolve({ data: null, error: null }),
  );

  const storage = {
    from: vi.fn((bucket: string) => ({
      createSignedUrl: vi.fn(async (objPath: string) => {
        signedCalls.push({ bucket, path: objPath });
        return { data: { signedUrl: `https://signed.example/${bucket}/${objPath}` }, error: null };
      }),
    })),
  };

  return { client: { from, rpc, storage }, ops, signedCalls };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getRequest.mockReturnValue({ headers: new Headers({ "user-agent": "Vitest/1.0" }) });
  mocks.getRealClientIP.mockReturnValue("127.0.0.1");
  mocks.requireStaff.mockResolvedValue({ id: STAFF_A, store_id: STORE_A, role: "owner", email: "staff@a.com" });
  mocks.getServerIdentity.mockResolvedValue({ id: USER_A, store_id: null, role: "customer", email: "cliente@a.com" });
  mocks.assertStoreAccess.mockImplementation((identity: any) => {
    if (!identity?.id || (!identity.store_id && identity.role !== "platform_admin")) {
      throw new Error("Acesso negado: loja não vinculada.");
    }
  });
});

describe("Tourism E2E Sync Closure (F1-F5)", () => {
  describe("1. Contratos de Viagem & Checkout Canônico", () => {
    it("bloqueia leitura, edição de cláusulas e exclusão cross-tenant em contratos", async () => {
      mocks.requireStaff.mockResolvedValue({ id: "staff-b", store_id: STORE_B, role: "admin" });
      const db = createFlexibleMockDb((table) => {
        if (table === "contracts") {
          return {
            data: {
              id: CONTRACT_A,
              store_id: STORE_A,
              creator_id: STAFF_A,
              status: "draft",
              current_version: 1,
              metadata: { store_id: STORE_A },
            },
            error: null,
          };
        }
        return { data: null, error: null };
      });
      mocks.getServerClient.mockReturnValue(db.client);

      await expect(getTravelContractById({ data: { id: CONTRACT_A } })).rejects.toThrow(/não autorizado/i);
      await expect(
        updateContractClauses({
          data: {
            contractId: CONTRACT_A,
            clauses: [{ number: 1, section: "Geral", clause_text: "Nova cláusula válida", is_mandatory: true }],
          },
        }),
      ).rejects.toThrow(/não autorizado/i);
      await expect(deleteTravelContract({ data: { id: CONTRACT_A } })).rejects.toThrow(/outra loja/i);
    });

    it("impede mutação e exclusão de contratos já assinados/completed", async () => {
      const db = createFlexibleMockDb((table) => {
        if (table === "contracts") {
          return {
            data: {
              id: CONTRACT_A,
              store_id: STORE_A,
              status: "completed",
              current_version: 1,
              metadata: { store_id: STORE_A },
            },
            error: null,
          };
        }
        return { data: null, error: null };
      });
      mocks.getServerClient.mockReturnValue(db.client);

      await expect(
        updateContractClauses({
          data: {
            contractId: CONTRACT_A,
            clauses: [{ number: 1, section: "Geral", clause_text: "Tentativa pós assinatura", is_mandatory: true }],
          },
        }),
      ).rejects.toThrow(/assinado/i);
      await expect(deleteTravelContract({ data: { id: CONTRACT_A } })).rejects.toThrow(/fé pública/i);
    });

    it("gera URL canônica /contrato/$token no checkout de reserva", async () => {
      const db = createFlexibleMockDb(
        (table) => {
          if (table === "stores") {
            return { data: { id: STORE_A, name: "Excelência Tour", settings: { pix_key: "11999999999" } }, error: null };
          }
          return { data: null, error: null };
        },
        async (fnName) => {
          if (fnName === "create_staff_travel_contract") {
            return { data: { success: true, contract_id: CONTRACT_A, public_token: "ct_public_123" }, error: null };
          }
          return { data: null, error: null };
        },
      );
      mocks.getServerClient.mockReturnValue(db.client);

      const res = await generateTravelReservationCheckout({
        data: {
          storeId: STORE_A,
          clientName: "Maria Viajante",
          clientPhone: "49999999999",
          destination: "Gramado",
          packageSummary: "Pacote Serra Gaúcha 4 noites",
          totalValueCents: 350000,
          passengers: [{ name: "Maria Viajante" }],
          generatePix: true,
        },
      });

      expect(res.contractUrl).toContain("/contrato/ct_public_123");
      expect(res.contractUrl).not.toContain("/assinar/");
    });
  });

  describe("2. Fluxo Multi-Pagador & Propagação Pós-Assinatura", () => {
    it("consulta tourism_trips (nunca travel_trips), grava canal válido e propaga erro se boleto falhar", async () => {
      const dbFail = createFlexibleMockDb((table, action) => {
        if (table === "travel_contract_signers" && action === "select") {
          return {
            data: {
              id: "signer-1",
              contract_id: CONTRACT_A,
              store_id: STORE_A,
              full_name: "Ana Pagadora",
              cpf_cnpj: "12345678900",
              share_amount_cents: 250000,
              payment_method: "credit_card",
              signature_status: "pending",
            },
            error: null,
          };
        }
        if (table === "travel_contract_signers" && action === "update") {
          return { data: { id: "signer-1" }, error: null };
        }
        if (table === "travel_contracts") {
          return { data: null, error: null };
        }
        if (table === "contracts" && action === "update") {
          return {
            data: {
              id: CONTRACT_A,
              store_id: STORE_A,
              status: "completed",
              metadata: { trip_id: TRIP_A, total_value_cents: 250000, payment_conditions: "1x Cartão" },
            },
            error: null,
          };
        }
        if (table === "tourism_trips") {
          return { data: { id: TRIP_A, store_id: STORE_A, operator_name: "CVC", commission_percent: 10 }, error: null };
        }
        if (table === "travel_trip_installment_boletos" && action === "upsert") {
          return { data: null, error: { message: "check constraint failed" } };
        }
        return { data: [], error: null };
      });
      mocks.getServerClient.mockReturnValue(dbFail.client);

      await expect(
        signContractAsPayer({
          data: { token: "multi_tok_1234567890", acceptedTerms: true },
        }),
      ).rejects.toThrow(/check constraint failed/i);

      expect(dbFail.ops.some((o) => o.table === "travel_trips")).toBe(false);
      const boletoUpsert = dbFail.ops.find(
        (o) => o.table === "travel_trip_installment_boletos" && o.action === "upsert",
      );
      expect(boletoUpsert?.payload?.[0]?.payment_channel).toBe("credit_card");
    });
  });

  describe("3. Barreira Zero-Trust do Portal do Viajante & Storage Privado", () => {
    it("rejeita visitante anônimo com AUTH_REQUIRED e terceiros com FORBIDDEN antes de carregar filhos", async () => {
      mocks.getServerIdentity.mockResolvedValue(null);
      const dbAnon = createFlexibleMockDb(() => ({
        data: { id: TRIP_A, store_id: STORE_A, customer_id: USER_A, stores: {} },
        error: null,
      }));
      mocks.getServerClient.mockReturnValue(dbAnon.client);

      await expect(getTravelerTripPortalDossier({ data: { tripIdOrCode: TRIP_A } })).rejects.toThrow(/AUTH_REQUIRED/);

      mocks.getServerIdentity.mockResolvedValue({ id: USER_B, store_id: null, role: "customer", email: "intruso@x.com" });
      const dbOutsider = createFlexibleMockDb((table) => {
        if (table === "tourism_trips") {
          return {
            data: { id: TRIP_A, store_id: STORE_A, customer_id: USER_A, client_email: "dono@a.com", stores: {} },
            error: null,
          };
        }
        if (table === "profiles") return { data: { cpf: "00011122233" }, error: null };
        if (table === "trip_passengers") return { data: [], error: null };
        return { data: [], error: null };
      });
      mocks.getServerClient.mockReturnValue(dbOutsider.client);

      await expect(getTravelerTripPortalDossier({ data: { tripIdOrCode: TRIP_A } })).rejects.toThrow(/FORBIDDEN/);
      expect(dbOutsider.ops.some((o) => o.table === "travel_trip_official_documents")).toBe(false);
    });

    it("autoriza passageiro por CPF e reassina documentos privados do Storage", async () => {
      mocks.getServerIdentity.mockResolvedValue({ id: USER_B, store_id: null, role: "customer", email: "pax@a.com" });
      const dbOwner = createFlexibleMockDb((table) => {
        if (table === "tourism_trips") {
          return {
            data: { id: TRIP_A, store_id: STORE_A, customer_id: USER_A, client_email: "outro@a.com", stores: { name: "Agência A" } },
            error: null,
          };
        }
        if (table === "profiles") return { data: { cpf: "111.222.333-44" }, error: null };
        if (table === "trip_passengers") {
          return { data: [{ id: "pax-1", email: "pax@a.com", document: "11122233344", is_lead_passenger: true }], error: null };
        }
        if (table === "travel_trip_official_documents") {
          return {
            data: [
              {
                id: DOC_A,
                title: "Voucher Operadora",
                is_visible_to_client: true,
                original_pdf_url: "https://stale.example/file.pdf",
                ocr_extracted_json: { storage_bucket: "legal-documents", storage_path: `${STORE_A}/trip/voucher.pdf` },
              },
              {
                id: "77777777-7777-4777-8777-777777777778",
                title: "Voucher Bloqueado",
                is_visible_to_client: true,
                original_pdf_url: "https://stale.example/blocked.pdf",
                ocr_extracted_json: { storage_bucket: "legal-documents", storage_path: `${STORE_B}/trip/secret.pdf` },
              },
            ],
            error: null,
          };
        }
        if (table === "travel_contracts") return { data: null, error: null };
        if (table === "contracts") return { data: null, error: null };
        return { data: [], error: null };
      });
      mocks.getServerClient.mockReturnValue(dbOwner.client);

      const dossier = await getTravelerTripPortalDossier({ data: { tripIdOrCode: TRIP_A } });
      expect(dossier?.officialDocuments[0]?.original_pdf_url).toBe(
        `https://signed.example/legal-documents/${STORE_A}/trip/voucher.pdf`,
      );
      expect(dossier?.officialDocuments[1]?.original_pdf_url).toBe("https://stale.example/blocked.pdf");
      expect(dbOwner.signedCalls).toContainEqual({
        bucket: "legal-documents",
        path: `${STORE_A}/trip/voucher.pdf`,
      });
      expect(dbOwner.signedCalls).not.toContainEqual({
        bucket: "legal-documents",
        path: `${STORE_B}/trip/secret.pdf`,
      });
    });
  });

  describe("4. Sincronização Proposta->Viagem, Estrutura Operacional, Documentos, Álbum & Recebimentos", () => {
    it("preserva roteiro/inclusões da opção vencedora retornada pelo RPC e grava lead_id", async () => {
      const db = createFlexibleMockDb(
        (table) => {
          if (table === "travel_proposals") {
            return {
              data: {
                id: PROPOSAL_A,
                store_id: STORE_A,
                lead_id: "77777777-0000-4000-8000-000000000001",
                client_id: "77777777-0000-4000-8000-000000000002",
                accepted_option_id: null,
                itinerary: [{ day: 1, title: "Roteiro Raiz" }],
                options: [
                  { id: "opt-other", title: "Econômica", itinerary: [{ day: 1, title: "Dia Econômico" }] },
                  {
                    id: OPTION_B,
                    title: "Opção Premium",
                    itinerary: [{ day: 1, title: "Dia Premium Maceió" }],
                    includes: ["Transfer Privativo"],
                    excludes: ["Despesas Pessoais"],
                    rooms: [{ name: "Suíte Mar" }],
                  },
                ],
                flights: [],
                hotels: [],
              },
              error: null,
            };
          }
          return { data: null, error: null };
        },
        async () => ({
          data: {
            success: true,
            replayed: false,
            trip_id: TRIP_A,
            trip_number: "TRP-2027-01",
            selected_option_id: OPTION_B,
            voucher_id: "v-1",
            voucher_token: "vt_1",
            voucher_url: "/voucher/vt_1",
          },
          error: null,
        }),
      );
      mocks.getServerClient.mockReturnValue(db.client);

      await convertProposalToTrip({ data: { proposalId: PROPOSAL_A } });
      const postUpdate = db.ops.find((o) => o.table === "tourism_trips" && o.action === "update");
      expect(postUpdate?.payload?.itinerary).toEqual([{ day: 1, title: "Dia Premium Maceió" }]);
      expect(postUpdate?.payload?.includes).toEqual(["Transfer Privativo"]);
      expect(postUpdate?.payload?.lead_id).toBe("77777777-0000-4000-8000-000000000001");
    });

    it("sincroniza parcelas financeiras em travel_trip_installment_boletos inclusive com campos opcionais ausentes/nulos (B.25)", async () => {
      mocks.getServerIdentity.mockResolvedValue({
        id: USER_A,
        role: "admin",
        store_id: STORE_A,
        memberships: [{ store_id: STORE_A, role: "admin" }],
      });
      const db = createFlexibleMockDb((table) => {
        if (table === "tourism_trips") {
          return {
            data: {
              id: TRIP_A,
              store_id: STORE_A,
              customer_id: USER_A,
              total_cents: 200000,
              operator_name: "FRT",
              payment_method: "boleto",
              installments_count: 2,
              financial_details: {},
            },
            error: null,
          };
        }
        return { data: [], error: null };
      });
      mocks.getServerClient.mockReturnValue(db.client);

      await saveTripFinancialDetails({
        data: {
          tripId: TRIP_A,
          grossPriceCents: 200000,
          operatorName: null,
          paymentMethod: "boleto",
          externalFinanceUrl: null,
          installments: [
            {
              installment_number: 1,
              total_installments: 2,
              due_date: "2027-06-10",
              amount_cents: 100000,
              status: "pending",
              paid_at: null,
            },
            {
              installment_number: 2,
              total_installments: 2,
              due_date: "2027-07-10",
              amount_cents: 100000,
              status: "paid",
              paid_at: "2027-05-01T10:00:00Z",
            },
          ],
        },
      });

      const upsertOp = db.ops.find((o) => o.table === "travel_trip_installment_boletos" && o.action === "upsert");
      expect(upsertOp?.payload).toHaveLength(2);
      expect(upsertOp?.payload[1]?.status).toBe("reconciled");

      // Chamada com installments omitido (B.25 optional branch)
      await saveTripFinancialDetails({
        data: {
          tripId: TRIP_A,
          grossPriceCents: 220000,
        },
      });
      expect(db.ops.filter((o) => o.table === "tourism_trips" && o.action === "update")).toHaveLength(2);
    });

    it("propaga edição pós-venda estrutural para tourism_trips e tourism_vouchers e gerencia documentos/álbum", async () => {
      const db = createFlexibleMockDb((table) => {
        if (table === "tourism_trips") {
          return {
            data: {
              id: TRIP_A,
              store_id: STORE_A,
              customer_id: USER_A,
              destination_city: "Fortaleza",
              flights: [],
              hotels: [],
              transfers: [],
              tours: [],
              portal_content: { group_album: [] },
            },
            error: null,
          };
        }
        if (table === "travel_trip_official_documents") {
          return { data: { id: DOC_A, store_id: STORE_A, trip_id: TRIP_A, title: "Confirmação CVC" }, error: null };
        }
        return { data: [], error: null };
      });
      mocks.getServerClient.mockReturnValue(db.client);

      await updateTripOperationalStructure({
        data: {
          tripId: TRIP_A,
          destinationCity: "Jericoacoara",
          transfers: [{ title: "Transfer Privativo 4x4", type: "in_out" }],
          notes: "Apresentar documento original.",
        },
      });
      const voucherUpdate = db.ops.find((o) => o.table === "tourism_vouchers" && o.action === "update");
      expect(voucherUpdate?.payload?.destination).toBe("Jericoacoara");
      expect(voucherUpdate?.payload?.observations).toBe("Apresentar documento original.");

      await expect(
        addTripOfficialDocument({
          data: {
            tripId: TRIP_A,
            docCategory: "operator_confirmation",
            title: "Tentativa Cross-Tenant",
            fileUrl: "https://cdn.example/cvc.pdf",
            storageBucket: "payment-proofs",
            storagePath: `${STORE_B}/other.pdf`,
            isVisibleToClient: true,
          },
        }),
      ).rejects.toThrow(/fora do escopo/i);

      await expect(
        addTripOfficialDocument({
          data: {
            tripId: TRIP_A,
            docCategory: "operator_confirmation",
            title: "XSS URI",
            fileUrl: "javascript:alert(1)",
            isVisibleToClient: true,
          },
        }),
      ).rejects.toThrow(/inválida/i);

      const docAdded = await addTripOfficialDocument({
        data: {
          tripId: TRIP_A,
          docCategory: "operator_confirmation",
          title: "Confirmação CVC",
          operatorName: null,
          reservationCode: null,
          fileUrl: "https://cdn.example/cvc.pdf",
          storageBucket: "legal-documents",
          storagePath: `${STORE_A}/cvc.pdf`,
          isVisibleToClient: true,
        },
      });
      expect(docAdded.success).toBe(true);

      await deleteTripOfficialDocument({ data: { tripId: TRIP_A, documentId: DOC_A } });
      expect(db.ops.some((o) => o.table === "travel_trip_official_documents" && o.action === "delete")).toBe(true);

      const albumRes = await addTripGroupMemoryMedia({
        data: {
          tripId: TRIP_A,
          url: "https://cdn.example/foto.jpg",
          mediaType: "image",
          caption: null,
        },
      });
      expect(albumRes.album[0]?.url).toBe("https://cdn.example/foto.jpg");
      expect(albumRes.album[0]?.type).toBe("image");
    });

    it("bloqueia envio de comprovante por terceiro e persiste conciliação real do titular", async () => {
      mocks.getServerIdentity.mockResolvedValue({ id: USER_B, store_id: null, role: "customer", email: "intruso@x.com" });
      const dbDeny = createFlexibleMockDb((table) => {
        if (table === "tourism_trips") {
          return { data: { id: TRIP_A, store_id: STORE_A, customer_id: USER_A, client_email: "dono@a.com" }, error: null };
        }
        if (table === "profiles") return { data: { cpf: "000" }, error: null };
        return { data: [], error: null };
      });
      mocks.getServerClient.mockReturnValue(dbDeny.client);

      await expect(
        submitAndAutoMatchCustomerReceiptFn({
          data: {
            tripId: TRIP_A,
            receiptFileUrl: "https://signed.example/proof.pdf",
            ocrAmountCents: 50000,
            ocrPaymentDate: "2027-05-10",
            installments: [],
          },
        }),
      ).rejects.toThrow(/Acesso negado/i);

      mocks.getServerIdentity.mockResolvedValue({ id: USER_A, store_id: null, role: "customer", email: "dono@a.com" });
      const dbOk = createFlexibleMockDb((table, action) => {
        if (table === "tourism_trips") {
          return { data: { id: TRIP_A, store_id: STORE_A, customer_id: USER_A, client_email: "dono@a.com" }, error: null };
        }
        if (table === "profiles") return { data: { cpf: "11122233344" }, error: null };
        if (table === "travel_trip_installment_boletos") {
          if (action === "update") {
            return { data: { id: "bol-1" }, error: null };
          }
          return {
            data: [
              {
                id: "bol-1",
                trip_id: TRIP_A,
                installment_number: 1,
                total_installments: 1,
                due_date: "2027-05-15",
                amount_cents: 50000,
                currency: "BRL",
                operator_slug: "frt",
                payment_channel: "boleto_bancario",
                status: "pending",
              },
            ],
            error: null,
          };
        }
        return { data: null, error: null };
      });
      mocks.getServerClient.mockReturnValue(dbOk.client);

      const matchRes = await submitAndAutoMatchCustomerReceiptFn({
        data: {
          tripId: TRIP_A,
          receiptFileUrl: "https://signed.example/proof.pdf",
          ocrAmountCents: 50000,
          ocrPaymentDate: "2027-05-10",
          ocrPayerName: "João Dono",
          installments: [],
        },
      });
      expect(matchRes.matchedInstallmentId).toBe("bol-1");
      // Cliente nunca pode auto-quitar ("reconciled") sem validação da agência
      expect(matchRes.newStatus).toBe("receipt_uploaded");
      const updateOp = dbOk.ops.find(
        (o) => o.table === "travel_trip_installment_boletos" && o.action === "update",
      );
      expect(updateOp?.payload?.status).toBe("receipt_uploaded");
      expect(updateOp?.payload?.reconciled_at).toBeNull();
    });
  });

  describe("5. Excursões em Grupo & Parcelas Unificadas", () => {
    it("cria registro espelho em tourism_trips e trip_passengers ao reservar excursão", async () => {
      const db = createFlexibleMockDb((table, action) => {
        if (table === "tourism_experiences") {
          return {
            data: {
              id: TOUR_A,
              title: "Excursão Beto Carrero",
              destination: "Penha",
              price_cents: 45000,
              total_seats: 46,
              available_seats: 20,
              seats: [{ seat_number: 1, status: "available" }],
              rooms: [],
              description: "{}",
              store_id: STORE_A,
              hotels: [],
              transfers: [],
              tours: [],
              itinerary: [],
            },
            error: null,
          };
        }
        if (table === "tourism_trips" && action === "insert") {
          return { data: { id: TRIP_A }, error: null };
        }
        return { data: null, error: null };
      });
      mocks.getServerClient.mockReturnValue(db.client);

      const res = await bookGroupTourReservation({
        data: {
          tourId: TOUR_A,
          primaryContact: {
            name: "Carlos Excursionista",
            email: "carlos@a.com",
            phone: "49999990000",
          },
          adultsCount: 1,
          childrenCount: 0,
          childrenAges: [],
          roomPreference: "shared",
          selectedSeats: [1],
          delegateCompanionForms: false,
          paymentMethod: "pix",
        },
      });

      expect(res.success).toBe(true);
      expect(res.tripId).toBe(TRIP_A);
      expect(db.ops.some((o) => o.table === "tourism_trips" && o.action === "insert")).toBe(true);
      expect(db.ops.some((o) => o.table === "trip_passengers" && o.action === "insert")).toBe(true);
    });

    it("rejeita acesso cross-store em listBookingInstallments e liquida boleto canônico em markInstallmentPaid", async () => {
      mocks.getServerIdentity.mockResolvedValue({ id: STAFF_A, store_id: STORE_A, role: "owner", email: "staff@a.com" });
      const db = createFlexibleMockDb((table) => {
        if (table === "travel_trip_installment_boletos") {
          return {
            data: [
              {
                id: "bol-99",
                store_id: STORE_A,
                trip_id: TRIP_A,
                installment_number: 1,
                total_installments: 2,
                amount_cents: 120000,
                due_date: "2027-08-01",
                status: "pending",
                payment_channel: "boleto_bancario",
              },
            ],
            error: null,
          };
        }
        if (table === "tourism_trips") return { data: [{ id: TRIP_A, client_name: "Maria Silva" }], error: null };
        return { data: [], error: null };
      });
      mocks.getServerClient.mockReturnValue(db.client);

      await expect(listBookingInstallments({ data: { storeId: STORE_B } })).rejects.toThrow(/não autorizado/i);

      const list = await listBookingInstallments({ data: { storeId: null, tripId: null } });
      expect(list[0]?.passenger_name).toBe("Maria Silva");
      expect(list[0]?.amount).toBe(1200);

      const dbPay = createFlexibleMockDb((table) => {
        if (table === "travel_trip_installment_boletos") {
          return { data: { id: "bol-99", store_id: STORE_A }, error: null };
        }
        return { data: null, error: null };
      });
      mocks.getServerClient.mockReturnValue(dbPay.client);

      const paid = await markInstallmentPaid({
        data: { id: DOC_A, payment_method: "pix", transaction_reference: null },
      });
      expect(paid.success).toBe(true);
      const bolUpdate = dbPay.ops.find(
        (o) => o.table === "travel_trip_installment_boletos" && o.action === "update",
      );
      expect(bolUpdate?.payload?.status).toBe("reconciled");
    });
  });

  describe("6. Invariantes Estruturais da Migration RLS & RPCs", () => {
    it("garante existência de is_trip_member_or_owner e remoção de policy ampla anônima", () => {
      const sql = readFileSync(
        path.resolve(process.cwd(), "supabase/migrations/20270530000000_tourism_e2e_rls_contracts_boletos_sync.sql"),
        "utf8",
      );
      expect(sql).toContain("CREATE OR REPLACE FUNCTION public.is_trip_member_or_owner");
      expect(sql).toContain('DROP POLICY IF EXISTS "travel_trip_official_documents_read"');
      expect(sql).toContain('DROP POLICY IF EXISTS "travel_trip_installment_boletos_access"');
      expect(sql).toContain('CREATE POLICY "travel_trip_installment_boletos_select"');
      expect(sql).toContain("ADD COLUMN IF NOT EXISTS lead_id UUID");
      expect(sql).toContain("CREATE OR REPLACE FUNCTION public.convert_accepted_travel_proposal_staff");
      expect(sql).toContain("CREATE OR REPLACE FUNCTION public.sign_public_travel_contract");
      expect(sql).toContain("CREATE OR REPLACE FUNCTION public.apply_operator_voucher_atomic");
      expect(sql).toContain("REVOKE ALL ON FUNCTION public.apply_operator_voucher_atomic(UUID, UUID, UUID, UUID, JSONB, TEXT) FROM PUBLIC, anon, authenticated;");
    });
  });

  describe("7. Onda 1.B1 — Absorção Financeira, Itinerários e Reacomodação", () => {
    it("nativiza recordTravelSalePayment em travel-financials com idempotência e isolamento de loja", async () => {
      const { recordTravelSalePayment } = await import("./travel-financials.functions");
      mocks.requireFinance.mockResolvedValue({
        id: USER_A,
        store_id: STORE_A,
        role: "finance",
      });

      const db = createFlexibleMockDb(
        () => ({ data: null, error: null }),
        async () => ({
          data: { success: true, replayed: false, payment_id: "pay-1", ledger_id: "led-1", sale_id: DOC_A },
          error: null,
        }),
      );
      mocks.getServerClient.mockReturnValue(db.client);

      const res = await recordTravelSalePayment({
        data: {
          saleId: DOC_A,
          amountCents: 250000,
          paymentMethod: "pix",
          idempotencyKey: "pix-sale-001",
          externalReference: null,
          metadata: { source: "w1-test" },
        },
      });
      expect(res.success).toBe(true);
      expect(db.client.rpc).toHaveBeenCalledWith(
        "record_travel_sale_payment",
        expect.objectContaining({
          p_idempotency_key: `${STORE_A}:pix-sale-001`,
          p_external_reference: null,
        }),
      );
    });

    it("setFlightItineraryActive rejeita outra loja e alterna itinerário ativo na própria loja", async () => {
      const { setFlightItineraryActive } = await import("./travel-flights.functions");
      mocks.getServerIdentity.mockResolvedValue({ id: USER_A, store_id: STORE_A, role: "owner" });

      const dbCross = createFlexibleMockDb((table) => {
        if (table === "travel_flight_itineraries") return { data: { id: "it-x", store_id: STORE_B, trip_id: TRIP_A }, error: null };
        return { data: null, error: null };
      });
      mocks.getServerClient.mockReturnValue(dbCross.client);
      await expect(setFlightItineraryActive({ data: { itineraryId: DOC_A, tripId: null } })).rejects.toThrow(/não autorizado/i);

      const dbOwn = createFlexibleMockDb((table) => {
        if (table === "travel_flight_itineraries") return { data: { id: DOC_A, store_id: STORE_A, trip_id: TRIP_A }, error: null };
        return { data: null, error: null };
      });
      mocks.getServerClient.mockReturnValue(dbOwn.client);
      const ok = await setFlightItineraryActive({ data: { itineraryId: DOC_A, tripId: null } });
      expect(ok.success).toBe(true);
      expect(dbOwn.ops.filter((o) => o.table === "travel_flight_itineraries" && o.action === "update").length).toBe(2);
    });

    it("createFlightAlternative calcula diferença determinística, seleciona e resolve caso na tabela canônica", async () => {
      const { createFlightAlternative, selectFlightAlternative, resolveChangeCaseWithItinerary } = await import(
        "./travel-reaccommodation.functions"
      );
      mocks.getServerIdentity.mockResolvedValue({ id: USER_A, store_id: STORE_A, role: "owner" });

      const dbCreate = createFlexibleMockDb((table, action, op) => {
        if (table === "travel_flight_change_cases") {
          return { data: { id: DOC_A, store_id: STORE_A, original_itinerary_id: "orig-it" }, error: null };
        }
        if (table === "travel_flight_segments" && op.filters.some((f) => f[1] === "orig-it")) {
          return {
            data: [
              {
                segment_order: 1,
                origin_iata: "GRU",
                destination_iata: "MIA",
                departure_at: "2026-11-10T10:00:00Z",
                arrival_at: "2026-11-10T18:00:00Z",
              },
            ],
            error: null,
          };
        }
        if (table === "travel_flight_segments") {
          return {
            data: [
              {
                segment_order: 1,
                origin_iata: "GRU",
                destination_iata: "FLL",
                departure_at: "2026-11-11T10:00:00Z",
                arrival_at: "2026-11-11T19:00:00Z",
              },
            ],
            error: null,
          };
        }
        if (table === "travel_flight_alternatives" && action === "insert") {
          return { data: { id: "alt-1", ...op.payload }, error: null };
        }
        return { data: { id: "alt-1", store_id: STORE_A, change_case_id: DOC_A }, error: null };
      });
      mocks.getServerClient.mockReturnValue(dbCreate.client);

      const alt = await createFlightAlternative({
        data: {
          changeCaseId: DOC_A,
          itineraryId: TRIP_A,
          source: "operator",
          differenceSummary: null,
          costDifference: 0,
          isSelected: false,
        },
      });
      expect(alt.difference_summary).toContain("Mudança de aeroporto");

      const sel = await selectFlightAlternative({ data: { alternativeId: TRIP_A } });
      expect(sel.id).toBeDefined();

      const res = await resolveChangeCaseWithItinerary({
        data: { caseId: DOC_A, confirmedItineraryId: TRIP_A, notes: null },
      });
      expect(res.success).toBe(true);
      const resolveOp = dbCreate.ops.find(
        (o) => o.table === "travel_flight_change_cases" && o.action === "update",
      );
      expect(resolveOp?.payload?.workflow_status).toBe("rebooking_confirmed");
    });
  });
});
