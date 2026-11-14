import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  extractNormalizedCatalogContext,
  extractSemanticLeadFieldsFromAnswers,
  getNicheContractBlueprint,
} from "@/lib/niches/unified-field-bridge";
import { ingestOmnichannelLead } from "./omnichannel-lead-ingestion";

const STORE_ID = "11111111-2222-3333-4444-555555555555";
const OTHER_STORE_ID = "99999999-8888-7777-6666-555555555555";
const QUOTE_ID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const LEAD_ID = "bbbbbbbb-cccc-dddd-eeee-ffffffffffff";
const CUSTOMER_ID = "cccccccc-dddd-eeee-ffff-111111111111";

// ── Estado do mock para testes BFF de compileContractFromQuote / requestPublicQuote / issueLeadContract ──
type TableResponses = Record<string, any>;
type RpcResponses = Record<string, (params: any) => any>;
let currentResponses: TableResponses = {};
let currentRpcResponses: RpcResponses = {};
let recordedInserts: Array<{ table: string; payload: any }> = [];
let recordedUpdates: Array<{ table: string; payload: any }> = [];
let recordedRpcs: Array<{ fn: string; params: any }> = [];

function makeTableQueryBuilder(tableName: string) {
  const ctx: { op: "select" | "insert" | "update" | "delete"; payload?: any; filters: Record<string, any> } = {
    op: "select",
    filters: {},
  };

  const resolveResult = () => {
    const handler = currentResponses[tableName];
    if (typeof handler === "function") {
      return handler(ctx);
    }
    return handler ?? { data: null, error: null };
  };

  const builder: any = {
    select: vi.fn(() => builder),
    insert: vi.fn((payload: any) => {
      ctx.op = "insert";
      ctx.payload = payload;
      recordedInserts.push({ table: tableName, payload });
      return builder;
    }),
    update: vi.fn((payload: any) => {
      ctx.op = "update";
      ctx.payload = payload;
      recordedUpdates.push({ table: tableName, payload });
      return builder;
    }),
    delete: vi.fn(() => {
      ctx.op = "delete";
      return builder;
    }),
    eq: vi.fn((col: string, val: any) => {
      ctx.filters[col] = val;
      return builder;
    }),
    neq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    or: vi.fn(() => builder),
    ilike: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(async () => resolveResult()),
    single: vi.fn(async () => resolveResult()),
    then: (onFulfilled: any, onRejected?: any) => Promise.resolve(resolveResult()).then(onFulfilled, onRejected),
  };

  return builder;
}

vi.mock("@tanstack/react-start", () => ({
  createServerFn: vi.fn(() => {
    const fnBuilder: any = {
      validator: vi.fn((validatorFn: any) => {
        fnBuilder._validator = validatorFn;
        return fnBuilder;
      }),
      handler: vi.fn((handlerFn: any) => {
        const callable = async (args: any) => {
          let data = args?.data;
          if (fnBuilder._validator && data !== undefined) {
            data =
              typeof fnBuilder._validator === "function"
                ? fnBuilder._validator(data)
                : fnBuilder._validator.parse(data);
          }
          return handlerFn({ data });
        };
        callable.handler = handlerFn;
        return callable;
      }),
    };
    return fnBuilder;
  }),
}));

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: vi.fn((table: string) => makeTableQueryBuilder(table)),
    rpc: vi.fn(async (fn: string, params: any) => {
      recordedRpcs.push({ fn, params });
      const handler = currentRpcResponses[fn];
      if (typeof handler === "function") {
        return handler(params);
      }
      if (fn === "create_quote") return { data: QUOTE_ID, error: null };
      if (fn === "deduplicate_and_link_lead_to_customer") return { data: CUSTOMER_ID, error: null };
      return { data: null, error: null };
    }),
  }),
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn(async () => ({
    id: "00000000-0000-0000-0000-000000000001",
    store_id: STORE_ID,
    role: "owner",
  })),
  assertStoreAccess: vi.fn((identity: any) => {
    if (!identity?.store_id) {
      throw new Error("Acesso negado.");
    }
  }),
}));

import { compileContractFromQuote } from "./contract-compiler.functions";
import { requestPublicQuote } from "./quotes.functions";
import { issueLeadContract } from "./crm.functions";

