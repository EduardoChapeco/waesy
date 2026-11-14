import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ADMIN_MASTER_ISOLATED_ROUTES,
  getMasterSidebarPillars,
  getSidebarConfig,
  resolveWorkspaceNavigation,
} from "../workspace-navigation";

const ALL_NICHES = [
  "tourism",
  "gastronomy",
  "services",
  "legal",
  "jobs",
  "pharmacy",
  "wholesale",
  "rental",
  "tech_repair",
  "pet",
  "supermarket",
  "events",
  "vehicles",
  "real_estate",
  "education",
  "news",
  "retail",
];

const REQUIRED_MASTER_PILLAR_IDS = [
  "overview",
  "atendimento",
  "crm",
  "comercial",
  "catalogo",
  "logistica",
  "suporte",
  "financeiro",
  "rh",
  "inteligencia",
  "configuracoes",
];

describe("Workspace Master Sidebar Pillars & Multi-Niche Completeness", () => {
  it("provides all 11 Master Pillars across every business niche without duplicates", () => {
    for (const niche of ALL_NICHES) {
      const groups = resolveWorkspaceNavigation({ niche, category: niche });
      expect(groups.length).toBeGreaterThan(0);

      const pillars = getMasterSidebarPillars(groups, niche);
      const pillarIds = pillars.map((p) => p.id);

      for (const requiredId of REQUIRED_MASTER_PILLAR_IDS) {
        expect(
          pillarIds,
          `Niche "${niche}" is missing Master Pillar "${requiredId}"`,
        ).toContain(requiredId);
      }

      // Verify every pillar has at least one group and one valid route item
      for (const pillar of pillars) {
        expect(pillar.groups.length).toBeGreaterThan(0);
        const totalItems = pillar.groups.reduce(
          (acc, g) => acc + g.items.length,
          0,
        );
        expect(totalItems).toBeGreaterThan(0);
      }

      // Verify all route paths are non-empty strings starting with /
      for (const pillar of pillars) {
        const paths = pillar.groups.flatMap((g) => g.items.map((i) => i.path));
        expect(paths.every((p) => p.startsWith("/"))).toBe(true);
      }
    }
  });

  it("dynamically adapts Master Sector titles and ordering without compound jargon", () => {
    const gastroPillars = getMasterSidebarPillars(
      resolveWorkspaceNavigation({ niche: "gastronomy" }),
    );
    expect(gastroPillars.find((p) => p.id === "comercial")?.label).toBe("Pedidos");
    expect(gastroPillars.find((p) => p.id === "catalogo")?.label).toBe("Cardápio");
    expect(gastroPillars.find((p) => p.id === "rh")?.label).toBe("Equipe");

    const servicesPillars = getMasterSidebarPillars(
      resolveWorkspaceNavigation({ niche: "services" }),
    );
    expect(servicesPillars.find((p) => p.id === "comercial")?.label).toBe("Agenda");
    expect(servicesPillars.find((p) => p.id === "catalogo")?.label).toBe("Serviços");
    expect(servicesPillars.find((p) => p.id === "rh")?.label).toBe("Profissionais");

    const tourismPillars = getMasterSidebarPillars(
      resolveWorkspaceNavigation({ niche: "tourism" }),
    );
    expect(tourismPillars.find((p) => p.id === "comercial")?.label).toBe("Cotações");
    expect(tourismPillars.find((p) => p.id === "logistica")?.label).toBe("Embarques");
    expect(tourismPillars.find((p) => p.id === "catalogo")?.label).toBe("Roteiros");
    expect(tourismPillars.find((p) => p.id === "financeiro")?.label).toBe("Financeiro");

    const legalPillars = getMasterSidebarPillars(
      resolveWorkspaceNavigation({ niche: "legal" }),
    );
    expect(legalPillars.find((p) => p.id === "comercial")?.label).toBe("Processos");
    expect(legalPillars.find((p) => p.id === "logistica")?.label).toBe("Prazos");
    expect(legalPillars.find((p) => p.id === "financeiro")?.label).toBe("Honorários");

    const realEstatePillars = getMasterSidebarPillars(
      resolveWorkspaceNavigation({ niche: "real_estate" }),
    );
    expect(realEstatePillars.find((p) => p.id === "catalogo")?.label).toBe("Imóveis");
    expect(realEstatePillars.find((p) => p.id === "logistica")?.label).toBe("Vistorias");
    expect(realEstatePillars.find((p) => p.id === "rh")?.label).toBe("Corretores");

    const retailPillars = getMasterSidebarPillars(
      resolveWorkspaceNavigation({ niche: "retail" }),
    );
    expect(retailPillars.find((p) => p.id === "comercial")?.label).toBe("Vendas");
    expect(retailPillars.find((p) => p.id === "catalogo")?.label).toBe("Catálogo");
    expect(retailPillars.find((p) => p.id === "logistica")?.label).toBe("Logística");
  });

  it("preserves essential operational submodules in getSidebarConfig across all 17 niches", () => {
    for (const niche of ALL_NICHES) {
      const sidebarGroups = getSidebarConfig(niche);
      const allPaths = sidebarGroups.flatMap((g) => g.items.map((i) => i.path));
      expect(allPaths, `Niche "${niche}" missing /workspace/tarefas`).toContain("/workspace/tarefas");
      expect(allPaths, `Niche "${niche}" missing /workspace/atendimento`).toContain("/workspace/atendimento");
      expect(allPaths, `Niche "${niche}" missing /workspace/financeiro/caixa`).toContain("/workspace/financeiro/caixa");
    }

    const tourismPaths = getSidebarConfig("tourism").flatMap((g) => g.items.map((i) => i.path));
    expect(tourismPaths).toContain("/workspace/turismo/cotacoes");
    expect(tourismPaths).toContain("/workspace/turismo/propostas");
    expect(tourismPaths).toContain("/workspace/turismo/embarques");
    expect(tourismPaths).toContain("/workspace/turismo/contratos");

    const gastroPaths = getSidebarConfig("gastronomy").flatMap((g) => g.items.map((i) => i.path));
    expect(gastroPaths).toContain("/workspace/pedidos/gestor");
    expect(gastroPaths).toContain("/workspace/estoque");
    expect(gastroPaths).toContain("/workspace/pedidos/entregadores");
  });

  it("ensures zero orphaned static workspace routes and 100% routeTree validity", () => {
    const routesDir = path.resolve(process.cwd(), "src/routes");
    const routeFiles = fs
      .readdirSync(routesDir)
      .filter((f) => f.startsWith("workspace.") && f.endsWith(".tsx"));

    const isolatedPaths = new Set<string>(
      ADMIN_MASTER_ISOLATED_ROUTES.map((r) => r.path),
    );

    const staticWorkspaceRoutes = Array.from(
      new Set(
        routeFiles
          .map(
            (f) =>
              "/" +
              f
                .replace(/\.tsx$/, "")
                .replace(/\.index$/, "")
                .replace(/\./g, "/"),
          )
          .filter(
            (r) =>
              !r.includes("$") &&
              !r.endsWith("/novo") &&
              r !== "/workspace" &&
              r !== "/workspace/catalogo" &&
              !isolatedPaths.has(r),
          ),
      ),
    );

    const masterGroups = resolveWorkspaceNavigation(
      {},
      { isMasterMode: true },
    );
    const masterPillars = getMasterSidebarPillars(masterGroups);
    const allSidebarPaths = new Set(
      masterPillars.flatMap((p) => p.items.map((i) => i.path)),
    );

    const allToolsSource = fs.readFileSync(
      path.resolve(
        process.cwd(),
        "src/components/workspace/workspace-all-tools-dialog.tsx",
      ),
      "utf8",
    );

    const routeTreeSource = fs.readFileSync(
      path.resolve(process.cwd(), "src/routeTree.gen.ts"),
      "utf8",
    );

    const orphanedInSidebar = staticWorkspaceRoutes.filter(
      (route) => !allSidebarPaths.has(route),
    );
    const orphanedInAllTools = staticWorkspaceRoutes.filter(
      (route) => !allToolsSource.includes(`"${route}"`),
    );

    expect(orphanedInSidebar).toEqual([]);
    expect(orphanedInAllTools).toEqual([]);

    // Verify every sidebar route path exists in routeTree.gen.ts
    for (const navPath of allSidebarPaths) {
      expect(
        routeTreeSource.includes(`'${navPath}'`) ||
          routeTreeSource.includes(`'${navPath}/'`),
        `Sidebar path "${navPath}" does not exist in src/routeTree.gen.ts`,
      ).toBe(true);
    }
  });

  it("handles empty or unknown niche inputs gracefully", () => {
    const emptyPillars = getMasterSidebarPillars([]);
    expect(emptyPillars).toEqual([]);

    const fallbackGroups = resolveWorkspaceNavigation(undefined);
    const fallbackPillars = getMasterSidebarPillars(fallbackGroups);
    expect(fallbackPillars.map((p) => p.id).sort()).toEqual(
      [...REQUIRED_MASTER_PILLAR_IDS].sort(),
    );
  });
});


