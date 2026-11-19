import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calcPropertyFinancingMonthlyCents,
  calcRentalMonthlyTotalCents,
} from "@/lib/pricing/price-calculator";
import { classifyScannedCode } from "@/components/scanner/barcode-scanner-modal";

const mocks = vi.hoisted(() => ({
  identity: {
    id: "00000000-0000-4000-8000-0000000000a1",
    store_id: "00000000-0000-4000-8000-0000000000b1",
    role: "seller",
    fullName: "Vendedor Teste",
    memberships: [
      { store_id: "00000000-0000-4000-8000-0000000000b1", role: "seller" },
    ],
  },
  supabase: {
    from: vi.fn(),
  },
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validatorFn: ((input: unknown) => unknown) | null = null;
    const chain = {
      validator: (schema: unknown) => {
        validatorFn =
          typeof schema === "function"
            ? (schema as (i: unknown) => unknown)
            : (i: unknown) => (schema as { parse: (v: unknown) => unknown }).parse(i);
        return chain;
      },
      handler: (fn: (ctx: { data: unknown }) => Promise<unknown>) => {
        return async (arg?: { data?: unknown }) => {
          const raw = arg && "data" in arg ? arg.data : arg;
          const parsed = validatorFn ? validatorFn(raw) : raw;
          return fn({ data: parsed });
        };
      },
    };
    return chain;
  },
}));

vi.mock("@tanstack/react-start/server", () => ({
  getRequest: () => null,
}));

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => mocks.supabase,
  getAnonServerClient: () => mocks.supabase,
}));

vi.mock("@/lib/server-access", async () => {
  const actual = await vi.importActual<typeof import("@/lib/identity-core")>(
    "@/lib/identity-core"
  );
  return {
    ...actual,
    getServerIdentity: vi.fn(async () => mocks.identity),
    requireStaff: vi.fn(async () => mocks.identity),
    requireFinance: vi.fn(async () => mocks.identity),
    resolveTenantStoreId: vi.fn(async () => mocks.identity.store_id),
  };
});

import {
  deleteLeadActivity,
  updateLeadActivity,
} from "@/services/crm.functions";
import {
  createContractAddendum,
  listContractAddendums,
} from "@/services/travel-contract.functions";

function makeTableChain(config: {
  maybeSingle?: unknown;
  single?: unknown;
  selectRows?: unknown[];
  updateSingle?: unknown;
  insertSingle?: unknown;
  deleteError?: { message: string } | null;
}) {
  let mode: "select" | "update" | "insert" | "delete" = "select";
  const chain: Record<string, unknown> = {
    select: () => chain,
    update: () => {
      mode = "update";
      return chain;
    },
    insert: () => {
      mode = "insert";
      return chain;
    },
    delete: () => {
      mode = "delete";
      return chain;
    },
    eq: () => chain,
    order: async () => ({
      data: config.selectRows ?? [],
      error: null,
    }),
    maybeSingle: async () => ({
      data: config.maybeSingle ?? null,
      error: null,
    }),
    single: async () => {
      if (mode === "update") {
        return { data: config.updateSingle ?? null, error: null };
      }
      if (mode === "insert") {
        return { data: config.insertSingle ?? null, error: null };
      }
      return { data: config.single ?? null, error: null };
    },
    then: (resolve: (val: unknown) => void) => {
      if (mode === "delete") {
        resolve({ error: config.deleteError ?? null });
        return;
      }
      resolve({ data: config.selectRows ?? [], error: null });
    },
  };
  return chain;
}

