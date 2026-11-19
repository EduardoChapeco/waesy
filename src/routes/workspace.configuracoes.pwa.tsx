import { createFileRoute } from "@tanstack/react-router";
import { BrandedAppWorkspaceEditor } from "@/components/branded-app/branded-app-workspace-editor";

type StudioInitialTab = "template" | "sections" | "identity" | "telemetry" | "governance";

function mapSearchTabToStudioTab(rawTab?: string): StudioInitialTab {
  const clean = String(rawTab || "").trim().toLowerCase();
  if (clean === "sections" || clean === "builder" || clean === "secoes") return "sections";
  if (clean === "identity" || clean === "manifest" || clean === "identidade" || clean === "dominio") {
    return "identity";
  }
  if (clean === "telemetry" || clean === "telemetria") return "telemetry";
  if (clean === "governance" || clean === "termos") return "governance";
  return "template";
}

export const Route = createFileRoute("/workspace/configuracoes/pwa")({
  validateSearch: (search: Record<string, unknown>): { tab?: string } => ({
    tab: typeof search?.tab === "string" ? search.tab : undefined,
  }),
  head: () => ({ meta: [{ title: "App Oficial & PWA | Workspace Waesy" }] }),
  component: PwaOmniBuilderPage,
});

function PwaOmniBuilderPage() {
  const search = Route.useSearch();
  const initialTab = mapSearchTabToStudioTab(search?.tab);

  return (
    <div className="flex-1 w-full p-4 sm:p-6 pb-24">
      <BrandedAppWorkspaceEditor initialTab={initialTab} />
    </div>
  );
}
