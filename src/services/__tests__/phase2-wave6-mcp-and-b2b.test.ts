import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  getMcpResourcesManifest,
  getMcpToolsManifest,
  verifyMcpScopeMatch,
} from "@/services/mcp-server.functions";

describe("Phase 2 — Wave 6: External Waesy MCP Server Auth/Scopes & B2B Syndication", () => {
  const rootDir = process.cwd();

  it("validates exact, wildcard, and prefix-wildcard MCP API Key scopes", () => {
    expect(verifyMcpScopeMatch(["*"], "store:tourism:write")).toBe(true);
    expect(verifyMcpScopeMatch(["store:tourism:write"], "store:tourism:write")).toBe(true);
    expect(verifyMcpScopeMatch(["store:tourism:*"], "store:tourism:write")).toBe(true);
    expect(verifyMcpScopeMatch(["store:tourism:read"], "store:tourism:write")).toBe(false);
    expect(verifyMcpScopeMatch([], "store:tourism:read")).toBe(false);
  });

  it("exposes new Wave 6 MCP tools and tourism-manifest resource in the MCP manifest", () => {
    const tools = getMcpToolsManifest();
    const toolNames = tools.map((t) => t.name);
    expect(toolNames).toContain("tourism_duplicate_itinerary");
    expect(toolNames).toContain("workspace_configure_ai_agent");

    const resources = getMcpResourcesManifest();
    expect(resources.map((r) => r.uri)).toContain("store://{storeId}/tourism-manifest");
  });

  it("verifies Wave 6 SQL tables, ai_mcp_servers.store_id fix, protocol 2025-03-26, and Branded App B2B gating", () => {
    const sql = fs.readFileSync(
      path.join(rootDir, "supabase/migrations/20270620000000_phase2_wave6_mcp_api_keys_and_b2b_syndication.sql"),
      "utf8",
    );
    const connectorsSrc = fs.readFileSync(path.join(rootDir, "src/services/mcp-connectors.functions.ts"), "utf8");
    const mcpRouteSrc = fs.readFileSync(path.join(rootDir, "src/routes/api.mcp.v1.tools.call.ts"), "utf8");
    const mcpServerSrc = fs.readFileSync(path.join(rootDir, "src/services/mcp-server.functions.ts"), "utf8");
    const brandedAppSrc = fs.readFileSync(path.join(rootDir, "src/services/branded-app.functions.ts"), "utf8");

    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.store_mcp_api_keys");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS public.b2b_partner_catalog_shares");

    expect(connectorsSrc).toContain("identity.store_id ||");
    expect(mcpRouteSrc).toContain('"2025-03-26"');
    expect(mcpRouteSrc).toContain("readMcpResource(uri, storeId, inboundAuthToken)");
    expect(mcpServerSrc).toContain("resolveMcpCallerIdentity");
    expect(mcpServerSrc).toContain('resourcePath.includes("/tourism-manifest")');

    expect(brandedAppSrc).toContain("visibility_scope");
    expect(brandedAppSrc).toContain("require_login_for_prices: Boolean(settings.require_login_for_prices)");
  });
});
