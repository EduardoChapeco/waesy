import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerClient: vi.fn(),
  getServerIdentity: vi.fn(),
  requireStaff: vi.fn(),
  executeUnifiedAiCall: vi.fn(),
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

vi.mock("@/lib/supabase", () => ({
  getServerClient: mocks.getServerClient,
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: mocks.getServerIdentity,
  requireStaff: mocks.requireStaff,
}));

vi.mock("../api-orchestrator.functions", () => ({
  executeUnifiedAiCall: mocks.executeUnifiedAiCall,
}));

import {
  createTravelProposal,
  getPublicTravelProposalByToken,
  getTravelProposalById,
  updateTravelProposal,
} from "../travel-proposal.functions";

const STORE_ID = "11111111-1111-4111-8111-111111111111";
const SELLER_ID = "22222222-2222-4222-8222-222222222222";
const VISITOR_ID = "33333333-3333-4333-8333-333333333333";
const LEAD_ID = "44444444-4444-4444-8444-444444444444";
const CUSTOMER_ID = "55555555-5555-4555-8555-555555555555";
const PROPOSAL_ID = "66666666-6666-4666-8666-666666666666";
const PUBLIC_TOKEN = "prop_estevan_porto_seguro_2027";

interface MockDbState {
  proposals: any[];
  stores: any[];
  profiles: any[];
  leads: any[];
  customers: any[];
  travelQuotes: any[];
  lastInsertedProposal?: any;
  lastUpdatedProposal?: any;
}

function createRelationalMockDb(state: MockDbState) {
  const selectCollection = (table: string) => {
    if (table === "travel_proposals") return state.proposals;
    if (table === "stores") return state.stores;
    if (table === "profiles") return state.profiles;
    if (table === "leads_crm") return state.leads;
    if (table === "customers_crm") return state.customers;
    if (table === "travel_quotes") return state.travelQuotes;
    return [];
  };

  const from = vi.fn((table: string) => {
    const eqFilters: Array<[string, any]> = [];
    let action: "select" | "insert" | "update" = "select";
    let payload: any = null;
    let maxRows = 100;

    const filterRows = () => {
      const source = selectCollection(table);
      return source
        .filter((row) =>
          eqFilters.every(([col, val]) => row?.[col] === val),
        )
        .slice(0, maxRows);
    };

    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn((col: string, val: any) => {
        eqFilters.push([col, val]);
        return chain;
      }),
      in: vi.fn(() => chain),
      limit: vi.fn((n: number) => {
        maxRows = n;
        return chain;
      }),
      insert: vi.fn((data: any) => {
        action = "insert";
        payload = data;
        if (table === "travel_proposals") {
          state.lastInsertedProposal = data;
        }
        return chain;
      }),
      update: vi.fn((data: any) => {
        action = "update";
        payload = data;
        if (table === "travel_proposals") {
          state.lastUpdatedProposal = data;
        }
        return chain;
      }),
      single: vi.fn(async () => {
        if (table === "travel_proposals" && action === "insert") {
          return { data: { id: PROPOSAL_ID }, error: null };
        }
        const rows = filterRows();
        return { data: rows[0] ?? null, error: null };
      }),
      maybeSingle: vi.fn(async () => {
        if (action === "update" && table === "travel_proposals") {
          const rows = filterRows();
          return { data: rows[0] ? { id: rows[0].id } : null, error: null };
        }
        const rows = filterRows();
        return { data: rows[0] ?? null, error: null };
      }),
      then: (resolve: (value: any) => any, reject?: (err: any) => any) => {
        if (action === "update" && table === "travel_proposals") {
          return Promise.resolve({ data: payload, error: null }).then(resolve, reject);
        }
        const rows = filterRows();
        return Promise.resolve({ data: rows, error: null }).then(resolve, reject);
      },
    };
    return chain;
  });

  const rpc = vi.fn(async () => ({ data: 1, error: null }));
  return { from, rpc };
}

