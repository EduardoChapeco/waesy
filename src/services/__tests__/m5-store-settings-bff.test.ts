import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockIdentity, mockDb } = vi.hoisted(() => ({
  mockIdentity: {
    id: "user-owner-1",
    store_id: "store-1",
    role: "owner",
    isPlatformAdmin: false,
    memberships: [{ store_id: "store-1", role: "owner" }],
  },
  mockDb: {
    from: vi.fn(),
  },
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: () => ({
      handler: (fn: any) => fn,
    }),
    handler: (fn: any) => fn,
  }),
}));

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => mockDb,
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn(async () => mockIdentity),
  assertStoreAccess: vi.fn(),
  assertOwnerAccess: vi.fn(),
  requireAdmin: vi.fn(),
}));

describe("M5 BFF — _saveStoreSettings & _getStoreSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aborta atualização de settings antes do UPDATE se a leitura atual de stores falhar", async () => {
    const updateMock = vi.fn();
    mockDb.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: null,
            error: { message: "connection lost" },
          }),
        }),
      }),
      update: updateMock,
    }));

    const { _saveStoreSettings } = await import("../store.functions");

    await expect(
      _saveStoreSettings({ name: "Loja Nova" } as any),
    ).rejects.toThrow("Erro ao ler configurações atuais da loja: connection lost");

    expect(updateMock).not.toHaveBeenCalled();
  });

  it("preserva settings existentes, aplica merge seguro e bloqueia mutação de enabled_modules por dono com nicho já definido", async () => {
    const capturedUpdates: any[] = [];

    mockDb.from.mockImplementation(() => ({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              settings: {
                segment: "tourism",
                working_hours: { mon: { isOpen: true, intervals: [] } },
              },
            },
            error: null,
          }),
        }),
      }),
      update: (payload: any) => {
        capturedUpdates.push(payload);
        return {
          eq: async () => ({ error: null }),
        };
      },
    }));

    const { _saveStoreSettings } = await import("../store.functions");

    const res = await _saveStoreSettings({
      name: "Excelência Tour Atualizada",
      city: "São Miguel do Oeste",
      enabled_modules: ["hacked_module"],
      payment_processing_mode: "direct_store",
    } as any);

    expect(res).toEqual({ status: "success" });
    expect(capturedUpdates).toHaveLength(1);
    const updatePayload = capturedUpdates[0];
    expect(updatePayload.name).toBe("Excelência Tour Atualizada");
    expect(updatePayload.city).toBe("São Miguel do Oeste");
    expect(updatePayload.enabled_modules).toBeUndefined();
    expect(updatePayload.settings.working_hours).toEqual({
      mon: { isOpen: true, intervals: [] },
    });
    expect(updatePayload.settings.payment_processing_mode).toBe("direct_store");
    expect(updatePayload.settings.enabled_modules).toBeUndefined();
  });
});
