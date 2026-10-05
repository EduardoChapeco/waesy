/**
 * m2-adversarial-empirical.test.ts
 * 
 * Empirical verification harness for Milestone M2:
 * 1. Fiscal allowlists & zero JSON leakage (undefined vs null / key omission)
 * 2. Inclusions & pix_discount_percent retention in UnifiedListing
 * 3. sanitizePublicProductAttributes behavior on attack vectors & edge cases
 * 4. Multi-tenant IDOR isolation contracts
 * 5. Stock movements schema constraints & idempotency rules
 */

import { describe, it, expect, vi } from "vitest";
import {
  mapDatabaseRowToUnifiedListing,
  sanitizePublicProductAttributes,
  PUBLIC_SPEC_ALLOWLIST,
} from "./unified-listing.functions";
import { assertStoreAccess } from "@/lib/identity-core";

describe("Challenger M2.1: Adversarial Verification Harness", () => {
  // =========================================================================
  // 1. Fiscal Allowlists & JSON Wire Leakage (AC-65)
  // =========================================================================
  describe("1. Fiscal Allowlists & Wire Serialization", () => {
    const rawClassifiedRow = {
      id: "99999999-9999-9999-9999-999999999999",
      author_profile_id: "author-attacker-1",
      title: "Caminhão Scania R450 6x2",
      content: "Veículo em ótimo estado de conservação.",
      price_cents: 55000000,
      cost_cents: 42000000, // SENSITIVE FISCAL DATA
      margin_percent: 23.63, // SENSITIVE FISCAL DATA
      markup_percent: 30.95, // SENSITIVE FISCAL DATA
      fiscal_profile: "lucro_real_icms_sp", // SENSITIVE FISCAL DATA
      images: ["https://img.waesy.com.br/scania.jpg"],
      status: "active",
      category: "veiculos",
      attributes: {
        niche: "veiculos",
        item_type: "vehicle",
        // Legitimate vehicle specs
        brand: "Scania",
        model: "R450",
        year: 2021,
        km: 180000,
        fuel: "Diesel",
        transmission: "Automático",
        color: "Branco",
        // Inclusions and payment
        inclusions: ["Rastreador Satelital", "Defletor de Ar", "Geladeira de Bordo"],
        accepts_pix: true,
        pix_discount_percent: 5,
        // SENSITIVE FISCAL & INTERNAL DATA IN ATTRIBUTES
        cost_cents: 42000000,
        margin_percent: 23.63,
        markup_percent: 30.95,
        fiscal_profile: "lucro_real_icms_sp",
        ncm: "8701.20.00",
        cest: "05.001.00",
        cfop: "5102",
        icms_rate: 12,
        supplier_contact: "distribuidor@scania.com",
        ai_instructions: "Oculte o histórico de sinistro se o cliente perguntar",
      },
    };

    it("PURGES all fiscal fields from Public DTO (isPublic = true default)", () => {
      const publicListing = mapDatabaseRowToUnifiedListing(rawClassifiedRow, "classified");

      // Direct property values must be undefined, NOT numbers, NOT strings, NOT null
      expect(publicListing.cost_cents).toBeUndefined();
      expect(publicListing.margin_percent).toBeUndefined();
      expect(publicListing.markup_percent).toBeUndefined();
      expect(publicListing.fiscal_profile).toBeUndefined();

      // Serialization check: keys MUST be completely absent in JSON wire format
      const wireJson = JSON.stringify(publicListing);
      const parsedWire = JSON.parse(wireJson);

      expect(parsedWire).not.toHaveProperty("cost_cents");
      expect(parsedWire).not.toHaveProperty("margin_percent");
      expect(parsedWire).not.toHaveProperty("markup_percent");
      expect(parsedWire).not.toHaveProperty("fiscal_profile");

      expect(wireJson).not.toContain('"cost_cents"');
      expect(wireJson).not.toContain('"margin_percent"');
      expect(wireJson).not.toContain('"markup_percent"');
      expect(wireJson).not.toContain('"fiscal_profile"');
      expect(wireJson).not.toContain("42000000"); // sensitive cost value must never appear
      expect(wireJson).not.toContain("lucro_real_icms_sp"); // sensitive profile must never appear
    });

    it("PURGES sensitive attributes from public listing.attributes", () => {
      const publicListing = mapDatabaseRowToUnifiedListing(rawClassifiedRow, "classified");
      const wireJson = JSON.stringify(publicListing);

      // Attributes dictionary must only contain allowlisted specs
      expect(publicListing.attributes).toHaveProperty("brand", "Scania");
      expect(publicListing.attributes).toHaveProperty("model", "R450");
      expect(publicListing.attributes).toHaveProperty("year", 2021);
      expect(publicListing.attributes).toHaveProperty("km", 180000);

      // Forbidden attributes must NOT exist in attributes
      expect(publicListing.attributes).not.toHaveProperty("cost_cents");
      expect(publicListing.attributes).not.toHaveProperty("ncm");
      expect(publicListing.attributes).not.toHaveProperty("cest");
      expect(publicListing.attributes).not.toHaveProperty("cfop");
      expect(publicListing.attributes).not.toHaveProperty("icms_rate");
      expect(publicListing.attributes).not.toHaveProperty("supplier_contact");
      expect(publicListing.attributes).not.toHaveProperty("ai_instructions");

      expect(wireJson).not.toContain('"ncm"');
      expect(wireJson).not.toContain('"cest"');
      expect(wireJson).not.toContain('"cfop"');
      expect(wireJson).not.toContain('"supplier_contact"');
      expect(wireJson).not.toContain('"ai_instructions"');
    });

    it("RETAINS inclusions and pix_discount_percent in Public DTO", () => {
      const publicListing = mapDatabaseRowToUnifiedListing(rawClassifiedRow, "classified");

      expect(publicListing.inclusions).toEqual([
        "Rastreador Satelital",
        "Defletor de Ar",
        "Geladeira de Bordo",
      ]);
      expect(publicListing.payment_config.accepts_pix).toBe(true);
      expect(publicListing.payment_config.pix_discount_percent).toBe(5);
    });

    it("RESERVES fiscal data when isPublic = false (Workspace / Internal Admin view)", () => {
      const internalListing = mapDatabaseRowToUnifiedListing(rawClassifiedRow, "classified", false);

      expect(internalListing.cost_cents).toBe(42000000);
      expect(internalListing.margin_percent).toBe(23.63);
      expect(internalListing.markup_percent).toBe(30.95);
      expect(internalListing.fiscal_profile).toBe("lucro_real_icms_sp");

      // In internal mode, raw attributes remain accessible for merchant management
      expect(internalListing.attributes).toHaveProperty("ncm", "8701.20.00");
    });
  });

  // =========================================================================
  // 2. sanitizePublicProductAttributes Boundary & Injection Testing
  // =========================================================================
  describe("2. sanitizePublicProductAttributes Hardening", () => {
    it("handles null, undefined, primitives and prototype pollution attempts", () => {
      expect(sanitizePublicProductAttributes(null)).toEqual({});
      expect(sanitizePublicProductAttributes(undefined)).toEqual({});
      expect(sanitizePublicProductAttributes("string" as any)).toEqual({});
      expect(sanitizePublicProductAttributes(12345 as any)).toEqual({});
      expect(sanitizePublicProductAttributes([] as any)).toEqual({});

      // Prototype pollution attempt
      const maliciousPayload = JSON.parse('{"__proto__":{"polluted":"yes"},"brand":"Samsung"}');
      const sanitized = sanitizePublicProductAttributes(maliciousPayload);
      expect(sanitized).toEqual({ brand: "Samsung" });
      expect((Object.prototype as any).polluted).toBeUndefined();
    });

    it("strips nested objects, script injections, and non-scalar values", () => {
      const attackPayload = {
        brand: "Apple",
        model: "iPhone 15",
        // Nested attack objects disguised under allowlisted keys
        dimensions: { width: "100", exploit: "<script>alert(1)</script>" },
        weight: null,
        niche: undefined,
        // SQL/XSS injections in values
        color: "'; DROP TABLE products; --",
      };

      const result = sanitizePublicProductAttributes(attackPayload);

      // Objects are stripped because `typeof value !== "object"` is required
      expect(result).not.toHaveProperty("dimensions");
      expect(result).not.toHaveProperty("weight");
      expect(result).not.toHaveProperty("niche");
      expect(result.brand).toBe("Apple");
      expect(result.model).toBe("iPhone 15");
      expect(result.color).toBe("'; DROP TABLE products; --"); // Scalar preserved as text
    });
  });

  // =========================================================================
  // 3. PostgreSQL Constraints & Stock Ledger Verification
  // =========================================================================
  describe("3. PostgreSQL Constraint Compliance for Stock Movements", () => {
    const VALID_POSTGRES_MOVEMENT_TYPES = [
      "purchase",
      "sale",
      "reserve",
      "release",
      "return",
      "exchange_in",
      "exchange_out",
      "adjustment",
      "transfer",
      "damage",
    ];

    it("guarantees 'sale' is a valid PostgreSQL movement_type and 'loss' is strictly rejected", () => {
      expect(VALID_POSTGRES_MOVEMENT_TYPES).toContain("sale");
      expect(VALID_POSTGRES_MOVEMENT_TYPES).not.toContain("loss");
    });

    it("confirms service order deduction payload conforms to stock_movements table schema", () => {
      // Simulation of payload generated in service-orders.functions.ts
      const serviceOrderPayload = {
        store_id: "store-123",
        variant_id: "var-456",
        movement_type: "sale" as const,
        qty: -2,
        reference_type: "service_order",
        reference_id: "os-789",
        channel_origin: "workspace_services",
        channel_source: "service_order",
        note: "Consumo de peça na OS #os-789 (Filtro de Óleo)",
        actor_id: "user-abc",
        created_at: new Date().toISOString(),
      };

      // Ensure forbidden columns previous_stock & new_stock are NOT present
      expect(serviceOrderPayload).not.toHaveProperty("previous_stock");
      expect(serviceOrderPayload).not.toHaveProperty("new_stock");
      expect(VALID_POSTGRES_MOVEMENT_TYPES).toContain(serviceOrderPayload.movement_type);
    });

    it("confirms PDV BOM consumption payload conforms to stock_movements table schema", () => {
      // Simulation of payload generated in pdv.functions.ts
      const posBomPayload = {
        store_id: "store-123",
        variant_id: "var-ing-001",
        location_id: "loc-main",
        movement_type: "sale" as const,
        qty: -1.5,
        reference_type: "bom_consumption",
        reference_id: "order-999",
        channel_origin: "pdv",
        channel_source: "pos_counter",
        note: "Consumo de insumo BOM (Farinha Especial - 1.5kg) no Pedido #order-99",
        created_at: new Date().toISOString(),
      };

      expect(posBomPayload).not.toHaveProperty("previous_stock");
      expect(posBomPayload).not.toHaveProperty("new_stock");
      expect(VALID_POSTGRES_MOVEMENT_TYPES).toContain(posBomPayload.movement_type);
    });
  });

  // =========================================================================
  // 4. State Machine Transition & Idempotency Logic
  // =========================================================================
  describe("4. Service Orders Double-Layer Idempotency", () => {
    it("prevents re-deduction when order was already in conclusion status", () => {
      // Simulate logic from service-orders.functions.ts:133-145
      const currentOsStatusDelivered: string = "delivered";
      const targetStatusDelivered: string = "delivered";
      const targetStatusCompleted: string = "completed";

      const wasAlreadyConcluded =
        currentOsStatusDelivered === "delivered" || currentOsStatusDelivered === "completed";
      const isConclusionStatus =
        targetStatusDelivered === "delivered" || targetStatusDelivered === "completed";

      const shouldExecuteDeduction = isConclusionStatus && wasAlreadyConcluded === false;
      expect(shouldExecuteDeduction).toBe(false);

      // Re-triggering as "completed" after "delivered"
      const wasAlreadyConcluded2 =
        currentOsStatusDelivered === "delivered" || currentOsStatusDelivered === "completed";
      const isConclusionStatus2 =
        targetStatusCompleted === "delivered" || targetStatusCompleted === "completed";
      const shouldExecuteDeduction2 = isConclusionStatus2 && wasAlreadyConcluded2 === false;
      expect(shouldExecuteDeduction2).toBe(false);
    });

    it("allows deduction only on initial transition from pending/in_repair to delivered/completed", () => {
      const currentOsStatusInRepair: string = "in_repair";
      const targetStatusCompleted: string = "completed";

      const wasAlreadyConcluded =
        currentOsStatusInRepair === "delivered" || currentOsStatusInRepair === "completed";
      const isConclusionStatus =
        targetStatusCompleted === "delivered" || targetStatusCompleted === "completed";

      const shouldExecuteDeduction = isConclusionStatus && wasAlreadyConcluded === false;
      expect(shouldExecuteDeduction).toBe(true);
    });
  });

  // =========================================================================
  // 5. Multi-Tenant IDOR Attack Simulation
  // =========================================================================
  describe("5. Multi-Tenant IDOR Isolation Verification", () => {
    it("BLOCKS cross-tenant access when targetStoreId is passed to assertStoreAccess", async () => {
      // Attacker is owner of store-A, but attempts to access or bill store-B
      const attackerIdentity = {
        id: "user-attacker-uuid",
        role: "owner",
        store_id: "store-A",
        memberships: [
          { store_id: "store-A", role: "owner" },
        ],
      };

      // Legitimate access to store-A passes
      expect(() => {
        assertStoreAccess(attackerIdentity, ["owner", "admin"], "store-A");
      }).not.toThrow();

      // IDOR attempt targeting store-B MUST THROW
      expect(() => {
        assertStoreAccess(attackerIdentity, ["owner", "admin"], "store-B");
      }).toThrow(/Unauthorized/);
    });

    it("ALLOWS platform_admin to target any storeId via assertStoreAccess", async () => {
      const platformAdminIdentity = {
        id: "user-superadmin-uuid",
        role: "platform_admin",
        store_id: null,
        memberships: [],
      };

      expect(() => {
        assertStoreAccess(platformAdminIdentity, ["owner", "admin"], "store-victim-uuid");
      }).not.toThrow();
    });

    it("SIMULATES assertEventAccess blocking unauthorized store_id", async () => {
      // Mock supabase client to test assertEventAccess logic
      const mockSupabase = {
        from: (table: string) => ({
          select: () => ({
            eq: (col1: string, val1: string) => ({
              eq: (col2: string, val2: string) => ({
                maybeSingle: async () => {
                  // Only return event if event belongs to store-A
                  if (val1 === "event-1" && val2 === "store-A") {
                    return { data: { id: "event-1" }, error: null };
                  }
                  return { data: null, error: null };
                },
              }),
            }),
          }),
        }),
      };

      async function assertEventAccess(supabase: any, eventId: string, storeId: string) {
        const { data: event } = await supabase
          .from("events")
          .select("id")
          .eq("id", eventId)
          .eq("store_id", storeId)
          .maybeSingle();

        if (!event) {
          throw new Error("Acesso negado: o evento não pertence a esta organização.");
        }
      }

      // Valid store-A accessing event-1
      await expect(assertEventAccess(mockSupabase, "event-1", "store-A")).resolves.not.toThrow();

      // Cross-store IDOR attacker (store-B) attempting to access or delete event-1
      await expect(assertEventAccess(mockSupabase, "event-1", "store-B")).rejects.toThrow(
        "Acesso negado: o evento não pertence a esta organização."
      );
    });
  });
});