// ── Helper de mock para ingestOmnichannelLead ────────────────────────────────
function createOmnichannelMockDb(opts: {
  storeExists?: boolean;
  existingLeads?: any[];
  failFirstLeadInsert?: boolean;
  existingCustomer?: any;
}) {
  const ops: Array<{ table: string; op: string; payload?: any }> = [];
  let leadInsertAttempt = 0;

  const makeBuilder = (table: string) => {
    let op = "select";
    let payload: any;
    const filters: Record<string, any> = {};

    const execute = async () => {
      ops.push({ table, op, payload });
      if (table === "stores") {
        if (opts.storeExists === false) return { data: null, error: null };
        return {
          data: {
            id: STORE_ID,
            custom_inquiry_fields: [{ id: "q_embarque", label: "Local de Embarque" }],
          },
          error: null,
        };
      }
      if (table === "leads_crm") {
        if (op === "select") {
          return { data: opts.existingLeads || [], error: null };
        }
        if (op === "insert") {
          leadInsertAttempt += 1;
          if (opts.failFirstLeadInsert && leadInsertAttempt === 1) {
            return { data: null, error: { message: "column document does not exist" } };
          }
          return { data: { id: LEAD_ID }, error: null };
        }
        if (op === "update") {
          return { data: { id: filters.id || LEAD_ID }, error: null };
        }
      }
      if (table === "customers_crm") {
        if (op === "select") return { data: opts.existingCustomer || null, error: null };
        if (op === "insert") return { data: { id: CUSTOMER_ID }, error: null };
        if (op === "update") return { data: { id: CUSTOMER_ID }, error: null };
      }
      if (table === "lead_activities") {
        return { data: { id: "act-1" }, error: null };
      }
      return { data: null, error: null };
    };

    const builder: any = {
      select: vi.fn(() => builder),
      insert: vi.fn((p: any) => {
        op = "insert";
        payload = p;
        return builder;
      }),
      update: vi.fn((p: any) => {
        op = "update";
        payload = p;
        return builder;
      }),
      eq: vi.fn((col: string, val: any) => {
        filters[col] = val;
        return builder;
      }),
      in: vi.fn(() => builder),
      or: vi.fn(() => builder),
      ilike: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      maybeSingle: vi.fn(async () => {
        const res = await execute();
        if (Array.isArray(res.data)) {
          return { data: res.data[0] || null, error: res.error };
        }
        return res;
      }),
      single: vi.fn(execute),
      then: (onFulfilled: any, onRejected?: any) => execute().then(onFulfilled, onRejected),
    };
    return builder;
  };

  return {
    ops,
    db: {
      from: vi.fn((t: string) => makeBuilder(t)),
      rpc: vi.fn(async () => ({ data: null, error: null })),
    },
  };
}

