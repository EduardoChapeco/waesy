import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCanonicalDimensions } from "@/lib/crop-image";

const {
  mockTableHandlers,
  mockServerIdentity,
  mockExecuteAiCall,
  mockFetch,
  mockDb,
} = vi.hoisted(() => {
  const handlers: Record<string, (filters: Array<[string, string, any]>) => { data: any; error: any }> = {};

  function makeChain(table: string) {
    const filters: Array<[string, string, any]> = [];
    const exec = () => (handlers[table] ? handlers[table](filters) : { data: null, error: null });
    const chain: any = {
      select: () => chain,
      insert: () => chain,
      update: () => chain,
      delete: () => chain,
      eq: (c: string, v: any) => {
        filters.push(["eq", c, v]);
        return chain;
      },
      ilike: (c: string, v: any) => {
        filters.push(["ilike", c, v]);
        return chain;
      },
      not: (c: string, op: string, v: any) => {
        filters.push([`not:${op}`, c, v]);
        return chain;
      },
      or: (v: string) => {
        filters.push(["or", "or", v]);
        return chain;
      },
      order: () => chain,
      limit: () => chain,
      maybeSingle: () => Promise.resolve(exec()),
      single: () => Promise.resolve(exec()),
      then: (res: any, rej?: any) => Promise.resolve(exec()).then(res, rej),
    };
    return chain;
  }

  return {
    mockTableHandlers: handlers,
    mockServerIdentity: vi.fn<() => Promise<any>>(),
    mockExecuteAiCall: vi.fn<(...args: any[]) => Promise<any>>(),
    mockFetch: vi.fn(),
    mockDb: {
      from: (table: string) => makeChain(table),
    },
  };
});

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
  getAnonServerClient: () => mockDb,
}));

vi.mock("@/lib/server-access", () => ({
  STAFF_ROLES: ["owner", "platform_admin", "manager", "admin", "seller"],
  assertStoreAccess: vi.fn(),
  getServerIdentity: (...args: any[]) => mockServerIdentity(...args),
}));

vi.mock("../api-orchestrator.functions", () => ({
  executeUnifiedAiCall: (...args: any[]) => mockExecuteAiCall(...args),
}));

vi.mock("@/lib/logger", () => ({
  logSystemError: vi.fn(),
}));

describe("M3, M4 & M5 — Meta CAPI Real, Studio AI Unificada, Crop Zero-Drift e InfoJobs Unified Insights", () => {
  beforeEach(() => {
    for (const k of Object.keys(mockTableHandlers)) {
      delete mockTableHandlers[k];
    }
    mockServerIdentity.mockReset();
    mockExecuteAiCall.mockReset();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);
  });

  it("M4: getCanonicalDimensions separa estritamente 28:9 (1920x617) de 21:9 (1920x823) sem distorção", () => {
    expect(getCanonicalDimensions(28 / 9, "desktop")).toEqual({ width: 1920, height: 617 });
    expect(getCanonicalDimensions(28 / 9, "mobile")).toEqual({ width: 1080, height: 347 });

    expect(getCanonicalDimensions(21 / 9, "desktop")).toEqual({ width: 1920, height: 823 });
    expect(getCanonicalDimensions(21 / 9, "mobile")).toEqual({ width: 1080, height: 463 });
  });

  it("M3: dispatchPixelConversionEvent não simula success=true sem pixel e envia POST real Meta CAPI quando configurado", async () => {
    const { dispatchPixelConversionEvent } = await import("../telemetry.functions");

    mockTableHandlers.store_pixel_configs = () => ({ data: null, error: null });
    const notConfigured = await dispatchPixelConversionEvent({
      data: {
        store_id: "11111111-1111-4111-8111-111111111111",
        event_name: "Lead",
        event_id: "ev-none",
      },
    });
    expect(notConfigured.success).toBe(false);
    expect(notConfigured.dispatched).toBe(false);
    expect(notConfigured.reason).toBe("pixel_not_configured");
    expect(mockFetch).not.toHaveBeenCalled();

    mockTableHandlers.store_pixel_configs = () => ({
      data: {
        meta_pixel_id: "9988776655",
        meta_capi_token: "EAAB_test_token",
        meta_test_event_code: "TEST123",
      },
      error: null,
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ events_received: 1 }),
    });

    const sent = await dispatchPixelConversionEvent({
      data: {
        store_id: "11111111-1111-4111-8111-111111111111",
        event_name: "Lead",
        event_id: "ev-real-1",
        user_data: { phone: "49999999999", email: "cliente@real.com.br" },
      },
    });
    expect(sent.success).toBe(true);
    expect(sent.dispatched).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0];
    expect(String(url)).toContain("https://graph.facebook.com/v19.0/9988776655/events");
  });

  it("M3: generateBrandKitWithAI e generateBrandBriefingWithAI usam executeUnifiedAiCall e rejeitam respostas inválidas sem fallback hardcoded", async () => {
    const { generateBrandKitWithAI, generateBrandBriefingWithAI } = await import("../studio.functions");
    mockServerIdentity.mockResolvedValue({
      id: "user-1",
      role: "owner",
      store_id: "11111111-1111-4111-8111-111111111111",
    });

    mockExecuteAiCall.mockResolvedValueOnce({
      text: JSON.stringify({
        colors: { primary: "#123456", background: "#ffffff" },
        typography: { heading_font: "Inter" },
      }),
    });
    const palette = await generateBrandKitWithAI({ data: { context_hint: "Agência editorial" } });
    expect(palette.colors.primary).toBe("#123456");

    mockExecuteAiCall.mockResolvedValueOnce({ text: "not-json" });
    await expect(generateBrandBriefingWithAI({ data: { company_name: "Loja Teste" } })).rejects.toThrow(
      /interpretar|briefing/i,
    );
  });

  it("M5: getEmployerProfileInsights combina job_applications, classified_applications e employer_reviews", async () => {
    const { getEmployerProfileInsights } = await import("../jobs.functions");

    mockTableHandlers.job_applications = () => ({
      data: [
        {
          previous_company_rating: 4,
          previous_company_feedback: "Bom ambiente",
          reason_for_leaving: "Nova oportunidade",
          last_salary_cents: 400000,
          created_at: "2026-10-01T00:00:00Z",
        },
      ],
      error: null,
    });
    mockTableHandlers.classified_applications = () => ({
      data: [],
      error: null,
    });
    mockTableHandlers.employer_reviews = () => ({
      data: [
        {
          company_rating: 5,
          pros: "Cultura sólida",
          exit_reason: "Crescimento profissional",
          salary_cents: 600000,
          created_at: "2026-11-01T00:00:00Z",
        },
      ],
      error: null,
    });

    const insights = await getEmployerProfileInsights({
      data: {
        companyName: "Waesy Tech",
        storeId: "11111111-1111-4111-8111-111111111111",
      },
    });
    expect(insights.total_reviews).toBe(2);
    expect(insights.average_rating).toBe(4.5);
    expect(insights.average_salary_cents).toBe(500000);
    expect(insights.salary_samples_count).toBe(2);
  });
});
