import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const routes = fs.readFileSync(path.join(root, "src/lib/routes.ts"), "utf8");
const navigation = fs.readFileSync(path.join(root, "src/lib/workspace-navigation.ts"), "utf8");
const workspace = fs.readFileSync(path.join(root, "src/routes/workspace.tsx"), "utf8");
const routeTree = fs.readFileSync(path.join(root, "src/routeTree.gen.ts"), "utf8");

describe("Integridade de rotas e navegação — W10", () => {
  const orphanRoutes = [
    "/workspace/financeiro",
    "/workspace/turismo/comissoes",
    "/workspace/turismo/documentos-ocr",
    "/workspace/whatsapp/automacoes",
  ];

  it("mantém cada rota operacional no catálogo e na navegação e isola rotas Admin Master", () => {
    for (const route of orphanRoutes) {
      expect(routes).toContain(`path: "${route}"`);
      expect(navigation).toContain(`path: "${route}"`);
    }
    expect(navigation).toContain("ADMIN_MASTER_ISOLATED_ROUTES");
    expect(navigation).not.toContain('label: "Design System"');
    expect(navigation).not.toContain('label: "Moderação"');
    expect(navigation).not.toContain('label: "Auditoria KYC"');
    expect(navigation).not.toContain('label: "Influenciadores"');
    expect(navigation).not.toContain('label: "Plano e Módulos"');
  });

  it("mantém o layout workspace como boundary único de sessão e negócio", () => {
    expect(workspace).toContain('createFileRoute("/workspace")');
    expect(workspace).toContain("getUserSession()");
    expect(workspace).toContain('throw redirect({ to: "/entrar"');
    expect(workspace).toContain('throw redirect({ to: "/criar-negocio" });');
    expect(workspace).toContain("errorComponent: WorkspaceErrorComponent");
  });

  it("mantém as rotas geradas no route tree", () => {
    expect(routeTree).toContain("WorkspaceDesignSystemRouteImport");
    expect(routeTree).toContain("WorkspaceTurismoComissoesRouteImport");
    expect(routeTree).toContain("WorkspaceTurismoDocumentosOcrRouteImport");
    expect(routeTree).toContain("WorkspaceWhatsappAutomacoesRouteImport");
  });
});
