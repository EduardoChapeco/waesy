import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ client: vi.fn(), staff: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let schema: { parse: (data: unknown) => unknown };
    const builder = {
      validator: (value: typeof schema) => { schema = value; return builder; },
      handler: (handler: (args: { data: unknown }) => unknown) =>
        (args: { data: unknown }) => handler({ data: schema ? schema.parse(args.data) : args.data }),
    };
    return builder;
  },
}));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: () => new Request("https://waesy.test") }));
vi.mock("@/lib/network-telemetry.server", () => ({ getRealClientIP: () => "127.0.0.1" }));
vi.mock("@/lib/supabase", () => ({ getServerClient: mocks.client, getAnonServerClient: mocks.client }));
vi.mock("@/lib/server-access", () => ({ requireStaff: mocks.staff, getServerIdentity: mocks.staff }));

import { configureContractSigners, signContractAsPayer } from "./travel-continuous-flow.functions";

const contractId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const storeId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const signerInput = (percentage: number, amount?: number) => ({
  fullName: "Pessoa Teste", cpfCnpj: "12345678901", sharePercentage: percentage,
  ...(amount !== undefined ? { shareAmountCents: amount } : {}),
});

function database(options: { deleteError?: boolean; insertError?: boolean; missingInsert?: boolean; signature?: boolean } = {}) {
  const writes: Array<{ table: string; operation: string; payload?: unknown }> = [];
  const from = vi.fn((table: string) => {
    let operation = "read";
    let payload: unknown;
    const result = () => {
      if (operation === "delete") return { data: null, error: options.deleteError ? { message: "delete failed" } : null };
      if (operation === "insert") return {
        data: options.missingInsert ? null : [{ id: "saved-row" }],
        error: options.insertError ? { message: "insert failed" } : null,
      };
      if (table === "travel_contracts") return {
        data: { id: contractId, store_id: storeId, total_value_cents: 10000, proposal_id: null }, error: null,
      };
      if (table === "travel_contract_signers" && options.signature) return {
        data: operation === "update" ? { id: "signer" } : {
          id: "signer", contract_id: contractId, store_id: storeId, cpf_cnpj: "12345678901",
          signature_status: "pending", share_amount_cents: 10000,
        }, error: null,
      };
      return { data: null, error: null };
    };
    const chain = {
      select: () => chain,
      eq: () => chain,
      delete: () => { operation = "delete"; writes.push({ table, operation }); return chain; },
      update: (value: unknown) => { operation = "update"; payload = value; writes.push({ table, operation, payload }); return chain; },
      insert: (value: unknown) => { operation = "insert"; payload = value; writes.push({ table, operation, payload }); return chain; },
      single: async () => result(),
      maybeSingle: async () => {
        const response = result();
        return operation === "insert" && Array.isArray(response.data)
          ? { ...response, data: response.data[0] } : response;
      },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(
        table === "travel_contract_signers" && operation === "read" && options.signature
          ? { data: [{ id: "signer", signature_status: "signed" }], error: null }
          : result(),
      ).then(resolve),
    };
    return chain;
  });
  mocks.client.mockReturnValue({ from });
  return { writes, from };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.staff.mockResolvedValue({ id: "staff", store_id: storeId });
});

describe("TUR007 signer handler integrity", () => {
  it("rejects a percentage total below 100 before deleting", async () => {
    const db = database();
    await expect(configureContractSigners({ data: { contractId, signers: [signerInput(40), signerInput(40)] } })).rejects.toThrow();
    expect(db.writes).toHaveLength(0);
  });
  it("rejects explicit cent amounts that do not match the contract", async () => {
    const db = database();
    await expect(configureContractSigners({ data: { contractId, signers: [signerInput(50, 4000), signerInput(50, 5000)] } })).rejects.toThrow();
    expect(db.writes).toHaveLength(0);
  });
  it("does not replace an explicit zero with a calculated share", async () => {
    const db = database();
    await expect(configureContractSigners({ data: { contractId, signers: [signerInput(100, 0)] } })).rejects.toThrow();
    expect(db.writes).toHaveLength(0);
  });
  it("accepts complete shares and persists calculated cent amounts", async () => {
    const db = database();
    await expect(configureContractSigners({ data: { contractId, signers: [signerInput(50), signerInput(50)] } })).resolves.toEqual({ success: true, signersCount: 2 });
    expect(db.writes.find((write) => write.operation === "insert")?.payload).toEqual([
      expect.objectContaining({ share_amount_cents: 5000, store_id: storeId }),
      expect.objectContaining({ share_amount_cents: 5000, store_id: storeId }),
    ]);
  });
  it("accepts complete explicit cent amounts", async () => {
    database();
    await expect(configureContractSigners({ data: { contractId, signers: [signerInput(30, 3000), signerInput(70, 7000)] } })).resolves.toEqual({ success: true, signersCount: 2 });
  });
  it("stops before insertion if deletion fails", async () => {
    const db = database({ deleteError: true });
    await expect(configureContractSigners({ data: { contractId, signers: [signerInput(100)] } })).rejects.toThrow("delete failed");
    expect(db.writes.filter((write) => write.operation === "insert")).toHaveLength(0);
  });
  it("propagates an insertion error", async () => {
    database({ insertError: true });
    await expect(configureContractSigners({ data: { contractId, signers: [signerInput(100)] } })).rejects.toThrow("insert failed");
  });
  it("does not claim commission was recorded if the insert fails", async () => {
    database({ signature: true, insertError: true });
    const result = await signContractAsPayer({ data: { token: "a".repeat(32), acceptedTerms: true } });
    expect(result.success).toBe(true);
    expect(result.commissionRecorded).toBe(false);
  });
  it("does not claim commission was recorded without a returned row", async () => {
    database({ signature: true, missingInsert: true });
    const result = await signContractAsPayer({ data: { token: "a".repeat(32), acceptedTerms: true } });
    expect(result.commissionRecorded).toBe(false);
  });
  it("confirms the commission flag when the spreadsheet insert returns an ID", async () => {
    database({ signature: true });
    const result = await signContractAsPayer({ data: { token: "a".repeat(32), acceptedTerms: true } });
    expect(result.commissionRecorded).toBe(true);
  });
});