describe("Travel Proposal CRM & Logged-in Seller Autofill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hidrata cliente do CRM/Kanban, agência e vendedor autenticado (Eduardo) ao criar proposta", async () => {
    const dbState: MockDbState = {
      stores: [
        {
          id: STORE_ID,
          name: "Excelência Tour São Miguel do Oeste",
          email: "atendimento@excelenciatour.com.br",
          phone: "(49) 3622-1000",
          logo_url: "https://cdn.waesy.test/logo.png",
          settings: { whatsapp: "(49) 99911-2233" },
        },
      ],
      profiles: [
        {
          id: SELLER_ID,
          full_name: "Eduardo",
          phone: "(49) 98877-6655",
        },
      ],
      leads: [
        {
          id: LEAD_ID,
          store_id: STORE_ID,
          customer_id: CUSTOMER_ID,
          full_name: "Estevan",
          email: "estevan@cliente.com.br",
          phone: "49999001122",
          custom_fields: { document: "123.456.789-00" },
        },
      ],
      customers: [
        {
          id: CUSTOMER_ID,
          store_id: STORE_ID,
          full_name: "Estevan",
          legal_name: null,
          document: "123.456.789-00",
          email: "estevan@cliente.com.br",
          phone: "49999001122",
          deleted_at: null,
        },
      ],
      proposals: [],
      travelQuotes: [],
    };

    mocks.requireStaff.mockResolvedValue({
      id: SELLER_ID,
      role: "seller",
      store_id: STORE_ID,
    });
    mocks.getServerIdentity.mockResolvedValue({
      id: SELLER_ID,
      role: "seller",
      store_id: STORE_ID,
      fullName: "Eduardo",
      email: "eduardo@excelenciatour.com.br",
      profile: { id: SELLER_ID, full_name: "Eduardo", phone: "(49) 98877-6655" },
    });
    mocks.getServerClient.mockReturnValue(createRelationalMockDb(dbState));

    const res = await createTravelProposal({
      data: {
        title: "Proposta Porto Seguro",
        destinationCity: "Porto Seguro",
        clientName: "Estevan",
        leadId: LEAD_ID,
      },
    });

    expect(res.success).toBe(true);
    expect(dbState.lastInsertedProposal).toBeDefined();
    expect(dbState.lastInsertedProposal.customer_id).toBe(CUSTOMER_ID);
    expect(dbState.lastInsertedProposal.lead_id).toBe(LEAD_ID);
    expect(dbState.lastInsertedProposal.client_email).toBe("estevan@cliente.com.br");
    expect(dbState.lastInsertedProposal.client_whatsapp).toBe("49999001122");
    expect(dbState.lastInsertedProposal.custom_fields.agent_name).toBe("Eduardo");
    expect(dbState.lastInsertedProposal.custom_fields.agent_whatsapp).toBe("(49) 98877-6655");
    expect(dbState.lastInsertedProposal.custom_fields.document).toBe("123.456.789-00");
  });

  it("enriquece proposta existente sem customer_id nem assinatura ao abrir no Studio com usuário Eduardo", async () => {
    const dbState: MockDbState = {
      stores: [
        {
          id: STORE_ID,
          name: "Excelência Tour São Miguel do Oeste",
          email: "atendimento@excelenciatour.com.br",
          phone: "(49) 3622-1000",
          logo_url: null,
          settings: { contactWhatsapp: "(49) 99911-2233" },
        },
      ],
      profiles: [
        {
          id: SELLER_ID,
          full_name: "Eduardo",
          phone: null,
        },
      ],
      leads: [],
      customers: [
        {
          id: CUSTOMER_ID,
          store_id: STORE_ID,
          full_name: "Estevan",
          legal_name: null,
          document: "12345678900",
          email: "estevan@cliente.com.br",
          phone: "49999001122",
          deleted_at: null,
        },
      ],
      proposals: [
        {
          id: PROPOSAL_ID,
          store_id: STORE_ID,
          created_by_profile_id: null,
          quote_id: null,
          lead_id: null,
          customer_id: null,
          public_token: PUBLIC_TOKEN,
          title: "Proposta Porto Seguro",
          destination_city: "Porto Seguro",
          client_name: "Estevan",
          client_whatsapp: "",
          client_email: null,
          custom_fields: {},
          pricing: {},
          flights: [],
          hotels: [],
          itinerary: [],
          transfers: [],
          tours: [],
          rooms: [],
          includes: [],
          excludes: [],
          status: "sent",
          visibility_mode: "public",
          is_hidden: false,
          valid_until: "2027-08-23T00:00:00.000Z",
          created_at: "2026-11-14T14:42:26.26+00:00",
          updated_at: "2026-11-14T14:42:26.26+00:00",
        },
      ],
      travelQuotes: [],
    };

    mocks.requireStaff.mockResolvedValue({
      id: SELLER_ID,
      role: "seller",
      store_id: STORE_ID,
    });
    mocks.getServerIdentity.mockResolvedValue({
      id: SELLER_ID,
      role: "seller",
      store_id: STORE_ID,
      fullName: "Eduardo",
      profile: { id: SELLER_ID, full_name: "Eduardo", phone: null },
    });
    mocks.getServerClient.mockReturnValue(createRelationalMockDb(dbState));

    const dto = await getTravelProposalById({ data: { id: PROPOSAL_ID } });
    expect(dto).not.toBeNull();
    expect(dto?.customer_id).toBe(CUSTOMER_ID);
    expect(dto?.selected_customer_label).toBe("Estevan");
    expect(dto?.client_email).toBe("estevan@cliente.com.br");
    expect(dto?.client_whatsapp).toBe("49999001122");
    expect(dto?.client_document).toBe("12345678900");
    expect(dto?.agent_name).toBe("Eduardo");
    expect(dto?.agency_whatsapp).toBe("(49) 99911-2233");
    expect(dto?.agent_whatsapp).toBe("(49) 99911-2233");
    expect(dto?.agency_email).toBe("atendimento@excelenciatour.com.br");
  });

  it("respeita override manual do consultor e protege PII na visualização pública com visitante civil autenticado", async () => {
    const dbState: MockDbState = {
      stores: [
        {
          id: STORE_ID,
          name: "Excelência Tour São Miguel do Oeste",
          email: "atendimento@excelenciatour.com.br",
          phone: "(49) 3622-1000",
          logo_url: null,
          settings: { whatsapp: "(49) 99911-2233" },
        },
      ],
      profiles: [
        {
          id: SELLER_ID,
          full_name: "Eduardo",
          phone: "(49) 98877-6655",
        },
      ],
      leads: [],
      customers: [],
      proposals: [
        {
          id: PROPOSAL_ID,
          store_id: STORE_ID,
          created_by_profile_id: SELLER_ID,
          customer_id: CUSTOMER_ID,
          public_token: PUBLIC_TOKEN,
          title: "Proposta Porto Seguro",
          destination_city: "Porto Seguro",
          client_name: "Estevan",
          client_whatsapp: "49999001122",
          client_email: "estevan@cliente.com.br",
          custom_fields: {},
          pricing: {},
          flights: [],
          hotels: [],
          itinerary: [],
          transfers: [],
          tours: [],
          rooms: [],
          includes: [],
          excludes: [],
          status: "sent",
          visibility_mode: "public",
          is_hidden: false,
          created_at: "2026-11-14T14:42:26.26+00:00",
          updated_at: "2026-11-14T14:42:26.26+00:00",
        },
      ],
      travelQuotes: [],
    };

    // Visitante civil autenticado com outro nome NÃO pode vazar em agent_name; mantém criador (Eduardo)
    mocks.getServerIdentity.mockResolvedValue({
      id: VISITOR_ID,
      role: "customer",
      store_id: null,
      fullName: "Visitante Anônimo",
      profile: { id: VISITOR_ID, full_name: "Visitante Anônimo", phone: "(11) 90000-0000" },
    });
    mocks.getServerClient.mockReturnValue(createRelationalMockDb(dbState));

    const publicDto = await getPublicTravelProposalByToken({ data: { token: PUBLIC_TOKEN } });
    expect(publicDto?.agent_name).toBe("Eduardo");
    expect(publicDto?.agent_whatsapp).toBe("(49) 98877-6655");
    expect(publicDto?.agency_whatsapp).toBe("(49) 99911-2233");
    expect(publicDto?.client_email).toBeNull();
    expect(publicDto?.client_whatsapp).toBe("");
    expect(publicDto?.customer_id).toBeNull();
    expect(publicDto?.selected_customer_label).toBeNull();

    // Staff atualiza vínculo CRM e assinatura explícita no Studio
    mocks.requireStaff.mockResolvedValue({
      id: SELLER_ID,
      role: "seller",
      store_id: STORE_ID,
    });
    const upd = await updateTravelProposal({
      data: {
        id: PROPOSAL_ID,
        patch: {
          customer_id: CUSTOMER_ID,
          client_email: "estevan.atualizado@cliente.com.br",
          client_document: "99988877766",
          agent_name: "Carlos Consultor",
          agent_whatsapp: "(49) 97777-8888",
        },
      },
    });
    expect(upd.success).toBe(true);
    expect(dbState.lastUpdatedProposal.customer_id).toBe(CUSTOMER_ID);
    expect(dbState.lastUpdatedProposal.client_email).toBe("estevan.atualizado@cliente.com.br");
    expect(dbState.lastUpdatedProposal.custom_fields.agent_name).toBe("Carlos Consultor");
    expect(dbState.lastUpdatedProposal.custom_fields.agent_whatsapp).toBe("(49) 97777-8888");
    expect(dbState.lastUpdatedProposal.custom_fields.document).toBe("99988877766");
  });

  it("contrato UI: Kanban/CRM repassam customerId e StudioSidebarEditor vincula combobox + assinatura", () => {
    const dossierSource = readFileSync(
      resolve(process.cwd(), "src/components/tourism/crm/TourismPipeCardDossier.tsx"),
      "utf8",
    );
    const comercialSource = readFileSync(
      resolve(process.cwd(), "src/routes/workspace.comercial.tsx"),
      "utf8",
    );
    const unifiedSource = readFileSync(
      resolve(process.cwd(), "src/components/tourism/unified-proposal-workspace.tsx"),
      "utf8",
    );
    const sidebarSource = readFileSync(
      resolve(process.cwd(), "src/components/tourism/studio/studio-sidebar-editor.tsx"),
      "utf8",
    );

    expect(dossierSource).toContain("customerId: resolvedCustomerId");
    expect(comercialSource).toContain("customerId: resolvedCustomerId");
    expect(unifiedSource).toContain("setSelectedCustomerId(lead.customerId || lead.customer_id || null)");
    expect(sidebarSource).toContain("value={proposal.customer_id || \"\"}");
    expect(sidebarSource).toContain("proposal.agency_whatsapp");
    expect(sidebarSource).toContain("grid-cols-1 sm:grid-cols-2 gap-2");
    expect(sidebarSource).not.toContain("<CustomerSearchCombobox\n     value=\"\"");
  });
});
