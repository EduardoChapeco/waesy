/**
 * Tier 1: Feature Coverage - View Preferences Contract & BFF
 * Covering:
 * - Feature 4: Database Migration & BFF for View Preferences
 * - Feature 5: Vitest Suite for View Preferences Contract
 * 
 * Target: >=5 test cases per feature (Total >= 10 test cases)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { E2EContractHarness } from "../harness/e2e-contract-harness";
import {
  WorkspaceViewPreferenceSchema,
  TENANT_SALON_ID,
  TENANT_RETAIL_ID,
} from "../harness/test-fixtures";

describe("Tier 1: View Preferences Contract & BFF", () => {
  let harness: E2EContractHarness;

  beforeEach(() => {
    harness = new E2EContractHarness();
  });

  // ==========================================
  // Feature 4: Database Migration & BFF for View Preferences
  // ==========================================
  describe("Feature 4: Database Migration & BFF for View Preferences", () => {
    it("4.1 validates valid WorkspaceViewPreferenceSchema payload", () => {
      const payload = {
        store_id: TENANT_SALON_ID,
        module: "agenda",
        view_mode: "kanban",
        column_settings: { show_phone: true, compact_cards: false },
        sort_field: "scheduled_at",
        sort_direction: "asc",
        filters: { status: "confirmed" },
      };

      const parsed = WorkspaceViewPreferenceSchema.parse(payload);
      expect(parsed.store_id).toBe(TENANT_SALON_ID);
      expect(parsed.module).toBe("agenda");
      expect(parsed.view_mode).toBe("kanban");
      expect(parsed.sort_direction).toBe("asc");
    });

    it("4.2 returns default fallback view preference when no record exists in database", async () => {
      const pref = await harness.getViewPreference(TENANT_SALON_ID, "agenda");
      expect(pref.store_id).toBe(TENANT_SALON_ID);
      expect(pref.module).toBe("agenda");
      expect(pref.view_mode).toBe("table"); // Canonical default is table view
      expect(pref.sort_field).toBeNull();
      expect(pref.sort_direction).toBeNull();
    });

    it("4.3 executes idempotent upsert of view preferences in persistence layer", async () => {
      // First save
      const firstSave = await harness.saveViewPreference({
        store_id: TENANT_SALON_ID,
        module: "pedidos",
        view_mode: "cards",
        column_settings: {},
        sort_field: "total_cents",
        sort_direction: "desc",
        filters: {},
      });
      expect(firstSave.view_mode).toBe("cards");

      // Retrieve
      const retrievedFirst = await harness.getViewPreference(TENANT_SALON_ID, "pedidos");
      expect(retrievedFirst.view_mode).toBe("cards");

      // Second save (update same record)
      const secondSave = await harness.saveViewPreference({
        store_id: TENANT_SALON_ID,
        module: "pedidos",
        view_mode: "table",
        column_settings: {},
        sort_field: "created_at",
        sort_direction: "desc",
        filters: {},
      });
      expect(secondSave.view_mode).toBe("table");

      // Verify updated
      const retrievedSecond = await harness.getViewPreference(TENANT_SALON_ID, "pedidos");
      expect(retrievedSecond.view_mode).toBe("table");
      expect(retrievedSecond.sort_field).toBe("created_at");
    });

    it("4.4 preserves complex nested JSON filters and column settings without loss", async () => {
      const complexSettings = {
        visibleColumns: ["name", "status", "price", "professional"],
        customWidths: { name: 240, status: 120 },
        density: "compact",
      };
      const complexFilters = {
        dateRange: { start: "2026-11-01", end: "2026-11-30" },
        professionals: ["u1", "u2"],
        priceMin: 5000,
      };

      const saved = await harness.saveViewPreference({
        store_id: TENANT_SALON_ID,
        module: "clientes",
        view_mode: "table",
        column_settings: complexSettings,
        sort_field: null,
        sort_direction: null,
        filters: complexFilters,
      });

      expect(saved.column_settings).toEqual(complexSettings);
      expect(saved.filters).toEqual(complexFilters);
    });

    it("4.5 enforces multi-tenant boundary: store preferences are isolated per store_id", async () => {
      // Store A saves kanban for agenda
      await harness.saveViewPreference({
        store_id: TENANT_SALON_ID,
        module: "agenda",
        view_mode: "kanban",
        column_settings: {},
        sort_field: null,
        sort_direction: null,
        filters: {},
      });

      // Store B saves cards for agenda
      await harness.saveViewPreference({
        store_id: TENANT_RETAIL_ID,
        module: "agenda",
        view_mode: "cards",
        column_settings: {},
        sort_field: null,
        sort_direction: null,
        filters: {},
      });

      // Verify Store A still has kanban, Store B has cards
      const prefSalon = await harness.getViewPreference(TENANT_SALON_ID, "agenda");
      const prefRetail = await harness.getViewPreference(TENANT_RETAIL_ID, "agenda");

      expect(prefSalon.view_mode).toBe("kanban");
      expect(prefRetail.view_mode).toBe("cards");
    });
  });

  // ==========================================
  // Feature 5: Vitest Suite for View Preferences Contract
  // ==========================================
  describe("Feature 5: Vitest Contract Verification & Zod Edge Guards", () => {
    it("5.1 rejects invalid module identifier outside the enumerated modules", () => {
      const invalidModulePayload = {
        store_id: TENANT_SALON_ID,
        module: "invalid_unsupported_module",
        view_mode: "table",
      };

      const result = WorkspaceViewPreferenceSchema.safeParse(invalidModulePayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("module");
      }
    });

    it("5.2 rejects invalid view_mode enum outside supported modes", () => {
      const invalidViewModePayload = {
        store_id: TENANT_SALON_ID,
        module: "agenda",
        view_mode: "unsupported_3d_mode",
      };

      const result = WorkspaceViewPreferenceSchema.safeParse(invalidViewModePayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("view_mode");
      }
    });

    it("5.3 rejects non-UUID store_id adhering to zero-trust tenant format", () => {
      const nonUuidPayload = {
        store_id: "not-a-valid-uuid-1234",
        module: "agenda",
        view_mode: "table",
      };

      const result = WorkspaceViewPreferenceSchema.safeParse(nonUuidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("store_id");
      }
    });

    it("5.4 validates sort_direction is restricted to 'asc', 'desc', or null (B.25)", () => {
      const validAsc = WorkspaceViewPreferenceSchema.safeParse({
        store_id: TENANT_SALON_ID,
        module: "tarefas",
        view_mode: "kanban",
        sort_direction: "asc",
      });
      expect(validAsc.success).toBe(true);

      const validNull = WorkspaceViewPreferenceSchema.safeParse({
        store_id: TENANT_SALON_ID,
        module: "tarefas",
        view_mode: "kanban",
        sort_direction: null,
      });
      expect(validNull.success).toBe(true);

      const invalidDirection = WorkspaceViewPreferenceSchema.safeParse({
        store_id: TENANT_SALON_ID,
        module: "tarefas",
        view_mode: "kanban",
        sort_direction: "random_direction",
      });
      expect(invalidDirection.success).toBe(false);
    });

    it("5.5 applies defensive defaults when optional parameters are omitted (B.25)", () => {
      const minimalPayload = {
        store_id: TENANT_SALON_ID,
        module: "agenda",
        view_mode: "table",
      };

      const parsed = WorkspaceViewPreferenceSchema.parse(minimalPayload);
      expect(parsed.column_settings).toEqual({});
      expect(parsed.filters).toEqual({});
      expect(parsed.sort_field).toBeUndefined();
      expect(parsed.sort_direction).toBeUndefined();
    });
  });
});
