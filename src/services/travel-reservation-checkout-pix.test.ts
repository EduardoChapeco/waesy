import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ client: vi.fn(), identity: vi.fn(), pix: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      validator: (_schema: unknown) => builder,
      handler: (handler: (args: unknown) => unknown) => handler,
    };
    return builder;
  },
}));
vi.mock("@tanstack/react-start/server", () => ({ getRequest: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ getServerClient: mocks.client, getAnonServerClient: vi.fn() }));
vi.mock("@/lib/server-access", () => ({ getServerIdentity: mocks.identity, requireStaff: vi.fn() }));
vi.mock("@/lib/pix-payload", () => ({ generatePixBrCode: mocks.pix }));

import { generateTravelReservationCheckout } from "./travel-contract.functions";

const storeId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const data = {
  storeId, clientName: "Cliente Teste", clientPhone: "49912345678",
  destination: "Lisboa", packageSummary: "Viagem de teste", totalValueCents: 12345,
  passengers: [], generatePix: true,
};

function setup(pixKey: unknown, storeError: { message: string } | null = null) {
  const rpc = vi.fn().mockResolvedValue({
    data: { success: true, contract_id: "contract-test", public_token: "token-test" }, error: null,
  });
  const chain = {
    select: vi.fn(() => chain), eq: vi.fn(() => chain),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: storeId, name: "Agência Teste", cnpj: "12345678000100", phone: "49912345678", settings: { pix_key: pixKey } },
      error: storeError,
    }),
  };
  mocks.client.mockReturnValue({ from: vi.fn(() => chain), rpc });
  return { rpc };
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.identity.mockResolvedValue({ id: "staff-test", store_id: storeId });
  mocks.pix.mockReturnValue("pix-test");
});

describe("checkout turístico: validação Pix antes de efeitos", () => {
  it.each([undefined, null, "", "   "])("rejeita chave %s antes de criar contrato, sem usar CNPJ ou telefone", async (key) => {
    const { rpc } = setup(key);
    await expect(generateTravelReservationCheckout({ data })).rejects.toThrow(/Chave Pix/);
    expect(rpc).not.toHaveBeenCalled();
    expect(mocks.pix).not.toHaveBeenCalled();
  });

  it("propaga indisponibilidade da configuração antes de criar contrato", async () => {
    const { rpc } = setup("pix@example.test", { message: "configuração indisponível" });
    await expect(generateTravelReservationCheckout({ data })).rejects.toThrow(/configuração indisponível/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("falha do gerador não deixa contrato criado", async () => {
    const { rpc } = setup("pix@example.test");
    mocks.pix.mockImplementation(() => { throw new Error("gerador indisponível"); });
    await expect(generateTravelReservationCheckout({ data })).rejects.toThrow("gerador indisponível");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("preserva chave explícita e valor, incluindo o mesmo código na mensagem", async () => {
    setup("  pix@example.test  ");
    const result = await generateTravelReservationCheckout({ data });
    expect(result).toMatchObject({ success: true, pixBrCode: "pix-test" });
    expect(result.whatsappMessage).toContain("pix-test");
    expect(mocks.pix).toHaveBeenCalledWith(expect.objectContaining({ pixKey: "pix@example.test", amountCents: 12345 }));
  });

  it("não exige chave quando Pix não foi solicitado", async () => {
    setup(null);
    const result = await generateTravelReservationCheckout({ data: { ...data, generatePix: false } });
    expect(result.pixBrCode).toBeNull();
    expect(mocks.pix).not.toHaveBeenCalled();
  });
});
