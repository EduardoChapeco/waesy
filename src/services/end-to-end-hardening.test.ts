/**
 * end-to-end-hardening.test.ts
 *
 * Regression suite covering the Waesy End-to-End Remediation:
 * (a) Canvas & dark-mode theme isolation across core resolvers and builder/renderer frames
 * (b) Studio catalog & audit integrity across all 19 catalog templates + CRM captureChannel
 * (c) Copilot artifact types registry & safe media URL sanitizer
 * (d) Integration multi-tenant isolation, credential masking, OAuth state/returnPath,
 *     webhook tenant attribution + ERP master secrets, and MCP resources/prompts parity
 */

import { createHmac } from "node:crypto";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    validator: (schema: any) => ({
      handler: (fn: any) => async (args: any) => {
        const validated = schema ? schema.parse(args?.data) : args?.data;
        return fn({ data: validated });
      },
    }),
    handler: (fn: any) => async (args: any) => fn(args || {}),
  }),
}));

import {
  getDocumentThemeCanvasStyle,
  getDocumentThemeContainerProps,
} from "@/lib/builder/block-data-resolver";
import { OmniPageRenderer } from "@/components/builder/OmniPageRenderer";
import { BuilderViewportFrame } from "@/components/builder/BuilderViewportFrame";
import { BuilderCanvas } from "@/components/admin/builder/builder-canvas";
import {
  auditAllStudioTemplates,
  auditStudioTemplate,
} from "@/lib/builder/studio-template-audit";
import {
  COPILOT_ARTIFACT_TYPE_LABELS,
  getSafeArtifactMediaUrl,
} from "@/components/chat/copilot-artifact-panel";
import {
  listMarketplaceConnectors,
  saveMarketplaceConnector,
  sanitizeConnectorSettingsForClient,
} from "./marketplace-hub.functions";
import { readMcpResource } from "./mcp-server.functions";
import { resolveSafeMarketplaceReturnPath } from "@/routes/api.auth.marketplace.callback";
import * as serverAccess from "@/lib/server-access";
import * as identityCore from "@/lib/identity-core";
import * as supabaseModule from "@/lib/supabase";
import { encryptSecret } from "@/lib/crypto-vault.server";

function makeSupabaseChain(result: any = { data: null, error: null }) {
  const chain: any = {
    select: vi.fn(() => chain),
    insert: vi.fn(() => chain),
    update: vi.fn(() => chain),
    upsert: vi.fn(() => chain),
    delete: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    neq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    or: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
    single: vi.fn(async () => result),
    then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
  };
  return chain;
}

