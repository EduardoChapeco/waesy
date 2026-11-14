import { createFileRoute } from "@tanstack/react-router";
import { listAgencyTravelProposals } from "@/services/travel-proposal.functions";
import { getStoreSettings } from "@/services/store.functions";
import { TourismProposalsManager } from "@/components/tourism/proposals/TourismProposalsManager";

export const Route = createFileRoute("/workspace/turismo/propostas/")({
 head: () => ({ meta: [{ title: "Propostas de Viagem | Workspace Waesy" }] }),
 validateSearch: (search: Record<string, unknown>): {
  leadId?: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  destination?: string;
  new?: boolean;
 } => ({
  leadId: (search.leadId as string) || undefined,
  clientName: (search.clientName as string) || undefined,
  clientPhone: (search.clientPhone as string) || undefined,
  clientEmail: (search.clientEmail as string) || undefined,
  destination: (search.destination as string) || undefined,
  new: search.new === true || search.new === "true" || undefined,
 }),
  loader: async () => {
    try {
      const [proposals, store] = await Promise.all([
        listAgencyTravelProposals({ data: { includeHidden: true } }).catch(() => []),
        getStoreSettings().catch(() => null),
      ]);
      return { proposals: proposals || [], store };
    } catch (err) {
      console.error("[loader:workspace.turismo.propostas.index] Unhandled error:", err);
      return { proposals: null, store: null };
    }
  },
  component: WorkspaceProposalsIndexPage,
});

function WorkspaceProposalsIndexPage() {
  const { proposals: initialProposals, store } = (Route.useLoaderData?.() as any) || {};
  const searchParams = Route.useSearch();

  return (
    <TourismProposalsManager
      initialProposals={initialProposals}
      store={store}
      searchParams={searchParams}
    />
  );
}
