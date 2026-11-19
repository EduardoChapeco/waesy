import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { AtendimentoChatWorkspace } from "@/components/atendimento/AtendimentoChatWorkspace";
import { ErrorState } from "@/components/state/states";
import { listSdrChatSessions } from "@/services/ai-sdr.functions";
import { listChatQuickReplies, listChatThreads } from "@/services/chat.functions";
import { listIntranetChannels } from "@/services/intranet.functions";
import { getStoreSettings } from "@/services/store.functions";
import {
  listWorkspaceWhatsAppInstances,
  type WhatsAppChannelInstanceDTO,
} from "@/services/whatsapp-channel-instances.functions";
import type { QuickReplyItem } from "@/components/chat/QuickRepliesMenu";

export type AtendimentoChatSearch = {
  threadId?: string;
  search?: string;
  channelInstanceId?: string;
  storeId?: string;
  leadId?: string;
  phone?: string;
};

export const Route = createFileRoute("/workspace/atendimento/chat")({
  head: () => ({ meta: [{ title: "Chat Ao Vivo — Atendimento Omnichannel" }] }),
  validateSearch: (search: Record<string, unknown>): AtendimentoChatSearch => ({
    threadId: typeof search.threadId === "string" ? search.threadId : undefined,
    search: typeof search.search === "string" ? search.search : undefined,
    channelInstanceId:
      typeof search.channelInstanceId === "string" ? search.channelInstanceId : undefined,
    storeId: typeof search.storeId === "string" ? search.storeId : undefined,
    leadId: typeof search.leadId === "string" ? search.leadId : undefined,
    phone: typeof search.phone === "string" ? search.phone : undefined,
  }),
  loaderDeps: ({ search }) => ({
    storeId: search.storeId,
    channelInstanceId: search.channelInstanceId,
  }),
  loader: async ({ deps }) => {
    try {
      const store = await getStoreSettings({ data: { store_id: deps?.storeId } });
      const storeId = store?.id || deps?.storeId || undefined;
      const [res, sdrData, instances, quickReplies, intranetChannels] = await Promise.all([
        listChatThreads({
          data: {
            store_id: storeId,
            channel_instance_id: deps?.channelInstanceId,
          },
        }),
        listSdrChatSessions(),
        listWorkspaceWhatsAppInstances({ data: { store_id: storeId } }),
        listChatQuickReplies(),
        listIntranetChannels({ data: { store_id: storeId } }),
      ]);
      return {
        ...(res || {
          threads: [],
          metrics: { total: 0, open: 0, closed: 0, avg_rating: 0, sla_first_response_min: 0 },
          slaAlerts: { waitingCount: 0, atRiskCount: 0, breachedCount: 0, forgottenTodayCount: 0, forgottenLeadsCount: 0, forgottenThreads: [] },
        }),
        slaAlerts: (res as any)?.slaAlerts || { waitingCount: 0, atRiskCount: 0, breachedCount: 0, forgottenTodayCount: 0, forgottenLeadsCount: 0, forgottenThreads: [] },
        isSupervisor: Boolean((res as any)?.isSupervisor || (store as any)?.is_owner),
        store,
        sdrSessions: sdrData?.sessions || [],
        sdrMetrics: sdrData?.metrics || { total: 0, readyToBuy: 0, warm: 0, curious: 0 },
        whatsappInstances: (instances || []) as WhatsAppChannelInstanceDTO[],
        quickReplies: (quickReplies || []) as QuickReplyItem[],
        intranetChannels: (intranetChannels || []) as any[],
        loadError: null as string | null,
      };
    } catch (e: any) {
      console.warn("[workspace.atendimento.chat] Erro no loader:", e);
      return {
        threads: [],
        metrics: { total: 0, open: 0, closed: 0, avg_rating: 0, sla_first_response_min: 0 },
        isSupervisor: false,
        store: null,
        sdrSessions: [],
        sdrMetrics: { total: 0, readyToBuy: 0, warm: 0, curious: 0 },
        whatsappInstances: [] as WhatsAppChannelInstanceDTO[],
        quickReplies: [] as QuickReplyItem[],
        intranetChannels: [],
        loadError: e?.message || "Não foi possível carregar o chat de atendimento.",
      };
    }
  },
  component: WorkspaceAtendimentoChatPage,
});

function WorkspaceAtendimentoChatPage() {
  const loaderData = (Route.useLoaderData?.() as any) || {};
  const searchParams = Route.useSearch?.() || {};
  const navigate = useNavigate();
  const router = useRouter();

  if (loaderData.loadError) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <ErrorState
          title="Erro ao carregar chat ao vivo"
          description={loaderData.loadError}
          onRetry={() => router.invalidate()}
        />
      </div>
    );
  }

  return (
    <AtendimentoChatWorkspace
      initialThreads={loaderData.threads || []}
      metrics={loaderData.metrics}
      slaAlerts={loaderData.slaAlerts}
      isSupervisor={Boolean(loaderData.isSupervisor)}
      store={loaderData.store}
      sdrSessions={loaderData.sdrSessions || []}
      sdrMetrics={loaderData.sdrMetrics || { total: 0, readyToBuy: 0, warm: 0, curious: 0 }}
      whatsappInstances={loaderData.whatsappInstances || []}
      quickReplies={loaderData.quickReplies || []}
      intranetChannels={loaderData.intranetChannels || []}
      searchParams={searchParams}
      onSelectChannelInstance={(nextChannelId) => {
        navigate({
          to: "/workspace/atendimento/chat" as any,
          search: {
            ...searchParams,
            channelInstanceId: nextChannelId || undefined,
          } as any,
          replace: true,
        });
      }}
    />
  );
}
