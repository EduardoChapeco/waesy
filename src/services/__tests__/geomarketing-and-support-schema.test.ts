import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

const STORE_ID = "550e8400-e29b-41d4-a716-446655440010";
const USER_ID = "550e8400-e29b-41d4-a716-446655440099";

const mockState = vi.hoisted(() => ({
  identity: {
    id: "550e8400-e29b-41d4-a716-446655440099" as string | null,
    role: "owner",
    store_id: "550e8400-e29b-41d4-a716-446655440010" as string | null,
    memberships: [{ store_id: "550e8400-e29b-41d4-a716-446655440010", role: "owner" }],
  } as any,
  storeRow: null as any,
  productRows: [] as any[],
  directoryRow: null as any,
  uploadError: null as { message: string } | null,
}));

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any = {}) => {
        const parsed =
          typeof schema === "function"
            ? schema(args?.data)
            : typeof schema?.parse === "function"
              ? schema.parse(args?.data)
              : args?.data;
        return fn({ data: parsed });
      },
    }),
    handler: (fn: any) => async (args: any = {}) => fn(args || {}),
  }),
}));

vi.mock("@/lib/server-access", async () => {
  const actual = await vi.importActual<typeof import("@/lib/server-access")>("@/lib/server-access");
  return {
    ...actual,
    getServerIdentity: async () => mockState.identity,
  };
});

vi.mock("@/lib/supabase", () => ({
  getServerClient: () => ({
    from: (table: string) => {
      const chain: any = {
        select: () => chain,
        eq: () => chain,
        ilike: () => chain,
        limit: () => chain,
        update: () => chain,
        maybeSingle: async () => {
          if (table === "stores") return { data: mockState.storeRow, error: null };
          if (table === "directory_listings") return { data: mockState.directoryRow, error: null };
          return { data: null, error: null };
        },
        then: (resolve: any) => {
          if (table === "products") return resolve({ data: mockState.productRows, error: null });
          if (table === "store_viability_studies") return resolve({ data: null, error: null });
          return resolve({ data: [], error: null });
        },
      };
      return chain;
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: mockState.uploadError ? null : { path: "ok.pdf" }, error: mockState.uploadError }),
        getPublicUrl: (p: string) => ({ data: { publicUrl: `https://cdn.example.test/${p}` } }),
      }),
    },
  }),
}));

import {
  exportViabilityStudyDossier,
  inspectCompetitorWebPresence,
} from "@/services/geomarketing-cortex.functions";

describe("Schema Sync & Anti-Fake — support-tickets e geomarketing-cortex", () => {
  beforeEach(() => {
    mockState.identity = {
      id: USER_ID,
      role: "owner",
      store_id: STORE_ID,
      memberships: [{ store_id: STORE_ID, role: "owner" }],
    };
    mockState.storeRow = null;
    mockState.productRows = [];
    mockState.directoryRow = null;
    mockState.uploadError = null;
  });

  it("elimina referencias inexistentes a chat_threads.guest_phone em support-tickets.functions.ts", () => {
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/services/support-tickets.functions.ts"),
      "utf8",
    );
    expect(src).not.toContain("guest_phone");
    expect(src).toContain("primary_phone_e164");
  });

  it("elimina geradores sinteticos (heuristic_local, checkerboard % 2, 4.3, 62 e || 5500) do geomarketing", () => {
    const geoSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/services/geomarketing-cortex.functions.ts"),
      "utf8",
    );
    const routeSrc = fs.readFileSync(
      path.resolve(process.cwd(), "src/routes/workspace.viabilidade.tsx"),
      "utf8",
    );
    expect(geoSrc).not.toContain("heuristic_local");
    expect(geoSrc).not.toContain("fallbackAnchors");
    expect(geoSrc).not.toContain("deterministicOffset");
    expect(geoSrc).not.toContain("(idx + fIdx) % 2");
    expect(geoSrc).not.toContain("estimatedRating: 4.3");
    expect(geoSrc).not.toContain("digitalMaturityScore: 62");
    expect(routeSrc).not.toContain("comp.estimatedTicketCents || 5500");
  });

  it("bloqueia inspecao e exportacao de viabilidade sem usuario autenticado", async () => {
    mockState.identity = { id: null, role: "guest" };

    await expect(
      (inspectCompetitorWebPresence as any)({
        data: {
          competitorId: `dir-${STORE_ID}`,
          competitorName: "Concorrente Teste",
          city: "Chapecó",
        },
      }),
    ).rejects.toThrow("Não autorizado");

    await expect(
      (exportViabilityStudyDossier as any)({
        data: {
          studyId: "study-1",
          storeId: STORE_ID,
          htmlContent: "<div>Relatório</div>",
        },
      }),
    ).rejects.toThrow("Não autorizado");
  });

  it("retorna null (zero nota/maturidade inventada) quando estabelecimento não possui avaliacoes nem website no banco", async () => {
    mockState.directoryRow = {
      id: STORE_ID,
      website_url: null,
      contact_whatsapp: "(49) 99988-7766",
      contact_phone: null,
      contact_email: null,
      rating: 5.0,
      reviews_count: 0,
      price_level: null,
    };

    const audit = await (inspectCompetitorWebPresence as any)({
      data: {
        competitorId: `dir-${STORE_ID}`,
        competitorName: "Loja Sem Reviews",
        city: "Chapecó",
      },
    });

    expect(audit.estimatedRating).toBeNull();
    expect(audit.channelsDetected).toEqual(["WhatsApp Comercial"]);
    expect(audit.publicPriceRange).toBeNull();
  });

  it("propaga erro real ao falhar upload de PDF em vez de retornar success: true no catch", async () => {
    mockState.uploadError = { message: "Bucket offline" };

    await expect(
      (exportViabilityStudyDossier as any)({
        data: {
          studyId: "study-fail",
          storeId: STORE_ID,
          htmlContent: "<div>Conteudo HTML valido</div>",
        },
      }),
    ).rejects.toThrow("Bucket offline");
  });
});
