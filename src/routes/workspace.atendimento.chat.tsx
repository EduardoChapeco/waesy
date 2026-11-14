import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AtendimentoChatWorkspace } from "@/components/atendimento/AtendimentoChatWorkspace";
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
};

export const Route = createFileRoute("/workspace/atendimento/chat")({
  head: () => ({ meta: [{ title: "Chat Ao Vivo — Atendimento Omnichannel" }] }),
  validateSearch: (search: Record<string, unknown>): AtendimentoChatSearch => ({
    threadId: typeof search.threadId === "string" ? search.threadId : undefined,
    search: typeof search.search === "string" ? search.search : undefined,
    channelInstanceId:
      typeof search.channelInstanceId === "string" ? search.channelInstanceId : undefined,
    storeId: typeof search.storeId === "string" ? search.storeId : undefined,
  }),
  loaderDeps: ({ search }) => ({
    storeId: search.storeId,
    channelInstanceId: search.channelInstanceId,
  }),
  loader: async ({ deps }) => {
    try {
      const store = await getStoreSettings({ data: { store_id: deps?.storeId } }).catch(
        () => null,
      );
      const storeId = store?.id || deps?.storeId || undefined;
      const [res, sdrData, instances, quickReplies, intranetChannels] = await Promise.all([
        listChatThreads({
          data: {
            store_id: storeId,
            channel_instance_id: deps?.channelInstanceId,
          },
        }).catch(() => null),
        listSdrChatSessions().catch(() => ({
          sessions: [],
          metrics: { total: 0, readyToBuy: 0, warm: 0, curious: 0 },
        })),
        listWorkspaceWhatsAppInstances({ data: { store_id: storeId } }).catch(() => []),
        listChatQuickReplies().catch(() => [] as QuickReplyItem[]),
        listIntranetChannels({ data: { store_id: storeId } }).catch(() => []),
      ]);
      return {
        ...(res || {
          threads: [],
          metrics: { total: 0, open: 0, closed: 0, avg_rating: 0, sla_first_response_min: 0 },
        }),
        isSupervisor: Boolean((res as any)?.isSupervisor || (store as any)?.is_owner),
        store,
        sdrSessions: sdrData?.sessions || [],
        sdrMetrics: sdrData?.metrics || { total: 0, readyToBuy: 0, warm: 0, curious: 0 },
        whatsappInstances: (instances || []) as WhatsAppChannelInstanceDTO[],
        quickReplies: (quickReplies || []) as QuickReplyItem[],
        intranetChannels: (intranetChannels || []) as any[],
      };
    } catch (e) {
      console.warn("[workspace.atendimento.chat] Fallback de segurança no loader:", e);
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
      };
    }
  },
  component: WorkspaceAtendimentoChatPage,
});

function WorkspaceAtendimentoChatPage() {
  const loaderData = (Route.useLoaderData?.() as any) || {};
  const searchParams = Route.useSearch?.() || {};
  const navigate = useNavigate();

  return (
    <AtendimentoChatWorkspace
      initialThreads={loaderData.threads || []}
      metrics={loaderData.metrics}
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
