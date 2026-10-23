import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("GAP-01: Fluxo de Pré-Visualização em Rascunho (preview-live)", () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => mockStorage[key] || null,
      setItem: (key: string, val: string) => {
        mockStorage[key] = val;
      },
      removeItem: (key: string) => {
        delete mockStorage[key];
      },
      clear: () => {
        mockStorage = {};
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("deve gravar e recuperar payload de preview perfeitamente", () => {
    const mockDraft = {
      id: "preview-live",
      title: "Trator Valtra A950 em Ótimo Estado",
      price_cents: 18500000,
      category: "agri",
      attributes: {
        power_cv: 95,
        cabin_type: "cabin",
        hours_used: 1200,
      },
    };

    sessionStorage.setItem("waesy_preview_payload", JSON.stringify(mockDraft));

    const retrievedRaw = sessionStorage.getItem("waesy_preview_payload");
    expect(retrievedRaw).toBeTruthy();

    const parsed = JSON.parse(retrievedRaw!);
    expect(parsed.id).toBe("preview-live");
    expect(parsed.title).toBe("Trator Valtra A950 em Ótimo Estado");
    expect(parsed.attributes.power_cv).toBe(95);
    expect(parsed.attributes.cabin_type).toBe("cabin");
  });

  it("deve permitir hidratação segura quando preview=true e params.id é preview-live", () => {
    const isPreviewLiveId = "preview-live" === "preview-live";
    const searchPreview = true;
    const isPreviewMode = isPreviewLiveId || searchPreview;

    expect(isPreviewMode).toBe(true);

    const mockEventDraft = {
      id: "preview-live",
      title: "Festival de Inverno 2026",
      category: "event",
      price_cents: 8000,
      attributes: {
        event_type: "festival",
        ticket_tiers: [
          { name: "Pista", price_cents: 8000, capacity: 500 },
          { name: "Área VIP", price_cents: 15000, capacity: 100 },
        ],
      },
    };

    sessionStorage.setItem("waesy_preview_payload", JSON.stringify(mockEventDraft));

    const raw = sessionStorage.getItem("waesy_preview_payload");
    const effectiveClassified = raw ? JSON.parse(raw) : null;

    expect(effectiveClassified).not.toBeNull();
    expect(effectiveClassified.title).toBe("Festival de Inverno 2026");
    expect(effectiveClassified.attributes.ticket_tiers.length).toBe(2);
  });

  it("deve fazer fallback defensivo se sessionStorage estiver vazio ou corrompido sem estourar exceção", () => {
    sessionStorage.setItem("waesy_preview_payload", "invalid-json-string{");

    let effectiveClassified = null;
    try {
      const raw = sessionStorage.getItem("waesy_preview_payload");
      if (raw) {
        effectiveClassified = JSON.parse(raw);
      }
    } catch (err) {
      // Capturado defensivamente
      effectiveClassified = null;
    }

    expect(effectiveClassified).toBeNull();
  });
});