describe("Waesy End-to-End Hardening & Parity Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(serverAccess.assertStoreAccess).mockImplementation(
      identityCore.assertStoreAccess as any,
    );
  });

  // =========================================================================
  // (a) CANVAS & DARK-MODE THEME ISOLATION
  // =========================================================================
  describe("a) Canvas & Dark-Mode Theme Isolation", () => {
    it("generates isolated light tokens for yellow (#facc15) custom site background", () => {
      const { style, isolationScheme } = getDocumentThemeContainerProps({
        customThemeEnabled: true,
        backgroundColor: "#facc15",
        textColor: "#09090b",
        primaryColor: "#111827",
      });

      const vars = style as Record<string, string>;
      expect(isolationScheme).toBe("light");
      expect(style.colorScheme).toBe("light");
      expect(style.backgroundColor).toBe("#facc15");
      expect(style.color).toBe("#09090b");
      expect(vars["--background"]).toBe("#facc15");
      expect(vars["--foreground"]).toBe("#09090b");
      expect(vars["--surface"]).toContain("#facc15");
      expect(vars["--surface-card"]).toContain("#facc15");
      expect(vars["--popover"]).toContain("#facc15");
      expect(vars["--card"]).toContain("#facc15");
      expect(vars["--p-bg"]).toBe("#facc15");
      expect(vars["--p-ink"]).toBe("#09090b");
      expect(vars["--p-brand"]).toBe("#111827");
    });

    it("switches isolationScheme to dark on dark backgrounds", () => {
      const { style, isolationScheme } = getDocumentThemeContainerProps({
        customThemeEnabled: true,
        backgroundColor: "#09090b",
        textColor: "#fafafa",
        primaryColor: "#facc15",
      });
      expect(isolationScheme).toBe("dark");
      expect(style.colorScheme).toBe("dark");
      expect(style.backgroundColor).toBe("#09090b");
      expect(style.color).toBe("#fafafa");
    });

    it("applies custom isolated theme attributes and styles in OmniPageRenderer, BuilderViewportFrame and BuilderCanvas", () => {
      const yellowTheme = {
        customThemeEnabled: true,
        backgroundColor: "#facc15",
        textColor: "#09090b",
        primaryColor: "#111827",
      };

      const rendererHtml = renderToStaticMarkup(
        React.createElement(OmniPageRenderer, {
          document: {
            schemaVersion: 1,
            page_id: "pg-yellow",
            title: "Loja Amarela",
            slug: "amarela",
            niche: "varejo",
            theme: yellowTheme,
            blocks: [
              {
                id: "blk-1",
                type: "rich_text",
                config: {
                  title: "Fundo Isolado",
                  content: "Texto escuro em fundo amarelo",
                },
              },
            ],
          } as any,
        }),
      );
      expect(rendererHtml).toContain('data-builder-canvas-isolated="light"');
      expect(rendererHtml).toContain("background-color:#facc15");

      const frameStyle = getDocumentThemeCanvasStyle(yellowTheme, { forceIsolate: true });
      const viewportHtml = renderToStaticMarkup(
        React.createElement(
          BuilderViewportFrame,
          {
            viewport: "mobile",
            themeStyle: frameStyle,
            isolationScheme: "light",
            showControlsBar: false,
          },
          React.createElement("div", null, "Preview Body"),
        ),
      );
      expect(viewportHtml).toContain('data-builder-viewport="mobile"');
      expect(viewportHtml).toContain('data-builder-canvas-isolated="light"');
      expect(viewportHtml).toContain("background-color:#facc15");

      const canvasHtml = renderToStaticMarkup(
        React.createElement(BuilderCanvas, {
          viewport: "desktop",
          nodesCount: 0,
          treeNodes: [],
          selectedNodeId: null,
          setSelectedNodeId: () => {},
          onAddSection: () => {},
          themeConfig: yellowTheme,
        }),
      );
      expect(canvasHtml).toContain('data-builder-canvas-isolated="light"');
      expect(canvasHtml).toContain("background-color:#facc15");
    });
  });

  // =========================================================================
  // (b) STUDIO CATALOG & AUDIT INTEGRITY
  // =========================================================================
  describe("b) Studio Catalog & Audit Integrity", () => {
    it("confirms all 19 catalog templates report zero blocking errors and publishableFailed === 0", () => {
      const report = auditAllStudioTemplates();
      expect(report.summary.publishableFailed).toBe(0);

      const catalogResults = report.templates.filter((t) => t.templateId.startsWith("template_"));
      expect(catalogResults.length).toBeGreaterThanOrEqual(19);

      for (const result of catalogResults) {
        const errors = result.findings.filter((f) => f.severity === "error");
        expect(errors, `Template ${result.templateId} failed with: ${errors.map((e) => e.ruleId).join(", ")}`).toEqual([]);
      }
    });

    it("accepts captureChannel='crm' on contact_form_direct and flags missing destination otherwise", () => {
      const crmValid = auditStudioTemplate({
        id: "crm_valid",
        name: "Form CRM",
        blocks: [
          {
            type: "contact_form_direct",
            config: {
              title: "Fale Conosco",
              captureChannel: "crm",
            },
          },
        ],
      });
      expect(crmValid.findings.some((f) => f.ruleId === "CONTENT_FORM_DESTINATION_MISSING")).toBe(false);

      const missingDest = auditStudioTemplate({
        id: "missing_dest",
        name: "Form Sem Destino",
        blocks: [
          {
            type: "contact_form_direct",
            config: {
              title: "Fale Conosco",
            },
          },
        ],
      });
      expect(missingDest.findings.some((f) => f.ruleId === "CONTENT_FORM_DESTINATION_MISSING")).toBe(true);
    });
  });

  // =========================================================================
  // (c) COPILOT ARTIFACT TYPES & SAFE MEDIA URL
  // =========================================================================
  describe("c) Copilot Artifact Registry & Media Sanitizer", () => {
    it("defines friendly Portuguese labels for all core Copilot artifact types", () => {
      const expectedKeys = [
        "spreadsheet",
        "document",
        "presentation",
        "landing_page",
        "website",
        "web_app",
        "omnibuilder",
        "code",
        "social_post",
        "creative_post",
        "carousel",
        "image",
        "video",
        "motion_video",
        "itinerary",
        "travel_itinerary",
        "travel_dossier",
        "biolink_cluster",
        "chart",
        "interactive_table",
        "proposal",
        "builder_bridge",
        "dashboard",
        "map_view",
        "simlab_report",
        "business_plan",
        "schedule_plan",
      ];

      for (const key of expectedKeys) {
        expect(typeof COPILOT_ARTIFACT_TYPE_LABELS[key]).toBe("string");
        expect(COPILOT_ARTIFACT_TYPE_LABELS[key].trim().length).toBeGreaterThan(2);
      }
    });

    it("sanitizes unsafe URL schemes while keeping safe http/https/relative/data-image URLs", () => {
      expect(getSafeArtifactMediaUrl("https://cdn.waesy.com/a.png")).toBe("https://cdn.waesy.com/a.png");
      expect(getSafeArtifactMediaUrl("/assets/demo.webp")).toBe("/assets/demo.webp");
      expect(getSafeArtifactMediaUrl("data:image/png;base64,iVBORw0KGgo=")).toBe(
        "data:image/png;base64,iVBORw0KGgo=",
      );
      expect(getSafeArtifactMediaUrl("javascript:alert(1)")).toBeNull();
      expect(getSafeArtifactMediaUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
      expect(getSafeArtifactMediaUrl("   ")).toBeNull();
      expect(getSafeArtifactMediaUrl(null)).toBeNull();
    });
  });

  // =========================================================================
  // (d) INTEGRATION SECURITY & MCP PARITY
  // =========================================================================
  describe("d) Integration Multi-Tenant Security, OAuth, Webhooks & MCP Parity", () => {
    it("rejects cross-tenant access on listMarketplaceConnectors and saveMarketplaceConnector", async () => {
      vi.mocked(serverAccess.getServerIdentity).mockResolvedValue({
        id: "user-store-a",
        email: "owner@store-a.com",
        role: "owner",
        store_id: "store-a",
        memberships: [{ store_id: "store-a", role: "owner" }],
      } as any);

      await expect(
        listMarketplaceConnectors({ data: { storeId: "store-b" } } as any),
      ).rejects.toThrow(/Unauthorized/i);

      await expect(
        saveMarketplaceConnector({
          data: {
            storeId: "store-b",
            platform: "mercadolivre",
            name: "ML Store B",
            credential_payload: { access_token: "stolen" },
          },
        } as any),
      ).rejects.toThrow(/Unauthorized/i);
    });

    it("masks encrypted credentials in listMarketplaceConnectors while keeping boolean presence parity", async () => {
      const masked = sanitizeConnectorSettingsForClient({
        auto_sync: true,
        webhook_secret: "enc_whsec_123",
        credentials: {
          client_id: "enc_cid_1",
          client_secret: "enc_secret_xyz",
          empty_field: "",
        },
      });
      expect(masked.auto_sync).toBe(true);
      expect(masked.webhook_secret).toBe("••••••••");
      expect(masked.credentials.client_id).toBe("••••••••");
      expect(masked.credentials.client_secret).toBe("••••••••");
      expect(masked.credentials.empty_field).toBeNull();

      vi.mocked(serverAccess.getServerIdentity).mockResolvedValue({
        id: "user-store-a",
        email: "owner@store-a.com",
        role: "owner",
        store_id: "store-a",
        memberships: [{ store_id: "store-a", role: "owner" }],
      } as any);
      vi.mocked(supabaseModule.getServerClient).mockReturnValue({
        from: vi.fn(() =>
          makeSupabaseChain({
            data: [
              {
                id: "conn-1",
                store_id: "store-a",
                platform: "mercadolivre",
                name: "ML Oficial",
                external_account_id: "123",
                account_nickname: "Loja A",
                status: "connected",
                sync_status: "idle",
                last_sync_at: null,
                error_message: null,
                settings: {
                  auto_sync: true,
                  credentials: {
                    client_secret: "v1:aesgcm:RAW_SECRET_MATERIAL",
                  },
                },
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
            error: null,
          }),
        ),
      } as any);

      const rows = await listMarketplaceConnectors({ data: { storeId: "store-a" } } as any);
      expect(rows).toHaveLength(1);
      expect(rows[0].settings?.auto_sync).toBe(true);
      expect(rows[0].settings?.credentials?.client_secret).toBe("••••••••");
      expect(JSON.stringify(rows)).not.toContain("RAW_SECRET_MATERIAL");
    });

    it("enforces authentication & multi-tenant access on MCP store:// resources and dispatches resources/read + prompts/get", async () => {
      const mcpRouteModule = await import("@/routes/api.mcp.v1.tools.call");
      const POST = (mcpRouteModule.Route as any)?.options?.server?.handlers?.POST;
      expect(typeof POST).toBe("function");

      vi.mocked(supabaseModule.getServerClient).mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === "cash_registers") {
            return makeSupabaseChain({
              data: {
                status: "open",
                initial_balance_cents: 10000,
                expected_closing_balance_cents: 25000,
                opened_at: "2026-11-15T08:00:00Z",
              },
              error: null,
            });
          }
          if (table === "products") {
            return makeSupabaseChain({
              data: [
                {
                  id: "prod-1",
                  title: "Produto Teste",
                  slug: "produto-teste",
                  price_cents: 4990,
                  product_variants: [{ stock_on_hand: 3, allow_backorder: false }],
                },
              ],
              error: null,
            });
          }
          return makeSupabaseChain({ data: [], error: null });
        }),
      } as any);

      // 1. Anonymous user blocked (401)
      vi.mocked(serverAccess.getServerIdentity).mockResolvedValue({ id: "", role: "customer" } as any);
      await expect(
        readMcpResource("store://store-a/financial-summary"),
      ).rejects.toThrow(/401 Unauthorized/i);

      const unauthRpc = await POST({
        request: new Request("https://waesy.com/api/mcp/v1/tools/call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "resources/read",
            params: { uri: "store://store-a/financial-summary" },
          }),
        }),
      });
      expect(unauthRpc.status).toBe(401);

      // 2. Store A member blocked from reading Store B resource (403)
      vi.mocked(serverAccess.getServerIdentity).mockResolvedValue({
        id: "staff-a",
        email: "staff@store-a.com",
        role: "admin",
        store_id: "store-a",
        memberships: [{ store_id: "store-a", role: "admin" }],
      } as any);

      await expect(
        readMcpResource("store://store-b/financial-summary"),
      ).rejects.toThrow(/Insufficient permissions/i);

      const crossTenantRpc = await POST({
        request: new Request("https://waesy.com/api/mcp/v1/tools/call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 2,
            method: "resources/read",
            params: { uri: "store://store-b/financial-summary" },
          }),
        }),
      });
      expect(crossTenantRpc.status).toBe(403);

      // 3. Mismatched storeId URI vs argument rejected (403)
      await expect(
        readMcpResource("store://store-b/catalog", "store-a"),
      ).rejects.toThrow(/403 Forbidden/i);

      // 4. Authorized Store A staff succeeds on resources/read & prompts/get
      const okResourceRes = await POST({
        request: new Request("https://waesy.com/api/mcp/v1/tools/call", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer mcp_tok_123",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 3,
            method: "resources/read",
            params: { uri: "store://store-a/catalog" },
          }),
        }),
      });
      expect(okResourceRes.status).toBe(200);
      const resourceJson = await okResourceRes.json();
      expect(resourceJson.result.contents[0].uri).toBe("store://store-a/catalog");
      expect(resourceJson.result.contents[0].text).toContain("Produto Teste");

      const okPromptRes = await POST({
        request: new Request("https://waesy.com/api/mcp/v1/tools/call", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 4,
            method: "prompts/get",
            params: {
              name: "customer_inquiry_assistant",
              arguments: {
                storeName: "Loja A",
                customerQuestion: "Tem pronta entrega?",
              },
            },
          }),
        }),
      });
      expect(okPromptRes.status).toBe(200);
      const promptJson = await okPromptRes.json();
      expect(promptJson.result.messages[0].content.text).toContain("Loja A");
      expect(promptJson.result.messages[0].content.text).toContain("Tem pronta entrega?");
    });

    it("hardens OAuth callback against open redirects, unsigned store_id spoofing and cross-tenant sessions", async () => {
      expect(resolveSafeMarketplaceReturnPath("//evil.com/steal")).toBe("/workspace/integracoes/marketplaces");
      expect(resolveSafeMarketplaceReturnPath("/\\evil.com")).toBe("/workspace/integracoes/marketplaces");
      expect(resolveSafeMarketplaceReturnPath("https://evil.com/steal")).toBe("/workspace/integracoes/marketplaces");
      expect(resolveSafeMarketplaceReturnPath("/workspace/integracoes/marketplaces?tab=erps")).toBe(
        "/workspace/integracoes/marketplaces?tab=erps",
      );

      const callbackModule = await import("@/routes/api.auth.marketplace.callback");
      const GET = (callbackModule.Route as any)?.options?.server?.handlers?.GET;
      expect(typeof GET).toBe("function");

      // Unsigned query store_id without valid state must NOT proceed
      const unsignedRes = await GET({
        request: new Request(
          "https://waesy.com/api/auth/marketplace/callback?code=auth123&store_id=store-victim&platform=mercadolivre",
        ),
      });
      expect(unsignedRes.status).toBe(302);
      const unsignedLocation = unsignedRes.headers.get("location") || "";
      expect(unsignedLocation).toContain("/workspace/integracoes/marketplaces");
      expect(unsignedLocation).toContain("error=");

      // Signed state for store-a while logged-in session only owns store-b must redirect with access error
      const { encodeMarketplaceOAuthState } = await import("@/lib/marketplace-api-client");
      vi.mocked(serverAccess.getServerIdentity).mockResolvedValue({
        id: "user-store-b",
        email: "owner@store-b.com",
        role: "owner",
        store_id: "store-b",
        memberships: [{ store_id: "store-b", role: "owner" }],
      } as any);

      const stateForA = encodeMarketplaceOAuthState({
        storeId: "store-a",
        platform: "mercadolivre",
        returnPath: "//evil.com",
      });
      const mismatchRes = await GET({
        request: new Request(
          `https://waesy.com/api/auth/marketplace/callback?code=auth123&state=${encodeURIComponent(stateForA)}`,
        ),
      });
      expect(mismatchRes.status).toBe(302);
      const mismatchRawLocation = mismatchRes.headers.get("location") || "";
      const mismatchParsed = new URL(mismatchRawLocation);
      expect(`${mismatchParsed.origin}${mismatchParsed.pathname}`).toBe(
        "https://waesy.com/workspace/integracoes/marketplaces",
      );
      expect(mismatchParsed.searchParams.get("error") || "").toMatch(/Insufficient permissions/i);
    });

    it("resolves Bling master secret and rejects webhooks with unresolved tenant (spoofed body store_id)", async () => {
      const webhookModule = await import("@/routes/api.webhooks.marketplaces");
      const POST = (webhookModule.Route as any)?.options?.server?.handlers?.POST;
      expect(typeof POST).toBe("function");

      const blingSecret = "bling_master_secret_test";
      const encryptedBlingSecret = encryptSecret(blingSecret);
      vi.mocked(supabaseModule.getServerClient).mockReturnValue({
        from: vi.fn((table: string) => {
          if (table === "stores") {
            return makeSupabaseChain({
              data: {
                settings: {
                  integrations: {
                    bling_client_secret: encryptedBlingSecret,
                  },
                },
              },
              error: null,
            });
          }
          return makeSupabaseChain({ data: null, error: null });
        }),
      } as any);

      const rawBody = JSON.stringify({
        event: "order.created",
        store_id: "store-victim-spoof",
        data: { id: "999111" },
      });
      const sigHex = createHmac("sha256", blingSecret).update(rawBody).digest("hex");

      const res = await POST({
        request: new Request("https://waesy.com/api/webhooks/marketplaces?platform=bling", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-bling-signature": `sha256=${sigHex}`,
          },
          body: rawBody,
        }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.status).toBe("bad_request");
    });
  });
});
