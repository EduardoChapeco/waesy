import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerClient: vi.fn(),
  getServerIdentity: vi.fn(),
  requireStaff: vi.fn(),
  executeUnifiedAiCall: vi.fn(),
  convertProposalToTrip: vi.fn(),
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
vi.mock("@/lib/server-access", () => ({ getServerIdentity: mocks.getServerIdentity, requireStaff: mocks.requireStaff }));
vi.mock("./api-orchestrator.functions", () => ({ executeUnifiedAiCall: mocks.executeUnifiedAiCall }));
vi.mock("@/services/travel-lifecycle.functions", () => ({ convertProposalToTrip: mocks.convertProposalToTrip }));

import { approveTravelProposal, deleteTravelProposal, getPublicTravelProposalByToken, listAgencyTravelProposals, updateTravelProposal } from "./travel-proposal.functions";

const PROPOSAL_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const STORE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TOKEN = "prop_" + "a".repeat(64);
const SNAPSHOT = "b".repeat(64);
const ACCEPTANCE_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function createDb(options: {
  proposal?: Record<string, unknown> | null;
  readError?: { message: string } | null;
  rpcError?: { message: string } | null;
  rpcData?: Record<string, unknown>;
} = {}) {
  const fromCalls: Array<{ table: string; writes: string[]; filters: Array<[string, unknown]> }> = [];
  const from = vi.fn((table: string) => {
    const record = { table, writes: [] as string[], filters: [] as Array<[string, unknown]> };
    fromCalls.push(record);
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn((column: string, value: unknown) => { record.filters.push([column, value]); return chain; }),
      or: vi.fn((value: string) => { record.filters.push(["or", value]); return chain; }),
      order: vi.fn(() => chain),
      limit: vi.fn(() => chain),
      maybeSingle: vi.fn(async () => ({ data: options.proposal ?? null, error: options.readError ?? null })),
      update: vi.fn(() => {
        record.writes.push("update");
        return chain;
      }),
      then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(resolve, reject),
    };
    return chain;
  });
  const rpc = vi.fn(async () => ({
    data: options.rpcData ?? { success: true, replayed: false, acceptance_id: ACCEPTANCE_ID, proposal_id: PROPOSAL_ID },
    error: options.rpcError ?? null,
  }));
  return { client: { from, rpc }, from, fromCalls, rpc };
}

