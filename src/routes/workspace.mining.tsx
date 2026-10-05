/**
 * workspace.mining.tsx — Hub de Mineração, Crawlers e Feeds RSS
 * Painel operacional e telemetria de dados públicos, indicadores e enriquecimento cadastral.
 */

import { createFileRoute } from "@tanstack/react-router";
import { MiningDashboard } from "@/components/mining/mining-dashboard";
import { getMiningStatsFn } from "@/services/mining.functions";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/workspace/mining")({
  head: () => ({
    meta: [{ title: "Hub de Mineração | Workspace Waesy" }],
  }),
  loader: async () => {
    try {
      const stats = await getMiningStatsFn();
      return { stats };
    } catch (err: any) {
      console.error("[loader:workspace.mining] Erro ao carregar estatísticas:", err);
      return { stats: undefined };
    }
  },
  errorComponent: WorkspaceMiningErrorComponent,
  component: WorkspaceMiningPage,
});

function WorkspaceMiningErrorComponent({ error, reset }: { error: any; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center space-y-4">
      <div className="inline-flex size-14 items-center justify-center rounded-lg bg-destructive/10 text-destructive mb-2">
        <AlertTriangle className="size-7" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Instabilidade no Hub de Mineração</h2>
      <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
        {error?.message || "Não foi possível sincronizar a telemetria dos crawlers e mineradores industriais."}
      </p>
      <Button
        type="button"
        onClick={reset}
        className="rounded-lg font-bold text-xs h-11 px-4 focus-visible:ring-2 focus-visible:ring-primary"
      >
        Tentar Novamente
      </Button>
    </div>
  );
}

function WorkspaceMiningPage() {
  const { stats } = Route.useLoaderData();

  return (
    <div className="w-full px-0 sm:px-4 md:px-0 py-4 sm:py-6">
      <MiningDashboard initialStats={stats} />
    </div>
  );
}
