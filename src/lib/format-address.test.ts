import { describe, it, expect } from "vitest";
import { formatCanonicalAddress } from "./format-address";

describe("formatCanonicalAddress", () => {
  it("cleans broken S/N prefix with leading comma and dash", () => {
    const result = formatCanonicalAddress(", S/N - , São Miguel do Oeste - SC");
    expect(result).not.toBeNull();
    expect(result?.display).toBe("São Miguel do Oeste - SC");
  });

  it("handles structured object with street and number", () => {
    const result = formatCanonicalAddress({
      street: "Rua Almirante Barroso",
      number: "888",
      neighborhood: "Centro",
      city: "São Miguel do Oeste",
      state: "SC",
    });
    expect(result?.display).toBe("Rua Almirante Barroso, 888 • Centro • São Miguel do Oeste - SC");
  });

  it("omits empty number without adding trailing commas", () => {
    const result = formatCanonicalAddress({
      street: "Rua Almirante Barroso",
      number: "S/N",
      neighborhood: "Centro",
      city: "São Miguel do Oeste",
      state: "SC",
    });
    expect(result?.display).toBe("Rua Almirante Barroso • Centro • São Miguel do Oeste - SC");
  });

  it("handles only city and state", () => {
    const result = formatCanonicalAddress(null, "Chapecó", "SC");
    expect(result?.display).toBe("Chapecó - SC");
  });

  it("deduplicates repeated city and state in string input", () => {
    const result = formatCanonicalAddress(
      "R. Alm. Barroso, 888 - Centro, São Miguel do Oeste - SC, 89900-000 • São Miguel do Oeste - SC",
      "São Miguel do Oeste",
      "SC"
    );
    expect(result?.display).not.toContain("São Miguel do Oeste - SC • São Miguel do Oeste - SC");
  });
});
