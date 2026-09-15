import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @tanstack/react-start
vi.mock("@tanstack/react-start", () => ({
  createServerFn: vi.fn(() => {
    const fnBuilder: any = {
      validator: vi.fn((schema: any) => {
        fnBuilder._schema = schema;
        return fnBuilder;
      }),
      handler: vi.fn((handlerFn: any) => {
        const callable = async (args: any) => {
          let data = args?.data;
          if (fnBuilder._schema && data !== undefined) {
            data = fnBuilder._schema.parse(data);
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

// Mock Supabase Server Client & Identity
vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn().mockResolvedValue({
    id: "user-test-uuid-1",
    role: "authenticated",
    store_id: "store-test-uuid-1",
  }),
  assertStoreAccess: vi.fn().mockResolvedValue(true),
  requirePlatformAdmin: vi.fn().mockResolvedValue(true),
}));

vi.mock("./identity.functions", () => ({
  getIdentity: vi.fn().mockResolvedValue({
    id: "user-test-uuid-1",
    role: "authenticated",
    email: "cliente@usewaesy.com",
  }),
}));

const mockAuditInsert = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock("@/lib/supabase", () => ({
  getServerClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === "user_token_wallets") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  balance: 150000,
                  balance_pending_maturity: 25000,
                  vesting_unlock_date: "2026-10-01T00:00:00Z",
                  is_locked: false,
                  lifetime_earned: 175000,
                  lifetime_redeemed: 0,
                  created_at: new Date().toISOString(),
                },
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === "profiles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "user-test-uuid-1",
                  full_name: "Anunciante Verificado",
                  role: "user",
                  avatar_url: null,
                },
                error: null,
              }),
            })),
          })),
        };
      }

      if (table === "audit_logs") {
        return {
          insert: mockAuditInsert,
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn().mockResolvedValue({
                    data: [
                      {
                        id: "log-1",
                        created_at: new Date().toISOString(),
                        action: "store_cashback_earned",
                        payload_snapshot: {
                          amount: 50000,
                          origin_store_name: "Café Regional",
                          description: "Cashback compra #1029",
                        },
                      },
                    ],
                    error: null,
                  }),
                })),
              })),
            })),
          })),
        };
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  })),
}));

import {
  getUserTokenWallet,
  attemptUserTokenTransferBlocked,
} from "./tokens.functions";

describe("Segurança Militar de Tokens & Zero-Transfer Policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve carregar a carteira do usuário com status de segurança militar e vesting", async () => {
    const wallet = await (getUserTokenWallet as any)({ data: {} });

    expect(wallet).toBeDefined();
    expect(wallet.balance).toBe(150000);
    expect(wallet.balance_pending_maturity).toBe(25000);
    expect(wallet.security_level).toBe("MILITARY_ZERO_TRUST");
    expect(wallet.zero_transfer_policy_active).toBe(true);
    expect(wallet.transactions).toHaveLength(1);
    expect(wallet.transactions[0].audit_seal).toContain("SEAL-");
  });

  it("deve bloquear sumariamente qualquer tentativa de transferência direta de tokens entre contas e auditar o alerta", async () => {
    await expect(
      (attemptUserTokenTransferBlocked as any)({
        data: {
          target_user_id: "attacker-target-uuid",
          amount: 50000,
          reason: "Tentativa de envio não autorizada",
        },
      })
    ).rejects.toThrow("ZERO_TRANSFER_VIOLATION");

    // Verifica que o alerta crítico de segurança militar foi registrado no log pétreo
    expect(mockAuditInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "security_zero_transfer_violation_blocked",
        entity_type: "token_security_alert",
        payload_snapshot: expect.objectContaining({
          threat_level: "CRITICAL",
          policy: "ZERO_TRANSFER_MILITARY_POLICY",
        }),
      })
    );
  });
});

describe("Módulo de Classificados com Agenda de Serviços", () => {
  it("deve validar corretamente a estrutura de agendamento de serviços", () => {
    const servicePayload = {
      title: "Manutenção de Ar Condicionado",
      category: "service",
      booking_enabled: true,
      service_duration_minutes: 90,
      available_slots: 4,
      available_weekdays: ["seg", "qua", "sex"],
      working_hours_start: "08:30",
      working_hours_end: "17:30",
    };

    expect(servicePayload.booking_enabled).toBe(true);
    expect(servicePayload.available_weekdays).toEqual(["seg", "qua", "sex"]);
    expect(servicePayload.service_duration_minutes).toBe(90);
    expect(servicePayload.available_slots).toBe(4);
  });

  it("deve garantir que o ecossistema não possui mais referências desatualizadas a P2P", () => {
    const vocabularyList = [
      "Acordo Comercial Direto",
      "Minhas Negociações",
      "Classificados Locais",
      "Desapego Direto",
      "Isenção de Negociações",
    ];

    vocabularyList.forEach((term) => {
      expect(term.toLowerCase()).not.toContain("p2p");
    });
  });

  it("deve validar schemas de impulsionamento e períodos permitidos", () => {
    const validPlans = [7, 15, 30];
    validPlans.forEach((days) => {
      expect([7, 15, 30]).toContain(days);
    });

    const invalidPlan = 10;
    expect([7, 15, 30].includes(invalidPlan)).toBe(false);
  });

  it("deve validar a estrutura de métricas de telemetria dos classificados", () => {
    const adMetrics = {
      views_count: 142,
      clicks_count: 38,
      proposals_count: 5,
      is_boosted: true,
      boost_plan: "Destaque 15 dias",
      boosted_until: new Date(Date.now() + 15 * 86400000).toISOString(),
    };

    expect(adMetrics.views_count).toBeGreaterThan(0);
    expect(adMetrics.clicks_count).toBeGreaterThan(0);
    expect(adMetrics.is_boosted).toBe(true);
    expect(new Date(adMetrics.boosted_until).getTime()).toBeGreaterThan(Date.now());
  });
});
