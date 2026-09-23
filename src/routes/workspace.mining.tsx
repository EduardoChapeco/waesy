/**
 * workspace.mining.tsx — Hub de Mineração, Crawlers e Feeds RSS
 * Painel operacional e telemetria de dados públicos, indicadores e enriquecimento cadastral.
 */

import { createFileRoute } from "@tanstack/react-router";
import { MiningDashboard } from "@/components/mining/mining-dashboard";
import { getMiningStatsFn } from "@/services/mining.functions";

export const Route = createFileRoute("/workspace/mining")({
  loader: async () => {
    try {
      const stats = await getMiningStatsFn();
      return { stats };
    } catch {
      return { stats: undefined };
    }
  },
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
