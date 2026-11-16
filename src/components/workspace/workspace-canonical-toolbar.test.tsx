import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { BarChart3, Kanban, LayoutList, Plus } from "lucide-react";

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={typeof to === "string" ? to : "#"} {...props}>
      {children}
    </a>
  ),
}));

import { WorkspaceCanonicalToolbar } from "./workspace-canonical-toolbar";
import { Button } from "@/components/ui/button";
import { BuilderViewportProvider, useEffectiveViewport } from "@/design-system/vitrine";

describe("WorkspaceCanonicalToolbar & Bidirectional Proportional Layout Suite", () => {
  it("renderiza Tier 1 sem shrink-0 no tablist e Tier 2 com container-aware scroll strips anti-sobreposição", () => {
    const html = renderToStaticMarkup(
      <WorkspaceCanonicalToolbar
        tabs={[
          { id: "kanban", label: "Kanban", count: 5, icon: Kanban },
          { id: "alertas", label: "Painel & Alertas" },
          { id: "propostas", label: "Propostas", count: 9 },
          { id: "viagens", label: "Viagens" },
        ]}
        activeTab="kanban"
        onTabChange={() => {}}
        searchValue=""
        onSearchChange={() => {}}
        filters={[
          {
            id: "temp",
            label: "Temperatura",
            value: "all",
            onChange: () => {},
            options: [
              { value: "all", label: "Todas Temperaturas" },
              { value: "hot", label: "Quente" },
            ],
          },
          {
            id: "owner",
            label: "Responsável",
            value: "all",
            onChange: () => {},
            options: [{ value: "all", label: "Todos os Responsáveis" }],
          },
        ]}
        filterSlot={
          <Button type="button" variant="outline" size="sm" className="h-11 min-h-11 sm:h-9">
            <BarChart3 className="size-3.5" />
            <span>Métricas Total: R$ 36.491,30</span>
          </Button>
        }
        primaryAction={
          <div className="flex items-center gap-2 shrink-0">
            <Button type="button" variant="outline" size="sm">
              Planilha de Comissões
            </Button>
            <Button type="button" variant="outline" size="sm">
              Nova Proposta
            </Button>
            <Button type="button" variant="outline" size="sm">
              Importar Leads
            </Button>
            <Button type="button" size="sm">
              <Plus className="size-3.5" />
              <span>Nova Oportunidade</span>
            </Button>
          </div>
        }
      />,
    );

    expect(html).toContain("waesy-toolbar-container");
    expect(html).toContain("waesy-toolbar-tier2");
    expect(html).toContain("waesy-toolbar-search");
    expect(html).toContain("waesy-toolbar-filters waesy-tab-strip");
    expect(html).toContain("waesy-toolbar-actions waesy-tab-strip");

    // Tier 1 [role="tablist"] deve ter flex-1 min-w-0 e waesy-tab-strip (NUNCA shrink-0 bloqueando o scroll interno)
    const tablistMatch = html.match(/role="tablist"\s+class="([^"]+)"/);
    expect(tablistMatch).toBeTruthy();
    const tablistClasses = tablistMatch?.[1] || "";
    expect(tablistClasses).toContain("waesy-tab-strip");
    expect(tablistClasses).toContain("flex-1");
    expect(tablistClasses).toContain("min-w-0");
    expect(tablistClasses.split(/\s+/)).not.toContain("shrink-0");

    // filterSlot deve estar acessível mesmo em viewports compactos (< 840px) sem classe hidden na caixa .waesy-toolbar-filters
    const filtersBoxMatch = html.match(/class="([^"]*waesy-toolbar-filters[^"]*)"/);
    expect(filtersBoxMatch).toBeTruthy();
    expect(filtersBoxMatch?.[1] || "").not.toContain("hidden");
    expect(html).toContain("Métricas Total: R$ 36.491,30");
  });

  it("promove viewModes para switcher segmentado à direita quando tabs e viewModes coexistem", () => {
    const html = renderToStaticMarkup(
      <WorkspaceCanonicalToolbar
        tabs={[
          { id: "todos", label: "Todos", count: 12 },
          { id: "hoje", label: "Hoje", count: 3 },
        ]}
        activeTab="todos"
        onTabChange={() => {}}
        viewModes={[
          { id: "list", label: "Lista", icon: LayoutList },
          { id: "kanban", label: "Kanban", icon: Kanban },
        ]}
        activeViewMode="list"
        onViewModeChange={() => {}}
      />,
    );

    expect(html).toContain('role="tablist"');
    expect(html).toContain("Todos");
    expect(html).toContain('role="group"');
    expect(html).toContain('aria-label="Modo de visualização"');
    expect(html).toContain("Lista");
    expect(html).toContain("Kanban");
  });

  it("garante que WorkspaceShell, AiChatShell e AdminMaster preservam trilhos sem esmagamento e scroll container-query", () => {
    const root = process.cwd();
    const workspaceShellSrc = fs.readFileSync(
      path.resolve(root, "src/components/workspace/workspace-shell.tsx"),
      "utf8",
    );
    const aiChatShellSrc = fs.readFileSync(
      path.resolve(root, "src/components/chat/ai-chat-shell.tsx"),
      "utf8",
    );
    const adminMasterSrc = fs.readFileSync(
      path.resolve(root, "src/routes/admin-master.tsx"),
      "utf8",
    );

    // WorkspaceShell sub-sidebar top não divide largura do WorkspaceAccountSwitcher com Bell/Search
    const subSidebarMatch = workspaceShellSrc.match(
      /COLUNA 2 — SIDEBAR SECUNDÁRIA CONTEXTUAL[\s\S]{0,1800}Submódulos do Setor Ativo/,
    );
    expect(subSidebarMatch).toBeTruthy();
    expect(subSidebarMatch?.[0] || "").toContain("WorkspaceAccountSwitcher");
    expect(subSidebarMatch?.[0] || "").not.toContain("<NotificationBell");

    // AiChatShell e trilhos laterais canônicos usam largura w-14 matte (bg-rail), StatefulNavIcon e Tooltip
    expect(aiChatShellSrc).toContain("w-14 bg-rail border-r border-sidebar-border hidden md:flex flex-col");
    expect(aiChatShellSrc).toContain("waesy-tab-strip items-center gap-1 pt-1 min-w-0 max-w-full");

    const matteRailFiles = [
      "src/components/admin/builder/builder-docked-rail.tsx",
      "src/components/atendimento/AtendimentoChatWorkspace.tsx",
      "src/components/tourism/studio/studio-sidebar-editor.tsx",
      "src/components/documents/UniversalDocumentStudio.tsx",
    ];
    for (const rel of matteRailFiles) {
      const code = fs.readFileSync(path.resolve(root, rel), "utf8");
      expect(code, `${rel} deve adotar fundo bg-rail`).toContain("bg-rail");
      expect(code, `${rel} deve usar StatefulNavIcon`).toContain("StatefulNavIcon");
    }

    // AdminMaster usa main-container-query min-w-0 e ações no header em faixa segura
    expect(adminMasterSrc).toContain("main-container-query");
  });

  it("assegura paridade bidirecional em tempo real com BuilderViewportProvider e useEffectiveViewport nas vitrines", () => {
    function ViewportProbe() {
      const { sizeClass, isCompact, isDesktop, isForcedViewport } = useEffectiveViewport();
      return (
        <div
          data-size-class={sizeClass}
          data-compact={String(isCompact)}
          data-desktop={String(isDesktop)}
          data-forced={String(isForcedViewport)}
        />
      );
    }

    const mobileHtml = renderToStaticMarkup(
      <BuilderViewportProvider viewport="mobile" isEditorCanvas>
        <ViewportProbe />
      </BuilderViewportProvider>,
    );
    const desktopHtml = renderToStaticMarkup(
      <BuilderViewportProvider viewport="desktop" isEditorCanvas>
        <ViewportProbe />
      </BuilderViewportProvider>,
    );

    expect(mobileHtml).toContain('data-size-class="compact"');
    expect(mobileHtml).toContain('data-compact="true"');
    expect(mobileHtml).toContain('data-desktop="false"');
    expect(desktopHtml).toContain('data-size-class="expanded"');
    expect(desktopHtml).toContain('data-compact="false"');
    expect(desktopHtml).toContain('data-desktop="true"');

    const root = process.cwd();
    const storefrontRoutes = [
      "src/routes/_store.index.tsx",
      "src/routes/_store.beleza.tsx",
      "src/routes/_store.casa.tsx",
      "src/routes/_store.construcao.tsx",
      "src/routes/_store.conta.carnes.tsx",
      "src/routes/_store.conta.pacotes.tsx",
      "src/routes/_store.conta.pedidos.index.tsx",
      "src/routes/_store.eletronicos.tsx",
      "src/routes/_store.eventos.tsx",
      "src/routes/_store.limpeza.tsx",
      "src/routes/_store.livros.tsx",
      "src/routes/_store.moda.tsx",
      "src/routes/_store.turismo.index.tsx",
    ];

    for (const rel of storefrontRoutes) {
      const code = fs.readFileSync(path.resolve(root, rel), "utf8");
      expect(code, `${rel} deve usar useEffectiveViewport`).toContain("useEffectiveViewport");
      expect(code, `${rel} não deve depender diretamente de useWindowSizeClass`).not.toContain(
        "useWindowSizeClass",
      );
    }
  });
});
