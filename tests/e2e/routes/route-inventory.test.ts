/**
 * Route Inventory E2E Test Suite
 * 
 * Verifies:
 * - Full audit of all 446 routes in src/routes/
 * - Workspace routes (189 routes) integrity and conventions
 * - Store vitrine routes (165 routes) integrity
 * - Zero server-secret leaks in client route files
 * - Route file structure and createFileRoute declarations
 */

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Platform Route Inventory (446 Routes)", () => {
  const routesDir = path.resolve(process.cwd(), "src/routes");
  const allEntries = fs.readdirSync(routesDir);

  // All route tree source files in src/routes (excluding README.md and subdirectories)
  const allRouteSourceFiles = allEntries.filter((file) => {
    return (
      (file.endsWith(".tsx") || file.endsWith(".ts")) &&
      file !== "README.md"
    );
  });

  const routePages = allRouteSourceFiles.filter(
    (f) => !f.includes(".test.") && !f.includes(".spec.")
  );

  it("audits total platform route inventory to match exactly 446 route source files", () => {
    // Inventory Master canonical route source file count
    expect(allRouteSourceFiles.length).toBe(446);
    expect(routePages.length).toBe(444);
  });

  it("verifies workspace operational management routes (189 operational routes + receipt route)", () => {
    const workspaceRoutes = allRouteSourceFiles.filter(
      (f) => f.startsWith("workspace.") || f.startsWith("workspace_")
    );
    expect(workspaceRoutes.length).toBe(190);
    // 189 operational routes + 1 standalone receipt route
    const operationalRoutes = workspaceRoutes.filter((f) => f.startsWith("workspace."));
    expect(operationalRoutes.length).toBe(189);
  });

  it("verifies public store and vitrine routes (165 route files)", () => {
    const storeRoutes = allRouteSourceFiles.filter((f) => f.startsWith("_store."));
    expect(storeRoutes.length).toBe(165);
  });

  it("verifies account and civil profile routes within store namespace", () => {
    const accountRoutes = allRouteSourceFiles.filter((f) => f.startsWith("_store.conta."));
    expect(accountRoutes.length).toBeGreaterThanOrEqual(30);
  });

  it("ensures zero routes import or leak sensitive server-only environment variables", () => {
    const prohibitedSecrets = [
      "SUPABASE_SERVICE_ROLE_KEY",
      "DATABASE_URL",
      "VAULT_MASTER_KEY",
      "STRIPE_SECRET_KEY",
    ];

    for (const file of allRouteSourceFiles) {
      const fullPath = path.join(routesDir, file);
      const content = fs.readFileSync(fullPath, "utf-8");

      for (const secret of prohibitedSecrets) {
        expect(content.includes(secret)).toBe(false);
      }
    }
  });

  it("verifies route files export canonical createFileRoute or Route configuration", () => {
    // Spot check primary operational routes
    const primaryRoutes = [
      "workspace.agenda.index.tsx",
      "workspace.pedidos.index.tsx",
      "workspace.tarefas.tsx",
      "_store.destaques.$slug.tsx",
      "__root.tsx",
    ];

    for (const route of primaryRoutes) {
      const fullPath = path.join(routesDir, route);
      expect(fs.existsSync(fullPath)).toBe(true);
      const content = fs.readFileSync(fullPath, "utf-8");
      expect(content.includes("createFileRoute") || content.includes("createRootRoute")).toBe(true);
    }
  });
});