describe("W1.B2 Nativization & Guards Suite", () => {
  const actId = "11111111-1111-4111-8111-111111111111";
  const contractId = "22222222-2222-4222-8222-222222222222";
  const storeA = "00000000-0000-4000-8000-0000000000b1";
  const storeB = "00000000-0000-4000-8000-0000000000b2";
  const authorA = "00000000-0000-4000-8000-0000000000a1";
  const authorB = "00000000-0000-4000-8000-0000000000a2";

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.identity = {
      id: authorA,
      store_id: storeA,
      role: "seller",
      fullName: "Vendedor Teste",
      memberships: [{ store_id: storeA, role: "seller" }],
    };
  });

  describe("Property Math (calcPropertyFinancingMonthlyCents & calcRentalMonthlyTotalCents)", () => {
    it("calcula parcela Tabela Price corretamente com juros e sem juros", () => {
      const zeroRate = calcPropertyFinancingMonthlyCents({
        finAmountCents: 120_000_00,
        monthlyInterestPct: 0,
        years: 10,
      });
      expect(zeroRate.totalInstallments).toBe(120);
      expect(zeroRate.monthlyPaymentCents).toBe(100_000);

      const withRate = calcPropertyFinancingMonthlyCents({
        finAmountCents: 300_000_00,
        monthlyInterestPct: 0.85,
        years: 20,
      });
      expect(withRate.totalInstallments).toBe(240);
      expect(withRate.monthlyPaymentCents).toBeGreaterThan(290_000);
      expect(withRate.monthlyPaymentCents).toBeLessThan(300_000);
    });

    it("consolida aluguel + condomínio + IPTU/12 mensal", () => {
      const rental = calcRentalMonthlyTotalCents({
        rentCents: 250_000,
        condoCents: 45_000,
        iptuAnnualCents: 120_000,
      });
      expect(rental.iptuMonthlyCents).toBe(10_000);
      expect(rental.totalMonthlyCents).toBe(305_000);
    });
  });

  describe("Scanner Classification", () => {
    it("classifica EAN-13, PIX EMV, Ticket e URL de Produto", () => {
      expect(classifyScannedCode("7891000315507")).toEqual({
        type: "product_barcode",
        format: "EAN_13",
      });
      expect(classifyScannedCode("00020126580014BR.GOV.BCB.PIX")).toEqual({
        type: "pix",
        format: "QR_CODE",
      });
      expect(classifyScannedCode("TKT-987654")).toEqual({
        type: "ticket",
        format: "QR_CODE",
      });
      expect(classifyScannedCode("https://app.waesy.com/produto/123")).toEqual({
        type: "product_qr",
        format: "QR_CODE",
      });
    });
  });

  describe("CRM Activity Edit/Delete (Multi-Tenant & Ownership)", () => {
    it("permite o autor editar própria nota", async () => {
      mocks.supabase.from.mockImplementation(() =>
        makeTableChain({
          maybeSingle: {
            id: actId,
            store_id: storeA,
            author_id: authorA,
            type: "note",
          },
          updateSingle: {
            id: actId,
            content: "Atualizado",
          },
        })
      );

      const res = await updateLeadActivity({
        data: { activityId: actId, content: "Atualizado" },
      });
      expect(res).toEqual({ id: actId, content: "Atualizado" });
    });

    it("bloqueia vendedor de editar/excluir atividade de outro colega", async () => {
      mocks.supabase.from.mockImplementation(() =>
        makeTableChain({
          maybeSingle: {
            id: actId,
            store_id: storeA,
            author_id: authorB,
            type: "note",
          },
        })
      );

      await expect(
        updateLeadActivity({ data: { activityId: actId, content: "Hack" } })
      ).rejects.toThrow("Apenas o autor ou gestor pode editar");

      await expect(
        deleteLeadActivity({ data: { activityId: actId } })
      ).rejects.toThrow("Apenas o autor ou gestor pode excluir");
    });

    it("permite gestor excluir nota de colega da mesma loja e bloqueia cross-tenant", async () => {
      mocks.identity.role = "manager";
      mocks.identity.memberships = [{ store_id: storeA, role: "manager" }];
      mocks.supabase.from.mockImplementation(() =>
        makeTableChain({
          maybeSingle: {
            id: actId,
            store_id: storeA,
            author_id: authorB,
            type: "note",
          },
        })
      );

      const ok = await deleteLeadActivity({ data: { activityId: actId } });
      expect(ok).toEqual({ success: true });

      mocks.supabase.from.mockImplementation(() =>
        makeTableChain({
          maybeSingle: {
            id: actId,
            store_id: storeB,
            author_id: authorB,
            type: "note",
          },
        })
      );

      await expect(
        deleteLeadActivity({ data: { activityId: actId } })
      ).rejects.toThrow("outra loja");
    });

    it("impede edição ou remoção de evento automático stage_change", async () => {
      mocks.identity.role = "owner";
      mocks.identity.memberships = [{ store_id: storeA, role: "owner" }];
      mocks.supabase.from.mockImplementation(() =>
        makeTableChain({
          maybeSingle: {
            id: actId,
            store_id: storeA,
            author_id: authorA,
            type: "stage_change",
          },
        })
      );

      await expect(
        updateLeadActivity({ data: { activityId: actId, content: "Edit" } })
      ).rejects.toThrow("imutáveis");
      await expect(
        deleteLeadActivity({ data: { activityId: actId } })
      ).rejects.toThrow("imutáveis");
    });
  });

  describe("Contract Addendums BFF (listContractAddendums & createContractAddendum)", () => {
    it("lista aditivos apenas para contrato da mesma loja", async () => {
      let calls = 0;
      mocks.supabase.from.mockImplementation((table: string) => {
        calls++;
        if (table === "contracts") {
          return makeTableChain({
            maybeSingle: { id: contractId, store_id: storeA, metadata: {} },
          });
        }
        return makeTableChain({
          selectRows: [
            {
              id: "add-1",
              contract_id: contractId,
              title: "Inclusão de Seguro",
              content: "Cobertura ampliada",
              status: "pending",
              created_at: "2026-11-16T10:00:00Z",
              signed_at: null,
            },
          ],
        });
      });

      const list = await listContractAddendums({ data: { contractId } });
      expect(calls).toBe(2);
      expect(list).toHaveLength(1);
      expect(list[0].title).toBe("Inclusão de Seguro");
    });

    it("bloqueia acesso cross-tenant e registra aditivo + trilha audit_chain no fluxo feliz", async () => {
      mocks.supabase.from.mockImplementation(() =>
        makeTableChain({
          maybeSingle: { id: contractId, store_id: storeB, metadata: {} },
        })
      );

      await expect(
        listContractAddendums({ data: { contractId } })
      ).rejects.toThrow("Acesso não autorizado");

      await expect(
        createContractAddendum({
          data: {
            contractId,
            title: "Aditivo Indevido",
            content: "Contrato pertence a outra agência.",
          },
        })
      ).rejects.toThrow("Acesso não autorizado");

      const tablesTouched: string[] = [];
      mocks.supabase.from.mockImplementation((table: string) => {
        tablesTouched.push(table);
        if (table === "contracts") {
          return makeTableChain({
            maybeSingle: {
              id: contractId,
              store_id: storeA,
              status: "signed",
              metadata: {},
            },
          });
        }
        if (table === "contract_addendums") {
          return makeTableChain({
            insertSingle: {
              id: "add-new-1",
              contract_id: contractId,
              title: "Inclusão de Passageiro",
              content: "Passageiro adicional incluído no pacote.",
              status: "pending_signature",
            },
          });
        }
        return makeTableChain({ insertSingle: { id: "audit-1" } });
      });

      const created = await createContractAddendum({
        data: {
          contractId,
          title: "Inclusão de Passageiro",
          content: "Passageiro adicional incluído no pacote.",
        },
      });

      expect(created).toMatchObject({
        id: "add-new-1",
        status: "pending_signature",
      });
      expect(tablesTouched).toEqual([
        "contracts",
        "contract_addendums",
        "contract_audit_chain",
      ]);
    });
  });
});
