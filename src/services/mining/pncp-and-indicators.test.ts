import { describe, it, expect, vi } from "vitest";
import { parseCnjNumber } from "./datajud-harvester";
import { fetchPncpContracts } from "./pncp-extractor";

describe("PNCP Harvester & Mining Extraction Unit Tests", () => {
  it("parseCnjNumber correctly parses standard CNJ numbers for TJSC", () => {
    const cnj = parseCnjNumber("5012345-67.2024.8.24.0018");
    expect(cnj.clean).toBe("50123456720248240018");
    expect(cnj.tribunalAcronym).toBe("tjsc");
    expect(cnj.state).toBe("SC");
    expect(cnj.judiciarySegment).toBe(8); // Justiça Estadual
    expect(cnj.courtCode).toBe(24); // Santa Catarina
    expect(cnj.year).toBe("2024");
  });

  it("parseCnjNumber correctly parses TRF4 federal court numbers", () => {
    const cnj = parseCnjNumber("5001234-88.2024.4.04.7200");
    expect(cnj.clean).toBe("50012348820244047200");
    expect(cnj.tribunalAcronym).toBe("trf4");
    expect(cnj.state).toBe("RS");
    expect(cnj.judiciarySegment).toBe(4); // Justiça Federal
    expect(cnj.courtCode).toBe(4); // TRF4
  });

  it("fetchPncpContracts handles network failures transparently without synthetic mock data", async () => {
    // Intercept fetch to simulate failure
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

    const contracts = await fetchPncpContracts({ query: "Chapecó", uf: "SC", limit: 5 });
    expect(contracts).toEqual([]); // Zero mocks! Honest empty return

    globalThis.fetch = originalFetch;
  });
});
