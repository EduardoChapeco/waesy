import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock do TanStack Start createServerFn para execução em testes unitários
vi.mock("@tanstack/react-start", () => {
  return {
    createServerFn: () => {
      let currentValidator: any = null;
      return {
        validator: (v: any) => {
          currentValidator = v;
          return {
            handler: (h: any) => async (args: any) => {
              const inputData = args?.data !== undefined ? args.data : args;
              const validated = currentValidator && typeof currentValidator.parse === "function"
                ? currentValidator.parse(inputData)
                : inputData;
              return h({ data: validated });
            },
          };
        },
        handler: (h: any) => async (args: any) => {
          const inputData = args?.data !== undefined ? args.data : args;
          return h({ data: inputData });
        },
      };
    },
  };
});

// Mock da identidade do servidor
let mockCurrentIdentity = {
  id: "11111111-1111-1111-1111-111111111111",
  role: "authenticated",
  store_id: "b0000000-0000-0000-0000-000000000001",
};

vi.mock("@/lib/server-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server-access")>();
  return {
    ...actual,
    getServerIdentity: vi.fn(async () => mockCurrentIdentity),
    assertStoreAccess: vi.fn(() => true),
  };
});

// Mock das chamadas Supabase
const mockRpc = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => {
  return {
    getServerClient: vi.fn(() => ({
      rpc: mockRpc,
      from: mockFrom,
    })),
    SupabaseUnconfiguredError: class extends Error {},
  };
});