describe("Sincronizacao Omnichannel End-to-End & Ponte Multi-Nicho", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentResponses = {};
    currentRpcResponses = {};
    recordedInserts = [];
    recordedUpdates = [];
    recordedRpcs = [];
  });

  describe("1. Ponte de Campos Semanticos & Catalogo CMS", () => {
    it("extrai campos canonicos de respostas dinamicas de formularios/quiz", () => {
      const semantic = extractSemanticLeadFieldsFromAnswers(
        {
          destino_desejado: "Bonito / MS",
          data_ida: "10/07/2027",
          data_volta: "15/07/2027",
          adultos: "3",
          criancas: "1",
          cpf_titular: "123.456.789-09",
          local_embarque: "Centro SMO",
          orcamento_estimado: "R$ 4.500,00",
        },
        { local_embarque: "Ponto de Embarque Preferencial" },
      );

      expect(semantic.destination).toBe("Bonito / MS");
      expect(semantic.travelStart).toBe("2027-07-10");
      expect(semantic.travelEnd).toBe("2027-07-15");
      expect(semantic.paxAdults).toBe(3);
      expect(semantic.paxChildren).toBe(1);
      expect(semantic.paxCount).toBe(4);
      expect(semantic.document).toBe("12345678909");
      expect(semantic.customFields.boarding_point).toBe("Centro SMO");
      expect(semantic.estimatedValueCents).toBe(450000);
      expect(semantic.notesAppend).toContain("Ponto de Embarque Preferencial: Centro SMO");
    });

    it("normaliza pacote CMS (products + metadata.travel_package) preservando roteiro e voos", () => {
      const catalog = extractNormalizedCatalogContext({
        origin: "product",
        row: {
          id: "prod-1",
          title: "Expedicao Jalapao 6 Dias",
          price_cents: 599000,
          metadata: {
            travel_package: {
              destination_city: "Palmas / Jalapao",
              duration_days: 6,
              includes: ["4x4 Privativo", "Hospedagem", "Guia"],
              itinerary: [{ day: 1, title: "Chegada em Palmas", description: "Transfer hotel" }],
            },
          },
        },
      });

      expect(catalog.nicheId).toBe("tourism");
      expect(catalog.destination).toBe("Palmas / Jalapao");
      expect(catalog.priceCents).toBe(599000);
      expect(catalog.includes).toEqual(["4x4 Privativo", "Hospedagem", "Guia"]);
      expect(catalog.itinerary).toHaveLength(1);
    });

    it("mapeia blueprint contratual correto para Turismo, Automotivo e Imobiliario", () => {
      expect(getNicheContractBlueprint("tourism").defaultTemplateId).toBe("template-turismo-pacote-viagem");
      expect(getNicheContractBlueprint("automotive").defaultTemplateId).toBe("template-compra-venda-veiculo");
      expect(getNicheContractBlueprint("real_estate").defaultTemplateId).toBe("template-locacao-imobiliaria");
    });

    it("normaliza pacote CMS completo em attributes.travel (TravelPackageData) sem vazar objetos crus", () => {
      const catalog = extractNormalizedCatalogContext({
        origin: "product",
        row: {
          id: "prod-travel-attr-1",
          title: "Cancun All-Inclusive Resort",
          price_cents: 899000,
          attributes: {
            voltagem_nao_aplicavel: "N/A",
            travel: {
              destination: { name: "Cancun", iata_gateway: "CUN" },
              flight_details: {
                airline_name: "Aeromexico",
                departure_iata: "GRU",
                arrival_iata: "CUN",
                flight_number_out: "AM015",
                departure_time_out: "23:40",
                arrival_time_out: "06:30",
                baggage_included: true,
              },
              lodgings: [
                {
                  id: "hotel-moon",
                  name: "Moon Palace Cancun",
                  location: "Zona Hoteleira",
                  meal_plan: "All-Inclusive",
                  stars: 5,
                },
              ],
              itinerary_days: [
                { day_number: 1, title: "Embarque e Chegada", morning: "Check-in", afternoon: "Praia livre" },
              ],
              inclusions: ["Aereo ida e volta", "All-Inclusive Resort 5*"],
              exclusions: ["Taxa ambiental local"],
              boarding_requirements: ["Passaporte valido por 6 meses"],
              cancellation_policy: "Multa de 20% ate 15 dias antes",
              room_rates: { double_cents: 899000 },
              custom_inquiry_fields: [{ id: "q_passaporte", label: "Passaporte valido?" }],
            },
          },
        },
      });

      expect(catalog.nicheId).toBe("tourism");
      expect(catalog.destination).toBe("Cancun");
      expect(catalog.flights).toHaveLength(1);
      expect(catalog.flights[0]?.airline_name).toBe("Aeromexico");
      expect(catalog.flights[0]?.origin_iata).toBe("GRU");
      expect(catalog.flights[0]?.destination_iata).toBe("CUN");
      expect(catalog.hotels).toHaveLength(1);
      expect(catalog.hotels[0]?.hotel_name).toBe("Moon Palace Cancun");
      expect(catalog.itinerary).toHaveLength(1);
      expect(catalog.includes).toEqual(["Aereo ida e volta", "All-Inclusive Resort 5*"]);
      expect(catalog.excludes).toEqual(["Taxa ambiental local"]);
      expect(catalog.boardingRequirements).toEqual(["Passaporte valido por 6 meses"]);
      expect(catalog.cancellationPolicy).toBe("Multa de 20% ate 15 dias antes");
      expect(catalog.roomRates?.double_cents).toBe(899000);
      expect(catalog.customInquiryFields).toHaveLength(1);
      const leakedObject = catalog.specsRows.some(
        (r) => r.value.includes("[object Object]") || r.key === "travel" || r.key === "flight_details",
      );
      expect(leakedObject).toBe(false);
    });
  });

  describe("2. Ingestao Omnichannel no CRM Kanban (leads_crm + customers_crm)", () => {
    it("rejeita storeId invalido ou loja inexistente (testes negativos)", async () => {
      const { db } = createOmnichannelMockDb({ storeExists: false });

      const invalid = await ingestOmnichannelLead(db, {
        storeId: "nao-e-uuid",
        source: "whatsapp_link",
        fullName: "Joao",
      });
      expect(invalid).toEqual({
        success: false,
        leadId: null,
        customerId: null,
        createdNewLead: false,
        reason: "invalid_store",
      });

      const missing = await ingestOmnichannelLead(db, {
        storeId: STORE_ID,
        source: "whatsapp_link",
        fullName: "Joao",
      });
      expect(missing).toEqual({
        success: false,
        leadId: null,
        customerId: null,
        createdNewLead: false,
        reason: "store_not_found",
      });
    });

    it("captura lead sem e-mail usando fallback seguro e grava custom_fields + customers_crm", async () => {
      const { db, ops } = createOmnichannelMockDb({ storeExists: true, existingLeads: [] });

      const result = await ingestOmnichannelLead(db, {
        storeId: STORE_ID,
        source: "storefront_listing",
        sourceListingId: "cls-gramado-01",
        sourceListingOrigin: "classified",
        sourceListingTitle: "Natal Luz Gramado",
        fullName: "Fernanda Costa",
        phone: "(49) 99123-4567",
        customFields: {
          q_embarque: "Praca Central",
          destino: "Gramado / RS",
          cpf: "111.222.333-44",
        },
      });

      expect(result.success).toBe(true);
      expect(result.createdNewLead).toBe(true);
      expect(result.leadId).toBe(LEAD_ID);
      expect(result.customerId).toBe(CUSTOMER_ID);

      const leadInsert = ops.find((o) => o.table === "leads_crm" && o.op === "insert");
      expect(leadInsert?.payload.email).toContain("@sem-email.waesy.local");
      expect(leadInsert?.payload.destination).toBe("Gramado / RS");
      expect(leadInsert?.payload.document).toBe("11122233344");
      expect(leadInsert?.payload.custom_fields.email_provided).toBe(false);
      expect(leadInsert?.payload.custom_fields.source_listing_id).toBe("cls-gramado-01");
      expect(ops.some((o) => o.table === "lead_activities" && o.op === "insert")).toBe(true);
    });

    it("mescla respostas em card ativo existente quando telefone coincide para evitar duplicacao", async () => {
      const { db, ops } = createOmnichannelMockDb({
        storeExists: true,
        existingLeads: [
          {
            id: LEAD_ID,
            customer_id: CUSTOMER_ID,
            status: "new",
            custom_fields: { source_listing_id: "cls-1", preferencia_assento: "Janela" },
          },
        ],
      });

      const result = await ingestOmnichannelLead(db, {
        storeId: STORE_ID,
        source: "lead_form",
        sourceListingId: "cls-1",
        fullName: "Marcos Lima",
        phone: "49999991111",
        customFields: { restricao_alimentar: "Vegetariano" },
      });

      expect(result.success).toBe(true);
      expect(result.createdNewLead).toBe(false);
      const leadUpdate = ops.find((o) => o.table === "leads_crm" && o.op === "update");
      expect(leadUpdate?.payload.custom_fields.preferencia_assento).toBe("Janela");
      expect(leadUpdate?.payload.custom_fields.restricao_alimentar).toBe("Vegetariano");
    });

    it("aciona fallback minimalPayload quando schema legado rejeita coluna opcional (resiliencia pre-migration)", async () => {
      const { db, ops } = createOmnichannelMockDb({
        storeExists: true,
        existingLeads: [],
        failFirstLeadInsert: true,
      });

      const res = await ingestOmnichannelLead(db, {
        storeId: STORE_ID,
        source: "builder",
        fullName: "Juliana Prado",
        phone: "49988882222",
      });

      expect(res.success).toBe(true);
      expect(ops.filter((o) => o.table === "leads_crm" && o.op === "insert")).toHaveLength(2);
    });
  });

  describe("3. BFF Orcamento -> Contrato Tabular Multi-Nicho (compileContractFromQuote)", () => {
    it("bloqueia orcamento inexistente ou pertencente a outro tenant (teste negativo cross-tenant)", async () => {
      currentResponses = {
        quotes: () => ({ data: null, error: null }),
        quote_items: () => ({ data: [], error: null }),
        travel_proposals: () => ({ data: null, error: null }),
        stores: () => ({ data: null, error: null }),
      };

      await expect(
        compileContractFromQuote({
          data: { quoteId: QUOTE_ID },
        }),
      ).rejects.toThrow(/não encontrado/i);
    });

    it("compila orcamento automotivo com itens e custom_fields do lead em contrato com tabelas GFM", async () => {
      currentResponses = {
        quotes: ({ op }: any) => {
          if (op === "select") {
            return {
              data: {
                id: QUOTE_ID,
                store_id: STORE_ID,
                quote_number: "ORC-2026-099",
                customer_id: CUSTOMER_ID,
                guest_name: "Roberto Almeida",
                guest_phone: "49991112222",
                guest_email: "roberto@cliente.com",
                subtotal_cents: 8500000,
                discount_cents: 0,
                total_cents: 8500000,
                conditions: JSON.stringify({
                  niche_id: "automotive",
                  lead_id: LEAD_ID,
                  custom_fields: { pagamento_entrada: "R$ 35.000,00" },
                }),
                internal_notes: "Venda Toyota Corolla XEi 2021",
                valid_until: "2027-01-31T23:59:59Z",
              },
              error: null,
            };
          }
          return { data: { id: QUOTE_ID }, error: null };
        },
        quote_items: () => ({
          data: [
            {
              id: "item-1",
              title: "Toyota Corolla XEi 2.0 Flex 2021",
              sku: "COROLLA-2021",
              quantity: 1,
              unit_price_cents: 8500000,
              total_cents: 8500000,
              metadata: { unit: "veiculo" },
            },
          ],
          error: null,
        }),
        travel_proposals: () => ({ data: null, error: null }),
        stores: () => ({
          data: {
            id: STORE_ID,
            name: "Motors Oeste Multimarcas",
            cnpj: "44555666000177",
            city: "Chapeco",
            state: "SC",
            niche_id: "automotive",
            settings: {},
          },
          error: null,
        }),
        leads_crm: () => ({
          data: {
            id: LEAD_ID,
            full_name: "Roberto Almeida",
            document: "12345678909",
            custom_fields: { placa: "QWE9R87", chassi: "9BRBL3HE5M0123456", quilometragem: "38.000 km" },
            pax_list: [],
          },
          error: null,
        }),
        customers_crm: () => ({
          data: {
            id: CUSTOMER_ID,
            full_name: "Roberto Almeida",
            document: "12345678909",
            custom_fields: {},
          },
          error: null,
        }),
        contracts: () => ({
          data: { id: "ctr-compiled-1", verification_code: "tok_compiled_1" },
          error: null,
        }),
        contract_versions: () => ({
          data: { id: "ver-compiled-1" },
          error: null,
        }),
        signature_envelopes: () => ({ data: { id: "env-1" }, error: null }),
      };

      const res = await compileContractFromQuote({
        data: { quoteId: QUOTE_ID },
      });

      expect(res.success).toBe(true);
      expect(res.contractId).toBe("ctr-compiled-1");
      expect(res.compiled.templateIdUsed).toBe("template-compra-venda-veiculo");
      expect(res.compiled.contentMarkdown).toContain("Toyota Corolla XEi 2.0 Flex 2021");
      expect(res.compiled.contentMarkdown).toContain("QWE9R87");
      expect(res.compiled.contentMarkdown).toContain("38.000 km");
      expect(res.compiled.contentMarkdown).toContain("| Item / Servico |");
      expect(res.compiled.contentMarkdown).not.toMatch(/\{\{[^}]+\}\}/);

      const ctrInsert = recordedInserts.find((r) => r.table === "contracts");
      expect(ctrInsert?.payload.store_id).toBe(STORE_ID);
      expect(ctrInsert?.payload.category).toBe("vehicle_sale");

      const quoteConv = recordedUpdates.find((r) => r.table === "quotes");
      expect(quoteConv?.payload.status).toBe("converted");
    });

    it("mantem isolado STORE_ID do tenant autenticado mesmo que caller passe ID de outro tenant no contexto", async () => {
      // Verifica que lookup usa store_id = STORE_ID (identity), nao OTHER_STORE_ID
      let queriedStoreFilter: string | undefined;
      currentResponses = {
        quotes: () => {
          queriedStoreFilter = STORE_ID;
          return { data: null, error: null };
        },
        quote_items: () => ({ data: [], error: null }),
        travel_proposals: () => ({ data: null, error: null }),
        stores: () => ({ data: null, error: null }),
      };

      await expect(
        compileContractFromQuote({
          data: { quoteId: OTHER_STORE_ID },
        }),
      ).rejects.toThrow();
      expect(queriedStoreFilter).toBe(STORE_ID);
    });
  });

  describe("4. Orcamento Publico, CRM -> Contrato Canonico & Invariantes Anti-Legado (Wave 5)", () => {
    it("requestPublicQuote espelha lead via ingestOmnichannelLead e encaminha vinculos para RPC create_quote", async () => {
      currentResponses = {
        stores: () => ({
          data: { id: STORE_ID, custom_inquiry_fields: [{ id: "tipo_evento", label: "Tipo de Evento" }] },
          error: null,
        }),
        leads_crm: ({ op }: any) => {
          if (op === "select") return { data: [], error: null };
          return { data: { id: LEAD_ID }, error: null };
        },
        customers_crm: ({ op }: any) => {
          if (op === "select") return { data: null, error: null };
          return { data: { id: CUSTOMER_ID }, error: null };
        },
        lead_activities: () => ({ data: { id: "act-quote-1" }, error: null }),
        quote_items: () => ({ data: { id: "qi-1" }, error: null }),
      };

      const res = await requestPublicQuote({
        data: {
          store_id: STORE_ID,
          customer_name: "Camila Nogueira",
          customer_email: "camila@cliente.com",
          customer_phone: "49999887766",
          service_category: "Buffet Corporativo",
          project_description: "Evento empresarial para 120 pessoas com coquetel",
          urgency: "alta",
          preferred_date: "2027-08-20",
          estimated_budget_cents: 1850000,
          source_listing_id: "cls-buffet-01",
          source_listing_origin: "classified",
          niche_id: "events",
          custom_fields: { regime_alimentar: "Sem gluten" },
        },
      });

      expect(res.success).toBe(true);
      expect(res.quote_id).toBe(QUOTE_ID);
      expect(res.lead_id).toBe(LEAD_ID);

      const leadInsert = recordedInserts.find((r) => r.table === "leads_crm");
      expect(leadInsert).toBeDefined();

      const rpcCall = recordedRpcs.find((r) => r.fn === "create_quote");
      expect(rpcCall?.params.p_store_id).toBe(STORE_ID);
      expect(rpcCall?.params.p_lead_id).toBe(LEAD_ID);
      expect(rpcCall?.params.p_customer_id).toBe(CUSTOMER_ID);
      expect(rpcCall?.params.p_source_listing_id).toBe("cls-buffet-01");
      expect(rpcCall?.params.p_source_listing_origin).toBe("classified");
      expect(rpcCall?.params.p_niche_id).toBe("events");
      expect(rpcCall?.params.p_custom_fields?.regime_alimentar).toBe("Sem gluten");
    });

    it("requestPublicQuote rejeita store_id invalido e descricao curta sem acionar RPC (teste negativo)", async () => {
      await expect(
        requestPublicQuote({
          data: {
            store_id: "not-a-uuid",
            customer_name: "Camila",
            customer_phone: "49999887766",
            project_description: "Oi",
            urgency: "media",
          },
        }),
      ).rejects.toThrow();

      expect(recordedRpcs.filter((r) => r.fn === "create_quote")).toHaveLength(0);
    });

    it("issueLeadContract grava diretamente em contracts + contract_versions + signature_envelopes sem gravar em travel_contracts", async () => {
      currentResponses = {
        leads_crm: () => ({
          data: {
            id: LEAD_ID,
            store_id: STORE_ID,
            customer_id: CUSTOMER_ID,
            full_name: "Marcos Vinicius",
            document: "32165498700",
            email: "marcos@cliente.com",
            phone: "49991234567",
            destination: "Bariloche Neve",
            travel_start: "2027-07-10",
            travel_end: "2027-07-17",
            custom_fields: { ponto_embarque: "Chapeco", categoria_hotel: "4 Estrelas" },
            pax_list: [{ name: "Marcos Vinicius", document: "32165498700" }],
          },
          error: null,
        }),
        stores: () => ({
          data: {
            id: STORE_ID,
            name: "Waesy Turismo Ltda",
            cnpj: "11222333000144",
            city: "Chapeco",
            state: "SC",
            niche_id: "tourism",
            settings: {},
          },
          error: null,
        }),
        customers_crm: () => ({
          data: { id: CUSTOMER_ID, full_name: "Marcos Vinicius", document: "32165498700", custom_fields: {} },
          error: null,
        }),
        travel_proposals: () => ({ data: null, error: null }),
        contracts: () => ({
          data: { id: "ctr-lead-1", verification_code: "CTR-TEST-1" },
          error: null,
        }),
        contract_versions: () => ({ data: { id: "ver-lead-1" }, error: null }),
        signature_envelopes: () => ({ data: { id: "env-lead-1" }, error: null }),
      };

      const res = await issueLeadContract({
        data: {
          leadId: LEAD_ID,
          contractTitle: "Contrato Bariloche Inverno 2027",
          packageSummary: "Pacote completo 7 noites com aereo e hotel 4 estrelas",
          totalValueCents: 745000,
          paymentConditions: "10x sem juros no cartao ou Pix a vista",
        },
      });

      expect(res.success).toBe(true);
      expect(recordedInserts.some((r) => r.table === "travel_contracts")).toBe(false);

      const ctrInsert = recordedInserts.find((r) => r.table === "contracts");
      const verInsert = recordedInserts.find((r) => r.table === "contract_versions");
      const envInsert = recordedInserts.find((r) => r.table === "signature_envelopes");

      expect(ctrInsert?.payload.store_id).toBe(STORE_ID);
      expect(ctrInsert?.payload.lead_id).toBe(LEAD_ID);
      expect(verInsert?.payload.contract_id).toBe("ctr-lead-1");
      expect(verInsert?.payload.content_markdown).toContain("|");
      expect(verInsert?.payload.content_markdown).toContain("Bariloche");
      expect(envInsert?.payload.contract_version_id).toBe("ver-lead-1");
      expect(envInsert?.payload.signer_name).toBe("Marcos Vinicius");
      expect(envInsert?.payload.status).toBe("pending");
    });

    it("issueLeadContract bloqueia emissao quando lead nao existe ou pertence a outro tenant (teste negativo)", async () => {
      currentResponses = {
        leads_crm: () => ({ data: null, error: null }),
        stores: () => ({ data: null, error: null }),
      };

      await expect(
        issueLeadContract({
          data: {
            leadId: LEAD_ID,
            contractTitle: "Contrato Nao Autorizado",
            packageSummary: "Resumo bloqueado",
            totalValueCents: 100000,
          },
        }),
      ).rejects.toThrow(/não encontrado/i);

      expect(recordedInserts.filter((r) => r.table === "contracts")).toHaveLength(0);
      expect(recordedInserts.filter((r) => r.table === "signature_envelopes")).toHaveLength(0);
    });

    it("garante integridade estatica anti-legado em migration SQL, fatura publica, visualizador Office e criador de orcamentos", () => {
      const root = process.cwd();
      const sql = fs.readFileSync(
        path.join(root, "supabase/migrations/20270406000000_legacy_purge_quotes_and_tabular_travel_contracts.sql"),
        "utf8",
      );
      expect(sql).toContain("DROP FUNCTION IF EXISTS public.create_quote(UUID, UUID, TEXT, TEXT, TEXT, TIMESTAMPTZ, TEXT, TEXT)");
      expect(sql).toContain("p_lead_id");
      expect(sql).toContain("INSERT INTO public.signature_envelopes");

      const fatura = fs.readFileSync(path.join(root, "src/routes/_store.fatura.$token.tsx"), "utf8");
      expect(fatura).not.toContain("/workspace/");

      const viewer = fs.readFileSync(
        path.join(root, "src/components/commerce/dynamic-sections/office-contract-viewer.tsx"),
        "utf8",
      );
      expect(viewer).toContain("<ContractMarkdownRenderer");

      const novoOrc = fs.readFileSync(path.join(root, "src/routes/workspace.orcamentos.novo.tsx"), "utf8");
      expect(novoOrc).not.toContain("@/lib/niche-semantics");
    });
  });
});