const data = {
  token: TOKEN,
  snapshotHash: SNAPSHOT,
  selectedOptionId: "option-standard",
  acceptedByName: "Ana Cliente",
  acceptedByEmail: "ana@example.com",
  passengers: [
    { name: "Ana Cliente", document: "12345678901", birthDate: "1990-02-03", phone: "+5549999999999", email: "ana@example.com" },
    { name: "Bruno Cliente", document: "98765432100", birthDate: "1992-04-05" },
  ],
  paymentPreference: "pix",
  paymentInstallments: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("aceite público de proposta", () => {
  it("persiste somente aceite, manifesto e preferência pendente, sem converter", async () => {
    const db = createDb({ proposal: {
      id: PROPOSAL_ID,
      store_id: STORE_ID,
      public_token: TOKEN,
      snapshot_hash: SNAPSHOT,
      valid_until: new Date(Date.now() + 86_400_000).toISOString(),
      status: "sent",
      options: [{ id: "option-standard", name: "Padrão" }, { id: "option-flex", name: "Flexível" }],
      title: "Chapecó–Lisboa",
    } });
    mocks.getServerClient.mockReturnValue(db.client);

    const result = await (approveTravelProposal as any)({ data });

    expect(db.rpc).toHaveBeenCalledTimes(1);
    expect((db.rpc.mock.calls[0] as any)[0]).toBe("record_public_travel_proposal_acceptance");
    expect((db.rpc.mock.calls[0] as any)[1]).toMatchObject({
      p_proposal_id: PROPOSAL_ID,
      p_public_token: TOKEN,
      p_snapshot_hash: SNAPSHOT,
      p_selected_option_id: "option-standard",
      p_payment_preference: "pix",
      p_payment_installments: null,
      p_passenger_manifest: data.passengers,
    });
    expect(db.fromCalls.map((call) => call.table)).toEqual(["travel_proposals"]);
    expect(db.fromCalls.flatMap((call) => call.writes)).toEqual([]);
    expect(mocks.convertProposalToTrip).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: true, acceptanceId: ACCEPTANCE_ID });
    expect(result.message).toMatch(/aceite.*registrado/i);
    expect(result.message).toMatch(/sem reserva|não.*reserva/i);
    expect(result.message).toMatch(/sem pagamento|não.*pagamento/i);
  });

  it("propaga falha do RPC e nunca retorna falso sucesso nem tenta conversão", async () => {
    const db = createDb({
      proposal: { id: PROPOSAL_ID, store_id: STORE_ID, public_token: TOKEN, snapshot_hash: SNAPSHOT, options: [{ id: "option-standard" }] },
      rpcError: { message: "acceptance persistence failed" },
    });
    mocks.getServerClient.mockReturnValue(db.client);

    await expect((approveTravelProposal as any)({ data })).rejects.toThrow(/aceite|acceptance/i);

    expect(mocks.convertProposalToTrip).not.toHaveBeenCalled();
    expect(db.fromCalls.flatMap((call) => call.writes)).toEqual([]);
  });

  it("recusa proposta sem snapshot verificável em vez de inventar hash de aceite", async () => {
    const db = createDb({
      proposal: { id: PROPOSAL_ID, store_id: STORE_ID, public_token: TOKEN, snapshot_hash: null },
    });
    mocks.getServerClient.mockReturnValue(db.client);

    await expect((approveTravelProposal as any)({ data })).rejects.toThrow(/snapshot|atualize|agência/i);

    expect(db.rpc).not.toHaveBeenCalled();
    expect(mocks.convertProposalToTrip).not.toHaveBeenCalled();
  });

  it("rejeita snapshot alterado e opção inexistente antes do RPC; o RPC decide validade", async () => {
    const proposal = {
      id: PROPOSAL_ID,
      store_id: STORE_ID,
      public_token: TOKEN,
      snapshot_hash: SNAPSHOT,
      valid_until: new Date(Date.now() + 86_400_000).toISOString(),
      status: "sent",
      options: [{ id: "option-standard", name: "Padrão" }],
    };
    const db = createDb({ proposal });
    mocks.getServerClient.mockReturnValue(db.client);

    await expect((approveTravelProposal as any)({ data: { ...data, snapshotHash: "wrong" } })).rejects.toThrow(/snapshot/i);
    await expect((approveTravelProposal as any)({ data: { ...data, selectedOptionId: "missing" } })).rejects.toThrow(/opção/i);
    expect(db.rpc).not.toHaveBeenCalled();

    const expiredDb = createDb({
      proposal: proposal,
      rpcError: { message: "A validade da proposta terminou; solicite atualização." },
    });
    mocks.getServerClient.mockReturnValue(expiredDb.client);
    await expect((approveTravelProposal as any)({ data: { ...data, selectedOptionId: "option-standard" } })).rejects.toThrow(/validade|terminou/i);
    expect(expiredDb.rpc).toHaveBeenCalledTimes(1);
  });

  it("rejeita preferência Pix com parcelas localmente e propaga estado encerrado do RPC", async () => {
    const proposal = {
      id: PROPOSAL_ID,
      store_id: STORE_ID,
      public_token: TOKEN,
      snapshot_hash: SNAPSHOT,
      status: "rejected",
      options: [{ id: "option-standard", name: "Padrão" }],
    };
    const db = createDb({ proposal });
    mocks.getServerClient.mockReturnValue(db.client);

    await expect((approveTravelProposal as any)({ data: { ...data, paymentInstallments: 3 } })).rejects.toThrow(/Pix/i);
    expect(db.rpc).not.toHaveBeenCalled();

    const rejectedDb = createDb({ proposal, rpcError: { message: "Esta proposta não está em estado elegível para aceite." } });
    mocks.getServerClient.mockReturnValue(rejectedDb.client);
    await expect((approveTravelProposal as any)({ data })).rejects.toThrow(/estado elegível/i);
    expect(rejectedDb.rpc).toHaveBeenCalledTimes(1);
  });

  it("preserva replay idempotente reportado pelo RPC", async () => {
    const db = createDb({
      proposal: {
        id: PROPOSAL_ID,
        store_id: STORE_ID,
        public_token: TOKEN,
        snapshot_hash: SNAPSHOT,
        status: "approved",
        valid_until: new Date(Date.now() - 1000).toISOString(),
        options: [{ id: "option-standard", name: "Padrão" }],
      },
      rpcData: { success: true, replayed: true, acceptance_id: ACCEPTANCE_ID, proposal_id: PROPOSAL_ID },
    });
    mocks.getServerClient.mockReturnValue(db.client);

    const result = await (approveTravelProposal as any)({ data });

    expect(result).toMatchObject({ success: true, acceptanceId: ACCEPTANCE_ID, replayed: true });
    expect(result.message).toMatch(/já está registrado/i);
    expect(mocks.convertProposalToTrip).not.toHaveBeenCalled();
  });

  it("mantém financiamento e faturamento como preferências sem cobrança", async () => {
    const proposal = {
      id: PROPOSAL_ID,
      store_id: STORE_ID,
      public_token: TOKEN,
      snapshot_hash: SNAPSHOT,
      options: [{ id: "option-standard", name: "Padrão" }],
    };
    const financingDb = createDb({ proposal });
    mocks.getServerClient.mockReturnValue(financingDb.client);
    await (approveTravelProposal as any)({ data: { ...data, paymentPreference: "financiamento_bancario", paymentInstallments: 6 } });
    expect((financingDb.rpc.mock.calls[0] as any)[1]).toMatchObject({ p_payment_preference: "financiamento_bancario", p_payment_installments: 6 });

    const agencyBillDb = createDb({ proposal });
    mocks.getServerClient.mockReturnValue(agencyBillDb.client);
    await (approveTravelProposal as any)({ data: { ...data, paymentPreference: "faturado_agencia", paymentInstallments: null } });
    expect((agencyBillDb.rpc.mock.calls[0] as any)[1]).toMatchObject({ p_payment_preference: "faturado_agencia", p_payment_installments: null });
    expect(mocks.convertProposalToTrip).not.toHaveBeenCalled();
  });

  it("não expõe campos internos ou PII dispensável na projeção pública", async () => {
    const db = createDb({ proposal: {
      id: PROPOSAL_ID,
      store_id: STORE_ID,
      quote_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      public_token: TOKEN,
      snapshot_hash: SNAPSHOT,
      valid_until: new Date(Date.now() + 86_400_000).toISOString(),
      status: "sent",
      title: "Chapecó–Lisboa",
      destination_city: "Lisboa",
      client_name: "Ana Cliente",
      client_whatsapp: "+5549999999999",
      client_email: "ana@example.com",
      pricing: { currency: "BRL", total_price_cents: 120000, operator_net_cents: 80000, private_margin: "internal" },
      options: [{
        id: "option-standard",
        name: "Padrão",
        pricing: { currency: "BRL", total_price_cents: 120000, operator_net_cents: 80000 },
        internal_note: "INTERNAL_OPTION_SECRET",
      }],
      flights: [{ flight_number: "AB123", locator_code: "PNR-PRIVATE", provider_net_cents: 80000 }],
      hotels: [{ hotel_name: "Hotel Centro", supplier_contract_id: "SUPPLIER-SECRET" }],
      transfers: [{ type: "Aeroporto–hotel", vehicle: "Van", notes: "INTERNAL_TRANSFER_SECRET" }],
      tours: [{ title: "Passeio", price_cents: 10000, operator_cost_cents: 7000 }],
      rooms: [{ room_number: "PRIVATE-ROOM" }],
      special_notes: "INTERNAL_NOTES_SECRET",
      ai_sales_advisor_prompt: "INTERNAL_PROMPT_SECRET",
      ai_sales_advisor_enabled: true,
      stores: { name: "Agência Exemplo", logo_url: null, settings: { whatsapp_phone: "+5549888888888", api_key: "STORE_SECRET" } },
    } });
    mocks.getServerClient.mockReturnValue(db.client);

    const result = await (getPublicTravelProposalByToken as any)({ data: { token: TOKEN } });

    expect(result.id).toBe(TOKEN);
    expect(result.store_id).toBeNull();
    expect(result.client_whatsapp).toBe("");
    expect(result.client_email).toBeNull();
    expect(result.ai_sales_advisor_prompt).toBeNull();
    expect(result.special_notes).toBeNull();
    expect(result.pricing).not.toHaveProperty("operator_net_cents");
    expect(result.options[0].pricing).not.toHaveProperty("operator_net_cents");
    expect(result.options[0]).not.toHaveProperty("internal_note");
    expect(result.flights[0]).not.toHaveProperty("locator_code");
    expect(result.hotels[0]).not.toHaveProperty("supplier_contract_id");
    expect(result.transfers[0]).not.toHaveProperty("notes");
    expect(result.tours[0]).not.toHaveProperty("operator_cost_cents");
    expect(result.rooms).toEqual([]);
    expect(JSON.stringify(result)).not.toContain("SECRET");
    expect(db.fromCalls.map((call) => call.table)).toEqual(["travel_proposals", "travel_proposal_acceptances"]);
  });

  it("não cai em quotes nem mascara falha do lookup público canônico", async () => {
    const missingDb = createDb({ proposal: null });
    mocks.getServerClient.mockReturnValue(missingDb.client);
    await expect((getPublicTravelProposalByToken as any)({ data: { token: TOKEN } })).resolves.toBeNull();
    expect(missingDb.fromCalls.map((call) => call.table)).toEqual(["travel_proposals"]);

    const failedDb = createDb({ readError: { message: "database unavailable" } });
    mocks.getServerClient.mockReturnValue(failedDb.client);
    await expect((getPublicTravelProposalByToken as any)({ data: { token: TOKEN } })).rejects.toThrow(/database unavailable/i);
    expect(failedDb.fromCalls.map((call) => call.table)).toEqual(["travel_proposals"]);
  });

  it("não expõe proposta draft pelo token público", async () => {
    const db = createDb({ proposal: {
      id: PROPOSAL_ID,
      store_id: STORE_ID,
      public_token: TOKEN,
      snapshot_hash: SNAPSHOT,
      status: "draft",
      title: "Rascunho privado",
    } });
    mocks.getServerClient.mockReturnValue(db.client);

    await expect((getPublicTravelProposalByToken as any)({ data: { token: TOKEN } })).resolves.toBeNull();
    expect(db.fromCalls.map((call) => call.table)).toEqual(["travel_proposals"]);
  });

  it("não permite definir approved pelo BFF de autosave", () => {
    const schema = (updateTravelProposal as any).schema;
    expect(schema.safeParse({ id: PROPOSAL_ID, patch: { status: "approved" } }).success).toBe(false);
    expect(schema.safeParse({ id: PROPOSAL_ID, patch: { status: "sent" } }).success).toBe(true);
  });

  it("exige staff e limita listagem canônica e legada ao tenant autenticado", async () => {
    const db = createDb();
    mocks.getServerClient.mockReturnValue(db.client);
    mocks.requireStaff.mockResolvedValue({ id: "staff-profile", role: "staff", store_id: STORE_ID });

    await expect((listAgencyTravelProposals as any)({ data: { search: "Ana,store_id.is.null" } })).resolves.toEqual([]);

    expect(mocks.requireStaff).toHaveBeenCalledTimes(1);
    expect(db.fromCalls.map((call) => call.table)).toEqual(["travel_proposals", "quotes"]);
    for (const call of db.fromCalls) {
      expect(call.filters).toContainEqual(["store_id", STORE_ID]);
      const rawOrFilter = call.filters.find(([column]) => column === "or")?.[1];
      expect(String(rawOrFilter)).not.toContain("store_id.is.null");
    }
  });

  it("nega listagem sem staff antes de consultar dados com service role", async () => {
    const db = createDb();
    mocks.getServerClient.mockReturnValue(db.client);
    mocks.requireStaff.mockRejectedValue(new Error("Unauthorized"));

    await expect((listAgencyTravelProposals as any)({ data: {} })).rejects.toThrow(/unauthorized/i);
    expect(db.fromCalls).toHaveLength(0);
  });

  it("exclui somente dentro do tenant e delega a transação protegida para o RPC", async () => {
    const db = createDb({ proposal: { id: PROPOSAL_ID } });
    mocks.getServerClient.mockReturnValue(db.client);
    mocks.requireStaff.mockResolvedValue({ id: "staff-profile", role: "staff", store_id: STORE_ID });

    await expect((deleteTravelProposal as any)({ data: { id: PROPOSAL_ID } })).resolves.toEqual({ success: true });

    expect(db.fromCalls).toHaveLength(1);
    expect(db.fromCalls[0].filters).toContainEqual(["store_id", STORE_ID]);
    expect(db.rpc).toHaveBeenCalledWith("delete_unaccepted_travel_proposal", {
      p_proposal_id: PROPOSAL_ID,
      p_store_id: STORE_ID,
    });
    expect(db.fromCalls.flatMap((call) => call.writes)).toEqual([]);
  });
});
