import { describe, expect, it } from "vitest";
import {
  buildProviderRequest,
  decryptSecretPayload,
  normalizeProviderPayload,
  normalizeBookingPayload,
  parseConnectorRequest,
  validateProviderCredential,
} from "../../supabase/functions/_shared/infotravel";

const agencyId = "11111111-1111-4111-8111-111111111111";

function expectError(fn: () => unknown, code: string) {
  try { fn(); throw new Error("expected error"); } catch (error: any) { expect(error.code).toBe(code); }
}

describe("InfoTravel connector contract", () => {
  it("accepts only a known action and UUID tenant", () => {
    expect(parseConnectorRequest({ action: "search_hotels", agencyId, params: { city: "Recife" } })).toMatchObject({ action: "search_hotels", agencyId });
    expectError(() => parseConnectorRequest({ action: "arbitrary_proxy", agencyId }), "UNSUPPORTED_ACTION");
    expectError(() => parseConnectorRequest({ action: "search_hotels", agencyId: "not-a-uuid" }), "INVALID_AGENCY");
  });

  it("builds a real provider request without exposing credentials in the URL", () => {
    const { url, init } = buildProviderRequest(
      { base_url: "https://provider.example/api", api_key: "secret", action_paths: { search_hotels: "/hotel/search" } },
      "search_hotels",
      { destination: "Recife" },
    );
    expect(url).toBe("https://provider.example/hotel/search");
    expect((init.headers as Headers).get("x-api-key")).toBe("secret");
    expect(url).not.toContain("secret");
    expect(init.body).toContain("Recife");
  });

  it("fails closed when the provider contract is incomplete", () => {
    expectError(() => validateProviderCredential({ api_key: "secret" }), "PROVIDER_CONTRACT_NOT_CONFIGURED");
    expectError(() => validateProviderCredential({ base_url: "https://provider.example" }), "PROVIDER_CREDENTIALS_INCOMPLETE");
  });

  it("normalizes a provider booking deterministically for the atomic RPC contract", () => {
    expect(normalizeBookingPayload({ id: "BK-1", pnr: "PNR-1", client: { name: "Ana", email: "ana@example.com" }, flights: [] })).toMatchObject({
      booking_id: "BK-1", locator: "PNR-1", client_name: "Ana", client_email: "ana@example.com", passengers: [], flights: [], hotels: [],
    });
  });

  it("emits the versioned v1 contract and stable external IDs for search results", () => {
    const first = normalizeProviderPayload("search_hotels", { hotels: [{ name: "Hotel Azul", city: "Recife", price: 120 }] });
    const second = normalizeProviderPayload("search_hotels", { hotels: [{ name: "Hotel Azul", city: "Recife", price: 120 }] });
    expect(first).toMatchObject({ contract_version: "infotravel-v1", action: "search_hotels" });
    expect((first.offers as any[])[0].external_id).toBe((second.offers as any[])[0].external_id);
  });

  it("rejects import payloads without a booking identifier", () => {
    expectError(() => normalizeProviderPayload("import_booking", { client: { name: "Ana" }, hotels: [] }), "PROVIDER_SCHEMA_MISMATCH");
  });

  it("decrypts the AES-GCM format produced by the application vault", async () => {
    const keyMaterial = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("x".repeat(32)));
    const key = await crypto.subtle.importKey("raw", keyMaterial, { name: "AES-GCM" }, false, ["encrypt"]);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode('{"base_url":"https://provider.example"}')));
    const tag = cipher.slice(-16);
    const body = cipher.slice(0, -16);
    const hex = (value: Uint8Array) => [...value].map((item) => item.toString(16).padStart(2, "0")).join("");
    await expect(decryptSecretPayload(`${hex(iv)}:${hex(tag)}:${hex(body)}`, "x".repeat(32))).resolves.toContain("provider.example");
  });
});
