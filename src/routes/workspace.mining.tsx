/**
 * workspace.mining.tsx — Hub de Mineração, Crawlers e Feeds RSS
 * Painel operacional e telemetria de dados públicos, indicadores e enriquecimento cadastral.
 */

import { createFileRoute } from "@tanstack/react-router";
import { MiningDashboard } from "@/components/mining/mining-dashboard";
import { getMiningStatsFn } from "@/services/mining.functions";
import { RouteErrorFallback } from "@/components/state/route-error-fallback";

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
  errorComponent: ({ error, reset }) => (
    <RouteErrorFallback
      error={error}
      reset={reset}
      title="Falha ao carregar"
      description="Não foi possível carregar os dados."
    />
  ),
  component: WorkspaceMiningPage,
});

function WorkspaceMiningPage() {
  const { stats } = Route.useLoaderData();

  return (
    <div className="w-full px-0 sm:px-4 md:px-0 py-4 sm:py-6">
      <MiningDashboard initialStats={stats} />
    </div>
  );
}
