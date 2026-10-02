import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DesignSystemHeader } from "@/components/design-system/design-system-header";
import { ActionsFamily } from "@/components/design-system/actions-family";
import { FormsFamily } from "@/components/design-system/forms-family";
import { SurfacesFamily } from "@/components/design-system/surfaces-family";
import { OverlaysFamily } from "@/components/design-system/overlays-family";
import { NavigationFamily } from "@/components/design-system/navigation-family";
import { MediaShowcaseFamily } from "@/components/design-system/media-showcase-family";
import type { DesignSystemStateMode } from "@/components/design-system/design-system-types";

export const Route = createFileRoute("/workspace/design-system")({
  head: () => ({
    meta: [{ title: "Design System Canônico | Workspace" }],
  }),
  component: WorkspaceDesignSystemPage,
});

function WorkspaceDesignSystemPage() {
  const [mode, setMode] = useState<DesignSystemStateMode>("all");
  const [tab, setTab] = useState<string>("overview");

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-7xl mx-auto w-full">
      <DesignSystemHeader currentMode={mode} onSelectMode={setMode} />

      <Tabs value={tab} onValueChange={setTab} className="flex flex-col gap-6">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 bg-muted/50 rounded-lg w-fit">
          <TabsTrigger value="overview" className="h-11 px-4 text-xs">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="navigation" className="h-11 px-4 text-xs">
            Navegação
          </TabsTrigger>
          <TabsTrigger value="actions" className="h-11 px-4 text-xs">
            Ações
          </TabsTrigger>
          <TabsTrigger value="forms" className="h-11 px-4 text-xs">
            Formulários
          </TabsTrigger>
          <TabsTrigger value="surfaces" className="h-11 px-4 text-xs">
            Superfícies
          </TabsTrigger>
          <TabsTrigger value="media" className="h-11 px-4 text-xs">
            Mídia
          </TabsTrigger>
          <TabsTrigger value="overlays" className="h-11 px-4 text-xs">
            Modais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-8 outline-none">
          <NavigationFamily mode={mode} />
          <ActionsFamily mode={mode} />
          <FormsFamily mode={mode} />
          <SurfacesFamily mode={mode} />
          <MediaShowcaseFamily mode={mode} />
          <OverlaysFamily mode={mode} />
        </TabsContent>

        <TabsContent value="navigation" className="outline-none">
          <NavigationFamily mode={mode} />
        </TabsContent>

        <TabsContent value="actions" className="outline-none">
          <ActionsFamily mode={mode} />
        </TabsContent>

        <TabsContent value="forms" className="outline-none">
          <FormsFamily mode={mode} />
        </TabsContent>

        <TabsContent value="surfaces" className="outline-none">
          <SurfacesFamily mode={mode} />
        </TabsContent>

        <TabsContent value="media" className="outline-none">
          <MediaShowcaseFamily mode={mode} />
        </TabsContent>

        <TabsContent value="overlays" className="outline-none">
          <OverlaysFamily mode={mode} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