describe("V139: Omni-Checkout, Logistics Engine & Trust/Safety Protocols", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Fase 1: GPS Mismatch & Geolocation Haversine Calculation", () => {
    it("deve detectar divergência de GPS (mismatch = true) quando distância > 35km", async () => {
      const { validateDeliveryLocationGPS } = await import("./addresses.functions");

      // Coordenadas: Dispositivo em Florianópolis (-27.5954, -48.5480)
      // Entrega em Chapecó (-27.1004, -52.6152) -> ~400km de distância
      const result = await (validateDeliveryLocationGPS as any)({
        data: {
          deviceLat: -27.5954,
          deviceLng: -48.5480,
          deliveryLat: -27.1004,
          deliveryLng: -52.6152,
          deliveryCity: "Chapecó",
          deliveryState: "SC",
          maxAllowedThresholdKm: 35,
        },
      });

      expect(result.isMismatch).toBe(true);
      expect(result.distanceKm).toBeGreaterThan(300);
      expect(result.message).toContain("A sua localização atual difere");
    });

    it("não deve disparar mismatch quando o dispositivo estiver no mesmo bairro ou cidade (< 35km)", async () => {
      const { validateDeliveryLocationGPS } = await import("./addresses.functions");

      // Centro de Chapecó (-27.1004, -52.6152) vs Efapi Chapecó (-27.0850, -52.6600) -> ~5km
      const result = await (validateDeliveryLocationGPS as any)({
        data: {
          deviceLat: -27.1004,
          deviceLng: -52.6152,
          deliveryLat: -27.0850,
          deliveryLng: -52.6600,
          deliveryCity: "Chapecó",
          deliveryState: "SC",
          maxAllowedThresholdKm: 35,
        },
      });

      expect(result.isMismatch).toBe(false);
      expect(result.distanceKm).toBeLessThan(15);
      expect(result.message).toContain("Localização validada com sucesso");
    });
  });

  describe("Fase 2: Motor Waesy Go & Logística de Precisão (The Motoboy Matrix)", () => {
    it("deve calcular tolerância de 15 minutos sem multa para motoboy", async () => {
      const { checkCourierWaitingPenalty } = await import("./waesy-go.functions");

      mockRpc.mockResolvedValueOnce({
        data: {
          order_id: "a0000000-0000-0000-0000-000000000001",
          courier_id: "c0000000-0000-0000-0000-000000000001",
          minutes_waiting: 10, // Menor que 15 min
          is_penalty_applicable: false,
          waiting_penalty_cents: 0,
        },
        error: null,
      });

      const res = await (checkCourierWaitingPenalty as any)({
        data: { orderId: "a0000000-0000-0000-0000-000000000001" },
      });

      expect(res.is_penalty_applicable).toBe(false);
      expect(res.waiting_penalty_cents).toBe(0);
      expect(res.minutes_waiting).toBe(10);
    });

    it("deve aplicar multa por minuto quando o cliente demorar mais de 15 minutos", async () => {
      const { checkCourierWaitingPenalty } = await import("./waesy-go.functions");

      // 25 minutos de espera = 10 minutos excedentes x R$ 0,50/min (50 cents) = R$ 5,00 (500 cents)
      mockRpc.mockResolvedValueOnce({
        data: {
          order_id: "a0000000-0000-0000-0000-000000000001",
          courier_id: "c0000000-0000-0000-0000-000000000001",
          minutes_waiting: 25,
          is_penalty_applicable: true,
          waiting_penalty_cents: 500,
        },
        error: null,
      });

      const res = await (checkCourierWaitingPenalty as any)({
        data: { orderId: "a0000000-0000-0000-0000-000000000001" },
      });

      expect(res.is_penalty_applicable).toBe(true);
      expect(res.waiting_penalty_cents).toBe(500);
      expect(res.minutes_waiting).toBe(25);
    });
  });

  describe("Fase 3: Central de Convivência & Trust/Safety Backend", () => {
    it("deve permitir cancelamento seguro da loja sem penalizar reputação no algoritmo", async () => {
      const { cancelOrderByStoreSafely } = await import("./trust-and-safety.functions");

      mockFrom.mockImplementation((table: string) => {
        if (table === "orders") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: "a0000000-0000-0000-0000-000000000001",
                      customer_id: "11111111-1111-1111-1111-111111111111",
                      user_id: "11111111-1111-1111-1111-111111111111",
                    },
                    error: null,
                  }),
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn().mockResolvedValue({ error: null }),
              })),
            })),
          };
        }
        if (table === "user_reputation") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { trust_score: 90, strikes: 0, status: "good" },
                  error: null,
                }),
              })),
            })),
            upsert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return {
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      });

      const res = await (cancelOrderByStoreSafely as any)({
        data: {
          orderId: "a0000000-0000-0000-0000-000000000001",
          storeId: "b0000000-0000-0000-0000-000000000001",
          reason: "suspected_fraud",
          notes: "Suspeita de documento falso e divergência grave de endereço",
        },
      });

      expect(res.success).toBe(true);
      expect(res.isSafeCancellation).toBe(true);
    });

    it("deve detectar anomalia de imagem (Anti-Scam AI) e sinalizar fraude", async () => {
      const { analyzeClaimForScam } = await import("./trust-and-safety.functions");

      mockFrom.mockReturnValue({
        upsert: vi.fn().mockResolvedValue({ error: null }),
      });

      // Claim com imagem contendo termo suspeito
      const res = await (analyzeClaimForScam as any)({
        data: {
          orderId: "a0000000-0000-0000-0000-000000000001",
          claimPhotoUrl: "https://generated_photos.example.com/damage.jpg",
          claimDescription: "O prato veio completamente aberto e danificado.",
        },
      });

      expect(res.isFlaggedAsScam).toBe(true);
      expect(res.trustStatus).toBe("flagged");
      expect(res.requiresManualReview).toBe(true);
    });

    it("deve aprovar reclamação legítima com foto real sem aplicar strike", async () => {
      const { analyzeClaimForScam } = await import("./trust-and-safety.functions");

      const res = await (analyzeClaimForScam as any)({
        data: {
          orderId: "a0000000-0000-0000-0000-000000000001",
          claimPhotoUrl: "https://storage.waesy.app/claims/real-delivery-proof.jpg",
          claimDescription: "Faltou a bebida do combo conforme pedido.",
        },
      });

      expect(res.isFlaggedAsScam).toBe(false);
      expect(res.trustStatus).toBe("verified");
    });
  });
});
