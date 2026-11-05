import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  IngestPayloadSchema,
  hashToken,
  authenticateIngest,
  INGEST_FEATURE_KEY,
} from "./whatsapp-group-ingest.server";
import * as supabaseMod from "@/lib/supabase";

describe("whatsapp-group-ingest payload & hashing", () => {
  const base = {
    idempotency_key: "abcdefgh1234",
    items: [{ phone: "49999998888", group_key: "g1", name: "Contato Teste" }],
  };

  it("aceita payload válido", () => {
    expect(IngestPayloadSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita store_id vindo do cliente (campo desconhecido)", () => {
    expect(IngestPayloadSchema.safeParse({ ...base, store_id: "x" }).success).toBe(false);
  });

  it("rejeita mais de 500 itens", () => {
    const items = Array.from({ length: 501 }, (_, i) => ({
      phone: `4999999${1000 + i}`,
      group_key: "g",
    }));
    expect(IngestPayloadSchema.safeParse({ ...base, items }).success).toBe(false);
  });

  it("rejeita chave de idempotência muito curta", () => {
    expect(IngestPayloadSchema.safeParse({ ...base, idempotency_key: "curto" }).success).toBe(false);
  });

  it("hash é determinístico e não reversível em claro", () => {
    expect(hashToken("token-secreto-123")).toBe(hashToken("token-secreto-123"));
    expect(hashToken("token-secreto-123")).not.toContain("token-secreto");
  });
});

describe("authenticateIngest security guard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna 401 quando não há header de autorização", async () => {
    const req = new Request("http://localhost/api/v1/ingest/whoami");
    const auth = await authenticateIngest(req);
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.status).toBe(401);
  });

  it("retorna 401 quando o token é muito curto (< 32 chars)", async () => {
    const req = new Request("http://localhost/api/v1/ingest/whoami", {
      headers: { authorization: "Bearer 12345" },
    });
    const auth = await authenticateIngest(req);
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.status).toBe(401);
  });

  it("retorna 401 quando o token não existe no banco", async () => {
    const mockSupabase: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      }),
    };
    vi.spyOn(supabaseMod, "getServerClient").mockReturnValue(mockSupabase);

    const req = new Request("http://localhost/api/v1/ingest/whoami", {
      headers: { authorization: "Bearer wae_0123456789abcdef0123456789abcdef" },
    });
    const auth = await authenticateIngest(req);
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.status).toBe(401);
  });

  it("retorna 401 quando o token está revogado", async () => {
    const mockSupabase: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "token-1",
                store_id: "store-1",
                revoked_at: "2026-11-01T00:00:00Z",
              },
              error: null,
            }),
          }),
        }),
      }),
    };
    vi.spyOn(supabaseMod, "getServerClient").mockReturnValue(mockSupabase);

    const req = new Request("http://localhost/api/v1/ingest/whoami", {
      headers: { authorization: "Bearer wae_0123456789abcdef0123456789abcdef" },
    });
    const auth = await authenticateIngest(req);
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.status).toBe(401);
  });

  it("retorna 401 quando o token está expirado", async () => {
    const mockSupabase: any = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "token-1",
                store_id: "store-1",
                expires_at: "2025-01-01T00:00:00Z",
              },
              error: null,
            }),
          }),
        }),
      }),
    };
    vi.spyOn(supabaseMod, "getServerClient").mockReturnValue(mockSupabase);

    const req = new Request("http://localhost/api/v1/ingest/whoami", {
      headers: { authorization: "Bearer wae_0123456789abcdef0123456789abcdef" },
    });
    const auth = await authenticateIngest(req);
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.status).toBe(401);
  });

  it("retorna 403 quando o workspace não possui a grant habilitada", async () => {
    const mockSupabase: any = {
      from: vi.fn((table: string) => {
        if (table === "ingest_tokens") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: "token-1", store_id: "store-outra", revoked_at: null },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === "workspace_feature_grants") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null, // Sem grant!
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };
    vi.spyOn(supabaseMod, "getServerClient").mockReturnValue(mockSupabase);

    const req = new Request("http://localhost/api/v1/ingest/whoami", {
      headers: { authorization: "Bearer wae_0123456789abcdef0123456789abcdef" },
    });
    const auth = await authenticateIngest(req);
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.status).toBe(403);
  });

  it("retorna storeId e tokenId com sucesso quando autorizado e atualiza last_used_at", async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    const mockSupabase: any = {
      from: vi.fn((table: string) => {
        if (table === "ingest_tokens") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: "token-uuid-123",
                    store_id: "store-excelencia-uuid",
                    revoked_at: null,
                    expires_at: "2099-01-01T00:00:00Z",
                  },
                  error: null,
                }),
              }),
            }),
            update: updateSpy,
          };
        }
        if (table === "workspace_feature_grants") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { enabled: true },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };
    vi.spyOn(supabaseMod, "getServerClient").mockReturnValue(mockSupabase);

    const req = new Request("http://localhost/api/v1/ingest/whoami", {
      headers: { authorization: "Bearer wae_0123456789abcdef0123456789abcdef" },
    });
    const auth = await authenticateIngest(req);
    expect(auth.ok).toBe(true);
    if (auth.ok) {
      expect(auth.storeId).toBe("store-excelencia-uuid");
      expect(auth.tokenId).toBe("token-uuid-123");
    }
    expect(updateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ last_used_at: expect.any(String) })
    );
  });
});
