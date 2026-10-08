import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const mocks = vi.hoisted(() => ({
  getServerClient: vi.fn(),
  getAnonServerClient: vi.fn(),
  getServerIdentity: vi.fn(),
  requireStaff: vi.fn(),
  getRequest: vi.fn(),
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
vi.mock("@/lib/supabase", () => ({
  getServerClient: mocks.getServerClient,
  getAnonServerClient: mocks.getAnonServerClient,
}));
vi.mock("@/lib/server-access", () => ({
  getServerIdentity: mocks.getServerIdentity,
  requireStaff: mocks.requireStaff,
}));

import {
  createTravelContract,
  createContractFromProposal,
  getPublicTravelContractByToken,
  signTravelContract,
} from "./travel-contract.functions";

const TOKEN = `ct_${"a".repeat(64)}`;
const CONTRACT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const VERSION_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PROPOSAL_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const STORE_ID = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const STAFF_ID = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";

const publicContract = {
  id: CONTRACT_ID,
  store_id: STORE_ID,
  agency_name: "Agência Exemplo",
  public_token: TOKEN,
  proposal_id: PROPOSAL_ID,
  contract_title: "Contrato de viagem",
  client_name: "Ana Cliente",
  client_document: "12345678901",
  client_email: "ana@example.com",
  client_phone: "+5549999999999",
  passengers: [{ name: "Ana Cliente", document: "12345678901" }],
  destination: "Lisboa",
  package_summary: "Pacote de viagem",
  total_value_cents: 150000,
  payment_conditions: "Condições registradas",
  clauses: [],
  signatures: [],
  status: "pending_signature",
  created_at: "2026-10-07T00:00:00.000Z",
  updated_at: "2026-10-07T00:00:00.000Z",
};

function createClient(options: {
  rpcData?: unknown;
  rpcError?: { message: string } | null;
  rows?: Record<string, unknown>;
} = {}) {
  const calls: Array<{ table: string; writes: string[]; filters: Array<[string, unknown]> }> = [];
  const from = vi.fn((table: string) => {
    const record = { table, writes: [] as string[], filters: [] as Array<[string, unknown]> };
    calls.push(record);
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn((column: string, value: unknown) => { record.filters.push([column, value]); return chain; }),
      maybeSingle: vi.fn(async () => ({ data: options.rows?.[table] ?? null, error: null })),
      single: vi.fn(async () => ({ data: options.rows?.[table] ?? null, error: null })),
      update: vi.fn(() => { record.writes.push("update"); return chain; }),
      insert: vi.fn(() => { record.writes.push("insert"); return chain; }),
      delete: vi.fn(() => { record.writes.push("delete"); return chain; }),
      then: (resolve: (value: unknown) => unknown, reject: (error: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(resolve, reject),
    };
    return chain;
  });
  const rpc = vi.fn(async () => ({ data: options.rpcData ?? null, error: options.rpcError ?? null }));
  return { client: { from, rpc }, from, calls, rpc };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getRequest.mockReturnValue(new Request("https://waesy.example/", {
    headers: { "user-agent": "contract-test-browser", "x-forwarded-for": "192.0.2.10" },
  }));
  mocks.requireStaff.mockResolvedValue({ id: STAFF_ID, role: "seller", store_id: STORE_ID });
  mocks.getServerIdentity.mockResolvedValue({ id: STAFF_ID, role: "seller", store_id: STORE_ID });
});

describe("isolamento público e assinatura de contratos", () => {
  it("lê contrato somente por RPC server-side token-bound, sem SELECT direto anon", async () => {
    const server = createClient({ rpcData: publicContract });
    const anon = createClient({ rows: {
      contracts: {
        id: CONTRACT_ID,
        verification_code: TOKEN,
        current_version: 1,
        status: "completed",
        title: "Contrato de viagem",
        metadata: { client_name: "Ana Cliente", total_value_cents: 150000 },
      },
      contract_versions: { title: "Contrato de viagem", clauses: [] },
      stores: { name: "Agência Exemplo", cnpj: null, address: null, settings: {} },
    } });
    mocks.getServerClient.mockReturnValue(server.client);
    mocks.getAnonServerClient.mockReturnValue(anon.client);

    const result = await (getPublicTravelContractByToken as any)({ data: { token: TOKEN } });

    expect(result).toMatchObject({ id: CONTRACT_ID, public_token: TOKEN, client_name: "Ana Cliente" });
    expect(server.rpc).toHaveBeenCalledWith("get_public_travel_contract_by_token", { p_token: TOKEN });
    expect(server.from).not.toHaveBeenCalled();
    expect(anon.from).not.toHaveBeenCalled();
  });

  it("exige consentimento no servidor e assina via RPC atômica", async () => {
    const server = createClient({ rpcData: { success: true, certificate_serial: "CERT-12345678", message: "Assinatura registrada." } });
    const anon = createClient({ rows: {
      contracts: {
        id: CONTRACT_ID,
        verification_code: TOKEN,
        current_version: 1,
        status: "signing",
        metadata: { signatures: [], total_value_cents: 150000, destination: "Lisboa" },
        contract_versions: [{ id: VERSION_ID, clauses: [], hash_sha256: "a".repeat(64) }],
      },
    } });
    mocks.getServerClient.mockReturnValue(server.client);
    mocks.getAnonServerClient.mockReturnValue(anon.client);

    const result = await (signTravelContract as any)({ data: {
      token: TOKEN,
      signerName: "Ana Cliente",
      signerDocument: "12345678901",
      signerEmail: "ana@example.com",
      signatureImage: "data:image/png;base64,AAAA",
      acceptedTerms: true,
    } });

    expect(result).toMatchObject({ success: true, certificateSerial: "CERT-12345678" });
    expect(server.rpc).toHaveBeenCalledWith("sign_public_travel_contract", expect.objectContaining({
      p_token: TOKEN,
      p_signer_name: "Ana Cliente",
      p_signer_document: "12345678901",
      p_signer_email: "ana@example.com",
      p_accepted_terms: true,
      p_ip_address: "192.0.2.10",
      p_user_agent: "contract-test-browser",
    }));
    expect(server.from).not.toHaveBeenCalled();
    expect(anon.from).not.toHaveBeenCalled();
  });

  it("recusa chamada de assinatura sem consentimento explícito antes de qualquer RPC", async () => {
    const server = createClient();
    mocks.getServerClient.mockReturnValue(server.client);
    const anon = createClient({ rows: {
      contracts: {
        id: CONTRACT_ID,
        verification_code: TOKEN,
        current_version: 1,
        status: "signing",
        metadata: { signatures: [], total_value_cents: 150000, destination: "Lisboa" },
        contract_versions: [{ id: VERSION_ID, clauses: [], hash_sha256: "a".repeat(64) }],
      },
    } });
    mocks.getAnonServerClient.mockReturnValue(anon.client);

    await expect((signTravelContract as any)({ data: {
      token: TOKEN,
      signerName: "Ana Cliente",
      signerDocument: "12345678901",
      acceptedTerms: false,
    } })).rejects.toThrow(/consentimento|termos|aceite/i);

    expect(server.rpc).not.toHaveBeenCalled();
    expect(server.from).not.toHaveBeenCalled();
    expect(anon.from).not.toHaveBeenCalled();
  });

  it("recusa e-mail ausente no handler público antes de qualquer RPC", async () => {
    const server = createClient();
    mocks.getServerClient.mockReturnValue(server.client);

    await expect((signTravelContract as any)({ data: {
      token: TOKEN,
      signerName: "Ana Cliente",
      signerDocument: "12345678901",
      acceptedTerms: true,
    } })).rejects.toThrow(/e-mail/i);

    expect(server.rpc).not.toHaveBeenCalled();
    expect(server.from).not.toHaveBeenCalled();
  });

  it("cria contrato manual somente para staff e por RPC transacional", async () => {
    const server = createClient({ rpcData: { success: true, contract_id: CONTRACT_ID, public_token: TOKEN } });
    mocks.getServerClient.mockReturnValue(server.client);
    const payload = {
      contractTitle: "Contrato de viagem",
      clientName: "Ana Cliente",
      clientDocument: "123.456.789-01",
      clientPhone: "+5549999999999",
      destination: "Lisboa",
      packageSummary: "Viagem com hospedagem",
      totalValueCents: 150000,
      paymentConditions: "Preferência Pix, a confirmar",
      passengers: [{ name: "Ana Cliente" }],
    };

    const result = await (createTravelContract as any)({ data: payload });

    expect(mocks.requireStaff).toHaveBeenCalledTimes(1);
    expect(server.rpc).toHaveBeenCalledWith("create_staff_travel_contract", expect.objectContaining({
      p_contract_data: payload,
      p_store_id: STORE_ID,
      p_actor_profile_id: STAFF_ID,
    }));
    expect(server.from).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: true, id: CONTRACT_ID, publicToken: TOKEN });
  });

  it("emite contrato da proposta apenas para o tenant staff autenticado via RPC", async () => {
    const server = createClient({
      rpcData: { success: true, contract_id: CONTRACT_ID, public_token: TOKEN },
      rows: {
      quotes: {
        id: PROPOSAL_ID,
        store_id: STORE_ID,
        guest_name: "Ana Cliente",
        guest_email: "ana@example.com",
        guest_phone: "+5549999999999",
        conditions: JSON.stringify({ destination_city: "Lisboa", title: "Lisboa", pricing: { total_price_cents: 150000 } }),
      },
      stores: { settings: {} },
      contracts: { id: CONTRACT_ID },
      },
    });
    mocks.getServerClient.mockReturnValue(server.client);

    const result = await (createContractFromProposal as any)({ data: { proposalId: PROPOSAL_ID } });

    expect(mocks.requireStaff).toHaveBeenCalledTimes(1);
    expect(server.rpc).toHaveBeenCalledWith("create_staff_travel_contract_from_proposal", expect.objectContaining({
      p_proposal_id: PROPOSAL_ID,
      p_store_id: STORE_ID,
      p_actor_profile_id: STAFF_ID,
    }));
    expect(server.from).not.toHaveBeenCalled();
    expect(result).toMatchObject({ success: true, id: CONTRACT_ID, publicToken: TOKEN });
  });

  it("migration remove leitura ampla e limita acesso às tabelas por RPC", () => {
    const migration = readFileSync(
      new URL("../../supabase/migrations/20270115000000_p0_secure_public_contract_access.sql", import.meta.url),
      "utf8",
    );
    expect(migration).toMatch(/DROP POLICY IF EXISTS\s+"contracts_public_verify"/i);
    expect(migration).toMatch(/DROP POLICY IF EXISTS\s+"envelopes_token_access"/i);
    expect(migration).toMatch(/REVOKE ALL PRIVILEGES ON TABLE public\.contracts[^;]*FROM PUBLIC, anon/i);
    expect(migration).toMatch(/REVOKE ALL PRIVILEGES ON TABLE public\.contract_versions[^;]*FROM PUBLIC, anon/i);
    expect(migration).toMatch(/REVOKE ALL PRIVILEGES ON TABLE public\.signature_envelopes[^;]*FROM PUBLIC, anon/i);
    expect(migration).toMatch(/REVOKE ALL PRIVILEGES ON TABLE public\.signature_evidence[^;]*FROM PUBLIC, anon/i);
    expect(migration).toMatch(/CREATE OR REPLACE FUNCTION public\.get_public_travel_contract_by_token/i);
    expect(migration).toMatch(/CREATE OR REPLACE FUNCTION public\.sign_public_travel_contract/i);
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.get_public_travel_contract_by_token/i);
  });
});
