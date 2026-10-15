import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any) => {
        const validated = schema ? (schema.parse ? schema.parse(args?.data) : args?.data) : args?.data;
        return fn({ data: validated });
      },
    }),
    handler: (fn: any) => async (args: any) => fn(args || {}),
  }),
}));

import { getUnlistedClassified } from "./classifieds.functions";
import { generatePixBrCode } from "@/lib/pix-payload";
import { uploadCopilotMultimodalAttachment } from "./ai-conversations.functions";

const mockClassifiedsStore = new Map<string, any>();

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: (table: string) => ({
      select: () => {
        let currentId: string | null = null;
        let currentStatus: string | null = null;

        const chain = {
          eq: (col: string, val: any) => {
            if (col === "id") currentId = val;
            if (col === "status") currentStatus = val;
            return chain;
          },
          maybeSingle: () => {
            if (table === "classifieds" && currentId) {
              const item = mockClassifiedsStore.get(currentId);
              if (item && (!currentStatus || item.status === currentStatus)) {
                return Promise.resolve({ data: item, error: null });
              }
            }
            return Promise.resolve({ data: null, error: null });
          },
        };
        return chain;
      },
    }),
    storage: {
      from: () => ({
        upload: vi.fn().mockResolvedValue({ data: { path: "test" }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://test.supabase.co/file.pdf" } }),
      }),
    },
  }),
  getAnonServerClient: () => ({}),
}));

vi.mock("@/lib/server-access", () => ({
  getServerIdentity: vi.fn().mockResolvedValue({ id: "user-123", store_id: "store-123" }),
  getIdentity: vi.fn().mockResolvedValue({ id: "user-123" }),
  requireStaff: vi.fn().mockResolvedValue({ id: "user-123", store_id: "store-123" }),
}));

vi.mock("@/lib/rate-limiter", () => ({
  enforceRateLimit: vi.fn(),
}));

describe("Travel & Copilot Master Specs Remediation", () => {
  beforeEach(() => {
    mockClassifiedsStore.clear();
    vi.clearAllMocks();
  });

  describe("Pilar 1: Classifieds & Travel Proposals Unlisted Visibility", () => {
    it("autoriza leitura de proposta unlisted quando o token de segurança confere", async () => {
      const unlistedId = "22222222-2222-2222-2222-222222222222";
      const validToken = "vip-hash-token-01";
      mockClassifiedsStore.set(unlistedId, {
        id: unlistedId,
        title: "Proposta VIP CVC Especial",
        status: "active",
        visibility: "unlisted",
        access_token: validToken,
      });

      const result = await getUnlistedClassified({ data: { id: unlistedId, token: validToken } });
      expect(result).toBeDefined();
      expect(result.id).toBe(unlistedId);
      expect(result.title).toBe("Proposta VIP CVC Especial");
    });

    it("bloqueia leitura de proposta unlisted quando o token é inválido", async () => {
      const unlistedId = "22222222-2222-2222-2222-222222222222";
      mockClassifiedsStore.set(unlistedId, {
        id: unlistedId,
        title: "Proposta VIP CVC Especial",
        status: "active",
        visibility: "unlisted",
        access_token: "vip-hash-token-01",
      });

      await expect(
        getUnlistedClassified({ data: { id: unlistedId, token: "wrong-token" } })
      ).rejects.toThrow("Acesso restrito");
    });

    it("retorna erro quando o pacote não é encontrado", async () => {
      const nonExistentId = "99999999-9999-9999-9999-999999999999";
      await expect(
        getUnlistedClassified({ data: { id: nonExistentId, token: "any-token" } })
      ).rejects.toThrow("Pacote ou proposta não encontrado");
    });
  });

  describe("Pilar 3: Pix Payload Resilience & EMV Compliance", () => {
    it("gera BRCode com CRC-16 CCITT determinístico de 4 dígitos", () => {
      const brCode = generatePixBrCode({
        pixKey: "12345678900",
        amountCents: 150000,
        merchantName: "AGENCIA EXEMPLO",
        merchantCity: "CHAPECO",
        txId: "RES123",
      });

      expect(brCode).toContain("000201");
      expect(brCode).toContain("54071500.00");
      expect(brCode).toContain("6304");
      expect(brCode.length).toBeGreaterThan(60);
    });

    it("lança erro honesto ao passar chave Pix vazia", () => {
      expect(() =>
        generatePixBrCode({
          pixKey: "   ",
          amountCents: 1000,
          merchantName: "LOJA",
          merchantCity: "CHAPECO",
        })
      ).toThrow("Chave Pix obrigatória");
    });
  });

  describe("Copilot Camada 3: Upload Multimodal Edge Cases", () => {
    it("rejeita upload de arquivo com buffer de zero bytes", async () => {
      await expect(
        uploadCopilotMultimodalAttachment({
          data: {
            fileName: "vazio.txt",
            fileType: "text/plain",
            base64Data: "",
          },
        })
      ).rejects.toThrow();
    });

    it("rejeita upload de tipo MIME proibido (ex: binário executável)", async () => {
      await expect(
        uploadCopilotMultimodalAttachment({
          data: {
            fileName: "script.sh",
            fileType: "application/x-sh",
            base64Data: Buffer.from("echo hello").toString("base64"),
          },
        })
      ).rejects.toThrow("não permitido");
    });
  });
});
