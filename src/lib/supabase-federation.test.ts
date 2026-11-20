import { describe, expect, it, vi } from "vitest";
import {
  CANONICAL_ARCHIVE_PROJECT_REF,
  CANONICAL_OFFLOAD_PROJECT_REF,
  CANONICAL_PRIMARY_PROJECT_REF,
  createTieredFederatedClient,
  isOffloadRpc,
  isOffloadTable,
  MINING_BULK_TABLES_LIST,
  OFFLOAD_TABLES_LIST,
  resolveFederationTopology,
  resolveTableNode,
} from "./supabase-federation";

function makeFakeClient(name: string) {
  return {
    __name: name,
    from: vi.fn((table: string) => ({ client: name, table })),
    rpc: vi.fn((fn: string, args?: any) => ({ client: name, fn, args })),
    auth: { getUser: vi.fn(() => ({ client: name })) },
    storage: { from: vi.fn((bucket: string) => ({ client: name, bucket })) },
  } as any;
}

describe("supabase-federation (3-node reversible architecture)", () => {
  it("declares canonical project refs for primary, offload, and archive", () => {
    expect(CANONICAL_PRIMARY_PROJECT_REF).toBe("wlxapubsesiwtxzbuygt");
    expect(CANONICAL_OFFLOAD_PROJECT_REF).toBe("vnmqummmgvgyazglnoav");
    expect(CANONICAL_ARCHIVE_PROJECT_REF).toBe("jfuebqmltksyznovhlwa");
  });

  it("resolves topology cleanly across single, dual, triple, and forced-single rollback", () => {
    expect(resolveFederationTopology({})).toBe("single");
    expect(
      resolveFederationTopology({
        mode: "single",
        offloadUrl: "https://vnmqummmgvgyazglnoav.supabase.co",
        offloadKey: "service_role_key_valid_length",
        archiveUrl: "https://jfuebqmltksyznovhlwa.supabase.co",
        archiveKey: "service_role_key_valid_length",
      }),
    ).toBe("single");

    expect(
      resolveFederationTopology({
        mode: "auto",
        offloadUrl: "https://vnmqummmgvgyazglnoav.supabase.co",
        offloadKey: "service_role_key_valid_length",
      }),
    ).toBe("dual");

    expect(
      resolveFederationTopology({
        mode: "auto",
        offloadUrl: "https://vnmqummmgvgyazglnoav.supabase.co",
        offloadKey: "service_role_key_valid_length",
        archiveUrl: "https://jfuebqmltksyznovhlwa.supabase.co",
        archiveKey: "service_role_key_valid_length",
      }),
    ).toBe("triple");
  });

  it("routes core transactional tables to primary and append-only telemetry/logs to offload", () => {
    const primary = makeFakeClient("primary");
    const offload = makeFakeClient("offload");
    const archive = makeFakeClient("archive");

    const client = createTieredFederatedClient(
      primary,
      { offload: () => offload, archive: () => archive },
      { routeMining: false },
    );

    // Core tables stay on primary
    expect((client.from("profiles") as any).client).toBe("primary");
    expect((client.from("stores") as any).client).toBe("primary");
    expect((client.from("orders") as any).client).toBe("primary");
    expect((client.from("travel_proposals") as any).client).toBe("primary");
    expect((client.from("audit_logs") as any).client).toBe("primary");

    // Append-only heavy log tables route to offload
    expect((client.from("system_error_logs") as any).client).toBe("offload");
    expect((client.from("public.telemetry_logs") as any).client).toBe("offload");
    expect((client.from("ad_telemetry_events") as any).client).toBe("offload");

    // Mining stays on primary unless SUPABASE_ROUTE_MINING=1
    expect((client.from("news_articles") as any).client).toBe("primary");

    // Auth and Storage always stay on primary
    expect((client.auth.getUser() as any).client).toBe("primary");
    expect((client.storage.from("avatars") as any).client).toBe("primary");
  });

  it("routes mining bulk tables to archive when routeMining is enabled and falls back cleanly", () => {
    expect(resolveTableNode("news_articles", { offload: true, archive: true }, { routeMining: true })).toBe("archive");
    expect(resolveTableNode("news_articles", { offload: true, archive: false }, { routeMining: true })).toBe("offload");
    expect(resolveTableNode("news_articles", { offload: false, archive: false }, { routeMining: true })).toBe("primary");
    expect(resolveTableNode("system_error_logs", { offload: false, archive: true })).toBe("archive");
    expect(resolveTableNode("system_error_logs", { offload: false, archive: false })).toBe("primary");
  });

  it("returns primary directly with zero proxy overhead when no support nodes exist", () => {
    const primary = makeFakeClient("primary");
    const client = createTieredFederatedClient(primary, {});
    expect(client).toBe(primary);
  });

  it("excludes tables with cross-node PostgREST embeds from OFFLOAD_TABLES_LIST", () => {
    const forbidden = [
      "audit_logs",
      "user_cart_telemetry",
      "session_audit_logs",
      "scraper_audit_log",
      "whatsapp_provider_webhook_events",
    ];
    for (const tbl of forbidden) {
      expect(OFFLOAD_TABLES_LIST).not.toContain(tbl);
      expect(isOffloadTable(tbl)).toBe(false);
    }
    expect(MINING_BULK_TABLES_LIST.length).toBeGreaterThan(0);
    expect(isOffloadRpc("purge_transient_bloat")).toBe(true);
    expect(isOffloadRpc("cancel_order_atomic")).toBe(false);
  });
});
